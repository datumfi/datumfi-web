/* DEV-ONLY red-first gate — MISS-5: retiring the PREFS Clerk mirror (Architect #455).

   WHAT IS BEING RETIRED. Preferences (the account dossier + the workspace name) were dual-written: to D1
   via DatumD1.writePreferences, AND unconditionally to Clerk unsafeMetadata as the safety net. D1 is now
   the store — both readers cut over to D1-first long ago (Dossier.html _resolveDossier, my-account.html
   _resolveWorkspaceName, and nav.js _datumSeedDossier since 9a1280e) — so the unconditional Clerk write is
   what goes.

   RETIRED MEANS CONDITIONAL, NOT ABSENT. writePreferences no-ops when rolled back (CUTOVER === false) or
   signed out of D1. Delete the Clerk write outright and a rollback — the one-flip escape route — would
   silently stop persisting preferences ANYWHERE: it would look intact and quietly lose data. So the mirror
   now fires in EXACTLY the states where the D1 write cannot, and nowhere else.

   THE PROPERTY THIS GATE EXISTS TO PROVE: the two writers are EXACT COMPLEMENTS. For every reachable state
   a preference lands in exactly ONE store — never both (that is the un-retired dual-write), and never NONE
   (that is silent data loss). Enumerated exhaustively below rather than spot-checked.

   MUTATIONS:
     --redfirst  the Clerk mirror goes back to unconditional -> "never both" fails: the mirror is still
                 written under cutover, i.e. nothing was actually retired.
     --deleted   the Clerk mirror is removed outright -> "never none" fails in the rollback / signed-out
                 states: the escape route becomes silently lossy. This is the tempting wrong fix.
*/
import { readFileSync } from 'node:fs';

const MODE = process.argv.includes('--redfirst') ? 'a' : process.argv.includes('--deleted') ? 'b' : null;
const d1Src = readFileSync('scripts/datum-d1.js', 'utf8');
const dossier = readFileSync('Dossier.html', 'utf8');
const account = readFileSync('my-account.html', 'utf8');

const A_PRED = 'function prefsMirrorNeeded() { return API.CUTOVER === false || !signedIn(); }';
const A_GUARD = 'if (API.CUTOVER === false || !signedIn()) return;';
for (const [n, a] of [['predicate', A_PRED], ['writePreferences guard', A_GUARD]]) {
  if (!d1Src.includes(a)) throw new Error('anchor missing (' + n + ') — structure moved, re-true this gate');
}

/* ── model the two writers exactly as the shipped code expresses them ──────────────────────────────── */
function makeWriters(mode) {
  // the REAL predicate, sliced from datum-d1.js — not a paraphrase
  const predSrc = A_PRED.replace('function prefsMirrorNeeded()', 'function pred()');
  const build = (cutover, signed) => new Function('API', 'signedIn',
    predSrc + '\nreturn pred;')({ CUTOVER: cutover }, () => signed);

  return (state) => {
    const { d1Present, cutover, signedIn } = state;
    // D1 write: exactly writePreferences' own guard
    const d1Write = d1Present && !(cutover === false || !signedIn);
    // Clerk mirror: the shipped call-site guard  !window.DatumD1 || prefsMirrorNeeded()
    let mirror;
    if (mode === 'a') mirror = true;                                  // un-retired: unconditional
    else if (mode === 'b') mirror = false;                            // deleted outright
    else mirror = !d1Present || build(cutover, signedIn)();
    return { d1Write, mirror };
  };
}
const writers = makeWriters(MODE);

const checks = [];
const ok = (label, cond) => checks.push([label, !!cond]);

/* ═══ 1 · EXHAUSTIVE STATE ENUMERATION — exactly one store, always ════════════════════════════════ */
const STATES = [];
for (const d1Present of [true, false])
  for (const cutover of [true, false])
    for (const signedIn of [true, false])
      STATES.push({ d1Present, cutover, signedIn });

let both = [], none = [];
for (const s of STATES) {
  const w = writers(s);
  const tag = `D1=${s.d1Present} CUTOVER=${s.cutover} signedIn=${s.signedIn}`;
  if (w.d1Write && w.mirror) both.push(tag);
  if (!w.d1Write && !w.mirror) none.push(tag);
}
ok('NEVER BOTH — no reachable state still dual-writes (the mirror is genuinely retired) [BITE a]',
  both.length === 0);
ok('NEVER NONE — no reachable state drops the preference on the floor [BITE b]',
  none.length === 0);
if (both.length) console.log('     dual-write states: ' + both.join(' | '));
if (none.length) console.log('     lost-write states: ' + none.join(' | '));

