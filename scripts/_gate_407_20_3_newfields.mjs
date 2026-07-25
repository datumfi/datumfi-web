/* DEV-ONLY red-first gate — #407 §20 Commit 3: the two new display-only fields.
     #2b Term (months)   — Mortgage-only, beside Next Payment Date, copy R213 verbatim
     #4b Coverage Amount — beside Annual Homeowner Insurance, copy R215 verbatim
   Two halves, and the SECOND is the one that matters:

   (1) RENDER (#380): both fields render in the real modal, in the right slot, with their authored
       labels/subtitles/hovers, bound to their own acc keys, blank when unsourced (L47).

   (2) LOCK-3 NEGATIVE CONTROL: these fields must never reach a number. The gate takes a fully-populated
       mortgage, snapshots EVERY computed figure the room can produce (escrow monthly, hasEscrow, the
       escrow footer, total payment, payoff months/date, lifetime + life-of-loan interest, accelerated
       delta, the DI paragraph, the debt pie), then sets termMonths AND insCoverageAmount to large values
       and recomputes. Every single figure must be byte-identical. It also proves the reverse direction:
       with the escrow trio blank, a Coverage Amount alone must NOT switch hasEscrow on or reveal the
       escrow footer — the trap a naive "any escrow-ish field is set" check would fall into.

   --redfirst wires Coverage Amount into calculateEscrowMonthly + hasEscrow (the exact mistake this
   commit must never make) and drops the Mortgage gate on Term; the negative control must then bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let src = readFileSync('studio.html', 'utf8');

if (RED) {
  // the plausible wrong version: Coverage Amount treated as "just another escrow figure"
  src = src.replace('let other = parseFloat(acc.mortgageOtherCost) || 0;   // §18.1 \'Other (yr)\' — flood/assessments/etc.',
                    'let other = (parseFloat(acc.mortgageOtherCost) || 0) + (parseFloat(acc.insCoverageAmount) || 0);');
  src = src.replace("(parseFloat(acc.mortgageOtherCost) || 0) > 0;", "(parseFloat(acc.mortgageOtherCost) || 0) > 0 || (parseFloat(acc.insCoverageAmount) || 0) > 0;");
}

const st = src.indexOf('window.openAccountModal = function(id)');
const en = src.indexOf('window.closeAccountModal');
let BUILDER = src.slice(st, en); BUILDER = BUILDER.slice(0, BUILDER.lastIndexOf('};') + 2);
if (RED) BUILDER = BUILDER.replace(/\$\{base\.title === 'Mortgage' \? `<div>\$\{_dLbl\(base, 'Term \(months\)'/, "${true ? `<div>${_dLbl(base, 'Term (months)'");

function ex(s, n) { const i = s.indexOf('function ' + n + '('); if (i < 0) throw new Error('missing ' + n); let d = 0, b = false; for (let j = s.indexOf('{', i); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(i, j + 1); } } }
// §20.7 moved the escrow inputs into a data-driven renderer, so the REAL escrow functions must come with
// it — auto-stubbed, every Coverage-Amount assertion below would be checking a marker string.
const ESCROW = [
  "var _moatEscrowView = 'yr';",
  src.slice(src.indexOf('var _MOAT_ESCROW_ROWS = '), src.indexOf('// stored (canonical) -> displayed')),
  src.slice(src.indexOf('window._moatEscrowEdit = function'), src.indexOf('// The control is the Living Ledger')),
  src.slice(src.indexOf('window._setMoatEscrowView = function'), src.indexOf('function _moatEscrowToggleHTML'))
].join('\n');
const EXTRA = [ESCROW, ...['_num', 'formatCurrencyDisplay', '_dLbl', 'hasEscrow', 'calculateEscrowMonthly',
  '_moatEscrowToView', '_moatEscrowToStore', '_moatEscrowToggleHTML', '_moatEscrowFieldsHTML',
  '_sumLbl', '_payoffIntelHTML'].map(n => ex(src, n))].join('\n');

const BASES = {
  mortgage_primary: { id: 'mortgage_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'Mortgage', meta: 'The Moat' },
  heloc_primary:    { id: 'heloc_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'HELOC', meta: 'The Cellar' }
};
const FULL = { id: 'm1', baseId: 'mortgage_primary', name: 'Moat', value: 300000, intRate: 3.99, minPmt: 2500, addPmt: 250,
  origAmount: 400000, origDate: '2015-01-01', maturityDate: '2045-01-01', nextPmtDate: '2026-08-01',
  propTaxAnnual: 6000, insAnnual: 2400, pmiMonthly: 150, mortgageOtherCost: 600, interestPaidToDate: 31684.35, isPriority: true, notes: '' };
const HEL = { id: 'h1', baseId: 'heloc_primary', name: 'Cellar', value: 60000, intRate: 8, minPmt: 700, addPmt: 0, helocPhase: 'Repayment', maturityDate: '2040-01-01', nextPmtDate: '2026-08-01', notes: '' };

function render(accId, accounts) {
  let cap = null;
  const el = (id) => ({ id, style: {}, value: '', checked: false, classList: { add() {}, remove() {} },
    appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(v) { if (id === 'modal-dynamic-content') cap = v; }, get innerHTML() { return ''; } });
  const explicit = {
    document: { getElementById: el, createElement: () => el('new'), body: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] },
    window: { parseAgeFromDob: () => 52 }, state: { accounts },
    getBaseType: (b) => BASES[b] || BASES.mortgage_primary,
    _fetchLivePrime: () => ({ then: () => {} }), activeModalId: null, console
  };
  const strs = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(x => strs(x, out)); return out; };
  const mk = (n) => { const f = (...a) => '«' + n + '(' + strs(a).join('|') + ')»'; f.toString = () => '«' + n + '»'; return f; };
  const scope = new Proxy({}, { has: () => true,
    get(t, k) { if (k === Symbol.unscopables) return undefined; const s = String(k);
      if (s in explicit) return explicit[s]; if (s in t) return t[s]; if (s in globalThis) return globalThis[s]; return mk(s); },
    set(t, k, v) { t[String(k)] = v; return true; } });
  new Function('__s__', 'with(__s__){' + EXTRA + '\n' + BUILDER + '}')(scope);
  explicit.window.openAccountModal(accId);
  return cap;
}

// the real engine, standalone — every figure the Moat can compute
function engine() {
  const names = ['_num', 'calculateTotalPmt', 'calculateEscrowMonthly', 'hasEscrow', '_escrowFooter', 'payoffMonths',
    '_payoffDateFrom', 'calculatePayoff', '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', 'acceleratedDelta',
    '_moatNegAm', '_retireInfo', '_targetPayment', '_payoffYearOf', '_moatSanePayoff', '_moatRateMoves', '_debtDonutSVG',
    '_moatDebtPieHTML', '_debtPayoffDisplay', '_moatDI'];
  const deps = { getBaseType: () => BASES.mortgage_primary, state: { accounts: [] },
    _moatPmiUnder20: () => false, _moatLiveMktRate: () => null,
    _retireOverride: { retireYear: 2035, retireDate: new Date(2035, 2, 1), currentAge: 52 } };
  return new Function(...Object.keys(deps), names.map(n => ex(src, n)).join('\n') +
    '\nreturn { calculateEscrowMonthly, hasEscrow, _escrowFooter, calculateTotalPmt, payoffMonths, calculatePayoff,' +
    ' lifetimeInterest, lifeOfLoan, acceleratedDelta, _moatDI, _moatDebtPieHTML, _debtPayoffDisplay };')(...Object.values(deps));
}
const E = engine();
const snapshot = (a) => JSON.stringify({
  escrowMo: E.calculateEscrowMonthly(a), hasEscrow: E.hasEscrow(a),
  foot: E._escrowFooter(a), pmt: E.calculateTotalPmt(a), months: E.payoffMonths(a), payoff: E.calculatePayoff(a),
  display: E._debtPayoffDisplay(a), li: E.lifetimeInterest(a), lol: E.lifeOfLoan(a), accel: E.acceleratedDelta(a),
  di: E._moatDI(a), pie: E._moatDebtPieHTML(a)
});

const checks = [];
const need = (l, c) => checks.push([l, !!c]);
const M = render('m1', [FULL]);
const H = render('h1', [HEL]);
const at = (h, s) => h.indexOf(s);
const before = (h, a, b) => at(h, a) >= 0 && at(h, b) >= 0 && at(h, a) < at(h, b);

// ── (1) RENDER ──
need('#2b Term (months) renders on the Mortgage', M.includes('Term (months)'));
need('#2b Term sits BESIDE Next Payment Date (same row, after it)', before(M, 'Next Payment Date', 'Term (months)') && before(M, 'Term (months)', 'Minimum Payment'));
need('#2b R213 subtitle verbatim', M.includes('The full length of the loan'));
need('#2b R213 hover verbatim', M.includes('360 for a 30-year, 240 for a 20, 180 for a 15'));
need('#2b Term bound to acc.termMonths', /updateAccField\('m1', 'termMonths'/.test(M));
need('#2b Term blank when unsourced (no fabricated 360)', /'termMonths'[^>]*>/.test(M) && !/value="360"/.test(M));
need('#2b Term is Mortgage-only (absent on a HELOC)', !H.includes('Term (months)'));
need('#2b HELOC keeps its single-column Next Payment Date row', H.includes('grid-template-columns: 1fr;') );

need('#4b Coverage Amount renders', M.includes('Coverage Amount'));
need('#4b sits BESIDE Annual Homeowner Insurance', before(M, 'Annual Homeowner Insurance', 'Coverage Amount') && before(M, 'Coverage Amount', 'Other (yr)'));
need('#4b R215 subtitle verbatim', M.includes('What the policy would rebuild for'));
need('#4b R215 hover verbatim', M.includes('It does not change any math; it lets you see cost and protection side by side.'));
// §20.7: escrow rows are index-bound now (_moatEscrowEdit(id, ROW, …)). Resolve Coverage's row index from
// the row table and assert its label renders on THAT row — a mis-bound field still fails.
{
  const idx = (ESCROW.match(/\{ f: '([a-zA-Z]+)'/g) || []).map(s => s.slice(6, -1)).indexOf('insCoverageAmount');
  need('#4b bound to the insCoverageAmount row', idx >= 0 &&
    new RegExp("Coverage Amount[\\s\\S]{0,900}?_moatEscrowEdit\\('m1', " + idx + ",").test(M));
}
need('#4b Other (yr) survives the reflow (own row, left column)', M.includes('Other (yr)'));

// ── (2) LOCK-3 NEGATIVE CONTROL — the half that matters ──
{
  const clean = snapshot(FULL);
  const dirty = snapshot({ ...FULL, termMonths: '360', insCoverageAmount: '450000' });
  need('LOCK-3: every computed figure is byte-identical with both new fields SET', clean === dirty);
  if (clean !== dirty) {
    const a = JSON.parse(clean), b = JSON.parse(dirty);
    for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log('   ↳ MOVED: ' + k + '  ' + JSON.stringify(a[k]).slice(0, 70) + ' → ' + JSON.stringify(b[k]).slice(0, 70));
  }
  // direction 2: a coverage figure alone must not look like escrow
  const bare = { ...FULL, propTaxAnnual: '', insAnnual: '', pmiMonthly: '', mortgageOtherCost: '' };
  need('LOCK-3: escrow monthly is $0 when only Coverage Amount is set', E.calculateEscrowMonthly({ ...bare, insCoverageAmount: '450000' }) === 0);
  need('LOCK-3: hasEscrow stays FALSE when only Coverage Amount is set', E.hasEscrow({ ...bare, insCoverageAmount: '450000' }) === false);
  need('LOCK-3: Term alone moves no payoff figure', E.calculatePayoff({ ...FULL, termMonths: '120' }) === E.calculatePayoff(FULL));
}
// ── store hygiene: the currency field must be decimal-safe, the integer field must round-trip blank ──
{
  const wl = src.slice(src.indexOf('window.updateAccField = function'), src.indexOf('window.updateAccField = function') + 1600);
  need('STORE: insCoverageAmount goes through enforceAmt (no raw "$450,000" string)', /field === 'insCoverageAmount'/.test(wl));
  need('STORE: termMonths NOT coerced to 0 (blank stays blank, L47)', !/field === 'termMonths'/.test(wl));
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('❌ RED-FIRST FAILED — Coverage Amount was wired into escrow and nothing bit.'); process.exit(1); }
  console.log('✅ RED-FIRST OK — wiring the display-only fields into the math makes the gate bite.'); process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — both fields render; neither touches a single computed figure.');
