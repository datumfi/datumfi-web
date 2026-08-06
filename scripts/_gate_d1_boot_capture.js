'use strict';
/* =====================================================================================
 * ✂️ SPLIT 2026-08-06 (Architect ruling, PROMPT #625). THIS FILE'S VERDICT NOW COUNTS —
 *    for THREE legs. FIVE legs are HELD and excluded from it, each saying so on its face.
 *
 * THE QUARANTINE WAS THE WRONG SHAPE: FILE-SHAPED, FOR A LEG-SHAPED PROBLEM. One refuted
 * premise took the whole file down with it, and G-BP-OPEN — a live, correct assertion
 * passing 5/5 — sat for weeks inside a file nobody was permitted to believe. A quarantine
 * that is coarser than the defect destroys working instruments as collateral.
 *
 * ✅ LIVE (these three decide the exit code):
 *   G-BP-OPEN            ?id=<UUID>&hydrate=blueprint with a stashed blueprint + an EMPTY
 *                        active doc renders the BLUEPRINT's rooms. Premise CONFIRMED live:
 *                        a cold Studio opens empty, but a SAVED BLUEPRINT opens with its
 *                        rooms. This is the RC-B short-circuit guard and it is worth having.
 *   G-BOOT-SLOW-TIMEOUT  a read that times out must NOT let an empty PUT clobber the UNREAD
 *                        D1 doc. Premise intact — the UNREAD case is precisely the one
 *                        studio-blueprint.js:827 genuinely does guard.
 *   the autosave-fired presence check (a fixture that drove nothing must not read as proof).
 *
 * ⏸ HELD (run, printed, NOT counted) — TWO different reasons, deliberately not merged:
 *   (a) REFUTED PREMISE. Four legs assert that a bare cold /studio.html HYDRATES the D1
 *       active doc into rooms. The Captain confirmed on datumfi.com that a cold Studio with
 *       nothing opened correctly shows EMPTY. The harness measured 0 and WAS RIGHT. Do not
 *       repair these by changing the date — the premise is wrong, not the fixture.
 *   (b) ⬜ AWAITING A PRODUCT RULING, NOT A CODE FIX. "NO empty studio PUT escaped" is the
 *       open Ruling C question (Property §19.25): studio-blueprint.js:827 refuses an empty
 *       write ONLY when the revision is UNKNOWN, resting on its own stated assumption that
 *       "a genuine delete-all-rooms always has a known revision". That holds only if a doc
 *       that was READ is always DISPLAYED. Provisional ruling: a cold, empty boot must never
 *       overwrite a populated D1 active doc. UNTIL THAT LANDS THIS LEG HAS NO AGREED ANSWER,
 *       so counting it either way would be inventing one.
 *
 * ── SUPERSEDED 2026-07-28 QUARANTINE, KEPT VERBATIM ──────────────────────────────────
 * | QUARANTINED 2026-07-28 - DO NOT TRUST THIS GATE VERDICT (green OR red).
 * | its premise is CONTRADICTED by the live product. It asserts that a bare cold
 * | /studio.html hydrates the D1 active doc into rooms. The Captain confirmed on
 * | datumfi.com that a cold Studio with nothing opened correctly shows EMPTY. The harness
 * | measured 0 and was RIGHT.
 * | Kept for its intent, NOT its result. Retired from decision-making by Captain ruling at
 * | the close of the gate-integrity arc. Re-premise it against confirmed live behaviour,
 * | or delete it. Requires a fresh GO from Daniel before either.
 * |   [<- that GO arrived 2026-08-06: re-premised leg-by-leg rather than deleted, because
 * |       one of the legs was never wrong in the first place.]
 * ───────────────────────────────────────────────────────────────────────────────────── */
/* D1 SOAK-FIX GATE (#284) — write-capture + blueprint-open, headless mocked-auth against the REAL
 * studio.html. Reproduces the EXACT soak symptoms (negative-control doctrine): the studio D1 'active'
 * row that autosaves n_rooms:0 even though the loaded doc HAD rooms (RC-A), and opening a saved
 * blueprint that renders the empty active draft instead of the blueprint (RC-B).
 *
 *   G-BOOT-CAPTURE — D1 active doc HAS rooms -> boot hydrates window.state -> an autosave PUT carries
 *                    the rooms (no empty write escapes). RED today (state never hydrated -> PUT n=0).
 *   G-BP-OPEN      — ?id=<UUID>&hydrate=blueprint with a stashed blueprint (rooms) + EMPTY active doc
 *                    -> studio shows the BLUEPRINT's rooms. RED today (d1Doc short-circuit + parseInt(UUID)).
 *   G-BOOT-SLOW    — D1 GET resolves at ~3.5s (> the old 3s idea, < the 5s anti-wedge). NO empty studio
 *                    PUT ever escapes and the rooms still land. RED on a bare-disarm/short-wedge design.
 *
 * Run: node scripts/_gate_d1_boot_capture.js [LABEL]
 * RED-FIRST proof: `git stash push -- studio.html scripts/studio-blueprint.js` then run (expect RED),
 *                  then `git stash pop` and run again (expect GREEN). */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0, held = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
