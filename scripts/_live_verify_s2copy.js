// LIVE regression verify (Part A) — datumfi.com/sketch.html after the
// S2-copy-engine extraction (commit abd038c). Confirms: module loads over the
// network & binds (getPinnedCaseObj is a real fn, not the null fallback); S1
// pinned-comparison HUD + S2 design HUD render real prose; NO raw {tokens}, no
// blanks, no console/page JS errors. Single-lever AND multi-lever paths.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DFI_BASE || 'https://datumfi.com';
const OUT = path.resolve(__dirname, '..', '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const S1_SLIDERS = ['slider-age', 'slider-activation', 'sl-plan-through', 'slider-portfolio', 'slider-contrib', 'slider-datum'];
// copy elements written by the EXTRACTED engine (via _fillVars / _d2Fill)
const S1_COPY = ['val-physics', 'val-action'];
const S2_COPY = ['d2s-pin-state-name', 'd2s-pin-designed-state', 'd2s-pin-changes-row', 'd2s-pin-means', 'd2s-pin-inspect', 'd2s-pin-lever-attribution'];

const TOKEN_RE = /\{[A-Za-z]\w*\}/; // unresolved template token e.g. {gapToCeil}

function scanCopy(label, map) {
  const findings = [];
  for (const [id, text] of Object.entries(map)) {
    if (text === null) { findings.push(`${label}:${id} = MISSING ELEMENT`); continue; }
    if (TOKEN_RE.test(text)) findings.push(`${label}:${id} = RAW TOKEN -> ${text.slice(0, 120)}`);
    if (/undefined|NaN|\bnull\b/.test(text)) findings.push(`${label}:${id} = BAD VALUE -> ${text.slice(0, 120)}`);
  }
  return findings;
}

async function readCopy(page, ids) {
  return page.evaluate((ids) => {
    const o = {};
    ids.forEach((id) => { const el = document.getElementById(id); o[id] = el ? el.textContent.trim() : null; });
    return o;
  }, ids);
}

async function dragSlider(page, id, dxFrac) {
  const box = await page.evaluate((id) => {
    const el = document.getElementById(id); if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const pct = (parseFloat(el.value) - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min));
    return { x: r.left + r.width * pct, y: r.top + r.height / 2, w: r.width };
  }, id);
  if (!box) return false;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w * dxFrac, box.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  return true;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const report = { base: BASE, consoleErrors: [], pageErrors: [], steps: {}, findings: [] };
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });

  await page.goto(BASE + '/sketch.html', { waitUntil: 'load' });
  await page.waitForTimeout(6000); // intro phases

  // (1) module loaded & bound from network?
  report.steps.moduleBound = await page.evaluate(() =>
    !!(window.DatumShape && window.DatumShape.S2Copy && typeof window.DatumShape.S2Copy.getPinnedCaseObj === 'function'));

  // dismiss entry overlay (Scratch)
  await page.evaluate(() => { const b = document.getElementById('sketchStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1500);

  // (2) drive discovery: drag all S1 levers -> arm shape
  for (const id of S1_SLIDERS) await dragSlider(page, id, 0.08);
  await page.waitForTimeout(3500); // climax + HUD reveal
  report.steps.s1Armed = await page.evaluate(() => {
    const c = document.getElementById('sketch-canvas'); return c ? c.classList.contains('shape-armed') : null;
  });
  report.steps.s1Copy = await readCopy(page, S1_COPY);
  report.findings.push(...scanCopy('S1', report.steps.s1Copy));
  await page.screenshot({ path: path.join(OUT, 'live_s1_hud.png') });

  // (3) enter S2 via real CTA; fallback to revealScreen2() (still the real render path)
  report.steps.s2EntryPath = 'btn-submit';
  await page.evaluate(() => { const b = document.getElementById('btn-submit'); if (b) b.click(); }).catch(() => {});
  let revealed = false;
  for (let i = 0; i < 20; i++) {
    revealed = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); });
    if (revealed) break;
    await page.waitForTimeout(500);
  }
  if (!revealed) {
    report.steps.s2EntryPath = 'revealScreen2()-fallback';
    await page.evaluate(() => { try { window.revealScreen2 && window.revealScreen2(); } catch (e) {} });
    await page.waitForTimeout(4500);
    revealed = await page.evaluate(() => { const s = document.getElementById('screen-2-design'); return !!(s && s.classList.contains('revealed')); });
  }
  report.steps.s2Revealed = revealed;
  await page.waitForTimeout(1200);

  // set a direct-age design slider precisely (value == age) via trusted-ish input dispatch
  const setAge = (id, val) => page.evaluate(({ id, val }) => {
    const el = document.getElementById(id); if (!el) return null;
    el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  }, { id, val });
  const baseAges = await page.evaluate(() => ({
    retire: parseInt((document.getElementById('d2-slider-activation') || {}).value, 10),
    plan: parseInt((document.getElementById('d2-slider-plan-through') || {}).value, 10)
  }));
  report.steps.s2BaseAges = baseAges;

  // (4) SINGLE-LEVER: move ONLY retire (clean isSingleLever=true, lever=retire)
  await setAge('d2-slider-activation', baseAges.retire - 5);
  await page.waitForTimeout(900);
  report.steps.s2SingleLeverCopy = await readCopy(page, S2_COPY);
  report.findings.push(...scanCopy('S2-single', report.steps.s2SingleLeverCopy));
  await page.screenshot({ path: path.join(OUT, 'live_s2_single.png') });

  // (5) MULTI-LEVER: ADD plan-through up -> two boundary movers, primaryPct<0.70 -> heuristic
  await setAge('d2-slider-plan-through', baseAges.plan + 8);
  await page.waitForTimeout(900);
  report.steps.s2MultiLeverCopy = await readCopy(page, S2_COPY);
  report.findings.push(...scanCopy('S2-multi', report.steps.s2MultiLeverCopy));
  await page.screenshot({ path: path.join(OUT, 'live_s2_multi.png') });

  // blank check on the two prose elements
  for (const [phase, m] of [['single', report.steps.s2SingleLeverCopy], ['multi', report.steps.s2MultiLeverCopy]]) {
    ['d2s-pin-means', 'd2s-pin-inspect'].forEach((id) => {
      const t = m[id];
      if (!t || t === '—' || t.length < 8) report.findings.push(`S2-${phase}:${id} = BLANK/STUB -> ${JSON.stringify(t)}`);
    });
  }

  report.verdict = (report.findings.length === 0 && report.pageErrors.length === 0 && report.consoleErrors.length === 0
    && report.steps.moduleBound && report.steps.s2Revealed) ? 'PASS' : 'FAIL';

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'live_verify_report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('PROBE FAIL', e); process.exit(2); });
