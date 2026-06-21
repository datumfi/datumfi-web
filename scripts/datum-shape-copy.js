/* datum-shape-copy.js -- Datum FI Sketch-S2 PINNED copy engine (extracted verbatim)
 *
 * The 109-case HUD narrative engine for Sketch Screen 2 ("Shape You Want"),
 * lifted BYTE-FOR-BYTE from sketch.html (commit 25d4c68) so Sketch and Studio
 * consume ONE source and cannot drift.
 *
 * Verbatim: getMathPoint + getShapeStateObj wrappers (copies -- Sketch keeps its
 * own), _PC (94), _PR (routing), _routeLookup, getPinnedCaseObj (selector +
 * 70%-dominance attributor, inline _PTA_PC 15 cases).
 *
 * Render-coupled token interpolation + multi-lever fallback builder stay in the
 * host render layer (deferred to the Studio back-face step).
 *
 * Export: window.DatumShape.S2Copy = { getPinnedCaseObj, _routeLookup, _PC, _PR }.
 * Depends on window.DatumShape (datum-shape.js) loaded first.
 */
(function (global) {
  'use strict';
  var DatumShape = global.DatumShape = global.DatumShape || {};

    function getMathPoint(offset, yearsToGrow, s) {
        // Delegates to DatumShape.computeAt (shared S1 engine in /scripts/datum-shape.js).
        // Sketch's contract: yearsToGrow arg may differ from s.yearsToGrow during
        // counterfactual sims (Multi-Lever Pattern lever isolation: a "what if I had
        // pinned at age X, retire Y" computation runs against the PINNED scenario with
        // an OVERRIDDEN horizon). When they differ, rebuild a scenario carrying the
        // override so DatumShape.computeAt's t = offset / scenario.yearsToGrow is
        // numerically identical to the prior inline implementation.
        var sc = (s.yearsToGrow === yearsToGrow) ? s : Object.assign({}, s, { yearsToGrow: yearsToGrow });
        return DatumShape.computeAt(sc, offset);
    }

    function getShapeStateObj(pts) {
        // Delegates to DatumShape.buildShapeState (shared module). Math thresholds
        // + V13 narrative strings are byte-identical to the prior inline source --
        // verified by _narrative_parity_check.js (11 state x subZone cases, all
        // fields physics / action / physicsShort / actionShort byte-match).
        // Returned object adds a `bareCls` field (shape-state-* for the SVG canvas
        // pulse class); existing sketch consumers read only the original fields
        // (name, color, cls = hud-state-*, key, subZone, physics, action,
        // physicsShort, actionShort) and ignore the extra field.
        return DatumShape.buildShapeState(pts);
    }

    const _PC = {
        'OE.0': {
            physics: `The plan doesn't produce this level of income in any scenario it models - not a bad one, not a good one. There's a {aboveCeil} gap between what you're targeting and what the plan can currently deliver.`,
            action:  `Something has to move. Retirement age closes more of that gap per move than anything else - test it first. If the age isn't flexible, more savings or a lower spending target will get you there, but it'll take more of both.`,
            studio:  `Studio can check whether your actual account structure or Social Security timing closes part of that gap before anything else needs to change.`,
            paradox: false },
        'OE.S.1': {
            physics: `Closer - but the plan still doesn't reach this level. You're now {aboveCeil} above what the plan can deliver, down from where you started.`,
            action:  `Keep going, or try a different lever. The spending level where the plan first starts to work is {ceilK} - that's your anchor. Everything above it requires something else to move too.`,
            studio:  `Studio can check whether your actual account mix or income sources push that ceiling up before spending needs to come down further.`,
            paradox: false },
        'OE.S.2': {
            physics: `The plan now reaches this level - but only when things go well. You're {gapToCeil} below the ceiling, which means you're in range, but without much room to spare if returns come in average or markets get rough early.`,
            action:  `This is achievable, not comfortable. A modest spending reduction - even {gapToCeil} - moves you into territory the plan carries across most scenarios, not just the favorable ones. Worth knowing the difference before locking in a number.`,
            studio:  `Studio can test whether your actual tax structure and account types hold this level across the full range - not just the plan's best-case paths.`,
            paradox: false },
        'OE.S.3': {
            physics: `The plan now carries this comfortably - {gapToFloor} of cushion below and {gapToCeil} of room above. Most scenarios support it, not just the favorable ones.`,
            action:  `This is a structurally sound level. If it works for your life, you don't need to move further. If you want to test how much higher you can go, the ceiling is {gapToCeil} away - try it in small increments.`,
            studio:  `Studio can narrow that range by modeling your actual accounts and tax sequencing - a tighter range gives you a more precise read on where you actually land.`,
            paradox: false },
        'OE.S.4': {
            physics: `The plan covers this in even its worst-case scenario. That's real security - but you've also left {gapToCeil} of capacity on the table that the plan can support and you're not using.`,
            action:  `The question isn't whether this is safe - it is. It's whether it's the right amount of safe. Try raising the spending target gradually to see where the plan's stress-case starts to feel it.`,
            studio:  `Studio can confirm whether the real-world picture - accounts, withdrawals, Social Security - reinforces this position or absorbs some of that headroom.`,
            paradox: false },
        'OE.S.5': {
            physics: `Even in a bad scenario, the plan projects {floorAboveSpend} more income than you're asking for. The plan is set up to produce significantly more than this target.`,
            action:  `This is useful as a floor reference - it tells you the plan's absolute minimum. But it's not a retirement income target. Walk the spending back up toward your real number and see where the plan's support starts to change.`,
            studio:  `Studio can confirm whether real-world variables preserve this position - the Sketch models it as pure surplus.`,
            paradox: false },
        'OE.S.6': {
            physics: `The gap just got wider. The plan now needs to produce {aboveCeil} more than it currently can - in any scenario.`,
            action:  `Moving spending up from an already overextended position makes every other lever work harder. The fastest path back is retirement age - pull that first and see how much ground it covers.`,
            studio:  `Studio can check whether your actual accounts or income sources move the ceiling at all before other levers have to change.`,
            paradox: false },
        'OE.P.1': {
            physics: `More capital moved the ceiling up by {deltaCeilK} - you're now {aboveCeil} from the plan being able to support this. That's real progress.`,
            action:  `Keep going or combine it with another lever. If retirement age has any flexibility, pairing these two closes the gap faster than either one alone.`,
            studio:  `Studio can test whether that ceiling growth holds across your actual account types - the same portfolio increase translates differently through pre-tax, Roth, and taxable accounts.`,
            paradox: false },
        'OE.P.2': {
            physics: `More capital pushed the ceiling past your spending target - the plan now reaches it, but only under favorable conditions. You're {gapToCeil} inside the plan's range.`,
            action:  `You're in range, but the plan is working hard to get there. A bit more capital - or a slight spending reduction - would give the plan enough room to carry this across average conditions, not just good ones.`,
            studio:  `Studio can confirm whether this ceiling holds under your actual account structure - pre-tax vs. Roth vs. taxable all affect how much of the growth is usable at retirement.`,
            paradox: false },
        'OE.P.3': {
            physics: `More capital moved the plan well past your spending target - {gapToFloor} of cushion below, {gapToCeil} of room above. The plan now carries this across most scenarios, not just the good ones.`,
            action:  `Capital did the work here. If this spending level is what you want, you're in a solid position. Test whether there's room above - the ceiling is {gapToCeil} away.`,
            studio:  `Studio can confirm this holds across your actual account mix - Roth, pre-tax, and taxable all respond differently to portfolio growth.`,
            paradox: false },
        'OE.P.4': {
            physics: `Less capital moved the ceiling further away - the gap is now {aboveCeil}. The plan can produce less, and you're asking for more than it can deliver.`,
            action:  `This is the direction to avoid. The ceiling needs to rise to close that gap - which means more capital, more time, or both.`,
            studio:  `Studio can model the minimum starting portfolio to support this spending level across your actual account types.`,
            paradox: false },
        'OE.R.1': {
            physics: `Working {yearsDelta} more year(s) grew the ceiling by {deltaCeilK} - you're now {aboveCeil} away from the plan supporting this. Time is doing real work here.`,
            action:  `Keep extending to find the age where the plan first reaches this spending level - that number is worth knowing. It's the minimum retirement age at which this target becomes achievable at current savings.`,
            studio:  `Studio can model whether that age also improves your Social Security timing and tax positioning - effects the Sketch doesn't capture.`,
            paradox: false },
        'OE.R.2': {
            physics: `Working {yearsDelta} more year(s) pushed the ceiling past your spending target. The plan now reaches this level - but it needs good conditions to get there. You're {gapToCeil} inside the range.`,
            action:  `Time got you in range. A little more of it - or a small spending reduction - moves you from "works when things go well" to "works across most futures."`,
            studio:  `Studio can model whether retiring at {newRetire} also creates Social Security or tax bracket advantages that improve the picture further.`,
            paradox: false },
        'OE.R.3': {
            physics: `Working {yearsDelta} more year(s) moved the plan well past your spending target - {gapToFloor} of cushion below, {gapToCeil} above. The plan now carries this comfortably across most scenarios.`,
            action:  `Time is your most powerful lever and it showed here. If retiring at {newRetire} is realistic, this is a strong position. If it's not, test how far the other levers can compensate.`,
            studio:  `Studio can model whether age {newRetire} unlocks Social Security or tax bracket opportunities that go beyond what the Sketch shows.`,
            paradox: false },
        'OE.R.4': {
            physics: `Retiring {yearsDelta} year(s) earlier reduced the ceiling by {deltaCeilK} - the gap is now {aboveCeil}. Less time to grow, less the plan can produce.`,
            action:  `Earlier retirement and an already-stretched spending target pull in opposite directions. Something has to give - either the retirement date moves later or the spending target moves down.`,
            studio:  `Studio can model the minimum retirement age at which this spending level becomes achievable under real conditions.`,
            paradox: false },
        'OE.C.1': {
            physics: `Higher contributions moved the ceiling up by {deltaCeilK} - you're now {aboveCeil} away from the plan supporting this. Savings are moving the needle, just not all the way yet.`,
            action:  `Find the contribution rate where the ceiling first meets this spending level. Or pair higher contributions with another lever - retirement age in particular - to close the remaining gap faster.`,
            studio:  `Studio can test whether those contributions are better structured through Roth or pre-tax accounts - the account type affects how much of the added ceiling is actually accessible at retirement.`,
            paradox: false },
        'OE.C.1b': {
            physics: `Higher contributions raised the ceiling by {deltaCeilK} and pulled your target back inside the plan - the ceiling now sits only {gapToCeil} above what you're trying to spend. More savings got you over the line, but with very little room for things to go wrong.`,
            action:  `Find the contribution rate where the ceiling first meets this spending level. Or pair higher contributions with another lever - retirement age in particular - to close the remaining gap faster.`,
            studio:  `Studio can test whether those contributions are better structured through Roth or pre-tax accounts - the account type affects how much of the added ceiling is actually accessible at retirement.`,
            paradox: false },
        'OE.C.2': {
            physics: `Higher contributions moved the ceiling well past your spending target - {gapToFloor} of cushion below, {gapToCeil} above. Savings closed the gap and the plan now carries this across most scenarios.`,
            action:  `Savings did the work. Make sure the contribution rate is sustainable - and that it's running through the right account types to maximize what's actually accessible at retirement.`,
            studio:  `Studio can test whether the contribution structure is optimal - Roth vs. traditional timing affects how much of that ceiling is accessible when you need it.`,
            paradox: false },
        'OE.C.3': {
            physics: `Lower contributions reduced the ceiling to {newCeilK} - the gap is now {aboveCeil}. Less savings, less the plan can produce.`,
            action:  `This is the direction to avoid. To close the gap, savings need to hold or increase - reducing them widens a gap that was already there.`,
            studio:  `Studio can model the minimum contribution rate to support this spending level under real conditions.`,
            paradox: false },
        'OE.A.1': {
            physics: `More runway grew the ceiling to {newCeilK} - {yearsDelta} additional year(s) of compounding is doing real work. The gap has narrowed and you're now {aboveCeil} away from the plan supporting this.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        'OE.A.1b': {
            physics: `Working {yearsDelta} more year(s) raised the ceiling by {deltaCeilK} and brought your spending just under it - the plan now clears this target, but there's only {gapToCeil} of room above. Time bought you entry back inside the plan, not a wide safety margin.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        'OE.A.1c': {
            physics: `Working {yearsDelta} more year(s) raised the ceiling by {deltaCeilK} and brought your spending back inside the range the plan can support - there's now {gapToFloor} between you and the floor and {gapToCeil} before you hit the ceiling. Time didn't just get you over the line; it bought room to move on both sides.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        // V2 advisor copy verbatim per NCP:534 — Tracker:524 RESOLVED
        'OE.A.1-age': {
            physics: `Starting {ageDelta} year(s) earlier gave the plan more runway and lifted the ceiling to {newCeilK}, but it still falls short — you’re {aboveCeil} above what the plan can support. Time is closing the gap; you just haven’t crossed back inside the range yet.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        'OE.A.1b-age': {
            physics: `Starting {ageDelta} year(s) earlier gave the plan more runway and lifted the ceiling by {deltaCeilK}, bringing your spending just under it — the plan now reaches this level, but with only {gapToCeil} of room above. Time got you over the line, not far beyond it.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        'OE.A.1c-age': {
            physics: `Starting {ageDelta} year(s) earlier gave the plan more runway and lifted the ceiling by {deltaCeilK}, pulling your spending back inside the range it can support — with {gapToFloor} between you and the floor and {gapToCeil} before you hit the ceiling. Time bought room on both sides of this lifestyle.`,
            action:  `Find the planning horizon where the ceiling first meets this spending level - that's the minimum runway at which this target becomes achievable at current savings and retirement age.`,
            studio:  `Studio can model what a longer runway unlocks at the account level - Roth conversion windows, contribution room, and Social Security timing all shift with more time.`,
            paradox: false },
        'OE.A.2': {
            physics: `Less runway reduced the ceiling to {newCeilK} - the gap is now {aboveCeil}. Shorter timeline, less compounding, less the plan can deliver.`,
            action:  `A shorter horizon widens a gap that was already there. The inputs need more time to work, not less.`,
            studio:  `Studio can test whether a shorter timeline creates constraints - catch-up contribution limits, Social Security timing - that make the gap harder to close than the Sketch suggests.`,
            paradox: false },
        'ABU-01': {
            physics: `You're closer, but the plan's most conservative scenario still projects {floorAboveSpend} more than you're asking for. The floor hasn't come down to meet your target yet.`,
            action:  `Keep raising the spending target toward {floorK} - that's where the plan's floor sits right now. That's the level the plan already supports in its worst-case scenario. Everything below it is capacity you're leaving unused.`,
            studio:  `Studio can verify whether real account variables have already absorbed some of this surplus - the Sketch models it as pure headroom.`,
            paradox: false },
        'ABU-02': {
            physics: `Your spending now reaches the plan's conservative floor - the plan's stress-case scenario supports this lifestyle. There's {gapToCeil} between where you are and the most the plan can deliver.`,
            action:  `The floor holds this level. But {gapToCeil} of ceiling room sits above you - test whether you actually want to live at the floor, or whether there's a higher number worth working toward.`,
            studio:  `Studio can confirm whether your actual withdrawal sequencing and account types preserve this floor alignment, or whether some of that headroom is already absorbed by real-world variables.`,
            paradox: false },
        'ABU-03': {
            physics: `Your spending moved inside the range the plan supports - {gapToFloor} above the floor and {gapToCeil} below the ceiling. Most scenarios carry this lifestyle, not just the favorable ones.`,
            action:  `This is a structurally solid position. The ceiling is {gapToCeil} above - test whether you want to push toward it or stay here with room on both sides.`,
            studio:  `Studio can test whether this position holds through your actual tax sequencing and withdrawal architecture - variables the Sketch holds constant.`,
            paradox: false },
        'ABU-04': {
            physics: `Your spending reached the upper range of what the plan can deliver - the ceiling is only {gapToCeil} above your target. The plan gets there, but it's relying on conditions going well.`,
            action:  `You're {gapToCeil} below the ceiling - a small reduction from here puts significantly more of the plan's scenarios to work for you. Worth knowing whether the extra spending is worth the reduced reliability.`,
            studio:  `Studio can test whether your actual account structure and Social Security timing hold this upper-edge target across the full range - not just the plan's most favorable paths.`,
            paradox: false },
        'ABU-05': {
            physics: `Your spending crossed above what the plan can produce - you're now {aboveCeil} above the ceiling. No scenario in the model reaches this level at current inputs.`,
            action:  `The ceiling sits at {ceilK}. Pull spending back to that level to find the plan's current maximum, or test which lever closes the {aboveCeil} gap fastest. Retirement age typically moves the ceiling the most per adjustment.`,
            studio:  `Studio can test whether real-world variables close part of this gap before any lever needs to move - the Sketch holds those constant.`,
            paradox: false },
        'ABU-06': {
            physics: `The floor was already {floorAboveSpend} above your target - pulling spending lower pushed it to {newFloorAboveSpend} above. The plan over-delivers by an even wider margin now.`,
            action:  `This is a useful stress test - it shows you the plan's floor is {floorK} even at its most conservative. But this isn't a retirement income target. Walk spending back up toward {floorK} to find where the plan starts doing real work for you.`,
            studio:  `Studio can test whether real-world variables preserve this surplus or quietly absorb some of it.`,
            paradox: false },
        'ABU-07': {
            physics: `Adding capital raised the floor by {deltaFloorK} - which moved it further above your spending, not closer to it. The surplus grew to {floorAboveSpend}. More money in the plan means more the plan projects, and your spending didn't move to match it.`,
            action:  `This is the paradox of this position: every dollar you add to the plan widens the gap rather than closing it. The only way capital helps here is if you raise your spending target to meet what the plan can now produce. Try raising spending to {floorK} - that's where the floor now sits.`,
            studio:  `Studio can test whether additional capital in tax-advantaged structures compounds differently against the floor - the real-world effect may differ from what the Sketch projects.`,
            paradox: true },
        'ABU-08': {
            physics: `Reducing capital brought the floor down - but it still sits {floorAboveSpend} above your spending. The surplus narrowed but the plan still over-delivers at your current target.`,
            action:  `The floor is at {floorK} - your target needs to reach that level, or the portfolio needs to come down further. Raising spending closes this gap without sacrificing plan capacity.`,
            studio:  `Studio can model how portfolio reduction affects the real-world floor versus the Sketch's averaged projection.`,
            paradox: false },
        'ABU-09': {
            physics: `Reducing the portfolio brought the floor down to your spending level - the plan's conservative scenario now carries this lifestyle. The ceiling compressed too, leaving {gapToCeil} above your target.`,
            action:  `The floor meets the target, but you gave up {gapToCeil} of ceiling room to get here. Ask whether that trade-off makes sense - or whether raising spending toward {floorK} would have gotten you to the same place without shrinking the plan.`,
            studio:  `Studio can test whether this floor alignment holds through your actual account architecture and withdrawal order.`,
            paradox: false },
        'ABU-10': {
            physics: `A large portfolio reduction contracted the plan enough to bracket your spending - {gapToFloor} below the floor and {gapToCeil} below the ceiling. The plan now carries your lifestyle across a range of scenarios.`,
            action:  `The plan now fits your target - but check the ceiling. You have {gapToCeil} of room above, and the plan got here by shrinking, not growing. Make sure the compressed range still gives you enough upside.`,
            studio:  `Studio can test whether this contracted position holds against your actual tax sequencing and income sources.`,
            paradox: false },
        'ABU-11': {
            physics: `Higher contributions raised the floor by {deltaFloorK} - widening the gap to {floorAboveSpend}. More savings grew what the plan projects, which moved the floor further above your spending rather than toward it.`,
            action:  `Same paradox as capital: more savings grows the plan upward, not toward your target. The floor now sits at {floorK} - raise your spending to meet it, or those contributions are building capacity you're not planning to use.`,
            studio:  `Studio can test whether Roth vs. traditional contributions compound differently against the floor - the account type affects how much of this growth is accessible at retirement.`,
            paradox: true },
        'ABU-12': {
            physics: `Lower contributions reduced what the plan projects - enough that the floor dropped to your spending level. The plan's conservative scenario now aligns with your lifestyle. The ceiling sits {gapToCeil} above.`,
            action:  `The floor now aligns with your target - but you reduced savings to get there. Check whether {gapToCeil} of ceiling room above still feels adequate, and whether raising spending would have achieved the same alignment without reducing your contributions.`,
            studio:  `Studio can model whether reduced contributions still support this position through your actual account structure and sequencing.`,
            paradox: false },
        'ABU-13': {
            physics: `More time raised the floor by {deltaFloorK} - pushing it to {floorK}, now {floorAboveSpend} above your spending. A later retirement means more compounding, which means the plan projects more - but your target didn't move to match it.`,
            action:  `More runway grows the plan, not toward your lifestyle. The floor is now at {floorK} - if you're working longer, test whether your spending target should rise to reflect what that extra time is producing. Otherwise you're building capacity you're not planning to use.`,
            studio:  `Studio can test whether a later retirement also shifts Social Security timing and tax-sequencing windows in ways that move the real-world floor separately from the Sketch.`,
            paradox: true },
        'ABU-14': {
            physics: `Retiring slightly sooner reduced the floor by {deltaFloorK} - but it still sits {floorAboveSpend} above your spending. Less runway helped, but not enough to close the gap.`,
            action:  `The floor is at {floorK}. Keep pulling the retirement date earlier to find where the floor first drops to meet your target - or raise spending to meet the floor where it is now.`,
            studio:  `Studio can test whether earlier retirement changes withdrawal sequencing and Social Security timing in ways the Sketch doesn't capture.`,
            paradox: false },
        'ABU-15': {
            physics: `Retiring significantly earlier compressed the plan enough that the floor dropped to your spending level. The plan's conservative scenario now carries your lifestyle - with {gapToCeil} of ceiling room above.`,
            action:  `Time did the work here by shrinking, not growing. Make sure this retirement date is actually what you want - and check that {gapToCeil} of ceiling room still feels like enough range for your retirement.`,
            studio:  `Studio can model whether this earlier retirement date affects Social Security benefit timing and income sequencing in ways that shift the real-world floor.`,
            paradox: false },
        'ABU-16': {
            physics: `Retiring much earlier compressed the plan enough to bracket your spending - {gapToFloor} below the floor and {gapToCeil} below the ceiling. The plan now carries your lifestyle across a range of scenarios.`,
            action:  `A significant structural shift. Check whether {gapToCeil} of ceiling room is adequate - and whether this retirement date is actually realistic for your situation.`,
            studio:  `Studio can test whether this compressed timeline supports your spending through real Social Security and withdrawal sequencing - variables the Sketch holds constant.`,
            paradox: false },
        'ABU-17': {
            physics: `A shorter runway means the plan projects less - the floor dropped {deltaFloorK} to reach your spending level. The plan's conservative scenario now aligns with your lifestyle, with {gapToCeil} above.`,
            action:  `The timeline shrank the plan around your target. Confirm this reflects your actual situation - and check whether {gapToCeil} of ceiling room above feels like enough range for your retirement.`,
            studio:  `Studio can model whether fewer compounding years change how real account balances project against the Sketch's floor - the practical floor may differ meaningfully.`,
            paradox: false },
        'ABU-18': {
            physics: `A significantly shorter runway contracted the plan enough to bracket your spending - {gapToFloor} below the floor and {gapToCeil} below the ceiling. The plan went from over-building to carrying your target across a range of scenarios.`,
            action:  `Confirm this timeline is actually accurate - if the age input doesn't reflect reality, neither does this position. If it does, check whether {gapToCeil} of ceiling room gives you enough range.`,
            studio:  `Studio can test whether fewer years changes how tax-advantaged growth compounds in real accounts - which may produce a different picture than the Sketch floor.`,
            paradox: false },
        'ABU-19': {
            physics: `More runway grew the floor by {deltaFloorK} - pushing it to {floorK}, now {floorAboveSpend} above your spending. Being younger means more compounding time, and more compounding time means the plan over-delivers by a wider margin.`,
            action:  `A longer timeline grows the plan upward, not toward your target. If you have many years to retirement, your spending target should scale with the plan's growing capacity - the floor at {floorK} is what your plan already projects in its worst case.`,
            studio:  `Studio can model whether additional compounding years open Roth conversion windows and Social Security delay opportunities that shift the real-world floor separately from the Sketch.`,
            paradox: true },
        'GRD-01': {
            physics: `You're closer to the plan's interior, but still near the floor - the ceiling sits {gapToCeil} above your target. The floor still carries the weight here; you haven't moved far enough to change that yet.`,
            action:  `The ceiling is {gapToCeil} away. Test how far the target can rise before the plan starts to show pressure - that number tells you how much range you actually have above where you're sitting now.`,
            studio:  `Studio can confirm whether your actual withdrawal sequencing preserves this floor-level alignment or absorbs some of the apparent headroom above.`,
            paradox: false },
        'GRD-02': {
            physics: `Your spending crossed the floor's edge and moved into the plan's interior - {gapToFloor} above the floor, {gapToCeil} below the ceiling. The plan carries this lifestyle across most scenarios now, not just conservative ones.`,
            action:  `You have {gapToCeil} of ceiling room above. This is a structurally solid position - test whether you want to push higher or stay here with room on both sides.`,
            studio:  `Studio can confirm whether your actual withdrawal sequencing and account types preserve this interior position - or whether real-world variables absorb some of the apparent ceiling room above.`,
            paradox: false },
        'GRD-03': {
            physics: `Your spending moved all the way to the upper edge - from the floor's edge to {gapToCeil} below the ceiling. The plan reaches this level, but only when conditions cooperate. That's a long way from where you started.`,
            action:  `You're {gapToCeil} below the ceiling. The plan gets here through its best paths - a modest reduction carries more of them. Know whether this position is intentional or whether it's worth pulling back slightly for more reliability.`,
            studio:  `Studio can test whether tax sequencing and Social Security timing reinforce this upper-edge target through the full engine - variables the Sketch holds constant.`,
            paradox: false },
        'GRD-04': {
            physics: `Your spending moved past the ceiling - from the floor's edge to {aboveCeil} above the plan's maximum. No scenario in the model reaches this level at current inputs.`,
            action:  `The ceiling sits at {ceilK}. Pull spending back to that level to find the plan's current maximum, or test which lever closes the {aboveCeil} gap fastest. Retirement age typically moves the ceiling the most.`,
            studio:  `Studio can test whether real-world variables close part of this gap before any lever needs to move - the Sketch holds those constant.`,
            paradox: false },
        'GRD-05': {
            physics: `Lowering your spending moved it below the floor entirely - the plan's most conservative scenario now projects {floorAboveSpend} more than you're asking for. You went from the floor's edge to below it.`,
            action:  `The floor sits at {floorK}. That's what the plan produces in its worst case - and it exceeds your target by {floorAboveSpend}. Either this is intentional conservatism, or there's capacity worth exploring.`,
            studio:  `Studio can test whether real-world variables preserve this surplus or absorb some of it - the Sketch models it as pure headroom.`,
            paradox: false },
        'GRD-06': {
            physics: `More capital raised the floor by {deltaFloorK} - which, if your target was right at the edge, may have pushed the boundary above your spending rather than away from it. The floor is now at {floorK}, and the gap to the ceiling is {gapToCeil}.`,
            action:  `This is the TIGHT zone risk: capital growth lifts the floor faster than it helps. If the floor moved above your target, it wasn't the portfolio that was the problem - test raising your spending target to meet the floor where it now sits.`,
            studio:  `Studio can test whether capital in tax-advantaged accounts compounds against the real-world floor differently than the Sketch model projects.`,
            paradox: true },
        'GRD-07': {
            physics: `A larger portfolio increase grew the ceiling faster than it raised the floor - the plan widened enough to move your spending into its interior: {gapToFloor} above the floor and {gapToCeil} below the ceiling.`,
            action:  `The plan's range expanded around your target. You have {gapToCeil} of ceiling room and {gapToFloor} of floor buffer - test whether the ceiling represents capacity worth targeting, or whether this is the position you want to hold.`,
            studio:  `Studio can model how a larger portfolio interacts with real account types and tax sequencing to produce a different interior position than the Sketch projects.`,
            paradox: false },
        'GRD-08': {
            physics: `Reducing the portfolio dropped the floor below your spending target - the plan's conservative scenario now projects {floorAboveSpend} more than you're asking for. Less capital shrank what the plan produces until it exceeded your lifestyle target.`,
            action:  `The floor dropped to {floorK} - below your target. That's a surplus, not a problem, but check whether the ceiling compressed enough that the range above still feels adequate.`,
            studio:  `Studio can model how a reduced portfolio changes real withdrawal sequencing assumptions relative to the Sketch floor projection.`,
            paradox: false },
        'GRD-09': {
            physics: `Higher contributions grew the floor by {deltaFloorK} - moving it to {floorK}, now {gapToCeil} below the ceiling. If your target was right at the edge, the floor may have briefly moved above it before the ceiling's wider expansion reasserted the position.`,
            action:  `In the TIGHT zone, savings growth lifts the floor - which can crowd your target rather than help it. Test your spending target at the new floor level to see if a higher lifestyle number is now warranted.`,
            studio:  `Studio can test whether Roth vs. traditional contribution allocation changes how the floor compounds in real accounts - the Sketch treats both symmetrically.`,
            paradox: true },
        'GRD-10': {
            physics: `Lower contributions dropped the floor below your spending - the plan's conservative scenario now projects {floorAboveSpend} more than you're asking for. Less compounding into the plan brought the lower boundary beneath your lifestyle target.`,
            action:  `The floor is now at {floorK} - {floorAboveSpend} below your target. Before reducing contributions further, check whether raising your spending would have closed this same gap without sacrificing savings.`,
            studio:  `Studio can model how reduced contributions change the practical withdrawal floor through real account architecture and sequencing.`,
            paradox: false },
        'GRD-11': {
            physics: `More time raised the floor by {deltaFloorK} - to {floorK}, now {gapToCeil} below the ceiling. In the TIGHT zone, a later retirement can push the floor above a fixed spending target rather than creating helpful space around it.`,
            action:  `More runway grows the plan, including its floor. If you're working longer, your spending target should grow with it - the floor at {floorK} is what the plan's worst case already projects. Test whether your target should rise to match.`,
            studio:  `Studio can test whether delayed retirement changes Social Security timing and Roth conversion windows - which shift the real-world floor in ways the Sketch cannot model.`,
            paradox: true },
        'GRD-12': {
            physics: `A meaningful retirement extension grew the ceiling faster than it raised the floor - the plan widened enough to move your spending into its interior: {gapToFloor} above the floor and {gapToCeil} below the ceiling.`,
            action:  `More runway expanded the plan around your target rather than crowding it. You have {gapToCeil} of ceiling room above - test whether the longer timeline warrants a higher spending target or whether this interior position is the right place to land.`,
            studio:  `Studio can model whether a later retirement with this spending level interacts with Social Security timing and withdrawal order in ways that shift the real position.`,
            paradox: false },
        'GRD-13': {
            physics: `Retiring sooner compressed the plan enough that the floor dropped {deltaFloorK} below your spending - the plan's conservative scenario now projects {floorAboveSpend} more than you're asking for. Less compounding time dropped the lower boundary beneath your target.`,
            action:  `The floor is now at {floorK} - below your target, not above it. Check whether the ceiling compressed enough to narrow the range meaningfully, and whether an earlier retirement at this spending level is actually what you want.`,
            studio:  `Studio can model whether earlier retirement materially changes Social Security benefit timing and income sequencing assumptions relative to the Sketch.`,
            paradox: false },
        'GRD-14': {
            physics: `A shorter runway means the plan projects less - the floor dropped {deltaFloorK} to {floorK}, now {floorAboveSpend} below your spending. Less compounding time shrank the lower boundary beneath your target.`,
            action:  `This is a passive shift - the timeline changed, not your target. Confirm this reflects your actual situation. If it does, the surplus is real and worth understanding - the floor at {floorK} is what the plan still produces in its worst case.`,
            studio:  `Studio can model whether fewer compounding years change how real account balances project against the Sketch's floor formula - the practical floor may differ.`,
            paradox: false },
        'GRD-15': {
            physics: `More runway grew the floor by {deltaFloorK} - to {floorK}, potentially pushing the boundary closer to or above your spending target. Being younger means more compounding time, and in the TIGHT zone that can work against a fixed target.`,
            action:  `A longer runway grows what the plan projects - including the floor. If you have many years to retirement, test whether your spending target should scale with it. The floor at {floorK} is what the plan's worst case already produces.`,
            studio:  `Studio can model whether more years open additional Roth conversion windows or Social Security delay strategies that affect the practical floor separately from the Sketch formula.`,
            paradox: true },
        'EXP-01': {
            physics: `The ceiling is still above you, but it’s closer than it was. The plan carries this lifestyle - just with less room to spare before conditions start to matter. You haven’t left EXPANSIVE, but you’ve traded some of the buffer that made this position comfortable.`,
            action:  `Watch how close the ceiling gets as you raise the target. The number where the plan starts depending on things going well - that’s the boundary worth knowing. You’re not there yet, but you’re moving toward it.`,
            studio:  `Studio can test whether the ceiling at this higher target holds through your actual tax sequencing and withdrawal order - the Sketch holds those constant, and they can shift where the real ceiling lands.`,
            paradox: false },
        'EXP-02': {
            physics: `You’ve reached the upper edge. The plan still gets to this lifestyle - but now it’s relying on things going well. Strong returns, good timing, favorable conditions across the full retirement window. The middle-of-the-road scenarios that carried your pinned position are doing less of the work here.`,
            action:  `STRETCHED isn’t a hard stop - but the plan is less forgiving here than it was. A rough market early in retirement, or returns that come in average rather than strong, puts more pressure on this target than it would have at your pin. Decide whether this tradeoff is worth it, or test whether a slightly lower number stays inside the comfortable range.`,
            studio:  `Studio can test whether your actual tax sequencing and Social Security timing reinforce this upper-edge target through the full model - not just the favorable scenarios the Sketch is now leaning on.`,
            paradox: false },
        'EXP-03': {
            physics: `The plan can’t reach this lifestyle in any scenario it models - not a good year, not a great one. You moved past the ceiling entirely. There’s now a {aboveCeil} gap between what you’re asking for and what the plan can currently produce.`,
            action:  `Pull the spending back toward where the plan can reach it - or test which lever closes the gap from the other side. More time, more capital, or higher savings can raise the ceiling toward this target. The gap is {aboveCeil}; find out which lever has enough power to close it before deciding what to move.`,
            studio:  `Studio can test whether real-world variables - tax-advantaged accounts, Social Security timing, withdrawal sequencing - close some of that {aboveCeil} before any lever needs to change.`,
            paradox: false },
        'EXP-04': {
            physics: `Your spending moved lower inside the plan’s range - the floor is now {gapToFloor} below and the ceiling {gapToCeil} above. You’re closer to the floor than before, with more ceiling room above.`,
            action:  `The floor is now closer below you, and the ceiling is further above. Test whether this feels like the right balance - or whether the additional headroom represents capacity the plan is projecting that you’re choosing not to use.`,
            studio:  `Studio can model whether this lower target holds differently through actual withdrawal sequencing - the floor buffer may behave differently in real accounts than the Sketch projects.`,
            paradox: false },
        'EXP-05': {
            physics: `You’re at the floor now - the plan’s conservative scenario carries this lifestyle. There’s {gapToCeil} of ceiling headroom above you. That’s a lot of plan you’re not using, and the question becomes whether that’s by design or by default.`,
            action:  `Being at the floor isn’t bad - it means even the worst-case scenario the plan models supports this lifestyle. But {gapToCeil} above you represents what the plan can carry in normal and good conditions. Name what that headroom is doing for you: earlier retirement, a larger legacy, a bigger cushion against things the Sketch doesn’t model.`,
            studio:  `Studio can confirm whether your actual account architecture preserves this floor alignment, or whether real-world variables absorb some of the apparent headroom above.`,
            paradox: false },
        'EXP-06': {
            physics: `The plan’s worst-case scenario projects {floorAboveSpend} more than you’re asking for. You went from inside the range - with real distance from both edges - to below even the conservative end of it. The plan is significantly over-built around this target.`,
            action:  `This is worth sitting with. If it’s intentional - you want maximum cushion, minimum spending, maximum left behind - then name that. If it’s not intentional, walk the spending back up toward where the plan starts to carry its weight more naturally.`,
            studio:  `Studio can test whether that below-floor surplus holds in real accounts, or whether actual income and tax variables reduce it from what the Sketch is projecting.`,
            paradox: false },
        'EXP-07': {
            physics: `The plan grew, but you’re not using more of it. More capital built more capacity - the ceiling is now {gapToCeil} above you - and the target is claiming a smaller share of what’s been built than it was at your pin.`,
            action:  `Test whether the target should rise to meet what the larger plan can carry. Or name what the widening surplus is actually for - retiring sooner, leaving more behind, or holding buffer against things the Sketch doesn’t model.`,
            studio:  `Studio can model whether additional capital in tax-advantaged accounts compounds the floor and ceiling at different rates - the real position may shift differently than the Sketch projects.`,
            paradox: true },
        'EXP-08': {
            physics: `The plan grew past the target. The ceiling is only {gapToCeil} above you now - not because the target rose, but because the plan built around it and left it near the top. The plan can reach this lifestyle, but it needs things to go well to hold it comfortably.`,
            action:  `If you added capital to create more room, the target should rise - the room went the wrong direction. Test what spending level puts you back near center in the larger plan.`,
            studio:  `Studio can model how a larger portfolio flows through your actual account types and withdrawal sequencing - the Sketch treats all capital symmetrically, and it’s not.`,
            paradox: false },
        'EXP-09': {
            physics: `The ceiling came down - and there’s now {gapToCeil} between your target and the plan’s upper limit. Less capital shrank the plan - and the ceiling came down closer to your spending target. The plan is more sensitive to conditions now than it was at your pin.`,
            action:  `Know where the ceiling is before reducing further. A continued portfolio reduction could push into STRETCHED - where the plan needs things to go well - faster than the numbers suggest.`,
            studio:  `Studio can model whether a reduced portfolio compresses the ceiling faster through real withdrawal sequencing - especially in pre-tax heavy account mixes.`,
            paradox: false },
        'EXP-10': {
            physics: `A large portfolio reduction shrank the plan enough that you’ve dropped to the floor’s edge. The plan still carries this lifestyle - but now it’s the conservative scenario doing the work, not the full range. There’s {gapToCeil} of ceiling above you, but the plan is tighter than it was.`,
            action:  `Assess the minimum portfolio that gets this target back inside the range - where moderate conditions, not just stress-case ones, carry the weight. That’s the number worth restoring toward.`,
            studio:  `Studio can model how a smaller portfolio affects the practical floor through actual account withdrawal order - the floor in real accounts may not hold as firmly as the Sketch projects.`,
            paradox: false },
        'EXP-11': {
            physics: `Saving more built more plan - but the target didn’t move with it. The ceiling is {gapToCeil} above and the surplus below is wider than at your pin. You’re building more capacity than you’re asking the plan to use.`,
            action:  `Test whether the target should rise, or whether an earlier retirement captures what the higher savings rate is producing. If neither moves, name what the deepening surplus is actually for.`,
            studio:  `Studio can test whether Roth vs. traditional contributions compound the floor at different rates - contribution type affects how much of this surplus is actually accessible at retirement.`,
            paradox: true },
        'EXP-12': {
            physics: `Saving significantly more pushed the ceiling high enough that the target ended up near the top of the range - {gapToCeil} from the ceiling - without the target ever moving. The plan now depends on favorable conditions to hold this lifestyle comfortably.`,
            action:  `The savings rate built a bigger plan than the target asked for, and now the target is near the ceiling of it. Raise the target to reclaim the center - or accept that the plan is running at its upper edge and needs good conditions to stay there.`,
            studio:  `Studio can model how a higher contribution rate flows through real account types and withdrawal order - contribution type affects how much of this ceiling gain holds through actual retirement.`,
            paradox: false },
        'EXP-13': {
            physics: `Lower savings brought the floor down to the target. The plan still carries this lifestyle - but the stress-case scenario is now the primary support. The {gapToCeil} above is real, but reaching it requires conditions to cooperate.`,
            action:  `A rough early sequence or average returns now puts more pressure on this target than at your pin. Assess whether the savings reduction is worth a plan that runs on its conservative floor - or whether a partial restore puts you back inside the comfortable range.`,
            studio:  `Studio can test whether reduced contributions change the practical floor through real account architecture - withdrawal order and tax treatment both affect how firmly the floor holds.`,
            paradox: false },
        'EXP-14': {
            physics: `An extra year of work built more plan - but the target didn’t move with it. The ceiling is now {gapToCeil} above you, and the surplus below is wider than at your pin. You’re building more capacity than you’re asking the plan to use.`,
            action:  `Several more years of work produced a ceiling {gapToCeil} above the target. That’s not what extra runway is usually for. Test whether the target should rise to use what a longer timeline makes possible - or whether this edge position was the intended outcome.`,
            studio:  `Studio can model whether the extended timeline changes Social Security delay strategy and withdrawal sequencing in ways that reinforce or shift this ceiling-side position.`,
            paradox: true },
        'EXP-15': {
            physics: `Working significantly longer pushed the ceiling high enough that your target ended up near the top of the range - {gapToCeil} from the ceiling - without the target ever moving. The plan can carry this, but it needs things to go well to do so comfortably.`,
            action:  `The ceiling is now at {newCeilK} - {gapToCeil} above your target. Check whether the compressed ceiling still gives you enough room, and whether this earlier retirement date is what you actually want or a scenario you’re testing.`,
            studio:  `Studio can test whether earlier retirement affects Social Security benefit timing and withdrawal sequencing in ways that shift the ceiling further than the Sketch compression implies.`,
            paradox: false },
        'EXP-16': {
            physics: `Retiring sooner dropped the ceiling {deltaCeilK} to {newCeilK} - leaving only {gapToCeil} above your spending. Your target didn’t change; the ceiling came down to meet it. You bought time now, but the plan is tighter than it was.`,
            action:  `The {gapToCeil} above is still reachable in average and good conditions - but the floor is the primary support now. Assess whether the earlier date is worth a plan that runs on its stress case, or whether one more year restores enough range to matter.`,
            studio:  `Studio can model whether an earlier retirement changes Social Security benefit timing and withdrawal sequencing in ways that shift the practical floor relative to the Sketch.`,
            paradox: false },
        'EXP-17': {
            physics: `Retiring much earlier compressed the plan enough that even the stress-case scenario now projects {floorAboveSpend} more than you’re asking for. The floor dropped below the target - you went from inside the range to below even its conservative end.`,
            action:  `The plan is over-built around this target even in a bad scenario. Either the retirement date moved further than needed, or the target should rise to match what even a compressed plan can comfortably carry. Test which one accounts for the mismatch.`,
            studio:  `Studio can model whether a much earlier retirement creates real surplus through actual Social Security and withdrawal sequencing - or whether the Sketch is over-projecting the floor’s compression.`,
            paradox: false },
        'EXP-18': {
            physics: `Less compounding time shrank the plan - and the target landed near the floor. The stress-case scenario is now the main support. There’s {gapToCeil} above, but a shorter runway means less room if conditions don’t cooperate.`,
            action:  `Assess whether the spending target should come down slightly to give the floor more cushion - or whether holding the target here, knowing the conservative scenario is the primary support, is the right call at this timeline.`,
            studio:  `Studio can model whether fewer compounding years affect the practical floor through real account balances - catch-up contribution limits and Social Security timing both shift meaningfully with fewer years.`,
            paradox: false },
        'EXP-19': {
            physics: `More runway grew the plan - and the target is now using less of it than at your pin. The ceiling is {gapToCeil} above. More years of compounding built more capacity, and the target isn’t claiming it.`,
            action:  `More years of compounding should produce something - a higher target, an earlier date, or a named purpose for the surplus. Test which one matches the intent before locking in the longer runway.`,
            studio:  `Studio can model whether additional compounding years open Roth conversion windows and Social Security delay strategies that shift the practical position beyond what the Sketch formula projects.`,
            paradox: true },
        'STR-01': {
            physics: `You crossed the ceiling. The plan can’t reach this spending level in any scenario it runs - not a good year, not a great one. The gap between what you’re asking for and what the plan can deliver is {aboveCeil}.`,
            action:  `Pull the spending back to where the plan can reach it - or test whether working a little longer, saving more, or adding capital closes the gap from the other side. At this sub-zone, the ceiling was already close. A small move got you here; a small move can bring you back.`,
            studio:  `Studio can test whether your actual accounts and income sources close some of that {aboveCeil} before anything else needs to change.`,
            paradox: false },
        'STR-02': {
            physics: `You’re still near the top of what the plan can carry - a small reduction didn’t change the fundamental picture. The plan reaches this lifestyle, but it’s relying on conditions going well. There’s {gapToCeil} of cushion between you and the edge, but not much more.`,
            action:  `This position still depends on favorable returns and timing. To get to a place where average conditions carry the weight - not just good ones - the spending target needs to come down more, or the plan’s ceiling needs to rise. Test which feels more realistic.`,
            studio:  `Studio can test whether your actual tax sequencing and Social Security timing hold this level through the full model - not just when things go well.`,
            paradox: false },
        'STR-03': {
            physics: `You’re inside the range now - {gapToFloor} above the floor and {gapToCeil} below the ceiling. Most scenarios carry this lifestyle, not just the favorable ones. That’s a meaningful shift from where you started.`,
            action:  `The question is whether this target feels like enough. You gave up some spending to get here, but what you bought is a plan that doesn’t need things to go well to work. Test whether there’s a number between here and your pin that still feels supported.`,
            studio:  `Studio can narrow that range by modeling your actual accounts, tax sequencing, and withdrawal order - the Sketch holds those constant.`,
            paradox: false },
        'STR-04': {
            physics: `You went from near the top to near the bottom - the plan now supports this lifestyle even in its most conservative scenario. There’s {gapToCeil} between where you are and what the plan can fully deliver. That’s a lot of room you’re not using.`,
            action:  `This is a conservative landing for a large spending reduction. The plan is over-built around this target. The real question is whether this lower number is intentional - protecting against what the Sketch doesn’t model - or whether you went further than you needed to.`,
            studio:  `Studio can confirm whether the headroom above this target holds in real accounts, or whether actual variables absorb some of that apparent cushion.`,
            paradox: false },
        'STR-05': {
            physics: `The plan now projects {floorAboveSpend} more than you’re asking for - even in its worst-case scenario. You’ve moved from asking the plan to stretch to asking less than it can comfortably deliver.`,
            action:  `This is worth pausing on. The plan’s conservative floor still exceeds this target by {floorAboveSpend}. That might be the right answer - minimum floor, maximum cushion - or it might mean you moved the spending too far. Walk it back toward the center and see where the plan starts to breathe naturally.`,
            studio:  `Studio can test whether that below-floor surplus holds in real accounts or whether actual income and tax variables reduce it.`,
            paradox: false },
        'STR-06': {
            physics: `More capital gave the ceiling more room - you’re still near the top, but with slightly more distance between your spending and the plan’s upper boundary than before. The ceiling is now {gapToCeil} above the target. The position improved, but the plan still depends on conditions cooperating.`,
            action:  `Capital is moving the ceiling in the right direction. Find the portfolio level at which the plan carries this spending through the average scenarios - not just the good ones. That’s the capital target worth knowing.`,
            studio:  `Studio can model whether that additional capital compounds differently through your actual account types - pre-tax, Roth, and taxable don’t all push the ceiling the same way.`,
            paradox: false },
        'STR-07': {
            physics: `More capital moved the ceiling far enough above the spending target that most scenarios now carry it - not just the favorable ones. You have {gapToFloor} of cushion below and {gapToCeil} above. The plan isn’t depending on perfect conditions to reach this lifestyle anymore.`,
            action:  `Test where within the range this landing sits. If it’s toward the upper end, the ceiling is close and the improvement is real but partial. If it’s near the center, you’ve genuinely broadened what the plan can hold.`,
            studio:  `Studio can model how that additional capital interacts with your actual tax sequencing and withdrawal order - variables that determine how much of the ceiling growth actually reaches retirement spending.`,
            paradox: false },
        'STR-08': {
            physics: `Less capital dropped the ceiling below the spending target. The plan can’t reach this lifestyle in any scenario it runs. There’s now a {aboveCeil} gap between what you’re asking for and what the plan can deliver with this portfolio level.`,
            action:  `The gap is {aboveCeil}. Restore the portfolio, lower the spending target, or test which other lever has enough power to close it. A gap this size doesn’t resolve on its own.`,
            studio:  `Studio can model how a reduced portfolio changes the real ceiling through actual withdrawal sequencing - the gap may land differently in real accounts than the Sketch projects.`,
            paradox: false },
        'STR-09': {
            physics: `Higher contributions closed the gap - the plan now carries this lifestyle through most scenarios, not just the favorable ones. You have {gapToFloor} below and {gapToCeil} above.`,
            action:  `The favorable-conditions dependency that came with STRETCHED is gone at this contribution rate. Test whether the new ceiling distance feels like the right buffer, or whether there’s a contribution level that gets you closer to the center of the range.`,
            studio:  `Studio can test whether Roth vs traditional contributions interact with this rate differently in real accounts - contribution type affects how much of that ceiling growth actually reaches retirement spending.`,
            paradox: false },
        'STR-10': {
            physics: `Lower contributions dropped the ceiling below the spending target. The plan can’t reach this lifestyle at this savings rate - there’s a {aboveCeil} gap between what you’re asking for and what the plan can currently produce.`,
            action:  `The gap is {aboveCeil}. Restore contributions, lower the spending target, or test which other lever closes it. Contributions have less ceiling leverage than retirement age or portfolio - factor that in when deciding which direction to move.`,
            studio:  `Studio can test whether the contribution type - Roth vs traditional - changes how much of this ceiling impact flows through to actual retirement income at {newContribK}/yr.`,
            paradox: false },
        'STR-11': {
            physics: `Working {yearsDelta} more year(s) gave the plan enough room to carry this lifestyle through most scenarios. You have {gapToFloor} of cushion below and {gapToCeil} above. Time is the most powerful lever in the plan, and it showed here.`,
            action:  `Retiring at {newRetire} changed what the plan can hold - test whether the ceiling distance at this retirement age gives you the buffer you want, and whether the tradeoff of more time working is one you’d actually make.`,
            studio:  `Studio can model whether retiring at {newRetire} also changes Social Security timing and Roth conversion windows in ways that reinforce the ceiling gain the Sketch is showing.`,
            paradox: false },
        'STR-12': {
            physics: `An unusually long extension - {yearsDelta} more years to retirement - grew the plan so much that the floor rose past the spending target. The plan now projects more than this lifestyle requires even in its worst-case scenario. That’s the retirement-age paradox at the extreme: enough time eventually over-builds the plan around a fixed target.`,
            action:  `This is useful information. If {newRetire} is the retirement date, the spending target should probably rise to match what the plan can actually carry. Or test whether a closer retirement date still gets the plan into a comfortable position without over-building this far.`,
            studio:  `Studio can model whether retiring at {newRetire} changes Social Security income and Roth conversion opportunities in ways that shift where the practical floor actually lands.`,
            paradox: false },
        'STR-13': {
            physics: `Retiring {yearsDelta} year(s) earlier dropped the ceiling below the spending target. The plan can’t reach this lifestyle at this retirement date - there’s a {aboveCeil} gap between what you’re asking for and what the compressed timeline produces.`,
            action:  `The gap is {aboveCeil}. Push the retirement date back to {pinnedRetire} or later, lower the spending target by {aboveCeil} or more, or test whether another lever compensates. Retirement age is the strongest ceiling lever - the cost of moving it earlier is proportional.`,
            studio:  `Studio can model whether retiring at {newRetire} changes Social Security claiming strategy and withdrawal sequencing in ways that shift the actual ceiling gap from what the Sketch is showing.`,
            paradox: false },
        'STR-14': {
            physics: `With {newYears} years to retirement, the plan can’t reach this lifestyle - the shorter runway dropped the ceiling below the spending target. There’s a {aboveCeil} gap between what you’re asking for and what the plan produces at this timeline.`,
            action:  `The plan needs more runway, a lower target, or another lever to compensate. The gap is {aboveCeil} - extend the retirement date to restore compounding time, or test which combination of changes closes it.`,
            studio:  `Studio can model whether fewer compounding years change how real account balances project relative to the Sketch ceiling - the gap may be larger or smaller depending on account mix and contribution timing.`,
            paradox: false },
        'STR-15': {
            physics: `With {newYears} years to retirement, the plan carries this lifestyle through most scenarios - not just the favorable ones. There’s {gapToFloor} below and {gapToCeil} above. More runway gave the plan the room it needed to comfortably hold this target.`,
            action:  `Test where within the range this landing sits - if it’s still toward the ceiling side, the improvement is real but there’s more distance to gain. If it’s near the center, the plan is genuinely balanced around this target.`,
            studio:  `Studio can model whether {newYears} years to retirement opens Roth conversion windows and Social Security delay strategies that change the practical ceiling beyond what the Sketch shows.`,
            paradox: false },
    };

    // ── PINNED routing table (Step 2a): [pinnedState][lever][dir][resultState] → caseId
    const _PR = {
        OVEREXTENDED: {
            none:      { none: { OVEREXTENDED: 'OE.0' } },
            datum:     {
                down: { OVEREXTENDED: 'OE.S.1', STRETCHED: 'OE.S.2', EXPANSIVE: 'OE.S.3', GROUNDED: 'OE.S.4', ABUNDANT: 'OE.S.5' },
                up:   { OVEREXTENDED: 'OE.S.6' }
            },
            portfolio: {
                up:   { OVEREXTENDED: 'OE.P.1', STRETCHED: 'OE.P.2', EXPANSIVE: 'OE.P.3' },
                down: { OVEREXTENDED: 'OE.P.4' }
            },
            retire:    {
                up:   { OVEREXTENDED: 'OE.R.1', STRETCHED: 'OE.R.2', EXPANSIVE: 'OE.R.3' },
                down: { OVEREXTENDED: 'OE.R.4' }
            },
            contrib:   {
                up:   { OVEREXTENDED: 'OE.C.1', STRETCHED: 'OE.C.1b', EXPANSIVE: 'OE.C.2' },
                down: { OVEREXTENDED: 'OE.C.3' }
            },
            age:       {
                down: { OVEREXTENDED: 'OE.A.1-age', STRETCHED: 'OE.A.1b-age', EXPANSIVE: 'OE.A.1c-age' },
                up:   { OVEREXTENDED: 'OE.A.2' }
            }
        },
        ABUNDANT: {
            datum:     {
                up:   { ABUNDANT: 'ABU-01', GROUNDED: 'ABU-02', EXPANSIVE: 'ABU-03', STRETCHED: 'ABU-04', OVEREXTENDED: 'ABU-05' },
                down: { ABUNDANT: 'ABU-06' }
            },
            portfolio: {
                up:   { ABUNDANT: 'ABU-07' },
                down: { ABUNDANT: 'ABU-08', GROUNDED: 'ABU-09', EXPANSIVE: 'ABU-10' }
            },
            contrib:   {
                up:   { ABUNDANT: 'ABU-11' },
                down: { GROUNDED: 'ABU-12' }
            },
            retire:    {
                up:   { ABUNDANT: 'ABU-13' },
                down: { ABUNDANT: 'ABU-14', GROUNDED: 'ABU-15', EXPANSIVE: 'ABU-16' }
            },
            age:       {
                up:   { GROUNDED: 'ABU-17', EXPANSIVE: 'ABU-18' },
                down: { ABUNDANT: 'ABU-19' }
            }
        },
        GROUNDED: {
            datum:     {
                up:   { GROUNDED: 'GRD-01', EXPANSIVE: 'GRD-02', STRETCHED: 'GRD-03', OVEREXTENDED: 'GRD-04' },
                down: { ABUNDANT: 'GRD-05' }
            },
            portfolio: {
                up:   { GROUNDED: 'GRD-06', EXPANSIVE: 'GRD-07' },
                down: { ABUNDANT: 'GRD-08' }
            },
            contrib:   {
                up:   { GROUNDED: 'GRD-09' },
                down: { ABUNDANT: 'GRD-10' }
            },
            retire:    {
                up:   { GROUNDED: 'GRD-11', EXPANSIVE: 'GRD-12' },
                down: { ABUNDANT: 'GRD-13' }
            },
            age:       {
                up:   { ABUNDANT: 'GRD-14' },
                down: { GROUNDED: 'GRD-15' }
            }
        },
        EXPANSIVE: {
            datum:     {
                up:   { EXPANSIVE: 'EXP-01', STRETCHED: 'EXP-02', OVEREXTENDED: 'EXP-03' },
                down: { EXPANSIVE: 'EXP-04', GROUNDED: 'EXP-05', ABUNDANT: 'EXP-06' }
            },
            portfolio: {
                up:   { EXPANSIVE: 'EXP-07', STRETCHED: 'EXP-08' },
                down: { EXPANSIVE: 'EXP-09', GROUNDED: 'EXP-10' }
            },
            contrib:   {
                up:   { EXPANSIVE: 'EXP-11', STRETCHED: 'EXP-12' },
                down: { GROUNDED: 'EXP-13' }
            },
            retire:    {
                up:   { EXPANSIVE: 'EXP-14', STRETCHED: 'EXP-15' },
                down: { GROUNDED: 'EXP-16', ABUNDANT: 'EXP-17' }
            },
            age:       {
                up:   { GROUNDED: 'EXP-18' },
                down: { EXPANSIVE: 'EXP-19' }
            }
        },
        STRETCHED: {
            datum:     {
                up:   { OVEREXTENDED: 'STR-01' },
                down: { STRETCHED: 'STR-02', EXPANSIVE: 'STR-03', GROUNDED: 'STR-04', ABUNDANT: 'STR-05' }
            },
            portfolio: {
                up:   { STRETCHED: 'STR-06', EXPANSIVE: 'STR-07' },
                down: { OVEREXTENDED: 'STR-08' }
            },
            contrib:   {
                up:   { EXPANSIVE: 'STR-09' },
                down: { OVEREXTENDED: 'STR-10' }
            },
            retire:    {
                up:   { EXPANSIVE: 'STR-11', ABUNDANT: 'STR-12' },
                down: { OVEREXTENDED: 'STR-13' }
            },
            age:       {
                up:   { OVEREXTENDED: 'STR-14' },
                down: { EXPANSIVE: 'STR-15' }
            }
        }
    };

    function _routeLookup(pinnedSt, lever, dir, resultSt) {
        const byState = _PR[pinnedSt]; if (!byState) return null;
        const byLever = byState[lever]; if (!byLever) return null;
        const byDir   = byLever[dir];   if (!byDir)   return null;
        if (byDir[resultSt]) return byDir[resultSt];
        // Nearest-neighbor fallback: find closest mapped result state on quality axis
        const _axis = { ABUNDANT: 0, EXPANSIVE: 1, GROUNDED: 2, STRETCHED: 3, OVEREXTENDED: 4 };
        const _tIdx = _axis[resultSt] !== undefined ? _axis[resultSt] : 2;
        let _bestId = null, _bestDist = Infinity, _bestIdx = Infinity;
        for (const _st in byDir) {
            const _sIdx = _axis[_st] !== undefined ? _axis[_st] : 2;
            const _dist = Math.abs(_sIdx - _tIdx);
            if (_dist < _bestDist || (_dist === _bestDist && _sIdx < _bestIdx)) {
                _bestId = byDir[_st]; _bestDist = _dist; _bestIdx = _sIdx;
            }
        }
        return _bestId || null;
    }

    // getPinnedCaseObj: workbook PINNED single-lever routing (Step 2a)
    // Returns case object or null (null → heuristic multi-lever fallback)
    function getPinnedCaseObj(pinnedState, pts, currentScenario) {
        // Reconstruct pinned scenario from stored metadata
        function _pRates(label) {
            if (label === 'Optimistic') return { c: 1.020, b: 1.040, u: 1.065 };
            if (label === 'Stress')     return { c: 1.005, b: 1.015, u: 1.035 };
            return                             { c: 1.015, b: 1.035, u: 1.055 };
        }
        const _pR   = _pRates(pinnedState.pinnedParadigm || 'Historical');
        const _pYTG = Math.max(0, (pinnedState.retire || 65) - (pinnedState.age || 40));
        const _pSc  = {
            portfolioVol:     pinnedState.port    || 0.75,
            annualContrib:    pinnedState.contrib  || 25000,
            targetSpend:      pinnedState.datum    || 100,
            planThroughAge:   pinnedState.planThroughAge || 93,
            conservativeRate: _pR.c, baselineRate: _pR.b, upsideRate: _pR.u,
            isNominal: (pinnedState.pinnedInflStr === 'Nominal'),
            taxMult:   1.0 - ((pinnedState.pinnedTax || 0) / 100),
            inflRate:  0.03
        };
        const _pPts = getMathPoint(_pYTG, _pYTG, _pSc);

        // Current lever values
        const _cAge    = currentScenario.currentAge;
        const _cRetire = currentScenario.activationAge;
        const _cPort   = currentScenario.portfolioVol;
        const _cContrib = currentScenario.annualContrib;
        const _cDatum  = currentScenario.targetSpend;
        const _cPlan   = currentScenario.planThroughAge || 93;
        const _cYTG    = Math.max(0, _cRetire - _cAge);

        // Detect changed levers
        const _dRetire  = Math.abs((pinnedState.retire  || 65) - _cRetire)  > 0.5;
        const _dAge     = Math.abs((pinnedState.age    || 18) - _cAge)    > 0.5;
        const _dPort    = Math.abs((pinnedState.port   || 0)  - _cPort)   > 0.001;
        const _dContrib = Math.abs((pinnedState.contrib || 0) - _cContrib) > 500;
        const _dDatum   = Math.abs((pinnedState.datum || 0) - _cDatum) > 0.5;
        const _dPlan    = Math.abs((pinnedState.planThroughAge || 93) - _cPlan) >= 1;

        // Derive current paradigm label from rates (for tax/market detection)
        const _curParadigmLabel = currentScenario.baselineRate === 1.040 ? 'Optimistic'
                                : currentScenario.baselineRate === 1.015 ? 'Stress' : 'Historical';
        const _curTaxPct = Math.round((1.0 - (currentScenario.taxMult || 1.0)) * 100);
        const _dTax = pinnedState.pinnedTax !== undefined
                   && pinnedState.pinnedTax !== _curTaxPct;
        const _dMkt = !!(pinnedState.pinnedParadigm
                   && pinnedState.pinnedParadigm !== _curParadigmLabel);

        // Shape levers: those affecting ceilSpend/floorSpend
        const _shapeMovers = [];
        if (_dRetire)  _shapeMovers.push('retire');
        if (_dAge)     _shapeMovers.push('age');
        if (_dPort)    _shapeMovers.push('portfolio');
        if (_dContrib) _shapeMovers.push('contrib');
        if (_dPlan)    _shapeMovers.push('plan');
        if (_dTax)     _shapeMovers.push('tax');
        if (_dMkt)     _shapeMovers.push('market');

        const _anyMoved = _dDatum || _shapeMovers.length > 0;
        if (!_anyMoved) {
            // No-movement case: only OVEREXTENDED has OE.0
            const _pinnedName = pinnedState.stateObj ? pinnedState.stateObj.name : '';
            if (_pinnedName !== 'OVEREXTENDED') return null;
            const _cid0 = 'OE.0';
            const _cd0  = _PC[_cid0];
            if (!_cd0) return null;
            return { caseId: _cid0, lever: 'none', direction: 'none',
                     resultState: 'OVEREXTENDED', resultSubZone: '',
                     physics: _cd0.physics, action: _cd0.action, studio: _cd0.studio,
                     paradox: false, isSingleLever: true, primaryPct: 1.0 };
        }

        let _lever = null, _dir = 'none', _primaryPct = 1.0;

        if (_dDatum && _shapeMovers.length === 0) {
            // Datum-only move
            _lever = 'datum';
            _dir   = _cDatum > pinnedState.datum ? 'up' : 'down';

        } else if (_shapeMovers.length === 1 && !_dDatum) {
            // Single shape lever, no datum change
            _lever = _shapeMovers[0];
            if (_lever === 'retire')    _dir = _cRetire  > pinnedState.retire   ? 'up' : 'down';
            else if (_lever === 'age')  _dir = _cAge     > pinnedState.age      ? 'up' : 'down';
            else if (_lever === 'portfolio') _dir = _cPort    > pinnedState.port    ? 'up' : 'down';
            else if (_lever === 'contrib')   _dir = _cContrib > pinnedState.contrib ? 'up' : 'down';
            else if (_lever === 'plan')      _dir = _cPlan    < (pinnedState.planThroughAge || 93) ? 'up' : 'down';
            else _dir = 'up'; // tax/market: no workbook case, will return null below

        } else if (_shapeMovers.length >= 2 && !_dDatum) {
            // Multiple shape levers — apply 70% threshold (Q1 Option A)
            const _deltas = {};
            let _totalD = 0;
            for (const _lev of _shapeMovers) {
                let _cfPts;
                if (_lev === 'retire') {
                    const _cfYTG = Math.max(0, _cRetire - (pinnedState.age || 40));
                    _cfPts = getMathPoint(_cfYTG, _cfYTG, _pSc);
                } else if (_lev === 'age') {
                    const _cfYTG = Math.max(0, (pinnedState.retire || 65) - _cAge);
                    _cfPts = getMathPoint(_cfYTG, _cfYTG, _pSc);
                } else if (_lev === 'portfolio') {
                    const _cfSc = Object.assign({}, _pSc, { portfolioVol: _cPort });
                    _cfPts = getMathPoint(_pYTG, _pYTG, _cfSc);
                } else if (_lev === 'contrib') {
                    const _cfSc = Object.assign({}, _pSc, { annualContrib: _cContrib });
                    _cfPts = getMathPoint(_pYTG, _pYTG, _cfSc);
                } else if (_lev === 'plan') {
                    const _cfSc = Object.assign({}, _pSc, { planThroughAge: _cPlan });
                    _cfPts = getMathPoint(_pYTG, _pYTG, _cfSc);
                } else if (_lev === 'tax') {
                    const _cfSc = Object.assign({}, _pSc, { taxMult: currentScenario.taxMult });
                    _cfPts = getMathPoint(_pYTG, _pYTG, _cfSc);
                } else if (_lev === 'market') {
                    const _cfSc = Object.assign({}, _pSc, {
                        conservativeRate: currentScenario.conservativeRate,
                        baselineRate: currentScenario.baselineRate,
                        upsideRate: currentScenario.upsideRate
                    });
                    _cfPts = getMathPoint(_pYTG, _pYTG, _cfSc);
                } else {
                    _cfPts = _pPts;
                }
                const _d = Math.abs(_cfPts.ceilSpend  - _pPts.ceilSpend)
                         + Math.abs(_cfPts.floorSpend - _pPts.floorSpend);
                _deltas[_lev] = _d;
                _totalD += _d;
            }
            if (_totalD <= 0) return null;
            let _maxLev = null, _maxVal = 0;
            for (const _k in _deltas) {
                if (_deltas[_k] > _maxVal) { _maxVal = _deltas[_k]; _maxLev = _k; }
            }
            _primaryPct = _maxVal / _totalD;
            if (_primaryPct < 0.70) return null; // no dominant lever → heuristic
            _lever = _maxLev;
            if (_lever === 'retire')    _dir = _cRetire  > pinnedState.retire   ? 'up' : 'down';
            else if (_lever === 'age')  _dir = _cAge     > pinnedState.age      ? 'up' : 'down';
            else if (_lever === 'portfolio') _dir = _cPort    > pinnedState.port    ? 'up' : 'down';
            else if (_lever === 'contrib')   _dir = _cContrib > pinnedState.contrib ? 'up' : 'down';
            else if (_lever === 'plan')      _dir = _cPlan    < (pinnedState.planThroughAge || 93) ? 'up' : 'down';
            else _dir = 'up';

        } else {
            // datum + shape lever(s) = always multi-lever fallback
            return null;
        }

        // Tax/market as sole lever: no workbook case
        if (_lever === 'tax' || _lever === 'market') return null;

        // Resolve resulting state
        const _resObj   = getShapeStateObj(pts);
        const _resName  = _resObj ? _resObj.name     : 'UNKNOWN';
        const _resSZ    = _resObj ? (_resObj.subZone || '') : '';

        const _pinnedName = pinnedState.stateObj ? pinnedState.stateObj.name : 'UNKNOWN';

        // Plan-through: Phase 3a — route to 15 PT cases by pinned state + direction + result
        if (_lever === 'plan') {
            const _PTA_PC = {
'OE.PT.1':{ physics:"A shorter retirement raised the ceiling to {newCeilK} — the same portfolio covering {newPlanYears} years instead. You’re now {aboveCeil} from the plan supporting this. No dollar was added; the money just has to stretch less far.", action:"This is an assumption lever, not an effort one — it only helps if the shorter retirement is real. Confirm the horizon matches your own outlook before leaning on the higher ceiling." },
'OE.PT.2':{ physics:"Planning through {newPlanThrough} pushed the ceiling past your target — the plan reaches this, but only when conditions are good. You’re {gapToCeil} inside the range, on the same pile covering fewer years.", action:"A shorter horizon got you in range, but it costs nothing and proves nothing. Pair it with a real lever, or confirm the horizon is genuine, before relying on it." },
'OE.PT.3':{ physics:"A longer retirement lowered the ceiling to {newCeilK} — the same portfolio now covering {newPlanYears} years. The gap widened to {aboveCeil}. Your savings didn’t change; you asked the money to last longer.", action:"This is the honest direction — most people underestimate how long they’ll live. If {newPlanThrough} is realistic, treat the wider gap as the true picture and close it with capital, time, or a lower target." },
'ABU-PT-1':{ physics:"A shorter retirement raised the floor by {deltaFloorK} — moving it further above your spending, not closer. The same portfolio covering {newPlanYears} years projects more at the floor, so the surplus widened to {floorAboveSpend}.", action:"This is the paradox of this position: shortening the horizon lifts the floor away from your target, just like adding capital does. The only way it helps is if you raise spending to {floorK} to meet where the floor now sits — and only if the shorter retirement is genuine." },
'ABU-PT-2':{ physics:"A longer retirement lowered the floor by {deltaFloorK} — bringing it down toward your target, but it still sits {floorAboveSpend} above your spending. The same portfolio spread across {newPlanYears} years projects less at the floor.", action:"Lengthening the horizon is the one move that closes this gap from the floor’s side — the opposite of adding capital. The floor is at {floorK}; keep checking it against a realistic {newPlanThrough} rather than leaning on a shorter assumption to force alignment." },
'ABU-PT-3':{ physics:"A much longer retirement lowered the floor by {deltaFloorK} until it met your spending level — the plan’s conservative scenario now carries this lifestyle over {newPlanYears} years. There’s {gapToCeil} of ceiling room above.", action:"The horizon did the work that a spending increase or a capital reduction would have — it brought the floor down to your target honestly. If {newPlanThrough} is realistic, this is a true alignment, not a paper one." },
'GRD-PT-1':{ physics:"A shorter retirement raised the floor by {deltaFloorK} — to {floorK} — because the same portfolio now covers {newPlanYears} years. If your target sat right at the edge, the floor may have moved above it rather than away from it. The ceiling is {gapToCeil} above.", action:"This is the TIGHT-zone risk in a new form: shortening the horizon lifts the floor toward your target. If the floor crossed above it, raise your spending to {floorK} to meet where the plan’s worst case now sits — and only if the shorter retirement is real." },
'GRD-PT-2':{ physics:"A meaningfully shorter retirement lifted both boundaries enough to move your target into the interior — {gapToFloor} above the floor and {gapToCeil} below the ceiling. The same pile covering {newPlanYears} years can safely deliver more each year.", action:"The range opened because the horizon shrank, not because the plan grew. Confirm {newPlanThrough} matches your actual outlook before relying on the wider interior — it’s an assumption doing the work here, not a dollar." },
'GRD-PT-3':{ physics:"A longer retirement lowered the floor by {deltaFloorK} to {floorK} — below your target. The same portfolio now spread across {newPlanYears} years projects {floorAboveSpend} less at the floor, dropping it beneath your spending.", action:"A longer horizon is often the honest one. If {newPlanThrough} is realistic, the surplus below is real — the floor at {floorK} is what the plan’s worst case now produces over that span. Test whether your target should hold or come down." },
'EXP-PT-1':{ physics:"A shorter retirement raised the ceiling to {newCeilK} — the same portfolio covering {newPlanYears} years instead. The ceiling is now {gapToCeil} above your target, with more room than at your pin. No dollar was added; the money just has to stretch less far.", action:"This is an assumption lever, not an effort one — it only widens the range if the shorter retirement is real. If it is, name what the extra ceiling room is for; if it isn’t, the headroom is on paper only." },
'EXP-PT-2':{ physics:"A longer retirement lowered the ceiling to {newCeilK} — the same portfolio now covering {newPlanYears} years. The target ended up {gapToCeil} from the ceiling without ever moving. The plan now leans on good conditions to hold this.", action:"The horizon moved, not your spending. If {newPlanThrough} is realistic, treat the tighter position as the true one — and lower the target or add a real lever to get back off the edge." },
'EXP-PT-3':{ physics:"A much longer retirement dropped the ceiling below your target — the same portfolio now spread across {newPlanYears} years. There’s a {aboveCeil} gap between what you’re asking for and what the plan can deliver over that horizon.", action:"This is the honest direction — most people underestimate how long they’ll live. If {newPlanThrough} is realistic, close the {aboveCeil} gap with capital, time, or a lower target rather than a shorter assumption." },
'STR-PT-1':{ physics:"A shorter retirement raised the ceiling to {newCeilK} — the same portfolio covering {newPlanYears} years instead. That lifted the upper boundary away from your target enough to move into the interior: {gapToFloor} above the floor, {gapToCeil} below the ceiling. The favorable-conditions dependency eased.", action:"The relief came from the horizon, not from more capital — it only holds if the shorter retirement is real. If it is, you’ve bought genuine room off the edge; if it isn’t, you’re still near the ceiling in truth." },
'STR-PT-2':{ physics:"A modestly shorter retirement nudged the ceiling up to {newCeilK} — the same portfolio over {newPlanYears} years — but you’re still near the top, with {gapToCeil} of cushion. The position improved without leaving STRETCHED.", action:"The horizon moved the ceiling the right way, but not far enough to change the picture — the plan still leans on good conditions. Find the retirement length where average scenarios carry this, or pair it with a real lever." },
'STR-PT-3':{ physics:"A longer retirement lowered the ceiling to {newCeilK} — the same portfolio now spread across {newPlanYears} years — dropping it below your target. There’s a {aboveCeil} gap between what you’re asking for and what the plan can deliver over that horizon.", action:"This is the honest direction — most people underestimate how long they’ll live. If {newPlanThrough} is realistic, close the {aboveCeil} gap with capital, time, or a lower target rather than relying on a shorter assumption to hold the ceiling up." }
            };
            const _ptaId = (function(pn, d, rn) {
                if (pn === 'OVEREXTENDED') return d === 'up' ? (rn === 'STRETCHED' ? 'OE.PT.2' : 'OE.PT.1') : 'OE.PT.3';
                if (pn === 'ABUNDANT')     return d === 'up' ? 'ABU-PT-1' : (rn === 'GROUNDED' ? 'ABU-PT-3' : 'ABU-PT-2');
                if (pn === 'GROUNDED')     return d === 'up' ? (rn === 'EXPANSIVE' ? 'GRD-PT-2' : 'GRD-PT-1') : 'GRD-PT-3';
                if (pn === 'EXPANSIVE')    return d === 'up' ? 'EXP-PT-1' : (rn === 'OVEREXTENDED' ? 'EXP-PT-3' : 'EXP-PT-2');
                if (pn === 'STRETCHED')    return d === 'up' ? (rn === 'EXPANSIVE' ? 'STR-PT-1' : 'STR-PT-2') : 'STR-PT-3';
                return null;
            })(_pinnedName, _dir, _resName);
            const _ptaCd = _ptaId ? _PTA_PC[_ptaId] : null;
            return { caseId: _ptaId, lever: 'plan', direction: _dir,
                     resultState: _resName, resultSubZone: _resSZ,
                     physics: _ptaCd ? _ptaCd.physics : '',
                     action:  _ptaCd ? _ptaCd.action  : '',
                     studio: '', paradox: false,
                     isSingleLever: true, primaryPct: _primaryPct };
        }
        const _caseId = _routeLookup(_pinnedName, _lever, _dir, _resName);
        if (!_caseId) return null;

        const _cd = _PC[_caseId];
        if (!_cd) return null;

        return {
            caseId:        _caseId,
            lever:         _lever,
            direction:     _dir,
            resultState:   _resName,
            resultSubZone: _resSZ,
            physics:       _cd.physics,
            action:        _cd.action,
            studio:        _cd.studio,
            paradox:       _cd.paradox,
            isSingleLever: true,
            primaryPct:    _primaryPct
        };
    }


  DatumShape.S2Copy = {
    getPinnedCaseObj: getPinnedCaseObj,
    _routeLookup: _routeLookup,
    _PC: _PC,
    _PR: _PR
  };

  /* ── INVERSE REQUIREMENTS COPY ("What It Takes") ─ VERBATIM relocation of populateZoneC
   * from sketch.html. The 1030-line body is byte-verbatim; only the I/O boundary changed
   * (globals -> ctx.*, req.innerHTML=X;return; -> return {headLabel,html,acceptFromState}).
   * Pinned byte-identical by scripts/_buildrequirements_parity.js. Placed AFTER S2Copy={} so the
   * _s2_copy_parity _PC slice stays intact. Reuses getMathPoint/getShapeStateObj + DatumShape.solveInverse;
   * DATUM consts + _d2BinarySearchYDatum are sketch-verbatim. */
  var DATUM_GROWTH_RATE_SPEC = 0.045;
  var DATUM_SUPPORT_RATE     = 0.040;
  var DRIVER_TIE_EPSILON     = 0.005;
    function _d2BinarySearchYDatum(datumTarget_M, s) {
      var lo = s.currentAge + 1;
      var hi = s.currentAge + 50;
      for (var _i = 0; _i < 50; _i++) {
        var mid = Math.floor((lo + hi) / 2);
        var _Y  = mid - s.currentAge;
        var _gf = _Y > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _Y) : 1;
        var _PM = s.portfolioVol  || 0;
        var _KM = (s.annualContrib || 0) / 1e6;
        var _hDatBs  = Math.max(15, (s.planThroughAge || 93) - mid);
        var _hScDatBs = 0.6079 / (1 - Math.pow(1.034, -_hDatBs));
        var _DRatBs  = DATUM_SUPPORT_RATE * _hScDatBs;
        var _sup = _gf * _PM * _DRatBs
                 + (_gf > 1 ? _DRatBs * _KM * ((_gf - 1) / DATUM_GROWTH_RATE_SPEC) : 0);
        if (Math.abs(_sup - datumTarget_M) < 0.0005) { lo = mid; hi = mid; break; }
        if (_sup < datumTarget_M) lo = mid; else hi = mid;
      }
      return Math.floor((lo + hi) / 2); // retireAge (integer)
    }
  function buildRequirements(pts, overrides, ctx) {
    var _headLabel = (overrides && overrides.isDirty) ? 'WHAT IT TAKES TO REACH THIS SHAPE' : 'TO REACH THIS DESIGN:';
    var _acceptFromState;
      if (!pts || !ctx.currentScenario) return { headLabel: _headLabel, html: null, acceptFromState: undefined };


      var s  = ctx.designScenario || ctx.currentScenario;
      var dc = overrides.ceilDelta  || 0;
      var df = overrides.floorDelta || 0;
      var dd = overrides.datumDelta || 0;

      // SP conditional clause helpers
      var _portDeltaM   = overrides.portDelta || 0;
      var _spOffOrigin  = _portDeltaM > 0.001;
      var _spClauseCard = function(body) {
        return '<div class="req-item" style="border-left:2px solid rgba(93,202,165,0.45);background:rgba(93,202,165,0.04);margin-bottom:6px;">'
          + '<div class="req-item-label" style="color:rgba(93,202,165,0.7);font-size:9px;letter-spacing:0.1em;">DESIGNED-IN STARTING BALANCE</div>'
          + '<div class="req-item-body" style="font-size:11px;color:rgba(255,255,255,0.65);">' + body + '</div></div>';
      };

      // Normalize: ctx.designScenario uses {age,retire,port,datum,contrib};
      // solveInverse + _d2BinarySearchY + getMathPoint expect {currentAge,activationAge,yearsToGrow,portfolioVol,annualContrib,targetSpend,...rates}
      var _sNorm = (function() {
        var _age    = s.currentAge    !== undefined ? s.currentAge    : (s.age    || 0);
        var _retire = s.activationAge !== undefined ? s.activationAge : (s.retire || 0);
        var _par    = ctx.marketParadigm || 'average';
        var _cR = 1.015, _bR = 1.035, _uR = 1.055;
        if (_par === 'optimistic') { _cR = 1.020; _bR = 1.040; _uR = 1.065; }
        else if (_par === 'stress') { _cR = 1.005; _bR = 1.015; _uR = 1.035; }
        return {
          currentAge:       _age,
          activationAge:    _retire,
          planThroughAge:   s.planThroughAge !== undefined ? s.planThroughAge : 93,
          yearsToGrow:      s.yearsToGrow   !== undefined ? s.yearsToGrow   : Math.max(0, _retire - _age),
          portfolioVol:     s.portfolioVol  !== undefined ? s.portfolioVol  : (s.port    || 0),
          annualContrib:    s.annualContrib  !== undefined ? s.annualContrib : (s.contrib || 0),
          targetSpend:      s.targetSpend   !== undefined ? s.targetSpend   : Math.round(s.datum || 0),
          conservativeRate: _cR, baselineRate: _bR, upsideRate: _uR,
          isNominal: ctx.ghostBaseline ? (ctx.ghostBaseline.isNominal || false) : false,
          taxMult:   ctx.ghostBaseline ? (ctx.ghostBaseline.taxMult   || 0.8)   : 0.8,
          inflRate:  0.03
        };
      })();

      // ── Format helpers ───────────────────────────────────────────────
      var fmtKyr = function(v) { return '$' + Math.round(Math.abs(v)) + 'k/yr'; };
      var fmtPort = function(dP_M) {
        var d = Math.abs(dP_M) * 1e6;
        if (d >= 1e6) return '$' + (Math.round(d / 1e4) / 100).toFixed(2).replace(/\.00$/, '') + 'M';
        return '$' + (Math.round(d / 1000) * 1000).toLocaleString('en-US');
      };
      var fmtContrib = function(dK) {
        return '$' + (Math.round(Math.abs(dK) / 100) * 100).toLocaleString('en-US') + '/year';
      };
      var fmtYrs = function(dY) {
        var n = Math.abs(Math.round(dY));
        return n + ' year' + (n !== 1 ? 's' : '');
      };
      // Per-$1,000 portfolio ceiling/floor effect: a1/a2 in $M/yr per $M → ×1000 → $/yr per $1k
      var fmtPortPer1k = function(sens) { return '$' + Math.round(Math.abs(sens) * 1000) + '/yr per $1,000'; };
      // HTML builder helpers
      var item = function(cls, labelColor, labelTxt, bodyTxt, reqType, reqVal) {
        var da = (reqType != null && reqVal != null)
          ? ' data-req-type="' + reqType + '" data-req-value="' + reqVal + '" tabindex="0" style="cursor:pointer;"'
          : '';
        var acceptBtn = (reqType != null && reqVal != null)
          ? '<button class="d2-accept-btn" data-req-type="' + reqType + '" data-req-value="' + reqVal + '">↑ ACCEPT — APPLY TO SKETCH</button>'
          : '';
        return '<div class="req-item ' + cls + '"' + da + '>'
          + '<div class="req-item-label" style="color:' + labelColor + ';">' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + acceptBtn + '</div></div>';
      };
      var warn = function(cls, labelColor, labelTxt, bodyTxt) {
        return '<div class="req-item ' + cls + '" style="opacity:0.65;">'
          + '<div class="req-item-label" style="color:' + labelColor + ';">&#9888; ' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + '</div></div>';
      };
      var studioCTA = function(copy) {
        return '<div class="req-item" style="border-left-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.02);margin-top:6px;">'
          + '<div class="req-item-label" style="color:rgba(255,255,255,0.35);letter-spacing:0.1em;">STUDIO</div>'
          + '<div class="req-item-body" style="color:rgba(255,255,255,0.5);font-size:11px;">' + copy + '</div></div>';
      };
      var headCard = function(headline, contextLine) {
        return '<div class="req-item" style="border-left-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04);margin-bottom:8px;">'
          + '<div class="req-item-body"><strong>' + headline + '</strong><br><span style="color:rgba(255,255,255,0.6);font-size:11px;">' + contextLine + '</span></div></div>';
      };

      // itemD — like item() but carries a datum secondary value for Accept wiring (Framing D only).
      var itemD = function(cls, labelColor, labelTxt, bodyTxt, reqType, reqVal, datumVal) {
        var _dv = datumVal != null ? ' data-req-datum-value="' + datumVal + '"' : '';
        var da = (reqType != null && reqVal != null)
          ? ' data-req-type="' + reqType + '" data-req-value="' + reqVal + '"' + _dv + ' tabindex="0" style="cursor:pointer;"'
          : '';
        var acceptBtn = (reqType != null && reqVal != null)
          ? '<button class="d2-accept-btn" data-req-type="' + reqType + '" data-req-value="' + reqVal + '"' + _dv + '>&#x2191; ACCEPT &mdash; APPLY TO SKETCH</button>'
          : '';
        return '<div class="req-item ' + cls + '"' + da + '>'
          + '<div class="req-item-label" style="color:' + labelColor + ';">' + labelTxt + '</div>'
          + '<div class="req-item-body">' + bodyTxt + acceptBtn + '</div></div>';
      };

      var r = DatumShape.solveInverse(dc, df, dd, pts, _sNorm);
      var html = '';

      // ── Block: none (no drag) ────────────────────────────────────────
      if (r.block === 'none') {
        if (_spOffOrigin) {
          var _spAloneNewP = _sNorm.portfolioVol + _portDeltaM;
          var _spAloneBody = 'You\'ve raised the starting balance from '
            + fmtPort(_sNorm.portfolioVol) + ' to ' + fmtPort(_spAloneNewP)
            + ' — designing in ' + fmtPort(_portDeltaM)
            + ' before any endpoint moves. The whole band lifts from this new origin. Accept to commit this balance to your Sketch.';
          html += item('req-item', 'var(--teal-mid)', 'STARTING POINT — DESIGNED IN', _spAloneBody, 'capital', _spAloneNewP);
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          return;
        }
        return { headLabel: _headLabel, html: '<div class="req-placeholder">Drag the Ceiling, Floor, or Datum handles to design your shape — and see exactly what each move means.</div>', acceptFromState: _acceptFromState };
        return;
      }

      // ── Block E v3: datum-only — 33-cell Datum Drag Matrix ───────────────────────
      if (r.block === 'E') {
        // Landing state (AcceptFromState + L2 routing key)
        var _eLandSt   = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _eLandName = _eLandSt ? _eLandSt.name    : 'EXPANSIVE';
        var _eLandSz   = _eLandSt ? _eLandSt.subZone : 'CENTERED';
        var _eLandClr  = _eLandSt ? _eLandSt.color   : 'var(--teal-mid)';
        _acceptFromState = _eLandName;

        // Entry zone from ctx.ghostBaseline (Discover snapshot)
        var _eGbYrs  = ctx.ghostBaseline ? (ctx.ghostBaseline.yearsToGrow || Math.max(0, ctx.ghostBaseline.activationAge - ctx.ghostBaseline.currentAge)) : 0;
        var _eGbEnd  = ctx.ghostBaseline ? getMathPoint(_eGbYrs, _eGbYrs, ctx.ghostBaseline) : { ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget };
        var _eEntrySt   = getShapeStateObj(_eGbEnd);
        var _eEntryName = _eEntrySt ? _eEntrySt.name    : 'EXPANSIVE';
        var _eEntrySz   = _eEntrySt ? _eEntrySt.subZone : 'CENTERED';

        // L1 key: entryName_subZone_DIR_landName_subZone  |  L2 key: landingName_subZone
        var _eDir     = dd > 0 ? 'UP' : 'DN';
        var _eL1Key   = _eEntryName + '_' + _eEntrySz + '_' + _eDir + '_' + _eLandName + '_' + _eLandSz;
        var _eL1FbKey = _eEntryName + '_' + _eEntrySz + '_' + _eDir;
        var _eL2Key   = _eLandName  + '_' + _eLandSz;

        // 4 variable bindings
        var _fmtK = function(v) { return '$' + Math.round(Math.abs(v)) + 'k'; };
        var _eVars = {
          newDatum_fmt:   fmtKyr(r.datumTarget),
          deltaDatum_fmt: '$' + Math.round(Math.abs(dd)) + 'k/yr',
          ceilGap_fmt:    _fmtK(r.ceilTarget - r.datumTarget),
          floorGap_fmt:   _fmtK(r.datumTarget - r.floorTarget)
        };
        var _eFill = function(t) { return t.replace(/{(\w+)}/g, function(m, k) { return k in _eVars ? _eVars[k] : m; }); };

        // ── L1 fallback table: 22 cells landing-agnostic (entry sub-zone × direction) ──
        var _eL1Fallback = {
          'OVEREXTENDED_STRUCTURAL_UP': {
            op: "You're already significantly above the Ceiling — and you're testing whether the plan can carry even more. The Datum is now {deltaDatum_fmt} above where you started, sitting {ceilGap_fmt} past a limit the plan's current structure can't reach. This is a stress-test, not a plan state. The question isn't whether this works today — it doesn't — it's what would need to change for it to work.",
            lv: "The gap between where the Datum sits and what the plan supports is {ceilGap_fmt}. To close that gap, the most direct path is a structural change — more capital, higher contributions, a later start date, or some combination. Studio can show you the cost of closing it and which lever is most efficient given where your accounts actually stand. One lever that adds no capital is the retirement length itself: planning through fewer years raises the Ceiling toward {newDatum_fmt} on the same pile — but it only counts if the shorter horizon is genuine."
          },
          'OVEREXTENDED_ENTRY_UP': {
            op: "You were barely over the Ceiling — and you dragged higher. The Datum is now {deltaDatum_fmt} above your starting point, pushing {ceilGap_fmt} past what the plan currently supports. You were already testing feasibility from the entry point; this move asks a harder version of that same question.",
            lv: "The plan can't reach {newDatum_fmt} without a structural change. The gap to close is {ceilGap_fmt} — small enough that a targeted portfolio addition or a modest contribution increase might be sufficient. Studio can run the math on what each lever costs at your specific account structure. And because this gap is small, a shorter retirement length alone may close it — planning through fewer years lifts the Ceiling without new capital, honest only if the horizon truly is shorter."
          },
          'STRETCHED_HIGH_END_UP': {
            op: "You were nearly touching the Ceiling — and you crossed it. The Datum moved {deltaDatum_fmt} from your start, lifting from the edge of what the plan supports into territory it currently can't reach. That crossing is a clean signal: you're not stress-testing a margin, you're asking whether the plan's capacity can grow.",
            lv: "The Ceiling marks what the plan's current structure can sustain. The Datum is now {ceilGap_fmt} above it. Closing that gap means adding capital, raising contributions, or extending the runway — whichever your accounts can absorb. Studio can show the most efficient path given where you're starting from. A shorter retirement length is a fourth path — it raises the Ceiling toward {newDatum_fmt} on the same pile, if that horizon is genuine."
          },
          'STRETCHED_STANDARD_UP': {
            op: "You were in Stretched — spending near the Ceiling but not yet at it — and you dragged higher. The Datum moved {deltaDatum_fmt} from your start, pushing toward or past the plan's upper limit. You were already in the range where the plan needs to work hard; this move asks whether it can work harder.",
            lv: "At {newDatum_fmt}, the Datum is {ceilGap_fmt} from the Ceiling. If you've crossed it, the plan can't reach this level without a structural change. If you're still below it, you're testing how thin that margin actually is — Studio can show what happens to that buffer under stress. If you've crossed it, one lever costs nothing: a shorter retirement length raises the Ceiling toward {newDatum_fmt} — real only if the shorter horizon is true."
          },
          'EXPANSIVE_CEILING_SIDE_UP': {
            op: "You were in the upper range of Expansive — the plan supporting spending comfortably above the middle — and you dragged higher. The Datum moved {deltaDatum_fmt} from your start, lifting into Stretched territory or beyond. You're testing whether ambition is available at this spending level, not just whether the plan survives it.",
            lv: "The Datum now sits {ceilGap_fmt} from the Ceiling. At this level, the plan is working near its upper boundary — your sequence-of-returns exposure matters more than it did at your starting point. Studio can show what this spending level looks like under a range of market scenarios, not just the base case."
          },
          'EXPANSIVE_CENTERED_UP': {
            op: "You were in the middle of Expansive — spending balanced, plan running with room above and below — and you moved it up. The Datum shifted {deltaDatum_fmt} from your start, exploring how much of the plan's upper capacity you can reach. This is the clearest version of the \"what if I spent more?\" question.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. You have room to keep testing — but how much room depends on what you're actually carrying in your accounts. Studio can show you the real ceiling given your portfolio, contributions, and income timing."
          },
          'EXPANSIVE_FLOOR_SIDE_UP': {
            op: "You were in the lower range of Expansive — spending modest relative to what the plan supports — and you raised it. The Datum moved {deltaDatum_fmt} from your start, climbing toward the middle of the plan's range. You're not testing the limits yet. You're exploring how much of the capacity the plan already has is available to you.",
            lv: "The Datum is now {ceilGap_fmt} below the Ceiling and {floorGap_fmt} above the Floor. You still have meaningful runway above your current position. Studio can show what your accounts could sustain at higher spending levels — and whether your current portfolio and contribution trajectory is consistent with reaching them."
          },
          'GROUNDED_STABLE_UP': {
            op: "You were near the Floor — spending close to the plan's minimum supportable level — and you raised it. The Datum moved {deltaDatum_fmt} from your start, lifting into Expansive territory. This is a plan discovering capacity: you weren't spending what the plan could carry, and now you're testing how far into that range you want to go.",
            lv: "The Datum has moved above the Floor and now sits {ceilGap_fmt} from the Ceiling. You have substantial room between where you are and the plan's upper limit. Studio can show what your real account structure supports at various points across that range — so you're not guessing at what's available."
          },
          'GROUNDED_TIGHT_UP': {
            op: "You were in the paradox zone — spending so close to the Floor that the plan's minimum and your ask were nearly the same thing — and you raised it. The Datum moved {deltaDatum_fmt} from your start, pulling out of the tight band and into supported territory. This move is the answer to what the plan was waiting for: an ask it can actually distinguish from its own floor.",
            lv: "The Datum is now {floorGap_fmt} above the Floor and {ceilGap_fmt} from the Ceiling. You've moved out of the zone where the margin was essentially zero. The plan has meaningful capacity above where you're sitting — Studio can show you how much and what it would take to use it."
          },
          'ABUNDANT_JUST_BELOW_UP': {
            op: "You were just below the Floor — the plan supporting more than you were asking for — and you raised the Datum. The Datum moved {deltaDatum_fmt} from your start, climbing toward or into the zone the plan was already designed to carry. You're not straining the plan. You're asking it to do what it was built to do.",
            lv: "The Datum is now {floorGap_fmt} from the Floor and {ceilGap_fmt} from the Ceiling. If you're still below the Floor, the plan's minimum capacity still exceeds your ask — you have room to keep raising. Studio can show what the full supported range looks like given your actual accounts."
          },
          'ABUNDANT_WELL_BELOW_UP': {
            op: "You were well below the Floor — spending significantly less than the plan's minimum supportable level — and you raised the Datum substantially. The Datum moved {deltaDatum_fmt} from your start, testing how far up into the plan's range you can reach. The plan has more capacity than your starting Datum suggested. This drag is the first real stress on that capacity.",
            lv: "Even at {newDatum_fmt}, the plan may still have room above where the Datum sits. The question is whether you've crossed the Floor yet — and if so, whether you're still within comfortable range or approaching the Ceiling. Studio can show your exact position in the plan's supported range and what it would take to go further."
          },
          'OVEREXTENDED_STRUCTURAL_DN': {
            op: "You were significantly above the Ceiling — the plan unable to reach your spending level — and you pulled back. The Datum moved {deltaDatum_fmt} from your start, dropping toward or into viable territory. This is the right direction. Whether you've crossed back into a range the plan can support depends on how far you came.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. If you're still above it, a further reduction — or a structural change to the plan — is needed to get to feasibility. If you've crossed below it, you're back in a range the plan can carry. Studio can show exactly where the threshold sits and what it takes to stay below it."
          },
          'OVEREXTENDED_ENTRY_DN': {
            op: "You were just barely over the Ceiling — spending slightly above what the plan currently supports — and you eased back. The Datum moved {deltaDatum_fmt} from your start, dropping toward a range the plan can actually reach. A small reduction from just over the Ceiling is often all it takes to move from broken to workable.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. If you've crossed below it, you're back inside a range the plan supports. Studio can show you what the plan's actual capacity looks like at this spending level — including how much buffer you now have before you'd approach the limit again."
          },
          'STRETCHED_HIGH_END_DN': {
            op: "You were nearly touching the Ceiling from below — spending at the edge of what the plan supports without crossing it — and you eased back. The Datum moved {deltaDatum_fmt} from your start, creating breathing room between your spending and the plan's upper limit. This is a margin move: you're testing how much distance from the Ceiling changes the plan's resilience.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling. That gap is the plan's buffer — the room it has to absorb a bad sequence of returns before your spending becomes unsustainable. Studio can show what that buffer is worth under real stress scenarios, not just the base-case projection."
          },
          'STRETCHED_STANDARD_DN': {
            op: "You were in Stretched — spending near the Ceiling with limited margin — and you lowered the Datum. The Datum moved {deltaDatum_fmt} from your start, moving from a tight range into more comfortable territory. Lower spending in a Stretched plan doesn't just reduce the ask — it rebuilds the plan's ability to handle volatility.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. The middle of Expansive is where the plan runs most freely — you're testing whether this spending level fits there. Studio can show how this Datum holds up under different sequence-of-returns scenarios at your specific account structure."
          },
          'EXPANSIVE_CEILING_SIDE_DN': {
            op: "You were in the upper range of Expansive — spending comfortably but toward the higher end of the plan's supported range — and you lowered it. The Datum moved {deltaDatum_fmt} from your start, shifting toward the middle of what the plan can carry. This is a deliberate move toward the plan's center of gravity.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. Moving down from the upper range increases the plan's resilience without reducing the ask dramatically. Studio can quantify how much additional buffer this Datum position creates under stress."
          },
          'EXPANSIVE_CENTERED_DN': {
            op: "You were in the middle of Expansive — spending balanced, plan running freely — and you lowered the Datum. The Datum moved {deltaDatum_fmt} from your start, dropping toward the lower range of what the plan supports. You're testing what a more conservative ask looks like from a comfortable starting point.",
            lv: "The Datum is now {ceilGap_fmt} from the Ceiling and {floorGap_fmt} above the Floor. At this level, you're asking the plan to carry less than it comfortably can. Studio can show what the gap between this Datum and the plan's full capacity could fund — earlier retirement, a larger legacy, or a stronger stress buffer."
          },
          'EXPANSIVE_FLOOR_SIDE_DN': {
            op: "You were in the lower range of Expansive — spending modestly but within the plan's supported zone — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, dropping toward Grounded territory. You're asking what happens at the conservative end of what the plan can carry.",
            lv: "The Datum is now {floorGap_fmt} above the Floor. You're testing the approach to the plan's minimum — the level at which the Floor and the Datum converge. Studio can show what the surplus between this Datum and the plan's full capacity could be used for, and whether the conservative ask is the right long-term choice."
          },
          'GROUNDED_STABLE_DN': {
            op: "You were near the Floor — spending close to the plan's minimum supportable level — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, approaching or crossing below the Floor. When the ask drops below what the plan needs to run, the plan doesn't fail — it builds surplus. The question is whether that surplus is intentional.",
            lv: "The Datum is now {floorGap_fmt} from the Floor. If you've crossed below it, you're in Abundant territory — the plan's minimum capacity now exceeds your ask. Studio can show what that margin represents: how much earlier you could retire, how much larger a legacy the plan supports, or how much stress resilience you're building."
          },
          'GROUNDED_TIGHT_DN': {
            op: "You were in the paradox zone — spending so close to the Floor that the plan's minimum and your ask were nearly identical — and you lowered the Datum below it. The Datum moved {deltaDatum_fmt} from your start, crossing from the tightest possible margin into Abundant territory. This is a strong conservative signal: you're asking for less than the plan's minimum output.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan was already designed to carry more than you're asking for. Studio can show what that surplus could fund — and help you decide whether this level of conservatism is a deliberate choice or a starting point worth revisiting."
          },
          'ABUNDANT_JUST_BELOW_DN': {
            op: "You were just below the Floor — the plan already supporting more than your ask — and you lowered the Datum further. The Datum moved {deltaDatum_fmt} from your start, pushing deeper into Abundant territory. You're asking less than the plan's minimum. This move makes that gap wider.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan has meaningful unused capacity above this spending level. Studio can show what the gap between {newDatum_fmt} and the plan's full capacity actually represents — in years, in legacy, or in resilience."
          },
          'ABUNDANT_WELL_BELOW_DN': {
            op: "You were already well below the Floor — spending significantly less than the plan's minimum supportable level — and you lowered further. The Datum moved {deltaDatum_fmt} from your start, approaching the drag floor at half your original pin. This is the most conservative ask the Sketch can model. You're testing what the plan looks like when the spending question is set aside almost entirely.",
            lv: "The Datum is now {floorGap_fmt} below the Floor. The plan has substantial unused capacity above this level. Studio can show what that full capacity represents — and whether the conservative anchor is a deliberate structural choice or a number worth reconsidering."
          }
        };

        // ── L1 table: 102 cells (entry × direction × landing) ─────────────────────
        var _eL1 = {
          'OVEREXTENDED_STRUCTURAL_UP_OVEREXTENDED_STRUCTURAL': { op: "⚠️ You were significantly above the Ceiling — already in Overextended territory — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_STRUCTURAL_DN_OVEREXTENDED_STRUCTURAL': { op: "⚠️ You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_STRUCTURAL_DN_OVEREXTENDED_ENTRY':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_STRUCTURAL_DN_STRETCHED_HIGH_END':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'OVEREXTENDED_STRUCTURAL_DN_STRETCHED_STANDARD':      { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'OVEREXTENDED_STRUCTURAL_DN_EXPANSIVE_CEILING_SIDE':  { op: "You were significantly above the Ceiling — already in Overextended territory — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'OVEREXTENDED_ENTRY_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were just over the Ceiling — on the edge of feasibility — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'OVEREXTENDED_ENTRY_UP_OVEREXTENDED_ENTRY':           { op: "You were just over the Ceiling — on the edge of feasibility — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_ENTRY_DN_OVEREXTENDED_ENTRY':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'OVEREXTENDED_ENTRY_DN_STRETCHED_HIGH_END':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'OVEREXTENDED_ENTRY_DN_STRETCHED_STANDARD':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'OVEREXTENDED_ENTRY_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'OVEREXTENDED_ENTRY_DN_EXPANSIVE_CENTERED':           { op: "You were just over the Ceiling — on the edge of feasibility — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_HIGH_END_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'STRETCHED_HIGH_END_UP_OVEREXTENDED_ENTRY':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'STRETCHED_HIGH_END_UP_STRETCHED_HIGH_END':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_HIGH_END_DN_STRETCHED_HIGH_END':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_HIGH_END_DN_STRETCHED_STANDARD':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_CENTERED':           { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_HIGH_END_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were nearly touching the Ceiling from below — at the plan's upper limit — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'STRETCHED_STANDARD_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'STRETCHED_STANDARD_UP_OVEREXTENDED_ENTRY':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'STRETCHED_STANDARD_UP_STRETCHED_HIGH_END':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'STRETCHED_STANDARD_UP_STRETCHED_STANDARD':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_STANDARD_DN_STRETCHED_STANDARD':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_CEILING_SIDE':       { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_CENTERED':           { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'STRETCHED_STANDARD_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'STRETCHED_STANDARD_DN_GROUNDED_STABLE':              { op: "You were in Stretched territory — spending near the Ceiling with limited buffer — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CEILING_SIDE_UP_OVEREXTENDED_STRUCTURAL':  { op: "⚠️ You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_CEILING_SIDE_UP_OVEREXTENDED_ENTRY':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_CEILING_SIDE_UP_STRETCHED_HIGH_END':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_CEILING_SIDE_UP_STRETCHED_STANDARD':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_CEILING_SIDE_UP_EXPANSIVE_CEILING_SIDE':   { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_CEILING_SIDE':   { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_CENTERED':       { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CEILING_SIDE_DN_EXPANSIVE_FLOOR_SIDE':     { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_CEILING_SIDE_DN_GROUNDED_STABLE':          { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CEILING_SIDE_DN_GROUNDED_TIGHT':           { op: "You were in the upper range of Expansive — comfortable, but toward the higher end — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_CENTERED_UP_OVEREXTENDED_STRUCTURAL':      { op: "⚠️ You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_CENTERED_UP_OVEREXTENDED_ENTRY':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_CENTERED_UP_STRETCHED_HIGH_END':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_CENTERED_UP_STRETCHED_STANDARD':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_CENTERED_UP_EXPANSIVE_CEILING_SIDE':       { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_CENTERED_UP_EXPANSIVE_CENTERED':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CENTERED_DN_EXPANSIVE_CENTERED':           { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_CENTERED_DN_EXPANSIVE_FLOOR_SIDE':         { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_CENTERED_DN_GROUNDED_STABLE':              { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_CENTERED_DN_GROUNDED_TIGHT':               { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_CENTERED_DN_ABUNDANT_JUST_BELOW':          { op: "You were in the middle of Expansive — balanced, with room above and below — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'EXPANSIVE_FLOOR_SIDE_UP_OVEREXTENDED_STRUCTURAL':    { op: "⚠️ You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Structural. The Datum landed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this level the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap." },
          'EXPANSIVE_FLOOR_SIDE_UP_OVEREXTENDED_ENTRY':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'EXPANSIVE_FLOOR_SIDE_UP_STRETCHED_HIGH_END':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'EXPANSIVE_FLOOR_SIDE_UP_STRETCHED_STANDARD':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_CEILING_SIDE':     { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_CENTERED':         { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'EXPANSIVE_FLOOR_SIDE_UP_EXPANSIVE_FLOOR_SIDE':       { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_FLOOR_SIDE_DN_EXPANSIVE_FLOOR_SIDE':       { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'EXPANSIVE_FLOOR_SIDE_DN_GROUNDED_STABLE':            { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'EXPANSIVE_FLOOR_SIDE_DN_GROUNDED_TIGHT':             { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'EXPANSIVE_FLOOR_SIDE_DN_ABUNDANT_JUST_BELOW':        { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'EXPANSIVE_FLOOR_SIDE_DN_ABUNDANT_WELL_BELOW':        { op: "You were in the lower range of Expansive — spending modestly relative to plan capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'GROUNDED_STABLE_UP_OVEREXTENDED_ENTRY':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Overextended Entry. The Datum landed just above the Ceiling — {ceilGap_fmt} past the plan's current upper limit. This is on the threshold of what the plan can structurally support. Studio can show whether the gap closes with a portfolio adjustment, a contributions increase, or a small timing change — or whether it's signaling something larger about how this Shape was built." },
          'GROUNDED_STABLE_UP_STRETCHED_HIGH_END':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'GROUNDED_STABLE_UP_STRETCHED_STANDARD':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'GROUNDED_STABLE_UP_EXPANSIVE_CEILING_SIDE':          { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'GROUNDED_STABLE_UP_EXPANSIVE_CENTERED':              { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'GROUNDED_STABLE_UP_EXPANSIVE_FLOOR_SIDE':            { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'GROUNDED_STABLE_UP_GROUNDED_STABLE':                 { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_STABLE_DN_GROUNDED_STABLE':                 { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_STABLE_DN_GROUNDED_TIGHT':                  { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_STABLE_DN_ABUNDANT_JUST_BELOW':             { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'GROUNDED_STABLE_DN_ABUNDANT_WELL_BELOW':             { op: "You were in Grounded territory — spending near the Floor, well inside the plan's supported range — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'GROUNDED_TIGHT_UP_STRETCHED_HIGH_END':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Stretched High End. The Datum landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan carries this, but with little room for a run of poor returns. Studio can show what that buffer is worth under stress." },
          'GROUNDED_TIGHT_UP_STRETCHED_STANDARD':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_CEILING_SIDE':           { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_CENTERED':               { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'GROUNDED_TIGHT_UP_EXPANSIVE_FLOOR_SIDE':             { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'GROUNDED_TIGHT_UP_GROUNDED_STABLE':                  { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'GROUNDED_TIGHT_UP_GROUNDED_TIGHT':                   { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_TIGHT_DN_GROUNDED_TIGHT':                   { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'GROUNDED_TIGHT_DN_ABUNDANT_JUST_BELOW':              { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'GROUNDED_TIGHT_DN_ABUNDANT_WELL_BELOW':              { op: "You were in the paradox zone — spending nearly equal to the plan's minimum Floor — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_JUST_BELOW_UP_STRETCHED_STANDARD':          { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_CEILING_SIDE':      { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_CENTERED':          { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'ABUNDANT_JUST_BELOW_UP_EXPANSIVE_FLOOR_SIDE':        { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'ABUNDANT_JUST_BELOW_UP_GROUNDED_STABLE':             { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'ABUNDANT_JUST_BELOW_UP_GROUNDED_TIGHT':              { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'ABUNDANT_JUST_BELOW_UP_ABUNDANT_JUST_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_JUST_BELOW_DN_ABUNDANT_JUST_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_JUST_BELOW_DN_ABUNDANT_WELL_BELOW':         { op: "You were just below the Floor — the plan already supporting more than you were asking for — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_WELL_BELOW_UP_STRETCHED_STANDARD':          { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Stretched Standard. The Datum landed in Stretched territory — supported, but with the Ceiling close. Sequence-of-returns risk matters more here than in the middle of the range. Studio can model this across realistic market scenarios." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_CEILING_SIDE':      { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Ceiling Side. The Datum landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan runs freely at this level. Studio can show whether there's room to go further." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_CENTERED':          { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Centered. The Datum landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely. Studio can confirm it holds under real account structure." },
          'ABUNDANT_WELL_BELOW_UP_EXPANSIVE_FLOOR_SIDE':        { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Expansive Floor Side. The Datum landed in the lower range of Expansive — {floorGap_fmt} above the Floor, {ceilGap_fmt} from the Ceiling. The plan supports this comfortably. Studio can show what the gap to full capacity could fund." },
          'ABUNDANT_WELL_BELOW_UP_GROUNDED_STABLE':             { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Stable. The Datum landed near the Floor — {floorGap_fmt} above the plan's lower boundary. The plan supports this, but the margin is thin. Studio can show how this holds if returns come in below the base case." },
          'ABUNDANT_WELL_BELOW_UP_GROUNDED_TIGHT':              { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Grounded Tight. The Datum landed in the paradox zone — spending nearly equal to the Floor. The plan's minimum and your ask are essentially the same. Studio can show what a small move in either direction does to that margin." },
          'ABUNDANT_WELL_BELOW_UP_ABUNDANT_JUST_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Just Below. The Datum landed just below the Floor — the plan's minimum now exceeds what you're asking for by {floorGap_fmt}. Studio can show what that surplus could fund: earlier retirement, larger legacy, or stronger resilience." },
          'ABUNDANT_WELL_BELOW_UP_ABUNDANT_WELL_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you raised the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." },
          'ABUNDANT_WELL_BELOW_DN_ABUNDANT_WELL_BELOW':         { op: "You were well below the Floor — spending significantly less than the plan's minimum capacity — and you lowered the Datum {deltaDatum_fmt}, moving into Abundant Well Below. The plan has substantial room above this Datum. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience." }
        };

        /* DORMANT — Round 13: _eL2 table retired. L2 distinct angles absorbed into _eL1. Preserve for Phase 2.7 resurrection option.
        // ── L2 table: 11 cells (landing sub-zone) ────────────────────────────────
        var _eL2 = {
          'OVEREXTENDED_STRUCTURAL': { mod: "The Datum has crossed significantly above the Ceiling — {ceilGap_fmt} past the plan's upper limit. At this spending level, the plan's current structure can't deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap and bring {newDatum_fmt} back into a range the plan can actually reach." },
          'OVEREXTENDED_ENTRY':      { mod: "The Datum sits just above the Ceiling — {ceilGap_fmt} past the plan's current limit. The gap is small enough that a targeted change could close it. Studio can show the cost of closing it at your account structure — and whether it's a lever move or a plan revision." },
          'STRETCHED_HIGH_END':      { mod: "The Datum has landed nearly at the Ceiling — {ceilGap_fmt} of margin remaining. The plan can carry {newDatum_fmt}, but with very little room to absorb a bad sequence of returns. Studio can show what that thin margin looks like under stress and whether it's a deliberate trade or a risk worth managing differently." },
          'STRETCHED_STANDARD':      { mod: "The Datum has landed in the Stretched zone — supported by the plan, but with limited buffer between spending and the Ceiling. There's {ceilGap_fmt} to the upper limit. The plan works here, but sequence-of-returns risk matters more than it does in the middle of the range. Studio can show how this spending level holds up under a range of market scenarios at your specific account structure." },
          'EXPANSIVE_CEILING_SIDE':  { mod: "The Datum has landed in the upper range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan supports this spending level with room to run. Studio can show how that upper-range position performs across different sequences of returns — and whether there's more capacity available." },
          'EXPANSIVE_CENTERED':      { mod: "The Datum has landed in the middle of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. This is where the plan runs most freely: enough distance from both limits to handle normal volatility without structural pressure. Studio can confirm this is the right range for your accounts and income timing." },
          'EXPANSIVE_FLOOR_SIDE':    { mod: "The Datum has landed in the lower range of Expansive — {ceilGap_fmt} from the Ceiling, {floorGap_fmt} above the Floor. The plan supports this level comfortably. You're asking less than you could, which means there's room above if circumstances change. Studio can show what the gap between {newDatum_fmt} and the plan's upper capacity represents." },
          'GROUNDED_STABLE':         { mod: "The Datum has landed near the Floor — {floorGap_fmt} above the plan's minimum. The plan supports this spending level, but the margin to the lower boundary is thin. Studio can show how close this Datum is to the Floor in real terms, and what happens if portfolio returns come in below the base case." },
          'GROUNDED_TIGHT':          { mod: "The Datum has landed in the paradox zone — {floorGap_fmt} from the Floor, nearly identical to the plan's minimum. The plan supports this level, but barely. There's almost no margin between what you're asking and the absolute lower bound. Studio can show what a small change in either direction does to that margin — and whether staying this close to the Floor is intentional." },
          'ABUNDANT_JUST_BELOW':     { mod: "The Datum now sits just below the Floor — the plan's minimum capacity exceeds what you're asking for by {floorGap_fmt}. The plan has surplus above this spending level. Studio can show what that margin could fund: an earlier retirement date, a larger legacy target, or a stronger stress buffer against poor market sequences." },
          'ABUNDANT_WELL_BELOW':     { mod: "The Datum now sits well below the Floor — the plan's minimum capacity exceeds your ask by {floorGap_fmt}. There's substantial unused capacity in the plan above this spending level. Studio can show what that surplus represents in concrete terms — years, legacy, or resilience — and help you decide whether this level of conservatism is a choice or a starting point." }
        };
        */

        // ── Router + render (2 cards: L1 opening, L2 landing) ───────────────────
        var _eL1Cell = _eL1[_eL1Key] || _eL1Fallback[_eL1FbKey] || _eL1Fallback['EXPANSIVE_CENTERED_' + _eDir];
        // Round 13: L2 render disabled — L1 absorbed distinct angles. Re-enable for Phase 2.7 resurrection.
        // var _eL2Cell = _eL2[_eL2Key] || _eL2['EXPANSIVE_CENTERED'];
        html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + _eEntryName,
          _eFill(_eL1Cell.op), 'datum', r.datumTarget);
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the required capital for this Datum adjusts — the designed-in balance carries part of the load.'); }
        // G56/G57 horizon studio bridge for OE landing states
        if (_eLandName === 'OVEREXTENDED') {
          var _eBridge = _eLandSz === 'STRUCTURAL'
            ? '⚠️ The Datum has crossed significantly above the Ceiling — {ceilGap_fmt} past the plan\'s upper limit. At this spending level, the plan\'s current structure can\'t deliver. Studio can identify the most efficient structural change — portfolio, contributions, or timing — to close that gap and bring {newDatum_fmt} back into a range the plan can actually reach. One lever needs no new capital — a shorter retirement length lifts the Ceiling toward {newDatum_fmt} on the same pile, honest only if that horizon is genuine.'
            : 'The Datum sits just above the Ceiling — {ceilGap_fmt} past the plan\'s current limit. The gap is small enough that a targeted change could close it. Studio can show the cost of closing it at your account structure — and whether it\'s a lever move or a plan revision. A shorter retirement length is one such lever — it raises the Ceiling toward {newDatum_fmt} without new capital, if the horizon truly is shorter.';
          html += studioCTA(_eFill(_eBridge));
        }
        // Lever suggestion (H29-H32) for fallback entries
        if (_eL1Cell.lv) {
          html += studioCTA(_eFill(_eL1Cell.lv));
        }
        // html += item('req-item-datum', _eLandClr, _eLandName + ' — LANDING',
        //   _eFill(_eL2Cell.mod), null, null);
        return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        return;
      }

      // ── Block D: Y=0 retire today ────────────────────────────────────
      if (r.block === 'D') {
        // Framing D: Y=0 → gfDatum_spec=1, C2=0; portfolio top-up only (spec §7 R97)
        if (Math.abs(dd) > 0.5) {
          var _C1D0 = DATUM_SUPPORT_RATE; // gfDatum=(1.045)^0=1
          var _ddM0 = dd / 1000;
          var _reqDatP0 = _C1D0 > 0 ? Math.max(_ddM0 / _C1D0, 0) : 0;
          var _reqCeilP0 = r.reqP_M || 0;
          var _dispP0 = Math.max(_reqCeilP0, _reqDatP0);
          var _eps0 = DRIVER_TIE_EPSILON * Math.max(_reqDatP0, _reqCeilP0, 0.001);
          var _datDrv0 = _reqDatP0 - _reqCeilP0 > _eps0;
          var _tied0   = Math.abs(_reqDatP0 - _reqCeilP0) <= _eps0;
          var _cp0 = _tied0
            ? 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Ceiling and Datum are pulling together — both need the same portfolio at this rate.'
            : _datDrv0
              ? 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Datum spending is the line driving this number — the Ceiling sits within the same portfolio.'
              : 'Add ' + fmtPort(_dispP0) + ' to your starting balance. Your Ceiling is setting this amount — your Datum sits comfortably within reach.';
          html += headCard('Retirement today. Portfolio is the only lever.',
            'Your Datum also moved. This number is the larger of what the Ceiling needs and what your Datum needs.');
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO', _cp0, 'capital', (_sNorm.portfolioVol + _dispP0), r.datumTarget);
          html += studioCTA('Studio can model whether your accounts can support spending at ' + fmtKyr(r.datumTarget) + ' within this shape.');
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          return;
        }
        html += headCard(
          'You\'re modeling retirement today. Contributions don\'t factor in — your portfolio is the only lever.',
          'At retirement, the ceiling is simply your portfolio times the withdrawal rate. To reach ' + fmtKyr(r.ceilTarget) + ', you\'d need a starting balance of ' + fmtPort(r.reqP_M) + '.'
        );
        if (r.dP_M <= 0) {
          html += item('req-item-ceil', 'var(--gold)', 'PORTFOLIO — SURPLUS',
            'That\'s ' + fmtPort(Math.abs(r.dP_M)) + ' less than your current balance. Your floor would sit at ' + fmtKyr(r.impliedFloor_k) + '.',
            null, null);
        } else {
          html += item('req-item-ceil', 'var(--gold)', 'PORTFOLIO',
            'That\'s ' + fmtPort(r.dP_M) + ' more than your current balance. Your floor would sit at ' + fmtKyr(r.impliedFloor_k) + '.',
            'capital', (_sNorm.portfolioVol + r.dP_M));
        }
        html += studioCTA('Studio can model whether your actual account structure, Social Security timing, and income sources support spending at this level — without requiring additional portfolio growth.');
        return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        return;
      }

      // ── Block C: dual drag — Cramer solve ────────────────────────────
      if (r.block === 'C') {
        if (r.hardStop) {
          var _cStop = '';
          if (r.hardStop.type === 'floor_above_ceil') {
            _cStop = 'The floor can\'t sit above the ceiling — that shape doesn\'t exist. Pull the ceiling higher or the floor lower.';
          } else if (r.hardStop.type === 'degenerate') {
            _cStop = 'The shape you\'ve drawn has ceiling and floor targets that move in the same ratio as the levers — there\'s no unique solution. Adjust one endpoint slightly and try again.';
          } else if (r.hardStop.type === 'negative_portfolio') {
            _cStop = 'This combination would require a negative portfolio — more owed than owned — so no real plan can reach it. Bring the Floor and Ceiling closer to today\'s Shape or explore a less extreme mix in Studio.';
          }
          html += warn('req-item-ceil', 'var(--danger-red)', 'TARGET NOT REACHABLE', _cStop);
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          return;
        }
        // Framing D: hasDatum branch — Cramer-preserve + portfolio top-up (spec §12 R227)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling (suppress Path Options)
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          var _YC = _sNorm.yearsToGrow || 0;
          var _gfC = _YC > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YC) : 1;
          var _C1C = _gfC * DATUM_SUPPORT_RATE;
          var _C2C = _YC > 0 ? DATUM_SUPPORT_RATE * ((_gfC - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMC = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwFlrC = r.datumTarget <= r.floorTarget + 0.5;
          // Cramer-preserve: compute how much Datum support the existing Cramer pair already provides
          var _datSupC = (_C1C * r.dP_M) + (_C2C * (r.dK_dollars / 1e6));
          var _shortC  = _datBlwFlrC ? 0 : Math.max(_ddMC - _datSupC, 0);
          var _dPdispC = r.dP_M + (_C1C > 0 ? _shortC / _C1C : 0); // top-up portfolio; dK unchanged
          // comboWarnP extension: check post-top-up portfolio
          if (r.comboWarnK || r.comboWarnP || _dPdispC > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-ceil', 'var(--gold)', 'OUTSIDE PRACTICAL RANGE',
              'Hitting all three targets at once would need lever moves beyond practical ranges. Ease one end of the Shape, or use Studio to test a version that fits your real accounts.');
            html += studioCTA('Studio can test whether this specific shape is achievable given your actual account types, tax treatment, and income timing — and show the sequencing that gets you closest.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          // Driving line: did Datum require the top-up, or was the Cramer pair sufficient?
          var _datDrvC = _shortC > 0.001;
          var _dKdispC = r.dK_dollars;
          var _cDirC   = _dKdispC >= 0 ? 'increase' : 'reduce';
          var _cBodyC_FD = 'To reach this shape: add ' + fmtPort(_dPdispC) + ' to your balance and '
            + _cDirC + ' contributions by ' + fmtContrib(_dKdispC) + '/year. ';
          if (_datDrvC) {
            _cBodyC_FD += 'You moved the Ceiling to ' + fmtKyr(r.ceilTarget) + ', the Floor to ' + fmtKyr(r.floorTarget) + ', and your Datum to ' + fmtKyr(r.datumTarget) + '. Your Datum spending is the line driving the portfolio number — the Ceiling and Floor are carried by the contribution lever.';
          } else if (Math.abs(dc) >= Math.abs(df)) {
            _cBodyC_FD += 'Your Ceiling move is what is setting this combination — your Datum has moved to ' + fmtKyr(r.datumTarget) + ' and is carried within the Cramer solution without additional levers.';
          } else {
            _cBodyC_FD += 'Your Floor move is the most demanding line — your Datum has moved to ' + fmtKyr(r.datumTarget) + ' and is carried within the Cramer solution without additional levers.';
          }
          if (_datBlwFlrC) {
            _cBodyC_FD += ' Your Datum sits at or below your Floor — the plan supports your spending target without additional levers.';
          }
          html += headCard('You\'ve set a specific shape with all three lines moved. Here\'s the lever combination.',
            'The Cramer system solves Ceiling and Floor together. Any Datum shortfall adds a portfolio-only top-up — contributions are unchanged.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the combination below reflects what\'s still needed — both levers shrink because part of the gap is already designed in.'); }
          html += itemD('req-item-ceil', 'var(--gold)', 'COMBINATION: PORTFOLIO + CONTRIBUTIONS', _cBodyC_FD, 'capital', (_sNorm.portfolioVol + _dPdispC), r.datumTarget);
          (function() {
            var _h4Curr   = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.ceilSpend <= 0 || pts.floorSpend <= 0) return;
            var _h4ScReqCeil = r.ceilTarget  * _h4ScCurr / pts.ceilSpend;
            var _h4ScReqFlr  = r.floorTarget * _h4ScCurr / pts.floorSpend;
            var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqFlr);
            if (pts.datumSpend > 0) {
              var _h4ScReqDat = r.datumTarget * _h4ScCurr / pts.datumSpend;
              _h4ScReq = Math.max(_h4ScReq, _h4ScReqDat);
            }
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4Body = 'Plan through ' + _h4C + ' instead of ' + _h4PlanOld + '. A single shorter retirement holds both the Ceiling and the Floor you\'ve pulled, on the same balance — no new capital, no extra working years. Your Datum move is included. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        }
        if (r.comboWarnK || r.comboWarnP) {
          html += warn('req-item-ceil', 'var(--gold)', 'OUTSIDE PRACTICAL RANGE',
            'Hitting both targets at once would need lever moves beyond practical ranges for capital, savings, or timing. Ease one end of the Shape, or — if your retirement is genuinely shorter — a shorter retirement length raises the safe draw and can close part of the gap without new capital. Studio can test a version that fits your real accounts.');
          html += studioCTA('Studio can test whether this specific shape is achievable given your actual account types, tax treatment, and income timing — and show the sequencing that gets you closest.');
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          return;
        }
        html += headCard(
          'You\'ve set a specific shape. Here\'s the lever combination that gets you there.',
          'With both Floor and Ceiling pulled, this design needs portfolio and contribution changes working together; neither lever on its own can reach this target combo.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, the combination below reflects what\'s still needed — both levers shrink because part of the gap is already designed in.'); }
        var _cBodyC = '';
        if (r.dP_M >= 0 && r.dK_dollars >= 0) {
          _cBodyC = 'To reach this shape: add ' + fmtPort(r.dP_M) + ' to your starting balance and ' + fmtContrib(r.dK_dollars) + ' to contributions. These two levers together solve for your ceiling and floor simultaneously.';
        } else if (r.dP_M >= 0 && r.dK_dollars < 0) {
          _cBodyC = 'To reach this shape: add ' + fmtPort(r.dP_M) + ' to your balance and reduce contributions by ' + fmtContrib(r.dK_dollars) + '. The specific shape you\'ve drawn requires less contribution weight and more lump-sum balance.';
        } else {
          _cBodyC = 'This shape requires a lower starting balance (' + fmtPort(Math.abs(r.dP_M)) + ' less) and higher contributions (' + fmtContrib(r.dK_dollars) + ' more). You\'re trading lump-sum for ongoing input.';
        }
        _cBodyC += ' <em style="color:rgba(255,255,255,0.5);font-size:11px;">Note: retirement age is held constant in this solve. If either lever result seems impractical, extending retirement by even one year materially changes what\'s feasible.</em>';
        var _cReqType = 'capital';
        var _cReqVal  = _sNorm.portfolioVol + r.dP_M;
        html += item('req-item-ceil', 'var(--gold)', 'COMBINATION: PORTFOLIO + CONTRIBUTIONS', _cBodyC, _cReqType, _cReqVal);
        // Surface D: cross-route Block E datum analysis when datum also dragged alongside Block C
        if (Math.abs(dd) > 0.5) {
          var _cdE = DatumShape.solveInverse(0, 0, dd, pts, _sNorm);
          if (_cdE.block === 'E') {
            var _cdEState = getShapeStateObj({ ceilSpend: _cdE.ceilTarget, floorSpend: _cdE.floorTarget, datumSpend: _cdE.datumTarget });
            var _cdEName  = _cdEState ? _cdEState.name : 'EXPANSIVE';
            html += '<div class="req-item" style="border-left-color:rgba(255,255,255,0.08);background:none;margin:8px 0 2px;padding:3px 0;">'
              + '<div class="req-item-body" style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">DATUM SHIFT</div></div>';
            html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + _cdEName,
              (_cdEState && _cdEState.key === 'overextended' && _cdEState.subZone === 'STRUCTURAL' ? '⚠️ ' : '') + 'Your Datum has also moved to ' + fmtKyr(_cdE.datumTarget) + '. With the Shape set by the Floor and Ceiling above, this Datum position is ' + (_cdEName.charAt(0).toUpperCase() + _cdEName.slice(1).toLowerCase()) + '.',
              null, null);
            html += studioCTA('Studio can test whether your accounts and income structure can actually support spending at ' + fmtKyr(_cdE.datumTarget) + ' within this designed Shape — and what sequencing makes it most tax-efficient.');
          }
        } else {
          // Workstream Y — Block C × Datum context (Datum static; |dd| ≤ 0.5)
          var _wyDatObj_C  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: pts.datumSpend });
          var _wyDatZone_C = _wyDatObj_C ? _wyDatObj_C.key : 'expansive';
          var _nCf_C = fmtKyr(r.ceilTarget);
          var _nFf_C = fmtKyr(r.floorTarget);
          var _pDf_C = fmtKyr(pts.datumSpend);
          var _cGf_C = fmtKyr(Math.abs(r.ceilTarget - pts.datumSpend));
          var _fGf_C = fmtKyr(Math.abs(pts.datumSpend - r.floorTarget));
          var _wyCtx_C = '';
          if (_wyDatZone_C === 'overextended') {
            _wyCtx_C = '⚠️ Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now above the new Ceiling. The Shape was repositioned, but the Datum sits outside it. The plan can\'t deliver at this spending level under the new geometry. Studio can identify what structural change closes the gap most efficiently. Shortening the retirement length raises the Ceiling toward ' + _pDf_C + ' on the same pile — a real option if that horizon is genuine, not just a way to make the number work.';
          } else if (_wyDatZone_C === 'stretched') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _cGf_C + ' from the upper limit. The Datum is inside the new Shape but near its top. The plan carries this spending level, though with limited buffer. Studio can show how that thin margin behaves under real market scenarios at your account structure.';
          } else if (_wyDatZone_C === 'expansive') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' sits ' + _cGf_C + ' below the Ceiling and ' + _fGf_C + ' above the Floor. The new Shape positions the Datum comfortably in the middle — neither edge is close. Studio can show how this balanced position holds across a range of market scenarios.';
          } else if (_wyDatZone_C === 'grounded') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _fGf_C + ' above the new Floor. The Datum is sitting near the lower boundary of the new Shape. The plan supports it, but the lower margin is thin. Studio can show what happens to that margin when returns come in below the base case.';
          } else if (_wyDatZone_C === 'abundant') {
            _wyCtx_C = 'Both edges moved — Ceiling to ' + _nCf_C + ', Floor to ' + _nFf_C + ' — and your spending at ' + _pDf_C + ' is now ' + _fGf_C + ' below the new Floor. The new Shape\'s lower boundary has risen above the Datum. The plan\'s minimum capacity now exceeds what you\'re asking for. Studio can show what that surplus represents in concrete terms — years, legacy, or resilience.';
          }
          if (_wyCtx_C) {
            html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_C ? _wyDatObj_C.name : 'EXPANSIVE'), _wyCtx_C, null, null);
          }
        }
        (function() {
          var _h4Curr   = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          if (pts.ceilSpend <= 0 || pts.floorSpend <= 0) return;
          var _h4ScReqCeil = r.ceilTarget  * _h4ScCurr / pts.ceilSpend;
          var _h4ScReqFlr  = r.floorTarget * _h4ScCurr / pts.floorSpend;
          var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqFlr);
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4PlanOld = _sNorm.planThroughAge || 93;
          var _h4Body = 'Plan through ' + _h4C + ' instead of ' + _h4PlanOld + '. A single shorter retirement holds both the Ceiling and the Floor you\'ve pulled, on the same balance — no new capital, no extra working years. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
          if (Math.abs(_h4Delta) > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
        })();
        html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
        return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        return;
      }

      // ── Block A: ceiling-only drag ────────────────────────────────────
      if (r.block === 'A') {
        // Framing D: Datum + Ceiling — Scenario 2 (spec §10 R148-R158)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          var _YA = _sNorm.yearsToGrow || 0;
          var _gfA = _YA > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YA) : 1;
          var _C1A = _gfA * DATUM_SUPPORT_RATE;
          var _C2A = _YA > 0 ? DATUM_SUPPORT_RATE * ((_gfA - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMA = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwA = r.datumTarget <= r.floorTarget + 0.5;
          var _reqDatPA = _datBlwA ? 0 : Math.max(_ddMA / _C1A, 0);
          var _reqDatKA = (_datBlwA || _C2A === 0) ? 0 : Math.max(_ddMA / _C2A * 1e6, 0);
          // MAX-over-clearance per path
          var _pthPA = r.paths && r.paths[0];
          var _pthKA = r.paths && r.paths[1];
          var _pthRA = r.paths && r.paths[2];
          var _bndPA = (_pthPA && _pthPA.dP_M != null) ? _pthPA.dP_M : 0;
          var _bndKA = (_pthKA && _pthKA.dK_dollars != null) ? _pthKA.dK_dollars : 0;
          var _dispPA = Math.max(_bndPA, _reqDatPA);
          var _dispKA = Math.max(_bndKA, _reqDatKA);
          // PATH 3: MAX(boundary age, datum age)
          var _raDA = _d2BinarySearchYDatum(r.datumTarget / 1000, _sNorm);
          var _raBndA = (_pthRA && _pthRA.reqRetireAge) ? _pthRA.reqRetireAge : _sNorm.activationAge;
          var _raDispA = Math.max(_raBndA, _raDA);
          var _dYA = _raDispA - _sNorm.activationAge;
          // Driving line (portfolio path as primary indicator)
          var _epsA = DRIVER_TIE_EPSILON * Math.max(_reqDatPA, _bndPA, 0.001);
          var _datDrvA = _reqDatPA - _bndPA > _epsA;
          var _tiedA   = Math.abs(_reqDatPA - _bndPA) <= _epsA;
          // Guard 3: all zero
          if (_dispPA <= 0 && _dispKA <= 0 && _dYA <= 0) {
            html += headCard('NO ADDITIONAL LEVERS NEEDED',
              'You moved your Shape in a direction your current plan already supports. No portfolio addition, contribution increase, or retirement delay is needed.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          html += headCard('You pulled the Ceiling and moved your Datum. Here\'s what it takes to hold both.',
            'Each path shows the larger of what the Ceiling needs and what your Datum needs.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
          // PATH 1 — PORTFOLIO
          var _p1A = _tiedA
            ? 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Ceiling and Datum are pulling together — both need the same portfolio addition.'
            : _datDrvA
              ? 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Datum target is the line driving this number — the Ceiling move is already within reach of the same portfolio.'
              : 'Add ' + fmtPort(_dispPA) + ' to your starting balance. Your Ceiling move is what is setting this number — your Datum move is included but sits within reach.';
          if (_datBlwA) _p1A += ' Your Datum sits at or below your Floor — the plan supports your spending target without extra portfolio.';
          if (_dispPA > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO',
              'Reaching these targets via portfolio alone requires more than twice your current balance. A split across levers is more practical.');
          } else {
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 1 &mdash; PORTFOLIO', _p1A, 'capital', (_sNorm.portfolioVol + _dispPA), r.datumTarget);
          }
          // PATH 2 — CONTRIBUTIONS
          var _epsKA = DRIVER_TIE_EPSILON * Math.max(_reqDatKA, _bndKA, 0.001);
          var _datDrvKA = _reqDatKA - _bndKA > _epsKA;
          var _p2A = _datDrvKA
            ? 'Add ' + fmtContrib(_dispKA) + ' to your annual contributions. The contribution lever has to support both the Ceiling pull and your Datum target — your Datum is the line setting how much.'
            : 'Add ' + fmtContrib(_dispKA) + ' to your annual contributions. This lifts your Ceiling — your Datum target is included and sits within reach of the same amount.';
          if (Math.abs(_dispKA) > 50000) {
            html += warn('req-item-ceil', 'var(--gold)', 'PATH 2 &mdash; CONTRIBUTIONS',
              'Reaching these targets via contributions alone would require ' + fmtContrib(_dispKA) + ' — beyond a practical single-lever move.');
          } else {
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 2 &mdash; CONTRIBUTIONS', _p2A, 'contrib', (_sNorm.annualContrib + _dispKA), r.datumTarget);
          }
          // PATH 3 — RETIRE AGE
          var _datDrvRA = _raDA > _raBndA;
          var _p3A = _datDrvRA
            ? 'Delay retirement by ' + fmtYrs(_dYA) + '. Time amplifies every input — each additional year raises both your Ceiling and your Datum support. Your Datum spending is what is setting the delay needed.'
            : 'Delay retirement by ' + fmtYrs(_dYA) + '. Time amplifies every other input — but it\'s non-linear. Each additional year past ' + _sNorm.activationAge + ' yields a different ceiling gain. Your Datum move is included.';
          html += itemD('req-item-ceil', 'var(--gold)', 'PATH 3 &mdash; RETIRE AGE', _p3A, 'retire', _raDispA, r.datumTarget);
          (function() {
            var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.ceilSpend <= 0 || pts.datumSpend <= 0) return;
            var _h4ScReqCeil = r.ceilTarget * _h4ScCurr / pts.ceilSpend;
            var _h4ScReqDat  = r.datumTarget * _h4ScCurr / pts.datumSpend;
            var _h4ScReq = Math.max(_h4ScReqCeil, _h4ScReqDat);
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4DatDrv = _h4ScReqDat >= _h4ScReqCeil - 0.001;
            var _h4DrvLine = _h4DatDrv ? 'your Datum' : 'your Ceiling';
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4PlanNew = _h4C;
            var _h4YrsOld = _h4PlanOld - _sNorm.activationAge;
            var _h4YrsNew = _h4PlanNew - _sNorm.activationAge;
            var _h4Body = 'Plan through ' + _h4PlanNew + ' instead of ' + _h4PlanOld + ' — about ' + _h4YrsNew + ' years of retirement rather than ' + _h4YrsOld + '. The same portfolio covering fewer years can safely deliver more each year, which lifts the Ceiling to ' + fmtKyr(r.ceilTarget) + ' with no new capital. Your Datum move is included; ' + _h4DrvLine + ' is the line this length is sized for. This is an assumption, not an effort — lean on it only if the shorter retirement is genuine.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        }
        var _dc_pct  = r.a1 > 0 ? Math.round(Math.abs(dc / pts.ceilSpend) * 100) : 0;
        var _dc_dir  = dc >= 0 ? 'up' : 'down';
        html += headCard(
          'You pulled the ceiling. Here\'s what it takes to hold it.',
          'You pulled the Ceiling. Holding it here requires real changes in the plan — these three paths show different ways to carry that higher line.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
        var _allSuppA = r.paths.filter(function(p) { return p.lever !== 'retireAge'; }).every(function(p) { return p.softWarn !== null; });
        r.paths.forEach(function(pth) {
          if (pth.lever === 'portfolio') {
            if (pth.hardStop === 'negative_portfolio' || pth.dP_M === null) return;
            if (pth.softWarn === 'too_large') {
              html += warn('req-item-ceil', 'var(--gold)', 'PORTFOLIO',
                'Reaching that ceiling via portfolio alone requires adding ' + fmtPort(pth.dP_M) + ' — more than twice your current balance.');
            } else {
              var _a1Body = 'Add ' + fmtPort(pth.dP_M) + ' to your starting balance. At your horizon, portfolio is the most efficient ceiling lever — every dollar added moves the ceiling ' + fmtPortPer1k(r.a1) + ' and the floor ' + fmtPortPer1k(r.a2) + '.';
              _a1Body += ' <span style="color:rgba(255,255,255,0.55);font-size:11px;">Your floor would also move ' + fmtKyr(Math.abs(pth.floorEffect)) + ' — it rises with the ceiling.</span>';
              html += item('req-item-ceil', 'var(--gold)', 'PATH 1 — PORTFOLIO', _a1Body, 'capital', (_sNorm.portfolioVol + pth.dP_M));
            }
          }
          if (pth.lever === 'contributions') {
            if (pth.dK_dollars === null) return;
            var _ceilFloorRatio = r.b1 > 0 && r.b2 > 0 ? (r.b1 / r.b2).toFixed(1) : '—';
            var _floorRatioC = r.b2 > 0 && r.b1 > 0 ? (r.b2 / r.b1).toFixed(2) : '—';
            if (pth.softWarn === 'too_high') {
              html += warn('req-item-ceil', 'var(--gold)', 'CONTRIBUTIONS',
                'Reaching that ceiling would require adding ' + fmtContrib(pth.dK_dollars) + ' — beyond a realistic single-lever move. A split across portfolio and contributions is more practical.');
            } else {
              var _a2Body = 'Add ' + fmtContrib(pth.dK_dollars) + ' to your annual contributions. That lifts your Ceiling much faster than your Floor — your lower boundary only rises by about ' + fmtKyr(Math.abs(pth.floorEffect)) + '.';
              html += item('req-item-ceil', 'var(--gold)', 'PATH 2 — CONTRIBUTIONS', _a2Body, 'contrib', (_sNorm.annualContrib + pth.dK_dollars));
            }
          }
          if (pth.lever === 'retireAge') {
            var _a3Body = 'Delay retirement by ' + fmtYrs(pth.dY) + '. Time amplifies every other input — but it\'s non-linear. Each additional year past ' + _sNorm.activationAge + ' yields a different ceiling gain.';
            _a3Body += ' <span style="color:rgba(255,255,255,0.55);font-size:11px;">Your floor would also rise — by approximately ' + fmtKyr(Math.abs(pth.floorEffect)) + '.</span>';
            if (pth.softWarn === 'extreme') {
              _a3Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that ceiling through retirement timing alone would require delaying ' + fmtYrs(pth.dY) + '. A combination may be more practical.</em> ' + _a3Body;
            }
            html += item('req-item-ceil', 'var(--gold)', 'PATH 3 — RETIRE AGE', _a3Body, 'retire', pth.reqRetireAge);
          }
        });
        if (_allSuppA && r.combo) {
          html += item('req-item-ceil', 'var(--gold)', 'COMBINATION PATH',
            'No single lever reaches this ceiling cleanly. A practical combination: add ' + fmtPort(r.combo.dP_M) + ' to your balance and ' + fmtContrib(r.combo.dK_dollars) + ' to contributions. Together they close the gap without over-relying on either lever.',
            'capital', (_sNorm.portfolioVol + r.combo.dP_M));
        }
        // PATH 4 — PLANNING HORIZON (Block A: ceiling drag)
        (function() {
          var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          var _h4ScReq  = r.ceilTarget * _h4ScCurr / pts.ceilSpend;
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4    = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C   = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4Dir = _h4Delta < 0 ? 'shorter' : 'longer';
          var _h4Abs = Math.abs(_h4Delta);
          var _h4DFmt = (_h4Abs === 1 ? '1 year' : _h4Abs + ' years') + ' ' + _h4Dir;
          var _h4Body = 'Plan through age ' + _h4C + ' — ' + _h4DFmt + ' than your current assumption. A ' + _h4Dir + ' retirement length ' + (_h4Delta < 0 ? 'raises' : 'lowers') + ' the Ceiling on the same pile by adjusting how long the withdrawals need to last. This is an assumption lever; it holds only if planning through ' + _h4C + ' is genuine.';
          if (_h4Abs > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that ceiling through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += item('req-item-ceil', 'var(--gold)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C);
        })();
        // Workstream Y — Block A × Datum context (Shape+Datum Combos)
        var _wyDatObj_A  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _wyDatZone_A = _wyDatObj_A ? _wyDatObj_A.key : 'expansive';
        var _nCf_A = fmtKyr(r.ceilTarget);
        var _pDf_A = fmtKyr(r.datumTarget);
        var _pDfPhrase_A = (Math.abs(dd) > 0.5) ? '' : _pDf_A + ' ';
        var _cGf_A = fmtKyr(Math.abs(r.ceilTarget - r.datumTarget));
        var _fGf_A = fmtKyr(Math.abs(r.datumTarget - r.floorTarget));
        var _datumAck_A = (Math.abs(dd) > 0.5) ? 'You also ' + (dd > 0 ? 'raised' : 'lowered') + ' the Datum ' + fmtKyr(Math.abs(dd)) + ' — it now sits at ' + fmtKyr(r.datumTarget) + '. ' : '';
        var _oeGlyph_A = (_wyDatObj_A && _wyDatObj_A.key === 'overextended') ? '⚠️ ' : '';
        var _wyCtx_A = '';
        if (_wyDatZone_A === 'overextended') {
          _wyCtx_A = 'The Ceiling moved to ' + _nCf_A + ', but your spending at ' + _pDf_A + ' is now above it — the Shape changed, the mismatch didn\'t. Moving the Ceiling doesn\'t resolve a Datum that exceeds it. That takes a structural change to the plan. Studio can show the most direct path to close that ' + _cGf_A + ' gap. One lever you control directly is the retirement length: planning through fewer years raises the Ceiling toward ' + _pDf_A + ' on the same pile — but lean on it only if the shorter horizon is genuine.';
        } else if (_wyDatZone_A === 'stretched') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'sits ' + _cGf_A + ' from the plan\'s upper limit. That\'s a thin margin — the plan carries this Datum, but without much room to absorb a run of poor returns. Studio can show what that buffer looks like under real sequence-of-returns stress, not just the base case.';
        } else if (_wyDatZone_A === 'expansive') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'sits ' + _cGf_A + ' below the plan\'s upper limit. The Datum is well inside the supported range — the Ceiling move preserved or opened meaningful headroom above where you\'re spending. Studio can show what that full range of capacity looks like given your accounts.';
        } else if (_wyDatZone_A === 'grounded') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'is ' + _cGf_A + ' below the upper limit and ' + _fGf_A + ' above the Floor. The Datum is sitting conservatively low relative to what the plan now supports — the Ceiling raise expanded the range above you significantly. Studio can show what the gap between your Datum and the plan\'s full capacity could actually fund.';
        } else if (_wyDatZone_A === 'abundant') {
          _wyCtx_A = 'With the Ceiling at ' + _nCf_A + ', the Datum ' + _pDfPhrase_A + 'has dropped below the Floor — the plan\'s minimum capacity now exceeds what you\'re asking for. The Ceiling drag expanded the upper range, but the Datum already sits below the lower boundary. Studio can show what that surplus represents and whether it\'s a deliberate conservative anchor or capacity worth reconsidering.';
        }
        if (_wyCtx_A) {
          html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_A ? _wyDatObj_A.name : 'EXPANSIVE'), _oeGlyph_A + _datumAck_A + _wyCtx_A, null, null);
        }
        return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        return;
      }

      // ── Block B: floor-only drag ──────────────────────────────────────
      if (r.block === 'B') {
        // Framing D: Datum + Floor — Scenario 1 (spec §10 R126-R144)
        if (Math.abs(dd) > 0.5) {
          // Guard 1: Datum above Ceiling (ceiling static here → dc=0, ceilTarget = pts.ceilSpend)
          if (r.datumTarget > r.ceilTarget + 0.5) {
            html += warn('req-item-datum', 'var(--gold)', 'DATUM ABOVE CEILING',
              'Your Datum sits above your Ceiling. Your spending target is higher than the upper boundary you drew. Raise the Ceiling or lower the Datum before comparing Path Options.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          var _YB = _sNorm.yearsToGrow || 0;
          var _gfB = _YB > 0 ? Math.pow(1 + DATUM_GROWTH_RATE_SPEC, _YB) : 1;
          var _C1B = _gfB * DATUM_SUPPORT_RATE;
          var _C2B = _YB > 0 ? DATUM_SUPPORT_RATE * ((_gfB - 1) / DATUM_GROWTH_RATE_SPEC) : 0;
          var _ddMB = dd / 1000;
          // Guard 2: Datum at/below Floor → req_datum = 0
          var _datBlwB = r.datumTarget <= r.floorTarget + 0.5;
          var _reqDatPB = _datBlwB ? 0 : Math.max(_ddMB / _C1B, 0);
          var _reqDatKB = (_datBlwB || _C2B === 0) ? 0 : Math.max(_ddMB / _C2B * 1e6, 0);
          // MAX-over-clearance per path
          var _pthPB = r.paths && r.paths[0];
          var _pthKB = r.paths && r.paths[1];
          var _pthRB = r.paths && r.paths[2];
          var _bndPB = (_pthPB && _pthPB.dP_M != null) ? _pthPB.dP_M : 0;
          var _bndKB = (_pthKB && _pthKB.dK_dollars != null) ? _pthKB.dK_dollars : 0;
          var _dispPB = Math.max(_bndPB, _reqDatPB);
          var _dispKB = Math.max(_bndKB, _reqDatKB);
          // PATH 3: MAX(boundary age, datum age)
          var _raDB = _d2BinarySearchYDatum(r.datumTarget / 1000, _sNorm);
          var _raBndB = (_pthRB && _pthRB.reqRetireAge) ? _pthRB.reqRetireAge : _sNorm.activationAge;
          var _raDispB = Math.max(_raBndB, _raDB);
          var _dYB = _raDispB - _sNorm.activationAge;
          // Driving line (portfolio path primary)
          var _epsPB = DRIVER_TIE_EPSILON * Math.max(_reqDatPB, _bndPB, 0.001);
          var _datDrvPB = _reqDatPB - _bndPB > _epsPB;
          var _flrDrvPB = _bndPB - _reqDatPB > _epsPB;
          var _tiedPB   = !_datDrvPB && !_flrDrvPB;
          // Guard 3: all zero
          if (_dispPB <= 0 && _dispKB <= 0 && _dYB <= 0) {
            html += headCard('NO ADDITIONAL LEVERS NEEDED',
              'You moved your Shape in a direction your current plan already supports. No portfolio addition, contribution increase, or retirement delay is needed.');
            return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
          }
          html += headCard('You pulled the Floor and moved your Datum. Here\'s what it takes to support both.',
            'Each path shows the larger of what the Floor needs and what your Datum needs.');
          if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
          // PATH 1 — PORTFOLIO
          var _p1B = _tiedPB
            ? 'Add ' + fmtPort(_dispPB) + ' to your starting balance. Supporting both takes more portfolio than supporting the Floor alone.'
            : _datDrvPB
              ? 'Add ' + fmtPort(_dispPB) + ' to your starting balance. You moved your Floor to ' + fmtKyr(r.floorTarget) + ' and your Datum to ' + fmtKyr(r.datumTarget) + ' — your Datum spending is the line driving this number.'
              : 'Add ' + fmtPort(_dispPB) + ' to your starting balance. Your Floor move is what is setting this number — your Datum move is included but sits comfortably within reach. Without the Floor move, less would be needed.';
          if (_datBlwB) _p1B += ' Your Datum sits at or below your Floor — the plan supports your spending target without extra portfolio.';
          if (_dispPB > 2 * (_sNorm.portfolioVol || 0)) {
            html += warn('req-item-floor', 'var(--danger-red)', 'PATH 1 &mdash; PORTFOLIO',
              'Reaching these targets via portfolio alone requires more than twice your current balance. A split across levers is more practical.');
          } else {
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 1 &mdash; PORTFOLIO', _p1B, 'capital', (_sNorm.portfolioVol + _dispPB), r.datumTarget);
          }
          // PATH 2 — CONTRIBUTIONS
          var _epsKB = DRIVER_TIE_EPSILON * Math.max(_reqDatKB, _bndKB, 0.001);
          var _datDrvKB = _reqDatKB - _bndKB > _epsKB;
          var _p2B = _datDrvKB
            ? 'Add ' + fmtContrib(_dispKB) + ' to your annual contributions. This lifts both your Floor and your Datum support — the contribution increase has to carry both lines at once. Your Datum spending is driving the total.'
            : 'Add ' + fmtContrib(_dispKB) + ' to your annual contributions. This holds your Floor — your Datum target is included and supported within the same amount.';
          if (Math.abs(_dispKB) > 50000) {
            html += warn('req-item-floor', 'var(--danger-red)', 'PATH 2 &mdash; CONTRIBUTIONS',
              'Reaching these targets via contributions alone would require ' + fmtContrib(_dispKB) + ' — beyond a practical single-lever move.');
          } else {
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 2 &mdash; CONTRIBUTIONS', _p2B, 'contrib', (_sNorm.annualContrib + _dispKB), r.datumTarget);
          }
          // PATH 3 — RETIRE AGE
          var _datDrvRB = _raDB > _raBndB;
          var _p3B = _datDrvRB
            ? 'Delay retirement by ' + fmtYrs(_dYB) + '. Time amplifies every input — each additional year of compound growth raises both your Floor and your Datum support. Your Datum spending is what is setting the delay needed.'
            : 'Delay retirement by ' + fmtYrs(_dYB) + '. Time grows both your Floor and your Datum support — each additional year past ' + _sNorm.activationAge + ' locks in more capacity. Your Datum move is included.';
          html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 3 &mdash; RETIRE AGE', _p3B, 'retire', _raDispB, r.datumTarget);
          (function() {
            var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
            var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
            if (pts.floorSpend <= 0 || pts.datumSpend <= 0) return;
            var _h4ScReqFlr = r.floorTarget * _h4ScCurr / pts.floorSpend;
            var _h4ScReqDat = r.datumTarget * _h4ScCurr / pts.datumSpend;
            var _h4ScReq = Math.max(_h4ScReqFlr, _h4ScReqDat);
            if (_h4ScReq <= 0.6079) return;
            var _h4Inner = 1 - 0.6079 / _h4ScReq;
            if (_h4Inner <= 0 || _h4Inner >= 1) return;
            var _h4 = -Math.log(_h4Inner) / Math.log(1.034);
            var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
            var _h4C = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
            var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
            if (Math.abs(_h4Delta) < 1) return;
            var _h4PlanOld = _sNorm.planThroughAge || 93;
            var _h4PlanNew = _h4C;
            var _h4Body = 'Plan through ' + _h4PlanNew + ' instead of ' + _h4PlanOld + '. A shorter retirement raises the Floor toward ' + fmtKyr(r.floorTarget) + ' on the same balance — the one move that adds resilience without adding a dollar. Honest only if the horizon truly is shorter.';
            if (Math.abs(_h4Delta) > 15) {
              _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching these targets through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
            }
            html += itemD('req-item-floor', 'var(--danger-red)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C, r.datumTarget);
          })();
          html += studioCTA('Studio can model the most efficient mix of these levers given your actual account structure, income timing, and tax treatment.');
          return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        }
        var _df_pct = pts.floorSpend > 0 ? Math.round(Math.abs(df / pts.floorSpend) * 100) : 0;
        var _df_dir = df >= 0 ? 'up' : 'down';
        html += headCard(
          'You pulled the Floor up. These paths show what it would take, in capital, savings, or timing, to keep that higher boundary in place.',
          'A floor of ' + fmtKyr(r.floorTarget) + ' — ' + _df_pct + '% ' + _df_dir + ' from your current floor — requires one of these lever moves.'
        );
        if (_spOffOrigin) { html += _spClauseCard('Starting from the higher balance you\'ve designed, each path reflects what\'s still needed on top — the designed-in balance covers part of the distance.'); }
        // Mandatory coupling disclosure (CLAUDE §10) — suppressed when SP has also moved (self-contradictory with live paths)
        var _ceilFloorRatioPort = r.a2 > 0 ? (r.a1 / r.a2).toFixed(2) : '—';
        if (!_spOffOrigin) {
          html += '<div class="req-item" style="border-left-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);margin-bottom:6px;">'
            + '<div class="req-item-body" style="color:rgba(255,255,255,0.55);font-size:11px;">In this Sketch there is no floor-only move. Every dollar you use to lift the Floor also lifts the Ceiling, and at this horizon the Ceiling still moves more than the Floor.</div></div>';
        }
        r.paths.forEach(function(pth) {
          if (pth.lever === 'portfolio') {
            if (pth.hardStop === 'negative_portfolio' || pth.dP_M === null) return;
            if (pth.softWarn === 'too_large') {
              html += warn('req-item-floor', 'var(--danger-red)', 'PORTFOLIO',
                'Securing that floor via portfolio alone requires adding ' + fmtPort(pth.dP_M) + ' — more than twice your current balance.');
            } else {
              var _b1Body = 'Add ' + fmtPort(pth.dP_M) + ' to your starting balance. Every extra $1,000 in your portfolio raises the Floor by about ' + fmtPortPer1k(r.a2) + ' and the Ceiling by about ' + fmtPortPer1k(r.a1) + ' — one move lifts both edges of your range.';
              html += item('req-item-floor', 'var(--danger-red)', 'PATH 1 — PORTFOLIO', _b1Body, 'capital', (_sNorm.portfolioVol + pth.dP_M));
            }
          }
          if (pth.lever === 'contributions') {
            if (pth.dK_dollars === null) return;
            var _ceilFloorRatioContrib = r.b2 > 0 && r.b1 > 0 ? (r.b1 / r.b2).toFixed(1) : '—';
            if (pth.softWarn === 'too_high') {
              html += warn('req-item-floor', 'var(--danger-red)', 'CONTRIBUTIONS',
                'Using contributions alone to hold this Floor would require ' + fmtContrib(pth.dK_dollars) + ' — more than that lever can reasonably carry on its own. A split across portfolio and contributions shares the load.');
            } else {
              html += item('req-item-floor', 'var(--danger-red)', 'PATH 2 — CONTRIBUTIONS',
                'Add ' + fmtContrib(pth.dK_dollars) + ' to contributions. Contributions are less efficient at moving the floor than the ceiling — the ceiling-to-floor ratio at your horizon is approximately ' + _ceilFloorRatioContrib + ':1.',
                'contrib', (_sNorm.annualContrib + pth.dK_dollars));
            }
          }
          if (pth.lever === 'retireAge') {
            var _b3Body = 'Delay retirement by ' + fmtYrs(pth.dY) + ' to grow both boundaries. The floor lifts less than the ceiling with additional time — but consistently.';
            if (pth.softWarn === 'extreme') {
              _b3Body = 'Relying only on retirement timing to hold this Floor would mean delaying about ' + fmtYrs(pth.dY) + ' more — a heavy ask. A mixed path can often reach similar floors with less delay.';
            }
            html += item('req-item-floor', 'var(--danger-red)', 'PATH 3 — RETIRE AGE', _b3Body, 'retire', pth.reqRetireAge);
          }
        });
        // Qualitative SS/annuity path — Captain Decision 2: Option 1, no fabricated numbers
        html += '<div class="req-item req-item-floor" style="opacity:0.75;">'
          + '<div class="req-item-label" style="color:var(--danger-red);">GUARANTEED INCOME PATH</div>'
          + '<div class="req-item-body" style="font-size:11px;">Income sources like Social Security and annuities can raise your Floor without needing extra portfolio growth. Studio can model how large those streams would need to be for your plan.</div></div>';
        // PATH 4 — PLANNING HORIZON (Block B: floor drag)
        (function() {
          var _h4Curr = Math.max(15, (_sNorm.planThroughAge || 93) - _sNorm.activationAge);
          var _h4ScCurr = 0.6079 / (1 - Math.pow(1.034, -_h4Curr));
          var _h4ScReq  = r.floorTarget * _h4ScCurr / pts.floorSpend;
          if (_h4ScReq <= 0.6079) return;
          var _h4Inner = 1 - 0.6079 / _h4ScReq;
          if (_h4Inner <= 0 || _h4Inner >= 1) return;
          var _h4    = -Math.log(_h4Inner) / Math.log(1.034);
          var _h4PTA = _sNorm.activationAge + Math.max(15, _h4);
          var _h4C   = Math.round(Math.min(105, Math.max(Math.max(75, _sNorm.activationAge + 20), _h4PTA)));
          var _h4Delta = _h4C - (_sNorm.planThroughAge || 93);
          if (Math.abs(_h4Delta) < 1) return;
          var _h4Dir = _h4Delta < 0 ? 'shorter' : 'longer';
          var _h4Abs = Math.abs(_h4Delta);
          var _h4DFmt = (_h4Abs === 1 ? '1 year' : _h4Abs + ' years') + ' ' + _h4Dir;
          var _h4Body = 'Plan through age ' + _h4C + ' — ' + _h4DFmt + ' than your current assumption. A ' + _h4Dir + ' retirement length ' + (_h4Delta < 0 ? 'raises' : 'lowers') + ' the Floor on the same pile by adjusting how long the withdrawals need to last. This is an assumption lever; it holds only if planning through ' + _h4C + ' is genuine.';
          if (_h4Abs > 15) {
            _h4Body = '<em style="color:rgba(255,255,255,0.5);">&#9888; Reaching that floor through retirement length alone would require planning through ' + _h4C + ' — a significant shift. A combination may be more practical.</em> ' + _h4Body;
          }
          html += item('req-item-floor', 'var(--danger-red)', 'PATH 4 — PLANNING HORIZON', _h4Body, 'plan', _h4C);
        })();
        var _allSuppB = r.paths.slice(0, 2).every(function(p) { return p.softWarn !== null; });
        if (_allSuppB && r.combo) {
          html += item('req-item-floor', 'var(--danger-red)', 'COMBINATION PATH',
            'Reaching this floor with a single lever would require an outsized move. A more practical combination: add ' + fmtPort(r.combo.dP_M) + ' to your balance and ' + fmtContrib(r.combo.dK_dollars) + ' to contributions.',
            'capital', (_sNorm.portfolioVol + r.combo.dP_M));
        }
        // Workstream Y — Block B × Datum context (Shape+Datum Combos)
        var _wyDatObj_B  = getShapeStateObj({ ceilSpend: r.ceilTarget, floorSpend: r.floorTarget, datumSpend: r.datumTarget });
        var _wyDatZone_B = _wyDatObj_B ? _wyDatObj_B.key : 'expansive';
        var _fmtSgn_B    = function(v) { return (v >= 0 ? '+' : '-') + '$' + Math.round(Math.abs(v)) + 'k/yr'; };
        var _nFf_B = fmtKyr(r.floorTarget);
        var _pDf_B = fmtKyr(r.datumTarget);
        var _pDfPhrase_B = (Math.abs(dd) > 0.5) ? '' : _pDf_B + ' ';
        var _cGf_B = fmtKyr(Math.abs(r.ceilTarget - r.datumTarget));
        var _fGf_B = fmtKyr(Math.abs(r.datumTarget - r.floorTarget));
        var _fDf_B = _fmtSgn_B(df);
        var _datumAck_B = (Math.abs(dd) > 0.5) ? 'You also ' + (dd > 0 ? 'raised' : 'lowered') + ' the Datum ' + fmtKyr(Math.abs(dd)) + ' — it now sits at ' + fmtKyr(r.datumTarget) + '. ' : '';
        var _oeGlyph_B = (_wyDatObj_B && _wyDatObj_B.key === 'overextended') ? '⚠️ ' : '';
        var _wyCtx_B = '';
        if (_wyDatZone_B === 'overextended') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', but the structural issue is still there: your spending at ' + _pDf_B + ' sits above the Ceiling. Adjusting the Floor doesn\'t change the Datum\'s relationship to the Ceiling — the plan still can\'t reach this spending level. Studio can show the most efficient path to bring ' + _pDf_B + ' back into a supported range. A shorter retirement length is the one move that lifts the Ceiling toward ' + _pDf_B + ' without new capital — honest only if the horizon truly is shorter.';
        } else if (_wyDatZone_B === 'stretched') {
          _wyCtx_B = 'The Floor moved ' + _fDf_B + ', but the Datum ' + _pDfPhrase_B + 'is still ' + _cGf_B + ' from the Ceiling. The Floor change adjusts the plan\'s lower resilience — it doesn\'t change how tight the margin is above the Datum. Studio can show how the current upper-boundary buffer holds under sequence-of-returns pressure.';
        } else if (_wyDatZone_B === 'expansive') {
          _wyCtx_B = 'With the Floor at ' + _nFf_B + ', the Datum ' + _pDfPhrase_B + 'sits ' + _fGf_B + ' above the lower boundary and ' + _cGf_B + ' below the Ceiling. The Datum is comfortably positioned — the Floor move adjusted the plan\'s resilience baseline without squeezing the Datum\'s range. Studio can confirm how this position holds under stress and whether there\'s more capacity available above.';
        } else if (_wyDatZone_B === 'grounded') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', and the Datum ' + _pDfPhrase_B + 'is now only ' + _fGf_B + ' above it. The Floor came up toward the Datum — the margin between your spending and the plan\'s lower boundary has thinned. Studio can show what happens to that margin under below-average return scenarios.';
        } else if (_wyDatZone_B === 'abundant') {
          _wyCtx_B = 'The Floor moved to ' + _nFf_B + ', and the Datum ' + _pDfPhrase_B + 'is now below it — the plan\'s minimum capacity now exceeds what you\'re asking for. This is a surplus condition: the plan was built to carry more than the Datum represents. Studio can show what that margin could fund — earlier retirement, a larger legacy, or stronger stress resilience.';
        }
        if (_wyCtx_B) {
          html += item('req-item-datum', 'var(--teal-mid)', 'DATUM — ' + (_wyDatObj_B ? _wyDatObj_B.name : 'EXPANSIVE'), _oeGlyph_B + _datumAck_B + _wyCtx_B, null, null);
        }
        return { headLabel: _headLabel, html: html, acceptFromState: _acceptFromState };
        return;
      }

      // Fallback
      return { headLabel: _headLabel, html: '<div class="req-placeholder">Drag the Ceiling, Floor, or Datum handles to design your shape — and see exactly what each move means.</div>', acceptFromState: _acceptFromState };
    }
  DatumShape.S2Copy.buildRequirements = buildRequirements;

  /* #1/#5: multi-lever S2 copy builder — VERBATIM slice of sketch.html renderDesignCanvas
   * L5878-6211 + ML_01..ML_08 (L3278-3285). Pure: consumes a ctx of pre-computed scenarios
   * + endpoints, returns the four HUD strings. BOTH sketch.html and studio-wantface.js call
   * this so the multi-lever copy is single-source (Option-1 extraction, Lesson 48). */
  function buildMultiLever(ctx) {
    var retire = ctx.retire, age = ctx.age, yrs = ctx.yrs, paradigm = ctx.paradigm,
        gb = ctx.gb, ds = ctx.ds, s = ctx.s, gbEnd = ctx.gbEnd, ptsEnd = ctx.ptsEnd,
        gbPinnedState = ctx.gbPinnedState;
    const ML_01 = 'Two inputs moved in the same direction — [Lever A] and [Lever B] both grew the Shape, amplifying the shift.';
    const ML_02 = 'Two inputs moved in the same direction — [Lever A] and [Lever B] both compressed the Shape, amplifying the downward shift.';
    const ML_03 = 'Two levers moved in opposing directions — [Lever A] worked to improve the position while [Lever B] worked against it. The net result was a positive shift.';
    const ML_04 = 'Two levers moved in opposing directions — [Lever A] and [Lever B] partially canceled each other. The net result was a negative shift despite one positive input.';
    const ML_05 = 'Two levers moved in opposing directions and roughly offset — [Lever A] and [Lever B] produced a marginal net shift. The position changed little despite both levers moving.';
    const ML_06 = 'The Datum moved [direction] while [Lever B] shifted the Shape in the same structural direction — both effects reinforced each other.';
    const ML_07 = 'The Datum moved [direction] while [Lever B] shifted the Shape boundaries in the opposing direction — the two effects partially canceled.';
    const ML_08 = 'Three inputs moved simultaneously — [Lever A], [Lever B], and [Lever C]. Identify the primary driver (≥50% of impact) and note whether the secondary levers amplified or offset it.';
    var _phys = '', _act = '', _d2ChangeHtml = '', _d2DomLever = '';
                var _d2RetireDelta  = retire - gb.activationAge;
                var _d2RetireAbs    = Math.abs(_d2RetireDelta);
                var _d2RetireBand   = _d2RetireAbs > 15 ? 'generational' : _d2RetireAbs >= 10 ? 'dramatic' : _d2RetireAbs >= 5 ? 'large' : _d2RetireAbs >= 2 ? 'moderate' : 'small';
                var _d2CapDelta     = ds.port - gb.portfolioVol;
                var _d2CapPct       = Math.abs(_d2CapDelta) / Math.max(Math.abs(gb.portfolioVol), 0.01);
                var _d2CapBand      = _d2CapPct > 0.5 ? 'dramatic' : _d2CapPct >= 0.25 ? 'large' : _d2CapPct >= 0.10 ? 'moderate' : 'small';
                var _d2CapPctStr    = Math.round(_d2CapPct * 100) + '%';
                var _d2ContribDelta = ds.contrib - gb.annualContrib;
                var _d2ContribAbs   = Math.abs(_d2ContribDelta);
                var _d2ContribBand  = _d2ContribAbs > 40000 ? 'dramatic' : _d2ContribAbs >= 15000 ? 'large' : _d2ContribAbs >= 5000 ? 'moderate' : 'small';
                var _d2ContribKStr  = '$' + Math.max(1, Math.round(_d2ContribAbs / 1000)) + 'k';
                var _d2DatumDelta   = s.targetSpend - gb.targetSpend;
                var _d2DatumAbs     = Math.abs(_d2DatumDelta);
                var _d2DatumBand    = _d2DatumAbs > 25 ? 'large' : _d2DatumAbs >= 10 ? 'moderate' : 'small';
                var _d2DatumPct     = Math.round(_d2DatumAbs / Math.max(Math.abs(gb.targetSpend), 1) * 100);
                var _d2DCur         = s.targetSpend >= 1000 ? '$' + (s.targetSpend/1000).toFixed(2).replace(/\.00$/, '') + 'M' : '$' + s.targetSpend + 'k';
                var _d2AgeDelta     = age - gb.currentAge;
                var _d2AgeAbs       = Math.abs(_d2AgeDelta);
                var _d2AgeBand      = _d2AgeAbs > 12 ? 'dramatic' : _d2AgeAbs >= 7 ? 'large' : _d2AgeAbs >= 3 ? 'moderate' : 'small';
                var _d2CurMkt       = paradigm === 'optimistic' ? 'Optimistic' : paradigm === 'stress' ? 'Stress' : 'Historical';
                var _d2RetireChg    = gb.activationAge !== retire;
                var _d2AgeChg       = gb.currentAge !== age;
                var _d2CapChg       = Math.abs(gb.portfolioVol - ds.port) > 0.001;
                var _d2ContribChg   = Math.abs(gb.annualContrib - ds.contrib) > 100;
                var _d2DatumChg     = gb.targetSpend !== s.targetSpend;
                var _d2MktChg       = !!(gbPinnedState.pinnedParadigm && gbPinnedState.pinnedParadigm !== _d2CurMkt);
                var _d2PlanDelta    = (ds.planThroughAge || 93) - (gb.planThroughAge || 93);
                var _d2PlanAbs      = Math.abs(_d2PlanDelta);
                var _d2PlanBand     = _d2PlanAbs > 10 ? 'large' : _d2PlanAbs >= 5 ? 'moderate' : 'small';
                var _d2PlanChg      = _d2PlanAbs >= 1;
                var _d2Pchg = [];
                if (_d2RetireChg) { var _d2RDir = _d2RetireDelta > 0 ? 'later' : 'earlier'; _d2Pchg.push('Retirement moved ' + _d2RDir + ' by ' + _d2RetireAbs + ' yr to ' + retire + '.'); }
                if (_d2AgeChg)     _d2Pchg.push('Current age moved to ' + age + '.');
                if (_d2CapChg)   { var _d2CDir = _d2CapDelta > 0 ? 'up' : 'down'; var _d2CStr = ds.port >= 1 ? '$' + ds.port.toFixed(2) + 'M' : '$' + Math.round(ds.port * 1000) + 'k'; _d2Pchg.push('Capital moved ' + _d2CDir + ' to ' + _d2CStr + ' (' + _d2CapPctStr + ').'); }
                if (_d2DatumChg) { var _d2DDr = _d2DatumDelta > 0 ? 'up' : 'down'; _d2Pchg.push('Datum moved ' + _d2DDr + ' to ' + _d2DCur + '/yr.'); }
                if (_d2ContribChg) { var _d2CnDir = _d2ContribDelta > 0 ? 'up' : 'down'; var _d2CnStr = ds.contrib >= 1000 ? '$' + Math.round(ds.contrib/1000) + 'k' : '$' + ds.contrib; _d2Pchg.push('Contributions moved ' + _d2CnDir + ' to ' + _d2CnStr + '/yr.'); }
                if (_d2PlanChg)  { var _d2PDir = _d2PlanDelta < 0 ? 'shorter' : 'longer'; _d2Pchg.push('Retirement length moved ' + _d2PDir + ' to ' + (ds.planThroughAge || 93) + ' yrs.'); }
                if (_d2MktChg)     _d2Pchg.push('Market changed to ' + _d2CurMkt + '.');
                var _d2PFloorPin    = gbEnd.floorSpend || 0;
                var _d2PCeilPin     = gbEnd.ceilSpend  || 0;
                var _d2PDatumPin    = gbEnd.datumSpend || 0;
                var _d2PRangePin    = Math.max(_d2PCeilPin - _d2PFloorPin, 1);
                var _d2PRangeCur    = ptsEnd.ceilSpend - ptsEnd.floorSpend;
                var _d2PWidthDelta  = _d2PRangeCur - _d2PRangePin;
                var _d2PMidDelta    = (ptsEnd.floorSpend + ptsEnd.ceilSpend) / 2 - (_d2PFloorPin + _d2PCeilPin) / 2;
                var _d2PDatPctPin   = _d2PRangePin > 0 ? (_d2PDatumPin - _d2PFloorPin) / _d2PRangePin : 0.5;
                var _d2PDatPctCur   = _d2PRangeCur > 0 ? (ptsEnd.datumSpend - ptsEnd.floorSpend) / _d2PRangeCur : 0.5;
                var _d2PNearCeil    = _d2PDatPctCur > 0.78;
                var _d2PNearFloor   = _d2PDatPctCur < 0.22;
                var _d2PWidthSig    = Math.abs(_d2PWidthDelta) > Math.max(10, _d2PRangePin * 0.10);
                var _d2PMidSig      = Math.abs(_d2PMidDelta)   > Math.max(8,  _d2PRangePin * 0.08);
                var _d2PWidened     = _d2PWidthSig && _d2PWidthDelta > 0;
                var _d2PCompressed  = _d2PWidthSig && _d2PWidthDelta < 0;
                var _d2PShiftUp     = !_d2PWidthSig && _d2PMidSig && _d2PMidDelta > 0;
                var _d2PShiftDn     = !_d2PWidthSig && _d2PMidSig && _d2PMidDelta < 0;
                var _d2Lw = [];
                if (_d2RetireChg)  _d2Lw.push({ key: 'retire',  w: _d2RetireAbs * 10 });
                if (_d2CapChg)     _d2Lw.push({ key: 'capital', w: _d2CapPct * 100 });
                if (_d2ContribChg) _d2Lw.push({ key: 'contrib', w: _d2ContribAbs / 600 });
                if (_d2DatumChg)   _d2Lw.push({ key: 'datum',   w: _d2DatumAbs / 3 });
                if (_d2MktChg)     _d2Lw.push({ key: 'market',  w: 55 });
                if (_d2AgeChg)     _d2Lw.push({ key: 'age',     w: _d2AgeAbs * 4 });
                if (_d2PlanChg)    _d2Lw.push({ key: 'plan',    w: _d2PlanAbs * 5 });
                _d2Lw.sort(function(a, b) { return b.w - a.w; });
                var _d2Dom  = _d2Lw[0];
                var _d2Sec  = _d2Lw[1];
                var _d2Twt  = _d2Lw.reduce(function(acc, l) { return acc + l.w; }, 0);
                var _d2SecDriving = !!(_d2Sec && _d2Twt > 0 && _d2Sec.w / _d2Twt > 0.30);
                var _d2Mag = { small: 'slightly', moderate: 'moderately', large: 'meaningfully', dramatic: 'dramatically', generational: 'generationally' };
                var _d2Dp = (function() {
                    if (!_d2Dom) return '';
                    switch (_d2Dom.key) {
                        case 'retire':  return _d2RetireDelta > 0 ? 'A ' + _d2RetireAbs + '-year delay ' + _d2Mag[_d2RetireBand] : 'Retiring ' + _d2RetireAbs + ' years earlier ' + _d2Mag[_d2RetireBand];
                        case 'capital': return 'A ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease') + ' ' + _d2Mag[_d2CapBand];
                        case 'contrib': return 'A ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'increase' : 'reduction') + ' ' + _d2Mag[_d2ContribBand];
                        case 'datum':   return 'A ' + _d2DatumPct + '% Datum ' + (_d2DatumDelta > 0 ? 'increase' : 'decrease') + ' ' + _d2Mag[_d2DatumBand];
                        case 'market':  return paradigm === 'optimistic' ? 'Optimistic market assumptions' : paradigm === 'stress' ? 'Stress market assumptions' : 'Changed market assumptions';
                        case 'age':     return _d2AgeDelta > 0 ? 'Starting ' + _d2AgeAbs + ' years later ' + _d2Mag[_d2AgeBand] : 'Starting ' + _d2AgeAbs + ' years earlier ' + _d2Mag[_d2AgeBand];
                        case 'plan':    return _d2PlanDelta < 0 ? 'A shorter retirement length ' + _d2Mag[_d2PlanBand] : 'A longer retirement length ' + _d2Mag[_d2PlanBand];
                        default: return '';
                    }
                })();
                var _d2DomNoun = (function() {
                    if (!_d2Dom) return 'the change';
                    switch (_d2Dom.key) {
                        case 'retire':  return 'the ' + _d2RetireAbs + '-year ' + (_d2RetireDelta > 0 ? 'delay' : 'earlier retirement');
                        case 'capital': return 'the ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease');
                        case 'contrib': return 'the ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'lift' : 'reduction');
                        case 'datum':   return 'the Datum shift';
                        case 'market':  return 'the market assumption change';
                        case 'age':     return 'the ' + _d2AgeAbs + '-year timeline change';
                        default: return 'the change';
                    }
                })();
                var _d2RetireWhy = _d2RetireDelta > 0
                    ? (_d2RetireBand === 'small' ? 'one extra year of compounding' : _d2RetireBand === 'generational' ? 'that span of compounding fundamentally reshapes both Floor and Ceiling' : _d2RetireBand === 'dramatic' ? 'a full decade more of compounding lifted both Floor and Ceiling materially' : _d2RetireAbs + ' more years of compounding raised both boundaries')
                    : (_d2RetireBand === 'small' ? 'one fewer year of compounding reduced the range' : 'fewer years for capital to compound reduced both boundaries');
                var _d2SecClause = (function() {
                    if (!_d2SecDriving || !_d2Sec) return '';
                    switch (_d2Sec.key) {
                        case 'retire':  return 'the ' + _d2RetireAbs + '-year ' + (_d2RetireDelta > 0 ? 'delay' : 'pullback') + ' reinforced it';
                        case 'capital': return 'the ' + _d2CapPctStr + ' capital ' + (_d2CapDelta > 0 ? 'increase' : 'decrease') + ' reinforced it';
                        case 'contrib': return 'the ' + _d2ContribKStr + ' contribution ' + (_d2ContribDelta > 0 ? 'lift' : 'reduction') + ' reinforced it';
                        case 'datum':   return 'the Datum shift contributed';
                        case 'market':  return 'the market assumption change reinforced it';
                        default: return '';
                    }
                })();
                var _d2Bridge = (function() {
                    if (!_d2Dom) return 'Studio can model this change against your actual accounts and income sequencing.';
                    switch (_d2Dom.key) {
                        case 'retire':  return 'Studio can test whether SS timing, bridge years, and withdrawal order support this ' + _d2RetireAbs + '-year shift.';
                        case 'capital': return 'Studio can test whether account types and tax sequencing support this ' + Math.round(_d2CapPct * 100) + '% capital change.';
                        case 'contrib': return 'Studio can test whether contribution sequencing and account placement support this ' + _d2ContribKStr + '/yr change.';
                        case 'datum':   return 'Studio can test whether tax architecture and income timing support a Datum ' + _d2DatumPct + '% ' + (_d2DatumDelta > 0 ? 'higher' : 'lower') + '.';
                        case 'market':  return paradigm === 'stress' ? "Studio can test this Shape across the full engine's probability-weighted paths instead of the Sketch's broad-stroke model." : paradigm === 'optimistic' ? "Studio can model how often this upside case occurs across thousands of simulated market paths." : "Studio can test this Shape across the full engine instead of the Sketch's broad-stroke paths.";
                        case 'age':     return 'Studio can model this timeline change against your actual account types and spending projections.';
                        default: return 'Studio can model this change against your actual accounts and income sequencing.';
                    }
                })();
                if (_d2Pchg.length === 0) {
                    _phys = 'Inputs match the Discover Shape. Move sliders to compare.';
                    _act  = 'Adjust any input to see how the Shape responds.';
                } else if (_d2PWidened) {
                    var _d2Open = 'Compared with your Discover Shape, the Shape widened.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'retire': _d2Open = _d2Dp + ' widened the Shape — ' + _d2RetireWhy + '.'; break; case 'capital': _d2Open = _d2Dp + ' widened the Shape — higher capital raised both boundaries.'; break; case 'contrib': _d2Open = _d2Dp + ' widened the Shape — more contributions compounded over the growth period.'; break; case 'market': _d2Open = _d2Dp + ' widened the Shape — higher growth estimates raised both boundaries.'; break; case 'age': _d2Open = _d2Dp + ' widened the Shape — more years remaining for capital to compound.'; break; } }
                    var _d2CC = _d2Pchg.length, _d2CW = _d2CC === 2 ? 'two' : String(_d2CC);
                    var _d2St = _d2SecDriving && _d2SecClause ? ' Of the ' + _d2CW + ' changes, ' + _d2DomNoun + ' drove most of the widening; ' + _d2SecClause + '.' : '';
                    var _d2Dn = (_d2PNearCeil && _d2DatumChg) ? ' Your Datum now sits closer to the Ceiling of this wider range.' : '';
                    var _d2Sh = _d2PMidSig ? ' It also shifted ' + (_d2PMidDelta > 0 ? 'higher' : 'lower') + ' overall.' : '';
                    _phys = _d2Open + _d2St + _d2Dn + _d2Sh;
                    _act  = _d2PNearCeil ? 'Studio can test whether taxes, income timing, and account sequencing can support your Datum at this higher end of the range.' : _d2Bridge;
                } else if (_d2PCompressed) {
                    var _d2Open2 = 'Compared with your Discover Shape, the Shape narrowed.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'retire': _d2Open2 = _d2Dp + ' narrowed the Shape — ' + _d2RetireWhy + '.'; break; case 'capital': _d2Open2 = _d2Dp + ' narrowed the Shape — lower capital reduced both boundaries.'; break; case 'market': _d2Open2 = _d2Dp + ' narrowed the Shape — stress assumptions lowered both boundaries.'; break; case 'age': _d2Open2 = _d2Dp + ' narrowed the Shape — ' + (_d2AgeBand === 'dramatic' ? 'that span of lost compounding heavily reduced both boundaries' : 'fewer years remaining for capital to compound') + '.'; break; } }
                    var _d2CC2 = _d2Pchg.length, _d2CW2 = _d2CC2 === 2 ? 'two' : String(_d2CC2);
                    var _d2St2 = _d2SecDriving && _d2SecClause ? ' Of the ' + _d2CW2 + ' changes, ' + _d2DomNoun + ' drove most of the narrowing; ' + _d2SecClause + '.' : '';
                    var _d2Dn2 = _d2PNearCeil ? ' Your Datum now sits near the Ceiling — the Shape has moved toward stretched positioning.' : _d2PNearFloor ? ' Your Datum now sits near the Floor — the Shape has moved toward grounded positioning.' : '';
                    var _d2Sh2 = _d2PMidSig ? ' It also shifted ' + (_d2PMidDelta > 0 ? 'higher' : 'lower') + ' overall.' : '';
                    _phys = _d2Open2 + _d2St2 + _d2Dn2 + _d2Sh2;
                    _act  = _d2PNearCeil ? 'Studio can test whether tax strategies, Social Security timing, or contribution changes can relieve pressure at the upper edge of this narrowed Shape.' : _d2PNearFloor ? 'Studio can inspect lower-bound resilience across bad sequences, early downturns, and spending drift.' : _d2Bridge;
                } else if (_d2PShiftUp) {
                    var _d2Open3 = 'Compared with your Discover Shape, the Shape shifted higher.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'capital': _d2Open3 = _d2Dp + ' shifted the Shape higher — higher capital lifted both boundaries.'; break; case 'contrib': _d2Open3 = _d2Dp + ' shifted the Shape higher — more contributions raised both boundaries.'; break; case 'retire': _d2Open3 = _d2Dp + ' shifted the Shape higher — more compounding time raised both boundaries.'; break; case 'age': _d2Open3 = _d2Dp + ' shifted the Shape higher — more years remaining for capital to compound.'; break; } }
                    var _d2St3 = _d2SecDriving && _d2SecClause ? ' ' + _d2SecClause.charAt(0).toUpperCase() + _d2SecClause.slice(1) + '.' : '';
                    _phys = _d2Open3 + _d2St3;
                    _act  = _d2PNearCeil ? 'Studio can test whether taxes, income timing, and account sequencing can support your Datum at this level.' : _d2Bridge;
                } else if (_d2PShiftDn) {
                    var _d2Open4 = 'Compared with your Discover Shape, the Shape shifted lower.';
                    if (_d2Dp) { switch (_d2Dom.key) { case 'capital': _d2Open4 = _d2Dp + ' shifted the Shape lower — lower capital reduced both boundaries.'; break; case 'contrib': _d2Open4 = _d2Dp + ' shifted the Shape lower — fewer contributions reduced both boundaries.'; break; case 'retire': _d2Open4 = _d2Dp + ' shifted the Shape lower — earlier retirement narrowed both boundaries.'; break; case 'age': _d2Open4 = _d2Dp + ' shifted the Shape lower — starting later shortened the compounding window.'; break; } }
                    var _d2St4 = _d2SecDriving && _d2SecClause ? ' ' + _d2SecClause.charAt(0).toUpperCase() + _d2SecClause.slice(1) + '.' : '';
                    _phys = _d2Open4 + _d2St4;
                    _act  = _d2PNearFloor ? 'Studio can inspect lower-bound resilience and test whether contribution or timing changes can restore the Floor.' : _d2Bridge;
                } else if (_d2DatumChg && Math.abs(_d2PDatPctCur - _d2PDatPctPin) > 0.08) {
                    if (ptsEnd.datumSpend > _d2PDatumPin) {
                        _phys = 'Compared with your Discover Shape, your Datum moved ' + _d2Mag[_d2DatumBand] + ' closer to the Ceiling, leaving less room for market disappointment.';
                        _act  = 'Studio can test whether tax architecture and income timing support a Datum ' + _d2DatumPct + '% higher across your actual account types.';
                    } else {
                        _phys = 'Compared with your Discover Shape, your Datum moved ' + _d2Mag[_d2DatumBand] + ' closer to the Floor, adding buffer between your target and the survival boundary.';
                        _act  = 'Studio can test whether the additional margin creates room for an earlier date or additional savings goals.';
                    }
                } else if (_d2MktChg) {
                    if (paradigm === 'stress') {
                        _phys = 'Compared with your Discover Shape, stress assumptions narrowed the Shape and lowered the spending boundaries.';
                        _act  = "Studio can test this Shape across the full engine's probability-weighted paths instead of the Sketch's broad-stroke model.";
                    } else if (paradigm === 'optimistic') {
                        _phys = 'Compared with your Discover Shape, optimistic assumptions widened the Shape and raised the spending boundaries.';
                        _act  = "Studio can model how often this upside case occurs across thousands of simulated market paths.";
                    } else {
                        _phys = 'Compared with your Discover Shape, market conditions changed and shifted the spending boundaries.';
                        _act  = "Studio can test this Shape across the full engine instead of the Sketch's broad-stroke paths.";
                    }
                } else {
                    _phys = 'Compared with your Discover Shape, the spending boundaries changed slightly.';
                    _act  = 'Studio can model this change against your actual accounts and income sequencing.';
                }
                // ── ML prepend (Step 2b) ────────────────────────────────────
                if (_d2Lw.length >= 2 && _d2Pchg.length > 0) {
                    var _d2MlShLevs   = _d2Lw.filter(function(l) { return l.key !== 'datum' && l.key !== 'infl'; });
                    var _d2MlHasDatum = _d2Lw.some(function(l)   { return l.key === 'datum'; });
                    var _d2MlLevNm = function(key) {
                        switch (key) {
                            case 'retire':  return _d2RetireDelta  > 0 ? 'a later retirement date' : 'an earlier retirement date';
                            case 'capital': return _d2CapDelta     > 0 ? 'higher capital'           : 'lower capital';
                            case 'contrib': return _d2ContribDelta > 0 ? 'higher contributions'     : 'lower contributions';
                            case 'datum':   return 'a Datum shift';
                            case 'market':  return paradigm === 'optimistic' ? 'optimistic market assumptions' : 'stress market assumptions';
                            case 'age':     return _d2AgeDelta     > 0 ? 'a later start'            : 'an earlier start';
                            case 'plan':    return _d2PlanDelta    < 0 ? 'a shorter retirement length' : 'a longer retirement length';
                            default:        return key;
                        }
                    };
                    var _d2MlShPos = function(key) {
                        switch (key) {
                            case 'retire':  return _d2RetireDelta  > 0;
                            case 'capital': return _d2CapDelta     > 0;
                            case 'contrib': return _d2ContribDelta > 0;
                            case 'market':  return paradigm === 'optimistic';
                            case 'age':     return _d2AgeDelta     < 0;
                            case 'plan':    return _d2PlanDelta    < 0;
                            default:        return true;
                        }
                    };
                    var _d2MlStKey   = gbPinnedState.stateObj ? (gbPinnedState.stateObj.key || '') + '_' + (gbPinnedState.stateObj.subZone || '') : '';
                    var _d2MlParadox = (_d2MlStKey === 'abundant_JUST_BELOW' || _d2MlStKey === 'abundant_WELL_BELOW' || _d2MlStKey === 'grounded_TIGHT' || _d2MlStKey === 'expansive_FLOOR_SIDE');
                    // ── Phase 2.6 Surface A: 18-template ML Direction Matrix ────────────
                    // Direction-first sorted shape lever labels: builders (↑) then reducers (↓), each by |impact|
                    var _d2UpL = _d2MlShLevs.filter(function(l) { return _d2MlShPos(l.key); });
                    var _d2DnL = _d2MlShLevs.filter(function(l) { return !_d2MlShPos(l.key); });
                    var _d2DirLw = _d2UpL.concat(_d2DnL);
                    var _d2LvLbl = _d2DirLw.map(function(l) { return _d2MlLevNm(l.key); });
                    var _d2PrimLev = _d2MlShLevs.length > 0 ? _d2MlLevNm(_d2MlShLevs[0].key) : '';
                    var _d2NUp = _d2UpL.length, _d2Nn = _d2MlShLevs.length;
                    var _d2FmtKs = function(v) { return '$' + Math.round(Math.abs(v)) + 'k/yr'; };
                    var _d2CeilGapFmt  = _d2FmtKs(ptsEnd.ceilSpend - ptsEnd.datumSpend);
                    var _d2FlrDeltaFmt = _d2FmtKs(ptsEnd.floorSpend - (gbEnd ? gbEnd.floorSpend : 0));
                    var _d2NewDatFmt   = _d2FmtKs(s.targetSpend);
                    var _d2FillT = function(t) {
                        return t.replace(/{lever1}/g,_d2LvLbl[0]||'').replace(/{lever2}/g,_d2LvLbl[1]||'')
                                .replace(/{lever3}/g,_d2LvLbl[2]||'').replace(/{lever4}/g,_d2LvLbl[3]||'')
                                .replace(/{lever5}/g,_d2LvLbl[4]||'').replace(/{lever6}/g,_d2LvLbl[5]||'')
                                .replace(/{primaryLever}/g,_d2PrimLev)
                                .replace(/{ceilGap_fmt}/g,_d2CeilGapFmt).replace(/{floorDelta_fmt}/g,_d2FlrDeltaFmt)
                                .replace(/{newDatum_fmt}/g,_d2NewDatFmt);
                    };
                    var _d2DirT = [
                        {n:2,u:2,o:"Two changes moved in the same direction — {lever1} and {lever2}. The Ceiling is now {ceilGap_fmt} above your spending line and the floor has lifted {floorDelta_fmt} from your pin.",s:"Test whether the target should rise to use what both moves made possible — or confirm the wider gap was the intended outcome.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:2,u:0,o:"Two changes pulled back simultaneously — {lever1} and {lever2}. The Ceiling has dropped {ceilGap_fmt} closer to your spending line and the floor has thinned by {floorDelta_fmt} from your pin.",s:"Name whether this is a deliberate reduction in ask, or whether one of these moves was unintentional — because both are now compressing the plan together.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:2,u:1,o:"{lever1} built plan while {lever2} pulled it back. The net effect is modest — the Ceiling moved {ceilGap_fmt} from your pin and the floor shifted {floorDelta_fmt}.",s:"Test whether the building lever alone gets you where you need — or whether the pullback was intentional and the modest net outcome is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:3,o:"Three changes landed in the same direction — {lever1}, {lever2}, and {lever3}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor has moved {floorDelta_fmt} from your pin. {primaryLever} is doing most of the work.",s:"Test whether the target should rise to use what these three moves made possible — or confirm the wider gap was the intended outcome.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:0,o:"Three changes reduced the plan together — {lever1}, {lever2}, and {lever3}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has thinned {floorDelta_fmt} from your pin. {primaryLever} is responsible for most of that compression.",s:"Confirm whether all three pullbacks were deliberate — if one wasn't, it's compressing capacity alongside the ones that were.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:2,o:"{lever1} and {lever2} built plan while {lever3} pulled in the other direction. The net result: the Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin — positive, but partially offset.",s:"Test whether removing the downward move would close the remaining gap cleanly, or whether the offset was an intentional trade.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:3,u:1,o:"{lever1} built plan, but {lever2} and {lever3} pulled it back harder. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has thinned {floorDelta_fmt} from your pin.",s:"The two downward moves are outweighing the one building lever. Name whether both reductions were intentional — or bring this to Studio to see what the compression looks like against your real account structure.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:4,o:"Four levers moved in the same direction — {lever1}, {lever2}, {lever3}, and {lever4}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor lifted {floorDelta_fmt} from your pin. {primaryLever} is carrying the most weight, but all four are contributing.",s:"Consider whether the target should rise to meet what four simultaneous moves created — or take the full picture to Studio to test whether it holds under real sequence-of-returns pressure.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while {lever4} pulled back. The Ceiling is now {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. {primaryLever} is the lead driver; {lever4} partially offset it.",s:"Test whether removing the downward move adds meaningfully to the outcome — or confirm the offset was intentional.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:2,o:"Four levers moved in two directions — {lever1} and {lever2} built plan, {lever3} and {lever4} pulled it back. The net effect is muted: the Ceiling shifted {ceilGap_fmt} and the floor moved {floorDelta_fmt} from your pin. The building and reducing forces are closely matched.",s:"Isolate which building lever delivers the most lift per move, and which reducing lever costs the most — then decide which pair to keep.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:1,o:"Three levers pulled the plan back — {lever2}, {lever3}, and {lever4} — while only {lever1} built plan. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"Name whether three simultaneous reductions were all deliberate. If one wasn't, it's compressing the plan alongside the ones that were — and the single building lever isn't enough to offset all three.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:4,u:0,o:"All four levers reduced the plan simultaneously — {lever1}, {lever2}, {lever3}, and {lever4}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. {primaryLever} is doing the most compression.",s:"Confirm all four reductions were intentional. If this is a deliberate low-ask scenario, the widening gap between Floor and spending line may be where Studio can surface what the plan is actually able to carry.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:5,o:"All five levers moved in the same direction — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5}. The Ceiling is now {ceilGap_fmt} above your spending line; the floor lifted {floorDelta_fmt} from your pin. At this level of simultaneous movement, {primaryLever} is the lead driver but individual lever effects become harder to attribute cleanly.",s:"This is the boundary of what the Sketch can attribute cleanly. Name the one or two changes you'd actually make, and bring the rest to Studio for a sequence-aware read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:4,o:"Four levers built plan — {lever1}, {lever2}, {lever3}, and {lever4} — while {lever5} pulled against them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The single downward move is a minor offset against strong net-positive movement.",s:"Test whether removing the downward move adds meaningfully — or confirm it was a deliberate trade and the net outcome is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while {lever4} and {lever5} partially offset them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The building levers are winning, but not cleanly.",s:"Isolate whether both reducing moves were intentional. If one wasn't, it's costing capacity against three levers that are working in the right direction.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:2,o:"Two levers built plan — {lever1} and {lever2} — but three pulled harder in the other direction: {lever3}, {lever4}, and {lever5}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"The reducing levers are outweighing the building ones. Name whether all three pullbacks were intentional — or bring this to Studio to see what the compression looks like against your real accounts and income timing.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:1,o:"Four levers pulled the plan back — {lever2}, {lever3}, {lever4}, and {lever5} — while only {lever1} added capacity. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. The single building lever is not enough to offset four simultaneous reductions.",s:"Confirm all four reductions were deliberate. If even one wasn't, it's compressing the plan alongside the others — and the Sketch can't cleanly untangle the combined effect from here.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:5,u:0,o:"All five levers reduced the plan at once — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5}. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor compressed {floorDelta_fmt} from your pin. This is the boundary of maximum simultaneous reduction in the Sketch.",s:"If this is deliberate — a low-ask scenario, a conservative anchor — the plan has capacity well above where the Datum sits. Studio can show what the full plan could sustain if the ask were allowed to rise.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:6,o:"All six levers moved in the same direction — {lever1}, {lever2}, {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling is now {ceilGap_fmt} above your spending line and the floor lifted {floorDelta_fmt} from your pin. This is the most movement the Sketch can hold at once — every input is pushing the same way, with {primaryLever} doing the most work.",s:"This is the outer edge of what the Sketch can attribute cleanly. Pick the one or two changes you would truly make, and bring the rest to Studio for a sequence-aware read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:5,o:"Five levers built plan — {lever1}, {lever2}, {lever3}, {lever4}, and {lever5} — while {lever6} pulled the other way. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The lone downward move is a minor offset against five working together.",s:"Test whether removing the single pullback adds anything meaningful — or confirm it was a deliberate trade and the strongly positive net is the right read.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:4,o:"Four levers built plan — {lever1}, {lever2}, {lever3}, and {lever4} — while {lever5} and {lever6} partially offset them. The Ceiling is {ceilGap_fmt} above your spending line and the floor moved {floorDelta_fmt} from your pin. The building levers are still winning, but two pullbacks are trimming the gain.",s:"Isolate whether both reducing moves were intentional. If either was not, it is costing capacity against four levers pulling the right way.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:3,o:"Three levers built plan — {lever1}, {lever2}, and {lever3} — while three pulled it back: {lever4}, {lever5}, and {lever6}. The forces are evenly matched, so the net is muted — the Ceiling shifted {ceilGap_fmt} and the floor moved {floorDelta_fmt} from your pin. {primaryLever} carries the most weight on whichever side wins.",s:"Six levers split evenly cancel most of their own effect. Name which one or two you would actually keep — the Sketch cannot untangle a six-way tie cleanly from here, and Studio can read the trade sequence-aware.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:2,o:"Two levers built plan — {lever1} and {lever2} — but four pulled harder in the other direction: {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor thinned {floorDelta_fmt} from your pin.",s:"The reducing levers are outweighing the building ones. Confirm all four pullbacks were deliberate — or bring this to Studio to see what the compression looks like against your real accounts.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:1,o:"Five levers pulled the plan back — {lever2}, {lever3}, {lever4}, {lever5}, and {lever6} — while only {lever1} added capacity. The Ceiling is now {ceilGap_fmt} closer to your spending line and the floor has compressed {floorDelta_fmt} from your pin. The single building lever cannot offset five moving the other way.",s:"Confirm all five reductions were deliberate. If even one was not, it is compressing the plan alongside the others — and the Sketch cannot cleanly separate the combined effect from here.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."},
                        {n:6,u:0,o:"All six levers reduced the plan at once — {lever1}, {lever2}, {lever3}, {lever4}, {lever5}, and {lever6}. The Ceiling has moved {ceilGap_fmt} closer to your spending line and the floor compressed {floorDelta_fmt} from your pin. This is maximum simultaneous reduction — every input pulling down together.",s:"If this is deliberate — a low-ask scenario or a conservative anchor — the plan still has capacity well above where the Datum sits. Studio can show what the full plan could sustain if the ask were allowed to rise.",c:"Studio can test whether your accounts and income structure can actually support spending at {newDatum_fmt} — and what sequencing makes it most tax-efficient."}
                    ];
                    var _d2DirMatch = null;
                    if (_d2Nn >= 2 && _d2Nn <= 6) {
                        for (var _d2Ti = 0; _d2Ti < _d2DirT.length; _d2Ti++) {
                            if (_d2DirT[_d2Ti].n === _d2Nn && _d2DirT[_d2Ti].u === _d2NUp) { _d2DirMatch = _d2DirT[_d2Ti]; break; }
                        }
                    }
                    if (_d2DirMatch) {
                        _phys = _d2FillT(_d2DirMatch.o);
                        _phys = _phys.charAt(0).toUpperCase() + _phys.slice(1);
                        _act  = _d2FillT(_d2DirMatch.s) + ' ' + _d2FillT(_d2DirMatch.c);
                    } else {
                        // ── Fallback: Round 6 ML_01-ML_08 prepend system ────────────────
                        var _d2MlA = _d2Dom ? _d2MlLevNm(_d2Dom.key) : 'the first input';
                        var _d2MlB = _d2Sec ? _d2MlLevNm(_d2Sec.key) : 'the second input';
                        var _d2MlPrepend = '';
                        if (_d2Lw.length >= 3) {
                            var _d2MlNW = {1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six'};
                            var _d2MlCount = _d2MlNW[_d2Lw.length] || String(_d2Lw.length);
                            var _d2MlAllNm = _d2Lw.map(function(l) { return _d2MlLevNm(l.key); });
                            var _d2MlList  = _d2MlAllNm.slice(0, -1).join(', ') + ', and ' + _d2MlAllNm[_d2MlAllNm.length - 1];
                            _d2MlPrepend = _d2MlCount + ' inputs moved simultaneously — ' + _d2MlList + '. Identify the primary driver (≥50% of impact) and note whether the secondary levers amplified or offset it. ';
                        } else if (_d2MlHasDatum && _d2MlShLevs.length === 1) {
                            var _d2MlSl      = _d2MlShLevs[0];
                            var _d2MlDatDir  = _d2DatumDelta > 0 ? 'up' : 'down';
                            var _d2MlSlNm    = _d2MlLevNm(_d2MlSl.key);
                            var _d2MlDatImpr = _d2DatumDelta < 0;
                            var _d2MlSlImpr  = _d2MlShPos(_d2MlSl.key);
                            _d2MlPrepend = (_d2MlDatImpr === _d2MlSlImpr ? ML_06 : ML_07).replace('[direction]', _d2MlDatDir).replace('[Lever B]', _d2MlSlNm) + ' ';
                        } else if (_d2MlShLevs.length >= 2) {
                            var _d2MlPosA    = _d2MlShPos(_d2MlShLevs[0].key);
                            var _d2MlPosB    = _d2MlShPos(_d2MlShLevs[1].key);
                            var _d2MlPattern = (_d2MlPosA !== _d2MlPosB) ? 'OFFSET' : (_d2MlParadox && _d2MlPosA) ? 'PARADOX' : 'AMPLIFIED';
                            if (_d2MlPattern !== 'OFFSET') {
                                _d2MlPrepend = (_d2MlPosA ? ML_01 : ML_02).replace('[Lever A]', _d2MlA).replace('[Lever B]', _d2MlB) + ' ';
                            } else {
                                var _d2MlOffTmpl = (_d2PWidened || _d2PShiftUp) ? ML_03 : (_d2PCompressed || _d2PShiftDn) ? ML_04 : ML_05;
                                _d2MlPrepend = _d2MlOffTmpl.replace('[Lever A]', _d2MlA).replace('[Lever B]', _d2MlB) + ' ';
                            }
                        }
                        if (_d2MlPrepend) _phys = _d2MlPrepend + _phys;
                    }
                }
                if (_d2Pchg.length > 0) {
                    var _d2Sn = { capital:'Capital', datum:'Datum', contrib:'Contributions', retire:'Retirement', market:'Market', age:'Age', plan:'Plan-Through' };
                    var _d2FCap = function(v) { return v >= 1 ? '$' + v.toFixed(2) + 'M' : '$' + Math.round(v * 1000) + 'k'; };
                    var _d2FDat = function(v) { return v >= 1000 ? '$' + (v/1000).toFixed(2).replace(/\.00$/,'') + 'M' : '$' + Math.round(v) + 'k'; };
                    var _d2FCon = function(v) { return v >= 1000 ? '$' + Math.round(v/1000) + 'k' : '$' + Math.round(v); };
                    var _d2Ci = [];
                    if (_d2RetireChg)  _d2Ci.push({ k:'retire',  up:_d2RetireDelta>0,  from:String(gb.activationAge), to:String(retire) });
                    if (_d2AgeChg)     _d2Ci.push({ k:'age',     up:_d2AgeDelta>0,     from:String(gb.currentAge),    to:String(age) });
                    if (_d2CapChg)     _d2Ci.push({ k:'capital', up:_d2CapDelta>0,     from:_d2FCap(gb.portfolioVol), to:_d2FCap(ds.port) });
                    if (_d2DatumChg)   _d2Ci.push({ k:'datum',   up:_d2DatumDelta>0,   from:_d2FDat(gb.targetSpend),  to:_d2FDat(s.targetSpend) });
                    if (_d2ContribChg) _d2Ci.push({ k:'contrib', up:_d2ContribDelta>0, from:_d2FCon(gb.annualContrib), to:_d2FCon(ds.contrib) });
                    if (_d2PlanChg)    _d2Ci.push({ k:'plan',    up:_d2PlanDelta<0, from:String(gb.planThroughAge||93)+' yrs', to:String(ds.planThroughAge||93)+' yrs' });
                    if (_d2MktChg)     _d2Ci.push({ k:'market',  up:null, from:gbPinnedState.pinnedParadigm, to:_d2CurMkt });
                    _d2ChangeHtml = _d2Ci.map(function(it) {
                        var _nl = '<span style="color:rgba(255,255,255,0.5)">' + (_d2Sn[it.k] || it.k) + '</span>';
                        var _vl = '<span class="pin-change-values">' + it.from + ' → ' + it.to + '</span>';
                        if (it.up === null) return '<span class="pin-change-item">' + _nl + _vl + '</span>';
                        var _ar = it.up ? '<span class="pin-change-arrow-up">↑</span>' : '<span class="pin-change-arrow-down">↓</span>';
                        return '<span class="pin-change-item">' + _nl + _ar + _vl + '</span>';
                    }).join('');
                }
                // Lever attribution: identical format to Screen 1 ("Datum Spend (+$900k, 50.7% of range)")
                var _d2LNames = { capital:'Portfolio Balance', datum:'Datum Spend', contrib:'Annual Contributions', retire:'Retirement Age', market:'Market Paradigm', age:'Current Age', plan:'Plan-Through' };
                if (_d2Dom) {
                    var _d2DomPct = (_d2Twt > 0 ? (_d2Dom.w / _d2Twt * 100) : 100).toFixed(1);
                    var _d2LDetail = '';
                    switch (_d2Dom.key) {
                        case 'capital': { var _d2Sgn = _d2CapDelta >= 0 ? '+' : '−'; var _d2AbsC = Math.abs(_d2CapDelta); var _d2AbsS = _d2AbsC >= 1 ? '$' + _d2AbsC.toFixed(2) + 'M' : '$' + Math.round(_d2AbsC * 1000) + 'k'; _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'datum':   { var _d2Sgn = _d2DatumDelta >= 0 ? '+' : '−'; var _d2AbsD = Math.abs(_d2DatumDelta); var _d2AbsS = _d2AbsD >= 1000 ? '$' + (_d2AbsD/1000).toFixed(2) + 'M' : '$' + Math.round(_d2AbsD) + 'k'; _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'contrib': { var _d2Sgn = _d2ContribDelta >= 0 ? '+' : '−'; var _d2AbsS = _d2ContribAbs >= 1000 ? '$' + Math.round(_d2ContribAbs/1000) + 'k' : '$' + Math.round(_d2ContribAbs); _d2LDetail = _d2Sgn + _d2AbsS + ', ' + _d2DomPct + '% of range'; break; }
                        case 'retire':  { var _d2Sgn = _d2RetireDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2RetireAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'age':     { var _d2Sgn = _d2AgeDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2AgeAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'plan':    { var _d2Sgn = _d2PlanDelta >= 0 ? '+' : '−'; _d2LDetail = _d2Sgn + _d2PlanAbs + ' yr, ' + _d2DomPct + '% of range'; break; }
                        case 'market':  _d2LDetail = '→ ' + _d2CurMkt + ', ' + _d2DomPct + '% of range'; break;
                        default:        _d2LDetail = _d2DomPct + '% of range';
                    }
                    _d2DomLever = (_d2LNames[_d2Dom.key] || _d2Dom.key) + ' (' + _d2LDetail + ')';
                } else {
                    _d2DomLever = _d2Pchg.length > 0 ? 'No dominant lever — multiple small adjustments' : 'No movement yet — adjust a slider to see lever attribution';
                }
    return { phys: _phys, act: _act, changeHtml: _d2ChangeHtml, domLever: _d2DomLever };
  }
  DatumShape.S2Copy.buildMultiLever = buildMultiLever;
}(typeof window !== 'undefined' ? window : this));
