/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.3 premium debt donut (Mortgage Copy Bank §19.3).
   Surfaces §19.2 interestPaidToDate as the gold 'Interest Paid' slice. Extracts the live engine + pie and
   renders a Daniel-shaped loan (orig $135,675, balance $14,796.93, origination 106mo ago, escrow $0):
     slices Principal Balance (--danger) · Principal Paid (--teal-mid) · Interest Paid (--gold ≈ $31,684)
     NO Escrow slice (escrow $0 → hidden, L47) · center '89%' + 'PAID DOWN' · legend $ + %
     HELOC excluded (credit-line origAmount) · sourced-or-blank (no origDate/rate) -> ''
   --redfirst strips the zero-slice filter -> a $0 Escrow slice renders (L47 violation), gate bites. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const s = readFileSync('studio.html', 'utf8');

const extract = (name) => {
  const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    \\}\\n'));
  if (!m) throw new Error('cannot extract ' + name);
  return m[0];
};
const NAMES = ['payoffMonths', 'calculateTotalPmt', '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', '_moatInterestPaid', '_moatDebtPieHTML'];
let bodies = NAMES.map(extract).join('\n');

if (RED) {
  bodies = bodies.replace('.filter(function (s) { return s.val > 0; })', () => '');
}

const getBaseType = (baseId) => ({ title: String(baseId).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' });
const eng = new Function('getBaseType', bodies + '\n return { pie: _moatDebtPieHTML };')(getBaseType);

const monthsAgoISO = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const addMonthsISO = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const origDate = monthsAgoISO(106);
const acc = { baseId: 'mortgage_primary', origAmount: '135675', value: '14796.93', intRate: '4.5', origDate, maturityDate: addMonthsISO(origDate, 240), minPmt: '1439.58', addPmt: '0' };

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const html = eng.pie(acc);
need('pie renders (non-empty SVG)', html && html.indexOf('<svg') !== -1);
if (html) {
  need('slice: Principal Balance', html.includes('Principal Balance'));
  need('slice: Principal Paid', html.includes('Principal Paid'));
  need('slice: Interest Paid surfaces §19.2 paid-to-date (~$31,7xx)', /Interest Paid: \$31,7\d\d/.test(html));
  need('L47: NO Escrow slice when escrow = $0', !html.includes('Escrow'));
  need('center label = 89% paid down', html.includes('>89%<') && html.includes('PAID DOWN'));
  need('colors: gold interest / teal principal / red balance',
    html.includes('var(--gold)') && html.includes('var(--teal-mid)') && html.includes('var(--danger)'));
  need('legend shows $ + %', /·\s*\d+%/.test(html));
}

// escrow slice DOES appear when escrowYtd > 0 (proves the filter is value-driven, not hard-hidden)
const htmlEsc = eng.pie({ ...acc, escrowYtd: '4200' });
need('Escrow slice appears when escrowYtd > 0', htmlEsc.includes('Escrow'));

// exclusions / sourced-or-blank
need('HELOC excluded (credit-line origAmount)', eng.pie({ ...acc, baseId: 'heloc_primary' }) === '');
need('blank when origDate missing (L47)', eng.pie({ ...acc, origDate: '' }) === '');

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the zero-slice filter stripped.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when a $0 Escrow slice renders.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
