/* ③ — _di401kColTips: 401(k)-aware per-holding column hovers (bank §12 R357–R371, 1a + "why it
   matters" 1b), parity with IRA/457/taxable. Scope = the 12 VALUE columns; Cost Basis/UG/Acq Date
   stay "—" via _diLotColTips (401k N/A copy, §19 canon). [R]/[T] on Beta+Sector. Red-first: the
   generic COLS Ticker tip must be REPLACED. serve :8001, node scripts/_gate_401k_coltips.js */
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
      a.holdings = [mk({ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 900, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' })];
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
    ['Ticker 401k-aware (both)', both('you picked it from your employer’s plan menu')],
    ['generic Ticker tip REPLACED (both)', !has(roth, 'Type it and we auto-fill everything we can source') && !has(pre, 'Type it and we auto-fill everything we can source')],
    ['Name 401k-aware (both)', both('built to be left alone for a long retirement')],
    ['Price 401k-aware (both)', both('what this row is worth to your plan')],
    ['Shares Owned tip applies (both)', both('how much weight this single holding carries in your 401(k)')],
    ['Position Value tip applies (both)', both('steers the whole account’s beta, yield, and fee')],
    ['Yield zero-tax-drag (both)', both('reinvest with ZERO yearly tax drag')],
    ['Exp Ratio revenue-sharing note (both)', both('watch for revenue-sharing funds that quietly pay your plan')],
    ['Geography granular caveat (both)', both('reflects published domicile, not always true exposure')],
    ['Asset Class job-of-holding (both)', both('equity = growth engine, bond = ballast')],
    ['Instrument all-funds (both)', both('A 401(k) menu is typically all funds')],
    ['Beta base copy (both)', both('we never fake a beta')],
    ['Beta [R] roth-only bet clause', has(roth, 'fine home for higher-beta bets') && !has(pre, 'fine home for higher-beta bets')],
    ['Sector base copy (both)', both('quietly stack into ONE theme')],
    ['Sector [R] roth-only bet clause', has(roth, 'a natural Roth bet') && !has(pre, 'a natural Roth bet')],
    ['Cost Basis stays "—" N/A hover (both)', both('Shows "—" in a 401(k). Cost basis is what you paid')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== 401(k) COLTIPS GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  process.exit(pass === total ? 0 : 1);
})();
