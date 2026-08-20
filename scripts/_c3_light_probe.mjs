/* ══ C3 LIGHT PROBE — PIXELS INTO RECTS, NOT A SCALAR ═══════════════════════════════════════════
 *
 * The C3 palette arc's measuring instrument. Renders studio.html twice — once from the working
 * tree, once from the SERVED BYTES with a named change reverted — and reports every differing
 * pixel LOCALISED INTO THE ELEMENT RECT IT FALLS IN.
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL, AND WHY IT IS COMMITTED RATHER THAN LIVING IN %TEMP%.
 * The rect breakdown that lifted §81.16's suspension (#shape-mode-toggle 825 · #shape-hud 336 ·
 * .canvas-wrapper 15 · outside 4 · #estate-analysis ZERO · #want-readout ZERO) was produced by a
 * throwaway script that no longer exists anywhere in the tree. THE MEASUREMENT SURVIVED IN A
 * SPREADSHEET; THE INSTRUMENT THAT PRODUCED IT DID NOT.
 * 🔑 _render_diff.js's own law, quoted because it was written for exactly this: "A HARNESS IN
 *    %TEMP% IS AN INSTRUMENT THAT DISAPPEARS ON THE DAY SOMEBODY CLEARS A FOLDER." That file is the
 *    third instrument this arc has had to rebuild from nothing. This is the fourth. It stops here.
 *
 * ⛔ _render_diff.js IS NOT THE DONOR AND THAT WAS CHECKED, NOT ASSUMED (L48). It diffs MARKUP
 * character-for-character. This diffs PIXELS. A donor that measures a different quantity is not a
 * donor at all — only its SERVING half was reused, and that half is acknowledged below.
 *
 * ⛔ NOT NAMED _gate_* OR _p<digit>*, AND THAT IS STRUCTURAL, NOT COSMETIC.
 * _suite_baseline.mjs:148 builds its population from /^(_gate_|_p\d)/ over scripts/. A file named
 * _gate_c3_light_probe would be EXECUTED by every argument-less suite run, and with no --mode it
 * would exit 0 and be counted a GREEN THAT TESTED NOTHING. This dodges the glob by prefix, exactly
 * as _render_diff.js and _studio_source.cjs do, and adds nothing to a hand-maintained exclusion
 * list. ⇒ IT IS A TOOL YOU POINT AT A CHANGE, NEVER A GATE THAT RUNS ITSELF.
 *
 * ⛔ NO NEW DEPENDENCY. PNG decode is ~50 lines over built-in zlib (below). Doctrine #34 makes any
 * package.json / package-lock.json movement a DEPLOY-BLOCKER class — Cloudflare installs with
 * strict `npm ci`. AN INSTRUMENT IS NOT WORTH A DEPLOY RISK.
 *
 * ── THE FOUR RULINGS THIS FILE IMPLEMENTS (2026-08-19, MASTER SPEC §81.17-81.19) ────────────────
 *  1. NULL CONTROL FIRST. --mode=null renders the SAME tree on both ports and must read 0. A
 *     DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS NOT A MEASUREMENT — IT IS A NUMBER. This tool
 *     REFUSES to run --mode=differential unless --i-ran-null-first is passed, so the order cannot
 *     be skipped by accident.
 *  2. RECTS, NOT SCALARS. Every differing pixel is bucketed into the element rect containing it,
 *     plus an explicit OUTSIDE-EVERY-RECT bucket. A NUMBER THAT DOES NOT MOVE MAY BE STABLE, OR IT
 *     MAY HAVE NO SIGNAL IN IT — and you cannot tell those apart from the scalar. The 1,180 that
 *     did not move across a fix was insensitive to the two panels under test IN BOTH DIRECTIONS.
 *  3. THE MEASUREMENT PASS RUNS *AFTER* THE CAPTURE. A getBoundingClientRect pass before the
 *     screenshot forced a layout and moved the count 1180 -> 1195. THE INSTRUMENT PERTURBED WHAT IT
 *     MEASURED BY EXACTLY THE SIZE OF THE SIGNAL BEING HUNTED. capture() screenshots FIRST and only
 *     then reads rects, and it asserts that ordering in its own output.
 *  4. THE REVERT MUST PROVE IT LANDED. Every entry in a revert set declares how many times it must
 *     match. A substitution that silently matched zero times would render the control side
 *     IDENTICAL to the shipped side and report a beautiful, meaningless 0. That is the same shape
 *     as the space-instead-of-non-ASCII poison that would have shipped a green on an unfixed bug.
 *
 * ⚠️ WHAT THIS TOOL CANNOT SEE, STATED SO NOBODY BANKS IT AS COVERAGE. It is a DIFFERENTIAL
 * instrument, and §81.12 ruled that a differential proof is blind to any defect COMMON TO BOTH
 * SIDES — an unterminated CSS comment ate two rules and the screenshot test came out clean because
 * both sides carried it. THIS FILE IS HALF THE PROOF. The other half is ABSOLUTE — --mode=absolute
 * here, plus scripts/_gate_css_comments.js — and the two are REPORTED SEPARATELY, NEVER COLLAPSED.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
 *   node scripts/_c3_light_probe.mjs --mode=null
 *   node scripts/_c3_light_probe.mjs --mode=differential --revert=c3 --i-ran-null-first
 *   node scripts/_c3_light_probe.mjs --mode=absolute
 *   node scripts/_c3_light_probe.mjs --mode=selftest      (poison the tree, prove the diff BITES)
 *   -- the ground/edge family, added 2026-08-19 for the stage-tone arc --
 *   node scripts/_c3_light_probe.mjs --mode=profile --page=proto2.html
 *   node scripts/_c3_light_probe.mjs --mode=profile --page=studio.html --enter --target=proto2
 *   node scripts/_c3_light_probe.mjs --mode=area --revert=c3 --i-ran-null-first --enter
 *   node scripts/_c3_light_probe.mjs --mode=edge --revert=c3 --i-ran-null-first --enter
 *
 * ── THE THREE GROUND MODES, AND THE FAILURE EACH ONE EXISTS FOR ─────────────────────────────────
 *  profile — a VERTICAL COLUMN of the rendered ground. §82.6 is accepted ON THE PROFILE, NOT ON THE
 *      DECLARATION, because proto2's rendered ground is DARKER than its own declared gradient: a
 *      vignette and a 6px dot texture sit over it. Authoring the gradient alone gets the top right
 *      and leaves the edges bright. ⭐ --target=proto2 makes the acceptance test EXECUTABLE, and it
 *      read 0/4 RED before the stage tone existed — a real red-first, not a retrofit.
 *  area — the WHOLE RECT, not its centre. The centre sampler reported FOUR zeros on the entered
 *      Studio; TWO were real (#shape-mode-toggle, .drafting-panel at 0.0% moved) and TWO were
 *      ARTEFACTS — #canvas-wrapper and #blueprint-container centres land on brass estate content,
 *      so both read (0,0,0) while 22% of their area was actually moving. 🔑 ONE PIXEL CANNOT
 *      REPRESENT A SURFACE THAT HAS ANYTHING DRAWN ON IT, and only an area sampler can tell a real
 *      zero from an occluded one.
 *  edge — the FALLOFF as a curve along a ray. The "it reads as a blob" complaint is an EDGE
 *      question, and AN ALPHA CHANGE CANNOT FIX AN EDGE — it would make a faint blob instead of a
 *      bright one. Measured on the clean left ray: +33 at the centre, then 29·25·20·16·11·7·3 and
 *      ZERO by 320px. A light that terminates is visible as a boundary on a FLAT field; on a graded
 *      one the ground keeps darkening and the eye reads it as continuous.
 *
 * ⭐ --page LETS ONE INSTRUMENT MEASURE BOTH THE DONOR AND US, so a difference between proto2 and
 *    studio.html is a difference in the PAGES and never between two rigs. The proto2 target table
 *    below was RE-DERIVED with this probe and reproduced the scratch script exactly.
 * EXIT 0 = the run produced a trustworthy report · 1 = an assertion failed · 2 = the harness broke.
 *
 * ⚠️ READ THE REPORT, NOT THE EXIT CODE. "DIFFERS" is not automatically a bug. On a deliberate skin
 * change a diff is the EXPECTED result and the rect breakdown is the review. THE TOOL REPORTS; IT
 * DOES NOT JUDGE. The one thing it does judge is its own trustworthiness.
 *
 * PROFILE — every number this file prints was taken at: 1440x900 · cold Studio (storage cleared) ·
 * signed-out · headless chromium · off-origin requests ABORTED (so no CDN font or beacon can move a
 * pixel between two runs). Any figure quoted from here carries that profile or it is quoted wrong.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPTS, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODE = arg('mode', '');
const REVERT_NAME = arg('revert', '');
const NULL_FIRST = argv.includes('--i-ran-null-first');
/* --enter dismisses the landing overlay so the DRAFTING SURFACE is what gets photographed.
   It is a DIFFERENT PROFILE, not a better one, and it carries its own null control. */
