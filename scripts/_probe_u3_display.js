/* U3 display-period gate — RED pre-wire, GREEN post-wire. View-only law enforced.
   Fixtures = Captain's real Floor: Mortgage 850 · HOA 429.99 · Spectrum 14.28 · ADT 43.86 ·
   Cell 93.84 · Electric 175 · Car-Ins 232.11 · Life-P 23.85 · Life-S 27.23 · House-Ins 104.67
   = 1994.83/mo. Display math: /wk 460.35 (x12/52) · /biwk 920.69 (x12/26) · /yr 23937.96 (x12) ·
   /day 65.58 (x12/365).
   Contracts: (a) canonical-monthly INVARIANT — cycling the toggle changes NO stored value
   (upkeepMonthlyTotal byte-identical, amount/freq untouched); (b) DISPLAY MATH to the cent on the
   split readout; (c) SHAPE-UNTOUCHED — bp + Shape verdict/datum identical across toggle states.
   Usage: node scripts/_probe_u3_display.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const BASE = 'http://127.0.0.1:8001/studio.html';
const COST = '#plumbing-list .plumbing-row .plumbing-cost';
const FLOOR = [['Mortgage',850],['HOA',429.99],['Spectrum',14.28],['ADT',43.86],['Cell',93.84],
               ['Electric',175],['Car Ins',232.11],['Life P',23.85],['Life S',27.23],['House Ins',104.67]]; // 1994.83
const r2 = n => Math.round(n * 100) / 100;
const num = s => parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')) || 0;

async function fresh(b) {
  const c = await b.newContext(); const p = await c.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST, { timeout: 8000 });
  // inject the real Floor fixture into the canonical model, then render
  await p.evaluate(rows => { const m = window._getUpkeepModel(); m.items.length = 0; m.charity.length = 0;
    rows.forEach(r => m.items.push({ id: 'g_' + Math.random().toString(36).slice(2), name: r[0], amount: r[1],
      freq: 'monthly', category: 'essential', endDate: '', endsAtRet: false, tag: 'autopay', note: '' }));
    window.renderUpkeep(); }, FLOOR);
  await p.waitForTimeout(150);
  return { c, p };
}
const overheadNum = p => p.$eval('#total-upkeep-val', el => el.textContent).then(num);

(async () => {
  const b = await chromium.launch(); const R = {};
  // (a) INVARIANT — cycle all periods, upkeepMonthlyTotal + amount/freq byte-identical
  try { const { c, p } = await fresh(b);
    R.inv = await p.evaluate(async () => {
      const snap = () => JSON.stringify((window._getUpkeepModel().items || []).map(i => [i.amount, i.freq]));
      const total = () => window.DatumBlueprint.upkeepMonthlyTotal({ upkeep: { items: window._getUpkeepModel().items } });
      const before = { s: snap(), t: total() }; const tots = [];
      for (const pd of ['weekly', 'biweekly', 'monthly', 'annual', 'daily']) { window.setDisplayPeriod(pd); tots.push(total()); }
      return { ok: snap() === before.s && tots.every(t => t === before.t), total: before.t };
    });
    await c.close(); } catch (e) { R.inv = 'ERR:' + e.message; }
  // (b) DISPLAY MATH to the cent on the split readout
  try { const { c, p } = await fresh(b); const got = {};
    for (const pd of ['monthly', 'weekly', 'biweekly', 'annual', 'daily']) { await p.evaluate(x => window.setDisplayPeriod(x), pd); got[pd] = await overheadNum(p); }
    R.disp = got; await c.close(); } catch (e) { R.disp = 'ERR:' + e.message; }
  // (c) SHAPE-UNTOUCHED — bp.upkeep + Shape verdict/datum identical across toggle states
  try { const { c, p } = await fresh(b);
    R.shape = await p.evaluate(async () => {
      const sig = () => JSON.stringify({
        datum: (document.getElementById('spend-input') || {}).value || '',
        verdict: (document.getElementById('shape-state-name') || {}).textContent || '',
        paths: Array.prototype.map.call(document.querySelectorAll('#shape-panel-svg path'), n => (n.getAttribute('d') || '').length)
      });
      const before = sig();
      for (const pd of ['weekly', 'daily', 'annual', 'monthly']) window.setDisplayPeriod(pd);
      return { ok: sig() === before };
    });
    await c.close(); } catch (e) { R.shape = 'ERR:' + e.message; }
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(40)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== U3 GATE [' + LABEL + '] =====');
  const ta = ok('a canonical-monthly INVARIANT', R.inv && R.inv.ok === true && r2(R.inv.total) === 1994.83);
  const tb = ok('b DISPLAY MATH to the cent', R.disp && typeof R.disp === 'object'
    && r2(R.disp.monthly) === 1994.83 && r2(R.disp.weekly) === 460.35 && r2(R.disp.biweekly) === 920.69
    && r2(R.disp.annual) === 23937.96 && r2(R.disp.daily) === 65.58);
  const tc = ok('c SHAPE-UNTOUCHED', R.shape && R.shape.ok === true);
  console.log('detail:', JSON.stringify(R));
  console.log('OVERALL: ' + ((ta && tb && tc) ? 'GREEN' : 'RED'));
  process.exit((ta && tb && tc) ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
