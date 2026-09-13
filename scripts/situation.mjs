/* situation.mjs — WHAT IS ACTUALLY TRUE RIGHT NOW. Run it first, every session.
 *
 * ⛔⛔ WHY THIS EXISTS, IN THE CAPTAIN'S OWN WORDS (2026-09-13, hour eight):
 *        "Next claude will be clueless and confident he can solve it."
 *
 *    Every session before this one opened with a new Claude reading a 200-line baton and sixty
 *    memory files — a NARRATIVE — and spending two hours reconstructing a situation that had
 *    already moved. A baton is a claim somebody wrote yesterday. THIS IS A MEASUREMENT TAKEN NOW.
 *    It cannot go stale, it cannot flatter, and it cannot be argued with.
 *
 * 🔑 THE DISTINCTION THAT MAKES IT POSSIBLE, AND IT IS THE WHOLE LESSON OF THIS PROJECT:
 *    A SEARCH SUBDIVIDES FOREVER; A CENSUS CANNOT. "Find what is wrong" produced 3 -> 6 -> 9 -> 27
 *    -> 78 -> 91 -> 94 and would have gone on forever, because every answer was a numerator over an
 *    undeclared denominator. "Classify all 29 fields" has exactly one answer. Every block below
 *    prints its POPULATION beside its count (law 211 / 227) — that is not decoration, it is the
 *    only thing that makes a number mean anything.
 *
 * ⛔ IT REFUSES RATHER THAN GUESSING. A census that cannot be taken says so and the rest still
 *    runs. A ZERO PRINTED FOR A CENSUS THAT NEVER RAN IS THE MOST DANGEROUS OUTPUT THIS FILE
 *    COULD PRODUCE, because it is indistinguishable from good news.
 *
 * ⚠️ IT READS. IT NEVER WRITES, NEVER PUSHES, NEVER DEPLOYS. Safe to run at any time.
 *
 * Run: npm run situation
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const ENGINE = path.resolve(WEB, '..', 'datum-fi');

const B = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GRN = (s) => `\x1b[32m${s}\x1b[0m`;
const YEL = (s) => `\x1b[33m${s}\x1b[0m`;

function rule(title) {
  console.log('');
  console.log(B('═'.repeat(92)));
  console.log(B(title));
  console.log(B('═'.repeat(92)));
}

function sh(cmd, args, cwd) {
  try {
    return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

/* ── THE ENGINE CENSUSES ───────────────────────────────────────────────────────
   ⛔ SHELLED OUT TO PYTHON ON PURPOSE. The schema is a LIVE pydantic model; its defaults and its
      required-set are properties of the RUNNING model, not of its source text. A regex over
      schemas.py would be a document-reading — the exact instrument class this project has been
      burned by five times. ASK THE OBJECT, DO NOT PARSE THE FILE. */
let eng = null, engErr = null;
if (!fs.existsSync(path.join(ENGINE, 'situation.py'))) {
  engErr = `datum-fi/situation.py not found at ${ENGINE}`;
} else {
  const raw = sh('python', ['situation.py', '--json'], ENGINE);
  if (!raw) engErr = 'python situation.py produced no output (is python on PATH? does the engine import?)';
  else { try { eng = JSON.parse(raw); } catch (e) { engErr = 'engine census returned unparseable JSON'; } }
}

console.log('');
console.log(B('  THE SITUATION — measured now, not remembered'));
console.log(DIM(`  ${new Date().toISOString().slice(0, 16).replace('T', ' ')}   web: ${WEB}   engine: ${ENGINE}`));

/* ═══ CLAUSE 2 ═══════════════════════════════════════════════════════════════ */
rule('  CLAUSE 2 · WHOSE LIFE IS IN THE ANSWER');
console.log(DIM('  "No part of Daniel Merced\'s own finances, preferences or retirement plans may'));
console.log(DIM('   colour any other user\'s Range, not even slightly."'));
console.log('');

if (engErr) {
  console.log(RED(`  ⛔ SCHEMA CENSUS COULD NOT BE TAKEN — ${engErr}`));
  console.log(RED('     This is NOT a zero. Nothing below about the schema is known.'));
} else {
  const c2 = eng.blocks.clause2_schema;
  if (c2.REFUSED) {
    console.log(RED(`  ⛔ REFUSED — ${c2.REFUSED}`));
  } else {
    const life = c2.somebodys_life;
    console.log(`  population: ${B(c2.population)} fields on CalculateRequest`);
    console.log(`    ${String(c2.required.length).padStart(2)}  required — no default is possible`);
    console.log(`    ${String(c2.absent_is_absent.length).padStart(2)}  default None — absent means absent, and the engine refuses`);
    console.log(`    ${String(c2.machinery.length).padStart(2)}  machinery, legitimately ours   ${DIM(c2.machinery.join(' · '))}`);
    console.log(`    ${String(c2.market_fact.length).padStart(2)}  a market fact, dated           ${DIM(c2.market_fact.join(' · '))}`);
    console.log('');
    console.log(life.length ? RED(`    ${String(life.length).padStart(2)}  ⛔ SOMEBODY'S LIFE — answers for a stranger who said nothing:`)
                            : GRN('     0  ✅ no life-bearing default remains in the schema'));
    for (const [n, d] of life) console.log(RED(`         ${n.padEnd(24)} = ${d}`));
  }
}

