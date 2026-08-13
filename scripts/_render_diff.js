/* ══ OLD-vs-NEW RENDER DIFF — THE SPLIT'S PRIMARY INSTRUMENT ═════════════════════════════════════
 *
 * Serve a git ref's studio.html on one port and the WORKING TREE on another, render the SAME
 * fixtures in both, and diff the resulting markup character-for-character.
 *
 * ⛔ WHY THIS IS COMMITTED RATHER THAN LIVING IN %TEMP%, WHERE IT SPENT ITS FIRST LIFE.
 * It caught a TOTALLY DEAD Studio page that 23 green gate legs missed — an apostrophe eaten by a
 * scripted edit, `state` and `addInstance` never defined, the page rendering NOTHING. The entire
 * split arc is old-vs-new comparison, and the one tool that can prove "identical" was the one tool
 * with no version control and an expiry date nobody set.
 * 🔑 A HARNESS IN %TEMP% IS AN INSTRUMENT THAT DISAPPEARS ON THE DAY SOMEBODY CLEARS A FOLDER.
 *
 * ⛔ WHY IT IS NOT NAMED _gate_ANYTHING, AND THE REASON IS STRUCTURAL. _suite_baseline.mjs builds
 * its population from `^(_gate_|_p\d)` over scripts/. A file named _gate_render_diff.js would be
 * EXECUTED by every suite run with no arguments — and on a clean tree HEAD and the working tree are
 * identical, so it would exit 0 and be counted a GREEN that tested nothing. That is the false-green
 * this repo already documented once for helper modules. THIS FILE DODGES THE GLOB BY PREFIX, exactly
 * as _studio_source.cjs does, and adds nothing to a hand-maintained exclusion list.
 * ⇒ IT IS A TOOL YOU POINT AT A CHANGE, NEVER A GATE THAT RUNS ITSELF.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
 *   node scripts/_render_diff.js                      # all scenarios, HEAD vs working tree
 *   node scripts/_render_diff.js --scenario mortgage  # one scenario
 *   node scripts/_render_diff.js --ref HEAD~1         # compare against a different ref
 *   node scripts/_render_diff.js --list               # what scenarios exist
 * EXIT 0 = every surface identical · 1 = a surface changed · 2 = the harness itself failed.
 *
 * ⚠️ READ THE VERDICT, NOT THE EXIT CODE. "DIFFERS" is not automatically a bug — it is a bug ONLY
 * when the commit claimed to move something without changing it. On a deliberate redesign a diff is
 * the expected result and the report is the review. THE TOOL REPORTS; IT DOES NOT JUDGE.
 * ⛔ WHICH IS WHY MOVE-VERBATIM AND TWEAK ARE NEVER THE SAME COMMIT: only a commit that claims
 * "nothing changed" can be checked by a tool that can only prove "nothing changed".
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), http = require('http'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = process.cwd();

const argv = process.argv.slice(2);
const argOf = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const REF = argOf('--ref', 'HEAD');
const WANT = argOf('--scenario', null);
const SELFCHECK = argv.includes('--selfcheck');

/* ══ --selfcheck · THE AMPUTATION TEST, BUILT IN ═════════════════════════════════════════════════
 * A COMPARATOR THAT HAS ONLY EVER SEEN EQUAL THINGS IS NOT EVIDENCE. This harness will spend the
 * whole split arc printing BYTE-IDENTICAL, which is exactly the reading under which a silently
 * broken differ is indistinguishable from a correct one — and the same trap the build's SACRED
 * comparator and _gate_studio_source's I3 leg already close for themselves.
 *
 * --selfcheck poisons the TREE side IN MEMORY (never on disk) with a one-token arithmetic change and
 * INVERTS the verdict: it now FAILS unless the diff reports a difference. Run it after touching this
 * file, and any time a BYTE-IDENTICAL result is load-bearing.
 * ⛔ THE POISON MUST PROVE IT LANDED — the anchor is counted, and an anchor that is not found EXACTLY
 * once aborts rather than running a mutation that quietly did nothing. */
const POISON_ANCHOR = 'return min + add;';
const POISON_REPLACE = 'return min + add + 1;   /* --selfcheck poison */';

