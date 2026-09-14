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
      This cannot tell them apart, so it says so rather than accusing.

   ⛔⛔ IT SCANNED ONE FILE UNTIL 2026-09-13 AND CALLED ITSELF A CENSUS. studio.html was the whole
      declared population, which made it A SEARCH WITH ONE HAYSTACK — the exact shape §82.2321
      forbids. MEASURED on the day it was widened: the true population is 39 tracked .html files,
      226 <input> elements and 66 numeric resting positions, against the 58 and 14 it had been
      reporting. sketch.html alone — a SACRED host with live Framing-D math, not an archive —
      carries 13, INCLUDING `sl-plan-through=93`, the Captain's own plan-through age, on a page
      no previous Clause-2 sweep had ever looked at. Dossier.html carries `datumDefault=$100,000`.
   🔑 A CENSUS OF ONE FILE SAYS NOTHING ABOUT THE OTHER THIRTY-EIGHT. The population is now
      `git ls-files *.html` — derived, never a hand-written list, so a NEW page joins the census
      the commit it is tracked rather than the day somebody remembers to add it.

   ⛔ COMMENTS ARE STRIPPED BEFORE COUNTING — §82.2332, and it is a guard over a hazard that has
      NOT YET FIRED, which is stated plainly rather than dressed as a repair. MEASURED: stripping
      removes 685,142 bytes from studio.html (40% of the file) and the <input> count does not move,
      58 to 58, same ids. No whole `<input>` tag is quoted inside a comment TODAY. But the house
      style buries a removed default in prose beside where it stood, and good prose quotes what it
      removed: `grep -cF 'value="$1,150"'` on the LIVE page returns 1 and the hit is the comment
      recording the removal. The day one of those comments quotes a full tag, this census would
      have counted a ghost. A FIX CAN TRIP A DETECTOR JUST AS A DEFECT CAN DISABLE ONE. */
const htmlFiles = (() => {
  try {
    return execFileSync('git', ['ls-files', '-z', '*.html'], { cwd: WEB, maxBuffer: 1e8 })
      .toString().split('\0').filter(Boolean);
  } catch { return null; }
})();
/* ⛔ COMMENT STRIPPER. Newlines are PRESERVED as they are removed so any future line-anchored
   check keeps its line numbers. `//` is stripped ONLY at line start — a bare `//` rule would
   eat every `https://` in the file and silently shrink the haystack. */
