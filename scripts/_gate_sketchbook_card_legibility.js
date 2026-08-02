'use strict';
/* THE SKETCHBOOK'S CARDS, BUTTONS AND PENCIL — RED-FIRST.
 *
 * Sister to _gate_archive_card_legibility. The floors are DUPLICATED there and here on purpose:
 * the Captain's standing instruction is that these two rooms should look distinctly different —
 * rough sketchbook, polished archive — so a shared constant would quietly couple two things he
 * wants free to diverge. Duplicated and labelled beats coupled and invisible. If a floor changes,
 * it changes in both files or deliberately in one.
 *
 * MEASURED BEFORE THE CHANGE (filled tile, 1920x1080, via the page's own renderSavedSlot):
 *   tile   228 x 294
 *   Rename / Open Sketch / Open Studio / Erase Slot  26x8, 52x8, 52x8, 47x8  at 7px
 * EIGHT pixels tall — smaller than the Archive's were. Meanwhile the "Modeled" pill next to them
 * is legible at 7.5px, purely because it has a border, an interior fill and padding.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ──────────────────
 * A signed-in visitor with FOUR SAVED SKETCHES. Not the empty book: an empty tile and a filled
 * one are different heights, and the empty one is the state a returning user never sees. Tiles are
 * filled through SketchbookDatabase + syncDesktopSketchbookUI — the page's own render path — so
 * the geometry measured is the geometry shipped.
 *
 * ⚠️ FLOORS, NOT EXACT PIXELS. A gate pinned to 228x390 goes red on the next type tweak and gets
 * deleted the first time it cries wolf.
 *
 * ⚠️ THE PENCIL CHECK EXISTS BECAUSE THE PENCIL WAS NEVER VISIBLE. It is drawn at bottom:-12px to
 * rest across the bottom edge of the book, but it lived inside .sketchbook-sheet, which is
 * overflow:hidden — 64px of sheet overflow, all of it the pencil, at every window size. It has now
 * been moved one level out. "Not clipped" is asserted against every overflow:hidden ancestor, and
 * separately it must sit within the page's SCROLLABLE bounds — unclipped but off the end of the
 * document is still invisible, and that intermediate state was measured during this change.
 *
 * ⚠️ THIS PAGE SCROLLS ON document.body, NOT ON THE WINDOW. window.scrollTo does nothing here and
 * documentElement.scrollHeight equals its clientHeight, which made an earlier probe of mine report
 * "this page cannot scroll" — wrong, and it nearly became a finding. Reach is tested by driving
 * body.scrollTop.
 *
 * Usage: node scripts/_gate_sketchbook_card_legibility.js [--flat] [--tiny] [--clip]
 *   --flat  strips border + interior fill, leaves size  -> only the CHROME checks bite
 *   --tiny  restores 7px / zero padding                 -> only the SIZE checks bite
 *   --clip  puts the pencil back inside the sheet       -> only the PENCIL check bites
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8300; const BASE = 'http://127.0.0.1:' + PORT;
const FLAT = process.argv.includes('--flat');
const TINY = process.argv.includes('--tiny');
const CLIP = process.argv.includes('--clip');

const MIN_BTN_H = 18, MIN_BTN_W = 40, MIN_BTN_FONT = 8.5;
const MIN_TILE_H = 340, MIN_TILE_W = 222;

const A_CHROME = '.slot-open-action:hover,\n.slot-studio-action:hover,\n.slot-rename-action:hover,\n.slot-erase-action:hover { transform: translateY(-1px); }';
const M_CHROME = A_CHROME + '\n.slot-open-action,.slot-studio-action,.slot-rename-action,.slot-erase-action{border:0 !important;background:none !important;background-color:rgba(0,0,0,0) !important;box-shadow:none !important;}';
const A_SIZE = '  padding: 5px 6px;\n  border-radius: 999px;\n  font-family: var(--font-mono, monospace);\n  font-size: 9px;';
const M_SIZE = '  padding: 0;\n  border-radius: 999px;\n  font-family: var(--font-mono, monospace);\n  font-size: 7px;';
const A_PEN_OUT = '      <div class="charcoal-pencil-instrument" aria-hidden="true"></div>\n      </div>';
const M_PEN_OUT = '      </div>';
const A_PEN_IN = '        <footer class="sheet-footnote-disclaimer">';
const M_PEN_IN = '        <div class="charcoal-pencil-instrument" aria-hidden="true"></div>\n        <footer class="sheet-footnote-disclaimer">';
let htmlDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketchbook.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((FLAT || TINY || CLIP) && /sketchbook\.html$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (FLAT) apply(A_CHROME, M_CHROME, 'A_CHROME');
    if (TINY) apply(A_SIZE, M_SIZE, 'A_SIZE');
    if (CLIP) { apply(A_PEN_OUT, M_PEN_OUT, 'A_PEN_OUT'); apply(A_PEN_IN, M_PEN_IN, 'A_PEN_IN'); }
    htmlDiffers = htmlDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const D = { sketchId: 'sk-1', displayName: 'Coastal Drift', status: 'Modeled', stateName: 'Balanced',
  stateColor: '#1d9e75', s1StateName: 'Balanced', s1StateColor: '#1d9e75', age: 42, retire: 65,
  plan_end: 92, port: 1250000, contrib: 32000, datum: 118000, s1Datum: 118000, ceil: 160000,
  floor: 82000, dateStamped: '01 Aug 2026' };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    if (u.indexOf('/api/') >= 0) return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    return r.abort();
  });
  await page.addInitScript(`(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay','1'); sessionStorage.setItem('datum_auth_hint','1'); localStorage.setItem('datum-discover-v1','done'); } catch(e){}
    window.Clerk = { load:function(){return Promise.resolve();}, session:{getToken:function(){return Promise.resolve('tok');}},
      user:{ id:'u', firstName:'Daniel', primaryEmailAddress:{emailAddress:'q@q.co'}, unsafeMetadata:{}, update:function(){return Promise.resolve();} } };
  })();`);
  await page.goto(BASE + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => { document.body.style.visibility = 'visible'; });

  const r = await page.evaluate((d) => {
    if (typeof SketchbookDatabase === 'undefined' || typeof syncDesktopSketchbookUI !== 'function') {
      return { err: 'SketchbookDatabase / syncDesktopSketchbookUI not reachable' };
    }
    for (let i = 1; i <= 4; i++) SketchbookDatabase['slot' + i] = Object.assign({}, d, { sketchId: 'sk-' + i });
    syncDesktopSketchbookUI();
    const tile = document.getElementById('tile-slot-1');
    const tb = tile.getBoundingClientRect();
    const read = (sel) => {
      const el = tile.querySelector(sel);
      if (!el) return { sel, missing: true };
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      const a = (bg.match(/rgba?\(([^)]+)\)/) || [null, '0,0,0,0'])[1].split(',').map(parseFloat)[3];
      return { sel, w: b.width, h: b.height, top: b.top, font: parseFloat(cs.fontSize),
        border: parseFloat(cs.borderTopWidth) || 0,
        fillAlpha: bg === 'rgba(0, 0, 0, 0)' ? 0 : (isNaN(a) ? 1 : a),
        label: (el.textContent || '').trim() };
    };
    const btns = ['.slot-open-action', '.slot-studio-action', '.slot-rename-action', '.slot-erase-action'].map(read);
    const pill = read('.slot-status-pill');
    const rows = {}; btns.forEach((b) => { if (!b.missing) rows[Math.round(b.top)] = 1; });
    const sheet = document.querySelector('.sketchbook-sheet');
    const overflow = Array.from(document.querySelectorAll('.page-slot-tile')).some((t) => {
      const c = t.querySelector('.tile-content-view');
      return c && c.scrollHeight > t.clientHeight + 1;
    });

    /* THE PENCIL. Two separate things must be true: no overflow:hidden ancestor cuts it, AND it
       lies inside the page's reachable area. During this change it was briefly the first without
       the second — unclipped, but past the end of the document, which looks identical to a user. */
    const pencil = document.querySelector('.charcoal-pencil-instrument');
    let pen = null;
    if (pencil) {
      document.body.scrollTop = 99999;   // this page scrolls on BODY, not the window
      const pb = pencil.getBoundingClientRect();
      let cut = 0, n = pencil.parentElement;
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
          const nb = n.getBoundingClientRect();
          cut = Math.max(cut, Math.round(pb.bottom - (nb.top + n.clientHeight)));
        }
        n = n.parentElement;
      }
      pen = { w: Math.round(pb.width), h: Math.round(pb.height), top: Math.round(pb.top), bottom: Math.round(pb.bottom),
        clippedBy: Math.max(0, cut), inView: pb.top >= 0 && pb.bottom <= window.innerHeight + 1,
        scrolled: document.body.scrollTop };
    }
    return { tile: { w: tb.width, h: tb.height }, btns, pill, rowCount: Object.keys(rows).length,
      sheetClip: sheet.scrollHeight - sheet.clientHeight, overflow, pen };
  }, D);

  if (r.err) { console.error('RIG: ' + r.err); process.exit(2); }

  ok(!r.btns.some((b) => b.missing) && !r.pill.missing,
    'SK 0 POSITIVE CONTROL: all four buttons and the reference pill rendered and were located');
  ok(r.btns.every((b) => /^(Open Sketch|Open Studio|Rename|Erase Slot)$/.test(b.label)),
    `SK 0b POSITIVE CONTROL: real labels present (${r.btns.map((b) => b.label).join(' / ')}) — and NOT shortened to make them fit; the labels are the Architect's`);

  ok(r.tile.h >= MIN_TILE_H && r.tile.w >= MIN_TILE_W,
    `SK 1 LOAD-BEARING: the filled tile is at least ${MIN_TILE_W}x${MIN_TILE_H} — got ${Math.round(r.tile.w)}x${Math.round(r.tile.h)} (was 228x294)`);
  for (const b of r.btns) {
    ok(b.h >= MIN_BTN_H && b.w >= MIN_BTN_W && b.font >= MIN_BTN_FONT,
      `SK 2 LOAD-BEARING [${b.label}]: a real target — ${Math.round(b.w)}x${Math.round(b.h)} at ${b.font}px (floor ${MIN_BTN_W}x${MIN_BTN_H}; was ~52x8 at 7px)`);
  }
  for (const b of r.btns) {
    ok(b.border > 0 && b.fillAlpha > 0.02,
      `SK 3 LOAD-BEARING [${b.label}]: has BOTH a border and an interior fill (${b.border}px / alpha ${b.fillAlpha})`);
  }
  ok(r.pill.border > 0 && r.pill.fillAlpha > 0.02,
    `SK 3b RIG: the reference pill still has border + fill (${r.pill.border}px / ${r.pill.fillAlpha}) — SK 3's premise`);

  ok(r.rowCount === 2,
    `SK 4 LOAD-BEARING: the four actions sit on exactly TWO rows (got ${r.rowCount}) — three legible buttons need ~265px and the card offers ~186px, so one row is arithmetically impossible and three rows wastes the height this change just bought`);
  ok(r.overflow === false, 'SK 5 LOAD-BEARING: no tile\'s content overflows its own tile');
  ok(r.sheetClip === 0,
    `SK 6 LOAD-BEARING: the book clips NOTHING (${r.sheetClip}px overflow) — it clipped 64px before this change, every pixel of it the pencil`);

  ok(!!r.pen && r.pen.h > 10 && r.pen.w > 100,
    `SK 7 POSITIVE CONTROL: the pencil element exists and has real size (${r.pen ? r.pen.w + 'x' + r.pen.h : 'absent'}) — an absent pencil would satisfy "not clipped" trivially`);
  ok(!!r.pen && r.pen.clippedBy === 0,
    `SK 8 LOAD-BEARING: no overflow:hidden ancestor cuts the pencil (cut by ${r.pen ? r.pen.clippedBy : '?'}px) — it was cut by 60px and had NEVER been seen`);
  ok(!!r.pen && r.pen.inView === true,
    `SK 9 LOAD-BEARING: and it lands inside the reachable page once scrolled to the bottom (y ${r.pen ? r.pen.top + '..' + r.pen.bottom : '?'} in ${1080}px, scrolled ${r.pen ? r.pen.scrolled : '?'}px) — unclipped but past the end of the document looks identical to still hidden, and that was a real intermediate state during this change`);

  await ctx.close();
  await browser.close();
  await new Promise((r2) => server.close(r2));

  const MUTATED = FLAT || TINY || CLIP;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${htmlDiffers ? 'YES' : 'NO'}   (sketchbook.html bytes changed: ${htmlDiffers})`);
    if (!htmlDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${FLAT ? 'MUTATED[flat]' : TINY ? 'MUTATED[tiny]' : CLIP ? 'MUTATED[clip]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
