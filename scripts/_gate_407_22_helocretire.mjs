/* DEV-ONLY red-first gate — #407 §22 (interest-only-draw carry) + §22.10 (retire-before-you-do, HELOC leg).
   Executes the real _helocDrawInlineHTML (§22-A) and _helocIntelBeats (§22-B + §22.10) against fixtures and asserts
   on the RENDERED output (#380):
     interest-only draw   -> §22-A inline present · §22-B echo beat present · §22.10 SILENT (not amortizing)
     amortizing, late     -> §22.10 🟡 ("past the retirement year" + "would clear it by {retireYear}") · no §22-A/B
     amortizing, on-track -> §22.10 🟢 ("before both maturity and your retirement") · no §22-A/B / no 🟡
   No double-fire: §19.4-B income-floor beat is suppressed in the interest-only case (§22-B owns it).
   --redfirst forces _helocInterestOnlyDraw to null -> §22-A inline + §22-B echo vanish on the draw fixture -> fail. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const src = studioSource();

function extractFn(s, name) {
  const start = s.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('fn not found: ' + name);
  let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
}

const names = ['_num', '_groundsLinkedDebt', '_helocLimit', '_helocHeadroom', '_helocOverLimit', '_helocUtilPct',
               'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', '_payoffVsMaturity', '_helocDrawEndShock',
               '_helocInterestOnlyDraw', '_retireInfo', '_targetPayment', '_payoffYearOf', '_helocDrawInlineHTML',
               '_helocIntelBeats'];
let body = names.map(n => extractFn(src, n)).join('\n');
if (RED) body = body.replace('function _helocInterestOnlyDraw(acc) {', 'function _helocInterestOnlyDraw(acc) { return null;');

const deps = {
  getBaseType: () => ({ id: 'heloc_x', title: 'HELOC' }),
  acceleratedDelta: () => null, _livePrime: () => null, _fmtAsOf: () => '',
  _retireOverride: { retireYear: 2035, retireDate: new Date(2035, 2, 1), currentAge: 55 },
  _helocAgeOverride: null,
};
const mk = (acc) => new Function(...Object.keys(deps), 'state', body + '\nreturn { _helocDrawInlineHTML, _helocIntelBeats };')(...Object.values(deps), { accounts: [acc] });

const draw = { baseId: 'heloc_a', value: 60000, intRate: 7, helocPhase: 'Draw', drawPeriodEndDate: '2030-06-01', maturityDate: '2045-06-01', minPmt: 350, addPmt: 0 };
const late = { baseId: 'heloc_a', value: 60000, intRate: 7, helocPhase: 'Repayment', maturityDate: '2050-06-01', minPmt: 500, addPmt: 0, nextPmtDate: '2026-08-01' };
const ontrack = { baseId: 'heloc_a', value: 20000, intRate: 7, helocPhase: 'Repayment', maturityDate: '2050-06-01', minPmt: 800, addPmt: 0, nextPmtDate: '2026-08-01' };
const orange = { baseId: 'heloc_a', value: 60000, intRate: 8, helocPhase: 'Repayment', maturityDate: '2150-01-01', minPmt: 402, addPmt: 0, nextPmtDate: '2026-08-01' };   // barely amortizing, payoff > retire+30 but < a far maturity

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);
const S22B = 'it carries into retirement as a balance that still charges interest';
const S2210_G = 'before both maturity and your retirement';
const S2210_Y = 'past the retirement year you';

// interest-only draw
{
  const api = mk(draw);
  const inline = api._helocDrawInlineHTML(draw);
  const beats = api._helocIntelBeats(draw).join(' ');
  need('draw: §22-A inline present ("isn\'t going down")', inline.includes('heloc-draw-inline') && inline.includes("isn't going down"));
  need('draw: §22-B echo beat present', beats.includes(S22B));
  need('draw: §22.10 silent (not amortizing)', !beats.includes(S2210_G) && !beats.includes(S2210_Y));
  need('draw: §19.4-B income-floor beat suppressed (no double-fire)', !beats.includes('to the income your plan must cover for life'));
}
// amortizing, late (🟡)
{
  const api = mk(late);
  const beats = api._helocIntelBeats(late).join(' ');
  need('late: §22.10 🟡 present ("past the retirement year" + "clear it by 2035")', beats.includes(S2210_Y) && beats.includes('would clear it by 2035'));
  need('late: no §22-A inline', api._helocDrawInlineHTML(late) === '');
  need('late: no §22-B echo', !beats.includes(S22B));
}
// amortizing, on-track (🟢)
{
  const api = mk(ontrack);
  const beats = api._helocIntelBeats(ontrack).join(' ');
  need('on-track: §22.10 🟢 present ("before both maturity and your retirement")', beats.includes(S2210_G));
  need('on-track: not the 🟡 line', !beats.includes(S2210_Y));
}
// amortizing, absurd payoff (🟠 clamp)
{
  const beats = mk(orange)._helocIntelBeats(orange).join(' ');
  need('orange: §22.10 🟠 "generations to clear", no absurd year', beats.includes('would take generations to clear') && !beats.includes(S2210_Y));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the interest-only-draw detector disabled.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when §22-A/§22-B stop firing on the draw trap.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
