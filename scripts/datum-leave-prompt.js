'use strict';
/* ── THE LEAVE PROMPT ────────────────────────────────────────────────────────────────────────────────
 * ONE component, THREE branches, shared by Sketch and Studio. NOT a sacred host on purpose: the copy and
 * the styling are the parts that will be revised most, and they should not cost a pin recomputation and a
 * rebuild every time somebody changes a word.
 *
 * READ BY NOTHING YET. This commit builds the component and the routing; the surfaces wire it next.
 *
 * ── THE TWO AXES ARE INDEPENDENT, AND CONFUSING THEM IS THE FAILURE MODE ──
 * THE BASELINE — whether a last-saved snapshot exists — decides WHAT IS AT RISK.
 * AUTH STATE     — whether they have an account      — decides WHAT WE SAY.
 * These are not the same question and must never be collapsed. If copy is keyed off the baseline instead
 * of auth, a signed-in architect who has never saved gets handed Branch B and is invited to "create a free
 * account" they already own. That is the specific defect --flatten in the gate reproduces.
 *
 *   signed out + hasBuilt                        -> B   the conversion moment
 *   signed in  + hasBuilt + NO last save         -> C   the most exposed person on the site
 *   signed in  + hasBuilt + edited since save    -> A   protection
 *   signed in  + hasBuilt + saved, not edited    -> SILENT, the work is already safe
 *   hasBuilt false, either auth state            -> SILENT, there is nothing to keep
 *
 * WHY THERE ARE THREE BRANCHES AND NOT TWO. "Edited since last save" is not FALSE for somebody who has
 * never saved — it is UNDEFINED, and undefined is a third state rather than a flavour of false. Branch A's
 * body says "since your last save"; for that person there was no last save, so Branch A would be making a
 * claim that is not true. Branch C exists because the copy has to be true, not because the plumbing needed it.
 *
 * ── hasBuilt MEANS BUILT, NOT TOUCHED. THIS IS A CONTRACT, NOT A HINT. ──
 * Every branch's copy asserts the person MADE something: "You have sketched real work here", "You've built
 * something here". A signal that fires when somebody merely touched a control cannot honestly feed those
 * words — a single nudge of one slider would produce a dialog claiming they built real work.
 * Studio satisfies this: DatumBlueprint.workState().hasContent compares the draft against a blank blueprint.
 * SKETCH DOES NOT YET. window._skDirty is a TOUCH signal (trusted pointerdown / keydown), and it is NOT an
 * acceptable source for hasBuilt. Sketch needs its own content test before it may be wired — that is the
 * first task of the Sketch wiring commit, and this file will not paper over it.
 *
 * ── DISMISS NEVER NAVIGATES ──
 * Escape, the backdrop and the close control all return the user EXACTLY where they were, with no nav and
 * no side effect. The only paths that leave are the ones a human explicitly chose. */
