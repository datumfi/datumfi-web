/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   THE CANONICAL DISCLOSURE FOOTER — ONE SOURCE, EVERY PAGE.

   ⛔⛔ WHY THIS EXISTS, MEASURED 2026-08-14 BEFORE A BYTE WAS EDITED. Fourteen tracked pages each
   carried their own copy of the legal footer, and they had diverged on every axis:
     · SIX version strings live at once — index/IndexV3 said v2.3.5, sketch said v3.2.4 (HIGHER than
       the front door), studio said v1.0.0, four pages said nothing at all.
     · FOUR different disclaimer TEXTS.
     · `Do Not Sell My Information` — the CCPA/CPRA link — ABSENT FROM 8 OF 14, INCLUDING THE HOMEPAGE.
   🔑 THE VERSION NUMBER WAS NEVER THE DEFECT; IT WAS THE ONLY PART OF THE DIVERGENCE THAT HAPPENED
      TO BE LEGIBLE. Nobody diffs a paragraph of legal boilerplate across fourteen files.

   ⭐⭐ AND THE ARGUMENT FOR A MODULE RATHER THAN FOURTEEN EDITS, WHICH IS THE WHOLE POINT:
   THESE COPIES DID NOT DIVERGE BY MALICE — SOMEBODY MADE THEM IDENTICAL ONCE, AND THEY DRIFTED.
   Hand-editing fourteen files to match recreates the exact conditions that produced that census, and
   buys a guarantee that expires the day someone edits one of them. A SECOND COPY WITH THE SAME WORDS
   IS STILL A SECOND COPY.

   ⭐ THE PATTERN IS PROVEN IN THIS REPO, NOT INVENTED HERE: nav.js already injects the shared nav AND
   the consent banner on every page. This is the same shape, for the one block of markup on this site
   that is legally load-bearing.

   ── ⛔ HOW IT DEGRADES ──────────────────────────────────────────────────────────────────────────
   Pages keep an EMPTY <div id="disclosure-footer"></div> and this fills it. If this file fails to
   load the footer renders EMPTY — missing, never WRONG, and never a stale contradictory copy.
   ⚠️ The old four-hour stale-JS window is closed and verified (cache-control: max-age=0,
   must-revalidate — _gate_asset_freshness asserts the served header), so a new page cannot meet an
   old footer. SPLIT-DEPLOY LAW: DEGRADE TO NOTHING, NEVER DRAW WRONG.

   ── 🖊️ THE TEXT ────────────────────────────────────────────────────────────────────────────────
   ADOPTED VERBATIM from methodology.html, Captain-ruled canonical 2026-08-14 (latest build, most
   comprehensive link set, and the only candidate carrying BOTH rights links). ⛔ NOT ONE SENTENCE
   REWORDED. His frame governs the scope: "just getting them all canonical is fine for now" —
   CANONISE, DO NOT REWRITE. Exactly two Captain-ruled edits are applied:
     1. the bare `privacy@datumfi.com` and `feedback@datumfi.com` links are removed — DE-DUPLICATION,
        not removal of an access point: both are carried inside Privacy.
        ⛔ THE `mailto:` UNDER "Accessibility" STAYS. It is a LABELLED CONTROL, not a listed address,
        and on index.html a bare privacy@ mailto WAS the Delete-My-Data mechanism — THE SAME ADDRESS
        IS A DUPLICATE IN ONE FOOTER AND A RIGHTS MECHANISM IN ANOTHER. "Remove the emails" executed
        literally would have deleted a right.
     2. DATUM FI -> DATUMAE in the footer string. ⚠️ SCOPED TO THIS STRING ONLY — Part 7's "no mass
        rename" still stands; titles, headings, meta and body copy are untouched. A mass rename
        arriving by accident wearing a footer's clothes is exactly what that rule forbids.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ⚠️ ONE SOURCE, AND IT IS THIS CONSTANT. A gate asserts the rendered footer matches it byte for
   byte, which is only a meaningful claim because there is exactly one place to change it. */
/* ⛔ THE CONTROLS ARE NEVER DIMMER THAN THE PROSE. At the shipped values the links were 0.3 against
   a 0.25 paragraph — near-identical, and once the paragraph moved to its measured 0.45 floor the
   links would have become THE LEAST READABLE THING IN THE FOOTER. That inverts the entire ruling:
   these six are the CONTROLS, including the CCPA/CPRA opt-out and the deletion right, and a
   mechanism rendered fainter than the sentence explaining it is not conspicuous in any sense a
   regulator or a person would accept.
   ⭐ 0.55 is ABOVE the paragraph on purpose, so brightness itself distinguishes control from prose.
   ⚠️ FLAGGED, NOT FIXED — these carry text-decoration:none and no colour of their own, so they have
   NO remaining affordance marking them as links beyond being slightly brighter. That predates this
   commit. An underline (or a distinct hue) is the honest fix and it is a design ruling, not mine. */
