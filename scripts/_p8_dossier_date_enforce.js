'use strict';
/* _p8_dossier_date_enforce.js — STANDING GATE for the P8.1 "AGE-BOX PORT": the three Dossier
 * toggle boxes (#retireAge / #planThrough / #spouseRetireDate) REST on an integer AGE and present
 * a MM/YYYY date only while focused — a faithful port of Studio's S1 inline age inputs
 * (_parseAgeOrDate / _commitAgeDate / _dateForField). Canonical state = el._ageVal (the only thing
 * the engine reads) + el._dateStr (the typed "MM/YYYY"; the month's only home).
 *
 *   (a) invalid -> revert to last REAL good {age,date}; (b) no prior good -> clear; (c) NO bound snap;
 *   (d) valid commits to the AGE; (e) payload derives INTEGER ages only (no date/NaN to the engine);
 *   (raf) the <head> rAF guard still reverts a stray rAF write to a box;
 *   (i) type RA/PTA, change DOB -> the ages SURVIVE (no collapse);
 *   (iii) MONTH SURVIVAL (the loop-ender): DOB 08/1982 + retire 03/2035 -> rest 52 -> SAVE -> REOPEN
 *         -> rest 52 -> focus shows 03/2035 (NOT 08/2034) -> payload age 52;
 *   (port) reject 08/9889990 / letters / month 13, enforce RA>=CurrentAge & PTA>=RA, stop-at-2-digits,
 *          auto-dash after 2 digits — PORT EVERYTHING;
 *   (bc) all three legacy co shapes -> canonical int; (legacy) a saved row with NO date string reopens
 *        clean (DOB-derived on focus);
 *   (par) Studio == Dossier: identical bounds AND identical ageAtDate/dateFromAge rounding.
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
/* CALENDAR SWEEP 2026-08-03 — CHECKED AND CALENDAR-SAFE; do not re-derive this.
   It LOOKS like the seasonal bomb that _p8_profile_date_enforce turned out to be (a DOB anchored to
   month 06 / 05 beside literal ages), but it is not. Every age here is a DIFFERENCE between two dates
   that shift together with Y — dob '06/(Y-45)' vs retire '06/(Y-45+65)' is 65 in every month — and the
   two non-DOB-month cases ((iii) and (par)) use FULLY ABSOLUTE dates (08/1982, 03/2035), which cannot
   move at all. Verified by evaluating the product's ageAtDate rule for all twelve months: 65/60/52/52
   constant throughout. A FIX VERIFIED ONLY IN THE CURRENT MONTH IS THE SAME DEFECT WEARING A REPAIR. */
