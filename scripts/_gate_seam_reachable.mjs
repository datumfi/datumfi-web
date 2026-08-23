/* ══ THE SEAM IS REACHABLE — §82.77 · ONE BAR, TWO JOBS ═══════════════════════════════════════════
 *
 * WHY THIS EXISTS. 233 gates proved things EXIST. None proved a human could REACH them, and the
 * panel divider is the measured proof that the distinction is not academic: on shipped bytes, a real
 * pointer press at the exact centre of the divider's own painted hairline moved the panel ZERO
 * pixels. The control existed, was styled, had a keyboard handler, passed every check we owned, and
 * DID NOT WORK. `_c3_light_probe` asserted `facts.resizer` — that the element is in the DOM.
 *   🔑 EXISTENCE IS NOT REACHABILITY. This gate is the first instrument in the project that presses
 *      a control at its own visual centre and asserts the event lands on the intended element.
 *
 * ── WHAT IT IS GUARDING ─────────────────────────────────────────────────────────────────────────
 * The panel's native scrollbar is DELETED in split mode and #panel-resizer replaces it: one bar that
 * scrolls vertically and resizes horizontally, axis-locked on first intent. That means this file
 * also guards the three jobs the native scrollbar was doing SILENTLY, all of which are now ours:
 *   POSITION FEEDBACK · the thumb must track the WHEEL and the KEYBOARD, not only the drag
 *   OVERFLOW HONESTY  · a panel with nothing to scroll shows NO thumb, never a full-height inert one
 *   THE OTHER MODES   · Sheet has no seam, so Sheet must KEEP its scrollbar
 *
 * ── STATE IS PART OF THE VERDICT (§82.72) ───────────────────────────────────────────────────────
 * Every geometric leg names the state it measured in: (A) cold landing and (B) a phase open. The
 * handle used to move 5.9px between them, so a reachability verdict without a named state is not a
 * verdict. It no longer moves — that is now asserted rather than assumed (L7).
 *
 * ── WHY HEADLESS IS ALLOWED HERE, WHICH IT WAS NOT BEFORE ───────────────────────────────────────
 * On 2026-08-22 this surface could only be measured HEADED: headless Chromium uses overlay
 * scrollbars and placed the handle 6.25px away from where real Chrome placed it — a rig error LARGER
 * than the defect. Deleting the scrollbar deleted the divergence. MEASURED 2026-08-23, same page:
 *   headed   handle [398.99, 408.99]   rail [398.99, 399.99]   grab [398,408]
 *   headless handle [399.00, 409.00]   rail [399.00, 400.00]   grab [398,408]
 *   ⛔ ONE LEG STILL CANNOT RUN HEADLESS AND IS NOT FAKED: "Sheet keeps its scrollbar" cannot be
 *      measured as `offsetWidth - clientWidth`, because headless reports 0 for a scrollbar that is
 *      really there. It is asserted as the COMPUTED RULE (`scrollbar-width`) instead — which is also
 *      the better assertion, because it states the requirement (the hide is scoped) rather than a
 *      platform-dependent measurement of a gutter.
 *
 * LEGS
 *   L1  the seam is a child of #studio-layout — NOT of the scrolling panel
 *   L2  SPLIT: the panel's `scrollbar-width` computes to `none` (the native bar is gone)
 *   L3  SHEET: it computes to `auto` — the hide did NOT leak to a mode with no seam to replace it
 *   L4  the rail is PAINTED at rest (no `opacity: 0`; you cannot hover what you cannot see)
 *   L5  the whole 10px target is grabbable
 *   L6  the PAINTED rail lies inside the GRABBABLE span   <- the original defect, isolated
 *   L7  (A) and (B) place the handle IDENTICALLY (the 5.9px state drift is gone)
 *   L8  a HORIZONTAL press at the painted rail's own centre RESIZES the panel
 *   L9  ...and does NOT also scroll it
 *   L10 a VERTICAL press on the same bar SCROLLS the panel
 *   L11 ...and does NOT also resize it
 *   L12 the thumb tracks the WHEEL (position feedback the native scrollbar used to provide)
 *   L13 a panel with no overflow shows NO thumb
 *   L14 SHEET, STRUCTURE and <=900px: the seam is ABSENT
 *
 * RED-FIRST CONTROLS — each names the legs it reds, because a control that reds for a different
 * reason than the leg under test proves nothing. All four PROVE THEIR POISON LANDED and ABORT
 * rather than print a green if it did not.
 *   --reparent   puts the handle back INSIDE .drafting-panel and restores the native scrollbar,
 *                i.e. the exact shipped arrangement. Reds L1, L2, L6, L8 — the press at the painted
 *                centre goes dead again, which is the defect this commit exists to close.
 *   --nothumb    makes the thumb writer a no-op. Reds L12 only (L13 stays GREEN on purpose: a thumb
 *                that is always absent still satisfies "absent when there is nothing to scroll",
 *                which is exactly why L13 alone would be a hollow proof).
 *   --noaxis     deletes the axis lock so every gesture resizes. Reds L10 and L11.
 *   --leakhide   drops `.mode-split` from the scrollbar hide. Reds L3 — Sheet loses its only scroll
 *                indicator, a defect with no visual difference in the mode being worked on.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 8153, VW = 1440, VH = 900, ROOT = process.cwd();
const REPARENT = process.argv.includes('--reparent');
const NOTHUMB  = process.argv.includes('--nothumb');
const NOAXIS   = process.argv.includes('--noaxis');
const LEAKHIDE = process.argv.includes('--leakhide');
const POISONED = REPARENT || NOTHUMB || NOAXIS || LEAKHIDE;

/* The exact strings the poisons rewrite, kept together so a source edit that breaks a poison breaks
   it LOUDLY (count !== 1 aborts) instead of quietly making a control inert. That is not a
   hypothetical: this commit broke _gate_seam_pin's anchor, and a CLEAN suite run stayed green. */
