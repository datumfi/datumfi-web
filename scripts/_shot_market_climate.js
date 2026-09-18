/* DEV-ONLY — shoot the ported Market Climate into _eyeson/ so the Captain and I can SEE it before
 * a suite runs. Not a gate: it asserts nothing and exits 0. It exists because every successful port
 * in this project has been checked by eye first — margins, a colour that dropped, a tooltip
 * clipped by its own container are all things a green suite is structurally unable to notice.
 *   🔑 A GATE PROVES A VALUE; A SCREENSHOT PROVES A SURFACE. They do not substitute.
 *
 * Shots, both colour modes:
 *   01 dark  · the panel at rest (Blend active)
 *   02 dark  · a non-default selected (Regime) — the ::before rail and tag colour change
 *   03 dark  · hover help open on Datumae Blend — the longest authored block, worst-case height
 *   04 dark  · the methodology accordion open
 *   05 light · the panel at rest
 *   06 light · hover help open — the mode where a wrong inherited colour is dangerous rather than
 *              merely wrong (white text on a cream panel), which is how measurement.css's own port
 *              defect hid: THE STYLED ELEMENTS HID IT AND THE UNSTYLED ONES WERE AT RISK
 *   07 light · the methodology accordion open
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8232;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    window.Clerk = { load: () => Promise.resolve(), user: null };
  });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  /* open section 06 and scroll it into view */
  await page.evaluate(() => {
    const sec = document.getElementById('sec-climate');
    if (sec) { sec.style.display = 'block'; sec.scrollIntoView({ block: 'center' }); }
  });
  await page.waitForTimeout(400);

  /* ⚠️ SHOOT A GENEROUS BOX, NOT THE GRID'S OWN CLIENT RECT. The help tooltip is an ::after that
     escapes the tile, so clipping to the element would frame out the very thing being checked. */
  /* ⛔ FRAMED ON SECTION 06 ITSELF, header included, and STOPPING AT ITS BOTTOM EDGE.
     The first version padded 150px below the grid and caught the Range-readiness strip, which
     belongs to the Reveal block further down the page and is a SIBLING of this section, not part
     of it. That put a control in the frame that this port neither owns nor changed, and it read as
     a parity defect.
     🔑 A SCREENSHOT IS AN ASSERTION ABOUT A SURFACE, SO ITS BOUNDS ARE PART OF THE CLAIM. A frame
        that includes the neighbours is reporting on work nobody did. */
  const box = async () => {
    const r = await page.evaluate(() => {
      const sec = document.querySelector('[data-phase="measurement"].studio-section');
      const g = document.querySelector('.climate-grid');
      if (!g) return null;
      const head = sec ? sec.querySelector('.section-header-wrapper') : null;
      const top = head ? head.getBoundingClientRect() : g.getBoundingClientRect();
      const b = g.getBoundingClientRect();
      return { x: Math.max(0, b.x - 24), y: Math.max(0, top.y - 18),
               w: b.width + 48, h: (b.bottom - top.y) + 36 };
    });
    if (!r) return null;
    return { x: r.x, y: r.y, width: Math.min(r.w, 1600 - r.x), height: Math.min(r.h, 1200 - r.y) };
  };

  /* ⚠️ RE-ASSERTED BEFORE EVERY ACTION, NOT ONCE AT THE TOP. MEASURED: selecting a tile re-renders
     enough of the Studio that section 06 collapses and the tiles go invisible — the first hover
     then timed out against an element Playwright could see in the DOM and could not click.
     🔑 "PRESENT IN THE DOM" AND "VISIBLE TO A USER" ARE DIFFERENT CLAIMS, and a screenshot harness
        that assumes the first is shooting a surface nobody can reach. */
  /* ⛔⛔ ENTER THE ROOM. THE FIRST VERSION OF THIS SCRIPT DID NOT, AND IT SHOT A BLANK PANEL WHILE
     REPORTING SEVEN SUCCESSFUL SCREENSHOTS.
     The Studio is phase-based: section 06 lives inside data-phase="measurement", which is not the
     room a cold Studio opens in. Setting #sec-climate to display:block does nothing while an
     ANCESTOR is hidden, and `page.screenshot({clip})` happily photographs empty space.
     🔑 AND IT EXPOSED A REAL GAP IN THE GATE BESIDE IT: getComputedStyle resolves on a hidden
        element and el.click() fires on one, so _gate_market_climate_port passed eleven legs without
        ever proving a household could SEE the control. RENDERED IS NOT REACHABLE — the gate now
        carries L11 for exactly this, found by a screenshot rather than by a test. */
  const ensureVisible = async () => {
    await page.evaluate(() => {
      if (typeof window._studioEnterRoom === 'function') window._studioEnterRoom('measurement');
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const sec = document.getElementById('sec-climate');
      if (sec) sec.style.display = 'block';
      const g = document.querySelector('.climate-grid');
      if (g) g.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(300);
  };

  const shoot = async (name) => {
    await ensureVisible();
    const clip = await box();
    await page.screenshot({ path: path.join(OUT, name), clip: clip || undefined });
    console.log('  -> _eyeson/' + name);
  };

  const setMode = async (light) => {
    await page.evaluate((l) => { document.body.classList.toggle('light-mode', !!l); }, light);
    await page.waitForTimeout(350);
  };
  const openMethodology = async () => {
    await ensureVisible();
    await page.evaluate(() => {
      const t = document.querySelector('.climate-grid [data-methodology-toggle]');
      if (t) t.click();
    });
    await page.waitForTimeout(350);
  };
  const clickKey = async (k) => {
    await ensureVisible();
    await page.evaluate((key) => {
      const el = document.querySelector('.climate-grid .climate-option[data-outlook-key="' + key + '"]');
      if (el) el.click();
    }, k);
    await page.waitForTimeout(250);
  };
  const hoverKey = async (k) => {
    await ensureVisible();
    await page.hover('.climate-grid .climate-option[data-outlook-key="' + k + '"]');
    await page.waitForTimeout(450);
  };

  console.log('market climate — shooting to _eyeson/');
  await shoot('mc01e_dark_rest.png');
  await clickKey('regime');
  await shoot('mc02e_dark_regime_selected.png');
  await clickKey('blend');
  await hoverKey('blend');
  await shoot('mc03e_dark_help_blend.png');
  await page.mouse.move(10, 10); await page.waitForTimeout(300);
  await openMethodology();
  await shoot('mc04e_dark_methodology_open.png');
  await openMethodology();   // close again

  await setMode(true);
  await shoot('mc05e_light_rest.png');
  await hoverKey('cape');
  await shoot('mc06e_light_help_cape.png');
  await page.mouse.move(10, 10); await page.waitForTimeout(300);
  await openMethodology();
  await shoot('mc07e_light_methodology_open.png');

  /* a few measured facts printed beside the pictures, so a look is backed by numbers */
  const facts = await page.evaluate(() => {
    const g = document.querySelector('.climate-grid');
    const tiles = Array.from(document.querySelectorAll('.climate-grid .climate-option'));
    const cs = (el, p) => getComputedStyle(el)[p];
    return {
      tiles: tiles.length,
      gridWidth: g ? Math.round(g.getBoundingClientRect().width) : null,
      tileHeights: tiles.map((t) => Math.round(t.getBoundingClientRect().height)),
      strongFont: tiles[0] ? cs(tiles[0].querySelector('strong'), 'fontFamily') : null,
      pFont: tiles[0] ? cs(tiles[0].querySelector('p'), 'fontFamily') : null,
      railColours: tiles.map((t) => getComputedStyle(t, '::before').backgroundColor),
      overflowClipped: tiles.map((t) => cs(t, 'overflow'))
    };
  });
  console.log('');
  console.log('  tiles rendered      : ' + facts.tiles);
  console.log('  grid width          : ' + facts.gridWidth + 'px');
  console.log('  tile heights        : ' + JSON.stringify(facts.tileHeights));
  console.log('  name typeface       : ' + facts.strongFont);
  console.log('  body typeface       : ' + facts.pFont);
  console.log('  rail colours        : ' + JSON.stringify(facts.railColours));
  console.log('  tile overflow       : ' + JSON.stringify(facts.overflowClipped));
  console.log('');
  console.log('  ⚠️ overflow:hidden on a tile would CLIP its own help tooltip. V93 sets');
  console.log('     overflow:visible on [data-help] for exactly that reason — check the value above.');

  await browser.close();
  server.close();
})();
