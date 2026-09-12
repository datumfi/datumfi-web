# Smokewalk — 12 September 2026

Nine commits are live on datumfi.com. This is what to click and what you should see.

**Every step has a failure sentence.** If you see the failure, stop and tell me — don't work
around it. A walk that only describes success teaches you to nod.

**Before you start:** hard-refresh the Studio (Ctrl+F5). JS caches for four hours; HTML does not.
If the page still looks like this morning after a hard refresh, stop — nothing below will mean
anything.

---

## A · The Measurement panel — the part you can see

The panel does not have a door yet. That is deliberate and ruled: REVEAL RANGE still runs the old
animation and lands on range.html, and the switch happens in one cutover at the end of the port.
**So to look at the panel you open the browser console (F12) and type:**

```
DatumMeasurement.open()
```

### 1 · The top of the panel

**You should see** a wide band across the top: a gold-rule kicker reading **Measurement · Range**,
the headline **"The Estate has been tested."**, and a paragraph beginning **"Across 40,000 modeled
paths — 10,000 from each of four market engines…"**. On the right, a boxed readout labelled
**Working range** with **Target spend**, **Plan confidence**, **Model design** and **Horizon**
beneath it.

⛔ **If you see "Projected Estate Capacity" and a row of small grey chips instead** — that is this
morning's build. The push did not reach you. Stop.

⛔ **If you see the number 10,000 anywhere in that paragraph as the total** — stop. The figure is
40,000, and 10,000 was wrong on that screen for months.

### 2 · The numbers are blank, and that is correct

**You should see** every value slot EMPTY — no dollar figures, no percentages. Only the words.

⛔ **If you see $132k, $190k, $154k, 84%, or "Datumae Blend" sitting there** — stop. Those are the
Mock's demo fixtures. A fixture wearing a real layout on a screen that tells someone what they can
afford is the exact defect we spent the day removing.

### 3 · The three cards

**You should see** three cards reading **Floor**, **Spend**, **Ceiling**. The Floor card's small
print says **"Five-scenario stress battery"** and **"It is not a Monte Carlo percentile."** The
middle card says **"Selected point on the 40,000-path curve"**. The Ceiling says **"Simulation
upper band"**.

⛔ **If the middle card is titled "Datum" and says "Chosen spending target"** — old build. Stop.

⚠️ Worth knowing: the middle card is now **the spend you typed**, not a number the engine picked.
That was a real defect this morning — the panel was going to show the engine's own recommendation
in the slot labelled as your choice, which would have made the confidence read about 89% for every
user forever. You caught it by asking what the word meant.

### 4 · The footer sentence

**You should see**, under the whole panel: **"Floor comes from the stress battery. Target spend and
the simulation Ceiling sit on the 40,000-path confidence curve; drag target spend to inspect another
point."**

⛔ **If that line is missing** — stop. It is the sentence that explains where each of the three
numbers comes from, and without it the cards read as three outputs of one machine, which they are
not.

### 5 · The three faces

**You should see** a row of three tabs: **Curve · Distribution · Tax**. Click each. The panel
should flip and the tab you clicked should look selected.

⛔ **If you see a single button saying "Show distribution" instead** — old build. Stop.

⛔ **If a tab does nothing when clicked** — stop. That button had no handler at all until today;
the Distribution face has been unreachable since the day it was built. If it is dead again, it is
dead for a new reason.

### 6 · The tax face, and the tile that opens it

In the right-hand column you should see a small tile reading **Effective tax ↗**. **Click it.** The
panel should switch to the Tax face. **Then press Tab until it is focused and press Enter** — it
should do the same thing.

⛔ **If the tile opens nothing, or opens with the mouse but not with Enter** — stop. It is a
`div` pretending to be a button, so keyboard support is not free; if it broke, it broke silently.

---

## B · The tax axis — the thing to look at hardest

This needs real numbers, so it only shows after a real run. **The Tax face will be empty until an
engine response exists in the session.**

**When it does have data, you should see** a y-axis whose top is a round number — 5%, 8%, 10%, 15%
— chosen to fit the household, and **0% at the bottom, always**.

⛔ **If the bottom of the axis is anything other than 0%** — stop. A household drawing from taxable
and Roth genuinely pays 0% federal in its early retirement years. If the axis floor moves up to
"fit" the data, six years of real zero get redrawn as six years of some tax, which is worse than
the flat line we were fixing.

⛔ **If the axis top is a number like 8.05% or 3.4%** — stop. The top is chosen from round human
numbers, never fitted to the data.

⭐ **What you asked for:** a household paying about 3% used to draw a flat smudge against a fixed
25% axis and read as broken. Now it gets a 5% axis and the line has shape. **The axis moved. Not one
number did.** If a household genuinely paid 30%, the axis would extend past 25 to fit it rather than
clip it.

---

## C · The convergence swarm

