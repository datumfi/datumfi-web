// Session token (UUID v4 in localStorage)
(function() {
  if (!localStorage.getItem('datumfi_session_id')) {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    a[6] = (a[6] & 0x0f) | 0x40;
    a[8] = (a[8] & 0x3f) | 0x80;
    var hex = Array.from(a).map(function(b) { return b.toString(16).padStart(2,'0'); });
    localStorage.setItem('datumfi_session_id', [hex.slice(0,4).join(''),hex.slice(4,6).join(''),hex.slice(6,8).join(''),hex.slice(8,10).join(''),hex.slice(10,16).join('')].join('-'));
  }
})();

// Delete My Data modal (3A — GDPR/CCPA Art. 17)
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var modal = document.createElement('div');
    modal.id = 'delete-data-modal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(5,10,20,0.92);align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(93,202,165,0.2);border-radius:8px;padding:40px;max-width:480px;width:90%;font-family:\'DM Mono\',monospace;">'
      + '<div style="font-size:13px;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,255,255,0.8);margin-bottom:20px;">Delete My Data</div>'
      + '<p style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:24px;">This clears all locally stored session data from this browser — inputs, session token, and preferences. DATUM FI stores nothing server-side. Download a copy first, or delete directly.</p>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;">'
      + '<button onclick="downloadAndDelete()" style="background:transparent;border:1px solid rgba(93,202,165,0.4);color:rgba(93,202,165,0.8);font-family:\'DM Mono\',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;padding:10px 20px;border-radius:4px;cursor:pointer;">Download &amp; Delete</button>'
      + '<button onclick="deleteDataOnly()" style="background:transparent;border:1px solid rgba(226,75,74,0.4);color:rgba(226,75,74,0.8);font-family:\'DM Mono\',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;padding:10px 20px;border-radius:4px;cursor:pointer;">Delete Only</button>'
      + '<button onclick="document.getElementById(\'delete-data-modal\').style.display=\'none\'" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);font-family:\'DM Mono\',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancel</button>'
      + '</div></div>';
    document.body.appendChild(modal);
  });

  window.openDeleteDataModal = function() {
    var m = document.getElementById('delete-data-modal');
    if (m) m.style.display = 'flex';
  };

  window.downloadAndDelete = function() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i); if (k) data['ls_' + k] = localStorage.getItem(k);
    }
    for (var j = 0; j < sessionStorage.length; j++) {
      var sk = sessionStorage.key(j); if (sk) data['ss_' + sk] = sessionStorage.getItem(sk);
    }
    var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'datumfi-my-data.json'; a.click();
    setTimeout(window.deleteDataOnly, 600);
  };

  window.deleteDataOnly = function() {
    if (!confirm('Delete all locally stored data from this browser?\n\nThis will remove your saved Sketches and cannot be undone.')) return;
    localStorage.clear(); sessionStorage.clear();
    var m = document.getElementById('delete-data-modal');
    if (m) m.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(93,202,165,0.2);border-radius:8px;padding:40px;max-width:480px;width:90%;font-family:\'DM Mono\',monospace;text-align:center;">'
      + '<div style="color:rgba(93,202,165,0.8);font-size:13px;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;">Data cleared.</div>'
      + '<p style="font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;margin-bottom:24px;">All local session data has been removed from this browser.</p>'
      + '<a href="/" style="color:rgba(93,202,165,0.7);font-family:\'DM Mono\',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;">Return to Origin →</a></div>';
  };
})();