const stripComments = (s) => s
  .replace(/<!--[\s\S]*?-->/g, m => '\n'.repeat((m.match(/\n/g) || []).length))
  .replace(/\/\*[\s\S]*?\*\//g, m => '\n'.repeat((m.match(/\n/g) || []).length))
  .replace(/^[ \t]*\/\/.*$/gm, '');

console.log('');
if (!htmlFiles || !htmlFiles.length) {
  console.log(RED('  ⛔ MARKUP CENSUS COULD NOT BE TAKEN — `git ls-files *.html` returned nothing.'));
  console.log(RED('     A ZERO PRINTED FOR A CENSUS THAT NEVER RAN IS INDISTINGUISHABLE FROM GOOD NEWS.'));
} else if (!htmlFiles.includes('studio.html')) {
  console.log(RED('  ⛔ MARKUP CENSUS REFUSED — studio.html is not in the tracked population.'));
  console.log(RED('     It is the Studio. Its absence is a broken census, never a clean one.'));
} else {
  let bytesRaw = 0, bytesStripped = 0, inputTotal = 0;
  const perFile = [];
  for (const f of htmlFiles) {
    let raw;
    try { raw = fs.readFileSync(path.join(WEB, f), 'utf8'); } catch { continue; }
    const src = stripComments(raw);
    bytesRaw += raw.length; bytesStripped += src.length;
    const inputs = src.match(/<input\b[^>]*>/gi) || [];
    inputTotal += inputs.length;
    const rows = [];
    for (const t of inputs) {
      const v = (t.match(/\bvalue\s*=\s*"([^"]*)"/) || [])[1] || '';
      if (!v.trim() || v.includes('${')) continue;          // template render site, not a default
      const type = (t.match(/\btype\s*=\s*"([^"]+)"/) || [])[1] || '?';
      if (['checkbox', 'radio', 'hidden'].includes(type)) continue;
      if (!/[0-9$]/.test(v)) continue;
      const id = (t.match(/\bid\s*=\s*"([^"]+)"/) || [])[1] || '(no id)';
      /* ⚠️ AN <input> WITH NO id CANNOT BE LOOKED UP BY A GUARD PREDICATE, so it can never be
         proven guarded. It counts as a CANDIDATE rather than being skipped — an element the
         census cannot clear is not the same as one it has cleared. */
      const idRe = [...id].map(c => (/[A-Za-z0-9_]/.test(c) ? c : '\\' + c)).join('');
      const guarded = id !== '(no id)'
        && new RegExp('Answered[^;]{0,400}' + idRe, 's').test(src);
      rows.push({ id, type, v, guarded });
    }
    if (rows.length) perFile.push({ f, rows });
  }
  const all      = perFile.flatMap(p => p.rows);
  const unproven = all.filter(r => !r.guarded);
  perFile.sort((a, b) => (a.f === 'studio.html' ? -1 : b.f === 'studio.html' ? 1 : b.rows.length - a.rows.length));

  console.log(`  population: ${B(htmlFiles.length)} tracked .html files · ${B(bytesRaw.toLocaleString())} bytes`
            + ` · ${B(inputTotal)} <input> elements`);
  console.log(DIM(`              comments stripped before counting — ${(bytesRaw - bytesStripped).toLocaleString()} bytes removed (§82.2332)`));
  console.log(`    ${String(all.length).padStart(2)}  carry a hardcoded NUMBER or $ a user did not type ${DIM('(template sites excluded)')}`);
  console.log(GRN(`    ${String(all.length - unproven.length).padStart(2)}  guarded by an Answered-predicate — a resting position, correctly`));
  console.log(YEL(`    ${String(unproven.length).padStart(2)}  ⚠️ CANDIDATES — unproven either way. A guarded resting position is correct;`));
  console.log(YEL('        one read straight is a default. This census cannot tell them apart.'));
  for (const p of perFile) {
    console.log(DIM(`         ── ${p.f}  (${p.rows.length})`));
    for (const r of p.rows)
      console.log(`         ${r.guarded ? GRN('guarded') : YEL('  ?    ')}  ${r.id.padEnd(26)} ${DIM(r.type.padEnd(7))} ${r.v}`);
  }
}

/* ── THE THIRD POPULATION · WHERE ELSE THE DEFAULT IS RE-CREATED ──────────────
   ⛔⛔ THE SCHEMA COUNT IS THE ONE EVERYBODY QUOTES AND IT IS THE SMALLER HALF. Deleting
      `plan_end_age = 93` from CalculateRequest does NOT delete 93 from the engine: it is rebuilt
      in function signatures and in `params.get(name, literal)` calls that four separate doors
      reach WITHOUT passing through the schema at all.
   🔑 A VALUE DELETED IN ONE LAYER IS DELETED **THERE**. Until a field's site count reads 0, its
      schema change is cosmetic and the engine still answers for a stranger — from a different
      line, with every schema gate green. */
console.log('');
const subs = eng?.blocks?.clause2_substitution_sites;
if (engErr || !subs || subs.REFUSED) {
  console.log(RED(`  ⛔ SUBSTITUTION CENSUS COULD NOT BE TAKEN — ${engErr || subs?.REFUSED || 'block absent'}`));
} else {
  const fields = Object.entries(subs.by_field);
  console.log(`  population: ${B(subs.population_fields)} life-bearing fields × ${B(subs.population_files)} engine .py files`
            + DIM('   (AST walk, never a grep — a comment cannot be counted)'));
  console.log(subs.total_sites
    ? RED(`    ${String(subs.total_sites).padStart(2)}  ⛔ SITES THAT RE-CREATE A DEFAULT OUTSIDE THE SCHEMA`)
    : GRN('     0  ✅ no default is rebuilt downstream — the schema is the only door'));
  for (const [name, sites] of fields) {
    if (!sites.length) { console.log(GRN(`         ${name.padEnd(22)} 0`)); continue; }
    console.log(RED(`         ${name.padEnd(22)} ${sites.length}`));
    for (const s of sites) console.log(DIM(`             ${s.file}:${s.line}  ${s.shape}`));
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
