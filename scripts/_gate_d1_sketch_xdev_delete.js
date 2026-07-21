'use strict';
/* BUG #1 GATE (#295) — TRUE cross-device sketch delete. Device A and Device B are SEPARATE browser
 * contexts sharing ONE D1 store (the server). Device A erases via the REAL UI (deleteDoc must fire &
 * mutate the shared store); Device B is a FRESH context carrying a STALE Clerk sketchbook net + stale LS
 * (the reseed suspect). Device B must read the POST-DELETE D1 set (3), not the stale 4.
 *   G-A-DELETE-FIRES  — device A erase -> a DELETE /api/documents(sketchbook, id) hits the shared store.
 *   G-B-XDEV-REDUCED  — device B (fresh, stale Clerk+LS) reads 3, NOT the stale 4 (D1 authoritative).
 * Run: node scripts/_gate_d1_sketch_xdev_delete.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketchbook.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8199; const base = 'http://127.0.0.1:' + PORT;

function sk(id, age, when) { return { sketch_id: id, age: age, retire_age: 65, portfolio_mass: 1, contributions: 1, datum_spend: age * 1000, resolved_state: 'EXPANSIVE', s1_resolved_state: 'EXPANSIVE', date_stamped: '07/16', time_stamped: '12:00', status: 'Drafted', _when: when }; }
// SHARED D1 store — the "server", 4 sketches. Device A mutates it; Device B reads it.
const STORE = { w: sk('w', 40, '2026-07-16T13:00:00Z'), x: sk('x', 41, '2026-07-16T12:00:00Z'), y: sk('y', 42, '2026-07-16T11:00:00Z'), z: sk('z', 43, '2026-07-16T10:00:00Z') };
// STALE Clerk net + stale LS on device B = the OLD 4 (legacy sketchbook object).
const STALE_BOOK = { sketchbook_title: 'Stale', slot_1: sk('w', 40), slot_2: sk('x', 41), slot_3: sk('y', 42), slot_4: sk('z', 43) };

function seedFactory(withStaleNet, lsBook) {
  return function (args) {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    if (args.ls) { try { localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify(args.ls)); } catch (e) {} }
    var meta = args.net ? { sketchbook: args.net } : {};
    window.Clerk = { load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:u'); } },
      user: { id: 'u', unsafeMetadata: meta, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
  };
}
async function device(browser, seedArgs) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage(); const errs = []; const deletes = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u); const t = q.searchParams.get('type');
      if (t && t !== 'sketchbook') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && q.searchParams.get('list') === '1') { const docs = Object.keys(STORE).map((k) => ({ doc_key: k, revision: 1, updated_at: STORE[k]._when })); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: docs }) }); }
      if (req.method() === 'GET') { const d = STORE[q.searchParams.get('key')]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: JSON.stringify(d), revision: 1, updated_at: d._when }) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
      if (req.method() === 'DELETE') { const k = q.searchParams.get('key'); deletes.push(k); delete STORE[k]; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"deleted":1}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(seedFactory(), seedArgs);
  await page.goto(base + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  return { ctx, page, deletes, errs };
}
const ages = (page) => page.evaluate(() => { try { var b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || '{}'); var o = []; for (var i = 1; i <= 4; i++) { var s = b['slot_' + i]; if (s && typeof s.age === 'number') o.push(s.age); } return o.sort(function (a, c) { return a - c; }); } catch (e) { return ['ERR']; } });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // DEVICE A — fresh, reads the 4 from D1, then erases slot 1 (newest, sketch 'w', age 40) via the real UI.
  const A = await device(browser, { ls: null, net: null });
  const aBefore = await ages(A.page);
  let drove = false;
  try {
    await A.page.$eval('.slot-erase-action', (b) => b.click());
    await A.page.waitForTimeout(200);
    await A.page.click('#action-confirm-erase');
    await A.page.waitForTimeout(1200);
    drove = true;
  } catch (e) { lines.push('  [A drive err] ' + e.message); }
  ok(drove && A.deletes.length > 0, 'G-A-DELETE-FIRES: device A erase fired DELETE(sketchbook) to the shared store (deletes=' + JSON.stringify(A.deletes) + ', book was ' + JSON.stringify(aBefore) + ')');
  await A.ctx.close();

  // DEVICE B — SEPARATE fresh context, carrying a STALE Clerk net (4) + stale LS (4). Must read the
  // POST-DELETE D1 set from the SHARED store, not resurrect the stale 4.
  const B = await device(browser, { ls: STALE_BOOK, net: STALE_BOOK });
  const bAges = await ages(B.page);
  ok(bAges.length === 3, 'G-B-XDEV-REDUCED: device B (fresh + stale Clerk/LS net) reads the reduced D1 set, no resurrect (ages=' + JSON.stringify(bAges) + ', want 3)');
  lines.push('  [xdev] A-before=' + JSON.stringify(aBefore) + ' A-deletes=' + JSON.stringify(A.deletes) + ' B=' + JSON.stringify(bAges) + ' store-left=' + JSON.stringify(Object.keys(STORE)));
  if (B.errs.length) lines.push('  [B err] ' + B.errs.slice(0, 2).join(' | '));
  await B.ctx.close();

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG #1 GATE (#295) — TRUE cross-device sketch delete');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] SKETCH XDEV DELETE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
