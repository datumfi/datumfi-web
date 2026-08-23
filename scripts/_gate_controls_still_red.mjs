/* ══ DO THE DECLARED CONTROLS STILL BITE? — §82.90 (B), THE PERIODIC CONTROL RUN ═════════════════
 *
 * ⛔⛔ READ THE NAME LITERALLY, THE SAME WAY (A)'s NAME MUST BE READ. This gate proves that a
 * DECLARED control, when actually INVOKED, still behaves the way its declaration says it should.
 * It says nothing about the 164 gates that carry a control and have not declared one.
 *
 * ── WHY IT EXISTS, AND IT IS NOT THE REASON THAT WAS FIRST WRITTEN DOWN ─────────────────────────
 * The founding case was `_gate_seam_pin.js`: an ordinary CSS edit killed its literal poison anchor,
 * and BOTH of its red-first controls aborted — correctly — while a clean suite printed 233/0/0.
 *   🔑 THAT GATE'S GUARDS WERE FINE. THEY ABORTED. NOBODY HEARD THEM. A guard that lives inside a
 *      control is UNREACHABLE CODE until something invokes the control, and until this gate existed
 *      nothing ever did: the suite runs every gate ONCE, CLEAN, and a poison is a no-op without its
 *      flag.
 *   ⇒ SO THIS IS NOT A HUNT FOR GATES THAT LACK GUARDS. It is the thing that INVOKES controls so the
 *     guards already written can actually fire.
 *
 * ── THE CONTRACT IS AN OUTCOME, NOT A MECHANISM, AND THAT IS LOAD-BEARING ───────────────────────
 * ⛔⛔ THE FIRST CUT OF THIS FILE ASSERTED "INVOKE THE CONTROL, EXPECT RED" AND WAS BACKWARDS FOR
 * 100% OF THE DECLARED POPULATION. Both gates that had declared use SELF-VERIFYING controls: the
 * gate applies its own poison, checks internally that exactly the declared legs went red, and prints
 * `SCORE 7/7 GREEN (red-first control behaved as specified)`. They go RED when the control STOPS
 * biting. Caught by running the real population; the synthetic sentinels had all passed.
 *   🔑 A FIXTURE THAT ONLY CONTAINS THE SHAPE YOU EXPECT CANNOT DISPROVE YOUR EXPECTATION. Sentinels
 *      test the instrument's MECHANISM; only the real population tests its CONTRACT.
 *   ⇒ So each control declares `expect`, and this gate reads it. There are FIVE known control
 *     mechanisms (byte rewriting · in-process substitution · assertion inversion · regex source
 *     patching · self-verification) and there will be a sixth. THERE ARE ONLY TWO OUTCOMES. An
 *     outcome contract survives the discovery of a new mechanism; a mechanism contract would have to
 *     be reopened every time one appears.
 *       expect: 'red'            an ordinary red-first — THIS gate judges it
 *       expect: 'self-verified'  the gate checks its own control and reports; this gate judges only
 *                                that the gate's own verdict says the control behaved
 *
 * ── THE VACUOUS-PASS TRAP, CHECKED FOR BOTH OUTCOMES ────────────────────────────────────────────
 * ⛔ "RUN THE CONTROL, ASSERT RED" IS SATISFIED BY A GATE THAT WAS ALREADY RED. A broken gate reds
 * with the flag and without it, and this instrument would call its control healthy. That is
 * EXCLUSION NEEDS PRESENCE pointed at ourselves. Every control is therefore run BOTH ways and the
 * PAIR is the verdict. The `alreadyRed` sentinel holds that boundary open.
 *
 * ── VERDICT FIRST, EXIT CODE AS FALLBACK, AND THE FALLBACK IS PUBLISHED ─────────────────────────
 * `_gate_d1_sketch_parity.mjs --redfirst` prints `OVERALL: RED (2 pass / 14 fail)` and EXITS 0. An
 * exit-code reader calls that GREEN and passes the exact defect this instrument exists to catch. So
 * the VERDICT is authoritative wherever it can be read, via scripts/_verdict.mjs — the runner's own
 * parser, SHARED not copied, because two parsers would drift and then disagree silently about what
 * RED means.
 * ⚠️ BUT TWO DECLARED GATES CANNOT BE READ AT ALL UNDER THEIR CONTROLS, AND BOTH REASONS ARE REAL
 *    DEFECTS FILED SEPARATELY:
 *      (1) `SCORE 7/7 GREEN (red-first control behaved as specified)` — the phrase "red-first" trips
 *          VERDICT_NOISE, so the filter built to drop lines ABOUT a red drops the line that IS one.
 *          🔑 A FILTER THAT DROPS LINES ABOUT A THING WILL EVENTUALLY DROP THE LINE THAT IS THE THING.
 *      (2) `SCORE 13/14 (red-first control behaved as specified)` — no GREEN/RED word at all. That is
 *          a GATE defect, not a parser one, and must never be "fixed" by loosening the score pattern.
 *    Neither touches the suite: both gates' CLEAN runs are readable, so neither is among the 59.
 *    They bite only in the state that only THIS gate enters.
 * ⇒ THE RULE, UNIFORM FOR BOTH OUTCOMES SO IT CANNOT DRIFT INTO AN EXEMPTION FOR THE TWO GATES THAT
 *   MOTIVATED IT: use the verdict when readable, the exit code when not, and REPORT WHICH WAS USED,
 *   PER CONTROL. The exit-code reading is STRICTLY WEAKER — a gate with a lying exit code passes,
 *   which is sketch_parity's own shape pointed at a different mechanism — so the count is printed
 *   rather than buried. A GREEN THAT PUBLISHES "I COULD NOT READ MY SUBJECTS" IS HONEST; ONE THAT
 *   SILENTLY DEGRADES IS THE THING THIS WHOLE ARC EXISTS TO KILL. The weakness line is also a work
 *   queue: it is the number that makes defects (1) and (2) worth scheduling.
 *
 * ── POPULATION AND DECLARATIONS: ASK, NEVER PARSE ───────────────────────────────────────────────
 * The gate list comes from the RUNNER (`--explain-names`); each declaration comes from THE GATE
 * (`--declare-controls`). ⛔ CONTROL FLAGS ARE NEVER DISCOVERED BY PARSING: `argv.includes('--x')`
 * also matches MODE flags — `_gate_asset_freshness.mjs` carries `--live` and `--stalemax` beside its
 * real controls — and invoking a mode while asserting non-green would manufacture false reds at
 * scale. A PARSED FLAG IS NOT A DECLARED CONTROL.
 *
 * ── THE AGE LINE PRINTS IN THE CLEAN SUITE, NOT ONLY IN THE SWEEP ───────────────────────────────
 * 🔑 A STALENESS REPORT THAT ONLY APPEARS WHEN THE THING RUNS CANNOT TELL YOU IT STOPPED RUNNING.
 * Default mode does NOT invoke controls (that is the weekly `--sweep`); it prints how long since one
 * did. ⚠️ The seed is an honest `never` — NO BACK-FILLED DATES. The receipt lives in gitignored
 * scripts/.gate-out/, so a fresh clone reads `never`, which is TRUE for a fresh clone. Staleness is
 * REPORTED, NEVER RED: a convention arrives by draining, not by force.
 *
 * MODES
 *   (default)          sentinels + cheap legs + the age line.        ~4s, runs in the suite
 *   --sweep            the above + INVOKE every declared control.    the weekly cadence run
 *   --selftest         sentinels only, then exit
 *   --sabotage=<name>  RED-FIRST: break one sentinel; the guard MUST abort at exit 1
 *
 * @gate-pool: node
 * ⛔ DECLARED, NOT LEFT TO INFERENCE. The runner would classify this as node-only anyway (there is no
 * playwright reference to sniff) — but its own accounting calls inference "a guess, not a source",
 * and a gate that JOINS THE POPULATION ON A GUESS is "ask the runner for a population, never grep
 * one" turned inside out. ⚠️ In DEFAULT mode this spawns only short-lived node processes (six
 * sentinels and four `--declare-controls` emitters); `--sweep` spawns the declared gates themselves,
 * some of which ARE browser gates, which is a second reason the sweep is not part of the suite run.
 *
 * LEGS
 *   S     six sentinels behave — else ABORT with NO SCORE
 *   L1    the runner answered with a population (never a glob fallback)
 *   L2    every declared gate answered with a parseable declaration
 *   L3    the census is non-vacuous — at least one gate has declared
 *   L4    every declared control names an `expect` this gate understands
 *   L5    the coverage denominator adds up to the population
 *   L6    [--sweep] every declared control behaved as its `expect` says it should
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVerdict } from './_verdict.mjs';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPTS, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find((x) => x.startsWith(k + '=')); return a ? a.split('=')[1] : d; };
const SWEEP = argv.includes('--sweep');
const SELFTEST_ONLY = argv.includes('--selftest');
const SABOTAGE = arg('--sabotage', '');
const RUN_TIMEOUT = 180000;
const RECEIPT = path.join(SCRIPTS, '.gate-out', 'control-sweep.json');
const KNOWN_EXPECT = new Set(['red', 'self-verified']);

let pass = 0, total = 0;
function ok(id, label, cond, detail) {
  total++; if (cond) pass++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${id} ${label}${detail ? '  — ' + detail : ''}`);
}
function abort(why) {
  console.log('');
  console.log('⛔ SELF-CHECK FAILED — ' + why);
  console.log('   NO SCORE PRINTED. An instrument that cannot prove itself must not report on others.');
  process.exit(1);
}

/* ══ OBSERVE — one run, and it records HOW it decided, never only WHAT ═══════════════════════════ */
function observe(file, extraArgs) {
  const r = spawnSync(process.execPath, [file, ...extraArgs], {
    cwd: REPO, encoding: 'utf8', timeout: RUN_TIMEOUT, maxBuffer: 1 << 24,
  });
  const v = readVerdict((r.stdout || '') + '\n' + (r.stderr || ''));
  const timedOut = !!r.error && r.error.code === 'ETIMEDOUT';
  /* the verdict is authoritative where it exists; the exit code is the fallback AND IS LABELLED */
  return {
    timedOut,
    source: v.seen ? 'verdict' : 'exit',
    red: v.seen ? !!v.failed : r.status !== 0,
    code: r.status,
  };
}

