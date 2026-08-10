/* DEV-ONLY red-first gate — MISS-5 pre-work item 1: the SHARED cross-device dossier resolver.

   WHY THIS EXISTS. Retiring the Clerk prefs mirror (MISS-5) means nothing may still read
   unsafeMetadata.dossier as its only source. Two pages did: studio.html (~13831) and sketch.html (~2973),
   with structurally identical code. Converting them separately would leave two copies of one rule free to
   drift, so the read moved behind ONE resolver in nav.js — window._datumSeedDossier — whose resolution order
   mirrors Dossier.html / my-account.html exactly (MISS-6 read-cutover): D1 preferences/dossier WINS, Clerk
   unsafeMetadata.dossier is the SILENT FALLBACK. Nothing is retired by this commit.

   THE LOAD-BEARING GUARANTEE is not the D1 preference — it is that done() fires EXACTLY ONCE ON EVERY PATH.
   studio.html gates its drafting stage (_seedGateOn) and reveals it inside that callback. A path that never
   calls back leaves a signed-in user staring at hidden numbers with no error anywhere. So the callback
   contract is gated harder than the data.

   MUTATIONS (each proven to bite):
     --redfirst  the resolver reads Clerk FIRST and ignores D1 — the pre-cutover behaviour. Every
                 D1-preference assertion goes red.
     --nocb      the failure paths return without calling done() — the exact "stage stays hidden forever"
                 bug. The callback-contract assertions go red.
*/
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';

const MODE = process.argv.includes('--redfirst') ? 'a' : process.argv.includes('--nocb') ? 'b' : null;
const navSrc = readFileSync('nav.js', 'utf8');
const studio = studioSource();

/* ── anchors ───────────────────────────────────────────────────────────────────────────────────────── */
const A_D1FIRST = "finish(cache(dos || net));";
const A_NOCLERK = "if (!window.Clerk) { finish(null); return; }";
const A_HELPER  = 'window._datumSeedDossier = function (done) {';
for (const [n, a] of [['d1-first', A_D1FIRST], ['no-clerk finish', A_NOCLERK], ['helper', A_HELPER]]) {
  if (!navSrc.includes(a)) throw new Error('anchor missing (' + n + ') — structure moved, re-true this gate');
}

/* ── slice the resolver out of nav.js and run it against fake Clerk/D1 ─────────────────────────────── */
function buildResolver(mode) {
  const start = navSrc.indexOf(A_HELPER);
  let depth = 0, began = false, end = -1;
  for (let j = navSrc.indexOf('{', start + A_HELPER.length - 1); j < navSrc.length; j++) {
    if (navSrc[j] === '{') { depth++; began = true; }
    else if (navSrc[j] === '}') { depth--; if (began && depth === 0) { end = j + 1; break; } }
  }
  let body = navSrc.slice(start, end) + ';';
  if (mode === 'a') {
    const before = body;
    body = body.replace(A_D1FIRST, 'finish(cache(net));');          // ignore D1, always take the Clerk net
    if (body === before) throw new Error('mutation a did not apply');
  }
  if (mode === 'b') {
    const before = body;
    body = body.replace(A_NOCLERK, 'if (!window.Clerk) { return; }');   // silently never call back
    if (body === before) throw new Error('mutation b did not apply');
  }
  return body;
}

/* a minimal window/localStorage sandbox — the resolver only touches Clerk, DatumD1 and localStorage */
function makeEnv({ clerk, d1 }) {
  const store = {};
  const win = {
    Clerk: clerk, DatumD1: d1,
    localStorage: { setItem: (k, v) => { store[k] = v; }, getItem: (k) => (k in store ? store[k] : null) }
  };
  win.window = win;
  const fn = new Function('window', 'localStorage', buildResolver(MODE) + '\nreturn window._datumSeedDossier;');
  return { call: fn(win, win.localStorage), store };
}
const clerkWith = (meta) => ({ load: () => Promise.resolve(), user: { unsafeMetadata: meta } });
const d1With = (payload, opts = {}) => ({
  CUTOVER: opts.cutover === undefined ? true : opts.cutover,
  signedIn: () => (opts.signedIn === undefined ? true : opts.signedIn),
  getDoc: () => (opts.reject ? Promise.reject(new Error('unreachable')) : Promise.resolve(payload ? { payload: JSON.stringify(payload) } : null))
});
const resolve = (env) => new Promise((res) => env.call(res));

