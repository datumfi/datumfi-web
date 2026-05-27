// WS-H: 66-string prose registry replacement
// Applies V11 locked content to _S3 registry in sketch.html
// Composite tokens: {ceilLineHave}/{floorLineHave}/{ceilLineWant}/{floorLineWant} preserved

const fs = require('fs');
const filePath = 'C:/Users/tmnte/datumfi-web/sketch.html';
let html = fs.readFileSync(filePath, 'utf8');

const H = {}; // HAVE strings
const W = {}; // WANT strings

// ── HAVE strings ──────────────────────────────────────────────────

H['S3.C2.OVEREXTENDED-STRUCTURAL.HAVE.AVG'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The most the plan can structurally carry.
   {floorLineHave}. The downside line if markets disappoint.

Your spending target sits significantly above the Ceiling — meaningfully above what this portfolio can structurally support. This is a stress-test, not a plan state. The question isn't whether this works today — it doesn't — it's what would need to change for it to work.`;

H['S3.C2.OVEREXTENDED-STRUCTURAL.HAVE.STR'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The most the plan can structurally carry in tougher conditions.
   {floorLineHave}. The protected downside line.

Your spending target sits significantly above the Ceiling — and under stress that gap widens. This Shape doesn't hold; in tougher markets it breaks faster. Something has to change before this can carry.`;

H['S3.C2.OVEREXTENDED-STRUCTURAL.HAVE.OPT'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge even when markets cooperate.
   {floorLineHave}. The protected downside line.

Even under optimistic conditions, your spending target sits significantly above the Ceiling. Favorable markets aren't enough to close this gap — the structural shortfall is too large. Something fundamental has to change.`;

H['S3.C2.OVEREXTENDED-ENTRY.HAVE.AVG'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The most the plan can structurally carry.
   {floorLineHave}. The downside line if markets disappoint.

Your spending target sits just above the Ceiling — you've crossed the line, but only narrowly. This isn't a deep structural break yet; it's the entry zone where the plan starts to depend on things going better than expected. Small adjustments now keep small things small.`;

H['S3.C2.OVEREXTENDED-ENTRY.HAVE.STR'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The most the plan can structurally carry under stress.
   {floorLineHave}. The protected downside line.

Your spending target sits just above the Ceiling — and under stress, that narrow gap matters more. You're in the entry zone, where the plan starts depending on favorable conditions. Worth addressing while the move required is still small.`;

H['S3.C2.OVEREXTENDED-ENTRY.HAVE.OPT'] = `THE SHAPE YOU HAVE: OVEREXTENDED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Even under optimistic conditions, your spending target sits just above the Ceiling. You've narrowly crossed the line, but you're relying on favorable markets to make it work. That's a thin reed. Worth knowing this is the entry zone — the threshold where the plan stops carrying you on its own.`;

H['S3.C2.STRETCHED-HIGH_END.HAVE.AVG'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits right up against the Ceiling — the plan reaches this lifestyle, but mostly when markets cooperate. Good years are doing nearly all the heavy lifting. The margin above is thin, and any disappointment lands more directly on you.`;

H['S3.C2.STRETCHED-HIGH_END.HAVE.STR'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits right up against the Ceiling — and under stress, that ceiling drops. The plan is pulling everything it can to carry this lifestyle, with almost nothing held back. This Shape works only when conditions hold together. Worth knowing where the line is when they don't.`;

H['S3.C2.STRETCHED-HIGH_END.HAVE.OPT'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits right up against the Ceiling — even under optimistic conditions. Favorable markets are what makes this Shape work, not what makes it comfortable. The good news is the plan reaches this lifestyle. The harder news is you've used most of the room.`;

H['S3.C2.STRETCHED-STANDARD.HAVE.AVG'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits in the upper part of the supported range — the plan carries this lifestyle, but with less margin than a more centered position would give you. Good years are doing more of the heavy lifting now. You haven't crossed into trouble, but the buffer above is leaner.`;

H['S3.C2.STRETCHED-STANDARD.HAVE.STR'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits in the upper part of the supported range — and stress narrows that range. The plan still carries this lifestyle in tougher markets, but with less room to absorb surprises. Worth watching how the margin moves as conditions shift.`;

H['S3.C2.STRETCHED-STANDARD.HAVE.OPT'] = `THE SHAPE YOU HAVE: STRETCHED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits in the upper part of the supported range — even under optimistic conditions. The good news: the plan handles this comfortably when markets deliver. The honest read: you're closer to the upper edge than a centered position would put you.`;

H['S3.C2.EXPANSIVE-CEILING_SIDE.HAVE.AVG'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits in the upper portion of the supported range. Good years are doing more of the heavy lifting — the plan reaches this lifestyle, but the Ceiling is closer than it was. You haven't left EXPANSIVE territory, but you've traded some of the buffer that makes a more centered position comfortable.`;

H['S3.C2.EXPANSIVE-CEILING_SIDE.HAVE.STR'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits in the upper portion of the supported range — and under stress, the Ceiling is even closer. You're still inside EXPANSIVE, but the buffer above is real and worth watching. The number where the plan starts depending on things going well — that's the boundary worth knowing.`;

H['S3.C2.EXPANSIVE-CEILING_SIDE.HAVE.OPT'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits in the upper portion of the supported range — even when conditions cooperate. You're well inside EXPANSIVE, but closer to the Ceiling than to the Floor. The plan carries this lifestyle comfortably under favorable markets; the position is more about how much room you want than whether the plan holds.`;

H['S3.C2.EXPANSIVE-CENTERED.HAVE.AVG'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits squarely in the middle of what the plan can support. Neither edge is close, and the plan works across most futures. The range is wide because real-world variables aren't fully modeled yet. Right now outcomes are roughly balanced around your target — neither pressing toward stress nor accumulating obvious surplus.`;

H['S3.C2.EXPANSIVE-CENTERED.HAVE.STR'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits squarely in the middle of the supported range. Even under stress, neither edge is close — the plan works across most tougher futures. This is the position where the plan absorbs surprises most easily; outcomes stay roughly balanced around your target.`;

H['S3.C2.EXPANSIVE-CENTERED.HAVE.OPT'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits squarely in the middle of the supported range — even under optimistic conditions. Neither edge is close; the plan works across most favorable futures. This is the position with the most flexibility — outcomes stay roughly balanced regardless of which way conditions break.`;

H['S3.C2.EXPANSIVE-FLOOR_SIDE.HAVE.AVG'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits in the lower portion of the supported range — closer to the Floor than the Ceiling, with substantial Ceiling headroom above. You're well inside EXPANSIVE; the plan carries this lifestyle comfortably, and there's a lot of capacity above your target that the plan can support and you're not using.`;

H['S3.C2.EXPANSIVE-FLOOR_SIDE.HAVE.STR'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits in the lower portion of the supported range — closer to the Floor than the Ceiling. Even under stress, the plan carries this lifestyle comfortably, with substantial unused Ceiling capacity above. Whether that capacity is buffer or surplus is worth naming.`;

H['S3.C2.EXPANSIVE-FLOOR_SIDE.HAVE.OPT'] = `THE SHAPE YOU HAVE: EXPANSIVE

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits in the lower portion of the supported range — even under optimistic conditions. There's substantial Ceiling headroom above that the plan can support and you're not using. Worth knowing what that headroom represents: buffer, future flexibility, or capacity you've chosen to leave unclaimed.`;

H['S3.C2.GROUNDED-STABLE.HAVE.AVG'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits squarely between the Floor and the Ceiling — well-supported by what the plan can deliver. The plan carries this lifestyle even under stress, with meaningful room still above before conditions start to matter. Outcomes are roughly balanced around your target.`;

H['S3.C2.GROUNDED-STABLE.HAVE.STR'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits squarely between the Floor and the Ceiling — even under stress, the plan carries this lifestyle. This is what the Shape looks like when conditions don't cooperate: still supported, still anchored, with margin on both sides.`;

H['S3.C2.GROUNDED-STABLE.HAVE.OPT'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits squarely between the Floor and the Ceiling — well-supported when conditions cooperate. The plan carries this lifestyle with substantial room to spare. The position is comfortable; the question becomes what the headroom above is for.`;

H['S3.C2.GROUNDED-TIGHT.HAVE.AVG'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits between the Floor and the Ceiling — but closer to the Floor than a more centered position would put you. The plan still carries this lifestyle, but the cushion between your spending and the downside line is thinner than it could be. Worth knowing where that line is and how much room separates you from it.`;

H['S3.C2.GROUNDED-TIGHT.HAVE.STR'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits between the edges, but closer to the Floor — and under stress, that gap matters more. The plan still carries this lifestyle, but the buffer below is thin. This is still a supported position; the cushion that protects you is just narrower than it could be.`;

H['S3.C2.GROUNDED-TIGHT.HAVE.OPT'] = `THE SHAPE YOU HAVE: GROUNDED

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits between the edges, but closer to the Floor — even when conditions cooperate. The plan handles this comfortably under favorable markets; the position is more conservative than centered, with a thinner cushion below than above.`;

H['S3.C2.ABUNDANT-JUST_BELOW.HAVE.AVG'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits just below the Floor — you're at or near the most conservative line the plan models. The plan supports this lifestyle even in its bad scenario, with substantial capacity above. There's meaningful room you're not using; whether that's deliberate conservatism or accidental headroom is worth knowing.`;

H['S3.C2.ABUNDANT-JUST_BELOW.HAVE.STR'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits just below the Floor — even under stress, the plan supports this lifestyle. You're operating at the conservative line by choice. Substantial capacity above is intact even in tougher markets. Worth naming what that resilience is doing for you.`;

H['S3.C2.ABUNDANT-JUST_BELOW.HAVE.OPT'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits just below the Floor — and even under optimistic conditions, the gap above represents substantial capacity unused. Whether that's a deliberate conservative anchor or capacity worth reconsidering depends on what the surplus is meant to do.`;

H['S3.C2.ABUNDANT-WELL_BELOW.HAVE.AVG'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under average market conditions — the middle-of-the-road path where returns come in roughly as the long-term record suggests. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan stretches to two outer edges:

   {ceilLineHave}. The upper edge of what the plan can deliver.
   {floorLineHave}. The downside line if markets disappoint.

Your spending sits well below the Floor — you're asking for substantially less than the plan is built to deliver. The plan has substantial room above this Datum, and that surplus is a choice. Whether by design or by default, it represents capacity in years of earlier retirement, larger legacy, or stronger stress resilience.`;

H['S3.C2.ABUNDANT-WELL_BELOW.HAVE.STR'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under stressed market conditions — the tougher path where returns come in worse than the long-term average across your timeline. Under that path, your portfolio projects to about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

Even under stress, the plan reaches to two outer edges:

   {ceilLineHave}. The upper edge under stress.
   {floorLineHave}. The protected downside line.

Your spending sits well below the Floor — even under stress, the plan supports far more than you're asking for. That substantial unused capacity is robust to tougher conditions. The question becomes what that resilience is doing: insurance, optionality, or accidental restraint.`;

H['S3.C2.ABUNDANT-WELL_BELOW.HAVE.OPT'] = `THE SHAPE YOU HAVE: ABUNDANT

You're looking at your current Shape under optimistic market conditions — the favorable path where returns come in above the long-term average across your timeline. On that path, your portfolio is projected to reach about {dDatumM}. Sustaining your Datum of {dDatumK}/yr would actually require closer to {dDatumReqM}.

The plan reaches to two outer edges:

   {ceilLineHave}. The upper edge when markets cooperate.
   {floorLineHave}. The protected downside line.

Your spending sits well below the Floor — and under optimistic conditions, the unused capacity widens further. You're asking for substantially less than the plan can carry. Whether that gap represents deliberate conservatism or unclaimed capacity is worth naming so it's intentional.`;

// ── WANT strings ──────────────────────────────────────────────────

W['S3.C2.OVEREXTENDED-STRUCTURAL.WANT.AVG'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape would need:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits significantly above your designed Ceiling — meaningfully above what this portfolio can structurally support. This is a stress-test of intent, not a plan state. The question isn't whether this works — it doesn't — it's what would need to move for it to work.`;

W['S3.C2.OVEREXTENDED-STRUCTURAL.WANT.STR'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed boundaries would be:

   {ceilLineWant}. The upper edge even under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits significantly above your designed Ceiling — and stress widens that gap further. This Shape doesn't hold under tougher markets. Something fundamental has to shift before it can carry.`;

W['S3.C2.OVEREXTENDED-STRUCTURAL.WANT.OPT'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed boundaries would be:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Even if markets cooperate, your designed spending sits significantly above your designed Ceiling. Favorable conditions aren't enough to close this gap — the structural shortfall is too wide. Something fundamental has to move.`;

W['S3.C2.OVEREXTENDED-ENTRY.WANT.AVG'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape would need:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits just above your designed Ceiling — you've narrowly stepped over the line. This is the entry zone, not a structural break. The plan starts depending on favorable conditions here. Small moves still produce small fixes — worth doing while that's true.`;

W['S3.C2.OVEREXTENDED-ENTRY.WANT.STR'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed boundaries would be:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits just above your designed Ceiling — and under stress, the entry zone matters more. The plan depends on conditions that may not arrive. Worth resolving while the required adjustment is still small.`;

W['S3.C2.OVEREXTENDED-ENTRY.WANT.OPT'] = `THE SHAPE YOU WANT: OVEREXTENDED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed boundaries would be:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Even under optimistic conditions, your designed spending sits just above your designed Ceiling. You've crossed the line by a hair — relying on favorable markets to keep things working. That's a thin reed. The entry zone is where small choices still produce small fixes.`;

W['S3.C2.STRETCHED-HIGH_END.WANT.AVG'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits right up against your designed Ceiling — the plan reaches this lifestyle, but mostly when markets cooperate. Good years would be doing nearly all the heavy lifting. The margin above is thin by design — worth knowing whether that thinness is intended or accidental.`;

W['S3.C2.STRETCHED-HIGH_END.WANT.STR'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits right up against your designed Ceiling — and under stress that gap closes further. This Shape pulls everything it can; almost nothing held back. It works only when conditions hold together. Worth confirming whether that's the trade-off you intended.`;

W['S3.C2.STRETCHED-HIGH_END.WANT.OPT'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Even under optimistic conditions, your designed spending sits right up against your designed Ceiling. Favorable markets are what makes this Shape reach, not what makes it comfortable. You've used most of the room available — worth knowing that's by design.`;

W['S3.C2.STRETCHED-STANDARD.WANT.AVG'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper part of the supported range — the plan carries it, but with less margin than a more centered position would give. Good years would do more of the heavy lifting. Worth knowing whether that leaner buffer is the trade-off you intended.`;

W['S3.C2.STRETCHED-STANDARD.WANT.STR'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper part of the supported range — and under stress the range narrows. The plan still holds, but with less room to absorb surprises. Worth confirming that's the margin you want operating under tougher conditions.`;

W['S3.C2.STRETCHED-STANDARD.WANT.OPT'] = `THE SHAPE YOU WANT: STRETCHED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper part of the supported range — even under optimistic conditions. The plan handles this comfortably when markets cooperate, but you're closer to the upper edge than a centered design would put you. Worth knowing that's intentional.`;

W['S3.C2.EXPANSIVE-CEILING_SIDE.WANT.AVG'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper portion of your designed range. Good years would do more of the heavy lifting. You're still inside EXPANSIVE, but you've placed yourself closer to the Ceiling than the Floor — worth knowing whether that proximity is the trade-off you intended.`;

W['S3.C2.EXPANSIVE-CEILING_SIDE.WANT.STR'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper portion of your designed range — and under stress, the Ceiling is closer still. The Shape holds inside EXPANSIVE, but the buffer above is leaner. Worth confirming that's the position you want when conditions don't cooperate.`;

W['S3.C2.EXPANSIVE-CEILING_SIDE.WANT.OPT'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the upper portion of your designed range — even under optimistic conditions. You're inside EXPANSIVE, closer to the Ceiling than the Floor. The plan handles this comfortably when markets cooperate; the question is how much headroom you actually want.`;

W['S3.C2.EXPANSIVE-CENTERED.WANT.AVG'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits squarely in the middle of your designed range. Neither edge is close, and the plan works across most futures around it. This is where the plan runs most freely — outcomes balanced around your target, with room to absorb surprises in either direction.`;

W['S3.C2.EXPANSIVE-CENTERED.WANT.STR'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits squarely in the middle of your designed range — and even under stress, neither edge is close. This is the position where the plan absorbs tougher conditions most easily. Outcomes stay roughly balanced around your target.`;

W['S3.C2.EXPANSIVE-CENTERED.WANT.OPT'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits squarely in the middle of your designed range — even under optimistic conditions. This is the position with the most flexibility — neither edge pressing, plan running freely, outcomes balanced regardless of which way markets break.`;

W['S3.C2.EXPANSIVE-FLOOR_SIDE.WANT.AVG'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the lower portion of your designed range — closer to the Floor than the Ceiling. There's meaningful capacity above your target that the plan can support and you're not using. Whether that's by design or by default is worth knowing — buffer against rough sequences, room for an earlier retirement, or something to leave behind.`;

W['S3.C2.EXPANSIVE-FLOOR_SIDE.WANT.STR'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the lower portion of your designed range. Even under stress, the plan carries this lifestyle comfortably — substantial Ceiling capacity remains above. Worth naming what that capacity is doing for you in tougher conditions.`;

W['S3.C2.EXPANSIVE-FLOOR_SIDE.WANT.OPT'] = `THE SHAPE YOU WANT: EXPANSIVE

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits in the lower portion of your designed range — even under optimistic conditions. Substantial Ceiling capacity sits above unused. Worth naming what that surplus represents: earlier retirement, larger legacy, or stronger resilience against what the Sketch doesn't model.`;

W['S3.C2.GROUNDED-STABLE.WANT.AVG'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

The plan covers your designed spending even in a bad scenario — and there's real room above before things get tight. You're in a safe position, but safe has a cost: there's meaningful capacity above your target that the plan can support and you're not using. Whether that's by design or by default is worth knowing.`;

W['S3.C2.GROUNDED-STABLE.WANT.STR'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Even under stress, the plan covers your designed spending — with room above before things get tight. This is a resilient Shape: anchored between margins on both sides, intentional rather than accidental. Worth confirming the headroom above is doing what you want it to do.`;

W['S3.C2.GROUNDED-STABLE.WANT.OPT'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Under optimistic conditions, this Shape sits comfortably between margins — the plan covers your designed spending with substantial room above. The position is well-protected; the question is whether the headroom is buffer you want or capacity you've chosen not to use.`;

W['S3.C2.GROUNDED-TIGHT.WANT.AVG'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits between the edges, but you've placed it closer to the Floor than a centered position would. The plan still covers this Shape, but the cushion below is leaner by design. Worth knowing whether that tighter buffer is the trade-off you intended — or whether centering would feel better.`;

W['S3.C2.GROUNDED-TIGHT.WANT.STR'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits between the edges, but closer to the Floor — and under stress, that gap is what protects you. The plan still holds, but the cushion is thinner than it could be. Worth confirming you want this proximity to the downside line operating under tougher conditions.`;

W['S3.C2.GROUNDED-TIGHT.WANT.OPT'] = `THE SHAPE YOU WANT: GROUNDED

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Under optimistic conditions, your designed spending sits between the edges but closer to the Floor than a centered design would put it. The plan handles this comfortably; the position is more conservative than centered, with leaner buffer below than above. Worth knowing that's intentional.`;

W['S3.C2.ABUNDANT-JUST_BELOW.WANT.AVG'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits just below your designed Floor — at or near the conservative line. The plan has meaningful room above this Datum. That surplus is a choice — buffer against rough sequences, room for an earlier retirement, or capital to leave behind. Naming it makes it intentional rather than accidental.`;

W['S3.C2.ABUNDANT-JUST_BELOW.WANT.STR'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits just below your designed Floor — even under stress, the plan supports this lifestyle. The capacity above stays meaningful in tougher conditions. Worth naming what that resilience is built for: stress protection, future flexibility, or intentional restraint.`;

W['S3.C2.ABUNDANT-JUST_BELOW.WANT.OPT'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Under optimistic conditions, your designed spending sits just below your designed Floor — and the unused capacity above grows. Whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering depends on what you want it doing in years of earlier retirement, larger legacy, or stronger stress resilience.`;

W['S3.C2.ABUNDANT-WELL_BELOW.WANT.AVG'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under average market conditions. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

At those designed boundaries, this Shape stretches to:

   {ceilLineWant}. The upper edge you've set.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits well below your designed Floor — you're asking for substantially less than the plan is built to deliver. That surplus is a choice — buffer against rough sequences, room for an earlier retirement, or capital to leave behind. Naming it makes it intentional rather than accidental.`;

W['S3.C2.ABUNDANT-WELL_BELOW.WANT.STR'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under stressed market conditions — even when returns come in worse than average. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

Under that tougher path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge under stress.
   {floorLineWant}. The downside line you've drawn.

Your designed spending sits well below your designed Floor — even under stress, the plan carries far more than you're asking for. That substantial unused capacity is robust to tougher conditions. Worth naming what that resilience is built for: stress protection, future optionality, or intentional restraint.`;

W['S3.C2.ABUNDANT-WELL_BELOW.WANT.OPT'] = `THE SHAPE YOU WANT: ABUNDANT

The Shape you've designed projects to about {gbDatumM} by retirement under optimistic market conditions — when conditions cooperate. Sustaining your designed Datum of {gbDatumK}/yr would actually require closer to {gbDatumReqM}.

On that favorable path, your designed Shape stretches to:

   {ceilLineWant}. The upper edge when markets deliver.
   {floorLineWant}. The downside line you've drawn.

Under optimistic conditions, your designed spending sits well below your designed Floor — and the unused capacity widens further. Studio can show whether that surplus represents a deliberate conservative anchor or capacity worth reconsidering — in years of earlier retirement, larger legacy, or stronger stress resilience.`;

// ── Apply replacements ────────────────────────────────────────────

const all = Object.assign({}, H, W);
let changed = 0;
let notFound = [];

for (const [key, newVal] of Object.entries(all)) {
  const keyStr = "'" + key + "': \`";
  const startIdx = html.indexOf(keyStr);
  if (startIdx === -1) { notFound.push(key); continue; }
  const bodyStart = startIdx + keyStr.length;
  const bodyEnd = html.indexOf('\`', bodyStart);
  if (bodyEnd === -1) { notFound.push('NO_CLOSE:' + key); continue; }
  html = html.slice(0, bodyStart) + newVal + html.slice(bodyEnd);
  changed++;
}

console.log('Replaced: ' + changed + ' / ' + Object.keys(all).length);
if (notFound.length) console.error('NOT FOUND:', notFound.join(', '));

fs.writeFileSync(filePath, html, 'utf8');
console.log('Done.');
