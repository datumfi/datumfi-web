'use strict';
/* _gate_coarch_reveal_matches_toggle.js — STANDING GATE (FINDING 71)
 *
 * THE INVARIANT, AND IT IS DELIBERATELY NOT A SYMPTOM:
 *
 *      THE CO-ARCHITECT'S REVEALED STATE MUST AGREE WITH ITS TOGGLE ON EVERY ENTRY TO THE
 *      STUDIO — INCLUDING ENTRIES THE PAGE DID NOT PERFORM.
 *
 * WHY WORDED THAT WAY. The defect showed up as "the co-architect fields are missing", but the
 * fields were never the subject. `#co-arch-fields` is revealed by exactly ONE thing in the whole
 * codebase — the `change` listener on `#co-arch-toggle` (studio.html:5171). Every path that turns
 * the toggle on therefore has to remember to fire that event. That is a contract with the FUTURE,
 * and the browser is not a party to it:
 *
 *   MEASURED 2026-09-02, in a 20-line page with ZERO Studio code (the platform as the subject,
 *   before any claim about our code):
 *     back-navigation  parse-time script sees checked=false, text=""  ->  afterwards checked=TRUE,
 *                      text="HELLO", and the reveal listener NEVER RAN
 *     reload           parse-time sees false/"" -> afterwards false/"" (no restoration at all)
 *
 *   Chromium restores form-control state from the session-history entry AFTER every parse-time
 *   script has finished, and it fires NO event doing it. So on a back-navigation the toggle turns
 *   itself on behind the page's back, and three containers stay `display:none` forever.
 *
 * WHY IT NEEDED BOTH CONDITIONS, WHICH IS ALSO WHY THE SMOKE MISSED IT. Measured as a factorial:
 *     draft intact  + reload  -> revealed (restoreDraft dispatches the event: fine)
 *     draft intact  + back    -> revealed (same)
 *     draft CLEARED + back    -> HIDDEN, toggle ON, header reverted to "01 / YOUR TIMELINE"
 *   The Range reveal calls `_studioClearDraft()` immediately before navigating (studio.html:14803),
 *   so "generate a Range, press Back" is precisely and only the path that produces it. A reload
 *   test can never see this.
 *
 * ⛔ IT IS NOT COSMETIC. The same missed event hides `#ss-co-arch-estimates`, which CONTAINS
 *    ss-sec-62/67/70 — and studio.html:17501 refuses to run the SS Matrix while the toggle is
 *    checked and those are empty. The page can demand data through a form it is hiding.
 *    ⚠️ SOURCE-READ, NOT MEASURED. This gate does not drive the button to that branch (it needs an
 *    account plus all three primary estimates first). Stated so it cannot become a measurement by
 *    repetition.
 *
 * ── LEGS ─────────────────────────────────────────────────────────────────────────────────────
 *   L1  · THE INVARIANT — draft cleared + back-navigation, toggle ON: all three containers
 *         visible and the timeline header reads PRIMARY.        ⭐ RED ON PRE-FIX BYTES.
 *   L2  · PAIRED — reload with the draft intact still reveals. Guards the fix against breaking
 *         the path that already worked.
 *   L3  · PAIRED — back-navigation with the draft intact still reveals.
 *   L4  · THE ARM THAT MUST READ HIDDEN — toggle OFF + back-navigation: all three hidden and the
 *         header reads YOUR. ⛔ WITHOUT THIS LEG, A FIX THAT SIMPLY FORCES display:block PASSES
 *         L1-L3 PERFECTLY AND DESTROYS THE FEATURE.
 *   L5a · STRUCTURAL — the load-time sync must CALL the pure visibility function and must NOT
 *         dispatch an event.
 *   L5b · THE TRAP, MADE CONCRETE — co-architect ACCOUNTS survive a sync taken while the toggle
 *         reads off.
 *
 * 🔑 WHY L5 EXISTS AT ALL, AND IT IS THE REASON THIS GATE EARNS ITS KEEP:
 *      A HANDLER THAT BOTH REVEALS AND DESTROYS CANNOT BE REPLAYED.
 *    The obvious fix for L1 is "fire the change event at load". That same handler DELETES EVERY
 *    CO-ARCHITECT ACCOUNT on its off-branch (studio.html:5177-5184). Replaying it at a moment when
 *    the toggle reads off would silently destroy the user's rooms — a data-loss defect introduced
 *    by the fix for a display defect. L5 is the leg that fails when someone reaches for that.
 *
 * ⚠️ L5b IS A DIRECT-CALL FIXTURE AND IS LABELLED AS ONE. It sets the toggle off WITHOUT firing
 *    change, then dispatches `pageshow`. That proves the SYNC, not a user journey. It exists
 *    because the biting state (co-arch rooms present while the toggle reads off at sync time) is
 *    reachable but not easily driven, and a hazard nobody can demonstrate becomes a hazard nobody
 *    believes.
 *
 * ── CONTROLS — two, producing DISJOINT red sets ──────────────────────────────────────────────
 *   --defect : deletes the load-time sync, restoring pre-fix behaviour.  L1 must go RED.
 *   --replay : swaps the sync's body for `coToggle.dispatchEvent(new Event('change'))` — the
 *              tempting wrong fix.  L1 stays GREEN (it does reveal); L5a and L5b must go RED.
 *   Both refuse to run before the fix exists rather than passing vacuously.
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_coarch_reveal_matches_toggle.js            (exit 0 = GREEN)
 *      node scripts/_gate_coarch_reveal_matches_toggle.js --defect
 *      node scripts/_gate_coarch_reveal_matches_toggle.js --replay
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8579;
const BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain' };

const DEFECT = process.argv.includes('--defect');
const REPLAY = process.argv.includes('--replay');

/* The fix's own line, verbatim. Both controls anchor here. If this string stops matching, the
   controls REFUSE rather than silently testing nothing — an unarmed control is worse than none. */
