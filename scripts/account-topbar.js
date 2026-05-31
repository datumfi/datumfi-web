// Datum FI — Shared Account Topbar Component (Pattern C · JS injection)
// Loaded by: /my-account.html (always)
//            /sketchbook.html?context=account (R3.5.5b)
//            /blueprints.html?context=account (R3.5.5c)
// Does NOT contain a Clerk gate — loading decision is per-page.
(function () {
  'use strict';

  var path    = window.location.pathname;
  var params  = new URLSearchParams(window.location.search);
  var onAccountPage = /\/my-account(\.html)?($|\?)/.test(path);

  function getActiveTab() {
    if (/\/sketchbook(\.html)?($|\?)/.test(path)) return 'sketches';
    if (/\/blueprints(\.html)?($|\?)/.test(path)) return 'blueprints';
    // On /my-account.html — derive from hash
    var hash = window.location.hash.replace('#', '');
    if (hash === 'blueprints') return 'blueprints';
    return 'profile';
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
      + '.acct-wordmark{'
      + '  font-family:"Fraunces",Georgia,serif;font-size:24px;'
      + '  letter-spacing:.18em;line-height:1;'
      + '  color:rgba(255,255,255,.92);font-weight:400;'
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
      + '.acct-tab.away{color:rgba(255,255,255,.26);}'
      + '.acct-tab.away:hover{color:rgba(255,255,255,.58);}'
      + '.acct-divider{'
      + '  width:1px;height:24px;background:rgba(255,255,255,.12);'
      + '  margin:0 8px;flex-shrink:0;'
      + '}'
      + '.acct-topbar-right{'
      + '  flex-shrink:0;min-width:80px;display:flex;'
      + '  align-items:center;justify-content:flex-end;'
      + '}'
      + '@media(max-width:720px){'
      + '  .acct-topbar-nav{display:none;}'
      + '  .acct-wordmark{font-size:20px;}'
      + '}';
    document.head.appendChild(style);
  }

  var LOGO_SVG = '<svg class="acct-logo" viewBox="0 0 64 64" aria-hidden="true">'
    + '<path d="M12 10h20.5C44.6 10 54 19.2 54 31.8S44.6 54 32.5 54H12V10Z"'
    + ' fill="none" stroke="#1D9E75" stroke-width="6" stroke-linejoin="round"/>'
    + '<path d="M13 20h28M13 32h31M13 44h24"'
    + ' stroke="#5DCAA5" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M12 10 25 10 12 23Z" fill="#091221"/>'
    + '</svg>';

  function makeTab(target, label, active) {
    var cls = 'acct-tab' + (active === target ? ' active' : '');
    return '<button type="button" class="' + cls + '" data-acct-tab="' + target + '">'
      + label + '</button>';
  }

  function makeAwayLink(href, label) {
    return '<a href="' + href + '" class="acct-tab away">' + label + '</a>';
  }

  function buildHTML(active) {
    return '<header id="acct-topbar" role="banner">'
      + '<a href="/my-account.html" class="acct-brand" aria-label="Datum FI — My Account">'
      + LOGO_SVG
      + '<span class="acct-wordmark">DATUM FI</span>'
      + '</a>'
      + '<nav class="acct-topbar-nav" aria-label="Account navigation">'
      +   '<div class="acct-cluster">'
      +     makeTab('sketches',  'Sketches',  active)
      +     makeTab('blueprints','Blueprints', active)
      +   '</div>'
      +   '<div class="acct-divider" aria-hidden="true"></div>'
      +   '<div class="acct-cluster">'
      +     makeAwayLink('/sketch.html',          'Sketch')
      +     makeAwayLink('/studio-showcase.html',  'Studio')
      +     makeAwayLink('/why-a-range.html',      'Shape')
      +   '</div>'
      +   '<div class="acct-divider" aria-hidden="true"></div>'
      +   '<div class="acct-cluster">'
      +     makeTab('profile', 'My Profile', active)
      +   '</div>'
      + '</nav>'
      + '<div class="acct-topbar-right"></div>'
      + '</header>';
  }

  function handleTabClick(tabId) {
    switch (tabId) {
      case 'sketches':
        window.location.href = '/sketchbook.html?context=account';
        break;
      case 'blueprints':
        if (onAccountPage) {
          window.location.hash = '#blueprints';
        } else {
          window.location.href = '/blueprints.html?context=account';
        }
        break;
      case 'profile':
        if (onAccountPage) {
          window.location.hash = '#profile';
        } else {
          window.location.href = '/my-account.html#profile';
        }
        break;
    }
  }

  function syncActive(topbarEl) {
    var active = getActiveTab();
    topbarEl.querySelectorAll('[data-acct-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-acct-tab') === active);
    });
  }

  function mount() {
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
