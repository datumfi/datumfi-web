/* @gate-pool: browser
 *
 * ══ THE SEED GATE DOES NOT RUN ON THE SCRATCH BOOT ═════════════════════════════════════════════
 *
 * `.studio-layout.seed-gated{visibility:hidden}` hides the WHOLE drafting stage while the Clerk /
 * D1 dossier seed is awaited. It exists to stop a returning user seeing stale or empty numbers
 * before their real estate arrives, and on that path it still earns its keep.
 *
 * ⛔⛔ ON THE SCRATCH BOOT IT WAS GUARDING A RISK THAT CANNOT OCCUR. `datumfi_skip_entry_overlay`
 * is set by `_startScratchFlow` immediately before `_navDrain('/studio.html')`, so its presence
 * means exactly one thing: this load is the reload that follows START FROM SCRATCH. The user has
 * just asked for founder defaults and `_scratchReset()` has already cleared the prefill sources —
 * there is no estate arriving for a seed to overwrite.
 *   🔑 WE WERE HIDING THE PAGE TO PROTECT DATA THE USER HAD JUST ASKED US TO THROW AWAY.
 *
 * ── WHY IT WAS VISIBLE ONLY ON THAT PATH, WHICH IS THE PART WORTH REMEMBERING ────────────────────
 * ONE FLAG CONTROLS BOTH THE COVER AND THE THING THAT NEEDS COVERING:
 *     overlay auto-hides  <= _hintSignedIn && datum_studio_overlay_seen   (studio.html)
 *     seed gate turns on  <= _hintSignedIn
 * They cannot disagree. Being signed in simultaneously UNCOVERS the stage and HIDES the layout, so
 * the gate's blank was invisible behind the overlay on every other load and fully exposed here.
 * Measured on production, throttled 40ms/10Mbit/4x CPU, 2026-08-24, three arms:
 *     A cold (no reload, no gate)      -> no blank
 *     B draft-only (RELOAD, no gate)   -> NO BLANK. The reload is EXONERATED.
 *     C hint+draft (reload + gate)     -> layout hidden 1158->1611ms = 453ms of blank stage.
 * ⚠️ 453ms IS A LOWER BOUND: arm C reproduces the VISUAL path via sessionStorage with no real
 *    session, so the resolver settles early. A genuinely signed-in user waits for D1/Clerk, up to
 *    the 1500ms safety net.
 *
 * ── THE LEGS ────────────────────────────────────────────────────────────────────────────────────
 * L1 the fix: with the scratch flag set, `seed-gated` NEVER appears.
 * L2 the invariant, and it is the half that keeps L1 honest: with the flag ABSENT the gate STILL
 *    RUNS. Without L2, deleting the seed gate outright would make L1 green — EXCLUSION NEEDS
 *    PRESENCE. L2 is what proves this commit SCOPED the gate rather than removed it.
 * L3 the source-order invariant, and it is here because it is the bug that actually happened.
 *
 * ⛔⛔ L3 EXISTS BECAUSE THE FIRST VERSION OF THIS FIX LOOKED CORRECT AND CHANGED NOTHING. It read
 * the flag inside `init()`. `init()` runs at DOMContentLoaded; the entry-overlay block CONSUMES the
 * flag (removeItem, not a read) at PARSE. Probe, 2026-08-24: flagAtStart=1, flagAtGate=null, gate
 * ran anyway. THE READ WAS RIGHT AND THE MOMENT WAS WRONG — a distinction no diff shows you.
 *   🔑 A FLAG WITH A CONSUMER IS A MESSAGE, NOT A STATE. Read it before its reader does, or not at
 *      all. And LINE ORDER IS NOT EXECUTION ORDER once a deferred callback is involved: the latch
 *      sits ~1,700 lines ABOVE the overlay block and still ran after it.
 *
 * ⚠️ L1 AND L3 ARE NOT INDEPENDENT AND THIS FILE DOES NOT PRETEND THEY ARE. The source position IS
 * the mechanism, so any poison that breaks the order also breaks the behaviour. `--latelatch`
 * therefore declares BOTH, and it reproduces the REAL first-version bug rather than inventing a
 * mutation. Claiming one-leg independence here would be a decoration, not a proof.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8439;          /* claimed 2026-08-24. ⛔ NEVER 8001 — that is the suite's shared server. */
const PART = 'studio.html';
const SKIP_KEY = 'datumfi_skip_entry_overlay';

const LATCH   = "    try { _scratchBoot = sessionStorage.getItem('" + SKIP_KEY + "') === '1'; } catch (e) {}";
const GATECALL = '          if (_likelySignedIn && !_scratchBoot) _seedGateOn();';
const GATECALL_LATE = "          try { _scratchBoot = sessionStorage.getItem('" + SKIP_KEY + "') === '1'; } catch (e) {}\n" + GATECALL;
const GATECALL_NEVER = '          if (false && _likelySignedIn && !_scratchBoot) _seedGateOn();';
const CONSUMER = "sessionStorage.removeItem('" + SKIP_KEY + "')";

const argv = process.argv.slice(2);
const LATELATCH = argv.includes('--latelatch');
const NEVERGATE = argv.includes('--nevergate');
const ANY_POISON = LATELATCH || NEVERGATE;

