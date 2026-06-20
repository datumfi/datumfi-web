'use strict';
/* _p8_sketch_studio_roundtrip_parity.js — THE ROUND-TRIP STABILITY GATE.
 *
 * The class of gate every prior P8.1 attempt lacked: prove the user's typed dates survive a
 * repeated Studio -> Sketch -> Studio round-trip BYTE-IDENTICALLY, with NO drift even once.
 *
 * THE LIVE BUG (Captain-isolated, reproducible): visiting Sketch then clicking the Studio tab
 * corrupted Studio's DOB -> 06/1983, Retire -> 01/2035, and the PTA age box read 84 not 85.
 * ROOT: studio.html prefillFromSketch() stamped hardcoded "06 / (year-age)" over the DOB and
 * "01 / (year+ra-age)" over the Retirement date whenever Sketch's sessionStorage carry keys
 * (datum_currentAge / datum_retireAge / datum_targetSpend, written by sketch.html) were present.
 * Those keys were cleared ONLY on a ?hydrate=blueprint open, so once Sketch was touched EVERY
 * plain Studio load re-corrupted for the rest of the session and saveDraft persisted the garbage.
 *
 * THE FIX (studio.html only): prefillFromSketch no longer fabricates the two DATE fields (only
 * the dateless spend mirror remains) and now clears the three carry keys after read, which also
 * re-enables _reassertRestoredProfile (it bailed while those keys existed) so an already-corrupted
 * draft SELF-HEALS on the next load.
 *
 * HOW THIS GATE REPRODUCES IT (faithful, worst case):
 *   - The authoritative profile lives in Clerk.user.unsafeMetadata.dossier (DOB 08/1982,
 *     Retire 03/2035 = age 52, PTA 03/2068 = age 85). localStorage starts EMPTY (no draft).
 *   - Hop 0 is a clean Studio load (no Sketch carry) — the baseline the user actually typed.
 *   - Before EACH subsequent hop we write the Sketch carry keys EXACTLY as sketch.html would for
 *     this profile (datum_currentAge=43, datum_retireAge=52, datum_targetSpend=90) and reload —
 *     i.e. we simulate re-visiting Sketch and clicking the Studio tab on every single hop. This
 *     is harder than the live bug (which only needed Sketch touched once), so a pass is decisive.
 *   - >=5 such Sketch->Studio hops. Every hop must be BYTE-IDENTICAL to the baseline.
 *
 * ASSERTIONS (drift even once = FAIL):
 *   - DOB stays 08/1982            (NEVER 06/1983)
 *   - Retire stays 03/2035         (NEVER 01/2035)
 *   - PTA age box reads "85 yrs"   (PROVEN, not assumed — NEVER 84)
 *   - sliders rest on 43 / 52 / 85 (NEVER drifting 52->51->50 / 85->84->83)
 *   - PTA / Retire focus dates stay 03/2068 / 03/2035
 *   - every hop's full capture == the baseline capture, character for character
 *
 * Run: node scripts/_p8_sketch_studio_roundtrip_parity.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
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
const PORT = 8149;
const HOPS = 6; // 6 Sketch->Studio hops after the clean baseline (>=5 required)
const norm = (s) => String(s == null ? '' : s).replace(/\s/g, '');

// Authoritative profile — the values the user TYPED. Lives ONLY in Clerk metadata (no LS draft).
const DOSSIER = {
  schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
  primary: { name: '', dateOfBirth: '08/1982', age: 43, grossIncome: 100000, targetRetirementAge: 52, targetRetirementDate: '03/2035' },
  defaults: { targetRetirementAge: 52, targetRetirementDate: '03/2035', planThroughAge: 85, planThroughDate: '03/2068', effectiveTaxRate: 0.22, defaultDatum: 90000, accessMode: 'Discover' },
  household: { profileType: 'Single', coArchitect: null },
  accounts: { currentPortfolioBalance: 500000, annualContributions: 20000 }
};
// Clerk.load() resolves after 200ms so the async seed path (the live path) is what runs.
const initScript = `(function(){
  window.Clerk = {
    load:function(){ return new Promise(function(res){ setTimeout(res, 200); }); },
    user:{ unsafeMetadata:{ dossier: ${JSON.stringify(DOSSIER)} }, update:function(){return Promise.resolve();} },
    addListener:function(){}
  };
  try{
    sessionStorage.setItem('datum_auth_hint','1');
    localStorage.setItem('datum_studio_overlay_seen','1');
  }catch(e){}
})();`;
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort(); return route.continue(); });

// What sketch.html writes for THIS profile (currentAge 43, retireAge 52, datum 90k). Setting these
// then loading Studio == visiting Sketch and clicking the Studio tab — the exact corruption trigger.
function seedSketchCarry(page) {
  return page.evaluate(() => {
    try {
      sessionStorage.setItem('datum_currentAge', '43');
      sessionStorage.setItem('datum_retireAge', '52');
      sessionStorage.setItem('datum_targetSpend', '90');
    } catch (e) {}
  });
}

// Read the full date/age surface once the async seed + the +900ms profile re-assert have landed.
async function capture(page) {
  await page.waitForTimeout(1600); // async Clerk seed + the 900ms _reassertRestoredProfile re-sync
  return page.evaluate(() => {
    // THE LIVE "84" REPRODUCTION: the PTA age the app shows is its typed PTA date resolved
    // against the DOB via the single date->age converter (DatumDateBounds.ageAtDate — the
    // same fn validateTarget/_mirrorPlanEnd/_commitPlanEndDate use). With the user's true DOB
    // 08/1982 this is 85; against the corrupted 06/1983 it is 84. So a date-corrupting load is
    // observable here as 84 even though the slider (seeded from a literal plan_end_age) may not
    // have moved. We read the LIVE dob + plan-end fields, exactly what the box derives from.
    const DB = window.DatumDateBounds;
    const dm = String((document.getElementById('pri-dob') || {}).value || '').match(/(\d{1,2})\s*\/\s*(\d{4})/);
    const peVal = (document.getElementById('plan-end-age') || {}).value;
    const ptaAgeFromDate = (DB && dm && peVal) ? DB.ageAtDate(peVal, parseInt(dm[1], 10), parseInt(dm[2], 10)) : null;
    return {
      dob: (document.getElementById('pri-dob') || {}).value,
      targetRet: (document.getElementById('target-ret') || {}).value,
      planEnd: (document.getElementById('plan-end-age') || {}).value,
      valPlan: ((document.getElementById('val-plan-through') || {}).textContent || '').trim(),
      ptaAgeFromDate: ptaAgeFromDate,
      sliderAge: parseInt((document.getElementById('slider-age') || {}).value, 10),
      sliderRet: parseInt((document.getElementById('slider-activation') || {}).value, 10),
      sliderPlan: parseInt((document.getElementById('sl-plan-through') || {}).value, 10),
      focusRet: typeof window._studioDateForField === 'function' ? window._studioDateForField('retire') : null,
      focusPta: typeof window._studioDateForField === 'function' ? window._studioDateForField('pta') : null,
      // residue check — the carry keys must NOT survive a plain load (so they stop re-firing)
      keysLeft: ['datum_currentAge', 'datum_retireAge', 'datum_targetSpend'].filter((k) => sessionStorage.getItem(k) != null)
    };
  });
}

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(initScript);
  await blockClerk(ctx);
  const page = await ctx.newPage();

  // HOP 0 — clean Studio load (no Sketch carry). The baseline = what the user typed.
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  const baseline = await capture(page);
  const baseKey = JSON.stringify({ ...baseline, keysLeft: undefined });
  const hops = [{ hop: 0, cap: baseline }];

  // HOPS 1..N — re-visit Sketch (write carry keys) then reload Studio, every single hop.
  for (let i = 1; i <= HOPS; i++) {
    await seedSketchCarry(page);
    await page.reload({ waitUntil: 'load' });
    const cap = await capture(page);
    hops.push({ hop: i, cap });
  }

  // ── Baseline truth (the typed values) ──
  check('baseline DOB = 08/1982', norm(baseline.dob) === '08/1982', baseline.dob);
  check('baseline Retire = 03/2035', norm(baseline.targetRet) === '03/2035', baseline.targetRet);
  check('baseline PTA date = 03/2068', norm(baseline.planEnd) === '03/2068', baseline.planEnd);
  check('baseline sliders 43 / 52 / 85', baseline.sliderAge === 43 && baseline.sliderRet === 52 && baseline.sliderPlan === 85, baseline.sliderAge + '/' + baseline.sliderRet + '/' + baseline.sliderPlan);

  // ── PTA age PROVEN (not assumed to fall out of the cascade) — every hop ──
  // (a) the slider/label box, and (b) the date->age recompute against the LIVE DOB — the latter
  // is the real reproduction of the live "84": it is 85 on the true DOB, 84 on the 06/1983 clobber.
  hops.forEach(({ hop, cap }) => {
    check('hop ' + hop + ': PTA age box reads "85 yrs" (NOT 84)', cap.valPlan === '85 yrs' && cap.sliderPlan === 85, 'val="' + cap.valPlan + '" slider=' + cap.sliderPlan);
    check('hop ' + hop + ': PTA age DERIVED from date vs live DOB = 85 (NOT the live 84)', cap.ptaAgeFromDate === 85, 'ageAtDate(planEnd, dobMo, dobYr)=' + cap.ptaAgeFromDate);
  });

  // ── The corruption signatures must NEVER appear — every hop ──
  hops.forEach(({ hop, cap }) => {
    check('hop ' + hop + ': DOB NOT 06/1983', norm(cap.dob) !== '06/1983', cap.dob);
    check('hop ' + hop + ': Retire NOT 01/2035', norm(cap.targetRet) !== '01/2035', cap.targetRet);
    check('hop ' + hop + ': no drift 85->84->83 (PTA=85)', cap.sliderPlan === 85, 'sl-plan-through=' + cap.sliderPlan);
    check('hop ' + hop + ': no drift 52->51->50 (Retire=52)', cap.sliderRet === 52, 'slider-activation=' + cap.sliderRet);
  });

  // ── BYTE-IDENTICAL round-trip stability — every hop == baseline, character for character ──
  hops.slice(1).forEach(({ hop, cap }) => {
    const k = JSON.stringify({ ...cap, keysLeft: undefined });
    check('hop ' + hop + ': BYTE-IDENTICAL to baseline (no drift)', k === baseKey, k === baseKey ? 'identical' : 'DRIFT: ' + k);
  });

  // ── Carry keys cleared on a plain load (so they stop re-firing; self-heal re-enabled) ──
  hops.slice(1).forEach(({ hop, cap }) => {
    check('hop ' + hop + ': Sketch carry keys CLEARED after plain load', cap.keysLeft.length === 0, cap.keysLeft.join(','));
  });

  await ctx.close(); await browser.close(); server.close();
  results.forEach((x) => console.log('  ' + x));
  console.log('  [baseline] ' + baseKey);
  hops.slice(1).forEach(({ hop, cap }) => console.log('  [hop ' + hop + '] ' + JSON.stringify({ ...cap, keysLeft: undefined })));
  console.log(fails === 0 ? '\nP8.1 SKETCH->STUDIO ROUND-TRIP STABILITY: GREEN' : '\nP8.1 SKETCH->STUDIO ROUND-TRIP STABILITY: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
