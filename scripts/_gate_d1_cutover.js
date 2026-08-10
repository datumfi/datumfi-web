/* D1 PHASE-4 CUTOVER GATE (red-first) — drives the REAL studio-blueprint save()/load()/mirror with
 * mocked globals (spy Clerk, mock localStorage, mock DatumD1) to prove:
 *   B  CLERK-MIRROR-OFF: under cutover a studio save writes NO Clerk unsafeMetadata (slim path off).
 *   D  ONE-FLIP ROLLBACK: DatumD1.CUTOVER=false re-fires the exact old Clerk mirror; flip back = off.
 *   C  D1-AS-TRUTH: with a DIFFERING stale LS draft present, load resolves to the D1 copy.
 *   A/E FIDELITY: toD1Document keeps 18/172 + every name (zero shed/undefined) + strips _-ephemerals.
 * RED-FIRST: `--redfirst` flips each [BITE] winner -> RED on correct code.
 * Run: node scripts/_gate_d1_cutover.js [LABEL] [--redfirst] */
'use strict';
var M = require('./studio-blueprint.js');           // global inside === this module.exports (CJS)
var Codec = require('./datum-archive-codec.js');
const { studioSource } = require('./_studio_source.cjs');

var RF = process.argv.includes('--redfirst');
var pick = function (w, l) { return RF ? l : w; };
var pass = 0, fail = 0, lines = [];
function ok(c, m) { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); }
function tick() { return new Promise(function (r) { setTimeout(r, 15); }); }

// ---- mock the globals studio-blueprint reads (all resolve off module.exports in node) ----
// studio-blueprint.js reaches the Web Storage APIs by BARE identifier, which in Node resolves to
// globalThis — not to this module's exports. Assigning the mock only onto M therefore never bound it:
// the module was quietly using Node's OWN globals. That was survivable while the draft lived in
// sessionStorage (Node ships a working in-memory one), but Node's localStorage is a stub whose
// setItem is NOT a function unless --localstorage-file is given, so the draft write silently failed
// the moment the draft moved stores. Define the mocks where the module actually looks.
var lsStore = {}, ssStore = {};
function mkMockStore(bag) {
  return { getItem: function (k) { return k in bag ? bag[k] : null; },
           setItem: function (k, v) { bag[k] = String(v); },
           removeItem: function (k) { delete bag[k]; },
           clear: function () { for (var k in bag) delete bag[k]; } };
}
M.localStorage = mkMockStore(lsStore);
Object.defineProperty(globalThis, 'localStorage',   { value: M.localStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: mkMockStore(ssStore), writable: true, configurable: true });
M.location = { search: '' };
M.DatumArchiveCodec = Codec;
var clerkUpdates = [];
M.Clerk = { load: function () { return Promise.resolve(); },
  user: { unsafeMetadata: {}, update: function (o) { clerkUpdates.push(o); this.unsafeMetadata = (o && o.unsafeMetadata) || {}; return Promise.resolve(); } } };
var d1Writes = [];
M.DatumD1 = { CUTOVER: true, signedIn: function () { return true; },
  scheduleWrite: function (t, k, getP) { d1Writes.push({ t: t, k: k, payload: getP() }); },
  setRevision: function () {}, knownRevision: function () { return undefined; } };
var BP = M.DatumBlueprint;

// ---- fixture: 18 accounts / 172 holdings, every account NAMED ----
function H(k) { return { ticker: 'TK' + k, name: 'Holding Co ' + k, price: '234.56', shares: '150.25',
  costBasis: '18342.75', acquisitionDate: '2021-06-14', beta: '1.18', dividendYield: '1.92', expRatio: '0.045',
  geography: 'US', sector: 'Tech', assetClass: 'Equity', instrumentType: 'ETF' }; }
function mkBp(tag) {
  var names = ['Joint','Roth','401k','Rollover','HSA','529A','529B','Taxable','SEP','Trad','IBonds','Crypto','Trust','Pension','RSU','Cash1','Cash2','Cash3'];
  var accts = [], t = 0, TOTAL = 172;
  for (var i = 0; i < 18; i++) {
    var n = Math.floor(TOTAL / 18) + (i < TOTAL % 18 ? 1 : 0), hs = [];
    for (var h = 0; h < n; h++) hs.push(H(t + h));
    accts.push({ id: 'a' + (i + 1), baseId: 'taxable_brokerage', name: (tag ? tag + ' ' : '') + names[i], value: 100000, inflow: 0, freq: 12, holdings: hs });
    t += n;
  }
  return { schema: 'DatumFIBlueprintV1', blueprint_id: (tag || 'bp') + '-id', saved_at: '2026-07-13T00:00:00Z',
    version: '1.0.1', profile: {}, accounts: accts, contributions_total: 0, portfolio_total: 0,
    ss: {}, income: {}, climate: {}, tax: {}, upkeep: { upkeep_total: 0, charity_total: 0 },
    datum: { net_datum_v1: 0, gross_funding_need: 0, derived_from: 'quick' } };
}

