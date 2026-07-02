/* 403(b)+HSA rooms gate — RED-first for the 3-new-rooms build (The Tenure / The Chancel /
   The Infirmary). Asserts via the app's OWN paths (Lesson 47): addInstance -> estate render ->
   modal HTML -> hub weights -> WANT waterfall. Negative controls reproduce the exact symptom:
   on pre-build code every block below is RED because the registry rows don't exist.
   Usage: node scripts/_gate_403_hsa_rooms.js [LABEL]   (serve repo root on :8001 first) */
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

  // ---- Block 1: registry + estate render + hub exclusion + routing ----
  await p.evaluate(() => {
    const tryAdd = id => { try { addInstance(id); } catch (e) { /* missing registry row -> RED below */ } };
    if (window.addInstance) { tryAdd('trad403'); tryAdd('roth403'); tryAdd('hsa'); }
    // give the new rooms real value through the app's own field path so weights/routing are live
    (window.state.accounts || []).forEach(a => {
      if (a.baseId === 'trad403') a.value = 100000;
      if (a.baseId === 'roth403') a.value = 50000;
      if (a.baseId === 'hsa')     a.value = 30000;
    });
    if (window.toggleThermal) window.toggleThermal();
    if (window.toggleRouting) window.toggleRouting();
    if (window.updateSVGs) window.updateSVGs();
  });
  await p.waitForTimeout(650);

  const D = await p.evaluate(() => {
    const reg = id => (typeof getBaseType === 'function' ? getBaseType(id) : null) ||
                      (window.state.accounts.find(a => a.baseId === id) ? {} : null);
    const base = id => { try { return getBaseType(id); } catch (e) { return null; } };
    const svg = document.getElementById('bp-svg') ? document.getElementById('bp-svg').innerHTML : '';
    const acc = id => window.state.accounts.find(a => a.baseId === id);
    const roomEl = id => { const a = acc(id); return a ? document.querySelector(`[data-route-order]#room-${a.id}`) : null; };
    const routeOrderOf = id => {
      const a = acc(id); if (!a) return null;
      const els = document.querySelectorAll('#bp-svg g[data-route-order]');
      for (const el of els) { if ((el.getAttribute('onclick') || el.innerHTML).indexOf(a.id) !== -1) return el.getAttribute('data-route-order'); }
      // fallback: descriptor-less lookup by label — route order only needed as present/absent
      return null;
    };
    const routedIds = Array.from(document.querySelectorAll('#bp-svg [data-route-order]')).map(el => el.outerHTML);
    const hsaAcc = acc('hsa');
    const weights = (window.DatumBlueprint && DatumBlueprint.accountWeights)
      ? DatumBlueprint.accountWeights({ accounts: window.state.accounts }) : {};
    const invTotal = (window.DatumBlueprint && DatumBlueprint.investableTotal)
      ? DatumBlueprint.investableTotal({ accounts: window.state.accounts }) : -1;
    // WANT waterfall exclusion — the app's own math module
    let wf = null;
    if (window.DatumMath && DatumMath.waterfall) {
      const accts = window.state.accounts.map(a => {
        const b2 = base(a.baseId); if (!b2) return null;
        return { id: a.id, taxCode: b2.taxCode, value: Math.abs(a.value || 0), isInvestment: !!b2.isInvestment, meta: b2.meta };
      }).filter(Boolean);
      wf = DatumMath.waterfall({ accounts: accts, spendAnnual: 170000, incomeAnnual: 0 });
    }
    const b403 = base('trad403'), r403 = base('roth403'), bhsa = base('hsa');
    const cssHsa = Array.from(document.styleSheets).some(ss => {
      try { return Array.from(ss.cssRules).some(r => r.selectorText && r.selectorText.indexOf('.tax-hsa') !== -1); }
      catch (e) { return false; }
    });
    return {
      regTrad403: !!(b403 && b403.taxCode === 'pretax' && b403.meta === 'The Tenure' && b403.type === 'primary'),
      regRoth403: !!(r403 && r403.taxCode === 'roth' && r403.meta === 'The Chancel' && r403.type === 'primary'),
      regHsa:     !!(bhsa && bhsa.taxCode === 'hsa' && bhsa.meta === 'The Infirmary' && bhsa.type === 'primary'),
      regCo: !!(base('trad403_co') && base('roth403_co') && base('hsa_co')),
      tenureLabel:   svg.indexOf('THE TENURE') !== -1,
      chancelLabel:  svg.indexOf('THE CHANCEL') !== -1,
      infirmLabel:   svg.indexOf('THE INFIRMARY') !== -1,
      hsaThermal:    svg.indexOf('tax-hsa') !== -1,
      cssHsa: cssHsa,
      hsaFrictionDefault: !!(hsaAcc && hsaAcc.isFriction === true),
      tradFrictionDefault: !!(acc('trad403') && acc('trad403').isFriction === false),
      // hub: 403b IN the investable mass, HSA OUT (weight 0), estate total INCLUDES the HSA
      invTotal: invTotal,
      hsaWeight: hsaAcc ? weights[hsaAcc.id] : null,
      tradWeight: acc('trad403') ? weights[acc('trad403').id] : null,
      grossText: (document.getElementById('gross-estate-val').innerText || '').trim(),
      // routing: 403b rooms carry a route order, the HSA never does
      routedHTML: Array.from(document.querySelectorAll('#bp-svg [data-route-order]')).map(e => (e.textContent || '')).join('|'),
      wfDrawnFrom: wf ? wf.hops.map(h => h.taxCode).join(',') : '(no DatumMath)'
    };
  });

  // ---- Block 2: modal assertions (403b limits + rule-of-55 + 15-yr; HSA gate-first + tiers; 457 fix) ----
  const M = await p.evaluate(() => {
    const acc = id => window.state.accounts.find(a => a.baseId === id);
    const modalFor = baseId => {
      const a = acc(baseId); if (!a) return '';
      window.openAccountModal(a.id);
      const el = document.getElementById('modal-dynamic-content');
      return el ? el.innerHTML : '';
    };
    const t = modalFor('trad403');
    try { if (window.addInstance) addInstance('pretax457b'); } catch (e) {}
    const s = modalFor('pretax457b');
    const h = modalFor('hsa');
    return {
      t403_limitName:  t.indexOf('403(b) Limits') !== -1,
      t403_base2026:   t.indexOf('24500') !== -1,
      t403_rule55:     t.indexOf('Rule of 55') !== -1,
      t403_15yr:       /15[- ]?(Yr|Year)/i.test(t),
      t403_header2026: t.indexOf('2026 IRS limits') !== -1,
      // live-bug fix (was "IRA Limits"); label upgraded to bank-authored "457(b) Limits" in the
      // 457 Copy Bank pass (R68 verbatim) — the guarded invariant stays IRA-limits-ABSENT.
      s457_limitName:  s.indexOf('(457(b) Limits)') !== -1 && s.indexOf('(IRA Limits)') === -1,
      s457_base2026:   s.indexOf('24500') !== -1,
      s457_noRule55:   s.indexOf('Rule of 55') === -1,               // 457(b) has no penalty; no Rule-55 axis
      hsa_gate:        h.indexOf('HSA ELIGIBILITY') !== -1,
      hsa_gateFirst:   h.indexOf('HSA ELIGIBILITY') !== -1 && h.indexOf('HSA ELIGIBILITY') < (h.indexOf('WITHDRAWAL') === -1 ? 1e9 : h.indexOf('WITHDRAWAL')),
      hsa_threeWay:    h.indexOf('20% penalty') !== -1 && /no penalty/i.test(h) && /[Tt]ax-free, penalty-free/.test(h),
      hsa_selfLimit:   h.indexOf('4,400') !== -1 || h.indexOf('4400') !== -1,
      hsa_famLimit:    h.indexOf('8,750') !== -1 || h.indexOf('8750') !== -1,
      hsa_catch55:     h.indexOf('55') !== -1 && h.indexOf('1,000') !== -1,
      hsa_employer:    /employer/i.test(h),
      hsa_noRMD:       /RMD/i.test(h),
      hsa_noRothScaffold: h.indexOf('Catch-Up (50+)') === -1 && h.indexOf('Rule of 55') === -1,
      hsa_setAsideOn:  /earmarked for medical/i.test(h)
    };
  });

  // ---- Block 3: $0 not-held honesty — fresh state, rooms at $0 move no total ----
  const Z = await p.evaluate(() => {
    window.state.accounts.length = 0;
    const tryAdd = id => { try { addInstance(id); } catch (e) {} };
    if (window.addInstance) { tryAdd('hsa'); tryAdd('trad403'); }
    if (window.updateSVGs) window.updateSVGs();
    const inv = (window.DatumBlueprint && DatumBlueprint.investableTotal)
      ? DatumBlueprint.investableTotal({ accounts: window.state.accounts }) : -1;
    return new Promise(res => setTimeout(() => res({
      inv: inv,
      gross: (document.getElementById('gross-estate-val').innerText || '').trim(),
      fabricated: window.state.accounts.some(a => (a.value || 0) !== 0)
    }), 650));
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(46)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== 403(b)+HSA ROOMS GATE [' + LABEL + '] =====');
  let all = true;
  all = ok('registry: trad403 pretax/The Tenure',      D.regTrad403) && all;
  all = ok('registry: roth403 roth/The Chancel',       D.regRoth403) && all;
  all = ok('registry: hsa hsa/The Infirmary',          D.regHsa) && all;
  all = ok('registry: _co twins present',              D.regCo) && all;
  all = ok('estate: THE TENURE on the wall',           D.tenureLabel) && all;
  all = ok('estate: THE CHANCEL on the wall',          D.chancelLabel) && all;
  all = ok('estate: THE INFIRMARY on the wall',        D.infirmLabel) && all;
  all = ok('estate: tax-hsa thermal class emitted',    D.hsaThermal) && all;
  all = ok('css: .tax-hsa wall rule exists',           D.cssHsa) && all;
  all = ok('hsa: set-aside (isFriction) defaults ON',  D.hsaFrictionDefault) && all;
  all = ok('403b: isFriction defaults OFF',            D.tradFrictionDefault) && all;
  all = ok('hub: investableTotal = 150k (403b in, hsa out)', D.invTotal === 150000) && all;
  all = ok('hub: hsa weight = 0',                      D.hsaWeight === 0) && all;
  all = ok('hub: trad403 weight > 0',                  D.tradWeight > 0) && all;
  all = ok('estate: gross INCLUDES hsa (=$180,000)',   D.grossText === '$180,000') && all;
  all = ok('routing: waterfall never draws hsa',       D.wfDrawnFrom.indexOf('hsa') === -1 && D.wfDrawnFrom.indexOf('pretax') !== -1) && all;
  all = ok('modal: 403(b) Limits label',               M.t403_limitName) && all;
  all = ok('modal: 403(b) base 24,500 (2026)',         M.t403_base2026) && all;
  all = ok('modal: 403(b) Rule of 55 present',         M.t403_rule55) && all;
  all = ok('modal: 403(b) 15-yr service tier',         M.t403_15yr) && all;
  all = ok('modal: header cites 2026 IRS limits',      M.t403_header2026) && all;
  all = ok('modal: 457(b) limits bug FIXED',           M.s457_limitName && M.s457_base2026) && all;
  all = ok('modal: 457(b) has NO Rule-55 axis',        M.s457_noRule55) && all;
  all = ok('modal: HSA eligibility gate present',      M.hsa_gate) && all;
  all = ok('modal: HSA gate renders FIRST',            M.hsa_gateFirst) && all;
  all = ok('modal: HSA three-way withdrawal rule',     M.hsa_threeWay) && all;
  all = ok('modal: HSA self $4,400 / family $8,750',   M.hsa_selfLimit && M.hsa_famLimit) && all;
  all = ok('modal: HSA 55+ $1,000 catch-up',           M.hsa_catch55) && all;
  all = ok('modal: HSA employer-consumes-limit',       M.hsa_employer) && all;
  all = ok('modal: HSA no-RMD line',                   M.hsa_noRMD) && all;
  all = ok('modal: no [R]/[T] scaffold leaked into HSA', M.hsa_noRothScaffold) && all;
  all = ok('modal: HSA set-aside copy present',        M.hsa_setAsideOn) && all;
  all = ok('$0 honesty: investableTotal 0, no fabrication', Z.inv === 0 && !Z.fabricated) && all;
  console.log('detail:', JSON.stringify({ D, M, Z }));
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
