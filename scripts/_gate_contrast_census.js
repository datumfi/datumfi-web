/* @gate-pool: browser
 *
 * CONTRAST CENSUS — WCAG AA over EVERY VISIBLE PIECE OF TEXT ON EVERY LIVE PAGE.
 *
 * WHY THIS EXISTS. Until today NOTHING on this site measured text contrast except ONE paragraph:
 * F7 in _gate_canonical_footer.js covers `#disclosure-footer p` on 15 pages, full stop. That is how
 * studio.html ran --muted at 0.3 unnoticed, and that footer sits at 4.51:1 against a 4.5 floor —
 * 0.01 of headroom. MASTER SPEC §76.4 made widening this a ship condition for the lit-surface work,
 * because --surface is inkwell at 88% over two radial light sources and that composite is EXACTLY
 * what moves the number.
 *   ⛔ SHIPPING LIT SURFACES WITHOUT WIDENING CONTRAST COVERAGE WOULD BE INSTALLING THE HAZARD THE
 *      INSTRUMENT WAS BUILT FOR AND THEN NOT POINTING IT AT ANYTHING.
 *
 * THE METHOD IS F7's, POPULATED — NOT A NEW IDEA (§73). Ask the renderer instead of reasoning about
 * the stack: hide the glyphs, photograph the ground, read it back. Gradients, translucency, images
 * and blend modes are all already composited into that pixel. A DOM walk of `backgroundColor` sees
 * none of them and every one of its errors leans toward "all clear".
 *
 * ⭐ WHAT IS NEW IS THE ECONOMICS. F7 screenshots ONE element and settles it. That does not scale to
 * thousands. So: HIDE ALL TEXT AT ONCE -> TAKE ONE SETTLED SCREENSHOT -> LOOK UP EVERY TEXT RUN'S
 * OWN RECT IN THAT SINGLE IMAGE. One screenshot, N lookups, per scroll step.
 *
 * ⛔ THE POPULATION IS DERIVED, NEVER LISTED. Pages come from _redirects + shared chrome closed over
 * <a href> (the poison gate's derivation). Elements come from the live DOM. A HAND-LISTED SET OF
 * SURFACES IS AN EXEMPTION WEARING A NUMBER — and no element is silenced here. Decorative
 * low-contrast is the Architect's call to rule AFTER the number exists, not the wirer's to hide
 * before it does.
 *
 * ⚖️ THE FIRST RED RUN IS A MEASUREMENT, NOT A VERDICT (Captain, 2026-08-16). The census PRINTS its
 * count the way the suite prints VERDICT n/m. It does not block a ship on day one, because
 *   🔑 A NUMBER THAT IS PUBLISHED CAN BE SHRUNK DELIBERATELY; A NUMBER THAT BLOCKS A SHIP ON DAY ONE
 *      GETS THE INSTRUMENT WEAKENED INSTEAD.
 * The teeth are a RATCHET: the count may fall freely and may never rise. See PIN below.
 *
 * FLOOR — WCAG AA, measured per element, never assumed:
 *   4.5:1 normal text · 3:1 LARGE text (>= 24px, or >= 18.66px at weight >= 700).
 *
 * Usage:
 *   node scripts/_gate_contrast_census.js              run the census
 *   node scripts/_gate_contrast_census.js --verbose    name every failing run
 *   node scripts/_gate_contrast_census.js --dim        CONTROL: wind all text down -> count MUST rise
 *   node scripts/_gate_contrast_census.js --lift       CONTROL: max contrast    -> count MUST fall
 *   node scripts/_gate_contrast_census.js --blindsampler CONTROL: break the sampler -> MUST abort
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);
const A = process.argv.slice(2);
const VERBOSE = A.includes('--verbose');
const DIM = A.includes('--dim');
const LIFT = A.includes('--lift');
const BLINDSAMPLER = A.includes('--blindsampler');
const PORT = 8249;

/* ── THE RATCHET ──────────────────────────────────────────────────────────────────────────────
 * Day-one measured count. The census may report FEWER than this freely; reporting MORE is a RED.
 * ⚠️ THIS IS A PIN, NOT A TARGET, AND LOWERING IT IS THE WHOLE POINT. When the Architect rules a
 *    run and it gets fixed, DROP THE PIN IN THE SAME COMMIT — otherwise the ratchet slackens and
 *    a future regression hides inside the old allowance.
 * ⛔ NEVER RAISE IT TO MAKE A RUN GREEN. Raising it is how an instrument gets weakened instead of a
 *    defect getting fixed, which is the exact failure the Captain's ruling was written to prevent. */
