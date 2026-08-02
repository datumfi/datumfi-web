'use strict';
/* _nav_chrome_render_parity.js — P1/P2 RENDER GATE
 *
 * Asserts what the USER SEES in the nav chrome across auth-state x page, for all 5
 * canonical states. Its primary job is the R3 risk: prove the Studio view-toggles
 * SURVIVE sign-in (account-topbar must re-render them; they silently vanish today).
 *
 *   (1) signed-OUT Studio : renamed "Save Current Blueprint" + Upgrade + Sign In +
 *                           seam toggles; NO Range/Philosophy/Feedback; no topbar.
 *   (2) signed-IN  Studio : Save after The Archive + Upgrade + NO Sign Out +
 *                           toggles present (survive) + #app-nav hidden.
 *   (3) signed-OUT Sketch : "Save Current Sketch" after Sketch + Upgrade + Sign In.
 *   (4) signed-IN  Sketch : Save after The Sketchbook + Upgrade + NO Sign Out +
 *                           NO studio toggles (must not leak).
 *   (5) signed-IN  Home   : Sign Out PRESENT. THE LOAD-BEARING HALF.
 *
 * ── THE SIGN-OUT RULE CHANGED 2026-08-01 (Captain): the door lives on Home ONLY. ──
 * States 2 and 4 used to assert "Sign Out present" and were FLIPPED to "absent" — but a pair of
 * absence assertions is exactly the shape that passes when the button is deleted from the product
 * entirely. State (5) exists so the suite cannot mistake "moved" for "gone". Never flip a
 * presence assertion to an absence assertion without adding the place it moved TO.
 * Also asserted from here: the Dossier lost its permanent tab, while Home KEPT its tab — because
 * Home is now the only route to both the Dossier and the sign-out door, and a bar that dropped
 * both would strand a signed-in user with no way out.
 *
 * Signed-in is simulated with sessionStorage.datum_auth_hint='1' (nav.js injects the
 * account-topbar on that flag; no real Clerk session needed for render assertions).
 *
 * Run: node scripts/_nav_chrome_render_parity.js  (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
/* RED-FIRST for the 2026-08-01 nav change: --restore serves the bar as it was, with the Dossier
   tab back and Sign Out on every page. States 2 and 4 go red; state 5 stays GREEN, because the
   button was always present on Home — that disjointness is what shows the new assertions measure
   "moved" rather than merely "exists somewhere". */
