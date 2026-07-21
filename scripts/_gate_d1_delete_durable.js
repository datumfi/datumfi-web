'use strict';
/* BUG B GATE (#288) — delete durability / L51 source-of-truth. Drives the REAL Blueprint.html archive
 * with a mocked signed-in Clerk user and a STALE LS 4-slot net, while stubbing the D1 list two ways:
 *   G-EMPTY-AUTHORITATIVE — D1 list = [] (reachable 200) -> archive renders EMPTY (trusts D1, ignores the
 *                           stale LS net). RED on today's bytes (falls back to LS -> the deleted card
 *                           resurrects). This is the exact delete-resurrection symptom.
 *   G-UNREACHABLE-FALLBACK — D1 list rejects (500) -> archive falls back to the LS net (renders it).
 *                           GREEN before AND after — proves the fix did NOT just delete the fallback.
 * Run: node scripts/_gate_d1_delete_durable.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8193; const base = 'http://127.0.0.1:' + PORT;

// A valid saved blueprint to seed the STALE LS 4-slot net with (simulates a not-yet-propagated delete).
const STALE_BP = { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: 'stale-ghost-1',
  saved_at: '2026-07-15T00:00:00Z', profile: { primary_name: 'Ghost' },
  accounts: [{ id: 'a0', baseId: 'taxable_primary', name: 'Room 0', value: 123456, holdings: [] }],
  datum: { net_datum_v1: 100000 }, market_paradigm: 'optimistic' };
const LS_ARCH = { slot1: STALE_BP, slot2: null, slot3: null, slot4: null, activeBlueprintSlot: 1, userHasPremiumToken: false };

const CLERK_INIT = (arch) => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  try { localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify(arch)); } catch (e) {}   // stale LS net
  window.Clerk = {
    load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
    user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); },
      firstName: 'Ghost', primaryEmailAddress: { emailAddress: 't@t.co' } }
  };
};

// listMode: 'empty' -> 200 {documents:[]} (reachable) | 'error' -> 500 (unreachable)
async function archiveState(browser, listMode) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {
    const req = route.request(); const url = req.url();
    if (url.indexOf('/api/documents') >= 0) {
      const u = new URL(url);
      if (req.method() === 'GET' && u.searchParams.get('list') === '1') {
        if (listMode === 'error') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server error"}' });
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"documents":[]}' });   // reachable-empty
      }
      if (req.method() === 'GET') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(CLERK_INIT, LS_ARCH);
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  const saved = await page.$eval('#summary-saved', (e) => e.textContent.trim()).catch(() => '?');
  const cards = await page.$$eval('.blueprint-slot.has-blueprint', (els) => els.length).catch(() => -1);
  await ctx.close();
  return { saved, cards, errs };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  const empty = await archiveState(browser, 'empty');
  ok(empty.saved === '0' && empty.cards === 0,
     'G-EMPTY-AUTHORITATIVE: reachable-empty D1 -> archive renders EMPTY, the stale LS ghost does NOT resurrect (saved=' + empty.saved + ', cards=' + empty.cards + ')');
  if (empty.errs.length) lines.push('  [empty pageerrors] ' + empty.errs.slice(0, 3).join(' | '));

  const unreach = await archiveState(browser, 'error');
  ok(unreach.saved === '1' && unreach.cards === 1,
     'G-UNREACHABLE-FALLBACK: unreachable D1 (500) -> archive FALLS BACK to the LS net (saved=' + unreach.saved + ', cards=' + unreach.cards + ') — fallback preserved');
  if (unreach.errs.length) lines.push('  [unreach pageerrors] ' + unreach.errs.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG B GATE (#288) — delete durability / L51 reachable-empty authoritative');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] BUG B DELETE-DURABLE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
