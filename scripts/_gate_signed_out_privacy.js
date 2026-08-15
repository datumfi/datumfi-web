'use strict';
/* _gate_signed_out_privacy.js — STANDING GATE · MASTER SPEC PART 24/25
 *
 * THE CLAIM, IN ONE SENTENCE: an unauthenticated session must not render — or leave behind —
 * personal data, from ANY source; and a session must never draw one account's data for another.
 *
 * Confirmed in production 2026-08-15 by the Captain, on the real journey: sign in -> enter data
 * -> sign out -> open the Studio -> his dossier inputs were sitting in the Architect area, beside
 * an honest SIGN IN button. This gate exists so that can never be true again without a red.
 *
 * ── WHY THIS FILE EXISTS WHEN A SIGN-OUT GATE ALREADY DID ────────────────────────────────────
 * `_p7_studio_overlay_parity.js` leg (b) signs out, clicks the REAL button, and proves nothing:
 * it seeds its fixture from `DatumPurge._localCarriedKeys()` — the wipe's own source list — then
 * asserts against that same list. It asks "does the wipe sweep what the wipe sweeps?" It cannot
 * fail, and `datumfi.accountDossier.v15` — the key that carried the Captain's date of birth,
 * gross income, home location, email, phone, and his spouse's name and income — was invisible to
 * it BY CONSTRUCTION. Its header calls that property a virtue ("full sweep derived from the
 * source list, not a spot-check").
 *   🔑 A HARD-CODED SPOT-CHECK WOULD AT LEAST HAVE BEEN CAPABLE OF GOING RED. THE "BETTER"
 *      DESIGN IS THE ONE THAT CANNOT SEE. A gate whose fixture is seeded from the thing it tests
 *      is not a weak gate — it is a green light wired to itself.
 *
 * ── THE POPULATION RULE (P) — THE LOAD-BEARING DESIGN DECISION ───────────────────────────────
 * NOTHING in this file enumerates a key list. L4 asks the PRODUCT what it wrote — a census of
 * Object.keys(localStorage) + Object.keys(sessionStorage) taken after a driven signed-in session
 * — and then asserts that NO surviving key contains ANY fixture value. That is the leg that
 * would have caught the dossier, and it is the leg that catches next year's key for free,
 * including the unbounded `datum_blueprint_state_<uuid>` and `datum_sketch_byid_<uuid>` families
 * that a hard-coded 1..4 can never reach.
 *   ⛔ NEVER "improve" L4 by giving it a key list. The absence of one IS the instrument.
 *
 * ── WHY THE ASSERTIONS ARE NEGATIVE, AND WHY THAT IS NOT A WEAKNESS ──────────────────────────
 * L1/L2/L3 assert that no rendered field carries a FIXTURE value, rather than that each field
 * equals a founder default. A default table would be a hand-maintained list wearing numbers —
 * the exact defect one layer down — and it would go red every time a default legitimately moves.
 * The claim is "does not show HER data", so that is what is measured.
 *   ⚠️ A pile of absence assertions is the shape that passes when the feature is DELETED, so
 *      every absence leg here is paired: each proves the page BOOTED (its fields exist and a
 *      non-personal control rendered) before it reads anything, and L7 proves the signed-in
 *      prefill still works. Six greens over a blank page is the failure this pairing forbids.
 *
 * LEGS
 *   P  · census — prints what the product wrote (never asserted as a count)
 *   L1 · signed-OUT /studio.html renders none of Alice's data
 *   L2 · signed-OUT /sketch.html  renders none of Alice's data (incl. slider dataset.exactVal,
 *        which never reaches textContent and is invisible to a body-text scan)
 *   L3 · THE DECIDING LEG — sign in -> write -> REAL Sign Out button -> reload -> assert L1
 *   L4 · THE POPULATION LEG — after sign-out, NO surviving key may contain ANY fixture value
 *   L5 · TWO ACCOUNTS — Alice's localStorage present, Bob really signed in: every rendered
 *        field is BOB's, and the stored dossier is BOB's
 *   L6 · THE WRITE-BACK NEGATIVE — under L5, DatumBlueprint.captureDOM() (the exact routine the
 *        save path runs) must capture nothing of Alice's. Disclosure and CORRUPTION are two
 *        different claims and the second one needs its own leg: save is not the defect, save is
 *        the amplifier that turns a disclosure into a write into the other person's account.
 *   L7 · PAIRED PRESENCE — Bob alone, signed in, still gets his own prefill
 *
 * CONTROLS (amputation tests — each must fail in the SHAPE of its claim)
 *   --sparse     : dossier carrying ONLY primary.name. Armed today. A fixture with nothing in it
 *                  proves nothing about a defect that only touches something.
 *   --nowipe     : neuter signOutWipe's key list -> L3/L4 red, L1/L2/L7 unmoved. Armed today.
 *   --nogate     : strip the signed-out read guard -> L1/L2/L3 red, L7 green. ARMS IN STEP 2.
 *   --cachewins  : restore local-cache-wins       -> L5/L6 red, L1/L2 unmoved. ARMS IN STEP 4.
 *   ⛔ --nogate and --cachewins EXIT 1 with a named message until their anchors exist. A control
 *      that silently does nothing is a comment; this file refuses to ship one.
 *
 * ⚠️ THIS GATE SHIPS RED, DELIBERATELY, AND IT IS NOT QUARANTINED. Quarantine is for a gate nobody
 * trusts; this one is trusted and the product is wrong. Its red-leg COUNT is the arc's progress
 * meter and is meant to be read every run:
 *      today (4c5bec8)      9 RED — L1c L2c L3f L4a L4b L5c L5d L6b L6c
 *      after step 2 (guard) L1c L2c L3f L5d L6b L6c should go green
 *      after step 3 (sweep) L4a should go green
 *      after step 4 (owner) L4b L5c should go green  -> GREEN, and it stays a standing gate
 * ⛔ If a leg goes green in a step that was not supposed to move it, that is a finding, not a bonus.
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_signed_out_privacy.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
               '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 8181;
const BASE = 'http://127.0.0.1:' + PORT;

const SPARSE    = process.argv.includes('--sparse');
const NOWIPE    = process.argv.includes('--nowipe');
const NOGATE    = process.argv.includes('--nogate');
const CACHEWINS = process.argv.includes('--cachewins');

/* ── FIXTURES ────────────────────────────────────────────────────────────────────────────────
 * Alice and Bob differ in EVERY field, deliberately. A fixture pair that agrees anywhere lets
 * L5 pass over total contamination in the field where they happen to match.
 * Alice's numbers are high-entropy constants (314159 / 271828 / 1618033 / 141421) so that the L4
 * storage scan cannot raise a false positive against an unrelated value. */
