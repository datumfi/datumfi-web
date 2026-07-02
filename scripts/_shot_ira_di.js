// Eyes-on smoke: §11 fixture through both IRA rooms, screenshot each modal.
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
  await p.goto('http://127.0.0.1:8001/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);
  for (const baseId of ['tradira', 'rothira']) {
    await p.evaluate((baseId) => {
      const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
        assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
        instrumentType: '', priceSource: 'manual' }, o);
      try { addInstance(baseId); } catch (e) {}
      const a = window.state.accounts.find(x => x.baseId === baseId);
      a.holdings = [
        mk({ ticker: 'VOO', name: 'Vanguard S&P 500', price: 100, shares: 220, beta: 1.0, expRatio: 0.03, dividendYield: 1.3, costBasis: 18000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
        mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 100, shares: 160, beta: 1.0, expRatio: 0.03, dividendYield: 1.3, costBasis: 12000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' }),
        mk({ ticker: 'VXUS', name: 'Vanguard Intl', price: 100, shares: 150, beta: 1.0, expRatio: 0.07, dividendYield: 2.9, costBasis: 14000, assetClass: 'Stocks', geography: 'International', sector: 'Total Market (minus US)', instrumentType: 'ETF' }),
        mk({ ticker: 'VEA', name: 'Vanguard Developed', price: 100, shares: 100, beta: 1.0, expRatio: 0.05, dividendYield: 3.0, costBasis: 9000, assetClass: 'Stocks', geography: 'International', sector: 'Developled Markets', instrumentType: 'ETF' }),
        mk({ ticker: 'SMH', name: 'VanEck Semiconductor', price: 100, shares: 100, beta: 1.1, expRatio: 0.35, dividendYield: 0.5, costBasis: 6000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'ETF' }),
        mk({ ticker: 'XSD', name: 'SPDR Semiconductor', price: 100, shares: 70, beta: 1.1, expRatio: 0.35, dividendYield: 0.3, costBasis: 5000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'ETF' }),
        mk({ ticker: 'BND', name: 'Vanguard Total Bond', price: 100, shares: 120, beta: 0.5, expRatio: 0.03, dividendYield: 4.1, costBasis: 12500, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' }),
        mk({ ticker: 'AGG', name: 'iShares Core Bond', price: 100, shares: 80, beta: 0.5, expRatio: 0.03, dividendYield: 4.0, costBasis: 8300, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' })
      ];
      a.inflow = 5000; a.freq = 1; a.catchUp50 = true;
      recalcPortfolio(a);
      a.showHoldings = true;
      window.openAccountModal(a.id);
    }, baseId);
    await p.waitForTimeout(500);
    const card = await p.$('#modal-card');
    await card.screenshot({ path: `${OUT}/ira_${baseId}.png` });
    const narr = await p.$('.di-narrative');
    if (narr) { await narr.scrollIntoViewIfNeeded(); await narr.screenshot({ path: `${OUT}/ira_${baseId}_narr.png` }); }
    await p.evaluate(() => window.closeAccountModal());
  }
  await b.close();
  console.log('shots done');
})().catch(e => { console.error('SHOT ERROR:', e.message); process.exit(2); });
