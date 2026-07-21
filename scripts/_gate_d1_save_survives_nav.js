'use strict';
/* BUG #2 GATE (#295) — save-lag / abandoned-save (async-completion). Drives the REAL studio.html: build
 * an estate, DatumBlueprint.save(newBlueprint) then IMMEDIATELY navigate (inside the old ~1.5s write
 * debounce window). The saved blueprint MUST still reach D1.
 *   G-SAVE-SURVIVES-NAV — a blueprint PUT with the rooms lands despite the fast nav. RED today (the
 *                         debounced write's setTimeout dies on unload -> no PUT ever fires).
 *   G-DELETE-KEEPALIVE  — a deleteDoc fired right before nav still hits the wire (keepalive). Best-effort
 *                         corroboration of the shared audit fix.
 * Run: node scripts/_gate_d1_save_survives_nav.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8200; const base = 'http://127.0.0.1:' + PORT;
const CLERK_INIT = () => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  window.Clerk = { load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:u'); } },
    user: { id: 'u', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
};

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const bpPuts = []; const deletes = [];
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u); const t = q.searchParams.get('type');
      if (req.method() === 'PUT' && t === 'blueprint') {
        let n = -1; try { const b = JSON.parse(req.postData() || '{}'); const pl = b.payload ? (typeof b.payload === 'string' ? JSON.parse(b.payload) : b.payload) : {}; n = Array.isArray(pl.accounts) ? pl.accounts.length : -1; } catch (e) {}
        bpPuts.push({ key: q.searchParams.get('key'), n: n });
        return route.fulfill({ status: 201, contentType: 'application/json', body: '{"revision":1}' });
      }
      if (req.method() === 'DELETE') { deletes.push(q.searchParams.get('key')); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"deleted":1}' }); }
      if (req.method() === 'GET') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"revision":1}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(CLERK_INIT);
  await page.goto(base + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  // Build an estate + save-as-new, then IMMEDIATELY navigate (no wait) — inside the old 1.5s debounce.
  await page.evaluate(() => {
    window.state.accounts = [
      { id: 'r0', baseId: 'taxable_primary', name: 'Brokerage', value: 500000, holdings: [] },
      { id: 'r1', baseId: 'roth401k_co', name: 'Roth', value: 90000, holdings: [] }
    ];
    var bp = window.DatumBlueprint['new']();
    window.DatumBlueprint.captureDOM(bp);
    window.DatumBlueprint.save(bp, { newBlueprint: true });   // d1WriteBlueprint -> writeNow (immediate) after the fix
  });
  await page.goto(base + '/studio.html?nav=1', { waitUntil: 'load' });   // fast nav, no delay
  await page.waitForTimeout(1800);
  const saved = bpPuts.some((p) => p.n >= 2);
  ok(saved, 'G-SAVE-SURVIVES-NAV: the saved blueprint PUT (rooms) reached D1 despite an immediate nav (bpPuts=' + JSON.stringify(bpPuts) + ')');

  // Delete-keepalive corroboration: fire a delete then nav immediately.
  await page.evaluate(() => { try { window.DatumD1.deleteDoc('sketchbook', 'del-me-1'); } catch (e) {} });
  await page.goto(base + '/studio.html?nav=2', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  ok(deletes.indexOf('del-me-1') >= 0, 'G-DELETE-KEEPALIVE: a delete fired right before nav still hit the wire (deletes=' + JSON.stringify(deletes) + ')');

  await ctx.close(); await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG #2 GATE (#295) — save-lag / abandoned-save (async-completion)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] SAVE-SURVIVES-NAV — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
