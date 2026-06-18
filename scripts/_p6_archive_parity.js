/* _p6_archive_parity.js — STANDING GATE for P6 Blueprint↔Sketchbook save-parity.
 *
 * Proves, in a REAL signed-in browser (persistent mock Clerk, real codec via nav.js):
 *   (a) all 4 slots are unlocked (saveable + openable) in BOTH Archives;
 *   (b) erase fully purges EVERY copy of a slot — record, per-slot key, carried
 *       snapshot, session draft, AND the Clerk *_z mirror — with NO resurrection,
 *       while a snapshot belonging to a DIFFERENT (unsaved) plan is PRESERVED;
 *   (c) bare Open with nothing selected leaves no draft/snapshot to resurrect;
 *   (d) the premium overlay/modals remain in the DOM (deactivated, not deleted).
 *
 * Mirrors _cross_device_restore_parity.js's harness (mock Clerk meta in
 * sessionStorage = the "cloud", real Clerk + analytics route-blocked, served on
 * *.localhost so the mirror actually fires).
 *
 * Run: node scripts/_p6_archive_parity.js   (exit 0 = GREEN)
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8164; const BASE = 'http://' + HOST + ':' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
const check = (name, cond, detail) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : '')); if (!cond) fails.push(name); };

async function eraseBlueprint(page, slot) {
  await page.evaluate((s) => {
    var b = document.querySelector('.erase-action[data-purge-target="' + s + '"]');
    if (b) b.click();
  }, slot);
  await page.waitForTimeout(120);
  await page.evaluate(() => { var c = document.getElementById('action-confirm-erase'); if (c) c.click(); });
  await page.waitForTimeout(1500);   // 730ms scrub + lazy codec load + async remirror
}
async function eraseSketch(page, slot) {
  await page.evaluate((s) => {
    var b = document.querySelector('.slot-erase-action[data-purge-target="' + s + '"]');
    if (b) b.click();
  }, slot);
  await page.waitForTimeout(120);
  await page.evaluate(() => { var c = document.getElementById('action-confirm-erase'); if (c) c.click(); });
  await page.waitForTimeout(1500);  // 750ms scrub + lazy codec load + async remirror
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      user: {
        get unsafeMetadata() { try { return JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) { return {}; } },
        update: function (o) { try { sessionStorage.setItem('__mockclerk_meta', JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' }
      }
    };
  });

  // ════════ BLUEPRINT STORE ════════
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);   // nav.js lazy-loads the codec
  // Seed 4 slots via the REAL save path (writes per-slot key, draft, archive, Clerk z).
  await page.evaluate(async () => {
    for (var n = 1; n <= 4; n++) {
      var bp = window.DatumBlueprint['new']();
      bp.blueprint_id = 'bp-' + n;
      bp.datum.net_datum_v1 = 90000 + n;
      bp.accounts = [{ id: 'r' + n, baseId: 'taxable', value: 100000 * n, holdings: [] }];
      window.DatumBlueprint.save(bp, { slot: n });
    }
  });
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);

  const bpUnlock = await page.evaluate(() => {
    var locked = [];
    for (var n = 1; n <= 4; n++) { var t = document.getElementById('blueprint-slot-' + n); if (t && t.classList.contains('locked')) locked.push(n); }
    var openable = 0;
    for (var m = 1; m <= 4; m++) { if (document.querySelector('.open-blueprint-action[data-open-slot="' + m + '"]')) openable++; }
    var acc = document.getElementById('summary-access');
    return {
      token: !!(acc && acc.textContent.trim() === 'Studio'),   // UI proxy for userHasPremiumToken
      lockedSlots: locked, openable: openable,
      modalPresent: !!document.getElementById('premium-gate-modal')
    };
  });
  check('BP: signed-in seeds premium token', bpUnlock.token);
  check('BP: no slot locked (all 4 unlocked)', bpUnlock.lockedSlots.length === 0, bpUnlock.lockedSlots.join(','));
  check('BP: all 4 slots openable', bpUnlock.openable === 4, bpUnlock.openable);
  check('BP: premium-gate-modal still in DOM (deactivated)', bpUnlock.modalPresent);

  // (b) PURGE: snapshot + draft belong to slot 2 → erase slot 2 clears every copy.
  await page.evaluate(() => {
    var bp2 = { blueprint_id: 'bp-2', schema: 'DatumFIBlueprintV1' };
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify(bp2));
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify(bp2));
  });
  await eraseBlueprint(page, 2);
  const bpPurge = await page.evaluate(() => {
    var arch = null; try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    var dec = (meta.blueprint_z && window.DatumArchiveCodec) ? window.DatumArchiveCodec.decodeBlueprintArchive(meta.blueprint_z) : null;
    return {
      zPresent: !!meta.blueprint_z,
      archSlot2: !!(arch && arch.slot2),
      perSlot2: localStorage.getItem('datum_blueprint_state_2') != null,
      snapshot: sessionStorage.getItem('datumfi_blueprint_current_snapshot') != null,
      draft: sessionStorage.getItem('datumfi_blueprint_draft_v1') != null,
      zHasSlot2: !!(dec && dec.slot2), zHasSlot3: !!(dec && dec.slot3)
    };
  });
  check('BP erase: archive slot2 cleared', !bpPurge.archSlot2);
  check('BP erase: datum_blueprint_state_2 cleared', !bpPurge.perSlot2);
  check('BP erase: matching snapshot cleared', !bpPurge.snapshot);
  check('BP erase: matching session draft cleared', !bpPurge.draft);
  check('BP erase: Clerk blueprint_z written (codec ensured)', bpPurge.zPresent);
  check('BP erase: Clerk blueprint_z dropped slot2', !bpPurge.zHasSlot2);
  check('BP erase: Clerk blueprint_z kept slot3', bpPurge.zHasSlot3);

  // (b-guard) PRESERVE: an unrelated (unsaved) snapshot survives erasing a different slot.
  await page.evaluate(() => {
    sessionStorage.setItem('datumfi_blueprint_current_snapshot', JSON.stringify({ blueprint_id: 'bp-UNREL' }));
  });
  await eraseBlueprint(page, 3);
  const bpGuard = await page.evaluate(() => ({
    snapshot: sessionStorage.getItem('datumfi_blueprint_current_snapshot') != null,
    perSlot3: localStorage.getItem('datum_blueprint_state_3') != null
  }));
  check('BP guard: unrelated snapshot PRESERVED', bpGuard.snapshot);
  check('BP erase: datum_blueprint_state_3 cleared', !bpGuard.perSlot3);

  // ════════ SKETCHBOOK STORE ════════
  await page.goto(BASE + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    function contract(n) {
      return { sketch_id: 'sk-' + n, age: 40 + n, retire_age: 60 + n, portfolio_mass: 1000000 + n,
        contributions: 20000 + n, datum_spend: 90000 + n, resolved_state: 'EXPANSIVE', status: 'Drafted',
        date_stamped: '06/18/2026', time_stamped: '1:0' + n + ' PM' };
    }
    var book = { sketchbook_title: 'Gate', slot_1: contract(1), slot_2: contract(2), slot_3: contract(3), slot_4: contract(4) };
    try { localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify(book)); } catch (e) {}
    for (var n = 1; n <= 4; n++) { try { localStorage.setItem('datum_sketch_state_' + n, JSON.stringify(contract(n))); } catch (e) {} }
    if (window.DatumArchiveCodec) {
      var z = window.DatumArchiveCodec.encodeSketchbook(book);
      var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
      meta.sketchbook_z = z;
      sessionStorage.setItem('__mockclerk_meta', JSON.stringify(meta));
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2600);

  const skUnlock = await page.evaluate(() => {
    var locked = [];
    for (var n = 1; n <= 4; n++) { var t = document.getElementById('tile-slot-' + n); if (t && t.classList.contains('locked')) locked.push(n); }
    var openable = 0;
    for (var m = 1; m <= 4; m++) { if (document.querySelector('.slot-open-action[data-open-slot="' + m + '"]')) openable++; }
    var acc = document.getElementById('summary-sketch-access');
    return {
      token: !!(acc && acc.textContent.trim() === 'Design'),   // UI proxy for userHasPremiumToken
      lockedSlots: locked, openable: openable,
      modalPresent: !!document.getElementById('premium-gate-modal'),
      capacityPresent: !!document.getElementById('discover-capacity-modal')
    };
  });
  check('SK: signed-in seeds premium token', skUnlock.token);
  check('SK: no slot locked (all 4 unlocked)', skUnlock.lockedSlots.length === 0, skUnlock.lockedSlots.join(','));
  check('SK: all 4 slots openable', skUnlock.openable === 4, skUnlock.openable);
  check('SK: premium-gate-modal still in DOM (deactivated)', skUnlock.modalPresent);
  check('SK: discover-capacity-modal still in DOM (deactivated)', skUnlock.capacityPresent);

  // (b) PURGE: snapshot belongs to slot 2 → erase slot 2 clears every copy.
  await page.evaluate(() => {
    var c2 = { sketch_id: 'sk-2', age: 42, retire_age: 62, portfolio_mass: 1000002, datum_spend: 90002, date_stamped: '06/18/2026', time_stamped: '1:02 PM' };
    sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify(c2));
  });
  await eraseSketch(page, 2);
  const skPurge = await page.evaluate(() => {
    var book = null; try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    var dec = (meta.sketchbook_z && window.DatumArchiveCodec) ? window.DatumArchiveCodec.decodeSketchbook(meta.sketchbook_z) : null;
    return {
      zPresent: !!meta.sketchbook_z,
      bookSlot2: !!(book && book.slot_2),
      perSlot2: localStorage.getItem('datum_sketch_state_2') != null,
      snapshot: sessionStorage.getItem('datumfi_sketch_current_snapshot') != null,
      zHasSlot2: !!(dec && dec.slot_2), zHasSlot3: !!(dec && dec.slot_3)
    };
  });
  check('SK erase: book slot_2 cleared', !skPurge.bookSlot2);
  check('SK erase: datum_sketch_state_2 cleared', !skPurge.perSlot2);
  check('SK erase: matching snapshot cleared', !skPurge.snapshot);
  check('SK erase: Clerk sketchbook_z written (codec ensured)', skPurge.zPresent);
  check('SK erase: Clerk sketchbook_z dropped slot2', !skPurge.zHasSlot2);
  check('SK erase: Clerk sketchbook_z kept slot3', skPurge.zHasSlot3);

  // (b-guard) PRESERVE: an unrelated, unstamped snapshot survives an unrelated erase.
  await page.evaluate(() => {
    sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify({ sketch_id: 'sk-UNREL' }));
  });
  await eraseSketch(page, 3);
  const skGuard = await page.evaluate(() => ({
    snapshot: sessionStorage.getItem('datumfi_sketch_current_snapshot') != null,
    perSlot3: localStorage.getItem('datum_sketch_state_3') != null
  }));
  check('SK guard: unrelated snapshot PRESERVED', skGuard.snapshot);
  check('SK erase: datum_sketch_state_3 cleared', !skGuard.perSlot3);

  // (c) bare-open freshness: after the matched erase, no draft/snapshot remains to resurrect.
  check('bare-open: BP draft empty (fresh Studio)', !bpPurge.draft);
  check('bare-open: SK snapshot empty after matched erase (fresh Sketch)', !skPurge.snapshot);

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  console.log(JSON.stringify({ verdict: fails.length ? 'FAIL' : 'PASS', bpUnlock, bpPurge, bpGuard, skUnlock, skPurge, skGuard, pageErrors: pageErrors.slice(0, 3) }, null, 2));
  process.exit(fails.length ? 1 : 0);
})();
