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
| §12 METRIC LADDERS — 4-box deep-dive tooltips (R191–R216) | ✅ WIRED | `_di401kUGLadder`/`BetaLadder`/`YldLadder`/`ExpLadder` — one rung per box on hover, [R]/[T] on UG+Beta; FAIL-TO-BLANK (BETA-NONE/YLD-NONE/EXP-NONE/UG-NONE). Wired as the auto-box tip1b in the 401k strip; beta box now always renders so BETA-NONE shows. |
| §15 IRS LIMITS dated table — LOOKUP(taxYear) (R246–R252) | ✅ WIRED | `_DI_402G_LIMITS` dated constants + `_di402gLimits()`; modal defaults + updateAccField live-recalc both read it. Current 2026 figures unchanged (base 24500 / c50 8000 / super 11250 / 415c 72000); 2025 row present. No baked year — next IRS bump = one-row edit. Makes the §4 "see the dated LIMITS table, §15" reference truthful. |

---

## 🧭 PARTING OBSERVATIONS — for the next Claude (2026-07-03 handoff, next = TAXABLE → IRA)

Things that will bite you or save you time, from wiring the 401(k) end-to-end:

1. **NEXT = TAXABLE, then IRA** (Captain override; HSA is NOT next). Taxable is the DI root every bank
   forks from. Audit it LINE-BY-LINE — the retired scraper mis-scored it 6% (false). Taxable is likely
   MORE wired than that: it already has the richest strip (Equity/Bond/Cash/Intl + 4 boxes with
   `_diTaxUGLadder`/`_diTaxBetaLadder`/`_diTaxYldLadder`/`_diTaxExpLadder`), a §2 title ("The Living
   Room"), and its §9 archetype-machine narrator (`_diNarrTaxable`, pick-ONE spine — a DIFFERENT machine
   from the composed layer-table). Note Taxable has NO withdrawal-age/limits modal (it's the "no rules"
   account), so §3/§4 don't apply — audit against ITS bank's actual sections (§S3/§4b/§8 verdict shape),
   not the 401k template.

