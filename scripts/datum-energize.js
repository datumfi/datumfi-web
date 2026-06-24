/* DatumFI · Estate ENERGIZE timeline (S2.4). Consumes the per-room descriptor array that
   DatumEstate.renderEstate(ctx) returns (§16.2-iii single hook surface) and owns the things
   that MOVE / breathe — separate from the near-pure renderer (LOCK-3 / WATCH-A, never inlined).
   S2.4: one-shot "FUNDED" pulse on isNew + marks each consumed room data-energized. connect()/
   reflow() are descriptor-ready stubs the S2.5 keyed-canvas refactor animates.
   Guard: prefers-reduced-motion disables the pulse. */
(function () {
  'use strict';
  var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function run(rooms) {
    if (!rooms || !rooms.length) return;
    rooms.forEach(function (r) {
      if (!r || !r.el) return;
      r.el.setAttribute('data-energized', '1');   // timeline consumed this descriptor (render-path proof)
      // one-shot "FUNDED" pulse on a newly-funded room
      if (r.isNew && r.value > 0 && !REDUCE) energize(r);
    });
  }

  function energize(r) {
    if (r.rect && r.rect.animate) {
      r.rect.animate([
        { filter: 'drop-shadow(0 0 0 rgba(93,202,165,0))' },
        { filter: 'drop-shadow(0 0 14px rgba(93,202,165,0.85))', offset: 0.4 },
        { filter: 'drop-shadow(0 0 0 rgba(93,202,165,0))' }
      ], { duration: 900, easing: 'ease-out' });
    }
    var f = r.el.querySelector('.room-fill');
    if (f && f.animate) {
      f.animate([{ opacity: 0.55 }, { opacity: 1 }, { opacity: 0.85 }], { duration: 900, easing: 'ease-out' });
    }
  }

  // S2.5 — descriptor-ready stubs (the fund-then-connect ordering + estate-organism reflow are
  // EXPRESSIBLE from the descriptor now; they need the keyed canvas to animate across renders).
  function connect(/* rooms */) { /* S2.5: energy-trace -> trench -> corridor -> retract */ }
  function reflow(/* rooms */)  { /* S2.5: existing rooms ~4px nudge then settle on a new arrival */ }

  window.DatumEnergize = { run: run, connect: connect, reflow: reflow };
})();
