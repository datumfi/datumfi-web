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
}(typeof window !== 'undefined' ? window : this));
