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

   CANONICAL BASELINE IS SERIAL. --concbrowser defaults to 1 because _gate_rename_persist is a
   known concurrency flake: GREEN 50/0 run alone 3/3, but under --concbrowser=3 it loses a fixture
   row (sees ["bp-new","bp-old"], missing "bp-mid") and reds 2 ordering assertions. Parallel mode is
   for SPEED ONLY and must never be the source of a recorded number. Say which concurrency produced
   any figure you report.

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
import { spawn } from 'node:child_process';
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
const CONC_BROWSER = parseInt(arg('--concbrowser', '1'), 10);   // 1 = canonical. >1 is speed only.

/* Helper modules: they export, they do not run. Running one would exit 0 and be counted a false GREEN. */
const HELPERS = new Set(['_gate_extract.mjs']);

/* ---------------- population ---------------- */
function census() {
  const globbed = fs.readdirSync(SCRIPTS).filter((f) => /^(_gate_|_p\d)/.test(f));
  const executable = globbed.filter((f) => /\.(js|mjs)$/.test(f));
  const runnable = executable.filter((f) => !HELPERS.has(f));
  const gates = runnable.sort().map((f) => {
    const src = fs.readFileSync(path.join(SCRIPTS, f), 'utf8');
    const browser = /require\(['"](playwright|puppeteer)['"]\)|from ['"](playwright|puppeteer)['"]/.test(src);
    return { name: f, file: path.join(SCRIPTS, f), browser };
  });
  return { globbed, executable, runnable, gates };
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
  console.log('\nbrowser = imports playwright/puppeteer AND launches it; the two definitions coincide.');
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

/* ---------------- run one gate ---------------- */
function runOne(file, name, timeoutMs = TIMEOUT_MS) {
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
      const quarantined = out.indexOf('[QUARANTINED]') >= 0;
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
        runOne(g.file, g.name).then((r) => {
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
  console.log(`timeout/gate: ${TIMEOUT_MS / 1000}s   conc: node=${CONC_NODE} browser=${CONC_BROWSER}`);
  console.log('mode: CLEAN (no mutation flags) — measurement only, nothing is repaired');
  console.log(CONC_BROWSER === 1
    ? 'concurrency: SERIAL — this is the canonical baseline configuration.'
    : `concurrency: PARALLEL (${CONC_BROWSER}) — SPEED ONLY. Not a recordable baseline: _gate_rename_persist flakes above 1.`);

  let server = null;
  if (browserGates.length) {
    try { server = await startServer(8001); console.log('static server: 127.0.0.1:8001 -> repo root  UP'); }
    catch (e) { console.log('static server: FAILED to bind 8001 — ' + e.message + '  (browser gates will red)'); }
  }

  const t0 = Date.now();
  const results = [...(await runPool(nodeGates, CONC_NODE, 'node')), ...(await runPool(browserGates, CONC_BROWSER, 'browser'))];
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
    const { execSync } = await import('node:child_process');
    const dirty = execSync('git status --porcelain=v1', { cwd: REPO }).toString().trim();
    if (dirty) {
      const n = dirty.split('\n').length;
      console.log(`\n⚠️  REPEATABILITY: this run left ${n} tracked file(s) modified (gate-written receipts).`);
      console.log('   The suite is not side-effect-free — a clean-tree run does not finish clean-tree.');
      dirty.split('\n').slice(0, 20).forEach((l) => console.log('   ' + l));
    } else {
      console.log('\n✅ REPEATABILITY: working tree clean after the run.');
    }
  } catch { /* not a git checkout — skip */ }

  process.exit(red.length + to.length + se.length === 0 ? 0 : 1);
})();
