# Make Tension Meaningful — Report-First Plan (Smoke #3, Part 2)

**Status:** REPORT-ONLY. No build yet. A fresh Opus builds from this plan after Captain rulings.
**Banked:** git (this file) + memory (`project_datum_fi.md`). Proposed workbook home below.
**Authored:** 2026-06-15, off live commit `a5eec69`.

---

## 0. The problem (Captain's finding #7, restated)

The tension/relief bars currently measure **geometric boundary movement** (Have→Want
distance per boundary). That is meaningful for the **Datum** (raising target spend = real
strain) but **useless for Ceiling/Floor**: later retirement raises the ceiling → labeled
"TENSION" even though a higher ceiling is *good*; earlier retirement lowers it → "RELIEF"
even though it's *weaker*. A "this is just distance, disregard" tooltip is the opposite of
meaningful. **Every feature must do real work.** The bars should make the **plan-health
implication** of each lever visible — **neutral, not good/bad** (people have valid reasons
to retire earlier/later, spend/contribute more/less).

Captain froze #7 (no relabel, no sign-flip) because this redesign supersedes a tooltip.

---

## 1. Trace — the tension-sign formula + EVERY consumer (file:anchor)

### 1a. The formula (identical convention in both apps)
Per boundary: `ratio = clamp( (want_or_designed_spend − have_or_ghost_spend) / max(1, have_spend), −1, +1 )`.
Positive → rendered "TENSION"; negative → "RELIEF". It is **signed boundary movement vs your
current shape** — geometric, NOT plan-health.

- **Studio (shared engine):** `datum-shape.js` `buildDiff()` **L297–311** — `_ch(wv,hv)` returns
  `{delta, ratio}`; `gap.{ceil,floor,datum}` + `tension[]` array (`{channel, ratio}`),
  `datumAboveCeil = wantEnd.datumSpend > wantEnd.ceilSpend`.
- **Sketch (inline, predates buildDiff):** `sketch.html` **L6536–6539** computes
  `_ceilTension/_floorTension/_datumTension` with the SAME clamp formula against
  `_ghostRefEnd` (the ghost/current baseline), then **L6540**
  `updateTensionVisuals(_ceilTension,_floorTension,_datumTension, dDatum>dCeil)`.

### 1b. The consumer (bar renderer — verbatim-shared by copy, two physical copies)
`updateTensionVisuals(ceilRatio, floorRatio, datumRatio, datumAboveCeil)`:
- **Sketch:** `sketch.html` **L6589+** (canonical original).
- **Studio:** `scripts/studio-wantface.js` **L396+** (VERBATIM port; called from
  `renderWantFace` **L286**: `updateTensionVisuals(diff.tension[0].ratio, [1].ratio, [2].ratio, g.datumAboveCeil)`).
- Bar fill width = `|ratio|`; color = gold (ceil) / red (floor) / teal (datum) in tension,
  **blue in relief** (`ratio < 0`); 30%/60% thresholds; ceiling-line glow only when `ceilRatio>0`.
- Bar fill markup: `#d2-tension-{ceil,floor,datum}-fill` (sketch L2204/2214/2224; studio L2345+).

### 1c. The lever-fill (toggle color today — partial precedent to extend)
`scripts/studio-wantface.js` `_colorWantSliders()` **L47–59**: gold/red/neutral gradient on each
Want slider keyed to a static `STR` monotonic-direction map (age:−1, activation:+1, plan:−1,
portfolio:+1, datum:−1, contrib:+1) vs `_haveSliderPos`. This is the seed of the "toggle lights
up" idea but it is **direction-only, single-color, not boundary-aware**.

---

## 2. The plan-health signal that already exists (no new engine math needed)

`datum-shape.js` `buildShapeState(ptsEnd)` / `getShapeStateObj` **~L560–590** classifies the shape
from **`spending(datumSpend)` vs `ceilSpend`**:
- `spending >= ceilSpend` → **OVEREXTENDED** (`overRatio=(spending−ceilSpend)/ceilSpend`)
- `spending >= ceilSpend*0.85` → **STRETCHED** (`stretchRatio=spending/ceilSpend`)
- below floor band → **GROUNDED/ABUNDANT**; else **EXPANSIVE**.

**Key insight:** the canonical plan-health axis is **`datumSpend / ceilSpend`** (how much of your
structural capacity your target spend consumes) plus the **floor margin** (`datumSpend` vs
`floorSpend` = does the worst case still cover your spending). Both are pure functions of the
endpoint spends that `computeAt` ALREADY returns and that `buildDiff` ALREADY has for have+want.
**Re-pointing the bars to plan-health pressure needs NO new engine math — only a new derivation
from existing endpoints.**

---

## 3. PROPOSAL

### 3a. Bar re-point — pressure, not movement (neutral)
Replace per-boundary "movement vs have" with **per-boundary plan-health pressure**, computed from
existing spends:
- **Ceiling pressure** = `clamp(datumSpend / ceilSpend, 0, 1+)` — how close your spending sits to
  your structural max. (Identical axis to `buildShapeState`; OVEREXTENDED ⇒ >1.) Gold.
