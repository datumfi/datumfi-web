/* DEV-ONLY red-first gate — #407 §19.5 Mortgage DI copy restructure + semantic color tokens.
   Honors the #380 doctrine: it does NOT grep source strings — it EXECUTES the real _moatDI (pulled verbatim
   from studio.html, leaf deps stubbed) against a fixture loan and asserts on the RENDERED HTML the element
   actually emits: three <p class="di-p"> paragraphs, numbers wearing di-n-red / di-n-teal / di-n-gold, the
   R178 cuts gone, and — the ¶2 ruling — the "remains from here" figure bound to lifetimeInterest(acc) (the
   forward walk), NOT life-of-loan minus paid-to-date.
   --redfirst neutralizes the semantic classes + the .di-p wrapping in the extracted source (the exact symptom:
   a rendered element that no longer carries the winner class) -> the render assertions fail. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

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

// (B) — ROOT ONLY. The callee closure is walked out of studio.html, so a new _moatDI callee cannot break this
// gate the way _moatRateMoves broke six of them in #429. See scripts/_gate_extract.mjs.
// This gate is about §19.5 COPY + colour, not the payoff engine, so it deliberately injects shaped stubs for the
// payoff leaves (below) to make every governed beat fire. Those names are EXCLUDED from the walk — otherwise the
// real functions would be declared inside the sandbox and shadow the injected stubs. lifetimeInterest/lifeOfLoan
// stay REAL: ¶2 asserts a FIGURE, and a stubbed engine fn there would be green for the wrong reason.
let body = extractClosure(src, ['_moatDI'], {
  exclude: ['calculateTotalPmt', 'payoffMonths', 'calculatePayoff', '_payoffDateFrom',
            'acceleratedDelta', 'hasEscrow', 'calculateEscrowMonthly', '_moatPmiUnder20', '_moatLiveMktRate']
});
if (RED) body = body.split('di-n-red').join('zz').split('di-n-teal').join('zz').split('di-n-gold').join('zz').split('di-p').join('zz');

// Leaf-dep stubs shaped so every governed beat fires: ¶1 paid-down, payoff clock, ¶2 interest set, §1.7 lever, §1.9 income-drop.
const deps = {
  calculateTotalPmt: () => 900,
  payoffMonths: () => ({ code: 'OK', months: 200 }),
  calculatePayoff: () => 'Jan 2027',
  _payoffDateFrom: () => 'Jan 2028',
  acceleratedDelta: () => null,
  hasEscrow: () => false,
  calculateEscrowMonthly: () => 0,
  _moatPmiUnder20: () => false,
  _moatLiveMktRate: () => null,   // skip §17 FRED (uncolored, out of §19.5 scope)
  getBaseType: () => ({}),
  state: { accounts: [] },
};
const factory = new Function(...Object.keys(deps), body + '\nreturn { _moatDI, lifetimeInterest, lifeOfLoan };');
const { _moatDI, lifetimeInterest, lifeOfLoan } = factory(...Object.values(deps));

const acc = {
  value: 14796.93, origAmount: 135675, intRate: 3.99, addPmt: 0,
  interestPaidToDate: 31684.35, rateType: 'Fixed',
  origDate: '2007-01-01', maturityDate: '2027-01-01',
};
const out = _moatDI(acc);
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
const liRemain = lifetimeInterest(acc);
const intLife = lifeOfLoan(acc).intLife;

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ── STRUCTURE: three real paragraphs (fixes "one dense paragraph") ──
const pCount = (out.match(/<p class="di-p">/g) || []).length;
need(`exactly 3 <p class="di-p"> paragraphs (got ${pCount})`, pCount === 3);

// ── RENDERED elements carry the semantic classes (#380 — assert the emitted class, not the CSS rule) ──
need('¶1 balance figures wear di-n-teal', out.includes('<span class="di-n-teal">' + fmt(acc.value) + '</span>'));
need('paid-to-date $31,684 wears di-n-red (sourced)', out.includes('<span class="di-n-red">' + fmt(acc.interestPaidToDate) + '</span>'));
need('guaranteed-rate 3.99% wears di-n-gold (lever)', out.includes('<span class="di-n-gold">3.99%</span>'));

// ── ¶2 RULING: "remains from here" == lifetimeInterest(acc), NOT life-of-loan minus paid-to-date ──
need('¶2 remaining figure binds to lifetimeInterest(acc)', out.includes('<span class="di-n-red">' + fmt(liRemain) + '</span>'));
need('¶2 does NOT bind remaining to (lifeOfLoan − paid)', !out.includes(fmt(intLife - acc.interestPaidToDate) + '</span> more goes to interest'));
need('life-of-loan appears only as the theoretical aside', out.includes("a theoretical figure, not what you'll actually pay") && out.includes('<span class="di-n-red">' + fmt(intLife) + '</span>'));

// ── R178 CUTS: the two restatement lines are gone ──
need('CUT ①: "This loan runs …% APR" line removed', !out.includes('This loan runs'));
need('CUT ②: "buys you more house and less lender" removed', !out.includes('buys you more house'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the semantic classes neutralized.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the rendered element loses the winner classes.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
