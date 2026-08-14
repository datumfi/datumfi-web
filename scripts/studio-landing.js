/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   THE STUDIO LANDING — the formula rendered as four movements and seven phases.

   ⭐ STEP 1 OF THE SPLIT. Additive and INERT: this paints the panel header and the empty canvas, and
   the existing vertical sections keep working underneath it untouched. NO PAGES ARE CREATED — a
   phase name opens and scrolls to the section that already exists, through the Studio's own
   toggleSection. Real navigation from day one, no new machinery.

   ⛔⛔ PLAIN TOP-LEVEL FUNCTIONS. NOT AN IIFE, NOT A NAMESPACE — the sandbox gates lift a function's
   TEXT and run it in `new Function(...)`; a namespace is invisible to them. Same structural rule as
   the other two parts.

   ── ⭐ THE FORMULA IS THE INFORMATION ARCHITECTURE ──────────────────────────────────────────────
   (D + A) × (T + U) = M → (A + E). The parentheses are not decoration: they group seven phases into
   FOUR MOVEMENTS — what you HAVE, what PRESSES on it, the RESULT, what you DO about it. Rendering
   the grouping teaches the method without a word of explanation, and it separates the two A's
   (ARCHITECTURE / ALIGNMENT) into visibly different movements, which resolves the letter collision.

   ⛔ FULL WORDS, NEVER LETTERS, IN CODE. ARCHITECTURE and ALIGNMENT both begin with A. Phase ids,
   DOM ids and gate names use the whole word. Cheap to enforce now, expensive once it is in seven
   URLs and forty gate names.

   ── ⛔ THE COMPLETENESS PREDICATE, AND WHY IT IS NEW CODE RATHER THAN A REUSE ────────────────────
   The spec originally said to REUSE the Studio's range-readiness bar. MEASURED ON A COLD FILE, that
   donor lights 2 of its 5 items before the user touches anything: `Datum` because #spend-input ships
   hard-coded "$100,000", and `Market Outlook` because a climate option is active by default.
   ⛔⛔ WIRING THAT UP WOULD HAVE OPENED THE FRONT DOOR WITH **ENDURANCE ALREADY ANSWERED** — the one
   phase whose entire argument is that the Datum is DERIVED LAST, never typed. A Datum asked for
   early is a guess wearing a target's clothes, and that one was not even asked for.
   🔑 REUSE-DON'T-FORK ASSUMES THE DONOR IS CORRECT. L48 IS A REUSE INSTRUCTION, NEVER A VERIFICATION
      EXEMPTION. The readiness bar is retired rather than repaired (Captain, 2026-08-13): it was
      built for the single-page Studio and does not survive the re-spine.

   ⭐⭐ THE RULE THIS PREDICATE OBEYS: **A PHASE THAT READS NOT YET BECAUSE WE CANNOT PROVE OTHERWISE
   IS HONEST; A PHASE THAT READS DONE BECAUSE A DEFAULT WAS PRE-FILLED IS NOT.** Four phases can be
   answered from real state today. THREE CANNOT, AND THEY RETURN false RATHER THAN BORROWING A
   NEARBY BOOLEAN — the durable signals they need (MC-has-run · a generated withdrawal order · a
   DERIVED Datum) are real work, not wiring, and they are on the record as such.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* THE SPINE. Order is the dependency chain, not a menu — you cannot honestly compute a Datum before
   you know what a person has, what presses on it, when income starts, and what the range looks like.
   `sec` is the section this phase opens TODAY; null means the phase has no markup yet. */
function _studioPhaseSpine() {
  return [
    { id: 'data',         numeral: 'I',   letter: 'D', name: 'DATA',         desc: 'Reveal the Ground.',      sec: 'sec-profile' },
    { id: 'architecture', numeral: 'II',  letter: 'A', name: 'ARCHITECTURE', desc: 'Define the Mass.',        sec: 'sec-drafting' },
    { id: 'tension',      numeral: 'III', letter: 'T', name: 'TENSION',      desc: 'Apply the Pressure.',     sec: 'sec-upkeep' },
    { id: 'uncertainty',  numeral: 'IV',  letter: 'U', name: 'UNCERTAINTY',  desc: 'Structure the Noise.',    sec: 'sec-income-layer' },
    { id: 'measurement',  numeral: 'V',   letter: 'M', name: 'MEASUREMENT',  desc: 'Resolve the Structure.',  sec: 'sec-climate' },
    { id: 'alignment',    numeral: 'VI',  letter: 'A', name: 'ALIGNMENT',    desc: 'Order the Estate.',       sec: null },
    { id: 'endurance',    numeral: 'VII', letter: 'E', name: 'ENDURANCE',    desc: 'Carry the Horizon.',      sec: 'sec-datum' }
  ];
}

