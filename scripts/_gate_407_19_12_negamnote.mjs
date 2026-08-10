/* DEV-ONLY red-first gate — #407 §19.12 NEGAM honest note + §3b pie relocation (Architect/Captain #430).

   §19.12 — the li !== null gate correctly withholds Interest Remaining / Remaining Mortgage Cost under
   negative amortization (the balance never falls, so there is no finite figure and printing one would
   fabricate — L47). But a bare blank reads as broken, so the vacated slot now carries an honest note.
   NEGAM ONLY: PAID / NOPMT / GLACIAL already have their own voices and must NOT double up.

   §3b — the position pie moved OUT of the amortization modal onto the modal body, directly above the
   VIEW AMORTIZATION SCHEDULE button. Asserted from both ends: present on the body, gone from the overlay.

   Executes the REAL _payoffIntelHTML and openAmortizationModal and asserts the RENDERED output (#380).
   --redfirst runs THREE mutations, each anchored on stable structure (a function name or a state literal):
     (a) note gate NEGAM -> a truthy constant : the note leaks into PAID/NOPMT/GLACIAL
     (b) note suppressed entirely             : NEGAM goes back to the bare blank that fooled the Captain
     (c) pie block returns ''                 : the relocated pie vanishes from the modal body
   Any mutation that leaves the suite green means that assertion cannot go red -> gate fails. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const src = studioSource();

function ex(s, n) {
  const st = s.indexOf('function ' + n + '(');
  if (st < 0) throw new Error('missing ' + n);
  let d = 0, b = false;
  for (let j = s.indexOf('{', st); j < s.length; j++) {
    if (s[j] === '{') { d++; b = true; }
    else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); }
  }
}
function exAt(s, marker) {
  const st = s.indexOf(marker);
  if (st < 0) throw new Error('missing ' + marker);
  let d = 0, b = false;
  for (let j = s.indexOf('{', st); j < s.length; j++) {
    if (s[j] === '{') { d++; b = true; }
    else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); }
  }
}

// REAL engine functions throughout — a stubbed payoffMonths or _num would make every figure a marker and
// silently disarm the very assertions under test.
const FNS = ['_num', 'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween',
             'lifeOfLoan', 'lifetimeInterest', 'acceleratedDelta', '_sumLbl', '_debtDonutSVG',
             '_moatDebtPieHTML', '_moatPieBlockHTML', '_payoffIntelHTML'];
const BASE = FNS.map(n => ex(src, n)).join('\n');
// (B) 2026-07-25 — the overlay is a `window.X = function` definition, which the closure walker now resolves
// too. Roots only: a new callee inside openAmortizationModal (§20.2 added _amortRow / _amortTableHTML) can no
// longer break this gate the way a hand-list did.
const AMORT = extractClosure(src, ['openAmortizationModal'], { exclude: ['getBaseType', 'state'] });

// ── red-first anchors: a state literal and two function signatures, none of them copy text ──
const A_NEGAM = "payoffMonths(acc).code === 'NEGAM'";
const A_NOTE  = 'class="moat-summary-note"';
const A_PIE   = 'function _moatPieBlockHTML(acc) {';
for (const [nm, a] of [['NEGAM state', A_NEGAM], ['note class', A_NOTE], ['pie composer', A_PIE]]) {
  if (!BASE.includes(a)) throw new Error('red-first anchor missing (' + nm + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_NEGAM, "(payoffMonths(acc).code || 'NEGAM') !== '\\u0000'"),   // any non-OK state leaks the note
  b: (b) => b.replace(A_NOTE, 'class="moat-summary-note-TYPO"'),                       // right words, wrong chrome
  c: (b) => b.replace(A_PIE, A_PIE + " return '';"),                                   // relocated pie vanishes
  d: (b) => b.replace(A_NEGAM, "payoffMonths(acc).code === '\\u0000'")                 // note never fires: back to the bare blank
};

const deps = () => ({
  getBaseType: () => ({ id: 'mortgage_joint', title: 'Mortgage' }),
  hasEscrow: () => false, calculateEscrowMonthly: () => 0
});

function build(body) {
  const d = deps();
  return new Function(...Object.keys(d), body + '\nreturn _payoffIntelHTML;')(...Object.values(d));
}
function buildAmort(body) {
  let captured = '';
  const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { captured = v; }, get innerHTML() { return captured; } });
  const doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
  const win = {};
  const d = { ...deps(), window: win, document: doc };
  return (acc) => {
    new Function(...Object.keys(d), 'state', body + '\n' + AMORT)(...Object.values(d), { accounts: [acc] });
    win.openAmortizationModal(acc.id);
    return captured;
  };
}

const txt = (h) => String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// VERBATIM against the copy of record, Mortgage Copy Bank C230 — typographic apostrophes (U+2019) included.
// Normalized #432: the live strings now match the bank character-for-character, so this constant must too.
const NOTE = "At this payment, the balance isn’t shrinking — so there’s no payoff figure to show yet. Nudge the payment above the monthly interest and these fill in.";

// One fully-sourced mortgage. $400k orig / $300k balance / 6% => interest is $1,500/mo, so the payment alone
// decides the state: 500 = NEGAM, 3000 = OK. Every other field is held constant.
const L = { id: 'x', baseId: 'mortgage_joint', origAmount: '400000', value: '300000', intRate: 6,
            origDate: '2019-01-01', maturityDate: '2049-01-01', nextPmtDate: '2026-08-01',
            interestPaidToDate: '31684.35', addPmt: 0 };
const F = {
  negam:   { ...L, minPmt: '500' },
  ok:      { ...L, minPmt: '3000' },
  nopmt:   { ...L, minPmt: '' },
  paid:    { ...L, minPmt: '3000', value: '0' },
  glacial: { ...L, minPmt: '1505' },                       // clears interest by $5 => payoff > 600mo
  norate:  { ...L, minPmt: '500', intRate: '' },           // sourced-or-blank: no rate at all
};

function run(intel, amort) {
  const R = {}; for (const k of Object.keys(F)) R[k] = txt(intel('x', F[k]));
  const c = []; const need = (l, v) => c.push([l, !!v]);

  // sanity: the fixtures really are in the states this gate claims (never assert on a mis-seeded fixture)
  const pm = new Function(BASE + '\nreturn payoffMonths;')();
  need('fixture sanity: NEGAM/OK/NOPMT/PAID/GLACIAL states as intended',
    pm(F.negam).code === 'NEGAM' && pm(F.ok).code === 'OK' && pm(F.nopmt).code === 'NOPMT' &&
    pm(F.paid).code === 'PAID' && pm(F.glacial).code === 'GLACIAL');

  // §19.12 — the note, and only where it belongs
  need('NEGAM → note renders verbatim', R.negam.includes(NOTE));
  // §19.4 doctrine — assert the RENDERED CLASS, not only the words. The class IS the note's visual identity;
  // without this, the right copy in the wrong (or a typo'd) chrome ships invisible and the gate stays green.
  need('NEGAM → note wears class="moat-summary-note"', intel('x', F.negam).includes('class="moat-summary-note"'));
  need('NEGAM → the two figures stay ABSENT (L47, nothing fabricated)',
    !R.negam.includes('Interest Remaining') && !R.negam.includes('Remaining Mortgage Cost'));
  need('NEGAM → position facts still survive (§19.9 Part A intact)',
    R.negam.includes('Life-of-Loan Interest') && R.negam.includes('Total Interest Paid'));
  need('OK → figures present AND note absent', R.ok.includes('Interest Remaining') &&
    R.ok.includes('Remaining Mortgage Cost') && !R.ok.includes(NOTE));
  need('NOPMT → note absent (payoff field owns that state)', !R.nopmt.includes(NOTE));
  need('PAID → note absent', !R.paid.includes(NOTE));
  need('GLACIAL → note absent (§19.10 🟠 beat owns that state)', !R.glacial.includes(NOTE));
  need('blank rate → note absent (sourced-or-blank)', !R.norate.includes(NOTE));
  need('voice: informs, never advises', !/\byou should\b|\byou must\b|\bwe recommend\b/i.test(R.negam));

  // §3b — relocation, asserted from BOTH ends
  const bodyOk = intel('x', F.ok), bodyNegam = intel('x', F.negam);
  need('§3b pie renders on the modal BODY (OK state)', bodyOk.includes('<svg') && bodyOk.includes('WHERE THIS LOAN STANDS'));
  need('§3b pie renders on the body under NEGAM too (position ≠ schedule)',
    bodyNegam.includes('<svg') && bodyNegam.includes('WHERE THIS LOAN STANDS'));
  need('§3b pie sits ABOVE the schedule button',
    // §20.2 renamed the single button into COMPLETE + REMAINING; the pie must sit above the FIRST of them.
    bodyOk.indexOf('WHERE THIS LOAN STANDS') < bodyOk.indexOf('VIEW COMPLETE SCHEDULE'));
  need('§3b pie is GONE from the amortization overlay', !amort(F.ok).includes('WHERE THIS LOAN STANDS'));
  need('§3b amort overlay still renders its schedule table', amort(F.ok).includes('Principal') && amort(F.ok).includes('Interest'));
  // §19.9b nudge travelled WITH the pie — it must not have been left behind in the overlay
  const NUDGE = 'the payoff pie needs it to split principal from interest';
  const noOrig = { ...L, minPmt: '3000', origAmount: '' };
  need('§19.9b nudge moved too: renders on the body when Original Amount is blank', intel('x', noOrig).includes(NUDGE));
  need('§19.9b nudge no longer renders in the overlay', !amort(noOrig).includes(NUDGE));
  need('sourced-or-blank: no pie chrome at all when neither figure is sourced',
    !intel('x', { id: 'x', baseId: 'mortgage_joint', intRate: 6, minPmt: '500' }).includes('<svg'));
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['a', 'b', 'c', 'd']) {
    const body = MUT[k](BASE);
    if (body === BASE) { console.error('❌ RED-FIRST FAILED — mutation ' + k + ' did not apply'); process.exit(1); }
    const c = run(build(body), buildAmort(body));
    report('mutation (' + k + ')', c);
    const bit = c.some(([, ok]) => !ok);
    if (!bit) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all four mutations bit');
  process.exit(0);
}

report('', run(build(BASE), buildAmort(BASE)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