/* ══ JUDGE — the pair, against the DECLARED outcome ══════════════════════════════════════════════ */
function judgeControl(file, flag, expect) {
  const clean = observe(file, []);
  const poisoned = observe(file, [flag]);
  const degraded = clean.source === 'exit' || poisoned.source === 'exit';
  let outcome;
  if (clean.timedOut || poisoned.timedOut) outcome = 'TIMEOUT';
  else if (clean.red) outcome = 'ALREADY_RED';            /* vacuous-pass trap — both outcomes */
  else if (expect === 'red') outcome = poisoned.red ? 'BITES' : 'INERT';
  else if (expect === 'self-verified') outcome = poisoned.red ? 'SELF_CHECK_FAILED' : 'BITES';
  else outcome = 'UNKNOWN_EXPECT';
  /* the gate's own verdict says RED while its exit code says success — reported, never resolved */
  const incoherent = poisoned.source === 'verdict' && poisoned.red && poisoned.code === 0;
  return { outcome, degraded, incoherent, clean, poisoned };
}

/* ══ SENTINELS — SIX, and the last two exist only because the first cut shipped four ══════════
   ⚠️ THE `unreadable` PAIR REPRODUCES THE REAL OUTPUT BYTE SHAPE, NOT AN IDEALISED ONE. That is the
   whole correction: the first sentinel suite printed clean `OVERALL:` lines nothing in the estate
   actually emits, passed 4/4, and hid a contract that was backwards for every real gate. */
