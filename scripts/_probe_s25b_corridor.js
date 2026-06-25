/* S2.5b corridor gate — asserts via the app render path (Lesson 47):
   - the renderer emits a [data-corridor] path between vertically-adjacent rooms (structure);
   - HYDRATED estate (rooms loaded already funded) -> corridor is STATIC-drawn (offset 0), NO anim
     (no mass-draw on load);
   - funding an empty room -> its corridor runs a stroke-dashoffset sequence that stays HIDDEN
     through the ~700ms WAIT then DRAWS to 0 (fund -> wait -> hallway, R2: energizer animates);
   - the draw RESUMES across a re-render (seek, not restart).
   RED today (renderer emits no corridor; connect() is an empty stub).
   Usage: node scripts/_probe_s25b_corridor.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const MK = `(id,baseId,value,isNew)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:!!isNew,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

async function freshPage(b) {
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);
  return p;
}
const corr = (p) => p.evaluate(() => {
  const el = document.querySelector('[data-corridor]');
  if (!el) return { found: false };
  const len = el.getTotalLength ? el.getTotalLength() : 0;
  const offset = parseFloat(getComputedStyle(el).strokeDashoffset) || 0;
  const anims = el.getAnimations ? el.getAnimations() : [];
  const a = anims.find(an => { try { return an.effect.getKeyframes().some(k => 'strokeDashoffset' in k); } catch (e) { return false; } });
  return { found: true, len, offset, hasAnim: !!a };
});

(async () => {
  const b = await chromium.launch();

  // ---- HYDRATE: two already-funded rooms -> corridor static-drawn, no anim (no mass-draw) ----
  const pH = await freshPage(b);
  await pH.evaluate((mk) => { const f = eval(mk);
    window.state.accounts = [ f('a', 'tradira', 50000, false), f('b', 'rothira', 80000, false) ];
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await pH.waitForTimeout(450);
  const H = await corr(pH);

  // ---- FUND: room a funded + room b EMPTY -> fund b -> wait-then-draw + continuity ----
  const pF = await freshPage(b);
  await pF.evaluate((mk) => { const f = eval(mk);
    window.state.accounts = [ f('a', 'tradira', 50000, false), f('b', 'rothira', 0, false) ];
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await pF.waitForTimeout(400);
  const beforeFund = await corr(pF);                              // b empty -> corridor hidden
  await pF.evaluate(() => { window.state.accounts[1].value = 90000; if (window.updateSVGs) window.updateSVGs(); });
  await pF.waitForTimeout(300);                                   // ~300ms into the WAIT
  // continuity capture
  const c1 = await pF.evaluate(() => { const el = document.querySelector('[data-corridor]');
    const a = el && el.getAnimations().find(x => { try { return x.effect.getKeyframes().some(k => 'strokeDashoffset' in k); } catch (e) { return false; } });
    return a ? { ct: a.currentTime, t: performance.now() } : null; });
  await pF.waitForTimeout(450);
  await pF.evaluate(() => { if (window.updateSVGs) window.updateSVGs(); });   // re-render mid-sequence
  await pF.waitForTimeout(200);
  const c2 = await pF.evaluate(() => { const el = document.querySelector('[data-corridor]');
    const a = el && el.getAnimations().find(x => { try { return x.effect.getKeyframes().some(k => 'strokeDashoffset' in k); } catch (e) { return false; } });
    return a ? { ct: a.currentTime, t: performance.now() } : null; });
  // deterministic wait-then-draw shape (seek the live anim)
  const shape = await pF.evaluate(() => {
    const el = document.querySelector('[data-corridor]'); if (!el) return null;
    const a = el.getAnimations().find(x => { try { return x.effect.getKeyframes().some(k => 'strokeDashoffset' in k); } catch (e) { return false; } });
    if (!a) return null;
    const len = el.getTotalLength(), dur = a.effect.getTiming().duration;
    a.pause();
    a.currentTime = 0;    const o0 = parseFloat(getComputedStyle(el).strokeDashoffset);
    a.currentTime = 700;  const oWait = parseFloat(getComputedStyle(el).strokeDashoffset);   // end of WAIT
    a.currentTime = dur;  const oEnd = parseFloat(getComputedStyle(el).strokeDashoffset);
    return { len, dur, o0, oWait, oEnd };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5b CORRIDOR GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('renderer emits [data-corridor] path', H.found === true));
  checks.push(ok('hydrated estate: corridor STATIC-drawn (offset~0)', H.found && H.offset < H.len * 0.05));
  checks.push(ok('hydrated estate: NO draw animation (no mass-draw)', H.found && H.hasAnim === false));
  checks.push(ok('empty endpoint: corridor hidden (offset~len)', beforeFund.found && beforeFund.offset > beforeFund.len * 0.9));
  let cont = false, dd = {};
  if (c1 && c2) { const rd = c2.t - c1.t, cd = c2.ct - c1.ct; cont = Math.abs(cd - rd) < 220; dd = { rd: Math.round(rd), cd: Math.round(cd) }; }
  checks.push(ok('fund -> draw animation present + resumes (seek)', !!c1 && !!c2 && cont));
  checks.push(ok('shape: HIDDEN at t=0 (offset~len)', !!shape && shape.o0 > shape.len * 0.9));
  checks.push(ok('shape: still HIDDEN at end of WAIT (offset~len)', !!shape && shape.oWait > shape.len * 0.9));
  checks.push(ok('shape: DRAWN at end (offset~0)', !!shape && shape.oEnd < shape.len * 0.05));
  console.log('detail:', JSON.stringify({ H, beforeFund, ...dd, shape }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
