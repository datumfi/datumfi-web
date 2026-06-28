/* DatumFI · withdrawal-waterfall MATH ENGINE (B1). PURE + read-only: given the investable accounts and
   the annual withdrawal NEED, returns the per-hop draw (EXACT amounts) + an ISOLATED, named, labeled tax
   ESTIMATE. Tax-efficient order: liquid -> pretax -> roth (preserve Roth for last); within a bucket,
   value DESC + stable id tiebreak (mirrors the Track-A render order). LOCK-3: never writes state, never
   returns a portfolio total — only a derived per-hop breakdown.

   Income-year = the FIRST FULL DECUMULATION YEAR: wages have stopped, so income = NON-WAGE recurring
   (pensions / Social Security / other); need = max(0, annual spend - that income).

   Tax is an ESTIMATE held in its OWN field, SEPARATE from the exact amount, and clearly labeled:
     - Roth        -> tax-free (0)
     - Pre-Tax     -> ordinary income on the full draw
     - Liquid cash -> 0 (no embedded gain)
     - Liquid INVESTMENT (taxable brokerage / crypto) -> cap-gains on the GAIN portion. Cost-basis is not
       captured yet, so the gain is ESTIMATED as a named fraction of the draw; when cost-basis lands
       (host phase-i) swap the fraction for the real embedded gain — additive, no API change.

   _draw(accts, need, rates) is the CASCADE PRIMITIVE: B3 (debt-acceleration) and per-owner debt funding
   call it with a SUBSET of accounts + a target amount to get the same hop-by-hop funding breakdown. */
