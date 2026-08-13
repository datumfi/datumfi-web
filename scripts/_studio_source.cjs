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

/* ══ THE PARTS REGISTRY — PHASE 0's SECOND HALF, BUILT 2026-08-13 ═══════════════════════════════
 * This file's header has promised since day one that "after the split this function returns the
 * shell PLUS the extracted parts, concatenated in source order". ⛔ THAT WAS DESCRIBED, NEVER BUILT
 * — studioSource() read studio.html and nothing else. The description reading as an implementation
 * is the same shape as a spec row reading as a live description (§42), one layer down, in our own
 * instrument.
 *
 * ⭐ WHY IT MATTERS MORE THAN IT LOOKS. The gates resolve dependencies by catching
 * "X is not defined" and pulling X out of THIS STRING. All twelve gates that slice the property
 * carrying-cost math are node/sandbox gates that do exactly that. So until this registry exists,
 * MOVING ANY FUNCTION A SANDBOX GATE REACHES OUT OF studio.html REDS TWELVE GATES AT ONCE — which
 * is precisely the "90 reds that say nothing about the rooms they guard" this file was created to
 * prevent. The seam existed; the hinge did not.
 *
 * ⛔ THE REGISTRY IS EMPTY TODAY, AND THE EMPTINESS IS THE SAFETY ARGUMENT. `compose()` RETURNS THE
 * SHELL UNTOUCHED when there are no parts — byte-identical BY CONSTRUCTION, not by luck, so all 90
 * callers are provably unaffected by this commit. ⚠️ AND AN EMPTY REGISTRY MEANS THE MECHANISM IS
 * UNEXERCISED BY THE PRODUCT, which is the "fixture that never builds the failing state" trap. That
 * is why compose() is EXPORTED and driven with synthetic parts by _gate_studio_source, and why the
 * extractor is run over the composed result rather than the mechanism merely being eyeballed.
 *
 * ⭐ PARTS ARE APPENDED, NEVER PREPENDED OR INTERLEAVED. Every caller does indexOf / regex /
 * extractClosure over this text; appending cannot shift a single existing offset. "Source order"
 * therefore means REGISTRY order, and the registry is the record of it.
 *
 * ⛔ A MISSING PART FILE THROWS. It must never be skipped with a warning: a silently-dropped part
 * gives every gate a string that is missing definitions they assert about, and they would go red
 * (or worse, green on an absence) for a reason nobody could trace back to here. A PRECONDITION THAT
 * WARNS AND CONTINUES IS A COMMENT. */
const PARTS = [
  /* ⭐ THE FIRST PART, REGISTERED 2026-08-13 (§45 engine reach). The Operating Upkeep catalogue moved
     out of studio.html so it can be consumed by the TENSION phase page after the split. The twelve
     sandbox gates that slice calcCarryTotal -> _canonUtil -> _propUpkeepAnnual resolve
     `_upkForScope` out of THIS concatenation — which is the entire reason the registry exists. */
  'scripts/studio-upkeep.js'
];

const PART_OPEN  = (rel) => '/* ═════ studioSource PART BEGIN · ' + rel + ' ═════ */';
const PART_CLOSE = (rel) => '/* ═════ studioSource PART END · ' + rel + ' ═════ */';

/**
 * Concatenate the shell with zero or more parts. PURE — no I/O, so a gate can drive it with
 * synthetic parts and exercise the real code path without a fake file on disk.
 * @param {string} shell the studio.html text
 * @param {Array<{rel: string, text: string}>} parts
 * @returns {string}
 */
function compose(shell, parts) {
  if (!parts || parts.length === 0) return shell;          // byte-identical by construction
  return shell + parts.map(function (p) {
    return '\n' + PART_OPEN(p.rel) + '\n' + p.text + '\n' + PART_CLOSE(p.rel) + '\n';
  }).join('');
}

/**
 * The registered parts, read from disk. Throws if one is missing — see the registry note above.
 * ⭐ TAKES AN OPTIONAL LIST *ONLY* SO THE GATE CAN DRIVE THE THROW PATH FOR REAL. The first version
 * of that leg asserted the throw by GREPPING THIS FILE for its own error string — which proves the
 * sentence exists, not that the code runs it. That is the matching-on-prose defect this repo keeps
 * paying for, committed inside the gate written to prevent it.
 * @param {string[]} [rels] defaults to the registry
 */
function readParts(rels) {
  return (rels || PARTS).map(function (rel) {
    const abs = path.join(__dirname, '..', rel);
    if (!fs.existsSync(abs)) {
      throw new Error('studioSource: registered part "' + rel + '" does not exist at ' + abs +
        ' — a part that cannot be read must never be silently skipped.');
    }
    return { rel: rel, text: fs.readFileSync(abs, 'utf8') };
  });
}

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
  if (_cache === null) _cache = compose(fs.readFileSync(STUDIO_PATH, 'utf8'), readParts());
  return _cache;
}

exports.studioSource = studioSource;
exports.STUDIO_PATH = STUDIO_PATH;
/* Exported FOR THE GATE, deliberately. compose() is pure so the mechanism can be proven with
   synthetic parts while PARTS is still empty; PART_RELS lets the gate assert the registry's own
   state rather than hard-coding a belief about it in two places. */
exports.compose = compose;
exports.PART_RELS = () => PARTS.slice();
exports.readParts = readParts;