/* ── THE MARKUP HALF ──────────────────────────────────────────────────────────
   ⛔⛔ THIS BLOCK EXISTS BECAUSE ITS ABSENCE COST A DEFECT. On 2026-09-13 the schema census was
      clean for healthcare and `hc-pre65-monthly` still shipped `value="$1,150"` — $13,800/yr
      nobody entered, on every cold Studio. THE SCHEMA IS NOT THE ONLY PLACE A DEFAULT CAN LIVE,
      and a census of one population says nothing about the other.
   ⚠️ IT REPORTS CANDIDATES, NOT VIOLATIONS, AND THE DIFFERENCE IS LOAD-BEARING. A resting slider
      guarded by an `_xAnswered()` predicate is correct; one that is read straight is a default.
      This cannot tell them apart, so it says so rather than accusing. */
const studio = path.join(WEB, 'studio.html');
console.log('');
if (!fs.existsSync(studio)) {
  console.log(RED('  ⛔ MARKUP CENSUS COULD NOT BE TAKEN — studio.html not found'));
} else {
  const s = fs.readFileSync(studio, 'utf8');
  const inputs = s.match(/<input\b[^>]*>/gi) || [];
  const withVal = inputs.filter(t => /\bvalue\s*=\s*"[^"]*[^"\s][^"]*"/.test(t));
  const rows = [];
  for (const t of withVal) {
    const v = (t.match(/\bvalue\s*=\s*"([^"]*)"/) || [])[1] || '';
    if (!v.trim() || v.includes('${')) continue;            // template render site, not a default
    const type = (t.match(/\btype\s*=\s*"([^"]+)"/) || [])[1] || '?';
    if (['checkbox', 'radio', 'hidden'].includes(type)) continue;
    if (!/[0-9$]/.test(v)) continue;
    const id = (t.match(/\bid\s*=\s*"([^"]+)"/) || [])[1] || '(no id)';
    rows.push({ id, type, v });
  }
  const guarded = rows.filter(r => new RegExp(`Answered[^;]{0,400}${r.id.replace(/[-]/g, '\\-')}`, 's').test(s));
  console.log(`  population: ${B(inputs.length)} <input> elements in studio.html`);
  console.log(`    ${String(rows.length).padStart(2)}  carry a hardcoded NUMBER or $ a user did not type ${DIM('(template sites excluded)')}`);
  console.log(YEL(`    ${String(rows.length - guarded.length).padStart(2)}  ⚠️ CANDIDATES — unproven either way. A guarded resting position is correct;`));
  console.log(YEL('        one read straight is a default. This census cannot tell them apart.'));
  for (const r of rows) {
    const ok = guarded.includes(r);
    console.log(`         ${ok ? GRN('guarded') : YEL('  ?    ')}  ${r.id.padEnd(26)} ${DIM(r.type.padEnd(7))} ${r.v}`);
  }
}

/* ═══ CLAUSE 1 ═══════════════════════════════════════════════════════════════ */
rule('  CLAUSE 1 · IS THE SECOND PERSON MODELLED');
console.log(DIM('  "SOLO and JOINT fully modelled — every field pertinent to the primary is'));
console.log(DIM('   pertinent to the co-architect."'));
console.log('');
if (engErr || eng?.blocks?.clause1_pairing?.REFUSED) {
  console.log(RED(`  ⛔ PAIRING CENSUS COULD NOT BE TAKEN — ${engErr || eng.blocks.clause1_pairing.REFUSED}`));
} else {
  const c1 = eng.blocks.clause1_pairing;
  console.log(`  population: ${B(c1.population)} primary life-fields that owe a counterpart`);
  console.log(GRN(`    ${String(c1.counterpart_present.length).padStart(2)}  counterpart PRESENT   ${DIM(c1.counterpart_present.join(' · '))}`));
  if (c1.counterpart_ABSENT.length)
    console.log(RED(`    ${String(c1.counterpart_ABSENT.length).padStart(2)}  counterpart ABSENT    ${c1.counterpart_ABSENT.join(' · ')}`));
  console.log('');
  console.log(YEL('  ⚠️ ' + c1.caveat));
  console.log(DIM('     run  python test_input_reachability.py  in datum-fi to see which are inert.'));
  console.log('');
  console.log('  NOT SPLIT, and arguably should be:');
  for (const [k, why] of Object.entries(c1.not_split)) console.log(`       ${k.padEnd(20)} ${DIM(why)}`);
}

