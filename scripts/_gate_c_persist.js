/* _gate_c_persist.js — STEP A item (c): Clerk Save->rehydrate HOLDINGS persistence. RED-first.
 *
 * Drives the REAL code paths (no false pass — a fix at only one layer must still be RED):
 *   Layer 1: studio-blueprint.js slimSlotForClerk  (currently drops holdings @138)
 *   Layer 2: datum-archive-codec.js cBlueprint/dBlueprint (positional acct schema, no holdings)
 *
 * Contract (Captain rulings 2026-07-08):
 *   - blueprint-as-truth, COMPACT-ESSENTIALS: persist the 13 real-position holding fields
 *     [ticker,name,price,shares,costBasis,acquisitionDate,beta,dividendYield,expRatio,
 *      geography,sector,assetClass,instrumentType]; DROP the 8 provenance/source fields
 *      (blank-until-re-sourced, L47) + priceSource.
 *   - E[r]/Vol = ACCOUNT-LEVEL defaults (erOverride/volOverride), not per-holding.
 *   - Graceful-degrade (safety valve): over budget -> keep the ACTIVE blueprint's holdings,
 *     shed OLDER archive-slot holdings (oldest saved_at first) until it fits, ALWAYS retain
 *     LS-truth (never mutate the source archive), never corrupt a write.
 *   - Budget sized against the CANONICAL heavy baseline (long ids + optional flags), not an
 *     optimistic slim generator.
 *
 * Run: node scripts/_gate_c_persist.js   (exit 0 = GREEN, non-0 = RED)
 */
'use strict';
var Codec = require('./datum-archive-codec.js');
var BP    = require('./studio-blueprint.js').DatumBlueprint;
var cB = Codec._internal.cBlueprint, dB = Codec._internal.dBlueprint;

var fails = [];
function check(n, c, d) { if (c) console.log('  PASS  ' + n + (d != null ? ' (' + d + ')' : '')); else { console.log('  FAIL  ' + n + (d != null ? ' (' + d + ')' : '')); fails.push(n); } }
function allH(b) { var o = []; (b.accounts || []).forEach(function (a) { (a.holdings || []).forEach(function (h) { o.push(h); }); }); return o; }

/* ---- fixtures: a fully-decorated holding (13 essentials + provenance that must be dropped) ---- */
function H(k) {
  return { ticker: 'TIC' + k, name: 'Vanguard Fund ' + k + ' Investor Class', price: (10 + k % 400).toFixed(2),
    shares: (100 + k).toFixed(3), costBasis: (5000 + k * 137).toFixed(2), acquisitionDate: '2021-0' + (1 + k % 9) + '-15',
    beta: (0.8 + (k % 50) / 100).toFixed(2), dividendYield: (1 + k % 3).toFixed(2), expRatio: (0.03 + (k % 20) / 1000).toFixed(3),
    geography: (k % 2 ? 'US' : 'International'), sector: 'Broad Market/Blend', assetClass: 'US Equity',
    instrumentType: (k % 2 ? 'ETF' : 'Mutual Fund'),
    // provenance — MUST be dropped from the Clerk mirror (blank-until-re-sourced):
    priceSource: 'manual', betaSrc: 'Yahoo Finance', betaAsOf: '2026-06-30', betaMethod: '36mo monthly vs SPY',
    dividendYieldSrc: 'Yahoo Finance', dividendYieldAsOf: '2026-06-30', sectorSrc: 'SEC', geographySrc: 'SEC', expRatioSrc: 'SPDR' };
}
function acct(id, baseId, nH, over) {
  var a = { id: id, baseId: baseId, value: 15000, inflow: 500, freq: 12, name: 'Room ' + id, holdings: [] };
  for (var i = 0; i < nH; i++) a.holdings.push(H(i));
  if (over) { a.erOverride = 0.065; a.volOverride = 0.14; }
  return a;
}
function bp(id, savedAt, accts) {
  return { schema: 'DatumFIBlueprintV1', blueprint_id: id, saved_at: savedAt, version: '1.0.1', profile: {},
    accounts: accts, contributions_total: 0, portfolio_total: 0, ss: {}, income: {}, climate: {}, tax: {},
    upkeep: { upkeep_total: 0, charity_total: 0 }, datum: { net_datum_v1: 0, gross_funding_need: 0, derived_from: 'quick' } };
}

