'use strict';
// P5 LIVE GATE — the Sketch NAV "Save Current Sketch" picker, POST-#310 UNLIMITED MODEL.
// RE-SCOPED 2026-07-27. This gate used to model a 4-SLOT CHOOSER; #310 killed the 4-cap and the
// picker became SAVE-AS-NEW + an OVERWRITE list. The old premise did not just mis-select — it was
// RETIRED, so the gate crashed reaching button[1] of a list with one button, and that crash blinded
// every check below it. Re-pointing the click would have produced a GREEN gate asserting a chooser
// the product does not have. DISCARDED as obsolete: "renders 4 slot buttons", "fresh slots all
// Empty", "write lands in slot N". (Sheets DO exist — but in the Sketchbook/Archive, which pages
// saves 4-at-a-time; the PICKER has no sheet, just a scrollable list the saves collect into.)
// Asserts REAL signed-in/browser behavior (no source greps):
//  (a) fresh book -> head "Save to Sketchbook", ONLY the save-as-new button, ZERO overwrite rows;
//      picker on-screen, incl. the hidden-anchor regression (signed-in topbar "does nothing" bug).
//  (b) save-as-new mints a uuid, lands in exactly ONE slot, STAYS on the Sketch (P6.1 Item-3),
//      clears pending_save, and a SECOND save-as-new mints a DISTINCT id — the unlimited contract.
//  (c) MID-STREAM: a partial-S1 save (no s2_design) round-trips through ?id=N with no crash.
//  (d) OVERWRITE confirm fires on an existing save (no silent overwrite; saved_at unchanged).
//  (e) DRAFTED (nav picker) vs MODELED (Phase-V CTA) badge by entry path.
//  (f) the resulting sketchbook_z fits safeMerge (real measured bytes reported).
// Usage: node scripts/_p5_sketch_picker_parity.js [--reuseid]
// PORTABILITY: self-hosts on 8184 and does require('./datum-archive-codec.js') — an instrumented
// copy MUST pin BOTH the ROOT (path.resolve, never forward-slash) and that relative require.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const Codec = require('./datum-archive-codec.js');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
// --reuseid RED-FIRST: break the unlimited contract at its source — make save-as-new REUSE one
// fixed id instead of keeping its freshly-minted uuid. Two save-as-new writes then collide, and the
// "each save-as-new mints a DISTINCT id" assertion MUST go red. Self-checking: a strip that matches
// nothing aborts rather than reporting a red-first it never performed (2026-07-26 masking rule).
const REUSEID = process.argv.includes('--reuseid');
function mutateSketch(src) {
  const before = src;
  const out = src.replace('if (forceNew) return payload.sketch_id;', "if (forceNew) return 'REUSED-FIXED-ID';");
  if (out === before) {
    console.error('❌ --reuseid STRIP MATCHED NOTHING — the mutation anchor is dead. Re-ground it.');
    console.error('   Refusing to report a red-first that mutated nothing.');
    process.exit(1);
  }
  return out;
}
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  if (REUSEID && /sketch\.html$/.test(p)) { res.end(mutateSketch(fs.readFileSync(fp, 'utf8'))); return; }
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

/* ── PRESENCE LAW, APPLIED TO THE DOM (repaired 2026-08-04, prompts #607/#608) ────────────────────
 * #sketch-save-sb-pop composes ASYNCHRONOUSLY: _skRenderSlots paints a "Loading…" placeholder, then
 * _skListSketches().then(...) fills the overwrite list AND — only there, once the archive confirms
 * the held id is still live — inserts the "Save progress" quick-save row at index 0. A gate that
 * selects before that callback lands is choosing from a popover that has not finished composing,
 * and neither its pass nor its fail proves anything. Settle first, every time. */
const pickerSettled = (page) => page.waitForFunction(() => {
  var pop = document.getElementById('sketch-save-sb-pop');
  if (!pop) return false;
  var list = pop.querySelector('.sk-ovlist');
  if (!list || /Loading…/.test(list.textContent)) return false;
  return list.querySelectorAll('.sk-ovrow').length > 0 || /No saved sketches yet/.test(list.textContent);
}, null, { timeout: 8000 });