(function (root) {
  'use strict';

  var STAGE = { liquid: 0, pretax: 1, roth: 2 };
  var DEFAULT_RATES = { ordinary: 0.22, capGains: 0.15, assumedGainFrac: 0.5 };   // NAMED estimate assumptions

  function _byVal(a, b) { return (b.value || 0) - (a.value || 0) || (String(a.id) < String(b.id) ? -1 : 1); }

  // order an account list into the tax-efficient withdrawal sequence (liquid -> pretax -> roth, value DESC).
  function _order(accts) {
    var liq = [], pre = [], roth = [];
    (accts || []).forEach(function (a) {
      if (!a) return;
      if (a.taxCode === 'liquid') liq.push(a);
      else if (a.taxCode === 'pretax') pre.push(a);
      else if (a.taxCode === 'roth') roth.push(a);
    });
    return liq.sort(_byVal).concat(pre.sort(_byVal), roth.sort(_byVal));
  }

  // per-account tax ESTIMATE for a drawn amount (ISOLATED + labeled; NOT a total).
  function _taxEstimate(acct, amount, rates) {
    if (acct.taxCode === 'roth') return { tax: 0, basis: 'tax-free (Roth)' };
    if (acct.taxCode === 'pretax') return { tax: amount * rates.ordinary, basis: 'ordinary income' };
    if (acct.isInvestment) {                                   // taxable brokerage / crypto
      // ADDITIVE (reserve-the-field, Lesson 48): an optional per-account gainFrac — the REAL embedded
      // gain fraction blended from typed cost-basis (host phase-i) — overrides the assumed estimate
      // when present. UNSET -> falls back to rates.assumedGainFrac -> byte-identical to the prior
      // default (no signature/return-contract change; the committed B1 gate stays green).
      var frac = (acct.gainFrac != null ? acct.gainFrac : rates.assumedGainFrac);
      var gain = amount * frac;
      var basis = acct.gainBasis
        ? 'est. cap-gains (' + acct.gainBasis + ')'
        : 'est. cap-gains (assumed ' + Math.round(frac * 100) + '% gain, pending cost-basis)';
      return { tax: gain * rates.capGains, basis: basis };
    }
    return { tax: 0, basis: 'cash (no tax)' };                 // checking / savings
  }

  // CORE primitive (B3 cascade unit): draw `need` from `accts`, hop by hop, in withdrawal order.
  function _draw(accts, need, rates) {
    rates = rates || DEFAULT_RATES;
    var ordered = _order(accts), hops = [], remaining = Math.max(0, need || 0), totalTax = 0;
    for (var i = 0; i < ordered.length && remaining > 0.005; i++) {
      var a = ordered[i], avail = Math.max(0, a.value || 0);
      if (avail <= 0) continue;
      var amount = Math.min(avail, remaining);
      var te = _taxEstimate(a, amount, rates);
      hops.push({ id: a.id, taxCode: a.taxCode, meta: a.meta, amount: amount, taxEstimate: te.tax, taxBasis: te.basis });
      remaining -= amount; totalTax += te.tax;
    }
    return { hops: hops, drawn: (Math.max(0, need || 0) - remaining), shortfall: Math.max(0, remaining), totalTaxEstimate: totalTax };
  }

  // B1 entry — the first-full-decumulation-year waterfall.
  function waterfall(input) {
    input = input || {};
    var rates = input.rates || DEFAULT_RATES;
    var spend = Math.max(0, input.spendAnnual || 0);
    var income = Math.max(0, input.incomeAnnual || 0);          // NON-WAGE income (pensions / SS / other)
    var need = Math.max(0, spend - income);
    var accts = (input.accounts || []).filter(function (a) { return a && (a.taxCode in STAGE); });   // investable only
    var res = _draw(accts, need, rates);
    return {
      year: 'first-full-decumulation',
      spendAnnual: spend, incomeAnnual: income, need: need,
      hops: res.hops, drawn: res.drawn, shortfall: res.shortfall,
      totalTaxEstimate: res.totalTaxEstimate,
      taxNote: 'Tax figures are ESTIMATES (assumed ordinary ' + Math.round(rates.ordinary * 100) + '% / cap-gains ' +
               Math.round(rates.capGains * 100) + '%, gain ' + Math.round(rates.assumedGainFrac * 100) +
               '% pending cost-basis). Amounts are exact.'
    };
  }

  // PORTFOLIO STATS (spine) — pure, value-weighted aggregates over the HOLDINGS of the given accounts.
  // Blends only over holdings that actually carry each field (no fabrication). Holdings value = price*shares.
  // unrealizedGain = Σ(value − costBasis) over holdings with a numeric cost basis. hasData = any holding
  // carries beta OR expectedReturn (gates the Shape wire; absent -> caller falls back to paradigm rates).
  // beta is unitless; expectedReturn / expRatio / dividendYield are PERCENT numbers (e.g. 7 = 7%).
  function _pnum(x) { var n = parseFloat(x); return isFinite(n) ? n : null; }
  function portfolioStats(accounts) {
    var hs = [];
    (accounts || []).forEach(function (a) { if (a && a.holdings) a.holdings.forEach(function (h) { if (h) hs.push(h); }); });
    function hval(h) { return (_pnum(h.price) || 0) * (_pnum(h.shares) || 0); }
    function wavg(field) {
      var wsum = 0, vsum = 0;
      hs.forEach(function (h) { var v = hval(h), x = _pnum(h[field]); if (v > 0 && x !== null) { wsum += v * x; vsum += v; } });
      return vsum > 0 ? wsum / vsum : null;
    }
    var withBasis = hs.filter(function (h) { var cb = _pnum(h.costBasis); return cb !== null && cb > 0; });   // 0/blank = not entered
    var unrealizedGain = withBasis.length
      ? withBasis.reduce(function (s, h) { return s + (hval(h) - (_pnum(h.costBasis) || 0)); }, 0)
      : null;
    var beta = wavg('beta'), expReturn = wavg('expectedReturn');
    return {
      weightedBeta: beta, blendedExpReturn: expReturn,
      blendedExpense: wavg('expRatio'), blendedYield: wavg('dividendYield'),
      unrealizedGain: unrealizedGain, hasData: (beta !== null || expReturn !== null)
    };
  }

  var DatumMath = { waterfall: waterfall, _draw: _draw, _order: _order, DEFAULT_RATES: DEFAULT_RATES, portfolioStats: portfolioStats };
  if (typeof module !== 'undefined' && module.exports) module.exports = DatumMath;
  if (typeof root !== 'undefined' && root) root.DatumMath = DatumMath;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
