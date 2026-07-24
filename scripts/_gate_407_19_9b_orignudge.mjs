/* DEV-ONLY red-first gate — #407 §19.9b: blank-Original-Amount nudge in the amortization modal.
   Executes the real window.openAmortizationModal against a captured overlay (#380 — assert the rendered element)
   and proves: a mortgage with a real balance but no Original Amount shows the plain-coach nudge in the pie gap
   (no silent blank); the moment Original Amount is filled, the pie SVG renders and the nudge is gone.
   --redfirst disables the nudge branch -> the blank-Original case falls back to a silent gap -> the nudge check fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

function extractFn(s, name) {
  const start = s.indexOf('function ' + name + '(');
  let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
}
function extractAt(s, marker) {
  const start = s.indexOf(marker); let depth = 0, began = false;
  for (let j = s.indexOf('{', start); j < s.length; j++) {
    if (s[j] === '{') { depth++; began = true; }
    else if (s[j] === '}') { depth--; if (began && depth === 0) return s.slice(start, j + 1); }
  }
}
let modalBody = ['calculateTotalPmt', 'payoffMonths', '_debtDonutSVG', '_moatDebtPieHTML'].map(n => extractFn(src, n)).join('\n');
let amortSrc = extractAt(src, 'window.openAmortizationModal = function');
if (RED) amortSrc = amortSrc.replace("if (!pie && (parseFloat(acc.origAmount) || 0) <= 0", "if (false && (parseFloat(acc.origAmount) || 0) <= 0");

function renderModal(acc) {
  let captured = '';
  const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { captured = v; }, get innerHTML() { return captured; } });
  const doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
  const win = {};
  const gbt = () => ({ id: 'mortgage_x', title: 'Mortgage' });
  new Function('window', 'document', 'state', 'getBaseType', modalBody + '\n' + amortSrc)(win, doc, { accounts: [acc] }, gbt);
  win.openAmortizationModal(acc.id);
  return captured;
}

const NUDGE = 'the payoff pie needs it to split principal from interest';   // apostrophe-free slice (source escapes ' as \')
const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const blank = renderModal({ id: 'x', baseId: 'mortgage_a', value: 150000, minPmt: 500, addPmt: 50 });   // balance, no Original Amount
need('blank Original: nudge fills the pie gap (no silent blank)', blank.includes(NUDGE));
need('blank Original: no pie SVG (pie genuinely cannot draw)', !blank.includes('<svg'));

const filled = renderModal({ id: 'x', baseId: 'mortgage_a', origAmount: 200000, value: 150000, interestPaidToDate: 31000, intRate: 5.99, minPmt: 3000, addPmt: 50 });
need('filled Original: pie SVG renders', filled.includes('<svg'));
need('filled Original: nudge is gone', !filled.includes(NUDGE));

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
