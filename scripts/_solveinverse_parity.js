'use strict';
/* solveInverse parity gate (Step-3 precursor relocation gate).
 *
 * Proves DatumShape.solveInverse (relocated into scripts/datum-shape.js) is byte-identical
 * in BOTH source and behavior to the frozen pre-relocation snapshot in
 * scripts/_solveinverse_baseline.fixture.js. Pinned to the fixture (not a git ref) so it
 * stays a permanent gate. Run from repo root: node scripts/_solveinverse_parity.js (exit 0 = PASS)
 *
 * Layer 1: source identity  -> MOD.toString() === ORIG.toString()
 * Layer 2: behavioral sweep -> identical output across every routing block (D/none/E/C/A/B
 *          + hardStops) and a broad scenario x drag grid.
 */
const vm = require('vm'), fs = require('fs');

// shared sandbox with the REAL DatumShape engine; console.assert no-op (F86 RT debug noise,
// identical for ORIG and MOD, never affects return values).
const sb = { console: { log: console.log, assert: function () {}, error: function () {} },
             Math, JSON, Object, Array, Date, String, Number, parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
const DS = sb.DatumShape;
const MOD = DS.solveInverse;
const ORIG = require('./_solveinverse_baseline.fixture.js')(DS).solveInverse;

let fails = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ===== LAYER 1: source byte-identity =====
console.log('===== LAYER 1: source identity =====');
const srcMatch = (typeof MOD === 'function') && (typeof ORIG === 'function') && (MOD.toString() === ORIG.toString());
console.log('MOD.solveInverse.toString() === baseline.toString(): %s', srcMatch ? 'PASS' : 'FAIL');
if (!srcMatch) fails++;

// ===== LAYER 2: behavioral sweep =====
console.log('\n===== LAYER 2: behavioral sweep =====');
function scn(o) {
  const r = { c: 1.015, b: 1.035, u: 1.055 };
  if (o.par === 'optimistic') { r.c = 1.020; r.b = 1.040; r.u = 1.065; }
  if (o.par === 'stress')     { r.c = 1.005; r.b = 1.015; r.u = 1.035; }
  const ytg = Math.max(0, o.retire - o.age);
  return { currentAge: o.age, activationAge: o.retire, yearsToGrow: ytg, planThroughAge: o.plan || 93,
           portfolioVol: o.port, annualContrib: o.contrib, targetSpend: o.datum || 100,
           conservativeRate: r.c, baselineRate: r.b, upsideRate: r.u,
           isNominal: !!o.nom, taxMult: 1 - (o.tax / 100), inflRate: 0.03 };
}
const baseScns = [
  { age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, tax: 20 },
  { age: 40, retire: 40, plan: 93, port: 0.75, contrib: 25000, tax: 20 },   // Y=0 -> Block D
  { age: 30, retire: 60, plan: 95, port: 0.20, contrib: 5000,  tax: 25, par: 'stress' },
  { age: 50, retire: 62, plan: 90, port: 2.50, contrib: 60000, tax: 30, nom: true },
  { age: 45, retire: 70, plan: 100, port: 1.10, contrib: 40000, tax: 15, par: 'optimistic' }
];
// dc/df/dd drag combos (k/yr) — exercise D, none, E, C, A, B + hardStop branches
const drags = [
  [0, 0, 0], [0, 0, 30], [0, 0, -45],            // none, E (up/down)
  [40, 0, 0], [-40, 0, 0], [120, 0, 0], [-300, 0, 0],   // A (+/- incl negative-portfolio)
  [0, 25, 0], [0, -30, 0], [0, 90, 0], [0, -200, 0],    // B
  [40, 25, 0], [-40, -25, 0], [80, 40, 10],             // C
  [-200, 150, 0], [300, -250, 0],                       // C floor_above_ceil / extremes
  [5, 5, 5], [60, -20, 25], [-15, 35, -10]              // mixed C + datum
];
let pairs = 0; const blocks = {};
baseScns.forEach((so) => {
  const s = scn(so);
  const pts = DS.computeAt(s, s.yearsToGrow);
  drags.forEach((d) => {
    const ro = ORIG(d[0], d[1], d[2], pts, s);
    const rm = MOD(d[0], d[1], d[2], pts, s);
    pairs++;
    if (!eq(ro, rm)) { fails++; console.log('FAIL', JSON.stringify(so), 'drag', JSON.stringify(d)); }
    if (ro && ro.block) { const k = ro.block + (ro.hardStop ? ':' + ro.hardStop.type : ''); blocks[k] = (blocks[k] || 0) + 1; }
  });
});
console.log('behavioral pairs run: %d  | mismatches: %d', pairs, fails);
console.log('routing blocks exercised: %s', Object.keys(blocks).sort().join('  '));

console.log('\n===== VERDICT: %s =====', fails === 0 ? 'PASS' : 'FAIL');
process.exit(fails === 0 ? 0 : 1);
