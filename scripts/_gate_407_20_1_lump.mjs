/* DEV-ONLY red-first gate — #407 §20.1 lump-sum "what would extra do?" + §20.1a NEGAM silence (rulings #432).

   Three rulings under test, each with its own bite:
     GAP 1  the lump input is EPHEMERAL — modal state only, cleared on every open, NEVER written to acc JSON
     GAP 2  it takes its OWN one-time input; C211's extra-MONTHLY string is AUTHORED-NOT-WIRED, because §1.8
            already owns the recurring "extra $X/mo" fact and wiring C211 would restate it verbatim
     GAP 3  §20.1a — under NEGAM there is no finite baseline, so months/dollars saved cannot exist (#379);
            the figure is withheld and the authored note fills the slot it vacates

   Executes the REAL projection + render (#380) and asserts rendered output, verbatim against the copy of record
   (Mortgage Copy Bank C210 / C212 / C232), typographic quotes included.

   --redfirst runs FOUR mutations, each anchored on a function signature or a state literal, never on copy text:
     (a) the what-if is persisted to the account   -> ephemerality bites
     (b) §20.1a gated on any non-OK state          -> PAID/NOPMT/GLACIAL double-voice
     (c) the acc-clone subtracts across bases      -> a months-saved figure appears under NEGAM (#379 breach)
     (d) the §20.1a branch never fires             -> back to the bare blank */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const RED = process.argv.includes('--redfirst');
const src = studioSource();