const RESTORE = process.argv.includes('--restore');
const A_PROFILE = "      +     makeTab('welcome',      'Home',         active)\n      +   '</div>'";
const M_PROFILE = "      +     makeTab('welcome',      'Home',         active)\n      +     makeTab('profile',      'My Profile',   active)\n      +   '</div>'";
const A_SIGNOUT = "    if (active !== 'welcome') return '';";
const M_SIGNOUT = "    if (false) return '';";
let jsDiffers = false;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (RESTORE && /account-topbar\.js$/.test(p)) {
    let src = fs.readFileSync(fp, 'utf8'); const orig = src;
    for (const [a, m, label] of [[A_PROFILE, M_PROFILE, 'A_PROFILE'], [A_SIGNOUT, M_SIGNOUT, 'A_SIGNOUT']]) {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    }
    jsDiffers = jsDiffers || (src !== orig);
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(src);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

(async () => {
  await new Promise((r) => server.listen(8139, '127.0.0.1', r));
  const browser = await chromium.launch();
  const base = 'http://127.0.0.1:8139';

  /* `clerk` stubs a resolved Clerk session. Studio and Sketch inject the bar off the auth hint
     alone, but my-account.html gates on a real session, so the hint by itself leaves it with no
     top bar at all — and an absence assertion against a missing container passes for the wrong
     reason. Measured: state (5) reported "Dossier tab removed" GREEN while nothing had rendered. */
  async function load(urlPath, signedIn, clerk) {
    const ctx = await browser.newContext({ viewport: { width: 1680, height: 900 } });
    if (signedIn) await ctx.addInitScript(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
    if (clerk) {
      /* The real Clerk script must be blocked or it replaces the stub with an UNAUTHENTICATED SDK
         and the page bounces to the vault before the bar mounts. Same shape as the fixture fault
         recorded on 2026-08-01: nulling the user made the page redirect, so nothing under test
         ever ran and it read as a dead feature. Block the network, keep the stub. */
      await ctx.route('**/*', (route) => {
        const u = route.request().url();
        if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
        return route.abort();
      });
    }
    if (clerk) await ctx.addInitScript(`(() => {
      try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch(e){}
      window.Clerk = { load: function(){ return Promise.resolve(); },
        session: { getToken: function(){ return Promise.resolve('tok'); } },
        user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
                update: function(){ return Promise.resolve(); } } };
    })();`);
    const page = await ctx.newPage();
    await page.goto(base + urlPath, { waitUntil: clerk ? 'commit' : 'load' });
    if (signedIn) { try { await page.waitForSelector('#acct-topbar', { timeout: clerk ? 30000 : 8000 }); } catch (e) {} }
    await page.waitForTimeout(clerk ? 2000 : 700);
    return { ctx, page };
  }

  /* ── (1) signed-OUT Studio ── */
  {
    const { ctx, page } = await load('/studio.html', false);
    const r = await page.evaluate(() => {
      const nav = document.getElementById('app-nav');
      const save = document.getElementById('studio-save-bp-btn');
      const navTxt = nav ? nav.innerText : '';
      return {
        navVisible: !!nav && getComputedStyle(nav).display !== 'none',
        saveText: save ? save.textContent.trim() : null,
        hasUpgrade: !!document.querySelector('#app-nav .nav-upgrade-btn'),
        hasSignIn: /Sign In/i.test(navTxt),
        toggleCount: document.querySelectorAll('#app-nav .view-toggle.studio-seam .view-btn').length,
        noRange: !document.getElementById('nav-range-link') && !/\bRange\b/.test(navTxt),
        noPhilosophy: !/Philosophy/i.test(navTxt),
        noFeedback: !document.querySelector('#app-nav .nav-feedback-btn'),
        noTopbar: !document.getElementById('acct-topbar')
      };
    });
    console.log('[1] signed-OUT Studio');
    check('1.app-nav visible', r.navVisible);
    check('1.save label -> "⤓ Save"', r.saveText === '⤓ Save', r.saveText);
    check('1.Upgrade present', r.hasUpgrade);
    check('1.Sign In present', r.hasSignIn);
    check('1.seam toggles present (3)', r.toggleCount === 3, r.toggleCount);
    check('1.Range removed', r.noRange);
    check('1.Philosophy removed', r.noPhilosophy);
    check('1.Feedback removed', r.noFeedback);
    check('1.no account-topbar (signed out)', r.noTopbar);
    await ctx.close();
  }

  /* ── (2) signed-IN Studio ── */
  {
    const { ctx, page } = await load('/studio.html', true);
    const r = await page.evaluate(() => {
      const tb = document.getElementById('acct-topbar');
      const appNav = document.getElementById('app-nav');
      const save = tb && tb.querySelector('[data-acct-action="save-current"]');
      const mybp = tb && tb.querySelector('[data-acct-tab="myblueprints"]');
      let saveAfterMyBp = false;
      if (save && mybp) saveAfterMyBp = !!(mybp.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        topbar: !!tb,
        appNavHidden: !appNav || getComputedStyle(appNav).display === 'none',
        saveText: save ? save.textContent.trim() : null,
        saveAfterMyBp: saveAfterMyBp,
        hasUpgrade: !!(tb && tb.querySelector('.acct-upgrade')),
        hasSignOut: !!(tb && tb.querySelector('.acct-signout')),
        /* Negated form deliberately requires the BAR to exist: "no profile tab" must not be
           satisfiable by "no top bar". Same reason hasSignOut is read through noSignOut below. */
        noProfileTab: !!tb && !tb.querySelector('[data-acct-tab="profile"]'),
        noSignOut: !!tb && !tb.querySelector('.acct-signout'),
        hasHomeTab: !!(tb && tb.querySelector('[data-acct-tab="welcome"]')),
        togglesSurvive: tb ? tb.querySelectorAll('.acct-studio-toggle .view-btn').length : 0,
        setViewModeFn: typeof window.setViewMode === 'function'
      };
    });
    console.log('[2] signed-IN Studio');
    check('2.account-topbar injected', r.topbar);
    check('2.#app-nav hidden', r.appNavHidden);
    check('2.Save label present', r.saveText === '⤓ Save', r.saveText);
    check('2.Save sits after The Archive', r.saveAfterMyBp);
    check('2.Upgrade present', r.hasUpgrade);
    check('2.Sign Out ABSENT away from Home (bar present)', r.noSignOut);
    check('2.Dossier tab removed from the bar (bar present)', r.noProfileTab);
    check('2.Home tab KEPT — the only route to the Dossier and to sign-out', r.hasHomeTab);
    check('2.STUDIO TOGGLES SURVIVE sign-in (3)', r.togglesSurvive === 3, r.togglesSurvive);
    check('2.setViewMode reachable for toggles', r.setViewModeFn);
    await ctx.close();
  }

  /* ── (3) signed-OUT Sketch ── */
  {
    const { ctx, page } = await load('/sketch.html', false);
    const r = await page.evaluate(() => {
      const nav = document.getElementById('app-nav');
      const save = document.getElementById('sketch-save-btn');
      const sketchLink = document.getElementById('nav-link-sketch');
      let saveAfterSketch = false;
      if (save && sketchLink) saveAfterSketch = !!(sketchLink.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        navVisible: !!nav && getComputedStyle(nav).display !== 'none',
        saveText: save ? save.textContent.trim() : null,
        saveAfterSketch: saveAfterSketch,
        hasUpgrade: !!document.querySelector('#app-nav .nav-upgrade-btn'),
        hasSignIn: /Sign In/i.test(nav ? nav.innerText : ''),
        noTopbar: !document.getElementById('acct-topbar')
      };
    });
    console.log('[3] signed-OUT Sketch');
    check('3.app-nav visible', r.navVisible);
    check('3.Save label present', r.saveText === '⤓ Save', r.saveText);
    check('3.Save sits after Sketch link', r.saveAfterSketch);
    check('3.Upgrade present', r.hasUpgrade);
    check('3.Sign In present', r.hasSignIn);
    check('3.no account-topbar (signed out)', r.noTopbar);
    await ctx.close();
  }

  /* ── (4) signed-IN Sketch ── */
  {
    const { ctx, page } = await load('/sketch.html', true);
    const r = await page.evaluate(() => {
      const tb = document.getElementById('acct-topbar');
      const save = tb && tb.querySelector('[data-acct-action="save-current"]');
      const mysk = tb && tb.querySelector('[data-acct-tab="sketches"]');
      let saveAfterMySk = false;
      if (save && mysk) saveAfterMySk = !!(mysk.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        topbar: !!tb,
        saveText: save ? save.textContent.trim() : null,
        saveAfterMySk: saveAfterMySk,
        hasUpgrade: !!(tb && tb.querySelector('.acct-upgrade')),
        hasSignOut: !!(tb && tb.querySelector('.acct-signout')),
        /* Negated form deliberately requires the BAR to exist: "no profile tab" must not be
           satisfiable by "no top bar". Same reason hasSignOut is read through noSignOut below. */
        noProfileTab: !!tb && !tb.querySelector('[data-acct-tab="profile"]'),
        noSignOut: !!tb && !tb.querySelector('.acct-signout'),
        hasHomeTab: !!(tb && tb.querySelector('[data-acct-tab="welcome"]')),
        noStudioToggles: !(tb && tb.querySelector('.acct-studio-toggle'))
      };
    });
    console.log('[4] signed-IN Sketch');
    check('4.account-topbar injected', r.topbar);
    check('4.Save label present', r.saveText === '⤓ Save', r.saveText);
    check('4.Save sits after The Sketchbook', r.saveAfterMySk);
    check('4.Upgrade present', r.hasUpgrade);
    check('4.Sign Out ABSENT away from Home (bar present)', r.noSignOut);
    check('4.Dossier tab removed from the bar (bar present)', r.noProfileTab);
    check('4.Home tab KEPT — the only route to the Dossier and to sign-out', r.hasHomeTab);
    check('4.NO studio toggles leak onto Sketch', r.noStudioToggles);
    await ctx.close();
  }

  /* ── (5) signed-IN Home — THE LOAD-BEARING HALF ──────────────────────────────────────────
     Without this state, "Sign Out absent on Studio" and "Sign Out absent on Sketch" would both
     go green on a build where the button had been deleted outright. This is the assertion that
     tells "moved" apart from "gone", and it also proves the button still WORKS: the sign-out
     click handler is bound at mount, so a button that rendered without its listener would be a
     dead door on the only page that has one. */
  {
    const { ctx, page } = await load('/my-account.html', true, true);
    const r = await page.evaluate(() => {
      const tb = document.getElementById('acct-topbar');
      const so = tb && tb.querySelector('.acct-signout');
      /* PROVE THE LISTENER IS ATTACHED, via a real side effect rather than a stub. The handler's
         FIRST synchronous act is to clear datum_auth_hint; everything after it (the purge script,
         Clerk.signOut, location.replace) is async or unavailable here. So: confirm the hint is
         set, click, read it back in the same turn. Gone === the handler ran.
         location.replace was tried first and is NOT redefinable in Chromium — it threw, the check
         went red, and that red was the instrument, not the product. Recorded so the next person
         does not retry it. */
      let clicksHandled = null;
      if (so) {
        const hintBefore = sessionStorage.getItem('datum_auth_hint');
        if (!hintBefore) {
          clicksHandled = 'precondition failed: no auth hint to clear';
        } else {
          so.click();
          clicksHandled = sessionStorage.getItem('datum_auth_hint') === null;
        }
      }
      return {
        topbar: !!tb,
        hasSignOut: !!so,
        label: so ? so.textContent.trim() : null,
        /* Negated form deliberately requires the BAR to exist: "no profile tab" must not be
           satisfiable by "no top bar". Same reason hasSignOut is read through noSignOut below. */
        noProfileTab: !!tb && !tb.querySelector('[data-acct-tab="profile"]'),
        noSignOut: !!tb && !tb.querySelector('.acct-signout'),
        hasHomeTab: !!(tb && tb.querySelector('[data-acct-tab="welcome"]')),
        clicksHandled: clicksHandled
      };
    });
    console.log('[5] signed-IN Home');
    check('5.account-topbar injected', r.topbar);
    check('5.Sign Out PRESENT on Home — proves it MOVED, not vanished', r.hasSignOut);
    check('5.Sign Out label unchanged', r.label === 'Sign Out', r.label);
    check('5.Dossier tab removed here too (reached by its Home tile)', r.noProfileTab);
    check('5.Home tab present', r.hasHomeTab);
    check('5.the Sign Out button is WIRED, not just drawn', r.clicksHandled === true, r.clicksHandled);
    await ctx.close();
  }

  await browser.close(); server.close();
  if (RESTORE) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (account-topbar.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
    console.log(fails.length ? ('RED-FIRST OK — the mutation BIT: ' + fails.join(', ')) : 'RED-FIRST FAILED — the old bar came back and nothing noticed.');
    process.exit(fails.length ? 0 : 1);
  }
  console.log(fails.length ? ('\nRED — ' + fails.length + ' failure(s): ' + fails.join(', ')) : '\nGREEN — all 5 nav-chrome states render correctly');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); server.close(); process.exit(2); });
