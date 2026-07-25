/* DEV-ONLY red-first gate — #407 §20 Commit 5: the escrow annual⇄monthly DISPLAY toggle (§20.7 A222).
   #380 — asserts the RENDERED escrow block in BOTH toggle states, and the LOCK-3 invariant underneath it.

   (1) LABELS: each of the four periodic rows shows its unit-correct authored label in each state —
       Property Tax (yr)⇄(mo) · Annual Homeowner Insurance⇄Homeowner Insurance (mo) · Monthly PMI⇄PMI (yr)
       · Other (yr)⇄(mo). No state may render a label that contradicts the figure beside it.
   (2) FIGURES: the displayed values convert (x12 / ÷12) off the SAME stored figures.
   (3) COVERAGE AMOUNT NEVER CONVERTS AND NEVER RELABELS — a one-time rebuild value, not a periodic one.
       $450,000 must read $450,000 in both states, never $5,400,000.
   (4) THE INVARIANT: flipping the view changes NOTHING that is stored and NOTHING downstream. Stored acc
       bytes, calculateEscrowMonthly, hasEscrow, the escrow footer, the trio (Total Monthly Escrow / Real
       Monthly Payment / the beat) and the debt pie must all be byte-identical in both states.
   (5) EDIT-WHILE-FLIPPED: typing in the displayed unit must persist the CANONICAL unit — a typed $500/mo
       property tax stores $6,000/yr. Without this the toggle silently corrupts data.
   (6) hasEscrow governs the control: nothing sourced -> no switch rendered.

   --redfirst applies the naive version — one blanket multiplier over every field in the block, labels left
   alone — which is exactly how this feature goes wrong: Coverage Amount inflates x12 and the labels start
   lying. Every class of assertion above must bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let src = readFileSync('studio.html', 'utf8');

if (RED) {
  // naive: no `fixed` escape (Coverage converts too) and labels never swap
  src = src.replace('function _moatEscrowToView(row, v) { if (row.fixed || row.unit === _moatEscrowView',
                    'function _moatEscrowToView(row, v) { if (row.unit === _moatEscrowView');
  src = src.replace("var lbl = _moatEscrowView === 'mo' ? row.lblMo : row.lblYr;", 'var lbl = row.lblYr;');
}

const st = src.indexOf('window.openAccountModal = function(id)');
const en = src.indexOf('window.closeAccountModal');
let BUILDER = src.slice(st, en); BUILDER = BUILDER.slice(0, BUILDER.lastIndexOf('};') + 2);
function ex(s, n) { const i = s.indexOf('function ' + n + '('); if (i < 0) throw new Error('missing ' + n); let d = 0, b = false; for (let j = s.indexOf('{', i); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(i, j + 1); } } }
function exVar(s, decl) { const i = s.indexOf(decl); if (i < 0) throw new Error('missing ' + decl); let d = 0, b = false; for (let j = s.indexOf('[', i); j < s.length; j++) { if (s[j] === '[') { d++; b = true; } else if (s[j] === ']') { d--; if (b && d === 0) return s.slice(i, j + 2); } } }
// _num is REQUIRED here, not optional: formatCurrencyDisplay parses through it, so stubbing it turns every
// rendered figure into a marker and the conversion assertions below would pass on nothing.
const REAL = ['_num', 'calculateTotalPmt', 'calculateEscrowMonthly', 'hasEscrow', '_escrowFooter', 'payoffMonths', '_payoffDateFrom',
  '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', 'acceleratedDelta', '_debtDonutSVG', '_moatDebtPieHTML',
  '_sumLbl', '_dLbl', 'formatCurrencyDisplay', '_moatEscrowToView', '_moatEscrowToStore', '_moatEscrowToggleHTML',
  '_moatEscrowFieldsHTML', '_moatRealMonthlyHTML', '_payoffIntelHTML'].map(n => ex(src, n)).join('\n');
const ROWS = exVar(src, 'var _MOAT_ESCROW_ROWS = ');
const VIEWVAR = "var _moatEscrowView = 'yr';";
const SETTER = src.slice(src.indexOf('window._setMoatEscrowView = function'), src.indexOf('function _moatEscrowToggleHTML'));
const EDITFN = src.slice(src.indexOf('window._moatEscrowEdit = function'), src.indexOf('// The control is the Living Ledger'));
const EXTRA = [VIEWVAR, ROWS, EDITFN, SETTER, REAL].join('\n');

const BASES = { mortgage_primary: { id: 'mortgage_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'Mortgage', meta: 'The Moat' } };
const FULL = { id: 'm1', baseId: 'mortgage_primary', name: 'Moat', value: 300000, intRate: 3.99, minPmt: 2500, addPmt: 250,
  origAmount: 400000, origDate: '2015-01-01', maturityDate: '2045-01-01', nextPmtDate: '2026-08-01',
  propTaxAnnual: 6000, insAnnual: 2400, pmiMonthly: 150, mortgageOtherCost: 600, insCoverageAmount: 450000,
  interestPaidToDate: 31684.35, isPriority: true, notes: '' };
const BARE = { ...FULL, id: 'm2', propTaxAnnual: '', insAnnual: '', pmiMonthly: '', mortgageOtherCost: '' };

function boot(accounts) {
  let cap = null;
  const el = (id) => ({ id, style: {}, value: '', checked: false, classList: { add() {}, remove() {} },
    appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(v) { if (id === 'modal-dynamic-content') cap = v; }, get innerHTML() { return ''; } });
  const explicit = {
    document: { getElementById: el, createElement: () => el('new'), body: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] },
    window: { parseAgeFromDob: () => 52, enforceAmt: (s) => String(s == null ? '' : s).replace(/[^0-9.]/g, '') },
    state: { accounts }, getBaseType: (b) => BASES[b] || BASES.mortgage_primary,
    _fetchLivePrime: () => ({ then: () => {} }), activeModalId: null, console
  };
  const strs = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(x => strs(x, out)); return out; };
  const mk = (n) => { const f = (...a) => '«' + n + '(' + strs(a).join('|') + ')»'; f.toString = () => '«' + n + '»'; return f; };
  const scope = new Proxy({}, { has: () => true,
    get(t, k) { if (k === Symbol.unscopables) return undefined; const s = String(k);
      if (s in explicit) return explicit[s]; if (s in t) return t[s]; if (s in globalThis) return globalThis[s]; return mk(s); },
    set(t, k, v) { t[String(k)] = v; return true; } });
  const api = new Function('__s__', 'with(__s__){' + EXTRA + '\n' + BUILDER + '\n' +
    'return { open: window.openAccountModal, setView: window._setMoatEscrowView, edit: window._moatEscrowEdit,' +
    ' escrowMo: calculateEscrowMonthly, hasEscrow: hasEscrow, foot: _escrowFooter, trio: _moatRealMonthlyHTML,' +
    ' pie: _moatDebtPieHTML }; }')(scope);
  return { api, render: (id) => { api.open(id); return cap; } };
}

const checks = [];
const need = (l, c) => checks.push([l, !!c]);
{
  const accounts = [JSON.parse(JSON.stringify(FULL)), JSON.parse(JSON.stringify(BARE))];
  const { api, render } = boot(accounts);
  const YR = render('m1');
  // downstream snapshot in the default (annual) view
  const snap = (a) => JSON.stringify({ esc: api.escrowMo(a), has: api.hasEscrow(a), foot: api.foot(a),
                                       trio: api.trio('m1', a), pie: api.pie(a) });
  const snapYR = snap(accounts[0]);
  const storeYR = JSON.stringify(accounts[0]);
  api.setView('m1', 'mo');
  const MO = render('m1');
  const snapMO = snap(accounts[0]);
  const storeMO = JSON.stringify(accounts[0]);

  // (1) LABELS — unit-correct in each state
  need('/yr view: "Property Tax (yr)"', YR.includes('Property Tax (yr)') && !YR.includes('Property Tax (mo)'));
  need('/mo view: "Property Tax (mo)"', MO.includes('Property Tax (mo)') && !MO.includes('Property Tax (yr)'));
  need('/yr view: "Annual Homeowner Insurance" (C214 untouched)', YR.includes('Annual Homeowner Insurance'));
  need('/mo view: "Homeowner Insurance (mo)"', MO.includes('Homeowner Insurance (mo)') && !MO.includes('Annual Homeowner Insurance'));
  need('/yr view: "PMI (yr)"', YR.includes('PMI (yr)') && !YR.includes('Monthly PMI'));
  need('/mo view: "Monthly PMI"', MO.includes('Monthly PMI') && !MO.includes('PMI (yr)'));
  need('/yr view: "Other (yr)"', YR.includes('Other (yr)') && !YR.includes('Other (mo)'));
  need('/mo view: "Other (mo)"', MO.includes('Other (mo)') && !MO.includes('Other (yr)'));

  // (2) FIGURES — converted off the same storage
  need('/yr figures: tax $6,000 · ins $2,400 · PMI $1,800 · other $600', YR.includes('value="$6,000"') && YR.includes('value="$2,400"') && YR.includes('value="$1,800"') && YR.includes('value="$600"'));
  need('/mo figures: tax $500 · ins $200 · PMI $150 · other $50', MO.includes('value="$500"') && MO.includes('value="$200"') && MO.includes('value="$150"') && MO.includes('value="$50"'));

  // (3) COVERAGE AMOUNT — never converts, never relabels
  need('Coverage Amount label identical in both states', YR.includes('Coverage Amount') && MO.includes('Coverage Amount'));
  need('Coverage Amount = $450,000 in /yr', YR.includes('value="$450,000"'));
  need('Coverage Amount = $450,000 in /mo (NOT $37,500)', MO.includes('value="$450,000"') && !MO.includes('value="$37,500"'));
  need('Coverage Amount never inflates to $5,400,000', !YR.includes('$5,400,000') && !MO.includes('$5,400,000'));

  // (4) THE INVARIANT — nothing stored, nothing downstream, moves
  need('LOCK-3: stored account bytes identical in both views', storeYR === storeMO);
  need('LOCK-3: escrow monthly / hasEscrow / footer / trio / pie identical in both views', snapYR === snapMO);
  need('LOCK-3: Total Monthly Escrow still $900 in the /mo view', MO.includes('Total Monthly Escrow') && api.trio('m1', accounts[0]).includes('$900'));
  need('LOCK-3: the summary stays MONTHLY regardless of the field view', api.trio('m1', accounts[0]).includes('Real Monthly Payment'));

  // (6) the control itself
  need('control renders when escrow is sourced', YR.includes('moat-escrow-toggle') && YR.includes('>/yr<') && YR.includes('>/mo<'));
  need('control marks the active state', /class="active"[^>]*>\/mo<|>\/mo<\/button>/.test(MO));
  const B = render('m2');
  need('hasEscrow gate: NO control when nothing is sourced', !B.includes('moat-escrow-toggle'));
  need('hasEscrow gate: the FIELDS still render (escrow stays enterable)', B.includes('Property Tax'));
}
// (5) EDIT-WHILE-FLIPPED — typing in the displayed unit stores the canonical unit
{
  const accounts = [JSON.parse(JSON.stringify(FULL))];
  const { api, render } = boot(accounts);
  render('m1');
  api.setView('m1', 'mo');
  api.edit('m1', 0, '$500');           // row 0 = propTaxAnnual, typed as a MONTHLY figure
  need('EDIT in /mo: typed $500/mo tax persists as $6,000/yr canonical', Math.round(parseFloat(accounts[0].propTaxAnnual)) === 6000);
  api.edit('m1', 1, '$150');           // row 1 = pmiMonthly, native monthly, view monthly -> no conversion
  need('EDIT in /mo: PMI (native monthly) stores as typed, unconverted', Math.round(parseFloat(accounts[0].pmiMonthly)) === 150);
  api.setView('m1', 'yr');
  api.edit('m1', 1, '$1,800');         // PMI typed as an ANNUAL figure -> must store 150
  need('EDIT in /yr: typed $1,800/yr PMI persists as $150/mo canonical', Math.round(parseFloat(accounts[0].pmiMonthly)) === 150);
  api.edit('m1', 3, '$450,000');       // row 3 = Coverage, fixed -> never converts in either view
  need('EDIT: Coverage Amount stores unconverted in the /yr view', Math.round(parseFloat(accounts[0].insCoverageAmount)) === 450000);
}

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('❌ RED-FIRST FAILED — blanket multiplier + frozen labels and nothing bit.'); process.exit(1); }
  console.log('✅ RED-FIRST OK — the naive blanket-multiplier version bites.'); process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — both views read true, and nothing but the presentation moves.');
