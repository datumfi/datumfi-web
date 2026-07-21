/* plan-3-getdoc-proof.js — #3 backfill FINAL read-only certainty.
 *
 * READ-ONLY. Calls ONLY DatumD1.getDoc on the 3 blueprint keys the measure step found.
 * ZERO writes (no putDoc, no deleteDoc, no Clerk.update). Safe to run any number of times.
 *
 * PURPOSE: the measure step proved clerkOnly=0 (every blueprint already in D1). This proves the
 * D1 PAYLOADS actually carry their rooms — the last certainty before declaring the backfill closed.
 *
 * HOW TO RUN (Captain, authenticated):
 *   1. Sign in, open https://datumfi.com/studio (loads datum-d1.js). Let Clerk settle a second.
 *   2. F12 console -> paste this whole file -> Enter.
 *   3. Copy the printed table + window.__getDocProof back to Claude.
 */
(async function getDocProof() {
  var D1 = window.DatumD1, Clerk = window.Clerk;
  var KEYS = [
    '5f0021a6-4e16-4966-bbbf-4cc6f3488cd8',
    'f99ce473-f594-49d7-b706-3f282cd269fe',
    '16b2bffb-73f1-4c4e-bf48-e3c6603153a4'
  ];
  var env = { signedIn: !!(Clerk && Clerk.user), hasD1: !!D1, cutover: D1 ? D1.CUTOVER : '(absent)' };
  if (!env.signedIn || !env.hasD1) { console.error('[proof] PRECONDITION FAIL — run signed-in on /studio:', env); return env; }

  var rows = [];
  for (var i = 0; i < KEYS.length; i++) {
    var key = KEYS[i];
    var doc = null, err = null;
    try { doc = await D1.getDoc('blueprint', key); }   // read-only; null on miss/error/timeout
    catch (e) { err = String(e); }
    var payload = null, nRooms = null, hasHoldings = null, bytes = null, label = null;
    if (doc && doc.payload) {
      bytes = (typeof doc.payload === 'string') ? doc.payload.length : JSON.stringify(doc.payload).length;
      try {
        payload = (typeof doc.payload === 'string') ? JSON.parse(doc.payload) : doc.payload;
        var accts = (payload && payload.accounts) || [];
        nRooms = accts.length;
        hasHoldings = accts.some(function (a) { return a && a.holdings && a.holdings.length; });
        label = (payload && (payload.blueprint_label || payload.label || payload.name)) || '(untitled)';
      } catch (e2) { err = 'payload-parse:' + e2; }
    }
    rows.push({
      blueprint_id: key,
      found: !!doc,
      revision: doc ? doc.revision : null,
      n_rooms: nRooms,
      holdings_present: hasHoldings,
      payload_bytes: bytes,
      label: label,
      err: err
    });
  }

  console.log('%c===== #3 getDoc PROOF (read-only) =====', 'font-size:14px;font-weight:bold');
  console.log('env:', env);
  console.table(rows);
  var missing = rows.filter(function (r) { return !r.found; }).length;
  var empty   = rows.filter(function (r) { return r.found && (r.n_rooms === 0 || r.n_rooms === null); }).length;
  console.log('VERDICT: ' + rows.length + ' keys · ' + (rows.length - missing) + ' found · ' +
              missing + ' missing · ' + empty + ' empty-payload.');
  if (missing === 0 && empty === 0) console.log('  => all 3 D1 blueprints carry their rooms. Backfill cleanly CLOSED.');
  else if (missing) console.log('  => ' + missing + ' NOT found on this read — could be replica lag; re-run before concluding missing.');
  window.__getDocProof = { env: env, rows: rows };
  console.log('Full object in window.__getDocProof — copy here:');
  console.log(JSON.stringify(window.__getDocProof, null, 2));
  return window.__getDocProof;
})();
