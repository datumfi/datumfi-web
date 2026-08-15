/* datum-archive-purge.js — P6 single-source purge for the twin save stores.
 *
 * The COMPLETE per-slot copy list for each store lives HERE so the Blueprint
 * Archive and Sketchbook erase paths cannot drift apart again. Each store nulls
 * its own in-memory slot + persists its archive view, then calls the matching
 * purge below to clear every OTHER copy of the slot and re-mirror Clerk.
 *
 * COMPLETE slot-copy maps (what erase must clear):
 *   Blueprint: 1) datumfi_blueprint_archive_v1 slotN  (page persists; not here)
 *              2) datum_blueprint_state_N  (per-slot LS key)        ← here
 *              3) datumfi_blueprint_current_snapshot (sessionStorage) ← here, guarded
 *              4) datumfi_blueprint_draft_v1 (session draft)          ← here, guarded
 *              5) Clerk unsafeMetadata.blueprint_z                    ← here (remirror)
 *   Sketch:    1) SketchbookDatabase slotN (in-memory; page nulls it)
 *              2) datumfi_sketchbook_v1 slot_N (LS book)             ← here
 *              3) datum_sketch_state_N (per-slot LS key)             ← here
 *              4) datumfi_sketch_current_snapshot (sessionStorage)   ← here, guarded
 *              5) Clerk unsafeMetadata.sketchbook_z                  ← here (remirror)
 *
 * GUARDED snapshot/draft clear: only the copy that PROVABLY belongs to the
 * erased slot is removed (blueprint_id for BP; sketch_id, else a save-stamp
 * fingerprint, for sketch) — so a pending UNSAVED plan carried in the snapshot
 * from an unrelated erase is preserved, not silently discarded. */
