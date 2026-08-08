/* @gate-pool: node
 * ^ §13.69 — DECLARED, not inferred. This spawns a plain node child; no Chromium is involved.
 *
 * ═══ WRAPPER GATE — RentCast AVM cap-gate (Property §25) ═══════════════════════════════════════
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS THIN.
 * The 52 legs already exist and are good. They live in `workers/rentcast-avm.test.mjs`, which the
 * suite runner never saw for ONE reason: the runner globs `scripts/_gate_*` + `_p<digit>*`, and
 * that path is neither. Nothing was wrong with the legs — they were simply unreachable, so the
 * cap-safety assertions sat OUTSIDE the pre-push wall. Valuation API row 70 puts overage liability
 * 100% on the Captain with no refunds; the cap is the only thing between a loop bug and a real
 * bill, and until now nothing checked it unless somebody remembered to type the command.
 *
 * L48 — POINT, DO NOT COPY. Every assertion stays in exactly ONE place. A copied leg drifts, and
 * the copy that drifts is always the one the suite is running.
 *
 * ⭐ WHAT WOULD MAKE THIS WRAPPER PASS WITHOUT THE CLAIM BEING TRUE?
 *   1. It runs the child and then ignores the child's status  → suite GREEN, 52 legs failing.
 *   2. The child dies before its first assertion (moved file, bad import) and exits 0 anyway.
 *   3. The child runs a TRUNCATED set of legs, and each of the few it reached passed.
 * All three are one disease: a green that describes the WRAPPER instead of the product. So this
 * wrapper asserts THREE things, not one:
 *   A. the child's real exit status is 0
 *   B. the child actually PRINTED ITS SCORE LINE   (§13.73 — no score printed = NO RESULT)
 *   C. the child reported ≥ LEG_FLOOR passes and ZERO fails
 *
 * ON "NEVER READ AN EXIT CODE THROUGH A PIPE": `spawnSync` hands back the child's OWN status from
 * the OS. There is no shell and no pipeline in between, so no `tee`/`head` status can be mistaken
 * for the gate's. Output is CAPTURED rather than inherited precisely so assertion B is possible —
 * with `stdio:'inherit'` this wrapper could not tell a real score from silence. The child's report
 * is re-printed verbatim below, so capturing hides nothing from a human reading the run.
 *
 * LEG_FLOOR IS A FLOOR, NOT A COUNT. 52 legs measured 2026-08-08. ADDING legs keeps this green.
 * REMOVING legs turns it RED ON PURPOSE. Raise this number when legs are added; never lower it to
 * clear a red without naming which leg went and why.
 *
 * NEGATIVE CONTROL — `--selfcheck`. It drives the REAL child both ways rather than simulating a
 * failure (§13.72: a test that sets state proves the renderer, never the handler), and it demands
 * BOTH directions, because a wrapper that always reds proves as little as one that always greens:
 *     child normal     → status 0
 *     child --redfirst → status NON-ZERO, and this wrapper PROPAGATES it
 * If this wrapper ever starts swallowing the child's failure, `--selfcheck` is the thing that says
 * so out loud.
 *
 * Usage:
 *   node scripts/_gate_rentcast_cap.mjs              the gate (this is what the suite runs)
 *   node scripts/_gate_rentcast_cap.mjs --redfirst   pass-through to the child; expect RED
 *   node scripts/_gate_rentcast_cap.mjs --selfcheck  the wrapper's own negative control
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHILD = path.resolve(HERE, '..', 'workers', 'rentcast-avm.test.mjs');
const LEG_FLOOR = 52;

const argv = process.argv.slice(2);
const SELFCHECK = argv.includes('--selfcheck');
const REDFIRST = argv.includes('--redfirst');

/* The child's markers are LITERALS, matched with indexOf. A regex for a literal needle is how two
   legs once failed in NORMAL mode against perfectly correct product code. */
const SCORE_MARK = 'RENTCAST CAP-GATE';
const OVERALL_MARK = 'OVERALL: ';

function runChild(extra) {
  const r = spawnSync(process.execPath, [CHILD, ...extra], { encoding: 'utf8', timeout: 120000 });
  return { status: r.status, signal: r.signal, error: r.error, out: (r.stdout || '') + (r.stderr || '') };
}

