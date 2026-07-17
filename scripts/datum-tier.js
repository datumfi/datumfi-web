/* datum-tier.js — Datum FI SINGLE tier switch (one source of truth; no scattered magic numbers).
 * savedCap() = how many saved blueprints/sketches the current tier allows.
 *   • mode 'design'  (paid)     -> Infinity (unlimited)
 *   • mode 'discover' (free)    -> 1
 * DEFAULT is 'design' so the WHOLE SITE runs as Design/unlimited for now (paid tiers are not live yet).
 * When paid tiers ship, the future Clerk-entitlement code sets DatumTier.mode = 'discover' | 'design' —
 * the ONE hook the dormant Discover capacity gate (#discover-capacity-modal) will read. Nothing here
 * activates that gate; it stays dormant until a caller wires savedCap() into the save flow. ADDITIVE. */
(function (global) {
  'use strict';
  var API = {
    mode: 'design',                                  // DEFAULT: unlimited everywhere (see header)
    CAPS: { design: Infinity, discover: 1 },
    savedCap: function () { var c = API.CAPS[API.mode]; return (typeof c === 'number') ? c : Infinity; },
    isUnlimited: function () { return API.savedCap() === Infinity; }
  };
  global.DatumTier = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this)));
