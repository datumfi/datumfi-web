/* CRITICAL-BLOCK COLOR AUTHORITY GATE — "the ninth fork" (F5 + F6 as ONE instrument).
 *
 * NINE live pages carry an inline `<style id="datum-critical-colors">` at line 6 holding a SECOND,
 * hand-written `:root` block that duplicates eight palette tokens. It is a PRE-STYLESHEET FALLBACK:
 * it paints until `styles/tokens.css` arrives and redefines the same names, at which point the
 * later declaration wins by ordinary cascade order.
 *
 * ⛔⛔ SO IT IS A COPY OF THE PALETTE THAT NOTHING KEEPS IN SYNC, AND IT HAS ALREADY DRIFTED TWICE.
 *   1. `index.html` shipped `--gold-dark:#A88B3D` against a canonical `#B8952F` — WRONG ON THE
 *      HOMEPAGE FOR ITS WHOLE LIFE, on a token with real text consumers (`.scroll-step h3`,
 *      `.model-card h4`). Fixed by value in 79ba1d6. THIS GATE IS WHY IT CANNOT COME BACK.
 *   2. All nine still carry `--muted:rgba(255,255,255,0.4)`. That is DORMANT TODAY — the live
 *      tokens.css also says 0.4, so live and fallback AGREE — and it is ARMED BY THE C1 PUSH,
 *      which raises the canonical to 0.55. THIS GATE IS THE THING THAT MAKES THAT PUSH SAFE.
 * 🔑 A VALUE FIX WITHOUT ITS GATE IS A DEFECT REPAIRED, NOT A CLASS CLOSED. The eight pages that
 *    happen to be right today are right BY LUCK, NOT BY ENFORCEMENT.
 *
 * ⛔ WHY THE EXISTING TOKEN GATE CANNOT SEE THIS, BY CONSTRUCTION AND ON PURPOSE.
 * `_gate_token_authority.js:222` walks declarations and SKIPS anything declared before the
 * canonical link (`if (b.index < li) continue`) — it is asking "does the page follow the palette
 * once loaded", which is a different and also-correct question. THIS gate asks the question that
 * one structurally cannot: "is the FALLBACK still telling the truth?"
 *
 * ── THE FIVE LEGS ───────────────────────────────────────────────────────────────────────────────
 *  L1 ORDER — on every page the block appears BEFORE the tokens.css link. ⭐ THIS IS THE
 *     LOAD-BEARING ONE AND IT IS NOT OBVIOUS. If a page ever links tokens.css FIRST, the stale
 *     inline block stops being a fallback and becomes the WINNER — the drift goes live permanently
 *     and every other leg here would still pass. Order is what makes the whole block harmless.
 *  L2 NO ORPHANS — every custom property a block declares is one tokens.css actually defines. A
 *     name the palette does not own is a name nobody maintains.
 *  L3 VALUE PARITY — every declared value RESOLVES EQUAL to what tokens.css resolves for the same
 *     name. This is the leg that fails on the next `#A88B3D`.
 *  L4 POPULATION SHAPE — the set of pages carrying a block is enumerated and printed. A page that
 *     GAINS a block joins the assertion automatically; it can never be silently un-covered.
 *  L5 vault.html — NAMED, NEVER SILENTLY EXCLUDED. It carries NO block, and it is asserted BY
 *     SOURCE because it CANNOT be probed: it calls location.replace() at :33, during parse, three
 *     lines before its own stylesheet link. A browser leg against it would measure the page it
 *     redirects TO. ⛔ IF vault.html EVER GAINS A BLOCK THIS LEG REDS, and somebody has to decide
 *     deliberately how a page that redirects at parse time should be covered.
 *
 * ⛔⛔ THE ANTI-VACUITY PRECONDITION, AND IT IS THE POINT OF FAILURE NOBODY WOULD NOTICE.
 * L3 compares the block against `var(--name)` resolved ON THE SAME PAGE. If tokens.css failed to
 * load, `var(--name)` would resolve FROM THE BLOCK ITSELF and every comparison would pass —
 * A PERFECT GREEN MEANING "I COMPARED THE BLOCK TO ITSELF". So before any leg runs, each page must
 * resolve a sentinel that ONLY tokens.css defines (`--paint-brass-deep`). If it is empty the run
 * ABORTS at exit 2. A GATE THAT CANNOT RUN IS NOT A PASS.
 *
 * ⛔ CUSTOM PROPERTIES ARE *SUBSTITUTED*, NEVER *COMPUTED*. `getPropertyValue('--x')` hands back the
 * DECLARED TEXT — `color-mix(in srgb, #5DCAA5 18%, transparent)` — not a colour. Comparing those
 * strings would be comparing SPELLINGS, and §69 settled that a spelling difference means nothing
 * (`rgba(...)` vs `color(srgb ...)` are the same pixel). Every value here is pushed through a REAL
 * colour property and read back, so the comparison is on RESOLVED COLOUR. Learned the hard way on
 * 2026-08-19 when the C3 absolute proof asserted the spelling and failed against a correct product.
 *
 * ⛔ THE BLOCK IS PARSED BY THE CSSOM, NOT BY A REGEX. `sheet.cssRules` gives the declarations the
 * BROWSER actually built. ASK THE RUNNER FOR A POPULATION; NEVER GREP ONE — and when the question
 * is "what does this stylesheet declare", the runner is the CSSOM.
 *
 * POPULATION: `git ls-files -z` (⛔ -z — git escapes non-ASCII paths in its plain output and a
 * newline split silently DROPS them; see 083d56c, which dropped 5 of 39 tracked .html files).
 *
 * ── CONTROLS · EVERY ONE NAMES THE LEG IT REDS ──────────────────────────────────────────────────
 *   --poison-value    reds L3  (rewrites one block's --gold-dark in the SERVED bytes)
 *   --poison-orphan   reds L2  (adds a token tokens.css does not define)
 *   --poison-order    reds L1  (moves the tokens.css link ABOVE the block)
 *   --poison-vault    reds L5  (gives vault.html a block it does not have)
 *   --nopop           reds the PRECONDITION (empties the population; must ABORT, never pass)
 * 🔑 A RED-FIRST THAT REDS FOR A DIFFERENT REASON THAN THE LEG UNDER TEST PROVES NOTHING. Each
 *    poison above is checked for having LANDED (see armed{}), because A POISON THAT CANNOT LAND
 *    MAKES EVERY INSTRUMENT READ CORRECT.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8434;   /* claimed 2026-08-19. ⛔ NEVER 8001 — that is the suite's shared server and
                        66 browser gates depend on it. Highest gate port in use was 8385. */

