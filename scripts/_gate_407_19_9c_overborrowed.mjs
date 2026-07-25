/* DEV-ONLY red-first gate — #407 §19.9c over-borrowed pie note (Architect ruling #431).

   The debt pie's guard withholds the arc when balance > origAmount, and that is CORRECT: "Principal Paid"
   would be negative and there is no honest slice to draw (L47). The guard is untouched. What §19.9c adds is a
   note in the silence, on the SAME doctrine as §19.12 — a correct suppression must not read as broken.

   Gated PURELY on the data condition, never on the payoff state. That matters: the pie is state-blind (proven
   byte-identical under OK / NEGAM / NOPMT / GLACIAL), so gating on neg-am would mistake a correlation for a
   cause. This gate asserts the state-blindness directly, so a future edit cannot quietly couple the two.

   Proves (all on the RENDERED output, #380):
     balance > origAmount -> §19.9c note present, NO pie, and the §19.9b nudge does NOT also fire
     origAmount blank     -> §19.9b nudge unchanged, §19.9c silent (no double-up)
     normal (bal < orig)  -> pie present, both notes absent
     HELOC                -> neither note (its pie is excluded for a different reason, §17.2)
     state-blind          -> the balance>orig verdict is identical in all four payoff states

   --redfirst runs THREE mutations, each anchored on stable structure (a function signature or the data guard):
     (a) §19.9c gated on the payoff state instead of the data  -> state-blindness + presence checks bite
     (b) §19.9c branch never fires                             -> back to the bare blank
     (c) the two guards carelessly merged into one              -> the over-borrowed case gets the WRONG note

   NOTE on (c): the first draft dropped §19.9c's `_orig > 0` term expecting it to steal §19.9b's blank-Original
   case. It could not bite — §19.9b is evaluated FIRST, so branch ORDER already makes the cases exclusive and
   `_orig > 0` is belt-and-braces given that order. The mutation was unreachable, not the code wrong. Retargeted
   at the regression that can actually happen: someone collapses the two guards and the over-borrowed position
   gets handed the "add your Original Amount" nudge, which would be flatly false — the amount IS there. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');

function ex(s, n) {
  const st = s.indexOf('function ' + n + '(');
  if (st < 0) throw new Error('missing ' + n);
  let d = 0, b = false;
  for (let j = s.indexOf('{', st); j < s.length; j++) {
    if (s[j] === '{') { d++; b = true; }
    else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); }
  }
}

const FNS = ['_num', 'calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween',
             'lifeOfLoan', 'lifetimeInterest', '_sumLbl', '_debtDonutSVG', '_moatDebtPieHTML',
             '_moatPieBlockHTML', '_payoffIntelHTML'].map(n => ex(src, n));
const BASE = FNS.join('\n');

const A_19_9C = 'if (!pie && _orig > 0 && _bal > _orig && _isMortgage) {';
const A_19_9B = 'if (!pie && _orig <= 0 && _bal > 0 && _isMortgage) {';
for (const [nm, a] of [['§19.9c guard', A_19_9C], ['§19.9b guard', A_19_9B]]) {
  if (!BASE.includes(a)) throw new Error('red-first anchor missing (' + nm + ') — structure moved');
}
const MUT = {
  a: (b) => b.replace(A_19_9C, "if (!pie && payoffMonths(acc).code === 'NEGAM' && _isMortgage) {"),
  b: (b) => b.replace(A_19_9C, 'if (false) {'),
  c: (b) => b.replace(A_19_9B, 'if (!pie && _bal > _orig && _isMortgage) {')
};

function build(body) {
  const gbt = (baseId) => ({ id: String(baseId), title: String(baseId).indexOf('heloc') === 0 ? 'HELOC' : 'Mortgage' });
  return new Function('getBaseType', 'acceleratedDelta', 'hasEscrow', 'calculateEscrowMonthly',
    body + '\nreturn { _moatPieBlockHTML: _moatPieBlockHTML, _payoffIntelHTML: _payoffIntelHTML };'
  )(gbt, () => null, () => false, () => 0);
}

// VERBATIM against Mortgage Copy Bank C231 — typographic quotes (U+201C/U+201D) included, normalized #432.
const NOTE  = 'no “paid-down” slice to chart yet';
const NUDGE = 'the payoff pie needs it to split principal from interest';
const LEVER = 'Once the balance drops back under the starting amount, the picture fills in.';

// $400k original. Balance is the ONLY thing that moves between the three data cases.
const L = { baseId: 'mortgage_joint', origAmount: '400000', intRate: 6, minPmt: '2500',
            origDate: '2019-01-01', maturityDate: '2049-01-01', nextPmtDate: '2026-08-01' };
const OVER   = { ...L, value: '410000' };                      // borrowed past the original
const NORMAL = { ...L, value: '300000' };                      // ordinary paid-down position
const NOORIG = { ...L, origAmount: '', value: '300000' };       // §19.9b territory
const HELOC  = { ...L, baseId: 'heloc_primary', value: '410000' };

function run(api) {
  const P = (a) => api._moatPieBlockHTML(a);
  const c = []; const need = (l, v) => c.push([l, !!v]);

  const over = P(OVER);
  need('balance > original → §19.9c note renders verbatim', over.includes(NOTE) && over.includes(LEVER));
  need('balance > original → note wears class="moat-pie-nudge"', over.includes('class="moat-pie-nudge"'));
  need('balance > original → NO pie arc (guard untouched)', !over.includes('<svg'));
  need('balance > original → §19.9b nudge does NOT also fire (no double-voicing)', !over.includes(NUDGE));

  const noorig = P(NOORIG);
  need('origAmount blank → §19.9b nudge UNCHANGED', noorig.includes(NUDGE));
  need('origAmount blank → §19.9c stays silent (no double-up)', !noorig.includes(NOTE));

  const normal = P(NORMAL);
  need('normal position → pie renders, both notes absent',
    normal.includes('<svg') && !normal.includes(NOTE) && !normal.includes(NUDGE));

  need('HELOC → neither note (pie excluded for its own reason, §17.2)',
    !P(HELOC).includes(NOTE) && !P(HELOC).includes(NUDGE));

  // STATE-BLINDNESS — the whole point of the diagnosis. minPmt is the only thing that moves; the verdict
  // must not. 500 = NEGAM, 2500 = OK, '' = NOPMT, 1505 clears interest by ~$5 = GLACIAL.
  const states = ['500', '2500', '', '1505'];
  const overAll   = states.map(p => P({ ...OVER,   minPmt: p }).includes(NOTE));
  const normalAll = states.map(p => P({ ...NORMAL, minPmt: p }).includes('<svg'));
  need('state-blind: over-borrowed note fires in ALL FOUR payoff states', overAll.every(Boolean));
  need('state-blind: normal pie renders in ALL FOUR payoff states', normalAll.every(Boolean));

  // the note reaches the real modal body, above the schedule button
  const body = api._payoffIntelHTML('x', OVER);
  need('§19.9c note reaches the modal body above the schedule button',
    body.includes(NOTE) && body.indexOf(NOTE) < body.indexOf('VIEW AMORTIZATION SCHEDULE'));
  need('voice: informs, never advises (no instruction, no target number)',
    !/\byou should\b|\byou must\b|\bwe recommend\b|\bpay \$/i.test(over));
  return c;
}

let pass = 0, total = 0;
const report = (tag, c) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of c) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  let allBit = true;
  for (const k of ['a', 'b', 'c']) {
    const body = MUT[k](BASE);
    if (body === BASE) { console.error('❌ RED-FIRST FAILED — mutation ' + k + ' did not apply'); process.exit(1); }
    const c = run(build(body));
    report('mutation (' + k + ')', c);
    if (!c.some(([, ok]) => !ok)) { console.error('❌ RED-FIRST FAILED — mutation (' + k + ') did not bite'); allBit = false; }
  }
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!allBit) process.exit(1);
  console.log('✅ RED-FIRST OK — all three mutations bit');
  process.exit(0);
}

report('', run(build(BASE)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
