/* DEV-ONLY red-first gate — §13.21: the SHARED binding extractor is itself load-bearing.
 *
 * WHY. lift() in _gate_extract.mjs is now the single way EIGHT gates slice studio.html. Before it,
 * each carried a private ex() that could only see `function NAME(`, plus its own hand-written
 * `var RULE_SCOPE = \{[^}]*\};` regex — eight copies of one fact, and adding a second binding to
 * that closure broke all eight in one commit. A helper that eight gates trust needs its own proof,
 * or the consolidation just moves the single point of failure somewhere less watched.
 *
 * THE TWO PROPERTIES THAT ARE EASY TO GET WRONG, and both were nearly shipped wrong:
 *  1. LINE-ANCHORING. The naive regex matches TWICE in today's studio.html — the real declaration,
 *     and a COMMENT that quotes it while explaining it. Harmless only because String.match without
 *     /g returns the first. Move that comment above the declaration and eight gates would silently
 *     slice `var RULE_SCOPE = {…};` into their sandbox. A declaration begins its line; a mention
 *     inside a comment does not.
 *  2. AMBIGUITY IS A FINDING, NOT A TIE TO BREAK. Two declarations answering one name must throw,
 *     never quietly resolve to the first.
 *
 * RED-FIRST BY MUTATING THE REAL HELPER, not a paraphrase of it: the source is read, patched, and
 * imported through a data: URL, so the assertions run against genuinely broken code.
 *
 * ⭐ 2026-08-08 — THE SAME TWO PROPERTIES, ON THE FUNCTION PATH. The binding path was anchored on
 * 2026-08-04; fnStart was left on a bare indexOf, and the identical hole cost two gates four days
 * later. A comment at studio.html:12102 quoting "`function X(`" answered definesFn('X') YES, and a
 * comment added later quoting FEMA's «Zone C or X (Unshaded)» gave the walker the `X (` it needed to
 * ask. A phantom function was sliced out of prose and handed to new Function.
 * 🔑 THE LESSON THAT EARNED THESE LEGS: fixing ONE HALF of a property is not fixing it. The binding
 * half was proven for four days while the function half — same file, same defect, same page of
 * reasoning — had no leg at all. When a property is worth anchoring, anchor EVERY resolver that
 * answers the same question.
 *
 * Usage:
 *   node scripts/_gate_extract_lift.mjs
 *   --naive      drop the BINDING line-anchoring  -> the comment-immunity leg must RED
 *   --firstwins  let ambiguity take hits[0]       -> the ambiguity leg must RED
 *   --naivefn    drop the FUNCTION line-anchoring -> the fn-anchoring legs must RED
 *   --dropasync  slice an `async function` without its async -> the async legs must RED
 *   --asyncname  drop the keyword-vs-name guard  -> the async NAME leg must RED
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const NAIVE = argv.includes('--naive');
const FIRSTWINS = argv.includes('--firstwins');
const NAIVEFN = argv.includes('--naivefn');
const DROPASYNC = argv.includes('--dropasync');
const ASYNCNAME = argv.includes('--asyncname');
const ANY_MUT = NAIVE || FIRSTWINS || NAIVEFN || DROPASYNC || ASYNCNAME;

let helperSrc = readFileSync(path.join(HERE, '_gate_extract.mjs'), 'utf8');
function mutate(a, b, label) {
  const n = helperSrc.split(a).length - 1;
  if (n !== 1) { console.error('❌ anchor ' + label + ' matched ' + n + ', expected 1 — re-ground it. A mutation that cannot run proves nothing.'); process.exit(1); }
  helperSrc = helperSrc.replace(a, b);
  console.log('[' + label + '] applied');
}
if (NAIVE) mutate("'^[ \\\\t]*(?:var|let|const)[ \\\\t]+' + IDENT(name) + '[ \\\\t]*='",
                  "'(?:var|let|const)\\\\s+' + IDENT(name) + '\\\\s*='", '--naive');
if (FIRSTWINS) mutate('if (hits.length > 1) {', 'if (false) {', '--firstwins');
/* Restores the PRE-2026-08-08 fnStart: first `function NAME(` anywhere in the file, comments and
   all. This is the real historical defect, not a paraphrase of it — the naive lookup is put back
   AHEAD of the index so it wins exactly as it used to. */
if (NAIVEFN) mutate('  const idx = defIndex(src);',
                    "  { const a0 = src.indexOf('function ' + name + '('); if (a0 >= 0) return a0; }\n  const idx = defIndex(src);", '--naivefn');
