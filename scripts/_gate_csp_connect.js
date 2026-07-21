/* CSP connect-src GATE — proves the Worker origin is on the studio.html CSP allow-list in the
   SERVED bytes (DoD part 3). Without it the browser refuses fetch() to the RentCast Worker
   PRE-flight -> graceful catch -> silent blank at studio.html:8295 (the #253 live bug).

   NEGATIVE-CONTROL DISCIPLINE: the Worker domain ALSO appears in the WORKER_URL constant
   (~line 8265), so a doc-wide grep would go GREEN for the wrong reason. This gate scopes the
   assertion to the connect-src DIRECTIVE ONLY — the exact thing the browser enforces.

   RED-FIRST: run against the CURRENT (pre-fix) served bytes -> genuine RED (Worker absent from
   connect-src). Apply the one-line fix -> GREEN. `--redfirst` additionally strips the Worker
   from the fetched directive in-memory to prove the assertion BITES even on correct bytes.
   Usage: serve repo root on :8001, then  node scripts/_gate_csp_connect.js [LABEL] [--redfirst]. */
const fs = require('fs');
const http = require('http');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
const WORKER = 'https://rentcast-avm.dmerced1.workers.dev';
const URL = 'http://127.0.0.1:8001/studio.html';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

(async () => {
  const html = await get(URL);
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
  fs.writeFileSync('scripts/_gate_csp_connect.out.txt', summary, 'utf8');
  console.log(summary);
  process.exit(fail === 0 ? 0 : 1);
})();
