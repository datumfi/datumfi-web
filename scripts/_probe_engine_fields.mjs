/* ══ THE ENGINE FIELD PROBE — WHICH REQUEST FIELDS DOES THE ENGINE ACTUALLY CONSUME? ════════════
 *
 * ⛔ RUN IT ONLY WITH --go, AND ONLY WITH A REASON. Every arm is a metered POST to /api/calculate
 * (F48: proxy + token + edge rate-limit; F30: compute cost scales with WEALTH, not account count).
 * The measured results are BANKED IN THIS HEADER precisely so the next agent does not buy them
 * again. 🔑 A METERED MEASUREMENT THAT IS NOT WRITTEN DOWN WILL BE PURCHASED TWICE.
 *
 * ⛔ SMALL SYNTHETIC ESTATE, NEVER A REAL ONE. One taxable account, $100,000. The question is which
 * KEYS the engine honours, and that does not depend on the balance.
 *
 * ══ MEASURED 2026-08-30, engine spec_version "2.0", at repo b47b916 ═════════════════════════════
 *
 *   NOISE FLOOR (null pair, byte-identical payloads): EXACTLY 1 of 248 leaf paths differs —
 *   `computation_time_s`. Everything else is deterministic. THIS IS WHAT MAKES THE REST READABLE.
 *
 *   CANARY (a nonsense key): HTTP 200 → THE ENGINE IS PERMISSIVE. Unknown keys are accepted and
 *   SILENTLY IGNORED. 🔑 SO A 200 IS NOT EVIDENCE OF ANYTHING. Only a measured OUTPUT CHANGE proves
 *   consumption, which is why every arm below is differential rather than a status check.
 *
 *   location   FL -> CA .................. 0 paths moved  => NOT CONSUMED
 *   filing_status + gross_salary
 *     + tax_bracket ...................... 0 paths moved  => NOT CONSUMED
 *   plan_end_age -> 100 ................. 80 paths moved  => CONSUMED, LOAD-BEARING
 *       mechanism, from the engine's own `params` echo: n_years 28 -> 35.
 *       Baseline retirement_age 65 + 28 = 93 (the default horizon). With plan_end_age 100,
 *       65 + 35 = 100. Exact. Tiers, success_rates and every stress result move with it.
 *
 *   ⚠️ THE WORKBOOK IS A MAJOR VERSION BEHIND. `Python Engine Spec` is v1.8; the engine reports
 *   spec_version "2.0". ALL EIGHT documented RESPONSE fields (survival_floor_spend,
 *   structural_ceiling_spend, foundation_spend, keystone_spend, datum_zone, convergence_score,
 *   fragility_score, datum_legacy_p50) ARE ABSENT. The real top level is:
 *     tiers · success_rates · stress · bedrock_stress · legacy · convergence · fragility ·
 *     mc_75_ceiling · mc_99_floor · bridge_access · matrix · params · computation_time_s ·
 *     spec_version
 *
 * ══ ⛔⛔ THE FIRST VERSION OF THIS PROBE REPORTED A CONFIDENT FALSE NEGATIVE. READ THIS. ══════════
 *
 * Probe 1 compared EIGHT hand-picked response fields taken FROM THE STALE SPEC. None of them exist
 * in the real response, so the comparison ran `{}` vs `{}` — TRUE FOR EVERY ARM. It reported
 * `plan_end_age` NOT CONSUMED. That is the exact opposite of the truth: it moves 80 paths.
 * 🔑 A PREDICATE OVER AN EMPTY SET IS TRUE, AND A KEY LIST THAT MATCHES NOTHING IS AN EMPTY SET
 *    WEARING THE COSTUME OF A MEASUREMENT.
 * ⭐⭐ AND SEE THE COMPOUNDING WHOLE, BECAUSE IT IS THE REAL LESSON: THE STALE DOCUMENT DID NOT ONLY
 *    MISINFORM THE QUESTION — IT BUILT THE INSTRUMENT THAT ANSWERED IT. A bad spec produced a bad
 *    probe which produced a confident wrong verdict. Three layers, one root.
 * ⛔ THE FIX IS STRUCTURAL AND IT IS WHY THIS FILE FLATTENS THE WHOLE BODY: ENUMERATE THE
 *    POPULATION, DO NOT NOMINATE IT. Every leaf path is compared; nothing is chosen in advance.
 * ⚠️ THE SAME ERROR WAS MADE A SECOND TIME THE SAME DAY, ON THE REQUEST SIDE: "the Studio sends at
 *    least 18 fields" was read off `_computeSig`'s key list. MEASURED by calling the live builder,
 *    the base payload has EIGHT keys — current_age · retirement_age · location · datum_spend ·
 *    market_outlook · ss_strategy_primary · accounts · plan_end_age — plus up to six CONDITIONAL
 *    ones (custom_weights, ss_primary/secondary_benefit_overrides; and for the matrix
 *    co_architect_age, ss_strategy_secondary, current_ss_plan, matrix_depth).
 *    ⛔ `_computeSig` NAMES FOUR KEYS THAT ARE NEVER ASSIGNED ANYWHERE — ss_haircut, current_cape,
 *    bridge_access_mode, co_architect_retirement_age. They hash as undefined forever. A SIGNATURE
 *    LIST IS AN INTENTION; ONLY THE BUILDER'S OUTPUT IS A FACT.
 *
 * ⛔ NOT NAMED _gate_* OR _p<digit>*. _suite_baseline.mjs builds its population from
 * /^(_gate_|_p\d)/ over scripts/ — `_probe_` is `_p` + `r`, not a digit, so this costs NO
 * population slot and can never be run argument-less by the suite and counted a green that tested
 * nothing. Same prefix dodge as _render_diff.js and _c3_light_probe.mjs.
 *
 * Usage: node scripts/_probe_engine_fields.mjs [--go] [--out FILE]
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';

const URL_ = 'https://datumfi.com/api/calculate';
const argv = process.argv.slice(2);
const GO = argv.includes('--go');
const OUT = (() => { const i = argv.indexOf('--out'); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; })();

const BASE = () => ({
  current_age: 45, retirement_age: 65, location: 'FL', ss_strategy_primary: 'full_67',
  datum_spend: 40000, market_outlook: 'history_repeats',
  accounts: [{ type: 'taxable', balance: 100000, annual_contribution: 5000 }]
});

/* A1/A2 are the NULL PAIR and they run FIRST. ⛔ A DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS
   NOT A MEASUREMENT, IT IS A NUMBER — and this is a Monte Carlo engine, so stochastic output was a
   live possibility, not a formality. B is the CANARY. The rest are one-field arms. */
