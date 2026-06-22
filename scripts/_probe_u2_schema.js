/* U2 schema gate — RED pre-wire, GREEN post-wire. Unit (hub helpers) + integration (round-trip).
   Contracts: (1) monthly overhead total 1994.83 unchanged; (2) freq normalize (annual 1031 -> 85.92,
   quarterly 300 -> 100, monthly 1000 -> 1000, legacy {cost} -> cost); (3) migration defaults on a
   U1-shape {id,name,cost} item; (4) round-trip of all 7 new fields (amount,freq,category,endDate,
   endsAtRet,tag,note) through capture+restore. Usage: node scripts/_probe_u2_schema.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const BASE = 'http://127.0.0.1:8001/studio.html';
const COST = '#plumbing-list .plumbing-row .plumbing-cost';
const MANDATORY = [850, 429.99, 14.28, 43.86, 93.84, 175, 232.11, 23.85, 27.23, 104.67]; // monthly mandatory-bills total = 1994.83 (Wireframe "Survival Floor" — a budgeting figure, NOT the Shape floor)
const r2 = n => Math.round(n * 100) / 100;

async function fresh(b) {
  const c = await b.newContext(); const p = await c.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST, { timeout: 8000 });
  return { c, p };
}

(async () => {
  const b = await chromium.launch(); const R = {};
  // 1) MONTHLY OVERHEAD TOTAL (unit) — 10 mandatory monthly lines -> 1994.83
  try { const { c, p } = await fresh(b);
    R.floor = await p.evaluate(m => window.DatumBlueprint.upkeepMonthlyTotal({ upkeep: { items: m.map(a => ({ amount: a, freq: 'monthly' })) } }), MANDATORY);
    await c.close(); } catch (e) { R.floor = 'ERR:' + e.message; }
  // 2) FREQ NORMALIZE (unit)
  try { const { c, p } = await fresh(b);
    R.norm = await p.evaluate(() => ({
      ann: window.DatumBlueprint.upkeepMonthly({ amount: 1031, freq: 'annual' }),
      qtr: window.DatumBlueprint.upkeepMonthly({ amount: 300, freq: 'quarterly' }),
      mo:  window.DatumBlueprint.upkeepMonthly({ amount: 1000, freq: 'monthly' }),
      legacy: window.DatumBlueprint.upkeepMonthly({ cost: 350 }) }));
    await c.close(); } catch (e) { R.norm = 'ERR:' + e.message; }
  // 3) MIGRATION (integration) — U1-shape {name,cost} draft restores with defaults
  try { const { c, p } = await fresh(b);
    await p.evaluate(() => { const bp = DatumBlueprint['new'](); bp.upkeep.items = [{ name: 'Legacy', cost: 500 }];
      DatumBlueprint._internal.writeSessionDraft(bp); });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST); await p.waitForTimeout(400);
    R.mig = await p.evaluate(() => { const it = (window._getUpkeepModel().items || []).find(x => x.name === 'Legacy') || {};
      return { amount: it.amount, freq: it.freq, category: it.category, endsAtRet: it.endsAtRet, tag: it.tag, note: it.note }; });
    await c.close(); } catch (e) { R.mig = 'ERR:' + e.message; }
  // 4) ROUND-TRIP-7 (integration) — set all 7 fields -> capture -> reload -> restore -> survive
  try { const { c, p } = await fresh(b);
    await p.evaluate(() => { const m = window._getUpkeepModel();
      Object.assign(m.items[0], { amount: 1031, freq: 'annual', category: 'aspirational', endDate: '12/2032', endsAtRet: true, tag: 'manual', note: 'watch it' });
      window.renderUpkeep(); document.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.waitForTimeout(800); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(COST); await p.waitForTimeout(400);
    R.rt = await p.evaluate(() => { const it = window._getUpkeepModel().items[0];
      return { amount: it.amount, freq: it.freq, category: it.category, endDate: it.endDate, endsAtRet: it.endsAtRet, tag: it.tag, note: it.note }; });
    await c.close(); } catch (e) { R.rt = 'ERR:' + e.message; }
  // 5) DROPDOWN LEGIBILITY — freq <select> carries explicit theme bg (not white-on-white)
  try { const { c, p } = await fresh(b);
    R.css = await p.evaluate(() => { const s = document.querySelector('.plumbing-freq'); return s ? getComputedStyle(s).backgroundColor : null; });
    await c.close(); } catch (e) { R.css = 'ERR:' + e.message; }
  await b.close();

  const ok = (n, cond) => { console.log(`${n.padEnd(34)} -> ${cond ? 'GREEN' : 'RED'}`); return cond; };
  console.log('===== U2 GATE [' + LABEL + '] =====');
  const t1 = ok('1 Monthly overhead total 1994.83', r2(R.floor) === 1994.83);
  const t2 = ok('2 Freq normalize', R.norm && typeof R.norm === 'object' && r2(R.norm.ann) === 85.92 && r2(R.norm.qtr) === 100 && R.norm.mo === 1000 && R.norm.legacy === 350);
  const t3 = ok('3 Migration defaults', R.mig && typeof R.mig === 'object' && R.mig.amount === 500 && R.mig.freq === 'monthly' && R.mig.category === 'essential' && R.mig.tag === 'autopay');
  const t4 = ok('4 Round-trip-7 survives', R.rt && typeof R.rt === 'object' && r2(R.rt.amount) === 1031 && R.rt.freq === 'annual' && R.rt.category === 'aspirational' && R.rt.endDate === '12/2032' && R.rt.endsAtRet === true && R.rt.tag === 'manual' && R.rt.note === 'watch it');
  const t5 = ok('5 Dropdown legible (bg navy)', R.css === 'rgb(9, 18, 33)');
  console.log('detail:', JSON.stringify(R));
  console.log('OVERALL: ' + ((t1 && t2 && t3 && t4 && t5) ? 'GREEN' : 'RED'));
  process.exit((t1 && t2 && t3 && t4 && t5) ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
