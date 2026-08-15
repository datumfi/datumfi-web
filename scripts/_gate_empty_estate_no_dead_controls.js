'use strict';
/* _gate_empty_estate_no_dead_controls.js — STANDING GATE
 *
 * THE CLAIM: an estate with no rooms shows no square-footage readout and no lens buttons.
 *
 * ⛔ THE DEFECT. A cold Studio rendered `ESTATE SQUARE FOOTAGE — $0` above four live lens buttons
 * (THERMODYNAMIC SHOCK · THERMAL IMAGING · OUTFLOW ROUTING · DATUM ELEVATION) over an empty canvas.
 * The $0 is not a zero the user entered; it is the sum of nothing, presented as a measurement. And
 * the four lenses re-colour a canvas with nothing on it — they fire, they toggle, they change
 * nothing a user can see.
 *   🔑 AN EMPTY CANVAS WITH NOTHING ON IT IS AN INVITATION; AN EMPTY CANVAS RINGED BY DEAD CONTROLS
 *      IS A BROKEN TOOL. The canvas was never the problem — the furniture around it was.
 *   🔑 A $0 TOTAL IS THE ZERO-STATE ROUNDING TRAP WEARING A DIFFERENT HAT: a derived figure that is
 *      indistinguishable from a real answer of zero. The fix is not to format it better. It is to
 *      not make a claim before there is anything to claim about.
 *
 * ── WHY THIS GATE HAS AN E4 ─────────────────────────────────────────────────────────────────────
 * The rule is written HIDE-WHEN-EMPTY (`.estate-empty` hides) rather than SHOW-WHEN-FILLED, and
 * that direction is the whole safety argument, not a style choice. The markup ships the panels
 * VISIBLE; only refreshEstateGate() adds the class. So the two spellings fail in opposite
 * directions when the signal goes missing:
 *     hide-when-empty  · signal missing -> panels SHOW  -> a cold Studio looks like it did last week
 *     show-when-filled · signal missing -> panels HIDE  -> a POPULATED estate renders with no square
 *                                                          footage and no lenses
 * The first is last week's cosmetic defect. The second hides a real user's real number, and it is
 * the more dangerous failure by a wide margin. Both spellings pass E0-E3 identically, so only a leg
 * that removes the signal can tell them apart.
 *   ⭐ E1-E3 PROVE THE FEATURE. E4 PROVES THE FAILURE DIRECTION — and only E4 would catch a later
 *     "simplification" of the CSS to a default-hidden rule.
 *   ⚠️ NOT A SPLIT-DEPLOY LEG, AND AN EARLIER DRAFT OF THIS COMMENT SAID IT WAS. The CSS and
 *      refreshEstateGate() both live in studio.html, so they can never land out of step with each
 *      other the way an HTML/JS pair can. The risk this leg covers is a future EDIT, not a stale
 *      cache. 🔑 A rationale that names the wrong mechanism will send the next reader to the wrong
 *      file — a wrong reason is not a harmless decoration on a correct assertion.
 *
 * LEGS
 *   E0 · THE FIXTURE REACHES THE STATE — a cold Studio really does have zero rooms. Without this,
 *        E1/E2 could pass on a page that failed to boot at all.
 *   E1 · zero rooms -> the square-footage readout is not rendered
 *   E2 · zero rooms -> none of the four lens buttons are rendered
 *   E3 · PAIRED PRESENCE — one room and BOTH come back. "Hide always" satisfies E1 and E2 perfectly.
 *   E4 · NEGATIVE DIRECTION — with the class writer amputated the panels SHOW. The rule must degrade
 *        to shipped behaviour, never to a blank readout over a real estate.
 *
 * @gate-pool: browser
 *
 * Run: node scripts/_gate_empty_estate_no_dead_controls.js        (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const PORT = 8221;
const BASE = 'http://127.0.0.1:' + PORT;

/* The four lens buttons, by id. Named rather than counted: a count leg passes when a button is
   swapped for an unrelated one, and "four things are hidden" is not the claim — THESE four are. */
const LENS_IDS = ['btn-shock', 'btn-thermal', 'btn-routing', 'btn-datum'];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

/* getClientRects() alone counts visibility:hidden and opacity:0 as visible — measured, and it has
   produced a false green in this repo before. A control is present only if it is laid out AND
   visible AND not transparent through an ancestor. */
const READ = `(() => {
  const vis = (el) => {
    if (!el || el.getClientRects().length === 0) return false;
    if (getComputedStyle(el).visibility === 'hidden') return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (parseFloat(getComputedStyle(n).opacity) === 0) return false;
    }
    return true;
  };
  const ids = ${JSON.stringify(LENS_IDS)};
  const layout = document.getElementById('studio-layout');
  return {
    rooms: (window.state && Array.isArray(window.state.accounts)) ? window.state.accounts.length : -1,
    hud: vis(document.querySelector('.hud-overview')),
    total: vis(document.getElementById('gross-estate-val')),
    totalText: (document.getElementById('gross-estate-val') || {}).textContent || null,
    lensBar: vis(document.querySelector('.lens-controls')),
    lensShown: ids.filter((i) => vis(document.getElementById(i))),
    cls: layout ? layout.className : null
  };
})()`;

