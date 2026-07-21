'use strict';
/* BUG #1 GATE (#298) — sketch delete on the FALLBACK render path (the real failure D's gate missed).
 * Models Daniel's live case: the sketchbook renders WITHOUT the D1 fold (listDocs rejects), so
 * datum_sketch_state_<idx> is NEVER written — yet a sketch is displayed (from the LS/Clerk book, which
 * carries sketch_id). Drives the REAL erase UI and SPIES the wire (route captures the actual request):
 *   G-SLIM-KEEPS-ID       — _slimOne (sketchbook.html AND sketch.html) keeps sketch_id in the Clerk mirror.
 *   G-FALLBACK-DELETE      — on a fallback render (no datum_sketch_state), erasing a sketch FIRES a real
 *                            DELETE(sketchbook,key). RED today (no sketch_id resolves -> no DELETE).
 *   G-XDEV-CONVERGE        — a fresh 2nd context (D1 read OK) reads the reduced set after A's delete.
 * Run: node scripts/_gate_d1_sketch_delete_fallback.js [LABEL] */
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
const PORT = 8201; const base = 'http://127.0.0.1:' + PORT;

function sk(id, age, when) { return { sketch_id: id, age: age, retire_age: 65, portfolio_mass: 1, contributions: 1, datum_spend: age * 1000, resolved_state: 'EXPANSIVE', s1_resolved_state: 'EXPANSIVE', date_stamped: '07/16', time_stamped: '12:00', status: 'Drafted', _when: when }; }
// SHARED D1 store (server): 2 sketches. Device A erases (if the delete fires); device B reads it.
const STORE = { p: sk('p', 40, '2026-07-16T13:00:00Z'), q: sk('q', 41, '2026-07-16T12:00:00Z') };
// LS book carrying the FULL contract (has sketch_id) — realistic (D1 fold / same-device save write it).
const LS_BOOK = { sketchbook_title: 'Bk', slot_1: sk('p', 40), slot_2: sk('q', 41), slot_3: null, slot_4: null };

// listMode: 'reject' -> device A (fallback render, no fold, no datum_sketch_state) | 'ok' -> device B (reads store)
function seedFactory() {
  return function (args) {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    if (args.ls) { try { localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify(args.ls)); } catch (e) {} }
    // IMPORTANT: do NOT seed datum_sketch_state_* — that's the whole point (fallback render never wrote it).
    var meta = args.net ? { sketchbook: args.net } : {};
    window.Clerk = { load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:u'); } },
      user: { id: 'u', unsafeMetadata: meta, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
  };
}
async function device(browser, listMode, seedArgs) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage(); const errs = []; const deletes = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {                                   // <- the fetch SPY (captures the real request)
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u); const t = q.searchParams.get('type');
      if (t && t !== 'sketchbook') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && q.searchParams.get('list') === '1') {
        if (listMode === 'reject') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"x"}' });  // forces the fallback render
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: Object.keys(STORE).map((k) => ({ doc_key: k, revision: 1, updated_at: STORE[k]._when })) }) });
      }
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

  // G-SLIM-KEEPS-ID (#1) — the Clerk mirror must carry sketch_id (both slim encoders).
  const sbSrc = fs.readFileSync(path.join(ROOT, 'sketchbook.html'), 'utf8');
  const skSrc = fs.readFileSync(path.join(ROOT, 'sketch.html'), 'utf8');
  const sbSlim = sbSrc.slice(sbSrc.indexOf('function _slimOne'), sbSrc.indexOf('function _slimOne') + 700);
  const skSlim = skSrc.slice(skSrc.indexOf('function _slimOne'), skSrc.indexOf('function _slimOne') + 700);
  ok(/sketch_id\s*:/.test(sbSlim) && /sketch_id\s*:/.test(skSlim), 'G-SLIM-KEEPS-ID: _slimOne keeps sketch_id in the Clerk mirror (sketchbook.html AND sketch.html)');

  // G-FALLBACK-DELETE (#3/#4) — device A: fallback render (listDocs reject), LS book has sketch_id, NO
  // datum_sketch_state. Erase slot 1 via the real UI -> a real DELETE(sketchbook,'p') must fire.
  const A = await device(browser, 'reject', { ls: LS_BOOK, net: LS_BOOK });
  const aBefore = await ages(A.page);
  let drove = false;
  try {
    await A.page.$eval('.slot-erase-action', (b) => b.click());
    await A.page.waitForTimeout(200);
    await A.page.click('#action-confirm-erase');
    await A.page.waitForTimeout(1200);
    drove = true;
  } catch (e) { lines.push('  [A drive err] ' + e.message); }
  ok(drove && A.deletes.indexOf('p') >= 0, 'G-FALLBACK-DELETE: erase on a fallback render fires a real DELETE(sketchbook,p) (book was ' + JSON.stringify(aBefore) + ', deletes=' + JSON.stringify(A.deletes) + ')');
  if (A.errs.length) lines.push('  [A err] ' + A.errs.slice(0, 2).join(' | '));
  await A.ctx.close();

  // G-XDEV-CONVERGE — fresh device B (D1 read OK) reads the reduced shared store.
  const B = await device(browser, 'ok', { ls: null, net: null });
  const bAges = await ages(B.page);
  ok(bAges.length === 1 && bAges[0] === 41, 'G-XDEV-CONVERGE: fresh device B reads the reduced D1 set after A deleted p (ages=' + JSON.stringify(bAges) + ', want [41])');
  lines.push('  [conv] A-deletes=' + JSON.stringify(A.deletes) + ' store-left=' + JSON.stringify(Object.keys(STORE)) + ' B=' + JSON.stringify(bAges));
  if (B.errs.length) lines.push('  [B err] ' + B.errs.slice(0, 2).join(' | '));
  await B.ctx.close();

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG #1 GATE (#298) — sketch delete durable on the FALLBACK render (fetch-spy, real UI)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] SKETCH DELETE FALLBACK — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
