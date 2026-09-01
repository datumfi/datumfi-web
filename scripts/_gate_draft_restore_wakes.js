/* @gate-pool: browser */
'use strict';
/* _gate_draft_restore_wakes.js — STANDING GATE for FINDING 56 / FINDING 47.
 *
 * THE CLAIM: a Profile typed into the Studio SURVIVES A RELOAD. That is the whole of F47 — the
 * defect the Captain found by reloading a page nobody asked him to reload.
 *
 * ⛔ IT TRAVELS THE REAL PATH. Type through the real fields, RELOAD THE PAGE, read what comes back.
 *    No handler is called directly, because the subject is something a user DOES.
 *
 * WHY IT EXISTS (measured 2026-08-30, F56): restoreDraft() had NEVER EXECUTED PAST ITS SECOND LINE,
 * on any load, ever. Property setters on `window` timed it:
 *      clearDraftAndRefresh   assigned t=77ms   (inline block, parse time)
 *      DatumBlueprint         assigned t=174ms  (defer script)
 * restoreDraft() was CALLED at parse time and guarded by
 * `if (!window.DatumBlueprint || !DatumBlueprint._internal) return;` — so the guard fired every
 * time, 97ms before its dependency existed. The draft was WRITTEN FAITHFULLY AND NEVER READ BACK.
 * 🔑 THREE FINDINGS (F47, F52, F53) POINTED AT THIS WIRING AND NONE FOUND IT. IT TOOK A TIMING
 *    MEASUREMENT — a function that never runs produces no error and looks exactly like working code.
 *
 * ⛔ L0 IS NOT CEREMONY: it proves the draft was WRITTEN before asserting it was READ. Without it a
 *    red here is ambiguous between "the restore is broken" and "nothing was ever saved" — and those
 *    have different fixes in different files.
 *
 * ⛔ L4 AND L5 ARE THE HONEST HALF and are GREEN ON BOTH BUILDS BY CONSTRUCTION:
 *    L5 — a browser with NO draft must still get a cold entry and no banner. Waking the restore is
 *         precisely the change that could paint a previous session onto a user who has none.
 *    L4 — `?fresh=1` and `?hydrate=sketch` must STILL refuse to restore. That guard is the earliest
 *         room-leak path and it lives INSIDE restoreDraft, so moving the CALL must not move the
 *         GUARD. An amputation that simply deleted the guard would satisfy L1 and fail here.
 *
 * MEASURED ON UNFIXED BYTES: L1 L2 L3 RED · L0 L4 L5 GREEN.
 *   ⚠️ L2 WAS PREDICTED GREEN AND RED. The banked F56 record said spend-input survived a reload by
 *   another route; measured, it returns the MARKUP DEFAULT. The record was wrong, not the product's
 *   behaviour — and only predicting the greens made that visible.
 *
 * Run: node scripts/_gate_draft_restore_wakes.js      (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

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

const TYPED = { 'pri-dob': '04 / 1977', 'target-ret': '09 / 2044', 'spend-input': '$88,000' };

async function enter(page) {
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await page.evaluate(() => window._studioEnterRoom('data'));
  await page.waitForTimeout(800);
}
const type = (page, id, text) => page.evaluate(function (a) {
  const el = document.getElementById(a[0]); if (!el) return null;
  el.focus(); el.value = a[1];
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur(); return el.value;
}, [id, text]);
const readFields = (page) => page.evaluate((ids) => ids.reduce((o, i) => {
  const e = document.getElementById(i); o[i] = e ? e.value : '(absent)'; return o;
}, {}), Object.keys(TYPED));

(async () => {
  await new Promise((r) => server.listen(8187, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8187';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await enter(page);
  for (const id of Object.keys(TYPED)) await type(page, id, TYPED[id]);
  await page.waitForTimeout(1500);            // let the 400ms-debounced autosave land
  const before = await readFields(page);

  /* ── L0 — THE DRAFT MUST EXIST BEFORE ANY CLAIM ABOUT READING IT BACK. */
  const draft = await page.evaluate(() => {
    const out = { keys: [], holdsDob: false, raw: null };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/draft/i.test(k)) {
          out.keys.push(k);
          const v = localStorage.getItem(k) || '';
          if (v.indexOf('1977') !== -1) { out.holdsDob = true; out.raw = v.slice(0, 120); }
        }
      }
    } catch (e) { out.err = String(e); }
    return out;
  });
  check('L0 INSTRUMENT: the typed Profile was written to a session draft BEFORE the reload',
    draft.keys.length > 0 && draft.holdsDob,
    'draftKeys=' + JSON.stringify(draft.keys) + ' holdsTypedYear=' + draft.holdsDob
    + '\n          typedBeforeReload=' + JSON.stringify(before));

  /* ── THE RELOAD. This is the subject: a user pressing refresh. */
  /* ⛔ DO NOT RE-ENTER AFTER THE RELOAD. The first version of this gate called enter() here, which
     clicks "Start from Scratch" — a REAL user action that legitimately DISCARDS the restored
     session. The fields then read empty and the gate blamed the product for a state its own
     fixture had thrown away. Measured: with the click removed, #pri-dob holds "04 / 1977".
     🔑 A FIXTURE STEP THAT LOOKS LIKE SETUP CAN BE A DESTRUCTIVE USER ACTION. The reload IS the
        subject; anything after it is interference. */
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const after = await readFields(page);

  const norm = (s) => String(s || '').replace(/\s/g, '');
  check('L1 RESTORE: the Profile dates typed before the reload come back after it',
    norm(after['pri-dob']) === norm(TYPED['pri-dob']) && norm(after['target-ret']) === norm(TYPED['target-ret']),
    'after reload: ' + JSON.stringify(after) + '\n          wanted pri-dob=' + JSON.stringify(TYPED['pri-dob'])
    + ' target-ret=' + JSON.stringify(TYPED['target-ret']));

  /* ── L2 — PART OF THE RESTORE CLAIM, **NOT** AN HONEST HALF.
        ⛔ THE BANKED RECORD WAS WRONG AND THIS GATE CORRECTED IT. F56 recorded spend-input as
        surviving a reload "by another route (the blueprint load() -> datum-slider path)" and I
        wrote this leg as an honest half on that basis, predicting GREEN. MEASURED on unfixed
        bytes: it comes back "$100,000", the MARKUP DEFAULT, not the typed "$88,000". It does not
        survive. restoreDraft writes it from bp.datum.net_datum_v1, so it is restored by the SAME
        route as the dates and reds and greens with them.
        🔑 A LEG PREDICTED GREEN THAT REDS IS EITHER A BROKEN PRODUCT OR A WRONG RECORD — AND HERE
           IT WAS THE RECORD. Predicting the greens is what made that visible. */
  check('L2 RESTORE: the spend typed before the reload comes back after it',
    norm(after['spend-input']) === norm(TYPED['spend-input']),
    'spend after reload=' + JSON.stringify(after['spend-input']) + ' wanted=' + JSON.stringify(TYPED['spend-input']));

  /* ── L3 — THE BANNER. Nobody had ever seen it run; F61 moved it and authored its copy. */
  const banner = await page.evaluate(() => {
    const b = document.getElementById('draft-restored-banner');
    if (!b) return { present: false };
    const btn = b.querySelector('button');
    const r = b.getBoundingClientRect();
    return { present: true, text: (b.textContent || '').trim(), button: btn ? btn.textContent.trim() : null,
      rect: 'y ' + Math.round(r.top) + '-' + Math.round(r.bottom) };
  });
  /* ⛔ L3a — SILENT ON THE DOORSTEP. The restore now runs at boot, BEFORE the user has answered
     the entry overlay — and that overlay is ASKING how to begin while the banner would ASSERT the
     last session is already back. Measured when the F61 gate first travelled the real path: the
     banner landed on all three entry choices (Start from Sketch 393x37px, Scratch and Blueprint
     70x37px each). The clash is semantic before it is geometric, so the notice WAITS. */
  check('L3a BANNER: nothing is announced while the entry overlay is still asking how to begin',
    banner.present === false,
    'bannerWhileOverlayUp=' + JSON.stringify(banner));

  /* ⛔ L3b — AND ONLY THE PRESERVING EXIT REACHES IT. "Start from Scratch" DISCARDS the restored
     draft, correctly — it is what it says. The X (#studioCloseIntro -> dismissOverlay) is the one
     exit that KEEPS it, which scripts/_gate_overlay_x_preserves.js proves independently. So this
     is the ONLY real path on which the restore banner is ever seen, and it took travelling that
     path to learn the banner had to wait for this click. */
  await page.evaluate(() => { const x = document.getElementById('studioCloseIntro'); if (x) x.click(); });
  await page.waitForTimeout(1800);
  const banner2 = await page.evaluate(() => {
    const b = document.getElementById('draft-restored-banner');
    if (!b) return { present: false };
    const btn = b.querySelector('button');
    return { present: true, text: (b.textContent || '').trim(), button: btn ? btn.textContent.trim() : null };
  });
  check('L3b BANNER: once the user is in the Studio, the restore announces itself with the authored notice',
    banner2.present && banner2.text.indexOf('Picked up where you left off') !== -1 && banner2.button === 'Start fresh',
    JSON.stringify(banner2));

  await page.close();

  /* ── L4 — HONEST HALF: the fresh / sketch guard lives INSIDE restoreDraft. Moving the CALL must
        not move the GUARD, and an amputation that deleted it would satisfy L1 and fail here. */
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/studio.html?fresh=1', { waitUntil: 'load' });
  await enter(p2);
  await p2.waitForTimeout(2000);
  const fresh = await readFields(p2);
  check('L4 HONEST HALF: ?fresh=1 still refuses to restore the draft',
    norm(fresh['pri-dob']) !== norm(TYPED['pri-dob']) && norm(fresh['target-ret']) !== norm(TYPED['target-ret']),
    '?fresh=1 fields: ' + JSON.stringify(fresh) + '  (must NOT be the typed values)');

  await p2.close();

  /* ── L5 — THE REAL HONEST HALF: A COLD ENTRY MUST STAY COLD.
        Waking the restore is exactly the change that could start painting a previous session onto
        a user who has none. In a FRESH browser context (no draft anywhere) the Studio must show
        the markup's own defaults and NO banner. Green on both builds by construction. */
  const cold = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockClerk(cold);
  const p3 = await cold.newPage();
  await p3.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await enter(p3);
  await p3.waitForTimeout(2000);
  const coldFields = await readFields(p3);
  const coldBanner = await p3.evaluate(() => !!document.getElementById('draft-restored-banner'));
  check('L5 HONEST HALF: a browser with no draft still gets a cold entry, and no restore banner',
    coldFields['pri-dob'] === '' && coldFields['target-ret'] === ''
      && norm(coldFields['spend-input']) === norm('$100,000') && coldBanner === false,
    JSON.stringify(coldFields) + ' bannerShown=' + coldBanner);
  await cold.close();

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
