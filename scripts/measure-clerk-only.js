// measure-clerk-only.js — #3 (MISS-4) Clerk->D1 backfill MEASURE, shipped as a served module so it runs
// PASTE-FREE. From the authenticated /studio console (signed in), run ONE short line:
//     import('/scripts/measure-clerk-only.js')
// (to re-run: import('/scripts/measure-clerk-only.js?r=' + Date.now())  — modules are cached by URL.)
//
// READ-ONLY — it calls ONLY DatumD1.listDocs + the codec decoders. ZERO writes: no putDoc, no deleteDoc,
// no Clerk.user.update. It cannot change any data. Same output contract as the console form: two
// [measure] CLERK-ONLY lines + a RESULT: PASS/REVIEW line.
//
// It answers: how many blueprints/sketches live ONLY in the Clerk mirror (invisible after L51)? If zero
// on both types, MISS-4 has no data to recover and closes as a no-op.
(async function () {
  var D1 = window.DatumD1, C = window.DatumArchiveCodec, K = window.Clerk;
  if (!(K && K.user) || !D1 || !C) {
    console.error('[measure] PRECONDITION FAIL - run signed-in on /studio (needs DatumD1 + codec + Clerk):',
      { signedIn: !!(K && K.user), hasD1: !!D1, hasCodec: !!C });
    return;
  }
  var meta = (K.user && K.user.unsafeMetadata) || {};
  async function keys(t) {
    try { var d = await D1.listDocs(t); return { ok: true, keys: d.map(function (x) { return x.doc_key; }) }; }
    catch (e) { return { ok: false, keys: [], err: String(e) }; }
  }
  var bpSlots = [], skSlots = [];
  var bd = meta.blueprint_z ? C.decodeBlueprintArchive(meta.blueprint_z) : null;
  if (bd) ['slot1', 'slot2', 'slot3', 'slot4'].forEach(function (s) {
    var o = bd[s]; if (!o || !o.blueprint_id) return;
    bpSlots.push({ slot: s, blueprint_id: o.blueprint_id, n_rooms: (o.accounts || []).length, saved_at: o.saved_at || null });
  });
  var sd = meta.sketchbook_z ? C.decodeSketchbook(meta.sketchbook_z) : null;
  if (sd) ['slot_1', 'slot_2', 'slot_3', 'slot_4'].forEach(function (s) {
    var o = sd[s]; if (!o || !o.sketch_id) return;
    skSlots.push({ slot: s, sketch_id: o.sketch_id, empty: !(o && Object.keys(o).length > 2), saved_at: o.saved_at || null });
  });
  var bpD1 = await keys('blueprint'), skD1 = await keys('sketchbook');
  function rep(name, slots, idf, d1, isBp) {
    if (!d1.ok) { console.warn('[measure] ' + name + ': D1 UNREACHABLE (' + d1.err + ') - re-run when reachable'); return -1; }
    var set = new Set(d1.keys);
    var only = slots.filter(function (s) { return !set.has(s[idf]); });
    var also = slots.filter(function (s) { return set.has(s[idf]); });
    var real = only.filter(function (s) { return isBp ? s.n_rooms > 0 : !s.empty; });
    console.log('[measure] ' + name.toUpperCase() + ' -> in D1: ' + d1.keys.length + ' | in Clerk mirror: ' +
      (only.length + also.length) + ' | overlap(skip): ' + also.length + ' | CLERK-ONLY: ' + only.length +
      ' (' + real.length + ' REAL / ' + (only.length - real.length) + ' ghost)');
    if (only.length) console.table(only);
    return only.length;
  }
  console.log('===== #3 BACKFILL MEASURE (READ-ONLY - nothing is written) =====');
  console.log('env:', { signedIn: !!(K && K.user), cutover: D1.CUTOVER });
  var bo = rep('blueprint', bpSlots, 'blueprint_id', bpD1, true);
  var so = rep('sketchbook', skSlots, 'sketch_id', skD1, false);
  var pass = bpD1.ok && skD1.ok && bo === 0 && so === 0;
  console.log(pass
    ? 'RESULT: PASS - clerkOnly:[] BOTH types. MISS-4 has no work; close it as no-op.'
    : 'RESULT: REVIEW - some Clerk-only keys exist (see the table(s) above).');
  console.log('===== end (nothing was written) =====');
})();
