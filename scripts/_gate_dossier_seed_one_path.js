'use strict';
/* THERE IS ONE SEEDING PATH — Architect-ruled 2026-08-03 (#599 Part 1).
 *
 * THE DEFECT THIS PINS. The dossier reaches the Studio by two independent routes:
 *   SYNCHRONOUS (studio.html:14063-14068) — LS holds datumfi.accountDossier.v15 -> applyDossierSliders(p)
 *     seeds slider-age, slider-activation AND sl-plan-through.
 *   ASYNC / DIRECT LOAD (studio.html:14070+) — LS empty, dossier only in Clerk.unsafeMetadata ->
 *     applyDossierProfile() fills the profile DATE fields, then syncFromProfileDates() derives ages
 *     from those dates. It converts the retirement date back to an age; there is NO equivalent step
 *     for plan-through, so sl-plan-through keeps the schema default 93.
 * Worse, applyDossierProfile seeds plan-end-age CORRECTLY (03/2068), and _mirrorPlanEnd then sees the
 * date imply ~85 while the unseeded slider says 93, calls that a mismatch, and OVERWRITES THE CORRECT
 * VALUE with one derived from the default. The good value is written and then destroyed.
 * USER IMPACT: on a direct Studio load after a fresh sign-in, a person who planned through 85 sees 93 —
 * seven years of retirement they never asked for, in the flattering direction, with the ceiling, the
 * floor and the whole Shape computed against a horizon they did not choose.
 *
 * 🔑 THE RULE THIS GATE ENFORCES IS STRUCTURAL, NOT ARITHMETIC. It does not assert "a date-to-age
 * conversion exists". It asserts that EVERY slider the dossier can seed IS seeded on the async route,
 * so that adding a fourth slider later cannot possibly seed on one route and not the other. Two routes
 * kept in sync by memory is the defect; the missing conversion was only its symptom. (L48 reuse, do not
 * fork — applied to control flow.)
 *
 * 🔑 PRESENCE BEFORE ANY VALUE CLAIM. A seeding gate that silently took the SYNCHRONOUS route proves
 * nothing at all — it would pass while the async route stayed broken. So P1-P4 prove the async route
 * actually ran (LS empty at boot, the seed-gate engaged, the resolver present, the sliders exist)
 * BEFORE a single value is compared, and they are never inverted by a mutation.
 *
 * 🔑 NO FROZEN AGE. The expected current age is DERIVED from the fixture DOB with the product's own
 * rule. _p8_studio_direct_seed_parity froze `age: 43` beside DOB 08/1982 and silently went red the
 * week that person turned 44. A fixture must not assert an age it did not compute.
 *
 * RED-FIRST: this gate FAILS against HEAD before the fix (sl-plan-through rests at 93, plan-end shows
 * a date derived from 93). After the fix, --noconverge removes the shared-routine call and it RED-s again.
 * Usage: node scripts/_gate_dossier_seed_one_path.js [LABEL] [--noconverge]
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(ROOT + '/node_modules/playwright');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NOCONV = process.argv.includes('--noconverge');
const PORT = 8354;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };

/* --noconverge — remove the ONE shared-routine call that makes the async route seed the sliders.
   Anchored on the call itself so that if someone re-forks the paths this anchor stops matching and
   the gate says so loudly instead of passing. */