/* ⬆️ RESOLVED 2026-08-16 — AND THE ASYMMETRY WAS THE ARGUMENT. In the SAME SENTENCE, the two
   JS-driven controls ("Important disclosures" button, "Delete My Data" span) BOTH carry
   text-decoration:underline, while the three real <a> links carried NONE — including
   "Do Not Sell My Information", the CCPA/CPRA link.
   ⛔ THE THINGS THAT LOOKED LIKE LINKS WERE NOT LINKS, AND THE ACTUAL LINKS DID NOT LOOK LIKE ONES.
   So this is a CONSISTENCY fix, not a new design: the anchors match the controls beside them.
   ⭐ AND IT IS WHAT MAKES THE CONTRAST FIX SAFE. The paragraph rises 0.45 -> 0.55 to clear AA, which
      would otherwise have DESTROYED the links' only remaining affordance — the file itself said it
      was "slightly brighter" and nothing else. An UNDERLINE is a non-colour affordance, so the two
      can now hold the same tone without the links disappearing into the prose.
   🔑 A CONTRAST FIX THAT ERASES A LINK IS NOT AN ACCESSIBILITY WIN. */
var DATUM_FOOTER_LINK_STYLE = 'color:var(--text-muted,rgba(255,255,255,0.55));text-decoration:underline;';

/* ⛔⛔ THE MODULE CARRIES ITS OWN PRESENTATION, AND THAT IS A DEFECT PAID FOR IN PUBLIC.
   The first cut rendered a BARE <p> and relied on each page having a `#disclosure-footer p` CSS
   rule. ONLY TWO OF THE FIFTEEN DID (methodology.html, method.html). Everywhere else — including
   studio.html and the HOMEPAGE — the paragraph inherited the page default and shipped as LARGE,
   BRIGHT WHITE TEXT: on the Studio it was among the biggest type on the screen. The Captain caught
   it within minutes of the push.
   ⚠️ AND MY OWN GATE COULD NOT SEE IT. _gate_canonical_footer asserts the MARKUP is identical on all
   fifteen pages — and it WAS. Identical markup rendered wildly differently, because the styling
   lived somewhere the module did not own.
   🔑 A SHARED MODULE THAT DEPENDS ON ITS HOST FOR PRESENTATION IS NOT SHARED — IT IS FIFTEEN
      DIFFERENT RESULTS FROM ONE STRING. "Same bytes" is not "same rendering", and a gate that only
      compares bytes will say yes to both.
   ⭐ Values are the pre-existing canonical ones, restored verbatim: 10px mono at 25% white. The
      var() carries a literal fallback because --font-mono is not defined on every page. */
/* ⛔ SINGLE QUOTES INSIDE THE FONT STACK. The first version used "DM Mono" — and this string is
   interpolated into style="…", so the inner DOUBLE QUOTE TERMINATED THE ATTRIBUTE and every
   declaration after font-family was discarded. The paragraph kept rendering at the inherited 16px
   and the fix looked like it had done nothing.
   🔑 A STRING THAT LANDS INSIDE AN HTML ATTRIBUTE MUST NOT CONTAIN THAT ATTRIBUTE'S DELIMITER —
      the same quote hazard that killed this page twice before, wearing a font stack this time. */
/* ⛔ THE COLUMN IS NOT THE SAME WIDTH ON EVERY HOST, AND THAT WAS MEASURED (2026-08-15).
   Fourteen of the fifteen pages render this footer full-bleed: box 1680, text column 1600, TWO
   lines. studio.html renders it inside the DRAFTING PANEL's scroll container (it was moved there to
   fix the exit-reachable trap), so its box is 399px — and it stays 399px at every viewport, because
   the panel is a fixed column, not a fraction of the window.
   🔑 THAT IS WHY THE PADDING IS A PERCENTAGE AND NOT A MEDIA QUERY. @media keys on the VIEWPORT,
      and this footer is narrow at a WIDE viewport — the one case a breakpoint cannot see. A % pad
      resolves against the BOX, so it is narrow-aware by construction. clamp keeps the wide pages at
      their original 40px and gives the Studio ~16px instead.
   ⚠️ HONEST ABOUT WHAT THIS BUYS: 319px -> 367px of measure, which is ELEVEN LINES TO TEN. The
      399px panel is the real constraint and no padding trim gets past it. Widening the panel (§23)
      or giving the footer full width below the canvas is the only change that would matter, and
      neither is this edit. */
