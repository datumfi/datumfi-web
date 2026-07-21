'use strict';
/* BUG A GATE (#288) — Net Worth headline (approach #1). Two halves against REAL bytes:
 *   G-NW-STAMP — drive the real studio.html: window.state.accounts = $3,156,651 of assets + a $5,000,000
 *                mortgage (debt) -> DatumBlueprint.captureDOM(bp) stamps bp.datum.net_worth = -1,843,349.
 *                RED today (no _computeNetWorth hook -> net_worth undefined).
 *   G-NW-CARD  — render the real Blueprint.html archive from a stubbed D1 blueprint whose payload carries
 *                datum.net_worth = -1,843,349 -> card headline shows "-$1.8M" under "Net Worth", plus the
 *                relabels (Amount Invested / Desired Spend / Rooms Built / Market Outlook). RED today
 *                (shows the ~$1.06M investable as "Net Estate"; new labels absent).
 * Run: node scripts/_gate_d1_networth_card.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
function serve(defaultPage) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = defaultPage;
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
}
const CLERK_INIT = () => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  window.Clerk = { load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
    user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
};

// $3,156,651 of assets (one taxable room) + a $5,000,000 mortgage (debt) => net worth -1,843,349.
const ACCTS = [
  { id: 'a0', baseId: 'taxable_primary', name: 'Brokerage', value: 3156651, holdings: [], exclude: false },
  { id: 'a1', baseId: 'mortgage_primary', name: 'Mortgage', value: 5000000, holdings: [], exclude: false }
];
const WANT_NW = -1843349;

(async () => {
  const browser = await chromium.launch();

  // ===== G-NW-STAMP — real studio.html captureDOM stamps bp.datum.net_worth =====
  {
    const server = serve('/studio.html'); const PORT = 8195; const base = 'http://127.0.0.1:' + PORT;
    await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(CLERK_INIT);
    await page.goto(base + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    const nw = await page.evaluate((accts) => {
      try {
        if (!window.DatumBlueprint || !window.state) return 'no-hub';
        window.state.accounts = accts;
        var bp = window.DatumBlueprint['new']();
        window.DatumBlueprint.captureDOM(bp);
        return (bp.datum && typeof bp.datum.net_worth === 'number') ? bp.datum.net_worth : 'unset';
      } catch (e) { return 'err:' + e.message; }
    }, ACCTS);
    ok(nw === WANT_NW, 'G-NW-STAMP: captureDOM stamps bp.datum.net_worth = assets − debts (got ' + nw + ', want ' + WANT_NW + ')');
    await ctx.close(); server.close();
  }

  // ===== G-NW-CARD — Blueprint.html renders the Net Worth headline + relabels =====
  {
    const server = serve('/Blueprint.html'); const PORT = 8196; const base = 'http://127.0.0.1:' + PORT;
    await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    const payload = JSON.stringify({ schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: 'nw-1',
      saved_at: '2026-07-16T00:00:00Z', profile: { primary_name: 'NW' }, accounts: ACCTS,
      datum: { net_datum_v1: 100000, net_worth: WANT_NW }, market_paradigm: 'optimistic' });
    const store = { 'nw-1': { payload: payload, revision: 1, updated_at: '2026-07-16T00:00:00Z' } };
    await ctx.route('**/*', (route) => {
      const req = route.request(); const u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u);
        if (req.method() === 'GET' && q.searchParams.get('list') === '1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [{ doc_key: 'nw-1', revision: 1, updated_at: '2026-07-16T00:00:00Z' }] }) });
        if (req.method() === 'GET') { const d = store[q.searchParams.get('key')]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await page.addInitScript(CLERK_INIT);
    await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const metrics = await page.$eval('.blueprint-slot.has-blueprint .blueprint-metrics', (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
    ok(/Net Worth/.test(metrics) && /−\$1\.8M/.test(metrics), 'G-NW-CARD: headline reads "Net Worth −$1.8M" (metrics="' + metrics + '")');
    ok(/Amount Invested/.test(metrics), 'G-NW-CARD: "Amount Invested" label present (the relabeled investableTotal)');
    ok(/Desired Spend/.test(metrics) && /Rooms Built/.test(metrics) && /Market Outlook/.test(metrics), 'G-NW-CARD: relabels Desired Spend / Rooms Built / Market Outlook present');
    ok(!/Net Estate/.test(metrics) && !/\bClimate\b/.test(metrics), 'G-NW-CARD: old "Net Estate" / "Climate" labels are gone');
    await ctx.close(); server.close();
  }

  await browser.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG A GATE (#288) — Net Worth headline + relabels (approach #1)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] BUG A NET-WORTH — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
