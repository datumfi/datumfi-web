'use strict';
/* buildRequirements parity gate (Step-3 Part B Step-2). Proves
 * DatumShape.S2Copy.buildRequirements (relocated populateZoneC) is byte-identical in OUTPUT
 * (headLabel + html + acceptFromState) to the frozen pre-relocation baseline
 * scripts/_buildrequirements_baseline.fixture.js, across the full routing sweep.
 * Run: node scripts/_buildrequirements_parity.js  (exit 0 = PASS)
 */
const vm = require('vm'), fs = require('fs');
const sb = { console: { log: console.log, assert: function () {}, error: function () {} },
             Math, JSON, Object, Array, Date, String, Number, parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
vm.runInContext(fs.readFileSync('scripts/datum-shape-copy.js', 'utf8'), sb, { filename: 'datum-shape-copy.js' });
const DS = sb.DatumShape;
const MOD = DS.S2Copy.buildRequirements;
const baseline = require('./_buildrequirements_baseline.fixture.js')(DS);

let fails = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function scen(o) {
  const r = { c: 1.015, b: 1.035, u: 1.055 };
  if (o.par === 'optimistic') { r.c = 1.020; r.b = 1.040; r.u = 1.065; }
  if (o.par === 'stress')     { r.c = 1.005; r.b = 1.015; r.u = 1.035; }
  const ytg = Math.max(0, o.retire - o.age);
  return { currentAge: o.age, activationAge: o.retire, yearsToGrow: ytg, planThroughAge: o.plan || 93,
           portfolioVol: o.port, annualContrib: o.contrib, targetSpend: o.datum || 100,
           conservativeRate: r.c, baselineRate: r.b, upsideRate: r.u, isNominal: !!o.nom, taxMult: 1 - (o.tax / 100), inflRate: 0.03 };
}

// base designs (incl Y=0 for Block D) + a fixed ghostBaseline (Discover snapshot)
const ghost = scen({ age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 100, tax: 20 });
const designs = [
  scen({ age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 100, tax: 20 }),
  scen({ age: 40, retire: 40, plan: 93, port: 0.75, contrib: 25000, datum: 100, tax: 20 }),   // Y=0 -> Block D
  scen({ age: 30, retire: 60, plan: 95, port: 0.20, contrib: 5000,  datum: 60,  tax: 25, par: 'stress' }),
  scen({ age: 50, retire: 62, plan: 90, port: 2.50, contrib: 60000, datum: 180, tax: 30, nom: true }),
  scen({ age: 45, retire: 70, plan: 100, port: 1.10, contrib: 40000, datum: 130, tax: 15, par: 'optimistic' })
];
// override combos [ceilDelta, floorDelta, datumDelta, portDelta] (k/yr, port in M)
const combos = [
  [0, 0, 0, 0],                       // none
  [0, 0, 0, 0.5],                     // none + SP starting-point
  [0, 0, 40, 0], [0, 0, -55, 0], [0, 0, 120, 0], [0, 0, -200, 0],   // E up/down/extreme
  [50, 0, 0, 0], [-60, 0, 0, 0], [140, 0, 0, 0], [-300, 0, 0, 0],   // A
  [0, 45, 0, 0], [0, -55, 0, 0], [0, 100, 0, 0],                    // B
  [60, 40, 0, 0], [-55, -35, 0, 0], [90, 50, 0, 0],                 // C
  [-220, 180, 0, 0], [320, -260, 0, 0],                            // C hardStops
  [50, 0, 30, 0], [0, 45, -25, 0], [70, 45, 35, 0],                 // shape + datum combos
  [50, 0, 0, 0.5], [60, 40, 0, 0.6]                                 // SP + shape
];
const marketVals = ['average', 'optimistic', 'stress'];

let pairs = 0; const blocks = {};
designs.forEach((design, di) => {
  const pts = DS.computeAt(design, Math.max(1, design.yearsToGrow));
  combos.forEach((c) => {
    [true, false].forEach((dirty) => {
      const mkt = marketVals[(di + c[0]) % marketVals.length];
      const overrides = { ceilDelta: c[0], floorDelta: c[1], datumDelta: c[2], portDelta: c[3], isDirty: dirty };
      const ctx = { designScenario: design, currentScenario: design, ghostBaseline: ghost, marketParadigm: mkt };
      let o, m;
      try { o = baseline(pts, overrides, ctx); } catch (e) { fails++; console.log('BASELINE THREW d' + di, JSON.stringify(c), e.message); return; }
      try { m = MOD(pts, overrides, ctx); } catch (e) { fails++; console.log('MOD THREW d' + di, JSON.stringify(c), e.message); return; }
      pairs++;
      if (!eq(o, m)) {
        fails++;
        console.log('MISMATCH d' + di + ' ' + JSON.stringify(c) + ' dirty=' + dirty);
        if (o.headLabel !== m.headLabel) console.log('  head:', JSON.stringify(o.headLabel), '!=', JSON.stringify(m.headLabel));
        if (o.acceptFromState !== m.acceptFromState) console.log('  accept:', o.acceptFromState, '!=', m.acceptFromState);
        if (o.html !== m.html) { for (let i = 0; i < Math.max((o.html || '').length, (m.html || '').length); i++) { if ((o.html || '')[i] !== (m.html || '')[i]) { console.log('  html diverges @' + i + ': base=' + JSON.stringify((o.html || '').slice(i, i + 40)) + ' mod=' + JSON.stringify((m.html || '').slice(i, i + 40))); break; } } }
      }
      // tally block (parse from solveInverse for visibility)
      try { const r = DS.solveInverse(c[0], c[1], c[2], pts, design); const k = r.block + (r.hardStop ? ':' + r.hardStop.type : ''); blocks[k] = (blocks[k] || 0) + 1; } catch (e) {}
    });
  });
});
console.log('pairs:', pairs, '| mismatches:', fails);
console.log('routing blocks exercised:', Object.keys(blocks).sort().join('  '));
console.log('VERDICT:', fails === 0 ? 'PASS' : 'FAIL');
process.exit(fails === 0 ? 0 : 1);