/* THE FOUR MOVEMENTS. `glyph` is the operator that JOINS this movement to the previous one — the
   multiplication sign is an argument, not punctuation: pressure does not subtract from a plan, it
   SCALES it. The equals sign is earned, and the arrow is a consequence rather than an equality. */
function _studioMovements() {
  return [
    { numeral: 'I',   glyph: '',  expr: '(D + A)', label: 'WHAT YOU HAVE',        phases: ['data', 'architecture'] },
    { numeral: 'II',  glyph: '×', expr: '(T + U)', label: 'WHAT PRESSES ON IT',   phases: ['tension', 'uncertainty'] },
    { numeral: 'III', glyph: '=', expr: 'M',       label: 'THE RESULT',           phases: ['measurement'] },
    { numeral: 'IV',  glyph: '→', expr: '(A + E)', label: 'WHAT YOU DO ABOUT IT', phases: ['alignment', 'endurance'] }
  ];
}

/* ⛔ ALIGNMENT IS NOT "COMING SOON" AND MUST NEVER BECOME A GREYED TILE OR A SPINNER. It is a real
   panel that NAMES ITS OWN PRECONDITION — the honest blank doing work rather than apologising, and
   it teaches the dependency chain at the exact moment the user tests it. Authored strings. */
function _studioAlignmentSubline() {
  return 'Not built yet. It arrives once your range exists — the order you draw from, and when.';
}
function _studioAlignmentBody() {
  return 'Alignment is where the estate gets its order. Which account you draw from first, and when, '
       + 'changes how long the structure lasts — sometimes by years. This phase opens once Measurement '
       + 'has a range to order against.';
}

/**
 * Is this phase answered? Reads live state only — never a stored flag, never a default.
 * @param {string} id one of the spine ids (full word, never a letter)
 * @returns {boolean}
 */
function _phaseComplete(id) {
  var accts = (typeof state !== 'undefined' && state && state.accounts) ? state.accounts : [];
  var typeOf = function (a) {
    try { return (typeof getBaseType === 'function' ? getBaseType(a.baseId) : null) || {}; } catch (e) { return {}; }
  };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  switch (id) {
    /* Ages AND a retirement date. Both, because a profile with one of them cannot anchor a horizon. */
    case 'data': {
      if (typeof document === 'undefined') return false;
      var dob = (document.getElementById('pri-dob') || {}).value || '';
      var ret = (document.getElementById('target-ret') || {}).value || '';
      var age = (typeof parseAgeFromDob === 'function') ? parseAgeFromDob(dob) : null;
      var yr = parseInt((ret.replace(/\s/g, '').split('/').pop() || ''), 10);
      return !!(age && yr);
    }
    /* ⛔ ASSETS ONLY — the retired readiness bar counted ANY room with a value, so a mortgage
       answered the asset question. A LIABILITY IS NOT THE MASS, IT IS THE PRESSURE, and it belongs
       to TENSION. Narrowing this is the difference between a structure and a balance sheet. */
    case 'architecture':
      return accts.some(function (a) { return typeOf(a).taxCode !== 'debt' && num(a.value) > 0; });
    /* ⛔⛔ LIABILITY ROOMS ONLY — AND THE UPKEEP HALF OF R29's TEST IS DELIBERATELY NOT WIRED.
       The first cut of this predicate read `_getUpkeepModel().items.length`, which is TRUE ON A COLD
       FILE: `upkeepItems` (studio.html ~3550) ships SEEDED with two rows — "Housing Utilities" $350
       and "Groceries / Provisions" $800. So TENSION lit on an empty Studio, from data no user ever
       entered. ⭐ THAT IS THE EXACT DEFECT THIS PREDICATE EXISTS TO AVOID, COMMITTED INSIDE THE FIX
       FOR IT — caught only by rendering the landing on a cold file and looking at it.
       ⚠️ The two seeds could be excluded by their ids ('upk_1'/'upk_2' — the only non-random ones),
       but that is a hand-maintained list of two, which is the rot this repo has been bitten by
       repeatedly. So the upkeep leg JOINS the list of phases needing a real durable signal
       ("this line was entered by the user"), and until then TENSION rests on liabilities alone.
       🔑 UNDER-REPORTING IS HONEST; COUNTING A SEED AS AN ANSWER IS NOT. */
    case 'tension':
      return accts.some(function (a) { return typeOf(a).taxCode === 'debt' && num(a.value) > 0; });
    /* The claim age is LOCKED, not merely visited. */
    case 'uncertainty':
      try { return !!sessionStorage.getItem('ss_timing_locked_key'); } catch (e) { return false; }
    /* ⛔ NO DURABLE SIGNAL YET — AND A DEFAULT IS NOT ONE.
       measurement : "the Monte Carlo has run at least once" has no persisted flag. `isMeasured` is
                     the analysis-panel toggle, and an active .climate-option is a DEFAULT SELECTION,
                     which is the trap this predicate exists to avoid.
       alignment   : the phase does not exist yet. It is never answered, by construction.
       endurance   : requires a DERIVED Datum. #spend-input is TYPED and ships pre-filled, so reading
                     it would answer the method's final question with a guess nobody made. */
    case 'measurement':
    case 'alignment':
    case 'endurance':
      return false;
    default:
      return false;
  }
}

