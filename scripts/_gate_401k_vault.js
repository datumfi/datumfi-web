/* 401(k) STEP 1b(ii) — TRADITIONAL "THE VAULT" (pretax401k) composed §9 narrator gate (RED-first).
   Proves the Vault renders the [T] tax character (col-D twins + §13 R223/R224) and that NO Roth [R]
   tax-claim leaks onto pre-tax. Jobs:
   (1) SPINE [T]: broad equity book → "tax-deferred growth engine" (NOT "tax-free"); instrument tag shared.
   (2) LAYER E [T]: "taxed as ordinary income when you withdraw" (R223) + "RMDs ... at 73" (R224);
       NO Roth "two tax buckets" and NO Roth "NO required minimum distributions".
   (3) BEHAVIOR [T]: bond-heavy book → "bonds are actually tax-efficient to hold HERE" (R128 substantive
       flip); NOT the Roth "less tax-free growth to harvest".
   (4) ARCHETYPE [T]: crypto book → [T] tail "the IRS is a silent partner in every gain" (NOT the Roth
       "richest place in the code").
   (5) MATCH (Layer F) is tax-agnostic → still fires on pre-tax ("single highest-guaranteed return").
   (6) NO-LEAK REGRESSION: roth401k STILL renders [R] ("tax-free growth engine"), no [T] leak.
   RED at pre-wire bytes: pretax401k absent from _diIsBankRoom + [T] branches unfilled.
   Usage: serve repo root on :8001, then node scripts/_gate_401k_vault.js [LABEL] */
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
    const sal = document.getElementById('pri-salary'); if (sal) sal.value = '100,000';
    const open = (baseId) => {
      const acc = window.state.accounts.find(a => a.baseId === baseId);
      acc.showHoldings = true; window.openAccountModal(acc.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    ['pretax401k', 'roth401k'].forEach(id => { try { addInstance(id); } catch (e) {} });
    const pk = window.state.accounts.find(a => a.baseId === 'pretax401k');

    // FIX A — broad equity MF book (90/10), match configured, under-match deferral.
    pk.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index',   price: 100, shares: 450, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FSKAX', name: 'Fidelity Total Market', price: 100, shares: 300, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FTIHX', name: 'Fidelity Total Intl',   price: 100, shares: 150, expRatio: 0.06,  assetClass: 'Stocks', geography: 'International', sector: 'International', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXNAX', name: 'Fidelity US Bond',      price: 100, shares: 100, expRatio: 0.025, assetClass: 'Bonds',  geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(pk); pk.value = 100000;
    Object.assign(pk, { matchRate: 50, matchUpTo: 6, inflow: 3000, freq: 1 });
    const A = open('pretax401k');

    // FIX B — bond-heavy (eq 60 / bond 40) → behavior bond [T] tax-efficient flip.
    pk.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500',     price: 100, shares: 600, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXNAX', name: 'Fidelity US Bond',  price: 100, shares: 400, assetClass: 'Bonds',  geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(pk); pk.value = 100000;
    const B = open('pretax401k');

    // FIX C — crypto-heavy → archetype [T] tail.
    pk.holdings = [
      mk({ ticker: 'IBIT', name: 'iShares Bitcoin', price: 100, shares: 900, assetClass: 'Crypto', geography: 'Global', sector: 'Bitcoin', instrumentType: 'ETF' }),
      mk({ ticker: 'FXAIX', name: 'Fidelity 500',   price: 100, shares: 100, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(pk); pk.value = 100000;
    const C = open('pretax401k');

    // NO-LEAK — roth401k still renders [R].
    const rk = window.state.accounts.find(a => a.baseId === 'roth401k');
    rk.holdings = [ mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 900, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }) ];
    recalcPortfolio(rk); rk.value = 90000;
    const ROTH = open('roth401k');

    const narr = (html) => { const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : ''; };
    return { nA: narr(A), nB: narr(B), nC: narr(C), nRoth: narr(ROTH) };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const { nA, nB, nC, nRoth } = R;

  console.log('===== 401(k) STEP 1b(ii) VAULT DI GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — spine [T]
  all = ok('A spine [T]: tax-DEFERRED growth engine',        has(nA, 'This is a tax-deferred growth engine')) && all;
  all = ok('A spine: NO Roth "tax-free growth engine"',      !has(nA, 'tax-free growth engine')) && all;
  all = ok('A tag: built entirely from mutual funds (shared)', has(nA, 'built entirely from mutual funds')) && all;
  // Job 2 — Layer E [T]
  all = ok('A LayerE [T]: taxed as ordinary income (R223)',  has(nA, 'taxed as ordinary income when you withdraw it')) && all;
  all = ok('A LayerE [T]: RMDs kick in at 73 (R224)',        has(nA, 'Required Minimum Distributions kick in at 73')) && all;
  all = ok('A LayerE: NO Roth two-bucket split leak',        !has(nA, 'two tax buckets wearing one name')) && all;
  all = ok('A LayerE: NO Roth no-RMD claim leak',            !has(nA, 'NO required minimum distributions')) && all;
  // Job 3 — behavior bond [T] substantive flip
  all = ok('B behavior [T]: bonds tax-efficient to hold HERE', has(nB, 'bonds are actually tax-efficient to hold HERE')) && all;
  all = ok('B behavior: NO Roth "less tax-free growth"',     !has(nB, 'less tax-free growth to harvest')) && all;
  // Job 4 — archetype [T] tail
  all = ok('C archetype [T]: IRS silent partner in every gain', has(nC, 'the IRS is a silent partner in every gain')) && all;
  all = ok('C archetype: NO Roth "richest place in the code"', !has(nC, 'richest place in the code')) && all;
  // Job 5 — match tax-agnostic still fires
  all = ok('A LayerF: match still fires on pre-tax',         has(nA, 'single highest-guaranteed return in your plan')) && all;
  all = ok('A LayerG: under-match headline (shared)',        has(nA, 'declining free, guaranteed salary')) && all;
  // Job 6 — no [T] leak onto Roth
  all = ok('ROTH still [R]: tax-free growth engine',         has(nRoth, 'This is a tax-free growth engine')) && all;
  all = ok('ROTH: NO [T] "tax-deferred growth engine" leak', !has(nRoth, 'tax-deferred growth engine')) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
