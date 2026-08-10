/* DEV-ONLY red-first gate — #407 §20.2 from-inception schedule (Commit 7, Architect rulings #434).

   The table reconstructs HISTORY from {origAmount, rate, term}, and a level schedule WILL disagree with a real
   lender statement — §19.2 proved it at cost ($44,202 computed vs $31,684.35 sourced). So:
     §20.2 CAPTION        frames it as an illustration of the contract, ABOVE the table, ALWAYS
     §20.2 DIVERGENCE     names BOTH figures when the gap clears MAX(2% of sourced, $250) — and NO delta
     §20.2a TOTALS LABEL  tags the computed lifetime total so it can't read as a paid-to-date
     TERM RULE            acc.termMonths WINS when set, else derived; NEVER writes back to maturityDate
     ELAPSED              capped at term (§20.2b past-term beat is HELD, deliberately not folded in here)

   THE LOAD-BEARING ASSERTION (#379): the note and the label may STATE the gap but must NEVER ALTER a figure.
   Proven by rendering the table with the note firing and with it suppressed and requiring the table bytes to be
   IDENTICAL — the guard as a test, not a comment.

   --redfirst runs FIVE mutations, each anchored on a signature or a guard, never on copy text. */
import { readFileSync } from 'node:fs';
import { extractClosure } from './_gate_extract.mjs';
import { studioSource } from './_studio_source.cjs';

const RED = process.argv.includes('--redfirst');
const src = studioSource();

const A_FLOOR = 'var floor = Math.max(sourced * 0.02, 250);';
const A_CAP   = 'var elapsed = Math.max(0, Math.min(elapsedRaw, term));';
const A_TERM  = 'function _moatTermMonths(acc) {';
const A_CAPT  = 'class="amort-caption"';
const A_LABEL = "'Contract total — what the level schedule implies over the full term, not a paid-to-date.'";
for (const [n, a] of [['floor', A_FLOOR], ['cap', A_CAP], ['term fn', A_TERM], ['caption', A_CAPT], ['totals label', A_LABEL]]) {
  if (!src.includes(a)) throw new Error('red-first anchor missing (' + n + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_FLOOR, 'var floor = 0;'),                                    // note fires on rounding noise
  b: (b) => b.replace(A_CAP, 'var elapsed = Math.max(0, elapsedRaw);'),              // runs off the end of the term
  c: (b) => b.replace(A_TERM, A_TERM + ' if (acc.maturityDate) return _monthsBetween(acc.origDate, acc.maturityDate);'), // dates beat Term
  d: (b) => b.replace(A_CAPT, 'class="amort-caption-DISABLED"'),                     // caption loses its chrome
  // the #379 breach: let the note "correct" the schedule by shifting the total toward the sourced figure
  e: (b) => b.replace('sched.orig, sched.totalInterest, sched.term',
                      'sched.orig, (dv ? dv.sourced : sched.totalInterest), sched.term')
};

const deps = {
  getBaseType: () => ({ id: 'mortgage_joint', title: 'Mortgage' }),
  state: { accounts: [] }
};
function build(mut) {
  let body = extractClosure(src, ['_amortCompleteBodyHTML', '_moatInceptionSchedule', '_moatScheduleDivergence',
                                  '_moatTermMonths', '_moatInceptionMissing'], { exclude: Object.keys(deps) });
  if (mut) { const after = mut(body); if (after === body) throw new Error('mutation did not apply'); body = after; }
  return new Function(...Object.keys(deps),
    body + '\nreturn { complete:_amortCompleteBodyHTML, sched:_moatInceptionSchedule, div:_moatScheduleDivergence,' +
    ' term:_moatTermMonths, missing:_moatInceptionMissing };')(...Object.values(deps));
}

const CAPTION = 'This is what your loan’s terms describe — the original amount, the rate, and the term, laid out as a level schedule: the same payment every month, start to finish, every one landing on time. It’s an illustration of the contract, not a record of what happened. Your lender’s statement is the record. Real payments come early, late, or larger than the minimum, and a level schedule can’t see any of that.';
const TITLE   = 'The whole loan, from day one';
const LABEL   = 'Contract total — what the level schedule implies over the full term, not a paid-to-date.';
const NOTE_A  = 'Heads up — this schedule puts about ';
const NOTE_B  = 'Both can be true at once: the schedule assumes every payment arrived on time and in the same amount, and your real payments carry timing it can’t see. The statement is the record of what happened; this table is what the contract implies.';

// A long-running loan so `elapsed` is real: originated 2019, 30-yr term, 6%.
const L0 = { id: 'x', baseId: 'mortgage_joint', origAmount: '400000', intRate: 6, value: '300000',
             origDate: '2019-01-01', maturityDate: '2049-01-01', minPmt: '2500', nextPmtDate: '2026-08-01' };

