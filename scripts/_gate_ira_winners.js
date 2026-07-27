/* L52 WHOLE-ROOM WINNER GATE — IRA "The Library" (tradira [T]) / "The Conservatory" (rothira [R]).
   Doctrine (Captain #234/#235/#236): DISREGARD the Architect's §22 stamps — the winner PER-FIELD is what CLAUDE
   diffed in the LIVE served bytes (richest live hover wins, L51). Drives BOTH branches through the real
   openAccountModal path (== served bytes) and asserts the DISTINCTIVE current-bank literal of every Ledger
   section, each branch distinct. Sections here: §1 strip · §2 title · §5 toggles · §9 A-G paragraph · §12 all
   14 cols · §19/§21/§22 rollup+nudges. (§3a/§4/§15/§9-A/§9-D are emit-proven by _gate_ira_cert.js 49/49 —
   REFERENCED, not duplicated.) DoD: whole-room green, both branches, machine verdict, no human override.

   RED-FIRST: `node scripts/_gate_ira_winners.js REDFIRST --redfirst` flips 3 winner asserts to their pre-reset /
   shorter-rollup counterparts (generic International, R275 rollup, R276 rollup) — those strings are ABSENT in the
   served bytes, so the gate BITES (RED). Normal run restores the real winners -> GREEN.
   FIXTURES: BLANK (no basis, cash>=15, no contrib/sub-form -> nudges fire) · FILLED (basis, cash<15, sub-form set
   -> nudges hide) · L1 (foreign+semi tilt, beta>=1.15, single-name>=10, catchUp50, contrib -> §9 B/C-beta/C-conc/
   E/F/G) · L2 (bond>=30, no beta -> §9 C bond-location). Usage: serve repo root on :8001, then node ... [LABEL]. */
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
    // L1 — AR-NONE: foreign 25% + semi single-name 22% (tilt geo+sector) · beta>=1.15 · single-name>=10% (Layer C beta+conc) · catchUp50 + contrib (F+G).
    const lay1 = () => [
      mk({ ticker: 'VOO', name: 'S&P 500', price: 100, shares: 330, assetClass: 'Stocks', geography: 'US Stocks - Large Blend', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.03', beta: '1.1' }),
      mk({ ticker: 'VXUS', name: 'Intl', price: 100, shares: 250, assetClass: 'Stocks', geography: 'Foreign', sector: 'Large Blend', instrumentType: 'ETF', expRatio: '0.07', beta: '1.2' }),
      mk({ ticker: 'NVDA', name: 'Nvidia', price: 100, shares: 220, assetClass: 'Stocks', sector: 'Semiconductors', instrumentType: 'Stock', beta: '1.6' }),
      mk({ ticker: 'BND', name: 'Total Bond', price: 100, shares: 200, assetClass: 'Bond', sector: 'Bonds - Intermediate', instrumentType: 'ETF', expRatio: '0.03' }),
    ];
    // L2 — AR-NONE bond 35% (Layer C bond-location); no beta trigger, no single name.
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
      // §2 title hover renders into the sibling #modal-acc-title (L6225), not modal-dynamic-content — capture both.
      var ttl = document.getElementById('modal-acc-title');
      return (ttl ? ttl.innerHTML : '') + document.getElementById('modal-dynamic-content').innerHTML;
    };
    const setOv = { beneficiary: 'Jane Roe', targetAllocation: '80', coveredByWorkPlan: true, inflow: 6000, freq: 1 };
    const layOv = { catchUp50: true, inflow: 6000, freq: 1 };
    return {
      R: open('rothira', blank), T: open('tradira', blank),
      Rf: open('rothira', filled, setOv), Tf: open('tradira', filled, setOv),
      R1: open('rothira', lay1, layOv), T1: open('tradira', lay1, layOv),
      R2: open('rothira', lay2), T2: open('tradira', lay2),
    };
  });
  await b.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  let pass = 0, fail = 0; const lines = [];
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }
  const pick = (win, lose) => RF ? lose : win;   // red-first: RF points the assert at the absent loser

  // ===== PART A · §1 SIGNALS strip winners (blank R,T) =====
  lines.push('===== PART A · §1 STRIP WINNERS =====');
  ok(has(R.R, 'the number that compounds') && has(R.T, 'the number that compounds'), 'Account Value -> R270 WINNER (both)');
  ok(has(R.R, 'this mix is entirely your design') && has(R.T, 'this mix is entirely your design'), 'Equity % -> §1 R12 WINNER (both)');
  ok(has(R.R, 'we leave it empty rather than fake it') && has(R.T, 'we leave it empty rather than fake it'), 'Weighted Beta -> §1 R14 WINNER (both)');
  ok(has(R.R, 'these dividends reinvest untaxed') && has(R.T, 'these dividends reinvest untaxed'), 'Blended Yield -> §1 R15 WINNER (both)');
  ok(has(R.R, 'the most fixable line in the whole modal') && has(R.T, 'the most fixable line in the whole modal'), 'Avg Expense -> §1 R16 WINNER (both)');
  ok(has(R.R, 'the holding-period clock does not run') && has(R.T, 'the holding-period clock does not run'), 'Acquisition Date col -> shelter R283 (both)');
  ok(has(R.R, pick('The Conservatory: already-taxed dollars', 'subject to RMDs); a Roth IRA is tax-free')) && has(R.R, 'very different after-tax worth'), 'Balance [R] -> §1 R10 branch-aware WINNER (R275 rollup REFUTED)');
  ok(has(R.T, 'The Library: pre-tax dollars') && has(R.T, 'very different after-tax worth'), 'Balance [T] -> §1 R10 branch-aware WINNER');
  ok(has(R.R, 'SHARED across all your IRAs') && has(R.T, 'SHARED across all your IRAs'), 'Annual Contribution -> §1 R11 WINNER (R276 rollup REFUTED)');
  ok(has(R.R, 'In the Conservatory all of this growth is yours tax-free'), 'Unrealized Gain box [R] -> §1 R13 WINNER');
  ok(has(R.T, 'In the Library this growth will be taxed as ordinary income'), 'Unrealized Gain box [T] -> §1 R13 WINNER');
  ok(has(R.R, 'In the Conservatory it never matters for tax'), 'Cost Basis col [R] -> §12 R141 WINNER');
  ok(has(R.T, 'In the Library it barely matters at withdrawal'), 'Cost Basis col [T] -> §12 R141 WINNER');
  ok(has(R.R, 'the single best reason to hold your biggest-growth names here'), 'UG (per-lot) col [R] -> §12 R142 WINNER');
  ok(has(R.T, 'this gain becomes ordinary income on the way out'), 'UG (per-lot) col [T] -> §12 R142 WINNER');

  // ===== PART B · DIFF-A rollup winners + generic loser ABSENT (both) =====
  lines.push('===== PART B · DIFF-A ROLLUP WINNERS =====');
  ok(has(R.R, pick('foreign-tax credit is LOST', 'identical signal to your other investment accounts')) && has(R.T, pick('foreign-tax credit is LOST', 'identical signal to your other investment accounts')), 'International -> R274 FTC-LOST WINNER (both)');
  ok(!has(R.R, 'identical signal to your other investment accounts') && !has(R.T, 'identical signal to your other investment accounts'), 'International -> generic loser ABSENT (no regression)');
  ok(has(R.R, 'least tax-efficient') && has(R.T, 'least tax-efficient'), 'Bond % -> R272 nuance WINNER (both)');
  ok(!has(R.R, 'Ballast — steadier, income-bearing holdings') && !has(R.T, 'Ballast — steadier, income-bearing holdings'), 'Bond % -> generic loser ABSENT');
  ok(has(R.R, 'a long-term drag on a retirement-purpose account') && has(R.T, 'a long-term drag on a retirement-purpose account'), 'Cash % -> R273 nuance WINNER (both)');
  ok(!has(R.R, 'Dry powder inside the account') && !has(R.T, 'Dry powder inside the account'), 'Cash % -> generic loser ABSENT');

  // ===== PART C · §21 nudges — show-when-blank / hide-when-set (both) =====
  lines.push('===== PART C · §21 NUDGES =====');
  ok(has(R.R, 'Add a cost basis and this box comes alive') && has(R.T, 'Add a cost basis and this box comes alive'), 'N-COSTBASIS shows when no basis (both)');
  ok(has(R.R, 'track it against the IRA limit') && has(R.T, 'track it against the IRA limit'), 'N-CONTRIB shows when contribution 0 (both)');
  ok(has(R.R, 'This cash isn’t invested yet') && has(R.T, 'This cash isn’t invested yet'), 'N-CASH-IDLE shows when cash>=15% (both)');
  ok(has(R.R, 'Name a beneficiary and this account skips probate') && has(R.T, 'Name a beneficiary and this account skips probate'), 'N-BENEFICIARY shows when blank (both)');
  ok(has(R.R, 'Set a target mix and we’ll flag when your account drifts from it') && has(R.T, 'Set a target mix and we’ll flag when your account drifts from it'), 'N-ALLOCATION shows when blank (both)');
  ok(has(R.T, 'whether this Traditional contribution is tax-deductible') && !has(R.R, 'whether this Traditional contribution is tax-deductible'), 'N-DEDUCT shows [T] ONLY');
  ok(has(R.T, 'Covered by a workplace plan') && !has(R.R, 'Covered by a workplace plan'), 'F-COVERED toggle renders [T] ONLY');
  ok(!has(R.Rf, 'Add a cost basis and this box comes alive') && !has(R.Tf, 'Add a cost basis and this box comes alive'), 'N-COSTBASIS hides when basis set (both)');
  ok(!has(R.Rf, 'track it against the IRA limit') && !has(R.Tf, 'track it against the IRA limit'), 'N-CONTRIB hides when contribution set (both)');
  ok(!has(R.Rf, 'This cash isn’t invested yet') && !has(R.Tf, 'This cash isn’t invested yet'), 'N-CASH-IDLE hides when cash<15% (both)');
  ok(!has(R.Rf, 'Name a beneficiary and this account skips probate') && !has(R.Tf, 'Name a beneficiary and this account skips probate'), 'N-BENEFICIARY hides when set (both)');
  ok(!has(R.Rf, 'Set a target mix and we’ll flag when your account drifts from it') && !has(R.Tf, 'Set a target mix and we’ll flag when your account drifts from it'), 'N-ALLOCATION hides when set (both)');
  ok(!has(R.Tf, 'whether this Traditional contribution is tax-deductible'), 'N-DEDUCT hides when covered set [T]');
  ok(has(R.Rf, 'value="Jane Roe"') && has(R.Tf, 'value="Jane Roe"'), 'F-BENEFICIARY persists+round-trips (both)');
  ok(has(R.Rf, 'value="80"') && has(R.Tf, 'value="80"'), 'F-ALLOCATION persists+round-trips (both)');

  // ===== PART D · §22 winner resolution — the REFUTED rollup lines must NOT serve =====
  lines.push('===== PART D · §22 WINNER RESOLUTION =====');
  ok(!has(R.R, 'subject to RMDs); a Roth IRA is tax-free') && !has(R.T, 'subject to RMDs); a Roth IRA is tax-free'), 'R275 rollup line ABSENT (§1 R10 wins Balance)');
  ok(!has(R.R, 'far lower than a workplace plan') && !has(R.T, 'far lower than a workplace plan'), 'R276 rollup line ABSENT (§1 R11 wins Annual Contribution)');

  // ===== PART E · §9 DI paragraph Layers B/C/E/F/G — branch-distinct current-bank literals =====
  lines.push('===== PART E · §9 LAYERS B-G (L1/L2 fixtures) =====');
  ok(has(R.R1, 'a deliberate shape you chose') && has(R.R1, 'toward some international exposure') && has(R.R1, 'technology and the chips/software behind it'), 'Layer B tilt [R] (geo+sector+wrap, R86/§13)');
  ok(has(R.T1, 'a deliberate shape — though in a Traditional account'), 'Layer B tilt [T] (R86)');
  ok(has(R.R1, pick('there are no RMDs ever, so it can compound untouched for life', 'far lower than a workplace plan')), 'Layer E tax [R] (R90)');
  ok(has(R.T1, 'RMDs begin at 73. Your contribution may be deductible today'), 'Layer E tax [T] (R90)');
  ok(has(R.R1, 'the right home for your highest-growth, highest-volatility bets since the payoff is untaxed'), 'Layer C beta [R] (R88)');
  ok(has(R.T1, 'both the gains and the swings are yours until withdrawal'), 'Layer C beta [T] (R88)');
  ok(has(R.R1, 'the one risk a tax-free wrapper'), 'Layer C concentration [R] (R88)');
  ok(has(R.T1, 'cutting both ways'), 'Layer C concentration [T] (R88)');
  ok(has(R.R2, 'a Roth is your most valuable tax shelter, so heavy ballast here slightly wastes space'), 'Layer C bond-location [R] (R88, L2)');
  ok(has(R.T2, 'bonds sit more naturally than in a Roth'), 'Layer C bond-location [T] (R88, L2)');
  ok(has(R.R1, 'a small extra slug of tax-free room'), 'Layer F toggle [R] (R91)');
  ok(has(R.T1, 'extra deductible room right when a deduction is often worth the most'), 'Layer F toggle [T] (R91)');
  ok(has(R.R1, 'the most tax-advantaged dollar in the code'), 'Layer G contribution [R] (R92)');
  ok(has(R.T1, 'building deferred capital'), 'Layer G contribution [T] (R92)');

  // ===== PART F · §12 the other 12 per-column ladders (blank) =====
  lines.push('===== PART F · §12 PER-COLUMN LADDERS (12 remaining) =====');
  ok(has(R.R, 'not a slot a plan handed you'), 'Ticker col (R136)');
  ok(has(R.R, 'built to be left alone for a long retirement'), 'Name col (R137)');
  ok(has(R.R, 'never a stale guess'), 'Price col (R138)');
  ok(has(R.R, 'how much weight this single holding carries in your IRA'), 'Shares Owned col (R139)');
  ok(has(R.R, 'a big-value row steers the whole account'), 'Position Value col (R140)');
  ok(has(R.R, 'we never fake a beta') && (has(R.R, 'the violent upside is untaxed') && !has(R.T, 'the violent upside is untaxed')), 'Beta col (R143) + [R]-only tail');
  ok(has(R.R, 'ZERO yearly tax drag'), 'Yield col (R144)');
  ok(has(R.R, 'reflects published domicile'), 'Geography col (R145)');
  ok(has(R.R, 'the concentration most people never see') && (has(R.R, 'a natural Roth bet') && !has(R.T, 'a natural Roth bet')), 'Sector col (R146) + [R]-only tail');
  ok(has(R.R, 'a cheaper index equivalent is usually one trade away'), 'Exp Ratio col (R147)');
  ok(has(R.R, 'your real risk dial'), 'Asset Class col (R148)');
  ok(has(R.R, 'built to survive being left alone'), 'Instrument col (R149)');

  // ===== PART G · §2 title hovers + §5 universal toggles (asserted vs LIVE strings) =====
  lines.push('===== PART G · §2 TITLE + §5 TOGGLES =====');
  ok(has(R.R, 'personal tax-free greenhouse') && has(R.R, 'a backdoor route exists'), '§2 title [R] R21-R24 (Conservatory)');
  ok(has(R.T, 'pre-tax library of capital') && has(R.T, 'a tax bill deferred, not erased'), '§2 title [T] R27-R30 (Library)');
  ok(has(R.R, 'Include this account in my plan') && has(R.R, 'Counts toward everything.'), '§5 count-in toggle (live label+hover)');
  ok(has(R.R, 'Count it, but never spend from it') && has(R.R, 'Held, not spent.'), '§5 set-aside toggle (live label+hover)');

  lines.push('-------------------------------------');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped to pre-reset/shorter losers — MUST be RED)' : 'NORMAL'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const caps = [R.R, R.T, R.Rf, R.Tf, R.R1, R.T1, R.R2, R.T2];
  const guard = caps.every(s => !has(s, 'undefined') && !has(s, 'NaN') && !has(s, '__'));
  lines.push('render-guard (no undefined/NaN/__): ' + guard);
  if (!guard) fail++;

  const summary = '[' + LABEL + '] IRA WHOLE-ROOM WINNER GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_ira_winners.out.txt', summary, 'utf8');
  console.log(summary);
  process.exit(fail === 0 ? 0 : 1);
})();
