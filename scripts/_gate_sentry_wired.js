/* @gate-pool: browser
 *
 * ══ THE ERROR MONITOR IS WIRED — AND THE CSP IS HALF OF IT ══════════════════════════════════════
 *
 * ⛔⛔ THIS GATE GUARDS THE ONE COMPONENT IN THE ESTATE WHOSE FAILURE LOOKS EXACTLY LIKE ITS SUCCESS.
 * AN ERROR MONITOR THAT REPORTS NOTHING LOOKS EXACTLY LIKE AN APPLICATION WITH NO ERRORS. Every
 * other subject in this suite announces its own breakage — money moves on screen, a disclosure
 * vanishes, a modal does nothing when clicked. Break Sentry and the Studio is pixel-for-pixel
 * identical, the console is clean, and the dashboard is quiet in precisely the way a healthy
 * dashboard is quiet. Nothing downstream will EVER complain on its behalf. That is the entire
 * reason this file exists, and the reason it asserts SIX legs instead of "does the script load".
 *
 * ── ⛔ THE DEFECT IT IS BUILT FROM IS REAL AND IT IS IN GIT — FINDING 17 ────────────────────────
 * Before 2026-08-24, studio.html's `<meta>` CSP `connect-src` read:
 *     'self' api.datumfi.com eu.i.posthog.com api.stripe.com clerk.datumfi.com rentcast-avm...
 * with NO Sentry ingest host. Ship the SDK against that policy and it loads, initialises, and
 * CAPTURES FAITHFULLY — every envelope then dies at the network boundary. We would have been MORE
 * blind than before, because we would have had a reason to stop looking.
 *   🔑 SO `--nocsp` IS NOT A BUG-SHAPED SUBSTITUTE. IT RESTORES THE EXACT SHIPPED POLICY. POISON
 *      WITH THE DEFECT'S OWN CORPSE — it proves these legs would have caught the bug that really
 *      was one commit away, not a bug we invented to be catchable.
 *   🔑 D25 REPEATING ONE LAYER UP: Clerk's bot protection needed the Turnstile allowlist and failed
 *      the same silent way. Same shape, new service.
 *
 * ── ⭐ WHY SOURCE LEGS AND BEHAVIOUR LEGS ARE BOTH HERE, AND NEITHER IS SUFFICIENT ──────────────
 * L1-L5 read the SERVED BYTES. L6-L7 drive a real browser. The split is deliberate and each half
 * covers the other's blind spot:
 *   · A source-only gate passes over a policy that is present in the meta and IGNORED by the browser
 *     (wrong directive, malformed host, a second CSP header narrowing it). §19.2 pointed at the
 *     network layer: the question is what the REQUEST does, so a leg reads what the request does.
 *   · A behaviour-only gate cannot see WHY it failed, and cannot distinguish "the DSN is wrong" from
 *     "the CSP is wrong" — the two failures that look identical from inside the page and that the
 *     whole design was sequenced around. L1 and L2 name the layer; L7 proves the layer works.
 *
 * ── ⛔⛔ THIS GATE MUST NEVER SEND A REAL EVENT TO SENTRY ────────────────────────────────────────
 * 173 gates reference studio.html. If this one delivered its probe envelope, every suite run would
 * post into the production dashboard and BURY THE SIGNAL FROM REAL VISITORS UNDER NOISE FROM A
 * BROWSER NOBODY IS SITTING AT. So L7 INTERCEPTS THE ENVELOPE AND ABORTS IT: the request is proven
 * to have been ISSUED to the right origin, and it never leaves this machine.
 *   ⭐ AND THE ABORT DOES NOT WEAKEN THE CSP CLAIM, WHICH IS THE POINT OF DOING IT THIS WAY. CSP is
 *     enforced BEFORE the request reaches the network stack, so a blocked envelope never becomes an
 *     interceptable request at all — it fires `securitypolicyviolation` instead. The two observables
 *     are therefore mutually exclusive by construction, and L7 asserts BOTH DIRECTIONS: a request
 *     was seen AND no violation fired.
 *
 * ── ⚠️ ANTI-VACUITY ────────────────────────────────────────────────────────────────────────────
 * If the vendored SDK does not load, `window.Sentry` is absent and L6/L7 are describing a page that
 * could not have passed OR failed. That is an ABORT at exit 2, never a green.
 * A GATE THAT CANNOT MEASURE MUST SAY SO, NOT PASS.
 *
 * ── LEGS ───────────────────────────────────────────────────────────────────────────────────────
 *  L1 · studio.html's CSP `connect-src` NAMES the Sentry ingest host
 *  L2 · that ingest host is DERIVED FROM the DSN in datum-sentry.js (the two files agree)
 *  L3 · both Sentry tags are present and `async` — never `defer`, never bare
 *  L4 · the served SDK is byte-identical to the vendored bundle's recorded SRI
 *  L5 · the served SDK PROVES Replay is absent (it carries the stub's own warning text)
 *  L6 · on 127.0.0.1 with NO override, Sentry does NOT initialise (the suite stays out of the dashboard)
 *  L7 · with the override, an envelope is ISSUED to the ingest host and ZERO CSP violations fire
 *
 * ⚠️ L4 AND L5 GENUINELY SHARE A MECHANISM (the served bundle's bytes) AND SAY SO RATHER THAN
 * PRETENDING TO BE INDEPENDENT — forcing artificial independence would be a lie about the contract.
 * They are not redundant: L4's pin is LEGITIMATELY UPDATED on a version bump, and the moment it is,
 * L5 is the only leg left asserting that the NEW bundle still excludes Replay. L4 guards the bytes;
 * L5 guards the CLAIM ABOUT the bytes, and the claim must be re-proven every time the bytes change.
 * ⚠️ L1 AND L7 ALSO SHARE ONE (the CSP), which is why `--nocsp` is declared as reddening L1, L2, L7.
 *
 * ⭐ L1 IS IMPLIED BY L2 AND IS KEPT ANYWAY, BECAUSE THE PAIR IS A DIAGNOSTIC, NOT A BELT AND BRACES.
 * If L2 passes then L1 must pass, so L1 adds no coverage. What it adds is a NAME FOR THE LAYER:
 *     L1 RED + L2 RED  ⇒ the policy has no Sentry host at all — somebody edited the CSP.
 *     L1 GREEN + L2 RED ⇒ the policy has A Sentry host but not THIS one — the DSN moved.
 * Those two failures are indistinguishable from inside the page and were the exact pair this whole
 * feature was sequenced around: a blocked CSP drops events silently, a mis-read DSN MISROUTES them
 * silently. 🔑 A FALSIFIER THAT ONLY SAYS "IT FAILED" COSTS A DEBUGGING SESSION; ONE THAT NAMES THE
 * LAYER TURNS THE FAILURE INTO THE ANSWER.
 *
 * ── RED-FIRST ──────────────────────────────────────────────────────────────────────────────────
 *   node scripts/_gate_sentry_wired.js --nocsp         restores the SHIPPED pre-fix CSP   -> L1, L7
 *   node scripts/_gate_sentry_wired.js --dsnskew       mutates the DSN's org id           -> L2
 *   node scripts/_gate_sentry_wired.js --defer         async -> defer on both tags        -> L3
 *   node scripts/_gate_sentry_wired.js --replaybundle  strips the replay-stub evidence    -> L4, L5
 *   node scripts/_gate_sentry_wired.js --nogate        init runs on every hostname        -> L6
 *   node scripts/_gate_sentry_wired.js --noinit        removes the Sentry.init() call     -> L7
 *   node scripts/_gate_sentry_wired.js --declare-controls
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8437;          /* claimed 2026-08-24. ⛔ NEVER 8001 — that is the suite's shared server. */

