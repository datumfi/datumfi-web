/* _cross_device_restore_parity.js — STANDING GATE (b) for P3 cross-device truth.
 *
 * The whole point of the codec-as-Clerk-truth work: a plan saved on DEVICE A must
 * rebuild on DEVICE B from the compressed Clerk blob alone, with rooms intact.
 *
 * This runs in a REAL browser (not node):
 *   - The real Clerk SDK is route-BLOCKED so a persistent mock survives. The mock's
 *     unsafeMetadata is backed by sessionStorage (= the "cloud") so it persists across
 *     the localStorage clear + reload that simulates a second device.
 *   - Served on datumfi.localhost (-> 127.0.0.1): a *.localhost host is a trustworthy
 *     secure context (so upgrade-insecure-requests does NOT force https + break script
 *     loads), yet its hostname is NOT in sketch.html's localhost mirror-skip list, so
 *     the sketch Clerk mirror actually fires.
 *   - DEVICE A: save 4 Blueprint slots (distinct room counts) + 1 Sketch slot.
 *   - DEVICE B: clear localStorage, reload, let nav.js restore rebuild LS from Clerk,
 *     then assert every slot + room count came back and the legacy keys are gone.
 *
 * Run: node scripts/_cross_device_restore_parity.js   (exit 0 = GREEN)
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8163; const BASE = 'http://' + HOST + ':' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const ROOMS = { 1: 3, 2: 4, 3: 5, 4: 6 };   // distinct room counts per Blueprint slot
const fails = [];
const check = (name, cond, detail) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : '')); if (!cond) fails.push(name); };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // Block the real Clerk SDK + analytics so the persistent mock is not overwritten.
  await page.route('**/*', (route) => /clerk|cloudflareinsights|posthog|beacon/i.test(route.request().url()) ? route.abort() : route.continue());
  // Persistent mock Clerk: unsafeMetadata lives in sessionStorage (the "cloud"), so it
  // survives the localStorage clear + reload that models device B.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      user: {
        get unsafeMetadata() { try { return JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) { return {}; } },
        update: function (o) { try { sessionStorage.setItem('__mockclerk_meta', JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' }
      }
    };
  });

  // ── DEVICE A: 4 Blueprint slots (distinct room counts) ───────────────────────
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  for (let n = 1; n <= 4; n++) {
    await page.evaluate((args) => {
      const [slot, count] = args;
      function setSlider(id, v) { var el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); } }
      setSlider('slider-age', 50 + slot); setSlider('slider-activation', 66 + slot); setSlider('sl-plan-through', 86 + slot);
      var s = document.getElementById('spend-input'); if (s) s.value = '$' + (80000 + slot * 1000);
      var bases = ['pretax401k', 'rothira', 'taxable', 'property', 'pretax457b', 'tradira', 'roth401k', 'savings_primary'];
      if (window.state) { window.state.accounts = []; for (var i = 0; i < count; i++) window.state.accounts.push({ id: 's' + slot + 'r' + i, baseId: bases[i % bases.length], value: 100000 + i * 7331 + slot * 1000, inflow: 0, freq: 12, name: 'Slot ' + slot + ' Room ' + i, holdings: [] }); }
      if (typeof renderInputs === 'function') renderInputs();
      if (typeof updateSVGs === 'function') updateSVGs();
      try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    }, [n, ROOMS[n]]);
    await page.waitForTimeout(250);
    await page.evaluate(() => window.studioSaveCurrent());
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      // L2 slice-2 picker: the fixed A-0n slot buttons are gone. "＋ Save as a new blueprint" mints a
      // fresh row and the rolling-4 LS net fills empty slots in order (save 1->slot1 ... save 4->slot4),
      // so ROOMS[n] still lands in slot n — the cross-device restore assertions are unchanged.
      var pop = document.getElementById('studio-save-bp-pop'); if (!pop) return;
      var b = Array.prototype.slice.call(pop.querySelectorAll('button')).find((x) => /Save as a new blueprint/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(450);
  }
  const deviceA = await page.evaluate(() => {
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    return { keys: Object.keys(meta), hasBpZ: !!meta.blueprint_z, legacyBp: ('blueprint' in meta) };
  });

  // ── DEVICE A: 1 Sketch slot (sketchbook_z) ───────────────────────────────────
  await page.goto(BASE + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  for (let i = 0; i < 20; i++) { const ok = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); }); if (ok) break; await page.waitForTimeout(400); }
  await page.waitForTimeout(800);
  await Promise.all([
    page.waitForNavigation({ timeout: 9000 }).catch(() => {}),
    page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} const a = document.getElementById('studio-cta-main'); if (a) a.click(); }).catch(() => {})
  ]);
  await page.waitForTimeout(900);
  const deviceA2 = await page.evaluate(() => {
    var meta = {}; try { meta = JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) {}
    return { hasSkZ: !!meta.sketchbook_z, legacySk: ('sketchbook' in meta), totalBytes: new TextEncoder().encode(JSON.stringify(meta)).length };
  });

  // ── DEVICE B: clear localStorage (keep the mock "cloud" in sessionStorage), reload ──
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);   // let nav.js restore + Blueprint re-sync run
  const restored = await page.evaluate(() => {
    function rooms(slot) { return slot && slot.accounts ? slot.accounts.length : null; }
    var arch = null, book = null, perSlot = {};
    try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1') || 'null'); } catch (e) {}
    try { book = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    for (var n = 1; n <= 4; n++) { try { perSlot[n] = rooms(JSON.parse(localStorage.getItem('datum_blueprint_state_' + n) || 'null')); } catch (e) { perSlot[n] = null; } }
    return {
      archRooms: arch ? { 1: rooms(arch.slot1), 2: rooms(arch.slot2), 3: rooms(arch.slot3), 4: rooms(arch.slot4) } : null,
      perSlotRooms: perSlot,
      bookSlot1: !!(book && book.slot_1),
      bookIs4Slot: !!(book && ('slot_2' in book) && ('slot_3' in book) && ('slot_4' in book))
    };
  });

  await browser.close(); server.close();

  // ── Assertions ────────────────────────────────────────────────────────────────
  check('device A wrote blueprint_z to Clerk', deviceA.hasBpZ);
  check('device A dropped legacy blueprint key', !deviceA.legacyBp);
  check('device A wrote sketchbook_z to Clerk', deviceA2.hasSkZ);
  check('device A dropped legacy sketchbook key', !deviceA2.legacySk);
  check('Clerk total within 8192B cap', deviceA2.totalBytes <= 8192, deviceA2.totalBytes);
  check('device B rebuilt blueprint archive', !!restored.archRooms);
  for (let n = 1; n <= 4; n++) {
    check('slot ' + n + ' rooms intact (' + ROOMS[n] + ')', restored.archRooms && restored.archRooms[n] === ROOMS[n], restored.archRooms ? restored.archRooms[n] : 'none');
    check('slot ' + n + ' per-slot key rebuilt', restored.perSlotRooms[n] === ROOMS[n], restored.perSlotRooms[n]);
  }
  check('device B rebuilt sketchbook slot_1', restored.bookSlot1);
  check('sketchbook restored as 4-slot structure', restored.bookIs4Slot);
  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  console.log(JSON.stringify({ verdict: fails.length ? 'FAIL' : 'PASS', deviceA, deviceA2, restored, pageErrors: pageErrors.slice(0, 3) }, null, 2));
  process.exit(fails.length ? 1 : 0);
})();
