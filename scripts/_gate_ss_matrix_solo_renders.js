/* _gate_ss_matrix_solo_renders.js — THE SS TIMING MATRIX, FOR A HOUSEHOLD OF ONE
 * ---------------------------------------------------------------------------------------------
 * ⛔⛔ WRITTEN BECAUSE THE CAPTAIN FOUND THIS IN A BROWSER, NOT BECAUSE A GATE DID. On 2026-09-18
 * he opened the SS map on a SOLO household and got NINE EMPTY CELLS. The engine was right and had
 * been right all along: a solo run is answered on ONE axis, `case_key = 'age_62'`, because
 * `age_62_x_None` would name a pairing that does not exist. The RENDERER built `p + '_x_' + s`
 * unconditionally, so all nine lookups missed and all nine cells drew an em-dash.
 *   ⛔ IT WAS LIVE. The grid shipped in da43fa6, long since on origin/main, so every solo
 *      household that ever opened this surface saw the same nine dashes.
 *   ⛔ AND IT IS CLAUSE 1 IN ONE SCREEN: joint worked, solo did not. "Fully for 1 person, 2
 *      people, or 2 who become 1" is the standing goal, and this surface honoured exactly one of
 *      the three.
 *   ⭐ THE SOLO COPY WAS ALREADY AUTHORED — the tradeoff chain's final `else` carries three
 *      written solo sentences that had never once rendered. Nothing was missing but the shape.
 *
 * ── WHY THIS GATE EXISTS AT ALL ───────────────────────────────────────────────────────────────
 * 🔑 THE DEFECT WAS NEVER SUBTLE; NOTHING WAS LOOKING. This repo has ~170 gates and not one of
 *    them drove a SOLO household through this surface. A defect that is invisible to every
 *    instrument is found by the only remaining instrument, which is the Captain's afternoon.
 *    THE POPULATION A SUITE NEVER VISITS IS NOT COVERED BY ITS GREEN.
 *
 * ── WHY REAL CAPTURED PAYLOADS, NOT HAND-WRITTEN ONES ─────────────────────────────────────────
 * ⛔ THE FIXTURES ARE THE LIVE ENGINE'S OWN ANSWERS, captured from datumfi.com and committed
 *    (scripts/fixtures/ss_matrix_{solo,joint}.json). THE WHOLE DEFECT WAS A DISAGREEMENT ABOUT
 *    KEY SHAPE BETWEEN TWO SIDES, so a fixture I typed by hand would encode MY belief about what
 *    the engine emits — which is precisely the belief that was wrong. A hand-written fixture
 *    would have passed against the broken renderer.
 * ⚠️ THEY ARE A SNAPSHOT AND WILL AGE. If the engine changes its case-key shape these go red,
 *    and that is the point: this gate should fail the day the two sides disagree again, from
 *    EITHER direction. Re-capture deliberately, never to make it green.
 *
 * ── WHAT THIS PROVES AND WHAT IT DOES NOT ─────────────────────────────────────────────────────
 * ⚠️ IT DRIVES THE RENDERER DIRECTLY (`window.renderMatrixGrid`), so it proves the RENDERER, not
 *    the fetch-and-poll chain that reaches it — A DIRECT CALL PROVES THE HANDLER, NOT THE
 *    FEATURE. That chain has four callers and its own coverage; the defect here lived entirely
 *    in the DOM the renderer writes, and this drives that with the engine's real bytes.
 *
 * LEGS
 *   L0  · INSTRUMENT — the grid element and the renderer both exist (a gate over a missing seam
 *         is green by vacancy)
 *   L1  · SOLO renders THREE cells and not nine
 *   L2  · SOLO draws ZERO empty cells — the actual symptom, asserted by its own name
 *   L3  · every rendered key IS a key the engine sent (no invented cells)
 *   L4  · the spousal axis label is ABSENT for a household with no spouse
 *   L5  · the authored solo tradeoff copy actually renders (the `else` branch is reached)
 *   L6  · PAIRED — JOINT still renders nine filled cells and KEEPS the spousal label
 *   L7  · PAIRED — a household of one and a household of two do not render the same thing
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8537; const BASE = 'http://127.0.0.1:' + PORT;

/* ⛔ THE AMPUTATION. `--two-axis` restores the pre-fix renderer: the key becomes unconditionally
   two-dimensional again. It removes the CAPABILITY (solo keying), not one route to it. */
const TWO_AXIS = process.argv.includes('--two-axis');
const A_KEY = "          var key = isSolo ? p : (p + '_x_' + s);";
const B_KEY = "          var key = p + '_x_' + s;";
const A_COLS = "        (isSolo ? [null] : strats).forEach(function(s) {";
const B_COLS = "        strats.forEach(function(s) {";

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

function mutate(src, anchor, repl, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + label + ': expected exactly 1, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(anchor, repl);
}