/* Returns {pass, fail} from the child's own tail line, or null if it never printed one. */
function readScore(out) {
  if (out.indexOf(SCORE_MARK) < 0) return null;
  const i = out.indexOf(OVERALL_MARK);
  if (i < 0) return null;
  const nl = out.indexOf('\n', i);
  const line = out.slice(i, nl < 0 ? out.length : nl);
  const m = line.match(/\((\d+) pass \/ (\d+) fail\)/);
  if (!m) return null;
  return { pass: parseInt(m[1], 10), fail: parseInt(m[2], 10), line: line.trim() };
}

function report(label, legs) {
  const fails = legs.filter((l) => !l.ok).length;
  const overall = fails === 0 ? 'GREEN' : 'RED';
  console.log('[' + label + '] RENTCAST WRAPPER — ' + overall);
  legs.forEach((l) => console.log((l.ok ? 'PASS ' : 'FAIL ') + l.m));
  console.log('-------------------------------------');
  console.log('WRAPPER OVERALL: ' + overall + '   (' + (legs.length - fails) + ' pass / ' + fails + ' fail)');
  return fails === 0;
}

/* A missing child is a RIG FAULT, not a product red (§13.68) — but it is still a HARD STOP, because
   the whole point of this file is that the cap assertions actually run before a push. Say which it
   is, loudly, so nobody debugs the Worker over a moved file. */
if (!existsSync(CHILD)) {
  console.log('[RIG] RENTCAST WRAPPER — NO RESULT');
  console.log('FAIL the legs this gate points at are GONE: ' + CHILD);
  console.log('WRAPPER OVERALL: RED   (0 pass / 1 fail)   [RIG FAULT — not a product red]');
  process.exit(1);
}

if (SELFCHECK) {
  const norm = runChild([]);
  const red = runChild(['--redfirst']);
  const nScore = readScore(norm.out);
  const rScore = readScore(red.out);
  const legs = [
    { ok: norm.status === 0, m: 'child NORMAL exits 0 (status=' + norm.status + ')' },
    { ok: !!nScore && nScore.fail === 0 && nScore.pass >= LEG_FLOOR,
      m: 'child NORMAL printed a score ≥ floor ' + LEG_FLOOR + ' with 0 fail (' + (nScore ? nScore.pass + '/' + nScore.fail : 'NO SCORE') + ')' },
    { ok: red.status !== 0 && red.status !== null, m: 'child --redfirst exits NON-ZERO (status=' + red.status + ')' },
    { ok: !!rScore && rScore.fail > 0, m: 'child --redfirst reports real FAILING legs (' + (rScore ? rScore.fail + ' fail' : 'NO SCORE') + ')' },
    /* THE ONE THAT MATTERS: the wrapper must not swallow the red. This re-runs the WRAPPER itself
       in --redfirst and reads the WRAPPER's status, which is the exact thing the suite will read. */
    { ok: (() => {
        const w = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--redfirst'], { encoding: 'utf8', timeout: 120000 });
        return w.status !== 0 && w.status !== null;
      })(), m: 'the WRAPPER propagates the child RED (does not swallow it)' }
  ];
  process.exit(report('SELFCHECK', legs) ? 0 : 1);
}

const c = runChild(REDFIRST ? ['--redfirst'] : []);
process.stdout.write(c.out.endsWith('\n') || c.out === '' ? c.out : c.out + '\n');

if (REDFIRST) {
  /* Pass-through. The child is SUPPOSED to be red here; forward its status untouched and say so,
     so a red in this mode is never filed as a regression. */
  const ok = c.status !== 0 && c.status !== null;
  console.log('[REDFIRST] RENTCAST WRAPPER — child status ' + c.status + (ok ? ' (RED as expected)' : ' (⚠ EXPECTED A RED AND DID NOT GET ONE)'));
  process.exit(c.status === null ? 1 : c.status);
}

const score = readScore(c.out);
const legs = [
  { ok: c.status === 0, m: 'child exit status is 0 (status=' + c.status + (c.signal ? ', signal=' + c.signal : '') + ')' },
  { ok: !!score, m: 'child PRINTED its score line (§13.73 — no score = no result)' },
  { ok: !!score && score.fail === 0 && score.pass >= LEG_FLOOR,
    m: 'child ran ≥ ' + LEG_FLOOR + ' legs with 0 fail (' + (score ? score.pass + ' pass / ' + score.fail + ' fail' : 'NO SCORE') + ')' }
];
if (c.error) legs.push({ ok: false, m: 'child failed to spawn: ' + c.error.message + '   [RIG FAULT — not a product red]' });
process.exit(report('RUN', legs) ? 0 : 1);