const P_VALUE = process.argv.includes('--poison-value');
const P_ORPHAN = process.argv.includes('--poison-orphan');
const P_ORDER = process.argv.includes('--poison-order');
const P_VAULT = process.argv.includes('--poison-vault');
const NOPOP = process.argv.includes('--nopop');
const ANY_POISON = P_VALUE || P_ORPHAN || P_ORDER || P_VAULT;

const BLOCK_ID = 'datum-critical-colors';
const TOKENS_CSS = 'styles/tokens.css';
/* A token ONLY tokens.css defines. If this resolves empty on a page, tokens.css did not load and
   every value comparison below would be the block against itself. */
const SENTINEL = '--paint-brass-deep';

/* ── POPULATION ──────────────────────────────────────────────────────────────────────────────── */
let tracked;
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);
} catch (e) {
  console.error('POPULATION UNAVAILABLE — git ls-files failed. A gate that cannot build its population is not a pass.');
  process.exit(2);
}
const pages = tracked.filter((f) => /\.html$/i.test(f) && !f.startsWith('dist/'));
const withBlock = NOPOP ? [] : pages.filter((f) => {
  try { return fs.readFileSync(path.join(ROOT, f), 'utf8').includes('id="' + BLOCK_ID + '"'); }
  catch (e) { return false; }
});

if (!withBlock.length) {
  console.error('!! NO PAGE CARRIES A ' + BLOCK_ID + ' BLOCK.');
  console.error('   That is either a repo-wide change nobody told this gate about, or the population');
  console.error('   broke. EITHER WAY IT IS NOT A PASS — a gate with an empty population proves nothing.');
  console.log('SCORE 0/0 RED — empty population');
  process.exit(2);
}

