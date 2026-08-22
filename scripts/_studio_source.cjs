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
  'scripts/studio-upkeep.js',
  /* ⭐ THE SECOND PART, REGISTERED 2026-08-13 — STEP 2a, THE PROVING MOVE. calculateTotalPmt,
     calculateEscrowMonthly and hasEscrow: pure leaves (no callees, no DOM, no state) reached by
     THREE room families, so 49 gate-references resolve out of THIS concatenation.
     ⛔ AND THIS REGISTRATION IS EXACTLY WHAT scripts/_gate_parts_wired.mjs EXISTS TO DISTRUST:
     registering a part makes every sandbox gate green whether or not any PAGE loads it. Registration
     is not wiring. The <script src> in studio.html's head is the other half, and it is gated
     separately and reported separately. */
  'scripts/studio-debt-cost.js',
  /* ⭐ THE THIRD PART, REGISTERED 2026-08-13 — STEP 1, THE LANDING. Born as a part rather than as
     more inline studio.html because the landing becomes its own surface at Step 3: written from day
     one to be consumed by a page that is not studio.html. */
  'scripts/studio-landing.js',
  /* ⭐ THE FOURTH PART, REGISTERED 2026-08-20 — the panel resizer. Shell infrastructure: it owns the
     drafting panel's width and its disclosure tier, and it SURVIVES Step 3 unchanged because the
     shell is what the phase pages will be served from. Registered so the pairing is inspectable by
     a gate, and tagged in studio.html's head so _gate_parts_wired can prove the page loads it —
     REGISTRATION IS NOT WIRING, and both halves are reported separately. */
  'scripts/studio-panel-resize.js',
  /* ⭐ THE FIFTH PART, REGISTERED 2026-08-22 — STEP 3 · MOVE 1a, and by far the largest: the account
     modal builder, 191,633 bytes / 1,575 lines / 11.19% of studio.html in ONE function with 22
     callers. Registered because 23 gate files read openAccountModal out of the Studio source and
     they must keep resolving it — that is the whole reason this registry exists.
     ⛔ AND THE REGISTRATION IS WHY 1a-pre HAD TO LAND FIRST. compose() APPENDS, so the moment this
     line exists the builder sits AFTER anchors that used to follow it, and five §20 gates that
     sliced it between two anchors would have gone silently EMPTY while printing green. They now
     brace-walk via extractWindowFn(). REGISTRATION IS NOT WIRING: the <script src> in studio.html's
     head is the other half, and _gate_parts_wired proves it separately. */
  'scripts/studio-account-modal.js'
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

