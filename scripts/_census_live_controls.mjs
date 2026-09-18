/* THE FOURTH FAILURE MODE — A CONTROL THAT EXISTS IN THE LIVE STUDIO AND NEVER REACHES THE WIRE.
 *
 * Run:  npm run census:controls
 *
 * ⛔⛔ WHY THIS FILE EXISTS. We own three instruments that watch for a value dying between a control
 *    and an answer, and ALL THREE START FROM THE PAYLOAD:
 *      · `ignored_inputs`  — the engine received it and ignored it.
 *      · `npm run reconcile` — the panel exposes it and the engine cannot accept it.
 *      · the C4 reachability harness — the engine accepts it and it changes nothing.
 *    A CONTROL THAT IS SIMPLY NEVER WRITTEN INTO THE REQUEST BODY IS INVISIBLE TO ALL THREE, because
 *    each of them begins with the set of things that arrived. §82.2662 / §82.2690.
 *
 * ⛔ THREE DEFECTS DIED IN THAT BLIND SPOT IN TWO DAYS, and the third and fourth were found by hand:
 *      · the SS timing path  — lived two sessions
 *      · the Rule of 55      — `rule_of_55_eligible` appeared NOWHERE in studio.html, while the
 *                              toggle printed a paragraph promising the penalty was waived
 *      · contribution units  — `freq` collected, eleven display sites multiply by it, payload did not
 *      · cost basis          — fifteen per-holding fields collected and collapsed into one balance
 *
 * 🔑 AND `npm run reconcile` COULD NOT HAVE CAUGHT ANY OF THEM, because its panel side reads the
 *    MOCK. This one reads `studio.html` — the file that is actually served.
 *
 * ⚠️ IT IS A CENSUS, NOT A VERDICT ON EVERY ROW. The exempt list below carries a REASON per entry
 *    and is the only thing that suppresses a row. An entry with no reason is not allowed, because an
 *    exempt list without reasons is how a census becomes a rubber stamp. Rows that are neither sent
 *    nor exempt are the finding.
 */
import { readFileSync } from 'node:fs';

/* ⛔⛔ THE SHELL COMES THROUGH studioSource(), NEVER off disk. _gate_studio_source P1 asserts it
   is the ONLY door and this file was the last one breaking that rule — it read studio.html
   directly because it was written before the split, and its own header still explains that it
   reads 'the file that is actually served'. THAT REASONING SURVIVES; the door does not.
   ⚠️ studioSource() RETURNS THE SHELL PLUS THE REGISTERED PARTS, which is a DIFFERENT population
      from the 24 parts the PAGE loads — and the difference is the whole point of PAGE_PARTS below.
      Both are kept: the registry feeds every other gate's resolver, the page's own script tags feed
      this census's reachability count. A NARROWER POPULATION AND A WIDER ONE ARE NOT INTERCHANGEABLE
      JUST BECAUSE BOTH ARE 'THE SOURCE'. */
const { studioSource } = await import('./_studio_source.cjs');
const SRC = studioSource();

/* ══ THE SERVED PAGE, NOT THE SHELL — §82.2735 ═══════════════════════════════════════════════════
 * ⛔⛔ THIS CENSUS SHIPPED READING ONE FILE AND SURVEYING TWENTY-THREE, AND IT REPORTED A CONFIDENT
 *    WRONG ANSWER IN THE LESS OBVIOUS DIRECTION: a FALSE RED. `d2-slider-datum` was reported "read
 *    NOWHERE but its own element" while scripts/studio-wantface.js reads it in four places. The
 *    instrument could not see the file.
 *    🔑 AN INSTRUMENT'S POPULATION IS PART OF ITS RESULT. "One control is read nowhere" and "one
 *       control is read nowhere in the one file I looked at" ARE DIFFERENT CLAIMS, and only the
 *       second was ever true.
 *    ⭐ THIRD INSTANCE OF ONE CLASS, and the class is now named: the $1,000 tier rounding hiding a
 *       live state-tax signal, ignored_inputs reporting a cache-key touch as consumption, and this.
 *       AN UNDER-RESOLVED INSTRUMENT DOES NOT REPORT UNCERTAINTY — IT REPORTS A CONFIDENT WRONG
 *       ANSWER, AND IT CAN COME OUT IN EITHER COLOUR.
 *
 * ⛔ THE POPULATION IS READ OFF THE PAGE'S OWN <script src> TAGS, NEVER A LIST TYPED HERE. A
 *    twenty-fourth part joins the moment studio.html loads it, with nobody remembering to come back.
 *    A POPULATION A HUMAN MAINTAINS IS A POPULATION THAT WILL BE WRONG.
 *
 * ⚠️ NAMED RESIDUAL, PRINTED EVERY RUN RATHER THAN RECORDED HERE AND FORGOTTEN: the REQUEST-BUILDER
 *    side is still sliced out of the shell alone. If a part ever contributed to the payload, this
 *    census would under-report what is WIRED — the same defect in the opposite direction, and two
 *    parts already touch market_outlook. Not fixed blind; stated. */
