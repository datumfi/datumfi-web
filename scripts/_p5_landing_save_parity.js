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
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (/\/vault\.html/.test(u)) { return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>vault-stub</body></html>' }); }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });

  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  // signed-IN Clerk stub (Sweety) — persists across navigations via addInitScript.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = { load: function () { return Promise.resolve(); }, user: { unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Sweety', primaryEmailAddress: { emailAddress: 's@s.co' } } };
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

  // ── D — all writable slots full -> auto-consume on the next landing shows the all-full
  //    guard, writes nothing, and PRESERVES the snapshot (no silent drop). Seed a full LS
  //    archive + a fresh pending snapshot, then reload to re-fire onSessionConfirmed.
  await page.evaluate(() => {
    var full = { schema: 'DatumFIBlueprintV1', accounts: [], datum: { net_datum_v1: 1 }, profile: {}, blueprint_id: 'full' };
    var arch = { slot1: full, slot2: full, slot3: full, slot4: full, activeBlueprintSlot: 1, userHasPremiumToken: true };
    try { localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify(arch)); } catch (e) {}
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify({ schema: 'DatumFIBlueprintV1', accounts: [], datum: { net_datum_v1: 1 }, profile: {}, blueprint_id: 'carry' }));
    sessionStorage.setItem('datumfi_pending_save', 'blueprint');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1800);
  out.bpAllFull = await page.evaluate(() => ({ toast: (document.getElementById('toast') || {}).textContent || '', snapStillThere: !!sessionStorage.getItem('datumfi_blueprint_current_snapshot') }));

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
  const a = out.studioStash, c = out.bpAfterSave, d = out.bpAllFull, sk = out.sketchStash;
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
  F(/Saved to Blueprint A-01/.test(c.toast), 'C: success toast wrong (' + c.toast + ')');
  F(c.pendingCleared, 'E: pending_save not cleared after save (double-save risk)');
  F(c.snapCleared, 'E: snapshot not cleared after save (double-save risk)');
  // D
  F(/All slots taken, please delete one first\./.test(d.toast), 'D: all-full message missing (' + d.toast + ')');
  F(d.snapStillThere, 'D: snapshot was consumed on the all-full case (should be preserved)');
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
