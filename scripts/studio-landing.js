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
    { id: 'data',         numeral: 'I',   letter: 'D', name: 'DATA',         desc: 'Set the Ground.',         sec: 'sec-profile' },
    { id: 'architecture', numeral: 'II',  letter: 'A', name: 'ARCHITECTURE', desc: 'Define the Mass.',        sec: 'sec-drafting' },
    { id: 'tension',      numeral: 'III', letter: 'T', name: 'TENSION',      desc: 'Apply the Pressure.',     sec: 'sec-upkeep' },
    { id: 'uncertainty',  numeral: 'IV',  letter: 'U', name: 'UNCERTAINTY',  desc: 'Structure the Noise.',    sec: 'sec-income-layer' },
    { id: 'measurement',  numeral: 'V',   letter: 'M', name: 'MEASUREMENT',  desc: 'Reveal the Range.',       sec: 'sec-climate' },
    { id: 'alignment',    numeral: 'VI',  letter: 'A', name: 'ALIGNMENT',    desc: 'Order the Estate.',       sec: null },
    { id: 'endurance',    numeral: 'VII', letter: 'E', name: 'ENDURANCE',    desc: 'Carry the Horizon.',      sec: 'sec-datum' }
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
    { numeral: 'I',   glyph: '',  expr: '(D + A)', label: 'BUILD IT', phases: ['data', 'architecture'] },
    { numeral: 'II',  glyph: '×', expr: '(T + U)', label: 'TEST IT',  phases: ['tension', 'uncertainty'] },
    { numeral: 'III', glyph: '=', expr: 'M',       label: 'KNOW IT',  phases: ['measurement'] },
    { numeral: 'IV',  glyph: '→', expr: '(A + E)', label: 'LIVE IT',  phases: ['alignment', 'endurance'] }
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
  return '<button type="button" class="sl-phase' + (done ? ' is-done' : '') + '"'
       + ' data-phase="' + phase.id + '" onclick="_studioPhaseGo(\'' + phase.id + '\')"'
       + ' aria-label="' + _phaseAriaLabel(phase, done) + '">'
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
    /* ⭐ NO OPERATOR GLYPH — Captain-ruled 2026-08-14 along with the bracket rules. The formula is
       printed in full one line above, so the × + = → restated it a second time in a weaker form.
       mv.glyph is left in _studioMovements() rather than deleted: it is the movement's own identity
       in the data, and the day a Datum Dashboard renders the formula graphically it is what that
       will read. NOTHING IS BEING HIDDEN — the labels carry the grouping in words. */
    out += '<div class="sl-movement">'
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
  /* 🖊️ '← Dashboard' — CAPTAIN-RULED 2026-08-14, overruling the Architect's '← The Studio'. His
     reason: a return control named after the place you are already IN tells the user they have left
     it. A phase room is inside the Studio; the old label denied that.
     ⭐ AND IT SITS FIRST, ABOVE THE PHASE COPY — Captain-ruled the same day. The way out belongs at
     the top left where a back control is looked for, not below the title it returns from. That also
     makes it the first thing keyboard focus reaches inside a room, which is what an exit should be. */
  return '<button type="button" class="sl-room-back" onclick="_studioExitRoom()">← Dashboard</button>'
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
  /* ⛔ The panel is its own scroll container and keeps its offset across a room change, so entering
     a room could land you mid-panel with the header off screen. scrollTop, never scrollIntoView —
     scrollIntoView scrolls EVERY ancestor including the document, which is exactly the trap. */
  var panel = document.querySelector('.drafting-panel');
  if (panel) panel.scrollTop = 0;
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
if (typeof document !== 'undefined' && document.head && document.head.insertAdjacentHTML) {
  document.head.insertAdjacentHTML('beforeend',
    '<style id="sl-preboot">.studio-layout:not([data-room]) .drafting-panel{visibility:hidden}</style>');
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', _renderStudioLanding);
  document.addEventListener('change', _renderStudioLanding);
  document.addEventListener('DOMContentLoaded', function () {
    _studioLandingBoot();                            // attribute + first paint, immediately
    setTimeout(_renderStudioLanding, 300);           // repaint once init has populated live state
  });
}
