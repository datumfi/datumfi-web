/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   THE OPERATING UPKEEP CATALOGUE — ONE CATALOGUE, TWO SCOPES.

   ⭐ THE FIRST PART FILE. Registered in scripts/_studio_source.cjs's PARTS list, so the ~90 gates
   that read the Studio source still see these definitions and the twelve sandbox gates that lift
   dependencies out of that string keep resolving. Built as a part rather than as more inline
   studio.html because the Studio splits into seven phase pages shortly and THE UPKEEP CATALOGUE
   LIVES IN THE **TENSION** PHASE — this file is written to be consumed by a page that is not
   studio.html, because within weeks it will be.

   ⛔⛔ PLAIN TOP-LEVEL FUNCTIONS. NOT AN IIFE, NOT A window.X = {...} NAMESPACE, AND THAT IS
   STRUCTURAL RATHER THAN STYLISTIC. The sandbox gates extract a function's TEXT with lift() and run
   it inside `new Function(...)` with a stubbed `window`. A namespace object would be invisible to
   lift() and undefined in the sandbox, so every gate slicing calcCarryTotal -> _canonUtil ->
   _propUpkeepAnnual would die on a ReferenceError. A top-level `function` declaration is both
   liftable AND a global in the browser. Same reasoning that made _propUpkeepCatalogue a function
   instead of a var in the first place (studio.html ~3492) — one layer further out.

   ⭐ SCOPE IS AN ATTRIBUTE, NOT A PREFIX (§45.5). One catalogue, ONE ROW PER CONCEPT, each row
   carrying the scopes it belongs to. ⛔ NO vehMaintenance, NO vehInsurance. The deciding argument is
   §40.2's, applied a third time: THE STORED KEY IS THE CONCEPT; THE LABEL IS THE COSTUME. Marine and
   auto insurance are one stored field with a swapped label, so `insurance` must not fork either, or
   §40.2 and §45.5 would contradict each other ON THE SAME DOLLAR.

   ⚠️ AND THE HOVER IS SCOPED FOR A CORRECTNESS REASON, NOT A TIDINESS ONE. `maintenance` is shared
   by both scopes, and the PROPERTY hover cites "about 1% of the home's value a year". That sentence
   is FALSE about a car. A shared row with an unscoped hover would print a house's rule of thumb
   inside a vehicle room — which is worse than silence, because it is confidently wrong.

   🖊️ ✅ THE SIX VEHICLE HOVERS ARE §47.1, AUTHORED AND WIRED VERBATIM. They shipped BARE for one
   commit: §33.6 covered the BOAT/RV fields (slip, storage, marine insurance, engine hours) but not
   the six base costs, so I flagged the gap rather than writing six plausible house-voiced lines, and
   the Architect wrote them. ⭐ SECOND TIME THAT LOOP HAS RUN TODAY. Recording the debt AT THE SITE is
   what got it paid — a gap named only in chat evaporates.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ LABELS ARE FROM Garage §4's "LIVE LABEL" COLUMN — the column literally headed LIVE LABEL — not
   from §45.4's numbered concept list, which reads as concepts ("Registration & tags") rather than as
   quoted strings. Where the two differ the LIVE LABEL column wins because that is what it is for.
   ⛔ ONE DERIVATION FLAGGED: `tolls` has NO Garage §4 row. Its only source is Property §4.10
   "Tolls (yr)", and the "(yr)" is stripped because NO catalogue label carries a period — the row's
   own frequency selector owns that (compare "Electricity", not "Electricity (yr)"). Mechanical, not
   authored, and the Architect may overrule the bare word "Tolls".

   ⭐ `parking` IS NOT OPTIONAL AND ITS COMMENT SAYS WHY (§45.4): it is the ONLY line that survives a
   type switch into a boat's SLIP or an RV's STORAGE. Dropping it would orphan the whole boat/RV cost
   story before §38.6 begins — the label swaps, the stored dollars do not move. */