/* ARIA ONLY — no new visible strings anywhere on the landing. "not yet" is a SEQUENCE word, not a
   judgement word: a method with a dependency chain says "not yet"; a checklist says "incomplete".
   ⛔ ALIGNMENT GETS ITS OWN THIRD STATE because "not yet" would be a lie about an unbuilt phase — a
   screen reader must not promise a feature the sighted user can see is absent. */
function _phaseAriaLabel(phase, done) {
  var pretty = phase.name.charAt(0) + phase.name.slice(1).toLowerCase();
  if (phase.id === 'alignment') return pretty + ' — not built yet';
  return pretty + (done ? ' — answered' : ' — not yet');
}

function _studioPhaseRowHTML(phase) {
  var done = _phaseComplete(phase.id);
  var unbuilt = (phase.id === 'alignment');
  var dot = done ? '●' : '○';
  var sub = unbuilt ? _studioAlignmentSubline() : phase.desc;
  return '<button type="button" class="sl-phase' + (done ? ' is-done' : '') + (unbuilt ? ' is-unbuilt' : '') + '"'
       + ' data-phase="' + phase.id + '" onclick="_studioPhaseGo(\'' + phase.id + '\')"'
       + ' aria-label="' + _phaseAriaLabel(phase, done) + '">'
       + '<span class="sl-dot" aria-hidden="true">' + dot + '</span>'
       + '<span class="sl-numeral" aria-hidden="true">' + phase.numeral + '</span>'
       + '<span class="sl-name">' + phase.name + '</span>'
       + '<span class="sl-desc">' + sub + '</span>'
       + '</button>';
}

function _studioLandingHTML() {
  var spine = _studioPhaseSpine();
  var byId = {};
  spine.forEach(function (p) { byId[p.id] = p; });
  var out = '<div class="sl-formula" aria-hidden="true">(D + A) &times; (T + U) = M &rarr; (A + E)</div>';
  out += '<div class="sl-movements">';
  _studioMovements().forEach(function (mv) {
    out += '<div class="sl-movement">'
         + (mv.glyph ? '<div class="sl-glyph" aria-hidden="true">' + mv.glyph + '</div>' : '')
         + '<div class="sl-mv-head"><span class="sl-mv-expr">' + mv.expr + '</span>'
         + '<span class="sl-mv-label">' + mv.label + '</span></div>'
         + mv.phases.map(function (pid) { return _studioPhaseRowHTML(byId[pid]); }).join('')
         + '</div>';
  });
  out += '</div>';
  return out;
}