/* justify + text-align-last:center — the block fills its measure while the closing line (which
   carries the rights links) stays centred. Centred alignment leaves BOTH edges ragged on EVERY
   line, which on a ten-line block reads as wasted space around the text; that appearance, not the
   line count, was the complaint. Measured cost to the wide pages: worst unused width 22px -> 4px,
   i.e. effectively nothing, which is the check that mattered — ONE STRING SERVES FIFTEEN PAGES AND
   A FIX FOR THE NARROWEST MUST NOT DAMAGE THE OTHER FOURTEEN.
   ⛔ NOT ONE WORD OF THE LEGAL TEXT MOVED. This is presentation only; the copy is untouched. */
/* ⛔⛔ 0.45 IS A MEASURED FLOOR, NOT A TASTE. DO NOT LOWER IT.
   At the shipped 0.25 the disclosure rendered rgb(71,77,89) on rgb(9,18,33) = 2.21:1 at 10px —
   failing WCAG AA for normal text (4.5:1) and failing even the 3:1 large-text floor. 0.45 gives
   4.51:1. "CLEAR AND CONSPICUOUS" IS NOT SATISFIED BY TEXT THAT IS TECHNICALLY PRESENT AND
   PRACTICALLY UNREADABLE: at 2.21:1 this paragraph was visible to the DOM and invisible to a person,
   and it carries the rights links.
   ~~⚠️⚠️ THE MARGIN IS 0.01 AND THAT IS DELIBERATE, NOT LUCKY. 4.51 against a 4.50 requirement will
   NOT survive a casual theme edit... Anyone touching this value or the footer background must
   RE-MEASURE the ratio, not eyeball it.~~
   ⭐⭐ SUPERSEDED 2026-08-16 — STRUCK, NOT DELETED, BECAUSE THE WARNING WAS RIGHT AND THE OUTCOME
   PROVED IT. That 0.01 was spent almost immediately: the contrast census, sampling the RENDERED
   ground at a different scroll position, measured THIS SAME PARAGRAPH at 4.48:1 while F7 measured
   4.51:1. Both instruments were correct — the headroom was simply zero, so which side of the floor
   it landed on depended on where you stood.
   🔑 A VALUE SPECIFIED *AT* ITS FLOOR IS NOT COMPLIANT; IT IS ONE ROUNDING AWAY FROM NON-COMPLIANT,
      AND WHICH SIDE IT LANDS ON IS DECIDED BY THE MEASURER RATHER THAN BY THE DESIGN.
   ✅ SO THE VALUE IS NO LONGER A LITERAL AND NO LONGER AT THE FLOOR: it reads --text-muted (chalk at
      55%), which measures ~6.2:1 on this footer's ground. SPECIFY MARGIN, NOT COMPLIANCE.
   ⚠️ AND IT IS NOW A TOKEN READ, SO IT FOLLOWS THE PALETTE — this paragraph was one of the surfaces
      that hard-coded its colour and therefore did NOT move when the muted role was raised. The
      literal that remains is the var() FALLBACK only. Background computed against rgb(9,18,33). */
var DATUM_FOOTER_P_STYLE = "font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;"
  + 'color:var(--text-muted,rgba(255,255,255,0.55));line-height:1.6;margin:0;'
  + 'text-align:justify;text-align-last:center;';
var DATUM_FOOTER_BOX_STYLE = 'width:100%;background:rgba(9,18,33,0.97);'
  + 'border-top:1px solid rgba(255,255,255,0.05);'
  + 'padding:10px clamp(14px, 4%, 40px) 12px;text-align:center;';

