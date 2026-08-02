'use strict';
/* THE ROOMS ARE CALLED WHAT THEY ARE CALLED, AND SIT WHERE THEY SIT — top bar and Home. RED-FIRST.
 *
 * "My Sketches" -> "The Sketchbook" and "My Blueprints" -> "The Archive". Before this gate the
 * top-bar labels were defended by NOTHING: _nav_chrome_render_parity checks that the Save button
 * sits beside its archive tab, but never reads the tab's words, so it stayed green straight
 * through the rename. A label with no assertion behind it gets reverted by the next person who
 * thinks they are tidying up.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ──────────────────
 * A SIGNED-IN user on the Studio, and the same signed-in user on Home. That is the only state in
 * which the account top bar exists at all — it is injected by nav.js after it sees the auth hint,
 * so a signed-out fixture would find no top bar and every label assertion would pass vacuously
 * against nothing. Hence the Clerk stub, copied from the pattern _gate_topbar_navdrain already
 * proved, rather than a second invention of the same fixture.
 *
 * A RENAME MUST NOT MOVE A DOOR. Every label assertion is paired with a routing assertion driven
 * by a real click, because relabelling two adjacent tabs is exactly the edit that swaps them, and
 * a swap reads perfectly well on screen. Under --oldlabels the labels go red and the ROUTES STAY
 * GREEN, which is the proof the two are measured independently.
 *
 * THE HOME TILE ORDER IS READ OFF THE SCREEN, NOT OUT OF THE FILE. Source order and seen order are
 * different claims: one `order:` or `grid-column:` rule makes the first a lie while the second stays
 * true, and it is the second the Captain smokes. So the tiles are sorted by their measured bounding
 * boxes (row by top edge, then left to right) — and checked at TWO widths, because the grid drops
 * from three columns to two at 1060px and a sequence that reads correctly across three can wrap
 * wrong across two.
 *
 * Usage: node scripts/_gate_room_labels.js [--oldlabels] [--swap] [--oldorder]
 *   --oldlabels  RED-FIRST: serves the retired wording back.
 *   --swap       RED-FIRST, the other axis: keeps both labels correct but sends The Sketchbook tab
 *                to the Archive and vice versa. Labels stay GREEN; only routing bites.
 *   --oldorder   RED-FIRST for the reorder: serves the six Home tiles in their previous sequence.
 *                Every LABEL and ROUTE assertion stays GREEN — only position bites.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8298; const BASE = 'http://127.0.0.1:' + PORT;
const OLDLABELS = process.argv.includes('--oldlabels');
const SWAP = process.argv.includes('--swap');
const OLDORDER = process.argv.includes('--oldorder');

const TILE_ORDER = ['profile', 'sketchbook', 'archive', 'sketch', 'studio', 'shape'];
const TILE_ORDER_OLD = ['sketch', 'studio', 'shape', 'sketchbook', 'archive', 'profile'];

/* Reorders the six Home tiles in served bytes. Shared by the product check and the mutation, so
   the mutation cannot quietly disagree with the thing it is mutating. */
function reorderTiles(src, want) {
  /* The leading \n? is LOAD-BEARING: the tiles are separated by a blank line, so without it the
     blocks are not contiguous and this refuses to run. It refused, loudly, the first time — which
     is the behaviour wanted. A mutation that cannot prove it applied must never report a result. */
  const re = /\n?( *)<article class="card ([a-z][^"]*)">[\s\S]*?<\/article>\n/g;
  const found = [];
  let m;
  while ((m = re.exec(src))) {
    const classes = m[2].split(/\s+/);
    if (classes.includes('reference-card')) break;
    found.push({ start: m.index, end: re.lastIndex, text: m[0], key: classes[0] });
    if (found.length === 6) break;
  }
  if (found.length !== 6) return { err: `expected 6 tiles, found ${found.length}` };
  for (let i = 1; i < found.length; i++) {
    if (found[i].start !== found[i - 1].end) return { err: 'tiles are not contiguous' };
  }
  const byKey = Object.fromEntries(found.map((b) => [b.key, b.text]));
  if (want.some((k) => !byKey[k])) return { err: 'tile set mismatch' };
  return { out: src.slice(0, found[0].start) + want.map((k) => byKey[k]).join('') + src.slice(found[5].end) };
}

const SKETCHBOOK = 'The Sketchbook';
const ARCHIVE = 'The Archive';
const RETIRED = ['My Sketches', 'My Blueprints'];

