'use strict';
/* @gate-pool: browser
 * ═══ TOKEN AUTHORITY — one shared file decides every live page's palette ═══════════════════════
 *
 * WHY THIS EXISTS. styles/typography.css defined 11 shared tokens for months and 24 pages linked
 * it — and 18 of those 24 carried their OWN :root AFTER the link. Same specificity (0,1,0), later
 * in document order, so the local copy won every time. Editing the canonical file changed SIX
 * pages out of 24 and nobody could tell.
 *   ⛔ A SINGLE SOURCE THAT IS OUTRANKED IS WORSE THAN NO SINGLE SOURCE. It teaches the next
 *      person that centralising does not work, so they go back to editing locally.
 * Measured before the fix: poison --gold in the shared file and 0 of 24 pages followed. After:
 * 24 of 24. This gate is what keeps that true after the next page is added.
 *
 * ⭐ IT ASSERTS BEHAVIOUR, NOT SHAPE. Counting stray :root blocks asks whether the WRONG SHAPE
 * exists; poisoning the token asks whether the RIGHT BEHAVIOUR happens — and the second survives
 * a mechanism nobody has thought of yet. L2 (shape) is kept only because it localises a failure
 * that L3 (behaviour) can only report globally.
 *
 * ⛔⛔ L4 IS HERE BECAUSE WE SHIPPED THE DEFECT IT CATCHES (7d69d83, repaired in 110e3c9).
 * sketchsnapshot.html builds a DOWNLOADABLE standalone SVG inside a template literal, carrying its
 * own `<style> :root { … }` with a deliberately web-safe stack. An exported file can NEVER reach
 * styles/*.css, so that block is correct BY DESIGN and must stay self-sufficient. A transform that
 * matched `:root {…}` as raw text stripped six colour tokens out of it, and every page-level
 * instrument said "no change" — truthfully, because THE EXPORT IS A SURFACE THEY NEVER VISIT.
 *   🔑 A GATE PROVES THE SURFACES IT VISITS. A PAGE IS NOT THE ONLY SURFACE A PAGE PRODUCES.
 *   ⚠️ AND WITHOUT L4 THIS GATE WOULD ENFORCE THE BUG AS POLICY: the shadow census scored the
 *      export as a shadow until it was taught the difference, so a shape-only gate would have
 *      demanded the export be stripped forever, and every future wirer would have obeyed it.
 *      A GUARD DERIVED FROM A MEASUREMENT INHERITS THAT MEASUREMENT'S BLIND SPOTS.
 *
 * ⚠️ A `<style>` TEST IS NOT ENOUGH TO FIND AN EXPORT: the template literal contains a literal
 * <style> tag, so the block IS inside one. Only the enclosing <script> distinguishes it.
 *
 * POPULATIONS ARE DERIVED, NEVER LISTED:
 *   live pages   = transitive closure over <a href> from the routes _redirects actually serves
 *                  plus every link the shared chrome emits (nav.js, account-topbar.js,
 *                  datum-footer.js). A page nobody links to cannot smuggle itself in.
 *   shared tokens= whatever the canonical styles/*.css :root declares.
 *   exports      = every :root that sits inside a <script>.
 *
 * LEGS
 *   L1  no shared token has TWO sources under styles/                      [BITE twosource]
 *   L2  no live page re-declares a shared token in its own page CSS        [BITE reshadow]
 *   L3  poison the ROOT of the token chain -> EVERY live page follows      [BITE reshadow]
 *   L4  every export surface is SELF-SUFFICIENT: each var(--x) it uses is
 *       declared by its own :root                                          [BITE strip]
 *   L5  no CRAFT surface reads a palette token (page field excepted,
 *       and that exception is DERIVED, not listed)                         [BITE craftpaint]
 *   L3a/L4a/L5a  blindness assertions — the rig must prove it served pages, found an
 *       export to judge, and found craft rules to judge. AN INSTRUMENT THAT MEASURES
 *       NOTHING AGREES WITH ITSELF PERFECTLY.
 *
 * CONTROLS — each names the leg it must move AND the legs it must NOT
 *   --twosource  a second styles file declares a shared token -> L1 RED alone
 *   --reshadow   one live page regains a local :root shadow    -> L2 + L3 RED, L4 green
 *   --strip      one declaration removed from an export :root  -> L4 RED alone (the 7d69d83 defect)
 *   --craftpaint a craft rule starts reading the palette       -> L5 RED alone
 *
 * ⭐ L4 AND L5 SHARE A SHAPE, AND IT IS THE SHAPE THIS REPO KEEPS PAYING FOR: TWO EXPECTATIONS,
 * ONE INPUT. Poison the palette and every live page MUST move; the export and the craft register
 * MUST NOT. A gate that only checked the first would bless the very defects these legs exist for.
 *
 * Usage: node scripts/_gate_token_authority.js [--twosource|--reshadow|--strip|--craftpaint]
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);
const TWOSOURCE = process.argv.includes('--twosource');
const RESHADOW = process.argv.includes('--reshadow');
const STRIP = process.argv.includes('--strip');
const CRAFTPAINT = process.argv.includes('--craftpaint');
const MUT = TWOSOURCE || RESHADOW || STRIP || CRAFTPAINT;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const legs = {};
const leg = (name, c, m) => { legs[name] = !!c; ok(c, `${name} ${m}`); };

// ── population: tracked pages ────────────────────────────────────────────────────────────────
const tracked = execSync('git ls-files -z', { maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter(Boolean);
const PAGES = new Set(tracked.filter((f) => /\.html$/i.test(f) && !f.startsWith('dist/')));
const STYLES = tracked.filter((f) => /^styles\/.*\.css$/i.test(f));

// ── shared tokens = what the canonical styles file(s) declare ────────────────────────────────
const rootBlocks = (src) => src.match(/:root\s*\{[^}]*\}/g) || [];
const declsIn = (block) => [...block.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)]
  .map((m) => [m[1], m[2].trim()]);

const styleDecl = new Map();   // styles file -> Map(token -> value)
for (const f of STYLES) {
  const m = new Map();
  for (const b of rootBlocks(fs.readFileSync(f, 'utf8'))) for (const [k, v] of declsIn(b)) m.set(k, v);
  if (m.size) styleDecl.set(f, m);
}
if (TWOSOURCE) {
  // a SECOND shared-token source appears — the exact regression L1 exists to stop
  const any = [...styleDecl.values()][0];
  const tok = any ? [...any.keys()][0] : '--gold';
  styleDecl.set('styles/__synthetic_second_source.css', new Map([[tok, '#000000']]));
}

const SHARED = new Set();
for (const m of styleDecl.values()) for (const k of m.keys()) SHARED.add(k);

/* ── L1 · ONE SOURCE PER TOKEN ────────────────────────────────────────────────────────────────
 * The invariant is PER TOKEN, not per file. styles/header.css legitimately owns
 * --studio-panel-w and has no business being merged into the palette; what must never happen is
 * ONE TOKEN declared by TWO files, because then "edit the shared file" has two answers and the
 * winner is decided by link order. An earlier draft of this leg asserted "exactly one styles file
 * declares tokens" and went red on a file doing nothing wrong — A GATE THAT REDS ON CORRECT CODE
 * IS A GATE PEOPLE SWITCH OFF. */