/* ═══ 2 · THE SPECIFIC STATES THAT MATTER ════════════════════════════════════════════════════════ */
{
  const w = writers({ d1Present: true, cutover: true, signedIn: true });
  ok('NORMAL (D1 live, signed in) -> D1 only, Clerk mirror SILENT [BITE a]', w.d1Write && !w.mirror);
}
{
  const w = writers({ d1Present: true, cutover: false, signedIn: true });
  ok('ROLLBACK (CUTOVER=false) -> Clerk mirror WRITES, D1 silent — the escape route is REAL [BITE b]',
    !w.d1Write && w.mirror);
}
{
  const w = writers({ d1Present: true, cutover: true, signedIn: false });
  ok('SIGNED OUT of D1 -> Clerk mirror writes (the preference still lands) [BITE b]', !w.d1Write && w.mirror);
}
{
  const w = writers({ d1Present: false, cutover: true, signedIn: true });
  ok('D1 CLIENT ABSENT -> Clerk mirror writes (no D1 write is possible) [BITE b]', !w.d1Write && w.mirror);
}

/* ═══ 3 · THE SHIPPED CALL SITES actually carry the guard ═════════════════════════════════════════ */
const GUARD = 'if (!window.DatumD1 || window.DatumD1.prefsMirrorNeeded())';
ok('Dossier.html hybridSave guards its Clerk prefs write [BITE a]', dossier.includes(GUARD));
ok('my-account.html guards its Clerk prefs write [BITE a]', account.includes(GUARD));
ok('every Clerk prefs write in Dossier.html is behind the guard — none left unconditional [BITE a]',
  (dossier.match(/unsafeMetadata: (meta|m|pushMeta|migMeta)\b/g) || []).length ===
  (dossier.match(new RegExp(GUARD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length);
ok('the D1 write still happens on save (nothing lost in the retire)',
  dossier.includes('window.DatumD1.writePreferences({ dossier: p, workspaceName: wn })'));
ok('one persist seam in Dossier.html — push + migration cannot drift from save (L48)',
  dossier.includes('function _persistPrefs(dossier, workspaceName)') &&
  (dossier.match(/_persistPrefs\(/g) || []).length >= 3);
ok('one persist seam in my-account.html — migration + rename-on-blur share it (L48)',
  account.includes('function _persistWorkspaceName(n)') &&
  (account.match(/_persistWorkspaceName\(/g) || []).length >= 3);
ok('the predicate is EXPORTED so both pages use the same one (no paraphrase)',
  d1Src.includes('prefsMirrorNeeded: prefsMirrorNeeded,'));

/* ═══ 4 · READS UNCHANGED — D1-first with the mirror as silent fallback ═══════════════════════════ */
ok('Dossier.html still reads D1-first with the Clerk mirror as fallback',
  dossier.includes("D1.getDoc('preferences', 'dossier')") && dossier.includes('cb(dos || _clerk);'));
ok('my-account.html still reads D1-first with the Clerk mirror as fallback',
  account.includes("D1.getDoc('preferences', 'workspaceName')") && account.includes('cb(wn || _clerk);'));
ok('nav.js _datumSeedDossier still resolves D1-first (the third reader, shipped 9a1280e)',
  readFileSync('nav.js', 'utf8').includes("D1.getDoc('preferences', 'dossier')"));

/* ═══ 5 · FENCES — ONLY prefs is retired ═════════════════════════════════════════════════════════ */
ok('FENCE: blueprint_z mirror write UNTOUCHED (retires later, after the codec-gap fix)',
  readFileSync('scripts/studio-blueprint.js', 'utf8').includes('global.Clerk.user.update({ unsafeMetadata: res.merged })'));
ok('FENCE: sketchbook_z mirror write UNTOUCHED (retires LAST)',
  readFileSync('sketch.html', 'utf8').includes('window.Clerk.user.update({ unsafeMetadata: _res.merged })'));
ok('FENCE: the title mirror in nav.js is untouched',
  readFileSync('nav.js', 'utf8').includes('window._datumMirrorTitle = function(metaKey, value)'));
ok('FENCE: no Clerk prefs KEY is deleted — the existing mirror data survives as the rollback net',
  !/unsafeMetadata[^;]*delete |delete [^;]*\.dossier/.test(dossier));

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */
const pass = checks.filter((c) => c[1]).length;
const label = MODE === 'a' ? 'RED-FIRST a (mirror still unconditional)'
            : MODE === 'b' ? 'RED-FIRST b (mirror deleted outright)' : 'RUN';
console.log('[' + label + '] MISS-5 — prefs mirror retire — ' + pass + '/' + checks.length);
for (const [l, c] of checks) if (!c) console.log('   FAIL · ' + l);
if (MODE && pass === checks.length) { console.log('   !! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
if (!MODE && pass !== checks.length) process.exit(1);
