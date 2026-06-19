'use strict';
/* _p8_studio_mechanics.js — STANDING GATE for P8 Studio S1 mechanics + parity.
 *
 * Proves, in a REAL browser:
 *   Item 1 — live slider input clamps: RA >= CA+1, CA <= RA-1, and the plan-through
 *            floor PTA >= max(75, RA+20) (Sketch parity, sketch.html:5007/5019/5031).
 *   Item 2 — the Have/Want subtoggle holds a FIXED screen position across the flip
 *            (drafting-panel collapse must not slide it).
 *   Item 3 — the "From your Sketch design" import box is gone; the .drafting-panel
 *            shape-state outline + the 01/Timeline badge track the live state and
 *            recolor on a state change.
 *   Item 5 — "Return to Overview" re-opens the overlay (Studio + Sketch), works even
 *            when the overlay auto-hid on load, and the re-opened Studio X soft-dismisses
 *            (no scratch-reset -> in-progress Blueprint preserved).
 *
 * Run: node scripts/_p8_studio_mechanics.js   (exit 0 = GREEN)
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
const visible = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); if (!el) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && !el.classList.contains('dismissed'); }, id);
const setSlider = (page, id, val) => page.evaluate(([i, v]) => { const el = document.getElementById(i); if (!el) return null; el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); return parseInt(el.value, 10); }, [id, val]);
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog/i.test(u)) return route.abort(); return route.continue(); });
// Item 4 — drive the inline edit: click the value span, set its sibling edit-input, run the
// live filter, then blur to commit.
const editField = (page, valId, text) => page.evaluate(([id, t]) => { const val = document.getElementById(id); val.click(); const inp = val.nextSibling; inp.value = t; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.blur(); }, [valId, text]);
const readAges = (page) => page.evaluate(() => ({ age: parseInt(document.getElementById('slider-age').value, 10), ret: parseInt(document.getElementById('slider-activation').value, 10), plan: parseInt(document.getElementById('sl-plan-through').value, 10), dob: (document.getElementById('pri-dob') || {}).value, tret: (document.getElementById('target-ret') || {}).value }));

(async () => {
  await new Promise((r) => server.listen(8141, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8141';

  // ── Studio, fresh signed-out ──
  let ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  let page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);

  // Item 1 — clamps via live input events.
  await setSlider(page, 'slider-age', 50);
  const raLow = await setSlider(page, 'slider-activation', 45);          // <= age -> age+1
  check('Item1: RA clamps to >= CA+1 on live input', raLow >= 51, 'RA=' + raLow);
  await setSlider(page, 'slider-activation', 70);
  const caHigh = await setSlider(page, 'slider-age', 80);                // >= ret -> ret-1
  check('Item1: CA clamps to <= RA-1 on live input', caHigh <= 69, 'CA=' + caHigh);
  await setSlider(page, 'slider-age', 50);
  await setSlider(page, 'slider-activation', 70);
  const ptaLow = await setSlider(page, 'sl-plan-through', 80);           // < RA+20 -> max(75,RA+20)=90
  check('Item1: PTA clamps to >= max(75, RA+20)', ptaLow >= 90, 'PTA=' + ptaLow);

  // Enter shape mode for Items 2 + 3.
  const rectOf = () => page.evaluate(() => { const r = document.getElementById('shape-subtoggle').getBoundingClientRect(); return r.width ? Math.round(r.x + r.width / 2) : null; });
  await page.click('#shape-mode-toggle');
  // Item 2 anti-flash: sample the subtoggle center-x DURING the Estate->Shape transition
  // (not just at rest) — it must be anchored from first paint, no swoop.
  const flashSamples = [];
  for (const t of [40, 80, 150, 300, 600]) { await page.waitForTimeout(t === 40 ? 40 : t - flashSamples[flashSamples.length - 1].t); flashSamples.push({ t, cx: await rectOf() }); }
  const seen = flashSamples.map((s) => s.cx).filter((v) => v !== null);
  check('Item2: no unanchored-flash on Estate->Shape (stable during transition)', seen.length >= 4 && (Math.max(...seen) - Math.min(...seen)) <= 2, JSON.stringify(flashSamples));
  await page.waitForTimeout(2000);

  // Item 3 (P8.1) — box gone; frame scoped to 01->05 (excludes methodology); Profile intact
  // outside; Have frame border on all 4 sides, un-clipped, colored by state.
  const _b4 = (s) => { const p = String(s).split(','); const v = parseFloat(p[0]); return p.length === 4 && v > 0 && p.every((x) => parseFloat(x) === v); };
  const i3 = await page.evaluate(() => {
    const f = document.getElementById('shape-input-frame-have');
    const b = document.getElementById('timeline-state-badge');
    const cs = f ? getComputedStyle(f) : null; const r = f ? f.getBoundingClientRect() : null;
    const pr = document.querySelector('.drafting-panel').getBoundingClientRect();
    return {
      boxGone: !document.getElementById('sketch-design-ref'), badge: b ? b.textContent.trim() : '',
      wraps: !!(f && f.querySelector('#slider-age') && f.querySelector('#slider-tax')),
      excludesMethod: !!(f && !f.querySelector('#methodology-btn')),
      profileOutside: !!(document.getElementById('sec-profile') && f && !f.contains(document.getElementById('sec-profile'))),
      sides: cs ? [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join(',') : '',
      rightInside: !!(r && r.right <= pr.right + 0.5 && r.right > pr.left),
      color: cs ? cs.borderTopColor : ''
    };
  });
  check('Item3: import box removed', i3.boxGone);
  check('Item3: 01/Timeline badge reflects state', !!i3.badge, i3.badge);
  check('Item3: frame wraps 01->05, excludes methodology', i3.wraps && i3.excludesMethod);
  check('Item3: Profile section intact + outside frame', i3.profileOutside);
  check('Item3: Have frame border on all 4 sides', _b4(i3.sides), i3.sides);
  check('Item3: Have frame right edge un-clipped (inside panel)', i3.rightInside);
  check('Item3: Have frame colored by state', i3.color !== 'rgba(0, 0, 0, 0)', i3.color);

  // Item 2 — toggle position fixed across Have -> Want -> Have.
  const haveCx = await rectOf();
  await page.click('#shape-want-tab'); await page.waitForTimeout(1300);
  const wantCx = await rectOf();
  // Item 3 — Want frame carries its OWN state color, all 4 sides.
  const i3w = await page.evaluate(() => { const f = document.getElementById('shape-input-frame-want'); if (!f) return null; const cs = getComputedStyle(f); return { sides: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join(','), color: cs.borderTopColor }; });
  check('Item3: Want frame border on all 4 sides', i3w && _b4(i3w.sides), i3w && i3w.sides);
  check('Item3: Want frame colored by its own state', i3w && i3w.color !== 'rgba(0, 0, 0, 0)', i3w && i3w.color);
  await page.click('#shape-have-tab'); await page.waitForTimeout(1100);
  const backCx = await rectOf();
  check('Item2: subtoggle x fixed across flip', Math.abs(haveCx - wantCx) <= 2 && Math.abs(haveCx - backCx) <= 2, haveCx + '/' + wantCx + '/' + backCx);

  // Item 3 — Have frame recolors on state change (max datum -> OVEREXTENDED).
  await page.evaluate(() => { const el = document.getElementById('slider-datum'); if (el) { el.value = String(el.max); delete el.dataset.exactVal; el.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(900);
  const i3b = await page.evaluate(() => { const b = document.getElementById('timeline-state-badge'); const f = document.getElementById('shape-input-frame-have'); return { badge: b ? b.textContent.trim() : '', color: f ? getComputedStyle(f).borderTopColor : '' }; });
  check('Item3: badge recolors on state change', i3b.badge && i3b.badge !== i3.badge, i3.badge + ' -> ' + i3b.badge);
  check('Item3: Have frame recolors on state change', i3b.color && i3b.color !== i3.color, i3.color + ' -> ' + i3b.color);

  // Item 5 — Studio reopen + soft-dismiss preserves draft.
  await page.evaluate(() => localStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ marker: 'KEEPME' })));
  check('Item5: _studioOverlayOpen exposed', await page.evaluate(() => typeof window._studioOverlayOpen === 'function'));
  await page.click('.return-home'); await page.waitForTimeout(400);
  check('Item5: Return-to-Overview re-opens Studio overlay', await visible(page, 'studioOverlayWrap'));
  await page.click('#studioCloseIntro'); await page.waitForTimeout(700);
  check('Item5: re-opened X soft-dismisses', !(await visible(page, 'studioOverlayWrap')));
  check('Item5: in-progress Blueprint preserved (no scratch-reset)', await page.evaluate(() => { const v = localStorage.getItem('datumfi_blueprint_draft_v1'); return !!v && v.indexOf('KEEPME') > -1; }));
  await ctx.close();

  // ── Studio signed-in + seen: overlay auto-hides, reopen still works ──
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await blockClerk(ctx);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); localStorage.setItem('datum_studio_overlay_seen', '1'); } catch (e) {} });
  page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check('Item5: overlay auto-hides on signed-in+seen load', !(await visible(page, 'studioOverlayWrap')));
  await page.click('.return-home'); await page.waitForTimeout(400);
  check('Item5: reopen works even when auto-hidden', await visible(page, 'studioOverlayWrap'));
  check('Item5: reopen shows live Signed in', /Signed in/.test(await page.evaluate(() => (document.getElementById('studioStatusValue') || {}).textContent || '')));
  await ctx.close();

  // ── Item 4 — MM/YYYY age inputs ──
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  const now = new Date(); const Y = now.getFullYear(); const Mo = now.getMonth() + 1;
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  // date -> age + month round-trip (typed 03/1985 survives, not clobbered to 06/...)
  await editField(page, 'val-age', '03 / 1985'); await page.waitForTimeout(200);
  let a = await readAges(page);
  check('Item4: date->age (Current Age DOB)', a.age === Y - 1985 - (Mo < 3 ? 1 : 0), 'age=' + a.age);
  check('Item4: month round-trip preserves typed month', /^03\s*\/\s*1985$/.test(a.dob || ''), a.dob);
  // age -> date keeps the existing month (not forced to 06)
  await editField(page, 'val-age', '50'); await page.waitForTimeout(200);
  a = await readAges(page);
  check('Item4: age->date keeps month on plain-age derive', a.age === 50 && /^03\s*\/\s*/.test(a.dob || ''), a.dob);
  // ordering clamp on a date (retirement date below CA+1 clamps up)
  await editField(page, 'val-age', '01 / 1976'); await page.waitForTimeout(150);
  await editField(page, 'val-activation', '06 / 2021'); await page.waitForTimeout(200);
  a = await readAges(page);
  check('Item4: date entry re-runs Item-1 ordering clamp (RA>=CA+1)', a.ret === a.age + 1 && a.ret === 51, 'CA=' + a.age + ' RA=' + a.ret);
  // DOB-absent fallback (birthYear = today - current-age slider)
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await editField(page, 'val-age', '40'); await page.waitForTimeout(120);
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await editField(page, 'val-activation', '06 / ' + (Y - 40 + 64)); await page.waitForTimeout(200);
  check('Item4: DOB-absent fallback resolves retirement date', (await readAges(page)).ret === 64, 'RA=' + (await readAges(page)).ret);
  // invalid-format revert (bad month, non-4-digit year leave slider unchanged)
  await editField(page, 'val-age', '45'); await page.waitForTimeout(120);
  const beforeAge = (await readAges(page)).age;
  await editField(page, 'val-age', '13 / 1985'); await page.waitForTimeout(150);
  check('Item4: invalid month -> revert', (await readAges(page)).age === beforeAge);
  await editField(page, 'val-age', '03 / 85'); await page.waitForTimeout(150);
  check('Item4: non-4-digit year -> revert', (await readAges(page)).age === beforeAge);
  await ctx.close();

  // ── Sketch parity ──
  ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  await page.goto(BASE + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check('Item5: _sketchOverlayOpen exposed', await page.evaluate(() => typeof window._sketchOverlayOpen === 'function'));
  await page.click('#sketchStartScratch'); await page.waitForTimeout(600);
  check('Item5: Sketch overlay dismissed', !(await visible(page, 'sketchOverlayWrap')));
  await page.click('.return-home'); await page.waitForTimeout(400);
  check('Item5: Return-to-Overview re-opens Sketch overlay', await visible(page, 'sketchOverlayWrap'));
  // Item 4 guardrail (a) — Sketch passes NO hooks: the default digit-only filter is intact
  // (a "/" is stripped as you type), proving the absent-hooks path is byte-identical.
  const skFilter = await page.evaluate(() => {
    const val = document.getElementById('val-age'); if (!val) return null;
    val.click(); const inp = val.nextSibling; inp.value = '03 / 1985';
    inp.dispatchEvent(new Event('input', { bubbles: true })); const v = inp.value; inp.blur();
    return v;
  });
  check('Item4: Sketch absent-hooks path byte-identical (digits-only filter)', skFilter !== null && skFilter.indexOf('/') === -1, skFilter);
  await ctx.close();

  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nP8 STUDIO MECHANICS: GREEN' : '\nP8 STUDIO MECHANICS: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
