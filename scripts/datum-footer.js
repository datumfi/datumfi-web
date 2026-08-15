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
var DATUM_FOOTER_LINK_STYLE = 'color:rgba(255,255,255,0.3);text-decoration:none;';

function _datumFooterHTML() {
  var L = DATUM_FOOTER_LINK_STYLE;
  return '<p>DATUMAE is an educational tool and does not constitute financial, investment, or tax '
    + 'advice. Not a registered investment advisor. Consult a qualified financial professional before '
    + 'making financial decisions. All projections are hypothetical, based on mathematical models, and '
    + 'do not guarantee future results. Past performance does not guarantee future outcomes. '
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
    + ' &nbsp;|&nbsp; <span style="color:rgba(255,255,255,0.3);cursor:pointer;text-decoration:underline;"'
    + ' onclick="if(window.openDeleteDataModal){openDeleteDataModal();}else{location.href=\'/dsar.html\';}">Delete My Data</span>'
    + ' &nbsp;|&nbsp; <a href="/privacy-choices.html" style="' + L + '">Do Not Sell My Information</a>'
    + ' &nbsp;|&nbsp; <a href="/philosophy.html" style="' + L + '">Philosophy</a>'
    + ' &nbsp;|&nbsp; <a href="/methodology.html" style="' + L + '">Methodology</a>'
    + ' &nbsp;|&nbsp; Build&nbsp;2026.05.16&nbsp;&bull;&nbsp;v1.0.0</p>';
}

/* Idempotent: re-running paints the same bytes. The host element is NOT created if absent — a page
   that wants the footer declares where it goes, so this can never inject legal text into a layout
   that was not built to hold it. */
function _renderDatumFooter() {
  var host = document.getElementById('disclosure-footer');
  if (!host) return false;
  host.innerHTML = _datumFooterHTML();
  return true;
}

if (typeof document !== 'undefined' && document.addEventListener) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _renderDatumFooter);
  else _renderDatumFooter();
}