const BTN =
  '    <button type="button" id="panel-resizer" role="separator" aria-orientation="vertical"\n' +
  '            aria-label="Resize the drafting panel"></button>\n\n' +
  '    <div class="drafting-panel">';
const BTN_INSIDE =
  '    <div class="drafting-panel">\n' +
  '    <button type="button" id="panel-resizer" role="separator" aria-orientation="vertical"\n' +
  '            aria-label="Resize the drafting panel"></button>';
const PLACE     = 'left: calc(var(--studio-panel-w, 400px) - 1px); width: 10px;';
const PLACE_OLD = 'right: -5px; width: 10px;';
/* ⛔ THE RAIL OFFSET IS PART OF --reparent AND LEAVING IT OUT WAS A REAL DEFECT IN THIS GATE.
   The first cut restored the shipped PLACEMENT and the shipped SCROLLBAR but kept the NEW rail at
   `left: 0` — so the rail landed inside the (shrunken) grab and L6 stayed GREEN. The control reddened
   four legs and looked convincing while failing to reproduce the one symptom it is named for.
   🔑 A CONTROL THAT REPRODUCES A VARIANT PROVES SOMETHING OTHER THAN WHAT ITS NAME CLAIMS. The
      shipped rail sat at `left: 4px; width: 2px` — the middle of the handle, which is exactly the
      part the scrollbar covered. Restore all three or restore none. */
const RAIL     = 'left: 0; width: 1px;';
const RAIL_OLD = 'left: 4px; width: 2px;';
const HIDE      = '.studio-layout.mode-split .drafting-panel { scrollbar-width: none; }';
const HIDE_OFF  = '.studio-layout.mode-split .drafting-panel { scrollbar-width: auto; }';
const HIDE_WK   = '.studio-layout.mode-split .drafting-panel::-webkit-scrollbar { width: 0; height: 0; }';
const HIDE_WK_OFF = '.studio-layout.mode-split .drafting-panel::-webkit-scrollbar { width: 6px; height: 6px; }';
const HIDE_LEAK = '.drafting-panel { scrollbar-width: none; }';
const THUMB_BODY = "h.style.setProperty('--seam-thumb-h', th + 'px');";
const THUMB_NOOP = "h.style.setProperty('--seam-thumb-h', th + 'px'); return;";
const AXIS      = "_spDown.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';";
const AXIS_OFF  = "_spDown.axis = 'x';";

