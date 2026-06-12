/* datum-shape.js -- Datum FI S1 shape: shared engine + renderer + scales + state copy
 * v1.2.0
 *
 * ONE source of truth for the S1 cone math, interactive renderer, log-scale
 * sliders, click-to-type currency edits, F88 liquid-fill, F89 vertex wave, and
 * the V13 shape-state narrative copy.
 *
 * Public surface:
 *   DatumShape.compute(scenario)              -> pts at offset = yearsToGrow
 *   DatumShape.computeAt(scenario, offset)    -> pts at any offset
 *   DatumShape.buildPath(scenario, opts)      -> { dCeil, dFloor, dDatum, dCone,
 *                                                  ptsStart, ptsEnd,
 *                                                  ceilPts, floorPts, xStart, xEnd,
 *                                                  yLo, yHi, yTop, yBot, spY }
 *   DatumShape.classifyShapeState(ptsEnd)     -> bare classifier { name, key, subZone, color, cls }
 *   DatumShape.buildShapeState(ptsEnd)        -> classified + V13 narrative copy joined
 *   DatumShape.SHAPE_STATE_COPY               -> raw V13 narrative table (sketch source-of-truth)
 *   DatumShape.gridLabels(yLo, yHi)           -> [yHi, ..., yLo] (5 ticks, top->bot)
 *   DatumShape.fmtSpend(v) / fmtYLabel(v)
 *   DatumShape.scales                         -> { portPosToVal, portValToPos,
 *                                                  contribPosToVal, contribValToPos,
 *                                                  datumPosToVal,   datumValToPos }
 *   DatumShape.wireCurrencyEdit(cfgArr, hooks)
 *   DatumShape.CONSTANTS                      -> { WR_CEIL, WR_FLOOR, DEFAULT_RATES, hScale }
 *   DatumShape.mount(svgRoot, hudRoot, opts)  -> handle (with .wave, .updateF88Mass)
 *
 * Math mirrors sketch.html getMathPoint at 5747ecc EXACTLY:
 *   WR_CEIL=0.050, WR_FLOOR=0.028, _hScale = 0.6079/(1 - 1.034^-h),
 *   real-terms unless scenario.isNominal=true.
 *
 * Narrative copy (SHAPE_STATE_COPY) is the byte-for-byte V13 source of truth.
 * sketch.html's getShapeStateObj delegates to buildShapeState(pts) -- the strings
 * rendered to #val-physics/#val-action stay byte-identical to the prior inline
 * source. The narrative-parity gate verifies this.
 *
 * buildPath returns COORDINATE-SPACE ceilPts/floorPts arrays (sketch.html F89
 * vertex-wave loop reads them, and the renderer's wave loop uses them too).
 *
 * Renderer operates ONLY on the passed svgRoot via root-scoped querySelector.
 *
 * v1.2.0: opts.autoReveal (default false). When true, the FIRST update() also
 * applies the reopen end-state reveal -- the same classes sketch.html's
 * _f88JumpToFull adds (draw-triggered, f88-complete, f88-started, the
 * f88-draw and f88-solid set) plus shape-armed, mass .active, and a full-width
 * top-reveal-rect -- so paint and reveal are ONE synchronous unit owned by the
 * module. Applied once per reveal cycle; handle.resetReveal() re-arms it (host
 * calls this on mode-exit so re-entry replays the staggered line drop), and
 * handle.reveal() force-applies it. sketch.html never passes autoReveal, so its
 * staged discovery sequencer keeps sole ownership of these classes there.
 */
