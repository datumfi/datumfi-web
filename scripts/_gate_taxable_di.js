/* Taxable Copy Bank wiring gate ("The Living Room", baseId taxable) — RED-first.
   The Taxable bank is a DIFFERENT machine: pick-ONE spine (10 archetypes) + §3b instrument-mix
   tag riding the spine + prioritized tilt ladder (cap 2) + behavior ladder (fees>beta>yield,
   cap 2) + Layer D tax character + §8 verdict -> §7 standing close. Fixtures = the bank's own
   §9 worked assemblies (EX-1 calm global / EX-2 hot single-name / EX-5 short read) + gain,
   fees, and growth-verdict variants. Also: §10 metric-ladder hovers behind the 4 strip boxes,
   §16 title hover, DI-EMPTY line, R204 bogus-basis sanity guard, and regression (crypto keeps
   the generic strip; IRA/457/403 narratives untouched).
   On pre-build code every taxable-positive block is RED (taxable renders the old generic strip
   and no DI). Usage: serve repo root on :8001, then node scripts/_gate_taxable_di.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const mk = (over) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', expectedReturn: '', dividendYield: '', geography: '',
      instrumentType: '', priceSource: 'manual' }, over);
    const openTax = (holdings, extra) => {
      const acc = window.state.accounts.find(a => a.baseId === 'taxable');
      acc.holdings = holdings;
      Object.assign(acc, extra || {});
      recalcPortfolio(acc);
      acc.showHoldings = true;
      window.openAccountModal(acc.id);
      return { html: document.getElementById('modal-dynamic-content').innerHTML,
               title: document.getElementById('modal-acc-title').innerHTML };
    };
    ['taxable', 'crypto_primary', 'tradira', 'pretax457b'].forEach(id => { try { addInstance(id); } catch (e) {} });

    // EX-1 · calm global index: 80/20, all ETFs, 50% foreign, beta .82, yield 2.6, exp .06
    const E1 = openTax([
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 100, shares: 300, beta: 0.82, expRatio: 0.06, dividendYield: 2.6, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' }),
      mk({ ticker: 'VEA', name: 'Vanguard Developed', price: 100, shares: 250, beta: 0.82, expRatio: 0.06, dividendYield: 2.6, assetClass: 'Stocks', geography: 'International', sector: 'Developled Markets', instrumentType: 'ETF' }),
      mk({ ticker: 'VWO', name: 'Vanguard Emerging', price: 100, shares: 250, beta: 0.82, expRatio: 0.06, dividendYield: 2.6, assetClass: 'Stocks', geography: 'International', sector: 'Emerging Markets', instrumentType: 'ETF' }),
      mk({ ticker: 'BND', name: 'Vanguard Total Bond', price: 100, shares: 200, beta: 0.82, expRatio: 0.06, dividendYield: 2.6, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' })
    ]);

    // EX-2 · hot single-name: 52% single names, Technology 52% of value, beta 1.38
    const E2 = openTax([
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 100, shares: 250, beta: 1.0, expRatio: 0.06, dividendYield: 1.3, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' }),
      mk({ ticker: 'VEA', name: 'Vanguard Developed', price: 100, shares: 150, beta: 1.0, expRatio: 0.06, dividendYield: 2.0, assetClass: 'Stocks', geography: 'International', sector: 'Developled Markets', instrumentType: 'ETF' }),
      mk({ ticker: 'VWO', name: 'Vanguard Emerging', price: 100, shares: 80, beta: 1.0, expRatio: 0.06, dividendYield: 2.2, assetClass: 'Stocks', geography: 'International', sector: 'Emerging Markets', instrumentType: 'ETF' }),
      mk({ ticker: 'TSLA', name: 'Tesla Inc', price: 100, shares: 350, beta: 1.8, dividendYield: 0, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Software & IT Services', instrumentType: 'Stock' }),
      mk({ ticker: 'NVDA', name: 'NVIDIA Corp', price: 100, shares: 170, beta: 1.6, dividendYield: 0.1, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'Stock' })
    ]);

    // EX-5 · the SHORT read: one S&P ETF, nothing extreme, no basis -> D-NO-BASIS + NEUTRAL
    const E5 = openTax([
      mk({ ticker: 'VOO', name: 'Vanguard S&P 500', price: 100, shares: 100, beta: 1.0, expRatio: 0.03, dividendYield: 1.6, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' })
    ]);

    // EX-G · growth verdict: all-equity, low yield, market-hot -> CLOSE-GROWTH
    const EG = openTax([
      mk({ ticker: 'VOO', name: 'Vanguard S&P 500', price: 100, shares: 60, beta: 1.05, expRatio: 0.03, dividendYield: 1.0, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'VTI', name: 'Vanguard Total Market', price: 100, shares: 40, beta: 1.05, expRatio: 0.03, dividendYield: 1.0, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' })
    ]);

    // EX-4' · income + basis: gain +$8,200 (GUARDED: bogus-basis CASH row must not poison it)
    const E4 = openTax([
      mk({ ticker: 'BND',  name: 'Vanguard Total Bond', price: 100, shares: 350, beta: 0.7, expRatio: 0.06, dividendYield: 3.4, costBasis: 32000, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'VYM',  name: 'Vanguard High Div', price: 100, shares: 350, beta: 0.7, expRatio: 0.06, dividendYield: 3.4, costBasis: 32500, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Schwab Dividend', price: 100, shares: 300, beta: 0.7, expRatio: 0.06, dividendYield: 3.4, costBasis: 27300, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ name: 'Cash Sweep', price: 1, shares: 31, costBasis: 2477, instrumentType: 'CASH', assetClass: 'Cash' })
    ]);

    // EX-F · expensive thematic-ish fund -> C-FEES-HIGH + EXP-HIGH ladder w/ 30-yr drag
    const EF = openTax([
      mk({ ticker: 'SPCX', name: 'SPAC ETF', price: 100, shares: 170, beta: 1.6, expRatio: 0.85, dividendYield: 0, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Robotics', instrumentType: 'ETF' }),
      mk({ ticker: 'VOO',  name: 'Vanguard S&P 500', price: 100, shares: 30, beta: 1.0, expRatio: 0.03, dividendYield: 1.3, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' })
    ]);

    // EMPTY · authored DI-EMPTY line
    const EE = openTax([]);

    // Regression: crypto (liquid+investment, NOT a bank room) keeps the generic strip
    const cr = window.state.accounts.find(a => a.baseId === 'crypto_primary');
    cr.holdings = [ mk({ ticker: 'IBIT', name: 'iShares Bitcoin', price: 100, shares: 10, costBasis: '500', assetClass: 'Crypto' }) ];
    recalcPortfolio(cr); cr.showHoldings = true; window.openAccountModal(cr.id);
    const CR = document.getElementById('modal-dynamic-content').innerHTML;
    // Regression: IRA + 457 narratives untouched
    const ir = window.state.accounts.find(a => a.baseId === 'tradira');
    ir.holdings = [ mk({ ticker: 'VOO', name: 'V', price: 100, shares: 100, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }) ];
    recalcPortfolio(ir); ir.showHoldings = true; window.openAccountModal(ir.id);
    const IR = document.getElementById('modal-dynamic-content').innerHTML;
    const s7 = window.state.accounts.find(a => a.baseId === 'pretax457b');
    s7.holdings = [ mk({ ticker: 'NWLGX', name: 'NW', price: 100, shares: 100, expRatio: 0.45, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }) ];
    recalcPortfolio(s7); s7.showHoldings = true; window.openAccountModal(s7.id);
    const S7 = document.getElementById('modal-dynamic-content').innerHTML;

    return { E1, E2, E5, EG, E4, EF, EE, CR, IR, S7 };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(60)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const narr = (html) => { const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : ''; };
  const n1 = narr(R.E1.html), n2 = narr(R.E2.html), n5 = narr(R.E5.html), nG = narr(R.EG.html),
        n4 = narr(R.E4.html), nF = narr(R.EF.html), nE = narr(R.EE.html);

  console.log('===== TAXABLE DI GATE [' + LABEL + '] =====');
  let all = true;
  // EX-1 — calm global: spine + tag + geo tilt + calm beta + STEADY close; D prompt SILENT
  all = ok('EX1 spine: leans toward growth, 80%/20% cushion',    has(n1, 'leans toward growth but keeps a cushion') && has(n1, '80%') && has(n1, '20%')) && all;
  all = ok('EX1 tag: Under the hood, built entirely from ETFs',  has(n1, 'Under the hood, it’s built entirely from ETFs.')) && all;
  all = ok('EX1 tag: NO redundant 100% breakdown',               !has(n1, '100% ETFs')) && all;
  all = ok('EX1 tilt: globally diversified, 50% outside US',     has(n1, 'globally diversified') && has(n1, '50%')) && all;
  all = ok('EX1 behavior: moves less than the market (0.82)',    has(n1, 'It moves less than the market (0.82)')) && all;
  all = ok('EX1 D-prompt SILENT (layers present)',               !has(n1, 'what you paid')) && all;
  all = ok('EX1 close: calm, dependable contributor (STEADY)',   has(n1, 'calm, dependable contributor when it sequences your spending')) && all;
  // EX-2 — hot single-name: spine + Specifically tag + sector bet + swingy + STRAINED close
  // EX2 copy evolved to §3a ARCHETYPE-driven (2026-07-08): "concentrated technology bet" replaces the
  // generic spine; connector is "Under the hood," not "Specifically,"; the sector tilt is folded into
  // the archetype line. Re-pointed to the live archetype copy.
  all = ok('EX2 spine: §3a archetype "concentrated technology bet"', has(n2, 'concentrated technology bet')) && all;
  all = ok('EX2 tag: "Under the hood" connector + breakdown',    has(n2, 'a mix of funds and individual stocks — 48% ETFs, 52% individual stocks')) && all;
  all = ok('EX2 tilt: archetype folds the 52% theme',            has(n2, '52% of it rides on that one theme')) && all;
  // ⚠️ ARCHITECT-OWNED (Captain 2026-07-08): the geography clause contradicts the concentrated-bet
  // archetype ("leans heavily US" + "globally diversified"). Captain is re-authoring; left flagged RED
  // on purpose — do NOT wire around it.
  all = ok('EX2 tilt cap: geography clause NOT doubled [ARCHITECT-PENDING]', !has(n2, 'globally diversified')) && all;
  all = ok('EX2 behavior: swings harder (1.38)',                 has(n2, 'swings harder than the market (1.38)')) && all;
  all = ok('EX2 close: higher-variance watch-it (STRAINED)',     has(n2, 'higher-variance, watch-it spot')) && all;
  // EX-5 — the short read: spine + tag + silence + D-NO-BASIS + NEUTRAL close
  all = ok('EX5 spine: diversified equity engine, one holding',  has(n5, 'diversified equity engine') && has(n5, 'spread across one holding')) && all;
  all = ok('EX5 tag: Specifically (spine gestured wrappers)',    has(n5, 'Specifically, it’s built entirely from ETFs.')) && all;
  all = ok('EX5 silence: no tilt, no behavior line',             !has(n5, 'It moves') && !has(n5, 'It swings') && !has(n5, 'tilts')) && all;
  all = ok('EX5 D-NO-BASIS fires on the short read',             has(n5, 'One thing Datum can’t see yet: what you paid')) && all;
  all = ok('EX5 close: steady middle contributor (NEUTRAL)',     has(n5, 'steady middle contributor — no special handling, no surprises')) && all;
  // EX-G — growth verdict
  all = ok('EXG close: long-horizon growth sleeve (GROWTH)',     has(nG, 'long-horizon growth sleeve')) && all;
  // EX-4' — income + gain + GUARDED basis
  all = ok('EX4 behavior: income-rich, taxed every year',        has(n4, 'income-rich') && has(n4, 'taxed every year')) && all;
  all = ok('EX4 D-GAIN-SMALL: +$8,200 / ~$1,230 tax',            has(n4, '+$8,200') && has(n4, '~$1,230')) && all;
  all = ok('EX4 GUARD: bogus CASH basis never poisons the Σ',    !has(n4, '−$') && !has(narrOrAll(R.E4.html), 'currently down')) && all;
  all = ok('EX4 strip: UG ladder hover (won’t sting)',           has(R.E4.html, 'small enough that selling won’t sting') || has(R.E4.html, "small enough that selling won't sting")) && all;
  all = ok('EX4 strip: gain-tax sub-line KEPT (14.2)',           has(R.E4.html, 'Tax if you sold it all today')) && all;
  all = ok('EX4 strip: clinical hr-gain-sub REMOVED (14.2)',     !has(R.E4.html, 'current value minus what you paid (cost basis)')) && all;
  // EX-F — fees
  all = ok('EXF behavior: fees deserve a hard look',             has(nF, 'the fees deserve a hard look')) && all;
  all = ok('EXF: 30-yr fee drag dollarized',                     /over a 30-year retirement/.test(nF)) && all;
  // §10 ladders behind the strip boxes (EX-1: BETA-LOW / YLD-MODERATE / EXP-VLOW)
  all = ok('strip ladder: beta rung (steadier than average)',    has(R.E1.html, 'moves less than the market — steadier than average')) && all;
  all = ok('strip ladder: yield rung (healthy stream)',          has(R.E1.html, 'healthy stream of income')) && all;
  all = ok('strip ladder: expense rung (as cheap as it gets)',   has(R.E1.html, 'about as cheap as investing gets')) && all;
  // §16 title hover + §11 cost-basis tooltip + DI-EMPTY
  all = ok('title: The account with no rules',                   has(R.E1.title, 'The account with no rules')) && all;
  all = ok('title: stepped-up basis + bridge before 59.5',       has(R.E1.title, 'stepped-up basis') && has(R.E1.title, '59.5')) && all;
  all = ok('§11 Cost Basis column tooltip (reinvested divs)',    has(R.E4.html, 'including reinvested dividends')) && all;
  all = ok('DI-EMPTY: authored line on empty account',           has(nE, 'Right now there’s nothing to read')) && all;
  // Regression
  all = ok('crypto: keeps GENERIC strip (not a bank room)',      has(R.CR, 'hr-gain-sub') && !has(R.CR, 'di-narr')) && all;
  all = ok('IRA narrative untouched',                            has(narr(R.IR), 'assembled from the open market')) && all;
  all = ok('457 narrative untouched',                            has(narr(R.S7), 'governmental plan')) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);

  function narrOrAll(h) { return narr(h) || h; }
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
