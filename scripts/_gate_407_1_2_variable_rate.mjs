/* DEV-ONLY red-first gate — #407 §1.2 VARIABLE-RATE MOVE BEAT (Architect ruling, Prompt #429).
   §19.5 cut ① dropped the old "This loan runs X% APR" restatement AND, unintentionally, the Variable half
   with it — the DI stopped saying in prose that a variable rate can move. Only the Variable half is restored.

   Executes the REAL _moatDI and asserts the RENDERED beat (#380), not the presence of a source string:
     · rateType Variable        -> the verbatim beat is PRESENT
     · rateType Fixed           -> ABSENT
     · rateType untouched/blank -> ABSENT (L47 sourced-or-blank + the default-select trap)
     · rate blank, type Variable-> ABSENT (no rate = no rate story)
     · the APR restatement stays CUT (§19.5 ① is not undone)

   --redfirst runs TWO mutations, both anchored on the FUNCTION NAME (stable structure, not a copy literal):
     (a) _moatRateMoves -> always true  : the three ABSENCE assertions must bite
     (b) _moatRateMoves -> always false : the PRESENCE assertion must bite
   If either mutation leaves the suite green, the negative control is unexercised and the gate FAILS. */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
const src = studioSource();

function ex(s, n) {
  const st = s.indexOf('function ' + n + '(');
  if (st < 0) throw new Error('missing ' + n);
  let d = 0, b = false;
  for (let j = s.indexOf('{', st); j < s.length; j++) {
    if (s[j] === '{') { d++; b = true; }
    else if (s[j] === '}') { d--; if (b && d === 0) return s.slice(st, j + 1); }
  }
}

const FNS = ['calculateTotalPmt', 'payoffMonths', '_payoffDateFrom', 'calculatePayoff', '_monthsBetween',
             'lifeOfLoan', 'lifetimeInterest', '_moatNegAm', '_retireInfo', '_targetPayment', '_payoffYearOf',
             '_moatSanePayoff', '_moatRateMoves', '_moatDI'];
const BASE = FNS.map(n => ex(src, n)).join('\n');

// ANCHOR = the function name. An ordinary copy edit or a re-worded comment cannot make this stop applying.
const ANCHOR = 'function _moatRateMoves(acc) {';
if (!BASE.includes(ANCHOR)) throw new Error('red-first anchor missing — _moatRateMoves signature moved');
const mutate = (v) => BASE.replace(ANCHOR, ANCHOR + ' return ' + v + ';');

const deps = {
  acceleratedDelta: () => null, hasEscrow: () => false, calculateEscrowMonthly: () => 0,
  _moatPmiUnder20: () => false, _moatLiveMktRate: () => null,
  getBaseType: () => ({ id: 'mortgage_x', title: 'Mortgage' }), state: { accounts: [] },
  _retireOverride: { retireYear: 2035, retireDate: new Date(2035, 2, 1), currentAge: 52 }
};
const build = (body) => new Function(...Object.keys(deps), body + '\nreturn {_moatDI};')(...Object.values(deps))._moatDI;

// txt() — read what the USER reads: §19.5 wraps figures in inline <span>s, so strip tags with NO space
// (otherwise a coloured number splits a sentence and a verbatim match fails on prose that renders fine).
const txt = (h) => String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Fully-sourced mortgage, varied ONLY by rate/type — so any delta is the beat, nothing else.
const LOAN = { baseId: 'mortgage_a', origAmount: 400000, value: 300000, minPmt: 2500, addPmt: 0,
               nextPmtDate: '2026-08-01', origDate: '2019-01-01', maturityDate: '2049-01-01' };
const BEAT = 'Heads up — this is a variable rate, so it can move at the next reset. Watch the reset date.';

function run(di) {
  const variable = txt(di({ ...LOAN, intRate: 5.5, rateType: 'Variable' }));
  const fixed    = txt(di({ ...LOAN, intRate: 5.5, rateType: 'Fixed' }));
  const untouched= txt(di({ ...LOAN, intRate: 5.5 }));                        // <select> never touched → undefined
  const norate   = txt(di({ ...LOAN, rateType: 'Variable' }));                // type set, rate blank
  const checks = [];
  const need = (l, c) => checks.push([l, !!c]);
  need('Variable → the verbatim beat renders', variable.includes(BEAT));
  need('Fixed → beat ABSENT', !fixed.includes(BEAT) && !fixed.includes('this is a variable rate'));
  need('untouched rateType → beat ABSENT (default-select trap)', !untouched.includes('this is a variable rate'));
  need('blank rate → beat ABSENT (L47 sourced-or-blank)', !norate.includes('this is a variable rate'));
  // §19.5 ① must stay cut — restoring the Variable half must not drag the APR restatement back in.
  need('§19.5 ① stays cut: no "This loan runs X% APR" restatement', !/This loan runs [\d.]+% APR/.test(variable));
  // the beat is a WHERE-YOU-STAND fact, and informs without instructing (no "you should/must")
  need('voice: informs, never advises', !/\byou should\b|\byou must\b|\bwe recommend\b/i.test(variable));
  return checks;
}

let pass = 0, total = 0;
const report = (tag, checks) => {
  if (tag) console.log('— ' + tag + ' —');
  for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); total++; if (ok) pass++; }
};

if (RED) {
  const a = run(build(mutate('true')));    // fires always → absence assertions must bite
  const b = run(build(mutate('false')));   // never fires → presence assertion must bite
  report('(a) _moatRateMoves → always true', a);
  report('(b) _moatRateMoves → always false', b);
  const aBit = a.some(([, ok]) => !ok), bBit = b.some(([, ok]) => !ok);
  console.log('\n' + pass + '/' + total + ' green  [--redfirst]');
  if (!aBit) { console.error('❌ RED-FIRST FAILED — mutation (a) did not bite'); process.exit(1); }
  if (!bBit) { console.error('❌ RED-FIRST FAILED — mutation (b) did not bite'); process.exit(1); }
  console.log('✅ RED-FIRST OK — both mutations bit');
  process.exit(0);
}

report('', run(build(BASE)));
console.log('\n' + pass + '/' + total + ' green');
if (pass !== total) { console.error('❌ GATE FAILED'); process.exit(1); }
console.log('✅ GATE GREEN');
