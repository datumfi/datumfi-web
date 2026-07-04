/* IRA cert gate — "The Library" (tradira [T]) / "The Conservatory" (rothira [R]). Drives fixtures through
   the real openAccountModal path and asserts the authored DI lines emit live on BOTH branches. Increment 1
   scope = §3a Composition Archetype (bank R179–R195): archetype REPLACES the spine on a fire, [R]/[T] tails
   flip, B2 suppressed on a fire, AR-NONE falls through to the spine (regression). Grows per increment (I2–I5).
   Usage: serve repo root on :8001, then node scripts/_gate_ira_cert.js [LABEL]. UTF-8 dump; no unicode to console. */
const { chromium } = require('playwright');
const fs = require('fs');
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
    const mk = (o) => Object.assign({ ticker: '', name: '', price: '', shares: '', sector: '', expRatio: '',
      assetClass: '', costBasis: '', beta: '', dividendYield: '', geography: '', instrumentType: '', priceSource: 'manual' }, o);
    const open = (baseId, holdings) => {
      try { addInstance(baseId); } catch (e) { return '__THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      a.holdings = holdings; a.showHoldings = true;
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    // fixtures
    const cryptoMulti = () => [
      mk({ ticker: 'BTC', name: 'Bitcoin', price: 100, shares: 300, assetClass: 'Crypto', sector: 'Bitcoin', instrumentType: 'Crypto' }),
      mk({ ticker: 'ETH', name: 'Ethereum', price: 100, shares: 150, assetClass: 'Crypto', sector: 'Etherium', instrumentType: 'Crypto' }),
      mk({ ticker: 'VTI', name: 'Total Market', price: 100, shares: 550, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
    ];
    const incomeYield = () => [
      mk({ ticker: 'TLT', name: 'Treasuries', price: 100, shares: 250, assetClass: 'Bond', sector: 'Long Term Treasuries', instrumentType: 'ETF' }),
      mk({ ticker: 'VCIT', name: 'Corporate', price: 100, shares: 200, assetClass: 'Bond', sector: 'Corporate Bonds', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'REIT', price: 100, shares: 200, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Dividend', price: 100, shares: 350, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
    ];
    const none = () => [
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 1000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF' }),
    ];
    const diversified = () => [  // 9 sleeves, no archetype -> B2 must still fire
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 300, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 200, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'BND', name: 'Bonds', price: 100, shares: 100, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF' }),
      mk({ ticker: 'SCHD', name: 'Div', price: 100, shares: 80, assetClass: 'Stocks', sector: 'Dividend Growth', instrumentType: 'ETF' }),
      mk({ ticker: 'VNQ', name: 'REIT', price: 100, shares: 80, assetClass: 'Equity', sector: 'Real Estate REIT', instrumentType: 'ETF' }),
      mk({ ticker: 'SOXX', name: 'Semis', price: 100, shares: 70, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'ETF' }),
      mk({ ticker: 'VB', name: 'Small', price: 100, shares: 60, assetClass: 'Stocks', sector: 'Small Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'XLE', name: 'Energy', price: 100, shares: 60, assetClass: 'Stocks', sector: 'Energy', instrumentType: 'ETF' }),
      mk({ ticker: 'GLD', name: 'Gold', price: 100, shares: 50, assetClass: 'Commodity', sector: 'Gold', instrumentType: 'ETF' }),
    ];
    // I2 feeDrag30yr fixtures — a single expensive equity ETF ($100k @ 0.85%, g=7%) so Layer D fires expensive.
    const expensive = () => [
      mk({ ticker: 'ARKK', name: 'Innovation', price: 100, shares: 1000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.85' }),
    ];
    const leanNoExp = () => [  // cheap + one holding with NO expRatio -> blendedExpense may be 0/low, drag sourced-or-blank
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 1000, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.03' }),
    ];
    const out = {};
    out.rMulti = open('rothira', cryptoMulti());
    out.tMulti = open('tradira', cryptoMulti());
    out.rIncome = open('rothira', incomeYield());
    out.rNone = open('rothira', none());
    out.tNone = open('tradira', none());
    out.rDiv = open('rothira', diversified());
    out.rExp = open('rothira', expensive());
    out.tExp = open('tradira', expensive());
    out.rLean = open('rothira', leanNoExp());
    // expected feeDrag for the expensive fixture, computed by the SAME formula (verifies value×expense×
    // rounding×format end-to-end; the Method-A formula itself was validated against the bank's $11,600 example)
    var V = 100000, g = 0.07, ef = 0.0085;
    var expDrag = V * Math.pow(1 + g, 30) - V * Math.pow(1 + g - ef, 30);
    out.expDragStr = '$' + Math.round(Math.round(expDrag / 100) * 100).toLocaleString('en-US');
    return out;
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const R_TAIL = 'steer your highest-upside sleeves here';                 // [R] archetype tax tail
  const T_TAIL = 'every dollar becomes ordinary income when you withdraw it'; // [T] archetype tax tail
  const SPINE_R = 'This Roth IRA is';                                       // Layer A spine lead
  const SPINE_T = 'This Traditional IRA is';
  const B2 = 'what’s actually under the hood, biggest first';              // Layer B2 sleeve breakdown

  const checks = [
    // §3a archetype fires + [R]/[T] tails
    ['AR-CRYPTO-MULTI fires [R]', has(R.rMulti, 'multi-coin crypto sleeve')],
    ['AR-CRYPTO-MULTI shows % [R]', has(R.rMulti, '45% of the account')],
    ['AR-CRYPTO-MULTI carries the ROTH tail', has(R.rMulti, R_TAIL)],
    ['AR-CRYPTO-MULTI fires [T]', has(R.tMulti, 'multi-coin crypto sleeve')],
    ['AR-CRYPTO-MULTI carries the TRAD tail', has(R.tMulti, T_TAIL)],
    ['[R]/[T] tails are DISTINCT (Multi)', has(R.rMulti, R_TAIL) && !has(R.rMulti, T_TAIL) && has(R.tMulti, T_TAIL) && !has(R.tMulti, R_TAIL)],
    ['AR-INCOME-YIELD fires [R]', has(R.rIncome, 'yield-tilted income sleeve') && has(R.rIncome, 'real-estate REITs')],
    // archetype REPLACES the spine (Layer A absent on a fire)
    ['archetype REPLACES spine [R] (no "This Roth IRA is")', !has(R.rMulti, SPINE_R)],
    ['archetype REPLACES spine [T] (no "This Traditional IRA is")', !has(R.tMulti, SPINE_T)],
    // B2 suppressed on a fire
    ['B2 suppressed when archetype fired', !has(R.rMulti, B2)],
    // AR-NONE falls through to the spine (regression) + [R]/[T] spine lead
    ['AR-NONE -> spine [R] ("This Roth IRA is")', has(R.rNone, SPINE_R) && !has(R.rNone, 'crypto sleeve')],
    ['AR-NONE -> spine [T] ("This Traditional IRA is")', has(R.tNone, SPINE_T)],
    // B2 still fires when NO archetype (regression on a diversified book)
    ['B2 fires on diversified book (no archetype)', has(R.rDiv, B2)],
    // I2 · feeDrag30yr (§9 Layer D R89 [R]/[T] + §1 R16 strip)
    ['I2 feeDrag $ figure renders (pipeline-exact)', typeof R.expDragStr === 'string' && has(R.rExp, R.expDragStr)],
    ['I2 R89 Roth "make the switch" framing', has(R.rExp, 'is what you keep by making the switch')],
    ['I2 R89 Trad "pure loss you fully control"', has(R.tExp, 'fees are pure loss you fully control')],
    ['I2 [R]/[T] Layer D distinct', has(R.rExp, 'making the switch') && !has(R.rExp, 'pure loss you fully control')],
    ['I2 §1 strip shows "% · $" feeDrag', has(R.rExp, '0.85% · ' + R.expDragStr)],
    ['I2 LEAN keeps short line (no switch-framing)', !has(R.rLean, 'making the switch') && has(R.rLean, 'never stuck with a bad menu')],
    // junk-safety
    ['no undefined/NaN in any render', ['rMulti','tMulti','rIncome','rNone','tNone','rDiv','rExp','tExp','rLean'].every(k => !has(R[k], 'undefined') && !has(R[k], 'NaN') && !has(R[k], '__'))],
  ];
  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 950) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\n=== rMulti (Conservatory) ===\n' + strip(R.rMulti) +
    '\n\n=== tMulti (Library) ===\n' + strip(R.tMulti) +
    '\n\n=== rNone (spine fallthrough) ===\n' + strip(R.rNone) +
    '\n\n=== rDiv (B2 no-arch) ===\n' + strip(R.rDiv) + '\n';
  fs.writeFileSync('scripts/_gate_ira_cert.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
