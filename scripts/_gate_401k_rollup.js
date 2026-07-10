/* ④ §19 rollup reconcile — Group A install (5 enrichments) + Group B blend-append (Equity/Balance/UG),
   keep-live (Bond/Contribution). Guards prove NO THINNING: each blended field keeps its [R]/[T] original
   AND gains the §19 clause. Red-first. serve :8001, node scripts/_gate_401k_rollup.js */
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
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    const open = (id) => {
      try { addInstance(id); } catch (e) {}
      const a = window.state.accounts.filter(x => x.baseId === id).pop();
      a.holdings = [mk({ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 900, costBasis: 50000, beta: 1.0, dividendYield: 1.5, expRatio: 0.3, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' })];
      a.value = 90000; a.showHoldings = true; recalcPortfolio(a); a.value = 90000;
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    return { roth: open('roth401k'), pre: open('pretax401k') };
  });
  await b.close();
  const has = (s, t) => s.indexOf(t) !== -1;
  const { roth, pre } = R;
  const both = (t) => has(roth, t) && has(pre, t);
  const results = [
    // Group A — §19 installed (both rooms)
    ['A Cash % §19', both('gives up the tax-deferred growth that is the whole point')],
    ['A International §19 (FTC lost)', both('Foreign Tax Credit that rewards foreign holdings')],
    ['A Weighted Beta §19', both('long time-horizon and tax shelter often justify carrying a higher beta')],
    ['A Blended Yield §19', both('pure compounding fuel, not a tax event')],
    ['A Avg Expense §19', both('strongest argument for rolling an old 401(k) into an IRA')],
    // Group B — blend-append: §19 clause present
    ['B Equity append', both('the tax-efficiency worry that shapes a taxable account simply doesn’t apply here')],
    ['B Balance append (59½ gate)', both('this sits behind the 59½ gate')],
    ['B UG append (informational only)', both('Inside a 401(k) this is informational only')],
    // Group B — NO THINNING: [R]/[T] originals still intact
    ['B Equity [R] intact', has(roth, 'best account to hold your highest-expected-return assets')],
    ['B Equity [T] intact', has(pre, 'Uncle Sam eventually shares the upside')],
    ['B Balance [R] intact', has(roth, 'tax-FREE money in waiting')],
    ['B Balance [T] intact (C292)', has(pre, 'A dollar in your pre-tax 401(k) is worth less')],
    ['B UG B375 intact', both('added up across every holding where you')],
    // Group B keep-live (unchanged)
    ['Bond keep-live [T]', has(pre, 'the RIGHT home for bonds')],
    ['Contribution keep-live [T]', has(pre, 'retirement tax rate will be LOWER')],
    // already-wired guard
    ['Account Value R384 (already live)', both('the number that compounds')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== 401(k) §19 ROLLUP GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  process.exit(pass === total ? 0 : 1);
})();
