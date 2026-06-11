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

  function buildHTML(active) {
    return '<header id="acct-topbar" role="banner">'
      + '<a href="/index.html" class="acct-brand" aria-label="Datum FI — Home">'
      + '<img class="acct-logo" src="/brand/datumfi-mark-d.svg" alt="" aria-hidden="true">'
      + '<img class="acct-wordmark-img" src="/brand/datumfi-wordmark-atum-fi.svg" alt="DATUM FI">'
      + '</a>'
      + '<nav class="acct-topbar-nav" aria-label="Account navigation">'
      +   '<div class="acct-cluster">'
      +     makeTab('welcome',      'Home',         active)
      +     makeTab('profile',      'My Profile',   active)
      +   '</div>'
      +   '<div class="acct-divider" aria-hidden="true"></div>'
      +   '<div class="acct-cluster">'
      +     makeTab('sketches',     'My Sketches',  active)
      +     makeTab('myblueprints', 'My Blueprints', active)
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
      + '</div>'
      + '</header>';
  }

  function handleTabClick(tabId) {
    switch (tabId) {
      case 'welcome':      window.location.href = '/my-account.html';  break;
      case 'profile':      window.location.href = '/Dossier.html';     break;
      case 'sketches':     window.location.href = '/sketchbook.html';  break;
      case 'myblueprints': window.location.href = '/Blueprint.html';   break;
      case 'sketch':       window.location.href = '/sketch.html';      break;
      case 'studio':       window.location.href = '/studio.html';      break;
      case 'shape':        window.location.href = '/why-a-range.html'; break;
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
      if (window.Clerk && typeof Clerk.signOut === 'function') {
        Clerk.signOut().then(function () { window.location.replace('/index.html'); });
      } else {
        window.location.replace('/index.html');
      }
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