/* ═══ CAN IT ANSWER ══════════════════════════════════════════════════════════ */
rule('  CAN THE ENGINE ANSWER AT ALL · coverage over the closed world');
if (engErr || eng?.blocks?.coverage?.REFUSED) {
  console.log(RED(`  ⛔ COVERAGE CENSUS COULD NOT BE TAKEN — ${engErr || eng.blocks.coverage.REFUSED}`));
} else {
  const cv = eng.blocks.coverage;
  console.log(`  population: ${B(cv.population)} = ${cv.jurisdictions} jurisdictions x ${cv.filing_statuses} filing statuses`);
  console.log(GRN(`    ${String(cv.produces_a_number).padStart(3)}  produce a number   (${cv.pct}%)`));
  for (const [code, n] of Object.entries(cv.refuses_by_name)) {
    const bad = code.startsWith('UNHANDLED');
    console.log((bad ? RED : YEL)(`    ${String(n).padStart(3)}  ${code}`));
  }
  console.log('');
  console.log(DIM('  ⚠️ A REFUSAL IS NOT A FAILURE — it names missing work. But if the work never'));
  console.log(DIM('     lands, the refusals ARE the product, and then it was coverage loss after all.'));
}

/* ═══ COPY DEBT ══════════════════════════════════════════════════════════════ */
rule('  COPY DEBT · strings no user may ever see');
if (engErr || eng?.blocks?.copy_debt?.REFUSED) {
  console.log(RED(`  ⛔ COULD NOT BE TAKEN — ${engErr || eng.blocks.copy_debt.REFUSED}`));
} else {
  /* ⛔ BY REFUSAL CODE AND BY REACHABILITY, NEVER BY GREP LINE. A grep counts `condition=` and
     `change=` separately and reports 8 where there are 4 — an inflated number is as useless as a
     missing one. And an UNREACHABLE marker is not debt: it sits in a branch 255 measured
     combinations never enter, so listing it as owed puts work on the punch list no user can meet. */
  const cd = eng.blocks.copy_debt;
  console.log(`  population: ${B(cd.codes_carrying_the_marker.length)} refusal code(s) carry the marker` +
              DIM(`   (a raw grep would say ${cd.grep_lines} — it counts lines, not codes)`));
  console.log(cd.n ? RED(`    ${cd.n}  ⛔ REACHABLE — ${cd.rule}`)
                   : GRN('    0  ✅ no reachable refusal carries the marker.'));
  for (const h of cd.reachable) console.log(RED(`         ${h}`));
  if (cd.unreachable.length) {
    console.log(DIM(`    ${cd.unreachable.length}  unreachable (0 of ${eng.blocks.coverage?.population ?? '?'} combinations) — census residue, not debt:`));
    for (const h of cd.unreachable) console.log(DIM(`         ${h}`));
  }
}

/* ═══ WHAT IS IN FRONT OF A USER ═════════════════════════════════════════════ */
rule('  WHAT IS IN FRONT OF A USER');
for (const [label, dir, branch] of [['web    (datumfi-web)', WEB, 'main'],
                                    ['engine (datum-fi)', ENGINE, 'reconcile']]) {
  if (!fs.existsSync(path.join(dir, '.git'))) { console.log(RED(`  ${label}: no git repo at ${dir}`)); continue; }
  const cur = sh('git', ['branch', '--show-current'], dir);
  const ahead = sh('git', ['log', '--oneline', `origin/${cur}..HEAD`], dir);
  const dirty = (sh('git', ['status', '--porcelain'], dir) || '')
    .split('\n').filter(l => l && !l.startsWith('??')).length;
  const n = ahead ? ahead.split('\n').filter(Boolean).length : 0;
  console.log(`  ${label}  branch ${B(cur)}`);
  console.log(`      ${n ? RED(`${n} commit(s) UNPUSHED`) : GRN('pushed up to date')}` +
              `    ${dirty ? YEL(`${dirty} tracked file(s) modified`) : DIM('working tree clean')}`);
  if (ahead) for (const l of ahead.split('\n').filter(Boolean)) console.log(DIM(`        ${l}`));
}
console.log('');
console.log(RED('  ⛔ A PUSH IS NOT A DEPLOY. The engine ships as a CONTAINER IMAGE, built and'));
console.log(RED('     released by hand. Nothing above is in front of a user until that happens.'));
console.log(DIM('     A fix behind a deploy gate is not a fix, it is a claim.'));

rule('  WHAT THIS DOES NOT KNOW');
console.log('  · whether the Range is CORRECT for a complicated household — every fixture is small');
console.log('    and clean, and nobody has run a messy estate through it.');
console.log('  · which present co-architect fields are INERT — run test_input_reachability.py.');
console.log('  · whether the markup candidates above are real defaults or guarded resting positions.');
console.log('');
console.log(DIM('  A count without its population is a rumour. Every number above carries one.'));
console.log('');
