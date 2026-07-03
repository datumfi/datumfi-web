# Copy-Coverage Ledger — is every renderable line in each room's Copy Bank live on the site?

**Method (Captain-ruled 2026-07-03):** read ONE room's Copy Bank top-to-bottom against the live
studio.html. For each authored, *renderable* line ask one question — is it live? Mark it. No
percentages, no cross-room template (the rooms are nuanced-by-design; a template mis-reads them —
that's the whole reason for separate banks). Stop-and-flag any NOT-WIRED or drifted line.

**Legend:** ✅ WIRED (bank verbatim live) · ❌ NOT-WIRED (absent, or live as different/older/generic
copy — a gap to close) · ⬜ BLANK (deliberately silent, sourced-or-blank — point to the reason).

**A room is DONE when every renderable line is ✅ or ⬜ — zero unexplained ❌.**

Live anchor at audit time: origin/main `2a0315b`.

---

## 401(k) — "The Treasury" (roth401k) / "The Vault" (pretax401k) · CALIBRATION READ

Purpose: validate the read method on the room we built most recently. Result below is honest — and
it surfaces the key finding for the whole effort (see ⚠️ at the end).

### §9 · DATUM INTELLIGENCE composed paragraph (R100–R156) — ✅ DONE
| Bank line | Status | Evidence / reason |
|---|---|---|
| §3a Composition Archetype, 11 patterns [R]+[T] tails (R261–R272) | ✅ | `_di401kArchetype` |
| Layer A generic spine tiers eq≥85 / 55–85 / 30–55 / <30 / cash [R]+[T] (R107–R111) | ✅ | `_di401kSpine` |
| §11 Instrument-mix tag, 7 patterns (R176–R182) | ✅ | `_di401kInstTag` |
| Layer B tilts — intl / TDF / overlap / single-name(+NUA [T]) [R]+[T] (R115–R118) | ✅ | `_di401kTilts` |
| Layer B2 Composition Read [R]+[T] (R122) | ✅ | `_di401kCompRead` |
| Layer C behavior — beta hi / beta lo / bond(substantive [T]) [R]+[T] (R126–R128) | ✅ | `_di401kBehavior` |
| Layer D fees — expensive / lean [R]+[T] (R132–R133) | ✅ | `_di401kMenuFees` |
| Layer D — menuQuality "thin menu" (R134) | ⬜ | no menu-quality data source (sourced-or-blank) |
| Layer E — match-split [R] / no-RMD [R] · R223+R138[T]+R224 [T] (R138–R140, R223/R224) | ✅ | `_di401kTax` |
| Layer E — 5-yr-clock (R139) | ⬜ | no 5-yr-clock data source |
| Layer E — bracket-arbitrage (R141) | ⬜ | no expected-retirement-rate input (bank §7.3) |
| Layer F toggles — Rule-55 / match / catch-up 50 / super catch-up [R]+[T] (R145–R148) | ✅ | `_di401kToggle` |
| Layer G contribution — under-match / under-max / near-max / maxed [R]+[T] (R152–R155) | ✅ | `_di401kContrib` |
| Layer G — maxed-but-catch-up-OFF (R156) | ⬜ | needs age-eligibility signal (unsourced) |
| §8 employer-match INPUT hovers — Match Rate/Up-To/Vesting/Balance (R93–R97) | ✅ | modal §8 block (STEP 1a) |

**§9 verdict: DONE.** Every line ✅ or a ⬜ I can point to. **← this validates the read method.**

### Everything else in the 401(k) bank — ❌ NOT-WIRED
| Bank section | Status | Evidence / reason |
|---|---|---|
| §1 SIGNALS — signal-strip hovers (R9–R29) | ✅ WIRED | new 401k `_diBankStrip` branch: Balance R10/R288, Equity R16/R292, Bond R17/R293, Contribution R13/R291, Avg-Expense R20 ([R]/[T]); asset-mix cells (Invested-Cash/Cash/Intl) reuse shared sibling hovers (Lesson 48, neutral). ⬜ tokens with no strip element (rothBalance/matchBalance/matchRate/matchCapHit/targetDatePct/fundCount/menuQuality/rule5yr/accessAge/rmd/contribVsLimit/catchUpEligible/vested/bracketArb) surface via §8 inputs or §9 paragraph, not a standalone strip cell. 4 auto-box DEEP-DIVE hovers = §12 (next). |
| §2 TITLE HOVER — "What is a Roth 401(k)?" (R33–R36) | ✅ WIRED | R33–R36 [R] Treasury / R303–R306 [T] Vault installed in `_diSetTitle` (before the 403 branch). Also FIXED a live drift bug: 401k rooms were falling through to the 403(b) title hover. Verified both rooms; 403 untouched. |
| §3 WITHDRAWAL MODAL — plain-coach rewrite + 5-yr rule (R40–R42) | ✅ WIRED | R40/R41/R42 [R] + R309/R310/R311 [T], scoped to real 401k rooms via `!is403`; robotic "capital extraction" tooltip KILLED for 401k (403 keeps current until its own pass). Both rooms verified; 403/457/IRA regression green. |
| §4 CONTRIBUTION LIMITS — header + all field hovers | ✅ WIRED | header R46 [R]/R314 [T]; field hovers Base R47/R337, Catch-Up R48/R338, Super R49/R339 ([R]/[T]), Active-Max R50 (neutral, both) — `/401k/`-scoped, both rooms. [R]/[T] gap RESOLVED by Architect [T] twins A337–339. 403/457/IRA fields untouched. |
| §5 UNIVERSAL TOGGLES — 2a include / 2b isFriction (R55/R318 + R56/R319) | ✅ WIRED | both toggles, [R]/[T], scoped `/401k/`; other rooms keep generic copy. (Dropped the "NOTE for the Vault:" editorial prefix from R319 — flagged as a judgment call.) |
| §12 METRIC LADDERS — 4-box deep-dive tooltips, ~24 rungs (R186–R215) | ❌ | ladders never built; boxes use generic one-line hovers |
| §15 IRS LIMITS dated table — LOOKUP(taxYear) auto-update (R245–R255) | ❌ | figures are hard-coded literals (correct for 2026) but not the dated table; auto-update not implemented |

---

### ⚠️ CALIBRATION FINDING — this changes the scope
The read method is **sound** (§9 came back all-✅-or-⬜, every miss explained — exactly the control we
wanted). But it also proves the honest truth: **even the 401(k) — the room we called "fully cooked" —
is complete only on its §9 DI paragraph.** Its §1 signal hovers, §2 title, §3/§4 modal, §5 toggles,
§12 ladders, and §15 limits table are NOT wired from the bank (the modal is a shared hand-written
block still carrying the robotic voice the bank says to replace).

So "cooked" has meant *DI-paragraph-cooked*, not *whole-bank-cooked* — for every room. The remaining
program is bigger than the stale-§9 rooms: it's the deferred modal/strip/title/toggle/ladder copy
across **all** rooms, on top of the §9 nuance retrofit for HSA/529/403.
