'use strict';
/* _gate_reveal_overlay_recovers.js — STANDING GATE (FINDING 73)
 *
 * THE INVARIANT:
 *
 *      A STUDIO THAT COMES BACK MUST NEVER COME BACK BEHIND A LIVE CINEMATIC OVERLAY.
 *
 * WHAT HAPPENED. Reveal your Range, then press Back. The tab is restored from the browser's
 * back/forward cache EXACTLY as it left — mid-animation, `#cinematic-overlay` still carrying
 * `.active`. That overlay is `position:fixed`, `100vw x 100vh`, `z-index:99999`, and when active it
 * takes `pointer-events:all`. IT HAS NO CLOSE BUTTON. Being behind it is being in a locked room.
 *   ⛔ EVERY OTHER DEFECT THIS ARC WAS A BAD EXPERIENCE. THIS ONE TRAPS THE USER WITH NO EXIT.
 *
 * WHY BFCACHE AND NOT SOMETHING ELSE — MEASURED, AND NOT BY THIS GATE:
 *   · Nothing in studio.html sets `.active` except the reveal click. A FRESH PARSE CANNOT PRODUCE
 *     IT. `datum_range_revealed` is read only by range.html:779, never here.
 *   · Production answers `Cache-Control: public, max-age=0, must-revalidate` — NOT `no-store`, so
 *     bfcache is permitted.
 *   · ⭐ THE CAPTAIN RAN THE DISCRIMINATOR IN THE BROWSER THAT REPRODUCES IT, 2026-09-02, and it
 *     returned `'active'`:
 *         document.getElementById('cinematic-overlay').className
 *     Removing the class freed the page. State PRESERVED, not rebuilt. One line, no other
 *     explanation, and it proved the fix's shape in the same breath.
 *
 * ⛔⛔ WHAT THIS GATE DOES **NOT** PROVE, STATED SO NOBODY BANKS IT:
 *   IT DOES NOT EXERCISE THE BACK/FORWARD CACHE. Headless Chromium in this harness returned
 *   `event.persisted === false` on every arm, WITH AND WITHOUT `--enable-features=BackForwardCache`.
 *   So the reproduction lives with the Captain's browser, and this gate covers THE RECOVERY — the
 *   half we control and the half a future edit can break.
 *   🔑 AN INSTRUMENT THAT CANNOT REACH A MECHANISM MUST SAY SO IN ITS OWN HEADER, OR ITS GREEN WILL
 *      BE READ AS COVERING THE MECHANISM.
 *
 * ── LEGS ─────────────────────────────────────────────────────────────────────────────────────
 *   R1 · EXISTENCE — the reset is published and the pageshow recovery is wired. ⭐ THIS IS THE
 *        PARTNER OF R3: a "does not fire" leg passes trivially when its subject is absent.
 *   R2 · THE RECOVERY — overlay active + button disabled, dispatch `pageshow`, both are cleared.
 *        ⚠️ DIRECT-CALL FIXTURE, LABELLED. It proves the recovery, NOT the bfcache path.
 *   R3 · THE ARM THAT MUST NOT FIRE — overlay NOT active, button disabled BY HAND, dispatch
 *        `pageshow`: the button MUST STAY DISABLED. ⛔ Without this, an unguarded recovery that
 *        stomps state on every single load passes R1 and R2 perfectly.
 *   R4 · THE REAL PATH STILL WORKS — a valid reveal still reaches range.html.
 *   R5 · THE HOIST DID NOT BREAK THE RETRY BUTTON (structural).
 *
 * ── CONTROLS — DISJOINT RED SETS ─────────────────────────────────────────────────────────────
 *   --defect   : unwires the pageshow recovery.        R1 + R2 RED, R3 green.
 *   --unguard  : drops the `.active` precondition.     R3 RED, R1 + R2 green.
 *   Both refuse to run before the fix exists rather than passing vacuously.
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_reveal_overlay_recovers.js            (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { studioSource } = require('./_studio_source.cjs');   // the ONLY door to the program's source
const ROOT = path.resolve(__dirname, '..');
const PORT = 8583;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webp': 'image/webp' };

const DEFECT = process.argv.includes('--defect');
const UNGUARD = process.argv.includes('--unguard');

const WIRE_LINE  = "      window.addEventListener('pageshow', _revealOverlayRecover);";
const GUARD_LINE = "        if (!ov || !ov.classList.contains('active')) return;";

let fails = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (!ok) fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '   [' + detail + ']' : ''));
}

/* ⛔ TWO SOURCES, TWO JOBS, AND CONFLATING THEM IS THE DEFECT _gate_studio_source EXISTS TO CATCH.
   The first draft of this file did `fs.readFileSync(<the shell>)` on ONE line and used it for both
   jobs. That is a census of the SHELL ALONE — and the shell is missing the five part files, so a
   forked `resetOverlayState` living in one of them would be INVISIBLE to R5, whose entire job is to
   prove there is only one.
   ⭐⭐ IT PASSED FOUR SUITE RUNS BEFORE ANYONE NOTICED, AND THE REASON IS ITS OWN LAW: the census
      reads `git ls-files`, this gate was UNTRACKED, and an untracked gate is invisible to the
      population that would have caught it. Committing it is what made it visible.
      🔑 GREEN WHILE INVISIBLE TO ITSELF IS NOT GREEN. (_gate_studio_source:119 wrote that down
         after being bitten by it; I read it only after being bitten by it too.)
   ⚠️ SPLITTING THE TOKENS ACROSS LINES WOULD SILENCE THE MATCHER WITHOUT FIXING ANYTHING. The
      census leg genuinely needs the composed program, so it gets studioSource(). The SHELL read
      below is a separate, honest job — a browser needs a servable HTML document, and studioSource()
      is a concatenation, not a page. */
