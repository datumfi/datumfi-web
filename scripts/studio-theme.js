/* ── THE STUDIO'S TWO THEME CONTROLS ─────────────────────────────────────────────────────────────
 * Ported from the Captain's design donor (`Studio Mock.html`, V31) under SHELL YES, BRAIN NO — the
 * same contract as the entry-overlay port. The donor owns the markup, the CSS and this control
 * logic; nothing about the Studio's engine moves.
 *
 * ⭐ TWO INDEPENDENT SWITCHES, NOT TWO LIGHT MODES. The donor is explicit at its row 2212:
 *   body.light-mode    — the site chrome goes light
 *   body.canvas-light  — the drawing surface becomes drafting paper
 * Four valid states, default dark/dark. Entering site-light defaults the canvas to light paper;
 * the paper control is independent after that.
 *
 * ⛔⛔ THIS FILE DOES NOT MAKE THE STUDIO LIGHT, AND THAT IS DELIBERATE. It toggles two classes and
 *    restyles the two buttons. No surface colour is wired yet — that is the value-level colour
 *    port, a separate commit with a separate revert boundary, so that "can I reach the control"
 *    and "does the colour match the mock" cannot fail for each other's reasons.
 *    A COMMIT THAT DELIBERATELY DOES LESS THAN ITS NAME SUGGESTS MUST SAY SO.
 *
 * ⚠️⚠️ THE BUTTON EXISTS IN TWO RENDERERS AND THE DELEGATION BELOW IS WHY. studio.html paints the
 *    signed-OUT nav; scripts/account-topbar.js paints the signed-IN one. A control wired only to
 *    the first is genuinely present, passes every gate honestly, and IS INVISIBLE TO THE ONLY
 *    PERSON WHO IS EVER SIGNED IN. Found by the Captain's own signed-in smoke, 2026-08-29 — the
 *    same two-renderer fork that landed the Drafting -> SHEET rename in one bar and not the other.
 *    Hence a delegated document listener (works for a button that does not exist yet) and
 *    window.datumThemeSync() for account-topbar.js to call after it renders its copy.
 *
 * ⚠️ A DONOR QUIRK, REPLICATED FAITHFULLY RATHER THAN SILENTLY REPAIRED: light-site + dark-paper
 *    does not survive a reload. On restore the donor applies the saved paper value and THEN the
 *    saved site value, and site-light re-defaults the paper — so a persisted 'dark' paper is
 *    overridden whenever the site is light. Reproduced here on purpose. Flagged for a ruling; it
 *    is the Captain's design and not mine to change.
 */
(function () {
  'use strict';

  /* The keys are defined ONCE, in studio.html's parse-time boot block, because that block must run
     before this file loads and therefore cannot import them. Reading them from there keeps one
     definition; refusing to run without them makes a divergence LOUD instead of silent. */
  var KEYS = window.DATUM_THEME_KEYS;
  if (!KEYS || !KEYS.site || !KEYS.paper) {
    console.warn('[datum-theme] parse-time boot block missing — theme controls inert.');
    return;
  }

  function readStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function syncOne(sel, on, onLabel, offLabel) {
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute('aria-label', on ? onLabel : offLabel);
      els[i].setAttribute('title', on ? onLabel : offLabel);
      els[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function syncButtons() {
    var cl = document.body.classList;
    syncOne('[data-theme-toggle="site"]', cl.contains('light-mode'),
      'Switch site to dark mode', 'Switch site to light mode');
    syncOne('[data-theme-toggle="paper"]', cl.contains('canvas-light'),
      'Switch canvas to dark paper', 'Switch canvas to light paper');
  }

  /* ⭐ WHY THE PAPER REMEMBERS *WHY* IT IS LIGHT, NOT JUST THAT IT IS — CAPTAIN-RULED 2026-08-29.
     The donor's coupling was one-way: entering site-light turned the paper white and leaving it
     never turned the paper back, so the button "stayed white and dimmed" (Captain's smoke).
     ⛔ BUT "ALWAYS REVERT" IS THE WRONG FIX AND WOULD BREAK HIS EARLIER RULING. If he DELIBERATELY
     chose white paper, the site switch must not throw that away. So the rule is:
         UNDO WHAT WE DID AUTOMATICALLY. NEVER UNDO WHAT THE USER CHOSE.
     which needs one bit the donor never stored — whether this paper state was ours or his.
     🔑 A SETTING AND THE REASON IT HOLDS ITS VALUE ARE TWO DIFFERENT FACTS. Storing only the value
     makes an automatic default indistinguishable from a deliberate choice, and any rule written
     over that single bit has to be wrong in one direction or the other. */
  var KEY_AUTO = KEYS.paper + '-auto';
  function paperWasAuto() { return readStore(KEY_AUTO) === '1'; }

  function setPaperTheme(theme, persist, auto) {
    var light = theme === 'light';
    document.body.classList.toggle('canvas-light', light);
    if (persist) {
      writeStore(KEYS.paper, light ? 'light' : 'dark');
      writeStore(KEY_AUTO, auto ? '1' : '0');
    }
    syncButtons();
  }

  function setSiteTheme(theme, persist) {
    var light = theme === 'light';
    /* ⛔ BOTH ELEMENTS, AND THE <html> ONE IS NOT DECORATION. The PAINT tokens are declared at
       :root; a custom property is substituted where it is DECLARED, so a paint set on <body> is
       already too late and the roles keep :root's dark values. Measured 2026-08-29 — setting the
       paint on body.light-mode moved NOTHING on screen. The donor's `body.light-mode` selectors
       need the body class; the paint tier needs the html one. Drop either and the theme half-lands. */
    document.documentElement.classList.toggle('light-mode', light);
    document.body.classList.toggle('light-mode', light);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#d7dfdb' : '#07101b');

    /* The donor's coupling, now REVERSIBLE (see setPaperTheme). Entering site-light still defaults
       the canvas to light paper; leaving site-light undoes exactly that and nothing else. */
    var paperLight = document.body.classList.contains('canvas-light');
    if (light && !paperLight) {
      setPaperTheme('light', persist, true);            // ours — and marked as ours
    } else if (!light && paperLight && paperWasAuto()) {
      setPaperTheme('dark', persist, false);            // undo ours; a chosen white is left alone
    }

    if (persist) writeStore(KEYS.site, light ? 'light' : 'dark');
    syncButtons();
  }

  /* DELEGATED, NOT BOUND. The signed-in copy of this button is injected by account-topbar.js on a
     later round trip; a direct addEventListener at load would miss it entirely. */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var btn = (t && t.closest) ? t.closest('[data-theme-toggle]') : null;
    if (!btn) return;
    var kind = btn.getAttribute('data-theme-toggle');
    if (kind === 'site') {
      setSiteTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light', true);
    } else if (kind === 'paper') {
      /* A CLICK IS ALWAYS DELIBERATE, so it clears the auto flag: from here the site switch will
         not touch this choice again. */
      setPaperTheme(document.body.classList.contains('canvas-light') ? 'dark' : 'light', true, false);
    }
  });

  window.datumThemeSync = syncButtons;
  window.datumSetSiteTheme = setSiteTheme;
  window.datumSetPaperTheme = setPaperTheme;
  window.datumPaperWasAuto = paperWasAuto;
  window.datumThemeRead = function () {
    return { site: readStore(KEYS.site), paper: readStore(KEYS.paper) };
  };

  syncButtons();
})();
