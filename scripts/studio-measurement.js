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

  /* ⛔⛔ §6.9b — THE SURVIVOR DISCLOSURE. THE STRING IS THE ARCHITECT'S, SHIPPED VERBATIM, AND IT IS
     BYTE-FOR-BYTE THE ONE range.html HAS CARRIED SINCE 12 Sep — including the curly apostrophe in
     "person’s". Same sentence, same trigger, new surface (§82.2363, L48). A re-wording here would
     be the 75% getting re-argued through copy instead of through a ruling.
     ⛔ IT IS NOT IN DATA_SLOTS, AND THAT IS THE SAME REASON renderTax IS NOT: `put()` only writes
        textContent, and this element's resting state is HIDDEN. A slot list that only knows about
        text would clear the sentence and leave the empty strip painted under the headline range —
        which reads as something that failed to load, not as a household with no survivor window.
     ⚠️ A NULL YEAR IS A NORMAL DISPLAY CONDITION, NOT A FAILURE: every solo household has one, and
        so does any response from an engine too old to carry the field. Both render nothing at all.
     ⚠️ THE YEAR IS INTERPOLATED, NEVER FORMATTED. money()/pct() would be wrong here — it is a
        calendar year, not a quantity, and a thousands separator on 2064 would read as money. */
  function renderSurvivor(year) {
    var e = el('mcSurvivorDisclosure');
    if (!e) return;
    if (year == null) { e.hidden = true; e.textContent = ''; return; }
    e.textContent = 'After ' + year + ', this plans for one person: the larger Social Security '
                  + 'benefit, single-filer tax, one person’s healthcare, and 75% of your '
                  + 'spending.';
    e.hidden = false;
  }

  function clearData() {
    for (var i = 0; i < DATA_SLOTS.length; i++) put(DATA_SLOTS[i], '');
    var line = el('mcCurveLine'), area = el('mcCurveArea'), marks = el('mcCurveMarkers');
    if (line) line.removeAttribute('d');
    if (area) area.removeAttribute('d');
    if (marks) marks.innerHTML = '';
    /* ⛔ CLEARED HERE RATHER THAN ONLY IN renderEmpty, BECAUSE clearData IS THE FUNCTION EVERY
       RE-RENDER GOES THROUGH. A disclosure left standing from the PREVIOUS household while the
       next one's numbers paint over it would name a survivor year belonging to somebody else —
       and it would look deliberate, because it was, once. */
    renderSurvivor(null);
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

    /* ⛔⛔ §6.9b — THE SURVIVOR YEAR, READ FROM THE ENGINE AND NEVER RE-DERIVED.
       LAW 183 — BIND THE COPY TO THE MECHANISM, NEVER TO A RESTATEMENT OF IT. The engine computes
       the window and hands back the year; this reads that year. A client that re-derived "is there
       a window?" from the two plan-through ages would be a SECOND IMPLEMENTATION of the rule, free
       to drift from the one that actually moved the money.
       ⛔ AND THAT RESTATEMENT WAS TRIED AND WAS WRONG. The original trigger read "joint household
          AND the two plan-through ages differ." MEASURED: a couple who both plan to the SAME age
          but differ in age by 2.2 years DOES open a 2.2-year window — the older one's horizon
          arrives first. The described population was a STRICT SUBSET of the real one, so the
          restatement silently skipped most affected households.
       ⚠️ `== null` IS DELIBERATE AND `=== null` IS NOT USED: it catches null AND undefined, and
          undefined is what a response from an engine predating the field looks like. Both mean the
          same thing here — "no window was reported" — and both must render nothing.
       ⚠️ IT RIDES ALONG RATHER THAN GATING THE SCENARIO, like the tax series above: `usable()`
          does not test it. A solo household has no survivor year and must still get its Range. */
    var _sy = res.params ? res.params.survivor_calendar_year : null;
    s.survivorYear = (_sy == null) ? null : _sy;
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

    /* §6.9b — painted by the SAME call that paints the tiers it describes. There is no path
       that renders a stepped-down number without it, which is the only structural way "it must
       ship before any user sees a stepped-down tier" can hold, rather than holding by discipline. */
    renderSurvivor(s.survivorYear);
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
  var TAX_X0 = 54, TAX_X1 = 590, TAX_Y0 = 206, TAX_Y1 = 28;

  /* ⛔ THE CEILING IS CHOSEN FROM A CLOSED LIST OF HUMAN NUMBERS, NEVER FITTED TO THE DATA. A
     fitted top produces axes labelled 3.4% or 7.3%, which is a number a reader has to decode
     instead of read, and it makes two households incomparable for no gain. */
  /* ⚠️ THE LIST RUNS PAST 25, AND THAT IS A DECLARED DEVIATION FROM THE RULING, FLAGGED NOT
     SMUGGLED. The instruction was "cap at 25 — the current axis becomes the maximum rather than
     the constant", on the reasonable assumption that no retiree's effective rate exceeds it.
     ⛔ BUT A HARD CAP AND "WE DO NOT CLIP MEASUREMENTS TO FIT FURNITURE" CANNOT BOTH HOLD. With a
        true cap, a household whose median genuinely reaches 30% is drawn ABOVE the top gridline —
        outside the plot, still honest, and visually indistinguishable from a rendering bug. The
        two honest answers are "clip the data" (forbidden, and the exact defect the ruling deletes
        the Mock's Math.min for) or "extend the axis". This extends the axis.
     🔑 25 IS THE NORMAL TOP, NOT A LIMIT ON WHAT CAN BE SHOWN. Above it the steps keep going so
        the data always fits inside the box it is drawn in. Measured max across 41 retirement years
        on a $1.0M estate is 3.03%, so the rungs past 25 are unreachable in practice — which is
        precisely why they cost nothing and why their absence would have gone unnoticed. */
  var TAX_STEPS = [4, 5, 8, 10, 15, 20, 25, 30, 40, 50];
  /* ⚠️ THE FLOOR ON THE CEILING IS 5 AND THE NUMBER IS WRITTEN DOWN HERE ON PURPOSE. Without it a
     household paying 0.2% gets an axis that magnifies rounding dust into a dramatic climb — the
     mirror of the defect this rescale fixes, and a worse one, because it INVENTS drama where the
     hugging problem only hid a real shape. */
  var TAX_CEIL_MIN = 5;
  /* ⚠️ 25 IS NOW A MAXIMUM, NOT A CONSTANT. It used to be the only axis there was. */
  var TAX_CEIL_MAX = 25;
  var TAX_HEADROOM = 1.15;

  /* Highest measured percentage anywhere in the face — the band's top edge when a band exists,
     the median's when it does not. ⛔ NOTHING IS CLIPPED TO REACH IT: the Mock's renderer wrapped
     its median and both band edges in Math.min(25, …), which is invisible under a fixed axis and
     becomes live data corruption under a computed one — a genuine 30% year silently rewritten to
     25% and drawn as though measured. That clamp is deliberately absent here. WE DO NOT CLIP
     MEASUREMENTS TO FIT FURNITURE. */
  function taxCeiling(series, p75) {
    var top = 0, i;
    if (Array.isArray(series)) {
      for (i = 0; i < series.length; i++) {
        if (Number.isFinite(Number(series[i]))) top = Math.max(top, Number(series[i]) * 100);
      }
    }
    if (Array.isArray(p75)) {
      for (i = 0; i < p75.length; i++) {
        if (Number.isFinite(Number(p75[i]))) top = Math.max(top, Number(p75[i]) * 100);
      }
    }
    var want = top * TAX_HEADROOM;
    for (i = 0; i < TAX_STEPS.length; i++) {
      if (TAX_STEPS[i] >= want && TAX_STEPS[i] >= TAX_CEIL_MIN) return TAX_STEPS[i];
    }
    return TAX_CEIL_MAX;
  }

  /* ⛔ ZERO IS ALWAYS THE BOTTOM. NEVER A FITTED MINIMUM. A household drawing from taxable and Roth
     through the bridge years genuinely pays 0% federal, and that is the best thing on this face —
     but it is only legible if the baseline is a TRUE zero the curve can sit on. A fitted floor
     would redraw six years of measured zero as six years of apparently-some tax, which is a worse
     lie than the flatness it would be fixing. */
  function taxY(rate, ceiling) {
    var c = Number(ceiling) > 0 ? Number(ceiling) : TAX_CEIL_MAX;
    return TAX_Y0 - (Number(rate) * 100 / c) * (TAX_Y0 - TAX_Y1);
  }
  function taxX(i, n) { return TAX_X0 + (n <= 1 ? 0 : (i / (n - 1)) * (TAX_X1 - TAX_X0)); }

  /* Four stops including zero, evenly spaced IN RATE. The Mock's uneven pixel gaps were an artifact
     of 25/15/5/0 having a five-point last step; computed stops remove that without anyone deciding
     to. Integers print clean; thirds of an odd ceiling print to one decimal rather than lying. */
  function taxLabel(v) {
    return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + '%';
  }

  function renderTaxAxis(ceiling) {
    var grid = el('mcTaxGrid'), labels = el('mcTaxYLabels');
    if (!grid && !labels) return;
    var g = [], t = [];
    for (var k = 3; k >= 0; k--) {
      var rate = (ceiling * k) / 3;
      var y = taxY(rate / 100, ceiling);
      g.push('<line x1="' + TAX_X0 + '" y1="' + y.toFixed(1) + '" x2="' + TAX_X1 + '" y2="' + y.toFixed(1) + '"></line>');
      t.push('<text x="44" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + taxLabel(rate) + '</text>');
    }
    if (grid) grid.innerHTML = g.join('');
    if (labels) labels.innerHTML = t.join('');
  }

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
      /* ⛔⛔ THE AXIS SURVIVES THE EMPTY STATE, AND THE FIRST VERSION OF THIS RESCALE BROKE THAT.
         Before the rescale the gridlines and the 25/15/5/0% labels were STATIC MARKUP, so a tax
         face with no data still showed its own furniture. Generating them moved their existence
         behind "is there data", and Captain-caught 2026-09-12: with nothing loaded the face went
         COMPLETELY BLANK — not an empty chart, an empty rectangle.
         🔑 AN EMPTY CHART READS AS "NO DATA YET". AN EMPTY RECTANGLE READS AS BROKEN. Same absence
            of numbers, opposite message, and only one of them is true.
         ⚠️ DRAWING THE FURNITURE IS SAFE BECAUSE AN AXIS IS NOT A MEASUREMENT CLAIM. The default
            ceiling asserts nothing about a household — there is no household — it states the shape
            of the instrument that is waiting. No line, no band, no rate: those ARE claims and they
            stay absent. */
      renderTaxAxis(TAX_CEIL_MIN);
      return;
    }

    var n = series.length;

    /* ⛔ ONE CEILING, COMPUTED ONCE, USED BY THE AXIS AND BY EVERY PATH BELOW. Writing the new
       top in two places is the exact failure this rescale was warned about: the labels and the
       curve would agree today and drift the first time either side is touched, and BOTH WOULD
       STILL RENDER. */
    var ceiling = taxCeiling(series, p75);
    renderTaxAxis(ceiling);

    if (line) {
      line.setAttribute('d', series.map(function (v, i2) {
        return (i2 === 0 ? 'M' : 'L') + ' ' + taxX(i2, n).toFixed(1) + ' ' + taxY(v, ceiling).toFixed(1);
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
          return (i2 === 0 ? 'M' : 'L') + ' ' + taxX(i2, n).toFixed(1) + ' ' + taxY(v, ceiling).toFixed(1);
        }).join(' ');
        var bot = [];
        for (var j = n - 1; j >= 0; j--) {
          bot.push('L ' + taxX(j, n).toFixed(1) + ' ' + taxY(p25[j], ceiling).toFixed(1));
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
      marker.innerHTML = '<circle cx="' + taxX(0, n).toFixed(1) + '" cy="' + taxY(series[0], ceiling).toFixed(1)
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

  /* ══ THE CONVERGENCE SWARM ════════════════════════════════════════════════════════════════════
     ⛔⛔ PACED TO THE WORK, NOT TO A CLOCK, AND THAT IS THE WHOLE DIFFERENCE FROM THE MOCK. The
        Mock resolves on fixed timers because it has nothing to wait for. This screen exists
        because the engine takes 10-15 seconds and a user needs to know the button is working
        rather than navigate away — so it ends when the ENGINE ends.
     🔑 A PROGRESS ANIMATION THAT FINISHES BEFORE THE WORK DOES IS A SPINNER THAT LIES, and it
        teaches the user that the screen is decoration. One that never finishes is worse.
     ⚠️ THE MINIMUM IS THERE FOR THE FAST CASE, NOT THE SLOW ONE. A warm engine cache can answer
        in well under a second; without a floor the swarm would flash and vanish, reading as a
        glitch. The minimum is the only timer in here and it never EXTENDS past the work. */
  var SWARM_MIN_MS = 1400;
  var SWARM_PATHS = 100;
  var SWARM_NS = 'http://www.w3.org/2000/svg';

  /* The Mock's viewBox, and the three points that give the shape its meaning. */
  var SW_X0 = 52, SW_XMID = 520, SW_X1 = 938, SW_STEP = 46;
  var SW_YMID = 168, SW_YTOP = 34, SW_YBOT = 304, SW_FLOOR = 276;
  /* The resolved band, and the lower line the depleted futures settle onto. See the ruling in
     swarmPath: a band because the answer is a range, and a SEPARATE lower line because futures that
     ran out must not be absorbed into the ones that did not. */
  var SW_BAND = 26, SW_FAIL_Y = 292, SW_FAIL_BAND = 9;

  /* ⛔⛔ IT CONVERGES. THE MOCK'S DOES NOT, AND THAT WAS THE MOCK BEING WRONG ABOUT ITS OWN NAME.
     Captain-caught 2026-09-12: "this is called convergence yet it ENDS with the line still
     completely splayed." He is right, and the fix is not decoration — it is the only shape that
     matches what the engine actually does: ONE estate, out to 40,000 futures, back to ONE answer.
     So every path is a SPINDLE: a common origin on the left, a genuine random walk out to maximum
     spread, then a walk back that is pulled progressively onto the single end point.

     ⭐ AND THE SHAPE IS WHAT MAKES THE PACING HONEST, WHICH IS WHY IT IS ONE PATH AND NOT TWO.
     Drawn with a stroke-dash reveal, the FIRST HALF is the fan-out and the SECOND HALF is the
     collapse. So the animation can stop at the midpoint and wait, and the return is played BY THE
     ANSWER ARRIVING. The ending is the result, so it cannot finish early.
     🔑 MEASURED, NOT ASSUMED, THAT THE OLD ONE FINISHED EARLY: dash-offset ran 2200 -> 544 -> 0 in
        about 3.3 seconds against a 10-15 second engine. The panel stayed up — L10a proved that —
        and then FROZE for seven to twelve seconds. I gated the container's lifetime and never
        gated that anything keeps moving.

     ⚠️ THE OUTWARD WALK IS THE MOCK'S OWN, RESTORED. The first port invented it — a sinusoid,
        because the Mock's function head sat above the window I read and I wrote the body from the
        tail. `Math.sin(i * 1.7 + step)` phase-locks 100 paths and wove them into a visible diamond
        lattice; the real one is `(Math.random() - 0.45) * 35`, an unbiased-downward random walk.
        🔑 A RECONSTRUCTION THAT COMPILES IS STILL NOT A PORT.

     ⚠️ THESE ARE DELIBERATELY NOT THE ENGINE'S TRIALS. Drawing 100 of 40,000 real paths would be a
        sample presented as the swarm, and the honest reading of a sampled picture is not available
        to a viewer. They animate WORK HAPPENING; every number that means anything arrives on the
        panel behind it. */
  function swarmPath() {
    var out = [[SW_X0, SW_YMID]], back = [], y = SW_YMID, x, success = true;

    for (x = SW_X0 + SW_STEP; x <= SW_XMID; x += SW_STEP) {
      y += (Math.random() - 0.45) * 35;
      y = Math.max(SW_YTOP, Math.min(SW_YBOT, y));
      if (y > SW_FLOOR) success = false;
      out.push([x, y]);
    }

    /* The return keeps walking — a future does not become CERTAIN, it becomes RESOLVED — and only
       afterwards is each step pulled toward where it ends up. Success is not known until the walk
       is finished, so the pull cannot be applied inside the loop that decides it. */
    var steps = Math.max(1, Math.ceil((SW_X1 - SW_XMID) / SW_STEP));
    for (var k = 1; k <= steps; k++) {
      x = Math.min(SW_X1, SW_XMID + k * SW_STEP);
      y += (Math.random() - 0.45) * 35;
      y = Math.max(SW_YTOP, Math.min(SW_YBOT, y));
      if (y > SW_FLOOR) success = false;
      back.push([x, y, k / steps]);
    }

    /* ⛔⛔ IT CONVERGES TO A BAND, NEVER TO A POINT, AND THAT IS A CORRECTNESS CONSTRAINT RATHER
       THAN A STYLE ONE. A first build pulled all hundred paths onto one pixel — the gate proved it,
       "distinct end-Y across 12 paths = [168]" — and a single clean node ASSERTS A CONSENSUS THE
       ENGINE DID NOT FIND. The four models disagree by $23,000-$31,000 on the same household.
       🔑 THE PICTURE MUST NOT BE MORE CONFIDENT THAN THE ANSWER. An animation that resolves to a
          dot has quietly made a claim the numbers underneath it cannot support, on the screen whose
          entire subject is uncertainty.
       ⚠️ THE BAND'S WIDTH IS A STATEMENT THAT A RANGE EXISTS, NOT A MEASUREMENT OF ITS SIZE. The
          actual Floor-to-Ceiling span is on the panel behind, in dollars. This says only "outcomes,
          plural" — and that is the most it is entitled to say.

       ⛔ AND THE DEPLETED FUTURES STAY LEGIBLE AS HAVING EXISTED. Architect-ruled: if the red set
          simply merged into the band, the picture would end by asserting that every future worked
          out, AND WE WOULD HAVE BUILT A REASSURANCE MACHINE. They settle to their own lower line
          instead — still drawn, still red, visibly a different outcome. Falling away is acceptable;
          vanishing is not. */
    var jitter = Math.random() * 2 - 1;
    var endY = success
      ? SW_YMID + jitter * SW_BAND
      : SW_FAIL_Y + jitter * SW_FAIL_BAND;

    for (var j = 0; j < back.length; j++) {
      var e = back[j][2] * back[j][2];
      back[j] = [back[j][0], back[j][1] * (1 - e) + endY * e];
    }

    return {
      d: 'M ' + out.concat(back).map(function (p) {
        return p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }).join(' L '),
      success: success
    };
  }

  /* ⛔ THE REVEAL IS A TRANSITION, NOT A KEYFRAME, BECAUSE IT HAS TO BE ABLE TO STOP HALFWAY.
     The Mock animates `draw-swarm` to completion and cannot pause. A transition lets stage one run
     to the midpoint and hold there for as long as the engine takes.
     ⚠️ AND THE DASH LENGTH IS THE PATH'S OWN, MEASURED WITH getTotalLength(). The Mock hardcodes
        2200 against paths that are about 909 units long, so its "draw" is really the line sliding
        out of an oversized gap — which works by accident and breaks the moment the geometry
        changes. Here half the measured length IS the midpoint of the spindle, exactly. */
  function renderSwarmPaths() {
    var g = el('mcConvergenceSwarmPaths');
    if (!g) return;
    g.innerHTML = '';
    var made = [];
    for (var i = 0; i < SWARM_PATHS; i++) {
      var meta = swarmPath();
      var p = d.createElementNS(SWARM_NS, 'path');
      p.setAttribute('d', meta.d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', meta.success ? 'rgba(93,202,165,.17)' : 'rgba(226,75,74,.34)');
      p.setAttribute('stroke-width', '1.45');
      g.appendChild(p);
      var L = 0;
      try { L = p.getTotalLength(); } catch (_e) { L = 1800; }
      p.__mcLen = L;
      p.__mcDelay = Math.random() * 0.9;
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
      made.push(p);
    }
    return made;
  }

  /* Stage one — the fan-out, staggered so the swarm assembles rather than appearing. */
  function swarmDiverge(paths) {
    paths.forEach(function (p) {
      p.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(0.33,0.9,0.5,1) ' + p.__mcDelay.toFixed(2) + 's';
      p.style.strokeDashoffset = (p.__mcLen / 2);
    });
  }

  /* Stage two — the collapse, played by the ANSWER. Tighter and slightly faster than the fan-out,
     so the motion reads as resolution rather than as more of the same. */
  function swarmConverge(paths) {
    paths.forEach(function (p) {
      p.style.transition = 'stroke-dashoffset 1.25s cubic-bezier(0.5,0,0.2,1) '
        + (p.__mcDelay * 0.35).toFixed(2) + 's';
      p.style.strokeDashoffset = 0;
    });
  }

  /* Run the swarm for the life of `work` (a promise). Resolves with whatever `work` resolved to,
     so a caller can chain straight into rendering. Rejection is passed through unchanged — the
     swarm closes either way, because a failed compute must not leave a progress screen up. */
  function runConvergence(work, opts) {
    var overlay = el('mcConvergenceSwarm');
    var status = el('mcConvergenceStatus'), badge = el('mcConvergenceBadge');
    var settled = Promise.resolve(work);
    if (!overlay) return settled;

    var horizon = opts && opts.horizon;
    var tiles = ['mcConvStat1', 'mcConvStat2', 'mcConvStat3', 'mcConvStat4'];
    tiles.forEach(function (id) {
      var t = el(id); if (!t) return;
      t.classList.remove('active');
      var wgt = t.querySelector('[data-model-weight]');
      /* ⚠️ THE HORIZON IS THE USER'S OWN ARITHMETIC OR IT IS ABSENT. No default years. */
      if (wgt) wgt.textContent = horizon ? '× ' + horizon : '';
    });
    if (status) {
      status.textContent = 'Convergence computing';
      status.classList.add('is-live');
    }
    if (badge) badge.classList.remove('show');
    /* ⛔ THE BADGE STARTS EMPTY AND IS FILLED FROM THE ANSWER, NEVER BEFORE IT. The Mock ships a
       fixture 79% that is present from the first frame. A probability rendered before the
       computation returns is the purest form of the defect this whole arc has been removing. */
    put('mcConvergenceSuccess', '');

    var paths = renderSwarmPaths() || [];
    var swarmGroup = el('mcConvergenceSwarmPaths');
    if (swarmGroup) swarmGroup.classList.remove('is-converged');
    overlay.hidden = false;
    overlay.classList.remove('is-resolving');
    w.requestAnimationFrame(function () {
      overlay.classList.add('open');
      /* ⛔ THE FAN-OUT STARTS AFTER THE PANEL IS VISIBLE, NOT BEFORE. A transition set on a
         display:none element still elapses, so starting it at render time meant a share of the
         motion was spent behind a hidden panel — the user arriving partway through an animation
         that had already been running. */
      w.requestAnimationFrame(function () { swarmDiverge(paths); });
    });

    /* ⛔ THE TILES ARE PACED ACROSS THE FAN-OUT, NOT CROWDED INTO THE FIRST SECOND. The Mock lights
       all four inside 840ms and then has nothing left to do for the remaining ten seconds of a real
       run. Four engines that appear to finish before the work has started is the same lie as a
       progress bar that completes early, told in a smaller font. */
    [300, 1000, 1700, 2400].forEach(function (ms, idx) {
      w.setTimeout(function () { var t = el(tiles[idx]); if (t) t.classList.add('active'); }, ms);
    });

    /* ⛔ AND THEN IT BREATHES RATHER THAN FREEZES. Once the swarm is fully fanned out the engine may
       still have ten seconds to run. A static picture during a wait reads as a hung screen, which
       is precisely what the Captain saw: "everything is just there immediately". */
    var breathe = w.setTimeout(function () {
      if (swarmGroup) swarmGroup.classList.add('is-holding');
    }, 2600 + 900);

    var started = Date.now();
    var close = function () {
      overlay.classList.remove('open');
      return new Promise(function (res) {
        w.setTimeout(function () { overlay.hidden = true; res(); }, 260);
      });
    };

    var stopHolding = function () {
      w.clearTimeout(breathe);
      if (swarmGroup) swarmGroup.classList.remove('is-holding');
    };

    return settled.then(function (value) {
      var wait = Math.max(0, SWARM_MIN_MS - (Date.now() - started));
      return new Promise(function (res) { w.setTimeout(res, wait); }).then(function () {
        /* ⭐ THE ANSWER PLAYS THE COLLAPSE. This is the whole point of the spindle: the second half
           of every path is drawn HERE, when the engine has returned, so the animation's ending IS
           the result rather than a timer that happened to expire. */
        stopHolding();
        overlay.classList.add('is-resolving');
        swarmConverge(paths);
        return new Promise(function (res2) { w.setTimeout(res2, 1250); }).then(function () {
        if (swarmGroup) swarmGroup.classList.add('is-converged');
        /* ⭐ THE PROBABILITY IS THE CONFIDENCE AT THE USER'S OWN TARGET SPEND — the same number
           the panel reports as Plan confidence, read off the same capacity curve. It is not a
           second metric invented for this screen, and it MUST NOT BE: two "success" figures on
           two screens in one flow is how a product starts contradicting itself. */
        var s = fromEngine(value, opts && opts.request);
        if (s && usable(s)) {
          var conf = successAtSpend(s, Number.isFinite(datumSpend) ? datumSpend : s.datum);
          put('mcConvergenceSuccess', pct(conf));
          if (badge) badge.classList.add('show');
        }
        if (status) { status.textContent = 'Convergence complete'; status.classList.remove('is-live'); }
        /* The result is readable for a beat before the panel leaves. */
        return new Promise(function (res3) { w.setTimeout(res3, 620); })
          .then(close).then(function () { return value; });
        });
      });
    }, function (err) {
      stopHolding();
      if (status) { status.textContent = 'Convergence complete'; status.classList.remove('is-live'); }
      return close().then(function () { throw err; });
    });
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
    runConvergence: runConvergence,
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
      renderSurvivor: renderSurvivor,
      taxY: taxY,
      taxCeiling: taxCeiling,
      curvePoints: function () { return CURVE_POINTS; },
      dataSlots: function () { return DATA_SLOTS.slice(); },
      emptyState: function () { return EMPTY_STATE; },
      datumSpend: function () { return datumSpend; },
      setDatumFromClientX: setDatumFromClientX
    }
  };
}(window, document));
