/* JOB A — 401(k) reopen: 2 new §8 balance-split fields (profitSharingBalance R98 / rolloverBalance R99)
   + 2 new §9 Layer-E lines each with [R]/[T] twins (R141/D141 profit-sharing, R142/D142 rollover).
   matchBalance (R97/R140) is already live and NOT re-tested here. Asserts: fields render on BOTH rooms;
   each Layer-E line FIRES on its token>0 and is SILENT at 0; [R] vs [T] copy differs; account value is
   NOT inflated by the split fields (LOCK-3 display-only). Red-first: RED on HEAD, GREEN after wire.
   Usage: serve repo root on :8001, then node scripts/_gate_401k_reopen.js [LABEL]. */
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
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    const sal = document.getElementById('pri-salary'); if (sal) sal.value = '100,000';
    const rich = () => [ mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 900, costBasis: 60000, expRatio: 0.3, beta: 1.0, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }) ];
    const open = (id, withSplit) => {
      try { addInstance(id); } catch (e) {}
      const a = window.state.accounts.filter(x => x.baseId === id).pop();
      a.holdings = rich(); a.value = 90000; a.showHoldings = true;
      Object.assign(a, { matchRate: 50, matchUpTo: 6, inflow: 3000, freq: 1 });
      if (id === 'roth401k') a.matchBalance = 30000;
      if (withSplit) { a.profitSharingBalance = 20000; a.rolloverBalance = 15000; }
      recalcPortfolio(a); a.value = 90000;
      window.openAccountModal(a.id);
      return { html: document.getElementById('modal-dynamic-content').innerHTML, value: a.value,
        title: (document.getElementById('modal-acc-title') || {}).innerHTML || '' };
    };
    return {
      rothOn: open('roth401k', true), rothOff: open('roth401k', false),
      preOn: open('pretax401k', true), preOff: open('pretax401k', false),
    };
  });
  await b.close();

  const has = (s, t) => s.indexOf(t) !== -1;
  // markers (contiguous source literals — verbatim from the bank)
  const M = {
    psField: 'performance-based contribution',           // B98 field hover
    rbField: 'rollover source',                          // B99 field hover
    psLabel: 'Profit-Sharing Balance ($)',
    rbLabel: 'In-Plan Rollover Balance ($)',
    b141: 'of this account is company profit-sharing',   // R141 [R] roth line
    b142: 'One more slice the single balance hides:',    // R142 [R] roth line
    d141: 'profit-sharing carries no separate tax character', // D141 [T] vault line
    d142: 'a rolled-in balance keeps the same pre-tax character as everything else here', // D142 [T] vault line
  };

  const results = [
    // §8 fields render on BOTH rooms (always shown; value-independent)
    ['[R] Profit-Sharing field + hover renders', has(R.rothOn.html, M.psLabel) && has(R.rothOn.html, M.psField)],
    ['[R] In-Plan Rollover field + hover renders', has(R.rothOn.html, M.rbLabel) && has(R.rothOn.html, M.rbField)],
    ['[T] Profit-Sharing field + hover renders', has(R.preOn.html, M.psLabel) && has(R.preOn.html, M.psField)],
    ['[T] In-Plan Rollover field + hover renders', has(R.preOn.html, M.rbLabel) && has(R.preOn.html, M.rbField)],
    // §9 Layer-E FIRES on token>0
    ['[R] R141 profit-sharing line FIRES (ps>0)', has(R.rothOn.html, M.b141)],
    ['[R] R142 rollover line FIRES (rb>0)', has(R.rothOn.html, M.b142)],
    ['[T] D141 profit-sharing twin FIRES (ps>0)', has(R.preOn.html, M.d141)],
    ['[T] D142 rollover twin FIRES (rb>0)', has(R.preOn.html, M.d142)],
    // SILENT at 0
    ['[R] R141/R142 SILENT when ps=rb=0', !has(R.rothOff.html, M.b141) && !has(R.rothOff.html, M.b142)],
    ['[T] D141/D142 SILENT when ps=rb=0', !has(R.preOff.html, M.d141) && !has(R.preOff.html, M.d142)],
    // [R]/[T] copy differs (twin, not clone): the roth PS phrasing must NOT appear on the vault, and vice-versa
    ['[R]/[T] profit-sharing copy differs', has(R.rothOn.html, M.b141) && !has(R.preOn.html, M.b141) && has(R.preOn.html, M.d141) && !has(R.rothOn.html, M.d141)],
    ['[R]/[T] rollover copy differs', has(R.rothOn.html, M.b142) && !has(R.preOn.html, M.b142) && has(R.preOn.html, M.d142) && !has(R.rothOn.html, M.d142)],
    // LOCK-3: split fields do not inflate account value
    ['LOCK-3 value not inflated by split (R)', R.rothOn.value === 90000],
    ['LOCK-3 value not inflated by split (T)', R.preOn.value === 90000],
    // ① R144 [T] RMD twin (D144) — authored line replaces the older sentence (Vault only)
    ['[T] D144 authored RMD twin FIRES', has(R.preOn.html, 'The mirror of the Roth advantage, and it cuts the other way')],
    ['[T] older RMD sentence is GONE', !has(R.preOn.html, 'Required Minimum Distributions kick in at 73')],
    ['[R] Treasury does NOT show the [T] RMD twin', !has(R.rothOn.html, 'The mirror of the Roth advantage')],
    // addendum copy-drift swaps (nickname/jargon strip) — NEW present AND OLD gone
    ['C292 [T] balance hover de-nicknamed', has(R.preOn.html, 'A dollar in your pre-tax 401(k) is worth less') && !has(R.preOn.html, 'A dollar in The Vault')],
    ['B375 UG box de-jargoned (Σ gone)', has(R.rothOn.html, 'added up across every holding where you') && !has(R.rothOn.html, 'never enter the Σ')],
    ['B35 [R] title body de-nicknamed', has(R.rothOn.title, 'Think of your Roth 401(k) as the reserve you draw last') && !has(R.rothOn.title, 'this is the Treasury — the reserve')],
  ];

  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== 401(k) REOPEN GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  process.exit(pass === total ? 0 : 1);
})();