/* Restores the PRE-RULING behaviour: start at `function`, dropping any `async` prefix. */
if (DROPASYNC) mutate('m.index + (aIdx >= 0 && aIdx < fIdx ? aIdx : fIdx)', 'm.index + fIdx', '--dropasync');
/* Drops the KEYWORD-vs-NAME guard, so `function asyncFoo(` starts slicing at the name. This is the
   mistake the guard exists to prevent — it was never shipped, which is exactly why it needs a leg:
   an unshipped bug has no scar tissue and is the easiest kind to reintroduce during a tidy-up. */
if (ASYNCNAME) mutate('(aIdx >= 0 && aIdx < fIdx ? aIdx : fIdx)', '(aIdx >= 0 ? aIdx : fIdx)', '--asyncname');

const M = await import('data:text/javascript;base64,' + Buffer.from(helperSrc, 'utf8').toString('base64'));

const checks = [];
/* third slot is the MUTATION TAG (§13.17) — declared here, never inferred from prose. */
const need = (l, c, tag) => checks.push([l, !!c, tag || null]);
const tryLift = (src, name) => { try { return { ok: true, out: M.lift(src, name) }; } catch (e) { return { ok: false, err: e.message }; } };

/* ── the three FUNCTION forms the helper already knew ── */
const FN = "function alpha(a) { return a + 1; }\nwindow.beta = function (b) { return b; };\nwindow.gamma = async function (c) { return c; };\n";
need('lifts `function NAME(`', /function alpha/.test(tryLift(FN, 'alpha').out || ''), 'forms');
need('lifts `window.NAME = function`', /window\.beta/.test(tryLift(FN, 'beta').out || ''), 'forms');
need('lifts `window.NAME = async function`', /window\.gamma/.test(tryLift(FN, 'gamma').out || ''), 'forms');

/* ── the BINDING forms it was taught, incl. multi-line and nested braces ── */
const BIND = "    var TBL = { a: 'x', b: { c: 'y;z' }, d: [1, 2] };\n" +
             "    const NUM = 42;\n" +
             "    let STR = 'has ; a semicolon';\n";
const tbl = tryLift(BIND, 'TBL');
need('lifts a `var` object binding whole (nested braces, ; inside a string)',
     tbl.ok && /d: \[1, 2\] \};$/.test(tbl.out.trim()), 'forms');
need('lifts a `const` binding', /const NUM = 42;/.test(tryLift(BIND, 'NUM').out || ''), 'forms');
need('lifts a `let` binding, semicolon inside the string does not truncate it',
     /let STR = 'has ; a semicolon';/.test(tryLift(BIND, 'STR').out || ''), 'forms');

/* ── a missing name FAILS LOUDLY AND BY NAME. A resolver handed '' would inject nothing and die
      later somewhere less legible. ── */
const missing = tryLift(FN, 'NoSuchName');
need('an undeclared name throws, and names itself', !missing.ok && /NoSuchName/.test(missing.err || ''), 'forms');

/* ── PROPERTY 1 · COMMENT IMMUNITY. The comment quotes the declaration and comes FIRST. ── */
const COMMENTED = "/* explains that `var RULE_SCOPE = {…};` is read by _ruleInScope */\n" +
                  "    var RULE_SCOPE = { A: 'ANY', E: 'OWNER_OCCUPIED' };\n";
const ci = tryLift(COMMENTED, 'RULE_SCOPE');
need('a mention inside a COMMENT is not mistaken for the declaration',
     ci.ok && /OWNER_OCCUPIED/.test(ci.out) && !/…/.test(ci.out), 'anchoring');

/* ── PROPERTY 2 · AMBIGUITY IS A FINDING ── */
const TWICE = "    var DUP = { first: 1 };\n    var DUP = { second: 2 };\n";
const amb = tryLift(TWICE, 'DUP');
need('two declarations of one name THROW rather than silently taking the first',
     !amb.ok && /AMBIGUOUS/.test(amb.err || ''), 'ambiguity');

/* ── PROPERTY 3 · COMMENT IMMUNITY ON THE FUNCTION PATH (§13.73 — the fixture occupies the exact
      state the bug occupied: prose that QUOTES a definition, and no real definition of that name
      anywhere). This is the 2026-08-08 outage, reduced to two lines. ── */
const FN_PHANTOM = " * lift it, because the extractor keys on `function X(`. Adding a second var here broke all seven\n" +
                   "    function realOne(a) { return a; }\n";
need('a `function NAME(` quoted inside a COMMENT is not a definition',
     M.definesFn(FN_PHANTOM, 'X') === false, 'fn-anchoring');