console.log('STEP A (c) — Clerk save->rehydrate holdings persistence gate');

/* ===== (a) ROUND-TRIP through the REAL slim + REAL codec ===== */
console.log('\n(a) round-trip: full blueprint -> slimSlotForClerk -> codec encode/decode -> rehydrate');
var active = bp('active-bp', '2026-07-08T18:00:00.000Z',
  [acct('a1', 'taxable', 5, true), acct('a2', 'rothira', 4, false), acct('a3', 'pretax401k', 6, true)]);
var slim = BP.slimSlotForClerk(active);
var back = dB(cB(slim));
var origH = allH(active), backH = allH(back);
check('(a) holdings row count preserved (zero dropped rows)', backH.length === origH.length, backH.length + '/' + origH.length);
check('(a) every ticker rehydrates (zero undefined)', backH.length > 0 && backH.every(function (h) { return h && h.ticker && h.ticker !== 'undefined'; }));
check('(a) name + costBasis + acquisitionDate rehydrate', backH.length > 0 && backH.every(function (h) { return h.name && h.costBasis != null && h.acquisitionDate; }));
var ba1 = (back.accounts || []).filter(function (x) { return x.id === 'a1'; })[0];
check('(a) account-level E[r]/Vol override rehydrates', !!ba1 && ba1.erOverride === 0.065 && ba1.volOverride === 0.14, ba1 ? (ba1.erOverride + '/' + ba1.volOverride) : 'no a1');
check('(a) provenance DROPPED from mirror (L47 blank-until-re-sourced)', backH.length > 0 && backH.every(function (h) { return h.betaSrc === undefined && h.betaMethod === undefined && h.expRatioSrc === undefined; }));

/* ===== (b) BUDGET vs the canonical HEAVY baseline (long ids + optional flags) ===== */
console.log('\n(b) budget: heavy canonical archive + ESSENTIALS holdings, real codec, vs 8192/2048');
function heavyAcct(i, seed, nH) {
  var a = { id: 'acct-' + (1718539200000 + i * 9137 + seed * 31) + '-' + ((i * 7 + seed) % 97),
    baseId: ['pretax401k','tradira','roth401k','rothira','taxable','crypto_primary','pretax457b','trad403'][(i + seed) % 8],
    value: 1500 + i * 813, inflow: 500 + i * 37, freq: 12,
    intRate: (i % 3 === 0) ? 4.25 : 0, cola: (i % 4 === 0) ? 2.5 : 0,
    linkedAssetId: (i % 5 === 0) ? ('acct-' + (1718539200000 + (i + 3) * 9137)) : 0,
    exclude: (i % 6 === 0), useRule55: (i % 7 === 0), isFriction: (i % 8 === 0), isPriority: (i % 9 === 0),
    holdings: [] };
  for (var h = 0; h < nH; h++) a.holdings.push(H(h));
  return a;
}
function heavyBp(seed, nAccts, holdingsPerAcct) {
  var accts = []; for (var i = 0; i < nAccts; i++) accts.push(heavyAcct(i, seed, holdingsPerAcct));
  return bp('a' + seed + 'b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', '2026-0' + ((seed % 9) + 1) + '-1' + (seed % 9) + 'T18:30:56.789Z', accts);
}
// single active blueprint, 12 accounts, ~4 holdings each = ~48 holdings (near the essentials ceiling)
var heavySlim = BP.slimSlotForClerk(heavyBp(1, 12, 4));
var arch = { slot1: heavySlim, slot2: null, slot3: null, slot4: null };
var blob = Codec.encodeBlueprintArchive(arch);
var decoded = Codec.decodeBlueprintArchive(blob);
var decodedH = decoded && decoded.slot1 ? allH(decoded.slot1) : [];
var dossier = { schema: 'DatumFIAccountDossierV15', primary: { fullName: 'Alexandra Q. Winterbottom-Smithfield', dateOfBirth: '1975-03', grossIncome: 485000, targetRetirementAge: 62, yearsToRetirement: 11 }, household: { filing: 'Married Filing Jointly', location: 'CA' } };
var meta = { dossier: dossier, workspaceName: 'Alexandra Winterbottom-Smithfield', blueprint_z: blob, sketchbook_z: 'S'.repeat(769) };
var total = Codec.byteLen(JSON.stringify(meta)), margin = 8192 - total;
check('(b) mirror actually CONTAINS the holdings (not silently dropped)', decodedH.length === 48, decodedH.length + '/48');
check('(b) total <= 8192 hard cap at ~48 holdings', total <= 8192, total);
console.log('  -- blueprint_z ' + Codec.byteLen(blob) + ' | total ' + total + '/8192 | margin ' + margin + (margin < 2048 ? '  ⚠ UNDER 2048 floor (flag)' : ''));

