/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.2b sourced "Interest Paid to Date" input.
   The honest replacement for the retired computed number: the user enters their lender's interest-paid-to-
   date, stored decimal-safe (enforceAmt, keeps cents), and it lights the pie's gold slice. Mortgage-only
   (HELOC has no such reconciliation). Asserts the wiring + the full chain: statement string -> enforceAmt
   store -> pie gold slice at the EXACT figure.
     - updateAccField routes interestPaidToDate through enforceAmt (decimal-safe), not the raw-string branch
     - the field is wired (label + updateAccField('…','interestPaidToDate',…)) and MORTGAGE-gated
     - enforceAmt('$31,684.35') === '31684.35' (cents kept), and the pie then shows 'Interest Paid: $31,684'
   --redfirst removes interestPaidToDate from the enforceAmt list -> the raw '$31,684.35' is stored, the pie's
   parseFloat yields NaN->0 and the gold slice vanishes (gate bites). */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  s = s.split(" || field === 'interestPaidToDate'").join('');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// STORE-ROUTE: interestPaidToDate goes through the enforceAmt (decimal-safe) branch of updateAccField.
const routed = /field === 'origAmount'[\s\S]*?field === 'interestPaidToDate'[\s\S]*?window\.enforceAmt\(value\)/.test(s);
need('updateAccField routes interestPaidToDate through enforceAmt (decimal-safe)', routed);

// FIELD: wired + mortgage-gated + labelled.
need('field wired to updateAccField(interestPaidToDate)', /updateAccField\('\$\{id\}', 'interestPaidToDate', this\.value\)/.test(s));
need('field is MORTGAGE-gated (not shown for HELOC)',
  /String\(base\.id\)\.indexOf\('mortgage'\) === 0 \? `<div class="field-row">[\s\S]*?interestPaidToDate/.test(s));
need('label present: Interest Paid to Date', s.includes('Interest Paid to Date'));

// FUNCTIONAL chain: enforceAmt store -> pie gold slice.
const enforceAmt = new Function('return (' + s.match(/window\.enforceAmt = (function\(str\) \{[\s\S]*?\n    \});/)[1] + ');')();
need("enforceAmt('$31,684.35') === '31684.35' (cents kept)", enforceAmt('$31,684.35') === '31684.35');

const drawerSrc = s.match(/    function _debtDonutSVG\([\s\S]*?\n    \}\n/)[0];   // §19.7 — pie now delegates to the shared drawer
const pieSrc = drawerSrc + s.match(/    function _moatDebtPieHTML\(acc\)[\s\S]*?\n    \}\n/)[0];
const getBaseType = (baseId) => ({ title: String(baseId).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' });
const pie = new Function('getBaseType', pieSrc + '\n return _moatDebtPieHTML;')(getBaseType);

// mirror updateAccField's branch: routed -> enforceAmt(raw); else raw string stored as-is.
const stored = routed ? enforceAmt('$31,684.35') : '$31,684.35';
const html = pie({ baseId: 'mortgage_primary', origAmount: '135675', value: '14796.93', interestPaidToDate: stored });
need('end-to-end: sourced figure lights the gold slice at exactly $31,684', /Interest Paid: \$31,684/.test(html) && html.includes('var(--gold)'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with interestPaidToDate off the decimal-safe route.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the field is not stored decimal-safe.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
