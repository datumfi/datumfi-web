/* S2.5b reflow gate — asserts via the app render path (Lesson 47): when a NEW room arrives
   (isNew), the EXISTING rooms get a transient ~4px group-transform nudge (estate-organism settle)
   while the new room itself does NOT nudge. RED today (reflow() is an empty stub).
   Forces hardwareConcurrency=8 so the weak-HW guard doesn't disable motion in headless.
   Usage: node scripts/_probe_s25b_reflow.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);

  const mkSrc = `(id,baseId,value,isNew)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:!!isNew,
    isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
    intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;
  // two settled rooms (isNew:false), rendered
  await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts = [ f('e1', 'taxable', 50000, false), f('e2', 'tradira', 80000, false) ];
    if (window.updateSVGs) window.updateSVGs();
  }, mkSrc);
  await p.waitForTimeout(400);
  // a NEW room arrives -> reflow should nudge e1/e2, not n1
  await p.evaluate((mk) => {
    const f = eval(mk);
    window.state.accounts.push(f('n1', 'rothira', 0, true));
    if (window.updateSVGs) window.updateSVGs();
  }, mkSrc);
  await p.waitForTimeout(180);   // mid-nudge (600ms one-shot still running)

  const hasTransform = (id) => p.evaluate((rid) => {
    const g = Array.from(document.querySelectorAll('#bp-svg g')).find(el => (el.getAttribute('onclick') || '').indexOf("'" + rid + "'") >= 0);
    if (!g) return null;
    const anims = g.getAnimations ? g.getAnimations() : [];
    return anims.some(a => { try { return a.effect.getKeyframes().some(k => 'transform' in k); } catch (e) { return false; } });
  }, id);
  const e1 = await hasTransform('e1'), e2 = await hasTransform('e2'), n1 = await hasTransform('n1');
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(46)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5b REFLOW GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('existing room e1 nudged (transform anim)', e1 === true));
  checks.push(ok('existing room e2 nudged (transform anim)', e2 === true));
  checks.push(ok('new arrival n1 NOT nudged', n1 === false));
  console.log('detail:', JSON.stringify({ e1, e2, n1 }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