const PAGE_PARTS = [...new Set(
  [...SRC.matchAll(/<script[^>]*\bsrc=["']\/?(scripts\/[^"']+\.js)["']/gi)].map(m => m[1])
)];
const PART_SRC = PAGE_PARTS.map((rel) => {
  try { return readFileSync(new URL('../' + rel, import.meta.url), 'utf8'); }
  catch (e) {
    /* ⛔ A PART THE PAGE LOADS AND THIS CENSUS CANNOT READ MUST NEVER BE SKIPPED QUIETLY — that is
       the exact shape of the defect above, one layer down. */
    throw new Error('census: studio.html loads "' + rel + '" and it could not be read. '
      + 'A part that cannot be read must not be silently dropped from the population.');
  }
}).join('\n');
/* ⛔⛔ --redfirst · THE DEMONSTRATION THAT THIS CENSUS CAN STILL BITE.
 * Widening a population is the one change that can silently turn an instrument into a rubber stamp:
 * read enough files and EVERY id is "referenced somewhere". So the widening ships with its own
 * falsification — a control that genuinely nothing reads is injected, and the arm must find it.
 *   🔑 A NEW CHECK SHIPS ONLY WITH A DEMONSTRATION THAT IT CAN FAIL. If this mode prints 0 orphans,
 *      the green in normal mode is worth nothing and the run exits non-zero saying so.
 * ⚠️ THE PROBE IS ADDED TO THE MARKUP ONLY, NEVER TO THE READ POPULATION — that asymmetry IS the
 *    test. An id that appears in a part would prove the opposite of what is wanted. */
const CENSUS_RED_FIRST = process.argv.includes('--redfirst');
const PROBE_ID = '__census_orphan_probe';
const SRC_FOR_MARKUP = CENSUS_RED_FIRST
  ? SRC.replace('</body>', '<input type="text" id="' + PROBE_ID + '">\n</body>')
  : SRC;
const SERVED = SRC + '\n' + PART_SRC;

const B = s => `[1m${s}[0m`;
const DIM = s => `[2m${s}[0m`;
const RED = s => `[31m${s}[0m`;
const GRN = s => `[32m${s}[0m`;
const YEL = s => `[33m${s}[0m`;

/* ── THE POPULATION · every field an account object is born with ─────────────────────────────
 * ⛔ READ OFF THE CREATION SITES, NEVER A HAND-WRITTEN LIST. A hand-written list is a second
 *    declaration of a fact the code already holds, kept in agreement by nothing but attention —
 *    and the twentieth field added next month would join the object and not the list. This is the
 *    same rule that made the `owner` repair derive from ACCOUNT_TYPE_MAP's own keys. */
const creationSites = [...SRC.matchAll(/state\.accounts\.push\(\{([^}]*)\}\)/g)];
if (!creationSites.length) {
  console.error(RED('  ⛔ CENSUS CANNOT RUN — no state.accounts.push({...}) literal found.'));
  console.error(DIM('     The population is read off the creation sites; without them this file'));
  console.error(DIM('     would report an empty set as a clean bill of health. §82 empty-green.'));
  process.exit(1);
}
const accountFields = new Set();
for (const m of creationSites) {
  for (const k of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g)) accountFields.add(k[1]);
}

