/* #364 MISS-6 sub#3 verify — studio ticker read-cutover. Proves fetchTickerFundamentals resolves
 * D1-FIRST from /api/tickers (no 1.74MB bundle request), and falls back to the bundle on a D1 miss.
 * /api/tickers is intercepted (canned real AAPL payload); ticker-bundle.js load is tracked. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CLERK = () => { window.Clerk = { load: () => Promise.resolve(),
  user: { id: 'u', unsafeMetadata: {}, update: () => Promise.resolve() }, session: { getToken: async () => 't' } }; };

const AAPL_PAYLOAD = JSON.stringify({ name: 'Apple Inc.', instrumentType: 'Stock', sector: 'Technology',
  geography: 'US', assetClass: 'US Equity', beta: 1.086, betaSrc: 'Yahoo Finance', dividendYield: 0.37 });
const API_HIT = JSON.stringify({ tickers: [{ symbol: 'AAPL', payload_json: AAPL_PAYLOAD, updated_at: '2026-07-19T20:25:33Z' }] });
const API_EMPTY = JSON.stringify({ tickers: [] });
const BUNDLE_STUB = 'window.TICKER_BUNDLE={AAPL:{name:"BUNDLE-Apple"},MSFT:{name:"BUNDLE-Microsoft",sector:"BundleSector"}};';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(CLERK);
  let apiMode = 'hit';           // 'hit' -> real AAPL row; 'empty' -> {tickers:[]}
  let bundleRequested = false;
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('/api/tickers')) return route.fulfill({ status: 200, contentType: 'application/json', body: apiMode === 'hit' ? API_HIT : API_EMPTY });
    if (u.includes('/scripts/ticker-bundle.js')) { bundleRequested = true; return route.fulfill({ status: 200, contentType: 'application/javascript', body: BUNDLE_STUB }); }
    if (u.startsWith(BASE) || u.startsWith('data:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto(BASE + 'studio.html', { waitUntil: 'load' });
  await wait(1500);

  const wired = await page.evaluate(() => ({ hasFetch: typeof window.fetchTickerFundamentals, hasBundle: typeof window.ensureTickerBundle, hasMock: typeof window.fetchMockData }));
  console.log('WIRING:', JSON.stringify(wired));

  // ---- POSITIVE: D1 hit -> fundamentals from /api/tickers, NO bundle load ----
  apiMode = 'hit'; bundleRequested = false;
  const pos = await page.evaluate(async () => { var e = await window.fetchTickerFundamentals('AAPL'); return e && e.name; });
  console.log(`POS D1-hit: fetchTickerFundamentals('AAPL').name = "${pos}" | bundleRequested=${bundleRequested}`);
  const posPass = pos === 'Apple Inc.' && bundleRequested === false;

  // ---- FALLBACK: D1 miss ({tickers:[]}) -> caller's resolve falls back to the bundle ----
  apiMode = 'empty'; bundleRequested = false;
  const fb = await page.evaluate(async () => {
    // exact resolve chain fetchMockData uses:
    var e = await window.fetchTickerFundamentals('MSFT');
    if (!e) e = await window.ensureTickerBundle().then(function (b) { return b['MSFT'] || null; });
    return e && e.name;
  });
  console.log(`FALLBACK D1-miss: resolved 'MSFT'.name = "${fb}" | bundleRequested=${bundleRequested}`);
  const fbPass = fb === 'BUNDLE-Microsoft' && bundleRequested === true;

  if (errs.length) console.log('pageerrors:', errs.slice(0, 4));
  console.log('\nPOSITIVE (D1-first, no bundle):', posPass ? 'PASS' : 'FAIL');
  console.log('FALLBACK (D1 miss -> bundle):', fbPass ? 'PASS' : 'FAIL');
  console.log('OVERALL:', posPass && fbPass ? 'GREEN' : 'RED');
  await browser.close();
  process.exit(posPass && fbPass ? 0 : 1);
})();
