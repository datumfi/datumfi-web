/* @gate-pool: node */
'use strict';
/* _gate_cache_claims_no_freshness.js — A CACHE MAY GO STALE. IT MAY NEVER CLAIM FRESHNESS IT HAS
 * NOT VERIFIED. (2026-09-12)
 *
 * THE CLAIM, AND IT IS CONDITIONAL BY DESIGN:
 *   WHILE `_computeSig` omits any field the client actually sends, the cached-result surface must
 *   make NO assertion about the inputs being unchanged.
 *
 * ⛔⛔ WHY. `_computeSig` names 15 keys and leaves out FIVE the payload carries — filing_status,
 *    location, healthcare_annual, pension_cola, custom_weights — every one of which changes the
 *    answer. Filing status alone moves the success curve at 32 of 35 grid points (max 9.25 points,
 *    $146k vs $139k at Keystone). The surface it guards used to say "Inputs unchanged" and "Your
 *    claiming map is current — no inputs changed."
 *    ⇒ A USER COULD CHANGE THEIR FILING STATUS AND BE TOLD, IN OUR VOICE, THAT NOTHING HAD CHANGED.
 *      Not a missing update: the product telling a person something false about their own actions.
 * 🔑 A STALE VALUE IS A DEFECT. A STALE VALUE WITH A SENTENCE ASSERTING IT IS FRESH IS A LIE THE
 *    PRODUCT TELLS IN OUR VOICE.
 *
 * ⭐⭐ THE CONDITIONAL SHAPE IS THE POINT, AND IT IS WHY THIS IS NOT A HARDCODED STRING BAN.
 *    L1 measures whether the signature is still incomplete. L2 only demands silence WHEN IT IS.
 *    The day the signature derives itself from buildStudioRequest()'s own output, L1 flips, L2
 *    stops constraining, and the Architect's permanent copy may honestly say the map is current —
 *    WITHOUT ANYONE REMEMBERING TO COME BACK AND DELETE A GATE.
 *    ⛔ A GATE THAT FORBIDS A TRUE SENTENCE FOREVER, BECAUSE IT WAS FALSE ONCE, BECOMES A REASON
 *       NOT TO FIX THE UNDERLYING DEFECT. Tie the constraint to the CONDITION, never to the words.
 *
 * ⚠️ NODE-ONLY AND SOURCE-READING, DELIBERATELY. The property is about what the code CAN say, not
 *    about one render. A browser leg would prove the sentence is absent on one path and say
 *    nothing about the other branches.
 */
const path = require('path');
const { studioSource } = require('./_studio_source.cjs');

let fails = 0, passes = 0; const results = [];
function check(label, cond, detail) {
  const ok = !!cond; if (ok) passes++; else fails++;
  results.push((ok ? 'PASS  ' : 'FAIL  ') + label + (detail !== undefined ? '\n          observed: ' + detail : ''));
}

const src = studioSource();

/* ── The signature's own key list, read from the source rather than duplicated here. A copy would
      be a second maintained list of what matters, which is the defect this gate is about. */
