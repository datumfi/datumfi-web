/* DEV-ONLY red-first gate — #407 §19.9: decouple position truth from the schedule gate (Part A) + negative-
   amortization education notice (Part B). Executes the real functions (pulled from studio.html, leaf DOM deps
   stubbed) and asserts on the RENDERED output (#380). Proves the Captain's four bars:
     • neg-am (payment < monthly interest, both sourced) -> inline notice + DI echo present; pie + DI ¶2 paid-to-date
       still render off the sourced position (Part A decouple);
     • covering payment -> notice gone; pie + ¶2 render normally (forward "remains from here" figure returns);
     • blank APR/balance -> no notice, no fabricated interest;
     • Part A structure: the amort-modal pie is computed OUTSIDE the schedule gate.
   --redfirst forces _moatNegAm to never fire (the neg-am notice vanishes even under negative amortization) -> the
   neg-am assertions fail. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
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
  throw new Error('unbalanced braces: ' + name);
}

const deps = {
  acceleratedDelta: () => null, hasEscrow: () => false, calculateEscrowMonthly: () => 0,
  _moatPmiUnder20: () => false, _moatLiveMktRate: () => null,
  getBaseType: () => ({ id: 'mortgage_x', title: 'Mortgage' }),
  state: { accounts: [] },
};
// (B) — roots only; the closure is walked from studio.html so a new _moatDI callee can't break this gate.
let body = extractClosure(src, ['_moatDI', '_moatNegAmInlineHTML', '_moatDebtPieHTML'], { exclude: Object.keys(deps) });
if (RED) body = body.replace('if (payment <= 0 || payment >= monthlyInterest) return null;', 'if (true) return null;');   // force never-neg-am
const api = new Function(...Object.keys(deps), body + '\nreturn { _moatNegAm, _moatNegAmInlineHTML, _moatDI, _moatDebtPieHTML };')(...Object.values(deps));

const base = { baseId: 'mortgage_a', value: 150000, origAmount: 200000, intRate: 5.99, interestPaidToDate: 31000, origDate: '2012-01-01', maturityDate: '2032-01-01' };
const negam = { ...base, minPmt: 500, addPmt: 50 };    // $550 total P&I < $748.75 interest → neg-am
const cover = { ...base, minPmt: 3000, addPmt: 50 };   // $3,050 covers interest and amortizes
const noApr = { baseId: 'mortgage_a', value: 150000, origAmount: 200000, minPmt: 500, addPmt: 50 };   // APR blank

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ── Part A structure, RE-POINTED 2026-07-25 (§3b, Captain ruling #430) ──
// The invariant Part A established — position truth is NOT gated on a drawable schedule — is unchanged and
// now stated more strongly: the pie no longer lives in the amortization overlay at all. It renders on the
// modal body via _moatPieBlockHTML, so there is no schedule branch left for it to be trapped inside.
// The old assertions ('var pie = ...' / 'var body = pie + schedule;') described the overlay and would have
// gone vacuous here — the overlay now emits no pie under ANY state, so "no pie when blank" would pass for
// the wrong reason. Both re-pointed at the new home, asserted from both ends.
need('Part A: the pie composer owns pie + §19.9b nudge in ONE place', src.includes('function _moatPieBlockHTML(acc) {'));
need('Part A: overlay body is the schedule ALONE (pie relocated out)',
  src.includes('var body = schedule;') && !src.includes('var body = pie + schedule;'));

// ── #380 — EXECUTE the real openAmortizationModal against a captured overlay and assert the SVG element actually
//    lands in the rendered modal body (not just that the pie function or source structure exists). ──
function extractAt(s, marker) {
  const start = s.indexOf(marker); let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
}
const amortSrc = extractAt(src, 'window.openAmortizationModal = function');
const modalBody = ['calculateTotalPmt', 'payoffMonths', '_debtDonutSVG', '_moatDebtPieHTML'].map(n => extractFn(src, n)).join('\n');
function renderModal(acc) {
  let captured = '';
  const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { captured = v; }, get innerHTML() { return captured; } });
  const win = {}, doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
  const gbt = () => ({ id: 'mortgage_x', title: 'Mortgage' });
  new Function('window', 'document', 'state', 'getBaseType', modalBody + '\n' + amortSrc)(win, doc, { accounts: [acc] }, gbt);
  win.openAmortizationModal(acc.id);
  return captured;
}
const modNeg = renderModal({ id: 'x', ...negam });
need('#380: amort overlay still speaks its neg-am "cannot draw" state', modNeg.includes('balance never reaches zero'));
need('#380 §3b: the overlay no longer carries the pie', !modNeg.includes('<svg') && !modNeg.includes('WHERE THIS LOAN STANDS'));

// ── #380 §3b — the pie's real home is now the modal BODY. Assert the SVG lands in the RENDERED body, and that
//    sourced-or-blank still holds THERE (in the overlay that check is now vacuous — no pie exists under any state). ──
const intelBody = ['_num', 'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween',
                   'lifeOfLoan', 'lifetimeInterest', '_sumLbl', '_debtDonutSVG', '_moatDebtPieHTML',
                   '_moatPieBlockHTML', '_payoffIntelHTML'].map(n => extractFn(src, n)).join('\n');
const intel = new Function('getBaseType', 'acceleratedDelta', 'hasEscrow', 'calculateEscrowMonthly',
  intelBody + '\nreturn _payoffIntelHTML;')(() => ({ id: 'mortgage_x', title: 'Mortgage' }), () => null, () => false, () => 0);
need('#380 §3b: modal body renders the pie SVG under neg-am (position, schedule-independent)',
  intel('x', negam).includes('<svg') && intel('x', negam).includes('WHERE THIS LOAN STANDS'));
need('#380 §3b: sourced-or-blank on the BODY — no pie SVG when Original Amount is blank',
  !intel('x', { baseId: 'mortgage_a', value: 150000, intRate: 5.99, minPmt: 500, addPmt: 50 }).includes('<svg'));

// ── NEG-AM ──
{
  const inline = api._moatNegAmInlineHTML(negam);
  need('neg-am: inline notice present with $550 / $749 / $199', inline.includes('moat-negam-inline') && inline.includes('$550') && inline.includes('$749') && inline.includes('$199') && inline.includes('never pays off'));
  const di = api._moatDI(negam);
  need('neg-am: DI echo present (di-negam + "outlive the plan" + $749 in red)', di.includes('di-negam') && di.includes('outlive the plan') && di.includes('<span class="di-n-red">$749</span>'));
  need('Part A: DI ¶2 paid-to-date SURVIVES neg-am (sourced $31,000 still shown)', di.includes('<span class="di-n-red">$31,000</span>') && di.includes('in interest on this loan so far'));
  const pie = api._moatDebtPieHTML(negam);
  need('Part A: debt pie renders under neg-am (position, schedule-independent)', pie.includes('<svg') && pie.includes('Principal Balance'));
}
// ── COVERING ──
{
  need('covering: inline notice GONE', api._moatNegAmInlineHTML(cover) === '');
  const di = api._moatDI(cover);
  need('covering: no DI echo (no di-negam)', !di.includes('di-negam') && !di.includes('outlive the plan'));
  need('covering: ¶2 forward figure returns ("from here to payoff about")', di.includes('from here to payoff about'));
  need('covering: pie still renders', api._moatDebtPieHTML(cover).includes('<svg'));
}
// ── BLANK APR ──
{
  need('blank APR: _moatNegAm null (no fabricated interest)', api._moatNegAm(noApr) === null);
  need('blank APR: no inline notice', api._moatNegAmInlineHTML(noApr) === '');
  need('blank APR: no DI echo', !api._moatDI(noApr).includes('di-negam'));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with neg-am detection disabled.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the neg-am notice never fires.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
