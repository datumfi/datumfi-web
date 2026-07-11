/* §21 + §21-INPUTS gate — Taxable "The Living Room". Proves all 7 §21 nudges fire on the blank state
   and VANISH the instant their field is sourced (L47), and that the 3 new inputs (F-BENEFICIARY /
   F-ALLOCATION / F-LOTMETHOD, bank R462–R464) render + persist. Shared _diBlankNudge engine (L48).
   Red-first baseline = 599be88 (pre-§21): none of these nudges/inputs exist yet → RED.
   serve :8001, node scripts/_gate_taxable_nudge_inputs.js */
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
    const out = {};
    const noBasis = { ticker: 'VTI', name: 'Total Mkt', price: 100, shares: 600, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', priceSource: 'manual' };
    const cash = { ticker: 'CASH', name: 'Cash Sweep', price: 1, shares: 40000, assetClass: 'Cash', instrumentType: 'Cash', priceSource: 'manual' };
    const lossLot = { ticker: 'ARKK', name: 'Innovation', price: 60, shares: 1000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', priceSource: 'manual', costBasis: 80000 }; // value 60k < basis 80k → loss
    const gainLot = { ticker: 'VOO', name: 'S&P 500', price: 100, shares: 600, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', priceSource: 'manual', costBasis: 50000, acquisitionDate: '2020-01-01' }; // gain, dated
    try {
      // A · UNSET (no basis, cash-heavy, no acq date, no beneficiary/alloc/lotMethod)
      addInstance('taxable');
      const a = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
      a.holdings = [JSON.parse(JSON.stringify(noBasis)), JSON.parse(JSON.stringify(cash))]; a.value = 100000; a.showHoldings = true; recalcPortfolio(a); a.value = 100000;
      window.openAccountModal(a.id);
      out.unset = document.getElementById('modal-dynamic-content').innerHTML;
      // B · LOSS (a holding underwater, tlhReviewed unset) → N-TLH fires
      addInstance('taxable');
      const lb = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
      lb.holdings = [JSON.parse(JSON.stringify(lossLot))]; lb.value = 60000; lb.showHoldings = true; recalcPortfolio(lb); lb.value = 60000;
      window.openAccountModal(lb.id);
      out.loss = document.getElementById('modal-dynamic-content').innerHTML;
      // C · SET (beneficiary/alloc/lotMethod set, gain+dated holding, no cash, tlhReviewed) → all vanish
      addInstance('taxable');
      const c = window.state.accounts.filter(x => x.baseId === 'taxable').pop();
      c.beneficiary = 'Jane Doe'; c.targetAllocation = '80'; c.lotMethod = 'fifo'; c.tlhReviewed = true;
      c.holdings = [JSON.parse(JSON.stringify(gainLot))]; c.value = 60000; c.showHoldings = true; recalcPortfolio(c); c.value = 60000;
      window.openAccountModal(c.id);
      out.set = document.getElementById('modal-dynamic-content').innerHTML;
      out.ok = true;
    } catch (e) { out.err = String(e); }
    return out;
  });
  await b.close();

  const inU = (t) => R.unset && R.unset.indexOf(t) !== -1;
  const inL = (t) => R.loss && R.loss.indexOf(t) !== -1;
  const gone = (t) => R.set && R.set.indexOf(t) === -1;
  const results = [
    ['harness ran', R.ok === true],
    ['shared .di-nudge engine (L48)', inU('class="di-nudge"')],
    // 3 inputs render (bank R462–R464)
    ['F-BENEFICIARY input renders', inU('Beneficiary (Transfer-on-Death)') && inU('passes straight to them and SKIPS PROBATE')],
    ['F-ALLOCATION input renders', inU('Set the target mix you WANT this account to hold')],
    ['F-LOTMETHOD select renders', inU('FIFO (oldest first)') && inU('Choose how we count which shares you sell first')],
    // 7 nudges show while blank
    ['N-COSTBASIS shows (R448)', inU('what’s taxable when you sell')],
    ['N-CASH-IDLE shows (R452)', inU('tell us if that’s intentional (a buffer)')],
    ['N-LTCG shows (R451)', inU('crossed the 1-year line into lower long-term')],
    ['N-LOTMETHOD shows (R450)', inU('Pick a cost-basis method — FIFO or specific-lot')],
    ['N-ALLOCATION shows (R453)', inU('Set a target mix and we’ll flag when your account drifts')],
    ['N-BENEFICIARY shows (R454)', inU('this account skips probate — one field now saves your family')],
    ['N-TLH shows on a loss (R449)', inL('the tax-loss-harvesting move that turns a paper loss')],
    // L47 — vanish the instant sourced
    ['L47: N-BENEFICIARY vanishes when named', gone('this account skips probate — one field now saves your family')],
    ['L47: N-ALLOCATION vanishes when set', gone('Set a target mix and we’ll flag when your account drifts')],
    ['L47: N-LOTMETHOD vanishes when chosen', gone('Pick a cost-basis method — FIFO or specific-lot')],
    ['L47: N-COSTBASIS vanishes with basis', gone('what’s taxable when you sell')],
    ['L47: N-CASH-IDLE vanishes when cash gone', gone('tell us if that’s intentional (a buffer)')],
    ['L47: N-LTCG vanishes when dated', gone('crossed the 1-year line into lower long-term')],
    ['L47: N-TLH vanishes when reviewed/no-loss', gone('the tax-loss-harvesting move that turns a paper loss')],
    // persistence: the sourced value round-trips into the input
    ['F-BENEFICIARY persists (value in input)', R.set && R.set.indexOf('value="Jane Doe"') !== -1],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== TAXABLE §21 NUDGE+INPUTS GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  if (R.err) console.log('  (err: ' + R.err + ')');
  process.exit(pass === total ? 0 : 1);
})();
