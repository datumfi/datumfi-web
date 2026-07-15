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

  // LIST -> [{ doc_key, revision, updated_at }] (ids+revisions only, NEVER payloads) | [] on
  // miss/error/timeout/no-auth. P5a: lets a fresh device enumerate every saved blueprint, then
  // getDoc each to rebuild the archive from D1 (no Clerk blueprint_z needed).
  function listDocs(type) {
    return getToken().then(function (tok) {
      if (!tok) return [];
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, API.LOAD_TIMEOUT_MS) : null;
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&list=1', {
        method: 'GET', headers: { Authorization: 'Bearer ' + tok }, signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (to) clearTimeout(to);
        return (r && r.status === 200) ? r.json().then(function (j) { return (j && j.documents) || []; }) : [];
      }).catch(function () { if (to) clearTimeout(to); return []; });
    }).catch(function () { return []; });
  }

  // PUT -> { ok:true, revision } | { ok:false, conflict:true, server_revision } | { ok:false }.
  function putDoc(type, key, payload, revision) {
    key = key || 'active';
    return getToken().then(function (tok) {
      if (!tok) return { ok: false };
      var body = { payload: payload };
      if (typeof revision === 'number') body.revision = revision;
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&key=' + encodeURIComponent(key), {
        method: 'PUT', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      }).then(function (r) {
        if (r.status === 200 || r.status === 201) return r.json().then(function (j) { return { ok: true, revision: j.revision }; });
        if (r.status === 409) return r.json().then(function (j) { return { ok: false, conflict: true, server_revision: j.server_revision }; });
        return { ok: false };
      }).catch(function () { return { ok: false }; });
    }).catch(function () { return { ok: false }; });
  }

  // DELETE -> { ok:true, deleted } | { ok:false }. Erase one document (used by the archive "Erase").
  function deleteDoc(type, key) {
    key = key || 'active';
    return getToken().then(function (tok) {
      if (!tok) return { ok: false };
      return doFetch(BASE + '?type=' + encodeURIComponent(type) + '&key=' + encodeURIComponent(key), {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + tok }
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
  function scheduleWrite(type, key, getPayload, onConflict) {
    var id = idOf(type, key);
    if (_timers[id]) clearTimeout(_timers[id]);
    _timers[id] = setTimeout(function () {
      _timers[id] = null;
      putDoc(type, key, getPayload(), _rev[id]).then(function (res) {
        if (res.ok) { _rev[id] = res.revision; return; }
        if (res.conflict) {
          getDoc(type, key).then(function (server) {
            if (server && typeof server.revision === 'number') _rev[id] = server.revision;
            if (typeof onConflict === 'function') onConflict(server);   // reload server doc + warn
          });
        }
      });
    }, API.WRITE_DEBOUNCE_MS);
  }
  function setRevision(type, key, rev) { if (typeof rev === 'number') _rev[idOf(type, key)] = rev; }
  function knownRevision(type, key) { return _rev[idOf(type, key)]; }

  var API = {
    // P4 CUTOVER flag (default ON): D1 is the sole truth for Studio + the Clerk studio-slim mirror is
    // OFF. ONE-FLIP ROLLBACK: set DatumD1.CUTOVER = false -> Clerk mirror fires again + LS-authority
    // load restored = today's exact behavior, instantly, no redeploy (the metadata code stays intact).
    CUTOVER: true,
    WRITE_DEBOUNCE_MS: 1500,   // coarse network write (vs 350ms local commit)
    LOAD_TIMEOUT_MS: 1200,     // D1-first load falls back to LS/Clerk after this
    getDoc: getDoc, putDoc: putDoc, listDocs: listDocs, deleteDoc: deleteDoc, scheduleWrite: scheduleWrite,
    setRevision: setRevision, knownRevision: knownRevision, signedIn: signedIn,
    _fetch: null
  };
  global.DatumD1 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)));
