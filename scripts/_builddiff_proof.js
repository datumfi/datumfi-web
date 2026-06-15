// Step-2 buildDiff PROOF harness (report-first, pre-commit).
//  (a) buildDiff(have,have) -> zero tension AND geometry byte-matches buildPath(have)
//      with the exact Studio front-face mount opts (proves no drift from mount()).
//  (b) buildDiff(have,want) -> paired paths differ, tension SIGNED (tension/relief),
//      gap exposes raw-$k delta (solver) + clamped ratio (bars), copy via getPinnedCaseObj.
'use strict';
const vm = require('vm'), fs = require('fs');
const sb = { console, Math, JSON, Object, Array, Date, String, Number,
             parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
vm.runInContext(fs.readFileSync('scripts/datum-shape-copy.js', 'utf8'), sb, { filename: 'datum-shape-copy.js' });
const DS = sb.DatumShape;

// Studio front-face mount opts (studio.html:4758-4759) — padPct defaults to 0.10.
const FRONT = { xStart: 120, xEnd: 650, steps: 50, yPxTop: 50, yPxBot: 450 };

function scn(o) {
  const r = { c: 1.015, b: 1.035, u: 1.055 };
  if (o.par === 'optimistic') { r.c = 1.020; r.b = 1.040; r.u = 1.065; }
  if (o.par === 'stress')     { r.c = 1.005; r.b = 1.015; r.u = 1.035; }
  const ytg = Math.max(1, o.retire - o.age);
  return { currentAge: o.age, activationAge: o.retire, yearsToGrow: ytg, planThroughAge: o.plan || 93,
           portfolioVol: o.port, annualContrib: o.contrib, targetSpend: o.datum,
           conservativeRate: r.c, baselineRate: r.b, upsideRate: r.u,
           isNominal: !!o.nom, taxMult: 1 - (o.tax / 100), inflRate: 0.03 };
}

const have = scn({ age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 100, par: 'average', tax: 20 });
let pass = true;
const fail = (m) => { pass = false; console.log('  ✗ ' + m); };
const ok   = (m) => console.log('  ✓ ' + m);

// ===== PROOF (a): zero-diff byte-match =====
console.log('\n===== PROOF (a): buildDiff(have,have) == buildPath(have) =====');
const ref = DS.buildPath(have, FRONT);                 // current live front-face geometry
const d0  = DS.buildDiff(have, have, FRONT);
['dCeil', 'dFloor', 'dDatum', 'dCone'].forEach((k) => {
  if (d0.have[k] === ref[k]) ok('have.' + k + ' byte-identical to buildPath(have).' + k);
  else fail('have.' + k + ' DRIFT vs buildPath(have)');
  if (d0.want[k] === ref[k]) ok('want.' + k + ' byte-identical (want mirrors have)');
  else fail('want.' + k + ' DRIFT');
});
if (d0.sharedY.yLo === ref.yLo && d0.sharedY.yHi === ref.yHi) ok('sharedY == buildPath self-domain (' + ref.yLo.toFixed(3) + '..' + ref.yHi.toFixed(3) + ')');
else fail('sharedY != buildPath self-domain');
const tZero = d0.tension.every((t) => t.ratio === 0);
if (tZero) ok('tension all zero'); else fail('tension NOT zero: ' + JSON.stringify(d0.tension));
const gZero = d0.gap.ceil.delta === 0 && d0.gap.floor.delta === 0 && d0.gap.datum.delta === 0;
if (gZero) ok('gap deltas all zero'); else fail('gap deltas NOT zero');
// ceilPts/floorPts arrays identical too
if (JSON.stringify(d0.have.ceilPts) === JSON.stringify(ref.ceilPts) &&
    JSON.stringify(d0.have.floorPts) === JSON.stringify(ref.floorPts)) ok('coord arrays (ceilPts/floorPts) byte-identical');
else fail('coord arrays DRIFT');

// ===== PROOF (b): paired diff, signed tension, copy =====
console.log('\n===== PROOF (b): buildDiff(have,want) =====');
function show(label, wantO) {
  const want = scn(wantO);
  const d = DS.buildDiff(have, want, FRONT);
  const sgn = (r) => r > 0 ? '+TENSION' : r < 0 ? '-RELIEF' : '0';
  console.log('\n  [' + label + ']');
  console.log('   paths differ from have:', d.want.dCeil !== d.have.dCeil || d.want.dFloor !== d.have.dFloor || d.want.dDatum !== d.have.dDatum);
  console.log('   sharedY: ' + d.sharedY.yLo.toFixed(2) + '..' + d.sharedY.yHi.toFixed(2) + ' (both faces on ONE axis)');
  d.tension.forEach((t) => {
    const g = d.gap[t.channel];
    console.log('   ' + t.channel.padEnd(5) + ' delta=' + g.delta.toFixed(1).padStart(8) + ' $k (solver)  ratio=' + t.ratio.toFixed(3).padStart(7) + ' ' + sgn(t.ratio) + ' (bars)');
  });
  console.log('   datumAboveCeil:', d.gap.datumAboveCeil);
  console.log('   have.state=' + d.have.stateObj.name + '  want.state=' + d.want.stateObj.name);
  console.log('   copy=' + (d.copy === null ? 'null (multi-lever heuristic)'
    : (d.copy.isSingleLever ? 'single lever=' + d.copy.lever + ' dir=' + d.copy.direction + ' pct=' + (d.copy.primaryPct != null ? d.copy.primaryPct.toFixed(2) : '1.00') : 'obj')));
  return d;
}
const bUp   = show('datum UP (raise spend 100->160k)', { age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 160, par: 'average', tax: 20 });
const bDown = show('datum DOWN (lower spend 100->60k)', { age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 60, par: 'average', tax: 20 });
const bEarly = show('retire EARLIER (65->58)',  { age: 40, retire: 58, plan: 93, port: 0.75, contrib: 25000, datum: 100, par: 'average', tax: 20 });
const bLate  = show('retire LATER (65->72)',    { age: 40, retire: 72, plan: 93, port: 0.75, contrib: 25000, datum: 100, par: 'average', tax: 20 });
show('multi: retire 65->59 + plan 93->101', { age: 40, retire: 59, plan: 101, port: 0.75, contrib: 25000, datum: 100, par: 'average', tax: 20 });

// directed assertions: plan-health pressure bars + the founder INDEPENDENCE invariant
console.log('\n  --- assertions ---');
const tch = (d, ch) => d.tension.find((t) => t.channel === ch).ratio;
// structural bars (ceil/floor) = Datum-independent capacity movement, sign-fixed to plan health
if (tch(bEarly, 'ceil') > 0 && tch(bEarly, 'floor') > 0) ok('retire EARLIER => ceiling+floor TENSION (weaker structure)'); else fail('earlier-retire structural sign wrong');
if (tch(bLate, 'ceil') < 0 && tch(bLate, 'floor') < 0) ok('retire LATER => ceiling+floor RELIEF (stronger structure)'); else fail('later-retire structural sign wrong');
// datum bar = target-spend movement only
if (tch(bUp, 'datum') > 0) ok('datum-up => datum TENSION'); else fail('datum-up bar sign wrong');
if (tch(bDown, 'datum') < 0) ok('datum-down => datum RELIEF'); else fail('datum-down bar sign wrong');
// INDEPENDENCE: structural lever leaves datum bar at 0, datum lever leaves ceil/floor at 0
if (Math.abs(tch(bEarly, 'datum')) < 1e-9) ok('structural lever leaves DATUM bar = 0 (independence)'); else fail('datum bar moved on structural-only lever');
if (Math.abs(tch(bUp, 'ceil')) < 1e-9 && Math.abs(tch(bUp, 'floor')) < 1e-9) ok('datum lever leaves CEIL/FLOOR bars = 0 (independence)'); else fail('structural bars moved on datum-only lever');
// gap (solver feed) still exposes raw $k delta + clamped ratio, and 109-copy still reached
if (Math.abs(bUp.gap.datum.delta) > 1 && Math.abs(bUp.gap.datum.ratio) <= 1) ok('gap exposes raw $k delta (>1) AND clamped ratio (<=1) — both forms present'); else fail('raw/ratio duality missing');
if (bUp.copy && bUp.copy.isSingleLever && bUp.copy.lever === 'datum') ok('copy = single-lever datum case (109-engine reached)'); else fail('copy datum-lever not selected: ' + JSON.stringify(bUp.copy && bUp.copy.lever));

console.log('\n===== VERDICT: ' + (pass ? 'PASS' : 'FAIL') + ' =====');
process.exit(pass ? 0 : 1);
