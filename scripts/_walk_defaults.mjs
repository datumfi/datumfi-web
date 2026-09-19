/* _walk_defaults.mjs — THE WALK. `npm run walk`
 *
 * ⛔⛔ WHAT THIS IS FOR, AND IT IS NOT A TEST. The Captain, 2026-09-19:
 *    "if I DON'T LITERALLY SAY SOMETHING it will bite me later. If I knew all the questions to ask,
 *     I'd ask them. But I don't, so I have to just keep plugging along."
 *
 *    Every large finding of this arc traces to him asking an open question nobody had scripted.
 *    A GATE VERIFIES CONFORMANCE TO A STATED INTENT AND CANNOT ORIGINATE INTENT (§82.2795), so a
 *    suite of gates will never be the thing that asks. THIS ASKS. It enters an EMPTY Studio,
 *    answers ONLY what the product actually demands of it, and then reports every value that
 *    reached an engine anyway.
 *    🔑 IT CONVERTS "I have to hope I ask the right question" INTO "the walk asks it every time."
 *
 * ── WHY IT IS NOT A SECOND COPY OF THE CENSUS (L48) ───────────────────────────────────────────
 * They answer different questions and need different things:
 *   `npm run state`  of the 41 fields THE ENGINE ACCEPTS, which arrive unchosen — needs the engine
 *                    repo and a python schema dump.
 *   `npm run walk`   of the keys THE CLIENT SENDS, which were never asked for — needs nothing but
 *                    a browser. It runs when the engine repo is not on disk, which is when somebody
 *                    is most likely to be working on the client alone.
 * The OBSERVATION is shared, so neither can disagree with the other about what the product did.
 *
 * ── THE PREDICATE ─────────────────────────────────────────────────────────────────────────────
 *   A key is UNCHOSEN if it is on the payload and no refusal ever demanded the control it comes
 *   from. "Demanded" is recorded by the walk itself: the control id each refusal targeted, on a
 *   real page, from empty. NOT a map, NOT a list, NOT a memory.
 *
 * ⛔ TWO SURFACES, ALWAYS BOTH. /api/calculate and the SS-matrix request have SEPARATE BUILDERS,
 *    so a default removed from one survives on the other. Reporting either alone is a half-truth
 *    and the halves overlap — §82.2760, the denominator is part of the result.
 *
 * ⚠️ WHAT IT CANNOT SEE, PRINTED EVERY RUN RATHER THAN REMEMBERED:
 *    · a value the ENGINE substitutes when the client sends nothing. Clearing a client key moves
 *      it out of this report and does NOT remove it from the household's Range. `npm run state`
 *      is the instrument for that half and this one says so rather than implying coverage.
 *    · whether a DEMANDED value is modelled correctly. Demanded means the door refuses without it.
 *    · one household per configuration. The walk answers doors with SHAPES, never judgements.
 *
 * ⭐ §82.2794 — THE INSTRUMENT'S REACH IS PART OF ITS RESULT. Every Clause 2 default we remove
 *    makes the product ask one more question, which makes this walk LONGER. So it reports the
 *    DEPTH it reached, and a walk that stops early is a RED, not a short pass: the count of
 *    unchosen values from a walk that never finished is a count of what it happened to see.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OBSERVED = join(tmpdir(), 'datum-payload-observed.json');
const B = (s) => `\x1b[1m${s}\x1b[0m`, DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`, GRN = (s) => `\x1b[32m${s}\x1b[0m`, YEL = (s) => `\x1b[33m${s}\x1b[0m`;
const pad = (s, n) => String(s).length >= n ? String(s) : String(s) + ' '.repeat(n - String(s).length);

const args = process.argv.slice(2);
const reuse = args.includes('--reuse');

console.log('');
console.log(B('THE WALK — every value that reaches an engine without a household choosing it'));
console.log(DIM('  enters an EMPTY Studio · answers only what the product demands · reports the rest'));
console.log('');

/* ── 1 · WALK, unless explicitly told to reuse. ────────────────────────────────────────────────
   ⛔ THE DEFAULT IS TO WALK. A stale observation is indistinguishable from a fresh one in the
      output, and this command exists to be trusted without anybody checking a timestamp first.
      `--reuse` is for iterating on THIS FILE and says so in the banner when used. */