const FIX_DIR = path.join(ROOT, 'scripts', 'fixtures');
const SOLO = JSON.parse(fs.readFileSync(path.join(FIX_DIR, 'ss_matrix_solo.json'), 'utf8'));
const JOINT = JSON.parse(fs.readFileSync(path.join(FIX_DIR, 'ss_matrix_joint.json'), 'utf8'));

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (/studio\.html$/.test(p) && TWO_AXIS) {
    let s = body.toString('utf8');
    s = mutate(s, A_KEY, B_KEY, 'A_KEY');
    s = mutate(s, A_COLS, B_COLS, 'A_COLS');
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  console.log('[RUN] THE SS TIMING MATRIX, FOR A HOUSEHOLD OF ONE' + (TWO_AXIS ? '   [MUTATED --two-axis]' : ''));

  const seam = await page.evaluate(() => ({
    grid: !!document.getElementById('ss-matrix-grid'),
    fn: typeof window.renderMatrixGrid === 'function'
  }));
  ok(seam.grid && seam.fn,
    'L0 · INSTRUMENT: #ss-matrix-grid exists and renderMatrixGrid is callable [observed '
    + JSON.stringify(seam) + '] — every leg below is vacuously green without both');
  if (!seam.grid || !seam.fn) {
    for (const l of lines) console.log(l);
    console.log('SCORE ' + pass + '/' + (pass + fail) + ' RED');
    await browser.close(); server.close(); process.exit(2);
  }

  /* read() returns what the USER would see, not what the function returned. */
  const draw = (result) => page.evaluate((r) => {
    window.renderMatrixGrid(r);
    const g = document.getElementById('ss-matrix-grid');
    const cells = Array.from(g.querySelectorAll('.ss-matrix-cell'));
    return {
      cells: cells.length,
      empty: cells.filter((c) => c.classList.contains('ss-cell-empty')).length,
      keys: cells.map((c) => c.getAttribute('data-case-key')).filter(Boolean),
      dashes: (g.textContent.match(/—/g) || []).length,
      spousalLabel: /Secondary \/ Spousal Claims At/.test(g.textContent),
      soloClass: !!g.querySelector('.ss-matrix-wrap.ss-solo'),
      text: g.textContent,
      /* ⛔ THE ENGINE'S KEYS, PUT THROUGH THE CLIENT'S OWN TRANSLATOR BEFORE COMPARISON.
         `_ssNormalizeResult` rewrites 'age_62' to 'early_62' on read — a documented, deliberate
         alias table — so the rendered keys are in the CLIENT'S spelling and the fixture holds the
         ENGINE'S. My first draft of this leg compared the two directly and went red on a product
         that was correct: it reported all three keys "INVENTED" when all three were right.
         🔑 A LEG THAT IGNORES A TRANSLATION THE PRODUCT DOCUMENTS IS MEASURING THE TRANSLATION,
            NOT THE DEFECT. Routed through `window._ssCanonKey`, the SAME function the renderer
            uses, so the comparison cannot drift from the thing it is comparing. It still catches
            an invented cell: a key the engine never sent survives no translation into one it did. */
      engineKeys: (r.cases || []).map(function (c) { return window._ssCanonKey(c.case_key); })
    };
  }, result);

  const s = await draw(SOLO);
  const soloKeys = s.engineKeys;

  ok(s.cells === 3,
    'L1 · SOLO RENDERS THREE CELLS, NOT NINE [observed ' + s.cells + ' cells; engine sent '
    + soloKeys.length + ' cases] — a 3x3 grid for one person asks about a spouse who does not exist');

  ok(s.empty === 0,
    'L2 · SOLO DRAWS ZERO EMPTY CELLS [observed ' + s.empty + ' empty of ' + s.cells
    + '] — THIS IS THE SYMPTOM THE CAPTAIN SAW: nine em-dashes over nine answers the engine had computed');

  const invented = s.keys.filter((k) => soloKeys.indexOf(k) === -1);
  ok(s.keys.length > 0 && invented.length === 0,
    'L3 · EVERY RENDERED KEY IS A KEY THE ENGINE SENT [rendered ' + JSON.stringify(s.keys)
    + '; engine ' + JSON.stringify(soloKeys) + (invented.length ? '; INVENTED ' + JSON.stringify(invented) : '')
    + '] — filling a cell the engine never computed is the worse failure of the two');

  ok(s.spousalLabel === false,
    'L4 · NO SPOUSAL AXIS LABEL FOR A HOUSEHOLD OF ONE [observed spousalLabel=' + s.spousalLabel
    + ', soloClass=' + s.soloClass + '] — a collapsed dimension still asks the question');

  ok(/permanently lower monthly benefit for life|bridge years require more portfolio support|balances bridge length/.test(s.text),
    'L5 · THE AUTHORED SOLO COPY ACTUALLY RENDERS [observed ' + (/permanently lower monthly benefit for life/.test(s.text) ? 'present' : 'ABSENT')
    + '] — these three sentences were written long ago and had never once reached a screen');

  const j = await draw(JOINT);
  const jointKeys = j.engineKeys;

  ok(j.cells === 9 && j.empty === 0 && j.spousalLabel === true,
    'L6 · PAIRED — JOINT IS UNBROKEN [observed ' + j.cells + ' cells, ' + j.empty
    + ' empty, spousalLabel=' + j.spousalLabel + '; engine sent ' + jointKeys.length
    + ' cases] — "render three cells always" would satisfy every leg above');

  ok(s.cells !== j.cells && s.spousalLabel !== j.spousalLabel,
    'L7 · PAIRED — ONE PERSON AND TWO PEOPLE DO NOT RENDER THE SAME THING [solo ' + s.cells
    + ' cells/label=' + s.spousalLabel + ' vs joint ' + j.cells + ' cells/label=' + j.spousalLabel
    + '] — the shapes must actually differ, or both legs are passing on one behaviour');

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