const landed = [];
function swap(rel, body, from, to, tag) {
  const n = body.split(from).length - 1;
  if (n !== 1) { console.log(`ABORT: poison anchor ${tag} matched ${n} times in ${rel}, expected 1`); process.exit(1); }
  landed.push(tag);
  return body.split(from).join(to);
}
function poison(rel, body) {
  if (!POISONED) return body;
  if (rel === 'studio.html') {
    if (REPARENT) {
      body = swap(rel, body, BTN, BTN_INSIDE, 'markup:reparent');
      body = swap(rel, body, PLACE, PLACE_OLD, 'css:placement');
      body = swap(rel, body, RAIL, RAIL_OLD, 'css:rail-offset');
      body = swap(rel, body, HIDE, HIDE_OFF, 'css:scrollbar-width');
      body = swap(rel, body, HIDE_WK, HIDE_WK_OFF, 'css:webkit-scrollbar');
    }
    if (LEAKHIDE) body = swap(rel, body, HIDE, HIDE_LEAK, 'css:hide-unscoped');
  }
  if (rel === 'scripts/studio-panel-resize.js') {
    if (NOTHUMB) body = swap(rel, body, THUMB_BODY, THUMB_NOOP, 'js:thumb-noop');
    if (NOAXIS)  body = swap(rel, body, AXIS, AXIS_OFF, 'js:axis-lock');
  }
  return body;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  fs.readFile(path.join(ROOT, rel), (err, buf) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    const ext = path.extname(rel).toLowerCase();
    let out = buf;
    if (ext === '.html' || ext === '.js') out = Buffer.from(poison(rel, buf.toString('utf8')), 'utf8');
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(out);
  });
});