const phantom = tryLift(FN_PHANTOM, 'X');
need('and lifting that phantom THROWS rather than slicing prose into the sandbox',
     !phantom.ok && /X/.test(phantom.err || ''), 'fn-anchoring');
/* PRESENCE — the pair above must not pass merely because this fixture resolves nothing at all. */
need('[PRESENCE] the real function in that same fixture still lifts',
     /return a;/.test(tryLift(FN_PHANTOM, 'realOne').out || ''), 'fn-anchoring');

/* The comment comes FIRST, and a REAL definition of the same name follows — indexOf took the
   comment, so this is the leg that separates "anchored" from "got lucky on ordering". */
const FN_SHADOWED = "/* the extractor keys on `function alpha(` — do not rename it */\n" +
                    "    function alpha(a) { return a + 1; }\n";
const shadowed = tryLift(FN_SHADOWED, 'alpha');
need('a comment quoting a definition does not shadow the REAL one that follows it',
     shadowed.ok && /return a \+ 1;/.test(shadowed.out) && !/do not rename/.test(shadowed.out), 'fn-anchoring');

/* ⚠️ THE ANCHOR MUST NOT BE TIGHTENED PAST THE PRODUCT. studio.html defines two helpers as named
   IIFEs at statement position; an anchor without the optional `(` silently LOSES them. Measured
   when the anchoring landed — this leg exists so the next tidy-up cannot quietly drop it. */
const FN_IIFE = "    (function restoreSession() { return 'real'; })();\n";
const iife = tryLift(FN_IIFE, 'restoreSession');
need('a named IIFE `(function NAME() {` is still a definition',
     iife.ok && /return 'real';/.test(iife.out) && iife.out.startsWith('function'), 'fn-anchoring');

/* ── PROPERTY 4 · AN `async function` KEEPS ITS `async` (Captain ruling, 2026-08-08). The slice used
      to start at `function`, so the keyword was dropped and any `await` inside became a SyntaxError.
      The fixture carries an `await` deliberately: a body without one would slice wrong and still
      parse, which is a control that cannot fail in the shape of the claim. ── */
const FN_ASYNC = "    async function alpha2(a) { await a; return 1; }\n" +
                 "    function asyncFoo(b) { return b; }\n";
const asy = tryLift(FN_ASYNC, 'alpha2');
need('an `async function` slices WITH its async keyword',
     asy.ok && asy.out.startsWith('async function alpha2'), 'async');
need('and the sliced async body PARSES, await and all',
     asy.ok && (() => { try { new Function(asy.out); return true; } catch (e) { return false; } })(), 'async');
/* THE KEYWORD-vs-NAME GUARD. `asyncFoo` contains "async" but is a NAME, not a keyword — a bare
   indexOf('async') would return a position AFTER `function` and slice from the middle. */
const asyName = tryLift(FN_ASYNC, 'asyncFoo');
need('a function whose NAME contains "async" is not mistaken for an async declaration',
     asyName.ok && asyName.out.startsWith('function asyncFoo'), 'async');

/* ── AND IT WORKS ON THE REAL PRODUCT, not only on fixtures. PRESENCE first. ── */
const studio = readFileSync(path.join(REPO, 'studio.html'), 'utf8');
const rs = tryLift(studio, 'RULE_SCOPE');
need('[PRESENCE] RULE_SCOPE lifts out of the real studio.html', rs.ok && rs.out.length > 0, 'real');
let evaluated = null;
if (rs.ok) { try { evaluated = new Function(rs.out + '\nreturn RULE_SCOPE;')(); } catch (e) { /* stays null */ } }
/* SELF-CONSISTENT, NOT A MAGIC NUMBER. This asserted `length === 8` and went red the moment Rule I
   shipped — a gate that has to be edited every time the thing it watches legitimately grows is a
   maintained document, and it would have trained someone to bump the number without reading why.
   What actually needs proving is that lift() -> evaluate ROUND-TRIPS FAITHFULLY: the object carries
   exactly the keys its own declaration text carries. That holds at eight rules, at nine, and at any
   number after. PRESENCE first — zero declared keys is a dead scrape, not an empty table. */
const declaredKeys = rs.ok ? [...rs.out.matchAll(/([A-Z])\s*:\s*'[A-Z_]+'/g)].map((m) => m[1]) : [];
need('[PRESENCE] the lifted declaration text carries keys to compare against', declaredKeys.length > 0, 'real');
need('the lifted RULE_SCOPE evaluates to exactly the table it declares',
     !!evaluated && declaredKeys.length > 0
     && Object.keys(evaluated).length === declaredKeys.length
     && declaredKeys.every((k) => Object.prototype.hasOwnProperty.call(evaluated, k))
     && evaluated.E === 'OWNER_OCCUPIED', 'real');
