/* DI hover-copy + narrative gate (HSA + 403(b) first) — RED-first. Asserts via the app's own
   paths (addInstance -> holdings -> recalcPortfolio -> openAccountModal/toggleHoldings) that:
   (1) the bank-room rollup strip carries the Copy Bank §1 hover pairs (verbatim substrings),
   (2) the HSA-unique invested-vs-cash split box computes correctly (cash-basis GUARD),
   (3) the Datum Intelligence narrative assembles per §9 (layers fire/stay silent honestly),
   (4) title hovers carry §2 copy, (5) blank beta SUPPRESSES the beta box (L47),
   (6) negative control: the Taxable modal keeps its EXISTING strip untouched (no DI leak).
   On pre-build code every positive block is RED. Usage: node scripts/_gate_di_copy.js [LABEL] */
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
    const mk = (over) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
      instrumentType: '', priceSource: 'manual' }, over);
    const open = (baseId) => {
      const acc = window.state.accounts.find(a => a.baseId === baseId);
      acc.showHoldings = true;
      window.openAccountModal(acc.id);
      return { html: document.getElementById('modal-dynamic-content').innerHTML,
               title: document.getElementById('modal-acc-title').innerHTML, acc: acc.id };
    };

    ['hsa', 'trad403', 'roth403', 'crypto_primary'].forEach(id => { try { addInstance(id); } catch (e) {} });

    // ---- HSA fixture: $25k invested fund (beta 1.3, hot) + $4k cash sweep (GUARD row) ----
    const hsa = window.state.accounts.find(a => a.baseId === 'hsa');
    hsa.holdings = [
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 250, shares: 100, beta: 1.3, expRatio: 0.03,
           assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' }),
      mk({ name: 'HSA Cash Sweep', price: 1, shares: 4000, instrumentType: 'CASH', assetClass: 'Cash' })
    ];
    recalcPortfolio(hsa);
    const H = open('hsa');

    // ---- 403(b) [T] fixture: 2 funds, lean expense, no beta anywhere (beta box must suppress) ----
    const t4 = window.state.accounts.find(a => a.baseId === 'trad403');
    t4.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index', price: 180, shares: 500, expRatio: 0.015,
           assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXNAX', name: 'Fidelity US Bond Index', price: 10, shares: 3000, expRatio: 0.025,
           assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    t4.inflow = 1000; t4.freq = 12;
    recalcPortfolio(t4);
    const T = open('trad403');

    // ---- 403(b) [R] fixture: same shape, roth branch ----
    const r4 = window.state.accounts.find(a => a.baseId === 'roth403');
    r4.holdings = [ mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index', price: 100, shares: 100, expRatio: 0.015,
      assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }) ];
    recalcPortfolio(r4);
    const Rt = open('roth403');

    // ---- Negative control: taxable strip untouched ----
    const tx = window.state.accounts.find(a => a.baseId === 'crypto_primary');
    tx.holdings = [ mk({ ticker: 'VTI', name: 'V', price: 100, shares: 10, costBasis: '500', assetClass: 'Stocks' }) ];
    recalcPortfolio(tx);
    const X = open('crypto_primary');

    // ---- Empty-state honesty: hsa_co with NO holdings -> no narrative ----
    try { addInstance('hsa_co'); } catch (e) {}
    const co = window.state.accounts.find(a => a.baseId === 'hsa_co');
    const co2 = document.getElementById('co-arch-toggle'); if (co2) co2.checked = true;
    co.showHoldings = true; window.openAccountModal(co.id);
    const E = document.getElementById('modal-dynamic-content').innerHTML;

    return { H, T, Rt, X, E };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  console.log('===== DI COPY GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — hover copy (verbatim §1 substrings inside .modal-tt on rollup cells)
  all = ok('hsa: equity hover 1b (medical war-chest)',        has(R.H.html, 'medical war-chest')) && all;
  all = ok('hsa: invested-split hover (stealth retirement)',  has(R.H.html, 'stealth retirement account')) && all;
  all = ok('hsa: cash hover (out-of-pocket bills)',           has(R.H.html, 'out-of-pocket bills')) && all;
  all = ok('hsa: split box computes 86% / 14%',               has(R.H.html, '86%') && has(R.H.html, '14%')) && all;
  all = ok('hsa: beta box PRESENT when sourced (1.30)',       /hr-beta[^>]*>(\s|<[^>]*>)*1\.30/.test(R.H.html.replace(/\n/g, ''))) && all;
  all = ok('403T: balance hover 1b (ordinary income)',        has(R.T.html, 'Same balance, very different after-tax worth')) && all;
  all = ok('403T: contrib hover (combined 401k ceiling, D20)', has(R.T.html, 'one combined ceiling, not two separate ones')) && all;
  all = ok('403T: expense hover (menus run EXPENSIVE)',       has(R.T.html, '403(b) menus historically run EXPENSIVE')) && all;
  // W7 parity (2026-07-08): Weighted Beta now ALWAYS renders ("—" when unsourced), no longer suppressed —
  // the RICH 403(b) beta hover proves the cell is present.
  all = ok('403T: beta box ALWAYS renders (W7 parity, rich hover)', has(R.T.html, 'How hard your 403(b) swings with the market')) && all;
  // Job 2 — narrative
  all = ok('hsa: DI narrative block present',                 has(R.H.html, 'di-narr')) && all;
  all = ok('hsa: Layer A opener (invested and in cash)',      has(R.H.html, 'invested and') && has(R.H.html, 'in cash')) && all;
  all = ok('hsa: Layer C triple-tax (taxed nowhere) always',  has(R.H.html, 'the only account taxed nowhere')) && all;
  all = ok('hsa: Layer C2 fires (beta 1.3 -> hotter than)',   has(R.H.html, 'hotter than')) && all;
  all = ok('hsa: Layer D set-aside ON (medical reserve)',     has(R.H.html, 'medical reserve, so it grows untouched')) && all;
  all = ok('hsa: Layer E receipt-bank action line',           has(R.H.html, 'save the receipts')) && all;
  all = ok('403T: Layer A spine ([T] tax-sheltered plan)',    has(R.T.html, 'pre-tax salary deferrals inside your tax-sheltered employer plan')) && all;
  all = ok('403T: Layer D annuity caution (surrender)',       has(R.T.html, 'surrender')) && all;
  all = ok('403T: Layer E 59½ truth (RMDs begin at 73)', has(R.T.html, 'RMDs begin at 73')) && all;
  all = ok('403T: Layer E NOT the 457 no-penalty line',       !has(R.T.html, 'any age, no penalty')) && all;
  all = ok('403T: Layer F fires only when a catch-up is ON',  !has(R.T.html, "You've switched on the catch-up")) && all;
  all = ok('403T: Layer G contribution ($12,000/yr)',         has(R.T.html, '$12,000/yr')) && all;
  all = ok('403R: Layer A spine ([R] designated Roth)',       has(R.Rt.html, 'designated Roth dollars inside your tax-sheltered employer plan')) && all;
  all = ok('403R: Layer E roth truth (no RMDs for you ever)', has(R.Rt.html, 'no RMDs for you ever')) && all;
  // Job 3 — title hovers
  all = ok('hsa: title hover (triple-tax-advantaged)',        has(R.H.title, 'triple-tax-advantaged health account')) && all;
  all = ok('hsa: title one-liner (taxed nowhere)',            has(R.H.title, 'in, growing, or out')) && all;
  all = ok('403T: title hover (Tax-Sheltered Annuity)',       has(R.T.title, 'Tax-Sheltered Annuity')) && all;
  all = ok('403R: title hover (no lifetime RMDs)',            has(R.Rt.title, 'no lifetime RMDs')) && all;
  // Honesty + regression controls
  // W5 (2026-07-08): an empty room shows the SHARED universal empty-state, not literal nothing. Assert the
  // verbatim empty-state renders AND no per-room HSA narrative is fabricated (RED on true fabrication).
  all = ok('empty hsa_co: shows universal W5 empty-state (verbatim)', has(R.E, 'Add a few tickers below and Datum reads the whole picture')) && all;
  all = ok('empty hsa_co: NO per-room HSA narrative fabricated', !has(R.E, 'Your HSA holds')) && all;
  all = ok('crypto (non-bank): keeps its EXISTING strip (hr-gain-sub)', has(R.X.html, 'hr-gain-sub')) && all;
  all = ok('crypto (non-bank): NO DI narrative leak',                   !has(R.X.html, 'di-narr')) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
