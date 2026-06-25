/* S2.5a guard gate — the dual fallback-to-static guard. Under EITHER prefers-reduced-motion OR a
   weak CPU (navigator.hardwareConcurrency < 4), a funded room must have NO continuous breathe anim
   (static estate). Asserts via the app render path (Lesson 47). Has teeth only once breathing
   exists — proven by temporarily disabling the guard (shows RED) during the build.
   Usage: node scripts/_probe_s25_guard.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

async function setup(ctx) {
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const mk = (id, baseId, value) => ({ id, baseId, value, inflow: 0, freq: 12, exclude: false, isNew: false,
      isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable', disbursement: 'Discretionary',
      intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false });
    window.state.accounts = [ mk('hv', 'taxable', 1000000) ];
    if (window.updateSVGs) window.updateSVGs();
  });
  await p.waitForTimeout(400);
  return p;
}
async function breatheCount(p) {
  return p.evaluate(() => {
    const g = Array.from(document.querySelectorAll('#bp-svg g')).find(el => (el.getAttribute('onclick') || '').indexOf("'hv'") >= 0);
    if (!g) return -1;
    const f = g.querySelector('.room-fill'); if (!f) return -1;
    const anims = f.getAnimations ? f.getAnimations() : [];
    return anims.filter(a => { try { return a.effect.getKeyframes().some(k => 'opacity' in k) && a.effect.getTiming().iterations === Infinity; } catch (e) { return false; } }).length;
  });
}

(async () => {
  const b = await chromium.launch();
  // (1) reduced-motion ON, HW capable -> isolates the reduced-motion guard
  const cA = await b.newContext({ reducedMotion: 'reduce' });
  await cA.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  const rm = await breatheCount(await setup(cA));
  // (2) reduced-motion OFF, weak CPU -> isolates the hardwareConcurrency guard
  const cB = await b.newContext();
  await cB.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); });
  const weak = await breatheCount(await setup(cB));
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(46)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5a GUARD GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('reduced-motion -> NO breathe anim (count 0)', rm === 0));
  checks.push(ok('hardwareConcurrency<4 -> NO breathe (count 0)', weak === 0));
  console.log('detail:', JSON.stringify({ rm, weak }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
