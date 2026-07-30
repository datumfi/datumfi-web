'use strict';
/* _nav_chrome_render_parity.js — P1/P2 RENDER GATE
 *
 * Asserts what the USER SEES in the nav chrome across auth-state x page, for all 4
 * canonical states. Its primary job is the R3 risk: prove the Studio view-toggles
 * SURVIVE sign-in (account-topbar must re-render them; they silently vanish today).
 *
 *   (1) signed-OUT Studio : renamed "Save Current Blueprint" + Upgrade + Sign In +
 *                           seam toggles; NO Range/Philosophy/Feedback; no topbar.
 *   (2) signed-IN  Studio : Save Current Blueprint after My Blueprints + Upgrade +
 *                           Sign Out + toggles present (survive) + #app-nav hidden.
 *   (3) signed-OUT Sketch : "Save Current Sketch" after Sketch + Upgrade + Sign In.
 *   (4) signed-IN  Sketch : Save Current Sketch after My Sketches + Upgrade +
 *                           Sign Out + NO studio toggles (must not leak).
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
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
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

  async function load(urlPath, signedIn) {
    const ctx = await browser.newContext({ viewport: { width: 1680, height: 900 } });
    if (signedIn) await ctx.addInitScript(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(base + urlPath, { waitUntil: 'load' });
    if (signedIn) { try { await page.waitForSelector('#acct-topbar', { timeout: 8000 }); } catch (e) {} }
    await page.waitForTimeout(700);
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
        togglesSurvive: tb ? tb.querySelectorAll('.acct-studio-toggle .view-btn').length : 0,
        setViewModeFn: typeof window.setViewMode === 'function'
      };
    });
    console.log('[2] signed-IN Studio');
    check('2.account-topbar injected', r.topbar);
    check('2.#app-nav hidden', r.appNavHidden);
    check('2.Save label present', r.saveText === '⤓ Save', r.saveText);
    check('2.Save sits after My Blueprints', r.saveAfterMyBp);
    check('2.Upgrade present', r.hasUpgrade);
    check('2.Sign Out present', r.hasSignOut);
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
        noStudioToggles: !(tb && tb.querySelector('.acct-studio-toggle'))
      };
    });
    console.log('[4] signed-IN Sketch');
    check('4.account-topbar injected', r.topbar);
    check('4.Save label present', r.saveText === '⤓ Save', r.saveText);
    check('4.Save sits after My Sketches', r.saveAfterMySk);
    check('4.Upgrade present', r.hasUpgrade);
    check('4.Sign Out present', r.hasSignOut);
    check('4.NO studio toggles leak onto Sketch', r.noStudioToggles);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(fails.length ? ('\nRED — ' + fails.length + ' failure(s): ' + fails.join(', ')) : '\nGREEN — all 4 nav-chrome states render correctly');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); server.close(); process.exit(2); });
