/* @gate-pool: browser */
'use strict';
/* _gate_timing_path_in_request_body.js — THE CELL YOU PICK IS IN THE BODY THAT LEAVES THE BROWSER.
 *
 * THE CLAIM: locking any cell of the Social Security claiming matrix changes `ss_strategy_primary`
 * and `ss_strategy_secondary` in the payload `buildStudioRequest()` produces — for EVERY cell, not
 * for the one somebody happened to click.
 *
 * ⛔⛔ WHY THIS EXISTS, IN THE CAPTAIN'S OWN WORDS (2026-09-17): *"the numbers above DO update. Now,
 *    what I don't know is if the ENGINE is actually updated to read that new claiming or if it is
 *    ALWAYS 67 and 67 regardless of what I pick."* That is exactly the right question and the
 *    smoke test he was given CANNOT ANSWER IT. Watching the 62/67/70 buttons change proves the
 *    CONTROLS moved. It says nothing about what leaves the browser.
 * 🔑 A SMOKE TEST THAT WATCHES THE SCREEN CANNOT SEE THE WIRE. This was an open finding for two
 *    sessions — "SET THIS TIMING PATH NEVER REACHES THE ENGINE: it moves the Your Plan badge and
 *    ticks a readiness check" — repaired at 4db08be, and the repair was never checked anywhere a
 *    regression would be caught.
 *
 * ⛔ THE POPULATION IS EVERY CELL, GENERATED. Three primary strategies x three secondary = all
 *    nine joint cells. Nobody decides which pairing is interesting, so the "always 67/67" failure
 *    cannot hide in the cell nobody clicked. §82.2602.
 *
 * ⛔ L3 IS THE RED-FIRST LEG AND IT REMOVES THE CAPABILITY RATHER THAN ONE ROUTE (§82.2428): the
 *    payload must DISAGREE with itself across cells. If every cell produced the same pair, L1 and
 *    L2 would both pass against a builder hard-wired to 67/67 — which is precisely the defect the
 *    Captain named. Asserting that the values MOVE is the only leg that can see it.
 *
 * ⚠️ WHAT THIS DOES NOT CLAIM. It reads the payload the Studio builds, not the answer the engine
 *    returns. That the engine HONOURS `ss_strategy_secondary` is held on the engine side
 *    (test_seven_life_assumptions, the SS matrix legs). This gate owns the wire between them,
 *    which is where the two-session defect actually lived.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { seedCompleteHousehold } = require('./_seed_household.cjs');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8593;   /* highest declared gate port + 2; see _suite_baseline.mjs on collisions */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
               '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

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

const STRATS = ['early_62', 'full_67', 'optimal_70'];

const set = (page, id, v) => page.evaluate((a) => {
  const e = document.getElementById(a[0]); if (!e) return;
  if (e.type === 'checkbox') { if (e.checked !== a[1]) { e.checked = a[1]; e.dispatchEvent(new Event('change', { bubbles: true })); } return; }
  e.focus(); e.value = a[1];
  e.dispatchEvent(new Event('input', { bubbles: true }));
  e.dispatchEvent(new Event('change', { bubbles: true })); e.blur();
}, [id, v]);

