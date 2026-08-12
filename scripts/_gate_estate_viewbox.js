/* @gate-pool: browser
 *
 * §22.2 — NOTHING THE ESTATE DRAWS MAY LEAVE THE viewBox, IN ANY STATE.
 *
 * WHY THIS EXISTS, AND WHY IT IS A *POPULATION* GATE. Every geometry check we own is per-feature:
 * this tile, that band, this stack's bottom edge. Per-feature checks cannot see a whole CLASS of
 * defect, and they have now missed the same one twice in two days on the same wing:
 *   · 2026-08-09 — three trusts ended 79 units below the viewBox floor. Found by hand while
 *     measuring something else, not by a gate.
 *   · 2026-08-10 — the trust wing and EVERY trust tile sat 120-140 units past the RIGHT edge, and
 *     had done since the wing was written. _gate_estate_22_tile_sizing's T5 leg was literally named
 *     "three trusts never leave the viewBox" and was GREEN throughout, because it measured
 *     bottomOf() — one edge of four. The name claimed a box; the assertion checked a line.
 * 🔑 GEOMETRY HAS NO GLOBAL INVARIANT UNLESS SOMEBODY ASSERTS ONE. ASSERT THE POPULATION, NOT THE
 *    INSTANCE — this gate walks EVERY painted element and checks ALL FOUR EDGES.
 *
 * ⛔ WHY LEAVING THE viewBox IS SEVERE, MEASURED RATHER THAN ASSERTED. `.blueprint-svg` is
 * overflow:visible, so content outside the box still PAINTS and looks fine on a wide screen. But
 * `.canvas-wrapper` is overflow-x:hidden and NO horizontal scroll exists anywhere on the page
 * (scrollWidth == clientWidth at every viewport measured), so those pixels are CUT and
 * unrecoverable. Measured 2026-08-10 on the pre-fix build, 1 trust + 2 properties:
 *     2560x1440  261px spare  |  1920x1080  CUT 43px  |  1680x1050  CUT 103px  |  1536x864 CUT 74px
 *     1440x900   CUT 82px     |  1366x768   CUT 76px  |  1280x800   CUT 69px   |  1024x1366 CUT 47px
 * Seven of eight, including the most common desktop resolution there is. Whether a room carrying
 * money is visible AT ALL depended on the user's window width. Inside the viewBox is GUARANTEED on
 * screen, because fitToScreen fits the whole box by construction — that is the entire point.
 *
 * ⚠️ EVERY SCENARIO ASSERTS ITS OWN FIXTURE FIRST (§13.73). A scenario that silently failed to build
 * would draw no trust wing, escape nothing, and read GREEN for precisely the wrong reason — the
 * absence legs below are worthless without the presence legs guarding them. The 0-trust scenario is
 * the deliberate control: it was measured at ZERO offenders even on the BROKEN build, which is what
 * proves the offenders this gate hunts belong to the trust wing and not to the estate at large.
 *
 * RED-FIRST BY SUBSTITUTION, NOT BY MEMORY: `--old` serves `git show HEAD:scripts/datum-estate.js`
 * in place of the working file and leaves the tree untouched. It ABORTS if that blob is missing or
 * identical to the working copy, because a substitution that did not land produces a confident
 * red-first that proved nothing.
 *
 * Usage: node scripts/_gate_estate_viewbox.js [LABEL] [--old]
 * Self-hosts on 127.0.0.1:8362 — NOT :8001, which is the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const OLD = process.argv.includes('--old');
const PORT = 8362;

// THE CONTRACT — studio.html's `<svg class="blueprint-svg" viewBox="0 0 1400 1100">`. A mirror of the
// product, never an independent opinion: if the canvas is ever re-proportioned this moves WITH it.
const VB_W = 1400, VB_H = 1100;
const EPS = 0.5;                    // sub-unit tolerance; bbox values are floats
const NARROW = { width: 1366, height: 768 };   // the cheapest viewport that reproduced the clip

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
let OLD_SRC = null;
if (OLD) {
  OLD_SRC = execFileSync('git', ['show', 'HEAD:scripts/datum-estate.js'], { cwd: ROOT, encoding: 'utf8' });
  const cur = fs.readFileSync(path.join(ROOT, 'scripts/datum-estate.js'), 'utf8');
  if (!OLD_SRC || OLD_SRC.length < 1000) { console.log('[estate_viewbox] ABORT — could not read HEAD:scripts/datum-estate.js'); process.exit(2); }
  if (OLD_SRC === cur) { console.log('[estate_viewbox] ABORT — --old is identical to the working file; nothing would be proven'); process.exit(2); }
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  if (OLD && u === '/scripts/datum-estate.js') {
    r.writeHead(200, { 'Content-Type': 'text/javascript' });
    return r.end(OLD_SRC);
  }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

/* `extra` is [type, count] so a scenario can reach a CROWDED COLUMN. It used to hard-code two, which
   is exactly why the §22.6 defect hid here: the grounds column only walks off the canvas past ~12
   accounts IN ONE OWNERSHIP COLUMN, and no fixture in this gate ever got near that. */