const ALICE = {
  schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-14T12:00:00.000Z', title: 'ALICE DOSSIER',
  primary: { name: 'Alice Aardvark', dateOfBirth: '1979-03', age: 47, grossIncome: 314159, targetRetirementAge: 58 },
  household: { profileType: 'Joint', filingStatus: 'Married Filing Jointly', location: 'FL',
    grossHouseholdIncome: 486159,
    coArchitect: { name: 'Co Aardvark', dateOfBirth: '1981-11', age: 44, grossIncome: 172000, targetRetirementDate: '2044-11' } },
  defaults: { effectiveTaxRate: 0.27, roughAfterTaxIncome: 354896, targetRetirementAge: 58,
    yearsToRetirement: 11, planThroughAge: 88, defaultDatum: 271828, accessMode: 'Design' },
  contact: { email: 'alice.aardvark@example.com', phone: '(555) 010-1111', notificationPreferences: ['sketch'] },
  accounts: { currentPortfolioBalance: 1618033, annualContributions: 141421 }
};
const ALICE_SPARSE = { schema: 'DatumFIAccountDossierV4', title: 'ALICE DOSSIER',
  primary: { name: 'Alice Aardvark' }, household: {}, defaults: {}, contact: {}, accounts: {} };

const BOB = {
  schema: 'DatumFIAccountDossierV4', savedAt: '2026-08-14T13:00:00.000Z', title: 'BOB DOSSIER',
  primary: { name: 'Bob Bobson', dateOfBirth: '1992-09', age: 33, grossIncome: 88888, targetRetirementAge: 67 },
  household: { profileType: 'Single', filingStatus: 'Single', location: 'TX',
    grossHouseholdIncome: 88888, coArchitect: null },
  defaults: { effectiveTaxRate: 0.12, roughAfterTaxIncome: 78221, targetRetirementAge: 67,
    yearsToRetirement: 34, planThroughAge: 95, defaultDatum: 55555, accessMode: 'Discover' },
  contact: { email: 'bob.bobson@example.com', phone: '(555) 010-2222', notificationPreferences: [] },
  accounts: { currentPortfolioBalance: 222222, annualContributions: 33333 }
};

