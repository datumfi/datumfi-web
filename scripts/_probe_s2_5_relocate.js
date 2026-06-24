/* S2.5 relocate/polish gate (Dispatch A Tasks 1+2) — asserts via the app render path (Lesson 47):
   TASK 1 — in S2 the Snapshot bank, Reveal-Range container, and privacy note are hidden (both sides).
   TASK 2 — the editable Portfolio/Contributions pair + read-only CCA/RA/PTA age row are HIDDEN on the
            Estate side and VISIBLE on the Shape side; the age fields are populated (not the "—" stub);
            the estimate ghost shows Shape-side only. CTA "See the Tension" stays reachable BOTH sides.
   Usage: node scripts/_probe_s2_5_relocate.js [LABEL] */
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

  // Seed an investable estate, enter S2. Force Estate side (no mode-shape) for the first read.
  await p.evaluate(() => {
    const mk = (id, baseId, value) => ({ id, baseId, value, inflow: 0, freq: 12, exclude: false,
      isNew: false, isFriction: false, isPriority: false, holdings: [], trustType: 'Irrevocable',
      disbursement: 'Discretionary', intRate: 0, notes: '', cola: 0, linkedAssetId: null, useRule55: false });
    window.state.accounts = [ mk('a1', 'taxable', 50000), mk('a2', 'tradira', 250000) ];
    if (window.updateSVGs) window.updateSVGs();
    if (window.enterS2View) window.enterS2View();
    const l = document.getElementById('studio-layout');
    if (l.classList.contains('mode-shape') && window.toggleShapeMode) window.toggleShapeMode(); // -> Estate side
  });
  await p.waitForTimeout(350);

  const vis = (sel) => p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { found: false, shown: false };
    const cs = getComputedStyle(el);
    const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null;
    return { found: true, shown };
  }, sel);
  const txt = (sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? (el.textContent || '').trim() : null; }, sel);

  // ESTATE SIDE reads
  const E = {
    snapshot: await vis('.scenario-bank'),
    reveal:   await vis('.reveal-container'),
    privacy:  await vis('.privacy-note'),
    boxes:    await vis('#bp-portfolio-total'),
    ageRow:   await vis('.s2-age-context'),
    ghost:    await vis('#estate-progress-ghost'),
    cta:      await vis('#see-tension-cta'),
  };

  // Flip to SHAPE side
  await p.evaluate(() => { if (window.toggleShapeMode) window.toggleShapeMode(); });
  await p.waitForTimeout(350);
  const S = {
    snapshot: await vis('.scenario-bank'),
    reveal:   await vis('.reveal-container'),
    privacy:  await vis('.privacy-note'),
    boxes:    await vis('#bp-portfolio-total'),
    ageRow:   await vis('.s2-age-context'),
    ghost:    await vis('#estate-progress-ghost'),
    cta:      await vis('#see-tension-cta'),
    cca: await txt('#s2-cca'), ra: await txt('#s2-ra'), pta: await txt('#s2-pta'),
  };
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(50)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.5 RELOCATE/POLISH GATE [' + LABEL + '] =====');
  const checks = [];
  // TASK 1 — S1 controls hidden across BOTH sides of S2
  checks.push(ok('T1 snapshot bank hidden (Estate)',  !E.snapshot.shown));
  checks.push(ok('T1 snapshot bank hidden (Shape)',   !S.snapshot.shown));
  checks.push(ok('T1 reveal-range hidden (Estate)',   !E.reveal.shown));
  checks.push(ok('T1 reveal-range hidden (Shape)',    !S.reveal.shown));
  checks.push(ok('T1 privacy note hidden (Estate)',   !E.privacy.shown));
  checks.push(ok('T1 privacy note hidden (Shape)',    !S.privacy.shown));
  // TASK 2 — boxes + age row Estate-hidden, Shape-visible
  checks.push(ok('T2 entry boxes HIDDEN on Estate side', !E.boxes.shown));
  checks.push(ok('T2 entry boxes VISIBLE on Shape side',  S.boxes.shown));
  checks.push(ok('T2 age context HIDDEN on Estate side', !E.ageRow.shown));
  checks.push(ok('T2 age context VISIBLE on Shape side',  S.ageRow.shown));
  checks.push(ok('T2 CCA populated (not stub)', !!S.cca && S.cca !== '—'));
  checks.push(ok('T2 RA populated (not stub)',  !!S.ra  && S.ra  !== '—'));
  checks.push(ok('T2 PTA populated (not stub)', !!S.pta && S.pta !== '—'));
  // Ghost — Shape-side only; CTA — both sides (Option B)
  checks.push(ok('T2 ghost HIDDEN on Estate side', !E.ghost.shown));
  checks.push(ok('T2 ghost VISIBLE on Shape side',  S.ghost.shown));
  checks.push(ok('OptB CTA reachable on Estate side', E.cta.shown));
  checks.push(ok('OptB CTA reachable on Shape side',  S.cta.shown));
  console.log('ages:', JSON.stringify({ cca: S.cca, ra: S.ra, pta: S.pta }));
  const all = checks.every(Boolean);
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