/* ⚠️ THE PIN IS THE MEASURED CEILING, NOT A SINGLE READING — because the census is NOT perfectly
 *    deterministic and pretending otherwise would ship a flaky gate. Four runs on 2026-08-16 gave
 *    369 · 369 · 371 · 373 over ~2040 text runs.
 * ⭐ THE JITTER IS CONTENTION, NOT METHOD, AND THAT WAS CHECKED RATHER THAN ASSUMED: the two runs
 *    executed back-to-back with nothing else running agreed EXACTLY — same count AND a zero diff on
 *    the IDENTITY of all 369 failing runs. The spread appeared only against a loaded machine, where
 *    a few borderline runs fall on the wrong side of the `stable` check.
 * 🔑 A RATCHET PINNED TO ONE READING OF A NOISY NUMBER REDS FOR NO REASON, AND A GATE THAT REDS FOR
 *    NO REASON GETS IGNORED — which costs more than the 4 counts of slack it was protecting. The
 *    regression this exists to catch (lit surfaces dropping text below the floor) moves the number
 *    by tens, not by twos. */
/* ⬇️ 373 -> 313 when C1 raised --text-muted (2026-08-16). THE PIN ONLY EVER FALLS.
 *    Post-C1 readings on an idle machine: 309 · 308. The pin is that ceiling (309) PLUS THE
 *    4-COUNT CONTENTION BAND MEASURED PRE-C1 (369 -> 373) — derived from the instrument's own
 *    jitter, NOT picked to make a run pass. Pinning at 309 would red on a loaded machine, and
 *    A CONTENDED RUN THAT REDS FOR NO REASON IS THE FAILURE MODE THAT KILLS INSTRUMENTS. */
/* ⬇️ 313 -> 139 after C2 (dim chrome) and the footer. Measured 135; +4 contention band, as above.
 *    ⚠️ A RATCHET THAT LAGS ITS MEASUREMENT IS SLACK, NOT SAFETY: left at 313 against a census of
 *    135, a regression of up to 178 failing runs would have passed silently. Drop it every time it
 *    falls, in the commit that made it fall. */
/* ⬇️ 139 -> 105 when the occlusion test was actually implemented. ⛔⛔ THIS DROP IS NOT A PRODUCT
 *    IMPROVEMENT AND MUST NOT BE READ AS ONE — the site did not get better, the INSTRUMENT got
 *    honest. 467 runs were being scored against a ground belonging to a DIFFERENT element, and 34
 *    of the previous failures were phantoms of that. Distinguishing "we fixed something" from "we
 *    were measuring wrong" is the whole reason this note exists. */
const PIN = 105;   // MEASURED 2026-08-16 · 19 live pages · ~1580 text runs · SIGNED-OUT state only

