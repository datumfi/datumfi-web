/* THE RED DISPOSITION LEDGER — §82.2743, the Architect's order of 19 September 2026.
 *
 * ⛔⛔ THE COUNT WAS THE FINDING. The Captain asked the same question five days apart — 14 Sep "so I
 *    guess we are back to being fine with red gates (that become permanent)" and 19 Sep "seems like
 *    if we are leaving red they will just stay red forever" — and the count was 24 BOTH TIMES. He
 *    was not repeating himself. He was reporting that nothing happened.
 *    🔑 AN OWNER AND A GREEN CONDITION MAKE A RED LEGIBLE. THEY DO NOT MAKE IT MOVE. A red that has
 *       been named, owned and documented and is still red five days later has been converted from
 *       an open defect into a DOCUMENTED open defect, and documentation is the most convincing form
 *       a stalled thing can take. THE ITEMISATION BECOMES THE ALIBI FOR THE REPAIR.
 *
 * EVERY RED CARRIES EXACTLY ONE OF FOUR DISPOSITIONS:
 *    REPAIR     — the gate is right and the product is wrong. THE ONLY ONE THAT IS A DEFECT.
 *    RE-POINT   — the product changed deliberately; the gate describes the old world. Rewrite the
 *                 assertion to the new contract. It goes green AND KEEPS GUARDING.
 *    RETIRE     — the thing it guarded no longer exists. Delete it, and record WHY.
 *    QUARANTINE — with an EXPIRY DATE and a NAMED HOLDER, and OUT OF THE HEADLINE COUNT.
 *                 ⛔ A QUARANTINE WITHOUT A DATE IS A DELETION THAT IS ASHAMED OF ITSELF.
 *
 * ⛔⛔ AND THE FINDING THIS LEDGER PRODUCED ON ITS FIRST PASS, WHICH CHANGES THE ORDER'S SHAPE:
 *    A DISPOSITION IS A PROPERTY OF A LEG, NOT OF A GATE. `_gate_save_progress` has six failing legs
 *    and they do not share an answer: four assert the OLD overwrite contract (RE-POINT) while two
 *    report behaviour nobody has ruled — a save-as-new that mints TWO rows where the leg expects
 *    one, and a new blueprint that INHERITS the open file's title. Filing the whole gate as
 *    RE-POINT would turn it green and take two unexamined findings green with it.
 *    🔑 A GATE-LEVEL DISPOSITION ON A MIXED GATE IS AN AMNESTY, NOT A TRIAGE.
 *
 * ⚠️ WHAT THIS FILE IS NOT: it is not a repair, and it does not turn anything green. It is the
 *    record that makes the headline count reportable BROKEN OUT instead of as one integer —
 *    '24 RED' IS A NUMBER WEARING THE COSTUME OF A STATUS.
 */

const B = s => `[1m${s}[0m`;
const DIM = s => `[2m${s}[0m`;
const RED = s => `[31m${s}[0m`;
const GRN = s => `[32m${s}[0m`;
const YEL = s => `[33m${s}[0m`;
const CYN = s => `[36m${s}[0m`;

/* ⛔ EVERY ROW CARRIES THE OBSERVED FAILURE, NOT A SUMMARY OF IT. A disposition argued from a gate's
   NAME is the same error as a class argued from a label — it drops every dimension it was not
   designed to hold. `evidence` is what the gate actually printed on 2026-09-19. */
