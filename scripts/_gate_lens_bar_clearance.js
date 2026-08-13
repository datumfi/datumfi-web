/* @gate-pool: browser
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * A HOMEOWNER LOOKING AT THEIR ESTATE — a residence with a mortgage on it (THE YARD) plus ordinary
 * rooms — with the four lens buttons on screen, at each of eight real window sizes.
 *
 * ⭐ WHY THIS GATE EXISTS. The lens bar used to sit at `bottom:40px`, which put it at canvas
 * y[993,1060] — directly on top of THE YARD's "Net Equity: $X" line at y[990,1008]. It covered the
 * one figure that says what the home is worth. It now sits at `top:14px` with a trimmed 6px vertical
 * padding, clearing the entry-door swing arcs (y=72) by NINE canvas units and the nav by 10px.
 *
 * ⚠️ THE FIRST VERSION OF THIS GATE SHIPPED A DEFECT WITH A CLEAN 6/6, AND THAT IS WHY L4 EXISTS.
 * It went out at `top:0` — five units clear of the door, three legs green — and the Captain opened
 * the page and found the pill flush against the nav. THE GATE ASSERTED THE CLEARANCE BELOW AND WAS
 * BLIND TO THE ONE ABOVE. 🔑 GATING ONE DIRECTION OF A TWO-SIDED CONSTRAINT IS NOT PARTIAL COVERAGE —
 * IT IS A GREEN THAT MEANS NOTHING ABOUT THE OTHER SIDE.
 *
 * ⛔⛔ NINE UNITS IS NOT A MARGIN. IT IS SAFE FOR A REASON, AND THE REASON IS WHAT THIS GATE GUARDS.
 * The bar's offsetParent is `.blueprint-container` — the SVG's OWN box — so the bar SCALES WITH THE
 * DRAWING. Its height tracks the drawing's scale in lockstep (measured 63.6 / 62.4 / 45.9 px against
 * scales 0.950 / 0.931 / 0.686), which makes its position in CANVAS UNITS constant at every window
 * size. 🔑 A CONSTANT-BY-COUPLING 5 IS A CATEGORICALLY DIFFERENT OBJECT FROM A VARIES-BY-VIEWPORT 5.
 * THE COUPLING IS THE SAFETY, NOT THE FIVE.
 *
 * ⭐⭐ HENCE FOUR LEGS, AND THE SECOND AND FOURTH ARE THE ONES THAT EARN THEIR KEEP:
 *   LEG 1 asserts the OUTCOME  — clearance to the DRAWING > 0 at all eight viewports.
 *   LEG 2 asserts the INVARIANT — that clearance IDENTICAL at all eight, which is the coupling itself.
 *   LEG 4 asserts THE OTHER EDGE — the gap to the NAV, as a MINIMUM in PIXELS, because that boundary
 *         is screen-anchored and therefore genuinely VARIES. See its own note; it is the leg whose
 *         absence shipped a defect.
 * Nothing in the CSS enforces or even NAMES that coupling, so it can be broken by someone who has no
 * idea they are touching it: re-parent the bar, or change `.blueprint-container`'s positioning, and
 * the clearance silently starts varying by window size. ⛔ LEG 1 WOULD STILL PASS ON THE DAY THAT
 * BREAKS — right up until the first user whose window makes it negative. LEG 2 REDS THE MOMENT THE
 * COUPLING DIES, WHICH IS THE MOMENT IT IS STILL CHEAP TO FIX.
 * 🔑 A GATE THAT ASSERTS THE OUTCOME CATCHES THE FAILURE. A GATE THAT ASSERTS THE INVARIANT CATCHES
 *    THE CAUSE, AND CATCHES IT EARLIER. WHERE A CONSTANT IS CONSTANT FOR A REASON, TEST THE REASON.
 *   LEG 3 states the coupling DIRECTLY (offsetParent === the SVG container) rather than inferring it
 *   from its effect, so a re-parenting names its own cause in the failure message instead of leaving
 *   the next reader to re-derive it.
 *
 * ⛔ NO VIEWPORT IS PRIVILEGED **ON L1/L2**, AND THAT IS DELIBERATE. An earlier report of mine claimed
 * the door clearance VARIED and that 1920x1080 was the binding case. That was wrong: one measured
 * point and two bad assumptions (that the bar hung off `.canvas-wrapper`, and that its pixel size
 * stayed fixed while the drawing scaled), extrapolated across eight viewports. Measured properly they
 * are all equal and NOTHING is binding there. Writing that false binding case in here would have been
 * worse than the report — AN ERROR EMBEDDED IN A TEST STOPS LOOKING LIKE AN ERROR AND STARTS LOOKING
 * LIKE A SPECIFICATION, which is exactly how the 62.5 text-stack constant survived.
 * ⭐⭐ BUT L4 IS THE OPPOSITE, AND THE CONTRAST IS THE POINT: the nav gap DOES vary, and 1536x864 IS
 * binding for it. TWO COUPLINGS, TWO RULES. ⛔ Do not "harmonise" L2 and L4 — they measure different
 * physics, and forcing them to agree would break whichever one lost.
 *
 * THE EIGHT VIEWPORTS ARE §22.2's OWN LIST, REUSED NOT REINVENTED — the set that caught the trust
 * wing being clipped on seven of eight (fine at 2560, cut everywhere else, invisible for a week
 * because the widest screen was the one with slack).
 *
 * Usage: node scripts/_gate_lens_bar_clearance.js [LABEL] [--sink] [--unparent] [--rise]
 *   --sink      pushes the bar down 28px -> it overlaps the entry door. LEG 1 must bite.
 *   --unparent  moves the bar out of the SVG container -> the coupling dies and the clearance starts
 *               varying by viewport. LEG 1 CAN STILL PASS; LEGS 2 AND 3 must bite. This is the
 *               control that proves the invariant leg is not decoration.
 *   --rise      returns the bar to `top:0` — the exact defect the Captain found. L1/L2/L3 stay GREEN;
 *               only L4 bites. Three green legs over a real defect is precisely what shipped.
 * Self-hosts on 127.0.0.1:8372.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const SINK = process.argv.includes('--sink');
const UNPARENT = process.argv.includes('--unparent');
const RISE = process.argv.includes('--rise');
const PORT = 8372;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const { chromium } = require(ROOT + '/node_modules/playwright');

/* §22.2's measured set. ⛔ Do not trim it for speed — its whole value is that it contains the sizes
   where a wide-screen-only check passes and the product is broken. */
