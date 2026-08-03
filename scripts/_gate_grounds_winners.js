/* L52 WHOLE-ROOM WINNER GATE — The Grounds (Real Estate: property / property_primary / property_co).
   Property Copy Bank, Grounds column only (Driveway/Arcade later). Asserts every §1/§2/§3a/§3b/§4/§9/§15
   winner literal in the SERVED bytes via the real openAccountModal path, plus the §6/§6b valuation
   GUARDRAIL (hard-cap 50/mo, BYO-key only paid path, de-dupe cache) — key OFF/stubbed.
   RED-FIRST: `--redfirst` flips winners to pre-wire losers -> ABSENT -> gate BITES (RED). Normal -> GREEN.

   2026-08-02 RE-ANCHOR (§0.2 block only). This gate hunted for a native <select> containing
   "Select a liability to link". That string has not existed since the §18.3 Moat consolidation
   replaced the dropdown with a <details> disclosure of link rows — `_gate_moat_18_3.mjs` ASSERTS the
   old chrome is gone. Two assertions read RED for it, and a third — the [BITE] exclusion claim — read
   GREEN, because a list of ["__NO_SELECT__"] contains neither "Auto Loan" nor "Personal Loan". The
   control was missing and the gate called the safety property proven. That was the 9th false green.

   🔑 HOUSE LAW (2026-08-02) — AN EXCLUSION ASSERTION MUST BE PRECEDED BY A PRESENCE ASSERTION.
   You may not prove a thing is absent from a control without first proving the control EXISTS, and
   that it offers at least one row to be absent FROM. A vanished control must RED, never green.
   The presence checks are deliberately NOT wrapped in pick() — a precondition that inverts under
   --redfirst would let an inverted run pass by doing nothing, which is how a red-first goes
   inverted-dead. Preconditions hold in BOTH modes or the run is void.

   SELF-HOSTING (was: "serve repo root on :8001 first"). A gate that cannot run itself reads as a red
   it did not earn, and it is also the only way to serve the mutations below.
   Usage: node scripts/_gate_grounds_winners.js [LABEL] [--redfirst] [--noheloc] [--nocontrol]
     --noheloc    drops heloc from _assetReverseScope -> a HELOC stops being offered on a property.
     --nocontrol  removes the link disclosure entirely -> the PRESENCE assertion must RED. This is
                  the mutation that reproduces the exact false green above. */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
const NOHELOC  = process.argv.includes('--noheloc');
const NOCTRL   = process.argv.includes('--nocontrol');
const MUT = NOHELOC || NOCTRL;
const ROOT = path.resolve(__dirname, '..');
const PORT = 8305;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';

/* --noheloc — half the rule under test. The fixture below now adds a REAL heloc_joint; before this
   re-anchor it never did, so "Mortgage/HELOC ONLY" only ever proved the Mortgage half. */
const A_HELOC = "            return function(dB) { return String(dB.id).indexOf('mortgage') === 0 || String(dB.id).indexOf('heloc') === 0; };";
const M_HELOC = "            return function(dB) { return String(dB.id).indexOf('mortgage') === 0; };";
/* --nocontrol — delete the disclosure that holds the link rows. Everything downstream still renders;
   only the control vanishes. Under the OLD assertions this run was 1 red + 1 FALSE GREEN. */
