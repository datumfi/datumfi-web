/* DEV-ONLY census — WHICH GATES HAVE EVER BEEN SHOWN TO BE ABLE TO FAIL.
 *
 * ⛔⛔ READ THE POPULATION BEFORE THE NUMBER. §82.2735 — an instrument's population is part of its
 *    result, and this one's population is NOT "gates that have gone red in a real run". NOTHING IN
 *    THIS REPO RECORDS RUN HISTORY. There is no pass/fail ledger, so "has this leg ever fired?"
 *    cannot be answered from the tree, and a census that claimed to answer it would be inventing
 *    evidence.
 *   🔑 WHAT THIS ANSWERS INSTEAD, AND IT IS A DIFFERENT QUESTION: has this gate ever been
 *      DEMONSTRATED to be capable of failing? A gate with a red-first mutation carries its own
 *      falsification — run it with the flag, the capability is removed, and the gate must report
 *      red or it fails itself. A gate without one has never been shown to bite.
 *   ⚠️ A GATE WITH NO RED-FIRST IS NOT THEREBY HOLLOW. It may be perfectly sound. What is true is
 *      that NOBODY HAS CHECKED, and the Custom Matrix leg is what that looks like when it goes
 *      wrong: `if (opt) opt.click()` against a tile deleted five days earlier — armed nothing,
 *      asserted nothing, passed every run.
 *
 * ⭐ THE STANDING PATTERN THIS SUPPORTS (Architect, 2026-09-18): A NEW CHECK SHIPS ONLY WITH A
 *    DEMONSTRATION THAT IT CAN FAIL. This census is the backlog of everything that shipped before
 *    that rule existed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = s => `[1m${s}[0m`;
const DIM = s => `[2m${s}[0m`;
const RED = s => `[31m${s}[0m`;
const GRN = s => `[32m${s}[0m`;
const YEL = s => `[33m${s}[0m`;

/* THE POPULATION — the same globbing rule _suite_baseline uses, so this counts what the suite
   counts. ⛔ NOT A HAND-TYPED ROSTER: a population a human maintains is a population that will be
   wrong, and this file exists because of one that was. */
const files = readdirSync(__dirname)
  .filter((f) => /^(_gate_|_p\d)/.test(f) && /\.(js|mjs)$/.test(f))
  .sort();

/* the one hand-maintained exclusion the suite itself carries: export-only helpers */
const HELPERS = new Set(['_gate_source.mjs']);

const RED_FIRST = /--redfirst|--red-first|RED_FIRST|REDFIRST|\bRED\b\s*=\s*process\.argv/;
const SELF_CHECK = /CONTROL INERT|RED-FIRST FAILED|inverted-dead|redfirst/i;
const QUARANTINED = /QUARANTINED/;

const armed = [], unarmed = [], quarantined = [];
for (const f of files) {
  if (HELPERS.has(f)) continue;
  const src = readFileSync(path.join(__dirname, f), 'utf8');
  if (QUARANTINED.test(src)) { quarantined.push(f); continue; }
  const hasFlag = RED_FIRST.test(src);
  const hasSelfCheck = SELF_CHECK.test(src);
  (hasFlag || hasSelfCheck ? armed : unarmed).push(f);
}

console.log('');
console.log(B('  CAN THIS GATE FAIL? — the demonstrated-falsifiability census'));
console.log(DIM('  population: ' + files.length + ' gate file(s), globbed ^(_gate_|_p\\d) x .js|.mjs'));
console.log(DIM('  ⚠️ THIS IS NOT RUN HISTORY. Nothing in this repo records whether a leg has ever'));
console.log(DIM('     actually gone red. This measures whether anyone ever PROVED it could.'));
console.log('');
console.log(GRN('  ' + String(armed.length).padStart(3) + '  carry a red-first mutation or an inert-control self-check'));
console.log(RED('  ' + String(unarmed.length).padStart(3) + '  have NEVER been demonstrated to be able to fail'));
console.log(YEL('  ' + String(quarantined.length).padStart(3) + '  QUARANTINED — verdict already declared untrustworthy'));
console.log('');
console.log(B('  THE UNDEMONSTRATED — the Architect\'s list, to retire or to arm:'));
for (const f of unarmed) console.log('        ' + f);
if (quarantined.length) {
  console.log('');
  console.log(B('  QUARANTINED (neither green nor red counts):'));
  for (const f of quarantined) console.log('        ' + f);
}
console.log('');
console.log(DIM('  ⛔ A GATE ON THIS LIST IS NOT ACCUSED OF ANYTHING. It is either protecting something'));
console.log(DIM('     that never breaks — fine, say so and keep it — or it is a comment that costs CPU.'));
console.log(DIM('     The two are indistinguishable from outside, which is the whole point.'));
console.log('');
/* ⚠️ EXITS 0 ON PURPOSE. This is a BACKLOG, not a failure — turning it red would block every
   commit on work the Architect has reserved for himself (he retires the hollow ones BY NAME). */
process.exit(0);
