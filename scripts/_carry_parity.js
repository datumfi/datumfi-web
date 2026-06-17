'use strict';
// STANDING CARRY-ACCURACY GATE (Lesson 23 — gates must prove BEHAVIOR, not just copy).
// Drives a real Sketch under a NON-DEFAULT market (optimistic) + a high datum, Saves, opens
// Studio, and asserts the carry reproduces the SACRED Sketch shape:
//   (1) the blob carries market_outlook + tax_rate (the assumptions that move the ceiling),
//   (2) Studio's recomputed Have ceiling ~= the blob's s1_ceil (no silent default-market drop),
//   (3) Studio's Have state == Sketch's S1 state (no FALSE OVEREXTENDED).
// Sketch & Studio share datum-shape.js, so a divergence means the carried scenario differs.
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
const IGNORE = /clerk|cloudflareinsights|beacon|favicon|status of 400|autoscroll|posthog/i;
const stateClass = (cls) => { const m = /shape-state-(\w+)/.exec(cls || ''); return m ? m[1].toUpperCase() : null; };

(async () => {
  await new Promise((r) => server.listen(8153, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const report = { pageErrors: [], consoleErrors: [], sketch: {}, studio: {}, findings: [] };
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) report.consoleErrors.push(m.text().slice(0, 160)); });

  await page.goto('http://127.0.0.1:8153/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(2200);
  // optimistic market (raises the Sketch ceiling) + push the datum high (stress the shape).
  await page.evaluate(() => { const r = document.querySelector('input[name="market"][value="optimistic"]'); if (r) { r.checked = true; r.click(); } }).catch(() => {});
  await page.waitForTimeout(700);
  await page.evaluate(() => { const el = document.getElementById('slider-datum'); if (el) { el.value = String(Math.round(+el.min + (+el.max - +el.min) * 0.72)); el.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  let revealed = false;
  for (let i = 0; i < 24; i++) { revealed = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); }); if (revealed) break; await page.waitForTimeout(500); }
  for (let i = 0; i < 16; i++) { const g = await page.evaluate(() => { const s = document.getElementById('s2-splash'); if (!s) return true; const cs = getComputedStyle(s); return cs.display === 'none' || parseFloat(cs.opacity) < 0.05 || s.offsetParent === null; }); if (g) break; await page.waitForTimeout(500); }
  await page.waitForTimeout(600);
  report.sketch.s1State = await page.evaluate(() => { const e = document.getElementById('d2s-pin-state-name'); return e ? (e.textContent || '').trim() : null; });

  // P3: Save is now a GATED action — signed-out users are redirected to vault.html.
  // Set the signed-in condition at action time (after sketch.html's one-time Clerk
  // stale-hint cleanup has settled) so the carry save actually fires.
  await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
  await Promise.all([
    page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
    page.evaluate(() => { const a = document.getElementById('studio-cta-main'); if (a) a.click(); }).catch(() => {})
  ]);
  await page.waitForTimeout(900);

  await page.goto('http://127.0.0.1:8153/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  report.blob = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datum_sketch_state_1') || 'null'); } catch (e) { return null; } });
  report.studio.have = await page.evaluate(() => {
    const svg = document.getElementById('shape-panel-svg');
    const sfi = window._scenarioFromInputs ? window._scenarioFromInputs() : null;
    const d = window.DatumShape; let pts = null;
    try { if (d && sfi) pts = d.computeAt(sfi, Math.max(1, sfi.activationAge - sfi.currentAge)); } catch (e) {}
    return { cls: svg ? svg.getAttribute('class') : null, market: sfi ? sfi.baselineRate : null, taxMult: sfi ? sfi.taxMult : null,
             plan: sfi ? sfi.planThroughAge : null, ceilK: pts ? Math.round(pts.ceilSpend) : null,
             age: sfi ? sfi.currentAge : null, retire: sfi ? sfi.activationAge : null, years: sfi ? sfi.yearsToGrow : null,
             port: sfi ? +sfi.portfolioVol.toFixed(4) : null, contrib: sfi ? Math.round(sfi.annualContrib) : null,
             dobField: (document.getElementById('pri-dob') || {}).value || '',
             retField: (document.getElementById('target-ret') || {}).value || '' };
  });
  // Want-face "was ->" labels read _haveScn (slider-derived), so check they reflect 40/65.
  await page.click('#shape-mode-toggle').catch(() => {}); await page.waitForTimeout(1800);
  await page.click('#shape-want-tab').catch(() => {}); await page.waitForTimeout(1400);
  report.studio.wasLabels = await page.evaluate(() => ({
    age: (document.getElementById('swf-was-age') || {}).textContent || '',
    activation: (document.getElementById('swf-was-activation') || {}).textContent || ''
  }));
  await page.screenshot({ path: path.join(OUT, 'carry_parity_studio.png') });

  const bl = report.blob || {}, sk = report.sketch, hv = report.studio.have;
  report.studio.haveState = stateClass(hv.cls);
  const ceilBlobK = bl.s1_ceil ? Math.round(bl.s1_ceil / 1000) : null;
  report.ceilBlobK = ceilBlobK; report.ceilStudioK = hv.ceilK;
  const f = report.findings;
  if (bl.market_outlook !== 'optimistic') f.push('blob did not carry market_outlook=optimistic (got ' + bl.market_outlook + ')');
  if (bl.tax_rate == null) f.push('blob did not carry tax_rate');
  if (!ceilBlobK || !hv.ceilK) f.push('missing ceiling reading (blob ' + ceilBlobK + ' studio ' + hv.ceilK + ')');
  else if (Math.abs(hv.ceilK - ceilBlobK) / ceilBlobK > 0.05) f.push('CEILING DRIFT: Studio Have ceil ' + hv.ceilK + 'k vs Sketch s1_ceil ' + ceilBlobK + 'k (>5%) — market not carried');
  if (sk.s1State && report.studio.haveState && sk.s1State !== report.studio.haveState) f.push('STATE DRIFT: Sketch S1=' + sk.s1State + ' but Studio HAVE=' + report.studio.haveState);
  report.verdict = (f.length === 0 && report.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  await browser.close(); server.close();
  console.log(JSON.stringify({ verdict: report.verdict, sketchS1: sk.s1State, studioHave: report.studio.haveState, ceilBlobK, ceilStudioK: hv.ceilK, blobMarket: bl.market_outlook, blobTax: bl.tax_rate,
    blobScn: { age: bl.age, retire: bl.retire_age, port: bl.portfolio_mass, contrib: bl.contributions, plan: bl.plan_end_age },
    studioScn: { age: hv.age, retire: hv.retire, years: hv.years, port: hv.port, contrib: hv.contrib, plan: hv.plan, taxMult: hv.taxMult },
    dateFields: { dob: hv.dobField, ret: hv.retField }, wasLabels: report.studio.wasLabels,
    findings: f, pageErrors: report.pageErrors }, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('CARRY GATE FAIL', e); server.close(); process.exit(2); });