const A_CTRL = '        if (canManage) {';
const M_CTRL = '        if (false) {   /* link control removed by --nocontrol */';

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOHELOC) apply(A_HELOC, M_HELOC, 'A_HELOC');
    if (NOCTRL)  apply(A_CTRL,  M_CTRL,  'A_CTRL');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(async () => {
    const cap = () => {
      var ttl = document.getElementById('modal-acc-title');
      return (ttl ? ttl.innerHTML : '') + document.getElementById('modal-dynamic-content').innerHTML;
    };
    const grab = (baseId, ov) => {
      try { addInstance(baseId); } catch (e) { return '__THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      if (ov) Object.keys(ov).forEach(k => { a[k] = ov[k]; });
      try { window.openAccountModal(a.id); } catch (e) { return '__OPEN_THREW__:' + e.message; }
      return cap();
    };
    const out = {};
    // gBlank — a property with no value, no carrying costs, no linked debt.
    out.gBlank = grab('property');
    // gFill — property valued 500k, full carrying costs, with a linked mortgage (balance 300k).
    addInstance('property');
    const gAcc = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(gAcc, { value: 500000, propTaxYr: '6000', homeInsYr: '2000', maintYr: '4000', hoaYr: '1200', utilYr: '3600' });
    addInstance('mortgage_joint');
    const mAcc = window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop();
    mAcc.value = 300000; mAcc.linkedAssetId = gAcc.id;
    window.openAccountModal(mAcc.id);          // §6b.10 tie-in — the Moat's Net Equity reads the Grounds value
    out.mLinked = cap();
    window.openAccountModal(gAcc.id);
    out.gFill = cap();
    // gAuto — a Driveway (auto) room to prove Grounds-only gating (Driveway wired in a later wave).
    out.gAuto = grab('auto');
    // §9b — g9bAll fires ALL four rules: value 200k, linked debt 180k (LTV 90%), carry 10k (cost-to-value 5%),
    // manual utilities. gNone fires none (value only — no carry/debt/util) → §9b prints nothing.
    addInstance('property');
    const g9 = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(g9, { value: 200000, propTaxYr: '6000', utilYr: '4000' });
    addInstance('mortgage_joint');
    const m9 = window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop();
    m9.value = 180000; m9.linkedAssetId = g9.id;
    window.openAccountModal(g9.id); out.g9bAll = cap();
    addInstance('property');
    const gn = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gn.value = 300000;
    window.openAccountModal(gn.id); out.gNone = cap();
    // SERVED-BYTES reproduction of the Captain's #242 smoke: a restored-blueprint home whose value is a
    // FORMATTED STRING ("$400,000") — the exact state that silenced §9 + §9b live (parseFloat -> NaN -> 0).
    // Carry $10,010, manual utilities $5,555, no debt -> 9b.3 (eq $400k ≈ 40yr) + 9b.4 must render.
    addInstance('property');
    const gs = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gs.value = '$400,000'; gs.propTaxYr = '4455'; gs.utilYr = '5555';
    window.openAccountModal(gs.id); out.gStr = cap();
    // §9c VALUE-MISSING NUDGE — carrying costs entered but NO value (val<=0 && carry>0): nudge fires, §9/§9b silent.
    addInstance('property');
    const gnud = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gnud.propTaxYr = '6000'; gnud.utilYr = '3000';   // value left unset (0)
    window.openAccountModal(gnud.id); out.gNudge = cap();
    // #245 §0.2 — FIXTURE STATE: a $400k property whose room is open, with FOUR unlinked debts sitting
    // in the plan — a mortgage, a HELOC, an auto loan and a personal loan. The property's link control
    // must offer the first two and refuse the last two.
    addInstance('property');
    const grev = window.state.accounts.filter(x => x.baseId === 'property').pop();
    grev.value = 400000;
    addInstance('mortgage_joint');      window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop().value = 200000;
    // heloc_joint is NEW to this fixture (2026-08-02). "Mortgage/HELOC ONLY" had never once been run
    // with a HELOC present, so the HELOC half of the rule was asserted and never exercised.
    addInstance('heloc_joint');         window.state.accounts.filter(x => x.baseId === 'heloc_joint').pop().value = 30000;
    addInstance('auto_debt_joint');     window.state.accounts.filter(x => x.baseId === 'auto_debt_joint').pop().value = 15000;
    addInstance('personal_loan_joint'); window.state.accounts.filter(x => x.baseId === 'personal_loan_joint').pop().value = 5000;
    window.openAccountModal(grev.id);
    // Reads the LIVE control (§18.3 <details> disclosure), not the retired native <select>. Returns a
    // SHAPE, never a bare list, so "the control was missing" is a distinguishable state instead of an
    // empty array that every exclusion assertion would sail straight through.
    out.gRev = (function () {
      var root = document.getElementById('modal-dynamic-content');
      if (!root) return { control: false, why: 'NO_MODAL_CONTENT', opts: [] };
      var det = Array.from(root.querySelectorAll('details')).find(function (d) {
        var s = d.querySelector('summary');
        return s && /Link or draft a liability/.test(s.textContent);
      });
      if (!det) return { control: false, why: 'NO_LIABILITY_DISCLOSURE', opts: [] };
      var rows = Array.from(det.querySelectorAll('div[onclick^="linkDebtToAsset"]'));
      return {
        control: true,
        why: '',
        emptyState: /Nothing available to link/.test(det.innerHTML),
        draftRow: /Draft New Liability/.test(det.innerHTML),
        opts: rows.map(function (r) { return r.textContent.replace(/link\s*$/, '').trim(); })
      };
    })();
    // OPEN-1 (#244) — the slim Clerk mirror must PRESERVE the 5 carrying-cost fields across a round-trip.
    out.slimCarry = (function () {
      try {
        addInstance('property');
        var gc = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gc, { value: 500000, propTaxYr: '6000', homeInsYr: '2000', maintYr: '4000', hoaYr: '1200', utilYr: '3600' });
        var slim = window.DatumBlueprint.slimSlotForClerk({ accounts: window.state.accounts });
        var hyd = window.DatumBlueprint.hydrateAccountNames(slim.accounts.slice(), function (bid) { var b = getBaseType(bid); return b ? b.title : ''; });
        var a = hyd.filter(x => x.id === gc.id).pop();
        return { propTaxYr: a.propTaxYr, homeInsYr: a.homeInsYr, maintYr: a.maintYr, hoaYr: a.hoaYr, utilYr: a.utilYr };
      } catch (e) { return { err: e.message }; }
    })();
    // #258/#259 PART 1 — the 11 property-detail fields must ALSO survive the slim Clerk mirror round-trip.
    out.slimDetails = (function () {
      try {
        addInstance('property');
        var gd = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gd, { propName: 'Lake cabin', propPurpose: 'Rental property', propType: 'Condo', propStreet: '123 Main St', propCity: 'Austin', propState: 'TX', propZip: '78701', propBeds: '3 Beds', propBaths: '2 Baths', propSqft: '1850', propYear: '1998' });
        var slim = window.DatumBlueprint.slimSlotForClerk({ accounts: window.state.accounts });
        var hyd = window.DatumBlueprint.hydrateAccountNames(slim.accounts.slice(), function (bid) { var b = getBaseType(bid); return b ? b.title : ''; });
        var a = hyd.filter(x => x.id === gd.id).pop();
        return { propName: a.propName, propPurpose: a.propPurpose, propType: a.propType, propStreet: a.propStreet, propCity: a.propCity, propState: a.propState, propZip: a.propZip, propBeds: a.propBeds, propBaths: a.propBaths, propSqft: a.propSqft, propYear: a.propYear };
      } catch (e) { return { err: e.message }; }
    })();
    // #249/#258/#259 — valuation UI: §5 toggle ON reveals the (structured) address + Get-estimate; a MOCKED
    // verify+Worker response renders range/tag/Use-button + comps; not-found blocks the paid call (R149).
    addInstance('property');
    const gap = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(gap, { value: 400000, useValueApi: true, propStreet: '1600 Pennsylvania Ave NW', propCity: 'Washington', propState: 'DC', propZip: '20500' });
    window.openAccountModal(gap.id);
    out.gApiUI = cap();
    window._AssetIntel.verifyAddress = async function () { return { status: 'verified', canonical: '1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500' }; };
    window._AssetIntel.fetchEstimate = async function () { return { status: 'ok', value: 291000, low: 215000, high: 367000, source: 'RentCast', updated: '2026-07-13T02:50:23Z', comps: [ { address: '1700 Penn Ave, Washington, DC', price: 305000, beds: 3, baths: 2, sqft: 1800, distance: 0.3, saleDate: '2026-05-01' } ] }; };
    await window.groundsVerifyAndEstimate(gap.id);
    var _res = document.getElementById('modal-avm-result-' + gap.id);
    out.gApiResult = _res ? _res.innerHTML : '';
    out.gApiCanonical = gap.propAddress;   // verify wrote the canonical string into the hidden RentCast field
    window.groundsUseEstimate(gap.id, 291000);   // value already 400000 -> overwrite-warn confirm
    out.gApiConfirm = {
      msg: (document.getElementById('bc-msg') || {}).textContent || '',
      title: (document.getElementById('bc-title') || {}).textContent || '',
      ok: (document.getElementById('bc-ok') || {}).textContent || '',
      cancel: (document.getElementById('bc-cancel') || {}).textContent || ''
    };
    // #260 — ACCEPT the estimate (click "Use $291,000"): the value fills AND the modal re-renders; the
    // Estimated Market Range + Comparable sales must PERSIST (not be torn down) so the comps stay a
    // sanity-check tool (R147 promise). Re-open proves it survives the re-render.
    var _bok = document.getElementById('bc-ok'); if (_bok) _bok.click();
    out.gApiPersist = (function () {
      var a = window.state.accounts.find(function (x) { return x.id === gap.id; });
      var rEl = document.getElementById('modal-avm-result-' + gap.id);
      var htmlNow = rEl ? rEl.innerHTML : '';
      // also prove it survives a full close+reopen (not just the accept re-render)
      window.openAccountModal(gap.id);
      var rEl2 = document.getElementById('modal-avm-result-' + gap.id);
      return { html: htmlNow, reopenHtml: rEl2 ? rEl2.innerHTML : '', value: a ? a.value : null };
    })();
    // empty-comps -> R148 honest empty-state (fresh verified account)
    out.gApiNoComps = await (async function () {
      try {
        addInstance('property');
        var gec = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gec, { value: 0, useValueApi: true, propStreet: '5 Quiet Ln', propCity: 'Rural', propState: 'MT', propZip: '59001' });
        window.openAccountModal(gec.id);
        window._AssetIntel.verifyAddress = async function () { return { status: 'verified', canonical: '5 QUIET LN, RURAL, MT, 59001' }; };
        window._AssetIntel.fetchEstimate = async function () { return { status: 'ok', value: 250000, low: 230000, high: 270000, updated: '2026-07-13T02:50:23Z', comps: [] }; };
        await window.groundsVerifyAndEstimate(gec.id);
        var _r = document.getElementById('modal-avm-result-' + gec.id);
        return _r ? _r.innerHTML : '';
      } catch (e) { return String(e.message); }
    })();
    // not-found -> R149 shown + NO estimate fetch (paid call blocked)
    out.gApiNotVerified = await (async function () {
      try {
        addInstance('property');
        var gnv = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gnv, { value: 0, useValueApi: true, propStreet: '999 Nowhere Rd', propCity: 'Nowhere', propState: 'ZZ', propZip: '00000' });
        window.openAccountModal(gnv.id);
        var nfFetch = 0;
        window._AssetIntel.verifyAddress = async function () { return { status: 'not-found' }; };
        window._AssetIntel.fetchEstimate = async function () { nfFetch++; return { status: 'ok', value: 1 }; };
        await window.groundsVerifyAndEstimate(gnv.id);
        var vEl = document.getElementById('modal-avm-verify-' + gnv.id);
        return { msg: vEl ? vEl.innerHTML : '', fetchCalled: nfFetch };
      } catch (e) { return { err: e.message }; }
    })();
    // Census unreachable ('error') -> FAIL-OPEN: the estimate STILL runs with the entered address (a real
    // user is not blocked by a Census outage); no R149. Only a CONFIRMED not-found blocks.
    out.gApiVerifyErr = await (async function () {
      try {
        addInstance('property');
        var gve = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gve, { value: 0, useValueApi: true, propStreet: '742 Evergreen Terrace', propCity: 'Springfield', propState: 'IL', propZip: '62704' });
        window.openAccountModal(gve.id);
        var efFetch = 0;
        window._AssetIntel.verifyAddress = async function () { return { status: 'error' }; };
        window._AssetIntel.fetchEstimate = async function () { efFetch++; return { status: 'ok', value: 275000, low: 250000, high: 300000, updated: '2026-07-13T02:50:23Z', comps: [] }; };
        await window.groundsVerifyAndEstimate(gve.id);
        var vEl = document.getElementById('modal-avm-verify-' + gve.id);
        var rEl = document.getElementById('modal-avm-result-' + gve.id);
        return { verifyMsg: vEl ? vEl.innerHTML : '', result: rEl ? rEl.innerHTML : '', fetchCalled: efFetch, addr: gve.propAddress };
      } catch (e) { return { err: e.message }; }
    })();
    // #262 §1.2 behavior — accepting LOW fills the low figure, HIGH fills the high figure (overwrite-confirm
    // guards both; the middle is covered by the persist probe above).
    out.gApiAcceptLow = (function () {
      try {
        addInstance('property');
        var gl = window.state.accounts.filter(x => x.baseId === 'property').pop();
        gl.value = 400000;
        window.groundsUseEstimate(gl.id, 215000);   // "Use the low end"
        var okB = document.getElementById('bc-ok'); if (okB) okB.click();   // accept past the overwrite-confirm
        return window.state.accounts.find(function (x) { return x.id === gl.id; }).value;
      } catch (e) { return String(e.message); }
    })();
    out.gApiAcceptHigh = (function () {
      try {
        addInstance('property');
        var gh = window.state.accounts.filter(x => x.baseId === 'property').pop();
        gh.value = 400000;
        window.groundsUseEstimate(gh.id, 367000);   // "Use the high end"
        var okB = document.getElementById('bc-ok'); if (okB) okB.click();
        return window.state.accounts.find(function (x) { return x.id === gh.id; }).value;
      } catch (e) { return String(e.message); }
    })();
    // #263 item 3 — estimate block renders UNDER Property details, INDEPENDENT of "Show carrying costs" (OFF).
    out.gApiIndependent = (function () {
      try {
        addInstance('property');
        var gi = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gi, { value: 300000, useValueApi: true, showCarryCosts: false, propStreet: '1 A St', propCity: 'Austin', propState: 'TX', propZip: '78701' });
        window.openAccountModal(gi.id);
        return cap();
      } catch (e) { return String(e.message); }
    })();
    // Datum Builder feed hook — the named emitter the future Datum Builder consumes (stub today).
    out.dbFeed = (typeof window.datumBuilderCarryingFeed === 'function') ? window.datumBuilderCarryingFeed() : null;
    // valuation guardrail probe (§6/§6b) — pure JS decision layer, no network. Populated in G3.
    out.ai = (function () {
      if (typeof window._AssetIntel === 'undefined') return { present: false };
      var AI = window._AssetIntel, k = 'gate-addr-1';
      try { localStorage.removeItem('aiByoKey'); localStorage.removeItem(AI._monthKey()); AI._cacheClear && AI._cacheClear(); } catch (e) {}
      var offAcc = { useValueApi: false }, onAcc = { useValueApi: true };
      var disabled = AI.request(offAcc, k).status;                 // toggle OFF (default) -> no call
      // drive 50 permitted calls on Datum's key, then the 51st must be capped
      var last = null;
      for (var i = 0; i < 50; i++) last = AI.request(onAcc, k + i).status;
      var call51 = AI.request(onAcc, k + 'x').status;              // MUST be 'capped'
      var countAtCap = AI._count();
      // BYO-key = the only paid path beyond the cap
      try { localStorage.setItem('aiByoKey', 'user-key-123'); } catch (e) {}
      var byo = AI.request(onAcc, k + 'y').status;                 // permitted despite cap
      // de-dupe: a cached asset returns without a new call
      try { localStorage.removeItem('aiByoKey'); } catch (e) {}
      AI._cacheSet && AI._cacheSet('cached-addr', { value: 500000 });
      var dedupe = AI.request(onAcc, 'cached-addr').status;        // 'cached'
      // no API key may ship in the browser — scan the whole served document for a key-like literal
      var docHtml = document.documentElement.innerHTML;
      var browserKey = /rentcast[_-]?key|rc_[A-Za-z0-9]{12,}|apiKey\s*[:=]\s*['"][A-Za-z0-9]{16,}/i.test(docHtml);
      return { present: true, disabled: disabled, permitted: last, call51: call51, countAtCap: countAtCap, byo: byo, dedupe: dedupe, browserKey: browserKey };
    })();
    return out;
  });
  await b.close();
  server.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  let pass = 0, fail = 0; const lines = [];
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }
  const pick = (win, lose) => RF ? lose : win;

  // ===== G1 · §3a/§3b TITLE HOVER + §29 DOCTRINE (Grounds-only) =====
  lines.push('===== G1 · §3a/§3b TITLE + DOCTRINE =====');
  ok(has(R.gBlank, 'The Grounds — your real estate') && has(R.gBlank, 'Your real property and the equity inside it'), '§3a header hover (Grounds title)');
  ok(has(R.gBlank, 'your real property — homes, land, rental units') && has(R.gBlank, "You can't rebalance a house"), '§3b full intro hover (illiquid / excluded-from-Shape)');
  ok(has(R.gBlank, 'equity grows while carrying cost quietly runs in the background'), '§29 the-one-doctrine (Grounds)');
  ok(pick(!has(R.gAuto, 'The Grounds — your real estate'), has(R.gAuto, 'The Grounds — your real estate')), 'Title hover ABSENT on Driveway (Grounds-only) [BITE]');

  // ===== G1 · §4 CARRYING-COST FIELDS + §5 TOGGLES =====
  lines.push('===== G1 · §4 CARRYING COSTS + §5 TOGGLES =====');
  ok(has(R.gFill, 'Show carrying costs') && has(R.gFill, 'Include in Datum Builder'), '§5 toggles (Show carrying costs · Include in Datum Builder)');
  // §20.4 SYNC: the Grounds insurance label now matches the Moat's ('Annual Homeowner Insurance') — same
  // mirrored figure, same label on both surfaces (Property Copy Bank A26 / §18.2 D1 unification).
  ok(has(R.gFill, 'Property Tax (yr)') && has(R.gFill, 'Annual Homeowner Insurance') && has(R.gFill, 'Est. Maintenance / Repairs (yr)') && has(R.gFill, 'HOA / Condo Fees (yr)') && has(R.gFill, 'Utilities — electric / gas / water (yr)'), '§4.1-4.5 all carrying-cost fields render');
  ok(has(R.gFill, 'Total Annual Carrying Cost') && has(R.gFill, '$16,800'), '§4.16 TOTAL = $16,800 (6000+2000+4000+1200+3600)');
  ok(has(R.gFill, "about 1% of the home's value is a common rule of thumb"), '§4.3 maintenance est. (~1%) hover (updated copy)');
  ok(pick(!has(R.gAuto, 'Annual Carrying Cost'), has(R.gAuto, 'Annual Carrying Cost')), 'Carrying-cost block ABSENT on Driveway (Grounds-only, this wave) [BITE]');
  ok(Array.isArray(R.dbFeed) && R.dbFeed.some(function (x) { return x.annualCarry === 16800; }), 'Datum Builder feed hook emits annualCarry 16800');

  // ===== G2 · §1 SIGNALS + §2 HOVERS + §9 DI + §15 EDUCATION + NET-EQUITY TIE-IN =====
  lines.push('===== G2 · §1 SIGNALS + §9 DI + §15 + TIE-IN =====');
  ok(has(R.gFill, 'You have $200,000 of equity here — $500,000 in value against $300,000 of linked debt'), '§9 DI opens value→net-equity');
  ok(has(R.gFill, 'Holding it runs about $16,800/yr beyond the mortgage'), '§9 DI carrying-cost reality clause');
  ok(has(R.gFill, 'Est. Value') && has(R.gFill, 'Net Equity') && has(R.gFill, 'Loan-to-Value') && has(R.gFill, 'Annual Carrying Cost') && has(R.gFill, 'Cost-to-Value'), '§1.1-1.6 signal rows render');
  ok(has(R.gFill, '>60%<') && has(R.gFill, '3.4%'), '§1.4 LTV=60% + §1.6 Cost-to-Value=3.4%');
  ok(has(R.gFill, 'a starting point, not an appraisal. Your own number always wins'), '§2 Est. Value hover (richest, R20)');
  ok(has(R.gFill, 'separate from any loan payment'), '§2 Annual Carrying Cost hover (R24)');
  ok(has(R.gFill, 'Home equity is your value minus what you owe') && has(R.gFill, 'keeps a paid-off home affordable'), '§15 education body (R87 verbatim)');
  ok(pick(has(R.gBlank, 'Enter a value for this property'), !has(R.gBlank, 'Enter a value for this property')), 'DI empty-state prompt when no value (sourced-or-blank) [BITE]');
  ok(has(R.mLinked, 'Net Equity') && has(R.mLinked, '$200,000'), '§6b.10 tie-in — the Moat Net Equity reads Grounds value ($500k − $300k = $200k)');

  // ===== BLOCK A · §2 5 CARRYING-COST HOVERS (verbatim, sourced-or-blank) =====
  lines.push('===== BLOCK A · §2 CARRYING-COST HOVERS =====');
  ok(has(R.gFill, 'set by your local assessor. Enter your bill amount'), '§2 Property Tax hover (R25)');
  ok(has(R.gFill, 'insure the home itself against damage — separate from the mortgage'), '§2 Homeowners Insurance hover (R26)');
  ok(has(R.gFill, "about 1% of the home's value is a common rule of thumb. It's only a starting point; your own number always wins"), '§2 Maintenance hover — est./overwrite-warn (R27)');
  ok(has(R.gFill, 'dues for a homeowners or condo association, where you have one'), '§2 HOA / Condo hover (R28)');
  ok(has(R.gFill, 'keep the lights on and water running — electric, gas, water. Link an account'), '§2 Utilities hover — LINKABLE (R29)');
  ok(pick(!has(R.gAuto, 'set by your local assessor'), has(R.gAuto, 'set by your local assessor')), '§2 carrying-cost hovers ABSENT on Driveway (Grounds-only) [BITE]');

  // ===== BLOCK B · §9b PRESCRIPTIVE CROSS-SIGNAL DI (composed, sourced-or-blank, silence=nuance) =====
  lines.push('===== BLOCK B · §9b PRESCRIPTIVE DI =====');
  ok(has(R.g9bAll, "It costs about 5% of this home's value each year just to hold it — roughly $10,000/yr before any mortgage payment") && has(R.g9bAll, 'on the higher side for a home'), '§9b.1 Cost-to-Value flag (ctv 5% ≥ 4%)');
  ok(has(R.g9bAll, "you still owe a large share of the home's value (90% loan-to-value)") && has(R.g9bAll, "not a problem to fix"), '§9b.2 LTV×carrying cross (LTV 90% + ctv HIGH, normalizing)');
  ok(has(R.g9bAll, "Your net equity of $20,000 is about 2 years of this home's carrying cost"), '§9b.3 equity-vs-carrying horizon (display-derived)');
  ok(has(R.g9bAll, 'Your utilities here are entered by hand. If you link the account'), '§9b.4 utilities-link nudge (manual + has value)');
  ok((R.g9bAll.indexOf('It costs about 5%') < R.g9bAll.indexOf('large share of the home')) && (R.g9bAll.indexOf('large share of the home') < R.g9bAll.indexOf('Your net equity of $20,000')), '§9b composition order 9b.1→9b.2→9b.3');
  ok(has(R.gFill, "Your net equity of $200,000 is about 12 years"), '§9b.3 fires on gFill (eq $200k / carry $16.8k)');
  ok(pick(!has(R.gFill, 'on the higher side for a home'), has(R.gFill, 'on the higher side for a home')), '§9b.1/9b.2 SILENT below threshold (gFill ctv 3.4% / LTV 60%) [BITE]');
  ok(pick(!has(R.gNone, 'on the higher side for a home') && !has(R.gNone, 'net equity of') && !has(R.gNone, 'entered by hand'), has(R.gNone, 'net equity of')), '§9b prints NOTHING when no rule fires (no all-clear line) [BITE]');

  // ===== #244 ADDENDUM · SIGNAL-STRIP HOVERS (5 titles) + est.-title fix =====
  lines.push('===== #244 · SIGNAL-STRIP HOVERS =====');
  ok(pick(has(R.gFill, '<strong>Est. Value</strong>') && !has(R.gFill, '<strong>est.</strong>'), has(R.gFill, '<strong>est.</strong>')), 'Est. Value title fixed (est.->Est. Value, truncated gone) [BITE]');
  ok(has(R.gFill, '<strong>Linked Debt</strong>') && has(R.gFill, 'usually your mortgage'), 'Linked Debt hover (title + body)');
  ok(has(R.gFill, '<strong>Net Equity</strong>') && has(R.gFill, 'if you sold today'), 'Net Equity hover (title + body)');
  ok(has(R.gFill, '<strong>Loan-to-Value</strong>') && has(R.gFill, 'share of its value'), 'Loan-to-Value hover (title + body)');
  ok(has(R.gFill, '<strong>Cost-to-Value</strong>') && has(R.gFill, 'just to hold this home'), 'Cost-to-Value hover (title + body)');
  ok(has(R.gFill, '<strong>Carrying cost</strong>'), 'Annual Carrying Cost hover (already-green, still present)');
  // sourced-or-blank preserved — Linked Debt / LTV rows only render when debt>0 (gNone has value, no debt)
  ok(!has(R.gNone, '<strong>Linked Debt</strong>') && !has(R.gNone, '<strong>Loan-to-Value</strong>'), 'Linked Debt / LTV rows still ABSENT when no debt (hover did not force the row)');

  // ===== #249 STEP-6 · VALUATION UI (toggle-gated; range/tag/Use-button/overwrite-warn) =====
  lines.push('===== #249 STEP-6 · VALUATION UI =====');
  ok(has(R.gApiUI, 'Property Address') && has(R.gApiUI, 'Add the property address to pull an automated value estimate') && has(R.gApiUI, 'Get estimate'), 'toggle ON -> Property Address (R132 hint) + Get-estimate button');
  ok(pick(has(R.gApiResult, 'Market Range') && has(R.gApiResult, '$215,000') && has(R.gApiResult, '$291,000') && has(R.gApiResult, '$367,000'), !has(R.gApiResult, 'Market Range')), '#262 W1 low/mid/high BAND (Market Range + 3 figures) in served bytes [BITE]');
  ok(has(R.gApiResult, 'est. · via RentCast · Jul 2026') && !has(R.gApiResult, 'Estimated Market Range'), '#262 §1.4 provenance (est. · via RentCast · {date}); "Estimated" removed (est. once)');
  ok(has(R.gApiResult, 'Use the low end') && has(R.gApiResult, 'Use the middle') && has(R.gApiResult, 'Use the high end'), '#262 §1.2 three per-range accept buttons (R155/R156/R157 verbatim)');
  ok(pick(has(R.gApiResult, 'the middle is its best single guess') && has(R.gApiResult, 'in quieter areas those sales can come from the wider city'), !has(R.gApiResult, 'the middle is its best single guess')), '#262 §1.1 R154 headline hover (must-carry winner, verbatim) [BITE]');
  ok(has(R.gApiResult, 'conservative, balanced, or optimistic') && has(R.gApiResult, 'plan cautiously or generously'), '#262 §1.2 R158 pick-your-comfort hover (verbatim)');
  // #263 W3 — band without on-top labels; estimate block independent of carrying costs; explainer moved up
  ok(pick(!has(R.gApiResult, '0.08em; color:rgba(255,255,255,0.4);">Low') && has(R.gApiResult, 'Use the low end'), has(R.gApiResult, '0.08em; color:rgba(255,255,255,0.4);">Low')), '#263 item 2 — on-top Low/Middle/High labels REMOVED (buttons carry it) [BITE]');
  ok(pick(R.gApiIndependent && has(R.gApiIndependent, 'Get estimate') && has(R.gApiIndependent, 'Property Address') && !has(R.gApiIndependent, '🧾 Annual Carrying Cost'), !(R.gApiIndependent && has(R.gApiIndependent, 'Get estimate'))), '#263 item 3 — estimate block renders with "Show carrying costs" OFF (independent parent) [BITE]');
  ok(R.gFill.indexOf('Home equity is your value minus what you owe') >= 0 && R.gFill.indexOf('Home equity is your value minus what you owe') < R.gFill.indexOf('🧾 Annual Carrying Cost'), '#263 item 4 — equity explainer ABOVE the carrying-cost fields');
  ok(has(R.gApiConfirm.msg, 'a starting point, not an appraisal. Your own number always wins'), 'overwrite-warn BODY = R20 copy verbatim (never auto-overwrite)');
  ok(R.gApiConfirm.title === 'Use the estimate?', '#250 FIX2 · confirm TITLE = R134 "Use the estimate?"');
  ok(pick(R.gApiConfirm.cancel === 'Keep my value', R.gApiConfirm.cancel !== 'Keep my value'), '#250 FIX2 · default button = R133 "Keep my value" [BITE]');
  ok(R.gApiConfirm.ok === 'Use $291,000', '#250 FIX2 · primary button = R133 "Use $<mid>" (live mid $291,000)');
  ok(pick(!has(R.gFill, 'Property Address') && !has(R.gFill, 'Get estimate'), has(R.gFill, 'Get estimate')), 'valuation UI ABSENT when API toggle OFF (opt-in) [BITE]');
  ok(pick(has(R.gFill, "Estimate this home's value") && !has(R.gFill, 'Use value estimate (API)') && !has(R.gFill, 'OFF until key present'), has(R.gFill, 'Use value estimate (API)')), '#257.1 · toggle label = "Estimate this home\'s value" (old "(API)" + stale suffix GONE) [BITE]');
  ok(pick(has(R.gFill, "Turn this on and Datum looks up an estimated market range for this address, tagged 'est.'") && has(R.gFill, "we'll never overwrite it without asking") && !has(R.gFill, 'never in your browser') && !has(R.gFill, 'When enabled with a key'), has(R.gFill, 'never in your browser')), '#257.1 · toggle hover = R135 plain-coach (engineer "never in your browser"/"When enabled with a key" GONE) [BITE]');

  // ===== #258/#259 PART 2/3 · VERIFY-THEN-ESTIMATE + COMPS (Census proxy · $0 comps passthrough) =====
  lines.push('===== #258/#259 PART 2/3 · VERIFY + COMPS =====');
  ok(R.gApiCanonical === '1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500', 'verify writes the CANONICAL address into the hidden RentCast field');
  ok(pick(has(R.gApiResult, '<strong>Comparable sales</strong>') && has(R.gApiResult, 'Recent nearby sales the estimate leans on'), !has(R.gApiResult, 'Comparable sales')), 'R147 comps section renders on a successful estimate [BITE]');
  ok(has(R.gApiResult, '1700 Penn Ave, Washington, DC') && has(R.gApiResult, '$305,000'), 'a comp row renders (address · sale price)');
  ok(has(R.gApiResult, '3 bd') && has(R.gApiResult, '2 ba') && has(R.gApiResult, '1,800 sqft') && has(R.gApiResult, '0.3 mi'), 'comp row meta (beds/baths/sqft/distance)');
  ok(pick(has(R.gApiNoComps, 'No solid nearby sales to show yet') && !has(R.gApiNoComps, 'Comparable sales'), has(R.gApiNoComps, 'Comparable sales')), 'R148 empty-state when comps array empty (never fabricate) [BITE]');
  ok(pick(has((R.gApiNotVerified && R.gApiNotVerified.msg) || '', 'we couldn’t confirm that address'), !has((R.gApiNotVerified && R.gApiNotVerified.msg) || '', 'we couldn’t confirm that address')), 'R149 not-verified message on Census not-found [BITE]');
  ok(pick(R.gApiNotVerified && R.gApiNotVerified.fetchCalled === 0, !(R.gApiNotVerified && R.gApiNotVerified.fetchCalled === 0)), 'not-found BLOCKS the paid RentCast call (nothing paid fires) [BITE]');
  ok(pick(R.gApiVerifyErr && R.gApiVerifyErr.fetchCalled === 1 && has(R.gApiVerifyErr.result, 'Market Range'), !(R.gApiVerifyErr && R.gApiVerifyErr.fetchCalled === 1)), 'Census unreachable -> FAIL-OPEN: estimate STILL runs (real user not blocked) [BITE]');
  ok(pick(R.gApiPersist && has(R.gApiPersist.html, 'Market Range') && has(R.gApiPersist.html, 'Comparable sales') && has(R.gApiPersist.html, '1700 Penn Ave'), !(R.gApiPersist && has(R.gApiPersist.html, 'Market Range'))), '#260 estimate + comps PERSIST after "Use the estimate" (not torn down) [BITE]');
  ok(R.gApiPersist && has(R.gApiPersist.reopenHtml, 'Market Range') && has(R.gApiPersist.reopenHtml, 'Comparable sales'), '#260 estimate + comps survive a full modal close+reopen');
  ok(R.gApiPersist && (R.gApiPersist.value === '291000' || R.gApiPersist.value === 291000), '#260 accepted MIDDLE still fills the value field (no regression)');
  ok(R.gApiAcceptLow === '215000' || R.gApiAcceptLow === 215000, '#262 §1.2 accept LOW fills the low figure ($215,000)');
  ok(R.gApiAcceptHigh === '367000' || R.gApiAcceptHigh === 367000, '#262 §1.2 accept HIGH fills the high figure ($367,000)');
  ok(R.gApiVerifyErr && !has(R.gApiVerifyErr.verifyMsg || '', 'we couldn’t confirm that address'), 'fail-open does NOT show R149 (only a CONFIRMED not-found blocks)');
  ok(R.gApiVerifyErr && R.gApiVerifyErr.addr === '742 Evergreen Terrace, Springfield, IL, 62704', 'fail-open feeds the ENTERED (joined) address to RentCast');

  // ===== #258/#259 PART 1 · PROPERTY-DETAIL FIELDS (12 fields + 2 dropdowns, manual/blank, verbatim hovers) =====
  lines.push('===== #258/#259 PART 1 · PROPERTY-DETAIL FIELDS =====');
  ok(has(R.gBlank, '🏠 Property details'), 'Property details section renders (all property rooms)');
  ok(has(R.gBlank, 'A nickname just for you'), 'R136 Property name hover (verbatim)');
  ok(pick(has(R.gBlank, 'What is the purpose of this place') && !has(R.gBlank, 'purposed'), has(R.gBlank, 'purposed')), 'R137 Property purpose hover — corrected "purpose", NOT "purposed" [BITE]');
  ok(has(R.gBlank, 'the upkeep and fees behind the walls'), 'R138 Property type hover (verbatim)');
  ok(has(R.gBlank, 'a real, findable US address before we ever look up a value'), 'R139 Street address hover (verbatim)');
  ok(has(R.gBlank, 'before any value lookup runs'), 'R140 City hover (verbatim)');
  ok(has(R.gBlank, 'US only for now'), 'R141 State hover (verbatim)');
  ok(has(R.gBlank, 'sharpens the address check and the value estimate'), 'R142 ZIP hover (verbatim)');
  ok(has(R.gBlank, 'helps size up the home'), 'R143 Bedrooms hover (verbatim)');
  ok(has(R.gBlank, 'when you weigh keeping vs. downsizing later'), 'R144 Bathrooms hover (verbatim)');
  ok(has(R.gBlank, 'The finished square footage'), 'R145 Living area hover (verbatim)');
  ok(has(R.gBlank, 'Older homes can carry bigger upkeep and insurance'), 'R146 Year built hover (verbatim)');
  ok(has(R.gBlank, 'Primary residence') && has(R.gBlank, 'Rental property') && has(R.gBlank, '>Land<'), 'R150 purpose dropdown option-labels (verbatim)');
  ok(has(R.gBlank, 'Single-family') && has(R.gBlank, 'Townhouse') && has(R.gBlank, 'Manufactured'), 'R151 type dropdown option-labels (verbatim)');
  ok(has(R.gBlank, '>6+ Beds<') && has(R.gBlank, '>4+ Baths<'), 'R143/R144 beds & baths dropdown options');
  ok(has(R.gBlank, 'Select purpose…') && has(R.gBlank, 'Select type…'), 'dropdown placeholders (R150/R151)');
  // slim-mirror round-trip — the 11 detail fields survive save->slim->hydrate for a signed-in user
  ok(pick(R.slimDetails && R.slimDetails.propName === 'Lake cabin' && R.slimDetails.propPurpose === 'Rental property' && R.slimDetails.propType === 'Condo' && R.slimDetails.propStreet === '123 Main St' && R.slimDetails.propCity === 'Austin' && R.slimDetails.propState === 'TX' && R.slimDetails.propZip === '78701' && R.slimDetails.propBeds === '3 Beds' && R.slimDetails.propBaths === '2 Baths' && R.slimDetails.propSqft === '1850' && R.slimDetails.propYear === '1998',
          !(R.slimDetails && R.slimDetails.propName === 'Lake cabin')), 'all 11 detail fields SURVIVE slim-mirror round-trip (signed-in) [BITE]');
  // #261 live-smoke fixes — dark dropdowns, always-enabled Get-estimate button, live address preview sync
  ok(/var\(--bg-navy\)[^>]*'propPurpose'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propType'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propBeds'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propBaths'/.test(R.gBlank), '#261 all 4 property dropdowns render dark (bg-navy, not white)');
  ok(pick(/id="avm-getbtn-[^>]*groundsVerifyAndEstimate/.test(R.gApiUI) && !/id="avm-getbtn-[^>]*disabled/.test(R.gApiUI), /id="avm-getbtn-[^>]*disabled/.test(R.gApiUI)), '#261 Get-estimate button ALWAYS-enabled (handler validates on click; no frozen disabled) [BITE]');
  ok(has(R.gApiUI, 'modal-avm-addrpreview-') && has(R.gBlank, '_groundsSyncAvmAddr'), '#261 live address-preview sync wired (structured fields -> preview)');

  // ===== #245 §0.2 · ASSET-SIDE REVERSE-SCOPE (property accepts ONLY Mortgage/HELOC) =====
  lines.push('===== #245 §0.2 · REVERSE-SCOPE =====');
  const rev = R.gRev || { control: false, why: 'NO_RESULT', opts: [] };
  const revOpts = rev.opts || [];
  const optHas = (frag) => revOpts.some((t) => t.indexOf(frag) >= 0);
  /* PRESENCE BEFORE EXCLUSION (house law 2026-08-02). These two are NOT pick()-wrapped: a
     precondition that inverts under --redfirst passes by doing nothing, and an inverted run that
     passes by doing nothing is void. They must hold in BOTH modes. */
  ok(rev.control === true, 'PRESENCE: the liability link control RENDERS on a property (why=' + (rev.why || 'ok') + ')');
  ok(rev.control === true && revOpts.length >= 1 && !rev.emptyState,
     'PRESENCE: the control offers at least one linkable debt — the exclusion below is not vacuous (' + revOpts.length + ' rows)');
  ok(optHas('Mortgage') || optHas('The Moat'), 'DO-NOT-BREAK: Mortgage IS offered on a property target list');
  ok(pick(optHas('HELOC') || optHas('The Cellar'), !(optHas('HELOC') || optHas('The Cellar'))), 'HELOC IS offered on a property target list (the half never exercised until 2026-08-02) [BITE]');
  ok(pick(!optHas('Auto Loan') && !optHas('Personal Loan'), optHas('Auto Loan') || optHas('Personal Loan')), 'non-mortgage debts (Auto Loan / Personal Loan) EXCLUDED from property target list [BITE]');
  ok(revOpts.length >= 1 && revOpts.every((t) => /Mortgage|HELOC|The Moat|The Cellar/.test(t)), 'property target list = Mortgage/HELOC ONLY (' + revOpts.length + ' opts); ' + JSON.stringify(revOpts));

  // ===== #244 OPEN-1 · SLIM MIRROR PRESERVES CARRYING COSTS (real-user data-loss) =====
  lines.push('===== #244 OPEN-1 · SLIM MIRROR CARRY ROUND-TRIP =====');
  ok(pick(R.slimCarry && R.slimCarry.propTaxYr === '6000' && R.slimCarry.homeInsYr === '2000' && R.slimCarry.maintYr === '4000' && R.slimCarry.hoaYr === '1200' && R.slimCarry.utilYr === '3600',
          !(R.slimCarry && R.slimCarry.propTaxYr === '6000')), 'All 5 carrying-cost fields SURVIVE slim-mirror -> hydrate round-trip [BITE]');

  // ===== #244 OPEN-2 · REVERSE-LINK / NET EQUITY (mortgage drives Net Equity + LTV) =====
  lines.push('===== #244 OPEN-2 · NET EQUITY / LTV =====');
  ok(has(R.gFill, 'Net Equity') && has(R.gFill, '$200,000'), 'Linked mortgage -> Net Equity $200,000 ($500k − $300k)');
  ok(has(R.gFill, 'Loan-to-Value') && has(R.gFill, '>60%<'), 'Linked mortgage -> Loan-to-Value 60%');
  ok(has(R.gNone, 'Net Equity') && has(R.gNone, '$300,000'), 'Unlinked home -> Net Equity = full value ($300k)');
  ok(pick(!has(R.gNone, 'Loan-to-Value'), has(R.gNone, 'Loan-to-Value')), 'Unlinked -> LTV row CLEARS (sourced-or-blank, L47) [BITE]');
  ok(has(R.mLinked, 'Net Equity (Asset — Debt)'), 'Debt-side property* link-scope live (Moat reads Grounds value)');

  // ===== §9c · VALUE-MISSING NUDGE (carry entered, no value) — 3-condition DoD =====
  lines.push('===== §9c · VALUE-MISSING NUDGE =====');
  // (1) value=0 + carry entered -> §9c nudge present AND §9b strings absent
  ok(pick(has(R.gNudge, "You've got the carrying costs in — that's the hard part"), !has(R.gNudge, "You've got the carrying costs in")), '§9c nudge PRESENT when carry>0 & value=0 [BITE]');
  ok(has(R.gNudge, 'add it in from the Estate screen') && has(R.gNudge, 'your own number always wins'), '§9c nudge full copy (Estate-screen + own-number-wins)');
  ok(!has(R.gNudge, 'Your net equity of') && !has(R.gNudge, 'It costs about') && !has(R.gNudge, 'entered by hand'), '§9/§9b correctly SILENT when value=0 (guard holds)');
  // (2) value entered -> §9b present AND §9c nudge GONE
  ok(has(R.gFill, 'Your net equity of $200,000'), '§9b PRESENT when value entered (gFill)');
  ok(pick(!has(R.gFill, "You've got the carrying costs in"), has(R.gFill, "You've got the carrying costs in")), '§9c nudge GONE when value entered [BITE]');
  // (3) blank room (no value, no carry) -> _GROUNDS_DI_EMPTY still shows
  ok(has(R.gBlank, 'Enter a value for this property'), '_GROUNDS_DI_EMPTY still shows for a truly-blank room');
  ok(!has(R.gBlank, "You've got the carrying costs in"), '§9c does NOT fire on a blank room (needs carry>0)');

  // ===== FIX #242 · SERVED-BYTES on a string-valued (restored-blueprint) home =====
  lines.push('===== FIX #242 · SERVED-BYTES (string value) =====');
  ok(pick(has(R.gStr, "Your net equity of $400,000 is about 40 years of this home's carrying cost"), !has(R.gStr, 'Your net equity of $400,000')), 'SERVED: §9b.3 renders on a string-valued home (was silenced live) [BITE]');
  ok(has(R.gStr, 'Your utilities here are entered by hand. If you link the account'), 'SERVED: §9b.4 utilities-link nudge on a string-valued home');
  ok(has(R.gStr, "This property is worth $400,000, with no debt linked against it — that's $400,000 of equity"), 'SERVED: §9 also revived (val no longer parses to 0)');

  // ===== G3 · §6/§6b VALUATION GUARDRAIL (hard-cap · BYO-key · de-dupe · key OFF, no browser key) =====
  lines.push('===== G3 · §6/§6b VALUATION GUARDRAIL =====');
  ok(R.ai && R.ai.present, 'Asset-Intelligence layer present (provider-agnostic seam)');
  ok(R.ai && R.ai.disabled === 'disabled', '§5 toggle OFF (default) → request issues NO call');
  ok(R.ai && R.ai.permitted === 'stubbed', 'calls 1–50 permitted on Datum key (stubbed — no network)');
  ok(pick(R.ai && R.ai.call51 === 'capped', R.ai && R.ai.call51 !== 'capped'), 'call #51 CAPPED on Datum key (hard-cap 50/mo) [BITE]');
  ok(R.ai && R.ai.countAtCap === 50, 'counter stays at 50 (no bump on the capped call)');
  ok(R.ai && R.ai.byo === 'stubbed', 'BYO-key is the ONLY path past the cap (paid usage = user key)');
  ok(R.ai && R.ai.dedupe === 'cached', 'de-dupe: a cached asset returns without a new call');
  ok(pick(R.ai && R.ai.browserKey === false, !(R.ai && R.ai.browserKey === false)), 'NO API key literal in browser bytes (key = Worker secret) [BITE]');
  ok(has(R.gFill, "Estimate this home's value"), '§5 value-estimate toggle rendered (R135 label)');

  lines.push('-------------------------------------');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  /* A POISONED RUN MUST NAME ITS MUTATION — a run that prints CLEAN over a mutated file is the
     shape that lets a dead control read as a live one. */
  const TAG = NOHELOC ? 'MUTATED[noheloc]' : NOCTRL ? 'MUTATED[nocontrol]' : RF ? 'RED-FIRST' : 'CLEAN';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped to losers — MUST be RED)' : 'NORMAL') + '   |   FILE: ' + TAG + '   |   STAGE: G10 (+ #250 fixes) — WHOLE ROOM');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const caps = [R.gBlank, R.gFill, R.gAuto, R.mLinked, R.g9bAll, R.gNone, R.gStr, R.gNudge, R.gApiUI, R.gApiResult];
  const guard = caps.every(s => !has(s, 'undefined') && !has(s, 'NaN') && !has(s, '__'));
  lines.push('render-guard (no undefined/NaN/__): ' + guard);
  if (!guard) fail++;

  const summary = '[' + LABEL + '] GROUNDS WINNER GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_grounds_winners.out.txt', summary, 'utf8');
  console.log(summary);
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  if (MUT) {
    console.log(fail > 0
      ? 'RED-FIRST OK \u2014 the mutation BIT (' + fail + ' red).'
      : 'RED-FIRST FAILED \u2014 the poison landed and nothing noticed.');
    if (NOCTRL) {
      /* The whole point of --nocontrol: the PRESENCE assertions must be among the reds. If the
         control is gone and presence still reads green, the house law is not actually wired. */
      const presenceRed = lines.some((l) => l.indexOf('FAIL PRESENCE:') === 0);
      console.log(presenceRed
        ? 'PRESENCE LAW OK \u2014 a vanished control RED itself.'
        : '\u274c PRESENCE LAW DEAD \u2014 the control was removed and PRESENCE still passed.');
      if (!presenceRed) process.exit(1);
    }
  }
  process.exit(fail === 0 ? 0 : 1);
})();
