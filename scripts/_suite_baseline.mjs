/* FULL-SUITE BASELINE RUNNER — the whole gate suite, one command, one number.
   Runs every runnable gate ONCE, CLEAN (no --mutation flags), and records exit code per gate.

   SELF-CHECK GUARD (the standard, same shape as a self-checking mutation): every real run FIRST
   proves the harness on four throwaway sentinel gates — pass / fail / throw / hang. If ANY sentinel
   misbehaves the runner ABORTS at exit 1 and prints NO score. A baseline you cannot trust must never
   be printable. Without this, a harness that silently counted a hang as GREEN would inflate the
   number and nobody would know. Red-first it with --sabotage=<pass|fail|throw|hang>.

   ⚠️ KNOWN WEAK CONTROL — `--sabotage=pass` is NOT an independent proof. Sabotaging the pass
   sentinel means making it exit 0, which it already did, so it cannot trip its own assertion
   ("exit 0 counted GREEN") — it aborts via the *stdout captured* check instead, because the
   sabotaged sentinel prints a different string. It still bites, but it proves a DIFFERENT control
   than its name suggests. Read the 4/4 as THREE independent proofs (fail / throw / hang) plus one
   that only demonstrates stdout capture. This is the "a control that can only fail for someone
   else's reason is not a control" shape from the 2026-07-26 gate-health sweep. Do not bank it.

   ~~*"CANONICAL BASELINE IS SERIAL. --concbrowser defaults to 1 because _gate_rename_persist is a
   known concurrency flake... Parallel mode is for SPEED ONLY and must never be the source of a
   recorded number."*~~ SUPERSEDED 2026-08-10, AND STRUCK RATHER THAN DELETED. That default was
   correct about the flake and wrong about the remedy: it made 96 well-behaved gates pay for one
   broken fixture, forever, on every run.

   THE DEFAULT IS NOW --concbrowser=3, AND IT WAS EARNED BY MEASUREMENT, NOT BY ARGUMENT:
     serial          GREEN 200 · RED 1 · TOTAL 201 · wall 1317.2s
     concbrowser=3   GREEN 202 · RED 0 · TOTAL 202 · wall  500.3s
     per-gate verdict diff: ZERO unexplained differences (the two deltas were the retired trust-wing
     exemption and one newly added gate). 2.6x faster; 816 seconds back per run.
   The flake is contained by DECLARATION, not by a global default: _gate_rename_persist declares
   `@gate-concurrency: solo` and runs first, alone. See SOLO_RE below.

   ⚠️ TWO THINGS THE MEASUREMENT DOES NOT PROVE, SO DO NOT CLAIM THEM.
   1. ONE agreeing run is not proof a race never fires — flake is probabilistic. THE RULE: if a gate
      reds unexpectedly under concurrency, RE-RUN THAT GATE ALONE before believing it. Costs nothing
      when green, and stops a phantom becoming an investigation.
   2. The SUM of per-gate seconds went UP 5.8% (1328.6 -> 1405.3): gates are individually slower
      under load and the entire win is overlap. Push concurrency high enough and the gates starve
      each other and the win reverses. 3 is measured; 6 is not.
   Say which concurrency produced any figure you report — that part always held.

   Population (see --explain): scripts/_gate_* + _p<digit>* filtered to .js/.mjs, minus helper
   modules. 66 of the browser gates need repo root served on 127.0.0.1:8001 — this starts it;
   _p8_studio_mechanics (8141) and _p8_profile_date_enforce (8142) self-host.

   Usage:
     node scripts/_suite_baseline.mjs                     full run (self-check, then score)
     node scripts/_suite_baseline.mjs --only=node         node gates only
     node scripts/_suite_baseline.mjs --only=browser      browser gates only
     node scripts/_suite_baseline.mjs --limit=N           first N gates (smoke the harness)
     node scripts/_suite_baseline.mjs --selftest          run ONLY the self-check, then exit
     node scripts/_suite_baseline.mjs --sabotage=hang     RED-FIRST: break a sentinel, expect exit 1
     node scripts/_suite_baseline.mjs --explain           print the population accounting, run nothing
*/
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPTS, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(k + '=')); return a ? a.split('=')[1] : d; };
const ONLY = arg('--only', 'all');
const LIMIT = parseInt(arg('--limit', '0'), 10);
const SELFTEST_ONLY = argv.includes('--selftest');
const EXPLAIN = argv.includes('--explain');
const SABOTAGE = arg('--sabotage', '');
const TIMEOUT_MS = parseInt(arg('--timeout', '180000'), 10);
const CONC_NODE = parseInt(arg('--concnode', '6'), 10);
/* 3 is MEASURED (see header): identical per-gate verdicts vs serial, 2.6x faster. Pass
   --concbrowser=1 to disambiguate a suspected concurrency flake, which is the one job serial keeps. */