/* ===== (c) GRACEFUL DEGRADE (safety valve) — the 172-holding reality ===== */
console.log('\n(c) graceful-degrade: over-budget 4-slot archive -> keep ACTIVE, shed older, keep LS-truth');
// ACTIVE fits on its own (6x4 = 24 holdings); the 3 OLDER slots are heavy (6x15 = 90 each) and
// push the archive over-cap, so the safety valve must shed the older slots to make room.
var s1 = BP.slimSlotForClerk(heavyBp(1, 6,  4)); s1.blueprint_id = 'ACTIVE';   s1.saved_at = '2026-07-08T18:00:00Z';
var s2 = BP.slimSlotForClerk(heavyBp(2, 6, 15)); s2.blueprint_id = 'OLD-2016'; s2.saved_at = '2016-01-01T00:00:00Z';
var s3 = BP.slimSlotForClerk(heavyBp(3, 6, 15)); s3.blueprint_id = 'OLD-2018'; s3.saved_at = '2018-01-01T00:00:00Z';
var s4 = BP.slimSlotForClerk(heavyBp(4, 6, 15)); s4.blueprint_id = 'OLD-2020'; s4.saved_at = '2020-01-01T00:00:00Z';
var bigArch = { slot1: s1, slot2: s2, slot3: s3, slot4: s4 };
var snapshot = JSON.stringify(bigArch);   // LS-truth must be untouched

var hasDegrade = typeof Codec.encodeArchiveWithDegrade === 'function';
check('(c) degrade encoder exists (Codec.encodeArchiveWithDegrade)', hasDegrade);
if (hasDegrade) {
  var reserve = Codec.byteLen(JSON.stringify({ dossier: dossier, workspaceName: 'Alexandra Winterbottom-Smithfield', sketchbook_z: 'S'.repeat(769) }));
  var res = Codec.encodeArchiveWithDegrade(bigArch, 'ACTIVE', 8192 - reserve);
  var db = res && res.blob ? Codec.decodeBlueprintArchive(res.blob) : null;
  var meta2 = { dossier: dossier, workspaceName: 'Alexandra Winterbottom-Smithfield', blueprint_z: (res && res.blob) || '', sketchbook_z: 'S'.repeat(769) };
  check('(c) degraded payload fits <= 8192', Codec.byteLen(JSON.stringify(meta2)) <= 8192, Codec.byteLen(JSON.stringify(meta2)));
  check('(c) ACTIVE slot holdings FULLY retained', db && db.slot1 && allH(db.slot1).length === 24, db && db.slot1 ? allH(db.slot1).length + '/24' : 'no active');
  var oldestShed = db && db.slot2 && allH(db.slot2).length === 0;
  check('(c) older slots shed holdings (oldest saved_at first)', oldestShed);
  check('(c) LS-truth untouched (source archive not mutated)', JSON.stringify(bigArch) === snapshot);
} else {
  check('(c) degraded payload fits <= 8192', false, 'no degrade fn');
  check('(c) ACTIVE slot holdings FULLY retained', false, 'no degrade fn');
  check('(c) older slots shed holdings (oldest first)', false, 'no degrade fn');
  check('(c) LS-truth untouched', false, 'no degrade fn');
}

console.log('\nOVERALL: ' + (fails.length ? 'RED (' + fails.length + ' failing)' : 'GREEN'));
process.exit(fails.length ? 1 : 0);
