'use strict';
/* _p8_profile_date_enforce.js — STANDING GATE for the P8.1 revert-or-clear enforcement
 * on the Studio Architect Profile date boxes (Primary DOB, Target Retirement, Co-Architect
 * DOB + Target Retirement). Proves, in a REAL browser, the RATIFIED Option-C hybrid:
 *
 *   (a) an invalid date REVERTS to the field's last-known-good when one exists;
 *   (b) an invalid date with NO prior good value CLEARS to empty (not snapped);
 *   (c) NO box ever SILENTLY SNAPS to a bound (CA->18, RA/PTA->max) on invalid input;
 *   (d) a valid date still commits + moves its slider (2A intact for Plan-Through);
 *   (e) the engine payload still derives INTEGER ages (2A shape unchanged);
 *   (g) the Studio Profile validators delegate to the SHARED DatumDateBounds (single
 *       source the Dossier will join in 2B) — the cross-validator parity foundation.
 *
 * (f) carry / sketch-reopen + P5-P7 are proven by their own standing gates.
 *
 * Run: node scripts/_p8_profile_date_enforce.js   (exit 0 = GREEN)
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
let fails = 0; const results = [];
function check(label, cond, detail) { const ok = !!cond; if (!ok) fails++; results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? ' (' + detail + ')' : '')); }
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog/i.test(u)) return route.abort(); return route.continue(); });

// Drive a Profile date box exactly like a user: focus (real event -> snapshots last-good),
// type (input -> live filter), change, then a SINGLE real blur (-> enforcement commit).
const editProfile = (page, id, text) => page.evaluate(([i, t]) => {
  const el = document.getElementById(i); if (!el) return null;
  el.focus();                                              // real focus event
  el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();                                               // real blur event -> onblur once
  return el.value;
}, [id, text]);
const read = (page) => page.evaluate(() => ({
  dob: (document.getElementById('pri-dob') || {}).value,
  tret: (document.getElementById('target-ret') || {}).value,
  coDob: (document.getElementById('co-dob') || {}).value,
  coRet: (document.getElementById('co-ret') || {}).value,
  age: parseInt(document.getElementById('slider-age').value, 10),
  ret: parseInt(document.getElementById('slider-activation').value, 10),
  plan: parseInt(document.getElementById('sl-plan-through').value, 10),
  dobWarn: (document.getElementById('pri-dob-warn') || {}).style.display,
  retWarn: (document.getElementById('ret-date-warn') || {}).style.display,
  coDobWarn: (document.getElementById('co-dob-warn') || {}).style.display
}));

(async () => {
  await new Promise((r) => server.listen(8142, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8142';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await blockClerk(ctx);
  const page = await ctx.newPage();
  const Y = new Date().getFullYear();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  // Reveal the Architect Profile (the date boxes live in 01/ Timeline).
  await page.evaluate(() => { const s = document.getElementById('sec-profile'); if (s) s.scrollIntoView(); });

  // (g) — the Profile validators are wired to the shared module.
  check('(g) DatumDateBounds present (shared single source)', await page.evaluate(() => typeof (window.DatumDateBounds || {}).validateDob === 'function'));
  check('(g) Profile validators delegate to DatumDateBounds', await page.evaluate(() => {
    const el = document.getElementById('pri-dob'); if (!el || !window._validateProfileDate) return false;
    el.value = '06 / ' + (new Date().getFullYear() - 40);
    const mine = window._validateProfileDate(el);
    const direct = window.DatumDateBounds.validateDob(el.value);
    return mine.ok === direct.ok && mine.age === direct.age;
  }));

  // Seed a known-good DOB + Target Retirement so last-known-good exists.
  const goodDob = '06 / ' + (Y - 45);          // age ~45
  const goodRet = '06 / ' + (Y - 45 + 65);     // retire ~65
  editProfile(page, 'pri-dob', goodDob); await page.waitForTimeout(150);
  editProfile(page, 'target-ret', goodRet); await page.waitForTimeout(150);
  let r = await read(page);
  check('(d) valid DOB commits + moves slider-age', r.dob.replace(/\s/g, '') === goodDob.replace(/\s/g, '') && r.age === 45, r.dob + ' age=' + r.age);
  check('(d) valid Target Retirement commits + moves slider-activation', r.ret === 65, 'ret=' + r.ret);
  const ageBefore = r.age, retBefore = r.ret;

  // (e) — with DOB + Target Retirement valid, the engine payload derives INTEGER ages.
  const agePayload = await page.evaluate(() => { try { const b = window._buildStudioRequest && window._buildStudioRequest(); return b ? { ca: b.current_age, ra: b.retirement_age } : null; } catch (e) { return 'ERR:' + e.message; } });
  check('(e) payload current_age + retirement_age are INTEGER ages', agePayload && Number.isInteger(agePayload.ca) && Number.isInteger(agePayload.ra), JSON.stringify(agePayload));

  // (a) — garbage DOB reverts to the last-known-good; slider does NOT move.
  editProfile(page, 'pri-dob', '06 / 5656'); await page.waitForTimeout(150);
  r = await read(page);
  check('(a) garbage DOB reverts to last-known-good (not persisted)', r.dob.replace(/\s/g, '') === goodDob.replace(/\s/g, ''), r.dob);
  check('(c) garbage DOB does NOT snap slider-age to a bound', r.age === ageBefore && r.age !== 18 && r.age !== 85, 'age=' + r.age);
  check('(a) DOB inline warn is shown', r.dobWarn === 'block', r.dobWarn);

  // (a) — out-of-window Target Retirement (year 3052) reverts; slider unmoved, no snap to 90.
  editProfile(page, 'target-ret', '01 / 3052'); await page.waitForTimeout(150);
  r = await read(page);
  check('(a) out-of-window Target Retirement reverts to last-good', r.tret.replace(/\s/g, '') === goodRet.replace(/\s/g, ''), r.tret);
  check('(c) Target Retirement does NOT snap slider-activation to 90', r.ret === retBefore && r.ret !== 90, 'ret=' + r.ret);

  // (b) — Co-Architect DOB with NO prior good value clears to empty (never snapped).
  // Reveal the Co-Architect section first (its date boxes are display:none until toggled,
  // and focus/blur don't fire on a hidden element).
  await page.evaluate(() => {
    const t = document.getElementById('co-arch-toggle');
    if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
    const f = document.getElementById('co-arch-fields'); if (f) f.style.display = 'block';
  });
  await page.waitForTimeout(120);
  let cr = await read(page);
  check('(b) precondition: co-dob starts empty', !cr.coDob, JSON.stringify(cr.coDob));
  editProfile(page, 'co-dob', '06 / 5656'); await page.waitForTimeout(150);
  cr = await read(page);
  check('(b) invalid co-dob with no prior good CLEARS to empty (not snapped)', !cr.coDob, JSON.stringify(cr.coDob));
  check('(b) co-dob inline warn is shown', cr.coDobWarn === 'block', cr.coDobWarn);
  // then a good co-dob commits, and a later garbage value reverts to it (last-good path).
  // NB: use an out-of-window YEAR — a month>12 would be auto-clamped by the Profile input
  // filter (_fmtDateStr) before it ever reached enforcement.
  const goodCoDob = '06 / ' + (Y - 43);
  editProfile(page, 'co-dob', goodCoDob); await page.waitForTimeout(120);
  editProfile(page, 'co-dob', '06 / 5656'); await page.waitForTimeout(120);
  cr = await read(page);
  check('(a) co-dob reverts to last-good after a good value existed', cr.coDob.replace(/\s/g, '') === goodCoDob.replace(/\s/g, ''), cr.coDob);

  // (d)+(e) — Plan-Through (2A) still commits a valid typed date and the payload stays INTEGER.
  const caNow = (await read(page)).age;
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await page.evaluate((v) => { const el = document.getElementById('plan-end-age'); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); if (window._commitPlanEndDate) window._commitPlanEndDate(el); }, '01 / ' + (Y - caNow + 95));
  await page.waitForTimeout(150);
  check('(d) valid Plan-Through date moves the slider (2A intact)', (await read(page)).plan === 95, 'plan=' + (await read(page)).plan);
  const planPayload = await page.evaluate(() => { try { const bp = window.DatumBlueprint['new'](); window.DatumBlueprint.captureDOM(bp); return bp.profile.plan_end_age; } catch (e) { return 'ERR:' + e.message; } });
  check('(e) payload plan_end_age stays an INTEGER age', typeof planPayload === 'number' && Number.isInteger(planPayload), JSON.stringify(planPayload));

  await ctx.close();
  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nP8.1 PROFILE DATE ENFORCEMENT: GREEN' : '\nP8.1 PROFILE DATE ENFORCEMENT: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