const LEDGER = [
  { gate: '_gate_save_progress.js', legs: '6 of 49',
    disposition: 'RE-POINT (4 legs) + UNRULED (2 legs)', owner: 'Wirer / Architect',
    evidence: 'minted NO new archive row (1 -> 2) · written payload carries the same blueprint_id · idempotent second tap · save-as-new minted exactly one new row (2 -> 4) · a NEW blueprint is UNNAMED (got "The Harbour Plan")',
    green_when: 'the four overwrite-contract legs assert MINT-ALWAYS. ⛔ THE OTHER TWO ARE NOT RE-POINTS: 2->4 is a DOUBLE MINT and title inheritance is a behaviour nobody has ruled. Both need a ruling before any assertion is written.' },

  { gate: '_gate_d1_picker.mjs', legs: '3 of 17',
    disposition: 'RE-POINT', owner: 'Wirer',
    evidence: 'OVERWRITE: save reuses the chosen blueprint_id (not a new one) · NO new D1 row · revision bumps 1 -> 2',
    green_when: 'the G-OVERWRITE branch is rewritten to the mint-always contract. The gate header still documents a TWO-BRANCH picker (#276) whose overwrite branch the 16 Sep ruling removed.' },

  { gate: '_gate_open_by_id_staleness.js', legs: '6 of 10',
    disposition: 'RE-POINT', owner: 'Wirer',
    evidence: 'SAVE [old-overwrite]: the WRITE SUCCEEDED · STASH: the save REFRESHED the open-by-id copy · RELOAD: the blueprint shows the value he saved',
    green_when: 'the [old-overwrite] scenarios are restated against mint-always. ⚠️ The staleness question SURVIVES the re-point and must not be lost with it: an open-by-id copy going stale is still a real hazard, it is just a different one once every save mints.' },

  { gate: '_gate_d1_blueprints.mjs', legs: '3 of 23',
    disposition: 'RE-POINT', owner: 'Wirer',
    evidence: 'FIDELITY: heavy blueprint survives save->D1->reload byte-identical · ZERO holdings shed on reload (172/172) · ADDITIVE: Save writes BOTH the Clerk mirror AND the D1 row',
    green_when: 'the ADDITIVE dual-write expectation is restated. ⛔ FIDELITY AND HOLDINGS-SHED ARE NOT OBVIOUSLY RE-POINTS — a blueprint shedding holdings on reload would be a REPAIR, and these two must be settled separately from the dual-write leg.' },

  { gate: '_gate_carried_save_honesty.js', legs: '6 of 13',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'success names THE ARCHIVE as the destination ("") · a FAILED write says it did not save ("") · every failure states the work is STILL HERE · offers a way out (action="null") · the failure is STILL on screen 3s later (shown=false)',
    green_when: 'the observed strings are EMPTY — the toast is not rendering at all, which is a product defect and not a changed contract. ⚠️ Same root as _gate_save_toast_honesty below; settle them together or fix one twice.' },

  { gate: '_gate_save_toast_honesty.js', legs: '4 of 9',
    disposition: 'BLOCKED ON THE CAPTAIN', owner: 'Captain (asked 2026-09-19)',
    evidence: 'TOAST 1 CONTROL: a LIVE save still shows the success toast and the write lands (server=340000) — if this reds, every green below is meaningless',
    green_when: 'ITS OWN POSITIVE CONTROL PASSES. ⛔ THIS IS THE SEVENTH SAVE GATE AND IT IS NOT LIKE THE OTHER SIX: its control leg fails, so the four greens beneath it assert nothing. It was marked "routed to the Captain" on 16 Sep and never actually routed — A RED ROUTED TO A PERSON WHO WAS NEVER TOLD IS NOT ROUTED.' },

  { gate: '_p6_archive_parity.js', legs: '3',
    disposition: 'RE-POINT', owner: 'Wirer',
    evidence: 'BP erase: Clerk blueprint_z kept slot3 · datum_blueprint_state_3 cleared · bare-open: BP draft empty',
    green_when: 'the erase contract is restated for mint-always. Its own header already says two gates encode DIFFERENT CONTRACTS and NEITHER IS WRONG — that note is the re-point argument, written before anyone acted on it.' },

  { gate: '_gate_asset_mix_reaches_engine.mjs', legs: '1 of ~8',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: '$900k unlisted beside $10k of stock sends NOTHING (1.1% cannot answer for 100%) [LEAKED {"equity":1,...,"classified":0.011}]',
    green_when: 'the 95%-coverage cliff became a SLOPE on 2026-09-17 and this leg still asserts the all-or-nothing form. ⛔ BUT IT IS FILED REPAIR, NOT RE-POINT, AND THE DISTINCTION IS THE WHOLE POINT: the leg is testing the case the slope was NOT meant to cover — 1.1% classified — and it observes a LEAK. A 1.1% sample answering for 100% of an estate is the exact defect the cliff existed to prevent. THE SLOPE MAY HAVE OPENED A HOLE AT THE BOTTOM OF ITS OWN RANGE.' },

  { gate: '_gate_roundtrip_persistence.js', legs: '5 of 16',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'filing_status ABSENT from the file (screen shows "") · location ABSENT (screen shows "Texas") · pri/sec SS overrides saved as zeros · no healthcare key',
    green_when: 'the save format gains the five slots. ⛔ ALREADY MARKED [OWED] IN THE GATE ITSELF — the legs were written knowing they would fail, which is the honest form, and then nothing happened for days. ⚠️ LOCATION IS THE URGENT ONE NOW: it reached the engine on 2026-09-13 and moves the Range by up to $17,000, and it does not survive a save.' },

  { gate: '_gate_compute_failure_reported.js', legs: '5 of 11',
    disposition: 'RE-POINT', owner: 'Wirer',
    evidence: 'both call sites report network error [sites=1] · timeout [sites=1] · two /api/calculate call sites found [sites=1] · every call site sits after the definition',
    green_when: 'the gate asserts TWO /api/calculate call sites and the product now has ONE. A second surface was consolidated; the gate still counts the old topology. ⚠️ Re-point to "every call site, however many" rather than to "one" — A COUNT HARD-CODED IN AN ASSERTION IS THE SAME DEFECT AS A LIST HANDED OVER AS A CENSUS.' },

  { gate: '_gate_studio_source.mjs', legs: '1 of 34',
    disposition: 'REPAIRED TODAY', owner: 'Wirer',
    evidence: 'P1: 2 gate files disk-read the shell instead of studioSource() — scripts/_census_live_controls.mjs and scripts/_gate_market_climate_port.mjs',
    green_when: 'BOTH are now routed through studioSource(). ⛔⛔ AND ONE OF THE TWO WAS MINE, ADDED TODAY, AND I FILED THIS GATE "PRE-EXISTING" BECAUSE I TRIAGED BY COLOUR. It reports a COUNT and the count had gone UP. A RED YOU DID NOT CAUSE CAN HIDE A RED YOU DID. ⭐ Fixing it widened the control census from 84 fields to 113 and surfaced 29 account fields nobody had declared.' },

  { gate: '_gate_archive_hero_copy.js', legs: 'CRASH',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'GATE CRASH TypeError: Cannot read properties of undefined (reading \'includes\')',
    green_when: 'it stops throwing. ⛔ A CRASH IS NOT A RED — it renders NO verdict, so this gate is currently asserting nothing at all while being counted as though it were on guard. Highest-value cheap fix in the list.' },

  { gate: '_gate_archive_card_legibility.js', legs: '1 of 14',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'AC 7: at 1920x1080 the page no longer fits without a scrollbar (1130px content / 1080px window) — it fit exactly before the change',
    green_when: 'the archive page fits 1080 again, or the Architect rules that it need not. ⚠️ "Fit exactly before" means this had ZERO margin, so any addition breaks it — the assertion may deserve a re-point to a stated budget rather than to exactness.' },

  { gate: '_gate_dossier_seed_one_path.js', legs: '3 of 12',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'the plan-end date is not parseable · implies canonical age 85 — got null from "" · month SOURCED from DOB — want 08/2067, got ""',
    green_when: 'the dossier seed writes a plan-end date at all. The observed value is EMPTY, which is a product gap rather than a changed contract.' },

  { gate: '_gate_plan_through_typed.js', legs: '1 of 6',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'L3 AN INVALID TYPED DATE REVERTS *AND SAYS SO* [slider 78 held, warn "", display none]',
    green_when: 'an invalid typed plan-through date tells the user. ⛔⛔ THIS IS ONE OF THE TWO PRE-EXISTING UNTESTED ITEMS NAMED IN THE ONBOARDING PROMPT, IT IS LIVE ON WHAT IS SERVING, AND IT SITS ON THE SURVIVOR CASE — the Standing Goal\'s own named case. It is the highest-consequence REPAIR on this list.' },

  { gate: '_gate_start_fresh_cold_parity.js', legs: '3 of 9',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'L3 COLD PARITY: every id\'d input matches a REAL cold boot · L4 NO THIRD STATE · L8 REDRAW agrees with a real cold boot',
    green_when: 'Start Fresh produces a state identical to a cold boot. ⚠️ L4 "no field holds a value from neither the user nor the markup" is the DEFAULT-THAT-IMPOVERISHES shape — a third state is exactly where an unowned default hides.' },

  { gate: '_gate_draft_restore_wakes.js', legs: '1 of 7',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'L5 HONEST HALF: a browser with no draft still gets a cold entry, and no restore banner',
    green_when: 'a browser with no draft shows no restore banner. The NEGATIVE half of the control — and a restore banner with nothing to restore is a claim about the user\'s own work.' },

  { gate: '_gate_payload_accounted.js', legs: '1 of 3',
    disposition: 'REPAIR (instrument)', owner: 'Wirer',
    evidence: 'L0 INSTRUMENT: the door opened from an EMPTY Studio with nothing seeded — CONFIGURATION SOLO',
    green_when: 'its own fixture seeds a household. ⛔ ITS INSTRUMENT LEG IS THE FAILING ONE, so the legs beneath it are asserting over an empty Studio. Same shape as the toast gate: A CONTROL LEG THAT FAILS INVALIDATES EVERY GREEN UNDER IT. ⭐ scripts/_seed_household.cjs already exists and five gates use it.' },

  { gate: '_gate_reveal_overlay_recovers.js', legs: '0 of 13 — CLOSED 2026-09-19',
    disposition: 'CLOSED (re-point + repair + retire)', owner: 'Wirer',
    evidence: 'was: R4 a valid reveal still reaches range.html [observed /studio.html] · R5 the retry button is still wired to the reset',
    green_when: "DONE — GREEN 13/0. ⭐⭐ AND IT TOOK ALL THREE DISPOSITIONS IN ONE GATE, WHICH IS THE PROOF THAT THEY ARE PROPERTIES OF LEGS. R4 RE-POINTED from \"did we navigate to range.html\" to \"did the overlay open in the Studio\" (the 2026-09-14 cutover), and came back STRICTER — the old leg would have passed on a navigation carrying no Range at all. R6 RE-POINTED with it: its gesture was \"press Back\" and there is no navigation any more, so it now closes the overlay; the hazard it guards (the reveal used to destroy the draft on its way out) is unchanged. R5s retry-button half RETIRED — retryBtn has ZERO occurrences in the shell, it belonged to the dead #cinematic-overlay, and the reason is recorded IN the gate so nobody re-derives it as missing coverage. Its second half survives untouched. The FIXTURE was REPAIRED: it enumerated the doors it knew about and had been patched once per door already (filing status 2026-09-06, location 2026-09-09), and it carried a FALSIFIED INVARIANT — \"every jurisdiction resolves to zero state tax\", true when written and false since 2026-09-13 — which made it pick ALABAMA, one of exactly three jurisdictions that refuse on income source. It now uses the shared seeder." },

  { gate: '_gate_rollover_countonce.js', legs: '0 of 9 — CLOSED 2026-09-19',
    disposition: 'CLOSED (fixture repair — the product was correct)', owner: 'Wirer',
    evidence: 'was: default payload counts ONE balance ($100k, not $208k) · standalone opt-in restores the Conduit ($208k) — both read null',
    green_when: "DONE — GREEN 9/9, AND THE PRODUCT WAS NEVER WRONG. The two failing legs were reading null: sumDefault=null, sumStandalone=null. The builder refused, so the sums were never compared to anything. THE GATE WAS NOT REPORTING $100k INSTEAD OF $208k — IT WAS REPORTING THAT IT COULD NOT LOOK, and null !== 100000 failed both legs identically. Measured once the fixture could see: sumDefault=100,000 and sumStandalone=208,000 — exactly what the gate expected. A rollover defaults INFORMATIONAL (its dollars already counted inside a destination plan) and counts ONCE; the standalone opt-in says the rollover IS the account and restores $208,000. Both are correct and both were already built. THE FIXTURE WENT STALE FOR THE THIRD TIME — hand-typed ids, patched on 2026-09-09 for location and 2026-09-10 for Social Security and filing status. Its own comment predicted it: the sums are the subject, the household is scenery, and scenery still has to be complete or the subject is measured over a null. It now uses the shared seeder." },

  { gate: '_p7_studio_overlay_parity.js', legs: '2',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: '(b) scratch: Datum = $100k (Not set) · spend-input = $100,000 ()',
    green_when: 'a scratch Studio shows no Datum. ⛔ IT IS THE HARD-CODED $100,000 AGAIN — the same value studio-landing.js records as lighting ENDURANCE on a cold Studio. A DEFAULT THAT ANSWERS THE ONE QUESTION THE METHOD SAYS IS DERIVED LAST.' },

  { gate: '_p8_sketch_studio_roundtrip_parity.js', legs: '6',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'hops 4/5/6: PTA age box reads "85 yrs" NOT 84 (val="Not set" slider=85) · ageAtDate(planEnd,...) = null',
    green_when: 'the plan-through age survives a sketch->studio round trip. Same family as the dossier seed and the typed-date gate — all three are the plan-through date. ⭐ THREE REDS, ONE CAUSE: worth settling as one repair rather than three.' },

  { gate: '_p8_studio_direct_seed_parity.js', legs: '2',
    disposition: 'REPAIR', owner: 'Wirer',
    evidence: 'render-gate: defaults (40/65/93) WERE the pre-seed values (40/65/90) · plan-end-age DERIVED from age 85 on the DOB month = 08/2067, got ""',
    green_when: 'same cause as above. ⚠️ Note the gate still names 93 while the product ships 90 — the 93 was deleted on 2026-09-14 and this assertion did not follow it. That half is a RE-POINT inside a REPAIR.' },

  { gate: '_p5_landing_save_parity.js', legs: 'unknown',
    disposition: 'UNDIAGNOSED', owner: 'Wirer',
    evidence: 'verdict FAIL with no failing-leg line printed and pageErrors empty',
    green_when: 'IT SAYS WHAT IS WRONG. ⛔ A GATE THAT FAILS WITHOUT NAMING A LEG CANNOT BE DISPOSITIONED AT ALL — the first repair is to its reporting, not to the product. Filed UNDIAGNOSED rather than guessed, because assigning one of the four here would be a label over an unmeasured thing, which is the defect this whole ledger exists to stop.' },
];

