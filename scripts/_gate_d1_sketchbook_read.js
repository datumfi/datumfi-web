'use strict';
/* BUG D GATE (#288) — sketchbook D1 read-cutover + delete-durability (Option 1). Drives the REAL
 * sketchbook.html with a mocked signed-in Clerk user + a STALE LS 4-slot book, stubbing D1 four ways:
 *   G-XDEV        — D1={2 new} + stale LS={4 old} -> book renders the 2 NEW (cross-device fresh).
 *                   RED today (reads Clerk/LS -> shows the 4 old).
 *   G-EMPTY-AUTH  — D1=[] (reachable) + stale LS={old} -> book EMPTY (L51 trust reachable-empty).
 *                   RED today (shows the stale LS).
 *   G-FALLBACK    — D1 list rejects (500) + LS={old} -> book falls back to LS (no regression).
 *   G-DELETE-D1   — stateful D1={A,B}; erase A via the UI -> a DELETE hits D1 for A's sketch_id -> A does
 *                   NOT resurrect on re-read. RED today (delete never reaches D1 -> A comes back).
 * Run: node scripts/_gate_d1_sketchbook_read.js [LABEL] */
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
const PORT = 8198; const base = 'http://127.0.0.1:' + PORT;

function sketch(id, age, when) {
  return { sketch_id: id, age: age, retire_age: 65, portfolio_mass: 1, contributions: 1, datum_spend: age * 1000,
    resolved_state: 'EXPANSIVE', s1_resolved_state: 'EXPANSIVE', date_stamped: '07/16', time_stamped: '12:00', status: 'Drafted', _when: when };
}
// stale LS 4-slot book: 4 OLD sketches (ages 20..23)
const OLD_BOOK = { sketchbook_title: 'Old', slot_1: sketch('o1', 20), slot_2: sketch('o2', 21), slot_3: sketch('o3', 22), slot_4: sketch('o4', 23) };

const SEED = (book) => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  try { localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify(book)); } catch (e) {}
  window.Clerk = { load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
    user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
};

// listMode: 'set'(store) | 'empty' | 'error'. Returns { page, ctx, deletes, agesFn }.
async function open(browser, listMode, store) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage(); const errs = []; const deletes = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u); const type = q.searchParams.get('type');
      if (type && type !== 'sketchbook') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && q.searchParams.get('list') === '1') {
        if (listMode === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server"}' });
        const docs = (listMode === 'empty') ? [] : Object.keys(store).map((k) => ({ doc_key: k, revision: 1, updated_at: store[k]._when }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: docs }) });
      }
      if (req.method() === 'GET') { const d = store && store[q.searchParams.get('key')]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: JSON.stringify(d), revision: 1, updated_at: d._when }) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
      if (req.method() === 'DELETE') { const k = q.searchParams.get('key'); deletes.push(k); if (store) delete store[k]; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"deleted":1}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(SEED, OLD_BOOK);
  await page.goto(base + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  return { page, ctx, deletes, errs };
}
const bookAges = (page) => page.evaluate(() => {
  try { var b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || '{}'); var out = []; for (var i = 1; i <= 4; i++) { var s = b['slot_' + i]; if (s && typeof s.age === 'number') out.push(s.age); } return out.sort(function (a, c) { return a - c; }); } catch (e) { return ['ERR']; }
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // G-XDEV
  {
    const store = { n1: sketch('n1', 50, '2026-07-16T10:00:00Z'), n2: sketch('n2', 51, '2026-07-16T11:00:00Z') };
    const { page, ctx, errs } = await open(browser, 'set', store);
    const ages = await bookAges(page);
    ok(JSON.stringify(ages) === JSON.stringify([50, 51]), 'G-XDEV: book renders the D1 set (2 new), NOT the stale LS 4 (ages=' + JSON.stringify(ages) + ', want [50,51])');
    if (errs.length) lines.push('  [xdev err] ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // G-EMPTY-AUTH
  {
    const { page, ctx } = await open(browser, 'empty', {});
    const ages = await bookAges(page);
    ok(ages.length === 0, 'G-EMPTY-AUTH: reachable-empty D1 -> book EMPTY, stale LS does NOT show (ages=' + JSON.stringify(ages) + ', want [])');
    await ctx.close();
  }
  // G-FALLBACK
  {
    const { page, ctx } = await open(browser, 'error', {});
    const ages = await bookAges(page);
    ok(JSON.stringify(ages) === JSON.stringify([20, 21, 22, 23]), 'G-FALLBACK: unreachable D1 (500) -> falls back to LS book (ages=' + JSON.stringify(ages) + ', want [20,21,22,23])');
    await ctx.close();
  }
  // G-DELETE-D1
  {
    const store = { A: sketch('A', 50, '2026-07-16T11:00:00Z'), B: sketch('B', 51, '2026-07-16T10:00:00Z') };  // A newest -> slot 1
    const { page, ctx, deletes, errs } = await open(browser, 'set', store);
    const before = await bookAges(page);
    let drove = false;
    try {
      await page.$eval('.slot-erase-action', (b) => b.click());          // opens the confirm modal for its slot
      await page.waitForTimeout(200);
      await page.click('#action-confirm-erase');
      await page.waitForTimeout(1100);                                   // 750ms erase anim + deleteDoc
      drove = true;
    } catch (e) { lines.push('  [delete drive err] ' + e.message); }
    const deletedA = deletes.indexOf('A') >= 0 && !store['A'];
    ok(drove && deletedA, 'G-DELETE-D1: erasing a sketch calls DELETE /api/documents(sketchbook, A) -> D1 row removed (deletes=' + JSON.stringify(deletes) + ')');
    // re-read: A must not resurrect
    const { page: p2, ctx: c2 } = await open(browser, 'set', store);
    const after = await bookAges(p2);
    ok(after.indexOf(50) < 0, 'G-NO-RESURRECT: after delete, the erased sketch does NOT come back on re-read (ages=' + JSON.stringify(after) + ', 50 must be absent)');
    lines.push('  [delete] before=' + JSON.stringify(before) + ' after=' + JSON.stringify(after));
    if (errs.length) lines.push('  [delete err] ' + errs.slice(0, 2).join(' | '));
    await c2.close(); await ctx.close();
  }

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG D GATE (#288) — sketchbook D1 read-cutover + delete-durability');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] BUG D SKETCHBOOK-READ — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
