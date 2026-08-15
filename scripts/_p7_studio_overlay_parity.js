/* _p7_studio_overlay_parity.js — STANDING GATE for P7 Studio-overlay auth parity.
 *
 * Proves, in a REAL browser under BOTH signed-out and signed-in sessions (mock
 * Clerk, real nav.js / account-topbar.js / datum-archive-purge.js, analytics
 * route-blocked, served on *.localhost):
 *
 *   (a) SIGNED-OUT — the overlay behaves signed-out: both "Start from Sketch" and
 *       "Start from Blueprint" are actionable but route to Clerk sign-in FIRST
 *       (vault?returnTo=<archive>), never acting as if a session exists (Issue 1a).
 *   (b) SIGN-OUT WIPE — ⚠️ SCOPE CORRECTED 2026-08-15, read the leg comments before trusting this
 *       line. This proves the MECHANISM only: DatumPurge.signOutWipe() runs, the real button is
 *       wired to it, and it clears the keys ~~*"EVERY carried key (full sweep derived from
 *       DatumPurge._localCarriedKeys(), not a spot-check)"*~~ **IT NAMES** — its fixture is seeded
 *       from that same list, so it cannot see a key the list omits and it never could. COMPLETENESS
 *       LIVES IN `_gate_signed_out_privacy.js` L4. from
 *       BOTH local + session storage, while the Clerk *_z cloud blob is UNTOUCHED
 *       (sign back in -> plans return). Also driven via the real account-topbar
 *       sign-out button (Issue 1b). And Start-from-Scratch hard-resets Studio to
 *       founder defaults (Age40/Retire65/$750k/$25k/$100k) with the prefill
 *       sources cleared.
 *   (c) IN-OVERLAY SIGN-IN — a cold signed-in landing re-renders the options IN
 *       PLACE (no reopen): BOTH Sketch AND Blueprint unlock and route straight to
 *       the archive (the Blueprint option, previously gated on local storage, now
 *       appears) (Issue 2 + sub-bug).
 *   (d) CSP — Studio whitelists static.cloudflareinsights.com (Sketch parity) and
 *       opening the overlay logs no CSP/beacon console error (Issue 3).
 *
 * Run: node scripts/_p7_studio_overlay_parity.js   (exit 0 = GREEN)
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8171; const BASE = 'http://' + HOST + ':' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
/* ⛔⛔ THE MOCK CLERK CLOUD LIVES ON THE SERVER, NOT IN sessionStorage — CORRECTED 2026-08-15.
   It used to be `sessionStorage.__mockclerk_meta`, and leg (b) asserted "the Clerk *_z mirrors
   SURVIVE the sign-out wipe" against it. That held only while the wipe was a hand-written REMOVE
   LIST that happened not to name it. When the sweep became derived-by-exclusion (remove everything
   except a tiny keep-list), the simulated cloud was swept and this gate reported CLOUD DATA LOSS.
   The product does not have that defect: Clerk's unsafeMetadata lives on Clerk's servers, and the
   sweep only touches browser storage.
     🔑 A FIXTURE DESCRIBING A STATE NO REAL USER CAN BE IN IS NOT A FIXTURE. No user's cloud blob
        sits in their own sessionStorage, so a "cloud" stored there is not modelling the cloud — it
        is modelling a local key that nobody sweeps, which is a different claim entirely.
   ⚠️ THE ROUTE IS `/__mockmeta` AND MUST NOT CONTAIN THE WORD "clerk": this gate blocks every
      request matching /clerk|cloudflareinsights|posthog|beacon/i, so the first name I gave it
      (`/__mockclerkmeta`) WAS ABORTED BY THE GATE'S OWN NETWORK FILTER and the seed never landed.
      🔑 A FIXTURE ENDPOINT NAMED AFTER THE THING THE TEST BLOCKS WILL BE BLOCKED.
   ⚠️ AND THE FIX IS NOT TO ADD THE KEY TO THE PRODUCT'S KEEP-LIST. That would protect a TEST key in
      shipped code and quietly re-create the "list that happens not to name it" property this gate
      exists to disprove. Moving the mock to where the real thing lives keeps the assertion honest
      AND survives the navigation the sign-out button performs. Same pattern as
      _p5_title_render_parity's /__clerkmeta and _gate_erasure_reaches_server. */