const CONC_BROWSER = parseInt(arg('--concbrowser', '3'), 10);

/* Helper modules: they export, they do not run. Running one would exit 0 and be counted a false GREEN. */
/* ══ PORT DISCIPLINE — READ BEFORE YOU CLAIM A PORT ═══════════════════════════════════════════════
   There was NO discipline here until 2026-08-03: no registry, no range convention, nothing. 54
   self-hosting gates had picked ports ad hoc between 8074 and 8360, and it had already cost us twice.

   ⛔ 8001 IS THIS RUNNER'S SHARED SERVER. 66 browser gates depend on it and it is bound below.
      NEVER self-host on 8001. _gate_room_picker did, and died on EADDRINUSE in 0.3s inside every
      suite run for seven commits while being GREEN 42/0 when run alone. THE REPAIR CAUSED THE FAULT:
      the commit that made it self-hosting was fixing "it needs a hand-started server on :8001" and
      reached for the number that instruction put in front of it.

   ⚠️ FOUR MORE PAIRS WERE DOUBLE-BOOKED (8193, 8197, 8251, 8301) — harmless in the canonical serial
      run, latent the moment anyone uses --concbrowser>1 for speed. Reassigned 2026-08-03.

   🔑 THE RULE: CLAIM THE NEXT FREE PORT ABOVE THE CURRENT HIGH-WATER MARK, AND CHECK FIRST.
        node -e "const{execSync}=require('child_process');console.log(execSync(String.raw`grep -rhoE \"PORT *= *8[0-9]{3}\" scripts/_gate_* scripts/_p*`).toString().match(/8\d{3}/g).sort().pop())"
      or simply:  grep -rhoE "PORT *= *8[0-9]{3}" scripts/_gate_* scripts/_p* | grep -oE "8[0-9]{3}" | sort -n | uniq -d
      (the second prints DUPLICATES — it must print nothing).
      HIGH-WATER MARK AS OF 2026-08-03: 8360. Two self-hosting non-gate helpers also exist at 8141
      and 8142 (_p8_studio_mechanics, _p8_profile_date_enforce).
      This block is deliberately a CHECK YOU CAN RUN, not a hand-maintained list — a hand-maintained
      list of 54 entries rots, and a rotted registry is worse than none because it is believed.
   ═════════════════════════════════════════════════════════════════════════════════════════════════ */
const HELPERS = new Set(['_gate_extract.mjs']);

/* ---------------- population ---------------- */
/* ══ §13.69 · CLASSIFY BY BEHAVIOUR, NOT BY SPELLING ═══════════════════════════════════════════════
   THIS USED TO DECIDE A GATE'S POOL BY TEXT-MATCHING require('playwright'). THREE GATES RESOLVE THE
   MODULE BY ABSOLUTE PATH — require(ROOT + '/node_modules/playwright') — so the regex never saw them
   and they ran in the NODE pool while launching a real Chromium. Two of the three are load-bearing:
   _gate_estate_all_counted_is_drawn (the §19 purpose walk) and _gate_property_roundtrip.

   THE DAMAGE IS NOT "IT PASSED ANYWAY". Pools bind concurrency: node runs 6-wide, the browser pool is
   deliberately SERIAL because _gate_rename_persist flakes above 1. Browser gates in the node pool make
   the suite's parallelism assumptions quietly wrong, and the failure mode is TIMEOUTS AND FLAKE UNDER
   LOAD — a gate going RED for a reason that has nothing to do with the product. That is §13.68 RULE A
   in a different costume: a resource crash arriving dressed as a disagreement. It collected its first
   bill the same day it was written: _p5_title_render_parity went red in a full suite and never
   standalone, because a slower run let an async mirror write lose a race.

   🔑 A DECLARED POOL IS A SOURCE. A REGEX OVER SOURCE TEXT IS A GUESS THAT HAPPENS TO BE RIGHT MOST OF
   THE TIME — which is L47 wearing a different hat, and a runner that reads source text for MEANING
   will eventually read it wrong. It already did so TWICE in one day: this, and the '[QUARANTINED]'
   substring scan below.

   THE CONTRACT: a gate declares its own pool and status in a header marker.
       @gate-pool: browser        (or: node)
       @gate-status: quarantined  (optional; omit for a normal gate)
   Inference REMAINS as a fallback so nothing breaks on day one — but it WARNS, loudly and by name.
   An undeclared gate is not an error; an undeclared gate nobody is told about is. */