/* ⚖️ THE DISCLOSURE SPLIT — Architect-ruled 2026-08-15, and the LAW it banks is the reason this
   file is shaped the way it is: YOU MAY COLLAPSE A STATEMENT. YOU MAY NOT COLLAPSE A CONTROL.
   Hiding a mechanism behind a disclosure makes the right harder to exercise, which is the precise
   harm "clear and conspicuous" exists to prevent.
     ALWAYS VISIBLE · Privacy Policy · Terms of Service · Do Not Sell My Information ·
                      Delete My Data · Accessibility — every one of them a CONTROL, not a statement
                      — AND THREE SENTENCES: who we are not, what this is not, what to do instead.
     COLLAPSIBLE     · the hypothetical-projections sentence and the past-performance sentence.
                      Both are statements about METHOD LIMITS, which is what a disclosure section is
                      for, and neither is something a user needs before they understand what they
                      are looking at.
   ⭐ WHY THE ADVISER SENTENCE STAYS OUT OF THE COLLAPSE, in the Architect's words: a user who never
      opens the toggle must still know they are not being advised. That is the brand position —
      measurement, not advice — not merely a legal line.
   ⛔⛔ AND WHY THE EDUCATIONAL-TOOL SENTENCE STAYS OUT TOO — the Architect OVERRULED THEMSELVES here,
      and the reason is the sharpest thing in this file: A STATEMENT ABOUT WHO WE ARE IS NOT A
      STATEMENT ABOUT WHAT THIS IS. "Not a registered investment advisor" is a fact about the
      COMPANY; "does not constitute financial, investment, or tax advice" is a fact about the OUTPUT
      ON SCREEN — and the output is what the user is about to act on. The first draft collapsed the
      only sentence that says so in those words, which failed the very test that had been written
      one paragraph earlier.
   ⭐ AND THE "consult a qualified financial professional" SENTENCE IS VISIBLE BY THE SAME LOGIC: a
      disclaimer that only says what we are NOT leaves the user nowhere to go. NAMING THE LIMIT
      WITHOUT NAMING THE ALTERNATIVE IS HALF AN HONEST SENTENCE.
   ⚠️ NEITHER AUTHOR IS A LAWYER. This is a CONSERVATIVE arrangement judgement: every mechanism
      stays visible, the adviser disclaimer stays visible, only explanatory prose moves. */

/* ⛔ ONE LINE TO UNDO. If counsel wants the whole paragraph visible we flip this to true and the
   footer ships expanded — we do NOT rebuild. A reversible decision without counsel is acceptable;
   an irreversible one is not. */
var DATUM_FOOTER_START_OPEN = false;

/* 🖊️ AUTHORED VERBATIM, Architect 2026-08-15. NOT MINE TO REWORD.
   "More info" was REJECTED because it describes nothing — the same law that killed "Dashboard":
   name a thing after what it is, not after what is convenient. These say what is inside and use the
   word a regulator would use. */
var DATUM_FOOTER_TOGGLE_CLOSED = 'Important disclosures';
var DATUM_FOOTER_TOGGLE_OPEN = 'Hide disclosures';

var DATUM_FOOTER_TOGGLE_STYLE = "font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;"
  + 'color:var(--text-muted,rgba(255,255,255,0.55));background:none;border:none;padding:2px 4px;margin:2px 0 0;'
  + 'text-decoration:underline;cursor:pointer;letter-spacing:0.04em;';

/* ⛔ THE CANONICAL SENTENCES, SPLIT BUT NEVER REWORDED — AND NEVER REORDERED.
   _DF_KEPT + _DF_MORE reproduces the shipped paragraph CHARACTER FOR CHARACTER, so EXPANDED the
   footer reads exactly as it always has. The collapsible half is hidden IN PLACE rather than moved,
   which is what keeps this ARRANGEMENT rather than AUTHORING — and it is also why the gate can
   still assert the canonical text: a hidden span stays in textContent, so "this page carries the
   canonical disclosure" is provable whether or not anyone opened the toggle.
   ⚠️ A TOGGLE MUST NOT MAKE THE CANONICAL TEXT UNPROVABLE. Met by CONSTRUCTION here, not by a gate
      remembering to allow for it.
   ⭐ THE FINAL SPLIT IS CONTIGUOUS. The first cut interleaved — visible, hidden, visible — because
      the educational-tool sentence was going to be collapsed out of the middle. Promoting it made
      the two halves fall into their original order with nothing interleaved, so ONE span does the
      whole job. THE CORRECT COPY RULING MADE THE CODE SIMPLER, WHICH IS USUALLY THE TELL. */
var _DF_KEPT = 'DATUMAE is an educational tool and does not constitute financial, investment, or tax '
  + 'advice. Not a registered investment advisor. Consult a qualified financial professional before '
  + 'making financial decisions. ';
var _DF_MORE = 'All projections are hypothetical, based on mathematical models, and '
  + 'do not guarantee future results. Past performance does not guarantee future outcomes. ';

