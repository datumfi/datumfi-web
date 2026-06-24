/* S2.4 fill/weight gate — asserts via the app render path (Lesson 47), NOT model output.
   S2.5 (Dispatch A Task 3): fill is BINARY — a typed value fills the room completely (100%),
   $0 -> no fill. Concave FILL_K/floor/cap curve retired. Weight/descriptor contract unchanged:
   room --weight === DatumBlueprint.accountWeights[id] (renderer READS hub, no recompute;
   debt/checking -> 0); descriptor flow (renderEstate -> energize attaches data-energized).
   Usage: node scripts/_probe_s2_4_fill.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

// mirror of datum-estate.js fillPct — S2.5 binary contract: typed value fills completely, $0 = empty
function expFill(v){ return v > 0 ? 100 : 0; }

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const mk = (id, baseId, value) => ({ id, baseId, value, inflow: 0, freq: 12, exclude: false,
      isNew: false, isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable',
      disbursement: 'Discretionary', intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false });
    window.state.accounts = [
      mk('f0',   'savings',     0),        // investable bucket but $0 -> no fill, weight 0
      mk('f25',  'taxable',     25000),    // investable
      mk('f50',  'rothira',     50000),    // investable
      mk('f250', 'tradira',     250000),   // investable
      mk('f750', 'roth401k',    750000),   // investable
      mk('f1m',  'pretax401k',  1000000),  // investable
      mk('fdebt','mortgage_joint', 200000),// debt -> weight 0
      mk('fchk', 'checking',    5000)      // non-investable -> weight 0
    ];
    if (window.updateSVGs) window.updateSVGs();
    return null;
  });
  await p.waitForTimeout(450);

  const D = await p.evaluate(() => {
    function grp(id){ return Array.from(document.querySelectorAll('#bp-svg g')).find(g => (g.getAttribute('onclick')||'').indexOf("'"+id+"'")>=0) || null; }
    const hub = (window.DatumBlueprint && window.DatumBlueprint.accountWeights)
      ? window.DatumBlueprint.accountWeights({ accounts: window.state.accounts }) : {};
    const ids = ['f0','f25','f50','f250','f750','f1m','fdebt','fchk'];
    const rooms = {};
    ids.forEach(function(id){
      const g = grp(id);
      if (!g) { rooms[id] = null; return; }
      const wall = g.querySelector('.room-rect');
      const fill = g.querySelector('.room-fill');
      rooms[id] = {
        wallH: wall ? parseFloat(wall.getAttribute('height')) : 0,
        fillH: fill ? parseFloat(fill.getAttribute('height')) : 0,
        hasFill: !!fill,
        weight: parseFloat(g.style.getPropertyValue('--weight')) || 0,
        hubWeight: hub[id] || 0
      };
    });
    const energizedCount = document.querySelectorAll('#bp-svg g[data-energized="1"]').length;
    return { rooms, energizedCount };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(46)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const within = (a, e, tol) => Math.abs(a - e) <= tol;
  console.log('===== S2.4 FILL/WEIGHT GATE [' + LABEL + '] =====');
  const checks = [];
  // fill ratio == curve for the funded rooms
  [['f25',25000],['f50',50000],['f250',250000],['f750',750000],['f1m',1000000]].forEach(function(pair){
    const id = pair[0], v = pair[1], r = D.rooms[id];
    const ratio = (r && r.wallH > 0) ? (r.fillH / r.wallH) * 100 : -1;
    checks.push(ok('fill% ' + id + ' ~= ' + expFill(v).toFixed(1) + '% (got ' + ratio.toFixed(1) + ')', within(ratio, expFill(v), 1.5)));
  });
  checks.push(ok('$0 room (f0) has NO fill', D.rooms.f0 && D.rooms.f0.hasFill === false));
  checks.push(ok('binary: f25 fully filled (>= 99%)', D.rooms.f25 && (D.rooms.f25.fillH / D.rooms.f25.wallH) * 100 >= 99));
  // weight == hub, renderer recomputes nothing
  ['f25','f50','f250','f750','f1m'].forEach(function(id){
    const r = D.rooms[id];
    checks.push(ok('weight ' + id + ' == hub (' + (r?r.hubWeight.toFixed(2):'?') + ')', r && within(r.weight, r.hubWeight, 0.05) && r.hubWeight > 0));
  });
  checks.push(ok('debt fdebt weight == 0 (non-investable)', D.rooms.fdebt && D.rooms.fdebt.weight === 0 && D.rooms.fdebt.hubWeight === 0));
  checks.push(ok('checking fchk weight == 0 (non-investable)', D.rooms.fchk && D.rooms.fchk.weight === 0 && D.rooms.fchk.hubWeight === 0));
  checks.push(ok('descriptor flow: 8 rooms data-energized', D.energizedCount === 8));
  console.log('detail:', JSON.stringify(D.rooms));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