/* ══ STRIP COMMENTS — A TOKENIZER, BECAUSE A REGEX CANNOT DO THIS ══════════════════════════════
 * ⛔⛔ THE DEFECT CLASS: every matcher in this harness reads TEXT, and a comment that QUOTES code is
 * indistinguishable from code to a text matcher. Measured at Move 1a: a part-file header quoting
 * `window.openAccountModal = function` made extractWindowFn return 217 characters of PROSE.
 * _gate_extract hit the identical hole in 2026-08-08, and _gate_studio_source's own header records
 * it flagging THIS FILE twice. 🔑 A RESOLVER THAT READS PROSE AS CODE WILL EVENTUALLY FIND A DEFECT
 * SOMEBODY ONLY DESCRIBED.
 *
 * ── ⭐ WHY ONE SHARED IMPLEMENTATION, MEASURED BEFORE IT WAS WRITTEN ────────────────────────────
 * THREE private strippers already existed and they were NOT equivalent — the same shape as `$`
 * defined 23 times. Measured on the composed source (1,775,534 chars):
 *     _gate_token_authority.js   length NOT preserved, lines NOT kept, 319,094 chars lost
 *     _gate_studio_source.mjs    length NOT preserved, lines kept,     196,319 chars lost
 *     _gate_property_18_10.mjs   length preserved,     lines kept,           0 lost
 * ⛔ THE VIABILITY TEST IS OFFSET PRESERVATION, AND ONLY ONE OF THE THREE PASSED IT. extractWindowFn
 * and partSurface report POSITIONS; a stripper that shortens the string silently shifts every
 * position downstream and returns plausible text the whole way. The cheapest-looking of the three
 * was the only one that could not be used at all.
 *
 * ── ⛔ AND THE BEST OF THE THREE WAS STILL WRONG — CHECKED AGAINST A PARSER, NOT AGAINST TASTE ──
 * Validated against espree's true comment ranges over 2,084 real comments: 0 code bytes altered,
 * but 12 COMMENTS LEFT STANDING. Three measured causes, all of which this tokenizer handles and a
 * quote-only state machine cannot:
 *     1. a REGEX LITERAL containing a quote — `.replace(/"/g, '&quot;')` opened a phantom string
 *        and swallowed every comment until the next quote (studio.html 7594, 11741)
 *     2. TEMPLATE `${...}` INTERPOLATION with nested quotes (9424, 9614)
 *     3. escaped quotes inside concatenated strings (10119)
 * 🔑 "IT IS THE BEST ONE WE HAVE" AND "IT IS CORRECT" ARE DIFFERENT CLAIMS, AND ONLY AN INDEPENDENT
 *    ORACLE CAN TELL THEM APART. scripts/_oracle_strip_comments.mjs is that oracle, kept in the repo
 *    and out of the suite; the fixture battery in _gate_studio_source is the permanent regression.
 *
 * ⚠️ TWO RESIDUALS, AND THEY ARE NOT THE SAME KIND OF THING. A comment left standing is a FALSE
 * POSITIVE — loud, the gate reds, somebody looks. A code byte altered is a FALSE NEGATIVE — the
 * matcher judges a SMALLER population and goes green over what it can no longer see. Never sum them.
 *
 * ⚠️ IT IS A FILTER, NOT THE WHOLE ANSWER. extractWindowFn and partSurface ALSO require a definition
 * to start a line. Two filters are worth having only because they fail in DIFFERENT places: this one
 * misses nothing the parser sees but is a tokenizer over HTML+JS; line-start is trivially correct but
 * blind to a comment whose line begins at column zero. Two filters that fail in the same place are
 * one filter and a false sense of depth.
 * @param {string} src any text — HTML, JS, or the composed source
 * @returns {string} the same text, byte-for-byte in length, with comment interiors blanked
 */
const _RX_OK_CHARS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '^', '~', '\n']);
const _RX_OK_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw']);

/** Is the `/` at `i` the start of a regex literal rather than a division? */
function _regexAllowedAt(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  const c = src[j];
  if (/[A-Za-z0-9_$]/.test(c)) {
    let k = j;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(src[k])) k--;
    return _RX_OK_WORDS.has(src.slice(k + 1, j + 1));
  }
  /* ⛔ `<` AND `>` ARE EXCLUDED ON PURPOSE. This runs over the COMPOSED source — HTML plus
     concatenated JS — where `</div>` and `/>` appear on nearly every line of markup. Allowing a
     regex after `<` would open a phantom regex at every closing tag. The cost is that
     `a < /re/.test(b)` is missed; that shape does not occur here and is vanishingly rare anywhere. */
  /* ⭐ BUT `=>` IS AN ARROW, NOT A COMPARISON, AND `(s) => /re/.test(s)` IS EVERYWHERE. Excluding
     `>` wholesale broke that idiom — caught by the oracle over scripts/, never by the one block. */
  if (c === '>') return j > 0 && src[j - 1] === '=';
  if (c === '<') return false;
  if (c === ')' || c === ']' || c === '}') return false;
  return _RX_OK_CHARS.has(c);
}

