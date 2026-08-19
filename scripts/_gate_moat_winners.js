/* L52 WHOLE-ROOM WINNER GATE — Mortgage "The Moat" (mortgage_joint / _primary / _co).
   The REUSABLE SECURED-DEBT TEMPLATE room (L48): its link-scope seam, escrow block,
   variable-rate cluster, lifetime-interest / amortization calcs and accelerated-payoff
   surface are the units The Garage (auto_debt) and The Cellar (heloc) import — so the gate
   is built to grow, commit by commit (C1..C5).
   Doctrine (Captain #237-#240): richest LIVE hover wins (L51); assert the winner literal in
   the SERVED bytes via the real openAccountModal path. RED-FIRST: `--redfirst` flips winners
   to their pre-wire losers -> those strings are ABSENT -> gate BITES (RED). Normal -> GREEN.
   Usage: serve repo root on :8001, then
     node scripts/_gate_moat_winners.js [LABEL] [--redfirst] [--clock=YYYY-MM-DD]

   ⏱️ --clock PINS THE BROWSER'S WALL CLOCK, AND IT EXISTS BECAUSE THIS GATE SHIPPED A CALENDAR
   BOMB ONCE. dac1610 (2026-08-03) made nextPmtDate RELATIVE and left two expectations spelled
   ABSOLUTELY ('December 2041' / 'October 2049'). They agreed BY LUCK for fifteen days and both
   rolled a month on 2026-08-18 — RED 106/108, with the GAP BETWEEN THEM UNMOVED, which is the
   signature of a relative claim asserted in absolute spelling.
   🔑 A FIX THAT MAKES AN INPUT RELATIVE MUST MAKE EVERY ASSERTION THAT READS THAT INPUT RELATIVE,
      IN THE SAME COMMIT. The sweep swept the inputs and not the assertions.
   ⛔ AND DO NOT "FIX" THE NEXT ONE BY FREEZING THE ANCHOR — that undoes what dac1610 deliberately
      thawed and stops exercising the rateResetDate branch. Re-pinning a later month is the same
      bomb with a longer fuse.

   ⛔⛔ A REPAIR THAT WAS ITSELF A BOMB, STRUCK ON MEASUREMENT AND LEFT HERE RATHER THAN DELETED
   (Architect-authored, Wirer-measured, Architect-struck 2026-08-19). The first specified repair was
   ~~"assert the payoff as a constant offset from the anchor month"~~ and its fallback was
   ~~"assert the two printed dates are exactly N months apart"~~. BOTH ARE BOMBS. _payoffDateFrom
   (studio.html:12962) advances the anchor with setMonth, which DAY-OVERFLOWS. Measured over ten
   years of today+14d anchors, every day: THE OFFSET FORM WOULD RED ON 58 DAYS A DECADE AND THE GAP
   FORM ON 56. 🔑 A TOLERANCE NOBODY RULED IS A DEFECT WITH PERMISSION — so the anchor was made
   overflow-proof instead (see the fixture below) and the legs assert EXACTLY.
   ⭐ A GUARD THAT MAKES A CLASS UNREACHABLE BEATS A TOLERANCE THAT DESCRIBES IT.

   ⭐ THE MATRIX THAT ACCEPTED THIS REPAIR — RUN IT BEFORE TOUCHING ANY §1.3 LEG:
        --clock=2026-08-17 (last green day) · --clock=2026-08-18 (the day it broke)
        --clock=2026-12-17 (anchor on a 31st) · --clock=2027-06-15
      each GREEN on every leg, and each RED under --redfirst. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = (process.argv[2] && process.argv[2].charAt(0) !== '-') ? process.argv[2] : 'RUN';
const RF = process.argv.includes('--redfirst');
const CLOCK = (process.argv.find((a) => a.startsWith('--clock=')) || '').split('=')[1] || '';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const _ctx = await b.newContext();
  /* setFixedTime, NOT clock.install() — install() also fakes TIMERS, and the Studio's settle path
     depends on them. This moves the calendar and nothing else. */
  if (CLOCK) await _ctx.clock.setFixedTime(new Date(CLOCK + 'T12:00:00'));
  const p = await _ctx.newPage();
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
      // CALENDAR SWEEP 2026-08-03 — these two were FROZEN ('2026-08-01' was already 2 days past,
      // '2027-01-01' under 5 months out). studio.html:9351 renders the reset beat only while
      // rateResetDate > new Date(), so a frozen date silently stops exercising that branch and the
      // fixture tests less than it did while still passing. Relative now — the shape
      // _gate_heloc_variable_18a.mjs:49 already uses. A GATE MUST PRODUCE THE SAME VERDICT ON
      // EVERY DAY OF THE YEAR.
      //
      // ⏱️ STILL RELATIVE, BUT PINNED TO THE FIRST OF THE FOLLOWING MONTH RATHER THAN today+14d,
      // AND THAT IS A MEASUREMENT, NOT A TIDY-UP. _payoffDateFrom (studio.html:12962) advances the
      // anchor with setMonth, which DAY-OVERFLOWS: an anchor on the 31st pushed into a 30-day month
      // rolls into the next one. Measured, ten years of today+14d anchors, every day:
      //     payoff offset from anchor month   184 on 3595 days ·  185 on 58
      //     baseline offset                   278 on 3615 days ·  279 on 38
      //     gap between the two printed dates  94 on 3597 days ·   93 on 38 · 95 on 18
      // Twenty years of first-of-month anchors: 184 / 278 / 94 on all 7305 days, ZERO deviation —
      // overflow is IMPOSSIBLE BY CONSTRUCTION, because every month has a first day.
      // 🔑 THAT IS WHY THE §1.3 LEGS ASSERT EXACTLY AND CARRY NO TOLERANCE. A TOLERANCE NOBODY
      //    RULED IS A DEFECT WITH PERMISSION.
      // ⚠️ BLAST RADIUS, MEASURED BY DIFFING THE RENDER (not the verdicts) at 2026-08-10,
      //    2026-12-17, 2027-06-15: 46 modal + 738 schedule $ amounts IDENTICAL · 20 percentages
      //    IDENTICAL · exactly ONE value="" attribute moves (this field itself, studio.html:8409) ·
      //    the schedule's row LABELS shift one month, which no leg asserts. NOT ONE DOLLAR MOVES.
      //    ⛔ A VERDICT DIFF IS NOT A BLAST RADIUS — the verdicts moved on 2 legs and the render
      //       moved on 187 spans. Only the render diff could say "not one dollar".
      // ⚠️ WHAT IT COSTS, RECORDED SO NOBODY REDISCOVERS IT AS A BUG: this fixture no longer
      //    exercises the day-overflow path. It never asserted it. AND THE PRODUCT REALLY DOES DO
      //    THIS: on 76 days a decade the room prints "about 94 months sooner than <date>" with the
      //    two dates 93 or 95 apart. Hedged by "about", one month on an eight-year claim —
      //    LOGGED, NOT CHASED, AND DELIBERATELY NOT ABSORBED INTO A TOLERANCE HERE. A defect that
      //    is legitimately not worth fixing must still be LEGIBLE, or the next wirer finds it cold
      //    and opens an investigation into working arithmetic.
      minPmt: '2000', addPmt: '500',
      nextPmtDate: (function () { var n = new Date(), d = new Date(n.getFullYear(), n.getMonth() + 1, 1),
        p2 = function (x) { return x < 10 ? '0' + x : '' + x; };
        return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); })(),
      propTaxAnnual: '6000', insAnnual: '2400', pmiMonthly: '150',
      rateIndex: 'SOFR', rateMargin: 2.5, rateResetDate: new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10), capPeriodic: 2, capLifetime: 5,
      isPriority: true, linkedAssetId: (propAcc ? propAcc.id : null), accelSourceId: (savAcc ? savAcc.id : null)
    });
    // A non-mortgage secured debt (auto) to confirm the scope seam is per-family, not global.
    addInstance('auto_debt_joint');
    out.aBlank = grab('auto_debt_joint');
    // §4.4/§7 amortization modal — CLICK the real button (not a direct call) to catch binding AND the
    // z-index/visibility bug (Captain smoke: button did nothing = overlay behind the account modal).
    const morts = window.state.accounts.filter(x => x.baseId === 'mortgage_joint');
    // §20.2 split the single button into COMPLETE (from inception) + REMAINING (from today). Click by label so
    // BOTH schedules are exercised through the real DOM, not just the composer.
    const clickAmort = (acc, label) => {
      window.openAccountModal(acc.id);
      var btn = Array.from(document.querySelectorAll('#modal-dynamic-content button')).find(x => x.textContent.indexOf(label || 'VIEW REMAINING') >= 0);
      if (!btn) return { found: false, html: '', z: 0, disp: 'none' };
      btn.click();
      var ov = document.getElementById('amort-modal-overlay');
      var cs = ov ? getComputedStyle(ov) : null;
      return { found: true, html: ov ? ov.innerHTML : '', z: cs ? (parseInt(cs.zIndex, 10) || 0) : 0, disp: cs ? cs.display : 'none' };
    };
    var af = clickAmort(morts[morts.length - 1]);
    out.amortFill = af.html; out.amortBtnFound = af.found; out.amortZ = af.z; out.amortDisp = af.disp;
    // §20.2 — the undated fixture must show the field-naming nudge, not an empty overlay (§19.9b precedent).
    // mFill deliberately carries no origDate/maturityDate; that is what makes it the remaining-only fixture.
    out.amortCompleteUndated = clickAmort(morts[morts.length - 1], 'VIEW COMPLETE').html;
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
    /* THE TAX RATE IS STATED, AND IT HAS TO BE. The outflow diagnostic derives from freeCashFlow,
       which derives from the effective tax rate; as of 2026-08-15 an UNSTATED rate suppresses that
       whole section rather than silently assuming 22% (a hidden default is a fabricated answer that
       hides where it came from). This fixture never stated one, so it was relying on that hidden
       default — a fixture describing a user who never chose a bracket yet receives advice computed
       from one. Fixture strengthened; the assertions are untouched. */
    try { document.getElementById('pri-salary').value = '$500,000';
          var _tx = document.getElementById('eff-tax-rate'); if (_tx) _tx.value = '22%';
          document.getElementById('measure-btn').click(); } catch (e) {}
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
    // §20.2 (Commit 7) — the from-inception schedule, opened by its OWN button in the real DOM. Deliberately
    // placed HERE, after the dated fixtures exist: reconstructing from inception needs origDate + a term, and
    // the earlier click block runs before m30/m20refi are created.
    var mDated = window.state.accounts.filter(function (x) { return x.baseId === 'mortgage_joint' && x.origDate && x.maturityDate; }).pop();
    var acc7 = mDated ? clickAmort(mDated, 'VIEW COMPLETE') : { found: false, html: '' };
    out.amortComplete = acc7.html; out.amortCompleteFound = acc7.found;
    // §20.2b — a loan whose 20-yr term ended in 2020 while a balance remains. Carries a SOURCED paid-to-date
    // too, so this fixture also proves the mutual exclusion at whole-room level: §20.2b speaks, §20.2 yields.
    // Created AFTER mDated is resolved so it cannot steal the ordinary from-inception assertions above.
    out.mPastTerm = grab('mortgage_joint', { value: 17500, origAmount: '212111', intRate: 3.99,
      origDate: '2000-01-01', maturityDate: '2020-01-01', minPmt: '1284', interestPaidToDate: '31684.35' });
    // §21 deductibility — the two sourced postures. interestPaidToDate is present on BOTH so the whole-room
    // gate also proves §21.3 reads the LAST-YEAR field and not the since-inception one.
    out.mItemize = grab('mortgage_joint', { value: 300000, origAmount: '400000', intRate: 6, minPmt: '2500',
      interestPaidToDate: '31684.35', mortgageItemizes: 'Itemize', mortgageInterestPaidYr: '9800' });
    out.mStandard = grab('mortgage_joint', { value: 300000, origAmount: '400000', intRate: 6, minPmt: '2500',
      interestPaidToDate: '31684.35', mortgageItemizes: 'Standard', mortgageInterestPaidYr: '9800' });
    var mPast = window.state.accounts.filter(function (x) { return x.baseId === 'mortgage_joint' && x.origDate === '2000-01-01'; }).pop();
    out.amortPastTerm = mPast ? clickAmort(mPast, 'VIEW COMPLETE').html : '';
    out.amortPastTermRemaining = mPast ? clickAmort(mPast, 'VIEW REMAINING').html : '';
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
  /* ── §1.3 · THE PAYOFF CLOCK, READ OUT OF THE CAPTURE ────────────────────────────────────────
   * Both dates are rendered from ONE anchor (the fixture's nextPmtDate), so they are calendar-bound
   * BY CONSTRUCTION and must never be asserted as literals. See the header. */
  const MY = '([A-Z][a-z]+ [12][0-9]{3})';
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIdx = (s) => { if (!s) return null; const q = s.split(' '); const i = MONTHS.indexOf(q[0]);
                            return i < 0 ? null : parseInt(q[1], 10) * 12 + i; };
  const payoffField = (new RegExp('id="modal-calc-payoff-[^"]*"[^>]*>\\s*' + MY + '\\s*<').exec(R.mFill) || [])[1] || null;
  const diPayoff    = (new RegExp('mortgage-free around ' + MY).exec(T.mFill) || [])[1] || null;
  const ahead       = new RegExp('about (\\d+) months sooner than the ' + MY + " you'd hit paying the minimum alone").exec(T.mFill);
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
  ok(has(R.mFill, '📊 VIEW REMAINING SCHEDULE') && has(R.mFill, '📊 VIEW COMPLETE SCHEDULE'), '§20.2 BOTH schedule buttons present (complete + remaining)');
  ok(R.mFill.indexOf('VIEW COMPLETE SCHEDULE') < R.mFill.indexOf('VIEW REMAINING SCHEDULE'), '§20.2 COMPLETE sits to the LEFT of REMAINING');
  ok(pick(!has(R.aBlank, 'VIEW COMPLETE SCHEDULE'), has(R.aBlank, 'VIEW COMPLETE SCHEDULE')), '§20.2 complete button ABSENT on Auto-debt (mortgage-only) [BITE]');
  ok(R.amortCompleteFound && has(T.amortComplete, 'The whole loan, from day one') &&
     has(T.amortComplete, 'an illustration of the contract, not a record of what happened'),
     '§20.2 COMPLETE button CLICK renders the from-inception table under its caption');
  ok(has(T.amortComplete, 'Contract total — what the level schedule implies over the full term, not a paid-to-date'),
     '§20.2a totals label renders in the real overlay');
  ok(has(R.amortFill, 'Totals ·') && has(R.amortComplete, 'Totals ·'), '§20.2 BOTH tables end in a totals row');
  ok(pick(has(T.amortCompleteUndated, 'Add the Origination Date') && !has(R.amortCompleteUndated, '<table'),
          has(R.amortCompleteUndated, '<table')),
     '§20.2 undated loan → the overlay NAMES the missing field instead of an empty table [BITE]');
  // §20.2b (Commit 8) — past-term beat, held at whole-room level in a real browser.
  ok(has(T.amortPastTerm, 'your loan’s term has already come and gone') &&
     has(T.amortPastTerm, 'knows the real finish line'), '§20.2b past-term beat renders on a past-term loan');
  ok(!has(T.amortPastTerm, 'Heads up — this schedule puts about'), '§20.2b WINS the note slot — §20.2 divergence yields (mutual exclusion)');
  ok((R.amortPastTerm.match(/class="amort-diverge"/g) || []).length === 1, '§20.2b exactly ONE note occupies the slot, never two');
  ok(pick(!has(T.amortPastTermRemaining, 'come and gone'), has(T.amortPastTermRemaining, 'come and gone')),
     '§20.2b ABSENT in REMAINING mode (backward fact, forward number) [BITE]');
  ok(has(R.amortPastTerm, 'Contract total — what the level schedule implies'), '§20.2b does not displace the §20.2a totals label');
  // ===== §21 MORTGAGE-INTEREST DEDUCTIBILITY (the Moat's last gap) =====
  lines.push('===== §21 DEDUCTIBILITY =====');
  ok(has(R.mFill, 'Mortgage Interest Paid (last yr)') && has(R.mFill, 'We take the standard deduction'), '§21.4 both sourced inputs render on the Mortgage modal');
  ok(has(T.mItemize, 'Mortgage interest may be deductible') && has(T.mItemize, "mortgage interest doesn't lower their taxes at all"),
     '§21.1 + §21.2 render when the posture is sourced');
  ok(has(T.mItemize, 'Because you itemize, the interest on this mortgage — about $9,800 last year'), '§21.3 affirming line uses the SOURCED last-year figure');
  // SCOPED to the §21.3 SENTENCE: $31,684 legitimately appears elsewhere on this modal as the §20.6
  // "Total Interest Paid" row (interestPaidToDate is a real wired field). A whole-modal check would fail
  // on a correct room — the claim under test is only that §21.3 reads the LAST-YEAR figure.
  ok((function () {
    var m = /Because you itemize[\s\S]*?confirm the exact figure\./.exec(T.mItemize);
    return !!m && m[0].indexOf('9,800') >= 0 && m[0].indexOf('31,684') === -1;
  })(), '§21.3 sentence reads the last-year figure, NOT interestPaidToDate');
  ok(pick(!has(T.mStandard, 'Because you itemize'), has(T.mStandard, 'Because you itemize')), '§21.3 ABSENT for a standard-deduction filer [BITE]');
  ok(pick(!has(T.mFill, 'Mortgage interest may be deductible'), has(T.mFill, 'Mortgage interest may be deductible')), '§21 SILENT when nothing is sourced (L47) [BITE]');
  ok(has(T.mItemize, 'worth confirming with your tax advisor') && !/deduct this|you should itemize/i.test(T.mItemize), '§21 liability voice: hedged, never instructing');
  // §20.1 (Commit 6) — the lump what-if panel, held at whole-room level in a REAL browser.
  ok(has(R.mFill, 'What would extra do?') && has(R.mFill, 'One-time extra payment'), '§20.1 lump panel + input render on the Mortgage modal');
  ok(has(T.mFill, 'Drop in a one-time lump'), '§20.1 EPHEMERAL: a freshly opened modal shows the empty state (nothing persisted)');
  ok(pick(!has(R.aBlank, 'What would extra do?'), has(R.aBlank, 'What would extra do?')), '§20.1 lump panel ABSENT on Auto-debt (mortgage-only) [BITE]');
  ok(!!payoffField, 'Expected Payoff Date field renders a Month-Year (got "' + payoffField + '")');
  /* ⚠️ A WIRING PROOF, NOT A CROSS-CHECK, AND THE DIFFERENCE IS STATED SO NOBODY BANKS THE WRONG
   * ONE: for a mortgage _debtPayoffDisplay (studio.html:13036) is `return calculatePayoff(acc)` —
   * the HELOC maturity clamp is its only other branch and this fixture carries no maturityDate.
   * This leg proves THE FIELD IS WIRED AND RENDERING, never that two computations agree. */
  ok(!!payoffField && payoffField === diPayoff,
     'Expected Payoff Date field shows the same date as the DI sentence ("' + payoffField + '" / "' + diPayoff + '")');
  ok(R.amortBtnFound && has(R.amortFill, 'Remaining Schedule') && has(R.amortFill, 'Principal') && has(R.amortFill, 'Interest'), 'Amort button CLICK renders brand table (filled) [§20.2 title renamed]');
  ok(R.amortDisp === 'flex', 'Amort overlay is display:flex after click');
  ok(pick(R.amortZ > R.acctZ, R.amortZ < R.acctZ), 'Amort overlay z-index ABOVE account modal (' + R.amortZ + ' > ' + R.acctZ + ') [BUG-1 FIX/BITE]');
  ok(pick(has(R.amortBlank, 'Add a balance, rate, and payment'), !has(R.amortBlank, 'Add a balance, rate, and payment')), 'Amort empty-guard when unpayable (blank) [BITE]');
  // §3b (Captain ruling #430) — the position pie moved OUT of the overlay onto the modal body, above the
  // schedule button. Held at whole-room level from BOTH ends so a future tidy-up cannot quietly send it back.
  ok(has(R.mFill, 'WHERE THIS LOAN STANDS') && has(R.mFill, '<svg'), '§3b debt pie renders on the modal BODY by default');
  ok(R.mFill.indexOf('WHERE THIS LOAN STANDS') < R.mFill.indexOf('VIEW COMPLETE SCHEDULE'), '§3b pie sits ABOVE the schedule buttons');
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
  ok(!!diPayoff, '§1.3 payoff clock renders "mortgage-free around <Month Year>" (got "' + diPayoff + '")');
  ok(!!ahead, '§1.3 ahead clause renders "<N> months sooner than the <Month Year> you\'d hit paying the minimum alone"');
  /* THE ACCELERATION INVARIANT. payoffMonths (studio.html:12944) READS NO CLOCK — it is
   * -log(1 - rB/p)/log(1+r) over balance, rate and payment — so 94 is a pure function of THIS
   * FIXTURE and is the same on every day of the year. It is what the two struck literals pinned. */
  ok(!!ahead && parseInt(ahead[1], 10) === 94, '§1.3 ACCELERATION INVARIANT — 94 months (got ' + (ahead ? ahead[1] : 'none') + ')');
  ok(!!ahead && !!diPayoff && (monthIdx(ahead[2]) - monthIdx(diPayoff)) === parseInt(ahead[1], 10),
     '§1.3 the two printed dates are exactly the printed N months apart ("' + diPayoff + '" -> "' + (ahead ? ahead[2] : '?') + '")');
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
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_moat_winners.out.txt', summary, 'utf8');
  console.log(summary);
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
