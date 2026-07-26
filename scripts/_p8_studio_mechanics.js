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
const editField = (page, valId, text) => page.evaluate(([id, t]) => { const val = document.getElementById(id); val.click(); const inp = val.parentNode.querySelector('.ctrl-edit-input'); inp.value = t; inp.dispatchEvent(new Event('input', { bubbles: true })); const shown = inp.value; inp.blur(); return shown; }, [valId, text]);
const readAges = (page) => page.evaluate(() => { const tt = document.getElementById('studioOverlayToast'); return { age: parseInt(document.getElementById('slider-age').value, 10), ret: parseInt(document.getElementById('slider-activation').value, 10), plan: parseInt(document.getElementById('sl-plan-through').value, 10), dob: (document.getElementById('pri-dob') || {}).value, tret: (document.getElementById('target-ret') || {}).value, valAge: (document.getElementById('val-age') || {}).textContent, toast: tt ? tt.textContent : '', toastShown: !!(tt && tt.classList.contains('show')) }; });

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
  // The Studio may already be IN shape mode on load — a blind click would then
  // toggle it OFF and every later #shape-*-tab click times out. Settle to Estate
  // FIRST so the click below is always a real Estate->Shape transition (Item 2's
  // anti-flash sampling is only meaningful across a genuine transition).
  const subShown = () => page.evaluate(() => { const el = document.getElementById('shape-subtoggle'); return !!el && getComputedStyle(el).display !== 'none'; });
  if (await subShown()) { await page.click('#shape-mode-toggle'); await page.waitForTimeout(900); }
  check('Item2: Studio settled to Estate mode before the transition', !(await subShown()));
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
  // Seed BOTH stores: the live draft moved sessionStorage -> localStorage (autosave
  // Commit 2), so a single-store probe would silently stop watching the store the app
  // actually uses. ALSO seed a carried-design sentinel — _scratchReset() clears it
  // (studio.html _clearCarriedDesign) while the engine's debounced draft commit never
  // writes it, so it still proves "no scratch-reset ran" even if the draft is
  // legitimately re-written at defaults post-flip.
  await page.evaluate(() => {
    const d = JSON.stringify({ marker: 'KEEPME' });
    localStorage.setItem('datumfi_blueprint_draft_v1', d);
    sessionStorage.setItem('datumfi_blueprint_draft_v1', d);
    sessionStorage.setItem('datum_designed_ceil', 'KEEPME-CEIL');
  });
  check('Item5: _studioOverlayOpen exposed', await page.evaluate(() => typeof window._studioOverlayOpen === 'function'));
  await page.click('.return-home'); await page.waitForTimeout(400);
  check('Item5: Return-to-Overview re-opens Studio overlay', await visible(page, 'studioOverlayWrap'));
  await page.click('#studioCloseIntro'); await page.waitForTimeout(700);
  check('Item5: re-opened X soft-dismisses', !(await visible(page, 'studioOverlayWrap')));
  // Assert PRESENCE in BOTH stores, not marker content: a scratch-reset REMOVES the
  // key (fails), while the engine's debounced commit merely REWRITES it (must not
  // fail). Requiring both stores keeps this honest whichever one is live.
  const i5 = await page.evaluate(() => ({
    inLocal:   localStorage.getItem('datumfi_blueprint_draft_v1') != null,
    inSession: sessionStorage.getItem('datumfi_blueprint_draft_v1') != null,
    sentinelKept: sessionStorage.getItem('datum_designed_ceil') === 'KEEPME-CEIL'
  }));
  check('Item5: in-progress Blueprint preserved (no scratch-reset)', i5.inLocal && i5.inSession, JSON.stringify(i5));
  check('Item5: soft-dismiss did NOT run scratch-reset (carried-design intact)', i5.sentinelKept, JSON.stringify(i5));
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
  // 4b strict — auto-slash, valid date collapses to age, month round-trips (not 06/...).
  const shown = await editField(page, 'val-age', '081982'); await page.waitForTimeout(200);
  check('Item4: auto-slash formats to MM / YYYY', /^08\s*\/\s*1982$/.test(shown), shown);
  let a = await readAges(page);
  check('Item4: valid date collapses to age', a.age === Y - 1982 - (Mo < 8 ? 1 : 0) && /yrs/.test(a.valAge || ''), a.valAge);
  check('Item4: month round-trips to Profile (not 06)', /^08\s*\/\s*1982$/.test(a.dob || ''), a.dob);
  // 4a — 031985555 capped to 03/1985 (not age 85); out-of-18-85 and 2-digits rejected w/ toast.
  const capped = await editField(page, 'val-age', '031985555'); await page.waitForTimeout(150);
  check('Item4: 031985555 capped to 03 / 1985', /^03\s*\/\s*1985$/.test(capped), capped);
  let bAge = (await readAges(page)).age;
  await editField(page, 'val-age', '08'); await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: 2-digits-alone rejected with toast', a.age === bAge && a.toastShown && /MM \/ YYYY/.test(a.toast), a.toast);
  bAge = (await readAges(page)).age;
  await editField(page, 'val-age', '01 / ' + (Y - 10)); await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: age<18 rejected with 18-85 toast', a.age === bAge && /between 18 and 85/.test(a.toast), a.toast);
  // P8.1 Q1 — month 13 now REJECTS with a toast (no silent auto-clamp to 12).
  bAge = (await readAges(page)).age;
  await editField(page, 'val-age', '13 / 1985'); await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: month 13 rejected with toast', a.age === bAge && a.toastShown && /Month must be/.test(a.toast), a.toast);
  // P8.1 — RA out-of-order / nonsensical target dates REJECT with a toast (no silent clamp).
  await editField(page, 'val-age', '01 / 1976'); await page.waitForTimeout(150);
  let bRet = (await readAges(page)).ret;
  await editField(page, 'val-activation', '06 / 2021'); await page.waitForTimeout(150); // age ~45 < CA+1
  a = await readAges(page);
  check('Item4: RA below CA+1 rejected (not clamped)', a.ret === bRet && a.toastShown && /Retirement age must be/.test(a.toast), 'RA=' + a.ret + ' ' + a.toast);
  bRet = (await readAges(page)).ret;
  await editField(page, 'val-activation', '01 / 3052'); await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: nonsensical RA year (3052) rejected (not clamped to max)', a.ret === bRet && /Retirement age must be/.test(a.toast), 'RA=' + a.ret);
  // a VALID in-window RA date still commits.
  await editField(page, 'val-activation', '06 / ' + (Y - (Y - 1976) + 62)); await page.waitForTimeout(150);
  check('Item4: valid RA date commits', (await readAges(page)).ret === 62, 'RA=' + (await readAges(page)).ret);
  // nonsensical PTA year rejects too.
  let bPlan = (await readAges(page)).plan;
  await editField(page, 'val-plan-through', '01 / 9855'); await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: nonsensical PTA year (9855) rejected', a.plan === bPlan && /Plan-through age must be/.test(a.toast), 'PTA=' + a.plan);
  // DOB-absent fallback (birthYear = today - current-age slider).
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await editField(page, 'val-age', '01 / ' + (Y - 40)); await page.waitForTimeout(150);
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await editField(page, 'val-activation', '06 / ' + (Y - 40 + 64)); await page.waitForTimeout(200);
  check('Item4: DOB-absent fallback resolves retirement date', (await readAges(page)).ret === 64, 'RA=' + (await readAges(page)).ret);
  // slider drag still yields a plain age (display) + preserves the Profile month.
  await editField(page, 'val-age', '06 / 1979'); await page.waitForTimeout(150);
  await page.evaluate(() => { const el = document.getElementById('slider-age'); el.value = '55'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150);
  a = await readAges(page);
  check('Item4: slider drag yields plain age + keeps month', a.age === 55 && /55\s*yrs/.test(a.valAge || '') && /^06\s*\/\s*/.test(a.dob || ''), a.valAge + ' / ' + a.dob);

  // ── 2A — Profile "Plan Through" field is a MM/YYYY mirror of the sl-plan-through slider
  // (single PTA-age source); typed date writes the slider; payload plan_end_age stays integer.
  let pe = await page.evaluate(() => ({ type: document.getElementById('plan-end-age').type, val: document.getElementById('plan-end-age').value }));
  check('2A: plan-end-age is a text MM/YYYY mirror', pe.type === 'text' && /^\d{2}\s*\/\s*\d{4}$/.test(pe.val), pe.val);
  await page.evaluate(() => { const el = document.getElementById('sl-plan-through'); el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(150);
  pe = await page.evaluate(() => document.getElementById('plan-end-age').value);
  check('2A: slider drag re-mirrors the date field', /^\d{2}\s*\/\s*\d{4}$/.test(pe), pe);
  const caNow = await page.evaluate(() => parseInt(document.getElementById('slider-age').value, 10));
  await page.evaluate(() => { const d = document.getElementById('pri-dob'); if (d) d.value = ''; });
  await page.evaluate((v) => { const el = document.getElementById('plan-end-age'); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); if (window._commitPlanEndDate) window._commitPlanEndDate(el); }, '01 / ' + (Y - caNow + 95));
  await page.waitForTimeout(200);
  check('2A: typed valid date sets slider age', (await page.evaluate(() => parseInt(document.getElementById('sl-plan-through').value, 10))) === 95);
  const peBefore = await page.evaluate(() => parseInt(document.getElementById('sl-plan-through').value, 10));
  await page.evaluate(() => { const el = document.getElementById('plan-end-age'); el.value = '01 / 3052'; el.dispatchEvent(new Event('input', { bubbles: true })); if (window._commitPlanEndDate) window._commitPlanEndDate(el); });
  await page.waitForTimeout(200);
  const peAfter = await page.evaluate(() => ({ plan: parseInt(document.getElementById('sl-plan-through').value, 10), warn: document.getElementById('plan-end-warn').style.display }));
  check('2A: invalid date reverts slider + warns', peAfter.plan === peBefore && peAfter.warn === 'block', JSON.stringify(peAfter));
  const planPayload = await page.evaluate(() => { try { const bp = window.DatumBlueprint['new'](); window.DatumBlueprint.captureDOM(bp); return bp.profile.plan_end_age; } catch (e) { return 'ERR:' + e.message; } });
  check('2A: payload plan_end_age stays an INTEGER age (shape unchanged)', typeof planPayload === 'number' && Number.isInteger(planPayload) && planPayload >= 75 && planPayload <= 105, JSON.stringify(planPayload));
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
})().catch((e) => {
  // TRAP-AND-REPORT-PARTIAL. THIS gate is the reason the law exists. It aborted on a #shape-want-tab
  // click and printed only at the end, so every check it had already run was discarded — and ELEVEN
  // real reds sat invisible behind what looked like a flaky timeout. The exit code was honestly 1
  // the whole time; what was missing was the signal.
  //
  // Flush what we DO know, then say plainly that the run did not finish. The INCOMPLETE line is the
  // load-bearing half: a flushed partial with no marker reads as a COMPLETE pass, which is a worse
  // trap than printing nothing at all.
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