function sentinelSources() {
  /* an ordinary gate: a plain OVERALL line the parser can read */
  const plain = (cleanV, poisonV, poisonExit) =>
    `const P = process.argv.includes('--poison');\n` +
    `if (!P) { console.log('OVERALL: ${cleanV}   (3 pass / ${cleanV === 'RED' ? 1 : 0} fail)'); process.exit(${cleanV === 'RED' ? 1 : 0}); }\n` +
    `console.log('MODE: RED-FIRST (poison applied — MUST be RED)');\n` +
    `console.log('OVERALL: ${poisonV}   (3 pass / ${poisonV === 'RED' ? 1 : 0} fail)');\n` +
    `process.exit(${poisonExit});\n`;
  /* a SELF-VERIFYING gate, reproducing _gate_seam_pin's exact unreadable shape: the verdict line
     contains "red-first", so VERDICT_NOISE drops it and only the exit code survives. */
  const selfver = (poisonExit) =>
    `const P = process.argv.includes('--poison');\n` +
    `if (!P) { console.log('SCORE 7/7 GREEN'); process.exit(0); }\n` +
    `console.log('  control OK — poison red exactly L3,L4');\n` +
    `console.log('SCORE 7/7 GREEN   (red-first control behaved as specified)');\n` +
    `process.exit(${poisonExit});\n`;
  return {
    /* ── expect: 'red' ─────────────────────────────────────────────────────────────────────────── */
    honest: plain('GREEN', 'RED', 1),
    inert: plain('GREEN', 'GREEN', 0),                    /* the §82.81 defect: poison did not land */
    liar: plain('GREEN', 'RED', 0),                       /* verdict RED, exit 0 — sketch_parity's shape */
    alreadyRed: plain('RED', 'RED', 1),                   /* broken before the control ran */
    /* ── expect: 'self-verified' ───────────────────────────────────────────────────────────────── */
    selfOk: selfver(0),                                   /* gate says its control behaved */
    selfBroken: selfver(1),                               /* gate says its control did NOT behave */
  };
}