const HOST_PAGE = 'studio.html';
const INIT_FILE = 'scripts/datum-sentry.js';
const SDK_FILE = 'scripts/sentry-10.71.0.min.js';

/* The recorded identity of the vendored bundle, from the moment it was fetched from
   browser.sentry-cdn.com and committed. ⛔ CHANGING THIS IS A DELIBERATE ACT: it is the only line
   that has to move for an SDK upgrade, and moving it means re-reading L5's claim against the new
   bundle rather than assuming it carried over. */
const SDK_SRI = 'sha384-Z0GeEnLeg0yvo3LU6sdGDESgTZCwpVvZBIgcnddmSR+ovRPe8Esn+19CrZdcxC4Z';

/* ⭐ POSITIVE EVIDENCE THAT REPLAY IS ABSENT, TAKEN FROM THE ARTEFACT ITSELF. In the errors-only
   bundle `replayIntegration()` is a stub that warns with this sentence; the tracing+replay bundle
   has no such stub because it has the real thing. EXCLUSION NEEDS PRESENCE — "does not contain
   replay code" is unfalsifiable by grep, so we assert the presence of the marker that only a
   replay-LESS bundle can carry.
   ⛔ COPIED FROM THE ARTEFACT, NOT FROM OUR OWN PROSE — AND THAT DISTINCTION COST A RED. The first
   version of this constant read "...does not include Replay" (capital R), which is how the sentence
   is PARAPHRASED in datum-sentry.js's header; the bundle says `replay.` lowercase. L5 went red on
   the clean run and the marker was wrong, not the bundle.
   🔑 A LITERAL WRITTEN FROM MEMORY OF YOUR OWN DESCRIPTION IS A GUESS WEARING A QUOTATION MARK. */
