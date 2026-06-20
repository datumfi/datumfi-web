'use strict';
/* _p8_dossier_date_enforce.js — STANDING GATE for P8.1 "2B": the Dossier date fields
 * (#retireAge / #planThrough / #spouseRetireDate) migrated to DOB-anchored MM/YYYY,
 * enforced by the SHARED DatumDateBounds — parity with Studio's 2A/enforcement gate.
 *
 *   (a) invalid date REVERTS to the field's last REAL good value when one exists;
 *   (b) invalid date with NO prior good value CLEARS to empty (never snapped, never ghost);
 *   (c) NO field ever SNAPS to a bound on invalid input;
 *   (d) a valid date commits + drives the canonical integer derivation;
 *   (e) the engine payload() derives INTEGER ages only — no date/NaN reaches the body;
 *   (bc) the reopen reader normalizes all THREE legacy co-architect shapes
 *        (targetRetirementYear | targetRetirementAge | targetRetirementDate) -> canonical int;
 *   (par) Studio + Dossier share the SAME DatumDateBounds bounds (cross-validator parity).
 *
 * Run: node scripts/_p8_dossier_date_enforce.js   (exit 0 = GREEN)
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/Dossier.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
let fails = 0; const results = [];
function check(label, cond, detail) { const ok = !!cond; if (!ok) fails++; results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? ' (' + detail + ')' : '')); }
const PORT = 8143;
const Y = new Date().getFullYear();

// Stub Clerk so the Dossier reveals (no live auth) + seed localStorage when a fixture is given.
function initScript(fixture) {
  return `(function(){
    window.Clerk = { load:function(){return Promise.resolve();}, user:{ unsafeMetadata:{}, update:function(){return Promise.resolve();} }, addListener:function(){} };
    ${fixture ? `try{ var s=JSON.stringify(${JSON.stringify(fixture)}); localStorage.setItem('datumfi.accountDossier.v15', s); localStorage.setItem('datumfi.accountDossier.v14', s); }catch(e){}` : `try{ localStorage.clear(); }catch(e){}`}
  })();`;
}
const blockClerk = (ctx) => ctx.route('**/*', (route) => { const u = route.request().url(); if (!/127\.0\.0\.1/.test(u) && /clerk|cloudflareinsights|posthog|beacon/i.test(u)) return route.abort(); return route.continue(); });
async function openDossier(browser, fixture) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
  await ctx.addInitScript(initScript(fixture));
  await blockClerk(ctx);
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/Dossier.html', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  return { ctx, page };
}
// Drive a field like a user: focus (clears ghost, snapshots good), type (live MM/YYYY filter), blur (enforce).
const edit = (page, id, text) => page.evaluate(([i, t]) => {
  const el = document.getElementById(i); if (!el) return null;
  el.focus();
  el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return el.value;
}, [id, text]);
const read = (page) => page.evaluate(() => ({
  dob: (document.getElementById('dob') || {}).value,
  retire: (document.getElementById('retireAge') || {}).value,
  plan: (document.getElementById('planThrough') || {}).value,
  coDob: (document.getElementById('spouseDob') || {}).value,
  coRet: (document.getElementById('spouseRetireDate') || {}).value
}));
const buildPayload = (page) => page.evaluate(() => { try { return typeof payload === 'function' ? payload() : null; } catch (e) { return 'ERR:' + e.message; } });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ───────── enforcement + integer-payload (a)-(e) ─────────
  {
    const { ctx, page } = await openDossier(browser, null);
    check('(g) DatumDateBounds present on Dossier', await page.evaluate(() => typeof (window.DatumDateBounds || {}).validateTarget === 'function'));

    // Seed a valid DOB + valid Target Retirement so a last-known-good exists.
    const dob = '06 / ' + (Y - 45);            // age 45
    const goodRet = '06 / ' + (Y - 45 + 65);   // retire 65
    await edit(page, 'dob', dob); await page.waitForTimeout(120);
    await edit(page, 'retireAge', goodRet); await page.waitForTimeout(120);
    let r = await read(page);
    check('(d) valid Target Retirement commits', r.retire.replace(/\s/g, '') === goodRet.replace(/\s/g, ''), r.retire);
    let pl = await buildPayload(page);
    check('(d/e) payload retire derives integer 65', pl && pl.defaults && pl.defaults.targetRetirementAge === 65, JSON.stringify(pl && pl.defaults));
    check('(e) payload current_age + plan are INTEGER', pl && Number.isInteger(pl.primary.age) && Number.isInteger(pl.defaults.planThroughAge), JSON.stringify(pl && { a: pl.primary.age, p: pl.defaults.planThroughAge }));

    // (a) garbage retire date (year 5656) reverts to last-known-good; never snaps to 90.
    await edit(page, 'retireAge', '06 / 5656'); await page.waitForTimeout(120);
    r = await read(page);
    check('(a) garbage retire reverts to last-good', r.retire.replace(/\s/g, '') === goodRet.replace(/\s/g, ''), r.retire);
    const snapDate = '01 / ' + (Y - 45 + 90);  // the date a snap-to-90 would produce
    check('(c) garbage retire does NOT snap to a bound (90)', r.retire.replace(/\s/g, '') !== snapDate.replace(/\s/g, ''), r.retire);
    pl = await buildPayload(page);
    check('(e) payload still integer after garbage (no NaN/date)', pl && Number.isInteger(pl.defaults.targetRetirementAge) && pl.defaults.targetRetirementAge === 65, JSON.stringify(pl && pl.defaults));

    // (b) co-arch retire with NO prior good clears to empty (toggle co on first).
    await page.evaluate(() => { const t = document.getElementById('spouseToggle'); if (t && !t.classList.contains('on')) t.click(); const f = document.getElementById('coFields'); if (f) f.classList.add('show'); });
    await edit(page, 'spouseDob', '05 / ' + (Y - 43)); await page.waitForTimeout(120);
    await edit(page, 'spouseRetireDate', '06 / 5656'); await page.waitForTimeout(120);
    r = await read(page);
    check('(b) invalid co-retire with no prior good CLEARS to empty (not snapped)', !r.coRet.trim(), JSON.stringify(r.coRet));
    // then a good co value commits, and a later garbage value reverts to it.
    const goodCo = '05 / ' + (Y - 43 + 60);
    await edit(page, 'spouseRetireDate', goodCo); await page.waitForTimeout(100);
    await edit(page, 'spouseRetireDate', '06 / 5656'); await page.waitForTimeout(100);
    r = await read(page);
    check('(a) co-retire reverts to last-good after a good value existed', r.coRet.replace(/\s/g, '') === goodCo.replace(/\s/g, ''), r.coRet);
    pl = await buildPayload(page);
    check('(e) co payload age INTEGER + date mirror string + no legacy year', pl && Number.isInteger(pl.household.coArchitect.targetRetirementAge) && typeof pl.household.coArchitect.targetRetirementDate === 'string' && pl.household.coArchitect.targetRetirementYear === undefined, JSON.stringify(pl && pl.household.coArchitect));

    // (raf) REGRESSION — the private validateAges/validateAgeFields clamp these fields to a
    // 2-digit integer from inside rAF callbacks on load. Prove the <head> rAF guard reverts ANY
    // field write performed inside an rAF callback (the exact mechanism), so a committed MM/YYYY
    // can no longer be clamped. We simulate the private validator by writing '45' inside an rAF.
    check('(raf) guard installed — requestAnimationFrame is wrapped', await page.evaluate(() => /__dossier2BReady/.test(String(window.requestAnimationFrame))));
    await edit(page, 'retireAge', '06 / ' + (Y - 45 + 65)); await page.waitForTimeout(80);
    const before = (await read(page)).retire;
    const after = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => { document.getElementById('retireAge').value = '45'; }); // == the legacy clamp
      requestAnimationFrame(() => resolve(document.getElementById('retireAge').value));
    }));
    check('(raf) rAF write to a migrated field is REVERTED (no MM/YYYY -> integer clamp)', after === before && /^\d{2}\/\d{4}$/.test((after || '').replace(/\s/g, '')), 'before=' + before + ' after=' + after);
    await ctx.close();
  }

  // ───────── back-compat: 3 legacy co-architect shapes -> canonical int 62 ─────────
  {
    const coDob = '05/1984', expected = 2046 - 1984; // 62
    const base = (co) => ({ schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
      primary: { dateOfBirth: '06/1981', targetRetirementAge: 65 },
      defaults: { targetRetirementAge: 65, planThroughAge: 90 },
      household: { coArchitect: Object.assign({ dateOfBirth: coDob }, co) } });
    const fixtures = [
      ['legacy YEAR shape', base({ targetRetirementYear: 2046 })],
      ['legacy AGE shape', base({ targetRetirementAge: 62 })],
      ['new DATE shape', base({ targetRetirementDate: '05/2046', targetRetirementAge: 62 })]
    ];
    for (const [label, fx] of fixtures) {
      const { ctx, page } = await openDossier(browser, fx);
      await page.waitForTimeout(300);
      const r = await read(page);
      const pl = await buildPayload(page);
      const fieldOk = /^\d{2}\/\d{4}$/.test((r.coRet || '').replace(/\s/g, ''));
      const ageOk = pl && pl.household && pl.household.coArchitect && pl.household.coArchitect.targetRetirementAge === expected;
      check('(bc) ' + label + ' -> field MM/YYYY', fieldOk, r.coRet);
      check('(bc) ' + label + ' -> canonical int age ' + expected, ageOk, JSON.stringify(pl && pl.household && pl.household.coArchitect));
      await ctx.close();
    }
  }

  // ───────── cross-validator parity: Studio + Dossier share the SAME bounds ─────────
  {
    const dossier = await openDossier(browser, null);
    const dBounds = await dossier.page.evaluate(() => { const B = window.DatumDateBounds; return { AGE_MIN: B.AGE_MIN, AGE_MAX: B.AGE_MAX, RA_MIN_FLOOR: B.RA_MIN_FLOOR, RA_MAX: B.RA_MAX, PTA_MIN_FLOOR: B.PTA_MIN_FLOOR, PTA_MAX: B.PTA_MAX }; });
    const sctx = await browser.newContext();
    await sctx.addInitScript('window.Clerk={load:function(){return Promise.resolve();},user:{unsafeMetadata:{}}};');
    await blockClerk(sctx);
    const spage = await sctx.newPage();
    await spage.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
    await spage.waitForTimeout(900);
    const sBounds = await spage.evaluate(() => { const B = window.DatumDateBounds || {}; return B.AGE_MIN === undefined ? null : { AGE_MIN: B.AGE_MIN, AGE_MAX: B.AGE_MAX, RA_MIN_FLOOR: B.RA_MIN_FLOOR, RA_MAX: B.RA_MAX, PTA_MIN_FLOOR: B.PTA_MIN_FLOOR, PTA_MAX: B.PTA_MAX }; });
    check('(par) Studio exposes DatumDateBounds', !!sBounds, JSON.stringify(sBounds));
    check('(par) Studio + Dossier bounds IDENTICAL', sBounds && JSON.stringify(sBounds) === JSON.stringify(dBounds), 'S=' + JSON.stringify(sBounds) + ' D=' + JSON.stringify(dBounds));
    await sctx.close(); await dossier.ctx.close();
  }

  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nP8.1 DOSSIER DATE ENFORCEMENT: GREEN' : '\nP8.1 DOSSIER DATE ENFORCEMENT: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE FAIL', e); server.close(); process.exit(1); });