if (!reuse) {
  console.log(DIM('  walking the product (a real browser, ~60s)…'));
  try {
    execFileSync(process.execPath, [join(HERE, '_gate_payload_accounted.js')],
      { stdio: 'ignore', cwd: ROOT, timeout: 6 * 60 * 1000 });
  } catch (e) {
    /* ⚠️ THE WALK GATE EXITS NON-ZERO WHEN IT FINDS UNCHOSEN VALUES, WHICH IS ITS JOB. A non-zero
       exit here is therefore NOT a reason to stop — the observation is still written. Only a
       missing or unreadable observation is fatal, and that is tested below rather than inferred
       from an exit code. */
  }
} else {
  console.log(YEL('  --reuse: NOT walking. Reading the last observation. Do not quote this run.'));
}

let obs;
try { obs = JSON.parse(readFileSync(OBSERVED, 'utf8')); }
catch (e) {
  console.log(RED(B('  ⛔ NO OBSERVATION. The walk did not complete and nothing here can be reported.')));
  console.log(DIM('     A count taken from a walk that never ran is a count of nothing. Fix the walk first:'));
  console.log(DIM('     node scripts/_gate_payload_accounted.js'));
  process.exit(1);
}
const ageMin = Math.round((Date.now() - statSync(OBSERVED).mtimeMs) / 60000);

/* ── 2 · DEPTH. §82.2794 — a walk that stopped early has not measured, it has sampled. ───────── */
const cfgs = [['SOLO', obs.solo || {}], ['DUAL', obs.dual || {}]];
let stoppedEarly = false;
console.log('');
console.log(B('  DEPTH REACHED') + DIM('   (observation ' + ageMin + ' min old)'));
for (const [name, c] of cfgs) {
  const asked = c.asked || [];
  const opened = !!(c.payload && Object.keys(c.payload).length);
  if (!opened) stoppedEarly = true;
  console.log('    ' + pad(name, 6) + (opened ? GRN('door OPENED') : RED('STOPPED SHORT'))
    + DIM('  after ' + asked.length + ' refusal(s): ') + asked.join(', '));
}
const mx = obs.matrix || {};
const mReach = !!((mx.solo && mx.solo.reachable) || (mx.dual && mx.dual.reachable));
console.log('    ' + pad('MATRIX', 6) + (mReach ? GRN('reachable') : RED('UNREACHABLE'))
  + DIM('  the SS-matrix request has its OWN builder and its own defaults'));
if (!mReach) stoppedEarly = true;
if (stoppedEarly) {
  console.log('');
  console.log(RED(B('  ⛔ THE WALK DID NOT REACH THE END. Every count below is a count of what it')));
  console.log(RED(B('     happened to see before it stopped — not a measurement. §82.2794.')));
}

/* ── 3 · THE UNCHOSEN, PER SURFACE, THEN THE UNION. ───────────────────────────────────────────
   ⛔ `accounts` IS EXCLUDED BY NAME AND THE REASON IS NOT "it is big". The estate is demanded via
      its own door (`sec-drafting`) and its CONTENTS are the household's own rooms, so it is not a
      value anybody defaulted. Excluding it silently would be the trick this whole instrument is
      against; excluding it in writing is a declaration. */
function unchosen(c) {
  const asked = new Set(c.asked || []);
  const askedKeys = new Set(c.askedKeys || []);
  return Object.keys(c.payload || {}).filter((k) => k !== 'accounts' && !askedKeys.has(k));
}
const uSolo = unchosen(obs.solo || {});
const uDual = unchosen(obs.dual || {});
const mBody = (mx.dual && mx.dual.body) || (mx.solo && mx.solo.body) || {};
const askedDualKeys = new Set(((obs.dual || {}).askedKeys) || []);
const uMatrix = Object.keys(mBody).filter((k) => k !== 'accounts' && !askedDualKeys.has(k));

