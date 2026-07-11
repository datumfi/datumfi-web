/* §21-INPUTS gate — Rollover 401(k) "The Conduit". Closes §21 to 6/6: proves N-BENEFICIARY fires on
   the blank state and VANISHES when sourced (L47), and that F-BENEFICIARY (bank R240) renders + persists.
   F-BENEFICIARY ONLY — this room has NO N-ALLOCATION (Captain-ruled). Shared _diBlankNudge engine (L48).
   Red-first baseline = 0acab7f (pre-Conduit-§21): the beneficiary field/nudge don't exist here yet → RED.
   serve :8001, node scripts/_gate_rollover401k_nudge_inputs.js */
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
    const stock = { ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 600, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund', priceSource: 'manual' };
    try {
      addInstance('rollover401k');
      const u = window.state.accounts.filter(x => x.baseId === 'rollover401k').pop();
      u.holdings = [JSON.parse(JSON.stringify(stock))]; u.value = 80000; u.showHoldings = true; recalcPortfolio(u); u.value = 80000;
      window.openAccountModal(u.id);
      out.unset = document.getElementById('modal-dynamic-content').innerHTML;
      addInstance('rollover401k');
      const s = window.state.accounts.filter(x => x.baseId === 'rollover401k').pop();
      s.beneficiary = 'Jane Doe';
      s.holdings = [JSON.parse(JSON.stringify(stock))]; s.value = 80000; s.showHoldings = true; recalcPortfolio(s); s.value = 80000;
      window.openAccountModal(s.id);
      out.set = document.getElementById('modal-dynamic-content').innerHTML;
      out.ok = true;
    } catch (e) { out.err = String(e); }
    return out;
  });
  await b.close();

  const inU = (t) => R.unset && R.unset.indexOf(t) !== -1;
  const gone = (t) => R.set && R.set.indexOf(t) === -1;
  const results = [
    ['harness ran', R.ok === true],
    ['shared .di-nudge engine (L48)', inU('class="di-nudge"')],
    ['F-BENEFICIARY input renders (R240)', inU('Name who inherits this rolled-over money')],
    ['N-BENEFICIARY shows (R232)', inU('this rolled-over money skips probate — one field now saves your family a court later')],
    ['NO N-ALLOCATION sub-form in this room', !inU('tell you when your account drifts away from it') && !inU('Set the target mix you WANT this account to hold')],
    ['L47: N-BENEFICIARY vanishes when named', gone('this rolled-over money skips probate — one field now saves your family a court later')],
    ['F-BENEFICIARY persists (value in input)', R.set && R.set.indexOf('value="Jane Doe"') !== -1],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== ROLLOVER 401(k) §21 NUDGE+INPUTS GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  if (R.err) console.log('  (err: ' + R.err + ')');
  process.exit(pass === total ? 0 : 1);
})();