(function (global) {
  'use strict';

  var VERSION = '1.2.0';

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

  /* Build SVG path data + coordinate-space point arrays. */
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

  /* Bare classifier -- returns key/name/subZone/color/cls only.
   * Thresholds match sketch.html getShapeStateObj exactly. */
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

  function gridLabels(yLo, yHi) {
    return [
      yHi,
      yHi - (yHi - yLo) * 0.25,
      (yHi + yLo) / 2,
      yLo + (yHi - yLo) * 0.25,
      yLo
    ];
  }

  function fmtSpend(v) {
    if (v >= 1000) return '$' + (v / 1000).toFixed(2).replace(/\.00$/, '') + 'M';
    return '$' + Math.round(v).toLocaleString('en-US') + 'k';
  }

  function fmtYLabel(v) {
    if (v >= 1000) return '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'M';
    return '$' + Math.round(v) + 'k';
  }

  /* ── LOG SCALES (sketch L2877-2884 verbatim) ───────────────────────────── */

  function portPosToVal(pos)    { return 0.001 * Math.pow(50000, pos / 100000); }
  function portValToPos(val)    { return Math.round(100000 * Math.log(val / 0.001) / Math.log(50000)); }
  function datumPosToVal(pos)   { return 20 * Math.pow(50, pos / 100000); }
  function datumValToPos(val)   { return Math.round(100000 * Math.log(Math.max(val, 20) / 20) / Math.log(50)); }
  function contribPosToVal(pos) { return pos <= 0 ? 0 : Math.round(Math.pow(200000, pos / 100000)); }
  function contribValToPos(val) { return val <= 0 ? 0 : Math.round(100000 * Math.log(val) / Math.log(200000)); }

  var scales = {
    portPosToVal: portPosToVal, portValToPos: portValToPos,
    datumPosToVal: datumPosToVal, datumValToPos: datumValToPos,
    contribPosToVal: contribPosToVal, contribValToPos: contribValToPos
  };

  /* ── SHAPE_STATE_COPY (V13 byte-for-byte) ─────────────────────────────── */

  /* These strings are the SOURCE OF TRUTH for the Sketch S1 narrative HUD's
   * #val-physics / #val-action. sketch.html's getShapeStateObj delegates to
   * buildShapeState which reads from here. Studio's HUD reads from the same.
   * Any change to a string MUST keep sketch.html's rendered output byte-identical
   * (narrative-parity gate). */
  var SHAPE_STATE_COPY = {
    OVEREXTENDED: {
      color: 'var(--danger-red)',
      cls:   'hud-state-overextended',
      subZones: {
        ENTRY: {
          physics:
            `The plan doesn't quite reach this spending level yet — the gap is small, and one change may close it.<br><br>That's not a judgment — it's just math. The current mix of savings, time, and target spending doesn't add up yet. Something has to change: the inputs go up, the target comes down, or both. The useful question is which lever moves the ceiling the most in your specific situation.`,
          action:
            `Move one lever at a time — more savings, more contributions, a later retirement, or a lower spending target — and watch which one closes the gap fastest. The most powerful lever in your situation won't always be the obvious one. Or bring the target down to where the plan currently tops out — that number tells you exactly what your current inputs produce. Not what you should want. What you have right now.<br><br>Studio can test whether real-world variables — tax-advantaged accounts, withdrawal sequencing, Social Security timing, outside income — close part of this gap before any lever needs to move. Sketch holds those constant. Studio models them. Sometimes they make the difference between a gap that needs a real change and one that doesn't.`,
          physicsShort:
            `The plan doesn't quite reach this spending level yet — the gap is small, and one change may close it.`,
          actionShort:
            `Move one lever at a time — more savings, more contributions, a later retirement, or a lower spending target — and watch which one closes the gap fastest.`
        },
        STRUCTURAL: {
          physics:
            `That spending line sits beyond what this plan can currently carry. To make it supportable, you'd need more capital, higher contributions, a later retirement date, or some mix of those. One lever that adds no capital is the retirement length itself: planning through fewer years raises the Ceiling toward your spending target on the same pile — but it only counts if the shorter horizon is genuine.<br><br>That's not a judgment — it's just math. The current mix of savings, time, and target spending doesn't add up yet. Something has to change: the inputs go up, the target comes down, or both. The useful question is which lever moves the ceiling the most in your specific situation.`,
          action:
            `Move one lever at a time — more savings, more contributions, a later retirement, or a lower spending target — and watch which one closes the gap fastest. The most powerful lever in your situation won't always be the obvious one. Or bring the target down to where the plan currently tops out — that number tells you exactly what your current inputs produce. Not what you should want. What you have right now.<br><br>Studio can test whether real-world variables — tax-advantaged accounts, withdrawal sequencing, Social Security timing, outside income — close part of this gap before any lever needs to move. Sketch holds those constant. Studio models them. Sometimes they make the difference between a gap that needs a real change and one that doesn't.`,
          physicsShort:
            `That spending line sits beyond what this plan can currently carry. To make it supportable, you'd need more capital, higher contributions, a later retirement date, or some mix of those. One lever that adds no capital is the retirement length itself: planning through fewer years raises the Ceiling toward your spending target on the same pile — but it only counts if the shorter horizon is genuine.`,
          actionShort:
            `Move one lever at a time and watch which one closes the gap fastest. The most powerful lever in your situation won't always be the obvious one.`
        }
      }
    },
    ABUNDANT: {
      color: 'var(--blue-safe)',
      cls:   'hud-state-abundant',
      subZones: {
        JUST_BELOW: {
          physics:
            `Your plan projects more than you're planning to spend — even if markets underperform. The gap is modest, but the floor still sits above your target.<br><br>Most spending targets land somewhere inside the range the plan models — yours sits below even the conservative end of it. The real question is whether that's deliberate — you're keeping expectations low by design, planning to leave more behind, or simply haven't tested what the plan can carry — or whether this is capacity you haven't looked at yet. Both are fine. But only one of them is a choice.`,
          action:
            `Slowly raise your spending target and watch where the plan starts to feel it. That number — where things first get tight — is worth knowing no matter what you decide. If you want to keep spending where it is, name what you're doing with the extra: retiring earlier, leaving more for family, or holding a larger buffer against healthcare costs or a bad stretch of early returns.<br><br>Studio can confirm whether your actual accounts and tax situation hold this position — or whether some of that projected surplus closes when real numbers replace the averages.`,
          physicsShort:
            `Your plan projects more than you're planning to spend — even if markets underperform. The gap is modest, but the floor still sits above your target.`,
          actionShort:
            `Slowly raise your spending target and watch where the plan starts to feel it.`
        },
        WELL_BELOW: {
          physics:
            `Your plan projects significantly more than you're planning to spend — even in a bad scenario. The floor sits well above your target, leaving a wide buffer between what the plan can carry and what you're asking for.<br><br>Most spending targets land somewhere inside the range the plan models — yours sits below even the conservative end of it. The real question is whether that's deliberate — you're keeping expectations low by design, planning to leave more behind, or simply haven't tested what the plan can carry — or whether this is capacity you haven't looked at yet. Both are fine. But only one of them is a choice.`,
          action:
            `Slowly raise your spending target and watch where the plan starts to feel it. That number — where things first get tight — is worth knowing no matter what you decide. If you want to keep spending where it is, name what you're doing with the extra: retiring earlier, leaving more for family, or holding a larger buffer against healthcare costs or a bad stretch of early returns.<br><br>Studio can confirm whether your actual accounts and tax situation hold this position — or whether some of that projected surplus closes when real numbers replace the averages.`,
          physicsShort:
            `Your plan projects significantly more than you're planning to spend — even in a bad scenario. The floor sits well above your target, leaving a wide buffer between what the plan can carry and what you're asking for.`,
          actionShort:
            `Slowly raise your spending target and watch where the plan starts to feel it.`
        }
      }
    },
    GROUNDED: {
      color: 'var(--purple-grounded)',
      cls:   'hud-state-grounded',
      subZones: {
        TIGHT: {
          physics:
            `The conservative scenario just barely covers your spending. There's almost no buffer between your target and the plan's stress case.<br><br>You're in a safe position, but safe has a cost: there's meaningful capacity above your target that the plan can support and you're not using. Whether that's by design or default is worth knowing.`,
          action:
            `Raise your spending target and watch where resistance first appears — that's roughly where moderate return paths stop being enough to carry you comfortably. If you'd rather stay where you are, decide what the headroom above is doing: buying a buffer against a bad sequence of returns, funding an earlier retirement, or preserving something to leave behind. Name it so it's intentional.<br><br>Studio can confirm whether your actual withdrawal order, account types, and Social Security timing reinforce this conservative position — or whether real-world variables quietly absorb some of that apparent headroom.`,
          physicsShort:
            `The conservative scenario just barely covers your spending. There's almost no buffer between your target and the plan's stress case.`,
          actionShort:
            `Raise your spending target and watch where resistance first appears. If you'd rather stay where you are, name what the headroom above is doing.`
        },
        STABLE: {
          physics:
            `The plan covers your spending even in a bad scenario — and there's real room above before things get tight.<br><br>You're in a safe position, but safe has a cost: there's meaningful capacity above your target that the plan can support and you're not using. Whether that's by design or default is worth knowing.`,
          action:
            `Raise your spending target and watch where resistance first appears — that's roughly where moderate return paths stop being enough to carry you comfortably. If you'd rather stay where you are, decide what the headroom above is doing: buying a buffer against a bad sequence of returns, funding an earlier retirement, or preserving something to leave behind. Name it so it's intentional.<br><br>Studio can confirm whether your actual withdrawal order, account types, and Social Security timing reinforce this conservative position — or whether real-world variables quietly absorb some of that apparent headroom.`,
          physicsShort:
            `The plan covers your spending even in a bad scenario — and there's real room above before things get tight.`,
          actionShort:
            `Raise your spending target and watch where resistance first appears — that's roughly where moderate return paths stop being enough to carry you comfortably.`
        }
      }
    },
    STRETCHED: {
      color: 'var(--orange-warning)',
      cls:   'hud-state-stretched',
      subZones: {
        STANDARD: {
          physics:
            `The plan can reach this spending level — but only when things go well. Most scenarios land below it.<br><br>This isn't a bad position — it's an ambitious one. Getting here requires returns and timing to cooperate across most of retirement, not just some of it. Average conditions start creating real pressure at this level.`,
          action:
            `Lower your spending by a modest amount and watch how quickly more scenarios start carrying it — even a small reduction can move this from "requires good luck" to "works across most futures." Or hold here and test whether more savings, more capital, or more time pulls the rest of the plan's scenarios up to meet it. The honest question: is this the number you want to live at, or the ceiling you're testing to see if you can reach it? Both are useful. Only one is a retirement plan.<br><br>Studio can test whether your actual tax structure, account types, withdrawal order, and Social Security timing hold this spending level across the full range — not just the best scenarios. Those details get averaged away in Sketch. In Studio, they can shift which scenarios carry you and by how much.`,
          physicsShort:
            `The plan can reach this spending level — but only when things go well. Most scenarios land below it.`,
          actionShort:
            `Lower your spending by a modest amount and watch how quickly more scenarios start carrying it.`
        },
        HIGH_END: {
          physics:
            `The plan barely clears this spending level, and only in its most favorable scenario. Almost no margin remains above.<br><br>This isn't a bad position — it's an ambitious one. Getting here requires returns and timing to cooperate across most of retirement, not just some of it. Average conditions start creating real pressure at this level.`,
          action:
            `Lower your spending by a modest amount and watch how quickly more scenarios start carrying it — even a small reduction can move this from "requires good luck" to "works across most futures." Or hold here and test whether more savings, more capital, or more time pulls the rest of the plan's scenarios up to meet it. The honest question: is this the number you want to live at, or the ceiling you're testing to see if you can reach it? Both are useful. Only one is a retirement plan.<br><br>Studio can test whether your actual tax structure, account types, withdrawal order, and Social Security timing hold this spending level across the full range — not just the best scenarios. Those details get averaged away in Sketch. In Studio, they can shift which scenarios carry you and by how much.`,
          physicsShort:
            `The plan barely clears this spending level, and only in its most favorable scenario. Almost no margin remains above.`,
          actionShort:
            `Lower your spending by a modest amount and watch how quickly more scenarios start carrying it — even a small reduction can move this from "requires good luck" to "works across most futures."`
        }
      }
    },
    EXPANSIVE: {
      color: 'var(--teal-mid)',
      cls:   'hud-state-expansive',
      subZones: {
        FLOOR_SIDE: {
          physics:
            `Your spending is well-supported — the plan carries it even under stress, with a lot of room still above.<br><br>The range is wide because real variables — taxes, account types, withdrawal timing — aren't fully modeled yet. You're using the conservative end of what's available here.`,
          action:
            `Try raising your spending to see how far the plan can carry it before things tighten. If you'd rather stay conservative, decide what you're keeping that room for — an earlier exit, a buffer for bad markets, or something to pass on.<br><br>Studio can narrow the range by modeling your actual account types, tax sequencing, withdrawal order, and Social Security timing. A narrower range means a more specific answer about where your spending actually lands within it.`,
          physicsShort:
            `Your spending is well-supported — the plan carries it even under stress, with a lot of room still above.`,
          actionShort:
            `Try raising your spending to see how far the plan can carry it before things tighten.`
        },
        CENTERED: {
          physics:
            `Your spending sits in the middle of what the plan can support. Neither edge is close, and the plan works across most futures.<br><br>The range is wide because real variables aren't fully modeled yet. Right now the plan isn't leaning heavily toward stress or surplus — outcomes are roughly balanced around your target.`,
          action:
            `Raise your target to see how close the ceiling actually is — or lower it to see where the floor starts doing more of the carrying. Or test the retirement date: moving it shifts both edges at once and can reframe where a centered position ends up.<br><br>Studio can narrow the range by modeling your actual account types, tax sequencing, withdrawal order, and Social Security timing. A narrower range means a more specific answer about where your spending actually lands within it.`,
          physicsShort:
            `Your spending sits in the middle of what the plan can support. Neither edge is close, and the plan works across most futures.`,
          actionShort:
            `Raise your target to see how close the ceiling actually is — or lower it to see where the floor starts doing more of the carrying.`
        },
        CEILING_SIDE: {
          physics:
            `Good years are doing more of the heavy lifting now. The plan reaches this target, but mostly when markets cooperate.<br><br>The plan gets you there, but it's increasingly relying on things going well. Average returns, rather than strong ones, start creating pressure at this level.`,
          action:
            `Back the spending down a bit and watch how quickly the pressure eases — even a modest reduction puts more of the plan's paths to work for you. Or hold here and test whether adding more savings, more time, or more capital creates enough distance to make this position comfortable. The number to know isn't the upper limit itself — it's how far you are from it.<br><br>Studio can narrow the range by modeling your actual account types, tax sequencing, withdrawal order, and Social Security timing. A narrower range means a more specific answer about where your spending actually lands within it.`,
          physicsShort:
            `Good years are doing more of the heavy lifting now. The plan reaches this target, but mostly when markets cooperate.`,
          actionShort:
            `Back the spending down a bit and watch how quickly the pressure eases — even a modest reduction puts more of the plan's paths to work for you.`
        }
      }
    }
  };

  /* buildShapeState(pts) -- one-call classify + V13 narrative lookup.
   * Returned object shape MATCHES sketch.html's prior getShapeStateObj return:
   *   { name, color, cls (hud-state-*), key, subZone, physics, action, physicsShort, actionShort }
   * The cone-stop pulse class (shape-state-*) is also exposed as `bareCls`. */
  function buildShapeState(pts) {
    var bare = classifyShapeState(pts);
    var cfg  = SHAPE_STATE_COPY[bare.name];
    var sub  = cfg.subZones[bare.subZone];
    return {
      name: bare.name,
      key: bare.key,
      subZone: bare.subZone,
      color: cfg.color,
      cls:   cfg.cls,
      bareCls: bare.cls,
      physics:      sub.physics,
      action:       sub.action,
      physicsShort: sub.physicsShort,
      actionShort:  sub.actionShort
    };
  }

  /* ── CLICK-TO-TYPE CURRENCY EDIT (sketch L6272-6385 verbatim) ─────────── */

  /* wireCurrencyEdit(cfgArr, hooks)
   * cfgArr: [{ valId, slider, w, isCurrency, maxLength?, getEditVal, clean, validate, getClampedValid?, toSlider }]
   * hooks:  { onCommit(slider, raw, cfg)?, onTabAcross()?, onValidationFail()?,
   *           triggerInteraction()?, updateEngine()?, clamp(v,min,max) }
   * Creates a sibling <input> for each valEl that becomes visible on click.
   * Same UX (shake on invalid, Enter commits, Esc cancels, Tab moves to next). */
  function wireCurrencyEdit(cfgArr, hooks) {
    hooks = hooks || {};
    var _clamp = hooks.clamp || function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); };
    var commits = [];

    cfgArr.forEach(function (c, idx) {
      var valEl  = document.getElementById(c.valId);
      var slider = c.slider;
      if (!valEl || !slider) return;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.className = 'ctrl-edit-input';
      inp.style.cssText = 'display:none;width:' + c.w;
      if (c.maxLength) inp.maxLength = c.maxLength;
      valEl.parentNode.insertBefore(inp, valEl.nextSibling);

      valEl.addEventListener('click', function () {
        if (c.isCurrency) {
          var ex = slider.dataset.exactVal;
          inp.value = (ex !== undefined && ex !== '')
            ? '$' + parseFloat(ex).toLocaleString('en-US')
            : c.getEditVal();
        } else {
          inp.value = c.getEditVal();
        }
        valEl.style.display = 'none';
        inp.style.display = '';
        inp.focus();
        inp.select();
      });

      inp.addEventListener('input', function (e) {
        if (c.isCurrency) {
          var num = e.target.value.replace(/[^0-9]/g, '');
          if (num) { e.target.value = '$' + parseInt(num, 10).toLocaleString('en-US'); }
          else     { e.target.value = ''; }
        } else {
          var num2 = e.target.value.replace(/[^0-9]/g, '');
          e.target.value = num2;
        }
      });

      function commitEdit() {
        var cleaned = c.clean(inp.value.trim());
        var raw = parseInt(cleaned, 10);
        if (isNaN(raw)) {
          inp.style.display = 'none'; valEl.style.display = ''; return;
        }
        if (!c.validate(raw)) {
          if (c.getClampedValid) {
            var snapped = c.getClampedValid(raw);
            inp.value = String(snapped);
            slider.value = _clamp(c.toSlider(snapped), parseFloat(slider.min), parseFloat(slider.max));
            if (hooks.triggerInteraction) hooks.triggerInteraction();
            if (hooks.onCommit) hooks.onCommit(slider, snapped, c);
            if (hooks.updateEngine) hooks.updateEngine();
          }
          inp.classList.add('shake');
          setTimeout(function () { inp.classList.remove('shake'); inp.style.display = 'none'; valEl.style.display = ''; }, 300);
          return;
        }
        slider.value = _clamp(c.toSlider(raw), parseFloat(slider.min), parseFloat(slider.max));
        if (c.isCurrency) slider.dataset.exactVal = String(raw);
        if (hooks.triggerInteraction) hooks.triggerInteraction();
        if (hooks.onCommit) hooks.onCommit(slider, raw, c);
        inp.style.display = 'none'; valEl.style.display = '';
        if (c.isCurrency) valEl.textContent = '$' + raw.toLocaleString('en-US');
        if (hooks.updateEngine) hooks.updateEngine();
      }
      commits.push(commitEdit);

      inp.addEventListener('blur', commitEdit);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')      { inp.blur(); }
        else if (e.key === 'Escape') { inp.style.display = 'none'; valEl.style.display = ''; }
        else if (e.key === 'Tab') {
          e.preventDefault();
          commitEdit();
          var dir = e.shiftKey ? -1 : 1;
          var next = (idx + dir + cfgArr.length) % cfgArr.length;
          var nextEl = document.getElementById(cfgArr[next].valId);
          if (nextEl) nextEl.click();
        }
      });
    });

    return { commitAll: function () { commits.forEach(function (f) { f(); }); } };
  }

  /* ── F89 VERTEX WAVE (sketch L4281-4364 verbatim, with svgRoot scoping) ── */

  function makeWave(svgRoot) {
    var WAVE_LAMBDA      = 1200;
    var WAVE_PHASE_SPEED = 0.10;
    var WAVE_DECAY       = 0.96;
    var WAVE_AMP_LERP    = 0.18;
    var WAVE_IMP_CAP     = 18;

    var ceilAmp = 0, floorAmp = 0;
    var _ceilTarget = 0, _floorTarget = 0;
    var _ceilLean = 0, _floorLean = 0;
    var _ceilPhase = 0, _floorPhase = 0;
    var _ceilPhaseDir = 1, _floorPhaseDir = 1;
    var _rafId = null;
    var _enabled = true;
    var cache = { ceilPts: [], floorPts: [], xStart: 120 };

    function applyWave(pts, amp, phase, lean, xStart) {
      if (amp < 0.01 && Math.abs(lean) < 0.1) return pts;
      return pts.map(function (p) {
        var parts = p.split(' ');
        var x = parseFloat(parts[0]);
        var y = parseFloat(parts[1]);
        return x.toFixed(1) + ' ' +
          (y + amp * Math.sin(2 * Math.PI * (x - xStart) / WAVE_LAMBDA - phase) + lean).toFixed(2);
      });
    }

    function loop() {
      if (_ceilTarget > 0 || ceilAmp > 0.01)   _ceilPhase  += _ceilPhaseDir  * WAVE_PHASE_SPEED;
      if (_floorTarget > 0 || floorAmp > 0.01) _floorPhase += _floorPhaseDir * WAVE_PHASE_SPEED;
      _ceilTarget  *= WAVE_DECAY;
      _floorTarget *= WAVE_DECAY;
      if (_ceilTarget  < 0.01) _ceilTarget  = 0;
      if (_floorTarget < 0.01) _floorTarget = 0;
      _ceilLean  *= WAVE_DECAY;
      _floorLean *= WAVE_DECAY;
      if (Math.abs(_ceilLean)  < 0.1) _ceilLean  = 0;
      if (Math.abs(_floorLean) < 0.1) _floorLean = 0;
      ceilAmp  += (_ceilTarget  - ceilAmp)  * WAVE_AMP_LERP;
      floorAmp += (_floorTarget - floorAmp) * WAVE_AMP_LERP;
      if (ceilAmp  < 0.01) ceilAmp  = 0;
      if (floorAmp < 0.01) floorAmp = 0;
      var _ca = ceilAmp  < 0.01 ? 0 : ceilAmp;
      var _fa = floorAmp < 0.01 ? 0 : floorAmp;

      if (cache.ceilPts.length && cache.floorPts.length) {
        var wCeil  = applyWave(cache.ceilPts,  _ca, _ceilPhase,  _ceilLean,  cache.xStart);
        var wFloor = applyWave(cache.floorPts, _fa, _floorPhase, _floorLean, cache.xStart);
        var wDCone = 'M ' + wCeil[0] + ' ' +
          wCeil.map(function (p) { return 'L ' + p; }).join(' ') + ' ' +
          wFloor.map(function (p) { return 'L ' + p; }).join(' ') + ' Z';
        var coneEl = svgRoot.querySelector('#cone-area');
        if (coneEl) coneEl.setAttribute('d', wDCone);
      }

      if (_ceilTarget === 0 && _floorTarget === 0 && _ca === 0 && _fa === 0 &&
          Math.abs(_ceilLean) < 0.1 && Math.abs(_floorLean) < 0.1) {
        ceilAmp = 0; floorAmp = 0; _rafId = null; return;
      }
      _rafId = requestAnimationFrame(loop);
    }

    return {
      setCache: function (ceilPts, floorPts, xStart) {
        cache.ceilPts  = (ceilPts  || []).slice();
        cache.floorPts = (floorPts || []).slice();
        cache.xStart   = xStart != null ? xStart : 120;
      },
      addImpulse: function (ceilMag, floorMag) {
        if (!_enabled) return;
        _ceilTarget  = Math.min(_ceilTarget  + (ceilMag  || 0), WAVE_IMP_CAP);
        _floorTarget = Math.min(_floorTarget + (floorMag || 0), WAVE_IMP_CAP);
        if (!_rafId) _rafId = requestAnimationFrame(loop);
      },
      setPhaseDir: function (ceilDir, floorDir) {
        if (ceilDir  != null) _ceilPhaseDir  = ceilDir  > 0 ? +1 : -1;
        if (floorDir != null) _floorPhaseDir = floorDir > 0 ? +1 : -1;
      },
      setLean: function (ceilLean, floorLean) {
        if (ceilLean  != null) _ceilLean  = ceilLean;
        if (floorLean != null) _floorLean = floorLean;
        if (!_rafId && _enabled) _rafId = requestAnimationFrame(loop);
      },
      setEnabled: function (b) {
        _enabled = !!b;
        if (!_enabled) {
          ceilAmp = 0; floorAmp = 0;
          _ceilTarget = 0; _floorTarget = 0;
          _ceilLean = 0; _floorLean = 0;
          _ceilPhase = 0; _floorPhase = 0;
        }
      },
      isEnabled: function () { return _enabled; },
      LEAN_MAG: 12
    };
  }

  /* ── F88 LIQUID-FILL (mass-top + mass-bottom path build) ──────────────── */

  /* Sketch builds the F88 mass paths inside its own engine. The split is at
   * the cone's midline: mass-top fills from ceil down to midpoint (gold),
   * mass-bottom from midpoint down to floor (red). Update is called whenever
   * the base cone changes. */
  function makeF88(svgRoot) {
    function midOf(ceilPts, floorPts) {
      var mid = [];
      var n = Math.min(ceilPts.length, floorPts.length);
      for (var i = 0; i < n; i++) {
        var c = ceilPts[i].split(' ');
        // floorPts is reversed (unshift); index aligned: floorPts[n-1-i] is the same x as ceilPts[i]
        var f = floorPts[n - 1 - i].split(' ');
        var x = parseFloat(c[0]);
        var yC = parseFloat(c[1]);
        var yF = parseFloat(f[1]);
        mid.push(x + ' ' + ((yC + yF) / 2));
      }
      return mid;
    }
    function pathFromPts(topPts, bottomPts) {
      return 'M ' + topPts[0] + ' ' +
        topPts.map(function (p) { return 'L ' + p; }).join(' ') + ' ' +
        bottomPts.map(function (p) { return 'L ' + p; }).join(' ') + ' Z';
    }
    return {
      update: function (ceilPts, floorPts /*, xStart */) {
        if (!ceilPts || !ceilPts.length || !floorPts || !floorPts.length) return;
        var mid = midOf(ceilPts, floorPts);
        var midReversed = mid.slice().reverse();
        var dTop    = pathFromPts(ceilPts, midReversed);
        var dBottom = pathFromPts(mid,     floorPts);
        var topEl    = svgRoot.querySelector('#mass-top');
        var bottomEl = svgRoot.querySelector('#mass-bottom');
        if (topEl)    topEl.setAttribute('d', dTop);
        if (bottomEl) bottomEl.setAttribute('d', dBottom);
      }
    };
  }

  /* ── RENDERER ───────────────────────────────────────────────────────────── */

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
    var enableNarrativeHud     = opts.enableNarrativeHud     === true;
    var enableF88              = opts.enableF88              === true;
    var enableF89Wave          = opts.enableF89Wave          === true;
    var autoReveal             = opts.autoReveal             === true;

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

    var currentScenario = opts.initialScenario || null;
    var lastBuild = null;
    var listeners = [];
    var wave = enableF89Wave ? makeWave(svgRoot) : null;
    var f88  = enableF88     ? makeF88(svgRoot)  : null;

    function on(target, ev, fn) {
      target.addEventListener(ev, fn);
      listeners.push({ target: target, ev: ev, fn: fn });
    }

    /* Reopen end-state reveal -- mirrors sketch.html jumpToFull() (L5495). Class
     * list is sketch-verbatim plus shape-armed (Studio label gate). f88-complete
     * keeps the .active masses hidden -- same end-state as a reopened sketch. */
    var revealed = false;
    function applyReveal() {
      if (!svgRoot || !svgRoot.classList) return;
      svgRoot.classList.add('draw-triggered','f88-complete','f88-started',
        'f88-draw-ceil','f88-draw-floor','f88-draw-datum',
        'f88-solid-ceil','f88-solid-floor','shape-armed');
      var rr = svgRoot.querySelector('#top-reveal-rect');
      if (rr) rr.style.width = '840px';
      var mt = svgRoot.querySelector('#mass-top');
      var mb = svgRoot.querySelector('#mass-bottom');
      if (mt) mt.classList.add('active');
      if (mb) mb.classList.add('active');
      revealed = true;
    }

    function update(scenario) {
      if (scenario) currentScenario = scenario;
      if (!currentScenario) return null;
      var b = buildPath(currentScenario, pathOpts);
      lastBuild = b;

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

      if (f88)  f88.update(b.ceilPts, b.floorPts, b.xStart);
      if (wave) wave.setCache(b.ceilPts, b.floorPts, b.xStart);

      // Paint + reveal as one synchronous unit (once per reveal cycle; guarded
      // so per-frame updates don't re-add mass .active and retrigger its
      // opacity transition mid-interaction).
      if (autoReveal && !revealed) applyReveal();

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
        var dc2 = $('datum-circle'); if (dc2) { dc2.setAttribute('cy', spY(ptsStart.datumSpend)); }
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

      var stateObj = buildShapeState(ptsEnd);
      if (enableShapeStateClass && stateHost && stateHost.classList) {
        for (var s = 0; s < STATE_CLASSES.length; s++) stateHost.classList.remove(STATE_CLASSES[s]);
        stateHost.classList.add(stateObj.bareCls);
      }

      if (enableHudReadout && hudRoot) {
        var nm = $h('shape-state-name');
        if (nm) { nm.textContent = stateObj.name; nm.style.color = stateObj.color; }
        // Dual-figure $M/$k rendering -- matches sketch's "ri-*" pattern ($Cap / $Annual yr).
        function dual(capM, spendK) {
          var capStr = capM >= 1
            ? '$' + capM.toFixed(2).replace(/\.00$/, '') + 'M'
            : '$' + Math.round(capM * 1000).toLocaleString('en-US') + 'k';
          var spStr = fmtSpend(spendK);
          return capStr + ' / ' + spStr + ' yr';
        }
        var rc = $h('ri-ceiling-val'); if (rc) rc.textContent = dual(ptsEnd.fvUp,      ptsEnd.ceilSpend);
        var rd = $h('ri-datum-val');   if (rd) rd.textContent = dual(ptsEnd.datumCapM, ptsEnd.datumSpend);
        var rf = $h('ri-floor-val');   if (rf) rf.textContent = dual(ptsEnd.fvCon,     ptsEnd.floorSpend);
        // Single-figure $/yr fallback (kept for legacy sh-*-val sites if present)
        var cv = $h('sh-ceil-val');  if (cv) cv.textContent = fmtSpend(ptsEnd.ceilSpend)  + ' / yr';
        var dv = $h('sh-datum-val'); if (dv) dv.textContent = fmtSpend(ptsEnd.datumSpend) + ' / yr';
        var fv = $h('sh-floor-val'); if (fv) fv.textContent = fmtSpend(ptsEnd.floorSpend) + ' / yr';
        // Growth Period
        var gp = $h('hud-growth-period');
        if (gp) gp.textContent = currentScenario.yearsToGrow + ' yrs (age ' +
          currentScenario.currentAge + ' → ' + currentScenario.activationAge + ')';
      }

      if (enableNarrativeHud && hudRoot) {
        var vp = $h('val-physics'); if (vp) vp.innerHTML = stateObj.physics;
        var va = $h('val-action');
        if (va) {
          // Match sketch: action is _conPara only (first split); studio-context expander dropped.
          var parts = stateObj.action.split(/<br\s*\/?>\s*<br\s*\/?>/i);
          va.innerHTML = parts[0];
        }
      }

      if (typeof opts.onShapeStateChange === 'function') opts.onShapeStateChange(stateObj, ptsEnd, ptsStart);
      if (typeof opts.onUpdate === 'function') opts.onUpdate(b);

      return b;
    }

    /* hover scrubber + endpoint tooltips */
    function showScrubber(svgX) {
      if (!currentScenario || !lastBuild) return;
      if (currentScenario.yearsToGrow === 0) return;
      var sg = $('scrubber-group'); if (!sg) return;
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
      ['ceil-lbl','floor-lbl','datum-lbl'].forEach(function (id) { var el = $(id); if (el) el.style.opacity = 0; });
      _tooltip('ceil',  hoverAge, pts.fvUp,      pts.ceilSpend,  svgX, yC);
      _tooltip('floor', hoverAge, pts.fvCon,     pts.floorSpend, svgX, yF);
      _tooltip('datum', hoverAge, pts.datumCapM, pts.datumSpend, svgX, yD);

      if (typeof opts.onHoverScrub === 'function') opts.onHoverScrub({ hoverAge: hoverAge, pts: pts });
    }
    function hideScrubber() {
      var sg = $('scrubber-group'); if (sg) sg.style.opacity = 0;
      ['ceil-lbl','floor-lbl','datum-lbl'].forEach(function (id) { var el = $(id); if (el) el.style.opacity = 1; });
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

    /* draggable datum */
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
      getLastPointArrays: function () {
        return lastBuild ? { ceilPts: lastBuild.ceilPts.slice(),
                             floorPts: lastBuild.floorPts.slice(),
                             xStart: lastBuild.xStart } : null;
      },
      showScrubber: showScrubber,
      hideScrubber: hideScrubber,
      classifyShapeState: classifyShapeState,
      buildShapeState: buildShapeState,
      compute: compute,
      computeAt: computeAt,
      buildPath: buildPath,
      wave: wave,
      f88:  f88,
      reveal: applyReveal,
      resetReveal: function () { revealed = false; },
      teardown: function () {
        for (var i = 0; i < listeners.length; i++) {
          listeners[i].target.removeEventListener(listeners[i].ev, listeners[i].fn);
        }
        listeners = [];
        revealed = false;
      }
    };
  }

  global.DatumShape = {
    VERSION:            VERSION,
    compute:            compute,
    computeAt:          computeAt,
    buildPath:          buildPath,
    classifyShapeState: classifyShapeState,
    buildShapeState:    buildShapeState,
    SHAPE_STATE_COPY:   SHAPE_STATE_COPY,
    gridLabels:         gridLabels,
    fmtSpend:           fmtSpend,
    fmtYLabel:          fmtYLabel,
    scales:             scales,
    wireCurrencyEdit:   wireCurrencyEdit,
    CONSTANTS: {
      WR_CEIL:        WR_CEIL,
      WR_FLOOR:       WR_FLOOR,
      DEFAULT_RATES:  DEFAULT_RATES,
      hScale:         hScale
    },
    mount:              mount
  };
}(typeof window !== 'undefined' ? window : this));