function _upkCatalogueRaw() { return [
  /* ── PROPERTY · UTILITIES (§28a, bank A346 — hovers VERBATIM, unchanged by this move) ────────── */
  { kind: 'electricity', group: 'utilities', scope: ['property'], label: 'Electricity',
    hover: 'Your power bill for this property. If it swings hard by season, an average across twelve months is closer to the truth than this month’s figure.' },
  { kind: 'water', group: 'utilities', scope: ['property'], label: 'Water & Sewer',
    hover: 'Water, and the sewer or septic service that goes with it. Often billed together; sometimes the sewer line is the larger half.' },
  { kind: 'gas', group: 'utilities', scope: ['property'], label: 'Natural gas / Propane',
    hover: 'Gas for heat, hot water or cooking. In a propane household this can be a delivery a few times a year rather than a monthly bill — record it however you actually pay it.' },
  { kind: 'waste', group: 'utilities', scope: ['property'], label: 'Waste & Recycling',
    hover: 'Refuse collection, where it is billed separately rather than bundled into a municipal tax or an association fee.' },
  { kind: 'internet', group: 'utilities', scope: ['property'], label: 'Internet',
    hover: 'Home internet for this property. If it is bundled with television or phone, record the bundle and note the split — the total is what leaves your account.' },
  { kind: 'landline', group: 'utilities', scope: ['property'], label: 'Landline phone',
    hover: 'A phone line tied to the property rather than to a person. Increasingly rare, and easy to keep paying for long after it is used.' },
  /* ── PROPERTY · SERVICES ─────────────────────────────────────────────────────────────────────── */
  { kind: 'lawn', group: 'services', scope: ['property'], label: 'Lawn & Landscaping',
    hover: 'Mowing, beds, irrigation, seasonal clean-ups. A cost that scales with the lot rather than the house.' },
  { kind: 'pest', group: 'services', scope: ['property'], label: 'Pest control',
    hover: 'Routine treatment or inspection. Often quarterly, and worth recording annually rather than guessing a month.' },
  { kind: 'pool', group: 'services', scope: ['property'], label: 'Pool / Spa service',
    hover: 'Service, chemicals and upkeep for a pool or spa. One of the costs most often left out of what a home really runs.' },
  { kind: 'security', group: 'services', scope: ['property'], label: 'Home security & monitoring',
    hover: 'An alarm or monitoring contract on the property. Small monthly, long contract — it belongs in the true cost.' },
  { kind: 'cleaning', group: 'services', scope: ['property'], label: 'Cleaning service',
    hover: 'Recurring housekeeping. Include it if it is a standing arrangement rather than an occasional one.' },
  /* ⚠️ THE SHARED ROW. `byScope` carries per-scope label/hover overrides; the base label/hover stay
     the PROPERTY ones so nothing about the existing room changes by one byte.
     ⛔ THIS HOVER MUST STAY CONSISTENT WITH §4.3 (row 27), which already carries the 1% rule of
     thumb. SAME FIGURE, SAME FRAMING — two surfaces must not state the rule differently.
     ⛔ AND IT MUST NEVER REACH A VEHICLE: "1% of the home's value" is false about a car. */
  { kind: 'maintenance', group: 'services', scope: ['property', 'vehicle'], label: 'Routine maintenance & repairs',
    hover: 'The ongoing upkeep a house asks for — filters, servicing, small repairs. A common rule of thumb is about 1% of the home’s value a year; your own number always wins.',
    /* ⚠️ THE GROUP IS OVERRIDDEN TOO, AND THAT WAS A VISIBLE DEFECT CAUGHT BY READING THE GATE'S
       OWN OUTPUT RATHER THAN BY ANY LEG. With only label+hover scoped, a CAR's dropdown rendered an
       optgroup headed "PROPERTY SERVICES" — because `maintenance` carried the property group and the
       heading map is keyed on group. A vehicle's maintenance is a RUNNING COST; filing it anywhere
       else puts the word "property" inside a room that has no property in it.
       ⛔ AND THE OVERRIDE IS SAFE FOR THE HALF THAT MATTERS: _canonMaint filters group === 'services'
       in the PROPERTY scope only, so the property row is untouched and the carrying total cannot
       move. The render diff is what proves that, not this comment. */
    byScope: { vehicle: { label: 'Routine maintenance and repairs', group: 'vehicle_running',
      hover: 'Oil, tyres, brakes, and the things that break. An estimate is fine &mdash; most people underestimate this one.' } } },

  /* ── VEHICLE (§45.4 — the SIX, the union of Garage §4 and Property §4.6-4.10) ─────────────────── */
  /* ⭐ §47.1 HOVERS, VERBATIM. Two of the six are TYPE-AWARE INSIDE the vehicle scope — `byType` is a
     third axis under `byScope`, and it exists because §40.2 (one field, swapped coat) and §45.5
     (scope is an attribute) MEET ON THESE TWO ROWS. ⛔ NO NEW KIND KEYS: a boat's marine premium and
     a car's auto premium are ONE stored dollar, and a boat's slip is the SAME ROW as a car's parking
     — which is precisely why §45.4 ruled `parking` undroppable. */
  { kind: 'insurance', group: 'vehicle_running', scope: ['vehicle'], label: 'Auto insurance premium',
    hover: 'What you pay to insure it, per year. For most owners this is the biggest cost after fuel.',
    /* §33.6 row 420 VERBATIM — kept, not rewritten. It names a thing people get wrong.
       ⭐ THE LABEL SWAPS WITH IT (Captain-approved 2026-08-13). §47.1 authored the boat HOVER but not
       the boat LABEL, which left a boat reading "Auto insurance premium" above a hover explaining
       that auto insurance does NOT cover boats — the car-native defect this whole arc exists to
       correct, one level down. The label is §33.6's own row name, so this is WIRING, not authoring.
       ⛔ AND IT IS §40.2 LITERALLY: "marine insurance is ONE STORED FIELD WITH A SWAPPED LABEL — a
       separate field would make a user's entered premium VANISH on a type switch." */
    byType: { 'Boat': { label: 'Marine insurance',
      hover: 'Boats need their own policy &mdash; auto insurance doesn&rsquo;t cover them. Enter the annual premium.' } } },
  { kind: 'registration', group: 'vehicle_running', scope: ['vehicle'], label: 'Registration, tags and inspection',
    hover: 'Yearly registration, tags and any inspection. It varies a lot by state &mdash; enter what you actually pay.' },
  { kind: 'fuel', group: 'vehicle_running', scope: ['vehicle'], label: 'Fuel or charging',
    hover: 'Roughly what you spend a year getting it moving &mdash; gas, diesel or electricity.' },
  /* ⭐ THE ONLY HOVER IN THE SET THAT NAMES A HUMAN TENDENCY — "most people underestimate this one".
     Plain-coach naming a bias without scolding. Deliberate; do not soften it. */
  { kind: 'tolls', group: 'vehicle_running', scope: ['vehicle'], label: 'Tolls',
    hover: 'What you spend a year on tolls, if your driving takes you through them.' },
  { kind: 'parking', group: 'vehicle_running', scope: ['vehicle'], label: 'Parking or storage',
    hover: 'Parking or storage, if you pay for it. Blank for most owners.',
    /* §33.6 rows 418 and 421 VERBATIM — the slip and the RV storage, kept as authored, LABEL AND
       HOVER TOGETHER (Captain-approved 2026-08-13). Both labels are §33.6's own row names.
       ⭐⭐ THIS IS WHAT §45.4 MEANT BY "PARKING IS THE ONE THAT SURVIVES A TYPE SWITCH". The stored
       kind never changes, so a user who records $400 of parking on a car and then corrects the type
       to Boat still has their $400 — it is simply now called the slip. Fork it into a `slipFee` and
       that money disappears from the screen on the switch. ONE ROW, THREE COATS, ONE DOLLAR. */
    byType: {
      'Boat': { label: 'Slip / storage fee',
        hover: 'What it costs to keep the boat where it lives &mdash; a marina slip, dry storage, or a yard. For most owners this is the single biggest yearly cost, and it runs whether you go out or not.' },
      'RV or Camper': { label: 'Storage when not in use',
        hover: 'Where the RV sits between trips, and what that costs. Storage runs all year even when the RV doesn&rsquo;t.' }
    } }
]; }

