'use strict';
/* @gate-pool: browser
 *
 * A LIGHT AND ITS GLOW MUST NOT DISAGREE.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * A SIGNED-OUT VISITOR LOOKING AT THE STUDIO ENTRY OVERLAY, where a status dot reports whether they
 * are signed in — gold for in, red for out.
 *
 * WHY THIS GATE EXISTS. On 2026-08-28 the overlay's red was moved off the design source's #e27d61
 * and onto the estate's negative role (--red -> --danger-red -> --paint-red-lead, #e24b4a). The
 * ruling was applied to the `background` and NOT to the `box-shadow` on the same line, so the dot
 * rendered #e24b4a while its halo kept glowing #e27d61 — two different reds on one object, live,
 * for a day.
 *
 * 🔑 THE MECHANISM IS THE POINT, AND IT IS THE WHOLE ARGUMENT FOR THE PALETTE ARC: A RULING WRITTEN
 * AT THE TOKEN LAYER CANNOT REACH A LITERAL SITTING BESIDE IT. `background:var(--red)` moved for
 * free when the token moved; `box-shadow:0 0 9px rgba(226,125,97,.30)` could not, because nothing
 * about a raw rgba() participates in a token change. The two declarations describe ONE visual
 * object and only one of them was reachable.
 *
 * ⚠️ AND NO SWEEP FOUND THIS. Four versions of a proximity sweep were built and discarded: at ΔE 15
 * it could not find this very case; at ΔE 25 it found it alongside four black drop-shadows; filtered
 * further it still flagged --teal beside --teal-mid, which is two real tokens used together. A
 * literal near a role in the same rule IS NOT A DEFECT SIGNATURE — rules legitimately hold several
 * colours. This is a defect because a fill and its glow are ONE OBJECT, which is semantic, not
 * metric. It was found by reading the recorded ruling, and it is pinned here because the next one
 * will have to be found the same way.
 *
 * ⛔ THIS GATE DOES NOT ASSERT A CONSTANT. It asserts the RELATIONSHIP: whatever hue the dot is
 * painted, its glow must be the same hue. Pinning #e24b4a here would have to be re-edited every
 * time the negative role moves — and an instrument you must edit to keep green is an instrument
 * that will one day be edited to agree with a defect.
 *
 * Usage: node scripts/_gate_status_light_glow.js [--regress]
 *   --regress   restores the superseded rgba(226,125,97,.30) -> REDS L2 ONLY.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8449; const BASE = 'http://127.0.0.1:' + PORT;
const REGRESS = process.argv.includes('--regress');

const A_GLOW = 'box-shadow:0 0 9px rgba(226,75,74,.30)}';
const M_GLOW = 'box-shadow:0 0 9px rgba(226,125,97,.30)}';

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (REGRESS && /studio\.html$/.test(p)) {
    const src = body.toString('utf8');
    const n = src.split(A_GLOW).length - 1;
    if (n !== 1) { console.error(`anchor A_GLOW: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    body = Buffer.from(src.replace(A_GLOW, M_GLOW), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

/* Parse a computed colour to {r,g,b,a}. getComputedStyle always returns rgb()/rgba(), never hex,
   so this never has to deal with the hex-vs-rgba trap that cost three source sweeps this session. */
function parse(s) {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length < 3 || p.slice(0, 3).some(isNaN)) return null;
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
/* Hue-only comparison: a glow is allowed to differ in ALPHA (it is a halo, not a fill) and this
   gate must not forbid that. It forbids a different COLOUR. */
const sameHue = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  /* The overlay must be PRESENT — this gate reads it, so the usual skip flag is deliberately NOT
     set. If the overlay does not render, there is no subject and the gate aborts rather than
     passing over an absent element. */
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3800);

  console.log('[RUN] THE STATUS LIGHT AND ITS GLOW' + (REGRESS ? '   [MUTATED --regress]' : ''));

  const seen = await page.evaluate(() => {
    const out = {};
    for (const k of ['is-out', 'is-in']) {
      const el = document.querySelector('#studioOverlayWrap .status-light.' + k);
      if (!el) { out[k] = null; continue; }
      const cs = getComputedStyle(el);
      out[k] = { bg: cs.backgroundColor, shadow: cs.boxShadow };
    }
    return out;
  });

  /* L1 · THE SUBJECT EXISTS. Without this the two colour legs would compare null to null and pass. */
  const haveOut = !!(seen['is-out'] && seen['is-out'].bg && seen['is-out'].shadow);
  ok(haveOut, `L1 · the signed-out status light is present and painted [observed: ${JSON.stringify(seen['is-out'])}]`);

  if (!haveOut) {
    ok(false, 'L2 · fill/glow agreement NOT EVALUATED — no element to read');
    lines.forEach((l) => console.log(l));
    console.log(`SCORE ${pass}/${pass + fail} RED`);
    await browser.close(); server.close(); process.exit(2);
  }

  /* L2 · THE GLOW IS THE SAME COLOUR AS THE FILL. Alpha may differ; hue may not. */
  const bg = parse(seen['is-out'].bg);
  const glow = parse(seen['is-out'].shadow);
  ok(sameHue(bg, glow),
     `L2 · signed-out: the halo is the same colour as the dot ` +
     `[observed: fill rgb(${bg && [bg.r,bg.g,bg.b]}) vs glow rgb(${glow && [glow.r,glow.g,glow.b]})] — ` +
     `a ruling at the token layer cannot reach a literal beside it, and this is where that shows`);

  /* L3 · REGISTRATION ONLY, AND THE LIMIT IS STATED RATHER THAN HIDDEN.
     ⛔ THE FIRST VERSION OF THIS LEG READ THE RENDERED `.is-in` DOT AND WENT RED ON A CORRECT PAGE:
     the overlay renders `.is-out` OR `.is-in`, never both, and this harness has no Clerk session, so
     the signed-in dot CANNOT EXIST here. That was a rig fault wearing a product fault's clothes.
     The honest replacement asserts what this harness can actually see — that the rule is DECLARED —
     and says plainly that its RENDERING is unproven here. Registration and wiring, separately.
     ⚠️ ITS GLOW IS ALSO DELIBERATELY NOT ASSERTED EQUAL TO ITS FILL: brass-light over brass is what
     a light source normally does. Copying L2 onto it would red a design choice, not a defect. */
  /* ⛔ studioSource() IS THE ONLY DOOR — never a bare disk read of studio.html. The first version of
     this leg did `fs.readFileSync(ROOT/studio.html)` and it violated the Phase 0 contract: that file
     is being SPLIT, and on the day this content moves out a disk read asserts about text that is no
     longer there. Caught by _gate_studio_source.mjs — but only AFTER this file was committed, because
     that census enumerates with `git ls-files` and an UNTRACKED gate is invisible to it. */
  const src = studioSource();
  const declared = src.indexOf('#studioOverlayWrap .status-light.is-in{') !== -1;
  ok(declared,
     `L3 · REGISTRATION: the signed-in light's rule is declared [observed: rule present = ${declared}] — ` +
     `its RENDERING is not provable in this harness (no Clerk session; the overlay shows one dot, not both)`);

  lines.forEach((l) => console.log(l));
  console.log(`SCORE ${pass}/${pass + fail} ` + (fail ? 'RED' : 'GREEN'));
  await browser.close(); server.close();
  process.exit(fail ? 2 : 0);
})();
