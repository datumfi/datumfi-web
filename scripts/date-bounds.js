/* date-bounds.js — SINGLE SOURCE for MM/YYYY age/date parsing + bounds, shared by
 * studio.html (inline S1 fields + Architect Profile) and Dossier.html. Extracting this
 * removes the twin-validator drift between Studio's _validateDateField/_parseAgeOrDate and
 * the Dossier's normalizeBirth: both now delegate to the same code.
 *
 *   Current age (DOB) window : 18-85
 *   Retirement age window    : [max(45, CA+1), 90]
 *   Plan-through age window   : [max(75, RA+20), 105]
 *
 * Pure, dependency-free. Exposes window.DatumDateBounds.
 */
(function (global) {
  'use strict';

  var AGE_MIN = 18, AGE_MAX = 85;   // current age (DOB)
  var RA_MIN_FLOOR = 45, RA_MAX = 90;
  var PTA_MIN_FLOOR = 75, PTA_MAX = 105;

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
      var plo = Math.max(PTA_MIN_FLOOR, (ra | 0) + 20);
      if (a < plo || a > PTA_MAX) return { ok: false, age: a, err: 'Plan-through age must be between ' + plo + ' and ' + PTA_MAX + '.' };
    }
    return { ok: true, age: a };
  }

  global.DatumDateBounds = {
    AGE_MIN: AGE_MIN, AGE_MAX: AGE_MAX, RA_MIN_FLOOR: RA_MIN_FLOOR, RA_MAX: RA_MAX,
    PTA_MIN_FLOOR: PTA_MIN_FLOOR, PTA_MAX: PTA_MAX,
    parseMoYr: parseMoYr, ageFromDob: ageFromDob, ageAtDate: ageAtDate,
    validateDob: validateDob, validateTarget: validateTarget
  };
})(typeof window !== 'undefined' ? window : this);
