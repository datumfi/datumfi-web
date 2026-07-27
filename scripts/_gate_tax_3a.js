/* §3a Composition Archetype + §4b Composition gate (Taxable "Living Room"). Drives 4 fixtures through
   the real openAccountModal path and asserts the authored markers emit live. Usage: serve repo root on
   :8001, then node scripts/_gate_tax_3a.js [LABEL]. Writes a UTF-8 dump; never prints unicode to console. */
const { chromium } = require('playwright');
const fs = require('fs');
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
    const open = (holdings) => {
      try { addInstance('taxable'); } catch (e) {}
      const a = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
      a.holdings = holdings; a.showHoldings = true;
      recalcPortfolio(a);
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    const out = {};
    // 1 · AR-CRYPTO-MULTI — BTC + ETH + index (cryptoPct 45%, 2 coins)
    out.multi = open([
      mk({ ticker: 'BTC', name: 'Bitcoin', price: 100, shares: 300, assetClass: 'Crypto', sector: 'Bitcoin', instrumentType: 'Crypto' }),
      mk({ ticker: 'ETH', name: 'Ethereum', price: 100, shares: 150, assetClass: 'Crypto', sector: 'Etherium', instrumentType: 'Crypto' }),
      mk({ ticker: 'VTI', name: 'Total Market', price: 100, shares: 550, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
    ]);
    // 2 · AR-INCOME-YIELD — bonds + REIT (bd 45% + reit 20%)
    out.income = open([
      mk({ ticker: 'TLT', name: 'Treasuries', price: 100, shares: 250, assetClass: 'Bond', sector: 'Long Term Treasuries', instrumentType: 'ETF' }),
      mk({ ticker: 'VCIT', name: 'Corporate', price: 100, shares: 200, assetClass: 'Bond', sector: 'Corporate Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'REIT', price: 100, shares: 200, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Dividend', price: 100, shares: 350, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
    ]);
    // 3 · §4b B-COMPOSITION — 9 diversified sleeves, no archetype
    out.comp = open([
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 300, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 200, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'BND', name: 'Bonds', price: 100, shares: 100, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Div', price: 100, shares: 80, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'REIT', price: 100, shares: 80, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SOXX', name: 'Semis', price: 100, shares: 70, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'ETF' }),
      mk({ ticker: 'VB', name: 'Small', price: 100, shares: 60, assetClass: 'Stocks', sector: 'Small Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'XLE', name: 'Energy', price: 100, shares: 60, assetClass: 'Stocks', sector: 'Energy', instrumentType: 'ETF' }),
      mk({ ticker: 'GLD', name: 'Gold', price: 100, shares: 50, assetClass: 'Commodity', sector: 'Gold', instrumentType: 'ETF' }),
    ]);
    // 4 · AR-NONE fallthrough — plain VOO 100% -> §3 Spine INDEX fires, no archetype
    out.none = open([
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 1000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF' }),
    ]);
    // 5 · §18b sector clause — 45% tech (no archetype since <50), replaces raw "in Technology" echo
    out.sector = open([
      mk({ ticker: 'SOXX', name: 'Semis', price: 100, shares: 450, assetClass: 'Stocks', sector: 'Semiconductors', geography: 'US Stocks - Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 550, assetClass: 'Stocks', sector: 'Large Cap', geography: 'US Stocks - Large Blend', instrumentType: 'ETF' }),
    ]);
    // 6 · §18a geo prefix (foreign-dominant global, 60% intl) -> "It leans meaningfully international — it’s globally diversified"
    out.geo = open([
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 600, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'US', price: 100, shares: 400, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
    ]);
    // 7 · T3 retune — 22% foreign now fires B-GLOBAL-TILT (was silent <30%)
    out.retune = open([
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 220, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'US', price: 100, shares: 780, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
    ]);
    // 8 · B-HOME-HEAVY with geo prefix (all-US, 3 holdings, no fund-dominant)
    out.home = open([
      mk({ ticker: 'VOO', name: 'S&P', price: 100, shares: 400, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'US', price: 100, shares: 350, assetClass: 'Stocks', geography: 'US Stocks', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'VUG', name: 'Growth', price: 100, shares: 250, assetClass: 'Stocks', geography: 'US Stocks - Growth', sector: 'Large Growth', instrumentType: 'ETF' }),
    ]);
    // 9 · §18b single-industry theme (45% Insurance) -> "a single named industry"
    out.singleind = open([
      mk({ ticker: 'ALL', name: 'Insurer', price: 100, shares: 450, assetClass: 'Stocks', sector: 'Insurance', geography: 'US Stocks - Large Blend', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'US', price: 100, shares: 550, assetClass: 'Stocks', sector: 'Large Cap', geography: 'US Stocks - Large Blend', instrumentType: 'ETF' }),
    ]);
    // 10 · reworded R84 all-foreign (>=90% non-US)
    out.allforeign = open([
      mk({ ticker: 'VWO', name: 'EM', price: 100, shares: 600, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'VEA', name: 'Dev', price: 100, shares: 400, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
    ]);
    return out;
  });
  await b.close();

  const has = (s, m) => s.indexOf(m) >= 0;
  const checks = [
    ['AR-CRYPTO-MULTI fires', has(R.multi, 'multi-coin crypto sleeve')],
    ['AR-CRYPTO-MULTI shows %', has(R.multi, '45% of the account')],
    ['AR-INCOME-YIELD fires', has(R.income, 'yield-tilted income sleeve')],
    ['AR-INCOME-YIELD pairs REIT', has(R.income, 'real-estate REITs')],
    ['§4b Composition fires', has(R.comp, 'what’s actually under the hood, biggest first')],
    ['§4b names US large-cap core', has(R.comp, 'US large-cap core')],
    ['§4b names international', has(R.comp, 'international')],
    ['AR-NONE -> spine (no archetype)', has(R.none, 'diversified equity engine') && !has(R.none, 'crypto sleeve') && !has(R.none, 'under the hood, biggest first')],
    ['junk-safe: no undefined/NaN in comp', !has(R.comp, 'undefined') && !has(R.comp, 'NaN')],
    ['§18b sector clause fires', has(R.sector, 'with a tilt toward technology and the chips/software behind it')],
    ['§18b raw echo GONE (no "in Technology")', !has(R.sector, ' in Technology')],
    ['§18a geo prefix fires', has(R.geo, 'It leans meaningfully international — it’s globally diversified')],
    ['T3 retune: 22% foreign fires global-tilt', has(R.retune, 'globally diversified, with about 22% outside')],
    ['B-HOME-HEAVY + geo prefix', has(R.home, 'It leans heavily toward US large-company stocks — it’s all-US')],
    ['crypto suppression: no Crypto sector-bet in MULTI', !has(R.multi, 'tilt toward the largest digital assets') && !has(R.multi, ' in Crypto')],
    ['§15 toggle-1 label', has(R.comp, 'Include this account in my plan')],
    ['§15 toggle-1 body', has(R.comp, 'helps form your Shape, and your plan can spend from it')],
    ['§15 toggle-2 body', has(R.comp, 'It strengthens the picture without ever being drawn down')],
    ['col Ticker tip (Taxable-aware)', has(R.comp, 'you picked every one of these off the open market')],
    ['col Beta tip taxable-correct (no Roth)', has(R.comp, 'a bigger capital-gains bill when you sell it') && !has(R.comp, 'The Roth is the right home')],
    ['col Yield tip taxable-correct (taxed yearly)', has(R.comp, 'this income is taxed the year you receive it') && !has(R.comp, 'reinvests untaxed')],
    ['§18b single-industry theme fires', has(R.singleind, 'with a tilt toward a single named industry')],
    ['R84 reworded all-foreign (no "entirely international")', has(R.allforeign, 'in fact almost all of it sits outside the US') && !has(R.allforeign, 'almost entirely international')],
  ];
  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') + '\n\n=== MULTI ===\n' +
    R.multi.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 900) + '\n\n=== INCOME ===\n' +
    R.income.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 900) + '\n\n=== COMP ===\n' +
    R.comp.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1100) + '\n\n=== NONE ===\n' +
    R.none.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700) + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_tax_3a.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