function stripComments(src) {
  let out = '';
  let mode = 'code', quote = null, inClass = false, braceDepth = 0;
  const tplStack = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && n === '/') { out += '  '; i++; mode = 'line'; continue; }
      if (c === '/' && n === '*') { out += '  '; i++; mode = 'block'; continue; }
      if (c === '/' && _regexAllowedAt(src, i)) { out += c; mode = 'regex'; inClass = false; continue; }
      if (c === '"' || c === "'") { out += c; mode = 'str'; quote = c; continue; }
      if (c === '`') { out += c; mode = 'tpl'; continue; }
      if (c === '{') { braceDepth++; out += c; continue; }
      if (c === '}') {
        if (tplStack.length && braceDepth === 0) { braceDepth = tplStack.pop(); out += c; mode = 'tpl'; continue; }
        braceDepth = Math.max(0, braceDepth - 1); out += c; continue;
      }
      out += c; continue;
    }
    /* ⛔ `\r` IS A LINE TERMINATOR AND IS **NOT** PART OF THE COMMENT. Blanking it altered a real
       code byte in every CRLF file in the repo — the SILENT direction, and invisible until the
       oracle ran over a population wider than one LF-only block. */
    if (mode === 'line') { if (c === '\n' || c === '\r') { mode = 'code'; out += c; } else out += ' '; continue; }
    if (mode === 'block') {
      if (c === '*' && n === '/') { out += '  '; i++; mode = 'code'; continue; }
      out += (c === '\n' ? '\n' : ' '); continue;
    }
    if (mode === 'str') {
      if (c === '\\') { out += c + (n === undefined ? '' : n); i++; continue; }
      out += c;
      /* A string cannot cross a newline. Bailing at the line end BOUNDS the damage of a misread
         quote to one line instead of letting it swallow the rest of the file — which is exactly
         what the old stripper did at 7594. */
      if (c === quote || c === '\n') { mode = 'code'; quote = null; }
      continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { out += c + (n === undefined ? '' : n); i++; continue; }
      if (c === '$' && n === '{') { out += '${'; i++; tplStack.push(braceDepth); braceDepth = 0; mode = 'code'; continue; }
      out += c;
      if (c === '`') mode = 'code';
      continue;
    }
    if (mode === 'regex') {
      if (c === '\\') { out += c + (n === undefined ? '' : n); i++; continue; }
      if (c === '\n') { out += c; mode = 'code'; inClass = false; continue; }   // a regex cannot span lines
      out += c;
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) mode = 'code';
      continue;
    }
  }
  return out;
}

/* ══ EXTRACT A `window.NAME = function` DEFINITION — POSITION-INDEPENDENT BY CONSTRUCTION ═══════
 * ⛔⛔ THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE, STATED AS THE FAILURE IT PRODUCES:
 * MOVE A FUNCTION INTO A REGISTERED PART AND EVERY GATE THAT SLICED IT BETWEEN TWO ANCHORS GOES
 * SILENTLY EMPTY — still green-looking, still "running", asserting over nothing.
 *
 * Five gates (_gate_407_20_{2,3,4,5,9}) all did this, identically:
 *     const st = src.indexOf('window.openAccountModal = function(id)');
 *     const en = src.indexOf('window.closeAccountModal');
 *     if (st < 0 || en < 0) throw ...          // <- the guard, and it does NOT fire
 *     let BUILDER = src.slice(st, en);         // <- "" once the definition moves
 * compose() APPENDS parts, so after an extraction the definition sits AFTER anchors that used to
 * follow it. st > en, both are >= 0, the guard passes, and String.slice returns the empty string.
 *
 * ⭐ THIS IS THE PARTS-WIRED DEFECT INVERTED. That one is "a registered part is not a loaded part"
 * — gates green while the PAGE is broken. This one is "a moved part is not an extractable part" —
 * gates green while the GATE is broken. One root: an instrument encoding the file's topology as an
 * assumption it never states.
 *
 * ⛔ AND THE FIX IS A BRACE WALK, NOT A BETTER REGEX OR A SECOND ANCHOR. Any end-anchor scheme is
 * still a claim about what follows the definition in source order — exactly the claim the split
 * keeps falsifying. A brace walk reads only the definition itself, so it CANNOT INVERT. Measured
 * against the five gates' own slice on the pre-move source: byte-identical output, and identical
 * again against a composed string with the part appended.
 * @param {string} s   the (possibly composed) Studio source
 * @param {string} name  e.g. 'openAccountModal' — matched as `window.<name> = function`
 * @returns {string} the definition text, through its closing brace, with a trailing ';'
 */