/* HELD — the leg RUNS and its observation is PRINTED, but it does not touch the verdict.
   This is how the quarantine gets the right SHAPE: the untrusted premise is leg-scoped, so the
   file stops being one nobody may believe and becomes one with three live assertions and five
   documented holds. The evidence stays visible — a hold that hides its measurement is just a
   deletion with extra steps.
   ⛔ THE TOKEN IS 'HELD', NEVER '[QUARANTINED]'. _suite_baseline.mjs classifies by substring
   (`out.indexOf('[QUARANTINED]') >= 0`), so printing that literal ANYWHERE re-quarantines the
   WHOLE FILE and this split would look done while changing nothing. */
const hold = (c, m) => { held++; lines.push('HELD ' + (c ? '(would pass) ' : '(would fail) ') + m); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8191; const base = 'http://127.0.0.1:' + PORT;

// A studio doc payload carrying N Estate rooms (accounts).
function studioDocWithRooms(n) {
  const accts = [];
  for (let r = 0; r < n; r++) accts.push({ id: 'a' + r, baseId: 'taxable', name: 'Room ' + r, value: 90000 + r * 1000, inflow: 0, freq: 12, holdings: [] });
  const bp = { schema: 'DatumFIBlueprintV1', version: '1.0.1', profile: { primary_name: 'Soak' },
    accounts: accts, datum: { net_datum_v1: 120000 }, portfolio_total: 500000, contributions_total: 24000 };
  return { payload: JSON.stringify(bp), revision: 3, updated_at: '2026-07-15T23:47:12.842Z' };
}
const EMPTY_STUDIO = { payload: JSON.stringify({ schema: 'DatumFIBlueprintV1', version: '1.0.1', profile: {}, accounts: [], datum: {} }), revision: 9, updated_at: '2026-07-15T23:47:12.842Z' };

const CLERK_INIT = () => {
  try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
  try { localStorage.setItem('datum_workspace_name', 'Tester'); } catch (e) {}
  window.Clerk = {
    load: function () { return Promise.resolve(); },
    session: { getToken: function () { return Promise.resolve('tok:harness-user'); } },
    user: { id: 'harness-user', unsafeMetadata: {}, update: function () { return Promise.resolve(); },
      firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } }
  };
};

