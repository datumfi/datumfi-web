// Canonical clean publish-root builder for datumfi.com (Cloudflare Pages).
// Ships ONLY tracked web assets (+ deploy-intrinsic config) into dist/.
// NEVER ships the repo root. Runs on Windows and the Cloudflare Linux builder.
//
// Usage:  node scripts/build-dist.mjs   ->   ./dist  (deploy that, never ".")
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const OUT = 'dist';

// Web-asset extensions that may ship.
const KEEP = new Set(['.html', '.js', '.css', '.svg', '.png', '.ico', '.json', '.webmanifest', '.txt', '.woff', '.woff2']);

// Deploy-intrinsic root/config files — copied straight from disk (not gated on
// git-tracking), so robots.txt / _headers / _redirects ship deterministically.
const CONFIG = ['_redirects', '_headers', 'robots.txt'];

// Explicit drops (web-asset extension but internal / not for the public root).
const DROP_EXACT = new Set(['package.json', 'package-lock.json', 'api-response.json', 'masterlogo.html']);
const DROP_RE = [/^\.claude\//, /^\.wrangler\//, /^workers\//, /^functions\//, /^migrations\//, /\.md$/i, /^scripts\/_/, /^_probe_/, /^claude-.*\.txt$/i, /\.(xlsx|py|ps1)$/i];

// SACRED HOSTS — must ship byte-identical (LF + content). Build ABORTS on drift.
const SACRED = {
  /* THE CANONICAL DISCLOSURE FOOTER — legal copy for FIFTEEN pages from ONE file. Declared in
     CLAUDE.md in this same commit. Sacred on a stricter rule than the rest: its absence removes a
     regulatory disclosure from every page at once. */
  'scripts/datum-footer.js': '524ee6ea6443ab24d9e1f93bcb009ff8', // §82.695 THE VEILS — the chrome now FOLLOWS the paint. Measured 2026-08-29 by flipping all 14 --paint-* to a light palette: seven surfaces were the ENTIRE 'stayed dark' list, every one spelling its colour as a raw rgba(9,18,33,0.9x). A LITERAL CANNOT BE REACHED BY A TOKEN. They now read --veil-92/95/96/97/99, derived from --paint-inkwell in tokens.css's @supports block with byte-exact rgba() fallbacks in :root. ZERO PIXELS MOVED in the dark theme (HEAD vs working tree at a 1/255 threshold; controls: HEAD-vs-HEAD 0.000%, HEAD-vs-white-body 89.077%). ⚠️ FIVE ALPHAS PRESERVED EXACTLY — 0.92/0.95/0.96/0.97/0.99 for one job is probably drift, but MERGING THEM MOVES PIXELS and this commit's whole claim is that it moves none. Guarded by scripts/_gate_veil_reaches.js, whose L3 MOVES THE PAINT rather than pinning a constant — a pinned constant would go green over the very literal this removed (2026-08-29)
  /* ── THE ERROR MONITOR, 2026-08-24 — TWO HOSTS, DECLARED IN CLAUDE.md IN THIS SAME COMMIT ──────
     ⛔⛔ THE ONLY SACRED HOSTS WHOSE FAILURE LOOKS IDENTICAL TO THEIR SUCCESS. Every other host here
     announces its own breakage — money moves, a disclosure vanishes, a modal does nothing. An error
     monitor that reports nothing looks EXACTLY like an application with no errors, so nothing
     downstream will ever complain on its behalf. That is the whole reason they are pinned. */
  'scripts/sentry-10.71.0.min.js': '01e0ee3460f57a610228f0c2b57564cb',   // THE VENDORED ERRORS-ONLY SDK, byte-identical to what browser.sentry-cdn.com served (90,590 bytes; SRI sha384-Z0GeEnLeg0yvo3LU6sdGDESgTZCwpVvZBIgcnddmSR+ovRPe8Esn+19CrZdcxC4Z). ⭐⭐ THIS PIN IS WHAT MAKES A POLICY INTO AN ARTEFACT. Replay was ruled out on PII grounds (the Studio's DOM holds real balances; masking cannot be verified without a signed-in session we do not have) and in THIS bundle `replayIntegration()` is a console.warn STUB — THE CODE IS NOT PRESENT. bundle.tracing.replay.min.js is 267,756 bytes and does contain it. A CONFIG FLAG CAN BE FLIPPED BY A FUTURE EDIT; A BUNDLE THAT DOES NOT CONTAIN THE CODE CANNOT — so the exclusion is STRUCTURAL, and this pin is what keeps it structural. The version in the filename makes an UPGRADE visible; this pin makes a SWAP visible. Two hazards, two guards. ⚠️ THESE BYTES SHOULD NEVER CHANGE: an upgrade is a new filename + new pin + new <script src> + a re-read of the replay-stub claim against the new bundle, never an in-place edit (2026-08-24)
  'scripts/datum-sentry.js': 'c1549f039c0ea4496ad06fd8e3dad790',   // THE CANONICAL INIT — DSN, hostname gate, environment tag, and the shipped proof-of-life window.datumSentryTestError(). ⛔ IT IS HALF A FEATURE: the other half is `connect-src` in studio.html's <meta> CSP, which must name https://o4511758659223552.ingest.us.sentry.io — DERIVED FROM THE DSN IN THIS FILE. Change one without the other and the SDK loads, initialises, CAPTURES FAITHFULLY, and every envelope dies at the network boundary. FINDING 17; D25 one layer up (Clerk needed the Turnstile allowlist). scripts/_gate_sentry_wired.js asserts both halves TOGETHER because either alone is a green over a dead monitor. ⚠️ HOSTNAME GATING IS LOAD-BEARING AND WAS MEASURED, NOT ASSUMED: 173 gates reference studio.html and 56 boot it from 127.0.0.1:8001, so an unconditional init would spray harness errors into the dashboard every suite run and BURY THE REAL SIGNAL UNDER NOISE FROM A BROWSER NOBODY IS SITTING AT. The datum_sentry_local / ?datum_sentry=1 override is equally load-bearing — A GATE THAT SUPPRESSES AN INSTRUMENT MUST LEAVE A DOOR TO TEST IT, OR THE SUPPRESSION ITSELF BECOMES UNMEASURABLE. 🗓️ Licence lapses ~2027-08; monitoring that lapses does not alarm, it stops telling you things (2026-08-24)   // the paragraph + the three rights links read --text-muted; the 4.51:1 floor-margin is retired and the anchors get the underline the two controls beside them already had (2026-08-16)
  /* STEP 3 · MOVE 1a — the account modal builder, the FIFTH studioSource part and the largest thing
     ever moved out of studio.html (191,633 bytes / 11.19% / one function / 22 callers). Declared in
     CLAUDE.md in this same commit. SACRED on the measured upkeep rule: absence fails silently and
     changes money on screen. ⛔ The window.X assignment form and the 4-space indent are LOAD-BEARING
     — five §20 gates anchor on the literal, two match 12-space-indented literals in their red-first
     mutations. A dedent would disarm those controls while leaving them green. */
  'scripts/studio-account-modal.js': 'cd459e4754cbabe5724a32698a6fb86d',   // MOVE 1b — 53 sole-consumed helpers ABSORBED (132,541 bytes): their only caller is the builder, which already lives here. Not a new part: §11.2 names a part for its CALLERS, and a group that reads coherent is not a module. Surface 1 -> 50 published names (2026-08-22)   // extracted verbatim from studio.html:7981-9555 (2026-08-22)
  'studio.html': 'e89f3b57b3ff8524d72f625794d40c0f',// ⚠️ ALSO IN THIS COMMIT: the :3577 SECTION NOTE, ARCHITECT-RE-AUTHORED — it ended "...driven by the dates and the capital", which OUR OWN CONSUMPTION MAP FALSIFIED (eff-tax-rate reaches out.taxMult and therefore the Shape). It now names the tax bracket, and it is TRUE ONLY WHILE eff-tax-rate REACHES taxMult AND THE OTHER SEVEN FIELDS DO NOT — if another field wires in, the sentence goes back to the Architect, never patched here. ⛔⛔ AND THE pageshow HANDLER IS ONE LINE ON PURPOSE: written across four, it left _gate_coarch_reveal_matches_toggle BOTH unable to SEE the sync (its filter is line-based) AND unable to MUTATE it (--defect/--replay anchor on the single-line text) — TWO CONTROLS OVER AN F71 DATA-LOSS DEFECT, DISARMED BY A FORMATTING CHOICE, and the gate refused loudly rather than passing. If it must grow, fix that parser in the same commit. ⛔⛔ GROUP A — THE PROFILE STOPS DENYING NUMBERS IT DOES HAVE (2026-09-05). Cause 6 removed surfaces CLAIMING a number they did not have; this removes surfaces DENYING a number they do. Same disease, opposite sign. ⭐ FIVE ITEMS, ONE COMMIT. (1) ITEM 10 — THE PREFILL WAS BOUND TO THE TRANSITION, NEVER THE STATE. `_prefillCoArchTax()` had ONE caller: the toggle's own `change` listener. It fired on solo->joint and NEVER on arrival, so EVERY RETURNING USER — anyone already joint after a reload — got no prefill, and toggling off and back was the only way to produce one. 🔑 THE FEATURE WORKED WHEN DEMONSTRATED AND FAILED WHEN USED: every existing leg reached dual mode BY CLICKING THE TOGGLE, so not one of them could ever have seen it. THE REPRODUCTION STEPS WERE THE CAMOUFLAGE. It now rides `pageshow` BESIDE `_applyCoArchVisibility`, never inside it — that function is contractually display-only and F71's gate asserts exactly that, so folding a field-writing prefill in would have broken a contract to fix a bug. ⭐ THIS IS WHAT FINALLY MAKES THE "RE-OFFERED, NOT LOST" DEFENCE OF `_given()` TRUE: nothing was re-running the prefill, so a discarded value was simply gone. ⚠️ KNOWN LIMIT: a co-architect field the user DELIBERATELY cleared is indistinguishable from one never answered and will be re-offered — the missing provenance primitive, not a defect in this repair. (2) THE CONSTRUCTION MARKER COMES OFF THREE FIELDS. "Recorded, not yet modelled." is SCAFFOLDING, not product copy — a build-progress marker whose correct maintenance is REMOVAL, not re-authoring. MEASURED CONSUMPTION MAP: salary is read by SEVEN sites (repaints on the keystroke, then needs%/wants%, upkeep load, charity%, the 401k match, combined gross, the cash-flow diagnostic, Dossier hydration) and eff-tax-rate reaches `_taxStated` AND `out.taxMult` — the Shape's ceiling, floor and datum. Their notes were FALSE. ⚠️ THE OTHER SEVEN STAY, VERBATIM, BECAUSE THEY ARE STILL TRUE — and `co-tax-bracket` is among them: A PAIRED FIELD IS TWO FIELDS, and the co-architect's bracket has NO reader even though the primary's drives the Shape. Removing all ten would have treated a true statement as a defect because its neighbours lied. 🔑 THE ABSENCE OF THE MARKER IS ITSELF A STATUS CLAIM — zero notes will mean the profile is done, and a note comes off ONLY ON PROOF OF A READER, never on intent to wire. (3) THE ONE-HOUSEHOLD NOTE IS DELETED. "For now your Shape treats you as one household" was TRUE when P8.2 shipped and f4b0a64 (F67) falsified it — `co_architect_age` now reaches the engine and a second person is modelled. A "not yet" note is A CLAIM WITH AN EXPIRY DATE AND NOBODY WATCHES THE CLOCK: it was falsified NOT BY BEING EDITED but by the product growing around it. ⚠️ #co-arch-fields SURVIVES EMPTY AND THAT IS LOAD-BEARING — `_applyCoArchVisibility` derefs it UNGUARDED and four gate files assert `fields === 'block'`. DELETE THE NOTE, KEEP THE CONTAINER. (4) PLAN-THROUGH PARITY. #co-plan-end carried `onfocus` + `_fmtRetDate` and NO DERIVATION AT ALL — a field the engine READS (`co_architect_plan_end_age`) that nothing ever helped the user fill. ⛔⛔ PARITY OF MECHANISM IS NOT PARITY OF AUTHORITY: the primary's box is a MIRROR of `sl-plan-through` and may be overwritten; THE CO-ARCHITECT HAS NO SLIDER AND THEIR BOX IS THE SOURCE, so copying the mirror's overwrite semantics would DESTROY a deliberate answer (partner through 100, self through 93). It therefore DERIVES INTO AN EMPTY FIELD ONLY and never touches a value that is there. The default is the shared plan-through AGE anchored to THEIR OWN DOB — never the primary's — which is precisely the LAST-SURVIVOR reading the engine implements. ⚠️ THE RETRACTION HALF IS DELIBERATELY ABSENT: without provenance A DERIVED DATE AND A TYPED DATE ARE THE SAME STRING, so blanking on a refused DOB would sometimes delete a real answer. ⚠️ ONE CALL SITE, INSIDE `_mirrorPlanEnd` — that function has SEVEN callers and duplicating across all seven is how a change gets half-shipped. (5) `location: 'FL'` DELETED — HYGIENE, NOT WIRING. `CalculateRequest` declares no `location` field and pydantic `extra='ignore'` DISCARDS IT AT THE DOOR; FL/MFJ are module-level numpy constants in engine/tax.py with no parameter to pass. Removing it changes NOTHING the engine computes; it removes a line that READ as wired so the next reader stops assuming a consumer. 🔑 REMOVING A FALSE IMPLICATION IS NOT SUPPLYING THE TRUTH IT IMPLIED — location is still unmodelled and its marker STAYS. GATES: `_gate_coarch_prefill_provenance` +L6 (state-bound; `--pretransition` restores the transition-only binding and reds ONLY the two L6 legs, printing the two fields EMPTY on arrival). `_p82` leg (3d) INVERTED — old expectation "the note is present verbatim", new "the element is absent AND the sentence appears nowhere" — paired with a NEW existence leg on the container, because A NEGATIVE LEG PASSES ON A BLANK PAGE. `_gate_salary_unstated_suppressed` +L8 COPY VERBATIM (`--reword` alters ONE WORD and reds ONLY L8) and +L9 MARKER INVENTORY (exactly the 7 unwired fields carry it, the 3 proven-wired do not). ⚠️ L8 DISCHARGES A DEAD `const NOTE` THIS FILE DECLARED AND NEVER USED — it READ as though it verified authored copy while verifying nothing, which is false assurance inside an instrument. ⚠️ AND THE --reword ANCHOR ABORTED AT FIRST TRY, CORRECTLY: "Until then, this figure would be a guess." appears TWICE because the clause is deliberately shared with the cash-flow diagnostic so both read as the same product speaking. (2026-09-05)   //// ⛔⛔ ZERO IS AN ANSWER; ABSENCE IS NOT — THE FOUR FABRICATED PERCENTAGES (2026-09-05, cause 6 commit 2). needs%/wants% (:5876), the upkeep load + charity% (:6050) and charity% again (:13493) all derived from `(priSal + coSal) > 0 ? ... : 0`, which CONFLATES "this household earns nothing" with "we have not been told what it earns" and printed the second one as a confident 0%. ⛔⛔ AND THE LOAD BADGE DID WORSE THAN PRINT A WRONG NUMBER: a fabricated loadPct of 0 is < 50, which ADDED .healthy and painted the HUD teal — a user whose salary we never had was shown CONGRATULATIONS DERIVED FROM DATA WE DO NOT HAVE. Not a wrong number: an affirmative statement that they are doing well, plus an inducement to act on it. 🔑 COLOUR IS A CLAIM AND SO IS A CSS CLASS — suppression is complete only when the surface is INDISTINGUISHABLE FROM ONE NEVER EVALUATED. ⛔ ONE FIGURE, FOUR PRESENTATION CHANNELS, ALL FOUR OFF: (a) the .healthy class, (b) the .load-pct BASE red at :1601, (c) the HUD's OWN inline red in the markup, (d) the JS-written teal. ⚠️ REMOVING .healthy IS NOT ENOUGH AND THAT IS THE TRAP: .load-pct is var(--danger) BY DEFAULT with .healthy as the OVERRIDE, so subtracting the class would have repainted a suppressed figure ALARM RED — the opposite fabrication. WHERE A DEFAULT IS ITSELF A CLAIM, SUPPRESSION BY REMOVAL RETURNS THE PRODUCT TO THAT CLAIM. The unknown state is AFFIRMATIVELY CONSTRUCTED as .load-pct.unstated (muted), never obtained by subtraction. ⚠️ THE STATIC MARKUP DEFAULTS WERE FABRICATIONS TOO — the badge shipped a danger-red "0%" and the HUD twin its own inline red "0%" for figures nothing had computed; both now ship in the SAME suppressed state the JS produces, so first paint and steady state agree. ⚖️ ONE PREDICATE, _salaryStated(), same shape as the _taxStated exemplar which suppresses a whole SECTION rather than a number (L48 reuse, not fork). ⚠️ isFinite(parseFloat(...)), NOT "> 0": A USER WHO TYPES 0 HAS ANSWERED and their answer is honoured; empty parses NaN and is silence. ⚠️ JOINT MODE NEEDS BOTH SALARIES — a partial denominator is not RANDOMLY wrong, it is wrong in the FLATTERING direction, understating the share of income every expense consumes, and a number that errs toward reassurance is the most expensive kind because nobody questions it. ⚠️ THE CHARITY STRING SUPPRESSES ONLY HALF OF ITSELF, ON PURPOSE: $0/mo is a REAL answer from real data (no charity lines entered); only the % is charity ÷ an unknown gross. REMOVING A TRUE FIGURE IS ITS OWN DISHONESTY. Its static default is RE-FITTED, not copied — the markup carries no period label where the JS writes one. ⚠️ .upkeep-load-note resets text-transform: .plumbing-summary-row is uppercase at :1600, so the authored sentence would have SHOUTED at the exact moment the product was admitting it does not know something. AUTHORED COPY IS NOT DELIVERED UNTIL ITS RENDERED FORM IS VERIFIED. Copy is Architect-authored, verbatim; the closing clause is deliberately identical to the cash-flow diagnostic's so it reads as the same product speaking. Gate: _gate_salary_unstated_suppressed.js — 14 legs, real page, driven through the product's own oninput rather than by calling the handlers. TWO SUBJECT-LEVEL MUTATIONS, DISJOINT REDS: --refab reds {L1a,L1b,L1d,L2a,L2b,L5}, --reteal reds ONLY {L1c}. ⚠️ ITS L1d/L3b FIRST USED offsetParent AND MEASURED THE WRONG THING — the Upkeep room is display:none until opened, so the suppressed arm failed honestly while the POSITIVE arm PASSED VACUOUSLY. A LEG SATISFIABLE ONLY BY ANOTHER FEATURE'S STATE IS MEASURING THAT FEATURE. (2026-09-05)   //// ⛔⛔ BLUEPRINT SCHEMA 1.0.1 -> 1.1.0 (2026-09-04). EIGHT CONTROLS THE PRODUCT ALREADY CONSUMED AND NEVER STORED. MEASURED: nothing anywhere wrote pri-salary or co-salary back -- ZERO `.value =` assignments in studio.html or any shipped script -- so they survived a reload on BROWSER FORM RESTORATION and the persistence gate was green because CHROMIUM repopulated the field. 🔑 A GREEN THAT DEPENDS ON THE HOST ENVIRONMENT IS NOT A GREEN, IT IS A COINCIDENCE; IF THE PRODUCT DOES NOT WRITE IT, THE PRODUCT DOES NOT KEEP IT. ⛔ AND SALARY IS NOT A PROFILE FIELD -- it feeds upkeep load (moInc=(pri+co)/12, then needs%/wants%), charity % of gross and the 401k match narrative; lost, they do not blank, they recompute against ZERO through the `moInc > 0` guard and print a confident answer in rooms the user never opened. A FIELD'S BLAST RADIUS IS ITS READERS, NOT ITS ROOM. ⚖ Same defect as F64 one panel later (that block is directly above the new writes and says so): six of thirteen then, these eight now. ⚠ EVERY WRITE GUARDED ON A REAL VALUE and mmYYYY() on the date -- a capture path that stores a value the user never gave LAUNDERS A DEFAULT INTO AN ANSWER. ⚠ profile gains primary_salary / co_architect_salary / co_architect_plan_end_date; tax gains method + the co-architect mirrors of filing / location / rate it ALREADY held, which is why this completes a contract rather than widening one. ⚠ co_location is stored honestly and still reaches NOTHING -- buildStudioRequest sends location:'FL' as a literal -- which is why the panel says "Recorded, not yet modelled." beside it. ⛔ DOSSIER STAYS READ-ONLY: it already prefills both salaries and nothing writes back; the return path is a separate ruling and is NOT in this commit. (2026-09-04)   //// // ⭐⭐ PHASE I DATA — THE PROFILE PANEL PORT, CAUSE 1 OF 5 (2026-09-04). Plan Configuration (net-new section) + Architect Profile, ported from Studio Mock.html md5 adc0da4ce2140db0988ac9fc978c778b, markers to V110. ⚠ THE PORT SOURCE MOVED AND THE OLD ONE IS STILL ON DISK: memory pinned the canonical mock at 4f6fc7d1, which is now 'Studio Mock OLD.html'. FAITHFUL TO THE MOCK IS MEANINGLESS WITHOUT NAMING WHICH MOCK. ⚖ Structure/classes/copy are the mock's; IDS, HANDLERS, OPTION LISTS, tabindex and the five *-warn HOSTS are LIVE'S — an id-for-id port would have deleted the warn hosts F79's doors resolve by convention and shipped every door dead. ⛔ ONE GRID, NOT THE MOCK'S TWO MODE BLOCKS, AND IT IS FORCED: the mock renders every primary field twice under different ids, so keeping live ids means pri-dob can exist ONCE; two blocks would have the user typing where nothing reads, and syncing them is a second store. Each row therefore carries BOTH label forms and CSS shows one per mode. ⛔⛔ AND MERGING TWO BLOCKS MERGES THEIR CLASS LISTS: .architect-primary-centered is the mock's SOLO half-width title (width:calc(50% - 6px)) and rode into DUAL, halving a 159px column to 73.5px against 106px of text — 'PRIMARY ARCH'. A CLASS CORRECT IN ONE MODE IS NOT NEUTRAL IN THE OTHER. ⛔ THE MOCK'S SELECTS ARE ILLUSTRATIVE: five states and four rates. Live keeps the Dossier-exact 51 and six — a verbatim port would have DELETED 46 STATES. ⭐ THE COLUMN HEADER IS THE NAME FIELD (Captain-ruled): the mock displays the names as styled kickers and never made them editable; they are click-to-edit here against the SAME primary-name/co-name the Dossier and the estate wing labels read (D13, no second store). ⚠ #co-arch-fields STAYS — six consumers incl. F71's unguarded deref — holding the co-architect note; the co COLUMN is driven by a mode class set in the same display-only function, so no display VALUE changes and F71's gate assertion (fields === 'block') is untouched. ⚠ The old switch is gone but the CHECKBOX is not: 17 readers here, 19 script files. ⚠ Filing status appended as the final dual row (Captain-ruled; the mock omits it, married-filing-separately is real). ⚠ The last-survivor disclosure is the CTA's HOVER, dual only — coupled to the engine taking max() of two plan-end ages; IF THAT CHANGES THE SENTENCE IS WRONG. ⚠ 8 fields x 2 people, of which THREE reach the engine — the other five carry no marker YET; that is cause 2. INERT: no choice drives anything, no canvas, no gating. (2026-09-04)   //// // ⛔⛔ F79 — A REFUSAL CARRIES A DOOR, NOT AN ADDRESS (2026-09-04). Captain-ruled: naming the room is not the same as opening it. The Studio is a long document and 'DOB is missing' does not say where. Every reason now carries an OPTIONAL target DOM id; a reason without one renders exactly as before, so nothing regresses. One invariant link, 'Take me there', never varied by field — a link whose words change per error becomes a sentence the user must READ before acting, and removing the reading is the point. THE SENTENCE EXPLAINS, THE LINK ACTS. ⛔⛔ AND THE DOOR WAS INERT ON ITS FIRST BUILD — MEASURED, NOT REASONED: it rendered, the target RESOLVED, and document.activeElement came back EMPTY, because #co-dob lives in data-phase='data' while Reveal lives in 'measurement' and the CSS at :386-391 display:none's every other phase. YOU CANNOT FOCUS AN ELEMENT INSIDE A HIDDEN ANCESTOR, and RESOLVES IS NOT REACHES — getElementById finds hidden elements, so an audit checking only resolution scores an inert door as a working one. The door now enters the owning phase via _studioEnterRoom() first. ⭐ THAT IS NOT A NEW NAVIGATION LAYER: it ships in scripts/studio-landing.js (SACRED), is already published on window, and the phase is read from the nearest .studio-section[data-phase] ancestor so the room map keeps ONE home. ⛔ SECOND MEASURED SURPRISE: a door onto a CONTAINER scrolled but did not move focus — A DIV IS NOT FOCUSABLE — so WEIGHTS_MUST_SUM (a sum across four .c-weight inputs) and REVEAL_NO_ACCOUNT (whose fix is to CREATE an account) left the user in the right place with their keyboard in the wrong one. tabindex='-1' is set by the door, not sprinkled through markup: programmatically focusable, NOT in the tab order. ⚠ WEIGHTS_MUST_SUM HAS TWO EMISSION SITES (:14514 array, :14557 assembly guard) and BOTH carry the target — one reason with a door on one path and not the other is the F72 asymmetry inside the commit built to abolish it. ⚠ THE CO-ARCHITECT REASON'S TRAILING INSTRUCTION IS DELETED: a sentence naming the room beside a door that opens it is the same instruction twice. ⚠ window._buildRequestErrorTarget is RESET with its siblings or a stale target opens the WRONG field — a door that works on the wrong room is worse than no door. ⚠ ALSO: ssStrategy's dead fallback was 'optimal_70' while :3889 ships 67/Full active — A DEAD DEFAULT MUST STILL AGREE WITH ITS LIVE CONTROL. Now 'full_67'. Gate: S9/S9c/S9d/S10 on _gate_reveal_refusal_speaks.js, 33 pass / 0 fail, incl. the full-surface audit table. (2026-09-04)   //// ⛔ THE CURRENT PLAN BADGE WAS MANUFACTURED (2026-09-04). buildMatrixRequest built current_ss_plan as `base.ss_strategy_primary || 'full_67'` / `base.ss_strategy_secondary || 'optimal_70'` — TWO UNDECLARED DEFAULTS IN ONE OBJECT LITERAL, AND NOT EVEN THE SAME DEFAULT. ss_strategy_secondary is set only by _coArchitectFacts(), so EVERY SOLO USER RUNNING THE SS MATRIX was handed `..._x_optimal_70` and the product pointed at a cell saying THAT IS YOUR PLAN — a claiming age for a spouse who does not exist. 🔑 NOT A WRONG NUMBER IN A MODEL: THE PRODUCT ASSERTING A FACT ABOUT THE USER'S LIFE THAT THE USER NEVER SUPPLIED. Now emitted only when BOTH axes were chosen; the field has no other reader in this file so omitting it is inert client-side. ⚠ HALF A REPAIR — the engine carried the identical expression at datum-fi main.py:_current_plan_key(), and either side alone re-manufactures what the other stops sending. ⚠ THE OTHER THREE SS SUBSTITUTION SITES (14415 co-arch strategy, 14570 primary strategy, 17847 badge primary) ARE STRUCTURALLY DEAD, MEASURED NOT ASSUMED: both button groups ship one `.active` in markup (3889/3896) and both click handlers remove-all-then-add-one, so exactly one is always selected. They are latent, not live, and 14570's fallback DISAGREES with the UI default it can never override (optimal_70 against an active 67). Census: 481 `|| <literal>` sites, 99 after dropping formatting fallbacks, EIGHT reaching the engine payload. (2026-09-04)   //// ⚖ CAPTAIN-RULED 2026-09-03, AND IT MAKES THE DIFFERENCE-FROM-THE-MOCK LIST FOUR, NOT THREE: the authored foot sentence ("Floor and Ceiling show the outer bounds. Drag Datum to test a different spending level...") is REMOVED as redundant — "Drag Datum" already appears above the curve. ⭐ THE TWO ASKS WERE ONE CHANGE, AND ONLY MEASUREMENT SHOWED IT: the Captain also wanted Retest Futures / Carry this range forward SIDE BY SIDE rather than stacked. They were ALREADY side by side here (x=1060/1182, both y=826) while the MOCK stacks them (both x=1075, y=839/885) — identical .mc-foot flex rows in both, so the mock's stacking is a CONSEQUENCE of that long sentence eating the row and wrapping .mc-actions, never a design decision. 🔑 A LAYOUT DIFFERENCE CAN BE AN ARTEFACT OF CONTENT; MEASURE BEFORE YOU 'FIX' THE LAYOUT — changing the flex rule would have been the wrong repair for a copy-length problem. ⚠ THE ELEMENT STAYS, EMPTIED, AS THE FLEX SPACER: .mc-foot is space-between, so deleting the div would have thrown the buttons to the LEFT edge. Verified after the edit — both buttons still x=1060/1182 y=826. ⛔ AND THE EMPTY STATE NO LONGER WRITES THERE. renderEmpty() used to put 'Not measured yet.' into mcFootCopy — an AUTHORED slot — so it destroyed a designer sentence on every dataless render, while the comment above DATA_SLOTS claimed the authored slots are never written by the empty state. THE CODE AND THE COMMENT DISAGREED and the screenshot is what exposed it. The empty state now has NO surface, stated as a gap: the copy pass must decide WHICH ELEMENT, not only which string. (2026-09-03)   //// ⭐ V100 CATCH-UP (2026-09-03). The port source was SIX REVISIONS STALE the day after it landed: v92 was ported from, and the canonical mock is now Studio Mock.html (md5 4f6fc7d1448ad3a51a418d03c370a640, internal markers to V100). v83/v89/v92_reattached.html NO LONGER EXIST ON DISK. 🔑 A PORT SOURCE IS A DEPENDENCY WITH A VERSION AND NOBODY WAS TRACKING ITS VERSION — record the mock's md5 AND its marker in every port commit, because "faithful to the mock" is meaningless without naming WHICH mock. ⚖ THE DEVIATION LIST WAS RE-RATIFIED, NOT INHERITED: it was written against a file that no longer exists, and a ruling whose subject has been replaced must be re-ratified. Still three, unchanged. THIS COMMIT IS PAINT ONLY — no behaviour, no engine. Three markup deltas here (the Climate chip regains .mc-climate-chip/#mcClimateChip/data-climate so V93's eleven per-climate colour rules can reach it; the Runs chip is DELETED — 0 occurrences in the mock, so the v89 entry above saying SIXTEEN DATA slots now reads FIFTEEN; it was also removed from scripts/studio-measurement.js in the same pass because deleting an element from markup alone leaves a JS reference to something that no longer exists; "Your selected line" restored to the authored "Your selected spending line"). styles/measurement.css took 66 rule instances and ONE CHANGED BODY (.mc-visual-switch[data-view="distribution"] min-height 400px -> 306px + transition, V95) — ⛔ A PURE APPEND WOULD HAVE MISSED THE CHANGED ONE. ⭐ THE SHEET IS REGENERATED, NOT HAND-PATCHED, AND THAT IS THE PROOF: the generator reproduced all 291 existing rule instances BYTE-FOR-BYTE with exactly one deletion, which is what establishes that this file is precisely the mock's mc-sequence and nothing else. ⚠️ data-climate="cooling" SHIPS AS A FIXTURE STATE and is Captain-ruled to port as written; the room is unreachable (panel hidden, nothing opens it) so its exposure today is zero, but it MUST become a driven slot when the JS lands. ⚠️ MEASUREMENT nests 06/07/08 in the mock; only 06 Climate Control belongs to Phase V — 07 Outflow Routing is Alignment (VI) and 08 Datum Builder is Endurance (VII). ⛔ THE MOCK IS THE SPECIFICATION FOR THE SURFACE, NEVER FOR THE SPINE; when they disagree the spine wins and we say so out loud. (2026-09-03)   //// ⭐⭐ THE MEASUREMENT ROOM (PHASE V) — THE SHELL LANDS. Ported from the Captain's own DATUMAE_Studio_v89_reattached.html, a design he has been maintaining separately in BOTH colour modes. 🔑 THE MOCK IS THE SPECIFICATION FOR THE SURFACE; THE LIVE FILE IS THE SPECIFICATION FOR THE BEHAVIOUR. ⛔ THE DEVIATION LIST IS CLOSED AND COUNTED AT THREE, all three living in scripts/studio-measurement.js: (1) chart orientation — Floor LOW / Ceiling HIGH, which v89's designer had ALREADY fixed, so this is now faithful to v89 and a deviation only from v83; (2) the dragger guards with Number.isFinite() — invisible, and it stops us porting the $NaNM defect along with the design; (3) the mock's SIXTEEN fixture numbers do NOT survive. ANY OTHER DIFFERENCE FROM v89 IS A DEFECT IN THE PORT, NOT A JUDGEMENT CALL. ⛔⛔ THE FIXTURES ARE THE POINT: v89 ships $118k/$144k/$168k/79% and eleven more as demo values, and a fixture wearing a real layout on a retirement surface IS F68's ×25 defect in better styling. Sixteen DATA slots ship EMPTY; the SEVEN authored COPY slots survive verbatim. ⚠ ONLY ~5KB OF ~40KB LANDS IN THE SHELL. studio.html is HTML and is NEVER cached (cf-cache-status: DYNAMIC), so every shell byte is re-downloaded on EVERY visit while a .js/.css file is fetched once and revalidated with a 304. 🔑 MOVING WORK OUT OF THE SHELL IS THE DIFFERENCE BETWEEN PAYING FOR IT ONCE AND PAYING FOR IT FOREVER — 30KB to styles/measurement.css, ~9KB to scripts/studio-measurement.js. Third room to land this way. ⛔ THE CASCADE HAZARD WAS SCOPE, NOT ORDER, AND IT WOULD HAVE SHIPPED SILENTLY: the mock declares --serif/--mono/--sans GLOBALLY while this shell scopes the same three names, with byte-identical values, to #studioOverlayWrap. Every font: rule in the ported sheet would have resolved to NOTHING and the panel would have rendered in the wrong typeface with no error. 🔑 A TOKEN THAT EXISTS IN BOTH FILES IS NOT A TOKEN THAT REACHES BOTH SURFACES. measurement.css declares them on #mcOverlay itself. ⭐ THE PORT'S CSS ORDER IS PROVEN, NOT ASSUMED: 241 selectors in v89's exact document order, verified by sequence comparison — so if a rule is overridden in the port it is overridden in the mock too. @media wrappers preserved; hoisting one changes WHEN it applies. ⚠ INERT BY DESIGN: the panel is `hidden`, nothing opens it, and every entry point renders the authored empty state. The reveal still navigates to range.html. Wiring is its own commit, where arriving numbers can be proven. (2026-09-02)    ⛔⛔ FINDING 74 — THE RANGE DESTROYED THE ESTATE ON THE WAY OUT. Both reveal paths called _studioClearDraft() immediately before navigating, and ROOMS LIVE IN THE DRAFT — so pressing Back from the Range returned a Studio with the PROFILE intact and ARCHITECTURE EMPTY. ⛔ THE PROFILE SURVIVED FOR A REASON WE DO NOT OWN: those are form inputs and the BROWSER caches them across a back-navigation. Two persistence mechanisms, one of them not ours. 🔑 HALF-RESTORED IS WORSE THAN EITHER EXTREME — it LOOKS like it worked, so the user hits Reveal and is refused for a reason they believe they already satisfied. ⚖ Captain-ruled: "you shouldn't have to do everything all over again — perhaps you wanted to change only 1 or 2 things." That IS the Range. A product that wipes the draft turns a dial into a form. No "already revealed" state was invented; a mark would be a new state with no surface to live on. ⛔⛔ AND F74b IS THE HALF THAT WAS NOT VISIBLE FROM THE DIFF: removing the clear BROKE THE REVEAL ITSELF. _navDrain runs _stuLeaveGuard first, and that guard blocks on DatumBlueprint.workState() reporting unsaved content — clearing the draft HAPPENED TO ZERO THAT STATE, so the reveal sailed through. With the draft surviving, the guard fired and the product's PRIMARY ACTION popped an 'are you sure you want to leave?' dialog. 🔑 NO READERS IS NOT NO PURPOSE, AND THE READER WAS THREE FUNCTIONS AWAY through a guard reading state the clear happened to reset. CHECKING THAT NO GATE DEPENDED ON IT WAS NOT CHECKING THAT NO CODE PATH DID. ⭐ CAUGHT BY R4 — the leg that asserts a valid reveal still lands — which existed only because a previous commit paired its fix with a leg guarding the path the fix could break. ⚖ THE REPAIR REUSES THE EXISTING LATCH (L48): window._stuLeaveAnswered = true, whose own comment names this case — 'THE HUMAN HAS ALREADY ANSWERED THIS DEPARTURE, SO LET IT THROUGH.' Scoped to one departure, cleared by the next real edit, so somebody who returns and keeps working is still asked on their next exit. ⚠ THE CLEAR STILL EXISTS and is still correct on Start Fresh and the leave-prompt's discard: REVEALING IS NOT DISCARDING. ⭐ Tested by ONE NEW LEG (R6) on the existing F73 gate, not a new gate file. Population unchanged at 265. (2026-09-02)    ⛔⛔ FINDING 77 — THE REFUSAL WAS A QUEUE, NOT A MESSAGE. buildStudioRequest() returned on the FIRST failure, and the reveal handler returned on the account check before it, so ONE CLICK YIELDED ONE REASON. The Captain hit REVEAL FOUR TIMES on a cold Studio: no account -> add one -> no DOB -> enter it -> no retirement date -> enter it -> finally through. ⛔ BOTH DATE ERRORS WERE ALREADY COMPUTED on the lines above the returns — the information existed and was thrown away. 🔑 A VALIDATOR THAT RETURNS ON FIRST FAILURE IS NOT REPORTING, IT IS RATIONING. ⛔ AND THE GATE MISSED IT FOR A NAMEABLE REASON: S1/S2/S3 each arranged exactly ONE fault, and this defect only exists when faults CO-OCCUR — ENUMERATING THE REASONS IS NOT ENUMERATING THEIR COMBINATIONS. ⭐ THE COLD STUDIO IS THE ONE STATE EVERY NEW USER IS GUARANTEED TO PASS THROUGH, AND THE ONE STATE NEVER TESTED. TEST THE COLD STATE FIRST. ⚖ The weights check MOVED UP to sit with the dates so a cold Studio hears it in the same breath; the assembly branch stays as a defensive guard. ⚠ THE SINGULAR GLOBALS ARE UNCHANGED — the SS Matrix reads _buildRequestError/...Field at :17537 and still receives the FIRST reason; the array is ADDITIVE. ⚠ ONE HOME for the weights sentence, now read twice — two literals would be two copies of authored copy, the divergence datum-footer.js exists to prevent. ⭐ ZERO NEW COPY: a single reason keeps its own title, several share the already-authored 'Input Error', and joining authored sentences with line breaks is presentation, not authoring. ⭐ TESTED BY ONE NEW LEG (S8) ON THE EXISTING F72 GATE, NOT A NEW GATE FILE — suite cost is now a named budget item and a fix does not automatically earn a fresh 20-second tax on every future commit. (2026-09-02)    ⛔⛔ FINDING 72 — THE REVEAL BUTTON REFUSED AND SAID NOTHING, WHILE THE REASON SAT IN A GLOBAL NOBODY READ. REVEAL YOUR RANGE had THREE ways to refuse in TWO voices, one of them silent: no funded account lit #reveal-zero-error on a 4s timer; invalid custom weights lit a DIFFERENT element on its own 4s timer; and an unreadable date did `resetOverlayState(); return;` — no overlay, no message, no navigation. ⛔ buildStudioRequest() HAD ALREADY WRITTEN THE CAUSE to window._buildRequestError (:14306), AND THE SS MATRIX RENDERS THAT EXACT GLOBAL AT :17537, title and all. THE SAME FAILURE HAD A VOICE ON ONE SCREEN AND WAS MUTE ON THE OTHER — a derivation living only in the one caller that went through it, third instance this arc after F67. ⭐ CAPTAIN-FOUND, and the sequence is the indictment: the ONE working message told him to add an account, he added it, and the next refusal was silent. ⚖ RULED PARITY WITH THE SS AREA — THE SAME BUILDER, NEVER THE SAME INSTANCE: #ss-map-status lives in sec-income-layer (UNCERTAINTY) while the button lives in sec-climate (MEASUREMENT), so calling setStatus() would render Measurement's refusal into a room the user is not standing in. statusBox() is published as window._datumStatusBox and a new #reveal-status host renders it. ⭐ ZERO NEW COPY — every sentence and every title already shipped; the field-name-or-'Input Error' mapping is lifted verbatim from :17537. ⚖ AND PARITY INCLUDES PERSISTENCE: BOTH 4s TIMERS ARE GONE. 🔑 AN ERROR THAT ERASES ITSELF IS THE SAME DEFECT ON A SHORTER CLOCK — the user looks back and the reason is gone. It clears when the user ACTS. ⚠ AND THE GATE FOUND A REAL GAP IN THE FIX, NOT A FIXTURE FAULT: the clear was bound to input+change, and a room added from the PICKER fires neither — so the user did exactly what the message asked and the message stayed. addInstance() now retires it. ⚠ THE WEIGHTS SENTENCE MOVED VERBATIM into the global rather than being duplicated; two homes for one authored sentence is the divergence datum-footer.js exists to prevent. ⚠ statusBox's body div carries a CLASS now, not id="ss-map-poll-sub" — two surfaces rendering one builder would have emitted a duplicate id. Nothing reads it today; a duplicate id with no readers is a defect waiting for its first consumer. Gate: _gate_reveal_refusal_speaks.js (7 legs / 14 checks; RED-FIRST 6 of 13, S2 printing visibleCount=0 beside buildErr='Enter Date of Birth as MM / YYYY.'). ⚠ S4 AND S5 WERE MOVED OFF S2'S FIXTURE MID-BUILD — on the silent refusal they could not tell 'erased itself' from 'never appeared', and S5 passed because a CLOCK had cleared it. A LEG MUST FAIL FOR ITS OWN REASON. (2026-09-02)    ⛔⛔⛔ FINDING 73 — A LOCKED ROOM. Reveal your Range, press Back, and the tab is restored from the BACK/FORWARD CACHE exactly as it left — mid-reveal, with #cinematic-overlay still carrying `.active`. That overlay is position:fixed, 100vw x 100vh, z-index:99999, pointer-events:all when active, AND HAS NO CLOSE BUTTON. No script re-runs on a bfcache restore, so nothing was ever going to take it down. ⛔ EVERY OTHER DEFECT THIS ARC WAS A BAD EXPERIENCE; THIS ONE TRAPPED THE USER WITH NO EXIT. ⭐⭐ MEASURED IN THE BROWSER THAT REPRODUCES IT, NOT IN THE HARNESS — headless Chromium returned event.persisted=false on every arm WITH AND WITHOUT --enable-features=BackForwardCache, so the instrument could not reach the mechanism AND SAID SO. The Captain ran ONE line on the frozen screen — `document.getElementById('cinematic-overlay').className` — and it returned 'active'. A FRESH PARSE CANNOT PRODUCE THAT CLASS: nothing sets it but the reveal click, and datum_range_revealed is read only by range.html:779. State PRESERVED, not rebuilt; removing the class freed the page. 🔑 WHEN YOUR INSTRUMENT CANNOT REACH THE MECHANISM, SHIP A ONE-LINE DISCRIMINATOR THAT HAS NO OTHER EXPLANATION. ⚖ THE FIX IS A HOIST, NOT A SECOND RESET (L48): resetOverlayState() moves OUT of the click handler — it used to close over four handler-local consts, so THE ONLY CODE THAT COULD UNDO THE OVERLAY WAS CODE THAT HAD ALREADY PUT IT UP, which is exactly why the trap had no exit. The retry button and both `if (!req)` bail-outs still call it; the pageshow recovery is a THIRD caller. ⚠ THE `.active` PRECONDITION IS LOAD-BEARING: pageshow fires on EVERY entry, so without it the recovery stomps overlay/button/log state on every normal load. ⚠ DELIBERATELY NOT GATED ON event.persisted — GATE THE STATE, NOT THE ROUTE THAT PRODUCED IT, or the guard goes blind to any other way that state survives. Gate: _gate_reveal_overlay_recovers.js (5 legs / 12 checks; RED-FIRST 6 of 12, R2 printing trapped->still-trapped; TWO controls with DISJOINT reds — --defect reds R2 and leaves R3 green, --unguard reds R3 and leaves R2 green). ⛔ THE GATE'S HEADER DECLARES WHAT IT DOES NOT PROVE: it covers THE RECOVERY, never the bfcache path. (2026-09-02)    ⛔⛔ FINDING 71 — THE TOGGLE TURNED ITSELF ON BEHIND THE PAGE'S BACK. #co-arch-fields, #ss-co-arch-strategy and #ss-co-arch-estimates were revealed by exactly ONE thing in the codebase: the 'change' listener on #co-arch-toggle. Every path that turns the toggle on had to remember to fire it — a contract with the future, and THE BROWSER IS NOT A PARTY TO IT. ⛔ MEASURED 2026-09-02 on a 20-line page with ZERO Studio code (the platform made the subject before any claim about us): Chromium restores form-control state from the session-history entry AFTER every parse-time script has run, and fires NO event doing it — a bottom-of-body script read checked=false, and the checkbox was true immediately afterwards. ⛔ IT NEEDED TWO CONDITIONS, WHICH IS WHY THE SMOKE MISSED IT: measured as a factorial, draft-intact+reload and draft-intact+back BOTH revealed correctly; only draft-CLEARED+back reproduced it. The Range reveal calls _studioClearDraft() immediately before navigating (:14803), so 'generate a Range, press Back' is precisely and only the path that produces it — a reload test can never see this. ⚠ NOT COSMETIC: #ss-co-arch-estimates CONTAINS ss-sec-62/67/70, and :17501 refuses to run the SS Matrix while the toggle is checked and those are empty — the page can demand data through a form it is hiding (SOURCE-READ, not driven to that branch). 🔑 THE FIX IS A SPLIT, NOT A REPLAY: the reveal is now a pure idempotent _applyCoArchVisibility() wired to 'pageshow'; the change listener keeps the destructive half. A HANDLER THAT BOTH REVEALS AND DESTROYS CANNOT BE REPLAYED — 'just fire the change event at load' would have deleted every co-architect ACCOUNT, and that is not rhetoric: the gate's --replay control MEASURES the room going 1 -> 0. ⚠ pageshow, NOT DOMContentLoaded — the same probe read checked=false at DCL in all three arms, so a DCL hook runs BEFORE the state it exists to observe. Gate: _gate_coarch_reveal_matches_toggle.js (6 legs, RED-FIRST 3 of 12 checks on pre-fix bytes; TWO controls — --defect reds L1, --replay leaves L1 GREEN and reds L5b). (2026-09-02)    ⛔⛔ FINDING 67 — THE RANGE WAS COMPUTED FOR A HOUSEHOLD THAT DOES NOT EXIST. co_architect_age was derived ONLY inside buildMatrixRequest, so /api/calculate — the call behind the Range — never received it, and in the engine `co_architect_age = None` MEANS SINGLE (engine/income.py:495): the single-filer healthcare track, plus a schema validator that silently NULLS ss_strategy_secondary (schemas.py:135). Meanwhile engine/tax.py defines ONLY MFJ brackets and has no single bracket set at all — so the same run was MARRIED for tax and SINGLE for what it spends and receives. A household that exists in neither the tax code nor life. ⛔ MEASURED ON THE REAL ENGINE RUN LOCALLY, four household shapes, zero metered calls: a couple's sustainable spend came back $26k-$41k/yr LOW, direction stable in all four, WORST FOR THE SMALLEST ESTATE at +67% on bedrock — the error is largest for the people least able to absorb it. ⛔ THE FIX IS A WIRE, NOT AN ENGINE CHANGE: the engine has accepted co_architect_age all along and was CALIBRATED with one (calibration_output.py:29). ⛔ THE DERIVATION MOVED TO A SHARED _coArchitectFacts() USED BY BOTH PAYLOAD BUILDERS — the defect was never a wrong value, it was a derivation living in the one caller nobody else went through, which is how the Range and the SS Matrix came to describe different families on one screen. co_architect_retirement_age is now sent too; NEITHER path had ever sent it, not even the one that validates the field it comes from. ⚠ IT RETURNS null RATHER THAN A GUESS: toggle on with an unreadable DOB sends NOTHING, because a plausible default age here would be a fabricated personal fact on the surface that decides someone's money. Gating entry on a complete Profile is a different cause. Gate: _gate_co_architect_reaches_engine.js (4 legs; RED-FIRST 2/4 on pre-fix bytes, L1 printing co_architect_age=undefined). ⚠ L3's census reads CODE, NOT PROSE — its first version reddened on my own comments quoting `co_architect_age = None`. (2026-09-01)
  'sketch.html': '2de833d981dfeea7ed5a4a5ef1ae3435',   // (0b) the last --font-serif shadow deleted; Georgia is promoted into styles/typography.css instead (2026-08-16)
  /* §47.3 — SACRED as of 2026-08-13, declared in CLAUDE.md IN THIS SAME COMMIT. The two lists are
     reconciled by this build in BOTH directions, so a host added to one and not the other STOPS
     THE BUILD — which is why the nav.js / sketchbook.html gaps could exist historically and cannot
     now. ⛔ A FILE WHOSE ABSENCE FAILS SILENTLY AND CHANGES MONEY ON SCREEN IS THE DEFINITION OF
     SACRED: the leak-guard already caught this one referenced-but-untracked, and the typeof guard
     in _propUpkeepCatalogue would have degraded every property's upkeep window without an error. */
  'scripts/studio-upkeep.js': '2b62363a46ee99f85965a698a5d2502f',   // §49.3/§49.4 — winterising promoted into the upkeep hover; RV site fees named in the storage hover (2026-08-13)
  /* STEP 2a — the second studioSource part. SACRED on the same MEASURED rule as the catalogue above:
     a file whose absence fails silently and changes money on screen. Three room families (Moat,
     Cellar, Yard) read the payment figures it carries. */
  'scripts/studio-debt-cost.js': 'df016d73c4a45117681577a5b064f9ed',   // the monthly carrying cost of a debt — extracted from studio.html:9487-9504 (2026-08-13)
  /* STEP 1 — the landing. SACRED because it owns the completeness predicate: a wrong answer here
     tells the user a phase of the method is finished when it is not, on the front door. */
  'scripts/studio-landing.js': 'b05ec0756151a817bfd4ab623ae2765b',   // §82.180 THE PREBOOT PAINT REPAIR — the preboot style gains a SECOND declaration revealing .s1-header while the panel stays hidden, so first paint shows the title + thesis instead of an empty stage. The blank-stage window measured 1843ms throttled and is now 0; time-to-phases is UNCHANGED (~2600ms) — this makes nothing faster, it changes what occupies the wait. The rule's cost is now WRITTEN DOWN above it: anything moving first paint earlier without moving DCL earlier converts the saving 1:1 into blank time. Guarded by scripts/_gate_studio_preboot_paint.js (2026-08-23)   // the phase back control is '← The Studio', not '← Dashboard' — Captain-ruled 2026-08-22, reversing the 2026-08-14 ruling that §82.22's reframe (the landing IS the Studio; the seven are phases you travel to) made obsolete. Both rulings are kept in the comment: the second only makes sense against the first. Our own brand doc names the generic-dashboard problem as a failure mode Datumae exists to reject (2026-08-22)   // §82.20 THE SPINE LANDING — 7 three-line cards with icons, 4 pillars (BUILD/TEST/SHAPE/LIVE), the gradient spine; roman numerals retired from the cards (2026-08-20)
  'scripts/studio-blueprint.js': 'cab679af28e3b87131259ba8be104cfc',// ⛔⛔ BLUEPRINT SCHEMA 1.0.1 -> 1.1.0 (2026-09-04). EIGHT CONTROLS THE PRODUCT ALREADY CONSUMED AND NEVER STORED. MEASURED: nothing anywhere wrote pri-salary or co-salary back -- ZERO `.value =` assignments in studio.html or any shipped script -- so they survived a reload on BROWSER FORM RESTORATION and the persistence gate was green because CHROMIUM repopulated the field. 🔑 A GREEN THAT DEPENDS ON THE HOST ENVIRONMENT IS NOT A GREEN, IT IS A COINCIDENCE; IF THE PRODUCT DOES NOT WRITE IT, THE PRODUCT DOES NOT KEEP IT. ⛔ AND SALARY IS NOT A PROFILE FIELD -- it feeds upkeep load (moInc=(pri+co)/12, then needs%/wants%), charity % of gross and the 401k match narrative; lost, they do not blank, they recompute against ZERO through the `moInc > 0` guard and print a confident answer in rooms the user never opened. A FIELD'S BLAST RADIUS IS ITS READERS, NOT ITS ROOM. ⚖ Same defect as F64 one panel later (that block is directly above the new writes and says so): six of thirteen then, these eight now. ⚠ EVERY WRITE GUARDED ON A REAL VALUE and mmYYYY() on the date -- a capture path that stores a value the user never gave LAUNDERS A DEFAULT INTO AN ANSWER. ⚠ profile gains primary_salary / co_architect_salary / co_architect_plan_end_date; tax gains method + the co-architect mirrors of filing / location / rate it ALREADY held, which is why this completes a contract rather than widening one. ⚠ co_location is stored honestly and still reaches NOTHING -- buildStudioRequest sends location:'FL' as a literal -- which is why the panel says "Recorded, not yet modelled." beside it. ⛔ DOSSIER STAYS READ-ONLY: it already prefills both salaries and nothing writes back; the return path is a separate ruling and is NOT in this commit. (2026-09-04)   //// // ⛔⛔ F64 CAPTURE SIDE — captureDOM now stores co-dob, co-ret, the typed plan-through MONTH (plan_end_date), and the three tax controls into slots that ALREADY EXISTED and were codec-carried, written until now ONLY by applyDossier. ⛔ EVERY WRITE IS GUARDED ON A REAL USER VALUE AND THAT GUARD IS LOAD-BEARING — :1354 in this same file is the previous victim: 'pre-1.0.1 drafts round-tripped the old hard defaults (datum 120000 / tax 0.22) through captureDOM and re-poisoned the sliders on every load.' A capture path that stores a value the user never gave LAUNDERS A DEFAULT INTO AN ANSWER, and after one round-trip nothing can tell them apart. mmYYYY is used rather than the raw field because it returns '' for a half-typed date instead of storing half of one. DO NOT TIDY THESE GUARDS AWAY. (2026-09-01)
  // MISS-5 pre-work guard (2026-07-25). nav.js is a Sacred Host in CLAUDE.md but was absent from THIS map,
  // so a bad edit failed no build. It owns the centralized cross-device restore every page depends on
  // (_datumRestoreFromClerk / _restoreBlueprintFromD1 / the title mirror), and MISS-5 pre-work items 1, 2
  // and 4 all land in it — pin it BEFORE the arc that leans on it, not after.
  // NOTE: CLAUDE.md lists this host as 'scripts/nav.js'. That path does not exist; the real, page-referenced
  // file is /nav.js at the repo root (every page loads <script src="/nav.js">). Pinned at its true path.
  'nav.js': '02eb6e09670b809c09f1a3207329eebf', // §82.695 THE VEILS — the chrome now FOLLOWS the paint. Measured 2026-08-29 by flipping all 14 --paint-* to a light palette: seven surfaces were the ENTIRE 'stayed dark' list, every one spelling its colour as a raw rgba(9,18,33,0.9x). A LITERAL CANNOT BE REACHED BY A TOKEN. They now read --veil-92/95/96/97/99, derived from --paint-inkwell in tokens.css's @supports block with byte-exact rgba() fallbacks in :root. ZERO PIXELS MOVED in the dark theme (HEAD vs working tree at a 1/255 threshold; controls: HEAD-vs-HEAD 0.000%, HEAD-vs-white-body 89.077%). ⚠️ FIVE ALPHAS PRESERVED EXACTLY — 0.92/0.95/0.96/0.97/0.99 for one job is probably drift, but MERGING THEM MOVES PIXELS and this commit's whole claim is that it moves none. Guarded by scripts/_gate_veil_reaches.js, whose L3 MOVES THE PAINT rather than pinning a constant — a pinned constant would go green over the very literal this removed (2026-08-29)   // Finding 2 closed by DELETION: no estate restore on a page with no D1 (2026-08-15)
  // Same gap as nav.js above, found 2026-07-27 while wiring the erase fix: sketchbook.html is a
  // Sacred Host in CLAUDE.md but was ABSENT from this map, so the erase edit passed the build with
  // no guard at all. Pinned at its true content.
  'sketchbook.html': '1598b2c95c5e0d5a2df2cf5e8fc2504d',   // (0c) links styles/tokens.css; page-local shadows of shared names removed (2026-08-16)

  // ── MAP CLOSED 2026-07-27 ────────────────────────────────────────────────────────────────────
  // The seven below were declared Sacred in CLAUDE.md and pinned NOWHERE, so any edit to them
  // shipped with zero byte-contract. That is how the sketchbook.html erase edit got through, and
  // how nav.js got through before it — the map was being patched one file at a time, only at the
  // moment someone happened to edit that file. Reconciled all at once instead. Hashes recomputed
  // fresh from source, never pasted. THE RULE FROM HERE: every host declared Sacred in CLAUDE.md is
  // pinned here, and every host pinned here is declared there — the two lists match exactly.
  'vault.html': '23cec4ab750508441e9cde9328d2656b',   // THE RETURN ORIGIN IS THE PAGE'S OWN. 'https://datumfi.com' + returnTo silently RELOCATED a visitor across origins after sign-in — different origin means different localStorage, different sessionStorage, and none of their saved work. ⚠️ NOT a Clerk row and NOT part of the auth atomic set: this is the SITE origin, not the instance, so it is fixed independently of whatever Clerk's domain becomes. window.location.origin is correct on BOTH origins and stays correct after the move with no further edit. The portal host two lines above IS atomic and is deliberately untouched (2026-08-25)   // (0c) links styles/tokens.css; page-local shadows of shared names removed (2026-08-16) — a redirect shim; L3 cannot measure it
  'my-account.html': 'd3de43bc1bb2fa8d3ff7e672df2c420b',   // (0c) links styles/tokens.css; page-local shadows of shared names removed (2026-08-16); 4 var(--teal) reads rewritten to var(--teal-mid)
  'Blueprint.html': 'b208336da661e11beeee39b301915c0d',   // (0c) links styles/tokens.css; page-local shadows of shared names removed (2026-08-16)
  'Dossier.html': '80839874eaf6d2e911fd52dae94793df',   // (0c) links styles/tokens.css; page-local shadows of shared names removed (2026-08-16); 6 var(--teal) reads rewritten to var(--teal-mid)
  'privacy.html': '25ef58e006975e06ce28d404527c7b05',   // §3 REGISTER RESTORED — 'Sentry Privacy Policy' Title Case + trailing period, matching the four entries above it. ⭐ ARCHITECT-AUTHORED CORRECTION, NOT A WIRING TIDY-UP: both divergences shipped verbatim in e4bec43 and were FLAGGED rather than normalised, because AN UNANNOUNCED TIDY-UP IS AN EDIT WITH NO AUTHOR — L47 forbids inventing copy AND normalising it, and a wirer who silently corrects the Architect removes the Architect's only feedback channel. A PATTERN IS A PROMISE TO THE EYE: a fifth entry that breaks it reads as bolted on, which is the one impression a privacy disclosure cannot afford. ⚠️ THE SENTENCE ITSELF IS UNTOUCHED. target/_blank + rel=noopener stay — Architect-ratified, and the classification is the precedent: THE COPY BOUNDARY GOVERNS WORDS, NOT ATTRIBUTES (does it change what the sentence SAYS, or only how the browser BEHAVES?) (2026-08-24)   // SENTRY DISCLOSED IN §3 — Architect-authored, wired VERBATIM, and it lands in the SAME COMMIT as the connect-src edit that makes it true. NEW STANDING RULE (2026-08-24): ANY COMMIT THAT ADDS AN ORIGIN TO connect-src IS A PRIVACY-COPY TRIGGER AND NAMES THE ARCHITECT — §3 enumerates recipients individually with links, so the disclosure must be true ON THE DAY THE CONNECTION GOES LIVE, never in a follow-up. ⭐ THE COPY IS ONLY HONEST BECAUSE OF AN ENGINEERING CHOICE: 'It never receives...' is written in the present indefinite, which sendDefaultPii:false ALONE could not have earned — a flag can be flipped, so that would have bought 'does not currently receive'. The errors-only bundle does not CONTAIN replay, so 'Session replay is not installed' is a fact about the artefact. CONSTRUCTION-NOT-CONFIGURATION CHANGED WHAT THE COPY WAS PERMITTED TO SAY. ⚠️ Placed LAST among the named services because it is the only one that receives anything about a FAILURE rather than a VISIT; the closing 'no ad networks' line is UNCHANGED and stays true — Sentry is none of those four things (2026-08-24)   // (0a) token authority — 8 identical :root shadows deleted (2026-08-16)
  'terms.html': '8b41d3737b731ae4af84ca75b9b01278',   // (0a) token authority — 8 identical :root shadows deleted (2026-08-16)
  'scripts/account-topbar.js': '2f169c5162d0d9d2456264bdc68caa4a',   // THE NAV SERVES THE SURFACE YOU ARE ON (Captain-ruled 2026-08-22). Signed-in Studio = Home · Studio · Archive · Save · Upgrade with the toggle PINNED to the seam; signed-in Sketch = Home · Sketch · Sketchbook · Save · Upgrade. The article drops on those two surfaces only — a nav tab is a label, a hero is a sentence. The other FIVE surfaces and ALL signed-out navs keep today's bar deliberately: signed-out is a funnel, signed-in is a workspace. Nav right-oriented, not centred, so it cannot collide with the pinned toggle (2026-08-22)   // SHEET · SPLIT · STRUCTURE in the signed-IN toggle, labels AND tooltips. PART 5 renamed Drafting->SHEET and Blueprint->STRUCTURE and the rename landed in ONLY ONE of the two renderers — studio.html's signed-out #app-nav got it, this one did not, so the same control had two names depending on auth state (§24's nav fork). The tooltips are the signed-out strings ported verbatim, not redrafted (2026-08-22)   // Dossier tab retired; Sign Out is Home-only (2026-08-01)
};
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

/* ── SACRED MAP AGREEMENT (CLAUDE.md <-> SACRED{}) ────────────────────────────────────────────────
   Fence [B] added the RULE — every host declared Sacred in CLAUDE.md is pinned above, and every host
   pinned above is declared there. This is the ENFORCER, so the rule cannot quietly reopen the way it
   did twice already (nav.js 07-25, sketchbook.html 07-27): both times the map was patched one file
   at a time, only when someone happened to edit that file.

   It lives in the BUILD, not in a gate script, because only the build actually blocks — a standalone
   check rots via the dead-anchor tell (the suite is run by hand). Doctrine #34 is the precedent: the
   check that mattered was the one Cloudflare ran, not the one we meant to run.

   ⚠️ UNPARSEABLE IS NOT AGREEMENT. A parser that silently mis-scopes or returns nothing would report
   "0 mismatches" and PASS — a vacuous control of the exact class this arc keeps finding. Measured:
   a naive whole-file scan of CLAUDE.md matches 24 ` · host` lines; only 12 are the real list. Hence
   the explicit markers, the non-empty floor, and the anchor check — and a DISTINCT failure message,
   so a doc reformat reads as "I could not check", never as "all clear". */
const SACRED_ANCHOR = 'studio.html';   // must appear in any correctly-parsed declared list

function parseDeclaredHosts(mdText) {
  const start = mdText.indexOf('<!-- SACRED-LIST-START -->');
  const end = mdText.indexOf('<!-- SACRED-LIST-END -->');
  if (start === -1 || end === -1 || end < start) return null;   // null = UNPARSEABLE, never []
  const block = mdText.slice(start, end);
  return [...block.matchAll(/^ · ([^ ·\s]+)/gm)].map((m) => m[1]);
}

function compareSacred(declared, pinned) {
  if (declared === null) return { unparseable: 'markers missing or out of order' };
  if (declared.length === 0) return { unparseable: 'parsed 0 entries between the markers' };
  if (!declared.includes(SACRED_ANCHOR)) return { unparseable: `anchor "${SACRED_ANCHOR}" absent — the parse is not trustworthy` };
  return {
    declaredNotPinned: declared.filter((h) => !pinned.includes(h)),
    pinnedNotDeclared: pinned.filter((h) => !declared.includes(h)),
  };
}

/* Self-check: the comparator proves itself on every run, in memory. A comparator that cannot detect
   drift must never be able to report agreement. No repo mutation, nothing to restore, cannot be
   skipped. If any fixture misbehaves we abort and print NO verdict. */
(function selfCheckSacredComparator() {
  const A = 'studio.html';
  const cases = [
    ['detects declared-not-pinned', compareSacred([A, 'b.html'], [A]), (r) => r.declaredNotPinned && r.declaredNotPinned.includes('b.html')],
    ['detects pinned-not-declared', compareSacred([A], [A, 'b.html']), (r) => r.pinnedNotDeclared && r.pinnedNotDeclared.includes('b.html')],
    ['empty parse is UNPARSEABLE, not agreement', compareSacred([], [A]), (r) => !!r.unparseable],
    ['null parse is UNPARSEABLE, not agreement', compareSacred(null, [A]), (r) => !!r.unparseable],
    ['missing anchor is UNPARSEABLE', compareSacred(['b.html'], ['b.html']), (r) => !!r.unparseable],
    ['agreement is reported when lists match', compareSacred([A], [A]), (r) => !r.unparseable && r.declaredNotPinned.length === 0 && r.pinnedNotDeclared.length === 0],
  ];
  const bad = cases.filter(([, got, ok]) => !ok(got));
  if (bad.length) {
    console.error('SACRED MAP SELF-CHECK FAILED — the comparator cannot prove it detects drift:');
    for (const [name] of bad) console.error('  - ' + name);
    console.error('  Refusing to report a SACRED map verdict from an unproven comparator.');
    process.exit(1);
  }
})();

{
  const declared = existsSync('CLAUDE.md') ? parseDeclaredHosts(readFileSync('CLAUDE.md', 'utf8')) : null;
  const pinned = Object.keys(SACRED);
  const r = compareSacred(declared, pinned);
  if (r.unparseable) {
    console.error('SACRED MAP UNREADABLE — could not parse the declared list from CLAUDE.md');
    console.error(`  (${r.unparseable})`);
    console.error('  -> This is NOT an agreement result. Refusing to report a pass.');
    process.exit(1);
  }
  if (r.declaredNotPinned.length) {
    console.error('SACRED MAP DRIFT — declared in CLAUDE.md but NOT pinned in build-dist.mjs:');
    console.error('  ' + r.declaredNotPinned.join(', '));
    console.error('  -> These files ship with NO byte-contract. Pin them or undeclare them.');
    process.exit(1);
  }
  if (r.pinnedNotDeclared.length) {
    console.error('SACRED MAP DRIFT — pinned in build-dist.mjs but NOT declared in CLAUDE.md:');
    console.error('  ' + r.pinnedNotDeclared.join(', '));
    console.error('  -> Guarded but undocumented. Add them to the Sacred Hosts list.');
    process.exit(1);
  }
  // `npm run check:sacred` — the same comparator without a full build. CONVENIENCE ONLY; the build
  // step above is the enforcement point, because it is the one that runs whether anyone remembers.
  if (process.argv.includes('--sacred-only')) {
    console.log(`SACRED MAP OK — ${declared.length} hosts, declared and pinned agree in both directions.`);
    process.exit(0);
  }
}

// -z = NUL-delimited: correctly preserves em-dash names ("Datum FI — The Range.html").
const tracked = execFileSync('git', ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });

