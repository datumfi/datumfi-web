'use strict';
/* BUG #4 GATE (#301) — single authoritative D1-gated paint (kill the two-paint stale->fresh swap).
 * Records the REAL sequence of slot-1 card paints via a MutationObserver installed before page scripts.
 * Cold-start is modeled faithfully: Clerk.user is NULL until Clerk.load() (window.load), so Pass 1 (:1838)
 * genuinely hits the LS 4-slot; Pass 2 (onSessionConfirmed) hits D1. LS order/values differ from D1.
 *   G-SIGNED-IN-SINGLE   — with datum_auth_hint, slot-1 must NEVER paint the stale LS name first
 *                          (skeleton -> D1). RED today (LS paints first), GREEN after.
 *   G-SIGNED-OUT-GUARD   — WITHOUT the hint, the LS cold-start paint MUST still happen (no blank/skeleton
 *                          regression for logged-out/never-authed). GREEN before AND after.
 * Run: node scripts/_gate_d1_archive_single_paint.js [LABEL] */
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
const PORT = 8202; const base = 'http://127.0.0.1:' + PORT;

function bp(name, room, when) {
  return { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: 'id-' + name, saved_at: when,
    profile: { primary_name: name }, accounts: [{ id: 'a', baseId: 'taxable_primary', name: 'Rm', value: room, holdings: [] }],
    datum: { net_datum_v1: 100000, net_worth: room } };
}
// D1 store — newest-first these become slot-1='D1new'. Names distinct from the LS names.
const D1 = { 'id-D1new': { payload: JSON.stringify(bp('D1new', 900000, '2026-07-16T13:00:00Z')), revision: 1, updated_at: '2026-07-16T13:00:00Z' },
             'id-D1old': { payload: JSON.stringify(bp('D1old', 100000, '2026-07-16T10:00:00Z')), revision: 1, updated_at: '2026-07-16T10:00:00Z' } };
// STALE LS 4-slot — slot order (slot1='LSone'), different from D1 newest-first.
const LS_ARCH = { slot1: bp('LSone', 111111, '2026-07-15T01:00:00Z'), slot2: bp('LStwo', 222222, '2026-07-15T02:00:00Z'), slot3: null, slot4: null, activeBlueprintSlot: 1, userHasPremiumToken: false };

const SEED = (args) => {
  try { if (args.hint) sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  try { localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify(args.arch)); } catch (e) {}
  // record the sequence of DISTINCT slot-1 blueprint names painted (observer installed pre-page-scripts).
  window.__paints = [];
  function rec() { try { var el = document.querySelector('#blueprint-content-1 .blueprint-name'); var n = el ? el.textContent.trim() : ''; if (n && (!window.__paints.length || window.__paints[window.__paints.length - 1] !== n)) window.__paints.push(n); } catch (e) {} }
  try { new MutationObserver(rec).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); } catch (e) {}
  try { setInterval(rec, 40); } catch (e) {}   // belt-and-suspenders poll in case the observer misses a fast paint
  window.__rec = rec;
  // Clerk.user is NULL until load() RESOLVES (real Clerk latency) — so cold-start Pass 1 (:1838, sync at
  // parse) genuinely hits LS (d1Live() false), and Pass 2 (onSessionConfirmed, after load) hits D1.
  window.Clerk = { user: null,
    load: function () { return new Promise(function (r) { setTimeout(function () { window.Clerk.user = { id: 'u', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } }; r(); }, 700); }); },
    session: { getToken: function () { return Promise.resolve('tok:u'); } } };
};

async function run(browser, hint) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u); const t = q.searchParams.get('type');
      if (t !== 'blueprint') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      if (req.method() === 'GET' && q.searchParams.get('list') === '1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: Object.keys(D1).map((k) => ({ doc_key: k, revision: 1, updated_at: D1[k].updated_at })) }) });
      if (req.method() === 'GET') { const d = D1[q.searchParams.get('key')]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(SEED, { hint: hint, arch: LS_ARCH });
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  const paints = await page.evaluate(() => { try { if (window.__rec) window.__rec(); } catch (e) {} return window.__paints || []; });
  await ctx.close();
  return { paints, errs };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  const inHint = await run(browser, true);
  const staleFirst = inHint.paints.some((n) => /LSone|LStwo/.test(n));
  const showsD1 = inHint.paints.some((n) => /D1new/.test(n));
  ok(!staleFirst && showsD1, 'G-SIGNED-IN-SINGLE: with auth-hint, slot-1 never paints the stale LS name; first data paint is D1 (paints=' + JSON.stringify(inHint.paints) + ')');
  if (inHint.errs.length) lines.push('  [in err] ' + inHint.errs.slice(0, 2).join(' | '));

  const noHint = await run(browser, false);
  const lsPainted = noHint.paints.some((n) => /LSone/.test(n));
  ok(lsPainted, 'G-SIGNED-OUT-GUARD: WITHOUT auth-hint, the LS cold-start paint still happens (no skeleton regression) (paints=' + JSON.stringify(noHint.paints) + ')');
  if (noHint.errs.length) lines.push('  [noHint err] ' + noHint.errs.slice(0, 2).join(' | '));

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG #4 GATE (#301) — single authoritative D1-gated paint');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] ARCHIVE SINGLE-PAINT — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
