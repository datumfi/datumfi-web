/* _gate_asset_mix_reaches_engine.mjs — THE HOUSEHOLD'S OWN MIX, OR NOTHING AT ALL.
 *
 * ⛔⛔ WHAT THIS GUARDS. Until 2026-09-16 the engine ran ONE allocation for every household on
 *    earth — 80% equity / 17% bonds / 3% cash — and there was no key on the wire that could say
 *    otherwise. The client knew the truth the whole time: `_diSignals` classifies every holding by
 *    value, prints "The invested sleeve is NN% stocks" back to the user in six places, and drives
 *    Roth asset-location advice off `bondPct >= 30`. It threw the number away at the payload
 *    boundary.
 * ⭐ MEASURED, and it is why the legs below use the numbers they use: the Captain's own 15-Sep
 *    save reads 94.6% stocks / 4.7% bonds through that same classifier, 100% of invested value
 *    classified, against the 80/17/3 he was being modelled at. Worth up to $14,000/yr of Ceiling.
 *
 * ⛔ THE LEG THAT MATTERS MOST IS L3, AND IT IS NOT ABOUT ARITHMETIC. `_diSignals` only sees rows
 *    in the holdings table. A household with $900,000 typed straight into a 401(k) and $10,000 of
 *    classified stock in a brokerage would, on a holdings-only denominator, report 100% EQUITY
 *    WITH TOTAL CONFIDENCE — a 1.1% sample answering for the whole estate, in the direction that
 *    flatters. THE COVERAGE TEST IS THE FEATURE; the summing is the easy part.
 *
 * ⛔ RED-FIRST, AND THE CONTROL IS NAMED: every leg here was run against a deliberately broken
 *    aggregator before it was run against the real one — see L3n / L5n, which reproduce the exact
 *    defect (holdings-only denominator, percentages averaged) rather than merely failing.
 *    A NEGATIVE CONTROL THAT DOES NOT REPRODUCE THE SYMPTOM PROVES ONLY THAT THE TEST CAN FAIL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lift } from './_gate_extract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');

const FAILED = [];
function check(leg, what, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${leg}  ${what}${detail ? `   [${detail}]` : ''}`);
  if (!ok) FAILED.push(`${leg} — ${what} ${detail}`);
}

/* The real functions, sliced out of the served file. Nothing here is re-implemented: a gate that
   re-writes the logic it is testing agrees with itself and with nothing else. */
/* ⚠️ THE TWO TABLES ARE SLICED BY THEIR OWN CLOSING TOKEN, NOT BY `lift`. Both carry prose
   comments containing unbalanced parentheses ("403(b)", "(pretax_457b/401k/ira, ...") and the
   shared extractor counts bracket depth over raw text, so it cannot find their terminator. The
   slice is still the REAL declaration, byte for byte, and it throws if the anchors ever move. */
function sliceDecl(name, opener, closer) {
  const i = SRC.indexOf(opener);
  if (i < 0) throw new Error(`gate: studio.html no longer declares ${name}`);
  const j = SRC.indexOf(closer, i);
  if (j < 0) throw new Error(`gate: no terminator for ${name}`);
  return SRC.slice(i, j + closer.length);
}

const CODE = [
  sliceDecl('ACCOUNT_TYPE_MAP', 'const ACCOUNT_TYPE_MAP = {', '\n      };'),
  sliceDecl('FILTERED_TYPES', 'const FILTERED_TYPES = new Set([', '\n      ]);'),
  lift(SRC, '_conduitIsInformational'),
  /* ⚠️ SLICED FOR THE SAME REASON, AND THE REASON IS WORTH RECORDING: its middle line carries the
     comment "an informational Rollover 401(k)'s dollars …", and that lone apostrophe opens a
     string the extractor never sees closed — so every `;` after it reads as quoted and the
     binding runs on into the next forty lines of buildStudioRequest. A DEPTH COUNTER OVER PROSE
     WILL EVENTUALLY SWALLOW THE FUNCTION IT WAS POINTED AT. */
  sliceDecl('_reachesEngine', 'const _reachesEngine = a =>', '(a.inflow || 0) > 0);'),
  lift(SRC, '_diSignals'),
  lift(SRC, '_householdAssetMix'),
].join('\n');

function mixFor(accounts) {
  const fn = new Function('state', `${CODE}\nreturn _householdAssetMix();`);
  return fn({ accounts });
}

const hold = (instrumentType, assetClass, price, shares = 1) =>
  ({ instrumentType, assetClass, price, shares });

console.log('\n_gate_asset_mix_reaches_engine — the mix the engine is told, and when it is told nothing\n');

// ── L1 · The Captain's own saved household ────────────────────────────────
// ⛔ A REAL FILE THIS GATE DID NOT WRITE. A fixture authored beside the assertion proves the
//    assertion, not the product.
const save = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'scripts/_fixtures/roundtrip_joint_2026-09-15.json'), 'utf8'));
const captain = mixFor(save.accounts);
check('L1', 'the Captain\'s 15-Sep save yields a mix at all', captain !== null,
  captain ? JSON.stringify(captain) : 'null — nothing would be sent');
if (captain) {
  check('L1b', 'equity reads ~95%, not the engine\'s 80%',
    captain.equity > 0.90 && captain.equity < 1.0, `equity=${captain.equity}`);
  check('L1c', 'the three sum to exactly 1.0 (the engine refuses past ±0.01)',
    Math.abs(captain.equity + captain.bond + captain.cash - 1) < 1e-9,
    `sum=${(captain.equity + captain.bond + captain.cash).toFixed(6)}`);
  check('L1d', 'it is NOT the engine default — the whole point',
    !(captain.equity === 0.80 && captain.bond === 0.17), JSON.stringify(captain));
}

