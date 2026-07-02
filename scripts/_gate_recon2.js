/* Recon-2 gate (Captain 2026-07-02 third smoke) — RED-first at a 1280px viewport.
   BUG2  R1/R2 coverage survives the refresh path on ALL banks (the generic setT overwrite)
       + no beta-number leak into a blanked box's hover
   BUG1  international tilt ladder (20/40/80/95 rungs) + the % itself recomputes
   BUG3  tab walks the holding row in visual order (Ticker -> Name -> Price)
   PHANTOM  modal card fits the viewport — no card-level horizontal scrollbar below the DI
   Usage: node scripts/_gate_recon2.js [LABEL]   (serve repo root on :8001) */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8001/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);
  const sc = p.locator('text=Start from Scratch').first(); if (await sc.count()) await sc.click().catch(() => {});
  await p.waitForTimeout(500);

  const R = await p.evaluate(() => {
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
      instrumentType: '', priceSource: 'manual' }, o);
    const CAP5 = () => [
      mk({ ticker: 'TSLA', name: 'Tesla', price: 50, shares: 50, beta: 1.798, dividendYield: 0, assetClass: 'US Equity', geography: 'US', sector: 'Consumer Cyclical', instrumentType: 'Stock' }),
      mk({ ticker: 'BND', name: 'Bond ETF', price: 25, shares: 100, assetClass: 'Bonds', geography: 'US', sector: 'Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'SAP', name: 'SAP SE', price: 250, shares: 10, geography: 'International', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'IBM', name: 'IBM', price: 50, shares: 50, beta: 0.665, dividendYield: 2.42, geography: 'US', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'Vanguard', price: 25, shares: 100, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    const res = {};
    ['hsa', 'trad403', '529plan'].forEach(id => { try { addInstance(id); } catch (e) {} });
    // BUG2 — the Captain's exact repro: open, then EDIT (drives refreshModalHoldings) on all 3 banks
    ['hsa', 'trad403', '529plan'].forEach(baseId => {
      const a = state.accounts.find(x => x.baseId === baseId);
      a.holdings = CAP5(); recalcPortfolio(a); a.showHoldings = true; openAccountModal(a.id);
      updateHolding(a.id, 0, 'price', '50');   // edit path -> refreshModalHoldings
      const h = document.getElementById('modal-dynamic-content').innerHTML.replace(/\n/g, '');
      res['bug2_' + baseId + '_betaBlank'] = !/hr-beta[^>]*>\s*1\.23/.test(h);
      res['bug2_' + baseId + '_yieldBlank'] = !/1\.21%/.test(h);
      res['bug2_' + baseId + '_note'] = /only 40% of value reports a beta/.test(h);
    });
    // BUG2b — no number leak into a blanked box's hover
    const hsa = state.accounts.find(x => x.baseId === 'hsa');
    openAccountModal(hsa.id);
    let hh = document.getElementById('modal-dynamic-content').innerHTML;
    res.bug2_noHoverLeak = hh.indexOf('beta 1.23 vs market') === -1;

    // BUG1 — ladder + live recompute on the 403 narrative
    const t4 = state.accounts.find(x => x.baseId === 'trad403');
    t4.holdings = CAP5().map(x => { x.geography = 'International'; return x; });
    recalcPortfolio(t4); openAccountModal(t4.id);
    let th = document.getElementById('modal-dynamic-content').innerHTML.replace(/\n/g, '');
    res.bug1_intl100 = /International<\/div><div class="hr-val"[^>]*>100%/.test(th);
    res.bug1_entirely = th.indexOf('entirely international') !== -1 && th.indexOf('meaningfully international') === -1;
    t4.holdings = CAP5();   // SAP $2.5k of $12.5k = 20%
    recalcPortfolio(t4); openAccountModal(t4.id);
    th = document.getElementById('modal-dynamic-content').innerHTML;
    res.bug1_someRung = th.indexOf('toward some international exposure') !== -1;
    t4.holdings = CAP5(); t4.holdings[3].geography = 'International'; t4.holdings[4].geography = 'International';   // 60%
    recalcPortfolio(t4); openAccountModal(t4.id);
    th = document.getElementById('modal-dynamic-content').innerHTML;
    res.bug1_meaningfulRung = th.indexOf('meaningfully international') !== -1;

    // PHANTOM — no horizontal scrollbar may exist on the card (the glowing teal bar below the DI).
    // offsetHeight-clientHeight > border = an h-scrollbar is consuming layout; clip forbids one.
    openAccountModal(hsa.id);
    const card = document.getElementById('modal-card');
    const hScrollbar = (card.offsetHeight - card.clientHeight) > 4;   // >2px borders => scrollbar present
    res.phantom_cardFits = !hScrollbar && /clip|hidden/.test(getComputedStyle(card).overflowX) &&
                           card.getBoundingClientRect().right <= window.innerWidth;
    return res;
  });

  // BUG3 — real keyboard: type a ticker, Tab twice, expect focus on Price (row walks visually)
  const tab = await p.evaluate(() => {
    const a = state.accounts.find(x => x.baseId === 'trad403');
    a.holdings = [Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '', assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' })];
    recalcPortfolio(a); a.showHoldings = true; openAccountModal(a.id);
    return a.id;
  });
  await p.locator('#modal-dynamic-content input[onchange*="fetchMockData"]').first().click();
  await p.keyboard.type('VTI');
  await p.keyboard.press('Tab');           // fires change -> fetchMockData -> re-render (bundle already loaded)
  await p.waitForTimeout(900);             // bundle resolve + re-render + focus restore
  await p.keyboard.press('Tab');
  const focusSig = await p.evaluate(() => {
    const el = document.activeElement;
    return el ? ((el.getAttribute('oninput') || el.getAttribute('onchange') || '') + '|' + el.tagName) : '(none)';
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== RECON-2 GATE [' + LABEL + '] =====');
  let all = true;
  ['hsa', 'trad403', '529plan'].forEach(k => {
    all = ok('BUG2: ' + k + ' beta stays blank through refresh', R['bug2_' + k + '_betaBlank']) && all;
    all = ok('BUG2: ' + k + ' yield stays blank through refresh', R['bug2_' + k + '_yieldBlank']) && all;
    all = ok('BUG2: ' + k + ' coverage note present', R['bug2_' + k + '_note']) && all;
  });
  all = ok('BUG2: no beta number leaks into blanked hover',   R.bug2_noHoverLeak) && all;
  all = ok('BUG1: International % recomputes to 100%',        R.bug1_intl100) && all;
  all = ok('BUG1: 100% rung ("entirely international")',      R.bug1_entirely) && all;
  all = ok('BUG1: 20% rung ("some international exposure")',  R.bug1_someRung) && all;
  all = ok('BUG1: 60% rung ("meaningfully international")',   R.bug1_meaningfulRung) && all;
  all = ok('BUG3: Tab walks Ticker -> Name -> Price',         /'price'/.test(focusSig)) && all;
  all = ok('PHANTOM: card fits viewport (no h-scrollbar)',    R.phantom_cardFits) && all;
  console.log('focus after 2 tabs:', focusSig);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
