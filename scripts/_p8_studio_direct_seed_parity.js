'use strict';
/* _p8_studio_direct_seed_parity.js — THE LOOP-ENDER GATE (the assertion every prior gate lacked).
 *
 * Every prior seed gate (_p8_studio_seed_parity) pre-seeds the Dossier into localStorage, so it only
 * ever exercises the SYNCHRONOUS path. The live bug was the ASYNC one: on a DIRECT Studio load after a
 * fresh sign-in, the authoritative Dossier lives ONLY in Clerk.user.unsafeMetadata (NOT yet in LS,
 * because the user never visited Profile). Studio's synchronous seed therefore found nothing, painted
 * the schema defaults (40/65/93), and — because seedFromBlueprint always returned true — NEVER ran the
 * Clerk dossier fallback. Result: hardcoded 40/65/93 on screen until you passed through Profile.
 *
 * This gate reproduces that exact path and proves the fix on BOTH axes:
 *   1. RENDER-GATE: while the sliders still hold the schema defaults (40/65/93), #studio-layout is
 *      visibility:hidden (class 'seed-gated') — so there is NO window where the wrong numbers show.
 *   2. ASYNC SEED: after the (deliberately delayed) Clerk.load() resolves, the sliders REST on
 *      43 / 52 / 85 and the date fields read 03/2035 / 03/2068 — the values the user actually typed —
 *      and the stage is revealed.
 *
 * localStorage is left EMPTY (no Dossier, no draft, no Profile visit). Clerk.load() is delayed 350ms so
 * the default-paint window is deterministically observable.
 *
 * Run: node scripts/_p8_studio_direct_seed_parity.js   (exit 0 = GREEN)
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
const PORT = 8148;
const norm = (s) => String(s == null ? '' : s).replace(/\s/g, '');

// Same canonical payload as the sync gate — but it lives ONLY in Clerk metadata here, never in LS.
const DOSSIER = {
  schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
  primary: { name: '', dateOfBirth: '08/1982', age: 43, grossIncome: 100000, targetRetirementAge: 52, targetRetirementDate: '03/2035' },
  defaults: { targetRetirementAge: 52, targetRetirementDate: '03/2035', planThroughAge: 85, planThroughDate: '03/2068', effectiveTaxRate: 0.22, defaultDatum: 90000, accessMode: 'Discover' },
  household: { profileType: 'Single', coArchitect: null },
  accounts: { currentPortfolioBalance: 500000, annualContributions: 20000 }
};
// Direct-load reproduction: Dossier ONLY in Clerk.unsafeMetadata; localStorage stays EMPTY. Clerk.load()
// is delayed 350ms so the schema-default paint window is observable. auth-hint + overlay-seen are set so
// the intro overlay auto-hides and the page lands DIRECTLY on the drafting stage (the smoking-gun path).
const initScript = `(function(){
  window.Clerk = {
    load:function(){ return new Promise(function(res){ setTimeout(res, 350); }); },
    user:{ unsafeMetadata:{ dossier: ${JSON.stringify(DOSSIER)} }, update:function(){return Promise.resolve();} },
    addListener:function(){}
  };
  try{
    sessionStorage.setItem('datum_auth_hint','1');
    localStorage.setItem('datum_studio_overlay_seen','1');
  }catch(e){}
})();`;
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort(); return route.continue(); });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(initScript);
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });

  // EARLY snapshot — Clerk.load() (350ms) has NOT resolved yet, so the sliders still hold the schema
  // defaults. The render-gate MUST have them hidden so the wrong numbers never flash.
  const early = await page.evaluate(() => {
    const lay = document.getElementById('studio-layout');
    const cs = lay ? getComputedStyle(lay) : null;
    return {
      gated: lay ? lay.classList.contains('seed-gated') : null,
      visibility: cs ? cs.visibility : null,
      sliderAge: parseInt((document.getElementById('slider-age') || {}).value, 10),
      sliderRet: parseInt((document.getElementById('slider-activation') || {}).value, 10),
      sliderPlan: parseInt((document.getElementById('sl-plan-through') || {}).value, 10)
    };
  });

  // Let the delayed Clerk seed land + reveal.
  await page.waitForTimeout(1100);

  const r = await page.evaluate(() => {
    const lay = document.getElementById('studio-layout');
    const cs = lay ? getComputedStyle(lay) : null;
    return {
      gated: lay ? lay.classList.contains('seed-gated') : null,
      visibility: cs ? cs.visibility : null,
      dob: (document.getElementById('pri-dob') || {}).value,
      targetRet: (document.getElementById('target-ret') || {}).value,
      planEnd: (document.getElementById('plan-end-age') || {}).value,
      sliderAge: parseInt((document.getElementById('slider-age') || {}).value, 10),
      sliderRet: parseInt((document.getElementById('slider-activation') || {}).value, 10),
      sliderPlan: parseInt((document.getElementById('sl-plan-through') || {}).value, 10),
      focusRet: typeof window._studioDateForField === 'function' ? window._studioDateForField('retire') : null,
      focusPta: typeof window._studioDateForField === 'function' ? window._studioDateForField('pta') : null
    };
  });

  // 1. RENDER-GATE — the default-paint window was hidden (no 40/65/93 flash).
  check('render-gate: layout HIDDEN while defaults painted (no 40/65/93 flash)', early.gated === true && early.visibility === 'hidden', 'gated=' + early.gated + ' vis=' + early.visibility);
  check('render-gate: defaults (40/65/93) WERE the pre-seed values (hidden, not shown)', early.sliderAge === 40 && early.sliderRet === 65 && early.sliderPlan === 93, early.sliderAge + '/' + early.sliderRet + '/' + early.sliderPlan);

  // 2. ASYNC SEED — direct load lands the typed values, NOT the hardcoded defaults.
  check('direct load: retire RESTS on 52 (NOT 65 default)', r.sliderRet === 52, 'slider-activation=' + r.sliderRet);
  check('direct load: PTA RESTS on 85 (NOT 93 default)', r.sliderPlan === 85, 'sl-plan-through=' + r.sliderPlan);
  check('direct load: current age 43 (NOT 40 default)', r.sliderAge === 43, 'slider-age=' + r.sliderAge);
  check('direct load: NOT the hardcoded 40/65/93', !(r.sliderAge === 40 && r.sliderRet === 65 && r.sliderPlan === 93), r.sliderAge + '/' + r.sliderRet + '/' + r.sliderPlan);
  check('direct load: DOB seeds 08/1982', norm(r.dob) === '08/1982', r.dob);
  check('direct load: target-ret shows 03/2035', norm(r.targetRet) === '03/2035', r.targetRet);
  check('direct load: plan-end-age shows 03/2068', norm(r.planEnd) === '03/2068', r.planEnd);
  check('direct load: retire focus 03/2035', norm(r.focusRet) === '03/2035', r.focusRet);
  check('direct load: PTA focus 03/2068', norm(r.focusPta) === '03/2068', r.focusPta);

  // 3. REVEAL — the stage is shown once the seed has landed.
  check('reveal: layout visible after seed', r.gated === false && r.visibility === 'visible', 'gated=' + r.gated + ' vis=' + r.visibility);

  await ctx.close(); await browser.close(); server.close();
  results.forEach((x) => console.log('  ' + x));
  console.log('  [early] ' + JSON.stringify(early));
  console.log('  [final] ' + JSON.stringify(r));
  console.log(fails === 0 ? '\nP8.1 STUDIO DIRECT-LOAD SEED PARITY: GREEN' : '\nP8.1 STUDIO DIRECT-LOAD SEED PARITY: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
