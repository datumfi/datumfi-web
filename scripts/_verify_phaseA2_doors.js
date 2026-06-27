/* Phase A.2 DOOR-RULE gate — asserts via the app render path (Lesson 47) that a sealed room gets ONE
   door on an OPEN-facing / EXTERIOR wall and NEVER on a wall shared with another sealed room.

   Reproduces the EXACT symptom: stacked debts (Library(open) -> Garage -> Moat -> Study) beside an
   open column. TODAY the middle Moat collects 3 doors (1 top + 2 coincident bottom). After the fix
   each sealed room has exactly ONE door, none on a sealed<->sealed wall.

   Fixture A (escape available): each sealed room exactly 1 door; NO door on a sealed<->sealed wall.
   Determinism: render twice -> identical door positions (no jitter).
   Fixture B (landlocked): middle column surrounded by sealed -> each sealed room still has exactly 1
     door (never doorless); the landlocked door is the NAMED fallback (it MAY sit on a sealed wall).
   RED on f18819f (bug live) -> GREEN after. Usage: node scripts/_verify_phaseA2_doors.js [LABEL]. */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const MK = `(id,baseId,value)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

// in-page analysis: sealed rects (.estate-wall-private) + private-door cutouts (exclude entry door)
const ANALYZE = `() => {
  const svg = document.getElementById('bp-svg');
  const sealed = Array.from(svg.querySelectorAll('.estate-wall-private')).map(el => ({
    x:+el.getAttribute('x'), y:+el.getAttribute('y'), w:+el.getAttribute('width'), h:+el.getAttribute('height') }));
  const entry = new Set(Array.from(svg.querySelectorAll('.estate-entry-door .wall-cutout')));
  const seg = (el) => {
    if (el.tagName.toLowerCase()==='line') return {x1:+el.getAttribute('x1'),y1:+el.getAttribute('y1'),x2:+el.getAttribute('x2'),y2:+el.getAttribute('y2')};
    const m = (el.getAttribute('d')||'').match(/M\\s*(-?[\\d.]+)\\s+(-?[\\d.]+)\\s*L\\s*(-?[\\d.]+)\\s+(-?[\\d.]+)/);
    return m ? {x1:+m[1],y1:+m[2],x2:+m[3],y2:+m[4]} : null;
  };
  const cuts = Array.from(svg.querySelectorAll('.wall-cutout')).filter(el => !entry.has(el)).map(seg).filter(Boolean);
  const T = 2.5;
  const touches = (c, r) => {
    if (Math.abs(c.y1-c.y2) < T) { const y=c.y1, xm=(c.x1+c.x2)/2;
      if (xm > r.x-T && xm < r.x+r.w+T) { if (Math.abs(y-r.y)<T) return true; if (Math.abs(y-(r.y+r.h))<T) return true; } }
    else { const x=c.x1, ym=(c.y1+c.y2)/2;
      if (ym > r.y-T && ym < r.y+r.h+T) { if (Math.abs(x-r.x)<T) return true; if (Math.abs(x-(r.x+r.w))<T) return true; } }
    return false;
  };
  const perRoom = sealed.map(r => cuts.filter(c => touches(c, r)).length);          // doors touching each sealed room
  const sealedSealed = cuts.filter(c => sealed.filter(r => touches(c, r)).length >= 2).length;  // doors on sealed<->sealed walls
  const mids = cuts.map(c => Math.round((c.x1+c.x2)/2)+','+Math.round((c.y1+c.y2)/2)).sort();
  return { sealedCount: sealed.length, cutCount: cuts.length, perRoom, sealedSealed, mids };
}`;

async function render(p, accts, coArch) {
  await p.evaluate(({ mk, a, co }) => {
    const f = eval(mk);
    var t = document.getElementById('co-arch-toggle'); if (t) t.checked = !!co;   // co-arch -> activates coarch column
    window.state.accounts = a.map(x => f(x[0], x[1], x[2]));
    if (window.updateSVGs) window.updateSVGs();
  }, { mk: MK, a: accts, co: coArch });
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

  // Fixture A — debts stacked in primary beside the open joint column
  await render(p, [
    ['p_lib','tradira',150000], ['p_gar','auto_debt_primary',60000], ['p_moat','mortgage_primary',200000], ['p_study','student_loan_primary',40000],
    ['j_foyer','checking',80000], ['j_safe','savings',60000], ['j_liv','taxable',120000],
  ]);
  const A1 = await p.evaluate(eval(ANALYZE));
  await render(p, [   // re-render identical for determinism
    ['p_lib','tradira',150000], ['p_gar','auto_debt_primary',60000], ['p_moat','mortgage_primary',200000], ['p_study','student_loan_primary',40000],
    ['j_foyer','checking',80000], ['j_safe','savings',60000], ['j_liv','taxable',120000],
  ]);
  const A2 = await p.evaluate(eval(ANALYZE));

  // Fixture B — 3 all-debt columns (equal value, co-arch ON so coarch is its own column) -> the
  // MIDDLE column's middle room is LANDLOCKED (sealed on all 4 sides) -> exercises the named fallback.
  await render(p, [
    ['p1','mortgage_primary',100000], ['p2','auto_debt_primary',100000], ['p3','student_loan_primary',100000],
    ['j1','mortgage_joint',100000],   ['j2','auto_debt_joint',100000],   ['j3','rev_debt_joint',100000],
    ['c1','mortgage_co',100000],      ['c2','auto_debt_co',100000],      ['c3','student_loan_co',100000],
  ], true);
  const B = await p.evaluate(eval(ANALYZE));
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== PHASE-A.2 DOOR GATE [' + LABEL + '] =====');
  const checks = [];
  // NOTE: A.4 SUPERSEDES A.2's per-room door COUNT for contiguous runs (a debt wing now shares ONE
  // door — see _verify_phaseA4_wings.js). This gate retains A.2's ENDURING invariant: NO door ever
  // sits on a sealed<->sealed wall (when an open/exterior escape exists). The per-room-count assertions
  // were RETIRED here, not regressed — the supersession is intentional and named.
  // Fixture A (3 stacked debts = one wing)
  checks.push(ok('A: sealed rooms found (3 debts)', A1.sealedCount === 3));
  checks.push(ok('A: stacked debts share ONE wing door (A.4 supersedes A.2 per-room)', A1.cutCount === 1));
  checks.push(ok('A: NO door on a sealed<->sealed wall (A.2 enduring invariant)', A1.sealedSealed === 0));
  // determinism
  checks.push(ok('determinism: two renders -> identical positions', JSON.stringify(A1.mids) === JSON.stringify(A2.mids)));
  // Fixture B (co-arch 3 all-debt columns = 3 column-wings). A.4 wing-level door makes the A.2 per-room
  // landlocked case unreachable -> zero sealed<->sealed doors (was >=1 under A.2's per-room fallback).
  checks.push(ok('B: 3 column-wings -> 3 doors (A.4, not 9 per-room)', B.cutCount === 3));
  checks.push(ok('B: A.4 eliminates the per-room landlocked case (no sealed<->sealed)', B.sealedSealed === 0));
  console.log('detail A:', JSON.stringify({ sealedCount:A1.sealedCount, perRoom:A1.perRoom, sealedSealed:A1.sealedSealed, cutCount:A1.cutCount }));
  console.log('detail B:', JSON.stringify({ sealedCount:B.sealedCount, perRoom:B.perRoom, sealedSealed:B.sealedSealed }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
