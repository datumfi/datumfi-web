'use strict';
/* =====================================================================================
 * QUARANTINED 2026-07-28 - DO NOT TRUST THIS GATE VERDICT (green OR red).
 *
 * it reports GREEN only because its fixture date rotted. Measured 2026-07-28: with the
 * hardcoded updated_at it is GREEN 6/0; with a CURRENT stamp it is RED 1/5. It was authored
 * as a red-first and went green by the calendar, never by a fix. Its pass means nothing.
 *
 * Kept for its intent, NOT its result. Retired from decision-making by Captain ruling at
 * the close of the gate-integrity arc. Do not "fix the date" - that converts a false pass
 * into a red nobody has agreed to investigate. Re-premise it against confirmed live
 * behaviour, or delete it. Requires a fresh GO from Daniel before either.
 * ===================================================================================== */
console.log('[QUARANTINED] verdict NOT trustworthy - see file header. Retired 2026-07-28.');
/* BUG C GATE (#288) — the fresh-open design flip. Drives the REAL studio.html with a POPULATED D1 active
 * doc AND a populated session draft (both carry rooms), then opens three ways:
 *   G-SKETCH-FRESH    — ?id=1&hydrate=sketch  -> section 02 (Estate) EMPTY (state.accounts=0); the sketch
 *                       carries INPUTS only. RED today (finishLoad back-fill + restoreDraft leak the rooms).
 *   G-FRESH-EMPTY     — ?fresh=1              -> fresh seed, state.accounts=0. RED today (resumes the draft).
 *   G-BLUEPRINT-RESUME- ?id=<uuid>&hydrate=blueprint -> still opens THAT card's rooms (no regression).
 * Run: node scripts/_gate_d1_fresh_open.js [LABEL] */
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
const PORT = 8197; const base = 'http://127.0.0.1:' + PORT;

function rooms(n, tag) {
  const a = []; for (let r = 0; r < n; r++) a.push({ id: tag + r, baseId: 'taxable_primary', name: tag + ' ' + r, value: 100000 + r, inflow: 0, freq: 12, holdings: [] });
  return a;
}
const ACTIVE_DOC = { payload: JSON.stringify({ schema: 'DatumFIBlueprintV1', version: '1.0.1', profile: { primary_name: 'Active' }, accounts: rooms(7, 'act'), datum: { net_datum_v1: 120000 } }), revision: 3, updated_at: '2026-07-16T00:00:00Z' };
const DRAFT_BP = { schema: 'DatumFIBlueprintV1', version: '1.0.1', profile: { primary_name: 'Draft' }, accounts: rooms(6, 'draft'), datum: { net_datum_v1: 110000 } };
const SKETCH = { age: 45, retire_age: 65, s1_datum: 80000, s1_ceil: 90000, s1_floor: 70000 };   // NO accounts — a sketch has none
const BP_ID = 'c1a2b3d4-0000-4000-8000-000000000005';
const BP_DOC = { schema: 'DatumFIBlueprintV1', version: '1.0.1', blueprint_id: BP_ID, profile: { primary_name: 'Saved' }, accounts: rooms(9, 'bp'), datum: { net_datum_v1: 100000 } };

const SEED = (args) => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  try { sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(args.draft)); } catch (e) {}   // populated session draft (rooms)
  try { localStorage.setItem('datum_sketch_state_1', JSON.stringify(args.sketch)); } catch (e) {}
  try { localStorage.setItem('datum_blueprint_state_' + args.bpId, JSON.stringify(args.bpDoc)); } catch (e) {}
  window.Clerk = { load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
    user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'T', primaryEmailAddress: { emailAddress: 't@t.co' } } };
};

async function openWith(browser, query) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u);
      if (req.method() === 'GET' && q.searchParams.get('type') === 'studio') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTIVE_DOC) });
      if (req.method() === 'GET' && q.searchParams.get('list') === '1') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"documents":[]}' });
      if (req.method() === 'GET') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"revision":4}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(SEED, { draft: DRAFT_BP, sketch: SKETCH, bpId: BP_ID, bpDoc: BP_DOC });
  await page.goto(base + '/studio.html' + query, { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  const len = await page.evaluate(() => (window.state && Array.isArray(window.state.accounts)) ? window.state.accounts.length : -1);
  const search = await page.evaluate(() => window.location.search);
  await ctx.close();
  return { len, search, errs };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  const sketch = await openWith(browser, '?id=1&hydrate=sketch');
  ok(sketch.len === 0, 'G-SKETCH-FRESH: ?hydrate=sketch -> Estate section EMPTY, no room leak (state.accounts=' + sketch.len + ', want 0)');
  ok(sketch.search === '', 'G-SKETCH-ONESHOT: ?hydrate=sketch signal stripped from URL after consume (search="' + sketch.search + '") — F5 resumes, no re-nuke');
  if (sketch.errs.length) lines.push('  [sketch pageerrors] ' + sketch.errs.slice(0, 2).join(' | '));

  const fresh = await openWith(browser, '?fresh=1');
  ok(fresh.len === 0, 'G-FRESH-EMPTY: ?fresh=1 -> fresh seed, does NOT resume the draft/active rooms (state.accounts=' + fresh.len + ', want 0)');
  ok(fresh.search === '', 'G-FRESH-ONESHOT: ?fresh=1 signal stripped from URL after consume (search="' + fresh.search + '") — a plain reload will NOT re-fire fresh');
  if (fresh.errs.length) lines.push('  [fresh pageerrors] ' + fresh.errs.slice(0, 2).join(' | '));

  const resume = await openWith(browser, '?id=' + BP_ID + '&hydrate=blueprint');
  ok(resume.len === 9, 'G-BLUEPRINT-RESUME: selected-card open still shows THAT card rooms (state.accounts=' + resume.len + ', want 9) — no regression');
  ok(/id=/.test(resume.search), 'G-BLUEPRINT-URL-KEPT: blueprint-slot open URL is NOT stripped (search="' + resume.search + '") — only fresh/sketch are one-shot');
  if (resume.errs.length) lines.push('  [resume pageerrors] ' + resume.errs.slice(0, 2).join(' | '));

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('BUG C GATE (#288) — fresh-open design flip (?fresh=1 / ?hydrate=sketch)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] || 'RUN') + '] BUG C FRESH-OPEN — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
