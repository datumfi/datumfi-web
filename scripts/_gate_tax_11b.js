/* §11b Cost-Basis estimator gate. Drives the real "Finding your cost basis" panel: per-class reverse-
   growth math on equity/bond/cash rows, est. tag, §203 DI caveat, Opt5 gating, not-computable guard,
   Acquisition Date column. Usage: serve repo root on :8001, then node scripts/_gate_tax_11b.js [LABEL]. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('dialog', d => d.accept());   // auto-accept the overwrite confirm
  await p.goto('http://127.0.0.1:8001/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', acquisitionDate: '', priceSource: 'manual' }, o);
    try { addInstance('taxable'); } catch (e) {}
    const a = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
    a.holdings = [
      mk({ ticker: 'VTI', price: 100, shares: 100, assetClass: 'Stocks', sector: 'Large Cap', instrumentType: 'ETF', acquisitionDate: '2019-06-01' }), // equity, val 10000, has acq
      mk({ ticker: 'BND', price: 100, shares: 100, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF' }),                        // bond, val 10000, no acq
      mk({ ticker: 'CASH', price: 1, shares: 10000, assetClass: 'Cash', instrumentType: 'Cash' }),                                                     // cash, val 10000
      mk({ ticker: 'XYZ', price: 100, shares: 50, instrumentType: 'ETF' }),                                                                            // no asset class -> not computable
    ];
    a.showHoldings = true; recalcPortfolio(a); window.openAccountModal(a.id);
    const html0 = document.getElementById('modal-dynamic-content').innerHTML;

    const est = (i, selVal) => {
      window.openCBEstimator(a.id, i);
      const sel = document.getElementById('cb-est-years');
      const opened = document.getElementById('cb-est-overlay').style.display === 'flex';
      let opt5 = false, val = null;
      if (sel) {
        opt5 = !!Array.from(sel.options).find(o => o.value === 'acq');
        sel.value = selVal; window.cbEstRefresh(); window.applyCBEstimate();
        val = window.state.accounts.filter(x => x.baseId === 'taxable').pop().holdings[i].costBasis;
      }
      window.closeCBEstimator && window.closeCBEstimator();
      return { opened, opt5, val, hadSelect: !!sel };
    };
    const eq = est(0, '3');    // equity, 3 yrs @7%
    const bd = est(1, '3');    // bond, 3 yrs @3%
    const cash = est(2, '0');  // cash, 0 yrs @0%
    // not-computable: row 3 has no asset class -> panel opens but shows the guard, no #cb-est-years
    window.openCBEstimator(a.id, 3);
    const guardOpened = document.getElementById('cb-est-overlay').style.display === 'flex';
    const guardNoSelect = !document.getElementById('cb-est-years');
    window.closeCBEstimator();

    const acc = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
    window.openAccountModal(acc.id);
    const html1 = document.getElementById('modal-dynamic-content').innerHTML;
    return { eq, bd, cash, guardOpened, guardNoSelect, html0, html1,
      estFlag: acc.holdings[0].costBasisEst === true };
  });
  await b.close();

  const near = (a, b2) => Math.abs(Number(a) - b2) <= 1;
  const has = (s, m) => s.indexOf(m) >= 0;
  const checks = [
    ['Cost Basis "≈" estimator button renders', has(R.html0, 'openCBEstimator(')],
    ['Acquisition Date column renders (taxable)', has(R.html0, 'acquisitionDate')],
    ['panel opens ("Finding your cost basis")', R.eq.opened],
    ['equity 7%/3yr math (10000/1.07^3 ≈ 8163)', near(R.eq.val, Math.round(10000 / Math.pow(1.07, 3)))],
    ['bond 3%/3yr math (10000/1.03^3 ≈ 9151)', near(R.bd.val, Math.round(10000 / Math.pow(1.03, 3)))],
    ['cash 0%/0yr math (= value 10000)', near(R.cash.val, 10000)],
    ['est. tag renders after apply', has(R.html1, '>est.<')],
    ['§203 caveat in DI', has(R.html1, 'leans on an estimated cost basis')],
    ['Opt5 offered ONLY when acquisitionDate present', R.eq.opt5 === true && R.bd.opt5 === false],
    ['not-computable guard (no asset class -> no dropdown)', R.guardOpened && R.guardNoSelect],
    ['est flag set on holding', R.estFlag],
    ['cost-basis input shows currency ($)', /value="\$[\d,]+"/.test(R.html1)],
  ];
  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  fs.writeFileSync('scripts/_gate_tax_11b.out.txt',
    `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    `\n\nvals: eq=${R.eq.val} bd=${R.bd.val} cash=${R.cash.val}\n`, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
