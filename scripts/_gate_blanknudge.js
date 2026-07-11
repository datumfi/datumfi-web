/* §21 SOURCE-OR-BLANK NUDGES gate — the shared _diBlankNudge engine + per-room copy, wired for
   The Conduit (Rollover 401k, bank R227-232) and the 401(k) room (bank R422-427). L47 proof: a
   nudge renders ONLY while its field is unset and VANISHES the instant the field is sourced.
   Red-first baseline = e08d287 (A3): the helper + nudge copy don't exist yet → RED.
   serve :8001, node scripts/_gate_blanknudge.js */
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
    const stock = (basis) => ({ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 600, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund', priceSource: 'manual', costBasis: basis });
    const cash = { ticker: 'CASH', name: 'Cash Sweep', price: 1, shares: 40000, assetClass: 'Cash', instrumentType: 'Cash', priceSource: 'manual' };
    try {
      // Conduit — all fields UNSET, cash-heavy, no basis
      addInstance('rollover401k');
      const c = window.state.accounts.filter(x => x.baseId === 'rollover401k').pop();
      c.holdings = [stock(undefined), cash]; c.value = 100000; c.showHoldings = true; recalcPortfolio(c); c.value = 100000;
      window.openAccountModal(c.id);
      out.cUnset = document.getElementById('modal-dynamic-content').innerHTML;
      // Conduit — SOURCED: priorPlan + link + rule55 set, basis entered, cash removed
      addInstance('pretax401k');
      const dest = window.state.accounts.filter(x => x.baseId === 'pretax401k').pop(); dest.value = 50000;
      c.priorPlan = '401(k)'; c.linkedToAccount = dest.id; c.rule55Eligible = true;
      c.holdings = [stock(50000)]; recalcPortfolio(c); c.value = 60000;
      window.openAccountModal(c.id);
      out.cSourced = document.getElementById('modal-dynamic-content').innerHTML;
      // 401(k) Vault — UNSET: cash-heavy, no basis, no inflow, no match
      addInstance('pretax401k');
      const k = window.state.accounts.filter(x => x.baseId === 'pretax401k').pop();
      k.holdings = [stock(undefined), cash]; k.value = 100000; k.inflow = 0; k.showHoldings = true; recalcPortfolio(k); k.value = 100000;
      window.openAccountModal(k.id);
      out.kUnset = document.getElementById('modal-dynamic-content').innerHTML;
      out.ok = true;
    } catch (e) { out.err = String(e); }
    return out;
  });
  await b.close();

  const inC = (t) => R.cUnset && R.cUnset.indexOf(t) !== -1;
  const gone = (t) => R.cSourced && R.cSourced.indexOf(t) === -1;
  const inK = (t) => R.kUnset && R.kUnset.indexOf(t) !== -1;
  const results = [
    ['harness ran', R.ok === true],
    ['ONE shared engine: both rooms use .di-nudge (L48)', (R.cUnset || '').indexOf('class="di-nudge"') !== -1 && (R.kUnset || '').indexOf('class="di-nudge"') !== -1],
    // Conduit nudges show while unset (R227/R229/R228/R230/R231)
    ['Conduit N-CASH-IDLE ★ shows (R227)', inC('still sitting in cash — tell us if that')],
    ['Conduit N-COSTBASIS shows (R229)', inC('employer stock with an NUA angle')],
    ['Conduit N-PRIORPLAN shows (R228)', inC('Tell us where this rolled from')],
    ['Conduit N-LINK shows (R230)', inC('Link it here so we count the dollars once')],
    ['Conduit N-RULE55 shows (R231)', inC('tap it penalty-free years early')],
    ['nudge uses the shared .di-nudge class', inC('class="di-nudge"')],
    // L47 — vanish the instant sourced
    ['L47: N-PRIORPLAN VANISHES when priorPlan set', gone('Tell us where this rolled from')],
    ['L47: N-COSTBASIS VANISHES when basis entered', gone('employer stock with an NUA angle')],
    ['L47: N-CASH-IDLE VANISHES when cash reinvested', gone('still sitting in cash — tell us if that')],
    ['L47: N-RULE55 VANISHES when rule55 set', gone('tap it penalty-free years early')],
    // 401(k) room nudges (R427/R422/R423/R424)
    ['401k N-CASH-IDLE shows (R427)', inK('This cash isn’t invested yet')],
    ['401k N-COSTBASIS shows (R422)', inK('how much is taxable when you sell')],
    ['401k N-CONTRIB shows (R423)', inK('track it against the IRS limit')],
    ['401k N-MATCH shows (R424)', inK('capturing every free dollar')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== §21 SOURCE-OR-BLANK NUDGES GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  if (R.err) console.log('  (err: ' + R.err + ')');
  process.exit(pass === total ? 0 : 1);
})();
