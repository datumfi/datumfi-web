/* S1 split gate — RED pre-wire, GREEN post-wire. Proves first-paint converges old->new EXCEPT
   the intended deltas (order / labels / mode-shape default / open-state / header), while the
   baseline (shape engine, MM/YYYY inputs, DatumShape) stays GREEN throughout.
   Usage: node scripts/_probe_s1_split.js [LABEL] */
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
  await p.waitForTimeout(400); // let S1_DEFAULT_SHAPE init run post-engine-load

  const R = await p.evaluate(() => {
    const panel = document.querySelector('.drafting-panel');
    const secs = Array.from(panel.querySelectorAll('.studio-section'));
    const pi = secs.findIndex(s => s.querySelector('#sec-profile'));
    const si = secs.findIndex(s => s.querySelector('#sec-sketch'));
    const tagText = id => { const s = secs.find(x => x.querySelector('#' + id)); const t = s && s.querySelector('.section-tag span'); return t ? t.textContent.trim() : ''; };
    const layout = document.getElementById('studio-layout');
    const hdr = panel.textContent;
    // "Reveal the Shape" must be a header string, NOT bound to the MC button
    const revealEls = Array.from(panel.querySelectorAll('*')).filter(e => e.children.length === 0 && /Reveal the Shape/.test(e.textContent));
    const revealEl = revealEls[0] || null;
    const mcBtn = document.querySelector('.action-btn');
    return {
      profileBeforeSketch: pi > -1 && si > -1 && pi < si,
      profileLabel: tagText('sec-profile'),
      sketchLabel:  tagText('sec-sketch'),
      modeShape: layout.classList.contains('mode-shape'),
      profileDisp: getComputedStyle(document.getElementById('sec-profile')).display,
      sketchDisp:  getComputedStyle(document.getElementById('sec-sketch')).display,
      hdrStudio: hdr.includes('The Studio'),
      hdrPhase:  hdr.includes('PHASE I — DATA'),
      hdrReveal: hdr.includes('Reveal the Shape'),
      hdrLead:   hdr.includes('Move the inputs. Watch your retirement take shape.'),
      revealIsBtn: revealEl ? (revealEl.tagName === 'BUTTON' || revealEl.hasAttribute('onclick')) : true,
      mcBtnText: mcBtn ? mcBtn.textContent.trim() : '',
      // baseline (guardrail)
      svgPaths: document.querySelectorAll('#shape-panel-svg path').length,
      hasDob: !!document.getElementById('pri-dob'),
      hasDatumShape: !!window.DatumShape
    };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(38)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S1 GATE [' + LABEL + '] =====');
  const d1 = ok('Δ order: Profile before Sketch', R.profileBeforeSketch === true);
  const d2 = ok('Δ labels: 00 Profile / 01 Sketch', R.profileLabel === '00 / Architect Profile' && R.sketchLabel === '01 / Sketch Inputs');
  const d3 = ok('Δ mode-shape default on paint', R.modeShape === true);
  const d4 = ok('Δ open: Profile shown / Sketch none', R.profileDisp !== 'none' && R.sketchDisp === 'none');
  const d5 = ok('Δ header 4 strings present', R.hdrStudio && R.hdrPhase && R.hdrReveal && R.hdrLead);
  const d6 = ok('Δ Reveal-the-Shape NOT a button', R.revealIsBtn === false && /REVEAL YOUR RANGE/i.test(R.mcBtnText));
  const g1 = ok('baseline: shape svg paths > 0', R.svgPaths > 0);
  const g2 = ok('baseline: MM/YYYY + DatumShape', R.hasDob && R.hasDatumShape);
  console.log('detail:', JSON.stringify(R));
  const all = d1 && d2 && d3 && d4 && d5 && d6 && g1 && g2;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