const CONTROLS = {
  '--latelatch': {
    what: 'moves the flag read out of parse and into init() — the REAL first-version bug, verbatim',
    anchors: [{ file: PART, literal: LATCH, count: 1 }, { file: PART, literal: GATECALL, count: 1 }],
    reds: ['L1', 'L3'],
    expect: 'red'
  },
  '--nevergate': {
    what: 'stops the seed gate running at all, so L1 goes green for the WRONG reason',
    anchors: [{ file: PART, literal: GATECALL, count: 1 }],
    reds: ['L2'],
    expect: 'red'
  }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_seed_gate_scratch_skip.js', controls: CONTROLS }));
  process.exit(0);
}

const landed = [];
function poison(rel, body) {
  if (!ANY_POISON || rel !== PART) return body;
  const swap = (lit, rep, tag) => {
    const n = body.split(lit).length - 1;
    if (n !== 1) { console.log(`ABORT: ${tag} anchor matched ${n} times in ${rel}, expected 1`); process.exit(1); }
    body = body.split(lit).join(rep);
    landed.push(tag);
  };
  if (LATELATCH) { swap(LATCH, '', '--latelatch/remove-parse-read'); swap(GATECALL, GATECALL_LATE, '--latelatch/read-in-init'); }
  if (NEVERGATE) { swap(GATECALL, GATECALL_NEVER, '--nevergate'); }
  return body;
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

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else      { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* ⛔ CPU THROTTLE IS NOT DECORATION. `init()` is reached ~2.5s into a 1.4MB parse under 4x, and the
 * gate window is a few hundred ms. Unthrottled the sampler can miss the whole interval and report
 * "never gated" for a page that gated — a false GREEN on L1 and a false RED on L2. */
(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));

  console.log('[RUN] SEED GATE — SKIPPED ON THE SCRATCH BOOT, INTACT EVERYWHERE ELSE');
  if (ANY_POISON) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  const browser = await chromium.launch();
  const seen = {};
  for (const withFlag of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.addInitScript(`(() => { try {
      sessionStorage.setItem('datum_auth_hint', '1');
      ${withFlag ? `sessionStorage.setItem('${SKIP_KEY}', '1');` : `sessionStorage.removeItem('${SKIP_KEY}');`}
      window.__g = { gatedEver: false, flagAtStart: String(sessionStorage.getItem('${SKIP_KEY}')) };
      const tick = () => {
        const l = document.getElementById('studio-layout');
        if (l && l.classList.contains('seed-gated')) window.__g.gatedEver = true;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) { window.__gerr = String(e); } })();`);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`http://127.0.0.1:${PORT}/studio.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    seen[withFlag ? 'withFlag' : 'noFlag'] = await page.evaluate(() => ({ g: window.__g, e: window.__gerr || null }));
    await ctx.close();
  }
  await browser.close();

  if (ANY_POISON && !landed.length) { console.log('ABORT: poison never landed on the served part'); process.exit(1); }
  if (ANY_POISON) console.log(`   poison landed: ${[...new Set(landed)].join(', ')}`);

  /* ── ANTI-VACUITY. If the fixture never carried the flag, L1 is describing a page that could not
   *    have gated for a reason having nothing to do with this commit. */
  if (seen.withFlag.g.flagAtStart !== '1' || seen.withFlag.e || seen.noFlag.e) {
    console.log(`ABORT: fixture did not establish its state (flagAtStart=${seen.withFlag.g.flagAtStart}, ` +
      `err=${seen.withFlag.e || seen.noFlag.e}). NOT a pass, NOT a red: this gate could not run.`);
    server.close();
    process.exit(2);
  }

  ok('L1', 'with the scratch flag set, the seed gate NEVER runs (the fix)',
    seen.withFlag.g.gatedEver === false, `seed-gated seen with flag = ${seen.withFlag.g.gatedEver}`);

  ok('L2', 'with the flag ABSENT the seed gate STILL runs (scoped, not deleted)',
    seen.noFlag.g.gatedEver === true, `seed-gated seen without flag = ${seen.noFlag.g.gatedEver}`);

  /* L3 reads the SOURCE, deliberately: the runtime legs cannot distinguish "read early" from
   * "read late but got lucky", and the failure this guards is silent — no error, no red. */
  /* ⛔⛔ POISONED BYTES, NOT DISK BYTES — CAUGHT 2026-08-24 BY --latelatch FAILING TO REDDEN THIS
   * LEG. The first version read the file straight off disk, so it asserted about bytes THE BROWSER
   * NEVER SAW: the control ran, L1 went red, and L3 sat green through a source order it was the
   * only leg watching. An unpoisonable leg is an UNGUARDED leg wearing a control's clothes.
   *   🔑 A SOURCE-READING LEG MUST READ THE SAME BYTES THE RUNTIME LEGS RAN AGAINST, or the two
   *      halves of the gate are quietly testing two different programs. */
  const src = poison(PART, fs.readFileSync(path.join(ROOT, PART), 'utf8'));
  const iLatch = src.indexOf(LATCH.trim());
  const iInit = src.indexOf('    function init() {');
  const iConsumer = src.indexOf(CONSUMER);
  ok('L3', 'the flag is latched at PARSE — before init() and before the overlay consumes it',
    iLatch > -1 && iInit > -1 && iConsumer > -1 && iLatch < iInit && iLatch < iConsumer,
    `latch@${iLatch} init@${iInit} consumer@${iConsumer}`);

  const total = pass + fail;
  if (ANY_POISON) {
    const expected = LATELATCH ? ['L1', 'L3'] : ['L2'];
    const actualRed = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actualRed.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);

  server.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.message) || e));
  console.log('SCORE 0/3 RED');
  process.exit(1);
});
