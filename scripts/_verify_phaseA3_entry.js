/* Phase A.3 ENTRY gate — asserts via the app render path (Lesson 47) that the estate's entry (jut +
   cutout + door) attaches to the ONE room at the top-center, WHATEVER account it is, and that the jut
   region is FILLED with the entry room's gradient (no hollow notch).

   Fixture 1 (non-Foyer top-center): a column with a brokerage on top -> the entry attaches to it.
   Fixture 2 (Foyer top-center): Foyer on top -> entry + fill on it.
   RED on f5e0c1d (jut only fires for a Foyer at ri0 -> flat envelope / no fill for non-Foyer tops; and
   even a Foyer-top has NO jut fill today). Usage: node scripts/_verify_phaseA3_entry.js [LABEL]. */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const MK = `(id,baseId,value)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;
const TOP = 180;   // gY + 20 (the envelope's flat top y)

const ANALYZE = `() => {
  const svg = document.getElementById('bp-svg');
  const env = svg.querySelector('.estate-envelope');
  const d = env ? (env.getAttribute('d') || '') : '';
  const nums = (d.match(/-?\\d+\\.?\\d*/g) || []).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1);          // M x y L x y ... -> y are the odd indices
  const minY = ys.length ? Math.min.apply(null, ys) : 0;
  const jf = svg.querySelector('.estate-jut-fill');
  return {
    minEnvY: minY,
    doors: svg.querySelectorAll('.estate-entry-door').length,
    jutFill: !!jf,
    jutFillY: jf ? +jf.getAttribute('y') : null,
    jutFillGrad: jf ? /fillGrad/.test(jf.getAttribute('fill') || '') : false,
  };
}`;
async function render(p, accts) {
  await p.evaluate(({ mk, a }) => { const f = eval(mk); window.state.accounts = a.map(x => f(x[0], x[1], x[2])); if (window.updateSVGs) window.updateSVGs(); }, { mk: MK, a: accts });
  await p.waitForTimeout(450);
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  // Fixture 1 — non-Foyer top-center (Living Room on top, single column)
  await render(p, [['t_liv','taxable',120000], ['t_safe','savings',60000], ['t_arc','collectibles',40000]]);
  const F1 = await p.evaluate(eval(ANALYZE));
  // Fixture 2 — Foyer top-center
  await render(p, [['f_foyer','checking',80000], ['f_safe','savings',60000], ['f_liv','taxable',120000]]);
  const F2 = await p.evaluate(eval(ANALYZE));
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== PHASE-A.3 ENTRY GATE [' + LABEL + '] =====');
  const checks = [];
  // Fixture 1: entry on a NON-Foyer top room
  checks.push(ok('F1 non-Foyer: envelope has a jut (minY < top)', F1.minEnvY < TOP - 5));
  checks.push(ok('F1 non-Foyer: exactly one entry door', F1.doors === 1));
  checks.push(ok('F1 non-Foyer: jut FILLED in the jut region', F1.jutFill && F1.jutFillY < TOP && F1.jutFillGrad));
  // Fixture 2: Foyer top -> jut + filled
  checks.push(ok('F2 Foyer: envelope has a jut (minY < top)', F2.minEnvY < TOP - 5));
  checks.push(ok('F2 Foyer: jut FILLED in the jut region', F2.jutFill && F2.jutFillY < TOP && F2.jutFillGrad));
  console.log('detail F1:', JSON.stringify(F1));
  console.log('detail F2:', JSON.stringify(F2));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