const A_CONV = 'if (!_bp2) applyDossierSliders(_cd);';
const M_CONV = 'if (false) applyDossierSliders(_cd);   /* removed by --noconverge */';

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (NOCONV && /studio\.html$/.test(p)) {
    const src = body.toString('utf8');
    const n = src.split(A_CONV).length - 1;
    if (n !== 1) { console.error('anchor A_CONV: expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
    body = Buffer.from(src.replace(A_CONV, M_CONV), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

// FIXTURE STATE (one line): the user signed in fresh and opened the Studio directly, having set a
// retirement age of 52 and a plan-through age of 85 — their dossier lives only in Clerk, never in
// this browser's localStorage.
const DOB_MO = 8, DOB_YR = 1982;
const DOSSIER = {
  schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
  primary: { name: '', dateOfBirth: '08/1982', grossIncome: 100000, targetRetirementAge: 52, targetRetirementDate: '03/2035' },
  defaults: { targetRetirementAge: 52, targetRetirementDate: '03/2035', planThroughAge: 85, planThroughDate: '03/2068', effectiveTaxRate: 0.22, defaultDatum: 90000, accessMode: 'Discover' },
  household: { profileType: 'Single', coArchitect: null },
  accounts: { currentPortfolioBalance: 500000, annualContributions: 20000 }
};
// DERIVED, never frozen — the product's own rule (studio.html:13618): whole years since DOB, minus one
// if this month is before the birth month.
function expectedAge() {
  const now = new Date();
  let a = now.getFullYear() - DOB_YR;
  if (now.getMonth() + 1 < DOB_MO) a--;
  return a;
}

const initScript = '(function(){\n' +
'  window.Clerk = { load:function(){ return new Promise(function(r){ setTimeout(r,350); }); },\n' +
'    user:{ unsafeMetadata:{ dossier: ' + JSON.stringify(DOSSIER) + ' }, update:function(){return Promise.resolve();} },\n' +
'    addListener:function(){} };\n' +
'  try{ sessionStorage.setItem("datum_auth_hint","1"); localStorage.setItem("datum_studio_overlay_seen","1"); }catch(e){}\n' +
'  try{ window.__lsDossierAtBoot = localStorage.getItem("datumfi.accountDossier.v15"); }catch(e){ window.__lsDossierAtBoot = "__THREW__"; }\n' +
'})();';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(initScript);
  await ctx.route('**/*', (route) => { const u = route.request().url();
    if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort(); return route.continue(); });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });

  // EARLY — before the delayed resolver lands. The seed-gate is engaged ONLY on the async branch
  // (studio.html:14074), so this is the proof that the synchronous rung did NOT take the seed.
  const early = await page.evaluate(() => ({
    gated: (document.getElementById('studio-layout') || {}).classList
      ? document.getElementById('studio-layout').classList.contains('seed-gated') : null,
    lsAtBoot: window.__lsDossierAtBoot,
    resolver: typeof window._datumSeedDossier
  }));

  await page.waitForTimeout(1600);

  const r = await page.evaluate(() => ({
    haveAge:  !!document.getElementById('slider-age'),
    haveRet:  !!document.getElementById('slider-activation'),
    havePta:  !!document.getElementById('sl-plan-through'),
    age: (document.getElementById('slider-age') || {}).value,
    ret: (document.getElementById('slider-activation') || {}).value,
    pta: (document.getElementById('sl-plan-through') || {}).value,
    planEnd: ((document.getElementById('plan-end-age') || {}).value || '').replace(/\s/g, ''),
    targetRet: ((document.getElementById('target-ret') || {}).value || '').replace(/\s/g, ''),
    // Part 3 ruling: the AGE is canonical, the date is derived. So the honest question is not
    // "does the stored date survive" but "does the displayed date imply the canonical age".
    impliedAge: (function () {
      try {
        var DB = window.DatumDateBounds, el = document.getElementById('plan-end-age');
        if (!DB || !DB.ageAtDate || !el || !el.value) return null;
        return DB.ageAtDate(el.value, 8, 1982);
      } catch (e) { return null; }
    })()
  }));

  console.log('=== ' + LABEL + ' === MODE: ' + (NOCONV ? 'NOCONVERGE' : 'NORMAL'));
  console.log('  early ' + JSON.stringify(early));
  console.log('  final ' + JSON.stringify(r));

  // ── PRESENCE — never inverted by a mutation. Without these the value claims below are unmoored:
  // a run that quietly took the SYNCHRONOUS route would satisfy every value assertion and prove nothing.
  ok(early.lsAtBoot === null, 'P1 [PRESENCE] localStorage held NO v15 dossier at boot (the async route is the only one available)');
  ok(early.gated === true,    'P2 [PRESENCE] the seed-gate engaged — the ASYNC branch ran, not the synchronous rung');
  ok(early.resolver === 'function', 'P3 [PRESENCE] window._datumSeedDossier exists (the async route bails without it)');
  ok(r.haveAge && r.haveRet && r.havePta, 'P4 [PRESENCE] all three sliders exist to be seeded');

  // ── THE INVARIANT — every slider the dossier can seed IS seeded, on the async route.
  const wantAge = expectedAge();
  ok(parseInt(r.age, 10) === wantAge, 'S1 current age seeded from DOB — derived ' + wantAge + ', got ' + r.age);
  ok(parseInt(r.ret, 10) === 52,      'S2 retirement age seeded from the dossier — want 52, got ' + r.ret);
  ok(parseInt(r.pta, 10) === 85,      'S3 PLAN-THROUGH age seeded from the dossier — want 85, got ' + r.pta);
  ok(r.targetRet === '03/2035', 'S5 retirement date seeded — want 03/2035, got ' + r.targetRet);

  /* ── THE DATE MUST BE AN HONEST DERIVATION OF THE CANONICAL AGE (Part 3: age is truth, date is
   * derived and display-only). Not "does the STORED date survive" — that would re-assert the
   * date-as-input model the ruling retired. This caught a real second defect on its first run:
   * _mirrorPlanEnd passed the DISPLAY month into DB.dateFromAge, whose 2nd argument is the DOB MONTH
   * by contract and anchors the year, so age 85 on an 08/1982 DOB rendered 03/2067 and read back as
   * 84. Fixed in the same commit ONLY because the _loadSource guard removed the mask that hid it —
   * see the commit message; shipping the guard alone regressed _p8_studio_seed_parity. */
  ok(r.impliedAge !== null, 'S6 [PRESENCE] the plan-end date is parseable (an unreadable field cannot be judged consistent)');
  ok(r.impliedAge === 85, 'S7 the plan-end date implies the canonical plan-through age 85 — got ' + r.impliedAge + ' from ' + r.planEnd);

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await browser.close(); server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('GATE THREW', e); try { server.close(); } catch (x) {} process.exit(1); });
