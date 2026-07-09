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

---

## Taxable Brokerage — "The Living Room" (base.id `taxable`) · LINE-BY-LINE AUDIT (2026-07-03, Phase 1)

Live anchor at audit time: origin/main `0e3a822` (clean). Bank = `Studio Estate Accounts.xlsx` →
"Taxable Copy Bank" (v2, R1–R275). Engine = `_diNarrTaxable` L4576 (a TRUE composed assembler:
spine+instTag → all tilts → all behavior → D → close, `join(' ')` — the predecessor's "pick-ONE"
note was imprecise; the composed A→B→C→D→CLOSE model IS live). Read against ITS OWN shape (no
withdrawal-age/§4-limits modal — the "no-rules" account).

### ✅ WIRED — verbatim, confirmed in source
| Bank section | Live | Note |
|---|---|---|
| §2 DI-EMPTY (R51) | `_diNarrTaxable` L4578 | verbatim |
| §3 Layer A Spine — 10 archetypes (R55–R64) | `_diTaxSpine` L4471 | all 10 verbatim; THEMATIC checked first (correct — a 100% thematic ETF would else mis-match INDEX) |
| §3b Instrument-mix tag (R68–R75) | `_diTaxInstTag` L4493 | 6 phrases + "Specifically/Under the hood" append rule + breakdown-empty-when-100% all correct |
| §5 Layer C Behavior (R106–R115) | `_diTaxBehavior` L4532 | fees/beta/yield/C-MARKET-LIKE/C-DRIFT + FIX-1 yield-guard + C-INCOME-SILENT all verbatim |
| §6 Layer D Tax (R118–R122) | `_diTaxD` L4556 | D-NO-BASIS/LOSS/SMALL/MODERATE/LARGE verbatim |
| §7 Close + §8 Verdict (R126–R136) | `_diTaxClose` L4564 | 4 closes verbatim; verdict bands match |
| §10 Metric ladders — UG/Beta/Yield/Exp (R149–R172) | `_diTax*Ladder` L4592–4624 | all rungs verbatim, fail-to-blank |
| §1 Signal strip — Equity/Bond/Cash/Intl/UG/Beta/Yield/Exp hovers (R12,R14–R19,R25) | `_diBankStrip` taxable L4641 | 1a/1b verbatim; 14.2 clinical hr-gain-sub deleted, hr-gaintax kept |
| §11 Cost-Basis column tooltip (R177) | L6147 | verbatim EXCEPT the trailing "Click 'Cost Basis' for help finding it." (dropped — the modal it points to isn't built; see ❌) |
| §12 Toggle LABELS (R185, R188) | L5360 / L5393 | "Count this account in my plan" / "Keep it, but don't spend from it" — labels match |
| §16 Title hover "What is a Taxable Account?" (R233–R236) | `_diSetTitle` L5271 | "The Living Room — a Taxable Brokerage", header/what/why/catch ALL verbatim |
| §17 FIX-2/3/5 (beta band, fund-vs-single-name, cash-drag/overlap/drift) | L4544/4511-4512/4526-4552 | wired (overlapPct is the acknowledged stopgap proxy, R90/R219 — real pairwise signal = parked enhancement, not a copy gap) |

### ⬜ DELIBERATELY-BLANK / surfaces-elsewhere (sourced-or-blank, by design — NOT gaps)
- §1 tokens with no standalone strip cell — {acctName}(→modal title), {tickerCount}(→spine "N holdings"),
  {gainTaxEst}(→hr-gaintax sub-line + UG ladder), {altPct}, {fundPct}, {singleNamePct}, {topPct},
  {topTicker}, {topSector}, {topSectorPct}, {thematicPct}: their MEANING surfaces inside the DI
  paragraph. Same 1-token≠1-cell shape ruling as the 401(k) (parting note #3). Verified emitted somewhere live.

### ❌ NOT-WIRED — real gaps (red-first)
| # | Bank section | Gap | Wireable by Claude? |
|---|---|---|---|
| T1 | §4b Layer B-COMPOSITION (R92–R100) — `{compositionSleeves}` sleeve-namer | **ENTIRE LAYER ABSENT.** No `compositionSleeves`/`B-COMPOSITION` anywhere. This is THE R2 nuance-gap fix (names the top value-weighted sleeves so a 29-fund robo stops reading generic). Copy IS authored (R95 sentence + R97 format + R98 bucket derivation). | ✅ YES — copy authored; I build the token resolver + insert between tilts and behavior (R96) |
| T2 | §18 GEO+SECTOR descriptor map (R238–R275) — `{geoTiltDescriptor}` + `{sectorTiltClause}` | **NOT WIRED.** `_DI_TAX_THEME_NAMES` (L4382) is a *partial* sector→theme-NAME map (gives "Technology"), but the authored §18a geo-lean opener ("It leans …") is DROPPED from B-ALL-FOREIGN/B-GLOBAL-TILT/B-HOME-HEAVY (L4518–4520), and B-SECTOR-BET (L4516) uses the plain theme name, not the §18b clean CLAUSE ("…the chips/software behind it"); revised R83/R84/R85/R86 wording not live. | ✅ YES — all clean phrases authored R243–R271; I build `_DI_GEO_MAP`/`_DI_SECTOR_MAP` resolvers |
| T3 | §4 trigger retunes (R85, R88) | B-GLOBAL-TILT floor still 30% (L4519); bank R85 retuned to **20%**. B-SATELLITE upper still 25% (L4524); bank R88 retuned to **30%** (but FIX-4/R218 still says 25% — **bank internally conflicts**, flag). B-HOME-HEAVY has an extra `eqT≥90` guard (L4520) not in bank R86. | ✅ YES (one-number edits) — but reconcile R88 vs R218 with Architect first |
| T4 | §11 Cost-basis EXPLAINER MODAL + estimate autofill (R178–R181) | "Finding your cost basis" modal, "Use this estimate" button, overwrite warning — NONE present. Implies a cost-basis ESTIMATE mechanism that does not appear to exist in-app. | ⚠️ FEATURE build, not just copy — confirm scope/defer with Captain |
| T5 | §14.4 the other 13 column-header tooltips (Ticker/Name/Price/Shares/Value/UG/Beta/Yield/Geo/Sector/ExpRatio/AssetClass/Instrument) | Only Cost Basis has a `tip` for taxable (L6147); other 13 have none. **No verbatim copy exists in the bank** — §14.4 is a "derive from §10/§11" instruction, not authored cells. | ❌ FLAG Architect — needs authored copy (L47 sourced-or-blank; won't invent) |
| T6 | §12 / §15 Toggle TOOLTIP TITLE+BODY (R186–R190 vs R220–R230) | Taxable falls to the OLD generic `else`-branch tooltips (L5365 "Leave it out…", L5398 "Set aside, untouched…") — NOT the authored §12 bodies (R187/R190). **AND the bank conflicts with itself**: §12 ("Count this account…") vs §15 rewrite ("Include this account…", asset+debt-aware). SHARED cross-room surface — wiring touches HSA/529/457/IRA. | ⚠️ FLAG Captain — resolve §12-vs-§15 canon first; then scope via `base.id==='taxable'` |

### VERDICT
Taxable's **DI paragraph + ladders + strip + title = done** (matches the 401(k)'s "DI-cooked" bar and
then some). The room is **NOT whole-bank-DONE**: two substantive authored nuance layers (**§4b Composition,
§18 geo/sector map**) are entirely unwired — and these are the exact "description → intelligence" upgrades
the Captain commissioned. Plus 4 smaller items (retune drifts, cost-basis modal, 13 column tips, toggle bodies).
**Held at Phase 1** per cadence — no studio.html edits yet. Flags T4/T5/T6 need Captain/Architect input;
T1/T2/T3 are mine to wire on GO.

### FRESH RE-READ (2026-07-03, sheet updated 275→358 rows) — Architect resolutions + NEW finds
The Captain flagged the copied sheet felt incomplete; re-dumped fresh (saved 17:13). Findings:
- **T7 (NEW, was entirely missed) · §3a COMPOSITION ARCHETYPE (R277–R297) + 3a-SPEC (R300–R330).** A whole
  new **pre-spine ladder**: 11 archetypes (AR-CRYPTO-ALL/-MULTI/-SATELLITE, AR-BOND-LADDER/-INCOME,
  AR-INCOME-YIELD, AR-REAL-ASSET, AR-GOLD-HEDGE, AR-SECTOR-BET-NAMED, AR-ALL-INDUSTRIALS, AR-DIVIDEND) +
  AR-NONE fallthrough. Runs BEFORE §3 Spine; a fire REPLACES the spine (richer read), then §3b tag +
  §4/§4b/§5/§6 proceed unchanged. Needs **11 new value-weighted signals** (cryptoPct, cryptoTickerCount,
  reitPct, goldPct, commodityPct, industrialPct, dividendGrowthPct, utilitiesPct, bondSubTypeCount +
  bondSubTypes_phrase, realAssetMix_phrase, topThemeClause), all sourced-or-blank. Taxable sentences =
  R281–R292 (neutral/LTCG). ⚠️ 3a-SPEC references the OLD `_diNarr*` engine line #s (L3817/3877/3910/3929)
  — for TAXABLE I adapt into `_diTaxSignals`(L4390) + a new `_diTaxArchetype()` before `_diTaxSpine`(L4471)
  in `_diNarrTaxable`(L4576). Reconciliation RESOLVED in addendum R324: test **AR-CRYPTO-MULTI before
  AR-CRYPTO-SATELLITE**. §8 cross-account LOCATION layer (Asset-Location bank) CONSUMES §3a but is the
  portfolio capstone — OUT of the Taxable-room pass. **My lane; copy authored.**
- **T5 · 13 column tooltips now AUTHORED verbatim (R344–R358).** Installable — EXCEPT ⛔ **3 cells still carry
  457(b) copy-paste artifacts** that the Architect's dispatch says he fixed but the SAVED sheet does NOT
  reflect: **C344 header** reads "(457(b)-aware)"; **C352 Beta** contains "[R] The Roth is the right home
  for your highest-beta bets… untaxed" (a Taxable account has no Roth branch); **C353 Yield** reads "Inside
  a tax-advantaged account it reinvests untaxed" (in Taxable, dividends ARE taxed yearly — inverted). Installing
  verbatim would put FALSE tax copy in the room → **HELD 3 cells, FLAG Architect to re-save the taxable
  versions.** Other ~10 (Ticker/Name/Price/Shares/Value/CostBasis/UnrealizedGain/Geo/Sector/ExpRatio/
  AssetClass/Instrument) are taxable-correct → install.
- **T6 · toggle canon RESOLVED → §15 (asset+debt-aware) is CANONICAL** (title "Include this account in my plan"
  R224, bodies R226/R230). §12 superseded. Architect wants the SAME pair on EVERY room modal (shared surface,
  bigger blast radius — do carefully).
- **T4 · cost-basis: wire tooltip (R177) + explainer-modal body (R178–R179); SKIP the "Use this estimate"
  autofill + overwrite-warning (R180–R181) → ⬜ DELIBERATELY-BLANK "feature-not-built".**
- **T3 · satellite cap reconciled → 30%** (R88; old 25% dead). **T1 §4b + T2 §18 unchanged — wire as authored.**

**Revised wire list (Lesson-50 wire-then-audit, single pass):** T7 §3a · T1 §4b · T2 §18 · T3 30% ·
T5 (10 clean tips) · T6 §15 toggle · T4 cost-basis tip+modal. **BLOCKED pending Architect re-save:** T5's
3 artifact cells (C344/C352/C353).

#### INCREMENT 1 (working tree, NOT committed) — T7 §3a + T1 §4b · GATE 9/9 GREEN
`scripts/_gate_tax_3a.js` = 9/9. Wired into `_diTaxSignals`/`_diNarrTaxable`:
- **§3a `_diTaxArchetype(s,x)`** — 11-archetype first-match pre-spine, REPLACES `_diTaxSpine` on a fire,
  else null→fall-through. New signals in the existing `_diTaxSignals` loop (REUSE, L48): cryptoTickerCount,
  reitPct/goldPct/commodityPct/industrialPct/divGrowthPct/utilitiesPct, realAssetPct, bondSubTypeCount +
  bondSubTypesPhrase, realAssetMixPhrase, topThemeClause, sleeveList. Order per 3a-SPEC R311/R324
  (CRYPTO-MULTI before CRYPTO-SATELLITE). Verified live: AR-CRYPTO-MULTI, AR-INCOME-YIELD, AR-NONE→spine.
- **§4b `_diTaxComposition(s,x,archFired)`** — sleeve-namer, fires after tilts / before behavior; silent
  unless ≥8 holdings, top<50, thematic<50, ≥3 sleeves ≥2%, no archetype. Verified live (names US large-cap
  core / international / bonds / dividend-growth + smaller satellites).
- Judgment calls made (defensible literal readings, noted for Architect): topThemeClause = existing short
  theme name lowercased; §4b sleeve bucketer ADDS bonds/covered-call buckets not in R98's literal list
  (correctness — R98 would mis-bucket bonds as "large-cap core"); curly ’/— to match the file (not the
  bank's straight quotes) since the whole file is curly + it's what ships.
- **NEW FLAGS for Architect (design-nuance, not blockers):** (a) when a crypto archetype fires, B-SECTOR-BET
  still echoes "X% in Crypto" — redundant; consider suppressing a tilt whose theme the archetype already
  named. (b) B-OVERLAP's stopgap proxy buckets VXUS(intl) with VTI as "same market" — the parked real
  pairwise-overlap signal (R90/R219) would fix it; §4b now sits next to it and the two mildly contradict.

**REMAINING (increment 2):** T3 retunes · §18b sector clause (replace raw echo) · §18a geo prefix (HOLD —
composition ambiguity, ask Architect) · §15 toggle · 10 column tooltips · cost-basis tip+modal.

#### INCREMENT 2 (working tree, NOT committed) — COPY LAYER COMPLETE · GATE 21/21 + 401k regression GREEN
Sheet re-read (grew 358→389): Architect resolved every flag. Wired + gated (`_gate_tax_3a.js` 21/21;
`_gate_401k_cert.js` regression GREEN — shared-toggle change did NOT drift the certified 401k):
- **§18b sector clause** — B-SECTOR-BET now emits "…concentrated, with a tilt toward technology and the
  chips/software behind it" (`_diTaxSectorClause` off `_DI_TAX_SECTOR_CLAUSE`); raw "in Technology" echo GONE.
- **§18a geo prefix** — `_diTaxGeoDescriptor` (top value-weighted geo bucket → `_DI_TAX_GEO_PHRASE`) leads
  B-ALL-FOREIGN/GLOBAL-TILT/HOME-HEAVY ("It leans meaningfully international — it’s globally diversified…");
  sourced-or-blank (needs `s.geoed>0`); crypto lede suppressed when archetype named crypto.
- **Dedupe (Architect ruling a)** — `suppressTheme` from the fired archetype drops the matching B-SECTOR-BET
  tilt (verified: MULTI no longer double-echoes "in Crypto").
- **T3 retunes** — B-GLOBAL floor 30→20% (22% foreign now speaks); B-SATELLITE cap 25→30%; B-HOME-HEAVY
  eqT≥90 guard dropped (bank R86).
- **§15 toggles (T6)** — asset+debt-aware canon on EVERY modal ("Include this account/debt in my plan" +
  R226/R230 bodies); 401k [R]/[T] override + HSA/529 set-aside toggles left intact (regression-proven).
- **§14.4 all 14 column tooltips (T5)** — `_diTaxColTips()` verbatim from bank R375–R388 (the 3 former
  "457(b) artifacts" re-exported clean: Beta = capital-gains-bill, Yield = taxed-yearly, header Taxable-aware).
- **Design flag (b)** — B-OVERLAP stopgap left PARKED (R90/R219); code comment noted; no user-facing change.

**COPY LAYER = 100% WIRED.** Every renderable Taxable bank copy line is ✅ live or ⬜ deliberate.

#### INCREMENT 3 (working tree, NOT committed) — §11b COST-BASIS ESTIMATOR · GATE 11/11 GREEN
Feature built per bank A183:D211 + §11 R176–R181. `scripts/_gate_tax_11b.js` = **11/11** (equity/bond/cash
math exact; est-tag; §203 caveat; Opt5 gating; guard). Full suite: **tax 21/21 · §11b 11/11 · 401k regression
GREEN · all 11 rooms open error-free.**
- Per-row **"Finding your cost basis" panel** (`#cb-est-overlay`, layered above the account modal), opened by
  a **"≈"** button in each taxable Cost Basis cell. Design note: entry is per-ROW (not a header modal) because
  the estimate needs that row's value/class/date — flagged to Captain, accepted.
- **Reverse-growth math** `_cbEstimate` = value ÷ (1+rate)^years; `_cbRate` per col Z (equity 7 / bond 3 /
  cash 0 / other 5%; blank class → null → guard shows "enter class first", button no-op).
- **5-option dropdown** (Opt4 "Enter my own" default; Opt5 "Match actual return" offered per-row ONLY when that
  row's Acquisition Date is populated); no-selection fallback = 3 yrs.
- **Acquisition Date column** added (taxable-only via `taxRoomOnly`, bank R389 tooltip); feeds Opt5.
- **est. tag** (gold, hover shows assumed rate + year) on the basis cell; **§203 caveat** appended in `_diTaxD`
  + `_diTaxUGLadder` whenever `s.estCount>0`; **overwrite warning** (R181 verbatim) on a real basis; manual
  edit clears the est flag.

### ✅ TAXABLE "THE LIVING ROOM" — FULLY BAKED (copy + §11b feature), pending Captain smoke + commit
Every authored bank line ✅ live or ⬜ deliberate; §11b feature done + gated. **Zero unexplained ⛔.** studio.html
LF-clean, MD5 `be0ca567db9b513da4885bbb07a0316d` (pin bump goes in the SAME commit — done at commit time after
smoke, per L49). Open flags for Architect (non-blocking): §18b single-industry theme not yet detected; all-foreign
geo prefix mildly redundant (wired verbatim per ruling); B-OVERLAP real pairwise signal still parked (R90/R219).
**Room Wiring Ledger (workbook) row:** not written by Claude (open in Excel + Copilot-owned) — verdict text above
is ready for the Architect to paste. **HELD: not committed — Captain smoking, then pin-bumped commit.**

#### SMOKE FIXES + POLISH (Captain-directed, working tree) — GATES 23/23 · 12/12 · 401k GREEN
- **Estimator dropdown color** → `background:var(--bg-navy)` (was white-on-white).
- **Column-tooltip clipping** → th hovers flip to `position:fixed` on hover, clamped to viewport (escapes the
  table's `overflow-x` scroll clip; same fix as the title hover). All columns, all rooms.
- **Cost-basis input width** → forced `min-width` so the auto-layout column can't compress it; full value shows.
- **Cost-basis currency format** → text input shows `$2,041` (`_cbFmt`), state stays a clean number via
  strip-on-input; estimator fill re-renders formatted.
- **Sector / Asset Class (all `_sel` dropdowns)** → `min-width:112px` so they stop truncating to 3–4 letters.
- **§18b single-industry theme (Captain GO)** → `_DI_TAX_THEME_NAMES` + `_DI_TAX_SECTOR_CLAUSE` entry
  (Automobiles/Consumer-Goods/Investment-Banking/Insurance → "a single named industry"). L47-safe.
- **R84 all-foreign re-pulled** → Architect reworded to kill the geo self-echo ("…in fact almost all of it
  sits outside the US…"); live now matches v4 R84 verbatim.
- **B-OVERLAP real pairwise-overlap signal (R90/R219) = ⬜ DELIBERATELY-BLANK** — deliberately parked
  (Captain ruling); scoped engine task for later, NOT a gap. The sector-% stopgap proxy remains; sourced-or-blank
  behaving. Code comment noted in `_diTaxSignals`.

### 🏁 TAXABLE = ✅ SIGNED OFF + SHIPPED + PUSHED + LIVE — origin/main `26a9df7` (2026-07-04), marker-verified
on datumfi.com (openCBEstimator / _diTaxArchetype / archetype copy all serving). Studio pin `551d7f69`, guard
matches. Account #2 done. **NEXT = IRA "The Library" (tradira) / "The Conservatory" (rothira) — bank `IRA Copy
Bank` A1:D232, dual [R]/[T], same wire-then-audit method.** (This ledger line committed post-push in a follow-up.)

---

## STEP 0 — Taxable ROUTING BUCKETS (bank R391–R397, added 2026-07-04) · ✅ SHIPPED + PUSHED + LIVE

**🏁 origin/main `77c7e91` (2026-07-04) — 3-commit bundle `850e9b9`→`9762055`→`77c7e91` pushed & marker-verified
LIVE on datumfi.com** (markers serving: "real worth but no ticker" · "the Reveal investable check steps right
past it" · "More taxable / other" · `_isTaxableRoom` · "flag it as entity-owned"). Studio pin `a09a72f9`. All
3 buckets + all 3 room-intro hovers ✅ WIRED. ⬜ ONE park remains: R395 "Other Non-taxable" (treatment selector,
own pass). Detail below (verdicts stand):


Post-cert addition to the Taxable Copy Bank: four acknowledged-but-not-baked picker buckets that route into
EXISTING engines (no new rooms, L48). Captain ruling 2026-07-04: **ship 3 mechanical buckets now, PARK the
one that needs a feature.** Room-less by design (⬜) — picker labels + routing rules, not their own Copy Bank.

### Line-by-line audit (L50 DoD — zero unexplained ⛔)
| Bank | Bucket | Verdict | Wiring |
|---|---|---|---|
| R393 | Corporate / Business Taxable | ✅ WIRED | `taxable_corp` → Taxable "Living Room" engine verbatim (`_isTaxableRoom`), `owner:'entity'` (label-only), engine map → `taxable` |
| R394 | Other Taxable | ✅ WIRED | `taxable_other` → same Taxable engine, engine map → `taxable` |
| R396 | Other Assets | ✅ WIRED | `other_assets`, `taxCode:'other'` (modeled on 'physical': counts to net worth, excluded from equity/bond/Shape), in `FILTERED_TYPES`, `catSums.other` |
| R395 | **Other Non-taxable** | ⬜ **PARKED** | **Needs a user-stated treatment selector (pretax/Roth/edu; unknown→FLAG, never guess — L47). Deferred to its own focused pass. NOT wired, NOT dropped — resurfaces when we revisit STEP 0.** |
| R397 | "More taxable / other" expander UX | ✅ WIRED | picker nests all 3 under a collapsed-by-default expander after the joint list (`pickerGroup:'more-taxable'` + `.picker-expander`) |

meta subtitles are utilitarian descriptive placeholders (Captain-approved, no brand nicknames): Corporate =
"Entity-owned taxable" · Other Taxable = "Uncategorized taxable" · Other Assets = "Value-only asset".

### Gates
- `scripts/_gate_tax_routing.js` — **red-first PROVEN 3/27 (HEAD) → 27/27 (wired).**
- Regression (shared picker/engine surface): **401(k) cert `OVERALL: GREEN` · Taxable §3a/§4b `23/23` · §11b `12/12`.**
  The `_isTaxableRoom` point-check → helper swap did NOT drift the two certified rooms.

### Room-intro HOVER backfill (Captain-authored, follow-on commit — same held state)
Post-smoke gap: the 3 buckets had no room-level "what is this room" hover. Captain authored brand-voice intro
hovers (honest-limits: what it IS / how it works / what it does NOT do). Wired verbatim into `_diSetTitle`
(the title-ⓘ surface every intelligence room uses; straight→curly punctuation to match the file):
- **Corporate / Business Taxable** (R393 hover) — ✅ WIRED; distinct branch before the shared `_isTaxableRoom`
  Living-Room branch. Columns unchanged (engine identical).
- **Other Taxable** (R394 hover) — ✅ WIRED; own branch.
- **Other Assets** (R396 hover) — ✅ **WIRED (Captain ruling: Option 1 — extend the ⓘ to other_assets ONLY).**
  `_diSetTitle` early-return now lets `other_assets` through to the SHARED title-ⓘ wrapper (L48 reuse — same
  surface, one more id); own branch renders R396 verbatim. **Scoped to other_assets ONLY** — property/collectibles
  (Grounds/Arcade) stay plain (no authored hover copy, L47); gate proves they don't inherit the ⓘ.
Gate `_gate_tax_routing.js` = **36/36** (OA red-first: R396 + ⓘ checks FAIL pre-wire → PASS; Grounds/Arcade
no-ⓘ PASS both ways). Regression re-run GREEN (401k OVERALL, tax 23/23, 11b 12/12).

### Ship state
studio.html LF-clean, MD5 `a09a72f9623d0ef2ad6f6a937409c2a7` (pin bumped SAME commit, L49 — `build-dist.mjs`).
Three commits **HELD, unpushed**: `850e9b9` (routing wiring) + `9762055` (Corp/Other hovers) + follow-on
(Other Assets hover). **HELD for Captain final :8001 walk → push all three together on his word.** ⬜ **ONE
PARK remains (durable): R395 "Other Non-taxable" — needs a treatment-capture selector (pretax/Roth/edu;
unknown→FLAG, never guess); its own feature pass, do NOT draft copy.** After push: NEXT = IRA "The Library"
(tradira) / "The Conservatory" (rothira), bank `IRA Copy Bank` A1:D232, dual [R]/[T].

---

## IRA — "The Library" (tradira [T]) / "The Conservatory" (rothira [R]) · ACCOUNT #3 · PHASE-1 AUDIT (2026-07-04)

Fresh re-dump (L50 step 1): `IRA Copy Bank` = 222 rows / 474 non-empty cells (workbook saved 08:48). §1–§15
authored; NO WIRE-THEN-AUDIT block at 224–232 (bank ends §15/R222 — that landmark estimate was off). Engine:
`_diNarrIRA` (L4242) runs `_DI_IRA_LAYERS` (L4232); `_diIraColTips` (L4251); IRA `_diBankStrip` branch (L5066);
title in `_diSetTitle` (L5586 Conservatory / L5593 Library); dispatch L5522. Read against the live engine:

### ✅ WIRED — verbatim, current
| Bank § | Live | Note |
|---|---|---|
| §2 Title hovers [R]/[T] | `_diSetTitle` L5586/L5593 | "The Conservatory — a Roth IRA" / "The Library — a Traditional IRA" verbatim (R21–R30) |
| §12 Per-column tips (14 cols) [R]/[T] | `_diIraColTips` L4251 | Ticker→Instrument all match R115–R128; [R]/[T] resolved |
| §9 Layer A Spine [R]/[T] | `_diIraSpine` L4148 | verbatim R85 |
| §9 Layer B Tilt (§13 geo/sector) | `_diIraTilt`→`_diTiltSentence`/`_DI_TILT_WRAP_IRA` L4174 | verify it emits the granular §13 clean phrases (R139–R174) |
| §9 Layer B2 Composition Read [R]/[T] | `_diIraCompRead` L4162 | verbatim R87; floors tuned (≥3 tickers, ≤30% sat) |
| §9 Layer C Behavior (beta + single-name + Roth bond-location) [R]/[T] | `_diIraBehavior` L4178 | verbatim R88; §7.4 tokens wired honest |
| §9 Layer E Tax / F Toggle / G Contribution [R]/[T] | `_diIraTax`/Toggle/Contrib L4214–4231 | verbatim R90/R91/R92 |
| §1 Signal strip [R]/[T] | `_diBankStrip` ira branch L5066 | Balance/Contribution/UG/Equity/Bond/Cash/Intl/Beta/Yield match R10–R15 |
| §3 Withdrawal modal (59.5, NO Rule-55) | shared modal isIRA | bank §6 confirms code omits Rule-55/super — structurally present (verify copy) |

### ❌ NOT-WIRED / DRIFTED — real gaps (red-first, my lane; copy authored)
| # | Bank § | Gap |
|---|---|---|
| ~~I1~~ | §3a Composition Archetype (R179–R195) | ✅ **WIRED (Increment 1 · commit held-not-pushed).** `_diIraArchetype(s,x,isRoth)` — 11 archetypes [R]/[T] verbatim; reuses `_diTaxSignals` + the `_diTaxArchetype` trigger ladder (L48); `_diNarrIRA` rewritten inline so the archetype REPLACES the spine and suppresses B2 on a fire. Gate `_gate_ira_cert.js` red-first **5/14→14/14**; regression GREEN (tax 23/23, 11b 12/12, routing 36/36, 401k OVERALL). **3 FLAGS→Architect:** (a) R180 "instrument-mix proceeds" but the IRA bank embeds instMix in the spine (no standalone §3b) → the "built from …" detail is DROPPED on an archetype fire; want a standalone IRA instrument-mix sentence (mirror Taxable §3b)? (b) tested MULTI before SATELLITE (bank lists opposite; multi-coin is the more specific read — matches live Taxable R324); (c) reit floor ≥9.5 mirrors the reused Taxable engine's tolerance for the bank's "≥10%". |
| ~~I2~~ | §1 R16 + §9 Layer D (R89) — `{feeDrag30yr_fmt}` | ✅ **WIRED (Increment 2 · held-not-pushed).** `_diIraFeeDrag` = Method-A value-differential [V·(1+g)³⁰ − V·(1+g−e)³⁰], g = value-weighted `_cbRate` (reuse §11b, L48). **Derivation VALIDATED — reproduces the bank's $11,600 worked example exactly.** §9 Layer D R89 [R]/[T] enriched with feeDrag on the EXPENSIVE tier; §1 R16 strip shows "0.85% · $162,000". Gate red-first 15/20→20/20; full regression GREEN. **FLAG:** the bank's single R89 template fires on "notable (high OR low)" but its "make the switch" framing only fits EXPENSIVE — LEAN keeps the prior short line; want a lean-positive Layer D variant (Taxable split R169/R172)? |
| ~~I3~~ | §8 Dated limits table (R70–R79) + §7.1 | ✅ **WIRED (Increment 3 · held-not-pushed).** `_DI_IRA_LIMITS` (2025=7000/1000, 2026=7500/1100, superCU=0) + `_diIraLimits()` LOOKUP(taxYear), mirrors `_DI_402G_LIMITS`. Both the modal default AND the live-recalc now read the dated table for IRA (was hard `7500`/`1100`). Gate red-first 21/24→24/24; regression GREEN. **FLAG (R79):** unknown future year falls back to most-recent row (like 401k); bank wants a "limits pending IRS release" state — deferred (table is a one-row yearly edit, gap hypothetical). |
| ~~I4~~ | §15 Education panel "Why an IRA?" (R208–R222) + §14 S1/S2/S5/S6/S7 | ✅ **WIRED (Increment 4 · held-not-pushed).** `_diIraWhyPanel(acc,base)` — net-new collapsible panel injected into the IRA modal (IRA-only), all §15 sections VERBATIM; S1 hero lead; S2/S6/S7 [R]/[T] emphasis ("you hold a Roth/Traditional"); **S5 workplace-plan nudge fires FIRST + gold-highlighted when a 401k/403b/457b is in the estate** (`state.accounts` scan). Dated limit via `_diIraLimits()` (R220: $7,500, not baked $7,000). Gate red-first 25/32→32/32 (incl. S5 toggle both ways); regression GREEN. **FLAGS:** (a) S7 pro-rata specific NOT surfaced — no verbatim §15 copy (lives only in the S7 suggestion R205); (b) flag #1 instrument-mix standalone STILL pending Architect copy (bank unchanged at 232 rows) — not fabricating (L47). |
| ~~I5~~ | §4 modal limit hovers — R41/R42/R43/R44/R45 | ✅ **VERIFIED + CLOSED (Increment 5 · held-not-pushed).** Verify found §4 already substantially wired: R41 header ✅, R43 catch-up (toggle hover) ✅, **R44 [R] income-phaseout ✅ (L6020), R45 [T] deductibility ✅ (L6021)** — all verbatim. Only gap: R42 Base-Limit FIELD hover was 401k-only → now wired for IRA (near-duplicate of R41 by design; matches the 401k field-hover pattern). Gate red-first 37/38→38/38; regression GREEN. §4 fully wired. |

### ⬜ DEFERRED (ASSUMED-FIXED / no data source — parked, same posture as 401k)
- §7.2 toggle/phaseout wiring: Roth 5-yr clock, [T] deductibility MAGI, [R] Roth income phaseout, catch-up inflow
  cap — all DISPLAY-ONLY, no input source (mirror 401k deferred). Copy ships behind ⚠ ASSUMED-FIXED banner.
- §14 Architect suggestions S1–S8 (R197–R206): DESIGN RECOMMENDATIONS — "Architect to accept/reject; Claude
  build once accepted." NOT yet-authorized wiring → HOLD for Captain ruling (several need net-new engine inputs:
  S3 backdoor eligibility, S4 room meter, S8 conversion clock).

### [R]/[T] TWIN GAPS
None found in the audited sections — both branches authored throughout (§9, §12, §1, §3a). Confirm per-line during wiring.

### PROPOSED INCREMENT ORDER (HELD for Captain GO — Phase 1, no edits yet)
1. **I1 §3a Composition Archetype** (biggest nuance; reuse Taxable pattern, L48) → red-first `_gate_ira_cert.js`.
2. **I2 feeDrag30yr** enrichment (§1 + §9 Layer D drift fix).
3. **I3 §8 dated limits table** (LOOKUP mechanism).
4. **I4 §15 education panel** (net-new).
5. **I5 §4 modal hovers** verify/close.
Then Lesson-50 line-by-line zero-⛔ audit → cert gate GREEN → MD5-pin → HOLD for push. §7.2 + §14 stay ⬜/held.

### ✅ IRA — L50 WIRE-THEN-AUDIT CLOSE (Increments I1–I5 complete · HELD for Captain smoke + push)
Line-by-line bank↔live, zero unexplained ⛔. **All renderable IRA bank copy is ✅ live or ⬜ deliberate:**
- §1 signals ✅ (strip + feeDrag I2) · §2 title hovers ✅ · §3 withdrawal (59.5, NO Rule-55, [R]/[T]) ✅
  (5-yr-clock GATING ⬜ §7.2) · §4 limits ✅ (I5: R41/R42/R43/R44/R45) · §5 toggles ✅ (asset+debt canon,
  same as Taxable) · §8 dated limits ✅ (I3) · §9 DI paragraph ✅ (§3a archetype I1 + A/B/B2/C/D-feeDrag-I2/
  E/F/G) · §12 all 14 col tips ✅ · §13 geo/sector granular clean clauses ✅ (verified: "technology and the
  chips/software behind it") · §15 "Why an IRA?" panel ✅ (I4, +S1/S2/S5/S6/S7).
- ⬜ DELIBERATELY-BLANK / deferred: §7.2 toggle/phaseout GATING (Roth 5-yr clock, [T] deductibility MAGI, [R]
  Roth income phaseout, catch-up inflow cap) — no data source, ASSUMED-FIXED like 401k · §14 S3/S4/S8 (backdoor
  eligibility, contribution-room meter, conversion clock) — need net-new inputs, Captain-HELD.
- ⚑ PENDING ARCHITECT COPY (not fabricated, L47): flag #1 standalone instrument-mix on an archetype fire
  (bank unchanged 232 rows) · §9 Layer D lean-positive feeDrag variant · S7 pro-rata line.

**7 commits HELD, unpushed:** `2a59328`(audit) `f3e76ef`(I1 §3a) `54167f4`(I2 feeDrag) `7bb9321`(I3 §8 limits)
`e4303f4`(I4 §15 panel) `e8c5b5f`(I5 §4). Studio pin `edb71dfd`. Gate `_gate_ira_cert.js` = 38/38; regression
GREEN every increment (tax 23/23, 11b 12/12, routing 36/36, 401k OVERALL).

### 🔎 CAPTAIN SMOKE CHECKLIST — IRA bundle (local :8001 → then push GO)
Open **http://127.0.0.1:8001/studio.html**. Add a **Roth IRA "The Conservatory"** and a **Traditional IRA
"The Library"** (Primary Architect Spaces).
1. **I1 §3a archetype** — open each, ❖ Begin Interior Decorating, add **BTC + ETH + VTI**. DI opens with
   "…a multi-coin crypto sleeve — 45% of the account…"; tail flips **Roth** "…tax-free forever…steer your
   highest-upside sleeves here" vs **Trad** "…all pre-tax…ordinary income when you withdraw it." (Archetype
   REPLACES the generic "This Roth/Traditional IRA is…" spine.)
2. **I2 feeDrag30yr** — one holding, value **$100,000**, Exp Ratio **0.85**. DI Layer D reads "…on this
   balance it's about **$162,000** … never compounds for you" (Roth) / "…$162,000 in drag … pure loss you
   fully control" (Trad). The **Avg Expense** signal box shows "**0.85% · $162,000**".
3. **I3 §8 dated limits** — scroll to CONTRIBUTION LIMITS: Base **7,500**, Catch-Up **1,100**, Active Max
   **$7,500 / YR** (2026, LOOKUP-driven — no super-catch-up row).
4. **I4 §15 panel** — bottom of the modal, click **"Why you'd use an IRA…"** → expands: hero line "Your IRA,
   your menu — the whole market is your fund list," then the sections. **Now add a Pre-Tax 401(k)** and reopen
   an IRA → the **gold-highlighted "You also hold a workplace plan…stacks on top"** nudge appears FIRST.
5. **I5 §4 hovers** — hover **Base Limit** (IRA top-up line), the **Age-50 catch-up** toggle ("NO super
   catch-up exists for IRAs"), and the italic note under it: **Roth** = "direct Roth…phase out…backdoor" /
   **Trad** = "fully deductible, partly deductible, or not at all."

Verify live (after push) by markers not MD5: "multi-coin crypto sleeve" · "never compounds for you" ·
"the whole market is your fund list" · "You also hold a workplace plan". **§7.2 stays behind the ⚠
ASSUMED-FIXED posture.** HOLD for Captain GO before push.

---

## IRA — TASK 2 · §9a Spine tokens + §14 S3/S4/S5 · L50 WIRE-THEN-AUDIT CLOSE (2026-07-04, HELD for push)

Follow-on to I1–I5 (live `2f1c69a`). NEW authored bank copy — NOT in the 7 pushed commits. Sources (fresh
13:21 workbook re-pull): **§9a = `IRA Copy Bank` R97–R117** (the stale pre-13:21 save had §10/§11/§12 there —
re-pulled); **S3/S4/S5 = `IRA Copy Bank v3` R6/R7/R8**. Captain-approved preview; single coherent commit.

### ✅ WIRED — verbatim, gated, zero unexplained ⛔
| Bank § | Live | Note |
|---|---|---|
| §9a `{spineShape}` 6 cases (R101–R106) | `_diIraSpine` rebind | SS-ALL-EQUITY/EQUITY-TILT/BALANCED/BOND-HEAVY/CASH-HEAVY/MIXED, first-match on value-weighted `x.eqT/x.bdT/x.cashT`. Retires the generic `_diSpine` concentration read. Order verbatim R101→R106 (Captain-ruled: 45%eq/55%bond = "a balanced account", not bond-heavy). |
| §9a `{instrumentMix}` 6 cases (R109–R114) | `_diIraSpine` rebind | IM-ALL-ETF…IM-MIXED on `x.etfPct/mfPct/stockPct/fundPct`; phrases verbatim (Taxable §3b, L48). Retires generic `_diInstMix`. |
| §9a `{breakdown}` + `{taxTail}` (R115) | `_diIraSpine` | " — NN% ETFs, …" (ETFs→MFs→stocks, ≥1% each); EMPTY at 100% (the `<99.5` guard). taxTail flips [R] tax-free / [T] tax-deferred. Renders ONLY on §3a AR-NONE fall-through (R116) — call site `_diNarrIRA` passes `x`. |
| §14 S3 backdoor awareness (v3 R6) [R]/[T] | `_diIraWhyPanel` | Replaced the generic non-gated "income-limit trap" body with the taxCode-gated verbatim pair (roth=income-ceiling/backdoor · pretax=deduction-phaseout). Awareness only — no MAGI math (§7.2 deferred). |
| §14 S4 contribution-room meter (v3 R7) | `_diIraWhyPanel` | Net-new. `{used}` = Σ `inflow×freq` over the estate's IRA lanes (sourced-or-empty-state, L47); `{limit}` = `_diIraLimits()` LOOKUP (reuse I3, no baked 7500); roll-over sub-line verbatim. |
| §14 S5 separate-bucket nudge (v3 R8) | `_diIraWhyPanel` | Replaced the I4 paraphrase (+ "big overlap" section) with the v3 R8 verbatim nudge; gated on any `401k/403/457b` in the estate, else ⬜ blank. Marker "You also hold a workplace plan" preserved. |

### Gate + regression
- `scripts/_gate_ira_cert.js` extended **38→49** checks; **red-first PROVEN: 11 new FAIL on HEAD (38/49) → 49/49
  after wiring.** (2 existing I4 checks re-anchored — they asserted the now-removed "big overlap"/"$7,500 IRA
  limit" copy; re-pointed to still-authored content + the S4 `$7,500 IRA room` dated-limit, intent preserved.)
- Regression GREEN: Taxable `_gate_tax_3a` 23/23 · `_gate_tax_11b` 12/12 · routing 36/36 · 401k cert OVERALL.
- `node scripts/build-dist.mjs` → **sacred hosts byte-identical** (pin bumped `edb71dfd`→`3b4049b9`, L49 same commit, LF-clean).

### Scope notes (durable) & Room Wiring Ledger
- **S4 single-owner estate-scan** — `{used}` sums ALL IRA lanes' `inflow×freq` regardless of owner (same pattern
  as S5's workplace scan). **Multi-owner is a future refinement, NOT this pass** (Captain-accepted known scope note).
- Section-header labels ("The income-limit trap…", "Your {yr} contribution room") are chrome, not brand copy —
  v3 authors the bodies (Captain-accepted).
- **Room Wiring Ledger flip (workbook, Copilot-owned):** Trad R80–91 / Roth R93–104 ❔→✅ — verdict text above is
  ready for the Architect to paste (Claude does not edit the .xlsx).

**§9a + S3/S4/S5 = ✅ WIRED verbatim, zero unexplained ⛔.** ⬜ deferred unchanged (§7.2 phaseout math, §14 S3/S4/S8
live eligibility — no data source). **HELD for Captain push GO.** Live-verify markers (after push): "an all-equity
account, built entirely from ETFs" · "a bond-heavy, income-leaning account" · "good news: this IRA is a SEPARATE
bucket" · "Your {yr} contribution room".

## 457(b) — "The Workshop" (pretax457b [T]) / "The Annex" (roth457b [R]) · ACCOUNT #4 · ENRICHMENT + L50 AUDIT (2026-07-05)

### Re-scope finding (Phase 1)
The onboarding §6.5 "known live bug" (IRA-leak: Age 59.5, "IRA Limits", base 7000) was **ALREADY fixed
live** at `84a7519` + smoke-fix `962e3d6` — proven by `_gate_457_di.js` **53/53 GREEN before any edit**.
T2/T3 = DONE (onboarding text described pre-`84a7519` history). Real gap = post-authoring bank enrichments
un-emitted: §13c B2 (I1), §3a archetype (I2), §15 education (I3). T5 spine-binding: `_di457Spine` binds
`_diSpine`+`_diInstMix` = the same allocation path as IRA §9a — **NO DRIFT**.

### I1 · §13c B2 Composition Read — ✅ SHIPPED + PUSHED + LIVE (origin/main `976a654`, 2026-07-05)
| Bank § | Live | Note |
|---|---|---|
| §13c B2 Composition Read (R106 / R185–R190) | `_di457CompRead` in `_DI_457_LAYERS` B2 seam | Reuses `_diSleeves` + shared IRA/401k gate **verbatim** (L48: invCount≥3 / ≥2 sleeves / top<50% / satPct & unclPct honesty guards). Wrapper-neutral sleeve clause identical [R]==[T]; 457 tax-tail forks (Annex tax-free / Workshop tax-deferred, both carrying separation-based access). SILENT when a sleeve ≥50% (matches §11 vanilla worked example → correct). |

- Gate: `_gate_457_di.js` **de-staled** — false "B2 ABSENT (no verbatims authored)" → true "top sleeve >50%";
  + diversified fixture (core30/intl25/bonds25/small20) with **6 red-first B2-FIRES assertions**. RED on
  un-wired code → GREEN after. Studio pin bumped `3b4049b9`→`b4c26062` (L49 same commit, LF-clean).
- Regression GREEN: IRA cert 49/49 · tax_3a 23/23 · tax_11b 12/12 · routing 36/36 · 401k cert · 457 OVERALL.
- Live markers (datumfi.com/studio.html — marker-verified, NOT MD5 per L50): `_di457CompRead` present ·
  "a plan menu can hide a lot of overlap behind eight fund names" (both branches) · "every one of those
  sleeves compounds tax-free" [R] · "this whole mix grows tax-deferred, taxed as ordinary income only when
  you draw on it" [T].

### 🗂️ KNOWN SUPERSEDED-GATE ITEM (backlog — scheduled on its own, NOT folded into a room commit)
- `scripts/_gate_taxable_di.js` is **RED at HEAD** (proven pre-existing by reverting studio.html to HEAD;
  4 REDs on an EX2 "52% Technology sector bet" fixture). It is an OLD Taxable DI gate **superseded** by the
  certified Taxable path (`_gate_tax_3a` 23/23 + `_gate_tax_11b` 12/12 + routing 36/36, all GREEN). Outside
  the named regression set. **Captain ruling 2026-07-05:** accepted as pre-existing, correctly flagged,
  correctly untouched — give it its own housekeeping pass (retire or re-anchor the stale fixture); do NOT
  fold into a room commit.

### I2 · §3a Composition Archetype — ✅ WIRED + GATE-GREEN (HELD for Captain smoke + push)
| Bank § | Live | Note |
|---|---|---|
| §3a Composition Archetype (R222–R238, 11 AR- cells + AR-NONE) | `_di457Archetype` + inline `_diNarr457` dispatch | **Clone of `_diIraArchetype` (L48, R238):** trigger ladder + shared bodies BYTE-IDENTICAL to the IRA/401k/Taxable engine, reading the shared `_diTaxSignals(acc,s)` (L47 guards baked in — junk/blank/unmapped excluded from num AND denom). ONLY the taxCode tail flips to the 457 Workshop/Annex verbatim. Archetype **REPLACES** the generic spine on a fire; Tilts proceed; **B2 suppressed** via `archFired`. Retired the flat `_DI_457_LAYERS` table for an inline dispatch mirroring `_diNarrIRA`. |

- **Order:** tests CRYPTO-MULTI before CRYPTO-SATELLITE (multi-coin = more specific; reconciled engine order,
  same FLAG as IRA — sheet lists reversed). First-match-wins per R223.
- **Live archetype audit (probe, both branches):** AR-CRYPTO-ALL ✅ · AR-GOLD-HEDGE ✅ · AR-BOND-INCOME ✅ ·
  AR-BOND-LADDER ✅ ("spanning Treasuries, corporates and TIPS") · AR-SECTOR-BET-NAMED ✅ (a single ≥50%
  industrial/dividend theme correctly names itself FIRST, per R233 preceding R234/R235 — AR-ALL-INDUSTRIALS /
  AR-DIVIDEND fire only on a spread) · **AR-NONE** ✅ vanilla/diversified core falls through to the generic
  spine on both branches with the right tax tail. Bodies wrapper-neutral [R]==[T]; tail flips ([T] "shared
  with the IRS as ordinary income at withdrawal" / [R] "yours untaxed — the ideal home for the highest-upside
  sleeves") — gate-asserted.
- **Gate:** `_gate_457_di.js` +crypto-all fixture, **10 assertions** (6 red-first FIRE/REPLACE/TAIL flipped
  RED→GREEN; 2 pre-wire guards stay green; 2 AR-NONE regressions). Studio pin `b4c26062`→`f116439a`
  (L49 same commit, LF-clean, 0 CRLF).
- **Regression GREEN:** IRA cert 49/49 · tax_3a 23/23 · tax_11b 12/12 · routing 36/36 · 401k cert · 457 OVERALL.
- **✅ SHIPPED + PUSHED + LIVE — origin/main `631cc4d` (2026-07-05), marker-verified:** `_di457Archetype`
  present · archetype bodies live · AR-NONE fallthrough live. (This ledger entry itself stays PARKED with the
  I1 note + taxable_di item — releases on a future ledger-flush, not with the room push.)

### Captain copy folds (2026-07-05) — baked into the I2 push `631cc4d`, marker-verified live
| Fold | Live | Note |
|---|---|---|
| FOLD 1 · SECURE 2.0 high-wage threshold $145k→$150k | is457 Age-50 tip | 2026 IRS COLA. `150k prior year` live, `145k` = 0 anywhere. Only the SECURE-2.0 wage threshold changed; R145/R147/R148 line-ref comments untouched. |
| FOLD 2 · roll-portability caveat | `_di457Tax` Layer E, shared const `_CAVEAT_457_ROLL` | Wrapper-neutral, provably identical [R]/[T]: the no-10% shield is not portable — rollout permanently loses it; rollin doesn't inherit it. Live: "roll this money OUT…permanently loses the shield" + "those dollars keep their own early-withdrawal rules". |

> Architect to reconcile the 457(b) Copy Bank sheet AFTER this push (R3/R43/R84/R97 → 150; Layer E R109 + §10/§11 → add the roll-portability caveat) so bank and live stay in lockstep.

### I3 · §15 "Why a 457(b)?" education panel — ✅ WIRED + GATE-GREEN (HELD for Captain smoke + push)
| Bank § | Live | Note |
|---|---|---|
| §15 education panel (R203–R219, 9 fields) | `_di457WhyPanel(acc, base)` + render at call site (`/457b/.test(base.id)`) | Expandable, default-collapsed, reuses shared `.ira-why-*` styling (L48). Renders for BOTH branches (copy is employer-type, not tax). All 9 fields verbatim R208–R216. |

- **Live panel audit (probe, both branches):** one-line answer ✅ · who-gets-457(b) ✅ · who-gets-403(b) ✅ ·
  **big overlap** ✅ (highlighted `hot` when a 403(b) coexists — S5 fill-both nudge) · 457(b)-edge ✅ ·
  403(b)-traits ✅ · portability-trap ✅ · **safety note** ✅ shows ONLY under `govPlan===true` (8 sections
  default / 9 with govPlan) · bottom line ✅.
- **§8 sourced, never baked:** the fill-both figure = `_diMoney(2 × _di402gLimits().base)` in context
  ("~$49,000 pre-tax in {yr} before any catch-up"); gate asserts the full panel-specific fragment (not the
  bare $-figure, which also appears in the special-catch-up hover — avoided a green-for-wrong-reason).
- **Overlap-by-design kept:** §15 portability-trap ↔ FOLD-2 Layer-E caveat = intentional (deep-dive panel vs
  inline nudge); both retained per Captain ruling.
- **Gate:** `_gate_457_di.js` +11 §15 assertions (9 red-first RED→GREEN; 2 guards: safety-hidden-default,
  no-IRA-panel-leak). Studio pin `81b4122c`→`06f2436c` (L49 same commit, LF-clean). Dist guard byte-identical.
- **Regression GREEN:** IRA 49/49 · tax_3a 23/23 · tax_11b 12/12 · routing 36/36 · 401k cert · 457 OVERALL.
- **HELD:** not committed/pushed — awaiting Captain smoke + GO. Room commit = atomic 3-file; this entry rides
  the parked ledger commit.

### 457 ROOM STATUS: all three enrichments wired (I1 §13c B2 · I2 §3a archetype + folds · I3 §15 panel), each section-audited live. Pending: Captain smoke+GO on I3 → push. Optional formal close = a consolidated R1→R248 sweep filling the workbook Room Wiring Ledger R67 block (offer to Captain).

---

## STEP A · Investment Modal Parity Spec — Slice 1 (W1 name-restore) — ✅ WIRED + GATE RED→GREEN

**Bug:** every account saved then reopened on a fresh/cross-device Clerk session rendered `undefined (JOINT) <meta> $<value>` (systemic, not property-only).

**Root cause (traced):** `slimSlotForClerk` (studio-blueprint.js:130) drops `name` to fit the 8192B Clerk `unsafeMetadata` cap ("derivable from baseId"); both restore sites (studio.html:7852, 9434) did `bp.accounts.slice()` and never re-derived it → `acc.name === undefined`. Same-browser reloads use the localStorage full copy and look fine; the Clerk slim mirror is the trigger.

**Fix (Option A · cap-safe):** `DatumBlueprint.hydrateAccountNames(accounts, resolveTitle)` re-derives a missing/blank name from `getBaseType(baseId).title`; a present custom name is preserved. Called at both restore sites (guarded by `window.DatumBlueprint`, falls back to `.slice()` → no regression). Zero Clerk bytes added. Option B (persist name in slim payload) held in reserve only if users report lost cross-device renames.

**Gate:** `scripts/_gate_w1_name_restore.js` — A1 proves the real serializer drops name (reproduction runs through the app's own path); A2–A7 flip RED→GREEN (property→"Real Estate", roth401k→"Roth 401(k)", custom "Lake House" preserved, unknown baseId→baseId, empty-string re-derives, end-to-end slim→hydrate).

**Regression GREEN:** archive-codec-parity · stepA · tax_3a · routing · ira_cert · tax_11b · stepC. Sacred pins bumped SAME commit (L49): studio.html `5cdd56ee→67db2af4`, studio-blueprint.js `f5c21c36→af1c1da4`. LF-clean.

### ⚠️ PARKED FLAG (separate arc — do NOT bundle): slim Clerk mirror ALSO drops `holdings` (studio-blueprint.js:138)
A cross-device Clerk sign-in loses typed tickers — undercuts Slice 3 parity + the STEP-C seed for logged-in users. Captain ruling 2026-07-08: tackle BEFORE any logged-in-user STEP-C seed relies on typed tickers surviving cross-device. Not W1 scope; logged here so it is not lost.
