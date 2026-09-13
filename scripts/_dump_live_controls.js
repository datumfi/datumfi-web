/* Does each declared control actually EXIST in live studio.html? Verified in a real DOM.
 *
 * ⛔ LAW 221. "equity" appears 149 times in live studio.html and nearly all of it is HOME equity
 *    in the property rooms — a substring check would have reported the allocation sliders as
 *    present when the product has no allocation control of any kind.
 * ⚠️ PRESENCE ONLY. This says a control is IN THE DOM. It does not say a user can reach it, that
 *    it is enabled, or that anything reads it. RENDERED IS NOT REACHABLE.
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8267;
const MAP = path.join(__dirname, '_panel_engine_map.json');
const OUT = path.join(os.tmpdir(), 'datum-live-controls.json');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

(async () => {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const selectors = [...new Set(Object.values(map.panel)
    .map((v) => v.live).filter((s) => s && s !== 'DYNAMIC'))];

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry|fonts\./i.test(u)) return r.abort();
    return r.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  const present = await page.evaluate((sels) => {
    const out = {};
    for (const s of sels) { try { out[s] = document.querySelectorAll(s).length; } catch (e) { out[s] = -1; } }
    return out;
  }, selectors);

  fs.writeFileSync(OUT, JSON.stringify({ measured_at: new Date().toISOString(), present }, null, 2), 'utf8');
  console.log(Object.keys(present).length + ' declared selectors checked in the live DOM');
  Object.keys(present).forEach((s) => console.log('   ' + s.padEnd(24) + (present[s] > 0 ? 'present x' + present[s] : 'ABSENT')));
  await browser.close(); server.close();
})().catch((e) => { console.error('FAILED', e); try { server.close(); } catch (_e) {} process.exit(1); });
