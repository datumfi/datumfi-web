/* ══ DO THE POISON ANCHORS STILL RESOLVE? — §82.99 ════════════════════════════════════════════════
 *
 * ⛔⛔ READ THE NAME LITERALLY. THIS GATE PROVES **ANCHOR FRESHNESS**. IT DOES NOT PROVE THAT ANY
 * CONTROL STILL BITES, AND NOTHING IT PRINTS SHOULD EVER BE READ THAT WAY. A green here means every
 * declared literal is still findable in its target file the expected number of times. A control can
 * pass every leg of this gate and still be completely dead — because the leg it is supposed to red
 * has been rewritten, or because the assertion it attacks no longer exists.
 *   🔑 ONLY RUNNING A CONTROL PROVES IT BITES. That is the periodic control sweep's job, deliberately
 *      a separate instrument, and this gate is named so that nobody can cite it for the other claim.
 *      The failure mode this whole arc closes is A GREEN THAT READS STRONGER THAN ITS EVIDENCE — so
 *      the first thing this instrument does is state what its own green is worth.
 *
 * WHY IT EXISTS. On 2026-08-23 an ordinary, correct edit to a CSS rule killed `_gate_seam_pin.js`'s
 * literal poison anchor. It matched ZERO times and BOTH of that gate's red-first controls aborted —
 * while a clean suite run still printed 233/0/0, because a gate's poison is a no-op without its flag.
 * The controls were dead and the score was green. It was found by reading the gate, not by running
 * anything. Nothing in this project has ever asked this question of the other gates.
 *
 * ── THE THREE FAILURE SHAPES THIS SITS INSIDE ───────────────────────────────────────────────────
 *   §82.26  a thing exists but nobody can reach it            (the reachability audit)
 *   §82.81  a control exists but its anchor has expired       <- THIS GATE
 *   §82.90  a control is fine, fails loudly, and is never invoked   (the periodic sweep)
 *
 * ── POPULATION, AND WHY IT IS NOT A GLOB ────────────────────────────────────────────────────────
 * The gate list comes from THE RUNNER, via `_suite_baseline.mjs --explain-names`. Asking the runner
 * for the population is the standing rule: a glob is a second opinion about what the suite runs, and
 * a second opinion is a fork. If the runner cannot be asked, this gate REDS rather than falling back
 * to a glob — an unverifiable denominator is not a smaller result, it is a different one.
 *
 * ── COVERAGE IS THE HEADLINE, NOT A FOOTNOTE ────────────────────────────────────────────────────
 * Declaration is OPT-IN (`--declare-controls`). Most gates have not been converted yet, so this gate
 * prints how many gates carry controls, how many have DECLARED them, and how many have not.
 *   ⛔ A GATE THAT SILENTLY CHECKED 36 OF 167 WOULD BE THE UNDECLARED-FILTER DEFECT AGAIN. The
 *      coverage line is the feature: every run prints the size of the work remaining, which is what
 *      makes the backlog drain instead of settle.
 *   ⚠️ UNDECLARED IS REPORTED, NEVER RED. A gate written before the convention is not broken, and
 *      failing the suite over it would make the convention arrive by force rather than by draining.
 *
 * LEGS
 *   L1  the runner answered with a population (never a glob fallback)
 *   L2  every DECLARED gate's declaration parses and names at least one control
 *   L3  every declared anchor's target file exists
 *   L4  every declared anchor resolves EXACTLY its declared count      <- the §82.81 defect
 *   L5  every declared control names a non-empty expected red set (the sweep's half of the contract)
 *   L6  the census is non-vacuous — at least one gate has declared, so a green is not empty
 *
 * RED-FIRST CONTROLS
 *   --stale-anchor   mutates one declared literal in memory before checking. L4 must red. This is
 *                    the 2026-08-23 defect reproduced on demand.
 *   --empty-pop      makes the runner's answer come back empty. L1 and L6 must red — proving the
 *                    gate cannot print a green over a population it never received.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPTS, '..');
const argv = process.argv.slice(2);
const STALE = argv.includes('--stale-anchor');
const EMPTY = argv.includes('--empty-pop');

const legs = {};
let pass = 0, total = 0;
function ok(id, label, cond, detail) {
  total++; if (cond) pass++;
  legs[id] = !!cond;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${id} ${label}${detail ? '  — ' + detail : ''}`);
}

/* ── ask the runner ─────────────────────────────────────────────────────────────────────────── */
let population = [], popSource = 'runner';
try {
  if (EMPTY) throw new Error('--empty-pop');
  const out = execFileSync(process.execPath,
    [path.join(SCRIPTS, '_suite_baseline.mjs'), '--explain-names'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 24 });
  population = JSON.parse(out).gates;
} catch (e) {
  popSource = 'UNAVAILABLE (' + String(e.message).split('\n')[0] + ')';
}