let web = 0;
for (const f of tracked) {
  if (CONFIG.includes(f)) continue;                 // handled below, from disk
  const keep = !DROP_EXACT.has(f) && !DROP_RE.some((r) => r.test(f)) && KEEP.has(extname(f).toLowerCase());
  if (!keep || !existsSync(f)) continue;            // !existsSync = deleted-but-tracked (xlsx, masterlogo)
  const dest = join(OUT, f);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(f, dest);
  web++;
}

let cfg = 0;
for (const c of CONFIG) {
  if (existsSync(c)) { copyFileSync(c, join(OUT, c)); cfg++; }
}
if (existsSync('.assetsignore')) copyFileSync('.assetsignore', join(OUT, '.assetsignore'));

// Sacred-host byte-identity guard.
for (const [f, want] of Object.entries(SACRED)) {
  const got = md5(join(OUT, f));
  if (got !== want) { console.error(`SACRED DRIFT — ${f}: ${got} != ${want}`); process.exit(1); }
}

// Leak guard — abort if any forbidden artifact slipped into the publish root.
for (const bad of ['.claude', 'package.json', 'package-lock.json']) {
  if (existsSync(join(OUT, bad))) { console.error(`LEAK GUARD HIT — ${bad} present in ${OUT}/`); process.exit(1); }
}