const build = (p, nT, nP, extra) => p.evaluate(([t, n, x]) => {
  try { localStorage.clear(); } catch (e) {}
  window.state.accounts = [];
  for (let i = 0; i < t; i++) addInstance('trust');
  for (let i = 0; i < n; i++) addInstance('property');
  if (x) for (let i = 0; i < x[1]; i++) addInstance(x[0]);
  window.state.accounts.forEach((a) => { a.value = 500000; });
  updateSVGs();
}, [nT, nP, extra]);

/* EVERY PAINTED ELEMENT, not only .room-rect. The 2026-08-10 escape included a <text> (the wing
   caption, 226 units wide) and the room-fill <rect> as well as the tiles — a gate that walked only
   rooms would have reported the wing fixed while its label still hung off the canvas. */
const scan = (p) => p.evaluate(([w, h, eps]) => {
  const svg = document.getElementById('bp-svg');
  const offenders = [];
  svg.querySelectorAll('rect,text,line,circle,ellipse,path,polygon,polyline,image').forEach((el) => {
    let bb; try { bb = el.getBBox(); } catch (e) { return; }
    if (!bb || (bb.width === 0 && bb.height === 0)) return;   // never-painted defs/spacers
    const out = [];
    if (bb.x < -eps) out.push('left by ' + (-bb.x).toFixed(1));
    if (bb.y < -eps) out.push('top by ' + (-bb.y).toFixed(1));
    if (bb.x + bb.width > w + eps) out.push('right by ' + (bb.x + bb.width - w).toFixed(1));
    if (bb.y + bb.height > h + eps) out.push('bottom by ' + (bb.y + bb.height - h).toFixed(1));
    if (out.length) {
      offenders.push(`<${el.tagName}${el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\s+/)[0] : ''}>` +
        (el.textContent && el.textContent.trim() ? ' "' + el.textContent.trim().slice(0, 20) + '"' : '') + ' ' + out.join(', '));
    }
  });
  /* §22.3 — THE WING CAPTION MUST BE INSIDE THE WING BOX IT NAMES. The Captain rejected a caption
     floating below the box: "I do not like the copy 'generation trust wing' being outside of the
     room." The failure mode worth gating is not "it is outside" — you can see that — it is a caption
     that FITS AT 2 TRUSTS AND SILENTLY CLIPS AT 3, because a clipped label looks deliberate and is
     wrong. Containment is therefore asserted per state, like everything else here. */
  const wing = Array.from(svg.querySelectorAll('rect.grounds-rect'))
    .map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') }))
    .filter((r) => r.x >= 1200)[0] || null;
  const caps = Array.from(svg.querySelectorAll('text'))
    .filter((t) => /GENERATIONAL|TRUST WING/.test(t.textContent || ''))
    .map((t) => { const b = t.getBBox(); return { t: b.y, b: b.y + b.height, l: b.x, r: b.x + b.width }; });
  let capOut = null;
  if (caps.length && wing) {
    const t = Math.min(...caps.map((c) => c.t)), bo = Math.max(...caps.map((c) => c.b));
    const l = Math.min(...caps.map((c) => c.l)), r = Math.max(...caps.map((c) => c.r));
    const okIn = t >= wing.y - eps && bo <= wing.y + wing.h + eps && l >= wing.x - eps && r <= wing.x + wing.w + eps;
    capOut = okIn ? null : `caption [${t.toFixed(0)}..${bo.toFixed(0)}]x[${l.toFixed(0)}..${r.toFixed(0)}] vs wing [${wing.y}..${wing.y + wing.h}]x[${wing.x}..${wing.x + wing.w}]`;
  }
  /* §22.7 — COLLAPSED IS STILL DRAWN, ABSENT IS NOT. The column collapse tile folds rooms out of
     the picture; the ONLY thing that makes that honest is that the count it reports is exact. A
     tile that under-reports is worse than no tile, because it looks like an answer. */
  const colRooms = Array.from(svg.querySelectorAll('.room-grp')).filter((g) => {
    const r = g.querySelector('.room-rect'); if (!r) return false;
    const x = +r.getAttribute('x'), w2 = +r.getAttribute('width');
    return x >= 200 && x + w2 <= 1200 && !g.classList.contains('column-collapse');
  }).length;
  const colTiles = Array.from(svg.querySelectorAll('.column-collapse'));
  const colFolded = colTiles.reduce((t, g) => t + (+g.getAttribute('data-collapsed-count') || 0), 0);
  return {
    offenders,
    capOut,
    nCap: caps.length,
    hasWing: !!wing,
    colRooms, nColTiles: colTiles.length, colFolded,
    nTrust: document.querySelectorAll('.trust-room').length,
    nSat: document.querySelectorAll('.satellite-room').length,
  };
}, [VB_W, VB_H, EPS]);

