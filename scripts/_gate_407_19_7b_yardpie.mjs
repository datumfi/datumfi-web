/* DEV-ONLY red-first gate — #407 §19.7 COMMIT 2 (Ruling B2): _yardDebtPieHTML(propId) position debt pie + swap.
   The Yard is ALWAYS a position view — total secured debt vs equity, arcs summing to HOME VALUE so the equity arc
   equals the center %. Executes the REAL _yardDebtPieHTML (drawer + _yard* helpers pulled from studio.html) and
   asserts on the RENDERED pie (#380). Acceptance bar (Dan's north star): every rendered state sums to home and the
   equity arc % == the center %. Covered states:
     RE + Mortgage only     -> Mortgage Balance + Equity            · "WHERE THIS LOAN STANDS"
     RE + HELOC only        -> HELOC Drawn + Equity                 · "WHERE THIS LOAN STANDS"
     RE + Mortgage + HELOC  -> Mortgage Balance + HELOC Drawn + Eq  · "ALL DEBT ON THE GROUNDS"
     undrawn HELOC          -> collapses to the mortgage position pie (HELOC contributes nothing)
   HELOC never gets a fabricated principal/interest split (L47); mortgage progress slices (Principal Paid / Interest
   Paid) never appear in the Yard (they live on the Mortgage modal).
   --redfirst makes the drawn HELOC invisible as a slice while equity still nets it out -> arcs no longer sum to home,
   the equity arc drifts off the center %, and the HELOC/title checks fail. */
import { readFileSync } from 'node:fs';
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

const names = ['_num', '_groundsLinkedDebt', '_yardLiens', '_yardMortgage', '_yardHeloc', '_yardNetEquity',
               '_debtDonutSVG', '_yardDebtPieHTML'];
let body = names.map(n => extractFn(src, n)).join('\n');
if (RED) body = body.replace('if (helocDrawn > 0) {', 'if (helocDrawn > 9e15) {');   // force the HELOC slice invisible

const gbt = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('heloc') === 0) return { id: 'heloc_x', taxCode: 'debt', title: 'HELOC' };
  if (id.indexOf('mortgage') === 0) return { id: 'mortgage_x', taxCode: 'debt', title: 'Mortgage' };
  return { id: 'property_x', taxCode: 'physical', title: 'Real Estate' };
};
const build = (state) => new Function('getBaseType', 'state', body + '\nreturn _yardDebtPieHTML;')(gbt, state);

const P = { id: 'prop1', baseId: 'property_a', value: 400000 };
const M = { id: 'mort1', baseId: 'mortgage_a', linkedAssetId: 'prop1', origAmount: 135675, value: 14796.93, interestPaidToDate: 31684.35 };
const H = { id: 'heloc1', baseId: 'heloc_a', linkedAssetId: 'prop1', value: 25000 };

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

// ── call site swapped ──
need('call site now feeds _yardDebtPieHTML(propId)', src.includes('secB + _yardDebtPieHTML(propId)'));
need('old mortgage-only call site is gone', !src.includes("secB + (m ? _moatDebtPieHTML(m) : '')"));
need('Yard no longer calls the mortgage progress pie', !extractFn(src, '_yardDebtPieHTML').includes('_moatDebtPieHTML'));

