// Datum FI — Shared Account Topbar Component (Pattern C · JS injection)
// Loaded by: /my-account.html (always)
//            /sketchbook.html (R3.5.5b)
//            /Blueprint.html (R3.5.5b v2)
//            /Dossier.html (R3.5.5b v2)
// Does NOT contain a Clerk gate — loading decision is per-page.
(function () {
  'use strict';

  var path       = window.location.pathname;
  var onAccountPage = /\/my-account(\.html)?($|\?)/.test(path);

  function getActiveTab() {
    if (/\/my-account(\.html)?($|\?)/.test(path))   return 'welcome';
    if (/\/Dossier(\.html)?($|\?)/.test(path))       return 'profile';
    if (/\/sketchbook(\.html)?($|\?)/.test(path))    return 'sketches';
    if (/\/Blueprint(\.html)?($|\?)/.test(path))     return 'myblueprints';
    if (/\/sketch(\.html)?($|\?)/.test(path))        return 'sketch';
    if (/\/studio(\.html)?($|\?)/.test(path))        return 'studio';
    if (/\/why-a-range(\.html)?($|\?)/.test(path))   return 'shape';
    return '';
  }

  function injectCSS() {
    if (document.getElementById('acct-topbar-styles')) return;
    var style = document.createElement('style');
    style.id = 'acct-topbar-styles';
    style.textContent = ''
      + '#acct-topbar {'
      + '  position:fixed;top:0;left:0;right:0;height:64px;z-index:200;'
      + '  border-bottom:1px solid rgba(255,255,255,.07);'
      + '  background:rgba(5,11,20,.84);'
      + '  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);'
      + '  display:flex;align-items:center;padding:0 28px;'
      + '}'
      + '.acct-brand{'
      + '  display:flex;align-items:center;gap:12px;flex-shrink:0;'
      + '  text-decoration:none;'
      + '}'
      + '.acct-logo{'
      + '  width:27px;height:27px;'
      + '  filter:drop-shadow(0 0 10px rgba(29,158,117,.28));'
      + '  flex-shrink:0;'
      + '}'
      + '.acct-wordmark-img{'
      + '  height:18px;width:auto;flex-shrink:0;'
      + '  filter:drop-shadow(0 0 8px rgba(255,255,255,.06));'
      + '}'
      /* ⛔ RIGHT-ORIENTED, NOT CENTRED — CAPTAIN-RULED 2026-08-22, AND IT IS LOAD-BEARING IN THE
         STUDIO, NOT A PREFERENCE. The toggle is pinned to the seam on the LEFT; centred tabs drift
         toward the middle of the viewport and collide with it. Right-orienting them reproduces the
         signed-out feel the Captain asked to keep: pinned toggle, then a wide quiet gap, then the
         controls gathered in the top right with Upgrade outermost. */
      + '.acct-topbar-nav{'
      + '  flex:1;display:flex;align-items:center;'
      + '  justify-content:flex-end;gap:4px;height:100%;'
      + '}'
      + '.acct-cluster{display:flex;align-items:center;gap:2px;}'
      + '.acct-tab{'
      + '  font-family:"DM Mono",monospace;font-size:10px;'
      + '  text-transform:uppercase;letter-spacing:.14em;'
      + '  color:rgba(255,255,255,.38);background:none;border:none;'
      + '  cursor:pointer;padding:6px 11px;border-radius:4px;'
      + '  transition:color .18s;position:relative;'
      + '  text-decoration:none;display:inline-block;line-height:1;'
      + '}'
      + '.acct-tab:hover{color:rgba(255,255,255,.72);}'
      + '.acct-tab.active{color:#C9A84C;}'
      + '.acct-tab.active::after{'
      + '  content:"";position:absolute;bottom:-1px;left:11px;right:11px;'
      + '  height:2px;background:#C9A84C;'
      + '  box-shadow:0 0 10px rgba(201,168,76,.4);border-radius:1px;'
      + '}'
      + '.acct-divider{'
      + '  width:1px;height:24px;background:rgba(255,255,255,.12);'
      + '  margin:0 8px;flex-shrink:0;'
      + '}'
      /* ══ THE CONTRACTED BARS' EVEN RHYTHM — CAPTAIN-RULED 2026-08-22 FROM A RENDER ═════════════
         HOME · STUDIO · ARCHIVE · SAVE · | · UPGRADE, one spacing value between every pair.
         ⛔ MEASURED BEFORE CHANGING ANYTHING, AND IT CORRECTED THE DIAGNOSIS: the tab gaps were
         ALREADY equal at 2px each — Home->Studio and Studio->Archive were identical. What made the
         rhythm read uneven is that the LABELS grow (Home 49.6px, Studio 63.4, Archive 70.3) while
         the gap stays fixed, and that three bare-text tabs then run into two BORDERED buttons, so
         the same 2px reads completely differently either side of that boundary.
         ⛔⛔ AND ONE GAP REALLY WAS BROKEN: Save -> Upgrade measured ZERO. .acct-topbar-nav and
         .acct-topbar-right are flex SIBLINGS and #acct-topbar declared no gap, so the two bordered
         buttons rendered edge to edge.
         ⭐ 8px IS NOT INVENTED — it is .acct-divider's own authored margin, already live in this
         bar, promoted to the row rhythm rather than a new number chosen by a wirer.
         ⚠️ SCOPED BY ATTRIBUTE, NEVER BY CLASS: .acct-cluster is shared with the out-of-scope
         branch, so styling it directly would re-space Home too. */
      + '#acct-topbar[data-acct-nav="contracted"]{gap:8px;}'
      + '#acct-topbar[data-acct-nav="contracted"] .acct-cluster{gap:8px;}'
      + '#acct-topbar[data-acct-nav="contracted"] .acct-divider{margin:0;}'
      + '.acct-topbar-right{'
      + '  flex-shrink:0;display:flex;'
      + '  align-items:center;justify-content:flex-end;gap:8px;'
      + '}'
      + '.acct-action-btn{'
      + '  font-family:"DM Mono",monospace;font-size:9px;'
      + '  text-transform:uppercase;letter-spacing:.13em;'
      + '  background:none;border:1px solid rgba(255,255,255,.12);'
      + '  color:rgba(255,255,255,.38);cursor:pointer;'
      + '  padding:5px 10px;border-radius:3px;'
      + '  transition:color .18s,border-color .18s;white-space:nowrap;'
      + '}'
      + '.acct-action-btn:hover{color:rgba(255,255,255,.72);border-color:rgba(255,255,255,.28);}'
      + '.acct-action-btn.acct-signout{color:rgba(226,75,74,.52);border-color:rgba(226,75,74,.20);}'
      + '.acct-action-btn.acct-signout:hover{color:rgba(226,75,74,.85);border-color:rgba(226,75,74,.50);}'
      + '.acct-action-btn.acct-save{color:var(--teal,#1d9e75);border-color:var(--teal,#1d9e75);text-decoration:none;}'
      + '.acct-action-btn.acct-save:hover{background:rgba(29,158,117,.12);border-color:var(--teal,#1d9e75);}'
      + '.acct-action-btn.acct-upgrade{color:#C9A84C;border-color:#C9A84C;text-decoration:none;}'
      + '.acct-action-btn.acct-upgrade:hover{background:rgba(201,168,76,.1);border-color:#C9A84C;}'
      /* Studio-only toggles (left of nav). .view-btn base comes from header.css, which
         the Studio page always loads; acct-view-active supplies the active style without
         depending on header.css's .view-btn.active. */
      /* ⛔⛔ PINNED TO THE SEAM, MIRRORING styles/header.css:143's SIGNED-OUT RULE.
         #acct-topbar is document.body.prepend-ed and position:fixed, so it is a SIBLING of
         #studio-layout — it can only see --studio-panel-w because 4b25a49 moved the write to
         documentElement. Before that commit this pin was impossible, not merely unwritten.
         ⚠️ SAME MECHANISM AND SAME LEFT EDGE AS SIGNED-OUT, NOT THE SAME VERTICAL POSITION:
         this bar is 64px tall and #app-nav is 56px. Normalising the two heights is a nav redesign
         and is deliberately NOT in this contract. */
      + '.acct-studio-toggle{display:flex;gap:3px;align-items:center;flex-shrink:0;'
      + '  position:absolute;left:var(--studio-panel-w);top:50%;transform:translateY(-50%);margin-left:0;}'
      + '.acct-view-active{background:rgba(29,158,117,.12)!important;border-color:#3ec3a0!important;color:#3ec3a0!important;}'
      + '@media(max-width:720px){'
      + '  .acct-topbar-nav{display:none;}'
      + '  .acct-wordmark-img{height:15px;}'
      + '  .acct-action-btn{font-size:8px;padding:4px 8px;}'
      + '}';
    document.head.appendChild(style);
  }

  function makeTab(target, label, active) {
    var cls = 'acct-tab' + (active === target ? ' active' : '');
    return '<button type="button" class="' + cls + '" data-acct-tab="' + target + '">'
      + label + '</button>';
  }

  /* ── Studio-only view-toggles (ISOLATED — page-specific coupling kept here and
     obvious). Rendered ONLY when getActiveTab()==='studio', so it never leaks onto
     any other account page. Buttons drive window.setViewMode (a studio.html global);
     they stand in for the signed-out #app-nav toggles, which nav.js hides once
     authenticated — without this they would silently vanish on signed-in Studio. ── */
  /* ⛔⛔ SHEET · SPLIT · STRUCTURE — AND THE FORK IS THE POINT, SO IT IS NAMED HERE.
   * These three controls are rendered by TWO renderers: studio.html's signed-OUT #app-nav emits
   * one copy, and this function emits the signed-IN copy. PART 5 renamed Drafting -> SHEET and
   * Blueprint -> STRUCTURE, and the rename LANDED IN ONLY ONE OF THEM — this copy still read
   * "◼ Drafting" and "◼ Blueprint" for months, so the same control had two names depending on
   * whether you were logged in.
   * 🔑 A RENAME THAT "NEVER LANDED" USUALLY LANDED — IN ONE OF TWO PLACES. §24's auth-state nav
   *    fork exactly: nobody diffs a signed-out page against a signed-in one.
   * ⛔ THE NEXT RENAME OF THESE STRINGS MUST EDIT BOTH: here AND studio.html's #app-nav block.
   * ⚠️ TWO TOOLTIPS ARE THE SIGNED-OUT COPY PORTED VERBATIM (studio.html), NOT REDRAFTED — L47.
   *    They were carrying the retired vocabulary too.
   * 🖊️ THE THIRD IS NOT A PORT. Both navs read a bare "Split View" against siblings carrying a
   *    name-then-descriptor grammar, so "Split — inputs and canvas" was AUTHORED 2026-08-22 and
   *    landed in BOTH renderers in this one commit. Porting the bare string would have shipped a
   *    set that is two-thirds patterned — the kind of thing noticed once and never fixed. */
  function studioToggles(active) {
    if (active !== 'studio') return '';
    return '<div class="acct-studio-toggle" role="group" aria-label="Studio view">'
      + '<button type="button" class="view-btn" data-acct-view="draft" title="Sheet — full-screen ledger">◼ Sheet</button>'
      + '<button type="button" class="view-btn acct-view-active" data-acct-view="split" title="Split — inputs and canvas">◼◻ Split</button>'
      + '<button type="button" class="view-btn" data-acct-view="blueprint" title="Structure — estate blocks">◼ Structure</button>'
      + '</div>';
  }

  /* Origin-aware Save — appears ONLY on its own editor page (studio -> Blueprint,
     sketch -> Sketch) and sits beside its archive tab (The Archive / The Sketchbook). */
  function saveAction(active) {
    if (active === 'studio') return '<button type="button" class="acct-action-btn acct-save" data-acct-action="save-current" title="Save to your Archive">⤓ Save</button>';
    if (active === 'sketch') return '<button type="button" class="acct-action-btn acct-save" data-acct-action="save-current" title="Save to your Sketchbook">⤓ Save</button>';
    return '';
  }

  /* HOME-ONLY SIGN OUT (Captain, 2026-08-01). The bar is the ONLY sign-out control in the whole
     product — measured, no page carries its own — so this is not a duplicate being tidied away,
     it is the single door being moved to one room. Leaving from anywhere else is now: Home, then
     Sign Out. Deliberate; the Home tab is present on every page that renders this bar, so the
     door is always two clicks away and never zero.
     The click handler that owns sign-out is already null-guarded (`if (_signOutBtn)`), so the
     button's absence is a no-op rather than a thrown error on every other page. */
  function signOutAction(active) {
    if (active !== 'welcome') return '';
    return '<button type="button" class="acct-action-btn acct-signout"'
      + ' data-acct-action="signout" aria-label="Sign out of Datum FI">Sign Out</button>';
  }

  /* ══ THE NAV SERVES THE SURFACE YOU ARE ON ══════════════════════════════════════════════════
   * CAPTAIN-RULED 2026-08-22, and it is the first time this project has written the principle down:
   * SIGNED-IN IS A WORKSPACE, AND A WORKSPACE SERVES THE WORK. In the Studio you get Studio
   * controls; in the Sketch you get Sketch controls.
   *
   * ⛔ SIGNED-OUT IS DELIBERATELY NOT THIS, AND THE DIVERGENCE IS THE DECISION, NOT AN OVERSIGHT:
   * signed-out is a FUNNEL — a visitor who has not committed to a product should still see the
   * others — so the signed-out navs keep every destination. The two states diverging here is
   * correct rather than a fork.
   *
   * ⛔⛔ SCOPE, STATED SO THE SILENCE IS NOT READ AS COVERAGE. Only TWO of the seven surfaces
   * getActiveTab can return are contracted: 'studio' and 'sketch'. The other five — welcome,
   * shape, profile/Dossier and the two archives — KEEP TODAY'S FULL BAR, untouched, until their
   * own arc. Shipping context-aware nav for two states and silently leaving five would recreate
   * the two-vocabularies fork closed earlier the same day, in a different dimension.
   *
   * ⚠️ THE ARTICLE DROPS FOR DENSITY, IT IS NOT A RENAME. 'Archive' in a five-item bar and
   * 'The Archive' in a page hero are both correct in their own register — a nav tab is a LABEL and
   * a hero is a SENTENCE. The heroes are unchanged and _gate_archive_hero_copy still guards them.
   * ⛔ AND THE FULL-BAR BRANCH BELOW KEEPS 'The Sketchbook' / 'The Archive' VERBATIM, which is why
   * both spellings are live at once and why that is not a divergence. */
  function navSetFor(active) {
    /* ⭐ THE TRAILING DIVIDER IS THE SIGNED-OUT BAR'S OWN, NOT A NEW ORNAMENT: #app-nav separates
       its right-hand actions with the same 1px rule, and without it Save and Upgrade rendered
       EDGE TO EDGE — MEASURED at a 0px gap, because .acct-topbar-nav and .acct-topbar-right are
       flex SIBLINGS and #acct-topbar declared no gap between them. */
    if (active === 'studio') {
      return '<div class="acct-cluster">'
        + makeTab('welcome',      'Home',    active)
        + makeTab('studio',       'Studio',  active)
        + makeTab('myblueprints', 'Archive', active)
        + saveAction(active)
        + '<div class="acct-divider" aria-hidden="true"></div>'
        + '</div>';
    }
    if (active === 'sketch') {
      return '<div class="acct-cluster">'
        + makeTab('welcome',  'Home',       active)
        + makeTab('sketch',   'Sketch',     active)
        + makeTab('sketches', 'Sketchbook', active)
        + saveAction(active)
        + '<div class="acct-divider" aria-hidden="true"></div>'
        + '</div>';
    }
    /* THE OTHER FIVE SURFACES — UNCHANGED. Not a fallback in the "whatever is left" sense; it is
       the contract's explicit out-of-scope branch and it must keep behaving exactly as it did.
       ⚠️ saveAction is NOT called here and that is not an omission: it returns '' for every id
       except studio and sketch, both of which are handled above, so the old conditional calls in
       this branch were provably dead code. Removing them changes no rendered byte. */
    return '<div class="acct-cluster">'
      /* The Dossier lost its permanent tab (Captain, 2026-08-01) — it is reached from its Home
         tile instead. getActiveTab still RETURNS 'profile' on Dossier.html and handleTabClick
         still routes it: the id remains part of the system for active-state and routing, it just
         no longer has a permanent seat in the bar. Consequence, stated rather than discovered:
         on the Dossier page no tab highlights, because the tab it would highlight is not there.
         ⛔ STILL TRUE AND STILL OUT OF SCOPE — a known gap, not one this commit opens. */
      +   makeTab('welcome',      'Home',         active)
      + '</div>'
      + '<div class="acct-divider" aria-hidden="true"></div>'
      + '<div class="acct-cluster">'
      +   makeTab('sketches',     'The Sketchbook',  active)
      +   makeTab('myblueprints', 'The Archive', active)
      + '</div>'
      + '<div class="acct-divider" aria-hidden="true"></div>'
      + '<div class="acct-cluster">'
      +   makeTab('sketch',  'Sketch',  active)
      +   makeTab('studio',  'Studio',  active)
      +   makeTab('shape',   'Shape',   active)
      + '</div>';
  }

  /* The contracted surfaces carry their own spacing rhythm, so the attribute EXISTS TO SCOPE IT.
     ⛔ The five out-of-scope surfaces must keep today's exact layout, and .acct-cluster is shared
     by both branches — styling the class directly would have re-spaced Home along with the Studio,
     which is precisely the leak the contract forbids. */
  function buildHTML(active) {
    var contracted = (active === 'studio' || active === 'sketch');
    return '<header id="acct-topbar" role="banner"' + (contracted ? ' data-acct-nav="contracted"' : '') + '>'
      + '<a href="/index.html" class="acct-brand" aria-label="Datum FI — Home">'
      + '<img class="acct-logo" src="/brand/datumfi-mark-d.svg" alt="" aria-hidden="true">'
      + '<img class="acct-wordmark-img" src="/brand/datumfi-wordmark-atum-fi.svg" alt="DATUM FI">'
      + '</a>'
      + studioToggles(active)
      + '<nav class="acct-topbar-nav" aria-label="Account navigation">'
      +   navSetFor(active)
      + '</nav>'
      + '<div class="acct-topbar-right">'
      +   signOutAction(active)
      +   '<a href="/pricing.html" class="acct-action-btn acct-upgrade">Upgrade</a>'
      + '</div>'
      + '</header>';
  }

  /* THE TOPBAR IS THE NAVIGATION FOR A SIGNED-IN USER, so every tab hop is routed through the page's own
   * _navDrain chokepoint where one exists. Today that means a topbar hop AWAITS the D1 drain instead of
   * abandoning an in-flight save mid-write; it is also the seam the unsaved-work guard will sit behind, so
   * the guard covers the tab bar rather than missing the most common exit in the product.
   *
   * L60 — A GUARD PLACED IN FRONT OF SOMETHING THE PLATFORM ALREADY GUARANTEES MUST FAIL OPEN.
   * A plain location.href always navigates. Routing it through our own code makes navigation depend on our
   * JavaScript completing, and a link that silently does nothing strands the user on a page with a dead tab
   * bar, with no error, on every signed-in surface at once. So: _navDrain absent -> navigate. _navDrain
   * throws -> navigate. The default is always the behaviour the user would have got without us.
   * WHAT THIS CANNOT GUARD, stated rather than assumed: a _navDrain that neither throws nor navigates —
   * one that simply hangs — cannot be rescued from here, because the only correct escape would be to
   * navigate anyway, and that would override a human who has deliberately chosen to stay. That case belongs
   * to the design of whatever sits inside _navDrain, and it is a constraint on that design, not a gap here. */
  function _leave(url) {
    try {
      if (typeof window._navDrain === 'function') { window._navDrain(url); return; }
    } catch (e) {}
    window.location.href = url;
  }
  function handleTabClick(tabId) {
    switch (tabId) {
      case 'welcome':      _leave('/my-account.html');  break;
      case 'profile':      _leave('/Dossier.html');     break;
      case 'sketches':     _leave('/sketchbook.html');  break;
      case 'myblueprints': _leave('/Blueprint.html');   break;
      case 'sketch':       _leave('/sketch.html');      break;
      case 'studio':       _leave('/studio.html');      break;
      case 'shape':        _leave('/why-a-range.html'); break;
    }
  }

  function syncActive(topbarEl) {
    var active = getActiveTab();
    topbarEl.querySelectorAll('[data-acct-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-acct-tab') === active);
    });
  }

  function mount() {
    if (document.getElementById('acct-topbar')) return;
    injectCSS();
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildHTML(getActiveTab());
    var topbarEl = wrapper.firstElementChild;
    document.body.prepend(topbarEl);

    topbarEl.querySelectorAll('[data-acct-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleTabClick(btn.getAttribute('data-acct-tab'));
      });
    });

    // F4 — Sign Out · graceful: Clerk not loaded on public pages (post-F21 Pattern B)
    var _signOutBtn = topbarEl.querySelector('[data-acct-action="signout"]');
    if (_signOutBtn) _signOutBtn.addEventListener('click', function () {
      sessionStorage.removeItem('datum_auth_hint');
      localStorage.removeItem('datum_auth_hint');
      localStorage.removeItem('datum_sketch_overlay_seen');
      localStorage.removeItem('datum_studio_overlay_seen');

      function _finishSignOut() {
        if (window.Clerk && typeof Clerk.signOut === 'function') {
          Clerk.signOut().then(function () { window.location.replace('/index.html'); });
        } else {
          window.location.replace('/index.html');
        }
      }

      // P7 — LOCAL-ONLY carried-plan wipe so the next user on this browser cannot
      // see the prior user's plan. DatumPurge owns the single-source key list and
      // does NOT touch the Clerk cloud blob (their plans return on next sign-in).
      // The module isn't loaded on every page (only erase pages declare it), so
      // ensure it first, then wipe, then sign out — guarded so we never hang.
      function _wipeThenSignOut() {
        try { if (window.DatumPurge && typeof window.DatumPurge.signOutWipe === 'function') window.DatumPurge.signOutWipe(); } catch (_e) {}
        _finishSignOut();
      }
      if (window.DatumPurge && typeof window.DatumPurge.signOutWipe === 'function') {
        _wipeThenSignOut();
      } else {
        var _ps = document.createElement('script');
        _ps.src = '/scripts/datum-archive-purge.js';
        var _done = false;
        function _once() { if (_done) return; _done = true; _wipeThenSignOut(); }
        _ps.onload = _once;
        _ps.onerror = _once;
        setTimeout(_once, 1500);   // fallback: never block sign-out on a load miss
        document.head.appendChild(_ps);
      }
    });

    // Origin-aware Save -> the page's own hook (window.studioSaveCurrent /
    // sketchSaveCurrent). P1/P2: today's save behavior; P3 swaps the hook internals.
    var _saveBtn = topbarEl.querySelector('[data-acct-action="save-current"]');
    if (_saveBtn) _saveBtn.addEventListener('click', function () {
      var a = getActiveTab();
      if (a === 'studio' && typeof window.studioSaveCurrent === 'function') window.studioSaveCurrent(_saveBtn);
      else if (a === 'sketch' && typeof window.sketchSaveCurrent === 'function') window.sketchSaveCurrent(_saveBtn);
    });

    // Studio view-toggles -> window.setViewMode + local active state. Self-contained
    // (own active class) so it never collides with the hidden #app-nav toggle ids.
    topbarEl.querySelectorAll('[data-acct-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof window.setViewMode === 'function') window.setViewMode(b.getAttribute('data-acct-view'));
        topbarEl.querySelectorAll('[data-acct-view]').forEach(function (x) {
          x.classList.toggle('acct-view-active', x === b);
        });
      });
    });

    if (onAccountPage) {
      window.addEventListener('hashchange', function () { syncActive(topbarEl); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
