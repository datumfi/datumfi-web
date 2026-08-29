'use strict';
/* @gate-pool: browser
 *
 * THE PLOT OUTLINE — ONE LINE, THREE STATES, AND IT IS ON SCREEN THE WHOLE TIME.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * A USER LOOKING AT THE ESTATE CANVAS — first with nothing on it (THE PLOT), then with a home
 * (THE GROUNDS), then with that home carrying a mortgage (THE YARD).
 *
 * WHY THIS GATE EXISTS. Captain's report, 2026-08-29: the live outline read as "thick, spaced-out
 * dashed teal" against a mock that reads almost dotted. The ruling was Option B — a fine mark on a
 * tight repeat, square ends. THE CHANGE WAS ONE LINE AND NOTHING IN THE SUITE WOULD HAVE NOTICED IT
 * MOVING BACK: 245 gates ran green over `12 12` and would have run green over anything else.
 *
 * ⚠️ THE ELEMENT IS NOT THE ONE THE HANDOFF NAMED, AND THAT IS THE POINT OF L1. The outline was
 * documented as `.grounds-rect` (studio.html:1996, `stroke-dasharray:12 12`). It is not: every
 * `.grounds-rect` is emitted with an inline `stroke:none; fill:none` and is an INVISIBLE ANCHOR.
 * The visible line is `.grounds-boundary`, a <path> built in datum-estate.js and styled by an inline
 * setAttribute with NO CSS rule anywhere in the repo. Editing `.grounds-rect` to change the plot
 * would have left the plot untouched and silently restyled the TRUST WING instead — the one element
 * that rule really does reach. TWO WRONG OUTCOMES, NEITHER OF WHICH THROWS. L1 pins the subject so
 * the next person to read this cannot repeat it.
 *
 * ⚠️ AND IT IS MEASURED IN ALL THREE STATES ON PURPOSE. One `.grounds-boundary` serves THE PLOT,
 * THE GROUNDS and THE YARD — measured, not assumed. A gate that checked only the empty canvas would
 * pass over a regression that only a user with a house could see, and a user with a house is the
 * user who has actually done the work.
 *
 * Usage: node scripts/_gate_plot_outline.js [--nofix] [--round] [--noboundary]
 *   --nofix        restores `12 12` / 1.5 (the pre-ruling weight)  -> REDS L2 ONLY.
 *   --round        swaps butt caps for round caps                  -> REDS L3 ONLY.
 *   --noboundary   never appends the path at all                   -> REDS L1, AND L2+L3 WITH IT.
 *                  That superset is deliberate and is this control's entire job: it proves L2 and L3
 *                  FAIL over a missing element instead of quietly reading nothing and passing. A
 *                  predicate over an absent subject is the empty-set trap, and it is indistinguishable
 *                  from a pass in a green report. --nofix and --round stay DISJOINT from each other,
 *                  so those two are not one instrument wearing two names.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8441; const BASE = 'http://127.0.0.1:' + PORT;

const NOFIX = process.argv.includes('--nofix');
const ROUND = process.argv.includes('--round');
const NOBND = process.argv.includes('--noboundary');
const MUT   = NOFIX || ROUND || NOBND;

/* THE RULING, AS NUMBERS. Chromium paints `border: Npx dashed` as `stroke-dasharray: 3N 2N` at
   stroke-width N — measured in both directions at two widths, which is how the mock's CSS was
   translated to an SVG stroke at all. Option B is half that mark on the same repeat. */
const WANT_DASH = '1px, 2px';
const WANT_WIDTH = '1px';
const WANT_CAP = 'butt';

const A_DASH = 'stroke-dasharray:1 2; stroke-width:1; stroke-linecap:butt;';
const M_DASH = 'stroke-dasharray:12 12; stroke-width:1.5; stroke-linecap:butt;';
const A_CAP  = 'stroke-linecap:butt';
const M_CAP  = 'stroke-linecap:round';
const A_BND  = 'svgContainer.appendChild(gb);';
const M_BND  = '/* boundary never appended by --noboundary */';

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /datum-estate\.js$/.test(p)) {
    let src = body.toString('utf8');
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOFIX) apply(A_DASH, M_DASH, 'A_DASH');
    if (ROUND) apply(A_CAP, M_CAP, 'A_CAP');
    if (NOBND) apply(A_BND, M_BND, 'A_BND');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

