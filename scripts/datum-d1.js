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
  function scheduleWrite(type, key, getPayload, onConflict) {
    var id = idOf(type, key);
    if (_timers[id]) clearTimeout(_timers[id]);
    _timers[id] = setTimeout(function () { _timers[id] = null; _doPut(id, type, key, getPayload, onConflict); }, API.WRITE_DEBOUNCE_MS);
  }
  // #2 (async-completion) — write NOW, bypassing the ~1.5s debounce, for an EXPLICIT save (a deliberate
  // "Save Blueprint" click, not the continuous autosave). Cancels any pending debounced write for this key
  // and fires the (keepalive) putDoc immediately, so a fast nav/reload can't abandon it inside the debounce
  // window (the confirmed save-lag bug). Returns the promise so a caller CAN await the real completion.
  function writeNow(type, key, getPayload, onConflict) {
    var id = idOf(type, key);
    if (_timers[id]) { clearTimeout(_timers[id]); _timers[id] = null; }
    return _doPut(id, type, key, getPayload, onConflict);
  }
  function setRevision(type, key, rev) { if (typeof rev === 'number') _rev[idOf(type, key)] = rev; }
  function knownRevision(type, key) { return _rev[idOf(type, key)]; }

  // P5c — preferences (dossier + workspaceName) dual-write. ADDITIVE alongside the Clerk unsafeMetadata
  // mirror (the net stays on; nothing retired). ONE ROW PER KEY so a workspaceName-only save can't stomp
  // the dossier row: type='preferences', key='dossier' | 'workspaceName'. Pass ONLY the prefs you are
  // changing (undefined/null skips that key). No-op when D1 absent / signed out / rolled back
  // (CUTOVER === false) = escape route. Coarse-debounced + optimistic-CAS via scheduleWrite, like the rest.
  function writePreferences(prefs) {
    try {
      if (API.CUTOVER === false || !signedIn()) return;
      prefs = prefs || {};
      if (prefs.dossier != null) {
        var d = prefs.dossier;
        scheduleWrite('preferences', 'dossier', function () { return d; }, function () { console.warn('[d1] preferences/dossier changed in another tab — reloaded the server revision (no merge)'); });
      }
      if (prefs.workspaceName != null) {
        var wn = prefs.workspaceName;
        scheduleWrite('preferences', 'workspaceName', function () { return { workspaceName: wn }; }, function () { console.warn('[d1] preferences/workspaceName changed in another tab — reloaded the server revision (no merge)'); });
      }
    } catch (e) {}
  }

  var API = {
    // P4 CUTOVER flag (default ON): D1 is the sole truth for Studio + the Clerk studio-slim mirror is
    // OFF. ONE-FLIP ROLLBACK: set DatumD1.CUTOVER = false -> Clerk mirror fires again + LS-authority
    // load restored = today's exact behavior, instantly, no redeploy (the metadata code stays intact).
    CUTOVER: true,
    WRITE_DEBOUNCE_MS: 1500,   // coarse network write (vs 350ms local commit)
    LOAD_TIMEOUT_MS: 1200,     // D1-first load falls back to LS/Clerk after this
    getDoc: getDoc, putDoc: putDoc, listDocs: listDocs, deleteDoc: deleteDoc, scheduleWrite: scheduleWrite, writeNow: writeNow,
    setRevision: setRevision, knownRevision: knownRevision, signedIn: signedIn, writePreferences: writePreferences,
    _fetch: null
  };
  global.DatumD1 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)));