const SYNC_LINE = "    window.addEventListener('pageshow', function () { _applyCoArchVisibility(); });";
const SYNC_REPLAY = "    window.addEventListener('pageshow', function () { coToggle.dispatchEvent(new Event('change')); });";

let fails = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (!ok) fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '   [' + detail + ']' : ''));
}

/* ---------------- source + mutation ---------------- */
const STUDIO_PATH = path.join(ROOT, 'studio.html');
const STUDIO_SRC = fs.readFileSync(STUDIO_PATH, 'utf8');
const FIX_PRESENT = STUDIO_SRC.includes(SYNC_LINE);

let servedStudio = STUDIO_SRC;
if (DEFECT || REPLAY) {
  if (!FIX_PRESENT) {
    console.log('CONTROL REFUSED — the fix is not present in studio.html, so there is nothing to');
    console.log('mutate. A control that cannot find its anchor must not report a verdict.');
    console.log('  expected line: ' + SYNC_LINE.trim());
    process.exit(1);
  }
  servedStudio = DEFECT
    ? STUDIO_SRC.replace(SYNC_LINE, '    /* --defect: load-time sync removed */')
    : STUDIO_SRC.replace(SYNC_LINE, SYNC_REPLAY);
  if (servedStudio === STUDIO_SRC) { console.log('CONTROL REFUSED — mutation did not change the bytes.'); process.exit(1); }
}

/* ---------------- server ---------------- */
const PROBE_B = '<!doctype html><html><body>away</body></html>';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/gate/away.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PROBE_B); }
  if (p === '/studio.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(servedStudio); }
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, ''));
  if (!full.startsWith(path.normalize(ROOT))) { res.writeHead(403).end(); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

/* Signed-in with EMPTY metadata: no household, so the Dossier seed path finds nothing and cannot
   mask a draft failure. This is the incognito-equivalent that removed the F64 mask. */
const INIT = "(function(){ window.Clerk = { load:function(){return Promise.resolve();}," +
  " user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} }; })();";
const blockNet = (ctx) => ctx.route('**/*', (r) => {
  const u = r.request().url();
  if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon|sentry/i.test(u)) return r.abort();
  return r.continue();
});