const D1_DOS = { savedAt: '2026-07-25T00:00:00Z', source: 'D1' };
const CLERK_DOS = { savedAt: '2026-01-01T00:00:00Z', source: 'CLERK' };

const checks = [];
const ok = (label, cond) => checks.push([label, !!cond]);

/* ═══ 1 · RESOLUTION ORDER — D1 wins, Clerk is the silent net ═════════════════════════════════════ */
{
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS) });
  const got = await resolve(env);
  ok('D1 preferences/dossier WINS over the Clerk mirror [BITE a]', got && got.source === 'D1');
  ok('the resolved dossier is cached to LS (both callers did this identically)',
    env.store['datumfi.accountDossier.v15'] === JSON.stringify(D1_DOS));
}
{ // D1 live but the row does not exist yet -> fall back, do not blank the user
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(null) });
  const got = await resolve(env);
  ok('D1 live but NO row yet -> Clerk mirror is used (never a blank seed)', got && got.source === 'CLERK');
}
{ // D1 unreachable mid-flight -> the net catches it
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS, { reject: true }) });
  const got = await resolve(env);
  ok('D1 getDoc REJECTS (unreachable) -> Clerk mirror fallback', got && got.source === 'CLERK');
}
{ // the one-flip rollback must be an instant no-op
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS, { cutover: false }) });
  const got = await resolve(env);
  ok('CUTOVER=false -> D1 ignored entirely, Clerk mirror used (rollback is a no-op)', got && got.source === 'CLERK');
}
{ // signed out of D1 but Clerk present
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS, { signedIn: false }) });
  const got = await resolve(env);
  ok('D1 signed-out -> Clerk mirror used', got && got.source === 'CLERK');
}
{ // D1 absent entirely (old page / script blocked)
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: undefined });
  const got = await resolve(env);
  ok('D1 absent -> Clerk mirror used', got && got.source === 'CLERK');
}

/* ═══ 2 · THE CALLBACK CONTRACT — exactly once, on every path ═════════════════════════════════════ */
{
  const env = makeEnv({ clerk: undefined, d1: undefined });
  const got = await Promise.race([resolve(env), new Promise((r) => setTimeout(() => r('NEVER'), 60))]);
  ok('NO Clerk at all -> still calls back (with null), never hangs [BITE b]', got === null);
}
{
  const env = makeEnv({ clerk: { load: () => Promise.resolve(), user: null }, d1: undefined });
  const got = await Promise.race([resolve(env), new Promise((r) => setTimeout(() => r('NEVER'), 60))]);
  ok('signed OUT -> still calls back (with null), never hangs', got === null);
}
{
  const env = makeEnv({ clerk: { load: () => Promise.reject(new Error('boom')) }, d1: undefined });
  const got = await Promise.race([resolve(env), new Promise((r) => setTimeout(() => r('NEVER'), 60))]);
  ok('Clerk.load() REJECTS -> still calls back (with null), never hangs', got === null);
}
{
  const env = makeEnv({ clerk: { load: () => { throw new Error('sync boom'); } }, d1: undefined });
  const got = await Promise.race([resolve(env), new Promise((r) => setTimeout(() => r('NEVER'), 60))]);
  ok('Clerk.load() THROWS synchronously -> still calls back, never hangs', got === null);
}
{ // exactly ONCE — a double-fire would double-apply the seed
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS) });
  let n = 0;
  await new Promise((res) => { env.call(() => { n++; setTimeout(res, 30); }); });
  ok('done() fires EXACTLY ONCE (a double-fire would double-apply the seed)', n === 1);
}
{ // a throwing consumer must not break the resolver
  const env = makeEnv({ clerk: clerkWith({ dossier: CLERK_DOS }), d1: d1With(D1_DOS) });
  let survived = true;
  try { await new Promise((res) => { env.call(() => { setTimeout(res, 30); throw new Error('consumer blew up'); }); }); }
  catch (e) { survived = false; }
  ok('a THROWING consumer callback cannot break the resolver', survived);
}
{ // no dossier anywhere -> null, not a fabricated object (L47)
  const env = makeEnv({ clerk: clerkWith({}), d1: d1With(null) });
  const got = await resolve(env);
  ok('no dossier in D1 OR Clerk -> null, never a fabricated seed (L47)', got === null);
  ok('and nothing is written to LS when there is nothing to cache', env.store['datumfi.accountDossier.v15'] === undefined);
}

