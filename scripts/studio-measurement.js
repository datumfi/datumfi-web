/* studio-measurement.js — THE MEASUREMENT ROOM (PHASE V), BEHAVIOUR.
 *
 * SOURCE OF TRUTH FOR THE SURFACE: DATUMAE_Studio_v89_reattached.html — the Captain's own design,
 * maintained separately in both colour modes. The markup and CSS are ported verbatim from it.
 *   🔑 THE MOCK IS THE SPECIFICATION FOR THE SURFACE. THE LIVE FILE IS THE SPECIFICATION FOR THE
 *      BEHAVIOUR. Neither substitutes for the other.
 *
 * ⛔⛔ THIS FILE IS THE ONE PLACE ALL THREE PERMITTED DEVIATIONS LIVE. The list is CLOSED AND
 *    COUNTED; anything else that differs from v89 is a defect in the port, not a judgement call.
 *
 *   1. THE CHART ORIENTATION — Floor LOW, Ceiling HIGH.
 *      v83 plotted `y = top + (1-v)*h`, which drew the Floor at the top of the chart and the
 *      Ceiling at the bottom. The Captain rejected that on sight: "that result just made no sense
 *      with the Floor being the high point and ceiling being the low."
 *      ⭐ HIS DESIGNER THEN MADE THE CHANGE IN v89 (`y = top + v*h`), so this is now a FAITHFUL
 *         port of v89 rather than a deviation from it — the deviation was from v83. Recorded here
 *         because the ruling predates the mock that satisfies it, and a future reader comparing
 *         against the wrong version would "fix" it back.
 *
 *   2. THE DRAGGER GUARDS WITH Number.isFinite(), NOT WITH COMPARISONS.
 *      ⛔ MEASURED, NOT ASSUMED. range.html clamps with `if (y < MIN) y = MIN; if (y > MAX) y = MAX;`
 *         — and NaN < MIN is false, NaN > MAX is false, so NEITHER BRANCH FIRES and NaN sails into
 *         every setAttribute. That is exactly what produced the Captain's $NaNM screen, where three
 *         labels stacked on one line because all three positions were NaN.
 *      ⛔ THE MOCK HAS THE SAME HOLE IN A DIFFERENT SPELLING: `Math.max(0, Math.min(1, t))` also
 *         returns NaN for NaN. It never bites there because the mock's bounds are hardcoded
 *         fixtures that cannot be NaN. THE MOCK'S DRAGGER IS SAFE ONLY BECAUSE ITS DATA IS FAKE —
 *         and this room's data will come from an engine.
 *      🔑 A RANGE CHECK IS NOT A VALIDITY CHECK. NaN is neither too high nor too low, so a clamp
 *         built from inequalities is blind to it by construction.
 *
 *   3. THE MOCK'S FIXTURE NUMBERS DO NOT SURVIVE.
 *      v89 ships $118k / $144k / $168k / 79% and eleven more as demo values. The Captain: "just
 *      demo, proof of concept really." A fixture wearing a real layout on a surface that tells
 *      someone what they can afford for the rest of their life is F68's ×25 defect in better
 *      styling — a renderer faithfully drawing invented inputs.
 *      🔑 THE HONEST-SHELL RULE: WHAT THE ENGINE DID NOT RETURN IS BLANK AND LABELLED, NEVER
 *         DERIVED AND NEVER A PLACEHOLDER.
 *
 * ⚠️ NO ENGINE DEPENDENCY IN THIS COMMIT, BY SCOPE. render() takes a normalised object or nothing.
 *    Mapping the engine's payload (tiers / capacity_curve / legacy) onto that shape is the WIRING
 *    commit, where numbers arriving can be proven rather than assumed. Until then every entry point
 *    yields the empty state, which is the honest thing for a panel with no measurement behind it.
 *
 * ⚠️ NOT SACRED, DELIBERATELY, AND WITH A TRIGGER. The rule is "a file whose absence fails silently
 *    and changes money on screen." Right now its absence changes nothing — the panel is inert and
 *    nothing opens it. PIN IT THE COMMIT THE NUMBERS ARRIVE. A deferral with no trigger is a gap.
 *    🔑 SACRED IS EARNED BY CONSEQUENCE, NOT BY RESEMBLANCE.
 */
