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
