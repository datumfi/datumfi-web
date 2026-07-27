/* J0.3 reproduction #2 — mimic REAL typing (keyboard into native date segments) + click actionability,
   at the CURRENT width. Does keyboard entry persist? Is the control click-interceptable? */
const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const id = await p.evaluate(() => {
    try { addInstance('taxable'); } catch (e) {}
    const a = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
    a.holdings = [{ ticker: 'AAPL', name: 'Apple', price: 100, shares: 10, assetClass: 'Stocks',
      geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Stock',
      costBasis: '500', acquisitionDate: '', priceSource: 'manual' }];
    a.showHoldings = true; recalcPortfolio(a); window.openAccountModal(a.id);
    return a.id;
  });

  const out = { id };
  const dateSel = 'input[type="date"].holding-input';

  // 1) can we even CLICK it (actionability — is it covered/intercepted?)
  try { await p.locator(dateSel).first().click({ timeout: 3000 }); out.clickOK = true; }
  catch (e) { out.clickOK = false; out.clickErr = String(e).split('\n')[0]; }

  // 2) type like a human into the native date segments (mm dd yyyy)
  try {
    await p.locator(dateSel).first().focus();
    await p.keyboard.type('03152022', { delay: 20 });
    await p.waitForTimeout(150);
  } catch (e) { out.typeErr = String(e).split('\n')[0]; }

  out.afterKeyboardType = await p.evaluate((accId) => {
    const a = window.state.accounts.find(x => x.id === accId);
    const el = document.querySelector('input[type="date"].holding-input');
    return { state: a && a.holdings[0] ? a.holdings[0].acquisitionDate : '__none__',
             domValue: el ? el.value : '__noel__' };
  }, id);

  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_repro_acqdate2.out.txt', JSON.stringify(out, null, 2), 'utf8');
  console.log('WROTE scripts/.gate-out/_repro_acqdate2.out.txt');
  await b.close();
})();
