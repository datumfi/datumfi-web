/* A.1 Task 1 read-only gate — asserts via the app's real USER-input path (Lesson 47), NOT a
   synthetic input dispatch (which bypasses readOnly and would be a false gate). The relocated
   Total Portfolio / Annual Contributions boxes must be:
     · S1            -> editable (isEditable true, readOnly false) + writeback LIVE (typing moves
                        slider-portfolio.dataset.exactVal),
     · S2 Shape side -> READ-ONLY (isEditable false, readOnly true) + writeback DORMANT (a real
                        user edit can't land, exactVal unchanged),
     · back on S1    -> editable again (the unbinding never leaked to S1).
   RED today: on S2-Shape the box is still editable + writeback live.
   Usage: node scripts/_probe_a1_readonly.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const PORT = '#bp-portfolio-total';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(500);

  const loc = p.locator(PORT);
  const roProp = () => p.evaluate((s) => { const el = document.querySelector(s); return !!(el && el.readOnly); }, PORT);
  const exactVal = () => p.evaluate(() => { const s = document.getElementById('slider-portfolio'); return s ? (s.dataset.exactVal || '') : ''; });

  // ---- S1: editable + writeback live ----
  const s1Editable = await loc.isEditable();
  const s1RO = await roProp();
  await loc.fill('$912,000');                 // real user edit (respects editability)
  await p.waitForTimeout(80);
  const s1Exact = await exactVal();           // expect '912000'

  // ---- enter S2, Shape side ----
  await p.evaluate(() => {
    const mk = (id, baseId, value) => ({ id, baseId, value, inflow: 0, freq: 12, exclude: false,
      isNew: false, isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable',
      disbursement: 'Discretionary', intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false });
    window.state.accounts = [ mk('r1', 'taxable', 50000) ];
    if (window.updateSVGs) window.updateSVGs();
    if (window.enterS2View) window.enterS2View();
    const l = document.getElementById('studio-layout');
    if (!l.classList.contains('mode-shape') && window.toggleShapeMode) window.toggleShapeMode();
  });
  await p.waitForTimeout(350);

  const s2Editable = await loc.isEditable();
  const s2RO = await roProp();
  const beforeEdit = await exactVal();
  let editThrew = false;
  try { await loc.fill('5000000', { timeout: 1200 }); } catch (e) { editThrew = true; } // readOnly -> not editable -> throws
  await p.waitForTimeout(80);
  const afterEdit = await exactVal();
  const s2Severed = (afterEdit === beforeEdit);

  // ---- exit to S1: editable again (no leak) ----
  await p.evaluate(() => { if (window.exitS2View) window.exitS2View(); });
  await p.waitForTimeout(250);
  const backEditable = await loc.isEditable();
  const backRO = await roProp();
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(48)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== A.1 READ-ONLY GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('S1 box editable (isEditable)',        s1Editable === true));
  checks.push(ok('S1 box readOnly===false',             s1RO === false));
  checks.push(ok('S1 writeback live (exactVal=912000)', s1Exact === '912000'));
  checks.push(ok('S2-Shape box NOT editable',           s2Editable === false));
  checks.push(ok('S2-Shape readOnly===true',            s2RO === true));
  checks.push(ok('S2-Shape user edit blocked (threw)',  editThrew === true));
  checks.push(ok('S2-Shape writeback dormant (exactVal unchanged)', s2Severed === true));
  checks.push(ok('back on S1 editable again (no leak)', backEditable === true && backRO === false));
  console.log('detail:', JSON.stringify({ s1Editable, s1RO, s1Exact, s2Editable, s2RO, editThrew, beforeEdit, afterEdit, backEditable, backRO }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
