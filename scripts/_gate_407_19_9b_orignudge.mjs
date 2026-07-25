/* DEV-ONLY red-first gate — #407 §19.9b: blank-Original-Amount nudge where the pie would be.
   RE-POINTED 2026-07-25 (§3b, Captain ruling #430): the pie and this nudge moved OUT of the amortization
   modal into _moatPieBlockHTML, rendered by _payoffIntelHTML on the modal body above the schedule button.
   This gate used to slice window.openAmortizationModal; that is now the wrong surface, and leaving it there
   would have made it hunt a string the overlay no longer emits — a guard that cannot go red.

   Executes the real _payoffIntelHTML against the new home (#380 — assert the rendered element) and proves:
   a mortgage with a real balance but no Original Amount shows the plain-coach nudge in the pie gap (no silent
   blank); the moment Original Amount is filled, the pie SVG renders and the nudge is gone.
   --redfirst disables the nudge branch -> the blank-Original case falls back to a silent gap -> the check fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

function extractFn(s, name) {
  const start = s.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
}

// REAL engine functions — a stubbed payoffMonths/_num turns every figure into a marker and disarms the test.
let body = ['_num', 'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween',
            'lifeOfLoan', 'lifetimeInterest', 'acceleratedDelta', '_sumLbl', '_debtDonutSVG',
            '_moatDebtPieHTML', '_moatPieBlockHTML', '_payoffIntelHTML'].map(n => extractFn(src, n)).join('\n');

// Anchored on the nudge's own DATA CONDITION inside the composer that now owns it — not on the parse
// expression it used to be written with. §19.9c hoisted _orig/_bal/_isMortgage into locals, which moved the
// old literal out from under this mutation: it THREW instead of biting. A red-first that throws is a failure,
// so anchor on the condition's meaning (blank original + a real balance), which survives that kind of tidy-up.
const ANCHOR = '_orig <= 0 && _bal > 0';
if (!body.includes(ANCHOR)) throw new Error('red-first anchor missing — the §19.9b nudge guard moved');
if (RED) body = body.replace(ANCHOR, 'false && _orig <= 0 && _bal > 0');

const deps = { getBaseType: () => ({ id: 'mortgage_x', title: 'Mortgage' }), hasEscrow: () => false, calculateEscrowMonthly: () => 0 };
const intel = new Function(...Object.keys(deps), body + '\nreturn _payoffIntelHTML;')(...Object.values(deps));

const NUDGE = 'the payoff pie needs it to split principal from interest';   // apostrophe-free slice (source escapes ' as \')
const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const blank = intel('x', { id: 'x', baseId: 'mortgage_a', value: 150000, minPmt: 500, addPmt: 50 });   // balance, no Original Amount
need('blank Original: nudge fills the pie gap (no silent blank)', blank.includes(NUDGE));
need('blank Original: nudge wears class="moat-pie-nudge"', blank.includes('class="moat-pie-nudge"'));
need('blank Original: no pie SVG (pie genuinely cannot draw)', !blank.includes('<svg'));

const filled = intel('x', { id: 'x', baseId: 'mortgage_a', origAmount: 200000, value: 150000, interestPaidToDate: 31000, intRate: 5.99, minPmt: 3000, addPmt: 50 });
need('filled Original: pie SVG renders', filled.includes('<svg'));
need('filled Original: nudge is gone', !filled.includes(NUDGE));
// §3b — the nudge lives on the modal BODY now, so it must sit above the schedule button like the pie does.
need('nudge renders above the schedule button (new home)',
  blank.indexOf(NUDGE) < blank.indexOf('VIEW AMORTIZATION SCHEDULE'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the nudge disabled.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the blank-Original gap goes silent.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
