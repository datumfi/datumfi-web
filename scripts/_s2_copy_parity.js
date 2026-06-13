'use strict';
/* S2 copy-engine parity harness (Phase A regression gate).
 *
 * Baseline = scripts/_s2_copy_baseline.fixture.js (frozen verbatim snapshot of the
 * 109-case engine as of commit 25d4c68). Diffs the LIVE module
 * (scripts/datum-shape-copy.js) against it. Pinned to a checked-in fixture, NOT a
 * git commit ref, so it stays a permanent gate after the extraction lands.
 *
 * Layer 1: enumerate all 109 case ids (94 _PC + 15 _PTA_PC), assert byte-identical.
 * Layer 2: behavioral -- drive getPinnedCaseObj over a broad input sweep; assert
 *          live output is byte-identical to the baseline for every input.
 *
 * Run from repo root:  node scripts/_s2_copy_parity.js   (exit 0 = PASS)
 */
const vm = require('vm'), fs = require('fs');

// ---- shared sandbox with the REAL DatumShape math engine ----
const sb = { console, Math, JSON, Object, Array, Date, String, Number,
             parseInt, parseFloat, isNaN, RegExp, Boolean, Error };
sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('scripts/datum-shape.js', 'utf8'), sb, { filename: 'datum-shape.js' });
vm.runInContext(fs.readFileSync('scripts/datum-shape-copy.js', 'utf8'), sb, { filename: 'datum-shape-copy.js' });
const MOD = sb.DatumShape.S2Copy;

// ---- frozen baseline engine, eval'd in the same sandbox ----
const fx = fs.readFileSync('scripts/_s2_copy_baseline.fixture.js', 'utf8');
const cw = fx.slice(fx.indexOf('    function getMathPoint(offset, yearsToGrow, s) {'),
                    fx.indexOf('\n    }', fx.indexOf('        return DatumShape.buildShapeState(pts);')) + '\n    }'.length);
const eb = fx.slice(fx.indexOf('    const _PC = {'), fx.indexOf('\n// === END S2 COPY BASELINE ==='));
const ORIG = vm.runInContext('(function(){\n' + cw + '\n' + eb +
  '\nreturn {getPinnedCaseObj:getPinnedCaseObj,_PC:_PC,_PR:_PR};\n})()', sb, { filename: 'baseline-engine' });

let fails = 0;
const eqStr = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- engine-block byte-gate: live module's engine text must equal the fixture's ----
const mod = fs.readFileSync('scripts/datum-shape-copy.js', 'utf8');
const ebMod = mod.slice(mod.indexOf('    const _PC = {'), mod.indexOf('\n\n  DatumShape.S2Copy = {'));
const ebGate = (ebMod === eb);
if (!ebGate) fails++;
console.log('engine-block byte-identical (module vs fixture): %s', ebGate ? 'PASS' : 'FAIL');

// ================= LAYER 1: 109-case byte-identity =================
console.log('\n===== LAYER 1: 109-case byte-identity (enumerated) =====');
const pcIds = Object.keys(ORIG._PC);
console.log('_PC case count: baseline=%d mod=%d', pcIds.length, Object.keys(MOD._PC).length);
let l1 = 0;
pcIds.forEach(id => {
  const o = ORIG._PC[id], m = MOD._PC[id];
  const ok = m && eqStr(o.physics, m.physics) && eqStr(o.action, m.action) &&
             eqStr(o.studio, m.studio) && o.paradox === m.paradox;
  if (!ok) { fails++; console.log('FAIL _PC %s', id); } else { l1++; }
});
console.log('_PC: %d/%d byte-identical', l1, pcIds.length);

function ptaBlock(src) {
  const s = src.indexOf('const _PTA_PC = {');
  const e = src.indexOf('\n            };', s) + '\n            };'.length;
  return src.slice(s, e);
}
const ptaBase = ptaBlock(eb), ptaMod = ptaBlock(ebMod);
const ptaIdent = ptaBase === ptaMod;
if (!ptaIdent) fails++;
const ptaIds = (ptaBase.match(/'[A-Z0-9.\-]+'\s*:\s*\{/g) || []).map(s => s.replace(/['{:\s]/g, ''));
console.log('_PTA_PC text byte-identical: %s', ptaIdent ? 'PASS' : 'FAIL');
console.log('_PTA_PC case count: %d', ptaIds.length);
console.log('_PTA_PC ids: ' + ptaIds.join(' '));
console.log('TOTAL ENUMERATED CASES: %d (94 _PC + 15 _PTA_PC = 109 expected)', pcIds.length + ptaIds.length);

// ================= LAYER 2: behavioral parity sweep =================
console.log('\n===== LAYER 2: behavioral parity sweep =====');
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
function pinnedOf(o) {
  return { retire: o.retire, age: o.age, port: o.port, contrib: o.contrib, datum: o.datum,
           planThroughAge: o.plan, pinnedParadigm: o.par, pinnedInflStr: o.nom ? 'Nominal' : 'Real',
           pinnedTax: o.tax, stateObj: sb.DatumShape.buildShapeState(
             sb.DatumShape.computeAt(scen(o), Math.max(0, o.retire - o.age))) };
}
const base = { age: 40, retire: 65, plan: 93, port: 0.75, contrib: 25000, datum: 100, par: 'Historical', nom: false, tax: 20 };
const deltas = [
  {}, { datum: 70 }, { datum: 160 }, { datum: 220 },
  { retire: 70 }, { retire: 58 }, { age: 50 }, { age: 32 },
  { port: 2.0 }, { port: 0.3 }, { contrib: 70000 }, { contrib: 0 },
  { plan: 100 }, { plan: 85 }, { retire: 70, port: 2.0 }, { retire: 58, contrib: 60000 },
  { datum: 160, retire: 70 }, { datum: 70, port: 2.0 }, { plan: 100, datum: 70 }, { age: 50, retire: 72 }
];
const baselines = [
  base,
  Object.assign({}, base, { datum: 160, port: 0.4 }),
  Object.assign({}, base, { datum: 60, port: 2.5 }),
  Object.assign({}, base, { age: 50, retire: 62, datum: 180 }),
  Object.assign({}, base, { par: 'Stress', tax: 30 })
];
let pairs = 0; const seen = {};
baselines.forEach(cur => {
  const curS = scen(cur);
  const pts = sb.DatumShape.computeAt(curS, curS.yearsToGrow);
  deltas.forEach(d => {
    const pin = pinnedOf(Object.assign({}, cur, d));
    const ro = ORIG.getPinnedCaseObj(pin, pts, curS);
    const rm = MOD.getPinnedCaseObj(pin, pts, curS);
    pairs++;
    if (!eqStr(ro, rm)) { fails++; console.log('FAIL behavioral', JSON.stringify(d)); }
    if (ro && ro.caseId) seen[ro.caseId] = (seen[ro.caseId] || 0) + 1;
  });
});
const seenIds = Object.keys(seen).sort();
console.log('behavioral pairs run: %d  | mismatches: %d', pairs, fails);
console.log('distinct caseIds exercised (%d): %s', seenIds.length, seenIds.join(' '));

// ================= VERDICT =================
console.log('\n===== VERDICT =====');
const ok109 = ebGate && (pcIds.length === 94) && (ptaIds.length === 15) && ptaIdent && (l1 === 94);
console.log('109/109 byte-identical: %s', (ok109 && fails === 0) ? 'PASS' : 'CHECK');
console.log('cases that did NOT port cleanly: %d', fails);
process.exit(fails === 0 && ok109 ? 0 : 1);
