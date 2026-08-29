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
    /* ⭐ `canvas` — WHICH SIDE THE ROOM OPENS ON, Captain-ruled 2026-08-15, and the rule is about
       WHAT THE ROOM'S CONTROLS DRIVE, not about the room's position in the spine. DATA's inputs are
       the timeline and spend sliders, which move the SHAPE, so the canvas should be showing the
       thing the user's hands are on. ARCHITECTURE's inputs are rooms, which are capital-authority
       for the ESTATE. A control whose effect is drawn on the other canvas is a control acting at a
       distance.
       ⚠️ ONLY THESE TWO ARE RULED. The remaining five are NOT guesses dressed as decisions — they
       carry no `canvas` key and fall through to the estate default set in _studioEnterRoom, which is
       the behaviour shipped in 8024786. Flagged for a ruling rather than inferred, because the
       inference (upkeep/income/climate/datum all drive the Shape) is plausible and unverified, and
       a plausible unverified default is how this file got its last three defects. */
    /* 🖊️ THE THREE-LINE GRAMMAR, CAPTAIN-AUTHORED AND WIRED VERBATIM (§82.4, confirmed 2026-08-20):
       `name` = THE PHASE (the method's own word) · `desc` = THE VERB (poetic, italic — what the
       phase DOES to the structure) · `plain` = THE PLAIN NOUN (mono caps — what a cold user will
       actually find in the room).
       🔑🔑 BRANDED -> POETIC -> CRYSTAL CLEAR, IN THAT ORDER, EVERY CARD. A user who knows the
       method reads line 1; a user who has never heard of us reads line 3 and still knows what is
       behind the card. NOBODY IS EXCLUDED AND NOTHING IS DUMBED DOWN.
       ⛔ `numeral` IS RETIRED FROM THE CARDS (Captain-ruled 2026-08-20: "too much to have numbers
       AND roman numerals... lean into only 4, feels less imposing than 7"). It stays in the DATA
       because the phase's ordinal is a fact about the method, not about this markup — the same
       reason mv.glyph and mv.expr survived their own removals. THE CARDS RENDER `letter` AS A
       DROP-CAP INSTEAD.
       ⚠️ `desc` FOR DATA CHANGED: 'Set the Ground.' -> 'Establish the Baseline.' §82.5 struck the
       old line because REVEAL was already Measurement's verb and TWO PHASES CANNOT SHARE THE
       PRODUCT'S STRONGEST VERB; 'baseline' is the truer word for a phase whose job is to fix a
       starting point. */
    { id: 'data',         numeral: 'I',   letter: 'D', name: 'DATA',         desc: 'Establish the Baseline.', plain: 'THE STARTING POINT',                sec: 'sec-profile',  canvas: 'shape' },
    { id: 'architecture', numeral: 'II',  letter: 'A', name: 'ARCHITECTURE', desc: 'Define the Mass.',        plain: 'ACCOUNTS AND ASSETS',               sec: 'sec-drafting', canvas: 'estate' },
    { id: 'tension',      numeral: 'III', letter: 'T', name: 'TENSION',      desc: 'Apply the Pressure.',     plain: 'SPENDING AND OBLIGATIONS',          sec: 'sec-upkeep' },
    { id: 'uncertainty',  numeral: 'IV',  letter: 'U', name: 'UNCERTAINTY',  desc: 'Structure the Noise.',    plain: 'SOCIAL SECURITY AND PENSION TIMING', sec: 'sec-income-layer' },
    { id: 'measurement',  numeral: 'V',   letter: 'M', name: 'MEASUREMENT',  desc: 'Reveal the Range.',       plain: 'MARKET CONDITIONS AND SIMULATIONS',     sec: 'sec-climate' },
    { id: 'alignment',    numeral: 'VI',  letter: 'A', name: 'ALIGNMENT',    desc: 'Order the Estate.',       plain: 'ACCOUNT WITHDRAWAL STRATEGY',       sec: null },
    { id: 'endurance',    numeral: 'VII', letter: 'E', name: 'ENDURANCE',    desc: 'Carry the Horizon.',      plain: 'SUSTAINABLE RETIREMENT SPENDING',   sec: 'sec-datum' }
  ];
}

/* THE FOUR MOVEMENTS. `glyph` is the operator that JOINS this movement to the previous one — the
   multiplication sign is an argument, not punctuation: pressure does not subtract from a plan, it
   SCALES it. The equals sign is earned, and the arrow is a consequence rather than an equality. */