const A_LABELS = "makeTab('sketches',     'The Sketchbook',  active)";
const M_LABELS = "makeTab('sketches',     'My Sketches',  active)";
const A_LABELS2 = "makeTab('myblueprints', 'The Archive', active)";
const M_LABELS2 = "makeTab('myblueprints', 'My Blueprints', active)";
const A_ROUTE = "case 'sketches':     _leave('/sketchbook.html');  break;";
const M_ROUTE = "case 'sketches':     _leave('/Blueprint.html');  break;";
let jsDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/my-account.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((OLDLABELS || SWAP) && /account-topbar\.js$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (OLDLABELS) { apply(A_LABELS, M_LABELS, 'A_LABELS'); apply(A_LABELS2, M_LABELS2, 'A_LABELS2'); }
    if (SWAP) apply(A_ROUTE, M_ROUTE, 'A_ROUTE');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  if (OLDORDER && /my-account\.html$/.test(p)) {
    const src = body.toString('utf8');
    const r = reorderTiles(src, TILE_ORDER_OLD);
    if (r.err) { console.error('oldorder mutation could not apply: ' + r.err); process.exit(1); }
    jsDiffers = jsDiffers || (r.out !== src);
    body = Buffer.from(r.out, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The signed-in fixture, copied from the shape _gate_topbar_navdrain already proved rather than
   invented a second time. Without the auth hint + Clerk stub, nav.js never injects the top bar. */
async function boot(browser, page_) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.indexOf('/api/documents') >= 0) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(`(() => {
    try { sessionStorage.setItem('datum_auth_hint','1'); sessionStorage.setItem('datumfi_skip_entry_overlay','1'); } catch(e){}
    try { localStorage.setItem('datum-discover-v1','done'); } catch(e){}
    window.Clerk = { load: function(){ return Promise.resolve(); },
      session: { getToken: function(){ return Promise.resolve('tok'); } },
      user: { id:'u', firstName:'Primary', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{},
              update: function(o){ this.unsafeMetadata=(o&&o.unsafeMetadata)||this.unsafeMetadata; return Promise.resolve(); } } };
  })();`);
  await page.goto(BASE + page_, { waitUntil: 'commit' });
  await page.waitForSelector('[data-acct-tab]', { timeout: 30000 });
  await sleep(2500);
  return { ctx, page };
}

const readTab = (page, id) => page.evaluate((t) => {
  const b = document.querySelector('[data-acct-tab="' + t + '"]');
  return b ? (b.textContent || '').trim() : null;
}, id);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  const { ctx, page } = await boot(browser, '/studio.html');

  /* ── POSITIVE CONTROL. Every label claim below is worthless if the bar never rendered. ───── */
  const tabCount = await page.evaluate(() => document.querySelectorAll('[data-acct-tab]').length);
  ok(tabCount >= 5, `LBL 0 POSITIVE CONTROL: the signed-in top bar really rendered (${tabCount} tabs) — a signed-out fixture would find none and pass every absence check against nothing`);

  const sk = await readTab(page, 'sketches');
  const bp = await readTab(page, 'myblueprints');
  ok(sk === SKETCHBOOK, `LBL 1 LOAD-BEARING: the sketch archive tab reads "${SKETCHBOOK}" — got "${sk}"`);
  ok(bp === ARCHIVE, `LBL 2 LOAD-BEARING: the blueprint archive tab reads "${ARCHIVE}" — got "${bp}"`);

  const barText = await page.evaluate(() => {
    const h = document.getElementById('acct-topbar');
    return h ? (h.textContent || '') : '';
  });
  ok(RETIRED.every((r) => !barText.includes(r)),
    `LBL 3: neither retired label survives anywhere in the bar (${RETIRED.join(' / ')})`);

  /* ── THE DOORS STILL LEAD WHERE THEY SAY. Driven by real clicks through the page's own
        chokepoint, so a relabel that swapped two adjacent tabs cannot hide behind good copy. ─ */
  const routed = await page.evaluate(async () => {
    const seen = {};
    window._navDrain = function (url) { seen[window.__which] = url; };
    for (const t of ['sketches', 'myblueprints']) {
      window.__which = t;
      const b = document.querySelector('[data-acct-tab="' + t + '"]');
      if (b) b.click();
      await new Promise((r) => setTimeout(r, 150));
    }
    return seen;
  });
  ok(routed.sketches === '/sketchbook.html',
    `LBL 4 LOAD-BEARING: "${SKETCHBOOK}" still opens the sketchbook (went ${routed.sketches}) — renaming two neighbouring tabs is exactly the edit that swaps them, and a swap reads perfectly on screen`);
  ok(routed.myblueprints === '/Blueprint.html',
    `LBL 5 LOAD-BEARING: "${ARCHIVE}" still opens the archive (went ${routed.myblueprints})`);
  await ctx.close();

  /* ── THE HOME TILE. Same name, same destination. ─────────────────────────────────────────── */
  {
    const { ctx: c2, page: p2 } = await boot(browser, '/my-account.html');
    const tile = await p2.evaluate(() => {
      const a = document.querySelector('.card.archive');
      const s = document.querySelector('.card.sketchbook');
      if (!a || !s) return { found: false };
      return {
        found: true,
        archiveName: (a.querySelector('h3') || {}).textContent,
        archiveRoute: (a.querySelector('[data-route]') || {}).dataset.route,
        sketchbookName: (s.querySelector('h3') || {}).textContent,
        sketchbookRoute: (s.querySelector('[data-route]') || {}).dataset.route
      };
    });
    ok(tile.found === true, 'LBL 6 POSITIVE CONTROL: both Home tiles were located');
    ok(tile.archiveName === ARCHIVE && tile.archiveRoute === '/Blueprint.html',
      `LBL 7: the Home tile calls it "${ARCHIVE}" and still opens the archive (name="${tile.archiveName}", route=${tile.archiveRoute})`);
    ok(tile.sketchbookName === SKETCHBOOK && tile.sketchbookRoute === '/sketchbook.html',
      `LBL 8: the Home tile calls it "${SKETCHBOOK}" and still opens the sketchbook (name="${tile.sketchbookName}", route=${tile.sketchbookRoute})`);

    /* ── THE ORDER, MEASURED OFF THE SCREEN. ─────────────────────────────────────────────── */
    const seenOrder = (pg) => pg.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.cards > .card'));
      return cards.map((el) => {
        const r = el.getBoundingClientRect();
        return { key: (el.className.match(/card ([a-z-]+)/) || [])[1], top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) };
      })
      /* Row by top edge (tolerant of sub-pixel), then left to right within the row. */
        .sort((a, b) => (Math.abs(a.top - b.top) > 4 ? a.top - b.top : a.left - b.left))
        .map((c) => c.key);
    });

    const wide = await seenOrder(p2);
    ok(wide.length === 6, `LBL 9 POSITIVE CONTROL: six Home tiles were measured on screen (got ${wide.length}) — an order assertion over an empty list passes trivially`);
    ok(wide.join(' ') === TILE_ORDER.join(' '),
      `LBL 10 LOAD-BEARING [3-column]: the tiles READ, top-left to bottom-right, as ${TILE_ORDER.join(' -> ')} — got ${wide.join(' -> ')}`);

    await p2.setViewportSize({ width: 1000, height: 1100 });
    await sleep(400);
    const narrow = await seenOrder(p2);
    ok(narrow.join(' ') === TILE_ORDER.join(' '),
      `LBL 11 [2-column, below the 1060px breakpoint]: the same sequence survives the wrap — got ${narrow.join(' -> ')}`);

    /* The Studio tile was moved to the lower row. The Captain kept its gold treatment, and that
       treatment is class-based rather than positional — assert it actually came with it. */
    const gold = await p2.evaluate(() => {
      const s = document.querySelector('.card.studio');
      const plain = document.querySelector('.card.sketch');
      if (!s || !plain) return null;
      const a = getComputedStyle(s.querySelector('.cta')).backgroundImage;
      const b = getComputedStyle(plain.querySelector('.cta')).backgroundImage;
      return { primary: s.classList.contains('primary-card'), distinct: a !== b };
    });
    ok(gold && gold.primary === true && gold.distinct === true,
      `LBL 12: the Studio tile kept its gold treatment after moving rows (primary-card=${gold && gold.primary}, its button still renders differently from a plain tile=${gold && gold.distinct})`);
    await c2.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = OLDLABELS || SWAP || OLDORDER;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (served bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${OLDLABELS ? 'MUTATED[oldlabels]' : SWAP ? 'MUTATED[swap]' : OLDORDER ? 'MUTATED[oldorder]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
