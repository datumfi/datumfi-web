/* DEV-ONLY red-first gate — #407 §19.7 COMMIT 1: extract _debtDonutSVG out of _moatDebtPieHTML.
   This is a PURE REFACTOR — it must change NO rendered output. The gate proves it the #380 way: it EXECUTES the
   refactored _moatDebtPieHTML (drawer + composer pulled from studio.html, getBaseType stubbed) against a frozen
   fixture battery captured from the PRE-refactor function (scripts/_gate_fixtures_moat_pie.json) and asserts every
   rendered string is BYTE-IDENTICAL. Fixtures cover: multi-slice, an escrow slice, plain, single-slice, paid-off,
   invalid (early ''), and HELOC (''). --redfirst perturbs one drawer byte (stroke-width 5.4->5.5) to prove the
   gate actually catches drift; it must then FAIL the identity check. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const src = studioSource();
const baseline = JSON.parse(readFileSync('scripts/_gate_fixtures_moat_pie.json', 'utf8'));

function extractFn(s, name) {
  const start = s.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('fn not found: ' + name);
  let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
  throw new Error('unbalanced braces: ' + name);
}

let body = ['_debtDonutSVG', '_moatDebtPieHTML'].map(n => extractFn(src, n)).join('\n');
if (RED) body = body.replace('stroke-width="5.4"', 'stroke-width="5.5"');   // deliberate 1-byte drift

const fixtures = {
  F1_dan: { baseId: 'mortgage-a', origAmount: 135675, value: 14796.93, interestPaidToDate: 31684.35 },
  F2_escrow: { baseId: 'mortgage-a', origAmount: 200000, value: 150000, escrowYtd: 3000 },
  F3_plain: { baseId: 'mortgage-a', origAmount: 200000, value: 150000 },
  F4_single: { baseId: 'mortgage-a', origAmount: 100000, value: 100000 },
  F5_paidoff: { baseId: 'mortgage-a', origAmount: 100000, value: 0 },
  F6_invalid: { baseId: 'mortgage-a', origAmount: 100, value: 200 },
  F7_heloc: { baseId: 'heloc-a', origAmount: 50000, value: 20000 },
};

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

need('_debtDonutSVG exists (extraction happened)', src.includes('function _debtDonutSVG('));
need('_moatDebtPieHTML delegates to the shared drawer', /_moatDebtPieHTML[\s\S]*?return _debtDonutSVG\(/.test(src));

for (const [k, acc] of Object.entries(fixtures)) {
  const gbt = () => ({ title: String(acc.baseId).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' });
  const fn = new Function('getBaseType', body + '\nreturn _moatDebtPieHTML;')(gbt);
  const got = fn(acc);
  need(`${k}: byte-identical to baseline (${baseline[k].length}B)`, got === baseline[k]);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green despite a 1-byte drawer drift.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the rendered pie drifts by a single byte.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN — extraction is byte-identical across all fixtures.');
