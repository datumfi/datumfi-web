/* DEV-ONLY shared gate harness — PHASE 0 of the studio.html split.
 *
 * THE ONE PLACE THAT KNOWS WHERE THE STUDIO SOURCE LIVES.
 *
 * THE PROBLEM THIS EXISTS TO KILL. 90 gate files read studio.html off disk as text, each with its
 * own readFileSync and its own idea of the path. studio.html is 18,530 lines / 1.56 MB and is going
 * to be split — and the instrument breaks LONG before the product does, because on the day the first
 * function moves out of that file, every one of those 90 gates is reading a file that no longer
 * contains what it is asserting about. They would not crash. They would go RED, in bulk, for a
 * reason that has nothing to do with the room they guard — which is the same failure that killed six
 * gates in one commit (#429) and eight HELOC gates in another, and is exactly what `lift()` and
 * `extractClosure()` were built to stop one level down.
 * 🔑 THIS CONVERTS "90 GATES AT RISK" INTO "ONE HELPER". After the split this function returns the
 *    shell PLUS the extracted parts, concatenated in source order, and all 90 callers keep working
 *    without being touched a second time.
 *
 * ⚠️ WHAT IT IS NOT. It is not a parser, a cache invalidator, or a place to put cleverness. It reads
 * a file and returns a string. Every gate that used to do that itself now asks here instead. A MOVE
 * DOES NOT IMPROVE — the only behaviour change is the cwd fix below, which is a CONSEQUENCE of
 * consolidating the path, not a second feature.
 *
 * ⭐ THE cwd FIX, REPORTED NOT SOLD. 78 of the 90 call sites read the bare relative path
 * 'studio.html', so they worked only because the suite runner happens to spawn gates from the repo
 * root. Run one from anywhere else and it threw ENOENT against code that was perfectly correct.
 * Resolving from THIS module's own location removes that dependency for all of them at once. No gate
 * relied on the throw; nothing that passed before can fail now.
 *
 * ⚠️ WHY .cjs, AND IT WAS MEASURED RATHER THAN ASSUMED. The 90 callers are 79 ESM (.mjs) and 11
 * CommonJS (.js) — package.json declares no "type", so .js IS CommonJS here. An .mjs helper would
 * strand the 11; shipping two helpers would duplicate the single fact this file exists to hold,
 * which is the defect, not the fix. A .cjs using `exports.NAME =` is importable from BOTH:
 * verified on Node v25.9.0 that `import { studioSource } from './_studio_source.cjs'` and
 * `require('./_studio_source.cjs')` each return the function.
 *
 * ⛔ AND WHY IT IS NOT NAMED _gate_ANYTHING. _suite_baseline.mjs builds the gate population by
 * globbing ^(_gate_|_p\d) × .js|.mjs and then removing helper modules VIA A HAND-MAINTAINED LIST OF
 * ONE. Its own comment predicts the failure: "Helper modules: they export, they do not run. Running
 * one would exit 0 and be counted a false GREEN." A helper named _gate_source.mjs would therefore be
 * EXECUTED as a gate, exit 0, and inflate the score with a test that tests nothing. This file dodges
 * that by PREFIX and by EXTENSION — two independent structural reasons — and adds nothing to the
 * hand-maintained list. (That list wanting a structural rule instead of a roster — "an export-only
 * module is not a gate" — is carried, not scheduled.)
 */
const fs = require('node:fs');
const path = require('node:path');

const STUDIO_PATH = path.join(__dirname, '..', 'studio.html');

/* MEMOISED PER PROCESS. Safe because JS strings are immutable: the many gates that do
   `let s = studioSource(); if (RED) s = s.replace(...)` REBIND their own local, they do not mutate
   the shared value, so a poisoned red-first run cannot leak into anything else. Each gate is its own
   process, so this saves little wall-clock — it is here so that repeated calls inside ONE gate
   return the identical string, which keeps _gate_extract's source-keyed defIndex cache to one entry
   instead of one per call. */
let _cache = null;

/**
 * The full text of the Studio source, exactly as the gates have always read it.
 * @returns {string} studio.html as UTF-8 text.
 */
function studioSource() {
  if (_cache === null) _cache = fs.readFileSync(STUDIO_PATH, 'utf8');
  return _cache;
}

exports.studioSource = studioSource;
exports.STUDIO_PATH = STUDIO_PATH;