const POOL_RE   = /@gate-pool:\s*(browser|node)\b/;
const STATUS_RE = /@gate-status:\s*([a-z-]+)\b/;
/* ══ §13.87 · A KNOWN FLAKE LEFT IN PLACE STOPS BEING A BUG AND BECOMES A TAX ══════════════════════
   The browser pool ran SERIAL — 97 gates, 1315 seconds, 99% of every suite run — for ONE reason:
   _gate_rename_persist loses a fixture row above concurrency 1. So 96 well-behaved gates paid a
   ~15-minute tax per run to work around one unfixed fixture, and the tax was invisible because it
   arrived as "the suite takes 22 minutes" rather than as a bug report. It nearly cost us the whole
   instrument: the Captain was ready to abandon a 201-gate suite over it.

   A GATE DECLARES ITS OWN CONCURRENCY, exactly as it declares its pool. This is deliberately NOT a
   list of flaky gate names in the runner — that is the hand-maintained roster this file already
   carries once (HELPERS, length 1) and which we have banned everywhere else. Solo gates run first,
   alone; everything else runs at --concbrowser.

   ⛔ PINNING IS A WORKAROUND, NOT A FIX, AND IT MUST NOT BECOME PERMANENT AND UNEXAMINED — that is
   precisely how the serial default survived unquestioned. THE FIXTURE LOSS IS THE DEFECT: under
   parallel load _gate_rename_persist sees ["bp-new","bp-old"] and misses "bp-mid", which is a race
   in its own setup, not a property of concurrency. Whoever fixes that race DELETES the declaration
   below and this comment with it. */
const SOLO_RE   = /@gate-concurrency:\s*solo\b/;