/* THE USER-VISIBLE SYMPTOM, not the geometric one. Inside-the-viewBox is the CAUSE; being clipped by
   .canvas-wrapper is what the user actually experiences. Asserting only the cause would leave us
   unable to notice if the wrapper's own CSS changed underneath us. */
const clipCheck = (p) => p.evaluate(() => {
  const svg = document.getElementById('bp-svg');
  const ctm = svg.getScreenCTM();
  const rightMost = Array.from(document.querySelectorAll('.trust-room .room-rect'))
    .reduce((m, r) => Math.max(m, +r.getAttribute('x') + +r.getAttribute('width')), 0);
  const q = svg.createSVGPoint(); q.x = rightMost; q.y = 600;
  let clip = svg.parentElement;
  while (clip && !/hidden|auto|scroll|clip/.test(getComputedStyle(clip).overflowX)) clip = clip.parentElement;
  const box = (clip || document.documentElement).getBoundingClientRect();
  return {
    tileUserX: rightMost,
    tileScreenX: q.matrixTransform(ctm).x,
    clipRight: box.right,
    clipName: clip ? (clip.className || clip.tagName).toString().split(' ')[0] : 'documentElement',
    scrollable: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const pageErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 10000 });
  await p.waitForTimeout(400);

  const checks = [];
  const ck = (n, ok, obs) => checks.push([n, !!ok, obs === undefined ? '' : String(obs)]);

  /* ── V · THE POPULATION, STATE BY STATE ─────────────────────────────────────────────────────── */
  const SCENES = [
    ['no trust at all (CONTROL — zero offenders even on the broken build)', 0, 1, null, { trust: 0, sat: 0 }],
    ['1 trust · 2 properties (the state the Captain smoked)',               1, 2, null, { trust: 1, sat: 1 }],
    ['3 trusts · 3 properties (the worst subdivision)',                     3, 3, null, { trust: 3, sat: 2 }],
    ['2 trusts · 8 properties (both wings crowded)',                        2, 8, null, { trust: 2, sat: 7 }],
    ['1 trust · 12 properties (the collapse slot is live)',                 1, 12, null, { trust: 1 }],
    ['1 trust · 2 properties + 2 taxable (a mixed estate)',                 1, 2, ['taxable', 2], { trust: 1, sat: 1 }],
    /* §22.6 — THE CROWDED COLUMN. 18 accounts in one ownership column put the room stack 430 units
       outside the viewBox on the pre-fix build: drawn, counted in net worth, and clipped away by
       .canvas-wrapper. This gate could not see it because nothing here had ever built more than two
       ordinary accounts. 24 is the far end of the same failure. */
    ['1 trust · 1 property + 18 taxable (a crowded column)',                1, 1, ['taxable', 18], { trust: 1, col: 18 }],
    ['1 trust · 1 property + 24 taxable (the far end)',                     1, 1, ['taxable', 24], { trust: 1, col: 24 }],
    ['1 trust · 1 property + 50 taxable (the Captain\'s 50-room estate)',   1, 1, ['taxable', 50], { trust: 1, col: 50 }],
    /* ── §26 / CENSUS ITEM 2 · THE TRUST WING RAISED PAST THE THRESHOLD IT GUARDS ────────────────
     * ⚠️ THE ASYMMETRY WAS THE TELL, AND IT IS WORTH NAMING RATHER THAN QUIETLY FIXING: this table
     * reached FIFTY accounts in a column and THREE in the trust wing. A fixture grows where the work
     * happened, not where the risk is — the column scenes were added the day a column escaped, and
     * nothing ever went back for the other wing. Measured in the 2026-08-12 census.
     * ⭐ NINE is the cap boundary (every trust drawn, the tightest unfolded wing). TWELVE is past it,
     * so the wing FOLDS and draws 8 rooms + a door — a shape this gate had never once painted, and
     * the door is a NEW element on the canvas that must answer to the viewBox like everything else. */
    ['9 trusts (the cap boundary — tightest unfolded wing)',                9, 1, null, { trust: 9, sat: 0 }],
    ['12 trusts (PAST the cap — the wing folds to 8 + a door)',            12, 1, null, { trust: 8, sat: 0 }],
  ];
  for (const [label, nT, nP, extra, want] of SCENES) {
    await build(p, nT, nP, extra);
    await p.waitForTimeout(450);
    const r = await scan(p);
    // PRESENCE FIRST — without this, a fixture that silently built nothing reads as "nothing escaped".
    const built = r.nTrust === want.trust && (want.sat === undefined || r.nSat === want.sat);
    ck(`P· fixture REACHED ${label}`, built, `${r.nTrust} trust / ${r.nSat} satellite`);
    ck(`V· NOTHING leaves the viewBox — ${label}`, r.offenders.length === 0,
       r.offenders.length ? r.offenders.length + ' offender(s): ' + r.offenders.slice(0, 3).join(' | ') : 'clean');
    if (want.col) {
      /* §22.7 — THE ACCOUNTING LEG. Not "a tile exists" (that is decoration) but "every account is
         either DRAWN or COUNTED IN THE FOLD, and nothing is in neither". This is the leg that would
         notice a tile that quietly under-reports, which is the one failure mode a collapse tile can
         have that is worse than not existing. */
      ck(`X· a collapse tile exists and its count is EXACT — ${label}`,
         r.nColTiles === 1 && r.colRooms + r.colFolded === want.col,
         `${r.colRooms} drawn + ${r.colFolded} folded = ${r.colRooms + r.colFolded}, expected ${want.col} (tiles: ${r.nColTiles})`);
      ck(`X· the crowded column stops getting denser — ${label}`,
         r.colRooms <= 11, r.colRooms + ' rooms drawn (cap 11)');
    }
    if (want.trust > 0) {
      /* §22.4 — INVERTED, NOT DELETED. This leg used to assert the wing caption rendered and sat
         inside its box. The Captain then ruled the caption away entirely ("lets drop the wing for
         parity, not needed") on the argument that the LEFT wing has no caption either, so once every
         room names itself a wing-level label is the odd one out.
         The leg now guards the RULING instead of the layout: the wing box is still drawn, and no
         wing-level caption comes back by accident. Deleting the leg would have left the decision
         undefended; a re-added caption would simply reappear one day with nobody noticing. */
      ck(`W· the wing box is drawn and carries NO wing-level caption — ${label}`,
         r.hasWing && r.nCap === 0,
         !r.hasWing ? 'no wing box drawn' : (r.nCap ? r.nCap + ' caption line(s) returned — §22.4 dropped them' : 'wing box present, no caption'));
    }
  }

  /* ── C · THE CLIP, AT A REAL VIEWPORT ───────────────────────────────────────────────────────── */
  const narrow = await b.newPage({ viewport: NARROW });
  await narrow.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await narrow.waitForSelector('#studio-layout', { timeout: 10000 });
  await narrow.waitForTimeout(400);
  await build(narrow, 1, 2, null);
  await narrow.waitForTimeout(450);
  const c = await clipCheck(narrow);
  ck('C1 the clipping ancestor is still overflow-hidden (the premise this gate rests on)',
     c.clipName !== 'documentElement' || !c.scrollable, c.clipName + (c.scrollable ? ' · page scrolls' : ' · no h-scroll'));
  ck(`C2 at ${NARROW.width}x${NARROW.height} the trust tile is NOT clipped`,
     c.tileScreenX <= c.clipRight + 0.5, `tile edge ${c.tileScreenX.toFixed(0)}px vs clip ${c.clipRight.toFixed(0)}px`);
  /* NAMED FOR WHAT IT MEASURES, WHICH IS THE WHOLE POINT OF THIS FILE. The first draft of this leg
     was called "the tile the clip leg measured is the REAL one (read from the DOM, never a
     constant)" — but reading from the DOM is HOW it works, not WHAT it asserts, and a leg named for
     its method is the same defect as T5 next door. What it actually checks is that the tile's right
     edge, in user units, is inside the box. (The method still matters and is still used: the scratch
     probe that preceded this gate hard-coded 1520, and after the tile moved it reported the pre-fix
     numbers verbatim — a measurement anchored to a constant measures the constant.) */
  ck('C3 the trust tile\'s right edge is inside the viewBox in user units',
     c.tileUserX > 0 && c.tileUserX <= VB_W, 'user-x ' + c.tileUserX);
  await narrow.close();

  ck('R1 no page errors across every scenario', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'none');

  await b.close();
  server.close();

  let pass = 0;
  const lines = checks.map(([n, ok, obs]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n + (obs ? '   [observed: ' + obs + ']' : ''); });
  const summary = '[' + LABEL + (OLD ? ' --old(HEAD renderer)' : '') + '] ' + pass + '/' + checks.length + ' GREEN\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_estate_viewbox.out.txt', summary, 'utf8');
  console.log(summary);
  console.log('[_gate_estate_viewbox] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
    (OLD ? '   (--old: RED IS THE EXPECTED RESULT)' : ''));
  process.exit(pass === checks.length ? 0 : 1);
})();
