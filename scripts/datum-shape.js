/* datum-shape.js -- Datum FI S1 shape: shared engine + renderer
 * v1.0.0
 *
 * ONE source of truth for the S1 cone math + interactive shape rendering.
 * Mounted by sketch.html (Discover) and studio.html (Draft / Shape Mode).
 *
 * Public surface:
 *   DatumShape.compute(scenario)              -> pts at offset = yearsToGrow
 *   DatumShape.computeAt(scenario, offset)    -> pts at any offset
 *   DatumShape.buildPath(scenario, opts)      -> { dCeil, dFloor, dDatum, dCone,
 *                                                  ptsStart, ptsEnd,
 *                                                  ceilPts, floorPts, xStart, xEnd,
 *                                                  yLo, yHi, yTop, yBot, spY }
 *   DatumShape.classifyShapeState(ptsEnd)     -> { name, key, subZone, color, cls }
 *   DatumShape.gridLabels(yLo, yHi)           -> [yHi, ..., yLo] (5 ticks, top->bot)
 *   DatumShape.fmtSpend(v)                    -> "$1.23M" or "$45k"
 *   DatumShape.CONSTANTS                      -> { WR_CEIL, WR_FLOOR, DEFAULT_RATES, hScale }
 *   DatumShape.mount(svgRoot, hudRoot, opts)  -> handle
 *
 * Mirrors sketch.html getMathPoint (commit 5747ecc) EXACTLY:
 *   WR_CEIL=0.050, WR_FLOOR=0.028, _hScale = 0.6079/(1 - 1.034^-h),
 *   real-terms unless scenario.isNominal=true.
 *
 * buildPath returns COORDINATE-SPACE point arrays (ceilPts, floorPts as
 * "x y" strings) -- sketch.html's F89 vertex-wave loop reads these.
 *
 * Renderer operates ONLY on the passed svgRoot via root-scoped querySelector.
 * No global DOM queries. Host SVGs may use identical IDs without collision.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  var WR_CEIL  = 0.050;
  var WR_FLOOR = 0.028;

  var DEFAULT_RATES = {
    optimistic: { conservativeRate: 1.020, baselineRate: 1.040, upsideRate: 1.065 },
    average:    { conservativeRate: 1.015, baselineRate: 1.035, upsideRate: 1.055 },
    stress:     { conservativeRate: 1.005, baselineRate: 1.015, upsideRate: 1.035 }
  };

  function hScale(planThroughAge, activationAge) {
    var h = Math.max(15, (planThroughAge || 93) - (activationAge || 65));
    return 0.6079 / (1 - Math.pow(1.034, -h));
  }

  /* ── PURE ENGINE ────────────────────────────────────────────────────────── */

  /* Mirrors sketch.html L3242-3278 getMathPoint EXACTLY. */
  function computeAt(scenario, offset) {
    var s = scenario;
    var yearsToGrow = s.yearsToGrow;
    var rCon  = s.conservativeRate - 1;
    var rBase = s.baselineRate    - 1;
    var rUp   = s.upsideRate      - 1;

    var pFvCon  = s.portfolioVol * Math.pow(s.conservativeRate, offset);
    var pFvBase = s.portfolioVol * Math.pow(s.baselineRate,     offset);
    var pFvUp   = s.portfolioVol * Math.pow(s.upsideRate,       offset);

    var cFvCon  = rCon  > 0 ? (s.annualContrib / 1e6) * ((Math.pow(s.conservativeRate, offset) - 1) / rCon ) : (s.annualContrib / 1e6) * offset;
    var cFvBase = rBase > 0 ? (s.annualContrib / 1e6) * ((Math.pow(s.baselineRate,     offset) - 1) / rBase) : (s.annualContrib / 1e6) * offset;
    var cFvUp   = rUp   > 0 ? (s.annualContrib / 1e6) * ((Math.pow(s.upsideRate,       offset) - 1) / rUp  ) : (s.annualContrib / 1e6) * offset;

    var fvCon  = pFvCon  + cFvCon;
    var fvBase = pFvBase + cFvBase;
    var fvUp   = pFvUp   + cFvUp;

    var inflMult = s.isNominal ? Math.pow(1 + (s.inflRate || 0.03), offset) : 1;

    var t = yearsToGrow > 0 ? offset / yearsToGrow : 0;
    var _hScale = hScale(s.planThroughAge, s.activationAge);
    var _wrBase  = 0.04    * _hScale;
    var _wrFloor = WR_FLOOR * _hScale;
    var _wrCeil  = WR_CEIL  * _hScale;
    var wrCon = _wrBase - (_wrBase - _wrFloor) * t;
    var wrUp  = _wrBase + (_wrCeil  - _wrBase)  * t;

    var taxMult = (typeof s.taxMult === 'number') ? s.taxMult : 0.8;
    var floorSpend = fvCon * 1000 * wrCon * inflMult * taxMult;
    var ceilSpend  = fvUp  * 1000 * wrUp  * inflMult * taxMult;
    var datumSpend = s.targetSpend * inflMult;

    var datumCapM = datumSpend / (0.04 * _hScale) / 1000;
    return {
      fvCon: fvCon, fvBase: fvBase, fvUp: fvUp,
      floorSpend: floorSpend, ceilSpend: ceilSpend, datumSpend: datumSpend,
      datumCapM: datumCapM
    };
  }

  function compute(scenario) {
    return computeAt(scenario, scenario.yearsToGrow);
  }

  /* Build SVG path data + coordinate-space point arrays.
   * opts: { xStart=120, xEnd=650, steps=50, padPct=0.10, yPxTop=50, yPxBot=450, yMinFloor=60 }
   * Default geometry matches sketch.html S1 (viewBox 0 0 840 480, plot 120..650, y 50..450). */
  function buildPath(scenario, opts) {
    opts = opts || {};
    var xStart    = opts.xStart    != null ? opts.xStart    : 120;
    var xEnd      = opts.xEnd      != null ? opts.xEnd      : 650;
    var steps     = opts.steps     != null ? opts.steps     : 50;
    var padPct    = opts.padPct    != null ? opts.padPct    : 0.10;
    var yPxTop    = opts.yPxTop    != null ? opts.yPxTop    : 50;
    var yPxBot    = opts.yPxBot    != null ? opts.yPxBot    : 450;
    var yMinFloor = opts.yMinFloor != null ? opts.yMinFloor : 60;

    var yearsToGrow = Math.max(1, scenario.yearsToGrow);
    var ptsStart = computeAt(scenario, 0);
    var ptsEnd   = computeAt(scenario, yearsToGrow);

    var allV = [ptsStart.floorSpend, ptsEnd.ceilSpend, ptsEnd.floorSpend, ptsStart.datumSpend, ptsEnd.datumSpend];
    var vMin = Math.min.apply(null, allV);
    var vMax = Math.max.apply(null, allV);
    var paddedRange = Math.max((vMax - vMin) * (1 + padPct), yMinFloor);
    var mid = (vMin + vMax) / 2;
    var yLo = Math.max(0, mid - paddedRange / 2);
    var yHi = mid + paddedRange / 2;
    var yPx = yPxBot - yPxTop;

    function spY(v) {
      if (yHi <= yLo) return (yPxTop + yPxBot) / 2;
      var clamped = Math.max(yLo, Math.min(yHi, v));
      return yPxBot - ((clamped - yLo) / (yHi - yLo)) * yPx;
    }

    var dCeil  = 'M ' + xStart + ' ' + spY(ptsStart.ceilSpend);
    var dFloor = 'M ' + xStart + ' ' + spY(ptsStart.floorSpend);
    var dDatum = 'M ' + xStart + ' ' + spY(ptsStart.datumSpend);
    var ceilPts  = [];
    var floorPts = [];

    for (var i = 0; i <= steps; i++) {
      var off = (i / steps) * yearsToGrow;
      var x = xStart + (i / steps) * (xEnd - xStart);
      var pt = computeAt(scenario, off);
      var yC = spY(pt.ceilSpend);
      var yF = spY(pt.floorSpend);
      var yD = spY(pt.datumSpend);
      if (i > 0) {
        dCeil  += ' L ' + x + ' ' + yC;
        dFloor += ' L ' + x + ' ' + yF;
        dDatum += ' L ' + x + ' ' + yD;
      }
      ceilPts.push(x + ' ' + yC);
      floorPts.unshift(x + ' ' + yF);
    }
    var dCone = 'M ' + ceilPts[0] + ' ' +
      ceilPts.map(function (p) { return 'L ' + p; }).join(' ') + ' ' +
      floorPts.map(function (p) { return 'L ' + p; }).join(' ') + ' Z';

    return {
      dCeil: dCeil, dFloor: dFloor, dDatum: dDatum, dCone: dCone,
      ptsStart: ptsStart, ptsEnd: ptsEnd,
      ceilPts: ceilPts, floorPts: floorPts,
      xStart: xStart, xEnd: xEnd,
      yLo: yLo, yHi: yHi, yTop: yPxTop, yBot: yPxBot,
      spY: spY
    };
  }

  /* Bare shape-state classifier -- returns key/name/subZone/color/cls only.
   * Rich narrative copy (physics/action/physicsShort/actionShort + pinned cases)
   * stays in sketch.html's getShapeStateObj (V13 copy lives there).
   * sketch.html merges this output with its rich copy via a thin wrapper. */
  function classifyShapeState(pts) {
    var spending   = pts.datumSpend;
    var floorSpend = pts.floorSpend;
    var ceilSpend  = pts.ceilSpend;

    if (spending >= ceilSpend) {
      var overRatio = (spending - ceilSpend) / ceilSpend;
      return { name: 'OVEREXTENDED', key: 'overextended',
        subZone: overRatio < 0.15 ? 'ENTRY' : 'STRUCTURAL',
        color: 'var(--danger-red)', cls: 'shape-state-overextended' };
    }
    if (spending < floorSpend) {
      var abundantRatio = spending / floorSpend;
      return { name: 'ABUNDANT', key: 'abundant',
        subZone: abundantRatio >= 0.75 ? 'JUST_BELOW' : 'WELL_BELOW',
        color: 'var(--blue-safe)', cls: 'shape-state-abundant' };
    }
    if (spending <= floorSpend * 1.15) {
      var groundRatio = (spending - floorSpend) / floorSpend;
      return { name: 'GROUNDED', key: 'grounded',
        subZone: groundRatio < 0.05 ? 'TIGHT' : 'STABLE',
        color: 'var(--purple-grounded)', cls: 'shape-state-grounded' };
    }
    if (spending >= ceilSpend * 0.85) {
      var stretchRatio = spending / ceilSpend;
      return { name: 'STRETCHED', key: 'stretched',
        subZone: stretchRatio < 0.93 ? 'STANDARD' : 'HIGH_END',
        color: 'var(--orange-warning)', cls: 'shape-state-stretched' };
    }
    var w = ceilSpend - floorSpend;
    var position = w > 0 ? (spending - floorSpend) / w : 0.5;
    var sub = position < 0.33 ? 'FLOOR_SIDE' : position <= 0.67 ? 'CENTERED' : 'CEILING_SIDE';
    return { name: 'EXPANSIVE', key: 'expansive', subZone: sub,
      color: 'var(--teal-mid)', cls: 'shape-state-expansive' };
  }

  /* Y-axis grid label values, top -> bottom (5 ticks).
   * sketch.html grid-lbl-1 = top ($400k initial), grid-lbl-5 = bottom ($0k initial). */
  function gridLabels(yLo, yHi) {
    return [
      yHi,
      yHi - (yHi - yLo) * 0.25,
      (yHi + yLo) / 2,
      yLo + (yHi - yLo) * 0.25,
      yLo
    ];
  }

  /* Format a $/yr spend value the way sketch.html does:
   *   >= 1000 -> "$1.23M"  (2dp, trailing .00 stripped)
   *   <  1000 -> "$45k"    (integer, en-US commas) */
  function fmtSpend(v) {
    if (v >= 1000) {
      return '$' + (v / 1000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    return '$' + Math.round(v).toLocaleString('en-US') + 'k';
  }

  /* Y-axis label (sketch uses "$400k" / "$1.5M" style at thresholds). */
  function fmtYLabel(v) {
    if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'M';
    return '$' + Math.round(v) + 'k';
  }

  /* ── RENDERER ───────────────────────────────────────────────────────────── */

  /* mount(svgRoot, hudRoot, opts) -> handle
   *
   * opts:
   *   initialScenario          : scenario obj (optional; pass via update() if absent)
   *   xStart, xEnd, steps      : path build geometry (defaults match sketch S1)
   *   yPxTop, yPxBot           : y-pixel range in svg coords (defaults 50, 450)
   *   stateHost                : element to receive shape-state-* classes (defaults to svgRoot)
   *   enableDrag               : default true; wires #datum-dragger pointer events
   *   enableHoverScrubber      : default true; wires mousemove -> scrubber + tooltips
   *   enableShapeStateClass    : default true; toggles shape-state-* on stateHost
   *   enableGridLabels         : default true; writes #grid-lbl-1..5
   *   enableAgeAxis            : default true; writes #time-start, #time-end
   *   enableEndNodes           : default true; positions #node-ceil/floor/datum + lbls
   *   onUpdate(build)          : after each update, receives buildPath() output
   *   onShapeStateChange(stateObj, ptsEnd, ptsStart)
   *   onHoverScrub({hoverAge, pts}) : during scrubber drag
   *   onDatumChange(spendVal)  : during datum drag (host should mirror to its slider)
   *   canDrag()                : default ()=>true; gate datum drag (sketch uses _shapeArmed)
   *   dragClampPx              : default 70; px above ceiling (in svg viewport units) below
   *                              which datum can't be dragged
   *   dragCeilingY             : default 68; svg-y of the ceiling clamp reference
   *   formatTooltip(role, pt)  : optional override; default uses fvUp/fvCon/datumCapM */
  function mount(svgRoot, hudRoot, opts) {
    opts = opts || {};

    var pathOpts = {
      xStart:    opts.xStart    != null ? opts.xStart    : 120,
      xEnd:      opts.xEnd      != null ? opts.xEnd      : 650,
      steps:     opts.steps     != null ? opts.steps     : 50,
      padPct:    opts.padPct    != null ? opts.padPct    : 0.10,
      yPxTop:    opts.yPxTop    != null ? opts.yPxTop    : 50,
      yPxBot:    opts.yPxBot    != null ? opts.yPxBot    : 450,
      yMinFloor: opts.yMinFloor != null ? opts.yMinFloor : 60
    };

    var enableDrag             = opts.enableDrag             !== false;
    var enableHoverScrubber    = opts.enableHoverScrubber    !== false;
    var enableShapeStateClass  = opts.enableShapeStateClass  !== false;
    var enableGridLabels       = opts.enableGridLabels       !== false;
    var enableAgeAxis          = opts.enableAgeAxis          !== false;
    var enableEndNodes         = opts.enableEndNodes         !== false;
    var enableHudReadout       = opts.enableHudReadout       !== false;

    var stateHost = opts.stateHost || svgRoot;
    var canDrag = typeof opts.canDrag === 'function' ? opts.canDrag : function () { return true; };
    var dragClampPx  = opts.dragClampPx  != null ? opts.dragClampPx  : 70;
    var dragCeilingY = opts.dragCeilingY != null ? opts.dragCeilingY : 68;

    var STATE_CLASSES = [
      'shape-state-overextended',
      'shape-state-stretched',
      'shape-state-expansive',
      'shape-state-grounded',
      'shape-state-abundant'
    ];

    function $(id)  { return svgRoot ? svgRoot.querySelector('#' + id) : null; }
    function $h(id) { return hudRoot ? hudRoot.querySelector('#' + id) : null; }
    function setAttr(id, attr, val) { var el = $(id); if (el) el.setAttribute(attr, val); }
    function setText(id, val)       { var el = $(id); if (el) el.textContent = val; }
    function setHudText(id, val)    { var el = $h(id); if (el) el.textContent = val; }

    var currentScenario = opts.initialScenario || null;
    var lastBuild = null;
    var listeners = [];   // {target, ev, fn} for teardown

    function on(target, ev, fn) {
      target.addEventListener(ev, fn);
      listeners.push({ target: target, ev: ev, fn: fn });
    }

    /* ── update: rebuild paths + reposition nodes + apply shape-state ───── */
    function update(scenario) {
      if (scenario) currentScenario = scenario;
      if (!currentScenario) return null;
      var b = buildPath(currentScenario, pathOpts);
      lastBuild = b;

      /* Solid + mask + art paths */
      setAttr('ceil-line',         'd', b.dCeil);
      setAttr('floor-line',        'd', b.dFloor);
      setAttr('datum-line',        'd', b.dDatum);
      setAttr('datum-hitbox-line', 'd', b.dDatum);
      setAttr('cone-area',         'd', b.dCone);
      setAttr('clip-cone-path',    'd', b.dCone);
      setAttr('m-ceil',            'd', b.dCeil);
      setAttr('m-floor',           'd', b.dFloor);
      setAttr('m-datum',           'd', b.dDatum);
      setAttr('art-ceil',          'd', b.dCeil);
      setAttr('art-floor',         'd', b.dFloor);
      setAttr('art-datum',         'd', b.dDatum);
      var cd = $('ceil-line-dashed');  if (cd) cd.setAttribute('d', b.dCeil);
      var fd = $('floor-line-dashed'); if (fd) fd.setAttribute('d', b.dFloor);

      var spY    = b.spY;
      var ptsEnd = b.ptsEnd;
      var ptsStart = b.ptsStart;
      var yCE = spY(ptsEnd.ceilSpend);
      var yFE = spY(ptsEnd.floorSpend);
      var yDE = spY(ptsEnd.datumSpend);

      if (enableEndNodes) {
        var nc = $('node-ceil');    if (nc) { nc.setAttribute('cx', b.xEnd);   nc.setAttribute('cy', yCE); }
        var nf = $('node-floor');   if (nf) { nf.setAttribute('cx', b.xEnd);   nf.setAttribute('cy', yFE); }
        var nd = $('node-datum');   if (nd) { nd.setAttribute('cx', b.xEnd);   nd.setAttribute('cy', yDE); }
        var dc = $('datum-circle'); if (dc) { dc.setAttribute('cy', spY(ptsStart.datumSpend)); }
        var cl = $('ceil-lbl');     if (cl) { cl.setAttribute('x', b.xEnd + 15); cl.setAttribute('y', yCE + 4); }
        var fl = $('floor-lbl');    if (fl) { fl.setAttribute('x', b.xEnd + 15); fl.setAttribute('y', yFE + 4); }
        var dl = $('datum-lbl');    if (dl) { dl.setAttribute('x', b.xEnd + 15); dl.setAttribute('y', yDE + 4); }
      }

      if (enableGridLabels) {
        var grids = gridLabels(b.yLo, b.yHi);
        for (var i = 0; i < 5; i++) {
          var gl = $('grid-lbl-' + (i + 1));
          if (gl) gl.textContent = fmtYLabel(grids[i]);
        }
      }

      if (enableAgeAxis) {
        setText('time-start', 'AGE ' + currentScenario.currentAge);
        setText('time-end',   'RETIRE: ' + currentScenario.activationAge);
      }

      var stateObj = classifyShapeState(ptsEnd);
      if (enableShapeStateClass && stateHost && stateHost.classList) {
        for (var s = 0; s < STATE_CLASSES.length; s++) stateHost.classList.remove(STATE_CLASSES[s]);
        stateHost.classList.add(stateObj.cls);
      }

      if (enableHudReadout && hudRoot) {
        var nm = $h('shape-state-name');
        if (nm) { nm.textContent = stateObj.name; nm.style.color = stateObj.color; }
        var cv = $h('sh-ceil-val');  if (cv) cv.textContent = fmtSpend(ptsEnd.ceilSpend)  + ' / yr';
        var dv = $h('sh-datum-val'); if (dv) dv.textContent = fmtSpend(ptsEnd.datumSpend) + ' / yr';
        var fv = $h('sh-floor-val'); if (fv) fv.textContent = fmtSpend(ptsEnd.floorSpend) + ' / yr';
      }

      if (typeof opts.onShapeStateChange === 'function') opts.onShapeStateChange(stateObj, ptsEnd, ptsStart);
      if (typeof opts.onUpdate === 'function') opts.onUpdate(b);

      return b;
    }

    /* ── hover scrubber + endpoint tooltips ────────────────────────────── */
    function showScrubber(svgX) {
      if (!currentScenario || !lastBuild) return;
      if (currentScenario.yearsToGrow === 0) return;
      var sg = $('scrubber-group');
      if (!sg) return;

      var offsetRatio = (svgX - pathOpts.xStart) / (pathOpts.xEnd - pathOpts.xStart);
      offsetRatio = Math.max(0, Math.min(1, offsetRatio));
      var offsetYears = offsetRatio * currentScenario.yearsToGrow;
      var hoverAge = Math.round(currentScenario.currentAge + offsetYears);
      var pts = computeAt(currentScenario, offsetYears);
      var spY = lastBuild.spY;
      var yC = spY(pts.ceilSpend), yF = spY(pts.floorSpend), yD = spY(pts.datumSpend);

      var nc = $('node-ceil');  if (nc) { nc.setAttribute('cx', svgX); nc.setAttribute('cy', yC); }
      var nf = $('node-floor'); if (nf) { nf.setAttribute('cx', svgX); nf.setAttribute('cy', yF); }
      var nd = $('node-datum'); if (nd) { nd.setAttribute('cx', svgX); nd.setAttribute('cy', yD); }
      var sl = $('scrubber-line'); if (sl) { sl.setAttribute('x1', svgX); sl.setAttribute('x2', svgX); }
      sg.style.opacity = 1;

      ['ceil-lbl', 'floor-lbl', 'datum-lbl'].forEach(function (id) {
        var el = $(id); if (el) el.style.opacity = 0;
      });

      _tooltip('ceil',  hoverAge, pts.fvUp,     pts.ceilSpend,  svgX, yC);
      _tooltip('floor', hoverAge, pts.fvCon,    pts.floorSpend, svgX, yF);
      _tooltip('datum', hoverAge, pts.datumCapM, pts.datumSpend, svgX, yD);

      if (typeof opts.onHoverScrub === 'function') opts.onHoverScrub({ hoverAge: hoverAge, pts: pts });
    }

    function hideScrubber() {
      var sg = $('scrubber-group'); if (sg) sg.style.opacity = 0;
      ['ceil-lbl', 'floor-lbl', 'datum-lbl'].forEach(function (id) {
        var el = $(id); if (el) el.style.opacity = 1;
      });
      if (!lastBuild) return;
      var ptsEnd = lastBuild.ptsEnd, spY = lastBuild.spY;
      var nc = $('node-ceil');  if (nc) { nc.setAttribute('cx', lastBuild.xEnd); nc.setAttribute('cy', spY(ptsEnd.ceilSpend)); }
      var nf = $('node-floor'); if (nf) { nf.setAttribute('cx', lastBuild.xEnd); nf.setAttribute('cy', spY(ptsEnd.floorSpend)); }
      var nd = $('node-datum'); if (nd) { nd.setAttribute('cx', lastBuild.xEnd); nd.setAttribute('cy', spY(ptsEnd.datumSpend)); }
    }

    function _tooltip(role, age, fvOrCap, spend, svgX, svgY) {
      var ageEl  = $('tt-age-'  + role); if (ageEl)  ageEl.textContent  = age;
      var dataEl = $('tt-data-' + role);
      if (dataEl) {
        if (typeof opts.formatTooltip === 'function') {
          dataEl.textContent = opts.formatTooltip(role, { age: age, fvOrCap: fvOrCap, spend: spend });
        } else if (role === 'datum') {
          dataEl.textContent = '| ' + fmtSpend(spend) + '/yr';
        } else {
          var fvStr = '$' + (fvOrCap).toFixed(2).replace(/\.00$/, '') + 'M';
          dataEl.textContent = '| ' + fvStr + ' / ' + fmtSpend(spend) + ' yr';
        }
      }
      /* Reposition the tooltip group near the cursor (sketch tooltips translate to scrub x/y) */
      var g = $('tt-g-' + role);
      if (g) g.setAttribute('transform', 'translate(' + svgX + ',' + svgY + ')');
    }

    if (enableHoverScrubber && svgRoot) {
      on(svgRoot, 'mousemove', function (e) {
        if (!currentScenario || !lastBuild) return;
        var rect = svgRoot.getBoundingClientRect();
        var vb   = svgRoot.viewBox.baseVal;
        var vbW  = vb && vb.width  ? vb.width  : 840;
        var svgX = (e.clientX - rect.left) / rect.width * vbW;
        if (svgX < pathOpts.xStart || svgX > pathOpts.xEnd) { hideScrubber(); return; }
        showScrubber(svgX);
      });
      on(svgRoot, 'mouseleave', hideScrubber);
    }

    /* ── draggable datum ───────────────────────────────────────────────── */
    if (enableDrag) {
      var dragger = $('datum-dragger');
      if (dragger) {
        var isDragging = false;
        var dragRect = null;

        on(dragger, 'pointerdown', function (e) {
          if (e.button !== 0) return;
          if (!canDrag()) return;
          isDragging = true;
          dragRect = svgRoot.getBoundingClientRect();
          dragger.classList.add('datum-dragging');
          if (dragger.setPointerCapture) dragger.setPointerCapture(e.pointerId);
          e.preventDefault();
        });
        on(dragger, 'pointermove', function (e) {
          if (!isDragging || !lastBuild) return;
          var vb  = svgRoot.viewBox.baseVal;
          var vbH = vb && vb.height ? vb.height : 480;
          /* Clamp clientY so datum can't go above (ceiling - dragClampPx) in screen units. */
          var ceilingScreenY = dragRect.top + (dragCeilingY / vbH) * dragRect.height;
          var clampedClientY = Math.max(e.clientY, ceilingScreenY - dragClampPx);
          var relY = (clampedClientY - dragRect.top) / dragRect.height * vbH;
          var pct  = Math.max(0, Math.min(1, (relY - lastBuild.yTop) / (lastBuild.yBot - lastBuild.yTop)));
          var spendVal = lastBuild.yHi - pct * (lastBuild.yHi - lastBuild.yLo);
          spendVal = Math.max(20, Math.min(1000, spendVal));
          if (typeof opts.onDatumChange === 'function') opts.onDatumChange(spendVal);
        });
        on(dragger, 'pointerup',     function () { isDragging = false; dragger.classList.remove('datum-dragging'); });
        on(dragger, 'pointercancel', function () { isDragging = false; dragger.classList.remove('datum-dragging'); });
      }
    }

    if (currentScenario) update(currentScenario);

    return {
      VERSION: VERSION,
      update: update,
      getLastBuild: function () { return lastBuild; },
      /* Returns coordinate-space point arrays + xStart -- required by sketch.html
       * F89 vertex-wave loop. Do NOT change shape without updating F89 plumbing. */
      getLastPointArrays: function () {
        return lastBuild ? { ceilPts: lastBuild.ceilPts.slice(),
                             floorPts: lastBuild.floorPts.slice(),
                             xStart: lastBuild.xStart } : null;
      },
      showScrubber: showScrubber,
      hideScrubber: hideScrubber,
      classifyShapeState: classifyShapeState,
      compute: compute,
      computeAt: computeAt,
      buildPath: buildPath,
      teardown: function () {
        for (var i = 0; i < listeners.length; i++) {
          listeners[i].target.removeEventListener(listeners[i].ev, listeners[i].fn);
        }
        listeners = [];
      }
    };
  }

  global.DatumShape = {
    VERSION:            VERSION,
    compute:            compute,
    computeAt:          computeAt,
    buildPath:          buildPath,
    classifyShapeState: classifyShapeState,
    gridLabels:         gridLabels,
    fmtSpend:           fmtSpend,
    fmtYLabel:          fmtYLabel,
    CONSTANTS: {
      WR_CEIL:        WR_CEIL,
      WR_FLOOR:       WR_FLOOR,
      DEFAULT_RATES:  DEFAULT_RATES,
      hScale:         hScale
    },
    mount:              mount
  };
}(typeof window !== 'undefined' ? window : this));
