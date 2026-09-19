/* date-bounds.js — SINGLE SOURCE for MM/YYYY age/date parsing + bounds, shared by
 * studio.html (inline S1 fields + Architect Profile) and Dossier.html. Extracting this
 * removes the twin-validator drift between Studio's _validateDateField/_parseAgeOrDate and
 * the Dossier's normalizeBirth: both now delegate to the same code.
 *
 *   Current age (DOB) window : 18-85
 *   Retirement age window    : [max(45, CA+1), 90]
 *   Plan-through age window   : [floor(RA) + 1, 105]
 *
 * Pure, dependency-free. Exposes window.DatumDateBounds.
 */
(function (global) {
  'use strict';

  var AGE_MIN = 18, AGE_MAX = 85;   // current age (DOB)
  var RA_MIN_FLOOR = 45, RA_MAX = 90;
  var PTA_MAX = 105;
  /* ⛔⛔ PTA_MIN_FLOOR (75) AND PTA_GAP (20) ARE DELETED — §9.2, 2026-09-14. THE RULE IS REMOVED,
     NOT REWORDED, AND THAT DISTINCTION IS THE WHOLE RULING.
     ⛔ A 20-YEAR GAP WAS NEVER THE CAPTAIN'S RULE. It asserts that a retirement shorter than twenty
        years is invalid — a judgement about a person's life expectancy this product has no standing
        to make. `max(75, RA+20)` is an actuarial guess with the guess taken out; the floor below is
        derived from what the model MEANS: a plan that ends before it begins has no years to run.
     ⛔⛔ AND THIS FILE IS WHY §82.2348 EXISTS. studio.html was moved to the derived floor on
        2026-09-13 and THIS FILE WAS NOT, so the product carried TWO plan-through floors for a day:
        the SLIDER's minimum came from studio.html's `minPlanEnd` (new) while TYPING A DATE was
        validated here (old). The Captain met the old one, was told "at least 20 years after you
        retire", and reported — correctly — that nothing had changed.
     🔑 A RULE APPLIED IN ONE FILE IS NOT A RULE, IT IS A BRANCH. Before declaring this rule changed
        again, enumerate every file that implements it: THIS file, studio.html (`minPlanEnd` /
        `_planEndAgeMin`), schemas.py (`validate_ages`), and the two gates that assert it. */

  /* THE PLAN-THROUGH WINDOW FOR A GIVEN RETIREMENT AGE — one function, so the UI, the validator and
     any gate all ask the SAME question and cannot disagree about the answer.
     `floor` is CLAMPED to the ceiling so no caller can be handed an inverted range; `rawFloor`
     keeps the uncapped value because the crossed-state message has to report what the rule actually
     demanded, not the clamped fiction.
       🔑 CLAMPING THE VALUE WITHOUT KEEPING THE TRUTH WOULD HIDE THE DEFECT INSTEAD OF EXPLAINING IT.
     ⚠️⚠️ FLAGGED FOR THE ARCHITECT — THE 'crossed' AND 'collapsed' BRANCHES ARE NOW UNREACHABLE AND
        THEIR AUTHORED COPY IS LEFT STANDING DELIBERATELY. With the floor at RA and RA_MAX = 90
        against PTA_MAX = 105, rawFloor can never reach the ceiling: the window is ALWAYS open.
        Both sentences are the Architect's and deleting authored copy is not the Wirer's call, so
        they are reported rather than removed. ⛔ THIS IS A LANDMINE BY THE FILE'S OWN DOCTRINE — a
        refusal that cannot fire is not a safeguard — and it wants a ruling, not a quiet deletion.
     `raMaxValid` is now simply PTA_MAX: every retirement age the retire field permits leaves a
        usable window, which is the condition _gate_plan_window_never_empty was written to check. */
  function planWindow(ra) {
    /* ⛔⛔ THE FLOOR IS floor(RA) + 1, NOT RA — A PLAN THAT ENDS THE YEAR RETIREMENT BEGINS HAS
       NO YEARS TO MODEL. This read `(ra | 0)`, so plan-through == retirement age PASSED, and the
       engine was handed a horizon of zero. `schemas.validate_ages` was repaired the same way on
       2026-09-18 (`max(ceil(current_age), floor(retirement_age) + 1)`) and the note above
       `minPlanEnd` in studio.html is the standing order: THE TWO FLOORS ARE ONE RULE IN TWO
       REPOSITORIES AND THEY MOVE TOGETHER OR NOT AT ALL. This is the client half of that move.
       ⭐ THE ARCHITECT'S SENTENCE WAS ALREADY RIGHT AND IS UNCHANGED. §6.2 says "a plan has to
          run past the day it starts — choose an age after that", which describes RA + 1 exactly.
          The copy has been describing a rule the arithmetic did not implement.
          🔑 THE MESSAGE WAS NEVER THE PROBLEM; THE PREDICATE WAS.
       ⚠️ `+ 1`, NOT `Math.ceil`. ceil(62) is 62 and a plan ending the year it begins is still
          zero years, whatever the fractional part happens to be. Note that callers here pass an
          age that is ALREADY whole (`ageAtDate` returns completed years), so `| 0` was never
          doing the rounding it looked like it was doing — it was a no-op wearing a guard's coat. */
    var rawFloor = Math.floor(ra) + 1;
    var floor = Math.min(rawFloor, PTA_MAX);
    var state = rawFloor > PTA_MAX ? 'crossed' : (rawFloor === PTA_MAX ? 'collapsed' : 'open');
    return { floor: floor, ceiling: PTA_MAX, rawFloor: rawFloor, state: state,
             raMaxValid: PTA_MAX };
  }

  /* §6.2 — THE ONE SENTENCE FOR "your plan ends before it starts", Architect-authored, wired
     verbatim. It lives HERE rather than in studio.html because this module is the shared one:
     the Profile's typed-date validator and the slider's blur clamp are two doors onto ONE rule,
     and §82.2348 was written the day they disagreed.
     ⛔ `{retirement_age}` IS ECHOED AND MUST BE. A fixed number here would be a new hardcode —
        wrong for every household but one — which is the defect class this whole arc removes. */
  function planFloorMsg(ra) {
    return 'That is before you retire at ' + (ra | 0)
         + '. A plan has to run past the day it starts — choose an age after that.';
  }

  // "MM / YYYY" or "MM/YYYY" (also accepts ISO "YYYY-MM") -> { mo, yr } or null. Month must be 1-12.
  function parseMoYr(s) {
    var raw = String(s == null ? '' : s).trim();
    var iso = raw.match(/^(\d{4})-(\d{1,2})$/);
    var mo, yr;
    if (iso) { yr = +iso[1]; mo = +iso[2]; }
    else {
      var m = raw.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{4})$/);
      if (!m) return null;
      mo = +m[1]; yr = +m[2];
    }
    if (!yr || mo < 1 || mo > 12) return null;
    return { mo: mo, yr: yr };
  }

  // DOB string -> current age (today - DOB), or null if unparseable.
  function ageFromDob(s) {
    var p = parseMoYr(s); if (!p) return null;
    var now = new Date(); var a = now.getFullYear() - p.yr;
    if (now.getMonth() + 1 < p.mo) a--;
    return a;
  }

  // Target-date string -> age AT that date, anchored to a DOB month/year.
  function ageAtDate(s, dobMo, dobYr) {
    var p = parseMoYr(s); if (!p) return null;
    var a = p.yr - dobYr;
    if (p.mo < dobMo) a--;
    return a;
  }

  // Message for an unparseable entry: distinguish a well-formed date with an out-of-range
  // month (clear "month" message) from a malformed/incomplete one.
  function _formatErr(s) {
    var sh = String(s == null ? '' : s).replace(/\s/g, '').match(/^(\d{1,2})\/(\d{4})$/);
    if (sh && (+sh[1] < 1 || +sh[1] > 12)) return 'Month must be between 01 and 12.';
    return 'Enter a full date as MM / YYYY.';
  }

  // DOB -> { ok, age, err }. err is a user-facing message when !ok.
  function validateDob(s) {
    var p = parseMoYr(s);
    if (!p) return { ok: false, err: _formatErr(s) };
    var a = ageFromDob(s);
    if (a < AGE_MIN || a > AGE_MAX) return { ok: false, age: a, err: 'Age must be between ' + AGE_MIN + ' and ' + AGE_MAX + '.' };
    return { ok: true, age: a };
  }

  // Target date -> { ok, age, err }. kind: 'retire' | 'plan'. dob = { mo, yr } (the anchor).
  // ca = current age, ra = retirement age (for the ordering floors).
  function validateTarget(s, kind, dob, ca, ra) {
    var p = parseMoYr(s);
    if (!p) return { ok: false, err: _formatErr(s) };
    var a = ageAtDate(s, dob.mo, dob.yr);
    if (kind === 'retire') {
      var rlo = Math.max(RA_MIN_FLOOR, (ca | 0) + 1);
      if (a < rlo || a > RA_MAX) return { ok: false, age: a, err: 'Retirement age must be between ' + rlo + ' and ' + RA_MAX + '.' };
    } else {
      /* ⛔⛔ THE WINDOW CAN COLLAPSE OR CROSS, AND THE OLD MESSAGE HID IT. `plo` is derived from the
       * RETIREMENT age while the ceiling is a fixed constant — TWO BOUNDS SET BY DIFFERENT RULES
       * WITH NOTHING STOPPING THEM CROSSING. MEASURED across the retire field's own permitted range
       * (45..90): ra 85 gives floor 105 == ceiling 105, and ra 86..90 give floor 106..110 against a
       * ceiling of 105. SIX OF FORTY-SIX PERMITTED RETIREMENT AGES LEAVE NO USABLE WINDOW.
       * The Captain hit ra 85 and was told "must be between 105 and 105" — an instruction he could
       * not follow, on a field he could no longer edit, with no hint of why.
       *   🔑 A VALIDATOR THAT CAN PRODUCE AN EMPTY RANGE IS NOT VALIDATING — IT IS LOCKING THE FIELD
       *      AND BLAMING THE USER.
       *   🔑 A VALIDATION MESSAGE MUST NAME THE FIELD THAT CAN MOVE. The old one named the field
       *      that cannot. AN ERROR THAT RESTATES A CONSTRAINT IS A COMPLAINT; AN ERROR THAT NAMES
       *      THE MOVE IS AN INSTRUMENT.
       * Three states, three DIFFERENT FACTS — not one string with branches. Copy Architect-authored,
       * verbatim, and every number is interpolated from the constants above: A LIMIT TYPED INTO A
       * SENTENCE IS A HAND-MAINTAINED LIST WEARING A MESSAGE, AND IT SURVIVES THE DAY THE LIMIT
       * CHANGES. */
      var w = planWindow(ra);
      if (w.state === 'crossed') {
        return { ok: false, age: a, state: w.state, err: 'Retiring at ' + (ra | 0) + ' would need a plan-through age of ' + w.rawFloor + ', past the ' + PTA_MAX + ' limit. Move your retirement age to ' + w.raMaxValid + ' or earlier and this opens up.' };
      }
      if (w.state === 'collapsed' && (a < w.floor || a > w.ceiling)) {
        return { ok: false, age: a, state: w.state, err: 'Retiring at ' + (ra | 0) + ' leaves only one plan-through age: ' + PTA_MAX + '. To plan through anything earlier, move your retirement age back.' };
      }
      /* ⛔⛔ THE §6.2 STRING, REUSED VERBATIM — NOT A SECOND COPY OF IT (L48, §9.2). studio.html's
         `_planEndBelowFloorMsg` says exactly this sentence to the same person about the same fact.
         Forking the wording here would rebuild the two-floors defect ONE LAYER UP: the arithmetic
         would agree while the two sentences drifted, and nobody diffs a message across two files.
         🔑 THE RULE AND ITS SENTENCE TRAVEL TOGETHER OR NEITHER IS SINGLE-SOURCED. */
      if (a < w.floor || a > w.ceiling) {
        return { ok: false, age: a, state: w.state, err: planFloorMsg(ra) };
      }
    }
    return { ok: true, age: a };
  }

  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  // Inverse of ageAtDate: the DOB-anchored MM/YYYY for a given age (month follows DOB).
  // Single rounding source shared by Studio + Dossier so identical inputs agree.
  // ⚠️ CONTRACT — dobMo IS THE BIRTH MONTH, NOT A DISPLAY MONTH. It is used TWICE: as the output
  // month AND as the year anchor. Pass any other month and the year is computed as though the person
  // had been born in it — dateFromAge(85, 3, 1982) returns 03/2067, which ageAtDate('03/2067', 8,
  // 1982) reads back as 84. A silent off-by-one in a user-facing horizon. studio.html's
  // _mirrorPlanEnd did exactly this (fixed 2026-08-03, 0305d0e). To keep a display month OTHER than
  // the birth month, anchor the year yourself: dobYr + age + (mo < dobMo ? 1 : 0).
  // The signature accepts any month, so this note is the only thing between the next reader and the
  // same bug — do not delete it while the parameter stays permissive.
  function dateFromAge(age, dobMo, dobYr) {
    if (age == null || !isFinite(age) || !dobYr) return '';
    return pad2(dobMo) + '/' + (dobYr + Number(age));
  }

  // Strict MM/YYYY auto-slash formatter (string in -> string out). Port of Studio's
  // _fmtDateSlash (studio.html:5019): caps 6 digits, snaps a leading >1 month digit to 0X,
  // inserts the slash after 2 digits, and does NOT clamp the month — so a typed "13" stays
  // "13" and the strict parse REJECTS it (no silent auto-correct that hides a typo).
  function fmtDateStr(s) {
    var d = String(s == null ? '' : s).replace(/\D/g, '').slice(0, 6);
    if (d.length >= 1 && parseInt(d[0], 10) > 1) d = '0' + d.slice(0, 5);
    return d.length <= 2 ? d : d.slice(0, 2) + '/' + d.slice(2);
  }

  /* ⛔ PTA_GAP AND PTA_MIN_FLOOR ARE NOT EXPORTED BECAUSE THEY NO LONGER EXIST (§9.2). A constant
     left on this object "for compatibility" would be a rule still readable by anything that asks,
     and the two gates that read them are updated in THIS commit rather than kept alive by a stub.
     🔑 DELETING A RULE MEANS DELETING EVERY CHECK THAT STILL IMPLEMENTS IT (§82.2351). */
  global.DatumDateBounds = {
    planWindow: planWindow, planFloorMsg: planFloorMsg,
    AGE_MIN: AGE_MIN, AGE_MAX: AGE_MAX, RA_MIN_FLOOR: RA_MIN_FLOOR, RA_MAX: RA_MAX,
    PTA_MAX: PTA_MAX,
    parseMoYr: parseMoYr, ageFromDob: ageFromDob, ageAtDate: ageAtDate,
    validateDob: validateDob, validateTarget: validateTarget,
    pad2: pad2, dateFromAge: dateFromAge, fmtDateStr: fmtDateStr
  };
})(typeof window !== 'undefined' ? window : this);
