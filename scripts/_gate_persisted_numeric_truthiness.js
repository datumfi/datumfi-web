/* @gate-pool: node */
'use strict';
/* _gate_persisted_numeric_truthiness.js — STANDING GATE for the arc's defect class (§82.2092).
 *
 * THE CLAIM: no persisted value whose schema default is the NUMBER 0 is guarded, on the way into
 * the draft or on the way back out of it, by a BARE TRUTHINESS TEST.
 *
 * ⛔⛔ WHY THIS EXISTS, AND WHY IT IS A GATE AND NOT A STRONGER COMMENT. Four instances of one
 *    mechanism shipped in a single arc:
 *        parseFloat(...) || 22      blank meant married
 *        _txr > 0                   the band meant 22%
 *        parseInt(v, 10) || def     zero meant eight
 *        if (priSal)                zero meant $150,000 — the value the user had just replaced
 *    The rule was WRITTEN DOWN, correctly, in the very function that broke it: studio.html:14670
 *    says ">= 0, NOT > 0 ... separated by TYPE, not by magnitude", and the guard that violated it
 *    sat THIRTY-FOUR LINES BELOW, added in the same pass.
 * 🔑 A COMMENT IS NOT AN ENFORCEMENT MECHANISM. Four times running, documentation was mistaken for
 *    a control. This file is the control.
 *
 * ⛔ WHY THE CLASS EARNS ITS OWN INSTRUMENT. The failure is SILENT and it is FLATTERING: nothing
 *    throws, nothing blanks, and the number on screen is confidently wrong in the direction that
 *    makes the plan look better. A household with $3,000/mo of essentials and a lost salary reads a
 *    comfortable 24% of gross instead of an honest "unknown".
 *
 * ⭐ THE POPULATION IS DERIVED, NEVER NOMINATED. It is every leaf in DatumBlueprint['new']() whose
 *    default is the literal number 0 — precisely the set of values for which the schema CANNOT
 *    distinguish "unstated" from "answered zero", which is the PRECONDITION for this defect. A NEW
 *    ZERO-DEFAULTED KEY JOINS THIS GATE BY EXISTING. Nominating the fields would rebuild the
 *    nominated-population fault that let F47 be declared closed on three of thirteen.
 *
 * ⚠️ WHAT A GREEN HERE DOES **NOT** SAY, declared so nobody reads more into it than it holds:
 *   · It is a SOURCE gate. It proves a shape is absent from two files; it does not run the product.
 *     The behavioural half is _gate_profile_population_roundtrip.js's ZERO-VALUED leg, which drives
 *     real controls in a real browser. NEITHER SUBSTITUTES FOR THE OTHER — this one reaches sites no
 *     fixture visits, that one reaches defects no regex can name.
 *   · It matches TWO shapes (below), not "all truthiness". They are the two that produced every
 *     instance above. A matcher wide enough to catch everything fires on honest code, and the next
 *     person widens the exemption list instead of fixing the defect.
 *   · Its subjects are the two PERSISTENCE files. A truthy-zero fault in RENDERING is a different
 *     gate's problem and is not claimed here.
 *
 * LEGS
 *   L0 INSTRUMENT  the derived population is non-empty and both subject files were actually read.
 *   L1 CAPTURE     scripts/studio-blueprint.js carries no violation.
 *   L2 RESTORE     studio.html carries no violation.
 *   L3 CONTROL     the matcher FLAGS the two real pre-fix lines — it can go red at all.
 *   L4 HONEST HALF the matcher does NOT flag the two post-fix lines — it is not flagging everything.
 * ⛔ L3 AND L4 ARE THE DISJOINT RED SETS AND NEITHER IS OPTIONAL. L3 alone passes for a matcher that
 *    flags every line; L4 alone passes for a matcher that flags none. Only the pair says this is a
 *    measurement rather than a decoration.
 *
 * Run: node scripts/_gate_persisted_numeric_truthiness.js   (exit 0 = GREEN, non-0 = RED)
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let passes = 0, fails = 0; const out = [];
function check(label, cond, detail) {
  const ok = !!cond; ok ? passes++ : fails++;
  out.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          ' + detail : ''));
}

/* ── THE POPULATION, DERIVED FROM THE PRODUCT'S OWN SCHEMA ──────────────────────────────────── */
const BP = require('./studio-blueprint.js').DatumBlueprint;
const zeroLeaves = [];
(function walk(o) {
  if (!o || typeof o !== 'object') return;
  Object.keys(o).forEach(function (k) {
    const v = o[k];
    if (v === 0) { if (zeroLeaves.indexOf(k) === -1) zeroLeaves.push(k); return; }
    if (v && typeof v === 'object' && !Array.isArray(v)) walk(v);
  });
})(BP['new']());

