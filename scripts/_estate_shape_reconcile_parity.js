'use strict';
// G5 LIVE GATE — Estate→Shape reconcile + the Sketch-carry contract.
// Asserts the FULL behavior round-trip, not "function ran":
//   ARM 1 (no-clobber): carried Sketch, NO rooms -> slider keeps the carried ESTIMATE.
//   ARM 2 (rooms authoritative): a draft with an investable room -> slider == rooms total.
//   ARM 3 (carry starts CLEAN): carried Sketch + a drafted room -> the draft is deliberately NOT
//                    restored; the Sketch estimate owns the slider.
//   ARM 3C (POSITIVE CONTROL): the SAME seeded draft with NO carry -> the room MUST hydrate.
//
// ⚠️ ARM 3 WAS INVERTED ON 2026-08-02 — READ THIS BEFORE "FIXING" IT BACK.
// It used to assert the opposite ("rooms SURVIVE a carry, not purged") and had been RED since
// 2026-07-16, when commit c0f4ac4 (#288 Bug C) deliberately flipped the behaviour: a FRESH or SKETCH
// open starts clean. The gate simply predated the ruling by a month and nobody updated it. The
// Architect re-ruled on 2026-08-02 that #288 STANDS, and the arm is inverted rather than deleted so
// the behaviour stays PINNED in the direction we want.
// WHY the product does this: a Sketch is a STARTING SETUP carried in, but once rooms are drafted the
// Estate supersedes it — $500k on a slider is a coarse claim, a 401(k) at $250k plus an IRA at $25k
// is a precise one, and THE NUANCED STATEMENT WINS OVER THE COARSE ONE. See studio.html restoreDraft().
//
// 🔑 ARM 3C EXISTS BECAUSE OF THE HOUSE LAW (2026-08-02): an ABSENCE assertion must be preceded by a
// PRESENCE assertion. "rooms === 0 after a carry" passes just as happily when the fixture never seeded
// a draft at all, or seeded one in a shape nothing can read. ARM 3C runs the identical draft WITHOUT
// the carry and demands the room appear, so ARM 3 is proving a CLEARANCE and not an absence.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'); const OUT = path.join(ROOT, '_eyeson');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
/* --noflip — RED-FIRST for the inverted ARM 3. Removes the #288 guard so a carry resumes the draft
   again (the pre-c0f4ac4 behaviour). ARM 3 must RED; ARM 3C must stay GREEN, which is what shows the
   two arms are independent and that the control is not just echoing ARM 3.

   ⚠️ #288 IS ENFORCED IN TWO PLACES AND THE MUTATION MUST REMOVE BOTH. My first cut patched only the
   studio.html parse-time guard and the red-first came back INERT — the rooms still cleared, because
   studio-blueprint.js's load-time `_seedOnly` is the authoritative one and was still standing. A
   mutation that removes half a contract proves the half it left alone. The studio.html comment says
   "guard it here too, not just load()" and that word TOO is the whole warning. */
