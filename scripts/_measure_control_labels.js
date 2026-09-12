/* C — REPORT ONLY. The EXACT on-screen label of the two controls behind datum_spend and
   plan_end_age, character for character, as they render live.
   ⚠️ METHOD: boots studio.html in a real browser, enters the Data room, and walks UP from each
   control to collect every VISIBLE string that names it — label element, nearby text, aria-label,
   placeholder, and the value readout. Both controls have TWO FACES (a Sketch slider and a Profile
   field), so both faces are reported; a refusal that quotes one face while the user is looking at
   the other is the Social Security defect again.
   ⚠️ WHAT IT CANNOT SEE: a label that only appears after an interaction this script does not
   perform (hover, focus, an opened modal). Everything below is the resting state of the Data room. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const REPO = path.resolve(__dirname, '..');
const PORT = 8241;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(REPO, p);
  if (!fp.startsWith(REPO) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

(async () => {
  server.listen(PORT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.waitForFunction(() => typeof window._studioEnterRoom === 'function', null, { timeout: 9000 });
  /* ⛔ FIND THE ROOM WHERE EACH CONTROL IS ACTUALLY ON SCREEN. The first run read the Data room
     and reported visible=false for every datum control — a label nobody can see is not an
     on-screen label, and quoting it back to the Architect would have been the SS defect in
     miniature: describing a control the user is not looking at. */
  const ROOMS = ['data', 'architecture', 'tension', 'uncertainty', 'measurement', 'alignment', 'endurance'];
  const WANT = ['slider-datum', 'spend-input', 'val-datum', 'sl-plan-through', 'plan-end-age', 'val-plan-through'];
  const where = {};
  for (const room of ROOMS) {
    try { await page.evaluate((r) => window._studioEnterRoom(r), room); } catch (e) { continue; }
    await page.waitForTimeout(700);
    const v = await page.evaluate((ids) => ids.map((id) => {
      const el = document.getElementById(id); if (!el) return false;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    }), WANT);
    WANT.forEach((id, i) => { if (v[i] && !where[id]) where[id] = room; });
  }
  console.log('WHERE EACH CONTROL IS ON SCREEN:');
  WANT.forEach((id) => console.log('  #' + id + '  ->  ' + (where[id] || 'NOT VISIBLE IN ANY ROOM at rest')));
  const readRoom = where['spend-input'] || where['slider-datum'] || 'data';
  await page.evaluate((r) => window._studioEnterRoom(r), readRoom);
  await page.waitForTimeout(900);
  console.log('\nLABELS BELOW READ FROM ROOM: ' + readRoom + ' (and the Data room for the Profile faces)');

  const out = await page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
    };
    const describe = (id) => {
      const el = document.getElementById(id);
      if (!el) return { id, present: false };
      const rec = { id, present: true, visible: vis(el), tag: el.tagName.toLowerCase(),
                    value: el.value !== undefined ? String(el.value) : null,
                    aria: el.getAttribute('aria-label'), placeholder: el.getAttribute('placeholder'),
                    labels: [], nearby: [] };
      document.querySelectorAll('label[for="' + id + '"]').forEach((l) => {
        rec.labels.push({ text: l.textContent.replace(/\s+/g, ' ').trim(), visible: vis(l) });
      });
      let node = el.parentElement, depth = 0;
      const seen = new Set();
      while (node && depth < 4) {
        node.querySelectorAll('label, .field-label, .sk-label, .lbl, .hud-label, span, small, h3, h4, legend, div').forEach((t) => {
          if (t.contains(el)) return;
          const s = t.textContent.replace(/\s+/g, ' ').trim();
          if (!s || s.length > 90 || seen.has(s)) return;
          seen.add(s);
          rec.nearby.push({ text: s, visible: vis(t), depth });
        });
        node = node.parentElement; depth++;
      }
      return rec;
    };
    return {
      datum:   ['slider-datum', 'spend-input', 'val-datum'].map(describe),
      planEnd: ['sl-plan-through', 'plan-end-age', 'val-plan-through'].map(describe)
    };
  });

  const show = (title, recs) => {
    console.log('\n==== ' + title + ' ====');
    for (const r of recs) {
      if (!r.present) { console.log('\n  #' + r.id + ' -- NOT IN THE DOM'); continue; }
      console.log('\n  #' + r.id + '  <' + r.tag + '>  visible=' + r.visible
        + (r.value !== null ? '  value=' + JSON.stringify(r.value) : ''));
      if (r.aria) console.log('    aria-label   ' + JSON.stringify(r.aria));
      if (r.placeholder) console.log('    placeholder  ' + JSON.stringify(r.placeholder));
      r.labels.forEach((l) => console.log('    <label for>  ' + JSON.stringify(l.text) + (l.visible ? '' : '   (NOT VISIBLE)')));
      r.nearby.filter((x) => x.visible).slice(0, 10)
        .forEach((x) => console.log('    nearby d' + x.depth + '     ' + JSON.stringify(x.text)));
    }
  };
  show('datum_spend -- THE CONTROL(S) BEHIND IT', out.datum);
  show('plan_end_age -- THE CONTROL(S) BEHIND IT', out.planEnd);

  await ctx.close(); await browser.close(); server.close();
})().catch((e) => { console.error('FAILED', e); try { server.close(); } catch (_e) {} process.exit(1); });