const aliceDossier = () => (SPARSE ? ALICE_SPARSE : ALICE);

/* RENDER fingerprints — what Alice's data looks like once a field has formatted it.
   Both raw and comma-grouped forms, because a field may show either. */
const ALICE_RENDER = SPARSE
  ? ['Aardvark']
  : ['1979', '314159', '314,159', '172000', '172,000', '1981', '2044', '2037',
     '1618033', '1,618,033', '1.62M', '141421', '141,421', '271828', '271,828', '272k',
     'Aardvark', 'alice.aardvark@example.com', '010-1111'];

/* STORAGE fingerprints — high-entropy ONLY. A four-digit year in a blob of JSON is not
   evidence of a leak; 314159 is. Narrower than ALICE_RENDER on purpose: L4 sweeps every
   surviving value in both stores and must not cry wolf. */
const ALICE_STORAGE = SPARSE
  ? ['Aardvark']
  : ['1979-03', '314159', '172000', '1618033', '141421', '271828', '486159', '354896',
     'Aardvark', 'alice.aardvark@example.com', '010-1111', '1981-11', '2044-11', 'ALICE DOSSIER'];

const BOB_RENDER = ['1992', '88888', '88,888', '2059', '222222', '222,222', '33333', '33,333', '55555'];

/* ── SERVER, with the control rewrites ───────────────────────────────────────────────────── */
const A_WIPE = 'function signOutWipe() {\n    var keys = _localCarriedKeys();';
const M_WIPE = 'function signOutWipe() {\n    var keys = [];';

function armAnchor(src, anchor, replacement, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.error('CONTROL ' + label + ': expected exactly 1 anchor occurrence, found ' + n + ' — re-ground it.');
    process.exit(1);
  }
  return src.split(anchor).join(replacement);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (NOWIPE && /datum-archive-purge\.js$/.test(p)) {
    const src = armAnchor(fs.readFileSync(fp, 'utf8'), A_WIPE, M_WIPE, '--nowipe');
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(src); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

/* ── SCORING ─────────────────────────────────────────────────────────────────────────────── */
const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}
/* Assert a map of rendered field values carries NONE of `needles`. Reports the OFFENDING
   field and value, never a bare boolean — a red count is not a red list. */
function checkClean(legName, values, needles) {
  const hits = [];
  Object.keys(values).forEach((k) => {
    const v = values[k] == null ? '' : String(values[k]);
    if (!v) return;
    needles.forEach((n) => { if (v.indexOf(n) >= 0) hits.push(k + '=' + JSON.stringify(v) + ' [' + n + ']'); });
  });
  check(legName, hits.length === 0, hits.join(' · '));
  return hits;
}

/* ── PAGE HELPERS ────────────────────────────────────────────────────────────────────────── */
const BLOCK = /clerk\.|cloudflareinsights|posthog|beacon|googletagmanager|fonts\.googleapis|fonts\.gstatic/i;

/* SIGNED OUT IS REAL HERE: no Clerk stub is installed at all, so window.Clerk is undefined and
   _datumSeedDossier takes its `if (!window.Clerk)` exit. The only thing seeded is the storage a
   prior session left on this browser. */
const SEED_QUIET = `(() => { try {
  sessionStorage.setItem('datumfi_skip_entry_overlay','1');
  localStorage.setItem('datum-discover-v1','done');
  localStorage.setItem('datum_studio_overlay_seen','1');
  localStorage.setItem('datum_sketch_overlay_seen','1');
} catch(e){} })();`;

function seedAlice() {
  return `(() => { try {
    localStorage.setItem('datumfi.accountDossier.v15', ${JSON.stringify(JSON.stringify(aliceDossier()))});
    localStorage.setItem('datum_workspace_name', 'Alice Aardvark');
  } catch(e){} })();`;
}