- **Floor pressure** = `clamp((datumSpend − floorSpend) / max(1, datumSpend), 0, 1)` — how much of
  your target leans above the survival floor (worst case can't cover it). Red.
- **Datum** = teal, the position/identity bar (its own movement remains meaningful).
- **Relief (blue):** when a lever *reduces* a boundary's pressure vs the current shape, that bar
  renders blue (existing relief path), magnitude = size of the reduction.
- **Magnitude (HOW MUCH)** = the pressure level / its change → bar fill width. (Division of labor:
  **bars = HOW MUCH**.)

This makes ceiling/floor bars *mean something*: "your spending is at 92% of your ceiling" is real
and neutral; "you moved the ceiling up 4%" is not.

### 3b. Toggle color-mapping — THAT something happened (the hint)
When a lever moves, light **the lever control itself** in the color of the boundary(ies) whose
**pressure increased** (strain), computed as `want_pressure − have_pressure` per boundary:
- Ceiling strain → **gold**; Floor strain → **red**; Datum strain → **teal**.
- **Multi-boundary strain** (e.g., retire earlier raises ceiling pressure AND floor pressure) →
  **blended fill** (e.g., gold→red gradient) signaling multi-boundary negative impact.
- **Relieving lever** (e.g., retire later: lowers ceiling+floor pressure) → toggle goes **blue**,
  and the corresponding bars render blue relief where there is no offsetting strain.
- Extends `_colorWantSliders` (L47–59): replace the static `STR` map with per-lever pressure-delta
  computation; blend when ≥2 boundaries strain. (Division of labor: **toggle = THAT + which + direction**.)

### 3c. Impact map — 109-case copy + all 5 gates
- **109-case copy (crown jewel) — UNAFFECTED.** `getPinnedCaseObj` keys off the **lever + shape
  state**, not the tension ratios. Bars/toggles are downstream of state, not inputs to copy. As
  long as `buildShapeState`/`getPinnedCaseObj` are untouched, `_s2_copy_parity` stays 109/109.
  **Do NOT touch the copy engine.**
- **`_builddiff_proof`** — WILL need updating: it asserts the OLD signed-movement tension (e.g.
  "datum-up ⇒ +tension, datum-down ⇒ −relief"). Re-point `buildDiff.tension` ⇒ rewrite those
  assertions to the new pressure semantics. (Proof gate, not a frozen fixture — safe to evolve.)
- **`_solveinverse_parity`, `_buildrequirements_parity`** — UNAFFECTED (solver + What-It-Takes
  math untouched).
- **sketch inline syntax** — unaffected (edits stay syntactically clean; run gate).
- **NEW gate recommended:** `_tension_pressure_parity.js` asserting Sketch inline tension ===
  Studio buildDiff tension for a scenario sweep (locks the two computation sites together).

### 3d. Sketch + Studio lockstep (respects sacred Sketch + crown jewel)
The tension convention lives at **two computation sites** (Sketch inline L6536–6539; Studio
`buildDiff` L297–311) and **one shared-by-copy renderer** (`updateTensionVisuals`, sketch L6589 /
studio-wantface L396). All must move together:
1. **Engine first:** add the pressure derivation to `datum-shape.js` (new helper, e.g.
   `buildTension(end)` returning per-boundary pressure + a `pressureDelta(have,want)` ), parity-gated.
   `buildDiff.tension` consumes it. mount() untouched.
2. **Sketch inline** (L6536–6540): replace `_ceilTension/_floorTension/_datumTension` with the same
   helper so both apps compute identically; new `_tension_pressure_parity` gate green.
3. **Renderer:** extend `updateTensionVisuals` (both copies, kept verbatim-identical) for the
   pressure bars + relief-blue; if it grows, consider relocating to the shared module to kill the
   double-copy (separate, parity-gated step — Lesson 42: don't beautify+relocate together).
4. **Toggle coloring:** rewrite `_colorWantSliders` (Studio) + the Sketch equivalent for
   boundary-aware strain color + multi-blend + relief-blue.
5. Verify each via the **real tab** (Studio) and Sketch S1→S2 re-smoke; 5 (→6) gates green.

### 3e. Open rulings for the Captain (before build)
1. **Ceiling-pressure denominator** when OVEREXTENDED (`datum>ceil`): clamp at 1 (bar full) or let
   it read >100% (overflow styling)? Rec: clamp visual at 100%, but flag overextension via the
   existing red datum + canvas tint.
2. **Floor pressure semantic:** "margin above floor" (proposed) vs "datum-to-floor closeness."
   Rec: margin-above-floor (a thinning margin = rising red = real risk).
3. **Multi-boundary blend rendering:** two-stop gradient vs split bar. Rec: gradient on toggle,
   solid per-boundary on the bars.
4. Confirm `updateTensionVisuals` relocation to shared module is in-scope or a later step.

---

## 4. Proposed workbook home (for Captain transcription)
- **"Studio Reframe — North Star"** sheet → new section **"§19 — Make Tension Meaningful (Plan-Health
  Bars + Boundary-Aware Toggles)"**: paste §0–§3 above.
- **"Shape Parity Check"** sheet → new row: *"Tension sign = engine-level signed-movement convention
  (both apps); REDESIGN pending to plan-health pressure — see §19 / TENSION_REDESIGN_PLAN.md / new
  `_tension_pressure_parity` gate."*

(Authoritative copy is this git file; the workbook is the human-readable mirror.)
