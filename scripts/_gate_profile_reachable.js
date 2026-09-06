/* ⛔⛔ THE REACHABILITY GATE — RENDERED IS NOT REACHABLE (§82.1827).
 *
 * WHY THIS EXISTS. Batch 1a came back GREEN 268 while shipping two live defects, and neither was
 * visible to a single gate in the population:
 *   1. `tabindex` 11–17 survived a DOM reorder and described a layout that no longer existed. A
 *      keyboard user tabbed Date of Birth -> Retirement Location -> Salary -> ... Nothing failed.
 *      THE SUITE WAS SILENT, AND SILENCE READ AS CONSENT.
 *   2. The last-survivor disclosure was moved to a `:hover` reveal, which has no keyboard audience
 *      at all. The words survived the move; the audience did not.
 *
 * 🔑 THE BLIND SPOT IS STRUCTURAL, NOT AN OVERSIGHT. Every other gate here asks what the page
 *    CONTAINS — elements present, bytes identical, geometry correct, zero page errors. Those are
 *    all sighted-mouse-user truths. TAB ORDER AND FOCUS REACHABILITY ARE PROPERTIES OF THE
 *    INTERACTION, AND AN INTERACTION CANNOT BE READ OFF A RENDERED PAGE.
 *
 * ⭐ IT DRIVES REAL FOCUS. It presses Tab and records document.activeElement. It does NOT read
 *    `tabindex` out of the HTML and reason about it — reasoning about tabindex is exactly what
 *    produced the defect. The browser's own focus engine is the only authority on focus order.
 *
 * ── LEGS ─────────────────────────────────────────────────────────────────────────────────────
 *   L1 EXISTENCE  the profile controls are present and focusable at all (else L2/L3 are vacuous)
 *   L2 ORDER      keyboard order matches VISUAL order, derived from getBoundingClientRect —
 *                 never from a list in this file, so a new field joins the claim by existing
 *   L3 DUAL       in joint mode the co-architect fields interleave with the primary's, rather
 *                 than being stranded after every positive-tabindex element
 *   L4 REACH      the last-survivor disclosure opens on KEYBOARD focus, not only on hover
 *   L5 HONEST     ...and is genuinely hidden before that, so L4 cannot pass over an always-on tip
 *
 * ── CONTROLS ─────────────────────────────────────────────────────────────────────────────────
 *   --retabindex  restores the pre-fix positive tabindex on the served page. MUST red L2 (and L3)
 *                 and leave L1/L4/L5 green.
 *   --hoveronly   strips `:focus-within` from the served CSS. MUST red L4 only.
 * ⛔ IF A CONTROL DOES NOT BITE, THIS GATE PRINTS **NO VERDICT** AND EXITS 2.
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PW_PORT || 8671;
const RETAB = process.argv.includes('--retabindex');
const HOVERONLY = process.argv.includes('--hoveronly');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv' };

/* The pre-fix values, restored verbatim onto the served bytes. */
const RETAB_MAP = [['pri-dob', 11], ['pri-location', 12], ['pri-salary', 13],
                   ['eff-tax-rate', 14], ['filing-status', 15], ['target-ret', 16], ['plan-end-age', 17]];
let SERVE_HTML = null, SERVE_CSS = null;

if (RETAB) {
  SERVE_HTML = fs.readFileSync(path.join(ROOT, 'studio.html'), 'utf8');
  for (const [id, ti] of RETAB_MAP) {
    const anchor = `id="${id}"`;
    const n = SERVE_HTML.split(anchor).length - 1;
    if (n !== 1) { console.log(`ABORT — --retabindex anchor ${id} found ${n}x, expected 1.`); process.exit(2); }
    SERVE_HTML = SERVE_HTML.replace(anchor, `${anchor} tabindex="${ti}"`);
  }
}
if (HOVERONLY) {
  const f = path.join(ROOT, 'styles', 'profile.css');
  SERVE_CSS = fs.readFileSync(f, 'utf8');
  const A = '[data-profile-port] .architect-complete-wrap:focus-within .architect-lastsurvivor-tip{opacity:1;}';
  const n = SERVE_CSS.split(A).length - 1;
  if (n !== 1) { console.log(`ABORT — --hoveronly anchor found ${n}x, expected 1.`); process.exit(2); }
  SERVE_CSS = SERVE_CSS.replace(A, '/* focus-within removed by --hoveronly */');
}

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (SERVE_HTML && p === '/studio.html') { s.writeHead(200, { 'content-type': MIME['.html'] }); return s.end(SERVE_HTML); }
  if (SERVE_CSS && p === '/styles/profile.css') { s.writeHead(200, { 'content-type': MIME['.css'] }); return s.end(SERVE_CSS); }
  fs.readFile(path.join(ROOT, path.normalize(p).replace(/^[\\/]+/, '')), (e, b) => {
    if (e) { s.writeHead(404).end(); return; }
    s.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' }); s.end(b); });
});