need('_ruleFTables (a function) still lifts from the real studio.html',
     /function _ruleFTables/.test(tryLift(studio, '_ruleFTables').out || ''), 'real');

/* THE REAL 2026-08-08 PHANTOM, asserted against the real file rather than a fixture of it. `X` is
   named in TWO studio.html comments and defined in none. If this ever flips true again, a phantom
   is back in the walker's reach. */
need('the real studio.html declares NO function `X` (it appears only inside comments)',
     M.definesFn(studio, 'X') === false, 'fn-anchoring');

/* ⭐ THE GENERAL PROPERTY — the one that closes the CLASS rather than the one name we got burned by:
   EVERY name the resolver claims studio.html defines must slice to text that PARSES.
 *
 * ⚠️ THIS LEG WAS DECORATIVE ON ITS FIRST DRAFT AND --naivefn PROVED IT. Two mistakes, both worth
 * recording because both look like diligence:
 *   1. It drew its candidates from the ANCHORED regex, so a phantom could never enter the list it
 *      checked. It was asking the fixed code to confirm itself.
 *   2. It asserted the slice "begins with `function`" — which the phantom DOES. The phantom's text
 *      is literally «function X(`. Adding a second var…». A check shaped like the fix instead of
 *      like the BUG passes on the bug.
 * Both are fixed here: candidates come from a NAIVE superset scan (comments included), filtered by
 * what the resolver actually claims — and the assertion is that the slice PARSES, which is the
 * symptom the outage produced. Under --naivefn, `X` re-enters and fails to parse.
 *
 * ⭐ THE ASYNC QUIRK IS NOW FIXED, NOT TOLERATED (Captain ruling, 2026-08-08). This leg's first draft
 * retried a failed parse with an `async ` prefix, because extractFn used to slice an
 * `async function NAME()` WITHOUT its `async` — leaving any `await` inside it a SyntaxError, armed
 * under three helpers that no gate happened to lift. A gate that ACCOMMODATES a defect is how the
 * defect survives; the retry is gone and the slice must parse as-is. See the `--dropasync` control. */
const naiveNames = [...new Set([...studio.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))];
const claimed = naiveNames.filter((n) => M.definesFn(studio, n));
need('[PRESENCE] the real file yields a healthy population of resolved definitions to check',
     claimed.length > 400, 'real');
const unparseable = claimed.filter((n) => {
  const r = tryLift(studio, n);
  if (!r.ok) return true;
  try { new Function(r.out); return false; } catch (e) { return true; }
});
need('every name the resolver CLAIMS slices to source that PARSES, never to prose (' +
     claimed.length + ' of ' + naiveNames.length + ' claimed, ' + unparseable.length + ' unparseable' +
     (unparseable.length ? ': ' + unparseable.slice(0, 5).join(', ') : '') + ')',
     unparseable.length === 0, 'fn-anchoring');

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log('\n' + pass + '/' + checks.length + ' green' + (ANY_MUT ? '  [mutated]' : ''));

/* §13.17 — prove WHICH assertion failed, not merely that one did. */
if (ANY_MUT) {
  const want = NAIVE ? 'anchoring'
             : FIRSTWINS ? 'ambiguity'
             : NAIVEFN ? 'fn-anchoring'
             : 'async';
  const red = checks.filter(([, ok]) => !ok).map(([l]) => l);
  const onTarget = checks.filter(([, ok, tag]) => !ok && tag === want).map(([l]) => l);
  if (allGreen) { console.error('❌ RED-FIRST FAILED — the mutation left every assertion green. Its anchor is dead, or the property is not actually enforced.'); process.exit(1); }
  if (!onTarget.length) {
    console.error('❌ RED-FIRST MASKED — the gate went red, but NOT on a "' + want + '" assertion.');
    console.error('   red legs: ' + red.join(' | ')); process.exit(1);
  }
  console.log('✅ RED-FIRST OK — bit on ' + onTarget.length + ' "' + want + '" assertion(s): ' + onTarget.join(' | '));
  process.exit(0);
}
if (!allGreen) { console.error('❌ GATE FAILED — the shared extractor eight gates depend on is not behaving.'); process.exit(1); }
console.log('✅ GATE GREEN — lift() handles every declaration form, ignores comments, and refuses ambiguity.');
