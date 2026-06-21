'use strict';
/* _multilever_parity.js — byte-parity gate for the #1/#5 multi-lever S2 copy extraction.
 *
 * Proves DatumShape.S2Copy.buildMultiLever (live module) is byte-identical to the FROZEN
 * original Sketch builder (scripts/_multilever_baseline.fixture.js = verbatim slice of
 * sketch.html L5878-6211 pre-extraction) across a battery of multi-lever (have,want) combos.
 *
 * This is the §17 verbatim guarantee: Sketch calls the module fn, so module==original means
 * Sketch's S2 multi-lever OUTPUT is unchanged (inert), and Studio (also calling it) matches.
 *
 * RED-FIRST: before the extraction lands, DatumShape.S2Copy.buildMultiLever is undefined ->
 * the shared builder does not exist (the root cause) -> gate FAILS.
 *
 * Run: node scripts/_multilever_parity.js   (exit 0 = PASS)
 */
const vm = require('vm'), fs = require('fs');
const sb = { console, Math, JSON, Object, Array, Date, String, Number, parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
vm.runInContext(fs.readFileSync('scripts/datum-shape-copy.js', 'utf8'), sb, { filename: 'datum-shape-copy.js' });
const DS = sb.DatumShape;
const MOD = DS.S2Copy && DS.S2Copy.buildMultiLever;
const ORIG = require('./_multilever_baseline.fixture.js').buildMultiLeverORIG;

if (typeof MOD !== 'function') {
  console.log('FAIL: DatumShape.S2Copy.buildMultiLever is not a function (extraction not landed) — typeof=' + typeof MOD);
  process.exit(1);
}

// ---- scenario builders (mirror _s2_copy_parity) ----
function scen(o) {
  const r = { c: 1.015, b: 1.035, u: 1.055 };
  if (o.par === 'Optimistic') { r.c = 1.020; r.b = 1.040; r.u = 1.065; }
  if (o.par === 'Stress')     { r.c = 1.005; r.b = 1.015; r.u = 1.035; }
  const ytg = Math.max(0, o.retire - o.age);
  return { currentAge: o.age, activationAge: o.retire, yearsToGrow: ytg, planThroughAge: o.plan,
           portfolioVol: o.port, annualContrib: o.contrib, targetSpend: o.datum,
           conservativeRate: r.c, baselineRate: r.b, upsideRate: r.u,
           isNominal: !!o.nom, taxMult: 1 - (o.tax / 100), inflRate: 0.03 };
}
const parWord = (p) => p === 'optimistic' ? 'Optimistic' : p === 'stress' ? 'Stress' : 'Historical';
const parRadio = (par) => par === 'Optimistic' ? 'optimistic' : par === 'Stress' ? 'stress' : 'average';

// Build the buildMultiLever ctx for a (have, want) pair exactly as the apps do.
function ctxOf(have, want) {
  const gb = scen(have);
  const w  = scen(want);
  const yrs = Math.max(0, want.retire - want.age);
  const gbYrs = Math.max(0, have.retire - have.age);
  const gbEnd = DS.computeAt(gb, gbYrs);
  const ptsEnd = DS.computeAt(w, yrs);
  const s = Object.assign({}, w, { targetSpend: Math.round(want.datum) });
  const ds = { age: want.age, retire: want.retire, planThroughAge: want.plan, port: want.port, datum: want.datum, contrib: want.contrib };
  const gbPinnedState = {
    retire: gb.activationAge, age: gb.currentAge, port: gb.portfolioVol, contrib: gb.annualContrib,
    datum: gb.targetSpend, planThroughAge: gb.planThroughAge || 93,
    pinnedParadigm: parWord(parRadio(have.par)), pinnedInflStr: gb.isNominal ? 'Nominal' : 'Real',
    pinnedTax: Math.round((1.0 - (gb.taxMult || 1.0)) * 100), stateObj: DS.buildShapeState(gbEnd)
  };
  return { retire: want.retire, age: want.age, yrs: yrs, paradigm: parRadio(want.par),
           gb: gb, ds: ds, s: s, gbEnd: gbEnd, ptsEnd: ptsEnd, gbPinnedState: gbPinnedState };
}

const base = { age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 100, par: 'Historical', nom: false, tax: 20 };
const W = (o) => Object.assign({}, base, o);
// Multi-lever wants (2..6 levers, builders/reducers/mixed, datum moves, market, plan).
const wants = [
  W({ retire: 70, port: 2.0 }),                                  // 2 up
  W({ retire: 58, contrib: 5000 }),                              // 2 down
  W({ retire: 70, datum: 70 }),                                  // build + datum down
  W({ datum: 160, retire: 58 }),                                 // datum up + retire down (mixed)
  W({ retire: 70, port: 2.0, contrib: 60000 }),                 // 3 up
  W({ retire: 58, port: 0.4, contrib: 5000 }),                  // 3 down
  W({ retire: 70, port: 2.0, contrib: 5000 }),                  // 3 mixed (2 up 1 down)
  W({ age: 50, retire: 72, port: 2.0, contrib: 60000 }),       // 4 up
  W({ age: 30, retire: 58, port: 0.4, contrib: 5000 }),        // 4 down
  W({ age: 50, retire: 72, port: 0.4, contrib: 5000 }),        // 4 mixed
  W({ age: 50, retire: 75, port: 2.0, contrib: 60000, plan: 100 }), // 5 up
  W({ age: 32, retire: 58, port: 0.3, contrib: 0, plan: 85 }),  // 5 down
  W({ age: 50, retire: 75, port: 2.0, contrib: 60000, plan: 100, datum: 200 }), // 6 incl datum
  W({ port: 2.0, par: 'Optimistic' }),                          // lever + market up
  W({ port: 0.4, par: 'Stress' }),                              // lever + market down
  W({ retire: 70, datum: 70, par: 'Optimistic' }),             // 3 incl market + datum
  W({ plan: 100, contrib: 60000 }),                             // plan + contrib
  W({ plan: 80, port: 0.4 }),                                   // plan shorter + port down
  W({ datum: 70, port: 2.0 }),                                  // datum down + port up
  W({ datum: 220, contrib: 60000 }),                            // datum up + contrib up
];
const haves = [
  base,
  W({ age: 50, retire: 62, datum: 180 }),
  W({ par: 'Stress', tax: 30 }),
  W({ port: 2.5, datum: 60 }),
];

let pairs = 0, fails = 0; const sample = [];
haves.forEach((have) => {
  wants.forEach((want) => {
    const ctx = ctxOf(have, want);
    let ro, rm;
    try { ro = ORIG(ctx); } catch (e) { ro = 'ORIG_THREW:' + e.message; }
    try { rm = MOD(ctx);  } catch (e) { rm = 'MOD_THREW:' + e.message; }
    pairs++;
    if (JSON.stringify(ro) !== JSON.stringify(rm)) {
      fails++;
      if (sample.length < 5) sample.push({ have: have, want: want, orig: ro, mod: rm });
    }
  });
});

console.log('multi-lever (have,want) pairs run: %d  | byte mismatches: %d', pairs, fails);
if (sample.length) console.log('first mismatches:\n' + JSON.stringify(sample, null, 2).slice(0, 2000));
// Also confirm every pair actually produced non-empty copy (real multi-lever output, not blanks).
let nonEmpty = 0;
haves.forEach((have) => wants.forEach((want) => { const r = MOD(ctxOf(have, want)); if (r && r.phys && r.phys.length > 10) nonEmpty++; }));
console.log('pairs with non-empty phys copy: %d / %d', nonEmpty, pairs);

console.log('\n===== VERDICT =====');
console.log('buildMultiLever byte-identical to frozen Sketch original: %s', (fails === 0) ? 'PASS' : 'FAIL');
process.exit(fails === 0 && nonEmpty === pairs ? 0 : 1);