const perToken = new Map();
for (const [f, m] of styleDecl) for (const k of m.keys()) {
  if (!perToken.has(k)) perToken.set(k, []);
  perToken.get(k).push(f);
}
const twoSourced = [...perToken.entries()].filter(([, fl]) => fl.length > 1)
  .map(([k, fl]) => `${k} <- ${fl.join(' + ')}`);
leg('L1', twoSourced.length === 0,
  `no shared token has two sources under styles/ — got ${twoSourced.length}${twoSourced.length ? ': ' + twoSourced.join(' | ') : ''} [BITE twosource]`);

/* ── WHAT L3 POISONS: THE TOP OF THE CHAIN, NOT THE NAME THE PAGE HAPPENS TO READ ─────────────
 * The page reads a LEGACY name (--gold). Once tokens.css exists that name is defined FROM a role
 * token, which is defined FROM a paint token, which is the only place a hex ever appears:
 *     --paint-brass: #C9A84C  ->  --accent-…: var(--paint-brass)  ->  --gold: var(--accent-…)
 * Poisoning the leaf would prove only the last link. Poisoning the ROOT proves PAINT -> ROLE ->
 * LEGACY -> PAGE in one shot, which is the whole architecture.
 * ⭐ Written as a resolver rather than a hard-coded paint name so it needs no edit on extraction
 *    day: TODAY --gold holds a literal and the walk terminates immediately; AFTERWARDS the same
 *    code walks up to the paint entry and the leg gets strictly stronger by itself. */
