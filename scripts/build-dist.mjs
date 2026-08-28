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
  'scripts/datum-footer.js': 'df30b3bd8562fb963d976ea892f94815',
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
  'studio.html': '3fdf0448be41fe796ec31b60ecceebb1',   // SENTRY WIRED — AND THE CSP IS HALF THE COMMIT. `connect-src` gains https://o4511758659223552.ingest.us.sentry.io, and the head gains two `async` tags: the vendored errors-only SDK (scripts/sentry-10.71.0.min.js) and the canonical init (scripts/datum-sentry.js). ⛔⛔ THE CSP EDIT IS NOT A DETAIL RIDING ALONG — omit it and the SDK loads, initialises, CAPTURES FAITHFULLY, and every envelope dies at the network boundary: AN ERROR MONITOR THAT REPORTS NOTHING LOOKS EXACTLY LIKE AN APPLICATION WITH NO ERRORS, and we would have been MORE blind than before because we would have had a reason to stop looking. FINDING 17; D25 repeating one layer up (Clerk needed the Turnstile allowlist). ⛔ `async`, NEVER `defer`: `defer` executes before DOMContentLoaded so it DELAYS DCL, and this page's preboot rule converts DCL delay 1:1 into BLANK-STAGE TIME — 42187ee's trap, re-answered by _gate_studio_preboot_paint.js. ⭐ SELF-HOSTED so `script-src` is untouched and connect-src is the ONLY policy change; the CDN loader would have needed js.sentry-cdn.com in script-src, re-opening D3's unpinned-dependency hole ON THE ONE COMPONENT WHOSE FAILURE IS INVISIBLE. ⭐⭐ REPLAY IS EXCLUDED BY CONSTRUCTION, NOT BY CONFIG: bundle.min.js (90,590 bytes) ships replayIntegration as a console.warn STUB; bundle.tracing.replay.min.js (267,756) is the one that contains it. A flag can be flipped by a future edit; a bundle that does not contain the code cannot. ⚠️ MEASURED AND IT CHANGED THE DESIGN: 173 gates reference this file and 56 boot it from 127.0.0.1:8001, so init is HOSTNAME-GATED — an unconditional init would have sprayed harness errors into the dashboard on every suite run and buried the real signal. Guarded both directions by scripts/_gate_sentry_wired.js (2026-08-24)   // THE SEED GATE IS SCOPED OFF THE SCRATCH BOOT. `.studio-layout.seed-gated{visibility:hidden}` hides the WHOLE stage while the dossier seed is awaited — correct for a returning user opening real work, and guarding a risk that CANNOT OCCUR on the reload after START FROM SCRATCH, where the user has just asked for founder defaults and `_scratchReset()` has already cleared the prefill sources. WE WERE HIDING THE PAGE TO PROTECT DATA THE USER HAD JUST ASKED US TO THROW AWAY. Measured on production (throttled 40ms/10Mbit/4x CPU, three arms): the reload is EXONERATED — arm B reloads WITHOUT the gate and shows no blank at all; arm C (reload + gate) hid the layout 1158->1611ms = 453ms of exposed blank stage, exposed because ONE FLAG (`datum_auth_hint`) turns the gate ON and, with `datum_studio_overlay_seen`, also removes the overlay that hides it everywhere else. 453ms is a LOWER BOUND — no real session, so the resolver settles early. ⛔ THE FLAG IS LATCHED AT PARSE, NOT READ IN init(): the entry-overlay block CONSUMES it (removeItem) at parse and init() runs at DOMContentLoaded, so the first version of this fix read null every time and changed NOTHING (probe: flagAtStart=1, flagAtGate=null, gate ran anyway). A FLAG WITH A CONSUMER IS A MESSAGE, NOT A STATE. Guarded by scripts/_gate_seed_gate_scratch_skip.js — L2 proves the gate was SCOPED and not deleted, L3 guards the source order whose violation is silent (2026-08-24)   // FINDING 15 — THE DISMISS CONTRACT. The overlay's X ran _startScratchFlow() on FIRST ENTRY and DESTROYED unsaved work: Captain-reproduced on production 2026-08-24 — add a room, reload, the overlay returns, click X, the room is gone. THE RELOAD HAD PRESERVED IT (it sat in datumfi_blueprint_draft_v1); the X deleted it, which is why the obvious story ("reloading an unsaved page reverts it") acquitted the real defect. A CONSENT defect, not a data defect: X means "never mind", START FROM SCRATCH means "discard my work", and both ran the same function. Unsafe BY OMISSION — `_reopened` was added to make RE-ENTRY safe and thereby silently defined first entry as the unprotected path, so nothing in the diff that introduced it looked like a deletion. Compounded by auth: the overlay auto-hides only when `_hintSignedIn && datum_studio_overlay_seen`, so every SIGNED-OUT reload armed it. Scratch remains the only way to discard. Guarded both directions by scripts/_gate_overlay_x_preserves.js, whose --xdead control proves the preserve leg would pass over a dead button (2026-08-24)   // P2 THE DEFER — scripts/studio-account-modal.js becomes `defer` (331,284 bytes, nothing calls it at parse time). HYGIENE, NOT THE ARC'S PAYOFF: measured on the live signed-out page BEFORE the attribute moved, Lighthouse mobile scored 89 / FCP 2.8s / TBT 30ms, and its own render-blocking estimate was 260ms for ALL five head scripts AND the CSS — a 9.3% ceiling against a predicted 15-40%. The prediction was falsified by the baseline. BYTES ARE NOT MILLISECONDS. First paint was never the crisis the split arc was written to solve; that goal is corrected, not dropped (2026-08-23)   // §82.77 ONE BAR — the panel's native scrollbar is DELETED in split and #panel-resizer replaces it: one object that scrolls vertically and resizes horizontally, axis-locked on first intent. The seam LEAVES the scrolling panel for .studio-layout, which is the actual repair — a scrollbar paints above a scroller's own positioned descendants, so a real pointer press at the centre of the divider's own painted hairline moved the panel ZERO px on the shipped bytes. Captain-ruled after asking three times; the previous answer priced "add a drag to the scrollbar" (impossible) instead of "remove the scrollbar" (ordinary) (2026-08-23)   // MOVE 1b — 53 helpers out (132,541 bytes, 1,078 lines, 50 excisions); 1,522,969 -> 1,393,496. One consolidated pointer names all 53, paren-free, inert because every matcher strips comments first (2026-08-22)   // STEP 3 · MOVE 1a — openAccountModal (7981-9555) moved to scripts/studio-account-modal.js; 1,712,678 -> 1,522,969 bytes, 20,333 -> 18,778 lines. The pointer comment names the 76 reads, the two writes, and why they resolve across the boundary (2026-08-22)   // THE SEAM SCOPE FIX + THE DROPDOWN REFLOW. `.studio-layout`'s --studio-panel-w declaration is DELETED — it scoped the token to one subtree while styles/header.css:143 pinned the Sheet·Split·Structure toggle to it from OUTSIDE that subtree, so the toggle sat 80px off the seam at rest and moved 0px when the seam moved 200px (measured, headed Chrome). scripts/studio-panel-resize.js is now the one writer, on documentElement. `.space-dropdown` leaves position:absolute so opening the picker PUSHES the column instead of burying the Next control (2026-08-22)   // §82.15 THE SURFACE PORT: proto2 `.right` ported to .canvas-wrapper as ONE object — 7 layers, 7 background-sizes, both inset shadows, ::before AND ::after. The key light leaves `body` entirely: a global light with surfaces stacked over it was the defect (12% transmission, d=(2,3,3) vs an authored (15,33,24)). D's 76/19 grid lands inside this port because splitting a positional background-size list is the hazard, not the schedule (2026-08-20)
  'sketch.html': '68e2951ad895b64abca5ff0fa1e6353b',   // (0b) the last --font-serif shadow deleted; Georgia is promoted into styles/typography.css instead (2026-08-16)
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
  'scripts/studio-landing.js': '013ad9b094be83a2320e15ff3db29bde',   // §82.180 THE PREBOOT PAINT REPAIR — the preboot style gains a SECOND declaration revealing .s1-header while the panel stays hidden, so first paint shows the title + thesis instead of an empty stage. The blank-stage window measured 1843ms throttled and is now 0; time-to-phases is UNCHANGED (~2600ms) — this makes nothing faster, it changes what occupies the wait. The rule's cost is now WRITTEN DOWN above it: anything moving first paint earlier without moving DCL earlier converts the saving 1:1 into blank time. Guarded by scripts/_gate_studio_preboot_paint.js (2026-08-23)   // the phase back control is '← The Studio', not '← Dashboard' — Captain-ruled 2026-08-22, reversing the 2026-08-14 ruling that §82.22's reframe (the landing IS the Studio; the seven are phases you travel to) made obsolete. Both rulings are kept in the comment: the second only makes sense against the first. Our own brand doc names the generic-dashboard problem as a failure mode Datumae exists to reject (2026-08-22)   // §82.20 THE SPINE LANDING — 7 three-line cards with icons, 4 pillars (BUILD/TEST/SHAPE/LIVE), the gradient spine; roman numerals retired from the cards (2026-08-20)
  'scripts/studio-blueprint.js': 'f1e3dde7532940aad3448f1add5fdfae',   // FINDING 16 — THE SIBLING NOTICE CLEARS. A STATE WITH TWO SIDES NEEDS TWO ANNOUNCEMENTS: the cross-tab hold was announced on `datum:draft-sibling-hold` and the release was announced NOWHERE, so the banner was STRUCTURALLY UN-CLEARABLE — `_draftNotice`'s show=false branch existed but was UNREACHABLE for 'sibling'. This module already KNEW the hold had ended (it cleared `_siblingHold` in two places) and simply told no one. Not a race, not a timing bug: A ONE-WAY DOOR THAT LOOKS LIKE A TOGGLE, which always presents as 'stuck' rather than 'never finished'. Captain-reproduced on production 2026-08-24 — reload repeatedly, the banner stays, which is the one thing its own authored copy promises would clear it. THE COPY WAS NOT TOUCHED AND WAS NEVER THE DEFECT: the behaviour it describes was already built (load() stamps `_seenAt`), only the announcement was missing, and a sentence that under-promises to accommodate a bug is A BUG WITH A BRAND VOICE. New event name rather than reusing the hold's, deliberately: `_gate_studio_draft_crosstab.js:90` asserts only that an event OF THAT NAME occurred, so reuse would make it pass on a release with no refusal — THE ASSERTION SURVIVES WHILE THE CLAIM UNDERNEATH IT DIES. Guarded by scripts/_gate_studio_sibling_release.js (2026-08-24)   // Part 24/25 — readDossier() session-gated at the READ (4 callers) + the boot-draft invariant in _persistDraft (2026-08-15)
  // MISS-5 pre-work guard (2026-07-25). nav.js is a Sacred Host in CLAUDE.md but was absent from THIS map,
  // so a bad edit failed no build. It owns the centralized cross-device restore every page depends on
  // (_datumRestoreFromClerk / _restoreBlueprintFromD1 / the title mirror), and MISS-5 pre-work items 1, 2
  // and 4 all land in it — pin it BEFORE the arc that leans on it, not after.
  // NOTE: CLAUDE.md lists this host as 'scripts/nav.js'. That path does not exist; the real, page-referenced
  // file is /nav.js at the repo root (every page loads <script src="/nav.js">). Pinned at its true path.
  'nav.js': '478c1c6e280d35ee46db6f4d73708822',   // Finding 2 closed by DELETION: no estate restore on a page with no D1 (2026-08-15)
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
  'scripts/account-topbar.js': 'ef427456589f67f32f16ac8a6086cf26',   // THE NAV SERVES THE SURFACE YOU ARE ON (Captain-ruled 2026-08-22). Signed-in Studio = Home · Studio · Archive · Save · Upgrade with the toggle PINNED to the seam; signed-in Sketch = Home · Sketch · Sketchbook · Save · Upgrade. The article drops on those two surfaces only — a nav tab is a label, a hero is a sentence. The other FIVE surfaces and ALL signed-out navs keep today's bar deliberately: signed-out is a funnel, signed-in is a workspace. Nav right-oriented, not centred, so it cannot collide with the pinned toggle (2026-08-22)   // SHEET · SPLIT · STRUCTURE in the signed-IN toggle, labels AND tooltips. PART 5 renamed Drafting->SHEET and Blueprint->STRUCTURE and the rename landed in ONLY ONE of the two renderers — studio.html's signed-out #app-nav got it, this one did not, so the same control had two names depending on auth state (§24's nav fork). The tooltips are the signed-out strings ported verbatim, not redrafted (2026-08-22)   // Dossier tab retired; Sign Out is Home-only (2026-08-01)
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