// Cookie / storage consent banner (ePrivacy)
(function() {
  if (!localStorage.getItem('datum_privacy_ok')) {
    document.addEventListener('DOMContentLoaded', function() {
      var banner = document.createElement('div');
      banner.id = 'privacy-banner';
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(9,18,33,0.97);border-top:1px solid rgba(255,255,255,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;font-family:"DM Mono",monospace;font-size:10px;color:rgba(255,255,255,0.5);';
      banner.innerHTML = '<span>We use session storage to remember your Sketch inputs during your visit. No tracking cookies. No ads. <a href="/privacy.html" style="color:rgba(93,202,165,0.7);text-decoration:none;">Learn more</a></span><button onclick="document.getElementById(\'privacy-banner\').remove();localStorage.setItem(\'datum_privacy_ok\',\'1\')" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);font-family:\'DM Mono\',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;padding:6px 14px;border-radius:3px;cursor:pointer;white-space:nowrap;flex-shrink:0;">Got it</button>';
      document.body.appendChild(banner);
    });
  }
})();

// Shared navigation: hamburger + Range visibility
(function() {
  function toggleMobileNav() {
    var menu = document.getElementById('nav-mobile-menu');
    if (menu) menu.classList.toggle('open');
  }
  function closeMobileNav() {
    var menu = document.getElementById('nav-mobile-menu');
    if (menu) menu.classList.remove('open');
  }

  // Expose globally for onclick attributes
  window.toggleMobileNav = window.toggleMobileNav || toggleMobileNav;
  window.closeMobileNav  = window.closeMobileNav  || closeMobileNav;

  // Close mobile menu on outside click
  document.addEventListener('click', function(e) {
    var nav  = document.getElementById('app-nav');
    var menu = document.getElementById('nav-mobile-menu');
    if (menu && menu.classList.contains('open') && nav && !nav.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Show Range nav link if session flag is set
  document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('datum_range_revealed')) {
      var rl  = document.getElementById('nav-range-link');
      var mob = document.getElementById('nav-mob-range');
      if (rl)  rl.style.display  = '';
      if (mob) mob.style.display = '';
    }

    // Session-bound nav (F21 · Doctrine #11): when authenticated, inject 7-tab account
    // topbar and suppress the anonymous nav. datum_auth_hint is a UI-only sessionStorage
    // flag set by vault.html / account-shell pages after Clerk confirms a valid session.
    // Not a security gate. Cleared on sign-out by account-topbar.js F4 handler.
    if (sessionStorage.getItem('datum_auth_hint')) {
      // Account-shell pages already declare account-topbar.js via <script defer> in source.
      // Detect the tag to skip re-injection and avoid double-load.
      if (!document.querySelector('script[src*="account-topbar.js"]')) {
        var appNav = document.getElementById('app-nav');
        if (appNav) appNav.style.display = 'none';
        var _atScript = document.createElement('script');
        _atScript.src = '/scripts/account-topbar.js';
        document.head.appendChild(_atScript);
      }
    }
  });
})();

// Analytics — PostHog EU hosting (Priority 4)
(function() {
  // ds_session_id (per-visit UUID, sessionStorage)
  if (!sessionStorage.getItem('ds_session_id')) {
    var sa = new Uint8Array(16); crypto.getRandomValues(sa);
    sa[6] = (sa[6] & 0x0f) | 0x40; sa[8] = (sa[8] & 0x3f) | 0x80;
    var sh = Array.from(sa).map(function(b){ return b.toString(16).padStart(2,'0'); });
    sessionStorage.setItem('ds_session_id', [sh.slice(0,4).join(''),sh.slice(4,6).join(''),sh.slice(6,8).join(''),sh.slice(8,10).join(''),sh.slice(10,16).join('')].join('-'));
  }
  // ds_anon_id (cross-session cohort UUID, localStorage)
  if (!localStorage.getItem('ds_anon_id')) {
    var la = new Uint8Array(16); crypto.getRandomValues(la);
    la[6] = (la[6] & 0x0f) | 0x40; la[8] = (la[8] & 0x3f) | 0x80;
    var lh = Array.from(la).map(function(b){ return b.toString(16).padStart(2,'0'); });
    localStorage.setItem('ds_anon_id', [lh.slice(0,4).join(''),lh.slice(4,6).join(''),lh.slice(6,8).join(''),lh.slice(8,10).join(''),lh.slice(10,16).join('')].join('-'));
  }

  // Capture UTM params on landing
  (function() {
    var params = new URLSearchParams(window.location.search);
    var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
    if (utmKeys.some(function(k) { return params.has(k); })) {
      var utms = {};
      utmKeys.forEach(function(k) { if (params.has(k)) utms[k] = params.get(k); });
      sessionStorage.setItem('ds_utm', JSON.stringify(utms));
    }
  })();

  // TODO: Replace 'POSTHOG_API_KEY' with your live EU project API key before launch
  var POSTHOG_KEY = 'POSTHOG_API_KEY';
  if (POSTHOG_KEY !== 'POSTHOG_API_KEY') {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init(POSTHOG_KEY, { api_host: 'https://eu.i.posthog.com', person_profiles: 'identified_only', capture_pageview: false });
  }

  window.dfTrack = function(event, props) {
    try {
      var base = { ds_session_id: sessionStorage.getItem('ds_session_id'), ds_anon_id: localStorage.getItem('ds_anon_id'), page: window.location.pathname };
      var utm = sessionStorage.getItem('ds_utm');
      if (utm) { try { Object.assign(base, JSON.parse(utm)); } catch(e) {} }
      var payload = Object.assign(base, props || {});
      if (window.posthog && typeof posthog.capture === 'function') posthog.capture(event, payload);
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.debug('[dfTrack]', event, payload);
    } catch(e) {}
  };

  document.addEventListener('DOMContentLoaded', function() { window.dfTrack('page_view'); });
})();
