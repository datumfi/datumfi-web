// _tension_pressure_parity — locks the plan-health tension bars to ONE shared derivation.
// The tension convention lives at two computation sites that MUST stay identical:
//   (1) Sketch inline (sketch.html ~L6536) and (2) Studio buildDiff (datum-shape.js),
// both routed through DatumShape.buildTension(haveEnd, wantEnd).
// This gate proves, across a scenario sweep:
//   (a) buildDiff.tension[] === DatumShape.buildTension(haveEnd,wantEnd)  (engine has no drift)
//   (b) sign semantics: structural levers move ceil/floor (weaker=tension, stronger=relief);
//       datum lever moves the datum bar only (heavier=tension, lighter=relief)
//   (c) the founder INDEPENDENCE invariant: structural-only move leaves datum bar at 0,
//       datum-only move leaves ceil/floor bars at 0, rest (want==have) = all bars 0
//   (d) STATIC lock: sketch.html routes its bars through DatumShape.buildTension (can't
//       silently re-hand-roll the formula and drift from the engine).
'use strict';
const vm = require('vm'), fs = require('fs');
const sb = { console, Math, JSON, Object, Array, Date, String, Number,
             parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
const DS = sb.DatumShape;

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
const END = (s) => DS.computeAt(s, Math.max(1, s.activationAge - s.currentAge));
let pass = true;
const fail = (m) => { pass = false; console.log('  ✗ ' + m); };
const ok   = (m) => console.log('  ✓ ' + m);
const NZ = (x) => Math.abs(x) > 1e-9;

const HAVE = { age: 43, retire: 52, plan: 93, port: 1.40, contrib: 90000, datum: 100, par: 'average', tax: 20 };
// sweep: rest, structural-only (age/retire/plan/port/contrib), datum-only, and mixed
const WANTS = [
  ['rest (want==have)',          {}],
  ['retire earlier',             { retire: 47 }],
  ['retire later',               { retire: 60 }],
  ['contrib up',                 { contrib: 160000 }],
  ['contrib down',               { contrib: 30000 }],
  ['balance down',               { port: 0.90 }],
  ['PTA up',                     { plan: 101 }],
  ['current age younger',        { age: 40 }],
  ['datum up',                   { datum: 150 }],
  ['datum down',                 { datum: 70 }],
  ['structural+datum mixed',     { retire: 48, datum: 140 }]
];

console.log('===== (a) buildDiff.tension === DatumShape.buildTension (no engine drift) =====');
let drift = 0;
WANTS.forEach(([label, mut]) => {
  const have = scn(HAVE), want = scn(Object.assign({}, HAVE, mut));
  const d = DS.buildDiff(have, want);
  const t = DS.buildTension(END(have), END(want));
  const byCh = (ch) => d.tension.find((x) => x.channel === ch).ratio;
  ['ceil', 'floor', 'datum'].forEach((ch) => { if (byCh(ch) !== t[ch]) { drift++; fail('[' + label + '] ' + ch + ' buildDiff(' + byCh(ch) + ') != buildTension(' + t[ch] + ')'); } });
});
if (!drift) ok('all ' + WANTS.length + ' scenarios: buildDiff.tension byte-matches buildTension');

console.log('\n===== (b)+(c) sign semantics + INDEPENDENCE invariant =====');
const T = (mut) => DS.buildTension(END(scn(HAVE)), END(scn(Object.assign({}, HAVE, mut))));
let r = T({});
if (!NZ(r.ceil) && !NZ(r.floor) && !NZ(r.datum)) ok('rest: all three bars = 0'); else fail('rest not all zero: ' + JSON.stringify(r));
[['retire earlier', { retire: 47 }], ['contrib down', { contrib: 30000 }], ['balance down', { port: 0.9 }], ['PTA up', { plan: 101 }]].forEach(([lbl, mut]) => {
  r = T(mut);
  if (r.ceil > 0 && r.floor > 0) ok(lbl + ' => ceil+floor TENSION'); else fail(lbl + ' structural tension wrong: ' + JSON.stringify(r));
  if (!NZ(r.datum)) ok(lbl + ' => datum bar = 0 (independence)'); else fail(lbl + ' moved datum bar: ' + r.datum);
});
[['retire later', { retire: 60 }], ['contrib up', { contrib: 160000 }]].forEach(([lbl, mut]) => {
  r = T(mut);
  if (r.ceil < 0 && r.floor < 0) ok(lbl + ' => ceil+floor RELIEF'); else fail(lbl + ' structural relief wrong: ' + JSON.stringify(r));
  if (!NZ(r.datum)) ok(lbl + ' => datum bar = 0 (independence)'); else fail(lbl + ' moved datum bar: ' + r.datum);
});
r = T({ datum: 150 });
if (r.datum > 0 && !NZ(r.ceil) && !NZ(r.floor)) ok('datum up => datum TENSION, ceil/floor = 0 (independence)'); else fail('datum-up independence wrong: ' + JSON.stringify(r));
r = T({ datum: 70 });
if (r.datum < 0 && !NZ(r.ceil) && !NZ(r.floor)) ok('datum down => datum RELIEF, ceil/floor = 0 (independence)'); else fail('datum-down independence wrong: ' + JSON.stringify(r));
r = T({ retire: 48, datum: 140 });
if (r.ceil > 0 && r.floor > 0 && r.datum > 0) ok('structural+datum mixed => all three bars lit'); else fail('mixed not all-lit: ' + JSON.stringify(r));

console.log('\n===== (d) STATIC lock: sketch.html routes bars through DatumShape.buildTension =====');
const sk = fs.readFileSync('sketch.html', 'utf8');
if (/DatumShape\.buildTension\s*\(/.test(sk)) ok('sketch.html calls DatumShape.buildTension'); else fail('sketch.html does NOT route through DatumShape.buildTension');
if (!/_ceilTension\s*=\s*Math\.min/.test(sk) && !/_floorTension\s*=\s*Math\.min/.test(sk)) ok('sketch.html no longer hand-rolls _ceil/_floorTension'); else fail('sketch.html still hand-rolls tension formula (drift risk)');

console.log('\n===== (e) BALANCED tolerance band — tied to display rounding (_xPct2===0), identical on all 3 bars =====');
// Extract each updateTensionVisuals body and EXECUTE it against a DOM stub across a battery of
// ratio triples. A bar is BALANCED iff it would otherwise round to "0%" (|ratio| < 0.005); the
// instant it rounds to >=1% it must go live TENSION/RELIEF. Same threshold on ceil/floor/datum.
function fnBody(src) {
  const j = src.indexOf('function updateTensionVisuals');
  let k = src.indexOf('{', j), depth = 0, end = -1, inStr = null;
  for (let p = k; p < src.length; p++) {
    const c = src[p], prev = src[p - 1];
    if (inStr) { if (c === inStr && prev !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++; else if (c === '}') { if (--depth === 0) { end = p; break; } }
  }
  return src.slice(j, end + 1);
}
function fakeDoc() {
  const reg = {};
  const mk = () => ({ style: {}, textContent: '', _kids: {}, setAttribute() {}, getAttribute() { return null; },
    querySelector(sel) { return this._kids[sel] || (this._kids[sel] = mk()); } });
  return { getElementById(id) { return reg[id] || (reg[id] = mk()); } };
}
function renderAt(src, c, f, d) {
  const doc = fakeDoc();
  const fn = new Function('document', fnBody(src) + '\nreturn updateTensionVisuals;')(doc);
  fn(c, f, d, d > c);
  const read = (pctId, lblId) => ({ pct: doc.getElementById(pctId).textContent,
    lbl: doc.getElementById(lblId).querySelector('.d2-tbar-label-txt').textContent });
  return { ceil: read('d2-tension-ceil-pct', 'd2-tension-ceil-lbl'),
    floor: read('d2-tension-floor-pct', 'd2-tension-floor-lbl'),
    datum: read('d2-tension-datum-pct', 'd2-tension-datum-lbl') };
}
function expectBar(label, who, bar, mode) {
  let g = true;
  if (mode === 'BAL') {
    if (bar.lbl !== 'BALANCED') { g = false; fail('[' + label + '] ' + who + ' lbl="' + bar.lbl + '" (want BALANCED)'); }
    if (bar.pct !== '—')        { g = false; fail('[' + label + '] ' + who + ' pct="' + bar.pct + '" (want —)'); }
  } else {
    if (!/TENSION|RELIEF/.test(bar.lbl)) { g = false; fail('[' + label + '] ' + who + ' lbl="' + bar.lbl + '" (want live TENSION/RELIEF)'); }
    if (!/^\d+%$/.test(bar.pct))         { g = false; fail('[' + label + '] ' + who + ' pct="' + bar.pct + '" (want N%)'); }
    if (bar.lbl === 'BALANCED' || bar.pct === '—') { g = false; fail('[' + label + '] ' + who + ' stuck BALANCED but should be live'); }
  }
  return g;
}
// label, [ceil,floor,datum ratios], [ceilMode, floorMode, datumMode]
const CASES = [
  ['rest 0/0/0',                                  [0, 0, 0],          ['BAL', 'BAL', 'BAL']],
  ['sub-0.5% all (0.003) -> rounds to 0%',        [0.003, 0.003, 0.003], ['BAL', 'BAL', 'BAL']],
  ['RAGGED: ceil/floor 0.003, datum EXACT 0 (the regression -> all BALANCED together)', [0.003, 0.003, 0], ['BAL', 'BAL', 'BAL']],
  ['live 2% all (rounds to 2%)',                  [0.02, 0.02, 0.02], ['LIVE', 'LIVE', 'LIVE']],
  ['ceil tension / floor RELIEF / datum +50%',    [0.02, -0.02, 0.5], ['LIVE', 'LIVE', 'LIVE']],
  ['datum leaves band only (0/0/0.5) — stretch alive', [0, 0, 0.5],   ['BAL', 'BAL', 'LIVE']]
];
const SK = fs.readFileSync('sketch.html', 'utf8');
const ST = fs.readFileSync('scripts/studio-wantface.js', 'utf8');
[['sketch.html', SK], ['studio-wantface.js', ST]].forEach(([file, src]) => {
  let allGood = true;
  CASES.forEach(([label, [c, f, d], modes]) => {
    const r = renderAt(src, c, f, d);
    allGood = expectBar(file + ' :: ' + label, 'ceil',  r.ceil,  modes[0]) && allGood;
    allGood = expectBar(file + ' :: ' + label, 'floor', r.floor, modes[1]) && allGood;
    allGood = expectBar(file + ' :: ' + label, 'datum', r.datum, modes[2]) && allGood;
  });
  if (allGood) ok(file + ': all ' + CASES.length + ' band cases correct (rest · sub-band · ragged · live · mixed-sign · datum-only)');
});

console.log('\n===== (f) BYTE-EQUALITY LOCK: updateTensionVisuals identical across both surfaces =====');
const skB = fnBody(SK).replace(/\r/g, ''), stB = fnBody(ST).replace(/\r/g, '');
if (skB === stB) ok('byte-identical across sketch.html & studio-wantface.js (' + skB.length + ' bytes)');
else fail('DRIFTED: sketch ' + skB.length + ' vs studio ' + stB.length + ' bytes');

console.log('\n===== VERDICT: ' + (pass ? 'PASS' : 'FAIL') + ' =====');
process.exit(pass ? 0 : 1);