/* THE CLERK STUB KEYS OFF THE PRODUCT'S OWN SIGNAL, NOT OFF A FLAG OF MINE.
 * account-topbar.js clears `datum_auth_hint` as the FIRST synchronous act of sign-out, before it
 * calls Clerk.signOut() and replaces the location. So on the page that loads after a real
 * sign-out click, this stub installs `user: null` — the session is genuinely gone across the
 * navigation, without the gate inventing a sentinel key that would then pollute L4's census. */
function clerkStub(user) {
  return `(() => { try {
    var signedIn = false;
    try { signedIn = sessionStorage.getItem('datum_auth_hint') === '1'; } catch(e){}
    var U = ${JSON.stringify(user)};
    window.Clerk = {
      load: function(){ return Promise.resolve(); },
      session: signedIn ? { getToken: function(){ return Promise.resolve('tok'); } } : null,
      user: signedIn ? {
        id: U.id, firstName: U.firstName,
        primaryEmailAddress: { emailAddress: U.email },
        unsafeMetadata: U.meta,
        update: function(){ return Promise.resolve(); }
      } : null,
      signOut: function(){ try { window.Clerk.user = null; window.Clerk.session = null; } catch(e){} return Promise.resolve(); }
    };
  } catch(e){} })();`;
}

/* ⛔⛔ NOTHING THAT WRITES STORAGE MAY BE AN INIT SCRIPT. Playwright re-runs an init script on
 * EVERY navigation, so a seeder installed that way re-arms, after each hop, exactly the state the
 * product just cleared. Measured on this gate's own first run: `datum_auth_hint` was re-set on the
 * page that loads after the sign-out click, the stub therefore re-installed a signed-in user, and
 * L3 reported "sign-out did not run" against a sign-out that had run perfectly. The instrument was
 * measuring itself — the same shape as the tautological gate this file exists to replace.
 *   🔑 A FIXTURE THAT RE-ARMS THE STATE UNDER TEST IS NOT A FIXTURE, IT IS A SECOND ACTOR.
 * So: seeds are written ONCE, through `prime()`, on a cheap same-origin page before the first real
 * navigation. sessionStorage and localStorage then persist across hops on their own — and when the
 * product removes a key, it STAYS removed, which is the entire behaviour under test.
 * The Clerk stub stays an init script because it must exist before any page script runs and it only
 * READS the auth hint; it never writes one. */
async function newCtx(browser, initScripts) {
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 950 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (BLOCK.test(u)) return route.abort();
    return route.continue();
  });
  for (const s of initScripts) await ctx.addInitScript(s);
  return ctx;
}

/* One-shot storage seeding on the origin, before the first page under test. */
async function prime(page, scripts) {
  await page.goto(BASE + '/404.html', { waitUntil: 'commit' });
  for (const s of scripts) await page.evaluate(s);
}

/* The Studio's personal surface, read as ELEMENT VALUES — never as flat page text. A hover or a
   tooltip that happens to contain a number would drift into a body-text search space and quietly
   widen it; the element is the thing. */
const READ_STUDIO = `(() => {
  const g = (id) => { const e = document.getElementById(id); return e ? (e.value !== undefined ? e.value : e.textContent) : null; };
  return {
    _booted: !!document.getElementById('pri-dob') && !!document.getElementById('slider-age'),
    _signInVisible: (() => { const a = document.querySelector('.nav-login-btn'); return !!a && a.getClientRects().length > 0; })(),
    _topbar: !!document.getElementById('acct-topbar'),
    pri_dob: g('pri-dob'), target_ret: g('target-ret'), pri_salary: g('pri-salary'),
    pri_location: g('pri-location'), eff_tax_rate: g('eff-tax-rate'),
    co_dob: g('co-dob'), co_salary: g('co-salary'), co_ret: g('co-ret'),
    co_enabled: String(!!(document.getElementById('co-arch-toggle') || {}).checked),
    slider_tax: g('slider-tax'),
    val_age: g('val-age'), val_activation: g('val-activation'), val_plan_through: g('val-plan-through'),
    val_portfolio: g('val-portfolio'), val_contrib: g('val-contrib'), val_datum: g('val-datum'),
    ex_portfolio: (document.getElementById('slider-portfolio') || {}).dataset ? document.getElementById('slider-portfolio').dataset.exactVal : null,
    ex_contrib: (document.getElementById('slider-contrib') || {}).dataset ? document.getElementById('slider-contrib').dataset.exactVal : null,
    ex_datum: (document.getElementById('slider-datum') || {}).dataset ? document.getElementById('slider-datum').dataset.exactVal : null
  };
})()`;