function extractWindowFn(s, name) {
  const anchor = 'window.' + name + ' = function';
  /* ⛔⛔ A DEFINITION, NOT A MENTION — AND THIS IS NOT HYPOTHETICAL. Move 1a's own part-file header
     quoted this exact anchor while explaining why the assignment form is kept. indexOf() found the
     PROSE first, brace-walked into it, and returned 217 characters of comment ending at the `}` of
     "{2,3,4,5,9}". The five §20 gates would have asserted against a paragraph.
     🔑 A COMMENT STATES INTENT, NEVER BEHAVIOUR — and a comment that QUOTES code is indistinguishable
     from code to any matcher that only looks for the text. So the population is narrowed
     STRUCTURALLY: a real definition starts a line (indentation aside); a quoted one never does.
     ⭐ AND IT IS ASSERTED AS A POPULATION, NOT A FIRST-HIT. Zero throws, two throws — never a silent
     pick between them. That is the `$`-defined-23-times lesson applied one layer down: a name is not
     a population. */
  /* ⭐ TWO INDEPENDENT FILTERS, AND THEY FAIL IN DIFFERENT PLACES — which is the only reason to have
     two. The comment stripper is oracle-exact but is a tokenizer over HTML+JS; the line-start rule
     is trivially correct but blind to a comment whose line begins at column zero. Either alone
     would have caught the Move-1a header; neither alone is enough for the next one.
     ⛔ SEARCH THE STRIPPED TEXT, SLICE THE ORIGINAL. stripComments is length-preserving, so every
     offset found in `scan` is valid in `s`. That is the whole reason length preservation is an
     asserted invariant (T10) and not a nicety. */
  const scan = stripComments(s);
  const hits = [];
  for (let k = scan.indexOf(anchor); k >= 0; k = scan.indexOf(anchor, k + 1)) {
    const lineStart = scan.lastIndexOf('\n', k) + 1;
    if (/^[ \t]*$/.test(scan.slice(lineStart, k))) hits.push(k);
  }
  if (hits.length === 0) {
    throw new Error('extractWindowFn: no definition of window.' + name + ' in the Studio source — ' +
      'if it moved to a part, is that part registered in PARTS[]? (mentions in comments do not count)');
  }
  if (hits.length > 1) {
    throw new Error('extractWindowFn: window.' + name + ' is defined ' + hits.length + ' times — ' +
      'refusing to guess which one the caller meant.');
  }
  const i = hits[0];
  /* ⛔ THE BRACE WALK ALSO RUNS ON THE STRIPPED TEXT. A `{` inside a comment with no matching `}`
     would otherwise unbalance the walk and run it off the end of the function — a latent defect in
     the raw-source version that nothing had tripped yet. */
  let depth = 0, opened = false;
  for (let j = scan.indexOf('{', i); j < scan.length; j++) {
    if (scan[j] === '{') { depth++; opened = true; }
    else if (scan[j] === '}') {
      depth--;
      if (opened && depth === 0) return s.slice(i, j + 1) + ';';
    }
  }
  throw new Error('extractWindowFn: unbalanced braces walking window.' + name);
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
/* Exported for the five §20 builder gates — ONE implementation, so the next extraction cannot
   re-open this in four of them. Pure (string in, string out) so a gate can drive it with a
   synthetic composed string and exercise the inversion for real. */
exports.extractWindowFn = extractWindowFn;
/* THE ONE STRIPPER. Three private copies preceded it and disagreed; only one of the three preserved
   offsets, and even that one left 12 real comments standing. Validated by
   scripts/_oracle_strip_comments.mjs (opt-in, out of the suite) and regression-locked by the
   fixture battery in _gate_studio_source (in the suite, zero dependencies). */
exports.stripComments = stripComments;
