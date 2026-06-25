/* S2.5a breathe gate — asserts via the app render path (Lesson 47): every funded room's .room-fill
   gets a CONTINUOUS (iterations:Infinity) opacity breath; heavier room breathes SLOWER (longer
   period) than a lighter one (weight-modulated, READS hub weight); and the breath phase CONTINUES
   across a re-render (seek, not reset) so motion never restarts. RED today (no breathe anim).
   Forces hardwareConcurrency=8 so the weak-HW guard doesn't disable breathing in headless.
   Usage: node scripts/_probe_s25_breathe.js [LABEL] */
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

  // two already-funded rooms (isNew:false -> no pour/pulse, just breathe), very different weights
  await p.evaluate(() => {
    const mk = (id, baseId, value) => ({ id, baseId, value, inflow: 0, freq: 12, exclude: false, isNew: false,
      isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable', disbursement: 'Discretionary',
      intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false });
    window.state.accounts = [ mk('hv', 'taxable', 1000000), mk('lt', 'taxable', 20000) ];
    if (window.updateSVGs) window.updateSVGs();
  });
  await p.waitForTimeout(400);

  const readBreathe = (id) => p.evaluate((rid) => {
    const g = Array.from(document.querySelectorAll('#bp-svg g')).find(el => (el.getAttribute('onclick') || '').indexOf("'" + rid + "'") >= 0);
    if (!g) return null;
    const f = g.querySelector('.room-fill'); if (!f) return null;
    const anims = f.getAnimations ? f.getAnimations() : [];
    const a = anims.find(an => { try { return an.effect.getKeyframes().some(k => 'opacity' in k) && an.effect.getTiming().iterations === Infinity; } catch (e) { return false; } });
    if (!a) return { hasBreathe: false };
    return { hasBreathe: true, period: a.effect.getTiming().duration, ct: a.currentTime, t: performance.now() };
  }, id);

  const hv1 = await readBreathe('hv');
  const lt1 = await readBreathe('lt');
  // continuity: wait, force a re-render, re-read heavy room's breathe currentTime
  await p.waitForTimeout(500);
  await p.evaluate(() => { if (window.updateSVGs) window.updateSVGs(); });
  await p.waitForTimeout(250);
  const hv2 = await readBreathe('hv');
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5a BREATHE GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('heavy room has infinite breathe anim', !!hv1 && hv1.hasBreathe === true));
  checks.push(ok('light room has infinite breathe anim', !!lt1 && lt1.hasBreathe === true));
  checks.push(ok('weight-modulated: heavy period > light period',
    !!hv1 && !!lt1 && hv1.hasBreathe && lt1.hasBreathe && hv1.period > lt1.period));
  let cont = false, dd = {};
  if (hv1 && hv2 && hv1.hasBreathe && hv2.hasBreathe) {
    const realDelta = hv2.t - hv1.t, ctDelta = hv2.ct - hv1.ct;   // period(~6900) > delta(~750) -> no wrap
    cont = Math.abs(ctDelta - realDelta) < 200;
    dd = { realDelta: Math.round(realDelta), ctDelta: Math.round(ctDelta) };
  }
  checks.push(ok('phase continuity across re-render (seek, not reset)', cont));
  console.log('detail:', JSON.stringify({ hv1, lt1, hv2, ...dd }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