/* ⛔⛔ THE CREATION LITERALS ARE NOT THE WHOLE POPULATION, AND THIS CENSUS FOUND THAT OUT ABOUT
 *    ITSELF ON ITS FIRST RUN. It reported `catchUp50` and `rateType` as exemptions naming fields
 *    that "no longer exist" — when in fact they never existed AT CREATION. They are attached to an
 *    account later, by assignment, and a population read only off the `push({...})` literals cannot
 *    see them. `acc.catchUp50` is read live at studio.html:9082 to decide a 401(k) teaching line.
 * 🔑 A CENSUS WHOSE POPULATION IS TOO NARROW REPORTS A CLEAN BILL FOR THE PART IT CAN SEE — which
 *    is the precise failure this file was built to end. So the population is the UNION of the birth
 *    fields and every field ever ASSIGNED onto an account afterwards.
 * ⚠️ AND ASSIGNMENT ALONE IS STILL NOT ENOUGH, WHICH THE SAME TWO FIELDS PROVED ON THE SECOND RUN.
 *    `catchUp50` and `rateType` are never written as a literal `acc.catchUp50 = …` either — they go
 *    through the Studio's GENERIC field updater, `acc[field] = value`, so no property name appears
 *    at the write site at all. A population built from writes saw nothing and called the exemptions
 *    stale a second time.
 * 🔑 SO THE POPULATION IS EVERY `acc.<field>` THE FILE MENTIONS, READ OR WRITTEN. `acc` is this
 *    file's settled name for an account; `a` is NOT — it is also the parameter of a hundred
 *    unrelated callbacks, and including it would drown a real finding in noise. A NARROWER PREFIX
 *    WITH A CLEAN SIGNAL BEATS A WIDER ONE THAT HAS TO BE HAND-FILTERED BACK DOWN. */
for (const m of SRC.matchAll(/\bacc\.([A-Za-z_$][\w$]*)/g)) accountFields.add(m[1]);

/* ── WHAT THE WIRE CARRIES · read off the payload builder itself ──────────────────────────── */
const payloadStart = SRC.indexOf('const accounts = state.accounts');
const payloadEnd = SRC.indexOf('return _acct;', payloadStart);
if (payloadStart < 0 || payloadEnd < 0) {
  console.error(RED('  ⛔ CENSUS CANNOT RUN — the account payload builder was not found.'));
  console.error(DIM('     Anchors: "const accounts = state.accounts" .. "return _acct;".'));
  console.error(DIM('     If the builder was renamed, FIX THIS ANCHOR — do not delete the check.'));
  process.exit(1);
}
let payload = SRC.slice(payloadStart, payloadEnd);

/* ⛔⛔ CONSUMPTION THROUGH A FUNCTION CALL IS STILL CONSUMPTION, AND THE FIRST VERSION OF THIS FILE
 *    COULD NOT SEE IT. It tested for a literal `a.<field>` inside the payload region only. The
 *    employer-match repair hands the WHOLE ACCOUNT to `_di401kMatch(a, base, salary)`, which reads
 *    matchRate, matchUpTo and vestedPct itself — so the moment the defect was fixed, this census
 *    went on reporting it as unfixed.
 * 🔑 AN INSTRUMENT THAT ONLY RECOGNISES ONE SHAPE OF CORRECTNESS WILL CALL EVERY OTHER SHAPE A
 *    DEFECT, and a census that cries wolf gets its reds ignored — which costs more than the reds
 *    were worth. So the payload text is extended with the bodies of the functions it CALLS.
 * ⚠️ ONE LEVEL DEEP AND BOUNDED, AND THAT LIMIT IS DECLARED RATHER THAN HIDDEN. A field read only
 *    by a function called BY a function called by the payload is still invisible here. That is a
 *    known gap, not a clean bill: if this census ever goes green, it has proven one level. */
const called = new Set();
for (const m of payload.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) called.add(m[1]);
for (const name of called) {
  const at = SRC.indexOf(`function ${name}(`);
  if (at < 0) continue;
  const next = SRC.indexOf('\n    function ', at + 1);
  payload += '\n' + SRC.slice(at, next > at ? next : at + 20000);
}

const readsField = f => new RegExp(`\\ba\\.${f}\\b`).test(payload)
                     || new RegExp(`\\bacc\\.${f}\\b`).test(payload);

/* ── EXEMPT, WITH A REASON EACH ──────────────────────────────────────────────────────────────
 * ⛔ A REASON IS MANDATORY. "Not needed" is not a reason; it is the sentence that was true about
 *    `owner`, `freq`, `useRule55` and `holdings` right up until each of them turned out to change
 *    money on screen. Every line here says what the engine would DO with the field if it had it. */