const NOFLIP = process.argv.includes('--noflip');
const A_FLIP = "      try { var _q = new URLSearchParams(location.search); if (_q.get('fresh') === '1' || _q.get('hydrate') === 'sketch') return; } catch (_e) {}";
const M_FLIP = '      /* #288 parse-time guard removed by --noflip */';
const A_SEED = "    var _seedOnly = source === 'fresh' || source.indexOf('sketch-contract') === 0;";
const M_SEED = '    var _seedOnly = false;   /* #288 load-time guard removed by --noflip */';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/studio.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  if (NOFLIP && (/studio\.html$/.test(p) || /studio-blueprint\.js$/.test(p))) {
    let src = fs.readFileSync(fp, 'utf8');
    const isHtml = /studio\.html$/.test(p);
    const a = isHtml ? A_FLIP : A_SEED, m = isHtml ? M_FLIP : M_SEED;
    const n = src.split(a).length - 1;
    if (n !== 1) { console.error(`anchor ${isHtml ? 'A_FLIP' : 'A_SEED'}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
    const body = Buffer.from(src.replace(a, m), 'utf8');
    res.writeHead(200, { 'Content-Type': isHtml ? 'text/html' : 'text/javascript' }); res.end(body); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
const PORT = 8171;

// A carried Sketch blob: portfolio ESTIMATE 750k, datum 100k, founder ages, default market.
const SKETCH_BLOB = {
  sketch_id: 'g5', version: '1.0.0', age: 40, retire_age: 65,
  portfolio_mass: 750000, contributions: 25000,
  datum_spend: 100000, designed_ceil: 166000, designed_datum: 100000, designed_floor: 41000,
  resolved_state: 'EXPANSIVE',
  s1_datum: 100000, s1_ceil: 166000, s1_floor: 41000, s1_resolved_state: 'EXPANSIVE',
  market_outlook: 'average', tax_rate: 20, inflation_mode: 'real', plan_end_age: 93
};
const ROOM = { id: 'g5acct', baseId: 'pretax401k', value: 300000, inflow: 0, freq: 12, name: 'Pre-Tax 401(k)', holdings: [] };

const readSlider = (page) => page.evaluate(() => {
  const sp = document.getElementById('slider-portfolio');
  const svg = document.getElementById('shape-panel-svg');
  const rooms = document.querySelectorAll('#rooms-container .room-input-container').length;
  const sfi = window._scenarioFromInputs ? window._scenarioFromInputs() : null;
  return { exactVal: sp && sp.dataset ? sp.dataset.exactVal : null,
           sliderValue: sp ? +sp.value : null,
           valLabel: (document.getElementById('val-portfolio') || {}).textContent || null,
           portfolioVol: sfi ? +sfi.portfolioVol.toFixed(4) : null,
           datumK: sfi ? sfi.targetSpend : null, rooms: rooms,
           shapeState: (function(){const m=/shape-state-(\w+)/.exec(svg?svg.getAttribute('class'):'');return m?m[1].toUpperCase():null;})() };
});
// Expected native thumb position for a given dollar portfolio (matches DatumShape.scales).
const expectThumb = (page, dollars) => page.evaluate((d) => {
  const SC = window.DatumShape && DatumShape.scales; return SC ? SC.portValToPos(d / 1e6) : null;
}, dollars);

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const out = { findings: [], pageErrors: [] };

  // ── ARM 1: carried sketch, no rooms ──
  let ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  let page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((b) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(b));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1: b }));
  }, SKETCH_BLOB);
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm1 = await readSlider(page);
  await ctx.close();

  // ── ARM 2: REAL add-room + value-entry events (Captain's repro), NO carry ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  // Crypto $120k + Pre-Tax 401k $250k = $300k investable, via the real addInstance + the room
  // value input's oninput=updateValueWithoutRender (NO manual updateSVGs).
  await page.evaluate(() => {
    function addAndValue(baseId, amount) {
      window.addInstance(baseId);
      var acc = window.state.accounts[window.state.accounts.length - 1];
      var inp = document.getElementById('room-val-inp-' + acc.id);
      if (inp) { inp.value = '$' + amount.toLocaleString('en-US'); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    addAndValue('crypto_co', 120000);
    addAndValue('pretax401k', 180000);
  });
  await page.waitForTimeout(1500);
  out.arm2 = await readSlider(page);
  out.arm2thumb = await expectThumb(page, 300000);
  await ctx.close();

  // ── ARM 3: carried sketch + drafted rooms (tie-fix) ──
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((args) => {
    localStorage.setItem('datum_sketch_state_1', JSON.stringify(args.blob));
    localStorage.setItem('datumfi_sketchbook_v1', JSON.stringify({ slot_1: args.blob }));
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ accounts: [args.room], profile: {}, datum: { net_datum_v1: 100000 }, climate: { outlook: 'history_repeats' } }));
    sessionStorage.setItem('datum_currentAge', '40');
    sessionStorage.setItem('datum_retireAge', '65');
    sessionStorage.setItem('datum_targetSpend', '100');
  }, { blob: SKETCH_BLOB, room: ROOM });
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html?id=1&hydrate=sketch', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm3 = await readSlider(page);
  out.arm3thumb = await expectThumb(page, 750000);   // the CARRIED estimate owns the slider now
  await page.screenshot({ path: path.join(OUT, 'g5_reconcile_arm3.png') });
  await ctx.close();

  // ── ARM 3C: POSITIVE CONTROL — the IDENTICAL seeded draft, NO carry. The room MUST hydrate. ──
  // Without this, ARM 3's "rooms === 0" is indistinguishable from a fixture that seeded nothing.
  ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await ctx.newPage();
  page.on('pageerror', (e) => out.pageErrors.push(e.message));
  await page.addInitScript((room) => {
    sessionStorage.setItem('datumfi_blueprint_draft_v1', JSON.stringify({ accounts: [room], profile: {}, datum: { net_datum_v1: 100000 }, climate: { outlook: 'history_repeats' } }));
  }, ROOM);
  await page.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  out.arm3c = await readSlider(page);
  out.arm3cthumb = await expectThumb(page, 300000);
  await ctx.close();

  const f = out.findings;
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= (tol || 0);
  // ARM 1: estimate held (~750k), no rooms — label also shows the estimate.
  if (!near(+out.arm1.exactVal, 750000, 5000)) f.push('ARM1: estimate clobbered — slider ' + out.arm1.exactVal + ' expected ~750000');
  if (out.arm1.rooms !== 0) f.push('ARM1: unexpected rooms ' + out.arm1.rooms);
  // ARM 2 (REAL add-room events): rooms authoritative across exactVal + scenario + LABEL + THUMB.
  if (!near(+out.arm2.exactVal, 300000, 2000)) f.push('ARM2: exactVal not rooms-total — ' + out.arm2.exactVal);
  if (out.arm2.rooms < 1) f.push('ARM2: rooms not rendered (' + out.arm2.rooms + ')');
  if (out.arm2.valLabel !== '$300k') f.push('ARM2: VISIBLE LABEL stale — #val-portfolio="' + out.arm2.valLabel + '" expected $300k (Bug A)');
  if (!near(out.arm2.sliderValue, out.arm2thumb, 50)) f.push('ARM2: THUMB stale — value ' + out.arm2.sliderValue + ' expected ~' + Math.round(out.arm2thumb));
  // ARM 3C POSITIVE CONTROL FIRST — read this before ARM 3. If the draft cannot hydrate even WITHOUT
  // a carry, the fixture is broken and ARM 3's "cleared" claim below proves nothing at all.
  if (out.arm3c.rooms !== 1) f.push('ARM3C CONTROL BROKEN: the seeded draft does not hydrate WITHOUT a carry (rooms=' + out.arm3c.rooms + ') — ARM 3 below is VOID');
  if (!near(+out.arm3c.exactVal, 300000, 2000)) f.push('ARM3C CONTROL BROKEN: draft room did not win exactVal without a carry — ' + out.arm3c.exactVal + ' — ARM 3 below is VOID');
  // ARM 3 (REAL carry path, #288): the carry starts CLEAN — the draft is deliberately NOT restored and
  // the carried Sketch estimate owns the slider. Inverted 2026-08-02; see the header before changing.
  if (out.arm3.rooms !== 0) f.push('ARM3: a carry did NOT start clean — draft rooms leaked through (rooms=' + out.arm3.rooms + ')');
  if (!near(+out.arm3.exactVal, 750000, 5000)) f.push('ARM3: carried Sketch estimate did not own exactVal — ' + out.arm3.exactVal + ' expected ~750000');
  if (out.arm3.valLabel !== '$750k') f.push('ARM3: VISIBLE LABEL not the carried estimate — #val-portfolio="' + out.arm3.valLabel + '" expected $750k');
  if (!near(out.arm3.sliderValue, out.arm3thumb, 50)) f.push('ARM3: THUMB does not match the carried estimate — value ' + out.arm3.sliderValue + ' expected ~' + Math.round(out.arm3thumb));

  out.verdict = (f.length === 0 && out.pageErrors.length === 0) ? 'PASS' : 'FAIL';
  out.file = NOFLIP ? 'MUTATED[noflip]' : 'CLEAN';   // a poisoned run must NAME its mutation
  console.log(JSON.stringify(out, null, 2));
  await browser.close(); server.close();
  if (NOFLIP) {
    /* The mutation must bite ARM 3 SPECIFICALLY, and must leave the ARM 3C control alone. A --noflip
       run that reds the control instead has broken the fixture, not proven the arm. */
    const arm3Red = f.some((x) => x.indexOf('ARM3:') === 0);
    const ctrlRed = f.some((x) => x.indexOf('ARM3C') === 0);
    console.log(arm3Red ? 'RED-FIRST OK — removing the #288 guard BIT ARM 3.'
                        : '❌ RED-FIRST FAILED — the guard was removed and ARM 3 still passed.');
    console.log(ctrlRed ? '❌ CONTROL CONTAMINATED — ARM 3C red under --noflip; it should be unaffected.'
                        : 'CONTROL CLEAN — ARM 3C stayed green, so the two arms are independent.');
    process.exit(arm3Red && !ctrlRed ? 0 : 1);
  }
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch((e) => { console.error('G5 GATE FAIL', e); server.close(); process.exit(2); });