/* ═══ 3 · THE CALLERS — studio.html must go through the helper, not read Clerk itself ═════════════ */
// Assert on LIVE CODE, not prose: the comment that EXPLAINS the new resolution order names
// "unsafeMetadata.dossier" and tripped a raw source scan. A fragment matching only a comment proves
// nothing, and a comment that fails a check is just as false a signal. Strip // lines first.
const studioCode = studio.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
ok('studio.html no longer reads unsafeMetadata.dossier directly (live code)',
  !/_meta\.dossier/.test(studioCode) && !/unsafeMetadata/.test(studioCode));
ok('studio.html calls the shared resolver', studio.includes('window._datumSeedDossier(function (_cd)'));
ok('studio.html still reveals the gated stage on the no-helper path (fail-soft)',
  studio.includes("if (typeof window._datumSeedDossier !== 'function') { _seedGateOff(); return; }"));
ok('studio.html keeps the 1500ms safety net (belt AND suspenders)', studio.includes('setTimeout(_seedGateOff, 1500)'));
ok('FENCE: no Clerk mirror WRITE was retired or altered by this commit (MISS-5 still frozen)',
  navSrc.includes('window.Clerk.user.update({ unsafeMetadata: res.merged })'));

/* ═══ 4 · THE SECOND HOUSE — sketch.html on the SAME seam (pre-work item 2) ═══════════════════════ */
const sketch = readFileSync('sketch.html', 'utf8');
const sketchCode = sketch.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
// Scope this to the DOSSIER read, not to unsafeMetadata wholesale: sketch.html legitimately still WRITES
// the sketchbook_z mirror (9116/9122), and that write must survive — sketchbook_z is the LAST key retired,
// and only after _restoreSketchbookFromD1 exists. A blanket ban would have forbidden the safety net we are
// deliberately keeping, so the gate would have been demanding a regression.
ok('sketch.html no longer reads the Clerk dossier directly (live code)',
  !/_meta\.dossier/.test(sketchCode) && !/\.dossier\b/.test(sketchCode));
ok('FENCE: sketch.html STILL writes the sketchbook_z mirror (retired last, not here)',
  sketch.includes('window.Clerk.user.update({ unsafeMetadata: _res.merged })'));
ok('sketch.html resolves through the SAME shared helper studio.html uses (L48, one seam)',
  sketch.includes('window._datumSeedDossier(function(_cd)'));
ok('sketch.html keeps its OWN apply guards — only resolution is shared',
  sketchCode.includes('if (!window._v15WasAbsent) return;') &&
  sketchCode.includes("sessionStorage.getItem('datumfi_hydrate_from_slot')") &&
  sketchCode.includes('if (window._userTouchedSlider) return;'));
ok('sketch.html applies SLIDERS (its own shape), not the Studio blueprint seed',
  sketchCode.includes('window._applyDossierSliders(_cd);') && !sketchCode.includes('seedFromBlueprint()'));
ok('the LS cache write is no longer duplicated in sketch.html (it lives in the resolver)',
  !sketchCode.includes("localStorage.setItem('datumfi.accountDossier.v15'"));
ok('BOTH houses are converted — zero live Clerk dossier reads remain in either',
  !/\.dossier\b/.test(studioCode) && !/\.dossier\b/.test(sketchCode));

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */
const pass = checks.filter((c) => c[1]).length;
const label = MODE === 'a' ? 'RED-FIRST a (Clerk-first, D1 ignored)'
            : MODE === 'b' ? 'RED-FIRST b (failure paths never call back)' : 'RUN';
console.log('[' + label + '] MISS-5 shared dossier resolver — ' + pass + '/' + checks.length);
for (const [l, c] of checks) if (!c) console.log('   FAIL · ' + l);
if (MODE && pass === checks.length) { console.log('   !! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
if (!MODE && pass !== checks.length) process.exit(1);