const payload = (page) => page.evaluate(() => {
  const b = window.buildStudioRequest || window._buildStudioRequest;
  return (typeof b === 'function') ? b() : null;
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });

  /* ⛔⛔ THE HOUSEHOLD IS SEEDED FIRST, AND THE FIRST DRAFT OF THIS FILE WAS NOT. It went red on
     all four legs with every value `undefined`, and that red was ENTIRELY THE FIXTURE'S: on a cold
     Studio `buildStudioRequest()` returns NULL, because the product correctly refuses to build a
     payload for a household it has not been told about. Four confident reds about a working
     feature. 🔑 A RED IS NOT EVIDENCE UNTIL THE FIXTURE CAN PRODUCE A GREEN.
     ⚠️ AND THE SEED RUNS TWICE, because "complete" is a property of a fixture AT A MOMENT: turning
     the co-architect on ADDS a requirement (their own Social Security), so the first convergence is
     stale the instant the toggle flips. */
  const seeded1 = await seedCompleteHousehold(page, { quiet: true });
  await set(page, 'co-arch-toggle', true);
  await set(page, 'co-dob', '11 / 1976');
  await set(page, 'co-ret', '05 / 2044');
  await page.waitForTimeout(300);
  const seeded2 = await seedCompleteHousehold(page, { quiet: true });
  await page.waitForTimeout(200);
  check('L0 INSTRUMENT · a complete two-person household builds a payload at all',
        seeded2.complete === true && (await payload(page)) !== null,
        'rounds=' + seeded2.rounds + ' complete=' + seeded2.complete +
        (seeded2.complete ? '' : ' STILL REFUSING: ' +
          (seeded2.refusing || []).map((r) => r.target).join(',')));

  const out = await page.evaluate((strats) => {
    const build = window.buildStudioRequest || window._buildStudioRequest;
    if (typeof window.lockTimingPath !== 'function') return { missing: 'lockTimingPath' };
    if (typeof build !== 'function') return { missing: 'buildStudioRequest' };
    const rows = [];
    strats.forEach((pri) => strats.forEach((sec) => {
      const key = pri + '_x_' + sec;
      const got = { key: key, want: [pri, sec] };
      try {
        window.lockTimingPath(key);
        const req = build() || {};
        got.gotPri = req.ss_strategy_primary;
        got.gotSec = req.ss_strategy_secondary;
      } catch (e) { got.threw = String(e && e.message || e); }
      rows.push(got);
    }));
    return { rows };
  }, STRATS);

  if (out.missing) {
    check('L0 · the matrix lock and the payload builder are both reachable', false,
          'window.' + out.missing + ' is not a function');
  } else {
    const primaryOk = out.rows.filter((r) => r.gotPri === r.want[0]);
    const secondaryOk = out.rows.filter((r) => r.gotSec === r.want[1]);
    check('L1 · every cell sets ss_strategy_primary to the primary age it names',
          primaryOk.length === out.rows.length,
          primaryOk.length + ' of ' + out.rows.length + '; misses: ' +
          JSON.stringify(out.rows.filter((r) => r.gotPri !== r.want[0])
                                 .map((r) => r.key + ' -> ' + r.gotPri)));
    check('L2 · every cell sets ss_strategy_secondary to the secondary age it names',
          secondaryOk.length === out.rows.length,
          secondaryOk.length + ' of ' + out.rows.length + '; misses: ' +
          JSON.stringify(out.rows.filter((r) => r.gotSec !== r.want[1])
                                 .map((r) => r.key + ' -> ' + r.gotSec)));
    /* L3 — THE DEFECT THE CAPTAIN NAMED, ASSERTED DIRECTLY. */
    const distinctPri = new Set(out.rows.map((r) => r.gotPri));
    const distinctSec = new Set(out.rows.map((r) => r.gotSec));
    check('L3 · the payload actually MOVES across cells — it is not pinned to one pair',
          distinctPri.size === 3 && distinctSec.size === 3,
          'distinct primary=' + JSON.stringify([...distinctPri]) +
          ' distinct secondary=' + JSON.stringify([...distinctSec]));
    /* ⚠️ NO SOLO LEG HERE, AND THE OMISSION IS DELIBERATE RATHER THAN AN OVERSIGHT. A solo key
       asserts about a ONE-PERSON household, and this fixture is seeded two-person — asserting it
       here would test a solo path against a joint seed, which is the stale-fixture failure the
       re-seed above exists to avoid. `_gate_co_architect_reaches_engine` owns the solo half and
       already asserts that a solo household sends NO `ss_strategy_secondary` at all. */  }

  await browser.close(); server.close();
  console.log('\n_gate_timing_path_reaches_payload — the cell you pick is the claiming that is sent\n');
  results.forEach((r) => console.log('  ' + r));
  console.log('\n  ' + passes + ' passed, ' + fails + ' failed\n');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
