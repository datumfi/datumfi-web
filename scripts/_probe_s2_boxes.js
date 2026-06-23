/* S2.1 box-hide gate — RED pre-wire, GREEN post-wire. The Total Portfolio / Annual
   Contributions header boxes must be HIDDEN in view-s2 (stale mirror once rooms drive the
   Shape) but FULLY LIVE in S1 (critical estimate entry). Proves the S1 carry-in is NOT
   broken by the S2 hide. RED today because the boxes show in view-s2. Asserts via the app's
   own render path (Lesson 47). Usage: node scripts/_probe_s2_boxes.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(500); // let DOMContentLoaded mirror-ladder fill the boxes

  const probe = await p.evaluate(() => {
    function isVisible(el) { while (el) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; el = el.parentElement; } return true; }
    const portEl = document.getElementById('bp-portfolio-total');
    const sliderP = document.getElementById('slider-portfolio');

    // ---- S1 state (default) ----
    const s1 = {
      boxVisible: portEl ? isVisible(portEl) : false,
      carryFilled: !!(portEl && String(portEl.value || '').trim().length > 0), // mirror-ladder seed
    };
    // S1 writeback live: typing into the box moves slider-portfolio.dataset.exactVal
    let writeback = false;
    if (portEl && sliderP) {
      portEl.value = '$912,000';
      portEl.dispatchEvent(new Event('input', { bubbles: true }));
      writeback = (sliderP.dataset.exactVal === '912000');
    }
    s1.writeback = writeback;

    // ---- enter S2 ----
    if (window.enterS2View) window.enterS2View();
    const inS2 = document.getElementById('studio-layout').classList.contains('view-s2');
    const s2 = {
      inS2,
      boxHidden: portEl ? !isVisible(portEl) : false,
    };
    return { s1, s2 };
  });
  await b.close();

  const R = probe;
  const ok = (n, c) => { console.log(`${n.padEnd(42)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.1 BOX GATE [' + LABEL + '] =====');
  const a1 = ok('S1: boxes visible',                  R.s1.boxVisible === true);
  const a2 = ok('S1: carry-in seeded box value',      R.s1.carryFilled === true);
  const a3 = ok('S1: box writeback -> slider live',   R.s1.writeback === true);
  const a4 = ok('S2: view-s2 active',                 R.s2.inS2 === true);
  const a5 = ok('S2: boxes hidden',                   R.s2.boxHidden === true);
  console.log('detail:', JSON.stringify(R));
  const all = a1 && a2 && a3 && a4 && a5;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