let fails = 0; const out = [];
const check = (l, c, d) => { const ok = !!c; if (!ok) fails++; out.push((ok ? 'PASS  ' : 'FAIL  ') + l + (d !== undefined ? '   [' + d + ']' : '')); };

/* Walk real focus with real Tab presses, collecting the ids of profile controls in the order the
   browser actually visits them. */
/* ⚠️ START FROM NOTHING FOCUSED, NEVER FROM THE FIRST CONTROL — AND THIS GATE'S FIRST RUN PROVED
   WHY. It began by focusing #primary-name and then pressing Tab, so the very first press moved
   AWAY from that control and it was only recorded on the wrap-around: the gate reported
   `pri-dob > ... > pri-location > primary-name` and red L2 and L3 over a product that was correct.
   🔑 A HARNESS THAT SEEDS THE STATE IT IS MEASURING REPORTS ITS OWN SEED. Blur instead, and let
      the browser start its traversal where it really starts. The extra iterations are the cost of
      walking in from the top of the document past the sliders' tabindex 1-5. */
async function tabOrder(P, ids) {
  await P.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  const seen = [];
  for (let i = 0; i < 160 && seen.length < ids.length; i++) {
    await P.keyboard.press('Tab');
    const id = await P.evaluate(() => (document.activeElement && document.activeElement.id) || '');
    if (ids.includes(id) && !seen.includes(id)) seen.push(id);
  }
  return seen;
}

