/* S2.3 estate-render gate — locks the Block-C structural invariants after the datum-estate.js
   extraction, asserted via the app's own render path (Lesson 47) on a multi-branch fixture
   (multi-owner + property=grounds + trust=wing + mortgage=debt + lens flags ON). A dropped/
   mis-wired ctx field breaks an invariant -> RED (e.g. drop propertyAccount -> grounds $ gone;
   drop spendInputEl -> renderEstate throws -> bp-svg empty). Usage: node scripts/_probe_s2_estate.js [LABEL] */
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
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const co = document.getElementById('co-arch-toggle'); if (co) co.checked = true;
    const mk = (id, baseId, value, extra) => Object.assign(
      { id, baseId, value, inflow: 0, freq: 12, exclude: false, isNew: false, isFriction: false,
        isPriority: false, holdings: [], trustType: 'Irrevocable', disbursement: 'Discretionary',
        intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false }, extra || {});
    window.state.accounts = [
      mk('fixA', 'pretax401k', 300000, { inflow: 20000 }),
      mk('fixB', 'taxable', 250000, { inflow: 10000 }),
      mk('fixC', 'pretax401k_co', 150000),
      mk('fixD', 'property', 600000),
      mk('fixE', 'trust', 120000),
      mk('fixF', 'mortgage_joint', 200000, { isPriority: true })
    ];
    if (window.toggleShock) window.toggleShock();
    if (window.toggleThermal) window.toggleThermal();
    if (window.toggleRouting) window.toggleRouting();
    if (window.toggleDatum) window.toggleDatum();
    const mb = document.getElementById('measure-btn'); if (mb) mb.click();
    if (window.updateSVGs) window.updateSVGs();
    return null;
  });
  await p.waitForTimeout(450);

  const D = await p.evaluate(() => {
    const svg = document.getElementById('bp-svg').innerHTML;
    const groundsMatch = svg.match(/font-size:16px;">([^<]*)</);
    return {
      moduleLoaded: typeof (window.DatumEstate && window.DatumEstate.renderEstate) === 'function',
      groundsRect: /grounds-rect/.test(svg),
      groundsDollar: groundsMatch ? groundsMatch[1] : '(none)',
      roomRectCount: (svg.match(/room-rect/g) || []).length,
      trustWing: /GENERATIONAL TRUST WING/.test(svg),
      datumLine: /DATUM:/.test(svg),
      routing: /outflow-route/.test(svg),
      demolition: /demolition-route/.test(svg),
      measureOutline: /estate-measure-outline/.test(svg),
      grossText: (document.getElementById('gross-estate-val').innerText || '').trim()
    };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(40)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.3 ESTATE GATE [' + LABEL + '] =====');
  const a0 = ok('DatumEstate module loaded',        D.moduleLoaded === true);
  const a1 = ok('grounds-rect present',             D.groundsRect === true);
  const a2 = ok('property grounds $ = $600k',       D.groundsDollar === '$600k');
  const a3 = ok('room-rect count = 5',              D.roomRectCount === 5);
  const a4 = ok('trust wing present',               D.trustWing === true);
  const a5 = ok('datum line present',               D.datumLine === true);
  const a6 = ok('routing path present',             D.routing === true);
  const a7 = ok('demolition route present',         D.demolition === true);
  const a8 = ok('measure outline present',          D.measureOutline === true);
  const a9 = ok('gross estate val is $-formatted',  /^-?\$[\d,]+$/.test(D.grossText));
  console.log('detail:', JSON.stringify(D));
  const all = a0 && a1 && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