(function (global) {
  'use strict';

  var BP_SNAPSHOT = 'datumfi_blueprint_current_snapshot';
  var BP_DRAFT    = 'datumfi_blueprint_draft_v1';
  var BP_PER_SLOT = 'datum_blueprint_state_';
  var BP_PENDING  = 'datum_blueprint_state_pending';   // R3.6 captured Studio state
  var BP_ARCHIVE  = 'datumfi_blueprint_archive_v1';     // local archive view (Clerk = truth)
  var SK_SNAPSHOT = 'datumfi_sketch_current_snapshot';
  var SK_PER_SLOT = 'datum_sketch_state_';
  var SK_BOOK     = 'datumfi_sketchbook_v1';
  // Carried Sketch-design state that prefills the Studio WANT card / S2 face.
  var CARRIED_DESIGN = ['datum_designed_ceil', 'datum_designed_datum',
    'datum_designed_floor', 'datum_designed_state', 'datum_s2_design'];

  function _readSS(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_e) { return null; } }
  function _readLS(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_e) { return null; } }

  // The Clerk *_z mirror is encoded by the codec, which nav.js loads ONLY on demand
  // (cross-device restore). On a returning device it is absent, so a re-mirror would
  // no-op and the erased slot would survive in the cloud blob. Guarantee it first.
  function _withCodec(fn) {
    if (global.DatumArchiveCodec) { fn(); return; }
    if (typeof global._datumEnsureCodec === 'function') global._datumEnsureCodec(fn);
    else fn();   // last-resort: let the mirror's own codec check handle the miss
  }

  /* Blueprint match — the saved slot, snapshot, and draft all carry blueprint_id. */
  function _bpBelongs(erased, candidate) {
    if (!erased || !candidate) return false;
    var id = erased.blueprint_id;
    return !!id && candidate.blueprint_id === id;
  }

  /* Sketch match — sketch_id fast-path (present on the saving device); else a
   * save-stamp fingerprint that survives the Clerk slim (which drops sketch_id).
   * Require the stamp so an unstamped never-saved snapshot can never "match" — it
   * is a pending draft and must be kept. */
  function _skBelongs(erased, snap) {
    if (!erased || !snap) return false;
    if (erased.sketch_id && snap.sketch_id) return erased.sketch_id === snap.sketch_id;
    if (!snap.date_stamped || !snap.time_stamped) return false;
    return erased.date_stamped   === snap.date_stamped &&
           erased.time_stamped   === snap.time_stamped &&
           erased.age            === snap.age &&
           erased.retire_age     === snap.retire_age &&
           erased.portfolio_mass === snap.portfolio_mass &&
           erased.datum_spend    === snap.datum_spend;
  }

  /* Blueprint purge. The page has already nulled BlueprintArchive[slotN] and run
   * syncArchiveUI() (which persists ARCHIVE_KEY with the slot now null) BEFORE
   * calling this, so remirrorArchive() re-encodes the already-pruned archive. */
  function blueprint(opts) {
    opts = opts || {};
    var slotId = opts.slotId;
    var erased = opts.erasedBp || null;
    var report = { perSlot: false, snapshot: false, draft: false, remirror: false };

    try { localStorage.removeItem(BP_PER_SLOT + slotId); report.perSlot = true; } catch (_e) {}

    if (_bpBelongs(erased, _readSS(BP_SNAPSHOT))) {
      try { sessionStorage.removeItem(BP_SNAPSHOT); report.snapshot = true; } catch (_e) {}
    }
    if (_bpBelongs(erased, _readSS(BP_DRAFT))) {
      try { sessionStorage.removeItem(BP_DRAFT); report.draft = true; } catch (_e) {}
    }
    // Clerk blueprint_z — re-encode the WHOLE archive (slot already null) through
    // the module's tested safeMerge path (shrink-only, always fits). Codec ensured.
    if (global.DatumBlueprint && typeof global.DatumBlueprint.remirrorArchive === 'function') {
      _withCodec(function () { try { global.DatumBlueprint.remirrorArchive(); } catch (_e) {} });
      report.remirror = true;
    }
    return report;
  }

  /* Sketch purge. Owns the LS book write so the location list is single-source.
   * The page nulls SketchbookDatabase[slotN] itself, then passes its single Clerk
   * mirror fn (the encoder stays where it lives) via opts.remirror. */
  function sketch(opts) {
    opts = opts || {};
    var slotId = opts.slotId;
    var report = { book: false, perSlot: false, snapshot: false, remirror: false };

    // Capture the erased slot's stored contract BEFORE nulling, for the match.
    var book   = _readLS(SK_BOOK) || {};
    var erased = book['slot_' + slotId] || null;

    book['slot_' + slotId] = null;
    try { localStorage.setItem(SK_BOOK, JSON.stringify(book)); report.book = true; } catch (_e) {}
    try { localStorage.removeItem(SK_PER_SLOT + slotId); report.perSlot = true; } catch (_e) {}

    if (_skBelongs(erased, _readSS(SK_SNAPSHOT))) {
      try { sessionStorage.removeItem(SK_SNAPSHOT); report.snapshot = true; } catch (_e) {}
    }
    // Clerk sketchbook_z — re-encode the whole 4-slot book (slot now null). Codec
    // ensured so the encoder takes the _z path, not the legacy uncompressed write.
    if (typeof opts.remirror === 'function') {
      _withCodec(function () { try { opts.remirror(book); } catch (_e) {} });
      report.remirror = true;
    }
    return report;
  }

  /* The COMPLETE set of concrete local keys that carry a user's plan across the
   * page. Derived from the SAME constants the per-slot erase paths use, so a new
   * carried key added above can never silently leak past sign-out — it must be
   * listed here once and both signOutWipe and the _p7 gate sweep it. */
  function _localCarriedKeys() {
    var keys = [BP_SNAPSHOT, BP_DRAFT, BP_PENDING, BP_ARCHIVE, SK_SNAPSHOT, SK_BOOK]
      .concat(CARRIED_DESIGN);
    for (var i = 1; i <= 4; i++) { keys.push(BP_PER_SLOT + i); keys.push(SK_PER_SLOT + i); }
    return keys;
  }

  /* ── THE SIGN-OUT SWEEP IS DERIVED BY EXCLUSION, NOT ENUMERATED ──────────────────────────────
   * ⛔⛔ IT USED TO BE A LIST, AND THE LIST WAS WRONG FOR NINE WEEKS. `_localCarriedKeys()` named
   * the blueprint and sketch stores and did not name `datumfi.accountDossier.v15` — the key holding
   * a real person's date of birth, gross income, home location, email, phone, and their spouse's
   * name and income. It survived every sign-out since 2026-06-08 and the Captain found it by
   * accident. `_p7`'s sign-out leg could not see it either, because that gate SEEDED ITS FIXTURE
   * FROM THE SAME LIST.
   *   🔑 A REMOVE-LIST IS WRONG BY DEFAULT: EVERY KEY ADDED AFTER IT WAS WRITTEN IS MISSED, AND
   *      MISSED SILENTLY. A KEEP-LIST IS RIGHT BY DEFAULT — a key added tomorrow is swept because
   *      nobody remembered to protect it, which is the direction you want to be wrong in.
   * It also reaches the UNBOUNDED families a list can never cover: `datum_blueprint_state_<uuid>`
   * and `datum_sketch_byid_<uuid>` are keyed by document id, and the old sweep hard-coded 1..4.
   *
   * WHAT SURVIVES, AND WHY EACH ONE EARNS IT:
   *  · datum_privacy_ok — ePrivacy consent is a BROWSER-level preference, not personal data.
   *    Clearing it re-nags every user on every sign-out for no privacy gain.
   *  · Clerk's own storage (__clerk*, __session*, __client*, clerk*) — CLERK OWNS ITS SESSION AND
   *    MUST BE THE ONE TO END IT. Deleting its tokens out from under an in-flight Clerk.signOut()
   *    is how you get a sign-out that half-completes, and it buys nothing: signOut() clears them.
   * Everything else goes, including the analytics identifiers (ds_anon_id, datumfi_session_id) —
   * a per-person id inherited by the next person is exactly the conflation they name.
   *
   * STILL LOCAL-ONLY, DELIBERATELY. The Clerk *_z mirrors and the D1 rows are the user's TRUTH and
   * must survive sign-out so their saved plans return on the next sign-in. Erasing those is
   * eraseEverywhere() below — a different act, asked for by a different button. */
  var _SWEEP_KEEP = ['datum_privacy_ok'];
  var _SWEEP_KEEP_PREFIX = ['__clerk', '__session', '__client', 'clerk'];
  function _sweepKeeps(k) {
    if (_SWEEP_KEEP.indexOf(k) >= 0) return true;
    for (var i = 0; i < _SWEEP_KEEP_PREFIX.length; i++) {
      if (k.lastIndexOf(_SWEEP_KEEP_PREFIX[i], 0) === 0) return true;
    }
    return false;
  }
  function _sweepStore(store) {
    var doomed = [];
    try {
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i);
        if (k && !_sweepKeeps(k)) doomed.push(k);
      }
    } catch (_e) {}
    /* Collected first, removed second: removing during the walk reindexes the store and skips keys.
       Measured elsewhere in this codebase and cheap to avoid — never iterate a live index you mutate. */
    doomed.forEach(function (k) { try { store.removeItem(k); } catch (_e) {} });
    return doomed;
  }
  function signOutWipe() {
    var ls = _sweepStore(localStorage);
    var ss = _sweepStore(sessionStorage);
    var all = ls.concat(ss.map(function (k) { return 'ss:' + k; }));
    return { swept: all.length, keys: all, localKeys: ls, sessionKeys: ss };
  }

  /* ── ERASURE THAT ACTUALLY ERASES ────────────────────────────────────────────────────────────
   * ⛔⛔ THE DELETE MY DATA TOOL USED TO CLEAR TWO BROWSER STORAGES AND NOTHING ELSE, AND THEN
   * `_datumRestoreFromClerk` REBUILT THE ARCHIVE FROM D1/CLERK ON THE NEXT PAGE LOAD. The tool
   * could UNDO ITSELF in front of the person who had just asked for deletion — a GDPR/CCPA
   * Article 17 control that demonstrably did not delete.
   *   🔑 §26.1 ON A LEGAL SURFACE: A PERFECT LOCAL SWEEP IS UNDONE BY THE NEXT PAGE LOAD. We proved
   *      that on this exact mechanism with the boot draft this morning; the erasure tool is the same
   *      shape where the consequence is regulatory rather than cosmetic.
   * SO THE SERVER GOES FIRST AND THE LOCAL CLEAR IS CLEANUP BEHIND IT. Clearing locally first would
   * destroy the Clerk token the D1 deletes authenticate with, and the deletes would fail silently
   * against a user who has already been told their data is gone.
   *
   * THE CLERK HALF NEEDS NO KEY LIST AT ALL: `unsafeMetadata` is entirely ours — Clerk writes
   * nothing there — so erasure is `update({ unsafeMetadata: {} })`. Fully derived, and it cannot
   * miss a key somebody adds later.
   * THE D1 HALF iterates DatumD1.TYPES and lists each type before deleting, so it removes documents
   * this code has never heard of. The only thing it cannot cover is a TYPE missing from that array,
   * which is why the array is declared beside the API and gated.
   *
   * done(report) IS CALLED EXACTLY ONCE ON EVERY PATH — signed out, no Clerk, D1 unreachable, a
   * rejected delete. A deletion tool that hangs is worse than one that reports partial failure,
   * because the user cannot tell hanging from working.
   * ⚠️ IT REPORTS PARTIAL FAILURE HONESTLY rather than claiming success. What the UI does with a
   * partial result is a COPY decision and belongs to the Architect, not here. */
  function eraseEverywhere(done) {
    var fired = false;
    var report = { d1Attempted: 0, d1Deleted: 0, d1Failed: 0, clerkCleared: false, localSwept: 0, reachedServer: false };
    function finish() {
      if (fired) return; fired = true;
      try { report.localSwept = signOutWipe().swept; } catch (_e) {}
      try { localStorage.clear(); sessionStorage.clear(); } catch (_e) {}   // belt: the keep-list does not apply to DELETE
      try { done(report); } catch (_e) {}
    }
    var net = setTimeout(finish, 8000);                                     // never hang the tool
    function settle() { clearTimeout(net); finish(); }

    var D1 = global.DatumD1;
    var live = !!(D1 && D1.CUTOVER !== false && typeof D1.signedIn === 'function' && D1.signedIn() &&
                  typeof D1.listDocs === 'function' && typeof D1.deleteDoc === 'function' &&
                  Object.prototype.toString.call(D1.TYPES) === '[object Array]');
    if (!live) { clearClerk(settle); return; }                              // signed out: nothing server-side to reach
    report.reachedServer = true;

    var types = D1.TYPES.slice(), pending = types.length;
    function typeDone() { if (--pending === 0) clearClerk(settle); }
    types.forEach(function (t) {
      D1.listDocs(t).then(function (list) {
        if (!list || !list.length) { typeDone(); return; }
        var left = list.length;
        list.forEach(function (item) {
          report.d1Attempted++;
          D1.deleteDoc(t, item.doc_key).then(function (r) {
            if (r && r.ok) report.d1Deleted++; else report.d1Failed++;
            if (--left === 0) typeDone();
          }).catch(function () { report.d1Failed++; if (--left === 0) typeDone(); });
        });
      }).catch(function () { typeDone(); });                                // unreachable type: counted as not-deleted
    });

    function clearClerk(next) {
      try {
        if (!global.Clerk || !global.Clerk.user || typeof global.Clerk.user.update !== 'function') { next(); return; }
        global.Clerk.user.update({ unsafeMetadata: {} })
          .then(function () { report.clerkCleared = true; next(); })
          .catch(function () { next(); });
      } catch (_e) { next(); }
    }
  }

  global.DatumPurge = {
    blueprint: blueprint,
    sketch: sketch,
    signOutWipe: signOutWipe,
    eraseEverywhere: eraseEverywhere,
    _localCarriedKeys: _localCarriedKeys,
    _bpBelongs: _bpBelongs,
    _skBelongs: _skBelongs
  };
}(typeof window !== 'undefined' ? window : this));
