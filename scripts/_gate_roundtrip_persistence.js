/* @gate-pool: browser
 *
 * ══ THE ROUND TRIP — OPEN A SAVED HOUSEHOLD AND ASSERT EVERY FIELD ════════════════════════════
 *
 * ⛔⛔ THIS GATE EXISTS TO CLOSE A GAP IN KIND, NOT A GAP IN COVERAGE. The suite is ~279 gates and
 * NOT ONE OF THEM OPENS A FILE IT DID NOT WRITE. Every persistence check in this repo saves
 * something it just built and reads it back, so all of them agree with each other about a shape
 * they invented together. A real file saved by the real product on a real day was never once
 * opened by an instrument.
 *
 * ⭐ SO THE FIXTURE IS A REAL SAVE, NOT A CONSTRUCTED ONE: `fixtures/roundtrip_joint_2026-09-15.json`
 * is slot1 of the Captain's own 15 Sep export — schema DatumFIBlueprintV1 v1.0.1, 13 accounts, a
 * joint household with `co_architect_enabled: true`. Nothing in it was authored for this gate.
 *   ⚠️ IF THAT FILE IS EVER REGENERATED, IT MUST BE COPIED FROM AN EXPORT, NEVER HAND-EDITED INTO
 *      AGREEMENT WITH THIS GATE. The moment the fixture is tuned to the assertions, this becomes
 *      one more instrument agreeing with itself and the gap in kind quietly reopens.
 *
 * ── §82.2428 — EVERY LEG IS PROVED BY REMOVING THE CAPABILITY, NOT ONE ROUTE TO IT ────────────
 * A field on this screen can arrive from FOUR places: the save file, the account dossier, a markup
 * default, or a re-render. So "the salary is on screen" proves nothing about persistence — it is
 * the hollow-leg shape, and it is not hypothetical here: the dossier re-fill path was measured
 * doing exactly this on 15 Sep (see `_gate_scratch_clears_declared`).
 * ⭐ THE FIXTURE THEREFORE SIGNS IN WITH A DOSSIER THAT DISAGREES WITH THE FILE ON EVERY SHARED
 *    FIELD (§82.2425 — the fingerprint):
 *        file 61,000 / dossier 99,999      file 111,000 / dossier 88,888
 *        file 08/1982 / dossier 01/1970    file 05/1980 / dossier 02/1961
 *    A leg that reads the dossier's number does not merely fail — IT NAMES THE WRONG SOURCE OUT
 *    LOUD, which is the difference between "persistence is broken" and "persistence is broken AND
 *    here is what answered instead." A VALUE CAN ONLY COME FROM THE STORE THAT HOLDS IT.
 * ⛔ AND THE MARKUP DEFAULTS ARE THE THIRD SOURCE, SO THEY ARE NAMED TOO. `hc-pre65-monthly` ships
 *    `value="$1,150"`; a healthcare leg that passes on 1,150 has been answered by the markup, not
 *    by the file. That literal is why the healthcare leg below asserts the FILE's absence rather
 *    than the field's presence.
 *
 * ── WHY THIS GATE IS RED THE DAY IT LANDS, AND WHY THAT IS THE POINT ──────────────────────────
 * ⭐ A GATE THAT HAS NEVER BEEN OBSERVED TO FAIL HAS NOT BEEN OBSERVED (§82.2315). This one fails
 * on arrival, on defects already reported by the Captain and already visible IN THE FIXTURE FILE:
 *   · SALARIES — `primary_salary: 61000` and `co_architect_salary: 111000` are IN the file with
 *     both `_stated` flags true, and the page renders $0. A LOAD defect, not a save defect;
 *     the save captured it correctly (§82.2413).
 *   · FILING STATUS and RETIREMENT LOCATION — these are not dropped on the way in, THERE IS
 *     NOWHERE FOR THEM TO GO. Grep the fixture: no `filing_status` key, no `location` key, in any
 *     save version (§82.2371). Collected on screen and discarded at the file layer.
 *   · SS ESTIMATES — `pri_overrides_monthly: {v62:0, v67:0, v70:0}`. Zeroes, in a file whose owner
 *     had typed real estimates.
 *   · HEALTHCARE — no key of any kind.
 * ⛔⛔ AND THE PARTITION IS THE FINDING, NOT THE LIST. `ss.strategy_primary` SURVIVED. What persists
 *    is what the product treats as an ANSWER; what vanishes is what it treats as WORKING-OUT, and
 *    NOBODY EVER RULED THAT DISTINCTION — it was inherited from whichever field happened to get a
 *    slot. A STORED CONCLUSION WHOSE PREMISES ARE GONE IS WORSE THAN A BLANK: it renders with
 *    authority and cannot be re-derived, checked or corrected by anyone.
 *    ⭐ RULED (Architect, 15 Sep): AN ESTIMATE A PERSON TYPED IS A FACT, NOT A SCRATCH VALUE. The
 *       OWED legs below assert that ruling even though the product does not implement it yet.
 *
 * ── READING THE OUTPUT ────────────────────────────────────────────────────────────────────────
 * BUILT legs are the contract as it stands and must stay green. OWED legs are the contract as it
 * has been RULED and are expected red until the slots exist. The exit code counts BOTH, so this
 * gate is RED until the owed work lands — deliberately. ⛔ DO NOT "FIX" IT BY DELETING AN OWED
 * LEG OR BY MOVING IT TO BUILT. The red IS the deliverable.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8491;          /* claimed 2026-09-15. ⛔ NEVER 8001 — the suite's shared server. */
