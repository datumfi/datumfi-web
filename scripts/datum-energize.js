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
    // shock wave + sequence-risk staging off the same descriptor array (§16.2-iii: one hook surface).
    shockwave(rooms);
    sequence(rooms);
    thermal(rooms);
    routing(rooms);
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
  // SHARED signature-color left-ledger highlighter (Ruling 2): runtime inline-style on the host DOM
  // #inp-wrapper-<id> rows — G1: NO markup hook, module-only (same path Shock has shipped). Each lens
  // calls with its color: Shock RED, Sequence TEAL, Thermal ORANGE, Routing BLUE (later). Returns the
  // touched els for cleanup. cssVar keeps the brand var (so gates see the color name); rgb drives the
  // alpha glow/wash. LOCK-3: pure display, never touches a total.
  function _ledgerHi(ids, cssVar, rgb) {
    var out = [];
    ids.forEach(function (id) {
      var w = document.getElementById('inp-wrapper-' + id); if (!w) return;
      w.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease';
      w.style.boxShadow = 'inset 0 0 0 1px ' + cssVar + ', 0 0 12px rgba(' + rgb + ',0.35)';
      w.style.backgroundColor = 'rgba(' + rgb + ',0.08)';
      out.push(w);
    });
    return out;
  }
  function _ledgerClear(list) { (list || []).forEach(function (w) { w.style.boxShadow = ''; w.style.backgroundColor = ''; }); }
  function _applyShockHi(rooms) {
    _ledgerClear(_shockHi);
    _shockHi = _ledgerHi(rooms.filter(function (r) { return r && r.isInvestment && r.id; }).map(function (r) { return r.id; }),
      'var(--danger)', '226,75,74');                         // Shock = RED (unchanged behavior)
  }
  function _clearShockHi() { _ledgerClear(_shockHi); _shockHi = []; }

  // SEQUENCE RISK lens (reuses isDatum / #btn-datum — NO new flag). Ranks the rooms most exposed to
  // sequence-of-returns risk (selling volatile investments EARLY in a downturn) and STAGES them: lift
  // + (1)(2)(3) badges + a top RISK LADDER, highest-first. The floor plan is NOT re-laid-out (rooms
  // stay put). Score reads taxCode/isInvestment/weight from the descriptor (LOCK-3, no total). Drawn
  // EVERY run while ON (survives input re-renders + IS the STILL end-state); the entrance MOTION fires
  // only on a fresh OFF->ON when !STILL. Draws ONLY into #bp-svg (own rooms) -> G1 not in play.
  var _lastSeq = false;
  var _seqHi = [];                          // #inp-wrapper-<id> teal-highlighted rows (cleanup)
  var SEQ_STAGE = { liquid: 0, pretax: 1, roth: 2 };   // withdrawal order: liquid drawn FIRST = most sequence-exposed
  function sequence(rooms) {
    var on = _lensOn('btn-datum');
    if (!on) { if (_seqHi.length) { _ledgerClear(_seqHi); _seqHi = []; } _lastSeq = false; return; }   // clear teal on OFF
    var svg = _bpsvg(); if (!svg) return;
    // RULED (A) ORDER-DOMINANT: sort ASCENDING by withdrawal stage (liquid<pretax<roth), then DESCENDING
    // by balance WITHIN a stage (tie-break). Magnitude NEVER crosses a stage boundary -> the lens reads
    // "which buckets you drain FIRST into a downturn," not "biggest account." isInvestment gate excludes
    // cash/physical/debt/trust. All read-only from ctx (taxCode + value) -> no total touched (LOCK-3).
    var ranked = [];
    rooms.forEach(function (r) {
      if (!r || !r.el || !r.isInvestment || !(r.taxCode in SEQ_STAGE)) return;
      ranked.push({ r: r, stage: SEQ_STAGE[r.taxCode], mag: r.value || 0 });
    });
    ranked.sort(function (a, b) { return a.stage - b.stage || b.mag - a.mag; });
    var fresh = !_lastSeq;
    var LIFT = -34;                                                     // UNIFORM flat height for ALL ranks
    ranked.forEach(function (e, i) {
      var r = e.r, rank = i + 1;
      r.el.setAttribute('data-seq-rank', String(rank));
      r.el.style.transformBox = 'fill-box';
      r.el.style.transformOrigin = 'center';
      r.el.style.transform = 'translateY(' + LIFT + 'px)';             // same flat height (NO staircase, NO per-rank delta)
      r.el.style.filter = 'drop-shadow(0 14px 12px rgba(0,0,0,0.5))';
      _seqBadge(r, rank);
      // SIMULTANEOUS one-time rise — ALL ranked rooms rise TOGETHER (no per-rank stagger; a staggered
      // rise reads as jitter on a vertical column), then HOLD. NO cascade, NO bob. STILL -> no rise.
      if (!STILL && fresh && r.el.animate) {
        r.el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + LIFT + 'px)' }],
          { duration: 480, easing: 'cubic-bezier(0.34,1.2,0.64,1)' });
      }
    });
    svg.setAttribute('data-seq-active', '1');
    if (!STILL) {                                                       // teal highlight + animated marker = flourish (!STILL ONLY)
      _ledgerClear(_seqHi);
      _seqHi = _ledgerHi(ranked.map(function (e) { return e.r.id; }), 'var(--teal-mid)', '93,202,165');   // Sequence = TEAL
      svg.setAttribute('data-seq-animated', '1');
    }
    _lastSeq = on;
  }
  function _seqBadge(r, rank) {
    if (!r.d) return;
    var ns = 'http://www.w3.org/2000/svg';
    var g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'seq-badge');
    var tint = document.createElementNS(ns, 'rect');
    tint.setAttribute('x', r.d.x); tint.setAttribute('y', r.d.y);
    tint.setAttribute('width', r.d.w); tint.setAttribute('height', r.d.h);
    tint.setAttribute('fill', 'rgba(226,75,74,0.12)'); tint.setAttribute('pointer-events', 'none');
    var cx = r.d.x + r.d.w - 18, cy = r.d.y + 18;   // top-RIGHT corner: clears the top-left SQUARE FOOTAGE box
    var c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 12);
    c.setAttribute('fill', 'var(--danger)'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '1.5');
    var t = document.createElementNS(ns, 'text');
    t.setAttribute('x', cx); t.setAttribute('y', cy + 4); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'var(--font-mono)'); t.setAttribute('font-size', '13');
    t.setAttribute('font-weight', 'bold'); t.setAttribute('fill', '#fff'); t.textContent = String(rank);
    g.appendChild(tint); g.appendChild(c); g.appendChild(t);
    r.el.appendChild(g);     // inside the room group -> lifts with the room, wiped+redrawn each render
  }

  // THERMAL — NIGHT-VISION HEAT-SCAN (reuses isThermal / #btn-thermal). The renderer already tags
  // rooms tax-{taxCode} (host CSS L964-968 recolors them); this LAYERS night-vision ON TOP via runtime
  // inline styles (no host edit): a one-pass orange scan sweeps #bp-svg revealing the heat, ONLY the
  // PRE-TAX rooms (trapped-tax liability) glow + sustained heat-breathe, everything else dims to a COOL
  // EMBER (non-zero opacity, never black), and the pre-tax ledger rows highlight ORANGE. STILL -> the
  // static host-CSS recolor stands (no scan/breathe/dim). Read-only on taxCode (LOCK-3); no total.
  var _lastTherm = false;
  var _thermHi = [];                        // #inp-wrapper teal... ORANGE-highlighted hot rows (cleanup)
  var _thermBStart = null;                  // heat-breathe phase anchor (resume across re-renders)
  function _thermClass(r) {
    if (r.taxCode === 'pretax') return 'hot';
    if (r.isDebt || r.taxCode === 'debt' || r.taxCode === 'trust') return 'identity';   // keep red/purple, faint
    return 'cool';                                                                        // roth/liquid/physical/income
  }
  function thermal(rooms) {
    var on = _lensOn('btn-thermal');
    var svg = _bpsvg();
    if (!on) { if (_thermHi.length) { _ledgerClear(_thermHi); _thermHi = []; } if (svg) svg.removeAttribute('data-thermal-animated'); _lastTherm = false; return; }
    if (STILL) { _lastTherm = on; return; }     // host-CSS recolor IS the static end-state; no flourish
    if (!svg) return;
    var fresh = !_lastTherm, scanMs = 1200;
    if (_thermBStart == null) _thermBStart = _now();
    var bphase = _now() - _thermBStart, hotIds = [];
    rooms.forEach(function (r) {
      if (!r || !r.el) return;
      var cls = _thermClass(r);
      // reveal as the scan crosses the room's cy (one-time on fresh OFF->ON; instant on re-renders)
      var revealMs = fresh ? Math.max(0, Math.min(scanMs, (((r.d ? r.d.cy : 600) - 160) / 850) * scanMs)) : 0;
      r.el.style.transition = 'opacity 0.45s ease ' + revealMs + 'ms, filter 0.45s ease ' + revealMs + 'ms';
      if (cls === 'hot') {
        r.el.style.opacity = '1';
        r.el.style.filter = 'drop-shadow(0 0 12px rgba(255,184,100,0.85))';
        if (r.id) hotIds.push(r.id);
        _thermBreathe(r, bphase, revealMs);     // SUSTAINED heat-breathe (glow/opacity, NOT transform), pre-tax only
      } else {
        r.el.style.opacity = (cls === 'identity') ? '0.32' : '0.30';   // COOL EMBER — non-zero floor, never black
        r.el.style.filter = 'none';
      }
    });
    if (fresh) _thermScan(svg, scanMs);
    _ledgerClear(_thermHi);
    _thermHi = _ledgerHi(hotIds, 'var(--hot)', '255,184,100');          // ORANGE _ledgerHi on hot (pre-tax) rows ONLY
    svg.setAttribute('data-thermal-animated', '1');
    _lastTherm = on;
  }
  function _thermBreathe(r, phase, delayMs) {
    if (!r.el.animate) return;
    var a = r.el.animate(
      [{ filter: 'drop-shadow(0 0 6px rgba(255,184,100,0.5))' },
       { filter: 'drop-shadow(0 0 18px rgba(255,184,100,0.95))' },
       { filter: 'drop-shadow(0 0 6px rgba(255,184,100,0.5))' }],
      { duration: 2600, iterations: Infinity, easing: 'ease-in-out', delay: delayMs || 0 });
    try { if (!delayMs) a.currentTime = phase % 2600; } catch (e) {}   // resume across re-renders
  }
  function _thermScan(svg, ms) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    s.setAttribute('class', 'thermal-scan');
    s.setAttribute('x', '180'); s.setAttribute('y', '150'); s.setAttribute('width', '1040'); s.setAttribute('height', '14');
    s.setAttribute('fill', 'rgba(255,184,100,0.5)'); s.setAttribute('pointer-events', 'none');
    s.style.filter = 'blur(4px)';
    svg.appendChild(s);
    if (s.animate) {
      var a = s.animate(
        [{ transform: 'translateY(0)', opacity: 0.1 }, { transform: 'translateY(40px)', opacity: 0.7, offset: 0.1 },
         { transform: 'translateY(860px)', opacity: 0.7, offset: 0.95 }, { transform: 'translateY(900px)', opacity: 0 }],
        { duration: ms, easing: 'linear' });
      a.onfinish = function () { if (s.parentNode) s.parentNode.removeChild(s); };
    } else if (s.parentNode) { s.parentNode.removeChild(s); }
    svg.setAttribute('data-thermal-scan', String(Date.now()));   // durable fire-proof (gate hook)
  }

  // ROUTING — DIRECTED FLOWING CURRENT (reuses isRouting / #btn-routing). The renderer draws the
  // .outflow-route (liquid->pretax->roth withdrawal sequence) + .demolition-route (liquid->each priority
  // debt); host CSS L978-980 colors them teal/gold + a basic dashFlow. This LAYERS the wow ON TOP via
  // INLINE styles (no host edit): two distinct flows. (1) OUTFLOW = PURPLE — a slow draw-on then a
  // bright traveling comet (capital moving through the plumbing). (2) DEBT-DESTRUCTION = AMBER->WHITE —
  // a draw-on then a white-hot sparking fuse traveling toward each priority debt. Two-color left ledger
  // (purple sequence rows + amber priority-debt rows). STILL -> static recolored paths, no flow (also
  // fixes the CSS dashFlow ignoring reduced-motion). GEOMETRY-READ GUARD: the comet/fuse read d from the
  // ALREADY-RENDERED route paths — never recompute geometry. LOCK-3 read-only; no total touched.
  var _lastRouting = false;
  var _routingHi = [];                      // #inp-wrapper rows highlighted (purple + amber) for cleanup
  var _routeStart = null;                   // flow phase anchor (resume across re-renders)
  function routing(rooms) {
    var on = _lensOn('btn-routing');
    var svg = _bpsvg();
    if (!on) { if (_routingHi.length) { _ledgerClear(_routingHi); _routingHi = []; } if (svg) svg.removeAttribute('data-routing-animated'); _lastRouting = false; return; }
    if (!svg) return;
    var outflow = svg.querySelector('.outflow-route');
    var demos = Array.prototype.slice.call(svg.querySelectorAll('.demolition-route'));
    var fresh = !_lastRouting, drawMs = 900;
    if (_routeStart == null) _routeStart = _now();
    var phase = _now() - _routeStart;
    // base recolor + (fresh, !STILL) slow draw-on; else solid. animation:none kills the CSS dashFlow
    // (so STILL is honored). GEOMETRY-READ: getTotalLength/d come from the rendered path only.
    function paint(path, color, glow) {
      if (!path) return;
      var len = path.getTotalLength ? path.getTotalLength() : 600;
      path.style.stroke = color; path.style.animation = 'none';
      path.style.strokeDasharray = len; path.style.filter = 'drop-shadow(0 0 4px ' + glow + ')';
      if (!STILL && fresh && path.animate) {
        path.style.strokeDashoffset = len;
        path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: drawMs, easing: 'cubic-bezier(0.4,0,0.2,1)', fill: 'forwards' });
      } else { path.style.strokeDashoffset = 0; }
    }
    paint(outflow, '#c84fe3', 'rgba(200,79,227,0.7)');                       // OUTFLOW base = purple
    demos.forEach(function (d) { paint(d, '#f5a623', 'rgba(245,166,35,0.7)'); });   // DEMOLITION base = amber
    if (!STILL) {
      var cd = fresh ? drawMs : 0;                                          // current starts AFTER the draw-on
      if (outflow) _flowDash(svg, outflow.getAttribute('d'), 'routing-comet', '#e9a6ff', 'rgba(200,79,227,0.95)', 26, 2200, cd, phase, false);
      demos.forEach(function (d) { _flowDash(svg, d.getAttribute('d'), 'routing-fuse', '#fff7d0', 'rgba(255,247,208,0.98)', 14, 1500, cd, phase, true); });
      var seqIds = rooms.filter(function (r) { return r && r.id && ['liquid', 'pretax', 'roth'].indexOf(r.taxCode) >= 0; }).map(function (r) { return r.id; });
      var fuseIds = rooms.filter(function (r) { return r && r.id && r.isDebt && r.isPriority; }).map(function (r) { return r.id; });
      _ledgerClear(_routingHi);
      _routingHi = _ledgerHi(seqIds, '#c84fe3', '200,79,227').concat(_ledgerHi(fuseIds, '#f5a623', '245,166,35'));   // PURPLE seq + AMBER priority-debt
      svg.setAttribute('data-routing-animated', '1');
    }
    _lastRouting = on;
  }
  // a bright short dash that rides the route as a traveling "current" (comet / fuse-spark). d is READ
  // from the rendered route path (geometry-read guard). flicker -> the fuse spark pulses (lit-fuse feel).
  function _flowDash(svg, d, cls, color, glow, dashLen, dur, delayMs, phase, flicker) {
    if (!d) return;
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', cls); p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', flicker ? '4' : '3'); p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('pointer-events', 'none'); p.style.filter = 'drop-shadow(0 0 ' + (flicker ? 8 : 6) + 'px ' + glow + ')';
    svg.appendChild(p);
    var len = p.getTotalLength ? p.getTotalLength() : 600;
    p.style.strokeDasharray = dashLen + ' ' + Math.max(1, len);
    if (p.animate) {
      var a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, iterations: Infinity, easing: 'linear', delay: delayMs || 0 });
      try { if (!delayMs) a.currentTime = phase % dur; } catch (e) {}
      if (flicker) p.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 260, iterations: Infinity, easing: 'ease-in-out' });
    }
    return p;
  }

  window.DatumEnergize = { run: run, connect: connect, reflow: reflow };
})();
