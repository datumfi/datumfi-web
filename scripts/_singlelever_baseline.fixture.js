'use strict';
/* _singlelever_baseline.fixture.js — FROZEN verbatim slice of sketch.html single-lever EXTRAS
 * (L5822-5838 + L5843-5867) @ HEAD 3513a7a. Ground truth for the single-lever parity gate. */
(function (root) {
  function buildSingleLeverExtrasORIG(ctx) {
    var _wbCase = ctx.wbCase, gb = ctx.gb, ds = ctx.ds, retire = ctx.retire, age = ctx.age,
        ptsEnd = ctx.ptsEnd, gbPinnedState = ctx.gbPinnedState;
    function fmt(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + Math.round(v) + 'k'; }
    var _leverDelta = '', _d2ChangeHtml = '', _d2DomLever = '';
                var _ld = _wbCase.lever, _sym = _wbCase.direction === 'down' ? '↓' : '↑';
                if      (_ld === 'datum')     { _leverDelta = 'Datum'     + _sym + ' ' + fmt(gb.targetSpend)       + '/yr → ' + fmt(ptsEnd.datumSpend)   + '/yr'; }
                else if (_ld === 'retire')    { _leverDelta = 'Retire'    + _sym + ' ' + gb.activationAge          + ' yrs → ' + retire + ' yrs'; }
                else if (_ld === 'portfolio') { _leverDelta = 'Portfolio' + _sym + ' ' + fmt(gb.portfolioVol*1000) + ' → '     + fmt(ds.port*1000); }
                else if (_ld === 'contrib')   { _leverDelta = 'Contrib'   + _sym + ' $' + Math.round((gb.annualContrib||0)/1000) + 'k/yr → $' + Math.round((ds.contrib||0)/1000) + 'k/yr'; }
                else if (_ld === 'age')       { _leverDelta = 'Age'          + _sym + ' ' + gb.currentAge             + ' yrs → ' + age    + ' yrs'; }
                else if (_ld === 'plan')      { _leverDelta = 'Plan-Through' + _sym + ' ' + (gbPinnedState.planThroughAge || 93) + ' yrs → ' + (ds.planThroughAge || 93) + ' yrs'; }
                // Surface B: _d2DomLever with delta for N=1 single-lever attribution
                var _slNm = { portfolio:'Portfolio Balance', datum:'Datum Spend', retire:'Retirement Age', contrib:'Annual Contributions', age:'Current Age', plan:'Plan-Through' };
                var _slDlt = '', _slDeltaD, _slDeltaS, _slDeltaA;
                if      (_ld === 'portfolio') { _slDeltaD = ds.port - gb.portfolioVol; _slDeltaS = _slDeltaD >= 0 ? '+' : '−'; _slDeltaA = Math.abs(_slDeltaD); _slDlt = _slDeltaS + (_slDeltaA >= 1 ? '$' + _slDeltaA.toFixed(2) + 'M' : '$' + Math.round(_slDeltaA * 1000) + 'k'); }
                else if (_ld === 'contrib')   { _slDeltaD = ds.contrib - gb.annualContrib; _slDeltaS = _slDeltaD >= 0 ? '+' : '−'; _slDeltaA = Math.abs(_slDeltaD); _slDlt = _slDeltaS + (_slDeltaA >= 1000 ? '$' + Math.round(_slDeltaA / 1000) + 'k' : '$' + Math.round(_slDeltaA)); }
                else if (_ld === 'retire')    { _slDeltaD = retire - gb.activationAge; _slDlt = (_slDeltaD >= 0 ? '+' : '−') + Math.abs(_slDeltaD) + ' yr'; }
                else if (_ld === 'datum')     { _slDeltaD = Math.round(ds.datum) - gb.targetSpend; _slDeltaS = _slDeltaD >= 0 ? '+' : '−'; _slDeltaA = Math.abs(_slDeltaD); _slDlt = _slDeltaS + (_slDeltaA >= 1000 ? '$' + (_slDeltaA / 1000).toFixed(2) + 'M' : '$' + Math.round(_slDeltaA) + 'k'); }
                else if (_ld === 'age')       { _slDeltaD = age - gb.currentAge; _slDlt = (_slDeltaD >= 0 ? '+' : '−') + Math.abs(_slDeltaD) + ' yr'; }
                else if (_ld === 'plan')      { _slDeltaD = (ds.planThroughAge || 93) - (gbPinnedState.planThroughAge || 93); _slDlt = (_slDeltaD >= 0 ? '+' : '−') + Math.abs(_slDeltaD) + ' yr'; }
                _d2DomLever = (_slNm[_ld] || _ld) + (_slDlt ? ' (' + _slDlt + ', 100% of range)' : '');
                (function() {
                    var _slCI = [];
                    var _slSn = { plan:'Plan-Through', contrib:'Contributions', retire:'Retirement', age:'Age', capital:'Capital', datum:'Datum', market:'Market' };
                    var _slFmt = function(it) {
                        var _nl = '<span style="color:rgba(255,255,255,0.5)">' + (_slSn[it.k]||it.k) + '</span>';
                        var _vl = '<span class="pin-change-values">' + it.from + ' → ' + it.to + '</span>';
                        var _ar = it.up ? '<span class="pin-change-arrow-up">↑</span>' : '<span class="pin-change-arrow-down">↓</span>';
                        return '<span class="pin-change-item">' + _nl + _ar + _vl + '</span>';
                    };
                    // Dominant lever first
                    var _slFCon = function(v) { return (v >= 1000 ? '$' + Math.round(v/1000) + 'k' : '$' + Math.round(v)); };
                    if (_ld === 'contrib') { var _cD = (ds.contrib||0)-(gb.annualContrib||0); _slCI.push({ k:'contrib', up:_cD>0, from:_slFCon(gb.annualContrib||0)+'/yr', to:_slFCon(ds.contrib||0)+'/yr' }); }
                    else if (_ld === 'retire') { _slCI.push({ k:'retire', up:retire>(gb.activationAge||65), from:String(gb.activationAge||65), to:String(retire) }); }
                    else if (_ld === 'portfolio') { var _pFmt = function(v) { return v>=1?'$'+v.toFixed(2)+'M':'$'+Math.round(v*1000)+'k'; }; var _pD=(ds.port||0)-(gb.portfolioVol||0); _slCI.push({ k:'capital', up:_pD>0, from:_pFmt(gb.portfolioVol||0), to:_pFmt(ds.port||0) }); }
                    else if (_ld === 'age') { var _aD=age-(gb.currentAge||40); _slCI.push({ k:'age', up:_aD>0, from:String(gb.currentAge||40), to:String(age) }); }
                    else if (_ld === 'plan') { var _pnD=(ds.planThroughAge||93)-(gbPinnedState.planThroughAge||93); _slCI.push({ k:'plan', up:_pnD<0, from:String(gbPinnedState.planThroughAge||93)+' yrs', to:String(ds.planThroughAge||93)+' yrs' }); }
                    // Additional moved levers
                    var _xPD = (ds.planThroughAge||93)-(gbPinnedState.planThroughAge||93);
                    if (Math.abs(_xPD) >= 1 && _ld !== 'plan')    _slCI.push({ k:'plan',    up:_xPD<0,   from:String(gbPinnedState.planThroughAge||93)+' yrs', to:String(ds.planThroughAge||93)+' yrs' });
                    var _xCD = (ds.contrib||0)-(gb.annualContrib||0);
                    if (Math.abs(_xCD) > 100 && _ld !== 'contrib') _slCI.push({ k:'contrib', up:_xCD>0,   from:_slFCon(gb.annualContrib||0)+'/yr', to:_slFCon(ds.contrib||0)+'/yr' });
                    var _xRD = retire - (gb.activationAge||65);
                    if (Math.abs(_xRD) > 0 && _ld !== 'retire')    _slCI.push({ k:'retire',  up:_xRD>0,   from:String(gb.activationAge||65), to:String(retire) });
                    if (_slCI.length >= 2) _d2ChangeHtml = _slCI.map(_slFmt).join('');
                })();
    return { leverDelta: _leverDelta, changeHtml: _d2ChangeHtml, domLever: _d2DomLever };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildSingleLeverExtrasORIG: buildSingleLeverExtrasORIG };
  if (typeof root !== 'undefined') root.buildSingleLeverExtrasORIG = buildSingleLeverExtrasORIG;
}(typeof window !== 'undefined' ? window : this));
