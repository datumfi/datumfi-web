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
    // W2 — the §15 "Why …?" panel is an OVERVIEW-mode, top-of-modal feature: it renders with
    // showHoldings=false and is hidden while decorating. Capture the panel fixtures in overview mode
    // (assertions unchanged — the capture mode follows the panel to where it renders).
    const openOverview = (baseId, holdings) => {
      try { addInstance(baseId); } catch (e) { return '__THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      a.holdings = holdings; a.showHoldings = false;
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
    // §9a SPINE TOKEN fixtures — all fall through §3a to AR-NONE so the §9a spine renders (R116).
    const bondHeavy = () => [   // 30% equity / 70% bond, bond<80 so no bond archetype -> SS-BOND-HEAVY
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 300, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 700, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF' }),
    ];
    const cashHeavy = () => [   // 30% equity / 70% cash -> SS-CASH-HEAVY
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 300, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'CASH', name: 'Cash', price: 1, shares: 70000, assetClass: 'Cash', sector: 'Cash', instrumentType: 'Cash' }),
    ];
    const etfStock = () => [    // 58% ETF / 42% single stock, all equity -> SS-ALL-EQUITY + IM-FUND-AND-STOCK + breakdown
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 580, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF' }),
      mk({ ticker: 'NVDA', name: 'Nvidia', price: 100, shares: 420, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'Stock' }),
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
    // §9a spine fixtures (AR-NONE fall-through)
    out.rBond = open('rothira', bondHeavy());
    out.rCash = open('rothira', cashHeavy());
    out.rEtfStock = open('rothira', etfStock());
    // expected feeDrag for the expensive fixture, computed by the SAME formula (verifies value×expense×
    // rounding×format end-to-end; the Method-A formula itself was validated against the bank's $11,600 example)
    var V = 100000, g = 0.07, ef = 0.0085;
    var expDrag = V * Math.pow(1 + g, 30) - V * Math.pow(1 + g - ef, 30);
    out.expDragStr = '$' + Math.round(Math.round(expDrag / 100) * 100).toLocaleString('en-US');
    // I3 · §8 dated IRA limits — table + LOOKUP (no baked literal)
    out.iraLimits = (typeof _DI_IRA_LIMITS !== 'undefined')
      ? { y25: _DI_IRA_LIMITS[2025], y26: _DI_IRA_LIMITS[2026], now: (typeof _diIraLimits === 'function' ? _diIraLimits() : null) }
      : null;
    // I4 · §15 "Why an IRA?" panel — no workplace plan yet (fixtures above are only IRAs), Roth branch
    out.whyNoWork = openOverview('rothira', none());
    addInstance('pretax401k');   // now the estate holds a workplace plan
    out.whyWork = openOverview('tradira', none());   // Traditional branch + S5 nudge should fire (overview mode)
    // S4 live meter — funded AFTER the empty-state whyNoWork capture so iraUsed sums inflow*freq only here
    const openContrib = (baseId, holdings, inflow, freq) => {
      addInstance(baseId);
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      a.holdings = holdings; a.showHoldings = false; a.inflow = inflow; a.freq = freq;   // W2 — §15 S4 meter is overview-mode
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    out.rContrib = openContrib('rothira', none(), 6000, 1);
    return out;
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const R_TAIL = 'steer your highest-upside sleeves here';                 // [R] archetype tax tail
  const T_TAIL = 'every dollar becomes ordinary income when you withdraw it'; // [T] archetype tax tail
  const SPINE_R = 'This Roth IRA is';                                       // Layer A spine lead
  const SPINE_T = 'This Traditional IRA is';
  const B2 = 'what’s actually under the hood, biggest first';              // Layer B2 sleeve breakdown
  const YR = new Date().getFullYear();                                     // active tax year (S4/S5 tokens)

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
    // I3 · §8 dated IRA limits table + LOOKUP
    ['I3 dated table 2025 = 7,000 / 1,000', !!R.iraLimits && R.iraLimits.y25 && R.iraLimits.y25.base === 7000 && R.iraLimits.y25.c50 === 1000],
    ['I3 dated table 2026 = 7,500 / 1,100 (superCU 0)', !!R.iraLimits && R.iraLimits.y26 && R.iraLimits.y26.base === 7500 && R.iraLimits.y26.c50 === 1100 && R.iraLimits.y26.superCU === 0],
    ['I3 _diIraLimits() LOOKUP returns current-year row', !!R.iraLimits && !!R.iraLimits.now && R.iraLimits.now.base === 7500 && R.iraLimits.now.c50 === 1100],
    ['I3 IRA modal renders the 2026 active max $7,500', has(R.rMulti, '7,500')],
    // I4 · §15 "Why an IRA?" education panel + S1/S5/S6/S7
    ['I4 panel toggle renders', has(R.whyNoWork, 'Why you’d use an IRA')],
    ['I4 S1 hero lead renders', has(R.whyNoWork, 'Your IRA, your menu — the whole market is your fund list')],
    ['I4 authored sections present', has(R.whyNoWork, 'The one-line answer') && has(R.whyNoWork, 'backdoor') && has(R.whyNoWork, 'five years AND you’re 59½')],
    ['I4 dated limit (R220: $7,500, not baked $7,000) — now via S4 meter', has(R.whyNoWork, '$7,500 IRA room') && !has(R.whyNoWork, '$7,000')],
    ['I4 [R] emphasis "you hold a Roth"', has(R.whyNoWork, 'you hold a Roth')],
    ['I4 [T] emphasis "you hold a Traditional"', has(R.whyWork, 'you hold a Traditional')],
    ['I4 S5 nudge ABSENT with no workplace plan', !has(R.whyNoWork, 'You also hold a workplace plan')],
    ['I4 S5 nudge PRESENT with a workplace plan', has(R.whyWork, 'You also hold a workplace plan')],
    // I5 · §4 modal limit hovers (verify + close R42)
    ['I5 R41 header hover (share one ceiling)', has(R.rMulti, 'Traditional + Roth share one ceiling')],
    ['I5 R42 Base-Limit FIELD hover NOW wired (IRA, distinct from R41 header)', has(R.rMulti, '<strong>Base Limit</strong>The most you can put into ALL your IRAs')],
    ['I5 R43 catch-up hover (no super catch-up)', has(R.rMulti, 'NO super catch-up exists for IRAs')],
    ['I5 R44 [R] income-phaseout note (Roth)', has(R.rMulti, 'direct Roth IRA contributions phase out at higher incomes')],
    ['I5 R45 [T] deductibility note (Traditional)', has(R.tMulti, 'fully deductible, partly deductible, or not at all')],
    ['I5 [R]/[T] §4 notes distinct', has(R.rMulti, 'backdoor') && !has(R.rMulti, 'fully deductible, partly') && has(R.tMulti, 'the whole point of the Traditional IRA')],
    // §9a · SPINE TOKEN DERIVATIONS (IRA bank R101–R115) — AR-NONE fall-through only (R116)
    ['§9a full spine [R] SS-ALL-EQUITY + IM-ALL-ETF + tax-free tail (breakdown empty at 100%)',
      has(R.rNone, 'This Roth IRA is an all-equity account, built entirely from ETFs — a personal account you assembled from the open market, where everything inside grows tax-free.')],
    ['§9a full spine [T] SS-ALL-EQUITY + IM-ALL-ETF + tax-deferred tail',
      has(R.tNone, 'This Traditional IRA is an all-equity account, built entirely from ETFs — a personal account you assembled from the open market, holding pre-tax capital that grows tax-deferred.')],
    ['§9a SS-BOND-HEAVY (30/70 eq/bond, no bond archetype)', has(R.rBond, 'a bond-heavy, income-leaning account')],
    ['§9a SS-CASH-HEAVY (70% cash)', has(R.rCash, 'a cash-heavy, largely uninvested account')],
    ['§9a IM-FUND-AND-STOCK + {breakdown} (58/42)', has(R.rEtfStock, 'from a mix of funds and individual stocks — 58% ETFs, 42% individual stocks')],
    // S3 · backdoor awareness (v3 R6) — taxCode-gated [R]/[T]
    ['S3 [R] roth backdoor-awareness gated (no [T] leak)', has(R.whyNoWork, 'the “backdoor” path (contribute to a Traditional IRA non-deductibly') && !has(R.whyNoWork, 'your Traditional IRA DEDUCTION phases out')],
    ['S3 [T] trad deduction-phaseout gated (no [R] leak)', has(R.whyWork, 'your Traditional IRA DEDUCTION phases out at higher income') && !has(R.whyWork, 'Roth IRAs have an income ceiling')],
    // S4 · contribution-room meter (v3 R7) — LOOKUP limit, sourced-or-empty-state
    ['S4 empty-state when no contribution sourced', has(R.whyNoWork, 'Add your ' + YR + ' contributions to track') && has(R.whyNoWork, 'IRA room doesn’t roll over')],
    ['S4 live meter sums inflow×freq vs LOOKUP limit', has(R.rContrib, 'You’ve used $6,000 of your $7,500 IRA room for ' + YR)],
    // S5 · separate-bucket nudge (v3 R8) verbatim — replaces the I4 paraphrase
    ['S5 verbatim nudge present with workplace plan', has(R.whyWork, 'good news: this IRA is a SEPARATE bucket. The $7,500 you can put here for ' + YR + ' stacks ON TOP')],
    ['S5 old I4 paraphrase GONE', !has(R.whyWork, 'in this estate — so this bucket stacks on top of it')],
    // junk-safety
    ['no undefined/NaN in any render', ['rMulti','tMulti','rIncome','rNone','tNone','rDiv','rExp','tExp','rLean','rBond','rCash','rEtfStock','rContrib','whyNoWork','whyWork'].every(k => !has(R[k], 'undefined') && !has(R[k], 'NaN') && !has(R[k], '__'))],
  ];
  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 950) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\n=== rMulti (Conservatory) ===\n' + strip(R.rMulti) +
    '\n\n=== tMulti (Library) ===\n' + strip(R.tMulti) +
    '\n\n=== rNone (spine fallthrough) ===\n' + strip(R.rNone) +
    '\n\n=== rDiv (B2 no-arch) ===\n' + strip(R.rDiv) + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_ira_cert.out.txt', summary, 'utf8');
  // A SILENT GATE IS INDISTINGUISHABLE FROM A GATE THAT DID NOT RUN. This gate writes a UTF-8 dump
// and deliberately printed nothing, to dodge Windows console unicode mangling. The intent was sound;
// the side effect was that diffing its stdout compares two EMPTY strings and reports agreement --
// which is exactly how a triage read 'identical' from two runs that had produced nothing (2026-08-03).
// One ASCII-only line: the verdict, the counts, and where the real dump lives.
console.log('[_gate_ira_cert] ' + (pass === checks.length ? 'GREEN' : 'RED') + '  ' + pass + '/' + checks.length +
  '  -- full dump: scripts/.gate-out/_gate_ira_cert.out.txt');
process.exit(pass === checks.length ? 0 : 1);
})();