const ENTER = argv.includes('--enter');
/* ⭐ --page LETS THE SAME INSTRUMENT MEASURE THE DONOR AND US. proto2.html and studio.html are read
 * by ONE probe, so a difference between them is a difference in the PAGES and never a difference
 * between two measuring rigs. Comparing a donor measured one way against a target measured another
 * is the oldest way to manufacture a delta. */
const PAGE = arg('page', 'studio.html');
/* Column(s) for --mode=profile. 1425 is the far right edge — the least content-covered column on
 * studio.html cold. Override when a layout puts something there. */
const COLS = arg('cols', '1425').split(',').map(Number);
const TARGET = arg('target', '');
const TOL = parseInt(arg('tol', '2'), 10);

/* ⛔ THE ACCEPTANCE TARGET IS A MEASUREMENT, NOT A FEELING — it is proto2's OWN rendered profile,
 * taken by THIS probe at 1440x900, and the Architect authored §82.6 against these numbers rather
 * than against an intention. Re-derive it (`--mode=profile --page=proto2.html`) rather than trust
 * this table if proto2 ever changes.
 * ⚠️ THE ±2 TOLERANCE IS RULED, NOT ASSUMED (Architect, 2026-08-19). It exists because our stack
 *    and proto2's stack are not the same set of layers, so an exact match is not achievable and
 *    demanding one would be a defect with permission of the opposite kind. The tool ALWAYS prints
 *    the real per-channel delta, so the tolerance can never hide a drift inside it. */
/* ⛔⛔ THE ACCEPTANCE HEIGHTS ARE VALIDATOR-DERIVED, AND TWO EARLIER ONES ARE REJECTED FOR CAUSE.
 * 🔑 THE RULE (§82.8): AN ACCEPTANCE POINT MUST BE FIELD-VALID ON *BOTH* PAGES, OR IT IS NOT A
 *    COMPARISON — IT IS TWO MEASUREMENTS OF DIFFERENT THINGS WEARING ONE ROW.
 * REJECTED, WITH THE ELEMENT THAT BLOCKED THEM, SO NOBODY RE-PROPOSES THEM:
 *   y=20   ours  NAV#app-nav        rgba(9,18,33,0.96)
 *          proto2 HEADER (.topbar)  rgba(4,10,18,0.94)   <- and that nav is RULED OUT OF SCOPE (§61)
 *   y=860  ours  DIV#privacy-banner rgba(9,18,33,0.97)
 *          proto2 open stage                              <- so the row compared a cookie banner
 *                                                            against a blueprint
 * FIELD-VALID ON BOTH, MEASURED: 120 · 250 · 400 · 550 · 700.
 * CHOSEN: 120 · 250 · 550 · 700 — deliberately SPREAD (one above 250, one below 550) so the profile
 * still tests a GRADIENT rather than a band.
 * ⚠️ TARGETS RE-DERIVED AT THE NEW HEIGHTS WITH THIS PROBE. A target from a different instrument is
 *    an assumption wearing a number — AND SO IS A TARGET FROM A DIFFERENT HEIGHT. */
const TARGETS = {
  proto2: { 120: [6, 10, 17], 250: [4, 10, 18], 550: [5, 11, 20], 700: [5, 12, 22] },
};

const VW = 1440, VH = 900;
const PORT_A = 8431;   /* shipped / working tree            */
const PORT_B = 8432;   /* control  / reverted served bytes  */
/* PORT DISCIPLINE: 8431-8432 claimed 2026-08-19. 8001 is the SUITE'S shared server and is never
   self-hosted on (66 browser gates depend on it). These two are above every port the gates use. */

/* ══ REVERT SETS ════════════════════════════════════════════════════════════════════════════════
   A revert is applied to the SERVED BYTES on PORT_B, never to the working tree. §81.10: "A CONTROL
   RUN AGAINST WHAT YOU INTENDED TO SHIP PROVES YOUR INTENTION; ONE RUN AGAINST THE ARTEFACT PROVES
   THE ARTEFACT." Each entry declares `count` — the number of times it MUST match. Mismatch aborts.
   ⛔ `count` IS NOT DOCUMENTATION. It is the guard that stops a silently-inert control reporting a
      clean 0. Set it from a measurement, never from an expectation. */
