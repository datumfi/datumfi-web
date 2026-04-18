(function () {
  // Guard: index.html already has its own feedback panel wired up
  if (document.getElementById('feedback-panel')) return;

  // ── Inject CSS ──────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#feedback-backdrop{position:fixed;inset:0;z-index:699;background:rgba(9,18,33,0.65);opacity:0;pointer-events:none;transition:opacity 0.3s ease;}',
    '#feedback-backdrop.open{opacity:1;pointer-events:auto;}',
    '.feedback-panel{position:fixed;top:0;right:0;bottom:0;width:500px;max-width:100vw;background:var(--bg-navy);border-left:1px solid rgba(255,255,255,0.08);z-index:700;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;}',
    '.feedback-panel.open{transform:translateX(0);}',
    '.fp-header{padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.06);position:relative;background:rgba(255,255,255,0.015);flex-shrink:0;}',
    '.fp-title{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:26px;color:var(--white);margin-bottom:6px;}',
    '.fp-sub{font-size:11px;color:rgba(255,255,255,0.4);line-height:1.5;}',
    '.fp-close{position:absolute;top:18px;right:18px;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:rgba(255,255,255,0.25);padding:4px 8px;transition:color 0.2s;}',
    '.fp-close:hover{color:var(--white);}',
    '.fp-body{padding:24px 28px 40px;flex:1;}',
    '.fp-q{margin-bottom:28px;}',
    '.fp-q-label{font-family:var(--font-mono);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:var(--teal-mid);margin-bottom:12px;display:block;}',
    '.fp-scale-row{display:flex;gap:6px;}',
    '.fp-scale-item{flex:1;}',
    '.fp-scale-item input[type="radio"]{display:none;}',
    '.fp-scale-item label{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px;border:1px solid rgba(255,255,255,0.08);border-radius:4px;cursor:pointer;transition:all 0.2s;}',
    '.fp-scale-item label:hover{border-color:rgba(29,158,117,0.35);}',
    '.fp-scale-item input[type="radio"]:checked + label{border-color:var(--teal);background:rgba(29,158,117,0.1);}',
    '.fp-scale-num{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:20px;color:rgba(255,255,255,0.4);transition:color 0.2s;}',
    '.fp-scale-item input[type="radio"]:checked + label .fp-scale-num{color:var(--teal-mid);}',
    '.fp-scale-lbl{font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.25);text-align:center;line-height:1.3;transition:color 0.2s;}',
    '.fp-scale-item input[type="radio"]:checked + label .fp-scale-lbl{color:rgba(93,202,165,0.7);}',
    '.fp-check-list{display:flex;flex-direction:column;gap:6px;}',
    '.fp-check-item{display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 12px;border:1px solid rgba(255,255,255,0.06);border-radius:4px;transition:border-color 0.2s;font-family:var(--font-mono);font-size:12px;color:rgba(255,255,255,0.65);}',
    '.fp-check-item:hover{border-color:rgba(29,158,117,0.35);}',
    '.fp-check-item input[type="checkbox"]{display:none;}',
    '.fp-check-box{width:14px;height:14px;border:1px solid rgba(255,255,255,0.2);border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;font-size:9px;color:var(--bg-navy);}',
    '.fp-check-item input[type="checkbox"]:checked ~ .fp-check-box{background:var(--teal);border-color:var(--teal);}',
    '.fp-check-item input[type="checkbox"]:checked ~ .fp-check-box::after{content:"✓";}',
    '.fp-check-other-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(255,255,255,0.06);border-radius:4px;}',
    '.fp-check-other-input{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.15);color:var(--white);font-family:var(--font-mono);font-size:12px;outline:none;flex:1;padding:2px 0;transition:border-color 0.2s;}',
    '.fp-check-other-input:focus{border-bottom-color:var(--teal-mid);}',
    '.fp-text-input{width:100%;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:var(--white);font-family:var(--font-mono);font-size:13px;padding:10px 14px;outline:none;transition:border-color 0.2s;}',
    '.fp-text-input:focus{border-color:var(--teal-mid);}',
    '.fp-choice-group{display:flex;flex-direction:column;gap:7px;}',
    '.fp-choice-item{display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px 14px;border:1px solid rgba(255,255,255,0.08);border-radius:4px;transition:all 0.2s;font-family:var(--font-mono);font-size:12px;color:rgba(255,255,255,0.65);}',
    '.fp-choice-item:hover{border-color:rgba(29,158,117,0.35);}',
    '.fp-choice-item input[type="radio"]{display:none;}',
    '.fp-choice-dot{width:14px;height:14px;border:1px solid rgba(255,255,255,0.25);border-radius:50%;flex-shrink:0;transition:all 0.2s;}',
    '.fp-choice-item input[type="radio"]:checked ~ .fp-choice-dot{border-color:var(--teal);background:var(--teal);box-shadow:inset 0 0 0 3px var(--bg-navy);}',
    '.fp-choice-item input[type="radio"]:checked ~ .fp-choice-text{color:var(--white);}',
    '#fp-thank-you{display:none;text-align:center;padding:60px 20px;}',
    '.fp-ty-mark{font-family:var(--font-serif);font-style:italic;font-size:40px;color:var(--teal);margin-bottom:20px;}',
    '.fp-ty-title{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:22px;color:var(--white);margin-bottom:10px;}',
    '.fp-ty-sub{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6;}',
    '.fp-submit-btn{width:100%;margin-top:8px;background:var(--teal);color:var(--bg-navy);border:none;font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:0.15em;padding:14px;border-radius:4px;cursor:pointer;transition:background 0.2s;}',
    '.fp-submit-btn:hover{background:var(--teal-mid);}'
  ].join('');
  document.head.appendChild(style);

  // ── Inject HTML ─────────────────────────────────────────────────────────
  function inject() {
    if (document.getElementById('feedback-panel')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="feedback-backdrop" onclick="closeFeedback()"></div>' +
      '<div id="feedback-panel" class="feedback-panel">' +
        '<div class="fp-header">' +
          '<div class="fp-title">Share Your Feedback</div>' +
          '<div class="fp-sub">Takes 30 seconds. Your input shapes what we build next.</div>' +
          '<button class="fp-close" onclick="closeFeedback()">\u00d7</button>' +
        '</div>' +
        '<div class="fp-body">' +
          '<div id="feedback-form-wrap">' +
            '<form id="feedback-form" onsubmit="submitFeedback(event)">' +
              '<input type="hidden" name="access_key" value="0e411fb0-cdcb-45b6-9f4e-39178aafb171">' +
              '<input type="hidden" name="subject" value="DATUM FI Feedback Received">' +
              '<input type="hidden" name="from_name" value="DATUM FI Feedback">' +
              '<div class="fp-q"><span class="fp-q-label">How clear was your Range result?</span><div class="fp-scale-row"><div class="fp-scale-item"><input type="radio" name="q1_clarity" id="fq1_1" value="1"><label for="fq1_1"><span class="fp-scale-num">1</span><span class="fp-scale-lbl">Not clear at all</span></label></div><div class="fp-scale-item"><input type="radio" name="q1_clarity" id="fq1_2" value="2"><label for="fq1_2"><span class="fp-scale-num">2</span><span class="fp-scale-lbl">Slightly clear</span></label></div><div class="fp-scale-item"><input type="radio" name="q1_clarity" id="fq1_3" value="3"><label for="fq1_3"><span class="fp-scale-num">3</span><span class="fp-scale-lbl">Somewhat clear</span></label></div><div class="fp-scale-item"><input type="radio" name="q1_clarity" id="fq1_4" value="4"><label for="fq1_4"><span class="fp-scale-num">4</span><span class="fp-scale-lbl">Very clear</span></label></div><div class="fp-scale-item"><input type="radio" name="q1_clarity" id="fq1_5" value="5"><label for="fq1_5"><span class="fp-scale-num">5</span><span class="fp-scale-lbl">Extremely clear</span></label></div></div></div>' +
              '<div class="fp-q"><span class="fp-q-label">What was the most useful part? <span style="color:rgba(255,255,255,0.2);font-size:9px;text-transform:none;letter-spacing:0;">(check all that apply)</span></span><div class="fp-check-list"><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="range_viz"><span class="fp-check-box"></span><span>The Range visualization (ceiling / floor / datum)</span></label><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="fragility"><span class="fp-check-box"></span><span>Fragility insights (what moves your range)</span></label><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="blueprint"><span class="fp-check-box"></span><span>The Estate Blueprint (account input method)</span></label><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="outlook"><span class="fp-check-box"></span><span>Market Outlook selection</span></label><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="ss_insights"><span class="fp-check-box"></span><span>Social Security insights</span></label><label class="fp-check-item"><input type="checkbox" name="q2_useful" value="show_math"><span class="fp-check-box"></span><span>Show Math (model details)</span></label><div class="fp-check-other-row"><label class="fp-check-item" style="border:none;padding:0;margin:0;flex-shrink:0;"><input type="checkbox" name="q2_useful" value="other"><span class="fp-check-box"></span><span style="white-space:nowrap;">Other:</span></label><input type="text" name="q2_other" class="fp-check-other-input" placeholder="Describe\u2026" maxlength="100"></div></div></div>' +
              '<div class="fp-q"><span class="fp-q-label">What was confusing or frustrating? <span style="color:rgba(255,255,255,0.2);font-size:9px;text-transform:none;letter-spacing:0;">(optional)</span></span><input type="text" name="q3_confusing" class="fp-text-input" placeholder="Anything unclear or difficult?" maxlength="200"></div>' +
              '<div class="fp-q"><span class="fp-q-label">What\'s missing that you wish was here? <span style="color:rgba(255,255,255,0.2);font-size:9px;text-transform:none;letter-spacing:0;">(optional)</span></span><input type="text" name="q4_missing" class="fp-text-input" placeholder="Features, data, or explanations you\'d want" maxlength="200"></div>' +
              '<div class="fp-q"><span class="fp-q-label">How likely are you to recommend DATUM FI to someone planning for retirement?</span><div class="fp-scale-row"><div class="fp-scale-item"><input type="radio" name="q5_recommend" id="fq5_1" value="1"><label for="fq5_1"><span class="fp-scale-num">1</span><span class="fp-scale-lbl">Not at all likely</span></label></div><div class="fp-scale-item"><input type="radio" name="q5_recommend" id="fq5_2" value="2"><label for="fq5_2"><span class="fp-scale-num">2</span><span class="fp-scale-lbl">Unlikely</span></label></div><div class="fp-scale-item"><input type="radio" name="q5_recommend" id="fq5_3" value="3"><label for="fq5_3"><span class="fp-scale-num">3</span><span class="fp-scale-lbl">Neutral</span></label></div><div class="fp-scale-item"><input type="radio" name="q5_recommend" id="fq5_4" value="4"><label for="fq5_4"><span class="fp-scale-num">4</span><span class="fp-scale-lbl">Likely</span></label></div><div class="fp-scale-item"><input type="radio" name="q5_recommend" id="fq5_5" value="5"><label for="fq5_5"><span class="fp-scale-num">5</span><span class="fp-scale-lbl">Extremely likely</span></label></div></div></div>' +
              '<div class="fp-q"><span class="fp-q-label">Would you use this with your real financial data?</span><div class="fp-choice-group"><label class="fp-choice-item"><input type="radio" name="q6_real_data" value="yes_did"><span class="fp-choice-dot"></span><span class="fp-choice-text">Yes \u2014 I already did</span></label><label class="fp-choice-item"><input type="radio" name="q6_real_data" value="yes_would"><span class="fp-choice-dot"></span><span class="fp-choice-text">Yes \u2014 I would</span></label><label class="fp-choice-item"><input type="radio" name="q6_real_data" value="not_yet"><span class="fp-choice-dot"></span><span class="fp-choice-text">Not yet \u2014 I need more confidence first</span></label></div></div>' +
              '<div class="h-captcha" data-captcha="true" data-theme="dark" data-size="compact" style="margin-bottom:12px;"></div>' +
              '<button type="submit" class="fp-submit-btn">Send Feedback</button>' +
            '</form>' +
          '</div>' +
          '<div id="fp-thank-you"><div class="fp-ty-mark">\u2726</div><div class="fp-ty-title">Thank you.</div><div class="fp-ty-sub">Your feedback helps us build better.</div></div>' +
        '</div>' +
      '</div>'
    );

    // Load web3forms captcha if not already on the page
    if (!document.querySelector('script[src*="web3forms.com"]')) {
      var s = document.createElement('script');
      s.src = 'https://web3forms.com/client/script.js';
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // ── Functions ────────────────────────────────────────────────────────────
  window.openFeedback = window.openFeedback || function () {
    var wrap = document.getElementById('feedback-form-wrap');
    var ty   = document.getElementById('fp-thank-you');
    if (wrap) wrap.style.display = '';
    if (ty)   ty.style.display   = 'none';
    document.getElementById('feedback-panel').classList.add('open');
    document.getElementById('feedback-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeFeedback = window.closeFeedback || function () {
    document.getElementById('feedback-panel').classList.remove('open');
    document.getElementById('feedback-backdrop').classList.remove('open');
    document.body.style.overflow = '';
  };

  window.submitFeedback = window.submitFeedback || function (e) {
    e.preventDefault();
    var data = new FormData(document.getElementById('feedback-form'));
    var showThanks = function () {
      var wrap = document.getElementById('feedback-form-wrap');
      var ty   = document.getElementById('fp-thank-you');
      if (wrap) wrap.style.display = 'none';
      if (ty)   ty.style.display   = 'block';
      setTimeout(function () { window.closeFeedback(); }, 2200);
    };
    fetch('https://api.web3forms.com/submit', {
      method: 'POST', body: data, headers: { 'Accept': 'application/json' }
    })
    .then(function (r) { return r.json(); })
    .then(showThanks)
    .catch(showThanks);
  };

})();