const SENTINEL_SPEC = {
  honest: { expect: 'red', outcome: 'BITES', incoherent: false, degraded: false },
  inert: { expect: 'red', outcome: 'INERT', incoherent: false, degraded: false },
  liar: { expect: 'red', outcome: 'BITES', incoherent: true, degraded: false },
  alreadyRed: { expect: 'red', outcome: 'ALREADY_RED', incoherent: false, degraded: false },
  /* ⚠️ degraded:true is ASSERTED, not tolerated. If the parser ever learns to read these lines the
     sentinel goes BAD and someone must re-read this file rather than quietly gaining coverage. */
  selfOk: { expect: 'self-verified', outcome: 'BITES', incoherent: false, degraded: true },
  selfBroken: { expect: 'self-verified', outcome: 'SELF_CHECK_FAILED', incoherent: false, degraded: true },
};

function selfCheck() {
  const S = sentinelSources();
  if (SABOTAGE) {
    if (!(SABOTAGE in S)) {
      console.error(`--sabotage=${SABOTAGE} is not a sentinel (${Object.keys(S).join('|')})`);
      process.exit(1);
    }
    /* ⛔ A SABOTAGE THAT CHANGES NOTHING IS NOT A SABOTAGE. `--sabotage=honest` rewrote `honest` as
       `honest`: a NO-OP that found nothing wrong and then blamed the GUARD for its own vacuity —
       an instrument printing a false accusation, measured on this file minutes after it was
       written, and caught only by exercising ALL sentinels rather than the ones expected to bite.
       🔑 The runner's `--sabotage=pass` has this shape and DOCUMENTS the weakness; this REMOVES it. */
    const before = S[SABOTAGE];
    S[SABOTAGE] = sentinelSources().honest;
    if (S[SABOTAGE] === before) {
      console.error(`--sabotage=${SABOTAGE} is a NO-OP — that sentinel already has the substituted shape,`);
      console.error(`so it cannot demonstrate the guard. Pick another sentinel.`);
      process.exit(2);
    }
    console.log(`⚠️  --sabotage=${SABOTAGE} — that sentinel now behaves like 'honest'. The guard MUST abort.`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'datum-ctlsweep-'));
  const results = [];
  try {
    for (const [name, src] of Object.entries(S)) {
      const f = path.join(dir, `_sentinel_${name}.js`);
      fs.writeFileSync(f, src, 'utf8');
      const want = SENTINEL_SPEC[name];
      const got = judgeControl(f, '--poison', want.expect);
      const good = got.outcome === want.outcome && got.incoherent === want.incoherent
        && got.degraded === want.degraded;
      results.push({ name, good, got, want });
      const tag = (o) => o.outcome + (o.incoherent ? '+incoherent' : '') + (o.degraded ? '+exit-only' : '');
      console.log(`    ${good ? 'ok  ' : 'BAD '}  ${want.expect.padEnd(13)} ${name.padEnd(11)} want ${tag(want).padEnd(24)} got ${tag(got)}`);
    }
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp dir */ }
  }
  return results;
}

