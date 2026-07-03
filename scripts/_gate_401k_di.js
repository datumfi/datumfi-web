/* 401(k) STEP 1b — ROTH "THE TREASURY" composed §9 narrator gate (RED-first).
   Proves the roth401k DI paragraph on real STEP-1a match data. Jobs:
   (1) SPINE: broad equity book → generic "tax-free growth engine" spine + §11 instrument tag.
   (2) ARCHETYPE: crypto-heavy book → §3a "pure digital-asset holding" REPLACES the spine, with
       the Roth [R] tax tail ("richest place in the code for your biggest-upside bets").
   (3) LAYER E (the reason 1a was built): a funded account WITH a direct-entry match balance narrates
       the two-bucket split ("two tax buckets wearing one name" + the $ figure) + no-RMD advantage.
   (4) LAYER F/G: match line ("single highest-guaranteed return") fires with match data; the
       under-match headline ("declining free, guaranteed salary") fires when the deferral is short.
   (5) B2: a genuinely diversified book fires the Composition Read ("under the hood, biggest first").
   (6) SOURCED-OR-BLANK (Lesson 47): a NO-match book prints NO two-bucket split and NO match line and
       no fabricated rate — but the structural no-RMD line still fires.
   (7) VAULT HELD: pretax401k is intentionally NOT yet a DI room (Traditional [T] in-layer copy gap) →
       no Datum Intelligence block, no Treasury copy leaks onto it.
   RED on HEAD: _diNarr401k undefined + roth401k absent from _diIsBankRoom → no narrative.
   Usage: serve repo root on :8001, then node scripts/_gate_401k_di.js [LABEL] */
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
    ['roth401k', 'pretax401k'].forEach(id => { try { addInstance(id); } catch (e) {} });
    const rk = window.state.accounts.find(a => a.baseId === 'roth401k');

    // FIX A — broad equity MF book (90/10), has match, under-match deferral.
    rk.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index',    price: 100, shares: 450, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FSKAX', name: 'Fidelity Total Market',  price: 100, shares: 300, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FTIHX', name: 'Fidelity Total Intl',    price: 100, shares: 150, expRatio: 0.06,  assetClass: 'Stocks', geography: 'International', sector: 'International', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXNAX', name: 'Fidelity US Bond',       price: 100, shares: 100, expRatio: 0.025, assetClass: 'Bonds',  geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(rk); rk.value = 100000;
    Object.assign(rk, { matchRate: 50, matchUpTo: 6, matchBalance: 30000, vestedPct: 100, inflow: 3000, freq: 1 });
    const A = open('roth401k');

    // FIX B — crypto-heavy → archetype replaces spine.
    rk.holdings = [
      mk({ ticker: 'IBIT', name: 'iShares Bitcoin', price: 100, shares: 900, assetClass: 'Crypto', geography: 'Global', sector: 'Bitcoin', instrumentType: 'ETF' }),
      mk({ ticker: 'FXAIX', name: 'Fidelity 500',   price: 100, shares: 100, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(rk); rk.value = 100000;
    const B = open('roth401k');

    // FIX C — NO match data; near-max deferral.
    const ck = window.state.accounts.find(a => a.baseId === 'roth401k');
    ['matchRate', 'matchUpTo', 'vestedPct', 'matchBalance'].forEach(k => { delete ck[k]; });
    ck.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500 Index', price: 100, shares: 450, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXNAX', name: 'Fidelity US Bond',   price: 100, shares: 50,  expRatio: 0.025, assetClass: 'Bonds',  geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(ck); ck.value = 50000; Object.assign(ck, { inflow: 20000, freq: 1 });
    const C = open('roth401k');

    // FIX D — genuinely diversified → B2 Composition Read fires.
    const dk = window.state.accounts.find(a => a.baseId === 'roth401k');
    dk.holdings = [
      mk({ ticker: 'FXAIX', name: 'Fidelity 500',      price: 100, shares: 350, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FTIHX', name: 'Fidelity Intl',     price: 100, shares: 250, assetClass: 'Stocks', geography: 'International', sector: 'International', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FDVV',  name: 'Fidelity Dividend', price: 100, shares: 150, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Dividend Growth', instrumentType: 'ETF' }),
      mk({ ticker: 'FSSNX', name: 'Fidelity Small',    price: 100, shares: 150, assetClass: 'Stocks', geography: 'US Stocks - Small Blend', sector: 'Small Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FSELX', name: 'Fidelity Semis',    price: 100, shares: 100, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(dk); dk.value = 100000;
    const D = open('roth401k');

    // VAULT HELD — pretax401k funded but NOT a DI room yet.
    const pk = window.state.accounts.find(a => a.baseId === 'pretax401k');
    pk.holdings = [ mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 500, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }) ];
    recalcPortfolio(pk); const PRE = open('pretax401k');

    const narr = (html) => { const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : ''; };
    return { nA: narr(A), nB: narr(B), nC: narr(C), nD: narr(D), preHtml: PRE };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const { nA, nB, nC, nD, preHtml } = R;

  console.log('===== 401(k) STEP 1b TREASURY DI GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — spine + instrument tag
  all = ok('A spine: tax-free growth engine (eq>=85)',        has(nA, 'This is a tax-free growth engine')) && all;
  all = ok('A tag: built entirely from mutual funds',        has(nA, 'built entirely from mutual funds')) && all;
  // Job 2 — archetype replaces spine (crypto)
  all = ok('B archetype: pure digital-asset holding',        has(nB, 'pure digital-asset holding')) && all;
  all = ok('B [R] tail: richest place in the code',          has(nB, 'richest place in the code for your biggest-upside bets')) && all;
  // Job 3 — Layer E (the two-bucket split on REAL match data)
  all = ok('A LayerE: two tax buckets wearing one name',     has(nA, 'two tax buckets wearing one name')) && all;
  all = ok('A LayerE: match $ figure ($30,000)',             has(nA, '$30,000')) && all;
  all = ok('A LayerE: no-RMD advantage on Roth side',        has(nA, 'NO required minimum distributions')) && all;
  all = ok('A LayerE: match RMD parenthetical present',      has(nA, 'Only the pre-tax match portion still carries RMDs')) && all;
  // Job 4 — Layer F/G on match data
  all = ok('A LayerF: single highest-guaranteed return',     has(nA, 'single highest-guaranteed return in your plan')) && all;
  all = ok('A LayerG: declining free, guaranteed salary',    has(nA, 'declining free, guaranteed salary')) && all;
  // Job 5 — B2 composition read
  all = ok('D B2: under the hood, biggest first',            has(nD, 'under the hood, biggest first')) && all;
  all = ok('D B2: Roth-401k tax tail (exact mix)',           has(nD, 'in a Roth 401(k) this is the exact mix')) && all;
  // Job 6 — sourced-or-blank (no-match book)
  all = ok('C blank: NO two-bucket split line',              !has(nC, 'two tax buckets wearing one name')) && all;
  all = ok('C blank: NO match F line',                       !has(nC, 'single highest-guaranteed return in your plan')) && all;
  all = ok('C blank: no-RMD fires WITHOUT match parenthetical', has(nC, 'NO required minimum distributions') && !has(nC, 'Only the pre-tax match portion')) && all;
  all = ok('C LayerG: near-max "filling ... strong"',        has(nC, 'of this year’s limit — strong')) && all;
  // Job 7 — Vault held (no DI room, no Treasury leak)
  // Vault is now WIRED (STEP 1b(ii)) — it renders its OWN [T] narrative; the deep Vault coverage
  // lives in _gate_401k_vault.js. Here we only assert no Roth [R] tax-claim leaks onto pre-tax.
  all = ok('VAULT: pretax renders [T] (tax-deferred engine)', has(preHtml, 'tax-deferred growth engine')) && all;
  all = ok('VAULT: no Roth [R] tax-free claim leaks onto it', !has(preHtml, 'tax-free growth engine')) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
