'use strict';
/* B1 gate — withdrawal-waterfall MATH ENGINE (scripts/datum-math.js). PURE module: given investable
   accounts + the annual NEED (spend − non-wage income, first-full-decumulation year), it returns the
   per-hop draw (EXACT amounts) + an ISOLATED, named tax ESTIMATE. Tax-efficient order liquid→pretax→roth,
   value DESC + id tiebreak. LOCK-3: read-only, never mutates accounts, no totals written. The _draw
   primitive is the B3 cascade unit. RED-first: with no datum-math.js the require throws (RED) -> GREEN.
   Usage: node scripts/_verify_datum_math.js [LABEL] */
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
let DatumMath;
try { DatumMath = require(path.resolve(__dirname, 'datum-math.js')); }
catch (e) { console.log('===== B1 DATUM-MATH GATE [' + LABEL + '] ====='); console.log('require failed (module absent) -> ' + e.message); console.log('OVERALL: RED'); process.exit(1); }

const ok = (n, c) => { console.log(`${n.padEnd(64)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
const near = (a, b) => Math.abs(a - b) < 0.5;
const checks = [];
console.log('===== B1 DATUM-MATH GATE [' + LABEL + '] =====');

// fixture: spend 250k, non-wage income 30k -> need 220k. liquid order value-DESC: taxable100>crypto60>checking40,
// then pretax 80, roth 50 (total 330). Draw 220k => taxable100, crypto60, checking40, pretax20 (partial), roth untouched.
const RATES = { ordinary: 0.22, capGains: 0.15, assumedGainFrac: 0.5 };
const mk = (id, taxCode, value, isInvestment) => ({ id, taxCode, value, isInvestment: !!isInvestment });
const accounts = [
  mk('tax', 'liquid', 100000, true), mk('cry', 'liquid', 60000, true), mk('chk', 'liquid', 40000, false),
  mk('pre', 'pretax', 80000, true), mk('roth', 'roth', 50000, true),
  mk('home', 'physical', 400000, false), mk('debt', 'debt', 90000, false)   // excluded from the waterfall
];
const snapshotBefore = JSON.stringify(accounts);
const r = DatumMath.waterfall({ accounts, spendAnnual: 250000, incomeAnnual: 30000, rates: RATES });

// need
checks.push(ok('need = spend - non-wage income (250k - 30k = 220k)', near(r.need, 220000)));
// hop order = liquid(value-DESC) -> pretax -> roth; physical/debt excluded
const ids = r.hops.map(h => h.id);
checks.push(ok('order = taxable,crypto,checking,pretax (roth preserved; home/debt excluded)', JSON.stringify(ids) === JSON.stringify(['tax', 'cry', 'chk', 'pre'])));
// exact amounts (cascade: partial pretax draw)
const amt = {}; r.hops.forEach(h => amt[h.id] = h.amount);
checks.push(ok('amounts exact: tax 100k, cry 60k, chk 40k, pre 20k (partial)', near(amt.tax, 100000) && near(amt.cry, 60000) && near(amt.chk, 40000) && near(amt.pre, 20000)));
checks.push(ok('drawn = need (220k), shortfall 0, roth untouched', near(r.drawn, 220000) && near(r.shortfall, 0) && ids.indexOf('roth') < 0));
// tax ESTIMATE per type (isolated field, never a total): cash 0, investment-liquid capgains-on-gain, pretax ordinary, roth tax-free
const tax = {}; r.hops.forEach(h => tax[h.id] = h.taxEstimate);
checks.push(ok('tax: taxable cap-gains est (100k*0.5*0.15=7.5k)', near(tax.tax, 7500)));
checks.push(ok('tax: crypto cap-gains est (60k*0.5*0.15=4.5k)', near(tax.cry, 4500)));
checks.push(ok('tax: checking cash = 0', near(tax.chk, 0)));
checks.push(ok('tax: pretax ordinary (20k*0.22=4.4k)', near(tax.pre, 4400)));
checks.push(ok('totalTaxEstimate = 16.4k (separate from amounts)', near(r.totalTaxEstimate, 16400)));
checks.push(ok('tax is ESTIMATE — labeled note present', /ESTIMATE/i.test(r.taxNote || '') && /cost-basis/i.test(r.taxNote || '')));
// amounts vs tax are SEPARATE fields
checks.push(ok('amount + taxEstimate are separate hop fields', r.hops[0].amount !== undefined && r.hops[0].taxEstimate !== undefined && r.hops[0].amount !== r.hops[0].taxEstimate));
// LOCK-3: accounts NOT mutated; no total written back
checks.push(ok('LOCK-3: input accounts unmutated (no state write)', JSON.stringify(accounts) === snapshotBefore));
// DETERMINISM: reversed account order -> identical hops
const r2 = DatumMath.waterfall({ accounts: [...accounts].reverse(), spendAnnual: 250000, incomeAnnual: 30000, rates: RATES });
checks.push(ok('determinism: reversed account order -> identical hop ids+amounts', JSON.stringify(r2.hops.map(h => [h.id, h.amount])) === JSON.stringify(r.hops.map(h => [h.id, h.amount]))));
// SHORTFALL: need > total investable -> shortfall reported (honest, no fake)
const rShort = DatumMath.waterfall({ accounts, spendAnnual: 500000, incomeAnnual: 0, rates: RATES });
checks.push(ok('shortfall honest: need 500k > 330k investable -> shortfall 170k', near(rShort.shortfall, 170000)));
// income >= spend -> no withdrawal need (a useful truth)
const rNo = DatumMath.waterfall({ accounts, spendAnnual: 40000, incomeAnnual: 60000, rates: RATES });
checks.push(ok('income >= spend -> need 0, no hops', near(rNo.need, 0) && rNo.hops.length === 0));
// B3 CASCADE PRIMITIVE: _draw(subset, need) draws only from the subset (per-owner debt funding unit)
const sub = accounts.filter(a => a.id === 'chk' || a.id === 'cry');   // an "owner's" liquid subset
const cascade = DatumMath._draw(sub, 70000, RATES);
checks.push(ok('B3 primitive: _draw(subset, need) draws only from subset (cry60+chk10)', cascade.hops.length === 2 && near(cascade.hops[0].amount, 60000) && near(cascade.hops[1].amount, 10000)));

console.log('detail:', JSON.stringify({ need: r.need, hops: r.hops.map(h => [h.id, h.amount, +h.taxEstimate.toFixed(0)]), totalTax: r.totalTaxEstimate, shortfall: r.shortfall }));
console.log('taxNote:', r.taxNote);
const all = checks.every(Boolean);
console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
process.exit(all ? 0 : 1);