/* ── D1 CUTOVER INVARIANT ─────────────────────────────────────────────────────────────────────────────
 * D1 IS THE DRIVER. THE 4-SLOT CLERK/LS BOOK IS A SOAK-PERIOD MIRROR. A WRITE MAY ACCOMPANY IT.
 * A WRITE MAY NEVER SUBSTITUTE FOR IT.
 *
 * WHY THIS IS A BUILD STEP AND NOT A COMMENT. The code already said this, clearly, in capitals, in two
 * places — sketch.html's "DEGRADED-OFFLINE CACHE ONLY ... the net must never re-cap D1 truth" and
 * sketchbook.html's "READ-CUTOVER ... a reachable-empty D1 list is AUTHORITATIVE". Those comments are
 * exemplary and they still did not stop _autoConsumeSketch from writing ZERO D1 rows, which destroyed a
 * new user's first sketch on the conversion path. A COMMENT CANNOT FAIL A BUILD. It is a request to a
 * future reader who may be tired, mid-arc, or a fresh session with no memory of any of this. Apply the
 * amputation test to a comment and it fails instantly: delete it and nothing goes red, which means it was
 * never what was holding the line.
 *
 * THE RULE IS A POSITIVE INVARIANT ABOUT THE DRIVER, NOT A BLOCKLIST OF FORBIDDEN CALLS: any function
 * that persists a user's saved sketch/blueprint into localStorage must ALSO reach D1 in that same
 * function. It catches code by WHAT IT TOUCHES, not by what it is called, so a new writer with a spelling
 * nobody predicted is caught anyway — the same reason a defaultValue comparison beat a hand-listed set of
 * bookkeeping fields.
 *
 * IT ENCODES THE SOAK RATHER THAN ENDING IT. LS + D1 passes. LS alone fails. We are not deleting the
 * mirror today and this rule does not ask anyone to.
 * DRAFT KEYS ARE DELIBERATELY ABSENT from the governed list: a draft is not a save, and
 * writeSessionDraft writing local-only is correct behaviour, not a violation.
 *
 * ── ORIGIN IS PART OF THE RULE, AND LEAVING IT OUT MADE THE RULE UNTRUE ──────────────────────────────
 * First formulation was "any function writing a governed LS key must reach D1". MEASURED: it fired on 13
 * sites of which ONE was the defect. It flagged _applySketchBook, which populates LS *from the D1 list* —
 * the exact opposite of the bug — plus the declared Clerk fallback restore, a slot DELETE, and three
 * Studio helpers whose caller save() reaches D1 a few lines away. Twelve exemptions would have been
 * needed, and an exemption list twelve entries deep IS the ignorable comment this rule exists to replace.
 * A rule that must be silenced to be adopted was never an invariant.
 * THE DISTINGUISHING PROPERTY IS PROVENANCE, NOT THE KEY. The defect is user work that exists ONLY in the
 * mirror. Content flowing D1 -> LS is a cache being filled and is correct; content flowing USER -> LS
 * without reaching D1 is work the sketchbook will never render, because it renders from D1 and treats a
 * reachable-empty list as authoritative. So a write is governed only when the same function also touches
 * a USER-ORIGIN source: the live serializer, or the carried vault-hop snapshot.
 * WHAT THIS DELIBERATELY DOES NOT CATCH, stated rather than discovered later: user content that reaches
 * LS through some future origin named in neither list. The origins are few, central and stable, but they
 * are the one hand-maintained part of this rule and the place to look first if it ever misses something.
 *
 * ── THE BLIND SPOT. READ THIS BEFORE TRUSTING A GREEN RUN. ───────────────────────────────────────────
 * THIS RULE GUARDS AGAINST WRITING TO THE MIRROR ALONE. IT DOES NOT GUARD AGAINST WRITING NOWHERE.
 * A function that persists NOTHING AT ALL writes no localStorage, so it never matches, and it is silent,
 * green and wrong. FOUND BY EXAMPLE, not by theory: sketchbook.html's "PIN CURRENT SCENARIO" path called
 * executeSavePayloadToSlot with no payload, which set an in-memory object and showed a toast — no LS, no
 * D1, nothing durable — and this rule could not see it. A save-labelled control that persists nothing is
 * the same species of defect as one that persists only to the mirror; the user performs the gesture and
 * owns nothing either way.
 * ⚠️ THAT EXAMPLE WAS DELETED ON 2026-08-01 (it was dead scaffolding, no callers since P6.1) AND THE
 * BLIND SPOT IS UNCHANGED. Recorded deliberately: the specimen is gone, the gap it demonstrated is not,
 * and a future reader who cannot find the example must not conclude the hole was closed.
 * SO A GREEN RUN HERE MEANS "no write reached the mirror alone". IT DOES NOT MEAN "every save saves".
 * Closing it would require asserting that a control labelled save eventually persists something, which is
 * a claim about intent and reachability rather than about bytes — and the thirteen-site first draft of
 * this very rule is the standing evidence for what happens when an invariant reaches past what it can
 * actually see. Recorded rather than closed, deliberately. */