/* ── WHOLE FAMILIES, EACH WITH ONE REASON THAT COVERS EVERY MEMBER ──────────────────────────
 * ⚠️ A FAMILY REASON IS STILL A REASON PER FIELD — every name below resolves to a sentence, and a
 *    name that matches no family and no entry is a finding. What a family buys is honesty about
 *    the actual shape of the exemption: these are not twenty independent judgements, they are ONE
 *    judgement ("the engine models no real estate") applied twenty times, and writing it out
 *    twenty times would disguise a single decision as twenty reviewed ones. */
const FAMILIES = [
  { why: 'THE PROPERTY ARC — the engine holds no real estate. A property is not in the portfolio, '
       + 'pays no tax and throws off no income in the model, so every field describing one has '
       + 'nowhere to land. They drive the Studio\'s own carrying-cost maths and its display.',
    names: ['propAddress','propCity','propState','propStreet','propZip','propPurpose','propTaxYr',
            'homeInsYr','hoaYr','maintYr','utilYr','utilLinked','rentMonthly','isRented',
            'vacancyPct','mgmtPct','coverageTier','assetAvmSnapshot','_avmLast','useValueApi',
            'vehicleType'] },
  { why: 'THE DEBT ARC — the engine models no amortisation. It knows a balance and a contribution; '
       + 'it has no concept of a payment, a rate reset or a draw period, so a mortgage and a HELOC '
       + 'reach it as neither an asset nor a liability.',
    names: ['addPmt','minPmt','origAmount','origDate','maturityDate','nextPmtDate','termMonths',
            'interestPaidToDate','escrowYtd','pmiMonthly','rateIndex','rateMargin','rateResetDate',
            'capLifetime','capPeriodic','cltvCapPct','helocCreditLimit','helocPhase',
            'helocUsePurpose','drawPeriodEndDate','mortgageInterestPaidYr','mortgageItemizes'] },
  { why: 'IRS CONTRIBUTION LIMITS — a Studio-side coaching layer. The engine takes the contribution '
       + 'it is given and does not police it against a statutory cap, so a limit has nothing to '
       + 'change. ⚠️ That is a real simplification: a household over-contributing on paper is not '
       + 'corrected. On the backlog, not a wiring gap.',
    names: ['baseLimit','catchUp55','catchUpLimit','fifteenYear','fifteenYearLimit',
            'specialCatchUp','superCatchUp','superCatchUpLimit'] },
  { why: 'ROLLOVER BOOKKEEPING — `_conduitIsInformational` already stops an informational rollover '
       + 'being counted twice AT THE PAYLOAD FILTER, which is the only place double-counting could '
       + 'happen. The flavour of the rollover changes nothing downstream of that.',
    names: ['rollFlavor','rolloverBalance','standaloneRollover'] },
  { why: 'BROWSER-ONLY VIEW STATE — whether a panel is open, whether a review has been ticked, a '
       + 'memoised aggregate. None of it is a fact about the household.',
    names: ['showHoldings','tlhReviewed','_agg'] },
];

/* ── OPEN FINDINGS · NAMED, MEASURED, AND DELIBERATELY STILL RED ────────────────────────────
 * ⛔⛔ THESE ARE NOT EXEMPTIONS. They are defects this census found and nobody has fixed. They are
 *    listed separately so that the red is EXPLAINED rather than mysterious — and they keep the
 *    exit code red, because a census that goes green while naming a live defect has changed from
 *    an instrument into a filing cabinet. */
/* ✅ EMPTIED 2026-09-17, THE SAME DAY IT WAS FILLED. The employer match this census found on its
 *    first run is wired: matchRate, matchUpTo and vestedPct now travel through `_di401kMatch` into
 *    `annual_contribution`, at the vested percentage (§82.2704).
 * ⚠️ THE BLOCK STAYS, EMPTY. Deleting it would delete the mechanism for saying "this is a defect
 *    we have measured and not fixed" — and the next finding would have nowhere to go but an
 *    exemption, which is where real defects go to be forgotten. */
const PENDING = {};
const PENDING_NOTE =
  'studio.html carries a whole §8 401(k) EMPLOYER-MATCH ENGINE — it reads matchRate, matchUpTo, '
+ 'vestedPct and the household\'s salary and computes an annual match in dollars. The payload sends '
+ '`annual_contribution` = inflow x freq, WHICH IS THE EMPLOYEE DEFERRAL ONLY. The match is real '
+ 'money going into the account every year of the accumulation and the engine is never told about '
+ 'it. MEASURED: an employee deferring $24,000 with a 100%-up-to-6% match on a $150,000 salary is '
+ '$9,000/yr short — 22.18 POINTS OF CONFIDENCE and $257,914 of portfolio at retirement. '
+ 'It UNDERSTATES, like the contribution-unit defect, which is why nothing was pointed at it. '
+ 'FOUND BY THIS CENSUS ON ITS FIRST RUN, by nobody suspecting it.';

