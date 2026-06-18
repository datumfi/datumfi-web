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
  var SK_SNAPSHOT = 'datumfi_sketch_current_snapshot';
  var SK_PER_SLOT = 'datum_sketch_state_';
  var SK_BOOK     = 'datumfi_sketchbook_v1';

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

  global.DatumPurge = {
    blueprint: blueprint,
    sketch: sketch,
    _bpBelongs: _bpBelongs,
    _skBelongs: _skBelongs
  };
}(typeof window !== 'undefined' ? window : this));
