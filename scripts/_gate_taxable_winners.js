/* L52 NO-REGRESSION WINNER GATE — Taxable "The Living Room" (base.id taxable).
   Doctrine (Captain 2026-07-11): every rollup field has ONE section that owns its richest LIVE hover
   (the WINNER, per L51 WINNER-TAG). This gate asserts each winner's distinctive literal is present in
   the shipped studio.html (served verbatim via dist), and that the swapped fields did NOT regress to the
   generic §1 signal copy. Any future wire that shortens a hover or swaps in a generic flips this RED
   before publish. A room is "done" ONLY when its winner-gate is green.

   RED-FIRST: on pre-wire HEAD, the §19 tax-lens on Equity/Bond/Cash + the §20 panel are absent → RED.
   This file is the REUSABLE TEMPLATE — clone the WINNERS/LOSERS shape per room (401k, Conduit, IRA…).
   Reads the local studio.html (== served bytes; dist copies it verbatim). Usage: node scripts/_gate_taxable_winners.js */
const fs = require('fs');
const path = require('path');
const { studioSource } = require('./_studio_source.cjs');
const SRC = studioSource();

// FIELD → { win: winner-section + distinctive literal that MUST be present ; lose: generic that must be ABSENT (optional) }
const WINNERS = [
  // §19 tax-lens WINS these 3 (nuanced tax framing beats generic §1). Generic §1 must be GONE from the strip.
  ['Equity %',            '§19 R410', 'the sleeve that rewards patience most',            'the single biggest dial on whether your money grows'],
  ['Bond %',              '§19 R411', 'LEAST tax-efficient holding in a taxable',         'your shock absorber for the first bad years'],
  ['Cash %',              '§19 R412', 'a lot is a silent cost',                           'don’t-touch-the-investments'],
  // §19-lens already-wired fields (kept).
  ['Account Value',       '§19 R409', 'the number that compounds',                        null],
  ['International',       '§19 R413', 'Foreign Tax Credit',                               null],
  ['Balance',             '§19 R414', 'already-taxed and fully liquid',                   null],
  ['Annual Contribution', '§19 R415', 'NO IRS contribution limit',                        null],
  // §10 DYNAMIC METRIC LADDERS win the 4 auto-boxes (richer than §19's static paragraph). Keep them.
  ['Unrealized Gain box', '§10 UG',   'a strong result, and a planning question',        null],
  ['Weighted Beta box',   '§10 BETA', 'moves about in step with the market',              null],
  ['Blended Yield box',   '§10 YLD',  'this account is income-rich',                      null],
  ['Avg Expense box',     '§10 EXP',  'about as cheap as investing gets',                 null],
  // §14.4 COLUMN tooltips win the 3 tax-lot columns.
  ['Cost Basis col',      '§14.4',    'so the capital-gains tax is exact instead of a guess', null],
  ['Unrealized Gain col', '§14.4',    'the slice the capital-gains tax will touch',       null],
  ['Acquisition Date col','§14.4',    'it starts your holding-period clock',              null],
];

// §20 "Why a taxable brokerage?" education panel must render (bank R430–R439).
const PANEL20 = [
  'no rules, and no shelter',        // R430 title
  'the quiet superpower',            // R436 step-up
  'Foreign Tax Credit',              // R437 (shared literal, also field 5)
  'a taxable-only tool',             // R435 TLH
];

let pass = 0, fail = 0; const reds = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; reds.push(label); } console.log((cond ? 'PASS ' : 'FAIL ') + label); }

console.log('===== TAXABLE WINNER GATE (L52) =====');
WINNERS.forEach(function (w) {
  const [field, owner, winLit, loseLit] = w;
  ok(SRC.indexOf(winLit) !== -1, field + ' → ' + owner + ' WINNER present  («' + winLit.slice(0, 42) + '»)');
  if (loseLit) ok(SRC.indexOf(loseLit) === -1, field + ' → generic §1 loser ABSENT (no regression)');
});
PANEL20.forEach(function (lit) { ok(SRC.indexOf(lit) !== -1, '§20 panel literal present («' + lit.slice(0, 34) + '»)'); });

console.log('-------------------------------------');
console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
if (fail) { console.log('REDS: ' + reds.join(' | ')); process.exit(1); }
