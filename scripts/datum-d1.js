/* datum-d1.js — Datum FI D1 persistence client (Phase 3, ADDITIVE).
 * Talks to the same-origin Pages Function at /api/documents (Clerk-JWT-verified server-side).
 * D1 is written ALONGSIDE localStorage + Clerk (never instead of, in P3). Full fidelity on the
 * wire — the caller passes toD1Document() (no slim, no degrade). Coarse ~1.5s write debounce so
 * the network write is economical while the local 350ms commit stays instant. Load is D1-FIRST
 * with a hard timeout: any miss/error/timeout/not-signed-in resolves null so the caller falls
 * back to the existing LS->Clerk path (silent + lossless). The user id is NEVER sent — the server
 * derives it from the verified Bearer token only. */
(function (global) {
  'use strict';
  var BASE = '/api/documents';

  function getToken() {
    try {
      if (global.Clerk && global.Clerk.session && global.Clerk.session.getToken) {
        return Promise.resolve(global.Clerk.session.getToken());
      }
    } catch (e) {}
    return Promise.resolve(null);
  }
  function signedIn() { try { return !!(global.Clerk && global.Clerk.user); } catch (e) { return false; } }
  // Injectable fetch (browser: global.fetch; gate overrides API._fetch to hit the real server logic).
  function doFetch() { return (API._fetch || global.fetch).apply(null, arguments); }

  // GET -> { payload, revision, updated_at } | null (miss/error/timeout/no-auth -> caller falls back).
  function getDoc(type, key) {
    key = key || 'active';
    return getToken().then(function (tok) {
      if (!tok) return null;
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, API.LOAD_TIMEOUT_MS) : null;
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&key=' + encodeURIComponent(key), {
        method: 'GET', headers: { Authorization: 'Bearer ' + tok }, signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (to) clearTimeout(to);
        return (r && r.status === 200) ? r.json() : null;
      }).catch(function () { if (to) clearTimeout(to); return null; });
    }).catch(function () { return null; });
  }

  // LIST -> [{ doc_key, revision, updated_at }] (ids+revisions only, NEVER payloads).
  // L51 SOURCE-OF-TRUTH LAW: a REACHABLE-empty D1 list is AUTHORITATIVE (resolves []); the Clerk/LS net is
  // a fallback ONLY on an explicit unreachable signal — this promise REJECTS on no-token / non-200 / network
  // / timeout, and resolves (possibly []) ONLY when D1 actually answered. Callers MUST render a resolved []
  // as EMPTY (trust it) and fall back to the net solely in .catch. Collapsing empty-and-error into [] is
  // what resurrected deleted blueprints (delete -> D1 empty -> old code fell back to the lagging net). #3's
  // backfill depends on this same rule. Every listDocs caller has a .catch fallback (verified).
  function listDocs(type) {
    return getToken().then(function (tok) {
      if (!tok) throw new Error('d1-unreachable:no-token');            // no auth = unreachable, NOT empty
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, API.LOAD_TIMEOUT_MS) : null;
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&list=1', {
        method: 'GET', headers: { Authorization: 'Bearer ' + tok }, signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (to) clearTimeout(to);
        if (r && r.status === 200) return r.json().then(function (j) { return (j && j.documents) || []; });  // reachable (incl. empty) = authoritative
        throw new Error('d1-unreachable:' + (r && r.status));          // non-200 = unreachable -> caller falls back
      }).catch(function (e) { if (to) clearTimeout(to); throw e; });    // network / abort / timeout = unreachable -> REJECT
    });
  }

  // ---- #310 keepalive size-ceiling (cumulative-cap aware) -------------------------------------
  // keepalive (#2) lets an in-flight write COMPLETE across a fast nav/reload — but the browser REJECTS a
  // keepalive fetch (TypeError, silently dropping the write) once the CUMULATIVE in-flight keepalive
  // request-body bytes exceed ~64KB (65536). Hardcoding keepalive:true therefore dropped EVERY >64KB save,
  // and even two concurrent mid-size saves (the active-studio autosave + an explicit blueprint save serialize
  // the same holdings). Fix: use keepalive ONLY when THIS write plus what is already in flight stays under a
  // conservative budget; otherwise send a NORMAL (uncapped) fetch that always LANDS while the page is alive.
  // We track our own in-flight keepalive bytes so the write pipe is as unbounded as the D1 store — no
  // blueprint is undroppable by size. OVER-budget writes go non-keepalive: on stay-on-page (the dominant
  // save) they always land; their fast-nav survival is Part 2 (hold the nav until the fetch resolves). We do
  // NOT queue — a queued write would itself be lost on unload with no gain, and immediate non-keepalive lands.
  var KEEPALIVE_BUDGET_BYTES = 60000;   // < 65536 spec cap; headroom for request overhead + rounding
  var _kaInflightBytes = 0;             // sum of our in-flight keepalive PUT body bytes (cumulative-cap aware)
  function byteLen(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return s ? s.length : 0; } }

  // PUT -> { ok:true, revision } | { ok:false, conflict:true, server_revision } | { ok:false }.
  function putDoc(type, key, payload, revision) {
    key = key || 'active';
    return getToken().then(function (tok) {
      if (!tok) return { ok: false };
      var body = { payload: payload };
      if (typeof revision === 'number') body.revision = revision;
      var bodyStr = JSON.stringify(body);
      var bytes = byteLen(bodyStr);
      // keepalive only if THIS write + what is already in flight stays under the cumulative budget; else a
      // normal fetch (no size cap) so the write LANDS. Reserve now, release on settle (idempotent).
      var useKA = (_kaInflightBytes + bytes) <= KEEPALIVE_BUDGET_BYTES;
      if (useKA) _kaInflightBytes += bytes;
      var released = false;
      var release = function () { if (released) return; released = true; if (useKA) { _kaInflightBytes -= bytes; if (_kaInflightBytes < 0) _kaInflightBytes = 0; } };
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&key=' + encodeURIComponent(key), {
        method: 'PUT', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: bodyStr, keepalive: useKA
      }).then(function (r) {
        release();
        if (r.status === 200 || r.status === 201) return r.json().then(function (j) { return { ok: true, revision: j.revision }; });
        if (r.status === 409) return r.json().then(function (j) { return { ok: false, conflict: true, server_revision: j.server_revision }; });
        return { ok: false };
      }).catch(function () { release(); return { ok: false }; });
    }).catch(function () { return { ok: false }; });
  }

  // DELETE -> { ok:true, deleted } | { ok:false }. Erase one document (used by the archive "Erase").
  function deleteDoc(type, key) {
    key = key || 'active';
    return getToken().then(function (tok) {
      if (!tok) return { ok: false };
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&key=' + encodeURIComponent(key), {
        // #2 (async-completion) — keepalive so a delete fired right before a fast nav/reload still
        // COMPLETES on the wire (the delete path is fire-and-forget from _purgeSketchSlot/eraseBlueprint).
        method: 'DELETE', headers: { Authorization: 'Bearer ' + tok }, keepalive: true
      }).then(function (r) {
        return (r && r.status === 200) ? r.json().then(function (j) { return { ok: true, deleted: (j && j.deleted) || 0 }; }) : { ok: false };
      }).catch(function () { return { ok: false }; });
    }).catch(function () { return { ok: false }; });
  }

  // Coarse-debounced writer keyed by type:key; tracks last revision for optimistic CAS. On 409 the
  // client policy is reload-server-doc + warn (no silent clobber, no auto-merge): re-read, adopt the
  // server revision, and hand the fresh doc to onConflict so the caller can re-hydrate + warn.
  var _timers = {}, _rev = {};
  var _pending = {};          // #310 P2 — id -> { type,key,getPayload,onConflict } for a debounced write NOT yet fired
  var _inflight = new Set();  // #310 P2 — in-flight _doPut promises; drain() awaits these before an in-app nav
  function idOf(type, key) { return type + ':' + (key || 'active'); }
  // Shared CAS put (revision-tracked, 409 -> reload server rev + onConflict). Used by BOTH the debounced
  // scheduleWrite (continuous autosave) and the immediate writeNow (explicit save). Returns the promise.
  function _doPut(id, type, key, getPayload, onConflict) {
    return putDoc(type, key, getPayload(), _rev[id]).then(function (res) {
      if (res.ok) { _rev[id] = res.revision; return res; }
      if (res.conflict) {
        return getDoc(type, key).then(function (server) {
          if (server && typeof server.revision === 'number') _rev[id] = server.revision;
          if (typeof onConflict === 'function') onConflict(server);   // reload server doc + warn
          return res;
        });
      }
      return res;
    });
  }
  // Fire a write NOW and TRACK its promise so drain() can await real completion + the save-state signal can
  // reflect it. Clears the pending descriptor. Drives _recompute on dispatch (saving) and on settle (saved/error).
  function _dispatch(id, type, key, getPayload, onConflict) {
    _pending[id] = null;
    var pr = _doPut(id, type, key, getPayload, onConflict);
    _inflight.add(pr);
    _recompute(false);
    pr.then(function (res) { _inflight.delete(pr); _recompute(!(res && res.ok)); },
            function () { _inflight.delete(pr); _recompute(true); });
    return pr;
  }
  function scheduleWrite(type, key, getPayload, onConflict) {
    var id = idOf(type, key);
    _pending[id] = { type: type, key: key, getPayload: getPayload, onConflict: onConflict };   // latest debounced args win
    _recompute(false);   // pending work counts as "Saving…" + arms beforeunload immediately (before the debounce fires)
    if (_timers[id]) clearTimeout(_timers[id]);
    _timers[id] = setTimeout(function () { _timers[id] = null; if (_pending[id]) _dispatch(id, type, key, getPayload, onConflict); }, API.WRITE_DEBOUNCE_MS);
  }
  // #2 (async-completion) — write NOW, bypassing the ~1.5s debounce, for an EXPLICIT save (a deliberate
  // "Save Blueprint" click, not the continuous autosave). Cancels any pending debounced write for this key
  // and fires putDoc immediately, so a fast nav/reload can't abandon it inside the debounce window (the
  // confirmed save-lag bug). Returns the promise so a caller CAN await the real completion.
  function writeNow(type, key, getPayload, onConflict) {
    var id = idOf(type, key);
    if (_timers[id]) { clearTimeout(_timers[id]); _timers[id] = null; }
    return _dispatch(id, type, key, getPayload, onConflict);
  }
  // #310 Part 2 — DRAIN: flush every pending debounced write NOW, then resolve when all in-flight writes
  // settle (capped by DRAIN_MAX_MS so a nav ALWAYS proceeds). The app awaits this at in-app navigation
  // points (studio.html _navDrain) so a big (>60KB, non-keepalive) write — an explicit blueprint save OR the
  // active-studio autosave — is not abandoned mid-flight when the page unloads. Small writes stay keepalive
  // and survive unload on their own; this closes the common save-then-navigate flow. RESIDUAL: a hard
  // tab-close / F5 mid-drain of an over-64KB write is an inherent browser floor (you cannot await a fetch
  // during unload). Never rejects — the nav proceeds regardless.
  function drain() {
    try {
      for (var id in _pending) {
        if (_pending.hasOwnProperty(id) && _pending[id]) {
          var w = _pending[id];
          if (_timers[id]) { clearTimeout(_timers[id]); _timers[id] = null; }
          _dispatch(id, w.type, w.key, w.getPayload, w.onConflict);
        }
      }
    } catch (e) {}
    var arr = [];
    _inflight.forEach(function (p) { arr.push(p.catch(function () {})); });
    var settled = Promise.all(arr);
    var capped = new Promise(function (res) { setTimeout(res, API.DRAIN_MAX_MS); });
    return Promise.race([settled, capped]);
  }

  // ---- #310 Part 2 (A2) — honest save-state signal + self-owned "Saving…/Saved" pill --------------
  // ONE source of truth = the in-flight tracker above (L48 — no second bookkeeping). State machine:
  // idle -> saving (a write is pending/in-flight) -> saved (brief, on settle) -> idle; error on a failed
  // settle. Any surface can subscribe via onState(); datum-d1 ALSO renders a subtle fixed pill itself so the
  // awareness signal ships with zero page/sacred surface (studio, blueprint, sketch — every page that loads
  // this file). Headless-safe: the pill no-ops when document/createElement is absent (the gates).
  var _state = 'idle', _lastErr = false, _savedTimer = null, _stateSubs = [], _pillEl = null;
  function _busy() { if (_inflight.size > 0) return true; for (var k in _pending) { if (_pending.hasOwnProperty(k) && _pending[k]) return true; } return false; }
  function _emit(s) {
    if (s === _state) return;
    _state = s;
    for (var i = 0; i < _stateSubs.length; i++) { try { _stateSubs[i](s); } catch (e) {} }
    _renderPill(s);
  }
  function _recompute(err) {
    if (err) _lastErr = true;
    if (_busy()) { if (_savedTimer) { clearTimeout(_savedTimer); _savedTimer = null; } _emit('saving'); return; }
    if (_savedTimer) { clearTimeout(_savedTimer); _savedTimer = null; }
    if (_lastErr) { _lastErr = false; _emit('error'); _savedTimer = setTimeout(function () { _emit('idle'); }, 4000); return; }
    _emit('saved'); _savedTimer = setTimeout(function () { _emit('idle'); }, 1600);
  }
  function _pill() {
    if (typeof document === 'undefined' || !document.createElement) return null;   // headless / gate -> no DOM pill
    if (_pillEl) return _pillEl;
    var el = document.createElement('div');
    el.id = 'datum-save-pill';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483000;font:500 11px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.02em;padding:7px 12px;border-radius:999px;color:rgba(255,255,255,.92);background:rgba(20,22,28,.86);box-shadow:0 2px 10px rgba(0,0,0,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transform:translateY(4px);transition:opacity .22s ease,transform .22s ease;pointer-events:none;';
    (document.body || document.documentElement).appendChild(el);
    _pillEl = el;
    return el;
  }
  function _renderPill(s) {
    var el = _pill(); if (!el) return;
    var txt = s === 'saving' ? 'Saving…' : s === 'saved' ? 'Saved' : s === 'error' ? 'Save failed — retrying on next change' : '';
    if (txt) { el.textContent = txt; el.setAttribute('data-state', s); el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
    else { el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; }
    el.style.background = s === 'error' ? 'rgba(120,26,26,.9)' : 'rgba(20,22,28,.86)';
  }

  // ---- #310 Part 2 (B) — beforeunload guard + pagehide keepalive flush -----------------------------
  // beforeunload: native "Leave/Stay?" ONLY while a save is in flight (armed by the SAME tracker), so a hard
  // reload / tab-close mid-drain can never SILENTLY drop work. It stays silent once drained to zero, so a
  // smooth in-app _navDrain (which awaits drain() -> tracker empty BEFORE navigating) does NOT double-prompt.
  // pagehide/visibilitychange->hidden: best-effort flush of any debounced-but-unsent write so the sub-64KB
  // tail still lands via keepalive even if the user leaves. Over-64KB cannot (that IS the keepalive cap) —
  // the honest floor. All headless-guarded so the gates can load the module without a real window.
  function _flushKeepaliveTail() {
    for (var id in _pending) {
      if (_pending.hasOwnProperty(id) && _pending[id]) {
        var w = _pending[id];
        if (_timers[id]) { clearTimeout(_timers[id]); _timers[id] = null; }
        _dispatch(id, w.type, w.key, w.getPayload, w.onConflict);   // putDoc sizes keepalive: <=budget survives unload
      }
    }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeunload', function (e) {
      if (API.CUTOVER === false || !_busy()) return;                // silent when rolled back or nothing in flight
      e.preventDefault(); e.returnValue = ''; return '';            // arm the native leave-confirm
    });
    window.addEventListener('pagehide', function () { try { _flushKeepaliveTail(); } catch (e) {} });
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { try { _flushKeepaliveTail(); } catch (e) {} } });
    }
  }
  function setRevision(type, key, rev) { if (typeof rev === 'number') _rev[idOf(type, key)] = rev; }
  function knownRevision(type, key) { return _rev[idOf(type, key)]; }

  // P5c — preferences (dossier + workspaceName) dual-write. ADDITIVE alongside the Clerk unsafeMetadata
  // mirror (the net stays on; nothing retired). ONE ROW PER KEY so a workspaceName-only save can't stomp
  // the dossier row: type='preferences', key='dossier' | 'workspaceName'. Pass ONLY the prefs you are
  // changing (undefined/null skips that key). No-op when D1 absent / signed out / rolled back
  // (CUTOVER === false) = escape route. Coarse-debounced + optimistic-CAS via scheduleWrite, like the rest.
  // opts.now — bypass the ~1.5s debounce via writeNow, for a DELIBERATE save (a rename committed on blur,
  // an explicit "Save" click) as opposed to continuous autosave. This matters more since the prefs retire:
  // D1 is now the SOLE writer for preferences, so a debounced write abandoned by a fast navigation is no
  // longer covered by an immediate Clerk mirror write — it is simply lost. Same reasoning, same helper, as
  // the blueprint save-lag fix (#2) that writeNow was built for.
  function writePreferences(prefs, opts) {
    try {
      if (API.CUTOVER === false || !signedIn()) return;
      prefs = prefs || {};
      var send = (opts && opts.now) ? writeNow : scheduleWrite;
      if (prefs.dossier != null) {
        var d = prefs.dossier;
        send('preferences', 'dossier', function () { return d; }, function () { console.warn('[d1] preferences/dossier changed in another tab — reloaded the server revision (no merge)'); });
      }
      if (prefs.workspaceName != null) {
        var wn = prefs.workspaceName;
        send('preferences', 'workspaceName', function () { return { workspaceName: wn }; }, function () { console.warn('[d1] preferences/workspaceName changed in another tab — reloaded the server revision (no merge)'); });
      }
    } catch (e) {}
  }

  // MISS-5 — THE PREFS CLERK MIRROR IS RETIRED UNDER CUTOVER. It is no longer an UNCONDITIONAL write: it
  // fires ONLY in the states where writePreferences above does NOT — rolled back (CUTOVER === false) or
  // signed out of D1. The two are EXACT COMPLEMENTS, so a preference always lands in exactly one store and
  // never in none.
  //
  // Why keep the mirror alive for those states instead of deleting the write outright: CUTOVER=false is the
  // one-flip escape route, and under rollback writePreferences no-ops. Delete the Clerk write and a
  // rollback would silently stop persisting preferences anywhere — the escape route would look intact and
  // quietly lose data. Retiring the write means making it CONDITIONAL, not making it absent.
  //
  // Callers must also treat a MISSING DatumD1 as "mirror needed" (see the !window.DatumD1 || … guards):
  // if the client never loaded, no D1 write can happen at all.
  function prefsMirrorNeeded() { return API.CUTOVER === false || !signedIn(); }

  var API = {
    // P4 CUTOVER flag (default ON): D1 is the sole truth for Studio + the Clerk studio-slim mirror is
    // OFF. ONE-FLIP ROLLBACK: set DatumD1.CUTOVER = false -> Clerk mirror fires again + LS-authority
    // load restored = today's exact behavior, instantly, no redeploy (the metadata code stays intact).
    CUTOVER: true,
    WRITE_DEBOUNCE_MS: 1500,   // coarse network write (vs 350ms local commit)
    LOAD_TIMEOUT_MS: 1200,     // D1-first load falls back to LS/Clerk after this
    DRAIN_MAX_MS: 3000,        // #310 P2 — cap on how long an in-app nav is held for drain (nav always proceeds)
    getDoc: getDoc, putDoc: putDoc, listDocs: listDocs, deleteDoc: deleteDoc, scheduleWrite: scheduleWrite, writeNow: writeNow,
    drain: drain, onState: function (cb) { if (typeof cb === 'function') _stateSubs.push(cb); return _state; }, getState: function () { return _state; },
    setRevision: setRevision, knownRevision: knownRevision, signedIn: signedIn, writePreferences: writePreferences,
    prefsMirrorNeeded: prefsMirrorNeeded,
    _fetch: null
  };
  global.DatumD1 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)));
