'use strict';
/* _p8_studio_seed_parity.js — STANDING GATE (the loop-ender for cross-surface date parity).
 * Seeds a real Dossier v15 payload (DOB 08/1982 + retire 03/2035 + PTA 03/2068) into localStorage,
 * loads studio.html, and proves the SEED path preserves the typed MONTH — the bug where Studio
 * fabricated the date from the DOB month + a pure year-add, showing 53 / 08/2035 instead of 52 / 03/2035.
 *
 *   - Studio retirement toggle RESTS on age 52 (NOT 53); focus shows 03/2035 (NOT 08/2035);
 *   - Studio PTA toggle RESTS on age 85; focus shows 03/2068;
 *   - Architect Profile target-ret field shows 03/2035 (not a DOB-month rebuild);
 *   - cross-surface: Studio age == Dossier ageAtDate == 52 for identical inputs.
 *
 * Run: node scripts/_p8_studio_seed_parity.js   (exit 0 = GREEN)
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
const PORT = 8147;
const norm = (s) => String(s == null ? '' : s).replace(/\s/g, '');

// A real Dossier v15 payload (post age-box port): canonical integer ages + the typed date strings.
const DOSSIER = {
  schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
  primary: { name: '', dateOfBirth: '08/1982', age: 43, grossIncome: 100000, targetRetirementAge: 52, targetRetirementDate: '03/2035' },
  defaults: { targetRetirementAge: 52, targetRetirementDate: '03/2035', planThroughAge: 85, planThroughDate: '03/2068', effectiveTaxRate: 0.22, defaultDatum: 90000, accessMode: 'Discover' },
  household: { profileType: 'Single', coArchitect: null },
  accounts: { currentPortfolioBalance: 500000, annualContributions: 20000 }
};
const initScript = `(function(){
  window.Clerk = { load:function(){return Promise.resolve();}, user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} };
  try{ var s=JSON.stringify(${JSON.stringify(DOSSIER)}); localStorage.setItem('datumfi.accountDossier.v15', s); localStorage.setItem('datumfi.accountDossier.v14', s); }catch(e){}
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
  await page.waitForTimeout(1600);
  await page.evaluate(() => { const b = document.getElementById('studioStartScratch'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => ({
    dob: (document.getElementById('pri-dob') || {}).value,
    targetRet: (document.getElementById('target-ret') || {}).value,
    planEnd: (document.getElementById('plan-end-age') || {}).value,
    sliderAge: parseInt((document.getElementById('slider-age') || {}).value, 10),
    sliderRet: parseInt((document.getElementById('slider-activation') || {}).value, 10),
    sliderPlan: parseInt((document.getElementById('sl-plan-through') || {}).value, 10),
    focusRet: typeof window._studioDateForField === 'function' ? window._studioDateForField('retire') : null,
    focusPta: typeof window._studioDateForField === 'function' ? window._studioDateForField('pta') : null,
    dossierAge: window.DatumDateBounds ? window.DatumDateBounds.ageAtDate('03/2035', 8, 1982) : null,
    dossierPta: window.DatumDateBounds ? window.DatumDateBounds.ageAtDate('03/2068', 8, 1982) : null
  }));

  check('DOB seeds as 08/1982', norm(r.dob) === '08/1982', r.dob);
  // retirement: rests on age 52 (NOT 53), focus shows 03/2035 (NOT 08/2035)
  check('retire toggle RESTS on age 52 (not 53)', r.sliderRet === 52, 'slider-activation=' + r.sliderRet);
  check('Architect Profile target-ret shows 03/2035 (not 08/2035)', norm(r.targetRet) === '03/2035', r.targetRet);
  check('retire focus shows 03/2035 (not 08/2035)', norm(r.focusRet) === '03/2035', r.focusRet);
  // PTA: rests 85, focus 03/2068
  check('PTA toggle RESTS on age 85', r.sliderPlan === 85, 'sl-plan-through=' + r.sliderPlan);
  check('plan-end-age shows 03/2068 (not DOB-month rebuild)', norm(r.planEnd) === '03/2068', r.planEnd);
  check('PTA focus shows 03/2068', norm(r.focusPta) === '03/2068', r.focusPta);
  // cross-surface parity
  check('cross-surface: Studio retire age == Dossier ageAtDate == 52', r.sliderRet === 52 && r.dossierAge === 52, 'studio=' + r.sliderRet + ' dossier=' + r.dossierAge);
  check('cross-surface: Studio PTA age == Dossier ageAtDate == 85', r.sliderPlan === 85 && r.dossierPta === 85, 'studio=' + r.sliderPlan + ' dossier=' + r.dossierPta);

  await ctx.close(); await browser.close(); server.close();
  results.forEach((x) => console.log('  ' + x));
  console.log('  [raw] ' + JSON.stringify(r));
  console.log(fails === 0 ? '\nP8.1 STUDIO SEED MONTH-PARITY: GREEN' : '\nP8.1 STUDIO SEED MONTH-PARITY: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
