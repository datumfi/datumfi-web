/* @gate-pool: browser
 *
 * ══ START FROM SCRATCH CLEARS THE DECLARED POPULATION ══════════════════════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS BECAUSE THE ONE CONTROL WHOSE ONLY JOB IS TO CLEAR DID NOT CLEAR.
 * Captain-reproduced 2026-09-15: full profile · open the overlay · press START FROM SCRATCH ·
 * BOTH dates of birth, BOTH target retirement dates, BOTH salaries and the retirement location
 * were still on the screen. Exactly one field of about nine had gone: the plan-through date.
 *
 * ── THE MECHANISM, MEASURED IN FOUR ARMS (2026-09-15) ─────────────────────────────────────────
 * `_scratchReset()` was never the defect — it cleared the local prefill sources correctly and
 * always had. The page then RELOADS, and on that reload a signed-in user's ACCOUNT DOSSIER is
 * fetched and `applyDossierProfile` re-fills the profile the user just asked to throw away:
 *     signed OUT ................................. 0 of 16 surfaces came back
 *     signed in, NO cached dossier ............... 0 of 16
 *     signed in, dossier stamped to ANOTHER user . 0 of 9 profile fields
 *     signed in + OWN cached dossier ............. 14 of 16 CAME BACK
 * ⭐ THE TWO THAT CLEARED WERE `plan-end-age` AND `filing-status` — THE ONLY TWO FIELDS
 *    `applyDossierProfile` DOES NOT WRITE. The negatives matched as well as the positives, which
 *    is what makes this the mechanism rather than something correlated with it.
 * ⭐ AND THE SOURCE NAMED ITSELF. The fixture's dossier carries a co-architect salary of 111000
 *    while the page is filled with 111500; the field came back reading 111,000. 🔑 SEED THE
 *    FIXTURE WITH A DISAGREEING VALUE AND THE SURVIVOR NAMES ITS OWN SOURCE. That is also the
 *    whole explanation of the Captain's separate "the salary disagrees across two surfaces"
 *    report — one mechanism, not a second defect.
 *
 * ⚠️ IT IS NOT A CROSS-USER LEAK AND THIS GATE MUST NOT BE DESCRIBED AS PREVENTING ONE.
 * `DatumSession.cachedDossier()` checks the owner stamp, and the third arm above IS the
 * measurement of that claim: somebody else's dossier re-filled nothing. What this was is the
 * user's own data, on the user's own screen, after they asked for a blank page.
 *
 * ── WHY THREE LEGS, AND WHY NO TWO ARE SUFFICIENT ─────────────────────────────────────────────
 * ⛔ L1 ALONE IS SATISFIED BY BREAKING THE SEED ENTIRELY. If the dossier never seeded anybody,
 *    "the fields are empty after scratch" would be GREEN over a product that had stopped
 *    prefilling for every returning user — a far worse regression than the one being fixed. L3 is
 *    the PRESENCE half: the same fixture, no scratch click, and the profile MUST be seeded.
 *    Only L1 ∧ L3 says "scratch clears AND the seed still works." `--killseed` runs that.
 * ⛔ L1 IS ALSO SATISFIED BY SHRINKING THE LIST IT QUANTIFIES OVER. L1 reads the product's own
 *    `window.DATUM_SCRATCH_FIELDS`, so deleting an id from that array removes the field from the
 *    assertion and L1 goes green having checked less — A PREDICATE OVER AN EMPTY SET IS TRUE. L2
 *    is the independent enumeration below: the gate keeps its OWN list and requires the product's
 *    to cover it. `--droplist` runs that.
 * 🔑 So the contract is the CONJUNCTION: everything declared is cleared, the declaration is
 *    complete, and the seed that was suppressed still works when it should.
 *
 * ⚠️ THE FIXTURE MUST BE SIGNED IN WITH AN OWNED DOSSIER OR THIS GATE IS VACUOUS. Signed out, the
 * defect cannot occur at all (arm 1 above), so every leg passes over a page that never ran it.
 * A FIXTURE WITH NOTHING IN IT PROVES NOTHING ABOUT A DEFECT THAT ONLY TOUCHES SOMETHING.
 *
 * ⚠️ THE REAL CLERK SDK MUST BE STUBBED AT THE ROUTE, NOT ONLY ON `window`. Measured while
 * building this gate: an `addInitScript` stub is OVERWRITTEN when clerk.browser.js loads, the
 * session then resolves false, the dossier is never read, and the whole gate goes GREEN over a
 * path that never executed. That is the empty-green species, and it cost the first run of this
 * file. The route fulfil below is what makes the signed-in arm real.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8489;          /* claimed 2026-09-15. ⛔ NEVER 8001 — that is the suite's shared server. */
