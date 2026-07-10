/* 401(k) CERTIFIED-100% gate (Lesson-50 wire-then-audit close-out). Opens BOTH rooms with one rich
   fixture and confirms EVERY authored bank section renders live — §1 strip, §2 title, §3 withdrawal,
   §4 limits (header+fields), §5 toggles, §8 match input, §9 DI paragraph, §12 metric-ladders, §15
   dated limits — each [R] Treasury / [T] Vault where the copy flips, and the robotic line stays dead.
   GREEN = the room is fully wired (no unexplained NOT-WIRED). Deliberate blanks (menuQuality, 5-yr
   clock, bracket-arbitrage, R156) are sourced-or-blank by design and not asserted here.
   Usage: serve repo root on :8001, then node scripts/_gate_401k_cert.js [LABEL] */
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
    // eq-heavy book: gain (UG-LARGE), high expense (EXP-HIGH), high beta (BETA-HIGH)
    const rich = () => [ mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 900, costBasis: 60000, expRatio: 0.7, beta: 1.3, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }) ];
    const open = (id, roth) => {
      try { addInstance(id); } catch (e) {}
      const a = window.state.accounts.find(x => x.baseId === id);
      a.holdings = rich(); a.value = 90000; a.showHoldings = true;
      Object.assign(a, { matchRate: 50, matchUpTo: 6, inflow: 3000, freq: 1 });
      if (roth) a.matchBalance = 30000;
      recalcPortfolio(a); a.value = 90000;
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML + '||TITLE||' + document.getElementById('modal-acc-title').innerHTML;
    };
    return { roth: open('roth401k', true), pre: open('pretax401k', false) };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(56)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const { roth, pre } = R;
  console.log('===== 401(k) CERTIFIED-100% GATE [' + LABEL + '] =====');
  let all = true;
  // §1 signal strip
  all = ok('§1 [R] balance hover',            has(roth, 'tax-FREE money in waiting')) && all;
  all = ok('§1 [T] balance hover',            has(pre,  'still owes income tax when it comes out')) && all;
  // §2 title
  all = ok('§2 [R] Treasury title',           has(roth, 'The Treasury — a Roth 401(k)')) && all;
  all = ok('§2 [T] Vault title',              has(pre,  'The Vault — a Traditional 401(k)')) && all;
  // §3 withdrawal + robotic dead
  all = ok('§3 [R] 5-yr second lock',         has(roth, 'a second lock too')) && all;
  all = ok('§3 [T] no second tax clock',      has(pre,  'no second tax clock')) && all;
  all = ok('§3 robotic line DEAD (both)',     !has(roth, 'penalty-free capital extraction') && !has(pre, 'penalty-free capital extraction')) && all;
  // §4 header + field
  all = ok('§4 [R] shared-limit header',      has(roth, 'Roth and pre-tax 401(k) contributions SHARE one limit')) && all;
  all = ok('§4 [T] outside-elective header',  has(pre,  'sits OUTSIDE this elective limit')) && all;
  all = ok('§4 [R] base field hover',         has(roth, 'buying tax-free compounding at today')) && all;
  all = ok('§4 [T] base field hover',         has(pre,  'tax-DEFERRED growth you can plant')) && all;
  // §5 toggles
  all = ok('§5 [R] toggle 2a',                has(roth, 'this Roth 401(k) is fully part')) && all;
  all = ok('§5 [T] toggle 2a',                has(pre,  'this Traditional 401(k) is fully part')) && all;
  // §8 match input
  all = ok('§8 EMPLOYER MATCH section',       has(roth, 'EMPLOYER MATCH') && has(pre, 'EMPLOYER MATCH')) && all;
  all = ok('§8 match-rate hover verbatim',    has(roth, 'highest-guaranteed-return move in your whole plan')) && all;
  // §9 DI paragraph
  all = ok('§9 [R] tax-free growth engine',   has(roth, 'This is a tax-free growth engine')) && all;
  all = ok('§9 [T] tax-deferred engine',      has(pre,  'This is a tax-deferred growth engine')) && all;
  all = ok('§9 [R] two-bucket match split',   has(roth, 'two tax buckets wearing one name')) && all;
  all = ok('§9 [R] no-RMD advantage',         has(roth, 'NO required minimum distributions')) && all;
  all = ok('§9 [T] ordinary-income + RMD73',  has(pre, 'taxed as ordinary income when you withdraw it') && has(pre, 'DOES carry Required Minimum Distributions — starting at 73')) && all;
  all = ok('§9 G under-match headline',       has(roth, 'declining free, guaranteed salary')) && all;
  // §12 metric-ladders
  all = ok('§12 [R] UG-LARGE prize',          has(roth, 'this is exactly why high-growth assets belong here')) && all;
  all = ok('§12 [T] UG-LARGE taxed',          has(pre,  'taxed as ordinary income on the way out')) && all;
  all = ok('§12 [R] BETA-HIGH feature',       has(roth, 'volatility is a feature')) && all;
  all = ok('§12 EXP-HIGH rung',               has(roth, 'fees are high for a 401(k)')) && all;
  // §15 dated limits render
  all = ok('§15 base limit 24,500 renders',   has(roth, '24500') || has(roth, '24,500')) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
