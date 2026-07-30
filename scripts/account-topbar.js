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
      + '.acct-topbar-nav{'
      + '  flex:1;display:flex;align-items:center;'
      + '  justify-content:center;gap:4px;height:100%;'
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
      + '.acct-studio-toggle{display:flex;gap:3px;align-items:center;margin-left:18px;flex-shrink:0;}'
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
  function studioToggles(active) {
    if (active !== 'studio') return '';
    return '<div class="acct-studio-toggle" role="group" aria-label="Studio view">'
      + '<button type="button" class="view-btn" data-acct-view="draft" title="Drafting Focus">◼ Drafting</button>'
      + '<button type="button" class="view-btn acct-view-active" data-acct-view="split" title="Split View">◼◻ Split</button>'
      + '<button type="button" class="view-btn" data-acct-view="blueprint" title="Blueprint Focus">◼ Blueprint</button>'
      + '</div>';
  }

  /* Origin-aware Save — appears ONLY on its own editor page (studio -> Blueprint,
     sketch -> Sketch) and sits beside its archive tab (My Blueprints / My Sketches). */
  function saveAction(active) {
    if (active === 'studio') return '<button type="button" class="acct-action-btn acct-save" data-acct-action="save-current" title="Save to your Archive">⤓ Save</button>';
    if (active === 'sketch') return '<button type="button" class="acct-action-btn acct-save" data-acct-action="save-current" title="Save to your Sketchbook">⤓ Save</button>';
    return '';
  }

  function buildHTML(active) {
    return '<header id="acct-topbar" role="banner">'
      + '<a href="/index.html" class="acct-brand" aria-label="Datum FI — Home">'
      + '<img class="acct-logo" src="/brand/datumfi-mark-d.svg" alt="" aria-hidden="true">'
      + '<img class="acct-wordmark-img" src="/brand/datumfi-wordmark-atum-fi.svg" alt="DATUM FI">'
      + '</a>'
      + studioToggles(active)
      + '<nav class="acct-topbar-nav" aria-label="Account navigation">'
      +   '<div class="acct-cluster">'
      +     makeTab('welcome',      'Home',         active)
      +     makeTab('profile',      'My Profile',   active)
      +   '</div>'
      +   '<div class="acct-divider" aria-hidden="true"></div>'
      +   '<div class="acct-cluster">'
      +     makeTab('sketches',     'My Sketches',  active)
      +     (active === 'sketch' ? saveAction(active) : '')
      +     makeTab('myblueprints', 'My Blueprints', active)
      +     (active === 'studio' ? saveAction(active) : '')
      +   '</div>'
      +   '<div class="acct-divider" aria-hidden="true"></div>'
      +   '<div class="acct-cluster">'
      +     makeTab('sketch',  'Sketch',  active)
      +     makeTab('studio',  'Studio',  active)
      +     makeTab('shape',   'Shape',   active)
      +   '</div>'
      + '</nav>'
      + '<div class="acct-topbar-right">'
      +   '<button type="button" class="acct-action-btn acct-signout"'
      +   ' data-acct-action="signout" aria-label="Sign out of Datum FI">Sign Out</button>'
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