const VIEWPORTS = [[2560, 1440], [1920, 1080], [1680, 1050], [1536, 864], [1440, 900], [1366, 768], [1280, 800], [1024, 1366]];
const EPS = 1.0;                       // sub-pixel tolerance on the equality leg
const CONTAINER = 'blueprint-container';

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/studio.html';
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const pageErrors = [];
  const rows = [];

  for (const [vw, vh] of VIEWPORTS) {
    const p = await b.newPage({ viewport: { width: vw, height: vh } });
    p.on('pageerror', (e) => pageErrors.push(e.message));
    await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForSelector('#studio-layout', { timeout: 10000 });
    await p.waitForTimeout(350);
    await p.evaluate(() => { ['studioOverlayWrap', 'shape-panel'].forEach((id) => {
      const o = document.getElementById(id); if (o) { o.style.display = 'none'; o.style.pointerEvents = 'none'; } }); });

    await p.evaluate(async () => {
      window.state.accounts.length = 0;
      addInstance('property');       const h = window.state.accounts[window.state.accounts.length - 1]; h.value = 600000;
      addInstance('mortgage_joint'); const m = window.state.accounts[window.state.accounts.length - 1];
      m.value = 300000; m.linkedAssetId = h.id;      // -> THE YARD, so the caption stack is real
      for (let i = 0; i < 6; i++) { addInstance('taxable'); window.state.accounts[window.state.accounts.length - 1].value = 250000 + i * 1000; }
      updateSVGs();
      await new Promise((r) => setTimeout(r, 900));
      /* ⛔ THE BAR IS HIDDEN IN SHAPE MODE. Forced here, and the fixture ASSERTS it is laid out
         below — a gate that measured a display:none bar would report a beautiful clearance. */
      document.getElementById('studio-layout').classList.remove('mode-shape');
    });

    /* ⚠️ --sink WAS `top:8px` AND IT STOPPED BITING THE DAY THE PILL GOT SHORTER — trimming the
       padding handed it 15 units of clearance, so it silently went green on L1 and tripped L4 by
       accident instead. A CONTROL IS CALIBRATED AGAINST THE GEOMETRY IT ATTACKS; change the geometry
       and you must re-derive the poison. 28px puts the bar's bottom past the door at every viewport. */
    if (SINK) await p.addStyleTag({ content: '.lens-controls { top: 28px !important; }' });
    /* --rise reproduces the DEFECT THE CAPTAIN FOUND: at top:0 the pill sits flush against the nav
       (0px at 1920x1080 and 1536x864). L1-L3 all stay green; only L4 bites. That is the whole point
       of L4 existing, so it gets its own control rather than sharing --sink's. */
    if (RISE) await p.addStyleTag({ content: '.lens-controls { top: 0 !important; }' });
    if (UNPARENT) await p.evaluate(() => {
      // break the coupling: hang the bar off the WRAPPER, which does not scale with the drawing
      const bar = document.querySelector('.hud-panel.lens-controls');
      const wrap = document.querySelector('.canvas-wrapper');
      wrap.style.position = 'relative';
      wrap.appendChild(bar);
    });
    await p.waitForTimeout(220);

    const m = await p.evaluate((CONT) => {
      const bar = document.querySelector('.hud-panel.lens-controls');
      const svg = document.getElementById('bp-svg');
      const br = bar.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      const VB = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      const scale = Math.min(sr.width / VB[2], sr.height / VB[3]);
      const offY = sr.top + (sr.height - VB[3] * scale) / 2;
      let topInk = Infinity;
      svg.querySelectorAll('rect,text,line,circle,ellipse,path,polygon,polyline').forEach((el) => {
        let q; try { q = el.getBBox(); } catch (e) { return; }
        if (!q || (q.width === 0 && q.height === 0)) return;
        topInk = Math.min(topInk, q.y);
      });
      const op = bar.offsetParent;
      /* THE OTHER DIRECTION. `.studio-layout`'s top edge is where the nav band ends, and it is a
         SCREEN-anchored boundary — so this gap is measured in PIXELS, not canvas units. Measuring it
         in units would hide the defect it exists to catch. */
      const lay = document.getElementById('studio-layout').getBoundingClientRect();
      return {
        laidOut: br.width > 0 && br.height > 0,
        barBottomUnits: +((br.bottom - offY) / scale).toFixed(1),
        topInk: +topInk.toFixed(1),
        clearance: +(topInk - (br.bottom - offY) / scale).toFixed(1),
        navGapPx: Math.round(br.top - lay.top),
        offsetParent: op ? ((op.id || op.className || op.tagName).toString().trim().split(/\s+/)[0]) : 'NONE',
        inContainer: !!(op && (op.id === CONT || String(op.className || '').indexOf(CONT) >= 0)),
      };
    }, CONTAINER);

    rows.push({ vp: vw + 'x' + vh, ...m });
    await p.close();
  }

  console.log('=== ' + LABEL + ' === MODE: ' + ((SINK?'SINK ':'')+(UNPARENT?'UNPARENT ':'')+(RISE?'RISE':'') || 'NORMAL'));
  console.log('  viewport      bar bottom   top ink   clearance   navGap(px)   offsetParent');
  rows.forEach((r) => console.log('  ' + r.vp.padEnd(12) + String(r.barBottomUnits).padStart(9) +
    String(r.topInk).padStart(10) + String(r.clearance).padStart(12) + String(r.navGapPx).padStart(13) + '   ' + r.offsetParent));

  // PRESENCE FIRST — a bar that is not laid out would give a gorgeous clearance and prove nothing.
  ok(rows.every((r) => r.laidOut), 'P· the lens bar is actually laid out at every viewport (not hidden)');
  ok(rows.every((r) => r.topInk < 200 && r.topInk > 0), 'P· the estate rendered its entry door — there IS ink to clear (top ink ' + rows[0].topInk + ')');

  // LEG 1 — THE OUTCOME.
  const worst = Math.min(...rows.map((r) => r.clearance));
  ok(rows.every((r) => r.clearance > 0),
     'L1 [OUTCOME] the bar clears the drawing at EVERY viewport — worst ' + worst + ' units');

  /* LEG 2 — THE INVARIANT. ⛔ Equality ACROSS the eight, no viewport privileged: they are all equal
     and nothing is binding, so the assertion is spread, not a named worst case. */
  const spread = +(Math.max(...rows.map((r) => r.clearance)) - Math.min(...rows.map((r) => r.clearance))).toFixed(1);
  ok(spread <= EPS,
     'L2 [INVARIANT] clearance is IDENTICAL across all eight viewports — spread ' + spread +
     'u (the bar scales WITH the drawing; if this reds, the coupling died and L1 is living on borrowed time)');

  // LEG 3 — THE COUPLING, STATED RATHER THAN INFERRED.
  ok(rows.every((r) => r.inContainer),
     'L3 [COUPLING] the bar hangs off the SVG container (.' + CONTAINER + ') at every viewport — got ' +
     Array.from(new Set(rows.map((r) => r.offsetParent))).join(', '));

  /* ── L4 · THE OTHER DIRECTION — THE LEG WHOSE ABSENCE SHIPPED A DEFECT ──────────────────────────
   * `top:0` passed L1-L3 with a clean 6/6 and the Captain immediately found the pill flush against
   * the nav. THIS GATE ASSERTED THE CLEARANCE BELOW AND WAS BLIND TO THE ONE ABOVE. A bar has two
   * edges; only one of them was being defended.
   * 🔑 GATING ONE DIRECTION OF A TWO-SIDED CONSTRAINT IS NOT PARTIAL COVERAGE — IT IS A GREEN THAT
   *    MEANS NOTHING ABOUT THE OTHER SIDE.
   *
   * ⛔⛔ AND THIS LEG OBEYS THE OPPOSITE RULE TO L2, WHICH IS EXACTLY WHY THE MISS WAS EASY.
   * L2 asserts the door clearance is IDENTICAL everywhere, because the bar scales WITH the drawing.
   * The nav does NOT scale with the drawing — it is screen-anchored — so this gap legitimately VARIES
   * and MUST be asserted as a MINIMUM, never as an equality. Measured at the shipped `top:0`:
   *     2560 170px · 1920 0px · 1680 26px · 1536 0px · 1440 45px · 1366 8px · 1280 58px · 1024 441px
   * ⭐ SO 1536x864 AND 1920x1080 **ARE** BINDING FOR THIS LEG, EVEN THOUGH NOTHING IS BINDING FOR L2.
   * Two couplings, two rules. Do not "harmonise" these two legs — they are measuring different
   * physics, and making them agree would break whichever one lost.
   * ⛔ MEASURED IN PIXELS, NOT CANVAS UNITS. The boundary is screen-anchored; expressing it in units
   * would divide out the very variation this leg exists to see. */
  const MIN_NAV_GAP = 8;          // measured floor is 10px at 1536x864; 8 leaves margin without slack
  const worstGap = Math.min(...rows.map((r) => r.navGapPx));
  const worstGapVp = (rows.find((r) => r.navGapPx === worstGap) || {}).vp;
  ok(rows.every((r) => r.navGapPx >= MIN_NAV_GAP),
     'L4 [OUTCOME · the other edge] the bar clears the NAV at every viewport — worst ' + worstGap +
     'px at ' + worstGapVp + ', floor ' + MIN_NAV_GAP + 'px (screen px, NOT canvas units — this gap ' +
     'VARIES by viewport, unlike L2)');

  ok(pageErrors.length === 0, 'R1 no page errors' + (pageErrors.length ? ' — *** ' + pageErrors[0].slice(0, 120) + ' ***' : ''));

  console.log('-------------------------------------');
  console.log('[_gate_lens_bar_clearance] ' + (fail === 0 ? 'GREEN' : 'RED') + '  ' + pass + '/' + (pass + fail) +
              ((SINK || UNPARENT || RISE) ? '   (mutation run: RED IS THE EXPECTED RESULT)' : ''));
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