const PART = 'studio.html';

const USER_ID = 'user_gate_scratch';
/* ⛔ THE CO-ARCHITECT SALARY DISAGREES WITH THE PAGE ON PURPOSE (111000 vs 111500 typed). A field
 * that comes back reading 111,000 has NAMED the dossier as its source; a matching value would only
 * have been consistent with it. Do not "tidy" these into agreement. */
const DOSSIER = {
  primary:   { dateOfBirth: '08/1982', grossIncome: 61000, targetRetirementDate: '03/2035' },
  defaults:  {},
  household: { location: 'Florida',
               coArchitect: { dateOfBirth: '05/1980', grossIncome: 111000, targetRetirementDate: '03/2035' } }
};

const TYPED = {
  'pri-dob': '08/1982', 'co-dob': '05/1980', 'target-ret': '03/2035', 'co-ret': '03/2035',
  'plan-end-age': '03/2075', 'pri-salary': '$61,000', 'co-salary': '$111,500'
};
const TYPED_SELECTS = { 'filing-status': 'Married Filing Jointly', 'pri-location': 'Florida' };

/* ⛔⛔ L2's INDEPENDENT ENUMERATION — THE GATE'S OWN LIST, NOT THE PRODUCT'S.
 * This exists so that deleting an id from `window.DATUM_SCRATCH_FIELDS` cannot quietly shrink what
 * L1 checks. It is duplication ON PURPOSE and is the one place in this file where L48
 * reuse-don't-fork is deliberately NOT applied: an instrument that derives its expectations from
 * its subject cannot detect the subject losing one.
 * ⚠️ A NEW PROFILE FIELD MEANS EDITING BOTH THIS ARRAY AND THE PRODUCT'S. That is the cost, and it
 *    is the point — the edit is meant to be visible in two places. */
const MUST_DECLARE = [
  'pri-dob', 'co-dob', 'target-ret', 'co-ret', 'plan-end-age', 'co-plan-end',
  'pri-salary', 'co-salary', 'filing-status', 'pri-location'
];

/* ── THE POISON ANCHORS — each is a literal that must match exactly once in the served bytes. */
const GUARD_ASYNC = 'if (_scratchSeedBoot) { _seedGateOff(); return; }';
const GUARD_SYNC  = '        if (_scratchSeedBoot) return;\n        DatumSession.resolved(function (signedIn) {';
const GUARD_SYNC_OFF = '        DatumSession.resolved(function (signedIn) {';
const LIST_HEAD   = "      'pri-dob', 'co-dob', 'target-ret', 'co-ret', 'plan-end-age', 'co-plan-end',";
const LIST_SHORT  = "      'co-dob', 'target-ret', 'co-ret', 'plan-end-age', 'co-plan-end',";
/* ⛔ --killseed AMPUTATES THE FUNCTION, NOT A CALL SITE, AND THE FIRST VERSION OF THIS CONTROL
 * TAUGHT US WHY. It poisoned `if (_prof) applyDossierProfile(_prof);` — ONE of the two routes —
 * and L3 STAYED GREEN, because the other route seeded the profile anyway. A control that removes
 * one of two redundant paths does not remove the capability, so it never reached the leg it was
 * written to falsify and reported a clean GREEN while doing nothing.
 *   🔑 THE SAME TWO-DOOR SHAPE THE FIX ITSELF HAD TO LEARN, MET A SECOND TIME IN THE INSTRUMENT.
 *      AMPUTATE THE CAPABILITY, NOT ONE OF ITS ENTRANCES. */
const SEED_CALL   = 'function applyDossierProfile(p) {\n      if (!p) return;';
const SEED_DEAD   = 'function applyDossierProfile(p) {\n      if (true) return;';

