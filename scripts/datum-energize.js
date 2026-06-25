/* DatumFI · Estate ENERGIZE timeline (S2.4). Consumes the per-room descriptor array that
   DatumEstate.renderEstate(ctx) returns (§16.2-iii single hook surface) and owns the things
   that MOVE / breathe — separate from the near-pure renderer (LOCK-3 / WATCH-A, never inlined).
   S2.4: one-shot "FUNDED" pulse on isNew + marks each consumed room data-energized. A.1: the fill
   POURS up (scaleY 0->1) on funding instead of snapping. connect()/reflow() are descriptor-ready
   stubs the S2.5 keyed-canvas refactor animates.
   Guard: prefers-reduced-motion disables the pulse + pour (instant full fill). */
(function () {
  'use strict';
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // S2.5a — NEW guard (A.1/S2.4 shipped none): a weak CPU also falls back to a static estate.
  var WEAK = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency)
               ? navigator.hardwareConcurrency < 4 : false;
  var STILL = REDUCE || WEAK;            // either guard -> NO breathe/connect/reflow (static estate)
  var POUR_MS = 850;
  var _funded = Object.create(null);     // room id -> was funded at the previous render (transition tracker)
  var _pourStart = Object.create(null);  // room id -> performance.now() when its pour began (continuity)
  var _breatheStart = null;              // S2.5a — global anchor: breathing phase continuity across re-renders
  var _now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  function run(rooms) {
    if (!rooms || !rooms.length) { _funded = Object.create(null); _pourStart = Object.create(null); return; }
    var seen = Object.create(null), arrived = null;   // arrived: a new room this render -> reflow trigger
    var now = _now();
    if (_breatheStart == null) _breatheStart = now;
    var breathePhase = now - _breatheStart;   // grows by real elapsed -> breathing resumes, never restarts
    rooms.forEach(function (r) {
      if (!r || !r.el) return;
      r.el.setAttribute('data-energized', '1');   // timeline consumed this descriptor (render-path proof)
      var id = r.id;
      var fundedNow = r.value > 0;
      if (id) seen[id] = true;
      // one-shot "FUNDED" glow pulse on a freshly-added, already-funded room
      if (r.isNew && fundedNow && !REDUCE) pulse(r);
      if (!REDUCE && fundedNow && id) {
        // POUR begins when a room first BECOMES funded: added-with-value (isNew) OR the common UX —
        // an EMPTY room the user just typed into (a tracked 0->funded transition). Rooms that hydrate
        // already funded were never seen empty -> no transition -> no pour (no mass-pour on load).
        var transitionFunded = (id in _funded) && !_funded[id];
        if (r.isNew || transitionFunded) {
          _pourStart[id] = now;
          pour(r, 0);                              // fresh pour from the floor
        } else if (_pourStart[id] != null && (now - _pourStart[id]) < POUR_MS) {
          // Pour still in-flight, but EACH keystroke re-renders the estate (innerHTML='') and recreates
          // this fill rect. Re-attach the pour to the NEW element seeked to its elapsed progress so it
          // CONTINUES smoothly instead of snapping full on the 2nd+ digit. (Captain's "type 25,000" bug.)
          pour(r, now - _pourStart[id]);
        }
        // else: pour finished (or room long-funded) -> leave the fill static at full
      }
      if (id) _funded[id] = fundedNow;
      if (r.isNew && id) arrived = id;                // S2.5b — a new room arrived this render
      // S2.5a — continuous weight-modulated breath on every funded room (idle = uninterrupted;
      // edit-burst = re-seek to phase). Guarded by STILL (reduced-motion OR weak CPU).
      if (!STILL && fundedNow) breathe(r, breathePhase);
    });
    // forget rooms that no longer exist so a re-added id can pour again
    Object.keys(_funded).forEach(function (k) { if (!seen[k]) { delete _funded[k]; delete _pourStart[k]; } });
    // S2.5b — estate-organism settle: existing rooms nudge to make room for a new arrival.
    if (!STILL && arrived) reflow(rooms, arrived);
  }

  function pulse(r) {
    if (r.rect && r.rect.animate) {
      r.rect.animate([
        { filter: 'drop-shadow(0 0 0 rgba(93,202,165,0))' },
        { filter: 'drop-shadow(0 0 14px rgba(93,202,165,0.85))', offset: 0.4 },
        { filter: 'drop-shadow(0 0 0 rgba(93,202,165,0))' }
      ], { duration: 900, easing: 'ease-out' });
    }
  }

  function pour(r, elapsed) {
    var f = r.el.querySelector('.room-fill');
    if (f && f.animate) {
      // A.1 Task 3 — the fill POURS up instead of blinking to full: scaleY 0->1 anchored at the
      // room floor. End state stays 100% (descriptor value unchanged). Reduced-motion users never
      // reach pour() (run() guards on !REDUCE), so they keep the rect at full height (instant).
      f.style.transformBox = 'fill-box';
      f.style.transformOrigin = '50% 100%';
      // ~850ms with a gentle, even curve (NOT ease-out-quint, which front-loads ~2/3 of the rise
      // into the first ~150ms and reads as a blink). This pours up at a measured pace and settles.
      var anim = f.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: POUR_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      // When continuing across a re-render, resume at the elapsed point (same easing/duration anchor)
      // so the height is continuous with the destroyed element — no restart, no snap.
      if (elapsed > 0 && anim) { try { anim.currentTime = elapsed; } catch (e) {} }
    }
  }

  // S2.5a — BREATHE: a continuous, weight-modulated opacity breath on a funded room's fill. Heavier
  // rooms (more % of investable, READ from the hub descriptor — LOCK-3, never recomputed) breathe
  // SLOWER and DEEPER; lighter rooms quicker and shallower. The fill OPACITY channel is independent
  // of pour (fill transform) / pulse (wall filter) / reflow (group transform) — no WAAPI contention.
  // Continuity: idle estate never re-renders so the infinite anim just runs; an edit-burst re-render
  // re-attaches it SEEKED to the global breathePhase, so motion resumes rather than restarting. A
  // per-id phase offset desyncs the rooms so the estate breathes organically, not in lockstep.
  function _hashPhase(id) {
    var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 4000;
  }
  function breathe(r, phaseMs) {
    var f = r.el.querySelector('.room-fill');
    if (!f || !f.animate) return;                          // empty room has no fill -> nothing to breathe
    var w = Math.max(0, Math.min(100, r.weight || 0));     // READ hub weight (LOCK-3)
    var period = 3200 + w * 38;                            // heavier -> slower (3.2s .. 7.0s)
    var amp    = 0.14 + w * 0.0030;                        // heavier -> deeper (opacity dip 0.14 .. 0.44)
    var a = f.animate(
      [{ opacity: 1 - amp }, { opacity: 1 }, { opacity: 1 - amp }],
      { duration: period, iterations: Infinity, easing: 'ease-in-out' });
    a.currentTime = (phaseMs + _hashPhase(r.id || '')) % period;
  }

  // S2.5 — descriptor-ready stubs (the fund-then-connect ordering + estate-organism reflow are
  // EXPRESSIBLE from the descriptor now; they need the keyed canvas to animate across renders).
  function connect(/* rooms */) { /* S2.5: energy-trace -> trench -> corridor -> retract */ }
  function reflow(rooms, arrivedId) {
    rooms.forEach(function (r) {
      if (!r || !r.el || r.id === arrivedId || !r.el.animate) return;
      // nudge then gentle overshoot-settle. Group-transform channel — conflict-free with
      // breathe (fill opacity) / pour (fill transform) / pulse (wall filter).
      r.el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }],
        { duration: 700, easing: 'cubic-bezier(0.34,1.3,0.7,1)' });
    });
  }

  window.DatumEnergize = { run: run, connect: connect, reflow: reflow };
})();