function readReceipt() {
  try { return JSON.parse(fs.readFileSync(RECEIPT, 'utf8')); } catch { return null; }
}
function ageLine(rec) {
  if (!rec || !rec.at) return 'controls last verified: NEVER — no sweep has ever run on this checkout';
  const days = (Date.now() - Date.parse(rec.at)) / 86400000;
  return `controls last verified: ${rec.at} (${days < 1 ? 'today' : days.toFixed(1) + ' days ago'})`
    + ` — ${rec.behaved}/${rec.swept} control(s) behaved, across ${rec.gates} gate(s)`;
}

/* ══ main ════════════════════════════════════════════════════════════════════════════════════════ */
console.log('DO THE DECLARED CONTROLS STILL BITE?'
  + (SWEEP ? '   MODE: --sweep' : SABOTAGE ? '   MODE: --sabotage=' + SABOTAGE : ''));
console.log('  ⛔ proves DECLARED controls only — never that an UNDECLARED gate\'s control still bites.');
console.log('');
console.log('  ----- self-check (six sentinels; the instrument proves itself before it reports) -----');
const sent = selfCheck();
const bad = sent.filter((s) => !s.good);
if (SABOTAGE) {
  if (bad.length === 0) abort(`--sabotage=${SABOTAGE} was not caught. The self-check cannot fail, so it is not a check.`);
  console.log('');
  console.log(`✅ RED-FIRST HELD — the sabotaged sentinel was caught (${bad.map((s) => s.name).join(', ')}). Aborting as designed.`);
  process.exit(1);
}
if (bad.length) abort('sentinel(s) misbehaved: ' + bad.map((s) => `${s.name} wanted ${s.want.outcome}, got ${s.got.outcome}`).join(' · '));
console.log('  ✅ self-check passed — both outcomes, the vacuous-pass trap, the exit-0 liar, and the');
console.log('     unreadable self-verifying shape are all classified correctly.');
if (SELFTEST_ONLY) { console.log('\n--selftest: instrument proven, no gates swept.'); process.exit(0); }

/* ── population: ASK THE RUNNER ─────────────────────────────────────────────────────────────────── */
let population = [], popOk = false;
{
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, '_suite_baseline.mjs'), '--explain-names'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 120000 });
  try { population = JSON.parse(r.stdout).gates; popOk = Array.isArray(population) && population.length > 0; }
  catch { popOk = false; }
}

/* ── which gates have DECLARED? (the marker is the CALL, not the string — §82.101) ──────────────── */
const SELF = path.basename(fileURLToPath(import.meta.url));
const DECLARE_CALL = /argv\s*\.\s*includes\s*\(\s*['"]--declare-controls['"]\s*\)/;
const declaredNames = [];
for (const name of population) {
  if (name === SELF) continue;
  let src; try { src = fs.readFileSync(path.join(SCRIPTS, name), 'utf8'); } catch { continue; }
  if (DECLARE_CALL.test(src)) declaredNames.push(name);
}

const decls = [], unparseable = [];
for (const name of declaredNames) {
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, name), '--declare-controls'],
    { cwd: REPO, encoding: 'utf8', timeout: 30000, maxBuffer: 1 << 22 });
  try { decls.push(JSON.parse(r.stdout)); }
  catch (e) { unparseable.push(`${name}: ${String(e.message).split('\n')[0]}`); }
}

/* ── the declared controls, counted BY OUTCOME ──────────────────────────────────────────────────── */
const byExpect = { red: 0, 'self-verified': 0 };
const badExpect = [];
for (const d of decls) {
  for (const [flag, spec] of Object.entries(d.controls || {})) {
    if (KNOWN_EXPECT.has(spec.expect)) byExpect[spec.expect]++;
    else badExpect.push(`${d.gate} ${flag} -> ${spec.expect === undefined ? '(no expect declared)' : spec.expect}`);
  }
}
const controlCount = byExpect.red + byExpect['self-verified'] + badExpect.length;