const EXEMPT = {
  id:            'browser-local identity; the engine keys nothing on it',
  baseId:        'consumed — it becomes `type` and `owner` via ACCOUNT_TYPE_MAP',
  value:         'consumed — it becomes `balance`',
  inflow:        'consumed — it becomes `annual_contribution` together with freq',
  freq:          'consumed — the multiplier on inflow',
  holdings:      'consumed — the per-holding layer',
  intRate:       'consumed — it becomes `interest_rate` for a savings account',
  useRule55:     'consumed — it becomes `rule_of_55_eligible`',
  name:          "the household's own label for the room; display only. ⚠️ BUT the tax disclosures "
               + 'say "this brokerage" and cannot say WHICH — worth sending the day a disclosure '
               + 'needs to name an account',
  notes:         "the household's own scratchpad; no engine concept and none wanted",
  linkedAssetId: 'structural — joins a debt to the asset it sits against, inside the browser',
  isNew:         'UI state — whether the room has been opened yet',
  isFriction:    'UI ordering only',
  isPriority:    'UI ordering only',
  exclude:       'INERT — written false at creation and never set true anywhere in this file. '
               + 'Six places honour it and _reachesEngine does not, so it LOOKS like the same '
               + 'defect shape; measured 2026-09-17, it is a Phase-III hook with no writer',
  term:          'debt term; the engine models no debt amortisation, so there is nothing to send it to',
  trustType:     'trust shape; no engine concept',
  disbursement:  'trust shape; no engine concept',
  matchBalance:  'A PORTION OF THE BALANCE, NEVER ADDED TO IT. The Studio splits an existing Roth 401(k) balance into employer / rolled-in / own-Roth buckets for display; the account total is unchanged, so the engine already has every dollar. It is read by _di401kMatch on the payload path and discarded one frame later.',
  profitSharingBalance: 'A PORTION OF THE BALANCE, NEVER ADDED TO IT. Same as matchBalance - a display split of money the engine already holds in full.',
  rolloverBalance: 'A PORTION OF THE BALANCE, NEVER ADDED TO IT, and _conduitIsInformational already stops an informational rollover being counted twice at the payload filter.',
  employerContrib: '⛔ AN HSA FIELD, NOT THE 401(k) MATCH - it offsets the household contribution against the IRS HSA limit for a display read. The engine does not police contribution limits, so there is nothing for it to change. ⚠️ IT IS NOT THE EMPLOYER MATCH and must not be wired as one: the 401(k) match travels via _di401kMatch.',
  cola:          '⛔ PER-ACCOUNT, and the engine takes ONE pension COLA at request level. A real '
               + 'mismatch, on the backlog — a household with two pensions on different '
               + 'adjustments cannot be expressed today',
  catchUp50:     'not yet an engine concept — contribution limits are not modelled',
  rateType:      'debt rate shape; no engine concept',
};


/* ═══ ARM 2 · DOES EVERY COLLECTED FIELD REACH A CONSUMER? ══════════════════════════════════
 * §82.2705, Captain-ruled. Arm 1 asks whether an account's fields reach the engine. This asks the
 * mirror question about the CONTROLS THEMSELVES: the Studio puts a box on screen, a household types
 * a fact into it, and then nothing reads it.
 * ⛔⛔ IT IS THE INVERSE OF §82.2673. That law says copy promising a field is an obligation on the
 *    engine. This is its other half: A CONTROL THAT ASKS A HOUSEHOLD FOR A FACT AND THEN DISCARDS
 *    IT IS A QUESTION ASKED IN BAD FAITH — and it is invisible to every instrument we own, because
 *    nothing is RED when nothing is WRONG, only unused.
 * ⭐ GROSS SALARY WAS THE FIRST ONE FOUND AND IT WAS FOUND BY THE CAPTAIN, NOT BY A TOOL: collected
 *    in the Architect Profile, read by a tooltip and an upkeep calculation, and never reaching the
 *    model at all — while the §8 match engine sitting beside it needed exactly that number. It is
 *    on the wire as of today.
 */