(async function () {
  // ===== B — ACTIVE AUTOSAVE is Clerk-free; the ARCHIVE mirror (blueprint_z) STAYS ON (Option A #271) =====
  lines.push('===== B · ACTIVE AUTOSAVE Clerk-free · archive mirror ON =====');
  M.DatumD1.CUTOVER = true; clerkUpdates.length = 0; d1Writes.length = 0;
  BP.d1WriteStudio(mkBp());     // the ACTIVE studio autosave D1 path (paired with writeSessionDraft LS)
  await tick();
  ok(pick(clerkUpdates.length === 0, clerkUpdates.length > 0), 'ACTIVE autosave is Clerk-free — writes D1, NEVER unsafeMetadata [BITE]');
  ok(d1Writes.length >= 1 && d1Writes[0].t === 'studio' && d1Writes[0].k === 'active', 'ACTIVE autosave writes the D1 studio/active doc');
  clerkUpdates.length = 0;
  BP.save(mkBp(), { slot: 1 });  // Save-to-Blueprint = the saved-blueprint ARCHIVE mirror (blueprint_z)
  await tick();
  ok(clerkUpdates.length >= 1 && clerkUpdates[0].unsafeMetadata && ('blueprint_z' in clerkUpdates[0].unsafeMetadata),
     'ARCHIVE mirror STILL ON: Save-to-Blueprint writes blueprint_z (never retired before its P5 replacement)');

  // ===== D — ONE-FLIP ROLLBACK: CUTOVER=false => D1 fully OFF (write + load); archive mirror unaffected =====
  lines.push('===== D · ONE-FLIP ROLLBACK (D1 off) =====');
  M.DatumD1.CUTOVER = false; d1Writes.length = 0; clerkUpdates.length = 0;
  BP.d1WriteStudio(mkBp());
  await tick();
  ok(pick(d1Writes.length === 0, d1Writes.length > 0), 'rollback (CUTOVER=false): active D1 write is OFF — D1 fully off = today [BITE]');
  BP.save(mkBp(), { slot: 1 });
  await tick();
  ok(clerkUpdates.length >= 1, 'rollback: the Clerk archive mirror still fires (blueprint_z) — escape route intact');
  M.DatumD1.CUTOVER = true; d1Writes.length = 0;
  BP.d1WriteStudio(mkBp());
  await tick();
  ok(d1Writes.length >= 1, 'flip back to cutover -> active D1 write ON again (one-flip works BOTH directions)');
  // load-side rollback lever lives in studio.html: boot is D1-first ONLY under cutover.
  var st = studioSource();
  ok(st.indexOf('window.DatumD1.CUTOVER !== false && window.DatumD1.signedIn') >= 0, 'load-side: boot is D1-first ONLY under cutover (rollback -> boot(null) = LS-authority)');

  // ===== C — D1 AS TRUTH over a differing stale LS draft =====
  lines.push('===== C · D1-AS-TRUTH over stale LS =====');
  var stale = mkBp('STALE'); BP.save(stale, { slot: 1 });    // seeds the LS session draft = stale
  var loadedLS = BP.load({});   // no d1Doc -> falls back to the LS draft = escape route (assert BEFORE any D1 load,
  ok(loadedLS.accounts[0].name === 'STALE Joint', 'fallback: no D1 doc -> load uses the LS draft (escape route intact)');  // since finishLoad rewrites the draft)
  var d1bp = mkBp('D1');
  var loadedD1 = BP.load({ d1Doc: { payload: JSON.stringify(d1bp), revision: 5 } });
  ok(pick(loadedD1.blueprint_id === 'D1-id' && loadedD1.accounts[0].name === 'D1 Joint', loadedD1.blueprint_id !== 'D1-id'),
     'signed-in load with DIFFERING stale LS resolves to the D1 copy (not LS) [BITE]');

  // ===== A/E — FIDELITY through the cutover path =====
  lines.push('===== A/E · FIDELITY (toD1Document) =====');
  var big = mkBp();
  var doc = BP.toD1Document(big);
  var holdCount = doc.accounts.reduce(function (n, a) { return n + (a.holdings ? a.holdings.length : 0); }, 0);
  var namesOk = doc.accounts.every(function (a, i) { return a.name === big.accounts[i].name && a.name && a.name !== 'undefined'; });
  ok(pick(holdCount === 172 && namesOk, !(holdCount === 172 && namesOk)),
     'FIDELITY: toD1Document keeps 18/172 + every name, zero shed/undefined [BITE]');
  big._agg = { z: 1 }; big.accounts[0]._avmLast = { v: 1 };
  var doc2 = BP.toD1Document(big);
  ok(!('_agg' in doc2) && !('_avmLast' in doc2.accounts[0]), 'toD1Document strips _-prefixed runtime ephemerals (_agg/_avmLast)');

  var overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-4 cutover gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 PHASE-4 CUTOVER — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