function _studioMovements() {
  return [
    /* 🖊️ CAPTAIN-AUTHORED 2026-08-15, replacing labels that named the CONTENT of each movement.
       ⭐ BUILD IT · TEST IT · KNOW IT · LIVE IT is the method in four words a user can repeat, and
       it names the USER'S ACT rather than the section's subject. The parenthesised expression is
       untouched: THE GROUPING IS THE ARGUMENT, THE VERBS ARE THE WAYFINDING.
       ⚠️ All four are caps for consistency — he wrote "Live it" in sentence case, and it is all four
       or none, never mixed. Flagged for him to overrule. */
    /* 🖊️ CAPTAIN-RULED 2026-08-20 AND THIS IS THE FINAL SET. Two things changed and both are
       authored copy on a live surface, so neither was inferred:
       ⛔ 'KNOW IT' IS RETIRED AND DOES NOT RETURN. The brand MEASURES; it does not claim knowledge.
       ⛔ AND THE MAPPING MOVED: 'TEST IT' returns to (T + U) and 'SHAPE IT' takes M. The product
          argument is the Captain's: (T + U) is where pressure and timing are APPLIED to the
          structure — that is testing it — and M PRODUCES THE SHAPE, which is the product's own
          noun. 🔑 SHAPE IT ON MEASUREMENT IS NOT A METAPHOR; IT IS THE PHASE LABELLED WITH THE
          THING IT LITERALLY OUTPUTS.
       ⚠️ THE MOCKUP AND SCREENSHOT SHOW 02 SHAPE / 03 TEST — THE OPPOSITE. They are the
          tweaking-in-progress; this is the settled answer, confirmed explicitly. THE ARTIFACT WAS
          OLDER THAN THE DECISION, WHICH IS WHY THIS WAS ASKED RATHER THAN READ OFF THE PICTURE.
       ⭐ `num` is the pillar's own 01-04, printed. `sub` is its sub-label — Foundation · Forces ·
          Form · Framework, an F-family escalating from material to system.
       ⭐ `tone` IS BY POSITION, NOT BY LABEL (§82.2: the gradient runs across the four MOVEMENTS).
          So swapping the two labels leaves the colours where they are — Captain-confirmed. */
    { numeral: 'I',   num: '01', glyph: '',  expr: '(D + A)', label: 'BUILD IT', sub: 'FOUNDATION', tone: 'teal',   phases: ['data', 'architecture'] },
    { numeral: 'II',  num: '02', glyph: '×', expr: '(T + U)', label: 'TEST IT',  sub: 'FORCES',     tone: 'violet', phases: ['tension', 'uncertainty'] },
    { numeral: 'III', num: '03', glyph: '=', expr: 'M',       label: 'SHAPE IT', sub: 'FORM',       tone: 'blue',   phases: ['measurement'] },
    { numeral: 'IV',  num: '04', glyph: '→', expr: '(A + E)', label: 'LIVE IT',  sub: 'FRAMEWORK',  tone: 'gold',   phases: ['alignment', 'endurance'] }
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

/* 🖊️ THE SEVEN ICONS — LIFTED VERBATIM FROM `datumae_studio_framework_v13.html`, THE CAPTAIN'S OWN
   DESIGN FILE, AND NOT REDRAWN. He named two specifically (the HOURGLASS for Uncertainty, the
   histogram for Measurement) and an icon redrawn from a description is an icon nobody authored.
   ⛔ PATHS COPIED CHARACTER FOR CHARACTER. If one ever looks wrong, diff it against v13 before
      editing it — the mockup is the source and this is the copy. */
function _studioPhaseIcon(id) {
  var d = {
    data: '<path d="M8 18L25 8l17 10-17 10L8 18Z"/><path d="M8 27l17 10 17-10M8 36l17 10 17-10"/>',
    architecture: '<path d="M5 7h40v36H5zM18 7v36M32 7v36M5 19h40M5 31h40"/>',
    tension: '<path d="M10 6v19M25 6v19M40 6v19M6 25h8M21 25h8M36 25h8M10 25l-4-4M10 25l4-4M25 25l-4-4M25 25l4-4M40 25l-4-4M40 25l4-4"/><path d="M5 39c11-9 19 8 29-1 5-5 9-3 12-1"/>',
    uncertainty: '<path d="M12 8h26M14 11h22"/><path d="M12 42h26M14 39h22"/><path d="M16 11c0 7 3 11 9 14-6 4-9 8-9 14"/><path d="M34 11c0 7-3 11-9 14 6 4 9 8 9 14"/><path d="M20 17h10M21 34h8"/><path d="M25 24v4"/><circle cx="25" cy="30" r="1.2"/>',
    measurement: '<path d="M6 42V10M6 42h38"/><rect x="12" y="28" width="4" height="14"/><rect x="19" y="21" width="4" height="21"/><rect x="26" y="16" width="4" height="26"/><rect x="33" y="24" width="4" height="18"/><path d="M10 34c4-8 9-13 14-13 6 0 8 10 13 10 3 0 6-2 9-6"/>',
    alignment: '<path d="M12 7v36M25 7v36M38 7v36M6 17h12M19 32h12M32 20h12"/><circle cx="12" cy="17" r="5"/><circle cx="25" cy="32" r="5"/><circle cx="38" cy="20" r="5"/>',
    endurance: '<path d="M25 5l17 7v13c0 10-7 17-17 21C15 42 8 35 8 25V12l17-7Z"/><path d="M25 14v22M16 25h18"/>'
  }[id];
  return d ? '<svg viewBox="0 0 50 50" aria-hidden="true">' + d + '</svg>' : '';
}

function _studioPhaseRowHTML(phase) {
  var done = _phaseComplete(phase.id);
  /* ⛔ THE "Not built yet" SUB-LINE IS GONE (§12.4 struck, Captain-ruled 2026-08-15) and ALIGNMENT
     now renders exactly like the other six — same descriptor, same weight, same colour.
     🔑 A PHASE THAT APOLOGISES FOR ITSELF ON THE FRONT DOOR IS NOT A PHASE, IT IS A FOOTNOTE. The
     method has seven movements and the landing is the place that promises them; whether one of
     them is finished is a fact for the room, not for the map.
     ⚠️ THE ALIGNMENT PANEL BODY IS UNCHANGED and still carries its authored waiting copy — only the
     landing apology goes. _studioAlignmentSubline() is left in place because that panel uses it. */
  var sub = phase.desc;
  /* ⭐ NO ● / ○ DOT — Captain-ruled 2026-08-14, removed as visual noise.
     ⚠️ _phaseComplete STILL RUNS and `is-done` still lands on the row, because the ANSWERED /
     NOT YET state is still spoken through the authored aria-label (§12.5) and the predicate is the
     signal the spine will gate on later. 🔑 THE DOT WAS A RENDERING OF THE STATE, NOT THE STATE. */
  /* ⛔ THE ROMAN NUMERAL IS GONE FROM THE CARD (Captain-ruled 2026-08-20). The card now opens with
     the phase's INITIAL as a drop-cap, exactly as the design file does — `D`ATA, `A`RCHITECTURE.
     Two numbering systems on one panel was the thing being removed; 01-04 stays on the pillars.
     ⚠️ A11Y NOTE, FLAGGED NOT CHANGED: this button carries an authored `aria-label`, and an
     aria-label OVERRIDES the element's inner text for a screen reader. So the verb and the plain
     noun are NOT announced — the reader hears only _phaseAriaLabel's sentence. That was already
     true of the verb before this commit; the third line joins it rather than creating the problem.
     ⛔ IT IS NOT SILENTLY "FIXED" HERE: the aria-label is AUTHORED COPY (§12.5) and rewriting it
     to fold in two more lines is an authoring decision, not a wiring one. Raised, not taken. */
  return '<button type="button" class="sl-phase' + (done ? ' is-done' : '') + '"'
       + ' data-phase="' + phase.id + '" onclick="_studioPhaseGo(\'' + phase.id + '\')"'
       + ' aria-label="' + _phaseAriaLabel(phase, done) + '">'
       + '<span class="sl-icon" aria-hidden="true">' + _studioPhaseIcon(phase.id) + '</span>'
       + '<span class="sl-copy">'
       + '<span class="sl-name"><span class="sl-initial">' + phase.letter + '</span>' + phase.name.slice(1) + '</span>'
       + '<span class="sl-desc">' + sub + '</span>'
       + '<span class="sl-plain">' + phase.plain + '</span>'
       + '</span>'
       + '<span class="sl-chev" aria-hidden="true">&rsaquo;</span>'
       + '</button>';
}

function _studioLandingHTML() {
  var spine = _studioPhaseSpine();
  var byId = {};
  spine.forEach(function (p) { byId[p.id] = p; });
  /* The formula line is prepended at the END, after the spine wrapper is built around the
     movements, so it sits ABOVE the spine rather than inside it. */
  var out = '<div class="sl-movements">';
  _studioMovements().forEach(function (mv) {
    /* ⭐ NO OPERATOR GLYPH — Captain-ruled 2026-08-14 along with the bracket rules. The formula is
       printed in full one line above, so the × + = → restated it a second time in a weaker form.
       mv.glyph is left in _studioMovements() rather than deleted: it is the movement's own identity
       in the data, and the day a Datum Dashboard renders the formula graphically it is what that
       will read. NOTHING IS BEING HIDDEN — the labels carry the grouping in words. */
    /* ⭐⭐ AND NO EXPRESSION EITHER — Captain-ruled 2026-08-15, the SAME ruling one step further.
       `(D + A)` beside BUILD IT printed the formula a second time, fragment by fragment, directly
       under the line that already prints it whole. THE FORMULA IS STATED ONCE, AT THE TOP.
       mv.expr stays in the data for exactly the reason mv.glyph did — the movement's identity lives
       in the table, not in this markup, and the labels carry the grouping in words. */
    /* ⭐ data-tone CARRIES THE MOVEMENT'S COLOUR TO THE STYLESHEET RATHER THAN INLINING IT. The
       gradient runs teal -> violet -> blue -> gold ACROSS THE FOUR MOVEMENTS (§82.2), so the tone
       belongs to the POSITION and the CSS reads it off the attribute — which is why swapping two
       labels leaves the colours alone. A colour inlined here would have travelled with the label. */
    out += '<div class="sl-movement" data-tone="' + mv.tone + '">'
         + '<div class="sl-mv-head">'
         + '<span class="sl-mv-num" aria-hidden="true">' + mv.num + '</span>'
         + '<span class="sl-mv-label">' + mv.label + '</span>'
         + '<span class="sl-mv-sub">' + mv.sub + '</span></div>'
         + '<div class="sl-cards">'
         + mv.phases.map(function (pid) { return _studioPhaseRowHTML(byId[pid]); }).join('')
         + '</div></div>';
  });
  out += '</div>';
  /* ⛔ THE SPINE IS DECORATION AND IS MARKED AS SUCH — it draws the dependency chain as a line, the
     single strongest thing in the donor, but it carries no information a screen reader needs that
     the movement labels do not already speak.
     ⛔⛔ THE DOT IS STATIC IN THIS COMMIT, DELIBERATELY. §82.7 ruled the ball/scroll mechanic is
     WIRING, not colour, and lands AFTER the room split. A travelling dot needs scroll observation
     and a notion of "where you are" that Step 3 is about to redefine — building it now would be
     building it twice. AND IT MARKS WHERE YOU ARE, NEVER HOW FAR YOU HAVE GOT (§82.2): a dot that
     implied completion would re-create the retired readiness bar by drawing. */
  out = '<div class="sl-chain-wrap">'
      + '<div class="sl-chain" aria-hidden="true"><span class="sl-dot"></span></div>'
      + out + '</div>';
  /* ⛔ THE FORMULA LINE WAS REMOVED HERE ON 2026-08-28, NOT IN studio.html — it was never markup.
     This function prepended it to the movements list, which is why retiring it edited a SACRED host.
     The landing now opens with the four-pillar journey cue instead; the formula still appears in the
     entry overlay, which is a different surface and keeps it. */
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

/* ⛔⛔ RETIRED 2026-08-15 — Captain-ruled, on sight, during a smoke: "That is not supposed to be
   there at all, it's been retired, or I thought it was."
   IT WAS NEVER RETIRED, IT WAS ONLY UNREACHABLE — and those are different things. The note above
   says it "effectively never shows", and that was true of a settled canvas. It is NOT true of a
   canvas mid-transition: _studioCanvasIsEmpty() asks whether the shape panel has an offsetParent and
   whether a canvas svg has height, and BOTH read false while the canvas is between modes. Walking
   Data -> Sheet -> Dashboard -> Split lands on the landing in exactly that window, and the ghost
   painted "Nothing here yet" over a Studio that had things in it.
   🔑 "EMPTY" AND "NOT LAID OUT YET" ARE THE SAME ANSWER TO getBoundingClientRect AND OPPOSITE
      ANSWERS TO THE USER. That conflation is the whole defect, and it is the fourth member of the
      ready-vs-resolved family this project has met.
   ⭐ ONE LINE TO BRING IT BACK, deliberately: the mechanism is proven and the Architect may still
      rule on where a zero-state plan should live. Flip this to true — do not rebuild it. */
var STUDIO_GHOST_PLAN_ENABLED = false;

function _studioGhostPlanHTML() {
  if (!STUDIO_GHOST_PLAN_ENABLED) return '';
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

/* ══ THE PHASE ROOMS ═══════════════════════════════════════════════════════════════════════════
   ⛔⛔ THIS REPLACED A SCROLL, AND THE SCROLL WAS THE WRONG BUILD FROM THE START.
   `Captain Datumae` R23: "Clicking the first one D — DATA will take you to a NEW PAGE." The Step-1
   spec said "additive, lands inert"; the previous session built precisely that, and the Captain got
   a nav strip that scrolled him down a page he wanted to leave. ⭐ The old scrollIntoView here was
   also the TRIGGER for the one-way scroll trap (see studio.html's .drafting-panel note) — removing
   it retires a defect and a mis-build in the same edit.

   ⭐⭐ view-s2 GENERALISED, NOT FORKED. The CSS does the work off two attributes:
        #studio-layout[data-room="<phase>"]  x  .studio-section[data-phase="<phase>"]
   This file only sets the room and paints the header; membership lives in the markup so there is no
   second opinion to drift. Architecture ALSO keeps .view-s2 so its bespoke behaviour (read-only
   Portfolio boxes, the §20 estate gate) is reused rather than reimplemented. */

/* 🖊️ AUTHORED — Part 4 intro lines, one per phase, wired VERBATIM. ⛔ No Wirer prose lives here. */
function _studioRoomIntro(id) {
  return {
    data: 'Before anything can be measured, it has to be described. This is you, and the ground you’re building on.',
    architecture: 'Now the structure itself. Every account, every asset — the mass your retirement is built from.',
    tension: 'Every dollar that goes to today can’t go to tomorrow. This is where that pressure gets counted — honestly, without judgement.',
    uncertainty: 'Two of the biggest numbers in your retirement depend on a decision, not a market: when you claim, and when you start.',
    measurement: 'Everything is in. Now we run it — thousands of times — and see which futures your structure survives.',
    alignment: 'You have the range. Now the order — which account to draw from, and when, so the structure lasts.',
    endurance: 'At last, the real question: what can you actually spend? Not a guess — a number your own structure supports.'
  }[id] || '';
}

function _studioRoomHeaderHTML(phase) {
  /* 🖊️ '← The Studio' — CAPTAIN-RULED 2026-08-22. THIS LABEL HAS BEEN RULED TWICE, IN OPPOSITE
     DIRECTIONS, AND BOTH RULINGS ARE KEPT BECAUSE THE SECOND ONE ONLY MAKES SENSE AGAINST THE FIRST.
     ⚠️ ~~'← Dashboard' — CAPTAIN-RULED 2026-08-14, overruling the Architect's '← The Studio'. His
        reason: a return control named after the place you are already IN tells the user they have
        left it. A phase is inside the Studio; the old label denied that.~~ SUPERSEDED, NOT WRONG.
     ⭐ WHAT CHANGED IS THE PRODUCT, NOT THE ARGUMENT. §82.22 settled that THE LANDING *IS* THE
        STUDIO and the seven are PHASES YOU TRAVEL TO. Once that is true you genuinely HAVE left,
        so the objection the 08-14 ruling raised no longer applies — the label is now honest rather
        than merely shorter.
     ⛔ AND 'Dashboard' WAS NEVER NEUTRAL: our own brand doc names THE GENERIC-DASHBOARD PROBLEM as
        one of four failure modes Datumae exists to reject. We were naming the home of a methodology
        after the thing the methodology rejects.
     ⭐ IT COSTS NO NEW VOCABULARY — it is the same word as the landing title, so the user learns
        ONE name for one place, not two.
     ⚠️ VOCABULARY, RULED WITH IT: THE SEVEN ARE PHASES, NEVER 'ROOMS'. A room is what a user drafts
        inside ARCHITECTURE. `data-room` stays as an INTERNAL attribute — renaming it is its own arc
        and not worth a pin bump — but no user-facing string says room for a phase, and no new code
        adds one. One word with two meanings is how the two-sketches confusion started.
     ⭐ AND IT SITS FIRST, ABOVE THE PHASE COPY — Captain-ruled the same day. The way out belongs at
     the top left where a back control is looked for, not below the title it returns from. That also
     makes it the first thing keyboard focus reaches inside a room, which is what an exit should be. */
  return '<button type="button" class="sl-room-back" onclick="_studioExitRoom()">← The Studio</button>'
       + '<div class="sl-room-label">PHASE ' + phase.numeral + ' — ' + phase.name + '</div>'
       + '<div class="sl-room-desc">' + phase.desc + '</div>'
       /* ⛔ THE <h1>The Studio</h1> IS GONE (Captain-ruled 2026-08-15). It was a THIRD title
          competing with the phase label and the descriptor above it, and it read the same on all
          seven rooms — it carried no information at the point it appeared.
          ⚠️ MEASURED BEFORE REMOVING, because the Architect flagged the risk that it might BE the
          way out: it is not. The exit is the .sl-room-back button emitted FIRST above, named
          "← Dashboard" since 2026-08-14. The <h1> was a bare heading with no handler. No room
          loses its way back. */
       + '<div class="sl-room-intro">' + _studioRoomIntro(phase.id) + '</div>';
}

/* 🖊️ AUTHORED (§14.3) — "Next: {PHASE NAME} →", and on the final phase "Back to The Studio →".
   ⛔ NEVER A DISABLED CONTROL AT THE END: a greyed Next reads as a missing feature, not a finished
   walk. The last phase returns to the landing instead of dead-ending. */
function _studioRoomNextHTML(phase) {
  var spine = _studioPhaseSpine();
  var i = spine.map(function (p) { return p.id; }).indexOf(phase.id);
  if (i < 0) return '';
  if (i === spine.length - 1) {
    return '<button type="button" class="sl-room-next" onclick="_studioExitRoom()">Back to The Studio →</button>';
  }
  var nxt = spine[i + 1];
  /* ⛔⛔ ARCHITECTURE'S FORWARD CONTROL ROUTES THROUGH resolveEstate() — CAPTAIN-FOUND 2026-08-14:
     "two tension buttons, different designs interestingly: See the Tension → / Next: TENSION →".
     #see-tension-cta was the first pass's forward control and it is NOT merely navigation — it marks
     the estate complete (_estateResolved), releases the held verdict and morphs the Shape. Hiding it
     as a duplicate would have dropped that behaviour SILENTLY, which is the regression shape this
     arc keeps refusing (cf. the Reveal-Your-Range button, kept and re-homed rather than hidden).
     ⭐ SO THE TWO CONTROLS BECOME ONE: the room's Next button performs the resolve and lands in
     III·TENSION, because resolveEstate now ends by entering that room. ONE FORWARD CONTROL PER ROOM.
     🔑 WHEN TWO CONTROLS SHARE A DESTINATION, DELETE THE DUPLICATE — BUT FIRST ASK WHICH OF THEM WAS
        ALSO DOING SOMETHING ELSE. ⚠️ Side effect worth knowing: resolveEstate morphs the canvas to
        the resolved Shape, so finishing Architecture reveals it. Flagged to the Captain. */
  var go = (phase.id === 'architecture')
    ? 'if(window.resolveEstate){resolveEstate();}else{_studioEnterRoom(\'' + nxt.id + '\');}'
    : '_studioEnterRoom(\'' + nxt.id + '\')';
  return '<button type="button" class="sl-room-next" onclick="' + go + '">'
       + 'Next: ' + nxt.name + ' →</button>';
}

function _studioEnterRoom(id) {
  var phase = _studioPhaseSpine().filter(function (p) { return p.id === id; })[0];
  if (!phase) return;
  var l = document.getElementById('studio-layout');
  if (!l) return;
  l.setAttribute('data-room', id);
  /* Architecture reuses view-s2's behavioural extras verbatim. Every other room drops the class, so
     a user walking the spine never carries Architecture's read-only Portfolio boxes into Tension. */
  if (id === 'architecture') { if (window.enterS2View) window.enterS2View(); }
  else if (l.classList.contains('view-s2') && window.exitS2View) window.exitS2View();
  /* exitS2View clears data-room on its way out (it restores the full hub), so the room is re-set
     AFTER it runs rather than before. Order is load-bearing. */
  l.setAttribute('data-room', id);

  var head = document.getElementById('sl-room-header');
  if (head) head.innerHTML = _studioRoomHeaderHTML(phase);
  var next = document.getElementById('sl-room-next-host');
  if (next) next.innerHTML = _studioRoomNextHTML(phase);

  /* VI · ALIGNMENT owns no section — the only phase that is entirely net-new. Its authored waiting
     line (§12.4) goes in the header rather than leaving a blank panel, which would read as broken. */
  var empty = document.getElementById('sl-room-empty');
  if (empty) empty.parentNode.removeChild(empty);
  if (!document.querySelector('.drafting-panel > .studio-section[data-phase="' + id + '"]') && head) {
    head.insertAdjacentHTML('beforeend',
      '<div id="sl-room-empty" class="sl-room-empty">' + _studioAlignmentBody() + '</div>');
  }
  /* §28.2 — the canvas follows the room's OWN controls (see the `canvas` note on the spine).
     ⛔ SET AFTER enterS2View/exitS2View, NEVER BEFORE. Those functions touch the mode themselves,
     so a side chosen first is a side immediately overwritten — the same ordering trap the data-room
     re-set above already documents. Order is load-bearing twice in this function. */
  _setCanvasSide(phase.canvas || 'estate');

  /* ⛔ The panel is its own scroll container and keeps its offset across a room change, so entering
     a room could land you mid-panel with the header off screen. scrollTop, never scrollIntoView —
     scrollIntoView scrolls EVERY ancestor including the document, which is exactly the trap. */
  var panel = document.querySelector('.drafting-panel');
  if (panel) panel.scrollTop = 0;
}

/* Put the canvas on a NAMED side. toggleShapeMode only ever flips, so every caller that wanted a
   specific side had to read the class and decide for itself — and the copy of that logic which used
   to live in enterS2View is exactly the line that forced every room onto the Shape side.
   🔑 A TOGGLE IS NOT A SETTER. Asking for "shape" and getting "the other one" depends entirely on
      where you started, which is why this is written once, here, and reads the state before acting. */
function _setCanvasSide(want) {
  var l = document.getElementById('studio-layout');
  if (!l || typeof window === 'undefined' || !window.toggleShapeMode) return false;
  var isShape = l.classList.contains('mode-shape');
  if ((want === 'shape') === isShape) return false;   // already there — never toggle for its own sake
  window.toggleShapeMode();
  return true;
}

function _studioExitRoom() {
  var l = document.getElementById('studio-layout');
  if (!l) return;
  if (l.classList.contains('view-s2') && window.exitS2View) window.exitS2View();
  l.setAttribute('data-room', 'landing');
  var head = document.getElementById('sl-room-header');
  if (head) head.innerHTML = '';
  var next = document.getElementById('sl-room-next-host');
  if (next) next.innerHTML = '';
  var panel = document.querySelector('.drafting-panel');
  if (panel) panel.scrollTop = 0;
  _renderStudioLanding();
}

/* The landing's phase rows call this. Kept as the entry point so the markup contract does not move. */
/* ⛔⛔ THIS NAVIGATION IS SINGLE-DOCUMENT AND IS SUPERSEDED BY REAL ROUTING AT STEP 3.
 * It works by flipping ONE attribute — `#studio-layout[data-room="<phase>"]` — which the CSS
 * spotlight in studio.html reads against each section's `[data-phase]`. That is why the spine can
 * be wired today with no routing work: membership lives in the markup and this sets a flag.
 * ⚠️⚠️ AND IT ASSUMES ALL SEVEN SECTIONS SHARE ONE DOM. Step 3's plan of record is that each phase
 * becomes AN ACTUAL PAGE ("do not declare the split done while studio.html is still the host").
 * SEVEN PAGES DO NOT SHARE ONE DOM, SO setAttribute('data-room') DIES THE DAY THAT LANDS — not by
 * breaking loudly, but by setting an attribute nothing is listening to any more.
 * 🔑 A MECHANISM WITH A KNOWN EXPIRY IS FINE; AN UNDATED ONE BECOMES A SURPRISE. This is the note,
 *    and Step 3 is the date. ⇒ Whoever does that split owns replacing this with real navigation. */
function _studioPhaseGo(id) { _studioEnterRoom(id); }

/* Repaint. Cheap and idempotent — the landing is derived entirely from live state, so it is safe to
   call on every input/change without tracking what actually moved. */
function _renderStudioLanding() {
  var host = document.getElementById('sl-movements-host');
  if (host) host.innerHTML = _studioLandingHTML();
  var ghost = document.getElementById('sl-ghost-plan');
  if (ghost) ghost.innerHTML = _studioGhostPlanHTML();
}

/* ⛔ THE STUDIO OPENS ON THE LANDING, AND THE LANDING IS ONLY THE DATUMAE.
   Setting data-room="landing" is what hides the vertical stack of sections — without it the CSS
   spotlight never engages and the page renders exactly as it did before. It is set here, in the
   part that owns the landing, rather than as a hard-coded attribute in the markup, so that a page
   which does NOT load this part degrades to the shipped single-page Studio rather than to a blank
   panel. 🔑 SPLIT-DEPLOY LAW — DEGRADE TO SHIPPED BEHAVIOUR, NEVER DRAW WRONG. */
function _studioLandingBoot() {
  var l = document.getElementById('studio-layout');
  if (l && !l.getAttribute('data-room')) l.setAttribute('data-room', 'landing');
  _renderStudioLanding();
}

/* ⛔⛔ THE COLD-LOAD FLICKER — the Studio used to open on the OLD vertical stack for a beat, then
 * have the Datumae drop over it. Captain-reported, and it had been true since the landing shipped.
 *
 * THE MECHANISM, and it is entirely in the two lines below. studio.html:300 reads
 *     .studio-layout[data-room] .drafting-panel > .studio-section { display: none; }
 * so the attribute's PRESENCE hides the stack and its ABSENCE shows everything. The attribute was
 * set at DOMContentLoaded + 300ms — so from first paint until then, the browser painted the whole
 * pre-landing Studio, Architect Profile first. What looked like the landing arriving late was the
 * OLD PAGE being shown on purpose by a CSS rule that only knows two states and defaults to the
 * wrong one during boot.
 *   🔑 AN ATTRIBUTE THAT GATES A LAYOUT HAS A THIRD STATE — "not set yet" — AND THE STYLESHEET HAD
 *      NO RULE FOR IT. A default that is correct at rest can still be wrong for the first 300ms,
 *      and first paint is exactly when a user forms their impression of the page.
 *
 * TWO CHANGES, AND THE FIRST ONE IS WHY THIS LIVES HERE RATHER THAN IN studio.html's stylesheet:
 *  (1) The part injects its own rule for the not-yet-set state, AT PARSE TIME. This file is loaded
 *      at studio.html:1896 and #studio-layout does not exist until :1955, so the attribute itself
 *      cannot be set synchronously — but a STYLE can be, and CSS applies to elements that do not
 *      exist yet. Putting the rule in studio.html instead would hide the stack even when THIS FILE
 *      FAILS TO LOAD, leaving a blank panel — the split-deploy law's exact failure mode. Shipped
 *      from the part, a missing part means a missing rule and the page degrades to the shipped
 *      single-page Studio, which is what that law asks for. DEGRADE TO SHIPPED BEHAVIOUR, NEVER
 *      DRAW WRONG.
 *  (2) The boot no longer waits 300ms to set the attribute. The 300ms is KEPT as a REPAINT, because
 *      the landing derives from live state that studio.html's init populates and repainting is
 *      explicitly cheap and idempotent. Setting the attribute early and repainting late are two
 *      different jobs; only the first one was ever time-critical. */
/* ⛔⛔ THE RULE IS STRUCTURAL, NOT A LIST OF SELECTORS, AND THAT IS THE SECOND LESSON HERE.
 * The first version of this hid `.drafting-panel > .studio-section` — one instance of the pattern
 * instead of the pattern. The Captain still saw a flash, and it was REVEAL YOUR RANGE. Enumerating
 * the stylesheet found FOUR more rules that hide only once data-room EXISTS: .reveal-container,
 * .see-tension-cta, and the group .swf-col-head / .s2-entry-row / .scenario-bank / .privacy-note.
 * Mirroring those by name would be a hand-maintained list that silently stops covering the next
 * rule somebody writes — the exact defect this project keeps paying for.
 *   🔑 A PRE-PAINT RULE MUST MIRROR THE *PATTERN*, NOT THE MEMBERS. Hiding the CONTAINER covers
 *      every [data-room]-gated child that exists today and every one added later, for free.
 * visibility, not display: the panel keeps its box so nothing reflows when it appears, and the
 * landing paints into it in the same tick that sets data-room. */
/* ⛔⛔ THE COST OF THE RULE ABOVE — WRITTEN DOWN 2026-08-23 BECAUSE IT NEVER WAS.
 * Hiding the panel until DCL means the panel is BLANK for exactly (t_DCL - t_firstPaint).
 *   🔑 SO ANY CHANGE THAT MOVES FIRST PAINT EARLIER WITHOUT MOVING DCL EARLIER CONVERTS THE SAVING
 *      1:1 INTO BLANK-STAGE TIME. Not hypothetical, MEASURED (throttled 40ms/10Mbit/4x CPU, N=3,
 *      medians): `defer` on the account-modal script (42187ee) moved first paint 1288ms -> 788ms
 *      and moved content arrival NOT AT ALL (2600ms both arms), so the blank window GREW
 *      1310ms -> 1843ms. FCP improved 500ms and the product got 533ms worse.
 *   ⚠️ EVERY NUMBER ABOVE IS THROTTLED-SYNTHETIC, FROM A LOCAL SERVER. THE PRODUCTION EQUIVALENT
 *      HAS NEVER BEEN MEASURED — AND IT IS RUNNABLE TODAY: point the filmstrip harness at
 *      datumfi.com, signed in, and repeat the gesture. That is a NAMED, UNRUN MEASUREMENT, not a
 *      disclaimer. 🔑 THE CONDITIONS ARE STATED SO THE FIGURE CAN BE RE-RUN AND DISAGREED WITH; a
 *      softened "roughly half a second" would be HARDER to falsify, not humbler.
 *   ⛔ AN UNDOCUMENTED INVARIANT IS A TRAP FOR THE NEXT OPTIMISATION. The rule is CORRECT — "show
 *      nothing" beats "show the wrong thing" — but a constraint living only in one line of CSS is
 *      one nobody finds before they break it. The next person to shave milliseconds off this page
 *      pays this cost silently unless they read this paragraph first.
 *
 * ⭐ THE SECOND DECLARATION IS THE REPAIR, AND IT IS THE SMALLEST ONE THAT WORKS.
 * `.s1-header` is the ONLY part of this panel that READS NO STATE — a static <h1>The Studio</h1>
 * and the authored thesis line. It therefore CANNOT BE WRONG at any point during boot, and that is
 * precisely what makes it the only thing safe to reveal early. The preboot rule's purpose survives
 * intact: we are not showing the wrong thing, we are showing the one thing that cannot be.
 *   ⚠️ visibility (never display) ON BOTH SIDES, ON PURPOSE: a hidden parent keeps its box and a
 *      child may override back to visible, so the header paints with ZERO reflow when the rest lands.
 *   ⛔ #sl-movements-host LIVES INSIDE .s1-header AND IS EMPTY until _studioLandingBoot paints it in
 *      the same tick that sets data-room — so revealing the header cannot expose a half-built phase
 *      list. §12.3: a phase that reads "answered" because a default was pre-filled is a lie, and one
 *      painted for 500ms is still a lie. NOTHING STATEFUL MAY EVER JOIN THIS SECOND RULE.
 * Guarded by scripts/_gate_studio_preboot_paint.js — L1 the panel IS hidden, L3 the header IS NOT. */
if (typeof document !== 'undefined' && document.head && document.head.insertAdjacentHTML) {
  document.head.insertAdjacentHTML('beforeend',
    '<style id="sl-preboot">.studio-layout:not([data-room]) .drafting-panel{visibility:hidden}'
    + '.studio-layout:not([data-room]) .drafting-panel .s1-header{visibility:visible}</style>');
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', _renderStudioLanding);
  document.addEventListener('change', _renderStudioLanding);
  document.addEventListener('DOMContentLoaded', function () {
    _studioLandingBoot();                            // attribute + first paint, immediately
    setTimeout(_renderStudioLanding, 300);           // repaint once init has populated live state
  });
}
