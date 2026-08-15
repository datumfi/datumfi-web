'use strict';
/* _gate_tax_unstated_suppression.js — STANDING GATE (SOURCE-TIER)
 *
 * THE CLAIM: with no tax rate stated, the Studio does not report a monthly net figure — and it says
 * so in the Architect's words rather than going quiet.
 *
 * ⛔ WHY. da229d4 stopped #eff-tax-rate opening on "22% blended estimate" — an answer the user never
 * gave — and shipped a NAMED STOPGAP: the maths still assumed 22 when unset (_TAX_WHEN_UNSET), so
 * the field SAID unset while Cash Flow Diagnostics quietly computed as though it were 22%.
 *   🔑 A HIDDEN DEFAULT IS THE SAME DEFECT AS A FABRICATED ONE, ONE LAYER DOWN: the fabricated value
 *      invents an answer; the hidden default invents it AND hides where it came from. Same family as
 *      Dossier.html's 1984-05 — and that one reached the server, because nothing stopped an invented
 *      value being treated as data.
 *
 * ── SUPPRESSION IS THE SECTION, NOT THE NUMBER ───────────────────────────────────────────────
 * monthlyNetIncome feeds freeCashFlow, which feeds the debt-acceleration advice. Suppressing only
 * the printed figure would leave a RECOMMENDATION derived from a rate nobody stated — a number
 * removed and the advice built on it kept, which is worse than either alone.
 *
 * ⚠️⚠️ THIS GATE IS SOURCE-TIER, AND THAT IS A NARROWER CLAIM THAN INTENDED. SAID PLAINLY SO NOBODY
 * READS IT AS MORE THAN IT IS.
 * The intended gate drove the real page: set the salary, choose the rate, click #measure-btn, read
 * #analysis-text-body. It could not be built cheaply, and the reasons are recorded because the next
 * person will hit them too — both MEASURED, not assumed:
 *   · `isMeasured` is a closure-scoped `let` (studio.html:4381), so the panel opens ONLY by clicking
 *     #measure-btn — `window.isMeasured = true` does nothing. Caught by the paired-presence leg,
 *     which is exactly what it exists for: two absence legs were passing over an EMPTY panel.
 *   · updateAnalysisText returns early on `validAssetTotal === 0` ("No structural load
 *     established"), and `state.accounts` is EMPTY on a cold Studio — measured, accounts=0. So a
 *     browser fixture needs a DRAFTED ESTATE before the claim is reachable at all, which is a
 *     fixture larger than this copy change.
 * ⛔ WHAT THIS GATE DOES NOT PROVE: that the rendered panel shows the authored line. It proves the
 *    branch exists, the copy is byte-exact, and the hidden default is gone. A browser leg is OWED,
 *    and is worth building when something else needs a drafted-estate fixture anyway.
 *   🔑 A NARROWED CLAIM WITH ITS LIMIT WRITTEN DOWN IS COVERAGE; A NARROWED CLAIM WEARING THE OLD
 *      NAME IS A FALSE GREEN.
 *
 * LEGS
 *   S0 · the source was read at all (a population of zero passes every assertion below)
 *   S1 · the authored line is present, BYTE-EXACT — the copy is the Architect's, and a paraphrase is
 *        a different sentence
 *   S2 · the suppression branch exists and is gated on the rate being STATED
 *   S3 · the hidden default (_TAX_WHEN_UNSET) is gone from executable code — checked with comments
 *        STRIPPED, because studio.html's own comment names it and a naive grep calls it live
 *   S4 · the else-branch still reports a figure when a rate IS stated (paired presence: "suppress
 *        everything" would satisfy S1-S3 perfectly)
 *
 * @gate-pool: node
 *
 * Run: node scripts/_gate_tax_unstated_suppression.js        (exit 0 = GREEN)
 */
const path = require('path');
/* ⛔ studioSource(), NEVER fs.readFileSync('studio.html'). _gate_studio_source enforces that this
   is the ONLY door to the Studio's source, and the first version of this gate read the file
   directly — caught on its first suite run, by a gate that exists precisely to catch it.
   ⭐ AND IT IS NOT MERE COMPLIANCE: studioSource() composes studio.html WITH its extracted parts,
   so this gate keeps measuring the right bytes on the day the split moves this code into a part.
   A gate pinned to a FILE stops being true when the code moves; one pinned to the SOURCE does not. */
const { studioSource } = require('./_studio_source.cjs');
const ROOT = path.resolve(__dirname, '..');

const AUTHORED = 'Set a tax rate above and your monthly net appears here. Until then, this figure would be a guess.';

const fails = [];
function check(name, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail != null && detail !== '' ? '  (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}

console.log('\n_gate_tax_unstated_suppression — source tier\n');

let src = '';
try { src = studioSource(); } catch (e) {
  console.error('SOURCE UNAVAILABLE — ' + e.message + '. A gate that cannot read its subject is not a pass.');
  process.exit(1);
}
/* Comments stripped for every "is it gone" assertion: this gate's subject is discussed in prose
   inside studio.html, and a naive grep would report a retired identifier as still live. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, '');

check('S0 · the source was read at all (a population of zero passes every leg below)',
  src.length > 100000, src.length + ' bytes');

check('S1 · the authored line is present, BYTE-EXACT',
  src.indexOf(AUTHORED) >= 0, src.indexOf(AUTHORED) >= 0 ? '' : 'not found verbatim');

check('S2 · the suppression branch exists and is gated on the rate being STATED',
  /if \(grossAnnual > 0 && !_taxStated\)/.test(code) && /_taxStated\s*=\s*isFinite\(/.test(code));

check('S3 · the hidden default _TAX_WHEN_UNSET is gone from executable code',
  code.indexOf('_TAX_WHEN_UNSET') < 0,
  code.indexOf('_TAX_WHEN_UNSET') < 0 ? '' : 'still live');

check('S4 · PAIRED PRESENCE — a stated rate still reports a figure ("suppress everything" must fail)',
  /\} else if \(grossAnnual > 0\) \{/.test(code) && /net monthly income is estimated at/.test(code));

console.log('\n' + (fails.length === 0 ? 'GREEN' : 'RED') + ' — ' + fails.length + ' failing');
fails.forEach((f) => console.log('   RED · ' + f));
process.exit(fails.length ? 1 : 0);