/* ── SELECT BY LABEL, NEVER BY POSITION ───────────────────────────────────────────────────────────
 * The popover's COMPOSITION changes with state, so an index means different things at different
 * moments. buttons[0] was "＋ Save as a new sketch" on a fresh book and "Save progress" the instant
 * one sketch existed; buttons[1] meant "the second of four slots" in a chooser #310 retired, and on
 * a one-sketch book it is simply the first listed sketch. Both of those mis-addressings were live in
 * this gate. A miss is pushed as a FINDING, not swallowed: a click that did not land must red, and
 * an AMBIGUOUS match must red too — two buttons answering one description is not a selection. */
const clickByLabel = async (page, rx, what) => {
  const r = await page.evaluate((srcRx) => {
    var re = new RegExp(srcRx);
    var pop = document.getElementById('sketch-save-sb-pop');
    if (!pop) return { ok: false, why: 'popover absent', labels: [] };
    var btns = Array.prototype.slice.call(pop.querySelectorAll('button'));
    var labels = btns.map(function (b) { return b.textContent; });
    var hit = btns.filter(function (b) { return re.test(b.textContent); });
    if (hit.length !== 1) return { ok: false, why: hit.length ? 'AMBIGUOUS — ' + hit.length + ' buttons matched' : 'no button matched', labels: labels };
    hit[0].click();
    return { ok: true, labels: labels };
  }, rx.source);
  if (!r.ok) out.findings.push('SELECTOR: could not click ' + what + ' — ' + r.why + ' (buttons: ' + JSON.stringify(r.labels) + ')');
  return r;
};
/* saved_at of a sketch addressed by its OWN id, not by the slot it happens to occupy. */
const savedAtOf = (book, id) => { if (!book || !id) return null; for (var n = 1; n <= 4; n++) { var s = book['slot_' + n]; if (s && s.sketch_id === id) return s.saved_at; } return null; };

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
  const inView = () => {
    var pop = document.getElementById('sketch-save-sb-pop');
    if (!pop) return null;
    var r = pop.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), vw: window.innerWidth, vh: window.innerHeight };
  };
  out.pickerOpen = await page.evaluate(() => {
    var pop = document.getElementById('sketch-save-sb-pop');
    if (!pop) return { exists: false };
    var head = (pop.querySelector('div') || {}).textContent || '';
    var labels = Array.prototype.map.call(pop.querySelectorAll('button'), function (b) { return b.textContent; });
    var r = pop.getBoundingClientRect();
    return { exists: true, head: head, labels: labels, rows: pop.querySelectorAll('.sk-ovrow').length, rect: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), vw: window.innerWidth } };
  });

  // ── (a-regression) signed-in topbar anchor is the hidden #sketch-save-btn case: opening
  //    via a ZERO-rect anchor must NOT push the popup off-screen ("picker does nothing"). ──
  out.hiddenAnchor = await page.evaluate(() => {
    // close the picker opened above via the REAL toggle so the closure's _pop resets to null
    // (calling pop.remove() would leave _pop dangling and the next open would toggle-close).
    if (document.getElementById('sketch-save-sb-pop')) window.sketchSaveCurrent();
    var nav = document.getElementById('sketch-save-btn'); if (nav) nav.style.display = 'none';
    window.sketchSaveCurrent();   // no anchor -> falls back to the now-hidden nav button
    var pop = document.getElementById('sketch-save-sb-pop');
    var res = pop
      ? (function () { var r = pop.getBoundingClientRect(); return { exists: true, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), vw: window.innerWidth }; })()
      : { exists: false };
    if (document.getElementById('sketch-save-sb-pop')) window.sketchSaveCurrent(); // close via toggle
    if (nav) nav.style.display = '';
    return res;
  });
  // reopen the normal picker for the save flow below (only if not already open)
  await page.evaluate(() => { if (!document.getElementById('sketch-save-sb-pop')) window.sketchSaveCurrent(); });
  await page.waitForTimeout(120);

  // ── (b)+(e nav=DRAFTED)+(f slot N) — save to SLOT 2 via the picker. P6.1 Item-3: the
  //    nav-picker save now STAYS on the Sketch (Studio parity = save + keep working), so
  //    assert the write landed in localStorage + did NOT navigate. The DRAFTED-pill
  //    visibility (white-on-white guard) moves to the Phase-V Sketchbook render below,
  //    where slot_2 is still Drafted and the tile is actually painted.
  // RE-SCOPED 2026-07-27 — index [1] was the SECOND of four slot buttons. That chooser no longer
  // exists: #310 killed the 4-cap and the picker became SAVE-AS-NEW (button[0], "＋ Save as a new
  // sketch") + an OVERWRITE list of existing sketches (.sk-ovrow). Reaching [1] on a fresh book
  // threw on undefined, and the crash blinded every check below it.
  await pickerSettled(page);
  await clickByLabel(page, /Save as a new sketch/, 'save-as-new (first save)');
  await page.waitForTimeout(1500);
  out.afterNavSave = await page.evaluate(() => {
    var b = null; try { b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1')); } catch (e) {}
    var filled = 0, landed = 0;
    for (var n = 1; n <= 4; n++) { if (b && b['slot_' + n]) { filled++; if (!landed) landed = n; } }
    var s = landed ? b['slot_' + landed] : null;
    return {
      url: location.pathname,
      stayedOnSketch: location.pathname.indexOf('sketch.html') >= 0,
      landedSlot: landed,
      sketchId: s && s.sketch_id,
      status: s && s.status, age: s && s.age,
      hasS2: !!(s && s.s2_design),
      filledSlots: filled,
      pendingCleared: !sessionStorage.getItem('datumfi_pending_save')
    };
  });
  // THE UNLIMITED CONTRACT — a SECOND save-as-new must mint a DISTINCT id (its own D1 row), never
  // reuse the first. This is what --reuseid inverts, and it is the assertion that makes this gate
  // worth having under the post-#310 model.
  await page.evaluate(() => { if (!document.getElementById('sketch-save-sb-pop')) window.sketchSaveCurrent(); });
  /* THE SELECTOR THAT WAS WRONG. One sketch now exists, so _skQuickSaveRow has inserted "Save
     progress" ahead of it and buttons[0] is no longer save-as-new — the old index clicked quick-save,
     overwrote the FIRST sketch, and the "distinct id" assertion then read a book of one. */
  await pickerSettled(page);
  await clickByLabel(page, /Save as a new sketch/, 'save-as-new (second save)');
  await page.waitForTimeout(1500);
  out.secondNew = await page.evaluate(() => {
    var b = null; try { b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1')); } catch (e) {}
    var ids = []; for (var n = 1; n <= 4; n++) { if (b && b['slot_' + n]) ids.push(b['slot_' + n].sketch_id); }
    return { ids: ids, distinct: new Set(ids).size, count: ids.length };
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
  await armS1(page, 47);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.sketchSaveCurrent());
  await pickerSettled(page);
  /* ADDRESS THE ROW BY ITS OWN IDENTITY. The old leg read slot_2.saved_at while clicking whatever sat
     at buttons[1]. On a one-sketch book slot_2 is undefined, so `savedAtBefore && …` was FALSE
     VACUOUSLY — the assertion could not have failed for the right reason, and could not have passed
     for it either. Take the id the row itself points at, prove that sketch exists in the book BEFORE
     comparing (an exclusion assertion must be preceded by a presence assertion), then compare THAT
     sketch's saved_at rather than a slot's. */
  const target = await page.evaluate(() => {
    var r = document.querySelector('#sketch-save-sb-pop .sk-ovrow');
    return r ? { id: r.getAttribute('data-overwrite-id'), label: r.textContent } : null;
  });
  out.overwriteTarget = target;
  F(!!(target && target.id), 'd: PRESENCE — the picker offered NO overwrite row to click (nothing to confirm against)');
  const savedAtBefore = savedAtOf(bookBefore, target && target.id);
  F(!!savedAtBefore, 'd: PRESENCE — the row\'s sketch (' + (target && target.id) + ') is not in the book before the click; the no-write check would be vacuous');
  await page.evaluate((id) => { var r = document.querySelector('#sketch-save-sb-pop .sk-ovrow[data-overwrite-id="' + id + '"]'); if (r) r.click(); }, target && target.id);
  await page.waitForTimeout(120);
  out.overwrite = await page.evaluate(() => {
    var pop = document.getElementById('sketch-save-sb-pop');
    var txt = pop ? pop.textContent : '';
    var btns = pop ? Array.prototype.map.call(pop.querySelectorAll('button'), function (b) { return b.textContent; }) : [];
    return { txt: txt, btns: btns };
  });
  const bookAfterConfirm = await readBook(page);
  out.overwrite.savedAtBefore = savedAtBefore;
  out.overwrite.savedAtAfter = savedAtOf(bookAfterConfirm, target && target.id);
  out.overwrite.savedAtUnchanged = !!(savedAtBefore && out.overwrite.savedAtAfter === savedAtBefore);
  out.overwrite.stillOnSketch = await page.evaluate(() => location.pathname.indexOf('sketch.html') >= 0);
  // cancel -> back to the save list (no write). By LABEL: the confirm view is [Overwrite, Cancel],
  // and clicking index 1 was right only by luck — it is the destructive button that sits at index 0.
  await clickByLabel(page, /^Cancel$/, 'Cancel (overwrite confirm)');
  await page.waitForTimeout(100);
  out.overwrite.backToList = await page.evaluate(() => { var p = document.getElementById('sketch-save-sb-pop'); return !!(p && /Save to Sketchbook/.test(p.textContent)); });

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
    // White-on-white guard (relocated from the nav save): the DRAFTED slot_2 pill must be
    // DARK/visible on the light Sketchbook card. Read it here where the tile is painted.
    var pEl = document.querySelector('#tile-slot-2 .slot-status-pill');
    var p2 = (pEl || {}).textContent || '';
    var p2Color = '', p2RgbSum = 999;
    if (pEl) { p2Color = getComputedStyle(pEl).color; var mm = p2Color.match(/\d+/g); if (mm) p2RgbSum = (+mm[0]) + (+mm[1]) + (+mm[2]); }
    return {
      slot1status: b && b.slot_1 && b.slot_1.status, slot2status: b && b.slot_2 && b.slot_2.status,
      tilesSaved: saved,
      pill1: (document.querySelector('#tile-slot-1 .slot-status-pill') || {}).textContent || '',
      pill2: p2, pill2Color: p2Color, pill2RgbSum: p2RgbSum
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
  // (a) RE-SCOPED to the post-#310 unlimited model. The old assertions — "renders 4 slot buttons",
  // "fresh book slots all Empty", head "Save to which sheet" — described a 4-slot chooser that the
  // unlimited-saves change RETIRED. They are not re-pointed, they are DISCARDED: asserting them
  // against today's product would be a gate reading green on a fiction.
  F(a.exists, 'a: picker popup did not open');
  F(a.exists && /Save to Sketchbook/.test(a.head), 'a: picker head wrong (' + (a && a.head) + ')');
  F(a.exists && a.labels && a.labels.length === 1, 'a: fresh book should offer ONLY save-as-new, got ' + JSON.stringify(a.labels));
  F(a.exists && a.labels && /Save as a new sketch/.test(a.labels[0] || ''), 'a: save-as-new button missing (' + JSON.stringify(a.labels) + ')');
  F(a.exists && a.rows === 0, 'a: fresh book must show ZERO overwrite rows, got ' + a.rows);
  F(a.exists && a.rect && a.rect.width > 0 && a.rect.left >= -1 && a.rect.right <= a.rect.vw + 1, 'a: picker rendered off-screen (' + JSON.stringify(a.rect) + ')');
  // (a-regression) hidden-anchor open must stay on-screen
  const ha = out.hiddenAnchor;
  F(ha && ha.exists, 'a: picker did not open when anchored to a hidden nav button (signed-in topbar case)');
  F(ha && ha.exists && ha.width > 0 && ha.left >= -1 && ha.right <= ha.vw + 1 && ha.top >= -1, 'a: hidden-anchor picker rendered OFF-SCREEN — the signed-in "does nothing" bug (' + JSON.stringify(ha) + ')');
  // (b) + (f slot N)
  F(nv.stayedOnSketch, 'b: P6.1 Item-3 — nav-picker save must STAY on the Sketch, instead navigated to (' + nv.url + ')');
  F(nv.filledSlots === 1, 'b: shared-source double-count — expected 1 filled slot, got ' + nv.filledSlots);
  F(nv.pendingCleared, 'b: pending_save not cleared after picker save (re-consume risk)');
  // UNLIMITED MODEL (replaces the retired "write lands in slot N"): save-as-new mints a real uuid
  // and each subsequent save-as-new mints a DISTINCT one — its own D1 row, never a reuse.
  F(!!nv.sketchId && /^[0-9a-f-]{16,}$/i.test(nv.sketchId), 'b: save-as-new did not mint a uuid sketch_id (' + nv.sketchId + ')');
  const sn = out.secondNew;
  F(sn && sn.count === 2, 'b: a SECOND save-as-new did not create a second sketch (count=' + (sn && sn.count) + ')');
  F(sn && sn.distinct === sn.count, 'b: save-as-new REUSED an id — the unlimited contract is broken (' + JSON.stringify(sn && sn.ids) + ')');
  // (c)
  F(out.reopenErrs === 0, 'c: page errors during partial-S1 reopen (' + out.reopenErrs + ')');
  F(!nv.hasS2, 'c: partial save unexpectedly carried s2_design (not a mid-stream partial)');
  F(out.reopen.age === '52', 'c: reopened slider-age did not rehydrate to 52 (' + out.reopen.age + ')');
  // (d)
  F(/Overwrite/.test(ov.txt), 'd: overwrite confirm did not fire on filled slot 2 (' + ov.txt.slice(0, 60) + ')');
  F(ov.btns.indexOf('Overwrite') >= 0 && ov.btns.indexOf('Cancel') >= 0, 'd: overwrite/cancel buttons missing (' + JSON.stringify(ov.btns) + ')');
  F(ov.stillOnSketch, 'd: silent overwrite — navigated away instead of confirming');
  F(ov.savedAtUnchanged, 'd: filled slot was written WITHOUT confirm (saved_at changed)');
  F(ov.backToList, 'd: Cancel did not return to the save list');
  // (e)
  F(nv.status === 'Drafted', 'e: nav picker save status != Drafted (' + nv.status + ')');
  F(/Drafted/i.test(pv.pill2), 'e: tile A-02 pill not Drafted (' + pv.pill2 + ')');
  F(pv.pill2RgbSum < 300, 'e: DRAFTED pill is too light to read on the light card — white-on-white regression (' + pv.pill2Color + ')');
  F(pv.slot1status === 'Modeled', 'e: Phase-V CTA save status != Modeled (' + pv.slot1status + ')');
  F(/Modeled/i.test(pv.pill1), 'e: tile A-01 pill not Modeled (' + pv.pill1 + ')');
  F(pv.slot2status === 'Drafted', 'e: prior Drafted slot mutated by Phase-V save (' + pv.slot2status + ')');
  // THREE saves now run: save-as-new x2 (the unlimited-contract leg) + the Phase-V CTA save.
  F(pv.tilesSaved === 3, 'b: after three distinct saves expected 3 tiles, got ' + pv.tilesSaved + ' (phantom?)');
  // (f)
  F(out.bytes.ok === true, 'f: 4-slot sketchbook_z over safeMerge cap (' + out.bytes.mergedTotal + ')');
  F(out.bytes.sketchbook_z > 0, 'f: sketchbook_z empty');

  out.verdict = (out.findings.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  if (REUSEID) {
    // Masking-proof: assert the SPECIFIC unlimited-contract finding fired, not merely that the gate
    // went red — this gate has many checks and a bare  would be certified by any of them.
    var bit = out.findings.some(function (m) { return /REUSED an id/.test(m); });
    if (!bit) { console.error('❌ --reuseid RED-FIRST FAILED — id reuse did not trip the unlimited-contract check.'); process.exit(1); }
    console.log('✅ RED-FIRST OK — reusing the save-as-new id correctly turns the unlimited contract RED.');
    console.log(JSON.stringify({ findings: out.findings }, null, 1));
    server.close(); browser.close(); process.exit(0);
  }
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('P5 PICKER GATE ERROR', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
