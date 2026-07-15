'use strict';
// P5 Step-1 LIVE GATE — "save actually works" across both stores (Issues 1/3/4).
// Asserts REAL browser behavior (no source greps):
//  A1 STUDIO  — signed-out Save stashes a full bp snapshot + pending-intent BEFORE the
//               vault hop, and the hop carries returnTo=/Blueprint.html.
//  A2 SKETCH  — signed-out Save stashes a serializeSketchState snapshot + pending-intent
//               BEFORE the vault hop, and the hop carries returnTo=/sketchbook.html.
//  B  SKETCHBOOK — the ROOT-CAUSE fix: an unauthenticated visitor's redirectToVault carries
//               returnTo=/sketchbook.html (was bare /vault.html -> dropped user on home).
//  C  BLUEPRINT — landing reconstructs bp from the snapshot and DatumBlueprint.save()s it to
//               the first EMPTY slot (DOM-free), consuming the intent + snapshot ONCE (E).
//  D  BLUEPRINT — all writable slots full -> "All slots taken, please delete one first." (no write).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8181;
const base = 'http://127.0.0.1:' + PORT;
const out = { findings: [], pageErrors: [] };
const F = (cond, msg) => { if (!cond) out.findings.push(msg); };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  // ONE route handler: serve the signed-out vault hop as a LOCAL stub (so origin-scoped
  // sessionStorage survives and we can read the carried snapshot + the returnTo it got),
  // pass through 127.0.0.1, abort everything external (keeps the Clerk stub authoritative).
  const d1Puts = [];   // captured /api/documents PUTs — proves the landing carry DUAL-WRITES to D1
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = req.url();
    if (u.indexOf('/api/documents') >= 0) {
      if (req.method() === 'PUT') {
        try { const b = JSON.parse(req.postData() || '{}'); const q = new URL(u).searchParams; d1Puts.push({ type: q.get('type'), key: q.get('key'), payload: b.payload }); } catch (e) {}
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ revision: 1 }) });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });   // GET miss -> caller falls back to LS
    }
    if (/\/vault\.html/.test(u)) { return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>vault-stub</body></html>' }); }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  // signed-IN Clerk stub (Sweety) — persists across navigations via addInitScript.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); }, session: { getToken: function () { return Promise.resolve('tok:sweety'); } }, user: { id: 'sweety', unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' } } };
  });

  // ── A1 — Studio stashes a snapshot before the signed-out hop ──────────────────────
  await page.goto(base + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    function setSlider(id, v) { var el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); } }
    setSlider('slider-age', 50); setSlider('slider-activation', 66);
    if (window.state) { window.state.accounts = [{ id: 'p5a', baseId: 'rothira', value: 90000, inflow: 0, freq: 12, name: 'Roth IRA', holdings: [] }]; }
    if (typeof renderInputs === 'function') renderInputs();
    try { sessionStorage.removeItem('datum_auth_hint'); } catch (e) {}  // force the signed-OUT branch
  });
  await Promise.all([ page.waitForURL('**/vault.html**', { timeout: 8000 }).catch(() => {}), page.evaluate(() => window.studioSaveCurrent()) ]);
  await page.waitForTimeout(200);
  out.studioStash = await page.evaluate(() => {
    var s = null; try { s = JSON.parse(sessionStorage.getItem('datumfi_blueprint_current_snapshot')); } catch (e) {}
    return { url: location.pathname + location.search, pending: sessionStorage.getItem('datumfi_pending_save'), schema: s && s.schema, accounts: s && s.accounts ? s.accounts.length : null };
  });

  // ── B/C — Blueprint lands; P6.1 AUTO-CONSUME (reverses P5 Option-B) saves the carried
  //    snapshot to the first EMPTY slot on landing — no explicit button — and consumes once.
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  out.bpAfterSave = await page.evaluate(() => {
    var slot = null, arch = null;
    try { slot = JSON.parse(localStorage.getItem('datum_blueprint_state_1')); } catch (e) {}
    try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1')); } catch (e) {}
    return {
      perSlot1: !!slot, schema: slot && slot.schema, accounts: slot && slot.accounts ? slot.accounts.length : null,
      archSlot1: !!(arch && arch.slot1),
      pendingCleared: !sessionStorage.getItem('datumfi_pending_save'),
      snapCleared: !sessionStorage.getItem('datumfi_blueprint_current_snapshot'),
      toast: (document.getElementById('toast') || {}).textContent || ''
    };
  });

  // ── D — SAVE-AS-NEW (ratified Rolling-4, #278 (b)): a landing carry with a FULL archive must NOT
  //    clobber slot 1. Seed 4 DISTINCT saved blueprints (slot 1 = NEWEST, slot 4 = OLDEST by saved_at)
  //    + a carried snapshot whose id is seed-1 (to prove save-as-new IGNORES it and mints fresh).
  //    Reload -> auto-consume. Under save-as-new the carry mints a NEW blueprint and Rolling-4 evicts
  //    the OLDEST (slot 4), so slot 1's blueprint (net_datum 111) SURVIVES. Under the old {slot:1} it
  //    reused seed-1's id and clobbered slot 1 -> RED. D1 dual-write must fire for the new row.
  await page.evaluate(() => {
    function seed(n, when) { return { schema: 'DatumFIBlueprintV1', accounts: [], datum: { net_datum_v1: n * 111 }, profile: {}, blueprint_id: 'seed-' + n, saved_at: when }; }
    var arch = { slot1: seed(1, '2026-07-15T12:00:00Z'), slot2: seed(2, '2026-07-15T10:00:00Z'), slot3: seed(3, '2026-07-15T08:00:00Z'), slot4: seed(4, '2026-07-15T06:00:00Z'), activeBlueprintSlot: 1, userHasPremiumToken: true };
    try { localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify(arch)); } catch (e) {}
    for (var n = 1; n <= 4; n++) { try { localStorage.setItem('datum_blueprint_state_' + n, JSON.stringify(arch['slot' + n])); } catch (e) {} }
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify({ schema: 'DatumFIBlueprintV1', accounts: [], datum: { net_datum_v1: 999 }, profile: {}, blueprint_id: 'seed-1' }));
    sessionStorage.setItem('datumfi_pending_save', 'blueprint');
  });
  d1Puts.length = 0;
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.evaluate(() => { if (window.DatumD1) window.DatumD1.WRITE_DEBOUNCE_MS = 40; });   // snappy debounced D1 write
  await page.waitForTimeout(2000);
  out.bpSaveAsNew = await page.evaluate(() => {
    var arch = null; try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    var slots = [];
    for (var n = 1; n <= 4; n++) { var s = arch && arch['slot' + n]; slots.push(s ? { id: s.blueprint_id, datum: s.datum && s.datum.net_datum_v1 } : null); }
    var carried = slots.find(function (s) { return s && s.datum === 999; }) || null;
    return {
      slots: slots,
      carriedSomewhere: !!carried,
      carriedId: carried && carried.id,
      seed1Alive: slots.some(function (s) { return s && s.datum === 111; }),   // slot-1 seed (net_datum 111) survived?
      snapCleared: !sessionStorage.getItem('datumfi_blueprint_current_snapshot'),
      pendingCleared: !sessionStorage.getItem('datumfi_pending_save')
    };
  });
  out.bpSaveAsNewD1 = { blueprintPut: d1Puts.some(function (p) { return p.type === 'blueprint'; }),
    newRowKey: (d1Puts.find(function (p) { return p.type === 'blueprint'; }) || {}).key };

  // ── A2 — Sketch stashes a snapshot before the signed-out hop ──────────────────────
  await page.goto(base + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { sessionStorage.removeItem('datum_auth_hint'); sessionStorage.removeItem('datumfi_pending_save'); sessionStorage.removeItem('datumfi_sketch_current_snapshot'); } catch (e) {} });
  await Promise.all([ page.waitForURL('**/vault.html**', { timeout: 8000 }).catch(() => {}), page.evaluate(() => window.sketchSaveCurrent()) ]);
  await page.waitForTimeout(200);
  out.sketchStash = await page.evaluate(() => {
    var s = null; try { s = JSON.parse(sessionStorage.getItem('datumfi_sketch_current_snapshot')); } catch (e) {}
    return { url: location.pathname + location.search, pending: sessionStorage.getItem('datumfi_pending_save'), hasSnap: !!s, hasAge: !!(s && s.age) };
  });

  // ── B2 — sketchbook.redirectToVault carries returnTo (root-cause fix), signed-OUT ──
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page2.addInitScript(() => { window.Clerk = { load: function () { return Promise.resolve(); }, user: null }; });
  let vaultUrl = '';
  page2.on('framenavigated', (f) => { const u = f.url(); if (/\/vault\.html/.test(u)) vaultUrl = u; });
  await page2.goto(base + '/sketchbook.html', { waitUntil: 'load' }).catch(() => {});
  await page2.waitForTimeout(900);
  out.sketchbookRedirect = vaultUrl || await page2.evaluate(() => location.href).catch(() => '');

  await ctx.close();

  // ── verdict ──
  const a = out.studioStash, c = out.bpAfterSave, sk = out.sketchStash;
  // A1
  F(a.pending === 'blueprint', 'A1: studio did not set pending_save=blueprint (' + a.pending + ')');
  F(a.schema === 'DatumFIBlueprintV1', 'A1: studio snapshot is not a hub bp (schema=' + a.schema + ')');
  F(a.accounts === 1, 'A1: studio snapshot did not capture rooms (accounts=' + a.accounts + ')');
  F(/returnTo=%2FBlueprint\.html/.test(a.url), 'A1: studio hop missing returnTo=/Blueprint.html (' + a.url + ')');
  // C / E
  F(c.perSlot1, 'C: Blueprint landing did NOT write datum_blueprint_state_1 (still bounced to Studio?)');
  F(c.schema === 'DatumFIBlueprintV1', 'C: saved slot1 is not the carried bp (schema=' + c.schema + ')');
  F(c.accounts === 1, 'C: saved slot1 lost the rooms (accounts=' + c.accounts + ')');
  F(c.archSlot1, 'C: archive slot1 not written');
  F(/Blueprint saved\./.test(c.toast), 'C: success toast wrong (' + c.toast + ')');
  F(c.pendingCleared, 'E: pending_save not cleared after save (double-save risk)');
  F(c.snapCleared, 'E: snapshot not cleared after save (double-save risk)');
  // D — SAVE-AS-NEW / NO-CLOBBER / D1 DUAL-WRITE (#278 (b))
  const sn = out.bpSaveAsNew, snd = out.bpSaveAsNewD1;
  F(sn.carriedSomewhere, 'D: landing carry (net_datum 999) was NOT saved (' + JSON.stringify(sn.slots) + ')');
  F(sn.carriedId && sn.carriedId !== 'seed-1', 'D: carry did NOT mint a NEW blueprint_id (got ' + sn.carriedId + ' = reused a slot id = clobber)');
  F(sn.seed1Alive, 'D: slot-1 blueprint (net_datum 111) was CLOBBERED (must survive; Rolling-4 evicts the OLDEST, slot 4)');
  F(sn.snapCleared && sn.pendingCleared, 'D: pending/snapshot not cleared after save-as-new');
  F(snd.blueprintPut, 'D: D1 dual-write did NOT fire for the landing carry (no PUT type=blueprint)');
  F(snd.newRowKey && snd.newRowKey !== 'seed-1', 'D: D1 PUT reused a seed key instead of a NEW row (' + snd.newRowKey + ')');
  // A2
  F(sk.pending === 'sketch', 'A2: sketch did not set pending_save=sketch (' + sk.pending + ')');
  F(sk.hasSnap, 'A2: sketch did not stash a snapshot before the hop');
  F(sk.hasAge, 'A2: sketch snapshot missing serialized state (age)');
  F(/returnTo=%2Fsketchbook\.html/.test(sk.url), 'A2: sketch hop missing returnTo=/sketchbook.html (' + sk.url + ')');
  // B2 (root-cause)
  F(/returnTo=%2Fsketchbook\.html/.test(out.sketchbookRedirect), 'B2: sketchbook.redirectToVault dropped returnTo (' + out.sketchbookRedirect + ')');

  out.verdict = (out.findings.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('P5 GATE ERROR', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
