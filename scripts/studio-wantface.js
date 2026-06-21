/* studio-wantface.js — Studio mode-shape BACK FACE controller (Step-3 Part B, surrounds 1-3 + morph).
 *
 * Consumes the LOCKED shared contract ONLY: DatumShape.buildDiff(have, want, FRONT) +
 * DatumShape.scales. No engine edits. mount() (front Have face) is untouched.
 *   (1) Want-face d2-sliders + ghost marks  <- d.have.positions
 *   (2) CURRENT->TEST HUD + 109-case copy    <- d.have/d.want endpoints + d.copy (shared getPinnedCaseObj)
 *   (3) signed TENSION/RELIEF bars           <- d.tension[]  (updateTensionVisuals ported verbatim, below)
 *   + canvas paths on d.sharedY, + 90deg cross-fade morph (Have->Want) on flip; reduced-motion -> instant.
 * Surround (4) What-It-Takes lands after the populateZoneC shared extraction (Step 2).
 */
(function () {
  'use strict';
  var FRONT = { xStart: 120, xEnd: 650, steps: 50, yPxTop: 50, yPxBot: 450 };
  var LV = ['age', 'retire', 'plan', 'portfolio', 'datum', 'contrib'];

  function $(id) { return document.getElementById(id); }
  function DS() { return window.DatumShape || null; }
  function SC() { var d = DS(); return (d && d.scales) || null; }
  function inner() { return $('shape-flip-inner'); }
  function fmt(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + Math.round(v) + 'k'; }
  function fmtCapK(k) { return k >= 1000 ? '$' + (k / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + Math.round(k) + 'k'; }

  var _haveScn = null, _wantScn = null, _wantGeo = null, _wantInit = false, _lastDiff = null, _morphRAF = 0, _wired = false, _haveSliderPos = null;
  // surround 4: boundary-pull overrides on the Want canvas (Step-4 = ceil/floor/datum endpoint
  // drags + SP starting-point ratio-scale). ceil/floor/datumDelta feed buildDiff's want endpoints;
  // portDelta folds into the GEO scenario for the geometry (see renderWantFace), never into _wantScn.
  var _wantOverrides = { ceilDelta: 0, floorDelta: 0, datumDelta: 0, portDelta: 0, isDirty: false };
  var _wantAcceptFromState = null, _dragActive = null, _spHandleY = 240, _spDragBase = null;
  function _resetOverrides() { _wantOverrides.ceilDelta = 0; _wantOverrides.floorDelta = 0; _wantOverrides.datumDelta = 0; _wantOverrides.portDelta = 0; _wantOverrides.isDirty = false; }

  /* baseline d2-slider positions for the frozen Have — recomputed each Want entry so the
   * gold/red plan-strength fill reads zero-diff at seed (no float round-trip noise). */
  function _computeHavePos() {
    var sc = SC(); if (!sc || !_haveScn) { _haveSliderPos = null; return; }
    _haveSliderPos = {
      'd2-slider-age': _haveScn.currentAge,
      'd2-slider-activation': _haveScn.activationAge,
      'd2-slider-plan-through': _haveScn.planThroughAge || 93,
      'd2-slider-portfolio': sc.portValToPos(_haveScn.portfolioVol),
      'd2-slider-datum': sc.datumValToPos(_haveScn.targetSpend),
      'd2-slider-contrib': sc.contribValToPos(_haveScn.annualContrib || 0)
    };
  }

  /* Boundary-aware strain fill per Want slider (Tension Redesign, step 5). Each lever's
   * ISOLATED Have->Want effect is read through the SAME DatumShape.buildTension the bars use,
   * so the toggle color and the bars never disagree:
   *   structural lever (age/retire/plan/portfolio/contrib) weakens BOTH ceiling+floor ->
   *     gold->red gradient (multi-boundary strain); strengthens both -> blue relief.
   *   datum lever -> teal (heavier spend = tension) / blue (lighter = relief).
   *   no move from the Have baseline -> neutral.
   * Plain-spoken language: gold/red = you're straining your plan, blue = you're easing it,
   * teal = you're moving your spending target. */
  var _SLF = { 'd2-slider-age': 'currentAge', 'd2-slider-activation': 'activationAge', 'd2-slider-plan-through': 'planThroughAge', 'd2-slider-portfolio': 'portfolioVol', 'd2-slider-contrib': 'annualContrib', 'd2-slider-datum': 'targetSpend' };
  function _colorWantSliders() {
    if (!_haveSliderPos || !_haveScn) return;
    var d = DS(); if (!d || typeof d.buildTension !== 'function') return;
    var GOLD = 'var(--gold)', RED = 'var(--danger-red)', TEAL = 'var(--teal-mid)', BLUE = 'var(--blue-safe)', NEU = 'rgba(93,202,165,0.40)', TRK = 'rgba(255,255,255,0.14)';
    var EPS = 1e-6;
    var endOf = function (s) { return d.computeAt(s, Math.max(1, s.activationAge - s.currentAge)); };
    var haveEnd = endOf(_haveScn);
    var want = _wantFromSliders();
    var fill = function (a, b, pct) { return 'linear-gradient(90deg,' + a + ' 0%,' + b + ' ' + pct + '%,' + TRK + ' ' + pct + '%,' + TRK + ' 100%)'; };
    Object.keys(_SLF).forEach(function (id) {
      var el = $(id); if (!el || _haveSliderPos[id] == null) return;
      var mn = parseFloat(el.min), mx = parseFloat(el.max), v = parseFloat(el.value);
      var pct = mx > mn ? Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100)) : 0;
      // isolate THIS lever: the Have scenario with only this one field moved to its Want value
      var solo = {}; for (var k in _haveScn) { if (Object.prototype.hasOwnProperty.call(_haveScn, k)) solo[k] = _haveScn[k]; }
      solo[_SLF[id]] = want[_SLF[id]];
      solo.activationAge = Math.max(solo.currentAge + 1, solo.activationAge);
      solo.yearsToGrow = Math.max(1, solo.activationAge - solo.currentAge);
      var t = d.buildTension(haveEnd, endOf(solo));
      var bg;
      if (id === 'd2-slider-datum') {
        var col = t.datum > EPS ? TEAL : t.datum < -EPS ? BLUE : NEU;
        bg = fill(col, col, pct);
      } else if (t.ceil > EPS && t.floor > EPS) {
        bg = fill(GOLD, RED, pct);          // structural strain on BOTH boundaries
      } else if (t.ceil < -EPS && t.floor < -EPS) {
        bg = fill(BLUE, BLUE, pct);         // structural relief
      } else {
        bg = fill(NEU, NEU, pct);           // at baseline / negligible
      }
      el.style.background = bg;
    });
  }

  /* ── want scenario from the d2-sliders (market/tax/infl inherited from Have) ── */
  function _wantFromSliders() {
    var sc = SC();
    var ival = function (id, def) { var el = $(id); return el ? (parseInt(el.value, 10) || def) : def; };
    var out = {
      currentAge: ival('d2-slider-age', 40), activationAge: ival('d2-slider-activation', 65),
      planThroughAge: ival('d2-slider-plan-through', 93),
      portfolioVol: 0.75, annualContrib: 25000, targetSpend: 100,
      conservativeRate: 1.015, baselineRate: 1.035, upsideRate: 1.055,
      isNominal: false, taxMult: 0.8, inflRate: 0.03
    };
    if (sc) {
      var sp = $('d2-slider-portfolio'); if (sp) out.portfolioVol = sc.portPosToVal(parseInt(sp.value, 10));
      var sct = $('d2-slider-contrib'); if (sct) out.annualContrib = sc.contribPosToVal(parseInt(sct.value, 10));
      var sd = $('d2-slider-datum'); if (sd) out.targetSpend = sc.datumPosToVal(parseInt(sd.value, 10));
    }
    out.activationAge = Math.max(out.currentAge + 1, out.activationAge);
    out.yearsToGrow = Math.max(1, out.activationAge - out.currentAge);
    var mkt = document.querySelector('input[name="d2-market"]:checked');
    var par = mkt ? mkt.value : 'average';
    var d = DS(), rates = (d && d.CONSTANTS && d.CONSTANTS.DEFAULT_RATES) || null;
    if (rates && rates[par]) { out.conservativeRate = rates[par].conservativeRate; out.baselineRate = rates[par].baselineRate; out.upsideRate = rates[par].upsideRate; }
    if (_haveScn) { out.taxMult = _haveScn.taxMult; out.isNominal = _haveScn.isNominal; }
    return out;
  }

  /* ── seed the d2-sliders FROM a scenario (first Want entry -> want starts = have) ── */
  function _seedSliders(s) {
    var sc = SC(); if (!sc) return;
    var set = function (id, v) { var el = $(id); if (el) el.value = String(v); };
    set('d2-slider-age', s.currentAge);
    set('d2-slider-activation', s.activationAge);
    set('d2-slider-plan-through', s.planThroughAge || 93);
    var sp = $('d2-slider-portfolio'); if (sp) { sp.value = sc.portValToPos(s.portfolioVol); sp.dataset.exactVal = String(Math.round(s.portfolioVol * 1e6)); }
    var sct = $('d2-slider-contrib'); if (sct) { sct.value = sc.contribValToPos(s.annualContrib || 0); sct.dataset.exactVal = String(Math.round(s.annualContrib || 0)); }
    var sd = $('d2-slider-datum'); if (sd) { sd.value = sc.datumValToPos(s.targetSpend); sd.dataset.exactVal = String(Math.round(s.targetSpend * 1000)); }
    var par = s.baselineRate === 1.040 ? 'optimistic' : s.baselineRate === 1.015 ? 'stress' : 'average';
    var r = document.querySelector('input[name="d2-market"][value="' + par + '"]'); if (r) r.checked = true;
    _updateLabels();
  }

  function _updateLabels() {
    var sc = SC();
    var t = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    var iv = function (id) { var el = $(id); return el ? parseInt(el.value, 10) : 0; };
    t('d2-val-age', iv('d2-slider-age') + ' yrs');
    t('d2-val-activation', iv('d2-slider-activation') + ' yrs');
    t('d2-val-plan-through', iv('d2-slider-plan-through') + ' yrs');
    if (sc) {
      var sp = $('d2-slider-portfolio'); if (sp) t('d2-val-portfolio', fmtCapK(Math.round(sc.portPosToVal(parseInt(sp.value, 10)) * 1000)));
      var sct = $('d2-slider-contrib'); if (sct) t('d2-val-contrib', '$' + Math.round(sc.contribPosToVal(parseInt(sct.value, 10))).toLocaleString('en-US'));
      var sd = $('d2-slider-datum'); if (sd) { var dk = Math.round(sc.datumPosToVal(parseInt(sd.value, 10))); t('d2-val-datum', (dk >= 1000 ? '$' + (dk / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + dk + 'k') + ' / yr'); }
    }
  }

  /* P4: compact muted "was <have> →" prior-value beside each live Want value. The Have
   * baseline is frozen for the session (set on Want entry), so this is static while the
   * user reshapes — it replaces the separate Have mirror column. */
  function _updateWasReadouts() {
    var t = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    var keys = ['age', 'activation', 'plan-through', 'portfolio', 'contrib', 'datum'];
    if (!_haveScn) { keys.forEach(function (k) { t('swf-was-' + k, ''); }); return; }
    var arrow = ' →';
    t('swf-was-age', 'was ' + Math.round(_haveScn.currentAge) + arrow);
    t('swf-was-activation', 'was ' + Math.round(_haveScn.activationAge) + arrow);
    t('swf-was-plan-through', 'was ' + Math.round(_haveScn.planThroughAge || 93) + arrow);
    t('swf-was-portfolio', 'was ' + fmtCapK(Math.round((_haveScn.portfolioVol || 0) * 1000)) + arrow);
    t('swf-was-contrib', 'was $' + Math.round(_haveScn.annualContrib || 0).toLocaleString('en-US') + arrow);
    var ts = Math.round(_haveScn.targetSpend || 0);
    t('swf-was-datum', 'was ' + (ts >= 1000 ? '$' + (ts / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + ts + 'k') + arrow);
  }

  /* ── geometry helpers ── */
  function _spY(sy) {
    var lo = sy.yLo, hi = sy.yHi, top = FRONT.yPxTop, bot = FRONT.yPxBot;
    return function (v) { if (hi <= lo) return (top + bot) / 2; var c = Math.max(lo, Math.min(hi, v)); return bot - ((c - lo) / (hi - lo)) * (bot - top); };
  }
  function _yToSpend(sy, y) { // inverse of _spY on a shared Y-domain
    var lo = sy.yLo, hi = sy.yHi, top = FRONT.yPxTop, bot = FRONT.yPxBot;
    if (bot <= top) return lo;
    return lo + ((bot - y) / (bot - top)) * (hi - lo);
  }
  function _parse(d) { // "M x y L x y L x y" -> [[x,y],...]
    var out = [], re = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, m;
    while ((m = re.exec(d)) !== null) out.push([parseFloat(m[1]), parseFloat(m[2])]);
    return out;
  }
  function _lineFrom(pts) { return 'M ' + pts[0][0] + ' ' + pts[0][1] + pts.slice(1).map(function (p) { return ' L ' + p[0] + ' ' + p[1]; }).join(''); }
  function _coneFrom(ceil, floor) { // floor drawn back-to-front to close the cone
    var rev = floor.slice().reverse();
    return 'M ' + ceil[0][0] + ' ' + ceil[0][1] + ceil.slice(1).map(function (p) { return ' L ' + p[0] + ' ' + p[1]; }).join('') + rev.map(function (p) { return ' L ' + p[0] + ' ' + p[1]; }).join('') + ' Z';
  }
  function _lerpPts(a, b, t) { var o = []; for (var i = 0; i < b.length; i++) o.push([b[i][0], a[i][1] + (b[i][1] - a[i][1]) * t]); return o; }
  function _lerp(a, b, t) { return a + (b - a) * t; }

  /* ── paint the d2-canvas from a buildDiff result; t=1 exact want, t<1 morph from have ── */
  function _paintCanvas(d, t) {
    var sa = function (id, attr, v) { var el = $(id); if (el) el.setAttribute(attr, v); };
    var spY = _spY(d.sharedY);
    // ghost (Have) — fixed reference
    sa('d2-ghost-cone', 'd', d.have.dCone); sa('d2-ghost-ceil', 'd', d.have.dCeil);
    sa('d2-ghost-floor', 'd', d.have.dFloor); sa('d2-ghost-datum', 'd', d.have.dDatum);
    var gc = $('d2-ghost-cone'); if (gc) gc.setAttribute('opacity', '0.22');
    // live (Want) — exact at rest, interpolated during morph
    // datum line is drawn below at the SAME dy as the node/handle (see _dy) so they
    // always coincide — the engine's dDatum path can lag the endpoint on a boundary pull.
    var conePath, _ceilDrawn, _floorDrawn;
    // ramp a ceil/floor endpoint override across the timeline so the LIVE line pivots from the
    // start anchor up to the dragged endpoint (mirror sketch L6399 d2SpendToY(sp + _t*delta)).
    var _rampLine = function (rawD, delta) {
      var pts = _parse(rawD), xs = FRONT.xStart, span = (FRONT.xEnd - FRONT.xStart) || 1, out = [];
      for (var i = 0; i < pts.length; i++) {
        var tt = (pts[i][0] - xs) / span;
        out.push([pts[i][0], spY(_yToSpend(d.sharedY, pts[i][1]) + tt * delta)]);
      }
      return out;
    };
    if (t >= 1) {
      if (_wantOverrides.ceilDelta || _wantOverrides.floorDelta) {
        var rc = _rampLine(d.want.dCeil, _wantOverrides.ceilDelta);
        var rf = _rampLine(d.want.dFloor, _wantOverrides.floorDelta);
        _ceilDrawn = _lineFrom(rc); _floorDrawn = _lineFrom(rf); conePath = _coneFrom(rc, rf);
      } else {
        _ceilDrawn = d.want.dCeil; _floorDrawn = d.want.dFloor; conePath = d.want.dCone;
      }
      sa('d2-cone', 'd', conePath); sa('d2-ceil-line', 'd', _ceilDrawn); sa('d2-floor-line', 'd', _floorDrawn);
    } else {
      var hc = _parse(d.have.dCeil), wc = _parse(d.want.dCeil), c = _lerpPts(hc, wc, t);
      var hf = _parse(d.have.dFloor), wf = _parse(d.want.dFloor), f = _lerpPts(hf, wf, t);
      _ceilDrawn = _lineFrom(c); _floorDrawn = _lineFrom(f); conePath = _coneFrom(c, f);
      sa('d2-ceil-line', 'd', _ceilDrawn); sa('d2-floor-line', 'd', _floorDrawn);
      sa('d2-cone', 'd', conePath);
    }
    // whole ceil/floor line draggable: mirror the drawn line onto the invisible stroke hit paths
    sa('d2-ceil-hit', 'd', _ceilDrawn); sa('d2-floor-hit', 'd', _floorDrawn);
    // #A: keep the market-sweep clip bounded to the live cone (mirror sketch L6456)
    sa('d2-clip-cone-path', 'd', conePath);
    var lc = $('d2-cone'); if (lc) lc.setAttribute('opacity', '0.55');
    // endpoint nodes / labels / handles at the right edge, lerped
    var xE = FRONT.xEnd, he = d.have.ptsEnd, we = d.want.ptsEnd;
    var cy = spY(_lerp(he.ceilSpend, we.ceilSpend, t));
    var fy = spY(_lerp(he.floorSpend, we.floorSpend, t));
    var dy = spY(_lerp(he.datumSpend, we.datumSpend, t));
    // draw the datum line flat at dy (== node/handle y) so line+node+handle are coincident
    sa('d2-datum-line', 'd', 'M ' + FRONT.xStart + ' ' + dy + ' L ' + FRONT.xEnd + ' ' + dy);
    var place = function (node, lbl, y) { sa(node, 'cx', xE); sa(node, 'cy', y); sa(lbl, 'x', xE + 15); sa(lbl, 'y', y + 4); };
    place('d2-node-ceil', 'd2-lbl-ceil', cy); place('d2-node-floor', 'd2-lbl-floor', fy); place('d2-node-datum', 'd2-lbl-datum', dy);
    [['d2-handle-ceil', 'd2-handle-ceil-hit', 'd2-handle-ceil-line', cy], ['d2-handle-datum', 'd2-handle-datum-hit', 'd2-handle-datum-line', dy], ['d2-handle-floor', 'd2-handle-floor-hit', null, fy]].forEach(function (h) {
      sa(h[0], 'cy', h[3]); if (h[1]) sa(h[1], 'cy', h[3]); if (h[2]) { sa(h[2], 'y1', h[3] - 10); sa(h[2], 'y2', h[3] + 10); }
    });
    // SP anchor (left edge) at the midpoint of the STARTING ceil/floor — lifts as portDelta
    // raises the whole band; its Y is the drag's spend reference (mirror sketch L6487).
    var _cd = _parse(_ceilDrawn), _fd = _parse(_floorDrawn);
    if (_cd.length && _fd.length) {
      _spHandleY = (_cd[0][1] + _fd[0][1]) / 2;
      sa('d2-sp-handle', 'cx', FRONT.xStart); sa('d2-sp-handle', 'cy', _spHandleY);
      sa('d2-sp-handle-hit', 'cx', FRONT.xStart); sa('d2-sp-handle-hit', 'cy', _spHandleY);
    }
    // datum colour reflects the (live) Test state
    var liveState = (t >= 1 ? d.want.stateObj : (t < 0.5 ? d.have.stateObj : d.want.stateObj));
    var col = liveState.color;
    // Item 3 (P8.1) — the Want 01->05 input frame carries the WANT (test) shape-state color,
    // its own state (not the Have state). Mirrors the Have frame driven by onShapeStateChange.
    var _wf = $('shape-input-frame-want');
    if (_wf && d.want && d.want.stateObj) _wf.style.setProperty('--shape-frame-color', d.want.stateObj.color);
    // #4b-(ii): canvas state-tint — mirror the Have #shape-panel-svg pattern onto #d2-canvas
    // so the OVEREXTENDED red wash appears on Want too (CSS keys #d2-state-tint-rect off this).
    var dcv = $('d2-canvas');
    if (dcv) { ['overextended', 'stretched', 'expansive', 'grounded', 'abundant'].forEach(function (k) { dcv.classList.remove('shape-state-' + k); }); if (liveState.key) dcv.classList.add('shape-state-' + liveState.key); }
    var dl = $('d2-datum-line'); if (dl) dl.style.stroke = col;
    var dn = $('d2-node-datum'); if (dn) dn.setAttribute('fill', col);
    var dlb = $('d2-lbl-datum'); if (dlb) dlb.style.fill = col;
    // #7: Y-axis gridlines + labels + "ANNUAL SPEND" title — ported from sketch.html L6555-6565.
    // Tick VALUES come from the SHARED DatumShape.gridLabels (hub-first single-source, Lesson 48);
    // pixels map onto Studio's FRONT band (yPxTop..yPxBot over xStart..xEnd).
    var _grid = $('d2-grid'), _dse = DS();
    if (_grid && _dse && typeof _dse.gridLabels === 'function') {
      var _gl = _dse.gridLabels(d.sharedY.yLo, d.sharedY.yHi);
      var _gHTML = '<text x="80" y="40" text-anchor="end" class="axis-title" style="fill:rgba(255,255,255,0.8);">ANNUAL SPEND</text>';
      for (var _gi = 0; _gi <= 4; _gi++) {
        var _gy = FRONT.yPxTop + _gi * (FRONT.yPxBot - FRONT.yPxTop) / 4;
        _gHTML += '<line x1="' + (FRONT.xStart - 2) + '" y1="' + _gy + '" x2="' + FRONT.xEnd + '" y2="' + _gy + '" class="grid-tick"/>';
        _gHTML += '<text x="' + (FRONT.xStart - 8) + '" y="' + (_gy + 4) + '" text-anchor="end" class="grid-label">' + _dse.fmtYLabel(_gl[_gi]) + '</text>';
      }
      _grid.innerHTML = _gHTML;
    }
    // axis labels (Want timeline)
    sa('d2-xaxis-start', 'textContent', 'AGE ' + _wantScn.currentAge);
    var xe = $('d2-xaxis-end'); if (xe) xe.textContent = _wantScn.yearsToGrow > 0 ? 'RETIRE: ' + _wantScn.activationAge : 'TODAY';
    var xs = $('d2-xaxis-start'); if (xs) xs.textContent = 'AGE ' + _wantScn.currentAge;
  }

  /* ── ghost tick marks on the d2-sliders <- have.positions (0..1) ── */
  function _positionGhostTicks(pos) {
    var map = { age: 'd2-tick-age', retire: 'd2-tick-activation', planThrough: 'd2-tick-plan-through', portfolio: 'd2-tick-portfolio', datum: 'd2-tick-datum', contrib: 'd2-tick-contrib' };
    Object.keys(map).forEach(function (k) { var el = $(map[k]); if (el && pos[k] != null) { el.style.left = (Math.max(0, Math.min(1, pos[k])) * 100) + '%'; el.classList.add('visible'); } });
  }

  /* ── how many levers diverge Have->Want (zero-diff vs single vs multi) ── */
  function _leverChanges(h, w) {
    var n = 0;
    if (h.currentAge !== w.currentAge) n++;
    if (h.activationAge !== w.activationAge) n++;
    if ((h.planThroughAge || 93) !== (w.planThroughAge || 93)) n++;
    if (Math.abs(h.portfolioVol - w.portfolioVol) > 0.001) n++;
    if (Math.abs((h.annualContrib || 0) - (w.annualContrib || 0)) > 100) n++;
    if (Math.abs(h.targetSpend - w.targetSpend) > 0.5) n++;
    return n;
  }

  /* ── _d2Vars token map (sketch L5770-5795 equivalent, computed from buildDiff) ── */
  function _d2Vars(d) {
    var pe = d.want.ptsEnd, ge = d.have.ptsEnd, gb = _haveScn, ds = _wantScn;
    var retire = ds.activationAge, age = ds.currentAge, yrs = ds.yearsToGrow;
    return {
      aboveCeil: fmt(Math.abs(pe.datumSpend - pe.ceilSpend)), gapToCeil: fmt(Math.abs(pe.ceilSpend - pe.datumSpend)),
      gapToFloor: fmt(Math.abs(pe.datumSpend - pe.floorSpend)), floorAboveSpend: fmt(Math.abs(pe.floorSpend - pe.datumSpend)),
      ceilK: fmt(pe.ceilSpend), deltaCeilK: fmt(Math.abs(pe.ceilSpend - ge.ceilSpend)), newCeilK: fmt(pe.ceilSpend),
      yearsDelta: Math.abs(retire - gb.activationAge), newRetire: retire, newContribK: '$' + Math.round((ds.annualContrib || 0) / 1000) + 'k',
      newYears: yrs, floorK: fmt(pe.floorSpend), deltaFloorK: fmt(Math.abs(pe.floorSpend - ge.floorSpend)),
      newFloorAboveSpend: fmt(Math.abs(pe.floorSpend - pe.datumSpend)), pinnedRetire: gb.activationAge,
      ageDelta: Math.abs(age - gb.currentAge), newPlanThrough: ds.planThroughAge || 93, newPlanYears: (ds.planThroughAge || 93) - retire,
      leverDeltaPlan_fmt: (function () { var p = (ds.planThroughAge || 93) - (gb.planThroughAge || 93); if (Math.abs(p) < 1) return 'unchanged'; var n = Math.abs(Math.round(p)); return (n === 1 ? '1 year' : n + ' years') + (p < 0 ? ' shorter' : ' longer'); })()
    };
  }
  function _fill(tmpl, vars) { return String(tmpl).replace(/\{(\w+)\}/g, function (m, k) { return (k in vars) ? vars[k] : m; }); }

  /* ── CURRENT->TEST HUD + 109-case copy ── */
  function _paintHUD(d) {
    var t = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    // Brick A: comparison panel — dual "capital / spend" + → connector, VERBATIM from
    // Sketch-S2 (sketch.html _cmpFmt/_cmpMFmt/_cmpDual/_cmpArr) so both apps read identically.
    var _cmpFmt = function (v) { return v >= 1000 ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'M' : '$' + Math.round(v) + 'k'; };
    var _cmpMFmt = function (m) { return m >= 1 ? '$' + m.toFixed(2) + 'M' : '$' + Math.round(m * 1000) + 'k'; };
    var _cmpDual = function (m, k) { return _cmpMFmt(m) + ' / ' + _cmpFmt(k); };
    var _cmpArr = function (des, disc) { return des > disc + 0.5 ? '↑' : des < disc - 0.5 ? '↓' : '→'; };
    var _cSet = function (id, txt) { var e = $(id); if (e) e.textContent = txt; };
    var gbEnd = d.have.ptsEnd, ptsEnd = d.want.ptsEnd, gb = _haveScn, s = _wantScn;
    var gbYrs = _haveScn.yearsToGrow, yrs = _wantScn.yearsToGrow;
    _cSet('d2s-cmp-ceil-disc',  _cmpDual(gbEnd.fvUp,  gbEnd.ceilSpend));
    _cSet('d2s-cmp-ceil-des',   _cmpDual(ptsEnd.fvUp, ptsEnd.ceilSpend));
    _cSet('d2s-cmp-ceil-arrow', _cmpArr(ptsEnd.ceilSpend, gbEnd.ceilSpend));
    _cSet('d2s-cmp-datum-disc',  _cmpDual(gbEnd.datumCapM,  gb.targetSpend));
    _cSet('d2s-cmp-datum-des',   _cmpDual(ptsEnd.datumCapM, s.targetSpend));
    _cSet('d2s-cmp-datum-arrow', _cmpArr(s.targetSpend, gb.targetSpend));
    _cSet('d2s-cmp-floor-disc',  _cmpDual(gbEnd.fvCon,  gbEnd.floorSpend));
    _cSet('d2s-cmp-floor-des',   _cmpDual(ptsEnd.fvCon, ptsEnd.floorSpend));
    _cSet('d2s-cmp-floor-arrow', _cmpArr(ptsEnd.floorSpend, gbEnd.floorSpend));
    _cSet('d2s-cmp-yrs-disc',    String(gbYrs) + ' yr');
    _cSet('d2s-cmp-yrs-des',     String(yrs) + ' yr');
    _cSet('d2s-cmp-yrs-arrow',   _cmpArr(yrs, gbYrs));
    var sn = $('d2s-pin-state-name'); if (sn) { sn.textContent = d.have.stateObj.name; sn.style.color = d.have.stateObj.color; }
    var dn = $('d2s-pin-designed-state'); if (dn) { dn.textContent = d.want.stateObj.name; dn.style.color = d.want.stateObj.color; }
    var oD = $('d2s-pin-state-opener'); if (oD) oD.textContent = d.have.stateObj.physicsShort ? '— ' + d.have.stateObj.physicsShort : '';
    var oG = $('d2s-pin-designed-opener'); if (oG) oG.textContent = d.want.stateObj.physicsShort ? '— ' + d.want.stateObj.physicsShort : '';
    // state-color the HUD card by the Test (Want) state — mirrors the front HUD treatment (change #3)
    var card = $('d2s-hud-main');
    if (card) { ['hud-state-expansive', 'hud-state-stretched', 'hud-state-grounded', 'hud-state-abundant', 'hud-state-overextended'].forEach(function (c) { card.classList.remove(c); }); if (d.want.stateObj.cls) card.classList.add(d.want.stateObj.cls); }

    var nch = _leverChanges(_haveScn, _wantScn);
    var means = $('d2s-pin-means'), inspect = $('d2s-pin-inspect'), lever = $('d2s-pin-lever-attribution'), chRow = $('d2s-pin-changes-row');
    if (nch === 0) {
      if (means) means.innerHTML = 'Your Test Shape matches your Current Shape — move a slider to design a change.';
      if (inspect) inspect.innerHTML = 'Every lever here is editable. As you pull one, the Shape and these readings respond live.';
      if (lever) lever.textContent = '—';
      if (chRow) { chRow.style.display = 'none'; chRow.textContent = ''; }
    } else if (d.copy && d.copy.isSingleLever) {
      var vars = _d2Vars(d);
      if (means) means.innerHTML = _fill(d.copy.physics, vars);
      var parts = String(d.copy.action).split(/<br\s*\/?>\s*<br\s*\/?>/i);
      if (inspect) inspect.innerHTML = _fill(parts[0], vars);
      var lmap = { datum: 'Target Datum', retire: 'Retirement Age', portfolio: 'Portfolio', contrib: 'Contributions', age: 'Current Age', plan: 'Plan-Through' };
      if (lever) lever.textContent = (lmap[d.copy.lever] || d.copy.lever) + (d.copy.primaryPct != null && d.copy.primaryPct < 1 ? ' (' + Math.round(d.copy.primaryPct * 100) + '% of range)' : ' (100% of range)');
      if (chRow) { chRow.style.display = 'none'; chRow.textContent = ''; }
    } else {
      // #1/#5: multi-lever (copy === null) — the SHARED S2 builder (Option-1 extraction),
      // byte-identical to Sketch via DatumShape.S2Copy.buildMultiLever. ds = clean want;
      // s.targetSpend rounded (Sketch parity); gbEnd/ptsEnd = rendered Have/Want endpoints;
      // gbPinnedState mirrors sketch renderDesignCanvas L5804-5815.
      // Endpoints recomputed EXACTLY as Sketch renderDesignCanvas does (getMathPoint on the
      // CLEAN design with s.targetSpend = Math.round(ds.datum)) so the copy is byte-identical —
      // not d.want.ptsEnd (unrounded datum + any SP portDelta override).
      var _d = DS(), _mkt = document.querySelector('input[name="d2-market"]:checked');
      var _mlYrs = Math.max(0, _wantScn.activationAge - _wantScn.currentAge);
      var _mlS = Object.assign({}, _wantScn, { targetSpend: Math.round(_wantScn.targetSpend), yearsToGrow: _mlYrs });
      var _mlGbYrs = _haveScn.yearsToGrow || Math.max(0, _haveScn.activationAge - _haveScn.currentAge);
      var _mlGbEnd = (_d && _d.computeAt) ? _d.computeAt(_haveScn, _mlGbYrs) : d.have.ptsEnd;
      var _ml = (_d && _d.S2Copy && _d.S2Copy.buildMultiLever && _d.computeAt) ? _d.S2Copy.buildMultiLever({
        retire: _wantScn.activationAge, age: _wantScn.currentAge, yrs: _mlYrs,
        paradigm: _mkt ? _mkt.value : 'average',
        gb: _haveScn,
        ds: { age: _wantScn.currentAge, retire: _wantScn.activationAge, planThroughAge: _wantScn.planThroughAge, port: _wantScn.portfolioVol, datum: _wantScn.targetSpend, contrib: _wantScn.annualContrib },
        s: _mlS,
        gbEnd: _mlGbEnd, ptsEnd: _d.computeAt(_mlS, _mlYrs),
        gbPinnedState: {
          retire: _haveScn.activationAge, age: _haveScn.currentAge, port: _haveScn.portfolioVol,
          contrib: _haveScn.annualContrib, datum: _haveScn.targetSpend, planThroughAge: _haveScn.planThroughAge || 93,
          pinnedParadigm: _haveScn.baselineRate === 1.040 ? 'Optimistic' : _haveScn.baselineRate === 1.015 ? 'Stress' : 'Historical',
          pinnedInflStr: _haveScn.isNominal ? 'Nominal' : 'Real',
          pinnedTax: Math.round((1.0 - (_haveScn.taxMult || 1.0)) * 100),
          stateObj: (_d && _d.buildShapeState) ? _d.buildShapeState(_mlGbEnd) : d.have.stateObj
        }
      }) : null;
      if (_ml) {
        if (means) means.innerHTML = _ml.phys;
        if (inspect) inspect.innerHTML = _ml.act;
        if (lever) lever.textContent = _ml.domLever || '—';
        if (chRow) { if (_ml.changeHtml) { chRow.className = 'pin-changes-row'; chRow.style.display = ''; chRow.innerHTML = _ml.changeHtml; } else { chRow.style.display = 'none'; chRow.textContent = ''; } }
      }
    }
  }

  /* ── orchestrator: one buildDiff -> all surrounds ── */
  /* surround 4: thin renderer — calls the shared buildRequirements and paints #req-items.
   * pts = RAW want endpoints (no override); overrides = the Want-canvas boundary pull. NO copy here. */
  function _renderRequirements() {
    var d = DS(); if (!d || !d.S2Copy || !d.S2Copy.buildRequirements || !_haveScn || !_wantScn) return;
    var ri = $('req-items'); if (!ri) return;
    var geo = _wantGeo || _wantScn;
    var rawEnd = d.computeAt(geo, Math.max(1, geo.yearsToGrow)); // GEO endpoints (incl SP portDelta) == sketch _d2ActiveDesignPts
    var mkt = document.querySelector('input[name="d2-market"]:checked');
    // designScenario stays CLEAN (no portDelta) so the SP card's `port + portDelta` can't double-count.
    var ctx = { designScenario: _wantScn, currentScenario: _wantScn, ghostBaseline: _haveScn, marketParadigm: mkt ? mkt.value : 'average' };
    var out = d.S2Copy.buildRequirements(rawEnd, _wantOverrides, ctx);
    if (!out) return;
    var rh = $('req-head-label'); if (rh && out.headLabel != null) rh.textContent = out.headLabel;
    if (out.html != null) ri.innerHTML = out.html;
    _wantAcceptFromState = out.acceptFromState;
  }

  function renderWantFace(t) {
    var d = DS(); if (!d || !d.buildDiff || !_haveScn) return;
    _wantScn = _wantFromSliders();                          // CLEAN want (no portDelta) = designScenario for the cards
    // SP overlay: fold portDelta into a GEO scenario for the geometry/tension only, so the cone
    // lifts from the new origin while _wantScn stays clean (the SP card can't double-count).
    _wantGeo = _wantOverrides.portDelta
      ? Object.assign({}, _wantScn, { portfolioVol: _wantScn.portfolioVol + _wantOverrides.portDelta })
      : _wantScn;
    var opts = _wantOverrides.isDirty ? Object.assign({}, FRONT, { boundaryOverrides: _wantOverrides }) : FRONT;
    var diff = d.buildDiff(_haveScn, _wantGeo, opts);
    _lastDiff = diff;
    _paintCanvas(diff, t == null ? 1 : t);
    _positionGhostTicks(diff.have.positions);
    _colorWantSliders();
    _paintHUD(diff);
    var g = diff.gap;
    try { updateTensionVisuals(diff.tension[0].ratio, diff.tension[1].ratio, diff.tension[2].ratio, g.datumAboveCeil); } catch (e) {}
    _renderRequirements();
    window._wantFaceState = { have: _haveScn, want: _wantScn, diff: diff, overrides: _wantOverrides };
  }

  /* ── 90deg cross-fade morph: lerp Have->Want geometry over the flip ── */
  function _morph(durationMs) {
    if (_morphRAF) cancelAnimationFrame(_morphRAF);
    var d = _lastDiff; if (!d) { renderWantFace(1); return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || durationMs <= 0) { _paintCanvas(d, 1); return; }
    var start = 0;
    var step = function (ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / durationMs);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      _paintCanvas(d, e);
      if (t < 1) _morphRAF = requestAnimationFrame(step); else _morphRAF = 0;
    };
    _morphRAF = requestAnimationFrame(step);
  }

  /* ── slider / market wiring (once) ── */
  /* On-canvas handle drags on the Want face (Step-4) — faithful to Sketch initD2DragHandlers:
   *   ceil/floor/datum  -> endpoint overrides (_wantOverrides.*Delta), Sketch caps + cross-guards
   *                        verbatim; buildDiff applies them to the want endpoints so the tension
   *                        bars, toggle colors, HUD and What-It-Takes all respond live.
   *   sp (starting point)-> ratio-scales the portfolio into _wantOverrides.portDelta (NOT a solver);
   *                        renderWantFace folds it into the GEO scenario so the whole band lifts.
   * Drag base = computeAt(GEO) (== Sketch _d2ActiveDesignPts: includes portDelta, excludes endpoint
   * deltas). Vertical (Y) mapping is unaffected by the back-face rotateY(180) X-mirror; getScreenCTM
   * maps client->viewBox incl. preserveAspectRatio. */
  function _wireHandleDrags() {
    var svg = $('d2-canvas'); if (!svg || svg._wantDragBound) return; svg._wantDragBound = true;
    function svgY(e) { try { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()).y; } catch (_e) { var r = svg.getBoundingClientRect(); return ((e.clientY - r.top) / r.height) * 480; } }
    [['ceil', 'd2-handle-ceil'], ['ceil', 'd2-handle-ceil-hit'], ['ceil', 'd2-ceil-hit'],
     ['datum', 'd2-handle-datum'], ['datum', 'd2-handle-datum-hit'], ['datum', 'd2-datum-hit'],
     ['floor', 'd2-handle-floor'], ['floor', 'd2-handle-floor-hit'], ['floor', 'd2-floor-hit'],
     ['sp', 'd2-sp-handle'], ['sp', 'd2-sp-handle-hit']].forEach(function (pair) {
      var name = pair[0], el = $(pair[1]); if (!el) return;
      el.addEventListener('pointerdown', function (e) {
        e.stopPropagation(); _dragActive = name;
        try { el.setPointerCapture(e.pointerId); } catch (_e) {}
        document.body.style.userSelect = 'none';
        if (name === 'sp') {
          var basePort = _wantScn ? _wantScn.portfolioVol : 0;
          _spDragBase = { sliderPort: basePort, curPortVol: basePort + (_wantOverrides.portDelta || 0), refSpend: (_lastDiff ? _yToSpend(_lastDiff.sharedY, _spHandleY) : 0) };
        }
      });
    });
    svg.addEventListener('pointermove', function (e) {
      if (!_dragActive || !_lastDiff || !_wantScn) return;
      var d = DS();
      var geo = _wantGeo || _wantScn;
      var pts = d.computeAt(geo, Math.max(1, geo.yearsToGrow));
      var y = Math.max(FRONT.yPxTop + 5, Math.min(svgY(e), FRONT.yPxBot - 5));
      var spend = _yToSpend(_lastDiff.sharedY, y);
      if (_dragActive === 'sp') {
        if (_spDragBase && _spDragBase.refSpend > 0.001) {
          var spRatio = spend / _spDragBase.refSpend;
          var newPortVol = _spDragBase.curPortVol * Math.max(0.05, Math.min(spRatio, 2.00));
          _wantOverrides.portDelta = Math.max(0, newPortVol - _spDragBase.sliderPort);
        }
      } else if (_dragActive === 'ceil') {
        var ceilBase = pts.ceilSpend;
        var dFloorCurr = pts.floorSpend + _wantOverrides.floorDelta;
        var spendCapped = Math.max(dFloorCurr + 5, Math.max(ceilBase * 0.50, Math.min(spend, ceilBase * 2.00)));
        _wantOverrides.ceilDelta = spendCapped - pts.ceilSpend;
      } else if (_dragActive === 'datum') {
        var maxDatum = pts.datumSpend * 2.00, minDatum = pts.datumSpend * 0.50;
        _wantOverrides.datumDelta = Math.max(minDatum, Math.min(spend, maxDatum)) - pts.datumSpend;
      } else if (_dragActive === 'floor') {
        var floorBase = pts.floorSpend;
        var dCeilCurr = pts.ceilSpend + _wantOverrides.ceilDelta;
        var spendFCapped = Math.max(10, Math.max(floorBase * 0.50, Math.min(spend, Math.min(floorBase * 2.00, dCeilCurr - 5))));
        _wantOverrides.floorDelta = spendFCapped - pts.floorSpend;
      }
      _wantOverrides.isDirty = true;
      renderWantFace(1);
    });
    var end = function () { if (_dragActive) { _dragActive = null; _spDragBase = null; document.body.style.userSelect = ''; renderWantFace(1); } };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  /* #2: canvas endpoint scrubber / hover tooltips — ported from sketch.html L9088-9196
   * (d2ShowTooltip / d2HideScrubber / d2UpdateScrubber + pointermove/leave). TWO Studio
   * adaptations vs Sketch: (1) Sketch restores nodes from _d2LastEndpointCY; Studio has no
   * such global, so restore from _lastDiff.want.ptsEnd via _spY. (2) Sketch gates on
   * .shape-armed; Studio gates on the Want face being active (shape-flip-inner.flipped).
   * Plus: suppress while a handle/SP drag is in flight (_dragActive — the Studio analog of
   * Sketch's _d2SPHovering). formatTTHover ported verbatim (sketch L4910-4914). */
  function _wireScrubber() {
    var svg = $('d2-canvas'); if (!svg || svg._wantScrubBound) return; svg._wantScrubBound = true;
    var grp = $('d2-scrubber-group'), line = $('d2-scrubber-line');
    var nC = $('d2-node-ceil'), nF = $('d2-node-floor'), nD = $('d2-node-datum');
    var lC = $('d2-lbl-ceil'), lF = $('d2-lbl-floor'), lD = $('d2-lbl-datum');
    function svgPt(e) { try { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var m = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: m.x, y: m.y }; } catch (_e) { var r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 840, y: ((e.clientY - r.top) / r.height) * 480 }; } }
    function wantActive() { var i = inner(); return !!(i && i.classList.contains('flipped')); }
    function fmtTTHover(fv, spend) {
      var fvStr = fv >= 1 ? fv.toFixed(2) + 'M' : Math.round(fv * 1000) + 'k';
      var spStr = spend >= 1000 ? (spend / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : Math.round(spend).toLocaleString('en-US') + 'k';
      return '| $' + fvStr + ' / $' + spStr + ' yr';
    }
    function showTip(id, age, fv, spend, svgX, svgY) {
      var g = $('d2-tt-g-' + id); if (!g) return;
      var ageEl = $('d2-tt-age-' + id); if (ageEl) ageEl.textContent = age;
      var datEl = $('d2-tt-data-' + id), txt;
      if (id === 'datum') {
        var capM = fv || 0;
        var spS = spend >= 1000 ? '$' + (spend / 1000).toFixed(2) + 'M/yr' : '$' + Math.round(spend) + 'k/yr';
        var capS = capM >= 1 ? '$' + capM.toFixed(2) + 'M' : '$' + Math.round(capM * 1000) + 'k';
        txt = '| ' + capS + ' | ' + spS;
      } else { txt = fmtTTHover(fv, spend); }
      if (datEl) datEl.textContent = txt;
      g.setAttribute('transform', 'translate(' + svgX + ',' + svgY + ')');
      var rect = g.querySelector('rect'), texts = g.querySelectorAll('text');
      if (svgX > 450) { if (rect) rect.setAttribute('x', -295); texts.forEach(function (t) { t.setAttribute('x', -285); }); }
      else { if (rect) rect.setAttribute('x', 15); texts.forEach(function (t) { t.setAttribute('x', 25); }); }
    }
    function hideScrubber() {
      if (!grp) return;
      var armed = wantActive();
      if (lC) lC.style.opacity = armed ? '1' : '0';
      if (lF) lF.style.opacity = armed ? '1' : '0';
      if (lD) lD.style.opacity = armed ? '1' : '0';
      if (_lastDiff) {                                  // adaptation 1: restore from _lastDiff
        var spY = _spY(_lastDiff.sharedY), we = _lastDiff.want.ptsEnd, xE = FRONT.xEnd;
        if (nC) { nC.setAttribute('cx', xE); nC.setAttribute('cy', spY(we.ceilSpend)); }
        if (nF) { nF.setAttribute('cx', xE); nF.setAttribute('cy', spY(we.floorSpend)); }
        if (nD) { nD.setAttribute('cx', xE); nD.setAttribute('cy', spY(we.datumSpend)); }
      }
      grp.style.opacity = '0';
    }
    function updateScrubber(svgX) {
      if (!wantActive()) {                              // adaptation 2: gate on want face active
        if (grp) grp.style.opacity = '0';
        ['d2-tt-g-ceil', 'd2-tt-g-floor', 'd2-tt-g-datum'].forEach(function (id) { var el = $(id); if (el) el.style.opacity = '0'; });
        if (lC) lC.style.opacity = '0'; if (lF) lF.style.opacity = '0'; if (lD) lD.style.opacity = '0';
        return;
      }
      if (!_lastDiff || !_wantScn) return;
      if (_dragActive) return;                          // suppress mid-drag (Studio analog of _d2SPHovering)
      var geo = _wantGeo || _wantScn, yrs = geo.yearsToGrow;
      if (!yrs || yrs === 0) return;
      if (lC) lC.style.opacity = '0'; if (lF) lF.style.opacity = '0'; if (lD) lD.style.opacity = '0';
      var spY = _spY(_lastDiff.sharedY);
      var offsetRatio = (svgX - FRONT.xStart) / (FRONT.xEnd - FRONT.xStart);
      var offsetYears = offsetRatio * yrs;
      var hoverAge = Math.round(geo.currentAge + offsetYears);
      var d = DS(), pts = d.computeAt(geo, Math.max(0, offsetYears));
      if (offsetYears >= yrs - 0.1) { var we = _lastDiff.want.ptsEnd; pts = { fvUp: we.fvUp, fvCon: we.fvCon, ceilSpend: we.ceilSpend, floorSpend: we.floorSpend, datumSpend: we.datumSpend }; }
      var yC = spY(pts.ceilSpend), yF = spY(pts.floorSpend), yD = spY(pts.datumSpend);
      if (nC) { nC.setAttribute('cx', svgX); nC.setAttribute('cy', yC); }
      if (nF) { nF.setAttribute('cx', svgX); nF.setAttribute('cy', yF); }
      if (nD) { nD.setAttribute('cx', svgX); nD.setAttribute('cy', yD); }
      if (line) { line.setAttribute('x1', svgX); line.setAttribute('x2', svgX); }
      grp.style.opacity = '1';
      showTip('ceil', hoverAge, pts.fvUp, pts.ceilSpend, svgX, yC);
      showTip('floor', hoverAge, pts.fvCon, pts.floorSpend, svgX, yF);
      showTip('datum', hoverAge, pts.datumSpend / 0.04 / 1000, pts.datumSpend, svgX, yD);
    }
    svg.addEventListener('pointermove', function (e) {
      if (!wantActive() || _dragActive) return;
      var p = svgPt(e);
      if (p.x >= 110 && p.x <= 660 && p.y >= -20 && p.y <= 500) updateScrubber(Math.max(FRONT.xStart, Math.min(p.x, FRONT.xEnd)));
      else hideScrubber();
    });
    svg.addEventListener('pointerleave', hideScrubber);
  }

  /* ACCEPT off the rendered d2-accept-btn -> apply the solved lever to the Want scenario, clear the
   * pull, re-render. (Step-3: instant apply; the accept fly-to animation is Step-4.) */
  function _wireAccept() {
    var ri = $('req-items'); if (!ri || ri._wantAcceptBound) return; ri._wantAcceptBound = true;
    ri.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.d2-accept-btn'); if (!btn) return;
      var type = btn.getAttribute('data-req-type'); var val = parseFloat(btn.getAttribute('data-req-value'));
      if (!type || isNaN(val)) return;
      var sc = SC(); if (!sc) return;
      var setSl = function (id, pos, exact) { var el = $(id); if (!el) return; el.value = String(pos); if (exact != null) el.dataset.exactVal = String(exact); else delete el.dataset.exactVal; };
      var dsec = btn.getAttribute('data-req-datum-value');
      if (dsec != null) { var dv = Math.min(parseFloat(dsec), 1000); setSl('d2-slider-datum', sc.datumValToPos(dv), Math.round(dv * 1000)); }
      if (type === 'capital') setSl('d2-slider-portfolio', sc.portValToPos(Math.min(val, 50)), Math.round(Math.min(val, 50) * 1e6));
      else if (type === 'contrib') setSl('d2-slider-contrib', sc.contribValToPos(Math.min(val, 200000)), Math.round(Math.min(val, 200000)));
      else if (type === 'retire') setSl('d2-slider-activation', Math.min(90, Math.max(45, Math.round(val))));
      else if (type === 'datum') setSl('d2-slider-datum', sc.datumValToPos(Math.min(val, 1000)), Math.round(Math.min(val, 1000) * 1000));
      else if (type === 'plan') setSl('d2-slider-plan-through', Math.min(105, Math.max(75, Math.round(val))));
      _resetOverrides(); _updateLabels(); renderWantFace(1);
    });
  }

  /* #A: gold/red market sweep across the Want shape. Ports the Have-face
   * triggerSweepRect mechanism (studio.html L5903 / sketch L8924) onto the
   * d2-canvas sweep rect; the .sweep-active-* CSS is scoped to #shape-want-face. */
  function _triggerWantSweep(type) {
    var el = $('d2-market-sweep'); if (!el) return;
    el.classList.remove('sweep-active-stress', 'sweep-active-opt');
    void el.getBoundingClientRect(); // force reflow so the animation restarts on rapid clicks
    if (type === 'stress') { el.setAttribute('fill', 'var(--danger-red)'); el.classList.add('sweep-active-stress'); }
    else if (type === 'optimistic') { el.setAttribute('fill', 'var(--gold)'); el.classList.add('sweep-active-opt'); }
  }

  /* #B: Reset Design — revert the Want design to the carried/discovered (Have) shape.
   * Mirrors Sketch's btn-reset-design fresh-sketch path (initDesignState -> reseed ->
   * re-render): clear boundary overrides, reseed the d2-sliders from the frozen Have
   * scenario, re-render, and flash the confirm toast. */
  function _wireReset() {
    var rb = $('d2s-btn-reset-design'); if (!rb || rb._wantResetBound) return; rb._wantResetBound = true;
    rb.addEventListener('click', function () {
      // #6: honor a SAVED carried sketch — mirror Sketch's saved-vs-fresh branch
      // (sketch.html L7530-7537). Saved -> restore the carried S2 design (scenario + accepted
      // boundary pulls); fresh/unsaved -> revert to the discovered Have baseline.
      var cd = window._studioCarriedDesign;
      if (cd && cd.present && cd.scenario && cd.scenario.age > 0) {
        _seedDesigned(cd); renderWantFace(1);
      } else if (_haveScn) {
        _resetOverrides(); _seedSliders(_haveScn); _updateLabels(); renderWantFace(1);
      }
      var toast = $('d2s-confirm-toast');
      if (toast) { toast.style.opacity = '1'; setTimeout(function () { toast.style.opacity = '0'; }, 2500); }
    });
  }

  function _wire() {
    if (_wired) return; _wired = true;
    ['d2-slider-age', 'd2-slider-activation', 'd2-slider-plan-through', 'd2-slider-portfolio', 'd2-slider-datum', 'd2-slider-contrib'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('input', function () {
        // #4: value-snap cross-constraints — ported VERBATIM from sketch.html L8946-8961 so
        // the Want thumbs cannot overrun retirement (CA<RA) or the plan floor (PTA>=RA+20).
        var _a = $('d2-slider-age'), _ac = $('d2-slider-activation'), _pl = $('d2-slider-plan-through');
        if (id === 'd2-slider-age') {
          if (_ac && parseInt(_a.value, 10) >= parseInt(_ac.value, 10)) _a.value = parseInt(_ac.value, 10) - 1;
        } else if (id === 'd2-slider-activation') {
          if (_a && parseInt(_ac.value, 10) <= parseInt(_a.value, 10)) _ac.value = parseInt(_a.value, 10) + 1;
          if (_pl) { var _mP = Math.max(75, parseInt(_ac.value, 10) + 20); if (parseInt(_pl.value, 10) < _mP) _pl.value = _mP; }
        } else if (id === 'd2-slider-plan-through') {
          if (_ac) { var _minP = Math.max(75, parseInt(_ac.value, 10) + 20); if (parseInt(_pl.value, 10) < _minP) _pl.value = _minP; }
        }
        delete el.dataset.exactVal; _resetOverrides(); _updateLabels(); renderWantFace(1);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="d2-market"]'), function (r) {
      r.addEventListener('change', function () { _resetOverrides(); renderWantFace(1); _triggerWantSweep(r.value); });
    });
    _wireHandleDrags();
    _wireScrubber();
    _wireAccept();
    _wireReset();
  }

  /* ── flip lifecycle ── */
  function setTabs(want) {
    var h = $('shape-have-tab'), w = $('shape-want-tab');
    if (h) { h.classList.toggle('active', !want); h.setAttribute('aria-selected', String(!want)); }
    if (w) { w.classList.toggle('active', want); w.setAttribute('aria-selected', String(want)); }
    var b = $('shape-face-back'); if (b) b.setAttribute('aria-hidden', String(!want));
    var f = $('shape-face-front'); if (f) f.setAttribute('aria-hidden', String(want));
  }
  /* #4b Part B — seed the Want sliders + boundary overrides from the carried Sketch-S2
   * DESIGNED shape (window._studioCarriedDesign, set by studio.html seedFromBlueprint).
   * Scalars map onto a Have-derived base so market/tax/inflation inherit from Have; the
   * four boundary deltas restore the accepted on-canvas pulls. Mirrors Sketch's own S2
   * restore (sketch.html updateDesignEngine + designOverrides from _s2d). */
  function _seedDesigned(cd) {
    var s = cd.scenario;
    var seed = Object.assign({}, _haveScn || {}, {
      currentAge:     s.age,
      activationAge:  Math.max((s.age || 0) + 1, s.retire),
      planThroughAge: s.planThroughAge || 93,
      portfolioVol:   s.port,
      targetSpend:    s.datum,
      annualContrib:  s.contrib
    });
    seed.yearsToGrow = Math.max(1, seed.activationAge - seed.currentAge);
    _seedSliders(seed);
    var o = cd.overrides || {};
    _wantOverrides.ceilDelta  = o.ceilDelta  || 0;
    _wantOverrides.floorDelta = o.floorDelta || 0;
    _wantOverrides.datumDelta = o.datumDelta || 0;
    _wantOverrides.portDelta  = o.portDelta  || 0;
    _wantOverrides.isDirty = !!(_wantOverrides.ceilDelta || _wantOverrides.floorDelta || _wantOverrides.datumDelta || _wantOverrides.portDelta);
  }

  function enterWantFace() {
    _wire();
    var sfi = (typeof window._scenarioFromInputs === 'function') ? window._scenarioFromInputs() : null;
    _haveScn = sfi ? Object.assign({}, sfi) : null;
    if (!_haveScn) return;
    var _seededDesign = false;
    if (!_wantInit) {
      var cd = window._studioCarriedDesign;
      if (cd && cd.present && cd.scenario && cd.scenario.age > 0) { _seedDesigned(cd); _seededDesign = true; }
      else { _seedSliders(_haveScn); }
      _wantInit = true;
    }
    _computeHavePos();
    _updateWasReadouts();
    // Keep the carried pulls on the first designed render; otherwise reset transient pulls.
    if (!_seededDesign) _resetOverrides();
    // (Item 3.1 — the sketch-design-ref box was removed; no flip hide/restore needed.)
    renderWantFace(1);          // compute _lastDiff at rest first
    _paintCanvas(_lastDiff, 0); // then start the morph from Have
  }

  window.flipToWant = function () { var i = inner(); if (!i) return; var lay = $('studio-layout'); if (lay) lay.classList.add('want-mode'); setTabs(true); enterWantFace(); i.classList.add('flipped'); _morph(800); if (window._fitWantToScreen) { requestAnimationFrame(function () { requestAnimationFrame(function () { window._fitWantToScreen(); }); }); } };
  window.flipToHave = function () { var i = inner(); if (!i) return; var lay = $('studio-layout'); if (lay) lay.classList.remove('want-mode'); setTabs(false); i.classList.remove('flipped'); if (_morphRAF) { cancelAnimationFrame(_morphRAF); _morphRAF = 0; } };
  window.renderWantFace = function () { renderWantFace(1); };

  if (document.readyState !== 'loading') _wire();
  else document.addEventListener('DOMContentLoaded', _wire);

  // ── updateTensionVisuals — VERBATIM from sketch.html (Studio-local; ~6 tooltip strings) ──
    function updateTensionVisuals(ceilRatio, floorRatio, datumRatio, datumAboveCeil) {
      floorRatio = floorRatio || 0;
      datumRatio = datumRatio || 0;
      var _blue  = 'var(--blue-safe)';

      // ── Ceiling bar ──
      var _cFill   = document.getElementById('d2-tension-ceil-fill');
      var _cPct    = document.getElementById('d2-tension-ceil-pct');
      var _cLbl    = document.getElementById('d2-tension-ceil-lbl');
      var _cAbs    = Math.abs(ceilRatio);
      var _cPct2   = Math.round(_cAbs * 100);
      var _cRelief = ceilRatio < 0;
      if (_cFill) { _cFill.style.width = _cPct2 + '%'; _cFill.style.background = _cRelief ? _blue : 'var(--gold)'; }
      if (_cPct)  { _cPct.textContent = _cPct2 + '%'; _cPct.style.color = _cRelief ? _blue : (_cAbs > 0.6 ? '#ffffff' : 'var(--gold)'); }
      if (_cLbl)  { var _cT = _cLbl.querySelector('.d2-tbar-label-txt'); if (_cT) _cT.textContent = _cRelief ? 'CEILING RELIEF' : 'CEILING TENSION'; _cLbl.style.color = _cRelief ? _blue : 'var(--gold)'; var _cTip = document.getElementById('d2-ceil-bar-tip'); if (_cTip) _cTip.textContent = _cRelief ? "This move lifts your structural Ceiling — the best your plan can support if markets cooperate. At 30% you've added real upside capacity. At 60% you've strengthened it substantially." : "This move lowers your structural Ceiling — the best your plan can support if markets cooperate. At 30% you're trading away some upside. At 60% the strong-market path now tops out much lower."; }

      // Ceiling line glow — only in tension mode (ceilRatio > 0)
      var overlay  = document.getElementById('d2-tension-overlay');
      var ceilLine = document.getElementById('d2-ceil-line');
      var gradCeil = document.getElementById('d2g-ceil');
      if (ceilLine) {
        if (_cRelief || ceilRatio === 0) {
          ceilLine.style.stroke = '#C9A84C'; ceilLine.style.filter = 'none';
          if (gradCeil) gradCeil.setAttribute('stop-opacity', '0.2');
          if (overlay)  { overlay.setAttribute('opacity', '0'); }
        } else if (_cAbs < 0.4) {
          ceilLine.style.stroke = '#d4b055'; ceilLine.style.filter = 'none';
          if (gradCeil) gradCeil.setAttribute('stop-opacity', String(0.2 + _cAbs * 0.3));
        } else if (_cAbs < 0.75) {
          ceilLine.style.stroke = '#f0d060';
          ceilLine.style.filter = 'drop-shadow(0 0 ' + (8 + _cAbs * 16) + 'px rgba(240,208,80,0.7))';
          if (gradCeil) gradCeil.setAttribute('stop-opacity', String(0.35 + _cAbs * 0.3));
        } else {
          ceilLine.style.stroke = '#ffffff';
          ceilLine.style.filter = 'drop-shadow(0 0 18px rgba(255,255,255,0.9))';
          if (gradCeil) gradCeil.setAttribute('stop-opacity', '0.7');
          if (overlay)  { overlay.setAttribute('opacity', '0.2'); }
        }
      }

      // ── Floor bar ──
      var _fFill   = document.getElementById('d2-tension-floor-fill');
      var _fPct    = document.getElementById('d2-tension-floor-pct');
      var _fLbl    = document.getElementById('d2-tension-floor-lbl');
      var _fAbs    = Math.abs(floorRatio);
      var _fPct2   = Math.round(_fAbs * 100);
      var _fRelief = floorRatio < 0;
      if (_fFill) { _fFill.style.width = _fPct2 + '%'; _fFill.style.background = _fRelief ? _blue : 'var(--danger-red)'; }
      if (_fPct)  { _fPct.textContent = _fPct2 + '%'; _fPct.style.color = _fRelief ? _blue : (_fAbs > 0.6 ? '#ffffff' : 'var(--danger-red)'); }
      if (_fLbl)  { var _fT = _fLbl.querySelector('.d2-tbar-label-txt'); if (_fT) _fT.textContent = _fRelief ? 'FLOOR RELIEF' : 'FLOOR TENSION'; _fLbl.style.color = _fRelief ? _blue : 'var(--danger-red)'; var _fTip = document.getElementById('d2-floor-bar-tip'); if (_fTip) _fTip.textContent = _fRelief ? "This move raises your survival Floor — what the conservative path supports even if markets disappoint. At 30% you've added resilience headroom. At 60% you've strengthened your worst case substantially." : "This move lowers your survival Floor — what the conservative path supports even if markets disappoint. At 30% you're thinning your safety margin. At 60% your worst-case resilience has dropped sharply."; }

      // ── Datum bar ──
      var _dFill   = document.getElementById('d2-tension-datum-fill');
      var _dPct    = document.getElementById('d2-tension-datum-pct');
      var _dLbl    = document.getElementById('d2-tension-datum-lbl');
      var _dAbs    = Math.abs(datumRatio);
      var _dPct2   = Math.round(_dAbs * 100);
      var _dRelief = datumRatio < 0;
      if (_dFill) { _dFill.style.width = _dPct2 + '%'; _dFill.style.background = _dRelief ? _blue : 'var(--teal-mid)'; }
      if (_dPct)  { _dPct.textContent = _dPct2 + '%'; _dPct.style.color = _dRelief ? _blue : (_dAbs > 0.6 ? '#ffffff' : 'var(--teal-mid)'); }
      if (_dLbl)  { var _dT = _dLbl.querySelector('.d2-tbar-label-txt'); if (_dT) _dT.textContent = _dRelief ? 'DATUM RELIEF' : 'DATUM TENSION'; _dLbl.style.color = _dRelief ? _blue : 'var(--teal-mid)'; var _dTip = document.getElementById('d2-datum-bar-tip'); if (_dTip) _dTip.textContent = _dRelief ? "You're pulling your Datum lower than your discovered position. At 30% you're trading some lifestyle for more margin. At 60% you're at or below the Floor — building real surplus the plan doesn't need to defend." : "You're pulling your Datum higher than your discovered position. At 30% the upper paths still carry it. At 60% you're approaching or past the Ceiling — the plan needs stronger inputs to support this lifestyle across modeled outcomes."; }

      // ── Explainer copy (highest absolute tension/relief wins) ──
      var _exp = document.getElementById('tension-explain');
      if (_exp) {
        var _maxAbs = Math.max(_cAbs, _fAbs, _dAbs);
        if (_maxAbs === 0) {
          _exp.textContent = 'As you design your Want, these bars show how much pressure each change puts on your Ceiling, Floor, and spending target.';
        } else if (_cAbs === _maxAbs) {
          _exp.textContent = _cRelief
            ? 'Your Ceiling rose — this move strengthens your upside capacity. The strong-market path now reaches higher above your spending line.'
            : (_cAbs > 0.75 ? 'Your Ceiling dropped sharply — this move gives up a large share of your upside capacity.'
            : _cAbs > 0.4 ? 'Your Ceiling came down meaningfully — the strong-market path now tops out noticeably lower.'
            : 'Your Ceiling eased down a little — a modest trade of upside capacity.');
        } else if (_fAbs === _maxAbs) {
          _exp.textContent = _fRelief
            ? 'Your Floor rose — this move strengthens your worst-case resilience. More outcomes stay above your minimum even if markets disappoint.'
            : (_fAbs > 0.75 ? 'Your Floor dropped sharply — worst-case resilience is much thinner now.'
            : 'Your Floor came down — your safety margin shrinks if markets disappoint.');
        } else {
          _exp.textContent = datumAboveCeil
            ? 'Spending line is now above the Ceiling — the plan can\'t deliver at this position without a structural change.'
            : (_dRelief
              ? 'Spending line lowered — you\'re planning below what this Shape can carry. The gap between your target spend and the Ceiling has widened.'
              : (_dAbs > 0.75 ? 'Spending line sits close to the Ceiling — very little capacity left above your spending target.'
              : 'Spending line under tension — you\'re noticeably closer to the Ceiling than in the baseline Shape.'));
        }
      }
    }
})();