const MEASURE_TOKEN = '--gold';          // what the PAGE is asked for — a name real pages read
const valueOf = (t) => { for (const m of styleDecl.values()) if (m.has(t)) return m.get(t); return null; };
let POISON_TOKEN = MEASURE_TOKEN;
{
  const seen = new Set();
  for (;;) {
    if (seen.has(POISON_TOKEN)) break;   // cycle guard: a broken chain must not hang the gate
    seen.add(POISON_TOKEN);
    const v = valueOf(POISON_TOKEN);
    const m = v && v.match(/^var\(\s*(--[A-Za-z0-9_-]+)/);
    if (!m || !valueOf(m[1])) break;
    POISON_TOKEN = m[1];
  }
}
const CANON = (perToken.get(POISON_TOKEN) || []).find((f) => !f.includes('__synthetic'))
  || [...styleDecl.keys()][0];

// ── live set: routes + shared chrome, closed over <a href> ───────────────────────────────────
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
  const s = fs.readFileSync(c, 'utf8');
  for (const m of s.matchAll(/["'`]\/?([A-Za-z0-9._\-%À-￿ ]+\.html)["'`?#]/g)) {
    const p = decodeURIComponent(m[1]); if (PAGES.has(p)) seeds.add(p);
  }
}
const hrefsOf = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    let h = m[1].split('#')[0].split('?')[0];
    if (!h || /^([a-z]+:)?\/\//i.test(h) || /^(mailto:|tel:|data:)/i.test(h)) continue;
    h = decodeURIComponent(h.replace(/^\//, '')) || 'index.html';
    if (PAGES.has(h)) out.add(h);
  }
  return out;
};
const LIVE = new Set(seeds);
{
  const q = [...LIVE];
  while (q.length) {
    const f = q.shift();
    for (const t of hrefsOf(fs.readFileSync(f, 'utf8'))) if (!LIVE.has(t)) { LIVE.add(t); q.push(t); }
  }
}

// ── source helpers: page CSS vs export surface ───────────────────────────────────────────────
const scriptRanges = (s) => [...s.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => [m.index, m.index + m[0].length]);
const inAny = (rs, i) => rs.some(([a, z]) => i >= a && i < z);

const RESHADOW_TOKEN = '--gold';
const RESHADOW_VALUE = '#123456';
const reshadowTarget = [...LIVE].sort().find((f) =>
  /<link[^>]+href="\/styles\//.test(fs.readFileSync(f, 'utf8')));

function pageSource(f) {
  let s = fs.readFileSync(f, 'utf8');
  if (RESHADOW && f === reshadowTarget) {
    // reinstate exactly the defect this arc removed: a local :root AFTER the shared link
    s = s.replace(/(<link[^>]+href="\/styles\/[^>]*>)/, `$1\n<style>:root{${RESHADOW_TOKEN}:${RESHADOW_VALUE};}</style>`);
  }
  if (STRIP && f === 'sketchsnapshot.html') {
    // reproduce 7d69d83: delete a declaration from the EXPORT's own :root
    const rs = scriptRanges(s);
    for (const b of s.matchAll(/:root\s*\{[^}]*\}/g)) {
      if (!inAny(rs, b.index)) continue;
      const stripped = b[0].replace(/--gold\s*:\s*[^;]+;/, '');
      s = s.slice(0, b.index) + stripped + s.slice(b.index + b[0].length);
      break;
    }
  }
  return s;
}

// ── L2 · NO PAGE SHADOWS on a live page ──────────────────────────────────────────────────────
const shadows = [];
for (const f of [...LIVE].sort()) {
  const s = pageSource(f);
  const li = s.search(/<link[^>]+href="\/styles\/[^"]*\.css/);
  if (li < 0) continue;
  const rs = scriptRanges(s);
  for (const b of s.matchAll(/:root\s*\{[^}]*\}/g)) {
    if (b.index < li || inAny(rs, b.index)) continue;   // export surfaces are NOT shadows
    for (const [k, v] of declsIn(b[0])) if (SHARED.has(k)) shadows.push(`${f}: ${k}=${v}`);
  }
}
leg('L2', shadows.length === 0,
  `no live page re-declares a shared token in page CSS — got ${shadows.length}${shadows.length ? ': ' + shadows.slice(0, 4).join(' | ') : ''} [BITE reshadow]`);

// ── L4 · EXPORT SELF-SUFFICIENCY ─────────────────────────────────────────────────────────────
// Every var(--x) inside a script that owns a :root must be declared by that :root. An export
// cannot reach styles/*.css, so anything it uses it must carry.
/* POPULATION IS EVERY TRACKED PAGE, NOT JUST THE LIVE ONES. "An export must carry what it uses"
 * is true wherever the export lives — and sketchsnapshot.html, the page whose export we actually
 * broke, is NOT reachable from the nav. Scoping this leg to LIVE found ZERO surfaces and passed
 * vacuously: the leg that exists to catch a real defect could not see the file it was written for.
 * ⭐ EXCLUSION NEEDS PRESENCE — L4a below refuses to let that read as success. */
const exportFindings = [];
let exportSurfaces = 0;
for (const f of [...PAGES].sort()) {
  const s = pageSource(f);
  for (const m of s.matchAll(/<script[\s\S]*?<\/script>/gi)) {
    const rb = (m[0].match(/:root\s*\{[^}]*\}/) || [])[0];
    if (!rb) continue;
    exportSurfaces++;
    const declared = new Set(declsIn(rb).map(([k]) => k));
    const used = new Set([...m[0].matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((x) => x[1]));
    for (const u of used) if (!declared.has(u)) exportFindings.push(`${f}: uses ${u}, does not declare it`);
  }
}
// EXCLUSION NEEDS PRESENCE: a green here means nothing if there is no export to judge.
leg('L4a', exportSurfaces > 0, `at least one export surface exists to judge — found ${exportSurfaces}`);
leg('L4', exportFindings.length === 0,
  `every export surface is SELF-SUFFICIENT — got ${exportFindings.length}${exportFindings.length ? ': ' + exportFindings.slice(0, 4).join(' | ') : ''} [BITE strip]`);

/* ── L5 · THE CRAFT REGISTER IS UNREACHABLE FROM THE PALETTE ──────────────────────────────────
 * The site has TWO vocabularies on purpose. The INSTRUMENT register (paint/role/legacy) is for
 * what must AGREE; the CRAFT register — the cream paper, the brass rail, the punch rings, the desk
 * shadow, the fibre textures — is for what must BE ITSELF.
 *   A TOKEN IS FOR WHAT MUST AGREE. A LITERAL IS FOR WHAT MUST BE ITSELF. CRAFT IS NOT DRIFT.
 *
 * MEASURED 2026-08-16 across the three craft hosts: 504 literal colour stops in craft rules and 31
 * var() reads, of which only five touch a shared token — four of those are fonts. The rail is a
 * NINE-STOP LITERAL gradient (#020304 -> #5c4213 -> #b98e34 -> #ffe9a3 -> #fffdda -> #a87a22 ->
 * #030405) and the paper runs on its own names (--vellum-warm, --v11-paper-*, --paper-tan).
 *
 * ⛔ THE DANGER RUNS THE OPPOSITE WAY TO THE OBVIOUS ONE: tokenising the brass would DESTROY it.
 * The shine is the non-linear jump from #5c4213 to #ffe9a3; the same gradient rebuilt from one
 * paint at nine alphas reads as a flat tint. Without this leg, a future wirer "tidying those
 * literals into tokens" would pass every other gate we own while deleting the most distinctive
 * thing on the site — in good faith.
 *
 * ⭐ WHY STATIC AND NOT A SCREENSHOT. The first version of this proof tried to photograph the
 * rails and ABORTED: they only render with saved content, so it captured nothing. THE CLAIM IS
 * REACHABILITY, NOT ONE RENDERING — and reachability is provable statically and COMPLETELY, for
 * every state, which a screenshot never is. MATCH THE INSTRUMENT TO THE CLAIM, NOT TO THE HABIT.
 *
 * ⚠️ THE ONE ALLOWANCE IS DERIVED, NOT LISTED. A craft surface SITS ON the page field, so reading
 * the field is correct — studio.html's two --bg-navy reads are the DESK, and its own rule says so:
 * "SHEET = the DESK: navy field that holds the notebook". That is why the lit navy can land in the
 * skin arc and leave the cream paper alone. The allowance is computed by resolving each token to
 * its root paint and permitting exactly those that resolve to the FIELD paint — so it follows a
 * rename or a re-point by itself. AN EXEMPTION IS A HAND-MAINTAINED LIST WEARING A NUMBER. */
const CRAFT_SEL = /paper|rail|punch|desk|sheet|folder|binder|spine|fibre|fiber|texture|shadow|grain/i;
const rootPaintOf = (t) => {
  const seen = new Set();
  let cur = t;
  for (;;) {
    if (seen.has(cur)) return cur;
    seen.add(cur);
    const v = valueOf(cur);
    const m = v && v.match(/^var\(\s*(--[A-Za-z0-9_-]+)/);
    if (!m || !valueOf(m[1])) return cur;
    cur = m[1];
  }
};
const FIELD_PAINT = rootPaintOf('--bg');
const craftFindings = [];
let craftRules = 0;
for (const f of [...PAGES].sort()) {
  const s = fs.readFileSync(f, 'utf8');
  /* ⛔⛔ COMMENTS ARE STRIPPED BEFORE RULE-SPLITTING, AND THIS IS A REPAIR, NOT A TIDY-UP.
   * The splitter below is `/[^{}]+\{[^{}]*\}/g`, so "the selector" is EVERYTHING SINCE THE LAST `}`
   * — including any comment block sitting above the rule. MEASURED 2026-08-20: two `.drafting-panel`
   * rules produced selector blobs of 1,299 and 1,208 characters, and CRAFT_SEL matched the words
   * "Sheet" and "paper" INSIDE THE PROSE. Neither selector is a craft surface; neither rule was a
   * violation. L5 went RED on an explanatory comment.
   * ⛔ AND THE FALSE-RED IS THE HARMLESS DIRECTION. THE OTHER ONE IS NOT: a comment containing a
   *    BRACE splits the stream at the wrong place, so a GENUINE craft rule can be mis-associated or
   *    skipped entirely — L5 would go green while the brass was being tokenised, which is the exact
   *    regression this leg exists to prevent.
   * 🔑 A DETECTOR THAT READS PROSE AS CODE IS WRONG IN BOTH DIRECTIONS; ONLY ONE OF THEM ANNOUNCES
   *    ITSELF. (Same class as the single-line grep that missed a multi-line rule at §81.13.) */
  const styles = (s.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const r of styles.match(/[^{}]+\{[^{}]*\}/g) || []) {
    const i = r.indexOf('{');
    const sel = r.slice(0, i);
    if (!CRAFT_SEL.test(sel)) continue;
    craftRules++;
    /* --craftpaint: a craft rule starts reading the palette — the "tidy the literals into
       tokens" regression, injected into the exact text the detector scans. */
    const injected = (CRAFTPAINT && craftRules === 1) ? ' color: var(--gold);' : '';
    for (const m of (r.slice(i + 1, -1) + injected).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      const t = m[1];
      if (!SHARED.has(t)) continue;              // a craft-private token — not our business
      if (/font/.test(t)) continue;              // type is shared on purpose; it is not pigment
      if (rootPaintOf(t) === FIELD_PAINT) continue;   // the desk: a craft surface may sit on the field
      craftFindings.push(`${f}: ${sel.trim().replace(/\s+/g, ' ').slice(0, 44)} -> ${t}`);
    }
  }
}
leg('L5a', craftRules > 0, `craft rules exist to judge — found ${craftRules}`);
leg('L5', craftFindings.length === 0,
  `no craft surface reads a palette token (field excepted, derived) — got ${craftFindings.length}${craftFindings.length ? ': ' + craftFindings.slice(0, 3).join(' | ') : ''} [BITE craftpaint]`);

// ── L3 · POISON THE CANONICAL TOKEN, COUNT WHO FOLLOWS ───────────────────────────────────────
const POISON = '#FF00FF';   // POISON_TOKEN is declared above, where CANON is derived from it
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 8241;
let served = 0;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const rel = p.replace(/^[\\/]+/, '');
  const fp = path.resolve(path.join(ROOT, rel));       // path.join yields backslashes on Windows;
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404).end('nf'); return; }
  served++;
  let body;
  if (rel === CANON) {
    const src = fs.readFileSync(fp, 'utf8');
    body = Buffer.from(src.replace(new RegExp(`(${POISON_TOKEN}\\s*:\\s*)[^;]+;`), `$1${POISON};`), 'utf8');
  } else if (PAGES.has(rel)) {
    body = Buffer.from(pageSource(rel), 'utf8');
  } else {
    body = fs.readFileSync(fp);
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:')) return route.continue();
    return route.abort();               // no font CDN can stall or colour this measurement
  });
  const page = await ctx.newPage();

  const linkers = [...LIVE].sort().filter((f) => new RegExp(`<link[^>]+href="/${CANON}`).test(pageSource(f)));
  const followed = [], stuck = [], redirected = [];
  for (const f of linkers) {
    await page.goto(`http://127.0.0.1:${PORT}/${encodeURIComponent(f)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    /* ⛔ "EMPTY BECAUSE EMPTY" AND "EMPTY BECAUSE THE DOCUMENT IS GONE" ARE DIFFERENT ANSWERS AND
     * MUST NOT SHARE A BRANCH. vault.html is a REDIRECT SHIM — a parse-time
     * window.location.replace() bounces it to hosted sign-in before the rest of the document is
     * parsed, so the DOM under measurement is not this page at all and its --gold reads empty.
     * Scoring that as "did not follow" would be a lie about a page with no rendering surface.
     * ⭐ DERIVED, NEVER EXEMPTED: the test is whether the CANON link is present in the LIVE DOM.
     *    Source says it links; the live document says otherwise; therefore the document was
     *    replaced. AN EXEMPTION IS A HAND-MAINTAINED LIST WEARING A NUMBER — this is a
     *    measurement, so a page that stops redirecting rejoins the population by itself. */
    const probe = await page.evaluate((t) => ({
      linkInDom: !!document.querySelector('link[rel="stylesheet"][href*="/styles/"]'),
      value: (getComputedStyle(document.documentElement).getPropertyValue(t) || '').trim(),
    }), MEASURE_TOKEN);
    if (!probe.linkInDom) { redirected.push(f); continue; }
    (probe.value.toLowerCase() === POISON.toLowerCase() ? followed : stuck).push(`${f}=${probe.value || '(empty)'}`);
  }
  await browser.close(); server.close();

  /* ⛔ THE BLINDNESS ASSERTION. A probe that resolves every token to '' agrees with itself
   * perfectly — measured the hard way when a path.join()/startsWith() mismatch 404'd every page
   * and a before/after diff reported "0 differences" across 264 cells.
   *   AN INSTRUMENT THAT MEASURES NOTHING AGREES WITH ITSELF PERFECTLY. */
  leg('L3a', linkers.length > 0 && served > linkers.length,
    `the rig actually served pages — ${linkers.length} linkers, ${served} requests`);
  /* The denominator EXCLUDES documents that replaced themselves, and NAMES them — a page counted
   * in neither column must still be visible, exactly as QUARANTINED and CRASH are in the suite. */
  const measurable = linkers.length - redirected.length;
  leg('L3', stuck.length === 0,
    `poisoning ${POISON_TOKEN} in ${CANON} moves EVERY live page (measured at ${MEASURE_TOKEN}) — ${followed.length}/${measurable} followed`
    + (redirected.length ? `; ${redirected.length} not measurable (document replaced at parse time): ${redirected.join(', ')}` : '')
    + (stuck.length ? ', STUCK: ' + stuck.slice(0, 4).join(', ') : '') + ' [BITE reshadow]');

  const mode = TWOSOURCE ? 'RED-FIRST (--twosource: a second token source — L1 MUST be RED)'
             : RESHADOW ? 'RED-FIRST (--reshadow: a live page regains a shadow — L2+L3 MUST be RED)'
             : STRIP ? 'RED-FIRST (--strip: an export loses a declaration — L4 MUST be RED)'
             : CRAFTPAINT ? 'RED-FIRST (--craftpaint: a craft rule reads the palette — L5 MUST be RED)'
             : 'NORMAL';
  console.log(lines.join('\n'));
  console.log('-------------------------------------');
  console.log(`live pages: ${LIVE.size}   canonical: ${CANON}   shared tokens: ${SHARED.size}   export surfaces: ${exportSurfaces}`);
  console.log('MODE: ' + mode + '   |   token authority');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');

  if (MUT && fail === 0) { console.log('!! MUTATION DID NOT BITE — this gate proves nothing'); process.exit(2); }
  // A COUNT IS NOT A LIST: each control names the leg it must move, and the legs it must NOT.
  if (TWOSOURCE && !(legs.L1 === false && legs.L4 === true)) {
    console.log(`!! --twosource must red L1 ALONE — got L1=${legs.L1} L4=${legs.L4}`); process.exit(2);
  }
  if (RESHADOW && !(legs.L2 === false && legs.L3 === false && legs.L4 === true)) {
    console.log(`!! --reshadow must red L2+L3 and leave L4 GREEN — got L2=${legs.L2} L3=${legs.L3} L4=${legs.L4}`); process.exit(2);
  }
  if (STRIP && !(legs.L4 === false && legs.L2 === true && legs.L3 === true)) {
    console.log(`!! --strip must red L4 ALONE — the export is a surface the page legs never visit — got L2=${legs.L2} L3=${legs.L3} L4=${legs.L4}`);
    process.exit(2);
  }
  if (CRAFTPAINT && !(legs.L5 === false && legs.L2 === true && legs.L3 === true && legs.L4 === true)) {
    console.log(`!! --craftpaint must red L5 ALONE — the craft register is a surface the palette legs never judge — got L2=${legs.L2} L3=${legs.L3} L4=${legs.L4} L5=${legs.L5}`);
    process.exit(2);
  }
  if (!MUT && fail > 0) process.exit(1);
})().catch((e) => { console.error(e); try { server.close(); } catch (_) {} process.exit(1); });