let PASS = 0, FAIL = 0;
const leg = (id, ok, msg) => { ok ? PASS++ : FAIL++; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${msg}`); };

/* ── POPULATION · pages, derived exactly as scripts/_gate_token_authority.js derives them ──────
 * ⛔ -z, AND IT IS THE SAME PAID-FOR BUG _gate_canonical_footer.js:106 ALREADY RECORDS. Git escapes
 * any path holding NON-ASCII, a quote, a backslash or a control char — `Datum FI — First
 * Principles.html` comes back as "Datum FI \342\200\224 First Principles.html" — so splitting the
 * plain output on newlines SILENTLY DROPS those paths. This line dropped FIVE of thirty-nine
 * tracked .html files, measured 2026-08-19 against the shipped source.
 * ⚠️ A PLAIN SPACE DOES NOT TRIGGER QUOTING — `Datum Formula.jpg` comes back bare. Anyone
 *    red-firsting this class with "a path with a space" lands no poison and ships on a false green.
 * 🔑 ASK THE RUNNER FOR A POPULATION; NEVER GREP ONE — and then PARSE WHAT THE RUNNER ACTUALLY
 *    HANDED YOU. The law was already written; this line is what it looks like when it is obeyed
 *    halfway. */
const PAGES = new Set(execFileSync('git', ['ls-files', '-z'], { maxBuffer: 1 << 28 }).toString('utf8')
  .split('\0').filter(Boolean).filter((f) => f.endsWith('.html')));
const seeds = new Set(['index.html']);
if (fs.existsSync('_redirects')) {
  for (const line of fs.readFileSync('_redirects', 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const m = t.match(/^\S+\s+(\S+)/); if (!m) continue;
    const p = decodeURIComponent(m[1].replace(/^\//, ''));
    if (PAGES.has(p)) seeds.add(p);
  }
}
for (const c of ['nav.js', 'scripts/account-topbar.js', 'scripts/datum-footer.js']) {
  if (!fs.existsSync(c)) continue;
  for (const m of fs.readFileSync(c, 'utf8').matchAll(/["'`]\/?([A-Za-z0-9._\-%À-￿ ]+\.html)["'`?#]/g)) {
    const p = decodeURIComponent(m[1]); if (PAGES.has(p)) seeds.add(p);
  }
}
const LIVE = new Set(seeds);
{
  const q = [...LIVE];
  while (q.length) {
    for (const m of fs.readFileSync(q.shift(), 'utf8').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
      let h = m[1].split('#')[0].split('?')[0];
      if (!h || /^([a-z]+:)?\/\//i.test(h) || /^(mailto:|tel:|data:)/i.test(h)) continue;
      h = decodeURIComponent(h.replace(/^\//, '')) || 'index.html';
      if (PAGES.has(h) && !LIVE.has(h)) { LIVE.add(h); q.push(h); }
    }
  }
}
const POP = [...LIVE].sort();

// ── static server ─────────────────────────────────────────────────────────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
let served = 0;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const rel = p.replace(/^[\\/]+/, '');
  const fp = path.resolve(path.join(ROOT, rel));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404).end('nf'); return; }
  served++;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(fp));
});

/* CONTROLS. --dim reproduces the SHAPE of the defect this gate exists to catch: text that is
   present, styled, and unreadable. --lift is the opposite control, and it is the one that proves the
   census can see a PASS — a gate that only ever counts failures cannot tell you it is measuring the
   right thing. EXCLUSION NEEDS PRESENCE. */
const CONTROL_CSS = DIM
  ? `*{color:rgba(255,255,255,.18)!important}`
  : LIFT
    /* background-IMAGE must be killed too, not just background-COLOR: a gradient is an image, and
       leaving it would put white text over a ground this control never chose.
       ⛔⛔ AND IT MUST NOT TOUCH `opacity`. The first version carried `opacity:1!important`, which
       UN-HID SUBTREES THE USER NEVER SEES and then demanded they pass — sketch.html's #interactive-
       layer sits at opacity 0 permanently (measured to t=16s), so the control was MANUFACTURING the
       very elements it then failed on.
       🔑 A CONTROL MAY CHANGE THE THING UNDER TEST. IT MAY NOT CHANGE THE POPULATION. */
    ? `html,body{background:#000!important}*{color:#fff!important;background-color:transparent!important;background-image:none!important;text-shadow:none!important}
       svg text,svg tspan{fill:#fff!important}`
    : '';

/* Collect every TEXT RUN and its own rect. A Range around the text node is used, NOT the element
   box: the element box can be far larger than the glyphs (a padded container), and sampling its
   centre would photograph a pixel the text never touches. That mistake produced a plausible, wrong
   4.48:1 in F7's history and it is not repeated here. */