const REVERTS = {
  /* C3 — THE LIGHT. Strips the two body radials from studio.html so PORT_B renders the UNLIT page.
     Filled in by the commit that introduces them; declared here so the control ships WITH the
     change and not after it (write-the-check-WITH-the-feature). */
  c3: [
    {
      file: 'studio.html',
      /* ⛔ ONE VARIABLE PER REVERT SET. This strips ONLY the key radial and leaves the stage field
         and vignette in place, so `--mode=area` measures THE LIGHT and not the ground. When the
         body block gained the stage layers this find string stopped matching — and the landing
         guard turned the run RED rather than printing a number over an unpoisoned tree. That is
         the guard doing its job, and the fix is to move the string, never to loosen the check.
         🔑 A CONTROL THAT REVERTS TWO THINGS AT ONCE CANNOT ATTRIBUTE WHAT IT MEASURES. */
      find: '      radial-gradient(circle at 70% 15%, var(--light-key), transparent 24%),\n',
      replace: '',
      count: 1,
    },
  ],
  /* stage — ISOLATES THE GROUND (§82.8), leaving the key light untouched, so the differential
     attributes what THIS commit changed and nothing else. Neutralising the three tokens to `none`
     is deliberate: `background-image: <grid>, none` and `background: none` are both VALID CSS, so
     every consumer degrades to "layer absent" without the find-strings having to track four
     separate consuming rules across two files. ⭐ ONE REVERT PER VARIABLE, AND THE VARIABLE HERE IS
     "the stage layers exist". */
  stage: [
    { file: 'styles/tokens.css', find: '  --stage-field:    linear-gradient(180deg, #040a12 0%, #07101b 24%, #091220 100%);', replace: '  --stage-field: none;', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-vignette: radial-gradient(circle at 50% 50%, transparent 54%, rgba(2,8,15,0.10) 78%, rgba(2,8,15,0.28) 100%);', replace: '  --stage-vignette: none;', count: 1 },
    { file: 'styles/tokens.css', find: '  --stage-base:     linear-gradient(180deg, rgba(4,10,18,0.88), rgba(8,16,28,0.94));', replace: '  --stage-base: none;', count: 1 },
  ],
  /* SELFTEST — a deliberate, obvious poison used to prove the diff pipeline BITES. It changes the
     page field itself, so a working differ must report a very large number across many rects. If
     this reports 0, the instrument is broken and every other number it has ever printed is void. */
  selftest: [
    { file: 'styles/tokens.css', find: '--paint-inkwell:        #091221;', replace: '--paint-inkwell:        #FF0000;', count: 1 },
  ],
};

/* ══ PNG DECODE — 8-bit non-interlaced, which is what chromium's screenshot() emits ══════════════
   ⛔ WRITTEN OUT RATHER THAN INSTALLED, ON PURPOSE. See the dependency note in the header.
   Supports colour types 2 (RGB) and 6 (RGBA) at bit depth 8. ANY OTHER SHAPE THROWS RATHER THAN
   GUESSING — a decoder that silently mis-reads a format produces plausible wrong pixels, which is
   the most expensive failure this arc has. */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || (ctype !== 2 && ctype !== 6)) throw new Error(`unsupported PNG depth=${depth} ctype=${ctype}`);
  const chan = ctype === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * chan;
  const out = Buffer.alloc(w * h * chan);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const prev = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= chan ? cur[x - chan] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= chan ? prev[x - chan] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error('bad PNG filter ' + filter);
      cur[x] = v & 255;
    }
  }
  return { w, h, chan, data: out };
}

