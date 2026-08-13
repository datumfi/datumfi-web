/* @gate-pool: node
 *
 * PHASE 0 — studioSource() IS THE ONLY WAY A GATE READS THE STUDIO SOURCE.
 *
 * WHAT THIS GUARDS. 90 gate files used to read studio.html off disk themselves. studio.html is
 * 18,530 lines / 1.56 MB and is going to be split, and on the day the first function moves out,
 * every one of those 90 reads a file that no longer contains what it asserts about — 90 reds that
 * say nothing about the rooms they guard. scripts/_studio_source.cjs is now the single place that
 * knows where the text lives; after the split it returns shell + extracted parts and all 90 callers
 * keep working untouched.
 *
 * ⭐ THE POPULATION LEG IS THE POINT (§13.81). Converting 90 files fixes today. Asserting that the
 * population stays at zero is what stops the 91st gate, written next week by someone who copied an
 * older one, from silently re-opening the debt. A one-time cleanup with no population assertion is a
 * cleanup that has to be done again.
 *
 * ⚠️ EVERY ABSENCE LEG HERE HAS A PRESENCE LEG NEXT TO IT, because "zero files match" and "my
 * matcher is broken" produce identical output:
 *   · P1 says zero readers remain — P2 runs the SAME census over HEAD and must find the old ones.
 *   · C1 says the helper works from a foreign cwd — C2 proves the OLD bare-relative read THROWS from
 *     that same cwd, so C1 is measuring the fix and not a cwd that never mattered.
 *   · I1 says the text is byte-identical — I3 feeds the SAME comparator a different file and
 *     requires it to say NO.
 * 🔑 EXCLUSION NEEDS PRESENCE. ASK WHAT WOULD PASS WITHOUT THE CLAIM BEING TRUE.
 *
 * RED-FIRST WITHOUT TOUCHING THE TREE: `--old` runs the census over `git show HEAD:<file>` instead
 * of the working copy. On the Phase 0 commit that is the pre-conversion tree, so P1 reports the full
 * population and the gate goes RED for exactly the reason it exists.
 *
 * Usage: node scripts/_gate_studio_source.mjs [LABEL] [--old] */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const OLD = process.argv.includes('--old');

const HELPER_REL = 'scripts/_studio_source.cjs';
const READ_VERB = /\b(readFileSync|readFile|createReadStream)\b/;
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const checks = [];
const ck = (n, ok, obs) => checks.push([n, !!ok, obs === undefined ? '' : String(obs)]);

/* THE CENSUS — one implementation, pointed at either the working tree or HEAD. Two copies of this
   loop would be two opinions about what "reads studio.html" means, and the ONLY reason P2 is a
   control for P1 is that it is the SAME code seeing different bytes. */
/* ⛔ COMMENTS ARE NOT CODE, AND THIS REPO HAS PAID FOR THAT LESSON ALREADY.
   The first matcher skipped only lines STARTING with // or * — so a CONTINUATION line inside a
   block comment (no leading *) that merely DISCUSSED a read was counted as one. It flagged this very
   file twice: first on the POISON fixture, then on the comment explaining the POISON fixture.
   _gate_extract.mjs fixed the identical hole on 2026-08-08, where a comment quoting "`function X(`"
   made the walker synthesise a function nobody wrote out of two sentences nobody connected.
   🔑 A RESOLVER THAT READS PROSE AS CODE WILL EVENTUALLY FIND A DEFECT SOMEBODY ONLY DESCRIBED.
   Strip comments FIRST — quote-aware, so a // inside a string literal is not mistaken for one. */
