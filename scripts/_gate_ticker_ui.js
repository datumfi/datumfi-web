/* JOB 0 — universal ticker-bar/holdings-input fixes. Shared COLS render, so smoked in TWO rooms
   (a bank room: pretax401k "The Vault", and taxable "The Living Room") to prove universality.
   Asserts: J0.1 Price widened + "$" display affix; J0.2 Shares Owned widened; J0.3 Acquisition Date
   accepts + persists + re-renders REAL keyboard entry. Red-first: fails on HEAD, green after wire.
   Usage: serve repo root on :8001, then node scripts/_gate_ticker_ui.js [LABEL]. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const ACQ_SEL = 'input[onchange*="acquisitionDate"], input[oninput*="acquisitionDate"]';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  // Render a room with one rich holding; return header widths + the Price cell + the Acq input HTML.
  async function inspect(baseId) {
    return await p.evaluate((bid) => {
      try { addInstance(bid); } catch (e) {}
      const a = window.state.accounts.filter(x => x.baseId === bid).pop();
      a.holdings = [{ ticker: 'AAPL', name: 'Apple', price: 16.73, shares: 1234.5678, assetClass: 'Stocks',
        geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Stock',
        costBasis: '500', acquisitionDate: '', priceSource: 'manual' }];
      a.showHoldings = true; recalcPortfolio(a); window.openAccountModal(a.id);
      const tbl = document.querySelector('.holdings-table');
      const ths = Array.prototype.slice.call(tbl.querySelectorAll('th'));
      // clean label = text BEFORE the tooltip div (th text alone concatenates the whole hover body)
      const lbl = (th) => { const w = th.querySelector('.modal-tt-wrap'); return (w && w.childNodes[0] ? w.childNodes[0].textContent : th.textContent).trim(); };
      const labels = ths.map(lbl);
      const widths = {}; ths.forEach(th => { widths[lbl(th)] = parseInt(th.style.width) || Math.round(th.getBoundingClientRect().width); });
      const pIdx = labels.indexOf('Price');
      const row0 = tbl.querySelectorAll('tr')[1];
      const cells = row0 ? Array.prototype.slice.call(row0.querySelectorAll('td')) : [];
      const priceCell = cells[pIdx] ? cells[pIdx].innerHTML : '';
      // "$" adornment = a $ that is a sibling of the price input (not inside its value), i.e. a <span>$</span>
      const priceSpan = (cells[pIdx] && cells[pIdx].querySelector('span')) ? cells[pIdx].querySelector('span').textContent : '';
      const pInput = cells[pIdx] ? cells[pIdx].querySelector('input') : null;
      const priceInputW = pInput ? Math.round(pInput.getBoundingClientRect().width) : 0;
      const acqEl = document.querySelector('input[onchange*="acquisitionDate"], input[oninput*="acquisitionDate"]');
      return { id: a.id, labels, widths, priceCell, priceDollar: /\$/.test(priceSpan),
        acqType: acqEl ? acqEl.getAttribute('type') : '__none__', acqExists: !!acqEl,
        acqMax: acqEl ? (acqEl.getAttribute('max') || '') : '', acqMin: acqEl ? (acqEl.getAttribute('min') || '') : '',
        acqMinWidth: acqEl ? parseInt(getComputedStyle(acqEl).minWidth) || 0 : 0,
        acqColW: widths['Acquisition Date'] || 0, priceInputW: priceInputW };
    }, baseId);
  }

  const vault = await inspect('pretax401k');
  const tax = await inspect('taxable');

  // J0.3 — pick a valid date (native calendar path: fill sets a valid value -> onchange commits).
  const today = new Date().toISOString().slice(0, 10);
  let acqPersist = '', acqReopen = '';
  try {
    await p.locator(ACQ_SEL).first().fill('2021-06-15');
    await p.locator(ACQ_SEL).first().dispatchEvent('change');
    await p.waitForTimeout(120);
    acqPersist = await p.evaluate((accId) => {
      const a = window.state.accounts.find(x => x.id === accId);
      return a && a.holdings[0] ? (a.holdings[0].acquisitionDate || '') : '__none__';
    }, tax.id);
    acqReopen = await p.evaluate((accId) => {
      window.openAccountModal(accId);
      const el = document.querySelector('input[onchange*="acquisitionDate"], input[oninput*="acquisitionDate"]');
      return el ? el.value : '__none__';
    }, tax.id);
  } catch (e) { acqPersist = 'ERR:' + String(e).split('\n')[0]; }

  const results = [
    // J0.1 Price — widened + "$" affix, both rooms (universality)
    ['[taxable] Price column widened (>=110)', (tax.widths['Price'] || 0) >= 110],
    ['[taxable] Price cell renders "$" adornment', tax.priceDollar === true],
    ['[taxable] Price INPUT wide enough for ~6 digits (>=70px)', tax.priceInputW >= 70],
    ['[Vault]   Price INPUT wide enough for ~6 digits (>=70px)', vault.priceInputW >= 70],
    ['[Vault]   Price column widened (>=110)', (vault.widths['Price'] || 0) >= 110],
    ['[Vault]   Price cell renders "$" adornment', vault.priceDollar === true],
    // J0.2 Shares Owned — widened, both rooms
    ['[taxable] Shares Owned widened (>=110)', (tax.widths['Shares Owned'] || 0) >= 110],
    ['[Vault]   Shares Owned widened (>=110)', (vault.widths['Shares Owned'] || 0) >= 110],
    // J0.3 Acquisition Date — native calendar picker, blocks future/nonsense, control not clipped
    ['[taxable] Acq Date is a native calendar picker (type=date)', tax.acqType === 'date'],
    ['[taxable] Acq Date blocks FUTURE dates (max=today)', tax.acqMax === today],
    ['[taxable] Acq Date blocks nonsense old (min set)', /^\d{4}-\d{2}-\d{2}$/.test(tax.acqMin)],
    ['[taxable] Acq Date control not clipped (min-width>=140)', tax.acqMinWidth >= 140],
    ['[taxable] Acq Date column widened (>=150)', tax.acqColW >= 150],
    ['[taxable] picked Acq Date PERSISTS to state', acqPersist === '2021-06-15'],
    ['[taxable] picked Acq Date re-renders on reopen', acqReopen === '2021-06-15'],
  ];

  const pass = results.filter(r => r[1]).length;
  const total = results.length;
  let dump = 'GATE ticker_ui [' + LABEL + '] — ' + pass + '/' + total + (pass === total ? '  OVERALL: GREEN' : '  OVERALL: RED') + '\n\n';
  results.forEach(r => { dump += (r[1] ? '  PASS  ' : '  FAIL  ') + r[0] + '\n'; });
  dump += '\n--- evidence ---\n';
  dump += 'priceInputW: taxable=' + tax.priceInputW + ' vault=' + vault.priceInputW + ' (rendered px)\n';
  dump += 'taxable widths: Price=' + tax.widths['Price'] + ' Shares Owned=' + tax.widths['Shares Owned'] + '\n';
  dump += 'vault   widths: Price=' + vault.widths['Price'] + ' Shares Owned=' + vault.widths['Shares Owned'] + '\n';
  dump += 'acq: type=' + tax.acqType + ' max=' + tax.acqMax + ' min=' + tax.acqMin + ' minWidth=' + tax.acqMinWidth + ' colW=' + tax.acqColW + '\n';
  dump += 'acqPersist=' + acqPersist + '  acqReopen=' + acqReopen + '\n';
  dump += 'taxable priceCell=' + tax.priceCell.replace(/\n/g, ' ').slice(0, 240) + '\n';
  fs.writeFileSync('scripts/_gate_ticker_ui.out.txt', dump, 'utf8');
  console.log('WROTE scripts/_gate_ticker_ui.out.txt — ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