/* ---------------- page helpers ---------------- */
async function enterStudio(page) {
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  try { if (await page.locator('#studioCloseIntro').isVisible({ timeout: 2000 })) { await page.click('#studioCloseIntro'); await page.waitForTimeout(400); } } catch (_e) {}
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(400);
}
async function reEnter(page) {
  await page.waitForTimeout(1400);
  try { if (await page.locator('#studioCloseIntro').isVisible({ timeout: 2500 })) { await page.click('#studioCloseIntro'); await page.waitForTimeout(400); } } catch (_e) {}
  try {
    await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
    await page.evaluate(() => window._studioEnterRoom('data'));
  } catch (_e) {}
  await page.waitForTimeout(600);
}
/* DISTINGUISHING FIXTURE: 05/1980 and 05/2035 are values no fallback in this page can produce —
   the co-architect fields have no default and no derivation from the primary's dates. So a field
   holding them was RESTORED; it did not fall back. */
async function fillProfile(page, withCo) {
  await page.fill('#pri-dob', '08/1982');
  await page.fill('#target-ret', '03/2035');
  if (withCo) {
    await page.locator('label.switch:has(#co-arch-toggle) span.slider').click();
    await page.waitForTimeout(300);
    await page.fill('#co-dob', '05/1980');
    await page.fill('#co-ret', '05/2035');
  }
  await page.evaluate(() => {
    ['pri-dob', 'target-ret', 'co-dob', 'co-ret'].forEach(function (id) {
      var e = document.getElementById(id); if (e) e.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(1600);
}
const observe = (page) => page.evaluate(() => {
  const g = (id) => document.getElementById(id);
  const disp = (id) => { const e = g(id); return e ? getComputedStyle(e).display : 'absent'; };
  return {
    checked: g('co-arch-toggle') ? g('co-arch-toggle').checked : 'absent',
    fields: disp('co-arch-fields'), ssStrat: disp('ss-co-arch-strategy'), ssEst: disp('ss-co-arch-estimates'),
    header: g('timeline-header-have') ? g('timeline-header-have').textContent.trim() : 'absent',
    coDob: (g('co-dob') || {}).value, coRet: (g('co-ret') || {}).value
  };
});

/* One arm: seed, optionally clear the draft, navigate, come back, observe. */
async function arm(browser, { withCo, clearDraft, nav }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  await ctx.addInitScript(INIT); await blockNet(ctx);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await enterStudio(page);
  await fillProfile(page, withCo);
  const pre = await observe(page);
  if (clearDraft) {
    /* Replicates studio.html:14803 — the two lines the Range reveal runs immediately before
       navigating. Scripted, not a click-through of the reveal (which would need a metered call). */
    await page.evaluate(() => { if (typeof window._studioClearDraft === 'function') { window._studioClearDraft(); window._studioBp = null; } });
  }
  if (nav === 'back') {
    await page.goto(BASE + '/gate/away.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.goBack({ waitUntil: 'load' });
  } else {
    await page.reload({ waitUntil: 'load' });
  }
  await reEnter(page);
  const post = await observe(page);
  await ctx.close();
  return { pre, post, errs };
}

const REVEALED = (o) => o.fields === 'block' && o.ssStrat === 'block' && o.ssEst === 'block' && o.header === '01 / PRIMARY TIMELINE';
const HIDDEN = (o) => o.fields === 'none' && o.ssStrat === 'none' && o.ssEst === 'none' && o.header === '01 / YOUR TIMELINE';
const shape = (o) => 'checked=' + o.checked + ' fields=' + o.fields + ' ssStrat=' + o.ssStrat + ' ssEst=' + o.ssEst + ' header="' + o.header + '"';

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('MODE: ' + (DEFECT ? '--defect (sync removed)' : REPLAY ? '--replay (sync dispatches change)' : 'clean'));
  console.log('fix present in source: ' + FIX_PRESENT);

  /* L1 — THE INVARIANT */
  const a1 = await arm(browser, { withCo: true, clearDraft: true, nav: 'back' });
  console.log('L1 seeded : ' + shape(a1.pre));
  console.log('L1 after  : ' + shape(a1.post) + ' coDob="' + a1.post.coDob + '"');
  check('L1 seeded state was actually revealed (fixture sanity)', REVEALED(a1.pre), shape(a1.pre));
  check('L1 toggle came back ON (the browser restored it — precondition for the claim)', a1.post.checked === true, 'checked=' + a1.post.checked);
  check('L1 draft cleared + back-navigation: reveal agrees with the toggle', REVEALED(a1.post), shape(a1.post));

  /* L2 — PAIRED, reload */
  const a2 = await arm(browser, { withCo: true, clearDraft: false, nav: 'reload' });
  console.log('L2 after  : ' + shape(a2.post));
  check('L2 reload with draft intact still reveals', REVEALED(a2.post), shape(a2.post));

  /* L3 — PAIRED, back */
  const a3 = await arm(browser, { withCo: true, clearDraft: false, nav: 'back' });
  console.log('L3 after  : ' + shape(a3.post));
  check('L3 back-navigation with draft intact still reveals', REVEALED(a3.post), shape(a3.post));

  /* L4 — THE ARM THAT MUST READ HIDDEN */
  const a4 = await arm(browser, { withCo: false, clearDraft: true, nav: 'back' });
  console.log('L4 after  : ' + shape(a4.post));
  check('L4 toggle OFF + back-navigation: everything stays HIDDEN', HIDDEN(a4.post), shape(a4.post));
  check('L4 toggle really was off (the arm is measuring what it claims)', a4.post.checked === false, 'checked=' + a4.post.checked);

  /* L5a — STRUCTURAL */
  const syncLines = servedStudio.split('\n').filter((l) => /addEventListener\(\s*'pageshow'/.test(l));
  const syncBody = syncLines.join(' | ');
  check('L5a exactly one pageshow sync is wired', syncLines.length === 1, syncLines.length + ' found');
  check('L5a the sync CALLS the pure visibility function', /_applyCoArchVisibility\(\)/.test(syncBody), syncBody.trim().slice(0, 120));
  check('L5a the sync does NOT replay the handler (no dispatchEvent)', !/dispatchEvent/.test(syncBody), syncBody.trim().slice(0, 120));

  /* L5b — THE TRAP, MADE CONCRETE (direct-call fixture, labelled) */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    await ctx.addInitScript(INIT); await blockNet(ctx);
    const page = await ctx.newPage();
    await enterStudio(page);
    await fillProfile(page, true);
    const seeded = await page.evaluate(() => {
      window.addInstance('taxable_co');
      return state.accounts.filter((a) => /_co$/.test(a.baseId)).length;
    });
    check('L5b fixture actually created a co-architect room (a leg over an empty set proves nothing)', seeded > 0, 'co-arch rooms=' + seeded);
    const survived = await page.evaluate(() => {
      /* Set the toggle off WITHOUT firing change — exactly the state a browser restoration or a
         partial hydration can leave behind — then run the load-time sync. */
      document.getElementById('co-arch-toggle').checked = false;
      window.dispatchEvent(new Event('pageshow'));
      return state.accounts.filter((a) => /_co$/.test(a.baseId)).length;
    });
    console.log('L5b co-arch rooms: seeded=' + seeded + ' -> after sync=' + survived);
    check('L5b the load-time sync did not delete co-architect rooms', survived === seeded, seeded + ' -> ' + survived);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log('\n' + results.join('\n'));
  /* ⛔ `OVERALL:` IS NOT A STYLE CHOICE — IT IS THE ONLY REASON THIS GATE'S VERDICT IS READABLE.
     scripts/_verdict.mjs knows six dialects; a seventh is not a dialect, it is an UNREADABLE gate.
     The first draft of this file printed "GREEN  all checks passed" and pushed the suite's
     unreadable count 61 -> 62 — the one instrument metric that had not grown across the whole arc.
     🔑 A GATE THAT CANNOT STATE ITS VERDICT IN THE RUNNER'S VOCABULARY IS JUDGED BY EXIT CODE
        ALONE, WHICH IS EXACTLY THE INPUT THE RECONCILIATION EXISTS TO CROSS-CHECK. */
  console.log('\nOVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (results.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('GATE FAULT:', e); try { server.close(); } catch (_x) {} process.exit(2); });
