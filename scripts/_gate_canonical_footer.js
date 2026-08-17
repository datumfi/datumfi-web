/* @gate-pool: browser
 *
 * ⛔⛔ ONE FOOTER, EVERY PAGE — AND "ONE" IS THE CLAIM THIS GATE EXISTS TO KEEP TRUE.
 *
 * THE DEFECT IT REPLACED, MEASURED 2026-08-14 BEFORE A BYTE MOVED. Fifteen tracked pages each held
 * their own copy of the legal footer, and they had drifted on every axis:
 *   · SIX version strings live at once — index/IndexV3 v2.3.5, sketch v3.2.4 (HIGHER than the front
 *     door), studio v1.0.0, and four pages with none at all.
 *   · FOUR different disclaimer TEXTS.
 *   · `Do Not Sell My Information` — the CCPA/CPRA link — ABSENT FROM EIGHT OF FIFTEEN, INCLUDING
 *     index.html and sketch.html.
 * 🔑 THE VERSION NUMBER WAS NEVER THE DEFECT; IT WAS THE ONLY PART OF THE DIVERGENCE THAT HAPPENED
 *    TO BE LEGIBLE. Nobody diffs a paragraph of boilerplate across fifteen files — so the drift was
 *    invisible right up until someone happened to read two version numbers side by side.
 *
 * ⭐⭐ AND THAT IS WHY THE FIX WAS A MODULE AND NOT FIFTEEN EDITS: THESE COPIES DID NOT DIVERGE BY
 * MALICE. SOMEBODY MADE THEM IDENTICAL ONCE, AND THEY DRIFTED. Hand-editing fifteen files to match
 * recreates the exact conditions that produced this census and buys a guarantee that expires the day
 * someone edits one of them. THIS GATE IS WHAT MAKES "THEY MATCH" A PROPERTY RATHER THAN A MEMORY.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 * F1 · POPULATION   every tracked page carrying a #disclosure-footer host LOADS the module.
 *                   ⭐ DERIVED FROM THE REPO, NEVER A MANIFEST — a hand-kept page list would rot on
 *                   exactly the commit that adds the sixteenth page, which is when it matters most.
 *                   This is _gate_parts_wired's law applied to the first shared module outside
 *                   studio.html: A REGISTERED MODULE IS NOT A LOADED MODULE, and fifteen pages are
 *                   fifteen chances to forget a tag.
 * F2 · NO SECOND COPY   no page carries the legal text inline, AND no orphaned .footer-row markup
 *                   survives outside the host. A copy left behind is the sixteenth divergent copy —
 *                   the defect, restored, wearing the fix's clothes.
 * F3 · RENDERED == SOURCE   on EVERY page the rendered footer equals _datumFooterHTML() byte for
 *                   byte. §18.3's owed leg, and it is only a meaningful claim because there is
 *                   exactly one place to change it.
 * F4 · BOTH RIGHTS LINKS   `Delete My Data` AND `Do Not Sell My Information` render on every page.
 *                   ⛔ §23.4's ACCEPTANCE CRITERION, NOT A NICE-TO-HAVE. Neither the Wirer nor the
 *                   Architect may author a rights link — but both may refuse to ship a canonisation
 *                   that drops one. This leg is that refusal, made permanent.
 * F5 · ONE VERSION  exactly one distinct version string across the whole population.
 * F6 · NO THROW     no page errors while rendering it.
 * F7 · RENDERED STYLE  the footer paragraph COMPUTES to ~10px and a contrast ratio clearing WCAG AA on every
 *                   page. ⛔ ADDED AFTER SHIPPING THE DEFECT F3 COULD NOT SEE: identical markup
 *                   rendered as huge white text on 13 of 15 pages. IDENTICAL MARKUP IS NOT
 *                   IDENTICAL RENDERING.
 *                   ⭐⭐ ITS BACKGROUND IS NOW SAMPLED FROM THE RENDERED PIXEL, NOT WALKED IN THE DOM
 *                   (2026-08-16). The walk could only read `backgroundColor`, so a GRADIENT was
 *                   invisible to it (a gradient is `background-image`) and a TRANSLUCENT ancestor was
 *                   composited over ASSUMED BLACK — both errors leaning toward "all clear".
 *                   ⛔ AN ACCESSIBILITY GATE THAT MEASURES THE WRONG BACKGROUND DOES NOT FAIL. IT
 *                   PASSES, AND CERTIFIES A CONTRAST NOBODY HAS. Measured under --gradient: the walk
 *                   reports 4.48:1 on a footer that actually renders at 1.16:1.
 *                   ⭐ AND THE AGREEMENT IS THE NEGATIVE CONTROL: on all 15 pages today, sampled and
 *                   walked agree exactly (4.51:1). The new method invents no differences; it only
 *                   sees the ones the old one could not.
 *
 * ── CONTROLS · RED-FIRST BY MUTATION ────────────────────────────────────────────────────────────
 *   --drift     re-injects a DIVERGENT inline footer into one page, reproducing the original defect
 *               (old text + the v2.3.5 string). ⚠️ IT REDS **F2 ONLY**, AND THE HEADER SAID F2/F3/F5
 *               UNTIL IT WAS RUN. F3/F5 stay green because the module OVERWRITES the host at
 *               DOMContentLoaded, so a stray inline copy never reaches the user — the module HEALS
 *               the page and only the SOURCE is polluted. That is worth knowing rather than
 *               papering over: the runtime is safe, the repo is not, and F2 is the leg that says so.
 *               🔑 A CONTROL'S DOCUMENTED BLAST RADIUS IS A CLAIM. RUN IT BEFORE WRITING IT DOWN.
 *   --untagged  removes the module's <script> from one page. F1 MUST go RED and name the page.
 *   --dim       serves the module with the paragraph alpha wound back to the 0.25 that shipped until
 *               2026-08-15. MEASURED BLAST RADIUS, RUN NOT ASSUMED: F7 reds on ALL FIFTEEN pages at
 *               2.2:1 and NOTHING ELSE moves. That is the leg doing exactly its own job.
 *               ⚠️ It read 2.21:1 under the old DOM walk and 2.2:1 under sampling — RE-RUN, not
 *               re-reasoned, because a documented measurement that quietly stops matching is the
 *               stale-comment trap wearing a number.
 *               ⚠️ Building it surfaced a latent fault in the mutation server: it hardcoded
 *               Content-Type text/html, which was harmless while only HTML was ever mutated but
 *               would have made a mutated .js unexecutable — reding F1/F3 while looking like a
 *               working contrast control. A CONTROL THAT REDS THE WRONG LEG STILL PRINTS RED.
 *   --gradient  paints a LIGHT radial gradient behind the footer and makes the host translucent —
 *               the exact surface treatment the skin arc introduces. MEASURED: F7 reds ALONE, and
 *               the sampled ground reads rgb(220,220,220) at 1.16:1 while the old DOM walk still
 *               reports 4.48:1. THAT GAP IS THE WHOLE REASON THIS LEG WAS REWRITTEN.
 *
 * Usage: node scripts/_gate_canonical_footer.js [LABEL] [--drift|--untagged|--dim|--gradient]
 * Set F7_VERBOSE=1 to print the sampled ground and both contrast numbers for every page.
 * Self-hosts on 127.0.0.1:8385 — NOT :8001, the suite runner's shared server. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const DRIFT = process.argv.includes('--drift');
const UNTAGGED = process.argv.includes('--untagged');
const DIM = process.argv.includes('--dim');
/* --gradient · THE CONTROL FOR F7's GRADIENT AWARENESS. Paints a LIGHT radial gradient behind the
   footer and makes the host translucent — the exact surface treatment the skin arc introduces.
   White 40% text over a light ground fails AA badly, so F7 MUST go red.
   ⛔ THE OLD DOM-WALK CANNOT SEE IT: a gradient is `background-image`, so `backgroundColor` reads
   `transparent` and the walk skips straight past to whatever is behind. This gate prints BOTH
   numbers under the control so the divergence is visible rather than argued. */