/* ── THE MATCHER — TWO SHAPES, AND ONLY THE TWO THAT ACTUALLY SHIPPED ───────────────────────── */
/* SHAPE A (restore side)   if (<chain>.KEY)                    the guard reads the schema key itself
 * SHAPE B (capture side)   if (<var>) <chain>.KEY = <var>      the guard reads the captured local,
 *                          one statement after a zero-collapsing parse destroyed the type
 * A BARE MEMBER CHAIN AND NOTHING ELSE inside the parentheses is what makes it a truthiness test.
 * isFinite(...) · != null · !== '' · .test(...) · a comparison · an || onto a _stated flag are all
 * TYPE tests, and they are exactly what the repair looks like — so none of them match here. That is
 * the matcher's whole discrimination, and L4 is what proves it holds. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CHAIN = '[A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)*';

/* ⛔⛔ COMMENTS ARE PROSE, NOT CODE, AND THIS PROJECT'S HOUSE STYLE MAKES THAT LOAD-BEARING RATHER
   THAN COSMETIC. A defective line is STRUCK IN PLACE (~~ ... ~~) rather than deleted, so the literal
   bytes of every fault this gate names are still in the tree, inside a comment, forever.
   ⛔ MEASURED, NOT PREDICTED: the first version of this file matched only comments that BEGAN a line
      and went red on four lines — every one of them a STRUCK example inside the very commit that
      fixed the defect. FIXING A DEFECT CORRECTLY WOULD HAVE REDDENED THE GATE OVER THE NOTE
      EXPLAINING THE FIX, and the obvious "repair" is to special-case `~~`, which would then blind the
      gate to any real defect a developer happened to write after a tilde.
   🔑 SO THE STRIPPER IS GENERAL. It removes /* *\/, // and <!-- --> regions, skipping string and
      template literals so an apostrophe in prose cannot swallow the rest of a file. Newlines are
      PRESERVED so reported line numbers stay true to the file on disk.
   ⛔ AND IT IS ITSELF UNDER TEST, WHICH IS THE POINT: L3 runs the CONTROL LINES THROUGH THIS SAME
      FUNCTION. A stripper that ate real code would blank them, the matcher would find nothing, and
      L3 would go RED. There is no path where over-stripping buys a quiet green. */
function stripComments(src) {
  let outc = '', i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const stop = e === -1 ? n : e + 2;
      for (let k = i; k < stop; k++) outc += (src[k] === '\n' ? '\n' : ' '); i = stop; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { outc += ' '; i++; } continue; }
    if (c === '<' && src.substr(i, 4) === '<!--') { const e = src.indexOf('-->', i + 4); const stop = e === -1 ? n : e + 3;
      for (let k = i; k < stop; k++) outc += (src[k] === '\n' ? '\n' : ' '); i = stop; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; outc += c; i++;
      while (i < n) { if (src[i] === '\\') { outc += src[i] + (src[i + 1] || ''); i += 2; continue; }
        outc += src[i]; if (src[i] === q) { i++; break; } if (src[i] === '\n' && q !== '`') { i++; break; } i++; }
      continue; }
    outc += c; i++;
  }
  return outc;
}

