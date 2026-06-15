'use strict';
// STANDING GATE — Sketch RE-OPEN assumption parity (Lesson 23: gates must prove BEHAVIOR).
// A sketch saved under a NON-DEFAULT market must re-open with the SAME S1 shape it was saved
// with. The re-open hydration (sketch.html Phase A + Phase B) must restore market/inflation/
// tax/plan-through BEFORE updateEngine() recomputes — otherwise the controls default
// (avg/real/20%/93), the ceiling shifts, and an EXPANSIVE S1 re-classifies STRETCHED
// (the save-under-optimistic regression). This gate saves optimistic+EXPANSIVE, re-opens via
// BOTH paths, and asserts: market radio restored AND recomputed S1 state == saved s1 state.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8167;
const stateClass = (cls) => { const m = /shape-state-(\w+)/.exec(cls || ''); return m ? m[1].toUpperCase() : null; };

function readReopen(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('sketch-canvas');
    const cs = (window.currentScenario || {});
    const lcp = (window.lastCalculatedPoints || {});
    return { marketRadio: (document.querySelector('input[name="market"]:checked') || {}).value || null,
             inflRadio: (document.querySelector('input[name="inflation"]:checked') || {}).value || null,
             taxVal: (document.getElementById('slider-tax') || {}).value || null,
             planVal: (document.getElementById('sl-plan-through') || {}).value || null,
             sliderDatumExact: (document.getElementById('slider-datum') || {}).dataset ? document.getElementById('slider-datum').dataset.exactVal : null,
             targetSpend: cs.targetSpend, recomputedCeilK: lcp.ceilSpend ? Math.round(lcp.ceilSpend) : null,
             canvasCls: cv ? cv.getAttribute('class') : null };
  }).then((r) => { r.state = stateClass(r.canvasCls); delete r.canvasCls; return r; });
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const report = { pageErrors: [], findings: [] };

  // ── SAVE: optimistic market, datum 150k (EXPANSIVE under the high optimistic ceiling) ──
  let ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  let page = await ctx.newPage();
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const r = document.querySelector('input[name="market"][value="optimistic"]'); if (r) { r.checked = true; r.click(); } }).catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate(() => { const el = document.getElementById('slider-datum'); if (el && typeof datumValToPos === 'function') { el.value = String(datumValToPos(150)); el.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  for (let i = 0; i < 24; i++) { const r = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); }); if (r) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  const payload = await page.evaluate(() => serializeSketchState());
  report.saved = { s1_datum: payload.s1_datum, s1_ceil: payload.s1_ceil, s1_state: payload.s1_resolved_state, market: payload.market_outlook, tax: payload.tax_rate, infl: payload.inflation_mode, plan: payload.plan_end_age };
  await ctx.close();
  if (report.saved.s1_state !== 'EXPANSIVE') report.findings.push('SETUP: saved S1 not EXPANSIVE (got ' + report.saved.s1_state + ') — adjust datum');
  if (report.saved.market !== 'optimistic') report.findings.push('SETUP: market not saved optimistic');

  // ── PHASE B re-open: ?id=1 reads localStorage ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/sketch.html', { waitUntil: 'load' });
  await page.evaluate((p) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(p));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ sketchbook_title: 'gate', slot_1: p }));
  }, payload);
  await page.goto('http://127.0.0.1:' + PORT + '/sketch.html?id=1', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  report.phaseB = await readReopen(page);
  await page.screenshot({ path: path.join(OUT, 'sketch_reopen_phaseB.png') });
  await ctx.close();

  // ── PHASE A re-open: sessionStorage 'datumfi_hydrate_from_slot' + sketchbook in localStorage,
  // seeded via addInitScript so both exist BEFORE the page's inline hydration runs. ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  await page.addInitScript((p) => {
    try {
      localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ sketchbook_title: 'gate', slot_1: p }));
      sessionStorage.setItem('datumfi_hydrate_from_slot', '1');
    } catch (e) {}
  }, payload);
  await page.goto('http://127.0.0.1:' + PORT + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  report.phaseA = await readReopen(page);
  await page.screenshot({ path: path.join(OUT, 'sketch_reopen_phaseA.png') });
  await ctx.close();

  // ── ASSERTIONS for both phases ──
  const f = report.findings;
  ['phaseB', 'phaseA'].forEach((ph) => {
    const r = report[ph]; if (!r) { f.push(ph + ': no reading'); return; }
    if (r.marketRadio !== report.saved.market) f.push(ph + ': market radio NOT restored (got ' + r.marketRadio + ', expected ' + report.saved.market + ')');
    if (report.saved.infl && r.inflRadio !== report.saved.infl) f.push(ph + ': inflation NOT restored (got ' + r.inflRadio + ')');
    if (report.saved.tax != null && String(r.taxVal) !== String(report.saved.tax)) f.push(ph + ': tax NOT restored (got ' + r.taxVal + ', expected ' + report.saved.tax + ')');
    if (report.saved.plan && String(r.planVal) !== String(report.saved.plan)) f.push(ph + ': plan-through NOT restored (got ' + r.planVal + ', expected ' + report.saved.plan + ')');
    if (r.state !== report.saved.s1_state) f.push(ph + ': S1 STATE FLIP — saved ' + report.saved.s1_state + ' re-opened ' + r.state + ' (assumptions not restored before recompute)');
    // saved s1_ceil is in dollars (serializeSketchState x1000); recomputedCeilK is in $k.
    var savedCeilK = report.saved.s1_ceil ? report.saved.s1_ceil / 1000 : null;
    if (savedCeilK && r.recomputedCeilK && Math.abs(r.recomputedCeilK - savedCeilK) / savedCeilK > 0.05) f.push(ph + ': CEILING DRIFT — saved ' + Math.round(savedCeilK) + 'k vs reopen ' + r.recomputedCeilK + 'k (>5%)');
  });

  report.verdict = (f.length === 0 && report.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(report, null, 2));
  await browser.close(); server.close();
  process.exit(report.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('SKETCH REOPEN GATE FAIL', e); server.close(); process.exit(2); });