function run(api) {
  const L = JSON.parse(JSON.stringify(L0));   // fresh per run — a mutation must never leak between runs
  const c = []; const need = (l, v) => c.push([l, !!v]);
  const S = api.sched(L);

  need('fixture sanity: schedule builds, term 360, elapsed > 0 and < term',
    S && S.term === 360 && S.elapsed > 0 && S.elapsed < S.term);

  // ── caption: always, and ABOVE the table ──
  const out = api.complete(L);
  need('§20.2 caption renders verbatim', out.includes(CAPTION) && out.includes(TITLE));
  need('§20.2 caption wears class="amort-caption"', out.includes('class="amort-caption"'));
  need('§20.2 caption sits ABOVE the table (never a footnote)', out.indexOf(CAPTION) < out.indexOf('<table'));

  // ── §20.2a totals label ──
  need('§20.2a totals label renders verbatim', out.includes(LABEL));
  need('§20.2a label is adjacent to the totals row, inside the table foot',
    out.indexOf('Totals ·') < out.indexOf(LABEL) && out.indexOf(LABEL) < out.indexOf('</tfoot>'));
  need('§20.2a label absent from the REMAINING table (forward projection, not contract-implied)',
    !src.slice(src.indexOf('Here\'s every payment from now to payoff')).slice(0, 900).includes(LABEL));

  // ── divergence: floor behaviour, all three states ──
  const sourcedFar = { ...L, interestPaidToDate: '31684.35' };   // ~$12.5k off the reconstruction
  const farOut = api.complete(sourcedFar);
  need('divergence: gap beyond the floor → note speaks', farOut.includes(NOTE_A) && farOut.includes(NOTE_B));
  need('divergence: note names BOTH figures', farOut.includes('$31,684') && /about \$[\d,]+ of interest behind you/.test(farOut));
  need('divergence: NO delta printed (never a cross-base subtraction)',
    !/\$12,5\d\d/.test(farOut) && !/off by/i.test(farOut) && !/difference of/i.test(farOut));
  need('divergence: sourced ABSENT → silent (L47, no baseline to compare)', !api.complete(L).includes(NOTE_A));
  const near = { ...L, interestPaidToDate: String(Math.round(S.interestToDate)) };
  need('divergence: sourced present but WITHIN the floor → silent', !api.complete(near).includes(NOTE_A));
  const justOver = { ...L, interestPaidToDate: String(Math.round(S.interestToDate * 0.9)) };   // 10% off, clears 2%
  need('divergence: 10% gap clears the 2% floor → speaks', api.complete(justOver).includes(NOTE_A));
  need('floor is MAX(2%,$250): a tiny sourced figure uses the $250 leg, not 2% of a small number',
    api.div({ ...L, interestPaidToDate: '100' }, S) !== null);

  // ── THE LOAD-BEARING ONE (#379): prose may STATE the gap, never ALTER a figure ──
  const strip = (h) => h.slice(h.indexOf('<table'));
  need('#379: table bytes IDENTICAL with the note firing and suppressed', strip(farOut) === strip(out));
  need('#379: totals row IDENTICAL with and without the note',
    /Totals[\s\S]*?<\/tfoot>/.exec(strip(farOut))[0] === /Totals[\s\S]*?<\/tfoot>/.exec(strip(out))[0]);
  need('#379: the lifetime total is the COMPUTED figure, never the sourced one',
    strip(out).includes('$' + Math.round(S.totalInterest).toLocaleString('en-US')));

  // ── term rule ──
  need('TERM WINS when set: termMonths=180 overrides the 360 the dates imply', api.term({ ...L, termMonths: '180' }) === 180);
  need('TERM falls back to the dates when unset', api.term(L) === 360);
  need('TERM never writes back to maturityDate', (() => {
    const a = { ...L, termMonths: '180' }; const before = a.maturityDate; api.sched(a); return a.maturityDate === before;
  })());
  need('term change actually re-shapes the schedule (not just the number)', api.sched({ ...L, termMonths: '180' }).term === 180);

  // ── elapsed capped at term (§20.2b past-term HELD) ──
  const past = { ...L, origDate: '1980-01-01', maturityDate: '2010-01-01' };
  const pastS = api.sched(past);
  need('elapsed CAPPED at term on a past-term loan', pastS.elapsed === pastS.term && pastS.elapsedRaw > pastS.term);
  need('§20.2b HELD: no past-term sentence folded into this pass',
    !api.complete(past).includes('past its term') && !api.complete(past).includes('overdue'));

  // ── sourced-or-blank: the nudge NAMES the missing field ──
  need('missing Original Amount → nudge NAMES it, no table', (() => {
    const o = api.complete({ ...L, origAmount: '' });
    return o.includes('Original Amount') && !o.includes('<table');
  })());
  need('missing term AND dates → nudge names Term or Maturity', (() => {
    const o = api.complete({ ...L, maturityDate: '', termMonths: '' });
    return o.includes('Term (months)') && !o.includes('<table');
  })());
  need('a rate of zero is not treated as sourced', api.missing({ ...L, intRate: '' }) !== '');
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['a', 'b', 'c', 'd', 'e']) {
    let c;
    try { c = run(build(MUT[k])); }
    catch (e) { console.log('— mutation (' + k + ') —'); console.log('⛔ threw: ' + e.message); allBit = allBit && true; total++; continue; }
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all five mutations bit');
  process.exit(0);
}

report('', run(build(null)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