const A_EPHEM = "_moatLumpWhatIf = window.enforceAmt(value);";
const A_NEGAM = "payoffMonths(acc).code === 'NEGAM'";
const A_BASE  = "if (base.code !== 'OK') return null;";
const A_NOTE  = 'class="moat-summary-note"';
for (const [n, a] of [['ephemeral edit', A_EPHEM], ['negam guard', A_NEGAM], ['baseline guard', A_BASE], ['note class', A_NOTE]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}

const deps = {
  getBaseType: () => ({ id: 'mortgage_joint', title: 'Mortgage' }),
  hasEscrow: () => false, calculateEscrowMonthly: () => 0,
  formatCurrencyDisplay: (v) => (v === '' || v == null ? '' : '$' + v),
  _dLbl: (b, lbl, sub, hov) => '<span class="input-label" title="' + hov + '">' + lbl + '</span>',
  document: { getElementById: () => null }, state: { accounts: [] }
};

function build(mutate) {
  let body = extractClosure(src, ['_moatLumpBlockHTML', '_moatLumpBodyHTML', '_moatLumpProjection'],
    { exclude: Object.keys(deps) });
  if (mutate) body = mutate(body);
  // window is a plain object here so the module's `window._moatLumpEdit = ...` assignment has somewhere to land
  const win = { enforceAmt: (v) => String(v).replace(/[^0-9.]/g, '') };
  return new Function(...Object.keys(deps), 'window',
    body + '\nreturn { block:_moatLumpBlockHTML, body:_moatLumpBodyHTML, proj:_moatLumpProjection,' +
    ' set:function(v){ _moatLumpWhatIf = v; }, get:function(){ return _moatLumpWhatIf; } };'
  )(...Object.values(deps), win);
}

const MUT = {
  a: (b) => b.replace('function _moatLumpProjection(acc, lump) {',
       'function _moatLumpProjection(acc, lump) { acc.lumpWhatIf = lump;'),      // persist it to the account
  b: (b) => b.replace(A_NEGAM, "payoffMonths(acc).code !== 'OK'"),                // leaks into PAID/NOPMT/GLACIAL
  // (c) the #379 breach, and it takes BOTH guards to reproduce it — the baseline check AND the null-interest
  // check. Removing only the first proved nothing: lifetimeInterest independently returns null on a non-OK
  // loan, so the projection still bailed and the mutation "bit" only via cross-fixture pollution. The realistic
  // regression is someone silencing the null with a `|| 0` fallback, which fabricates a figure from an infinite
  // baseline. Defence-in-depth in the code is good news; a negative control that leans on it is not.
  c: (b) => b.replace(A_BASE, 'if (false) return null;')
             .replace('if (baseLI === null || afterLI === null) return null;', 'baseLI = baseLI || 0; afterLI = afterLI || 0;'),
  d: (b) => b.replace(A_NOTE, 'class="moat-summary-note-DISABLED"')
};

// $400k orig / $300k balance / 6% -> interest is $1,500/mo, so the payment alone sets the state.
const L = { id: 'x', baseId: 'mortgage_joint', origAmount: '400000', value: '300000', intRate: 6,
            origDate: '2019-01-01', maturityDate: '2049-01-01', nextPmtDate: '2026-08-01' };
const F0 = {
  ok:      { ...L, minPmt: '2500' },
  negam:   { ...L, minPmt: '500' },
  nopmt:   { ...L, minPmt: '' },
  paid:    { ...L, minPmt: '2500', value: '0' },
  glacial: { ...L, minPmt: '1505' }
};

const RESULT_LEAD = 'A one-time $50,000 today clears the loan about';
const BRIDGE = 'Guaranteed, tax-free, equal to your 6% rate — that is what paying down returns. Compare it to what the same dollars might earn invested, and let the gap (not a rule of thumb) decide.';
const EMPTY  = 'Drop in a one-time lump, or an extra bit each month, and see exactly what it buys you — in months off the loan and dollars of interest you never pay.';
const NOTE   = 'Right now the balance is still growing, so there’s no steady payoff date to move yet — which means we can’t put a months-or-dollars number on a one-time payment. Get the payment above the point where the balance starts falling, and this projection comes to life.';
const C211   = 'Adding';   // the extra-MONTHLY string's opening word — must never appear in this block

function run(api) {
  // FRESH fixtures per run. Mutation (a) deliberately writes onto the account, and with shared objects that
  // pollution leaked into every later mutation — one real failure masquerading as four. Test isolation matters
  // as much here as anywhere: a bite must be attributable to the mutation that caused it.
  const F = JSON.parse(JSON.stringify(F0));
  const at = (acc, lump) => { api.set(lump); return api.body(acc); };
  const c = []; const need = (l, v) => c.push([l, !!v]);

  // fixture sanity — never assert against a mis-seeded account
  need('fixture sanity: OK / NEGAM / NOPMT / PAID / GLACIAL are the states claimed',
    api.proj(F.ok, '50000') !== null && api.proj(F.negam, '50000') === null &&
    api.proj(F.nopmt, '50000') === null && api.proj(F.paid, '50000') === null && api.proj(F.glacial, '50000') === null);

  // ── the projection itself ──
  const okOut = at(F.ok, '50000');
  need('OK loan → C212 result renders (one-time frame, verbatim lead)', okOut.includes(RESULT_LEAD));
  need('OK loan → pay-down-vs-invest bridge renders verbatim', okOut.includes(BRIDGE));
  need('OK loan → §20.1a note ABSENT', !okOut.includes(NOTE));
  const p = api.proj(F.ok, '50000');
  need('projection returns REAL figures (months + interest both > 0)', p.monthsSaved > 0 && p.interestSaved > 0);
  need('bridge is sourced-or-blank on its own token: no rate → no rate sentence',
    !at({ ...F.ok, intRate: '' }, '50000').includes('that is what paying down returns'));

  // ── GAP 1: ephemerality ──
  const acc = { ...F.ok };
  const before = JSON.stringify(acc);
  at(acc, '50000');
  need('GAP 1 ephemeral: projecting writes NOTHING to the account object', JSON.stringify(acc) === before);
  need('GAP 1 ephemeral: no lump key ever appears on the account',
    !Object.keys(acc).some(k => /lump/i.test(k)));
  need('GAP 1 ephemeral: openAccountModal clears the what-if on every open',
    /openAccountModal[\s\S]{0,600}_moatLumpWhatIf = '';/.test(src));
  need('GAP 1: blank input → empty state, no result block (L47)',
    at(F.ok, '').includes(EMPTY) && !at(F.ok, '').includes(RESULT_LEAD));
  need('GAP 1: cleared after a value → block returns to the empty state',
    (at(F.ok, '50000'), at(F.ok, '')).includes(EMPTY));

  // ── GAP 2: no §1.8 double-voice ──
  need('GAP 2: C211 extra-MONTHLY string is NOT wired in this block', !at(F.ok, '50000').includes(C211));
  need('GAP 2: block never reads addPmt (its own one-time input, not the recurring lever)',
    !/_moatLump(Projection|BodyHTML|BlockHTML)[\s\S]*?addPmt/.test(
      src.slice(src.indexOf('function _moatLumpProjection'), src.indexOf('function _payoffIntelHTML'))));
  need('GAP 2: §1.8 recurring beat still lives in _moatDI, untouched',
    /is doing real work — it pulls your payoff in by about/.test(src));

  // ── GAP 3: §20.1a, NEGAM only ──
  const neg = at(F.negam, '50000');
  need('GAP 3 NEGAM → §20.1a note renders verbatim (typographic quotes)', neg.includes(NOTE));
  need('GAP 3 NEGAM → note wears class="moat-summary-note"', neg.includes('class="moat-summary-note"'));
  need('GAP 3 NEGAM → NO months/dollars figure (#379: never subtract across bases)',
    !/\d+ months sooner/.test(neg) && !/saves around \$/.test(neg));
  for (const st of ['nopmt', 'paid', 'glacial']) {
    need('GAP 3 ' + st.toUpperCase() + ' → §20.1a ABSENT (keeps its own voice)', !at(F[st], '50000').includes(NOTE));
  }
  // The #379 case in its sharpest form: a lump large enough to make the CLONE amortize, while the BASELINE is
  // still infinite. A finite number minus an infinite one is undefined, not smaller — so the note must speak and
  // no figure may appear. (Both halves asserted; an `||` here would let the check pass on either alone.)
  const flip = at(F.negam, '250000');
  need('GAP 3: a lump that would flip NEGAM→OK still yields the note, never a fabricated figure',
    flip.includes(NOTE) && !/months sooner/.test(flip) && !/saves around \$/.test(flip));
  need('GAP 3: voice — informs, never advises', !/\byou should\b|\byou must\b|\bwe recommend\b/i.test(neg));

  // ── the input + panel reach the modal ──
  const blk = api.block('x', F.ok);
  need('input renders with the authored label + hover', blk.includes('One-time extra payment') &&
    blk.includes('This is a what-if — we show what it would buy you and change nothing on your account.'));
  need('panel header renders (C210)', blk.includes('What would extra do?'));
  need('result sits in its OWN container (typing cannot re-render the input)',
    blk.includes('id="modal-moat-lump-out-x"'));
  // NOTE: the mortgage-only guard reads getBaseType, which this harness injects as a constant 'Mortgage'. A
  // fixture swap alone therefore proves nothing — assert against a base that really reports HELOC.
  const helocApi = new Function(...Object.keys(deps).filter(k => k !== 'getBaseType'), 'getBaseType', 'window',
    extractClosure(src, ['_moatLumpBlockHTML'], { exclude: Object.keys(deps) }) + '\nreturn _moatLumpBlockHTML;'
  )(...Object.keys(deps).filter(k => k !== 'getBaseType').map(k => deps[k]),
    () => ({ id: 'heloc_primary', title: 'HELOC' }), { enforceAmt: (v) => v });
  need('HELOC gets NO lump panel at all (mortgage-only, returns empty)', helocApi('x', F.ok) === '');
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
    const c = run(build(MUT[k]));
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all four mutations bit');
  process.exit(0);
}

report('', run(build(null)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