/* ══ STATIC SERVER ══════════════════════════════════════════════════════════════════════════════
   The SERVING half is the one part reused from _render_diff.js (its diff half measures markup, not
   pixels, so it is not a donor for the rest). `transform` rewrites text assets on the way out —
   never on disk. */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serve(port, transform, landed) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((q, s) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p === '/') p = '/studio.html';
      const rel = p.replace(/^\//, '');
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
      let body = fs.readFileSync(f);
      if (transform && /\.(html|css|js|mjs)$/.test(p)) {
        const before = body.toString('utf8');
        const after = transform(rel, before, landed);
        if (after !== before) body = Buffer.from(after, 'utf8');
      }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      s.end(body);
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

function makeTransform(set) {
  return (rel, src, landed) => {
    let out = src;
    for (const r of set) {
      if (r.file !== rel) continue;
      const n = out.split(r.find).length - 1;
      /* ⛔ A SET, NOT A COUNTER — AND _render_diff.js WARNED ABOUT THIS EXACT MISTAKE IN ITS OWN
       * COMMENTS BEFORE I MADE IT. capture() loads the page TWICE (goto, then reload after clearing
       * storage for a cold boot), so the transform runs twice per asset and a naive push reported
       * "landed" twice for ONE site — inviting the reader to believe there were two. Keyed by
       * file+find, so re-serving the same asset cannot inflate the evidence. */
      const key = r.file + '|' + r.find;
      const prior = landed.find((l) => l.key === key);
      if (prior) { if (n !== prior.actual) prior.unstable = true; }
      else landed.push({ key, file: r.file, expected: r.count, actual: n });
      if (n > 0) out = out.split(r.find).join(r.replace);
    }
    return out;
  };
}

/* ══ CAPTURE ════════════════════════════════════════════════════════════════════════════════════
   ⛔ THE ORDER IN HERE IS A RULING, NOT A PREFERENCE (§81.18). The screenshot is taken BEFORE any
   geometry is read. A getBoundingClientRect pass ahead of the capture forced a layout and moved a
   measured count by 15 pixels — the same order of magnitude as the signal C3 is hunting. */
async function capture(port, chromium, pageRel, PROBE_POINTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  /* OFF-ORIGIN ABORTED. A CDN font or an analytics beacon that answers on one run and not the next
     moves pixels for a reason that has nothing to do with the change under test. */
  let offOrigin = 0;
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:')) return route.continue();
    offOrigin++; return route.abort();
  });
  await page.goto(`http://127.0.0.1:${port}/${pageRel || 'studio.html'}`, { waitUntil: 'load' });
  /* COLD STUDIO: clear storage, then reload so the page boots from the cold path, not from a
     mutated live one. §D10's rAF re-trigger shape — parse-time init must actually re-run. */
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1200);
  /* ⛔⛔ --enter EXISTS BECAUSE THE COLD PROFILE CANNOT SEE THE SURFACE C3 IS ABOUT, AND THAT WAS
   * MEASURED, NOT ASSUMED (2026-08-19). On a cold Studio, `.so-overlay-wrap` (studio.html:18836) is
   * a FIXED, FULL-SCREEN, z-index 9000 landing overlay carrying
   *     linear-gradient(180deg, rgba(3,8,18,.36), rgba(3,8,18,.72))  +  backdrop-filter: blur(9px)
   * — a darkening scrim over the WHOLE viewport with a 9px blur behind it. Measured through it, the
   * two body radials read d=(0,1,0) at the key's own centre: the scrim absorbs the light and the
   * blur smears what survives.
   * 🔑 THIS IS THE DOCUMENTED "MEASURED THROUGH AN ENTRY OVERLAY" RIG FAULT, AND A COLD-PROFILE
   *    d LIT TABLE WOULD HAVE BEEN A PAGE OF CONFIDENT ZEROES DESCRIBING A SURFACE NOBODY LOOKED AT.
   * ⚠️ THE COLD PROFILE IS STILL CORRECT FOR THE GROUND COMMIT'S no-op screenshot — it is wrong ONLY
   *    for measuring the lit drafting surface. TWO PROFILES, TWO JOBS; NEITHER REPLACES THE OTHER.
   * ⛔ AND AN ENTERED PROFILE NEEDS ITS OWN NULL CONTROL. A null pair proven cold proves nothing
   *    about a page that has since run an entry animation. Run --mode=null --enter before believing
   *    any --enter number. */
  if (ENTER) {
    const btn = await page.$('#studioStartScratch');
    /* A donor page (proto2.html) has no landing overlay; --enter is a studio-only concept and
       saying so beats silently skipping, which would make one capture differ from the other. */
    if (!btn) throw new Error('--enter: #studioStartScratch not found — the landing overlay changed shape');
    await btn.click();
    await page.waitForFunction(() => {
      const w = document.getElementById('studioOverlayWrap');
      if (!w) return true;
      const cs = getComputedStyle(w);
      return cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02;
    }, { timeout: 15000 });
    /* The dismissal is a 280ms opacity transition (.so-overlay-wrap.dismissed). Settle well past it
       so neither capture photographs a half-faded scrim. */
    await page.waitForTimeout(1500);
  }
  const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: VH } });
  /* ── EVERYTHING BELOW THIS LINE HAPPENS AFTER THE CAPTURE. See the ruling above. ── */
  /* ⛔⛔ SAMPLE-POINT VALIDATION — ADDED 2026-08-19 BECAUSE THE ACCEPTANCE TEST WAS MEASURING CHROME.
   * The first stage-tone profile sampled y=20/250/550/860 at x=1425. TWO of those four points were
   * not the field at all: y=20 hit `NAV#app-nav` (rgba(9,18,33,.96)) on ours and `HEADER.topbar`
   * (rgba(4,10,18,.94)) on proto2 — so the "target" was proto2's NAV COLOUR, on a nav the Architect
   * had already ruled OUT OF SCOPE — and y=860 compared our `#privacy-banner` against proto2's open
   * stage. Only y=250 and y=550 were ground on both pages.
   * 🔑 THE SAME LAW AS THE RECT-CENTRE FAILURE, ONE MODE OVER: A SAMPLE CAN BE STABLE, IT CAN LACK
   *    SIGNAL, AND IT CAN BE MEASURING SOMETHING ELSE THAT HAPPENS TO SIT WHERE YOU LOOKED.
   * ⛔ SO THE PROBE NOW VALIDATES ITS OWN SAMPLE POINTS AND REFUSES TO SCORE AN OCCLUDED ONE. A
   *    point is FIELD only if every element from the hit-test target up to <body> has a fully
   *    transparent background. Occluded points are PRINTED, never silently dropped and never
   *    scored — an excluded point nobody sees is a population lie. */
  const pointCheck = await page.evaluate((pts) => pts.map(([x, y]) => {
    let el = document.elementFromPoint(x, y);
    if (!el) return [x, y, 'NO ELEMENT', false];
    const first = `${el.tagName}${el.id ? '#' + el.id : ''}`;
    let node = el, blocker = null;
    while (node && node !== document.documentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      const a = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
      if (a > 0.01 && node !== document.body) { blocker = `${node.tagName}${node.id ? '#' + node.id : ''} bg=${bg}`; break; }
      node = node.parentElement;
    }
    return [x, y, blocker || first, !blocker];
  }), (PROBE_POINTS || []));
  const rects = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const id = el.id ? '#' + el.id : null;
      const cls = el.className && typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/)[0] : null;
      out.push({ sel: id || cls || el.tagName.toLowerCase(), x: r.x, y: r.y, w: r.width, h: r.height, area: r.width * r.height });
    });
    return out;
  });
  await browser.close();
  return { shot, rects, offOrigin, pointCheck };
}

/* ══ RECT LOCALISATION ══════════════════════════════════════════════════════════════════════════
   Each differing pixel is attributed to the SMALLEST rect containing it — the innermost element, so
   a diff inside a button is reported as the button and not as <body>. Pixels inside no rect at all
   get their own bucket, because "outside everything" is a finding, not a rounding error. */
function localise(a, b, rects) {
  const A = decodePNG(a), B = decodePNG(b);
  if (A.w !== B.w || A.h !== B.h) throw new Error(`size mismatch ${A.w}x${A.h} vs ${B.w}x${B.h}`);
  const sorted = rects.slice().sort((p, q) => p.area - q.area);
  const buckets = new Map();
  let total = 0, maxDelta = 0, outside = 0;
  const chanA = A.chan, chanB = B.chan;
  for (let y = 0; y < A.h; y++) {
    for (let x = 0; x < A.w; x++) {
      const ia = (y * A.w + x) * chanA, ib = (y * B.w + x) * chanB;
      const dr = Math.abs(A.data[ia] - B.data[ib]);
      const dg = Math.abs(A.data[ia + 1] - B.data[ib + 1]);
      const db = Math.abs(A.data[ia + 2] - B.data[ib + 2]);
      const d = Math.max(dr, dg, db);
      if (d === 0) continue;
      total++; if (d > maxDelta) maxDelta = d;
      let hit = null;
      for (const r of sorted) { if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { hit = r; break; } }
      if (!hit) { outside++; continue; }
      const k = hit.sel;
      const cur = buckets.get(k) || { n: 0, max: 0 };
      cur.n++; if (d > cur.max) cur.max = d;
      buckets.set(k, cur);
    }
  }
  return { total, maxDelta, outside, buckets, pixels: A.w * A.h };
}

/* ══ d LIT — THE MEASURED COLUMN ════════════════════════════════════════════════════════════════
   §81.11/§81.17 struck the ENTIRE computed `d LIT` column: it was calculated by compositing each
   alpha over a FLAT lit field, and the field is not flat. Nothing computed carries forward.
   This samples the ACTUAL composited pixel at a site's rect centre, lit and unlit, and reports the
   per-channel difference. A COMPUTED DELTA INHERITS EVERY ASSUMPTION IN THE MODEL THAT PRODUCED IT;
   A MEASURED ONE INHERITS NONE.
   ⚠️ A site that is not in the DOM, or has no box cold, prints exactly that and NEVER a number. An
      absent site reporting 0 would be indistinguishable from a site the light does not reach. */