const REPLAY_STUB_MARK = 'this bundle does not include replay.';

const argv = process.argv.slice(2);
const NOCSP = argv.includes('--nocsp');
const DSNSKEW = argv.includes('--dsnskew');
const DEFER = argv.includes('--defer');
const REPLAYBUNDLE = argv.includes('--replaybundle');
const NOGATE = argv.includes('--nogate');
const NOINIT = argv.includes('--noinit');
const ANY_POISON = NOCSP || DSNSKEW || DEFER || REPLAYBUNDLE || NOGATE || NOINIT;

/* ── THE ANCHORS. Each must match EXACTLY ONCE in the served body or the run ABORTS. ───────────── */
const CSP_SHIPPED_PREFIX = "connect-src 'self' https://api.datumfi.com https://eu.i.posthog.com https://api.stripe.com https://clerk.datumfi.com https://rentcast-avm.dmerced1.workers.dev";
const CSP_FIXED = CSP_SHIPPED_PREFIX + ' https://o4511758659223552.ingest.us.sentry.io;';
const CSP_BROKEN = CSP_SHIPPED_PREFIX + ';';   /* ⛔ THE LITERAL BYTES THAT SHIPPED BEFORE THIS COMMIT. */

const TAG_SDK_FIXED = '<script async id="datum-sentry-sdk" src="/scripts/sentry-10.71.0.min.js"></script>';
const TAG_SDK_DEFER = '<script defer id="datum-sentry-sdk" src="/scripts/sentry-10.71.0.min.js"></script>';
const TAG_INIT_FIXED = '<script async src="/scripts/datum-sentry.js"></script>';
const TAG_INIT_DEFER = '<script defer src="/scripts/datum-sentry.js"></script>';

/* ⛔ ANCHORED ON THE DSN-SHAPED FORM (`@host/projectid`), NOT THE BARE HOST — AND THAT WAS A RED,
   NOT A PRECAUTION. The bare host appears TWICE in datum-sentry.js: once in the DSN and once in the
   header comment that tells the reader which host connect-src must name. `--dsnskew` aborted with
   "anchor matched 2 times", which is the landing guard doing its job: a poison that lands in a
   COMMENT changes nothing and would have produced a GREEN control run proving nothing.
   🔑 MY OWN EXPLANATORY COMMENT CREATED THE SECOND MATCH. A comment is inert to the browser and
      load-bearing to every matcher pointed at the file. */
