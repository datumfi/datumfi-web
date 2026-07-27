/* STEP A · Slice 2 gate — investment-modal chrome parity (W2/W4/W5/W6) + §15 panel relocation +
   Taxable §19 rollup parity (the 3 fields Taxable was missing). Drives the REAL openAccountModal in
   DECORATE (showHoldings=true) and OVERVIEW (showHoldings=false) and asserts against the LIVE DOM —
   VISIBILITY, not just string presence, because W2 collapses education via display:none (the markup
   stays in innerHTML, so a string-absence check would be green-for-the-wrong-reason).

   Asserts (per room):
     (1) education region VISIBLE in overview / HIDDEN in decorate (#modal-edu-collapse computed display)
     (2) W4a — DI box precedes the rollup in DOM order (decorate)
     (3) W4b — Back = "← Back to <title> Overview", AFTER the table, NOT the old "Back to Account";
         entry button "BEGIN INTERIOR DECORATING" shows in overview only
     (4) W5/W6 — universal empty-state DI copy on zero-holdings decorate (401k/457/IRA/403/HSA/529)
     (5) Current Balance input HIDDEN in decorate / VISIBLE in overview (both-ways — Ruling A)
     (6) per-holding × delete present in decorate
     (7) §15 "Why …?" panel HIDDEN in decorate / VISIBLE in overview (IRA + 457, both-ways lock)
     (8) §15 panel precedes the toggles (top-of-modal DOM order)
     (9) Taxable §19 — Invested/Cash · Balance · Annual Contribution cells + verbatim R409/R414/R415 markers

   RED at 7515d0e (pre-Slice-2): DI at bottom, no collapse, "Back to Account", blank Roth empty-state,
   §15 at bottom, no Taxable Invested/Cash/Balance/Contribution. Run: serve repo root on :8001, then
   node scripts/_gate_stepA_slice2.js [LABEL].  UTF-8 dump; exit 0 = GREEN. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const one = () => [{ ticker: 'VTI', name: 'US Large', price: 100, shares: 100, assetClass: 'Stocks',
      geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', priceSource: 'manual' }];
    const cap = (baseId, holdings, showH) => {
      try { addInstance(baseId); } catch (e) { return { err: e.message }; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return { err: 'no account' };
      a.holdings = holdings; a.showHoldings = showH;
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      const html = document.getElementById('modal-dynamic-content').innerHTML;
      const edu = document.getElementById('modal-edu-collapse');
      const eduVis = edu ? (getComputedStyle(edu).display !== 'none') : null;
      const cbEl = [].slice.call(document.querySelectorAll('.input-label'))
        .filter(function (e) { return e.textContent.trim() === 'Current Balance'; })[0];
      const cbVis = cbEl ? (cbEl.offsetParent !== null) : false;
      return { html: html, eduVis: eduVis, cbVis: cbVis };
    };
    const rooms = {
      taxable:    { title: 'Taxable Brokerage' },
      pretax401k: { title: 'Pre-Tax 401(k)' },
      rothira:    { title: 'Roth IRA' },
      roth457b:   { title: 'Roth 457(b)' },
      hsa:        { title: 'HSA' },
    };
    const out = {};
    Object.keys(rooms).forEach(function (id) {
      out[id] = { title: rooms[id].title, dec: cap(id, one(), true), ovw: cap(id, one(), false) };
    });
    // empty-state (W5): decorate entry with ZERO holdings -> DI box must carry the universal guidance copy
    const emptyRooms = ['pretax401k', 'roth457b', 'rothira', 'trad403', 'hsa', '529plan'];
    out._empty = {};
    emptyRooms.forEach(function (id) { out._empty[id] = cap(id, [], true).html; });
    return out;
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const before = (s, a, z) => has(s, a) && has(s, z) && s.indexOf(a) < s.indexOf(z);
  const TOGGLE = 'Include this account in my plan';
  const DI = 'Datum Intelligence';
  const ROLLUP = 'holdings-rollup';
  const EMPTY = 'Add a few tickers below and Datum reads the whole picture';
  const ENTRY = 'BEGIN INTERIOR DECORATING';
  const IRA_PANEL = 'Your IRA, your menu';
  const B457_PANEL = 'you work for a STATE or LOCAL GOVERNMENT';   // §15 457 body marker (expander header uses a curly apostrophe)

  const T = R.taxable, K = R.pretax401k, I = R.rothira, F = R.roth457b, H = R.hsa;
  const checks = [
    // (1) education collapse — VISIBLE overview / HIDDEN decorate (display:none, checked live)
    ['(1) edu HIDDEN in decorate — taxable', T.dec.eduVis === false],
    ['(1) edu VISIBLE in overview — taxable', T.ovw.eduVis === true],
    ['(1) edu HIDDEN in decorate — 401k', K.dec.eduVis === false],
    ['(1) edu HIDDEN in decorate — IRA', I.dec.eduVis === false],
    ['(1) edu VISIBLE in overview — IRA', I.ovw.eduVis === true],
    ['(1) edu HIDDEN in decorate — HSA', H.dec.eduVis === false],
    // (2) DI box precedes the rollup (W4a)
    ['(2) DI box precedes rollup — taxable', before(T.dec.html, DI, ROLLUP)],
    ['(2) DI box precedes rollup — 401k', before(K.dec.html, DI, ROLLUP)],
    ['(2) DI box precedes rollup — IRA', before(I.dec.html, DI, ROLLUP)],
    // (3) Back button relabeled + at bottom (after table) + entry button overview-only (W4b)
    ['(3) Back "← Back to Taxable Brokerage Overview"', has(T.dec.html, '← Back to Taxable Brokerage Overview')],
    ['(3) Back "← Back to Pre-Tax 401(k) Overview"', has(K.dec.html, '← Back to Pre-Tax 401(k) Overview')],
    ['(3) old "Back to Account" GONE', !has(T.dec.html, '← Back to Account') && !has(K.dec.html, '← Back to Account')],
    ['(3) Back button AFTER the table — taxable', before(T.dec.html, '+ Add Holding', '← Back to')],
    ['(3) entry button in overview only — taxable', has(T.ovw.html, ENTRY) && !has(T.dec.html, ENTRY)],
    ['(3) no Back button in overview — taxable', !has(T.ovw.html, '← Back to')],
    // (4) universal empty-state (W5/W6) — 401k/457/IRA/403/HSA/529
    ['(4) empty-state 401k', has(R._empty.pretax401k, EMPTY)],
    ['(4) empty-state 457(b)', has(R._empty.roth457b, EMPTY)],
    ['(4) empty-state IRA', has(R._empty.rothira, EMPTY)],
    ['(4) empty-state 403(b)', has(R._empty.trad403, EMPTY)],
    ['(4) empty-state HSA', has(R._empty.hsa, EMPTY)],
    ['(4) empty-state 529', has(R._empty['529plan'], EMPTY)],
    // (5) Ruling A — investment modals have NO manual Current Balance box (it is debt-taxCode-only);
    // the derive path (Σ price×shares) is the SOLE value source. Lock it ABSENT so a regression can't
    // quietly reintroduce a manual balance box that would contradict the derive path.
    ['(5) no Current Balance box in investment modal — taxable (derive-path is sole value source)', !has(T.dec.html, 'Current Balance') && !has(T.ovw.html, 'Current Balance')],
    ['(5) no Current Balance box in investment modal — 401k', !has(K.dec.html, 'Current Balance') && !has(K.ovw.html, 'Current Balance')],
    // (6) per-holding delete present in decorate
    ['(6) per-holding × delete present — taxable', has(T.dec.html, 'removeHolding(')],
    ['(6) per-holding × delete present — 401k', has(K.dec.html, 'removeHolding(')],
    // (7) §15 panel both-ways lock (IRA + 457)
    ['(7) IRA §15 present+VISIBLE in overview', has(I.ovw.html, IRA_PANEL) && I.ovw.eduVis === true],
    ['(7) IRA §15 HIDDEN in decorate', I.dec.eduVis === false],
    ['(7) 457 §15 present+VISIBLE in overview', has(F.ovw.html, B457_PANEL) && F.ovw.eduVis === true],
    ['(7) 457 §15 HIDDEN in decorate', F.dec.eduVis === false],
    // (8) §15 panel precedes the toggles (top-of-modal DOM order)
    ['(8) IRA §15 precedes the toggles', before(I.ovw.html, IRA_PANEL, TOGGLE)],
    ['(8) 457 §15 precedes the toggles', before(F.ovw.html, B457_PANEL, TOGGLE)],
    // (9) Account Value (field 1, universal — replaces the Invested/Cash restatement) + Taxable §19 Balance/Contribution
    ['(9) Account Value field 1 universal (verbatim hover) — taxable', has(T.dec.html, 'Account Value') && has(T.dec.html, "the sum of every holding's price times the shares you own")],
    ['(9) Account Value present in 401k & IRA (universal replace)', has(K.dec.html, 'Account Value') && has(I.dec.html, 'Account Value')],
    ['(9) Account Value is field 1 (precedes Equity) — taxable', before(T.dec.html, 'Account Value', 'Equity %')],
    ['(9) old "Invested / Cash" restatement GONE', !has(T.dec.html, 'Invested / Cash') && !has(K.dec.html, 'Invested / Cash')],
    ['(9) Taxable §19 Balance cell kept', has(T.dec.html, "no 59½ gate, no penalty, no RMD")],
    ['(9) Taxable §19 Annual Contribution cell kept', has(T.dec.html, 'Annual Contribution') && has(T.dec.html, 'NO IRS contribution limit')],
    // (10) hover-clip fix — rollup cells reposition BELOW + viewport-clamp on hover via the shared
    // _ttDrop helper (2026-07-08: replaced the duplicated inline math; drop-below geometry is proven
    // live by scripts/_gate_tt_anchor.js). Here just assert the rollup wires the shared engine.
    ['(10) rollup hover wires shared _ttDrop (fixed+clamp, no clip) — taxable', has(T.dec.html, '_ttDrop(this)')],
    ['(10) rollup hover wires shared _ttDrop — IRA', has(I.dec.html, '_ttDrop(this)')],
    // (11) Weighted Beta always present (11-field parity, — when no beta) — IRA & 457 no longer drop to 10
    ['(11) IRA rollup keeps Weighted Beta (11 fields, — when no beta)', has(I.dec.html, 'Weighted Beta')],
    ['(11) 457 rollup keeps Weighted Beta', has(F.dec.html, 'Weighted Beta')],
    // junk-safety
    ['no undefined/NaN in any capture', ['taxable','pretax401k','rothira','roth457b','hsa'].every(function (k) {
      return !has(R[k].dec.html, 'undefined') && !has(R[k].dec.html, 'NaN') &&
             !has(R[k].ovw.html, 'undefined') && !has(R[k].ovw.html, 'NaN'); })],
  ];

  let pass = 0;
  const lines = checks.map(function (c) { if (c[1]) pass++; return (c[1] ? 'PASS ' : 'FAIL ') + c[0]; });
  const summary = '[' + LABEL + '] ' + pass + '/' + checks.length + ' GREEN\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_stepA_slice2.out.txt', summary, 'utf8');
  console.log(summary.split('\n').slice(0, 1).join('') + (pass === checks.length ? '' : ' — see scripts/.gate-out/_gate_stepA_slice2.out.txt'));
  process.exit(pass === checks.length ? 0 : 1);
})();