const GRADIENT = process.argv.includes('--gradient');
const PORT = 8385;
const MODULE_REL = 'scripts/datum-footer.js';
const HOST_ID = 'disclosure-footer';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ⛔ -z, AND THAT IS NOT PEDANTRY — IT IS A PAID-FOR BUG. The first census of this population split
   `git ls-files` on newlines, so `Datum FI — First Principles.html` came back QUOTED, never resolved,
   and was silently dropped. The whole arc was planned against "14 pages" when there were FIFTEEN.
   🔑 A PATH WITH A SPACE IN IT IS A POPULATION BUG WAITING FOR A LOOP THAT ASSUMES OTHERWISE. */
/* Hand the PNG back to the page and let the BROWSER'S OWN decoder put it on a canvas — no image
   library, so no new dependency and no lockfile churn (Doctrine #34) for one pixel. */
async function readPixel(page, png) {
  return page.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  }, 'data:image/png;base64,' + png.toString('base64'));
}

const trackedHtml = () => execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter((f) => f.trim() && fs.existsSync(path.join(ROOT, f)));

const footerPages = trackedHtml().filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes(HOST_ID));

/* THE DRIFT MUTATION — the ORIGINAL defect, not an approximation of it: the pre-canonical disclaimer
   text and index.html's old v2.3.5 build string, injected back into one page's host. */
