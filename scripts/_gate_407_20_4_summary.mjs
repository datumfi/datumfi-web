/* DEV-ONLY red-first gate — #407 §20 Commit 4: the bottom-summary rework (§20.6 C216–C220).
   #380 — asserts the RENDERED summary, not the source. Same with(Proxy) sandbox as the other §20 gates.
     · C216/C220 authored hover TITLES ('The core payment' / "What's still ahead") replace the label-echo
     · C217 Total Monthly Escrow  + C218 Real Monthly Payment + the honesty beat — ONE hasEscrow gate
     · C219 Total Interest Paid — SOURCED-OR-BLANK off acc.interestPaidToDate, NEVER computed
     · glance order: Life-of-Loan (total due) → Total Interest Paid (paid) → Interest Remaining (remaining)
     · §20.4 SYNC: the Grounds mirror label matches the Moat's again
   The sourced-or-blank half is the one that matters, so it is tested from BOTH directions: blank field →
   the line is absent entirely (not $0), and the rendered figure must equal the field the user typed —
   never life-of-loan minus remaining, which is the #379 law break this line invites.
   --redfirst (a) drops the hasEscrow gate on the trio, (b) derives Total Interest Paid from
   lifeOfLoan − lifetimeInterest instead of the sourced field, (c) restores the pre-§20.6 glance order. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let src = readFileSync('studio.html', 'utf8');

if (RED) {
  src = src.replace("if (base.title !== 'Mortgage' || !hasEscrow(acc)) return '';", "if (base.title !== 'Mortgage') return '';");
  src = src.replace('var _paid = parseFloat(acc.interestPaidToDate) || 0;',
                    'var _paid = (_lol && li !== null) ? Math.max(0, _lol.intLife - li) : 0;');
  src = src.replace("if (_lol) _rows.push(['Life-of-Loan Interest'", "if (false) _rows.push(['Life-of-Loan Interest'");
}

const st = src.indexOf('window.openAccountModal = function(id)');
const en = src.indexOf('window.closeAccountModal');
let BUILDER = src.slice(st, en); BUILDER = BUILDER.slice(0, BUILDER.lastIndexOf('};') + 2);
function ex(s, n) { const i = s.indexOf('function ' + n + '('); if (i < 0) throw new Error('missing ' + n); let d = 0, b = false; for (let j = s.indexOf('{', i); j < s.length; j++) { if (s[j] === '{') { d++; b = true; } else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(i, j + 1); } } }
// The REAL engine behind these lines must be present, not auto-stubbed: this gate asserts FIGURES
// ($900 escrow, $3,650 real monthly, the sourced $31,684), and a stubbed hasEscrow/calculateEscrowMonthly
// would make every one of them meaningless — and would quietly disarm the sourced-or-blank tests.
const EXTRA = ['calculateTotalPmt', 'calculateEscrowMonthly', 'hasEscrow', '_escrowFooter', 'payoffMonths', '_payoffDateFrom',
  '_monthsBetween', 'lifeOfLoan', 'lifetimeInterest', 'acceleratedDelta', '_sumLbl', '_moatRealMonthlyHTML',
  '_payoffIntelHTML'].map(n => ex(src, n)).join('\n');

const BASES = {
  mortgage_primary: { id: 'mortgage_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'Mortgage', meta: 'The Moat' },
  heloc_primary:    { id: 'heloc_primary', type: 'primary', taxCode: 'debt', hasInterest: true, title: 'HELOC', meta: 'The Cellar' },
  property_primary: { id: 'property_primary', type: 'primary', taxCode: 'physical', title: 'Real Estate', meta: 'The Grounds' }
};
// $6,000 tax + $2,400 ins + $150/mo PMI + $600 other = $900.00/mo escrow exactly
const FULL = { id: 'm1', baseId: 'mortgage_primary', name: 'Moat', value: 300000, intRate: 3.99, minPmt: 2500, addPmt: 250,
  origAmount: 400000, origDate: '2015-01-01', maturityDate: '2045-01-01', nextPmtDate: '2026-08-01',
  propTaxAnnual: 6000, insAnnual: 2400, pmiMonthly: 150, mortgageOtherCost: 600, interestPaidToDate: 31684.35, isPriority: true, notes: '' };
const NOESC = { ...FULL, id: 'm2', propTaxAnnual: '', insAnnual: '', pmiMonthly: '', mortgageOtherCost: '' };
const NOPAID = { ...FULL, id: 'm3', interestPaidToDate: '' };
const HEL = { id: 'h1', baseId: 'heloc_primary', name: 'Cellar', value: 60000, intRate: 8, minPmt: 700, addPmt: 0, helocPhase: 'Repayment', maturityDate: '2040-01-01', nextPmtDate: '2026-08-01', notes: '' };
const PROP = { id: 'p1', baseId: 'property_primary', name: 'Grounds', value: 500000, propTaxYr: 6000, homeInsYr: 2400, notes: '' };
const ALL = [FULL, NOESC, NOPAID, HEL, PROP];

function render(accId) {
  let cap = null;
  const el = (id) => ({ id, style: {}, value: '', checked: false, classList: { add() {}, remove() {} },
    appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(v) { if (id === 'modal-dynamic-content') cap = v; }, get innerHTML() { return ''; } });
  const explicit = {
    document: { getElementById: el, createElement: () => el('new'), body: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] },
    window: { parseAgeFromDob: () => 52 }, state: { accounts: ALL },
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

const checks = [];
const need = (l, c) => checks.push([l, !!c]);
const M = render('m1'), NE = render('m2'), NP = render('m3'), H = render('h1'), P = render('p1');
const at = (h, s) => h.indexOf(s);
const before = (h, a, b) => at(h, a) >= 0 && at(h, b) >= 0 && at(h, a) < at(h, b);

// ── C216 / C220 — the authored hover titles replace the label echo ──
need('C216 hover TITLE "The core payment" wired', /<strong>The core payment<\/strong>/.test(M));
need('C216 body still verbatim', M.includes('Principal and interest only — the core of what you owe the lender each month, before taxes and insurance.'));
need('C220 hover TITLE "What\'s still ahead" wired', /<strong>What&#39;s still ahead<\/strong>|<strong>What's still ahead<\/strong>/.test(M));
need('C216 label no longer echoes itself as the title', !/<strong>Total Monthly Mortgage Payment<\/strong>/.test(M));
need('C220 label no longer echoes itself as the title', !/<strong>Remaining Mortgage Cost<\/strong>/.test(M));

// ── C217 / C218 — the escrow trio, one gate ──
need('C217 Total Monthly Escrow renders', M.includes('Total Monthly Escrow'));
need('C217 figure = $900/mo (6000/12 + 2400/12 + 150 + 600/12)', M.includes('>$900<'));
need('C217 hover body verbatim', M.includes('It is not paid to the lender as principal; it is money the lender collects and holds to pay these bills on your behalf.'));
need('C218 Real Monthly Payment renders', M.includes('Real Monthly Payment'));
need('C218 figure = $3,650 (core $2,750 + escrow $900)', M.includes('>$3,650<'));
need('C218 beat verbatim, tokens resolved', M.includes('Beyond principal and interest, taxes and insurance add about $900/mo — so your real monthly is around $3,650. That is the number that actually leaves your account.'));
need('C217/C218 sit between the core payment and the payoff date', before(M, 'Total Monthly Mortgage Payment', 'Total Monthly Escrow') && before(M, 'Real Monthly Payment', 'Expected Payoff Date'));
need('C217 figure agrees with the escrow footer to the penny (same engine)', /\$900\/mo in escrow/.test(M));
// the gate that matters: no escrow sourced → the WHOLE trio is silent, never "$0"
need('SOURCED-OR-BLANK: no escrow → Total Monthly Escrow ABSENT', !NE.includes('Total Monthly Escrow'));
need('SOURCED-OR-BLANK: no escrow → Real Monthly Payment ABSENT', !NE.includes('Real Monthly Payment'));
need('SOURCED-OR-BLANK: no escrow → the beat ABSENT (never "$0/mo")', !NE.includes('Beyond principal and interest'));
need('SOURCED-OR-BLANK: no escrow → the core payment still renders', NE.includes('Total Monthly Mortgage Payment'));
need('C217/C218 are Mortgage-only (absent on a HELOC)', !H.includes('Total Monthly Escrow') && !H.includes('Real Monthly Payment'));

// ── C219 — Total Interest Paid: SOURCED, never computed ──
need('C219 Total Interest Paid renders when the field is filled', M.includes('Total Interest Paid'));
need('C219 figure = the SOURCED $31,684 (not a derived number)', M.includes('>$31,684<'));
need('C219 hover body verbatim', M.includes('Interest you have already handed the lender since the loan began — the cost of borrowing, to date.'));
need('C219 SOURCED-OR-BLANK: blank field → the line is ABSENT (not $0)', !NP.includes('Total Interest Paid'));
// #379: life-of-loan minus remaining is a DIFFERENT basis — prove we did not use it
{
  const m = M.match(/Life-of-Loan Interest[\s\S]*?\$([\d,]+)</); const r = M.match(/Interest Remaining[\s\S]*?\$([\d,]+)</);
  const lol = m ? Number(m[1].replace(/,/g, '')) : 0, rem = r ? Number(r[1].replace(/,/g, '')) : 0;
  need('C219 is NOT life-of-loan minus remaining (#379 two-bases law)', Math.round(lol - rem) !== 31684);
}

// ── glance order: total due → total paid → remaining ──
need('ORDER: Life-of-Loan → Total Interest Paid', before(M, 'Life-of-Loan Interest', 'Total Interest Paid'));
need('ORDER: Total Interest Paid → Interest Remaining', before(M, 'Total Interest Paid', 'Interest Remaining'));
need('ORDER: Interest Remaining → Remaining Mortgage Cost', before(M, 'Interest Remaining', 'Remaining Mortgage Cost'));

// ── §20.4 SYNC — the mirrored figure reads the same on both surfaces ──
need('§20.4 SYNC: Grounds insurance label = "Annual Homeowner Insurance"', P.includes('Annual Homeowner Insurance'));
need('§20.4 SYNC: old Grounds label gone', !P.includes('Homeowners / Hazard Insurance (yr)'));

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('❌ RED-FIRST FAILED — gate dropped, paid-to-date derived, order reverted, and nothing bit.'); process.exit(1); }
  console.log('✅ RED-FIRST OK — ungated trio + a DERIVED paid-to-date + the old order all bite.'); process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN — the summary reads total due → paid → remaining, and every line is sourced.');
