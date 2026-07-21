# Ticker-Bar Column × Room Matrix — Architect authoring gap list

**Purpose (Captain #213):** the holdings **ticker bar** (per-holding table columns — *not* the rollup strip)
becomes universal across every investment room, with per-room hover copy where a field's *meaning* shifts.
This maps, per column per room, **REUSE-SHARED** (one shared hover line is correct everywhere) vs
**AUTHOR-NEW** (the room needs its own tax-lens hover), so the Architect authors only the real gaps.

Cross-referenced to: Parity Spec **W8** (universal manifest) + per-room authoring roster (Spec **R40–R52**)
+ Room Taxonomy STATUS/nicknames (R6–R63). Wirer = Claude; **copy is Architect-authored (L47 — I wire, I
don't invent).** This is an **inventory only** — no studio.html edits, no gate, nothing wired.

Live anchor: origin/main `f2e13e3` (STEP A shipped).

---

## Scope — 12 LIVE/ENRICH investment (ticker-bar) rooms

Value-only tiles (Other Assets) are **excluded** (no holdings table). The 3 taxable fold-outs
(Corporate / Other Taxable) **inherit the Living Room engine** — same column tips as Taxable, not listed
separately. Crypto (Cold Storage) is ENRICH + isInvestment (holdings-bearing) → included.

| Room (nickname) | Account | taxCode | Lens family | Column-tip status TODAY |
|---|---|---|---|---|
| The Living Room | Taxable Brokerage | taxable | **A · Taxable** | ✅ authored (`_diTaxColTips`) |
| Cold Storage | Crypto Wallet | (migrating) | **A · Taxable (crypto)** | ⛔ shared defaults |
| The Library | Traditional IRA | pretax | **B · Deferred** | ✅ authored (`_diIraColTips` [T]) |
| The Treasury | Traditional 401(k) | pretax401k | **B · Deferred** | ⛔ shared defaults |
| The Tenure | Traditional 403(b) | pretax | **B · Deferred** | ⛔ shared defaults |
| The Workshop | Traditional 457(b) | pretax | **B · Deferred** | ✅ authored (`_di457ColTips` [T]) |
| The Conservatory | Roth IRA | roth | **C · Roth / tax-free** | ✅ authored (`_diIraColTips` [R]) |
| The Vault | Roth 401(k) | roth401k | **C · Roth / tax-free** | ⛔ shared defaults |
| The Chancel | Roth 403(b) | roth | **C · Roth / tax-free** | ⛔ shared defaults |
| The Annex | Roth 457(b) | roth | **C · Roth / tax-free** | ✅ authored (`_di457ColTips` [R]) |
| The Academy | 529 Education | edu | **D · Education** | ⛔ shared defaults |
| The Infirmary | HSA | hsa | **E · HSA (triple-adv.)** | ⛔ shared defaults |

> ⚠️ **Roster caveat:** Spec R40–R52 mark these rooms "✅ AUTHORED" — but that is the **§Rollup-Parity
> strip** (the 11 summary metrics), a *different* surface from the per-column table hovers mapped here.
> Rollup-strip authored ≠ column-tips authored. The column tips are only wired for Taxable / IRA / 457(b).

---

## Column classification

### The 11 account-agnostic columns → REUSE-SHARED in **every** room
`Ticker · Name · Price · Shares Owned · Position Value · Beta · Geography · Sector · Exp Ratio ·
Asset Class · Instrument`

A beta is a beta; a fund name is a fund name; a fee is a fee — the meaning does not change with the tax
wrapper. The shared `COLS.tip` line is correct in all 12 rooms. **No authoring needed.** (Rooms that
already authored all 14 tips — Taxable/IRA/457 — may keep their voice-variants; that's polish, not a gap.)

### The 4 tax-lens columns → AUTHOR-NEW where the wrapper changes the meaning
`Cost Basis · Unrealized Gain · Acquisition Date · Yield`

These are the only columns whose *meaning* shifts by tax treatment. Cost Basis / Unrealized Gain /
Acquisition Date are currently **hidden** outside taxable/IRA/457 (`taxableOnly` gate) — the universal-bar
increment turns them ON everywhere with a `—` value + an N-A hover. Yield is always visible but its hover
must not claim "reinvests untaxed" in a taxable room (that copy is only true for tax-advantaged wrappers).

---

## The matrix — room × 4 tax-lens columns

Cell key: **REUSE-EXISTING** (already authored & live for this room) · **AUTHOR-NEW** (gap) ·
each with the intended read. N-A = renders `—` + an explanatory hover (why the field doesn't apply here).

| Room | Cost Basis | Unrealized Gain | Acquisition Date | Yield |
|---|---|---|---|---|
| **Living Room** (A) | ✅ REUSE-EXISTING — tax-lot, real CG slice | ✅ the CG-taxable slice | ✅ holding period → ST vs LT gains | ✅ taxed the year paid |
| **Cold Storage** (A-crypto) | 🆕 AUTHOR — basis = CG slice (crypto is property) | 🆕 taxable gain, no wash-sale | 🆕 holding period → ST/LT | 🆕 usually `—` (spot has no yield) |
| **Library** (B) | ✅ REUSE-EXISTING [T] — N-A: all-ordinary-income out | ✅ [T] N-A: taxed as ordinary income, not CG | ✅ [T] N-A: holding period irrelevant | ✅ [T] compounds untaxed; taxed at withdrawal |
| **Treasury** (B) | 🆕 AUTHOR [T] *(L48: reuse Library [T]?)* | 🆕 [T] | 🆕 [T] | 🆕 [T] |
| **Tenure** (B) | 🆕 AUTHOR [T] *(L48: reuse Library [T]?)* | 🆕 [T] | 🆕 [T] | 🆕 [T] |
| **Workshop** (B) | ✅ REUSE-EXISTING [T] (`_di457ColTips`) | ✅ [T] | ✅ [T] | ✅ [T] |
| **Conservatory** (C) | ✅ REUSE-EXISTING [R] — N-A: growth tax-free | ✅ [R] N-A: never taxed | ✅ [R] N-A: all gains tax-free | ✅ [R] compounds & pays out tax-free |
| **Vault** (C) | 🆕 AUTHOR [R] *(L48: reuse Conservatory [R]?)* | 🆕 [R] | 🆕 [R] | 🆕 [R] |
| **Chancel** (C) | 🆕 AUTHOR [R] *(L48: reuse Conservatory [R]?)* | 🆕 [R] | 🆕 [R] | 🆕 [R] |
| **Annex** (C) | ✅ REUSE-EXISTING [R] (`_di457ColTips`) | ✅ [R] | ✅ [R] | ✅ [R] |
| **Academy** (D · 529) | 🆕 AUTHOR — N-A: tax-free for qualified edu | 🆕 N-A: gains tax-free if used for school (else earnings taxed + 10%) | 🆕 N-A | 🆕 tax-free-for-edu lens |
| **Infirmary** (E · HSA) | 🆕 AUTHOR — N-A: tax-free for qualified medical | 🆕 N-A: never taxed if used for care | 🆕 N-A | 🆕 tax-free-for-medical lens |

---

## Distilled GAP LIST for the Architect (author only these)

Because meaning keys to the **lens family**, the whole gap collapses to **5 short authoring blocks** (4
tax-lens hovers each). Two families already have a live reference the others can reuse (Architect's call
on reuse-verbatim vs re-voice — L48):

1. **Cold Storage (Crypto)** — lens A-crypto. 4 hovers (basis/UG/date = property/CG treatment; Yield → `—`).
   *No existing crypto reference — fully new.*
2. **Treasury + Tenure** — lens B (deferred). Reference already live = **Library [T]** / **Workshop [T]**.
   → confirm **REUSE Library [T] verbatim** (L48) or re-voice per room. If reuse: **zero new copy**, wiring-only.
3. **Vault + Chancel** — lens C (Roth). Reference already live = **Conservatory [R]** / **Annex [R]**.
   → confirm **REUSE Conservatory [R] verbatim** (L48) or re-voice. If reuse: **zero new copy**, wiring-only.
4. **Academy (529)** — lens D (education). 4 hovers, edu-qualified tax-free lens. New.
5. **Infirmary (HSA)** — lens E (triple-advantaged). 4 hovers, medical-qualified tax-free lens. New.

**Net truly-new authoring:** Crypto (4) + 529 (4) + HSA (4) = **~12 hover cells**, *if* the deferred/Roth
families reuse their existing IRA/457 references. If the Architect wants each 401(k)/403(b) room re-voiced
distinctly, add up to 4 more blocks (Treasury/Tenure/Vault/Chancel) — Captain/Architect call.

The 11 account-agnostic columns need **no authoring** in any room.

---

### Wiring notes (for the increment AFTER authoring — not part of this artifact)
- Turn on `taxableOnly` columns (Cost Basis / Unrealized Gain / Acquisition Date) for all investment rooms
  with `—` + N-A hover (generalize the `_bankCol` gate at studio.html:6711/6731).
- Add per-room `_di<room>ColTips()` overrides (mirror `_diTaxColTips` / `_diIraColTips` / `_di457ColTips`)
  fed the Architect's authored copy; dispatch alongside the existing IRA/457/taxable branch (6711–6730).
- Red-first gate + full regression (457 / IRA 49/49 / tax_3a / routing / 401k), verify live by markers.
