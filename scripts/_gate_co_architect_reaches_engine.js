/* @gate-pool: browser */
'use strict';
/* _gate_co_architect_reaches_engine.js — STANDING GATE for FINDING 67.
 *
 * THE CLAIM: when a Co-Architect is enabled and their DOB is readable, the body POSTed to
 * /api/calculate tells the engine they exist — and when it is not, the client invents nothing.
 *
 * ⛔⛔ WHY THIS EXISTS. co_architect_age was derived ONLY inside buildMatrixRequest, the SS-Matrix
 *    payload builder. The main Range call never received it. In the engine
 *    `co_architect_age = None` MEANS SINGLE (engine/income.py:495): the single-filer healthcare
 *    track, and a schema validator that silently NULLS ss_strategy_secondary (schemas.py:135).
 * ⛔ MEASURED ON THE REAL ENGINE, RUN LOCALLY, FOUR HOUSEHOLD SHAPES: a couple's sustainable spend
 *    came back $26k–$41k/yr LOW — worst for the SMALLEST estate, +67% on bedrock. Direction stable
 *    in all four. And engine/tax.py has no single bracket set at all, so the same run was MARRIED
 *    for tax and SINGLE for spending. This gate covers the half the client owns.
 * 🔑 TWO ENDPOINTS, ONE SCHEMA, TWO DIFFERENT FAMILIES, ON ONE SCREEN. The Range was told the
 *    household was single while the SS Matrix was told it was married — and both validated fine.
 *
 * ⛔ L2 IS THE LEG THAT MATTERS MOST AND IT ASSERTS AN ABSENCE. With the toggle ON and no readable
 *    DOB the client must send NOTHING rather than a plausible age. A fabricated age here is a
 *    fabricated personal fact on the surface that decides someone's money — the defect family this
 *    whole arc has been paying for. "It defaults to 45" would pass a naive round-trip test.
 *
 * ⛔ L3 IS A SOURCE ASSERTION, DELIBERATELY, AND IT IS THE ANTI-REGRESSION LEG. The defect was not a
 *    wrong value — it was a derivation living in ONE caller. A behavioural leg cannot see a second
 *    copy being added next month; only a census of the assignment sites can. If a new payload
 *    builder derives its own co_architect_age, this reds.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
/* ⛔ studioSource() COMPOSES THE SHELL **PLUS THE FIVE PART FILES**. A bare readFileSync of
   studio.html would census the shell alone — so a forked derivation living in a part
   (studio-account-modal.js and its 53 helpers, for instance) would be INVISIBLE to L3, which is
   the one leg whose whole job is to find a second copy. _gate_studio_source enforces this door
   for exactly that reason, and it caught this file reading around it. */
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8201;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const blockClerk = (ctx) => ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry/i.test(u)) return route.abort();
  return route.continue();
});

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

const set = (page, id, v) => page.evaluate((a) => {
  const e = document.getElementById(a[0]); if (!e) return;
  if (e.type === 'checkbox') { if (e.checked !== a[1]) { e.checked = a[1]; e.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  e.focus(); e.value = a[1];
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true })); e.blur();
}, [id, v]);