function arm2() {
  const ids = new Set();
  for (const m of SRC_FOR_MARKUP.matchAll(/<(?:input|select|textarea)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)) {
    ids.add(m[1]);
  }
  /* ⚠️ A TEMPLATED ID IS NOT A CONTROL, IT IS A FAMILY OF THEM. An id written with a template
   *    placeholder names one box PER ROOM; counting its literal source text as an id would report a
   *    permanent phantom orphan that nobody can ever close. */
  const TEMPLATE_MARK = '$' + '{';
  const real = [...ids].filter(id => !id.includes(TEMPLATE_MARK));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const bStart = SRC.indexOf('function buildStudioRequest');
  const bEnd = SRC.indexOf('window.buildStudioRequest = buildStudioRequest');
  if (bStart < 0 || bEnd < 0 || bEnd < bStart) {
    console.log(RED('  ⛔ ARM 2 CANNOT RUN — buildStudioRequest not found by its anchors.'));
    return 1;
  }
  const builder = SRC.slice(bStart, bEnd);

  const onWire = [], orphans = [], displayOnly = [];
  for (const id of real) {
    if (builder.includes(id)) { onWire.push(id); continue; }
    /* ⛔ COUNTED OVER THE SERVED PAGE — shell PLUS every part it loads. Counted over the shell alone
       this produced a false red on a control that four lines of studio-wantface.js read. */
    const refs = (SERVED.match(new RegExp(esc(id), 'g')) || []).length;
    if (refs <= 1) orphans.push(id); else displayOnly.push(id);
  }

  console.log('');
  console.log(B('  ARM 2 · EVERY COLLECTED FIELD MUST REACH A CONSUMER') + DIM('   §82.2705'));
  console.log(`  population: ${B(real.length)} input / select / textarea controls carrying an id`);
  console.log(`  read across: ${B(1 + PAGE_PARTS.length)} files — studio.html plus the ${PAGE_PARTS.length} parts it loads`
            + DIM('   (off its own <script src> tags, never a typed list)'));
  console.log(GRN(`    ${String(onWire.length).padStart(2)}  reach the request builder`));
  console.log(YEL(`    ${String(displayOnly.length).padStart(2)}  read somewhere, but NOT by the request — display, or a gap; NOT YET TRIAGED`));
  console.log(RED(`    ${String(orphans.length).padStart(2)}  read NOWHERE but their own element`));
  for (const o of orphans) console.log(RED(`          ${o}`));
  console.log('');
  console.log(DIM('  ⚠️ THE MIDDLE ROW IS A DECLARED GAP, NOT A PASS. Salary sat in it: read by a tooltip'));
  console.log(DIM('     and an upkeep sum, and never by the model. Until each of those is adjudicated'));
  console.log(DIM('     display-or-defect, this arm reports a POPULATION and a SPLIT — not a verdict.'));
  console.log(DIM('     A census that called the middle row green would be the empty-green species it'));
  console.log(DIM('     exists to catch.'));
  console.log('');
  console.log(YEL('  ⚠️ NAMED RESIDUAL — what this arm still cannot see (§82.2735):'));
  console.log(DIM('     The REQUEST-BUILDER side is sliced out of studio.html ALONE, so a control read'));
  console.log(DIM('     only by a PART that contributes to the payload would land in the middle row'));
  console.log(DIM('     instead of the top one — under-reporting what is WIRED. Two parts already'));
  console.log(DIM('     touch market_outlook. This is stated every run rather than fixed blind,'));
  console.log(DIM('     because widening it without a red-first would be the empty-green species'));
  console.log(DIM('     arriving as the cure for the false red.'));
  if (CENSUS_RED_FIRST) {
    console.log('');
    const caught = orphans.includes(PROBE_ID);
    if (!caught) {
      console.log(RED('  ❌ RED-FIRST FAILED — a control that NOTHING reads was injected into the markup'));
      console.log(RED('     and this arm did not report it. Widening the population has turned the'));
      console.log(RED('     census into a rubber stamp; its green in normal mode proves nothing.'));
      return 1;
    }
    console.log(GRN('  ✅ RED-FIRST OK — the injected unread control was reported as an orphan by name.'));
    console.log(DIM('     The widened population can still go red, so a clean run is evidence.'));
    return 0;
  }
  return orphans.length ? 1 : 0;
}

