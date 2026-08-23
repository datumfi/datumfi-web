/* ══ THE VERDICT READER — ONE PARSER, TWO INSTRUMENTS ═════════════════════════════════════════════
 *
 * ⛔⛔ THIS FILE EXISTS SO THERE IS EXACTLY ONE ANSWER TO "DID THAT GATE GO RED?". It was extracted
 * VERBATIM from _suite_baseline.mjs on 2026-08-23 — same regexes, same noise filter, same
 * one-directional rule — because a SECOND instrument now needs to read verdicts and a copy would be
 * a fork. Two parsers would drift, and the day they disagreed about what RED means the disagreement
 * would be SILENT: each internally consistent, one wrong.
 *   🔑 THE SAME LAW THE POPULATION OBEYS. "Ask the runner for the population; never glob one" is why
 *      the census is not re-implemented per gate. This is that rule applied to the VERDICT rather
 *      than the population — a second opinion about what the suite RAN, or about what it DECIDED, is
 *      a fork either way.
 *
 * ⚠️ IT IS NOT A GATE AND MUST NEVER BECOME ONE. The runner globs for a leading `_gate_` or `_p`+digit,
 * so the leading `_v` keeps this file OUT of the population BY CONSTRUCTION — no HELPERS entry, no
 * count change. Renaming it to match that pattern would silently add a "gate" that asserts nothing.
 *
 * CONSUMERS
 *   scripts/_suite_baseline.mjs             classifies every gate in the suite (INCOHERENT lives here)
 *   scripts/_gate_controls_still_red.mjs    reads a gate's verdict when its CONTROL is invoked
 *
 * ⭐ THE EXTRACTION IS PROVED BY THE SUITE ITSELF, AND THE PROOF IS STRONGER THAN IT LOOKS: the
 * runner's `incoherent` sentinel prints `OVERALL: RED` and exits 0, so if this parser stops parsing,
 * that sentinel is misclassified GREEN and the self-check ABORTS. A broken reader does not produce a
 * green suite — it produces NO suite. Measured 2026-08-23 via `--sabotage=incoherent`, which holds
 * the exit code constant at 0 and varies ONLY the printed verdict, isolating this parser exactly.
 */

/* ══ §13.90 · THE VERDICT/EXIT RECONCILIATION · 2026-08-16 ═════════════════════════════════════════
   THE ASK WAS "make the exit code incapable of disagreeing with its own score block". IT ALREADY WAS.
   `status` derives from the exit code, the score block prints from `status`, and the final exit
   derives from the same arrays — three honest derivations, all agreeing, all downstream of ONE input.

   ⛔ THE DISAGREEMENT IS A LEVEL DOWN, AND IT IS BETWEEN THE GATE AND ITSELF. `status` never read the
   gate's OWN PRINTED VERDICT. A gate that prints `OVERALL: RED` and then exits 0 was classified GREEN,
   counted GREEN, and this runner honestly exited 0 over it. Nothing here was broken; the input was.
   🔑 A CHAIN OF HONEST DERIVATIONS FROM A WRONG INPUT IS STILL WRONG. "INTERNALLY CONSISTENT" IS NOT
      "CORRECT" — and hardening the links would have shipped a green guard over a live defect.

   THE RULE IS DELIBERATELY ONE-DIRECTIONAL, and the asymmetry is the point. Only `says RED, exits 0`
   is reclassified, because that is the direction that MANUFACTURES A FALSE PASS and because a printed
   RED verdict provably cannot mean GREEN. The inverse — says GREEN, exits non-zero — STAYS RED and
   gets read by a human: the process may have died after rendering its verdict, and that is exactly the
   kind of ambiguity §13.68 forbids a classifier from guessing at.
     🔑 ONLY RECLASSIFY WHAT IS PROVABLY NOT A VERDICT. (Same rule the CRASH boundary obeys.)

   ⛔ PRECISION BEATS RECALL HERE, BECAUSE OF WHAT A FALSE POSITIVE COSTS. A reconciliation guard that
   manufactures disagreements teaches everyone to ignore the one signal it exists to make trustworthy.
   Every red-first control in this repo PRINTS the word RED by design ("MODE: RED-FIRST … MUST be RED"),
   so a naive scan for "RED" would red the whole suite on gates that are working perfectly. VERDICT_NOISE
   drops those lines before any pattern is tried, and the `redWord` sentinel holds that boundary open.

   COVERAGE IS REPORTED, NEVER ASSUMED. The vocabulary here is genuinely heterogeneous — measured over
   the runner's own receipt, only 60 of 227 gates print an `OVERALL:` line; the rest say `GATE GREEN`,
   `CLEAN GREEN n / RED n`, `GREEN — n failing`, `n passed, n failed`, `SCORE n/n GREEN`. A gate whose
   verdict cannot be parsed is NOT covered and NOT silently called covered: the score block prints the
   uncovered count so the guard's reach is visible and can shrink on purpose.
   ⚠️ AND THE LIMIT THAT CANNOT BE MEASURED FROM A GREEN RUN: a passing suite only teaches the
   vocabulary of SUCCESS. The RED forms below are the failure shapes of the same six dialects, proven
   by sentinel rather than by observation, because no green population can exhibit them. */
const VERDICT = [
  // [name, regex, declares-a-FAILURE?]
  ['overall',       /^\s*OVERALL:\s*(GREEN|RED)\b/,                    (m) => m[1] === 'RED'],
  ['gate',          /^\s*(?:✅|❌|⛔)?\s*GATE\s+(GREEN|RED)\b/,          (m) => m[1] === 'RED'],
  ['clean-count',   /^\s*CLEAN\s+GREEN\s+\d+\s*\/\s*RED\s+(\d+)\b/,    (m) => Number(m[1]) > 0],
  ['failing-count', /\bGREEN\s*[—-]\s*(\d+)\s+failing\b/,              (m) => Number(m[1]) > 0],
  ['passed-failed', /^\s*(\d+)\s+passed,\s*(\d+)\s+failed\b/,          (m) => Number(m[2]) > 0],
  ['score',         /^\s*SCORE\s+\d+\s*\/\s*\d+\s+(GREEN|RED)\b/,      (m) => m[1] === 'RED'],
];
/* Lines that TALK ABOUT a red instead of DECLARING one. Dropped before any pattern is tried. */
const VERDICT_NOISE = /RED-?FIRST|redfirst|--red|MODE:|\[BITE|MUST be RED|would be RED|goes RED|stays RED/i;

function readVerdict(text) {
  let seen = false, failed = null;
  for (const line of String(text || '').split('\n')) {
    if (VERDICT_NOISE.test(line)) continue;
    for (const [pattern, re, isFail] of VERDICT) {
      const m = re.exec(line);
      if (!m) continue;
      seen = true;
      if (!failed && isFail(m)) failed = { pattern, line: line.trim().slice(0, 160) };
    }
  }
  return { seen, failed };
}

export { VERDICT, VERDICT_NOISE, readVerdict };
