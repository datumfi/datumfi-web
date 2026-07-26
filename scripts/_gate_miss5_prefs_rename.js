'use strict';
/* SMOKE-FAIL GATE (red-first) — MISS-5 prefs retire: the workspace rename must PERSIST and must PAINT.
 *
 * THE CAPTAIN'S REPRO (07/26, live on datumfi.com, SAME device): Account -> Workspace, rename
 * "Sweety" -> "Sweety & Peachy". There is no manual save; he navigated away and back and the name had
 * reverted to "Sweety". The profile card above the plan/region block also kept saying "Sweety" the whole
 * time, never updating on rename.
 *
 * WHY THE EXISTING GATE MISSED IT. _gate_miss5_prefs_retire.mjs enumerated all eight states of the
 * predicate complement and was 20/20 green — it proved WHICH STORE gets written, and nothing at all about
 * whether the write LANDS or whether the read gives it back. A stub-level truth hid a page-level failure.
 * This gate therefore drives the REAL my-account.html in a browser and asserts observable behaviour.
 *
 * ROOT CAUSE (two faults, both exposed by retiring the mirror in 48b5ab0):
 *   1. THE WRITE WAS ABANDONED. writePreferences used the ~1.5s debounced scheduleWrite. Before the retire
 *      the Clerk mirror wrote IMMEDIATELY on blur, so the name persisted regardless; after it, D1 is the
 *      sole writer and navigating inside the debounce window simply loses the rename.
 *   2. THE FROZEN MIRROR CLOBBERED A NEWER LOCAL NAME. _resolveWorkspaceName returns `wn || _clerk`, and
 *      the caller unconditionally wrote that back into localStorage AND the DOM. Once the mirror stopped
 *      being written it froze at the old name — so any moment the D1 row was missing, the stale "Sweety"
 *      overwrote the newer local "Sweety & Peachy". That is the revert, and it is sticky.
 *   3. (pre-existing) blur repainted only the heading being edited, never #acct-profile-name.
 *
 * MUTATIONS:
 *   --redfirst  restores the unconditional adopt (frozen mirror wins) -> the rename REVERTS, exactly as
 *               the Captain saw.
 *   --debounce  restores the debounced write -> the rename is not persisted by the time a fast navigation
 *               would take it away.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const DB = process.argv.includes('--debounce');
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const ADOPT = "if (source !== 'd1' && localName) return;";
const NOW = "window.DatumD1.writePreferences({ workspaceName: n }, { now: true });";

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/my-account.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/my-account.html') {
    let s = body.toString('utf8');
    if (RF) {
      if (!s.includes(ADOPT)) throw new Error('red-first anchor missing (adopt guard)');
      s = s.replace(ADOPT, '');                                   // frozen mirror overwrites local again
    }
    if (DB) {
      if (!s.includes(NOW)) throw new Error('red-first anchor missing (now:true)');
      s = s.replace(NOW, 'window.DatumD1.writePreferences({ workspaceName: n });');   // back to debounced
    }
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8203; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));

  // A D1 that only knows what has actually been PUT to it — so "did the write land?" is a real question.
  const d1 = { rows: {} };
  const puts = [];
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      const q = new URL(u).searchParams;
      const id = q.get('type') + '/' + q.get('key');
      if (req.method() === 'PUT') {
        let payload = null;
        try { payload = JSON.parse(req.postData() || '{}').payload; } catch (e) {}
        d1.rows[id] = payload; puts.push({ id, payload });
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ revision: 1 }) });
      }
      if (d1.rows[id]) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ payload: JSON.stringify(d1.rows[id]), revision: 1 }) });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });

  // Clerk carries the FROZEN mirror value — the pre-retire name. This is the trap.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:renameuser'); } },
      user: { id: 'renameuser', unsafeMetadata: { workspaceName: 'Sweety' },
        update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); },
        firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' } }
    };
    // Seed ONLY when absent. addInitScript runs on EVERY navigation, so an unconditional set would rewrite
    // localStorage back to the pre-rename name on every page load — the harness would then be testing
    // itself, and section 3 would report a revert the app never caused.
    try { if (!localStorage.getItem('datum_workspace_name')) localStorage.setItem('datum_workspace_name', 'Sweety'); } catch (e) {}
  });

  // ═══ 1 · RENAME, then NAVIGATE AWAY IMMEDIATELY (no lingering — the Captain did not wait) ═══
  await page.goto(base + '/my-account.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const el = document.getElementById('workspaceName');
    el.focus();
    el.textContent = 'Sweety & Peachy';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.blur();
  });
  await page.waitForTimeout(250);   // deliberately SHORTER than the 1.5s debounce

  const wsPut = puts.find((p) => p.id === 'preferences/workspaceName');
  ok(!!wsPut, 'the rename is written to D1 IMMEDIATELY, inside the old debounce window [BITE debounce]');
  ok(!!wsPut && wsPut.payload && wsPut.payload.workspaceName === 'Sweety & Peachy',
    'the D1 row carries the NEW name [BITE debounce]');

  const painted = await page.evaluate(() => ({
    heading: (document.getElementById('workspaceName') || {}).textContent,
    profile: (document.getElementById('acct-profile-name') || {}).textContent
  }));
  ok(painted.profile === 'Sweety & Peachy',
    'the PROFILE CARD repaints on rename — not just the heading being edited (Captain report)');

  // ═══ 2 · NAVIGATE AWAY AND BACK — the name must survive ═══
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.goto(base + '/my-account.html', { waitUntil: 'load' });
  await page.waitForTimeout(1600);

  const after = await page.evaluate(() => ({
    ls: localStorage.getItem('datum_workspace_name'),
    heading: (document.getElementById('workspaceName') || {}).textContent,
    profile: (document.getElementById('acct-profile-name') || {}).textContent
  }));
  ok(after.ls === 'Sweety & Peachy', 'after navigating away and back, localStorage still holds the NEW name [BITE redfirst]');
  ok(after.heading === 'Sweety & Peachy', 'the heading shows the NEW name — it did NOT revert [BITE redfirst]');
  ok(after.profile === 'Sweety & Peachy', 'the profile card shows the NEW name [BITE redfirst]');

  // ═══ 3 · THE FROZEN MIRROR MUST NOT CLOBBER — D1 row absent, Clerk still says "Sweety" ═══
  d1.rows = {};                                   // simulate: the D1 row is unreadable / not yet there
  await page.goto(base + '/my-account.html', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const frozen = await page.evaluate(() => ({
    ls: localStorage.getItem('datum_workspace_name'),
    heading: (document.getElementById('workspaceName') || {}).textContent
  }));
  ok(frozen.ls === 'Sweety & Peachy',
    'D1 row MISSING + frozen Clerk mirror -> the newer local name is NOT overwritten [BITE redfirst]');
  ok(frozen.heading === 'Sweety & Peachy',
    'and the DOM is not reverted to the frozen mirror value [BITE redfirst]');

  // ═══ 4 · COLD START — a device with NO local name still gets seeded by the frozen mirror ═══
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await ctx2.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await p2.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('t'); } },
      user: { id: 'renameuser', unsafeMetadata: { workspaceName: 'Sweety' },
        update: function (o) { this.unsafeMetadata = (o && o.unsafeMetadata) || this.unsafeMetadata; return Promise.resolve(); },
        firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' } } };
  });
  await p2.goto(base + '/my-account.html', { waitUntil: 'load' });
  await p2.waitForTimeout(1600);
  const cold = await p2.evaluate(() => localStorage.getItem('datum_workspace_name'));
  ok(cold === 'Sweety', 'COLD START (no local name) is still seeded from the frozen mirror — the net works');
  await ctx2.close();

  ok(pageErrors.length === 0, 'no page errors: ' + JSON.stringify(pageErrors.slice(0, 2)));

  await browser.close(); server.close();

  const mode = RF ? 'RED-FIRST (frozen mirror adopts unconditionally — MUST be RED)'
             : DB ? 'RED-FIRST (debounced write restored — MUST be RED)'
             : 'NORMAL';
  console.log(lines.join('\n'));
  console.log('-------------------------------------');
  console.log('MODE: ' + mode + '   |   MISS-5 prefs rename persistence');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  if (!RF && !DB && fail > 0) process.exit(1);
  if ((RF || DB) && fail === 0) { console.log('!! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
})().catch((e) => { console.error(e); process.exit(1); });
