/* GATE — erasing ONE sketch must not take the others with it.

   THE DEFECT THIS PINS (proven 2026-07-27, user-reachable data loss): the save path and the erase
   path trust DIFFERENT stores. `_autoConsumeSketch` (the signed-out vault-hop carry — a real user
   route) writes the LS book, the per-slot key, the Clerk mirror and SketchbookDatabase, but NEVER
   registers the sketch in `_skFull`, which sketchbook.html itself calls the "UNLIMITED truth".
   `_purgeSketchSlot` then runs `_applySketchBook(_skFull)` as the AUTHORITATIVE rebuild — against an
   empty `_skFull` that produces an all-null book and four empty tiles.
   Measured: 3 saved -> erase 1 -> 0 left, lsBook [null,null,null,null].
   `sketchbook.html:3467` (an early return that exits _sketchbookRestoreFromClerk without assigning
   _skFull) is a SECOND door into the same mismatch — which is why the fix guards at the erase site.

   ⚠️ SEED VIA THE REACHABLE ROUTE ONLY. `saveCurrentSketchToFirstAvailableSlot()` also reproduces the
   wipe, but it has NO CALLERS since P6.1 removed the "Save Current Sketch" button, and it writes only
   SketchbookDatabase (never LS). Classifying on it would be classifying on dead code. Use
   _autoConsumeSketch.

   THE BOUNDARY THIS ALSO PINS: the hydration must NEVER resurrect. A genuinely-empty book must stay
   empty through an erase — reachable-empty is authoritative (L51). Asserted here as a first-class
   check, not an afterthought: a fix that resurrects erased work would be worse than the bug.

   Usage: node scripts/_gate_sketchbook_erase_survivors.js [LABEL] [--nohydrate]
     --nohydrate  RED-FIRST: strips the guarded hydration from the served sketchbook.html so the
                  survivors check must fail. Self-checking — a strip that matches nothing aborts. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'datumfi.localhost'; const PORT = 8168; const BASE = 'http://' + HOST + ':' + PORT;
const LABEL = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'RUN';
const NOHYDRATE = process.argv.includes('--nohydrate');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function mutate(src) {
  const before = src;
  // strip the guarded hydration block, leaving the pre-fix behaviour
  const out = src.replace(/if \(_skFull\.length === 0\)[\s\S]{0,700}?\n(\s*)\/\/ END _skFull hydration guard\n/, '$1');
  if (out === before) {
    console.error('❌ --nohydrate STRIP MATCHED NOTHING — the mutation anchor is dead. Re-ground it.');
    console.error('   Refusing to report a red-first that mutated nothing (2026-07-26 masking rule).');
    process.exit(1);
  }
  return out;
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/sketchbook.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (NOHYDRATE && /sketchbook\.html$/.test(p)) body = Buffer.from(mutate(body.toString('utf8')), 'utf8');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

const fails = [];
const check = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null ? ' (' + detail + ')' : ''));
  if (!cond) fails.push(name);
};

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.route('**/*', (r) => /clerk|cloudflareinsights|posthog|beacon/i.test(r.request().url()) ? r.abort() : r.continue());
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      user: {
        get unsafeMetadata() { try { return JSON.parse(sessionStorage.getItem('__mockclerk_meta') || '{}'); } catch (e) { return {}; } },
        update: function (o) { try { sessionStorage.setItem('__mockclerk_meta', JSON.stringify((o && o.unsafeMetadata) || {})); } catch (e) {} return Promise.resolve(); },
        firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' }
      }
    };
  });

  const readState = () => page.evaluate(() => {
    let b = null; try { b = JSON.parse(localStorage.getItem('datumfi_sketchbook_v1') || 'null'); } catch (e) {}
    const ids = (o) => o ? [1, 2, 3, 4].map((n) => { const s = o['slot_' + n]; return s ? (s.sketch_id || '?') : null; }) : null;
    return { openBtns: document.querySelectorAll('.slot-open-action').length, lsBook: ids(b) };
  });
  const eraseSlot = async (n) => {
    await page.evaluate((s) => { const b = document.querySelector('.slot-erase-action[data-purge-target="' + s + '"]'); if (b) b.click(); }, n);
    await page.waitForTimeout(150);
    await page.evaluate(() => { const c = document.getElementById('action-confirm-erase'); if (c) c.click(); });
    await page.waitForTimeout(1800);
  };

  await page.goto(BASE + '/sketchbook.html', { waitUntil: 'load' });
  await page.waitForTimeout(2600);   // nav.js lazy-loads the codec

  /* ---- reset, then seed THREE sketches through the REACHABLE route ---- */
  await page.evaluate(() => {
    try { localStorage.removeItem('datumfi_sketchbook_v1'); } catch (e) {}
    for (let n = 1; n <= 4; n++) { try { localStorage.removeItem('datum_sketch_state_' + n); } catch (e) {} }
    window._applySketchBook([]);
  });
  await page.waitForTimeout(400);
  for (let i = 1; i <= 3; i++) {
    await page.evaluate((k) => {
      sessionStorage.setItem('datumfi_pending_save', '1');
      sessionStorage.setItem('datumfi_sketch_current_snapshot', JSON.stringify({
        sketch_id: 'auto-' + k, age: 40 + k, retire_age: 60 + k, portfolio_mass: 1000 + k,
        datum_spend: 900 + k, resolved_state: 'EXPANSIVE', status: 'Drafted',
        date_stamped: '06/18/2026', time_stamped: '1:0' + k + ' PM'
      }));
      window._autoConsumeSketch();
    }, i);
    await page.waitForTimeout(500);
  }

  const pre = await readState();
  console.log('===== SKETCHBOOK ERASE-SURVIVORS GATE [' + LABEL + ']' + (NOHYDRATE ? ' --nohydrate' : '') + ' =====');
  check('setup: 3 sketches saved through _autoConsumeSketch (reachable route)',
    pre.openBtns === 3 && pre.lsBook && pre.lsBook.filter(Boolean).length === 3,
    'openBtns=' + pre.openBtns + ' lsBook=' + JSON.stringify(pre.lsBook));

  await eraseSlot(2);
  const post = await readState();

  /* ---- THE DEFECT ---- */
  check('erase slot 2: the OTHER TWO sketches survive in the UI',
    post.openBtns === 2, 'openBtns=' + post.openBtns + ' (want 2)');
  check('erase slot 2: the OTHER TWO survive in the LS book',
    !!post.lsBook && post.lsBook.filter(Boolean).length === 2,
    'lsBook=' + JSON.stringify(post.lsBook));
  check('erase slot 2: the ERASED one is actually gone',
    !!post.lsBook && post.lsBook.indexOf('auto-2') === -1, 'lsBook=' + JSON.stringify(post.lsBook));

  /* ---- THE BOUNDARY: hydration must never resurrect ---- */
  await page.evaluate(() => {
    try { localStorage.removeItem('datumfi_sketchbook_v1'); } catch (e) {}
    for (let n = 1; n <= 4; n++) { try { localStorage.removeItem('datum_sketch_state_' + n); } catch (e) {} }
    window._applySketchBook([]);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { try { window._purgeSketchSlot(1); } catch (e) {} });
  await page.waitForTimeout(1200);
  const empty = await readState();
  check('BOUNDARY: an already-empty book stays EMPTY through an erase (no resurrect, L51)',
    empty.openBtns === 0 && (!empty.lsBook || empty.lsBook.filter(Boolean).length === 0),
    'openBtns=' + empty.openBtns + ' lsBook=' + JSON.stringify(empty.lsBook));

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await browser.close(); server.close();
  const total = 6;
  console.log('\n' + (total - fails.length) + '/' + total + ' — OVERALL: ' + (fails.length ? 'RED' : 'GREEN'));

  if (NOHYDRATE) {
    // Masking-proof: assert the SPECIFIC survivor checks bit, not merely that the gate went red.
    const bit = fails.indexOf('erase slot 2: the OTHER TWO sketches survive in the UI') !== -1
             || fails.indexOf('erase slot 2: the OTHER TWO survive in the LS book') !== -1;
    if (!bit) {
      console.error('❌ --nohydrate RED-FIRST FAILED — survivors still survived without the hydration.');
      process.exit(1);
    }
    console.log('✅ RED-FIRST OK — without the guarded hydration the survivors are wiped.');
    process.exit(0);
  }
  process.exit(fails.length ? 1 : 0);
})();