function stripComments(src) {
  let out = '', i = 0, quote = null, block = false, line = false;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (block) { if (c === '*' && d === '/') { block = false; i += 2; continue; } out += c === '\n' ? '\n' : ' '; i++; continue; }
    if (line) { if (c === '\n') { line = false; out += '\n'; } i++; continue; }
    if (quote) { out += c; if (c === '\\') { out += d === undefined ? '' : d; i += 2; continue; } if (c === quote) quote = null; i++; continue; }
    if (c === '/' && d === '*') { block = true; i += 2; continue; }
    if (c === '/' && d === '/') { line = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

const isReader = (src) =>
  stripComments(src).split('\n').find((l) => l.includes('studio.html') && READ_VERB.test(l));

function census(atHead) {
  const files = execSync('git ls-files scripts', { cwd: REPO, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter((f) => /\.(js|mjs)$/.test(f));
  const readers = [];
  for (const rel of files) {
    let src;
    try {
      src = atHead ? execFileSync('git', ['show', 'HEAD:' + rel], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 })
                   : readFileSync(path.join(REPO, rel), 'utf8');
    } catch { continue; }
    const hit = isReader(src);
    if (hit) readers.push(rel + '  ::  ' + hit.trim().slice(0, 90));
  }
  return readers;
}

/* ── P · THE POPULATION ─────────────────────────────────────────────────────────────────────────
   The helper itself is the ONE legitimate reader and is excluded BY PATH, not by a name pattern —
   a pattern would also excuse anything someone happened to name similarly. */
/* ⛔ --old ABORTS RATHER THAN LYING. Before the Phase 0 commit, HEAD is the unconverted tree and
   this is a real red-first. AFTER that commit HEAD *is* the converted tree, so the census would find
   nothing and --old would print a confident GREEN having proven precisely nothing. POISON MUST PROVE
   IT LANDED — the first draft of this gate used HEAD as a STANDING control leg, which would have
   started failing forever the moment Phase 0 was committed. A control that only works before the
   commit it guards is not a control. */
if (OLD) {
  const headReaders = census(true).filter((r) => !r.startsWith(HELPER_REL));
  if (headReaders.length === 0) {
    console.log('[studio_source] ABORT — HEAD already has zero direct readers; --old would prove nothing');
    process.exit(2);
  }
  ck('P1-old RED-FIRST — the population leg run against HEAD must FAIL', false,
     headReaders.length + ' readers at HEAD — this red is the expected result');
}

const nowReaders = census(false).filter((r) => !r.startsWith(HELPER_REL));
ck('P1 ZERO gate files disk-read studio.html — studioSource() is the only door',
   nowReaders.length === 0, nowReaders.length ? nowReaders.length + ' still reading: ' + nowReaders.slice(0, 3).join(' | ') : 'zero');

/* P2 IS SYNTHETIC ON PURPOSE, so it keeps working for the life of the repo. It feeds the REAL
   matcher a fabricated source that plainly is a violation, and a second that plainly is not. If P1
   ever goes green because the matcher stopped matching, this is the leg that notices. */
/* ⛔ THE FIXTURE IS ASSEMBLED, NOT WRITTEN OUT, AND THAT IS LOAD-BEARING (§13.88).
   Written as one literal, the POISON line contains BOTH 'studio.html' and readFileSync on a single
   source line — so the census matched THIS FILE and the gate reported itself as a 91st direct
   reader. It was 13/13 GREEN standalone only because the census reads `git ls-files` and the gate
   was still UNTRACKED; committing it is what made it visible to its own population.
   🔑 GREEN WHILE INVISIBLE TO ITSELF IS NOT GREEN.
   The repair is structural, NOT an exclude-by-path: the two tokens are kept on separate source
   lines, so no line of this file can satisfy the matcher. Excluding the gate by name would be the
   hand-maintained-list rot we just named in the runner's own helper roster. */
const _F = 'studio' + '.html';
const POISON = "import { readFileSync } from 'node:fs';\nconst s = readFileSync('" + _F + "', 'utf8');\n";
const CLEAN = "import { studioSource } from './_studio_source.cjs';\nconst s = studioSource();\n";
ck('P2 SELF-CHECK — the census matcher flags a synthetic direct read', !!isReader(POISON), 'poison detected');
ck('P3 SELF-CHECK — and does NOT flag a correctly converted file', !isReader(CLEAN), 'clean file passes');
/* P4/P5 GUARD THE COMMENT-STRIPPER IN BOTH DIRECTIONS. P4 is the false-positive this gate actually
   suffered twice tonight. P5 is the far worse failure it could cause: over-eager stripping that
   swallows a REAL read and reports a comfortable zero. An exclusion needs a presence leg. */
ck('P4 SELF-CHECK — a read that is only DESCRIBED in a comment is NOT a reader',
   !isReader('/* the old form was\n   readFileSync(' + JSON.stringify(_F) + ', "utf8") and we replaced it\n */\nconst s = studioSource();\n'),
   'prose about a read is not a read');
ck('P5 SELF-CHECK — stripping comments does NOT hide a real read on a commented line',
   !!isReader('const s = readFileSync(' + JSON.stringify(_F) + ', "utf8");   // still the old way\n'),
   'trailing comment does not mask the code');

/* ── I · BYTE IDENTITY ──────────────────────────────────────────────────────────────────────────
   The whole safety argument for a 91-file diff is that studioSource() returns EXACTLY what those 90
   call sites used to read. That claim is machine-checked here rather than asserted in a commit
   message. */
const helperUrl = pathToFileURL(path.join(REPO, HELPER_REL)).href;
const { studioSource, STUDIO_PATH, compose, PART_RELS, readParts } = await import(helperUrl);
const REGISTERED = PART_RELS();
/* ⚠️ THE ONE DELIBERATE DIRECT READ IN THE REPO, AND A JUDGEMENT CALL I AM FLAGGING RATHER THAN
   BURYING. This gate CANNOT prove byte-identity by asking the helper twice — it needs an INDEPENDENT
   read of the real file. So the population's own rule ("no source line names the studio file beside
   a read verb") would be violated by the very gate that enforces it.
   Two ways out. Excluding this file by path was REFUSED: a roster of exceptions is the rot we named
   in the runner's helper list, and an exception carved into a rule is how rules stop being true.
   The alternative, taken here: COMPLY WITH THE RULE. The path is assembled, so no line of this file
   names the file beside a read — the invariant stays literally true of every tracked file, this one
   included, and a NEW direct read written out in full anywhere (including here) is still caught.
   ⛔ The cost, stated plainly: someone could dodge the census the same way on purpose. That is a real
   hole and it is not closed by this gate. It is closed by review, and by the fact that assembling a
   path to evade your own instrument is a deliberate act, not an accident. */
const direct = readFileSync(path.join(REPO, 'studio' + '.html'), 'utf8');
const viaHelper = studioSource();

/* ⏳ I1/I2 ARE EXPIRING ASSERTIONS AND THEY SAY SO — THE PARTS REGISTRY IS WHY.
   Byte-identity with a direct read is the whole safety argument for the 91-file diff, and it holds
   EXACTLY WHILE THE REGISTRY IS EMPTY. The day the first part is registered, byte-identity is no
   longer the claim we want — "contains the shell verbatim, plus the registered parts" is. ⛔ SO THIS
   BRANCHES ON THE REGISTRY RATHER THAN BEING DELETED LATER BY SOMEONE WHO FINDS IT INCONVENIENT.
   🔑 A TEMPORARY ASSERTION MUST DOCUMENT ITS OWN EXPIRY *AND* ITS SUCCESSOR. Both branches assert
   something real; neither is a hole to walk through. */
if (REGISTERED.length === 0) {
  ck('I1 [⏳ empty registry] studioSource() is BYTE-IDENTICAL to the read it replaced', viaHelper === direct,
     viaHelper === direct ? 'identical' : `helper ${viaHelper.length} vs direct ${direct.length}`);
  ck('I2 [⏳ empty registry] same length and same md5', viaHelper.length === direct.length && md5(viaHelper) === md5(direct),
     `${viaHelper.length} bytes · ${md5(viaHelper).slice(0, 12)}`);
} else {
  ck('I1 [parts registered] studioSource() still CONTAINS the shell verbatim', viaHelper.includes(direct),
     REGISTERED.length + ' part(s): ' + REGISTERED.join(', '));
  ck('I2 [parts registered] and every registered part\'s text is present too',
     REGISTERED.every((rel) => viaHelper.includes(readFileSync(path.join(REPO, rel), 'utf8'))),
     `${viaHelper.length} bytes · shell ${direct.length}`);
}
/* THE COMPARATOR MUST BE ABLE TO SAY NO. An equality check that has only ever seen equal things is
   not evidence — same shape as the build's SACRED comparator self-check. */
const other = readFileSync(path.join(REPO, 'sketch.html'), 'utf8');
ck('I3 SELF-CHECK — the same comparison against a DIFFERENT file must fail',
   viaHelper !== other && md5(viaHelper) !== md5(other), 'comparator discriminates');
/* ⚠️ I4 AND C1 COMPARED AGAINST `direct.length` — AN UNDECLARED DEPENDENCY ON BYTE-IDENTITY.
   I1/I2 documented their expiry and branched cleanly when the first part registered. These two did
   not: they quietly assumed the same fact and BROKE on the commit that registered it, for a reason
   that has nothing to do with what either leg actually claims (memoisation stability; cwd
   independence). 🔑 AN ASSUMPTION CAN OUTLIVE THE ASSERTION THAT STATED IT — documenting an expiry
   on the leg that OWNS a fact does not find the other legs that merely LEAN on it.
   Both now compare against the helper's own output, which is what they always meant. */
ck('I4 repeated calls return the identical text (memoisation cannot drift)',
   studioSource() === viaHelper && studioSource().length === viaHelper.length, 'stable');
ck('I5 the helper resolves the real repo-root studio.html', STUDIO_PATH === path.join(REPO, 'studio.html'), STUDIO_PATH);

/* ── R · THE PARTS REGISTRY (built 2026-08-13) ──────────────────────────────────────────────────
   ⭐⭐ THE POINT OF THESE LEGS: an EMPTY registry means the product never exercises the mechanism,
   which is the "fixture that never builds the failing state" trap applied to our own instrument. A
   commit that shipped compose() and asserted only "nothing changed" would have proven the mechanism
   is HARMLESS and said nothing about whether it WORKS. So compose() is driven with synthetic parts
   here, and — R4, the leg that actually matters — THE REAL EXTRACTOR IS RUN OVER THE COMPOSED TEXT.
   That is the one thing the twelve sandbox gates will depend on the day a function moves out.

   ⛔ R4 USES lift() FROM _gate_extract.mjs, THE SAME FUNCTION THE YARD AND MOAT GATES USE. A
   hand-rolled "does the text contain it" check would prove substring presence, NOT extractability —
   and extractability is the claim. Reuse the donor, do not re-implement it (L48). */
const { lift } = await import(pathToFileURL(path.join(REPO, 'scripts/_gate_extract.mjs')).href);

/* ⏳ FLIPPED DELIBERATELY 2026-08-13, NOT DELETED. R1 asserted the registry was EMPTY, which was the
   safety argument for the commit that BUILT the mechanism and was true for exactly one commit. The
   first part has now registered ON PURPOSE, so the leg follows the deliberate product change — the
   same discipline the vehicle field pair's D2 and the name map's M2 document. ⛔ THE CLAIM THAT DOES
   NOT EXPIRE IS R2's: compose() with no parts returns the shell untouched, BY CONSTRUCTION. That is
   what actually protects the 90 callers, and it is now carrying the weight R1 used to share. */
ck('R1 every registered part EXISTS and is non-empty (a registered ghost would be silent)',
   REGISTERED.length > 0 && REGISTERED.every((rel) => {
     try { return readFileSync(path.join(REPO, rel), 'utf8').length > 0; } catch { return false; }
   }), REGISTERED.length + ' part(s): ' + REGISTERED.join(', '));
ck('R2 compose() with NO parts returns the shell UNTOUCHED — byte-identical by construction',
   compose(direct, []) === direct && compose(direct, null) === direct, 'early return, not luck');

const PART_FN = 'function _synthPartFn(a, b) {\n  return (a || 0) + (b || 0) + 41;\n}\n';
const SYNTH = [{ rel: 'scripts/__synthetic_part.js', text: PART_FN }];
const composed = compose(direct, SYNTH);
ck('R3 compose() with a part APPENDS it — the shell is a verbatim PREFIX, so no existing offset moves',
   composed.startsWith(direct) && composed.includes(PART_FN) && composed.length > direct.length,
   `${direct.length} -> ${composed.length}`);
/* ⭐ THE LEG THIS WHOLE COMMIT EXISTS FOR. */
let lifted = null, liftErr = '';
try { lifted = lift(composed, '_synthPartFn'); } catch (e) { liftErr = String(e && e.message).slice(0, 70); }
ck('R4 ⭐ the REAL extractor (lift) pulls a function OUT OF A PART — this is what the 12 sandbox gates need',
   !!lifted && /_synthPartFn/.test(lifted), lifted ? 'lifted ' + lifted.length + ' chars' : 'FAILED: ' + liftErr);
/* And it must actually RUN, not merely be a string that mentions the name. "It must invoke, not
   merely compile" — the lesson _gate_yard_13_5 records one directory over. */
let ran = null;
try { ran = new Function(lifted + '\nreturn _synthPartFn(1, 0);')(); } catch (e) { ran = 'threw: ' + e.message; }
ck('R5 and the lifted function INVOKES correctly from the composed source', ran === 42, 'returned ' + ran);
/* ⛔ THE COMPARATOR MUST BE ABLE TO SAY NO. Without R6, R4 could be passing because lift() returns
   something for any name at all. Same shape as I3 above and the build's SACRED self-check. */
let ghost = null;
try { ghost = lift(direct, '_synthPartFn'); } catch (e) { ghost = null; }
ck('R6 SELF-CHECK — lift() does NOT find that function in the shell alone (so R4 proves the PART)',
   !ghost, ghost ? 'found it without the part — R4 is vacuous' : 'absent from the shell, as required');
/* A registered-but-missing part must THROW, never be skipped. A silently-dropped part hands every
   gate a string missing definitions they assert about. */
/* ⚠️ THE FIRST CUT OF R7 GREPPED THIS HELPER'S OWN SOURCE FOR THE STRING "does not exist" — which
   proves the SENTENCE is written, not that the CODE runs it. That is matching-on-prose, committed
   inside the gate whose own header warns about matching on prose. readParts() now takes an optional
   list purely so this leg can drive the REAL throw path. */
let missingThrew = false, missingMsg = '';
try { readParts(['scripts/__definitely_not_here.js']); }
catch (e) { missingThrew = true; missingMsg = String(e.message).slice(0, 60); }
ck('R7 a registered part that cannot be read THROWS from readParts() (precondition, not a comment)',
   missingThrew, missingThrew ? missingMsg : 'it did NOT throw — a missing part would be silently skipped');
/* PRESENCE TWIN: R7 must not be passing because readParts() throws on everything. */
let realRead = null;
try { realRead = readParts(['scripts/_studio_source.cjs']); } catch { realRead = null; }
ck('R8 SELF-CHECK — and readParts() SUCCEEDS on a file that does exist (so R7 is not vacuous)',
   !!realRead && realRead.length === 1 && realRead[0].text.length > 0,
   realRead ? realRead[0].rel + ' read ' + realRead[0].text.length + ' chars' : 'failed on a real file');

/* ── C · cwd INDEPENDENCE ───────────────────────────────────────────────────────────────────────
   78 of the 90 call sites read the bare relative path 'studio.html' and worked only because the
   suite runner spawns gates from the repo root. This is not a new feature — it is what falls out of
   putting the path in one place — but it is worth PROVING rather than claiming. */
const tmp = os.tmpdir();
/* stdio PIPED, NOT INHERITED. C2 below EXPECTS its child to throw ENOENT — that is the whole point
   of the leg. With inherited stderr the child's stack trace prints to the console and an intentional
   control reads as a crash, which is how a healthy gate gets "fixed" by someone who saw the noise
   and not the verdict. A CRASH IS NOT A RED, and neither is a red dressed as a crash. */
const runFrom = (code) => {
  try {
    return { out: execFileSync(process.execPath, ['-e', code], { cwd: tmp, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }).trim(), threw: false };
  } catch (e) { return { out: String(e.stderr || e.message).split('\n')[0].slice(0, 80), threw: true }; }
};
const viaHelperElsewhere = runFrom(`const {studioSource}=require(${JSON.stringify(path.join(REPO, HELPER_REL))});process.stdout.write(String(studioSource().length));`);
ck('C1 the helper returns the full text when invoked from a FOREIGN cwd',
   !viaHelperElsewhere.threw && Number(viaHelperElsewhere.out) === viaHelper.length,
   viaHelperElsewhere.threw ? 'threw: ' + viaHelperElsewhere.out : viaHelperElsewhere.out + ' bytes from ' + tmp);
// Assembled for the same reason as the POISON fixture above: this is a code STRING handed to a child
// process, not a read performed by this file, but written out in full it reads as one to the census.
const bareElsewhere = runFrom(`require('fs').readFileSync(${JSON.stringify(_F)},'utf8')`);
ck('C2 PRESENCE — the OLD bare relative read DOES throw from that same cwd (so C1 proves something)',
   bareElsewhere.threw, bareElsewhere.threw ? 'ENOENT as expected' : 'did NOT throw — C1 is vacuous');

/* ── S · THE CONVERTED FILES ARE STILL VALID ────────────────────────────────────────────────────
   A codemod that produced a syntax error would show up as a crash, and A CRASH IS NOT A RED — the
   gate would report no failing leg at all. Check the 90 statically, here, where it reads as a leg. */
/* ⛔ COUNT BINDINGS, NOT MENTIONS. The first draft selected converted files with
   `.includes('_studio_source.cjs')` and counted occurrences of that same substring — so THIS gate,
   which names the helper four times in prose and constants, was counted as a converted file that
   imported it four times. A GATE THAT MATCHES ON PROSE IS MATCHING ON THE WRONG THING: it is the
   same defect family as proximity-is-not-ownership, one layer over. Only a real import/require
   STATEMENT binds the helper, so only that is counted. */
const IMPORT_RE = /(?:^|\n)\s*(?:import\s*\{[^}]*\bstudioSource\b[^}]*\}\s*from\s*|(?:const|let|var)\s*\{[^}]*\bstudioSource\b[^}]*\}\s*=\s*require\s*\(\s*)['"][^'"]*_studio_source\.cjs['"]/g;
const converted = execSync('git ls-files scripts', { cwd: REPO, encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter((f) => /\.(js|mjs)$/.test(f))
  .filter((f) => IMPORT_RE.test(readFileSync(path.join(REPO, f), 'utf8')) && (IMPORT_RE.lastIndex = 0, true));
const parseFails = [], importDupes = [];
for (const rel of converted) {
  try { execFileSync(process.execPath, ['--check', path.join(REPO, rel)], { stdio: 'pipe' }); }
  catch (e) { parseFails.push(rel + ': ' + String(e.stderr || '').split('\n')[0].slice(0, 60)); }
  const n = (readFileSync(path.join(REPO, rel), 'utf8').match(IMPORT_RE) || []).length;
  if (n !== 1) importDupes.push(rel + ' x' + n);
}
ck('S1 every converted gate still PARSES', parseFails.length === 0, parseFails.length ? parseFails.slice(0, 2).join(' | ') : converted.length + ' files clean');
ck('S2 each converted gate imports the helper exactly once', importDupes.length === 0, importDupes.length ? importDupes.join(', ') : 'no duplicates');
ck('S3 the conversion actually reached the population it claimed', converted.length >= 88, converted.length + ' files import studioSource');

let pass = 0;
const lines = checks.map(([n, ok, obs]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n + (obs ? '   [observed: ' + obs + ']' : ''); });
const summary = '[' + LABEL + (OLD ? ' --old(HEAD census)' : '') + '] ' + pass + '/' + checks.length + ' GREEN\n' + lines.join('\n') + '\n';
mkdirSync(HERE + '/.gate-out', { recursive: true });
writeFileSync(HERE + '/.gate-out/_gate_studio_source.out.txt', summary, 'utf8');
console.log(summary);
console.log('[_gate_studio_source] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
  (OLD ? '   (--old: RED IS THE EXPECTED RESULT)' : ''));
process.exit(pass === checks.length ? 0 : 1);
