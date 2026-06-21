'use strict';
/* _multilever_baseline.fixture.js — FROZEN verbatim slice of sketch.html's S2 multi-lever
 * builder (L5878-6211) + ML_01..ML_08 (L3278-3285), captured pre-extraction @ HEAD fa13064.
 * Ground truth for _multilever_parity.js. DO NOT EDIT — regenerate from a known-good sketch.html. */
(function (root) {
  function buildMultiLeverORIG(ctx) {
    var retire = ctx.retire, age = ctx.age, yrs = ctx.yrs, paradigm = ctx.paradigm,
        gb = ctx.gb, ds = ctx.ds, s = ctx.s, gbEnd = ctx.gbEnd, ptsEnd = ctx.ptsEnd,
        gbPinnedState = ctx.gbPinnedState;
    const ML_01 = 'Two inputs moved in the same direction — [Lever A] and [Lever B] both grew the Shape, amplifying the shift.';
    const ML_02 = 'Two inputs moved in the same direction — [Lever A] and [Lever B] both compressed the Shape, amplifying the downward shift.';
    const ML_03 = 'Two levers moved in opposing directions — [Lever A] worked to improve the position while [Lever B] worked against it. The net result was a positive shift.';
    const ML_04 = 'Two levers moved in opposing directions — [Lever A] and [Lever B] partially canceled each other. The net result was a negative shift despite one positive input.';
    const ML_05 = 'Two levers moved in opposing directions and roughly offset — [Lever A] and [Lever B] produced a marginal net shift. The position changed little despite both levers moving.';
    const ML_06 = 'The Datum moved [direction] while [Lever B] shifted the Shape in the same structural direction — both effects reinforced each other.';
    const ML_07 = 'The Datum moved [direction] while [Lever B] shifted the Shape boundaries in the opposing direction — the two effects partially canceled.';
    const ML_08 = 'Three inputs moved simultaneously — [Lever A], [Lever B], and [Lever C]. Identify the primary driver (≥50% of impact) and note whether the secondary levers amplified or offset it.';
    var _phys = '', _act = '', _d2ChangeHtml = '', _d2DomLever = '';
                var _d2RetireDelta  = retire - gb.activationAge;
                var _d2RetireAbs    = Math.abs(_d2RetireDelta);
                var _d2RetireBand   = _d2RetireAbs > 15 ? 'generational' : _d2RetireAbs >= 10 ? 'dramatic' : _d2RetireAbs >= 5 ? 'large' : _d2RetireAbs >= 2 ? 'moderate' : 'small';
                var _d2CapDelta     = ds.port - gb.portfolioVol;
                var _d2CapPct       = Math.abs(_d2CapDelta) / Math.max(Math.abs(gb.portfolioVol), 0.01);
                var _d2CapBand      = _d2CapPct > 0.5 ? 'dramatic' : _d2CapPct >= 0.25 ? 'large' : _d2CapPct >= 0.10 ? 'moderate' : 'small';
                var _d2CapPctStr    = Math.round(_d2CapPct * 100) + '%';
                var _d2ContribDelta = ds.contrib - gb.annualContrib;
                var _d2ContribAbs   = Math.abs(_d2ContribDelta);
                var _d2ContribBand  = _d2ContribAbs > 40000 ? 'dramatic' : _d2ContribAbs >= 15000 ? 'large' : _d2ContribAbs >= 5000 ? 'moderate' : 'small';
                var _d2ContribKStr  = '$' + Math.max(1, Math.round(_d2ContribAbs / 1000)) + 'k';
                var _d2DatumDelta   = s.targetSpend - gb.targetSpend;
                var _d2DatumAbs     = Math.abs(_d2DatumDelta);
                var _d2DatumBand    = _d2DatumAbs > 25 ? 'large' : _d2DatumAbs >= 10 ? 'moderate' : 'small';
                var _d2DatumPct     = Math.round(_d2DatumAbs / Math.max(Math.abs(gb.targetSpend), 1) * 100);
                var _d2DCur         = s.targetSpend >= 1000 ? '$' + (s.targetSpend/1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + s.targetSpend + 'k';
                var _d2AgeDelta     = age - gb.currentAge;
                var _d2AgeAbs       = Math.abs(_d2AgeDelta);
                var _d2AgeBand      = _d2AgeAbs > 12 ? 'dramatic' : _d2AgeAbs >= 7 ? 'large' : _d2AgeAbs >= 3 ? 'moderate' : 'small';
                var _d2CurMkt       = paradigm === 'optimistic' ? 'Optimistic' : paradigm === 'stress' ? 'Stress' : 'Historical';
                var _d2RetireChg    = gb.activationAge !== retire;
                var _d2AgeChg       = gb.currentAge !== age;
                var _d2CapChg       = Math.abs(gb.portfolioVol - ds.port) > 0.001;
                var _d2ContribChg   = Math.abs(gb.annualContrib - ds.contrib) > 100;
                var _d2DatumChg     = gb.targetSpend !== s.targetSpend;
                var _d2MktChg       = !!(gbPinnedState.pinnedParadigm && gbPinnedState.pinnedParadigm !== _d2CurMkt);
                var _d2PlanDelta    = (ds.planThroughAge || 93) - (gb.planThroughAge || 93);
                var _d2PlanAbs      = Math.abs(_d2PlanDelta);
                var _d2PlanBand     = _d2PlanAbs > 10 ? 'large' : _d2PlanAbs >= 5 ? 'moderate' : 'small';
                var _d2PlanChg      = _d2PlanAbs >= 1;
                var _d2Pchg = [];
                if (_d2RetireChg) { var _d2RDir = _d2RetireDelta > 0 ? 'later' : 'earlier'; _d2Pchg.push('Retirement moved ' + _d2RDir + ' by ' + _d2RetireAbs + ' yr to ' + retire + '.'); }
                if (_d2AgeChg)     _d2Pchg.push('Current age moved to ' + age + '.');
                if (_d2CapChg)   { var _d2CDir = _d2CapDelta > 0 ? 'up' : 'down'; var _d2CStr = ds.port >= 1 ? '$' + ds.port.toFixed(2) + 'M' : '$' + Math.round(ds.port * 1000) + 'k'; _d2Pchg.push('Capital moved ' + _d2CDir + ' to ' + _d2CStr + ' (' + _d2CapPctStr + ').'); }
                if (_d2DatumChg) { var _d2DDr = _d2DatumDelta > 0 ? 'up' : 'down'; _d2Pchg.push('Datum moved ' + _d2DDr + ' to ' + _d2DCur + '/yr.'); }
                if (_d2ContribChg) { var _d2CnDir = _d2ContribDelta > 0 ? 'up' : 'down'; var _d2CnStr = ds.contrib >= 1000 ? '$' + Math.round(ds.contrib/1000) + 'k' : '$' + ds.contrib; _d2Pchg.push('Contributions moved ' + _d2CnDir + ' to ' + _d2CnStr + '/yr.'); }
                if (_d2PlanChg)  { var _d2PDir = _d2PlanDelta < 0 ? 'shorter' : 'longer'; _d2Pchg.push('Retirement length moved ' + _d2PDir + ' to ' + (ds.planThroughAge || 93) + ' yrs.'); }
                if (_d2MktChg)     _d2Pchg.push('Market changed to ' + _d2CurMkt + '.');
                var _d2PFloorPin    = gbEnd.floorSpend || 0;
                var _d2PCeilPin     = gbEnd.ceilSpend  || 0;
                var _d2PDatumPin    = gbEnd.datumSpend || 0;
                var _d2PRangePin    = Math.max(_d2PCeilPin - _d2PFloorPin, 1);
                var _d2PRangeCur    = ptsEnd.ceilSpend - ptsEnd.floorSpend;
                var _d2PWidthDelta  = _d2PRangeCur - _d2PRangePin;
                var _d2PMidDelta    = (ptsEnd.floorSpend + ptsEnd.ceilSpend) / 2 - (_d2PFloorPin + _d2PCeilPin) / 2;
                var _d2PDatPctPin   = _d2PRangePin > 0 ? (_d2PDatumPin - _d2PFloorPin) / _d2PRangePin : 0.5;
                var _d2PDatPctCur   = _d2PRangeCur > 0 ? (ptsEnd.datumSpend - ptsEnd.floorSpend) / _d2PRangeCur : 0.5;
                var _d2PNearCeil    = _d2PDatPctCur > 0.78;
                var _d2PNearFloor   = _d2PDatPctCur < 0.22;
                var _d2PWidthSig    = Math.abs(_d2PWidthDelta) > Math.max(10, _d2PRangePin * 0.10);
                var _d2PMidSig      = Math.abs(_d2PMidDelta)   > Math.max(8,  _d2PRangePin * 0.08);
                var _d2PWidened     = _d2PWidthSig && _d2PWidthDelta > 0;
                var _d2PCompressed  = _d2PWidthSig && _d2PWidthDelta < 0;
                var _d2PShiftUp     = !_d2PWidthSig && _d2PMidSig && _d2PMidDelta > 0;
                var _d2PShiftDn     = !_d2PWidthSig && _d2PMidSig && _d2PMidDelta < 0;
                var _d2Lw = [];
                if (_d2RetireChg)  _d2Lw.push({ key: 'retire',  w: _d2RetireAbs * 10 });
                if (_d2CapChg)     _d2Lw.push({ key: 'capital', w: _d2CapPct * 100 });
                if (_d2ContribChg) _d2Lw.push({ key: 'contrib', w: _d2ContribAbs / 600 });
                if (_d2DatumChg)   _d2Lw.push({ key: 'datum',   w: _d2DatumAbs / 3 });
                if (_d2MktChg)     _d2Lw.push({ key: 'market',  w: 55 });
                if (_d2AgeChg)     _d2Lw.push({ key: 'age',     w: _d2AgeAbs * 4 });
                if (_d2PlanChg)    _d2Lw.push({ key: 'plan',    w: _d2PlanAbs * 5 });
                _d2Lw.sort(function(a, b) { return b.w - a.w; });
                var _d2Dom  = _d2Lw[0];
                var _d2Sec  = _d2Lw[1];
                var _d2Twt  = _d2Lw.reduce(function(acc, l) { return acc + l.w; }, 0);
                var _d2SecDriving = !!(_d2Sec && _d2Twt > 0 && _d2Sec.w / _d2Twt > 0.30);
                var _d2Mag = { small: 'slightly', moderate: 'moderately', large: 'meaningfully', dramatic: 'dramatically', generational: 'generationally' };
                var _d2Dp = (function() {
                    if (!_d2Dom) return '';
                    switch (_d2Dom.key) {
                        case 'retire':  return _d2RetireDelta > 0 ? 'A ' + _d2RetireAbs + '-year delay ' + _d2Mag[_d2RetireBand] : 'Retiring ' + _d2RetireAbs + ' years earlier ' + _d2Mag[_d2RetireBand];
                        case 'capital': return 'A ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease') + ' ' + _d2Mag[_d2CapBand];
                        case 'contrib': return 'A ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'increase' : 'reduction') + ' ' + _d2Mag[_d2ContribBand];
                        case 'datum':   return 'A ' + _d2DatumPct + '% Datum ' + (_d2DatumDelta > 0 ? 'increase' : 'decrease') + ' ' + _d2Mag[_d2DatumBand];
                        case 'market':  return paradigm === 'optimistic' ? 'Optimistic market assumptions' : paradigm === 'stress' ? 'Stress market assumptions' : 'Changed market assumptions';
                        case 'age':     return _d2AgeDelta > 0 ? 'Starting ' + _d2AgeAbs + ' years later ' + _d2Mag[_d2AgeBand] : 'Starting ' + _d2AgeAbs + ' years earlier ' + _d2Mag[_d2AgeBand];
                        case 'plan':    return _d2PlanDelta < 0 ? 'A shorter retirement length ' + _d2Mag[_d2PlanBand] : 'A longer retirement length ' + _d2Mag[_d2PlanBand];
                        default: return '';
                    }
                })();
                var _d2DomNoun = (function() {
                    if (!_d2Dom) return 'the change';
                    switch (_d2Dom.key) {
                        case 'retire':  return 'the ' + _d2RetireAbs + '-year ' + (_d2RetireDelta > 0 ? 'delay' : 'earlier retirement');
                        case 'capital': return 'the ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease');
                        case 'contrib': return 'the ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'lift' : 'reduction');
                        case 'datum':   return 'the Datum shift';
                        case 'market':  return 'the market assumption change';
                        case 'age':     return 'the ' + _d2AgeAbs + '-year timeline change';
                        default: return 'the change';
                    }
                })();
                var _d2RetireWhy = _d2RetireDelta > 0
                    ? (_d2RetireBand === 'small' ? 'one extra year of compounding' : _d2RetireBand === 'generational' ? 'that span of compounding fundamentally reshapes both Floor and Ceiling' : _d2RetireBand === 'dramatic' ? 'a full decade more of compounding lifted both Floor and Ceiling materially' : _d2RetireAbs + ' more years of compounding raised both boundaries')
                    : (_d2RetireBand === 'small' ? 'one fewer year of compounding reduced the range' : 'fewer years for capital to compound reduced both boundaries');
                var _d2SecClause = (function() {
                    if (!_d2SecDriving || !_d2Sec) return '';
                    switch (_d2Sec.key) {
                        case 'retire':  return 'the ' + _d2RetireAbs + '-year ' + (_d2RetireDelta > 0 ? 'delay' : 'pullback') + ' reinforced it';
                        case 'capital': return 'the ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease') + ' reinforced it';
                        case 'contrib': return 'the ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'lift' : 'reduction') + ' reinforced it';
                        case 'datum':   return 'the Datum shift contributed';
                        case 'market':  return 'the market assumption change reinforced it';
                        default: return '';
                    }
                })();
                var _d2Bridge = (function() {
                    if (!_d2Dom) return 'Studio can model this change against your actual accounts and income sequencing.';
                    switch (_d2Dom.key) {
                        case 'retire':  return 'Studio can test whether SS timing, bridge years, and withdrawal order support this ' + _d2RetireAbs + '-year shift.';
                        case 'capital': return 'Studio can test whether account types and tax sequencing support this ' + Math.round(_d2CapPct * 100) + '% capital change.';
                        case 'contrib': return 'Studio can test whether contribution sequencing and account placement support this ' + _d2ContribKStr + '/yr change.';
                        case 'datum':   return 'Studio can test whether tax architecture and income timing support a Datum ' + _d2DatumPct + '% ' + (_d2DatumDelta > 0 ? 'higher' : 'lower') + '.';
                        case 'market':  return paradigm === 'stress' ? "Studio can test this Shape across the full engine's probability-weighted paths instead of the Sketch's broad-stroke model." : paradigm === 'optimistic' ? "Studio can model how often this upside case occurs across thousands of simulated market paths." : "Studio can test this Shape across the full engine instead of the Sketch's broad-stroke paths.";
                        case 'age':     return 'Studio can model this timeline change against your actual account types and spending projections.';
                        default: return 'Studio can model this change against your actual accounts and income sequencing.';
                    }
                })();
                if (_d2Pchg.length === 0) {
                    _phys = 'Inputs match the Discover Shape. Move sliders to compare.';
                    _act  = 'Adjust any input to see how the Shape responds.';
                } else if (_d2PWidened) {
                    var _d2Open = 'Compared with your Discover Shape, the Shape widened.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'retire': _d2Open = _d2Dp + ' widened the Shape — ' + _d2RetireWhy + '.'; break; case 'capital': _d2Open = _d2Dp + ' widened the Shape — higher capital raised both boundaries.'; break; case 'contrib': _d2Open = _d2Dp + ' widened the Shape — more contributions compounded over the growth period.'; break; case 'market': _d2Open = _d2Dp + ' widened the Shape — higher growth estimates raised both boundaries.'; break; case 'age': _d2Open = _d2Dp + ' widened the Shape — more years remaining for capital to compound.'; break; } }
                    var _d2CC = _d2Pchg.length, _d2CW = _d2CC === 2 ? 'two' : String(_d2CC);
                    var _d2St = _d2SecDriving && _d2SecClause ? ' Of the ' + _d2CW + ' changes, ' + _d2DomNoun + ' drove most of the widening; ' + _d2SecClause + '.' : '';
                    var _d2Dn = (_d2PNearCeil && _d2DatumChg) ? ' Your Datum now sits closer to the Ceiling of this wider range.' : '';
                    var _d2Sh = _d2PMidSig ? ' It also shifted ' + (_d2PMidDelta > 0 ? 'higher' : 'lower') + ' overall.' : '';
                    _phys = _d2Open + _d2St + _d2Dn + _d2Sh;
                    _act  = _d2PNearCeil ? 'Studio can test whether taxes, income timing, and account sequencing can support your Datum at this higher end of the range.' : _d2Bridge;
                } else if (_d2PCompressed) {
                    var _d2Open2 = 'Compared with your Discover Shape, the Shape narrowed.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'retire': _d2Open2 = _d2Dp + ' narrowed the Shape — ' + _d2RetireWhy + '.'; break; case 'capital': _d2Open2 = _d2Dp + ' narrowed the Shape — lower capital reduced both boundaries.'; break; case 'market': _d2Open2 = _d2Dp + ' narrowed the Shape — stress assumptions lowered both boundaries.'; break; case 'age': _d2Open2 = _d2Dp + ' narrowed the Shape — ' + (_d2AgeBand === 'dramatic' ? 'that span of lost compounding heavily reduced both boundaries' : 'fewer years remaining for capital to compound') + '.'; break; } }
                    var _d2CC2 = _d2Pchg.length, _d2CW2 = _d2CC2 === 2 ? 'two' : String(_d2CC2);
                    var _d2St2 = _d2SecDriving && _d2SecClause ? ' Of the ' + _d2CW2 + ' changes, ' + _d2DomNoun + ' drove most of the narrowing; ' + _d2SecClause + '.' : '';
                    var _d2Dn2 = _d2PNearCeil ? ' Your Datum now sits near the Ceiling — the Shape has moved toward stretched positioning.' : _d2PNearFloor ? ' Your Datum now sits near the Floor — the Shape has moved toward grounded positioning.' : '';
                    var _d2Sh2 = _d2PMidSig ? ' It also shifted ' + (_d2PMidDelta > 0 ? 'higher' : 'lower') + ' overall.' : '';
                    _phys = _d2Open2 + _d2St2 + _d2Dn2 + _d2Sh2;
                    _act  = _d2PNearCeil ? 'Studio can test whether tax strategies, Social Security timing, or contribution changes can relieve pressure at the upper edge of this narrowed Shape.' : _d2PNearFloor ? 'Studio can inspect lower-bound resilience across bad sequences, early downturns, and spending drift.' : _d2Bridge;
                } else if (_d2PShiftUp) {
                    var _d2Open3 = 'Compared with your Discover Shape, the Shape shifted higher.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'capital': _d2Open3 = _d2Dp + ' shifted the Shape higher — higher capital lifted both boundaries.'; break; case 'contrib': _d2Open3 = _d2Dp + ' shifted the Shape higher — more contributions raised both boundaries.'; break; case 'retire': _d2Open3 = _d2Dp + ' shifted the Shape higher — more compounding time raised both boundaries.'; break; case 'age': _d2Open3 = _d2Dp + ' shifted the Shape higher — more years remaining for capital to compound.'; break; } }
                    var _d2St3 = _d2SecDriving && _d2SecClause ? ' ' + _d2SecClause.charAt(0).toUpperCase() + _d2SecClause.slice(1) + '.' : '';
                    _phys = _d2Open3 + _d2St3;
                    _act  = _d2PNearCeil ? 'Studio can test whether taxes, income timing, and account sequencing can support your Datum at this level.' : _d2Bridge;
                } else if (_d2PShiftDn) {
                    var _d2Open4 = 'Compared with your Discover Shape, the Shape shifted lower.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'capital': _d2Open4 = _d2Dp + ' shifted the Shape lower — lower capital reduced both boundaries.'; break; case 'contrib': _d2Open4 = _d2Dp + ' shifted the Shape lower — fewer contributions reduced both boundaries.'; break; case 'retire': _d2Open4 = _d2Dp + ' shifted the Shape lower — earlier retirement narrowed both boundaries.'; break; case 'age': _d2Open4 = _d2Dp + ' shifted the Shape lower — starting later shortened the compounding window.'; break; } }
                    var _d2St4 = _d2SecDriving && _d2SecClause ? ' ' + _d2SecClause.charAt(0).toUpperCase() + _d2SecClause.slice(1) + '.' : '';
                    _phys = _d2Open4 + _d2St4;
                    _act  = _d2PNearFloor ? 'Studio can inspect lower-bound resilience and test whether contribution or timing changes can restore the Floor.' : _d2Bridge;
                } else if (_d2DatumChg && Math.abs(_d2PDatPctCur - _d2PDatPctPin) > 0.08) {
                    if (ptsEnd.datumSpend > _d2PDatumPin) {
                        _phys = 'Compared with your Discover Shape, your Datum moved ' + _d2Mag[_d2DatumBand] + ' closer to the Ceiling, leaving less room for market disappointment.';
                        _act  = 'Studio can test whether tax architecture and income timing support a Datum ' + _d2DatumPct + '% higher across your actual account types.';
                    } else {
                        _phys = 'Compared with your Discover Shape, your Datum moved ' + _d2Mag[_d2DatumBand] + ' closer to the Floor, adding buffer between your target and the survival boundary.';
                        _act  = 'Studio can test whether the additional margin creates room for an earlier date or additional savings goals.';
                    }
                } else if (_d2MktChg) {
                    if (paradigm === 'stress') {
                        _phys = 'Compared with your Discover Shape, stress assumptions narrowed the Shape and lowered the spending boundaries.';
                        _act  = "Studio can test this Shape across the full engine's probability-weighted paths instead of the Sketch's broad-stroke model.";
                    } else if (paradigm === 'optimistic') {
                        _phys = 'Compared with your Discover Shape, optimistic assumptions widened the Shape and raised the spending boundaries.';
                        _act  = "Studio can model how often this upside case occurs across thousands of simulated market paths.";
                    } else {
                        _phys = 'Compared with your Discover Shape, market conditions changed and shifted the spending boundaries.';
                        _act  = "Studio can test this Shape across the full engine instead of the Sketch's broad-stroke paths.";
                    }
                } else {
                    _phys = 'Compared with your Discover Shape, the spending boundaries changed slightly.';
                    _act  = 'Studio can model this change against your actual accounts and income sequencing.';
                }
                // ── ML prepend (Step 2b) ────────────────────────────────────
                if (_d2Lw.length >= 2 && _d2Pchg.length > 0) {
                    var _d2MlShLevs   = _d2Lw.filter(function(l) { return l.key !== 'datum' && l.key !== 'infl'; });
                    var _d2MlHasDatum = _d2Lw.some(function(l)   { return l.key === 'datum'; });
                    var _d2MlLevNm = function(key) {
                        switch (key) {
                            case 'retire':  return _d2RetireDelta  > 0 ? 'a later retirement date' : 'an earlier retirement date';
                            case 'capital': return _d2CapDelta     > 0 ? 'higher capital'           : 'lower capital';
                            case 'contrib': return _d2ContribDelta > 0 ? 'higher contributions'     : 'lower contributions';
                            case 'datum':   return 'a Datum shift';
                            case 'market':  return paradigm === 'optimistic' ? 'optimistic market assumptions' : 'stress market assumptions';
                            case 'age':     return _d2AgeDelta     > 0 ? 'a later start'            : 'an earlier start';
                            case 'plan':    return _d2PlanDelta    < 0 ? 'a shorter retirement length' : 'a longer retirement length';
                            default:        return key;
                        }
                    };
                    var _d2MlShPos = function(key) {
                        switch (key) {
                            case 'retire':  return _d2RetireDelta  > 0;
                            case 'capital': return _d2CapDelta     > 0;
                            case 'contrib': return _d2ContribDelta > 0;
                            case 'market':  return paradigm === 'optimistic';
                            case 'age':     return _d2AgeDelta     < 0;
                            case 'plan':    return _d2PlanDelta    < 0;
                            default:        return true;
                        }
                    };
                    var _d2MlStKey   = gbPinnedState.stateObj ? (gbPinnedState.stateObj.key || '') + '_' + (gbPinnedState.stateObj.subZone || '') : '';
                    var _d2MlParadox = (_d2MlStKey === 'abundant_JUST_BELOW' || _d2MlStKey === 'abundant_WELL_BELOW' || _d2MlStKey === 'grounded_TIGHT' || _d2MlStKey === 'expansive_FLOOR_SIDE');
                    // ── Phase 2.6 Surface A: 18-template ML Direction Matrix ────────────
                    // Direction-first sorted shape lever labels: builders (↑) then reducers (↓), each by |impact|
                    var _d2UpL = _d2MlShLevs.filter(function(l) { return _d2MlShPos(l.key); });
                    var _d2DnL = _d2MlShLevs.filter(function(l) { return !_d2MlShPos(l.key); });
                    var _d2DirLw = _d2UpL.concat(_d2DnL);
                    var _d2LvLbl = _d2DirLw.map(function(l) { return _d2MlLevNm(l.key); });
                    var _d2PrimLev = _d2MlShLevs.length > 0 ? _d2MlLevNm(_d2MlShLevs[0].key) : '';
                    var _d2NUp = _d2UpL.length, _d2Nn = _d2MlShLevs.length;
                    var _d2FmtKs = function(v) { return '$' + Math.round(Math.abs(v)) + 'k/yr'; };
                    var _d2CeilGapFmt  = _d2FmtKs(ptsEnd.ceilSpend - ptsEnd.datumSpend);
                    var _d2FlrDeltaFmt = _d2FmtKs(ptsEnd.floorSpend - (gbEnd ? gbEnd.floorSpend : 0));
                    var _d2NewDatFmt   = _d2FmtKs(s.targetSpend);
                    var _d2FillT = function(t) {
                        return t.replace(/{lever1}/g,_d2LvLbl[0]||'').replace(/{lever2}/g,_d2LvLbl[1]||'')
                                .replace(/{lever3}/g,_d2LvLbl[2]||'').replace(/{lever4}/g,_d2LvLbl[3]||'')
                                .replace(/{lever5}/g,_d2LvLbl[4]||'').replace(/{lever6}/g,_d2LvLbl[5]||'')
                                .replace(/{primaryLever}/g,_d2PrimLev)
                                .replace(/{ceilGap_fmt}/g,_d2CeilGapFmt).replace(/{floorDelta_fmt}/g,_d2FlrDeltaFmt)
                                .replace(/{newDatum_fmt}/g,_d2NewDatFmt);
                    };
                    var _d2DirT = [
                        {n:2,u:2,o:"Two changes moved in the same direction — {lever1} and {lever2}. The Ceiling is now {ceilGap_fmt} above your spending line and the floor has lifted {floorDelta_fmt} from your pin.",s:"Test whether the target should rise to use what both moves made possible — or confirm the wider gap was the intended outcome.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:2,u:0,o:"Two changes pulled back simultaneously — {lever1} and {lever2}. The Ceiling has dropped {ceilGap_fmt} closer to your spending line and the floor has thinned by {floorDelta_fmt} from your pin.",s:"Name whether this is a deliberate reduction in ask, or whether one of these moves was unintentional — because both are now compressing the plan together.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:2,u:1,o:"{lever1} built plan while {lever2} pulled it back. The net effect is modest — the Ceiling moved {ceilGap_fmt} from your pin and the floor shifted {floorDelta_fmt}.",s:"Test whether the building lever alone gets you where you need — or whether the pullback was intentional and the modest net outcome is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:3,o:"Three changes landed in the same direction — {lever1}, {lever2}, and {lever3}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor has moved {floorDelta_fmt} from your pin. {primaryLever} is doing most of the work.",s:"Test whether the target should rise to use what these three moves made possible — or confirm the wider gap was the intended outcome.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:0,o:"Three changes reduced the plan together — {lever1}, {lever2}, and {lever3}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has thinned {floorDelta_fmt} from your pin. {primaryLever} is responsible for most of that compression.",s:"Confirm whether all three pullbacks were deliberate — if one wasn't, it's compressing capacity alongside the ones that were.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:2,o:"{lever1} and {lever2} built plan while {lever3} pulled in the other direction. The net result: the Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin — positive, but partially offset.",s:"Test whether removing the downward move would close the remaining gap cleanly, or whether the offset was an intentional trade.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:1,o:"{lever1} built plan, but {lever2} and {lever3} pulled it back harder. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has thinned {floorDelta_fmt} from your pin.",s:"The two downward moves are outweighing the one building lever. Name whether both reductions were intentional — or bring this to Studio to see what the compression looks like against your real account structure.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:4,o:"Four levers moved in the same direction — {lever1}, {lever2}, {lever3}, and {lever4}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor lifted {floorDelta_fmt} from your pin. {primaryLever} is carrying the most weight, but all four are contributing.",s:"Consider whether the target should rise to meet what four simultaneous moves created — or take the full picture to Studio to test whether it holds under real sequence-of-returns pressure.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while {lever4} pulled back. The Ceiling is now {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. {primaryLever} is the lead driver; {lever4} partially offset it.",s:"Test whether removing the downward move adds meaningfully to the outcome — or confirm the offset was intentional.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:2,o:"Four levers moved in two directions — {lever1} and {lever2} built plan, {lever3} and {lever4} pulled it back. The net effect is muted: the Ceiling shifted {ceilGap_fmt} and the floor moved {floorDelta_fmt} from your pin. The building and reducing forces are closely matched.",s:"Isolate which building lever delivers the most lift per move, and which reducing lever costs the most — then decide which pair to keep.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:1,o:"Three levers pulled the plan back — {lever2}, {lever3}, and {lever4} — while only {lever1} built plan. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"Name whether three simultaneous reductions were all deliberate. If one wasn't, it's compressing the plan alongside the ones that were — and the single building lever isn't enough to offset all three.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:0,o:"All four levers reduced the plan simultaneously — {lever1}, {lever2}, {lever3}, and {lever4}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. {primaryLever} is doing the most compression.",s:"Confirm all four reductions were intentional. If this is a deliberate low-ask scenario, the widening gap between Floor and spending line may be where Studio can surface what the plan is actually able to carry.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:5,o:"All five levers moved in the same direction — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor lifted {floorDelta_fmt} from your pin. At this level of simultaneous movement, {primaryLever} is the lead driver but individual lever effects become harder to attribute cleanly.",s:"This is the boundary of what the Sketch can attribute cleanly. Name the one or two changes you'd actually make, and bring the rest to Studio for a sequence-aware read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:4,o:"Four levers built plan — {lever1}, {lever2}, {lever3}, and {lever4} — while {lever5} pulled against them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The single downward move is a minor offset against strong net-positive movement.",s:"Test whether removing the downward move adds meaningfully — or confirm it was a deliberate trade and the net outcome is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while {lever4} and {lever5} partially offset them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The building levers are winning, but not cleanly.",s:"Isolate whether both reducing moves were intentional. If one wasn't, it's costing capacity against three levers that are working in the right direction.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:2,o:"Two levers built plan — {lever1} and {lever2} — but three pulled harder in the other direction: {lever3}, {lever4}, and {lever5}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"The reducing levers are outweighing the building ones. Name whether all three pullbacks were intentional — or bring this to Studio to see what the compression looks like against your real accounts and income timing.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:1,o:"Four levers pulled the plan back — {lever2}, {lever3}, {lever4}, and {lever5} — while only {lever1} added capacity. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. The single building lever is not enough to offset four simultaneous reductions.",s:"Confirm all four reductions were deliberate. If even one wasn't, it's compressing the plan alongside the others — and the Sketch can't cleanly untangle the combined effect from here.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:0,o:"All five levers reduced the plan at once — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5}. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor compressed {floorDelta_fmt} from your pin. This is the boundary of maximum simultaneous reduction in the Sketch.",s:"If this is deliberate — a low-ask scenario, a conservative anchor — the plan has capacity well above where the Datum sits. Studio can show what the full plan could sustain if the ask were allowed to rise.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:6,o:"All six levers moved in the same direction — {lever1}, {lever2}, {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling is now {ceilGap_fmt} above your spending line and the floor lifted {floorDelta_fmt} from your pin. This is the most movement the Sketch can hold at once — every input is pushing the same way, with {primaryLever} doing the most work.",s:"This is the outer edge of what the Sketch can attribute cleanly. Pick the one or two changes you would truly make, and bring the rest to Studio for a sequence-aware read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:5,o:"Five levers built plan — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5} — while {lever6} pulled the other way. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The lone downward move is a minor offset against five working together.",s:"Test whether removing the single pullback adds anything meaningful — or confirm it was a deliberate trade and the strongly positive net is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:4,o:"Four levers built plan — {lever1}, {lever2}, {lever3}, and {lever4} — while {lever5} and {lever6} partially offset them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The building levers are still winning, but two pullbacks are trimming the gain.",s:"Isolate whether both reducing moves were intentional. If either was not, it is costing capacity against four levers pulling the right way.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while three pulled it back: {lever4}, {lever5}, and {lever6}. The forces are evenly matched, so the net is muted — the Ceiling shifted {ceilGap_fmt} and the floor moved {floorDelta_fmt} from your pin. {primaryLever} carries the most weight on whichever side wins.",s:"Six levers split evenly cancel most of their own effect. Name which one or two you would actually keep — the Sketch cannot untangle a six-way tie cleanly from here, and Studio can read the trade sequence-aware.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:2,o:"Two levers built plan — {lever1} and {lever2} — but four pulled harder in the other direction: {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"The reducing levers are outweighing the building ones. Confirm all four pullbacks were deliberate — or bring this to Studio to see what the compression looks like against your real accounts.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:1,o:"Five levers pulled the plan back — {lever2}, {lever3}, {lever4}, {lever5}, and {lever6} — while only {lever1} added capacity. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. The single building lever cannot offset five moving the other way.",s:"Confirm all five reductions were deliberate. If even one was not, it is compressing the plan alongside the others — and the Sketch cannot cleanly separate the combined effect from here.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:0,o:"All six levers reduced the plan at once — {lever1}, {lever2}, {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor compressed {floorDelta_fmt} from your pin. This is maximum simultaneous reduction — every input pulling down together.",s:"If this is deliberate — a low-ask scenario or a conservative anchor — the plan still has capacity well above where the Datum sits. Studio can show what the full plan could sustain if the ask were allowed to rise.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."}
                    ];
                    var _d2DirMatch = null;
                    if (_d2Nn >= 2 && _d2Nn <= 6) {
                        for (var _d2Ti = 0; _d2Ti < _d2DirT.length; _d2Ti++) {
                            if (_d2DirT[_d2Ti].n === _d2Nn && _d2DirT[_d2Ti].u === _d2NUp) { _d2DirMatch = _d2DirT[_d2Ti]; break; }
                        }
                    }
                    if (_d2DirMatch) {
                        _phys = _d2FillT(_d2DirMatch.o);
                        _phys = _phys.charAt(0).toUpperCase() + _phys.slice(1);
                        _act  = _d2FillT(_d2DirMatch.s) + ' ' + _d2FillT(_d2DirMatch.c);
                    } else {
                        // ── Fallback: Round 6 ML_01-ML_08 prepend system ────────────────
                        var _d2MlA = _d2Dom ? _d2MlLevNm(_d2Dom.key) : 'the first input';
                        var _d2MlB = _d2Sec ? _d2MlLevNm(_d2Sec.key) : 'the second input';
                        var _d2MlPrepend = '';
                        if (_d2Lw.length >= 3) {
                            var _d2MlNW = {1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six'};
                            var _d2MlCount = _d2MlNW[_d2Lw.length] || String(_d2Lw.length);
                            var _d2MlAllNm = _d2Lw.map(function(l) { return _d2MlLevNm(l.key); });
                            var _d2MlList  = _d2MlAllNm.slice(0, -1).join(', ') + ', and ' + _d2MlAllNm[_d2MlAllNm.length - 1];
                            _d2MlPrepend = _d2MlCount + ' inputs moved simultaneously — ' + _d2MlList + '. Identify the primary driver (≥50% of impact) and note whether the secondary levers amplified or offset it. ';
                        } else if (_d2MlHasDatum && _d2MlShLevs.length === 1) {
                            var _d2MlSl      = _d2MlShLevs[0];
                            var _d2MlDatDir  = _d2DatumDelta > 0 ? 'up' : 'down';
                            var _d2MlSlNm    = _d2MlLevNm(_d2MlSl.key);
                            var _d2MlDatImpr = _d2DatumDelta < 0;
                            var _d2MlSlImpr  = _d2MlShPos(_d2MlSl.key);
                            _d2MlPrepend = (_d2MlDatImpr === _d2MlSlImpr ? ML_06 : ML_07).replace('[direction]', _d2MlDatDir).replace('[Lever B]', _d2MlSlNm) + ' ';
                        } else if (_d2MlShLevs.length >= 2) {
                            var _d2MlPosA    = _d2MlShPos(_d2MlShLevs[0].key);
                            var _d2MlPosB    = _d2MlShPos(_d2MlShLevs[1].key);
                            var _d2MlPattern = (_d2MlPosA !== _d2MlPosB) ? 'OFFSET' : (_d2MlParadox && _d2MlPosA) ? 'PARADOX' : 'AMPLIFIED';
                            if (_d2MlPattern !== 'OFFSET') {
                                _d2MlPrepend = (_d2MlPosA ? ML_01 : ML_02).replace('[Lever A]', _d2MlA).replace('[Lever B]', _d2MlB) + ' ';
                            } else {
                                var _d2MlOffTmpl = (_d2PWidened || _d2PShiftUp) ? ML_03 : (_d2PCompressed || _d2PShiftDn) ? ML_04 : ML_05;
                                _d2MlPrepend = _d2MlOffTmpl.replace('[Lever A]', _d2MlA).replace('[Lever B]', _d2MlB) + ' ';
                            }
                        }
                        if (_d2MlPrepend) _phys = _d2MlPrepend + _phys;
                    }
                }
                if (_d2Pchg.length > 0) {
                    var _d2Sn = { capital:'Capital', datum:'Datum', contrib:'Contributions', retire:'Retirement', market:'Market', age:'Age', plan:'Plan-Through' };
                    var _d2FCap = function(v) { return v >= 1 ? '$' + v.toFixed(2) + 'M' : '$' + Math.round(v * 1000) + 'k'; };
                    var _d2FDat = function(v) { return v >= 1000 ? '$' + (v/1000).toFixed(2).replace(/\.00$/,'') + 'M' : '$' + Math.round(v) + 'k'; };
                    var _d2FCon = function(v) { return v >= 1000 ? '$' + Math.round(v/1000) + 'k' : '$' + Math.round(v); };
                    var _d2Ci = [];
                    if (_d2RetireChg)  _d2Ci.push({ k:'retire',  up:_d2RetireDelta>0,  from:String(gb.activationAge), to:String(retire) });
                    if (_d2AgeChg)     _d2Ci.push({ k:'age',     up:_d2AgeDelta>0,     from:String(gb.currentAge),    to:String(age) });
                    if (_d2CapChg)     _d2Ci.push({ k:'capital', up:_d2CapDelta>0,     from:_d2FCap(gb.portfolioVol), to:_d2FCap(ds.port) });
                    if (_d2DatumChg)   _d2Ci.push({ k:'datum',   up:_d2DatumDelta>0,   from:_d2FDat(gb.targetSpend),  to:_d2FDat(s.targetSpend) });
                    if (_d2ContribChg) _d2Ci.push({ k:'contrib', up:_d2ContribDelta>0, from:_d2FCon(gb.annualContrib), to:_d2FCon(ds.contrib) });
                    if (_d2PlanChg)    _d2Ci.push({ k:'plan',    up:_d2PlanDelta<0, from:String(gb.planThroughAge||93)+' yrs', to:String(ds.planThroughAge||93)+' yrs' });
                    if (_d2MktChg)     _d2Ci.push({ k:'market',  up:null, from:gbPinnedState.pinnedParadigm, to:_d2CurMkt });
                    _d2ChangeHtml = _d2Ci.map(function(it) {
                        var _nl = '<span style="color:rgba(255,255,255,0.5)">' + (_d2Sn[it.k] || it.k) + '</span>';
                        var _vl = '<span class="pin-change-values">' + it.from + ' → ' + it.to + '</span>';
                        if (it.up === null) return '<span class="pin-change-item">' + _nl + _vl + '</span>';
                        var _ar = it.up ? '<span class="pin-change-arrow-up">↑</span>' : '<span class="pin-change-arrow-down">↓</span>';
                        return '<span class="pin-change-item">' + _nl + _ar + _vl + '</span>';
                    }).join('');
                }
                // Lever attribution: identical format to Screen 1 ("Datum Spend (+$900k, 50.7% of range)")
                var _d2LNames = { capital:'Portfolio Balance', datum:'Datum Spend', contrib:'Annual Contributions', retire:'Retirement Age', market:'Market Paradigm', age:'Current Age', plan:'Plan-Through' };
                if (_d2Dom) {
                    var _d2DomPct = (_d2Twt > 0 ? (_d2Dom.w / _d2Twt * 100) : 100).toFixed(1);
                    var _d2LDetail = '';
                    switch (_d2Dom.key) {
                        case 'capital': { var _d2Sgn = _d2CapDelta >= 0 ? '+' : '−'; var _d2AbsC = Math.abs(_d2CapDelta); var _d2AbsS = _d2AbsC >= 1 ? '$' + _d2AbsC.toFixed(2) + 'M' : '$' + Math.round(_d2AbsC * 1000) + 'k'; _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'datum':   { var _d2Sgn = _d2DatumDelta >= 0 ? '+' : '−'; var _d2AbsD = Math.abs(_d2DatumDelta); var _d2AbsS = _d2AbsD >= 1000 ? '$' + (_d2AbsD/1000).toFixed(2) + 'M' : '$' + Math.round(_d2AbsD) + 'k'; _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'contrib': { var _d2Sgn = _d2ContribDelta >= 0 ? '+' : '−'; var _d2AbsS = _d2ContribAbs >= 1000 ? '$' + Math.round(_d2ContribAbs/1000) + 'k' : '$' + Math.round(_d2ContribAbs); _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'retire':  { var _d2Sgn = _d2RetireDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2RetireAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'age':     { var _d2Sgn = _d2AgeDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2AgeAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'plan':    { var _d2Sgn = _d2PlanDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2PlanAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'market':  _d2LDetail = '→ ' + _d2CurMkt + ', ' + _d2DomPct + '% of range'; break;
                        default:        _d2LDetail = _d2DomPct + '% of range';
                    }
                    _d2DomLever = (_d2LNames[_d2Dom.key] || _d2Dom.key) + ' (' + _d2LDetail + ')';
                } else {
                    _d2DomLever = _d2Pchg.length > 0 ? 'No dominant lever — multiple small adjustments' : 'No movement yet — adjust a slider to see lever attribution';
                }
    return { phys: _phys, act: _act, changeHtml: _d2ChangeHtml, domLever: _d2DomLever };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildMultiLeverORIG: buildMultiLeverORIG };
  if (typeof root !== 'undefined') root.buildMultiLeverORIG = buildMultiLeverORIG;
}(typeof window !== 'undefined' ? window : this));
