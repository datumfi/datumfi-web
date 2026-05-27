/* SESSION 6.3: Login modal — wireframe only. Backend wiring deferred. */
(function () {
  var style = document.createElement('style');
  style.textContent = [
    '.nav-login-btn{font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:0.1em;',
    'color:var(--teal-mid);background:none;border:1px solid var(--teal-mid);border-radius:3px;',
    'cursor:pointer;padding:5px 10px;transition:all 0.2s;margin-left:8px;white-space:nowrap;}',
    '.nav-login-btn:hover{background:rgba(93,202,165,0.1);}',
    '.nav-mobile-login{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;',
    'letter-spacing:0.12em;color:var(--teal-mid);background:none;',
    'border:1px solid rgba(93,202,165,0.3);border-radius:3px;cursor:pointer;padding:11px 4px;',
    'text-align:left;transition:all 0.2s;display:block;width:100%;margin-top:4px;}',
    '.nav-mobile-login:hover{border-color:var(--teal-mid);background:rgba(93,202,165,0.06);}',
    '#login-modal{display:none;position:fixed;inset:0;z-index:2000;align-items:center;justify-content:center;}',
    '#login-modal.open{display:flex;}',
    '.login-overlay{position:absolute;inset:0;background:rgba(9,18,33,0.85);backdrop-filter:blur(6px);}',
    '.login-box{position:relative;z-index:1;background:#0e1c32;border:1px solid rgba(93,202,165,0.25);',
    'border-radius:8px;padding:48px 40px 40px;width:360px;max-width:90vw;',
    'box-shadow:0 24px 60px rgba(0,0,0,0.6);}',
    '.login-close{position:absolute;top:16px;right:20px;background:none;border:none;',
    'color:rgba(255,255,255,0.3);font-size:22px;cursor:pointer;line-height:1;transition:color 0.2s;}',
    '.login-close:hover{color:rgba(255,255,255,0.7);}',
    '.login-title{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:28px;',
    'color:#fff;margin:0 0 32px;}',
    '.login-field{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);',
    'border-radius:4px;padding:12px 14px;font-family:var(--font-mono);font-size:13px;',
    'color:#fff;outline:none;box-sizing:border-box;margin-bottom:12px;transition:border-color 0.2s;}',
    '.login-field:focus{border-color:rgba(93,202,165,0.5);}',
    '.login-field::placeholder{color:rgba(255,255,255,0.25);}',
    '.login-sign-in{width:100%;padding:14px;background:var(--teal-mid);color:#091221;',
    'font-family:var(--font-mono);font-size:12px;font-weight:bold;text-transform:uppercase;',
    'letter-spacing:0.15em;border:none;border-radius:4px;cursor:pointer;margin-top:4px;transition:background 0.2s;}',
    '.login-sign-in:hover{background:#4fc49a;}',
    '.login-divider{display:flex;align-items:center;gap:12px;margin:20px 0;',
    'font-family:var(--font-mono);font-size:10px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;}',
    '.login-divider::before,.login-divider::after{content:"";flex:1;height:1px;background:rgba(255,255,255,0.08);}',
    '.login-create{display:block;text-align:center;font-family:var(--font-mono);font-size:11px;',
    'color:rgba(255,255,255,0.45);text-decoration:none;margin-bottom:12px;transition:color 0.2s;cursor:pointer;}',
    '.login-create:hover{color:var(--gold);}',
    '.login-guest{width:100%;padding:11px;background:none;border:1px solid rgba(255,255,255,0.1);',
    'border-radius:4px;font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,0.35);',
    'letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;}',
    '.login-guest:hover{border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.6);}',
  ].join('');
  document.head.appendChild(style);

  var modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.innerHTML = [
    '<div class="login-overlay" onclick="closeLoginModal()"></div>',
    '<div class="login-box">',
    '  <button class="login-close" onclick="closeLoginModal()">×</button>',
    '  <div class="login-title">Sign In</div>',
    '  <input class="login-field" type="email" placeholder="Email address" autocomplete="email">',
    '  <input class="login-field" type="password" placeholder="••••••••" autocomplete="current-password">',
    '  <button class="login-sign-in">Sign In</button>',
    '  <div class="login-divider">or</div>',
    '  <span class="login-create">Create Account</span>',
    '  <button class="login-guest" onclick="closeLoginModal()">Continue as guest</button>',
    '</div>',
  ].join('');
  document.body.appendChild(modal);
})();

function openLoginModal() {
  document.getElementById('login-modal').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
}
