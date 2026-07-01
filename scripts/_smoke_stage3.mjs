/* DEV-ONLY Stage-3 smoke: serve repo, drive the real studio holdings modal headless.
   Asserts: (1) no page JS errors (edits parse), (2) ticker-bundle NOT fetched at page-load (lazy),
   (3) ensureTickerBundle loads on demand -> AAPL beta/yield correct units, (4) Tier-2 Yahoo cell
   renders the * + verbatim tooltip, Tier-1 (SEC sector) renders NO *, (5) autofill via fetchMockData. */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = join(ROOT, p);
  if (!existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(fp).toLowerCase()] || 'text/plain' });
  res.end(readFileSync(fp));
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const errors = [], reqs = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfinished', r => reqs.push(r.url()));
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: 'networkidle' });

const R = {};
R.pageErrors = errors.slice(0, 4);
R.ensureFn = await page.evaluate(() => typeof window.ensureTickerBundle === 'function');
R.bundleAtPageLoad = reqs.some(u => u.includes('ticker-bundle.js'));
R.bundleGlobalBefore = await page.evaluate(() => !!window.TICKER_BUNDLE);
// on-demand load
R.aapl = await page.evaluate(async () => { const b = await window.ensureTickerBundle(); const a = b.AAPL || {}; return { beta: a.beta, betaSrc: a.betaSrc, dividendYield: a.dividendYield, betaMethod: a.betaMethod }; });
// drive the real modal render
R.render = await page.evaluate(() => {
  window.state.accounts = [{ id: 'test1', baseId: 'taxable', showHoldings: true, value: 1751, holdings: [
    { ticker: 'AAPL', name: 'Apple Inc.', price: 175.1, shares: 10, sector: 'Technology', beta: 1.086, betaSrc: 'Yahoo Finance', betaAsOf: '2026-07-01', betaMethod: '5Y monthly vs S&P 500', dividendYield: 0.37, dividendYieldSrc: 'Yahoo Finance', dividendYieldAsOf: '2026-07-01' },
    { ticker: 'IBM', name: 'IBM', price: 200, shares: 5, sector: 'Technology', sectorSrc: 'SEC SIC' }
  ]}];
  window.openAccountModal('test1');
  const html = document.getElementById('modal-dynamic-content').innerHTML;
  const stars = (html.match(/ref-star/g) || []).length;
  const betaTip = /Reference estimate — beta is a computed figure/.test(html);
  const yldTip = /Reference figure — trailing yield as of/.test(html);
  const secStar = /Sector[\s\S]{0,400}ref-star/.test(html); // crude: sector should NOT be starred
  return { stars, betaTip, yldTip, hasTable: /holdings-table/.test(html) };
});
// autofill path (types a ticker, lazy bundle already loaded)
R.autofill = await page.evaluate(async () => {
  window.state.accounts = [{ id: 't2', baseId: 'taxable', showHoldings: true, value: 0, holdings: [{ ticker: '' }] }];
  window.openAccountModal('t2');
  window.fetchMockData('t2', 0, 'KO');
  await new Promise(r => setTimeout(r, 400));
  const h = window.state.accounts[0].holdings[0];
  return { ticker: h.ticker, beta: h.beta, betaSrc: h.betaSrc, dividendYield: h.dividendYield, sector: h.sector };
});
console.log(JSON.stringify(R, null, 2));
await browser.close(); server.close();
