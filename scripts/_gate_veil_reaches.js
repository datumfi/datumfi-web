'use strict';
/* @gate-pool: browser
 *
 * THE CHROME FOLLOWS THE PAINT.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * ANY VISITOR ON THE STUDIO — looking at the nav, the footer, the privacy banner, the two HUDs and
 * the requirements panel, which are the page field made near-opaque and laid back over itself.
 *
 * WHY THIS GATE EXISTS. Measured 2026-08-29 by flipping all 14 --paint-* tokens to a light palette:
 * seven surfaces were the ENTIRE "stayed dark" list, and every one of them spelled its colour as a
 * raw rgba(9,18,33,0.9x). A literal cannot be reached by a token, so the paint moved and the chrome
 * did not. They now read --veil-92/95/96/97/99, which derive from --paint-inkwell.
 *
 * ⛔ L3 IS THE POINT, AND IT ASSERTS A RELATIONSHIP RATHER THAN A CONSTANT. Pinning
 * "rgba(9,18,33,0.96)" would go green over a hardcoded literal — which is EXACTLY the defect this
 * gate exists to prevent, passing under the name of the fix. So L3 MOVES THE PAINT and requires the
 * chrome to move with it. The only way to make L3 green is for the derivation to be real.
 * 🔑 AN INSTRUMENT YOU MUST EDIT TO KEEP GREEN IS ONE THAT WILL EVENTUALLY BE EDITED TO AGREE WITH
 * A DEFECT — so this one never needs editing when the palette moves.
 *
 * ⚠️ WHAT THIS GATE CANNOT SEE, SAID PLAINLY RATHER THAN LEFT TO BE DISCOVERED: it runs in Chromium,
 * which HAS color-mix(), so it proves the @supports branch and NOT the :root literal fallback. A
 * PROOF INHERITS THE CAPABILITIES OF THE THING THAT RAN IT. The fallback is guarded instead by
 * L2, which pins each literal to the byte-exact value it replaced.
 *
 * Usage: node scripts/_gate_veil_reaches.js [--unwire]
 *   --unwire   restores one raw literal on the requirements panel -> REDS L3 ONLY.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8455; const BASE = 'http://127.0.0.1:' + PORT;
const UNWIRE = process.argv.includes('--unwire');

const A_WIRE = 'background:var(--veil-96, rgba(9, 18, 33, 0.96))';
const M_WIRE = 'background:rgba(9,18,33,0.96)';

/* The five veils and the byte-exact literal each one replaced. L2 pins these; if a fallback is ever
   retyped by hand this is what catches it on a browser that never reaches the @supports block. */
