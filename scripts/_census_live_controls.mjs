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

const SRC = readFileSync(new URL('../studio.html', import.meta.url), 'utf8');

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
const payload = SRC.slice(payloadStart, payloadEnd);
const readsField = f => new RegExp(`\\ba\\.${f}\\b`).test(payload);

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
const PENDING = {
  employerContrib:      'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
  matchRate:            'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
  matchUpTo:            'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
  matchBalance:         'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
  vestedPct:            'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
  profitSharingBalance: 'THE EMPLOYER MATCH NEVER REACHES THE ENGINE.',
};
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
  cola:          '⛔ PER-ACCOUNT, and the engine takes ONE pension COLA at request level. A real '
               + 'mismatch, on the backlog — a household with two pensions on different '
               + 'adjustments cannot be expressed today',
  catchUp50:     'not yet an engine concept — contribution limits are not modelled',
  rateType:      'debt rate shape; no engine concept',
};

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

console.log(GRN(`  ${String(sent.length).padStart(2)}  REACH THE WIRE`) + DIM(`   ${sent.join(' · ')}`));
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
  process.exit(stale.length ? 1 : 0);
}

if (!findings.length) { process.exit(1); }
console.log(RED(`  ⛔ ${findings.length} FIELD(S) COLLECTED BY THE STUDIO AND NEITHER SENT NOR DECLARED:`));
for (const f of findings) console.log(RED(`        ${f}`));
console.log('');
console.log(DIM('  Each one is either a value the engine should have, or an exemption somebody owes'));
console.log(DIM('  a reason for. It is not allowed to be neither.'));
process.exit(1);
