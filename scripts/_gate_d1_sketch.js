'use strict';
/* D1 PHASE-5b BEHAVIOR GATE (red-first) — Sketchbook → D1 (data plane, ADDITIVE dual-write).
 * The sketch save (_doSave) is INLINE in sketch.html, so this drives the REAL page headlessly: serves
 * the repo, mocks a signed-in Clerk user, stubs /api/documents (capturing PUTs), drives a real nav-picker
 * save, and asserts the sketch dual-writes to D1 (type='sketchbook', doc_key=sketch_id) ALONGSIDE the
 * sketchbook_z Clerk mirror + LS 4-slot book (the net stays on, nothing retired). Mirrors the blueprint
 * L1 (f64425f). Run: node scripts/_gate_d1_sketch.js [LABEL] [--redfirst] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RF = process.argv.includes('--redfirst');
const pick = (w, l) => (RF ? l : w);
let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8357; const base = 'http://127.0.0.1:' + PORT;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));

  // stateful /api/documents mock — records every PUT (type/key/rev), serves GET from the store.
  const store = {};          // key = type + ':' + doc_key -> { payload, revision }
  const puts = [];           // [{ type, key, payload }]
  await ctx.route('**/*', (route) => {
    const req = route.request(); const url = req.url();
    if (url.indexOf('/api/documents') >= 0) {
      const u = new URL(url); const type = u.searchParams.get('type'); const key = u.searchParams.get('key') || 'active'; const list = u.searchParams.get('list') === '1';
      const auth = req.headers()['authorization'] || '';
      if (!/^Bearer\s+tok:/.test(auth)) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' });
      const id = type + ':' + key;
      if (req.method() === 'PUT') {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
        const prev = store[id]; const rev = prev ? prev.revision + 1 : 1;
        store[id] = { payload: JSON.stringify(body.payload), revision: rev };
        puts.push({ type, key, payload: body.payload });
        return route.fulfill({ status: prev ? 200 : 201, contentType: 'application/json', body: JSON.stringify({ revision: rev, updated_at: new Date().toISOString() }) });
      }
      if (req.method() === 'GET' && list) {
        const docs = Object.keys(store).filter((k) => k.indexOf(type + ':') === 0).map((k) => ({ doc_key: k.split(':')[1], revision: store[k].revision, updated_at: '' }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: docs }) });
      }
      if (req.method() === 'GET') { const d = store[id]; return d ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: d.payload, revision: d.revision, updated_at: '' }) }) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const clerkUpdates = [];
  await page.exposeFunction('__recordClerkUpdate', (o) => { clerkUpdates.push(o); });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    try { localStorage.setItem('datum_workspace_name', 'Tester'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
      user: { id: 'harness-user', unsafeMetadata: {},
        update: function (o) { try { window.__recordClerkUpdate(o); } catch (e) {} this.unsafeMetadata = (o && o.unsafeMetadata) || {}; return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } }
    };
  });

  await page.goto(base + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.DatumD1) window.DatumD1.WRITE_DEBOUNCE_MS = 40; });   // snappy debounced write

  // drive a real sketch to a saveable, revealed state (same path as the cross-device gate)
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1600);
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  for (let i = 0; i < 20; i++) { const rv = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); }); if (rv) break; await page.waitForTimeout(400); }
  await page.waitForTimeout(700);

  /* ── NAV-PICKER SAVE (source:'nav' stays on the page -> the D1 write fires) ────────────────────
   * ⚠️ RE-GROUNDED 2026-08-02. This drove `A-0<n>` sheet buttons and clicked NOTHING, so the save
   * never happened and SIX behaviour assertions went red together off ONE broken precondition —
   * they were reported as a product defect for two days. MEASURED, the picker offers:
   *   empty sketchbook  -> ["＋ Save as a new sketch"]                      (one door, and only one)
   *   filled sketchbook -> ["Save progress …", "＋ Save as a new sketch", "<Name>EXPANSIVE · …"]
   * There is NO "A-01" ANYWHERE IN THIS PICKER — a saved sketch is named, not slot-coded. (The
   * `Sheet A-01` label recorded elsewhere is a different surface. Verify the label on the surface
   * you are driving.) The fixture's zero state was the trap AGAIN: it assumed a filled sketchbook
   * and booted an empty one, which is the state EVERY new user is in.
   * PRECONDITIONS ARE RETURNED, NOT ASSUMED, so a missing door reds ITSELF instead of reding six
   * assertions about D1 that never got the chance to be true. */
  async function openPicker() {
    await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} if (typeof window.sketchSaveCurrent === 'function') window.sketchSaveCurrent(); });
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      var pop = document.getElementById('sketch-save-sb-pop');
      return pop ? Array.prototype.slice.call(pop.querySelectorAll('button')).map((b) => b.textContent.trim().replace(/\s+/g, ' ')) : null;
    });
  }
  // Clicks the door whose LABEL matches, and reports whether it actually found one.
  async function clickDoor(re) {
    const hit = await page.evaluate((src) => {
      var pop = document.getElementById('sketch-save-sb-pop'); if (!pop) return false;
      var rx = new RegExp(src, 'i');
      var b = Array.prototype.slice.call(pop.querySelectorAll('button')).find((x) => rx.test(x.textContent));
      if (!b) return false; b.click(); return true;
    }, re.source);
    await page.waitForTimeout(200);
    // a filled-slot route can raise an Overwrite confirm; harmless when absent
    await page.evaluate(() => { var pop = document.getElementById('sketch-save-sb-pop'); if (!pop) return; var b = Array.prototype.slice.call(pop.querySelectorAll('button')).find((x) => /^Overwrite$/.test(x.textContent.trim())); if (b) b.click(); });
    await page.waitForTimeout(900);   // let the sketch D1 write land
    return hit;
  }

  const doors1 = await openPicker();
  ok(!!doors1 && doors1.length > 0, `PRECONDITION: the save picker opened and offered a door (${JSON.stringify(doors1)})`);
  const savedNew = await clickDoor(/new sketch/);
  ok(savedNew, 'PRECONDITION: the FIRST save door ("＋ Save as a new sketch") was found and clicked — an empty sketchbook offers no sheet to overwrite');

  const sketchPuts1 = puts.filter((p) => p.type === 'sketchbook');
  const firstPut = sketchPuts1[0];
  ok(pick(sketchPuts1.length >= 1, sketchPuts1.length === 0),
     'DUAL-WRITE: a nav-picker save writes a D1 sketchbook doc (PUT type=sketchbook) [BITE]');
  ok(pick(!!firstPut && !!firstPut.key && firstPut.key === (firstPut.payload && firstPut.payload.sketch_id),
          !(firstPut && firstPut.key)),
     'STABLE ID: the D1 doc_key IS the sketch_id (one row per sketch) [BITE]');
  ok(pick(!!firstPut && typeof firstPut.payload.datum_spend === 'number' && typeof firstPut.payload.age !== 'undefined',
          !(firstPut && firstPut.payload)),
     'FIDELITY: the sketch payload (age/datum_spend/designed_*) rides to D1 [BITE]');

  // ── ADDITIVE: LS 4-slot book + per-slot key still written (the net stays on). NOTE: the sketchbook_z
  //    Clerk mirror is deliberately SKIPPED on 127.0.0.1 (sketch.html:_isLocalHost, to avoid Clerk's
  //    localhost redirect) so it is not assertable in this harness — my slice never touches it anyway.
  const lsBook = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) { return null; } });
  const lsSlot = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datum_sketch_state_1') || 'null'); } catch (e) { return null; } });
  ok(pick(!!(lsBook && lsBook.slot_1) && !!(lsSlot && lsSlot.sketch_id), !(lsBook && lsBook.slot_1)),
     'ADDITIVE: LS 4-slot book + per-slot key still written, carrying the same sketch_id [BITE]');
  ok(pick(!!lsSlot && !!firstPut && lsSlot.sketch_id === firstPut.key, !(lsSlot && firstPut && lsSlot.sketch_id === firstPut.key)),
     'PARITY: the LS slot and the D1 row share ONE sketch_id [BITE]');

  // ── STABLE ID on OVERWRITE: re-save slot 1 -> SAME doc_key (updates the row, no new one) ──
  const beforeKeys = new Set(puts.filter((p) => p.type === 'sketchbook').map((p) => p.key));
  const doors2 = await openPicker();
  ok(!!doors2 && doors2.some((d) => /Save progress/i.test(d)),
     `PRECONDITION: after one save the picker offers the OVERWRITE-IN-PLACE door ("Save progress") (${JSON.stringify(doors2)})`);
  const savedAgain = await clickDoor(/Save progress/);
  ok(savedAgain, 'PRECONDITION: the overwrite door was found and clicked');
  const sketchPuts2 = puts.filter((p) => p.type === 'sketchbook');
  const lastPut = sketchPuts2[sketchPuts2.length - 1];
  ok(pick(!!lastPut && beforeKeys.has(lastPut.key) && lastPut.key === firstPut.key,
          !(lastPut && lastPut.key === firstPut.key)),
     'OVERWRITE: re-saving the SAME slot reuses its sketch_id (same D1 row, not a new one) [BITE]');

  // ── WIRING markers (served bytes) ──
  const sk = fs.readFileSync(path.join(ROOT, 'sketch.html'), 'utf8');
  ok(sk.includes('/scripts/datum-d1.js'), 'sketch.html includes datum-d1.js');
  /* RE-GROUNDED 2026-08-02: this named `scheduleWrite('sketchbook'` and went red on a DELIBERATE
     product correction — sketch.html:9143 resolves `_write = DatumD1.writeNow || scheduleWrite` so a
     save confirmation is not gated on the ~1.5s debounce. Anchored on the CALL now, which is true of
     either mechanism, instead of on the name of one of them. */
  ok(sk.includes("_write.call(window.DatumD1, 'sketchbook'"), "sketch.html: _doSave issues a per-sketch D1 write (type sketchbook) via writeNow-or-scheduleWrite");
  ok(sk.includes('CUTOVER === false') && sk.includes('signedIn()'), 'sketch.html: D1 write no-op escape route (signed-out / rolled back / D1 absent)');
  ok(sk.includes('_stableSketchId'), 'sketch.html: stable-id resolution — overwrite reuses the slot sketch_id (_stableSketchId)');

  ok(pageErrors.length === 0, 'no page errors on sketch.html (' + (pageErrors[0] || '') + ')');

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped — MUST be RED)' : 'NORMAL') + '   |   D1 Phase-5b sketchbook dual-write gate');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  console.log('[' + (process.argv[2] && process.argv[2] !== '--redfirst' ? process.argv[2] : 'RUN') + '] G-SKETCH-D1 — ' + overall + '\n' + lines.join('\n'));
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