let MOCK_META = {};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  if (p === '/__mockmeta') {
    if (req.method === 'POST') {
      let b = ''; req.on('data', (c) => { b += c; });
      req.on('end', () => { try { MOCK_META = JSON.parse(b || '{}'); } catch (e) {} res.writeHead(200); res.end('{}'); });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(MOCK_META || {})); return;
  }
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
const check = (name, cond, detail) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : '')); if (!cond) fails.push(name); };

// Mock Clerk installers (run as initScripts in the page).
function installSignedOut() {
  window.Clerk = { load: function () { return Promise.resolve(); }, user: null };
}
function installSignedIn() {
  window.Clerk = {
    load: function () { return Promise.resolve(); },
    // signOut never resolves so the topbar handler's post-wipe redirect does not
    // fire — lets the gate observe the wipe it ran first.
    signOut: function () { return new Promise(function () {}); },
    user: {
      get unsafeMetadata() { try { var x=new XMLHttpRequest(); x.open('GET','/__mockmeta',false); x.send(); return JSON.parse(x.responseText||'{}'); } catch (e) { return {}; } },
      update: function (o) { try { var x=new XMLHttpRequest(); x.open('POST','/__mockmeta',false); x.send(JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); },
      firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' }
    }
  };
}

async function clickAndGetUrl(page, btnId) {
  await Promise.all([
    page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
    page.evaluate((id) => { var b = document.getElementById(id); if (b) b.click(); }, btnId)
  ]);
  await page.waitForTimeout(300);
  return page.url();
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });

  const cspErrors = [];   // CSP-violation console errors seen on Studio overlay opens

  // ════════ (a) SIGNED-OUT OVERLAY ════════
  const ctxOut = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const pOut = await ctxOut.newPage();
  const outErrors = [];
  pOut.on('pageerror', (e) => outErrors.push(e.message));
  pOut.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (/content security policy|refused to load|beacon|cloudflareinsights/i.test(t)) cspErrors.push(t); } });
  await pOut.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await pOut.addInitScript(installSignedOut);   // NO auth_hint, NO skip flag -> overlay shows

  await pOut.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await pOut.waitForTimeout(1800);   // Clerk.load() reconcile -> applyAuthState(false)
  const outState = await pOut.evaluate(() => {
    var w = document.getElementById('studioOverlayWrap');
    var sk = document.getElementById('studioStartSketch');
    var bp = document.getElementById('studioStartBlueprint');
    var sv = document.getElementById('studioStatusValue');
    return {
      visible: !!(w && w.style.display !== 'none' && !w.classList.contains('dismissed')),
      sketchDisabled: !!(sk && sk.classList.contains('disabled-cta')),
      bpDisabled: !!(bp && bp.classList.contains('disabled-cta')),
      signInLink: !!(sv && /Sign In/i.test(sv.textContent || ''))
    };
  });
  check('(a) signed-out: overlay visible', outState.visible);
  check('(a) signed-out: Sketch option actionable (not disabled)', !outState.sketchDisabled);
  check('(a) signed-out: Blueprint option actionable (not disabled)', !outState.bpDisabled);
  check('(a) signed-out: status shows Sign In link', outState.signInLink);

  // Correct signed-out behavior = goes through sign-in (vault.html, which then
  // redirects to the Clerk hosted /sign-in) targeting the right archive — NOT a
  // direct load of the archive on our origin (which would be the "acts signed-in"
  // bug). Accept either the intermediate vault URL or the downstream sign-in URL.
  const signInTo = (url, archive) => (/vault\.html|\/sign-in/i.test(url)) && new RegExp(archive, 'i').test(url) && !new RegExp('datumfi\\.localhost:' + PORT + '/' + archive).test(url);
  const outSketchUrl = await clickAndGetUrl(pOut, 'studioStartSketch');
  check('(a) signed-out: Sketch routes to sign-in first', signInTo(outSketchUrl, 'sketchbook\\.html'), outSketchUrl);
  await pOut.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await pOut.waitForTimeout(1500);
  const outBpUrl = await clickAndGetUrl(pOut, 'studioStartBlueprint');
  check('(a) signed-out: Blueprint routes to sign-in first', signInTo(outBpUrl, 'Blueprint\\.html'), outBpUrl);
  check('(a) signed-out: no page errors', outErrors.length === 0, outErrors.slice(0, 3).join(' | '));
  await ctxOut.close();

  // ════════ (c) SIGNED-IN COLD RETURN — in-place unlock ════════
  const ctxIn = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const pIn = await ctxIn.newPage();
  const inErrors = [];
  pIn.on('pageerror', (e) => inErrors.push(e.message));
  pIn.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (/content security policy|refused to load|beacon|cloudflareinsights/i.test(t)) cspErrors.push(t); } });
  await pIn.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await pIn.addInitScript(installSignedIn);   // user set, NO auth_hint -> first paint signed-out, reconcile signs in

  await pIn.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await pIn.waitForTimeout(2000);   // Clerk.load() -> applyAuthState(true) in place
  const inState = await pIn.evaluate(() => {
    var w = document.getElementById('studioOverlayWrap');
    var sk = document.getElementById('studioStartSketch');
    var bp = document.getElementById('studioStartBlueprint');
    var sv = document.getElementById('studioStatusValue');
    return {
      visible: !!(w && w.style.display !== 'none' && !w.classList.contains('dismissed')),
      sketchDisabled: !!(sk && sk.classList.contains('disabled-cta')),
      bpDisabled: !!(bp && bp.classList.contains('disabled-cta')),
      signedInText: !!(sv && /Signed in/i.test(sv.textContent || ''))
    };
  });
  check('(c) cold sign-in: overlay still visible (no auto-hide)', inState.visible);
  check('(c) cold sign-in: status re-rendered to "Signed in" in place', inState.signedInText);
  check('(c) cold sign-in: Sketch unlocked in place', !inState.sketchDisabled);
  check('(c) cold sign-in: Blueprint option APPEARS + unlocked (sub-bug fix)', !inState.bpDisabled);

  const inBpUrl = await clickAndGetUrl(pIn, 'studioStartBlueprint');
  check('(c) signed-in: Blueprint routes straight to archive', /\/Blueprint\.html(?:[?#]|$)/.test(inBpUrl) && !/vault/.test(inBpUrl), inBpUrl);
  await pIn.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await pIn.waitForTimeout(1800);
  const inSkUrl = await clickAndGetUrl(pIn, 'studioStartSketch');
  check('(c) signed-in: Sketch routes straight to Sketchbook', /\/sketchbook\.html(?:[?#]|$)/.test(inSkUrl) && !/vault/.test(inSkUrl), inSkUrl);

  // ════════ (b-scratch) START FROM SCRATCH = founder defaults ════════
  await pIn.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await pIn.waitForTimeout(1500);
  // Seed lingering carried state, then reload so the overlay re-shows over it.
  await pIn.evaluate(() => {
    var draft = { version: 'old', blueprint_id: 'lingering', portfolio_total: 2000000, datum: { net_datum_v1: 120000 } };
    // Seed the draft into BOTH stores. The live draft moved sessionStorage ->
    // localStorage (autosave Commit 2); seeding both keeps this privacy check
    // honest on EITHER side of that move instead of silently missing the store
    // the app actually uses.
    localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(draft));
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(draft));
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify(draft));
    localStorage.setItem('datum_blueprint_state_pending', JSON.stringify(draft));
    sessionStorage.setItem('datum_designed_ceil', '999999');
    sessionStorage.setItem('datum_s2_design', '{"x":1}');
  });
  await pIn.reload({ waitUntil: 'load' });
  await pIn.waitForTimeout(1800);
  // Click Start from Scratch -> lingering data present -> reload to clean /studio.html.
  await Promise.all([
    pIn.waitForNavigation({ timeout: 8000 }).catch(() => {}),
    pIn.evaluate(() => { var b = document.getElementById('studioStartScratch'); if (b) b.click(); })
  ]);
  await pIn.waitForTimeout(2200);
  const scratch = await pIn.evaluate(() => {
    var ss = (k) => sessionStorage.getItem(k) != null;
    var txt = (id) => { var e = document.getElementById(id); return e ? (e.textContent || e.value || '').trim() : null; };
    var val = (id) => { var e = document.getElementById(id); return e ? e.value : null; };
    // The draft may legitimately be re-written at DEFAULTS by the engine's
    // debounced commit after the clean reload — what matters is it no longer
    // carries the LINGERING plan (privacy). Inspect its content, not its presence.
    // Read the draft from BOTH stores — a lingering plan left behind in EITHER
    // one is the same privacy leak, and which store is live changes with the
    // autosave storage move.
    var _lingers = function (raw) {
      var d = null; try { d = JSON.parse(raw || 'null'); } catch (e) { return false; }
      return !!(d && (d.blueprint_id === 'lingering' || (d.datum && d.datum.net_datum_v1 === 120000)));
    };
    return {
      draftCarriesLingering: _lingers(localStorage.getItem('datumfi_blueprint_draft_v1')) ||
                             _lingers(sessionStorage.getItem('datumfi_blueprint_draft_v1')),
      snapshot: ss('datumfi_blueprint_current_snapshot'),
      pending: localStorage.getItem('datum_blueprint_state_pending') != null,
      carriedCeil: ss('datum_designed_ceil'),
      carriedS2: ss('datum_s2_design'),
      age: val('slider-age'), retire: val('slider-activation'),
      portfolio: txt('val-portfolio'), contrib: txt('val-contrib'),
      datum: txt('val-datum'), spend: val('spend-input')
    };
  });
  check('(b) scratch: session draft no longer carries lingering plan', !scratch.draftCarriesLingering);
  check('(b) scratch: carried snapshot cleared', !scratch.snapshot);
  check('(b) scratch: pending capture cleared', !scratch.pending);
  check('(b) scratch: carried-design keys cleared', !scratch.carriedCeil && !scratch.carriedS2);
  check('(b) scratch: Age = 40', scratch.age === '40', scratch.age);
  check('(b) scratch: Retire = 65', scratch.retire === '65', scratch.retire);
  check('(b) scratch: Portfolio = $750k', scratch.portfolio === '$750k', scratch.portfolio);
  check('(b) scratch: Contributions = $25,000', scratch.contrib === '$25,000', scratch.contrib);
  check('(b) scratch: Datum = $100k', /\$100k/.test(scratch.datum || ''), scratch.datum);
  check('(b) scratch: spend-input = $100,000', scratch.spend === '$100,000', scratch.spend);
  check('(c)/(b) signed-in Studio: no page errors', inErrors.length === 0, inErrors.slice(0, 3).join(' | '));
  await ctxIn.close();

  // ════════ (b-core + b-button) SIGN-OUT WIPE on Blueprint.html ════════
  const ctxBp = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const pBp = await ctxBp.newPage();
  const bpErrors = [];
  pBp.on('pageerror', (e) => bpErrors.push(e.message));
  await pBp.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await pBp.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}   // topbar renders signed-in
  });
  await pBp.addInitScript(installSignedIn);
  await pBp.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await pBp.waitForTimeout(2600);   // DatumPurge + topbar available

  check('(b) DatumPurge.signOutWipe present', await pBp.evaluate(() => !!(window.DatumPurge && typeof window.DatumPurge.signOutWipe === 'function')));

  // b-core: seed EVERY carried key (from the source list) in both stores + cloud blob.
  const wipe = await pBp.evaluate(() => {
    var keys = window.DatumPurge._localCarriedKeys();
    keys.forEach(function (k) { localStorage.setItem(k, 'LOCAL'); sessionStorage.setItem(k, 'SESS'); });
    try { var _x=new XMLHttpRequest(); _x.open('POST','/__mockmeta',false); _x.send(JSON.stringify({ blueprint_z: 'BPZ', sketchbook_z: 'SKZ' })); } catch (e) {}
    window.DatumPurge.signOutWipe();
    var survivors = keys.filter(function (k) { return localStorage.getItem(k) != null || sessionStorage.getItem(k) != null; });
    var meta = {}; try { var _y=new XMLHttpRequest(); _y.open('GET','/__mockmeta',false); _y.send(); meta = JSON.parse(_y.responseText||'{}'); } catch (e) {}
    return { total: keys.length, survivors: survivors, bpZ: meta.blueprint_z, skZ: meta.sketchbook_z };
  });
  /* ⛔⛔ THIS LEG ONCE CLAIMED COMPLETENESS AND COULD NOT POSSIBLY MEASURE IT. Read the evaluate()
     above: the fixture is seeded FROM `DatumPurge._localCarriedKeys()` — the wipe's own source list
     — and then asserted against that same list. It asked "does the wipe sweep what the wipe
     sweeps?", which has exactly one answer. Its old name, "FULL sweep, no carried key survives",
     was read as coverage for five weeks while `datumfi.accountDossier.v15` — the key carrying a
     real user's date of birth, gross income, home location, email, phone, and his spouse's name and
     income — leaked past sign-out on every page load, INVISIBLE TO THIS GATE BY CONSTRUCTION.
     The Captain found it by accident in a browser.
       🔑 A GATE WHOSE FIXTURE IS SEEDED FROM THE THING IT TESTS IS NOT A WEAK GATE — IT IS A GREEN
          LIGHT WIRED TO ITSELF. And this file's header called that property a virtue ("full sweep
          derived from the source list, not a spot-check"). A HARD-CODED SPOT-CHECK WOULD AT LEAST
          HAVE BEEN CAPABLE OF GOING RED; the "better" design is the one that cannot see.
     WHAT IS KEPT AND WHY. The MECHANISM half was always real and is worth keeping: the wipe runs,
     it does clear the keys it names, and it does not touch the cloud blob. So the leg is renamed to
     claim only that, and the COMPLETENESS claim moves to the one instrument that can carry it —
     `_gate_signed_out_privacy.js` L4, whose population is a census of what the PRODUCT wrote, never
     a list either side maintains.
     ⛔ NEVER re-widen this name. If you want completeness, add a leg there, not a word here.
     ALSO DELETED: `check('swept the whole source list', wipe.total >= 14)` — a hard-coded count over
     a hand-maintained list wearing a number, inside the instrument meant to enforce that law. It
     could only ever detect the list SHRINKING, which is not the failure that happened. */
  check('(b) signOutWipe: executes and clears the keys IT NAMES (completeness = _gate_signed_out_privacy L4)',
    wipe.survivors.length === 0, wipe.survivors.join(','));
  check('(b) signOutWipe: Clerk blueprint_z UNTOUCHED (cloud survives)', wipe.bpZ === 'BPZ');
  check('(b) signOutWipe: Clerk sketchbook_z UNTOUCHED (cloud survives)', wipe.skZ === 'SKZ');

  /* THE BUTTON MOVED TO HOME (Captain, 2026-08-01) — so this coverage moved with it rather than
     being deleted. Deleting it would have been the easy read of a red test: the assertion that
     the ONLY sign-out control actually wipes the previous user's local plan is a privacy control
     on a shared machine, and it is worth more than the page it happened to be written against. */
  check('(b) sign-out button is NOT on Blueprint any more (Home-only)',
    await pBp.evaluate(() => !document.querySelector('[data-acct-action="signout"]')));
  check('(b) Blueprint page: no page errors', bpErrors.length === 0, bpErrors.slice(0, 3).join(' | '));
  await ctxBp.close();

  // ════════ (b-button) SIGN-OUT WIPE, on my-account.html — the page that now owns the button ════
  const ctxHome = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const pHome = await ctxHome.newPage();
  const homeErrors = [];
  pHome.on('pageerror', (e) => homeErrors.push(e.message));
  await pHome.route('**/*', (route) => /clerk\.|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await pHome.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { localStorage.setItem('datum-discover-v1', 'done'); } catch (e) {}
  });
  await pHome.addInitScript(installSignedIn);
  await pHome.goto(BASE + '/my-account.html', { waitUntil: 'commit' });
  try { await pHome.waitForSelector('[data-acct-action="signout"]', { timeout: 30000 }); } catch (e) {}

  /* LOAD-BEARING, and the reason my-account.html now preloads the purge module. The handler can
     inject it on demand, but that path races a fetch and gives up after 1.5s WITHOUT wiping --
     it fails open, by design, so sign-out is never blocked. On the one page that owns the button
     the module must already be there, or the wipe is a probability rather than a guarantee. */
  check('(b) DatumPurge is ALREADY loaded on Home, not fetched at click time',
    await pHome.evaluate(() => !!(window.DatumPurge && typeof window.DatumPurge.signOutWipe === 'function')));

  await pHome.evaluate(() => {
    window.DatumPurge._localCarriedKeys().forEach(function (k) { localStorage.setItem(k, 'LOCAL'); sessionStorage.setItem(k, 'SESS'); });
    try { var _x=new XMLHttpRequest(); _x.open('POST','/__mockmeta',false); _x.send(JSON.stringify({ blueprint_z: 'BPZ', sketchbook_z: 'SKZ' })); } catch (e) {}
  });
  const btnPresent = await pHome.evaluate(() => {
    var b = document.querySelector('[data-acct-action="signout"]');
    if (b) b.click();
    return !!b;
  });
  await pHome.waitForTimeout(900);
  const btnWipe = await pHome.evaluate(() => {
    var keys = window.DatumPurge._localCarriedKeys();
    var survivors = keys.filter(function (k) { return localStorage.getItem(k) != null || sessionStorage.getItem(k) != null; });
    var meta = {}; try { var _y=new XMLHttpRequest(); _y.open('GET','/__mockmeta',false); _y.send(); meta = JSON.parse(_y.responseText||'{}'); } catch (e) {}
    return { survivors: survivors, bpZ: meta.blueprint_z, skZ: meta.sketchbook_z };
  });
  check('(b) sign-out BUTTON present in topbar on Home', btnPresent);
  /* Same circularity, same correction as the b-core leg above: this seeds from _localCarriedKeys()
     too. What it genuinely proves — and the reason it stays — is that the real BUTTON is wired to
     the wipe at all. That is a mechanism claim and this fixture can carry it. It is NOT a proof
     that nothing personal survives sign-out; `_gate_signed_out_privacy.js` L4a/L4b own that, and
     they drive this same button on a census the product wrote. */
  check('(b) sign-out BUTTON is wired to the wipe (keys IT NAMES are cleared; completeness = _gate_signed_out_privacy L4)',
    btnWipe.survivors.length === 0, btnWipe.survivors.join(','));
  check('(b) sign-out BUTTON left cloud blob intact', btnWipe.bpZ === 'BPZ' && btnWipe.skZ === 'SKZ');
  await ctxHome.close();

  // ════════ (d) CSP — static.cloudflareinsights.com whitelisted + no CSP errors ════════
  const studioSrc = studioSource();
  const cspMeta = (studioSrc.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/i) || [''])[0];
  check('(d) Studio CSP whitelists static.cloudflareinsights.com', /script-src[^;]*static\.cloudflareinsights\.com/.test(cspMeta));
  check('(d) no CSP/beacon console errors on overlay opens', cspErrors.length === 0, cspErrors.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  console.log(JSON.stringify({ verdict: fails.length ? 'FAIL' : 'PASS', outState, inState, scratch, wipe, btnWipe, cspMetaHasCF: /static\.cloudflareinsights\.com/.test(cspMeta), cspErrors }, null, 2));
  process.exit(fails.length ? 1 : 0);
})();