/* ══ THE SCENARIOS ══════════════════════════════════════════════════════════════════════════════
 * Each scenario builds fixtures in the page and returns a map of NAMED SURFACES (strings). The
 * differ compares each surface across the two builds. A scenario is `evaluate`d inside the browser,
 * so it may only use page globals — it cannot close over anything in this file.
 *
 * ⭐ SURFACES ARE NAMED AND MULTIPLE ON PURPOSE. One giant blob tells you THAT something moved; a
 * named set tells you WHICH surface moved, and the money surfaces (a carrying total, an estate
 * total) are separated from the markup so a render change and a NUMBER change never look alike.
 * ⛔ A DIFF THAT ONLY COMPARES MARKUP CAN GO GREEN WHILE A TOTAL IS WRONG — the modal HTML can be
 * byte-identical while a value computed elsewhere on the page has moved.
 *
 * ⚠️ ADDING A SCENARIO IS THE NORMAL WAY TO USE THIS FILE. Before moving a function group, add the
 * scenario that renders the surfaces that group feeds. A move with no scenario is a move with no
 * evidence. */
const SCENARIOS = {
  /* ⭐ PROMOTED VERBATIM from the %TEMP% original — this is the exact fixture pair that proved the
     §45 upkeep-catalogue extraction (IDENTICAL at 41,454 and 43,627 chars). It is kept unchanged
     because a promoted instrument must keep proving what it already proved: if this scenario were
     rewritten during the promotion, the promotion itself would be unverifiable. */
  property: async () => {
    const res = {};
    for (const withLines of [false, true]) {
      window.state.accounts.length = 0; addInstance('property');
      const a = window.state.accounts[0]; a.value = 500000; a.utilYr = 2100; a.maintYr = 3000;
      renderInputs();
      if (withLines) {
        createPropertyUpkeep(a.id, 'electricity'); createPropertyUpkeep(a.id, 'lawn');
        const m = window._getUpkeepModel().items; m.forEach(i => { if (i.propertyId === a.id) i.amount = 125; });
      }
      renderInputs(); updateSVGs(); await new Promise(r => setTimeout(r, 600));
      openAccountModal(a.id); await new Promise(r => setTimeout(r, 400));
      const k = withLines ? 'withLines' : 'bare';
      res[k] = document.getElementById('modal-dynamic-content').innerHTML;
      res[k + '_total'] = (document.getElementById('gross-estate-val') || {}).textContent;
      res[k + '_carry'] = String(calcCarryTotal(window.state.accounts[0]));
    }
    return res;
  },

  /* ⭐ THE STEP-2a SCENARIO. Renders the surfaces fed by calculateTotalPmt / calculateEscrowMonthly /
     hasEscrow — the trio nominated for the first extraction. Three mortgage shapes, because the
     three functions disagree with each other only in specific states:
       noEscrow  — hasEscrow() false: the escrow footer must be ABSENT (the sourced-or-blank guard)
       escrow    — all four escrow inputs present: the footer renders and carries a monthly figure
       negam     — payment below monthly interest: calculateTotalPmt feeds the neg-am detector
     ⛔ A ONE-FIXTURE MORTGAGE SCENARIO WOULD GO GREEN ON A MOVE THAT BROKE hasEscrow, because with
     escrow present the guard is never asked to say NO. Exclusion needs presence, and presence needs
     an absence beside it. */
  mortgage: async () => {
    const res = {};
    const shapes = {
      noEscrow: { value: 300000, intRate: 6, minPmt: '2000', addPmt: '250' },
      escrow: {
        value: 300000, intRate: 6, minPmt: '2000', addPmt: '250',
        propTaxAnnual: '7200', insAnnual: '2400', pmiMonthly: '95', mortgageOtherCost: '600'
      },
      negam: { value: 400000, intRate: 9, minPmt: '100', addPmt: '0' }
    };
    for (const name of Object.keys(shapes)) {
      window.state.accounts.length = 0;
      addInstance('mortgage_joint');
      const a = window.state.accounts[0];
      Object.assign(a, shapes[name]);
      renderInputs(); updateSVGs(); await new Promise(r => setTimeout(r, 600));
      openAccountModal(a.id); await new Promise(r => setTimeout(r, 400));
      res[name] = document.getElementById('modal-dynamic-content').innerHTML;
      res[name + '_total'] = (document.getElementById('gross-estate-val') || {}).textContent;
      /* THE MONEY, READ DIRECTLY FROM THE MOVED FUNCTIONS. If an extraction leaves the markup
         identical but the arithmetic unreachable, these three strings are where it shows. */
      res[name + '_pmt'] = String(calculateTotalPmt(a));
      res[name + '_escrowMo'] = String(calculateEscrowMonthly(a));
      res[name + '_hasEscrow'] = String(hasEscrow(a));
    }
    return res;
  },

  /* ⛔ THIS SCENARIO EXISTS BECAUSE THE CALLER MAP DISAGREED WITH THE NOMINATION. The Step-2a trio
     was nominated as "what a mortgage costs per month" — then `calculateTotalPmt` turned out to be
     reached by _helocIntelBeats, _helocCeilingBand, _helocInterestOnlyDraw (the Cellar) and by
     _yardRealMonthly / _yardIntelligence (the Yard). A mortgage-only fixture would have proven the
     move for ONE of the three room families that depend on it.
     🔑 THE FIXTURE FOLLOWS THE CALLER MAP, NOT THE NOMINATION. */
  heloc: async () => {
    const res = {};
    const shapes = {
      drawn: { value: 40000, intRate: 8, minPmt: '400', addPmt: '100', creditLimit: '100000' },
      interestOnly: { value: 60000, intRate: 7.5, minPmt: '375', addPmt: '0', creditLimit: '100000' }
    };
    for (const name of Object.keys(shapes)) {
      window.state.accounts.length = 0;
      /* 'heloc_joint', not 'heloc' — the base types are ownership-scoped (heloc_primary / _joint /
         _co) and there is no bare 'heloc'. A wrong baseId threw on getBaseType(...).taxCode rather
         than silently rendering an empty room, which is the honest failure. */
      addInstance('heloc_joint');
      const a = window.state.accounts[0];
      Object.assign(a, shapes[name]);
      renderInputs(); updateSVGs(); await new Promise(r => setTimeout(r, 600));
      openAccountModal(a.id); await new Promise(r => setTimeout(r, 400));
      res[name] = document.getElementById('modal-dynamic-content').innerHTML;
      res[name + '_total'] = (document.getElementById('gross-estate-val') || {}).textContent;
      res[name + '_pmt'] = String(calculateTotalPmt(a));
    }
    return res;
  }
};

