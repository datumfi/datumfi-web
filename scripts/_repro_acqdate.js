/* J0.3 reproduction — WHY can't you enter the Acquisition Date? Drive the real modal, inspect the
   live date input: does typing persist? is the native control clipped? Writes UTF-8 dump. */
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

  // build a taxable account with one holding, open modal with holdings shown
  const id = await p.evaluate(() => {
    try { addInstance('taxable'); } catch (e) {}
    const a = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
    a.holdings = [{ ticker: 'AAPL', name: 'Apple', price: 100, shares: 10, assetClass: 'Stocks',
      geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Stock',
      costBasis: '500', acquisitionDate: '', priceSource: 'manual' }];
    a.showHoldings = true;
    recalcPortfolio(a);
    window.openAccountModal(a.id);
    return a.id;
  });

  const out = { id };
  // locate the date input in the rendered modal
  const dateSel = 'input[type="date"].holding-input';
  out.dateInputExists = await p.locator(dateSel).count();

  if (out.dateInputExists) {
    // geometry: is the native control clipped? intrinsic date control needs ~120px+ usable
    out.geom = await p.locator(dateSel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const td = el.closest('td');
      const tr = td ? td.getBoundingClientRect() : null;
      return { inputW: Math.round(r.width), inputH: Math.round(r.height),
        clientW: el.clientWidth, scrollW: el.scrollWidth,
        tdW: td ? Math.round(td.getBoundingClientRect().width) : null,
        clippedByCell: td ? (r.right > (tr.right + 1)) : null,
        cssMinWidth: getComputedStyle(el).minWidth, cssWidth: getComputedStyle(el).width,
        visible: r.width > 0 && r.height > 0 };
    });

    // does a typed date persist through the app's real onchange path?
    await p.locator(dateSel).first().fill('2022-03-15');
    await p.locator(dateSel).first().dispatchEvent('change');
    await p.waitForTimeout(150);
    out.persistedValue = await p.evaluate((accId) => {
      const a = window.state.accounts.find(x => x.id === accId);
      return a && a.holdings[0] ? a.holdings[0].acquisitionDate : '__no_acc__';
    }, id);

    // re-render (reopen) and check the value survives
    out.reopenValue = await p.evaluate((accId) => {
      window.openAccountModal(accId);
      const el = document.querySelector('input[type="date"].holding-input');
      return el ? el.value : '__no_input__';
    }, id);
  }

  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_repro_acqdate.out.txt', JSON.stringify(out, null, 2), 'utf8');
  console.log('WROTE scripts/.gate-out/_repro_acqdate.out.txt');
  await b.close();
})();
