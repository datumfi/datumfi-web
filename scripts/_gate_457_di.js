/* 457(b) Copy Bank wiring gate (pretax457b "The Workshop" / roth457b "The Annex" — provisional
   names, Captain to finalize) — RED-first. Drives the app's own path. Jobs:
   (1) §11 divergence proof — identical vanilla-core holdings (the live-Nationwide shape: 8
   mutual funds, no tilt, blank beta) through both rooms: Spine/E/F/G flip on taxCode; Layer B
   correctly SILENT (no invented tilt); BOTH branches keep the 457 signature load-bearing
   (penalty-free on separation). (2) §3 withdrawal fix (parked ticket C2.1): the WITHDRAWAL box
   shows separation-based rows and NO "Age 59.5" age gate — the exact live symptom pre-build.
   (3) §4: "457(b) Limits" label + SEPARATE-ceiling header hover + irc-457b source URL + [R]
   no-income-limit note. (4) §1 strip (Workshop/Annex balance hovers, own-ceiling contrib,
   guarded Unrealized Gain) + §2 title hovers + §12 per-room column tips (Cost Basis visible).
   (5) Variant: Layer C concentration ("A single position — TSLA — carries 15%") + Roth
   bond-ballast clause; B2 stays SILENT here (concentrated book, top sleeve >50%).
   (7) I1 · §13c B2 Composition Read: on a genuinely-diversified book (top sleeve <50%, ≥2
   sleeves) the "under the hood" sleeve breakdown FIRES, wrapper-neutral clause shared, 457
   tax-tail per branch (Workshop tax-deferred / Annex tax-free, both separation-access).
   (6) Regression: IRA rooms keep IRA copy (no 457 leak), 403 tilt tail intact, taxable
   untouched, empty co-room fabricates nothing.
   Usage: serve repo root on :8001, then node scripts/_gate_457_di.js [LABEL] */
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
    // §11 live-Nationwide shape: 8 mutual funds, 82/18 equity-bond, foreign ~12% of equity
    // (below the 20% floor), no theme >20% of equity, beta blank, moderate expense.
    const FIX = () => [
      mk({ ticker: 'NWLGX', name: 'NW Large Cap Core',   price: 100, shares: 430, expRatio: 0.45, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWLG2', name: 'NW Large Growth',     price: 100, shares: 100, expRatio: 0.55, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Growth', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWMDX', name: 'NW Mid Blend',        price: 100, shares: 90,  expRatio: 0.50, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Mid Blend', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWSMX', name: 'NW Small Cap',        price: 100, shares: 60,  expRatio: 0.60, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Small Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWINX', name: 'NW International',    price: 100, shares: 100, expRatio: 0.65, assetClass: 'Stocks', geography: 'International', sector: 'International', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'DODIX', name: 'Dodge & Cox Income',  price: 100, shares: 100, expRatio: 0.41, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NRSFX', name: 'NW Fixed Account',    price: 100, shares: 80,  expRatio: 0.30, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWBAL', name: 'NW Balanced Extra',   price: 100, shares: 40,  expRatio: 0.50, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' })
    ];
    ['pretax457b', 'roth457b', 'tradira', 'trad403', 'crypto_primary'].forEach(id => { try { addInstance(id); } catch (e) {} });

    const t = window.state.accounts.find(a => a.baseId === 'pretax457b');
    t.holdings = FIX(); t.inflow = 12000; t.freq = 1; t.catchUp50 = true;
    recalcPortfolio(t);
    const T = open('pretax457b');
    const wdT = (T.html.split('WITHDRAWAL RULES')[1] || '').split('CONTRIBUTION LIMITS')[0];

    const r = window.state.accounts.find(a => a.baseId === 'roth457b');
    r.holdings = FIX(); r.inflow = 12000; r.freq = 1; r.catchUp50 = true;
    recalcPortfolio(r);
    const Rt = open('roth457b');
    const wdR = (Rt.html.split('WITHDRAWAL RULES')[1] || '').split('CONTRIBUTION LIMITS')[0];

    // Variant ([IF] clauses on the Annex): TSLA 45% dominant single name (SMOKE-FIX 2026-07-02:
    // clause floor raised 0.10 → 0.40 + ≤5-pt tie-guard, so the fixture must be a REAL leader),
    // bonds 35%, beta blank.
    r.holdings = [
      mk({ ticker: 'TSLA', name: 'Tesla Inc',           price: 100, shares: 450, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Automobiles & Auto Parts', instrumentType: 'Stock' }),
      mk({ ticker: 'NWLGX', name: 'NW Large Cap Core',  price: 100, shares: 200, expRatio: 0.45, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'DODIX', name: 'Dodge & Cox Income', price: 100, shares: 350, expRatio: 0.41, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(r);
    const V = open('roth457b');

    // NEGATIVE CONTROL (SMOKE-FIX 2026-07-02): the Captain's equal-weight book — five names at
    // 20% each. Pre-fix code (snp >= 0.10, no tie-guard) printed the false leader "A single
    // position — TSLA — carries 20%" on exactly this shape; the 0.40 dominance floor + tie-guard
    // must read it as SILENCE, not a leader.
    r.holdings = [
      mk({ ticker: 'TSLA', name: 'Tesla Inc',            price: 100, shares: 200, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Automobiles & Auto Parts', instrumentType: 'Stock' }),
      mk({ ticker: 'BND',  name: 'Vanguard Total Bond',  price: 100, shares: 200, expRatio: 0.03, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'IBM',  name: 'IBM',                  price: 100, shares: 200, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Technology', instrumentType: 'Stock' }),
      mk({ ticker: 'VTI',  name: 'Vanguard Total Market', price: 100, shares: 200, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Total Market', instrumentType: 'ETF' }),
      mk({ ticker: 'LUNR', name: 'Intuitive Machines',   price: 100, shares: 200, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Aerospace & Defense', instrumentType: 'Stock' })
    ];
    recalcPortfolio(r);
    const N = open('roth457b');

    // DIVERSIFIED fixture (I1 · §13c B2 fire proof): top sleeve <50%, ≥2 sleeves, invCount≥3 → the
    // Composition Read MUST fire, tax-tail per branch. The vanilla FIX book has ~66% in one core
    // sleeve → B2 correctly SILENT (matches the §11 worked example); THIS book is the genuinely-
    // diversified shape R106 is authored for. core 30% / intl 25% / bonds 25% / small-cap 20%.
    const DIV = () => [
      mk({ ticker: 'NWLGX', name: 'NW Large Cap Core',  price: 100, shares: 300, expRatio: 0.45, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWINX', name: 'NW International',    price: 100, shares: 250, expRatio: 0.65, assetClass: 'Stocks', geography: 'International', sector: 'International', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'DODIX', name: 'Dodge & Cox Income',  price: 100, shares: 250, expRatio: 0.41, assetClass: 'Bonds', geography: 'US Bonds', sector: 'Bonds', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'NWSMX', name: 'NW Small Cap',        price: 100, shares: 200, expRatio: 0.60, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Small Cap', instrumentType: 'Mutual Fund' })
    ];
    t.holdings = DIV(); recalcPortfolio(t); const DT = open('pretax457b');
    r.holdings = DIV(); recalcPortfolio(r); const DR = open('roth457b');

    // Regression: IRA keeps IRA copy; 403 keeps its tilt tail; taxable untouched.
    const ir = window.state.accounts.find(a => a.baseId === 'tradira');
    ir.holdings = [ mk({ ticker: 'VOO', name: 'V', price: 100, shares: 100, expRatio: 0.03, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }) ];
    recalcPortfolio(ir);
    const I = open('tradira');
    const t4 = window.state.accounts.find(a => a.baseId === 'trad403');
    t4.holdings = [
      mk({ ticker: 'VXUS', name: 'Intl Fund', price: 100, shares: 60, expRatio: 0.05, assetClass: 'Stocks', geography: 'International', sector: 'Total Market (minus US)', instrumentType: 'Mutual Fund' }),
      mk({ ticker: 'FXAIX', name: 'Fidelity 500', price: 100, shares: 40, expRatio: 0.015, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Mutual Fund' })
    ];
    recalcPortfolio(t4);
    const F = open('trad403');
    const tx = window.state.accounts.find(a => a.baseId === 'crypto_primary');
    tx.holdings = [ mk({ ticker: 'VTI', name: 'V', price: 100, shares: 10, costBasis: '500', assetClass: 'Stocks' }) ];
    recalcPortfolio(tx);
    const X = open('crypto_primary');
    try { addInstance('pretax457b_co'); } catch (e) {}
    const co = window.state.accounts.find(a => a.baseId === 'pretax457b_co');
    co.showHoldings = true; window.openAccountModal(co.id);
    const E = document.getElementById('modal-dynamic-content').innerHTML;

    return { T, Rt, V, N, DT, DR, I, F, X, E, wdT, wdR };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;
  const narr = (html) => { const m = /di-narr-body[^>]*>([\s\S]*?)<\/div>/.exec(html); return m ? m[1] : ''; };
  const nT = narr(R.T.html), nR = narr(R.Rt.html), nV = narr(R.V.html), nN = narr(R.N.html);
  const nDT = narr(R.DT.html), nDR = narr(R.DR.html);

  console.log('===== 457(b) DI GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — §11 divergence proof on the vanilla live shape
  all = ok('T spine: pre-tax deferred comp, tax-deferred',      has(nT, 'pre-tax deferred compensation in your governmental plan')) && all;
  all = ok('R spine: designated Roth, grows tax-free',          has(nR, 'designated Roth dollars inside your governmental deferred-comp plan')) && all;
  all = ok('spine mix: built from eight mutual funds',          has(nT, 'built from eight mutual funds')) && all;
  all = ok('Layer B SILENT (vanilla core, no invented tilt)',   !has(nT, 'It leans') && !has(nR, 'It leans')) && all;
  all = ok('T LayerE: ordinary income + RMDs begin at 73',      has(nT, 'RMDs begin at 73')) && all;
  all = ok('T LayerE: 457 edge — ANY age with no 10% penalty',  has(nT, 'ANY age with no 10% penalty')) && all;
  all = ok('T LayerE: taxed but never penalized',               has(nT, 'taxed but never penalized')) && all;
  all = ok('R LayerE: 5-year clock + no RMDs for you ever',     has(nR, '5-year clock is met') && has(nR, 'no RMDs for you ever')) && all;
  all = ok('R LayerE: rare tax-free bridge (not wait 59.5)',    has(nR, 'rare tax-free bridge')) && all;
  all = ok('T LayerF: extra deductible room, high ceiling',     has(nT, 'extra deductible room on top of an already-high 457(b) ceiling')) && all;
  all = ok('R LayerF: extra tax-free room',                     has(nR, 'extra tax-free room layered on an already-high 457(b) ceiling')) && all;
  all = ok('T LayerG: penalty-free the moment you leave',       has(nT, '$12,000/yr') && has(nT, 'penalty-free the moment you leave the job')) && all;
  all = ok('R LayerG: most accessible retirement account',      has(nR, '$12,000/yr') && has(nR, 'most accessible retirement account you own')) && all;
  all = ok('Layer D: plan-menu lever (cheapest share class)',   has(nR, 'picking the cheapest available share class')) && all;
  all = ok('Layer D T: lowest-cost option your plan offers',    has(nT, 'lowest-cost option your plan offers')) && all;
  all = ok('beta clause SILENT (blank betas)',                  !has(nT, 'It rides') && !has(nR, 'It rides')) && all;
  all = ok('B2 SILENT on vanilla core (top sleeve >50%, correct)', !has(nT, 'under the hood') && !has(nR, 'under the hood')) && all;
  all = ok('VANILLA BAN: "The invested sleeve is" absent',      !has(nT, 'The invested sleeve is') && !has(nR, 'The invested sleeve is')) && all;
  // Job 2 — §3 withdrawal rebuild (parked ticket C2.1: the age gate must be GONE)
  all = ok('§3: withdrawal box has NO "Age 59.5 (…)" value',    R.wdT.length > 0 && !has(R.wdT, 'Age 59.5 (') && !has(R.wdR, 'Age 59.5 (')) && all;
  all = ok('§3: Upon separation from service — any age',        has(R.wdT, 'Upon separation from service')) && all;
  all = ok('§3: benchmark is an EVENT, not an age',             has(R.wdT, 'Separation from service (not an age)')) && all;
  all = ok('§3 T note: ordinary income only, NO 10% penalty',   has(R.wdT, 'no 10% penalty')) && all;
  all = ok('§3 T note: emergency-only while employed',          has(R.wdT, 'unforeseeable-emergency')) && all;
  all = ok('§3 R note: 5-yr clock governs TAX, not access',     has(R.wdR, 'first Roth 457(b) contribution is 5 years old')) && all;
  // Job 3 — §4 limits copy
  all = ok('§4: label reads 457(b) Limits',                     has(R.T.html, 'CONTRIBUTION LIMITS (457(b) Limits)')) && all;
  all = ok('§4: SEPARATE-ceiling header hover (R41)',           has(R.T.html, "SEPARATE ceiling from any 401(k) or 403(b)")) && all;
  all = ok('§4: irc-457b source URL',                           has(R.T.html, 'irc-457b-deferred-compensation-plans')) && all;
  all = ok('§4 R note: no income limit to contribute (R45)',    has(R.Rt.html, 'no income limit to contribute')) && all;
  all = ok('§4: base still 24,500 (2026, unchanged)',           has(R.T.html, '24500')) && all;
  // Job 4 — §1 strip + §2 titles + §12 columns
  all = ok('strip T: Workshop balance hover (R10)',             has(R.T.html, 'The Workshop: pre-tax dollars')) && all;
  all = ok('strip R: Annex balance hover (R10)',                has(R.Rt.html, 'The Annex: already-taxed dollars')) && all;
  all = ok('strip: crack open penalty-free tail (R10)',         has(R.T.html, 'crack open penalty-free the moment you leave the job')) && all;
  all = ok('strip: own-ceiling contrib hover (R11)',            has(R.T.html, 'this ceiling is its OWN')) && all;
  all = ok('strip: Unrealized Gain cell present, blank-honest', /Unrealized Gain[\s\S]{0,300}—/.test(R.T.html)) && all;
  all = ok('strip: menu-lever expense hover (R16)',             has(R.T.html, 'cheapest available share class')) && all;
  all = ok('title T: reach early without penalty (R27)',        has(R.T.title, 'reach early without penalty')) && all;
  all = ok('title T: bridge account for public employees',      has(R.T.title, 'classic bridge account') || has(R.T.title, 'classic bridge')) && all;
  all = ok('title R: vault you can open the day you leave',     has(R.Rt.title, 'open the day you leave')) && all;
  all = ok('title R: freedom unlocked by LEAVING (R24)',        has(R.Rt.title, 'LEAVING the job, not by reaching an age')) && all;
  all = ok('§12: ticker hover (plan fund menu)',                has(R.T.html, 'from your plan’s fund menu')) && all;
  all = ok('§12: Cost Basis column VISIBLE for 457',            has(R.T.html, 'Cost Basis') && has(R.T.html, 'costBasis')) && all;
  all = ok('§12 T: Vault→Workshop basis hover, ordinary income', has(R.T.html, 'ordinary income regardless of basis')) && all;
  all = ok('§12 R: higher-beta bets hover only on Annex',       has(R.Rt.html, 'fine home for higher-beta bets') && !has(R.T.html, 'fine home for higher-beta bets')) && all;
  // Job 5 — variant [IF] clauses
  all = ok('variant: single position TSLA carries 45%',         has(nV, 'A single position — TSLA — carries 45% of this account')) && all;
  all = ok('variant R: tax-free upside rides on one name',      has(nV, 'rides on one name')) && all;
  all = ok('variant R: bond ballast wastes best shelter',       has(nV, '35%') && has(nV, 'wastes your best tax shelter')) && all;
  all = ok('variant: B2 SILENT (concentrated, top sleeve >50%)', !has(nV, 'under the hood')) && all;
  // SMOKE-FIX negative control — equal-weight book stays SILENT (no false "carries 20%" leader)
  all = ok('NEG: equal-weight book — concentration SILENT',     !has(nN, 'A single position')) && all;
  all = ok('NEG: equal-weight book — no invented leader name',  !has(nN, 'carries 20%')) && all;
  // Job 7 — I1 §13c B2 COMPOSITION READ fires on a genuinely-diversified book (top sleeve <50%)
  all = ok('B2 fires (DIV book): "under the hood" present [T]',  has(nDT, 'under the hood')) && all;
  all = ok('B2 fires (DIV book): "under the hood" present [R]',  has(nDR, 'under the hood')) && all;
  all = ok('B2 sleeve list: names the real sleeves by name',    has(nDT, 'US large-cap core') && has(nDT, 'international')) && all;
  all = ok('B2 [T] tail: tax-deferred, ordinary income on draw', has(nDT, 'this whole mix grows tax-deferred') && has(nDT, 'penalty-free at any age once you leave the employer')) && all;
  all = ok('B2 [R] tail: sleeves compound tax-free, reach early', has(nDR, 'every one of those sleeves compounds tax-free') && has(nDR, 'reach at any age once you’ve separated')) && all;
  all = ok('B2 wrapper-neutral: sleeve clause shared [R]==[T]',  has(nDT, 'a plan menu can hide a lot of overlap') && has(nDR, 'a plan menu can hide a lot of overlap')) && all;
  // Job 6 — regression + honesty
  all = ok('IRA keeps IRA copy (no 457 leak)',                  has(narr(R.I.html), 'assembled from the open market') && !has(narr(R.I.html), 'governmental')) && all;
  all = ok('403: keeps its OWN plan-menu tilt tail',            has(narr(R.F.html), 'a shape drawn from the funds your plan offers')) && all;
  all = ok('crypto (non-bank): keeps EXISTING strip, no DI leak',         has(R.X.html, 'hr-gain-sub') && !has(R.X.html, 'di-narr')) && all;
  all = ok('empty pretax457b_co: NO narrative fabricated',      !/di-narr-body[^>]*>\s*\S/.test(R.E)) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