/* ── POISON, APPLIED TO SERVED BYTES ONLY — NEVER TO THE WORKING TREE ────────────────────────── */
const armed = { value: 0, orphan: 0, order: 0, vault: 0 };
function transform(rel, src) {
  let out = src;
  if (P_VALUE && rel === withBlock[0]) {
    const m = out.match(/--gold-dark:\s*#[0-9A-Fa-f]{6}/);
    if (m) { out = out.replace(m[0], '--gold-dark:#DEAD00'); armed.value++; }
  }
  if (P_ORPHAN && rel === withBlock[0]) {
    const anchor = out.indexOf('--bg-navy:');
    if (anchor >= 0) { out = out.slice(0, anchor) + '--not-a-real-token:#123456;' + out.slice(anchor); armed.orphan++; }
  }
  if (P_ORDER && rel === withBlock[0]) {
    const link = out.match(/[ \t]*<link[^>]+styles\/tokens\.css[^>]*>\n?/);
    const blockAt = out.indexOf('<style id="' + BLOCK_ID + '"');
    if (link && blockAt >= 0 && out.indexOf(link[0]) > blockAt) {
      out = out.replace(link[0], '');
      out = out.slice(0, blockAt) + link[0].trim() + '\n' + out.slice(blockAt);
      armed.order++;
    }
  }
  /* ⛔ NO --poison-vault BRANCH HERE, DELIBERATELY. L5 reads vault.html from SOURCE, and this
     function only rewrites bytes that are actually REQUESTED — vault.html never is, because the run
     only visits pages that carry a block. The first version poisoned here, never landed, and the
     landing guard aborted the run rather than print a green. The poison now lives on the source
     read. 🔑 A POISON MUST BE APPLIED ON THE PATH THE LEG ACTUALLY READS, and A DEAD POISON BRANCH
     LEFT IN PLACE IS A CONTROL SOMEBODY WILL LATER TRUST. */
  return out;
}

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let body = fs.readFileSync(f);
  if (/\.(html|css)$/.test(p)) body = Buffer.from(transform(rel, body.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(body);
});

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  console.log('[RUN] CRITICAL-BLOCK COLOR AUTHORITY  (the ninth fork)');
  console.log('   population: ' + pages.length + ' tracked non-dist .html -> ' + withBlock.length + ' carry a ' + BLOCK_ID + ' block');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const orderBad = [], orphan = [], mismatch = [], unparsed = [];
  let probed = 0;

  for (const rel of withBlock) {
    const page = await ctx.newPage();
    await page.route('**/*', (r) => r.request().url().startsWith('http://127.0.0.1:') ? r.continue() : r.abort());
    await page.goto('http://127.0.0.1:' + PORT + '/' + rel, { waitUntil: 'load' });
    const res = await page.evaluate((args) => {
      const [blockId, sentinel, tokensHref] = args;
      const el = document.getElementById(blockId);
      const out = { found: !!el, sentinel: '', order: null, decls: [], canon: {}, canonNames: [] };
      const root = getComputedStyle(document.documentElement);
      out.sentinel = root.getPropertyValue(sentinel).trim();
      /* ⛔⛔ THE NAME SET COMES FROM tokens.css ITSELF, NOT FROM THE PAGE — AND ITS OWN CONTROL
       * PROVED WHY. L2 used to ask getComputedStyle(root) whether a name resolved. But THE BLOCK
       * UNDER TEST DECLARES THAT NAME, so the lookup answered out of the very block it was meant to
       * judge and L2 COULD NEVER FIRE. `--poison-orphan` landed 1x and the gate stayed GREEN.
       * 🔑 SAME SHAPE AS THE ANTI-VACUITY PRECONDITION, ONE LEG OVER: A CANONICAL SIDE SOURCED FROM
       *    THE THING IT IS CHECKING IS NOT A CANONICAL SIDE. Enumerate the authority directly. */
      const canonSheet = [...document.styleSheets].find((sh) => (sh.href || '').includes(tokensHref));
      const collect = (rules) => {
        for (const r of rules) {
          if (r.style && /:root/.test(r.selectorText || '')) { for (const n of r.style) if (n.startsWith('--')) out.canonNames.push(n); }
          if (r.cssRules) collect(r.cssRules);   /* @supports nests a :root inside */
        }
      };
      if (canonSheet) { try { collect(canonSheet.cssRules); } catch (e) { out.canonNames = null; } }
      else out.canonNames = null;
      /* ORDER: compare document positions of the block and the canonical <link>. */
      const link = [...document.querySelectorAll('link[rel=stylesheet]')].find((l) => (l.getAttribute('href') || '').includes(tokensHref));
      if (el && link) out.order = (el.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'block-first' : 'link-first';
      else if (el && !link) out.order = 'no-link';
      /* ⛔ RESOLVED, NEVER DECLARED: push each value through a real colour property. A custom
         property is SUBSTITUTED, not computed, so getPropertyValue returns prose. */
      const probe = document.createElement('div');
      probe.style.display = 'none';
      document.body.appendChild(probe);
      /* ⛔⛔ AND RESOLVING IS STILL NOT ENOUGH — NORMALISE, OR THIS GATE DEMANDS A *SPELLING* MATCH.
       * chromium serialises a legacy literal as `rgba(255, 255, 255, 0.55)` and the SAME COLOUR
       * arriving via color-mix() as `color(srgb 1 1 1 / 0.55)`. Comparing those strings fails on
       * identical pixels — which is EXACTLY the mistake §69 exists to prevent, reproduced inside the
       * instrument built to enforce it. Every value is parsed to numeric [r,g,b,a] and compared
       * there. THE PIXEL IS THE CLAIM; THE STRING IS NEVER THE CLAIM. */
      const norm = (s) => {
        let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i);
        if (m) return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), Math.round((m[4] === undefined ? 1 : +m[4]) * 1000) / 1000];
        m = s.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
        if (m) return [Math.round(+m[1] * 255), Math.round(+m[2] * 255), Math.round(+m[3] * 255), Math.round((m[4] === undefined ? 1 : +m[4]) * 1000) / 1000];
        return null;   /* unparseable -> reported, never silently treated as equal */
      };
      const resolve = (expr) => {
        probe.style.color = '';
        probe.style.color = expr;
        const raw = getComputedStyle(probe).color;
        return { raw, n: norm(raw) };
      };
      if (el && el.sheet) {
        for (const rule of el.sheet.cssRules) {
          if (!rule.style || !/:root/.test(rule.selectorText || '')) continue;
          for (const name of rule.style) {
            if (!name.startsWith('--')) continue;
            const declared = rule.style.getPropertyValue(name).trim();
            const fb = resolve(declared), cn = resolve('var(' + name + ')');
            out.decls.push({ name, declared, fbRaw: fb.raw, cnRaw: cn.raw, fb: fb.n, cn: cn.n });
            out.canon[name] = root.getPropertyValue(name).trim();   /* kept for reporting only */
          }
        }
      }
      probe.remove();
      return out;
    }, [BLOCK_ID, SENTINEL, TOKENS_CSS]);
    await page.close();

    /* ⛔ ANTI-VACUITY: without tokens.css the canonical side IS the block. Abort, never pass. */
    if (!res.sentinel) {
      console.error('!! ' + rel + ': ' + SENTINEL + ' resolved EMPTY — styles/tokens.css did not load.');
      console.error('   Every value comparison would then be the block against ITSELF and pass vacuously.');
      console.log('SCORE 0/0 RED — precondition failed (canonical stylesheet absent)');
      await browser.close(); server.close(); process.exit(2);
    }
    if (!res.canonNames || !res.canonNames.length) {
      console.error('!! ' + rel + ': could not enumerate styles/tokens.css declarations via the CSSOM.');
      console.error('   Without the canonical name set from tokens.css, L2 would compare the block to itself.');
      console.log('SCORE 0/0 RED — precondition failed (canonical name set unreadable)');
      await browser.close(); server.close(); process.exit(2);
    }
    probed++;
    if (res.order !== 'block-first') orderBad.push(rel + ' (' + res.order + ')');
    for (const d of res.decls) {
      if (!res.canonNames.includes(d.name)) { orphan.push(rel + ' ' + d.name); continue; }
      /* An UNPARSEABLE colour is reported, never quietly counted equal — a comparison that cannot
         be made is not a comparison that succeeded. */
      if (!d.fb || !d.cn) { unparsed.push(rel + ' ' + d.name + ': ' + d.fbRaw + ' / ' + d.cnRaw); continue; }
      if (d.fb.join(',') !== d.cn.join(',')) mismatch.push(rel + ' ' + d.name + ': block ' + d.fbRaw + ' vs canonical ' + d.cnRaw);
    }
  }

  /* L5 — vault.html BY SOURCE. It redirects during parse (:33) so it cannot be probed. */
  /* ⛔ L5 IS A *SOURCE* ASSERTION, SO ITS POISON MUST HIT THE SOURCE READ — NOT THE SERVED BYTES.
   * The first version poisoned the HTTP response, but vault.html is never REQUESTED (the run only
   * visits pages that carry a block), so the transform never ran and the control was INERT. The
   * landing guard caught it and aborted rather than printing a green. 🔑 A POISON MUST BE APPLIED
   * ON THE PATH THE LEG ACTUALLY READS. */
  let vaultSrc = fs.existsSync(path.join(ROOT, 'vault.html')) ? fs.readFileSync(path.join(ROOT, 'vault.html'), 'utf8') : null;
  if (P_VAULT && vaultSrc !== null) {
    vaultSrc = vaultSrc.replace('</head>', '<style id="' + BLOCK_ID + '">:root{--gold-dark:#A88B3D}</style></head>');
    if (vaultSrc.includes('id="' + BLOCK_ID + '"')) armed.vault++;
  }
  const vaultHasBlock = vaultSrc !== null && vaultSrc.includes('id="' + BLOCK_ID + '"');

  console.log('   pages probed: ' + probed + '  ·  declarations compared: ' + withBlock.length + ' blocks');
  console.log('');
  ok(orderBad.length === 0, 'L1 every block precedes the tokens.css link (a later link is what keeps it a FALLBACK)' + (orderBad.length ? ' — ' + orderBad.join(', ') : ''));
  ok(orphan.length === 0, 'L2 no block declares a token tokens.css does not define' + (orphan.length ? ' — ' + orphan.join(', ') : ''));
  ok(unparsed.length === 0, 'L2b every colour on both sides PARSED — an unparseable value is never counted equal' + (unparsed.length ? ' — ' + unparsed.join(' | ') : ''));
  ok(mismatch.length === 0, 'L3 every fallback value RESOLVES equal to canonical (compared as numeric rgba, NOT as a string)' + (mismatch.length ? ' — ' + mismatch.length + ' mismatch: ' + mismatch.slice(0, 4).join(' | ') : ''));
  ok(withBlock.length > 0, 'L4 the population is non-empty and enumerated — ' + withBlock.length + ' pages: ' + withBlock.join(', '));
  ok(!vaultHasBlock, 'L5 vault.html carries NO critical block (NAMED source-only exception — it redirects at parse time and cannot be probed)' + (vaultHasBlock ? ' — IT NOW HAS ONE; decide deliberately how to cover a page that redirects during parse' : ''));

  /* ⛔ A POISON THAT CANNOT LAND MAKES EVERY INSTRUMENT READ CORRECT. */
  if (ANY_POISON) {
    const want = [[P_VALUE, 'value', 'L3'], [P_ORPHAN, 'orphan', 'L2'], [P_ORDER, 'order', 'L1'], [P_VAULT, 'vault', 'L5']];
    for (const [on, key, leg] of want) {
      if (!on) continue;
      if (armed[key] === 0) {
        console.error('!! --poison-' + key + ' NEVER LANDED. The run below is meaningless — it would report a clean');
        console.error('   instrument over an unpoisoned tree. ABORT rather than print a green.');
        console.log('SCORE 0/0 RED — inert control');
        await browser.close(); server.close(); process.exit(2);
      }
      console.log('   [BITE] --poison-' + key + ' landed ' + armed[key] + 'x — it must red ' + leg + ' SPECIFICALLY');
    }
  }

  await browser.close();
  server.close();
  const overall = fail === 0 ? 'GREEN' : 'RED';
  console.log('');
  console.log('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  if (ANY_POISON && fail === 0) {
    console.error('!! RED-FIRST RAN AND EVERY LEG PASSED. The control did not bite. That is a broken gate.');
    process.exit(1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS FAILURE: ' + (e && e.stack || e)); try { server.close(); } catch (x) {} process.exit(2); });
