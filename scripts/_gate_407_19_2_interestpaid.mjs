/* DEV-ONLY red-first FUNCTIONAL gate — #407 §19.2 interestPaidToDate engine calc (Mortgage Copy Bank §19.2).
   Reconciles the DI's theoretical life-of-loan interest (~$61k) with the lender's interest PAID TO DATE
   (~$31,684 for Daniel). Extracts the live engine chain and drives a Daniel-shaped loan (orig $135,675,
   balance $14,796.93, origination k months ago) through _moatInterestPaid:
     principalPaid   === 135675 − 14796.93 === 120878.07  (penny-match the lender)
     interestPaidToDate  cross-checks the amortization WALK against an independent closed form (P·k −
                     principalPaid) to the cent, lands within tolerance of the lender's $31,684, and is
                     clearly NOT the ~$61k life-of-loan figure (the whole reconciliation).
     sourced-or-blank (L47): missing origDate / rate, or balance > original -> null.
   --redfirst swaps the amortization walk for the life-of-loan figure (the ~$61k mistake §19.2 fixes) ->
   interestPaidToDate jumps to ~$61k and the lender-match + distinct-from-life asserts fail (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const s = readFileSync('studio.html', 'utf8');

const extract = (name) => {
  const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    \\}\\n'));
  if (!m) throw new Error('cannot extract ' + name);
  return m[0];
};
const NAMES = ['payoffMonths', 'calculateTotalPmt', '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', '_moatInterestPaid'];
let bodies = NAMES.map(extract).join('\n');

if (RED) {
  // Reproduce the pre-§19.2 mistake: report the theoretical life-of-loan interest as "paid to date".
  bodies = bodies.replace(
    /        var b = orig, interestPaid = 0;[\s\S]*?interestPaid = Math\.max\(0, interestPaid\);/,
    () => '        var _lolRed = lifeOfLoan(acc); var interestPaid = _lolRed ? _lolRed.intLife : 0;'
  );
}

const eng = new Function(bodies + '\n return { ip: _moatInterestPaid, lol: lifeOfLoan };')();

// Daniel-shaped fixture. origDate set k=106 months before *now* so paymentsElapsed is stable across runs.
const monthsAgoISO = (n) => {
  const d = new Date(); d.setMonth(d.getMonth() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const addMonthsISO = (iso, n) => {
  const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const origDate = monthsAgoISO(106);
const acc = { origAmount: '135675', value: '14796.93', intRate: '4.5',
              origDate, maturityDate: addMonthsISO(origDate, 240), minPmt: '1439.58', addPmt: '0' };

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const res = eng.ip(acc);
need('_moatInterestPaid returns a value', res);
if (res) {
  const orig = 135675, bal = 14796.93, k = res.paymentsElapsed;
  need(`paymentsElapsed resolved from origDate (k=${k})`, k === 106);

  need(`principalPaid === 120878.07 (penny-match lender)`, Math.abs(res.principalPaid - 120878.07) < 0.005);

  // Independent closed-form cross-check of the amortization walk.
  const r = 4.5 / 100 / 12, g = Math.pow(1 + r, k);
  const P = r * (orig * g - bal) / (g - 1);
  const expectedIpd = P * k - (orig - bal);
  need(`interestPaidToDate walk matches closed form to the cent (walk ${res.interestPaidToDate.toFixed(2)} vs ${expectedIpd.toFixed(2)})`,
    Math.abs(res.interestPaidToDate - expectedIpd) < 0.05);

  need(`interestPaidToDate lands on the lender's ~$31,684 (got ${res.interestPaidToDate.toFixed(2)})`,
    Math.abs(res.interestPaidToDate - 31684.35) < 150);

  need(`interestPaidToDate is NOT the ~$61k life-of-loan (life ${Math.round(res.lifetimeInterestLife)}, paid ${Math.round(res.interestPaidToDate)})`,
    res.lifetimeInterestLife > 55000 && (res.lifetimeInterestLife - res.interestPaidToDate) > 20000);

  // interestAvoidedVsSchedule = lifetimeInterestLife − interestPaidToDate (a SAVINGS figure, not "remaining").
  need(`interestAvoidedVsSchedule = life − paid (got ${Math.round(res.interestAvoidedVsSchedule)})`,
    Math.abs(res.interestAvoidedVsSchedule - (res.lifetimeInterestLife - res.interestPaidToDate)) < 0.05
    && res.interestAvoidedVsSchedule > 0);
  // interestRemainingTrue is the HONEST small remaining, NOT the avoided figure — the two must not be conflated.
  need(`interestRemainingTrue is the small honest remaining, distinct from avoided`,
    res.interestRemainingTrue !== null && res.interestRemainingTrue < res.interestAvoidedVsSchedule);
}

// SOURCED-OR-BLANK (L47)
need('blank when origDate missing', eng.ip({ ...acc, origDate: '' }) === null);
need('blank when rate missing', eng.ip({ ...acc, intRate: '' }) === null);
need('blank when balance > original', eng.ip({ ...acc, value: '200000' }) === null);

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the life-of-loan mistake.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§19.2 (life-of-loan-as-paid) code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