const STATES = [
  { label: 'THE PLOT', accs: [] },
  { label: 'THE GROUNDS', accs: [
      { id: 'h1', baseId: 'property', name: 'Residence', value: 600000, propPurpose: 'Primary residence' } ] },
  { label: 'THE YARD', accs: [
      { id: 'h1', baseId: 'property', name: 'Residence', value: 600000, propPurpose: 'Primary residence' },
      { id: 'm1', baseId: 'mortgage_joint', name: 'Mortgage', value: 300000, linkedAssetId: 'h1' } ] }
];

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); localStorage.setItem('datum-discover-v1','done'); } catch (e) {} });
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3500);

  /* BOOT GUARD — `state` and `updateSVGs` are top-level `let`/`function` in studio.html's inline
     block, reachable by name. If the page never booted, EVERY leg below would report "no boundary"
     and --noboundary would look identical to a green run of the real thing. A rig that cannot tell
     its own failure from the product's is not an instrument. This caught a Windows path-separator
     fault in the probe this gate grew out of, which had been 404-ing every asset. */
  const boot = await page.evaluate(() => {
    try { return { st: typeof state !== 'undefined', up: typeof updateSVGs === 'function', svg: !!document.getElementById('bp-svg') }; }
    catch (e) { return { st: false, up: false, svg: false, err: String(e) }; }
  });
  if (!boot.st || !boot.up || !boot.svg) {
    console.log('[RUN] THE PLOT OUTLINE');
    console.log('ABORT: the Studio never booted (' + JSON.stringify(boot) + ') — no verdict is rendered.');
    console.log('SCORE 0/0 ABORT');
    await browser.close(); server.close(); process.exit(1);
  }

  /* ⚠️ updateSVGs IS DEBOUNCED — reading the canvas in the same tick reads the PREVIOUS render. */
  async function look(accs) {
    await page.evaluate((a) => { state.accounts = a; updateSVGs(); }, accs);
    await page.waitForTimeout(1600);
    return page.evaluate(() => {
      const svg = document.getElementById('bp-svg');
      const txt = svg ? (svg.textContent || '').replace(/\s+/g, ' ').trim() : '';
      const els = svg ? Array.from(svg.querySelectorAll('.grounds-boundary')) : [];
      const seen = /THE YARD/.test(txt) ? 'THE YARD'
                 : /THE GROUNDS/.test(txt) ? 'THE GROUNDS'
                 : /THE PLOT/.test(txt) ? 'THE PLOT' : '(none)';
      if (!els.length) return { seen, count: 0 };
      const s = getComputedStyle(els[0]);
      return { seen, count: els.length, dash: s.strokeDasharray, width: s.strokeWidth, cap: s.strokeLinecap };
    });
  }

  console.log('[RUN] THE PLOT OUTLINE — ONE LINE, THREE STATES' + (MUT ? '   [MUTATED]' : ''));

  for (const st of STATES) {
    const r = await look(st.accs);

    /* L1 · THE SUBJECT EXISTS, AND IT IS THE STATE WE ASKED FOR. Both halves matter: the label
       proves the FIXTURE landed (otherwise we are measuring some other state's outline and calling
       it this one), and the count proves the ELEMENT is there to measure at all. */
    const landed = r.seen === st.label;
    const present = r.count === 1;
    ok(landed && present,
       `L1 · ${st.label}: the canvas is in this state and carries exactly ONE .grounds-boundary ` +
       `[observed: label="${r.seen}", .grounds-boundary count=${r.count}] — the visible outline is ` +
       `this <path>, never .grounds-rect (which is an invisible anchor and reaches the trust wing)`);

    if (!landed || !present) {
      ok(false, `L2 · ${st.label}: dash/width NOT EVALUATED — no boundary to read (this is the fail a missing element must produce, never a silent pass)`);
      ok(false, `L3 · ${st.label}: linecap NOT EVALUATED — no boundary to read`);
      continue;
    }

    /* L2 · THE WEIGHT AND THE REPEAT — the whole of the Captain's ruling. */
    ok(r.dash === WANT_DASH && r.width === WANT_WIDTH,
       `L2 · ${st.label}: the outline is a fine mark on a tight repeat ` +
       `[observed: dasharray="${r.dash}" width="${r.width}" · want "${WANT_DASH}" / "${WANT_WIDTH}"]`);

    /* L3 · SQUARE ENDS. Round caps were offered as Option C and explicitly refused, so this is a
       ruling to hold, not a default to inherit. Round caps also fatten a 1px mark visibly. */
    ok(r.cap === WANT_CAP,
       `L3 · ${st.label}: the marks keep SQUARE ends [observed: linecap="${r.cap}" · want "${WANT_CAP}"]`);
  }

  lines.forEach((l) => console.log(l));
  const total = pass + fail;
  console.log(`SCORE ${pass}/${total} ` + (fail ? 'RED' : 'GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})();
