'use strict';
/* THE ARCHIVE'S CARDS AND BUTTONS ARE LEGIBLE AND HITTABLE — RED-FIRST.
 *
 * The Captain's complaint, in his words: he has to get close to the monitor and squint, especially
 * at the per-card buttons. This gate encodes the MEASUREMENTS behind that complaint so it cannot
 * come back as a styling tidy-up.
 *
 * WHAT WAS MEASURED BEFORE THE CHANGE (2026-08-01, filled card, 1920x1080):
 *   card                217 x 306
 *   Rename / Open / Erase   29x9, 32x11, 25x9 px, font 7.4px, border 0, background transparent
 * Nine pixels tall. The "Modeled" status pill beside them is the SAME type size and is perfectly
 * findable — because it has a border, an interior fill and padding. That is the whole difference,
 * and it is what these buttons now borrow.
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (declared, per house rule) ──────────────────
 * A signed-in visitor looking at FOUR FILLED CARDS. The empty slot is explicitly NOT the state
 * designed against: an empty slot measured 246px where a filled one measured 306px, so sizing
 * against the empty state would have designed for a card no returning user sees. The cards are
 * rendered through the page's OWN renderBlueprintSlot template, not hand-built markup, so the
 * geometry measured is the geometry shipped.
 *
 * ⚠️ THIS GATE ASSERTS FLOORS, NOT EXACT PIXELS. A gate pinned to 226x378 would go red on any
 * future type tweak and would be deleted the first time it cried wolf. The floors are the promise:
 * bigger than it was, a real target, and never invisible again.
 *
 * Usage: node scripts/_gate_archive_card_legibility.js [--flat] [--tiny]
 *   --flat  RED-FIRST: strips the buttons' border and interior fill, leaving the size alone.
 *           Only the CHROME assertions bite — which is the point: the Captain's complaint was
 *           about visibility, and size alone does not answer it.
 *   --tiny  RED-FIRST, the other axis: restores the old 7.4px / zero-padding metrics. Only the
 *           SIZE assertions bite. Two mutations, two disjoint sets, one per half of the ask.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PORT = 8299; const BASE = 'http://127.0.0.1:' + PORT;
const FLAT = process.argv.includes('--flat');
const TINY = process.argv.includes('--tiny');

/* Floors, derived from the measured "before" and from ordinary target-size sense. */
const MIN_BTN_H = 18;      // was 9-11px. 18 is still modest; it is a FLOOR, not the design.
const MIN_BTN_W = 40;      // was 25-32px.
const MIN_BTN_FONT = 8.5;  // was 7.4px.
const MIN_CARD_H = 340;    // was 306.
const MIN_CARD_W = 222;    // was 217. Width is constrained by the binder; this is the honest gain.

/* ⚠️ `.card-actions > button {` appears TWICE (a layout rule and a chrome rule) and the mutation
   refused to run rather than guess which — anchor on the :hover line, which is unique, and append
   the flattening override after it so it wins on !important without touching size. */
const A_CHROME = '.card-actions > button:hover { transform: translateY(-1px); }';
const M_CHROME = '.card-actions > button:hover { transform: translateY(-1px); }\n'
  + '.card-actions > button { border:0 !important; background:none !important; background-color:rgba(0,0,0,0) !important; box-shadow:none !important; }';