/* ⛔ THE ZERO-STATE LINE SHOWS AT ZERO ANSWERED PHASES AND DISAPPEARS THE MOMENT ANY PHASE IS
   ANSWERED. It is NOT a call to action and must not become one. An honest blank still reads as
   broken, and first paint is the one moment a new user has no context to forgive it. */
/* ⛔⛔ THE CANVAS IS NOT EMPTY AT LAUNCH, AND THE SPEC ASSUMED IT WAS.
 * The ghost plan exists to fix "the one moment the product looks like nothing" — an EMPTY right
 * panel on the landing. MEASURED 2026-08-13: a cold Studio already renders a full Shape (Datum
 * Intelligence, Structural Ceiling, Target Datum, Survival Floor). Drawing the plan over it put
 * dashed boxes and the words "Nothing here yet" ACROSS A CHART THAT VISIBLY HAS THINGS IN IT.
 * 🔑 A ZERO-STATE THAT APPEARS OVER CONTENT IS NOT A ZERO-STATE, IT IS A CONTRADICTION — and the one
 *    place it lands is the first thing a new user sees.
 * ⇒ IT DRAWS ONLY ONTO A GENUINELY EMPTY CANVAS. Today that means it effectively never shows, which
 *   is the honest answer until the Architect rules on where the plan should live. The mechanism is
 *   kept and proven so that ruling costs one line, not a rebuild. */
function _studioCanvasIsEmpty() {
  if (typeof document === 'undefined') return false;
  var shape = document.getElementById('shape-panel');
  if (shape && shape.offsetParent !== null && shape.innerHTML.trim().length > 0) return false;
  var svg = document.querySelector('#canvas-wrapper svg');
  if (svg && svg.getBoundingClientRect().height > 0) return false;
  return true;
}

function _studioGhostPlanHTML() {
  if (!_studioCanvasIsEmpty()) return '';
  var answered = _studioPhaseSpine().filter(function (p) { return _phaseComplete(p.id); }).length;
  var note = (answered === 0)
    ? '<div class="sl-ghost-note">Nothing here yet. Each phase you answer inks in a part of the plan.</div>'
    : '';
  var cells = _studioPhaseSpine().map(function (p) {
    return '<div class="sl-ghost-cell' + (_phaseComplete(p.id) ? ' is-inked' : '') + '"'
         + ' data-phase="' + p.id + '" aria-hidden="true"></div>';
  }).join('');
  return '<div class="sl-ghost-grid" aria-hidden="true">' + cells + '</div>' + note;
}

/* A phase name opens the section that already exists and scrolls to it.
   ⛔ toggleSection(id, btn) DEREFERENCES btn UNGUARDED, so the real section button is looked up with
   the SAME selector toggleSection itself uses — that keeps the +/- icon in step instead of forking a
   second open/close path. And an ALREADY-OPEN section is only scrolled to, never toggled: this is
   navigation, and a nav control that closes the thing you asked for is a bug. */
function _studioPhaseGo(id) {
  var phase = _studioPhaseSpine().filter(function (p) { return p.id === id; })[0];
  if (!phase) return;
  if (!phase.sec) { _studioShowAlignmentPanel(); return; }
  var el = document.getElementById(phase.sec);
  if (!el) return;
  if (el.style.display === 'none') {
    var btn = document.querySelector('[onclick="toggleSection(\'' + phase.sec + '\', this)"]');
    if (btn && typeof toggleSection === 'function') toggleSection(phase.sec, btn);
    else el.style.display = 'block';
  }
  try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
}

function _studioShowAlignmentPanel() {
  var host = document.getElementById('sl-alignment-panel');
  if (!host) return;
  host.innerHTML = '<div class="sl-align-body">' + _studioAlignmentBody() + '</div>';
  host.style.display = 'block';
  try { host.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
}

/* Repaint. Cheap and idempotent — the landing is derived entirely from live state, so it is safe to
   call on every input/change without tracking what actually moved. */
function _renderStudioLanding() {
  var host = document.getElementById('sl-movements-host');
  if (host) host.innerHTML = _studioLandingHTML();
  var ghost = document.getElementById('sl-ghost-plan');
  if (ghost) ghost.innerHTML = _studioGhostPlanHTML();
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', _renderStudioLanding);
  document.addEventListener('change', _renderStudioLanding);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(_renderStudioLanding, 300); });
}
