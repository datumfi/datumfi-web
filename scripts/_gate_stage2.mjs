/* DEV-ONLY. Stage-2 gate — audits the generated bundle for the black-or-white + precedence + Tier-2
   guard laws. RED-first: runs the audit on the REAL bundle (expect 0 violations = GREEN) AND on a
   deliberately poisoned copy (expect the exact violations flagged = proves the gate really bites). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// load a bundle file as an object
function load(fp) { const m = { exports: {} }; const fn = new Function('module', 'exports', 'self', readFileSync(fp, 'utf8')); const self = {}; fn(m, m.exports, self); return self.TICKER_BUNDLE || m.exports; }

function audit(T) {
  const v = [];
  for (const k of Object.keys(T)) {
    const e = T[k];
    const isFund = e.instrumentType !== 'Stock';
    // (1) TRACEABLE: any beta present must carry src+asOf+method (Tier-2 guard #1)
    if (e.beta != null && (!e.betaSrc || !e.betaAsOf || !e.betaMethod)) v.push(`${k}: beta without full stamp`);
    if (e.dividendYield != null && e.dividendYieldSrc === 'Yahoo Finance' && !e.dividendYieldAsOf) v.push(`${k}: yahoo yield without asOf`);
    // (2) NO FABRICATION: no null/placeholder numerics (blank = key absent, never null/0-as-empty)
    for (const f of ['beta', 'dividendYield', 'expRatio', 'sector', 'assetClass']) if (e[f] === null) v.push(`${k}: ${f} is null (should be absent)`);
    // (3) FUND-YIELD WALL: a fund's yield must never come from Yahoo (issuer/curated only)
    if (isFund && e.dividendYieldSrc === 'Yahoo Finance') v.push(`${k}: FUND yield sourced from Yahoo`);
    // (4) EXPENSE/ASSET-CLASS WALL: never from Yahoo
    if (e.expRatioSrc === 'Yahoo Finance' || e.assetClassSrc === 'Yahoo Finance') v.push(`${k}: expense/assetClass from Yahoo`);
    // (5) beta only on stocks (Yahoo returns none for funds; curated may still carry one)
    if (isFund && e.betaSrc === 'Yahoo Finance') v.push(`${k}: FUND beta from Yahoo`);
    // (6) beta method stamp exact
    if (e.betaSrc === 'Yahoo Finance' && e.betaMethod !== '5Y monthly vs S&P 500') v.push(`${k}: wrong beta method`);
  }
  return v;
}

const bundle = process.argv[2] || 'C:/Users/tmnte/AppData/Local/Temp/claude/C--Users-tmnte-datumfi-web/480d12c8-7995-47f1-a683-6716b79c8a9c/scratchpad/ticker-bundle.candidate.js';
const T = load(bundle);

// ---- GREEN: real bundle ----
const real = audit(T);

// ---- precedence spot: curated AAPL sector must WIN over SEC (no sectorSrc) ----
const precedenceFail = [];
if (T.AAPL) { if (T.AAPL.sector !== 'Technology') precedenceFail.push('AAPL sector not curated Technology'); if (T.AAPL.sectorSrc) precedenceFail.push('AAPL sector overwritten by SEC (should be curated)'); }
// a stock got Yahoo beta + stamp
if (!(T.AAPL && T.AAPL.beta != null && T.AAPL.betaSrc === 'Yahoo Finance')) precedenceFail.push('AAPL missing Yahoo beta');
// drop test: metric-move proxy — beta present is READ (non-null number)
if (T.KO && typeof T.KO.beta !== 'number') precedenceFail.push('KO beta not a live number');

// ---- RED negative control: poison a copy, confirm audit catches each symptom ----
const poison = JSON.parse(JSON.stringify({
  FAKE1: { name: 'x', instrumentType: 'Stock', beta: 1.2 },                                   // beta w/o stamp
  FAKE2: { name: 'x', instrumentType: 'ETF', dividendYield: 0.03, dividendYieldSrc: 'Yahoo Finance', dividendYieldAsOf: 'd' }, // fund yield from Yahoo
  FAKE3: { name: 'x', instrumentType: 'Stock', expRatio: 0.1, expRatioSrc: 'Yahoo Finance' }, // expense from Yahoo
  FAKE4: { name: 'x', instrumentType: 'Stock', sector: null }                                  // fabricated null
}));
const red = audit(poison);
const redExpected = red.length >= 4; // must flag all four symptoms

// ---- ROLLUP-MATH: user-entered == curated == Yahoo-sourced (source-agnostic), + units/field-name regression ----
// datum-math.portfolioStats reads dividendYield/expRatio as PERCENT numbers (1.5 = 1.5%); beta unitless.
const DatumMath = require('./datum-math.js');
const rollupFail = [];
const acct = (holdings) => [{ id: 'x', holdings }];
// one holding "from the bundle" (has Src stamps) vs an identical one "typed by the user" (no stamps) -> IDENTICAL stats.
const fromBundle = { ticker: 'A', price: 100, shares: 10, beta: 1.2, dividendYield: 2.49, expRatio: 0.03, costBasis: 600, betaSrc: 'Yahoo Finance', dividendYieldSrc: 'Yahoo Finance' };
const userTyped = { ticker: 'A', price: 100, shares: 10, beta: 1.2, dividendYield: 2.49, expRatio: 0.03, costBasis: 600 };
const sB = DatumMath.portfolioStats(acct([fromBundle]));
const sU = DatumMath.portfolioStats(acct([userTyped]));
for (const f of ['weightedBeta', 'blendedYield', 'blendedExpense', 'unrealizedGain']) if (sB[f] !== sU[f]) rollupFail.push(`${f}: bundle ${sB[f]} != user ${sU[f]}`);
// UNITS regression: a 2.49% yield must roll up as 2.49, not 0.0249 (the bug this stage caught).
if (Math.abs(sU.blendedYield - 2.49) > 1e-9) rollupFail.push(`yield units wrong: blendedYield=${sU.blendedYield} (expect 2.49)`);
// weighted correctness across two holdings: Σ(v*beta)/Σv.
const two = DatumMath.portfolioStats(acct([{ price: 100, shares: 10, beta: 1.2 }, { price: 50, shares: 20, beta: 0.8 }]));
if (Math.abs(two.weightedBeta - 1.0) > 1e-9) rollupFail.push(`weightedBeta=${two.weightedBeta} (expect 1.0)`);
// RED drop-test: remove the beta -> weighted beta MOVES (proves the field is really read).
const dropped = DatumMath.portfolioStats(acct([{ price: 100, shares: 10 }, { price: 50, shares: 20, beta: 0.8 }]));
if (!(dropped.weightedBeta === 0.8)) rollupFail.push(`drop-test: expected 0.8 after dropping A's beta, got ${dropped.weightedBeta}`);

console.log('=== STAGE-2/3 GATE ===');
console.log('GREEN (real bundle) violations:', real.length, real.slice(0, 6));
console.log('PRECEDENCE checks:', precedenceFail.length, precedenceFail);
console.log('ROLLUP-MATH (user==curated, units, drop-test):', rollupFail.length, rollupFail);
console.log('RED (poisoned) flagged:', red.length, '(expect >=4):', red);
const pass = real.length === 0 && precedenceFail.length === 0 && rollupFail.length === 0 && redExpected;
console.log(pass ? 'RESULT: PASS (green real · red bites)' : 'RESULT: FAIL');
process.exit(pass ? 0 : 1);