2. **The shared modal trap.** The withdrawal + limits + toggle block (studio.html ~L5388–5540) is ONE
   block serving ALL pretax/roth rooms (401k/403/457/IRA). IRA IS in it (has `isIRA` branches — extend,
   don't fork). Scope every 401k-flavored edit via `!is403`/`/401k/`. ⚠️ NAMING TRAP: the local `is401k`
   var here = `/401k|403|457b/` (the §402(g) class), NOT 401k-only — I used `/401k/.test(base.id)` for
   true-401k scoping. `_diBankStrip` (~L4586+) is per-room-branched (taxable/457/ira/401k/…); add a room
   branch, don't touch siblings.

3. **§ vs live shape mismatch.** Bank §1 authors ~21 signal hovers, but the STRIP only surfaces a subset
   as cells (Balance/Equity/Bond/Cash/Intl/Contribution + 4 auto-boxes). Tokens with no strip element
   (rothBalance/matchBalance/matchRate/menuQuality/rule5yr/accessAge/rmd/etc.) surface via §8 inputs or
   the §9 paragraph — they are ✅ elsewhere, not ⛔. Don't expect 1 bank token = 1 strip cell.

4. **[R]/[T] gaps are real — HOLD, don't draft.** The 401k §4 field hovers were Roth-worded with no [T]
   twin; I flagged and the Architect authored A337–A339. Expect similar gaps in dual-flavor rooms (IRA
   Library/Conservatory). Also: bank punctuation is house-standard STRAIGHT quotes + em-dashes — install
   verbatim; and JS-escape `\'` in the source breaks naive grep (normalize backslashes when comparing).

5. **Reusable cert pattern.** `_gate_<room>_cert.js` (see `_gate_401k_cert.js`) — open the room with one
   rich fixture, assert a marker from EVERY section, [R]/[T]. GREEN = Lesson-50 done. Clone it per room.
   Gate harness: `python -m http.server 8001` at repo root, playwright drives `window.state`/`addInstance`/
   `openAccountModal`; `scripts/_*` are dropped from dist. Python stdout is cp1252 — write UTF-8 dump files
   and Read them, never print unicode to console.

6. **CF deploy lag.** push = publish, but marker-verify has a ~1–2 min build lag (first curl often shows 0,
   then live). Poll with a cache-buster; don't conclude "not live" on the first miss.

7. **401(k) deferred ⬜ (NOT gaps — parked till a data source exists):** menuQuality, Roth 5-yr-clock,
   bracket-arbitrage (needs an "expected retirement tax rate" input — bank §7.3 ask), Layer-G R156
   (needs age-eligibility). Also the Rule-55 / catch-up TOGGLES are DISPLAY-ONLY — they change the modal
   label but do NOT gate the projection engine (bank §6/§7 asks); copy ships as-authored. If a future
   pass wires those inputs, these ⬜ lines light up automatically.

---

## ✅ 401(k) — CERTIFIED-100% (Lesson-50 wire-then-audit passed) · SMOKELIST

All 9 authored sections render live on BOTH rooms — Treasury (roth401k) [R] / Vault (pretax401k) [T].
Certification gate `scripts/_gate_401k_cert.js` = **26/26 GREEN**; full regression 13/13 exit 0.
Deliberate ⬜ blanks (sourced-or-blank, by design): §9 menuQuality (no menu-quality data) · §9 5-yr-clock
(no clock data) · §9 bracket-arbitrage (no expected-retirement-rate input) · §9 G R156 (no age-eligibility
signal). Zero unexplained NOT-WIRED.

**Captain smoke walk** — open a Roth 401(k) ("The Treasury") and a Pre-Tax 401(k) ("The Vault"), add a
few funds, and check each:

| # | Section · element | Commit | Smoke gesture → expected | Verdict |
|---|---|---|---|---|
| 1 | §8 employer-match input | `f16c17c` (live) | Scroll to **EMPLOYER MATCH** block → Match Rate/Up-To/Vesting on both; **Employer-Match Balance** on Treasury only; hover each → bank copy | ✅ |
| 2 | §9 DI paragraph (Treasury) | `135ca92` (live) | Add an equity fund book → paragraph reads "**tax-free growth engine**… every gain untaxed"; with a match balance → "**two tax buckets wearing one name**", "NO required minimum distributions" | ✅ |
| 3 | §9 DI paragraph (Vault) | `b9c77ec` (live) | Same book on the Vault → "**tax-deferred growth engine**… taxed as ordinary income", "RMDs kick in at 73"; bond-heavy → "bonds are **tax-efficient to hold HERE**" | ✅ |
| 4 | §3 withdrawal modal | `48046b5` | Open modal → **no** "capital extraction" robotic line; Rule-of-55 hover reads plain-coach ([R] 5-yr clock / [T] "penalty waiver, not a tax waiver") | ✅ |
| 5 | §2 title hover | `1ab623f` | Hover the modal title ⓘ → Treasury: "**The Treasury — a Roth 401(k)**"; Vault: "**The Vault — a Traditional 401(k)**" (was wrongly showing 403(b) copy) | ✅ |
| 6 | §4 limits header + §5 toggles | `7a919a4` | Hover CONTRIBUTION LIMITS header → "SHARE one limit" [R] / "sits OUTSIDE this elective limit" [T]; toggles read "Include this account…" / "Count it, but never spend…" | ✅ |
| 7 | §4 field hovers | `b3f1884` | Hover Base Limit / Catch-Up / Super fields → [R] "buying tax-free compounding" / [T] "tax-DEFERRED growth… taxed later as ordinary income" | ✅ |
| 8 | §1 signal-strip hovers | `6e812de` | Hover the strip cells (Balance, Equity %, Bond %, Contribution, Avg Expense) → bank §1 [R]/[T] copy | ✅ |
| 9 | §12 metric-ladders | `7f3e03a` | Hover the 4 auto-boxes → deep-dive rung by value (e.g. big gain → "pure growth… [R] why high-growth belongs here / [T] taxed on the way out"; all-MF book → beta "we leave it blank") | ✅ |
| 10 | §15 dated limits table | `7f3e03a` | Limit fields show 2026 figures (24,500 / 8,000 / 11,250); now LOOKUP-by-year (no baked literal) | ✅ |

Certification commit: (this commit) — adds `_gate_401k_cert.js`. **401(k) = first CERTIFIED-100% room.**

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
