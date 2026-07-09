/* _gate_w7w8_parity.js — STEP A item (a): universal rollup strip + tax-lot ticker-bar cols canonical
 * across EVERY bank investment room. RED-first. Drives the app's own path (open each decorate modal).
 *
 * Asserts, for each BANK investment room (crypto DEFERRED, 529 bespoke — both excluded):
 *   1. The 11 canonical rollup fields render (value or "—"), in order:
 *      Account Value · Equity % · Bond % · Cash % · International · Balance · Annual Contribution ·
 *      Unrealized Gain · Weighted Beta · Blended Yield · Avg Expense
 *   2. The 3 tax-lot table columns render (header present): Cost Basis · Unrealized Gain · Acquisition Date
 *   3. The room's AUTHORED §Rollup Parity hover substring is present (verbatim spot-checks) — proves
 *      the right lens, not a generic hover.
 * Usage: serve repo root on :8001, then node scripts/_gate_w7w8_parity.js
 */
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8001/studio.html';

const ROLLUP = ['Account Value','Equity %','Bond %','Cash %','International','Balance','Annual Contribution','Unrealized Gain','Weighted Beta','Blended Yield','Avg Expense'];
const TAXLOT = ['Cost Basis','Unrealized Gain','Acquisition Date'];
// authored §Rollup Parity verbatim spot-checks per room (distinctive substrings)
// Only NEW/authored copy this pass installs is asserted. 401k/IRA/457/taxable KEEP their existing
// rollup-field hovers (unchanged this pass); the new authored text for them is the TAX-LOT COLUMN
// hovers. HSA + 403 get the FULL-authored rollup install (Captain ruling), so their rollup-field
// substrings are asserted too.
const HOVER = {
  taxable:    ['already-taxed and fully liquid'],                                   // existing Balance r414 (ref)
  roth401k:   ['no capital-gains tax to drive'],                                    // NEW Cost Basis col r395
  pretax401k: ['no capital-gains tax to drive'],
  rothira:    ['holding-period clock does not run'],                                // NEW Acq Date col r283
  tradira:    ['holding-period clock does not run'],
  roth457b:   ['holding-period clock does not run'],                               // NEW Acq Date col r266
  pretax457b: ['holding-period clock does not run'],
  hsa:        ['triple-tax-free crown jewel', 'no holding-period tax event', 'stealth retirement account'], // full-authored Balance r244 + AcqDate col r252 + restored line
  trad403:    ['it never drives a tax event', 'holding-period clock does not run'],// full-authored UG rollup r292 + Acq Date col r298
  roth403:    ['it never drives a tax event']
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1920, height: 1080 });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });

  const rooms = Object.keys(HOVER);
  const data = await p.evaluate(async (rooms) => {
    const mk = (o) => Object.assign({ ticker:'', name:'', price:'', shares:'', sector:'', expRatio:'', assetClass:'', costBasis:'', beta:'', dividendYield:'', geography:'', instrumentType:'', acquisitionDate:'', priceSource:'manual' }, o);
    const res = {};
    for (const id of rooms) {
      try { addInstance(id); } catch (e) {}
      const a = window.state.accounts.find(x => x.baseId === id);
      if (!a) { res[id] = { missing: true }; continue; }
      a.holdings = [ mk({ ticker:'VOO', name:'Vanguard', price:100, shares:100, costBasis:'8000', acquisitionDate:'2021-01-01', assetClass:'Stocks', geography:'US Stocks - Large Blend', sector:'Large Cap', instrumentType:'ETF', beta:'1.0', dividendYield:'1.3', expRatio:'0.03' }) ];
      if (typeof recalcPortfolio === 'function') recalcPortfolio(a);
      a.showHoldings = true; window.openAccountModal(a.id);
      const html = document.getElementById('modal-dynamic-content').innerHTML;
      const rollup = [...html.matchAll(/hr-lbl[^>]*>([^<]+)</g)].map(m => m[1].trim());
      const ths = (html.match(/<th[^>]*>[\s\S]*?<\/th>/g) || []).map(t => { const m = t.match(/>([A-Za-z][A-Za-z %\/]*?)</); return m ? m[1].trim() : ''; });
      res[id] = { rollup, ths, html };
    }
    return res;
  }, rooms);
  await b.close();

  let fails = 0;
  const ok = (n, c) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); if (!c) fails++; return c; };
  console.log('STEP A (a) — universal rollup + tax-lot col parity gate\n');
  for (const id of rooms) {
    const r = data[id];
    console.log(`== ${id} ==`);
    if (!r || r.missing) { ok(id + ': room exists', false); continue; }
    // 1. 11 rollup fields in order
    ROLLUP.forEach((f, i) => { ok(`${id}: rollup[${i}] = "${f}"`, r.rollup[i] === f); });
    // 2. 3 tax-lot table columns present
    TAXLOT.forEach((c) => { ok(`${id}: tax-lot col "${c}"`, r.ths.includes(c)); });
    // 3. authored hover substrings present
    (HOVER[id] || []).forEach((sub) => { ok(`${id}: authored hover "${sub.slice(0,32)}…"`, r.html.indexOf(sub) !== -1); });
  }
  console.log('\nOVERALL: ' + (fails ? 'RED (' + fails + ' failing)' : 'GREEN'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