async function boot(browser, init) {
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 950 } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk\.|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort();
    return route.continue();
  });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  /* Overlay-skip flags are set on a throwaway origin-mate first: seeding them on the page under
     test would mean navigating it twice, and the second load is not the cold load. */
  await page.goto(BASE + '/404.html', { waitUntil: 'commit' });
  await page.evaluate(`(()=>{try{sessionStorage.setItem('datumfi_skip_entry_overlay','1');localStorage.setItem('datum-discover-v1','done');localStorage.setItem('datum_studio_overlay_seen','1');}catch(e){}})()`);
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  return { ctx, page };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  console.log('\n_gate_empty_estate_no_dead_controls\n');

  /* ── EMPTY ─────────────────────────────────────────────────────────────────────────────────── */
  let { ctx, page } = await boot(browser, null);
  const empty = await page.evaluate(READ);

  check('E0 · THE FIXTURE REACHES THE STATE — a cold Studio has zero rooms',
    empty.rooms === 0, 'rooms=' + empty.rooms + ' classes=' + empty.cls);
  check('E1 · zero rooms -> the square-footage readout is not rendered',
    empty.hud === false && empty.total === false,
    'panel=' + empty.hud + ' value=' + empty.total + ' text=' + JSON.stringify(empty.totalText));
  check('E2 · zero rooms -> none of the four lens buttons are rendered',
    empty.lensBar === false && empty.lensShown.length === 0,
    'bar=' + empty.lensBar + ' shown=' + JSON.stringify(empty.lensShown));

  /* ── ONE ROOM · PAIRED PRESENCE ────────────────────────────────────────────────────────────── */
  await page.evaluate(`(() => {
    window.state.accounts.push({ id: 'gate_room', baseId: '401k', name: 'Gate 401(k)', value: 250000, owner: 'primary' });
    if (window.refreshEstateGate) window.refreshEstateGate();
    if (window.updateSVGs) window.updateSVGs();
  })()`);
  await page.waitForTimeout(1200);
  const filled = await page.evaluate(READ);
  check('E3 · PAIRED PRESENCE — one room and BOTH the readout and all four lenses come back',
    filled.rooms === 1 && filled.hud === true && filled.total === true &&
    filled.lensBar === true && filled.lensShown.length === LENS_IDS.length,
    'rooms=' + filled.rooms + ' readout=' + filled.total + ' lenses=' + filled.lensShown.length + '/' + LENS_IDS.length);
  await ctx.close();

  /* ── E4 · THE RULE'S DIRECTION ─────────────────────────────────────────────────────────────── */
  /* Boot cold (zero rooms, panels correctly hidden), then STRIP the class and nothing else. The
     panels must reappear. That is only true of a hide-when-empty rule: a default-hidden CSS with a
     show-when-filled override leaves them hidden with the class gone, and E0-E3 cannot tell the two
     apart — both spellings pass every one of them.
     ⚠️ An earlier cut of this leg tried to neutralise window.refreshEstateGate before boot. IT DID
     NOT LAND: the function is also called through its LOCAL binding, so the class arrived anyway and
     the leg failed against a correct product. Poison that cannot be shown to have landed is not a
     control — so this leg now asserts the poison took hold before it reads anything. */
  const two = await boot(browser, null);
  const before = await two.page.evaluate(READ);
  const stripped = await two.page.evaluate(`(() => {
    const l = document.getElementById('studio-layout');
    if (!l) return { ok: false, why: 'no #studio-layout' };
    l.classList.remove('estate-empty');
    return { ok: !l.classList.contains('estate-empty'), why: l.className };
  })()`);
  await two.page.waitForTimeout(120);
  const stale = await two.page.evaluate(READ);
  check('E4a · the poison LANDED — cold boot had the class, and it is gone after the strip',
    before.cls && /estate-empty/.test(before.cls) && stripped.ok === true,
    'before=' + before.cls + ' | after=' + stripped.why);
  check('E4b · NEGATIVE DIRECTION — with the class gone the panels SHOW (hide-when-empty, not show-when-filled)',
    stale.hud === true && stale.lensBar === true && stale.lensShown.length === LENS_IDS.length,
    'readout=' + stale.hud + ' bar=' + stale.lensBar + ' lenses=' + stale.lensShown.length + '/' + LENS_IDS.length);
  await two.ctx.close();

  await browser.close(); server.close();
  console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
  fails.forEach((f) => console.log('   RED · ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
