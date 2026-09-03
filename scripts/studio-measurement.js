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
  var DATA_SLOTS = ['mcClimate', 'mcSuccess', 'mcHorizon', 'mcFloorValue',
    'mcDatumValue', 'mcDatumSuccess', 'mcCeilingValue', 'mcAxisMin', 'mcAxisMax',
    'mcGuardrail', 'mcTerminal', 'mcFailure', 'mcModeCode', 'mcRangeWidth', 'mcMiniDatum'];

  function clearData() {
    for (var i = 0; i < DATA_SLOTS.length; i++) put(DATA_SLOTS[i], '');
    var line = el('mcCurveLine'), area = el('mcCurveArea'), marks = el('mcCurveMarkers');
    if (line) line.removeAttribute('d');
    if (area) area.removeAttribute('d');
    if (marks) marks.innerHTML = '';
  }

  /* ⛔ THE EMPTY STATE IS A DISPLAY STATE, NOT AN ERROR. capacity_curve is Optional on the engine
     and absent on any rollback, so "no data" is a NORMAL condition this panel must render calmly.
     ⚠️ It occupies mcFootCopy — an EXISTING authored copy slot the render already writes — rather
        than a new element, so the port adds no markup v89 does not have. */
  function renderEmpty() {
    clearData();
    put('mcFootCopy', EMPTY_STATE);
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
    put('mcMiniDatum', money(spend));

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

  function open() { var o = el('mcOverlay'); if (!o) return; o.hidden = false; o.classList.add('open'); }
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
      dataSlots: function () { return DATA_SLOTS.slice(); },
      emptyState: function () { return EMPTY_STATE; },
      datumSpend: function () { return datumSpend; },
      setDatumFromClientX: setDatumFromClientX
    }
  };
}(window, document));