const Y = new Date().getFullYear();

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
// Type a DATE into a box (through the live fmtDateStr filter) and blur -> commits to an AGE.
// Returns the RESTING value (an age for the 3 toggle boxes; a date for the DOB boxes).
const typeBox = (page, id, text) => page.evaluate(([i, t]) => {
  const el = document.getElementById(i); if (!el) return null;
  el.focus();
  el.value = t; el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return el.value;
}, [id, text]);
// Focus a box and read the DATE it presents for editing (then blur leaves it re-committed/unchanged).
const focusDate = (page, id) => page.evaluate((i) => {
  const el = document.getElementById(i); if (!el) return null;
  el.focus(); const v = el.value; el.blur(); return v;
}, id);
// Resting display of every box (ages for the toggles, dates for DOB).
const read = (page) => page.evaluate(() => ({
  dob: (document.getElementById('dob') || {}).value,
  retire: (document.getElementById('retireAge') || {}).value,
  plan: (document.getElementById('planThrough') || {}).value,
  coDob: (document.getElementById('spouseDob') || {}).value,
  coRet: (document.getElementById('spouseRetireDate') || {}).value
}));
const buildPayload = (page) => page.evaluate(() => { try { return typeof payload === 'function' ? payload() : null; } catch (e) { return 'ERR:' + e.message; } });
const coOn = (page) => page.evaluate(() => { const t = document.getElementById('spouseToggle'); if (t && !t.classList.contains('on')) t.click(); const f = document.getElementById('coFields'); if (f) f.classList.add('show'); });

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();

  // ───────── (a)-(e) enforcement + integer payload + age-at-rest ─────────
  {
    const { ctx, page } = await openDossier(browser, null);
    check('(g) DatumDateBounds present (dateFromAge/fmtDateStr too)', await page.evaluate(() => { const B = window.DatumDateBounds || {}; return typeof B.validateTarget === 'function' && typeof B.dateFromAge === 'function' && typeof B.fmtDateStr === 'function'; }));

    const dob = '06/' + (Y - 45);              // current age 45
    await typeBox(page, 'dob', dob); await page.waitForTimeout(100);
    const restRet = await typeBox(page, 'retireAge', '06/' + (Y - 45 + 65)); await page.waitForTimeout(100);  // retire 65
    check('(d) valid commit RESTS on the AGE (not a date)', restRet === '65', restRet);
    check('(d) focus presents the DATE for editing', /^\d{2}\/\d{4}$/.test((await focusDate(page, 'retireAge')) || ''), await focusDate(page, 'retireAge'));
    let pl = await buildPayload(page);
    check('(e) payload retire age INTEGER 65', pl && pl.defaults && pl.defaults.targetRetirementAge === 65, JSON.stringify(pl && pl.defaults));
    check('(e) payload current_age + plan are INTEGER', pl && Number.isInteger(pl.primary.age) && Number.isInteger(pl.defaults.planThroughAge), JSON.stringify(pl && { a: pl.primary.age, p: pl.defaults.planThroughAge }));
    check('(e) payload carries non-authoritative date string', pl && typeof pl.defaults.targetRetirementDate === 'string' && /^\d{2}\/\d{4}$/.test(pl.defaults.targetRetirementDate), JSON.stringify(pl && pl.defaults.targetRetirementDate));

    // (a) garbage reverts to last-good AGE; (c) never snaps to a bound.
    const afterGarbage = await typeBox(page, 'retireAge', '06/5656'); await page.waitForTimeout(100);
    check('(a) garbage retire reverts to last-good age 65', afterGarbage === '65', afterGarbage);
    check('(c) garbage retire does NOT snap to a bound (90/45)', afterGarbage !== '90' && afterGarbage !== '45', afterGarbage);
    pl = await buildPayload(page);
    check('(e) payload still integer 65 after garbage', pl && pl.defaults.targetRetirementAge === 65, JSON.stringify(pl && pl.defaults));

    // (b) co-arch with NO prior good clears.
    await coOn(page);
    await typeBox(page, 'spouseDob', '05/' + (Y - 43)); await page.waitForTimeout(100);
    await typeBox(page, 'spouseRetireDate', '06/5656'); await page.waitForTimeout(100);
    // Age-at-rest: a box with NO prior good falls back to the GHOST DEFAULT age (grey, non-
    // authoritative, _ageVal still null) — "all show ages". 65 is the default, NOT a bound, and
    // the garbage is not persisted as a real edit. (anti-snap + anti-persist both still proven.)
    const coBad = await page.evaluate(() => { const el = document.getElementById('spouseRetireDate'); return { v: el.value, ghost: el.classList.contains('ghost-default'), age: el._ageVal }; });
    check('(b) invalid co-retire (no prior good) -> GHOST default age, not snapped/persisted', coBad.v === '65' && coBad.ghost === true && coBad.age == null, JSON.stringify(coBad));
    const coGood = await typeBox(page, 'spouseRetireDate', '05/' + (Y - 43 + 60)); await page.waitForTimeout(80);
    check('(d) valid co-retire rests on age 60', coGood === '60', coGood);
    const coRevert = await typeBox(page, 'spouseRetireDate', '06/5656'); await page.waitForTimeout(80);
    check('(a) co-retire reverts to last-good age 60', coRevert === '60', coRevert);
    pl = await buildPayload(page);
    check('(e) co payload age INTEGER + date string + no legacy year', pl && Number.isInteger(pl.household.coArchitect.targetRetirementAge) && typeof pl.household.coArchitect.targetRetirementDate === 'string' && pl.household.coArchitect.targetRetirementYear === undefined, JSON.stringify(pl && pl.household.coArchitect));

    // (raf) the head guard still reverts a stray rAF write (now the resting value is an age).
    check('(raf) requestAnimationFrame is wrapped', await page.evaluate(() => /__dossier2BReady/.test(String(window.requestAnimationFrame))));
    await typeBox(page, 'retireAge', '06/' + (Y - 45 + 65)); await page.waitForTimeout(60);
    const before = (await read(page)).retire;
    const after = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => { document.getElementById('retireAge').value = '45'; });
      requestAnimationFrame(() => resolve(document.getElementById('retireAge').value));
    }));
    check('(raf) stray rAF write to a box is REVERTED', after === before && /^\d{1,3}$/.test(after || ''), 'before=' + before + ' after=' + after);
    await ctx.close();
  }

  // ───────── (port) PORT-COMPLETENESS — reject everything Studio rejects ─────────
  {
    const { ctx, page } = await openDossier(browser, null);
    await typeBox(page, 'dob', '06/1981'); await page.waitForTimeout(80);           // current age ~45
    const good = await typeBox(page, 'retireAge', '06/2046'); await page.waitForTimeout(80);  // retire 65
    check('(port) precondition retire rests age 65', good === '65', good);
    // auto-dash after 2 digits (live filter)
    check('(port) auto-dash: "083" -> "08/3"', await page.evaluate(() => window.DatumDateBounds.fmtDateStr('083')) === '08/3');
    // stop at 2 digits -> reject (no full date) -> revert to last good 65
    check('(port) stop-at-2-digits rejected (reverts to 65)', (await typeBox(page, 'retireAge', '08')) === '65');
    // month 13 rejected
    check('(port) month 13 rejected (reverts to 65)', (await typeBox(page, 'retireAge', '13/2046')) === '65');
    // 08/9889990 rejected (out of range / capped)
    check('(port) 08/9889990 rejected (reverts to 65)', (await typeBox(page, 'retireAge', '08/9889990')) === '65');
    // letters rejected (filtered out -> empty raw -> reverts to 65)
    check('(port) letters rejected (reverts to 65)', (await typeBox(page, 'retireAge', 'abcdef')) === '65');
    // RA < CurrentAge rejected (06/2020 -> age ~39 < 46 floor)
    check('(port) RA below current age rejected (reverts to 65)', (await typeBox(page, 'retireAge', '06/2020')) === '65');
    // PTA < RA+20 rejected: retire 65, type plan that implies age 70 (<85 floor)
    await typeBox(page, 'planThrough', '06/2066'); await page.waitForTimeout(60);   // plan 85 (valid)
    check('(port) PTA below RA+20 rejected (reverts to 85)', (await typeBox(page, 'planThrough', '06/2051')) === '85');
    await ctx.close();
  }

  // ───────── (iii) MONTH SURVIVAL — the loop-ender ─────────
  {
    const { ctx, page } = await openDossier(browser, null);
    await typeBox(page, 'dob', '08/1982'); await page.waitForTimeout(80);
    const rest = await typeBox(page, 'retireAge', '03/2035'); await page.waitForTimeout(80);
    check('(iii) non-DOB-month date rests on age 52', rest === '52', rest);
    check('(iii) focus shows the TYPED month 03/2035 (not 08/2034)', (await focusDate(page, 'retireAge')) === '03/2035', await focusDate(page, 'retireAge'));
    // save
    await page.evaluate(() => { const b = document.getElementById('saveProfile'); if (b) b.click(); });
    await page.waitForTimeout(250);
    const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('datumfi.accountDossier.v15')); } catch (e) { return null; } });
    check('(iii) SAVE persists age 52', saved && saved.defaults && saved.defaults.targetRetirementAge === 52, JSON.stringify(saved && saved.defaults));
    check('(iii) SAVE persists the date string 03/2035', saved && saved.defaults && (saved.defaults.targetRetirementDate === '03/2035' || (saved.primary && saved.primary.targetRetirementDate === '03/2035')), JSON.stringify(saved && saved.defaults));
    check('(iii) SAVE stores DOB MM/YYYY (no ISO)', saved && saved.primary && /^\d{2}\/\d{4}$/.test(saved.primary.dateOfBirth), JSON.stringify(saved && saved.primary));
    await ctx.close();
    // reopen
    const re = await openDossier(browser, saved);
    await re.page.waitForTimeout(250);
    const rr = await read(re.page);
    check('(iii) REOPEN DOB renders MM/YYYY (no ISO leak)', /^\d{2}\/\d{4}$/.test(rr.dob || ''), rr.dob);
    check('(iii) REOPEN retire rests on age 52', rr.retire === '52', rr.retire);
    check('(iii) REOPEN focus shows 03/2035 — MONTH SURVIVED', (await focusDate(re.page, 'retireAge')) === '03/2035', await focusDate(re.page, 'retireAge'));
    const rpl = await buildPayload(re.page);
    check('(iii) REOPEN payload age INTEGER 52 (no NaN/silent-93)', rpl && rpl.defaults.targetRetirementAge === 52, JSON.stringify(rpl && rpl.defaults));
    await re.ctx.close();
  }

  // ───────── (i) DOB-change: ages SURVIVE ─────────
  {
    const { ctx, page } = await openDossier(browser, null);
    await typeBox(page, 'dob', '06/1981'); await page.waitForTimeout(60);
    await typeBox(page, 'retireAge', '06/2046'); await page.waitForTimeout(60);     // age 65
    await typeBox(page, 'planThrough', '06/2071'); await page.waitForTimeout(60);   // age 90
    await typeBox(page, 'dob', '06/1986'); await page.waitForTimeout(100);          // change DOB
    const r = await read(page);
    check('(i) RA age survives DOB change (no collapse)', r.retire === '65', r.retire);
    check('(i) PTA age survives DOB change (no collapse)', r.plan === '90', r.plan);
    const pl = await buildPayload(page);
    check('(i) payload keeps the ages (65/90)', pl && pl.defaults.targetRetirementAge === 65 && pl.defaults.planThroughAge === 90, JSON.stringify(pl && pl.defaults));
    await ctx.close();
  }

  // ───────── (bc) 3 legacy co shapes -> canonical int; (legacy) no-date-string reopen ─────────
  {
    const coDob = '05/1984', expected = 2046 - 1984; // 62
    const base = (co) => ({ schema: 'DatumFIAccountDossierV15', savedAt: new Date().toISOString(),
      primary: { dateOfBirth: '06/1981', targetRetirementAge: 65 },
      defaults: { targetRetirementAge: 65, planThroughAge: 90 },
      household: { coArchitect: Object.assign({ dateOfBirth: coDob }, co) } });
    const fixtures = [
      ['legacy YEAR shape', base({ targetRetirementYear: 2046 })],
      ['legacy AGE-only (no date string)', base({ targetRetirementAge: 62 })],
      ['new DATE shape', base({ targetRetirementDate: '05/2046', targetRetirementAge: 62 })]
    ];
    for (const [label, fx] of fixtures) {
      const { ctx, page } = await openDossier(browser, fx);
      await page.waitForTimeout(300);
      const r = await read(page);
      const pl = await buildPayload(page);
      check('(bc) ' + label + ' -> rests on canonical age ' + expected, r.coRet === String(expected), r.coRet);
      check('(bc) ' + label + ' -> payload int age ' + expected, pl && pl.household && pl.household.coArchitect && pl.household.coArchitect.targetRetirementAge === expected, JSON.stringify(pl && pl.household && pl.household.coArchitect));
      // (legacy) a row with no date string must still present a clean DOB-derived date on focus.
      const fd = await focusDate(page, 'spouseRetireDate');
      check('(legacy) ' + label + ' -> focus presents a clean MM/YYYY', /^\d{2}\/\d{4}$/.test(fd || ''), fd);
      await ctx.close();
    }
  }

  // ───────── (par) Studio == Dossier: bounds AND rounding ─────────
  {
    const dossier = await openDossier(browser, null);
    const dProbe = await dossier.page.evaluate(() => { const B = window.DatumDateBounds; return { b: { AGE_MIN: B.AGE_MIN, AGE_MAX: B.AGE_MAX, RA_MIN_FLOOR: B.RA_MIN_FLOOR, RA_MAX: B.RA_MAX, PTA_MIN_FLOOR: B.PTA_MIN_FLOOR, PTA_MAX: B.PTA_MAX }, age: B.ageAtDate('03/2035', 8, 1982), date: B.dateFromAge(52, 8, 1982) }; });
    const sctx = await browser.newContext();
    await sctx.addInitScript('window.Clerk={load:function(){return Promise.resolve();},user:{unsafeMetadata:{}}};');
    await blockClerk(sctx);
    const spage = await sctx.newPage();
    await spage.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
    await spage.waitForTimeout(900);
    const sProbe = await spage.evaluate(() => { const B = window.DatumDateBounds || {}; return B.AGE_MIN === undefined ? null : { b: { AGE_MIN: B.AGE_MIN, AGE_MAX: B.AGE_MAX, RA_MIN_FLOOR: B.RA_MIN_FLOOR, RA_MAX: B.RA_MAX, PTA_MIN_FLOOR: B.PTA_MIN_FLOOR, PTA_MAX: B.PTA_MAX }, age: B.ageAtDate('03/2035', 8, 1982), date: typeof B.dateFromAge === 'function' ? B.dateFromAge(52, 8, 1982) : null }; });
    check('(par) Studio exposes DatumDateBounds', !!sProbe, JSON.stringify(sProbe));
    check('(par) Studio + Dossier bounds IDENTICAL', sProbe && JSON.stringify(sProbe.b) === JSON.stringify(dProbe.b), 'S=' + JSON.stringify(sProbe && sProbe.b) + ' D=' + JSON.stringify(dProbe.b));
    check('(par) Studio == Dossier ageAtDate (52 == 52)', sProbe && sProbe.age === dProbe.age && dProbe.age === 52, 'S=' + (sProbe && sProbe.age) + ' D=' + dProbe.age);
    check('(par) Studio == Dossier dateFromAge', sProbe && sProbe.date === dProbe.date && dProbe.date === '08/2034', 'S=' + (sProbe && sProbe.date) + ' D=' + dProbe.date);
    await sctx.close(); await dossier.ctx.close();
  }

  await browser.close(); server.close();
  results.forEach((r) => console.log('  ' + r));
  console.log(fails === 0 ? '\nP8.1 DOSSIER AGE-BOX PORT: GREEN' : '\nP8.1 DOSSIER AGE-BOX PORT: ' + fails + ' FAILURE(S)');
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  // TRAP-AND-REPORT-PARTIAL. A mid-run throw used to discard every check that had ALREADY run: the
  // exit code was honestly 1, but with no output a real failure was indistinguishable from a flaky
  // environment error. That is precisely how 11 real reds stayed invisible in _p8_studio_mechanics
  // — the gate looked like a timeout, not a coverage gap.
  //
  // So flush what we DO know, and then say plainly that the run did not finish. The INCOMPLETE line
  // is the load-bearing half: a flushed partial with no marker reads as a COMPLETE pass, which is a
  // worse trap than printing nothing at all.
  results.forEach((r) => console.log('  ' + r));
  console.log('\nINCOMPLETE — aborted after ' + results.length + ' checks (' + fails + ' failing so far). NOT a pass.');
  console.error('GATE FAIL', e);
  try { server.close(); } catch (_e) {}
  process.exit(1);
});
