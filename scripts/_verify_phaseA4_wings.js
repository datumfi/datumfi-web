/* Phase A.4 WING-DOOR gate — asserts via the app render path (Lesson 47) that a contiguous vertical
   RUN of sealed rooms (a "debt wing") gets ONE shared door, not one per room. A.4 SUPERSEDES the A.2
   single-room landlocked fallback for runs>=2; an isolated sealed room (run length 1) still follows
   the A.2 rule unchanged (named here so the supersession can NEVER be mistaken for an A.2 regression).

   Fixture A (4-debt stack beside an open column): the wing gets EXACTLY ONE open-facing door (today
   A.2 gives 4 -> RED).
   Fixture B (co-arch 3 all-debt columns): each column is its own wing -> 3 doors total (today 9 -> RED);
   zero sealed<->sealed doors. NOTE: a maximal run is always bounded above/below by an open room or the
   envelope edge, so NO wing is ever landlocked -> the landlocked-WING fallback is a defensive safety
   net, structurally unreachable; this fixture asserts that INVARIANT (every wing door is open/exterior).
   Isolated (run length 1): A.2 rule unchanged -> one open-facing door.
   Determinism: render twice -> identical positions. Usage: node scripts/_verify_phaseA4_wings.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const MK = `(id,baseId,value)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:false,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

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
  const touch = (c, r) => {
    if (Math.abs(c.y1-c.y2) < T) { const y=c.y1, xm=(c.x1+c.x2)/2;
      if (xm > r.x-T && xm < r.x+r.w+T) { if (Math.abs(y-r.y)<T) return true; if (Math.abs(y-(r.y+r.h))<T) return true; } }
    else { const x=c.x1, ym=(c.y1+c.y2)/2;
      if (ym > r.y-T && ym < r.y+r.h+T) { if (Math.abs(x-r.x)<T) return true; if (Math.abs(x-(r.x+r.w))<T) return true; } }
    return false;
  };
  const sealedSealed = cuts.filter(c => sealed.filter(r => touch(c, r)).length >= 2).length;
  const mids = cuts.map(c => Math.round((c.x1+c.x2)/2)+','+Math.round((c.y1+c.y2)/2)).sort();
  return { sealedCount: sealed.length, cutCount: cuts.length, sealedSealed, mids };
}`;

async function render(p, accts, coArch) {
  await p.evaluate(({ mk, a, co }) => { const f = eval(mk);
    var t = document.getElementById('co-arch-toggle'); if (t) t.checked = !!co;
    window.state.accounts = a.map(x => f(x[0], x[1], x[2])); if (window.updateSVGs) window.updateSVGs(); }, { mk: MK, a: accts, co: coArch });
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

  // Fixture A — 4-debt wing in primary beside the open joint column
  const fxA = [['p_lib','tradira',150000], ['p_gar','auto_debt_primary',60000], ['p_moat','mortgage_primary',200000], ['p_study','student_loan_primary',40000], ['p_furn','rev_debt_primary',30000],
               ['j_foyer','checking',80000], ['j_safe','savings',60000], ['j_liv','taxable',120000]];
  await render(p, fxA); const A1 = await p.evaluate(eval(ANALYZE));
  await render(p, fxA); const A2 = await p.evaluate(eval(ANALYZE));   // determinism

  // Fixture B — co-arch 3 all-debt columns -> 3 column-wings
  await render(p, [
    ['p1','mortgage_primary',100000], ['p2','auto_debt_primary',100000], ['p3','student_loan_primary',100000],
    ['j1','mortgage_joint',100000],   ['j2','auto_debt_joint',100000],   ['j3','rev_debt_joint',100000],
    ['c1','mortgage_co',100000],      ['c2','auto_debt_co',100000],      ['c3','student_loan_co',100000],
  ], true);
  const B = await p.evaluate(eval(ANALYZE));

  // Isolated sealed room (run length 1) — A.2 unchanged
  await render(p, [['i_foyer','checking',80000], ['i_moat','mortgage_joint',200000], ['i_liv','taxable',120000]]);
  const I = await p.evaluate(eval(ANALYZE));
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(60)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== PHASE-A.4 WING GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('A: 4-debt wing -> EXACTLY ONE door (not 4)', A1.cutCount === 1));
  checks.push(ok('A: wing door open-facing (zero sealed<->sealed)', A1.sealedSealed === 0));
  checks.push(ok('A: determinism (two renders identical)', JSON.stringify(A1.mids) === JSON.stringify(A2.mids)));
  checks.push(ok('B: 3 all-debt columns -> 3 wing doors (not 9)', B.cutCount === 3));
  checks.push(ok('B: no wing landlocked (fallback unreachable: zero sealed<->sealed)', B.sealedSealed === 0));
  checks.push(ok('Isolated (run len 1): A.2 unchanged -> one open-facing door', I.cutCount === 1 && I.sealedSealed === 0));
  console.log('detail A:', JSON.stringify({ cutCount:A1.cutCount, sealedSealed:A1.sealedSealed, sealedCount:A1.sealedCount }));
  console.log('detail B:', JSON.stringify({ cutCount:B.cutCount, sealedSealed:B.sealedSealed, sealedCount:B.sealedCount }));
  console.log('detail I:', JSON.stringify({ cutCount:I.cutCount, sealedSealed:I.sealedSealed, sealedCount:I.sealedCount }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
