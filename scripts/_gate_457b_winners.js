/* L52 WHOLE-ROOM WINNER GATE — 457(b) "The Workshop" (pretax457b [T]) / "The Annex" (roth457b [R]).
   Doctrine (Captain #237/#238): DISREGARD the §22 stamps — the winner PER-FIELD is what CLAUDE diffed in the
   LIVE served bytes (richest live hover wins, L51). Drives BOTH branches through the real openAccountModal path
   (== served bytes) and asserts the DISTINCTIVE current-bank literal of every Ledger section, each branch distinct.
   §22 resolution (byte-diffed, ratified): R253 Account Value WINS · R257 International WINS (DIFF A') ·
   R258 Balance REFUTED -> §1 R10 · R259 Annual Contribution REFUTED -> §1 R11.
   §6/§6.5 = CLOSED-STALE (withdrawal/limits already correct is457-gated — NOT re-wired).
   RED-FIRST: `node scripts/_gate_457b_winners.js REDFIRST --redfirst` flips 3 winners to pre-reset/rollup losers
   (generic International, R258 rollup, R259 rollup) -> those strings are ABSENT -> gate BITES (RED). Normal -> GREEN.
   NOTE: §21 PART C is added in stage 2 (DIFF B'). Spend-first §9 clause assert is PENDING the Architect's banked copy.
   Usage: serve repo root on :8001, then node scripts/_gate_457b_winners.js [LABEL]. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
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
    const blank = () => [
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 400, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', expRatio: '0.03', beta: '1.0', dividendYield: '1.5' }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 200, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.07' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 200, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
      mk({ ticker: 'CASH', name: 'Cash', price: 1, shares: 20000, assetClass: 'Cash', sector: 'Cash', instrumentType: 'Cash' }),
      mk({ ticker: 'ARKK', name: 'Innovation', price: 100, shares: 200, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'ETF', expRatio: '0.85' }),
    ];
    const filled = () => [
      mk({ ticker: 'VTI', name: 'US Large', price: 100, shares: 400, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'ETF', expRatio: '0.03', beta: '1.0', dividendYield: '1.5', costBasis: 30000 }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 200, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.07' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 200, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
      mk({ ticker: 'CASH', name: 'Cash', price: 1, shares: 5000, assetClass: 'Cash', sector: 'Cash', instrumentType: 'Cash' }),
      mk({ ticker: 'ARKK', name: 'Innovation', price: 100, shares: 200, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'ETF', expRatio: '0.85' }),
    ];
    // L1 — AR-NONE: foreign 25% + semi 22% (tilt geo+sector, all ETFs -> no concentration) · beta>=1.15 · catchUp50 + contrib (F+G).
    const lay1 = () => [
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 330, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.03', beta: '1.1' }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 250, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.07', beta: '1.2' }),
      mk({ ticker: 'SOXX', name: 'Semis', price: 100, shares: 220, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'ETF', expRatio: '0.4', beta: '1.5' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 200, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
    ];
    // L1b — Layer C concentration: one stock 45% (broad sector -> no sector-bet archetype), rest ETF.
    const lay1b = () => [
      mk({ ticker: 'NVDA', name: 'Nvidia', price: 100, shares: 450, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Cap', instrumentType: 'Stock', beta: '1.5' }),
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 350, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.03', beta: '1.0' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 200, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
    ];
    // L2 — Layer C bond-location: bond 35%, no beta trigger, no stock.
    const lay2 = () => [
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 650, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.03', beta: '1.0' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 350, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
    ];
    const open = (baseId, book, ov) => {
      try { addInstance(baseId); } catch (e) { return '__THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      a.holdings = book(); a.showHoldings = true;
      if (ov) Object.keys(ov).forEach(k => { a[k] = ov[k]; });
      try { recalcPortfolio(a); } catch (e) {}
      window.openAccountModal(a.id);
      var ttl = document.getElementById('modal-acc-title');
      return (ttl ? ttl.innerHTML : '') + document.getElementById('modal-dynamic-content').innerHTML;
    };
    const setOv = { beneficiary: 'Jane Roe', targetAllocation: '80', planFlavor: 'governmental', inflow: 6000, freq: 1 };
    const layOv = { catchUp50: true, inflow: 6000, freq: 1 };
    const out = {
      R: open('roth457b', blank), T: open('pretax457b', blank),
      Rf: open('roth457b', filled, setOv), Tf: open('pretax457b', filled, setOv),
      R1: open('roth457b', lay1, layOv), T1: open('pretax457b', lay1, layOv),
      Rc: open('roth457b', lay1b), Tc: open('pretax457b', lay1b),
      R2: open('roth457b', lay2), T2: open('pretax457b', lay2),
    };
    // E2 spend-first needs a penalty-gated sibling (IRA/401k/403b) in the book to fire — add one, then capture.
    addInstance('pretax401k');
    out.Rb2 = open('roth457b', lay1, layOv);
    out.Tb2 = open('pretax457b', lay1, layOv);
    return out;
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  let pass = 0, fail = 0; const lines = [];
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }
  const pick = (win, lose) => RF ? lose : win;

  // ===== PART A · §1 SIGNALS strip winners =====
  lines.push('===== PART A · §1 STRIP WINNERS =====');
  ok(has(R.R, 'the number that compounds') && has(R.T, 'the number that compounds'), 'Account Value -> R253 WINNER (both)');
  ok(has(R.R, 'menu quality and fees are the tension to watch') && has(R.T, 'menu quality and fees are the tension to watch'), 'Equity % -> §1 WINNER (plan-menu, both)');
  ok(has(R.R, 'we leave it empty rather than fake it') && has(R.T, 'we leave it empty rather than fake it'), 'Weighted Beta -> §1 WINNER (both)');
  ok(has(R.R, 'these dividends reinvest untaxed') && has(R.T, 'these dividends reinvest untaxed'), 'Blended Yield -> §1 WINNER (both)');
  ok(has(R.R, 'the cheapest available share class is the lever, not switching providers') && has(R.T, 'the cheapest available share class is the lever, not switching providers'), 'Avg Expense -> §1 WINNER (both)');
  ok(has(R.R, 'the holding-period clock does not run') && has(R.T, 'the holding-period clock does not run'), 'Acquisition Date col -> shelter (both)');
  ok(has(R.R, pick('The Annex: already-taxed dollars', 'ordinary income on withdrawal); Roth 457(b) is tax-free')) && has(R.R, 'crack open penalty-free the moment you leave the job'), 'Balance [R] -> §1 R10 branch-aware WINNER (R258 REFUTED)');
  ok(has(R.T, 'The Workshop: pre-tax dollars') && has(R.T, 'crack open penalty-free the moment you leave the job'), 'Balance [T] -> §1 R10 branch-aware WINNER');
  ok(has(R.R, 'roughly $49k combined pre-tax') && has(R.T, 'roughly $49k combined pre-tax'), 'Annual Contribution -> §1 R11 WINNER (R259 REFUTED, both)');
  ok(has(R.R, 'In the Annex all of this growth is yours tax-free'), 'Unrealized Gain box [R] -> §1 WINNER');
  ok(has(R.T, 'In the Workshop this growth will be taxed as ordinary income'), 'Unrealized Gain box [T] -> §1 WINNER');
  ok(has(R.R, 'In the Annex it never matters for tax'), 'Cost Basis col [R] -> §12 WINNER');
  ok(has(R.T, 'In the Workshop it barely matters at withdrawal'), 'Cost Basis col [T] -> §12 WINNER');
  ok(has(R.R, 'reachable penalty-free the day you separate'), 'UG (per-lot) col [R] -> §12 WINNER');

  // ===== PART B · DIFF-A' rollup winners + generic loser ABSENT (both) =====
  lines.push('===== PART B · DIFF-A\' ROLLUP WINNERS =====');
  ok(has(R.R, pick('foreign-tax credit is LOST', 'identical signal to your other investment accounts')) && has(R.T, pick('foreign-tax credit is LOST', 'identical signal to your other investment accounts')), 'International -> R257 FTC-LOST WINNER (both)');
  ok(!has(R.R, 'identical signal to your other investment accounts') && !has(R.T, 'identical signal to your other investment accounts'), 'International -> generic loser ABSENT');
  ok(has(R.R, 'least tax-efficient') && has(R.T, 'least tax-efficient'), 'Bond % -> R255 nuance WINNER (both)');
  ok(!has(R.R, 'Ballast — steadier, income-bearing holdings') && !has(R.T, 'Ballast — steadier, income-bearing holdings'), 'Bond % -> generic loser ABSENT');
  ok(has(R.R, 'a long-term drag on a retirement-purpose account') && has(R.T, 'a long-term drag on a retirement-purpose account'), 'Cash % -> R256 nuance WINNER (both)');
  ok(!has(R.R, 'Dry powder inside the account') && !has(R.T, 'Dry powder inside the account'), 'Cash % -> generic loser ABSENT');

  // ===== PART D · §22 winner resolution — REFUTED rollup lines must NOT serve =====
  lines.push('===== PART D · §22 WINNER RESOLUTION =====');
  ok(!has(R.R, 'ordinary income on withdrawal); Roth 457(b) is tax-free') && !has(R.T, 'ordinary income on withdrawal); Roth 457(b) is tax-free'), 'R258 rollup line ABSENT (§1 R10 wins Balance)');
  ok(!has(R.R, 'the biggest deferral headroom in the code') && !has(R.T, 'the biggest deferral headroom in the code'), 'R259 rollup line ABSENT (§1 R11 wins Annual Contribution)');

  // ===== PART E · §9 DI paragraph Layers A/B/C/E/F/G — branch-distinct current-bank literals =====
  lines.push('===== PART E · §9 LAYERS A-G =====');
  ok(has(R.R1, 'designated Roth dollars inside your governmental deferred-comp plan, where everything grows tax-free'), 'Layer A spine [R]');
  ok(has(R.T1, 'pre-tax deferred compensation in your governmental plan, growing tax-deferred'), 'Layer A spine [T]');
  ok(has(R.R1, 'a shape drawn from the funds your plan offers') && has(R.R1, 'toward some international exposure') && has(R.R1, 'technology and the chips/software behind it'), 'Layer B tilt [R] (geo+sector+plan-menu wrap)');
  ok(has(R.T1, 'though in a Traditional account that growth is only tax-deferred'), 'Layer B tilt [T]');
  ok(has(R.R1, 'because the Annex pays out tax-free'), 'Layer C beta [R]');
  ok(has(R.T1, 'in the Workshop both the gains and the swings are yours'), 'Layer C beta [T]');
  ok(has(R.Rc, 'a large share of that tax-free upside (and its risk) rides on one name'), 'Layer C concentration [R]');
  ok(has(R.Tc, 'one name drives an outsized share of the pre-tax balance'), 'Layer C concentration [T]');
  ok(has(R.R2, 'a heavy ballast slightly wastes your best tax shelter'), 'Layer C bond-location [R]');
  ok(has(R.T2, 'the ballast sits naturally here'), 'Layer C bond-location [T]');
  ok(has(R.R1, pick('a rare tax-free bridge you', 'the biggest deferral headroom in the code')), 'Layer E tax [R] (bridge)');
  ok(has(R.T1, 'the classic bridge for an early retirement, taxed but never penalized'), 'Layer E tax [T] (bridge)');
  ok(has(R.R1, 'extra tax-free room layered on an already-high 457(b) ceiling'), 'Layer F toggle [R]');
  ok(has(R.T1, 'extra deductible room on top of an already-high 457(b) ceiling'), 'Layer F toggle [T]');
  ok(has(R.R1, 'the most accessible retirement account you own'), 'Layer G contribution [R]');
  ok(has(R.T1, 'the one account you can reach penalty-free the moment you leave the job'), 'Layer G contribution [T]');

  // ===== PART E2 · §9 Layer E2 spend-first bridge (fires only w/ a sibling penalty-gated account) =====
  lines.push('===== PART E2 · §9 SPEND-FIRST BRIDGE =====');
  ok(!has(R.R1, 'Spend-order intelligence') && !has(R.T1, 'Spend-order intelligence'), 'E2 SILENT when no sibling retirement account (trigger gate)');
  ok(has(R.Rb2, pick('the common move is to drain a PRE-TAX bridge', 'the biggest deferral headroom in the code')) && has(R.Rb2, '5-year clock still governs tax-free GROWTH'), 'E2 [R] spend-first + 5-yr caveat (with sibling)');
  ok(has(R.Tb2, 'draw THIS account down first — before your IRA and 401(k)'), 'E2 [T] spend-first (with sibling)');

  // ===== PART F · §12 per-column ladders (spot, both branches) =====
  lines.push('===== PART F · §12 PER-COLUMN LADDERS =====');
  ok(has(R.R, 'a shorter list than the open market'), 'Ticker col (plan-menu)');
  ok(has(R.R, 'A governmental 457(b) menu is typically all funds'), 'Instrument col');
  ok(has(R.R, 'still partly fixable from within the menu'), 'Exp Ratio col');
  ok(has(R.R, 'reflects published domicile'), 'Geography col');

  // ===== PART G · §2 title hovers + §5 universal toggles =====
  lines.push('===== PART G · §2 TITLE + §5 TOGGLES =====');
  ok(has(R.R, 'tax-free dollars in a vault you can open the day you leave') && has(R.R, 'The Annex — a Roth 457(b)'), '§2 title [R] Annex');
  ok(has(R.T, 'pre-tax deferred compensation you can reach early without penalty') && has(R.T, 'The Workshop — a Traditional 457(b)'), '§2 title [T] Workshop');
  ok(has(R.R, 'Include this account in my plan') && has(R.R, 'Counts toward everything.'), '§5 count-in toggle (live)');
  ok(has(R.R, 'Count it, but never spend from it') && has(R.R, 'Held, not spent.'), '§5 set-aside toggle (live)');

  // ===== PART C · DIFF-B' §21 nudge wave — show-when-blank / hide-when-set (both) =====
  lines.push('===== PART C · DIFF-B\' §21 NUDGES =====');
  ok(has(R.R, 'Add a cost basis and this box comes alive') && has(R.T, 'Add a cost basis and this box comes alive'), 'N-COSTBASIS shows when no basis (both)');
  ok(has(R.R, 'track it against the 457(b) limit') && has(R.T, 'track it against the 457(b) limit'), 'N-CONTRIB shows when contribution 0 (both, 457-voiced)');
  ok(has(R.R, 'This cash isn’t invested yet') && has(R.T, 'This cash isn’t invested yet'), 'N-CASH-IDLE shows when cash>=15% (both)');
  ok(has(R.R, 'Name a beneficiary and this account skips probate') && has(R.T, 'Name a beneficiary and this account skips probate'), 'N-BENEFICIARY shows when blank (both)');
  ok(has(R.R, 'Set a target mix and we’ll flag when your account drifts from it') && has(R.T, 'Set a target mix and we’ll flag when your account drifts from it'), 'N-ALLOCATION shows when blank (both)');
  ok(!has(R.Rf, 'Add a cost basis and this box comes alive') && !has(R.Tf, 'Add a cost basis and this box comes alive'), 'N-COSTBASIS hides when basis set (both)');
  ok(!has(R.Rf, 'track it against the 457(b) limit') && !has(R.Tf, 'track it against the 457(b) limit'), 'N-CONTRIB hides when contribution set (both)');
  ok(!has(R.Rf, 'This cash isn’t invested yet') && !has(R.Tf, 'This cash isn’t invested yet'), 'N-CASH-IDLE hides when cash<15% (both)');
  ok(!has(R.Rf, 'Name a beneficiary and this account skips probate') && !has(R.Tf, 'Name a beneficiary and this account skips probate'), 'N-BENEFICIARY hides when set (both)');
  ok(!has(R.Rf, 'Set a target mix and we’ll flag when your account drifts from it') && !has(R.Tf, 'Set a target mix and we’ll flag when your account drifts from it'), 'N-ALLOCATION hides when set (both)');
  ok(has(R.Rf, 'value="Jane Roe"') && has(R.Tf, 'value="Jane Roe"'), 'F-BENEFICIARY persists+round-trips (both)');
  ok(has(R.Rf, 'value="80"') && has(R.Tf, 'value="80"'), 'F-ALLOCATION persists+round-trips (both)');
  ok(has(R.R, 'it changes your rollover and creditor-protection rules') && has(R.T, 'it changes your rollover and creditor-protection rules'), 'N-GOVVSNONGOV shows when planFlavor unset (both)');
  ok(!has(R.Rf, 'it changes your rollover and creditor-protection rules') && !has(R.Tf, 'it changes your rollover and creditor-protection rules'), 'N-GOVVSNONGOV hides when planFlavor set (both)');
  ok(has(R.Rf, 'value="governmental" selected') && has(R.Tf, 'value="governmental" selected'), 'F-PLANFLAVOR persists+round-trips governmental (both) — true 6/6');


  lines.push('-------------------------------------');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped to losers — MUST be RED)' : 'NORMAL') + '   |   STAGE: v4 (A\' + B\' §21 + E2 + F-PLANFLAVOR — whole room, §21 true 6/6)');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const caps = [R.R, R.T, R.Rf, R.Tf, R.R1, R.T1, R.Rc, R.Tc, R.R2, R.T2, R.Rb2, R.Tb2];
  const guard = caps.every(s => !has(s, 'undefined') && !has(s, 'NaN') && !has(s, '__'));
  lines.push('render-guard (no undefined/NaN/__): ' + guard);
  if (!guard) fail++;

  const summary = '[' + LABEL + '] 457(b) WHOLE-ROOM WINNER GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_457b_winners.out.txt', summary, 'utf8');
  console.log(summary);
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  process.exit(fail === 0 ? 0 : 1);
})();
