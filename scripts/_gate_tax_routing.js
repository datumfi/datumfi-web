/* STEP-0 routing-bucket gate (Taxable bank R391–R397). Drives Corporate / Business Taxable, Other Taxable,
   and Other Assets through the real addInstance/openAccountModal path and asserts: (a) the two taxable buckets
   reuse the Taxable "Living Room" engine verbatim (DI archetype + §14.4 col tip), (b) Other Assets is a
   value-only tile (no bank DI, taxCode 'other'), (c) the picker nests all three under the "More taxable / other"
   expander, and (d) the 422-critical engine maps are correct (static source guards). RED-FIRST: fails on the
   pre-wiring HEAD (buckets don't exist). Usage: serve repo root on :8001, then node scripts/_gate_tax_routing.js
   [LABEL]. Writes a UTF-8 dump; never prints unicode to console. */
const { chromium } = require('playwright');
const fs = require('fs');
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
    // Income-yield fixture (bonds + REIT) — fires the Taxable AR-INCOME-YIELD archetype, a Taxable-only marker.
    const incomeHoldings = () => [
      mk({ ticker: 'TLT', name: 'Treasuries', price: 100, shares: 250, assetClass: 'Bond', sector: 'Long Term Treasuries', instrumentType: 'ETF' }),
      mk({ ticker: 'VCIT', name: 'Corporate', price: 100, shares: 200, assetClass: 'Bond', sector: 'Corporate Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'REIT', price: 100, shares: 200, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Dividend', price: 100, shares: 350, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
    ];
    const openBank = (baseId) => {
      try { addInstance(baseId); } catch (e) { return '__ADDINSTANCE_THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      a.holdings = incomeHoldings(); a.showHoldings = true;
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      return { body: document.getElementById('modal-dynamic-content').innerHTML,
               title: (document.getElementById('modal-acc-title') || {}).innerHTML || '' };
    };
    const openValueOnly = (baseId) => {
      try { addInstance(baseId); } catch (e) { return { body: '__ADDINSTANCE_THREW__:' + e.message, title: '' }; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return { body: '__NO_ACCOUNT__', title: '' };
      a.value = 250000;
      window.openAccountModal(a.id);
      return { body: document.getElementById('modal-dynamic-content').innerHTML,
               title: (document.getElementById('modal-acc-title') || {}).innerHTML || '' };
    };

    const out = {};
    // registry + helper truth
    const gt = (id) => { const b = getBaseType(id); return b ? { taxCode: b.taxCode, isInvestment: !!b.isInvestment, owner: b.owner || null, pickerGroup: b.pickerGroup || null } : null; };
    out.corp = gt('taxable_corp');
    out.othertax = gt('taxable_other');
    out.otherassets = gt('other_assets');
    const isTax = (id) => (typeof _isTaxableRoom === 'function' ? _isTaxableRoom(id) : null);
    const isBank = (id) => (typeof _diIsBankRoom === 'function' ? _diIsBankRoom(id) : null);
    out.isTax = { corp: isTax('taxable_corp'), other: isTax('taxable_other'),
      oa: isTax('other_assets'), base: isTax('taxable'), crypto: isTax('crypto') };
    out.isBank = { corp: isBank('taxable_corp'), other: isBank('taxable_other'), oa: isBank('other_assets') };
    // live DI renders (+ title-hover capture)
    out.corpHtml = openBank('taxable_corp');
    out.otherHtml = openBank('taxable_other');
    out.baseHtml = openBank('taxable');            // plain taxable — Living Room title regression
    out.oaHtml = openValueOnly('other_assets');
    out.propHtml = openValueOnly('property');       // The Grounds — must NOT inherit the ⓘ surface
    out.collHtml = openValueOnly('collectibles');   // The Arcade — must NOT inherit the ⓘ surface
    // picker HTML — trigger the build via the add-space button, then read the dropdown
    try { document.querySelector('.action-btn'); } catch (e) {}
    const btn = document.getElementById('add-space-btn') || document.querySelector('[id*="add-space"]');
    if (btn) { try { btn.click(); } catch (e) {} }
    const dd = document.getElementById('space-dropdown');
    out.pickerHtml = dd ? dd.innerHTML : '__NO_DROPDOWN__';
    return out;
  });
  await b.close();

  // Static source guards for the 422-critical engine maps (const-scoped, not observable in-browser).
  const src = fs.readFileSync('studio.html', 'utf8');
  const mapCorp = /taxable_corp:\s*'taxable'/.test(src);
  const mapOther = /taxable_other:\s*'taxable'/.test(src);
  const filteredOA = /FILTERED_TYPES[\s\S]{0,600}'other_assets'/.test(src);
  const catOther = /catSums\s*=\s*\{[^}]*other:\s*0/.test(src);

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const TAX_MARK = 'yield-tilted income sleeve';       // Taxable AR-INCOME-YIELD archetype (Taxable engine only)
  const COL_MARK = 'you picked every one of these off the open market'; // §14.4 Taxable-aware Ticker col tip
  const LIVING_MARK = 'The Living Room — a Taxable Brokerage';          // plain-taxable room-intro title hover
  const CORP_MARK = 'We flag it as entity-owned so your net worth stays honest'; // R393 room-intro
  const OTHER_MARK = 'a full taxable room wearing a generic label';     // R394 room-intro
  const OA_MARK = 'Walling it out keeps your investable mix honest';    // R396 room-intro
  const c = R.corp || {}, o = R.othertax || {}, oa = R.otherassets || {};
  const corpB = (R.corpHtml || {}).body, otherB = (R.otherHtml || {}).body, oaB = (R.oaHtml || {}).body;
  const corpT = (R.corpHtml || {}).title, otherT = (R.otherHtml || {}).title, baseT = (R.baseHtml || {}).title, oaT = (R.oaHtml || {}).title;
  const propT = (R.propHtml || {}).title, collT = (R.collHtml || {}).title;

  const checks = [
    // registry
    ['taxable_corp registered', !!R.corp],
    ['taxable_corp taxCode liquid + isInvestment', c.taxCode === 'liquid' && c.isInvestment === true],
    ['taxable_corp owner=entity (label-only flag)', c.owner === 'entity'],
    ['taxable_corp pickerGroup=more-taxable', c.pickerGroup === 'more-taxable'],
    ['taxable_other registered (taxable engine fields)', o.taxCode === 'liquid' && o.isInvestment === true && o.pickerGroup === 'more-taxable'],
    ['other_assets registered taxCode=other', oa.taxCode === 'other'],
    ['other_assets is NOT isInvestment (value-only)', oa.isInvestment === false],
    // helper scoping
    ['_isTaxableRoom matches corp + other + base', R.isTax.corp && R.isTax.other && R.isTax.base],
    ['_isTaxableRoom EXCLUDES other_assets + crypto', R.isTax.oa === false && R.isTax.crypto === false],
    ['_diIsBankRoom includes corp + other', R.isBank.corp && R.isBank.other],
    ['_diIsBankRoom EXCLUDES other_assets', R.isBank.oa === false],
    // live routing — the two taxable buckets reuse the Taxable engine verbatim
    ['Corporate routes to Taxable DI (archetype)', has(corpB, TAX_MARK)],
    ['Corporate gets §14.4 taxable col tip', has(corpB, COL_MARK)],
    ['Other Taxable routes to Taxable DI (archetype)', has(otherB, TAX_MARK)],
    ['Other Taxable gets §14.4 taxable col tip', has(otherB, COL_MARK)],
    // STEP-0 room-intro title hovers (verbatim, distinct per bucket)
    ['Corporate title hover = R393 room-intro', has(corpT, CORP_MARK)],
    ['Corporate title hover is NOT the Living Room copy', !has(corpT, LIVING_MARK)],
    ['Other Taxable title hover = R394 room-intro', has(otherT, OTHER_MARK)],
    ['Other Taxable title hover is NOT the Living Room copy', !has(otherT, LIVING_MARK)],
    ['plain Taxable title hover STILL = Living Room (regression)', has(baseT, LIVING_MARK)],
    // Other Assets is value-only: renders, but no bank DI / no taxable markers / no ⓘ intro hover (parked)
    ['Other Assets modal renders (no crash)', typeof oaB === 'string' && oaB.length > 0 && !has(oaB, '__')],
    ['Other Assets has NO taxable DI archetype', !has(oaB, TAX_MARK)],
    ['Other Assets has NO taxable col tip', !has(oaB, COL_MARK)],
    // Other Assets room-intro hover (R396) — now wired to the shared title-ⓘ surface, other_assets ONLY
    ['Other Assets title hover = R396 room-intro', has(oaT, OA_MARK)],
    ['Other Assets title now HAS the ⓘ wrapper', has(oaT, 'modal-tt')],
    ['Grounds (property) still NO ⓘ (no surface inherit)', !has(propT, 'modal-tt')],
    ['Arcade (collectibles) still NO ⓘ (no surface inherit)', !has(collT, 'modal-tt')],
    // picker expander nesting
    ['picker nests fold-outs under "More Taxable / Other" L2 (per-wing taxonomy #223)', has(R.pickerHtml, 'l2-lbl">More Taxable / Other')],
    ['picker lists Corporate / Business Taxable', has(R.pickerHtml, 'Corporate / Business Taxable')],
    ['picker lists Other Taxable', has(R.pickerHtml, 'Other Taxable')],
    ['picker lists Other Assets', has(R.pickerHtml, 'Other Assets')],
    ['picker buckets sit in picker-subgroup', has(R.pickerHtml, 'picker-subgroup')],
    // 422-critical engine map static guards
    ['engine map: taxable_corp -> taxable', mapCorp],
    ['engine map: taxable_other -> taxable', mapOther],
    ['other_assets in FILTERED_TYPES', filteredOA],
    ['catSums has other:0 (net-worth safe)', catOther],
  ];

  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 900) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\n=== CORP title hover ===\n' + strip(corpT) +
    '\n\n=== OTHER TAXABLE title hover ===\n' + strip(otherT) +
    '\n\n=== OTHER ASSETS title hover (R396) ===\n' + strip(oaT) +
    '\n\n=== GROUNDS title (must stay plain, no ⓘ) ===\n' + strip(propT) +
    '\n\n=== PICKER ===\n' + strip(R.pickerHtml) + '\n';
  fs.writeFileSync('scripts/_gate_tax_routing.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