function px(img, x, y) {
  const i = (Math.round(y) * img.w + Math.round(x)) * img.chan;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
function sampleSites(a, b, rects, points) {
  const A = decodePNG(a), B = decodePNG(b);
  console.log('\n──── d LIT — MEASURED, per site (rect centre) ────');
  console.log('   every cell below is a MEASUREMENT. the computed column is struck (§81.11).');
  console.log(`   ${'site'.padEnd(30)} ${'unlit rgb'.padEnd(16)} ${'lit rgb'.padEnd(16)} d(r,g,b)`);
  for (const sel of points.sites) {
    const r = rects.find((q) => q.sel === sel);
    if (!r) { console.log(`   ${sel.padEnd(30)} — not in the DOM cold, or no box. NO NUMBER REPORTED.`); continue; }
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (cx < 0 || cy < 0 || cx >= A.w || cy >= A.h) { console.log(`   ${sel.padEnd(30)} — rect centre is off-viewport. NO NUMBER REPORTED.`); continue; }
    const u = px(B, cx, cy), l = px(A, cx, cy);
    const d = [l[0] - u[0], l[1] - u[1], l[2] - u[2]];
    console.log(`   ${sel.padEnd(30)} ${String(u.join(',')).padEnd(16)} ${String(l.join(',')).padEnd(16)} ${d.join(',')}`);
  }
  console.log('\n──── NAMED POINTS (the radial centres — where the light is strongest) ────');
  for (const [name, x, y] of points.pts) {
    const u = px(B, x, y), l = px(A, x, y);
    console.log(`   ${name.padEnd(30)} ${String(u.join(',')).padEnd(16)} ${String(l.join(',')).padEnd(16)} ${[l[0] - u[0], l[1] - u[1], l[2] - u[2]].join(',')}`);
  }
}

/* ══ AREA MODE — WHY THE CENTRE SAMPLE HAD TO GO ════════════════════════════════════════════════
 * The first d LIT sampler read the pixel at each rect's CENTRE. On `#canvas-wrapper` and
 * `#blueprint-container` that centre landed on brass estate content, so both reported 201,168,76
 * lit AND unlit — a confident (0,0,0) that described a drawing, not the light. Reporting it as a
 * zero would have been indistinguishable from "the light does not reach here".
 * 🔑 ONE PIXEL CANNOT REPRESENT A SURFACE THAT HAS ANYTHING DRAWN ON IT.
 * So: sample the WHOLE rect and report a distribution.
 *   · meanDelta  — average per-channel change over every pixel in the rect (the honest d LIT)
 *   · medianDelta— resists content: a chart or a label moves few pixels a lot, and the median
 *                  ignores them while the mean does not
 *   · pctMoved   — what fraction of the rect changed at all. ⭐ THIS IS THE LEG THAT DISTINGUISHES
 *                  "a weak light over the whole panel" from "a strong light on one corner", which
 *                  no single scalar can. */
function areaStats(A, B, r) {
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const x1 = Math.min(A.w, Math.round(r.x + r.w)), y1 = Math.min(A.h, Math.round(r.y + r.h));
  if (x1 <= x0 || y1 <= y0) return null;
  const dr = [], sum = [0, 0, 0]; let moved = 0, n = 0, maxd = 0;
  const litSum = [0, 0, 0], unlitSum = [0, 0, 0];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const ia = (y * A.w + x) * A.chan, ib = (y * B.w + x) * B.chan;
    const d = [A.data[ia] - B.data[ib], A.data[ia + 1] - B.data[ib + 1], A.data[ia + 2] - B.data[ib + 2]];
    for (let k = 0; k < 3; k++) { sum[k] += d[k]; litSum[k] += A.data[ia + k]; unlitSum[k] += B.data[ib + k]; }
    const m = Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2]));
    if (m > 0) moved++;
    if (m > maxd) maxd = m;
    dr.push(d[1]);   /* green: the channel carrying ~71% of luminance */
    n++;
  }
  dr.sort((p, q) => p - q);
  return {
    n, pctMoved: 100 * moved / n, maxd,
    mean: sum.map((v) => +(v / n).toFixed(2)),
    medianG: dr[Math.floor(dr.length / 2)],
    lit: litSum.map((v) => Math.round(v / n)),
    unlit: unlitSum.map((v) => Math.round(v / n)),
  };
}

/* ══ EDGE MODE — THE "BLOB" QUESTION, WHICH IS NOT A BRIGHTNESS QUESTION ════════════════════════
 * A radial on a FLAT field shows its own falloff edge; on a graded field running the same direction
 * the gradient camouflages it. That means the "it reads as a patch" complaint may be an EDGE
 * problem an alpha change cannot fix. This walks a ray outward from the light's centre and reports
 * the value profile, so the falloff can be SEEN as a curve instead of argued about. */
function rayProfile(img, cx, cy, dx, dy, steps, stepPx) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(cx + dx * i * stepPx), y = Math.round(cy + dy * i * stepPx);
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) break;
    const k = (y * img.w + x) * img.chan;
    out.push([i * stepPx, [img.data[k], img.data[k + 1], img.data[k + 2]]]);
  }
  return out;
}

/* ══ VERTICAL PROFILE — THE STAGE TONE'S ACCEPTANCE TEST ════════════════════════════════════════
 * §82.6 is accepted ON THE PROFILE, NOT ON THE DECLARATION, and that distinction is the whole
 * point: proto2's rendered ground is DARKER than its own declared gradient because a vignette and a
 * 6px dot texture sit over it. Authoring the gradient alone gets the top right and leaves the edges
 * bright. ⛔ SO THE DECLARATION IS NOT THE DELIVERABLE — THIS CURVE IS. */
function columnProfile(img, x, ys) {
  return ys.map((y) => {
    const k = (Math.min(y, img.h - 1) * img.w + Math.min(x, img.w - 1)) * img.chan;
    return [y, [img.data[k], img.data[k + 1], img.data[k + 2]]];
  });
}

function report(title, res) {
  console.log(`\n──── ${title} ────`);
  console.log(`  differing pixels : ${res.total} of ${res.pixels}` +
    (res.pixels ? `  (${(100 * res.total / res.pixels).toFixed(4)}%)` : ''));
  console.log(`  max channel delta: ${res.maxDelta}/255`);
  if (res.total === 0) { console.log('  RECTS            : (none — nothing differed)'); return; }
  const rows = [...res.buckets.entries()].sort((p, q) => q[1].n - p[1].n);
  console.log('  RECTS (a total is not a result — this is):');
  for (const [sel, v] of rows.slice(0, 20)) console.log(`     ${String(v.n).padStart(8)} px  max ${String(v.max).padStart(3)}/255   ${sel}`);
  console.log(`     ${String(res.outside).padStart(8)} px               (outside every rect)`);
}

