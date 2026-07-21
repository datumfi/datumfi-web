'use strict';
/* L2 SLICE-2 PICKER SCREENSHOT (headless, mocked-auth) — the Captain's eyes on the premium Option-B
 * save-picker without a signed-in session (Clerk pk_live bounces preview sign-ins). Reuses the render
 * harness: serves the repo, mocks a signed-in Clerk user, stubs /api/documents with 6 blueprints, loads
 * the REAL studio.html, opens the "Save to Blueprint" popover, and shoots it to _eyeson/.
 * Run: node scripts/_shot_picker.js */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8191; const base = 'http://127.0.0.1:' + PORT;

function mkPayload(i) {
  const rooms = [9, 8, 11, 7, 13, 6][i - 1]; const accts = [];
  for (let r = 0; r < rooms; r++) accts.push({ id: 'a' + r, baseId: 'taxable', name: 'Room ' + r, value: 100000 + i * 1000 + r, holdings: [] });
  return { schema: 'DatumFIBlueprintV1', blueprint_id: 'bp-' + i, saved_at: '2026-07-1' + i + 'T00:00:00Z', version: '1.0.1',
    profile: { primary_name: ['Baseline', 'Early-Exit', 'Coast-67', 'Aggressive', 'Legacy', 'Downsize'][i - 1] },
    accounts: accts, datum: { net_datum_v1: 60000 + i * 8000 } };
}
function freshStore() { const s = {}; for (let i = 1; i <= 6; i++) s['bp-' + i] = { payload: JSON.stringify(mkPayload(i)), revision: 1, updated_at: mkPayload(i).saved_at }; return s; }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));

  const store = freshStore();
  await ctx.route('**/*', (route) => {
    const req = route.request(); const url = req.url();
    if (url.indexOf('/api/documents') >= 0) {
      const u = new URL(url); const type = u.searchParams.get('type'); const key = u.searchParams.get('key'); const list = u.searchParams.get('list') === '1';
      if (type !== 'blueprint') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && list) {
        const docs = Object.keys(store).map((k) => ({ doc_key: k, revision: store[k].revision, updated_at: store[k].updated_at }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: docs }) });
      }
      if (req.method() === 'GET') { const d = store[key]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { localStorage.setItem('datum_workspace_name', 'Tester'); } catch (e) {}
    // skip the studio entry overlay (its backdrop-blur veil) so the picker shoots clean
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { localStorage.setItem('datum_studio_overlay_seen', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
      user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } } };
  });

  await page.goto(base + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3500);   // studio is heavy — let boot settle
  // studio.html's load-time Clerk check can clear the hint; re-set it at action time (like the parity gates).
  await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
  // Drive the REAL signed-in Save button (account-topbar "⤓ Save Current Blueprint"). Its handler
  // passes ITSELF as the anchor -> studioSaveCurrent(_saveBtn) -> open(_saveBtn), running the true
  // anchor math (top=r.bottom+6, right=innerWidth-r.right) under that button.
  await page.evaluate(() => { var b = document.querySelector('[data-acct-action="save-current"]'); if (b) b.click(); });
  await page.waitForTimeout(1000);   // let listBlueprints (listDocs + getDoc x6) populate the overwrite list
  // report anchor geometry: pop top-under the button + right edges aligned
  const anchorCheck = await page.evaluate(() => {
    var b = document.querySelector('[data-acct-action="save-current"]'); var pop = document.getElementById('studio-save-bp-pop');
    if (!b || !pop) return null; var br = b.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    return { btnRight: Math.round(br.right), popRight: Math.round(pr.right), btnBottom: Math.round(br.bottom), popTop: Math.round(pr.top) };
  });
  console.log('ANCHOR:', JSON.stringify(anchorCheck), '(popTop≈btnBottom+6, popRight≈btnRight)');
  // G-ANCHOR (regression-proof, no human eyeball): the picker pops top-under the Save button, right
  // edges aligned. open(anchor) math = top:r.bottom+6, right:innerWidth-r.right. #276 Architect ask.
  var anchorFail = 0;
  if (!anchorCheck) { anchorFail++; console.log('FAIL G-ANCHOR: picker/button not found'); }
  else {
    var rightOk = Math.abs(anchorCheck.popRight - anchorCheck.btnRight) <= 1;
    var topOk = Math.abs(anchorCheck.popTop - (anchorCheck.btnBottom + 6)) <= 2;
    if (!rightOk) { anchorFail++; console.log('FAIL G-ANCHOR: popRight', anchorCheck.popRight, '!= btnRight', anchorCheck.btnRight); }
    if (!topOk) { anchorFail++; console.log('FAIL G-ANCHOR: popTop', anchorCheck.popTop, '!= btnBottom+6', anchorCheck.btnBottom + 6); }
    if (rightOk && topOk) console.log('PASS G-ANCHOR: popRight===btnRight & popTop===btnBottom+6 (anchored top-under, right-aligned)');
  }

  const popBox = await page.evaluate(() => {
    var pop = document.getElementById('studio-save-bp-pop'); if (!pop) return null;
    var r = pop.getBoundingClientRect();
    var rows = pop.querySelectorAll('[data-overwrite-id]').length;
    var hasNew = /Save as a new blueprint/.test(pop.textContent);
    return { x: r.left, y: r.top, w: r.width, h: r.height, rows: rows, hasNew: hasNew };
  });
  console.log('picker present:', !!popBox, '| overwrite rows:', popBox && popBox.rows, '| "Save as new":', popBox && popBox.hasNew, '| pageErrors:', errs.length);

  await page.screenshot({ path: path.join(OUT, 'picker_optionB_full.png') });
  if (popBox) {
    const pad = 14;
    await page.screenshot({ path: path.join(OUT, 'picker_optionB.png'),
      clip: { x: Math.max(0, popBox.x - pad), y: Math.max(0, popBox.y - pad), width: popBox.w + pad * 2, height: popBox.h + pad * 2 } });
  }
  // confirm-overwrite state — click the first existing sheet to show the "Overwrite this blueprint?" step
  await page.evaluate(() => { var r = document.querySelector('#studio-save-bp-pop [data-overwrite-id]'); if (r) r.click(); });
  await page.waitForTimeout(300);
  const popBox2 = await page.evaluate(() => { var pop = document.getElementById('studio-save-bp-pop'); if (!pop) return null; var r = pop.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  if (popBox2) { const pad = 14; await page.screenshot({ path: path.join(OUT, 'picker_optionB_confirm.png'), clip: { x: Math.max(0, popBox2.x - pad), y: Math.max(0, popBox2.y - pad), width: popBox2.w + pad * 2, height: popBox2.h + pad * 2 } }); }

  await browser.close(); server.close();
  console.log('screenshots -> _eyeson/picker_optionB.png, picker_optionB_confirm.png, picker_optionB_full.png');
  console.log('G-ANCHOR:', anchorFail === 0 ? 'GREEN' : 'RED');
  process.exit(anchorFail === 0 ? 0 : 1);
})();
