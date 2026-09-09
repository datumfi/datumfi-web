/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   RETIREMENT LOCATION — THE LABEL→CODE MAP.

   ⭐ A NEW ROOM'S DATA STARTS LIFE IN ITS OWN FILE. studio.html is 1,578KB and its account-modal
   builder already reads 76 names it does not own; the standing rule from 2026-09-09 is that new
   work lands beside the shell rather than inside it. This is that rule honoured on the first
   opportunity after it was made, not deferred to a tidy-up that never comes.

   ⛔⛔ PLAIN TOP-LEVEL DECLARATIONS. NOT AN IIFE, NOT A window.X = {...} NAMESPACE, for the same
   structural reason as scripts/studio-upkeep.js and scripts/studio-debt-cost.js: the sandbox gates
   extract a function's TEXT with lift() and run it in `new Function`. An IIFE would privatise these
   names and break every gate that resolves them out of the composed studio source.

   ⛔⛔ WHY A MAP AND NOT value="XX" ON THE FIFTY-ONE <option> TAGS — MEASURED, NOT PREFERRED.
   The obvious move is to give each option a two-letter value. It would break THREE read paths:
     1. THE CODEC STORES THE DISPLAY TEXT POSITIONALLY. Measured in node 2026-09-09:
        `tax.location` round-trips through datum-archive-codec.js's T[1] as the string "Wyoming".
        Every blueprint already saved holds a full state NAME.
     2. THE RESTORE MATCHES ON `(o.value || o.text)` (studio.html `_optHas`). Give an option
        value="WY" and a stored "Wyoming" STOPS MATCHING — the select silently stays blank.
     3. THE DOSSIER SEED MATCHES ON `o.value === loc` (studio.html, applyDossier), where `loc`
        comes from the Dossier's OWN stored household — and Dossier.html is A SECOND APP with its
        own location field.
   ⇒ Adding values is A TWO-APP DATA MIGRATION WEARING AN ATTRIBUTE EDIT'S COSTUME. This map is the
     shape already proven in production twenty lines from the payload: FILING_STATUS_MAP.

   ⚠️ THE LABELS ARE LOAD-BEARING DATA, NOT COPY. Because the codec stores the visible text, ADD
   OPTIONS, NEVER RENAME THEM. Re-word one and every blueprint holding the old string stops mapping.
   A rename here needs a codec migration, in the same commit.

   ⭐ GENERATED MECHANICALLY from the Architect's 'State Tax Tiers (Batch B)' sheet and VERIFIED
   character-for-character against studio.html's 51 <option> labels at generation time — 51/51 exact,
   same order. Retyping 51 rows by hand is a transcription-error generator.

   ⛔ THE RATES AND TIERS ARE DELIBERATELY NOT HERE. They live in the engine
   (engine/state_tax.py), because that is where a rate could ever move a dollar, and because a copy
   on this side would be a second source of truth for tax data. This file carries the map and
   nothing else. Every jurisdiction is currently UNMODELLED and the Studio's
   "Recorded, not yet modelled." note stays on screen until a rate actually moves a dollar.
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/* label (the <option>'s visible text, which IS its value) -> two-letter code the engine expects */
var DATUM_LOCATION_CODE = {
  "Alabama":                "AL",
  "Alaska":                 "AK",
  "Arizona":                "AZ",
  "Arkansas":               "AR",
  "California":             "CA",
  "Colorado":               "CO",
  "Connecticut":            "CT",
  "Delaware":               "DE",
  "District of Columbia":   "DC",
  "Florida":                "FL",
  "Georgia":                "GA",
  "Hawaii":                 "HI",
  "Idaho":                  "ID",
  "Illinois":               "IL",
  "Indiana":                "IN",
  "Iowa":                   "IA",
  "Kansas":                 "KS",
  "Kentucky":               "KY",
  "Louisiana":              "LA",
  "Maine":                  "ME",
  "Maryland":               "MD",
  "Massachusetts":          "MA",
  "Michigan":               "MI",
  "Minnesota":              "MN",
  "Mississippi":            "MS",
  "Missouri":               "MO",
  "Montana":                "MT",
  "Nebraska":               "NE",
  "Nevada":                 "NV",
  "New Hampshire":          "NH",
  "New Jersey":             "NJ",
  "New Mexico":             "NM",
  "New York":               "NY",
  "North Carolina":         "NC",
  "North Dakota":           "ND",
  "Ohio":                   "OH",
  "Oklahoma":               "OK",
  "Oregon":                 "OR",
  "Pennsylvania":           "PA",
  "Rhode Island":           "RI",
  "South Carolina":         "SC",
  "South Dakota":           "SD",
  "Tennessee":              "TN",
  "Texas":                  "TX",
  "Utah":                   "UT",
  "Vermont":                "VT",
  "Virginia":               "VA",
  "Washington":             "WA",
  "West Virginia":          "WV",
  "Wisconsin":              "WI",
  "Wyoming":                "WY",
};

/* ⛔ RETURNS null FOR ANYTHING UNRECOGNISED — NEVER A DEFAULT, AND NEVER "FL".
   The caller's job is to refuse the request, not to substitute. `params.get("location", "FL")` on
   the engine side would BE the founding defect of this arc; the same is true here. An unanswered
   select yields '' and lands on null, which is exactly right: BLANK IS NOT AN ANSWER, and it must
   never quietly become the Captain's own state. */
function datumLocationCode(label) {
  var key = String(label == null ? '' : label).trim();
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(DATUM_LOCATION_CODE, key)
    ? DATUM_LOCATION_CODE[key]
    : null;
}
