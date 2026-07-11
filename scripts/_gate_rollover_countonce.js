/* Rollover 401(k) "The Conduit" — COUNT-ONCE GUARD gate (A3 §7.5, bank R90–R95).
   Load-bearing assertion (Captain Fork B): a linked pair must NEVER sum to more than ONE balance.
   Safe-by-default / reload-safe (Captain Fork A): a Rollover 401(k) room defaults INFORMATIONAL
   (its dollars assumed already counted inside a destination plan) — the standalone opt-in is
   IN-SESSION only, so a reload reverts to the safe default and can never double-count.
   2-account harness: destination pretax401k ($100k) + rollover401k ($108k). The engine payload
   (buildStudioRequest) must count $100k of pretax_401k, NOT $208k, by default.
   Red-first: on ce9c112 (A2) the Conduit feeds the engine → sum is $208k → RED.
   serve :8001, node scripts/_gate_rollover_countonce.js */
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
    const out = { ok: false };
    try {
      // helper existence + semantics (safe-by-default)
      out.hasHelper = (typeof window._conduitIsInformational === 'function');
      if (out.hasHelper) {
        out.rollDefault = window._conduitIsInformational({ baseId: 'rollover401k' });          // expect true (informational)
        out.rollStandalone = window._conduitIsInformational({ baseId: 'rollover401k', standaloneRollover: true }); // expect false
        out.pretaxNever = window._conduitIsInformational({ baseId: 'pretax401k' });             // expect false
      }
      // build a 2-account estate: destination Vault $100k + Conduit $108k
      addInstance('pretax401k');
      const dest = window.state.accounts.filter(x => x.baseId === 'pretax401k').pop();
      dest.value = 100000; dest.holdings = [{ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 1000, assetClass: 'Stocks', instrumentType: 'ETF', priceSource: 'manual' }];
      recalcPortfolio(dest); dest.value = 100000;
      addInstance('rollover401k');
      const roll = window.state.accounts.filter(x => x.baseId === 'rollover401k').pop();
      roll.value = 108000; roll.holdings = [{ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 1080, assetClass: 'Stocks', instrumentType: 'ETF', priceSource: 'manual' }]; roll.showHoldings = true;
      recalcPortfolio(roll); roll.value = 108000;
      out.rollId = roll.id;

      // minimal fields so buildStudioRequest() doesn't null out
      const setV = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; } };
      setV('pri-dob', '01 / 1980'); setV('target-ret', '01 / 2040'); setV('spend-input', '$100,000');

      const sumPretax = () => {
        const body = (typeof window.buildStudioRequest === 'function') ? window.buildStudioRequest() : null;
        if (!body || !body.accounts) return null;
        return body.accounts.filter(a => a.type === 'pretax_401k').reduce((s, a) => s + (a.balance || 0), 0);
      };
      out.sumDefault = sumPretax();                       // expect 100000 (Conduit informational, excluded)
      roll.standaloneRollover = true;
      out.sumStandalone = sumPretax();                    // expect 208000 (opt-in restores counting)
      roll.standaloneRollover = false;                    // reset to safe default

      // visible source-of-truth flag in the Conduit modal
      window.openAccountModal(roll.id);
      out.html = document.getElementById('modal-dynamic-content').innerHTML;
      out.ok = true;
    } catch (e) { out.err = String(e); }
    return out;
  });
  await b.close();

  const has = (t) => R.html && R.html.indexOf(t) !== -1;
  const results = [
    ['harness ran', R.ok === true],
    ['guard helper _conduitIsInformational exists', R.hasHelper === true],
    ['rollover defaults INFORMATIONAL (true)', R.rollDefault === true],
    ['standalone opt-in flips to counting (false)', R.rollStandalone === false],
    ['pretax401k is NEVER informational (false)', R.pretaxNever === false],
    ['LOAD-BEARING: default payload counts ONE balance ($100k, not $208k)', R.sumDefault === 100000],
    ['standalone opt-in restores the Conduit ($208k)', R.sumStandalone === 208000],
    ['visible "already counted in [X]" flag renders', has('already counted')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== ROLLOVER 401(k) COUNT-ONCE GUARD [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  console.log('  (sumDefault=' + R.sumDefault + ' sumStandalone=' + R.sumStandalone + ' hasHelper=' + R.hasHelper + (R.err ? ' err=' + R.err : '') + ')');
  process.exit(pass === total ? 0 : 1);
})();