// ── A: RE + Mortgage only → position pie (B2 — was the progress pie under B1) ──
{
  const out = build({ accounts: [P, M] })('prop1');
  need('mortgage-only: "Mortgage Balance" + "Equity", no HELOC slice', out.includes('Mortgage Balance') && out.includes('Equity') && !out.includes('HELOC'));
  need('mortgage-only: NO progress slices (Principal Paid / Interest Paid)', !out.includes('Principal Paid') && !out.includes('Interest Paid'));
  need('mortgage-only (1 lien): title "WHERE THIS LOAN STANDS"', out.includes('WHERE THIS LOAN STANDS') && !out.includes('ALL DEBT ON THE GROUNDS'));
  // equity = 400000 - 14796.93 = 385203.07 -> 96%; arcs sum to home so legend % == center %
  need('ACCEPTANCE BAR: equity arc % equals center % (96 = 96)', out.includes('$385,203 · 96%') && out.includes('>96%<'));
}
// ── B: undrawn HELOC (value 0) + mortgage → same mortgage position pie ──
{
  const out = build({ accounts: [P, M, { ...H, value: 0 }] })('prop1');
  need('undrawn HELOC: collapses to mortgage position pie (no HELOC slice)', out.includes('Mortgage Balance') && !out.includes('HELOC'));
  need('undrawn HELOC: still "WHERE THIS LOAN STANDS"', out.includes('WHERE THIS LOAN STANDS'));
}
// ── C: RE + Mortgage + HELOC → all-liens position pie ──
{
  const out = build({ accounts: [P, M, H] })('prop1');
  need('drawn HELOC (2 liens): title "ALL DEBT ON THE GROUNDS"', out.includes('ALL DEBT ON THE GROUNDS'));
  need('drawn HELOC: single "HELOC Drawn" slice at drawn balance ($25,000)', /HELOC Drawn: \$25,000/.test(out));
  need('drawn HELOC: HELOC slice wears its own violet', out.includes('#9B7EDE'));
  need('Mortgage Balance slice present', out.includes('Mortgage Balance'));
  need('L47: HELOC gets NO fabricated principal/interest split', !out.includes('HELOC Principal') && !out.includes('HELOC Interest'));
  need('no mortgage progress slices in the Yard', !out.includes('Principal Paid') && !out.includes('Interest Paid'));
  // equity = 400000 - (14796.93+25000) = 360203.07 -> 90%; arcs sum to home
  need('ACCEPTANCE BAR: equity arc % equals center % (90 = 90)', out.includes('$360,203 · 90%') && out.includes('>90%<'));
  need('center is NOT the mortgage-only paid-down % (89)', !out.includes('>89%<'));
}
// ── D: RE + HELOC only (1 lien) → HELOC Drawn + Equity, "WHERE THIS LOAN STANDS" ──
{
  const out = build({ accounts: [P, H] })('prop1');
  need('lone HELOC: HELOC Drawn + Equity, NO mortgage slice', out.includes('HELOC Drawn') && out.includes('Equity') && !out.includes('Mortgage Balance'));
  need('lone HELOC (1 lien): title "WHERE THIS LOAN STANDS"', out.includes('WHERE THIS LOAN STANDS') && !out.includes('ALL DEBT ON THE GROUNDS'));
}
// ── E: paid-off (no active debt) but sourced home value → the reward: single 100% Equity circle ──
{
  const out = build({ accounts: [P, { ...M, value: 0 }] })('prop1');   // mortgage balance 0, no HELOC
  need('paid-off: single Equity slice at 100% (no debt slices)', /Equity: \$400,000 \(100%\)/.test(out) && !out.includes('Mortgage Balance') && !out.includes('HELOC'));
  need('paid-off: center reads 100% EQUITY', out.includes('>100%<') && out.includes('EQUITY'));
  need('paid-off: title "THIS PROPERTY IS FULLY YOURS" (never a loan title)',
    out.includes('THIS PROPERTY IS FULLY YOURS') && !out.includes('WHERE THIS LOAN STANDS') && !out.includes('ALL DEBT ON THE GROUNDS'));
  need('ACCEPTANCE BAR: 100% equity arc equals center (100 = 100)', out.includes('$400,000 · 100%'));
}
// ── F: no sourced home value → warm coach nudge, NOT a pie (blank-pie behavior stays) ──
{
  const out = build({ accounts: [{ id: 'prop1', baseId: 'property_a' }, M] })('prop1');   // property has no value
  need('no home value: warm actionable nudge shown', out.includes('Add this home') && out.includes('already yours'));
  need('no home value: NO donut rendered (no <svg)', !out.includes('<svg'));
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green with the drawn HELOC made invisible.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the Yard pie drops the drawn HELOC (arcs stop summing to home).');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
