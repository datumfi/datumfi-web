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

  /* ══ THE SEAM'S THUMB — §82.77 · THE PANEL'S SCROLL POSITION, DRAWN ON THE DIVIDER ══════════════
   * studio.html hides the panel's native scrollbar in mode-split, so THIS FUNCTION NOW OWNS THE ONLY
   * VISIBLE SCROLL-POSITION INDICATOR THE PANEL HAS. That is a promotion, not a decoration.
   *
   * ⛔ IT IS DRIVEN BY THE PANEL'S OWN `scroll` EVENT, AND THAT CHOICE IS THE WHOLE CORRECTNESS
   *    ARGUMENT. Wheel, trackpad, PageUp/PageDown, Home/End, focus-driven scrollIntoView and any
   *    programmatic write all fire it. A thumb wired to the DRAG HANDLER instead would move only when
   *    dragged — and would therefore be wrong the first time anybody touched the wheel, while still
   *    looking completely alive. THE NATIVE SCROLLBAR WAS DOING THIS SILENTLY; REPLACING IT MEANS
   *    INHERITING THE JOB, NOT JUST THE PIXELS.
   *
   * ⛔ OVERFLOW HONESTY. A panel with nothing to scroll gets NO thumb — never a full-height one.
   *    A full-height thumb on a non-scrolling panel says "there is more and you are at the top of
   *    it", which is false. It is also the failure shape this project keeps meeting: THE CONTROL
   *    RENDERS, SO IT READS AS WORKING.
   *
   * ⚠️ MIN_THUMB EXISTS FOR THE SAME REASON THE HIT TARGET IS 10px WHILE THE PAINT IS 1px: a
   *    proportional thumb on a very long panel would be a few pixels tall and ungrabbable. The paint
   *    may shrink with the content; the target may not. */
  var MIN_THUMB = 28;

  function _spThumb() {
    var p = document.querySelector('.drafting-panel');
    var h = document.getElementById('panel-resizer');
    if (!p || !h) return;                                   /* D14 */
    var track = h.clientHeight || p.clientHeight;
    var over  = p.scrollHeight - p.clientHeight;
    if (over <= 0 || track <= 0) {                          /* nothing to scroll -> no thumb */
      h.style.setProperty('--seam-thumb-h', '0px');
      h.style.setProperty('--seam-thumb-top', '0px');
      return;
    }
    var th = Math.max(MIN_THUMB, Math.round(track * p.clientHeight / p.scrollHeight));
    if (th > track) th = track;
    var top = Math.round((track - th) * (p.scrollTop / over));
    h.style.setProperty('--seam-thumb-h', th + 'px');
    h.style.setProperty('--seam-thumb-top', top + 'px');
  }

  function _spClamp(w) {
    if (!isFinite(w)) return DEFAULT_W;
    return Math.max(MIN, Math.min(MAX, Math.round(w)));
  }

  /* THE ONE WRITER. Everything that changes the width goes through here so the tier cannot drift.
   *
   * ⛔⛔ THE WIDTH GOES ON documentElement, NOT ON #studio-layout — AND THAT IS A REPAIR, NOT A
   * PREFERENCE. It used to be written on #studio-layout, which put the value in a scope that only
   * that element's SUBTREE could see. styles/header.css:143 pins the Sheet · Split · Structure
   * toggle with `left: var --studio-panel-w`, and #app-nav is a SIBLING of #studio-layout, not a
   * descendant — so it resolved header.css's :root 480 while the panel rendered at 400.
   *   MEASURED on real headed Chrome, signed-out, 1440x900: the toggle sat 80px right of the seam
   *   at rest, and when the seam was driven from 400 to 600 the toggle moved ZERO pixels.
   * 🔑 A CUSTOM PROPERTY IS ONLY SHARED AS FAR AS THE SUBTREE THAT DECLARES IT. Writing a value two
   *    independent surfaces must agree on anywhere below the root is a fork with a delay on it.
   *
   * ⚠️ THE TIER ATTRIBUTE STAYS ON #studio-layout because the tier RULES are written against it,
   * and §82.20's law still holds: ONE FUNCTION SETS BOTH, or they eventually disagree. What changed
   * is only WHERE each half lands, and both still land in this one function.
   *
   * ⚠️ THE D14 GUARD MOVED, IT WAS NOT DROPPED. It used to abort the whole function when
   * #studio-layout was absent — which would now silently skip the WIDTH too, and the width must be
   * written at parse time when that element does not exist yet. So the guard now covers exactly the
   * write that needs it: the attribute. documentElement is never null while this file can run. */
  function _spApply(w, persist) {
    var v = _spClamp(w);
    document.documentElement.style.setProperty('--studio-panel-w', v + 'px');
    var l = document.getElementById('studio-layout');
    if (l) l.setAttribute('data-panel-tier', _spTierFor(v));   /* D14 — null-guarded */
    if (persist) { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* private mode */ } }
    /* ⚠️ THE WIDTH CHANGES THE SCROLL GEOMETRY, SO THE THUMB IS RECOMPUTED HERE AND NOT ONLY ON
       `scroll`. A narrower panel re-wraps its copy and gets TALLER, which moves both the thumb's
       size and its position while scrollTop never changes — so no scroll event fires. Same law the
       tier follows: ONE FUNCTION SETS BOTH, or they eventually disagree. */
    _spThumb();
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

    var panel = document.querySelector('.drafting-panel');
    /* ⭐ THE THUMB TRACKS EVERY SCROLL, WHICHEVER INPUT CAUSED IT. This one listener is what makes
       the wheel and the keyboard move the bar — see _spThumb's note on why binding it to the drag
       handler instead would produce a thumb that is confidently wrong. */
    if (panel) panel.addEventListener('scroll', _spThumb, { passive: true });
    /* Content height changes with no scroll event: a phase opens, a room renders, copy re-wraps at a
       new width. ResizeObserver is the only honest signal for that; guarded because it is the one
       API here that an older browser may not carry, and a missing thumb update must not take the
       resizer down with it. */
    if (panel && typeof ResizeObserver === 'function') {
      try { new ResizeObserver(_spThumb).observe(panel); } catch (e) { /* non-fatal */ }
    }
    window.addEventListener('resize', _spThumb);
    _spThumb();

    var handle = document.getElementById('panel-resizer');
    if (!handle) return;                  /* the tier still works without a handle */

    /* ══ ONE BAR, TWO JOBS, AXIS-LOCKED ON FIRST INTENT — §82.77 ═══════════════════════════════════
     * `pointerdown` COMMITS TO NOTHING. The first LOCK_PX of travel decides which job this gesture
     * is, and that decision holds until `pointerup`.
     *
     * ⛔ NEVER BOTH IN ONE GESTURE. A bar that resizes a little AND scrolls a little because the
     *    user's hand was not perfectly straight is a control nobody trusts — and the damage is hard
     *    to undo, because undoing it requires the same imprecise gesture back.
     *
     * ⭐ THE THRESHOLD IS TRAVEL, NOT TIME, AND THAT IS DELIBERATE. A time-based decision makes a
     *    slow careful drag behave differently from a fast one, which is backwards: the careful user
     *    is the one who most needs the control to be predictable.
     *
     * ⚠️ THE SCROLL MAPPING IS THUMB-RELATIVE, NOT PAGE-JUMP. You may press anywhere on the bar, so
     *    treating the press point as a grab on the thumb is the only behaviour that is the same
     *    wherever you started. Travel is scaled by the track-to-content ratio CAPTURED AT LOCK TIME,
     *    so a re-wrap mid-drag cannot make the page accelerate under the user's hand. */
    var LOCK_PX = 4;
    var _spDown = null;                   /* null when idle; the gesture's frozen start state when not */

    function _spMove(e) {
      if (!_spDown) return;
      var dx = e.clientX - _spDown.x, dy = e.clientY - _spDown.y;

      if (!_spDown.axis) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;   /* still undecided */
        _spDown.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        document.body.classList.add(_spDown.axis === 'x' ? 'is-resizing-panel' : 'is-scrolling-panel');
      }

      if (_spDown.axis === 'x') {
        var rect = l.getBoundingClientRect();
        _spApply(e.clientX - rect.left, false);   /* live, unpersisted — commit on release */
      } else if (_spDown.ratio > 0) {
        panel.scrollTop = _spDown.top0 + dy * _spDown.ratio;
      }
      e.preventDefault();
    }

    function _spUp() {
      if (!_spDown) return;
      var axis = _spDown.axis;
      _spDown = null;
      document.body.classList.remove('is-resizing-panel');
      document.body.classList.remove('is-scrolling-panel');
      if (axis === 'x') {
        /* READ FROM THE WRITER'S OWN SCOPE. #studio-layout would still INHERIT the right value today,
           but reading it there means this line quietly depends on nothing ever re-shadowing the token
           below the root — which is the exact defect an earlier commit repaired. Read where written. */
        var cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--studio-panel-w'), 10);
        _spApply(cur, true);                    /* ⭐ persist ONCE, on release — not on every frame */
      }
      /* ⚠️ A gesture that locked to 'y' — or locked to nothing at all, i.e. a plain click — MUST NOT
         persist a width. The old handler persisted on every pointerup because there was only one job;
         with two, an accidental click would have written the current width to localStorage forever. */
      window.removeEventListener('pointermove', _spMove);
      window.removeEventListener('pointerup', _spUp);
    }

    handle.addEventListener('pointerdown', function (e) {
      var over  = panel ? panel.scrollHeight - panel.clientHeight : 0;
      var track = handle.clientHeight;
      var th    = parseInt(handle.style.getPropertyValue('--seam-thumb-h'), 10) || 0;
      _spDown = {
        x: e.clientX, y: e.clientY, axis: null,
        top0: panel ? panel.scrollTop : 0,
        /* pixels of content per pixel of thumb travel; 0 when there is nothing to scroll, which is
           also exactly when there is no thumb to have grabbed. */
        ratio: (over > 0 && track - th > 0) ? over / (track - th) : 0
      };
      window.addEventListener('pointermove', _spMove);
      window.addEventListener('pointerup', _spUp);
      e.preventDefault();
    });
    /* ⭐ KEYBOARD, NOT AN AFTERTHOUGHT. A separator you can only reach with a mouse is a control
       half the standard says you have built. 20px steps, Home/End to the bounds. */
    handle.addEventListener('keydown', function (e) {
      var cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--studio-panel-w'), 10) || DEFAULT_W;
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

  /* ⛔⛔ THE WIDTH LANDS NOW, AT PARSE TIME — BEFORE THE BODY EXISTS. MEASURED, NOT ASSUMED.
   * The CSS default was deleted from studio.html, so until this line runs the panel resolves
   * header.css's 480. FIVE OF FIVE cold headed loads painted BEFORE the old DOMContentLoaded write
   * landed (FCP 352-524ms vs write 377-528ms) — so deferring this would flash 480 and snap to 400
   * on a 1.7MB document.
   * ⭐ THIS FILE IS HEAD-LOADED AND NOT DEFERRED (studio.html), so documentElement is open and this
   *   is safe. The tier attribute cannot be set yet — #studio-layout is not parsed — and _spBind
   *   below sets it moments later through THE SAME FUNCTION, which is why the tier still cannot
   *   drift from the width.
   * ⚠️ IF THIS FILE IS EVER MOVED TO defer OR TO THE END OF BODY, THE FLASH COMES BACK. */
  _spApply(isFinite(_spStored()) ? _spStored() : DEFAULT_W, false);

  /* D15 — bind lifecycle-independently: the script may land before or after DOMContentLoaded. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _spBind);
  else _spBind();

  /* Exposed for gates and for any future surface that needs to set the panel programmatically.
     ⛔ NOT a second writer — it is the same `_spApply`, which is the point. */
  window._studioPanelApply = _spApply;
  window._studioPanelTierFor = _spTierFor;
  /* ⭐ EXPOSED SO A GATE CAN FORCE A RECOMPUTE AND THEN READ THE RESULT, rather than sleeping and
     hoping a ResizeObserver has fired. An instrument that waits for a frame it cannot observe is
     measuring its own timing. NOT a second writer — it is the same function the listeners call. */
  window._studioSeamThumb = _spThumb;
})();