const A_SIZE = '  padding: 5px 8px;\n  border-radius: 999px;\n  font-family: var(--font-mono);\n  font-size: 9px;';
const M_SIZE = '  padding: 0;\n  border-radius: 999px;\n  font-family: var(--font-mono);\n  font-size: 7.4px;';
let htmlDiffers = false;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Blueprint.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((FLAT || TINY) && /Blueprint\.html$/.test(p)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (FLAT) apply(A_CHROME, M_CHROME, 'A_CHROME');
    if (TINY) apply(A_SIZE, M_SIZE, 'A_SIZE');
    htmlDiffers = htmlDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const DATA = { status: 'Modeled', name: 'The Long Runway', netWorth: 2450000, netEstate: 1875000,
  annualDatum: 128000, rooms: 7, climate: 'Steady', dateStamped: 'Saved 01 Aug 2026' };

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
  await page.goto(BASE + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  await page.evaluate(() => { document.body.style.visibility = 'visible'; });

  const r = await page.evaluate((d) => {
    if (typeof renderBlueprintSlot !== 'function') return { err: 'renderBlueprintSlot is not reachable' };
    for (let i = 1; i <= 4; i++) {
      const slot = document.getElementById('blueprint-slot-' + i);
      const cell = document.getElementById('blueprint-content-' + i);
      if (!cell) continue;
      slot.classList.add('has-blueprint');
      cell.innerHTML = renderBlueprintSlot('A-0' + i, 'bp-' + i, d);
    }
    const slot = document.getElementById('blueprint-slot-1');
    const cb = slot.getBoundingClientRect();
    const read = (sel) => {
      const el = slot.querySelector(sel);
      if (!el) return { missing: true, sel };
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const borderPx = Math.max(parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderLeftWidth) || 0);
      const bg = cs.backgroundColor;
      const bgAlpha = (bg.match(/rgba?\(([^)]+)\)/) || [null, '0,0,0,0'])[1].split(',').map((x) => parseFloat(x))[3];
      return {
        sel, w: b.width, h: b.height, font: parseFloat(cs.fontSize),
        border: borderPx,
        /* "interior fill colour" was the Captain's phrase: a colour, not a gradient sheen. Read the
           background COLOUR's alpha specifically, so a transparent colour under a decorative
           gradient cannot pass as a fill. */
        fillAlpha: bg === 'rgba(0, 0, 0, 0)' ? 0 : (isNaN(bgAlpha) ? 1 : bgAlpha),
        label: (el.textContent || '').trim()
      };
    };
    const pill = read('.status-pill');
    const btns = ['.rename-action', '.open-blueprint-action', '.erase-action'].map(read);
    const sc = slot.querySelector('.slot-content');
    const anyOverflow = Array.from(document.querySelectorAll('.blueprint-slot')).some((s) => {
      const c = s.querySelector('.slot-content');
      return c && c.scrollHeight > s.clientHeight + 1;
    });
    /* Do the three buttons sit on ONE row, or has one wrapped under the others? */
    const tops = btns.map((x) => slot.querySelector(x.sel).getBoundingClientRect().top);
    const sameRow = Math.max(...tops) - Math.min(...tops) < 3;
    const sheet = document.querySelector('.archive-sheet');
    return {
      card: { w: cb.width, h: cb.height }, pill, btns, sameRow,
      anyOverflow, scScroll: sc.scrollHeight, slotClient: slot.clientHeight,
      sheetClip: sheet.scrollHeight - sheet.clientHeight,
      pageContent: document.documentElement.scrollHeight, viewH: window.innerHeight
    };
  }, DATA);

  if (r.err) { console.error('RIG: ' + r.err); process.exit(2); }

  /* ── POSITIVE CONTROLS ───────────────────────────────────────────────────────────────────── */
  ok(!r.btns.some((b) => b.missing) && !r.pill.missing,
    `AC 0 POSITIVE CONTROL: all three buttons and the reference pill were rendered and located${r.btns.filter((b) => b.missing).map((b) => ' MISSING ' + b.sel).join('')}`);
  ok(r.btns.every((b) => /^(Rename|Open|Erase)$/.test(b.label)),
    `AC 0b POSITIVE CONTROL: the buttons carry their real labels (${r.btns.map((b) => b.label).join(' / ')}) — measuring an empty button would satisfy nothing`);

  /* ── SIZE: bigger than the thing he complained about. ────────────────────────────────────── */
  ok(r.card.h >= MIN_CARD_H && r.card.w >= MIN_CARD_W,
    `AC 1 LOAD-BEARING: the filled card is at least ${MIN_CARD_W}x${MIN_CARD_H} — got ${Math.round(r.card.w)}x${Math.round(r.card.h)} (was 217x306)`);
  for (const b of r.btns) {
    ok(b.h >= MIN_BTN_H && b.w >= MIN_BTN_W && b.font >= MIN_BTN_FONT,
      `AC 2 LOAD-BEARING [${b.label}]: a real target — ${Math.round(b.w)}x${Math.round(b.h)} at ${b.font}px (floor ${MIN_BTN_W}x${MIN_BTN_H} at ${MIN_BTN_FONT}px; was ~29x9 at 7.4px)`);
  }

  /* ── CHROME: the half that size alone does not answer. ───────────────────────────────────── */
  for (const b of r.btns) {
    ok(b.border > 0 && b.fillAlpha > 0.02,
      `AC 3 LOAD-BEARING [${b.label}]: has BOTH a border and an interior fill (border ${b.border}px, fill alpha ${b.fillAlpha}) — the pill is legible at the same type size purely because it has these`);
  }
  ok(r.pill.border > 0 && r.pill.fillAlpha > 0.02,
    `AC 3b RIG: the reference pill itself still has border + fill (${r.pill.border}px / ${r.pill.fillAlpha}) — if it did not, AC 3's premise would be wrong`);

  /* ── IT STILL FITS. Growing a card that then clips its own contents is not an improvement. ─ */
  ok(r.anyOverflow === false,
    `AC 4 LOAD-BEARING: no card's content overflows its own card (tallest content ${r.scScroll}px in ${r.slotClient}px)`);
  ok(r.sameRow === true,
    'AC 5 LOAD-BEARING: the three buttons stay on ONE row — a wrapped third button was a shipped defect on this page once already');
  ok(r.sheetClip === 0,
    `AC 6: the binder is not clipping its own contents (${r.sheetClip}px overflow)`);
  ok(r.pageContent <= r.viewH,
    `AC 7: at 1920x1080 the page still fits without a scrollbar (${r.pageContent}px content / ${r.viewH}px window) — it fit exactly before the change and must not be pushed over by it`);

  await ctx.close();
  await browser.close();
  await new Promise((r2) => server.close(r2));

  const MUTATED = FLAT || TINY;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${htmlDiffers ? 'YES' : 'NO'}   (Blueprint.html bytes changed: ${htmlDiffers})`);
    if (!htmlDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  console.log(`\n${FLAT ? 'MUTATED[flat]' : TINY ? 'MUTATED[tiny]' : 'CLEAN'}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('GATE CRASH', e); try { server.close(); } catch (_) {} process.exit(2); });