const DRIFT_PAGE = 'index.html';
const DRIFT_HOST = '<div id="disclosure-footer"></div>';
const DRIFT_COPY = '<div id="disclosure-footer"><p>DATUM FI is an educational tool and does not constitute financial, '
  + 'investment, or tax advice. &nbsp;|&nbsp; <a href="/privacy.html">Privacy Policy</a> &nbsp;|&nbsp; '
  + 'Build&nbsp;2026.05.08&nbsp;&bull;&nbsp;v2.3.5</p></div>';
const UNTAG_PAGE = 'sketch.html';
const UNTAG_T = '<script src="/scripts/datum-footer.js"></script>';

/* --dim · THE CONTROL FOR F7's CONTRAST LEG. Serves the module with the paragraph alpha wound back
   to the 0.25 that shipped until 2026-08-15, which measured 2.21:1 — below the 4.5:1 AA floor and
   below even the 3:1 large-text floor. F7 MUST go red on every page.
   ⛔ WITHOUT THIS THE LEG IS UNTESTED. A contrast assertion that has never been SEEN to fail is a
   number in a file: if the composite maths were wrong in the safe direction it would return a
   comfortable ratio forever and report all-clear on an illegible footer. THE ONE THING THIS GATE
   EXISTS TO CATCH IS A FOOTER NOBODY CAN READ. */
/* ⚠️ THE ANCHOR MOVED WITH THE DECLARATION IT POISONS, 2026-08-16. The paragraph stopped
   hard-coding rgba(255,255,255,0.45) and now reads --text-muted, so the old anchor matched 0x and
   the gate ABORTED rather than reporting a green it had not earned.
   ⭐ THAT ABORT IS THE FEATURE. A POISON THAT DOES NOT LAND MUST FAIL LOUDLY — had this control
      merely "found nothing and carried on", F7's contrast leg would have gone permanently untested
      on the exact commit that changed the colour it measures.
   🔑 A CONTROL ANCHORED TO A LITERAL IS COUPLED TO THAT LITERAL. When the product stops spelling
      something the old way, the control breaks BEFORE the assertion does — which is the right order
      for that to happen in. */
const DIM_FROM = 'color:var(--text-muted,rgba(255,255,255,0.55));line-height:1.6';
const DIM_TO = 'color:rgba(255,255,255,0.25);line-height:1.6';

