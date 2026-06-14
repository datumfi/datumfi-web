'use strict';
/* FROZEN verbatim baseline of sketch.html populateZoneC (the "What It Takes" requirements
 * renderer) as it stood BEFORE relocation to DatumShape.S2Copy.buildRequirements. The body is
 * byte-verbatim; a DOM stub captures req-items innerHTML + req-head-label so it runs headless.
 * Pinned baseline for scripts/_buildrequirements_parity.js. makeBaseline(DatumShape) -> runBaseline(pts,overrides,ctx). */
module.exports = function makeBaseline(DatumShape) {
  var DATUM_GROWTH_RATE_SPEC = 0.045;
  var DATUM_SUPPORT_RATE     = 0.040;
  var DRIVER_TIE_EPSILON     = 0.005;
  function getMathPoint(offset, yearsToGrow, s) {
    var sc = (s.yearsToGrow === yearsToGrow) ? s : Object.assign({}, s, { yearsToGrow: yearsToGrow });
    return DatumShape.computeAt(sc, offset);
  }
  function getShapeStateObj(pts) { return DatumShape.buildShapeState(pts); }
  var solveInverse = DatumShape.solveInverse;
    function _d2BinarySearchYDatum(datumTarget_M, s) {
      var lo = s.currentAge + 1;
      var hi = s.currentAge + 50;
      for (var _i = 0; _i < 50; _i++) {
        var mid = Math.floor((lo + hi) / 2);
        var _Y  = mid - s.currentAge;
        var _gf = _Y > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _Y) : 1;
        var _PM = s.portfolioVol  || 0;
        var _KM = (s.annualContrib || 0) / 1e6;
        var _hDatBs  = Math.max(15, (s.planThroughAge || 93) - mid);
        var _hScDatBs = 0.6079 / (1 - Math.pow(1.034, -_hDatBs));
        var _DRatBs  = DATUM_SUPPORT_RATE * _hScDatBs;
        var _sup = _gf * _PM * _DRatBs
                 + (_gf > 1 ? _DRatBs * _KM * ((_gf - 1) / DATUM_GROWTH_RATE_SPEC) : 0);
        if (Math.abs(_sup - datumTarget_M) < 0.0005) { lo = mid; hi = mid; break; }
        if (_sup < datumTarget_M) lo = mid; else hi = mid;
      }
      return Math.floor((lo + hi) / 2); // retireAge (integer)
    }
  return function runBaseline(pts, overrides, ctx) {
    var _cap = { req: null, head: null };
    var designScenario = ctx.designScenario, currentScenario = ctx.currentScenario, ghostBaseline = ctx.ghostBaseline;
    var _d2AcceptFromState;
    var document = {
      getElementById: function (id) {
        if (id === 'req-items') return { get innerHTML() { return _cap.req; }, set innerHTML(v) { _cap.req = v; } };
        if (id === 'req-head-label') return { get textContent() { return _cap.head; }, set textContent(v) { _cap.head = v; } };
        return null;
      },
      querySelector: function () { return { value: ctx.marketParadigm }; }
    };
// === BEGIN VERBATIM populateZoneC BASELINE ===
    function populateZoneC(pts, overrides) {
      var req = document.getElementById('req-items');
      if (!req || !pts || !currentScenario) return;

      var _rhEl = document.getElementById('req-head-label');
      if (_rhEl) _rhEl.textContent = (overrides && overrides.isDirty) ? 'WHAT IT TAKES TO REACH THIS SHAPE' : 'TO REACH THIS DESIGN:';

      var s  = designScenario || currentScenario;
      var dc = overrides.ceilDelta  || 0;
      var df = overrides.floorDelta || 0;
      var dd = overrides.datumDelta || 0;

      // SP conditional clause helpers
      var _portDeltaM   = overrides.portDelta || 0;
      var _spOffOrigin  = _portDeltaM > 0.001;
      var _spClauseCard = function(body) {
        return '<div class="req-item" style="border-left:2px solid rgba(93,202,165,0.45);background:rgba(93,202,165,0.04);margin-bottom:6px;">'
          + '<div class="req-item-label" style="color:rgba(93,202,165,0.7);font-size:9px;letter-spacing:0.1em;">DESIGNED-IN STARTING BALANCE</div>'
          + '<div class="req-item-body" style="font-size:11px;color:rgba(255,255,255,0.65);">' + body + '</div></div>';
      };

      // Normalize: designScenario uses {age,retire,port,datum,contrib};
      // solveInverse + _d2BinarySearchY + getMathPoint expect {currentAge,activationAge,yearsToGrow,portfolioVol,annualContrib,targetSpend,...rates}
      var _sNorm = (function() {
        var _age    = s.currentAge    !== undefined ? s.currentAge    : (s.age    || 0);
        var _retire = s.activationAge !== undefined ? s.activationAge : (s.retire || 0);
        var _mEl    = document.querySelector('input[name="d2-market"]:checked');
        var _par    = _mEl ? _mEl.value : 'average';
        var _cR = 1.015, _bR = 1.035, _uR = 1.055;
        if (_par === 'optimistic') { _cR = 1.020; _bR = 1.040; _uR = 1.065; }
        else if (_par === 'stress') { _cR = 1.005; _bR = 1.015; _uR = 1.035; }
        return {
          currentAge:       _age,
          activationAge:    _retire,
          planThroughAge:   s.planThroughAge !== undefined ? s.planThroughAge : 93,
          yearsToGrow:      s.yearsToGrow   !== undefined ? s.yearsToGrow   : Math.max(0, _retire - _age),
          portfolioVol:     s.portfolioVol  !== undefined ? s.portfolioVol  : (s.port    || 0),
          annualContrib:    s.annualContrib  !== undefined ? s.annualContrib : (s.contrib || 0),
          targetSpend:      s.targetSpend   !== undefined ? s.targetSpend   : Math.round(s.datum || 0),
          conservativeRate: _cR, baselineRate: _bR, upsideRate: _uR,
          isNominal: ghostBaseline ? (ghostBaseline.isNominal || false) : false,
          taxMult:   ghostBaseline ? (ghostBaseline.taxMult   || 0.8)   : 0.8,
          inflRate:  0.03
        };
      })();

      // ── Format helpers ───────────────────────────────────────────────
      var fmtKyr = function(v) { return '$' + Math.round(Math.abs(v)) + 'k/yr'; };
      var fmtPort = function(dP_M) {
        var d = Math.abs(dP_M) * 1e6;
        if (d >= 1e6) return '$' + (Math.round(d / 1e4) / 100).toFixed(2).replace(/\.00$/, '') + 'M';
        return '$' + (Math.round(d / 1000) * 1000).toLocaleString('en-US');
      };
      var fmtContrib = function(dK) {
        return '$' + (Math.round(Math.abs(dK) / 100) * 100).toLocaleString('en-US') + '/year';
      };
      var fmtYrs = function(dY) {
        var n = Math.abs(Math.round(dY));
        return n + ' year' + (n !== 1 ? 's' : '');
      };
      // Per-$1,000 portfolio ceiling/floor effect: a1/a2 in $M/yr per $M → ×1000 → $/yr per $1k
      var fmtPortPer1k = function(sens) { return '$' + Math.round(Math.abs(sens) * 1000) + '/yr per $1,000'; };
      // HTML builder helpers
      var item = function(cls, labelColor, labelTxt, bodyTxt, reqType, reqVal) {
        var da = (reqType != null && reqVal != null)
          ? ' data-req-type="' + reqType + '" data-req-value="' + reqVal + '" tabindex="0" style="cursor:pointer;"'
          : '';
        var acceptBtn = (reqType != null && reqVal != null)
          ? '<button class="d2-accept-btn" data-req-type="' + reqType + '" data-req-value="' + reqVal + '">↑ ACCEPT — APPLY TO SKETCH</button>'
          : '';
        return '<div class="req-item ' + cls + '"' + da + '>'
          + '<div class="req-item-label" style="color:' + labelColor + ';">' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + acceptBtn + '</div></div>';
      };
      var warn = function(cls, labelColor, labelTxt, bodyTxt) {
        return '<div class="req-item ' + cls + '" style="opacity:0.65;">'
          + '<div class="req-item-label" style="color:' + labelColor + ';">&#9888; ' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + '</div></div>';
      };
      var studioCTA = function(copy) {
        return '<div class="req-item" style="border-left-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.02);margin-top:6px;">'
          + '<div class="req-item-label" style="color:rgba(255,255,255,0.35);letter-spacing:0.1em;">STUDIO</div>'
          + '<div class="req-item-body" style="color:rgba(255,255,255,0.5);font-size:11px;">' + copy + '</div></div>';
      };
      var headCard = function(headline, contextLine) {
        return '<div class="req-item" style="border-left-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04);margin-bottom:8px;">'
          + '<div class="req-item-body"><strong>' + headline + '</strong><br><span style="color:rgba(255,255,255,0.6);font-size:11px;">' + contextLine + '</span></div></div>';
      };

      // itemD — like item() but carries a datum secondary value for Accept wiring (Framing D only).
      var itemD = function(cls, labelColor, labelTxt, bodyTxt, reqType, reqVal, datumVal) {
        var _dv = datumVal != null ? ' data-req-datum-value="' + datumVal + '"' : '';
        var da = (reqType != null && reqVal != null)
          ? ' data-req-type="' + reqType + '" data-req-value="' + reqVal + '"' + _dv + ' tabindex="0" style="cursor:pointer;"'
          : '';
        var acceptBtn = (reqType != null && reqVal != null)
          ? '<button class="d2-accept-btn" data-req-type="' + reqType + '" data-req-value="' + reqVal + '"' + _dv + '>&#x2191; ACCEPT &mdash; APPLY TO SKETCH</button>'
          : '';
        return '<div class="req-item ' + cls + '"' + da + '>'
          + '<div class="req-item-label" style="color:' + labelColor + ';">' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + acceptBtn + '</div></div>';
      };

      var r = solveInverse(dc, df, dd, pts, _sNorm);
      var html = '';

      // ── Block: none (no drag) ────────────────────────────────────────
      if (r.block === 'none') {
        if (_spOffOrigin) {
          var _spAloneNewP = _sNorm.portfolioVol + _portDeltaM;
          var _spAloneBody = 'You\'ve raised the starting balance from '
            + fmtPort(_sNorm.portfolioVol) + ' to ' + fmtPort(_spAloneNewP)
            + ' — designing in ' + fmtPort(_portDeltaM)
            + ' before any endpoint moves. The whole band lifts from this new origin. Accept to commit this balance to your Sketch.';
          html += item('req-item', 'var(--teal-mid)', 'STARTING POINT — DESIGNED IN', _spAloneBody, 'capital', _spAloneNewP);
          req.innerHTML = html;
          return;
        }
        req.innerHTML = '<div class="req-placeholder">Drag the Ceiling, Floor, or Datum handles to design your shape — and see exactly what each move means.</div>';
        return;
      }

      // ── Block E v3: datum-only — 33-cell Datum Drag Matrix ───────────────────────
      if (r.block === 'E') {
        // Landing state (AcceptFromState + L2 routing key)
        var _eLandSt   = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _eLandName = _eLandSt ? _eLandSt.name    : 'EXPANSIVE';
        var _eLandSz   = _eLandSt ? _eLandSt.subZone : 'CENTERED';
        var _eLandClr  = _eLandSt ? _eLandSt.color   : 'var(--teal-mid)';
        _d2AcceptFromState = _eLandName;

        // Entry zone from ghostBaseline (Discover snapshot)
        var _eGbYrs  = ghostBaseline ? (ghostBaseline.yearsToGrow || Math.max(0, ghostBaseline.activationAge - ghostBaseline.currentAge)) : 0;
        var _eGbEnd  = ghostBaseline ? getMathPoint(_eGbYrs, _eGbYrs, ghostBaseline) : { ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget };
        var _eEntrySt   = getShapeStateObj(_eGbEnd);
        var _eEntryName = _eEntrySt ? _eEntrySt.name    : 'EXPANSIVE';
        var _eEntrySz   = _eEntrySt ? _eEntrySt.subZone : 'CENTERED';

        // L1 key: entryName_subZone_DIR_landName_subZone  |  L2 key: landingName_subZone
        var _eDir     = dd > 0 ? 'UP' : 'DN';
        var _eL1Key   = _eEntryName + '_' + _eEntrySz + '_' + _eDir + '_' + _eLandName + '_' + _eLandSz;
        var _eL1FbKey = _eEntryName + '_' + _eEntrySz + '_' + _eDir;
        var _eL2Key   = _eLandName  + '_' + _eLandSz;

        // 4 variable bindings
        var _fmtK = function(v) { return '$' + Math.round(Math.abs(v)) + 'k'; };
        var _eVars = {
          newDatum_fmt:   fmtKyr(r.datumTarget),
          deltaDatum_fmt: '$' + Math.round(Math.abs(dd)) + 'k/yr',
          ceilGap_fmt:    _fmtK(r.ceilTarget - r.datumTarget),
          floorGap_fmt:   _fmtK(r.datumTarget - r.floorTarget)
        };
        var _eFill = function(t) { return t.replace(/{(\w+)}/g, function(m, k) { return k in _eVars ? _eVars[k] : m; }); };

        // ── L1 fallback table: 22 cells landing-agnostic (entry sub-zone × direction) ──
        var _eL1Fallback = {
          'OVEREXTENDED_STRUCTURAL_UP': {
            op: "You're already significantly above the Ceiling — and you're testing whether the plan can carry even more. The Datum is now {deltaDatum_fmt} above where you started, sitting {ceilGap_fmt} past a limit the plan's current structure can't reach. This is a stress-test, not a plan state. The question isn't whether this works today — it doesn't — it's what would need to change for it to work.",
            lv: "The gap between where the Datum sits and what the plan supports is {ceilGap_fmt}. To close that gap, the most direct path is a structural change — more capital, higher contributions, a later start date, or some combination. Studio can show you the cost of closing it and which lever is most efficient given where your accounts actually stand. One lever that adds no capital is the retirement length itself: planning through fewer years raises the Ceiling toward {newDatum_fmt} on the same pile — but it only counts if the shorter horizon is genuine."
          },
          'OVEREXTENDED_ENTRY_UP': {
            op: "You were barely over the Ceiling — and you dragged higher. The Datum is now {deltaDatum_fmt} above your starting point, pushing {ceilGap_fmt} past what the plan currently supports. You were already testing feasibility from the entry point; this move asks a harder version of that same question.",
            lv: "The plan can't reach {newDatum_fmt} without a structural change. The gap to close is {ceilGap_fmt} — small enough that a targeted portfolio addition or a modest contribution increase might be sufficient. Studio can run the math on what each lever costs at your specific account structure. And because this gap is small, a shorter retirement length alone may close it — planning through fewer years lifts the Ceiling without new capital, honest only if the horizon truly is shorter."
          },
          'STRETCHED_HIGH_END_UP': {
            op: "You were nearly touching the Ceiling — and you crossed it. The Datum moved {deltaDatum_fmt} from your start, lifting from the edge of what the plan supports into territory it currently can't reach. That crossing is a clean signal: you're not stress-testing a margin, you're asking whether the plan's capacity can grow.",
            lv: "The Ceiling marks what the plan's current structure can sustain. The Datum is now {ceilGap_fmt} above it. Closing that gap means adding capital, raising contributions, or extending the runway — whichever your accounts can absorb. Studio can show the most efficient path given where you're starting from. A shorter retirement length is a fourth path — it raises the Ceiling toward {newDatum_fmt} on the same pile, if that horizon is genuine."
          },
          'STRETCHED_STANDARD_UP': {
            op: "You were in Stretched — spending near the Ceiling but not yet at it — and you dragged higher. The Datum moved {deltaDatum_fmt} from your start, pushing toward or past the plan's upper limit. You were already in the range where the plan needs to work hard; this move asks whether it can work harder.",
            lv: "At {newDatum_fmt}, the Datum is {ceilGap_fmt} from the Ceiling. If you've crossed it, the plan can't reach this level without a structural change. If you're still below it, you're testing how thin that margin actually is — Studio can show what happens to that buffer under stress. If you've crossed it, one lever costs nothing: a shorter retirement length raises the Ceiling toward {newDatum_fmt} — real only if the shorter horizon is true."
          },
          'EXPANSIVE_CEILING_SIDE_UP': {
            op: "You were in the upper range of Expansive — the plan supporting spending comfortably above the middle — and you dragged higher. The Datum moved {deltaDatum_fmt} from your start, lifting into Stretched territory or beyond. You're testing whether ambition is available at this spending level, not just whether the plan survives it.",
            lv: "The Datum now sits {ceilGap_fmt} from the Ceiling. At this level, the plan is working near its upper boundary — your sequence-of-returns exposure matters more than it did at your starting point. Studio can show what this spending level looks like under a range of market scenarios, not just the base case."
          },
          'EXPANSIVE_CENTERED_UP': {
            op: "You were in the middle of Expansive — spending balanced, plan running with room above and below — and you moved it up. The Datum shifted {deltaDatum_fmt} from your start, exploring how much of the plan's upper capacity you can reach. This is the clearest version of the \"what if I spent more?\" question.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. You have room to keep testing — but how much room depends on what you're actually carrying in your accounts. Studio can show you the real ceiling given your portfolio, contributions, and income timing."
          },
          'EXPANSIVE_FLOOR_SIDE_UP': {
            op: "You were in the lower range of Expansive — spending modest relative to what the plan supports — and you raised it. The Datum moved {deltaDatum_fmt} from your start, climbing toward the middle of the plan's range. You're not testing the limits yet. You're exploring how much of the capacity the plan already has is available to you.",
            lv: "The Datum is now {ceilGap_fmt} below the Ceiling and {floorGap_fmt} above the Floor. You still have meaningful runway above your current position. Studio can show what your accounts could sustain at higher spending levels — and whether your current portfolio and contribution trajectory is consistent with reaching them."
          },
          'GROUNDED_STABLE_UP': {
            op: "You were near the Floor — spending close to the plan's minimum supportable level — and you raised it. The Datum moved {deltaDatum_fmt} from your start, lifting into Expansive territory. This is a plan discovering capacity: you weren't spending what the plan could carry, and now you're testing how far into that range you want to go.",
            lv: "The Datum has moved above the Floor and now sits {ceilGap_fmt} from the Ceiling. You have substantial room between where you are and the plan's upper limit. Studio can show what your real account structure supports at various points across that range — so you're not guessing at what's available."
          },
          'GROUNDED_TIGHT_UP': {
            op: "You were in the paradox zone — spending so close to the Floor that the plan's minimum and your ask were nearly the same thing — and you raised it. The Datum moved {deltaDatum_fmt} from your start, pulling out of the tight band and into supported territory. This move is the answer to what the plan was waiting for: an ask it can actually distinguish from its own floor.",
            lv: "The Datum is now {floorGap_fmt} above the Floor and {ceilGap_fmt} from the Ceiling. You've moved out of the zone where the margin was essentially zero. The plan has meaningful capacity above where you're sitting — Studio can show you how much and what it would take to use it."
          },
          'ABUNDANT_JUST_BELOW_UP': {
            op: "You were just below the Floor — the plan supporting more than you were asking for — and you raised the Datum. The Datum moved {deltaDatum_fmt} from your start, climbing toward or into the zone the plan was already designed to carry. You're not straining the plan. You're asking it to do what it was built to do.",
            lv: "The Datum is now {floorGap_fmt} from the Floor and {ceilGap_fmt} from the Ceiling. If you're still below the Floor, the plan's minimum capacity still exceeds your ask — you have room to keep raising. Studio can show what the full supported range looks like given your actual accounts."
          },
          'ABUNDANT_WELL_BELOW_UP': {
            op: "You were well below the Floor — spending significantly less than the plan's minimum supportable level — and you raised the Datum substantially. The Datum moved {deltaDatum_fmt} from your start, testing how far up into the plan's range you can reach. The plan has more capacity than your starting Datum suggested. This drag is the first real stress on that capacity.",
            lv: "Even at {newDatum_fmt}, the plan may still have room above where the Datum sits. The question is whether you've crossed the Floor yet — and if so, whether you're still within comfortable range or approaching the Ceiling. Studio can show your exact position in the plan's supported range and what it would take to go further."
          },
          'OVEREXTENDED_STRUCTURAL_DN': {
            op: "You were significantly above the Ceiling — the plan unable to reach your spending level — and you pulled back. The Datum moved {deltaDatum_fmt} from your start, dropping toward or into viable territory. This is the right direction. Whether you've crossed back into a range the plan can support depends on how far you came.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. If you're still above it, a further reduction — or a structural change to the plan — is needed to get to feasibility. If you've crossed below it, you're back in a range the plan can carry. Studio can show exactly where the threshold sits and what it takes to stay below it."
          },
          'OVEREXTENDED_ENTRY_DN': {
            op: "You were just barely over the Ceiling — spending slightly above what the plan currently supports — and you eased back. The Datum moved {deltaDatum_fmt} from your start, dropping toward a range the plan can actually reach. A small reduction from just over the Ceiling is often all it takes to move from broken to workable.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. If you've crossed below it, you're back inside a range the plan supports. Studio can show you what the plan's actual capacity looks like at this spending level — including how much buffer you now have before you'd approach the limit again."
          },
          'STRETCHED_HIGH_END_DN': {
            op: "You were nearly touching the Ceiling from below — spending at the edge of what the plan supports without crossing it — and you eased back. The Datum moved {deltaDatum_fmt} from your start, creating breathing room between your spending and the plan's upper limit. This is a margin move: you're testing how much distance from the Ceiling changes the plan's resilience.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. That gap is the plan's buffer — the room it has to absorb a bad sequence of returns before your spending becomes unsustainable. Studio can show what that buffer is worth under real stress scenarios, not just the base-case projection."
          },
          'STRETCHED_STANDARD_DN': {
            op: "You were in Stretched — spending near the Ceiling with limited margin — and you lowered the Datum. The Datum moved {deltaDatum_fmt} from your start, moving from a tight range into more comfortable territory. Lower spending in a Stretched plan doesn't just reduce the ask — it rebuilds the plan's ability to handle volatility.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. The middle of Expansive is where the plan runs most freely — you're testing whether this spending level fits there. Studio can show how this Datum holds up under different sequence-of-returns scenarios at your specific account structure."
          },
          'EXPANSIVE_CEILING_SIDE_DN': {
            op: "You were in the upper range of Expansive — spending comfortably but toward the higher end of the plan's supported range — and you lowered it. The Datum moved {deltaDatum_fmt} from your start, shifting toward the middle of what the plan can carry. This is a deliberate move toward the plan's center of gravity.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. Moving down from the upper range increases the plan's resilience without reducing the ask dramatically. Studio can quantify how much additional buffer this Datum position creates under stress."
          },
          'EXPANSIVE_CENTERED_DN': {
            op: "You were in the middle of Expansive — spending balanced, plan running freely — and you lowered the Datum. The Datum moved {deltaDatum_fmt} from your start, dropping toward the lower range of what the plan supports. You're testing what a more conservative ask looks like from a comfortable starting point.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. At this level, you're asking the plan to carry less than it comfortably can. Studio can show what the gap between this Datum and the plan's full capacity could fund — earlier retirement, a larger legacy, or a stronger stress buffer."
          },
          'EXPANSIVE_FLOOR_SIDE_DN': {
            op: "You were in the lower range of Expansive — spending modestly but within the plan's supported zone — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, dropping toward Grounded territory. You're asking what happens at the conservative end of what the plan can carry.",
            lv: "The Datum is now {floorGap_fmt} above the Floor. You're testing the approach to the plan's minimum — the level at which the Floor and the Datum converge. Studio can show what the surplus between this Datum and the plan's full capacity could be used for, and whether the conservative ask is the right long-term choice."
          },
          'GROUNDED_STABLE_DN': {
            op: "You were near the Floor — spending close to the plan's minimum supportable level — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, approaching or crossing below the Floor. When the ask drops below what the plan needs to run, the plan doesn't fail — it builds surplus. The question is whether that surplus is intentional.",
            lv: "The Datum is now {floorGap_fmt} from the Floor. If you've crossed below it, you're in Abundant territory — the plan's minimum capacity now exceeds your ask. Studio can show what that margin represents: how much earlier you could retire, how much larger a legacy the plan supports, or how much stress resilience you're building."
          },
          'GROUNDED_TIGHT_DN': {
            op: "You were in the paradox zone — spending so close to the Floor that the plan's minimum and your ask were nearly identical — and you lowered the Datum below it. The Datum moved {deltaDatum_fmt} from your start, crossing from the tightest possible margin into Abundant territory. This is a strong conservative signal: you're asking for less than the plan's minimum output.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan was already designed to carry more than you're asking for. Studio can show what that surplus could fund — and help you decide whether this level of conservatism is a deliberate choice or a starting point worth revisiting."
          },
          'ABUNDANT_JUST_BELOW_DN': {
            op: "You were just below the Floor — the plan already supporting more than your ask — and you lowered the Datum further. The Datum moved {deltaDatum_fmt} from your start, pushing deeper into Abundant territory. You're asking less than the plan's minimum. This move makes that gap wider.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan has meaningful unused capacity above this spending level. Studio can show what the gap between {newDatum_fmt} and the plan's full capacity actually represents — in years, in legacy, or in resilience."
          },
          'ABUNDANT_WELL_BELOW_DN': {
            op: "You were already well below the Floor — spending significantly less than the plan's minimum supportable level — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, approaching the drag floor at half your original pin. This is the most conservative ask the Sketch can model. You're testing what the plan looks like when the spending question is set aside almost entirely.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan has substantial unused capacity above this level. Studio can show what that full capacity represents — and whether the conservative anchor is a deliberate structural choice or a number worth reconsidering."
          }
        };

        // ── L1 table: 102 cells (entry × direction × landing) ─────────────────────
        var _eL1 = {
          'OVEREXTENDED_STRUCTURAL_UP_OVEREXTENDED_STRUCTURAL': { op: "⚠️ You were significantly above the Ceiling — already in Overextended territory — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_STRUCTURAL_DN_OVEREXTENDED_STRUCTURAL': { op: "⚠️ You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_STRUCTURAL_DN_OVEREXTENDED_ENTRY':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_STRUCTURAL_DN_STRETCHED_HIGH_END':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'OVEREXTENDED_STRUCTURAL_DN_STRETCHED_STANDARD':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'OVEREXTENDED_STRUCTURAL_DN_EXPANSIVE_CEILING_SIDE':  { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'OVEREXTENDED_ENTRY_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were just over the Ceiling — on the edge of feasibility — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_ENTRY_UP_OVEREXTENDED_ENTRY':           { op: "You were just over the Ceiling — on the edge of feasibility — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_ENTRY_DN_OVEREXTENDED_ENTRY':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_ENTRY_DN_STRETCHED_HIGH_END':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'OVEREXTENDED_ENTRY_DN_STRETCHED_STANDARD':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'OVEREXTENDED_ENTRY_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'OVEREXTENDED_ENTRY_DN_EXPANSIVE_CENTERED':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_HIGH_END_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'STRETCHED_HIGH_END_UP_OVEREXTENDED_ENTRY':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'STRETCHED_HIGH_END_UP_STRETCHED_HIGH_END':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_HIGH_END_DN_STRETCHED_HIGH_END':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_HIGH_END_DN_STRETCHED_STANDARD':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_CENTERED':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'STRETCHED_STANDARD_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'STRETCHED_STANDARD_UP_OVEREXTENDED_ENTRY':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'STRETCHED_STANDARD_UP_STRETCHED_HIGH_END':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_STANDARD_UP_STRETCHED_STANDARD':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_STANDARD_DN_STRETCHED_STANDARD':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_CENTERED':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'STRETCHED_STANDARD_DN_GROUNDED_STABLE':              { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CEILING_SIDE_UP_OVEREXTENDED_STRUCTURAL':  { op: "⚠️ You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_CEILING_SIDE_UP_OVEREXTENDED_ENTRY':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_CEILING_SIDE_UP_STRETCHED_HIGH_END':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_CEILING_SIDE_UP_STRETCHED_STANDARD':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_CEILING_SIDE_UP_EXPANSIVE_CEILING_SIDE':   { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_CEILING_SIDE':   { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_CENTERED':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_FLOOR_SIDE':     { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_CEILING_SIDE_DN_GROUNDED_STABLE':          { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CEILING_SIDE_DN_GROUNDED_TIGHT':           { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_CENTERED_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_CENTERED_UP_OVEREXTENDED_ENTRY':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_CENTERED_UP_STRETCHED_HIGH_END':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_CENTERED_UP_STRETCHED_STANDARD':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_CENTERED_UP_EXPANSIVE_CEILING_SIDE':       { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CENTERED_UP_EXPANSIVE_CENTERED':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CENTERED_DN_EXPANSIVE_CENTERED':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CENTERED_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_CENTERED_DN_GROUNDED_STABLE':              { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CENTERED_DN_GROUNDED_TIGHT':               { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_CENTERED_DN_ABUNDANT_JUST_BELOW':          { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'EXPANSIVE_FLOOR_SIDE_UP_OVEREXTENDED_STRUCTURAL':    { op: "⚠️ You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_FLOOR_SIDE_UP_OVEREXTENDED_ENTRY':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_FLOOR_SIDE_UP_STRETCHED_HIGH_END':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_FLOOR_SIDE_UP_STRETCHED_STANDARD':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_CEILING_SIDE':     { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_CENTERED':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_FLOOR_SIDE':       { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_FLOOR_SIDE_DN_EXPANSIVE_FLOOR_SIDE':       { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_FLOOR_SIDE_DN_GROUNDED_STABLE':            { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_FLOOR_SIDE_DN_GROUNDED_TIGHT':             { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_FLOOR_SIDE_DN_ABUNDANT_JUST_BELOW':        { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'EXPANSIVE_FLOOR_SIDE_DN_ABUNDANT_WELL_BELOW':        { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'GROUNDED_STABLE_UP_OVEREXTENDED_ENTRY':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'GROUNDED_STABLE_UP_STRETCHED_HIGH_END':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'GROUNDED_STABLE_UP_STRETCHED_STANDARD':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'GROUNDED_STABLE_UP_EXPANSIVE_CEILING_SIDE':          { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'GROUNDED_STABLE_UP_EXPANSIVE_CENTERED':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'GROUNDED_STABLE_UP_EXPANSIVE_FLOOR_SIDE':            { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'GROUNDED_STABLE_UP_GROUNDED_STABLE':                 { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_STABLE_DN_GROUNDED_STABLE':                 { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_STABLE_DN_GROUNDED_TIGHT':                  { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_STABLE_DN_ABUNDANT_JUST_BELOW':             { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'GROUNDED_STABLE_DN_ABUNDANT_WELL_BELOW':             { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'GROUNDED_TIGHT_UP_STRETCHED_HIGH_END':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'GROUNDED_TIGHT_UP_STRETCHED_STANDARD':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_CEILING_SIDE':           { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_CENTERED':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_FLOOR_SIDE':             { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'GROUNDED_TIGHT_UP_GROUNDED_STABLE':                  { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_TIGHT_UP_GROUNDED_TIGHT':                   { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_TIGHT_DN_GROUNDED_TIGHT':                   { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_TIGHT_DN_ABUNDANT_JUST_BELOW':              { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'GROUNDED_TIGHT_DN_ABUNDANT_WELL_BELOW':              { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_JUST_BELOW_UP_STRETCHED_STANDARD':          { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_CEILING_SIDE':      { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_CENTERED':          { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_FLOOR_SIDE':        { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'ABUNDANT_JUST_BELOW_UP_GROUNDED_STABLE':             { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'ABUNDANT_JUST_BELOW_UP_GROUNDED_TIGHT':              { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'ABUNDANT_JUST_BELOW_UP_ABUNDANT_JUST_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_JUST_BELOW_DN_ABUNDANT_JUST_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_JUST_BELOW_DN_ABUNDANT_WELL_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_WELL_BELOW_UP_STRETCHED_STANDARD':          { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_CEILING_SIDE':      { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_CENTERED':          { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_FLOOR_SIDE':        { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'ABUNDANT_WELL_BELOW_UP_GROUNDED_STABLE':             { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'ABUNDANT_WELL_BELOW_UP_GROUNDED_TIGHT':              { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'ABUNDANT_WELL_BELOW_UP_ABUNDANT_JUST_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_WELL_BELOW_UP_ABUNDANT_WELL_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_WELL_BELOW_DN_ABUNDANT_WELL_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." }
        };

        /* DORMANT — Round 13: _eL2 table retired. L2 distinct angles absorbed into _eL1. Preserve for Phase 2.7 resurrection option.
        // ── L2 table: 11 cells (landing sub-zone) ────────────────────────────────
        var _eL2 = {
          'OVEREXTENDED_STRUCTURAL': { mod: "The Datum has crossed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this spending level, the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap and bring {newDatum_fmt} back into a range the plan can actually reach." },
          'OVEREXTENDED_ENTRY':      { mod: "The Datum sits just above the Ceiling — {ceilGap_fmt} past the plan's current limit. The gap is small enough that a targeted change could close it. Studio can show the cost of closing it at your account structure — and whether it's a lever move or a plan revision." },
          'STRETCHED_HIGH_END':      { mod: "The Datum has landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan can carry {newDatum_fmt}, but with very little room to absorb a bad sequence of returns. Studio can show what that thin margin looks like under stress and whether it's a deliberate trade or a risk worth managing differently." },
          'STRETCHED_STANDARD':      { mod: "The Datum has landed in the Stretched zone — supported by the plan, but with limited buffer between spending and the Ceiling. There's {ceilGap_fmt} to the upper limit. The plan works here, but sequence-of-returns risk matters more than it does in the middle of the range. Studio can show how this spending level holds up under a range of market scenarios at your specific account structure." },
          'EXPANSIVE_CEILING_SIDE':  { mod: "The Datum has landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan supports this spending level with room to run. Studio can show how that upper-range position performs across different sequences of returns — and whether there's more capacity available." },
          'EXPANSIVE_CENTERED':      { mod: "The Datum has landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely: enough distance from both limits to handle normal volatility without structural pressure. Studio can confirm this is the right range for your accounts and income timing." },
          'EXPANSIVE_FLOOR_SIDE':    { mod: "The Datum has landed in the lower range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan supports this level comfortably. You're asking less than you could, which means there's room above if circumstances change. Studio can show what the gap between {newDatum_fmt} and the plan's upper capacity represents." },
          'GROUNDED_STABLE':         { mod: "The Datum has landed near the Floor — {floorGap_fmt} above the plan's minimum. The plan supports this spending level, but the margin to the lower boundary is thin. Studio can show how close this Datum is to the Floor in real terms, and what happens if portfolio returns come in below the base case." },
          'GROUNDED_TIGHT':          { mod: "The Datum has landed in the paradox zone — {floorGap_fmt} from the Floor, nearly identical to the plan's minimum. The plan supports this level, but barely. There's almost no margin between what you're asking and the absolute lower bound. Studio can show what a small change in either direction does to that margin — and whether staying this close to the Floor is intentional." },
          'ABUNDANT_JUST_BELOW':     { mod: "The Datum now sits just below the Floor — the plan's minimum capacity exceeds what you're asking for by {floorGap_fmt}. The plan has surplus above this spending level. Studio can show what that margin could fund: an earlier retirement date, a larger legacy target, or a stronger stress buffer against poor market sequences." },
          'ABUNDANT_WELL_BELOW':     { mod: "The Datum now sits well below the Floor — the plan's minimum capacity exceeds your ask by {floorGap_fmt}. There's substantial unused capacity in the plan above this spending level. Studio can show what that surplus represents in concrete terms — years, legacy, or resilience — and help you decide whether this level of conservatism is a choice or a starting point." }
        };
        */

        // ── Router + render (2 cards: L1 opening, L2 landing) ───────────────────
        var _eL1Cell = _eL1[_eL1Key] || _eL1Fallback[_eL1FbKey] || _eL1Fallback['EXPANSIVE_CENTERED_' + _eDir];
        // Round 13: L2 render disabled — L1 absorbed distinct angles. Re-enable for Phase 2.7 resurrection.
        // var _eL2Cell = _eL2[_eL2Key] || _eL2['EXPANSIVE_CENTERED'];
        html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + _eEntryName,
          _eFill(_eL1Cell.op), 'datum', r.datumTarget);
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the required capital for this Datum adjusts — the designed-in balance carries part of the load.'); }
        // G56/G57 horizon studio bridge for OE landing states
        if (_eLandName === 'OVEREXTENDED') {
          var _eBridge = _eLandSz === 'STRUCTURAL'
            ? '⚠️ The Datum has crossed significantly above the Ceiling — {ceilGap_fmt} past the plan\'s upper limit. At this spending level, the plan\'s current structure can\'t deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap and bring {newDatum_fmt} back into a range the plan can actually reach. One lever needs no new capital — a shorter retirement length lifts the Ceiling toward {newDatum_fmt} on the same pile, honest only if that horizon is genuine.'
            : 'The Datum sits just above the Ceiling — {ceilGap_fmt} past the plan\'s current limit. The gap is small enough that a targeted change could close it. Studio can show the cost of closing it at your account structure — and whether it\'s a lever move or a plan revision. A shorter retirement length is one such lever — it raises the Ceiling toward {newDatum_fmt} without new capital, if the horizon truly is shorter.';
          html += studioCTA(_eFill(_eBridge));
        }
        // Lever suggestion (H29-H32) for fallback entries
        if (_eL1Cell.lv) {
          html += studioCTA(_eFill(_eL1Cell.lv));
        }
        // html += item('req-item-datum', _eLandClr, _eLandName + ' — LANDING',
        //   _eFill(_eL2Cell.mod), null, null);
        req.innerHTML = html;
        return;
      }

      // ── Block D: Y=0 retire today ────────────────────────────────────
      if (r.block === 'D') {
        // Framing D: Y=0 → gfDatum_spec=1, C2=0; portfolio top-up only (spec §7 R97)
        if (Math.abs(dd) > 0.5) {
          var _C1D0 = DATUM_SUPPORT_RATE; // gfDatum=(1.045)^0=1
          var _ddM0 = dd / 1000;
          var _reqDatP0 = _C1D0 > 0 ? Math.max(_ddM0 / _C1D0, 0) : 0;
          var _reqCeilP0 = r.reqP_M || 0;
          var _dispP0 = Math.max(_reqCeilP0, _reqDatP0);
          var _eps0 = DRIVER_TIE_EPSILON * Math.max(_reqDatP0, _reqCeilP0, 0.001);
          var _datDrv0 = _reqDatP0 - _reqCeilP0 > _eps0;
          var _tied0   = Math.abs(_reqDatP0 - _reqCeilP0) <= _eps0;
          var _cp0 = _tied0
            ? 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Ceiling and Datum are pulling together — both need the same portfolio at this rate.'
            : _datDrv0
              ? 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Datum spending is the line driving this number — the Ceiling sits within the same portfolio.'
              : 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Ceiling is setting this amount — your Datum sits comfortably within reach.';
          html += headCard('Retirement today. Portfolio is the only lever.',
            'Your Datum also moved. This number is the larger of what the Ceiling needs and what your Datum needs.');
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO', _cp0, 'capital', (_sNorm.portfolioVol + _dispP0), r.datumTarget);
          html += studioCTA('Studio can model whether your accounts can support spending at ' + fmtKyr(r.datumTarget) + ' within this shape.');
          req.innerHTML = html;
          return;
        }
        html += headCard(
          'You\'re modeling retirement today. Contributions don\'t factor in — your portfolio is the only lever.',
          'At retirement, the ceiling is simply your portfolio times the withdrawal rate. To reach ' + fmtKyr(r.ceilTarget) + ', you\'d need a starting balance of ' + fmtPort(r.reqP_M) + '.'
        );
        if (r.dP_M <= 0) {
          html += item('req-item-ceil', 'var(--gold)', 'PORTFOLIO — SURPLUS',
            'That\'s ' + fmtPort(Math.abs(r.dP_M)) + ' less than your current balance. Your floor would sit at ' + fmtKyr(r.impliedFloor_k) + '.',
            null, null);
        } else {
          html += item('req-item-ceil', 'var(--gold)', 'PORTFOLIO',
            'That\'s ' + fmtPort(r.dP_M) + ' more than your current balance. Your floor would sit at ' + fmtKyr(r.impliedFloor_k) + '.',
            'capital', (_sNorm.portfolioVol + r.dP_M));
        }
        html += studioCTA('Studio can model whether your actual account structure, Social Security timing, and income sources support spending at this level — without requiring additional portfolio growth.');
        req.innerHTML = html;
        return;
      }

      // ── Block C: dual drag — Cramer solve ────────────────────────────
      if (r.block === 'C') {
        if (r.hardStop) {
          var _cStop = '';
          if (r.hardStop.type === 'floor_above_ceil') {
            _cStop = 'The floor can\'t sit above the ceiling — that shape doesn\'t exist. Pull the ceiling higher or the floor lower.';
          } else if (r.hardStop.type === 'degenerate') {
            _cStop = 'The shape you\'ve drawn has ceiling and floor targets that move in the same ratio as the levers — there\'s no unique solution. Adjust one endpoint slightly and try again.';
          } else if (r.hardStop.type === 'negative_portfolio') {
            _cStop = 'This combination would require a negative portfolio — more owed than owned — so no real plan can reach it. Bring the Floor and Ceiling closer to today\'s Shape or explore a less extreme mix in Studio.';
          }
          html += warn('req-item-ceil', 'var(--danger-red)', 'TARGET NOT REACHABLE', _cStop);
          req.innerHTML = html;
          return;
        }
        // Framing D: hasDatum branch — Cramer-preserve + portfolio top-up (spec §12 R227)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling (suppress Path Options)
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            req.innerHTML = html; return;
          }
          var _YC = _sNorm.yearsToGrow || 0;
          var _gfC = _YC > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YC) : 1;
          var _C1C = _gfC * DATUM_SUPPORT_RATE;
          var _C2C = _YC > 0 ? DATUM_SUPPORT_RATE * ((_gfC - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMC = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwFlrC = r.datumTarget <= r.floorTarget + 0.5;
          // Cramer-preserve: compute how much Datum support the existing Cramer pair already provides
          var _datSupC = (_C1C * r.dP_M) + (_C2C * (r.dK_dollars / 1e6));
          var _shortC  = _datBlwFlrC ? 0 : Math.max(_ddMC - _datSupC, 0);
          var _dPdispC = r.dP_M + (_C1C > 0 ? _shortC / _C1C : 0); // top-up portfolio; dK unchanged
          // comboWarnP extension: check post-top-up portfolio
          if (r.comboWarnK || r.comboWarnP || _dPdispC > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-ceil', 'var(--gold)', 'OUTSIDE PRACTICAL RANGE',
              'Hitting all three targets at once would need lever moves beyond practical ranges. Ease one end of the Shape, or use Studio to test a version that fits your real accounts.');
            html += studioCTA('Studio can test whether this specific shape is achievable given your actual account types, tax treatment, and income timing — and show the sequencing that gets you closest.');
            req.innerHTML = html; return;
          }
          // Driving line: did Datum require the top-up, or was the Cramer pair sufficient?
          var _datDrvC = _shortC > 0.001;
          var _dKdispC = r.dK_dollars;
          var _cDirC   = _dKdispC >= 0 ? 'increase' : 'reduce';
          var _cBodyC_FD = 'To reach this shape: add ' + fmtPort(_dPdispC) + ' to your balance and '
            + _cDirC + ' contributions by ' + fmtContrib(_dKdispC) + '/year. ';
          if (_datDrvC) {
            _cBodyC_FD += 'You moved the Ceiling to ' + fmtKyr(r.ceilTarget) + ', the Floor to ' + fmtKyr(r.floorTarget) + ', and your Datum to ' + fmtKyr(r.datumTarget) + '. Your Datum spending is the line driving the portfolio number — the Ceiling and Floor are carried by the contribution lever.';
          } else if (Math.abs(dc) >= Math.abs(df)) {
            _cBodyC_FD += 'Your Ceiling move is what is setting this combination — your Datum has moved to ' + fmtKyr(r.datumTarget) + ' and is carried within the Cramer solution without additional levers.';
          } else {
            _cBodyC_FD += 'Your Floor move is the most demanding line — your Datum has moved to ' + fmtKyr(r.datumTarget) + ' and is carried within the Cramer solution without additional levers.';
          }
          if (_datBlwFlrC) {
            _cBodyC_FD += ' Your Datum sits at or below your Floor — the plan supports your spending target without additional levers.';
          }
          html += headCard('You\'ve set a specific shape with all three lines moved. Here\'s the lever combination.',
            'The Cramer system solves Ceiling and Floor together. Any Datum shortfall adds a portfolio-only top-up — contributions are unchanged.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the combination below reflects what\'s still needed — both levers shrink because part of the gap is already designed in.'); }
          html += itemD('req-item-ceil', 'var(--gold)', 'COMBINATION: PORTFOLIO + CONTRIBUTIONS', _cBodyC_FD, 'capital', (_sNorm.portfolioVol + _dPdispC), r.datumTarget);
          (function() {
            var _h4Curr   = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.ceilSpend <= 0 || pts.floorSpend <= 0) return;
            var _h4ScReqCeil = r.ceilTarget  * _h4ScCurr / pts.ceilSpend;
            var _h4ScReqFlr  = r.floorTarget * _h4ScCurr / pts.floorSpend;
            var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqFlr);
            if (pts.datumSpend > 0) {
              var _h4ScReqDat = r.datumTarget * _h4ScCurr / pts.datumSpend;
              _h4ScReq = Math.max(_h4ScReq, _h4ScReqDat);
            }
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4Body = 'Plan through ' + _h4C + ' instead of ' + _h4PlanOld + '. A single shorter retirement holds both the Ceiling and the Floor you\'ve pulled, on the same balance — no new capital, no extra working years. Your Datum move is included. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          req.innerHTML = html; return;
        }
        if (r.comboWarnK || r.comboWarnP) {
          html += warn('req-item-ceil', 'var(--gold)', 'OUTSIDE PRACTICAL RANGE',
            'Hitting both targets at once would need lever moves beyond practical ranges for capital, savings, or timing. Ease one end of the Shape, or — if your retirement is genuinely shorter — a shorter retirement length raises the safe draw and can close part of the gap without new capital. Studio can test a version that fits your real accounts.');
          html += studioCTA('Studio can test whether this specific shape is achievable given your actual account types, tax treatment, and income timing — and show the sequencing that gets you closest.');
          req.innerHTML = html;
          return;
        }
        html += headCard(
          'You\'ve set a specific shape. Here\'s the lever combination that gets you there.',
          'With both Floor and Ceiling pulled, this design needs portfolio and contribution changes working together; neither lever on its own can reach this target combo.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the combination below reflects what\'s still needed — both levers shrink because part of the gap is already designed in.'); }
        var _cBodyC = '';
        if (r.dP_M >= 0 && r.dK_dollars >= 0) {
          _cBodyC = 'To reach this shape: add ' + fmtPort(r.dP_M) + ' to your starting balance and ' + fmtContrib(r.dK_dollars) + ' to contributions. These two levers together solve for your ceiling and floor simultaneously.';
        } else if (r.dP_M >= 0 && r.dK_dollars < 0) {
          _cBodyC = 'To reach this shape: add ' + fmtPort(r.dP_M) + ' to your balance and reduce contributions by ' + fmtContrib(r.dK_dollars) + '. The specific shape you\'ve drawn requires less contribution weight and more lump-sum balance.';
        } else {
          _cBodyC = 'This shape requires a lower starting balance (' + fmtPort(Math.abs(r.dP_M)) + ' less) and higher contributions (' + fmtContrib(r.dK_dollars) + ' more). You\'re trading lump-sum for ongoing input.';
        }
        _cBodyC += ' <em style="color:rgba(255,255,255,0.5);font-size:11px;">Note: retirement age is held constant in this solve. If either lever result seems impractical, extending retirement by even one year materially changes what\'s feasible.</em>';
        var _cReqType = 'capital';
        var _cReqVal  = _sNorm.portfolioVol + r.dP_M;
        html += item('req-item-ceil', 'var(--gold)', 'COMBINATION: PORTFOLIO + CONTRIBUTIONS', _cBodyC, _cReqType, _cReqVal);
        // Surface D: cross-route Block E datum analysis when datum also dragged alongside Block C
        if (Math.abs(dd) > 0.5) {
          var _cdE = solveInverse(0, 0, dd, pts, _sNorm);
          if (_cdE.block === 'E') {
            var _cdEState = getShapeStateObj({ ceilSpend: _cdE.ceilTarget, floorSpend: _cdE.floorTarget, datumSpend: _cdE.datumTarget });
            var _cdEName  = _cdEState ? _cdEState.name : 'EXPANSIVE';
            html += '<div class="req-item" style="border-left-color:rgba(255,255,255,0.08);background:none;margin:8px 0 2px;padding:3px 0;">'
              + '<div class="req-item-body" style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">DATUM SHIFT</div></div>';
            html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + _cdEName,
              (_cdEState && _cdEState.key === 'overextended' && _cdEState.subZone === 'STRUCTURAL' ? '⚠️ ' : '') + 'Your Datum has also moved to ' + fmtKyr(_cdE.datumTarget) + '. With the Shape set by the Floor and Ceiling above, this Datum position is ' + (_cdEName.charAt(0).toUpperCase() + _cdEName.slice(1).toLowerCase()) + '.',
              null, null);
            html += studioCTA('Studio can test whether your accounts and income structure can actually support spending at ' + fmtKyr(_cdE.datumTarget) + ' within this designed Shape — and what sequencing makes it most tax-efficient.');
          }
        } else {
          // Workstream Y — Block C × Datum context (Datum static; |dd| ≤ 0.5)
          var _wyDatObj_C  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: pts.datumSpend });
          var _wyDatZone_C = _wyDatObj_C ? _wyDatObj_C.key : 'expansive';
          var _nCf_C = fmtKyr(r.ceilTarget);
          var _nFf_C = fmtKyr(r.floorTarget);
          var _pDf_C = fmtKyr(pts.datumSpend);
          var _cGf_C = fmtKyr(Math.abs(r.ceilTarget - pts.datumSpend));
          var _fGf_C = fmtKyr(Math.abs(pts.datumSpend - r.floorTarget));
          var _wyCtx_C = '';
          if (_wyDatZone_C === 'overextended') {
            _wyCtx_C = '⚠️ Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now above the new Ceiling. The Shape was repositioned, but the Datum sits outside it. The plan can\'t deliver at this spending level under the new geometry. Studio can identify what structural change closes the gap most efficiently. Shortening the retirement length raises the Ceiling toward ' + _pDf_C + ' on the same pile — a real option if that horizon is genuine, not just a way to make the number work.';
          } else if (_wyDatZone_C === 'stretched') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _cGf_C + ' from the upper limit. The Datum is inside the new Shape but near its top. The plan carries this spending level, though with limited buffer. Studio can show how that thin margin behaves under real market scenarios at your account structure.';
          } else if (_wyDatZone_C === 'expansive') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' sits ' + _cGf_C + ' below the Ceiling and ' + _fGf_C + ' above the Floor. The new Shape positions the Datum comfortably in the middle — neither edge is close. Studio can show how this balanced position holds across a range of market scenarios.';
          } else if (_wyDatZone_C === 'grounded') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _fGf_C + ' above the new Floor. The Datum is sitting near the lower boundary of the new Shape. The plan supports it, but the lower margin is thin. Studio can show what happens to that margin when returns come in below the base case.';
          } else if (_wyDatZone_C === 'abundant') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _fGf_C + ' below the new Floor. The new Shape\'s lower boundary has risen above the Datum. The plan\'s minimum capacity now exceeds what you\'re asking for. Studio can show what that surplus represents in concrete terms — years, legacy, or resilience.';
          }
          if (_wyCtx_C) {
            html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_C ? _wyDatObj_C.name : 'EXPANSIVE'), _wyCtx_C, null, null);
          }
        }
        (function() {
          var _h4Curr   = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          if (pts.ceilSpend <= 0 || pts.floorSpend <= 0) return;
          var _h4ScReqCeil = r.ceilTarget  * _h4ScCurr / pts.ceilSpend;
          var _h4ScReqFlr  = r.floorTarget * _h4ScCurr / pts.floorSpend;
          var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqFlr);
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4PlanOld = _sNorm.planThroughAge || 93;
          var _h4Body = 'Plan through ' + _h4C + ' instead of ' + _h4PlanOld + '. A single shorter retirement holds both the Ceiling and the Floor you\'ve pulled, on the same balance — no new capital, no extra working years. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
          if (Math.abs(_h4Delta) > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
        })();
        html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
        req.innerHTML = html;
        return;
      }

      // ── Block A: ceiling-only drag ────────────────────────────────────
      if (r.block === 'A') {
        // Framing D: Datum + Ceiling — Scenario 2 (spec §10 R148-R158)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            req.innerHTML = html; return;
          }
          var _YA = _sNorm.yearsToGrow || 0;
          var _gfA = _YA > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YA) : 1;
          var _C1A = _gfA * DATUM_SUPPORT_RATE;
          var _C2A = _YA > 0 ? DATUM_SUPPORT_RATE * ((_gfA - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMA = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwA = r.datumTarget <= r.floorTarget + 0.5;
          var _reqDatPA = _datBlwA ? 0 : Math.max(_ddMA / _C1A, 0);
          var _reqDatKA = (_datBlwA || _C2A === 0) ? 0 : Math.max(_ddMA / _C2A * 1e6, 0);
          // MAX-over-clearance per path
          var _pthPA = r.paths && r.paths[0];
          var _pthKA = r.paths && r.paths[1];
          var _pthRA = r.paths && r.paths[2];
          var _bndPA = (_pthPA && _pthPA.dP_M != null) ? _pthPA.dP_M : 0;
          var _bndKA = (_pthKA && _pthKA.dK_dollars != null) ? _pthKA.dK_dollars : 0;
          var _dispPA = Math.max(_bndPA, _reqDatPA);
          var _dispKA = Math.max(_bndKA, _reqDatKA);
          // PATH 3: MAX(boundary age, datum age)
          var _raDA = _d2BinarySearchYDatum(r.datumTarget / 1000, _sNorm);
          var _raBndA = (_pthRA && _pthRA.reqRetireAge) ? _pthRA.reqRetireAge : _sNorm.activationAge;
          var _raDispA = Math.max(_raBndA, _raDA);
          var _dYA = _raDispA - _sNorm.activationAge;
          // Driving line (portfolio path as primary indicator)
          var _epsA = DRIVER_TIE_EPSILON * Math.max(_reqDatPA, _bndPA, 0.001);
          var _datDrvA = _reqDatPA - _bndPA > _epsA;
          var _tiedA   = Math.abs(_reqDatPA - _bndPA) <= _epsA;
          // Guard 3: all zero
          if (_dispPA <= 0 && _dispKA <= 0 && _dYA <= 0) {
            html += headCard('NO ADDITIONAL LEVERS NEEDED',
              'You moved your Shape in a direction your current plan already supports. No portfolio addition, contribution increase, or retirement delay is needed.');
            req.innerHTML = html; return;
          }
          html += headCard('You pulled the Ceiling and moved your Datum. Here\'s what it takes to hold both.',
            'Each path shows the larger of what the Ceiling needs and what your Datum needs.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
          // PATH 1 — PORTFOLIO
          var _p1A = _tiedA
            ? 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Ceiling and Datum are pulling together — both need the same portfolio addition.'
            : _datDrvA
              ? 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Datum target is the line driving this number — the Ceiling move is already within reach of the same portfolio.'
              : 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Ceiling move is what is setting this number — your Datum move is included but sits within reach.';
          if (_datBlwA) _p1A += ' Your Datum sits at or below your Floor — the plan supports your spending target without extra portfolio.';
          if (_dispPA > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO',
              'Reaching these targets via portfolio alone requires more than twice your current balance. A split across levers is more practical.');
          } else {
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO', _p1A, 'capital', (_sNorm.portfolioVol + _dispPA), r.datumTarget);
          }
          // PATH 2 — CONTRIBUTIONS
          var _epsKA = DRIVER_TIE_EPSILON * Math.max(_reqDatKA, _bndKA, 0.001);
          var _datDrvKA = _reqDatKA - _bndKA > _epsKA;
          var _p2A = _datDrvKA
            ? 'Add ' + fmtContrib(_dispKA) + ' to your annual contributions. The contribution lever has to support both the Ceiling pull and your Datum target — your Datum is the line setting how much.'
            : 'Add ' + fmtContrib(_dispKA) + ' to your annual contributions. This lifts your Ceiling — your Datum target is included and sits within reach of the same amount.';
          if (Math.abs(_dispKA) > 50000) {
            html += warn('req-item-ceil', 'var(--gold)', 'PATH 2 &mdash; CONTRIBUTIONS',
              'Reaching these targets via contributions alone would require ' + fmtContrib(_dispKA) + ' — beyond a practical single-lever move.');
          } else {
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 2 &mdash; CONTRIBUTIONS', _p2A, 'contrib', (_sNorm.annualContrib + _dispKA), r.datumTarget);
          }
          // PATH 3 — RETIRE AGE
          var _datDrvRA = _raDA > _raBndA;
          var _p3A = _datDrvRA
            ? 'Delay retirement by ' + fmtYrs(_dYA) + '. Time amplifies every input — each additional year raises both your Ceiling and your Datum support. Your Datum spending is what is setting the delay needed.'
            : 'Delay retirement by ' + fmtYrs(_dYA) + '. Time amplifies every other input — but it\'s non-linear. Each additional year past ' + _sNorm.activationAge + ' yields a different ceiling gain. Your Datum move is included.';
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 3 &mdash; RETIRE AGE', _p3A, 'retire', _raDispA, r.datumTarget);
          (function() {
            var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.ceilSpend <= 0 || pts.datumSpend <= 0) return;
            var _h4ScReqCeil = r.ceilTarget * _h4ScCurr / pts.ceilSpend;
            var _h4ScReqDat  = r.datumTarget * _h4ScCurr / pts.datumSpend;
            var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqDat);
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4DatDrv = _h4ScReqDat >= _h4ScReqCeil - 0.001;
            var _h4DrvLine = _h4DatDrv ? 'your Datum' : 'your Ceiling';
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4PlanNew = _h4C;
            var _h4YrsOld = _h4PlanOld - _sNorm.activationAge;
            var _h4YrsNew = _h4PlanNew - _sNorm.activationAge;
            var _h4Body = 'Plan through ' + _h4PlanNew + ' instead of ' + _h4PlanOld + ' — about ' + _h4YrsNew + ' years of retirement rather than ' + _h4YrsOld + '. The same portfolio covering fewer years can safely deliver more each year, which lifts the Ceiling to ' + fmtKyr(r.ceilTarget) + ' with no new capital. Your Datum move is included; ' + _h4DrvLine + ' is the line this length is sized for. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          req.innerHTML = html; return;
        }
        var _dc_pct  = r.a1 > 0 ? Math.round(Math.abs(dc / pts.ceilSpend) * 100) : 0;
        var _dc_dir  = dc >= 0 ? 'up' : 'down';
        html += headCard(
          'You pulled the ceiling. Here\'s what it takes to hold it.',
          'You pulled the Ceiling. Holding it here requires real changes in the plan — these three paths show different ways to carry that higher line.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
        var _allSuppA = r.paths.filter(function(p) { return p.lever !== 'retireAge'; }).every(function(p) { return p.softWarn !== null; });
        r.paths.forEach(function(pth) {
          if (pth.lever === 'portfolio') {
            if (pth.hardStop === 'negative_portfolio' || pth.dP_M === null) return;
            if (pth.softWarn === 'too_large') {
              html += warn('req-item-ceil', 'var(--gold)', 'PORTFOLIO',
                'Reaching that ceiling via portfolio alone requires adding ' + fmtPort(pth.dP_M) + ' — more than twice your current balance.');
            } else {
              var _a1Body = 'Add ' + fmtPort(pth.dP_M) + ' to your starting balance. At your horizon, portfolio is the most efficient ceiling lever — every dollar added moves the ceiling ' + fmtPortPer1k(r.a1) + ' and the floor ' + fmtPortPer1k(r.a2) + '.';
              _a1Body += ' <span style="color:rgba(255,255,255,0.55);font-size:11px;">Your floor would also move ' + fmtKyr(Math.abs(pth.floorEffect)) + ' — it rises with the ceiling.</span>';
              html += item('req-item-ceil', 'var(--gold)', 'PATH 1 — PORTFOLIO', _a1Body, 'capital', (_sNorm.portfolioVol + pth.dP_M));
            }
          }
          if (pth.lever === 'contributions') {
            if (pth.dK_dollars === null) return;
            var _ceilFloorRatio = r.b1 > 0 && r.b2 > 0 ? (r.b1 / r.b2).toFixed(1) : '—';
            var _floorRatioC = r.b2 > 0 && r.b1 > 0 ? (r.b2 / r.b1).toFixed(2) : '—';
            if (pth.softWarn === 'too_high') {
              html += warn('req-item-ceil', 'var(--gold)', 'CONTRIBUTIONS',
                'Reaching that ceiling would require adding ' + fmtContrib(pth.dK_dollars) + ' — beyond a realistic single-lever move. A split across portfolio and contributions is more practical.');
            } else {
              var _a2Body = 'Add ' + fmtContrib(pth.dK_dollars) + ' to your annual contributions. That lifts your Ceiling much faster than your Floor — your lower boundary only rises by about ' + fmtKyr(Math.abs(pth.floorEffect)) + '.';
              html += item('req-item-ceil', 'var(--gold)', 'PATH 2 — CONTRIBUTIONS', _a2Body, 'contrib', (_sNorm.annualContrib + pth.dK_dollars));
            }
          }
          if (pth.lever === 'retireAge') {
            var _a3Body = 'Delay retirement by ' + fmtYrs(pth.dY) + '. Time amplifies every other input — but it\'s non-linear. Each additional year past ' + _sNorm.activationAge + ' yields a different ceiling gain.';
            _a3Body += ' <span style="color:rgba(255,255,255,0.55);font-size:11px;">Your floor would also rise — by approximately ' + fmtKyr(Math.abs(pth.floorEffect)) + '.</span>';
            if (pth.softWarn === 'extreme') {
              _a3Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that ceiling through retirement timing alone would require delaying ' + fmtYrs(pth.dY) + '. A combination may be more practical.</em> ' + _a3Body;
            }
            html += item('req-item-ceil', 'var(--gold)', 'PATH 3 — RETIRE AGE', _a3Body, 'retire', pth.reqRetireAge);
          }
        });
        if (_allSuppA && r.combo) {
          html += item('req-item-ceil', 'var(--gold)', 'COMBINATION PATH',
            'No single lever reaches this ceiling cleanly. A practical combination: add ' + fmtPort(r.combo.dP_M) + ' to your balance and ' + fmtContrib(r.combo.dK_dollars) + ' to contributions. Together they close the gap without over-relying on either lever.',
            'capital', (_sNorm.portfolioVol + r.combo.dP_M));
        }
        // PATH 4 — PLANNING HORIZON (Block A: ceiling drag)
        (function() {
          var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          var _h4ScReq  = r.ceilTarget * _h4ScCurr / pts.ceilSpend;
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4    = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C   = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4Dir = _h4Delta < 0 ? 'shorter' : 'longer';
          var _h4Abs = Math.abs(_h4Delta);
          var _h4DFmt = (_h4Abs === 1 ? '1 year' : _h4Abs + ' years') + ' ' + _h4Dir;
          var _h4Body = 'Plan through age ' + _h4C + ' — ' + _h4DFmt + ' than your current assumption. A ' + _h4Dir + ' retirement length ' + (_h4Delta < 0 ? 'raises' : 'lowers') + ' the Ceiling on the same pile by adjusting how long the withdrawals need to last. This is an assumption lever; it holds only if planning through ' + _h4C + ' is genuine.';
          if (_h4Abs > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that ceiling through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += item('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C);
        })();
        // Workstream Y — Block A × Datum context (Shape+Datum Combos)
        var _wyDatObj_A  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _wyDatZone_A = _wyDatObj_A ? _wyDatObj_A.key : 'expansive';
        var _nCf_A = fmtKyr(r.ceilTarget);
        var _pDf_A = fmtKyr(r.datumTarget);
        var _pDfPhrase_A = (Math.abs(dd) > 0.5) ? '' : _pDf_A + ' ';
        var _cGf_A = fmtKyr(Math.abs(r.ceilTarget - r.datumTarget));
        var _fGf_A = fmtKyr(Math.abs(r.datumTarget - r.floorTarget));
        var _datumAck_A = (Math.abs(dd) > 0.5) ? 'You also ' + (dd > 0 ? 'raised' : 'lowered') + ' the Datum ' + fmtKyr(Math.abs(dd)) + ' — it now sits at ' + fmtKyr(r.datumTarget) + '. ' : '';
        var _oeGlyph_A = (_wyDatObj_A && _wyDatObj_A.key === 'overextended') ? '⚠️ ' : '';
        var _wyCtx_A = '';
        if (_wyDatZone_A === 'overextended') {
          _wyCtx_A = 'The Ceiling moved to ' + _nCf_A + ', but your spending at ' + _pDf_A + ' is now above it — the Shape changed, the mismatch didn\'t. Moving the Ceiling doesn\'t resolve a Datum that exceeds it. That takes a structural change to the plan. Studio can show the most direct path to close that ' + _cGf_A + ' gap. One lever you control directly is the retirement length: planning through fewer years raises the Ceiling toward ' + _pDf_A + ' on the same pile — but lean on it only if the shorter horizon is genuine.';
        } else if (_wyDatZone_A === 'stretched') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'sits ' + _cGf_A + ' from the plan\'s upper limit. That\'s a thin margin — the plan carries this Datum, but without much room to absorb a run of poor returns. Studio can show what that buffer looks like under real sequence-of-returns stress, not just the base case.';
        } else if (_wyDatZone_A === 'expansive') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'sits ' + _cGf_A + ' below the plan\'s upper limit. The Datum is well inside the supported range — the Ceiling move preserved or opened meaningful headroom above where you\'re spending. Studio can show what that full range of capacity looks like given your accounts.';
        } else if (_wyDatZone_A === 'grounded') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'is ' + _cGf_A + ' below the upper limit and ' + _fGf_A + ' above the Floor. The Datum is sitting conservatively low relative to what the plan now supports — the Ceiling raise expanded the range above you significantly. Studio can show what the gap between your Datum and the plan\'s full capacity could actually fund.';
        } else if (_wyDatZone_A === 'abundant') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'has dropped below the Floor — the plan\'s minimum capacity now exceeds what you\'re asking for. The Ceiling drag expanded the upper range, but the Datum already sits below the lower boundary. Studio can show what that surplus represents and whether it\'s a deliberate conservative anchor or capacity worth reconsidering.';
        }
        if (_wyCtx_A) {
          html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_A ? _wyDatObj_A.name : 'EXPANSIVE'), _oeGlyph_A + _datumAck_A + _wyCtx_A, null, null);
        }
        req.innerHTML = html;
        return;
      }

      // ── Block B: floor-only drag ──────────────────────────────────────
      if (r.block === 'B') {
        // Framing D: Datum + Floor — Scenario 1 (spec §10 R126-R144)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling (ceiling static here → dc=0, ceilTarget = pts.ceilSpend)
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            req.innerHTML = html; return;
          }
          var _YB = _sNorm.yearsToGrow || 0;
          var _gfB = _YB > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YB) : 1;
          var _C1B = _gfB * DATUM_SUPPORT_RATE;
          var _C2B = _YB > 0 ? DATUM_SUPPORT_RATE * ((_gfB - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMB = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwB = r.datumTarget <= r.floorTarget + 0.5;
          var _reqDatPB = _datBlwB ? 0 : Math.max(_ddMB / _C1B, 0);
          var _reqDatKB = (_datBlwB || _C2B === 0) ? 0 : Math.max(_ddMB / _C2B * 1e6, 0);
          // MAX-over-clearance per path
          var _pthPB = r.paths && r.paths[0];
          var _pthKB = r.paths && r.paths[1];
          var _pthRB = r.paths && r.paths[2];
          var _bndPB = (_pthPB && _pthPB.dP_M != null) ? _pthPB.dP_M : 0;
          var _bndKB = (_pthKB && _pthKB.dK_dollars != null) ? _pthKB.dK_dollars : 0;
          var _dispPB = Math.max(_bndPB, _reqDatPB);
          var _dispKB = Math.max(_bndKB, _reqDatKB);
          // PATH 3: MAX(boundary age, datum age)
          var _raDB = _d2BinarySearchYDatum(r.datumTarget / 1000, _sNorm);
          var _raBndB = (_pthRB && _pthRB.reqRetireAge) ? _pthRB.reqRetireAge : _sNorm.activationAge;
          var _raDispB = Math.max(_raBndB, _raDB);
          var _dYB = _raDispB - _sNorm.activationAge;
          // Driving line (portfolio path primary)
          var _epsPB = DRIVER_TIE_EPSILON * Math.max(_reqDatPB, _bndPB, 0.001);
          var _datDrvPB = _reqDatPB - _bndPB > _epsPB;
          var _flrDrvPB = _bndPB - _reqDatPB > _epsPB;
          var _tiedPB   = !_datDrvPB && !_flrDrvPB;
          // Guard 3: all zero
          if (_dispPB <= 0 && _dispKB <= 0 && _dYB <= 0) {
            html += headCard('NO ADDITIONAL LEVERS NEEDED',
              'You moved your Shape in a direction your current plan already supports. No portfolio addition, contribution increase, or retirement delay is needed.');
            req.innerHTML = html; return;
          }
          html += headCard('You pulled the Floor and moved your Datum. Here\'s what it takes to support both.',
            'Each path shows the larger of what the Floor needs and what your Datum needs.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
          // PATH 1 — PORTFOLIO
          var _p1B = _tiedPB
            ? 'Add ' + fmtPort(_dispPB) + ' to your starting balance. Supporting both takes more portfolio than supporting the Floor alone.'
            : _datDrvPB
              ? 'Add ' + fmtPort(_dispPB) + ' to your starting balance. You moved your Floor to ' + fmtKyr(r.floorTarget) + ' and your Datum to ' + fmtKyr(r.datumTarget) + ' — your Datum spending is the line driving this number.'
              : 'Add ' + fmtPort(_dispPB) + ' to your starting balance. Your Floor move is what is setting this number — your Datum move is included but sits comfortably within reach. Without the Floor move, less would be needed.';
          if (_datBlwB) _p1B += ' Your Datum sits at or below your Floor — the plan supports your spending target without extra portfolio.';
          if (_dispPB > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-floor', 'var(--danger-red)', 'PATH 1 &mdash; PORTFOLIO',
              'Reaching these targets via portfolio alone requires more than twice your current balance. A split across levers is more practical.');
          } else {
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 1 &mdash; PORTFOLIO', _p1B, 'capital', (_sNorm.portfolioVol + _dispPB), r.datumTarget);
          }
          // PATH 2 — CONTRIBUTIONS
          var _epsKB = DRIVER_TIE_EPSILON * Math.max(_reqDatKB, _bndKB, 0.001);
          var _datDrvKB = _reqDatKB - _bndKB > _epsKB;
          var _p2B = _datDrvKB
            ? 'Add ' + fmtContrib(_dispKB) + ' to your annual contributions. This lifts both your Floor and your Datum support — the contribution increase has to carry both lines at once. Your Datum spending is driving the total.'
            : 'Add ' + fmtContrib(_dispKB) + ' to your annual contributions. This holds your Floor — your Datum target is included and supported within the same amount.';
          if (Math.abs(_dispKB) > 50000) {
            html += warn('req-item-floor', 'var(--danger-red)', 'PATH 2 &mdash; CONTRIBUTIONS',
              'Reaching these targets via contributions alone would require ' + fmtContrib(_dispKB) + ' — beyond a practical single-lever move.');
          } else {
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 2 &mdash; CONTRIBUTIONS', _p2B, 'contrib', (_sNorm.annualContrib + _dispKB), r.datumTarget);
          }
          // PATH 3 — RETIRE AGE
          var _datDrvRB = _raDB > _raBndB;
          var _p3B = _datDrvRB
            ? 'Delay retirement by ' + fmtYrs(_dYB) + '. Time amplifies every input — each additional year of compound growth raises both your Floor and your Datum support. Your Datum spending is what is setting the delay needed.'
            : 'Delay retirement by ' + fmtYrs(_dYB) + '. Time grows both your Floor and your Datum support — each additional year past ' + _sNorm.activationAge + ' locks in more capacity. Your Datum move is included.';
          html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 3 &mdash; RETIRE AGE', _p3B, 'retire', _raDispB, r.datumTarget);
          (function() {
            var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.floorSpend <= 0 || pts.datumSpend <= 0) return;
            var _h4ScReqFlr = r.floorTarget * _h4ScCurr / pts.floorSpend;
            var _h4ScReqDat = r.datumTarget * _h4ScCurr / pts.datumSpend;
            var _h4ScReq = Math.max(_h4ScReqFlr, _h4ScReqDat);
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4PlanNew = _h4C;
            var _h4Body = 'Plan through ' + _h4PlanNew + ' instead of ' + _h4PlanOld + '. A shorter retirement raises the Floor toward ' + fmtKyr(r.floorTarget) + ' on the same balance — the one move that adds resilience without adding a dollar. Honest only if the horizon truly is shorter.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          req.innerHTML = html; return;
        }
        var _df_pct = pts.floorSpend > 0 ? Math.round(Math.abs(df / pts.floorSpend) * 100) : 0;
        var _df_dir = df >= 0 ? 'up' : 'down';
        html += headCard(
          'You pulled the Floor up. These paths show what it would take, in capital, savings, or timing, to keep that higher boundary in place.',
          'A floor of ' + fmtKyr(r.floorTarget) + ' — ' + _df_pct + '% ' + _df_dir + ' from your current floor — requires one of these lever moves.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
        // Mandatory coupling disclosure (CLAUDE §10) — suppressed when SP has also moved (self-contradictory with live paths)
        var _ceilFloorRatioPort = r.a2 > 0 ? (r.a1 / r.a2).toFixed(2) : '—';
        if (!_spOffOrigin) {
          html += '<div class="req-item" style="border-left-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);margin-bottom:6px;">'
            + '<div class="req-item-body" style="color:rgba(255,255,255,0.55);font-size:11px;">In this Sketch there is no floor-only move. Every dollar you use to lift the Floor also lifts the Ceiling, and at this horizon the Ceiling still moves more than the Floor.</div></div>';
        }
        r.paths.forEach(function(pth) {
          if (pth.lever === 'portfolio') {
            if (pth.hardStop === 'negative_portfolio' || pth.dP_M === null) return;
            if (pth.softWarn === 'too_large') {
              html += warn('req-item-floor', 'var(--danger-red)', 'PORTFOLIO',
                'Securing that floor via portfolio alone requires adding ' + fmtPort(pth.dP_M) + ' — more than twice your current balance.');
            } else {
              var _b1Body = 'Add ' + fmtPort(pth.dP_M) + ' to your starting balance. Every extra $1,000 in your portfolio raises the Floor by about ' + fmtPortPer1k(r.a2) + ' and the Ceiling by about ' + fmtPortPer1k(r.a1) + ' — one move lifts both edges of your range.';
              html += item('req-item-floor', 'var(--danger-red)', 'PATH 1 — PORTFOLIO', _b1Body, 'capital', (_sNorm.portfolioVol + pth.dP_M));
            }
          }
          if (pth.lever === 'contributions') {
            if (pth.dK_dollars === null) return;
            var _ceilFloorRatioContrib = r.b2 > 0 && r.b1 > 0 ? (r.b1 / r.b2).toFixed(1) : '—';
            if (pth.softWarn === 'too_high') {
              html += warn('req-item-floor', 'var(--danger-red)', 'CONTRIBUTIONS',
                'Using contributions alone to hold this Floor would require ' + fmtContrib(pth.dK_dollars) + ' — more than that lever can reasonably carry on its own. A split across portfolio and contributions shares the load.');
            } else {
              html += item('req-item-floor', 'var(--danger-red)', 'PATH 2 — CONTRIBUTIONS',
                'Add ' + fmtContrib(pth.dK_dollars) + ' to contributions. Contributions are less efficient at moving the floor than the ceiling — the ceiling-to-floor ratio at your horizon is approximately ' + _ceilFloorRatioContrib + ':1.',
                'contrib', (_sNorm.annualContrib + pth.dK_dollars));
            }
          }
          if (pth.lever === 'retireAge') {
            var _b3Body = 'Delay retirement by ' + fmtYrs(pth.dY) + ' to grow both boundaries. The floor lifts less than the ceiling with additional time — but consistently.';
            if (pth.softWarn === 'extreme') {
              _b3Body = 'Relying only on retirement timing to hold this Floor would mean delaying about ' + fmtYrs(pth.dY) + ' more — a heavy ask. A mixed path can often reach similar floors with less delay.';
            }
            html += item('req-item-floor', 'var(--danger-red)', 'PATH 3 — RETIRE AGE', _b3Body, 'retire', pth.reqRetireAge);
          }
        });
        // Qualitative SS/annuity path — Captain Decision 2: Option 1, no fabricated numbers
        html += '<div class="req-item req-item-floor" style="opacity:0.75;">'
          + '<div class="req-item-label" style="color:var(--danger-red);">GUARANTEED INCOME PATH</div>'
          + '<div class="req-item-body" style="font-size:11px;">Income sources like Social Security and annuities can raise your Floor without needing extra portfolio growth. Studio can model how large those streams would need to be for your plan.</div></div>';
        // PATH 4 — PLANNING HORIZON (Block B: floor drag)
        (function() {
          var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          var _h4ScReq  = r.floorTarget * _h4ScCurr / pts.floorSpend;
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4    = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C   = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4Dir = _h4Delta < 0 ? 'shorter' : 'longer';
          var _h4Abs = Math.abs(_h4Delta);
          var _h4DFmt = (_h4Abs === 1 ? '1 year' : _h4Abs + ' years') + ' ' + _h4Dir;
          var _h4Body = 'Plan through age ' + _h4C + ' — ' + _h4DFmt + ' than your current assumption. A ' + _h4Dir + ' retirement length ' + (_h4Delta < 0 ? 'raises' : 'lowers') + ' the Floor on the same pile by adjusting how long the withdrawals need to last. This is an assumption lever; it holds only if planning through ' + _h4C + ' is genuine.';
          if (_h4Abs > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that floor through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += item('req-item-floor', 'var(--danger-red)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C);
        })();
        var _allSuppB = r.paths.slice(0, 2).every(function(p) { return p.softWarn !== null; });
        if (_allSuppB && r.combo) {
          html += item('req-item-floor', 'var(--danger-red)', 'COMBINATION PATH',
            'Reaching this floor with a single lever would require an outsized move. A more practical combination: add ' + fmtPort(r.combo.dP_M) + ' to your balance and ' + fmtContrib(r.combo.dK_dollars) + ' to contributions.',
            'capital', (_sNorm.portfolioVol + r.combo.dP_M));
        }
        // Workstream Y — Block B × Datum context (Shape+Datum Combos)
        var _wyDatObj_B  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _wyDatZone_B = _wyDatObj_B ? _wyDatObj_B.key : 'expansive';
        var _fmtSgn_B    = function(v) { return (v >= 0 ? '+' : '-') + '$' + Math.round(Math.abs(v)) + 'k/yr'; };
        var _nFf_B = fmtKyr(r.floorTarget);
        var _pDf_B = fmtKyr(r.datumTarget);
        var _pDfPhrase_B = (Math.abs(dd) > 0.5) ? '' : _pDf_B + ' ';
        var _cGf_B = fmtKyr(Math.abs(r.ceilTarget - r.datumTarget));
        var _fGf_B = fmtKyr(Math.abs(r.datumTarget - r.floorTarget));
        var _fDf_B = _fmtSgn_B(df);
        var _datumAck_B = (Math.abs(dd) > 0.5) ? 'You also ' + (dd > 0 ? 'raised' : 'lowered') + ' the Datum ' + fmtKyr(Math.abs(dd)) + ' — it now sits at ' + fmtKyr(r.datumTarget) + '. ' : '';
        var _oeGlyph_B = (_wyDatObj_B && _wyDatObj_B.key === 'overextended') ? '⚠️ ' : '';
        var _wyCtx_B = '';
        if (_wyDatZone_B === 'overextended') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', but the structural issue is still there: your spending at ' + _pDf_B + ' sits above the Ceiling. Adjusting the Floor doesn\'t change the Datum\'s relationship to the Ceiling — the plan still can\'t reach this spending level. Studio can show the most efficient path to bring ' + _pDf_B + ' back into a supported range. A shorter retirement length is the one move that lifts the Ceiling toward ' + _pDf_B + ' without new capital — honest only if the horizon truly is shorter.';
        } else if (_wyDatZone_B === 'stretched') {
          _wyCtx_B = 'The Floor moved ' + _fDf_B + ', but the Datum ' + _pDfPhrase_B + 'is still ' + _cGf_B + ' from the Ceiling. The Floor change adjusts the plan\'s lower resilience — it doesn\'t change how tight the margin is above the Datum. Studio can show how the current upper-boundary buffer holds under sequence-of-returns pressure.';
        } else if (_wyDatZone_B === 'expansive') {
          _wyCtx_B = 'With the Floor at ' + _nFf_B + ', the Datum ' + _pDfPhrase_B + 'sits ' + _fGf_B + ' above the lower boundary and ' + _cGf_B + ' below the Ceiling. The Datum is comfortably positioned — the Floor move adjusted the plan\'s resilience baseline without squeezing the Datum\'s range. Studio can confirm how this position holds under stress and whether there\'s more capacity available above.';
        } else if (_wyDatZone_B === 'grounded') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', and the Datum ' + _pDfPhrase_B + 'is now only ' + _fGf_B + ' above it. The Floor came up toward the Datum — the margin between your spending and the plan\'s lower boundary has thinned. Studio can show what happens to that margin under below-average return scenarios.';
        } else if (_wyDatZone_B === 'abundant') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', and the Datum ' + _pDfPhrase_B + 'is now below it — the plan\'s minimum capacity now exceeds what you\'re asking for. This is a surplus condition: the plan was built to carry more than the Datum represents. Studio can show what that margin could fund — earlier retirement, a larger legacy, or stronger stress resilience.';
        }
        if (_wyCtx_B) {
          html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_B ? _wyDatObj_B.name : 'EXPANSIVE'), _oeGlyph_B + _datumAck_B + _wyCtx_B, null, null);
        }
        req.innerHTML = html;
        return;
      }

      // Fallback
      req.innerHTML = '<div class="req-placeholder">Drag the Ceiling, Floor, or Datum handles to design your shape — and see exactly what each move means.</div>';
    }
// === END VERBATIM populateZoneC BASELINE ===
    populateZoneC(pts, overrides);
    return { headLabel: _cap.head, html: _cap.req, acceptFromState: _d2AcceptFromState };
  };
};
