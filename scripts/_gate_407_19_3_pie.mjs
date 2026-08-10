/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.3 debt donut, POST-hotfix (sourced Interest Paid).
   The Interest Paid slice is SOURCED off the lender statement (acc.interestPaidToDate, §19.2b) — never a
   computed number that can contradict the statement (the retired V1 showed $44,202 vs Daniel's real
   $31,684). Extracts the live pie and asserts:
     no interestPaidToDate  -> NO gold slice (principal split + 89% center still render, both exact)
     interestPaidToDate set -> gold 'Interest Paid' slice shows that exact sourced figure ($31,684)
     escrow $0 hidden; escrowYtd>0 shows; HELOC excluded; blank when origAmount/balance missing (L47).
   --redfirst restores a fabricated fallback ($44,202 when the field is blank) -> a gold slice renders with
   no sourced figure (the exact bug the hotfix kills) and the "no slice when blank" check fails. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const s = studioSource();

const drawerSrc = s.match(/    function _debtDonutSVG\([\s\S]*?\n    \}\n/)[0];   // §19.7 — pie now delegates to the shared drawer
let pieSrc = s.match(/    function _moatDebtPieHTML\(acc\)[\s\S]*?\n    \}\n/)[0];
if (RED) {
  pieSrc = pieSrc.replace('var interestPaid = parseFloat(acc.interestPaidToDate) || 0;',
                          () => 'var interestPaid = parseFloat(acc.interestPaidToDate) || 44202;');
}
const getBaseType = (baseId) => ({ title: String(baseId).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' });
const pie = new Function('getBaseType', drawerSrc + pieSrc + '\n return _moatDebtPieHTML;')(getBaseType);

const acc = { baseId: 'mortgage_primary', origAmount: '135675', value: '14796.93' };

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const blank = pie(acc);   // no interestPaidToDate field
need('pie renders from origAmount + balance alone', blank && blank.indexOf('<svg') !== -1);
need('Principal Balance slice present', blank.includes('Principal Balance'));
need('Principal Paid slice present', blank.includes('Principal Paid'));
need('center = 89% paid down', blank.includes('>89%<') && blank.includes('PAID DOWN'));
need('HOTFIX: NO Interest Paid slice when statement figure is blank', !blank.includes('Interest Paid'));
need('L47: no Escrow slice at $0', !blank.includes('Escrow'));

const sourced = pie({ ...acc, interestPaidToDate: '31684.35' });
need('sourced Interest Paid slice renders the exact statement figure ($31,684)',
  sourced.includes('Interest Paid') && /Interest Paid: \$31,684/.test(sourced) && sourced.includes('var(--gold)'));

const withEsc = pie({ ...acc, interestPaidToDate: '31684.35', escrowYtd: '4200' });
need('Escrow slice appears when escrowYtd > 0', withEsc.includes('Escrow'));

need('HELOC excluded', pie({ ...acc, baseId: 'heloc_primary' }) === '');
need('blank when origAmount missing (L47)', pie({ baseId: 'mortgage_primary', value: '14796.93' }) === '');
need('blank when balance > original (L47)', pie({ ...acc, value: '200000' }) === '');

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with a fabricated fallback.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when an unsourced interest number renders.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