const ARMS = [
  ['A1_null', BASE()],
  ['A2_null', BASE()],
  ['B_canary', { ...BASE(), __datum_probe_canary_zzz: 'not-a-real-field' }],
  ['C_locationCA', { ...BASE(), location: 'CA' }],
  ['D_filing_salary_bracket', { ...BASE(), filing_status: 'married_filing_separately', gross_salary: 250000, tax_bracket: 32 }],
  ['F_planEnd100', { ...BASE(), plan_end_age: 100 }]
];

if (!GO) {
  console.log('DRY RUN — no metered calls made. Arms that WOULD run:');
  ARMS.forEach(([n]) => console.log('   ' + n));
  console.log('\nThe measured answers are already banked in this file\'s header.');
  console.log('Re-run with --go ONLY to re-verify against a NEW engine version.');
  process.exit(0);
}

const bodies = {};
for (const [name, body] of ARMS) {
  const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const txt = await r.text();
  bodies[name] = { status: r.status, txt };
  console.log(name.padEnd(26) + ' HTTP ' + r.status + '  ' + txt.length + ' bytes');
  await new Promise((s) => setTimeout(s, 1500));      // polite to the edge rate-limit rule
}

/* Flatten to leaf paths: nothing chosen in advance, nothing compared by eye. */
function flat(o, p = '', out = {}) {
  if (o === null || typeof o !== 'object') { out[p] = JSON.stringify(o); return out; }
  if (Array.isArray(o)) { o.forEach((v, i) => flat(v, p + '[' + i + ']', out)); return out; }
  for (const k of Object.keys(o)) flat(o[k], p ? p + '.' + k : k, out);
  return out;
}
const F = {};
for (const k of Object.keys(bodies)) { try { F[k] = flat(JSON.parse(bodies[k].txt)); } catch { F[k] = null; } }
const paths = new Set();
for (const k of Object.keys(F)) if (F[k]) Object.keys(F[k]).forEach((p) => paths.add(p));
const diff = (a, b) => [...paths].filter((p) => (F[a] || {})[p] !== (F[b] || {})[p]);

console.log('\nTOTAL LEAF PATHS: ' + paths.size);
const noise = diff('A1_null', 'A2_null');
console.log('NOISE FLOOR (identical input): ' + noise.length + ' path(s) — ' + noise.join(', '));
if (noise.length > 20) {
  console.log('⛔ NOISE FLOOR TOO WIDE — the engine is not deterministic enough for a single-pair');
  console.log('   differential. Do NOT read the arms below as consumption verdicts.');
}
console.log('CANARY: HTTP ' + bodies.B_canary.status
  + (bodies.B_canary.status === 200 ? ' => PERMISSIVE (unknown keys silently ignored; a 200 proves nothing)'
                                    : ' => STRICT (unknown keys rejected)'));
for (const arm of ['C_locationCA', 'D_filing_salary_bracket', 'F_planEnd100']) {
  const real = diff('A1_null', arm).filter((p) => !noise.includes(p));
  console.log('\n' + arm + ': ' + real.length + ' real path(s) moved => '
    + (real.length === 0 ? 'NOT CONSUMED' : 'CONSUMED'));
  real.slice(0, 12).forEach((p) => console.log('   * ' + p + '  ' + String(F.A1_null[p]).slice(0, 28) + ' -> ' + String(F[arm][p]).slice(0, 28)));
}
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(bodies, null, 1)); console.log('\nbodies -> ' + OUT); }
