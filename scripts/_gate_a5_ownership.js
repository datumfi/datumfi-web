/* STEP A.5 — OWNERSHIP-REALISM gate (#227). Mints primary+co variants for the taxable family
   (taxable / taxable_corp / taxable_other / other_assets / property) as a PURE mirror of the joint
   parent, and proves the 5 acceptance checks against the served bytes + live engine surfaces:
     (a) all 10 minted defs exist with correct type/taxCode/meta (Co- prefix on nicknamed rooms only);
     (b) The Living Room / The Grounds / the fold-out trio now render in the Primary AND Co-Arch wings
         (RED-FIRST: Joint-only today);
     (c) 422 tripwire — every taxable-family variant is in ACCOUNT_TYPE_MAP→'taxable'; property/other_assets
         variants are FILTERED (never reach the strict engine enum); zero "Unmapped account type" console warn;
     (d) investableTotal parity — a taxable_primary balance counts like taxable; property/other_assets variants
         do NOT; existing id→enum mappings unchanged (unchanged-portfolio payload byte-identical);
     (e) DI routing — taxable_primary → Living Room engine + title; taxable_corp_primary → R393 intro;
         other_assets_primary → R396 intro.
   Usage: serve repo root on :8001, then node scripts/_gate_a5_ownership.js [LABEL]. Writes a UTF-8 dump. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const warns = [];
  p.on('console', (m) => { const t = m.text(); if (t.indexOf('Unmapped account type') >= 0) warns.push(t); });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const out = {};
    const gt = (id) => { const b = getBaseType(id); return b ? { type: b.type, taxCode: b.taxCode, meta: b.meta, owner: b.owner || null, isInv: !!b.isInvestment } : null; };
    const MINTED = ['taxable_primary','taxable_co','taxable_corp_primary','taxable_corp_co','taxable_other_primary','taxable_other_co','other_assets_primary','other_assets_co','property_primary','property_co'];
    out.defs = {}; MINTED.forEach(id => { out.defs[id] = gt(id); });

    // (b) picker — Co mode, named wings; capture Primary + Co wing slices
    const setN = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const setCo = (on) => { const el = document.getElementById('co-arch-toggle'); if (el) el.checked = on; };
    setN('primary-name', 'DANIEL'); setN('co-name', 'ANA'); setCo(true);
    try { renderInputs(); } catch (e) { out.err = String(e && e.message); }
    const H = (document.getElementById('space-dropdown') || {}).innerHTML || '';
    const sl = (a, c) => { const i = H.indexOf(a); if (i < 0) return ''; const j = c ? H.indexOf(c, i + a.length) : -1; return H.slice(i, j < 0 ? H.length : j); };
    out.priSlice = sl("DANIEL'S SPACES", "ANA'S SPACES");
    out.coSlice = sl("ANA'S SPACES", 'JOINT SPACES');

    // (d) investableTotal parity
    const inv = (accts) => (window.DatumBlueprint && DatumBlueprint.investableTotal) ? DatumBlueprint.investableTotal({ accounts: accts }) : null;
    out.invBase = inv([{ id: 'a', baseId: 'taxable', value: 1000 }]);
    out.invPlusPrimary = inv([{ id: 'a', baseId: 'taxable', value: 1000 }, { id: 'b', baseId: 'taxable_primary', value: 1000 }]);
    out.invProp = inv([{ id: 'c', baseId: 'property_primary', value: 5000 }]);
    out.invOA = inv([{ id: 'd', baseId: 'other_assets_primary', value: 5000 }]);

    // (e) DI routing — open the minted rooms
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '', assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    const income = () => [
      mk({ ticker: 'TLT', name: 'T', price: 100, shares: 250, assetClass: 'Bond', sector: 'Long Term Treasuries', instrumentType: 'ETF' }),
      mk({ ticker: 'VCIT', name: 'C', price: 100, shares: 200, assetClass: 'Bond', sector: 'Corporate Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'R', price: 100, shares: 200, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'D', price: 100, shares: 350, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
    ];
    const openBank = (baseId) => {
      try { addInstance(baseId); } catch (e) { return { body: '__THREW__:' + e.message, title: '' }; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return { body: '__NO_ACCOUNT__', title: '' };
      a.holdings = income(); a.showHoldings = true; try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      return { body: document.getElementById('modal-dynamic-content').innerHTML, title: (document.getElementById('modal-acc-title') || {}).innerHTML || '' };
    };
    const openValue = (baseId) => {
      try { addInstance(baseId); } catch (e) { return { title: '__THREW__:' + e.message }; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return { title: '__NO_ACCOUNT__' };
      a.value = 250000; window.openAccountModal(a.id);
      return { title: (document.getElementById('modal-acc-title') || {}).innerHTML || '' };
    };
    out.taxPrimary = openBank('taxable_primary');
    out.corpPrimary = openBank('taxable_corp_primary');
    out.oaPrimary = openValue('other_assets_primary');
    out.isTax = { p: _isTaxableRoom('taxable_primary'), corpP: _isTaxableRoom('taxable_corp_primary'), co: _isTaxableRoom('taxable_co') };
    return out;
  });
  await b.close();

  // (c)/(d) static source guards — the 422-critical maps are const-scoped (not observable in-browser)
  const src = fs.readFileSync('studio.html', 'utf8');
  const bp = fs.readFileSync('scripts/studio-blueprint.js', 'utf8');
  const mapHas = (id) => new RegExp(id + "\\s*:\\s*'taxable'").test(src);
  const filtHasBlock = /FILTERED_TYPES = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  const filt = filtHasBlock ? filtHasBlock[1] : '';
  const inFilt = (id) => filt.indexOf("'" + id + "'") >= 0;
  const bpHas = (id) => new RegExp(id + "\\s*:\\s*'taxable'").test(bp);

  const d = R.defs || {};
  const okDef = (id, type, taxCode, meta, owner) => { const x = d[id]; return !!x && x.type === type && x.taxCode === taxCode && x.meta === meta && (owner === undefined || x.owner === owner); };
  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const TAX_MARK = 'yield-tilted income sleeve';                       // Living Room AR-INCOME-YIELD archetype
  const LIVING_MARK = 'The Living Room — a Taxable Brokerage';
  const CORP_MARK = 'We flag it as entity-owned so your net worth stays honest'; // R393
  const OA_MARK = 'Walling it out keeps your investable mix honest';   // R396

  const checks = [
    // (a) defs correct
    ['(a) taxable_primary = primary/liquid/The Living Room', okDef('taxable_primary', 'primary', 'liquid', 'The Living Room')],
    ['(a) taxable_co = coarch/liquid/Co-Living Room', okDef('taxable_co', 'coarch', 'liquid', 'Co-Living Room')],
    ['(a) taxable_corp_primary = primary/liquid/Entity-owned + owner=entity', okDef('taxable_corp_primary', 'primary', 'liquid', 'Entity-owned taxable', 'entity')],
    ['(a) taxable_corp_co = coarch + owner=entity (no Co- on descriptive meta)', okDef('taxable_corp_co', 'coarch', 'liquid', 'Entity-owned taxable', 'entity')],
    ['(a) taxable_other_primary/_co = Uncategorized taxable', okDef('taxable_other_primary', 'primary', 'liquid', 'Uncategorized taxable') && okDef('taxable_other_co', 'coarch', 'liquid', 'Uncategorized taxable')],
    ['(a) other_assets_primary/_co = other/Value-only asset', okDef('other_assets_primary', 'primary', 'other', 'Value-only asset') && okDef('other_assets_co', 'coarch', 'other', 'Value-only asset')],
    ['(a) property_primary = primary/physical/The Grounds', okDef('property_primary', 'primary', 'physical', 'The Grounds')],
    ['(a) property_co = coarch/physical/Co-Grounds', okDef('property_co', 'coarch', 'physical', 'Co-Grounds')],
    ['(a) taxable_corp variants are isInvestment; other_assets are NOT', d.taxable_corp_primary && d.taxable_corp_primary.isInv === true && d.other_assets_primary && d.other_assets_primary.isInv === false],
    // (b) render in Primary + Co wings (red-first: Joint-only today)
    ['(b) Primary wing has taxable_primary + property_primary + taxable_corp_primary', has(R.priSlice, "addInstance('taxable_primary')") && has(R.priSlice, "addInstance('property_primary')") && has(R.priSlice, "addInstance('taxable_corp_primary')")],
    ['(b) Primary wing shows Co-less nicknames (The Living Room / The Grounds)', has(R.priSlice, "addInstance('taxable_primary')\">Taxable Brokerage <span>The Living Room</span>") && has(R.priSlice, "addInstance('property_primary')\">Real Estate <span>The Grounds</span>")],
    ['(b) Co-Arch wing has taxable_co + property_co (Co- nicknames)', has(R.coSlice, "addInstance('taxable_co')\">Taxable Brokerage <span>Co-Living Room</span>") && has(R.coSlice, "addInstance('property_co')\">Real Estate <span>Co-Grounds</span>")],
    ['(b) Co-Arch wing has the fold-out trio variants', has(R.coSlice, "addInstance('taxable_corp_co')") && has(R.coSlice, "addInstance('taxable_other_co')") && has(R.coSlice, "addInstance('other_assets_co')")],
    // (c) 422 tripwire
    ['(c) ACCOUNT_TYPE_MAP: taxable_primary/_co → taxable', mapHas('taxable_primary') && mapHas('taxable_co')],
    ['(c) ACCOUNT_TYPE_MAP: taxable_corp/other variants → taxable', mapHas('taxable_corp_primary') && mapHas('taxable_corp_co') && mapHas('taxable_other_primary') && mapHas('taxable_other_co')],
    ['(c) FILTERED_TYPES: property + other_assets variants filtered', inFilt('property_primary') && inFilt('property_co') && inFilt('other_assets_primary') && inFilt('other_assets_co')],
    ['(c) property/other_assets variants NOT in ACCOUNT_TYPE_MAP (mirror: filtered, not enum)', !mapHas('property_primary') && !mapHas('other_assets_primary')],
    ['(c) taxable variants NOT in FILTERED_TYPES (mirror: they feed the engine)', !inFilt('taxable_primary') && !inFilt('taxable_corp_primary')],
    ['(c) zero "Unmapped account type" console warn', warns.length === 0],
    // (d) investableTotal parity + existing mapping unchanged
    ['(d) taxable_primary counts like taxable (1000 → 2000)', R.invBase === 1000 && R.invPlusPrimary === 2000],
    ['(d) property_primary + other_assets_primary do NOT feed investableTotal', R.invProp === 0 && R.invOA === 0],
    ['(d) BASE_TO_BUCKET: taxable_primary/_co → taxable (corp/other stay absent)', bpHas('taxable_primary') && bpHas('taxable_co') && !/taxable_corp_primary\s*:/.test(bp)],
    ['(d) existing mappings unchanged (taxable→taxable, roth401k→roth_401k)', /\btaxable:\s*'taxable'/.test(src) && /roth401k:\s*'roth_401k'/.test(src)],
    // (e) DI routing
    ['(e) taxable_primary → Living Room engine (archetype) + title', has(R.taxPrimary.body, TAX_MARK) && has(R.taxPrimary.title, LIVING_MARK)],
    ['(e) taxable_corp_primary → R393 entity-owned intro', has(R.corpPrimary.title, CORP_MARK)],
    ['(e) other_assets_primary → R396 value-only intro', has(R.oaPrimary.title, OA_MARK)],
    ['(e) _isTaxableRoom matches taxable_primary/_co + taxable_corp_primary', R.isTax && R.isTax.p === true && R.isTax.co === true && R.isTax.corpP === true],
    // hygiene
    ['renderInputs did not throw', !R.err],
  ];

  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\ninv: base=' + R.invBase + ' +primary=' + R.invPlusPrimary + ' prop=' + R.invProp + ' oa=' + R.invOA + ' warns=' + warns.length +
    '\n\n=== PRIMARY WING (variants) ===\n' + strip(R.priSlice) +
    '\n\n=== CO WING (variants) ===\n' + strip(R.coSlice) + '\n';
  fs.writeFileSync('scripts/_gate_a5_ownership.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
