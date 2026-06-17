'use strict';
// G3 LIVE GATE — Studio-originated slot save -> real Blueprint cards -> Open round-trip.
// (1) In Studio: set profile dates + a non-default climate + spend + investable rooms (plus a
//     physical room that must NOT count toward Net Estate), then use the persistent header
//     "Save to Blueprint" control to file slot 2 (captureDOM + DatumBlueprint.save).
// (2) Blueprint.html renders slot 2 as a REAL card via bpToCard (investable Net Estate, rooms,
//     climate label, Drafted status) — no mock.
// (3) Open-in-Studio (?id=2&hydrate=blueprint): rooms intact AND the HARD acceptance —
//     pri-dob / target-ret / climate selection SURVIVE the reload (the pre-G3 clobber).
// (4) Erase removes the slot (archive + the hub per-slot key).
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8176;
const base = 'http://127.0.0.1:' + PORT;
const out = { findings: [], pageErrors: [] };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  // Blueprint.html hard-redirects an unauthenticated visitor to the hosted Clerk sign-in.
  // Aborting non-localhost requests stops the real Clerk SDK from loading so the stub below
  // keeps the page local. Studio tolerates anonymous Clerk, so this abort is toggled ON only
  // around Blueprint.html visits (it would otherwise suppress Studio's nav reveal).
  const abortExternal = (route) => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  };
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  // Skip the cinematic entry overlay (intercepts nav clicks) and satisfy Blueprint.html's
  // Clerk auth gate (which otherwise redirects an unauthenticated visitor to /vault.html).
  // Both run per-load, so re-establish them before every navigation via addInitScript.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('datumfi_skip_entry_overlay', '1'); } catch (e) {}
    // P3: Save is now a GATED action — signed-out users redirect to vault.html. This
    // harness already mocks a signed-in Clerk user, so set the matching UI hint that
    // window.studioSaveCurrent checks, otherwise the save click would bounce to vault.
    try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {}
    window.Clerk = {
      load: function () { return Promise.resolve(); },
      user: { unsafeMetadata: {}, update: function () { return Promise.resolve(); }, firstName: 'Tester', primaryEmailAddress: { emailAddress: 't@t.co' } }
    };
  });

  // ── (1) Studio: enter a plan + investable rooms + 1 physical room, then save to slot 2.
  await page.goto(base + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    // Drive the SLIDERS like a real user (they are the source of truth for the Shape) —
    // their input handlers sync the pri-dob / target-ret / plan-end-age text fields.
    function setSlider(id, v) { var el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); } }
    setSlider('slider-age', 52);
    setSlider('slider-activation', 68);
    setSlider('sl-plan-through', 88);
    var s = document.getElementById('spend-input'); if (s) s.value = '$88,000';
    document.querySelectorAll('.climate-option').forEach(function (el) { el.classList.toggle('active', el.dataset.outlook === 'Optimistic'); });
    // 05/ Market Conditions paradigm (the card's "Climate") + inflation — non-defaults.
    function checkRadio(name, value) { var r = document.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }
    checkRadio('market', 'stress');
    checkRadio('inflation', 'nominal');
    if (window.state) {
      window.state.accounts = [
        { id: 'g3a', baseId: 'pretax401k', value: 425000, inflow: 0, freq: 12, name: 'Pre-Tax 401(k)', holdings: [] },
        { id: 'g3b', baseId: 'rothira',    value:  75000, inflow: 0, freq: 12, name: 'Roth IRA',       holdings: [] },
        { id: 'g3c', baseId: 'property',   value: 300000, inflow: 0, freq: 12, name: 'Real Estate',    holdings: [] }
      ];
    }
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof updateSVGs === 'function') updateSVGs();
  });
  await page.waitForTimeout(300);
  // open the save popover and click slot A-02. Signed-in (P3), the account-topbar
  // hides the page-header button and exposes its own Save Current Blueprint button —
  // both call window.studioSaveCurrent, so invoke the gated hook directly. The hint is
  // set at action time because studio.html's load-time Clerk check (no real user on
  // this host) clears it — a real signed-in user keeps it.
  await page.evaluate(() => { try { sessionStorage.setItem('datum_auth_hint', '1'); } catch (e) {} });
  await page.evaluate(() => window.studioSaveCurrent());
  await page.waitForTimeout(150);
  out.popoverPresent = await page.evaluate(() => !!document.getElementById('studio-save-bp-pop'));
  // Click slot A-02 in-page (empty -> immediate save). Direct .click() avoids popover
  // positioning quirks when invoked headlessly without a visible anchor button.
  await page.evaluate(() => {
    var pop = document.getElementById('studio-save-bp-pop');
    if (!pop) return;
    var b = Array.prototype.slice.call(pop.querySelectorAll('button')).find(function (x) { return /A-02/.test(x.textContent); });
    if (b) b.click();
  });
  await page.waitForTimeout(400);

  out.afterSave = await page.evaluate(() => {
    var slot = null, arch = null;
    try { slot = JSON.parse(localStorage.getItem('datum_blueprint_state_2')); } catch (e) {}
    try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1')); } catch (e) {}
    return {
      perSlot: !!slot,
      schema: slot && slot.schema,
      accounts: slot && slot.accounts ? slot.accounts.length : null,
      dob: slot && slot.profile ? slot.profile.primary_dob : null,
      ret: slot && slot.profile ? slot.profile.target_retirement_date : null,
      datum: slot && slot.datum ? slot.datum.net_datum_v1 : null,
      climate: slot && slot.climate ? slot.climate.outlook : null,
      market: slot ? slot.market_paradigm : null,
      inflation: slot ? slot.inflation_mode : null,
      investable: (window.DatumBlueprint && slot) ? DatumBlueprint.investableTotal(slot) : null,
      archSlot2: !!(arch && arch.slot2)
    };
  });
  await page.screenshot({ path: path.join(OUT, 'g3_1_studio_saved.png') });

  // ── (2) Blueprint.html: slot 2 renders a REAL card. Abort external reqs for this visit.
  await ctx.route('**/*', abortExternal);
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  out.card = await page.evaluate(() => {
    var c = document.getElementById('blueprint-content-2');
    if (!c) return { present: false };
    var txt = c.textContent.replace(/\s+/g, ' ').trim();
    var name = (c.querySelector('.blueprint-name') || {}).textContent || '';
    var status = (c.querySelector('.status-pill') || {}).textContent || '';
    var metrics = Array.prototype.map.call(c.querySelectorAll('.metric-row'), function (m) { return m.textContent.replace(/\s+/g, ' ').trim(); });
    var isEmpty = !!c.querySelector('.empty-state');
    return { present: true, isEmpty: isEmpty, name: name, status: status, metrics: metrics, txt: txt };
  });
  await page.screenshot({ path: path.join(OUT, 'g3_2_blueprint_cards.png') });

  // ── (3) Open in Studio -> the HARD acceptance: dob/retire/climate + rooms survive.
  await ctx.unroute('**/*', abortExternal); // Studio needs its normal (anonymous Clerk) load
  await page.goto(base + '/studio.html?id=2&hydrate=blueprint', { waitUntil: 'load' });
  await page.waitForTimeout(3500); // through the 900ms re-assert
  out.reopen = await page.evaluate(() => {
    var sp = document.getElementById('slider-portfolio');
    var val = function (id) { return (document.getElementById(id) || {}).value || ''; };
    return {
      priDob: val('pri-dob'),
      targetRet: val('target-ret'),
      climate: ((document.querySelector('.climate-option.active') || {}).dataset || {}).outlook || '',
      rooms: document.querySelectorAll('#rooms-container .room-input-container').length,
      sliderExact: sp && sp.dataset ? sp.dataset.exactVal : null,
      // the RENDERED slider scalars that actually drive the Shape
      sliderAge: val('slider-age'),
      sliderAct: val('slider-activation'),
      sliderPlan: val('sl-plan-through'),
      planEndText: val('plan-end-age'),
      market: ((document.querySelector('input[name="market"]:checked')) || {}).value || '',
      inflation: ((document.querySelector('input[name="inflation"]:checked')) || {}).value || ''
    };
  });
  await page.screenshot({ path: path.join(OUT, 'g3_3_reopen.png') });

  // ── (3b) THE REAL LIVE PATH: a lingering Sketch carry in sessionStorage (Sketch->Studio
  // earlier in the tab) must NOT override an explicit blueprint open. Seed the stale keys,
  // reopen, assert the slot still wins AND the keys were cleared (Mechanism A).
  await page.evaluate(() => {
    sessionStorage.setItem('datum_currentAge', '40');
    sessionStorage.setItem('datum_retireAge', '64');
    sessionStorage.setItem('datum_targetSpend', '120000');
  });
  await page.goto(base + '/studio.html?id=2&hydrate=blueprint', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  out.reopenWithSketch = await page.evaluate(() => {
    var val = function (id) { return (document.getElementById(id) || {}).value || ''; };
    return {
      sliderAge: val('slider-age'), sliderAct: val('slider-activation'), sliderPlan: val('sl-plan-through'),
      market: ((document.querySelector('input[name="market"]:checked')) || {}).value || '',
      stillHasSketchKeys: !!(sessionStorage.getItem('datum_currentAge') || sessionStorage.getItem('datum_targetSpend'))
    };
  });
  await page.screenshot({ path: path.join(OUT, 'g3_3b_reopen_sketchkeys.png') });

  // ── (4) Erase removes the slot (archive + per-slot key).
  await ctx.route('**/*', abortExternal);
  await page.goto(base + '/Blueprint.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('.erase-action[data-purge-target="2"]');
  await page.waitForTimeout(200);
  await page.click('#action-confirm-erase');
  await page.waitForTimeout(1100); // 730ms erase animation
  out.afterErase = await page.evaluate(() => {
    var slot = null, arch = null;
    try { slot = localStorage.getItem('datum_blueprint_state_2'); } catch (e) {}
    try { arch = JSON.parse(localStorage.getItem('datumfi_blueprint_archive_v1')); } catch (e) {}
    var c = document.getElementById('blueprint-content-2');
    return { perSlotGone: !slot, archSlot2Gone: !(arch && arch.slot2), cardEmpty: !!(c && c.querySelector('.empty-state')) };
  });
  await ctx.close();

  const f = out.findings, a = out.afterSave, cd = out.card, ro = out.reopen, ae = out.afterErase;
  // (1) save
  if (!a.perSlot) f.push('per-slot datum_blueprint_state_2 not written by header save');
  if (a.schema !== 'DatumFIBlueprintV1') f.push('saved slot is not a hub bp (schema=' + a.schema + ')');
  if (a.accounts !== 3) f.push('saved slot did not capture all rooms (accounts=' + a.accounts + ')');
  if (a.dob !== '06 / 1974') f.push('saved dob wrong (' + a.dob + ')');
  if (a.climate !== 'optimistic') f.push('saved climate wrong (' + a.climate + ')');
  if (a.investable !== 500000) f.push('investable total wrong (' + a.investable + ' expected 500000 — physical room must be excluded)');
  if (a.market !== 'stress') f.push('saved market_paradigm wrong (' + a.market + ' expected stress)');
  if (a.inflation !== 'nominal') f.push('saved inflation_mode wrong (' + a.inflation + ' expected nominal)');
  if (!a.archSlot2) f.push('archive slot2 not written');
  // (2) card
  if (!cd.present || cd.isEmpty) f.push('Blueprint slot-2 card did not render real data');
  if (/Core Retirement|Rule of 55|Lower Spend|Delayed SS/.test(cd.name)) f.push('card still shows a MOCK name (' + cd.name + ')');
  if (cd.status && cd.status.trim() !== 'Drafted') f.push('card status not Drafted (' + cd.status + ')');
  if (!/\$500k/.test((cd.metrics || []).join(' '))) f.push('card Net Estate not the investable $500k (' + JSON.stringify(cd.metrics) + ')');
  if (!/Rooms\s*3\b/.test((cd.metrics || []).join(' '))) f.push('card Rooms not 3 (' + JSON.stringify(cd.metrics) + ')');
  if (!/Climate\s*Stress\b/.test((cd.metrics || []).join(' '))) f.push('card Climate not the Stress paradigm (' + JSON.stringify(cd.metrics) + ')');
  // (3) HARD acceptance — the RENDERED slider scalars that drive the Shape must survive Open.
  if (ro.sliderAge !== '52') f.push('HARD: slider-age did NOT survive Open (' + ro.sliderAge + ' expected 52)');
  if (ro.sliderAct !== '68') f.push('HARD: slider-activation did NOT survive Open (' + ro.sliderAct + ' expected 68)');
  if (ro.sliderPlan !== '88') f.push('HARD: sl-plan-through did NOT survive Open (' + ro.sliderPlan + ' expected 88 — reverts to default)');
  if (ro.planEndText !== '88') f.push('HARD: plan-end-age text did NOT survive Open (' + ro.planEndText + ' expected 88)');
  if (ro.priDob !== '06 / 1974') f.push('HARD: pri-dob did NOT survive Open (' + ro.priDob + ')');
  if (ro.targetRet !== '06 / 2042') f.push('HARD: target-ret did NOT survive Open (' + ro.targetRet + ')');
  if (ro.climate !== 'Optimistic') f.push('HARD: HVAC climate selection did NOT survive Open (' + ro.climate + ')');
  if (ro.market !== 'stress') f.push('HARD: market paradigm did NOT survive Open (' + ro.market + ' expected stress)');
  if (ro.inflation !== 'nominal') f.push('HARD: inflation mode did NOT survive Open (' + ro.inflation + ' expected nominal)');
  if (ro.rooms !== 3) f.push('rooms not restored on Open (rooms=' + ro.rooms + ')');
  // (3b) blueprint open wins over a lingering Sketch carry (Mechanism A)
  const rs = out.reopenWithSketch || {};
  if (rs.sliderAge !== '52') f.push('HARD(sketch-keys): slider-age overridden by Sketch carry (' + rs.sliderAge + ' expected 52)');
  if (rs.sliderAct !== '68') f.push('HARD(sketch-keys): slider-activation overridden by Sketch carry (' + rs.sliderAct + ' expected 68)');
  if (rs.sliderPlan !== '88') f.push('HARD(sketch-keys): sl-plan-through overridden by Sketch carry (' + rs.sliderPlan + ' expected 88)');
  if (rs.market !== 'stress') f.push('HARD(sketch-keys): market paradigm overridden by Sketch carry (' + rs.market + ' expected stress)');
  if (rs.stillHasSketchKeys) f.push('blueprint open did not clear the stale Sketch keys');
  // (4) erase
  if (!ae.perSlotGone) f.push('erase left the hub per-slot key (ghost slot)');
  if (!ae.archSlot2Gone) f.push('erase left the archive slot');
  if (!ae.cardEmpty) f.push('erased card did not return to empty state');

  out.verdict = (f.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('G3 GATE FAIL', e); try { console.error('PARTIAL', JSON.stringify(out, null, 2)); } catch (_) {} server.close(); process.exit(2); });
