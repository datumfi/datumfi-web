/* ══ THE STUDIO PANEL RESIZER — ONE OWNER FOR THE WIDTH AND THE TIER ══════════════════════════════
 *
 * The drafting panel is draggable. This file owns BOTH the width and the disclosure tier, and that
 * pairing is the whole design: the tier is a function of the width, so if two different places
 * computed them the day would come when the bar was hidden at a width that should show it.
 *   🔑 ONE FUNCTION SETS BOTH, OR THEY EVENTUALLY DISAGREE.
 *
 * ── THE THREE TIERS, CAPTAIN-RULED 2026-08-20 FROM RENDERED COMPARISONS, NOT FROM ARGUMENT ───────
 *   340-399  narrow  cards only
 *   400-519  mid     cards + the gradient bar and its ball          <- DEFAULT
 *   520+     wide    cards + bar + the 01-04 pillar column
 *
 * ⭐ WHY THE BAR LEAVES BELOW 400 RATHER THAN RIDING ALL THE WAY DOWN — and this overturned MY OWN
 * recommendation, which was "the bar never leaves". The Captain read the renders more carefully than
 * I did: the bar costs 22px, and at 340 that is exactly the width that pushes "Reveal the Range."
 * and its siblings onto a second line. AT 400 IT IS FREE; AT 340 IT IS PAID FOR IN WRAPPED COPY.
 *   🔑 A COMPONENT'S COST IS NOT ITS OWN WIDTH — IT IS WHAT ITS WIDTH DOES TO ITS NEIGHBOUR.
 *
 * ⛔ 340 IS THE FLOOR AND IT IS NOT ARBITRARY: below it the cards themselves break, which is the
 * thing the whole narrow direction exists to protect. "Cannot allow complete collapse" (Captain).
 *
 * ── WHY THIS IS SAFE TO BUILD BEFORE THE ROOM SPLIT ─────────────────────────────────────────────
 * §82.7 ruled the spine's ball/scroll mechanic and card-click routing land AFTER Step 3, because
 * both assume things Step 3 redefines. THIS DOES NOT: the resizer lives in the SHELL, and Step 3
 * graduates the seven phase SECTIONS while the shell stays. It manipulates exactly one custom
 * property that already existed. ⇒ IT SURVIVES THE SPLIT UNCHANGED.
 *   ⚠️ CONTRAST WITH _studioPhaseGo, WHICH DOES NOT — see the expiry note beside it.
 *
 * ── WHY A JS TIER AND NOT A CONTAINER QUERY ─────────────────────────────────────────────────────
 * The thresholds are about the PANEL's width, not the VIEWPORT's, and the panel is user-resizable —
 * so a plain @media would key off the wrong number entirely. @container would work, but
 * `container-type: inline-size` imposes size containment on a SCROLLING panel, and buying a
 * layout-containment change to avoid three lines of JS is a poor trade on a SACRED host.
 * ⭐ AND THE JS PATH HAS A PROPERTY THE CSS PATH DOES NOT: the attribute is READABLE BY A GATE.
 */
