/* @gate-pool: node
 *
   #262 WAVE 2 CSS GATE — proves the app-wide typography + modal-width + white-hover + premium-toggle
   changes are in the SERVED CSS (studio.html). Visual regressions are the Captain's smoke; this locks
   the load-bearing CSS values so a future edit can't silently revert them.
   RED-FIRST: `--redfirst` checks the PRE-change values instead -> ABSENT -> RED. Normal -> GREEN.
   Usage: node scripts/_gate_wave2_css.js [LABEL] [--redfirst]

   ══ 2026-08-11 · READS THE FILE; USED TO FETCH http://127.0.0.1:8001/studio.html ══════════════
   ⛔ It had been CRASHING (ECONNREFUSED, uncaught -> scored RED), not failing, for as long as the
   node tier had been run. A CRASH IS NOT A RED. The documented setup was "serve REPO ROOT on
   :8001", so the fetch returned bytes identical to the file — an HTTP round trip to read a local
   file. See the twin note in _gate_csp_connect.js. */
const fs = require('fs');
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
const SRC = path.resolve(__dirname, '..', 'studio.html');

(async () => {
  if (!fs.existsSync(SRC)) { console.log('[wave2_css] ABORT — studio.html not found at ' + SRC); process.exit(2); }
  const html = fs.readFileSync(SRC, 'utf8');
  const lines = []; let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };
  const has = (s) => html.indexOf(s) >= 0;
  // winner = post-change value; loser (--redfirst) = the pre-change value that must be GONE.
  const w = (winner, loser, m) => ok(RF ? has(loser) : has(winner), m);

  // #263 item 1 — ~15% bigger: base font on the modal card + shared field/label classes
  w('pointer-events: auto; font-size: 15px;', 'pointer-events: auto; font-size: 13px;', '§1/W3 .modal-card base font-size:15px (was 13) [BITE]');
  ok(has('.input-label { font-family: var(--font-mono); font-size: 12.5px;'), '§1/W3 .input-label 12.5px (was 11)');
  ok(has('font-family: var(--font-mono); font-size: 15px; border-radius: 4px;'), '§1/W3 .small-field 15px (was 13)');
  // #263 item 1 — wider, responsive modal (~15%)
  w('.modal-card { width: min(710px, 96vw);', '.modal-card { width: min(620px, 94vw);', '§1/W3 .modal-card width min(710px,96vw) (was 620) [BITE]');
  ok(!has('.style.width = "550px"') && !has('.style.width = "min(620px'), '§1/W3 inline 550px + 620px widths retired -> 710px');
  // #263 item 1 — hover typography bigger (still white)
  w('font-size: 14px; color: rgba(255,255,255,0.94);', 'font-size: 12.5px; color: rgba(255,255,255,0.92);', '§1/W3 .modal-tt 14px white (was 12.5) [BITE]');
  // #263 item 5 — premium pass #2: toggle + modal-card texture
  ok(has('input:checked + .slider { background: linear-gradient(180deg, var(--teal), var(--teal-mid));'), '§5 premium toggle (checked gradient + glow)');
  ok(has('.switch { position: relative; display: inline-block; width: 42px; height: 22px;'), '§5/W3 premium toggle scaled (42x22)');
  ok(has('inset 0 1px 0 rgba(255,255,255,0.07); pointer-events: auto'), '§5/W3 modal-card premium texture (inset highlight + deeper shadow)');

  lines.push('---');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  lines.push('MODE: ' + (RF ? 'RED-FIRST (pre-change values — MUST be RED)' : 'NORMAL'));
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const summary = '[' + LABEL + '] WAVE-2 CSS GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_wave2_css.out.txt', summary, 'utf8');
  console.log(summary);
  process.exit(fail === 0 ? 0 : 1);
})();