const payload = (page) => page.evaluate(() => {
  const r = (typeof window._buildStudioRequest === 'function') ? window._buildStudioRequest() : null;
  if (!r) return { built: false };
  return {
    built: true,
    co_architect_age: r.co_architect_age,
    co_architect_retirement_age: r.co_architect_retirement_age,
    ss_strategy_secondary: r.ss_strategy_secondary,
    current_age: r.current_age, retirement_age: r.retirement_age
  };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:' + PORT;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(800);

  /* A coherent primary: age 52, retiring at 68. No value here implies a slider default. */
  await set(page, 'pri-dob', '03 / 1974');
  await set(page, 'target-ret', '07 / 2042');
  await page.waitForTimeout(250);

  /* ── L0 INSTRUMENT + HONEST HALF: a SOLO household must send no co-architect at all, and the
        payload must still be a real payload. Without this, "absent" below proves nothing — a
        builder returning null would satisfy every absence assertion in this file. */
  const solo = await payload(page);
  check('L0 INSTRUMENT: a solo household builds a real payload carrying NO co-architect keys',
    solo.built && solo.co_architect_age === undefined && solo.ss_strategy_secondary === undefined
      && solo.current_age > 0 && solo.retirement_age > 0,
    'built=' + solo.built + ' current_age=' + solo.current_age + ' retirement_age=' + solo.retirement_age
    + ' co_architect_age=' + JSON.stringify(solo.co_architect_age)
    + ' ss_strategy_secondary=' + JSON.stringify(solo.ss_strategy_secondary));

  /* ── L2 — THE ABSENCE LEG. Toggle ON, DOB still empty. Nothing may be invented.
        ⛔ RUN BEFORE the DOB is filled: once a real age exists this state is unreachable.
        ⚖ REWRITTEN 2026-09-04 (F79). This asserted `built && co_architect_age === undefined`
          — a body that simply LACKED the key. F79 changed the mechanism: the builder now
          REFUSES outright, because returning a one-person body for a household the user told
          us has two people SILENTLY DELETES A HUMAN BEING, and a single-person Range is a
          number they will believe.
        🔑 THE PROPERTY DID NOT CHANGE, THE MECHANISM DID. "No fabrication" is not weakened by
          this rewrite, it is STRENGTHENED: there is no body at all, so there is nothing an
          invented age could ride in on. The old form would now pass on a refusal only by
          accident and fail on it by construction — so it is replaced, not relaxed. */
  await set(page, 'co-arch-toggle', true);
  await page.waitForTimeout(300);
  const noDob = await payload(page);
  const noDobWhy = await page.evaluate(() =>
    (window._buildRequestErrors || []).map((e) => ({ m: e.message, t: e.target || null })));
  check('L2 NO FABRICATION: co-architect ON with an unreadable DOB REFUSES — no body, so no age can be invented',
    noDob.built === false,
    noDob.built
      ? 'RETURNED A BODY; co_architect_age=' + JSON.stringify(noDob.co_architect_age)
        + ' (a one-person body for a two-person household is the defect F79 removed)'
      : 'refused (null)');
  check('L2b and the refusal names the co-architect and carries its door',
    noDobWhy.some((e) => /co-architect/i.test(e.m) && e.t === 'co-dob'),
    JSON.stringify(noDobWhy));

  /* ── L1 — THE CLAIM. A readable co-architect reaches the engine. */
  await set(page, 'co-dob', '11 / 1976');
  await set(page, 'co-ret', '05 / 2044');
  await page.waitForTimeout(300);
  const dual = await payload(page);
  const wantAge = (() => { const n = new Date(); let a = n.getFullYear() - 1976; if (n.getMonth() + 1 < 11) a--; return a; })();
  const wantRet = 2044 - (new Date().getFullYear() - wantAge);
  check('L1 REACHES THE ENGINE: a dual household sends co_architect_age, their retirement age, and a secondary SS strategy',
    dual.co_architect_age === wantAge
      && dual.co_architect_retirement_age === wantRet
      && typeof dual.ss_strategy_secondary === 'string' && dual.ss_strategy_secondary.length > 0,
    'co_architect_age=' + JSON.stringify(dual.co_architect_age) + ' (want ' + wantAge + ')'
    + ' co_architect_retirement_age=' + JSON.stringify(dual.co_architect_retirement_age) + ' (want ' + wantRet + ')'
    + ' ss_strategy_secondary=' + JSON.stringify(dual.ss_strategy_secondary)
    + '\n          ⛔ derived from the DOB, never from a constant — the ages move with the calendar');

  /* ── L3 — THE ANTI-FORK CENSUS. The defect was a derivation living in one caller.
        ⛔ IT COUNTS CODE, NOT PROSE, AND THE FIRST VERSION DID NOT. It matched
        /co_architect_age\s*=/ and reported TWO sites — both of which were MY OWN COMMENTS
        quoting `co_architect_age = None` to explain the engine's behaviour. The leg reddened on
        its own documentation while the code underneath was correct.
        🔑 A SOURCE CENSUS THAT READS COMMENTS IS MEASURING THE WRITING, NOT THE PROGRAM. Block
        comments are stripped first, and the match accepts both the object-literal form the helper
        uses (`co_architect_age: age`) and a property assignment (`x.co_architect_age = ...`), so a
        fork written in either style is caught. */
  const rawSrc = studioSource();
  const src = rawSrc.replace(/\/\*[\s\S]*?\*\//g, '');
  const assigns = (src.match(/co_architect_age\s*[:=]/g) || []).length;
  const helperDefs = (src.match(/function\s+_coArchitectFacts\s*\(/g) || []).length;
  check('L3 NO FORK: co_architect_age is assigned in exactly ONE place, and that place is the shared helper',
    assigns === 1 && helperDefs === 1,
    'co_architect_age assignments in studio.html = ' + assigns + ' (want 1)'
    + ' · _coArchitectFacts definitions = ' + helperDefs + ' (want 1)'
    + '\n          ⛔ a second derivation is how the Range and the SS Matrix came to describe different families');

  await ctx.close(); await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
  console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.log('OVERALL: RED');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