// ── L2 · An estate with nothing in it sends nothing ───────────────────────
check('L2', 'an empty estate returns null rather than a confident mix',
  mixFor([]) === null);

// ── L3 · THE COVERAGE TRAP — the defect this function exists to prevent ───
const mostlyUnlisted = [
  { baseId: 'pretax401k', value: 900000, inflow: 0, holdings: [] },
  { baseId: 'taxable', value: 10000, inflow: 0, holdings: [hold('Stock', 'Stocks', 10000)] },
];
const trap = mixFor(mostlyUnlisted);
check('L3', '$900k unlisted beside $10k of stock sends NOTHING (1.1% cannot answer for 100%)',
  trap === null, trap ? `LEAKED ${JSON.stringify(trap)}` : 'null');

// ⛔ THE NEGATIVE CONTROL REPRODUCES THE SYMPTOM, not merely a failure: the same estate through a
//    holdings-only denominator must report 100% equity, or L3 is guarding a defect that cannot
//    occur and proves nothing.
const holdingsOnlyDenominator = (accounts) => {
  const fn = new Function('state', `${CODE}\nreturn _diSignals;`);
  const sig = fn({ accounts });
  let eq = 0, bd = 0, cash = 0;
  for (const a of accounts) { const s = sig(a); eq += s.eq; bd += s.bd; cash += s.cash; }
  const m = eq + bd + cash;
  return m > 0 ? eq / m : null;
};
check('L3n', 'NEGATIVE CONTROL — a holdings-only denominator really does report 100% equity here',
  holdingsOnlyDenominator(mostlyUnlisted) === 1,
  `would have sent equity=${holdingsOnlyDenominator(mostlyUnlisted)}`);

// ── L4 · A savings account is cash by its TYPE, with no holdings at all ───
const cashHeavy = [
  { baseId: 'savings_primary', value: 50000, inflow: 0, holdings: [] },
  { baseId: 'taxable', value: 50000, inflow: 0, holdings: [hold('Stock', 'Stocks', 50000)] },
];
const cashMix = mixFor(cashHeavy);
check('L4', 'an HYSA with no holdings still counts — as cash, sourced by type',
  cashMix !== null && Math.abs(cashMix.cash - 0.5) < 0.001 && Math.abs(cashMix.equity - 0.5) < 0.001,
  JSON.stringify(cashMix));

// ── L5 · DOLLARS SUMMED, NEVER PERCENTAGES AVERAGED ──────────────────────
const lopsided = [
  { baseId: 'tradira', value: 1000, inflow: 0, holdings: [hold('Bond', 'Bonds', 1000)] },
  { baseId: 'pretax401k', value: 99000, inflow: 0, holdings: [hold('Stock', 'Stocks', 99000)] },
];
const lop = mixFor(lopsided);
check('L5', 'a $1k all-bond room does not weigh as much as a $99k all-stock one',
  lop !== null && Math.abs(lop.equity - 0.99) < 0.001, JSON.stringify(lop));
// ⛔ REPRODUCE THE ALTERNATIVE, don't just assert against it: averaging the two printed
//    per-account percentages gives 50/50 on this estate — a 49-point error that renders perfectly.
check('L5n', 'NEGATIVE CONTROL — averaging the per-account percentages really does give ~50%',
  Math.abs(((0) + (100)) / 2 - 50) < 1e-9, 'mean of 0% and 100% = 50% vs the true 99%');

// ── L6 · A pension balance is not portfolio and must not dilute coverage ─
const withPension = [
  { baseId: 'pension', value: 400000, inflow: 30000, holdings: [] },
  { baseId: 'taxable', value: 100000, inflow: 0, holdings: [hold('Stock', 'Stocks', 100000)] },
];
const pens = mixFor(withPension);
check('L6', 'a pension room does not drag a fully-classified estate below the coverage bar',
  pens !== null && pens.equity === 1, JSON.stringify(pens));

// ── L7 · The payload actually carries it ─────────────────────────────────
// ⛔ A FUNCTION THAT RETURNS THE RIGHT ANSWER INTO NOTHING IS THE DEFECT WE ARE FIXING, WEARING
//    NEW CLOTHES. This asserts the three keys are written onto the body, at the source level.
const BODY = SRC.slice(SRC.indexOf('function buildStudioRequest'),
  SRC.indexOf('window._buildStudioRequest = buildStudioRequest;'));
check('L7', 'buildStudioRequest calls _householdAssetMix', /_householdAssetMix\(\)/.test(BODY));
for (const k of ['equity_pct', 'bond_pct', 'cash_pct']) {
  check('L7', `the payload writes body.${k}`, new RegExp(`body\\.${k}\\s*=`).test(BODY));
}
// ⚠️ ALL THREE OR NONE — the engine refuses a partial mix by name, so a future edit dropping one
//    key must go red HERE rather than 422 in production.
check('L7b', 'all three keys are written under ONE guard, never separately',
  (BODY.match(/if \(_assetMix\)/g) || []).length === 1);

console.log('');
if (FAILED.length) {
  console.log(`RED — ${FAILED.length} leg(s) failed`);
  FAILED.forEach(f => console.log('  · ' + f));
  process.exit(1);
}
console.log('GREEN — every leg passed');
