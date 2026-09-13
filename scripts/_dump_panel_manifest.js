/* Read the Systems Panel manifest OFF THE RUNNING MOCK, not off a transcription.
   window.DATUMAE_MODEL_SCHEDULE is the prototype engine manifest; this flattens it to leaf
   paths so it can be laid against the engine's 28 fields.
   ⚠️ Studio Mock.html is HARD-HOLD: read only. Nothing here writes to it. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = 'C:/Users/tmnte/datumfi-web';
const PORT = 8259;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.xls': 'application/vnd.ms-excel' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, p);
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|sentry|fonts\./i.test(u)) return r.abort();
    return r.continue();
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/Studio%20Mock.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const out = await page.evaluate(() => {
    const M = window.DATUMAE_MODEL_SCHEDULE;
    if (!M) return { err: 'DATUMAE_MODEL_SCHEDULE not on window' };
    const leaves = [];
    (function walk(o, prefix) {
      for (const k of Object.keys(o)) {
        const v = o[k], p = prefix ? prefix + '.' + k : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p);
        else leaves.push({ path: p, value: (v === null ? null : (typeof v === 'object' ? JSON.stringify(v) : v)) });
      }
    })(M, '');
    return { leaves };
  });
  if (out.err) { console.log(JSON.stringify({ error: out.err })); }
  else {
    fs.writeFileSync(path.join(require('os').tmpdir(), 'datum-panel-manifest.json'),
      JSON.stringify({ measured_at: new Date().toISOString(), leaves: out.leaves }, null, 2), 'utf8');
    console.log(out.leaves.length + ' leaf paths read off the running Mock');
    out.leaves.forEach((l) => console.log('  ' + l.path.padEnd(46) + ' = ' + String(l.value).slice(0, 40)));
  }
  await browser.close(); server.close();
})().catch((e) => { console.error('DUMP FAILED', e); try { server.close(); } catch (_e) {} process.exit(1); });
