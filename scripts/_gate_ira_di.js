/* IRA Copy Bank wiring gate (tradira "The Library" / rothira "The Conservatory") — RED-first.
   Drives the app's own path (addInstance -> holdings -> recalcPortfolio -> openAccountModal).
   Jobs: (1) §11 DIVERGENCE PROOF — identical holdings through both rooms: Spine/E/F/G flip on
   taxCode, the §13 tilt clause core + the B2 Composition-Read sleeve list stay BYTE-IDENTICAL
   across branches (wrapper-neutral) with only the tax tails flipping. (2) §9 Layer C [IF]
   clauses fire honest (concentration ≥10% single-name, Roth bond ≥30%) on a variant fixture
   and stay SILENT on the base one. (3) B2 silence rule (<8 tickers -> no sleeve read).
   (4) §1 strip w/ NEW Unrealized Gain cell + §2 title hovers + §3/§4 IRA-aware modal copy +
   §12 per-room column hovers incl. Cost Basis column now visible for IRA. (5) Vanilla ban:
   "The invested sleeve is" NEVER appears in an IRA narrative. (6) Regression: 403(b) keeps
   its own tilt tail verbatim; taxable modal untouched; empty co-room fabricates nothing.
   On pre-build code every IRA block is RED (rooms render the generic non-bank modal).
   Usage: serve repo root on :8001, then node scripts/_gate_ira_di.js [LABEL] */
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
    const open = (baseId) => {
      const acc = window.state.accounts.find(a => a.baseId === baseId);
      acc.showHoldings = true;
      window.openAccountModal(acc.id);
      return { html: document.getElementById('modal-dynamic-content').innerHTML,
               title: document.getElementById('modal-acc-title').innerHTML };
    };
    // §11 fixture, extended to 8 tickers so B2 fires: $100k, 80/20 equity/bond, 25% intl,
    // 17% semis theme (21.25% of equity -> §13b sector clause), lean expenses, beta ~1.0
    // (unpronounced -> Layer C beta SILENT), no single names, $5,000/yr contrib, catch-up ON.
    const FIX = () => [
      mk({ ticker: 'VOO',  name: 'Vanguard S&P 500',        price: 100, shares: 220, beta: 1.0, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap',      instrumentType: 'ETF' }),
      mk({ ticker: 'VTI',  name: 'Vanguard Total Market',   price: 100, shares: 160, beta: 1.0, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market',   instrumentType: 'ETF' }),
      mk({ ticker: 'VXUS', name: 'Vanguard Intl',           price: 100, shares: 150, beta: 1.0, expRatio: 0.07, assetClass: 'Stocks', geography: 'International',           sector: 'Total Market (minus US)', instrumentType: 'ETF' }),
      mk({ ticker: 'VEA',  name: 'Vanguard Developed',      price: 100, shares: 100, beta: 1.0, expRatio: 0.05, assetClass: 'Stocks', geography: 'International',           sector: 'Developled Markets', instrumentType: 'ETF' }),
      mk({ ticker: 'SMH',  name: 'VanEck Semiconductor',    price: 100, shares: 100, beta: 1.1, expRatio: 0.35, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'ETF' }),
      mk({ ticker: 'XSD',  name: 'SPDR Semiconductor',      price: 100, shares: 70,  beta: 1.1, expRatio: 0.35, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Semiconductors', instrumentType: 'ETF' }),
      mk({ ticker: 'BND',  name: 'Vanguard Total Bond',     price: 100, shares: 120, beta: 0.5, expRatio: 0.03, assetClass: 'Bonds',  geography: 'US Bonds',                sector: 'Bonds',          instrumentType: 'ETF' }),
      mk({ ticker: 'AGG',  name: 'iShares Core Bond',       price: 100, shares: 80,  beta: 0.5, expRatio: 0.03, assetClass: 'Bonds',  geography: 'US Bonds',                sector: 'Bonds',          instrumentType: 'ETF' })
    ];
    ['tradira', 'rothira', 'trad403', 'taxable'].forEach(id => { try { addInstance(id); } catch (e) {} });

    const t = window.state.accounts.find(a => a.baseId === 'tradira');
    t.holdings = FIX(); t.inflow = 5000; t.freq = 1; t.catchUp50 = true;
    recalcPortfolio(t);
    const T = open('tradira');

    const r = window.state.accounts.find(a => a.baseId === 'rothira');
    r.holdings = FIX(); r.inflow = 5000; r.freq = 1; r.catchUp50 = true;
    recalcPortfolio(r);
    const Rt = open('rothira');

    // Variant fixture ([IF] clauses): TSLA 15% single name (no beta -> coverage < 60, beta
    // clause silent), bonds 35% -> Roth asset-location clause. 3 tickers -> B2 SILENT.
    r.holdings = [
      mk({ ticker: 'TSLA', name: 'Tesla Inc',           price: 100, shares: 150, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Automobiles & Auto Parts', instrumentType: 'Stock' }),
      mk({ ticker: 'VOO',  name: 'Vanguard S&P 500',    price: 100, shares: 500, beta: 1.0, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'BND',  name: 'Vanguard Total Bond', price: 100, shares: 350, expRatio: 0.03, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' })
    ];
    recalcPortfolio(r);
    const V = open('rothira');

    // Regression: 403(b) keeps its OWN tilt tail (plan-menu wording) after the wrap refactor.
    const t4 = window.state.accounts.find(a => a.baseId === 'trad403');
    t4.holdings = [
      mk({ ticker: 'VXUS', name: 'Intl Fund', price: 100, shares: 60, expRatio: 0.05, assetClass: 'Stocks', geography: 'International', sector: 'Total Market (minus US)', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 40, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(t4);
    const F = open('trad403');

    // Negative control: taxable modal keeps its existing strip, no DI leak.
    const tx = window.state.accounts.find(a => a.baseId === 'taxable');
    tx.holdings = [ mk({ ticker: 'VTI', name: 'V', price: 100, shares: 10, costBasis: '500', assetClass: 'Stocks' }) ];
    recalcPortfolio(tx);
    const X = open('taxable');

    // Empty-state honesty: tradira_co with NO holdings -> no narrative fabricated.
    try { addInstance('tradira_co'); } catch (e) {}
    const co = window.state.accounts.find(a => a.baseId === 'tradira_co');
    co.showHoldings = true; window.openAccountModal(co.id);
    const E = document.getElementById('modal-dynamic-content').innerHTML;

    return { T, Rt, V, F, X, E };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const narr = (html) => { const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : ''; };
  // Wrapper-neutral cores: the stretch between the shared lead and the branch tail must be
  // byte-identical across [R]/[T] (§11 R104 / B2 R96 — the divergence-proof heart).
  const between = (s, a, z) => { const i = s.indexOf(a); if (i < 0) return null; const j = s.indexOf(z, i); return j < 0 ? null : s.slice(i, j); };
  const nT = narr(R.T.html), nR = narr(R.Rt.html), nV = narr(R.V.html);

  console.log('===== IRA DI GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — §11 divergence proof (Spine / E / F / G flip on taxCode alone)
  all = ok('T spine: pre-tax capital, tax-deferred',            has(nT, 'holding pre-tax capital that grows tax-deferred')) && all;
  all = ok('R spine: everything inside grows tax-free',         has(nR, 'where everything inside grows tax-free')) && all;
  all = ok('both spines: assembled from the open market',       has(nT, 'assembled from the open market') && has(nR, 'assembled from the open market')) && all;
  all = ok('T LayerE: ordinary income + RMDs begin at 73',      has(nT, 'RMDs begin at 73')) && all;
  all = ok('T LayerE: deductibility phaseout (workplace plan)', has(nT, 'covered by a workplace plan')) && all;
  all = ok('R LayerE: 5-year clock + no RMDs ever',             has(nR, '5-year clock is met') && has(nR, 'no RMDs ever')) && all;
  all = ok('R LayerE: Roth income phaseout note',               has(nR, 'phase out at higher incomes')) && all;
  all = ok('T LayerF: extra deductible room',                   has(nT, 'extra deductible room right when a deduction')) && all;
  all = ok('R LayerF: extra slug of tax-free room',             has(nR, 'small extra slug of tax-free room')) && all;
  all = ok('T LayerG: $5,000/yr building deferred capital',     has(nT, '$5,000/yr') && has(nT, 'building deferred capital')) && all;
  all = ok('R LayerG: never taxed again',                       has(nR, '$5,000/yr') && has(nR, 'never taxed again')) && all;
  // Job 1b — tilt clause: core identical, IRA tails (deliberate shape), NOT the 403 tail
  const tiltT = between(nT, 'It leans', ', a deliberate shape'), tiltR = between(nR, 'It leans', ', a deliberate shape');
  all = ok('tilt: geo ladder fires (some international)',       has(nT, 'toward some international exposure')) && all;
  all = ok('tilt: §13b semis theme clause',                     has(nT, 'technology and the chips/software behind it')) && all;
  all = ok('tilt: core BYTE-IDENTICAL across [R]/[T]',          tiltT !== null && tiltT === tiltR) && all;
  all = ok('tilt R tail: you chose + compounds tax-free',       has(nR, 'a deliberate shape you chose') && has(nR, 'compounds entirely tax-free')) && all;
  all = ok('tilt T tail: only tax-deferred, not tax-free',      has(nT, 'only tax-deferred, not tax-free')) && all;
  all = ok('tilt: NOT the 403 plan-menu tail (wrong bank)',     !has(nT, 'funds your plan offers') && !has(nR, 'funds your plan offers')) && all;
  // Job 1c — B2 Composition Read: fires at 8 tickers, sleeve list byte-identical, tails flip
  const slT = between(nT, 'under the hood, biggest first:', '. '), slR = between(nR, 'under the hood, biggest first:', '. ');
  all = ok('B2 fires: under the hood lead present',             has(nT, 'what’s actually under the hood, biggest first:')) && all;
  all = ok('B2 sleeves: top sleeve US large-cap core 38%',      has(nT, '38% US large-cap core')) && all;
  all = ok('B2 sleeves: 25% international',                     has(nT, '25% international')) && all;
  all = ok('B2 sleeves: 20% bonds (honest bond sleeve)',        has(nT, '20% bonds')) && all;
  all = ok('B2 sleeves: 17% tech/semiconductors',               has(nT, '17% tech/semiconductors')) && all;
  all = ok('B2 sleeve list BYTE-IDENTICAL across [R]/[T]',      slT !== null && slT === slR) && all;
  all = ok('B2 R tail: growth engines, not the ballast',        has(nR, 'growth engines, not the ballast')) && all;
  all = ok('B2 T tail: worth seeing exactly what you’re building', has(nT, 'worth seeing exactly what you’re building')) && all;
  // Job 1d — honesty on the base fixture
  all = ok('LayerC beta SILENT (β≈0.94 in the quiet band)',     !has(nT, 'It rides') && !has(nR, 'It rides')) && all;
  all = ok('LayerC [IF]s SILENT (no single name, bonds 20%)',   !has(nT, 'sits in a single name') && !has(nR, 'rides in bonds')) && all;
  all = ok('VANILLA BAN: "The invested sleeve is" absent',      !has(nT, 'The invested sleeve is') && !has(nR, 'The invested sleeve is')) && all;
  // Job 2 — variant fixture: [IF] clauses fire, B2 silent (<8 tickers)
  all = ok('variant: concentration fires "15% (TSLA)"',         has(nV, '15% (TSLA)') && has(nV, 'sits in a single name')) && all;
  all = ok('variant R: tax-free wrapper can\'t offset',         has(nV, "tax-free wrapper can't offset")) && all;
  all = ok('variant R: bond 35% asset-location clause',         has(nV, '35%') && has(nV, 'most valuable tax shelter')) && all;
  all = ok('variant: beta clause SILENT (coverage 50% < 60)',   !has(nV, 'It rides')) && all;
  all = ok('variant: B2 SILENT (3 tickers < 8)',                !has(nV, 'under the hood')) && all;
  // Job 3 — §1 strip (incl. NEW Unrealized Gain cell) + §2 title + §3/§4 + §12 columns
  all = ok('strip T: Library balance hover (R10)',              has(R.T.html, 'The Library: pre-tax dollars')) && all;
  all = ok('strip R: Conservatory balance hover (R10)',         has(R.Rt.html, 'The Conservatory: already-taxed dollars')) && all;
  all = ok('strip: shared-ceiling contrib hover (R11)',         has(R.T.html, "SHARED across all your IRAs")) && all;
  all = ok('strip: Unrealized Gain cell present, blank-honest', /Unrealized Gain[\s\S]{0,300}—/.test(R.T.html)) && all;
  all = ok('strip: yield hover (no yearly tax drag, R15)',      has(R.T.html, 'no yearly tax drag like a taxable account')) && all;
  all = ok('title T: pre-tax library of capital (R27)',         has(R.T.title, 'pre-tax library of capital')) && all;
  all = ok('title T: tax bill deferred, not erased (R30)',      has(R.T.title, 'deferred, not erased')) && all;
  all = ok('title R: personal tax-free greenhouse (R21)',       has(R.Rt.title, 'personal tax-free greenhouse')) && all;
  all = ok('title R: backdoor route exists (R24)',              has(R.Rt.title, 'backdoor')) && all;
  all = ok('§3 T: NO Rule-of-55 teaching (R34)',                has(R.T.html, 'NO Rule-of-55')) && all;
  all = ok('§3 T: RMDs force withdrawals note (R37)',           has(R.T.html, 'RMDs force withdrawals starting at 73')) && all;
  all = ok('§3 R: 5-yr clock note (R36)',                       has(R.Rt.html, 'first Roth IRA contribution is 5 years old')) && all;
  all = ok('§4: shared-ceiling header hover (R41)',             has(R.T.html, 'Traditional + Roth share one ceiling')) && all;
  all = ok('§4: NO super catch-up for IRAs (R43)',              has(R.T.html, 'NO super catch-up exists for IRAs')) && all;
  all = ok('§4 R: backdoor conversion note (R44)',              has(R.Rt.html, 'usual route in')) && all;
  all = ok('§4 T: fully/partly/not-at-all deductible (R45)',    has(R.T.html, 'partly deductible, or not at all')) && all;
  all = ok('§12: Cost Basis column VISIBLE for IRA',            has(R.T.html, 'Cost Basis') && has(R.T.html, 'costBasis')) && all;
  all = ok('§12 T: basis barely matters hover (R115)',          has(R.T.html, 'taxed as ordinary income regardless of basis')) && all;
  all = ok('§12 R: highest-beta bets hover (R117)',             has(R.Rt.html, 'highest-beta bets')) && all;
  all = ok('§12 T: no [R]-marked leak on the Library',          !has(R.T.html, 'highest-beta bets')) && all;
  all = ok('§12: ticker hover (not a slot a plan handed you)',  has(R.T.html, 'not a slot a plan handed you')) && all;
  // Job 4 — regression + honesty controls
  all = ok('403: keeps its OWN plan-menu tilt tail',            has(narr(R.F.html), 'a shape drawn from the funds your plan offers')) && all;
  all = ok('taxable: keeps EXISTING strip (hr-gain-sub)',       has(R.X.html, 'hr-gain-sub')) && all;
  all = ok('taxable: NO DI narrative leak',                     !has(R.X.html, 'di-narr')) && all;
  all = ok('taxable: Cost Basis still visible (unchanged)',     has(R.X.html, 'Cost Basis')) && all;
  all = ok('empty tradira_co: NO narrative fabricated',         !/di-narr-body[^>]*>\s*\S/.test(R.E)) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
