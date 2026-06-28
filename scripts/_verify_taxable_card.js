'use strict';
/* Taxable Brokerage card gate (app render path, Lesson 47). Verifies:
   - holdings columns: Beta / Yield / Geography render; Inv. Corr. GONE;
   - rollup strip above table: Unrealized Gain = Σ(value−costBasis), Weighted Beta, Blended Yield, Avg Expense;
   - cost-basis + unrealized-gain TAXABLE-ONLY (present in taxable, absent in a Roth account);
   - expanded fetchMockData pulls beta/dividendYield/geography/instrumentType (stable non-price fields);
   - SPINE: Shape baselineRate recenters on blended expReturn when holdings carry it, and is UNCHANGED
     (paradigm parity) when holdings are empty;
   - isFriction ON -> account absent from WANT hops BUT still in investableTotal (Estate value);
   - copy: new plain toggle labels present; NO "Physics"/"Liquidity Drag"/"structural bleed"/"Inverse Correlation";
   - empty fields show "—", never fake $0/0.
   Usage: node scripts/_verify_taxable_card.js [LABEL] */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] || 'RUN';
const PORT = 8146;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const MK = `(id,baseId,value,holdings)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:holdings||[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false,showHoldings:false})`;

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { state: 'attached', timeout: 15000 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const x = document.getElementById('studioStartScratch'); if (x) x.click(); });
  await p.waitForTimeout(300);

  // taxable account: two holdings (one with cost basis + beta + expReturn + yield, one blank-basis)
  await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [ f('tx', 'taxable', 0, [
      { ticker: 'A', name: 'A', price: 100, shares: 10, costBasis: 600, beta: 1.2, expectedReturn: 8, dividendYield: 1.5, expRatio: 0.03, geography: 'US', sector: 'Tech', assetClass: 'US Equity', instrumentType: 'Stock', priceSource: 'manual' },
      { ticker: 'B', name: 'B', price: 50,  shares: 20, costBasis: 0, beta: 0.8, expectedReturn: 6, dividendYield: 2.5, expRatio: 0.10, geography: 'US', sector: 'Fin', assetClass: 'US Equity', instrumentType: 'Stock', priceSource: 'manual' } ]) ];
    if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs();
    window.openAccountModal('tx'); window.toggleHoldings('tx');
  }, MK);
  await p.waitForTimeout(250);

  const taxable = await p.evaluate(() => {
    const ths = Array.from(document.querySelectorAll('#modal-dynamic-content .holdings-table th')).map(t => t.textContent.replace(/\s+/g, ' ').trim());
    const rollup = Array.from(document.querySelectorAll('#modal-dynamic-content .holdings-rollup .hr-lbl')).map(t => t.textContent.trim());
    const ugCell = document.querySelector('#modal-dynamic-content .holdings-rollup .hr-cell .hr-val');
    const html = document.getElementById('modal-dynamic-content').innerHTML;
    // Instrument column input value for holding 0 (the instrumentType field surfaced)
    const instCell = document.querySelector('#modal-dynamic-content .holdings-table tr:nth-child(2) td:last-child input, #modal-dynamic-content input[oninput*="instrumentType"]');
    return { ths, rollup, ugVal: ugCell ? ugCell.textContent.trim() : '', instVal: instCell ? instCell.value : '', html };
  });

  // fetchMockData expansion: type AAPL -> stable fields populate
  const pull = await p.evaluate(() => {
    window.fetchMockData('tx', 0, 'AAPL');
    const h = window.state.accounts[0].holdings[0];
    return { name: h.name, sector: h.sector, beta: h.beta, dividendYield: h.dividendYield, geography: h.geography, instrumentType: h.instrumentType };
  });

  // LIVE-REFRESH (the bug): typing costBasis updates rollup + row gain in place, no ticker-change/re-render
  const refresh = await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [ f('tx', 'taxable', 0, [
      { ticker: 'A', name: 'A', price: 100, shares: 10, costBasis: 600, priceSource: 'manual' },
      { ticker: 'B', name: 'B', price: 50,  shares: 20, costBasis: 0,   priceSource: 'manual' } ]) ];
    if (window.renderInputs) renderInputs();
    window.openAccountModal('tx'); window.toggleHoldings('tx');
    const before = (document.getElementById('hr-gain') || {}).textContent;
    window.updateHolding('tx', 1, 'costBasis', '700');   // B gain 1000-700=300; A 400 -> rollup 700
    return { before: before, afterGain: (document.getElementById('hr-gain') || {}).textContent, rowGain: (document.getElementById('holding-gain-1') || {}).textContent };
  }, MK);

  // Roth account: cost-basis + unrealized-gain columns must be ABSENT (taxable-only)
  const roth = await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [ f('ro', 'rothira', 0, [{ ticker: 'A', name: 'A', price: 100, shares: 10, beta: 1.0, expectedReturn: 7, dividendYield: 1.0, expRatio: 0.04, geography: 'US', priceSource: 'manual' }]) ];
    if (window.renderInputs) renderInputs();
    window.openAccountModal('ro'); window.toggleHoldings('ro');
    const ths = Array.from(document.querySelectorAll('#modal-dynamic-content .holdings-table th')).map(t => t.textContent.replace(/\s+/g, ' ').trim());
    const rollup = Array.from(document.querySelectorAll('#modal-dynamic-content .holdings-rollup .hr-lbl')).map(t => t.textContent.trim());
    return { ths, rollup };
  }, MK);

  // SPINE: baselineRate recenters on blended expReturn (paradigm=average -> shift 0 -> center=1.08); empty -> paradigm parity
  const spine = await p.evaluate((mk) => {
    const f = eval(mk);
    const mkt = document.querySelector('input[name="market"][value="average"]'); if (mkt) mkt.checked = true;
    const avgBaseline = (window.DatumShape && DatumShape.CONSTANTS && DatumShape.CONSTANTS.DEFAULT_RATES && DatumShape.CONSTANTS.DEFAULT_RATES.average)
      ? DatumShape.CONSTANTS.DEFAULT_RATES.average.baselineRate : null;
    // with holdings carrying expReturn 8%
    window.state.accounts = [ f('tx', 'taxable', 0, [{ price: 100, shares: 100, beta: 1.0, expectedReturn: 8 }]) ];
    if (window.renderInputs) renderInputs();
    const withH = window._scenarioFromInputs();
    // empty (no expReturn data)
    window.state.accounts = [ f('tx2', 'taxable', 0, [{ price: 100, shares: 100 }]) ];
    if (window.renderInputs) renderInputs();
    const noH = window._scenarioFromInputs();
    return { avgBaseline, withBase: withH.baselineRate, withCons: withH.conservativeRate, withUp: withH.upsideRate, noBase: noH.baselineRate };
  }, MK);

  // isFriction: ON -> absent from WANT hops, present in investableTotal
  const friction = await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [ f('tx', 'taxable', 100000, []), f('pre', 'pretax401k', 80000, []) ];
    const s = document.getElementById('spend-input'); if (s) s.value = '$250,000';
    const l = document.getElementById('studio-layout'); if (l && l.classList.contains('mode-shape') && window.toggleShapeMode) toggleShapeMode();
    if (window.renderInputs) renderInputs(); if (window.updateSVGs) updateSVGs();
    if (!document.getElementById('want-readout').classList.contains('visible') && window.toggleRouting) toggleRouting();
    if (window.renderWantBox) renderWantBox();
    const before = (document.getElementById('want-readout-body') || {}).innerText || '';
    const invBefore = window.DatumBlueprint.investableTotal({ accounts: window.state.accounts });
    // mark tx friction
    window.state.accounts[0].isFriction = true;
    if (window.renderWantBox) renderWantBox();
    const after = (document.getElementById('want-readout-body') || {}).innerText || '';
    const invAfter = window.DatumBlueprint.investableTotal({ accounts: window.state.accounts });
    return { before, after, invBefore, invAfter };
  }, MK);

  await b.close(); await new Promise(r => server.close(r));

  const ok = (n, c) => { console.log(`${n.padEnd(72)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const near = (a, b2) => a !== null && Math.abs(a - b2) < 0.0005;
  console.log('===== TAXABLE CARD GATE [' + LABEL + '] =====');
  const checks = [];
  const T = taxable.ths.join(' | ');
  checks.push(ok('columns: Beta + Yield + Geography render', /Beta/.test(T) && /Yield/.test(T) && /Geography/.test(T)));
  checks.push(ok('Ask3: Instrument column surfaced, shows instrumentType ("Stock")', /Instrument/.test(T) && taxable.instVal === 'Stock'));
  checks.push(ok('Inv. Corr. column GONE', !/Inv\. Corr\./.test(T) && !/Inverse Correlation/.test(taxable.html)));
  checks.push(ok('taxable: Cost Basis + Unrealized Gain columns present', /Cost Basis/.test(T) && /Unrealized Gain/.test(T)));
  checks.push(ok('rollup strip: Unrealized Gain/Weighted Beta/Blended Yield/Avg Expense', JSON.stringify(taxable.rollup) === JSON.stringify(['Unrealized Gain', 'Weighted Beta', 'Blended Yield', 'Avg Expense'])));
  checks.push(ok('rollup Unrealized Gain = +$400 (Σ value−costBasis, only A has basis: 1000−600)', /\+\$400\b/.test(taxable.ugVal)));
  checks.push(ok('empty field shows "—" (B 0/blank cost basis -> per-row dash, no fake gain)', /—/.test(taxable.html)));
  checks.push(ok('fetchMockData (bundle) pulls name/sector/beta/yield/geography/instrumentType', pull.name === 'Apple Inc.' && pull.sector === 'Technology' && pull.beta === 1.24 && pull.dividendYield === 0.55 && pull.geography === 'US' && pull.instrumentType === 'Stock'));
  checks.push(ok('★REFRESH BUG: typing costBasis updates rollup ($400→$700) + row gain ($300) in place', /\+\$400/.test(refresh.before) && /\+\$700/.test(refresh.afterGain) && /\+\$300/.test(refresh.rowGain)));
  checks.push(ok('Roth: Cost Basis + Unrealized Gain columns ABSENT (taxable-only)', !/Cost Basis/.test(roth.ths.join(' | ')) && !/Unrealized Gain/.test(roth.ths.join(' | '))));
  checks.push(ok('Roth rollup omits Unrealized Gain (keeps Beta/Yield/Expense)', roth.rollup.indexOf('Unrealized Gain') < 0 && roth.rollup.indexOf('Weighted Beta') >= 0));
  checks.push(ok('SPINE: holdings expReturn 8% -> baselineRate ≈ 1.08 (recenter)', near(spine.withBase, 1.08)));
  checks.push(ok('SPINE: beta=1 spread symmetric around center', spine.withCons < spine.withBase && spine.withUp > spine.withBase));
  checks.push(ok('SPINE: empty holdings -> baselineRate == paradigm average (parity)', near(spine.noBase, spine.avgBaseline)));
  checks.push(ok('isFriction ON -> tx ($100,000) absent from WANT hops', /\$100,000/.test(friction.before) && !/\$100,000/.test(friction.after)));
  checks.push(ok('isFriction ON -> still in investableTotal (Estate value unchanged)', friction.invBefore === friction.invAfter && friction.invAfter >= 180000));
  checks.push(ok('copy: new plain toggle labels present', /Count this account in my plan/.test(taxable.html) && /Keep it, but don’t spend from it|Keep it, but don't spend from it/.test(taxable.html)));
  checks.push(ok('copy: NO jargon (Physics / Liquidity Drag / structural bleed)', !/Physics/.test(taxable.html) && !/Liquidity Drag/.test(taxable.html) && !/structural bleed/.test(taxable.html)));
  checks.push(ok('ERR: zero page errors', errs.length === 0));

  console.log('detail rollup:', JSON.stringify(taxable.rollup), 'ug:', taxable.ugVal, '| pull:', JSON.stringify(pull));
  console.log('spine:', JSON.stringify(spine), '| friction.inv:', friction.invBefore, friction.invAfter);
  if (errs.length) console.log('errs:', errs.slice(0, 5));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