Also has no trigger yet — REVEAL RANGE still runs the old animation. To see it:

```
DatumMeasurement.runConvergence(new Promise(r => setTimeout(() => r(null), 8000)), {horizon:'31 yrs'})
```

That fakes an engine that takes eight seconds.

**You should see** a panel titled **The Convergence**, a hundred faint lines drawing themselves
across a chart, four tiles lighting up in sequence (Parametric, Historical, CAPE-Adjusted, Regime),
and a status reading **"Convergence computing"**. It should stay up for the **whole eight seconds**,
then say **"Convergence complete"** and close.

⛔ **If it closes before the eight seconds are up** — stop. The Mock version closes on a fixed
timer at about four seconds regardless of the engine. Ours is supposed to wait for the actual work.
A progress animation that finishes before the work does is a spinner that lies.

### The badge — the most important "should be empty" on this page

**You should see** the **Probability of success** badge with **no number in it** while the lines
are still drawing.

⛔ **If a percentage is sitting in that badge from the first frame** — stop. The Mock ships a
fixture 79% that is present before anything is computed. A probability rendered before the
computation returns is the purest version of the defect this whole week has been about.

*(In this fake run the badge stays empty at the end too, because the fake resolves with no data.
That is correct. With a real engine response it fills with the confidence at your own target spend —
the same number the panel calls Plan confidence, deliberately not a second figure.)*

---

## D · The neutral line — and a limitation you should know about before you find it

This one is easy to never see, because it only appears in one state.

**To make it appear:** run the Social Security claiming map once so a result is cached. Then,
**without changing anything**, ask for it again.

**You should see:** **"Showing your last claiming map."** with the two buttons — *Use Previous Map*
and *Recompute Anyway*.

⛔ **If you see "Inputs unchanged" or "Your claiming map is current — no inputs changed."** — stop.
That is the sentence that came off today.

### ⚠️ Read this part before you go looking for a bug

**A stale map behind that line is EXPECTED today, and it is not a new defect.**

The signature that decides whether your inputs changed is blind to five fields: **filing status,
location, healthcare cost, pension COLA, and custom market weights.** So if you change your filing
status and ask for the map again, you may be offered the previous one.

**That was true this morning too.** What changed is that the product no longer *claims* nothing
changed. It now says only what it can prove — that it is showing you the last map — and leaves the
choice to you via *Recompute Anyway*.

🔑 **The staleness was never the thing we were holding the push for. The sentence was.** A stale
value is an ordinary limitation. A stale value with a sentence asserting it is fresh is a lie the
product tells in our voice.

**The cache is not handled. It is next.** Fixing it properly means the signature deriving itself
from the payload rather than a hand-kept list, plus a gate that checks it mechanically the way the
engine already does. Until then, if you want certainty, press *Recompute Anyway*.

---

## E · Things you already know, where a regression would be quiet

These are the surfaces the nine commits touched that you'd use normally. Nothing should have
changed about them.

1. **Add a pension in Estate Drafting, open it, and look for "Cost of Living Adjustment (COLA) %".**
   It should be there and accept a number as it always did.
   ⛔ *If the field is gone or rejects input — stop.* Its value now reaches the engine for the first
   time; the control itself should be untouched.

2. **Run a Range the normal way (REVEAL RANGE).** The old animation should play and you should land
   on the range page exactly as before.
   ⛔ *If the reveal errors, hangs, or lands somewhere new — stop.* Nothing in these nine commits was
   supposed to change that flow. It changes at the cutover, not today.

3. **Light mode.** Toggle it and open the Measurement panel again. The hero, the tax face and the
   swarm should all read correctly on the light ground.
   ⛔ *If any of the three is unreadable — white text on white, or a missing background — stop.*
   Light-mode colours were ported with the design and should not need discovering.

---

## Covered by the suite, not by eye — do not try to smoke these

Listing them so the walk above is not padded, and so you know they were not skipped:

- The capacity curve is resampled onto the panel's own spend window rather than handed over raw.
  Only visible as a wrong-looking chart, which is exactly why it is gated instead.
- The Ceiling now comes from the simulation at all three sites, including every Social Security
  matrix cell. **Needs the engine container, which has not been rebuilt yet.**
- The tax interquartile band. **Also needs the container.** Until then the tax face draws the median
  line alone and says the band is *recorded, not yet modelled* — that wording is correct, not a bug.
- Both standing reds — the co-architect scope defect and the market-outlook control — are red on
  purpose and are build items, not regressions.

## What is live, and what is not

**Live now:** everything above in sections A, B, C, D and E — the whole client side.

**Not live:** the engine container has not been rebuilt. So the tax band is absent and the Ceiling
is still the old battery number until it is. That ordering is deliberate and written down in
`DEPLOY-SEQUENCE.md`: web must ship first, because the engine now requires the pension COLA field
that only today's build sends.
