/* L52 NO-REGRESSION WINNER GATE — 401(k) "The Treasury [R] / The Vault [T]" (roth401k / pretax401k).
   Winner-map = 401(k) Copy Bank §22 (A441:D457). Asserts each field's WINNER literal is present in the
   shipped studio.html (served verbatim via dist). COVERAGE-ONLY §19 manifest lines never overwrite a winner.
   Winners: Equity/Bond/Cash → §1 signals; UG/Beta/Yield/Expense → §12 ladders; 3 tax-lot cols → §12 per-column;
   Account Value/International/Balance/Annual Contribution → §19-lens (no richer rival). Reusable template.
   Usage: node scripts/_gate_401k_winners.js */
const fs = require('fs');
const path = require('path');
const { studioSource } = require('./_studio_source.cjs');
const SRC = studioSource();

const WINNERS = [
  ['Equity %',            '§1 signal',      'the tax-efficiency worry that shapes a taxable account simply'],
  ['Bond %',              '§1 signal',      'Your ballast'],
  ['Cash %',              '§1 signal',      'gives up the tax-deferred growth that is the whole point'],
  ['Unrealized Gain box', '§12 UG ladder',  'this is exactly why high-growth assets belong here'],
  ['Weighted Beta box',   '§12 BETA ladder','moves essentially in step with the broad market'],
  ['Blended Yield box',   '§12 YLD ladder', 'reinvest completely untaxed instead of being taxed year by year'],
  ['Avg Expense box',     '§12 EXP ladder', 'institutional-grade pricing'],
  ['Cost Basis col',      '§12 per-col R362','no source publishes your basis'],
  ['Unrealized Gain col', '§12 per-col R363','this paper gain is yours tax-free once qualified'],
  // MAP-CORRECTED 2026-07-11 (Captain Option 1): live 401(k) N/A wrapper hover is richer than §12 R371 → it WINS; R371 = COVERAGE-ONLY.
  ['Acquisition Date col','§12 N/A hover',  'the holding period is irrelevant to how withdrawals are taxed'],
  ['Account Value',       '§19 R384',       'the number that compounds'],
  ['International',        '§19 R388',       'Foreign Tax Credit that rewards foreign holdings in a taxable brokerage is LOST inside a 401(k)'],
  // MAP-CORRECTED 2026-07-11 (Captain Option 1): live §1-style roth/pretax-BRANCHED copy is richer than §19 R389/R390 → it WINS; §19 = COVERAGE-ONLY.
  ['Balance (shared tail)','§1-style branched','future retirement income, not liquid cash'],
  ['Balance [R] branch',  '§1-style branched','tax-FREE money in waiting'],
  ['Balance [T] branch',  '§1-style branched','This is PRE-TAX money — every dollar here still owes'],
  ['Annual Contribution', '§1-style branched','What you’re putting in per year (your deferral)'],
];

// §9 Layer-E balance-source trio (bank R140–R142) — the newly-wire-ready nuance.
const LAYER_E = [
  ['Layer-E matchBalance',        'is employer-match money, and that piece is PRE-TAX'],
  ['Layer-E profitSharingBalance','is company profit-sharing'],
  ['Layer-E rolloverBalance',     'was ROLLED IN from a prior employer'],
];

let pass = 0, fail = 0; const reds = [];
function ok(cond, label) { if (cond) pass++; else { fail++; reds.push(label); } console.log((cond ? 'PASS ' : 'FAIL ') + label); }

console.log('===== 401(k) WINNER GATE (L52) — audit of served bytes =====');
WINNERS.forEach(w => ok(SRC.indexOf(w[2]) !== -1, w[0] + ' → ' + w[1] + '  («' + w[2].slice(0, 38) + '»)'));
console.log('--- §9 Layer-E balance trio (R140–R142) ---');
LAYER_E.forEach(w => ok(SRC.indexOf(w[1]) !== -1, w[0] + '  («' + w[1].slice(0, 34) + '»)'));

console.log('-------------------------------------');
console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
if (fail) console.log('REDS: ' + reds.join(' | '));
process.exit(fail === 0 ? 0 : 1);