console.log('DO THE POISON ANCHORS STILL RESOLVE?' + (STALE || EMPTY ? '   MODE: ' + argv.join(' ') : ''));
console.log('  ⛔ this gate proves ANCHOR FRESHNESS ONLY — never that a control still bites.');

/* ── which gates carry controls at all, and which have declared? ─────────────────────────────── */
const RUNNER_FLAGS = new Set(['--only', '--limit', '--selftest', '--sabotage', '--explain',
  '--explain-names', '--timeout', '--concnode', '--concbrowser', '--selftest-repeat',
  '--declare-controls', '--stale-anchor', '--empty-pop']);
const FLAG_RE = /(?:process\.)?argv\s*\.\s*includes\s*\(\s*['"](--[a-z0-9][a-z0-9-]*)['"]\s*\)/gi;

const SELF = path.basename(fileURLToPath(import.meta.url));
/* ⛔ THE MARKER IS THE CALL, NOT THE STRING — AND THIS GATE IS THE PROOF. The first cut matched the
   bare string `'--declare-controls'`, which THIS FILE contains four times (in RUNNER_FLAGS, in the
   spawn argv, and in prose). It classified ITSELF as a declarer, spawned itself, and timed out.
   🔑 A SUBSTRING IS NOT A CALL SITE. Matching the invocation form excludes every mention that is a
      mention rather than an implementation — the same distinction that made `$` twenty-three
      definitions instead of one, applied to a marker instead of a name.
   ⚠️ SELF IS *ALSO* EXCLUDED BY NAME. The tightened marker already suffices today; the name guard
      costs one line and survives someone later adding a real emit here for some reason. A recursion
      that only fails after a 30s timeout is worth two independent guards. */
const DECLARE_CALL = /argv\s*\.\s*includes\s*\(\s*['"]--declare-controls['"]\s*\)/;
const declared = [], undeclaredWithControls = [], noControls = [];
for (const name of population) {
  if (name === SELF) { noControls.push(name); continue; }
  let src;
  try { src = fs.readFileSync(path.join(SCRIPTS, name), 'utf8'); } catch { continue; }
  /* ⭐ the marker is a CONVENTION THIS FILE DEFINES, not a guess at what a gate might be doing —
     which is why searching for it is legitimate where globbing for the population would not be.
     It also keeps this gate fast: only declared gates are spawned. */
  if (DECLARE_CALL.test(src)) { declared.push(name); continue; }
  FLAG_RE.lastIndex = 0;
  let m, has = false;
  while ((m = FLAG_RE.exec(src))) if (!RUNNER_FLAGS.has(m[1])) { has = true; break; }
  (has ? undeclaredWithControls : noControls).push(name);
}

/* ── collect each declaration by ASKING THE GATE ─────────────────────────────────────────────── */
const decls = [];
const unparseable = [];
for (const name of declared) {
  try {
    const out = execFileSync(process.execPath, [path.join(SCRIPTS, name), '--declare-controls'],
      { cwd: REPO, encoding: 'utf8', timeout: 30000, maxBuffer: 1 << 22 });
    decls.push(JSON.parse(out));
  } catch (e) { unparseable.push(`${name}: ${String(e.message).split('\n')[0]}`); }
}

/* ── check every anchor ──────────────────────────────────────────────────────────────────────── */
const missingFiles = [], badCounts = [], emptyReds = [], noControlsDeclared = [];
let anchorCount = 0;
for (const d of decls) {
  const entries = Object.entries(d.controls || {});
  if (!entries.length) { noControlsDeclared.push(d.gate); continue; }
  for (const [flag, spec] of entries) {
    if (!Array.isArray(spec.reds) || spec.reds.length === 0) emptyReds.push(`${d.gate} ${flag}`);
    for (const a of spec.anchors || []) {
      anchorCount++;
      const fp = path.join(REPO, a.file);
      if (!fs.existsSync(fp)) { missingFiles.push(`${d.gate} ${flag} -> ${a.file}`); continue; }
      let body = fs.readFileSync(fp, 'utf8');
      /* the red-first: break ONE anchor and prove L4 notices */
      if (STALE && badCounts.length === 0 && missingFiles.length === 0) {
        body = body.split(a.literal).join('/* --stale-anchor */');
      }
      const n = body.split(a.literal).length - 1;
      const want = a.count == null ? 1 : a.count;
      if (n !== want) badCounts.push(`${d.gate} ${flag} -> ${a.file}: found ${n}x, declared ${want}x`);
    }
  }
}

console.log(`\n  POPULATION  ${population.length} gates, from ${popSource}`);
console.log(`    declared controls (§82.99)   ${declared.length}`);
console.log(`    carry controls, UNDECLARED   ${undeclaredWithControls.length}   <- the conversion backlog`);
console.log(`    no controls at all           ${noControls.length}`);
console.log(`    anchors checked              ${anchorCount}\n`);

ok('L1 ', 'the runner answered with a population', popSource === 'runner' && population.length > 0, `${population.length} gates from ${popSource}`);
ok('L2 ', 'every declared gate answered with a parseable declaration', unparseable.length === 0, unparseable.join(' | ') || 'all parsed');
ok('L3 ', 'every declared anchor names a file that exists', missingFiles.length === 0, missingFiles.join(' | ') || 'all present');
ok('L4 ', 'every declared anchor resolves EXACTLY its declared count', badCounts.length === 0, badCounts.join(' | ') || `${anchorCount} anchors resolve`);
ok('L5 ', 'every declared control names a non-empty expected red set', emptyReds.length === 0 && noControlsDeclared.length === 0, [...emptyReds, ...noControlsDeclared].join(' | ') || 'all declare reds');
ok('L6 ', 'the census is non-vacuous (at least one gate has declared)', decls.length > 0, `${decls.length} declaration(s)`);

if (undeclaredWithControls.length) {
  console.log(`\n  ⚠️  ${undeclaredWithControls.length} gate(s) carry controls that have NOT declared them. NOT a red —`);
  console.log('      a gate written before the convention is not broken. This is the backlog, printed');
  console.log('      every run so it drains rather than settles. Nothing verifies those anchors today.');
}

const expect = STALE ? ['L4 '] : EMPTY ? ['L1 ', 'L6 '] : null;
if (expect) {
  const reds = Object.keys(legs).filter((k) => !legs[k]).sort();
  const want = expect.slice().sort();
  const same = reds.length === want.length && reds.every((r, i) => r === want[i]);
  console.log(`  control ${same ? 'OK' : 'MISMATCH'} — expected reds [${want.join(' ')}], got [${reds.join(' ') || 'none'}]`);
  console.log(`SCORE ${pass}/${total}   (red-first control ${same ? 'behaved as specified' : 'DID NOT behave as specified'})`);
  process.exit(same ? 0 : 1);
}
console.log(`SCORE ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}   — anchor freshness only`);
process.exit(pass === total ? 0 : 1);
