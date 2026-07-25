/* DEV-ONLY red-first gate — #407 finding (B): the shared closure extractor itself.

   A harness that every other gate leans on has to be gated, or a silent break there turns every downstream gate
   into a false green. Proves extractClosure actually walks transitively, and — the point of the whole exercise —
   that the three real historical breakages CANNOT recur.

   --redfirst cripples the walker to depth-1 (roots + their direct callees only, the old hand-list behaviour) ->
   the transitive cases fail, exactly as they did in #429 and #431. */
import { readFileSync } from 'node:fs';
import { extractClosure, closureNames, extractFn } from './_gate_extract.mjs';

const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

// depth-1 stand-in for the old hand-listing behaviour
function shallow(s, roots) {
  const out = new Map();
  for (const r of roots) {
    out.set(r, extractFn(s, r));
    for (const m of out.get(r).matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const c = m[1];
      if (!out.has(c) && s.indexOf('function ' + c + '(') >= 0) out.set(c, extractFn(s, c));
    }
  }
  return Array.from(out.values()).join('\n');
}
const build = RED ? shallow : extractClosure;

const checks = [];
const need = (l, c) => checks.push([l, !!c]);

// ── 1. the #431 case: _yardDebtPieHTML -> _yardNetEquity -> _groundsLinkedDebt (depth 2) ──
{
  const names = closureNames(src, ['_yardDebtPieHTML']);
  need('closure reaches a DEPTH-2 callee (_yardDebtPieHTML → _yardNetEquity → _groundsLinkedDebt)',
    names.includes('_yardNetEquity') && names.includes('_groundsLinkedDebt'));
  const body = build(src, ['_yardDebtPieHTML']);
  const PROP = 'p1';
  const deps = {
    getBaseType: (b) => { const s = String(b); return { id: s, title: s.indexOf('heloc') === 0 ? 'HELOC' : s.indexOf('mortgage') === 0 ? 'Mortgage' : 'Real Estate', taxCode: (s.indexOf('heloc') === 0 || s.indexOf('mortgage') === 0) ? 'debt' : 'asset' }; },
    state: { accounts: [{ id: PROP, baseId: 'property', value: '500000' },
                        { id: 'm1', baseId: 'mortgage_joint', linkedAssetId: PROP, origAmount: '400000', value: '300000' }] }
  };
  let ok = false;
  try {
    const fn = new Function(...Object.keys(deps), body + '\nreturn _yardDebtPieHTML;')(...Object.values(deps));
    ok = String(fn(PROP)).includes('<svg');
  } catch (e) { ok = false; }
  need('the Yard pie EXECUTES from roots alone (no hand-listed callees)', ok);
}

// ── 2. the #429 case: a new _moatDI callee must be picked up automatically ──
{
  const names = closureNames(src, ['_moatDI']);
  need('_moatDI closure includes _moatRateMoves (the #429 breaker)', names.includes('_moatRateMoves'));
  need('_moatDI closure includes the §19 additions (_retireInfo / _targetPayment / _moatNegAm)',
    names.includes('_retireInfo') && names.includes('_targetPayment') && names.includes('_moatNegAm'));
  need('_moatDI closure reaches the shared payoff engine transitively (payoffMonths, lifetimeInterest)',
    names.includes('payoffMonths') && names.includes('lifetimeInterest'));
}

// ── 3. the pie composer used by gate (A) ──
{
  const names = closureNames(src, ['_moatPieBlockHTML']);
  need('_moatPieBlockHTML closure reaches _debtDonutSVG via _moatDebtPieHTML',
    names.includes('_moatDebtPieHTML') && names.includes('_debtDonutSVG'));
}

// ── 3b. the #434 case: `window.X = function` definitions must be walkable too ──
{
  const names = closureNames(src, ['openAmortizationModal']);
  need('closure resolves a `window.X = function` root (openAmortizationModal)', names.includes('openAmortizationModal'));
  need('and walks ITS callees — §20.2 added _amortRow / _amortTableHTML',
    names.includes('_amortRow') && names.includes('_amortTableHTML') && names.includes('_amortCompleteBodyHTML'));
  need('reaching the from-inception engine transitively (_moatInceptionSchedule, _moatTermMonths)',
    names.includes('_moatInceptionSchedule') && names.includes('_moatTermMonths'));
  const body = build(src, ['openAmortizationModal'], { exclude: ['getBaseType', 'state'] });
  let cap = '', ok = false;
  try {
    const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { cap = v; }, get innerHTML() { return cap; } });
    const doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
    const win = {};
    new Function('window', 'document', 'state', 'getBaseType', body)(win, doc,
      { accounts: [{ id: 'g', baseId: 'mortgage_a', value: 300000, origAmount: 400000, intRate: 6, minPmt: 2500, origDate: '2019-01-01', maturityDate: '2049-01-01' }] },
      () => ({ id: 'mortgage_a', title: 'Mortgage' }));
    win.openAmortizationModal('g', 'complete');
    ok = cap.includes('<table') && cap.includes('The whole loan, from day one');
  } catch (e) { ok = false; }
  need('the overlay EXECUTES from that root alone (no hand-listed callees)', ok);
}

// ── 4. contract guarantees, so downstream gates can rely on them ──
{
  const body = extractClosure(src, ['_moatPieBlockHTML']);
  const count = (body.match(/function _debtDonutSVG\(/g) || []).length;
  need('each function appears EXACTLY once (no duplicate declarations)', count === 1);
  need('exclude option stops the walk where a gate injects its own dep',
    !closureNames(src, ['_moatDI'], { exclude: ['_retireInfo'] }).includes('_retireInfo'));
  let threw = false;
  try { extractClosure(src, ['_definitelyNotAFunctionInStudio']); } catch (e) { threw = true; }
  need('a genuinely missing root throws loudly (never a silent empty body)', threw);
  need('non-functions are NOT pulled in (built-ins/DOM left to the gate to inject)',
    !closureNames(src, ['_moatPieBlockHTML']).includes('parseFloat'));
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — depth-1 walking still satisfied every check.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — a non-transitive walker reproduces the #429/#431 breakages.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
