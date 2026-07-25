/* DEV-ONLY red-first gate — #407 §20 Commit 2: the display-only reorders + renames.
   #380 — asserts the RENDERED modal, not the source. Same with(Proxy) sandbox as _gate_407_20_9: it
   EXECUTES the real openAccountModal builder, captures what it writes to #modal-dynamic-content, and
   checks emitted ORDER and emitted LABELS. Covers all six items:
     #2a Next Payment Date renders ABOVE Minimum Payment
     #3  escrow: Monthly PMI ↔ Homeowners Insurance swapped (Tax · PMI / Insurance · Other)
     #4a 'Homeowners / Hazard Insurance (yr)' → 'Annual Homeowner Insurance' + R214 hover
     #6a 'Total Monthly Payment' → 'Total Monthly Mortgage Payment' + R216 hover
     #6b 'Remaining Cost' → 'Remaining Mortgage Cost' + R220 hover
     #8  the pay-down-vs-invest panel renders under the payment fields, ABOVE the escrow section
   Plus the scope guards that matter: both §6 renames are Mortgage-only (a HELOC must NOT say "Mortgage"),
   the neg-am notice still sits directly under the payment row, and the escrow value bindings did not
   travel with the labels during the swap.
   --redfirst restores the pre-#20 layout/labels and every ordering + label assertion must bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

const st = src.indexOf('window.openAccountModal = function(id)');
const en = src.indexOf('window.closeAccountModal');
if (st < 0 || en < 0) throw new Error('openAccountModal anchors not found — re-ground by content');
let BUILDER = src.slice(st, en);
BUILDER = BUILDER.slice(0, BUILDER.lastIndexOf('};') + 2);
// _payoffIntelHTML + _sumLbl live outside the builder; pull them in so the summary block really renders
function ex(s, n) { const i = s.indexOf('function ' + n + '('); if (i < 0) throw new Error('missing ' + n); let d = 0, b = false; for (let j = s.indexOf('{', i); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(i, j + 1); } } }
// §20.7 moved the escrow inputs out of the builder into a data-driven renderer, so the REAL escrow
// functions have to come with it — stubbed, the escrow half of this gate would assert against a marker.
function escrowSrc(s) {
  const rows = s.slice(s.indexOf('var _MOAT_ESCROW_ROWS = '), s.indexOf('// stored (canonical) -> displayed'));
  const edit = s.slice(s.indexOf('window._moatEscrowEdit = function'), s.indexOf('// The control is the Living Ledger'));
  const set = s.slice(s.indexOf('window._setMoatEscrowView = function'), s.indexOf('function _moatEscrowToggleHTML'));
  return ["var _moatEscrowView = 'yr';", rows, edit, set].join('\n');
}
let ESCROW = escrowSrc(src);
if (RED) {   // pre-§20 escrow: PMI above insurance, and the old insurance label
  ESCROW = ESCROW.replace(/(\{ f: 'pmiMonthly'[\s\S]*?\},\n)(\s*\{ f: 'insAnnual'[\s\S]*?\},\n)/, '$2$1')
                 .replace("lblYr: 'Annual Homeowner Insurance'", "lblYr: 'Homeowners / Hazard Insurance (yr)'");
}
const EXTRA = [ESCROW, ...['_num', 'formatCurrencyDisplay', '_dLbl', 'hasEscrow', 'calculateEscrowMonthly',
  '_moatEscrowToView', '_moatEscrowToStore', '_moatEscrowToggleHTML', '_moatEscrowFieldsHTML',
  '_sumLbl', '_payoffIntelHTML'].map(n => ex(src, n))].join('\n');

function mutate(b) {
  if (!RED) return b;
  let o = b;
  const swap = (a, z) => { if (o.indexOf(a) < 0) throw new Error('--redfirst: cannot find ' + a.slice(0, 60)); o = o.replace(a, z); };
  // #2a — put Next Payment Date back BELOW the Min/Additional row
  // NOTE: this row's markup changed in Commit 3 (Term (months) joined it and the single-column style went
  // conditional), which broke the old literal match — anchor on the row's OPENING, not its attributes.
  const nextRow = o.match(/            <div class="field-row"[^\n]*>\n                <div>\$\{_dLbl\(base, 'Next Payment Date'[\s\S]*?\n            <\/div>\n/);
  if (!nextRow) throw new Error('--redfirst: cannot find the Next Payment Date row');
  o = o.replace(nextRow[0], '');
  const negam = "            ${base.title === 'HELOC' ? `<div id=\"modal-heloc-draw-${id}\">${_helocDrawInlineHTML(acc)}</div>` : ''}`;";
  swap(negam, "            ${base.title === 'HELOC' ? `<div id=\"modal-heloc-draw-${id}\">${_helocDrawInlineHTML(acc)}</div>` : ''}\n" + nextRow[0].replace(/\n$/, '') + '`;');
  // #3 + #4a are now reverted in escrowSrc() above — the escrow rows live outside the builder (§20.7).
  // #6a — restore the old summary label (and drop its hover)
  swap("base.title === 'Mortgage' ? 'Total Monthly Mortgage Payment' : 'Total Monthly Payment'", "'Total Monthly Payment'");
  // #8 — move the pay-down panel back to the bottom of the debt branch
  const panelStart = o.indexOf('            // §20 #8 — the pay-down-vs-invest panel moves UP');
  const panelEnd = o.indexOf('            // §0.3/§0.3b/§4.1 ESCROW');
  if (panelStart < 0 || panelEnd < 0) throw new Error('--redfirst: cannot find the moved panel');
  const panel = o.slice(panelStart, panelEnd);
  o = o.slice(0, panelStart) + o.slice(panelEnd);
  const tail = "        } else if (base.taxCode === 'physical' && !base.id.includes('collectibles')) {";
  o = o.replace(tail, panel + tail);
  return o;
}
// the summary-block renames live outside the builder too
function mutateExtra(e) {
  if (!RED) return e;
  return e.replace("_base.title === 'Mortgage' ? 'Remaining Mortgage Cost' : 'Remaining Cost'", "'Remaining Cost'");
}

const BASES = {
  mortgage_primary: { id: 'mortgage_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'Mortgage', meta: 'The Moat' },
  heloc_primary:    { id: 'heloc_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'HELOC', meta: 'The Cellar' }
};
const ACCTS = [
  { id: 'm1', baseId: 'mortgage_primary', name: 'Moat', value: 300000, intRate: 3.99, minPmt: 2500, addPmt: 0, origAmount: 400000, origDate: '2015-01-01', maturityDate: '2045-01-01', nextPmtDate: '2026-08-01', propTaxAnnual: 4800, insAnnual: 1800, pmiMonthly: 120, mortgageOtherCost: 300, notes: '' },
  { id: 'h1', baseId: 'heloc_primary', name: 'Cellar', value: 60000, intRate: 8, minPmt: 700, addPmt: 0, helocPhase: 'Repayment', maturityDate: '2040-01-01', nextPmtDate: '2026-08-01', notes: '' }
];

function render(builder, extra, accId) {
  let cap = null;
  const el = (id) => ({ id, style: {}, value: '', checked: false, classList: { add() {}, remove() {} },
    appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(v) { if (id === 'modal-dynamic-content') cap = v; }, get innerHTML() { return ''; } });
  const explicit = {
    document: { getElementById: el, createElement: () => el('new'), body: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] },
    window: { parseAgeFromDob: () => 52 }, state: { accounts: ACCTS },
    getBaseType: (b) => BASES[b] || BASES.mortgage_primary,
    _fetchLivePrime: () => ({ then: () => {} }), activeModalId: null, console
  };
  // strings are collected RECURSIVELY — _diWhyPanel takes [[title, body]], so a top-level filter would
  // silently drop the very copy this gate has to prove is verbatim.
  const strs = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(x => strs(x, out)); return out; };
  const mk = (name) => { const f = (...a) => '«' + name + '(' + strs(a).join('|') + ')»'; f.toString = () => '«' + name + '»'; return f; };
  const scope = new Proxy({}, {
    has: () => true,
    get(t, k) { if (k === Symbol.unscopables) return undefined; const s = String(k);
      if (s in explicit) return explicit[s]; if (s in t) return t[s];
      if (s in globalThis) return globalThis[s]; return mk(s); },
    set(t, k, v) { t[String(k)] = v; return true; }
  });
  new Function('__s__', 'with(__s__){' + extra + '\n' + builder + '}')(scope);
  explicit.window.openAccountModal(accId);
  if (cap == null) throw new Error('builder never wrote #modal-dynamic-content');
  return cap;
}

const checks = [];
const need = (l, c) => checks.push([l, !!c]);
const M = render(mutate(BUILDER), mutateExtra(EXTRA), 'm1');
const H = render(mutate(BUILDER), mutateExtra(EXTRA), 'h1');
const at = (h, s) => h.indexOf(s);
const before = (h, a, b) => at(h, a) >= 0 && at(h, b) >= 0 && at(h, a) < at(h, b);

// ── #2a — Next Payment Date above Minimum Payment (shared debt block: Mortgage AND HELOC) ──
need('#2a Mortgage: Next Payment Date renders ABOVE Minimum Payment', before(M, 'Next Payment Date', 'Minimum Payment'));
need('#2a HELOC: same reorder (shared debt block, not forked)', before(H, 'Next Payment Date', 'Minimum Payment'));
need('#2a Mortgage: Additional Payment still beside Minimum Payment', before(M, 'Minimum Payment', 'Additional Payment'));
need('#2a Mortgage: neg-am notice still sits directly under the payment row', before(M, 'Additional Payment', 'modal-moat-negam-m1'));

// ── #3 — escrow swap: Property Tax · Monthly PMI / Annual Homeowner Insurance · Other ──
// §20.7 note: in the DEFAULT /yr view the PMI row wears its converted label 'PMI (yr)' (the /mo view is
// where it reads 'Monthly PMI') — the POSITION under test is unchanged, only the unit-correct wording.
need('#3 escrow order: Property Tax → PMI', before(M, 'Property Tax (yr)', 'PMI (yr)'));
need('#3 escrow order: PMI → Annual Homeowner Insurance', before(M, 'PMI (yr)', 'Annual Homeowner Insurance'));
need('#3 escrow order: Annual Homeowner Insurance → Other (yr)', before(M, 'Annual Homeowner Insurance', 'Other (yr)'));
// The swap moved LABELS — the value bindings must not have travelled with them. Rows are index-bound now
// (_moatEscrowEdit(id, ROW, …)), so resolve each field's index from the row table and assert the label
// that renders sits on THAT row: a label/field mix-up still fails, exactly as before.
const rowIdx = (f) => (ESCROW.match(/\{ f: '([a-zA-Z]+)'/g) || []).map(s => s.slice(6, -1)).indexOf(f);
need('#3 PMI label still bound to pmiMonthly', new RegExp("PMI \\(yr\\)[\\s\\S]{0,900}?_moatEscrowEdit\\('m1', " + rowIdx('pmiMonthly') + ",").test(M));
need('#3 insurance label still bound to insAnnual', new RegExp("Annual Homeowner Insurance[\\s\\S]{0,900}?_moatEscrowEdit\\('m1', " + rowIdx('insAnnual') + ",").test(M));

// ── #4a — rename + the R214 hover, verbatim ──
need('#4a old label "Homeowners / Hazard Insurance (yr)" is GONE from the Moat', !M.includes('Homeowners / Hazard Insurance (yr)'));
need('#4a new label "Annual Homeowner Insurance" renders', M.includes('Annual Homeowner Insurance'));
need('#4a R214 hover verbatim', M.includes('We spread it across twelve months for the escrow view, so the monthly figure and the yearly figure always tell the same story.'));

// ── #6a/#6b — the two summary renames + hovers, Mortgage-scoped ──
need('#6a "Total Monthly Mortgage Payment" renders on the Mortgage', M.includes('Total Monthly Mortgage Payment'));
need('#6a R216 hover verbatim', M.includes('Principal and interest only — the core of what you owe the lender each month, before taxes and insurance.'));
need('#6a HELOC keeps the generic "Total Monthly Payment" (never says Mortgage)', H.includes('Total Monthly Payment') && !H.includes('Total Monthly Mortgage Payment'));
need('#6b "Remaining Mortgage Cost" renders on the Mortgage', M.includes('Remaining Mortgage Cost'));
need('#6b R220 hover verbatim', M.includes('Pay it off today and this is the number you would make disappear.'));
need('#6b HELOC keeps the generic "Remaining Cost"', H.includes('Remaining Cost') && !H.includes('Remaining Mortgage Cost'));
// the hover must not squeeze the figure out of the flex row (width:100% would)
need('#6 summary hover wrapper is width:auto (figure keeps its room)', /modal-tt-wrap[^>]*width:auto/.test(M));

// ── #8 — pay-down panel under the payment fields, above escrow ──
const PANEL = 'Should you pay it down, or invest the difference?';
need('#8 panel renders under the Additional Payment field', before(M, 'Additional Payment', PANEL));
need('#8 panel renders ABOVE the escrow section', before(M, PANEL, '🏦 Escrow — the monthly bundle'));
need('#8 panel renders ABOVE the summary block', before(M, PANEL, 'Total Monthly Mortgage Payment'));
need('#8 panel still Mortgage-only (absent on HELOC)', !H.includes(PANEL));
need('#8 panel copy unchanged (verbatim §15 R70)', M.includes('for some people, owning the home free and clear is worth more than the last dollar of return'));

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('❌ RED-FIRST FAILED — the old layout/labels restored and nothing bit.'); process.exit(1); }
  console.log('✅ RED-FIRST OK — the pre-§20 layout makes the gate bite.'); process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — §20 Commit 2 reorders + renames all render.');
