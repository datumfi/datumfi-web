/* STEP 2 — 529 -> taxCode "edu" split gate (RED-first). Proves the 529 "The Academy" is split off
   the shared "trust" taxCode so the Trust can own "trust" cleanly, AND that no 529 DI/copy logic
   regressed (it all keys on base.id === '529plan', not taxCode). Jobs:
   (1) getBaseType('529plan').taxCode === 'edu' (RED on old bytes where it was 'trust').
   (2) the Irrevocable Trust still carries taxCode 'trust' (unchanged).
   (3) 529 is NO LONGER collected by the taxCode==='trust' trust-group filter; the Trust still is.
   (4) 529 DI still renders its own paragraph (base.id path intact) — no regression from the split.
   Usage: serve repo root on :8001, then node scripts/_gate_529_edu_split.js [LABEL] */
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
    const mk = (o) => Object.assign({ ticker:'',name:'',price:'',shares:'',sector:'',expRatio:'',assetClass:'',costBasis:'',beta:'',expectedReturn:'',dividendYield:'',geography:'',instrumentType:'',priceSource:'manual' }, o);
    const edu = getBaseType('529plan');
    const trust = getBaseType('trust');
    // 529 DI still renders?
    try { addInstance('529plan'); } catch (e) {}
    const a = window.state.accounts.find(x => x.baseId === '529plan');
    a.showHoldings = true;
    a.holdings = [ mk({ ticker:'VTI', name:'Vanguard Total Market', price:100, shares:50, expRatio:0.03, assetClass:'Stocks', geography:'US Stocks - Large Blend', sector:'Total Market', instrumentType:'ETF' }) ];
    recalcPortfolio(a); a.value = 5000;
    window.openAccountModal(a.id);
    const html = document.getElementById('modal-dynamic-content').innerHTML;
    const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html);
    return { eduCode: edu && edu.taxCode, trustCode: trust && trust.taxCode, narr: m ? m[1] : '' };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(56)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== 529 -> edu SPLIT GATE [' + LABEL + '] =====');
  let all = true;
  all = ok('529plan taxCode === "edu" (split off trust)',   R.eduCode === 'edu') && all;
  all = ok('529 no longer routes through "trust"',          R.eduCode !== 'trust') && all;
  all = ok('Irrevocable Trust taxCode still "trust"',       R.trustCode === 'trust') && all;
  all = ok('529 DI still renders (base.id path intact)',    R.narr.length > 0 && R.narr.indexOf('education') !== -1) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
