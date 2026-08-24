/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   DATUM SENTRY — THE ERROR MONITOR, AND THE FIRST INSTRUMENT THAT WATCHES A REAL VISITOR.

   ⛔⛔ THE FAILURE SHAPE THIS FILE IS BUILT AGAINST, NAMED BEFORE A BYTE WAS WRITTEN:
   AN ERROR MONITOR THAT REPORTS NOTHING LOOKS EXACTLY LIKE AN APPLICATION WITH NO ERRORS.
   Every other module in this repo fails LOUDLY or fails VISIBLY. This one fails by being quiet,
   which is also what success looks like — so nothing downstream will ever complain on its behalf.
   🔑 THAT IS WHY EVERY INPUT HERE WAS CONFIRMED BY A HUMAN AND WHY THE PROOF OF LIFE IS A REAL
      EVENT ARRIVING IN THE DASHBOARD, NEVER "IT DEPLOYED".

   ── ⛔ THE CSP IS HALF OF THIS FEATURE, AND IT LIVES SOMEWHERE ELSE ──────────────────────────────
   studio.html carries its own <meta http-equiv="Content-Security-Policy">. Its `connect-src` must
   name the ingest host derived from DSN below:
       https://o4511758659223552.ingest.us.sentry.io
   Remove it and this file still loads, still initialises, still CAPTURES FAITHFULLY — and every
   envelope dies at the network boundary with nothing on screen and nothing in the dashboard.
   🔑 This is D25 repeating one layer up (Clerk bot protection needed the Turnstile allowlist).
   Guarded by scripts/_gate_sentry_wired.js, which asserts the CSP and this file TOGETHER, because
   either one alone is a green over a monitor that reports nothing. FINDING 17.

   ── ⭐ WHY THE SDK IS VENDORED AND NOT LOADED FROM js.sentry-cdn.com ─────────────────────────────
   The CDN loader would need `js.sentry-cdn.com` in `script-src`, which re-opens D3's unpinned-
   dependency hole ON THE ONE COMPONENT WHOSE FAILURE IS INVISIBLE. Self-hosting leaves `script-src`
   untouched, so `connect-src` is the ONLY CSP change this feature makes — one edit, one review.
   ⭐⭐ AND THE VARIANT IS LOAD-BEARING, MEASURED 2026-08-24. `bundle.min.js` (90,590 bytes) is the
   ERRORS-ONLY build: in it `Sentry.replayIntegration()` is a console.warn STUB, not an integration —
   verbatim from the artefact, "You are using replayIntegration() even though this bundle does not
   include replay." `bundle.tracing.replay.min.js` is 267,756 bytes and does
   contain it. Session Replay records the DOM, and on the Studio the DOM holds real account balances;
   replay is ruled OUT until masking can be verified against a signed-in session, which we cannot yet
   run. ⛔ A CONFIG FLAG CAN BE FLIPPED BY A FUTURE EDIT. A BUNDLE THAT DOES NOT CONTAIN THE CODE
   CANNOT. The exclusion is therefore STRUCTURAL, and swapping this filename for a fatter variant
   would silently convert a structural guarantee into a configuration promise.
   The version is IN THE FILENAME on purpose: an upgrade cannot happen without editing the tag.

   ── ⛔ async, NEVER defer — AND THE REASON IS NOT STYLE ──────────────────────────────────────────
   `defer` executes BEFORE DOMContentLoaded, so a deferred script DELAYS DCL. studio.html's preboot
   rule (scripts/studio-landing.js) hides the drafting panel until `data-room` is set at DCL, which
   converts any DCL delay 1:1 INTO BLANK-STAGE TIME the user sits and looks at. That is exactly the
   trap 42187ee documented. `async` does not participate in DCL at all.
   Re-gated by scripts/_gate_studio_preboot_paint.js, which answers it in one run.

   ── ⚠️ AND IT IS NOT FREE. THE COST IS WRITTEN DOWN HERE BECAUSE IT WAS MEASURED, NOT ASSUMED ────
   `async` does not BLOCK DomContentLoaded, but 90KB still competes for bandwidth and main thread
   before it. MEASURED 2026-08-24, 40ms RTT + CPU 4x, n=10 per arm, arms interleaved:
       head async (this file)      DCL mean 2808 ± 45     +97ms
       no Sentry at all            DCL mean 2711 ± 35      baseline
       injected on window.load     DCL mean 2727 ± 41       -8ms   <- the must-be-zero CONTROL
   ⭐ THE THIRD ARM IS WHY THE FIRST IS BELIEVABLE. Injecting after `load` CANNOT move DCL — it is
   recorded before `load` fires — so that arm has to read zero, and it does. At n=4 it read +98ms and
   the whole comparison was noise wearing a decimal point. THE CONTROL IS WHAT SEPARATED THE TWO.
   ⛔ SO THE PREDICTED "NO CHANGE" WAS FALSIFIED AND THE DESIGN SURVIVED ON A DIFFERENT ARGUMENT,
   WHICH IS SAID OUT LOUD RATHER THAN QUIETLY RESTATED: 97ms is BOUNDED CONTENTION, proportional to a
   fixed 90KB — not the UNBOUNDED, blocking delay that the no-`defer` rule exists to forbid.
   AND IT BUYS SOMETHING MEASURED: the SDK is ready at ~1265ms, so it covers the ~1400ms of page boot
   between then and DCL. Post-load injection would not start until ~2835ms and would trade 1.4s of
   the most fatal errors for 97ms of blank stage.
   🔑 THE TRADE DISAPPEARS ONCE THE PRE-SDK BUFFER (Finding 22) EXISTS: with errors buffered from the
      first byte, this file can move to post-load injection and cost ZERO. That is the argument for
      building Finding 22, and this paragraph is the number that justifies it.

   ── ⚠️ TWO async SCRIPTS HAVE NO DEFINED ORDER, SO THIS FILE NEVER ASSUMES ONE ───────────────────
   The SDK tag and this tag are BOTH async. Whichever wins, boot() runs exactly once: if window.Sentry
   is already there we init now, otherwise we wait on the SDK tag's own load event. LINE ORDER IN THE
   HEAD IS NOT EXECUTION ORDER the moment async is involved.

   ── ⛔ HOSTNAME GATING IS NOT COSMETIC — IT KEEPS THE GATE SUITE OUT OF THE DASHBOARD ────────────
   MEASURED 2026-08-24: 173 gates reference studio.html and 56 of them boot it from the local server
   on 127.0.0.1:8001. An unconditional init would fire harness errors into the dashboard on every
   full suite run — burning a free-tier quota and, far worse, BURYING THE SIGNAL FROM REAL VISITORS
   UNDER NOISE FROM A BROWSER NOBODY IS SITTING AT. A monitor you have learned to ignore is a monitor
   that reports nothing, arrived at by a longer road.
   LOCAL_OVERRIDE exists so the wiring can still be PROVEN before a push — an acceptance test that can
   run against the local server runs BEFORE the push, never by publishing to production to find out.

   ── ⛔ HOW IT DEGRADES ───────────────────────────────────────────────────────────────────────────
   Every failure path here ends in NO MONITORING, never in a broken page: the SDK 404s, the DSN is
   wrong, the CSP blocks the envelope, this file does not load at all — in all four the Studio behaves
   exactly as it did yesterday. Nothing on this page reads anything this file defines.
   ⚠️ WHICH IS PRECISELY WHY IT NEEDS A GATE AND A LIVE PROOF: A CHANGE WHOSE FAILURE MODE IS "THE OLD
   BEHAVIOUR" IS SAFE TO SHIP AND IMPOSSIBLE TO NOTICE.

   ── ⚠️ KNOWN LIMIT, NAMED RATHER THAN SMUGGLED ──────────────────────────────────────────────────
   Because the SDK loads async, an error thrown BEFORE it arrives is not captured. The fix is a small
   inline pre-buffer that re-throws into Sentry once it boots; that is its own commit. Do not write
   this down as "all errors are captured" — it captures every error FROM BOOT ONWARD.

   ── 🗓️ EXPIRY, BECAUSE MONITORING THAT LAPSES DOES NOT ALARM — IT JUST STOPS TELLING YOU THINGS ──
   The licence is a 1-year renewable GitHub Student Pack term installed ~2026-08; it LAPSES ~2027-08.
   FALSIFIER, runnable in one minute: log into Sentry and read the plan.
   ⭐ AND THE WHOLE CHAIN HAS A FALSIFIER TOO — window.datumSentryTestError() below. It is shipped
   deliberately: "is the monitor alive?" should be answerable in ten seconds, forever, by anyone,
   without a deploy. A proof of life you have to rebuild is a proof of life you will not run.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ⛔ CAPTAIN-CONFIRMED AGAINST THE DASHBOARD, character for character, twice: once 2026-08-24 when
     it first arrived DUPLICATED END-TO-END, and again before this file was written. A blocked CSP
     drops events silently; a MIS-READ DSN MISROUTES THEM SILENTLY. Same failure shape, one layer
     down, and neither one ever complains. THE INGEST HOST IN THE studio.html connect-src IS DERIVED
     FROM THIS STRING — change one and you must change the other, in the same commit. */
  var DSN = 'https://6f6f5faa117d6a714e7a33df070d9d10@o4511758659223552.ingest.us.sentry.io/4511966289526784';

  /* The origins that are a REAL VISITOR. datumae.com is listed AHEAD of the migration on purpose:
     the new origin must be able to report from the moment it answers, and the migration law is that
     BOTH origins are valid simultaneously — a cutover with no overlap is a deploy with no revert. */
  var PROD_HOSTS = ['datumfi.com', 'www.datumfi.com', 'datumae.com', 'www.datumae.com'];

  /* The deliberate, explicit way to make a NON-production origin report. Two doors, both requiring
     intent — nothing here trips by accident during a gate run. */
  function localOverride() {
    try {
      if (window.localStorage && localStorage.getItem('datum_sentry_local') === '1') return true;
    } catch (e) { /* storage can throw in a partitioned/blocked context; that is not an opt-in */ }
    return String(location.search || '').indexOf('datum_sentry=1') !== -1;
  }

  var host = String(location.hostname || '').toLowerCase();
  var isProd = PROD_HOSTS.indexOf(host) !== -1;
  if (!isProd && !localOverride()) return;

  var booted = false;

  function boot() {
    if (booted) return;
    var S = window.Sentry;
    if (!S || typeof S.init !== 'function') return;
    booted = true;

    S.init({
      dsn: DSN,

      /* ⭐ THE TAG THAT KEEPS THE DASHBOARD HONEST. A local proof event and a real visitor's event are
         the same shape; without this they are indistinguishable, and the first thing anyone would do
         with an unlabelled dashboard is stop trusting it. */
      environment: isProd ? 'production' : 'local',

      /* ⛔ EXPLICIT, THOUGH IT IS ALSO THE SDK DEFAULT. This is a privacy posture, not a preference:
         stating it here makes it AUDITABLE and gate-assertable, and means a future SDK bump that
         changed the default could not change our posture silently. */
      sendDefaultPii: false,

      /* Browser noise that is not a defect in this product and is not actionable by anyone.
         ⚠️ KEEP THIS LIST SHORT AND ARGUED. Every entry is a class of report we are choosing never to
         see again, and a filter added to quieten a dashboard is how a real defect goes unread. */
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications'
      ],

      /* Errors thrown by browser extensions running INSIDE the user's page. They carry our URL and
         look like ours; they are not ours and we cannot fix them. */
      denyUrls: [
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
        /^safari-(web-)?extension:/i
      ]
    });
  }

  /* ⚠️ NO ORDER IS ASSUMED BETWEEN THE TWO async TAGS — see the header. Both arms end in boot(),
     boot() is idempotent, and if the SDK never arrives NOTHING HAPPENS, which is the whole degrade
     story: no monitoring, never a broken page. */
  if (window.Sentry && typeof window.Sentry.init === 'function') {
    boot();
  } else {
    var sdk = document.getElementById('datum-sentry-sdk');
    if (sdk) sdk.addEventListener('load', boot);
  }

  /* ⭐ THE PROOF OF LIFE. Call it from the console on any origin where this file initialised:
         datumSentryTestError()
     and the event must appear in the dashboard. THIS IS THE ONLY CHECK THAT CLEARS THE CSP AND THE
     DSN AT ONCE — the SDK loading proves neither, because capture succeeds and the envelope dies at
     the network boundary with no error the SDK itself can see.
     ⛔ IT IS NOT A DEBUG LEFTOVER AND MUST NOT BE TIDIED AWAY. Nothing on the page calls it, it
     cannot fire by itself, and it is the standing falsifier for the licence expiry above. */
  window.datumSentryTestError = function (note) {
    var S = window.Sentry;
    if (!S || typeof S.captureException !== 'function') {
      return 'sentry-not-initialised';
    }
    var id = S.captureException(
      new Error('DATUM SENTRY PROOF OF LIFE — ' + (note || 'manual') + ' — ' + new Date().toISOString())
    );
    return id || 'captured-no-id';
  };
})();
