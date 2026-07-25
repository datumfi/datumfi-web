/* L52 WHOLE-ROOM WINNER GATE — Mortgage "The Moat" (mortgage_joint / _primary / _co).
   The REUSABLE SECURED-DEBT TEMPLATE room (L48): its link-scope seam, escrow block,
   variable-rate cluster, lifetime-interest / amortization calcs and accelerated-payoff
   surface are the units The Garage (auto_debt) and The Cellar (heloc) import — so the gate
   is built to grow, commit by commit (C1..C5).
   Doctrine (Captain #237-#240): richest LIVE hover wins (L51); assert the winner literal in
   the SERVED bytes via the real openAccountModal path. RED-FIRST: `--redfirst` flips winners
   to their pre-wire losers -> those strings are ABSENT -> gate BITES (RED). Normal -> GREEN.
   Usage: serve repo root on :8001, then node scripts/_gate_moat_winners.js [LABEL] [--redfirst]. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
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
    // Seed a Real-Estate asset AND a Vehicle asset so the mortgage link dropdown has BOTH
    // families to (mis)offer — the §0.2 link-scoping bite needs the Vehicle present.
    addInstance('property');
    const propAcc = window.state.accounts.filter(x => x.baseId === 'property').pop();
    if (propAcc) propAcc.value = 500000;
    addInstance('auto');
    addInstance('savings');                                        // §5.3 accel-source candidate (liquid)
    const savAcc = window.state.accounts.filter(x => x.baseId === 'savings').pop();
    const out = {};
    out.mBlank = grab('mortgage_joint');
    out.mFill = grab('mortgage_joint', {
      value: 300000, origAmount: '400000', intRate: 6, rateType: 'Variable',
      minPmt: '2000', addPmt: '500', nextPmtDate: '2026-08-01',
      propTaxAnnual: '6000', insAnnual: '2400', pmiMonthly: '150',
      rateIndex: 'SOFR', rateMargin: 2.5, rateResetDate: '2027-01-01', capPeriodic: 2, capLifetime: 5,
      isPriority: true, linkedAssetId: (propAcc ? propAcc.id : null), accelSourceId: (savAcc ? savAcc.id : null)
    });
    // A non-mortgage secured debt (auto) to confirm the scope seam is per-family, not global.
    addInstance('auto_debt_joint');
    out.aBlank = grab('auto_debt_joint');
    // §4.4/§7 amortization modal — CLICK the real button (not a direct call) to catch binding AND the
    // z-index/visibility bug (Captain smoke: button did nothing = overlay behind the account modal).
    const morts = window.state.accounts.filter(x => x.baseId === 'mortgage_joint');
    const clickAmort = (acc) => {
      window.openAccountModal(acc.id);
      var btn = Array.from(document.querySelectorAll('#modal-dynamic-content button')).find(x => x.textContent.indexOf('VIEW AMORTIZATION') >= 0);
      if (!btn) return { found: false, html: '', z: 0, disp: 'none' };
      btn.click();
      var ov = document.getElementById('amort-modal-overlay');
      var cs = ov ? getComputedStyle(ov) : null;
      return { found: true, html: ov ? ov.innerHTML : '', z: cs ? (parseInt(cs.zIndex, 10) || 0) : 0, disp: cs ? cs.display : 'none' };
    };
    var af = clickAmort(morts[morts.length - 1]);
    out.amortFill = af.html; out.amortBtnFound = af.found; out.amortZ = af.z; out.amortDisp = af.disp;
    var acctOv = document.getElementById('account-modal-overlay');
    out.acctZ = acctOv ? (parseInt(getComputedStyle(acctOv).zIndex, 10) || 0) : 0;
    out.amortBlank = clickAmort(morts[0]).html;
    // TOOLTIP CLIP CHECK — reopen the filled mortgage and measure each RIGHT-COLUMN field's tooltip
    // against the modal card's right edge (the card is overflow:auto, so an overflowing tt is clipped).
    window.openAccountModal(morts[morts.length - 1].id);
    var _card = document.getElementById('modal-dynamic-content').closest('.modal-card');
    var _cardRight = _card ? _card.getBoundingClientRect().right : 0;
    // RE-TRUED 2026-07-25: the right-column SET changed (§20.4 swapped PMI/insurance, §20 added Coverage
    // Amount and Term (months)). 'Annual Insurance' hasn't existed since §18.2 and moved to the LEFT column
    // in §20.4, so this list was testing a field that couldn't be found — it scored a clip failure forever.
    // These are the fields that actually sit in the right column today.
    out.ttClip = ['Rate Type', 'Maturity Date', 'Additional Payment', 'Term (months)', 'PMI (yr)', 'Coverage Amount'].map(function (txt) {
      var wrap = Array.from(document.querySelectorAll('#modal-dynamic-content .modal-tt-wrap')).find(function (w) { return w.textContent.indexOf(txt) >= 0; });
      var tt = wrap ? wrap.querySelector('.modal-tt') : null;
      if (!tt) return { f: txt, found: false, overflow: 9999 };
      var r = tt.getBoundingClientRect();
      return { f: txt, found: true, overflow: Math.round(r.right - _cardRight) };
    });
    // §5.3 Outflow read — set a salary, run the REAL diagnostic (#measure-btn), capture its text.
    try { document.getElementById('pri-salary').value = '$500,000'; document.getElementById('measure-btn').click(); } catch (e) {}
    var _tb = document.getElementById('analysis-text-body');
    out.diag = _tb ? _tb.innerHTML : '';
    // §1 DI underwater branch — a mortgage whose balance exceeds its linked property value. Added LAST so
    // it can't become the biggest-debt / last-mortgage and perturb the amort/Outflow captures above.
    out.mUnder = grab('mortgage_joint', { value: 600000, intRate: 5, minPmt: '3000', linkedAssetId: (propAcc ? propAcc.id : null) });
    // Captain's math test loan — $17k left, 3.99% APR, $850/mo (min only). True amortized interest = $621.
    out.mCap = grab('mortgage_joint', { value: 17000, intRate: 3.99, minPmt: '850' });
    // §1.7-1.9 band fixtures: mNear = 96% paid, 4% (LOW), +$25 saves <2mo (barely-matters + income-relief);
    // mMid2 = 5% (MID rate band), +$200 saves 11mo (2-11 band).
    out.mNear = grab('mortgage_joint', { value: 15000, origAmount: '400000', intRate: 4, minPmt: '800', addPmt: '25' });
    out.mMid2 = grab('mortgage_joint', { value: 50000, origAmount: '60000', intRate: 5, minPmt: '1000', addPmt: '200' });
    // FIX-A term-derived life-of-loan fixtures: m30 (30yr, not paid down), m20refi (Captain's exact 20yr
    // refi, paid down — life vs remaining differ ~$95.7k), mStub (paid down, NO dates -> remaining-only).
    out.m30 = grab('mortgage_joint', { value: 380000, origAmount: '400000', intRate: 6, origDate: '2020-01-01', maturityDate: '2050-01-01', minPmt: '2400' });
    out.m20refi = grab('mortgage_joint', { value: 17500, origAmount: '212111', intRate: 3.99, origDate: '2012-01-01', maturityDate: '2032-01-01', minPmt: '1284', addPmt: '100', nextPmtDate: '2026-08-01' });
    out.mStub = grab('mortgage_joint', { value: 17500, origAmount: '212111', intRate: 3.99, minPmt: '1284' });
    // RE-TRUED 2026-07-25 — §18.9 changed the PMI-dropoff RULE: it no longer fires on pmi>0, it fires when
    // equity is still under 20% of the linked property's value (_moatPmiUnder20). mFill is 300k on a 500k
    // home = 40% equity, so the clause is CORRECTLY silent there — the old assertion was testing a rule the
    // room no longer has. This fixture is genuinely under 20% (450k on 500k = 10%) so the clause can be
    // tested where it should fire, and mFill now tests that it stays quiet where it shouldn't.
    out.mPmi = grab('mortgage_joint', { value: 450000, intRate: 5, minPmt: '2500', pmiMonthly: '150',
                                        propTaxAnnual: '6000', linkedAssetId: (propAcc ? propAcc.id : null) });
    return out;
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  // RE-TRUED 2026-07-25 — §19.5 wrapped every $ figure in a semantic colour span (.di-n-red/teal/gold), so
  // a DI sentence is no longer contiguous in raw innerHTML: "guaranteed 6%" is really
  // `guaranteed <span class="di-n-gold">6%</span>`. Roughly a dozen assertions below were failing on prose
  // that renders perfectly — they were reading markup, not the sentence. T.* is what the USER actually
  // reads: inline spans dropped with NO space (so "$25" + "/mo" rejoins as "$25/mo"), every other tag
  // becomes a space, whitespace collapsed. Structural checks (classes, value=, display:none) keep using the
  // raw capture; prose checks use T.
  const txt = (s) => typeof s !== 'string' ? '' :
    s.replace(/<\/?span[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const T = {}; Object.keys(R).forEach(k => { if (typeof R[k] === 'string') T[k] = txt(R[k]); });
  // The link control lists assets by TITLE inside its picker section; scope the scoping assertions to that
  // region so they can't pass on the word appearing somewhere else in the modal.
  const linkRegion = (s) => { const i = (s || '').indexOf('LINK AN EXISTING'); return i < 0 ? '' : s.slice(i, i + 1500); };
  // Escrow row visibility: the "with escrow" line is display-toggled (sourced-or-blank).
  const escrowState = (s) => { var i = (s || '').indexOf('modal-escrow-foot-'); if (i < 0) return 'absent'; var w = s.slice(i, i + 90); return w.indexOf('display:block') >= 0 ? 'shown' : (w.indexOf('display:none') >= 0 ? 'hidden' : 'unknown'); };
  let pass = 0, fail = 0; const lines = [];
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }
  const pick = (win, lose) => RF ? lose : win;

  // ===== C1 · §0.2 LINK-SCOPING FIX (mortgage -> property* only) =====
  lines.push('===== C1 · §0.2 LINK SCOPING =====');
  // RE-TRUED 2026-07-25 — §18.3 consolidated the link control: the old "Map to: <Room> (<Meta>)" line is
  // gone, replaced by a picker ("Link or draft a property…" -> "LINK AN EXISTING PROPERTY" -> asset titles).
  // ⚠️ The two [BITE] lines here were passing VACUOUSLY: they asserted the ABSENCE of "(The Driveway)" /
  // "(The Grounds)", strings the room stopped emitting entirely — so they were true no matter how badly the
  // scoping broke. Re-pointed at the picker region and the titles it actually renders, so they test scoping
  // again rather than testing nothing.
  ok(has(linkRegion(R.mBlank), 'Real Estate'), 'Mortgage link lists Real Estate (The Grounds)');
  ok(pick(!has(linkRegion(R.mBlank), 'Vehicle'), has(linkRegion(R.mBlank), 'Vehicle')), 'Mortgage link EXCLUDES Vehicle (The Driveway) [BITE]');
  ok(has(linkRegion(R.aBlank), 'Vehicle'), 'Auto-debt link lists Vehicle (The Driveway)');
  ok(pick(!has(linkRegion(R.aBlank), 'Real Estate'), has(linkRegion(R.aBlank), 'Real Estate')), 'Auto-debt link EXCLUDES Real Estate (The Grounds) [BITE]');

  // ===== C1 · §0.5 TOGGLE RENAME (Demolition -> Accelerated Payoff) =====
  lines.push('===== C1 · §0.5 TOGGLE RENAME =====');
  ok(pick(has(R.mBlank, 'Accelerated Payoff</strong>Marks this loan as a priority target'),
          has(R.mBlank, 'Target For Demolition')), 'Toggle tooltip = Accelerated Payoff (not Demolition) [BITE]');
  ok(pick(!has(R.mBlank, 'Target For Demolition'), true), 'Old "Target For Demolition" string ABSENT');
  ok(has(R.mBlank, 'Target for Accelerated Payoff'), 'Header label "Target for Accelerated Payoff" LOCKED (stays)');

  // ===== C2/C4d · §0.3/§0.3b LABELED ESCROW SECTION (mortgage-only; footer sourced-or-blank) =====
  lines.push('===== C2/C4d · ESCROW SECTION =====');
  ok(has(R.mBlank, '🏦 Escrow — the monthly bundle') && has(R.mBlank, 'Escrow is the slice of your monthly payment'), 'Labeled section header + plain-coach definition render for Mortgage');
  // RE-TRUED 2026-07-25 — the escrow labels were renamed twice since Wave-1: §18.2 (D1 unification) and
  // §20.4/§20.7. 'Annual Property Taxes' / 'Annual Insurance' have not existed for two arcs. These are the
  // authored labels the room renders in its DEFAULT (annual) view today.
  ok(has(R.mBlank, 'Property Tax (yr)') && has(R.mBlank, 'Annual Homeowner Insurance') && has(R.mBlank, 'PMI (yr)') && has(R.mBlank, 'Other (yr)'), 'Escrow fields grouped under the section (§20.7 /yr labels)');
  ok(pick(!has(R.aBlank, '🏦 Escrow'), has(R.aBlank, '🏦 Escrow')), 'Escrow section ABSENT for Auto-debt (mortgage-only gate) [BITE]');
  ok(has(R.mFill, 'real all-in payment is $3,350/mo'), 'Computed footer all-in = $3,350/mo (2500 P&I + 850 escrow)');
  // RE-TRUED 2026-07-25 — §18.9 changed the RULE, not just the wording: the dropoff clause now fires on
  // equity < 20% of the linked home (_moatPmiUnder20), not merely on pmi>0. Tested BOTH ways now, which is
  // stronger than the assertion it replaces: it must speak at 10% equity and stay silent at 40%.
  ok(has(T.mPmi, 'PMI drops off once you cross ~20% equity'), 'PMI-dropoff clause FIRES under 20% equity (450k on 500k)');
  ok(pick(!has(T.mFill, 'PMI drops off once you cross'), has(T.mFill, 'PMI drops off once you cross')), 'PMI-dropoff clause SILENT at 40% equity (mFill) [BITE]');
  ok(escrowState(R.mFill) === 'shown', 'Escrow footer SHOWN when escrow set');
  ok(pick(escrowState(R.mBlank) === 'hidden', escrowState(R.mBlank) === 'shown'), 'Escrow footer HIDDEN when blank (sourced-or-blank) [BITE]');
  ok(has(R.mFill, 'value="$6,000"'), 'Property-tax input round-trips $6,000 (sanitized store)');

  // ===== C3 · §0.4/§5.1 VARIABLE-RATE CLUSTER (shared; Fixed/blank hides) =====
  lines.push('===== C3 · §0.4 VARIABLE-RATE CLUSTER =====');
  ok(has(R.mFill, 'Rate Index') && has(R.mFill, 'Margin %') && has(R.mFill, 'Periodic Cap %') && has(R.mFill, 'Lifetime Cap %') && has(R.mFill, 'Next Reset Date'), 'Cluster REVEALED (all 5 fields) when rateType=Variable');
  ok(pick(!has(R.mBlank, 'Rate Index') && !has(R.mBlank, 'Periodic Cap %'), has(R.mBlank, 'Rate Index')), 'Cluster HIDDEN on Fixed/blank [BITE]');
  ok(has(R.mFill, 'value="SOFR"'), 'rateIndex persists+round-trips (SOFR)');
  ok(has(R.mFill, 'value="2.5"'), 'rateMargin persists+round-trips (2.5)');

  // ===== C4a · §4.2/§4.3/§4.4/§7 PAYOFF INTELLIGENCE + AMORTIZATION =====
  lines.push('===== C4a · PAYOFF INTELLIGENCE + AMORT =====');
  ok(has(R.mFill, 'Interest Remaining') && has(R.mFill, '$159,291'), 'Interest remaining = $159,291 (exact amortized, 2500/mo)');
  ok(has(R.mFill, 'Remaining Mortgage Cost') && has(R.mFill, '$459,291'), 'Remaining mortgage cost = $459,291 (balance + remaining interest) [§20.6 rename]');
  ok(has(R.mFill, 'Interest Saved') && has(R.mFill, '$96,612'), 'Accelerated interest saved = $96,612 (exact, vs minimum-only)');
  ok(has(R.mFill, "kept out of the bank's pocket"), '§5.4 tradeoff caption present (toggle ON)');
  ok(pick(!has(R.mBlank, 'Lifetime Interest'), has(R.mBlank, 'Lifetime Interest')), 'Lifetime interest OMITTED when no payment (sourced-or-blank) [BITE]');
  ok(has(R.mFill, '📊 VIEW AMORTIZATION SCHEDULE'), 'Amortization button present');
  ok(has(R.mFill, 'December 2041'), 'Expected Payoff Date non-breaking (Dec 2041 at $2,500/mo)');
  ok(R.amortBtnFound && has(R.amortFill, 'Amortization Schedule') && has(R.amortFill, 'Principal') && has(R.amortFill, 'Interest'), 'Amort button CLICK renders brand table (filled)');
  ok(R.amortDisp === 'flex', 'Amort overlay is display:flex after click');
  ok(pick(R.amortZ > R.acctZ, R.amortZ < R.acctZ), 'Amort overlay z-index ABOVE account modal (' + R.amortZ + ' > ' + R.acctZ + ') [BUG-1 FIX/BITE]');
  ok(pick(has(R.amortBlank, 'Add a balance, rate, and payment'), !has(R.amortBlank, 'Add a balance, rate, and payment')), 'Amort empty-guard when unpayable (blank) [BITE]');
  // §3b (Captain ruling #430) — the position pie moved OUT of the overlay onto the modal body, above the
  // schedule button. Held at whole-room level from BOTH ends so a future tidy-up cannot quietly send it back.
  ok(has(R.mFill, 'WHERE THIS LOAN STANDS') && has(R.mFill, '<svg'), '§3b debt pie renders on the modal BODY by default');
  ok(R.mFill.indexOf('WHERE THIS LOAN STANDS') < R.mFill.indexOf('VIEW AMORTIZATION SCHEDULE'), '§3b pie sits ABOVE the schedule button');
  ok(pick(!has(R.amortFill, 'WHERE THIS LOAN STANDS'), has(R.amortFill, 'WHERE THIS LOAN STANDS')), '§3b pie NO LONGER in the amortization overlay [BITE]');

  // ===== C4b · §5.3 ACCEL-SOURCE DROPDOWN + OUTFLOW READ =====
  lines.push('===== C4b · §5.3 ACCEL SOURCE =====');
  ok(has(R.mFill, 'Fund the acceleration from') && has(R.mFill, 'Savings (The Safe)'), 'Source dropdown present (priority ON) + lists liquid Savings');
  ok(has(R.mFill, 'Savings (The Safe)</option>') || has(R.mFill, 'selected>Savings (The Safe)'), 'accelSourceId round-trips (Savings selected)');
  ok(pick(!has(R.mBlank, 'Fund the acceleration from'), has(R.mBlank, 'Fund the acceleration from')), 'Source dropdown ABSENT when priority OFF [BITE]');
  ok(has(R.diag, 'Priority Engaged'), 'Outflow diagnostic fires the priority clause');
  ok(pick(has(R.diag, 'sourced from Savings'), !has(R.diag, 'sourced from Savings')), 'Outflow diagnostic NAMES the chosen source [BITE]');

  // ===== C8 · §1.7-1.9 PRESCRIPTIVE DI (rate-aware tension · accelerator honesty · income relief) =====
  lines.push('===== C8 · §1.7-1.9 PRESCRIPTIVE DI =====');
  // 1.7 rate-aware accelerate-vs-invest — three rate bands, never picks a side
  // RE-TRUED 2026-07-25 — the §1.7/§1.8/§1.9 COPY is unchanged and correct; these were failing purely on the
  // §19.5 colour spans splitting the sentences in raw HTML. Same literals, read off the rendered text (T.*).
  ok(has(T.mCap, 'guaranteed 3.99%') && has(T.mCap, 'invested dollars have historically out-earned it'), '§1.7 LOW band (<5% fixed): peace-of-mind framing');
  ok(has(T.mFill, 'guaranteed 6%') && has(T.mFill, 'paying it down is a strong, certain win'), '§1.7 HIGH/VARIABLE band (>=6% or Variable): certain win');
  ok(has(T.mMid2, 'guaranteed 5%') && has(T.mMid2, 'sits right on the fence'), '§1.7 MID band (5-6%): fence');
  // 1.8 accelerator honesty — three monthsSaved bands, fires only when addPmt>0
  ok(has(T.mFill, 'is doing real work') && has(T.mFill, 'about 8 years') && has(T.mFill, 'saves $96,612 in interest'), '§1.8 >=12mo band (BOTH: years + interest)');
  ok(has(T.mNear, "this loan's nearly paid off, so that extra $25/mo moves payoff in by about 1 months and saves only $16 in interest"), '§1.8 <2mo + >=85% paid band (BOTH numbers, no adjective-only)');
  ok(has(T.mMid2, 'trims your payoff by about 11 months and saves $1,151 in interest'), '§1.8 2-11mo band (BOTH: 11 months + interest)');
  ok(pick(!has(T.mCap, 'trims your payoff') && !has(T.mCap, 'is doing real work'), has(T.mCap, 'is doing real work')), '§1.8 SILENT when no additional payment [BITE]');
  // 1.9 paid-off -> required-income drop — fires only when payoffPct >= 85%, dollar insight (no cross-room %)
  ok(has(T.mNear, 'disappears from your required monthly income') && has(T.mNear, 'the $825/mo it takes') && has(T.mNear, 'biggest levers you have on the income'), '§1.9 income-relief clause (near payoff)');
  ok(pick(!has(T.mFill, 'disappears from your required monthly income'), has(T.mFill, 'disappears from your required monthly income')), '§1.9 SILENT when payoffPct < 85% (mFill 25% paid) [BITE]');

  // ===== FIX-A · §1.4 LIFE-OF-LOAN vs REMAINING (term-derived; two framings never conflated) =====
  lines.push('===== FIX-A · §1.4 LIFE vs REMAINING =====');
  // RE-TRUED 2026-07-25 — §19.5 (R178/R179) REPHRASED this pair and deliberately DE-EMPHASISED life-of-loan
  // into a parenthetical "theoretical figure" aside, because the forward figure is the one you can act on.
  // The MATH is untouched: every figure below ($463,353 · $374,818 · $96,105 · $408 · $439) is the same
  // number the Wave-1 gate demanded. Re-grounded to the current sentences; the invariant under test is
  // unchanged — life and remaining are BOTH present, distinct, and never conflated (#379 two bases).
  ok(has(T.m30, 'the interest runs about $463,353 all-in') && has(T.m30, 'a theoretical figure'), 'm30 life-of-loan line (term=360 derived, not hardcoded)');
  ok(has(T.m30, "From here to payoff, about $374,818 of what's ahead goes to interest"), 'm30 remaining line (distinct from life)');
  ok(has(T.m20refi, 'the interest runs about $96,105 all-in'), 'm20refi life = $96,105 (Captain test, term=240 refi)');
  ok(has(T.m20refi, "You're 92% paid down — only $17,500 left of the original $212,111") &&
     has(T.m20refi, "From here to payoff, about $408 of what's ahead goes to interest"), 'm20refi remaining line (paid-down, +$100/mo -> $408)');
  ok(has(T.m20refi, '$96,105') && has(T.m20refi, '$408'), 'm20refi shows BOTH life ($96,105) AND remaining ($408) — differ ~$95.7k');
  // FIX-1 · §1.3 aheadClause names the MINIMUM-ONLY baseline date it beats (not the already-accelerated date)
  ok(has(T.m20refi, "sooner than the October 2027 you'd hit paying the minimum alone"), '§1.3 names min-only baseline date (October 2027) it beats');
  ok(pick(has(T.m20refi, 'sooner than the') && !has(T.m20refi, 'pulls that in sooner'), has(T.m20refi, 'pulls that in sooner')), '§1.3 uses "sooner than the" NOT old "pulls that in sooner" [BITE]');
  ok(pick(!has(T.mStub, 'full original life'), has(T.mStub, 'full original life')), 'mStub (no dates) OMITS life line (L47 sourced-or-blank) [BITE]');
  ok(has(T.mStub, "From here to payoff, about $439 of what's ahead goes to interest"), 'mStub shows remaining line alone');

  // ===== C6 · REMAINING-INTEREST MATH (exact amortized sum, not ceil-formula) =====
  lines.push('===== C6 · REMAINING-INTEREST MATH =====');
  ok(pick(has(R.mCap, 'Interest Remaining') && has(R.mCap, '$621'), has(R.mCap, 'Interest Remaining') && !has(R.mCap, '$621')), 'Test loan 17k/3.99%/850 -> interest remaining = $621 (exact) [BITE]');
  ok(!/Interest Remaining[\s\S]{0,240}\$850/.test(R.mCap), 'Interest Remaining is NOT $850 (the old ceil-formula overstate = the payment)');

  // ===== C7 · TOOLTIP CLIP FIX (right-column hovers open leftward) =====
  lines.push('===== C7 · TOOLTIP CLIP FIX =====');
  (R.ttClip || []).forEach(function (t) {
    ok(pick(t.found && t.overflow <= 2, t.found && t.overflow > 2), '"' + t.f + '" tooltip within modal card (overflow ' + t.overflow + 'px) [BITE]');
  });

  // ===== C5c · §1 DATUM INTELLIGENCE STRIP (composed, sourced-or-blank) =====
  lines.push('===== C5c · §1 DI STRIP =====');
  // RE-TRUED 2026-07-25 — §19.4c replaced the bespoke inline DI box with the shared .di-narrative chrome, so
  // the header is now "Datum Intelligence" (CSS uppercases it) inside class="di-narrative". Per the §19.4
  // doctrine, assert the RENDERED CLASS, not just the heading text.
  ok(has(R.mFill, 'class="di-narrative"') && has(T.mFill, 'Datum Intelligence'), 'DI box renders on Mortgage (.di-narrative chrome)');
  ok(pick(!has(R.aBlank, 'modal-moat-di-'), has(R.aBlank, 'modal-moat-di-')), 'DI box ABSENT on Auto-debt (mortgage-only) [BITE]');
  ok(has(T.mFill, "You're 25% paid down — only $300,000 left of the original $400,000"), '§1.1 balance-vs-original clause (25% paid)');
  // §1.2 RE-GROUNDED 2026-07-25 (Architect ruling #429). §19.5 (R178) cut "This loan runs X% APR" as
  // redundant with the field above it — that stays cut — but the Variable half went with it, so the DI had
  // stopped saying a variable rate can MOVE. The Variable half only is restored (_moatRateMoves); the guard
  // below no longer hunts a ghost. Deep coverage (Fixed / untouched-select / blank-rate) lives in
  // scripts/_gate_407_1_2_variable_rate.mjs; here we hold the WHOLE-ROOM line.
  ok(has(T.mFill, 'Heads up — this is a variable rate, so it can move at the next reset. Watch the reset date.'),
     '§1.2 variable-rate move beat renders on a Variable mortgage');
  ok(pick(!has(T.mCap, 'this is a variable rate'), has(T.mCap, 'this is a variable rate')),
     '§1.2 beat ABSENT when rateType is untouched (default-select trap) [BITE]');
  ok(!/This loan runs [\d.]+% APR/.test(T.mFill), '§19.5 ① stays cut — no APR restatement came back with it');
  ok(has(T.mFill, 'mortgage-free around December 2041') && has(T.mFill, "about 94 months sooner than the October 2049 you'd hit paying the minimum alone"), '§1.3 payoff clock + baseline-date ahead clause');
  ok(has(T.mFill, "From here to payoff, about $159,291 of what's ahead goes to interest"), '§1.4 remaining-only clause (mFill has no dates -> life line omitted)');
  ok(has(T.mFill, 'Against The Grounds ($500,000), your equity here is $200,000. You own more than you owe'), '§1.5 equity clause (above water)');
  ok(has(T.mFill, 'your real monthly is $3,350'), '§1.6 escrow-load clause');
  ok(has(T.mUnder, 'Underwater — you owe more than it'), '§1.5 underwater branch (balance > property value)');
  ok(pick(has(R.mBlank, 'Datum reads it back'), !has(R.mBlank, 'Datum reads it back')), 'DI empty-state prompt when no inputs (sourced-or-blank) [BITE]');

  // ===== C5b · §2 PER-FIELD HOVERS (mortgage-only; variable-cluster hover universal) =====
  lines.push('===== C5b · §2 FIELD HOVERS =====');
  ok(has(R.mBlank, 'What you still owe') && has(R.mBlank, 'the biggest lever on lifetime cost'), '§2 Balance + APR hovers present');
  ok(has(R.mBlank, 'goes straight at principal') && has(R.mBlank, 'Usually escrowed into your monthly payment'), '§2 Additional-Payment + Property-Taxes hovers present');
  // RE-TRUED 2026-07-25 — §18.8 DE-GROUPED the one shared "How a variable rate moves" explainer into FIVE
  // per-field hovers (Mortgage Copy Bank R142–147). That is the richer surface, so under L51
  // (richest-hover-wins) the new winners are the five titles; the old single explainer is the loser.
  ok(has(R.mFill, 'The benchmark you track') && has(R.mFill, 'The lender’s fixed add-on') &&
     has(R.mFill, 'The most it can jump at once') && has(R.mFill, 'The ceiling over the whole loan') &&
     has(R.mFill, 'When the rate can change next'), '§2 variable-cluster: five per-field hovers (§18.8 de-grouped)');
  ok(pick(!has(R.mFill, 'How a variable rate moves'), has(R.mFill, 'How a variable rate moves')), '§2 old single variable explainer GONE (L51 loser) [BITE]');
  ok(pick(!has(R.aBlank, 'What you still owe'), has(R.aBlank, 'What you still owe')), '§2 field hovers ABSENT on Auto-debt (mortgage-only) [BITE]');

  // ===== C5a · §3a HEADER HOVER + §15 EDUCATION (mortgage-only, verbatim) =====
  lines.push('===== C5a · §3a HEADER + §15 EDUCATION =====');
  ok(has(R.mBlank, 'The debt that guards the house'), '§3a header hover present on Mortgage title');
  ok(pick(!has(R.aBlank, 'The debt that guards the house'), has(R.aBlank, 'The debt that guards the house')), '§3a header hover ABSENT on Auto-debt (mortgage-only) [BITE]');
  ok(has(R.mBlank, 'Should you pay it down, or invest the difference?') && has(R.mBlank, 'Datum shows you both numbers and both truths'), '§15 education panel present (verbatim)');
  ok(pick(has(R.mBlank, 'paying it down is a guaranteed 8% return with zero risk'), !has(R.mBlank, 'paying it down is a guaranteed 8% return with zero risk')), '§15 symmetric high-8% clause present (Fix 2) [BITE]');
  ok(pick(!has(R.aBlank, 'Should you pay it down, or invest the difference?'), has(R.aBlank, 'Should you pay it down, or invest the difference?')), '§15 education ABSENT on Auto-debt [BITE]');

  lines.push('-------------------------------------');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped to losers — MUST be RED)' : 'NORMAL') + '   |   STAGE: C10 (+ §1.3 baseline-date + §15 high-rate) — WHOLE ROOM');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const caps = [R.mBlank, R.mFill, R.aBlank, R.mUnder, R.mCap, R.mNear, R.mMid2, R.m30, R.m20refi, R.mStub, R.mPmi];
  const guard = caps.every(s => !has(s, 'undefined') && !has(s, 'NaN') && !has(s, '__'));
  lines.push('render-guard (no undefined/NaN/__): ' + guard);
  if (!guard) fail++;

  const summary = '[' + LABEL + '] MOAT WINNER GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.writeFileSync('scripts/_gate_moat_winners.out.txt', summary, 'utf8');
  console.log(summary);
  process.exit(fail === 0 ? 0 : 1);
})();