const READ_SKETCH = `(() => {
  const g = (id) => { const e = document.getElementById(id); return e ? (e.value !== undefined ? e.value : e.textContent) : null; };
  const ex = (id) => { const e = document.getElementById(id); return e && e.dataset ? (e.dataset.exactVal || null) : null; };
  return {
    _booted: !!document.getElementById('slider-age') && !!document.getElementById('slider-datum'),
    _signInVisible: (() => { const a = document.querySelector('.nav-login-btn'); return !!a && a.getClientRects().length > 0; })(),
    val_age: g('val-age'), val_activation: g('val-activation'), val_plan_through: g('val-plan-through'),
    val_portfolio: g('val-portfolio'), val_contrib: g('val-contrib'), val_datum: g('val-datum'),
    ex_portfolio: ex('slider-portfolio'), ex_contrib: ex('slider-contrib'), ex_datum: ex('slider-datum'),
    sl_age: g('slider-age'), sl_activation: g('slider-activation'), sl_plan: g('sl-plan-through')
  };
})()`;

const CENSUS = `(() => {
  const out = { ls: {}, ss: {} };
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.ls[k] = localStorage.getItem(k); }
  for (let j = 0; j < sessionStorage.length; j++) { const k = sessionStorage.key(j); out.ss[k] = sessionStorage.getItem(k); }
  return out;
})()`;

function dump(label, r) {
  console.log('    ── ' + label);
  Object.keys(r).forEach((k) => { if (r[k] !== null && r[k] !== '') console.log('       ' + k.padEnd(18) + ' ' + JSON.stringify(r[k])); });
}