const CENSUS_SRC = studioSource();                       // shell + the five parts — the PROGRAM
const SHELL_FILE = path.join(ROOT, 'studio.html');       // the servable document, for HTTP only
const SHELL_SRC = fs.readFileSync(SHELL_FILE, 'utf8');
const FIX_PRESENT = CENSUS_SRC.includes(WIRE_LINE) && CENSUS_SRC.includes(GUARD_LINE);
let served = SHELL_SRC;
/* The controls must bite on BOTH views or a leg would read around its own mutation. */
let STUDIO_SRC = CENSUS_SRC;
if (DEFECT || UNGUARD) {
  if (!FIX_PRESENT) {
    console.log('CONTROL REFUSED — the fix is not present in studio.html; there is nothing to mutate.');
    console.log('  wire  line expected: ' + WIRE_LINE.trim());
    console.log('  guard line expected: ' + GUARD_LINE.trim());
    process.exit(1);
  }
  const mutate = (s) => DEFECT ? s.replace(WIRE_LINE, '      /* --defect: recovery unwired */')
                               : s.replace(GUARD_LINE, '        if (!ov) return;');
  served     = mutate(SHELL_SRC);    // what the browser gets
  STUDIO_SRC = mutate(CENSUS_SRC);   // what the structural legs read
  if (served === SHELL_SRC || STUDIO_SRC === CENSUS_SRC) {
    console.log('CONTROL REFUSED — mutation changed no bytes in one of the two views.');
    console.log('  shell changed : ' + (served !== SHELL_SRC));
    console.log('  census changed: ' + (STUDIO_SRC !== CENSUS_SRC));
    process.exit(1);
  }
}

const FAKE = JSON.stringify({ tiers: { bedrock: 200000, foundation: 240000, keystone: 260000, capstone: 280000 },
  legacy: { blended_p50: 1000000 }, datum_spend: 100000 });
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/studio.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(served); }
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, ''));
  if (!full.startsWith(path.normalize(ROOT))) { res.writeHead(403).end(); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

const INIT = "(function(){ window.Clerk = { load:function(){return Promise.resolve();}," +
  " user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} }; })();";
const blockNet = (ctx) => ctx.route('**/*', (r) => {
  const u = r.request().url();
  if (/\/api\/calculate/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: FAKE });
  if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon|sentry/i.test(u)) return r.abort();
  return r.continue();
});

