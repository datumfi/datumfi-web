/* Tooltip-key correctness fix: _diIraColTips/_di457ColTips/_diTaxColTips keyed Shares/Value by the OLD
   COLS labels; the live columns are now 'Shares Owned' / 'Position Value' (U2 relabel), so those two
   tooltips silently fell back to generic in IRA/457/taxable. Assert the room-specific ColTip now applies
   to those two columns. Red-first: RED pre-rename (generic), GREEN after. serve :8001, node this. */
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

  const open = async (id) => await p.evaluate((bid) => {
    try { addInstance(bid); } catch (e) {}
    const a = window.state.accounts.filter(x => x.baseId === bid).pop();
    a.holdings = [{ ticker: 'VTI', name: 'Total', price: 100, shares: 100, assetClass: 'Stocks',
      geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', costBasis: '8000', priceSource: 'manual' }];
    a.value = 10000; a.showHoldings = true; recalcPortfolio(a);
    window.openAccountModal(a.id);
    return document.getElementById('modal-dynamic-content').innerHTML;
  }, id);

  const ira = await open('tradira');
  const i457 = await open('pretax457b');
  const tax = await open('taxable');
  const has = (s, t) => s.indexOf(t) !== -1;
  const results = [
    ['IRA Shares Owned tip applies (room-specific)', has(ira, 'how much weight this single holding carries in your IRA')],
    ['IRA Position Value tip applies', has(ira, 'Every one of the 4 boxes above is VALUE-WEIGHTED')],
    ['457 Shares Owned tip applies', has(i457, 'carries in your 457(b)')],
    ['457 Position Value tip applies', has(i457, 'All 4 boxes above are VALUE-WEIGHTED')],
    ['Taxable Shares Owned tip applies', has(tax, 'how much weight this single holding carries in your account')],
    ['Taxable Position Value tip applies', has(tax, 'Every one of the 4 boxes above is VALUE-WEIGHTED')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== COLTIP-KEYS GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  process.exit(pass === total ? 0 : 1);
})();
