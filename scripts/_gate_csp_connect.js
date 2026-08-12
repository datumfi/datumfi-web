/* @gate-pool: node
 *
   CSP connect-src GATE — proves the Worker origin is on the studio.html CSP allow-list in the
   SERVED bytes (DoD part 3). Without it the browser refuses fetch() to the RentCast Worker
   PRE-flight -> graceful catch -> silent blank at studio.html:8295 (the #253 live bug).

   NEGATIVE-CONTROL DISCIPLINE: the Worker domain ALSO appears in the WORKER_URL constant
   (~line 8265), so a doc-wide grep would go GREEN for the wrong reason. This gate scopes the
   assertion to the connect-src DIRECTIVE ONLY — the exact thing the browser enforces.

   RED-FIRST: run against the CURRENT (pre-fix) bytes -> genuine RED (Worker absent from
   connect-src). Apply the one-line fix -> GREEN. `--redfirst` additionally strips the Worker
   from the directive in-memory to prove the assertion BITES even on correct bytes.
   Usage: node scripts/_gate_csp_connect.js [LABEL] [--redfirst]

   ══ 2026-08-11 · THIS GATE READS THE FILE. IT USED TO FETCH http://127.0.0.1:8001/studio.html ══
   ⛔ IT HAD BEEN CRASHING, NOT FAILING, FOR AS LONG AS ANYONE HAD RUN THE NODE TIER — ECONNREFUSED
   is an uncaught throw, which the suite scores RED. A CRASH IS NOT A RED, and a permanently-red
   alarm is where a real red hides: this session a genuine third red appeared and was only spotted
   because the baseline was known to be exactly two. That is far too thin a margin.
   🔑 AND THE HOP PROVED NOTHING IT COST. The documented setup was "serve REPO ROOT on :8001", so the
   bytes fetched were byte-identical to the bytes on disk — an HTTP round trip to read a local file,
   dressed as "SERVED bytes" verification. Real publish proof for an HTML host is marker-grep against
   datumfi.com and never a local port (CF rewrites HTML per request; see CLAUDE.md).
   ⭐ A PRECONDITION NOBODY CAN SATISFY IS NOT A PRECONDITION, IT IS AN OFF SWITCH. */
const fs = require('fs');
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
const WORKER = 'https://rentcast-avm.dmerced1.workers.dev';
const SRC = path.resolve(__dirname, '..', 'studio.html');

(async () => {
  if (!fs.existsSync(SRC)) { console.log('[csp_connect] ABORT — studio.html not found at ' + SRC); process.exit(2); }
  const html = fs.readFileSync(SRC, 'utf8');
  const lines = [];
  let pass = 0, fail = 0;
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }

  // 1) locate the CSP meta + its connect-src directive in the SERVED bytes.
  // content="..." is double-quoted and CONTAINS single quotes ('self'), so exclude only " here.
  const cspMatch = html.match(/http-equiv=["']Content-Security-Policy["']\s+content="([^"]*)"/i);
  ok(!!cspMatch, 'CSP <meta> present in served studio.html');
  const csp = cspMatch ? cspMatch[1] : '';
  const csMatch = csp.match(/connect-src\s+([^;]*)/i);
  ok(!!csMatch, 'connect-src directive present in the CSP');
  let connectSrc = csMatch ? csMatch[1] : '';

  // --redfirst: strip the Worker from the directive in-memory to prove the assertion BITES.
  if (RF) connectSrc = connectSrc.replace(new RegExp('\\s*' + WORKER.replace(/[.]/g, '\\.'), 'g'), '');

  // 2) THE winner assertion — the Worker origin must be inside connect-src (not just anywhere).
  const inDirective = connectSrc.indexOf(WORKER) >= 0;
  ok(inDirective, 'connect-src ALLOWS ' + WORKER + ' (browser can fetch the AVM) [BITE]');

  // 3) negative control — confirm the domain is NOT being counted from the WORKER_URL constant:
  //    the doc contains the domain (constant) but that must not by itself satisfy the gate.
  const inDoc = html.indexOf(WORKER) >= 0;
  ok(inDoc, 'sanity: Worker domain present somewhere in the doc (the WORKER_URL constant)');

  lines.push('---');
  lines.push('connect-src (served): ' + connectSrc.trim());
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (Worker stripped from directive — MUST be RED)' : 'NORMAL'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');

  const summary = '[' + LABEL + '] CSP connect-src GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_csp_connect.out.txt', summary, 'utf8');
  console.log(summary);
  process.exit(fail === 0 ? 0 : 1);
})();