(function (global) {

  /* ══ AUTHORED COPY — ARCHITECT-AUTHORED, WIRED VERBATIM (L47). DO NOT RE-WORD, RE-PUNCTUATE OR TIDY. ══
   * If something here reads wrong, it goes back to the Architect. It does not get fixed in this file. */
  var COPY = {
    /* BRANCH A — AUTHENTICATED, has saved before, has edited since. A nudge. */
    A: {
      title: "You have changes that are not saved yet.",
      /* {fileName} IS DROPPED, NOT FABRICATED, when no name resolves — the Architect's explicit rule. */
      bodyNamed: "You have made edits to {fileName} since your last save. Leave now and those edits will not be here when you come back.",
      bodyPlain: "You have made edits since your last save. Leave now and those edits will not be here when you come back.",
      primary:   "Save and continue.",
      secondary: "Leave without saving.",
      tertiary:  "Stay on this page."
    },
    /* BRANCH B — UNAUTHENTICATED. THE CONVERSION MOMENT. An invitation, never a warning.
     * TONE FENCE: this must NEVER read as a variant of you-have-unsaved-changes. It reads as
     * you made something good, here is how to keep it. Value stated, never pressured. */
    B: {
      title: "Keep what you just built.",
      body: ["You have sketched real work here. Right now it only lives in this browser tab. Close it and it is gone. A free Datum account saves it, so you can pick it back up on any device, anytime."],
      subtext: "Discover is free and includes one saved plan. Ready for more? Design unlocks unlimited saves and deeper live data.",
      primary:   "Create a free account.",
      secondary: "I already have one. Sign in.",
      tertiary:  "Leave without saving."
    },
    /* BRANCH C — AUTHENTICATED, NEVER SAVED. Urgent but easy.
     * TWO DELIBERATE CHOICES from the Architect: no "create an account" ask, because they have one and that
     * ask insults them; and the buttons are not a discard-framed fork, because nothing existing is at risk
     * of being overwritten. */
    C: {
      title: "You haven't saved this yet",
      body: ["You've built something here, but it only lives in this tab. Leave now and it's gone — closing the page, a refresh, anything.",
             "Saving takes a second and it's already part of your account."],
      primary:   "Save and continue",
      secondary: "Leave without saving"
    }
  };

  /* PURE. No DOM, no storage, no side effects — so it can be exhaustively table-tested. */
  function decide(state) {
    var s = state || {};
    if (!s.hasBuilt) return null;                       // nothing to keep -> say nothing
    if (!s.signedIn) return 'B';                        // AUTH decides the words
    if (!s.everSaved) return 'C';                       // BASELINE decides what is at risk
    return s.editedSinceSave ? 'A' : null;              // saved and untouched since -> already safe
  }

  function _el(tag, css, text) {
    var e = global.document.createElement(tag);
    if (css)  e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }

  var MONO = 'font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)';
  var BTN  = MONO + ';font-size:11px;letter-spacing:0.08em;text-transform:uppercase;padding:11px 20px;' +
             'border-radius:3px;cursor:pointer;line-height:1;transition:opacity .15s';

  var _open = null;

  /* handlers: onSave, onCreateAccount, onSignIn, onLeave, onStay. Every one is optional and every one is
   * called inside a try — a throwing host must not wedge the dialog open with no way out. */
  function show(branch, handlers) {
    var c = COPY[branch];
    if (!c || _open) return null;
    var h = handlers || {};
    var doc = global.document;

    var wrap = _el('div', 'position:fixed;inset:0;z-index:100200;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(6,8,10,0.72);backdrop-filter:blur(2px);padding:24px');
    wrap.setAttribute('data-leave-prompt', branch);

    var card = _el('div', 'max-width:min(560px,94vw);width:100%;background:#0e1114;' +
      'border:1px solid rgba(229,142,38,0.42);border-radius:6px;padding:26px 26px 22px;' +
      'box-shadow:0 28px 70px rgba(0,0,0,0.6);color:#e9c48a;' + MONO);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');

    var title = _el('div', MONO + ';font-size:14px;letter-spacing:0.06em;line-height:1.5;color:#f0d5a6;' +
      'margin:0 0 14px', c.title);
    card.appendChild(title);

    var bodies = (branch === 'A') ? [h.fileName ? c.bodyNamed.replace('{fileName}', h.fileName) : c.bodyPlain] : c.body;
    bodies.forEach(function (p) {
      card.appendChild(_el('div', MONO + ';font-size:12px;line-height:1.75;letter-spacing:0.03em;' +
        'color:#cfd6dc;margin:0 0 10px', p));
    });
    if (c.subtext) {
      card.appendChild(_el('div', MONO + ';font-size:11px;line-height:1.7;letter-spacing:0.03em;' +
        'color:#8b959d;margin:2px 0 0;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)', c.subtext));
    }

    var row = _el('div', 'display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;align-items:center');
    function add(label, css, fn) {
      if (!label) return null;
      var b = _el('button', BTN + ';' + css, label);
      b.type = 'button';
      b.addEventListener('click', function () { close(); try { if (fn) fn(); } catch (_e) {} });
      row.appendChild(b);
      return b;
    }
    var primary = add(c.primary, 'background:#e58e26;border:1px solid #e58e26;color:#12161a;font-weight:600',
      branch === 'B' ? h.onCreateAccount : h.onSave);
    add(c.secondary, 'background:transparent;border:1px solid rgba(233,196,138,0.35);color:#e9c48a',
      branch === 'B' ? h.onSignIn : h.onLeave);
    add(c.tertiary, 'background:transparent;border:1px solid transparent;color:#8b959d;margin-left:auto',
      branch === 'B' ? h.onLeave : h.onStay);
    card.appendChild(row);
    wrap.appendChild(card);

    /* DISMISS = STAY. Backdrop and Escape both close and NAVIGATE NOWHERE. */
    function close() {
      if (!_open) return;
      _open = null;
      try { doc.removeEventListener('keydown', onKey, true); } catch (_e) {}
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    function dismiss() { close(); try { if (h.onStay) h.onStay(); } catch (_e) {} }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); dismiss(); } }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) dismiss(); });
    doc.addEventListener('keydown', onKey, true);

    doc.body.appendChild(wrap);
    _open = { branch: branch, close: close };
    try { if (primary) primary.focus(); } catch (_e) {}
    return _open;
  }

  /* Convenience: decide and show in one call. Returns the branch shown, or null when we stayed silent. */
  function maybeShow(state, handlers) {
    var b = decide(state);
    if (!b) return null;
    show(b, handlers);
    return b;
  }

  global.DatumLeavePrompt = {
    COPY:      COPY,
    decide:    decide,
    show:      show,
    maybeShow: maybeShow,
    isOpen:    function () { return !!_open; },
    close:     function () { if (_open) _open.close(); }
  };

}(typeof window !== 'undefined' ? window : this));