const sigBlock = /function _computeSig\s*\([^)]*\)\s*\{([\s\S]*?)\n\s{4}\}/.exec(src);
const sigKeys = sigBlock ? [...sigBlock[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [];

/* ── Every key the client actually puts on the request body. */
const sent = new Set();
for (const m of src.matchAll(/body\.([a-z_]+)\s*=/g)) sent.add(m[1]);
/* ⛔ ANCHORED TO A PROPERTY POSITION, NOT TO "a word followed by a comma". The loose form matched
   inside string literals and ternaries and produced "alue", "pend", "trategy" — tails of longer
   words. A property only ever starts the object or follows a comma. */
const literal = /const body = \{([^}]*)\}/.exec(src);
if (literal) for (const m of literal[1].matchAll(/(?:^|[{,])\s*([a-z_][a-z_0-9]*)\s*[,:]/g)) sent.add(m[1]);
/* ⚠️ ONLY PRECISE FORMS COUNT. A first version also scraped _coArchitectFacts with a loose
   "key:" pattern and harvested FRAGMENTS out of strings and ternaries — "alue", "ge", "pend",
   "trategy", "blank". A gate that invents field names reports a defect that does not exist,
   and that costs more trust than the one it was looking for.
   🔑 AN EXTRACTOR THAT OVER-MATCHES DOES NOT FIND MORE. IT FINDS NOISE AND CALLS IT A FINDING. */
for (const k of [...sent]) if (k.length < 4) sent.delete(k);

const missing = [...sent].filter((k) => !sigKeys.includes(k)).sort();
const signatureIncomplete = missing.length > 0;

check('L0 INSTRUMENT: the signature and the payload were both located in source',
  sigKeys.length >= 10 && sent.size >= 5,
  '_computeSig keys=' + sigKeys.length + ' · payload keys found=' + sent.size
  + '\n          (a regex that matched nothing would make every leg below vacuously true)');

check('L1 THE CONDITION: is the cache signature still narrower than the payload?',
  true,   // reported, never failed — this leg MEASURES, it does not judge
  (signatureIncomplete
    ? 'INCOMPLETE — ' + missing.length + ' field(s) sent but not in the signature: ' + missing.join(', ')
    : 'COMPLETE — every sent field appears in the signature')
  + '\n          this leg never fails; it decides whether L2 constrains');

/* ── L2 — THE CONSTRAINT, APPLIED ONLY WHILE L1 SAYS INCOMPLETE. */
/* ⛔ COMMENTS ARE STRIPPED BEFORE THE BRANCH IS LOCATED, NOT AFTER. The first version searched raw
   source with a 1,600-character window and could not find the branch at all, because the
   explanatory comment now inside it is longer than the window. It then failed for "could not
   locate" — the right verdict for the wrong reason, and one that would have sent the next reader
   hunting a defect in the product instead of in the gate. */
const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
const cachedBranch = /_payload_sig\s*===\s*_computeSig\(req\)\)\s*\{([\s\S]{0,2500}?)return;/.exec(stripped);
const branchText = cachedBranch ? cachedBranch[1] : null;
const FRESHNESS = /inputs?\s+unchanged|no inputs changed|is current|still current|up to date|nothing (has )?changed/i;
/* ⛔ `?? null` IS LOAD-BEARING AND ITS ABSENCE WAS A GATE THAT COULD NEVER GO GREEN. This read
   `(branchText.match(FRESHNESS) || [])[0]`, which yields UNDEFINED on no-match — and the leg
   below compared with `=== null`. So a clean branch produced "freshness claim found: undefined"
   and a permanent RED, surviving any repair to the copy it was policing.
   🔑 A GATE THAT CANNOT GO GREEN IS THE MIRROR OF ONE THAT CANNOT GO RED, AND IT IS WORSE: the
      first is ignored within a week, and its silence then covers everything it guarded. */
const _m = branchText ? branchText.match(FRESHNESS) : null;
const claim = _m ? _m[0] : null;

if (signatureIncomplete) {
  check('L2 NO UNVERIFIABLE FRESHNESS CLAIM: the cached-map surface asserts nothing about inputs being unchanged',
    branchText !== null && claim === null,
    (branchText === null
      ? 'could not locate the cached branch — the leg cannot assert, which is a FAILURE, not a pass'
      : 'freshness claim found: ' + JSON.stringify(claim))
    + '\n          ⛔ the signature is blind to ' + missing.join(', ')
    + '\n          ⛔ so a user could change one of those and be told nothing changed');
} else {
  check('L2 LIFTED: the signature covers every sent field, so the surface MAY claim freshness',
    true,
    'the constraint has retired itself — the Architect\'s permanent copy can now say the map is current'
    + '\n          ⭐ this is the gate lifting on its own, without anyone remembering to delete it');
}

/* ── L3 — the holding line is present and says only what is true. */
check('L3 THE HOLDING LINE: the surface still tells the user what it is showing',
  branchText !== null && /Showing your last claiming map\./.test(branchText),
  branchText === null ? 'cached branch not located'
    : 'authored holding line present=' + /Showing your last claiming map\./.test(branchText)
    + '\n          a silent branch would pass L2 and leave the user with no explanation at all');

results.forEach((r) => console.log('  ' + r));
console.log('\nSCORE ' + passes + ' / ' + (passes + fails) + ' ' + (fails === 0 ? 'GREEN' : 'RED'));
console.log('SIGNATURE: ' + (signatureIncomplete
  ? 'INCOMPLETE (' + missing.length + ' blind field(s)) — L2 IS CONSTRAINING'
  : 'COMPLETE — L2 has lifted itself'));
console.log('OVERALL: ' + (fails === 0 ? 'GREEN' : 'RED'));
process.exit(fails === 0 ? 0 : 1);