function violations(src, file) {
  const hits = [];
  stripComments(src).split('\n').forEach(function (line, i) {
    const code = line;
    if (!code.trim()) return;
    zeroLeaves.forEach(function (key) {
      const K = esc(key);
      const mA = code.match(new RegExp('if\\s*\\(\\s*(' + CHAIN + '\\.' + K + ')\\s*\\)'));
      if (mA) hits.push({ file: file, line: i + 1, key: key, shape: 'A', guard: mA[1], text: code.trim().slice(0, 130) });
      const mB = code.match(new RegExp('(' + CHAIN + ')\\.' + K + '\\s*=\\s*(' + CHAIN + ')\\s*;'));
      if (mB && new RegExp('if\\s*\\(\\s*' + esc(mB[2]) + '\\s*\\)').test(code)) {
        hits.push({ file: file, line: i + 1, key: key, shape: 'B', guard: mB[2], text: code.trim().slice(0, 130) });
      }
    });
  });
  return hits;
}

const SUBJECTS = ['scripts/studio-blueprint.js', 'studio.html'];
const srcs = {};
SUBJECTS.forEach(function (f) { srcs[f] = fs.readFileSync(path.join(ROOT, f), 'utf8'); });

const fmt = (h) => h.map((x) => x.file + ':' + x.line + '  [shape ' + x.shape + ' on ' + x.key
  + ', guard `' + x.guard + '`]\n            ' + x.text).join('\n          ');

/* ⛔ THE STRIPPER MUST NOT HAVE EATEN THE SUBJECT. A comment remover that runs away — one unbalanced
   `/*`, one apostrophe mis-lexed as a quote — blanks the rest of the file, and every leg below then
   reports "clean" over nothing at all. That is the empty-green species, and it is the single most
   likely way this gate stops measuring while still exiting 0. So a KNOWN-LIVE line from each subject
   must SURVIVE stripping, named literally. */
/* ⚠️ THE studio.html WITNESS MOVED 2026-09-15 AND THE OLD ONE WAS A DELETED LINE. It used to be
   `var _ps = document.getElementById('pri-salary');`, one of eleven per-field restore lines that
   were consolidated into the single declared population `DATUM_PROFILE_RESTORE`. The witness now
   names the flag-first rule ITSELF at its one remaining home, which is a better witness than the
   line it replaces: it is the thing this gate exists to protect, not merely a line that happens to
   sit near it. A WITNESS SHOULD BE THE RULE, NOT ITS NEIGHBOUR. */
const LIVE_WITNESS = {
  'scripts/studio-blueprint.js': 'bp.profile.primary_salary_stated = _priStated;',
  'studio.html': 'if (!(prof[f.statedKey] || prof[f.key])) return;'
};
const stripped = {};
SUBJECTS.forEach(function (f) { stripped[f] = stripComments(srcs[f]); });
const survived = SUBJECTS.filter((f) => stripped[f].indexOf(LIVE_WITNESS[f]) !== -1);

check('L0 INSTRUMENT: the zero-defaulted population is DERIVED from DatumBlueprint and non-empty, both subjects were read, and neither was blanked by the comment stripper',
  zeroLeaves.length >= 8
  && SUBJECTS.every((f) => srcs[f] && srcs[f].length > 1000)
  && survived.length === SUBJECTS.length,
  'population ' + zeroLeaves.length + ': ' + zeroLeaves.join(' · ')
  + '\n          subjects: ' + SUBJECTS.map((f) => f + ' (' + srcs[f].length + 'B raw, '
      + stripped[f].replace(/[ \t]/g, '').length + 'B code after strip)').join(' · ')
  + '\n          live witness survived strip: ' + survived.length + '/' + SUBJECTS.length
  + (survived.length === SUBJECTS.length ? '' : '  ⛔ BLANKED: '
      + SUBJECTS.filter((f) => survived.indexOf(f) === -1).join(' · ')));

const vCap = violations(srcs['scripts/studio-blueprint.js'], 'scripts/studio-blueprint.js');
check('L1 CAPTURE: no zero-defaulted key is written under a bare truthiness guard in studio-blueprint.js',
  vCap.length === 0, vCap.length ? fmt(vCap) : 'clean across ' + zeroLeaves.length + ' keys');

const vRes = violations(srcs['studio.html'], 'studio.html');
check('L2 RESTORE: no zero-defaulted key is read under a bare truthiness guard in studio.html',
  vRes.length === 0, vRes.length ? fmt(vRes) : 'clean across ' + zeroLeaves.length + ' keys');