function census() {
  const globbed = fs.readdirSync(SCRIPTS).filter((f) => /^(_gate_|_p\d)/.test(f));
  const executable = globbed.filter((f) => /\.(js|mjs)$/.test(f));
  const runnable = executable.filter((f) => !HELPERS.has(f));
  const undeclared = [], mismatched = [];
  const gates = runnable.sort().map((f) => {
    const src = fs.readFileSync(path.join(SCRIPTS, f), 'utf8');
    /* Inference kept BROAD on purpose: any require/import of playwright or puppeteer, however the
       specifier is spelled — bare, path-resolved, or concatenated. The old form only caught bare. */
    const inferred = /(?:require\(|from\s+)[^)\n;]*['"`][^'"`\n]*(?:playwright|puppeteer)['"`]/.test(src)
                  || /require\([^)]*(?:playwright|puppeteer)[^)]*\)/.test(src);
    const declared = (src.match(POOL_RE) || [])[1] || null;
    const status = (src.match(STATUS_RE) || [])[1] || null;
    const solo = SOLO_RE.test(src);
    if (!declared) undeclared.push(f);
    else if ((declared === 'browser') !== inferred) mismatched.push(`${f} declares ${declared}, source looks ${inferred ? 'browser' : 'node'}`);
    return { name: f, file: path.join(SCRIPTS, f), browser: declared ? declared === 'browser' : inferred, declared, status, solo };
  });
  return { globbed, executable, runnable, gates, undeclared, mismatched };
}

function explain() {
  const c = census();
  const nonExec = c.globbed.filter((f) => !/\.(js|mjs)$/.test(f));
  console.log('===== POPULATION ACCOUNTING =====');
  console.log(`glob  _gate_* + _p<digit>*            ${c.globbed.length}`);
  console.log(`  minus non-executable (.txt/.json)  -${nonExec.length}   ${nonExec.length ? '(saved output + fixtures)' : ''}`);
  console.log(`  = executable                       ${c.executable.length}`);
  console.log(`  minus helper modules               -${c.executable.length - c.runnable.length}   (${[...HELPERS].join(', ')})`);
  console.log(`  = RUNNABLE                         ${c.runnable.length}`);
  console.log(`      browser-driven                 ${c.gates.filter((g) => g.browser).length}`);
  console.log(`      node-only                      ${c.gates.filter((g) => !g.browser).length}`);
  console.log(`      declared '@gate-pool:'         ${c.gates.filter((g) => g.declared).length}`);
  console.log(`      classified by inference        ${c.undeclared.length}   (a guess, not a source)`);
  if (c.mismatched.length) { console.log('\n⚠️  POOL MISMATCH:'); c.mismatched.forEach((m) => console.log('     ' + m)); }
  /* ⚠️ THIS FOOTER USED TO READ: "browser = imports playwright/puppeteer AND launches it; the two
     definitions coincide." THEY DO NOT COINCIDE, and that sentence is exactly why nobody looked —
     a comment asserting an invariant that the code beside it did not enforce. Three gates resolved
     playwright by absolute path, launched a real browser, and were filed as node. Corrected rather
     than deleted, because the false claim is the whole lesson (§13.69). */
  console.log('\nbrowser = what the gate DECLARES via @gate-pool:, else a broadened sniff for any');
  console.log('playwright/puppeteer require however the specifier is spelled — bare OR path-resolved.');
  console.log('The sniff is a FALLBACK and it warns; a declaration is a source, inference is a guess.');
}

/* ---------------- static server ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };

function startServer(port) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const full = path.join(REPO, path.normalize(p).replace(/^[\\/]+/, ''));
    if (!full.startsWith(path.normalize(REPO))) { res.writeHead(403).end(); return; }
    fs.readFile(full, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

/* Best-effort "who is on this port", for the abort message only. NEVER throws and never blocks the
   abort: an identification step that can itself fail must degrade to saying nothing, or the guard
   becomes the new outage. Returns a printable string, or '' when it cannot tell. */
function whoHolds(port) {
  try {
    const run = (c) => execSync(c, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).toString().trim();
    if (process.platform === 'win32') {
      const pid = run(`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"`);
      if (!pid) return '';
      let name = '';
      try { name = run(`powershell -NoProfile -Command "(Get-Process -Id ${pid}).ProcessName"`); } catch { /* name is a nicety */ }
      return `PID ${pid}${name ? ' (' + name + ')' : ''}`;
    }
    const pid = run(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`).split('\n')[0];
    if (!pid) return '';
    let name = '';
    try { name = run(`ps -p ${pid} -o comm=`); } catch { /* name is a nicety */ }
    return `PID ${pid}${name ? ' (' + name + ')' : ''}`;
  } catch { return ''; }
}

/* ---------------- run one gate ---------------- */
function runOne(file, name, timeoutMs = TIMEOUT_MS, declaredStatus = null) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [file], { cwd: REPO, env: process.env });
    let out = '', err = '', done = false;
    const cap = (s) => (s.length > 40000 ? s.slice(-40000) : s);
    child.stdout.on('data', (d) => { out = cap(out + d); });
    child.stderr.on('data', (d) => { err = cap(err + d); });
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { child.kill('SIGKILL'); } catch {}
      resolve({ name, status: 'TIMEOUT', code: null, ms: Date.now() - t0, out, err });
    }, timeoutMs);
    child.on('error', (e) => {
      if (done) return; done = true; clearTimeout(timer);
      resolve({ name, status: 'SPAWN_ERROR', code: null, ms: Date.now() - t0, out, err: String(e) });
    });
    child.on('close', (code) => {
      if (done) return; done = true; clearTimeout(timer);
      /* QUARANTINED IS A THIRD CLASS, NOT A SHADE OF GREEN OR RED. Marking a gate quarantined in its
       * own file did NOTHING to this runner until this line existed — classification was purely on
       * exit code, so the two gates quarantined on 2026-07-28 went on inflating the RED count for
       * five weeks. That is the permanently-red-gate problem the quarantine was meant to solve.
       * IT IS DELIBERATELY NOT `exit 0`. Making a quarantined gate exit 0 would count it GREEN — the
       * exact false-pass shape already found in _gate_d1_sketch_parity.mjs's bare process.exit(0).
       * A gate whose verdict is not trusted must be counted as neither, and SEEN to be neither. */
      /* §13.69 — A DECLARATION OUTRANKS A GREP. `@gate-status: quarantined` in the gate's header is
       * the SOURCE; the stdout substring scan is the legacy fallback and is now the second-choice
       * signal, not the only one. Reading source text for MEANING is what mis-sorted three gates
       * into the wrong pool, and this scan is the same shape one layer over: it also meant a gate
       * could re-quarantine ITSELF by merely PRINTING the token — which nearly undid the
       * _gate_d1_boot_capture and _p6 leg-splits, where per-leg hold notes had to be spelled HELD
       * to avoid tripping it. A file should say what it IS, not have its status inferred from what
       * it happens to emit. */
      const quarantined = declaredStatus === 'quarantined' || out.indexOf('[QUARANTINED]') >= 0;
      resolve({ name, status: quarantined ? 'QUARANTINED' : (code === 0 ? 'GREEN' : 'RED'), code, ms: Date.now() - t0, out, err });
    });
  });
}

/* ---------------- THE SELF-CHECK GUARD ---------------- */
/* Sentinels are written to the OS temp dir, never the repo — this runner does not dirty the tree. */
async function selfCheck() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'datum-suite-selfcheck-'));
  const S = {
    pass: "console.log('sentinel: passing'); process.exit(0);\n",
    fail: "console.log('sentinel: failing'); process.exit(1);\n",
    throw: "console.log('sentinel: throwing'); throw new Error('boom');\n",
    hang: "console.log('sentinel: hanging'); setInterval(()=>{},1000);\n",
    /* TWO quarantine sentinels, not one, and the second is the load-bearing one. A single
     * exit-1 sentinel would pass even if QUARANTINED were implemented as "suppress the red" —
     * the exit-0 case is what proves it is a THIRD CLASS and not a way to hide a failure or
     * to manufacture a pass. Both must land on QUARANTINED regardless of exit code. */
    quarRed: "console.log('[QUARANTINED] sentinel'); process.exit(1);\n",
    quarGreen: "console.log('[QUARANTINED] sentinel'); process.exit(0);\n",
  };
  /* --sabotage=<k> deliberately breaks ONE sentinel so it behaves like the others. The guard must
     catch it and abort. This is the red-first: it proves the guard can still fail. */
  if (SABOTAGE) {
    if (!(SABOTAGE in S)) { console.error(`--sabotage=${SABOTAGE} is not a sentinel (pass|fail|throw|hang)`); process.exit(1); }
    S[SABOTAGE] = "console.log('sentinel: SABOTAGED -> exits 0'); process.exit(0);\n";
    console.log(`⚠️  --sabotage=${SABOTAGE} — the '${SABOTAGE}' sentinel now exits 0. The guard MUST abort.`);
  }
  const files = {};
  for (const k of Object.keys(S)) { files[k] = path.join(dir, `_sentinel_${k}.js`); fs.writeFileSync(files[k], S[k]); }

  const r = {};
  r.pass = await runOne(files.pass, 'sentinel_pass');
  r.fail = await runOne(files.fail, 'sentinel_fail');
  r.throw = await runOne(files.throw, 'sentinel_throw');
  r.hang = await runOne(files.hang, 'sentinel_hang', 4000);
  r.quarRed = await runOne(files.quarRed, 'sentinel_quar_red');
  r.quarGreen = await runOne(files.quarGreen, 'sentinel_quar_green');
  fs.rmSync(dir, { recursive: true, force: true });

  const checks = [
    ['exit 0 counted GREEN', r.pass.status === 'GREEN', r.pass.status],
    ['exit 1 counted RED', r.fail.status === 'RED', r.fail.status],
    ['uncaught throw counted RED', r.throw.status === 'RED', r.throw.status],
    ['stdout captured (harness not dark)', /sentinel: passing/.test(r.pass.out), /sentinel: passing/.test(r.pass.out) ? 'captured' : 'LOST'],
    ['stderr captured on throw', /boom/.test(r.throw.err), /boom/.test(r.throw.err) ? 'captured' : 'LOST'],
    ['a HANG is TIMEOUT, never GREEN', r.hang.status === 'TIMEOUT', r.hang.status],
    ['[QUARANTINED] + exit 1 is QUARANTINED, not RED', r.quarRed.status === 'QUARANTINED', r.quarRed.status],
    ['[QUARANTINED] + exit 0 is QUARANTINED, not GREEN', r.quarGreen.status === 'QUARANTINED', r.quarGreen.status],
  ];
  console.log('----- self-check (harness proves itself before it reports) -----');
  let all = true;
  for (const [n, ok, obs] of checks) { console.log(`  ${n.padEnd(38)} ${ok ? 'ok ' : 'RED'}   observed: ${obs}`); if (!ok) all = false; }

  if (!all) {
    console.error('\n❌ SELF-CHECK FAILED — the harness cannot prove it distinguishes pass from fail.');
    console.error('   NO baseline number is printed. A score from an unproven harness is not evidence.');
    process.exit(1);
  }
  console.log('  ✅ harness proven — proceeding to the suite.\n');
}

/* ---------------- pool ---------------- */
async function runPool(list, conc, label) {
  const results = [];
  let i = 0, active = 0, finished = 0;
  return new Promise((resolve) => {
    const pump = () => {
      while (active < conc && i < list.length) {
        const g = list[i++];
        active++;
        runOne(g.file, g.name, TIMEOUT_MS, g.status).then((r) => {
          results.push({ ...r, browser: g.browser });
          active--; finished++;
          const tag = r.status === 'GREEN' ? '  ok' : (r.status === 'RED' ? ' RED' : ' ' + r.status);
          console.log(`[${label} ${String(finished).padStart(3)}/${list.length}] ${tag}  ${r.name}  (${(r.ms / 1000).toFixed(1)}s${r.code === null ? '' : ', exit ' + r.code})`);
          if (finished === list.length) resolve(results); else pump();
        });
      }
    };
    if (list.length === 0) resolve([]); else pump();
  });
}

/* ---------------- main ---------------- */
(async () => {
  if (EXPLAIN) return explain();

  console.log('===== FULL-SUITE BASELINE =====');
  await selfCheck();
  if (SELFTEST_ONLY) { console.log('--selftest: harness proven, suite not run.'); return; }

  let all = census().gates;
  if (ONLY === 'node') all = all.filter((g) => !g.browser);
  if (ONLY === 'browser') all = all.filter((g) => g.browser);
  if (LIMIT > 0) all = all.slice(0, LIMIT);
  const nodeGates = all.filter((g) => !g.browser);
  const browserGates = all.filter((g) => g.browser);

  console.log(`population: ${all.length} runnable gates  (${nodeGates.length} node, ${browserGates.length} browser)`);
  /* §13.69 — INFERENCE IS ALLOWED, SILENCE IS NOT. Undeclared gates still run, classified by the
     broadened sniff, but they are NAMED so the list shrinks instead of quietly persisting. A
     MISMATCH is louder than an omission: it means a gate says one thing and reads as another, which
     is the only case where the declaration could actively mislead. */
  const _c = census();
  if (_c.mismatched.length) {
    console.log(`⚠️  POOL MISMATCH (${_c.mismatched.length}) — a gate declares one pool and its source reads as the other:`);
    _c.mismatched.forEach((m) => console.log('     ' + m));
  }
  if (_c.undeclared.length) {
    console.log(`⚠️  ${_c.undeclared.length} gate(s) do NOT declare '@gate-pool:' — classified by inference, which is a guess:`);
    console.log('     ' + _c.undeclared.slice(0, 6).join(', ') + (_c.undeclared.length > 6 ? `, +${_c.undeclared.length - 6} more` : ''));
  } else {
    console.log('✅ every gate declares its pool — no inference used.');
  }
  console.log(`timeout/gate: ${TIMEOUT_MS / 1000}s   conc: node=${CONC_NODE} browser=${CONC_BROWSER}`);
  console.log('mode: CLEAN (no mutation flags) — measurement only, nothing is repaired');
  console.log(CONC_BROWSER === 1
    ? 'concurrency: SERIAL — the disambiguation configuration. Use this to confirm a suspected concurrency flake.'
    : `concurrency: PARALLEL (${CONC_BROWSER}) — the default. Verdict-identical to serial as of 2026-08-10; solo-pinned gates run alone first.`);

  let server = null;
  if (browserGates.length) {
    /* ⛔ BIND-OR-ABORT — A PRECONDITION THAT PRINTS A WARNING AND CONTINUES IS NOT A PRECONDITION,
       IT IS A COMMENT. This used to catch the bind failure, log "(browser gates will red)", and then
       run all 92 browser gates ANYWAY against whatever was already answering on 8001.

       Measured 2026-08-05: a node process nobody in the session started had held this port since
       2026-08-03 19:55. It happened to serve the same repo root from disk, so 90 of 92 browser gates
       went GREEN and the prediction above was FALSIFIED — the tell nobody was reading. The recorded
       baselines were right BY LUCK. A squatter pointed at a stale checkout, a dist/, or another
       worktree produces the same confident 190 GREEN, and this file's own header (lines 4-8) already
       says why that must never print: A BASELINE YOU CANNOT TRUST MUST NEVER BE PRINTABLE. The law was
       simply never extended past the four sentinels to the precondition underneath them.

       🔑 WHEN A FAILURE PREDICTS A CONSEQUENCE AND THE CONSEQUENCE DOES NOT ARRIVE, THAT IS THE TELL:
       either the precondition never mattered, or something silently substituted for it. Find out which.

       ⚠️ AND THE SAME PORT HAS BITTEN IN MIRROR — see the port-discipline block above: _gate_room_picker
       self-hosted on 8001 and died EADDRINUSE inside every suite run for SEVEN COMMITS while scoring
       42/0 alone. That block was written for the gate side and never turned around on the runner.
       A LAW APPLIED IN ONE DIRECTION IS HALF A LAW.

       The remedy is deliberately the operator's, not ours: identify what holds the port and stop it.
       We do NOT kill the process — an unidentified long-lived process is not ours to reap, and a
       runner that reaches for pkill is a worse instrument than one that stops and says why. */
    try { server = await startServer(8001); console.log('static server: 127.0.0.1:8001 -> repo root  UP'); }
    catch (e) {
      console.log('\n⛔ ABORT — static server could not bind 127.0.0.1:8001: ' + e.message);
      console.log('   ' + browserGates.length + ' browser gates need this port and something else is already holding it.');
      const held = whoHolds(8001);
      if (held) console.log('   HOLDER: ' + held);
      /* §13.57 — NAME THE LIKELIEST CAUSE, NOT THE SCARIEST ONE. Measured 2026-08-05: the process that
         held this port for two days was the Captain's OWN forgotten local preview server, serving the
         same repo root. That is the MOST FLATTERING version of this failure and precisely why it ran
         undetected for weeks — it produced correct results. A developer's forgotten dev server is not
         an exotic edge case, it is THE common one, and a remedy line that implies mystery or malice
         will not be read. Lead with the boring explanation that is usually true. */
      console.log('   This is almost always a preview/dev server you left open on this machine.');
      console.log('   It may even be serving this same repo — that is exactly why this is dangerous:');
      console.log('   it would produce a CONFIDENT, PLAUSIBLE score that nobody could verify. A server');
      console.log('   this runner did not start has an UNKNOWN document root, so NO SCORE IS PRINTED.');
      console.log('   Close it (or stop the PID above) and re-run. To find it yourself:');
      console.log('     Windows  ->  Get-NetTCPConnection -LocalPort 8001 -State Listen');
      console.log('     POSIX    ->  lsof -nP -iTCP:8001 -sTCP:LISTEN');
      console.log('   To score the node-only half meanwhile: node scripts/_suite_baseline.mjs --only=node\n');
      process.exit(1);
    }
  }

  const t0 = Date.now();
  /* SOLO FIRST, ALONE, THEN THE REST. Solo gates go first so a flake cannot be blamed on load that
     had already started, and so the run fails fast on the known-fragile one. At --concbrowser=1 this
     split is a no-op by construction: both sub-pools run at 1 and the order is the same, which is
     what makes the serial baseline still comparable. */
  const browserSolo = browserGates.filter((g) => g.solo);
  const browserRest = browserGates.filter((g) => !g.solo);
  if (browserSolo.length && CONC_BROWSER > 1) {
    console.log(`solo-pinned (run alone, before the parallel pool): ${browserSolo.map((g) => g.name).join(', ')}`);
  }
  const results = [
    ...(await runPool(nodeGates, CONC_NODE, 'node')),
    ...(await runPool(browserSolo, 1, 'browser-solo')),
    ...(await runPool(browserRest, CONC_BROWSER, 'browser')),
  ];
  if (server) server.close();

  const by = (s) => results.filter((r) => r.status === s);
  const green = by('GREEN'), red = by('RED'), to = by('TIMEOUT'), se = by('SPAWN_ERROR');
  const quar = by('QUARANTINED');

  console.log('\n===== BASELINE RESULT =====');
  console.log(`GREEN   ${green.length}`);
  console.log(`RED     ${red.length}`);
  // PRINTED EVEN AT ZERO, unlike the buckets below. A quarantine that stops being visible is a
  // quarantine nobody reviews, and these are gates somebody decided not to trust — the count
  // should be uncomfortable to look at, not something the report can quietly drop.
  console.log(`QUARANT ${quar.length}   (verdict not trusted — counted as NEITHER green nor red)`);
  console.log(`TIMEOUT ${to.length}`);
  console.log(`SPAWN   ${se.length}`);
  console.log(`TOTAL   ${results.length}   wall ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const line = (r) => `  ${r.status.padEnd(8)} ${r.name}  (exit ${r.code}, ${(r.ms / 1000).toFixed(1)}s)`;
  for (const [t, set] of [['RED', red], ['TIMEOUT', to], ['SPAWN_ERROR', se], ['QUARANTINED', quar]]) {
    if (set.length) { console.log(`\n--- ${t} ---`); set.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((r) => console.log(line(r))); }
  }

  const outPath = path.join(os.tmpdir(), 'datum-baseline-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results.map((r) => ({
    name: r.name, browser: r.browser, status: r.status, code: r.code, ms: r.ms,
    tail: (r.out || '').split('\n').slice(-25).join('\n'), err: (r.err || '').slice(-2000),
  })), null, 1));
  console.log(`\nfull results -> ${outPath}`);

  /* Repeatability check. 16 gates write scripts/*.out.txt receipts into the tree by design, so a
     suite run can leave the working tree dirty. This REPORTS that; it does not clean it. */
  try {
    /* §13.18 FIX (593d) — THIS READ THE UNTRACKED LIST AND CALLED IT THE MODIFIED LIST. `--porcelain=v1`
       emits `??` rows for untracked files, and every one was counted as "tracked file(s) modified".
       This repo permanently carries FOUR untracked reference files, so the warning fired on EVERY run,
       naming files no gate had written — a repeatability alarm that was always on, which is the same
       as no alarm. Partitioned now: `??` is untracked and is NOT a repeatability signal. */
    const rows = execSync('git status --porcelain=v1', { cwd: REPO }).toString().trim();
    const lines = rows ? rows.split('\n') : [];
    const modified = lines.filter((l) => !l.startsWith('??'));
    const untracked = lines.filter((l) => l.startsWith('??'));
    if (modified.length) {
      console.log(`\n⚠️  REPEATABILITY: this run left ${modified.length} tracked file(s) modified (gate-written receipts).`);
      console.log('   The suite is not side-effect-free — a clean-tree run does not finish clean-tree.');
      modified.slice(0, 20).forEach((l) => console.log('   ' + l));
    } else {
      console.log('\n✅ REPEATABILITY: no tracked file was modified by this run.');
    }
    /* Reported, never counted. §13.18 stays DEGRADED-NOT-DEAD on purpose: it caught a missing file
       while parked, so the untracked list is still printed — just no longer mistaken for the alarm. */
    if (untracked.length) console.log(`   (${untracked.length} untracked file(s) present, not written by this run — not a repeatability signal)`);
  } catch { /* not a git checkout — skip */ }

  process.exit(red.length + to.length + se.length === 0 ? 0 : 1);
})();
