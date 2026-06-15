'use strict';
// G5 LIVE GATE — Estate→Shape reconcile + Sketch-wins-tie (rooms not purged on carry).
// Asserts the FULL behavior round-trip, not "function ran":
//   ARM 1 (no-clobber): carried Sketch, NO rooms -> slider keeps the carried ESTIMATE.
//   ARM 2 (rooms authoritative): a draft with an investable room -> slider == rooms total.
//   ARM 3 (tie-fix): carried Sketch + drafted rooms -> rooms SURVIVE (not purged) and win
//                    the portfolio, while the carry still seeds the datum/age sliders.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8171;

// A carried Sketch blob: portfolio ESTIMATE 750k, datum 100k, founder ages, default market.
const SKETCH_BLOB = {
  sketch_id: 'g5', version: '1.0.0', age: 40, retire_age: 65,
  portfolio_mass: 750000, contributions: 25000,
  datum_spend: 100000, designed_ceil: 166000, designed_datum: 100000, designed_floor: 41000,
  resolved_state: 'EXPANSIVE',
  s1_datum: 100000, s1_ceil: 166000, s1_floor: 41000, s1_resolved_state: 'EXPANSIVE',
  market_outlook: 'average', tax_rate: 20, inflation_mode: 'real', plan_end_age: 93
};
const ROOM = { id: 'g5acct', baseId: 'pretax401k', value: 300000, inflow: 0, freq: 12, name: 'Pre-Tax 401(k)', holdings: [] };

const readSlider = (page) => page.evaluate(() => {
  const sp = document.getElementById('slider-portfolio');
  const svg = document.getElementById('shape-panel-svg');
  const rooms = document.querySelectorAll('#rooms-container .room-input-container').length;
  const sfi = window._scenarioFromInputs ? window._scenarioFromInputs() : null;
  return { exactVal: sp && sp.dataset ? sp.dataset.exactVal : null,
           portfolioVol: sfi ? +sfi.portfolioVol.toFixed(4) : null,
           datumK: sfi ? sfi.targetSpend : null, rooms: rooms,
           shapeState: (function(){const m=/shape-state-(\w+)/.exec(svg?svg.getAttribute('class'):'');return m?m[1].toUpperCase():null;})() };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const out = { findings: [], pageErrors: [] };

  // ── ARM 1: carried sketch, no rooms ──
  let ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  let page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((b) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(b));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1: b }));
  }, SKETCH_BLOB);
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm1 = await readSlider(page);
  await ctx.close();

  // ── ARM 2: draft with an investable room, NO carry ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((room) => {
    sessionStorage.setItem('datum_studio_draft', JSON.stringify({ ts: Date.now(), accounts: [room], priDob: '08 / 1982', targetRet: '03 / 2035', spendInput: '$120,000' }));
  }, ROOM);
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm2 = await readSlider(page);
  await ctx.close();

  // ── ARM 3: carried sketch + drafted rooms (tie-fix) ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((args) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(args.blob));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1: args.blob }));
    sessionStorage.setItem('datum_studio_draft', JSON.stringify({ ts: Date.now(), accounts: [args.room], priDob: '08 / 1982', targetRet: '03 / 2035', spendInput: '$120,000' }));
    sessionStorage.setItem('datum_currentAge', '40');
    sessionStorage.setItem('datum_retireAge', '65');
    sessionStorage.setItem('datum_targetSpend', '100');
  }, { blob: SKETCH_BLOB, room: ROOM });
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm3 = await readSlider(page);
  await page.screenshot({ path: path.join(OUT, 'g5_reconcile_arm3.png') });
  await ctx.close();

  const f = out.findings;
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= (tol || 0);
  // ARM 1: estimate held (~750k), no rooms
  if (!near(+out.arm1.exactVal, 750000, 5000)) f.push('ARM1: estimate clobbered — slider ' + out.arm1.exactVal + ' expected ~750000');
  if (out.arm1.rooms !== 0) f.push('ARM1: unexpected rooms ' + out.arm1.rooms);
  // ARM 2: rooms authoritative (slider == 300k), room rendered
  if (!near(+out.arm2.exactVal, 300000, 2000)) f.push('ARM2: slider not rooms-total — ' + out.arm2.exactVal + ' expected 300000');
  if (out.arm2.rooms < 1) f.push('ARM2: room not restored from draft (rooms=' + out.arm2.rooms + ')');
  // ARM 3: rooms survive carry AND win portfolio; carry seeds datum
  if (out.arm3.rooms < 1) f.push('ARM3: ROOMS PURGED on carry (rooms=' + out.arm3.rooms + ') — tie-fix failed');
  if (!near(+out.arm3.exactVal, 300000, 2000)) f.push('ARM3: rooms did not win portfolio — slider ' + out.arm3.exactVal + ' expected 300000 (seed clobbered the reconcile?)');

  out.verdict = (f.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('G5 GATE FAIL', e); server.close(); process.exit(2); });
