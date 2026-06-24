/* A.1 Task 3 pour gate — asserts via the app render path (Lesson 47) that a newly-funded room's
   fill POURS (animates scaleY 0->1) instead of SNAPPING to full. Seeds an isNew funded room,
   triggers the render+energize pass, finds the fill rect's transform animation, and SEEKS it
   deterministically: currentTime=0 -> rendered height ~0; currentTime=end -> height == wall.
   End state is full (descriptor value unchanged). RED today: energize animates opacity, not a
   transform pour, so the fill height is full from frame 0 (snaps).
   Usage: node scripts/_probe_a1_pour.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  // Reproduce the REAL UX (negative control): add an EMPTY room (no pour), then the user types a
  // MULTI-DIGIT value one keystroke at a time. Each keystroke re-renders the estate (innerHTML='')
  // and recreates the fill rect. The pour must CONTINUE across those re-renders, not snap to full on
  // the 2nd digit. Symptom the Captain caught: type "2" -> pours; type "5" -> BOOM snaps full.
  const seed = (val) => p.evaluate((v) => {
    if (!window.state.accounts || !window.state.accounts.length) {
      window.state.accounts = [{ id: 'p1', baseId: 'taxable', value: v, inflow: 0, freq: 12, exclude: false,
        isNew: true, isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable',
        disbursement: 'Discretionary', intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false }];
    } else { window.state.accounts[0].value = v; }
    if (window.updateSVGs) window.updateSVGs();
  }, val);

  await seed(0);     await p.waitForTimeout(200);   // empty room renders (no pour)
  await seed(2);     await p.waitForTimeout(150);   // 1st digit -> 0->funded transition -> pour starts
  await seed(25);    await p.waitForTimeout(220);   // 2nd digit -> re-render; pour must CONTINUE (not snap)

  const R = await p.evaluate(() => {
    const g = Array.from(document.querySelectorAll('#bp-svg g'))
      .find(el => (el.getAttribute('onclick') || '').indexOf("'p1'") >= 0) || null;
    if (!g) return { found: false };
    const fill = g.querySelector('.room-fill');
    const wall = g.querySelector('.room-rect');
    if (!fill || !wall) return { found: false };
    const wallH = wall.getBoundingClientRect().height;
    const liveH = fill.getBoundingClientRect().height;   // LIVE height AFTER the 2nd digit re-render

    const anims = fill.getAnimations ? fill.getAnimations() : [];
    const tAnim = anims.find(a => {
      try { return a.effect.getKeyframes().some(k => 'transform' in k); } catch (e) { return false; }
    });
    let startH = null, endH = null, ct = null, dur = null;
    const hasPour = !!tAnim;
    if (tAnim) {
      ct = tAnim.currentTime; dur = tAnim.effect.getTiming().duration || 850;
      tAnim.pause();
      tAnim.currentTime = 0;            startH = fill.getBoundingClientRect().height;
      tAnim.currentTime = dur;          endH = fill.getBoundingClientRect().height;
    } else {
      startH = liveH; endH = liveH;     // no pour -> static full from frame 0 (snapped)
    }
    return { found: true, wallH, liveH, startH, endH, hasPour, ct, dur };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(52)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== A.1 FILL-POUR GATE [' + LABEL + '] =====');
  const checks = [];
  checks.push(ok('room rendered (fill + wall found)', R.found === true));
  checks.push(ok('pour animation present after 2nd digit', R.hasPour === true));
  checks.push(ok('after 2nd digit still POURING (live < 95% wall, not snapped)', R.found && R.liveH < R.wallH * 0.95));
  checks.push(ok('pour in-flight (0 < currentTime < duration)', R.hasPour && R.ct > 0 && R.ct < R.dur));
  checks.push(ok('pour spans empty->full (start <50%, end >=95%)', R.found && R.startH < R.wallH * 0.5 && R.endH >= R.wallH * 0.95));
  console.log('detail:', JSON.stringify(R));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