/* ⚠️ §45.4's `maintenance` hover is §47.1 (4) and lives on the SHARED row's vehicle override above,
   not here — one row, one place, however many coats it wears. */

/* ⛔ EVERY KIND MUST BE REACHABLE IN THE DROPDOWN FOR ITS SCOPE, AND THAT IS A MONEY CLAIM RATHER
   THAN A UI ONE. The dropdown used to be built from a HARD-CODED pair of groups
   [['utilities','UTILITIES'],['services','PROPERTY SERVICES']]. A kind whose group was not one of
   those two would have been INVISIBLE IN THE DROPDOWN WHILE STILL COUNTING IN THE TOTAL — a dollar
   the user cannot see or edit but is being charged. Same family as the negative-balance defect: not
   a wrong word, a wrong number about the user's own money.
   ⭐ SO THE GROUP HEADINGS ARE DERIVED FROM THE CATALOGUE, NOT LISTED BESIDE IT. A new group with no
   heading falls back to its own key upper-cased and still renders — it cannot go silent. */
function _upkGroupHeadings() { return {
  utilities: 'UTILITIES', services: 'PROPERTY SERVICES', vehicle_running: 'RUNNING COSTS'
}; }

/**
 * Every catalogue row valid in `scope` ('property' | 'vehicle'), with overrides applied.
 * @param {string} scope
 * @param {string} [vType] the vehicle type, when scope is 'vehicle'. Blank/unknown falls through to
 *   the base row, which is the CAR case — the same fallback the §25.1 name map uses, and the COMMON
 *   path (most users never open the type dropdown), so it must stay reachable and tested.
 * ⭐ THREE AXES, RESOLVED IN ONE PLACE AND IN ONE ORDER: base -> byScope -> byType. Resolving them
 *   at the call sites instead would put the precedence rule in as many places as there are readers.
 */
