'use strict';
/* THE SAVE HANDOFF · RED-FIRST — a save-role button must leave the work IN D1, on every branch.
 *
 * THE DEFECT THIS EXISTS FOR, MEASURED before the fix: a signed-out visitor pressed "Save my work",
 * completed signup, and landed on an EMPTY sketchbook. _autoConsumeSketch wrote the 4-slot Clerk/LS
 * mirror and NOTHING else — zero D1 PUTs, ever — while sketchbook.html RENDERS FROM D1 and treats a
 * reachable-empty list as AUTHORITATIVE. We interrupted someone, promised to protect their work, and
 * destroyed it by the act of accepting.
 *
 * THE LOAD-BEARING ASSERTION IS HANDOFF 2 — the D1 ROW. A filled LS slot is NOT proof: that is exactly
 * what the broken version produced on some paths, and the page does not read it.
 *
 * POSITIVE CONTROL FIRST, always: D1 live with one row must render "Saved 1" before any zero below is
 * allowed to mean anything (L68). Four rig faults this month were caught by a number that was too tidy.
 *
 * RACE DECLARATIONS (L52): none. Every read follows a fixed settle past both the boot sweep and the
 * write-then-re-read round trip.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --nod1consume  restores the pre-fix consumer: mirror only, no D1 row. HANDOFF 2 must go red.
const NOD1 = process.argv.includes('--nod1consume');
// --nocaproll   restores the Clerk-era ceiling: a 5th sketch is REFUSED instead of rolling the net.
const NOCAP = process.argv.includes('--nocaproll');
/* --noanswered removes the answered-this-departure check, restoring the re-entrant guard the Captain
 * smoked: the save-role buttons go dead and the panel rebuilds itself. HANDOFF 13/14 must go red. */
const NOANS = process.argv.includes('--noanswered');
const A_ANS = '        if (window._skLeaveAnswered === true) return false;';
const M_ANS = '        if (false) return false;';
const A_D1  = '    var _d1 = _d1WriteCarriedSketch(_snap);';
const M_D1  = '    var _d1 = null;';
const A_CAP = '      book.slot_4 = book.slot_3 || null;';
const M_CAP = '      showSketchToast(\'All available sketch pages are already filled.\'); return;';
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketch.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/sketch.html' && NOANS) {
    let src = body.toString('utf8'); const orig = src;
    const n = src.split(A_ANS).length - 1;
    if (n !== 1) throw new Error(`anchor noanswered: expected exactly 1 occurrence, found ${n}`);
    src = src.replace(A_ANS, M_ANS);
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  if (p === '/sketchbook.html' && (NOD1 || NOCAP)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
      src = src.replace(a, m);
    };
    if (NOD1)  apply(A_D1,  M_D1,  'nod1consume');
    if (NOCAP) apply(A_CAP, M_CAP, 'nocaproll');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});
