/* Phase A ESTATE-DISSOLVE gate — asserts via the app render path (Lesson 47) that the estate stops
   reading as N sealed cells and becomes ONE floorplan. Drives the REAL render path
   (window.state.accounts = fixture -> window.updateSVGs()) and inspects #bp-svg.

   Resting (hydrated, isNew:false) estate must show:
     (1) exactly ONE .estate-envelope path (the home's perimeter);
     (2) OPEN rooms' .room-rect computes stroke:none (no per-room box);
     (3) PRIVATE rooms (Vault + debt) stay SEALED — full .estate-wall-private enclosures + a door each;
     (4) DISSOLUTION: doors exist ONLY on private rooms — total #bp-svg .wall-cutout === private count
         (open rooms contribute NO wall/door; at the locked openness=1 interior walls are fully gone).

   RED on 0c3dd42d (no envelope, room-rect strokes teal, no private walls, a door on every shared wall).
   Usage: node scripts/_verify_phaseA_estate.js [LABEL]   (server up on :8001) */
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
    // joint column: Foyer + Safe (open, stacked) + Moat (debt, private)
    // primary column: Vault (private) + Conservatory + Foundation (open)
    window.state.accounts = [
      f('j_foyer', 'checking',      80000),
      f('j_safe',  'savings',       60000),
      f('j_moat',  'mortgage_joint', 200000),
      f('p_vault', 'pretax401k',    400000),
      f('p_cons',  'rothira',       150000),
      f('p_found', 'pension',       90000),
    ];
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await p.waitForTimeout(600);

  const R = await p.evaluate(() => {
    const svg = document.getElementById('bp-svg');
    const grp = (id) => Array.from(svg.querySelectorAll('g')).find(g => (g.getAttribute('onclick') || '').indexOf("'" + id + "'") >= 0) || null;
    const lineLen = (el) => {
      const x1 = +el.getAttribute('x1'), y1 = +el.getAttribute('y1'), x2 = +el.getAttribute('x2'), y2 = +el.getAttribute('y2');
      return Math.hypot(x2 - x1, y2 - y1);
    };
    // (1) envelope
    const envelopes = svg.querySelectorAll('.estate-envelope');
    // (2) open room stroke
    const foyer = grp('j_foyer');
    const foyerRect = foyer ? foyer.querySelector('.room-rect') : null;
    const foyerStroke = foyerRect ? getComputedStyle(foyerRect).stroke : 'MISSING';
    // (3) private enclosures + their doors
    const privWalls = svg.querySelectorAll('.estate-wall-private');
    const shellDoors = svg.querySelectorAll('.estate-shell .wall-cutout');
    // (4) dissolution: INTERIOR doors ONLY on private rooms. The A.1 exterior entry door is also a
    // .wall-cutout but is a single ESTATE entrance, not an interior per-room door -> exclude it.
    const totalCutouts = svg.querySelectorAll('.wall-cutout').length
      - svg.querySelectorAll('.estate-entry-door .wall-cutout').length;
    return {
      envCount: envelopes.length,
      foyerStroke,
      privCount: privWalls.length, shellDoorCount: shellDoors.length, totalCutouts
    };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(56)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== PHASE-A ESTATE GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('exactly ONE estate envelope', R.envCount === 1));
  checks.push(ok('open room .room-rect computes stroke:none', R.foyerStroke === 'none'));
  checks.push(ok('private (Vault+debt) enclosures present (>=2)', R.privCount >= 2));
  checks.push(ok('private rooms have a door', R.shellDoorCount >= 1));
  checks.push(ok('dissolution: doors ONLY on private rooms (cutouts === priv)', R.totalCutouts === R.privCount && R.privCount > 0));
  console.log('detail:', JSON.stringify(R));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