const COLLECT = `(async () => {
  const out = [], nodes = [];
  const cumOpacity = (el) => {
    let o = 1, a = el;
    while (a && a !== document.documentElement) { o *= parseFloat(getComputedStyle(a).opacity || '1'); a = a.parentElement; }
    return o;
  };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const s = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
    if (!s) continue;
    const el = n.parentElement;
    if (!el) continue;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TITLE') continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    /* CUMULATIVE opacity: an ancestor at .5 genuinely halves this text's contrast, and reading only
       the element's own opacity would overstate it. */
    let op = cumOpacity(el);
    if (op <= 0.01) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    /* ⛔ SVG TEXT IS NOT PAINTED BY \`color\`. An <svg><text> takes its ink from \`fill\`, and reading
       \`color\` there returns an INHERITED value that the glyphs may never use — a wrong foreground
       that still looks like a number. index.html draws chart labels this way.
       fill-opacity multiplies on top of element opacity, exactly as alpha would. */
    const isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    let paint = isSvg ? cs.fill : cs.color;
    if (isSvg) {
      if (!paint || paint === 'none') continue;                 // no ink: nothing to score
      /* nodes[] and out[] are INDEX-PARALLEL and must stay that way — push a placeholder, never
         skip one array and not the other. (The same desynchronisation class as the identity bug
         recorded below, and cheaper to prevent than to find.) */
      if (paint.indexOf('url(') === 0) { nodes.push(null); out.push({ skip: 'paint-server' }); continue; }
      op *= parseFloat(cs.fillOpacity || '1');
      if (op <= 0.01) continue;
    }
    /* ⛔⛔ THE OCCLUSION TEST, WHICH USED TO BE A COMMENT RATHER THAN A CHECK. The caller tested only
       'if (!top) return -1' — "is ANYTHING here", never "is the RIGHT thing here" — while the note
       beside it claimed unoccluded runs were being selected. A COMMENT STATES INTENT, NEVER
       BEHAVIOUR.
       ⭐ IT MANUFACTURED A FINDING THAT REACHED THE ARCHITECT AND GOT RULED ON: pricing.html's
          .featured-badge is position:absolute at top:-12px with a GOLD fill, sitting directly over
          the .card-tier text. The sampler photographed THE BADGE's brass and reported the tier text
          at 1.42:1 on rgb(201,168,76) — "white on brass, no alpha can fix it". Nothing paints that
          card brass. THE GROUND BELONGED TO A DIFFERENT ELEMENT.
       🔑 A NUMBER THAT LOOKS LIKE A FINDING IS THE MOST EXPENSIVE KIND OF RIG FAULT — this one cost
          an Architect ruling on a defect that did not exist.
       ⚠️ elementFromPoint is a PROXY for visual occlusion and not a perfect one: it ignores
          pointer-events:none, so a decorative overlay can still cover text it cannot report. Stated
          rather than papered over. */
    const _cx = b.x + b.width / 2, _cy = b.y + b.height / 2;
    const _stack = document.elementsFromPoint(_cx, _cy);
    const _top = _stack[0];
    if (!_top) continue;                                   // outside the viewport: not occluded, just not here
    /* ⚠️ THE FIRST CUT OF THIS TEST OVER-EXCLUDED 477 RUNS, and the cause is worth keeping: an
       element with pointer-events:none IS VISIBLE BUT INVISIBLE TO HIT-TESTING, so elementFromPoint
       returns whatever is BEHIND it and the run looks occluded by its own background. Decorative and
       label text is full of it.
       ⭐ SO SEPARATE "I CAN SEE IT IS COVERED" FROM "I CANNOT TELL": if el is not in the hit stack at
          all, the test is INAPPLICABLE and the run is measured anyway, counted as untestable. Only a
          run that IS in the stack with something unrelated ON TOP is scored as occluded.
       🔑 AN INSTRUMENT MAY EXCLUDE WHAT IT HAS PROVEN IRRELEVANT. IT MAY NOT EXCLUDE WHAT IT MERELY
          FAILED TO RESOLVE — that is a coverage hole wearing a filter's clothes. */
    if (_stack.indexOf(el) >= 0 && _top !== el && !el.contains(_top) && !_top.contains(el)) {
      out.push({ skip: 'occluded' }); nodes.push(null); continue;
    }
    nodes.push(el);
    out.push({
      text: s.slice(0, 48), tag,
      id: el.id || '', cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40),
      x: b.x + b.width / 2, y: b.y + b.height / 2,
      color: paint, size: parseFloat(cs.fontSize) || 0, weight: parseInt(cs.fontWeight, 10) || 400,
      opacity: op, svg: isSvg,
    });
  }
  /* ⛔⛔ THE STABILITY CHECK MUST COMPARE A NODE WITH ITSELF. The first attempt collected TWICE and
     matched the two lists BY INDEX — but membership changes as things settle, so index N was often
     a different element, and the rig reported 5819 "moving" runs against 1193 measured. That number
     was not movement; it was a broken identity.
     🔑 AN IDENTITY YOU DID NOT ESTABLISH IS AN IDENTITY YOU ASSUMED — and a comparison across two
        assumed identities produces a confident number about nothing.
     ⭐ Holding the element references and re-reading THEM is exact, and it costs one wait. */
  await new Promise((r) => setTimeout(r, 220));
  for (let i = 0; i < nodes.length; i++) {
    if (out[i].skip) continue;
    out[i].stable = Math.abs(cumOpacity(nodes[i]) - out[i].opacity) < 0.005;
  }
  return out;
})()`;

