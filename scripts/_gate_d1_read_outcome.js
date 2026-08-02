'use strict';
/* D1 READ-OUTCOME DIAGNOSTIC — an outage must be distinguishable from "you have nothing saved".
 *
 * WHY THIS EXISTS. getDoc resolves null for FOUR reasons (signed-out, 404-empty, bad status,
 * network/timeout), so at every call site a real outage looks exactly like an empty account.
 * studio.html's D1 .catch is unreachable for the same reason — getDoc never rejects.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ───────────────────
 * A SIGNED-IN user whose device asks D1 for a document, under each of the four answers D1 can give.
 * Driven through the module's injectable seam (API._fetch), which is how the D1 gates already reach
 * it — the network itself is not reachable honestly in a harness, so the MAPPING from answer to
 * outcome is asserted through a declared seam and this comment says so rather than faking a server.
 *
 * ⚠️ THE LOAD-BEARING ASSERTIONS ARE THE ONES ABOUT BEHAVIOUR, NOT ABOUT THE WORDS. This is a
 * DIAGNOSTIC: the Captain's fence keeps the UI quiet, so if it ever changes a return value, throws,
 * or turns a silent fallback into a visible one, it has broken the thing it was meant to observe.
 * Every case therefore asserts getDoc STILL RESOLVES null (or the doc) exactly as before.
 *
 * Usage: node scripts/_gate_d1_read_outcome.js [--nodiag]
 *   --nodiag  strips the diagnostic -> the four outcomes become indistinguishable and this reds.
 */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const NODIAG = process.argv.includes('--nodiag');

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

let src = fs.readFileSync(path.join(ROOT, 'scripts/datum-d1.js'), 'utf8');
if (NODIAG) {
  const A = "      if (outcome === 'UNREACHABLE') {";
  const n = src.split(A).length - 1;
  if (n !== 1) { console.error(`anchor: expected 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
  src = src.replace(A, '      if (false) {');
}

/* One sandboxed module per case, so a stateful client cannot leak between them. */
function load(fetchImpl, signedInUser) {
  const logs = [];
  const rec = (lvl) => function () { logs.push(lvl + ' ' + Array.prototype.join.call(arguments, ' ')); };
  const sandbox = {
    console: { warn: rec('warn'), debug: rec('debug'), log: rec('log'), error: rec('error') },
    setTimeout, clearTimeout, Promise, TextEncoder,
    AbortController: typeof AbortController !== 'undefined' ? AbortController : undefined
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  if (signedInUser) sandbox.Clerk = { user: { id: 'u1' }, session: { getToken: () => Promise.resolve('tok:x') } };
  else sandbox.Clerk = null;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const API = sandbox.DatumD1;
  API._fetch = fetchImpl;
  return { API, logs };
}
const warns = (logs) => logs.filter((l) => l.indexOf('warn') === 0);
const debugs = (logs) => logs.filter((l) => l.indexOf('debug') === 0);

(async () => {
  /* ── 1. NOTHING SAVED (404). The one honest "empty". Must NOT warn. ─────────────────────────── */
  {
    const { API, logs } = load(() => Promise.resolve({ status: 404, json: () => Promise.resolve({}) }), true);
    const r = await API.getDoc('studio', 'active');
    ok(r === null, 'EMPTY: a 404 still resolves null — behaviour unchanged');
    ok(warns(logs).length === 0, `EMPTY: "nothing saved" does NOT warn (${warns(logs).length} warnings) — a warning has to mean something`);
    ok(debugs(logs).some((l) => / empty/.test(l)), 'EMPTY: the outcome is stated as "empty" at debug level');
  }

  /* ── 2. THE SERVER ANSWERED BADLY — an outage wearing an empty account's face. ──────────────── */
  {
    const { API, logs } = load(() => Promise.resolve({ status: 500, json: () => Promise.resolve({}) }), true);
    const r = await API.getDoc('studio', 'active');
    ok(r === null, 'OUTAGE(500): still resolves null — the LS/Clerk fallback is untouched');
    ok(warns(logs).some((l) => /OUTAGE, not an empty account/.test(l)),
       'OUTAGE(500): warns, and says IN WORDS that this is not an empty account');
  }

  /* ── 3. NEVER REACHED IT — network failure. ─────────────────────────────────────────────────── */
  {
    const { API, logs } = load(() => Promise.reject(new Error('boom')), true);
    const r = await API.getDoc('studio', 'active');
    ok(r === null, 'OUTAGE(network): still resolves null');
    ok(warns(logs).some((l) => /network error/.test(l)), 'OUTAGE(network): names the cause as a network error');
  }

  /* ── 4. SIGNED OUT — ordinary, and NOT an outage. The negative control for case 5. ──────────── */
  {
    const { API, logs } = load(() => Promise.resolve({ status: 200, json: () => Promise.resolve({}) }), false);
    const r = await API.getDoc('studio', 'active');
    ok(r === null, 'SIGNED-OUT: resolves null without ever calling the network');
    ok(warns(logs).length === 0, 'SIGNED-OUT: does NOT warn — nobody is signed in, so nothing is unreachable');
  }

  /* ── 5. SIGNED IN BUT NO TOKEN — this one IS an outage, and case 4 proves the split is real. ── */
  {
    const logs = [];
    const rec = (lvl) => function () { logs.push(lvl + ' ' + Array.prototype.join.call(arguments, ' ')); };
    const sandbox = { console: { warn: rec('warn'), debug: rec('debug'), log: rec('log'), error: rec('error') },
      setTimeout, clearTimeout, Promise, TextEncoder, AbortController };
    sandbox.window = sandbox; sandbox.global = sandbox;
    sandbox.Clerk = { user: { id: 'u1' }, session: { getToken: () => Promise.resolve(null) } };
    vm.createContext(sandbox); vm.runInContext(src, sandbox);
    const r = await sandbox.DatumD1.getDoc('studio', 'active');
    ok(r === null, 'NO-TOKEN: resolves null');
    ok(warns(logs).some((l) => /no token for a signed-in user/.test(l)),
       'NO-TOKEN: a signed-IN user with no token warns — distinguishing it from the signed-OUT case above');
  }

  /* ── 6. THE HAPPY PATH still returns the document. If this breaks, everything above is noise. ─ */
  {
    const doc = { payload: '{"a":1}', revision: 3, updated_at: 'now' };
    const { API, logs } = load(() => Promise.resolve({ status: 200, json: () => Promise.resolve(doc) }), true);
    const r = await API.getDoc('studio', 'active');
    ok(r && r.revision === 3, 'POSITIVE CONTROL: a real 200 still returns the document unchanged');
    ok(warns(logs).length === 0, 'POSITIVE CONTROL: a successful read does not warn');
  }

  lines.forEach((l) => console.log(l));
  const red = fail > 0;
  console.log(`\n${NODIAG ? 'MUTATED[nodiag]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (NODIAG) console.log(red ? 'RED-FIRST OK — the mutation BIT.' : '⚠️ RED-FIRST DEAD — the mutation changed nothing.');
  process.exit(NODIAG ? (red ? 0 : 1) : (red ? 1 : 0));
})();
