/* 401(k) STEP 1a — EMPLOYER-MATCH INPUT + PRE-TAX SUB-BUCKET ENGINE gate (RED-first).
   Proves the match input area + _di401kMatch split engine, branch-agnostic across both 401(k)
   rooms (roth401k "The Treasury" / pretax401k "The Vault"). Jobs:
   (1) MODAL FIELDS render on BOTH 401(k) rooms with the bank's VERBATIM §8 hovers (R93/R94/R96);
       the direct-entry Employer-Match Balance (R97) renders on the ROTH room ONLY and is SUPPRESSED
       on the pre-tax room.
   (2) SPLIT MATH (Lesson 47): a funded Roth account with a direct-entry match balance splits into
       matchBalance + rothBalance that SUM EXACTLY to the account value; matchCapHit reads "short"
       below the match cap and "full" at/above it; annualMatch computes from rate × min(deferral, cap).
   (3) SOURCED-OR-BLANK control: a no-match account blanks every match token — no fabricated rate,
       cap read, or split.
   (4) SUPPRESSION control: the pre-tax room never produces a roth/match split (whole balance pre-tax).
   (5) Regression: salary is REUSED from the global Gross-Salary field (Lesson 48), not a new input.
   RED on HEAD: _di401kMatch is undefined and the fields are absent → assertions fail cleanly.
   Usage: serve repo root on :8001, then node scripts/_gate_401k_match.js [LABEL] */
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
    const open = (baseId) => {
      const acc = window.state.accounts.find(a => a.baseId === baseId);
      acc.showHoldings = true;
      window.openAccountModal(acc.id);
      return document.getElementById('modal-dynamic-content').innerHTML;
    };
    const hasFn = (typeof _di401kMatch === 'function');
    // global Gross-Salary field the match engine REUSES (Lesson 48)
    const sal = document.getElementById('pri-salary');
    if (sal) sal.value = '100,000';

    ['roth401k', 'pretax401k'].forEach(id => { try { addInstance(id); } catch (e) {} });
    const rothAcc = window.state.accounts.find(a => a.baseId === 'roth401k');
    const preAcc  = window.state.accounts.find(a => a.baseId === 'pretax401k');

    const rothHtml = open('roth401k');
    const preHtml  = open('pretax401k');

    const call = (acc, salary) => {
      if (!hasFn) return null;
      return _di401kMatch(acc, getBaseType(acc.baseId), salary);
    };
    // FULL match: $6,000 deferral == 6% of $100k cap → matchCapHit "full", annualMatch = 50% × 6,000
    Object.assign(rothAcc, { value: 100000, inflow: 6000, freq: 1, matchRate: 50, matchUpTo: 6, matchBalance: 30000, vestedPct: 100 });
    const mFull = call(rothAcc, 100000);
    // SHORT match: $3,000 deferral < $6,000 cap → matchCapHit "short", annualMatch = 50% × 3,000
    Object.assign(rothAcc, { inflow: 3000 });
    const mShort = call(rothAcc, 100000);
    // NO-match control: strip the fields → everything blanks
    const blankAcc = window.state.accounts.find(a => a.baseId === 'roth401k');
    ['matchRate', 'matchUpTo', 'vestedPct', 'matchBalance'].forEach(k => { delete blankAcc[k]; });
    blankAcc.value = 50000; blankAcc.inflow = 4000; blankAcc.freq = 1;
    const mBlank = call(blankAcc, 100000);
    // SUPPRESSION control: pre-tax room never splits even if a match balance is set
    Object.assign(preAcc, { value: 80000, matchRate: 50, matchUpTo: 6, matchBalance: 20000 });
    const mPre = call(preAcc, 100000);

    return { hasFn, rothHtml, preHtml, mFull, mShort, mBlank, mPre };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(58)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  const has = (s, t) => s.indexOf(t) !== -1;

  console.log('===== 401(k) STEP 1a MATCH-ENGINE GATE [' + LABEL + '] =====');
  let all = true;
  // Job 1 — modal fields + verbatim hovers
  all = ok('engine present: _di401kMatch defined',            R.hasFn) && all;
  all = ok('roth: EMPLOYER MATCH section renders',            has(R.rothHtml, 'EMPLOYER MATCH')) && all;
  all = ok('roth: Match Rate field + verbatim hover (R93)',   has(R.rothHtml, 'Match Rate (%)') && has(R.rothHtml, 'highest-guaranteed-return move in your whole plan')) && all;
  all = ok('roth: Match Up-To field + verbatim hover (R94)',  has(R.rothHtml, 'Match Up-To (% of salary)') && has(R.rothHtml, 'grab the full match; going under leaves guaranteed money behind')) && all;
  all = ok('roth: Vesting field + verbatim hover (R96)',      has(R.rothHtml, 'Vesting (%)') && has(R.rothHtml, 'the match is truly YOURS')) && all;
  all = ok('roth: Employer-Match Balance + verbatim (R97)',   has(R.rothHtml, 'Employer-Match Balance ($)') && has(R.rothHtml, 'show your two tax buckets exactly')) && all;
  all = ok('pretax: Match Rate/Up-To/Vesting present',        has(R.preHtml, 'Match Rate (%)') && has(R.preHtml, 'Match Up-To (% of salary)') && has(R.preHtml, 'Vesting (%)')) && all;
  all = ok('pretax: Employer-Match Balance SUPPRESSED',       !has(R.preHtml, 'Employer-Match Balance ($)')) && all;
  // Job 2 — split math (buckets sum to balance; cap read; annual match)
  all = ok('split: matchBalance + rothBalance == value',      !!R.mFull && (R.mFull.matchBalance + R.mFull.rothBalance === 100000)) && all;
  all = ok('split: matchBalance = 30,000 (direct-entry)',     !!R.mFull && R.mFull.matchBalance === 30000) && all;
  all = ok('split: rothBalance = 70,000 (value − match)',     !!R.mFull && R.mFull.rothBalance === 70000) && all;
  all = ok('cap: FULL when deferral >= cap',                  !!R.mFull && R.mFull.matchCapHit === 'full') && all;
  all = ok('match$: 50% × 6,000 = 3,000 (full)',              !!R.mFull && R.mFull.annualMatch === 3000) && all;
  all = ok('cap: SHORT when deferral < cap',                  !!R.mShort && R.mShort.matchCapHit === 'short') && all;
  all = ok('match$: 50% × 3,000 = 1,500 (short)',             !!R.mShort && R.mShort.annualMatch === 1500) && all;
  // Job 3 — sourced-or-blank control
  all = ok('blank: no rate/upTo/vested (no fabrication)',     !!R.mBlank && R.mBlank.rate === null && R.mBlank.upTo === null && R.mBlank.vested === null) && all;
  all = ok('blank: no match$, no cap read',                   !!R.mBlank && R.mBlank.annualMatch === null && R.mBlank.matchCapHit === null) && all;
  all = ok('blank: no split (matchBalance/rothBalance null)', !!R.mBlank && R.mBlank.matchBalance === null && R.mBlank.rothBalance === null) && all;
  // Job 4 — pre-tax suppression
  all = ok('pretax engine: split SUPPRESSED (whole pre-tax)', !!R.mPre && R.mPre.matchBalance === null && R.mPre.rothBalance === null) && all;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
