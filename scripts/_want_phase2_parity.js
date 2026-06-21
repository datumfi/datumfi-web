'use strict';
/* _want_phase2_parity.js — STANDING GATE for the Studio WANT-face Phase-2 throttle set.
 *
 * Proves, in a REAL browser, on the Studio "Shape You Want" back face:
 *   #10 — HUD comparison header reads "Shape You Have" / "Shape You Want"
 *         (NOT the old "CURRENT SHAPE" / "TEST SHAPE"); matches the toggle labels.
 *   #4  — Want sliders enforce Sketch's value-snap cross-constraints (sketch.html
 *         L8946-8961): CA < RA (age snaps to RA-1), RA > CA (activation snaps to
 *         CA+1) and bumps PTA, PTA >= max(75, RA+20).
 *   #6  — Reset honors a SAVED carried sketch: with window._studioCarriedDesign
 *         present, Reset restores the SAVED S2 design (not the Have baseline);
 *         with NO carried design, Reset reverts to Have.
 *
 * RED-FIRST: on pre-fix code #10 (old header), #4 (no snap) and #6-saved (reset
 * snaps to Have, not the saved design) all FAIL — reproducing the live symptom via
 * the app's own event path. The fixes turn them green.
 *
 * Run: node scripts/_want_phase2_parity.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const SLF = require('./_singlelever_baseline.fixture.js').buildSingleLeverExtrasORIG;  // frozen Sketch single-lever extras
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
let fails = 0; const results = [];
function check(label, cond, detail) { const ok = !!cond; if (!ok) fails++; results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? ' (' + detail + ')' : '')); }
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog/i.test(u)) return route.abort(); return route.continue(); });
const setSlider = (page, id, val) => page.evaluate(([i, v]) => { const el = document.getElementById(i); if (!el) return null; el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); return parseInt(el.value, 10); }, [id, val]);
const ageOf = (page, id) => page.evaluate((i) => parseInt(document.getElementById(i).value, 10), id);

// Enter shape mode and flip to the Want back face (drives the real onclick paths).
async function enterWant(page) {
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#shape-mode-toggle');
  await page.waitForTimeout(1200);
  await page.click('#shape-want-tab');
  await page.waitForTimeout(1400);
}

(async () => {
  await new Promise((r) => server.listen(8147, '127.0.0.1', r));
  const browser = await chromium.launch();
  const BASE = 'http://127.0.0.1:8147';

  // ── Context A: fresh scratch (no carried design) — #10, #4, #6-fresh ──
  let ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  let page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await enterWant(page);

  // #10 — comparison header strings (capital "You", matches toggle/col-heads).
  const hdr = await page.evaluate(() => {
    const grid = document.querySelector('#shape-want-face') || document;
    // locate the 3-col header row holding the two static labels
    const spans = Array.prototype.map.call(document.querySelectorAll('span'), (s) => (s.textContent || '').trim());
    return { hasHave: spans.indexOf('Shape You Have') > -1, hasWant: spans.indexOf('Shape You Want') > -1,
             oldCur: spans.indexOf('CURRENT SHAPE') > -1, oldTest: spans.indexOf('TEST SHAPE') > -1 };
  });
  check('#10: header shows "Shape You Have"', hdr.hasHave);
  check('#10: header shows "Shape You Want"', hdr.hasWant);
  check('#10: old "CURRENT SHAPE" label gone', !hdr.oldCur);
  check('#10: old "TEST SHAPE" label gone', !hdr.oldTest);

  // #7 — Y-axis grid: 5 ticks + 5 $-labels + "ANNUAL SPEND" title injected into #d2-grid.
  const grid = await page.evaluate(() => {
    const g = document.getElementById('d2-grid'); if (!g) return null;
    const ticks = g.querySelectorAll('line.grid-tick').length;
    const labels = Array.prototype.map.call(g.querySelectorAll('text.grid-label'), (t) => (t.textContent || '').trim());
    const title = Array.prototype.some.call(g.querySelectorAll('text'), (t) => /ANNUAL SPEND/.test(t.textContent || ''));
    return { ticks, labelCount: labels.length, money: labels.filter((s) => /^\$/.test(s)).length, title };
  });
  check('#7: 5 Y-axis gridlines drawn', grid && grid.ticks === 5, grid && grid.ticks);
  check('#7: 5 Y-axis labels drawn', grid && grid.labelCount === 5, grid && grid.labelCount);
  check('#7: Y-axis labels are $-formatted spend', grid && grid.money === 5, grid && JSON.stringify(grid));
  check('#7: "ANNUAL SPEND" axis title present', grid && grid.title);

  // #4 — value-snap cross-constraints on the Want sliders.
  await setSlider(page, 'd2-slider-age', 40);
  await setSlider(page, 'd2-slider-activation', 70);
  await setSlider(page, 'd2-slider-age', 80);              // CA >= RA -> snap to RA-1 = 69
  check('#4: CA snaps to <= RA-1 on live input', (await ageOf(page, 'd2-slider-age')) <= 69, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  await setSlider(page, 'd2-slider-age', 50);
  await setSlider(page, 'd2-slider-activation', 45);       // RA <= CA -> snap to CA+1 = 51
  check('#4: RA snaps to >= CA+1 on live input', (await ageOf(page, 'd2-slider-activation')) >= 51, 'RA=' + (await ageOf(page, 'd2-slider-activation')));
  await setSlider(page, 'd2-slider-age', 50);
  await setSlider(page, 'd2-slider-activation', 70);       // activation bumps PTA floor to max(75,90)=90
  await setSlider(page, 'd2-slider-plan-through', 80);     // PTA < RA+20 -> snap to 90
  check('#4: PTA snaps to >= max(75, RA+20)', (await ageOf(page, 'd2-slider-plan-through')) >= 90, 'PTA=' + (await ageOf(page, 'd2-slider-plan-through')));

  // #6 (fresh) — no carried design: Reset reverts to Have baseline (CA 40).
  await setSlider(page, 'd2-slider-age', 55);
  await page.click('#d2s-btn-reset-design');
  await page.waitForTimeout(400);
  check('#6: fresh reset reverts to Have (CA=40)', (await ageOf(page, 'd2-slider-age')) === 40, 'CA=' + (await ageOf(page, 'd2-slider-age')));

  // #2 — canvas endpoint scrubber activates on hover (was dead: drag-only handler).
  // Drive by mapping a target svg-x through the canvas getScreenCTM, so we hover exact chart
  // positions regardless of fit-scale/overflow (mirror probe confirmed CTM is accurate + unflipped).
  const hoverSvgX = async (sx) => {
    const cl = await page.evaluate((x) => { const svg = document.getElementById('d2-canvas'); const m = svg.getScreenCTM(); const pt = svg.createSVGPoint(); pt.x = x; pt.y = 240; const sp = pt.matrixTransform(m); return { x: sp.x, y: sp.y }; }, sx);
    await page.mouse.move(cl.x, cl.y); await page.waitForTimeout(60);
    await page.mouse.move(cl.x + 0.5, cl.y); await page.waitForTimeout(90);  // nudge to guarantee a pointermove
    return page.evaluate(() => ({ op: parseFloat(getComputedStyle(document.getElementById('d2-scrubber-group')).opacity),
      age: parseInt(((document.getElementById('d2-tt-age-ceil') || {}).textContent || '0'), 10),
      data: ((document.getElementById('d2-tt-data-ceil') || {}).textContent || '').trim(),
      datum: ((document.getElementById('d2-tt-data-datum') || {}).textContent || '').trim() }));
  };
  const mid = await hoverSvgX(385);
  check('#2: scrubber reveals on canvas hover', mid.op > 0.5, 'opacity=' + mid.op);
  check('#2: ceil tooltip age populated', Number.isFinite(mid.age) && mid.age > 0, mid.age);
  check('#2: ceil tooltip data is $-formatted', /\$/.test(mid.data), mid.data);
  check('#2: datum tooltip data populated', /\$/.test(mid.datum), mid.datum);
  const left = await hoverSvgX(170); const right = await hoverSvgX(600);
  check('#2: hover age increases left->right (X not mirrored on back face)', left.age < right.age, 'ageL=' + left.age + ' ageR=' + right.age);
  // pointerleave hides the scrubber.
  await page.mouse.move(10, 10); await page.waitForTimeout(120);
  const gone = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('d2-scrubber-group')).opacity));
  check('#2: scrubber hides on pointerleave', gone < 0.5, 'opacity=' + gone);

  // #1/#5 — multi-lever copy renders via the shared builder (was a placeholder).
  await setSlider(page, 'd2-slider-age', 50);
  await setSlider(page, 'd2-slider-activation', 72);
  await setSlider(page, 'd2-slider-contrib', 60000);   // 3 levers -> multi-lever (no >=70% dominant)
  await page.waitForTimeout(150);
  const mlv = await page.evaluate(() => {
    const g = (id) => document.getElementById(id) || {};
    const means = (g('d2s-pin-means').innerHTML || ''), inspect = (g('d2s-pin-inspect').innerHTML || ''), lever = (g('d2s-pin-lever-attribution').textContent || '');
    const st = window._wantFaceState, D = window.DatumShape;
    if (!st || !D || !D.S2Copy || !D.S2Copy.buildMultiLever) return { err: 'no state/builder' };
    const hav = st.have, wnt = st.want, mkt = document.querySelector('input[name="d2-market"]:checked');
    const yrs = Math.max(0, wnt.activationAge - wnt.currentAge);
    const sS = Object.assign({}, wnt, { targetSpend: Math.round(wnt.targetSpend), yearsToGrow: yrs });
    const gbYrs = hav.yearsToGrow || Math.max(0, hav.activationAge - hav.currentAge), gbEnd = D.computeAt(hav, gbYrs);
    const exp = D.S2Copy.buildMultiLever({
      retire: wnt.activationAge, age: wnt.currentAge, yrs: yrs, paradigm: mkt ? mkt.value : 'average', gb: hav,
      ds: { age: wnt.currentAge, retire: wnt.activationAge, planThroughAge: wnt.planThroughAge, port: wnt.portfolioVol, datum: wnt.targetSpend, contrib: wnt.annualContrib },
      s: sS, gbEnd: gbEnd, ptsEnd: D.computeAt(sS, yrs),
      gbPinnedState: { retire: hav.activationAge, age: hav.currentAge, port: hav.portfolioVol, contrib: hav.annualContrib, datum: hav.targetSpend, planThroughAge: hav.planThroughAge || 93, pinnedParadigm: hav.baselineRate === 1.040 ? 'Optimistic' : hav.baselineRate === 1.015 ? 'Stress' : 'Historical', pinnedInflStr: hav.isNominal ? 'Nominal' : 'Real', pinnedTax: Math.round((1 - (hav.taxMult || 1)) * 100), stateObj: D.buildShapeState(gbEnd) }
    });
    return { means, inspect, lever, exp, placeholder: /combined several moves|levers moved/.test(means + ' ' + lever) };
  });
  check('#1/#5: multi-lever is no longer the placeholder', mlv && !mlv.err && !mlv.placeholder, mlv && (mlv.err || (mlv.means || '').slice(0, 50)));
  check('#1/#5: rendered means == shared builder phys', mlv && mlv.exp && mlv.means === mlv.exp.phys, mlv && mlv.exp && ('lens ' + (mlv.means || '').length + '/' + mlv.exp.phys.length));
  check('#1/#5: rendered inspect == shared builder act', mlv && mlv.exp && mlv.inspect === mlv.exp.act);
  check('#1/#5: rendered lever-attr == shared builder domLever', mlv && mlv.exp && mlv.lever === (mlv.exp.domLever || '—'), mlv && mlv.exp && (mlv.lever + ' | ' + mlv.exp.domLever));

  // ── S2 COPY POLISH fast-follow ──
  // Item 1 — empty state: reset to Have -> attribution must read Sketch's exact string (not "—").
  await page.click('#d2s-btn-reset-design'); await page.waitForTimeout(300);
  const emptyLever = await page.evaluate(() => ((document.getElementById('d2s-pin-lever-attribution') || {}).textContent || '').trim());
  check('polish#1: empty-state attribution = Sketch string', emptyLever === 'No movement yet — adjust a slider to see lever attribution', emptyLever);

  // Item 2 — single-lever: move ONE lever (age) -> attribution carries the delta + changes-row shows
  // the arrow transition, byte-identical to the frozen Sketch single-lever extras.
  await setSlider(page, 'd2-slider-age', 45); await page.waitForTimeout(150);
  const sl = await page.evaluate(() => {
    const lever = ((document.getElementById('d2s-pin-lever-attribution') || {}).textContent || '');
    const chEl = document.getElementById('d2s-pin-changes-row');
    const cs = chEl ? getComputedStyle(chEl) : {};
    const st = window._wantFaceState;
    return { lever, chText: chEl ? chEl.textContent : '', chHtml: chEl ? chEl.innerHTML : '', chDisplay: cs.display, chWrap: cs.flexWrap,
             have: st && st.have, want: st && st.want, copy: st && st.diff && st.diff.copy };
  });
  let exp = null;
  if (sl.copy && sl.want && sl.have) {
    const w = sl.want, h = sl.have;
    exp = SLF({ wbCase: sl.copy, gb: h,
      ds: { age: w.currentAge, retire: w.activationAge, planThroughAge: w.planThroughAge, port: w.portfolioVol, datum: w.targetSpend, contrib: w.annualContrib },
      retire: w.activationAge, age: w.currentAge, ptsEnd: { datumSpend: Math.round(w.targetSpend) },
      gbPinnedState: { planThroughAge: h.planThroughAge || 93 } });
  }
  check('polish#2: single-lever is the age case', !!(sl.copy && sl.copy.isSingleLever && sl.copy.lever === 'age'), sl.copy && sl.copy.lever);
  check('polish#2: attribution carries the delta (+N yr)', /\(\+?\d+\s*yr,\s*100% of range\)/.test(sl.lever), sl.lever);
  check('polish#2: attribution == frozen Sketch domLever', !!(exp && sl.lever === exp.domLever), exp && (sl.lever + ' | ' + exp.domLever));
  check('polish#2: changes-row shows the arrow transition', /→/.test(sl.chText) && sl.chText.length > 0, sl.chText);
  check('polish#2: changes-row == frozen Sketch (leverDelta/changeHtml)', !!(exp && (exp.changeHtml ? sl.chHtml === exp.changeHtml : sl.chText === exp.leverDelta)), exp && (sl.chText + ' | ' + (exp.changeHtml || exp.leverDelta)));
  // Item 3 — changes-row CSS: flex + wrap (was a crushed block).
  check('polish#3: changes-row is flex+wrap (breathes)', sl.chDisplay === 'flex' && sl.chWrap === 'wrap', sl.chDisplay + '/' + sl.chWrap);
  await ctx.close();

  // ── Context B: carried saved design injected — #6-saved ──
  ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(700);
  await page.click('#shape-mode-toggle');
  await page.waitForTimeout(1200);
  // Inject a SAVED carried S2 design distinct from Have (CA 52 vs Have 40) BEFORE first want flip.
  await page.evaluate(() => {
    window._studioCarriedDesign = { present: true,
      scenario: { age: 52, retire: 68, planThroughAge: 99, port: 1.0, datum: 120, contrib: 30000 },
      overrides: { ceilDelta: 0, floorDelta: 0, datumDelta: 0, portDelta: 0 } };
  });
  await page.click('#shape-want-tab');
  await page.waitForTimeout(1400);
  check('#6: carried design seeds the saved CA (52)', (await ageOf(page, 'd2-slider-age')) === 52, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  await setSlider(page, 'd2-slider-age', 45);              // move away from the saved design
  await page.click('#d2s-btn-reset-design');
  await page.waitForTimeout(400);
  check('#6: saved reset restores the saved design (CA=52, not Have 40)', (await ageOf(page, 'd2-slider-age')) === 52, 'CA=' + (await ageOf(page, 'd2-slider-age')));
  check('#6: saved reset restores saved RA (68)', (await ageOf(page, 'd2-slider-activation')) === 68, 'RA=' + (await ageOf(page, 'd2-slider-activation')));
  check('#6: saved reset restores saved PTA (99)', (await ageOf(page, 'd2-slider-plan-through')) === 99, 'PTA=' + (await ageOf(page, 'd2-slider-plan-through')));
  await ctx.close();

  // ── Context C: #9 — Estate-exit FROM WANT must mirror the clean Have-exit ──
  const exitSnap = (pg) => pg.evaluate(() => {
    const lay = document.getElementById('studio-layout');
    const dp = document.querySelector('.drafting-panel');
    const fi = document.getElementById('shape-flip-inner');
    return { wantMode: lay.classList.contains('want-mode'), shapeMode: lay.classList.contains('mode-shape'),
             drafting: dp ? getComputedStyle(dp).display : '(none)', flipped: fi ? fi.classList.contains('flipped') : null };
  });
  ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  await blockClerk(ctx);
  page = await ctx.newPage();
  await page.goto(BASE + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await enterWant(page);                                   // enter shape -> flip to WANT
  await page.click('#shape-mode-toggle');                 // EXIT shape mode FROM the Want face
  await page.waitForTimeout(900);
  let ex = await exitSnap(page);
  check('#9: WANT-exit clears want-mode', !ex.wantMode, JSON.stringify(ex));
  check('#9: WANT-exit clears mode-shape', !ex.shapeMode, JSON.stringify(ex));
  check('#9: WANT-exit unflips the shape inner', ex.flipped === false, JSON.stringify(ex));
  check('#9: WANT-exit restores the drafting panel (not hidden)', ex.drafting === 'block', JSON.stringify(ex));
  await ctx.close();

  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nWANT PHASE-2 PARITY: GREEN' : '\nWANT PHASE-2 PARITY: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
