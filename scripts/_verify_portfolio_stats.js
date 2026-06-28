'use strict';
/* Spine gate — DatumMath.portfolioStats (scripts/datum-math.js). PURE, value-weighted aggregates over
   the HOLDINGS of the given accounts: weightedBeta, blendedExpReturn, blendedExpense, blendedYield (all
   value-weighted over holdings that carry the field), unrealizedGain = Σ(value−costBasis) over holdings
   with a cost basis, hasData = any holding carries beta OR expectedReturn. No mutation, no fabrication.
   Additive — B1 waterfall untouched. RED-first: without portfolioStats the call throws.
   Usage: node scripts/_verify_portfolio_stats.js [LABEL] */
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
let DM;
try { DM = require(path.resolve(__dirname, 'datum-math.js')); }
catch (e) { console.log('require failed -> ' + e.message); console.log('OVERALL: RED'); process.exit(1); }
if (typeof DM.portfolioStats !== 'function') { console.log('portfolioStats absent -> OVERALL: RED'); process.exit(1); }

const ok = (n, c) => { console.log(`${n.padEnd(64)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
const near = (a, b) => a !== null && Math.abs(a - b) < 1e-6;
const checks = [];
console.log('===== SPINE portfolioStats GATE [' + LABEL + '] =====');

// fixture: two equal-value holdings (1000 each) in one account.
const acct = { id: 'tx', holdings: [
  { ticker: 'A', price: 100, shares: 10, beta: 1.2, expectedReturn: 8, expRatio: 0.03, dividendYield: 1.5, costBasis: 600 },
  { ticker: 'B', price: 50,  shares: 20, beta: 0.8, expectedReturn: 6, expRatio: 0.10, dividendYield: 2.5, costBasis: 1200 }
] };
const snap = JSON.stringify(acct);
const r = DM.portfolioStats([acct]);
checks.push(ok('weightedBeta = 1.0 (equal weight 1.2,0.8)', near(r.weightedBeta, 1.0)));
checks.push(ok('blendedExpReturn = 7 (8,6)', near(r.blendedExpReturn, 7)));
checks.push(ok('blendedExpense = 0.065 (0.03,0.10)', near(r.blendedExpense, 0.065)));
checks.push(ok('blendedYield = 2.0 (1.5,2.5)', near(r.blendedYield, 2.0)));
checks.push(ok('unrealizedGain = 200 ((1000-600)+(1000-1200))', near(r.unrealizedGain, 200)));
checks.push(ok('hasData = true', r.hasData === true));
checks.push(ok('LOCK: input not mutated', JSON.stringify(acct) === snap));

// value-weighting (unequal): A value 3000 beta 2, B value 1000 beta 0 -> weighted 1.5
const uw = DM.portfolioStats([{ id: 'x', holdings: [
  { price: 100, shares: 30, beta: 2 }, { price: 100, shares: 10, beta: 0 }
] }]);
checks.push(ok('value-weighting: (3000*2+1000*0)/4000 = 1.5', near(uw.weightedBeta, 1.5)));

// partial: beta present, expectedReturn absent -> beta computed, expReturn null, hasData true
const partial = DM.portfolioStats([{ id: 'p', holdings: [{ price: 10, shares: 10, beta: 1.1 }] }]);
checks.push(ok('partial: beta only -> weightedBeta set, blendedExpReturn null, hasData true', near(partial.weightedBeta, 1.1) && partial.blendedExpReturn === null && partial.hasData === true));

// gain only over holdings with a REAL basis (0/blank = not entered -> excluded; no fake zeros)
const mixedCB = DM.portfolioStats([{ id: 'm', holdings: [
  { price: 100, shares: 10, costBasis: 700 },   // value 1000, gain 300
  { price: 100, shares: 10, costBasis: 0 },      // 0 = not entered -> excluded (no fake +$1000)
  { price: 100, shares: 10 }                     // no basis -> excluded
] }]);
checks.push(ok('unrealizedGain excludes 0/blank basis (=300, only the real-basis holding)', near(mixedCB.unrealizedGain, 300)));

// empty -> all null, hasData false
const empty = DM.portfolioStats([{ id: 'e', holdings: [] }]);
checks.push(ok('empty holdings -> nulls + hasData false + unrealizedGain null',
  empty.weightedBeta === null && empty.blendedExpReturn === null && empty.unrealizedGain === null && empty.hasData === false));

// multi-account flatten: holdings across accounts blend together (value-weighted)
const multi = DM.portfolioStats([
  { id: 'a1', holdings: [{ price: 100, shares: 10, beta: 1.0 }] },   // 1000 @1.0
  { id: 'a2', holdings: [{ price: 100, shares: 30, beta: 2.0 }] }    // 3000 @2.0
]);
checks.push(ok('multi-account flatten: (1000*1+3000*2)/4000 = 1.75', near(multi.weightedBeta, 1.75)));

// B1 still green (additive)
const b1 = DM.waterfall({ accounts: [{ id: 'l', taxCode: 'liquid', value: 100000, isInvestment: true }], spendAnnual: 50000, incomeAnnual: 0 });
checks.push(ok('B1 waterfall still works (additive, untouched)', b1 && b1.hops.length === 1 && near(b1.hops[0].amount, 50000)));

console.log('detail:', JSON.stringify(r));
const all = checks.every(Boolean);
console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
process.exit(all ? 0 : 1);