console.log('');
console.log(B('  THE LIVE-CLIENT CONTROL CENSUS') + DIM('   — studio.html, the file that is served'));
console.log(DIM('  Not the Mock. The three instruments we already own all start from the payload;'));
console.log(DIM('  this one starts from the control. §82.2690'));
console.log('');
console.log(`  population: ${B(accountFields.size)} fields an account can carry, `
          + `read off ${B(creationSites.length)} birth literal(s) plus every acc.<field> the file names`);
console.log('');

for (const fam of FAMILIES) for (const n of fam.names) if (!EXEMPT[n]) EXEMPT[n] = fam.why;

const sent = [], exempt = [], pending = [], findings = [];
for (const f of [...accountFields].sort()) {
  if (readsField(f)) { sent.push(f); continue; }
  if (PENDING[f]) { pending.push(f); continue; }
  if (EXEMPT[f]) { exempt.push(f); continue; }
  findings.push(f);
}

console.log(GRN(`  ${String(sent.length).padStart(2)}  ON THE PAYLOAD PATH`) + DIM(`   ${sent.join(' · ')}`));
/* ⚠️ "ON THE PAYLOAD PATH" IS A SMALLER CLAIM THAN "REACHES THE ENGINE", AND THE LABEL WAS
 *    CHANGED THE MOMENT THE DIFFERENCE BECAME REAL. Since the call-following above, a field
 *    counts as reached if ANY function on the payload path mentions it — and `_di401kMatch`
 *    reads matchBalance, profitSharingBalance and rolloverBalance while the payload uses only
 *    `annualMatch` and `vested` from what it returns.
 * 🔑 SO THREE OF THE NAMES IN THIS ROW ARE READ AND DISCARDED ONE FRAME LATER. Calling that
 *    row "reaches the wire" would have been a FALSE GREEN of exactly the species this file
 *    exists to catch, manufactured by the fix for the previous one. Those three are declared
 *    below on their own merits, not on this row's. */
console.log('');
console.log(`  ${String(exempt.length).padStart(2)}  ` + DIM('declared, with a reason each:'));
for (const f of exempt) {
  const why = EXEMPT[f];
  const mark = why.startsWith('⛔') ? YEL : DIM;
  console.log(mark(`        ${f.padEnd(15)} ${why}`));
}
console.log('');

/* ⚠️ THE EXEMPT LIST IS ITSELF AUDITED. A name that leaves the object must leave this list in the
 *    same commit, or the list slowly becomes a record of a Studio that no longer exists — and a
 *    stale exemption silences a real control the day that name is reused. */
const stale = Object.keys(EXEMPT).filter(f => !accountFields.has(f));
if (stale.length) {
  console.log(YEL(`  ⚠️ ${stale.length} EXEMPTION(S) NAME A FIELD THAT NO LONGER EXISTS: ${stale.join(', ')}`));
  console.log(DIM('     Remove them. A stale exemption is a silencer waiting for a name to be reused.'));
  console.log('');
}

if (pending.length) {
  console.log(RED(`  ⛔ ${pending.length} FIELD(S) ARE A KNOWN, MEASURED, UNFIXED DEFECT:`));
  console.log(RED(`        ${pending.join(' · ')}`));
  console.log('');
  for (const line of PENDING_NOTE.match(/.{1,92}(\s|$)/g)) console.log(YEL('     ' + line.trim()));
  console.log('');
}

if (!findings.length && !pending.length) {
  console.log(GRN('  ✅ CENSUS CLEAN — every field an account carries is either on the wire or'));
  console.log(GRN('     declared, by name, with a reason.'));
  console.log('');
  console.log(DIM('  ⚠️ WHAT THIS DOES NOT COVER, SAID PLAINLY: the ACCOUNT object only. The household-'));
  console.log(DIM('     level controls — sliders, toggles, the profile — are a second population and'));
  console.log(DIM('     this census does not walk them yet. A clean bill here is not a clean bill'));
  console.log(DIM('     for the Studio.'));
  const _a2 = arm2();
  process.exit(stale.length || _a2 ? 1 : 0);
}

if (!findings.length) { process.exit(1); }
arm2();
console.log(RED(`  ⛔ ${findings.length} FIELD(S) COLLECTED BY THE STUDIO AND NEITHER SENT NOR DECLARED:`));
for (const f of findings) console.log(RED(`        ${f}`));
console.log('');
console.log(DIM('  Each one is either a value the engine should have, or an exemption somebody owes'));
console.log(DIM('  a reason for. It is not allowed to be neither.'));
process.exit(1);