/* Read MANY points out of ONE decoded image. This is the whole economy of the design: the PNG is
   decoded once into a canvas and then indexed, instead of one screenshot per element. */
async function readPoints(page, png, pts) {
  return page.evaluate(async ([u, points, blind]) => {
    const img = new Image(); img.src = u; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    return points.map((p) => {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (blind) return null;                                  // --blindsampler
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
      const i = (y * img.width + x) * 4;
      return { r: d[i], g: d[i + 1], b: d[i + 2], a: d[i + 3] / 255 };
    });
  }, ['data:image/png;base64,' + png.toString('base64'), pts, BLINDSAMPLER]);
}

/* ⛔⛔ `color(srgb 1 1 1 / 0.4)` IS NOT `rgb(1, 1, 1)`. Its components are 0-1, not 0-255, so a
 * naive number-scrape reads WHITE AS NEAR-BLACK and reports ~1.05:1 for text that is really ~4.06:1.
 * ⭐ AND THIS IS EXACTLY THE SERIALISATION `color-mix()` PRODUCES — which is what --text-muted uses
 *    today and what every role added in (1a) will use the moment a surface reads it. Left unfixed,
 *    the census would have been systematically wrong on PRECISELY THE TOKENS THIS ARC INTRODUCES,
 *    and wrong in the direction that manufactures findings.
 * 🔑 A PARSER THAT ACCEPTS EVERY NOTATION AND UNDERSTANDS ONE IS NOT A PARSER; IT IS A NUMBER
 *    GENERATOR. Measured: 72 of 369 failing runs carried this form. */