const argv = process.argv.slice(2);
const UNGUARD_ASYNC = argv.includes('--unguard-async');
const UNGUARD_SYNC  = argv.includes('--unguard-sync');
const DROPLIST      = argv.includes('--droplist');
const KILLSEED      = argv.includes('--killseed');
const ANY_POISON = UNGUARD_ASYNC || UNGUARD_SYNC || DROPLIST || KILLSEED;

const CONTROLS = {
  '--unguard-async': {
    what: 'removes the scratch-boot guard on the ASYNC D1/Clerk dossier seed',
    anchors: [{ file: PART, literal: GUARD_ASYNC, count: 1 }],
    reds: ['L1'], expect: 'red'
  },
  /* ⭐ THIS CONTROL IS THE ONE THAT ALREADY EARNED ITS KEEP. Guarding only the async door left the
   * co-architect salary STILL returning as the dossier's 111,000 — 13 of 16 surfaces instead of 14.
   * Two independent routes reach applyDossierProfile, and a guard on one is a guard on neither. */
  '--unguard-sync': {
    what: 'removes the scratch-boot guard on the SYNCHRONOUS owner-checked cache seed',
    anchors: [{ file: PART, literal: GUARD_SYNC, count: 1 }],
    reds: ['L1'], expect: 'red'
  },
  '--droplist': {
    what: "deletes 'pri-dob' from the product's DATUM_SCRATCH_FIELDS declaration",
    anchors: [{ file: PART, literal: LIST_HEAD, count: 1 }],
    reds: ['L2'], expect: 'red'
  },
  /* ⭐ THE AMPUTATION TEST MADE EXECUTABLE. Killing the seed outright makes L1 green for the worst
   * possible reason — nobody is prefilled ever again — and L3 is what refuses to accept it. */
  '--killseed': {
    what: 'removes the cached-dossier profile apply entirely — nobody is ever seeded',
    anchors: [{ file: PART, literal: SEED_CALL, count: 1 }],
    reds: ['L3'], expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_scratch_clears_declared.js', controls: CONTROLS }));
  process.exit(0);
}

/* A poison that silently fails to apply produces a GREEN run that proves nothing, so each anchor
 * must match exactly once or the run ABORTS. */
function swapOnce(body, flagName, from, to, rel) {
  const n = body.split(from).length - 1;
  if (n !== 1) { console.log(`ABORT: ${flagName} anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
  return body.split(from).join(to);
}
function poison(rel, body) {
  if (!ANY_POISON || rel !== PART) return body;
  if (UNGUARD_ASYNC) body = swapOnce(body, '--unguard-async', GUARD_ASYNC, '', rel);
  if (UNGUARD_SYNC)  body = swapOnce(body, '--unguard-sync',  GUARD_SYNC, GUARD_SYNC_OFF, rel);
  if (DROPLIST)      body = swapOnce(body, '--droplist',      LIST_HEAD,  LIST_SHORT, rel);
  if (KILLSEED)      body = swapOnce(body, '--killseed',      SEED_CALL,  SEED_DEAD, rel);
  return body;
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) out = Buffer.from(poison(rel, out.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let pass = 0, fail = 0;
function ok(id, msg, cond, observed) {
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

async function newSignedInContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  /* ⛔ THE ROUTE STUB, NOT JUST THE window STUB — see the header note. */
  await ctx.route('**/clerk.browser.js*', r => r.fulfill({
    status: 200, contentType: 'text/javascript',
    body: 'window.Clerk={load:()=>Promise.resolve(),user:{id:' + JSON.stringify(USER_ID) + '}};'
  }));
  await ctx.addInitScript(`(() => { try {
    sessionStorage.setItem('datum_auth_hint', '1');
    localStorage.setItem('datumfi.accountDossier.v15', ${JSON.stringify(JSON.stringify(DOSSIER))});
    localStorage.setItem('datumfi.accountDossier.owner', ${JSON.stringify(USER_ID)});
  } catch (e) {} })();`);
  return ctx;
}

async function fillProfile(page) {
  await page.evaluate(([fields, selects]) => {
    const set = (id, val) => {
      const e = document.getElementById(id);
      if (!e) return;
      const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, val);
      e.dispatchEvent(new Event('input',  { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      e.dispatchEvent(new Event('blur',   { bubbles: true }));
      if (typeof e.onblur === 'function') { try { e.onblur({ target: e }); } catch (x) {} }
    };
    Object.entries(fields).forEach(([k, v]) => set(k, v));
    Object.entries(selects).forEach(([k, v]) => set(k, v));
  }, [TYPED, TYPED_SELECTS]);
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  /* ── ARM A — the scratch click. Feeds L1 and L2. ─────────────────────────────────────────── */
  const ctxA = await newSignedInContext(browser);
  const pageA = await ctxA.newPage();
  await pageA.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await pageA.waitForTimeout(2500);
  await pageA.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
  await pageA.waitForTimeout(600);
  await fillProfile(pageA);
  await pageA.waitForTimeout(2500);

  /* THE FIXTURE MUST HAVE LANDED. If the profile is not actually filled, every later assertion is
   * a statement about an empty page. Checked, not assumed. */
  const filledBefore = await pageA.evaluate(ids => ids.filter(i => {
    const e = document.getElementById(i); return e && String(e.value).trim();
  }).length, Object.keys(TYPED).concat(Object.keys(TYPED_SELECTS)));
  if (filledBefore < 9) {
    console.log(`ABORT: fixture did not take — only ${filledBefore} of 9 profile fields were filled before the click`);
    await browser.close(); server.close(); process.exit(1);
  }

  await pageA.evaluate(() => {
    if (typeof window._studioOverlayOpen === 'function') return window._studioOverlayOpen();
    const w = document.getElementById('studioOverlayWrap');
    if (w) { w.classList.remove('dismissed'); w.style.display = ''; }
  });
  await pageA.waitForTimeout(500);
  await pageA.click('#studioStartScratch');
  await pageA.waitForTimeout(1200);
  await pageA.waitForLoadState('load').catch(() => {});
  await pageA.waitForTimeout(3500);   // the window.load dossier seed settles inside this window

  const declared = await pageA.evaluate(() => (window.DATUM_SCRATCH_FIELDS || []).slice());
  const dirty = await pageA.evaluate(() => {
    const out = [];
    (window.DATUM_SCRATCH_FIELDS || []).forEach(id => {
      const e = document.getElementById(id);
      if (e && String(e.value).trim()) out.push(id + '="' + e.value + '"');
    });
    return out;
  });

  ok('L1', 'every DECLARED field is empty after START FROM SCRATCH',
     dirty.length === 0,
     dirty.length ? `${dirty.length} still filled: ${dirty.join(', ')}` : `all ${declared.length} declared fields empty`);

  const missing = MUST_DECLARE.filter(id => declared.indexOf(id) === -1);
  ok('L2', "the product's DATUM_SCRATCH_FIELDS covers the gate's independent enumeration",
     missing.length === 0,
     missing.length ? `NOT DECLARED: ${missing.join(', ')}` : `declares all ${MUST_DECLARE.length}`);

  await ctxA.close();

  /* ── ARM B — the OTHER DIRECTION. No scratch click; the seed must still fire. Feeds L3. ──── */
  const ctxB = await newSignedInContext(browser);
  const pageB = await ctxB.newPage();
  await pageB.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await pageB.waitForTimeout(4500);

  /* ⚠️ THE ARM IS ONLY MEANINGFUL IF THIS BOOT IS NOT ITSELF A SCRATCH BOOT. */
  const scratchFlag = await pageB.evaluate(() => {
    try { return sessionStorage.getItem('datumfi_skip_entry_overlay'); } catch (e) { return 'THREW'; }
  });
  const seeded = await pageB.evaluate(() => {
    const want = ['pri-dob','co-dob','target-ret','co-ret','pri-salary','co-salary','pri-location'];
    return want.filter(i => { const e = document.getElementById(i); return e && String(e.value).trim(); }).length;
  });
  ok('L3', 'a returning signed-in user who did NOT press scratch is still seeded from their dossier',
     scratchFlag === null && seeded === 7,
     `scratchFlag=${scratchFlag} · seeded ${seeded} of 7`);

  await ctxB.close();
  await browser.close();
  server.close();

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} · pass ${pass} · fail ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('GATE ERROR: ' + e.stack); try { server.close(); } catch (x) {} process.exit(1); });
