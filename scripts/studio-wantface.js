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

  var _haveScn = null, _wantScn = null, _wantInit = false, _lastDiff = null, _morphRAF = 0, _wired = false, _haveSliderPos = null, _refWasShown = false;
  // surround 4: boundary-pull overrides on the Want canvas (Step-3 = datum-line drag; ceil/floor = Step-4)
  var _wantOverrides = { ceilDelta: 0, floorDelta: 0, datumDelta: 0, portDelta: 0, isDirty: false };
  var _wantAcceptFromState = null, _dragActive = null;
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

  /* Gold/Red plan-strength fill per Want slider (change #2). Color = the lever's effect on
   * the FUNDED position (not raw slider direction): GOLD strengthens, RED strains, neutral at
   * baseline. Strengthening direction is the lever's monotonic physics, so the plan-through
   * inversion is respected (longer horizon = strain = RED even though the value rose). */
  function _colorWantSliders() {
    if (!_haveSliderPos) return;
    var GOLD = 'var(--gold)', RED = 'var(--danger-red)', NEU = 'rgba(93,202,165,0.40)', TRK = 'rgba(255,255,255,0.14)';
    var STR = { 'd2-slider-age': -1, 'd2-slider-activation': 1, 'd2-slider-plan-through': -1, 'd2-slider-portfolio': 1, 'd2-slider-datum': -1, 'd2-slider-contrib': 1 };
    Object.keys(STR).forEach(function (id) {
      var el = $(id); if (!el || _haveSliderPos[id] == null) return;
      var mn = parseFloat(el.min), mx = parseFloat(el.max), v = parseFloat(el.value);
      var pct = mx > mn ? Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100)) : 0;
      var dv = v - _haveSliderPos[id], sign = dv > 0.5 ? 1 : dv < -0.5 ? -1 : 0;
      var col = sign === 0 ? NEU : (sign === STR[id] ? GOLD : RED);
      el.style.background = 'linear-gradient(90deg,' + col + ' 0%,' + col + ' ' + pct + '%,' + TRK + ' ' + pct + '%,' + TRK + ' 100%)';
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
    if (t >= 1) {
      sa('d2-cone', 'd', d.want.dCone); sa('d2-ceil-line', 'd', d.want.dCeil);
      sa('d2-floor-line', 'd', d.want.dFloor);
    } else {
      var hc = _parse(d.have.dCeil), wc = _parse(d.want.dCeil), c = _lerpPts(hc, wc, t);
      var hf = _parse(d.have.dFloor), wf = _parse(d.want.dFloor), f = _lerpPts(hf, wf, t);
      sa('d2-ceil-line', 'd', _lineFrom(c)); sa('d2-floor-line', 'd', _lineFrom(f));
      sa('d2-cone', 'd', _coneFrom(c, f));
    }
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
    // datum colour reflects the (live) Test state
    var liveState = (t >= 1 ? d.want.stateObj : (t < 0.5 ? d.have.stateObj : d.want.stateObj));
    var col = liveState.color;
    // #4b-(ii): canvas state-tint — mirror the Have #shape-panel-svg pattern onto #d2-canvas
    // so the OVEREXTENDED red wash appears on Want too (CSS keys #d2-state-tint-rect off this).
    var dcv = $('d2-canvas');
    if (dcv) { ['overextended', 'stretched', 'expansive', 'grounded', 'abundant'].forEach(function (k) { dcv.classList.remove('shape-state-' + k); }); if (liveState.key) dcv.classList.add('shape-state-' + liveState.key); }
    var dl = $('d2-datum-line'); if (dl) dl.style.stroke = col;
    var dn = $('d2-node-datum'); if (dn) dn.setAttribute('fill', col);
    var dlb = $('d2-lbl-datum'); if (dlb) dlb.style.fill = col;
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
      // multi-lever (copy === null): branded placeholder until the populateZoneC shared extraction (Step 2)
      if (means) means.innerHTML = 'You combined several moves — the boundaries shifted together. Deeper multi-lever analysis unlocks as you keep building.';
      if (inspect) inspect.innerHTML = 'Each lever you change reshapes the cone; the full multi-lever read arrives with the next layer of Studio.';
      if (lever) lever.textContent = nch + ' levers moved';
      if (chRow) { chRow.style.display = 'none'; chRow.textContent = ''; }
    }
  }

  /* ── orchestrator: one buildDiff -> all surrounds ── */
  /* surround 4: thin renderer — calls the shared buildRequirements and paints #req-items.
   * pts = RAW want endpoints (no override); overrides = the Want-canvas boundary pull. NO copy here. */
  function _renderRequirements() {
    var d = DS(); if (!d || !d.S2Copy || !d.S2Copy.buildRequirements || !_haveScn || !_wantScn) return;
    var ri = $('req-items'); if (!ri) return;
    var rawEnd = d.computeAt(_wantScn, Math.max(1, _wantScn.yearsToGrow));
    var mkt = document.querySelector('input[name="d2-market"]:checked');
    var ctx = { designScenario: _wantScn, currentScenario: _wantScn, ghostBaseline: _haveScn, marketParadigm: mkt ? mkt.value : 'average' };
    var out = d.S2Copy.buildRequirements(rawEnd, _wantOverrides, ctx);
    if (!out) return;
    var rh = $('req-head-label'); if (rh && out.headLabel != null) rh.textContent = out.headLabel;
    if (out.html != null) ri.innerHTML = out.html;
    _wantAcceptFromState = out.acceptFromState;
  }

  function renderWantFace(t) {
    var d = DS(); if (!d || !d.buildDiff || !_haveScn) return;
    _wantScn = _wantFromSliders();
    var opts = _wantOverrides.isDirty ? Object.assign({}, FRONT, { boundaryOverrides: _wantOverrides }) : FRONT;
    var diff = d.buildDiff(_haveScn, _wantScn, opts);
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
  /* datum-line drag on the Want canvas = the Step-3 boundary pull -> _wantOverrides.datumDelta
   * -> What-It-Takes (block E). Vertical (Y) mapping is unaffected by the back-face rotateY(180)
   * mirror (that flips X only); getScreenCTM maps client->viewBox incl. preserveAspectRatio. */
  function _wireDatumDrag() {
    var svg = $('d2-canvas'); if (!svg || svg._wantDragBound) return; svg._wantDragBound = true;
    function svgY(e) { try { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()).y; } catch (_e) { var r = svg.getBoundingClientRect(); return ((e.clientY - r.top) / r.height) * 480; } }
    ['d2-handle-datum', 'd2-handle-datum-hit', 'd2-datum-hit'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); _dragActive = 'datum'; try { el.setPointerCapture(e.pointerId); } catch (_e) {} document.body.style.userSelect = 'none'; });
    });
    svg.addEventListener('pointermove', function (e) {
      if (_dragActive !== 'datum' || !_lastDiff || !_wantScn) return;
      var d = DS(); var rawDatum = d.computeAt(_wantScn, Math.max(1, _wantScn.yearsToGrow)).datumSpend;
      var y = Math.max(FRONT.yPxTop + 5, Math.min(svgY(e), FRONT.yPxBot - 5));
      var spend = _yToSpend(_lastDiff.sharedY, y);
      _wantOverrides.datumDelta = Math.max(rawDatum * 0.5, Math.min(spend, rawDatum * 2.0)) - rawDatum;
      _wantOverrides.isDirty = true;
      renderWantFace(1);
    });
    var end = function () { if (_dragActive) { _dragActive = null; document.body.style.userSelect = ''; renderWantFace(1); } };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
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

  function _wire() {
    if (_wired) return; _wired = true;
    ['d2-slider-age', 'd2-slider-activation', 'd2-slider-plan-through', 'd2-slider-portfolio', 'd2-slider-datum', 'd2-slider-contrib'].forEach(function (id) {
      var el = $(id); if (!el) return;
      el.addEventListener('input', function () { delete el.dataset.exactVal; _resetOverrides(); _updateLabels(); renderWantFace(1); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="d2-market"]'), function (r) {
      r.addEventListener('change', function () { _resetOverrides(); renderWantFace(1); });
    });
    _wireDatumDrag();
    _wireAccept();
  }

  /* ── flip lifecycle ── */
  function setTabs(want) {
    var h = $('shape-have-tab'), w = $('shape-want-tab');
    if (h) { h.classList.toggle('active', !want); h.setAttribute('aria-selected', String(!want)); }
    if (w) { w.classList.toggle('active', want); w.setAttribute('aria-selected', String(want)); }
    var b = $('shape-face-back'); if (b) b.setAttribute('aria-hidden', String(!want));
    var f = $('shape-face-front'); if (f) f.setAttribute('aria-hidden', String(want));
  }
  function enterWantFace() {
    _wire();
    var sfi = (typeof window._scenarioFromInputs === 'function') ? window._scenarioFromInputs() : null;
    _haveScn = sfi ? Object.assign({}, sfi) : null;
    if (!_haveScn) return;
    if (!_wantInit) { _seedSliders(_haveScn); _wantInit = true; }
    _computeHavePos();
    _updateWasReadouts();
    _resetOverrides();
    var ref = $('sketch-design-ref'); if (ref) { _refWasShown = ref.style.display !== 'none'; ref.style.display = 'none'; }
    renderWantFace(1);          // compute _lastDiff at rest first
    _paintCanvas(_lastDiff, 0); // then start the morph from Have
  }

  window.flipToWant = function () { var i = inner(); if (!i) return; var lay = $('studio-layout'); if (lay) lay.classList.add('want-mode'); setTabs(true); enterWantFace(); i.classList.add('flipped'); _morph(800); if (window._fitWantToScreen) { requestAnimationFrame(function () { requestAnimationFrame(function () { window._fitWantToScreen(); }); }); } };
  window.flipToHave = function () { var i = inner(); if (!i) return; var lay = $('studio-layout'); if (lay) lay.classList.remove('want-mode'); setTabs(false); i.classList.remove('flipped'); if (_morphRAF) { cancelAnimationFrame(_morphRAF); _morphRAF = 0; } var ref = $('sketch-design-ref'); if (ref && _refWasShown) ref.style.display = 'block'; };
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
      if (_cLbl)  { var _cT = _cLbl.querySelector('.d2-tbar-label-txt'); if (_cT) _cT.textContent = _cRelief ? 'CEILING RELIEF' : 'CEILING TENSION'; _cLbl.style.color = _cRelief ? _blue : 'var(--gold)'; var _cTip = document.getElementById('d2-ceil-bar-tip'); if (_cTip) _cTip.textContent = _cRelief ? "You're accepting a lower Ceiling than the Sketch projects. At 30% you're trading some upside for simpler planning. At 60% you're locking in a much more modest cap — useful when you'd rather not depend on favorable markets." : "You're pulling your Ceiling higher than the Sketch projects. At 30% the gap is modest — small input changes can close it. At 60% the gap is structural — only meaningful moves (more time, more capital, lower spending) will reach it."; }

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
      if (_fLbl)  { var _fT = _fLbl.querySelector('.d2-tbar-label-txt'); if (_fT) _fT.textContent = _fRelief ? 'FLOOR RELIEF' : 'FLOOR TENSION'; _fLbl.style.color = _fRelief ? _blue : 'var(--danger-red)'; var _fTip = document.getElementById('d2-floor-bar-tip'); if (_fTip) _fTip.textContent = _fRelief ? "You're accepting a lower Floor than the Sketch projects. At 30% you're carrying extra resilience headroom. At 60% you're building in serious cushion — useful if you want the conservative path to stay quiet through almost any market." : "You're asking your Floor to hold a higher line than the conservative path supports. At 30% the gap is bridgeable with stronger inputs. At 60% you're asking the conservative path to do work it can't do without more time or capital."; }

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
          _exp.textContent = 'Drag the Ceiling, Floor, or spending line to see how hard you\'re asking this Shape to work.';
        } else if (_cAbs === _maxAbs) {
          _exp.textContent = _cRelief
            ? 'Ceiling pulled back — your upside spending capacity has narrowed. The plan has less room to deliver above your spending line if markets perform well.'
            : (_cAbs > 0.75 ? 'Ceiling is near its structural limit — this Shape now leans heavily on strong markets and your contributions holding steady.'
            : _cAbs > 0.4 ? 'Ceiling under real pressure — more of this plan now depends on growth doing its part.'
            : 'Ceiling raised but still in a workable band — you\'re asking for more, but the plan still has room above Floor.');
        } else if (_fAbs === _maxAbs) {
          _exp.textContent = _fRelief
            ? 'Floor set lower — your resilience boundary is thinner now. More of the outcome range sits below this new minimum if markets underperform.'
            : (_fAbs > 0.75 ? 'Floor pressed toward its lower boundary — resilience is thin if returns or income slip.'
            : 'Floor pulled down — resilience is shrinking and more outcomes cluster near your minimum.');
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
