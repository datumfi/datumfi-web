/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   THE MONTHLY CARRYING COST OF A DEBT — total payment, escrow load, and the guard between them.

   ⭐ THE SECOND PART FILE, and the STEP-2a PROVING MOVE of the studio.html split. Registered in
   scripts/_studio_source.cjs's PARTS list, so the ~90 gates that read the Studio source still see
   these definitions and the sandbox gates that lift dependencies out of that string keep resolving.

   ⛔⛔ PLAIN TOP-LEVEL FUNCTIONS. NOT AN IIFE, NOT A window.X = {...} NAMESPACE — structural, not
   stylistic, for the reason studio-upkeep.js states at length: the sandbox gates extract a
   function's TEXT with lift() and run it inside `new Function(...)`. A namespace would be invisible
   to lift() and undefined in the sandbox. A top-level `function` declaration is both liftable AND a
   global in the browser.

   ── ⭐ WHY THESE THREE, AND WHY THIS NAME ──────────────────────────────────────────────────────
   Chosen as the proving move because they are PURE LEAVES: they call no other top-level function,
   touch no DOM, read no `state`, and hold no globals. They are arithmetic over one `acc` object. A
   move that changes nothing can therefore be PROVEN to have changed nothing.

   ⛔ AND THE NAME IS "debt-cost", NOT "mortgage-cost", BECAUSE THE CALLER MAP SAYS SO. The nomination
   called this trio "what a mortgage costs per month" and the callers disagreed:
       calculateTotalPmt      <- _moatNegAm, _moatDI, _escrowFooter, _moatRealMonthlyHTML,
                                 _helocIntelBeats, _helocCeilingBand, _helocInterestOnlyDraw,
                                 payoffMonths, lifetimeInterest, _yardRealMonthly, _yardIntelligence
       calculateEscrowMonthly <- _moatDI, _escrowFooter, _moatRealMonthlyHTML
       hasEscrow              <- _moatDI, _moatEscrowToView, _moatEscrowToStore,
                                 _moatEscrowToggleHTML, _moatRealMonthlyHTML
   THREE ROOM FAMILIES REACH THIS FILE — the Moat (mortgage), the Cellar (HELOC), and the Yard.
   🔑 NAME A PART FOR ITS CALLERS, NEVER FOR THE ROOM IT WAS EXTRACTED FROM. The origin room is an
   accident of history; the caller set is the actual boundary. A part filename is a SERVED PATH —
   public, permanent in practice, and every future reader will believe the filename over the caller
   map. "studio-mortgage-cost.js" would have been a lie baked into a URL.

   ⚠️ ESCROW IS MORTGAGE-SHAPED AND STILL BELONGS HERE. calculateEscrowMonthly and hasEscrow are only
   meaningful for a mortgage, but they are not a separate idea — _moatRealMonthlyHTML adds P&I to
   escrow to produce ONE number, the real monthly. Splitting them into a third file would put two
   halves of a single sum in two places, which is the seam that breaks.

   ⛔ THIS FILE IS SACRED (declared in CLAUDE.md, pinned in scripts/build-dist.mjs). The rule is
   "a file whose absence fails silently and changes money on screen" — and that is MEASURED, not
   asserted: stripping the sibling part's <script src> moved a property's carrying total from
   $3,000/yr to $5,100/yr with no error anywhere, while five sandbox gates over the same math stayed
   green. This file carries the payment figures in three room families.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function calculateTotalPmt(acc) {
    let min = parseFloat(acc.minPmt) || 0;
    let add = parseFloat(acc.addPmt) || 0;
    return min + add;
}

// §4.1 ESCROW — mortgage-only monthly escrow load (property tax + insurance are annual; PMI is monthly).
function calculateEscrowMonthly(acc) {
    let pt = parseFloat(acc.propTaxAnnual) || 0;
    let ins = parseFloat(acc.insAnnual) || 0;
    let pmi = parseFloat(acc.pmiMonthly) || 0;
    let other = parseFloat(acc.mortgageOtherCost) || 0;   // §18.1 'Other (yr)' — flood/assessments/etc.
    return pt / 12 + ins / 12 + pmi + other / 12;
}
// Sourced-or-blank guard (L47): the escrow computed footer surfaces only when a real input exists.
function hasEscrow(acc) {
    return (parseFloat(acc.propTaxAnnual) || 0) > 0 || (parseFloat(acc.insAnnual) || 0) > 0 || (parseFloat(acc.pmiMonthly) || 0) > 0 || (parseFloat(acc.mortgageOtherCost) || 0) > 0;
}
