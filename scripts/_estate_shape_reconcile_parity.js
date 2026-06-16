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
           sliderValue: sp ? +sp.value : null,
           valLabel: (document.getElementById('val-portfolio') || {}).textContent || null,
           portfolioVol: sfi ? +sfi.portfolioVol.toFixed(4) : null,
           datumK: sfi ? sfi.targetSpend : null, rooms: rooms,
           shapeState: (function(){const m=/shape-state-(\w+)/.exec(svg?svg.getAttribute('class'):'');return m?m[1].toUpperCase():null;})() };
});
// Expected native thumb position for a given dollar portfolio (matches DatumShape.scales).
const expectThumb = (page, dollars) => page.evaluate((d) => {
  const SC = window.DatumShape && DatumShape.scales; return SC ? SC.portValToPos(d / 1e6) : null;
}, dollars);

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

  // ── ARM 2: REAL add-room + value-entry events (Captain's repro), NO carry ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  // Crypto $120k + Pre-Tax 401k $250k = $300k investable, via the real addInstance + the room
  // value input's oninput=updateValueWithoutRender (NO manual updateSVGs).
  await page.evaluate(() => {
    function addAndValue(baseId, amount) {
      window.addInstance(baseId);
      var acc = window.state.accounts[window.state.accounts.length - 1];
      var inp = document.getElementById('room-val-inp-' + acc.id);
      if (inp) { inp.value = '$' + amount.toLocaleString('en-US'); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    addAndValue('crypto_co', 120000);
    addAndValue('pretax401k', 180000);
  });
  await page.waitForTimeout(1500);
  out.arm2 = await readSlider(page);
  out.arm2thumb = await expectThumb(page, 300000);
  await ctx.close();

  // ── ARM 3: carried sketch + drafted rooms (tie-fix) ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((args) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(args.blob));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1: args.blob }));
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ accounts: [args.room], profile: {}, datum: { net_datum_v1: 100000 }, climate: { outlook: 'history_repeats' } }));
    sessionStorage.setItem('datum_currentAge', '40');
    sessionStorage.setItem('datum_retireAge', '65');
    sessionStorage.setItem('datum_targetSpend', '100');
  }, { blob: SKETCH_BLOB, room: ROOM });
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm3 = await readSlider(page);
  out.arm3thumb = await expectThumb(page, 300000);
  await page.screenshot({ path: path.join(OUT, 'g5_reconcile_arm3.png') });
  await ctx.close();

  const f = out.findings;
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= (tol || 0);
  // ARM 1: estimate held (~750k), no rooms — label also shows the estimate.
  if (!near(+out.arm1.exactVal, 750000, 5000)) f.push('ARM1: estimate clobbered — slider ' + out.arm1.exactVal + ' expected ~750000');
  if (out.arm1.rooms !== 0) f.push('ARM1: unexpected rooms ' + out.arm1.rooms);
  // ARM 2 (REAL add-room events): rooms authoritative across exactVal + scenario + LABEL + THUMB.
  if (!near(+out.arm2.exactVal, 300000, 2000)) f.push('ARM2: exactVal not rooms-total — ' + out.arm2.exactVal);
  if (out.arm2.rooms < 1) f.push('ARM2: rooms not rendered (' + out.arm2.rooms + ')');
  if (out.arm2.valLabel !== '$300k') f.push('ARM2: VISIBLE LABEL stale — #val-portfolio="' + out.arm2.valLabel + '" expected $300k (Bug A)');
  if (!near(out.arm2.sliderValue, out.arm2thumb, 50)) f.push('ARM2: THUMB stale — value ' + out.arm2.sliderValue + ' expected ~' + Math.round(out.arm2thumb));
  // ARM 3 (REAL carry path): rooms survive AND win across exactVal + LABEL + THUMB.
  if (out.arm3.rooms < 1) f.push('ARM3: ROOMS PURGED on carry (rooms=' + out.arm3.rooms + ')');
  if (!near(+out.arm3.exactVal, 300000, 2000)) f.push('ARM3: rooms did not win exactVal — ' + out.arm3.exactVal);
  if (out.arm3.valLabel !== '$300k') f.push('ARM3: VISIBLE LABEL stale after carry — #val-portfolio="' + out.arm3.valLabel + '" expected $300k (Bug B)');
  if (!near(out.arm3.sliderValue, out.arm3thumb, 50)) f.push('ARM3: THUMB stale after carry — value ' + out.arm3.sliderValue + ' expected ~' + Math.round(out.arm3thumb));

  out.verdict = (f.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('G5 GATE FAIL', e); server.close(); process.exit(2); });