const DSN_ORG_FIXED = '@o4511758659223552.ingest.us.sentry.io/4511966289526784';
const DSN_ORG_SKEW = '@o4511758659223553.ingest.us.sentry.io/4511966289526784';   /* ONE DIGIT — the shape a transcription error really takes */

const GATE_FIXED = 'if (!isProd && !localOverride()) return;';
const GATE_BROKEN = 'if (false) return;';

const INIT_CALL_FIXED = '    S.init({';
const INIT_CALL_BROKEN = '    if (true) return; S.init({';

const CONTROLS = {
  /* ⭐ THE CORPSE CONTROL. Not a bug-shaped substitute — the exact bytes that were live in git until
     this commit. It reproduces FINDING 17 verbatim: the SDK loads, initialises, captures, and the
     envelope dies at the network boundary with nothing on screen. */
  '--nocsp': {
    what: 'restores the SHIPPED pre-fix connect-src, with no Sentry ingest host',
    anchors: [{ file: HOST_PAGE, literal: CSP_FIXED, count: 1 }],
    reds: ['L1', 'L2', 'L7'],
    /* ⚠️ DECLARED AS THREE AFTER MEASUREMENT CORRECTED A DECLARATION OF TWO. The first run of this
       control reddened L2 as well, and L2 was RIGHT to go red: it asserts the two files describe ONE
       host, and a connect-src with no Sentry host in it does not describe the DSN's host either.
       🔑 THE CONTROL DID NOT MISBEHAVE — MY DECLARATION OF IT WAS WRONG, AND THE ONLY REASON I KNOW
          THAT IS THAT THE DECLARATION WAS WRITTEN DOWN AND COMPARED. An undeclared control cannot
          be caught being mis-described. */
    note: 'L1 ⊂ L2 by construction; both are kept because their DIFFERENCE names the failing layer',
    expect: 'red'
  },
  '--dsnskew': {
    what: "changes ONE DIGIT of the DSN's org id, so the DSN and the CSP no longer describe one host",
    anchors: [{ file: INIT_FILE, literal: DSN_ORG_FIXED, count: 1 }],
    reds: ['L2', 'L7'],
    /* ⭐⭐ THIS CONTROL IS WHERE THE L1/L2 DIAGNOSTIC PROVED ITSELF, AND IT WAS MEASURED, NOT ARGUED.
       Run it and L1 stays GREEN while L2 goes RED: the policy DOES name a Sentry host, just not the
       one the DSN points at. Compare `--nocsp`, where BOTH go red because the policy names none.
       That is the two-failure pair this feature was sequenced around, told apart by two legs.
       ⚠️ L7 reds too, and the reason is worth reading: the SDK cheerfully posts to the skewed host,
       the CSP refuses it, and the violation names the WRONG host — so even the end-to-end leg
       reports the mis-read DSN as a CSP problem. A behaviour leg alone WOULD HAVE BLAMED THE WRONG
       LAYER, which is precisely why the source legs exist above it. */
    expect: 'red'
  },
  '--defer': {
    what: 'flips both tags async -> defer, which delays DOMContentLoaded and buys blank-stage time',
    anchors: [{ file: HOST_PAGE, literal: TAG_SDK_FIXED, count: 1 }, { file: HOST_PAGE, literal: TAG_INIT_FIXED, count: 1 }],
    reds: ['L3'],
    expect: 'red'
  },
  /* ⭐ THE STRUCTURAL-EXCLUSION CONTROL. It removes the ONE piece of positive evidence that this
     bundle lacks Replay, which is exactly what swapping in bundle.tracing.replay.min.js would do. */
  '--replaybundle': {
    what: "strips the replay-stub warning from the served SDK — what a swap to the replay bundle does",
    anchors: [{ file: SDK_FILE, literal: REPLAY_STUB_MARK, count: 1 }],
    reds: ['L4', 'L5'],
    note: 'L4 and L5 both read the served bundle bytes; declared together because they genuinely do',
    expect: 'red'
  },
  '--nogate': {
    what: 'neuters the hostname gate so init runs on every origin, including the harness',
    anchors: [{ file: INIT_FILE, literal: GATE_FIXED, count: 1 }],
    reds: ['L6'],
    expect: 'red'
  },
  /* ⭐ THE AMPUTATION TEST, EXECUTABLE. With init removed the page is serene: no error, no console
     noise, no visual change — and L1-L6 all stay GREEN over a monitor that captures nothing.
     🔑 A COMMENT CLAIMING "THE OTHER LEGS WOULD PASS WITHOUT THIS ONE" IS A PREDICTION. THIS RUNS IT. */
  '--noinit': {
    what: 'removes the Sentry.init() call — the SDK loads and nothing is ever configured or sent',
    anchors: [{ file: INIT_FILE, literal: INIT_CALL_FIXED, count: 1 }],
    reds: ['L7'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_sentry_wired.js', controls: CONTROLS }));
  process.exit(0);
}

/* ── POISON, WITH A LANDING GUARD. A poison that silently fails to apply produces a GREEN run that
 *    proves nothing, so each anchor must match exactly once or the run ABORTS. */
const landed = [];
function swapOnce(body, from, to, tag, flagName) {
  const n = body.split(from).length - 1;
  if (n !== 1) { console.log(`ABORT: ${flagName} anchor matched ${n} times, expected 1 — re-ground it.`); process.exit(1); }
  landed.push(tag);
  return body.split(from).join(to);
}
function poison(rel, body) {
  if (!ANY_POISON) return body;
  if (NOCSP && rel === HOST_PAGE) body = swapOnce(body, CSP_FIXED, CSP_BROKEN, 'csp-stripped', '--nocsp');
  if (DEFER && rel === HOST_PAGE) {
    body = swapOnce(body, TAG_SDK_FIXED, TAG_SDK_DEFER, 'sdk-tag-defer', '--defer');
    body = swapOnce(body, TAG_INIT_FIXED, TAG_INIT_DEFER, 'init-tag-defer', '--defer');
  }
  if (DSNSKEW && rel === INIT_FILE) body = swapOnce(body, DSN_ORG_FIXED, DSN_ORG_SKEW, 'dsn-org-skewed', '--dsnskew');
  if (NOGATE && rel === INIT_FILE) body = swapOnce(body, GATE_FIXED, GATE_BROKEN, 'hostname-gate-neutered', '--nogate');
  if (NOINIT && rel === INIT_FILE) body = swapOnce(body, INIT_CALL_FIXED, INIT_CALL_BROKEN, 'init-call-removed', '--noinit');
  if (REPLAYBUNDLE && rel === SDK_FILE) body = swapOnce(body, REPLAY_STUB_MARK, 'this bundle DOES include replay.', 'replay-evidence-stripped', '--replaybundle');
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

/* Everything the browser is served also lands here, so the source legs read THE SAME BYTES THE
   BROWSER READ rather than re-reading the disk. A gate that asserts one copy and drives another has
   two subjects and one name for them. */
const served = {};

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) { const t = poison(rel, out.toString('utf8')); served[rel] = t; out = Buffer.from(t, 'utf8'); }
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* One arm of the behaviour run. `withOverride` decides whether this origin is allowed to report —
   which is the whole subject of L6. */
async function runArm(chromium, withOverride) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const envelopes = [];
  const violations = [];

  /* ⛔ THE ENVELOPE NEVER LEAVES THIS MACHINE. Recorded, then aborted. */
  await page.route('**://*.sentry.io/**', (route) => {
    envelopes.push(route.request().url());
    route.abort();
  });

  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations.push({ directive: e.violatedDirective, uri: e.blockedURI });
    });
  });

  if (withOverride) {
    await ctx.addInitScript(() => { try { localStorage.setItem('datum_sentry_local', '1'); } catch (e) {} });
  }

  await page.goto(`http://127.0.0.1:${PORT}/${HOST_PAGE}`, { waitUntil: 'load' });

  /* The SDK is async: give it a bounded chance to arrive rather than a fixed sleep.
     ⚠️ A FIXED SLEEP IS THE FLAKE SPECIES THIS SUITE HAS ALREADY NAMED — wait on the CONDITION. */
  const sdkPresent = await page.waitForFunction(
    () => !!(window.Sentry && typeof window.Sentry.init === 'function'), null, { timeout: 15000 }
  ).then(() => true).catch(() => false);

  /* Did init actually run? `getClient()` returns a client only after a successful init. */
  const inited = await page.evaluate(() => {
    try { return !!(window.Sentry && typeof window.Sentry.getClient === 'function' && window.Sentry.getClient()); }
    catch (e) { return false; }
  });

  let probe = null;
  if (withOverride) {
    probe = await page.evaluate(() => {
      try { return typeof window.datumSentryTestError === 'function' ? window.datumSentryTestError('gate') : 'no-fn'; }
      catch (e) { return 'threw:' + e.message; }
    });
    /* Let the transport flush; the route handler records it the moment it is issued. */
    await page.waitForTimeout(2500);
  }

  violations.push(...await page.evaluate(() => window.__cspViolations || []));
  await browser.close();
  return { sdkPresent, inited, probe, envelopes, violations };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

  console.log('[RUN] THE ERROR MONITOR IS WIRED  (CSP + DSN + tags + bundle + gating + a real envelope)');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const plain = await runArm(chromium, false);
  const over = await runArm(chromium, true);

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served bytes'); process.exit(1); }
  if (ANY_POISON) console.log(`   poison landed: ${[...new Set(landed)].join(', ')}  (${landed.length} serves)`);

  /* ── ANTI-VACUITY. No SDK on the page means L6 and L7 describe something that could not have
   *    passed or failed, and the source legs alone would print a confident GREEN over a dead
   *    monitor. NOT a pass, NOT a red. */
  if (!over.sdkPresent) {
    console.log('ABORT: window.Sentry never appeared on the override arm — the vendored SDK did not load.');
    console.log('       Every behaviour leg below would be describing a page with no monitor at all,');
    console.log('       and the source legs would print GREEN over it. NOT a pass, NOT a red.');
    server.close();
    process.exit(2);
  }
  const page = served[HOST_PAGE] || '';
  const initSrc = served[INIT_FILE] || '';
  const sdkSrc = served[SDK_FILE] || '';
  if (!page || !initSrc || !sdkSrc) {
    console.log(`ABORT: the browser did not fetch all three subjects (page=${!!page} init=${!!initSrc} sdk=${!!sdkSrc}).`);
    server.close();
    process.exit(2);
  }

  /* ── L1 · the policy names the ingest host ─────────────────────────────────────────────────── */
  const cspLine = (page.match(/content="([^"]*connect-src[^"]*)"/) || [])[1] || '';
  const connectSrc = (cspLine.match(/connect-src([^;]*)/) || [])[1] || '';
  ok('L1', "studio.html's CSP connect-src names the Sentry ingest host",
    connectSrc.indexOf('ingest.us.sentry.io') !== -1,
    `connect-src =${connectSrc.trim() || '(absent)'}`);

  /* ── L2 · and it is the host the DSN actually points at ────────────────────────────────────── */
  const dsn = (initSrc.match(/var DSN = '([^']+)'/) || [])[1] || '';
  const dsnHost = (dsn.match(/@([^/]+)\//) || [])[1] || '';
  ok('L2', 'the allowed ingest host is DERIVED FROM the DSN — the two files describe ONE host',
    !!dsnHost && connectSrc.indexOf('https://' + dsnHost) !== -1,
    `dsn host=${dsnHost || '(unparsed)'} · present in connect-src=${!!dsnHost && connectSrc.indexOf('https://' + dsnHost) !== -1}`);

  /* ── L3 · async, never defer ───────────────────────────────────────────────────────────────── */
  const sdkTag = (page.match(/<script[^>]*id="datum-sentry-sdk"[^>]*>/) || [])[0] || '';
  const initTag = (page.match(/<script[^>]*src="\/scripts\/datum-sentry\.js"[^>]*>/) || [])[0] || '';
  const bothAsync = /\basync\b/.test(sdkTag) && !/\bdefer\b/.test(sdkTag)
                 && /\basync\b/.test(initTag) && !/\bdefer\b/.test(initTag);
  ok('L3', 'both Sentry tags are present and `async` — never `defer` (defer delays DCL = blank stage)',
    !!sdkTag && !!initTag && bothAsync,
    `sdk=${sdkTag || '(absent)'} init=${initTag || '(absent)'}`);

  /* ── L4 · the served bundle is the bundle we vetted ────────────────────────────────────────── */
  const sdkSri = 'sha384-' + crypto.createHash('sha384').update(Buffer.from(sdkSrc, 'utf8')).digest('base64');
  ok('L4', 'the served SDK is byte-identical to the vendored bundle we recorded',
    sdkSri === SDK_SRI, `served=${sdkSri}`);

  /* ── L5 · and it still proves Replay is absent ─────────────────────────────────────────────── */
  ok('L5', 'the served SDK carries the replay-STUB marker — positive evidence Replay is NOT in it',
    sdkSrc.indexOf(REPLAY_STUB_MARK) !== -1,
    `stub marker present=${sdkSrc.indexOf(REPLAY_STUB_MARK) !== -1}`);

  /* ── L6 · the harness is not a visitor ─────────────────────────────────────────────────────── */
  ok('L6', 'on 127.0.0.1 with NO override, Sentry does NOT initialise (the suite stays out of the dashboard)',
    plain.inited === false,
    `no-override arm: sdkLoaded=${plain.sdkPresent} inited=${plain.inited}`);

  /* ── L7 · a real envelope reaches the network, and the CSP does not eat it ───────────────────
     ⛔⛔ AND THE PROBE'S OWN RETURN VALUE IS NOT ADMISSIBLE AS EVIDENCE — MEASURED, NOT ASSUMED.
     Under `--noinit` the run printed `probe=2e822a2b19a54ce7b599d279fb212f1f`: a perfectly
     well-formed event id, from a page with NO CLIENT, that sent NOTHING. `captureException()`
     mints an id before it ever looks for a transport, so "it returned an id" is the instrument
     reporting on itself and it reports success either way.
     🔑 THAT IS WHY THIS LEG READS THE NETWORK AND THE VIOLATION LIST, NEVER THE PROBE'S ANSWER.
        The probe is printed for the human; `inited && hitIngest && !cspAte` is the assertion. */
  const hitIngest = over.envelopes.some((u) => u.indexOf('ingest.us.sentry.io') !== -1);
  const cspAte = over.violations.some((v) => String(v.uri || '').indexOf('sentry.io') !== -1
                                          || String(v.directive || '').indexOf('connect-src') !== -1);
  ok('L7', 'with the override, an envelope is ISSUED to the ingest host and NO CSP violation fires',
    over.inited === true && hitIngest && !cspAte,
    `inited=${over.inited} probe=${over.probe} envelopes=${over.envelopes.length} toIngest=${hitIngest} cspViolations=${JSON.stringify(over.violations)}`);

  const total = pass + fail;
  if (ANY_POISON) {
    const flag = NOCSP ? '--nocsp' : DSNSKEW ? '--dsnskew' : DEFER ? '--defer'
               : REPLAYBUNDLE ? '--replaybundle' : NOGATE ? '--nogate' : '--noinit';
    const expected = CONTROLS[flag].reds;
    const actualRed = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actualRed.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);

  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.message) || e));
  console.log('SCORE 0/7 RED');
  process.exit(1);
});