const px = (s) => {
  const t = (s || '').trim();
  const m = t.match(/[\d.]+/g);
  if (!m) return null;
  if (/^color\(\s*srgb\b/i.test(t)) {
    return { r: +m[0] * 255, g: +m[1] * 255, b: +m[2] * 255, a: m.length > 3 ? +m[3] : 1 };
  }
  if (/^(oklab|oklch|lab|lch|color)\(/i.test(t)) return { unparsed: t };   // named, counted, never guessed
  return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
};
const over = (f, b) => ({ r: f.a * f.r + (1 - f.a) * b.r, g: f.a * f.g + (1 - f.a) * b.g, b: f.a * f.b + (1 - f.a) * b.b });
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (x) => 0.2126 * lin(x.r) + 0.7152 * lin(x.g) + 0.0722 * lin(x.b);
const floorFor = (size, weight) => (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    return (u.startsWith('http://127.0.0.1') || u.startsWith('data:')) ? r.continue() : r.abort();
  });

  let measured = 0, below = 0, unreadable = 0, pagesSeen = 0, paintServer = 0, moving = 0, unparsedFg = 0, occluded = 0;
  const unparsedKinds = new Set();
  const unsettled = [], failures = [], errors = [];

  for (const f of POP) {
    const page = await ctx.newPage();
    try {
      await page.goto(`http://127.0.0.1:${PORT}/${encodeURIComponent(f)}`, { waitUntil: 'networkidle', timeout: 25000 });

      /* ⛔ WHEN A GATE LOOKS IS LOAD-BEARING (§73). studio.html and sketch.html run an entry
         sequence; measuring through it reads a ground no user is ever looking at and hands back a
         plausible number.
         ⛔⛔ BUT PIXEL EQUALITY IS THE WRONG SETTLE TEST HERE, AND THAT IS MEASURED: both pages
         carry TWO PERPETUAL animations (`pulseTealMid` on the SVG gradient stops #stop-mid1/2),
         still running at t=16s. A whole-page screenshot can therefore NEVER stop changing, so a
         pixel-settle would have declared the two most important pages unsettled forever and then
         measured them anyway on whatever frame it gave up at.
         ⭐ SO ASK THE ANIMATION ENGINE INSTEAD OF THE PIXELS: an ENTRY sequence is FINITE and a
         decorative pulse is INFINITE. Wait for every FINITE animation to finish; treat infinite
         ones as steady state. That is the difference between "not on the wrong FRAME" and "not on
         the wrong MOMENT OF THE JOURNEY", and only the second one is the question being asked. */
      const settle = async () => {
        for (let i = 0; i < 24; i++) {
          const done = await page.evaluate(() => !document.getAnimations().some((a) => {
            if (a.playState !== 'running') return false;
            const it = a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : 1;
            return it !== Infinity;                   // a finite animation is still in flight
          }));
          if (done) return true;
          await page.waitForTimeout(250);
        }
        return false;
      };
      if (!(await settle())) unsettled.push(f);

      if (CONTROL_CSS) await page.addStyleTag({ content: CONTROL_CSS });

      const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
      const vh = 900;
      const steps = Math.min(12, Math.max(1, Math.ceil(height / vh)));
      pagesSeen++;

      for (let s = 0; s < steps; s++) {
        await page.evaluate((y) => window.scrollTo(0, y), s * vh);
        /* ⛔⛔ SETTLE AGAIN, EVERY STEP — SCROLLING STARTS NEW ANIMATIONS. Settling once per page was
           wrong and it was measured: index.html reveals sections on scroll, so the census
           photographed them MID-FADE and scored white-on-black at 1.26:1 (cumulative opacity ~0.13).
           🔑 AN IMPOSSIBLE NUMBER IS A GIFT — white on black is 21:1 and nothing else, so the rig
              had to be wrong. A PLAUSIBLE wrong number here would have been banked as a finding.
           ⚠️ "When a gate looks" is not a per-PAGE property. It is a property of every moment the
              gate CHANGES the page, and scrolling is one. */
        await settle();

        /* ⛔⛔ SETTLE THE ELEMENTS, NOT JUST THE PAGE. document.getAnimations() cannot see opacity
           driven by a SCROLL HANDLER in JS — index.html fades sections that way, and the census
           photographed them mid-fade and scored white-on-black at 2.46:1.
           ⭐ So collect TWICE and keep only the runs whose opacity and position AGREE. A run that is
              still moving is COUNTED as moving and NOT scored — refusing to score what cannot be
              seen is F7's own rule, applied per element instead of per page.
           🔑 STABLE IS NOT THE SAME AS CORRECT — but UNSTABLE IS RELIABLY WRONG, and that half of
              the law is cheap to enforce. */
        const collected = await page.evaluate(COLLECT);
        /* A paint-server fill (a gradient or pattern) has no single colour to score. It is COUNTED
           and surfaced, never dropped in silence — an unscoreable run is a coverage fact, not a
           tidy-up. */
        paintServer += collected.filter((r) => r.skip === 'paint-server').length;
        occluded   += collected.filter((r) => r.skip === 'occluded').length;
        const stableRuns = collected.filter((r) => !r.skip);
        moving += stableRuns.filter((r) => !r.stable).length;
        const runs = stableRuns.filter((r) => r.stable);
        /* Only runs whose glyphs are actually inside the viewport can be photographed by a viewport
           screenshot, and only those that are the TOP element at their own centre are unoccluded.
           Both tests are DERIVED from the live render, not from a list of things to skip. */
        const visible = await page.evaluate((rs) => rs.map((r, i) => {
          if (r.x < 1 || r.y < 1 || r.x > innerWidth - 1 || r.y > innerHeight - 1) return -1;
          const top = document.elementFromPoint(r.x, r.y);
          if (!top) return -1;
          return i;
        }).filter((i) => i >= 0), runs);
        if (!visible.length) continue;

        const pts = visible.map((i) => ({ x: runs[i].x, y: runs[i].y }));
        /* HIDE THE GLYPHS, NOT THE ELEMENT — the pixel under the text must stay exactly the ground
           the text sits on. text-shadow and -webkit-text-fill-color would otherwise survive and
           tint it.
           ⛔⛔ REMOVED BY HANDLE, NEVER BY POSITION. This first read "delete the LAST <style>", which
           is not the same element: addStyleTag inserts into <head>, while a page may carry <style>
           in its BODY and may inject more at runtime — so DOCUMENT ORDER IS NOT INSERTION ORDER.
           The gate was deleting the PAGE's stylesheets one per scroll step and leaving its own mask
           behind. --lift caught it: white text still scored 1.25:1 because the surviving cumulative
           opacity was ~0.12, not because anything was wrong with the product.
           🔑 A CONTROL THAT REFUSES TO CLEAR IS DOING ITS JOB — THE FIRST THING IT ACCUSES IS THE
              INSTRUMENT, AND HERE IT WAS RIGHT. */
        const mask = await page.addStyleTag({ content: `*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}` });
        await page.waitForTimeout(60);
        const png = await page.screenshot();
        const grounds = await readPoints(page, png, pts);
        await mask.evaluate((el) => el.remove());
        await page.waitForTimeout(30);

        for (let k = 0; k < visible.length; k++) {
          const r = runs[visible[k]], bgp = grounds[k];
          if (!bgp || !(bgp.a > 0)) { unreadable++; continue; }
          const bg = { r: bgp.r, g: bgp.g, b: bgp.b };
          /* ⛔ NO DEFAULT-TO-WHITE. The old fallback `|| {255,255,255,1}` was a GUESS that scores —
             it would have silently invented a foreground for any notation the parser did not know
             and then reported a confident ratio for it. An unparseable colour is COUNTED and NAMED,
             never scored. EVERY ERROR A DEFAULT MAKES LEANS TOWARD "ALL CLEAR". */
          const fc = px(r.color);
          if (!fc || fc.unparsed) { unparsedFg++; unparsedKinds.add((r.color || '').split('(')[0] + '()'); continue; }
          const fg = over({ ...fc, a: fc.a * r.opacity }, bg);
          const l1 = lum(fg), l2 = lum(bg);
          const ratio = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
          const need = floorFor(r.size, r.weight);
          measured++;
          if (ratio < need) {
            below++;
            failures.push(`${f}  ${r.tag}${r.id ? '#' + r.id : ''}${r.cls ? '.' + r.cls.split(' ')[0] : ''}  ${ratio}:1 (needs ${need}) ${r.size}px/${r.weight} ${r.color} on rgb(${bg.r},${bg.g},${bg.b})  "${r.text}"`);
          }
        }
      }
    } catch (e) {
      errors.push(`${f}: ${String(e.message || e).slice(0, 100)}`);
    }
    await page.close();
  }
  await browser.close(); server.close();

  console.log('-------------------------------------');
  console.log(`pages ${pagesSeen}/${POP.length}   text runs measured ${measured}   below floor ${below}   unreadable ground ${unreadable}   unscoreable paint-server ${paintServer}   still moving ${moving}   occluded ${occluded}   unparseable fg ${unparsedFg}${unparsedFg ? ' (' + [...unparsedKinds].join(', ') + ')' : ''}`);
  if (unsettled.length) console.log(`unsettled (measured anyway, named not hidden): ${unsettled.join(', ')}`);
  if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
  /* THE BREAKDOWN IS ALWAYS PRINTED, NEVER ONLY UNDER --verbose. A bare total is a number nobody
     can act on, and the Architect rules these one at a time — so the census has to say WHERE.
     ⚠️ The per-line list is capped; the TALLIES are not, so the counts can always be trusted even
        when the listing is truncated. (An earlier run printed 371 with a 60-line list, and reading
        the list as the population would have understated three pages.) */
  const tally = (arr, keyOf) => {
    const m = new Map();
    for (const s of arr) m.set(keyOf(s), (m.get(keyOf(s)) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  if (failures.length) {
    console.log('   ── below floor, by page ──');
    for (const [k, n] of tally(failures, (s) => s.trim().split(/\s\s+/)[0])) console.log(`   ${String(n).padStart(5)}  ${k}`);
    console.log('   ── below floor, by selector ──');
    for (const [k, n] of tally(failures, (s) => s.trim().split(/\s\s+/)[1] || '?').slice(0, 15)) console.log(`   ${String(n).padStart(5)}  ${k}`);
  }
  if (VERBOSE || DIM || LIFT) failures.slice(0, VERBOSE ? 100000 : 60).forEach((s) => console.log('   ' + s));

  // ── BLINDNESS ASSERTIONS — the rig must prove it looked before it may report ────────────────
  leg('C0a', served > POP.length, `the rig served pages — ${served} requests for ${POP.length} pages`);
  leg('C0b', pagesSeen === POP.length && errors.length === 0, `every live page rendered — ${pagesSeen}/${POP.length}, ${errors.length} error(s)`);
  leg('C0c', measured > 0, `text runs were found and photographed — ${measured}`);
  leg('C0d', unreadable === 0, `every sampled ground had a real pixel — ${unreadable} unreadable`);
  /* A notation the parser cannot read is a COVERAGE HOLE, and it must be loud rather than absorbed:
     72 runs were being mis-scored by exactly this before `color(srgb ...)` was handled. */
  leg('C0e', unparsedFg === 0, `every foreground colour was parseable — ${unparsedFg} unparseable${unparsedFg ? ': ' + [...unparsedKinds].join(', ') : ''}`);

  // ── THE CENSUS ─────────────────────────────────────────────────────────────────────────────
  console.log(`CONTRAST ${below}/${measured} text runs below the WCAG AA floor (4.5:1 normal, 3:1 large)`);
  leg('C1', below <= PIN, `the census may fall freely and may never rise — ${below} below floor, ratchet pinned at ${PIN}`);

  if (DIM || LIFT || BLINDSAMPLER) {
    console.log(`MODE: ${DIM ? '--dim' : LIFT ? '--lift' : '--blindsampler'}   |   contrast census CONTROL`);
    if (BLINDSAMPLER && !(FAIL > 0)) { console.log('!! --blindsampler must ABORT the census (C0d), not score it'); process.exit(2); }
    if (DIM && !(below > PIN)) { console.log('!! --dim must push the census ABOVE the pin'); process.exit(2); }
    /* ⛔ --lift ASSERTS A REDUCTION, NOT ZERO, AND THE BAR WAS LOWERED ON A MEASUREMENT RATHER THAN
       TO MAKE IT PASS. Zero is UNREACHABLE BY CONSTRUCTION for two reasons, both verified:
         · index.html renders inactive `.scroll-step`s at `opacity: 0.3` BY DESIGN (:228). A control
           may not raise that without CHANGING THE POPULATION, which is the one thing it must not do.
         · CSS cannot repaint an SVG shape's `fill`, so some grounds stay light under the control.
       The claim being proven is "raising contrast measurably LOWERS the count" — that the census can
       see a PASS, not only a failure. Demanding 0 would have been a control that can only fail for
       somebody else's reason. */
    if (LIFT && !(below < PIN / 2)) { console.log(`!! --lift must cut the census well below the pin (${PIN}) — got ${below}`); process.exit(2); }
  }

  console.log(`OVERALL: ${FAIL === 0 ? 'GREEN' : 'RED'}   (${PASS} pass / ${FAIL} fail)`);
  process.exit(FAIL === 0 ? 0 : 1);
})();
