const fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const F = 'studio.html';
const orig = fs.readFileSync(F);
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const ORIG = md5(orig);

const MUTANTS = [
  {
    name: 'M47 THE TARGET-SPEND REFUSAL IS DELETED: the door stops asking',
    from: `        if (!_datumAnswered()) {`,
    to:   `        if (false) {`,
    expect: [], wantGreen: true,
    note: '⛔ NOT PROVEN ON THE FIRST ATTEMPT, AND THE CORRECTION IS THE FINDING. I predicted the '
        + 'ratchet would bite — datum_spend back on the unaccounted list, 4 > 3, L2 red. It did not. '
        + 'With the refusal gone the walk is never asked for a spend, so nothing is answered, so the '
        + 'key is OMITTED FROM THE PAYLOAD ENTIRELY rather than defaulted. Unaccounted stayed 3. '
        + '🔑 THIS GATE AUDITS WHAT IS SENT. IT HAS NO LEG FOR WHAT SHOULD HAVE BEEN SENT AND WAS '
        + 'NOT. Deleting a refusal now fails SILENTLY in the other direction: no wrong number on '
        + 'the wire, and no number at all, with the engine left to decide what absence means. '
        + 'Closing it is exactly the engine-side PRESENCE SWEEP already on the order — a required '
        + 'field missing is a 422 or a server-side default, and only the engine can say which.'
  },
  {
    name: 'M48 THE PLAN-THROUGH REFUSAL IS DELETED',
    from: `        if (!_planThroughAnswered()) {`,
    to:   `        if (false) {`,
    expect: ['L2'], wantGreen: false
  },
  {
    name: 'M49 THE `|| 93` FALLBACK IS RESTORED: the default finds a way back to the wire',
    from: `        const planEndAge  = _planThroughAnswered()
          ? Math.min(120, Math.max(_planEndAgeMin, parseInt((document.getElementById('sl-plan-through')?.value) || '', 10)))
          : null;`,
    to:   `        const planEndAge  = Math.min(120, Math.max(_planEndAgeMin, parseInt((document.getElementById('sl-plan-through')?.value) || '', 10) || 93));`,
    expect: [], wantGreen: true,
    note: '⛔ NAMED LIMIT, AND IT IS THE ONE THAT MATTERS MOST HERE. Restoring the fallback leaves '
        + 'EVERY LEG GREEN, because the refusal above still fires and the walk still answers it — so '
        + 'by the time the payload is built the value is real and the fallback is never reached. The '
        + 'gate measures the ANSWERED path; the fallback only bites a path the walk cannot reach '
        + '(a caller that builds a request without going through the refusals). 🔑 A DEAD FALLBACK '
        + 'AND A LIVE ONE LOOK IDENTICAL TO A GATE THAT ONLY EVER WALKS THE HAPPY PATH.'
  },
  {
    name: 'M50 THE READOUT LIES AGAIN: "Not set" reverts to a number nobody chose',
    from: `      if (ex === undefined || ex === '') { lbl.textContent = window.DATUM_NOT_SET; return; }`,
    to:   `      if (ex === undefined || ex === '') { lbl.textContent = '$100k / yr'; return; }`,
    expect: [], wantGreen: true,
    note: '⛔ NAMED GAP. Nothing in this gate reads the READOUT — it reads the payload and the '
        + 'refusal list, and both are still correct here: the number is shown but never sent. So the '
        + 'screen can go back to displaying the $100k while the engine correctly refuses. '
        + 'THAT IS EXACTLY THE SHAPE OF THE ORIGINAL DEFECT (a screen asserting an answer nobody '
        + 'gave) and it would ship green. The leg that closes it belongs with the label harvester, '
        + 'not here; recorded as a row rather than implied to be covered.'
  }
];

const run = () => {
  try { return { code: 0, out: cp.execSync('node scripts/_gate_payload_accounted.js', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 420000 }) }; }
  catch (e) { return { code: e.status === undefined ? 'crash' : e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};
const red = (out) => { const s = new Set(); for (const l of out.split('\n')) { const m = /^\s*FAIL\s+(L\d+)/.exec(l); if (m) s.add(m[1]); } return [...s].sort(); };

const report = [];
try {
  for (const m of MUTANTS) {
    const s = orig.toString('utf8');
    if (s.split(m.from).length - 1 !== 1) { report.push(m.name + '\n  ANCHOR NOT UNIQUE'); continue; }
    fs.writeFileSync(F, s.replace(m.from, function () { return m.to; }), 'utf8');
    const r = run();
    const fired = red(r.out);
    const un = (r.out.match(/observed: (\d+) unaccounted/) || [])[1];
    const verdict = m.wantGreen
      ? (r.code === 0 ? 'AS EXPECTED — no leg here can see this' : 'UNEXPECTED RED: ' + fired.join(', '))
      : ((r.code !== 0 && m.expect.every((w) => fired.includes(w))) ? 'PROVEN' : 'NOT PROVEN');
    report.push(m.name + '\n  exit=' + r.code + '  RED: [' + fired.join(', ') + ']'
      + (m.wantGreen ? '' : '  wanted: [' + m.expect.join(', ') + ']')
      + '  unaccounted=' + (un === undefined ? '?' : un)
      + '\n  ' + verdict + (m.note ? '\n  ⚠️ ' + m.note : ''));
    fs.writeFileSync(F, orig);
  }
} finally {
  fs.writeFileSync(F, orig);
  const back = md5(fs.readFileSync(F));
  report.push('\nRESTORE: studio.html md5=' + back + (back === ORIG ? ' == original' : ' ⛔ MISMATCH'));
}
console.log(report.join('\n\n'));