function _datumFooterHTML() {
  var L = DATUM_FOOTER_LINK_STYLE;
  var hid = DATUM_FOOTER_START_OPEN ? '' : ' hidden';
  return '<p id="datum-footer-text" style="' + DATUM_FOOTER_P_STYLE + '">' + _DF_KEPT
    + '<span id="datum-disclosure-more"' + hid + '>' + _DF_MORE + '</span>'
    + '&nbsp;|&nbsp; <a href="/privacy.html" style="' + L + '">Privacy Policy</a>'
    + ' &nbsp;|&nbsp; <a href="/terms.html" style="' + L + '">Terms of Service</a>'
    + ' &nbsp;|&nbsp; <a href="mailto:accessibility@datumfi.com" style="' + L + '">Accessibility</a>'
    /* ⛔ THE RIGHTS CONTROL, AND IT IS GUARDED BECAUSE ONE PAGE CANNOT REACH THE MODAL.
       openDeleteDataModal lives in nav.js, and 13 of the 14 footer pages load nav.js — method.html
       does not. Shipping the bare call there would put a DEAD control on a legal surface, which is
       the doorless-modal defect this project has now met three times (and terms.html has it today:
       nav.js injects the modal and nothing on the page can open it).
       ⚠️ THE FALLBACK DESTINATION IS A ROUTING CHOICE AND IT IS FLAGGED, NOT ASSUMED: /dsar.html is
       the existing Data Subject Request page, already linked from privacy.html. If the Captain wants
       a different destination it is a one-line change. A RIGHTS MECHANISM MUST ALWAYS HAVE A DOOR. */
    + ' &nbsp;|&nbsp; <span style="color:var(--text-muted,rgba(255,255,255,0.55));cursor:pointer;text-decoration:underline;"'
    + ' onclick="if(window.openDeleteDataModal){openDeleteDataModal();}else{location.href=\'/dsar.html\';}">Delete My Data</span>'
    + ' &nbsp;|&nbsp; <a href="/privacy-choices.html" style="' + L + '">Do Not Sell My Information</a>'
    + ' &nbsp;|&nbsp; <a href="/philosophy.html" style="' + L + '">Philosophy</a>'
    + ' &nbsp;|&nbsp; <a href="/methodology.html" style="' + L + '">Methodology</a>'
    + ' &nbsp;|&nbsp; Build&nbsp;2026.05.16&nbsp;&bull;&nbsp;v1.0.0</p>'
    /* ⚠️ A REAL <button> WITH aria-expanded, NEVER A STYLED <div> — Architect-ruled, and the reason
       is the whole point of the exercise: A DISCLOSURE A SCREEN READER CANNOT OPEN IS NOT
       CONSPICUOUS TO EVERY USER. type="button" is explicit so it can never submit a host page's
       form. aria-controls names the region so the relationship survives without sighted layout. */
    + '<button type="button" id="datum-disclosure-toggle" aria-expanded="'
    + (DATUM_FOOTER_START_OPEN ? 'true' : 'false') + '" aria-controls="datum-disclosure-more"'
    + ' style="' + DATUM_FOOTER_TOGGLE_STYLE + '">'
    + (DATUM_FOOTER_START_OPEN ? DATUM_FOOTER_TOGGLE_OPEN : DATUM_FOOTER_TOGGLE_CLOSED)
    + '</button>';
}

/* The toggle's whole behaviour. Bound by _renderDatumFooter, which is idempotent, so re-rendering
   never stacks listeners — the markup is replaced and this runs once against the fresh node. */
function _wireDatumDisclosure() {
  var btn = document.getElementById('datum-disclosure-toggle');
  var more = document.getElementById('datum-disclosure-more');
  if (!btn || !more) return false;                       // D14 — null-guard, never assume the DOM
  btn.addEventListener('click', function () {
    var open = more.hasAttribute('hidden');              // about to become open
    if (open) more.removeAttribute('hidden'); else more.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? DATUM_FOOTER_TOGGLE_OPEN : DATUM_FOOTER_TOGGLE_CLOSED;
  });
  return true;
}

/* Idempotent: re-running paints the same bytes. The host element is NOT created if absent — a page
   that wants the footer declares where it goes, so this can never inject legal text into a layout
   that was not built to hold it. */
function _renderDatumFooter() {
  var host = document.getElementById('disclosure-footer');
  if (!host) return false;
  /* The BOX is styled here too, for the same reason as the paragraph: studio.html and most other
     hosts carried these as INLINE styles that the conversion removed, and only two pages had a CSS
     rule to fall back on. Setting it on the host keeps the module the single source of both the
     words AND the way they look. */
  host.setAttribute('style', DATUM_FOOTER_BOX_STYLE);
  host.innerHTML = _datumFooterHTML();
  _wireDatumDisclosure();
  return true;
}

if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _renderDatumFooter);
  else _renderDatumFooter();
}
