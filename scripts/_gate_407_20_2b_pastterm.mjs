/* DEV-ONLY red-first gate — #407 §20.2b past-term beat (Architect rulings #436).

   When the contract's clock has fully run out while a balance remains, the from-inception table shows its last
   row at BALANCE $0 — years before today. The schedule literally runs out of road, and the screen says the loan
   finished when it did not. §20.2b names that.

   THE THREE RULINGS UNDER TEST:
     1  COMPLETE-only. Never in REMAINING — "your term has fully elapsed" is a BACKWARD-looking fact and
        REMAINING is a FORWARD projection; voicing it there misdescribes the number, the same error the §20.2a
        totals tag was kept off REMAINING to avoid.
     2  HARD MUTUAL EXCLUSION, §20.2b wins. Once the term has fully elapsed, "by today" and "over the full term"
        collapse onto one horizon, so the divergence note's hook stops being the live fact. Exactly one note
        occupies the slot — never both.
     3  STRICTLY past (elapsed > term), and only while there is still something to overshoot. At elapsed ===
        term a clean level schedule ends ON TIME; a loan that finished on schedule is the happy path.

   Everything is asserted on the RENDERED overlay (#380) — openAmortizationModal executed for BOTH modes and the
   captured innerHTML inspected, not a composer's return value in isolation.

   --redfirst runs SIX mutations, each anchored on a guard or a signature, never on copy text. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const RED = process.argv.includes('--redfirst');
const src = studioSource();

const A_STRICT = 'if (!(sched.elapsedRaw > sched.term)) return null;';
const A_BAL    = 'if ((parseFloat(acc.value) || 0) <= 0) return null;       // cleanly finished, nothing to overshoot';
const A_EXCL   = 'var dv = pastTerm ? null : _moatScheduleDivergence(acc, sched);';
const A_NOTE   = "if (!note && dv) note = '<div class=\"amort-diverge\">Heads up";
const A_SIG    = 'function _moatPastTermHTML(acc, sched) {';
const A_REMAIN = "schedule = `<div style=\"color: rgba(255,255,255,0.7); font-size:12px; margin-bottom:12px; line-height:1.5;\">Here's every payment from now to payoff";
for (const [n, a] of [['strict', A_STRICT], ['balance', A_BAL], ['exclusion', A_EXCL], ['note slot', A_NOTE],
                      ['signature', A_SIG], ['remaining branch', A_REMAIN]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}
const MUT = {
  i:   (b) => b.replace(A_STRICT, 'if (!(sched.elapsedRaw >= sched.term)) return null;'),      // fires AT term
  ii:  (b) => b.replace(A_BAL, ''),                                                            // fires on a finished loan
  iii: (b) => b.replace(A_REMAIN, A_REMAIN.replace('schedule = `', 'schedule = _moatPastTermHTML(acc, _moatInceptionSchedule(acc)) + `')), // leaks into REMAINING
  iv:  (b) => b.replace('rows, sched.orig, sched.totalInterest, sched.term',
                        'rows, sched.orig, (_moatPastTerm(acc, sched) ? 0 : sched.totalInterest), sched.term'), // moves a figure
  v:   (b) => b.replace(A_SIG, A_SIG + " return '';"),                                         // branch never fires
  // (vi) the mutual-exclusion breach: compute the divergence note even when past-term, then APPEND it rather
  // than yielding — so BOTH occupy the slot at once. Two structural edits, valid syntax either way.
  vi:  (b) => b.replace(A_EXCL, 'var dv = _moatScheduleDivergence(acc, sched);')
              .replace(A_NOTE, 'if (dv) note = note + \'<div class="amort-diverge">Heads up')
};

const deps = { getBaseType: () => ({ id: 'mortgage_joint', title: 'Mortgage' }) };
function build(mut) {
  let body = extractClosure(src, ['openAmortizationModal'], { exclude: ['getBaseType', 'state'] });
  if (mut) { const after = mut(body); if (after === body) throw new Error('mutation did not apply'); body = after; }
  return (acc, mode) => {
    let cap = '';
    const el = () => ({ style: {}, appendChild() {}, onclick: null, id: '', set innerHTML(v) { cap = v; }, get innerHTML() { return cap; } });
    const doc = { getElementById: () => null, createElement: () => el(), body: { appendChild() {} } };
    const win = {};
    new Function('window', 'document', 'state', 'getBaseType', body)(win, doc, { accounts: [acc] }, deps.getBaseType);
    win.openAmortizationModal(acc.id, mode);
    return cap;
  };
}

const BEAT_A = 'On this level schedule, your loan’s term has already come and gone — so a from-inception illustration runs out of road here.';
const BEAT_B = 'Your lender’s statement is the one that knows the real finish line. This table only ever showed the contract’s tidy version of the trip.';
const DIVERGE = 'Heads up — this schedule puts about';

// 20-year loan originated 2000 → term ended 2020, today is 2026: elapsed strictly > term.
const PAST     = { id: 'p', baseId: 'mortgage_joint', origAmount: '212111', intRate: 3.99, value: '17500',
                   origDate: '2000-01-01', maturityDate: '2020-01-01', minPmt: '1284' };
const PAST_SRC = { ...PAST, interestPaidToDate: '31684.35' };   // would otherwise trip the §20.2 divergence note
const DONE     = { ...PAST, value: '0' };                        // past term, finished cleanly
const INTERM   = { id: 'p', baseId: 'mortgage_joint', origAmount: '400000', intRate: 6, value: '300000',
                   origDate: '2019-01-01', maturityDate: '2049-01-01', minPmt: '2500', interestPaidToDate: '31684.35' };

// elapsed EXACTLY == term: origDate today-minus-term, maturity today. Built from the clock so it stays true.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const exactStart = new Date(now.getFullYear() - 20, now.getMonth(), 1);
const EXACT = { id: 'p', baseId: 'mortgage_joint', origAmount: '212111', intRate: 3.99, value: '17500',
                origDate: iso(exactStart), maturityDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
                minPmt: '1284' };

function run(render) {
  const c = []; const need = (l, v) => c.push([l, !!v]);
  const C = (a) => render(a, 'complete');
  const R = (a) => render(a, 'remaining');

  // fixture sanity — never assert against a mis-seeded account
  need('fixture sanity: PAST renders a table, EXACT is exactly on term',
    C(PAST).includes('<table') && C(EXACT).includes('<table'));

  // ── ruling 3: strictly past, and only with something to overshoot ──
  need('past term + balance → §20.2b renders verbatim', C(PAST).includes(BEAT_A) && C(PAST).includes(BEAT_B));
  need('§20.2b wears class="amort-diverge"', /class="amort-diverge">On this level schedule/.test(C(PAST)));
  need('elapsed EXACTLY == term → SILENT (a clean schedule ends on time)', !C(EXACT).includes(BEAT_A));
  need('past term but balance $0 → SILENT (finished cleanly, nothing to overshoot)', !C(DONE).includes(BEAT_A));
  need('in-term loan → SILENT', !C(INTERM).includes(BEAT_A));

  // ── ruling 1: COMPLETE-only ──
  need('REMAINING mode → §20.2b NEVER renders (backward fact over a forward number)', !R(PAST).includes(BEAT_A));
  need('REMAINING mode still renders its own schedule', R(PAST).includes('<table'));

  // ── ruling 2: hard mutual exclusion ──
  need('past term + SOURCED paid-to-date → §20.2b speaks and the §20.2 divergence note is ABSENT',
    C(PAST_SRC).includes(BEAT_A) && !C(PAST_SRC).includes(DIVERGE));
  need('in-term + SOURCED paid-to-date → the §20.2 divergence note still governs',
    C(INTERM).includes(DIVERGE) && !C(INTERM).includes(BEAT_A));
  need('exactly ONE note occupies the slot, never two',
    (C(PAST_SRC).match(/class="amort-diverge"/g) || []).length === 1);

  // ── LOAD-BEARING (#379): prose only. It may state the past-term fact; it may never move a figure. ──
  // PAST and DONE differ ONLY by acc.value, which the from-inception schedule never reads (it reconstructs from
  // origAmount/rate/term). So the beat fires for one and not the other while the table must be byte-identical:
  // that isolates the beat's effect on the table to exactly zero.
  const tbl = (h) => h.slice(h.indexOf('<table'));
  need('#379: table bytes BYTE-IDENTICAL with §20.2b firing and suppressed', tbl(C(PAST)) === tbl(C(DONE)));
  need('#379: the totals row is IDENTICAL with §20.2b firing and suppressed',
    /Totals[\s\S]*?<\/tfoot>/.exec(tbl(C(PAST)))[0] === /Totals[\s\S]*?<\/tfoot>/.exec(tbl(C(DONE)))[0]);
  need('#379: the beat fires for PAST and not for DONE (so the comparison above is not vacuous)',
    C(PAST).includes(BEAT_A) && !C(DONE).includes(BEAT_A));
  need('§20.2 caption still frames the table when §20.2b fires', C(PAST).includes('The whole loan, from day one'));
  need('§20.2a totals label still present when §20.2b fires',
    C(PAST).includes('Contract total — what the level schedule implies over the full term, not a paid-to-date.'));

  // ── voice ──
  need('voice: informs, never advises (no instruction, no refinance nudge)',
    !/\byou should\b|\byou must\b|\bwe recommend\b|refinanc/i.test(C(PAST)));
  need('no false-precise "N months over" figure (the statement owns the real finish line)',
    !/\d+ months (over|past|late)/i.test(C(PAST)));
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['i', 'ii', 'iii', 'iv', 'v', 'vi']) {
    let c;
    try { c = run(build(MUT[k])); }
    catch (e) { console.log('— mutation (' + k + ') —'); console.log('⛔ threw (counts as a bite): ' + e.message); total++; continue; }
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all six mutations bit');
  process.exit(0);
}

report('', run(build(null)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