const legs = {};
let pass = 0, total = 0;
function ok(id, label, cond, detail) {
  total++; if (cond) pass++;
  legs[id] = !!cond;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${id} ${label}${detail ? '  — ' + detail : ''}`);
}

/* read the seam's geometry AND hit-test it — the two halves that must agree */
const readSeam = () => {
  const h = document.getElementById('panel-resizer');
  const p = document.querySelector('.drafting-panel');
  if (!h || !p) return null;
  const hr = h.getBoundingClientRect();
  const cs = getComputedStyle(h, '::after');
  const y = Math.round(hr.top + hr.height / 2);
  const grab = [];
  for (let x = Math.floor(hr.left) - 8; x <= Math.ceil(hr.right) + 4; x++) {
    const el = document.elementFromPoint(x, y);
    if (el && el.id === 'panel-resizer') grab.push(x);
  }
  const rl = hr.left + parseFloat(cs.left), rw = parseFloat(cs.width);
  return {
    parent: h.parentElement ? h.parentElement.id : '',
    display: getComputedStyle(h).display,
    handle: [+hr.left.toFixed(2), +hr.right.toFixed(2)],
    rail: [+rl.toFixed(2), +(rl + rw).toFixed(2)],
    railBg: cs.backgroundColor,
    grab: grab.length ? [grab[0], grab[grab.length - 1], grab.length] : null,
    y,
    sbRule: getComputedStyle(p).scrollbarWidth || '(unsupported)',
    thumbH: parseInt(h.style.getPropertyValue('--seam-thumb-h'), 10) || 0,
    thumbTop: h.style.getPropertyValue('--seam-thumb-top'),
    budget: p.scrollHeight - p.clientHeight
  };
};
const panelW = () => getComputedStyle(document.documentElement).getPropertyValue('--studio-panel-w').trim();
const scrollTop = () => document.querySelector('.drafting-panel').scrollTop;

async function fresh(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: VW, height: VH } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { localStorage.removeItem('datum_studio_panel_w'); } catch (e) {}
  });
  await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  return { ctx, page };
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  console.log(`THE SEAM IS REACHABLE — one bar, two jobs${POISONED ? '   MODE: ' + process.argv.slice(2).join(' ') : ''}`);

  let { ctx, page } = await fresh(browser);

  /* ⛔ THE "DID THE POISON LAND" CHECK BELONGS **AFTER** THE FIRST PAGE LOAD, AND THAT IS A BUG THIS
     GATE ALREADY MADE. poison() only runs when the server is ASKED for a file, so asserting `landed`
     before the first navigation aborts every control on an empty list — which is what happened on
     the first run of all four. It failed LOUDLY, which is the only reason it cost minutes instead of
     shipping a control that could never bite.
     🔑 A GUARD PLACED BEFORE THE THING IT GUARDS IS NOT EARLY, IT IS WRONG. */
  if (POISONED) {
    console.log(`  poison landed in: ${landed.join(', ') || 'NOTHING'}`);
    if (landed.length === 0) { console.log('ABORT: control requested but no poison landed'); process.exit(1); }
  }
  const A = await page.evaluate(readSeam);
  if (!A) { console.log('ABORT: no #panel-resizer or no .drafting-panel — population empty'); process.exit(1); }
  console.log(`  state (A) cold landing: ${JSON.stringify(A)}`);

  ok('L1 ', 'the seam is a child of #studio-layout, not the scrolling panel',
     A.parent === 'studio-layout', `parent=${A.parent || '(unnamed)'}`);
  ok('L2 ', 'SPLIT: the panel\'s native scrollbar is gone',
     A.sbRule === 'none', `scrollbar-width=${A.sbRule}`);
  ok('L4 ', 'the rail is PAINTED at rest',
     !!A.railBg && !/(^rgba\(0, 0, 0, 0\)$)|(\/ 0\))|transparent/.test(A.railBg), A.railBg);
  ok('L5 ', 'the whole 10px target is grabbable',
     !!A.grab && A.grab[2] >= 10, JSON.stringify(A.grab));
  ok('L6 ', 'the PAINTED rail lies inside the GRABBABLE span',
     !!A.grab && A.rail[0] >= A.grab[0] - 1.01 && A.rail[1] <= A.grab[1] + 1.01,
     `rail ${JSON.stringify(A.rail)} grab ${JSON.stringify(A.grab)}`);

  /* (B) a phase open — the state that used to move the handle 5.9px */
  await page.evaluate(() => { try { _studioPhaseGo('architecture'); } catch (e) {} });
  await page.waitForTimeout(700);
  const B = await page.evaluate(readSeam);
  ok('L7 ', '(A) and (B) place the handle IDENTICALLY',
     A.handle[0] === B.handle[0] && A.handle[1] === B.handle[1],
     `A ${JSON.stringify(A.handle)}  B ${JSON.stringify(B.handle)}`);
  await ctx.close();

  /* ── HORIZONTAL intent: press the painted rail's own centre ─────────────────────────────────── */
  ({ ctx, page } = await fresh(browser));
  const g1 = await page.evaluate(readSeam);
  const hx = (g1.rail[0] + g1.rail[1]) / 2;
  let w0 = await page.evaluate(panelW), s0 = await page.evaluate(scrollTop);
  await page.mouse.move(hx, g1.y); await page.mouse.down();
  await page.mouse.move(hx + 120, g1.y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(300);
  let w1 = await page.evaluate(panelW), s1 = await page.evaluate(scrollTop);
  ok('L8 ', 'a HORIZONTAL press at the painted rail centre RESIZES',
     w0 !== w1, `${w0} -> ${w1}  (pressed x=${hx.toFixed(2)})`);
  ok('L9 ', '...and does NOT also scroll', s0 === s1, `scrollTop ${s0} -> ${Math.round(s1)}`);
  await ctx.close();

  /* ── VERTICAL intent on the same bar ────────────────────────────────────────────────────────── */
  ({ ctx, page } = await fresh(browser));
  const g2 = await page.evaluate(readSeam);
  const vx = g2.handle[0] + 5;
  w0 = await page.evaluate(panelW); s0 = await page.evaluate(scrollTop);
  await page.mouse.move(vx, g2.y); await page.mouse.down();
  await page.mouse.move(vx, g2.y + 120, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(300);
  w1 = await page.evaluate(panelW); s1 = await page.evaluate(scrollTop);
  ok('L10', 'a VERTICAL press on the same bar SCROLLS',
     s1 > s0, `scrollTop ${s0} -> ${Math.round(s1)}`);
  ok('L11', '...and does NOT also resize', w0 === w1, `${w0} -> ${w1}`);

  /* ── the thumb tracks the WHEEL — the job the native scrollbar was doing silently ───────────── */
  await page.evaluate(() => { document.querySelector('.drafting-panel').scrollTop = 0; });
  await page.waitForTimeout(300);
  const t0 = (await page.evaluate(readSeam)).thumbTop;
  await page.mouse.move(200, 500); await page.mouse.wheel(0, 400);
  await page.waitForTimeout(450);
  const after = await page.evaluate(readSeam);
  ok('L12', 'the thumb tracks the WHEEL, not only the drag',
     after.thumbTop !== t0 && after.thumbH > 0, `${t0} -> ${after.thumbTop}  (h=${after.thumbH})`);

  /* ── overflow honesty ───────────────────────────────────────────────────────────────────────── */
  const honest = await page.evaluate(() => {
    const p = document.querySelector('.drafting-panel');
    p.style.height = (p.scrollHeight + 400) + 'px';
    if (typeof window._studioSeamThumb === 'function') window._studioSeamThumb();
    const h = document.getElementById('panel-resizer');
    return { budget: p.scrollHeight - p.clientHeight, thumbH: parseInt(h.style.getPropertyValue('--seam-thumb-h'), 10) || 0 };
  });
  ok('L13', 'no overflow -> NO thumb (absent, never full-height and inert)',
     honest.budget <= 0 && honest.thumbH === 0, JSON.stringify(honest));
  await ctx.close();

  /* ── the other modes, and mobile ────────────────────────────────────────────────────────────── */
  ({ ctx, page } = await fresh(browser));
  const sheet = await page.evaluate(() => {
    const l = document.getElementById('studio-layout');
    l.classList.remove('mode-split', 'mode-blueprint'); l.classList.add('mode-draft');
    const h = document.getElementById('panel-resizer');
    return { display: getComputedStyle(h).display, w: h.getBoundingClientRect().width,
             sbRule: getComputedStyle(document.querySelector('.drafting-panel')).scrollbarWidth || '(unsupported)' };
  });
  ok('L3 ', 'SHEET keeps its scrollbar — the hide did NOT leak past mode-split',
     sheet.sbRule !== 'none', `scrollbar-width=${sheet.sbRule}`);
  const structure = await page.evaluate(() => {
    const l = document.getElementById('studio-layout');
    l.classList.remove('mode-split', 'mode-draft'); l.classList.add('mode-blueprint');
    const h = document.getElementById('panel-resizer');
    return { display: getComputedStyle(h).display, w: h.getBoundingClientRect().width };
  });
  await ctx.close();
  const m = await fresh(browser, { width: 390, height: 844 });
  const mobile = await m.page.evaluate(() => {
    const h = document.getElementById('panel-resizer');
    return { display: getComputedStyle(h).display, w: h.getBoundingClientRect().width };
  });
  await m.ctx.close();
  const gone = (o) => o.display === 'none' && o.w === 0;
  ok('L14', 'SHEET, STRUCTURE and <=900px: the seam is ABSENT',
     gone(sheet) && gone(structure) && gone(mobile),
     `sheet=${JSON.stringify(sheet.display)} structure=${JSON.stringify(structure.display)} mobile=${JSON.stringify(mobile.display)}`);

  await browser.close();
  server.close();

  /* ── the controls declare which legs they own, and are checked against what actually happened ── */
  /* ⚠️ THE --reparent SET IS DERIVED BY RUNNING IT, NOT PREDICTED. The first version of this line
     said [L1 L2 L6 L8] because that is what I expected; the shipped arrangement actually reds SIX,
     and the two I missed are the most informative ones —
        L5  only 6 of the 10px were ever grabbable (the scrollbar covered the rest)
        L10 a vertical press lands on the native scrollbar, so there was no one-bar scroll at all
     Both are real properties of the bytes that shipped, not artefacts of the poison.
     🔑 A PREDICTED RED SET IS A HYPOTHESIS. Writing the measured one down is the only version that
        stays true, and correcting the prediction is not the same as loosening the control — the
        control got STRICTER when the missing rail-offset swap was added. */
  const expect = REPARENT ? ['L1 ', 'L2 ', 'L5 ', 'L6 ', 'L8 ', 'L10']
               : NOTHUMB  ? ['L12']
               : NOAXIS   ? ['L10', 'L11']
               : LEAKHIDE ? ['L3 ']
               : null;
  if (expect) {
    const reds = Object.keys(legs).filter((k) => !legs[k]).sort();
    const want = expect.slice().sort();
    const same = reds.length === want.length && reds.every((r, i) => r === want[i]);
    console.log(`  control ${same ? 'OK' : 'MISMATCH'} — expected reds [${want.join(' ')}], got [${reds.join(' ') || 'none'}]`);
    console.log(`SCORE ${pass}/${total}   (red-first control ${same ? 'behaved as specified' : 'DID NOT behave as specified'})`);
    process.exit(same ? 0 : 1);
  }
  console.log(`SCORE ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}`);
  process.exit(pass === total ? 0 : 1);
})();
