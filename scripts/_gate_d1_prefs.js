'use strict';
/* D1 PHASE-5c BEHAVIOR GATE (red-first) — Preferences (dossier + workspaceName) -> D1 (ADDITIVE).
 * The prefs saves are INLINE in Dossier.html (hybridSave) + my-account.html (workspaceName blur), so
 * this drives BOTH real pages headlessly: serves the repo, mocks a signed-in Clerk user, stubs
 * /api/documents (capturing PUTs), and asserts each preference key dual-writes its OWN D1 row
 * (type=preferences, key=dossier|workspaceName) ALONGSIDE the Clerk unsafeMetadata mirror (net stays
 * on, nothing retired) — ONE ROW PER KEY (#279). Run: node scripts/_gate_d1_prefs.js [LABEL] [--redfirst] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const pick = (w, l) => (RF ? l : w);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8197; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));

  const puts = [];   // captured /api/documents PUTs: { type, key, payload }
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u).searchParams;
      if (req.method() === 'PUT') {
        try { const b = JSON.parse(req.postData() || '{}'); puts.push({ type: q.get('type'), key: q.get('key'), payload: b.payload }); } catch (e) {}
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ revision: 1 }) });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });   // GET miss -> caller falls back to LS/Clerk
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const clerkUpdates = [];
  await page.exposeFunction('__recordClerkUpdate', (o) => { clerkUpdates.push(o); });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:prefsuser'); } },
      user: { id: 'prefsuser', unsafeMetadata: {},
        update: function (o) { try { window.__recordClerkUpdate(o); } catch (e) {} this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); },
        firstName: 'Prefs', primaryEmailAddress: { emailAddress: 'p@p.co' } }
    };
  });

  // ═══════ 1) DOSSIER SAVE (Dossier.html hybridSave -> both keys) ═══════
  await page.goto(base + '/Dossier.html', { waitUntil: 'load' });
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    try { localStorage.setItem('datum_workspace_name', 'Gate Workspace'); } catch (e) {}
    if (window.DatumD1) window.DatumD1.WRITE_DEBOUNCE_MS = 40;
    var nm = document.getElementById('primaryName'); if (nm) { nm.value = 'Prefs Gate Name'; nm.dispatchEvent(new Event('input', { bubbles: true })); }
    var dob = document.getElementById('dob'); if (dob) { dob.value = '1990-03'; dob.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  clerkUpdates.length = 0; puts.length = 0;
  await page.evaluate(() => { var b = document.getElementById('saveProfile'); if (b) b.click(); });   // -> hybridSave
  await page.waitForTimeout(700);

  const dossierPut = puts.find((p) => p.type === 'preferences' && p.key === 'dossier');
  const wsPut = puts.find((p) => p.type === 'preferences' && p.key === 'workspaceName');
  const lsDossier = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datumfi.accountDossier.v15') || 'null'); } catch (e) { return null; } });
  const clerkDossierMirrored = clerkUpdates.some((o) => o && o.unsafeMetadata && o.unsafeMetadata.dossier);

  ok(pick(!!dossierPut, !dossierPut), 'DOSSIER: hybridSave dual-writes a D1 row (PUT type=preferences key=dossier) [BITE]');
  ok(pick(!!dossierPut && dossierPut.payload && dossierPut.payload.schema === 'DatumFIAccountDossierV15' && dossierPut.payload.primary && dossierPut.payload.primary.name === 'Prefs Gate Name',
          !(dossierPut && dossierPut.payload)),
     'FIDELITY: the V15 dossier (schema + primary.name) rides to D1 intact [BITE]');
  ok(pick(!!wsPut, !wsPut), 'WORKSPACE: hybridSave dual-writes a D1 row (PUT type=preferences key=workspaceName) [BITE]');
  ok(pick(!!wsPut && wsPut.payload && wsPut.payload.workspaceName === 'Gate Workspace', !(wsPut && wsPut.payload)),
     'WORKSPACE: the workspaceName value rides to D1 intact [BITE]');
  // DELIBERATELY INVERTED BY THE MISS-5 PREFS RETIRE. This gate was written for Phase-5c, when the D1
  // preferences write was ADDITIVE and the Clerk mirror was the unconditional net — so it asserted the
  // mirror STILL fires. The Captain's cross-device smoke passed and prefs was retired: D1 is now the store,
  // and the mirror fires ONLY where the D1 write cannot (rolled back / signed out / no client). Under this
  // harness (cutover ON, signed in) the correct answer is therefore the OPPOSITE. Inverted rather than
  // deleted so the reversal stays on the record; the complement property itself is proved exhaustively in
  // _gate_miss5_prefs_retire.mjs, which enumerates all eight states for "exactly one store, never none".
  ok(pick(!clerkDossierMirrored, clerkDossierMirrored), 'MISS-5 RETIRED: under cutover the Clerk dossier mirror does NOT fire (D1 is the store) [BITE]');
  ok(pick(!!lsDossier && !!dossierPut && lsDossier.primary && dossierPut.payload.primary && lsDossier.primary.name === dossierPut.payload.primary.name && lsDossier.schema === dossierPut.payload.schema,
          !(lsDossier && dossierPut)),
     'PARITY: the LS dossier and the D1 dossier row agree (schema + primary.name) [BITE]');

  // ═══════ 2) MY-ACCOUNT WORKSPACE SAVE (blur -> workspaceName-only row) ═══════
  await page.goto(base + '/my-account.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.DatumD1) window.DatumD1.WRITE_DEBOUNCE_MS = 40; });
  puts.length = 0;
  await page.evaluate(() => {
    var el = document.getElementById('workspaceName');
    if (el) { el.textContent = 'Solo Workspace'; el.dispatchEvent(new Event('blur', { bubbles: true })); }
  });
  await page.waitForTimeout(700);
  const wsOnly = puts.find((p) => p.type === 'preferences' && p.key === 'workspaceName');
  const noDossierHere = !puts.some((p) => p.type === 'preferences' && p.key === 'dossier');
  ok(pick(!!wsOnly && wsOnly.payload && wsOnly.payload.workspaceName === 'Solo Workspace', !(wsOnly && wsOnly.payload)),
     'MY-ACCOUNT: workspaceName blur dual-writes the workspaceName D1 row [BITE]');
  ok(pick(noDossierHere, !noDossierHere), 'MY-ACCOUNT: workspaceName-only save does NOT touch the dossier row (one row per key) [BITE]');

  // ═══════ WIRING markers (served bytes) ═══════
  const d1c = fs.readFileSync(path.join(ROOT, 'scripts', 'datum-d1.js'), 'utf8');
  const dos = fs.readFileSync(path.join(ROOT, 'Dossier.html'), 'utf8');
  const acct = fs.readFileSync(path.join(ROOT, 'my-account.html'), 'utf8');
  // The literal moved: writePreferences now dispatches through `send`, which is writeNow for a DELIBERATE
  // save (opts.now) and scheduleWrite otherwise. Assert the ROW SHAPE (type=preferences, one row per key)
  // rather than the transport, which is what this check was ever about.
  ok(d1c.includes('function writePreferences') && d1c.includes("send('preferences', 'dossier'") && d1c.includes("send('preferences', 'workspaceName'"),
     'datum-d1: writePreferences() writes type=preferences per key');
  ok(d1c.includes('CUTOVER === false') && d1c.includes('!signedIn()'), 'datum-d1: writePreferences guarded (escape route)');
  ok(dos.includes('/scripts/datum-d1.js') && dos.includes('writePreferences'), 'Dossier.html includes datum-d1.js + calls writePreferences (both keys)');
  ok(acct.includes('/scripts/datum-d1.js') && acct.includes('writePreferences'), 'my-account.html includes datum-d1.js + calls writePreferences (workspaceName)');

  ok(pageErrors.length === 0, 'no page errors (' + (pageErrors[0] || '') + ')');

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-5c preferences dual-write gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] G-PREFS-D1 — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
