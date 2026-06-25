/* S2.5b guard gate — under prefers-reduced-motion OR a weak CPU (hardwareConcurrency<4), the
   corridors fall back to STATIC-drawn (connected, offset~0, NO draw animation) and the reflow
   nudge does NOT fire. Asserts via the app render path (Lesson 47). Teeth proven by temporarily
   bypassing the guard during the build.
   Usage: node scripts/_probe_s25b_guard.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';
const MK = `(id,baseId,value,isNew)=>({id,baseId,value,inflow:0,freq:12,exclude:false,isNew:!!isNew,
  isFriction:false,isPriority:false,holdings:[],trustType:'Irrevocable',disbursement:'Discretionary',
  intRate:0,notes:'',cola:0,linkedAssetId:null,useRule55:false})`;

async function scenario(b, opts) {
  const ctx = await b.newContext(opts.reduce ? { reducedMotion: 'reduce' } : {});
  const hw = opts.hw || 8;
  await ctx.addInitScript(`Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>${hw}});`);
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);
  // a funded + b EMPTY (same column), then FUND b -> a real transition that WOULD animate the
  // corridor if the guard were off. Under the guard it must go straight to static-drawn (no anim).
  await p.evaluate((mk) => { const f = eval(mk);
    window.state.accounts = [ f('a', 'tradira', 50000, false), f('b', 'rothira', 0, false) ];
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.state.accounts[1].value = 90000; if (window.updateSVGs) window.updateSVGs(); });
  await p.waitForTimeout(450);
  const corr = await p.evaluate(() => {
    const el = document.querySelector('[data-corridor]'); if (!el) return { found: false };
    const len = el.getTotalLength(), offset = parseFloat(getComputedStyle(el).strokeDashoffset) || 0;
    const hasAnim = (el.getAnimations() || []).some(a => { try { return a.effect.getKeyframes().some(k => 'strokeDashoffset' in k); } catch (e) { return false; } });
    return { found: true, len, offset, hasAnim };
  });
  // add a new room -> reflow would nudge existing rooms (must NOT under guard)
  await p.evaluate((mk) => { const f = eval(mk);
    window.state.accounts.push(f('n1', 'pretax401k', 0, true));
    if (window.updateSVGs) window.updateSVGs();
  }, MK);
  await p.waitForTimeout(180);
  const reflowFired = await p.evaluate(() => {
    const g = Array.from(document.querySelectorAll('#bp-svg g')).find(el => (el.getAttribute('onclick') || '').indexOf("'a'") >= 0);
    if (!g) return false;
    return (g.getAnimations() || []).some(a => { try { return a.effect.getKeyframes().some(k => 'transform' in k); } catch (e) { return false; } });
  });
  return { corr, reflowFired };
}

(async () => {
  const b = await chromium.launch();
  const rm = await scenario(b, { reduce: true, hw: 8 });    // reduced-motion, capable HW
  const weak = await scenario(b, { reduce: false, hw: 2 }); // weak CPU, motion allowed
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(50)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5b GUARD GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('reduced-motion: corridor STATIC-drawn (offset~0)', rm.corr.found && rm.corr.offset < rm.corr.len * 0.05));
  checks.push(ok('reduced-motion: corridor has NO draw anim', rm.corr.found && rm.corr.hasAnim === false));
  checks.push(ok('reduced-motion: reflow did NOT fire', rm.reflowFired === false));
  checks.push(ok('weak-HW: corridor STATIC-drawn (offset~0)', weak.corr.found && weak.corr.offset < weak.corr.len * 0.05));
  checks.push(ok('weak-HW: corridor has NO draw anim', weak.corr.found && weak.corr.hasAnim === false));
  checks.push(ok('weak-HW: reflow did NOT fire', weak.reflowFired === false));
  console.log('detail:', JSON.stringify({ rm, weak }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
