/* DatumFI · Estate ENERGIZE timeline (S2.4). Consumes the per-room descriptor array that
   DatumEstate.renderEstate(ctx) returns (§16.2-iii single hook surface) and owns the things
   that MOVE / breathe — separate from the near-pure renderer (LOCK-3 / WATCH-A, never inlined).
   S2.4: one-shot "FUNDED" pulse on isNew + marks each consumed room data-energized. A.1: the fill
   POURS up (scaleY 0->1) on funding instead of snapping. connect() (S2.5b) and reflow() (S2.5b) are
   LIVE — fund->wait->draw corridors + estate-organism settle (not stubs).
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
  var CONNECT_WAIT = 700, CONNECT_DRAW = 900;   // S2.5b — fund -> WAIT -> hallway DRAW (ms)
  var _connStart = Object.create(null);  // S2.5b — corridorId -> fund time (draw-sequence anchor, survives re-renders)
  var _now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  function run(rooms) {
    if (!rooms || !rooms.length) { _funded = Object.create(null); _pourStart = Object.create(null); return; }
    var seen = Object.create(null), arrived = null, transitioned = Object.create(null);   // arrived: new room (reflow); transitioned: 0->funded this render (connect)
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
        if (transitionFunded) transitioned[id] = true;   // S2.5b — which corridor to draw
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
    // S2.5b — corridors: reveal the hallway on the fund -> wait -> draw sequence. Called ALWAYS;
    // under STILL it falls back to drawing connected corridors statically (no anim), not hiding them.
    connect(rooms, now, transitioned);
    // S2.II — lens WOW: read the lens button .active state off the DOM (no host edit) and drive the
    // shock wave off the same descriptor array (§16.2-iii: one hook surface, no fork).
    shockwave(rooms);
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

  // S2.5b — connect()/reflow() are LIVE (not stubs): the fund-then-connect ordering + estate-organism
  // reflow run off the descriptor (+ the .corridors sidecar), seeked across re-renders.
  // S2.5b — CONNECT: reveal a corridor (a renderer-drawn path, R2 split) between two funded rooms.
  // A freshly-funded room's hallway stays hidden through CONNECT_WAIT, then draws over CONNECT_DRAW —
  // one WAAPI per corridor with the wait baked into the keyframes, seeked across re-renders so it
  // RESUMES (never restarts). Rooms that HYDRATE already funded were never seen empty -> no transition
  // -> drawn STATIC (no mass-draw on load), same spirit as the pour/breath.
  function connect(rooms, now, transitioned) {
    if (!rooms.corridors) return;
    rooms.corridors.forEach(function (c) {
      if (!c || !c.el) return;
      var bothFunded = _funded[c.fromId] && _funded[c.toId];
      if (!bothFunded) { _hideCorr(c); return; }                        // an endpoint empty -> hidden
      if (STILL) { _drawnCorr(c); return; }                             // reduced-motion / weak HW -> connected, NO draw anim
      var fresh = transitioned[c.fromId] || transitioned[c.toId];
      if (_connStart[c.id] == null && !fresh) { _drawnCorr(c); return; } // hydrated -> already connected (static)
      if (_connStart[c.id] == null) _connStart[c.id] = now;             // fresh fund -> start the sequence
      _drawCorr(c, now - _connStart[c.id]);                             // wait+draw WAAPI, SEEKED (resume)
    });
    // forget corridors that vanished or whose endpoint emptied (a re-fund re-animates)
    Object.keys(_connStart).forEach(function (k) {
      var live = rooms.corridors.some(function (c) { return c.id === k && _funded[c.fromId] && _funded[c.toId]; });
      if (!live) delete _connStart[k];
    });
  }
  function _hideCorr(c)  { c.el.style.strokeDasharray = c.len; c.el.style.strokeDashoffset = c.len; }
  function _drawnCorr(c) { c.el.style.strokeDasharray = c.len; c.el.style.strokeDashoffset = 0; }
  function _drawCorr(c, elapsed) {
    if (!c.el.animate) { _drawnCorr(c); return; }
    var total = CONNECT_WAIT + CONNECT_DRAW, hold = CONNECT_WAIT / total;
    c.el.style.strokeDasharray = c.len;
    // Effect timing is LINEAR so the WAIT holds for exactly CONNECT_WAIT ms; the draw ease lives on
    // the second keyframe (per-segment), so it eases only the len->0 reveal — NOT the whole timeline.
    var a = c.el.animate(
      [{ strokeDashoffset: c.len, offset: 0, easing: 'linear' },
       { strokeDashoffset: c.len, offset: hold, easing: 'cubic-bezier(0.4,0,0.2,1)' },   // hold flat, then draw eases
       { strokeDashoffset: 0,     offset: 1 }],
      { duration: total, fill: 'forwards' });
    try { a.currentTime = Math.min(elapsed, total); } catch (e) {}   // seek; past end clamps to "drawn"
  }
  function reflow(rooms, arrivedId) {
    rooms.forEach(function (r) {
      if (!r || !r.el || r.id === arrivedId || !r.el.animate) return;
      // nudge then gentle overshoot-settle. Group-transform channel — conflict-free with
      // breathe (fill opacity) / pour (fill transform) / pulse (wall filter).
      r.el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }],
        { duration: 700, easing: 'cubic-bezier(0.34,1.3,0.7,1)' });
    });
  }

  // ── S2.II — LENS WOW. Lens state is READ from the DOM button .active class (LOCK-3, no host edit);
  // module-local transition trackers; ALL motion via WAAPI; STILL (reduced-motion OR weak CPU) -> NO
  // animation, the renderer's static lens end-state stands. No total touched (visual only). ──────────
  var _lastShock = false;
  var _shockHi = [];                       // #inp-wrapper-<id> els currently red-highlighted (for cleanup)
  function _lensOn(id) { var b = document.getElementById(id); return !!(b && b.classList.contains('active')); }
  function _bpsvg() { return document.getElementById('bp-svg'); }

  // A4 — THERMODYNAMIC SHOCK WAVE: a crimson ring sweeps #bp-svg, volatile rooms CONTRACT on the
  // wavefront, the canvas JOLTS, and the LEFT ledger rows for market-risk (isInvestment) buckets flash
  // soft-red. Fires once per OFF->ON; the highlight re-applies each render while ON (survives input
  // re-renders) and clears on OFF. Borrows the .c-shockwave LOOK, rebuilt via WAAPI — NOT the c-prefix
  // cover node, and NO keyframe CSS added to studio.html.
  function shockwave(rooms) {
    var on = _lensOn('btn-shock');
    if (STILL) { if (!on) _clearShockHi(); _lastShock = on; return; }   // static shocked estate; no anim
    if (on) {
      _applyShockHi(rooms);                                             // idempotent; survives re-renders
      if (!_lastShock) _fireWave(rooms);                               // OFF->ON only: ring + contract + jolt
    } else if (_lastShock || _shockHi.length) {
      _clearShockHi();
    }
    _lastShock = on;
  }
  function _focal(rooms) {
    var hv = null;
    rooms.forEach(function (r) { if (r && r.d && (!hv || (r.weight || 0) > (hv.weight || 0))) hv = r; });
    return (hv && hv.d) ? { x: hv.d.cx, y: hv.d.cy } : { x: 700, y: 550 };   // heaviest room, else canvas center
  }
  function _fireWave(rooms) {
    var svg = _bpsvg(); if (!svg) return;
    var f = _focal(rooms), maxD = 600, WAVE = 620;
    rooms.forEach(function (r) { if (r && r.d) maxD = Math.max(maxD, Math.hypot(r.d.cx - f.x, r.d.cy - f.y) + 200); });
    // RING — net-new crimson ring; WAAPI expand+fade; self-removes on finish (no orphan node).
    var ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('class', 'estate-shockwave');
    ring.setAttribute('cx', f.x); ring.setAttribute('cy', f.y); ring.setAttribute('r', 1);
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', 'var(--danger)');
    ring.setAttribute('stroke-width', '6'); ring.setAttribute('pointer-events', 'none');
    svg.appendChild(ring);
    if (ring.animate) {
      var ra = ring.animate([{ r: 1, strokeWidth: 16, opacity: 0.9 }, { r: maxD, strokeWidth: 1, opacity: 0 }],
        { duration: WAVE, easing: 'cubic-bezier(0.2,0.6,0.2,1)', fill: 'forwards' });
      ra.onfinish = function () { if (ring.parentNode) ring.parentNode.removeChild(ring); };
    } else if (ring.parentNode) { ring.parentNode.removeChild(ring); }
    // CONTRACT — volatile rooms ease from the pre-shock scale (1/0.70) down to the rendered shocked
    // size, staggered by distance so they collapse as the wavefront reaches them. Group-transform
    // channel (transient; conflict-free with reflow). End-state = none -> settles to the rendered size.
    rooms.forEach(function (r) {
      if (!r || !r.el || !r.el.animate || !r.d) return;
      if (!(r.isInvestment || r.taxCode === 'liquid')) return;
      var delay = Math.min(WAVE * 0.6, (Math.hypot(r.d.cx - f.x, r.d.cy - f.y) / maxD) * WAVE * 0.6);
      r.el.style.transformBox = 'fill-box';
      r.el.style.transformOrigin = 'center';
      r.el.setAttribute('data-shock-contract', '1');   // durable proof (gate hook, race-free)
      r.el.animate([{ transform: 'scale(1.43)' }, { transform: 'scale(1)' }],
        { duration: 420, delay: delay, easing: 'cubic-bezier(0.3,0,0.2,1)' });
    });
    _jolt(svg);
    svg.setAttribute('data-shockwave', String(Date.now()));   // durable fire-proof (gate hook)
  }
  function _jolt(svg) {
    svg.setAttribute('data-shock-jolt', '1');   // durable proof (gate hook, race-free; set even with anim delay)
    if (!svg.animate) return;
    svg.animate(
      [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,4px)', offset: 0.2 },
       { transform: 'translate(5px,-3px)', offset: 0.5 }, { transform: 'translate(-3px,2px)', offset: 0.75 },
       { transform: 'translate(0,0)' }],
      { duration: 280, delay: 120, easing: 'ease-in-out' });
  }
  function _applyShockHi(rooms) {
    _clearShockHi();
    rooms.forEach(function (r) {
      if (!r || !r.isInvestment || !r.id) return;
      var w = document.getElementById('inp-wrapper-' + r.id);
      if (!w) return;
      w.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease';
      w.style.boxShadow = 'inset 0 0 0 1px var(--danger), 0 0 12px rgba(226,75,74,0.35)';
      w.style.backgroundColor = 'rgba(226,75,74,0.08)';
      _shockHi.push(w);
    });
  }
  function _clearShockHi() {
    _shockHi.forEach(function (w) { w.style.boxShadow = ''; w.style.backgroundColor = ''; });
    _shockHi = [];
  }

  window.DatumEnergize = { run: run, connect: connect, reflow: reflow };
})();
