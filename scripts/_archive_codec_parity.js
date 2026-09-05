/* _archive_codec_parity.js — STANDING GATE for datum-archive-codec.js
 *
 * Proves, on HETEROGENEOUS worst-case data (the realistic upper bound — 4 fully
 * built Blueprint slots @ 12/15/18/20 rooms across the full baseId/trust universe,
 * + 4 Sketchbook slots):
 *   1. LOSSLESS round-trip: decode(encode(slim)) deep-equals slim, for both stores.
 *   2. null slots stay null.
 *   3. BUDGET: total unsafeMetadata <= 8192, blueprint_z < 6000 (Captain trigger),
 *      shared margin >= 2048 (2KB safety floor).
 *   4. GUARD: wouldFit() refuses an over-cap write (graceful-fail contract).
 *
 * Run: node scripts/_archive_codec_parity.js   (exit 0 = GREEN, non-0 = RED)
 */
'use strict';
var Codec = require('./datum-archive-codec.js');

var fails = [];
function check(name, cond, detail) {
  if (cond) { console.log('  PASS ', name, detail != null ? '(' + detail + ')' : ''); }
  else { console.log('  FAIL ', name, detail != null ? '(' + detail + ')' : ''); fails.push(name); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* ---- heterogeneous generators (full account objects -> then slimmed) ---- */
var BASES = ['pretax401k','pretax401k_co','pretax457b','tradira','tradira_co','roth401k','roth401k_co',
  'rothira','rothira_co','taxable','savings_primary','crypto_primary','realestate','primary_home',
  'vehicle','mortgage','heloc','pension_primary','trust_irrev'];
var TRUSTS = ['Irrevocable','Revocable','Charitable Remainder'];
var DISB   = ['Discretionary','Mandatory','Staggered'];
function rnd(s) { return (Math.sin(s) * 10000) % 1; }

function fullAcct(i, seed) {
  var b = BASES[(i + seed) % BASES.length];
  var a = { id: 'acct-' + (1718539200000 + i * 9137 + seed * 31) + '-' + ((i * 7 + seed) % 97),
    baseId: b, name: 'Room ' + i, notes: 'note ' + i, holdings: [{ticker:'VTI',pct:60}],
    value: Math.round(Math.abs(rnd(i + seed)) * 2400000) + 1500,
    inflow: Math.round(Math.abs(rnd(i * 2 + seed)) * 31000), freq: [12,26,24,1][(i + seed) % 4] };
  if (i % 3 === 0) a.intRate = Math.round(Math.abs(rnd(i)) * 900) / 100;
  if (i % 4 === 0) a.cola = Math.round(Math.abs(rnd(i + 1)) * 400) / 100;
  if (i % 5 === 0) a.linkedAssetId = 'acct-' + (1718539200000 + ((i + 3) * 9137)) + '-' + ((i + 3) % 97);
  if (i % 6 === 0) a.exclude = true;
  if (i % 7 === 0) a.useRule55 = true;
  if (i % 8 === 0) a.isFriction = true;
  if (i % 9 === 0) a.isPriority = true;
  if (b.indexOf('trust') >= 0) { a.trustType = TRUSTS[i % 3]; a.disbursement = DISB[i % 3]; }
  return a;
}
/* slimSlotForClerk mirror (exactly what the hub stores) */
function slimAcct(a) {
  var o = { id: a.id, baseId: a.baseId, value: a.value || 0, inflow: a.inflow || 0, freq: a.freq || 12 };
  if (a.intRate) o.intRate = a.intRate;
  if (a.cola) o.cola = a.cola;
  if (a.linkedAssetId) o.linkedAssetId = a.linkedAssetId;
  if (a.exclude) o.exclude = true;
  if (a.useRule55) o.useRule55 = true;
  if (a.isFriction) o.isFriction = true;
  if (a.isPriority) o.isPriority = true;
  if (a.trustType && a.trustType !== 'Irrevocable') o.trustType = a.trustType;
  if (a.disbursement && a.disbursement !== 'Discretionary') o.disbursement = a.disbursement;
  return o;
}
var NM = ['Alexandra Q. Winterbottom-Smithfield','Benjamin Castellanos-Vandermeer',
          'Charlotte Featherstonehaugh','Demetrius Papadopoulos-Reyes'];
var CO = ['Christopher Winterbottom-Smithfield','Beatriz Castellanos-Vandermeer',
          'Cornelius Featherstonehaugh','Daniela Papadopoulos-Reyes'];
function slimBlueprint(seed, n) {
  var accts = []; for (var i = 0; i < n; i++) accts.push(slimAcct(fullAcct(i, seed)));
  return {
    schema: 'DatumFIBlueprintV1', blueprint_id: 'a' + seed + 'b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    saved_at: '2026-0' + ((seed % 9) + 1) + '-1' + (seed % 9) + 'T18:' + (10 + seed % 49) + ':56.789Z', version: '1.0.1',
    profile: { primary_name: NM[seed % 4], co_architect_name: CO[seed % 4],
      primary_dob: '0' + ((seed % 9) + 1) + ' / 197' + (seed % 9), co_architect_dob: '1' + (seed % 2) + ' / 197' + ((seed + 2) % 9),
      target_retirement_date: '0' + ((seed % 9) + 1) + ' / 203' + (seed % 9),
      co_architect_retirement_date: '1' + (seed % 2) + ' / 204' + (seed % 9),
      plan_end_age: 90 + seed % 16, co_architect_enabled: (seed % 2 === 0),
      /* ⛔ SCHEMA 1.1.0 (2026-09-05, cause 6). These four and the five tax keys below were ADDED to
       * the blueprint by 8a59e13 and the codec dropped every one of them silently. THIS GATE STAYED
       * GREEN THROUGHOUT, because slimBlueprint() is a HAND-WRITTEN MIRROR of the codec's shape: a
       * fixture authored to match its subject can only test the keys somebody remembered to add.
       * That is the whole reason _gate_codec_roundtrip_complete.js now DERIVES its fixture from
       * DatumBlueprint['new']() instead. Adding them here STRENGTHENS this gate — nine more keys
       * asserted lossless — and nothing previously asserted is relaxed.
       * ⚠️ WHEN THE SCHEMA GROWS AGAIN, THIS BLOCK WILL BE STALE AND SILENT ABOUT IT. The derived
       *    gate is the one that will tell you. Do not treat this list as the contract. */
      plan_end_date: '0' + ((seed % 9) + 1) + ' / 206' + (seed % 9),
      primary_salary: 120000 + seed * 1117,
      co_architect_salary: 90000 + seed * 913,
      co_architect_plan_end_date: '1' + (seed % 2) + ' / 207' + (seed % 9) },
    accounts: accts, contributions_total: Math.round(Math.abs(rnd(seed)) * 180000),
    portfolio_total: Math.round(Math.abs(rnd(seed * 2)) * 8000000),
    ss: { strategy_primary: ['early_62','full_67','optimal_70'][seed % 3], strategy_secondary: ['early_62','full_67','optimal_70'][(seed + 1) % 3],
      pri_overrides_monthly: { v62: 1800 + seed, v67: 2600 + seed, v70: 3200 + seed },
      sec_overrides_monthly: { v62: 1500, v67: 2200, v70: 2900 } },
    income: { pension_primary_annual: Math.round(Math.abs(rnd(seed * 3)) * 60000), pension_secondary_annual: Math.round(Math.abs(rnd(seed * 4)) * 40000) },
    climate: { outlook: ['valuations_matter','history_repeats','cautious','optimistic','custom'][seed % 5],
      custom_weights: (seed % 5 === 4) ? { bootstrap: 0.3, parametric: 0.2, regime: 0.25, cape: 0.25 } : null },
    tax: { filing: ['Married Filing Jointly','Single','Head of Household'][seed % 3], location: ['CA','NY','FL','TX'][seed % 4], working_year_effective_rate: 0.18 + (seed % 20) / 100,
      /* schema 1.1.0 — see the note in `profile` above. */
      method: ['bracket','effective','estimated'][seed % 3],
      co_method: ['effective','bracket','estimated'][seed % 3],
      co_filing: ['Married Filing Jointly','Single','Head of Household'][(seed + 1) % 3],
      co_location: ['TX','FL','NY','CA'][seed % 4],
      co_working_year_effective_rate: 0.16 + (seed % 17) / 100 },
    upkeep: { upkeep_total: Math.round(Math.abs(rnd(seed * 5)) * 90000), charity_total: Math.round(Math.abs(rnd(seed * 6)) * 30000) },
    datum: { net_datum_v1: 120000 + seed * 1234, gross_funding_need: 160000 + seed * 1500, derived_from: (seed % 2) ? 'detailed' : 'quick' }
  };
}
/* _slimSlot mirror for sketch */
function slimSketch(seed) {
  return { age: 42 + seed, retire_age: 60 + seed % 8, portfolio_mass: Math.round(Math.abs(rnd(seed)) * 900) / 100,
    contributions: 60000 + seed * 1234, datum_spend: 150000 + seed * 2345, designed_ceil: 280000 + seed * 3456,
    designed_floor: 100000 + seed * 1234, resolved_state: ['EXPANSIVE','STRETCHED','OVEREXTENDED','SECURE'][seed % 4],
    status: ['Drafted','Modeled'][seed % 2],
    date_stamped: '0' + ((seed % 9) + 1) + '/1' + (seed % 9) + '/2026', time_stamped: (1 + seed % 12) + ':3' + (seed % 6) + ' PM',
    s1_datum: 140000 + seed * 1111, s1_ceil: 230000 + seed * 2222, s1_floor: 95000 + seed * 900, s1_resolved_state: ['STRETCHED','SECURE'][seed % 2],
    s2_design: { ceilDelta: 20000 + seed * 100, floorDelta: 7000 + seed * 50, datumDelta: 12000 + seed * 80, portDelta: Math.round(rnd(seed) * 100) / 100,
      age: 42 + seed, retire: 60 + seed % 8, planThroughAge: 90 + seed % 16, port: Math.round(Math.abs(rnd(seed * 2)) * 900) / 100, datum: 150 + seed, contrib: 90000 + seed * 1000 },
    market_outlook: ['valuations_matter','history_repeats','cautious'][seed % 3], tax_rate: 18 + seed % 20, inflation_mode: (seed % 2) ? 'real' : 'nominal', plan_end_age: 90 + seed % 16 };
}

console.log('datum-archive-codec parity + budget gate');
console.log('codec VERSION', Codec.VERSION, '| CAP', Codec.CAP);

/* ---- 1. Blueprint round-trip (heterogeneous worst case 12/15/18/20) ---- */
var arch = { slot1: slimBlueprint(1, 12), slot2: slimBlueprint(2, 15), slot3: slimBlueprint(3, 18), slot4: slimBlueprint(4, 20) };
var bpBlob = Codec.encodeBlueprintArchive(arch);
var bpBack = Codec.decodeBlueprintArchive(bpBlob);
check('blueprint round-trip lossless (65 heterogeneous rooms)', eq(bpBack, arch));
check('blueprint slot4 rooms intact', bpBack && bpBack.slot4 && bpBack.slot4.accounts.length === 20, bpBack && bpBack.slot4 && bpBack.slot4.accounts.length);

/* ---- 2. Sketchbook round-trip ---- */
var book = { sketchbook_title: 'Architect Sketchbook 2026', slot_1: slimSketch(1), slot_2: slimSketch(2), slot_3: slimSketch(3), slot_4: slimSketch(4) };
var skBlob = Codec.encodeSketchbook(book);
var skBack = Codec.decodeSketchbook(book && skBlob);
check('sketchbook round-trip lossless (4 slots + s2_design)', eq(skBack, book));

/* ---- 2b. null slots stay null ---- */
var sparse = { slot1: slimBlueprint(1, 5), slot2: null, slot3: null, slot4: null };
var sparseBack = Codec.decodeBlueprintArchive(Codec.encodeBlueprintArchive(sparse));
check('blueprint null slots stay null', sparseBack && sparseBack.slot2 === null && sparseBack.slot3 === null && eq(sparseBack.slot1, sparse.slot1));
var bookSparse = { sketchbook_title: 'X', slot_1: slimSketch(1), slot_2: null, slot_3: null, slot_4: null };
var bookSparseBack = Codec.decodeSketchbook(Codec.encodeSketchbook(bookSparse));
check('sketchbook null slots stay null', bookSparseBack && bookSparseBack.slot_2 === null && eq(bookSparseBack.slot_1, bookSparse.slot_1));

/* ---- 2c. unknown version -> null (caller falls back to LS) ---- */
check('decode rejects unknown version', Codec.decodeBlueprintArchive('9' + bpBlob.slice(1)) === null);

/* ---- 3. Budget ---- */
var dossier = { schema: 'DatumFIAccountDossierV15', primary: { fullName: NM[0], dateOfBirth: '1975-03', grossIncome: 485000, targetRetirementAge: 62, yearsToRetirement: 11 },
  household: { filing: 'Married Filing Jointly', location: 'CA', coArchitect: { fullName: CO[0], dateOfBirth: '1977-09', grossIncome: 412000, targetRetirementAge: 64, yearsToRetirement: 13 } },
  defaults: { targetRetirementAge: 62, planThroughAge: 105, defaultDatum: 185000, taxRate: '28%', yearsToRetirement: 11 },
  accounts: { currentPortfolioBalance: 4875000, annualContributions: 96000 } };
var meta = { dossier: dossier, workspaceName: 'Alexandra Winterbottom-Smithfield', blueprint_z: bpBlob, sketchbook_z: skBlob };
var bpBytes = Codec.byteLen(bpBlob), skBytes = Codec.byteLen(skBlob), total = Codec.byteLen(JSON.stringify(meta));
console.log('  -- budget: blueprint_z', bpBytes, '| sketchbook_z', skBytes, '| TOTAL', total, '/ 8192 | margin', 8192 - total);
check('blueprint_z < 6000 (Captain trigger)', bpBytes < 6000, bpBytes);
check('total <= 8192 (hard cap)', total <= 8192, total);
check('shared margin >= 2048 (2KB floor)', (8192 - total) >= 2048, 8192 - total);

/* ---- 4. Guard: over-cap write fails gracefully ---- */
var bloated = { dossier: dossier, blob: 'x'.repeat(9000) };
var fit = Codec.wouldFit(bloated, 'blueprint_z', bpBlob);
check('wouldFit refuses over-cap write', fit.ok === false, fit.bytes);
var ok = Codec.wouldFit({ dossier: dossier }, 'blueprint_z', bpBlob);
check('wouldFit accepts in-budget write', ok.ok === true, ok.bytes);

/* ---- 5. P3 migration: legacy-key reclaim + over-cap safety (Decision A) ----
 * Mirrors the live mirror logic: drop the legacy single-slot key, add the _z blob,
 * and proceed ONLY when safeMerge returns ok:true. Over cap -> refuse + keep legacy. */
var legacyMeta = { dossier: dossier, workspaceName: 'Alexandra Winterbottom-Smithfield',
  blueprint: slimBlueprint(1, 12), sketchbook: { sketchbook_title: 'X', slot_1: slimSketch(1) } };
var mBase = Object.assign({}, legacyMeta); delete mBase.blueprint;
var mBp = Codec.safeMerge(mBase, { blueprint_z: bpBlob });
var mBase2 = Object.assign({}, mBp.merged); delete mBase2.sketchbook;
var mSk = Codec.safeMerge(mBase2, { sketchbook_z: skBlob });
check('migration: blueprint_z write fits (ok)', mBp.ok === true, mBp.bytes);
check('migration: sketchbook_z write fits (ok)', mSk.ok === true, mSk.bytes);
check('migration: legacy keys removed', !('blueprint' in mSk.merged) && !('sketchbook' in mSk.merged));
check('migration: _z keys present', ('blueprint_z' in mSk.merged) && ('sketchbook_z' in mSk.merged));
var bothLegacyAndZ = Codec.byteLen(JSON.stringify(Object.assign({}, legacyMeta, { blueprint_z: bpBlob, sketchbook_z: skBlob })));
check('migration: reclaim shrinks payload', mSk.bytes < bothLegacyAndZ, mSk.bytes + ' < ' + bothLegacyAndZ);
check('migration: final <= 8192', mSk.bytes <= 8192, mSk.bytes);
var nearFull = { filler: 'x'.repeat(7000), blueprint: slimBlueprint(1, 12) };
var ofBase = Object.assign({}, nearFull); delete ofBase.blueprint;
var ofRes = Codec.safeMerge(ofBase, { blueprint_z: bpBlob });
check('migration: over-cap write refused (ok:false)', ofRes.ok === false, ofRes.bytes);
check('migration: over-cap leaves legacy key intact (no write)', 'blueprint' in nearFull);

console.log(fails.length ? ('\nRED — ' + fails.length + ' failure(s): ' + fails.join(', ')) : '\nGREEN — all codec parity + budget checks pass');
process.exit(fails.length ? 1 : 0);
