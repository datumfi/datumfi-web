/* DEV-ONLY red-first FUNCTIONAL gate — §17 FRED mortgage-rate color (Mortgage Copy Bank §17.1–17.5). Injects
   a live-rates cache with MORTGAGE30US 6.50% / MORTGAGE15US 5.80% and asserts, off the real _moatDI + sub-line:
     (SUB-LINE) 30-yr default -> "Today's avg: ~6.50% · 30-yr fixed · Freddie Mac via FRED, as of Jul 17, 2026";
     (§17.3 ABOVE)      rate 7.5 vs 6.50 -> "…today's 30-year average is about 6.50%. …even 1.00 points off $300,000…";
     (§17.4 WELL-BELOW) rate 3.0 -> "Your 3% is well under today's ~6.50% average — this is a rate worth protecting…";
     (§17.2 AT/BELOW)   rate 6.4 -> "You're locked at 6.4% — right around today's ~6.50% average, …little to gain…";
     (TERM PICK) a 15-yr loan reads MORTGAGE15US 5.80 (sub-line "15-yr fixed"; clause cites 15-year avg);
     (§17.5 GUARDS) Variable rate -> no clause + no sub-line; feed stale (no mortgage series) -> BLANK;
     (LOCK-3) neither path mutates acc.intRate.
   --redfirst strips the §17 clause block from _moatDI + blanks the sub-line -> the winners vanish (gate bites). */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(/        \/\/ §17 FRED live market-rate color[\s\S]*?little to gain from refinancing at these rates\.'\);\n                }\n            }\n        }\n/, '');
  s = s.replace(/        return '<div style="font-size:11px; color: rgba\(93,202,165,0\.9\); margin:-6px 0 12px;">Today\\'s avg: ~'[^\n]*<\/div>';/, "        return '';");
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['calculateTotalPmt','payoffMonths','_payoffDateFrom','calculatePayoff','lifetimeInterest','lifeOfLoan',
               'acceleratedDelta','calculateEscrowMonthly','hasEscrow','_normalizeRatesResp','_liveRates','_fmtAsOf',
               '_moatLiveMktRate','_moatLiveRateHTML',
               // RE-TRUED 2026-07-25 — _moatDI gained these callees across the §19 arc (neg-am notice,
               // the shared retirement-horizon engine, the debt donut). Hand-listed harnesses rot the day
               // the function under test gains a dependency; this list is why the gate was red.
               '_num','_moatNegAm','_retireInfo','_targetPayment','_payoffYearOf','_moatSanePayoff',
               '_debtDonutSVG','_moatDebtPieHTML','_moatPmiUnder20','_monthsBetween','_moatDI'];
const getBaseType = (baseId) => String(baseId).indexOf('mortgage') === 0
  ? { id: baseId, title: 'Mortgage' } : { id: baseId, title: 'Other' };
function build(cacheLiteral) {
  const body = 'var _livePrimeCache=' + cacheLiteral + ';\n' + NAMES.map(extract).join('\n') +
    '\nreturn { di:_moatDI, sub:_moatLiveRateHTML, mkt:_moatLiveMktRate };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, getBaseType);
}
const CACHE = "{ prime:6.75, asOf:'2026-07-18', source:'FRED:DPRIME', rates:{ Prime:{value:6.75,asOf:'2026-07-18',source:'FRED:DPRIME'}, MORTGAGE30US:{value:6.50,asOf:'2026-07-17',source:'FRED:MORTGAGE30US'}, MORTGAGE15US:{value:5.80,asOf:'2026-07-17',source:'FRED:MORTGAGE15US'} } }";
const PRIME_ONLY = "{ prime:6.75, asOf:'2026-07-18', source:'FRED:DPRIME', rates:{ Prime:{value:6.75,asOf:'2026-07-18',source:'FRED:DPRIME'} } }";
let e = null, blank = null, err = '';
try { e = build(CACHE); blank = build(PRIME_ONLY); } catch (ex) { err = ex.message; }
need('engine builds with an injected live-rates cache' + (err ? ' (' + err + ')' : ''), !!e && !!blank);

if (e && blank) {
  const J = (arr) => arr.join(' || ');
  const base = { baseId: 'mortgage_primary', value: 300000, minPmt: 1800, rateType: 'Fixed' };   // no dates -> 30-yr default

  need('(SUB-LINE) 30-yr default renders verbatim ("Today\'s avg: ~6.50% · 30-yr fixed · … Jul 17, 2026")',
    /Today's avg: ~6\.50% · 30-yr fixed · Freddie Mac via FRED, as of Jul 17, 2026/.test(e.sub('mortgage_primary', base)));

  need('(§17.3 ABOVE) rate 7.5 -> refinance-look clause with 1.00 pts off $300,000',
    /You're paying 7\.5% while today's 30-year average is about 6\.50%\. That gap is worth a refinance look — even 1\.00 points off \$300,000 is real money over the remaining term\./.test(e.di({ ...base, intRate: 7.5 })));
  need('(§17.4 WELL-BELOW) rate 3.0 -> "worth protecting" clause',
    /Your 3% is well under today's ~6\.50% average — this is a rate worth protecting\. Paying it off early trades a cheap, tax-favored loan for cash you could invest; weigh accordingly\./.test(e.di({ ...base, intRate: 3.0 })));
  need('(§17.2 AT/BELOW) rate 6.4 -> "right around … little to gain" clause',
    /You're locked at 6\.4% — right around today's ~6\.50% average, so there's little to gain from refinancing at these rates\./.test(e.di({ ...base, intRate: 6.4 })));

  // TERM PICK — 15-yr loan reads MORTGAGE15US 5.80.
  const yr15 = { ...base, origDate: '2020-01-01', maturityDate: '2035-01-01' };
  need('(TERM PICK) 15-yr loan sub-line uses 15-yr fixed 5.80',
    /Today's avg: ~5\.80% · 15-yr fixed/.test(e.sub('mortgage_primary', yr15)));
  need('(TERM PICK) 15-yr loan clause cites the 15-year average (rate 7.0 > 5.80 -> above)',
    /today's 15-year average is about 5\.80%/.test(e.di({ ...yr15, intRate: 7.0 })));

  // GUARDS.
  need('(§17.5 Variable) ARM -> no §17 clause AND no sub-line (fixed-benchmark, apples-to-apples)',
    !/average/.test(e.di({ ...base, intRate: 7.5, rateType: 'Variable' })) && e.sub('mortgage_primary', { ...base, rateType: 'Variable' }) === '');
  need('(§17.5a STALE) feed without mortgage series -> clause BLANK + sub-line BLANK',
    !/average/.test(blank.di({ ...base, intRate: 7.5 })) && blank.sub('mortgage_primary', base) === '' && blank.mkt(base) === null);

  // LOCK-3.
  const acc = { ...base, intRate: 7.5 }; const before = acc.intRate; e.di(acc); e.sub('mortgage_primary', acc);
  need('(LOCK-3) neither path mutates acc.intRate', acc.intRate === before && before === 7.5);
}

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on stripped code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§17 code.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
