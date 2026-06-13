'use strict';
/* FROZEN verbatim snapshot of the S2 inverse "what it takes" solver (solveInverse +
 * _d2BinarySearchY + _rtCheck) as it stood in sketch.html immediately BEFORE the
 * relocation to DatumShape.solveInverse. Permanent parity baseline pinned to THIS
 * checked-in file (not a git ref), mirroring _s2_copy_baseline.fixture.js.
 * makeBaselineSolver(DatumShape) -> { solveInverse }; getMathPoint wraps computeAt. */
module.exports = function makeBaselineSolver(DatumShape) {
  var WR_CEIL  = 0.050;
  var WR_FLOOR = 0.028;
  function getMathPoint(offset, yearsToGrow, s) {
    var sc = (s.yearsToGrow === yearsToGrow) ? s : Object.assign({}, s, { yearsToGrow: yearsToGrow });
    return DatumShape.computeAt(sc, offset);
  }
// === BEGIN SOLVEINVERSE BASELINE (verbatim sketch.html slices) ===
    function _rtCheck(dP, dK, label, target, which, s, Y) {
      if (dP === null || dK === null) return;
      var _tS = Object.assign({}, s, {
        portfolioVol:  (s.portfolioVol  || 0) + dP,
        annualContrib: (s.annualContrib || 0) + dK
      });
      var _pm  = getMathPoint(Y, Y, _tS);
      var _got = which === 'ceil' ? _pm.ceilSpend : _pm.floorSpend;
      console.assert(Math.abs(_got - target) < 1.0,
        'F86 RT [' + label + '] target=' + target.toFixed(1) + ' got=' + _got.toFixed(1));
    }
    function _d2BinarySearchY(target, whichBound, s) {
      var lo = s.currentAge + 1;
      var hi = s.currentAge + 50;
      for (var _i = 0; _i < 50; _i++) {
        var mid = Math.floor((lo + hi) / 2);
        var _Ym = mid - s.currentAge;
        var _pm = getMathPoint(_Ym, _Ym, s);
        var _cv = whichBound === 'ceil' ? _pm.ceilSpend : _pm.floorSpend;
        if (Math.abs(_cv - target) < 0.5) { lo = mid; hi = mid; break; }
        if (_cv < target) lo = mid; else hi = mid;
      }
      return Math.floor((lo + hi) / 2); // solved retireAge (integer)
    }
    function solveInverse(dc, df, dd, pts, s) {
      var THR    = 0.5; // k/yr noise floor for drag detection
      var hasCeil  = Math.abs(dc) > THR;
      var hasFloor = Math.abs(df) > THR;
      var hasDatum = Math.abs(dd) > THR;

      var Y       = s.yearsToGrow || 0;
      var P       = s.portfolioVol   || 0;   // millions
      var K       = s.annualContrib  || 0;   // $/yr
      // ── §1 MODEL: scenario-aware constants, single source (F86) ─────────────────
      var g_up = s.upsideRate,       r_up = g_up - 1;
      var g_lo = s.conservativeRate, r_lo = g_lo - 1;
      var gfUp = Y > 0 ? Math.pow(g_up, Y) : 1;
      var gfLo = Y > 0 ? Math.pow(g_lo, Y) : 1;
      var inflM = (s.isNominal && Y > 0) ? Math.pow(1 + s.inflRate, Y) : 1;
      var M    = inflM * (s.taxMult || 0.8);   // mirrors forward inflMult × taxMult at t=1
      // F93: horizon-aware WR — mirrors getMathPoint derivation; WR_CEIL/WR_FLOOR globals untouched
      var _h_i     = Math.max(15, (s.planThroughAge || 93) - (s.activationAge || 65));
      var _hScale_i = 0.6079 / (1 - Math.pow(1.034, -_h_i));
      var wrCeilH  = WR_CEIL  * _hScale_i;
      var wrFloorH = WR_FLOOR * _hScale_i;
      // §2 annuity coefficients (forward formula structure at t=1, M and W factored out):
      var A_up = gfUp;
      var B_up = r_up > 0 ? (gfUp - 1) / r_up : Y;  // K/1e6 multiplier for fvUp
      var A_lo = gfLo;
      var B_lo = r_lo > 0 ? (gfLo - 1) / r_lo : Y;  // K/1e6 multiplier for fvCon (Answer A: full K)
      // Effective display sensitivities returned in result for fmtPortPer1k in populateZoneC:
      var a1 = A_up * wrCeilH  * M;
      var a2 = A_lo * wrFloorH * M;
      var b1 = B_up * wrCeilH  * M;
      var b2 = B_lo * wrFloorH * M;

      var ceilTarget  = pts.ceilSpend  + dc;
      var floorTarget = pts.floorSpend + df;
      var datumTarget = pts.datumSpend + dd;
      var base = { dc: dc, df: df, dd: dd, ceilTarget: ceilTarget, floorTarget: floorTarget, datumTarget: datumTarget };

      // §3 Required FV in $M — exact algebraic inverse of forward (wrCeilH/wrFloorH mirror getMathPoint):
      var R_c = ceilTarget  / 1000 / (wrCeilH  * M);  // required fvUp
      var R_f = floorTarget / 1000 / (wrFloorH * M);  // required fvCon
      // Delta from current FV (forward self-consistent by construction):
      var dR_c = R_c - (P * A_up + (K / 1e6) * B_up);
      var dR_f = R_f - (P * A_lo + (K / 1e6) * B_lo);

      // ── Step 1: Y=0 → Block D (FEASIBILITY RULES §6 Step 1) ───────────────────
      if (Y === 0) {
        // Block D has no horizon — withdraw rate is flat WR_CEIL/WR_FLOOR with no _hScale term
        var reqP_D  = WR_CEIL > 0 ? ceilTarget / (WR_CEIL * M * 1000) : 0;
        var implFlr = reqP_D * WR_FLOOR * M * 1000;
        var dP_D    = reqP_D - P;
        return Object.assign({}, base, { block: 'D', hardStop: null, reqP_M: reqP_D, dP_M: dP_D, impliedFloor_k: implFlr, P: P });
      }

      // ── Step 2: Nothing dragged ──
      if (!hasCeil && !hasFloor && !hasDatum) return Object.assign({}, base, { block: 'none' });

      // ── Block E: datum-only drag (INVERSE MATH §9) ──
      if (!hasCeil && !hasFloor && hasDatum) {
        return Object.assign({}, base, { block: 'E', hardStop: null });
      }

      // ── Block C: both ceiling and floor dragged (INVERSE MATH §5 Cramer's Rule) ──
      if (hasCeil && hasFloor) {
        // FEASIBILITY RULES §1: floor target >= ceiling target
        if (floorTarget >= ceilTarget) {
          return Object.assign({}, base, { block: 'C', hardStop: { type: 'floor_above_ceil' } });
        }
        // FEASIBILITY RULES §1: degenerate 2×2 system (|det| < 0.0001)
        var det = A_up * B_lo - A_lo * B_up;
        if (Math.abs(det) < 0.0001) {
          return Object.assign({}, base, { block: 'C', hardStop: { type: 'degenerate' } });
        }
        // §3 Cramer in FV-delta domain: [A_up B_up; A_lo B_lo][ΔP; ΔK/1e6] = [dR_c; dR_f]
        var dP_C  = (dR_c * B_lo - dR_f * B_up) / det;
        var dK_C  = (A_up * dR_f - A_lo * dR_c) / det * 1e6;
        // FEASIBILITY RULES §1: negative portfolio
        if ((P + dP_C) < 0) {
          return Object.assign({}, base, { block: 'C', hardStop: { type: 'negative_portfolio' }, dP_M: dP_C, dK_dollars: dK_C });
        }
        return Object.assign({}, base, {
          block: 'C', hardStop: null,
          dP_M: dP_C, dK_dollars: dK_C,
          comboWarnK: Math.abs(dK_C) > 50000,
          comboWarnP: dP_C > 2 * P,
          a1: a1, a2: a2, b1: b1, b2: b2
        });
      }

      // ── Block A: ceiling-only drag (§3 inverse) ──────────────────────────────
      if (hasCeil && !hasFloor) {
        var paths_A = [];
        // Path 1 — Portfolio: keep K fixed; ΔP = dR_c / A_up
        var dP_A1 = A_up > 0 ? dR_c / A_up : null;
        var fe_A1 = dP_A1 !== null ? dP_A1 * A_lo * wrFloorH * M * 1000 : null;
        _rtCheck(dP_A1, 0, 'A-portfolio', ceilTarget, 'ceil', s, Y);
        paths_A.push({
          lever: 'portfolio',
          dP_M:        dP_A1,
          floorEffect: fe_A1,
          reqPortfolio: dP_A1 !== null ? P + dP_A1 : null,
          suppressed: dP_A1 !== null && (P + dP_A1) < 0,
          softWarn:  dP_A1 !== null && dP_A1 > 2 * P ? 'too_large' : null
        });
        // Path 2 — Contributions: keep P fixed; ΔK = dR_c / B_up × 1e6
        var dK_A2 = B_up > 0 ? dR_c / B_up * 1e6 : null;
        var fe_A2 = dK_A2 !== null ? (dK_A2 / 1e6) * B_lo * wrFloorH * M * 1000 : null;
        _rtCheck(0, dK_A2, 'A-contrib', ceilTarget, 'ceil', s, Y);
        paths_A.push({
          lever: 'contributions',
          dK_dollars:  dK_A2,
          floorEffect: fe_A2,
          suppressed: false,
          softWarn:  dK_A2 !== null && Math.abs(dK_A2) > 50000 ? 'too_high' : null
        });
        // Path 3 — Retire Age (binary search via getMathPoint — already scenario-aware)
        var reqRA_A3 = _d2BinarySearchY(ceilTarget, 'ceil', s);
        var dY_A3    = reqRA_A3 - s.activationAge;
        var ptsSY_A3 = getMathPoint(reqRA_A3 - s.currentAge, reqRA_A3 - s.currentAge, s);
        paths_A.push({
          lever: 'retireAge',
          reqRetireAge: reqRA_A3, dY: dY_A3,
          floorEffect: ptsSY_A3.floorSpend - pts.floorSpend,
          suppressed: false,
          softWarn:  Math.abs(dY_A3) > 15 ? 'extreme' : null
        });
        // Combo: split dR_c 50/50 portfolio+contributions
        var combo_A = null;
        if (A_up > 0 && B_up > 0) {
          combo_A = { dP_M: dR_c / 2 / A_up, dK_dollars: dR_c / 2 / B_up * 1e6 };
        }
        return Object.assign({}, base, {
          block: 'A', hardStop: null,
          paths: paths_A, combo: combo_A,
          a1: a1, a2: a2, b1: b1, b2: b2
        });
      }

      // ── Block B: floor-only drag (§3 inverse, floor equations) ─────────────
      var paths_B = [];
      // Path 1 — Portfolio: keep K fixed; ΔP = dR_f / A_lo
      var dP_B1 = A_lo > 0 ? dR_f / A_lo : null;
      var ce_B1 = dP_B1 !== null ? dP_B1 * A_up * wrCeilH * M * 1000 : null;
      _rtCheck(dP_B1, 0, 'B-portfolio', floorTarget, 'floor', s, Y);
      paths_B.push({
        lever: 'portfolio',
        dP_M:       dP_B1,
        ceilEffect: ce_B1,
        reqPortfolio: dP_B1 !== null ? P + dP_B1 : null,
        suppressed: dP_B1 !== null && (P + dP_B1) < 0,
        softWarn: dP_B1 !== null && dP_B1 > 2 * P ? 'too_large' : null
      });
      // Path 2 — Contributions: keep P fixed; ΔK = dR_f / B_lo × 1e6
      var dK_B2 = B_lo > 0 ? dR_f / B_lo * 1e6 : null;
      var ce_B2 = dK_B2 !== null ? (dK_B2 / 1e6) * B_up * wrCeilH * M * 1000 : null;
      _rtCheck(0, dK_B2, 'B-contrib', floorTarget, 'floor', s, Y);
      paths_B.push({
        lever: 'contributions',
        dK_dollars: dK_B2,
        ceilEffect: ce_B2,
        suppressed: false,
        softWarn: dK_B2 !== null && Math.abs(dK_B2) > 50000 ? 'too_high' : null
      });
      // Path 3 — Retire Age (binary search via getMathPoint — already scenario-aware)
      var reqRA_B3 = _d2BinarySearchY(floorTarget, 'floor', s);
      var dY_B3    = reqRA_B3 - s.activationAge;
      var ptsSY_B3 = getMathPoint(reqRA_B3 - s.currentAge, reqRA_B3 - s.currentAge, s);
      paths_B.push({
        lever: 'retireAge',
        reqRetireAge: reqRA_B3, dY: dY_B3,
        ceilEffect: ptsSY_B3.ceilSpend - pts.ceilSpend,
        suppressed: false,
        softWarn: Math.abs(dY_B3) > 15 ? 'extreme' : null
      });
      var combo_B = null;
      if (A_lo > 0 && B_lo > 0) {
        combo_B = { dP_M: dR_f / 2 / A_lo, dK_dollars: dR_f / 2 / B_lo * 1e6 };
      }
      return Object.assign({}, base, {
        block: 'B', hardStop: null,
        paths: paths_B, combo: combo_B,
        a1: a1, a2: a2, b1: b1, b2: b2
      });
    }
// === END SOLVEINVERSE BASELINE ===
  return { solveInverse: solveInverse, _d2BinarySearchY: _d2BinarySearchY, _rtCheck: _rtCheck };
};