/* ══ MAIN ═══════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  if (!MODE) { console.log('SCORE 0/0 RED — no --mode given. See the usage block at the top of this file.'); process.exit(2); }
  let chromium;
  try { ({ chromium } = await import(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs'))); }
  catch { ({ chromium } = await import('playwright')); }

  if (MODE === 'absolute') {
    /* THE ABSOLUTE PROOF — no comparison in it, which is precisely why it can see a defect that is
       present on BOTH sides of a differential. §81.12. Assertions are added here by the commit that
       introduces the thing being asserted; an empty set REPORTS ITSELF AS EMPTY and exits 2 rather
       than printing a green over nothing. */
    const srv = await serve(PORT_A, null, []);
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route('**/*', (r) => r.request().url().startsWith('http://127.0.0.1:') ? r.continue() : r.abort());
    await page.goto(`http://127.0.0.1:${PORT_A}/studio.html`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const facts = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const root = getComputedStyle(document.documentElement);
      /* DECLARED text — this is what getPropertyValue returns for a custom property. It is the
         SPELLING, not the resolved colour, and it is only good for "is this declared at all". */
      const declared = (n) => root.getPropertyValue(n).trim();
      /* ⛔ RESOLVED colour — a custom property is SUBSTITUTED, never computed to a colour, so
       * getPropertyValue('--x') hands back `color-mix(in srgb, #5DCAA5 18%, transparent)` verbatim.
       * Asserting on that is asserting the SPELLING, which §69 already settled means nothing. To
       * get the PIXEL-TRUE value you must push the token through a REAL colour property and read
       * that back — the browser resolves it there and nowhere else. */
      const resolve = (expr) => {
        const d = document.createElement('div');
        d.style.color = expr; d.style.display = 'none';
        document.body.appendChild(d);
        const v = getComputedStyle(d).color;
        d.remove();
        return v;
      };
      return {
        bodyBgImage: cs.backgroundImage,
        bodyBgColor: cs.backgroundColor,
        lightKeyDeclared: declared('--light-key'),
        lightKey: resolve('var(--light-key)'),
        lightFill: declared('--light-fill'),
        gridLine: resolve('var(--grid-line)'),
        surface: resolve('var(--surface)'),
        paintCyan: declared('--paint-cyanotype'),
        canvasBgImage: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el).backgroundImage : ''; })(),
        canvasShadow: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el).boxShadow : ''; })(),
        afterBg: (() => { const el = document.querySelector('.canvas-wrapper'); return el ? getComputedStyle(el, '::after').backgroundImage : ''; })(),
      };
    });
    await browser.close(); srv.close();
    console.log('\n──── ABSOLUTE (CSSOM, no comparison in it) ────');
    for (const [k, v] of Object.entries(facts)) console.log(`  ${k.padEnd(14)} = ${v}`);
    /* ⛔ THE POINT OF AN ABSOLUTE PROOF: it asserts the page IS what it should be, with NO reference
       to another rendering — which is exactly why it can see a defect present on BOTH sides of a
       differential (§81.12, the unterminated comment that ate two rules). */
    let pass = 0; const legs = [];
    const ok = (name, cond, saw) => { legs.push([name, cond, saw]); if (cond) pass++; };
    /* rgb(93,202,165) is verdigris; chromium may spell it rgba(...) or color(srgb ...). ASSERT THE
       RESOLVED COLOUR, NEVER THE SPELLING — §69 settled that a string difference means nothing. */
    /* RESOLVED colours now, so these match a real rgba()/color() string, never a declaration. */
    const isVerdigris18 = (s) => /(93,\s*202,\s*165|0\.364706)/.test(s) && /0?\.18/.test(s);
    ok('L1 body carries exactly ONE radial-gradient (the key; the fill is HELD)',
      (facts.bodyBgImage.match(/radial-gradient/g) || []).length === 1,
      (facts.bodyBgImage.match(/radial-gradient/g) || []).length + ' found');
    ok('L2 that radial is positioned at 70% 15%',
      /at 70% 15%/.test(facts.bodyBgImage), facts.bodyBgImage.slice(0, 60));
    ok('L3 --light-key resolves to verdigris at 0.18',
      isVerdigris18(facts.lightKey), facts.lightKey + '   (declared: ' + facts.lightKeyDeclared + ')');
    ok('L4 --light-fill is ABSENT — a role with no consumer is never declared',
      facts.lightFill === '', JSON.stringify(facts.lightFill));
    ok('L5 --paint-cyanotype is OPAQUE (the repair: alpha moved to each role)',
      /^#?64B4FF$/i.test(facts.paintCyan.replace('#', '#')) || /rgb\(\s*100,\s*180,\s*255\s*\)/.test(facts.paintCyan),
      facts.paintCyan);
    ok('L6 --grid-line still resolves to cyanotype at 0.05 (VALUE invariant)',
      /(100,\s*180,\s*255|0\.392157)/.test(facts.gridLine) && /0?\.05/.test(facts.gridLine),
      facts.gridLine);
    ok('L7 the body field is still painted (the shorthand did not eat background-color)',
      /rgb\(\s*9,\s*18,\s*33\s*\)/.test(facts.bodyBgColor), facts.bodyBgColor);
    /* ⛔ §11.4 — REGISTRATION AND WIRING ARE TWO PROOFS. The profile proves the ground LOOKS right;
       these prove the layers are actually ATTACHED. A stage that hit the target for some other
       reason would pass the profile and fail here. */
    ok('L8 body carries the graded stage field beneath the light (2 layers, not 1)',
      /linear-gradient/.test(facts.bodyBgImage) && (facts.bodyBgImage.match(/gradient/g) || []).length >= 2,
      (facts.bodyBgImage.match(/gradient/g) || []).length + ' gradient layer(s)');
    ok('L9 .canvas-wrapper consumes --stage-base AND keeps its inset shadow',
      /linear-gradient/.test(facts.canvasBgImage) && /rgba\(0,\s*0,\s*0,\s*0?\.26\)|rgb\(0, 0, 0\)/.test(facts.canvasShadow) && facts.canvasShadow !== 'none',
      'bgLayers=' + (facts.canvasBgImage.match(/gradient/g) || []).length + '  shadow=' + facts.canvasShadow.slice(0, 46));
    ok('L10 the vignette is on the STAGE as ::after, not on body (§82.8 relocation)',
      /gradient/.test(facts.afterBg) && !/radial-gradient\(circle at 50% 50%/.test(facts.bodyBgImage),
      'after=' + facts.afterBg.slice(0, 42) + '  bodyHasVignette=' + /circle at 50% 50%/.test(facts.bodyBgImage));
    console.log('');
    for (const [n, c, saw] of legs) console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}\n          saw: ${saw}`);
    console.log(`\nSCORE ${pass}/${legs.length} ${pass === legs.length ? 'GREEN' : 'RED'}`);
    process.exit(pass === legs.length ? 0 : 1);
  }

  /* ══ PROFILE — ABSOLUTE, SINGLE CAPTURE, NO COMPARISON IN IT ═════════════════════════════════
     ⛔ A NULL *PAIR* DOES NOT APPLY HERE — there is no second tree. But the principle does, so the
     absolute analogue is used instead: CAPTURE TWICE AND REQUIRE THE TWO TO BE IDENTICAL. Proving
     the instrument is stable before believing a small number is the same discipline either way. */
  if (MODE === 'profile') {
    const srv = await serve(PORT_A, null, []);
    const ysAll = TARGET && TARGETS[TARGET] ? Object.keys(TARGETS[TARGET]).map(Number) : [20, 120, 250, 400, 550, 700, 860];
    const pts = [];
    for (const x of COLS) for (const y of ysAll) pts.push([x, y]);
    const c1 = await capture(PORT_A, chromium, PAGE, pts);
    const c2 = await capture(PORT_A, chromium, PAGE, pts);
    srv.close();
    const A = decodePNG(c1.shot), A2 = decodePNG(c2.shot);
    let drift = 0;
    for (let i = 0; i < A.data.length; i++) if (A.data[i] !== A2.data[i]) drift++;
    console.log(`\nSTABILITY (the absolute analogue of a null pair): ${drift} of ${A.data.length} subpixels differ between two captures of the SAME page`);
    if (drift !== 0) {
      console.log('⛔ THE PAGE DOES NOT RENDER DETERMINISTICALLY. Every number below is unreadable.');
      console.log('SCORE 0/1 RED'); process.exit(1);
    }
    const okAt = new Map();
    for (const [x, y, what, isField] of (c1.pointCheck || [])) okAt.set(x + ',' + y, [what, isField]);
    const occluded = (c1.pointCheck || []).filter((p) => !p[3]);
    if (occluded.length) {
      console.log('\n⛔ OCCLUDED SAMPLE POINTS — NOT THE FIELD, NOT SCORED, NOT HIDDEN:');
      for (const [x, y, what] of occluded) console.log(`   x=${x} y=${y}  blocked by ${what}`);
      console.log('   A point that is not measuring the ground cannot judge the ground.');
    }
    const ys = ysAll;
    let fails = 0, legs = 0;
    for (const x of COLS) {
      console.log(`\n──── VERTICAL GROUND PROFILE — ${PAGE}, column x=${x} ────`);
      for (const [y, rgb] of columnProfile(A, x, ys)) {
        let line = `   y=${String(y).padStart(4)}  rgb(${rgb.join(',')})`;
        const chk = okAt.get(x + ',' + y);
        if (chk && !chk[1]) { console.log(line + '   ⛔ OCCLUDED (' + chk[0] + ') — NOT SCORED'); continue; }
        if (TARGET && TARGETS[TARGET] && TARGETS[TARGET][y]) {
          const t = TARGETS[TARGET][y];
          const d = rgb.map((v, i) => v - t[i]);
          const ok = d.every((v) => Math.abs(v) <= TOL);
          legs++; if (!ok) fails++;
          line += `   target ${TARGET} rgb(${t.join(',')})   d=(${d.join(',')})   ${ok ? 'within ±' + TOL : '⛔ OUTSIDE ±' + TOL}`;
        }
        console.log(line);
      }
    }
    if (TARGET) {
      console.log(`\n⚖️  ACCEPTANCE IS THE PROFILE, NOT THE DECLARATION (§82.6).`);
      console.log(`SCORE ${legs - fails}/${legs} ${fails === 0 ? 'GREEN' : 'RED'}`);
      process.exit(fails === 0 ? 0 : 1);
    }
    console.log('\n(no --target given — this printed a MEASUREMENT, not a verdict)');
    console.log('SCORE 1/1 GREEN');
    process.exit(0);
  }

  if (!['null', 'differential', 'selftest', 'dlit', 'area', 'edge'].includes(MODE)) {
    console.log(`SCORE 0/0 RED — unknown --mode=${MODE}`); process.exit(2);
  }
  /* dlit IS a differential measurement (lit vs unlit), so it inherits the null-control gate. */
  if ((MODE === 'differential' || MODE === 'dlit') && !NULL_FIRST) {
    console.log('\n⛔ REFUSING TO RUN.');
    console.log('   --mode=differential requires --i-ran-null-first.');
    console.log('   A DIFFERENTIAL MEASUREMENT WITHOUT A NULL PAIR IS NOT A MEASUREMENT — IT IS A NUMBER.');
    console.log('   Run --mode=null, confirm it reads 0, then pass the flag. (§81.17)');
    console.log('SCORE 0/0 RED — null control not established.');
    process.exit(1);
  }

  const setName = MODE === 'selftest' ? 'selftest' : REVERT_NAME;
  const set = MODE === 'null' ? [] : (REVERTS[setName] || null);
  if (MODE !== 'null' && !set) { console.log(`SCORE 0/0 RED — no revert set named "${setName}"`); process.exit(2); }
  if (MODE !== 'null' && set.length === 0) {
    console.log(`\n⛔ REVERT SET "${setName}" IS EMPTY.`);
    console.log('   A control that changes nothing renders both sides identical and reports a');
    console.log('   beautiful, meaningless 0. That is an INERT CONTROL, and this tool will not');
    console.log('   print a number over one. Populate REVERTS.' + setName + ' in this file.');
    console.log('SCORE 0/0 RED — inert control refused.');
    process.exit(1);
  }

  const landed = [];
  const srvA = await serve(PORT_A, null, landed);
  const srvB = await serve(PORT_B, MODE === 'null' ? null : makeTransform(set), landed);

  console.log(`MODE: ${MODE}${MODE === 'null' ? '  (same tree on both ports — this MUST read 0)' : `  revert set "${setName}"`}`);
  console.log(`PROFILE: ${VW}x${VH} · ${ENTER ? 'ENTERED Studio (landing overlay dismissed)' : 'cold Studio (landing overlay UP — it scrims + blurs; see capture())'} · signed-out · headless chromium · off-origin aborted`);

  const A = await capture(PORT_A, chromium);
  const B = await capture(PORT_B, chromium);
  srvA.close(); srvB.close();

  /* ⛔ THE POISON MUST PROVE IT LANDED — before any pixel number is believed. */
  if (MODE !== 'null') {
    const bad = landed.filter((l) => l.actual !== l.expected);
    const seen = new Set(landed.map((l) => l.file + '|' + l.expected));
    console.log('\n──── CONTROL LANDING ────');
    if (!landed.length) {
      console.log('  ⛔ the transform was never invoked — no served asset matched a revert entry.');
      console.log('SCORE 0/0 RED — control never ran.'); process.exit(1);
    }
    for (const l of landed) console.log(`  ${l.file}: expected ${l.expected}, matched ${l.actual}${l.actual === l.expected ? '' : '   ⛔'}`);
    if (bad.length) { console.log('\nSCORE 0/0 RED — a revert entry did not land as declared. The number below would be meaningless.'); process.exit(1); }
    void seen;
  }

  console.log(`\noff-origin requests aborted: A=${A.offOrigin} B=${B.offOrigin}`);
  console.log(`rects measured AFTER capture: A=${A.rects.length} B=${B.rects.length}`);

  if (MODE === 'area' || MODE === 'edge') {
    const IA = decodePNG(A.shot), IB = decodePNG(B.shot);
    if (MODE === 'area') {
      /* ⛔ THE SITES ARE THE RENDERED POPULATION, NOT A HAND LIST: every rect that actually has a
         box. Filtered to real surfaces so the report is readable, but nothing is EXCLUDED silently
         — the count of skipped rects is printed. */
      const want = ['#estate-analysis', '#want-readout', '#shape-hud', '#shape-mode-toggle',
        '#canvas-wrapper', '#blueprint-container', '.hud-panel', '.drafting-panel', '.ira-why-panel'];
      console.log('\n──── d LIT BY AREA — the whole rect, not one pixel ────');
      console.log('   ' + 'site'.padEnd(24) + 'mean unlit'.padEnd(14) + 'mean lit'.padEnd(14) + 'mean d(r,g,b)'.padEnd(20) + 'medG'.padEnd(6) + '%moved'.padEnd(8) + 'maxd');
      let missing = 0;
      for (const sel of want) {
        const r = A.rects.find((q) => q.sel === sel);
        if (!r) { console.log('   ' + sel.padEnd(24) + '— no box. NO NUMBER REPORTED.'); missing++; continue; }
        const st = areaStats(IA, IB, r);
        if (!st) { console.log('   ' + sel.padEnd(24) + '— rect off-viewport. NO NUMBER REPORTED.'); missing++; continue; }
        console.log('   ' + sel.padEnd(24) + ('rgb(' + st.unlit.join(',') + ')').padEnd(14) +
          ('rgb(' + st.lit.join(',') + ')').padEnd(14) + ('(' + st.mean.join(',') + ')').padEnd(20) +
          String(st.medianG).padEnd(6) + (st.pctMoved.toFixed(1) + '%').padEnd(8) + st.maxd);
      }
      console.log(`   (${missing} site(s) had no box and were reported as such, never as a zero)`);
      console.log('\n🔑 %moved separates "a weak light over the whole panel" from "a strong light on one');
      console.log('   corner". A single scalar cannot, and the centre sample could see neither.');
    } else {
      /* EDGE — walk outward from the light's authored centre and print the falloff as a curve. */
      const cx = Math.round(VW * 0.70), cy = Math.round(VH * 0.15);
      console.log(`\n──── FALLOFF ALONG A RAY FROM THE LIGHT CENTRE (${cx},${cy}) ────`);
      console.log('   Answers the "is it a blob" question, which is an EDGE question and not a');
      console.log('   brightness one — an alpha change cannot fix an edge.');
      for (const [name, dx, dy] of [['down-left  ', -0.7071, 0.7071], ['straight down', 0, 1], ['left       ', -1, 0]]) {
        const la = rayProfile(IA, cx, cy, dx, dy, 12, 40), lb = rayProfile(IB, cx, cy, dx, dy, 12, 40);
        console.log('   ' + name + ' :  ' + la.map((p, i) => {
          const d = p[1][1] - (lb[i] ? lb[i][1][1] : p[1][1]);
          return `${p[0]}px:+${d}`;
        }).join('  '));
      }
      console.log('   (each entry is DISTANCE:GREEN-CHANNEL LIFT over the unlit page)');
    }
    console.log('\nSCORE 1/1 GREEN   (a measurement, not a verdict)');
    await (async () => {})();
  }
  if (MODE === 'dlit') {
    sampleSites(A.shot, B.shot, A.rects, {
      sites: ['#estate-analysis', '#want-readout', '#shape-hud', '#shape-mode-toggle',
              '#canvas-recenter', '.ira-why-panel', '#canvas-wrapper', '#blueprint-container'],
      /* THE TWO RADIAL CENTRES at 1440x900: key 70%/15% · fill 20%/80%. Sampled because the
         BRIGHTEST point of each light is the one place its authored alpha is fully expressed. */
      pts: [['key centre 70%/15%', Math.round(VW * 0.70), Math.round(VH * 0.15)],
            ['fill centre 20%/80%', Math.round(VW * 0.20), Math.round(VH * 0.80)]],
    });
  }
  const res = localise(A.shot, B.shot, A.rects);
  report(MODE === 'null' ? 'NULL CONTROL — same tree, both ports' : `DIFFERENTIAL — shipped vs "${setName}" reverted in the SERVED bytes`, res);

  if (MODE === 'null') {
    if (res.total === 0) { console.log('\n✅ NULL CONTROL CLEAN — rendering is deterministic. A small number may now be believed.'); console.log('SCORE 1/1 GREEN'); process.exit(0); }
    console.log('\n⛔ NULL CONTROL DIRTY — the same tree differs from itself.');
    console.log('   Every differential number from this rig is UNREADABLE until this reads 0.');
    console.log('SCORE 0/1 RED'); process.exit(1);
  }
  if (MODE === 'selftest') {
    if (res.total > 10000) { console.log('\n✅ SELFTEST — the differ BITES (a field-wide poison moved a large, localised area).'); console.log('SCORE 1/1 GREEN'); process.exit(0); }
    console.log('\n⛔ SELFTEST FAILED — a poison that repainted the page field moved almost nothing.');
    console.log('   THE DIFFER IS BROKEN. Every number it has printed is void.');
    console.log('SCORE 0/1 RED'); process.exit(1);
  }
  console.log('\n⚖️  DIFFERENTIAL ONLY. This is half the proof (§81.12). Pair it with --mode=absolute');
  console.log('    and scripts/_gate_css_comments.js, and report the two SEPARATELY.');
  console.log('SCORE 1/1 GREEN');
  process.exit(0);
})().catch((e) => { console.log('\nSCORE 0/0 RED — harness failure: ' + (e && e.stack || e)); process.exit(2); });