const D1_SURFACES = {
  sketch: {
    files: ['sketch.html', 'sketchbook.html'],
    lsKeys: ['datumfi_sketchbook_v1', 'datum_sketch_state_', 'datum_sketch_byid_', 'LS_KEY'],
    d1Reach: ['_d1WriteSketch', 'putDoc', 'scheduleWrite', 'writeNow'],
    // USER-ORIGIN sources: the live serializer, and the snapshot carried across the vault hop.
    origins: ['serializeSketchState', 'datumfi_sketch_current_snapshot'],
    driver: 'D1 (type=sketchbook, one row per sketch_id, unlimited)',
    mirror: 'the 4-slot Clerk/LS book (datumfi_sketchbook_v1)'
  },
  studio: {
    files: ['studio.html', 'scripts/studio-blueprint.js'],
    lsKeys: ['datum_blueprint_state_', 'datumfi_blueprint_archive_v1', 'PER_SLOT_PREFIX', 'ARCHIVE_KEY'],
    d1Reach: ['d1WriteBlueprint', 'd1WriteStudio', 'putDoc', 'scheduleWrite', 'writeNow'],
    origins: ['captureDOM', 'serializeSketchState'],
    driver: 'D1 (type=blueprint / studio)',
    mirror: 'the per-slot LS blueprint archive'
  }
};
/* THE EXEMPTION LIST IS A PLACE TO WRITE A COMMENT THE GATE AGREES TO IGNORE — which is the exact species
 * this rule exists to kill. So it is expensive on purpose, and it is EMPTY. Three conditions, all enforced
 * below, none of them optional:
 *   1 · a named reason AND a date. An exemption with no stated reason fails the build like a violation.
 *   2 · PROVEN, NOT ASSERTED. `delegatesTo` names the helper, and the gate verifies THE HELPER reaches D1.
 *       An exemption may RELOCATE the obligation. It may never DISCHARGE it.
 *   3 · a STALE exemption is a build failure — if the function no longer writes LS, or no longer exists,
 *       the entry must be removed. Exemption lists rot silently and a rotted list is decoration.
 * If that makes an exemption expensive: good. It should be cheaper to reach D1 than to explain why you did not. */