const FIXTURE = path.join(__dirname, '_fixtures', 'roundtrip_joint_2026-09-15.json');

const BP = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const P  = BP.profile || {};
const ID = BP.blueprint_id;

/* ⛔ THE DISAGREEING DOSSIER — see the header. Every value here is DELIBERATELY NOT the file's. */
const DECOY_UID = 'user_roundtrip_decoy';
const DECOY = {
  primary:   { dateOfBirth: '01/1970', grossIncome: 99999, targetRetirementDate: '12/2040' },
  defaults:  { planThroughAge: 77 },
  household: { location: 'Texas',
               coArchitect: { dateOfBirth: '02/1961', grossIncome: 88888, targetRetirementDate: '11/2041' } }
};
const DECOY_MARKS = {
  '99,999': 'the account dossier (primary.grossIncome)',
  '88,888': 'the account dossier (coArchitect.grossIncome)',
  '01 / 1970': 'the account dossier (primary.dateOfBirth)',
  '02 / 1961': 'the account dossier (coArchitect.dateOfBirth)',
  '12 / 2040': 'the account dossier (primary.targetRetirementDate)',
  '11 / 2041': 'the account dossier (coArchitect.targetRetirementDate)',
  'Texas':     'the account dossier (household.location)',
  '$1,150':    "the MARKUP's own value= attribute, not the file"
};

const argv = process.argv.slice(2);
/* ⛔ §82.2428 — THE CONTROL REMOVES THE CAPABILITY, NOT A ROUTE TO IT. `--noload` makes the
 * explicit blueprint-slot open return nothing at all, so NO route can deliver the file's values.
 * A control that merely broke one assignment would leave the others answering and report a green
 * leg over a dead feature — which is the exact failure this project named the same week. */
const NOLOAD = argv.includes('--noload');
const SLOT_HIT = 'if (slot) { Object.assign(bp, slot); return finishLoad(bp, \'blueprint-slot:\' + id); }';
const SLOT_DEAD = 'if (slot) { }';

const CONTROLS = {
  '--noload': {
    what: 'the explicit ?id=&hydrate=blueprint open stops applying the slot — the capability is gone',
    anchors: [{ file: 'scripts/studio-blueprint.js', literal: SLOT_HIT, count: 1 }],
    reds: ['every BUILT leg'], expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_roundtrip_persistence.js', controls: CONTROLS }));
  process.exit(0);
}

function poison(rel, body) {
  if (!NOLOAD || rel !== 'scripts/studio-blueprint.js') return body;
  const n = body.split(SLOT_HIT).length - 1;
  if (n !== 1) { console.log(`ABORT: --noload anchor matched ${n} times, expected 1`); process.exit(1); }
  return body.split(SLOT_HIT).join(SLOT_DEAD);
}

const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.woff2':'font/woff2' };

const server = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const rel = p.replace(/^\//, '');
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
  let out = fs.readFileSync(f);
  if (/\.(html|js|mjs)$/.test(p)) out = Buffer.from(poison(rel, out.toString('utf8')), 'utf8');
  s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  s.end(out);
});

