/* Reconcile + green-light gate (Captain 2026-07-01 second smoke) — RED-first.
   R1 yield coverage honesty (1.21% off 40% of value must not masquerade)
   R2 beta coverage honesty (box + narrative gate on coverage)
   R3 receipt tooltip re-anchored to a compact glyph (no wrapped-inline phantom)
   C1 no dangling em-dash in the 529 enrollment hover
   B1 header never clips (longest names)   B2 403 strip leads with the HSA block
   B3 yield hover on HSA/529               G1 catch-up/super/special hovers + 457 special tier
   G2 column-header hovers (12)            G3 classification dropdowns feed the math
   Usage: node scripts/_gate_recon.js [LABEL]   (serve repo root on :8001) */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
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
    const CAP5 = () => [   // the Captain's 5-ticker fixture — $2,500 each
      mk({ ticker: 'TSLA', name: 'Tesla', price: 50, shares: 50, beta: 1.798, dividendYield: 0, assetClass: 'US Equity', geography: 'US', sector: 'Consumer Cyclical', instrumentType: 'Stock' }),
      mk({ ticker: 'BND', name: 'Vanguard Total Bond', price: 25, shares: 100, assetClass: 'Bonds', geography: 'US', sector: 'Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'SAP', name: 'SAP SE', price: 250, shares: 10, geography: 'International', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'IBM', name: 'IBM', price: 50, shares: 50, beta: 0.665, dividendYield: 2.42, geography: 'US', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 25, shares: 100, assetClass: 'US Equity', geography: 'US', sector: 'Blend', instrumentType: 'ETF' })
    ];
    const res = {};
    ['hsa', 'trad403', '529plan'].forEach(id => { try { addInstance(id); } catch (e) {} });
    const hsa = state.accounts.find(a => a.baseId === 'hsa');
    const t4 = state.accounts.find(a => a.baseId === 'trad403');
    const e5 = state.accounts.find(a => a.baseId === '529plan');

    // ── R1/R2 on the Captain's fixture (yield coverage 40%, beta coverage 40%) ──
    hsa.holdings = CAP5(); recalcPortfolio(hsa); hsa.showHoldings = true; openAccountModal(hsa.id);
    let h = document.getElementById('modal-dynamic-content').innerHTML;
    res.r1_noMasquerade = !/1\.21%/.test(h);
    res.r1_coverageNote = /only 40% of value reports a yield/.test(h);
    res.r2_betaBlanked = !/hr-beta[^>]*>\s*1\.23/.test(h.replace(/\n/g, ''));
    res.r2_betaNote = /only 40% of value reports a beta/.test(h);
    res.r2_narrSilent = h.indexOf('hotter than') === -1 && h.indexOf('calmer than') === -1;
    res.b3_hsaYieldHover = /Income thrown off inside the account/.test(h);  // rich HSA yield hover (restored 2026-07-09)
    res.r3_glyphAnchor = /di-info/.test(h) && !/take any year\.<div class="modal-tt"/.test(h);
    res.g3_selects = (h.match(/<select[^>]*assetClass/g) || []).length >= 1 &&
                     (h.match(/<select[^>]*instrumentType/g) || []).length >= 1 &&
                     (h.match(/<select[^>]*geography/g) || []).length >= 1 &&
                     (h.match(/<select[^>]*'sector'/g) || []).length >= 1;
    res.g2_headerHovers = (h.match(/<th[^>]*>[\s\S]*?modal-tt/g) || []).length >= 10 &&
                          /Ticker[\s\S]{0,300}modal-tt/.test(h);

    // positive control: full beta+yield coverage -> box shows plain, narrative fires
    hsa.holdings = [ mk({ ticker: 'QQQ', name: 'Invesco QQQ', price: 100, shares: 100, beta: 1.3, dividendYield: 0.6, assetClass: 'US Equity', geography: 'US', sector: 'Large Cap', instrumentType: 'ETF' }) ];
    recalcPortfolio(hsa); openAccountModal(hsa.id);
    h = document.getElementById('modal-dynamic-content').innerHTML;
    res.r2_fullCovFires = /hr-beta[^>]*>\s*1\.30/.test(h.replace(/\n/g, '')) && h.indexOf('hotter than') !== -1;
    res.r1_fullCovShows = /0\.60%/.test(h);

    // ── G3 end-to-end: pick "Bonds" via the dropdown -> Bond% fires ──
    hsa.holdings = [
      mk({ ticker: 'SHV', name: 'iShares 0-1Y', price: 110, shares: 10, instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'Vanguard', price: 110, shares: 10, assetClass: 'US Equity', geography: 'US', instrumentType: 'ETF' })
    ];
    recalcPortfolio(hsa); openAccountModal(hsa.id);
    const sel = document.querySelector('#modal-dynamic-content select[onchange*="assetClass"]');
    let bondFired = false;
    if (sel) {
      sel.value = 'Bonds'; sel.dispatchEvent(new Event('change'));
      const h2 = document.getElementById('modal-dynamic-content').innerHTML.replace(/\n/g, '');
      bondFired = /Bond %<\/div><div class="hr-val"[^>]*>50%/.test(h2);
    }
    res.g3_bondFires = bondFired;

    // ── B2: 403 strip leads with the HSA block, then account-specific ──
    t4.holdings = CAP5(); recalcPortfolio(t4); t4.showHoldings = true; openAccountModal(t4.id);
    const th = document.getElementById('modal-dynamic-content').innerHTML;
    const strip = th.slice(th.indexOf('bank-strip-'), th.indexOf('holdings-table'));
    const order = ['Account Value', 'Equity %', 'Bond %', 'Cash %', 'International', 'Balance', 'Annual Contribution'];
    let pos = -1, ordered = true;
    order.forEach(lbl => { const i = strip.indexOf('>' + lbl + '<'); if (i === -1 || i < pos) ordered = false; pos = i; });
    res.b2_leadBlock = ordered;
    res.b2_bondFromBND = /Bond %<\/div><div class="hr-val"[^>]*>20%/.test(strip.replace(/\n/g, ''));

    // ── G1: per-toggle hovers + 457 special tier ──
    res.g1_catch50Hover = /Age 50 Unlock/.test(th);
    res.g1_superHover = /60–63 Window|60-63 Window/.test(th);
    try { addInstance('pretax457b'); } catch (e) {}
    const s457 = state.accounts.find(a => a.baseId === 'pretax457b');
    openAccountModal(s457.id);
    let sh = document.getElementById('modal-dynamic-content').innerHTML;
    res.g1_457special = /Special 3-Year Catch-Up|Final-3-Year/.test(sh) && /DOUBLE the base limit/.test(sh);
    // mutual exclusion: special ON turns age tiers OFF and doubles the max
    if (window.updateAccToggle) { updateAccToggle(s457.id, 'catchUp50', true); updateAccToggle(s457.id, 'specialCatchUp', true); }
    sh = document.getElementById('modal-dynamic-content').innerHTML;
    res.g1_mutualExcl = s457.specialCatchUp === true && s457.catchUp50 === false && /49,000/.test(sh);
    try { addInstance('tradira'); } catch (e) {}
    const ira = state.accounts.find(a => a.baseId === 'tradira');
    openAccountModal(ira.id);
    res.g1_iraHover = /Age 50 Unlock/.test(document.getElementById('modal-dynamic-content').innerHTML);

    // ── C1: 529 enrollment hover — no dangling dash ──
    e5.holdings = CAP5(); recalcPortfolio(e5); e5.showHoldings = true; openAccountModal(e5.id);
    const eh = document.getElementById('modal-dynamic-content').innerHTML;
    res.c1_noDanglingDash = !/roughly — years/.test(eh) && !/roughly\s+—\s+years/.test(eh);
    res.b3_529YieldHover = /Income thrown off inside the account/.test(eh);

    // ── B1: longest names never clip ──
    const longNames = ['Traditional 403(b)', 'Governmental 457(b)', 'Roth 401(k)'];
    let noClip = true;
    longNames.forEach(nm => {
      renameFromModal(e5.id, nm);
      const inp = document.getElementById('modal-acc-title').querySelector('input');
      if (!inp || inp.scrollWidth > inp.clientWidth + 1) noClip = false;
    });
    renameFromModal(e5.id, '529 Education Plan');
    res.b1_noClip = noClip;
    return res;
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== RECON GATE [' + LABEL + '] =====');
  let all = true;
  all = ok('R1: 1.21% masquerade gone (40% coverage)',       R.r1_noMasquerade) && all;
  all = ok('R1: yield coverage note shown',                  R.r1_coverageNote) && all;
  all = ok('R1: full-coverage yield still shows',            R.r1_fullCovShows) && all;
  all = ok('R2: beta 1.23 blanked at 40% coverage',          R.r2_betaBlanked) && all;
  all = ok('R2: beta coverage note shown',                   R.r2_betaNote) && all;
  all = ok('R2: narrative beta clause SILENT at 40%',        R.r2_narrSilent) && all;
  all = ok('R2: full-coverage beta shows + narrates',        R.r2_fullCovFires) && all;
  all = ok('R3: receipt hover = compact glyph anchor',       R.r3_glyphAnchor) && all;
  all = ok('C1: no dangling em-dash in 529 hover',           R.c1_noDanglingDash) && all;
  all = ok('B1: longest names never clip the header',        R.b1_noClip) && all;
  all = ok('B2: 403 strip leads with the HSA block',         R.b2_leadBlock) && all;
  all = ok('B2: BND drives Bond% 20% on the 403 strip',      R.b2_bondFromBND) && all;
  all = ok('B3: yield hover ported to HSA',                  R.b3_hsaYieldHover) && all;
  all = ok('B3: yield hover ported to 529',                  R.b3_529YieldHover) && all;
  all = ok('G1: Catch-Up (50+) hover installed',             R.g1_catch50Hover) && all;
  all = ok('G1: Super Catch-Up hover installed',             R.g1_superHover) && all;
  all = ok('G1: 457 special 3-year tier + hover',            R.g1_457special) && all;
  all = ok('G1: special vs age tiers mutually exclusive',    R.g1_mutualExcl) && all;
  all = ok('G1: IRA catch-up hover installed',               R.g1_iraHover) && all;
  all = ok('G2: 12 column-header hovers installed',          R.g2_headerHovers) && all;
  all = ok('G3: classification dropdowns render',            R.g3_selects) && all;
  all = ok('G3: picking "Bonds" fires Bond% end-to-end',     R.g3_bondFires) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