const D1_EXEMPT = {
  // 'file::functionName': { reason: '...', date: 'YYYY-MM-DD', delegatesTo: 'helperFnName' }
  'sketchbook.html::_autoConsumeSketch': {
    reason: 'The driver write is the FIRST thing it does, delegated to _d1WriteCarriedSketch — the page-local ' +
            'mirror of sketch.html _d1WriteSketch, which is private to an IIFE on another page and not reachable ' +
            'from here. The obligation is RELOCATED to that helper, and verified there, not discharged.',
    date: '2026-07-31',
    delegatesTo: '_d1WriteCarriedSketch'
  }
};

/* Enclosing-function walk. NOT a fork of scripts/_gate_extract.mjs — that extracts a function BY NAME;
 * this asks the opposite question, "which function contains this index", which no existing helper answers. */
function enclosingFn(src, idx) {
  let from = src.lastIndexOf('function', idx);
  while (from >= 0) {
    const open = src.indexOf('{', from);
    if (open >= 0) {
      let depth = 0;
      for (let j = open; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') {
          depth--;
          if (depth === 0) {
            if (j > idx) {
              const sig = src.slice(from, open);
              const m = /function\s+([A-Za-z0-9_$]+)/.exec(sig);
              return { name: m ? m[1] : '<anonymous>', body: src.slice(from, j + 1), start: from };
            }
            break;
          }
        }
      }
    }
    from = src.lastIndexOf('function', from - 1);
  }
  return null;
}
function d1Violations() {
  const bad = [];
  const seenExempt = new Set();
  for (const [surface, cfg] of Object.entries(D1_SURFACES)) {
    for (const f of cfg.files) {
      if (!existsSync(f)) continue;
      const src = readFileSync(f, 'utf8');
      const re = /localStorage\s*\.\s*setItem\s*\(\s*([A-Za-z0-9_$'".+ ]+?)\s*,/g;
      let m;
      while ((m = re.exec(src))) {
        const keyExpr = m[1];
        if (!cfg.lsKeys.some((k) => keyExpr.indexOf(k) >= 0)) continue;   // not a governed key
        const fn = enclosingFn(src, m.index);
        if (!fn) continue;
        // PROVENANCE: only USER-ORIGIN content is governed. A cache filled FROM D1 is correct behaviour.
        if (!cfg.origins.some((o) => fn.body.indexOf(o) >= 0)) continue;
        const tag = `${f}::${fn.name}`;
        const reaches = cfg.d1Reach.some((d) => fn.body.indexOf(d) >= 0);
        const ex = D1_EXEMPT[tag];
        if (ex) {
          seenExempt.add(tag);
          if (!ex.reason || !ex.date) { bad.push({ tag, surface, cfg, why: 'EXEMPTION WITHOUT A NAMED REASON AND DATE' }); continue; }
          if (!ex.delegatesTo) { bad.push({ tag, surface, cfg, why: 'EXEMPTION DOES NOT NAME THE HELPER IT DELEGATES TO' }); continue; }
          const helper = enclosingFn(src, src.indexOf('function ' + ex.delegatesTo) + 10);
          const helperReaches = helper && cfg.d1Reach.some((d) => helper.body.indexOf(d) >= 0);
          if (!helperReaches) bad.push({ tag, surface, cfg, why: `EXEMPTION UNPROVEN — ${ex.delegatesTo} does not reach D1 either` });
          continue;
        }
        if (!reaches) bad.push({ tag, surface, cfg, why: 'writes the mirror and never reaches the driver', line: src.slice(0, m.index).split('\n').length });
      }
    }
  }
  for (const tag of Object.keys(D1_EXEMPT)) {
    if (!seenExempt.has(tag)) bad.push({ tag, why: 'STALE EXEMPTION — this function no longer writes a governed key (or no longer exists). Remove the entry.' });
  }
  return bad;
}
if (process.argv.includes('--selftest-d1invariant')) {
  /* AMPUTATION TEST. Strip the D1 call out of a known-good writer and require THAT function to be named —
   * not merely require some failure. An invariant that has never been made to fail is decoration. */
  const TARGET = 'sketch.html', VICTIM = '_doSave';
  const orig = readFileSync(TARGET, 'utf8');
  const baseline = d1Violations();
  const hurt = orig.replace('var _d1Write = _d1WriteSketch(payload);', 'var _d1Write = null;  /* SELFTEST */');
  if (hurt === orig) { console.error('SELFTEST could not apply its poison — the anchor moved.'); process.exit(1); }
  writeFileSync(TARGET, hurt);
  let caught;
  try { caught = d1Violations().filter((b) => b.tag === `${TARGET}::${VICTIM}`); }
  finally { writeFileSync(TARGET, orig); }
  console.log(`SELF-TEST d1 invariant: baseline_violations=${baseline.length} poisoned_caught=${caught.length} (${VICTIM})`);
  // One violation is reported per GOVERNED WRITE, and _doSave makes three, so the floor is 1 not exactly 1.
  if (baseline.length !== 0) { console.error(`RED-FIRST INCONCLUSIVE — the clean tree already has ${baseline.length} violation(s); fix those before trusting this.`); process.exit(1); }
  if (caught.length < 1) { console.error(`RED-FIRST FAILED — stripping D1 from ${VICTIM} was not reported.`); process.exit(1); }
  console.log('RED-FIRST OK — the invariant BITES, and names the exact function.');
  process.exit(0);
}
const d1Bad = d1Violations();
if (d1Bad.length) {
  console.error('');
  console.error('  D1 CUTOVER INVARIANT VIOLATED');
  console.error('  ─────────────────────────────');
  d1Bad.forEach((b) => {
    console.error(`  ${b.tag}${b.line ? ':' + b.line : ''}`);
    console.error(`      ${b.why}`);
    if (b.cfg) {
      console.error(`      driver : ${b.cfg.driver}`);
      console.error(`      mirror : ${b.cfg.mirror}`);
    }
  });
  console.error('');
  console.error('  D1 IS THE DRIVER; THE 4-SLOT CLERK/LS BOOK IS A SOAK-PERIOD MIRROR.');
  console.error('  A WRITE MAY ACCOMPANY IT. A WRITE MAY NEVER SUBSTITUTE FOR IT.');
  console.error('');
  console.error('  A function that persists a saved sketch or blueprint into localStorage must also reach');
  console.error('  D1 in that same function. The sketchbook RENDERS FROM D1 and treats a reachable-empty');
  console.error('  list as authoritative — so a write that lands only in the mirror is not merely untidy,');
  console.error('  it is invisible to the page, and the user is shown an empty sketchbook.');
  console.error('  Reach D1 here, or add a proven exemption (reason + date + delegatesTo) in build-dist.mjs.');
  console.error('');
  process.exit(1);
}

/* ── DANGLING-ASSET GUARD ─────────────────────────────────────────────────────────────────────────────
 * A LIVE-SITE LANDMINE, NOT A FOOTNOTE. The copy loop above publishes `git ls-files` ONLY, so a new file
 * that is written but never staged is silently skipped WHILE THIS BUILD REPORTS SUCCESS. Measured
 * 2026-07-31: scripts/datum-leave-prompt.js existed on disk, the build said OK, and the file was simply
 * absent from dist/. Nothing anywhere would have said so. The moment a page carries
 * <script src="/scripts/datum-leave-prompt.js"> that page ships pointing at a 404 — green build, broken
 * site, and the failure surfaces as a feature that silently does nothing.
 *
 * So it becomes an assert rather than something anyone has to remember — same instinct as replacing the
 * hand-list of bookkeeping fields with a rule.
 *
 * SCOPE IS DELIBERATELY NARROW: <script src> and <link href> only, which is the exact class that bites.
 * Navigation links are NOT checked — a wrong <a href> is a different problem with different false
 * positives, and a guard that cries wolf on the Captain's deploy is worse than no guard (L60). External,
 * protocol-relative, data:, and fragment references are skipped because they are not ours to resolve. */
function assetRefs(html) {
  const out = [];
  const re = /<(?:script[^>]+src|link[^>]+href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function checkDanglingAssets(extraRef) {
  const misses = [];
  const pages = tracked.filter((f) => extname(f).toLowerCase() === '.html' && existsSync(join(OUT, f)));
  for (const page of pages) {
    const refs = assetRefs(readFileSync(join(OUT, page), 'utf8'));
    if (extraRef && page === pages[0]) refs.push(extraRef);          // self-test injection only
    for (const ref of refs) {
      if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^(?:data:|mailto:|tel:|#)/i.test(ref)) continue;
      /* /cdn-cgi/ is CLOUDFLARE'S OWN NAMESPACE, served by the edge and never present in this repo:
       * the edge injects an email-decode script into pages carrying an address. Real at runtime,
       * absent from dist by definition, so excluding it is correctness rather than a carve-out.
       * Found by this guard on its first run — the guard doing its job before it reached a deploy.
       * ⚠️ The page that first triggered it (sketchv2.html) was DELETED 2026-08-15 with the Finding-2
       * orphans. The exclusion stays because the EDGE behaviour is general, not because that page
       * was special — a rule kept alive only by one example is a rule nobody can re-derive. */
      if (/^\/cdn-cgi\//i.test(ref)) continue;
      const clean = ref.split('?')[0].split('#')[0];
      if (!clean) continue;
      const target = clean.startsWith('/') ? join(OUT, clean) : join(OUT, dirname(page), clean);
      if (!existsSync(target)) misses.push(`${page} -> ${ref}`);
    }
  }
  return misses;
}
/* RED-FIRST, SHIPPED WITH THE CHECK (ratified): every self-check carries its own proof that it can fail.
 * `node scripts/build-dist.mjs --selftest-assets` injects one reference to a file that cannot exist and
 * requires the guard to catch exactly it. A guard that cannot bite is a measurement of the guard. */
if (process.argv.includes('--selftest-assets')) {
  const PHANTOM = '/scripts/__phantom_asset_that_cannot_exist.js';
  const caught = checkDanglingAssets(PHANTOM).filter((s) => s.endsWith(PHANTOM));
  const clean  = checkDanglingAssets();
  console.log(`SELF-TEST dangling-asset guard: injected=1 caught=${caught.length} baseline_misses=${clean.length}`);
  if (caught.length !== 1) { console.error('RED-FIRST FAILED — the guard did not catch an asset that cannot exist.'); process.exit(1); }
  if (clean.length !== 0)  { console.error(`RED-FIRST INCONCLUSIVE — baseline is already dirty: ${clean.join(', ')}`); process.exit(1); }
  console.log('RED-FIRST OK — the guard BITES, and is silent on the real tree.');
  process.exit(0);
}
const dangling = checkDanglingAssets();
if (dangling.length) {
  console.error('DANGLING ASSET — a page references a file that is NOT in the publish output:');
  dangling.forEach((d) => console.error('  ' + d));
  console.error('  -> Almost always an unstaged new file: the copy step publishes `git ls-files` only.');
  console.error('  -> git add the file, or fix the reference. A green build must not ship a 404.');
  process.exit(1);
}

console.log(`OK — ${web} web assets + ${cfg} config files -> ${OUT}/  (sacred hosts byte-identical, leak-guards clean, no dangling assets)`);
