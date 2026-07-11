/* §21-INPUTS gate — 401(k) "The Treasury/Vault". Closes §21 to 6/6: proves N-BENEFICIARY + N-ALLOCATION
   fire on the blank state and VANISH when sourced (L47), and that F-BENEFICIARY + F-ALLOCATION (bank
   R436/R437) render + persist. Shared _diBlankNudge engine (L48). Excludes rollover (The Conduit = ③).
   Red-first baseline = d225750 (pre-401k-§21): these 2 nudges/inputs don't exist for 401k yet → RED.
   serve :8001, node scripts/_gate_401k_nudge_inputs.js */
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
      // UNSET — a non-cash holding, no beneficiary/targetAllocation
      addInstance('pretax401k');
      const u = window.state.accounts.filter(x => x.baseId === 'pretax401k').pop();
      u.holdings = [JSON.parse(JSON.stringify(stock))]; u.value = 60000; u.showHoldings = true; recalcPortfolio(u); u.value = 60000;
      window.openAccountModal(u.id);
      out.unset = document.getElementById('modal-dynamic-content').innerHTML;
      // SET — beneficiary + targetAllocation sourced
      addInstance('pretax401k');
      const s = window.state.accounts.filter(x => x.baseId === 'pretax401k').pop();
      s.beneficiary = 'Jane Doe'; s.targetAllocation = '80';
      s.holdings = [JSON.parse(JSON.stringify(stock))]; s.value = 60000; s.showHoldings = true; recalcPortfolio(s); s.value = 60000;
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
    ['F-BENEFICIARY input renders (R436)', inU('Name the person (or people) who inherit this account')],
    ['F-ALLOCATION input renders (R437)', inU('Set the target mix you WANT this account to hold')],
    ['N-BENEFICIARY shows (R425)', inU('this account skips probate — one field now saves your family a court later')],
    ['N-ALLOCATION shows (R426)', inU('tell you when your account drifts away from it')],
    ['L47: N-BENEFICIARY vanishes when named', gone('this account skips probate — one field now saves your family a court later')],
    ['L47: N-ALLOCATION vanishes when set', gone('tell you when your account drifts away from it')],
    ['F-BENEFICIARY persists (value in input)', R.set && R.set.indexOf('value="Jane Doe"') !== -1],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== 401(k) §21 NUDGE+INPUTS GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  if (R.err) console.log('  (err: ' + R.err + ')');
  process.exit(pass === total ? 0 : 1);
})();
