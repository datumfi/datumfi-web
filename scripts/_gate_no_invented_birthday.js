/* @gate-pool: browser */
/* ══ FINDING 50 — THE PRODUCT MAY NOT INVENT A DATE THE USER DID NOT GIVE ═══════════════════════
 *
 * ⛔⛔⛔ WHAT SHIPPED. On a COLD, EMPTY profile, touching a Sketch control wrote a BIRTHDAY.
 * MEASURED before the fix, three paths, two different fabricated months, two fields:
 *   drag Current-Age slider        -> pri-dob "06 / 1979"  AND  target-ret "06 / 2044"   (JUNE)
 *   open Current-Age box + commit  -> pri-dob "01 / 1986"                                (JANUARY)
 *   open Retirement box  + commit  -> target-ret "01 / 2051"                             (JANUARY)
 * The second and third require NO TYPING AT ALL: open a box, press Enter, and the profile holds a
 * birthday nobody supplied. It then feeds `current_age` to the engine.
 * 🔑 L47 — SOURCED-OR-BLANK — WAS ONLY EVER ENFORCED ON THE COPY SURFACE. It binds the DATA surface
 *    identically. An unauthored sentence has stopped commits here for months while the code was
 *    inventing dates of birth.
 * ⚠️ A FABRICATED MONTH IS INVISIBLE: plausible, precise, and sitting in a field that looks
 *    answered. THE USER CANNOT CATCH WHAT DOES NOT LOOK WRONG — and it is silently wrong by up to
 *    ±11 months on the input the whole model hangs from.
 *
 * ══ ⛔⛔ WHY THIS GATE ASSERTS A PROPERTY AND NEVER A LITERAL ═════════════════════════════════════
 * The obvious leg — "the `: 6` default is gone" — WOULD HAVE GONE GREEN WHILE JANUARY WAS STILL
 * BEING INVENTED, because the two paths fabricate different months from different code.
 * 🔑 A GATE THAT ASSERTS THE ABSENCE OF A PARTICULAR VALUE PROVES ONLY THAT THAT VALUE IS ABSENT.
 *    A GATE THAT ASSERTS THE ABSENCE OF A BEHAVIOUR PROVES THE PROPERTY WE ACTUALLY WANT.
 * So L2 exercises EVERY path that can reach a Profile date field and requires the fields to remain
 * EMPTY — whatever month a future defect might choose.
 *
 * ══ ⭐ THE RECIPE THIS GATE DEPENDS ON (§82.800) ═════════════════════════════════════════════════
 * The Studio has SEVEN collapsible sections; the Sketch controls live in #sec-sketch, COLLAPSED BY
 * DEFAULT with 0x0 geometry. Three sessions of automation concluded these controls "cannot be
 * driven" — the harness was failing to open a drawer, and that limit was reported as a property of
 * the product. L1 asserts the drawer is open and the controls have real geometry BEFORE anything
 * else runs, so this gate can never repeat that mistake silently.
 * 🔑 A REPEATED FAILURE TO OBSERVE IS NOT A MEASUREMENT OF ABSENCE.
 *
 * ⛔ AND IT DRIVES THE REAL UI — click, keystrokes, Enter. It never calls _commitAgeDate or
 *    syncFromSketchAges directly. A GATE THAT INVOKES A HANDLER PROVES THE HANDLER, NOT THE FEATURE.
 *
 * Usage: node scripts/_gate_no_invented_birthday.js [--june|--january]
 *   --june     restores the 06 month default in syncFromSketchAges -> REDS L2a ONLY
 *   --january  restores the unconditional write in _commitAgeDate  -> REDS L2b ONLY
 * TWO controls, DISJOINT red sets — one per fabricating path, which is the whole point: a single
 * control could not distinguish them, and a single leg would have hidden one behind the other.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8571; const BASE = 'http://127.0.0.1:' + PORT;

const JUNE = process.argv.includes('--june');
const JAN  = process.argv.includes('--january');

const A_JUNE = "if (sA && dobEl && _ageDateRe.test(String(dobEl.value || ''))) {\n        var ca = parseInt(sA.value, 10) || 40;\n        var dMo = parseInt(String(dobEl.value).match(_ageDateRe)[1], 10);";
const B_JUNE = "if (sA && dobEl) {\n        var ca = parseInt(sA.value, 10) || 40;\n        var dm = String(dobEl.value || '').match(_ageDateRe);\n        var dMo = dm ? parseInt(dm[1], 10) : 6;";
const A_JAN  = "if (d && (!_echo || _ageDateRe.test(String(d.value || '')))) d.value = _pad2(pd.mo) + ' / ' + pd.yr; return true; }";
const B_JAN  = "if (d) d.value = _pad2(pd.mo) + ' / ' + pd.yr; return true; }";

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

function mutate(src, a, b, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + label + ': expected exactly 1, found ' + n + ' — re-ground it.'); process.exit(1); }
  return src.replace(a, b);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (/studio\.html$/.test(p) && (JUNE || JAN)) {
    let s = body.toString('utf8');
    if (JUNE) s = mutate(s, A_JUNE, B_JUNE, 'A_JUNE');
    if (JAN)  s = mutate(s, A_JAN,  B_JAN,  'A_JAN');
    body = Buffer.from(s, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const mode = JUNE ? '   [MUTATED --june]' : JAN ? '   [MUTATED --january]' : '';
  console.log('[RUN] NO INVENTED BIRTHDAY' + mode);

  /* Each arm is a FRESH context: a fabricated date written by one path would otherwise satisfy the
     "already has a date" branch for the next, and the second path would look innocent. */
  async function fresh() {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
    await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
    await page.waitForSelector('.sl-phase', { state: 'visible', timeout: 30000 });
    await page.click('.sl-phase');
    await page.waitForSelector('#pri-dob', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);
    return { ctx, page };
  }
  /* The drawer open is SETUP, not the subject — a real click event on the header that carries the
     toggle. The CONTROLS under test are driven with real mouse clicks and real keystrokes. */
  async function openSketch(page) {
    await page.evaluate(() => { const s = document.getElementById('sec-sketch');
      const h = s.previousElementSibling; (h.querySelector('button,[role="button"],.section-header') || h).click(); });
    await page.waitForFunction(() => { const e = document.getElementById('val-age');
      if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, { timeout: 20000 });
  }
  const dates = (page) => page.evaluate(() => ({
    dob: document.getElementById('pri-dob').value,
    ret: document.getElementById('target-ret').value
  }));

  /* ── L1 · THE PRECONDITION, ASSERTED BEFORE ANY CLAIM RESTS ON IT ────────────────────────────*/
  { const { ctx, page } = await fresh();
    const cold = await dates(page);
    await openSketch(page);
    const geo = await page.evaluate(() => ['val-age','val-activation','val-plan-through']
      .map((i) => { const e = document.getElementById(i); const r = e ? e.getBoundingClientRect() : null;
        return { id: i, w: r ? Math.round(r.width) : -1, h: r ? Math.round(r.height) : -1 }; }));
    const allReal = geo.every((g) => g.w > 0 && g.h > 0);
    ok(cold.dob === '' && cold.ret === '',
      'L1a · THE PROFILE STARTS EMPTY, so a date appearing later can only have been invented '
      + '[observed dob "' + cold.dob + '", ret "' + cold.ret + '"]');
    ok(allReal,
      'L1b · THE SKETCH DRAWER IS OPEN and all three controls have real geometry [observed '
      + JSON.stringify(geo) + '] — #sec-sketch is COLLAPSED by default; without this the legs below '
      + 'would drive 0x0 elements and pass over a product they never touched');
    await ctx.close(); }

  /* ── L2a · THE SLIDER PATHS INVENT NOTHING ───────────────────────────────────────────────────*/
  { const { ctx, page } = await fresh(); await openSketch(page);
    await page.evaluate(() => { for (const id of ['slider-age','slider-activation']) {
      const s = document.getElementById(id); s.value = String(parseInt(s.value, 10) + 3);
      s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await page.waitForTimeout(900);
    const d = await dates(page);
    ok(d.dob === '' && d.ret === '',
      'L2a · DRAGGING THE AGE SLIDERS WRITES NO DATE [observed dob "' + d.dob + '", ret "' + d.ret
      + '"] — this path used to invent JUNE into BOTH fields from a single drag');
    await ctx.close(); }

  /* ── L2b · THE TOGGLE-BOX PATHS INVENT NOTHING ───────────────────────────────────────────────
     Opened and committed with NOTHING TYPED — the box pre-fills from _dateForField, and committing
     that derived text used to write it to the Profile as though the user had answered. */
  { const { ctx, page } = await fresh(); await openSketch(page);
    for (const id of ['val-age', 'val-activation']) {
      await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'center' }), id);
      await page.click('#' + id, { timeout: 15000 });
      await page.waitForTimeout(350);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
    }
    const d = await dates(page);
    ok(d.dob === '' && d.ret === '',
      'L2b · OPENING AND COMMITTING A SKETCH BOX WITHOUT TYPING WRITES NO DATE [observed dob "'
      + d.dob + '", ret "' + d.ret + '"] — this path used to invent JANUARY, and it required no '
      + 'keystrokes at all');
    await ctx.close(); }

  /* ── L3 · THE HONEST HALF SURVIVES ───────────────────────────────────────────────────────────
     ⛔ WITHOUT THIS LEG THE FIX COULD BE "NEVER WRITE ANYTHING", WHICH WOULD PASS L2 COMPLETELY AND
     BREAK THE REAL FEATURE. The month the user actually gave must still be preserved while the
     year follows the slider — that was the correct half of this code and it is not the defect. */
  { const { ctx, page } = await fresh();
    await page.click('#pri-dob'); await page.keyboard.press('Control+A');
    await page.type('#pri-dob', '03/1985', { delay: 20 }); await page.keyboard.press('Tab');
    await page.waitForTimeout(800);
    const before = await dates(page);
    await page.evaluate(() => { const s = document.getElementById('slider-age'); s.value = '47';
      s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(900);
    const after = await dates(page);
    const mo = (after.dob.match(/^(\d{2})/) || [])[1];
    ok(before.dob === '03 / 1985' && mo === '03' && after.dob !== before.dob,
      'L3 · A REAL TYPED MONTH IS PRESERVED WHILE THE YEAR FOLLOWS THE SLIDER [observed "'
      + before.dob + '" -> "' + after.dob + '", month ' + mo + ' (want 03)] — the fix must stop the '
      + 'INVENTION without stopping the preservation');
    await ctx.close(); }

  for (const l of lines) console.log(l);
  console.log('SCORE ' + pass + '/' + (pass + fail) + (fail ? ' RED' : ' GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
