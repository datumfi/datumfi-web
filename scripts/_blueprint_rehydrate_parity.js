'use strict';
// G2 LIVE GATE — Blueprint slot -> live Estate rooms rehydrate (save->reload->verify).
// A saved Blueprint slot (datum_blueprint_state_1) carrying itemized accounts must, on
// ?hydrate=blueprint, restore those rooms into the live Studio (state.accounts via
// seedFromBlueprint's G2 inverse) AND the G5 reconcile must make the rooms authoritative
// for the deterministic Shape's portfolio. Asserts the rendered rooms + slider, not "ran".
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
const PORT = 8173;

// A saved Blueprint slot with two investable rooms (200k pretax + 150k Roth = 350k).
const SLOT = {
  schema: 'studio-blueprint', version: '1.0.1', blueprint_id: 'g2', saved_at: new Date().toISOString(),
  profile: { primary_dob: '08 / 1982', target_retirement_date: '03 / 2035', plan_end_age: 93 },
  accounts: [
    { id: 'a1', baseId: 'pretax401k', value: 200000, inflow: 0, freq: 12, name: 'Pre-Tax 401(k)', holdings: [] },
    { id: 'a2', baseId: 'rothira',    value: 150000, inflow: 0, freq: 12, name: 'Roth IRA',        holdings: [] }
  ],
  portfolio_total: 350000, contributions_total: 25000,
  datum: { net_datum_v1: 100000, gross_funding_need: 0, derived_from: 'quick' },
  current: { ceil: 0, datum: 0, floor: 0, state: '' },
  designed: { present: false, levers: {} },
  climate: { outlook: 'history_repeats' }, market_paradigm: 'average', inflation_mode: 'real',
  tax: { working_year_effective_rate: 0.20 }
};

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const out = { findings: [], pageErrors: [] };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((slot) => {
    localStorage.setItem('datum_blueprint_state_1', JSON.stringify(slot));
  }, SLOT);
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=blueprint', { waitUntil: 'load' });
  await page.waitForTimeout(3200);

  out.read = await page.evaluate(() => {
    const sp = document.getElementById('slider-portfolio');
    const sfi = window._scenarioFromInputs ? window._scenarioFromInputs() : null;
    const bp = (window.DatumBlueprint && DatumBlueprint.load) ? (function(){try{return DatumBlueprint.load();}catch(e){return null;}})() : null;
    return {
      rooms: document.querySelectorAll('#rooms-container .room-input-container').length,
      sliderExact: sp && sp.dataset ? sp.dataset.exactVal : null,
      portfolioVol: sfi ? +sfi.portfolioVol.toFixed(4) : null,
      grossEstate: (document.getElementById('gross-estate-val') || {}).textContent || '',
      bpAccounts: bp && bp.accounts ? bp.accounts.length : null,
      loadSource: bp ? bp._loadSource : null
    };
  });
  await page.screenshot({ path: path.join(OUT, 'g2_blueprint_rehydrate.png') });
  await ctx.close();

  const r = out.read, f = out.findings;
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= (tol || 0);
  if (r.bpAccounts !== 2) f.push('load() did not carry 2 accounts into bp (got ' + r.bpAccounts + ', source ' + r.loadSource + ')');
  if (r.rooms !== 2) f.push('ROOMS NOT REHYDRATED — #rooms-container has ' + r.rooms + ' rooms, expected 2 (G2 inverse failed)');
  if (!near(+r.sliderExact, 350000, 3000)) f.push('SHAPE not driven by rooms total — slider ' + r.sliderExact + ' expected ~350000 (G5 reconcile on rehydrate)');

  out.verdict = (f.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('G2 GATE FAIL', e); server.close(); process.exit(2); });