const mutated = {};
if (DIM) {
  const src = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const n = src.split(DIM_FROM).length - 1;
  if (n !== 1) { console.log(`[canonical_footer] ABORT — --dim anchor found ${n}x in ${MODULE_REL}, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  mutated['/' + MODULE_REL] = src.replace(DIM_FROM, DIM_TO);
}
if (DRIFT || UNTAGGED) {
  const rel = DRIFT ? DRIFT_PAGE : UNTAG_PAGE;
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const [t, b, name] = DRIFT ? [DRIFT_HOST, DRIFT_COPY, '--drift'] : [UNTAG_T, '<!-- tag removed by --untagged -->', '--untagged'];
  const n = src.split(t).length - 1;
  if (n !== 1) { console.log(`[canonical_footer] ABORT — ${name} anchor in ${rel} found ${n}x, expected 1. A red-first that did not land proves nothing.`); process.exit(2); }
  mutated['/' + rel] = src.replace(t, b);
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  /* ⛔ MIME BY EXTENSION, NOT A HARDCODED text/html. --drift and --untagged only ever mutate HTML, so
     the constant was harmless until --dim started mutating the MODULE: a .js served as text/html is
     REFUSED by the browser's strict MIME checking, the module never executes, and the run reds F1/F3
     instead of the contrast leg it was built to test.
     🔑 A CONTROL THAT REDS THE WRONG LEG STILL PRINTS RED, AND READS LIKE IT WORKED. */
  if (mutated[u]) { r.writeHead(200, { 'Content-Type': MIME[path.extname(u)] || 'text/html' }); return r.end(mutated[u]); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

const fails = [];
const fail = (leg, msg) => fails.push(`${leg}: ${msg}`);

(async () => {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));

  // ── F1 · POPULATION — a source check, before a browser is even started. ───────────────────────
  if (!footerPages.length) fail('F0 FIXTURE', 'no tracked page carries a #disclosure-footer — the population is empty and every leg below would be vacuous');
  for (const rel of footerPages) {
    let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (mutated['/' + rel]) src = mutated['/' + rel];
    if (!src.includes('src="/' + MODULE_REL + '"')) fail('F1 POPULATION', `${rel} has a #${HOST_ID} host but never loads /${MODULE_REL} — its footer will render EMPTY`);
    /* F2 — the host must be EMPTY. Anything between the tags is a second copy of legal text. */
    const m = src.match(/<div id="disclosure-footer"[^>]*>([\s\S]*?)<\/div>/);
    if (m && m[1].trim()) fail('F2 NO-SECOND-COPY', `${rel} still carries inline footer content (${m[1].trim().length} chars) — a copy left behind is the next divergent copy`);
    /* ⛔⛔ F2b · NO ORPHANED FOOTER ROWS — ADDED AFTER SHIPPING EXACTLY THIS, ON THREE PAGES.
       The conversion regex was NON-GREEDY, and index/IndexV3/sketch had NESTED divs inside their
       footer, so it matched only to the FIRST </div>. The inner `.footer-row` blocks were orphaned
       OUTSIDE the canonical host and rendered as a visible SECOND legal stack — carrying the stale
       v2.3.5 and v3.2.4 build strings the whole arc existed to retire. F2 could not see them because
       it only inspects INSIDE the host, and the leftovers were outside it.
       ⚠️ AND THE FIRST CLEANUP MISSED TWO OF THE THREE because its pattern hard-coded 
 and those
       files are CRLF. A PATTERN THAT ENCODES A LINE ENDING WORKS ON SOME OF YOUR FILES.
       🔑 A STRUCTURAL EDIT MADE BY PATTERN-MATCHING IS A GUESS ABOUT NESTING. Assert what is left
          BEHIND, not only what was replaced. */
    if (/class="footer-row"/.test(src)) fail('F2b ORPHANS', `${rel} still contains .footer-row markup — orphaned rows from the conversion render as a SECOND legal block outside the canonical footer`);
  }

  const browser = await chromium.launch();
  const rendered = {};
  const versions = new Set();
  for (const rel of footerPages) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    /* ⛔ MEASURE THE STATE THE USER READS THE FOOTER IN. studio.html and sketch.html open behind an
       ENTRY OVERLAY — a dark scrim — and with it up the footer's settled ground samples at
       rgb(4,8,16) instead of rgb(9,18,33), giving a stable, reproducible, entirely real 4.48:1.
       ⚠️ THAT NUMBER IS TRUE AND IRRELEVANT: nobody reads the disclosure through the scrim, and a
       gate that reds on a state the user never reads is a gate people switch off. Every other
       browser gate in this repo skips the overlay for exactly this reason.
       🔑 STABLE IS NOT THE SAME AS CORRECT. The settle loop proved the reading was not a timing
          artefact — it could not tell me I was measuring the wrong MOMENT of the journey. */
    await page.addInitScript(() => { try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {} });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 110)));
    await page.goto(`http://127.0.0.1:${PORT}/${encodeURIComponent(rel)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    if (GRADIENT) {
      await page.addStyleTag({ content:
        `body { background-image: radial-gradient(circle at 50% 100%, #d9d9d9 0%, #d9d9d9 100%) !important; }
         #${HOST_ID} { background-color: rgba(255,255,255,0.10) !important; }` });
      await page.waitForTimeout(150);
    }
    const r = await page.evaluate(() => {
      const host = document.getElementById('disclosure-footer');
      if (!host) return { missing: true };
      const t = host.textContent || '';
      return {
        html: host.innerHTML,
        /* ⭐ THE SOURCE OF TRUTH IS THE MODULE'S OWN FUNCTION, READ IN THE PAGE. Comparing the
           rendered markup to a string copied into this gate would make the gate a SIXTEENTH copy —
           and it would drift for exactly the same reason the fifteen did. */
        /* ⛔ BOTH SIDES THROUGH THE SAME PARSER, AND THAT IS EXACTNESS, NOT LENIENCY. The rendered
           innerHTML is what the browser PARSED AND RE-SERIALISED: it folds `&bull;` (6 chars) to the
           literal • (1), so a raw string compare showed a 5-char delta on all 15 pages and reported
           a divergence that does not exist. Feeding the canonical string through a detached element
           normalises it identically, so the comparison stays byte-for-byte on the DOM the user
           actually gets. 🔑 COMPARE ARTEFACTS OF THE SAME KIND — a source string and a serialised
           DOM are not the same kind, and the difference is not always 5 harmless characters. */
        canonical: (function () {
          if (typeof _datumFooterHTML !== 'function') return null;
          var d = document.createElement('div');
          d.innerHTML = _datumFooterHTML();
          return d.innerHTML;
        })(),
        /* ⛔⛔ THE RENDERED SIZE AND COLOUR, NOT JUST THE MARKUP — ADDED AFTER SHIPPING THE DEFECT.
           F3 compared innerHTML across all 15 pages and passed, because the markup WAS identical.
           The paragraph had no styling of its own and only 2 of 15 pages carried a
           `#disclosure-footer p` rule, so everywhere else it inherited the page default and rendered
           as LARGE BRIGHT WHITE TEXT — on the Studio, among the biggest type on screen.
           🔑 IDENTICAL MARKUP IS NOT IDENTICAL RENDERING. A gate that compares bytes will say yes to
              fifteen pages that look nothing alike. Assert the COMPUTED result, on the element the
              user actually reads. */
        /* ⭐ CONTRAST, NOT A COLOUR STRING. This leg used to pin the literal `rgba(255,255,255,0.25)`,
           which made it a spelling check: it would have passed a theme that darkened the BACKGROUND
           to the point of illegibility, and it went red on a change that made the text MORE readable.
           The reason the colour was ever specified is legibility, so the gate now measures legibility
           — composite the text alpha over the composited background and compute the WCAG ratio.
           ⚠️ This is the leg the Architect asked for when they noted 4.51 clears 4.50 by 0.01: that
           margin cannot survive a casual theme edit, and now it does not have to survive unnoticed. */
        pFont: (function () { var q = host.querySelector('p'); if (!q) return null;
          var c = getComputedStyle(q);
          var ps = function (s) { var m = (s || '').match(/[\d.]+/g); if (!m) return null;
            return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 }; };
          var ov = function (f, b) { return { r: f.a * f.r + (1 - f.a) * b.r,
            g: f.a * f.g + (1 - f.a) * b.g, b: f.a * f.b + (1 - f.a) * b.b, a: 1 }; };
          var li = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          var L = function (x) { return 0.2126 * li(x.r) + 0.7152 * li(x.g) + 0.0722 * li(x.b); };
          /* Walk up for the first non-transparent background so the ratio is against what is really
             behind the text, not against an assumed page colour. */
          var bg = null;
          for (var n = q; n && n.nodeType === 1 && !bg; n = n.parentElement) {
            var cand = ps(getComputedStyle(n).backgroundColor);
            if (cand && cand.a > 0) bg = cand.a === 1 ? cand : null, bg = bg || ov(cand, { r: 0, g: 0, b: 0, a: 1 });
          }
          if (!bg) bg = { r: 0, g: 0, b: 0, a: 1 };
          var fg = ov(ps(c.color) || { r: 255, g: 255, b: 255, a: 1 }, bg);
          var l1 = L(fg), l2 = L(bg);
          var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          return { size: parseFloat(c.fontSize), color: c.color, legacyContrast: Math.round(ratio * 100) / 100 }; })(),
        deleteData: /Delete My Data/.test(t),
        doNotSell: /Do Not Sell My Information/.test(t),
        version: (t.match(/Build\s*[\d.]+\s*[•·]\s*v[\d.]+/) || [null])[0],
      };
    });
    if (r.missing) { fail('F3 RENDER', `${rel} has no #${HOST_ID} element at runtime`); await ctx.close(); continue; }

    /* ── F7's BACKGROUND IS SAMPLED, NOT COMPUTED ────────────────────────────────────────────
     * The DOM walk that used to answer this question could only read `backgroundColor`, so:
     *   · a GRADIENT is invisible to it (a gradient is `background-image`; backgroundColor is
     *     `transparent`), and the walk skips the panel entirely;
     *   · a TRANSLUCENT ancestor was composited over ASSUMED BLACK, and the no-background
     *     fallback was BLACK too — both of which OVERSTATE contrast for white text.
     * ⛔ AN ACCESSIBILITY GATE THAT MEASURES THE WRONG BACKGROUND DOES NOT FAIL. IT PASSES, AND
     *    CERTIFIES A CONTRAST NOBODY HAS. Every one of those errors leans toward "all clear".
     * ⭐ So stop reasoning about the stack and ASK THE RENDERER: hide the glyphs, photograph one
     *    pixel where the text sits, and read it back. Gradients, translucency, images, blend modes
     *    and anything invented later are all already composited into that pixel.
     * ⚠️ NO NEW DEPENDENCY: the PNG goes back into the page as a data URL and the BROWSER'S OWN
     *    decoder puts it on a canvas. Adding a decoder would drag in the lockfile discipline
     *    (Doctrine #34) for one number. */
    let sampled = null, sampleErr = null;
    try {
      /* ⛔⛔ NO COORDINATE MATH. Two rig faults came from doing it by hand: getBoundingClientRect is
         VIEWPORT-relative while screenshot({clip}) is not, and studio.html's .drafting-panel is an
         INTERNAL SCROLL CONTAINER, so scrollIntoView moves the panel while window.scrollY stays 0 —
         which sampled a pixel that was not under the text at all and produced a plausible, wrong
         4.48:1. A NUMBER THAT LOOKS LIKE A FINDING IS THE MOST EXPENSIVE KIND OF RIG FAULT.
         Screenshot the ELEMENT and let Playwright handle scrolling it into view; then every pixel
         in that image is the paragraph's own ground, so the centre one needs no arithmetic. */
      const box = await page.evaluate((id) => {
        const q = document.getElementById(id) && document.getElementById(id).querySelector('p');
        if (!q) return null;
        q.setAttribute('data-f7-prev-color', q.style.color || '');
        q.style.color = 'transparent';                       // glyphs off: the pixel is pure ground
        const b = q.getBoundingClientRect();
        return { w: b.width, h: b.height };
      }, HOST_ID);
      if (!box || box.w < 2 || box.h < 2) throw new Error(`no measurable <p> box (${JSON.stringify(box)})`);
      /* A VIEWPORT screenshot is always fully composited and opaque. An ELEMENT screenshot can carry
         an alpha channel where the element itself paints nothing, which is how a transparent <p>
         came back at roughly half the page navy and looked like a contrast finding.
         scrollIntoViewIfNeeded handles INTERNAL scroll containers (studio's .drafting-panel), which
         window.scrollY cannot see. */
      const loc = page.locator(`#${HOST_ID} p`).first();
      await loc.scrollIntoViewIfNeeded();
      const vb = await loc.boundingBox();
      if (!vb || vb.width < 2 || vb.height < 2) throw new Error(`no viewport box (${JSON.stringify(vb)})`);
      /* ⛔⛔ WHEN A GATE LOOKS IS LOAD-BEARING. studio.html and sketch.html run an entry-overlay
         fade, and sampling mid-transition returned a DIFFERENT ground on consecutive runs —
         rgb(5,10,20) then rgb(3,8,19) — each a plausible ~4.48:1 that looked exactly like a real
         contrast finding on the two most important pages in the product.
         🔑 A MOVING SURFACE WILL HAND YOU A NUMBER; IT JUST WILL NOT HAND YOU THE SAME ONE TWICE.
         So the ground must be SETTLED before it counts: read it repeatedly and require two
         consecutive identical samples. If it never settles the blindness assertion fires and F7
         ABORTS rather than scoring whichever frame it happened to catch. */
      const shoot = async () => page.screenshot({ clip: { x: Math.round(vb.x + vb.width / 2), y: Math.round(vb.y + vb.height / 2), width: 1, height: 1 } });
      let png = await shoot(), prev = await readPixel(page, png), settled = false;
      for (let i = 0; i < 12 && !settled; i++) {
        await page.waitForTimeout(250);
        png = await shoot();
        const now = await readPixel(page, png);
        if (now && prev && now.r === prev.r && now.g === prev.g && now.b === prev.b && now.a === prev.a) settled = true;
        prev = now;
      }
      if (!settled) throw new Error('background never settled (still animating after 3s)');
      await page.evaluate((id) => {
        const q = document.getElementById(id) && document.getElementById(id).querySelector('p');
        if (q) { q.style.color = q.getAttribute('data-f7-prev-color') || ''; q.removeAttribute('data-f7-prev-color'); }
      }, HOST_ID);
      sampled = await readPixel(page, png);
    } catch (e) { sampleErr = String(e.message || e).slice(0, 120); }

    /* BLINDNESS ASSERTION — if the ground could not be photographed, F7 must ABORT, never score.
       A contrast number computed from a background nobody measured is the defect, not the report. */
    if (!sampled || sampleErr || !(sampled.a > 0)) {
      fail('F7 RENDERED-STYLE', `${rel} — could not SAMPLE the footer's rendered background (${sampleErr || 'transparent pixel'}). F7 refuses to score a contrast it cannot see.`);
      if (r.pFont) r.pFont.unmeasurable = true;   // ONE finding per fault, never two
    } else if (r.pFont) {
      /* ⛔⛔ NOTATION-AWARE, AND IT HAD TO BE. `color(srgb 1 1 1 / 0.55)` has 0-1 COMPONENTS, NOT
         0-255 — a bare number-scrape reads WHITE AS NEAR-BLACK. The moment the footer paragraph
         stopped hard-coding rgba() and started reading --text-muted, F7 went RED ON ALL 15 PAGES
         AT 1.06:1 for text that actually measures ~6.2:1.
         ⭐ THE PRODUCT WAS FINE AND THE INSTRUMENT WAS WRONG — and this is the SECOND instrument
            with the identical defect: _gate_contrast_census.js carried it too, where it mis-scored
            72 of 369 runs. That one was found first and NOT SWEPT, so this one bit.
         🔑 WHEN AN INCIDENT REVEALS A CLASS, SWEEP THE CLASS *BEFORE* THE NEXT COMMIT. A defect
            found and fixed in one instrument is a defect you now know is in the others.
         ⚠️ AND NOTE WHICH DIRECTION IT FAILS: it UNDER-reports contrast, so it manufactures
            findings rather than hiding them. Had it leaned the other way this would have shipped. */
      const px = (s) => {
        const t = (s || '').trim();
        const m = t.match(/[\d.]+/g);
        if (!m) return null;
        if (/^color\(\s*srgb\b/i.test(t)) return { r: +m[0] * 255, g: +m[1] * 255, b: +m[2] * 255, a: m.length > 3 ? +m[3] : 1 };
        if (/^(oklab|oklch|lab|lch|color)\(/i.test(t)) return null;   // unknown notation: never guessed
        return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
      };
      const over = (f, b) => ({ r: f.a * f.r + (1 - f.a) * b.r, g: f.a * f.g + (1 - f.a) * b.g, b: f.a * f.b + (1 - f.a) * b.b });
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (x) => 0.2126 * lin(x.r) + 0.7152 * lin(x.g) + 0.0722 * lin(x.b);
      const bg = { r: sampled.r, g: sampled.g, b: sampled.b };
      /* ⛔ NO DEFAULT-TO-WHITE. `|| {255,255,255,1}` was A GUESS THAT SCORES: it would invent a
         foreground for any notation px() does not know and then report a confident ratio for it.
         An unreadable colour makes the paragraph UNMEASURABLE — the same treatment an unsamplable
         background already gets — because F7 REFUSES TO SCORE A CONTRAST IT CANNOT SEE.
         🔑 A GUESS THAT SCORES IS WORSE THAN A GAP THAT ABORTS. */
      const fgc = px(r.pFont.color);
      if (!fgc) {
        fail('F7 RENDERED-STYLE', `${rel} — footer text colour "${r.pFont.color}" is in a notation this gate cannot read, so its contrast is unknown. F7 refuses to score a colour it cannot parse.`);
        r.pFont.unmeasurable = true;
      } else {
      const fg = over(fgc, bg);
      const l1 = lum(fg), l2 = lum(bg);
      r.pFont.sampledBg = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
      r.pFont.contrast = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
      if (GRADIENT || process.env.F7_VERBOSE) {
        console.log(`   [F7] ${rel}  sampled bg ${r.pFont.sampledBg} (a=${sampled.a}) -> ${r.pFont.contrast}:1   |   old DOM-walk said ${r.pFont.legacyContrast}:1`);
      }
      }
    }

    if (r.canonical === null) fail('F3 RENDER', `${rel} — _datumFooterHTML is not defined, so the module never loaded; the footer cannot be canonical`);
    else if (r.html !== r.canonical) fail('F3 RENDER', `${rel} — rendered footer does NOT match _datumFooterHTML() byte for byte (${r.html.length} vs ${r.canonical.length} chars)`);
    /* 10px is the canonical size; anything above 12 is the inherit-the-page-default failure. The
       colour must be the muted 25% white, never opaque — a legal footnote that shouts is a design
       defect and it is also how this one announced itself. */
    if (!r.pFont) fail('F7 RENDERED-STYLE', `${rel} — no <p> inside the footer to measure`);
    else if (r.pFont.size > 12) fail('F7 RENDERED-STYLE', `${rel} — footer text renders at ${r.pFont.size}px (canonical is 10px); the module is not carrying its own presentation`);
    else if (!r.pFont.unmeasurable && !(r.pFont.contrast >= 4.5)) fail('F7 RENDERED-STYLE', `${rel} — footer text contrast is ${r.pFont.contrast}:1 against its SAMPLED rendered background ${r.pFont.sampledBg} (WCAG AA needs 4.5:1 at ${r.pFont.size}px). Colour is ${r.pFont.color}. The old DOM walk would have said ${r.pFont.legacyContrast}:1. This paragraph carries the CCPA/CPRA and deletion links; text that is present but unreadable is not "clear and conspicuous"`);
    if (!r.deleteData) fail('F4 RIGHTS', `${rel} — "Delete My Data" is not rendered`);
    if (!r.doNotSell) fail('F4 RIGHTS', `${rel} — "Do Not Sell My Information" is not rendered (this is the CCPA/CPRA link)`);
    if (r.version) versions.add(r.version); else fail('F5 VERSION', `${rel} renders no build/version string`);
    if (errs.length) fail('F6 NO-THROW', `${rel}: ${errs[0]}`);
    rendered[rel] = r.html;
    await ctx.close();
  }
  if (versions.size > 1) fail('F5 VERSION', `${versions.size} different version strings render across the site — ${[...versions].join(' | ')}`);

  await browser.close();
  server.close();

  const mode = DRIFT ? ' [--drift]' : UNTAGGED ? ' [--untagged]' : '';
  console.log(`  population : ${footerPages.length} tracked pages carry #${HOST_ID}`);
  console.log(`  versions   : ${versions.size} distinct — ${[...versions].join(' | ') || '(none)'}`);
  console.log(`  identical  : ${new Set(Object.values(rendered)).size} distinct rendered footer(s) across ${Object.keys(rendered).length} pages`);
  fails.forEach((f) => console.log('  FAIL  ' + f));
  const LEGS = 7;
  console.log(fails.length === 0
    ? `[canonical_footer] ${LABEL}${mode} — PASS ${LEGS}/${LEGS} legs GREEN over ${footerPages.length} pages`
    : `[canonical_footer] ${LABEL}${mode} — FAIL ${fails.length} finding(s) RED across ${LEGS} legs`);
  process.exit(fails.length === 0 ? 0 : 1);
})();