function _upkForScope(scope, vType) {
  return _upkCatalogueRaw().filter(function (c) {
    return c.scope.indexOf(scope) >= 0;
  }).map(function (c) {
    var o = (c.byScope && c.byScope[scope]) || {};
    var t = (vType && c.byType && c.byType[vType]) || {};
    var pick = function (k) {
      if (t[k] !== undefined) return t[k];
      if (o[k] !== undefined) return o[k];
      return c[k];
    };
    return { kind: c.kind, scope: c.scope,
             group: pick('group'), label: pick('label'), hover: pick('hover') };
  });
}

/** The groups present in a scope, in catalogue order, each with its heading. Derived — never listed. */
function _upkGroupsForScope(scope, vType) {
  var head = _upkGroupHeadings(), seen = [], out = [];
  _upkForScope(scope, vType).forEach(function (c) {
    if (seen.indexOf(c.group) >= 0) return;
    seen.push(c.group);
    out.push([c.group, head[c.group] || String(c.group).toUpperCase().replace(/_/g, ' ')]);
  });
  return out;
}

/** One row by kind, resolved for a scope. Null when the kind is not valid in that scope. */
function _upkKindInScope(kind, scope, vType) {
  return _upkForScope(scope, vType).filter(function (c) { return c.kind === kind; })[0] || null;
}
