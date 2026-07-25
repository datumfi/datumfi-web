/* DEV-ONLY red-first gate — #407 §19.11 GLACIAL: the ONE all-surfaces guard. Option A's whole point.
   Drives a SINGLE degenerate loan (payment barely above interest → payoff centuries out) through EVERY render
   surface and asserts NONE print a century/absurd figure (#380 — the rendered output, not the source):
     · Mortgage DI (_moatDI)            · the "Expected Payoff Date" field (calculatePayoff/_debtPayoffDisplay)
     · the amortization-modal schedule  · HELOC intelligence beats (_helocIntelBeats)
     · the Yard engine (_yardIntelligence: Rule B / Rule H)
   The §19.10/§22.10 🟠 "generations to clear" line is the ONE surface allowed to speak.
   --redfirst lifts the upstream glacial guard (months > 9e99 → payoffMonths never returns GLACIAL) so every
   surface formats the giant month-count into a century again — the gate must then bite on EVERY surface. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
function ex(s, n) { const st = s.indexOf('function ' + n + '('); if (st < 0) throw new Error('missing ' + n); let d = 0, b = false; for (let j = s.indexOf('{', st); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); } } }
function at(s, marker) { const st = s.indexOf(marker); let d = 0, b = false; for (let j = s.indexOf('{', st); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); } } }
const mut = body => RED ? body.replace('months > _SANE_PAYOFF_HORIZON_MONTHS', 'months > 9e99') : body;
// any absurd figure: a year >= 2200, a bare 4-5 digit run >= 3000, "NNN years"/"NNN months" with 3+ digits
const century = s => /\b2[2-9]\d\d\b/.test(s) || /\b[3-9]\d{3}\b/.test(s) || /\b\d{3,}\s*(years|months)\b/.test(s);

const R = { retireYear: 2035, retireDate: new Date(2035, 2, 1), currentAge: 52 };
const gbtM = () => ({ id: 'mortgage_x', title: 'Mortgage' });
const glMort = { id: 'gm', baseId: 'mortgage_a', origAmount: 200000, value: 150000, intRate: 0.01, minPmt: 25, addPmt: 20, interestPaidToDate: 31000, nextPmtDate: '2026-08-01', maturityDate: '2600-01-01' };
const glHeloc = { id: 'gh', baseId: 'heloc_a', value: 60000, intRate: 8, helocPhase: 'Repayment', minPmt: 401, addPmt: 0, maturityDate: '2600-01-01', nextPmtDate: '2026-08-01' };

const checks = [];
const need = (l, c) => checks.push([l, !!c]);

// ── Surface 1: Mortgage DI + the "Expected Payoff Date" field ──
{
  const names = ['calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', '_moatNegAm', '_retireInfo', '_targetPayment', '_payoffYearOf', '_moatSanePayoff', '_moatRateMoves', '_debtDonutSVG', '_moatDebtPieHTML', '_debtPayoffDisplay', '_moatDI'];
  const deps = { acceleratedDelta: () => null, hasEscrow: () => false, calculateEscrowMonthly: () => 0, _moatPmiUnder20: () => false, _moatLiveMktRate: () => null, getBaseType: gbtM, state: { accounts: [] }, _retireOverride: R };
  const api = new Function(...Object.keys(deps), mut(names.map(n => ex(src, n)).join('\n')) + '\nreturn { _moatDI, calculatePayoff, _debtPayoffDisplay };')(...Object.values(deps));
  const di = api._moatDI(glMort).replace(/<[^>]+>/g, '');
  need('Mortgage DI: no century figure', !century(di));
  need('Mortgage DI: the 🟠 "generations to clear" line IS present', di.includes('would take generations to clear'));
  need('Payoff field: "Not within a lifetime" (no century)', api._debtPayoffDisplay(glMort) === 'Not within a lifetime');
}
// ── Surface 2: the amortization-modal schedule ──
{
  const names = ['calculateTotalPmt', 'payoffMonths', '_debtDonutSVG', '_moatDebtPieHTML'].map(n => ex(src, n)).join('\n');
  const amort = at(src, 'window.openAmortizationModal = function');
  let cap = '';
  const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { cap = v; }, get innerHTML() { return cap; } });
  const doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
  const win = {};
  new Function('window', 'document', 'state', 'getBaseType', mut(names) + '\n' + amort)(win, doc, { accounts: [glMort] }, gbtM);
  win.openAmortizationModal('gm');
  need('Amort modal: no century figure', !century(cap.replace(/<[^>]+>/g, '')));
  need('Amort modal: honest glacial note (not "Add a balance")', cap.includes('runs for generations') && !cap.includes('Add a balance, rate, and payment'));
}
// ── Surface 3: HELOC intelligence beats + payoff field ──
{
  const names = ['_num', '_groundsLinkedDebt', '_helocLimit', '_helocHeadroom', '_helocOverLimit', '_helocUtilPct', 'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_payoffVsMaturity', '_helocDrawEndShock', '_helocInterestOnlyDraw', '_retireInfo', '_targetPayment', '_payoffYearOf', '_debtPayoffDisplay', '_helocIntelBeats'];
  const gbtH = (b) => (String(b).indexOf('heloc') === 0 ? { id: 'heloc_x', taxCode: 'debt', title: 'HELOC' } : { id: 'property_x', title: 'Real Estate' });
  const deps = { getBaseType: gbtH, acceleratedDelta: () => null, _livePrime: () => null, _fmtAsOf: () => '', _retireOverride: R, _helocAgeOverride: null, state: { accounts: [glHeloc] } };
  const api = new Function(...Object.keys(deps), mut(names.map(n => ex(src, n)).join('\n')) + '\nreturn { _helocIntelBeats, _debtPayoffDisplay };')(...Object.values(deps));
  const beats = api._helocIntelBeats(glHeloc).join(' ');
  need('HELOC beats: no century figure', !century(beats));
  need('HELOC §22.10: the 🟠 "generations" line IS present', beats.includes('would take generations to clear'));
  need('HELOC payoff field: no century', !century(api._debtPayoffDisplay(glHeloc)));
}
// ── Surface 4: the Yard engine (Rule B suppressed, no "273 years") ──
{
  const names = ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardRealMonthly', '_yardNetEquity', '_yardHouseholdIncome', '_yardYearsToRetire', 'calculateTotalPmt', 'payoffMonths', '_retireInfo', '_targetPayment', '_payoffYearOf', '_yardIntelligence'];
  const gbtY = (b) => { const s = String(b); return s.indexOf('heloc') === 0 ? { id: 'heloc_x', taxCode: 'debt', title: 'HELOC' } : s.indexOf('mortgage') === 0 ? { id: 'mortgage_x', taxCode: 'debt', title: 'Mortgage' } : { id: 'property_x', taxCode: 'realEstate', title: 'Real Estate' }; };
  const doc = { getElementById: (id) => id === 'pri-dob' ? { value: '01/01/1974' } : id === 'target-ret' ? { value: '03 / 2035' } : { value: '', checked: false } };
  const acct = [{ id: 'p', baseId: 'property_a', value: 200000 }, { ...glMort, id: 'm', linkedAssetId: 'p' }];
  const fn = new Function('getBaseType', 'document', 'window', 'state', '_retireOverride', 'calcCarryTotal', mut(names.map(n => ex(src, n)).join('\n')) + '\nreturn _yardIntelligence;')(gbtY, doc, { parseAgeFromDob: () => 52 }, { accounts: acct }, R, () => 6000);
  const yard = fn('p').replace(/<[^>]+>/g, '');
  need('Yard engine: no century figure (Rule B "273 years" suppressed)', !century(yard));
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) { if (allGreen) { console.error('❌ RED-FIRST FAILED — a century leaked with the glacial guard lifted but nothing bit.'); process.exit(1); } console.log('✅ RED-FIRST OK — lifting the guard makes the century figures return and the gate bites.'); process.exit(0); }
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — every surface stays sane on a glacial loan.');
