'use strict';
// P5 Step-3 LIVE GATE — the Sketch NAV "Save Current Sketch" 4-slot picker (Studio parity).
// Asserts REAL signed-in/browser behavior (no source greps):
//  (a) picker renders 4 real slots from datumfi_sketchbook_v1 (all "Empty" on a fresh book).
//  (b) SHARED SOURCE: one nav save -> EXACTLY one entry in BOTH the LS book AND the Sketchbook
//      tiles (no phantom double-count); the picker write does NOT re-trigger the legacy
//      pending-snapshot consume (pending_save cleared, no second slot auto-populated).
//  (c) MID-STREAM: a partial-S1 save (no s2_design) round-trips through ?id=N with no crash
//      AND the saved slot carries no s2_design (partial), sliders rehydrate to saved values.
//  (d) OVERWRITE confirm fires on a FILLED slot (no silent overwrite; saved_at unchanged).
//  (e) DRAFTED (nav picker) vs MODELED (Phase-V CTA) badge by entry path.
//  (f) chosen-slot write lands in slot N (not always slot_1) and the resulting 4-slot
//      sketchbook_z fits safeMerge (real measured bytes reported).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const Codec = require('./datum-archive-codec.js');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8184;
const base = 'http://127.0.0.1:' + PORT;
const out = { findings: [], pageErrors: [] };
const F = (cond, msg) => { if (!cond) out.findings.push(msg); };
const readBook = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) { return null; } });
const armS1 = async (page, age) => page.evaluate((a) => {
  function set(id, v) { var el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); } }
  set('slider-age', a); set('slider-activation', 66); set('slider-datum', 60);
}, age);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (/\/vault\.html/.test(u)) return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>vault-stub</body></html>' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  // signed-IN Clerk stub (Sweety) + skip entry overlay; force the signed-IN action branch.
  // NB: addInitScript runs on EVERY navigation — it must NOT touch localStorage (that would
  // wipe a just-saved book on the hop to sketchbook.html). Only seed the signed-in session.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); }, user: { unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' } } };
  });

  // ── (a) picker renders 4 EMPTY slots from a fresh book ───────────────────────────────
  await page.goto(base + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { localStorage.removeItem('datumfi_sketchbook_v1'); sessionStorage.removeItem('datumfi_pending_save'); sessionStorage.removeItem('datumfi_sketch_current_snapshot'); } catch (e) {} });
  await armS1(page, 52);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.sketchSaveCurrent());
  await page.waitForTimeout(150);
  out.pickerOpen = await page.evaluate(() => {
    var pop = document.getElementById('sketch-save-sb-pop');
    if (!pop) return { exists: false };
    var head = (pop.querySelector('div') || {}).textContent || '';
    var labels = Array.prototype.map.call(pop.querySelectorAll('button'), function (b) { return b.textContent; });
    return { exists: true, head: head, labels: labels };
  });

  // ── (b)+(e nav=DRAFTED)+(f slot N) — save to SLOT 2 via the picker, then navigate ────
  await Promise.all([
    page.waitForURL('**/sketchbook.html', { timeout: 9000 }).catch(() => {}),
    page.evaluate(() => { document.querySelectorAll('#sketch-save-sb-pop button')[1].click(); }) // index 1 = A-02
  ]);
  await page.waitForTimeout(1500);
  out.afterNavSave = await page.evaluate(() => {
    var b = null; try { b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1')); } catch (e) {}
    var saved = 0; for (var n = 1; n <= 4; n++) { var t = document.getElementById('tile-slot-' + n); if (t && t.classList.contains('has-profile')) saved++; }
    var pill2 = (document.querySelector('#tile-slot-2 .slot-status-pill') || {}).textContent || '';
    return {
      url: location.pathname,
      slot1: !!(b && b.slot_1), slot2: !!(b && b.slot_2), slot3: !!(b && b.slot_3), slot4: !!(b && b.slot_4),
      slot2status: b && b.slot_2 && b.slot_2.status, slot2age: b && b.slot_2 && b.slot_2.age,
      slot2hasS2: !!(b && b.slot_2 && b.slot_2.s2_design),
      tilesSaved: saved, tile2Profile: !!(document.getElementById('tile-slot-2') || {}).classList && document.getElementById('tile-slot-2').classList.contains('has-profile'),
      pill2: pill2,
      pendingCleared: !sessionStorage.getItem('datumfi_pending_save')
    };
  });

  // ── (c) mid-stream partial-S1 round-trips through ?id=2 with no crash ────────────────
  const errBefore = out.pageErrors.length;
  await page.goto(base + '/sketch.html?id=2', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  out.reopen = await page.evaluate(() => ({ age: (document.getElementById('slider-age') || {}).value }));
  out.reopenErrs = out.pageErrors.length - errBefore;

  // ── (d) overwrite confirm fires on FILLED slot 2; no silent write ────────────────────
  await page.goto(base + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const bookBefore = await readBook(page);
  const savedAtBefore = bookBefore && bookBefore.slot_2 && bookBefore.slot_2.saved_at;
  await armS1(page, 47);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.sketchSaveCurrent());
  await page.waitForTimeout(120);
  await page.evaluate(() => { document.querySelectorAll('#sketch-save-sb-pop button')[1].click(); }); // filled slot 2 -> confirm view
  await page.waitForTimeout(120);
  out.overwrite = await page.evaluate(() => {
    var pop = document.getElementById('sketch-save-sb-pop');
    var txt = pop ? pop.textContent : '';
    var btns = pop ? Array.prototype.map.call(pop.querySelectorAll('button'), function (b) { return b.textContent; }) : [];
    return { txt: txt, btns: btns };
  });
  const bookAfterConfirm = await readBook(page);
  out.overwrite.savedAtUnchanged = !!(savedAtBefore && bookAfterConfirm && bookAfterConfirm.slot_2 && bookAfterConfirm.slot_2.saved_at === savedAtBefore);
  out.overwrite.stillOnSketch = await page.evaluate(() => location.pathname.indexOf('sketch.html') >= 0);
  // cancel -> back to slot list (no write)
  await page.evaluate(() => { var p = document.getElementById('sketch-save-sb-pop'); if (p) p.querySelectorAll('button')[1].click(); });
  await page.waitForTimeout(100);
  out.overwrite.backToList = await page.evaluate(() => { var p = document.getElementById('sketch-save-sb-pop'); return !!(p && /Save to which sheet/.test(p.textContent)); });

  // ── (e MODELED) — Phase-V CTA direct save to first-empty (slot 1) -> MODELED ─────────
  await page.evaluate(() => { var p = document.getElementById('sketch-save-sb-pop'); if (p) p.remove(); });
  await Promise.all([
    page.waitForURL('**/sketchbook.html', { timeout: 9000 }).catch(() => {}),
    page.evaluate(() => { document.getElementById('studio-cta-main').click(); })
  ]);
  await page.waitForTimeout(1200);
  out.phaseV = await page.evaluate(() => {
    var b = null; try { b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1')); } catch (e) {}
    var saved = 0; for (var n = 1; n <= 4; n++) { var t = document.getElementById('tile-slot-' + n); if (t && t.classList.contains('has-profile')) saved++; }
    return {
      slot1status: b && b.slot_1 && b.slot_1.status, slot2status: b && b.slot_2 && b.slot_2.status,
      tilesSaved: saved,
      pill1: (document.querySelector('#tile-slot-1 .slot-status-pill') || {}).textContent || ''
    };
  });

  // ── (f) measured 4-slot sketchbook_z bytes via the SAME codec the mirror uses ────────
  const finalBook = await readBook(page);
  const slimOne = (s) => s ? {
    age: s.age, retire_age: s.retire_age, portfolio_mass: s.portfolio_mass, contributions: s.contributions,
    datum_spend: s.datum_spend, designed_ceil: s.designed_ceil, designed_floor: s.designed_floor,
    resolved_state: s.resolved_state, status: s.status, date_stamped: s.date_stamped, time_stamped: s.time_stamped,
    s1_datum: s.s1_datum, s1_ceil: s.s1_ceil, s1_floor: s.s1_floor, s1_resolved_state: s.s1_resolved_state,
    s2_design: s.s2_design, market_outlook: s.market_outlook, tax_rate: s.tax_rate, inflation_mode: s.inflation_mode, plan_end_age: s.plan_end_age
  } : null;
  const slimBook = finalBook ? { sketchbook_title: finalBook.sketchbook_title || '', slot_1: slimOne(finalBook.slot_1), slot_2: slimOne(finalBook.slot_2), slot_3: slimOne(finalBook.slot_3), slot_4: slimOne(finalBook.slot_4) } : null;
  const skZ = slimBook ? Codec.encodeSketchbook(slimBook) : '';
  const merge = Codec.safeMerge({ dossier: { x: 1 }, blueprint_z: '1abc' }, { sketchbook_z: skZ });
  out.bytes = { sketchbook_z: Codec.byteLen(skZ), mergedTotal: merge.bytes, ok: merge.ok, cap: Codec.CAP };

  await ctx.close();

  // ── verdict ──
  const a = out.pickerOpen, nv = out.afterNavSave, ov = out.overwrite, pv = out.phaseV;
  // (a)
  F(a.exists, 'a: picker popup did not open');
  F(a.exists && /Save to which sheet/.test(a.head), 'a: picker head wrong (' + (a && a.head) + ')');
  F(a.exists && a.labels && a.labels.length === 4, 'a: picker did not render 4 slot buttons (' + (a.labels && a.labels.length) + ')');
  F(a.exists && a.labels && a.labels.every((l) => /Empty/.test(l)), 'a: fresh book slots not all Empty (' + JSON.stringify(a.labels) + ')');
  // (b) + (f slot N)
  F(nv.url.indexOf('sketchbook.html') >= 0, 'b: nav save did not navigate to sketchbook (' + nv.url + ')');
  F(nv.slot2 && !nv.slot1 && !nv.slot3 && !nv.slot4, 'f/b: write did not land in slot 2 ONLY (s1=' + nv.slot1 + ' s2=' + nv.slot2 + ' s3=' + nv.slot3 + ' s4=' + nv.slot4 + ')');
  F(nv.tilesSaved === 1, 'b: shared-source double-count — expected 1 saved tile, got ' + nv.tilesSaved);
  F(nv.tile2Profile, 'b: Sketchbook tile A-02 not rendered as saved');
  F(nv.pendingCleared, 'b: pending_save not cleared after picker save (re-consume risk)');
  // (c)
  F(out.reopenErrs === 0, 'c: page errors during partial-S1 reopen (' + out.reopenErrs + ')');
  F(!nv.slot2hasS2, 'c: partial save unexpectedly carried s2_design (not a mid-stream partial)');
  F(out.reopen.age === '52', 'c: reopened slider-age did not rehydrate to 52 (' + out.reopen.age + ')');
  // (d)
  F(/Overwrite A-02/.test(ov.txt), 'd: overwrite confirm did not fire on filled slot 2 (' + ov.txt.slice(0, 60) + ')');
  F(ov.btns.indexOf('Overwrite') >= 0 && ov.btns.indexOf('Cancel') >= 0, 'd: overwrite/cancel buttons missing (' + JSON.stringify(ov.btns) + ')');
  F(ov.stillOnSketch, 'd: silent overwrite — navigated away instead of confirming');
  F(ov.savedAtUnchanged, 'd: filled slot was written WITHOUT confirm (saved_at changed)');
  F(ov.backToList, 'd: Cancel did not return to the slot list');
  // (e)
  F(nv.slot2status === 'Drafted', 'e: nav picker save status != Drafted (' + nv.slot2status + ')');
  F(/Drafted/i.test(nv.pill2), 'e: tile A-02 pill not Drafted (' + nv.pill2 + ')');
  F(pv.slot1status === 'Modeled', 'e: Phase-V CTA save status != Modeled (' + pv.slot1status + ')');
  F(/Modeled/i.test(pv.pill1), 'e: tile A-01 pill not Modeled (' + pv.pill1 + ')');
  F(pv.slot2status === 'Drafted', 'e: prior Drafted slot mutated by Phase-V save (' + pv.slot2status + ')');
  F(pv.tilesSaved === 2, 'b: after two distinct saves expected 2 tiles, got ' + pv.tilesSaved + ' (phantom?)');
  // (f)
  F(out.bytes.ok === true, 'f: 4-slot sketchbook_z over safeMerge cap (' + out.bytes.mergedTotal + ')');
  F(out.bytes.sketchbook_z > 0, 'f: sketchbook_z empty');

  out.verdict = (out.findings.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('P5 PICKER GATE ERROR', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