(function (w, d) {
  'use strict';

  /* The authored empty state. §82.1040. ⛔ The ONLY string this file introduces, and it is the
     Architect's, wired verbatim — not written here. */
  var EMPTY_STATE = 'Not measured yet.';

  /* v89's chart geometry, verbatim. */
  var LEFT = 44, RIGHT = 586, TOP = 34, BOTTOM = 214;
  var W = RIGHT - LEFT, H = BOTTOM - TOP;

  function el(id) { return d.getElementById(id); }

  /* ⛔ EVERY VALUE SLOT GOES THROUGH HERE, AND IT REFUSES NON-FINITE INPUT RATHER THAN FORMATTING
     IT. `'$' + Math.round(NaN/1000) + 'k'` is the string "$NaNk", which is how a broken number
     reaches a screen looking like a considered one. */
  function money(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return '';
    return '$' + Math.round(n / 1000) + 'k';
  }
  function pct(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Math.max(0, Math.min(100, Math.round(n * 100))) + '%';
  }
  function put(id, text) { var e = el(id); if (e) e.textContent = text == null ? '' : text; }

  /* The sixteen DATA slots. The seven authored COPY slots are NOT in this list and are never
     written by the empty state — they are the designer's voice and stand on their own. */
  /* ⚠️ mcMiniDatum LEFT AND mcHeroRange / mcHeroDatum ARRIVED, IN ONE EDIT (2026-09-12).
     A slot named here but absent from the DOM is harmless — put() null-guards — but a slot in the
     DOM and ABSENT HERE is not: it would never be cleared, so a previous household's figure would
     survive renderEmpty() and sit on screen beside the next household's blanks, looking current.
     🔑 THE EMPTY-STATE LIST IS A CONTRACT WITH THE MARKUP, NOT A CONVENIENCE. Adding a value slot
        to the panel without adding it here is how a stale number outlives the run that produced it. */
  var DATA_SLOTS = ['mcClimate', 'mcSuccess', 'mcHorizon', 'mcFloorValue',
    'mcDatumValue', 'mcDatumSuccess', 'mcCeilingValue', 'mcAxisMin', 'mcAxisMax',
    'mcGuardrail', 'mcTerminal', 'mcFailure', 'mcModeCode', 'mcRangeWidth',
    'mcHeroRange', 'mcHeroDatum'];

  function clearData() {
    for (var i = 0; i < DATA_SLOTS.length; i++) put(DATA_SLOTS[i], '');
    var line = el('mcCurveLine'), area = el('mcCurveArea'), marks = el('mcCurveMarkers');
    if (line) line.removeAttribute('d');
    if (area) area.removeAttribute('d');
    if (marks) marks.innerHTML = '';
  }

  /* ⛔ THE EMPTY STATE IS A DISPLAY STATE, NOT AN ERROR. capacity_curve is Optional on the engine
     and absent on any rollback, so "no data" is a NORMAL condition this panel must render calmly.
     ⛔⛔ IT HAS NO SURFACE RIGHT NOW, AND THAT IS DELIBERATE. This used to write EMPTY_STATE into
        mcFootCopy — but mcFootCopy held AUTHORED DESIGNER COPY, so the empty state DESTROYED a
        sentence every time there was no data, while the comment above DATA_SLOTS claimed the
        authored slots "are never written by the empty state". The code and the comment disagreed.
        ⚖️ Captain-ruled 2026-09-03: that sentence is REMOVED (redundant — "Drag Datum" already
        appears above the curve), so there is nothing left to overwrite and nothing to say here yet.
     🔑 THE QUESTION FOR THE COPY PASS IS NOT ONLY WHICH STRING, IT IS WHICH ELEMENT. Two strings are
        wanted — "the engine hasn't answered yet" (transient) and "this value doesn't exist for you"
        (terminal) — and borrowing another slot's element is what caused this. Give it its own.
     ⚠️ EMPTY_STATE and the emptyState() accessor are kept ON PURPOSE as the contract surface that
        pass will fill. They currently have no writer; that is a stated gap, not an oversight. */
  function renderEmpty() {
    clearData();
    /* The tax face is cleared through its own renderer, not through DATA_SLOTS: its content is
       SVG path data and generated axis nodes, which put() cannot reach. A slot list that only
       knows about text would leave a previous household's curve drawn under the next one's
       blanks. */
    renderTax(null, null, null);
  }

  /* ⛔ THE ONLY GATE BETWEEN A BAD NUMBER AND THE SCREEN. A scenario is usable only if every
     value the layout depends on is finite AND the curve is a non-empty array of finite numbers.
     🔑 CHECK THE DATA AT THE DOOR, NOT AT EACH USE — one refusal beats sixteen guards, and a
        guard you forget to write is indistinguishable from one you decided not to. */
  function usable(s) {
    if (!s || typeof s !== 'object') return false;
    var nums = [s.floor, s.datum, s.ceiling];
    for (var i = 0; i < nums.length; i++) if (!Number.isFinite(Number(nums[i]))) return false;
    if (!Array.isArray(s.curve) || !s.curve.length) return false;
    for (var j = 0; j < s.curve.length; j++) if (!Number.isFinite(Number(s.curve[j]))) return false;
    return true;
  }

  function bounds(s) {
    var stretch = 12000;
    return { minSpend: Math.max(0, s.floor - stretch), maxSpend: s.ceiling + stretch };
  }

  function successAtSpend(s, spend) {
    var v = s.curve, b = bounds(s);
    if (!Number.isFinite(Number(spend))) return NaN;
    var t = Math.max(0, Math.min(1, (spend - b.minSpend) / (b.maxSpend - b.minSpend)));
    if (!Number.isFinite(t)) return NaN;
    var idx = t * (v.length - 1), lo = Math.floor(idx), hi = Math.min(v.length - 1, Math.ceil(idx));
    var frac = idx - lo;
    return Number(v[lo]) * (1 - frac) + Number(v[hi]) * frac;
  }

  /* ══ THE WIRING. The header above promised this: "Mapping the engine's payload (tiers /
        capacity_curve / legacy) onto that shape is the WIRING commit, where numbers arriving can
        be proven rather than assumed." This is that commit (2026-09-12).

     ⛔⛔ THE ENGINE'S CURVE AND THIS RENDERER DO NOT SHARE AN X-AXIS, AND HANDING THE ARRAY OVER
        RAW WOULD BE CATASTROPHIC AND INVISIBLE. `capacity_curve.success_rates` is sampled on the
        engine's OWN `spend_grid` — $5,000 steps spanning the whole feasible sweep. MEASURED on
        three households: grid [18,225 .. 248,225] while this panel's window is [31,000 .. 77,000];
        [8,710 .. 248,710] against [26,000 .. 60,000]; [39,710 .. 249,710] against [78,000 ..
        144,000]. THE GRID IS FOUR TO SIX TIMES WIDER THAN THE WINDOW EVERY TIME.
        render() places point i at `x = LEFT + i/(n-1) * W` — evenly across the window — so the
        raw array would draw the engine's entire 18k–248k sweep squeezed inside an axis LABELLED
        31k–77k. Confidence would appear to collapse from 100% to 0% across the user's own range,
        the axis labels would still read correctly, and nothing would throw.
        🔑 THE RESAMPLE IS NOT A TIDYING STEP. It is the difference between a chart and a lie.

     ⛔ IT RESAMPLES THROUGH bounds() RATHER THAN THROUGH A COPY OF ITS ARITHMETIC. There is
        exactly ONE definition of this panel's window, and both the drawing and the resample read
        it. A second copy of `floor - 12000` here would agree today and drift the day somebody
        tunes the stretch — misaligning the curve from the axis SILENTLY, since both would still
        render. Note bounds() also floors minSpend at 0, which a hand-copied expression forgets. */

  /* Linear interpolation on the engine's own (spend -> success) samples. Straight lines between
     measured points is exactly what the chart draws and what successAtSpend() already assumes, so
     this introduces no shape the engine did not report. */
  function interpAt(grid, rates, spend) {
    var n = grid.length;
    if (spend <= grid[0]) return rates[0];
    if (spend >= grid[n - 1]) return rates[n - 1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (grid[mid] <= spend) lo = mid; else hi = mid; }
    var span = grid[hi] - grid[lo];
    if (!(span > 0)) return rates[lo];
    var f = (spend - grid[lo]) / span;
    return rates[lo] * (1 - f) + rates[hi] * f;
  }

  /* ⛔ RESOLUTION, NOT INVENTION. 61 samples across a ~46,000-wide window is roughly one point per
     $760 — finer than the engine's $5,000 step, which means the polyline follows the measured
     piecewise-linear function MORE closely, never less. It adds no inflection the engine did not
     report, because every value between two samples is on the straight line joining them. */
  var CURVE_POINTS = 61;

  /* ⚠️ SATURATION IS THE ONLY LICENCE TO READ OUTSIDE THE GRID, AND IT IS NARROW ON PURPOSE.
     success_rates is documented monotonically decreasing. So below the grid's first point success
     is >= rates[0], and capped at 1 — which pins it EXACTLY when rates[0] is already 1. The same
     argument mirrored gives the top end when the last rate is already 0. Anywhere else, reading
     past the grid would be asserting a confidence nobody computed, so the scenario is REFUSED and
     the panel shows its empty state.
     🔑 THIS IS THE HONEST-SHELL RULE APPLIED TO AN AXIS: what the engine did not measure is not
        drawn, and a clamp that quietly repeats the nearest value is a measurement claim. */
  var SATURATED_HI = 0.999, SATURATED_LO = 0.001;

  /* Build the renderer's scenario from a raw /api/calculate response. Returns null — never a
     partial object — when anything required is missing or unusable; render(null) is the empty
     state, which is a NORMAL display condition for this panel, not an error. */
  function fromEngine(res, req) {
    if (!res || typeof res !== 'object') return null;
    var t = res.tiers && (res.tiers.blended || res.tiers);
    var cc = res.capacity_curve;
    if (!t || !cc) return null;

    var floor = Number(t.bedrock), ceiling = Number(t.capstone);

    /* ⛔⛔ THE DATUM IS THE USER'S OWN TARGET SPEND. IT IS NOT A TIER, AND THE TIER THAT LOOKS
       LIKE IT IS A TRAP. This read `t.keystone` for one commit. Captain-caught 2026-09-12:
       "that's the user's desired spending, aren't they just picking a Target spend between the
       floor and ceiling?" — and he is right. MEASURED in the engine immediately after:

           datum_spend    floor    keystone    ceiling
              40,000     43,000    57,000     67,000
              60,000     43,000    57,000     67,000
             100,000     43,000    57,000     67,000

       THE LADDER DOES NOT MOVE. It is a property of the household's STRUCTURE — what the estate
       can support — and it is computed without reference to what the user wants. `datum_spend`
       changes exactly one thing: the confidence reported AT it (99% -> 8% across that range).
       `keystone` is documented in engine/tiers.py:141 as "spend at 90% success" — the ENGINE'S
       recommendation, a fourth rung on the ladder, not the user's chosen line.

       ⛔ AND THE DEFECT WOULD HAVE LOOKED LIKE A FEATURE, WHICH IS WHY IT IS WRITTEN DOWN AT
          LENGTH. If the Datum is always the 90% tier, then the confidence read at the Datum is
          ~90% BY DEFINITION — measured 89.3% / 88.2% / 89.4% on three dissimilar households. The
          panel's headline confidence would have read about 89% FOR EVERY USER, FOREVER, while
          moving plausibly in response to nothing. A constant wearing a measurement's clothes, on
          the one number a person would quote back to their spouse.
       🔑 A VALUE THAT CANNOT VARY IS NOT A WEAK MEASUREMENT. IT IS A LABEL.

       ⚠️ TAKEN FROM THE RESPONSE, NOT THE REQUEST, AND THAT ORDER IS DELIBERATE. The engine
          ECHOES the spend it actually computed against in `success_rates.datum_spend`, so the
          response is the authority on what these numbers describe. The stored request is the
          fallback for an older payload that predates the echo; if neither exists there is no
          spending line to draw and the panel refuses. A panel whose whole subject is "your
          spending line" must not invent one. */
    var _sr = res.success_rates;
    var datum = Number(_sr && _sr.datum_spend);
    if (!Number.isFinite(datum) && req) datum = Number(req.datum_spend);

    if (!Number.isFinite(floor) || !Number.isFinite(datum) || !Number.isFinite(ceiling)) return null;

    var grid = cc.spend_grid, rates = cc.success_rates;
    if (!Array.isArray(grid) || !Array.isArray(rates)) return null;
    if (grid.length < 2 || grid.length !== rates.length) return null;
    for (var k = 0; k < grid.length; k++) {
      if (!Number.isFinite(Number(grid[k])) || !Number.isFinite(Number(rates[k]))) return null;
    }

    /* THE ONE DEFINITION OF THE WINDOW — read, never re-derived. */
    var b = bounds({ floor: floor, ceiling: ceiling });
    if (!Number.isFinite(b.minSpend) || !(b.maxSpend > b.minSpend)) return null;

    if (b.minSpend < grid[0] && !(rates[0] >= SATURATED_HI)) return null;
    if (b.maxSpend > grid[grid.length - 1] && !(rates[rates.length - 1] <= SATURATED_LO)) return null;

    var curve = [];
    for (var i = 0; i < CURVE_POINTS; i++) {
      var spend = b.minSpend + (b.maxSpend - b.minSpend) * (i / (CURVE_POINTS - 1));
      var v = interpAt(grid, rates, spend);
      if (!Number.isFinite(v)) return null;
      curve.push(v);
    }

    var s = { floor: floor, datum: datum, ceiling: ceiling, curve: curve };

    /* The terminal estate at the Datum, from the engine's own parallel array. Absent when the
       engine shipped no median_ending — blank, never derived from the balance. */
    var me = cc.median_ending;
    if (Array.isArray(me) && me.length === grid.length) {
      var term = interpAt(grid, me, datum);
      if (Number.isFinite(term)) s.terminal = money(term);
    }

    /* ⚠️ horizon IS ARITHMETIC ON THE USER'S OWN TWO ANSWERS, WHICH IS WHY IT IS ALLOWED HERE AND
       `label` IS NOT. Retirement age and plan-end age are both things they typed; the years
       between them are not a new fact. The market-outlook LABEL would be a display string this
       file does not own — and it is mid-rename to the Datumae Blend — so mcClimate stays blank
       until the Architect's name for it exists. A blank slot is the honest shell; a guessed one
       is the defect this panel was built to avoid. */
    if (req && Number.isFinite(Number(req.plan_end_age)) && Number.isFinite(Number(req.retirement_age))) {
      var yrs = Math.round(Number(req.plan_end_age) - Number(req.retirement_age));
      if (yrs > 0) s.horizon = yrs + ' yrs';
    }

    /* ⚠️ THE TAX SERIES RIDES ALONG RATHER THAN GATING THE SCENARIO. `usable()` deliberately does
       NOT test it: the Range, the curve and the cards are all readable without a tax face, so a
       response missing eff_rate_by_year must still render everything else. Folding it into the
       door test would blank three working faces to protect one. */
    s.taxSeries = res.eff_rate_by_year || null;
    s.taxP25 = res.eff_rate_p25_by_year || null;
    s.taxP75 = res.eff_rate_p75_by_year || null;
    return s;
  }

  /* Read what the reveal already stored and render it. The Studio writes the whole response to
     `datumfi_range` on every successful compute (studio.html), so this needs no second request
     and no engine change — the data has been arriving and being discarded since the curve
     shipped. A malformed or absent entry yields the empty state, quietly. */
  function renderFromSession() {
    var res = null, req = null;
    try { res = JSON.parse(w.sessionStorage.getItem('datumfi_range') || 'null'); } catch (_e) { res = null; }
    try { req = JSON.parse(w.sessionStorage.getItem('datumfi_studio_request') || 'null'); } catch (_e) { req = null; }
    var s = fromEngine(res, req);
    /* ⛔ A DRAG BELONGS TO THE SCENARIO IT WAS MADE ON. Carrying `datumSpend` across a fresh
       render would show a spend the user chose for a DIFFERENT household, with this household's
       confidence read off beside it — two households in one sentence, and the number looks
       deliberate because it was, once. */
    datumSpend = null;
    render(s);
    return !!s;
  }

  var current = null;         // the last usable scenario, or null
  var datumSpend = null;      // the dragged Datum, or null for the scenario's own

  function activeDatum(s) { return Number.isFinite(datumSpend) ? datumSpend : s.datum; }

  function render(s) {
    if (!el('mcOverlay')) return;
    if (!usable(s)) { current = null; renderEmpty(); return; }
    current = s;

    var b = bounds(s);
    var spend = activeDatum(s);
    var conf = successAtSpend(s, spend);

    put('mcClimate', s.label || '');
    put('mcSuccess', pct(conf));
    put('mcDatumSuccess', pct(conf));
    put('mcHorizon', s.horizon || '');
    put('mcFloorValue', money(s.floor));
    put('mcDatumValue', money(spend));
    put('mcCeilingValue', money(s.ceiling));
    put('mcAxisMin', money(b.minSpend));
    put('mcAxisMax', money(b.maxSpend));
    put('mcGuardrail', money(s.guardrail));
    put('mcTerminal', s.terminal == null ? '' : s.terminal);
    put('mcFailure', Number.isFinite(conf) ? pct(1 - conf) : '');
    put('mcModeCode', s.code || '');
    put('mcRangeWidth', money(s.ceiling - s.floor));

    /* THE HERO READOUT. Same three values the cards carry, in the Mock's own arrangement:
       the working range as one string, the user's target spend, and the confidence at it.
       ⛔ mcSuccess IS ALREADY WRITTEN ABOVE and is NOT repeated here — it moved INTO the hero when
          the chip row was replaced, so there is one element with that id, not two. A second write
          would be harmless today and a silent divergence the day the two lines disagree. */
    put('mcHeroRange', money(s.floor) + ' — ' + money(s.ceiling));
    put('mcHeroDatum', money(spend));

    renderTax(s.taxSeries, s.taxP25, s.taxP75);

    /* ⛔ ORIENTATION — DEVIATION 1. `y = TOP + v*H`, so v=1 (high confidence, low spend) lands at
       the BOTTOM and v→0 (low confidence, high spend) lands at the TOP. Floor low, Ceiling high.
       v83 used `(1-v)` here and drew it upside down. DO NOT "restore" it. */
    var pts = s.curve.map(function (v, i) {
      var x = LEFT + (i / Math.max(1, s.curve.length - 1)) * W;
      var y = TOP + Number(v) * H;
      return [x, y];
    });
    var dAttr = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var line = el('mcCurveLine'), area = el('mcCurveArea');
    if (line) line.setAttribute('d', dAttr);
    if (area) area.setAttribute('d', dAttr + ' L ' + RIGHT + ' ' + BOTTOM + ' L ' + LEFT + ' ' + BOTTOM + ' Z');
  }

  /* ⛔ DEVIATION 2 — the dragger. Every intermediate is checked for finiteness, and a non-finite
     one ABANDONS the update rather than clamping it. A clamp cannot reject; only a guard can. */
  function setDatumFromClientX(clientX) {
    var shell = el('mcCurveShell');
    if (!shell || !current) return;
    if (!Number.isFinite(Number(clientX))) return;
    var rect = shell.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || rect.width <= 0) return;
    var local = ((clientX - rect.left) / rect.width) * 620;
    if (!Number.isFinite(local)) return;
    var t = (local - LEFT) / W;
    if (!Number.isFinite(t)) return;
    t = Math.max(0, Math.min(1, t));
    var b = bounds(current);
    var next = Math.round((b.minSpend + t * (b.maxSpend - b.minSpend)) / 1000) * 1000;
    if (!Number.isFinite(next)) return;
    datumSpend = next;
    render(current);
  }

  /* ⛔ OPENING IS A READ. The panel refreshes from the stored response every time it is shown,
     rather than being filled once by whoever opens it. Two reasons, and the second is the one that
     matters: a panel that is populated by its CALLER shows whatever the last caller left behind,
     so a second door added later inherits a silent staleness bug from the first. Filling on open
     means the door — whenever the Architect rules where it lives — is one line that cannot get
     this wrong.
     ⚠️ AND IT MEANS A STALE RANGE CANNOT SURVIVE A RECOMPUTE. sessionStorage is rewritten on every
        successful reveal; reading it here is what guarantees the numbers on screen belong to the
        household currently in the Studio. */
  /* ══ THE TAX FACE (batch 2, 2026-09-12) ══════════════════════════════════════════════════════
     Geometry is the Mock's own: viewBox 620x240, plot x 54..590, and a y axis whose gridlines sit
     at 28 / 99.2 / 170.4 / 206 for 25% / 15% / 5% / 0%. Those four are EVENLY SPACED IN RATE
     (25-15-5) but NOT in pixels (71.2, 71.2, 35.6), because the last gap is 5 points and the
     others are 10. So the scale is linear at 7.12px per point with the 0% baseline at y=206.
     ⛔ DERIVED FROM THE LABELS RATHER THAN RE-CHOSEN, AND THAT IS THE WHOLE TRICK. The axis text
        is static markup ported from the Mock; if the renderer picked its own scale the line would
        drift from the labels beside it, and a chart whose gridlines disagree with its own curve is
        wrong in the one way nobody checks. */
  var TAX_X0 = 54, TAX_X1 = 590, TAX_Y0 = 206, TAX_PER_POINT = (206 - 28) / 25;

  function taxY(rate) { return TAX_Y0 - (Number(rate) * 100) * TAX_PER_POINT; }
  function taxX(i, n) { return TAX_X0 + (n <= 1 ? 0 : (i / (n - 1)) * (TAX_X1 - TAX_X0)); }

  function renderTax(series, p25, p75) {
    var line = el('mcTaxLine'), band = el('mcTaxBand'), marker = el('mcTaxFirstMarker'),
        axes = el('mcTaxAxes'), zero = el('mcTaxZero'), rate = el('mcTaxRate'),
        spread = el('mcTaxSpreadCopy');

    var ok = Array.isArray(series) && series.length > 0;
    for (var i = 0; ok && i < series.length; i++) if (!Number.isFinite(Number(series[i]))) ok = false;
    if (!ok) {
      [line, band].forEach(function (e) { if (e) e.removeAttribute('d'); });
      if (marker) marker.innerHTML = '';
      if (axes) axes.innerHTML = '';
      if (rate) rate.textContent = '';
      if (zero) zero.hidden = true;
      return;
    }

    var n = series.length;
    if (line) {
      line.setAttribute('d', series.map(function (v, i2) {
        return (i2 === 0 ? 'M' : 'L') + ' ' + taxX(i2, n).toFixed(1) + ' ' + taxY(v).toFixed(1);
      }).join(' '));
    }

    /* ⛔ THE BAND IS DRAWN ONLY FROM MEASURED EDGES. A response minted before the engine gained
       p25/p75 carries the median alone, and for that interval the face shows the line WITHOUT an
       envelope and says so. Deriving a band from the median — ±x%, or a fraction of the value —
       would draw a spread nobody computed, on the surface whose whole subject is spread. */
    var haveBand = Array.isArray(p25) && Array.isArray(p75) &&
                   p25.length === n && p75.length === n &&
                   p25.every(function (v) { return Number.isFinite(Number(v)); }) &&
                   p75.every(function (v) { return Number.isFinite(Number(v)); });
    if (band) {
      if (haveBand) {
        var top = p75.map(function (v, i2) {
          return (i2 === 0 ? 'M' : 'L') + ' ' + taxX(i2, n).toFixed(1) + ' ' + taxY(v).toFixed(1);
        }).join(' ');
        var bot = [];
        for (var j = n - 1; j >= 0; j--) {
          bot.push('L ' + taxX(j, n).toFixed(1) + ' ' + taxY(p25[j]).toFixed(1));
        }
        band.setAttribute('d', top + ' ' + bot.join(' ') + ' Z');
      } else {
        band.removeAttribute('d');
      }
    }
    if (spread) {
      spread.textContent = haveBand
        ? 'Median + interquartile band across 40,000 modeled paths'
        : 'Median across 40,000 modeled paths · interquartile band recorded, not yet modelled';
    }

    if (marker) {
      marker.innerHTML = '<circle cx="' + taxX(0, n).toFixed(1) + '" cy="' + taxY(series[0]).toFixed(1)
        + '" r="3.2"></circle>';
    }

    /* Year labels at first, middle and last — the Mock's three-stop x axis. */
    if (axes) {
      var stops = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
      axes.innerHTML = stops.map(function (i2) {
        var anchor = i2 === 0 ? 'start' : (i2 === n - 1 ? 'end' : 'middle');
        return '<text x="' + taxX(i2, n).toFixed(1) + '" y="228" text-anchor="' + anchor + '">Year '
          + (i2 + 1) + '</text>';
      }).join('');
    }

    if (rate) rate.textContent = pct(series[0]);

    /* ⛔ A COMPUTED ZERO IS A RESULT, NOT AN ABSENCE — Architect-ruled, and it is REACHABLE on an
       ordinary household: a plan drawing from taxable and Roth through the bridge years pays 0%
       federal, measured at 0.0% for the first six years of a $1.0M estate. The panel says so in
       the designer's own words instead of showing a flat line with no explanation. */
    if (zero) zero.hidden = !series.every(function (v) { return Number(v) === 0; });
  }

  /* The three faces. Ported from the Mock's applyMCVisualView, including the flip. */
  function setView(view) {
    var next = ['curve', 'distribution', 'tax'].indexOf(view) >= 0 ? view : 'curve';
    var visual = el('mcVisualSwitch');
    var tabs = d.querySelectorAll('[data-mc-view-tab]');
    function commit() {
      if (visual) visual.setAttribute('data-view', next);
      for (var i = 0; i < tabs.length; i++) {
        var active = tabs[i].getAttribute('data-mc-view-tab') === next;
        tabs[i].classList.toggle('active', active);
        tabs[i].setAttribute('aria-selected', active ? 'true' : 'false');
      }
    }
    if (!visual) { commit(); return; }
    visual.classList.add('is-flipping');
    w.setTimeout(function () {
      commit();
      w.requestAnimationFrame(function () { visual.classList.remove('is-flipping'); });
    }, 145);
  }

  function open() {
    var o = el('mcOverlay'); if (!o) return;
    renderFromSession();
    o.hidden = false; o.classList.add('open');
  }
  function close() {
    var o = el('mcOverlay'); if (!o) return;
    o.classList.remove('open');
    w.setTimeout(function () { if (!o.classList.contains('open')) o.hidden = true; }, 260);
  }

  function wire() {
    var shell = el('mcCurveShell');
    if (shell && !shell.__mcWired) {
      shell.__mcWired = true;
      var dragging = false;
      shell.addEventListener('pointerdown', function (e) {
        dragging = true;
        try { shell.setPointerCapture(e.pointerId); } catch (_e) {}
        setDatumFromClientX(e.clientX);
      });
      shell.addEventListener('pointermove', function (e) { if (dragging) setDatumFromClientX(e.clientX); });
      shell.addEventListener('pointerup', function () { dragging = false; });
      shell.addEventListener('pointercancel', function () { dragging = false; });
    }
    d.querySelectorAll('[data-mc-view-tab]').forEach(function (t) {
      if (t.__mcWired) return;
      t.__mcWired = true;
      t.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        setView(t.getAttribute('data-mc-view-tab'));
      });
    });
    /* ⛔ THE TILE IS A div WITH role=button, SO KEYBOARD IS NOT FREE. Enter and Space are wired
       explicitly; without them the tax face has one door for a mouse and none for a keyboard. */
    var taxTile = d.querySelector('[data-mc-tax-tile]');
    if (taxTile && !taxTile.__mcWired) {
      taxTile.__mcWired = true;
      var openTax = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } setView('tax'); };
      taxTile.addEventListener('click', openTax);
      taxTile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') openTax(e);
      });
    }
    d.querySelectorAll('[data-mc-close]').forEach(function (b) {
      if (b.__mcWired) return;
      b.__mcWired = true;
      b.addEventListener('click', close);
    });
    /* An unwired panel showing a stale layout would be worse than an empty one. */
    renderEmpty();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', wire);
  else wire();

  w.DatumMeasurement = {
    render: render,
    renderEmpty: renderEmpty,
    fromEngine: fromEngine,
    setView: setView,
    renderFromSession: renderFromSession,
    open: open,
    close: close,
    /* Read-only seams so a gate can prove WHY a render was refused rather than inferring it from
       an empty screen — the same contract DatumBlueprint._internal.bootWindowOpen() established. */
    _internal: {
      usable: usable,
      money: money,
      pct: pct,
      bounds: bounds,
      successAtSpend: successAtSpend,
      interpAt: interpAt,
      renderTax: renderTax,
      taxY: taxY,
      curvePoints: function () { return CURVE_POINTS; },
      dataSlots: function () { return DATA_SLOTS.slice(); },
      emptyState: function () { return EMPTY_STATE; },
      datumSpend: function () { return datumSpend; },
      setDatumFromClientX: setDatumFromClientX
    }
  };
}(window, document));