/* ── the sweep ──────────────────────────────────────────────────────────────────────────────────── */
const findings = [], incoherents = [];
let behaved = 0, swept = 0, degraded = 0;
if (SWEEP) {
  console.log('');
  console.log('  ----- sweep: invoking every declared control, BOTH directions -----');
  for (const d of decls) {
    const file = path.join(SCRIPTS, d.gate);
    for (const [flag, spec] of Object.entries(d.controls || {})) {
      if (!KNOWN_EXPECT.has(spec.expect)) continue;      /* L4 already reds on these */
      swept++;
      const j = judgeControl(file, flag, spec.expect);
      if (j.outcome === 'BITES') behaved++;
      else findings.push(`${d.gate} ${flag} (expect:${spec.expect}) -> ${j.outcome}`);
      if (j.degraded) degraded++;
      if (j.incoherent) incoherents.push(`${d.gate} ${flag}`);
      console.log(`    ${j.outcome === 'BITES' ? 'ok  ' : 'FAIL'}  ${d.gate} ${flag.padEnd(12)}`
        + ` expect:${spec.expect.padEnd(13)} ${j.outcome}`
        + `${j.degraded ? '   [exit-code only]' : ''}${j.incoherent ? '   ⚠️ verdict RED but exit 0' : ''}`);
    }
  }
}

/* ── coverage, BY OUTCOME, in this gate's own output ────────────────────────────────────────────── */
const noDecl = population.length - declaredNames.length;
console.log('');
console.log('  COVERAGE — this instrument\'s own denominator, printed every run');
console.log(`    population (from runner)                  ${population.length}`);
console.log(`    gates that have DECLARED                  ${declaredNames.length}`);
console.log(`    controls declared                         ${controlCount}`);
console.log(`      expect:red            (SWEEP judges)    ${byExpect.red}`);
console.log(`      expect:self-verified  (the GATE judges)  ${byExpect['self-verified']}`);
console.log(`    NOT EXAMINED by this gate                 ${noDecl}   <- undeclared; never invoked here`);
if (SWEEP && degraded) {
  console.log('');
  console.log(`  ⚠️  ${degraded} of ${swept} control(s) judged by EXIT CODE ONLY — verdict unreadable.`);
  console.log('      Strictly weaker: a gate with a lying exit code passes this reading.');
  console.log('      This line is a work queue, not a disclaimer — it shrinks when the two');
  console.log('      verdict defects (VERDICT_NOISE self-reference; a SCORE line naming no state) are fixed.');
}
console.log('');
console.log('  ' + ageLine(readReceipt()));
console.log('');

ok('L1', 'the runner answered with a population (never a glob)', popOk, `${population.length} gates`);
ok('L2', 'every declared gate answered with a parseable declaration', unparseable.length === 0,
  unparseable.length ? unparseable.join(' | ') : 'all parsed');
ok('L3', 'the census is non-vacuous (at least one gate has declared)', declaredNames.length > 0,
  `${declaredNames.length} declaration(s), ${controlCount} control(s)`);
ok('L4', 'every declared control names an `expect` this gate understands', badExpect.length === 0,
  badExpect.length ? badExpect.join(' | ') : `${byExpect.red} red · ${byExpect['self-verified']} self-verified`);
ok('L5', 'the coverage denominator adds up to the population',
  popOk && declaredNames.length + noDecl === population.length,
  `${declaredNames.length} + ${noDecl} = ${population.length}`);
if (SWEEP) {
  ok('L6', 'every declared control behaved as its `expect` says it should', findings.length === 0,
    findings.length ? findings.join(' | ') : `${behaved}/${swept} behaved`);
}

if (SWEEP && findings.length === 0) {
  try {
    fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
    fs.writeFileSync(RECEIPT, JSON.stringify({
      at: new Date().toISOString(), gates: decls.length, swept, behaved, degraded,
    }, null, 2), 'utf8');
  } catch { /* the receipt is a convenience; its absence reads as `never`, which is honest */ }
}

if (incoherents.length) {
  console.log('');
  console.log(`  ⚠️  ${incoherents.length} control(s) printed a RED verdict but exited 0: ${incoherents.join(', ')}`);
  console.log('      The control BIT — read from the verdict, which is authoritative here.');
  console.log('      The exit code is the defect, and it belongs to the GATE, not to its control.');
}
if (!SWEEP) {
  console.log('');
  console.log('  ⚠️  NO CONTROL WAS INVOKED THIS RUN. Default mode reports staleness only;');
  console.log('      `--sweep` is the cadence run that actually proves the controls still behave.');
}
console.log('');
console.log(`SCORE ${pass}/${total} ${pass === total ? 'GREEN' : 'RED'}   — declared controls only; ${noDecl} gate(s) NOT examined`);
process.exit(pass === total ? 0 : 1);
