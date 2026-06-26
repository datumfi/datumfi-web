/* Phase A.1 EXTERIOR-DETAILING gate — asserts via the app render path (Lesson 47) that the ONE
   estate building reads as a real home: windows in the perimeter wall, a single exterior entry door,
   a load-bearing (heavier) outer-wall segment on the heaviest room, and one stair glyph.
   ESTATE-LEVEL articulation only (not per-room character).

   Drives the REAL render path (window.state.accounts = fixture -> window.updateSVGs()) and inspects
   #bp-svg. RED on a9c47235 (no .estate-window / .estate-entry-door / .estate-loadwall / .estate-stairs).
   Coexists with the Phase A gate (envelope/dissolution) and the queued Phase B gate (hallway).
   Usage: node scripts/_verify_phaseA1_exterior.js [LABEL]   (server up on :8001) */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

const MK = `(id,baseId,value)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

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

  await p.evaluate((mk) => {
    const f = eval(mk);
    // two columns with a clear perimeter; a Foyer (checking) on top, a heavy Vault (pretax401k), open rooms
    window.state.accounts = [
      f('j_foyer', 'checking',     80000),
      f('j_safe',  'savings',      60000),
      f('p_vault', 'pretax401k',   900000),   // heaviest -> load-bearing wall
      f('p_cons',  'rothira',      150000),
      f('p_found', 'pension',      90000),
    ];
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await p.waitForTimeout(600);

  const R = await p.evaluate(() => {
    const svg = document.getElementById('bp-svg');
    const lineW = (el) => parseFloat(getComputedStyle(el).strokeWidth) || parseFloat(el.getAttribute('stroke-width')) || 0;
    const env = svg.querySelector('.estate-envelope');
    const envW = env ? lineW(env) : 0;
    const loadwalls = Array.from(svg.querySelectorAll('.estate-loadwall'));
    const maxLoadW = loadwalls.reduce((m, el) => Math.max(m, lineW(el)), 0);
    return {
      windows: svg.querySelectorAll('.estate-window').length,
      doors: svg.querySelectorAll('.estate-entry-door').length,
      loadwalls: loadwalls.length, envW, maxLoadW,
      stairs: svg.querySelectorAll('.estate-stairs').length,
      envelope: svg.querySelectorAll('.estate-envelope').length,   // Phase A still intact
    };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(56)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== PHASE-A.1 EXTERIOR GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('Phase A intact: one envelope', R.envelope === 1));
  checks.push(ok('windows in the perimeter wall (>=1)', R.windows >= 1));
  checks.push(ok('exactly ONE exterior entry door', R.doors === 1));
  checks.push(ok('load-bearing wall segment present', R.loadwalls >= 1));
  checks.push(ok('load wall heavier than base envelope', R.maxLoadW > R.envW));
  checks.push(ok('one stair glyph', R.stairs >= 1));
  console.log('detail:', JSON.stringify(R));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
