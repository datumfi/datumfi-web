/* S2.0 header-swap gate — RED pre-wire, GREEN post-wire. Asserts via the app's own render
   path (Lesson 47): in view-s2 the visible left-header must read PHASE II — ARCHITECTURE
   (gold) / Define the Mass / The Studio / Draft your Estate… (60%-white), and PHASE I — DATA
   must NOT be visible; in S1 the inverse. RED today because the header is unwrapped and S2
   still shows PHASE I. Usage: node scripts/_probe_s2_header.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const GOLD = 'rgb(201, 168, 76)';            // var(--gold) #C9A84C
const SUB  = 'rgba(255, 255, 255, 0.6)';     // 60%-white subtitle

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const probe = await p.evaluate(({ GOLD, SUB }) => {
    function isVisible(el) { while (el) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; el = el.parentElement; } return true; }
    function findByText(t) { return Array.from(document.querySelectorAll('.drafting-panel div, .drafting-panel h1')).find(e => e.textContent.trim() === t) || null; }
    function visOf(t) { const el = findByText(t); return el ? isVisible(el) : false; }
    function colorOf(t) { const el = findByText(t); return el ? getComputedStyle(el).color : '(missing)'; }

    // ---- S1 state (default, not view-s2) ----
    const s1 = {
      p1vis: visOf('PHASE I — DATA'),
      p2vis: visOf('PHASE II — ARCHITECTURE'),
    };
    // ---- enter S2 ----
    if (window.enterS2View) window.enterS2View();
    const inS2 = document.getElementById('studio-layout').classList.contains('view-s2');
    const s2 = {
      inS2,
      p2vis:    visOf('PHASE II — ARCHITECTURE'),
      p1vis:    visOf('PHASE I — DATA'),
      defineVis: visOf('Define the Mass'),
      subVis:   visOf('Draft your Estate. Map the dimensions of your wealth.'),
      p2gold:   colorOf('PHASE II — ARCHITECTURE') === GOLD,
      subColor: colorOf('Draft your Estate. Map the dimensions of your wealth.') === SUB,
    };
    return { s1, s2 };
  }, { GOLD, SUB });
  await b.close();

  const R = probe;
  const ok = (n, c) => { console.log(`${n.padEnd(44)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.0 HEADER GATE [' + LABEL + '] =====');
  const a1 = ok('S1: PHASE I visible',                 R.s1.p1vis === true);
  const a2 = ok('S1: PHASE II hidden',                 R.s1.p2vis === false);
  const a3 = ok('S2: view-s2 active',                  R.s2.inS2 === true);
  const a4 = ok('S2: PHASE II — ARCHITECTURE visible', R.s2.p2vis === true);
  const a5 = ok('S2: PHASE I — DATA hidden',           R.s2.p1vis === false);
  const a6 = ok('S2: Define the Mass visible',         R.s2.defineVis === true);
  const a7 = ok('S2: subtitle visible',                R.s2.subVis === true);
  const a8 = ok('S2: PHASE II label is gold',          R.s2.p2gold === true);
  const a9 = ok('S2: subtitle is 60%-white',           R.s2.subColor === true);
  console.log('detail:', JSON.stringify(R));
  const all = a1 && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
