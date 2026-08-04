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
 * Usage:
 *   node scripts/_gate_extract_lift.mjs
 *   --naive      drop the line-anchoring   -> the comment-immunity leg must RED
 *   --firstwins  let ambiguity take hits[0] -> the ambiguity leg must RED
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const NAIVE = argv.includes('--naive');
const FIRSTWINS = argv.includes('--firstwins');
const ANY_MUT = NAIVE || FIRSTWINS;

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

/* ── AND IT WORKS ON THE REAL PRODUCT, not only on fixtures. PRESENCE first. ── */
const studio = readFileSync(path.join(REPO, 'studio.html'), 'utf8');
const rs = tryLift(studio, 'RULE_SCOPE');
need('[PRESENCE] RULE_SCOPE lifts out of the real studio.html', rs.ok && rs.out.length > 0, 'real');
let evaluated = null;
if (rs.ok) { try { evaluated = new Function(rs.out + '\nreturn RULE_SCOPE;')(); } catch (e) { /* stays null */ } }
need('the lifted RULE_SCOPE evaluates to the live 8-rule table',
     !!evaluated && Object.keys(evaluated).length === 8 && evaluated.E === 'OWNER_OCCUPIED' && evaluated.F === 'PURPOSE_VARIANT', 'real');
need('_ruleFTables (a function) still lifts from the real studio.html',
     /function _ruleFTables/.test(tryLift(studio, '_ruleFTables').out || ''), 'real');

let pass = 0;
for (const [l, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + l); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log('\n' + pass + '/' + checks.length + ' green' + (ANY_MUT ? '  [mutated]' : ''));

/* §13.17 — prove WHICH assertion failed, not merely that one did. */
if (ANY_MUT) {
  const want = NAIVE ? 'anchoring' : 'ambiguity';
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
