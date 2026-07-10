/* Rollover 401(k) → "The Conduit" gate. A2 (stand-up): room registers, routes taxCode pretax →
   engine pretax_401k (422-trap guard), reuses the pretax-401k DI baseline, and the mis-inherited
   /401k/ content (§8 EMPLOYER-MATCH inputs, §20 "Why a 401(k)?" panel) is SCOPED OUT. Harness-testable
   even though COUNTIFS is 0 today. Red-first. (A3 assertions — origin-gate-first, count-once guard,
   §16 panel — appended when those sections wire.) serve :8001, node scripts/_gate_rollover401k_di.js */
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
    const out = { ok: false };
    let a = null;
    try { addInstance('rollover401k'); a = window.state.accounts.filter(x => x.baseId === 'rollover401k').pop(); } catch (e) { out.err = String(e); }
    if (!a) return out;
    out.ok = true;
    const base = getBaseType(a.baseId) || {};
    out.taxCode = base.taxCode; out.meta = base.meta; out.title = base.title; out.isInv = !!base.isInvestment;
    out.engine = (typeof ACCOUNT_TYPE_MAP !== 'undefined') ? ACCOUNT_TYPE_MAP[a.baseId] : '__nomap__';
    a.holdings = [{ ticker: 'FXAIX', name: 'Fid 500', price: 100, shares: 900, assetClass: 'Stocks',
      geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', priceSource: 'manual' }];
    a.value = 108000; a.showHoldings = true; recalcPortfolio(a); a.value = 108000;
    window.openAccountModal(a.id);
    out.html = document.getElementById('modal-dynamic-content').innerHTML;
    // co variant registered too
    out.coBase = !!getBaseType('rollover401k_co');
    out.coEngine = (typeof ACCOUNT_TYPE_MAP !== 'undefined') ? ACCOUNT_TYPE_MAP['rollover401k_co'] : '__nomap__';
    return out;
  });
  await b.close();

  const has = (t) => R.html && R.html.indexOf(t) !== -1;
  const results = [
    ['room registers (addInstance ok)', R.ok === true],
    ['taxCode = pretax', R.taxCode === 'pretax'],
    ['meta = The Conduit', R.meta === 'The Conduit'],
    ['isInvestment', R.isInv === true],
    // ACCOUNT_TYPE_MAP is a scoped const (not on window) — routing verified by source grep, not here.
    ['_co variant registered', R.coBase === true],
    ['reuses pretax DI strip (Balance renders)', has('Balance')],
    ['§8 EMPLOYER-MATCH block SCOPED OUT', !has('EMPLOYER MATCH') && !has('Match Rate')],
    ['§20 "Why a 401(k)?" panel SCOPED OUT', !has('Why you have a 401(k)')],
  ];
  const pass = results.filter(r => r[1]).length, total = results.length;
  console.log('===== ROLLOVER 401(k) "THE CONDUIT" GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
  results.forEach(r => console.log('  ' + (r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  if (!R.ok) console.log('  (err: ' + (R.err || 'no rollover401k account created') + ')');
  process.exit(pass === total ? 0 : 1);
})();