/* ⛔ THE LITERAL BYTES OF THE TWO DEFECTS, from the commit that fixed them — NOT paraphrases. A
   negative control that reproduces an APPROXIMATION of the symptom proves only that the matcher
   catches the approximation. */
const PRE_FIX = [
  "    var priSal = moneyToInt(v('pri-salary')); if (priSal) bp.profile.primary_salary = priSal;",
  "        if (prof.primary_salary)      { var _ps = document.getElementById('pri-salary'); if (_ps) _ps.value = _money(prof.primary_salary); }"
];
const POST_FIX = [
  "      bp.profile.primary_salary        = _priStated ? moneyToInt(_priSalEl.value) : 0;",
  "        if (prof.primary_salary_stated || prof.primary_salary)           { var _ps = document.getElementById('pri-salary'); if (_ps) _ps.value = _money(prof.primary_salary); }"
];
const caught = PRE_FIX.map((l) => violations(l, 'control').length > 0);
check('L3 CONTROL: the matcher FLAGS both real pre-fix lines — it is able to go red at all',
  caught.every(Boolean),
  PRE_FIX.map((l, i) => (caught[i] ? 'FLAGGED  ' : '⛔ MISSED ') + l.trim().slice(0, 110)).join('\n          '));

const quiet = POST_FIX.map((l) => violations(l, 'honest').length === 0);
check('L4 HONEST HALF: the matcher does NOT flag the post-fix lines — it is not simply flagging everything',
  quiet.every(Boolean),
  POST_FIX.map((l, i) => (quiet[i] ? 'quiet    ' : '⛔ FALSE+ ') + l.trim().slice(0, 110)).join('\n          '));

/* ⛔⛔ L5 — THE COVERAGE L2 LOST WHEN THE RESTORE WAS CONSOLIDATED, RESTORED AT ITS NEW HOME.
 * L2 scans for `if (<chain>.<literal key>)`. On 2026-09-15 the eleven per-field restore lines in
 * studio.html were replaced by ONE declared population that reads `prof[f.key]` — BRACKET NOTATION
 * THE MATCHER CANNOT SEE. L2 therefore went clean across those keys for a reason that has nothing
 * to do with the code being correct.
 *   🔑 A REFACTOR CAN BLIND A SYNTACTIC DETECTOR WITHOUT CHANGING ONE THING IT WAS WATCHING FOR.
 *      "Clean" after a rename is a question, not a result — the same law that says an instrument
 *      must not detect by syntax, met from the other side: here the SUBJECT moved, not the matcher.
 * ⛔ SO THIS LEG ASSERTS THE RULE ITSELF, AT THE ONE SITE THAT NOW CARRIES IT: the money branch must
 *    test the `_stated` FLAG FIRST and use the VALUE ONLY AS A FALLBACK. Reversing that order is
 *    exactly the defect the whole file exists to prevent — a salary a person corrected to ZERO
 *    being silently treated as "never answered" and overwritten.
 * ⚠️ ANCHORED ON THE DEFINITION, NOT ON A COMMENT, and proved red-first by inverting the operands. */
const FLAG_FIRST = 'if (!(prof[f.statedKey] || prof[f.key])) return;';
const _studioSrc = srcs['studio.html'];
const _flagFirstHits = _studioSrc.split(FLAG_FIRST).length - 1;
const _valueFirstHits = _studioSrc.split('if (!(prof[f.key] || prof[f.statedKey])) return;').length - 1;
check('L5 DECLARED RESTORE: the one consolidated money branch is FLAG-FIRST, value-as-fallback',
  _flagFirstHits === 1 && _valueFirstHits === 0,
  'flag-first occurrences: ' + _flagFirstHits + ' (want 1) · value-first occurrences: '
  + _valueFirstHits + ' (want 0)'
  + (_flagFirstHits === 1 ? '' : '\n          ⛔ the declared restore no longer reads the _stated flag before the value'));

console.log('\nPERSISTED-NUMERIC TRUTHINESS');
console.log('  subject: DatumBlueprint["new"]() zero-defaulted leaves  x  the two persistence files');
console.log('');
out.forEach((r) => console.log('  ' + r));
console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
process.exit(fails === 0 ? 0 : 1);