let builtPass = 0, builtFail = 0, owedPass = 0, owedFail = 0;
const lines = [];
function leg(kind, id, msg, cond, observed) {
  /* ⭐ WHEN A LEG FAILS, SAY WHICH STORE ANSWERED INSTEAD. That is the whole reason the decoy
   * dossier disagrees — a failure that names its source is a diagnosis, not a complaint. */
  let blame = '';
  if (!cond) {
    for (const [mark, who] of Object.entries(DECOY_MARKS)) {
      if (String(observed).includes(mark)) { blame = `  <- ANSWERED BY ${who}`; break; }
    }
  }
  if (kind === 'BUILT') { cond ? builtPass++ : builtFail++; }
  else                  { cond ? owedPass++  : owedFail++;  }
  lines.push(`${cond ? 'PASS' : 'FAIL'} [${kind}] ${id} · ${msg}   [observed: ${observed}]${blame}`);
}

const norm = v => String(v == null ? '' : v).replace(/\s+/g, '');

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  /* The real SDK would overwrite a window stub and the session would resolve false, which would
   * disarm the decoy entirely and make every leg pass for the wrong reason. Stub at the route. */
  await ctx.route('**/clerk.browser.js*', r => r.fulfill({
    status: 200, contentType: 'text/javascript',
    body: 'window.Clerk={load:()=>Promise.resolve(),user:{id:' + JSON.stringify(DECOY_UID) + '}};'
  }));

  await ctx.addInitScript(`(() => { try {
    var BP = ${JSON.stringify(JSON.stringify(BP))};
    localStorage.setItem('datum_blueprint_state_' + ${JSON.stringify(ID)}, BP);
    localStorage.setItem('datumfi_blueprint_archive_v1', JSON.stringify({
      slot1: JSON.parse(BP), activeBlueprintSlot: 'slot1'
    }));
    sessionStorage.setItem('datum_auth_hint', '1');
    localStorage.setItem('datum_studio_overlay_seen', '1');
    localStorage.setItem('datumfi.accountDossier.v15', ${JSON.stringify(JSON.stringify(DECOY))});
    localStorage.setItem('datumfi.accountDossier.owner', ${JSON.stringify(DECOY_UID)});
  } catch (e) {} })();`);

  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/studio.html?id=${encodeURIComponent(ID)}&hydrate=blueprint`,
                  { waitUntil: 'load' });
  await page.waitForTimeout(4500);
  await page.evaluate(() => { const b = document.getElementById('studioCloseIntro'); if (b) b.click(); });
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const v = id => { const e = document.getElementById(id); return e ? e.value : '(absent)'; };
    const coToggle = document.getElementById('co-arch-toggle');
    return {
      priDob: v('pri-dob'), coDob: v('co-dob'),
      ret: v('target-ret'), coRet: v('co-ret'),
      planEnd: v('plan-end-age'), coPlanEnd: v('co-plan-end'),
      priSal: v('pri-salary'), coSal: v('co-salary'),
      filing: v('filing-status'), loc: v('pri-location'),
      coOn: !!(coToggle && coToggle.checked),
      ssPri: [v('ss-pri-62'), v('ss-pri-67'), v('ss-pri-70')],
      ssSec: [v('ss-sec-62'), v('ss-sec-67'), v('ss-sec-70')],
      /* the claiming path is rendered as an ACTIVE CLASS on .ss-btn, not as a control value --
         #ss-co-arch-strategy is a <div> and reading .value off it returned undefined, which is a
         GATE defect that briefly looked like a product one. Ask for what the product draws. */
      ssActive: Array.prototype.filter.call(document.querySelectorAll('.ss-btn'), b => b.classList.contains('active'))
                  .map(b => ((b.querySelector('strong') || {}).textContent || '').trim()),
      hc: v('hc-pre65-monthly'),
      /* data-account-id DOES NOT EXIST in studio.html -- the first version of this leg invented
         the attribute and reported 0 of 13 as though the accounts had not loaded. Count what the
         product actually renders. */
      accounts: document.querySelectorAll('.room-header').length
    };
  });

  /* ⚠️ AN INIT THROW INVALIDATES EVERY GREEN BELOW — the gates measure the code that RAN. */
  leg('BUILT', 'L0', 'the page booted with a clean console',
      pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 2).join(' | ') : 'no page errors');

  /* ── BUILT: the contract as it stands ─────────────────────────────────────────────────────── */
  leg('BUILT', 'L1', `primary_dob ${P.primary_dob} arrives from the FILE`,
      norm(r.priDob) === norm(P.primary_dob), r.priDob);
  leg('BUILT', 'L2', `co_architect_dob ${P.co_architect_dob} arrives from the FILE`,
      norm(r.coDob) === norm(P.co_architect_dob), r.coDob);
  leg('BUILT', 'L3', `target_retirement_date ${P.target_retirement_date} arrives from the FILE`,
      norm(r.ret) === norm(P.target_retirement_date), r.ret);
  leg('BUILT', 'L4', `co_architect_retirement_date ${P.co_architect_retirement_date} arrives from the FILE`,
      norm(r.coRet) === norm(P.co_architect_retirement_date), r.coRet);
  leg('BUILT', 'L5', `plan_end_date ${P.plan_end_date} arrives from the FILE`,
      norm(r.planEnd) === norm(P.plan_end_date), r.planEnd);
  /* ⛔ THIS LEG IS A CONJUNCTION BECAUSE ITS FIRST HALF IS HOLLOW ON ITS OWN, AND THAT WAS
   * MEASURED, NOT FORESEEN: under --noload the toggle STAYED CHECKED and the leg stayed GREEN,
   * because applyDossierProfile turns the co-architect section on whenever the DOSSIER carries a
   * coArchitect. The section being open says somebody has a partner, not that THIS FILE loaded.
   * So the leg is anchored to `co_architect_plan_end_date`, a field the decoy dossier has no
   * equivalent for and cannot supply -- a FILE-ONLY WITNESS. §82.2428 turned on this gate itself. */
  leg('BUILT', 'L6', 'co_architect_enabled re-opens the section AND co_architect_plan_end_date ' + P.co_architect_plan_end_date + ' arrives from the FILE',
      r.coOn === true && norm(r.coPlanEnd) === norm(P.co_architect_plan_end_date),
      'toggle=' + r.coOn + ' · co-plan-end="' + r.coPlanEnd + '"');
  leg('BUILT', 'L7', `the ${BP.accounts.length} saved accounts are on the page`,
      r.accounts >= BP.accounts.length, `${r.accounts} account nodes rendered`);
  /* ⚠️⚠️ KNOWN WEAK LEG — DECLARED, NOT BANKED. This one survives `--noload` GREEN and it is left
   * in place with its weakness named rather than dressed up or deleted.
   *   WHY IT CANNOT DISCRIMINATE: this fixture's `strategy_primary` is `full_67`, and "67" is also
   *   the button the markup ships ACTIVE. So the leg reads the same either way — it is satisfied by
   *   the file, by the markup, and by a page that loaded nothing at all.
   *   ⛔ THE HONEST FIX IS A SECOND FIXTURE WHOSE STRATEGY IS NOT THE DEFAULT, NOT AN EDIT TO THIS
   *      ONE. Hand-tuning the fixture to make a leg bite is exactly the "instrument agreeing with
   *      itself" failure this whole gate exists to end (see the header). The next real export whose
   *      owner claims at 62 or 70 is the fixture that upgrades this leg.
   *   🔑 A LEG THAT CANNOT FAIL IS NOT EVIDENCE. It is recorded here so nobody counts it as such —
   *      the same treatment `_suite_baseline.mjs` gives its own `--sabotage=pass` sentinel. */
  const wantSs = { early_62: '62', full_67: '67', optimal_70: '70' }[(BP.ss || {}).strategy_primary];
  leg('BUILT', 'L8', `ss.strategy_primary "${(BP.ss||{}).strategy_primary}" survived the round trip (the .ss-btn reading ${wantSs} is active)`,
      r.ssActive.indexOf(wantSs) !== -1, 'active .ss-btn = ' + JSON.stringify(r.ssActive));

  /* ── THE SALARIES. IN THE FILE, WITH BOTH _stated FLAGS TRUE. ──────────────────────────────── */
  const priWant = '$' + Number(P.primary_salary).toLocaleString('en-US');
  const coWant  = '$' + Number(P.co_architect_salary).toLocaleString('en-US');
  leg('BUILT', 'L9',  `primary_salary ${priWant} arrives from the FILE (primary_salary_stated=${P.primary_salary_stated})`,
      norm(r.priSal) === norm(priWant), r.priSal);
  leg('BUILT', 'L10', `co_architect_salary ${coWant} arrives from the FILE (co_architect_salary_stated=${P.co_architect_salary_stated})`,
      norm(r.coSal) === norm(coWant), r.coSal);

  /* ── OWED: ruled, not yet built. These are red BY DESIGN. ──────────────────────────────────── */
  /* ⛔ ASSERTED AGAINST THE FILE, NOT THE SCREEN. There is no `filing_status` key in ANY save
   * version, so the screen could only ever show a default or the dossier's Texas — and a leg that
   * read the screen would be satisfied by either. The defect is the MISSING SLOT. */
  leg('OWED', 'L11', 'the save format HAS a slot for filing status',
      Object.prototype.hasOwnProperty.call(P, 'filing_status'),
      'profile.filing_status is ' + (Object.prototype.hasOwnProperty.call(P, 'filing_status') ? 'present' : 'ABSENT from the file') + ' · screen shows "' + r.filing + '"');
  leg('OWED', 'L12', 'the save format HAS a slot for retirement location',
      Object.prototype.hasOwnProperty.call(P, 'location') || Object.prototype.hasOwnProperty.call(P, 'retirement_location'),
      'profile.location is ' + (Object.prototype.hasOwnProperty.call(P, 'location') ? 'present' : 'ABSENT from the file') + ' · screen shows "' + r.loc + '"');

  const ssVals = (BP.ss && BP.ss.pri_overrides_monthly) || {};
  const ssAllZero = Object.values(ssVals).every(x => !Number(x));
  leg('OWED', 'L13', 'the typed SS estimates persisted (an estimate a person typed is a FACT)',
      !ssAllZero, 'file pri_overrides_monthly = ' + JSON.stringify(ssVals) + ' · screen ' + JSON.stringify(r.ssPri));
  const ssSec = (BP.ss && BP.ss.sec_overrides_monthly) || {};
  leg('OWED', 'L14', 'the co-architect SS estimates persisted',
      !Object.values(ssSec).every(x => !Number(x)),
      'file sec_overrides_monthly = ' + JSON.stringify(ssSec) + ' · screen ' + JSON.stringify(r.ssSec));

  leg('OWED', 'L15', 'the save format HAS a slot for the healthcare bridge figure',
      Object.prototype.hasOwnProperty.call(BP, 'healthcare') || Object.prototype.hasOwnProperty.call(P, 'hc_pre65_monthly'),
      'no healthcare key in the file · screen shows "' + r.hc + '"');

  await browser.close();
  server.close();

  lines.forEach(l => console.log(l));
  console.log('');
  console.log(`BUILT  ${builtPass} pass · ${builtFail} fail   — the contract as it stands; these must be green`);
  console.log(`OWED   ${owedPass} pass · ${owedFail} fail   — ruled but not implemented; red is expected here`);
  console.log(`\n${(builtFail + owedFail) === 0 ? 'GREEN' : 'RED'} · ${builtFail + owedFail} failing of ${builtPass + builtFail + owedPass + owedFail}`);
  process.exit((builtFail + owedFail) === 0 ? 0 : 1);
})().catch(e => { console.log('GATE ERROR: ' + e.stack); try { server.close(); } catch (x) {} process.exit(1); });