/* ════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  if (NOGATE) {
    console.error('CONTROL --nogate: the signed-out read guard does not exist yet (step 2 of the arc).');
    console.error('  This control arms when studio.html/sketch.html carry the guard. Refusing to run a no-op control.');
    process.exit(1);
  }
  if (CACHEWINS) {
    console.error('CONTROL --cachewins: the cache-ownership fix does not exist yet (step 4 of the arc).');
    console.error('  This control arms when the restore paths carry an owner check. Refusing to run a no-op control.');
    process.exit(1);
  }

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const mode = [SPARSE && '--sparse', NOWIPE && '--nowipe'].filter(Boolean).join(' ') || 'baseline';
  console.log('\n_gate_signed_out_privacy — ' + mode + '\n');

  /* ══ L1 · signed-OUT /studio.html ═══════════════════════════════════════════════════════ */
  console.log('L1 · signed-OUT /studio.html — Alice\'s storage present, no session');
  {
    const ctx = await newCtx(browser, []);
    const page = await ctx.newPage();
    await prime(page, [SEED_QUIET, seedAlice()]);
    await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(READ_STUDIO);
    dump('rendered', r);
    check('L1a · the Studio actually booted (paired presence for the absences below)', r._booted === true);
    check('L1b · the chrome says signed-out (SIGN IN visible, no account topbar)', r._signInVisible === true && r._topbar === false,
      'signIn=' + r._signInVisible + ' topbar=' + r._topbar);
    delete r._booted; delete r._signInVisible; delete r._topbar;
    checkClean('L1c · NO rendered field carries Alice\'s data', r, ALICE_RENDER);
    await ctx.close();
  }

  /* ══ L2 · signed-OUT /sketch.html ═══════════════════════════════════════════════════════ */
  console.log('\nL2 · signed-OUT /sketch.html — Alice\'s storage present, no session');
  {
    const ctx = await newCtx(browser, []);
    const page = await ctx.newPage();
    await prime(page, [SEED_QUIET, seedAlice()]);
    await page.goto(BASE + '/sketch.html', { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(READ_SKETCH);
    dump('rendered', r);
    check('L2a · the Sketch actually booted', r._booted === true);
    check('L2b · the chrome says signed-out (SIGN IN visible)', r._signInVisible === true);
    delete r._booted; delete r._signInVisible;
    checkClean('L2c · NO rendered field carries Alice\'s data (incl. dataset.exactVal)', r, ALICE_RENDER);
    await ctx.close();
  }

  /* ══ L3 + L4 · THE REAL JOURNEY ═════════════════════════════════════════════════════════
   * One context throughout, because the whole point is what one BROWSER carries across a
   * sign-out. Separate contexts would hand the leg a fresh profile and it would pass for the
   * wrong reason — the incognito trap, reproduced inside the instrument. */
  console.log('\nL3/L4 · sign in -> write -> REAL Sign Out button -> reload -> look');
  {
    const ctx = await newCtx(browser, [
      clerkStub({ id: 'user_alice', firstName: 'Alice', email: ALICE.contact.email, meta: { dossier: aliceDossier() } })
    ]);
    const page = await ctx.newPage();
    await prime(page, [SEED_QUIET, `(() => { try { sessionStorage.setItem('datum_auth_hint','1'); } catch(e){} })();`]);

    // (1) SIGNED IN — the product's own resolver caches the dossier to localStorage (nav.js:507).
    await page.goto(BASE + '/studio.html', { waitUntil: 'commit' });
    await page.waitForTimeout(4200);
    const inSession = await page.evaluate(READ_STUDIO);
    check('L3a · signed-in Studio booted and shows Alice (the state we are about to sign out of)',
      inSession._booted === true && ALICE_RENDER.some((n) => Object.keys(inSession).some((k) => String(inSession[k] || '').indexOf(n) >= 0)),
      'dob=' + inSession.pri_dob + ' salary=' + inSession.pri_salary);

    // (2) WRITE — type into the profile the way a person does, so the census below covers what
    //     the product persists in response to real input, not only what a seeder planted.
    await page.evaluate(() => {
      const set = (id, v) => {
        const el = document.getElementById(id); if (!el) return;
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };
      set('primary-name', 'Alice Aardvark');
      set('pri-dob', '03 / 1979');
      set('pri-salary', '$314,159');
    });
    await page.waitForTimeout(3200);   // let the ~1.5s draft debounce land

    // (P) THE CENSUS — ask the PRODUCT what it wrote. No list of ours is consulted here.
    const before = await page.evaluate(CENSUS);
    const beforeKeys = Object.keys(before.ls).sort().concat(Object.keys(before.ss).sort().map((k) => 'ss:' + k));
    console.log('    ── P · census after a driven signed-in session: ' + beforeKeys.length + ' keys');
    console.log('       ' + beforeKeys.join('\n       '));

    // (3) SIGN OUT through the real control, on the page that owns it.
    await page.goto(BASE + '/my-account.html', { waitUntil: 'commit' });
    let sawButton = false;
    try { await page.waitForSelector('[data-acct-action="signout"]', { timeout: 30000 }); sawButton = true; } catch (e) {}
    check('L3b · the real Sign Out control is present on Home', sawButton);
    if (sawButton) {
      await page.evaluate(() => { document.querySelector('[data-acct-action="signout"]').click(); });
      await page.waitForTimeout(2500);
    }
    const hintGone = await page.evaluate(() => { try { return sessionStorage.getItem('datum_auth_hint') === null; } catch (e) { return false; } });
    check('L3c · sign-out actually ran (auth hint cleared)', hintGone === true);

    /* ⚠️ THE CENSUS IS TAKEN TWICE, AND THAT SEPARATION IS LOAD-BEARING. "The wipe never removed
       it" and "the wipe removed it and the next page load put it back" are DIFFERENT DEFECTS that
       arrive at an identical end state, and they have different fixes: the first is the sweep list
       (step 3), the second is the ungated read (step 2) feeding the autosave. A single after-the-
       fact scan would have blamed the sweep list for both, and rebuilding the list would then have
       "not worked" for reasons nobody could see. */
    const atSignOut = await page.evaluate(CENSUS);
    const survivedWipe = [];
    ['ls', 'ss'].forEach((store) => {
      Object.keys(atSignOut[store]).forEach((k) => {
        const v = atSignOut[store][k] == null ? '' : String(atSignOut[store][k]);
        ALICE_STORAGE.forEach((n) => { if (v.indexOf(n) >= 0 && survivedWipe.indexOf(store + ':' + k) < 0) survivedWipe.push(store + ':' + k); });
      });
    });
    check('L4a · IMMEDIATELY after the sign-out click, no key still holds fixture data',
      survivedWipe.length === 0, survivedWipe.join(' · '));

    // (4) RELOAD signed-out — same browser, same storage, no session.
    await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const after = await page.evaluate(READ_STUDIO);
    dump('rendered AFTER sign-out', after);
    check('L3d · the Studio booted after sign-out', after._booted === true);
    check('L3e · the chrome says signed-out', after._signInVisible === true && after._topbar === false,
      'signIn=' + after._signInVisible + ' topbar=' + after._topbar);
    delete after._booted; delete after._signInVisible; delete after._topbar;
    checkClean('L3f · THE DECIDING ASSERTION — nothing of Alice\'s survives a real sign-out on screen', after, ALICE_RENDER);

    /* L4 — AFTER SIGN-OUT, NO SURVIVING KEY MAY CONTAIN ANY FIXTURE VALUE.
       The population is the census above plus anything written since; we re-read rather than
       reuse it, so a key CREATED by the sign-out or the reload is in scope too. */
    const survived = await page.evaluate(CENSUS);
    const offenders = [];
    ['ls', 'ss'].forEach((store) => {
      Object.keys(survived[store]).forEach((k) => {
        const v = survived[store][k] == null ? '' : String(survived[store][k]);
        ALICE_STORAGE.forEach((n) => { if (v.indexOf(n) >= 0) offenders.push(store + ':' + k + ' [' + n + ']'); });
      });
    });
    const totalAfter = Object.keys(survived.ls).length + Object.keys(survived.ss).length;
    console.log('    ── L4 · ' + totalAfter + ' keys survived sign-out; scanning every value for fixture data');
    check('L4b · after sign-out AND a reload, NO surviving key contains ANY fixture value',
      offenders.length === 0, offenders.join(' · '));
    /* The difference between the two censuses names the second defect out loud rather than
       leaving it folded inside the first. A key here was swept correctly and then RE-WRITTEN by a
       signed-out page — the sweep list is innocent of these. */
    const reborn = [];
    offenders.forEach((o) => { const key = o.split(' [')[0]; if (survivedWipe.indexOf(key) < 0 && reborn.indexOf(key) < 0) reborn.push(key); });
    if (reborn.length) console.log('    ── ⛔ RE-CREATED BY A SIGNED-OUT PAGE LOAD (swept, then written again): ' + reborn.join(' · '));
    await ctx.close();
  }

  /* ══ L5 + L6 · TWO ACCOUNTS, ONE BROWSER ════════════════════════════════════════════════ */
  console.log('\nL5/L6 · Alice\'s localStorage on this browser; BOB signs in');
  {
    const ctx = await newCtx(browser, [
      clerkStub({ id: 'user_bob', firstName: 'Bob', email: BOB.contact.email, meta: { dossier: BOB } })
    ]);
    const page = await ctx.newPage();
    await prime(page, [SEED_QUIET, seedAlice(), `(() => { try { sessionStorage.setItem('datum_auth_hint','1'); } catch(e){} })();`]);
    await page.goto(BASE + '/studio.html', { waitUntil: 'commit' });
    await page.waitForTimeout(5200);
    const r = await page.evaluate(READ_STUDIO);
    dump('rendered for BOB', r);
    check('L5a · Bob is really signed in (account topbar rendered)', r._topbar === true);
    check('L5b · the Studio booted', r._booted === true);
    const stored = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datumfi.accountDossier.v15') || 'null'); } catch (e) { return null; } });
    check('L5c · the stored dossier belongs to BOB, not Alice',
      !!stored && stored.title === 'BOB DOSSIER', stored ? stored.title : 'null');
    const rr = Object.assign({}, r); delete rr._booted; delete rr._signInVisible; delete rr._topbar;
    checkClean('L5d · NO rendered field carries Alice\'s data while Bob is signed in', rr, ALICE_RENDER);

    /* L6 — the WRITE-BACK negative, through the exact routine the save path runs. It prints the
       whole captured profile rather than probing one field: which fields captureDOM reads is a
       property of the product, not of my memory of it. */
    const captured = await page.evaluate(() => {
      try {
        if (!window.DatumBlueprint || typeof window.DatumBlueprint.captureDOM !== 'function') return { _unavailable: true };
        const bp = window.DatumBlueprint['new']();
        window.DatumBlueprint.captureDOM(bp);
        return bp.profile;
      } catch (e) { return { _threw: String(e) }; }
    });
    console.log('    ── L6 · DatumBlueprint.captureDOM() -> bp.profile');
    Object.keys(captured).forEach((k) => console.log('       ' + k.padEnd(30) + ' ' + JSON.stringify(captured[k])));
    check('L6a · captureDOM was reachable (a leg that cannot run is not a green)', !captured._unavailable && !captured._threw,
      captured._threw || (captured._unavailable ? 'DatumBlueprint.captureDOM absent' : ''));
    checkClean('L6b · a SAVE under Bob would capture nothing of Alice\'s', captured, ALICE_RENDER);

    /* L6c — ⚠️ THE DISTINCTIVE-VALUE SCAN IS THIS GATE'S STRONGEST INSTRUMENT *AND* IT IS BLIND TO
     * SMALL COMMON INTEGERS. Both are true at once. `plan_end_age` is a bare age: Alice's is 88, and
     * adding '88' to the fingerprint list would collide with Bob's own salary (88888) and fire on
     * half the fixture. So captureDOM was quietly carrying a THIRD contaminated field that L6b could
     * never see — measured, not supposed: the L6 dump printed `plan_end_age 88` under a Bob session
     * while L6b reported only two offenders.
     *   🔑 ANY FIELD WHOSE DOMAIN IS TOO SMALL TO FINGERPRINT NEEDS ITS OWN NAMED ASSERTION.
     * Stated as the negative that IS the claim ("not hers"), not as equality with Bob's 95: after the
     * fix this may legitimately resolve to his 95 or to the schema default 93, and a leg that reds on
     * a correct outcome is a leg somebody deletes. */
    const aliceP = (aliceDossier().defaults || {}).planThroughAge;
    if (typeof aliceP === 'number') {
      check('L6c · plan_end_age is NOT Alice\'s (bare integer — unfingerprintable, so named explicitly)',
        captured.plan_end_age !== aliceP, 'captured=' + captured.plan_end_age + ' alice=' + aliceP + ' bob=' + BOB.defaults.planThroughAge);
    } else {
      /* A leg that cannot run is not a green, and must never be silent about it. */
      console.log('  SKIP  L6c · this fixture carries no planThroughAge (--sparse) — leg cannot bite; NOT counted green');
    }
    await ctx.close();
  }

  /* ══ L7 · PAIRED PRESENCE ═══════════════════════════════════════════════════════════════
   * Six absence assertions are exactly the shape that passes when the feature is deleted. This
   * is the leg that says the signed-in prefill must SURVIVE the fix. If L1-L6 go green by
   * removing the dossier seed altogether, this goes red. */
  console.log('\nL7 · Bob alone, signed in — his own prefill must still work');
  {
    const ctx = await newCtx(browser, [
      clerkStub({ id: 'user_bob', firstName: 'Bob', email: BOB.contact.email, meta: { dossier: BOB } })
    ]);
    const page = await ctx.newPage();
    await prime(page, [SEED_QUIET, `(() => { try { sessionStorage.setItem('datum_auth_hint','1'); } catch(e){} })();`]);
    await page.goto(BASE + '/studio.html', { waitUntil: 'commit' });
    await page.waitForTimeout(5200);
    const r = await page.evaluate(READ_STUDIO);
    dump('rendered for BOB (no prior user on this browser)', r);
    check('L7a · Bob is really signed in (account topbar rendered)', r._topbar === true);
    const flat = Object.keys(r).map((k) => String(r[k] == null ? '' : r[k])).join(' | ');
    const bobHits = BOB_RENDER.filter((n) => flat.indexOf(n) >= 0);
    check('L7b · the signed-in prefill STILL WORKS — Bob\'s own data is on screen',
      bobHits.length > 0, 'matched: ' + bobHits.join(',') + ' | dob=' + r.pri_dob + ' salary=' + r.pri_salary);
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  if (fails.length) fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
