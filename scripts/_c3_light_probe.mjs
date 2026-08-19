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
      /* ONE radial, not two — the cool fill was measured at d=(0,0,0) and HELD, so it never
         shipped. If a future commit places it, this find string moves with it or the control
         silently stops landing and the guard below turns the run red. */
      find: '    background-image:\n' +
            '      radial-gradient(circle at 70% 15%, var(--light-key), transparent 24%);\n',
      replace: '',
      count: 1,
    },
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
async function capture(port, chromium) {
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
  await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: 'load' });
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
  return { shot, rects, offOrigin };
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
    console.log('');
    for (const [n, c, saw] of legs) console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}\n          saw: ${saw}`);
    console.log(`\nSCORE ${pass}/${legs.length} ${pass === legs.length ? 'GREEN' : 'RED'}`);
    process.exit(pass === legs.length ? 0 : 1);
  }

  if (!['null', 'differential', 'selftest', 'dlit'].includes(MODE)) {
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