/* ⛔⛔ DECLARED IS NOT CHOSEN, AND WITHOUT THIS SPLIT THE NUMBER COULD NEVER REACH ZERO AND WOULD
   THEREFORE STOP MEANING ANYTHING. Some keys are legitimately ours — `matrix_depth` is a
   performance choice, not a modelling one — and a walk that forever reports them beside the
   Captain's own defaults teaches everyone to read past the count.
   ⚠️ BUT A DECLARATION IS A CLAIM AND NOT A PASS. `_payload_sources.json` is a file somebody
      writes, so a key can be declared into silence. The declared ones are therefore SHOWN, every
      run, with their kind — never hidden, never subtracted without being named. THE HEADLINE
      COUNTS THE UNDECLARED; THE DECLARED ARE PRINTED UNDER IT SO A BAD DECLARATION IS VISIBLE. */
let DECL = { keys: {} };
try { DECL = JSON.parse(readFileSync(join(HERE, '_payload_sources.json'), 'utf8')); } catch (e) {}
const declOf = (k) => (DECL.keys || {})[k];

function block(title, keys, body) {
  const undecl = keys.filter((k) => !declOf(k));
  const decl = keys.filter((k) => declOf(k));
  console.log('');
  console.log(B('  ' + title) + DIM('  — ' + undecl.length + ' UNDECLARED'
    + (decl.length ? ' · ' + decl.length + ' declared' : '')));
  if (!undecl.length) console.log(GRN('    ✅ nothing UNDECLARED reaches this surface that a household did not choose.'));
  undecl.forEach((k) => console.log('    ' + RED('·') + ' ' + pad(k, 34) + DIM(JSON.stringify(body[k]))));
  decl.forEach((k) => console.log('    ' + YEL('~') + ' ' + pad(k, 34) + DIM(JSON.stringify(body[k]))
    + DIM('   [' + (declOf(k).kind || '?') + (declOf(k).from ? ' from ' + declOf(k).from : '') + ']')));
}
block('SURFACE 1 · /api/calculate · SOLO', uSolo, (obs.solo || {}).payload || {});
block('SURFACE 1 · /api/calculate · DUAL', uDual, (obs.dual || {}).payload || {});
block('SURFACE 2 · the SS-matrix request', uMatrix, mBody);

const unionAll = new Set([...uDual, ...uMatrix]);
const union = new Set([...unionAll].filter((k) => !declOf(k)));
const declaredCount = unionAll.size - union.size;
const matrixOnly = [...union].filter((k) => !uDual.includes(k));
console.log('');
console.log(B('  ══ THE UNION ══'));
console.log('  ' + B(String(union.size)) + ' UNDECLARED values reach an engine without a household choosing them.'
  + (declaredCount ? DIM('  (+' + declaredCount + ' declared — printed above, not hidden)') : ''));
console.log(DIM('    ' + uDual.length + ' on /api/calculate · ' + uMatrix.length + ' on the SS-matrix request · '
  + matrixOnly.length + ' reachable ONLY through the matrix door.'));
if (matrixOnly.length) {
  console.log(RED('    ⛔ MATRIX-ONLY — the easiest to miss, because one surface cannot be cleaned by fixing the other:'));
  matrixOnly.forEach((k) => console.log('       · ' + pad(k, 32) + DIM(JSON.stringify(mBody[k]))));
}
console.log('');
console.log(DIM('  ⚠️ THIS IS THE CLIENT\'S HALF. A key cleared here moves to the ENGINE\'s defaults and'));
console.log(DIM('     still reaches the household — `npm run state` is the instrument for that half.'));
console.log(DIM('     CLEARING IS NOT REMOVING. A refusal is removing.'));
console.log('');
process.exit(stoppedEarly || union.size ? 1 : 0);