if (argv.includes('--list')) { console.log(Object.keys(SCENARIOS).join('\n')); process.exit(0); }
if (WANT && !SCENARIOS[WANT]) { console.error('no such scenario: ' + WANT + '\nhave: ' + Object.keys(SCENARIOS).join(', ')); process.exit(2); }
const RUN = WANT ? [WANT] : Object.keys(SCENARIOS);

const OLD = execFileSync('git', ['show', REF + ':studio.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

/* ⛔ THE REF SIDE MUST BE SERVED WITH THE REF'S *PARTS*, NOT THE WORKING TREE'S.
 * The original harness overrode studio.html alone and served every /scripts/*.js from disk. That was
 * correct while the monolith held everything — and it goes SILENTLY WRONG the moment a function
 * lives in a part, because the OLD page would then be served the NEW part. The diff would compare a
 * build against itself on exactly the commits this tool exists to check: the extraction commits.
 * 🔑 AN INSTRUMENT THAT STOPS BEING TRUE ON THE CHANGE IT WAS BUILT FOR IS WORSE THAN NO INSTRUMENT.
 * So the ref side resolves EVERY asset out of the ref. A file absent from the ref (a part that did
 * not exist yet) 404s there, which is the honest answer: the old build did not have it. */
function fromRef(rel) {
  /* stderr IGNORED, not merged: a miss here is EXPECTED and routine (the page requests endpoints and
     assets that were never files, e.g. /api/*), and git writes "fatal: path does not exist" for each
     one. Letting that reach the console would train the reader to skim past fatal-looking lines in a
     tool whose entire job is to be read carefully. The 404 below IS the report. */
  try { return execFileSync('git', ['show', REF + ':' + rel], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { return null; }
}

/* ⛔ THE POISON FOLLOWS THE FUNCTION, NOT THE FILENAME — AND IT LEARNED THAT THE HARD WAY.
 * The first version pinned the mutation to studio.html. Step 2a moved calculateTotalPmt into
 * scripts/studio-debt-cost.js and --selfcheck ABORTED with "anchor found 0 times" on the very first
 * extraction it was built to guard. It failed LOUDLY and correctly — the anchor count is exactly the
 * guard that caught it — but a self-check that has to be re-pointed by hand after every move is a
 * self-check that will one day be re-pointed wrong, or quietly dropped.
 * 🔑 SECOND SIGHTING IN ONE FILE OF "AN INSTRUMENT THAT STOPS BEING TRUE ON THE CHANGE IT WAS BUILT
 *    FOR" — the ref-side parts bug was the first. Both had the same cause: the tool assumed the
 *    monolith. So the poison is now applied to WHICHEVER SERVED FILE CONTAINS IT, and the run
 *    asserts it landed exactly once across the whole served set. ~20 extractions remain; this must
 *    survive all of them without being touched. */
/* A SET OF PATHS, NOT A COUNTER. Each grab() loads the page twice (goto + reload after clearing
   storage), so a naive counter reports "landed 2×" for ONE anchor in ONE file and invites the reader
   to believe there are two sites. The number a self-check prints has to mean what it says. */
const _poisoned = new Set();
function maybePoison(rel, src) {
  if (!SELFCHECK) return src;
  if (src.indexOf(POISON_ANCHOR) < 0) return src;
  _poisoned.add(rel);
  return src.split(POISON_ANCHOR).join(POISON_REPLACE);
}

const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serve(port, useRef) {
  return new Promise(r => {
    http.createServer((q, s) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/studio.html';
      const rel = p.replace(/^\//, '');
      if (useRef) {
        const buf = /studio\.html$/.test(p) ? Buffer.from(OLD, 'utf8') : fromRef(rel);
        if (!buf) { s.writeHead(404); s.end('not-in-ref'); return; }
        s.writeHead(200, { 'Content-Type': M[path.extname(p)] || 'application/octet-stream' });
        s.end(buf); return;
      }
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('nf'); return; }
      let body = fs.readFileSync(f);
      /* Poison any TEXT asset the tree serves — the function may live in the shell or in any part. */
      if (SELFCHECK && /\.(html|js)$/.test(p)) body = Buffer.from(maybePoison(rel, body.toString('utf8')), 'utf8');
      s.writeHead(200, { 'Content-Type': M[path.extname(f)] || 'application/octet-stream' });
      s.end(body);
    }).listen(port, '127.0.0.1', function () { r(); });
  });
}

(async () => {
  await serve(8401, true); await serve(8402, false);
  const { chromium } = require(ROOT + '/node_modules/playwright');
  const b = await chromium.launch();

  const grab = async (port, scenarioName) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message)));
    await p.goto('http://127.0.0.1:' + port + '/studio.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForSelector('#studio-layout', { timeout: 20000 }); await p.waitForTimeout(500);
    let out;
    try { out = await p.evaluate(SCENARIOS[scenarioName]); }
    catch (e) { await p.close(); return { __threw: String(e.message), __errs: errs }; }
    await p.close();
    return Object.assign(out, { __errs: errs });
  };

  let bad = 0, scenariosRun = 0;
  for (const name of RUN) {
    console.log('\n───── SCENARIO: ' + name + '  (' + REF + ' vs working tree) ─────');
    const o = await grab(8401, name), n = await grab(8402, name);

    /* ⛔ A SCENARIO THAT THREW IS NOT A CLEAN DIFF — AND IT MUST NOT BE ABLE TO REPORT ONE.
       The dead-page defect this harness was born to catch presents as `addInstance is not defined`
       inside the evaluate. If a throw were treated as "no surfaces to compare", the loop below would
       find zero differences and print IDENTICAL over a page that rendered nothing.
       🔑 THE FAILURE THIS TOOL EXISTS TO CATCH MUST NEVER BE ABLE TO LOOK LIKE ITS SUCCESS. */
    if (o.__threw || n.__threw) {
      bad++;
      console.log('*** SCENARIO THREW ***  ' + (o.__threw ? 'REF: ' + o.__threw : '') + (n.__threw ? '  TREE: ' + n.__threw : ''));
      const pe = [].concat(o.__errs || [], n.__errs || []);
      if (pe.length) console.log('   page errors: ' + JSON.stringify(pe.slice(0, 4)));
      continue;
    }
    /* An uncaught page error on either side is reported even when the surfaces match: a page can
       render identically and still be throwing on a path the fixtures did not walk. */
    const pageErrs = [].concat(o.__errs || [], n.__errs || []);
    if (pageErrs.length) console.log('⚠️  UNCAUGHT PAGE ERRORS (not a diff, but read them): ' + JSON.stringify([...new Set(pageErrs)].slice(0, 6)));
    delete o.__errs; delete n.__errs;

    const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])].sort();
    if (!keys.length) { bad++; console.log('*** SCENARIO PRODUCED NO SURFACES *** — a diff over nothing is not evidence'); continue; }
    scenariosRun++;

    /* NORMALISE THE RANDOM IDS. Account ids are 'inst_'+Math.random() and upkeep ids are
       'upk_'+random, regenerated on every page load, so a raw diff reports two DIFFERENT PAGES
       rather than two different BUILDS. Stripping them is what makes this a comparison of the render
       and not of the RNG. ⛔ NOTHING ELSE IS NORMALISED — A DIFF THAT SCRUBS UNTIL IT IS GREEN
       PROVES NOTHING, and every new normaliser is a place a real defect can hide. */
    const norm = (x) => String(x).replace(/inst_[a-z0-9]+/g, 'inst_X').replace(/upk_[a-z0-9]+/g, 'upk_X');
    for (const k of keys) {
      const A = norm(o[k]), B = norm(n[k]);
      const same = A === B;
      if (!same) bad++;
      console.log((same ? 'IDENTICAL' : '*** DIFFERS ***') + '  ' + k + (same ? '  (' + A.length + ' chars)' : ''));
      if (!same) {
        let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
        console.log('   first divergence @' + i + '\n   ' + REF + ': ' + JSON.stringify(A.slice(Math.max(0, i - 60), i + 140))
          + '\n   TREE: ' + JSON.stringify(B.slice(Math.max(0, i - 60), i + 140)));
      }
    }
  }

  console.log('\n===== RENDER DIFF RESULT =====');
  console.log(bad ? ('CHANGED — ' + bad + ' surface(s)/scenario(s) differ across ' + RUN.length + ' scenario(s)')
                  : ('BYTE-IDENTICAL — ' + scenariosRun + ' scenario(s), every named surface matched'));
  await b.close();

  /* ⛔ THE VERDICT IS INVERTED UNDER --selfcheck, AND THE INVERSION IS THE WHOLE POINT.
     A poisoned run that still reports BYTE-IDENTICAL means this harness cannot see a change it was
     handed on a plate — "inverted-dead", the same shape _gate_moat_winners guards with its
     RED-FIRST INERT check. A differ that cannot fail is a green light wired to nothing. */
  if (SELFCHECK) {
    /* ⛔ POISON MUST PROVE IT LANDED. Zero hits means the anchor no longer exists anywhere the tree
       serves — the mutation never happened, and "no difference found" would be a verdict about
       nothing. This is the leg that fired when Step 2a moved the function out of studio.html. */
    if (_poisoned.size === 0) {
      console.error('❌ SELF-CHECK ABORTED — the poison anchor ' + JSON.stringify(POISON_ANCHOR) + ' was not found in ANY served file.');
      console.error('   The mutation never landed, so this run proves nothing. RE-GROUND THE ANCHOR.');
      process.exit(2);
    }
    if (bad) { console.log('✅ SELF-CHECK PASSED — poison landed in ' + _poisoned.size + ' file(s) [' + [..._poisoned].join(', ') + '] and was SEEN (' + bad + ' surface(s) differ). The comparator can say no.'); process.exit(0); }
    console.error('❌ SELF-CHECK FAILED (inverted-dead) — calculateTotalPmt was poisoned and every surface still matched.');
    console.error('   This harness cannot detect a change. Every BYTE-IDENTICAL it has ever printed is unproven.');
    process.exit(1);
  }
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('DIFF ERROR:', e.message); process.exit(2); });