const VEILS = {
  '--veil-92': 'rgba(9, 18, 33, 0.92)',
  '--veil-95': 'rgba(9, 18, 33, 0.95)',
  '--veil-96': 'rgba(9, 18, 33, 0.96)',
  '--veil-97': 'rgba(9, 18, 33, 0.97)',
  '--veil-99': 'rgba(9, 18, 33, 0.99)'
};

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (UNWIRE && /studio\.html$/.test(p)) {
    const src = body.toString('utf8');
    const n = src.split(A_WIRE).length - 1;
    if (n !== 1) { console.error(`anchor A_WIRE: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    body = Buffer.from(src.replace(A_WIRE, M_WIRE), 'utf8');
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
  await page.waitForTimeout(4000);

  console.log('[RUN] THE CHROME FOLLOWS THE PAINT' + (UNWIRE ? '   [MUTATED --unwire]' : ''));

  /* L1 · POPULATION, AT AN EXACT SIZE. A predicate over an empty set is true, and one over a
     PARTIAL set is indistinguishable from one over the whole set in a green report. Five is not
     "at least one" — it is the number, and if it changes this leg must be re-grounded on purpose. */
  const declared = await page.evaluate((names) => {
    const cs = getComputedStyle(document.documentElement);
    const o = {}; for (const n of names) o[n] = cs.getPropertyValue(n).trim();
    return o;
  }, Object.keys(VEILS));
  const resolved = Object.values(declared).filter(Boolean).length;
  ok(resolved === 5,
     `L1 · POPULATION: exactly 5 veil roles are declared and resolve [observed: ${resolved}/5 — ${JSON.stringify(declared)}]`);

  /* L2 · THE FALLBACK LITERALS ARE THE BYTE-EXACT VALUES THEY REPLACED. This is the only leg that
     guards the pre-color-mix browser, because this browser never takes that branch. */
  const src = fs.readFileSync(path.join(ROOT, 'styles/tokens.css'), 'utf8');
  const bad = Object.entries(VEILS).filter(([n, lit]) => src.indexOf(n + ':     ' + lit) === -1 && src.indexOf(n + ': ' + lit) === -1 && !new RegExp(n + '\\s*:\\s*' + lit.replace(/[()]/g, '\\$&')).test(src));
  ok(bad.length === 0,
     `L2 · FALLBACK: every veil's :root literal is the byte-exact rgba() it replaced [observed: ${bad.length} mismatched${bad.length ? ' — ' + bad.map(b => b[0]).join(', ') : ''}]`);

  /* L3 · THE RELATIONSHIP. Move the paint; the chrome must move. A constant here would go green
     over the very literal this commit removed. */
  const SURFACES = ['#shape-want-face .requirements-panel', 'nav#app-nav', '#disclosure-footer'];
  const read = () => page.evaluate((sels) => sels.map(s => {
    const el = document.querySelector(s);
    return { s, bg: el ? getComputedStyle(el).backgroundColor : null };
  }), SURFACES);
  const before = await read();
  const missing = before.filter(r => r.bg === null).map(r => r.s);
  ok(missing.length === 0, `L3a · every surface under test exists [observed: ${missing.length ? 'MISSING ' + missing.join(', ') : 'all ' + SURFACES.length + ' present'}]`);

  await page.evaluate(() => {
    const s = document.createElement('style'); s.id = 'paint-probe';
    s.textContent = ':root{--paint-inkwell:#B45309;}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(500);
  const after = await read();
  const followed = before.filter((b, i) => b.bg && after[i].bg && b.bg !== after[i].bg).length;
  const present = before.filter(b => b.bg).length;
  ok(present > 0 && followed === present,
     `L3 · RELATIONSHIP: every chrome surface FOLLOWS --paint-inkwell when it moves ` +
     `[observed: ${followed}/${present} followed · ${before.map((b, i) => b.s.split(' ').pop() + ' ' + b.bg + '->' + after[i].bg).join(' | ')}] — ` +
     `a pinned constant here would pass over the raw literal this commit removed`);

  /* L4 · EVERY VEIL CALL CARRIES AN INLINE FALLBACK, AND THIS LEG EXISTS BECAUSE THE FIRST VERSION
     OF THIS COMMIT DID NOT.
     ⛔ header.css and tokens.css are SEPARATE REQUESTS. Wired as a bare var(--veil-96), the nav
     painted TRANSPARENT for the whole pre-stylesheet window on all 24 pages carrying the shared
     chrome — an unresolved custom property is invalid at computed-value time and `background` falls
     back to `initial`. HEAD painted it correctly because it held a literal. MEASURED with the
     stylesheet held back: HEAD rgba(9,18,33,0.96) vs bare-var rgba(0,0,0,0).
     🔑 THE AFTER-LOAD CHECK ("every page loads tokens.css") WAS TRUE AND TAKEN TOO LATE. A
     dependency that resolves eventually is not a dependency that resolves at first paint.
     This leg is source-level on purpose: the browser running it has already loaded everything, so
     it CANNOT observe the window it is protecting. It asserts the shape that makes the window safe. */
  const CONSUMERS = ['studio.html', 'styles/header.css', 'nav.js', 'scripts/datum-footer.js'];
  let bare = [];
  for (const f of CONSUMERS) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of t.matchAll(/var\(\s*(--veil-[0-9]+|--bg)\s*\)/g)) bare.push(f + ' ' + m[0]);
  }
  const withFallback = CONSUMERS.reduce((n, f) =>
    n + (fs.readFileSync(path.join(ROOT, f), 'utf8').match(/var\(\s*(?:--veil-[0-9]+|--bg)\s*,\s*[^)]+\)/g) || []).length, 0);
  ok(bare.length === 0 && withFallback >= 14,
     `L4 · PRE-STYLESHEET: every veil/bg call carries an inline fallback ` +
     `[observed: ${bare.length} bare${bare.length ? ' — ' + bare.slice(0, 3).join(', ') : ''}, ${withFallback} with fallback] — ` +
     `a bare var() paints TRANSPARENT until tokens.css lands, on all 24 pages carrying the shared chrome`);

  lines.forEach((l) => console.log(l));
  console.log(`SCORE ${pass}/${pass + fail} ` + (fail ? 'RED' : 'GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})();