const COUNTS = {};
for (const r of LEDGER) {
  const head = r.disposition.split(' ')[0].replace(/[()]/g, '');
  COUNTS[head] = (COUNTS[head] || 0) + 1;
}

console.log('');
console.log(B('  THE RED DISPOSITION LEDGER') + DIM('   §82.2743 · observed 2026-09-19 · ' + LEDGER.length + ' gates'));
console.log('');
console.log(DIM('  ⛔ 24 RED IS A NUMBER WEARING THE COSTUME OF A STATUS. A count that cannot go down'));
console.log(DIM('     does not report health, it reports its own age. Broken out:'));
console.log('');
const order = ['CLOSED', 'REPAIRED', 'REPAIR', 'RE-POINT', 'RETIRE', 'QUARANTINE', 'BLOCKED', 'UNRULED', 'UNDIAGNOSED'];
for (const k of order) {
  if (!COUNTS[k]) continue;
  const col = (k === 'REPAIRED' || k === 'CLOSED') ? GRN : k === 'RE-POINT' ? CYN : k === 'REPAIR' ? RED : YEL;
  console.log('    ' + col(String(COUNTS[k]).padStart(3) + '  ' + k));
}
console.log('');
for (const r of LEDGER) {
  const head = r.disposition.split(' ')[0].replace(/[()]/g, '');
  const col = (head === 'REPAIRED' || head === 'CLOSED') ? GRN : head === 'RE-POINT' ? CYN : head === 'REPAIR' ? RED : YEL;
  console.log(col('  ' + r.disposition) + DIM('  ·  ' + r.gate + '  (' + r.legs + ' legs)'));
  console.log(DIM('        owner: ') + r.owner);
  console.log(DIM('        saw  : ') + r.evidence);
  console.log(DIM('        green: ') + r.green_when);
  console.log('');
}
console.log(DIM('  ⚠️ NOTHING IN THIS FILE TURNS ANYTHING GREEN. It is the record that makes the count'));
console.log(DIM('     reportable, and the thing that stops an itemisation becoming the alibi for the repair.'));
console.log('');
process.exit(0);