const PORT = 8256; const base = 'http://127.0.0.1:' + PORT;
const CLERK = `window.Clerk = { load: function(){ return Promise.resolve(); },
  session: { getToken: function(){ return Promise.resolve('tok'); } },
  user: { id:'u', firstName:'P', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
          update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  /* A live D1: list is authoritative, PUTs are recorded and become part of the list. */
  async function ctxWith(seed) {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const store = Object.assign({}, seed || {});
    const puts = [];
    await ctx.route('**/*', (route) => {
      const req = route.request(), u = req.url();
      if (u.indexOf('/api/documents') >= 0) {
        const q = new URL(u);
        if (req.method() !== 'GET') {
          let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (e) {}
          const key = (b && (b.key || b.doc_key)) || q.searchParams.get('key');
          if (key) store[key] = (b && (b.payload || b.document || b.data)) || '{}';
          puts.push({ key, type: q.searchParams.get('type') || (b && b.type) });
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
        }
        if (q.searchParams.get('list') === '1') {
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ documents: Object.keys(store).map((k) => ({ doc_key: k, revision: 1, updated_at: '2026-07-31T12:00:00.000Z' })) }) });
        }
        const key = q.searchParams.get('key');
        if (store[key]) return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ payload: typeof store[key] === 'string' ? store[key] : JSON.stringify(store[key]), updated_at: '2026-07-31T12:00:00.000Z' }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
      }
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    return { ctx, store, puts };
  }
  const stageText = (page) => page.evaluate(() => {
    const s = document.getElementById('sk-stage');
    return s ? (s.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120) : 'NO STAGE';
  });

  // ── POSITIVE CONTROL ───────────────────────────────────────────────────────────────────────────────
  {
    const { ctx } = await ctxWith({ 'ctrl-1': JSON.stringify({ sketch_id: 'ctrl-1', version: '1.0.0', saved_at: '2026-07-31T12:00:00.000Z', age: 40, resolved_state: 'EXPANSIVE', date_stamped: '07/31/2026' }) });
    const page = await ctx.newPage();
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');sessionStorage.setItem('datum_auth_hint','1');}catch(e){} ${CLERK} })();`);
    await page.goto(base + '/sketchbook.html', { waitUntil: 'commit' });
    await sleep(8000);
    const t = await stageText(page);
    lines.push(`      [positive control] ${t.slice(0, 70)}`);
    ok(/Saved 1/.test(t), `HANDOFF 0 POSITIVE CONTROL: a D1 row renders (${/Saved 1/.test(t) ? 'Saved 1' : t.slice(0, 40)}) — without this every zero below is the rig`);
    await ctx.close();
  }

  // ── THE REAL CONVERSION ROUND TRIP: signed out -> stash -> auth -> sketchbook, D1 LIVE AND EMPTY ───
  async function roundTrip(seed, fillBook) {
    const { ctx, puts } = await ctxWith(seed || {});
    const page = await ctx.newPage();
    /* THE CEILING LIVES ON THE LS BOOK, NOT ON D1 — seeding D1 alone leaves slot_1 free and the cap
       branch is never reached. An earlier version of HANDOFF 5 did exactly that and passed for the
       wrong reason: --nocaproll landed cleanly and nothing went red. */
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');
      ${fillBook ? `localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1:{sketch_id:'b1',version:'1.0.0',saved_at:'2026-07-30T12:00:00.000Z'}, slot_2:{sketch_id:'b2',version:'1.0.0',saved_at:'2026-07-30T12:00:00.000Z'}, slot_3:{sketch_id:'b3',version:'1.0.0',saved_at:'2026-07-30T12:00:00.000Z'}, slot_4:{sketch_id:'b4',version:'1.0.0',saved_at:'2026-07-30T12:00:00.000Z'} }));` : ''}
    }catch(e){} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);
    // Drive the REAL signed-out door the leave prompt uses.
    await page.evaluate(() => { window._navDrain = function () {}; window._skHopToVaultSave('sign-up'); });
    await sleep(500);
    const stash = await page.evaluate(() => ({
      snap: !!sessionStorage.getItem('datumfi_sketch_current_snapshot'),
      pending: sessionStorage.getItem('datumfi_pending_save')
    }));
    // They authenticate at Clerk and are returned to the sketchbook.
    await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
    await page.addInitScript(`(() => { ${CLERK} })();`);
    await page.goto(base + '/sketchbook.html', { waitUntil: 'commit' });
    await sleep(9000);
    const landing = await stageText(page);
    const bookAfter = await page.evaluate(() => { try { const b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1')||'null'); return b ? { s1: b.slot_1 && b.slot_1.sketch_id, s2: b.slot_2 && b.slot_2.sketch_id } : null; } catch(e) { return null; } });
    const toast = await page.evaluate(() => (document.body.innerText||'').indexOf('All available sketch pages are already filled') >= 0);
    await page.reload({ waitUntil: 'commit' });
    await sleep(9000);
    const second = await stageText(page);
    await ctx.close();
    return { stash, puts, landing, second, bookAfter, toast };
  }

  const rt = await roundTrip();
  lines.push(`      [conversion] stash=${JSON.stringify(rt.stash)} puts=${JSON.stringify(rt.puts)}`);
  lines.push(`      [conversion] landing=${rt.landing.slice(0, 70)}`);
  ok(rt.stash.snap === true && rt.stash.pending === 'sketch',
    'HANDOFF 1: the signed-out save door stashes the work BEFORE the hop');
  ok(rt.puts.some((p) => p.type === 'sketchbook'),
    `HANDOFF 2 LOAD-BEARING: the carried sketch reaches D1 — a real row, not a mirror slot (puts ${JSON.stringify(rt.puts)})`);
  ok(/Saved 1/.test(rt.landing),
    `HANDOFF 3: and the user SEES it on landing, without reloading (${rt.landing.slice(0, 50)})`);
  ok(/Saved 1/.test(rt.second),
    `HANDOFF 4: it is still there on the next load — not a UI flash over an empty driver (${rt.second.slice(0, 50)})`);

  // ── THE 4-SLOT CEILING IS GONE: a 5th carried sketch must still be saved ───────────────────────────
  {
    const seed = {};
    for (let i = 1; i <= 4; i++) seed['old-' + i] = JSON.stringify({ sketch_id: 'old-' + i, version: '1.0.0', saved_at: '2026-07-30T12:00:00.000Z', age: 40, resolved_state: 'EXPANSIVE', date_stamped: '07/30/2026' });
    const rt5 = await roundTrip(seed, true);   // LS book FULL — the cap's actual precondition
    lines.push(`      [5th sketch] puts=${JSON.stringify(rt5.puts)} book=${JSON.stringify(rt5.bookAfter)} refusalToast=${rt5.toast}`);
    ok(rt5.puts.some((p) => p.type === 'sketchbook'),
      `HANDOFF 5: with four sketches already saved, a FIFTH carried sketch still reaches D1 (puts ${JSON.stringify(rt5.puts)})`);
    /* THE CAP ASSERTION PROPER. The D1 write happens BEFORE the slot logic, so the ceiling can never
       suppress the row — an earlier HANDOFF 5 asserted only the PUT and --nocaproll could not reach it.
       What the ceiling actually governs is the MIRROR: refuse, or roll the newest-4 net. */
    ok(rt5.bookAfter && rt5.bookAfter.s1 && rt5.bookAfter.s1 !== 'b1',
      `HANDOFF 5b LOAD-BEARING: the newest-4 net ROLLS to carry the new sketch instead of refusing it (slot_1 now ${rt5.bookAfter && rt5.bookAfter.s1}, was b1)`);
    /* HANDOFF 5c IS A SOURCE ASSERTION, DELIBERATELY, AND THE REASON IS WORTH THE SPACE. Two earlier
       behavioural versions of this check could not be made to bite: the D1 write now happens BEFORE the
       slot logic so the ceiling cannot suppress the row, and _applySketchBook rebuilds the LS book from
       the D1 list on every load, so the mirror ends up correct whether the branch rolled or refused. The
       ceiling has no observable consequence left — which is exactly what "the cap is dead" means. What IS
       observable is whether the refusal still exists in the shipped bytes, and --nocaproll puts it back. */
    const served = await (await fetch(base + '/sketchbook.html')).text();
    const _cs = served.indexOf('function _autoConsumeSketch');
    const consumerBody = _cs >= 0 ? served.slice(_cs, _cs + 3000) : '';
    ok(consumerBody.length > 0 && consumerBody.indexOf('All available sketch pages are already filled') < 0,
      'HANDOFF 5c: the Clerk-era refusal is GONE from the carry consumer — a ceiling that refuses a save the driver accepts cannot be reached if it does not exist');
    /* THE SECOND REFUSAL SITE IS GONE. It lived in saveCurrentSketchToFirstAvailableSlot — the page's own
       "PIN CURRENT SCENARIO" path, which called executeSavePayloadToSlot with NO PAYLOAD and so wrote the
       in-memory SketchbookDatabase and a toast and nothing durable. It turned out to be DEAD SCAFFOLDING
       (no callers since P6.1 replaced pin-a-snapshot with open-a-fresh-Sketch) and was deleted whole on
       2026-08-01 rather than repaired. HANDOFF 26 keeps it deleted. */
    ok(served.indexOf('saveCurrentSketchToFirstAvailableSlot') < 0 &&
       served.indexOf('All available sketch pages are already filled') < 0,
      'HANDOFF 26: the dead pin-to-slot path stays deleted — it wrote nothing durable, and a save-labelled path that persists nothing is the same defect as one that persists only to the mirror');
  }

  // ── THE TWO DOORS DIFFER, AND ONLY IN THE DOOR ────────────────────────────────────────────────────
  {
    const { ctx } = await ctxWith({});
    const page = await ctx.newPage();
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');}catch(e){} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);
    const doors = await page.evaluate(() => {
      const seen = [];
      window._navDrain = function (u) { seen.push(u); };
      window._skHopToVaultSave('sign-up');
      const up = { url: seen[seen.length - 1], stashed: !!sessionStorage.getItem('datumfi_sketch_current_snapshot') };
      try { sessionStorage.removeItem('datumfi_sketch_current_snapshot'); } catch (e) {}
      window._skHopToVaultSave('sign-in');
      const inn = { url: seen[seen.length - 1], stashed: !!sessionStorage.getItem('datumfi_sketch_current_snapshot') };
      return { up, inn };
    });
    await ctx.close();
    lines.push(`      [doors] ${JSON.stringify(doors)}`);
    ok(/mode=sign-up/.test(doors.up.url) && !/mode=sign-up/.test(doors.inn.url),
      `HANDOFF 6: "Save my work" opens the SIGN-UP door and "Sign in" does not (${doors.up.url} | ${doors.inn.url})`);
    ok(doors.up.stashed === true && doors.inn.stashed === true,
      'HANDOFF 7: BOTH doors stash identically — the destination differs, the guarantee does not');
    ok(/returnTo=%2Fsketchbook\.html/.test(doors.up.url) && /returnTo=%2Fsketchbook\.html/.test(doors.inn.url),
      'HANDOFF 8: both land on the sketchbook — work visibly saved, every onward door open');
  }

  // ── A / C: the signed-in save role reaches the page's own save entry, not an SVG exporter ─────────
  {
    const { ctx } = await ctxWith({});
    const page = await ctx.newPage();
    const downloads = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');sessionStorage.setItem('datum_auth_hint','1');}catch(e){} ${CLERK} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);
    const sl = await page.$('#slider-datum');
    await sl.hover(); await page.mouse.down(); await page.mouse.up();
    await page.evaluate(() => {
      const s = document.getElementById('slider-datum');
      s.value = String(Math.round(parseFloat(s.value) * 1.18));
      s.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(600);
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(2000);
    const branch = await page.evaluate(() => {
      const w = document.querySelector('[data-leave-prompt]');
      return w ? w.getAttribute('data-leave-prompt') : null;
    });
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[data-leave-prompt] button')).find((x) => x.getAttribute('data-leave-role') === 'save');
      if (b) b.click();
    });
    await sleep(2500);
    const after = await page.evaluate(() => ({
      picker: !!document.getElementById('sketch-save-sb-pop'),
      pending: window._skPendingLeave || null
    }));
    await ctx.close();
    lines.push(`      [signed-in save role] branch=${branch} picker=${after.picker} downloads=${JSON.stringify(downloads)}`);
    ok(branch === 'C', `HANDOFF 9: a signed-in architect who has never saved gets Branch C (got ${branch})`);
    ok(after.picker === true,
      `HANDOFF 10: its save button opens the page's own SLOT PICKER (picker=${after.picker}) — the entry that branches on auth and carries the whole guarantee`);
    ok(downloads.length === 0,
      `HANDOFF 11 REGRESSION: and it downloads NOTHING. The previous wiring clicked "Save Shape", an SVG export (downloads ${JSON.stringify(downloads)})`);
    ok(after.pending !== null,
      'HANDOFF 12: the destination is parked so a confirmed save can continue the journey');
  }

  /* == THE RE-ENTRANT GUARD - the Captain's dead buttons ======================================== */
  {
    const { ctx } = await ctxWith({});
    const page = await ctx.newPage();
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');}catch(e){} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);
    const sl = await page.$('#slider-datum');
    await sl.hover(); await page.mouse.down(); await page.mouse.up();
    await page.evaluate(() => { const s = document.getElementById('slider-datum'); s.value = String(Math.round(parseFloat(s.value) * 1.18)); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(600);
    await page.evaluate(() => { window.__navs = []; const rd = window._navDrain; window._navDrain = function (u) { window.__navs.push(u); return rd.apply(this, arguments); }; });
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(2000);
    const up = await page.evaluate(() => !!document.querySelector('[data-leave-prompt]'));
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-leave-prompt] button')).find((x) => x.getAttribute('data-leave-role') === 'create'); if (b) b.click(); });
    await sleep(3000);
    /* READ IT IN A WAY THAT SURVIVES SUCCESS. The first version read window.__navs after the click and
       CRASHED - because the page had genuinely navigated and taken the injected variable with it. The
       crash was the fix working. url is read from Playwright, which outlives the document. */
    const st = await page.evaluate(() => ({ panel: !!document.querySelector('[data-leave-prompt]') })).catch(() => ({ panel: false }));
    const landedOn = page.url().replace(base, '');
    lines.push(`      [re-entrant guard] panelFirst=${up} panelStillUp=${st.panel} landedOn=${landedOn}`);
    ok(st.panel === false,
      `HANDOFF 13 LOAD-BEARING: after pressing "Save my work" the panel does NOT rebuild itself (still up: ${st.panel}) - the guard no longer eats the navigation it asked for`);
    /* ASSERT IT LEFT, NOT WHERE IT ARRIVED. vault.html's whole body is a location.replace to
       accounts.datumfi.com, which this harness aborts as off-origin - so a SUCCESSFUL hop lands on a
       browser error page, and asserting "landed on vault.html" would fail on the product working. What
       is provable here is that the sketch was departed; where Clerk takes them is Clerk's business. */
    ok(landedOn.indexOf('sketch.html') < 0,
      `HANDOFF 14: and the door actually opens - the page LEAVES the sketch (landed ${landedOn}; vault.html immediately replaces off-origin, which this harness aborts)`);
    await ctx.close();
  }

  /* == ANSWERED IS SCOPED TO ONE DEPARTURE ===================================================== */
  {
    const { ctx } = await ctxWith({});
    const page = await ctx.newPage();
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');}catch(e){} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(6500);
    const sl = await page.$('#slider-datum');
    await sl.hover(); await page.mouse.down(); await page.mouse.up();
    await page.evaluate(() => { const s = document.getElementById('slider-datum'); s.value = String(Math.round(parseFloat(s.value) * 1.18)); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(600);
    /* THE PRECONDITION IS INJECTED, AND THAT IS DECLARED. Driving a real leaving answer here would
       NAVIGATE - it did, and detached the page mid-test - so the answered state is set directly and what
       is measured is the half that cannot be proven any other way: THE RESET. That a real leaving answer
       SETS the flag is proven separately and behaviourally by HANDOFF 13/14, where the navigation only
       succeeds if it was set. Split this way, both halves are proven and neither is asserted. */
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-leave-prompt] button')).find((x) => x.getAttribute('data-leave-role') === 'stay'); if (b) b.click(); });
    await sleep(500);
    const stayLatched = await page.evaluate(() => window._skLeaveAnswered === true);
    await page.evaluate(() => { window._skLeaveAnswered = true; });
    const answered = await page.evaluate(() => window._skLeaveAnswered === true);
    await sl.hover(); await page.mouse.down(); await page.mouse.up();
    await sleep(400);
    const afterTouch = await page.evaluate(() => window._skLeaveAnswered === true);
    await page.evaluate(() => document.getElementById('nav-link-studio').click());
    await sleep(1800);
    const promptedAgain = await page.evaluate(() => !!document.querySelector('[data-leave-prompt]'));
    lines.push(`      [departure scope] answeredAfterLeave=${answered} afterTouch=${afterTouch} promptedAgain=${promptedAgain}`);
    ok(stayLatched === false,
      `HANDOFF 15: choosing STAY does NOT latch (${stayLatched}) - staying is not a departure, so the next one must still be asked about`);
    ok(answered === true, 'HANDOFF 15b: precondition set (injected, see note above)');
    ok(afterTouch === false,
      `HANDOFF 16 LOAD-BEARING: one trusted touch of the sketch CLEARS it (${afterTouch}) - the latch is scoped to a departure, never to the session`);
    ok(promptedAgain === true,
      `HANDOFF 17: so a LATER departure is asked about again (prompted: ${promptedAgain}) - a guard that protects you once and never again is worse than none`);
    await ctx.close();
  }

  /* == B - THE PICKER ANCHORS TO THE CONTROL A HUMAN CAN SEE ==================================== */
  {
    const { ctx } = await ctxWith({});
    const page = await ctx.newPage();
    await page.addInitScript(`(() => { try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');sessionStorage.setItem('datum_auth_hint','1');}catch(e){} ${CLERK} })();`);
    await page.goto(base + '/sketch.html', { waitUntil: 'commit' });
    await page.waitForSelector('#slider-datum', { timeout: 30000 });
    await sleep(7000);
    const topbarBtn = await page.evaluate(() => { const b = document.querySelector('#acct-topbar [data-acct-action="save-current"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; });
    await page.evaluate(() => { if (window._skGatedNavSave) window._skGatedNavSave(); });
    await sleep(1500);
    const pick = await page.evaluate(() => { const p = document.getElementById('sketch-save-sb-pop'); if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; });
    lines.push(`      [anchor] topbarSave=${JSON.stringify(topbarBtn)} pickerAt=${JSON.stringify(pick)}`);
    ok(!!pick, 'HANDOFF 18: the picker OPENS from the leave panel');
    ok(!!pick && !!topbarBtn && Math.abs(pick.x - topbarBtn.x) < 260,
      `HANDOFF 19 LOAD-BEARING: and it lands NEAR THE VISIBLE SAVE CONTROL, not at the screen edge (picker x=${pick && pick.x}, save button x=${topbarBtn && topbarBtn.x})`);
    /* CLOSE IT THROUGH THE MODULE, NOT BEHIND ITS BACK. Removing the element directly left the module's
       own _pop handle non-null, so the next call TOGGLED CLOSED instead of opening and the assertion
       failed on a rig artefact rather than on the product. */
    await page.evaluate(() => { if (window._skGatedNavSave) window._skGatedNavSave(); });   // toggle closed
    await sleep(400);
    await page.evaluate(() => { document.querySelectorAll('[data-acct-action="save-current"]').forEach((b) => { b.style.display = 'none'; }); });
    await page.evaluate(() => { if (window._skGatedNavSave) window._skGatedNavSave(); });   // and open again
    await sleep(1200);
    const stillOpens = await page.evaluate(() => !!document.getElementById('sketch-save-sb-pop'));
    ok(stillOpens === true,
      `HANDOFF 20 FAIL-OPEN: with NO save control visible the picker still opens (${stillOpens}) - an unanchored picker is cosmetic, one that refuses to open is a save that does not happen`);
    await ctx.close();
  }

  /* == THE SHAPE BUTTON'S COPY - the Captain's ruling, gated like all user-facing copy ========== */
  {
    const served = await (await fetch(base + '/sketch.html')).text();
    const btnIdx = served.indexOf('id="btn-save-shape"');
    const btnChunk = btnIdx >= 0 ? served.slice(btnIdx, btnIdx + 300) : '';
    /* "Save Shape", not "Export SVG". Ruled by the Captain 2026-08-01, reverting a rename he did not
       ask for. Transcribed here from his words rather than copied out of the page, so this assertion
       sits between two independent transcriptions instead of comparing the source to itself. */
    ok(btnChunk.indexOf('>Save Shape<') >= 0,
      'HANDOFF 21: the shape button reads "Save Shape" - the Captain\'s wording for his own control');
    /* 22 WAS THE TOOLTIP ASSERTION. Retired with the tooltip it guarded; the number is left as a hole
       rather than reused, so a reader of an old log is never handed a different assertion under it. */
    /* THREE STRINGS DESCRIBE ONE BUTTON: the label, the label the handler RESTORES two seconds after a
       click, and the confirmation flashed in between. All three are read out of the source below and
       bound to each other, so no rename can move one and leave the others telling the old story. */
    const labelMatch = /id="btn-save-shape"[\s\S]{0,300}?>([^<]+)</.exec(served);
    const label = labelMatch ? labelMatch[1].trim() : null;
    const confMatch = /saveBtn\.textContent = '\u2713 ([^']+)'/.exec(served);
    const conf = confMatch ? confMatch[1].trim() : null;
    const restMatch = /setTimeout\([\s\S]{0,80}?saveBtn\.textContent = '([^'\u2713]+)'/.exec(served);
    const rest = restMatch ? restMatch[1].trim() : null;
    ok(!!label && !!rest && rest === label,
      `HANDOFF 23 STRUCTURAL: the post-click restore carries the SAME label the button carries - label "${label}", restored "${rest}". A rename that misses the restore undoes itself two seconds after the first use`);
    const hIdx = served.indexOf("const saveBtn = document.getElementById('btn-save-shape')");
    const hChunk = hIdx >= 0 ? served.slice(hIdx, hIdx + 500) : '';
    ok(conf === 'Saved' && hChunk.indexOf('Export') < 0 && btnChunk.indexOf('Export') < 0,
      `HANDOFF 24: the transient confirmation reads "\u2713 Saved" (got "\u2713 ${conf}") and no "Export" wording survives on the button or in its handler`);
    /* HANDOFF 25 IS THE STRUCTURAL FIX, not another string check. This defect existed because the LABEL
       and its CONFIRMATION were two independent strings with no rule binding them - rename one and the
       other silently keeps telling the old story. So the confirmation must CONTAIN THE LABEL'S VERB,
       both read out of the source rather than hardcoded here. Rename the button to anything and this
       goes red until the confirmation follows it. */
    const verb = label ? label.split(/\s+/)[0].replace(/e$/i, '') : null;   // Export -> Export, Save -> Sav
    ok(!!label && !!conf && verb && conf.toLowerCase().indexOf(verb.toLowerCase()) === 0,
      `HANDOFF 25 STRUCTURAL: the confirmation is bound to the label - label "${label}", confirmation "\u2713 ${conf}". Two independent strings with no rule between them is WHY this defect could exist; renaming one must now break the gate until the other follows`);
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = NOD1 || NOCAP || NOANS;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (page bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = NOD1 ? 'MUTATED[nod1consume]' : NOCAP ? 'MUTATED[nocaproll]' : NOANS ? 'MUTATED[noanswered]' : 'CLEAN';
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
