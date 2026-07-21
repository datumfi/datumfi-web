/* plan-3-measure-instrument.js — #3 Clerk→D1 backfill MEASURE-FIRST dry-run.
 *
 * READ-ONLY. Calls ONLY DatumD1.listDocs / DatumD1.getDoc and the codec decoders.
 * It performs ZERO writes: no putDoc, no deleteDoc, no Clerk.user.update. Safe to run
 * as many times as you like — it cannot change any data.
 *
 * HOW TO RUN (Captain, in your authenticated browser):
 *   1. Sign in on https://datumfi.com and open STUDIO (https://datumfi.com/studio) —
 *      it is the page that loads BOTH datum-d1.js AND datum-archive-codec.js (verified).
 *      Wait for Clerk to finish loading (a second after the page settles).
 *   2. Open DevTools console (F12).
 *   3. Paste this whole file, press Enter.
 *   4. Copy the printed report back to Claude.
 *
 * It answers the ONE question that decides whether #3 is a data migration or just a
 * code-robustness closeout: how many blueprints/sketches live ONLY in the Clerk mirror
 * (invisible after L51), and are they real or empty ghosts?
 */
(async function measureBackfill() {
  var out = { blueprint: {}, sketchbook: {}, env: {} };
  var D1 = window.DatumD1, Codec = window.DatumArchiveCodec, Clerk = window.Clerk;

  // ---- environment sanity (so a null result isn't mistaken for "no data") ----
  out.env.signedIn      = !!(Clerk && Clerk.user);
  out.env.cutover       = D1 ? D1.CUTOVER : '(DatumD1 absent)';
  out.env.hasCodec      = !!Codec;
  out.env.hasD1         = !!D1;
  if (!out.env.signedIn || !out.env.hasD1 || !out.env.hasCodec) {
    console.error('[measure] PRECONDITION FAIL — run signed-in on a page with datum-d1.js + datum-archive-codec.js:', out.env);
    return out;
  }

  var meta = (Clerk.user && Clerk.user.unsafeMetadata) || {};

  // ---- helper: what's already in D1 (authoritative set of doc_keys) ----
  async function d1Keys(type) {
    try {
      var docs = await D1.listDocs(type);              // REACHABLE list (L51). Rejects on unreachable.
      return { ok: true, keys: docs.map(function (d) { return d.doc_key; }), rows: docs };
    } catch (e) {
      return { ok: false, keys: [], rows: [], err: String(e) };  // unreachable — do NOT treat as empty
    }
  }

  // ---- BLUEPRINTS ----
  (function () {
    var b = out.blueprint;
    var dec = meta.blueprint_z ? Codec.decodeBlueprintArchive(meta.blueprint_z) : null;
    b.clerkMirrorPresent = !!meta.blueprint_z;
    b.clerkSlots = [];
    if (dec) {
      ['slot1', 'slot2', 'slot3', 'slot4'].forEach(function (sk) {
        var s = dec[sk];
        if (!s || !s.blueprint_id) return;
        var accts = (s.accounts || []);
        var anyHoldings = accts.some(function (a) { return a && a.holdings && a.holdings.length; });
        b.clerkSlots.push({
          slot: sk,
          blueprint_id: s.blueprint_id,
          label: s.blueprint_label || s.label || s.name || '(untitled)',
          n_rooms: accts.length,
          holdings_present: anyHoldings,
          fidelity: anyHoldings ? 'full-ish' : 'degraded-or-empty',
          saved_at: s.saved_at || null
        });
      });
    }
    b._d1Pending = true; // filled below (async)
  })();

  // ---- SKETCHBOOK ----
  (function () {
    var skb = out.sketchbook;
    var dec = meta.sketchbook_z ? Codec.decodeSketchbook(meta.sketchbook_z) : null;
    skb.clerkMirrorPresent = !!meta.sketchbook_z;
    skb.clerkSlots = [];
    if (dec) {
      ['slot_1', 'slot_2', 'slot_3', 'slot_4'].forEach(function (sk) {
        var s = dec[sk];
        if (!s || !s.sketch_id) return;
        skb.clerkSlots.push({
          slot: sk,
          sketch_id: s.sketch_id,
          label: s.sketch_title || s.title || s.name || '(untitled)',
          empty: !(s && Object.keys(s).length > 2),
          saved_at: s.saved_at || null
        });
      });
    }
  })();

  // ---- diff against D1 ----
  var bpD1 = await d1Keys('blueprint');
  var skD1 = await d1Keys('sketchbook');
  out.blueprint.d1 = bpD1;
  out.sketchbook.d1 = skD1;

  function diff(clerkSlots, idField, d1) {
    if (!d1.ok) return { reachable: false, note: 'D1 UNREACHABLE (' + d1.err + ') — cannot diff; re-run when reachable' };
    var d1set = new Set(d1.keys);
    var clerkOnly = clerkSlots.filter(function (s) { return !d1set.has(s[idField]); });
    var alsoInD1  = clerkSlots.filter(function (s) { return d1set.has(s[idField]); });
    return { reachable: true, clerkOnly: clerkOnly, alsoInD1: alsoInD1, d1Count: d1.keys.length };
  }

  out.blueprint.diff  = diff(out.blueprint.clerkSlots,  'blueprint_id', bpD1);
  out.sketchbook.diff = diff(out.sketchbook.clerkSlots, 'sketch_id',    skD1);

  // ---- verdict ----
  function verdict(name, d, isBp) {
    if (!d.reachable) { console.warn('[measure] ' + name + ': ' + d.note); return; }
    var only = d.clerkOnly;
    var nonEmpty = only.filter(function (s) { return isBp ? s.n_rooms > 0 : !s.empty; });
    var ghosts   = only.length - nonEmpty.length;
    console.log('%c[measure] ' + name.toUpperCase(), 'font-weight:bold');
    console.log('  in D1 already: ' + d.d1Count + ' | in Clerk mirror: ' + (d.clerkOnly.length + d.alsoInD1.length) +
                ' | overlap (D1 wins, skip): ' + d.alsoInD1.length);
    console.log('  CLERK-ONLY (candidates to backfill): ' + only.length +
                '  => ' + nonEmpty.length + ' REAL / ' + ghosts + ' empty-ghost');
    if (only.length) console.table(only);
    if (only.length && ghosts === only.length) console.log('  VERDICT: all ghosts — NO data to recover; #3 = code-robustness closeout only.');
    else if (nonEmpty.length) console.log('  VERDICT: ' + nonEmpty.length + ' real Clerk-only ' + name + '(s) — worth backfilling (check fidelity column).');
    else console.log('  VERDICT: nothing Clerk-only — #3 has no work here.');
  }

  console.log('%c===== #3 BACKFILL MEASURE-FIRST DRY-RUN (read-only) =====', 'font-size:14px;font-weight:bold');
  console.log('env:', out.env);
  verdict('blueprint', out.blueprint.diff, true);
  verdict('sketchbook', out.sketchbook.diff, false);
  console.log('%c===== end (nothing was written) =====', 'font-weight:bold');
  window.__backfillMeasure = out;   // full object for copy-paste back to Claude
  console.log('Full object saved to window.__backfillMeasure — copy it here:');
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