async function open(page) {
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  try { if (await page.locator('#studioCloseIntro').isVisible({ timeout: 2000 })) { await page.click('#studioCloseIntro'); await page.waitForTimeout(400); } } catch (_e) {}
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
}
async function seedForReveal(page) {
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(400);
  await page.fill('#pri-dob', '08/1982');
  await page.fill('#target-ret', '03/2035');
  await page.evaluate(() => { ['pri-dob', 'target-ret'].forEach((id) => { var e = document.getElementById(id); if (e) e.dispatchEvent(new Event('change', { bubbles: true })); }); });
  await page.waitForTimeout(700);
  /* ⛔ FILING STATUS BECAME A REQUIRED FIELD 2026-09-06, so a seed that omits it is now
     REFUSED at the reveal — correctly. This fixture predates the requirement and R4 went red
     over a product that had just become MORE honest. The repair is the fixture, not the gate.
     ⚠️ THE ASSIGNMENT IS ASSERTED, NOT ASSUMED: setting a <select> to a value it does not have
        is SILENT — it takes '' — so a future re-wording of these option labels would put this
        fixture back exactly where it was, refused, with nothing saying why. */
  const filedAs = await page.evaluate(() => {
    const el = document.getElementById('filing-status');
    if (!el) return '(no #filing-status)';
    const opt = Array.prototype.find.call(el.options, (o) => String(o.value).trim() !== '');
    if (!opt) return '(no answerable option)';
    el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  });
  if (!filedAs || filedAs.charAt(0) === '(') {
    console.log('⛔ SEED FAILED — filing status could not be set: ' + filedAs);
    process.exit(2);
  }
  await page.waitForTimeout(200);

  const room = await page.evaluate(() => {
    window.addInstance('taxable');
    var a = state.accounts[state.accounts.length - 1]; a.value = 1000000;
    if (typeof renderInputs === 'function') renderInputs();
    return state.accounts.filter((x) => (x.value || 0) > 0).length;
  });
  await page.evaluate(() => window._studioEnterRoom('measurement'));
  await page.waitForTimeout(500);
  return room;
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('MODE: ' + (DEFECT ? '--defect (recovery unwired)' : UNGUARD ? '--unguard (precondition dropped)' : 'clean'));
  console.log('fix present in source: ' + FIX_PRESENT);

  /* R1 · EXISTENCE — the partner of R3 */
  {
    const ctx = await browser.newContext(); await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const seen = await pg.evaluate(() => ({
      reset: typeof window._resetRevealOverlay,
      overlay: !!document.getElementById('cinematic-overlay')
    }));
    console.log('R1  window._resetRevealOverlay=' + seen.reset + '  overlay present=' + seen.overlay);
    check('R1 the reset is published as window._resetRevealOverlay', seen.reset === 'function', seen.reset);
    check('R1 the pageshow recovery is wired in source', STUDIO_SRC.includes(WIRE_LINE), STUDIO_SRC.includes(WIRE_LINE) ? 'found' : 'NOT FOUND');
    check('R1 the recovery carries its .active precondition', STUDIO_SRC.includes(GUARD_LINE), STUDIO_SRC.includes(GUARD_LINE) ? 'found' : 'NOT FOUND');
    await ctx.close();
  }

  /* R2 · THE RECOVERY (direct-call fixture, labelled) */
  {
    const ctx = await browser.newContext(); await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const before = await pg.evaluate(() => {
      /* Reproduce the state bfcache restores: overlay live, button dead. Set directly because this
         harness cannot drive the back/forward cache — see the header. */
      document.getElementById('cinematic-overlay').classList.add('active');
      var b = document.querySelector('.action-btn'); if (b) b.disabled = true;
      var l = document.getElementById('log-3'); if (l) l.classList.add('show');
      return { active: document.getElementById('cinematic-overlay').classList.contains('active'),
               disabled: b ? b.disabled : 'absent' };
    });
    check('R2 fixture actually installed the trapped state', before.active === true && before.disabled === true, JSON.stringify(before));
    const after = await pg.evaluate(() => {
      window.dispatchEvent(new Event('pageshow'));
      var b = document.querySelector('.action-btn');
      var l = document.getElementById('log-3');
      return { active: document.getElementById('cinematic-overlay').classList.contains('active'),
               disabled: b ? b.disabled : 'absent',
               logShown: l ? l.classList.contains('show') : 'absent' };
    });
    console.log('R2  trapped=' + JSON.stringify(before) + ' -> after pageshow=' + JSON.stringify(after));
    check('R2 the overlay is released', after.active === false, 'active=' + after.active);
    check('R2 the reveal button is usable again', after.disabled === false, 'disabled=' + after.disabled);
    check('R2 the animation state is reset too', after.logShown === false, 'log-3 shown=' + after.logShown);
    await ctx.close();
  }

  /* R3 · THE ARM THAT MUST NOT FIRE */
  {
    const ctx = await browser.newContext(); await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const r3 = await pg.evaluate(() => {
      var ov = document.getElementById('cinematic-overlay');
      ov.classList.remove('active');                       // NOT trapped
      var b = document.querySelector('.action-btn'); if (b) b.disabled = true;   // tripwire
      window.dispatchEvent(new Event('pageshow'));
      return { active: ov.classList.contains('active'), disabled: b ? b.disabled : 'absent' };
    });
    console.log('R3  overlay inactive + button disabled by hand, after pageshow: ' + JSON.stringify(r3));
    check('R3 the recovery did NOT fire when the overlay was inactive', r3.disabled === true,
      'button disabled=' + r3.disabled + ' (false means the recovery ran unguarded)');
    await ctx.close();
  }

  /* R4 · THE REAL PATH STILL WORKS */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const pg = await ctx.newPage(); await open(pg);
    const rooms = await seedForReveal(pg);
    check('R4 fixture has a funded room (a reveal over an empty estate proves nothing)', rooms > 0, 'funded rooms=' + rooms);
    await pg.click('.action-btn');
    let reached = false;
    try { await pg.waitForURL(/range\.html/, { timeout: 25000 }); reached = true; } catch (_e) {}
    console.log('R4  reveal -> ' + new URL(pg.url()).pathname);
    check('R4 a valid reveal still reaches range.html', reached, new URL(pg.url()).pathname);

    /* R6 (F74) — THE WORK COMES HOME. Reveal your Range, press Back, and the estate you drafted
       must still be there. It was not: the reveal called _studioClearDraft() immediately before
       navigating, so the draft — which is where ROOMS live — was destroyed on the way out.
       ⛔ AND THE FAILURE WAS HALF-INVISIBLE, WHICH IS WHY IT SURVIVED. The PROFILE came back,
          because those are form inputs and the BROWSER caches them; the ROOMS did not, because
          they are JS state and only our draft carries them. Two persistence mechanisms, one of
          which we do not own.
          🔑 HALF-RESTORED IS WORSE THAN EITHER EXTREME — it looks like it worked, so the user
             hits Reveal and is refused for a reason they believe they already satisfied.
       ⚖️ Captain-ruled: the draft simply survives. No "already revealed" state was invented. */
    if (reached) {
      await pg.goBack({ waitUntil: 'load' });
      await pg.waitForTimeout(1800);
      const home = await pg.evaluate(() => ({
        rooms: (typeof state !== 'undefined' && state.accounts) ? state.accounts.length : 'no state',
        funded: (typeof state !== 'undefined' && state.accounts) ? state.accounts.filter((a) => (a.value || 0) > 0).length : 0,
        dob: (document.getElementById('pri-dob') || {}).value
      }));
      console.log('R6  after Back from the Range: ' + JSON.stringify(home));
      check('R6 fixture precondition — the profile came home (so this leg is about ROOMS)', !!home.dob, 'pri-dob="' + home.dob + '"');
      check('R6 THE WORK COMES HOME — the drafted estate survives a Back from the Range',
        home.funded > 0, 'funded rooms after Back = ' + home.funded + ' (0 = the draft was destroyed on the way out)');
    }
    await ctx.close();
  }

  /* R5 · THE HOIST DID NOT BREAK THE RETRY BUTTON (structural) */
  check('R5 the retry button is still wired to the reset', /retryBtn\.onclick = resetOverlayState/.test(STUDIO_SRC), 'source read');
  check('R5 exactly one resetOverlayState definition survives the hoist',
    (STUDIO_SRC.match(/function resetOverlayState\(\)/g) || []).length === 1,
    (STUDIO_SRC.match(/function resetOverlayState\(\)/g) || []).length + ' definitions');

  await browser.close(); server.close();
  console.log('\n' + results.join('\n'));
  console.log('\nOVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (results.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_x) {} process.exit(2); });