// Build a page whose /api/documents studio GET returns `getStudio()` (optionally after `delayMs`),
// and which records every studio PUT's accounts length + relative time. Returns { page, puts, t0 }.
async function makePage(ctx, getStudio, delayMs) {
  const page = await ctx.newPage();
  const puts = []; const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const t0 = Date.now();
  await ctx.route('**/*', async (route) => {
    const req = route.request(); const url = req.url();
    if (url.indexOf('/api/documents') >= 0) {
      const u = new URL(url); const type = u.searchParams.get('type');
      if (req.method() === 'GET') {
        if (type === 'studio') {
          if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
          const d = getStudio();
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) });
        }
        // list or other types -> empty
        if (u.searchParams.get('list') === '1') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"documents":[]}' });
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      }
      if (req.method() === 'PUT') {
        let n = -1; try { const b = JSON.parse(req.postData() || '{}'); const pl = b.payload ? (typeof b.payload === 'string' ? JSON.parse(b.payload) : b.payload) : {}; n = Array.isArray(pl.accounts) ? pl.accounts.length : -1; } catch (e) {}
        if (type === 'studio') puts.push({ t: Date.now() - t0, n: n });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revision: 4 }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(CLERK_INIT);
  return { page, puts, errs, t0 };
}
const stateLen = (page) => page.evaluate(() => (window.state && Array.isArray(window.state.accounts)) ? window.state.accounts.length : -1);
const fireSpend = (page, v) => page.evaluate((val) => { var e = document.getElementById('spend-input'); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); } }, v);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ============ G-BOOT-CAPTURE ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const { page, puts, errs } = await makePage(ctx, () => studioDocWithRooms(3), 0);
    await page.goto(base + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(2200);                       // boot + LOAD_TIMEOUT(1.2s) settle
    const sLen = await stateLen(page);
    hold(sLen === 3, 'G-BOOT-CAPTURE: boot hydrated window.state.accounts from the D1 doc (got ' + sLen + ', want 3)' +
      '  [reason (a): THE REFUTED PREMISE ITSELF — a cold Studio opens EMPTY by design; the harness measured 0 and was RIGHT]');
    await fireSpend(page, '$130,000');                     // force a d1WriteStudio autosave
    await page.waitForTimeout(2200);                       // commit(350ms)+WRITE_DEBOUNCE(1.5s) settle
    const emptyEscaped = puts.some((p) => p.n === 0 || p.n === -1);
    const lastN = puts.length ? puts[puts.length - 1].n : -99;
    ok(puts.length > 0, 'G-BOOT-CAPTURE: an autosave studio PUT fired (' + puts.length + ')');
    hold(!emptyEscaped, 'G-BOOT-CAPTURE: NO empty studio PUT escaped ' + JSON.stringify(puts) +
      '  [reason (b): Ruling C is OPEN — a cold empty boot overwriting a populated D1 active doc has no agreed answer yet]');
    hold(lastN === 3, 'G-BOOT-CAPTURE: the persisted studio doc carries the 3 rooms (last PUT n=' + lastN + ')' +
      '  [reason (a): downstream of the refuted cold-boot-hydration premise]');
    if (errs.length) lines.push('  [boot-capture pageerrors] ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ============ G-BP-OPEN ============
  {
    const BP_ID = 'b1a2c3d4-0000-4000-8000-000000000009';  // letter-leading UUID -> parseInt() => NaN
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const { page, errs } = await makePage(ctx, () => EMPTY_STUDIO, 0);  // active doc EMPTY on purpose
    const bpRooms = JSON.parse(studioDocWithRooms(5).payload);
    bpRooms.blueprint_id = BP_ID;
    await page.addInitScript((args) => { try { localStorage.setItem('datum_blueprint_state_' + args.id, JSON.stringify(args.bp)); } catch (e) {} }, { id: BP_ID, bp: bpRooms });
    await page.goto(base + '/studio.html?id=' + BP_ID + '&hydrate=blueprint', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const sLen = await stateLen(page);
    ok(sLen === 5, 'G-BP-OPEN: opening ?id=<UUID>&hydrate=blueprint renders the BLUEPRINT rooms, not the empty active doc (got ' + sLen + ', want 5)');
    if (errs.length) lines.push('  [bp-open pageerrors] ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ============ G-BOOT-SLOW-WITHIN — slow but < LOAD_TIMEOUT(1.2s): rooms still land ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const { page, puts, errs } = await makePage(ctx, () => studioDocWithRooms(4), 800);  // 800ms < 1200ms
    await page.goto(base + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(2400);
    const sLen = await stateLen(page);
    await fireSpend(page, '$114,000');
    await page.waitForTimeout(2200);
    hold(sLen === 4, 'G-BOOT-SLOW-WITHIN: a slow-but-in-time D1 read hydrates the rooms (got ' + sLen + ', want 4)' +
      '  [reason (a): same refuted cold-boot-hydration premise, just with a slower read]');
    hold(!puts.some((p) => p.n === 0 || p.n === -1) && puts.some((p) => p.n === 4),
       'G-BOOT-SLOW-WITHIN: the autosave PUT carries the rooms, none empty ' + JSON.stringify(puts) +
       '  [reason (a)+(b): downstream of the refuted premise AND of the open Ruling C question]');
    if (errs.length) lines.push('  [slow-within pageerrors] ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ============ G-BOOT-SLOW-TIMEOUT — read exceeds 1.2s -> boot(null); NO empty write clobbers D1 ============
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const { page, puts, errs } = await makePage(ctx, () => studioDocWithRooms(4), 3500);  // > LOAD_TIMEOUT
    await page.goto(base + '/studio.html', { waitUntil: 'load' });
    await page.waitForTimeout(1600); await fireSpend(page, '$121,000');   // poke after the getDoc abort/fallback
    await page.waitForTimeout(1500); await fireSpend(page, '$122,000');
    await page.waitForTimeout(2200);
    const emptyEscaped = puts.some((p) => p.n === 0 || p.n === -1);
    ok(!emptyEscaped, 'G-BOOT-SLOW-TIMEOUT: read timed out -> NO empty studio PUT clobbered the unread D1 doc ' + JSON.stringify(puts));
    if (errs.length) lines.push('  [slow-timeout pageerrors] ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  await browser.close(); server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('-------------------------------------');
  lines.push('D1 SOAK-FIX GATE (#284) — write-capture + blueprint-open');
  /* PRINTED EVEN AT ZERO. A hold that stops being visible is a hold nobody revisits, and these are
     assertions somebody decided not to trust — the count should be uncomfortable to look at. Same
     reasoning the runner applies to its QUARANT line. */
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail / ' + held + ' HELD, not counted)');
  if (held) lines.push('  HELD legs are printed above with their reason: (a) refuted cold-boot-hydration' +
                       ' premise, (b) awaiting the open Ruling C product decision. Neither is a code defect.');
  console.log('[' + (process.argv[2] || 'RUN') + '] D1 BOOT-CAPTURE — ' + overall + '\n' + lines.join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