const enter = async (P) => {
  await P.waitForTimeout(1700);
  try { if (await P.locator('#studioCloseIntro').isVisible({ timeout: 1200 })) await P.click('#studioCloseIntro'); } catch (e) {}
  await P.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  await P.evaluate(() => window._studioEnterRoom('data'));
  await P.waitForTimeout(800);
};

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 1250 } });
  await c.addInitScript("window.Clerk={load:()=>Promise.resolve(),user:{unsafeMetadata:{}},addListener:()=>{}};");
  await c.route('**/*', r => { const u = r.request().url();
    if (/\/api\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/127\.0\.0\.1/.test(u) && /clerk|posthog|sentry/i.test(u)) return r.abort();
    return r.continue(); });
  const P = await c.newPage();
  await P.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await enter(P);

  /* ── the population is DERIVED: every focusable control inside the profile grid, in VISUAL
     order (top row first, then left-to-right). Never a list typed here — a new profile field
     joins this gate's claim by existing. ────────────────────────────────────────────────────── */
  const visual = await P.evaluate(() => {
    const g = document.querySelector('[data-architect-grid]');
    if (!g) return null;
    return Array.from(g.querySelectorAll('input, select, textarea, button'))
      .filter((e) => e.id && !e.disabled && e.offsetParent !== null)
      .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, t: Math.round(r.top), l: Math.round(r.left) }; })
      .sort((a, b) => (Math.abs(a.t - b.t) > 6 ? a.t - b.t : a.l - b.l))
      .map((e) => e.id);
  });
  check('L1 EXISTENCE: the profile grid exposes focusable controls to judge',
    Array.isArray(visual) && visual.length >= 5, 'found ' + (visual ? visual.length : 'NO GRID'));

  const soloOrder = await tabOrder(P, visual);
  check('L1 EXISTENCE: every one of them is actually reachable by Tab (else L2 sweeps a subset)',
    soloOrder.length === visual.length,
    'reached ' + soloOrder.length + ' of ' + visual.length
    + (soloOrder.length !== visual.length ? ' — NEVER FOCUSED: ' + visual.filter((i) => !soloOrder.includes(i)).join(', ') : ''));
  check('L2 ORDER: keyboard order matches visual order [BITE retabindex]',
    JSON.stringify(soloOrder) === JSON.stringify(visual),
    'visual=' + visual.join(' > ') + '   keyboard=' + soloOrder.join(' > '));

  /* ── L3 · joint mode, where the co-architect fields carry no tabindex of their own ────────── */
  const btn = P.locator('button.household-mode-button[data-co-architect-toggle]');
  if (await btn.count() === 1) { await btn.click(); await P.waitForTimeout(700); }
  const visualJoint = await P.evaluate(() => {
    const g = document.querySelector('[data-architect-grid]');
    return Array.from(g.querySelectorAll('input, select, textarea, button'))
      .filter((e) => e.id && !e.disabled && e.offsetParent !== null)
      .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, t: Math.round(r.top), l: Math.round(r.left) }; })
      .sort((a, b) => (Math.abs(a.t - b.t) > 6 ? a.t - b.t : a.l - b.l))
      .map((e) => e.id);
  });
  check('L3 EXISTENCE: joint mode actually revealed the co-architect controls',
    visualJoint.length > visual.length, visual.length + ' solo -> ' + visualJoint.length + ' joint');
  const jointOrder = await tabOrder(P, visualJoint);
  check('L3 DUAL: the co-architect fields interleave in visual order rather than being stranded '
    + 'after every positive-tabindex element [BITE retabindex]',
    JSON.stringify(jointOrder) === JSON.stringify(visualJoint),
    'visual=' + visualJoint.join(' > ') + '   keyboard=' + jointOrder.join(' > '));

  /* ── L4/L5 · the disclosure must open on KEYBOARD focus, and be shut before it ─────────────── */
  const tipOpacity = () => P.evaluate(() => {
    const t = document.querySelector('.architect-lastsurvivor-tip');
    return t ? { o: parseFloat(getComputedStyle(t).opacity), d: getComputedStyle(t).display } : null;
  });
  await P.evaluate(() => { const b = document.querySelector('#primary-name'); b && b.focus(); });
  await P.waitForTimeout(300);
  const before = await tipOpacity();
  check('L5 HONEST HALF: the disclosure is CLOSED before anything focuses it (else L4 passes over '
    + 'a tip that is simply always on)',
    before && before.o === 0 && before.d !== 'none', JSON.stringify(before));

  await P.evaluate(() => { const b = document.querySelector('.architect-complete-wrap button'); b && b.focus(); });
  await P.waitForTimeout(400);
  const after = await tipOpacity();
  check('L4 REACH: focusing Complete Profile OPENS the disclosure — it is not pointer-only '
    + '[BITE hoveronly]',
    after && after.o > 0.9, JSON.stringify(after));

  await b.close(); srv.close();

  const BITE = RETAB ? ['L2 ORDER', 'L3 DUAL'] : (HOVERONLY ? ['L4 REACH'] : null);
  if (BITE) {
    const bit = BITE.filter((t) => out.some((l) => l.startsWith('FAIL') && l.indexOf(t) !== -1));
    const existenceHeld = out.filter((l) => l.indexOf('EXISTENCE') !== -1 || l.indexOf('HONEST HALF') !== -1)
                             .every((l) => l.startsWith('PASS'));
    const others = HOVERONLY ? out.filter((l) => l.indexOf('L2 ORDER') !== -1 || l.indexOf('L3 DUAL') !== -1).every((l) => l.startsWith('PASS')) : true;
    console.log(out.join('\n'));
    console.log('\nMODE: ' + (RETAB ? '--retabindex' : '--hoveronly'));
    if (bit.length !== BITE.length || !existenceHeld || !others) {
      console.log('CONTROL DID NOT LAND — bit [' + bit.join(', ') + '] of [' + BITE.join(', ') + ']'
        + '; existence/honest held: ' + existenceHeld + '; disjoint: ' + others);
      console.log('NO VERDICT — a control that does not bite cannot certify anything.');
      process.exit(2);
    }
    console.log('CONTROL LANDED: aimed legs red, existence and unrelated legs still green.');
    console.log('OVERALL: RED (expected under control)   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
    process.exit(0);
  }

  console.log(out.join('\n'));
  console.log('\nMODE: clean');
  console.log('OVERALL: ' + (fails ? 'RED' : 'GREEN') + '   (' + (out.length - fails) + ' pass / ' + fails + ' fail)');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE FAULT', e.message); try { srv.close(); } catch (x) {} process.exit(2); });