(function () {
  'use strict';
  /* ⛔⛔ EVERY INNER NAME IS `_sp`-PREFIXED, AND THAT IS NOT STYLE — IT IS A GATE FINDING.
   * The first draft named them clamp / apply / bind / up / move. They are IIFE-scoped so nothing
   * could actually collide — but scripts/_gate_parts_wired.mjs reads a part's TOP-LEVEL FUNCTIONS
   * as its public surface, cannot model IIFE scoping, and therefore reported ELEVEN pages as
   * "calling this part without loading it" because they happen to contain a function named `clamp`
   * or `bind`.
   * 🔑 THE GATE'S REASONING WAS WRONG AND ITS ALARM WAS RIGHT: GENERIC NAMES IN A SHARED PART ARE A
   *    HAZARD EVEN WHEN THEY CANNOT COLLIDE, BECAUSE EVERY READER AND EVERY INSTRUMENT HAS TO PROVE
   *    THEY DO NOT. Renamed rather than the gate loosened — the red pointed at something true.
   * ⚠️ THE DETECTOR'S BLINDNESS TO IIFE SCOPE IS REAL AND IS *NOT* FIXED HERE. It is recorded so
   *    the next person to wrap a part in an IIFE meets it deliberately instead of by surprise. */
  var KEY = 'datum_studio_panel_w';      /* datum_* per the existing convention */
  var MIN = 340, MAX = 760, DEFAULT_W = 400;
  /* MAX is the design file's own clamp ceiling (clamp(620px,38vw,760px)) — borrowed rather than
     invented, so the number has a source. Nothing above it was ever drawn. */

  function _spTierFor(w) { return w < 400 ? 'narrow' : (w < 520 ? 'mid' : 'wide'); }

  function _spClamp(w) {
    if (!isFinite(w)) return DEFAULT_W;
    return Math.max(MIN, Math.min(MAX, Math.round(w)));
  }

  /* THE ONE WRITER. Everything that changes the width goes through here so the tier cannot drift. */
  function _spApply(w, persist) {
    var l = document.getElementById('studio-layout');
    if (!l) return;                       /* D14 — null-guard, never assume the host exists */
    var v = _spClamp(w);
    l.style.setProperty('--studio-panel-w', v + 'px');
    l.setAttribute('data-panel-tier', _spTierFor(v));
    if (persist) { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* private mode */ } }
  }

  function _spStored() {
    try { var s = localStorage.getItem(KEY); return s ? parseInt(s, 10) : NaN; } catch (e) { return NaN; }
  }

  function _spBind() {
    var l = document.getElementById('studio-layout');
    if (!l) return;
    /* Restore before first paint of the panel where possible, and clamp on the way in: a stored
       value from an older build (or a hand-edited one) must not be trusted to be in range. */
    var w = _spStored();
    _spApply(isFinite(w) ? w : DEFAULT_W, false);

    var handle = document.getElementById('panel-resizer');
    if (!handle) return;                  /* the tier still works without a handle */
    var _spDragging = false;

    function _spMove(e) {
      if (!_spDragging) return;
      var rect = l.getBoundingClientRect();
      _spApply(e.clientX - rect.left, false);   /* live, unpersisted — commit on release */
      e.preventDefault();
    }
    function _spUp() {
      if (!_spDragging) return;
      _spDragging = false;
      document.body.classList.remove('is-resizing-panel');
      var cur = parseInt(getComputedStyle(l).getPropertyValue('--studio-panel-w'), 10);
      _spApply(cur, true);                      /* ⭐ persist ONCE, on release — not on every frame */
      window.removeEventListener('pointermove', _spMove);
      window.removeEventListener('pointerup', _spUp);
    }
    handle.addEventListener('pointerdown', function (e) {
      _spDragging = true;
      document.body.classList.add('is-resizing-panel');
      window.addEventListener('pointermove', _spMove);
      window.addEventListener('pointerup', _spUp);
      e.preventDefault();
    });
    /* ⭐ KEYBOARD, NOT AN AFTERTHOUGHT. A separator you can only reach with a mouse is a control
       half the standard says you have built. 20px steps, Home/End to the bounds. */
    handle.addEventListener('keydown', function (e) {
      var cur = parseInt(getComputedStyle(l).getPropertyValue('--studio-panel-w'), 10) || DEFAULT_W;
      var next = null;
      if (e.key === 'ArrowLeft') next = cur - 20;
      else if (e.key === 'ArrowRight') next = cur + 20;
      else if (e.key === 'Home') next = MIN;
      else if (e.key === 'End') next = MAX;
      if (next === null) return;
      _spApply(next, true);
      e.preventDefault();
    });
  }

  /* D15 — bind lifecycle-independently: the script may land before or after DOMContentLoaded. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _spBind);
  else _spBind();

  /* Exposed for gates and for any future surface that needs to set the panel programmatically.
     ⛔ NOT a second writer — it is the same `_spApply`, which is the point. */
  window._studioPanelApply = _spApply;
  window._studioPanelTierFor = _spTierFor;
})();
