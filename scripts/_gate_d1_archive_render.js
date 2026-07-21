'use strict';
/* D1 PHASE-5a LAYER-2 RENDER HARNESS (headless, mocked-auth) — the substitute for the signed-in
 * smoke we can't do (Clerk pk_live bounces preview sign-ins to prod). Serves the repo, mocks a
 * signed-in Clerk user, and stubs /api/documents with a STATEFUL fixture of 6 blueprints, then loads
 * the REAL Blueprint.html and drives its REAL render/turn-page/erase. Asserts render-N (not 4),
 * the persistent turn-page, and Erase->D1 delete (no resurrect). Emits screenshots to _eyeson/ so the
 * Captain can SEE the signed-in archive without signing in.
 * Run: node scripts/_gate_d1_archive_render.js [LABEL] [--redfirst] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const RF = process.argv.includes('--redfirst');
const pick = (w, l) => (RF ? l : w);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8189; const base = 'http://127.0.0.1:' + PORT;

// ---- fixture: 6 saved blueprints, each with a real room count + name ----
function mkPayload(i) {
  const rooms = [9, 8, 11, 7, 13, 6][i - 1];
  const accts = [];
  for (let r = 0; r < rooms; r++) accts.push({ id: 'a' + r, baseId: 'taxable', name: 'Room ' + r, value: 100000 + i * 1000 + r, holdings: [] });
  return { schema: 'DatumFIBlueprintV1', blueprint_id: 'bp-' + i, saved_at: '2026-07-1' + i + 'T00:00:00Z', version: '1.0.1',
    profile: { primary_name: ['Baseline', 'Early-Exit', 'Coast-67', 'Aggressive', 'Legacy', 'Downsize'][i - 1] },
    accounts: accts, market_paradigm: ['optimistic', 'stress', 'average', 'optimistic', 'average', 'stress'][i - 1],
    datum: { net_datum_v1: 60000 + i * 8000 } };
}
function freshStore() { const s = {}; for (let i = 1; i <= 6; i++) s['bp-' + i] = { payload: JSON.stringify(mkPayload(i)), revision: 1, updated_at: mkPayload(i).saved_at }; return s; }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // ONE request handler (no route-precedence ambiguity): stateful /api/documents D1 mock,
  // local passthrough, external abort (kills the real Clerk SDK so our stub stands).
  let store = freshStore();
  await ctx.route('**/*', (route) => {
    const req = route.request(); const url = req.url();
    if (url.indexOf('/api/documents') >= 0) {
      const u = new URL(url);
      const type = u.searchParams.get('type'); const key = u.searchParams.get('key'); const list = u.searchParams.get('list') === '1';
      if (type !== 'blueprint') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && list) {
        const docs = Object.keys(store).map((k) => ({ doc_key: k, revision: store[k].revision, updated_at: store[k].updated_at }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: docs }) });
      }
      if (req.method() === 'GET') {
        const d = store[key];
        return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
                 : route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' });
      }
      if (req.method() === 'DELETE') {
        const had = !!store[key]; delete store[key];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: had ? 1 : 0 }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { localStorage.setItem('datum_workspace_name', 'Tester'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
      user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } }
    };
  });

  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const names = (sel) => page.$$eval('.blueprint-slot .blueprint-name', (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
  const savedTxt = await page.$eval('#summary-saved', (e) => e.textContent.trim()).catch(() => '?');

  // page-1 screenshot
  await page.screenshot({ path: path.join(OUT, 'archive_page1.png') });
  const namesP1 = await names();
  const seen = new Set(namesP1);
  lines.push('page1 cards: ' + JSON.stringify(namesP1) + ' | summary-saved: "' + savedTxt + '"');
  ok(pageErrors.length === 0, 'signed-in Blueprint.html loads with NO page errors');

  // ===== G-FOLD: a turn-page control exists and advances the page (persistent fold) =====
  const turnNext = await page.$('#bp-turn-next');
  let foldAdvances = false, namesP2 = [];
  if (turnNext) {
    const disabled = await turnNext.evaluate((b) => b.disabled);
    await turnNext.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, 'archive_midfold.png') });   // captured mid-fold (~700ms into 1600ms)
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(OUT, 'archive_page2.png') });
    namesP2 = await names();
    namesP2.forEach((n) => seen.add(n));
    const folded = await page.$eval('#bp-stage', (s) => s.classList.contains('folded') && s.classList.contains('leaf-on')).catch(() => false);
    foldAdvances = !disabled && namesP2.length > 0 && JSON.stringify(namesP2) !== JSON.stringify(namesP1) && folded;
    lines.push('page2 cards: ' + JSON.stringify(namesP2) + ' | fold persists: ' + folded);
  } else {
    lines.push('(no #bp-turn-next control — pre-rewrite 4-slot baseline)');
  }

  // ===== G-RENDER-N: 6 distinct blueprints render across pages (not capped at 4) =====
  ok(pick(seen.size >= 6, seen.size < 6), 'G-RENDER-N: archive renders 6 distinct blueprints from D1 across pages (not 4) [BITE]');
  // ===== G-CAP-DEAD: the "N / 4" cap baseline is gone =====
  const savedFlat = savedTxt.replace(/\s/g, '');
  ok(pick(savedFlat.indexOf('6') >= 0 && savedFlat.indexOf('/4') < 0, savedFlat.indexOf('6') < 0),
     'G-CAP-DEAD: summary shows 6 saved, the "/ 4" cap is gone [BITE]');
  // ===== G-FOLD =====
  ok(pick(foldAdvances, !foldAdvances), 'G-FOLD: turn-page control folds to page 2 and the fold persists [BITE]');

  // ===== G-ERASE: Erase -> DatumD1.deleteDoc removes the row (no resurrect on re-render) =====
  let eraseWorks = false;
  const firstErase = await page.$('.blueprint-slot .erase-action');
  if (firstErase) {
    const targetId = await firstErase.evaluate((b) => b.getAttribute('data-purge-id') || b.dataset.purgeTarget || '');
    const hadInStore = !!store[targetId];
    await firstErase.click();
    await page.waitForTimeout(200);
    const confirm = await page.$('#action-confirm-erase');
    if (confirm) { await confirm.click(); await page.waitForTimeout(1200); }
    const goneFromStore = hadInStore && !store[targetId];
    const goneFromDom = !(await names()).includes(namesP1[0]) || (await names()).length < namesP1.length;
    eraseWorks = goneFromStore;
    lines.push('erase target: "' + targetId + '" | had:' + hadInStore + ' goneFromStore:' + goneFromStore + ' goneFromDom:' + goneFromDom);
  } else {
    lines.push('(no .erase-action card to erase — pre-rewrite baseline)');
  }
  ok(pick(eraseWorks, !eraseWorks), 'G-ERASE: Erase calls DatumD1.deleteDoc — the D1 row is removed (no resurrect) [BITE]');

  if (pageErrors.length) lines.push('PAGE ERRORS: ' + pageErrors.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST' : 'NORMAL') + '   |   D1 L2 archive render harness   |   screenshots -> _eyeson/');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] D1 L2 RENDER — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
