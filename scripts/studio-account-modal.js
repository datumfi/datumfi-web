/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   THE ACCOUNT MODAL — the back of every room's card, and the factory that writes its handlers.

   ⭐ THE FIFTH studioSource PART, and STEP 3 · MOVE 1a of the studio.html split (2026-08-22).
   191,633 bytes / 1,575 lines: 11.19% of studio.html in ONE function, with 22 callers. Registered
   in scripts/_studio_source.cjs's PARTS[] so the 23 source-reading gates still resolve it, and
   tagged in studio.html's <head> so the page actually loads it — REGISTRATION IS NOT WIRING, and
   the two are proven separately (§11.4).

   ── ⛔⛔ WHY STEP 3 IS "BY WEIGHT AND BY INDEPENDENCE", NOT "BY PHASE" ──────────────────────────
   §82.22's original cut line — graduate the seven phase sections into pages — was STRUCK after
   measurement: 613 of studio.html's 654 functions sit in ONE undirected connected component
   (98.1% of declared bytes), root-independently, and the phase-section cut moves 2.90% of the file.
   The code does not follow the user's map. This function does: it is the single heaviest object in
   the file and the most independent thing in it.

   ── ⭐ WHAT IT READS FROM THE PAGE, MEASURED, NOT ASSUMED ───────────────────────────────────────
   A free-variable census (eslint-scope, selftested against a fixture of known frees/non-frees) says
   this function has NO CLOSURE AT ALL. Its scope chain is `function -> global`, zero intermediate
   scopes, because studio.html's 1.17MB inline block is NOT an IIFE — it is plain script top-level.
     · 89 free names · 10 builtins · 3 already cross-file (DatumMath, hasEscrow, calculateTotalPmt)
     · 76 declared at that block's top level: 67 function · 6 var · 2 let · 1 const
     · exactly TWO writes outward: activeModalId (let) and _moatLumpWhatIf (var)
     · nothing leaks IN the other direction — one window assignment (its own), no recursion
   They resolve across the file boundary because top-level `function`/`var` become window
   properties and top-level `let`/`const` are GLOBAL LEXICAL bindings — both readable, and both
   WRITABLE, from a later classic script. Nothing here runs at parse time; every reference is
   resolved at click time, long after studio.html's block has executed.
   ⛔ RENAMING ANY OF THOSE 76 IN studio.html BREAKS THIS MODAL SILENTLY, AT CLICK TIME.
   scripts/_gate_account_modal_part.mjs asserts all 76 and both writes, and is what stands between
   that rename and a user.

   ── ⚠️ THIS FILE DELIBERATELY DOES NOT MATCH ITS FOUR SIBLINGS. DO NOT TIDY IT. ────────────────
   Both divergences are LOAD-BEARING and were ruled in (§82.39), not overlooked:
   1. THE ASSIGNMENT FORM IS KEPT — the builder stays a function expression assigned onto window,
      and is NOT converted to a plain top-level declaration the way studio-debt-cost.js and
      studio-upkeep.js are. Five gates (_gate_407_20_{2,3,4,5,9}) anchor on that exact literal.
      §9.2's "plain top-level functions" rule exists so gates can lift() the text; here the
      assignment form is what makes it liftable, so the rule is satisfied, not excepted.
      ⛔ THIS PARAGRAPH DELIBERATELY DOES NOT QUOTE THE ANCHOR. The first cut of this header did,
      and extractWindowFn matched the PROSE — 217 characters of comment instead of 191,633 bytes of
      builder. A comment that quotes code is indistinguishable from code to a text matcher. The
      extractor now requires a definition to START a line, and this sentence is why.
   2. THE ORIGINAL 4-SPACE INDENTATION IS KEPT, not dedented. Two of those five gates match
      12-space-indented literals inside their --redfirst mutations; a dedent silently disarms the
      controls while leaving them green. MEASURED: all five --redfirst legs still bite after 1a-pre.
   🔑 A MOVE THAT CHANGES BYTES IS NOT A MOVE. "Provably pure" is the only reason a 191KB commit is
   safe to make at all — a declaration-form conversion and a dedent are both TWEAKS, and this commit
   carries the move and nothing else. If sibling consistency is ever wanted it is its own commit,
   with its own gate churn, and its own red-first.

   ⚠️ HEAD-LOADED AND SYNCHRONOUS, like its four siblings. `defer` would work — nothing calls this
   at parse time — but that is a first-paint change riding along with a move, and it was refused for
   that reason, not because it is wrong. It is a separate, measurable question (there is still no
   first-paint instrument on this page at all).
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */

    window.openAccountModal = function(id) {
        activeModalId = id;
        const acc = state.accounts.find(a => a.id === id);
        if(!acc) return;
        // §20.1 — the lump what-if is EPHEMERAL (ruling #432). Cleared on every open so it can never carry
        // between accounts or survive a close: it is a question the user asked, not a fact about the loan.
        _moatLumpWhatIf = '';
        const base = getBaseType(acc.baseId);
        
        _diSetTitle(acc, base);   // §2 title hover for bank rooms; plain title otherwise

        let html = '';

        // W2/W6 — on "Begin Interior Decorating" the whole settings/education region collapses so the
        // holdings area is the SOLE focus. Everything appended below sits inside #modal-edu-collapse
        // (closed just before the holdings blocks); the account-name header is a separate element set by
        // _diSetTitle and survives. While decorating, the derive path (Σ price×shares) is the sole
        // acc.value writer — the Current Balance input rides inside the collapse (display:none, cannot fire).
        var _hideEdu = base.isInvestment && acc.showHoldings;
        html += '<div id="modal-edu-collapse"' + (_hideEdu ? ' style="display:none;"' : '') + '>';

        // §15 "Why …?" education panel at the TOP of the overview (above the toggles), inside the collapse
        // so it hides while decorating. Pure relocation of existing copy (LOCK-3) — previously appended at
        // the bottom after the decorate button. _diIraWhyPanel/_di457WhyPanel take only (acc, base).
        if (/ira/.test(base.id)) html += _diIraWhyPanel(acc, base);    // §15 "Why an IRA?" (IRA-only)
        if (/457b/.test(base.id)) html += _di457WhyPanel(acc, base);   // §15 "Why a 457(b)?" (both branches)
        if (/401k/.test(base.id) && !/rollover/.test(base.id)) html += _di401kWhyPanel(acc, base);  // §20 "Why a 401(k)?" + §16 bullets (both branches; NOT The Conduit — it gets the §16 rollover panel)
        if (/rollover/.test(base.id)) html += _diConduitWhyPanel(acc, base);   // §16 "Why a Rollover 401(k)?" (The Conduit; §15 SUPERSEDED — not wired)
        if (_isTaxableRoom(base.id)) html += _diTaxableWhyPanel(acc, base);   // §20 "Why a taxable brokerage?" (Living Room + Corporate/Other Taxable, same engine)

        // SURGICAL: Physics Toggles with explicit mathematical tooltips
        html += `
        <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
            <span class="toggle-label" style="color:var(--gold);">${base.taxCode === 'debt' ? 'Include this debt in my plan' : 'Include this account in my plan'}</span>
            <label class="switch">
              <input type="checkbox" ${!acc.exclude ? 'checked' : ''} onchange="updateAccToggle('${id}', 'exclude', !this.checked)">
              <span class="slider"></span>
            </label>
            <div class="modal-tt" style="top:100%; bottom:auto;">${/401k/.test(base.id) ? (base.taxCode === 'roth' ? `<strong>Counts toward everything.</strong>On: this Roth 401(k) is fully part of your plan — it shows up in your net worth, helps form your Shape, and your plan can draw from it in retirement. Turn it OFF to remove it completely — gone from your net worth, your Shape, and your spending, as if it isn't yours. Use OFF only for an account you track elsewhere or that genuinely isn't part of this picture.` : `<strong>Counts toward everything.</strong>On: this Traditional 401(k) is fully part of your plan — net worth, Shape, and your plan can draw from it in retirement (as taxable income). Turn it OFF to remove it completely.`) : (base.taxCode === 'debt' ? `<strong>Counts toward everything.</strong>On: this debt is fully part of your plan — it lowers your net worth and your plan accounts for paying it down. Turn it OFF to remove it completely, as if it isn't yours to carry. Use OFF only for a balance that genuinely isn't your responsibility in this picture — one someone else is servicing, or that you track elsewhere.` : `<strong>Counts toward everything.</strong>On: this account is fully part of your plan — it shows up in your net worth, helps form your Shape, and your plan can spend from it. Turn it OFF to remove it completely — gone from your net worth, your Shape, and your spending, as if it isn't yours. Use OFF for money that genuinely isn't part of this picture: an account you track elsewhere, or funds that belong to someone else.`)}</div>
        </div>`;

        if (base.taxCode === 'hsa') {
            // HSA-unique set-aside framing (default-ON at creation) — Copy Bank §5 verbatim
            html += `
        <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
            <span class="toggle-label" style="color:var(--teal-mid);">Earmarked for medical (set-aside)</span>
            <label class="switch">
              <input type="checkbox" ${acc.isFriction ? 'checked' : ''} onchange="updateAccToggle('${id}', 'isFriction', this.checked)">
              <span class="slider"></span>
            </label>
            <div class="modal-tt" style="top:100%; bottom:auto;"><strong>Medical Reserve</strong>Treat my HSA as a dedicated medical reserve — count it in net worth and the estate, but DON'T fund general retirement spending from it. Many planners hold the HSA as a sacred medical/LTC bucket.</div>
        </div>`;
        } else if (base.id === '529plan') {
            // 529-unique set-aside framing (default-ON at creation) — 529 Copy Bank §5 verbatim
            html += `
        <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
            <span class="toggle-label" style="color:var(--teal-mid);">Earmarked for education (set-aside)</span>
            <label class="switch">
              <input type="checkbox" ${acc.isFriction ? 'checked' : ''} onchange="updateAccToggle('${id}', 'isFriction', this.checked)">
              <span class="slider"></span>
            </label>
            <div class="modal-tt" style="top:100%; bottom:auto;"><strong>Education Reserve</strong>Treat my 529 as a dedicated education reserve — count it in net worth and the estate, but DON'T fund general retirement spending from it in the Shape.</div>
        </div>`;
        } else {
            html += `
        <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
            <span class="toggle-label" style="color:var(--teal-mid);">${base.taxCode === 'debt' ? "Count it, but don't model paying it off" : 'Count it, but never spend from it'}</span>
            <label class="switch">
              <input type="checkbox" ${acc.isFriction ? 'checked' : ''} onchange="updateAccToggle('${id}', 'isFriction', this.checked)">
              <span class="slider"></span>
            </label>
            <div class="modal-tt" style="top:100%; bottom:auto;">${/401k/.test(base.id) ? (base.taxCode === 'roth' ? `<strong>Held, not spent.</strong>On: this account stays in your net worth and keeps growing tax-free — but your plan will never pull from it to cover spending. For a Roth, this is a natural fit: it's often the account you WANT to touch last, leaving the most precious tax-free dollars to compound or pass to heirs. Use it for money you've earmarked to stay whole.` : `<strong>Held, not spent.</strong>On: this account stays in your net worth and keeps compounding tax-deferred — but your plan never pulls from it for spending. Because RMDs at 73 FORCE withdrawals, 'never spend' is only partly in your control here — the IRS eventually makes you draw it down. (The opposite of the Roth Treasury, where 'hold forever' truly works.)`) : (base.taxCode === 'debt' ? `<strong>Carried, not retired.</strong>On: this debt stays in your net worth and keeps accruing interest as it really would — but your plan won't model actively paying it down with free cash flow. It just rides along in the background. Use it for a balance you intend to carry on its normal schedule rather than attack early.` : `<strong>Held, not spent.</strong>On: this account stays in your net worth and keeps growing — but your plan will never pull from it to cover spending. It strengthens the picture without ever being drawn down. Use it for money you've earmarked for something else — a child's inheritance, a home you'll buy, a fund you've promised yourself stays whole.`)}</div>
        </div>`;
        }

        // §21-INPUTS · Taxable-facts sub-form (bank R462–R464) — F-BENEFICIARY / F-ALLOCATION / F-LOTMETHOD,
        // each with its §21 nudge inline (L48 _diBlankNudge). Plus N-LTCG (missing purchase dates) and the
        // tlhReviewed dismiss for N-TLH. All OPTIONAL / blank-safe (L47); display/education-only (LOCK-3).
        if (_isTaxableRoom(base.id)) {
            var _txs = _diSignals(acc);
            var _ben = acc.beneficiary || '', _alloc = (acc.targetAllocation != null ? acc.targetAllocation : ''), _lot = acc.lotMethod || '';
            var _hasNonCash = (_txs.invCount || 0) >= 1;
            html += `
        <div style="margin-top:16px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 18px;">
            <div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!=='block'; n.style.display=open?'block':'none'; this.classList.toggle('open', open);" style="color:var(--gold);">Taxable facts (optional) <span class="ira-why-caret">▸</span></div>
            <div style="display:none; margin-top:12px;">
                <div style="margin-bottom:12px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Beneficiary (Transfer-on-Death)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Beneficiary (Transfer-on-Death)</strong>Name who inherits this account. A brokerage account with a Transfer-on-Death (TOD) beneficiary passes straight to them and SKIPS PROBATE — it overrides your will for this account. One field now can spare your family a court process later.</div></div>
                        <input type="text" class="small-field" value="${String(_ben).replace(/"/g,'&quot;')}" placeholder="Who inherits this account?" oninput="updateAccField('${id}', 'beneficiary', this.value)"></div>
                    ${_diBlankNudge(!String(_ben).trim(), 'Name a beneficiary and this account skips probate — one field now saves your family a court later.')}
                </div>
                <div style="margin-bottom:12px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Target mix (% in stocks)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Target mix</strong>Set the target mix you WANT this account to hold — e.g. 80% stocks / 20% bonds. Once set, we’ll flag when your account drifts from it, so a good plan doesn’t quietly rot. Leave it blank and we won’t nag about drift.</div></div>
                        <input type="number" class="small-field" min="0" max="100" value="${String(_alloc).replace(/"/g,'&quot;')}" placeholder="e.g. 80" oninput="updateAccField('${id}', 'targetAllocation', this.value)"></div>
                    ${_diBlankNudge(_hasNonCash && !String(_alloc).trim(), 'Set a target mix and we’ll flag when your account drifts from it — so a good plan doesn’t quietly go stale.')}
                </div>
                <div style="margin-bottom:8px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Cost-basis method<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Cost-basis method</strong>Choose how we count which shares you sell first — FIFO (oldest first), specific-lot (you pick), or average cost. It changes the tax on every sale. Set it once and we’ll show the tax read on your sells; leave it blank and we’ll stay quiet.</div></div>
                        <select class="small-field" style="background: var(--bg-navy); width:100%;" onchange="updateAccField('${id}', 'lotMethod', this.value)"><option value="" ${!_lot ? 'selected' : ''}>— not set —</option><option value="fifo" ${_lot === 'fifo' ? 'selected' : ''}>FIFO (oldest first)</option><option value="specid" ${_lot === 'specid' ? 'selected' : ''}>Specific-lot (you pick)</option><option value="avgcost" ${_lot === 'avgcost' ? 'selected' : ''}>Average cost</option></select></div>
                    ${_diBlankNudge(!_lot, 'Pick a cost-basis method — FIFO or specific-lot — and we’ll show how to sell your winners while paying the least tax.')}
                </div>
                ${_diBlankNudge(_hasNonCash && _txs.anyMissingAcq, 'Add your purchase dates and we’ll flag which holdings have crossed the 1-year line into lower long-term tax rates.')}
                ${_txs.anyLoss ? `<div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom:0; margin-top:12px;"><span class="toggle-label" style="color:var(--muted);">I’ve reviewed tax-loss harvesting for this account</span><label class="switch"><input type="checkbox" ${acc.tlhReviewed ? 'checked' : ''} onchange="updateAccToggle('${id}', 'tlhReviewed', this.checked)"><span class="slider"></span></label><div class="modal-tt"><strong>Stops the reminder</strong>Flip this once you’ve considered harvesting a paper loss — it dismisses the tax-loss-harvesting nudge for this account.</div></div>` : ''}
            </div>
        </div>`;
        }

        // §21-INPUTS · 401(k) beneficiary + target-mix sub-form (bank R436/R437) — closes §21 to 6/6.
        // F-BENEFICIARY + F-ALLOCATION with inline N-BENEFICIARY/N-ALLOCATION nudges (L48 _diBlankNudge).
        // OPTIONAL / blank-safe (L47); display/education-only (LOCK-3). Excludes rollover (The Conduit = ③).
        if (/401k/.test(base.id) && !/rollover/.test(base.id)) {
            var _ks = _diSignals(acc);
            var _kben = acc.beneficiary || '', _kalloc = (acc.targetAllocation != null ? acc.targetAllocation : '');
            var _kNonCash = (_ks.invCount || 0) >= 1;
            html += `
        <div style="margin-top:16px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 18px;">
            <div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!=='block'; n.style.display=open?'block':'none'; this.classList.toggle('open', open);" style="color:var(--gold);">Beneficiary &amp; target mix (optional) <span class="ira-why-caret">▸</span></div>
            <div style="display:none; margin-top:12px;">
                <div style="margin-bottom:12px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Beneficiary<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Beneficiary</strong>Name the person (or people) who inherit this account. A named beneficiary passes straight to them and SKIPS PROBATE — it overrides your will for this account. One field now can save your family a court process later.</div></div>
                        <input type="text" class="small-field" value="${String(_kben).replace(/"/g,'&quot;')}" placeholder="Who inherits this account?" oninput="updateAccField('${id}', 'beneficiary', this.value)"></div>
                    ${_diBlankNudge(!String(_kben).trim(), 'Name a beneficiary and this account skips probate — one field now saves your family a court later.')}
                </div>
                <div style="margin-bottom:8px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Target mix (% in stocks)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Target mix</strong>Set the target mix you WANT this account to hold — e.g. 80% stocks / 20% bonds. Once set, we’ll tell you when your account has drifted away from it, so a good plan doesn’t quietly rot. Leave it blank and we won’t nag about drift.</div></div>
                        <input type="number" class="small-field" min="0" max="100" value="${String(_kalloc).replace(/"/g,'&quot;')}" placeholder="e.g. 80" oninput="updateAccField('${id}', 'targetAllocation', this.value)"></div>
                    ${_diBlankNudge(_kNonCash && !String(_kalloc).trim(), 'Set a target mix and we’ll tell you when your account drifts away from it — so a good plan doesn’t quietly go stale.')}
                </div>
            </div>
        </div>`;
        }

        // §21-INPUTS · IRA beneficiary + target-mix + (Traditional) workplace-coverage sub-form (bank
        // R302/R303/R306). F-BENEFICIARY + F-ALLOCATION + F-COVERED with inline N-BENEFICIARY / N-ALLOCATION /
        // N-DEDUCT nudges (L48 _diBlankNudge — no fork). OPTIONAL / blank-safe (L47); display/education-only
        // (LOCK-3). F-COVERED + N-DEDUCT are [T]/tradira ONLY (Roth deductibility is N/A). No new base, no
        // ACCOUNT_TYPE_MAP touch; beneficiary/targetAllocation reuse updateAccField, coveredByWorkPlan reuses updateAccToggle.
        if (/ira/.test(base.id)) {
            var _is = _diSignals(acc);
            var _iben = acc.beneficiary || '', _ialloc = (acc.targetAllocation != null ? acc.targetAllocation : '');
            var _iNonCash = (_is.invCount || 0) >= 1;
            var _iRothB = /^rothira/.test(base.id);   // Roth branch -> no F-COVERED / N-DEDUCT
            var _icov = !!acc.coveredByWorkPlan;
            html += `
        <div style="margin-top:16px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 18px;">
            <div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!=='block'; n.style.display=open?'block':'none'; this.classList.toggle('open', open);" style="color:var(--gold);">Beneficiary &amp; target mix (optional) <span class="ira-why-caret">▸</span></div>
            <div style="display:none; margin-top:12px;">
                <div style="margin-bottom:12px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Beneficiary<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Beneficiary</strong>Name who inherits this IRA. Your IRA beneficiary form is what actually controls where this money goes — it overrides your will and SKIPS PROBATE, passing straight to the people you name. It’s also what lets an heir stretch withdrawals over time instead of taking a lump sum. One field now can protect your family later.</div></div>
                        <input type="text" class="small-field" value="${String(_iben).replace(/"/g,'&quot;')}" placeholder="Who inherits this IRA?" oninput="updateAccField('${id}', 'beneficiary', this.value)"></div>
                    ${_diBlankNudge(!String(_iben).trim(), 'Name a beneficiary and this account skips probate — one field now saves your family a court later.')}
                </div>
                <div style="margin-bottom:${_iRothB ? '8' : '12'}px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Target mix (% in stocks)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Target mix</strong>Set the target mix you WANT this IRA to hold — e.g. 80% stocks / 20% bonds. Once set, we’ll flag when your account drifts from it, so a good plan doesn’t quietly rot. Leave it blank and we won’t nag about drift.</div></div>
                        <input type="number" class="small-field" min="0" max="100" value="${String(_ialloc).replace(/"/g,'&quot;')}" placeholder="e.g. 80" oninput="updateAccField('${id}', 'targetAllocation', this.value)"></div>
                    ${_diBlankNudge(_iNonCash && !String(_ialloc).trim(), 'Set a target mix and we’ll flag when your account drifts from it — so a good plan doesn’t quietly go stale.')}
                </div>${_iRothB ? '' : `
                <div style="margin-bottom:8px;">
                    <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom:0;"><span class="toggle-label" style="color:var(--muted);">Covered by a workplace plan this year</span><label class="switch"><input type="checkbox" ${_icov ? 'checked' : ''} onchange="updateAccToggle('${id}', 'coveredByWorkPlan', this.checked)"><span class="slider"></span></label><div class="modal-tt"><strong>Covered by a workplace plan</strong>Are you covered by a workplace retirement plan (401(k)/403(b)/457) this year? We use this to show whether your Traditional contribution is tax-deductible — full, partial, or none.</div></div>
                    ${_diBlankNudge(!_icov, 'Tell us if you’re covered by a workplace plan and we’ll show whether this Traditional contribution is tax-deductible this year.')}
                </div>`}
            </div>
        </div>`;
        }

        // §21-INPUTS · 457(b) beneficiary + target-mix sub-form (bank R285/R286). F-BENEFICIARY + F-ALLOCATION
        // with inline N-BENEFICIARY (R277) / N-ALLOCATION (R276) nudges (L48 _diBlankNudge — no fork). OPTIONAL /
        // blank-safe (L47); display/education-only (LOCK-3). No N-DEDUCT/F-COVERED (457 deductibility N/A); the
        // 6th bank nudge N-GOVVSNONGOV is input-blocked (no planFlavor input authored) — FLAGGED, not wired.
        if (/457b/.test(base.id)) {
            var _7s = _diSignals(acc);
            var _7ben = acc.beneficiary || '', _7alloc = (acc.targetAllocation != null ? acc.targetAllocation : '');
            var _7NonCash = (_7s.invCount || 0) >= 1;
            var _7flavor = acc.planFlavor || '';   // F-PLANFLAVOR (bank R288) — unset fires N-GOVVSNONGOV (R275)
            html += `
        <div style="margin-top:16px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 18px;">
            <div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!=='block'; n.style.display=open?'block':'none'; this.classList.toggle('open', open);" style="color:var(--gold);">Beneficiary &amp; target mix (optional) <span class="ira-why-caret">▸</span></div>
            <div style="display:none; margin-top:12px;">
                <div style="margin-bottom:12px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Beneficiary<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Beneficiary</strong>Name who inherits this account. A named beneficiary passes straight to them and SKIPS PROBATE — it overrides your will for this account. One field now can spare your family a court process later.</div></div>
                        <input type="text" class="small-field" value="${String(_7ben).replace(/"/g,'&quot;')}" placeholder="Who inherits this account?" oninput="updateAccField('${id}', 'beneficiary', this.value)"></div>
                    ${_diBlankNudge(!String(_7ben).trim(), 'Name a beneficiary and this account skips probate — one field now saves your family a court later.')}
                </div>
                <div style="margin-bottom:8px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Target mix (% in stocks)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Target mix</strong>Set the target mix you WANT this account to hold — e.g. 80% stocks / 20% bonds. Once set, we’ll flag when your account drifts from it, so a good plan doesn’t quietly rot. Leave it blank and we won’t nag about drift.</div></div>
                        <input type="number" class="small-field" min="0" max="100" value="${String(_7alloc).replace(/"/g,'&quot;')}" placeholder="e.g. 80" oninput="updateAccField('${id}', 'targetAllocation', this.value)"></div>
                    ${_diBlankNudge(_7NonCash && !String(_7alloc).trim(), 'Set a target mix and we’ll flag when your account drifts from it — so a good plan doesn’t quietly go stale.')}
                </div>
                <div style="margin-bottom:8px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Plan type<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Plan type</strong>Tell us if this is a GOVERNMENTAL or NON-GOVERNMENTAL 457(b) — the two are different animals at withdrawal. Governmental: held in trust, protected from your employer’s creditors, and rollable to an IRA/401(k) when you leave. Non-governmental: still your employer’s asset until paid out, exposed to their creditors, and can usually only roll to another non-gov 457(b). Pick one and we’ll tailor the rollover and bridge guidance to YOUR plan.</div></div>
                        <select class="small-field" style="background: var(--bg-navy); width:100%;" onchange="updateAccField('${id}', 'planFlavor', this.value)"><option value="" ${!_7flavor ? 'selected' : ''}>— not set —</option><option value="governmental" ${_7flavor === 'governmental' ? 'selected' : ''}>Governmental</option><option value="non-governmental" ${_7flavor === 'non-governmental' ? 'selected' : ''}>Non-governmental</option></select></div>
                    ${_diBlankNudge(!_7flavor, 'Tell us if this is a governmental or non-governmental 457(b) — it changes your rollover and creditor-protection rules, and we’ll tailor the guidance.')}
                </div>
            </div>
        </div>`;
        }

        if (base.taxCode === 'debt') {
             html += `
             <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
                 <span class="toggle-label" style="color:var(--danger);">Target for Accelerated Payoff</span>
                 <label class="switch">
                   <input type="checkbox" ${acc.isPriority ? 'checked' : ''} onchange="updateAccToggle('${id}', 'isPriority', this.checked)">
                   <span class="slider"></span>
                 </label>
                 <div class="modal-tt"><strong>Accelerated Payoff</strong>Marks this loan as a priority target. In Outflow Routing, spare cash flows here first — pulling in the payoff date and cutting the interest you'll pay. It's a guaranteed return equal to your rate; weigh it against investing that same cash.</div>
             </div>`;
             // §5.3 ACCELERATED-PAYOFF SOURCE — when priority is ON, pick the liquid account that funds the
             // faster payoff. Stored as acc.accelSourceId; the Outflow diagnostic reads it and names it.
             if (acc.isPriority) {
                 let srcOpts = `<option value="">All liquid cash (default)</option>`;
                 state.accounts.forEach(a => {
                     let aB = getBaseType(a.baseId);
                     if (aB && aB.taxCode === 'liquid') {
                         srcOpts += `<option value="${a.id}" ${acc.accelSourceId === a.id ? 'selected' : ''}>${a.name} (${aB.meta})</option>`;
                     }
                 });
                 html += `
             <div class="field-row modal-tt-wrap" style="grid-template-columns: 1fr; margin-top:12px;">
                 <div>
                     <div class="input-label" style="color:var(--teal-mid);">Fund the acceleration from…</div>
                     <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'accelSourceId', this.value)">
                         ${srcOpts}
                     </select>
                 </div>
                 <div class="modal-tt"><strong>Where the extra comes from</strong>Pick the account that will feed the faster payoff. We'll draw that pipe in Outflow Routing so you can see the tradeoff — every dollar sent here is a dollar not invested or held as buffer.</div>
             </div>`;
             }
        }

        // SURGICAL: Trust Settings with tooltips — trust ONLY. The 529 shares taxCode 'trust'
        // until the edu-split ticket lands, but trust-structure/disbursement scaffolding on an
        // education account is a leak (529 Copy Bank §6) — The Academy gets its own §3/§4 panels.
        if (base.taxCode === 'trust' && base.id !== '529plan') {
            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--shield); margin-bottom:10px;">TRUST ARCHITECTURE & DISBURSEMENT</div>
                <div class="field-row">
                    <div class="modal-tt-wrap" style="flex-direction:column; align-items:flex-start;">
                        <div class="input-label" style="width:100%;">Trust Structure</div>
                        <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'trustType', this.value)">
                            <option value="Irrevocable" ${acc.trustType==='Irrevocable'?'selected':''}>Irrevocable (Decoupled)</option>
                            <option value="Revocable" ${acc.trustType==='Revocable'?'selected':''}>Revocable (Living)</option>
                        </select>
                        <div class="modal-tt" style="left:0; right:auto; bottom:100%; transform:translateY(-10px);"><strong>Entity Status</strong>Defines whether the capital is permanently decoupled from the primary Estate (Irrevocable) or remains a revocable living structure.</div>
                    </div>
                    <div class="modal-tt-wrap" style="flex-direction:column; align-items:flex-start;">
                        <div class="input-label" style="width:100%;">Disbursement Logic</div>
                        <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'disbursement', this.value)">
                            <option value="Discretionary" ${acc.disbursement==='Discretionary'?'selected':''}>Discretionary</option>
                            <option value="Staggered" ${acc.disbursement==='Staggered'?'selected':''}>Staggered (Age-Based)</option>
                            <option value="Education/HEMS" ${acc.disbursement==='Education/HEMS'?'selected':''}>HEMS Standard</option>
                        </select>
                        <div class="modal-tt" style="left:0; right:auto; bottom:100%; transform:translateY(-10px);"><strong>Extraction Rules</strong>Dictates the mathematical conditions under which capital can escape the Trust and re-enter the standard velocity flow.</div>
                    </div>
                </div>
            </div>`;
        }

        if(base.taxCode === 'pretax' || base.taxCode === 'roth') {
            // §402(g)-class plans (401k / 403b / 457b) share the high elective-deferral figures; IRA is its own bucket.
            let is401k = /401k|403|457b/.test(base.id);
            let is403 = base.id.includes('403');
            let is457 = base.id.includes('457b');       // 457(b)-only: special final-3-year catch-up (2× base)
            let isRollover = /rollover/.test(base.id);   // The Conduit — §3b portability modal REPLACES the flat contribution ceiling (bank R40); §7C/§7.5 append below
            let hasRule55 = /401k|403/.test(base.id);   // Rule-of-55 axis: 401(k)/403(b) only — the 457(b) never carries the penalty
            let isIRA = /ira/.test(base.id);            // IRA bank §3/§4: no Rule-of-55, no super tier; IRA-aware hovers + notes
            let ownerPrefix = base.type === 'coarch' ? 'co' : 'pri';
            let dobVal = document.getElementById(ownerPrefix + '-dob').value;
            
            let birthYear = new Date().getFullYear();
            let birthMonth = 1;
            if(dobVal) {
                let parts = dobVal.split('/');
                if(parts.length > 1) {
                    birthMonth = parseInt(parts[0].trim()) || 1;
                    birthYear = parseInt(parts[1].trim()) || birthYear;
                }
            }

            let stdYear = birthYear + 59;
            let stdMonth = birthMonth + 6;
            if(stdMonth > 12) { stdMonth -= 12; stdYear += 1; }
            let stdAccessDate = `${stdMonth.toString().padStart(2, '0')} / ${stdYear}`;

            let r55Year = birthYear + 55;
            let r55AccessDate = `${birthMonth.toString().padStart(2, '0')} / ${r55Year}`;

            let currentAccessDate = acc.useRule55 ? r55AccessDate : stdAccessDate;
            let currentAccessAge = acc.useRule55 ? "55.0" : "59.5";

            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">WITHDRAWAL RULES & ACCESSIBILITY</div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    ${is457 ? `<span class="input-label modal-tt-wrap" style="color:var(--white); cursor:help;">Standard Penalty-Free Access<div class="modal-tt" style="left:0; right:auto;"><strong>Standard Penalty-Free Access</strong>⭐ The 457(b) divergence: a governmental 457(b) has NO 10% early-withdrawal penalty — once you leave the employer you can access funds at any age, paying only ordinary income tax (pre-tax) or nothing (qualified Roth).</div></span>`
                     : isIRA ? `<span class="input-label modal-tt-wrap" style="color:var(--white); cursor:help;">Standard Penalty-Free Access<div class="modal-tt" style="left:0; right:auto;"><strong>Standard Penalty-Free Access</strong>The IRA penalty-free line. Unlike a 401(k), an IRA has NO Rule-of-55 — leaving a job early doesn’t unlock it. 59.5 is the gate (limited exceptions: first home, education, etc.).</div></span>`
                     : !is403 ? `<span class="input-label modal-tt-wrap" style="color:var(--white); cursor:help;">Standard Penalty-Free Access<div class="modal-tt" style="left:0; right:auto;"><strong>Standard Penalty-Free Access</strong>${base.taxCode === 'roth' ? `This is the front door — age 59.5, when you can pull from this account without the 10% early-withdrawal penalty. For a Roth 401(k) there's a second lock too: your GROWTH is only tax-free once it's been 5 years since your first Roth contribution. Hit both — age 59.5 AND the 5-year clock — and the whole account, growth included, comes out clean.` : `This is the front door — age 59.5, when you can pull from this account without the 10% early-withdrawal penalty. For a Traditional 401(k) there's no second tax clock: once you're past the penalty age, withdrawals are simply ordinary income. (No Roth 5-year rule applies here.)`}</div></span>`
                            : `<span class="input-label" style="color:var(--white);">Standard Penalty-Free Access</span>`}
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">${is457 ? `Upon separation from service — ANY age, no penalty` : `Age 59.5 (Est. ${stdAccessDate})`}</span>
                </div>
            `;
            
            if (hasRule55) {
                html += `
                <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom: 0; margin-bottom: 8px; margin-top: 15px;">
                    <span class="toggle-label" style="color:var(--teal-mid);">Enable Rule of 55 Access</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.useRule55 ? 'checked' : ''} onchange="updateAccToggle('${id}', 'useRule55', this.checked)">
                      <span class="slider"></span>
                    </label>
                    <div class="modal-tt">${!is403 ? `<strong>An earlier door — but only for this employer.</strong>${base.taxCode === 'roth' ? `If you leave the job tied to THIS 401(k) in or after the year you turn 55, the IRS lets you take penalty-free withdrawals four years early. Flip this on to plan around that. Two cautions: it only works for the plan at the employer you separated from (not old 401(k)s or IRAs), and for the Roth side your growth is still only tax-free once the 5-year clock is met.` : `If you leave (quit, retire, or are let go) in or after the year you turn 55, the IRS lets you take penalty-free withdrawals from THIS employer's 401(k) — pre-tax, so they're taxed as ordinary income, but no 10% penalty. It doesn't apply to old plans from prior jobs or to IRAs.`}` : `<strong>Accelerate Horizon</strong>Calibrates the engine to assume penalty-free capital extraction at age 55 due to separation of service.`}</div>
                </div>
                <div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-bottom: 12px; line-height: 1.4;">Separation from service in or after the year turning 55 allows penalty-free access to this specific ${is403 ? '403(b)' : '401(k)'} architecture.</div>
                `;
            }
            
            html += `
                <div style="display:flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; margin-top: 8px;">
                    ${is457 ? `<span class="input-label modal-tt-wrap" style="color:var(--teal-mid); cursor:help;">Active Availability Benchmark<div class="modal-tt" style="left:0; right:auto;"><strong>Active Availability Benchmark</strong>The benchmark is an EVENT (leaving the job), not a birthday. While still employed, access is limited to unforeseeable-emergency rules. We deliberately omit the "Age 59.5" benchmark the IRA/401k modals show — it does not apply.</div></span>`
                     : isIRA ? `<span class="input-label modal-tt-wrap" style="color:var(--teal-mid); cursor:help;">Active Availability Benchmark<div class="modal-tt" style="left:0; right:auto;"><strong>Active Availability Benchmark</strong>Same as standard for an IRA — no early-access toggle. We deliberately omit the Rule-of-55 row the 401(k) modal shows, because it does not apply here.</div></span>`
                     : !is403 ? `<span class="input-label modal-tt-wrap" style="color:var(--teal-mid); cursor:help;">Active Availability Benchmark<div class="modal-tt" style="left:0; right:auto;"><strong>Active Availability Benchmark</strong>${base.taxCode === 'roth' ? `Your live read — the age this account actually opens for you, based on the rules you've switched on above. It shifts to 55 if Rule of 55 is enabled, otherwise 59.5. Think of it as the date the Treasury door unlocks.` : `Your live read — the age this account actually opens for you, based on the rules you've switched on above. It shifts to 55 if Rule of 55 is enabled, otherwise 59.5. Think of it as the date The Vault door unlocks.`}</div></span>`
                            : `<span class="input-label" style="color:var(--teal-mid);">Active Availability Benchmark</span>`}
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold; font-size:13px;">${is457 ? `Separation from service (not an age)` : `Age ${currentAccessAge} (${currentAccessDate})`}</span>
                </div>
                ${is457 ? `<div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-top: 10px; line-height: 1.4;">${base.taxCode === 'roth'
                    ? `Roth GROWTH is tax-free only once your first Roth 457(b) contribution is 5 years old. After separation, contributions/qualified amounts come out penalty-free at any age — the 5-yr clock governs the TAX-free part, not the penalty.`
                    : `After separation, withdrawals are ordinary income tax only — at ANY age, no 10% penalty. While still employed, only unforeseeable-emergency withdrawals are allowed. RMDs begin at 73.`}</div>`
                 : isIRA ? `<div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-top: 10px; line-height: 1.4;">${base.taxCode === 'roth'
                    ? `Even at 59.5, Roth GROWTH is tax-free only once your first Roth IRA contribution is 5 years old. Contributions themselves come out anytime, tax- and penalty-free.`
                    : `Withdrawals before 59.5 face a 10% penalty plus ordinary income tax (exceptions apply). After 59.5 it’s just ordinary income tax — and RMDs force withdrawals starting at 73.`}</div>` : ``}
            </div>`;

          if (isRollover) {
            // §3b PORTABILITY & PRESERVATION MODAL (bank R42–R47) — REPLACES the flat contribution
            // ceiling: a rollover is uncapped, so we frame it as preserved capital + employer-perks.
            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">PORTABILITY &amp; PRESERVATION</div>
                <div style="font-size:11px; color:var(--muted); font-family:var(--font-serif); line-height:1.55;">
                    <p style="margin:0 0 10px;"><strong style="color:var(--white);">How it's funded.</strong> A Rollover 401(k) balance is funded by a TRANSFER of existing retirement money from an old plan — not by fresh annual contributions. Your NEW payroll deferrals build the regular 401(k) buckets alongside it.</p>
                    <p style="margin:0 0 10px;"><strong style="color:var(--white);">Tax on the rollover.</strong> The rollover itself is tax-free when done as a direct transfer. No contribution limit caps how much you can roll in — the annual 401(k) deferral limit applies only to NEW payroll contributions, not to rolled-over dollars.</p>
                    <p style="margin:0 0 10px;"><strong style="color:var(--white);">The 60-day / indirect trap.</strong> If the money ever touches your hands (an indirect rollover), the clock is 60 days and 20% is withheld — miss the window and it becomes a taxable distribution (+10% if under 59½).</p>
                    <p style="margin:0 0 10px;"><strong style="color:var(--teal-mid);">Creditor protection preserved.</strong> By rolling into an employer plan you KEEP ironclad federal ERISA creditor protection — stronger and more portable than the state-dependent protection an IRA rollover would have given you.</p>
                    <p style="margin:0 0 10px;"><strong style="color:var(--teal-mid);">Loan optionality preserved.</strong> An employer-plan destination keeps the door to a 401(k) loan open (plan-permitting) — a liquidity option an IRA rollover permanently closes.</p>
                    <p style="margin:0;"><strong style="color:var(--teal-mid);">Early-access window preserved.</strong> Keeping the money in a 401(k) preserves Rule-of-55 access on separation — an IRA rollover would have pushed your penalty-free age back to 59½.</p>
                </div>
            </div>`;
          } else {
            // SURGICAL: Structural Injection Limits (Editable constraints) — 2026 IRS defaults
            let limitName = is403 ? "403(b) Limits" : is457 ? "457(b) Limits" : (is401k ? "401(k) / 457(b) Limits" : "IRA Limits");
            let _k4 = _di402gLimits();   // §15 dated LOOKUP(taxYear) — shared §402(g) figures, no baked year
            let _kIra = _diIraLimits();  // §8 dated IRA LOOKUP(taxYear) — 7,000/1,000 (2025) · 7,500/1,100 (2026)
            let baseLim = acc.baseLimit !== undefined ? acc.baseLimit : (is401k ? _k4.base : (isIRA ? _kIra.base : 7500));
            let c50 = acc.catchUpLimit !== undefined ? acc.catchUpLimit : (is401k ? _k4.c50 : (isIRA ? _kIra.c50 : 1100));
            let sc60 = acc.superCatchUpLimit !== undefined ? acc.superCatchUpLimit : (is401k ? _k4.superCU : 0);
            let f15 = acc.fifteenYearLimit !== undefined ? acc.fifteenYearLimit : 3000;   // 403(b)-only: 15-yr-of-service tier ($3k/yr, $15k lifetime)

            let currentLimit = parseInt(baseLim);
            if(is457 && acc.specialCatchUp) currentLimit += parseInt(baseLim);   // 457(b) special: up to 2× base, REPLACES the age tiers
            else if(acc.superCatchUp) currentLimit += parseInt(sc60);
            else if(acc.catchUp50) currentLimit += parseInt(c50);
            if(is403 && acc.fifteenYear) currentLimit += parseInt(f15);

            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                ${is457 ? `<div class="input-label modal-tt-wrap" style="color:var(--gold); margin-bottom:6px; cursor:help;">CONTRIBUTION LIMITS (${limitName})<div class="modal-tt" style="left:0; right:auto;"><strong>457(b) Limits</strong>The most you can defer into this 457(b) this year — one of the highest limits any plan offers. It's a SEPARATE ceiling from any 401(k) or 403(b) you also have, so those don't eat into this room.</div></div>`
                 : isIRA ? `<div class="input-label modal-tt-wrap" style="color:var(--gold); margin-bottom:6px; cursor:help;">CONTRIBUTION LIMITS (${limitName})<div class="modal-tt" style="left:0; right:auto;"><strong>IRA Limits</strong>The most you can put into ALL your IRAs combined this year (Traditional + Roth share one ceiling). It's a modest cap — think of the IRA as a high-quality top-up, not your main retirement engine.</div></div>`
                 : !is403 ? `<div class="input-label modal-tt-wrap" style="color:var(--gold); margin-bottom:6px; cursor:help;">CONTRIBUTION LIMITS (${limitName})<div class="modal-tt" style="left:0; right:auto;"><strong>401(k) Limits</strong>${base.taxCode === 'roth' ? `The ceiling the IRS sets on what you can defer into this plan each year. Roth and pre-tax 401(k) contributions SHARE one limit — putting $10k in Roth leaves only the remainder for pre-tax. The employer match does NOT count against your limit; it sits on top. Unused room doesn't roll over — each year is its own window.` : `The ceiling the IRS sets on what you can defer into this plan each year. Pre-tax and Roth 401(k) contributions SHARE one limit — putting $10k pre-tax leaves only the remainder for Roth. The employer match sits OUTSIDE this elective limit (it counts toward the higher overall 415(c) cap). Figures live in the dated §15 LIMITS table.`}</div></div>`
                        : `<div class="input-label" style="color:var(--gold); margin-bottom:6px;">CONTRIBUTION LIMITS (${limitName})</div>`}
                <div style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:10px;letter-spacing:0.05em;">2026 IRS limits — ${is457 ? `<a href="https://www.irs.gov/retirement-plans/irc-457b-deferred-compensation-plans" target="_blank" rel="noopener" style="color:rgba(93,202,165,0.4);text-decoration:none;">irs.gov/retirement-plans/irc-457b-deferred-compensation-plans</a>` : `<a href="https://www.irs.gov/retirement-plans" target="_blank" rel="noopener" style="color:rgba(93,202,165,0.4);text-decoration:none;">irs.gov/retirement-plans</a>`}</div>
                
                <div class="field-row" style="margin-bottom:10px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="${(/401k/.test(base.id)||isIRA)?'cursor:help;':''}">Base Limit</div><input type="number" class="small-field" value="${baseLim}" oninput="updateAccField('${id}', 'baseLimit', this.value)">${/401k/.test(base.id) ? `<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Base Limit</strong>${base.taxCode==='roth' ? `The standard yearly cap on your own contributions — the IRS resets it most Januarys (see the dated LIMITS table, §15). This is the most tax-free growth you can plant in a single year here — for a Roth, filling it is buying tax-free compounding at today's tax rate.` : `The standard yearly cap on your own contributions — the IRS resets it most Januarys (see the dated LIMITS table, §15). This is the most tax-DEFERRED growth you can plant in a single year here — for a Traditional (pre-tax) 401(k), filling it lowers this year's taxable income now; the dollars and all their growth are taxed later as ordinary income when you draw them.`}</div>` : (isIRA ? `<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Base Limit</strong>The most you can put into ALL your IRAs combined this year (Traditional + Roth share one ceiling). It’s a modest cap — think of the IRA as a high-quality top-up, not your main retirement engine.</div>` : ``)}</div>
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="${/401k/.test(base.id)?'cursor:help;':''}">Catch-Up (50+)</div><input type="number" class="small-field" value="${c50}" oninput="updateAccField('${id}', 'catchUpLimit', this.value)">${/401k/.test(base.id) ? `<div class="modal-tt" style="top:100%; bottom:auto; left:auto; right:0;"><strong>I'm 50 or older — let me add more.</strong>${base.taxCode==='roth' ? `Once you hit 50, the IRS lets you contribute extra on top of the base limit (current figure in the §15 LIMITS table). In a Roth, late-career catch-up is unusually smart: you're locking in tax-free growth exactly when your income — and your tax rate — is often at its peak.` : `Once you hit 50, the IRS lets you contribute extra on top of the base limit (current figure in the §15 LIMITS table). In a pre-tax 401(k), late-career catch-up is a targeted tax cut: you're shielding your highest-earning years from tax at today's top rate and deferring the bill to retirement, when your bracket is often lower.`}</div>` : ``}</div>
                </div>
                ${is401k ? `
                <div class="field-row" style="margin-bottom:15px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="${/401k/.test(base.id)?'cursor:help;':''}">Super Catch-Up (60-63)</div><input type="number" class="small-field" value="${sc60}" oninput="updateAccField('${id}', 'superCatchUpLimit', this.value)">${/401k/.test(base.id) ? `<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>I'm 60 to 63 — let me add even more.</strong>${base.taxCode==='roth' ? `A bigger catch-up window the SECURE 2.0 law opened for ages 60 through 63 (current figure in the §15 LIMITS table). A short, powerful runway right before retirement to pack in tax-free dollars. It replaces the regular 50+ catch-up for those four years — you get one or the other, not both.` : `A bigger catch-up window SECURE 2.0 opened for ages 60 through 63 (current figure in the §15 LIMITS table). A short, powerful runway right before retirement to defer a large slug of income out of your peak-earning, peak-bracket years. It replaces the regular 50+ catch-up for those four years — one or the other, not both.`}</div>` : ``}</div>
                    ${is403 ? `<div><div class="input-label">15-Yr Service Catch-Up</div><input type="number" class="small-field" value="${f15}" oninput="updateAccField('${id}', 'fifteenYearLimit', this.value)"></div>` : ``}
                </div>` : `<div style="border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:15px;"></div>`}

                <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom: 0; margin-bottom: 8px;">
                    <span class="toggle-label" style="color:var(--teal-mid);">Enable Catch-Up (Age 50+)</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.catchUp50 ? 'checked' : ''} onchange="updateAccToggle('${id}', 'catchUp50', this.checked)">
                      <span class="slider"></span>
                    </label>
                    ${is457 ? `<div class="modal-tt"><strong>Age 50 Unlock</strong>At 50+ the IRS lets you add a catch-up on top of the base ($7,500 in 2025, $8,000 in 2026) — and at 60-63 a larger "super" catch-up (~$11,250) may apply if the plan allows. High-wage earners (>$150k prior year, indexed) must make the age-50 catch-up as Roth.</div>`
                     : isIRA ? `<div class="modal-tt"><strong>Age 50 Unlock</strong>At 50+ the IRS lets you add a fixed catch-up on top of the base — small, but it’s untaxed-growth room (Roth) or a deduction (Traditional) right when you’re likely earning most. NO super catch-up exists for IRAs.</div>`
                            : `<div class="modal-tt"><strong>Age 50 Unlock</strong>From the calendar year you turn 50, the IRS lets you defer past the base ceiling. Peak-earning years usually land here — flip it on to raise this account's Annual Maximum.</div>`}
                </div>
                ${is457 && base.taxCode === 'roth' ? `<div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-top: 10px; line-height: 1.4;">A Roth 457(b) only exists if your plan offers it. There's no income limit to contribute — high earners are fully eligible, no matter what they make.</div>` : ``}
                ${isIRA ? `<div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-top: 10px; line-height: 1.4;">${base.taxCode === 'roth'
                    ? `Heads up: direct Roth IRA contributions phase out at higher incomes. If you're over the line, a "backdoor" conversion is the usual route in.`
                    : `Your contribution may be fully deductible, partly deductible, or not at all — it depends on your income AND whether you’re covered by a workplace plan. The deduction is the whole point of the Traditional IRA, so it’s worth checking where you land.`}</div>` : ``}
            `;
            if(is401k) {
                html += `
                <div class="toggle-row modal-tt-wrap" style="border-bottom:${(is403 || is457) ? 'none' : '1px solid rgba(255,255,255,0.05)'}; padding-bottom: 12px; margin-bottom: 8px; margin-top: 8px;">
                    <span class="toggle-label" style="color:var(--gold);">Enable Super Catch-Up (Age 60-63)</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.superCatchUp ? 'checked' : ''} onchange="updateAccToggle('${id}', 'superCatchUp', this.checked)">
                      <span class="slider"></span>
                    </label>
                    <div class="modal-tt"><strong>The 60–63 Window</strong>A SECURE 2.0 boost: in the calendar years you're 60 through 63, a larger catch-up replaces the standard one (if your plan offers it). Four years to push hardest, right before the drawdown turn.</div>
                </div>
                `;
                if(is457) {
                    html += `
                <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 8px; margin-top: 8px;">
                    <span class="toggle-label" style="color:var(--gold);">Enable Special 3-Year Catch-Up</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.specialCatchUp ? 'checked' : ''} onchange="updateAccToggle('${id}', 'specialCatchUp', this.checked)">
                      <span class="slider"></span>
                    </label>
                    <div class="modal-tt"><strong>Final-3-Year Sprint</strong>In the THREE years before your plan's normal retirement age you may be able to defer up to DOUBLE the base limit (~$47,000 in 2025 / ~$49,000 in 2026) to make up unused room from prior years — a feature unique to the 457(b). You cannot use this AND the age-50 catch-up in the same year.</div>
                </div>
                    `;
                }
                if(is403) {
                    html += `
                <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 8px; margin-top: 8px;">
                    <span class="toggle-label" style="color:var(--gold);">Enable 15-Year Service Catch-Up</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.fifteenYear ? 'checked' : ''} onchange="updateAccToggle('${id}', 'fifteenYear', this.checked)">
                      <span class="slider"></span>
                    </label>
                    <div class="modal-tt"><strong>Tenure Tier</strong>15+ years at the SAME §501(c)(3) employer, if the plan permits: up to $3,000/yr extra, capped at $15,000 lifetime, any age. Stacks with the age-50 catch-up — deferrals fill this tier first.</div>
                </div>
                    `;
                }
            } else {
                 html += `<div style="border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:8px; padding-bottom:12px;"></div>`;
            }

            html += `
                <div style="display:flex; justify-content: space-between; padding-top: 5px;">
                    <span class="input-label${/401k/.test(base.id)?' modal-tt-wrap':''}" style="color:var(--teal-mid);${/401k/.test(base.id)?' cursor:help;':''}">Annual Maximum${/401k/.test(base.id) ? `<div class="modal-tt" style="left:0; right:auto;"><strong>Active Maximum Injection</strong>Your live total ceiling — base limit plus whichever catch-up you've enabled. The most you're allowed to add to this account this year, given your age settings above.</div>` : ``}</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold; font-size:13px;" id="limit-calc-${id}">$${currentLimit.toLocaleString()} / YR</span>
                </div>
            </div>`;
          }   // end §3b-vs-limits (isRollover) branch

            // §8 EMPLOYER-MATCH INPUT AREA — bank '401(k) Copy Bank' §8 (R92–R97), hovers VERBATIM.
            // Branch-agnostic: both roth401k "The Treasury" and pretax401k "The Vault" host Match Rate /
            // Up-To / Vesting; the direct-entry Employer-Match Balance renders on the ROTH room ONLY
            // (on pre-tax the whole balance is already pre-tax — nothing to split). Salary is REUSED
            // from the global Gross-Salary field (Lesson 48). Persist via existing updateAccField;
            // any unset field stays blank — never defaulted, never guessed (Lesson 47).
            if (/401k/.test(base.id) && !/rollover/.test(base.id)) {   // NOT The Conduit — a rollover takes no new employer match
                let mr = acc.matchRate   !== undefined ? acc.matchRate   : '';
                let mu = acc.matchUpTo   !== undefined ? acc.matchUpTo   : '';
                let vp = acc.vestedPct   !== undefined ? acc.vestedPct   : '';
                let mb = acc.matchBalance!== undefined ? acc.matchBalance: '';
                let psb = acc.profitSharingBalance !== undefined ? acc.profitSharingBalance : '';
                let rvb = acc.rolloverBalance !== undefined ? acc.rolloverBalance : '';
                html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">EMPLOYER MATCH</div>
                ${_diBlankNudge(!mr, 'Add your employer’s match and we’ll show whether you’re capturing every free dollar — the single highest-return move in this account.')}
                <div class="field-row" style="margin-bottom:10px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Match Rate (%)</div><input type="number" class="small-field" value="${mr}" oninput="updateAccField('${id}', 'matchRate', this.value)"><div class="modal-tt"><strong>Match Rate (%)</strong>How much your employer adds for every dollar you put in — e.g., "50%" means they chip in 50¢ per $1 you contribute. This is free money; capturing all of it is the highest-guaranteed-return move in your whole plan.</div></div>
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Match Up-To (% of salary)</div><input type="number" class="small-field" value="${mu}" oninput="updateAccField('${id}', 'matchUpTo', this.value)"><div class="modal-tt" style="left:auto; right:0;"><strong>Match Up-To (% of salary)</strong>The ceiling on the match — your employer matches your contributions only up to this share of your pay (e.g., "up to 6% of salary"). Contribute at least this much to grab the full match; going under leaves guaranteed money behind.</div></div>
                </div>
                <div class="field-row" style="margin-bottom:10px;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Vesting (%)</div><input type="number" class="small-field" value="${vp}" oninput="updateAccField('${id}', 'vestedPct', this.value)"><div class="modal-tt"><strong>Vesting Schedule</strong>How long you must stay before the match is truly YOURS. Unvested match dollars vanish if you leave early — this sets whether the match on screen is real money or a promise. Common: cliff (all at once after N years) or graded (a slice per year).</div></div>
                    ${base.taxCode === 'roth'
                      ? `<div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Employer-Match Balance ($)</div><input type="number" class="small-field" value="${mb}" oninput="updateAccField('${id}', 'matchBalance', this.value)"><div class="modal-tt" style="left:auto; right:0;"><strong>Employer-Match Balance ($)</strong>The portion of your 401(k) balance that came from your employer's match — read it straight off your statement (many list the "employer source" or "match source" balance as its own line). This money sits in a PRE-TAX pocket inside your Roth 401(k): it grew tax-free, but unlike your own Roth contributions it WILL be taxed as ordinary income when you withdraw it. Entering it here lets us show your two tax buckets exactly, with no guessing — the rest of your balance is treated as your tax-free Roth money.</div></div>`
                      : `<div></div>`}
                </div>
                <div class="field-row" style="margin-bottom:0;">
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Profit-Sharing Balance ($)</div><input type="number" class="small-field" value="${psb}" oninput="updateAccField('${id}', 'profitSharingBalance', this.value)"><div class="modal-tt"><strong>Profit-Sharing Balance ($)</strong>The portion of your 401(k) that came from your company's profit-sharing award — an annual, performance-based contribution your employer makes ON TOP of any match (some years it's large, some years zero). Read it straight off your statement as its own "profit-sharing source" line. Like the match, this is EMPLOYER money: it lands in a PRE-TAX pocket even inside a Roth 401(k) — it grew tax-free, but it is taxed as ordinary income when you withdraw it AND it carries RMDs. Break it out here so it is never silently buried inside your Roth total.</div></div>
                    <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">In-Plan Rollover Balance ($)</div><input type="number" class="small-field" value="${rvb}" oninput="updateAccField('${id}', 'rolloverBalance', this.value)"><div class="modal-tt" style="left:auto; right:0;"><strong>In-Plan Rollover Balance ($)</strong>The portion of your 401(k) that was ROLLED IN from a PRIOR employer's plan (an old 401(k)/403(b) you carried into this one) — read it straight off your statement as its own "rollover source" line. It keeps its original tax character: pretax rollover money is taxed as ordinary income at withdrawal and carries RMDs. Break it out here so your rolled-in dollars aren't silently merged into your own contributions — and note this same money also has its OWN room, "The Conduit" (Rollover 401(k)), if you want to see it standalone.</div></div>
                </div>
            </div>`;
            }
            if (isRollover) {
                // §7C ROLLOVER FACTS sub-form (bank R216–R220) + §7.5 destination-link & count-once
                // guard (bank R90–R95). Every field OPTIONAL / blank-safe (L47). IN-SESSION only —
                // field persistence deferred to the D1+KV backend (tracked gap). The count-once flag
                // renders from the SAFE DEFAULT (informational), not a remembered toggle, so a reload
                // can never double-count (Captain Fork A).
                let _pp = acc.priorPlan || '', _rf = acc.rollFlavor || 'pretax';
                let _r55 = acc.rule55Eligible === true, _loan = acc.planAllowsLoans === true;
                let _link = acc.linkedToAccount || '';
                let _destOpts = '<option value="">— standalone / still in transit —</option>';
                (state.accounts || []).forEach(function (d) {
                    if (d.id === id) return;
                    let db = getBaseType(d.baseId); if (!db) return;
                    if (!/ira|401k/.test(db.id)) return;   // destinations = the user's OWN IRA/401(k)-family accounts
                    _destOpts += `<option value="${d.id}" ${_link === d.id ? 'selected' : ''}>${(d.name || db.title)} (${db.meta})</option>`;
                });
                let _linkedName = '';
                if (_link) { let _la = (state.accounts || []).find(a => a.id === _link); if (_la) { let _lb = getBaseType(_la.baseId); _linkedName = (_la.name || (_lb && _lb.title)) + (_lb ? (' (' + _lb.meta + ')') : ''); } }
                let _informational = _conduitIsInformational(acc);   // safe-by-default (bank R91)
                html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!=='block'; n.style.display=open?'block':'none'; this.classList.toggle('open', open);" style="color:var(--gold);">Rollover facts (optional) <span class="ira-why-caret">▸</span></div>
                <div style="display:none; margin-top:12px;">
                    <div class="field-row" style="margin-bottom:10px;">
                        <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Where did this roll from?<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Where did this roll from?</strong>401(k) · 403(b) · 457(b) · TSP · other employer plan</div></div>
                            <input type="text" class="small-field" value="${_pp}" placeholder="401(k) · 403(b) · 457(b) · TSP · other employer plan" oninput="updateAccField('${id}', 'priorPlan', this.value)"></div>
                        <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Pre-tax or Roth money?<div class="modal-tt" style="top:100%; bottom:auto; left:auto; right:0;"><strong>Pre-tax or Roth money?</strong>Most rollovers are pre-tax. Choose Roth only if the source was a designated Roth account.</div></div>
                            <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'rollFlavor', this.value)"><option value="pretax" ${_rf !== 'roth' ? 'selected' : ''}>Pre-tax</option><option value="roth" ${_rf === 'roth' ? 'selected' : ''}>Roth</option></select></div>
                    </div>
                    <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom:0; margin-bottom:8px;">
                        <span class="toggle-label" style="color:var(--teal-mid);">Is this your CURRENT employer’s plan, and did you leave that job at 55+?</span>
                        <label class="switch"><input type="checkbox" ${_r55 ? 'checked' : ''} onchange="updateAccToggle('${id}', 'rule55Eligible', this.checked)"><span class="slider"></span></label>
                        <div class="modal-tt"><strong>Rule of 55</strong>Rule of 55 lets you tap THIS plan penalty-free if you separated in/after the year you turned 55.</div>
                    </div>
                    <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-bottom:0; margin-bottom:8px;">
                        <span class="toggle-label" style="color:var(--teal-mid);">Does this plan allow loans?</span>
                        <label class="switch"><input type="checkbox" ${_loan ? 'checked' : ''} onchange="updateAccToggle('${id}', 'planAllowsLoans', this.checked)"><span class="slider"></span></label>
                        <div class="modal-tt"><strong>Plan loans</strong>Many employer plans do; IRAs never do. Leave blank if unsure.</div>
                    </div>
                    <div style="margin-top:12px;">
                        <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Rolled into… (pick the destination account)<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Rolled into…</strong>Links this rollover to the account that received it, so the dollars are counted once.</div></div>
                            <select class="small-field" style="background: var(--bg-navy); width:100%;" onchange="updateAccField('${id}', 'linkedToAccount', this.value)">${_destOpts}</select></div>
                    </div>
                    <div class="toggle-row" style="border-bottom:none; padding-bottom:0; margin-top:12px;">
                        <span class="toggle-label" style="color:var(--muted);">This is a standalone balance — count it in my plan</span>
                        <label class="switch"><input type="checkbox" ${acc.standaloneRollover === true ? 'checked' : ''} onchange="updateAccToggle('${id}', 'standaloneRollover', this.checked)"><span class="slider"></span></label>
                    </div>
                    <div style="margin-top:12px;">
                        <div class="modal-tt-wrap" style="display:block;"><div class="input-label" style="cursor:help;">Beneficiary<div class="modal-tt" style="top:100%; bottom:auto; left:0; right:auto;"><strong>Beneficiary</strong>Name who inherits this rolled-over money. A named beneficiary passes straight to them and SKIPS PROBATE — it overrides your will for this account. Rollovers are easy to open and then forget; one field now can spare your family a court process later.</div></div>
                            <input type="text" class="small-field" value="${String(acc.beneficiary || '').replace(/"/g,'&quot;')}" placeholder="Who inherits this rolled-over money?" oninput="updateAccField('${id}', 'beneficiary', this.value)"></div>
                        ${_diBlankNudge(!(acc.beneficiary && String(acc.beneficiary).trim()), 'Name a beneficiary and this rolled-over money skips probate — one field now saves your family a court later.')}
                    </div>
                </div>
                <div style="margin-top:12px; font-size:11px; color:${_informational ? 'var(--muted)' : 'var(--teal-mid)'}; font-family:var(--font-serif); line-height:1.55;">
                    ${_informational
                        ? ('<strong>Counted once.</strong> To keep your net worth honest, this rollover is treated as <strong>already counted in ' + (_linkedName ? _linkedName : 'your destination retirement plan') + '</strong> — its balance sits here for reference while the destination holds the dollars. Rolled into a specific account? Pick it above. A separate balance no other account holds? Flip “standalone” on and it counts on its own.')
                        : '<strong>Standalone — counts on its own.</strong> You’ve marked this as a separate balance no other account holds, so its full value counts in your plan. If it actually lives inside another account you already track, turn this off so it isn’t double-counted.'}
                </div>
                ${_diBlankNudge(!_link, 'Rolled this into another one of your accounts? Link it here so we count the dollars once, in the right place — no double-counting your net worth.')}
                ${_diBlankNudge(!_r55, 'Is this your CURRENT employer’s plan? If so and you’re 55+, you may be able to tap it penalty-free years early — tell us and we’ll open that window in your projection.')}
            </div>`;
            }
        }

        if (base.taxCode === 'hsa') {
            // THE INFIRMARY — triple-tax HSA. Copy = Architect-owned verbatim (HSA Copy Bank §3a/§3b/§4/§8).
            // Dated IRS constants (Rev. Proc. 2025-19 / Pub 969) — LOOKUP by tax year, never guess (Lesson 47).
            const HSA_LIMITS = { 2025: { self: 4300, family: 8550, catch: 1000 }, 2026: { self: 4400, family: 8750, catch: 1000 } };
            let hsaYear = new Date().getFullYear();
            let hsaLim = HSA_LIMITS[hsaYear];
            let hsaTier = acc.coverageTier || '';                 // '' = unknown -> show both tiers, never guess
            let hsaEmp = parseFloat(acc.employerContrib) || 0;    // employer dollars CONSUME the same limit
            let hsaInjection;
            if (!hsaLim) hsaInjection = 'Limits pending IRS release';
            else if (!hsaTier) hsaInjection = `$${hsaLim.self.toLocaleString()} self · $${hsaLim.family.toLocaleString()} family`;
            else hsaInjection = `$${Math.max(0, (hsaTier === 'family' ? hsaLim.family : hsaLim.self) + (acc.catchUp55 ? hsaLim.catch : 0) - hsaEmp).toLocaleString()} / YR`;

            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">HSA ELIGIBILITY — WHO CAN CONTRIBUTE</div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">HDHP enrollment</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">HSA-qualified High-Deductible Health Plan — and ONLY that plan</span>
                    <div class="modal-tt"><strong>The Gate</strong>For 2026 an HDHP needs a deductible of at least $1,700 self-only / $3,400 family, with out-of-pocket capped at $8,500 / $17,000. You can only contribute for the months you were HDHP-covered on the 1st.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">No disqualifying coverage</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">No other coverage that pays before the deductible</span>
                    <div class="modal-tt"><strong>The Silent Disqualifier</strong>A spouse's general-purpose FSA can disqualify you even if you're not on their plan. Limited-purpose (dental/vision) FSAs are OK.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Not enrolled in Medicare</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">Any part of Medicare ends new contributions — spending is still fine</span>
                    <div class="modal-tt"><strong>The Medicare Cliff</strong>Social Security at/after 65 auto-enrolls you in Part A, often retroactively up to 6 months — stop contributions ahead of Medicare to avoid an excess-contribution penalty.</div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Not a dependent</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Can't be claimed on someone else's return</span>
                </div>
                <div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); line-height: 1.4;">Eligibility is tested on the FIRST day of each month; the annual limit prorates by eligible months (last-month rule excepted).</div>
            </div>

            <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">WITHDRAWAL RULES & ACCESSIBILITY</div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Qualified medical — ANY age</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-size:10px; font-weight:bold;">Tax-free, penalty-free, forever</span>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Non-medical BEFORE 65</span>
                    <span style="font-family: var(--font-mono); color: var(--danger); font-size:10px;">Income tax + a 20% penalty</span>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Non-medical AT/AFTER 65</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Income tax only — no penalty. "Becomes a Traditional IRA."</span>
                    <div class="modal-tt"><strong>The Retirement Unlock</strong>The worst case for an HSA is "as good as a Traditional IRA" — and the best case (medical) is tax-free.</div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                    <span class="input-label" style="color:var(--teal-mid);">No RMDs</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Never any Required Minimum Distributions</span>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between;">
                    <span class="input-label" style="color:var(--teal-mid);">Portable</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">It follows the person, not the job</span>
                    <div class="modal-tt"><strong>Inheritance Caveat</strong>A spouse beneficiary inherits it AS an HSA. A non-spouse beneficiary must take it as fully-taxable income in the year of death — name a spouse where possible.</div>
                </div>
            </div>

            <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:6px;">CONTRIBUTION LIMITS (HSA Limits)</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:10px;letter-spacing:0.05em;">${hsaLim ? hsaYear + ' IRS limits — Rev. Proc. 2025-19 / Pub 969' : 'Limits pending IRS release'} — set by your HDHP COVERAGE TIER, not your salary</div>
                <div class="field-row" style="margin-bottom:10px;">
                    <div class="modal-tt-wrap" style="flex-direction:column; align-items:flex-start;">
                        <div class="input-label" style="width:100%;">HDHP Coverage Tier</div>
                        <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccToggle('${id}', 'coverageTier', this.value)">
                            <option value="" ${!hsaTier ? 'selected' : ''}>Unknown (show both)</option>
                            <option value="self" ${hsaTier === 'self' ? 'selected' : ''}>Self-only${hsaLim ? ' ($' + hsaLim.self.toLocaleString() + ')' : ''}</option>
                            <option value="family" ${hsaTier === 'family' ? 'selected' : ''}>Family${hsaLim ? ' ($' + hsaLim.family.toLocaleString() + ')' : ''}</option>
                        </select>
                        <div class="modal-tt" style="left:0; right:auto; bottom:100%; transform:translateY(-10px);"><strong>Coverage, Not Filing Status</strong>"Family" = your HDHP covers more than just you. The limit depends on self-only vs family HDHP coverage, NOT on income.</div>
                    </div>
                    <div><div class="input-label">Employer Contributions</div><input type="number" class="small-field" value="${acc.employerContrib || ''}" placeholder="0" oninput="updateAccField('${id}', 'employerContrib', this.value)"></div>
                </div>
                <div style="font-size: 10px; color: var(--muted); font-family: var(--font-serif); font-style: italic; margin-bottom: 12px; line-height: 1.4;">Anything your employer puts in (including "seed" money) counts toward the SAME limit — it does not stack on top.</div>
                <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 8px;">
                    <span class="toggle-label" style="color:var(--teal-mid);">Enable Catch-Up (Age 55+)</span>
                    <label class="switch">
                      <input type="checkbox" ${acc.catchUp55 ? 'checked' : ''} onchange="updateAccToggle('${id}', 'catchUp55', this.checked)">
                      <span class="slider"></span>
                    </label>
                    <div class="modal-tt"><strong>55, Not 50</strong>At 55+ add a $1,000 catch-up (flat — not indexed). If BOTH spouses are 55+, each $1,000 must go into THAT spouse's OWN HSA.</div>
                </div>
                <div style="display:flex; justify-content: space-between; padding-top: 5px;">
                    <span class="input-label" style="color:var(--teal-mid);">Annual Maximum</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold; font-size:13px;" id="limit-calc-${id}">${hsaInjection}</span>
                </div>
            </div>`;
        }

        if (base.id === '529plan') {
            // THE ACADEMY — 529 Copy Bank §3a/§3b/§3c/§4 (Architect-owned verbatim). Owner↔beneficiary
            // axis renders FIRST — the 529's defining structure (its analog of the HSA eligibility gate).
            // {beneficiary}/{ownerState} are §7 asks, unsourced -> "not yet on file" (L47, never fabricate).
            const g529 = _DI_529[new Date().getFullYear()];
            const gx = (n) => g529 ? '$' + n.toLocaleString('en-US') : '—';
            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">OWNER &amp; BENEFICIARY — WHO CONTROLS, WHO BENEFITS</div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Account owner</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">You control the investments, the withdrawals, and who the money is for</span>
                    <div class="modal-tt"><strong>The Structural Axis</strong>The OWNER (not the beneficiary) keeps full control: picks investments, takes distributions, and can change the beneficiary — unlike an UTMA/UGMA, where the money becomes the child's at majority.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Beneficiary</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">— not yet on file</span>
                    <div class="modal-tt"><strong>Who It's For</strong>This 529 is FOR the student whose qualified education it pays. The beneficiary receives the tax-free benefit; they do NOT control the account.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--teal-mid);">Change the beneficiary</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">Any qualifying family member, any time — a sibling, yourself, a grandchild</span>
                    <div class="modal-tt"><strong>The "What If They Don't Go?" Answer</strong>If one child doesn't use it, redirect to another qualifying family member with no tax hit — the IRS family definition is broad (siblings, parents, cousins, in-laws, spouse).</div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Investment changes</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Twice per calendar year (or on a beneficiary change)</span>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between;">
                    <span class="input-label" style="color:var(--white);">Financial-aid treatment</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">Parent-owned = parental asset on the FAFSA, assessed at most ~5.64%</span>
                    <div class="modal-tt"><strong>Light FAFSA Touch</strong>Far gentler than student-owned assets. Post-FAFSA-simplification, a grandparent-owned 529 no longer counts as untaxed student income — the old "grandparent penalty" is gone.</div>
                </div>
            </div>

            <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">WITHDRAWAL RULES &amp; QUALIFIED EXPENSES</div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Qualified education — any age</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-size:10px; font-weight:bold;">Tax-free, penalty-free, forever</span>
                    <div class="modal-tt"><strong>The Core Promise</strong>College tuition/fees, room &amp; board (if enrolled ≥half-time), books, computers/internet, special-needs equipment, and registered apprenticeships. Withdrawals must match the year the expense is paid.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">K-12 tuition (expanded 2026)</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Up to ${g529 ? '$' + g529.k12.toLocaleString('en-US') : '—'}/yr per student — doubled under OBBBA</span>
                    <div class="modal-tt"><strong>OBBBA Expansion</strong>Effective Jan 2026 the K-12 cap doubled from $10,000 → $20,000/yr per student, and qualified K-12 expenses now include curriculum materials, tutoring, standardized/AP/admissions test fees, dual-enrollment fees, and educational therapies.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Credentials &amp; trades (new)</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:55%;">Welding, aviation, CDL, HVAC, cosmetology — plus CPA/bar exam prep</span>
                    <div class="modal-tt"><strong>Beyond the 4-Year Degree</strong>As of July 5, 2025 (OBBBA): postsecondary credentialing programs recognized under WIOA or listed in the VA WEAMS database qualify, plus professional licensing and continuing-ed costs.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Student-loan repayment</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Up to $10,000 lifetime per beneficiary (+ $10k per sibling)</span>
                    <div class="modal-tt"><strong>Escape Valve</strong>SECURE Act: a lifetime $10,000 per beneficiary can repay qualified student-loan principal/interest — plus a separate $10,000 for each of the beneficiary's siblings.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Non-qualified — the penalty</span>
                    <span style="font-family: var(--font-mono); color: var(--danger); font-size:10px; text-align:right; max-width:55%;">Income tax + 10% penalty — ONLY on the EARNINGS, never your contributions</span>
                    <div class="modal-tt"><strong>Correctly Scoped</strong>The penalty and income tax hit the GROWTH portion only; your after-tax principal always comes out tax- and penalty-free. Waived for scholarships (up to the scholarship amount), disability, or a U.S. service academy.</div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                    <span class="input-label" style="color:var(--teal-mid);">No RMDs</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Never any Required Minimum Distributions — no age deadline to use the funds</span>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between;">
                    <span class="input-label" style="color:var(--teal-mid);">Successor owner</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:55%;">Name one so the account passes smoothly — a 529 is generally outside your taxable estate already</span>
                    <div class="modal-tt"><strong>Estate Nuance</strong>Contributions are completed gifts, so the balance is generally OUTSIDE the owner's taxable estate — a rare "control it but it's out of your estate" feature. Naming a successor owner avoids probate.</div>
                </div>
            </div>

            <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:10px;">529 → ROTH IRA ROLLOVER — THE "WHAT IF UNUSED" UNLOCK</div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--teal-mid);">The headline</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-size:10px; font-weight:bold;">Leftover money can roll to the beneficiary's Roth IRA — up to $35,000 lifetime</span>
                    <div class="modal-tt"><strong>SECURE 2.0 Unlock</strong>Turns an over-funded 529 into a retirement head-start for the child. The Roth IRA must be in the BENEFICIARY's name.</div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">15-year account age</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">The 529 must be open at least 15 years first — start the clock early</span>
                </div>
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">5-year seasoning</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">The last 5 years of contributions (and their earnings) can't roll</span>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Annual Roth limit applies</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Each year's rollover counts toward the beneficiary's annual Roth limit</span>
                    <div class="modal-tt"><strong>Drained Gradually</strong>The $35,000 lifetime cap moves at most the annual Roth contribution limit per year ($7,000 in 2026; $8,000 if 50+), so it takes ~5+ years to use fully. The beneficiary needs earned income ≥ the amount rolled that year.</div>
                </div>
                <div style="display:flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                    <span class="input-label" style="color:var(--teal-mid);">Why it matters</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:60%;">Unused money is never trapped — worst case is a tax-free retirement head-start for your child</span>
                </div>
            </div>

            <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 20px;">
                <div class="input-label" style="color:var(--gold); margin-bottom:6px;">CONTRIBUTIONS &amp; GIFT-TAX ROOM (NO federal cap)</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.3);margin-bottom:10px;letter-spacing:0.05em;">${g529 ? new Date().getFullYear() + ' IRS gift figures' : 'Figures pending IRS release'} — a GIFT-tax framing, not a salary-keyed limit</div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Annual gift exclusion</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">${gx(g529 ? g529.excl : 0)} per giver, per beneficiary, per year — fully gift-tax-free</span>
                    <div class="modal-tt"><strong>No Form Required</strong>A married couple can give ${gx(g529 ? g529.excl * 2 : 0)}/yr to one beneficiary and stay entirely under the gift-tax radar — no Form 709 at or below the exclusion.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Superfund (5-year election)</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Front-load 5 years at once — up to ${gx(g529 ? g529.superS : 0)} single / ${gx(g529 ? g529.superC : 0)} per couple</span>
                    <div class="modal-tt"><strong>Accelerated Gifting</strong>The 5-year election (Form 709) treats one big gift as if spread over 5 years — front-loading decades of tax-free compounding. If you die within the 5 years, a prorated portion comes back into your estate.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">Above the exclusion?</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px; text-align:right; max-width:55%;">Just uses a slice of the $15,000,000 lifetime exemption (2026) — a form, rarely a tax</span>
                    <div class="modal-tt"><strong>Reassurance</strong>"Above the exclusion" ≠ "owe gift tax." Larger gifts simply file against the $15M-per-individual (2026) lifetime gift/estate exemption.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">State tax benefit</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Many states give a deduction or credit — usually only in your home-state plan</span>
                    <div class="modal-tt"><strong>State-Gated</strong>Check your home state: many give a deduction/credit ONLY for the home-state plan; a few are tax-parity (any plan qualifies). Some recapture the deduction on non-qualified withdrawals.</div>
                </div>
                <div class="modal-tt-wrap" style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span class="input-label" style="color:var(--white);">State aggregate cap</span>
                    <span style="font-family: var(--font-mono); color: var(--muted); font-size:10px;">Most states cap lifetime totals per beneficiary around $300k–$550k</span>
                    <div class="modal-tt"><strong>The Only Hard Ceiling</strong>A per-beneficiary lifetime aggregate across all 529s for that beneficiary in the state — once hit, no new contributions (growth still allowed). Distinct from the federal gift framing.</div>
                </div>
                <div style="display:flex; justify-content: space-between; padding-top: 5px; border-top: 1px dashed rgba(255,255,255,0.1); margin-top: 4px;">
                    <span class="input-label" style="color:var(--teal-mid);">Gift-Tax-Free Room</span>
                    <span style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold; font-size:13px;">${g529 ? gx(g529.excl) + ' single · ' + gx(g529.excl * 2) + ' couple / YR' : 'Figures pending IRS release'}</span>
                </div>
            </div>`;
        }

        if (base.taxCode === 'debt') {
            let isStudentLoan = base.id.includes('student_loan');

            // §1 DATUM INTELLIGENCE strip (Mortgage-only) — composed, sourced-or-blank; live-refreshed.
            if (base.title === 'Mortgage') {
                let _diTxt = _moatDI(acc);
                html += `
            <div class="di-narrative">
                <div class="di-narr-head">Datum Intelligence</div>
                <div class="di-narr-body" id="modal-moat-di-${id}">${_diTxt || 'Add this loan\'s balance, rate, and payment and Datum reads it back — the payoff clock, the lifetime interest, and the equity behind it.'}</div>
                <div id="modal-moat-intel-${id}" class="di-narr-body" style="margin-top:8px;">${_diIntelligence(acc)}</div>
            </div>`;
            }

            // §1 DATUM INTELLIGENCE strip (HELOC / The Cellar) — composed, sourced-or-blank; live-refreshed.
            if (base.title === 'HELOC') {
                let _cdiTxt = _cellarDI(acc);
                html += `
            <div class="di-narrative">
                <div class="di-narr-head">Datum Intelligence</div>
                <div class="di-narr-body" id="modal-cellar-di-${id}">${_cdiTxt || 'Add this line\'s balance and credit limit and Datum reads it back — your utilization, your headroom, the phase you\'re in, and the equity behind it.'}</div>
                <div id="modal-cellar-intel-${id}" class="di-narr-body" style="margin-top:8px;">${_diIntelligence(acc)}</div>
            </div>`;
            }

            // §15 education panel (HELOC Copy Bank §15 R58, verbatim) — MOVED UP (§2d) to sit at the top of the
            // overview, below the DI strip and ABOVE the Current Balance box (read the why, THEN enter numbers;
            // matches the Grounds precedent). Stays INSIDE #modal-edu-collapse so it collapses with the overview
            // on decorate — never leaks into the holdings view. No escrow block. Copy is R58 verbatim (a MOVE).
            if (base.title === 'HELOC') {
                html += _diWhyPanel('What a HELOC is — and the catch behind the low rate', [
                    ['Draw, repay, and the phase shift', `A HELOC lets you borrow against your home's equity like a revolving line — draw, repay, draw again — usually at a lower rate than unsecured credit because your house backs it. That lower rate is the upside; the collateral is the catch. It runs in two phases: during the draw period you can keep borrowing and often pay interest-only, so the balance may not shrink; when the repayment period begins, no new draws are allowed and the balance amortizes, which can make the payment jump. Most HELOCs are variable-rate, so payments can also rise with the market. Datum tracks your drawn balance, available headroom, phase, and how the line sits against your home's equity — the full picture behind a single monthly minimum.`]
                ]);
            }

            if (!isStudentLoan) {
                html += _linkControlHTML(id, acc, base);   // §18.3 (consolidated) — link/draft control + prominent 🔗 status
            }
            
            html += `
            <div class="field-row">
                <div>${_dLbl(base, 'Current Balance', 'What you still owe', 'The payoff figure today — what it\'d take to clear this loan right now, before any more interest. This is the number the estate subtracts from your net worth.', 'color:var(--gold);')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.value?.toString()||'')}" oninput="updateValueWithoutRender('${id}', this.value)"></div>
                <div>${_dLbl(base, 'Original Amount', 'Where it started', 'The loan\'s opening balance. We compare it to today\'s balance to show how much house you\'ve bought back from the bank.', '', 'right')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.origAmount||'')}" oninput="updateAccField('${id}', 'origAmount', this.value)"></div>
            </div>
            ${String(base.id).indexOf('mortgage') === 0 ? `<div class="field-row">
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">Interest Paid to Date<div class="modal-tt" style="left:0; right:auto;"><strong>from your statement · optional</strong>The total interest you&rsquo;ve paid since this loan began &mdash; copy it straight off your latest mortgage statement. It&rsquo;s the one figure Datum can&rsquo;t compute for you: it turns on the exact timing of every past payment, which only your statement knows. Enter it and Datum reads it back in the payoff story and lights the gold &ldquo;Interest Paid&rdquo; slice in the donut. Leave it blank and we simply won&rsquo;t guess &mdash; nothing here is ever invented.</div></span><input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.interestPaidToDate||'')}" oninput="updateAccField('${id}', 'interestPaidToDate', this.value)"></div>
            </div>` : ''}
            ${base.title === 'HELOC' ? _helocLimitFieldHTML(id, acc) : ''}
            ${base.title === 'HELOC' ? _helocPhaseFieldHTML(id, acc) : ''}
            ${base.title === 'HELOC' ? _helocDrawEndFieldHTML(id, acc) : ''}
            ${base.title === 'HELOC' ? _helocUsePurposeFieldHTML(id, acc) : ''}
            <div class="field-row">
                <div>${_dLbl(base, 'Interest Rate (APR) %', 'Your cost of borrowing', 'The yearly rate the lender charges. On a mortgage even half a point, over 30 years, is real money — it\'s the biggest lever on lifetime cost.')}<input type="number" class="small-field" placeholder="0" value="${acc.intRate||''}" oninput="updateAccField('${id}', 'intRate', this.value)"></div>
                <div>${_dLbl(base, 'Rate Type', 'Locked or moving', 'Fixed = this rate never changes. Variable/ARM = it can reset up or down on a schedule. Pick Variable to reveal the index, margin, and caps that govern the moves.', '', 'right')}
                    <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'rateType', this.value)">
                        <option value="Fixed" ${acc.rateType==='Fixed'?'selected':''}>Fixed</option>
                        <option value="Variable" ${acc.rateType==='Variable'?'selected':''}>Variable</option>
                    </select>
                </div>
            </div>
            ${base.title === 'Mortgage' ? `<div id="modal-moat-liverate-${id}">${_moatLiveRateHTML(id, acc)}</div>` : ''}
            ${_variableRateClusterHTML(id, acc)}
            <div class="field-row">
                <div>${_dLbl(base, 'Origination Date', 'The day it started', 'When the loan was funded. Sets the amortization clock we use to estimate your payoff date.')}<input type="date" class="small-field" value="${acc.origDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'origDate', this.value)"></div>
                <div>${_dLbl(base, 'Maturity Date', 'The finish line', 'The contractual payoff date if you only ever pay the minimum. Extra payments beat this date; we\'ll show how much sooner.', '', 'right')}<input type="date" class="small-field" value="${acc.maturityDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'maturityDate', this.value)"></div>
            </div>
            <div class="field-row"${base.title === 'Mortgage' ? '' : ' style="grid-template-columns: 1fr;"'}>
                <div>${_dLbl(base, 'Next Payment Date', 'The clock\'s start', 'We count the payoff timeline from here. Setting it keeps the estimated payoff date honest.')}<input type="date" class="small-field" value="${acc.nextPmtDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'nextPmtDate', this.value)"></div>
                ${base.title === 'Mortgage' ? `<div>${_dLbl(base, 'Term (months)', 'The full length of the loan', 'How many months the loan runs in total — 360 for a 30-year, 240 for a 20, 180 for a 15. We use it to place today on the loan\'s timeline and to draw the complete schedule from the day it began.', '', 'right')}<input type="number" min="0" class="small-field" placeholder="0" value="${acc.termMonths||''}" oninput="updateAccField('${id}', 'termMonths', this.value)"></div>` : ''}
            </div>
            <div class="field-row">
                <div>${_dLbl(base, 'Minimum Payment', 'The required amount', 'Your contractual principal + interest each month. Escrow (taxes/insurance) may be collected on top — see the escrow fields.')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.minPmt||'')}" oninput="updateAccField('${id}', 'minPmt', this.value)"></div>
                <div>${_dLbl(base, 'Additional Payment', 'Your accelerator', 'Anything you add on top of the minimum goes straight at principal — it shrinks both the payoff clock and the lifetime interest. Even a little compounds.', '', 'right')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.addPmt||'')}" oninput="updateAccField('${id}', 'addPmt', this.value)"></div>
            </div>
            ${String(base.id).indexOf('mortgage') === 0 ? `<div id="modal-moat-negam-${id}">${_moatNegAmInlineHTML(acc)}</div>` : ''}
            ${base.title === 'HELOC' ? `<div id="modal-heloc-draw-${id}">${_helocDrawInlineHTML(acc)}</div>` : ''}`;

            // §20.1 (Commit 6) — the "what would extra do?" calculator lands HERE, between the payment fields
            // above and the pay-down-vs-invest panel below: you ask the what-if right under the lever, and the
            // panel that argues the tradeoff reads immediately after the number it is arguing about.
            if (base.title === 'Mortgage') html += _moatLumpBlockHTML(id, acc);

            // §20 #8 — the pay-down-vs-invest panel moves UP to sit directly under the payment fields, where
            // the decision is actually made (the Additional Payment box is the lever the panel argues about).
            // It used to close the modal, hundreds of pixels below the field it speaks to. Verbatim §15 copy (Mortgage Copy Bank R70)
            // — RELOCATION ONLY, not one character of the panel changed (LOCK-3). Reuses _diWhyPanel (L48).
            if (base.title === 'Mortgage') {
                html += _diWhyPanel('Should you pay it down, or invest the difference?', [
                    ['The mortgage-vs-invest tension', 'A mortgage is the cheapest large loan most people ever get, and it\'s secured by an asset that can grow. That creates the classic tension: a guaranteed return equal to your rate (pay it down) versus an uncertain, historically-higher return (invest the difference). At a low fixed 3%, the math often favors investing — that cheap, locked-in rate is hard to pass up, and your dollars have historically earned more in the market than they\'d save against the loan. At a high 8% (or a variable rate that could climb), the reverse is usually true: paying it down is a guaranteed 8% return with zero risk — very hard to beat reliably anywhere else, so accelerating the payoff often wins. And closer to retirement, a paid-off house lowers the income you must generate every month for the rest of your life. There\'s also the part no spreadsheet captures: for some people, owning the home free and clear is worth more than the last dollar of return. Datum shows you both numbers and both truths. The choice is yours.']
                ]);
            }

            // §0.3/§0.3b/§4.1 ESCROW — mortgage-only, one labeled section: header + plain-coach definition
            // + the three grouped fields (always visible so escrow is discoverable/enterable) + a computed
            // footer that is sourced-or-blank (hidden until a value is entered — no empty numeric shell).
            if (base.title === 'Mortgage') {
                html += `
            <div style="margin-top:16px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">
                <div style="color:var(--teal-mid); font-weight:bold; font-size:13px; margin-bottom:6px;">🏦 Escrow — the monthly bundle</div>
                <div style="font-size:11px; color: rgba(255,255,255,0.6); line-height:1.45; margin-bottom:12px;">Escrow is the slice of your monthly payment that isn't principal or interest — your lender collects property taxes, homeowner's insurance, and (if you're under ~20% equity) PMI, then pays those bills for you. It's real money you owe every month, just not to the loan itself.</div>
                <div id="modal-escrow-fields-${id}">${_moatEscrowFieldsHTML(id, acc, base)}</div>
                <div id="modal-escrow-foot-${id}" style="display:${hasEscrow(acc)?'block':'none'}; font-size:11px; color: rgba(255,255,255,0.72); line-height:1.5; margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px;">${_escrowFooter(acc)}</div>
            </div>`;
                html += '<div id="modal-pmi-bar-' + id + '">' + _moatPmiBarHTML(id, acc) + '</div>';   // §18.9 — always-present container so the bar can appear / update / vanish live
                // §21.4 — the two deductibility inputs sit directly under escrow, where the other tax-flavoured
                // figures (property tax, insurance) already live, so the whole tax picture reads in one place.
                html += _moatTaxFieldsHTML(id, acc);
            }

            html += `
            <div style="margin-top:20px; padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;">
                `;
            
            if(acc.linkedAssetId && !isStudentLoan) {
                let linkedAsset = state.accounts.find(a => a.id === acc.linkedAssetId);
                if(linkedAsset) {
                    let equity = (linkedAsset.value || 0) - (acc.value || 0);
                    html += `
                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="input-label" style="color:var(--teal-mid);">Net Equity (Asset — Debt)</span>
                        <span id="modal-calc-equity-${id}" style="font-family: var(--font-mono); color: ${equity >= 0 ? 'var(--teal-mid)' : 'var(--danger)'}; font-weight:bold;">$${equity.toLocaleString('en-US')}</span>
                    </div>`;
                }
            }

            html += `
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">
                    ${_sumLbl(base, base.title === 'Mortgage' ? 'Total Monthly Mortgage Payment' : 'Total Monthly Payment', 'The core payment', 'Principal and interest only — the core of what you owe the lender each month, before taxes and insurance.', 'var(--white)')}
                    <span id="modal-calc-pmt-${id}" style="font-family: var(--font-mono); color: var(--danger); font-weight:bold;">$${calculateTotalPmt(acc).toLocaleString('en-US')}</span>
                </div>
                <div id="modal-real-monthly-${id}">${_moatRealMonthlyHTML(id, acc)}</div>
                <div style="display:flex; justify-content: space-between;">
                    <span class="input-label" style="color:var(--teal-mid);">Expected Payoff Date</span>
                    <span id="modal-calc-payoff-${id}" style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold; font-size:14px;">${_debtPayoffDisplay(acc)}</span>
                </div>
                <div id="modal-payoff-intel-${id}">${_payoffIntelHTML(id, acc)}</div>
            </div>
            `;
            // §15 education panel (Mortgage Copy Bank §15 R70) RELOCATED by §20 #8 — it now renders directly
            // under the payment fields, above the escrow section. §3b doctrine is embodied across the wired
            // surfaces (equity · fixed-vs-variable · all-in monthly · accelerate-vs-invest), not printed
            // as meta-text — flagged for Captain.
        } else if (base.taxCode === 'physical' && !base.id.includes('collectibles')) {
            html += _linkControlHTML(id, acc, base);   // §18.3 (consolidated) — link/draft control + prominent 🔗 status

            // ── THE GROUNDS (Real Estate) — §1 DI/signals + §5 toggles + §4 carrying-cost block (Grounds).
            if (_isGrounds(base)) {
                var showCarry = acc.showCarryCosts !== false;   // §5.1 default ON
                /* §26.2 — the insurance section's own toggle. DEFAULT ON, matching showCarryCosts:
                   a file that predates this section has no `showInsurance` key, and defaulting OFF
                   would hide nine live fields a user had already filled in behind a switch they never
                   knew existed. `!== false` reads a missing key as ON, so nothing recorded before
                   tonight goes quiet. Same shape the carrying toggle already uses (L48). */
                var showIns = acc.showInsurance !== false;
                /* §28.1 — the upkeep section's own toggle. `!== false` DELIBERATELY, matching the two
                   above exactly. There is no schema-version story in this file: every one of these
                   flags works by the habit that a missing key reads as ON. The day someone writes
                   `=== false` instead, every blueprint predating that field changes behaviour
                   silently. If you add a flag here, MATCH THE HABIT — do not improve it alone. */
                var showUpkeep = acc.showUpkeep !== false;
                var inDB = acc.includeDatumBuilder !== false;    // §5.3 default ON
                var maintPH = _groundsMaintDefault(acc);
                html += `
            <div class="di-narrative">
                <div class="di-narr-head">Datum Intelligence</div>
                <div id="modal-grounds-di-${id}">${_groundsSignalsHTML(id, acc) || _GROUNDS_DI_EMPTY}</div>
            </div>
            ${/* §26.1 — THE EQUITY PANEL MOVES HERE (Captain item 1, ruled at bank A328). It sat below
                  the carrying-cost toggle, which put the vocabulary AFTER the work was already done.
                  Authored order is INSIGHT → VOCABULARY → INPUT: the DI block above speaks about THIS
                  property's numbers, this panel explains the concepts behind them, and Property
                  details below is where the user then types. Placement only — not one word changed. */''}
            ${_diWhyPanel('What is home equity — and why owning isn\'t free', [
                ['Home equity + carrying cost', 'Home equity is your value minus what you owe. But owning isn\'t free — taxes, insurance, and upkeep run every year whether or not you have a mortgage. Planning for those is what keeps a paid-off home affordable.']
            ])}
            <div style="margin-bottom:16px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">
                ${/* §27.2 (bank A342) — THE VALUE GETS ITS OWN WINDOW, AT THE TOP, ALWAYS VISIBLE.
                      ⚠️ MOVED HERE 2026-08-08 ON THE CAPTAIN'S SECOND LOOK. It was first wired to his
                      verbatim placement — "right of the Property Address copy, above the
                      refresh/get-estimate button" — which sits inside `if (acc.useValueApi === true)`.
                      That block only renders once the estimate toggle is ON, so for anyone who never
                      turns it on the value was STILL only on the left card, which is the exact
                      complaint §27.2 exists to answer. A field that answers "where do I set this?"
                      cannot be behind a switch the user has to find first.
                      ⛔ ONE NUMBER, TWO SURFACES — a second WINDOW onto acc.value, NOT a second field,
                      so it can never double-count. Reuses the card's exact seams (L48, no fork):
                      `curr-format` IS §21.3's letter refusal (delegated listener — keystroke, paste
                      AND read), formatCurrencyDisplay for the mark, and onFrontValueEdit so both
                      windows share ONE write path and ONE guard.
                      BLANK, NEVER $0, when nothing is recorded — the card renders it the same way and
                      §27.1's buttons turn on the very same distinction. */''}
                <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:10px;">
                    <div style="color:var(--teal-mid); font-weight:bold; font-size:13px; white-space:nowrap;">🏠 Property details</div>
                    <div class="propval-wrap modal-tt-wrap" style="cursor:help; position:relative;">
                        <span class="propval-label">Property value</span>
                        <input type="text" id="modal-propval-${id}" class="propval-field curr-format" placeholder="$0" value="${acc.value ? formatCurrencyDisplay(acc.value) : ''}" onfocus="this.select()" oninput="onFrontValueEdit('${id}', this)">
                        <div class="modal-tt" style="left:auto; right:0;"><strong>Property value</strong>What you believe this property is worth today. This is the same figure shown on your property card — change it in either place and both update. If you accept an automated estimate, it replaces this number.</div>
                    </div>
                </div>
                <div class="field-row" style="grid-template-columns:1fr;">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Property name<div class="modal-tt" style="left:0; right:auto;"><strong>Property name</strong>A nickname just for you — ‘My Pad’, ‘Lake cabin’, ‘Rental #1’. It only labels this card; it changes no math. Handy once you hold more than one place heading into retirement.</div></span><input type="text" class="small-field" placeholder="e.g. My Pad" value="${String(acc.propName||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'propName', this.value)"></div>
                </div>
                <div class="field-row">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Property purpose<div class="modal-tt" style="left:0; right:auto;"><strong>Property purpose</strong>What is the purpose of this place — Primary residence, Second home, Rental, Land. It shapes how we read the home later: a primary you’ll likely live in, a rental throws off income, land just sits. No number moves yet — it’s context for your plan.</div></span><select class="small-field" style="background: var(--bg-navy); color:white;" onchange="updateAccField('${id}', 'propPurpose', this.value)"><option value="">Select purpose…</option>${['Primary residence','Second home','Rental property','Land','Other'].map(function(o){return '<option '+(acc.propPurpose===o?'selected':'')+'>'+o+'</option>';}).join('')}</select></div>
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Property type<div class="modal-tt" style="right:0; left:auto;"><strong>Property type</strong>What kind of home this is — a single-family house, condo, townhouse, and so on. It hints at the upkeep and fees behind the walls: condos and townhomes often carry HOA dues, single-family means you own the whole bill. Worth seeing as you weigh what’s easy to hold in retirement.</div></span><select class="small-field" style="background: var(--bg-navy); color:white;" onchange="updateAccField('${id}', 'propType', this.value)"><option value="">Select type…</option>${['Single-family','Condo','Townhouse','Multi-family','Manufactured','Other'].map(function(o){return '<option '+(acc.propType===o?'selected':'')+'>'+o+'</option>';}).join('')}</select></div>
                </div>
                <div class="field-row" style="grid-template-columns:1fr;">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Street address<div class="modal-tt" style="left:0; right:auto;"><strong>Street address</strong>The street line of the home. We check it’s a real, findable US address before we ever look up a value — no guessing, no wasted lookups on a typo.</div></span><input type="text" class="small-field" placeholder="123 Main St" value="${String(acc.propStreet||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'propStreet', this.value); _groundsSyncAvmAddr('${id}')"></div>
                </div>
                <div class="field-row" style="grid-template-columns: 2fr 1fr 1fr;">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">City<div class="modal-tt" style="left:0; right:auto;"><strong>City</strong>The city or town. Part of confirming this is a real address before any value lookup runs.</div></span><input type="text" class="small-field" placeholder="City" value="${String(acc.propCity||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'propCity', this.value); _groundsSyncAvmAddr('${id}')"></div>
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">State<div class="modal-tt" style="left:0; right:auto;"><strong>State</strong>The state. US only for now — that’s where our free address check and value estimates work.</div></span><input type="text" class="small-field" placeholder="ST" maxlength="2" value="${String(acc.propState||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'propState', this.value.toUpperCase()); _groundsSyncAvmAddr('${id}')"></div>
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">ZIP code<div class="modal-tt" style="right:0; left:auto;"><strong>ZIP code</strong>The 5-digit ZIP. It sharpens the address check and the value estimate to the right neighborhood.</div></span><input type="text" class="small-field" placeholder="00000" maxlength="5" inputmode="numeric" value="${String(acc.propZip||'').replace(/[^0-9]/g,'')}" oninput="this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', 'propZip', this.value); _groundsSyncAvmAddr('${id}')"></div>
                </div>
                <div class="field-row">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Bedrooms<div class="modal-tt" style="left:0; right:auto;"><strong>Bedrooms</strong>How many bedrooms. A detail that helps size up the home — bigger homes often mean bigger carrying costs, worth seeing as you plan whether to keep, rent, or downsize in retirement.</div></span><select class="small-field" style="background: var(--bg-navy); color:white;" onchange="updateAccField('${id}', 'propBeds', this.value)"><option value="">Select…</option>${['Studio','1 Bed','2 Beds','3 Beds','4 Beds','5 Beds','6+ Beds'].map(function(o){return '<option '+(acc.propBeds===o?'selected':'')+'>'+o+'</option>';}).join('')}</select></div>
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Bathrooms<div class="modal-tt" style="right:0; left:auto;"><strong>Bathrooms</strong>How many bathrooms. Part of the home’s profile — small detail now, useful context when you weigh keeping vs. downsizing later.</div></span><select class="small-field" style="background: var(--bg-navy); color:white;" onchange="updateAccField('${id}', 'propBaths', this.value)"><option value="">Select…</option>${['1 Bath','1.5 Baths','2 Baths','2.5 Baths','3 Baths','3.5 Baths','4+ Baths'].map(function(o){return '<option '+(acc.propBaths===o?'selected':'')+'>'+o+'</option>';}).join('')}</select></div>
                </div>
                <div class="field-row">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Living area (sq.ft.)<div class="modal-tt" style="left:0; right:auto;"><strong>Living area (sq.ft.)</strong>The finished square footage. A quick gauge of the home’s size and upkeep — square footage tends to track with maintenance, taxes, and heating/cooling, the carrying costs that follow you into retirement.</div></span><input type="text" class="small-field" placeholder="sq.ft." inputmode="numeric" value="${String(acc.propSqft||'').replace(/[^0-9]/g,'')}" oninput="this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', 'propSqft', this.value)"></div>
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Year built<div class="modal-tt" style="right:0; left:auto;"><strong>Year built</strong>The year the home was built. Older homes can carry bigger upkeep and insurance down the road — good to have in view when you’re planning what to hold long-term.</div></span><input type="text" class="small-field" placeholder="YYYY" maxlength="4" inputmode="numeric" value="${String(acc.propYear||'').replace(/[^0-9]/g,'')}" oninput="this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', 'propYear', this.value)"></div>
                </div>
                <div class="toggle-row modal-tt-wrap" style="border-bottom:none; padding-top:14px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.06);">
                    <span class="toggle-label" style="color:var(--muted);">Estimate this home's value</span>
                    <label class="switch"><input type="checkbox" ${acc.useValueApi === true ? 'checked' : ''} onchange="updateAccToggle('${id}', 'useValueApi', this.checked)"><span class="slider"></span></label>
                    <div class="modal-tt"><strong>Estimate this home's value</strong>Turn this on and Datum looks up an estimated market range for this address, tagged 'est.' Your own number always wins — we'll never overwrite it without asking.</div>
                </div>`;
                // §6/§6b valuation — now UNDER Property details (item 3), NOT inside carrying costs. Revealed
                // only when the toggle is ON; address joins the structured fields -> Census verify -> RentCast.
                if (acc.useValueApi === true) {
                    var _joinAddr = [acc.propStreet, acc.propCity, acc.propState, acc.propZip].map(function(s){return String(s||'').trim();}).filter(Boolean).join(', ');
                    var _addrComplete = ['propStreet','propCity','propState','propZip'].every(function(k){return String(acc[k]||'').trim();});
                    // Ask 2 — the persisted snapshot for THIS address, if we already own one. Its presence is
                    // what turns the control from "Get estimate" (R-default) into R153 "Refresh estimate": the
                    // free result is already on screen, so the only thing left to offer is a deliberate re-pull.
                    var _avmSnap = _groundsAvmFor(acc);
                    html += `
                <div style="margin-top:12px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.08);">
                    <span class="input-label modal-tt-wrap" style="cursor:help;">Property Address<div class="modal-tt" style="left:0; right:auto;"><strong>Property Address</strong>Add the property address to pull an automated value estimate — a starting point, not an appraisal. Your own number always wins.</div></span>
                    <div id="modal-avm-addrpreview-${id}" style="font-family:var(--font-mono); font-size:11px; color:rgba(255,255,255,0.6); margin-top:4px;">${_addrComplete ? _joinAddr.replace(/</g,'&lt;') : '— enter street, city, state &amp; ZIP above —'}</div>
                    <div style="text-align:right; margin-top:8px;"><button id="avm-getbtn-${id}" class="add-space-btn" style="width:auto; padding:4px 10px; border:none; background:transparent; border-bottom:1px dashed var(--teal-mid); color:var(--teal-mid);" onclick="groundsVerifyAndEstimate('${id}'${_avmSnap ? ', true' : ''})">${_avmSnap ? 'Refresh estimate' : 'Get estimate'}</button></div>
                    <div id="modal-avm-verify-${id}"></div>
                    <div id="modal-avm-result-${id}">${_avmSnap ? _groundsAvmResultHTML(id, _avmSnap) : ''}</div>
                </div>`;
                }
                html += _propRentalFieldsHTML(id, acc);   // §18.1 — '' on every purpose but Rental property
                html += `
            </div>
            ${/* ══ §26.2 · PROPERTY INSURANCE IS ITS OWN SECTION, BEFORE ANNUAL CARRYING COST ══════
                  Captain items 2 + 2a, ruled at bank A328. ⚠️ THIS SUPERSEDES §17.1's Group B: he
                  asked for a SECTION WITH ITS OWN TOGGLE and the bank authored it as a labelled group
                  inside carrying costs. Groups A (Carrying) and C (Operating) stay exactly where they
                  are — only the insurance group is promoted out.
                  ⛔ THE ARITHMETIC MUST NOT MOVE. calcCarryTotal still sums the SAME five fields,
                  homeInsYr among them, so the total is unchanged at $16,800 on the fixture. The field
                  moved surfaces; it did not leave the sum. That is asserted, not commented. */''}
            <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                <span class="toggle-label" style="color:var(--teal-mid);">Show insurance details</span>
                <label class="switch"${''} ><input type="checkbox" ${showIns ? 'checked' : ''} onchange="updateAccToggle('${id}', 'showInsurance', this.checked)"><span class="slider"></span></label>
                <div class="modal-tt"><strong>Show insurance details</strong>Your policy type, coverage limits and deductibles, kept in one place. Open it when you want to record what you are actually covered for — leave it closed and nothing here is required.</div>
            </div>`;
                if (showIns) {
                    html += `
            <div style="margin-top:14px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">
                <div style="color:var(--teal-mid); font-weight:bold; font-size:13px; margin-bottom:2px;">Property Insurance</div>
                <div class="input-label" style="color:var(--muted); font-size:11px; margin-bottom:10px; text-transform:none;">What protects the home and you — separate from what it costs to keep.</div>
                ${/* §26b authored order, items 3-11. */''}
                ${_propTypeInsuranceDI(acc)}
                ${_propInsEducationHTML(acc)}
                <div class="field-row">
                    ${_carryMirrorField(id, acc, 'insAnnual', 'homeInsYr', 'Annual Homeowner Insurance', 'Homeowners insurance', 'What you pay each year to insure the home itself against damage — separate from the mortgage. Enter your policy\'s annual premium.', 'left')}
                </div>
                ${_propCoverageHTML(id, acc)}
                ${_propEndorsementsHTML(id, acc)}
                ${_propNfipPanelHTML()}
                ${_propHazardCoverageHTML(id, acc)}
                ${_propHazardHTML(acc)}
            </div>`;
                }
                /* §28.1 — OPERATING UPKEEP sits BELOW Property Insurance and ABOVE Annual Carrying
                   Cost (bank A344/A346), which is the order the Captain asked for and also the order
                   the arithmetic reads in: record the bills, then see them land in the total. */
                html += _propUpkeepSectionHTML(id, acc, showUpkeep);
                html += `
            <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                <span class="toggle-label" style="color:var(--teal-mid);">Show carrying costs</span>
                <label class="switch"><input type="checkbox" ${showCarry ? 'checked' : ''} onchange="updateAccToggle('${id}', 'showCarryCosts', this.checked)"><span class="slider"></span></label>
                <div class="modal-tt"><strong>Carrying costs</strong>Everything it costs simply to keep this property — taxes, insurance, upkeep, and the small recurring bills — separate from any loan payment.</div>
            </div>`;
                // §15 education panel — MOVED UP to sit between the DI block and Property details
                // (§26.1, Captain item 1). The old call site was here; it renders ONCE, higher up.
                if (showCarry) {
                    html += `
            <div style="margin-top:14px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">
                <div style="color:var(--teal-mid); font-weight:bold; font-size:13px; margin-bottom:10px;">🧾 Annual Carrying Cost</div>
                ${/* ══ §17.1 · THE FLAT CARRYING-COST LIST BECOMES THREE LABELLED GROUPS ══════════════════
                      Authored 2026-07-25, wired 2026-08-06. A PURE REGROUP: no math change, no field added
                      or removed, and calcCarryTotal (studio.html ~9867) still sums the SAME five fields
                      exactly once each — propTax, homeIns, maint, hoa, util. If this edit ever changes the
                      TOTAL, it has gone wrong; the total line below is unmoved and unmodified on purpose.
                      ORDER IS AUTHORED, NOT ARBITRARY: A Carrying -> B Insurance -> C Operating. Insurance
                      sits ABOVE Operating because Group B is the anchor the rest of §17 hangs off — §17.2
                      education, §17.3 Coverage A-F, §17.4 endorsements and §17.5 flood/quake all land
                      inside it. Putting it last would bury the section under the utility bill.
                      WHY THE GROUP HEADERS ARE ONE UNBROKEN TEXT NODE: the §17 winner-gate asserts these
                      authored strings in the ACTUALLY-SERVED BYTES. Splitting "Carrying Costs" from its
                      "— what you owe..." clause across two styled spans would render identically and make
                      the literal ungreppable, so the gate would be asserting a string the page never
                      contains as one piece. Style the line, never fracture the sentence. */''}
                <div class="carry-group-label" style="color:var(--muted); font-size:11px; letter-spacing:0.03em; margin:2px 0 8px;">Carrying Costs — what you owe to keep the home.</div>
                <div class="field-row">
                    ${_carryMirrorField(id, acc, 'propTaxAnnual', 'propTaxYr', 'Property Tax (yr)', 'Property tax', 'Your yearly property tax, set by your local assessor. Enter your bill amount — it can change each year as assessments and rates do.', 'left')}
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">HOA / Condo Fees (yr)<div class="modal-tt" style="right:0; left:auto;"><strong>HOA / condo dues</strong>Yearly dues for a homeowners or condo association, where you have one. Leave it blank if this home has none.</div></span><input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.hoaYr||'')}" oninput="updateAccField('${id}', 'hoaYr', this.value)"></div>
                </div>
                ${/* §26.2 — THE INSURANCE GROUP HAS BEEN PROMOTED OUT to its own toggled section
                      ABOVE this one. Everything that used to sit here between Group A and Group C now
                      lives there; Groups A and C are untouched, as the bank required.
                      ⛔ THE ANNUAL HOMEOWNER INSURANCE FIGURE HAS NOT LEFT THE TOTAL. calcCarryTotal
                      still sums homeInsYr, so the Total below is unchanged. The read-only line
                      immediately under Operating Costs is what keeps that honest: without it the
                      total would exceed the numbers visible in this section and nobody could
                      reconcile it. A total that cannot be added up from what is on screen is the
                      same family of harm as a silently inflated one. */''}
                <div class="carry-group-label" style="color:var(--muted); font-size:11px; letter-spacing:0.03em; margin:16px 0 8px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05);">Operating Costs — what it takes to run the home day to day.</div>
                <div class="field-row">
                    ${_upkeepMirrorField(id, acc, 'services', 'maintYr', 'Est. Maintenance / Repairs (yr)', 'est. · ~1% of value', "A rough estimate — about 1% of the home's value is a common rule of thumb. It's only a starting point; your own number always wins.", 'left')}
                    ${_upkeepMirrorField(id, acc, 'utilities', 'utilYr', 'Utilities — electric / gas / water (yr)', 'Link or enter', 'The recurring bills to keep the lights on and water running — electric, gas, water. Link an account to keep it current, or enter your own yearly figure.', 'right')}
                </div>
                ${/* ══ §27.3 · THE FIFTH BOX — Total Property Insurance (yr) ═══════════════════════════
                      Bank A342. ⭐ THIS REPLACES THE OLD RECONCILING SENTENCE, and it is a strict
                      improvement on it for a reason worth recording: that line read `acc.homeInsYr`
                      DIRECTLY while calcCarryTotal has always used `_canonHomeIns`. On a home whose
                      linked mortgage carries insurance in escrow, homeInsYr is blank — so the line
                      HID ITSELF while the total still included the escrow figure. Money in the total
                      that appeared on no screen: precisely the bug this section exists to prevent,
                      living inside the sentence written to prevent it.
                      STYLED AS THE FIFTH BOX, not a footnote, because the Captain's acceptance test
                      is arithmetic he can do with his eyes: Property Tax + HOA + Maintenance +
                      Utilities + THIS = the total, exactly.
                      ⛔ READ-ONLY AND COMPUTED. The user edits the parts; a second input bound to
                      these keys would go stale the moment the first was typed into (§13.72).
                      ⛔ A DASH WHEN NOTHING IS RECORDED, NEVER $0 (row 205) — a blank policy and a
                      policy costing zero are opposite facts. Partial entries still total, blanks
                      contributing nothing, exactly as §4.16 treats them. */''}
                ${/* ⚠️ THE SEPARATOR IS NOT DECORATION. Without it this box renders directly beneath
                      the "Operating Costs — what it takes to run the home day to day" subhead and
                      reads as a MEMBER of Group C. Insurance is not an operating cost — §17.1
                      authored three groups (A Carrying / B Insurance / C Operating) specifically to
                      keep those apart, and §26.2 then promoted Insurance out to its own section.
                      This box is a RECONCILING ROW for the whole block, the same role the sentence
                      it replaced played, so it carries the same rule the sentence did.
                      Caught by looking at a screenshot; every DOM assertion was green. */''}
                <div class="field-row" style="grid-template-columns:1fr; margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.13);">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Total Property Insurance (yr)<div class="modal-tt" style="left:0; right:auto;"><strong>Total Property Insurance (yr)</strong>Everything you pay each year to insure this property — your homeowner policy plus any endorsements, flood or earthquake cover you have recorded above. Edit the individual figures under Property Insurance; this box adds them up.</div></span><input type="text" class="small-field" readonly value="${_propInsuranceTotal(acc) > 0 ? '$' + Math.round(_propInsuranceTotal(acc)).toLocaleString('en-US') : '—'}" style="color:${_propInsuranceTotal(acc) > 0 ? 'rgba(255,255,255,0.75)' : 'var(--muted)'}; cursor:default;"></div>
                </div>
                <div style="display:flex; justify-content: space-between; margin-top:10px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px;">
                    <span class="input-label" style="color:var(--white);">Total Annual Carrying Cost</span>
                    <span id="modal-carry-total-${id}" style="font-family: var(--font-mono); color: var(--teal-mid); font-weight:bold;">$${Math.round(calcCarryTotal(acc)).toLocaleString('en-US')}</span>
                </div>
                <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-top:12px; padding-bottom:12px;">
                    <span class="toggle-label" style="color:var(--muted);">Include in Datum Builder</span>
                    <label class="switch"><input type="checkbox" ${inDB ? 'checked' : ''} onchange="updateAccToggle('${id}', 'includeDatumBuilder', this.checked)"><span class="slider"></span></label>
                    <div class="modal-tt"><strong>Retirement-spend rollup</strong>Includes this asset's carrying cost in your future Datum Builder spending number. Turn off to exclude a specific asset.</div>
                </div>
            </div>`;
                }
                // §16.1b editable CLTV cap override (Property Copy Bank §16.1 GUARD / R167). Shows only when a
                // lien is linked (i.e. exactly when the §16.1 CLTV beat fires). Blank keeps the labeled ~80%
                // typical default; a value recomputes untapped borrowing + the near-ceiling threshold off the
                // user's own cap. Clamped 0–100. Sourced-or-blank (L47).
                if (_groundsLinkedDebt(id) > 0) {
                    html += `
            <div class="field-row" style="grid-template-columns: 1fr; margin-top:10px;">
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">Lender CLTV Cap (%)<div class="modal-tt" style="left:0; right:auto;"><strong>A typical assumption — set your own</strong>Most lenders cap total borrowing against a home near 80% of its value (some allow 85% or more). We use ~80% as a typical default to estimate your untapped borrowing power. Enter your lender's actual cap to make it exact, or leave it blank to keep the ~80% typical.</div></span><input type="number" min="0" max="100" step="1" class="small-field" placeholder="80 (typical)" value="${acc.cltvCapPct||''}" oninput="enforceNumRange(this, 0, 100); updateAccField('${id}', 'cltvCapPct', this.value)"></div>
            </div>`;
                }
            /* ══ §33.1 + Garage §3.6 · THE VEHICLE FIELD PAIR — THE AXIS EVERYTHING ELSE HANGS ON ══
             * This `else` IS the Vehicle room. Until now the branch above claimed the whole
             * `physical && !collectibles` arm for The Grounds, so a Vehicle fell straight through to
             * the universal Interest/COLA/Notes tail — which is exactly the emptiness §33.0 describes:
             * "two universal toggles, a liability link dropdown, and Purpose / Notes. THAT IS ALL."
             *
             * ⭐ THE MIGRATION GUARANTEE IS TRUE BY CONSTRUCTION HERE, NOT BY CAREFUL WIRING. Neither
             * field existed in studio.html before this commit (Wirer-verified 2026-08-13: zero hits
             * for vehicleType / ownershipStatus / Owned outright / Financed / Leased), so NO SAVED
             * FILE CARRIES EITHER KEY. Blank is not a migration case to be handled — it is the only
             * state any existing Driveway can be in. ⛔ And nothing reads these values yet: the §25.1
             * name map, the type-specific fields and the beats are all later commits, deliberately,
             * so this commit CANNOT change a single rendered pixel outside the modal.
             * ⛔ NEVER AUTO-SELECT A TYPE FROM THE VEHICLE'S NAME OR VALUE (§33.1).
             *
             * ⛔⛔ 'LEASED' IS DELIBERATELY ABSENT FROM THE OWNERSHIP DROPDOWN, AND THAT IS §38.7'S
             * OWN LAW APPLIED TO OURSELVES: "DO NOT SHIP A CHOOSABLE OPTION WITH NO ENGINE BEHIND
             * IT." §39 authors what a lease must suppress — value, equity, depreciation, the
             * underwater beat, the lien link, the Garage — and none of that lands until a later
             * commit. Shipping the option now would let a user declare a lease and have it counted
             * as an owned asset at full value in their net worth: THE EXACT FALSE NUMBER §39 EXISTS
             * TO PREVENT, and the one §38.7 mistakenly believed was already live. The option arrives
             * WITH its engine, in the same commit, or not at all. */
            } else {
                var _vType = acc.vehicleType || '';
                var _vOwn  = acc.ownershipStatus || '';
                /* Value === label, matching trustType and propPurpose — the stored string IS the
                   authored word, so §25.1's name map stays readable against the bank (L48). */
                var _vTypeOpts = ['Car / Truck / SUV', 'Boat', 'RV or Camper', 'Motorcycle', 'Other'];
                var _vOwnOpts  = ['Owned outright', 'Financed'];   // 'Leased' rides §39 — see above
                var _opt = function (list, cur) {
                    return '<option value="" ' + (!cur ? 'selected' : '') + '>— not set —</option>' +
                      list.map(function (o) {
                        return '<option value="' + o + '" ' + (cur === o ? 'selected' : '') + '>' + o + '</option>';
                      }).join('');
                };
                html += `
            <div class="field-row" style="grid-template-columns: 1fr 1fr;">
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">Vehicle type<div class="modal-tt" style="left:0; right:auto;"><strong>Vehicle type</strong>What kind of vehicle this is. It changes what this room asks you about &mdash; a boat has a slip, an RV has storage, a car has neither.</div></span>
                    <select class="small-field" style="background: var(--bg-navy); width:100%;" onchange="updateAccField('${id}', 'vehicleType', this.value)">${_opt(_vTypeOpts, _vType)}</select></div>
                <div><div class="input-label">Ownership status</div>
                    <select class="small-field" style="background: var(--bg-navy); width:100%;" onchange="updateAccField('${id}', 'ownershipStatus', this.value)">${_opt(_vOwnOpts, _vOwn)}</select></div>
            </div>`;
                /* ══ §45.7 / Garage §3.1-§3.3 · THE IDENTITY BLOCK — TYPE-AWARE FROM BIRTH ══════════
                 * ⭐⭐ THE LABELS ARE §38.2 VERBATIM AND THEY SHIP *WITH* THE FIELDS, NOT AFTER THEM.
                 * The Architect's own instruction (§45.7): "DO NOT SHIP A VIN-ONLY FIELD SET AND
                 * RETROFIT THE BOAT LABELS IN 2c — that is precisely how the car-native surfaces got
                 * built in the first place, and it is the whole failure this arc exists to correct."
                 * A boat owner never sees the word VIN, not even for one release.
                 *
                 * ⛔⛔ NO VIN-DECODE AFFORDANCE IS RENDERED — FOR ANY TYPE, NOT JUST BOATS. §38.2
                 * rules the decode must be HIDDEN on a boat because "vPIC cannot decode a HIN, and a
                 * field that promises auto-fill and cannot deliver is a broken promise, not a blank."
                 * ⭐ THAT LAW IS TYPE-BLIND TODAY: vPIC IS NOT WIRED AT ALL. Grepped 2026-08-13 —
                 * the only occurrence of "vPIC" in this file is a COMMENT at ~11656 about a Worker
                 * that fetches RentCast. There is no decode call, no endpoint, no Worker route.
                 * So Garage §3.1's lead ("Enter your VIN and we'll fill in the rest") and §3.2's
                 * ("Auto-filled from VIN, or typed") ARE NOT WIRABLE COPY YET — they describe an
                 * engine that does not exist, and printing either would promise a fill that never
                 * comes. Both are held for the commit that wires §2.1. These are HAND-TYPED RECORD
                 * FIELDS and the room says nothing else about them.
                 *
                 * ⭐ ONE STORED FIELD PER CONCEPT, LABEL SWAPS BY TYPE — §40.2's law applied twice:
                 * "the stored key is the concept; the label is the costume." A separate hinNumber
                 * would make a typed VIN VANISH the moment someone corrected the type to Boat.
                 * ⚠️ AND THE HONEST DIFFERENCE, FLAGGED NOT BURIED: §40.2's precedent swaps a label
                 * over DOLLARS, which are the same unit either way. `vehicleUsage` swaps over MILES
                 * vs ENGINE HOURS, which are NOT. A car at 45,000 miles switched to Boat reads
                 * "Engine hours 45,000" — a real number wearing the wrong unit. I chose the shared
                 * field because the value stays ON SCREEN and editable (the user can see and fix it),
                 * whereas a fork hides it entirely — the retained-value-no-surface trap. ⛔ THIS IS A
                 * DERIVED CALL FROM A PRECEDENT, NOT AN AUTHORED RULING. Architect may overrule.
                 *
                 * ⚠️ BLANK vehicleType TAKES THE CAR LABELS, and that is the shipped precedent, not a
                 * new choice: `_propRoomName` (~9820) resolves blank through `VEHICLE_ROOM_NAME[...]
                 * || shipped` to THE DRIVEWAY. §38.2 names "Other" explicitly but is SILENT on blank,
                 * and blank is not Other — blank is "not set", which is the COMMON path. Matching the
                 * name map keeps one answer to "what is a typeless vehicle?" instead of two.
                 *
                 * 🖊️ ✅ THE THREE MISSING HOVERS WERE AUTHORED AND ARE NOW WIRED (§46.3). They shipped
                 * bare for exactly one commit: §33.6's rule is "EVERY NEW FIELD GETS A HOVER — a
                 * field without a hover is a question with no context", and §33.6 authored only ONE
                 * of the three (Engine hours, row 419). I flagged the gap rather than inventing three
                 * house-voiced lines, and the Architect wrote them. ⛔ THE DEBT WAS RECORDED AT THE
                 * SITE, WHICH IS WHY IT WAS PAID — a gap named in chat is a gap that evaporates. */
                var _vIsBoat = _vType === 'Boat';
                var _vIdLabel = _vIsBoat ? 'HIN &mdash; hull identification number (optional)'
                              : (_vType === 'Other' ? 'Identification number (optional)' : 'VIN (optional)');
                var _vUseLabel = _vIsBoat ? 'Engine hours' : 'Current mileage';
                /* The ONLY authored hover in this block (§33.6 row 419, VERBATIM). It renders for a
                   boat and for a boat only, because that is the single case it was written about —
                   it would be false on a car, which has no engine-hour meter. */
                /* ⛔⛔ NOT ONE OF THESE HOVERS PROMISES AUTO-FILL, AND THAT IS THE POINT OF §46.3.
                 * Garage §3.1's lead ("Enter your VIN and we'll fill in the rest") and §3.2's
                 * ("Auto-filled from VIN, or typed") describe the vPIC decode, WHICH IS NOT WIRED —
                 * so neither could stand in as a hover. The Architect authored these instead, and
                 * banked the rule: A HOVER THAT PROMISES A FEATURE WE HAVE NOT BUILT IS A LIE WITH
                 * A DELIVERY DATE. ⭐ Each one instead tells the user THEY CAN JUST TYPE IT, which
                 * is the true affordance today.
                 * ⚠️ THE TOOLTIP TITLES ARE MECHANICAL TRUNCATIONS OF THE AUTHORED LABELS, not new
                 * copy — 'VIN (optional)' -> 'VIN'. The house convention is title === label, but the
                 * boat's label is a full sentence and bolding "(optional)" reads as noise. No word
                 * appears in a title that is not already in its label. */
                var _vIdTT = _vIsBoat
                    ? ['HIN', 'Your HIN &mdash; the hull number, usually on the transom. It&rsquo;s optional; you can type the year, make and model yourself instead.']
                    : (_vType === 'Other'
                        ? ['Identification number', 'An identification number, if this vehicle has one. Optional.']
                        : ['VIN', 'Your VIN, if you have it handy. It&rsquo;s optional &mdash; you can type the year, make and model yourself instead.']);
                /* §33.6 row 419 VERBATIM for the boat; §46.3 for every other type. Two authors, one
                   field — which is exactly why the ENGINE HOURS string must not be touched here. */
                var _vUseTT = _vIsBoat
                    ? ['Engine hours', 'A boat&rsquo;s odometer. Hours on the engine move resale value more than the model year does.']
                    : ['Current mileage', 'Roughly how many miles it has on it. Useful context for what it&rsquo;s worth and what it costs to keep.'];
                var _vTT = function (pair, align) {
                    var pos = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';
                    return '<div class="modal-tt" style="' + pos + '"><strong>' + pair[0] + '</strong>' + pair[1] + '</div>';
                };
                html += `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">${_vIdLabel}${_vTT(_vIdTT, 'left')}</span>
                    <input type="text" class="small-field" placeholder="&mdash;" value="${String(acc.vehicleIdNum||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'vehicleIdNum', this.value)"></div>
            </div>
            <div class="field-row" style="grid-template-columns: 1fr 1fr;">
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">Year / Make / Model / Trim<div class="modal-tt" style="left:0; right:auto;"><strong>Year / Make / Model / Trim</strong>What it is. This is identity, not value &mdash; it doesn&rsquo;t change what the vehicle is worth in your estate.</div></span>
                    <input type="text" class="small-field" placeholder="&mdash;" value="${String(acc.vehicleYmm||'').replace(/"/g,'&quot;')}" oninput="updateAccField('${id}', 'vehicleYmm', this.value)"></div>
                <div><span class="input-label modal-tt-wrap" style="cursor:help;">${_vUseLabel}${_vTT(_vUseTT, 'right')}</span>
                    <input type="text" class="small-field" placeholder="&mdash;" inputmode="numeric" value="${String(acc.vehicleUsage||'').replace(/[^0-9]/g,'')}" oninput="this.value=this.value.replace(/[^0-9]/g,''); updateAccField('${id}', 'vehicleUsage', this.value)"></div>
            </div>`;
                /* ══ §45 · THE VEHICLE REACHES THE OPERATING UPKEEP ENGINE ═════════════════════════
                 * ⭐ THE SAME FUNCTION THE GROUNDS CALLS, WITH A SCOPE ARGUMENT. Not a vehicle copy of
                 * it — §25.4 and Garage §4.0 both forbid a second cost system ("ONE CATALOGUE, NOT
                 * TWO"; "adding a slip fee kind is a row, not a mechanism"), and a fork here would
                 * double-count the moment §38.6's boat and RV rows land.
                 * ⛔ `showUpkeep` IS SHARED WITH THE GROUNDS AND THAT IS DELIBERATE — it is one flag
                 * meaning "show this room's running costs", and the `!== false` default matches the
                 * habit every other flag in this file uses. A vehicle predating this commit has no
                 * key, so it reads as ON, which is what a new section should be.
                 * ⛔ NOTHING SUMS THIS YET. The vehicle Real Monthly is the NEXT commit; these rows
                 * land in §03's household ledger exactly like a property's do, which is why the Real
                 * Monthly must be a WINDOW onto dollars already counted and never an addition
                 * (§45.8 — the $3,400-not-$4,600 discipline, fourth asking). */
                html += _propUpkeepSectionHTML(id, acc, acc.showUpkeep !== false, 'vehicle');
                /* §45.3 — THE TYPED LAYER, INSIDE THE SAME TOGGLE. It sits under the ledger window
                   deliberately: the window is where a cost becomes TRACKED, and these boxes are the
                   quick way to record one that is not. A user who tracks a kind sees that box turn
                   into a read-only mirror of the line they just made, which is the clearest possible
                   statement that there is ONE dollar and not two. */
                if (acc.showUpkeep !== false) {
                    html += '<div style="margin-top:14px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">'
                          + '<div style="color:var(--teal-mid); font-weight:bold; font-size:13px; margin-bottom:10px;">🧾 Annual running costs</div>'
                          + _vehCostBlockHTML(id, acc) + '</div>';
                    /* §11.2 — the all-in beat reads the SAME resolver the boxes above write into, so
                       the number under the fields is always the number in the fields. Display-only. */
                            /* ⛔ A STABLE CONTAINER, ALWAYS RENDERED, EVEN WHEN EMPTY — the same shape as
                       `modal-real-monthly-${id}` and `modal-payoff-intel-${id}` on the Moat. It is
                       what lets the panel APPEAR and VANISH live while the user types, without
                       repainting the modal and stealing focus mid-keystroke. */
                    html += '<div id="modal-veh-allin-' + id + '">' + _vehAllInHTML(id, acc) + '</div>';
                }
            }
        }

        if (base.hasInterest && base.taxCode !== 'debt') {
            html += `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div><div class="input-label">Interest Rate (APY) %</div><input type="number" class="small-field" placeholder="0" value="${acc.intRate||''}" oninput="updateAccField('${id}', 'intRate', this.value)"></div>
            </div>`;
        }

        if(base.hasCOLA) {
            html += `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>
                    <div class="input-label">Cost of Living Adjustment (COLA) %</div>
                    <input type="number" class="small-field" placeholder="0" value="${acc.cola||''}" oninput="updateAccField('${id}', 'cola', this.value)" step="0.01">
                </div>
            </div>`;
        }

        // §20 #9 — Purpose / Notes renders LAST in every estate modal (universal, all rooms). Relocated from
        // the top of the overview (it used to sit above every room's own fields, so the free-text box was the
        // first thing between the toggles and the numbers). Notes are a footnote to the account, not a preamble
        // — they belong under the room's own content. Stays INSIDE #modal-edu-collapse so it still hides while
        // decorating (W2/W6: holdings are the sole focus). Pure relocation (LOCK-3) — same markup, same
        // placeholder logic, same updateAccField('notes') write path; no engine/DI total is touched.
        let notePH = "e.g. Important notes...";
        if(base.taxCode === 'debt') notePH = "e.g. Lender name, escrow details, account number...";
        if(base.taxCode === 'liquid') {
             if(base.id.includes('savings')) notePH = "e.g. Emergency Fund, Sinking Fund, Tax Reserve...";
             else notePH = "e.g. Primary Operations, Joint Expenses, Vacation Fund...";
        }
        if(base.taxCode === 'physical') {
             if(base.id.includes('collectibles')) notePH = "e.g. Storage location, provenance, condition details, insurance riders...";
             else notePH = "e.g. Address, Zillow link, appraisal notes...";
        }

        html += `
        <div style="margin-bottom: 20px;">
            <div class="input-label">Purpose / Notes</div>
            <textarea class="small-field" style="width:100%; height: 60px; resize:none; font-family: var(--font-serif);" placeholder="${notePH}" oninput="updateAccField('${id}', 'notes', this.value)">${acc.notes || ''}</textarea>
        </div>`;

        html += '</div>';   // W2 — close #modal-edu-collapse; the holdings blocks below render OUTSIDE the collapse

        if (base.id.includes('collectibles')) {
            html += `
            <button class="add-space-btn" type="button" style="margin-top: 15px; width: 100%;" onclick="toggleHoldings('${id}')">
                ❖ CURATE COLLECTION (ITEMIZE ASSETS)
            </button>`;
            
            if(acc.showHoldings) {
                document.getElementById('modal-card').style.width = "700px";
                html += `
                <div style="margin-top: 15px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 4px; overflow-x: auto;">
                    <table class="holdings-table">
                        <tr>
                            <th>Item Description</th>
                            <th style="width: 120px;">Appraised Value</th>
                            <th style="width: 120px;">Last Appraised</th>
                            <th></th>
                        </tr>
                `;
                
                (acc.holdings || []).forEach((h, i) => {
                    html += `
                        <tr>
                            <td><input type="text" class="holding-input" value="${h.name||''}" placeholder="e.g. AFA 90 Vintage TMNT" oninput="updateHolding('${id}', ${i}, 'name', this.value)"></td>
                            <td><input type="number" class="holding-input" value="${h.price||''}" placeholder="0" oninput="updateHolding('${id}', ${i}, 'price', this.value)"></td>
                            <td><input type="date" class="holding-input" value="${h.date||''}" oninput="enforceDateCap(event); updateHolding('${id}', ${i}, 'date', this.value)"></td>
                            <td><button onclick="removeHolding('${id}', ${i})" style="background:none; border:none; color:var(--muted); cursor:pointer;">×</button></td>
                        </tr>
                    `;
                });
                
                html += `
                    </table>
                    <button class="add-space-btn" type="button" style="margin-top: 10px; width: max-content; padding: 6px 12px; border-style: solid; color:var(--white);" onclick="addHolding('${id}')">+ Add Item</button>
                    <div style="text-align:right; margin-top: 10px; color: var(--muted); font-family: var(--font-mono); font-size: 11px;">
                        TOTAL COLLECTION VALUE: <span id="modal-total-val" style="color:var(--white); font-size: 16px; font-weight:bold;">$${(acc.value||0).toLocaleString('en-US')}</span>
                    </div>
                </div>
                `;
            } else {
                document.getElementById('modal-card').style.width = "min(710px, 96vw)";
            }
        } else if(base.isInvestment) {
            // W4 — the entry button shows only when CLOSED; on decorate the "← Back … Overview" button
            // moves to the BOTTOM (after the DI box + rollup + table), rendered further down.
            if (!acc.showHoldings) html += `
            <button class="add-space-btn" type="button" style="margin-top: 15px; width: 100%;" onclick="toggleHoldings('${id}')">
                ❖ BEGIN INTERIOR DECORATING (PORTFOLIO HOLDINGS)
            </button>`;
            
            if(acc.showHoldings) {
                // #364 MISS-6 sub#3 — NO eager bundle prefetch: fundamentals now resolve D1-first per
                // ticker (fetchTickerFundamentals -> /api/tickers); the ~1.74MB curated bundle loads ONLY
                // as a fail-soft fallback when a D1 lookup misses. This is the client-payload win.
                // PHANTOM FIX — a fixed 1200px card overflows narrower viewports, and the card's own
                // HORIZONTAL scrollbar (teal thumb, brightens on :hover, line ~52) renders below the
                // DI as a long glowing inert bar. Cap the card to the viewport; the holdings TABLE
                // keeps its own overflow-x scroll inside its labeled container.
                document.getElementById('modal-card').style.width = "min(1680px, 96vw)";   // W3 — the 14-col ticker bar needs ~1583px; 1200 clipped it even on a wide monitor. 1680 lets the full bar read on a desktop; 96vw keeps the card within the viewport (phantom-fix guard) so narrower screens still scroll the table inside its own overflow-x container.
                var isTaxable = (base.taxCode === 'liquid' && base.isInvestment);
                var _agg = (window.DatumMath ? DatumMath.portfolioStats([acc]) : null);   // display-only (LOCK-3)
                var _esc = function (s) { return (s === undefined || s === null) ? '' : String(s); };
                var _pct = function (x) { return (x === null || x === undefined) ? '—' : x.toFixed(2) + '%'; };
                var _bet = function (x) { return (x === null || x === undefined) ? '—' : x.toFixed(2); };
                var _gn  = function (x) { return (x === null || x === undefined) ? '—' : (x >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(x)).toLocaleString('en-US'); };

                // ROLLUP STRIP (above the table) — empty fields show "—", never fake $0/0.
                // Bank rooms (HSA / 403(b)) carry the Copy Bank §1 signal boxes + hover pairs instead.
                var _diBank = _diIsBankRoom(base.id);
                var _diSig = _diBank ? _diSignals(acc) : null;
                if (/rollover/.test(base.id)) {
                    // §3a ROLLOVER-ORIGIN GATE (bank R36–R38) — the defining axis; RENDERS FIRST, before
                    // the DI box + signal strip (V-ORIGIN-FIRST). priorPlan colors the source; generic
                    // fallback when unset (L47).
                    var _src = (acc.priorPlan && String(acc.priorPlan).trim()) ? String(acc.priorPlan).trim() : 'employer plan';
                    html += '<div class="di-origin-gate" style="margin-top:4px; margin-bottom:14px; padding:12px 14px; border-left:3px solid var(--gold); background:rgba(201,168,76,0.06); border-radius:4px; font-family:var(--font-serif); font-size:12px; line-height:1.55; color:var(--white);">' +
                        '<div style="font-family:var(--font-mono); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold); margin-bottom:6px;">Rollover origin</div>' +
                        'This money came out of an old ' + _esc(_src) + ' and into your CURRENT employer’s 401(k) — you kept it inside the 401(k) world instead of moving it to an IRA. ' +
                        'Done as a direct rollover, this moved tax-free — nothing withheld, no 60-day clock. ' +
                        'Landing in an employer plan (not an IRA) is what preserves your ERISA shield, loan access, and Rule-of-55 window.' +
                        _diBlankNudge(!(acc.priorPlan && String(acc.priorPlan).trim()), 'Tell us where this rolled from — an old 401(k), 403(b), 457(b), or TSP — and we’ll tailor the origin story and the perks you carried over.') +   // §21 N-PRIORPLAN (R228)
                        '</div>';
                }
                // W4a — DI box on TOP (above the rollup), anchored to the rollup build, not a line number.
                // _diNarrBlock now renders the universal empty-state (W5) on zero-holdings entry.
                if (_diBank) html += _diNarrBlock(acc, base, _diSig, _agg);
                if (_diBank) {
                  html += _diBankStrip(acc, base, _diSig, _agg);
                } else {
                html += '<div class="holdings-rollup">';
                if (isTaxable) { var _ug = _agg && _agg.unrealizedGain; var _gtaxLine = (typeof _ug === 'number' && _ug > 0) ? ('Tax if you sold it all today ≈ 15% of that gain — roughly $' + Math.round(_ug * 0.15).toLocaleString('en-US') + '.') : '';
                  html += '<div class="hr-cell"><div class="hr-lbl">Unrealized Gain</div><div class="hr-val" id="hr-gain">' + _gn(_ug) + '</div><div class="hr-sub" id="hr-gain-sub">Your unrealized gain — current value minus what you paid (cost basis).</div><div class="hr-sub" id="hr-gaintax" style="margin-top:5px;">' + _gtaxLine + '</div></div>'; }
                html += '<div class="hr-cell"><div class="hr-lbl">Weighted Beta</div><div class="hr-val" id="hr-beta">' + _bet(_agg && _agg.weightedBeta) + '</div></div>';
                html += '<div class="hr-cell"><div class="hr-lbl">Blended Yield</div><div class="hr-val" id="hr-yield">' + _yld(_agg && _agg.blendedYield) + '</div></div>';
                html += '<div class="hr-cell"><div class="hr-lbl">Avg Expense</div><div class="hr-val" id="hr-expense">' + _pct(_agg && _agg.blendedExpense) + '</div></div>';
                html += '</div>';
                }

                // PER-taxCode COLUMN MANIFEST -> one render loop. cost-basis + unrealized-gain render TAXABLE-ONLY.
                var _ti = function (h, i, f, ph, num, mw, affix) { var _st = affix ? ' style="flex:1 1 auto; min-width:85px;"' : (mw ? ' style="min-width:' + mw + 'px;"' : ''); var _inp = '<input type="' + (num ? 'number' : 'text') + '" class="holding-input"' + _st + ' title="' + _esc(h[f]) + '" value="' + _esc(h[f]) + '" placeholder="' + (ph || '') + '" oninput="updateHolding(\'' + id + '\', ' + i + ', \'' + f + '\', this.value)">'; return affix ? '<td><div style="display:flex; align-items:center; gap:3px;"><span style="color:var(--muted); flex:none;">' + affix + '</span>' + _inp + '</div></td>' : '<td>' + _inp + '</td>'; };
                // Stage-3 provenance render. Grammar: curated -> reference-figure tooltip; Tier-1 (SEC/SPDR) -> plain, hover source;
                // Tier-2 (Yahoo beta/stock-yield) -> small * + VERBATIM reference tooltip. Every field stays user-editable (1-tap override).
                var _inp = function (h, i, f, ph, num, ttl) { return '<input type="' + (num ? 'number' : 'text') + '" class="holding-input" title="' + _esc(ttl != null ? ttl : h[f]) + '" value="' + _esc(h[f]) + '" placeholder="' + (ph || '') + '" oninput="updateHolding(\'' + id + '\', ' + i + ', \'' + f + '\', this.value)">'; };
                var _T2BETA = function (h) { return 'Reference estimate — beta is a computed figure (it varies by method and window), sourced ' + _esc(h.betaSrc) + ' as of ' + _esc(h.betaAsOf) + '. It widens or narrows an illustrative range, not a dollar you owe. Tap to replace with your own. Method: ' + _esc(h.betaMethod) + '.'; };
                var _T2YLD = function (h) { return 'Reference figure — trailing yield as of ' + _esc(h.dividendYieldAsOf) + ', ' + _esc(h.dividendYieldSrc) + '. It moves with price. Tap to replace with your own.'; };
                var _CURREF = 'Reference figure — a representative value to get you started. Replace it with your own from your statement for an exact read.';
                var _prov = function (h, i, f, ph, num, srcKey, t2fn, t1lbl) {
                  var src = srcKey ? h[srcKey] : null;
                  var hasVal = !(h[f] === undefined || h[f] === null || h[f] === '');
                  if (src === 'Yahoo Finance') { var tip = t2fn(h); return '<td class="ref-cell">' + _inp(h, i, f, ph, num, tip) + '<span class="ref-star" title="' + _esc(tip) + '">*</span></td>'; }
                  if (src) return '<td>' + _inp(h, i, f, ph, num, (t1lbl || f) + ' — source: ' + src) + '</td>';
                  if (hasVal) return '<td>' + _inp(h, i, f, ph, num, _CURREF) + '</td>';
                  return '<td>' + _inp(h, i, f, ph, num) + '</td>';
                };
                // G3 — controlled vocab for classification fields (Captain-approved 2026-07-01).
                // Values match the normalization maps so a pick flows straight into the signal math;
                // blank stays valid; a legacy/typed value not in the list is preserved as an option.
                var _sel = function (h, i, f, opts) {
                  var cur = String(h[f] === undefined || h[f] === null ? '' : h[f]);
                  var found = false;
                  var o = '<option value=""' + (!cur ? ' selected' : '') + '>—</option>';
                  opts.forEach(function (v) { var val = v[0], lbl = v[1] || v[0]; if (val === cur) found = true;
                    o += '<option value="' + val + '"' + (val === cur ? ' selected' : '') + '>' + lbl + '</option>'; });
                  if (cur && !found) o += '<option value="' + _esc(cur) + '" selected>' + _esc(cur) + '</option>';
                  var src = { geography: 'geographySrc', sector: 'sectorSrc', assetClass: 'assetClassSrc' }[f];
                  var ttl = (src && h[src]) ? _esc(f + ' — source: ' + h[src]) : '';
                  return '<td><select class="holding-input" style="background:var(--bg-navy); min-width:112px;"' + (ttl ? ' title="' + ttl + '"' : '') + ' onchange="updateHolding(\'' + id + '\', ' + i + ', \'' + f + '\', this.value)">' + o + '</select></td>';
                };
                var _V_AC = [['US Equity'], ['International Equity'], ['Bonds'], ['Cash'], ['Real Assets/Commodities'], ['Crypto'], ['Mixed/Allocation']];
                var _V_IN = [['Stock'], ['ETF'], ['Mutual Fund'], ['Annuity'], ['CASH', 'CASH (sweep)'], ['Bond'], ['CD']];
                var _V_GE = [['US'], ['International'], ['Global']];
                var _V_SE = [['Broad Market/Blend'], ['Technology'], ['Energy'], ['Industrials & Defense'], ['Biotech'], ['Gold'], ['Crypto'], ['Dividend Growth'], ['Utilities'], ['Real Estate/REIT']];
                // G2 — column-header hovers: what the field IS + what it MEANS for the plan.
                var COLS = [
                  { lbl: 'Ticker', w: 80, tip: { t: 'Ticker', b: 'The market symbol for this holding. Type it and we auto-fill everything we can source — every field stays yours to override.' }, td: function (h, i) { return '<td><input type="text" class="holding-input" value="' + _esc(h.ticker) + '" placeholder="AAPL" onchange="fetchMockData(\'' + id + '\', ' + i + ', this.value)"></td>'; } },
                  { lbl: 'Name', w: 220, tip: { t: 'Name', b: 'What the holding actually is, in words. Worth a glance — a fund name often tells you its whole strategy.' }, td: function (h, i) { return _ti(h, i, 'name', 'Apple Inc.', false, 200); } },
                  { lbl: 'Price', w: 115, tip: { t: 'Price', b: 'What one unit costs. Price × shares is the value doing the work — every signal above is weighted by it.' }, td: function (h, i) { return _ti(h, i, 'price', '0', true, null, '$'); } },
                  { lbl: 'Shares Owned', w: 110, tip: { t: 'Shares Owned', b: 'How many units you hold. Small price, many shares can outweigh a big price, few shares — dollars decide, not tickers.' }, td: function (h, i) { return _ti(h, i, 'shares', '0', true); } },
                  { lbl: 'Position Value', w: 110, tip: { t: 'Position Value', b: 'The dollars actually riding on this holding — the weight it carries in every signal and in your retirement math.' }, td: function (h, i) { var v = (parseFloat(h.price) || 0) * (parseFloat(h.shares) || 0); return '<td style="color:var(--teal-mid); font-weight:bold;" id="holding-val-' + i + '">$' + v.toLocaleString('en-US') + '</td>'; } },
                  { lbl: 'Cost Basis', w: 90, taxableOnly: true, tip: { t: 'Cost Basis', b: 'What you paid for this holding. Lets the math use your real embedded gain (capital-gains tax) when this account funds your retirement spend, instead of an estimate.' }, td: function (h, i) { return _ti(h, i, 'costBasis', '0', true); } },
                  { lbl: 'Unrealized Gain', w: 100, taxableOnly: true, tip: { t: 'Unrealized Gain', b: 'Value minus what you paid — growth you haven\'t sold yet. In a taxable account this is the slice the capital-gains tax will touch.' }, td: function (h, i) { var cb = parseFloat(h.costBasis); if (!isFinite(cb) || cb <= 0) return '<td id="holding-gain-' + i + '" style="color:var(--muted);">—</td>'; var g = (parseFloat(h.price) || 0) * (parseFloat(h.shares) || 0) - cb; return '<td id="holding-gain-' + i + '" style="color:' + (g >= 0 ? 'var(--teal-mid)' : 'var(--danger)') + ';">' + (g >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(g)).toLocaleString('en-US') + '</td>'; } },
                  { lbl: 'Beta', w: 72, tip: { t: 'Beta', b: 'How hard this holding swings versus the market (1.0 = in step). It drives the range of outcomes your Shape stress-tests. Blank when unpublished — we never fake it.' }, td: function (h, i) { return _prov(h, i, 'beta', '—', true, 'betaSrc', _T2BETA, 'Beta'); } },
                  { lbl: 'Yield', w: 72, tip: { t: 'Yield', b: 'Cash this holding pays you per year, as a % of its price. Inside a tax-advantaged account it reinvests untaxed — pure compounding.' }, td: function (h, i) { return _prov(h, i, 'dividendYield', '—', true, 'dividendYieldSrc', _T2YLD, 'Yield'); } },
                  { lbl: 'Geography', w: 110, tip: { t: 'Geography', b: 'Where the assets live. Drives the International signal — how much of your growth depends on one economy.' }, td: function (h, i) { return _sel(h, i, 'geography', _V_GE); } },
                  { lbl: 'Sector', w: 130, tip: { t: 'Sector', b: 'The theme this holding rides. One theme dominating your equity is a tilt worth knowing about — it shows up in your Datum Intelligence.' }, td: function (h, i) { return _sel(h, i, 'sector', _V_SE); } },
                  { lbl: 'Exp Ratio', w: 72, tip: { t: 'Exp Ratio', b: 'The fund\'s yearly fee, quietly subtracted before you see returns. Over decades this is one of the few levers you fully control.' }, td: function (h, i) { return _prov(h, i, 'expRatio', '0', true, 'expRatioSrc', null, 'Exp Ratio'); } },
                  { lbl: 'Asset Class', w: 130, tip: { t: 'Asset Class', b: 'The stocks / bonds / cash bucket. It sets your mix — the single biggest driver of how your account behaves on the way to retirement.' }, td: function (h, i) { return _sel(h, i, 'assetClass', _V_AC); } },
                  { lbl: 'Instrument', w: 110, tip: { t: 'Instrument', b: 'What kind of wrapper this is — a single stock, a fund, an annuity, a cash sweep. Single names concentrate risk; funds spread it; the cash sweep sits out of the market.' }, td: function (h, i) { return _sel(h, i, 'instrumentType', _V_IN); } },
                  { lbl: 'Acquisition Date', w: 160, taxableOnly: true, taxRoomOnly: true, tip: { t: 'Acquisition Date', b: 'When you bought this holding (optional).' }, td: function (h, i) { return '<td><input type="date" class="holding-input" style="min-width:140px;" min="1900-01-01" max="' + new Date().toISOString().slice(0, 10) + '" value="' + _esc(h.acquisitionDate) + '" onchange="updateHolding(\'' + id + '\', ' + i + ', \'acquisitionDate\', this.value)"></td>'; } },
                  { lbl: '', w: null, td: function (h, i) { return '<td><button onclick="removeHolding(\'' + id + '\', ' + i + ')" style="background:none; border:none; color:var(--muted); cursor:pointer;">×</button></td>'; } }
                ];
                // §12 IRA pass — the IRA bank's [R]/[T]-aware column hovers override the shared
                // tips, and Cost Basis / Unrealized Gain become VISIBLE for IRA rooms (bank
                // R115: basis is tracked so Unrealized Gain can show — unlike the 403(b)).
                // W7/W8 — the 3 tax-lot cols are UNIVERSAL across every bank investment room (crypto
                // deferred, 529 bespoke — both excluded). IRA/457 keep their rich [R]/[T] col hovers +
                // editable Cost Basis / computed Unrealized Gain (basis tracked so UG shows); 401(k)/403/
                // HSA render all 3 as "—" + the authored §Rollup-Parity why-hover. Acquisition Date shows
                // "—" in every shelter (holding-period clock doesn't run).
                var _bankCol = _diBank && !_isTaxableRoom(base.id) && base.id !== '529plan';
                if (_bankCol) {
                  var _it = /457b/.test(base.id) ? _di457ColTips(/^roth457b/.test(base.id))
                          : /ira/.test(base.id) ? _diIraColTips(/^rothira/.test(base.id))
                          : /401k/.test(base.id) ? _di401kColTips(/^roth401k/.test(base.id)) : null;
                  if (_it) COLS.forEach(function (c) { if (_it[c.lbl]) c.tip = _it[c.lbl]; });
                  var _lot = _diLotColTips(base.id), _allNA = !/ira|457b/.test(base.id);
                  COLS.forEach(function (c) {
                    if (!_lot[c.lbl]) return;
                    if (_allNA || c.lbl === 'Acquisition Date') {
                      c.tip = _lot[c.lbl];
                      c.td = function () { return '<td style="color:var(--muted);">—</td>'; };
                    }
                  });
                }
                // Taxable §14.4-COPY: all 14 column-header tooltips (bank R375–R388, verbatim, two-part) +
                // §11b: the Cost Basis cell gets the "≈" estimator trigger and the persistent "est." tag.
                if (_isTaxableRoom(base.id)) {
                  var _tct = _diTaxColTips();
                  COLS.forEach(function (c) {
                    if (_tct[c.lbl]) c.tip = _tct[c.lbl];
                    if (c.lbl === 'Cost Basis') {
                      c.w = 160;
                      c.td = function (h, i) {
                        var et = h.costBasisEst ? '<span title="Assumed ' + (Math.round((h.costBasisEstRate || 0) * 1000) / 10) + '%/yr since ~' + (h.costBasisEstYear || '') + '" style="color:var(--gold); font-size:9px; flex:none;">est.</span>' : '';
                        return '<td style="min-width:150px;"><div style="display:flex; align-items:center; gap:4px; flex-wrap:nowrap;"><input type="text" inputmode="numeric" class="holding-input" style="flex:1 1 auto; min-width:70px;" value="' + _esc(_cbFmt(h.costBasis)) + '" placeholder="$0" oninput="updateHolding(\'' + id + '\', ' + i + ', \'costBasis\', this.value.replace(/[^0-9.]/g, \'\'))"><button type="button" title="Estimate a cost basis" onclick="openCBEstimator(\'' + id + '\', ' + i + ')" style="background:none; border:1px solid rgba(255,255,255,0.15); color:var(--teal-mid); font-size:10px; line-height:1; padding:3px 6px; border-radius:2px; cursor:pointer; flex:none;">≈</button>' + et + '</div></td>';
                      };
                    }
                  });
                }
                var cols = COLS.filter(function (c) { return (!c.taxableOnly || isTaxable || _bankCol) && !(c.taxRoomOnly && !isTaxable && !_bankCol); });

                html += '<div style="margin-top: 15px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 4px; overflow-x: auto;"><table class="holdings-table"><tr>';
                cols.forEach(function (c) {
                  // position:fixed on hover so the hover escapes the table's overflow-x scroll clip and
                  // clamps into the viewport (same fix as the title hover) — rightmost columns were cut off.
                  if (c.tip) html += '<th style="width:' + c.w + 'px;"><div class="modal-tt-wrap" style="justify-content:flex-start; cursor:help;" onmouseenter="_ttDrop(this)">' + c.lbl + '<div class="modal-tt" style="top:100%; bottom:auto;"><strong>' + c.tip.t + '</strong>' + c.tip.b + '</div></div></th>';
                  else html += '<th' + (c.w ? ' style="width:' + c.w + 'px;"' : '') + '>' + c.lbl + '</th>';
                });
                html += '</tr>';
                (acc.holdings || []).forEach(function (h, i) {
                  html += '<tr>';
                  cols.forEach(function (c) { html += c.td(h, i); });
                  html += '</tr>';
                });
                html += '</table>';
                html += '<button class="add-space-btn" type="button" style="margin-top: 10px; width: max-content; padding: 6px 12px; border-style: solid; color:var(--white);" onclick="addHolding(\'' + id + '\')">+ Add Holding</button>';
                html += '</div>';   // P6 — bottom-right TOTAL removed (duplicate of the strip/card balance, Captain ruling)
                // W4b — "← Back to <account> Overview" at the BOTTOM (DI box now renders on top, above the rollup).
                html += '<button class="add-space-btn" type="button" style="margin-top: 15px; width: 100%;" onclick="toggleHoldings(\'' + id + '\')">← Back to ' + base.title + ' Overview</button>';
            } else {
                document.getElementById('modal-card').style.width = "min(710px, 96vw)";
            }
        } else {
             document.getElementById('modal-card').style.width = "min(710px, 96vw)";
        }

        // §15 "Why …?" education panels RELOCATED to the top of the modal (above the toggles, inside
        // #modal-edu-collapse) — see the top-insert after the collapse opens. They read backwards at the
        // bottom; an overview panel belongs at the top of the overview (Captain relocation 2026-07-08).
        document.getElementById('modal-dynamic-content').innerHTML = html;
        document.getElementById('account-modal-overlay').style.display = 'flex';
        // §20 — warm the live-Prime cache on HELOC open; re-render the sub-line + intel when it resolves
        // (the modal may open before the async /api/prime read returns). Sourced-or-blank until it does.
        if (base && base.title === 'HELOC') _fetchLivePrime().then(_refreshHelocLiveColor);
        if (base && base.title === 'Mortgage') _fetchLivePrime().then(_refreshMoatLiveColor);
    };

/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   ── ABSORBED HELPERS · STEP 3 · MOVE 1b (2026-08-22) ───────────────────────────────────────────
   53 definitions whose ONLY caller is the builder above. They moved here rather than into a part of
   their own because their caller is already a part: §11.2 — name a part for its CALLERS, never for
   its origin room. A group that reads coherent is not a module; a module is a group with a caller
   from outside it, and measured against the call graph none of these has one.
   ⛔ THEY ARE STILL GLOBALS AND THAT IS DELIBERATE, NOT AN OVERSIGHT. Wrapping them in an IIFE would
   make them private and would BREAK lift(): the sandbox gates extract a function's TEXT and run it
   inside new Function(...). Top-level declarations are both liftable AND reachable. 1b is a
   CO-LOCATION, not a privatisation — the win is 132,541 bytes out of studio.html and the builder's
   external dependency surface falling from 76 names to 39.
   ⭐ AND THE AUDIT DEEPENS FOR FREE: _gate_parts_wired computes this file's published surface, which
   goes from 1 name to ~54. The instrument at the centre of Part 10 now covers fifty-four times what
   it did before, with no extra code.
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
    function _diIraWhyPanel(acc, base) {
      var isRoth = base.taxCode === 'roth';
      var hasWorkplace = (state.accounts || []).some(function (a) { var b = getBaseType(a.baseId); return b && /401k|403|457b/.test(b.id); });
      var lim = _diMoney((_diIraLimits() || { base: 7500 }).base);
      var sec = function (h, b, hot) { return '<div class="ira-why-sec' + (hot ? ' hot' : '') + '"><div class="ira-why-h">' + h + '</div><div class="ira-why-b">' + b + '</div></div>'; };
      var yr = new Date().getFullYear();
      // S5 · separate-bucket nudge (v3 R8) — verbatim; renders only with a workplace plan (else ⬜), gold .ira-why-nudge
      var s5 = hasWorkplace
        ? '<div class="ira-why-nudge">You also hold a workplace plan — good news: this IRA is a SEPARATE bucket. The '
          + lim + ' you can put here for ' + yr + ' stacks ON TOP of your workplace 401k/403b/457b limit; it doesn’t count against it.</div>'
        : '';
      // S4 · contribution-room meter (v3 R7) — {used} = Σ inflow×freq over the estate's IRA lanes (single-owner scan,
      // same pattern as S5), sourced-or-empty-state (L47 — never fabricate); {limit} = _diIraLimits() LOOKUP (reuse I3).
      var iraUsed = (state.accounts || []).reduce(function (t, a) {
        var b = getBaseType(a.baseId); return (b && /ira/.test(b.id)) ? t + (a.inflow || 0) * (a.freq || 0) : t; }, 0);
      var s4 = sec('Your ' + yr + ' contribution room', (iraUsed > 0
          ? 'You’ve used ' + _diMoney(iraUsed) + ' of your ' + lim + ' IRA room for ' + yr + '. '
          : 'Add your ' + yr + ' contributions to track how much of your ' + lim + ' IRA room you’ve used. ')
        + 'IRA room doesn’t roll over — whatever you don’t use for ' + yr + ' is gone for good once the filing deadline passes.');
      var body =
        '<div class="ira-why-hero">Your IRA, your menu — the whole market is your fund list.</div>' +
        s5 +
        sec('The one-line answer', 'An IRA is the retirement account YOU open and control — independent of any employer. You’d use one to invest in anything the whole market offers (not just a plan’s short menu), to keep saving after you leave a job, and to choose your own tax treatment: pay tax now (Roth) or later (Traditional).') +
        sec('Who opens an IRA', 'Anyone with earned income (or a spouse with earned income) can open an IRA at any custodian — Vanguard, Fidelity, Schwab, a robo-advisor. There’s no employer involved, no HR enrollment, no plan menu. You pick the custodian, you pick the funds, and the account follows YOU from job to job for life.') +
        sec('Roth vs Traditional — the core choice' + (isRoth ? ' (you hold a Roth)' : ' (you hold a Traditional)'), 'A ROTH IRA takes after-tax dollars now, then grows and pays out entirely tax-free in retirement — and never forces a withdrawal. A TRADITIONAL IRA may give you a tax deduction now, grows tax-deferred, and is taxed as ordinary income when you pull it out (with required withdrawals starting at 73). Roth wins if you expect higher future tax rates or want tax-free heirs; Traditional wins if you want the deduction today.') +
        s4 +
        sec('Why you’d choose the IRA — the edge', 'The IRA’s defining advantage over a workplace plan is CONTROL: the entire market as your fund list, the lowest-cost share classes available anywhere, and no plan administrator between you and your money. It’s also where money LANDS when you leave a job — a rollover from an old 401(k) keeps that money tax-deferred and in your hands instead of stranded in a former employer’s menu.') +
        sec('The income-limit trap (worth knowing)', isRoth
          ? 'Heads up: Roth IRAs have an income ceiling. Above a certain MAGI you can’t contribute directly — but the “backdoor” path (contribute to a Traditional IRA non-deductibly, then convert to Roth) is still open to almost everyone. If your income is near the line, this is the beat to check before you fund.'
          : 'One honest note: if you’re covered by a workplace plan (401k/403b/457b), your Traditional IRA DEDUCTION phases out at higher income — the contribution is still allowed, but it may not be tax-deductible. When that happens, a non-deductible contribution + Roth conversion (the “backdoor”) is often the cleaner move.') +
        sec('The 5-year rule (don’t get surprised)', 'A Roth IRA’s EARNINGS come out tax-free only after the account has been open five years AND you’re 59½. Separately, each Roth CONVERSION starts its own five-year clock before that converted money can be withdrawn penalty-free. Contributions (the dollars you put in) can always come out tax- and penalty-free — it’s the growth and conversions that carry the clock.') +
        sec('Bottom line', 'Your workplace plan is the account your employer gave you; the IRA is the one you own outright. Use it to invest in anything, to consolidate old plans, and to pick your tax treatment. If you have both, treat them as separate buckets and try to feed both — and if your income is high, ask about the backdoor Roth before assuming you’re locked out.');
      return '<div class="ira-why-panel">' +
        '<div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!==\'block\'; n.style.display=open?\'block\':\'none\'; this.classList.toggle(\'open\', open);">Why you’d use an IRA — and how it differs from your workplace plan <span class="ira-why-caret">▸</span></div>' +
        '<div class="ira-why-body" style="display:none;">' + body + '</div></div>';
    }
    function _diIraColTips(isRoth) {
      var why = '<br><br><strong>Why it matters for your retirement</strong>';
      return {
        'Ticker': { t: 'Ticker', b: 'The symbol of this single holding.' + why + 'Names the bet on this row. In an IRA you picked every one of these off the open market — so each ticker is a choice you made, not a slot a plan handed you.' },
        'Name': { t: 'Name', b: 'The full security name behind the ticker.' + why + 'Tells you what you actually own — a broad index, a single company, a bond fund. The plainer and broader the name, the more this row is built to be left alone for a long retirement.' },
        'Price': { t: 'Price', b: 'The latest reference price per share.' + why + 'A reference point, not a live quote — we show it sourced-or-blank, never a stale guess. It only matters paired with shares: price × shares is what this row is worth to your plan.' },
        'Shares Owned': { t: 'Shares Owned', b: 'How many units of this holding you own.' + why + 'The size of the position. Shares × price = this row\'s value — the number that decides how much weight this single holding carries in your IRA.' },
        'Position Value': { t: 'Position Value', b: 'Shares × price — what this holding is worth today.' + why + 'This is the dollar weight this row pulls in the account. Every one of the 4 boxes above is VALUE-WEIGHTED — so a big-value row steers the whole account\'s beta, yield, and fee far more than a small one.' },
        'Cost Basis': { t: 'Cost Basis', b: 'What you paid for this holding (user-entered).' + why + 'Always entered by you — no source publishes your basis. ' +
          (isRoth ? 'In the Conservatory it never matters for tax — qualified growth is tax-free.' : 'In the Library it barely matters at withdrawal: the whole balance is taxed as ordinary income regardless of basis.') +
          ' We still track it so Unrealized Gain can show.' },
        'Unrealized Gain': { t: 'Unrealized Gain', b: 'Value − Cost Basis for THIS row (blank if no basis).' + why +
          (isRoth ? 'In a Roth this paper gain is yours tax-free forever once qualified — the single best reason to hold your biggest-growth names here.' : 'In a Traditional it\'s tax-DEFERRED, not tax-free: this gain becomes ordinary income on the way out.') +
          ' Either way, no yearly capital-gains tax like a taxable account — the IRA wrapper shields the gain while it grows. This row feeds the Unrealized Gain box above.' },
        'Beta': { t: 'Beta', b: 'This holding\'s market sensitivity (sourced-or-blank).' + why + 'How hard this one position swings with the market — 1.00 moves with it, above is jumpier, below is steadier. Left BLANK when no source publishes it (we never fake a beta).' +
          (isRoth ? ' The Roth is the right home for your highest-beta bets — the violent upside is untaxed.' : '') + ' This row feeds the Weighted Beta box above.' },
        'Yield': { t: 'Yield', b: 'This holding\'s dividend yield (sourced-or-blank).' + why + 'The income this position throws off as a %. In ANY IRA these dividends reinvest with ZERO yearly tax drag — unlike a taxable account where you\'d owe tax each year. Blank when unpublished. This row feeds the Blended Yield box above.' },
        'Geography': { t: 'Geography', b: 'Where this holding is invested — at the granular level we track (e.g. US large-blend, foreign developed, emerging markets, global blend, US bonds, real assets, crypto, cash).' + why + 'Tells you how much of this row rides on the rest of the world — and WHICH part of the world. We read the granular tag, not just "US vs international," so a developed-market fund and an emerging-market bet aren\'t blurred into one word. Caveat we keep honest: this reflects published domicile, which isn\'t always true investment exposure.' },
        'Sector': { t: 'Sector', b: 'The granular industry or theme this holding sits in — broad-market core, or a named tilt like semiconductors, energy, biotech, gold, REITs, or dividend growth.' + why + 'Sectors boom and bust together. Reading the granular sector on each row lets you spot when several tickers quietly stack into ONE theme — the concentration most people never see because it hides across different names.' +
          (isRoth ? ' A high-risk theme like biotech or crypto is a natural Roth bet — the binary upside comes out untaxed.' : '') },
        'Exp Ratio': { t: 'Exp Ratio', b: 'The annual fund fee for this holding, as a %.' + why + 'The yearly drag this one fund skims before you see a return. Because you bought it on the open market, a high number here is FIXABLE — a cheaper index equivalent is usually one trade away. This row feeds the Avg Expense box above.' },
        'Asset Class': { t: 'Asset Class', b: 'Whether this row is equity, bond, cash, or alternative.' + why + 'The job this holding does: equity = growth engine, bond = ballast, cash = buffer, alt = different-drummer hedge. The mix of these across rows is your real risk dial — and in an IRA the whole mix is your design, not a plan\'s glidepath.' },
        'Instrument': { t: 'Instrument', b: 'Whether this row is an ETF, mutual fund, individual stock, or cash.' + why + 'Funds (ETF/MF) spread your money across many companies so no single failure sinks you; a single stock is where one company\'s bad year becomes YOUR bad year. The wrapper mix across rows tells you how much of your IRA is built to survive being left alone.' }
      };
    }
    function _di457WhyPanel(acc, base) {
      var L = _di402gLimits();                                  // §8 dated 402(g) LOOKUP(taxYear) — never a baked literal
      var yr = new Date().getFullYear();
      var combined = _diMoney(2 * L.base);                      // fill-both figure = 2× base (§8): ~$49,000 in 2026
      var has403 = (state.accounts || []).some(function (a) { var b = getBaseType(a.baseId); return b && /403/.test(b.id); });
      var sec = function (h, b, hot) { return '<div class="ira-why-sec' + (hot ? ' hot' : '') + '"><div class="ira-why-h">' + h + '</div><div class="ira-why-b">' + b + '</div></div>'; };
      var safety = (acc.planFlavor === 'governmental' || acc.govPlan === true)   // §15 gov branch now driven by F-PLANFLAVOR (bank D288); legacy govPlan preserved
        ? sec('Safety note (governmental vs not)', 'Your GOVERNMENTAL 457(b) assets are held in trust for you — legally separate from the employer, protected if the government entity hits financial trouble. (This is the key reason the non-governmental version is restricted to executives: there, the assets legally belong to the employer and sit with its creditors. The friendly copy here assumes the governmental type — confirm via the govPlan flag, §14/S7.)')
        : '';
      var body =
        sec('The one-line answer', 'You’re offered a 457(b) because you work for a STATE or LOCAL GOVERNMENT — a public school district, city or county, state university, or government agency. The account type follows your employer, not your choice.') +
        sec('Who gets a 457(b)', 'GOVERNMENTAL 457(b): sponsored by state and local governments and their agencies — municipalities, public school districts, state colleges and universities. This is the common, structurally safer type, and the one you almost certainly have. (A rarer NON-governmental 457(b) exists at some nonprofits, but only for a small group of highly-paid executives — and it carries real creditor risk. See §14/S7.)') +
        sec('Who gets a 403(b) instead', 'A 403(b) is the parallel plan for §501(c)(3) TAX-EXEMPT employers: public schools, colleges and universities, hospitals, charitable nonprofits, and churches. Same idea — a payroll retirement plan — but it lives under a different slice of the tax code, so its rules differ in a few important ways.') +
        sec('The big overlap (the part most people miss)', 'Many public-education and government employees — a state-university professor, for example — are offered BOTH a 403(b) AND a governmental 457(b) through the SAME employer. When that happens, their contribution limits are SEPARATE: you can defer the full limit into EACH in the same year (~' + combined + ' pre-tax in ' + yr + ' before any catch-up), sheltering far more than a private-sector worker ever can. If your employer offers both, filling only one leaves a second tax-advantaged bucket on the table.', has403) +
        sec('Why the rules differ — 457(b) edge', 'The 457(b)’s defining advantage: once you SEPARATE from the employer, withdrawals skip the 10% early-withdrawal penalty entirely — at ANY age. A 52-year-old who leaves a government job can draw on a 457(b) immediately, owing only ordinary income tax. That makes the governmental 457(b) the single best bridge for an early retirement. (A 403(b) keeps the usual 59½ / Rule-of-55 penalty structure.)') +
        sec('Why the rules differ — 403(b) traits', 'A 403(b) has its own quirks: an overall §415(c) annual-additions cap, and a unique “15-years-of-service” catch-up (up to $3,000/yr extra) for long-tenured employees of schools, hospitals, and churches — something the 457(b) doesn’t have. Its catch-up math and the 457(b)’s special final-3-year catch-up are different tools for different plans.') +
        sec('Portability trap (worth knowing)', 'When you leave, a governmental 457(b) can roll into an IRA, 401(k), or 403(b) — but the moment it lands anywhere OTHER than another governmental 457(b), it LOSES the penalty-free-before-59½ access. If early retirement is even possible, think twice before rolling a 457(b) into an IRA; keeping it in the 457(b) world preserves the escape hatch.') +
        safety +
        sec('Bottom line', 'You didn’t pick 457(b) over 403(b) — your employer’s status as a government body did. What matters now: it’s a high-limit, government-sponsored account whose superpower is penalty-free access the day you leave the job. If you ALSO have a 403(b), treat them as two separate buckets and try to feed both.');
      return '<div class="ira-why-panel">' +
        '<div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!==\'block\'; n.style.display=open?\'block\':\'none\'; this.classList.toggle(\'open\', open);">Why you’re offered a 457(b) — and how it differs from a 403(b) <span class="ira-why-caret">▸</span></div>' +
        '<div class="ira-why-body" style="display:none;">' + body + '</div></div>';
    }
    function _diWhyPanel(toggleTitle, secList) {
      var sec = function (h, b, hot) { return '<div class="ira-why-sec' + (hot ? ' hot' : '') + '"><div class="ira-why-h">' + h + '</div><div class="ira-why-b">' + b + '</div></div>'; };
      var body = secList.map(function (s) { return sec(s[0], s[1], s[2]); }).join('');
      return '<div class="ira-why-panel">' +
        '<div class="ira-why-toggle" onclick="var n=this.nextElementSibling; var open=n.style.display!==\'block\'; n.style.display=open?\'block\':\'none\'; this.classList.toggle(\'open\', open);">' + toggleTitle + ' <span class="ira-why-caret">▸</span></div>' +
        '<div class="ira-why-body" style="display:none;">' + body + '</div></div>';
    }
    function _di401kWhyPanel(acc, base) {
      return _diWhyPanel('Why you have a 401(k) — and how it differs from a 403(b) or an IRA', [
        ['The one-line answer', 'You have a 401(k) because you work for a PRIVATE-SECTOR EMPLOYER — a company, not a government or a nonprofit. It’s the workplace retirement plan for for-profit America, and for most people it becomes the single biggest account they’ll ever build. The account type follows your employer, not your choice.'],
        ['Traditional vs Roth — the one choice that IS yours', 'The one real decision inside a 401(k) is WHICH side to feed. The Traditional (pre-tax) side lowers your taxable income today and grows tax-deferred — you pay ordinary income tax later, at withdrawal and via RMDs. The Roth side is funded with already-taxed dollars and grows tax-FREE once qualified (age 59½ + a 5-year clock). Many plans let you split between both in the same year — the shared IRS elective-deferral limit (§15) covers BOTH sides combined, not each separately.'],
        ['The employer match — the signature edge', 'A 401(k)’s defining superpower: the EMPLOYER MATCH. Many companies add money when you contribute — a classic formula is 50% or 100% of your contributions up to a few percent of pay. That match is an immediate, guaranteed return no other account offers — the closest thing to free money in investing. The rule of thumb: contribute at LEAST enough to capture the full match before funding anything else. (Note: employer-match dollars land on the pre-tax side even if YOUR contributions go Roth.)', true],
        ['How it differs from a 403(b)', 'A 403(b) is the 401(k)’s near-twin for §501(c)(3) nonprofits — public schools, universities, hospitals, charities. Same payroll-deferral idea, similar limits, but it lives under a different slice of the tax code: a 403(b) carries a unique 15-years-of-service catch-up and an annuity/insurance heritage that can mean higher fees and narrower fund menus. A 401(k) has no 15-year catch-up, is governed by ERISA, and typically offers a broader (though still menu-limited) lineup. Which one you hold is decided entirely by whether your employer is for-profit or nonprofit.'],
        ['How it differs from an IRA', 'An IRA is the account YOU open on your own, outside any employer. The headline difference is room: a 401(k)’s elective-deferral limit is several times larger than the IRA contribution limit (see §15), so the 401(k) is where the heavy lifting happens. Trade-offs: an IRA gives you the WHOLE market to choose from (a 401(k) is limited to your plan’s menu), but a 401(k) adds the employer match, stronger ERISA creditor protection, and the Rule-of-55. Most plans use both: max the 401(k) match first, then an IRA for choice, then back to the 401(k).'],
        ['Early-access edge — the Rule of 55', 'A 401(k)’s early-retirement lever: if you leave your job in or after the YEAR you turn 55, you can withdraw from THAT employer’s 401(k) with no 10% early-withdrawal penalty — years before the usual 59½. (An IRA does not have this; rolling a 401(k) into an IRA FORFEITS the Rule-of-55 access.) If early retirement is on the table, think twice before rolling an old 401(k) out — you may be giving up the penalty-free bridge.'],
        ['The RMD side', 'The Traditional 401(k) has required minimum distributions (RMDs): starting at age 73, the IRS makes you draw the balance down each year whether you need it or not — miss one and the penalty is 25% of the shortfall (§16A). The Roth 401(k) NO LONGER has lifetime RMDs (SECURE 2.0, starting 2024) — but rolling it to a Roth IRA still cleanly removes any doubt and keeps it growing untouched (§16C). RMDs are a pre-tax feature, not a Roth one.'],
        ['Creditor protection (worth knowing)', 'Because a 401(k) is an ERISA plan, its assets get strong federal protection from creditors and lawsuits — generally stronger and more uniform than an IRA’s (which depends on state law). This is a quiet reason NOT to reflexively roll an old 401(k) into an IRA: beyond the Rule-of-55, you may be trading away creditor protection too.'],
        ['Missed-RMD penalty — the pre-tax teeth (SECURE 2.0)', 'On the pre-tax side, RMDs aren’t optional — miss one and the IRS penalty is 25% of what you should have taken (down from 50% under SECURE 2.0, and as low as 10% if you fix it quickly). The Roth source has no RMD for you, so this bites only the pre-tax match/rollover portion.'],
        ['Small-balance force-out — the tiers when you leave', 'If you leave this job with a smaller balance, your old plan can push you out: under ~$1,000 it may be cashed out (taxable), $1,000–$7,000 auto-rolled into an IRA in your name, and above $7,000 it can stay put. Knowing the tier tells you whether to roll it deliberately before they do it for you.'],
        ['Roth 401(k) → Roth IRA is one-way', 'One quiet asymmetry: a Roth 401(k) can roll into a Roth IRA, but not back into a future employer’s plan — and once it’s in a Roth IRA, RMDs disappear entirely. Pre-tax 401(k) money keeps that two-way flexibility; Roth doesn’t.'],
        ['Revenue-sharing — the hidden fee inside the expense ratio', 'Watch for ‘revenue-sharing’ funds — options that quietly pay your plan’s recordkeeper out of their expense ratio. They look normal but cost more than an identical index fund; if your menu has a lower-cost equivalent, it’s usually the better pick.'],
        ['401(k) loan vs. withdrawal — the acceleration trap', 'A 401(k) loan isn’t a withdrawal — you borrow up to half your vested balance (capped at $50,000), repay yourself with interest over ~5 years, and owe no tax if you repay on time. The trap: leave or lose the job and the loan usually accelerates — unpaid, it becomes a taxable distribution plus the 10% penalty. Borrowed dollars also stop compounding while they’re out.'],
        ['Bottom line', 'You didn’t pick a 401(k) over a 403(b) or IRA — your employer being a private company did. What matters now: it’s your highest-limit workplace account, its superpower is the employer match (capture it in full first), and — if you might retire early — the Rule-of-55 makes it a penalty-free bridge that an IRA can’t match. Feed it to the match, choose your Traditional/Roth split with intent, and don’t roll it out without knowing what you’d give up.'],
      ]);
    }
    function _diTaxableWhyPanel(acc, base) {
      return _diWhyPanel('Why you’d use a taxable brokerage — the account with no rules, and no shelter', [
        ['The one-line answer', 'A taxable brokerage is the everyday investment account with NO IRS limits, NO early-withdrawal penalty, and NO required withdrawals — in exchange for no upfront tax break. It’s the most flexible money you own, and the most tax-exposed.'],
        ['No limits, full liquidity', 'You can add any amount and withdraw any day at any age — no $23,500 cap, no 59½ gate, no 10% penalty, no RMDs. That freedom is the whole reason it exists: it’s money you can actually reach before and during retirement without asking permission from the tax code.'],
        ['The role — after you max the shelters', 'The classic order: capture your employer match, max your tax-advantaged rooms (401(k), IRA, HSA), THEN the overflow lands here. A taxable account isn’t a consolation prize — it’s the bridge that funds early-retirement years before penalty-free access opens, and the bucket with no ceiling once the sheltered ones are full.'],
        ['How it’s taxed — gains & dividends', 'You’re taxed on what you REALIZE, when you realize it. Sell after holding over a year and the gain gets the lower LONG-TERM capital-gains rate; sell inside a year and it’s taxed as ordinary income. Qualified dividends also get the preferential rate. You control the timing — which is a lever no tax-deferred account gives you.'],
        ['Tax-loss harvesting (a taxable-only tool)', 'When a holding is down, you can SELL to book the loss, use it to offset other gains (and up to $3,000 of ordinary income a year), then reinvest in something similar. This turns a market dip into a real tax saving — a move that simply doesn’t exist inside a retirement account. Mind the 30-day wash-sale rule.', true],
        ['The step-up at death (the quiet superpower)', 'If you hold an appreciated position until death, your heirs’ cost basis “steps up” to the value on that date — the entire lifetime gain can escape capital-gains tax forever. This makes a taxable account a surprisingly strong estate-and-legacy vehicle: the very gains you avoided realizing can pass untaxed.'],
        ['The foreign tax credit edge', 'International funds pay taxes to foreign governments. In a taxable account those foreign taxes can flow back to you as a Foreign Tax Credit on your return — a dollar-for-dollar benefit you generally CANNOT claim inside an IRA or 401(k). It’s a real, often-missed reason to hold international exposure here rather than in a sheltered room.'],
        ['The asset-location flip', 'Because bond interest is taxed yearly at ordinary rates, bonds are the LEAST efficient holding here — while tax-favored stocks and international funds fit best. If you also hold retirement rooms, the lesson is “bonds THERE, stocks and foreign HERE.” Datum reads this across all your accounts so the whole book sits in the right homes.'],
        ['Bottom line', 'You use a taxable account for freedom: no limits, no penalties, full liquidity, and tools — harvesting, timing, step-up, the foreign-tax credit — that no sheltered account offers. The price is an annual tax on dividends and a bill when you sell winners. Fill it AFTER the shelters, hold the tax-efficient stuff here, and it becomes your most versatile money.'],
      ]);
    }
    function _di457ColTips(isRoth) {
      var why = '<br><br><strong>Why it matters for your retirement</strong>';
      return {
        'Ticker': { t: 'Ticker', b: 'The symbol of this single holding.' + why + 'Names the bet on this row. In a 457(b) you picked it from your plan’s fund menu — a shorter list than the open market, so each choice is made within the lineup your employer offers.' },
        'Name': { t: 'Name', b: 'The full security name behind the ticker.' + why + 'Tells you what you actually own — a broad index fund, a bond fund, a target-date fund. The plainer and broader the name, the more this row is built to be left alone for a long retirement.' },
        'Price': { t: 'Price', b: 'The latest reference price per share.' + why + 'A reference point, not a live quote — shown sourced-or-blank, never a stale guess. It only matters paired with shares: price × shares is what this row is worth to your plan.' },
        'Shares Owned': { t: 'Shares Owned', b: 'How many units of this holding you own.' + why + 'The size of the position. Shares × price = this row’s value — the number that decides how much weight this single holding carries in your 457(b).' },
        'Position Value': { t: 'Position Value', b: 'Shares × price — what this holding is worth today.' + why + 'The dollar weight this row pulls. All 4 boxes above are VALUE-WEIGHTED — a big-value row steers the whole account’s beta, yield, and fee far more than a small one.' },
        'Cost Basis': { t: 'Cost Basis', b: 'What you paid for this holding (user-entered).' + why + 'Always entered by you — no source publishes your basis. ' +
          (isRoth ? 'In the Annex it never matters for tax — qualified growth is tax-free.' : 'In the Workshop it barely matters at withdrawal: the whole balance is ordinary income regardless of basis.') +
          ' We still track it so Unrealized Gain can show.' },
        'Unrealized Gain': { t: 'Unrealized Gain', b: 'Value − Cost Basis for THIS row (blank if no basis).' + why +
          (isRoth ? 'In a Roth 457(b) this paper gain is yours tax-free once qualified — and reachable penalty-free the day you separate.' : 'In a Traditional it’s tax-DEFERRED: this gain becomes ordinary income on the way out.') +
          ' Either way no yearly capital-gains tax — the 457(b) wrapper shields the gain while it grows. Feeds the Unrealized Gain box.' },
        'Beta': { t: 'Beta', b: 'This holding’s market sensitivity (sourced-or-blank).' + why + 'How hard this one position swings — 1.00 moves with the market, above is jumpier, below steadier. BLANK when no source publishes it (we never fake a beta).' +
          (isRoth ? ' The Roth 457(b) is a fine home for higher-beta bets — the upside is untaxed.' : '') + ' Feeds the Weighted Beta box.' },
        'Yield': { t: 'Yield', b: 'This holding’s dividend yield (sourced-or-blank).' + why + 'The income this position throws off as a %. In a 457(b) these dividends reinvest with ZERO yearly tax drag — unlike a taxable account. Blank when unpublished. Feeds the Blended Yield box.' },
        'Geography': { t: 'Geography', b: 'Where this holding is invested — at the granular level we track (US large-blend, foreign developed, emerging, global blend, US bonds, cash).' + why + 'Tells you how much of this row rides on the rest of the world — and WHICH part. We read the granular tag, not just "US vs international." Honest caveat: reflects published domicile, not always true exposure.' },
        'Sector': { t: 'Sector', b: 'The granular industry or theme this holding sits in — broad-market core, or a named tilt like semiconductors, energy, REITs, dividend growth.' + why + 'Sectors boom and bust together. Reading the granular sector per row spots when several tickers quietly stack into ONE theme. Broad-market rows (large/total/blend) are NOT a tilt.' +
          (isRoth ? ' A high-risk theme is a natural Roth bet — binary upside comes out untaxed.' : '') },
        'Exp Ratio': { t: 'Exp Ratio', b: 'The annual fund fee for this holding, as a %.' + why + 'The yearly drag this one fund skims. In a 457(b) you can’t shop the whole market, but you CAN pick the lowest-cost share class your plan offers — so a high number here is still partly fixable from within the menu.' },
        'Asset Class': { t: 'Asset Class', b: 'Whether this row is equity, bond, cash, or alternative.' + why + 'The job this holding does: equity = growth engine, bond = ballast, cash = buffer, alt = hedge. The mix across rows is your real risk dial — built from the funds your plan makes available.' },
        'Instrument': { t: 'Instrument', b: 'Whether this row is an ETF, mutual fund, individual stock, or cash.' + why + 'Funds spread your money across many companies so no single failure sinks you. A governmental 457(b) menu is typically all funds — which is exactly what you want for a bucket meant to be left alone for decades.' }
      };
    }
    function _di401kColTips(isRoth) {
      var why = '<br><br><strong>Why it matters for your retirement</strong>';
      var r = !!isRoth;
      return {
        'Ticker': { t: 'Ticker', b: 'The symbol of this single holding.' + why + 'Names the bet on this row. In a 401(k) you picked it from your employer’s plan menu — a shorter list than the open market, so each choice is made within the lineup your employer offers.' },
        'Name': { t: 'Name', b: 'The full security name behind the ticker.' + why + 'Tells you what you actually own — a broad index fund, a bond fund, a target-date fund. The plainer and broader the name, the more this row is built to be left alone for a long retirement.' },
        'Price': { t: 'Price', b: 'The latest reference price per share.' + why + 'A reference point, not a live quote — shown sourced-or-blank, never a stale guess. It only matters paired with shares: price × shares is what this row is worth to your plan.' },
        'Shares Owned': { t: 'Shares Owned', b: 'How many units of this holding you own.' + why + 'The size of the position. Shares × price = this row’s value — the number that decides how much weight this single holding carries in your 401(k).' },
        'Position Value': { t: 'Position Value', b: 'Shares × price — what this holding is worth today.' + why + 'The dollar weight this row pulls. All 4 boxes above are VALUE-WEIGHTED — a big-value row steers the whole account’s beta, yield, and fee far more than a small one.' },
        'Beta': { t: 'Beta', b: 'This holding’s market sensitivity (sourced-or-blank).' + why + 'How hard this one position swings — 1.00 moves with the market, above is jumpier, below steadier. BLANK when no source publishes it (we never fake a beta).' + (r ? ' The Roth 401(k) is a fine home for higher-beta bets — the upside is untaxed.' : '') + ' Feeds the Weighted Beta box.' },
        'Yield': { t: 'Yield', b: 'This holding’s dividend yield (sourced-or-blank).' + why + 'The income this position throws off as a %. In a 401(k) these dividends reinvest with ZERO yearly tax drag — unlike a taxable account. Blank when unpublished. Feeds the Blended Yield box.' },
        'Geography': { t: 'Geography', b: 'Where this holding is invested — at the granular level we track (US large-blend, foreign developed, emerging, global blend, US bonds, cash).' + why + 'Tells you how much of this row rides on the rest of the world — and WHICH part. We read the granular tag, not just “US vs international.” The account’s overall lean rolls up from these rows (see §13 geo map). Honest caveat: reflects published domicile, not always true exposure.' },
        'Sector': { t: 'Sector', b: 'The granular industry or theme this holding sits in — broad-market core, or a named tilt like semiconductors, energy, REITs, dividend growth.' + why + 'Sectors boom and bust together. Reading the granular sector per row spots when several tickers quietly stack into ONE theme. Broad-market rows (large/total/blend) are NOT a tilt; only a named theme above ~20% of equity surfaces in the account paragraph (see §13 sector map).' + (r ? ' A high-risk theme is a natural Roth bet — binary upside comes out untaxed.' : '') },
        'Exp Ratio': { t: 'Exp Ratio', b: 'The annual fund fee for this holding, as a %.' + why + 'The yearly drag this one fund skims. In a 401(k) you can’t shop the whole market, but you CAN pick the lowest-cost share class your plan offers — and watch for revenue-sharing funds that quietly pay your plan’s recordkeeper. A high number here is still partly fixable from within the menu.' },
        'Asset Class': { t: 'Asset Class', b: 'Whether this row is equity, bond, cash, or alternative.' + why + 'The job this holding does: equity = growth engine, bond = ballast, cash = buffer, alt = hedge. The mix across rows is your real risk dial — built from the funds your plan makes available.' },
        'Instrument': { t: 'Instrument', b: 'Whether this row is an ETF, mutual fund, individual stock, or cash.' + why + 'Funds spread your money across many companies so no single failure sinks you. A 401(k) menu is typically all funds — which is exactly what you want for a bucket meant to be left alone for decades.' },
      };
    }
    function _diTaxColTips() {
      var why = '<br><br><strong>Why it matters for your retirement</strong>';
      return {
        'Ticker': { t: 'Ticker', b: 'The symbol of this single holding.' + why + 'The market symbol for this holding. Type it and we auto-fill everything we can source — every field stays yours to override. In a Taxable Brokerage, you picked every one of these off the open market — so each ticker is a choice you made, not a slot a plan handed you.' },
        'Name': { t: 'Name', b: 'The full security name behind the ticker.' + why + 'Tells you what you actually own — a broad index, a single company, a bond fund. The plainer and broader the name, the more this row is built to be left alone for a long retirement.' },
        'Price': { t: 'Price', b: 'The latest reference price per share.' + why + 'What one unit costs. Price × shares is the value doing the work — every signal above is weighted by it.' },
        'Shares Owned': { t: 'Shares Owned', b: 'How many units of this holding you own.' + why + 'The size of the position. Shares × price = this row’s value — the number that decides how much weight this single holding carries in your account.' },
        'Position Value': { t: 'Position Value', b: 'Shares × price — what this holding is worth today.' + why + 'This is the dollar weight this row pulls in the account. Every one of the 4 boxes above is VALUE-WEIGHTED — so a big-value row steers the whole account’s beta, yield, and fee far more than a small one.' },
        'Cost Basis': { t: 'Cost Basis', b: 'What you paid for this holding (user-entered).' + why + 'What you originally paid for this holding — your total cost, including reinvested dividends. We use it to find your real embedded gain, so the capital-gains tax is exact instead of a guess.' },
        'Unrealized Gain': { t: 'Unrealized Gain', b: 'Value − Cost Basis for THIS row (blank if no basis).' + why + 'Value minus what you paid — growth you haven’t sold yet. In a taxable account this is the slice the capital-gains tax will touch.' },
        'Beta': { t: 'Beta', b: 'This holding’s market sensitivity (sourced-or-blank).' + why + 'How hard this one position swings with the market — 1.00 moves with it, above is jumpier, below is steadier. Left BLANK when no source publishes it (we never fake a beta). In a taxable account, remember the violent upside on a high-beta bet is also a bigger capital-gains bill when you sell it. This row feeds the Weighted Beta box above.' },
        'Yield': { t: 'Yield', b: 'This holding’s dividend yield (sourced-or-blank).' + why + 'Cash this holding pays you per year, as a % of its price. In a taxable account this income is taxed the year you receive it — even if you reinvest it — so it’s real money the market hands you, minus a yearly tax bite.' },
        'Geography': { t: 'Geography', b: 'Where this holding is invested — at the granular level we track (US large-blend, foreign developed, emerging, global blend, US bonds, cash).' + why + 'Tells you how much of this row rides on the rest of the world — and WHICH part of the world. We read the granular tag, not just “US vs international,” so a developed-market fund and an emerging-market bet aren’t blurred into one word. The account’s overall lean rolls up from these rows (see §13 geo map). Caveat we keep honest: this reflects published domicile, which isn’t always true investment exposure.' },
        'Sector': { t: 'Sector', b: 'The granular industry or theme this holding sits in — broad-market core, or a named tilt like semiconductors, energy, REITs, dividend growth.' + why + 'Sectors boom and bust together. Reading the granular sector on each row lets you spot when several tickers quietly stack into ONE theme — the concentration most people never see because it hides across different names. Broad-market rows (large/total/blend) are NOT a tilt; only a named theme above ~20% of equity surfaces in the account paragraph (see §13 sector map). One theme dominating your equity is a tilt worth knowing about — it shows up in your Datum Intelligence.' },
        'Exp Ratio': { t: 'Exp Ratio', b: 'The annual fund fee for this holding, as a %.' + why + 'The fund’s yearly fee, quietly subtracted before you see returns. Over decades this is one of the few levers you fully control. Because you bought it on the open market, a high number here is FIXABLE — a cheaper index equivalent is usually one trade away. This row feeds the Avg Expense box above.' },
        'Asset Class': { t: 'Asset Class', b: 'Whether this row is equity, bond, cash, or alternative.' + why + 'It sets your mix — the single biggest driver of how your account behaves on the way to retirement. The job this holding does: equity = growth engine, bond = ballast, cash = buffer, alt = different-drummer hedge.' },
        'Instrument': { t: 'Instrument', b: 'Whether this row is an ETF, mutual fund, individual stock, or cash.' + why + 'What kind of wrapper this is — a single stock, a fund, an annuity, a cash sweep. Single names concentrate risk; funds spread it; the cash sweep sits out of the market.' },
        'Acquisition Date': { t: 'Acquisition Date', b: 'The date you bought or acquired this holding (optional, user-entered; blank until you fill it in).' + why + 'When you actually bought this holding. It’s optional — leave it blank and nothing breaks — but if you enter it, it starts your holding-period clock: in a taxable account, selling inside ~1 year means gains are taxed at your higher ordinary (short-term) rate, while holding past a year qualifies them for the lower long-term capital-gains rate.' }
      };
    }
    function _cbFmt(v) { var n = parseFloat(v); return (v === '' || v === null || v === undefined || !isFinite(n)) ? '' : '$' + Number(n).toLocaleString('en-US'); }
    function _diLotColTips(baseId) {
      var shelter = {
        'Cost Basis': 'Shows "—" here. Cost basis is what you paid for a lot — it only drives a TAX event when you sell inside a taxable account. In this shelter there is no capital-gains tax to size, so per-lot basis has nothing to compute against and stays "—".',
        'Unrealized Gain': 'Shows "—" here. Per-lot embedded gain matters in a taxable account because selling one lot vs another changes your tax bill. Inside this wrapper rebalancing is a tax non-event and there is no wash-sale, so per-lot gain never renders.',
        'Acquisition Date': 'Shows "—" here. Acquisition date sets the short-vs-long-term holding clock — but that clock only matters where capital-gains rates apply. Inside this shelter the holding-period clock does not run, so the date is not tracked per lot.'
      };
      var k401 = {
        'Cost Basis': 'Shows "—" in a 401(k). Cost basis is what you paid for a lot, and it drives capital-gains tax — but a 401(k) has no capital-gains tax to drive. Traditional withdrawals are taxed as ordinary income on the FULL amount; Roth qualified withdrawals are tax-free entirely. The IRS never asks what you paid, so there\'s no basis to track.',
        'Unrealized Gain': 'Shows "—" in a 401(k). Per-lot embedded gain matters in a taxable account because selling triggers a tax bill sized by that gain. Here, selling and rebalancing inside the plan is a tax non-event — you can trade freely without a wash-sale or gains worry — so there\'s no per-lot gain to surface.',
        'Acquisition Date': 'Shows "—" in a 401(k). Acquisition date sets the short-vs-long-term holding clock that changes your tax rate in a brokerage. That clock doesn\'t run inside a 401(k): the holding period is irrelevant to how withdrawals are taxed, so the date carries no tax meaning here.'
      };
      var kHsa = {
        'Cost Basis': 'Shows "—" in an HSA. Cost basis sizes a capital-gains tax on sale — but qualified HSA growth is tax-free and even non-qualified withdrawals are taxed as ordinary income, never as per-lot gains. Nothing to compute, so it stays "—".',
        'Unrealized Gain': 'Shows "—" in an HSA. Per-lot gain drives lot-selection tax decisions in a taxable account; inside the HSA rebalancing is a tax non-event, so per-lot embedded gain never renders.',
        'Acquisition Date': 'Shows "—" in an HSA. The short-vs-long-term clock only matters where capital-gains rates apply. The HSA has no holding-period tax event, so acquisition date is not tracked per lot.'
      };
      var kRoll = {   // §RP R190–R192 — Rollover 401(k) "The Conduit" (verbatim); before /401k/ (rollover matches /401k/)
        'Cost Basis': 'Shows "—" in a Rollover 401(k). Cost basis is what you paid for a lot, and its only job is to size a capital-gains tax — but a Rollover 401(k) has no capital-gains tax to size. Pre-tax dollars are taxed as ordinary income on the FULL amount at withdrawal; any Roth side comes out tax-free. The IRS never asks what you paid, so there is no basis to track.',
        'Unrealized Gain': 'Shows "—" in a Rollover 401(k). Per-lot embedded gain matters in a brokerage because selling triggers a tax bill sized by that gain. Inside a Rollover 401(k), buying and selling to rebalance is a tax non-event — no wash-sale trap, no gains bill — so there is no per-lot gain to surface.',
        'Acquisition Date': 'Shows "—" in a Rollover 401(k). Acquisition date sets the short-vs-long-term clock that changes your tax rate in a taxable account. That clock does not run inside a Rollover 401(k): the holding period has no bearing on how withdrawals are taxed, so the date carries no tax meaning here.'
      };
      var m = /rollover/.test(baseId) ? kRoll : /401k/.test(baseId) ? k401 : /hsa/.test(baseId) ? kHsa : shelter;
      var out = {};
      ['Cost Basis', 'Unrealized Gain', 'Acquisition Date'].forEach(function (k) { out[k] = { t: k, b: m[k] }; });
      return out;
    }
    function _diConduitWhyPanel(acc, base) {
      return _diWhyPanel('Why you have a Rollover 401(k) — and how to not lose anything in the move', [
        ['The one-line answer', 'You have a Rollover 401(k) because you left an employer and moved that old plan’s money into an account you control — without cashing it out. It keeps its retirement tax status; it just no longer lives at a former job.'],
        ['The whole point — consolidation', 'Old 401(k)s scattered across former jobs are easy to lose track of, and each carries its own fees and fund menu. Rolling them into one place lets you actually see the total, control the investment menu, and manage one balance instead of chasing several. That visibility is the main reason this room exists.'],
        ['Tax status is preserved', 'A direct rollover is not a taxable event. Pre-tax dollars stay pre-tax (taxed as ordinary income at withdrawal); any Roth dollars stay Roth (tax-free when qualified). The retirement clock and character carry over — you did not “cash out,” so no penalty and no tax are triggered by the move itself.'],
        ['Your 4 choices when you left (why THIS one)', 'When you leave a job you can (1) leave the money in the old plan, (2) roll it to your NEW employer’s plan, (3) roll it to an IRA or a Rollover 401(k) like this one, or (4) cash out (usually the worst — taxes plus a 10% penalty before 59½). This account is choice 3: you kept the tax shelter and gained control of the menu.'],
        ['The Rule-of-55 trap (the big one)', 'The Rule of 55 lets you tap the plan at your MOST RECENT employer penalty-free if you leave in or after the year you turn 55. Money rolled OUT of that plan into this rollover account generally LOSES that early access — it reverts to the age-59½ gate. If early retirement is even possible, weigh leaving money in the last employer’s plan before rolling it here.', true],
        ['Direct vs indirect rollover', 'A DIRECT rollover (plan-to-plan, you never touch the check) is clean — nothing withheld, nothing owed. An INDIRECT rollover (the check comes to you) triggers a mandatory 20% withholding and a 60-day deadline to redeposit the FULL amount, or the shortfall is taxed and penalized. Always prefer direct.'],
        ['Don’t commingle if you might go backdoor', 'Keeping former-employer money in a Rollover 401(k) (rather than a Traditional IRA) keeps your IRA balances clean — which matters if you ever do a Backdoor Roth. Pre-tax dollars sitting in a Traditional IRA trigger the pro-rata rule and tax part of the conversion; the same dollars parked in a 401(k) do not. It is a real reason to choose a 401(k) rollover over an IRA rollover.'],
        ['Bottom line', 'You didn’t open this to invest new paychecks — you opened it to rescue and consolidate an old plan without losing its tax shelter. Make the transfer DIRECT, watch the Rule-of-55 forfeiture if early retirement is on the table, and remember it usually holds rolled-in money, not fresh contributions.'],
      ]);
    }
    function _lienRank(a) {
        var id = String(a && a.baseId || '');
        if (id.indexOf('mortgage') === 0) return 0;   // first lien
        if (id.indexOf('heloc') === 0) return 1;       // second lien
        return 2;
    }
    function _linkedJumpLine(label, accts, color, removeCtx) {
        if (!accts || !accts.length) return '';
        var chips = accts.map(function (a) {
            var t = _returnNavLabel(getBaseType(a.baseId));
            var chip = '<span onclick="openAccountModal(\'' + a.id + '\')" style="cursor:pointer; border-bottom:1px dotted currentColor;" title="Open this account">' + t + '</span>';
            if (removeCtx) {
                var debtId = removeCtx.selfIsDebt ? removeCtx.selfId : a.id;
                var assetId = removeCtx.selfIsDebt ? a.id : removeCtx.selfId;
                chip += '<span onclick="_unlinkSecured(\'' + debtId + '\', \'' + assetId + '\')" style="cursor:pointer; margin-left:5px; opacity:0.55; font-weight:bold;" title="Unlink — separates the two, deletes nothing">✕</span>';
            }
            return chip;
        }).join(' · ');
        // §18.5 — a healthy link reads as an informational STATUS, not a 10px danger warning: a subtle pill,
        // readable body size, muted mono label, chips in their semantic color (teal asset / danger debt).
        return '<div style="margin-bottom:16px; padding:8px 11px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; font-size:12px; line-height:1.5;">'
             + '<span style="color:rgba(255,255,255,0.55); font-family:var(--font-mono); font-size:10px; letter-spacing:0.05em;">' + label + '</span> '
             + '<span style="color:' + (color || 'var(--danger)') + ';">' + chips + '</span></div>';
    }
    function _linkControlHTML(id, acc, base) {
        var isDebt = base.taxCode === 'debt';
        var linkedNow, linkable, canManage, statusColor, statusLabel, triggerLabel, draftLabel, sectionNoun;
        if (isDebt) {
            var scope = _securedLinkScope(base);
            var la = acc.linkedAssetId ? state.accounts.find(function (a) { return a.id === acc.linkedAssetId; }) : null;
            linkedNow = la ? [la] : [];
            linkable = la ? [] : state.accounts.filter(function (a) { var b = getBaseType(a.baseId); return b && b.taxCode === 'physical' && scope(b); });
            canManage = !la;   // single-link: no link/draft while already linked (one-link-of-record)
            statusColor = 'var(--teal-mid)'; statusLabel = 'Linked Asset';
            triggerLabel = 'Link or draft a property…'; draftLabel = '+ Draft New Property'; sectionNoun = 'PROPERTY';
        } else {
            var rev = _assetReverseScope(base);
            linkedNow = state.accounts.filter(function (a) { return a.linkedAssetId === id; });
            linkedNow.sort(function (a, b) { return _lienRank(a) - _lienRank(b); });   // first-lien first
            // PARKED edge (not built): two escrow-carrying mortgages on ONE property — the §18.2 resolver
            // (_linkedMortgageWith) picks the FIRST. Rare (1st/2nd mortgage both escrowing tax/ins); disambiguate
            // only if it's ever hit in real use.
            linkable = state.accounts.filter(function (a) { var b = getBaseType(a.baseId); return b && b.taxCode === 'debt' && rev(b) && !a.linkedAssetId; });
            canManage = true;   // multi-link
            statusColor = 'var(--danger)'; statusLabel = 'Linked Debts';
            triggerLabel = 'Link or draft a liability…'; draftLabel = '+ Draft New Liability'; sectionNoun = 'LIABILITY';
        }
        var out = '';
        // header label — preserve the HELOC "your collateral" authored hover (L47/L48)
        out += isDebt
            ? (base.title === 'HELOC'
                ? '<div class="input-label modal-tt-wrap" style="color:var(--teal-mid); cursor:help; margin-bottom:4px;">Linked collateral (calculates equity)<div class="modal-tt" style="left:0; right:auto;"><strong>Your collateral</strong>This line is secured by the linked property. Your equity is what backs it — and what\'s at risk if it goes unpaid.</div></div>'
                : '<div class="input-label" style="color:var(--teal-mid); margin-bottom:4px;">Linked collateral (calculates equity)</div>')
            /* ⛔ 'PROPERTY' WAS THE WRONG NOUN ON A VEHICLE, AND IT WAS UNCONDITIONAL. Flagged twice
             * in the bank (§33.0, §33.6 R424) and confirmed live. Same family as the Yard's hardcoded
             * "The Property" (§19.11): a label written when this control served one room only.
             * ⭐ SCOPED BY MEASUREMENT, NOT BY ASSUMPTION. I first reported this as hitting vehicles
             * AND collectibles because the label is unconditional INSIDE this function — but the
             * function's CALL SITES are not: 7867 is debt-only (which takes the isDebt branch above)
             * and 7974 is `physical && !collectibles`. COLLECTIBLES NEVER REACH THIS LINE, so there
             * are exactly TWO rooms here and both have an authored noun. 🔑 "UNCONDITIONAL INSIDE A
             * FUNCTION" IS A CLAIM ABOUT THE FUNCTION, NEVER ABOUT WHO CALLS IT.
             * The hover is §33.6 R424 verbatim; it lands with the noun rather than in a later commit,
             * so this line is edited once. */
            /* ⚠️ THE HOVER IS VEHICLE-ONLY, AND THE ASYMMETRY IS L47, NOT AN OVERSIGHT. R424 authors
             * the hover for a VEHICLE. There is NO authored hover for the property side of this
             * control. My first cut wrote one "by analogy" — a mortgage-and-HELOC sentence shaped
             * like R424 — and that is exactly the fabrication the standing law forbids: plausible,
             * house-voiced, and sourced nowhere. The property label keeps today's plain form until
             * the Architect authors one. FLAGGED, NOT INVENTED. */
            : (/^auto(_primary|_co)?$/.test(base.id)
                ? '<div class="input-label modal-tt-wrap" style="color:var(--danger); margin-bottom:4px; cursor:help;">Liabilities secured by this vehicle'
                  + '<div class="modal-tt" style="left:0; right:auto;"><strong>Linked liabilities</strong>Loans tied to this vehicle &mdash; usually an auto or boat loan. Link one and it shows here automatically; nothing linked, nothing owed.</div></div>'
                : '<div class="input-label" style="color:var(--danger); margin-bottom:4px;">Liabilities secured by this property</div>');
        // prominent 🔗 status line — clickable nav + inline ✕ unlink (Commit 2b), at the control, sourced-or-blank
        if (linkedNow.length) {
            out += _linkedJumpLine('🔗 ' + statusLabel + ':', linkedNow, statusColor, { selfId: id, selfIsDebt: isDebt });
            // 🌳 THE YARD — when a property + its lien(s) form a Yard, offer the combined view from the single room
            // too. propId = the linked property (the asset on a debt; this room itself on the property side).
            var _yardProp = isDebt ? (linkedNow[0] || null) : { id: id, baseId: base.id };
            if (_yardProp && String((getBaseType(_yardProp.baseId) || {}).id).indexOf('property') === 0) {
                /* §19.14 — THE DOOR NAMES THE ROOM IT OPENS. This read "Open The Yard" on every
                   purpose, so a landlord clicked a control named THE YARD and arrived in THE HOLDING.
                   Correct history, stale product: Yard §9.5 authored it when THE YARD was the only
                   combined room that existed. Tokenised on the SAME §12.1 map the room itself uses.
                   ⛔ THE FALLBACK IS TYPE-FIRST, NEVER A BRAND NOUN. If the name will not resolve we
                   say "the combined view" — we never name a room the user is not standing in, which
                   is the exact defect being fixed here. */
                /* ⚠️ _yardProp is a SYNTHETIC {id, baseId} literal on the property side (see just above)
                   — it carries no propPurpose, so naming the door off it would resolve to the §12.1
                   fallback and print "Open The Yard" on every purpose: the exact defect, re-shipped
                   inside its own fix. Resolve the REAL account before asking it anything. */
                var _yardAcc = (state.accounts || []).find(function (a) { return a.id === _yardProp.id; }) || null;
                var _yardDoorName = (typeof _propCombinedName === 'function') ? _propCombinedName(_yardAcc) : '';
                var _yardDoorCopy = _yardDoorName ? ('Open ' + _yardDoorName + ' — the combined view') : 'Open the combined view';
                out += '<div onclick="if(typeof closeAccountModal===\'function\')closeAccountModal(); if(typeof openYardModal===\'function\')openYardModal(\'' + _yardProp.id + '\');" style="cursor:pointer; margin:-6px 0 16px; font-size:11px; color:var(--gold); display:inline-block; border-bottom:1px dotted var(--gold);" title="See this property and everything linked against it as one combined room">🌳 ' + _yardDoorCopy + '</div>';
            }
        }
        // the disclosure: link an existing + draft a new (hidden on a single-link debt that's already linked)
        if (canManage) {
            var rows = linkable.map(function (a) {
                var t = _returnNavLabel(getBaseType(a.baseId));
                var nm = String(a.propName || a.name || '');
                var extra = (nm && nm !== t) ? ' <span style="opacity:0.55;">— ' + nm.replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</span>' : '';
                var onclk = isDebt ? "updateAccField('" + id + "', 'linkedAssetId', '" + a.id + "')" : "linkDebtToAsset('" + id + "', '" + a.id + "')";
                return '<div onclick="' + onclk + '" style="padding:7px 10px; cursor:pointer; color:var(--white); font-size:12px; border-radius:3px;" onmouseover="this.style.background=\'rgba(255,255,255,0.06)\'" onmouseout="this.style.background=\'transparent\'">' + t + extra + '<span style="float:right; opacity:0.45; font-size:10px; font-family:var(--font-mono);">link</span></div>';
            }).join('');
            if (!rows) rows = '<div style="padding:7px 10px; color:rgba(255,255,255,0.4); font-size:11px; font-style:italic;">Nothing available to link — draft one below.</div>';
            var draftOnclk = isDebt ? "createLinkedAsset('" + id + "')" : "_draftLiabilityChooser('" + id + "')";
            out += '<details style="margin:6px 0 18px;">'
                 + '<summary style="list-style:none; cursor:pointer; padding:9px 12px; background:var(--bg-navy); border:1px solid rgba(255,255,255,0.14); border-radius:4px; color:rgba(255,255,255,0.75); font-size:12px;">' + triggerLabel + '  ▾</summary>'
                 + '<div style="border:1px solid rgba(255,255,255,0.10); border-top:none; border-radius:0 0 4px 4px; padding:6px; background:rgba(255,255,255,0.02);">'
                 + '<div style="font-family:var(--font-mono); font-size:9px; letter-spacing:0.1em; color:var(--gold); padding:5px 10px;">LINK AN EXISTING ' + sectionNoun + '</div>'
                 + rows
                 + '<div style="border-top:1px dashed rgba(255,255,255,0.1); margin:6px 0;"></div>'
                 + '<div onclick="' + draftOnclk + '" style="padding:7px 10px; cursor:pointer; color:' + statusColor + '; font-size:12px; font-weight:bold;">' + draftLabel + '</div>'
                 + '</div></details>';
        }
        return out;
    }
    function _helocLimitFieldHTML(id, acc) {
        var hh = _helocHeadroomHTML(acc);
        return `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_dLbl(getBaseType(acc.baseId), 'Credit Limit')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.helocCreditLimit||'')}" oninput="updateAccField('${id}', 'helocCreditLimit', this.value)"></div>
            </div>
            <div id="modal-heloc-headroom-${id}" style="display:${hh ? 'block' : 'none'}; font-size:11px; color: rgba(255,255,255,0.72); line-height:1.5; margin:-6px 0 14px;">${hh}</div>`;
    }
    function _helocPhaseFieldHTML(id, acc) {
        var pc = _helocPhaseClause(acc);
        var opts = ['Draw', 'Repayment'].map(function (o) { return '<option ' + (acc.helocPhase === o ? 'selected' : '') + '>' + o + '</option>'; }).join('');
        return `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_dLbl(getBaseType(acc.baseId), 'Phase')}
                    <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'helocPhase', this.value)">
                        <option value="">Select phase…</option>${opts}
                    </select>
                </div>
            </div>
            <div id="modal-heloc-phase-${id}" style="display:${pc ? 'block' : 'none'}; font-size:11px; color: rgba(255,255,255,0.72); line-height:1.5; margin:-6px 0 14px;">${pc}</div>`;
    }
    function _helocDrawEndFieldHTML(id, acc) {
        return `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_dLbl(getBaseType(acc.baseId), 'Draw Period Ends')}<input type="date" class="small-field" value="${acc.drawPeriodEndDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'drawPeriodEndDate', this.value)"></div>
            </div>`;
    }
    var _PROP_TYPE_DI = {
        'Single-family': 'Your property is a single-family home — the case nearly every homeowners policy is written around. HO-3 is what most single-family owners carry: it covers the structure against anything not specifically excluded, and your belongings against a named list of causes. HO-5 is the broader version — it treats your belongings the same open way it treats the building, which matters most if you own things that are hard to replace. HO-8 exists for older homes where rebuilding would cost far more than the house is worth on the market, and it pays on what things are worth rather than what they cost to replace. Whichever you carry, two things are excluded almost everywhere and are worth knowing about: flood and earthquake. Your own agent can tell you which form your policy actually is — it is written on the first page of your declarations.',
        'Condo': 'Your property is a condo, and that changes the question from what to insure to WHERE YOUR RESPONSIBILITY STARTS. The association carries a master policy on the building, the roof and the shared spaces. HO-6 is the form written for what is left: your unit’s interior, your belongings, and any improvements you have made inside the walls. The gap that catches people is that master policies differ — some cover the original fixtures, some stop at the bare studs, and the difference can be tens of thousands of dollars in a kitchen. Your association’s master policy declarations will say which. It is worth reading once, and worth asking your agent to read with you.',
        'Townhouse': 'Your property is a townhouse, and there is no such thing as townhouse insurance — what you need depends on who owns the walls. If you own the structure, you are in ordinary homeowners territory: HO-3 most often, or HO-5 for broader coverage on your belongings. If a condo-style association owns the shell and you own the inside, HO-6 is the form written for that. If you rent, HO-4 covers your belongings and your liability while the owner insures the building. The distinction is not about the shape of the building — it is entirely about the deed. If you are not certain which applies, your closing documents or your association will say, and your agent can confirm it in a phone call.',
        'Multi-family': 'Your property is a multi-family building, and that puts it in a different insurance family than a single home. If you live in one unit and rent the others, many insurers will still write a homeowners-style policy on it, but the rented portion is a business activity and the policy has to know that. If you live elsewhere and rent all the units, you are in landlord territory — a DP-3 or dwelling-fire policy rather than HO-3. Two things matter here that never come up on an owner-occupied home: LOSS OF RENT, which pays you while the building is unliveable after a covered loss, and LIABILITY, which is broader when tenants and their guests are on your property. Both are worth raising with your agent by name, because a policy written for the wrong occupancy can be the one that does not pay.',
        'Manufactured': 'Your property is a manufactured or mobile home, and it has its own policy form: HO-7. It works much like the standard homeowners form, but it is written for a structure that was built in a factory and moved to its site — which changes how the building is valued and, in many policies, how it is covered while being transported. Two things are worth checking specifically: whether your home is insured for what it would cost to replace or for what it is currently worth, and whether the policy covers wind separately, which is common in coastal and tornado regions. Your agent can tell you which basis your policy uses — the difference shows up only when you claim.',
        'Other': 'Your property is recorded as Other, which means the usual policy forms may or may not fit. Homeowners insurance is written around a short list of familiar structures, and anything outside that list — a barn, a converted building, a tiny home, a property held in an unusual way — is usually handled by a specialty or surplus-lines insurer rather than a standard carrier. There is no shortcut here worth taking: the honest step is to describe the structure plainly to an agent and ask which form they would write it on. What stays true regardless is that flood and earthquake are excluded almost everywhere, whatever the building is.'
    };
    var _PROP_LAND_DI = 'Your property is land, and land is the one case where a homeowners policy does not apply at all — there is no dwelling to insure. What owners of vacant land usually carry instead is LIABILITY cover: protection if someone is injured on the property. It is typically inexpensive, and it is often available as an endorsement on a policy you already hold rather than as a separate purchase. Property tax is generally the whole of the carrying cost here. If you are holding the land to build on later, tell your agent that too — cover changes the moment construction starts.';
    function _propTypeInsuranceDI(acc) {
        if (!acc) return '';
        var txt = (String(acc.propPurpose || '') === 'Land')
            ? _PROP_LAND_DI                                   // purpose outranks type (§26c)
            : _PROP_TYPE_DI[String(acc.propType || '')];      // undefined on blank or unlisted -> silent
        if (!txt) return '';
        return '<div class="di-narrative" style="margin:10px 0 14px;">' + txt + '</div>';
    }
    function _propInsEducationHTML(acc) {
        if (!acc) return '';
        var lines = [
            ['HO-1 — Basic Form',            'HO-1 (Basic) — bare-bones, named-perils only. Rare today; most lenders won\'t accept it.'],
            ['HO-2 — Broad Form',            'HO-2 (Broad) — named-perils on both home and belongings. A step up from HO-1, still limited.'],
            ['HO-3 — Special Form',          'HO-3 (Special) — the standard homeowner policy. Open-perils on the house, named-perils on belongings. If you own a house, this is usually you.', true],
            ['HO-4 — Renters',               'HO-4 (Renters) — covers YOUR belongings and liability inside a place you rent. The building is the landlord\'s policy, not yours.'],
            ['HO-5 — Comprehensive',         'HO-5 (Comprehensive) — open-perils on both the home AND your belongings. The broadest common policy; costs more, claims are easier.'],
            ['HO-6 — Condo/Co-op',           'HO-6 (Condo) — covers your unit\'s interior, belongings, and liability. The association\'s master policy covers the building shell.'],
            ['HO-7 — Mobile/Manufactured',   'HO-7 — an HO-3-style policy written for a mobile or manufactured home.'],
            ['HO-8 — Older/Historic Home',   'HO-8 (Older Home) — for homes whose rebuild cost exceeds market value; pays repair cost rather than full replacement. Common for historic houses.']
        ];
        /* §17.2 TOWNHOME BRANCH (row 192) — CONDITIONAL on the propType field that ALREADY EXISTS
           (studio.html ~7713, options include 'Townhouse'), so nothing new is invented to drive it.
           ⚠️ THE ONE PLACE I RESOLVED A TOKEN RATHER THAN READING IT: the bank writes
           "{branchLine}", which implies a value resolved from data. There is NO "who owns the walls"
           field anywhere in this room, and inventing one would be fabricating a sourced value (L47).
           So the three authored routes are RENDERED FOR THE USER TO SELF-IDENTIFY, in the bank's own
           routing order. That keeps the GUARD intact — it teaches, it does not choose. */
        if (String(acc.propType || '') === 'Townhouse') {
            lines.push(['Townhome — who owns the walls?',
                'Townhome? It depends who owns the walls — if you own the structure, look at HO-3 or HO-5; if you rent, HO-4; if a condo association owns the shell, HO-6.']);
        }
        return _diWhyPanel('Homeowner policy types — HO-1 through HO-8', lines)
             + '<div class="input-label" style="color:var(--muted); font-size:10px; margin-top:6px;">General education, not a coverage recommendation. Your policy and your agent decide what you actually carry.</div>';
    }
    function _propCovFieldHTML(id, acc, key, label, whatsThis, doIHave, align, kind) {
        var side = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';
        var raw = acc[key];
        /* three kinds now: 'money' (digits + $), 'moneypct' (digits + $ OR a percentage — the three
           deductibles), and 'text' (free prose, e.g. an endorsement limit that reads "open perils"). */
        var val = kind === 'money'    ? formatCurrencyDisplay(raw || '')
                : kind === 'moneypct' ? formatMoneyOrPctDisplay(raw || '')
                : String(raw === undefined || raw === null ? '' : raw).replace(/"/g, '&quot;');
        if (kind === 'moneypct') val = String(val).replace(/"/g, '&quot;');
        var cls = kind === 'money'    ? 'small-field curr-format'
                : kind === 'moneypct' ? 'small-field moneypct-format'
                : 'small-field';
        return '<div><span class="input-label modal-tt-wrap" style="cursor:help;">' + label +
               '<div class="modal-tt" style="' + side + '"><strong>What\'s this?</strong>' + whatsThis +
               '<br><br><strong>Do I have enough?</strong>' + doIHave + '</div></span>' +
               '<input type="text" class="' + cls + '" placeholder="—" value="' + val +
               '" oninput="updateAccField(\'' + id + '\', \'' + key + '\', this.value)"></div>';
    }
    var _HO_NOTES = {
        'HO-1': 'Older, narrower forms. These cover a NAMED LIST of causes rather than everything not excluded, so what is and is not on that list matters more here than the limits themselves. Your declarations page lists the perils.',
        'HO-2': 'Older, narrower forms. These cover a NAMED LIST of causes rather than everything not excluded, so what is and is not on that list matters more here than the limits themselves. Your declarations page lists the perils.',
        'HO-4': 'Renters cover: the building is your landlord’s to insure, so Coverage A — Dwelling usually reads zero or is absent on your policy. Coverage C (your belongings) and E (liability) are the lines doing the work here.',
        'HO-5': 'The broadest common form. It treats your BELONGINGS the same open way it treats the building, so Coverage C often behaves better than the same number on an HO-3.',
        'HO-6': 'Condo cover: your association’s master policy insures the building, so Coverage A here is usually a smaller figure covering your unit’s interior and any improvements — not the whole structure. What the master policy stops covering is exactly where yours starts.',
        'HO-7': 'Written for a factory-built home. The figure to check is whether Coverage A is set to what it would cost to REPLACE the home or to what it is currently WORTH — the two can differ sharply, and the difference only appears at claim time.',
        'HO-8': 'Written for homes that would cost far more to rebuild than they would sell for. It generally pays ACTUAL CASH VALUE rather than replacement cost, so Coverage A here is not a rebuild estimate — it is a different promise.'
    };
    function _hoTypeNoteHTML(acc) {
        var n = acc && _HO_NOTES[String(acc.hoType || '')];   // HO-3, blank and unlisted all fall through
        if (!n) return '';
        return '<div style="margin-top:10px; padding:8px 10px; background:rgba(255,255,255,0.03); border-left:2px solid var(--teal-mid); border-radius:2px; font-size:11.5px; line-height:1.55; color:rgba(255,255,255,0.7);">' + n + '</div>';
    }
    function _propCoverageHTML(id, acc) {
        if (!acc) return '';
        var F = function (key, label, w, d, align, kind) { return _propCovFieldHTML(id, acc, key, label, w, d, align, kind || 'money'); };
        /* THE HO-TYPE DROPDOWN (row 195) — the hinge of §17. It switches OFF the §17.2 teach box
           (which was wired against this exact field name in the previous commit) and row 195 also
           says it decides "which fields show".
           ⚠️ "WHICH FIELDS SHOW" IS NOT AUTHORED ANYWHERE — no row states which coverages appear
           for which HO type, and I am NOT inventing that mapping. Deciding that an HO-4 renter has
           no Coverage A is an insurance judgement, and hiding a field is a way of telling the user
           they do not need it, which row 205 forbids ("not advice"). So EVERY field renders on
           EVERY type until the mapping is authored. Flagged, not silently resolved. */
        var opts = ['HO-1','HO-2','HO-3','HO-4','HO-5','HO-6','HO-7','HO-8'].map(function (o) {
            return '<option ' + (acc.hoType === o ? 'selected' : '') + '>' + o + '</option>';
        }).join('');
        return `
                <div class="field-row" style="grid-template-columns:1fr;">
                    <div><span class="input-label modal-tt-wrap" style="cursor:help;">Homeowner policy type<div class="modal-tt" style="left:0; right:auto;"><strong>Homeowner policy type</strong>Which HO form your policy is written on. The panel above explains each one. We never pick this for you — read it off your declarations page.</div></span><select class="small-field" style="background: var(--bg-navy); color:white;" onchange="updateAccField('${id}', 'hoType', this.value)"><option value="">Select policy type…</option>${opts}</select></div>
                </div>
                <div class="field-row">
                    ${F('covA', 'Coverage A — Dwelling', 'The cost to rebuild your home\'s structure.', 'Should roughly equal REBUILD cost — not market price and not your mortgage.', 'left')}
                    ${F('covB', 'Coverage B — Other Structures', 'Detached structures — fence, shed, detached garage.', 'Often defaults to ~10% of Coverage A; raise it if you have a big detached structure.', 'right')}
                </div>
                <div class="field-row">
                    ${F('covC', 'Coverage C — Personal Property', 'Your belongings — furniture, clothes, electronics.', 'Often ~50–70% of Coverage A. Do a rough room-by-room tally to sanity-check.', 'left')}
                    ${F('covD', 'Coverage D — Loss of Use', 'Pays living costs if you can\'t stay home during a covered repair.', 'Often ~20% of Coverage A; think months of rent + meals.', 'right')}
                </div>
                <div class="field-row">
                    ${F('covE', 'Coverage E — Personal Liability', 'Covers you if someone is hurt or their property is damaged and you\'re liable.', 'Common floors are $300k–$500k; a pool, dog, or trampoline argues for more (or an umbrella policy).', 'left')}
                    ${F('covF', 'Coverage F — Medical Payments', 'Small no-fault medical bills for a guest hurt on your property.', 'Usually $1k–$5k; goodwill coverage, not the big liability line.', 'right')}
                </div>
                <div class="field-row">
                    ${F('dedOther', 'Deductible — Other Perils (standard)', 'What you pay out of pocket before a normal claim (fire, theft) pays.', 'Higher deductible = lower premium; pick what you could cover on short notice.', 'left')}
                    ${F('dedHurricane', 'Deductible — Hurricane', 'A separate, often PERCENTAGE deductible that applies to named-storm damage.', 'A % deductible on a big Coverage A can be a large dollar figure — do the math for a real storm.', 'right', 'moneypct')}
                </div>
                <div class="field-row" style="grid-template-columns:1fr;">
                    ${F('dedWindHail', 'Deductible — Wind/Hail', 'A separate deductible for wind or hail damage, common in storm-prone regions.', 'Like the hurricane line — a % here can be a big number; know it before a claim.', 'left', 'moneypct')}
                </div>
                ${/* §17.3a — the per-form note sits UNDER the fields it describes, not above them:
                      the hovers explain the FIELD, this explains the FORM, and both render. */''}
                ${_hoTypeNoteHTML(acc)}`;
    }
    function _propEndorseFieldHTML(id, acc, key, suffix, label) {
        var k = key + suffix;
        return '<div style="flex:1;"><span class="input-label" style="color:var(--muted);">' + label + '</span>' +
               '<input type="text" class="small-field curr-format" placeholder="—" value="' +
               formatCurrencyDisplay((acc && acc[k]) || '') +
               '" oninput="updateAccField(\'' + id + '\', \'' + k + '\', this.value)"></div>';
    }
    function _propPremiumNote(acc) {
        var hi = _num(_canonHomeIns(acc));
        var body = hi > 0
            ? 'Already counted? If this premium is part of your Annual Homeowner Insurance of $' +
              Math.round(hi).toLocaleString('en-US') +
              ', leave it blank — it is already in your total. Enter it here only if it is a separate policy or a rider billed on its own.'
            : 'Already counted? If a premium is part of a homeowner policy you have not recorded yet, leave it blank rather than entering it twice. Enter it here only if it is a separate policy or a rider billed on its own.';
        return '<div style="margin:6px 0 10px; padding:8px 10px; border-left:2px solid rgba(201,168,76,0.5); background:rgba(201,168,76,0.06); ' +
               'font-family:var(--font-serif); font-size:12px; line-height:1.5; color:rgba(255,255,255,0.72);">' + body + '</div>';
    }
    function _vehCostFieldHTML(id, acc, c) {
        var f = _vehCostField(c.kind);
        var n = _vehKindAnnual(id, c.kind);
        var tt = '<span class="input-label modal-tt-wrap" style="cursor:help;">' + c.label +
                 (c.hover ? '<div class="modal-tt" style="left:0; right:auto;"><strong>' + c.label + '</strong>' + c.hover +
                   (n > 0 ? '<br><br>This figure is the line you track in Operating Upkeep. Edit it there; this box shows it.' : '') +
                   '</div>' : '') + '</span>';
        if (n > 0) {
            return '<div>' + tt +
                '<input type="text" class="small-field curr-format" value="' + formatCurrencyDisplay(Math.round(n)) + '" readonly ' +
                'style="opacity:0.7; cursor:not-allowed; border-style:dashed;" title="Set in Operating Upkeep — click to open">' +
                '<div onclick="openUpkeepForProperty(\'' + id + '\', \'' + c.kind + '\')" ' +
                'style="font-size:10px; color:var(--teal-mid); margin-top:3px; font-family:var(--font-mono); cursor:pointer;">' +
                '🔗 Tracked in Operating Upkeep</div></div>';
        }
        return '<div>' + tt +
            '<input type="text" class="small-field curr-format" placeholder="$0" value="' + formatCurrencyDisplay((f && acc[f]) || '') +
            '" oninput="updateAccField(\'' + id + '\', \'' + f + '\', this.value)"></div>';
    }
    function _vehCostBlockHTML(id, acc) {
        var cat = (typeof _upkForScope === 'function') ? _upkForScope('vehicle', (acc && acc.vehicleType) || '') : [];
        if (!cat.length) return '';
        var cells = cat.map(function (c) { return _vehCostFieldHTML(id, acc, c); });
        var rows = '';
        for (var i = 0; i < cells.length; i += 2) {
            rows += '<div class="field-row" style="grid-template-columns: 1fr 1fr;">' + cells[i] + (cells[i + 1] || '<div></div>') + '</div>';
        }
        return rows;
    }
    function _propUpkeepSectionHTML(id, acc, show, scope) {
        var sc = scope || 'property';
        /* §47.1 — the vehicle TYPE is a third axis under scope: two rows (insurance, parking) swap
           their hover for a boat or an RV. Blank type falls through to the base row, which is the CAR
           case and the COMMON path. ⛔ `undefined` for a property, deliberately: a house has no type
           and must never resolve one. */
        var vT = sc === 'vehicle' ? (acc && acc.vehicleType) || '' : '';
        var cat = (typeof _upkForScope === 'function') ? _upkForScope(sc, vT) : [];
        var lines = _propUpkeepLines(id, null, sc);
        var opts = ['<option value="">+ Add an upkeep cost…</option>'];
        /* ⛔⛔ THE GROUP LIST IS DERIVED FROM THE CATALOGUE, NOT HARD-CODED BESIDE IT, AND THAT IS A
           MONEY FIX RATHER THAN A TIDY-UP. This loop used to read a literal
           [['utilities','UTILITIES'],['services','PROPERTY SERVICES']]. A kind whose group was not
           one of those two would have been INVISIBLE IN THE DROPDOWN WHILE STILL COUNTING IN THE
           TOTAL — a dollar the user can neither see nor edit but is being charged. That is the same
           family as the negative-balance defect: not a wrong word, a wrong number about the user's
           own money. _upkGroupsForScope falls back to the group key upper-cased, so a future group
           with no authored heading still RENDERS rather than going silent. */
        ((typeof _upkGroupsForScope === 'function') ? _upkGroupsForScope(sc, vT) : []).forEach(function (g) {
            opts.push('<optgroup label="' + g[1] + '">');
            cat.filter(function (c) { return c.group === g[0]; }).forEach(function (c) {
                /* Already-added kinds are disabled rather than hidden: a user who cannot find
                   "Electricity" would reasonably conclude it is missing. Annotation over
                   suppression, the row-195 ruling applied to a dropdown. */
                var had = lines.some(function (it) { return it.upkeepKind === c.kind; });
                opts.push('<option value="' + c.kind + '"' + (had ? ' disabled' : '') + '>' + c.label + (had ? ' — added' : '') + '</option>');
            });
            opts.push('</optgroup>');
        });
        var rows = lines.map(function (it) {
            var c = _propUpkeepKind(it.upkeepKind, sc, vT) || { label: it.name, hover: '' };
            var mo = _upkMo(it);
            var amt = mo > 0 ? '$' + Math.round(mo * 12).toLocaleString('en-US') + '/yr' : '—';
            return '<div onclick="openUpkeepForProperty(\'' + id + '\', \'' + it.upkeepKind + '\')" ' +
                   'title="Set in Operating Upkeep — click to open" ' +
                   'style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:7px 0; ' +
                   'border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;">' +
                   '<span class="modal-tt-wrap" style="font-size:12.5px; color:rgba(255,255,255,0.82);">' + c.label +
                   (c.hover ? '<div class="modal-tt" style="left:0; right:auto;"><strong>' + c.label + '</strong>' + c.hover + '</div>' : '') +
                   '</span>' +
                   '<span style="font-family:var(--font-mono); font-size:12.5px; color:' + (mo > 0 ? 'rgba(255,255,255,0.75)' : 'var(--muted)') + ';">' + amt + '</span>' +
                   '</div>';
        }).join('');
        /* ══ §45.6 · THE CHROME IS SCOPED, AND EVERY VEHICLE STRING IS AUTHORED ═══════════════════
           The property strings below are UNCHANGED — a property room is byte-identical, which is the
           evidence I trust most on this change (10703's law). The five vehicle strings are §45.6
           VERBATIM; I flagged them as missing rather than writing five plausible house-voiced lines,
           and the Architect authored them.
           ⭐ THE TOGGLE HOVER IS THE LOAD-BEARING ONE AND IT EXISTS TO PREVENT A SPECIFIC MISREADING:
           a user who meets COSTS inside an ASSET room may fear the costs reduce the asset's VALUE.
           They do not. Costs and value are separate truths in the same room. */
        var V = sc === 'vehicle';
        var C = V ? {
            toggle: 'Track running costs',
            /* ⚠️ `&rsquo;` NOT AN ESCAPED APOSTROPHE, AND THIS COST ME A BROKEN PAGE. Written as
               `doesn\'t` through a scripted edit, the backslash was eaten by two layers of string
               escaping and shipped as `'It doesn'` + `t change…` — a SYNTAX ERROR that killed the
               entire inline script block, so `state` and `addInstance` never existed and the Studio
               rendered nothing at all. The entity has no escaping layer to lose and is what every
               other authored string in this file already uses. ⛔ NEVER SCRIPT AN EDIT THAT PUTS A
               RAW APOSTROPHE INSIDE A JS STRING LITERAL — use the entity, or the Edit tool. */
            toggleTT: 'Turn this on to record what the vehicle actually costs you &mdash; insurance, fuel, upkeep and the rest. It doesn&rsquo;t change what the vehicle is worth.',
            head: 'What this vehicle costs to run',
            empty: 'Nothing recorded yet. Add what this vehicle costs you to run and it&rsquo;ll show up here.',
            tracked: 'Tracked in Operating Upkeep'
        } : {
            toggle: 'Show upkeep costs',
            toggleTT: 'The recurring bills that keep this property running — power, water, waste, connectivity, the yard. Add the ones you pay and they are tracked in your Operating Upkeep ledger, then counted here in the true cost of keeping the place.',
            head: 'Operating Upkeep',
            empty: 'Nothing tracked yet. Add the bills you actually pay for this property — each one becomes a line in your Operating Upkeep ledger.',
            tracked: 'tracked in Operating Upkeep — click to open'
        };
        var body = lines.length
            ? rows + '<div style="margin-top:8px; font-size:11px; color:var(--muted);">🔗 ' + C.tracked + '</div>'
            : '<div style="font-size:12px; color:var(--muted); line-height:1.5; padding:4px 0 8px;">' + C.empty + '</div>';
        return `
            <div class="toggle-row modal-tt-wrap" style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                <span class="toggle-label" style="color:var(--teal-mid);">${C.toggle}</span>
                <label class="switch"><input type="checkbox" ${show ? 'checked' : ''} onchange="updateAccToggle('${id}', 'showUpkeep', this.checked)"><span class="slider"></span></label>
                <div class="modal-tt"><strong>${C.toggle}</strong>${C.toggleTT}</div>
            </div>` + (show ? `
            <div style="margin-top:14px; padding:14px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:4px;">
                <div style="color:var(--teal-mid); font-weight:bold; font-size:13px;">🧰 ${C.head}</div>
                ${V ? '' : '<div style="font-size:11.5px; color:var(--muted); margin:2px 0 10px;">What it takes to run the place, month to month.</div>'}
                ${body}
                <div style="margin-top:12px;">
                    <select class="small-field" style="background: var(--bg-navy); color:white;" onchange="if(this.value){ createPropertyUpkeep('${id}', this.value); }">${opts.join('')}</select>
                </div>
            </div>` : '');
    }
    function _propEndorsementsHTML(id, acc) {
        if (!acc) return '';
        var anyOn = _propEndorsements().some(function (e) { return !!acc[e[0]]; });
        var rows = _propEndorsements().map(function (e) {
            var key = e[0], label = e[1], whatsThis = e[2], doIHave = e[3];
            var on = !!acc[key];
            /* THE CONDITIONAL FIELDS (row 206 "show only if selected"). Emitted ONLY on the ON
               branch — not rendered-then-hidden — so an endorsement the user does not carry leaves no
               trace in the served bytes for a gate (or a reader) to mistake for a carried one. */
            var fields = on
                ? '<div style="display:flex; gap:12px; padding:2px 0 10px 0;">' +
                  _propEndorseFieldHTML(id, acc, key, 'Limit', 'Coverage limit') +
                  _propEndorseFieldHTML(id, acc, key, 'Premium', 'Annual premium') +
                  '</div>'
                : '';
            /* Replacement Cost is the only one of the six the bank gave a second hover to, so it is
               the only one that renders one — the others keep the single authored string rather than
               getting a fabricated companion (L47). */
            var tt = '<div class="modal-tt" style="left:0; right:auto;"><strong>What\'s this?</strong>' + whatsThis +
                     (doIHave ? '<br><br><strong>Do I have enough?</strong>' + doIHave : '') + '</div>';
            return '<div class="toggle-row modal-tt-wrap" style="padding:8px 0 6px;">' +
                   '<span class="toggle-label" style="color:var(--white);">' + label + '</span>' +
                   '<label class="switch"><input type="checkbox" ' + (on ? 'checked' : '') +
                   ' onchange="updateAccToggle(\'' + id + '\', \'' + key + '\', this.checked)"><span class="slider"></span></label>' +
                   tt + '</div>' + fields;
        }).join('');
        return '<details ' + (anyOn ? 'open' : '') + ' style="margin:12px 0 4px;">' +
               '<summary style="list-style:none; cursor:pointer; padding:8px 12px; background:var(--bg-navy); border:1px solid rgba(255,255,255,0.14); border-radius:4px; color:rgba(255,255,255,0.75); font-size:12px;">Specialized / endorsement coverages  ▾</summary>' +
               '<div style="border:1px solid rgba(255,255,255,0.10); border-top:none; border-radius:0 0 4px 4px; padding:4px 12px 8px; background:rgba(255,255,255,0.02);">' +
               /* ONE instance for the whole group (authored placement) — not repeated per row, which
                  would turn an instruction into wallpaper and stop being read. */
               _propPremiumNote(acc) + rows + '</div></details>';
    }
    function _propHazardCoverageHTML(id, acc) {
        if (!acc) return '';
        var money = function (key, label) {
            return '<div style="flex:1;"><span class="input-label" style="color:var(--muted);">' + label + '</span>' +
                   '<input type="text" class="small-field curr-format" placeholder="—" value="' + formatCurrencyDisplay(acc[key] || '') +
                   '" oninput="updateAccField(\'' + id + '\', \'' + key + '\', this.value)"></div>';
        };
        var text = function (key, label) {
            return '<div style="flex:1;"><span class="input-label" style="color:var(--muted);">' + label + '</span>' +
                   '<input type="text" class="small-field" placeholder="—" value="' +
                   String(acc[key] === undefined || acc[key] === null ? '' : acc[key]).replace(/"/g, '&quot;') +
                   '" oninput="updateAccField(\'' + id + '\', \'' + key + '\', this.value)"></div>';
        };
        /* A deductible that may be money OR a percentage. Same seam as money() — only the formatter
           and the class differ — so the three deductibles are gated identically wherever they live
           (two in the coverage grid, this one in the earthquake row). The endorsement LIMIT fields
           keep text(): "open perils" is a real answer there and must stay typeable. */
        var moneypct = function (key, label) {
            return '<div style="flex:1;"><span class="input-label" style="color:var(--muted);">' + label + '</span>' +
                   '<input type="text" class="small-field moneypct-format" placeholder="—" value="' +
                   String(formatMoneyOrPctDisplay(acc[key] || '')).replace(/"/g, '&quot;') +
                   '" oninput="updateAccField(\'' + id + '\', \'' + key + '\', this.value)"></div>';
        };
        var row = function (key, label, whatsThis, fields) {
            var on = !!acc[key];
            return '<div class="toggle-row modal-tt-wrap" style="padding:8px 0 6px;">' +
                   '<span class="toggle-label" style="color:var(--white);">' + label + '</span>' +
                   '<label class="switch"><input type="checkbox" ' + (on ? 'checked' : '') +
                   ' onchange="updateAccToggle(\'' + id + '\', \'' + key + '\', this.checked)"><span class="slider"></span></label>' +
                   '<div class="modal-tt" style="left:0; right:auto;"><strong>What\'s this?</strong>' + whatsThis + '</div></div>' +
                   /* flex-WRAP so §27.4's full-width note forces its own line instead of being
                      squeezed into a column beside the money fields. The flood row has three fields
                      that already fit on one line, so nothing about it moves. */
                   (on ? '<div style="display:flex; flex-wrap:wrap; gap:12px; padding:2px 0 10px 0;">' + fields() + '</div>' : '');
        };
        return row('coverFlood', 'Flood insurance (NFIP or private)',
                   'Flood is excluded from essentially every standard home policy — it is bought separately, most often through the National Flood Insurance Program (NFIP) or a private flood insurer. Switch this on to record what you carry.',
                   function () { return money('floodCovBuilding', 'Flood coverage — building') + money('floodCovContents', 'Flood coverage — contents') + money('floodPremium', 'Annual flood premium'); })
             + row('endorseQuake', 'Earthquake coverage',
                   'Earthquake damage is excluded from standard home policies almost everywhere. It is added as an endorsement or bought as a separate policy, and its deductible is usually a PERCENTAGE of the dwelling limit rather than a flat dollar figure. Switch this on to record what you carry.',
                   /* §27.4 — the earthquake block gets its OWN instance: the group note above is not
                      adjacent to it, and earthquake carries the identical ambiguity because the bank's
                      own hover says it is "added as an endorsement OR bought as a separate policy".
                      Flood is deliberately EXCLUDED — it is genuinely always separate, so a warning
                      there would be noise, and noise is how real warnings get ignored. */
                   function () { return '<div style="width:100%;">' + _propPremiumNote(acc) + '</div>' +
                          '<div style="display:flex; gap:12px; width:100%;">' +
                          money('endorseQuakeLimit', 'Earthquake coverage limit') + moneypct('quakeDeductible', 'Earthquake deductible') + money('quakePremium', 'Annual earthquake premium') +
                          '</div>'; });
    }
    function _propNfipPanelHTML() {
        return _diWhyPanel('Flood cover — how it works and where it comes from', [
            ['Why it is separate', 'Flood is the biggest gap in ordinary home insurance, and it is a gap by design rather than by accident — standard policies exclude it almost universally. Cover comes from two places.'],
            ['The National Flood Insurance Program (NFIP)', 'The NFIP is run by FEMA and sold through ordinary insurance agents. Its limits are set nationally rather than by your home\'s value: up to $250,000 on the building and $100,000 on contents for a residence. If your home would cost more than that to rebuild, the NFIP alone will not cover it.'],
            ['Private flood insurers', 'Private flood insurers write above those limits and sometimes price better outside the highest-risk zones. Availability varies by state and by insurer.'],
            ['Three things that surprise people', 'There is usually a THIRTY-DAY WAITING PERIOD before a new flood policy takes effect, so it cannot be bought when the forecast turns; building and contents are SEPARATE coverages and buying one does not include the other; and roughly a quarter of flood claims come from OUTSIDE high-risk zones, which is why a low-risk zone is a reason to check the price rather than a reason to skip it.', true],
            ['What your zone does not tell you', 'Your flood zone above is a mapped FEMA reference for your location. What it does not tell you is what a policy would cost — only an agent or the NFIP can price that.']
        ]);
    }
    function _quakeBand(ss) {
        if (typeof ss !== 'number' || !isFinite(ss)) return null;
        if (ss < 0.25) return 'very low';
        if (ss < 0.50) return 'low';
        if (ss < 1.00) return 'moderate';
        if (ss < 1.50) return 'high';
        return 'very high';
    }
    function _floodTier(zone, subtype) {
        var z = String(zone || '').trim().toUpperCase();
        var sub = String(subtype || '').toUpperCase();
        if (!z || z === 'D') return { key: 'unmapped', label: 'Not mapped / undetermined', note: 'FEMA has not studied this area, so there is no rating either way. Absence of a rating is not the same as low risk.' };
        if (/^V/.test(z))  return { key: 'coastal', label: 'High risk — coastal', note: 'High-risk with wave action. Flood insurance is required with a federally-backed mortgage.' };
        if (/^A/.test(z))  return { key: 'high',    label: 'High risk',           note: 'High-risk. Flood insurance is required with a federally-backed mortgage.' };
        if (z === 'B')     return { key: 'modlow',  label: 'Moderate to low risk', note: 'Outside the high-risk area. Insurance is not required, and is usually cheaper here.' };
        if (z === 'C')     return { key: 'minimal', label: 'Minimal risk',         note: 'Lowest mapped risk. Not required — but roughly a quarter of flood claims come from outside high-risk areas.' };
        if (z === 'X') {
            if (/0\.2 PCT|SHADED/.test(sub)) return { key: 'modlow',  label: 'Moderate to low risk', note: 'Outside the high-risk area. Insurance is not required, and is usually cheaper here.' };
            if (/MINIMAL/.test(sub))         return { key: 'minimal', label: 'Minimal risk',         note: 'Lowest mapped risk. Not required — but roughly a quarter of flood claims come from outside high-risk areas.' };
            return null;    // an X we cannot place — show the letter and FEMA's words, claim no tier
        }
        return null;        // an unrecognised zone is a STOP, never a guess
    }
    function _hazMonth(iso) {
        var d = new Date(iso);
        if (!iso || isNaN(d.getTime())) return '';      // no stamp -> no date claimed (L47)
        return ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    }
    function _propHazardHTML(acc) {
        if (!acc) return '';
        var snap = _groundsAvmFor(acc);                 // null once the address stops matching
        var hz = snap && snap.hazard;
        if (!hz) return '';
        var cells = '', srcs = [], stamps = [];
        /* Each reading is a CELL: label, then the figure on its own line in mono at a fixed size, then
           the descriptor. Two cells of equal width in a grid, so the two figures share a baseline and
           a left edge no matter how long the labels are — which is what the old space-between rows
           could never do. A missing reading drops its cell and the survivor spans the row. */
        var cell = function (label, tip, figure, descriptor, accent) {
            return '<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-left:2px solid ' + accent + '; border-radius:3px; padding:10px 12px;">' +
                   '<span class="input-label modal-tt-wrap" style="cursor:help; color:var(--muted); font-size:10px; letter-spacing:0.04em;">' + label + tip + '</span>' +
                   '<div style="font-family:var(--font-mono); font-size:20px; line-height:1.25; color:' + accent + '; margin-top:5px;">' + figure + '</div>' +
                   '<div style="font-size:11px; color:rgba(255,255,255,0.62); margin-top:2px;">' + descriptor + '</div></div>';
        };
        // FLOOD (row 215). 'none' (FEMA answered, nothing mapped here) renders NOTHING, like a failure.
        if (hz.flood && hz.flood.status === 'ok' && hz.flood.zone) {
            cells += cell('FLOOD ZONE',
                '<div class="modal-tt" style="left:0; right:auto;"><strong>What\'s this?</strong>Your FEMA flood zone (e.g., AE/VE = high-risk, X = lower). Standard home policies EXCLUDE flood; NFIP or private flood is separate.</div>',
                String(hz.flood.zone).replace(/</g, '&lt;'),
                hz.flood.subtype ? String(hz.flood.subtype).replace(/</g, '&lt;').toLowerCase() : '&nbsp;',
                'var(--teal-mid)');
            if (hz.flood.source) srcs.push(String(hz.flood.source).replace(/</g, '&lt;'));
            if (hz.flood.updated) stamps.push(hz.flood.updated);
        }
        // EARTHQUAKE (§17.5a) — number and word together or not at all.
        var ss = hz.quake && hz.quake.status === 'ok' ? hz.quake.ss : null;
        var band = _quakeBand(ss);
        if (band) {
            cells += cell('EARTHQUAKE SHAKING',
                '<div class="modal-tt" style="left:0; right:auto;"><strong>What\'s this?</strong>How hard the ground is expected to shake here in a rare, severe earthquake — a mapped USGS figure for your location, not a prediction of when. The plain-language rating is ours, not an official category. Standard home policies exclude earthquake damage; cover for it is a separate endorsement.' +
                '<br><br><strong>Do I have enough?</strong>There is no right answer to compare this to — it describes your ground, not your policy. If it reads moderate or higher, the earthquake endorsement above is the field worth a conversation with your agent.</div>',
                ss + 'g', band + ' shaking', 'var(--gold)');
            if (hz.quake.source) srcs.push(String(hz.quake.source).replace(/</g, '&lt;'));
            if (hz.quake.updated) stamps.push(hz.quake.updated);
        }
        if (!cells) return '';
        /* THE SCALE — five authored bands in order, the user's own marked. Rendered ONLY beside a real
           reading, so it can never stand in for one. The thresholds are §17.5a's, printed so the
           number has somewhere to sit rather than floating alone. */
        /* THE FLOOD KEY — worst to best, the user's tier marked. Rendered only beside a real reading,
           and only when the tier could be established: the letter and FEMA's own description always
           show (that is the sourced fact), the tier is our grouping and is allowed to be absent. */
        var fTier = (hz.flood && hz.flood.status === 'ok' && hz.flood.zone) ? _floodTier(hz.flood.zone, hz.flood.subtype) : null;
        var fKey = '';
        if (fTier) {
            /* ⛔ ORDER REVERSED ON THE CAPTAIN'S SMOKE — BEST ON THE LEFT, WORST ON THE RIGHT, so it
               reads the same direction as the shaking scale beside it. Two scales in one panel
               running opposite ways is a misreading waiting to happen: the eye learns "left is
               better" from the first one and carries it to the second.
               ⚠️ "NOT MAPPED" IS DELIBERATELY SET APART AT THE END, NOT PLACED IN THE SEQUENCE. It is
               not a severity, and either extreme lies about it: on the left it reads as the safest
               thing on the row, on the right as worse than a coastal V zone. It is the flood twin of
               the sdc inverted signal — silence about an unknown hazard must never read as an answer.
               The gap and the muted border are what say "this one is not on the scale". */
            var TIERS = [
                ['minimal', 'Minimal',             'C, X'],
                ['modlow',  'Moderate to low',     'B, X shaded'],
                ['high',    'High risk',           'A, AE, AO, AH'],
                ['coastal', 'High risk — coastal', 'V, VE']
            ];
            /* THE HOVERS ARE THE AUTHORED TIER NOTES (§17.5b), not new copy: each box explains itself
               with the same sentence the bank wrote for that tier. */
            var tierNote = function (k) {
                var t = _floodTier(k === 'unmapped' ? 'D' : (k === 'coastal' ? 'VE' : (k === 'high' ? 'AE' : (k === 'modlow' ? 'B' : 'C'))), '');
                return t ? t.note : '';
            };
            var box = function (t, apart) {
                var mine = t[0] === fTier.key;
                return '<div class="modal-tt-wrap" style="flex:1; cursor:help; text-align:center; padding:4px 2px; border-radius:2px;' + (apart ? ' margin-left:10px;' : '') +
                       ' background:' + (mine ? 'rgba(93,202,165,0.18)' : 'rgba(255,255,255,0.03)') +
                       '; border:1px ' + (apart ? 'dashed' : 'solid') + ' ' + (mine ? 'var(--teal-mid)' : 'rgba(255,255,255,0.06)') + ';">' +
                       '<div style="font-size:9.5px; letter-spacing:0.03em; color:' + (mine ? 'var(--teal-mid)' : 'rgba(255,255,255,0.5)') + '; text-transform:uppercase;">' + t[1] + '</div>' +
                       '<div style="font-family:var(--font-mono); font-size:9px; color:rgba(255,255,255,0.35); margin-top:1px;">' + t[2] + '</div>' +
                       '<div class="modal-tt" style="left:0; right:auto; text-transform:none;"><strong>' + t[1] + ' (' + t[2] + ')</strong>' + tierNote(t[0]) + '</div></div>';
            };
            fKey = '<div style="display:flex; gap:3px; margin-top:10px; align-items:stretch;">' +
                   TIERS.map(function (t) { return box(t, false); }).join('') +
                   box(['unmapped', 'Not mapped', 'D'], true) + '</div>' +
                   '<div style="font-size:11px; color:rgba(255,255,255,0.62); margin-top:6px; line-height:1.5;">' + fTier.note + '</div>';
        }
        /* §17.5c — THE FLOOD MAP. Sits with the flood half, under its key, because that is what it
           shows. Served from OUR Worker (Captain's ruling: proxy, one door) — the page never talks to
           FEMA, and img-src was widened to the Worker origin only, never to hazards.fema.gov.
           ⛔ IT FAILS SILENTLY AND THAT IS LOAD-BEARING, NOT TIDINESS. The studio half ships BEFORE
           the Worker route is deployed, so until that deploy every one of these requests 404s. A
           broken-image icon in a retirement plan reads as a broken product; onerror removes the
           element so the panel simply renders as it did yesterday. DEGRADING TO SHIPPED BEHAVIOUR IS
           SAFE — this is the split-deploy law applied to an image.
           Only rendered when there is a flood reading AND coordinates: no reading means no map, and
           without coordinates the request could only be about somewhere else. */
        /* ⭐ THE CROSSHAIR IS EXACT, NOT APPROXIMATE — and that is why it is honest to draw. The
           Worker builds the bounding box as the point ± a fixed delta, so THE ADDRESS IS THE
           GEOMETRIC CENTRE OF THE IMAGE BY CONSTRUCTION. Marking 50%/50% is not an estimate of where
           the home is; it is the definition of how the tile was requested. The Captain could not
           tell where he was on the map and assumed he was centred — he was right, and a reader
           should never have to assume it. `pointer-events:none` so it cannot swallow a click. */
        var fMap = '';
        if (fTier && snap && snap.coords) {
            fMap = '<div style="margin-top:10px; border:1px solid rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; line-height:0; position:relative;">' +
                   '<img src="' + _AssetIntel.WORKER_URL + '/floodmap?lat=' + encodeURIComponent(snap.coords.lat) + '&lon=' + encodeURIComponent(snap.coords.lon) + '"' +
                   ' alt="FEMA flood hazard map centred on this address" loading="lazy" style="display:block; width:100%; height:auto;"' +
                   ' onerror="this.parentNode.style.display=\'none\';">' +
                   '<div style="position:absolute; left:50%; top:50%; width:26px; height:26px; margin:-13px 0 0 -13px; pointer-events:none;">' +
                     '<div style="position:absolute; left:50%; top:0; width:2px; height:26px; margin-left:-1px; background:rgba(0,0,0,0.55);"></div>' +
                     '<div style="position:absolute; top:50%; left:0; height:2px; width:26px; margin-top:-1px; background:rgba(0,0,0,0.55);"></div>' +
                     '<div style="position:absolute; left:50%; top:50%; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; background:var(--gold); border:2px solid rgba(0,0,0,0.6);"></div>' +
                   '</div></div>' +
                   /* ⚠️ THIS PARAGRAPH IS MINE AND IS FLAGGED FOR THE ARCHITECT TO VOICE. Every FACT
                      in it is sourced, not remembered:
                        · Unshaded Zone X is WHITE AND UNLABELLED on a FIRM — FEMA's own convention
                          (fema.gov "Zone C or X (Unshaded)"). THIS IS THE ANSWER to the Captain's
                          "my zone says X but the map shows AE everywhere": the white IS his zone, and
                          FEMA does not print a letter on it. A reading that appears to contradict its
                          own map will be read as a bug every time, so it has to be said out loud.
                        · EL figures are Base Flood Elevations. Queried FEMA's OWN records for the
                          panel in his screenshot (DFIRM_ID 12101C, layer 16): LEN_UNIT = "Feet",
                          V_DATUM = "NAVD88" on every row. Not assumed from the number's shape.
                      Bank silence on a label = flattest accurate string + MANDATORY FLAG. */
                   '<div style="font-size:11px; color:rgba(255,255,255,0.62); margin-top:8px; line-height:1.55;">' +
                   'The marker is your address — the map is drawn centred on it. Blue areas are mapped flood zones; the white space is Zone X, which FEMA leaves unlabelled, so your own zone shows as absence rather than a letter. “EL” figures are base flood elevations — how high the 1-in-100-year flood is expected to reach at that spot, in feet above the NAVD88 vertical datum.' +
                   '</div>';
        }
        var scale = '';
        if (band) {
            var BANDS = [['very low', 'under 0.25g'], ['low', '0.25–0.50g'], ['moderate', '0.50–1.00g'], ['high', '1.00–1.50g'], ['very high', '1.50g +']];
            scale = '<div style="display:flex; gap:3px; margin-top:10px;">' + BANDS.map(function (b) {
                var mine = b[0] === band;
                return '<div style="flex:1; text-align:center; padding:4px 2px; border-radius:2px; background:' + (mine ? 'rgba(212,175,110,0.18)' : 'rgba(255,255,255,0.03)') +
                       '; border:1px solid ' + (mine ? 'var(--gold)' : 'rgba(255,255,255,0.06)') + ';">' +
                       '<div style="font-size:9.5px; letter-spacing:0.03em; color:' + (mine ? 'var(--gold)' : 'rgba(255,255,255,0.5)') + '; text-transform:uppercase;">' + b[0] + '</div>' +
                       '<div style="font-family:var(--font-mono); font-size:9px; color:rgba(255,255,255,0.35); margin-top:1px;">' + b[1] + '</div></div>';
            }).join('') + '</div>';
        }
        /* THE CITATION, AUTHORED (§17.5b). My flat version is superseded.
           ⛔ NO STAMP = NO DATE CLAIMED. The date clause is DROPPED rather than filled with today's:
           a provenance stamp records when the DATA WAS READ, never when the page was drawn. */
        var month = _hazMonth(stamps[0]);
        var prov = month
            ? 'Read from FEMA’s National Flood Hazard Layer and the USGS seismic design maps for this address in ' + month + '. These describe the ground your home sits on — not your policy, and not a recommendation.'
            : 'Read from FEMA’s National Flood Hazard Layer and the USGS seismic design maps for this address. These describe the ground your home sits on — not your policy, and not a recommendation.';
        return '<div style="margin-top:14px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:4px;">' +
               '<div style="color:var(--teal-mid); font-weight:bold; font-size:13px; margin-bottom:9px;">🌊 The ground under the house</div>' +
               '<div style="display:grid; grid-template-columns:repeat(' + (cells.match(/border-left:2px/g) || []).length + ',1fr); gap:10px;">' + cells + '</div>' +
               fKey + fMap + scale +
               /* text-transform:none — .input-label uppercases, and a citation set in caps reads as
                  shouting rather than as a source line. Caught in a screenshot, not in the DOM
                  assertions: every structural check passed while it looked wrong. */
               '<div class="input-label" style="color:var(--muted); font-size:10px; margin-top:9px; line-height:1.5; text-transform:none;">' + prov + '</div></div>';
    }
    function _helocUsePurposeFieldHTML(id, acc) {
        var p = acc.helocUsePurpose;
        return `
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_dLbl(getBaseType(acc.baseId), 'Use of Funds')}
                    <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'helocUsePurpose', this.value)">
                        <option value="">Select… (optional)</option>
                        <option ${p === 'Home improvement' ? 'selected' : ''}>Home improvement</option>
                        <option ${p === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>`;
    }
    function _moatTaxFieldsHTML(id, acc) {
        if ((getBaseType(acc.baseId) || {}).title !== 'Mortgage') return '';
        var it = acc.mortgageItemizes || '';
        return `
            <div class="field-row">
                <div>${_dLbl(getBaseType(acc.baseId), 'Deductions', 'How you file', 'Whether your household itemizes deductions or takes the standard deduction. It decides whether mortgage interest changes your tax bill at all — most households take the standard deduction, and then it does not. Optional; leave it blank and Datum stays quiet on tax.')}
                    <select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField('${id}', 'mortgageItemizes', this.value)">
                        <option value="">Select… (optional)</option>
                        <option value="Itemize" ${it === 'Itemize' ? 'selected' : ''}>We itemize</option>
                        <option value="Standard" ${it === 'Standard' ? 'selected' : ''}>We take the standard deduction</option>
                    </select>
                </div>
                <div>${_dLbl(getBaseType(acc.baseId), 'Mortgage Interest Paid (last yr)', 'From your 1098', 'The mortgage interest your lender reported for last year — Box 1 of the Form 1098 they send you. Sourced straight off that form, never estimated, because only the statement knows the real figure. It is used solely to describe your deduction; it changes no other number here.', '', 'right')}<input type="text" class="small-field curr-format" placeholder="$0" value="${formatCurrencyDisplay(acc.mortgageInterestPaidYr||'')}" oninput="updateAccField('${id}', 'mortgageInterestPaidYr', this.value)"></div>
            </div>`;
    }
    var _livePrimePending = null;
    function _normalizeRatesResp(j) {
        if (!j || (typeof j.prime !== 'number' && !j.rates)) return null;
        var rates = j.rates || {};
        if (!rates.Prime && typeof j.prime === 'number' && j.asOf) rates.Prime = { value: j.prime, asOf: j.asOf, source: j.source };
        return { prime: (typeof j.prime === 'number' ? j.prime : null), asOf: j.asOf || null, source: j.source || null, rates: rates };
    }
    function _fetchLivePrime() {
        if (typeof _livePrimeCache !== 'undefined') return Promise.resolve(_livePrimeCache);
        if (_livePrimePending) return _livePrimePending;
        _livePrimePending = fetch('/api/prime', { cache: 'no-store' })   // no-store: never serve a stale cached
            .then(function (r) { return r.ok ? r.json() : null; })       // rates body (e.g. one missing SOFR)
            .then(function (j) { _livePrimeCache = _normalizeRatesResp(j); return _livePrimeCache; })
            .catch(function () { _livePrimeCache = null; return null; });
        return _livePrimePending;
    }
    function _refreshHelocLiveColor() {
        var subs = document.querySelectorAll('[id^="modal-heloc-liverate-"]');
        for (var i = 0; i < subs.length; i++) {
            var id = subs[i].id.replace('modal-heloc-liverate-', '');
            var acc = (state.accounts || []).find(function (a) { return a.id === id; });
            if (!acc) continue;
            subs[i].innerHTML = _helocLiveRateHTML(id, acc);
            var intel = document.getElementById('modal-cellar-intel-' + id);
            if (intel) intel.innerHTML = _diIntelligence(acc);
        }
    }
    function _refreshMoatLiveColor() {
        var subs = document.querySelectorAll('[id^="modal-moat-liverate-"]');
        for (var i = 0; i < subs.length; i++) {
            var id = subs[i].id.replace('modal-moat-liverate-', '');
            var acc = (state.accounts || []).find(function (a) { return a.id === id; });
            if (!acc) continue;
            subs[i].innerHTML = _moatLiveRateHTML(id, acc);
            var di = document.getElementById('modal-moat-di-' + id);
            if (di) di.innerHTML = _moatDI(acc) || di.innerHTML;
        }
    }
    function _isGrounds(base) { return /^property(_primary|_co)?$/.test(base.id); }
    function _groundsMaintDefault(acc) { var v = _num(acc.value); return v > 0 ? Math.round(v * 0.01) : 0; }  // §4.3 ~1%-of-value rule-of-thumb (est., placeholder only)
    function _carryMirrorField(id, acc, moatField, groundField, label, ttTitle, ttBody, align) {
        var pos = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';
        var tt = '<span class="input-label modal-tt-wrap" style="cursor:help;">' + label +
                 '<div class="modal-tt" style="' + pos + '"><strong>' + ttTitle + '</strong>' + ttBody + '</div></span>';
        var m = _linkedMortgageWith(id, moatField);
        if (m) {
            return '<div>' + tt +
                '<input type="text" class="small-field curr-format" value="' + formatCurrencyDisplay(m[moatField] || '') + '" readonly ' +
                'style="opacity:0.7; cursor:not-allowed; border-style:dashed;" title="Set on the linked mortgage (The Moat)">' +
                '<div style="font-size:10px; color:var(--teal-mid); margin-top:3px; font-family:var(--font-mono);">🔗 mirrored from The Moat</div></div>';
        }
        return '<div>' + tt +
            '<input type="text" class="small-field curr-format" placeholder="$0" value="' + formatCurrencyDisplay(acc[groundField] || '') +
            '" oninput="updateAccField(\'' + id + '\', \'' + groundField + '\', this.value)"></div>';
    }
    function _upkeepMirrorField(id, acc, group, groundField, label, ttTitle, ttBody, align) {
        var pos = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';
        var n = _propUpkeepAnnual(id, group);
        var tt = '<span class="input-label modal-tt-wrap" style="cursor:help;">' + label +
                 '<div class="modal-tt" style="' + pos + '"><strong>' + ttTitle + '</strong>' + ttBody +
                 (n > 0 ? '<br><br>This figure is the sum of the ' + group + ' lines you track in Operating Upkeep above. Edit the individual bills there; this box adds them up.' : '') +
                 '</div></span>';
        if (n > 0) {
            var kinds = _propUpkeepLines(id, group).map(function (it) { return it.upkeepKind; });
            return '<div>' + tt +
                '<input type="text" class="small-field curr-format" value="' + formatCurrencyDisplay(n) + '" readonly ' +
                'style="opacity:0.7; cursor:not-allowed; border-style:dashed;" title="Set in Operating Upkeep — click to open">' +
                '<div onclick="openUpkeepForProperty(\'' + id + '\', \'' + (kinds[0] || '') + '\')" ' +
                'style="font-size:10px; color:var(--teal-mid); margin-top:3px; font-family:var(--font-mono); cursor:pointer;">' +
                '🔗 tracked in Operating Upkeep — click to open</div></div>';
        }
        /* THE NOT-TRACKED BRANCH REPRODUCES THE ORIGINAL FIELD BYTE-FOR-BYTE (10703's law), so a
           property with no upkeep lines renders exactly as it did before §28 existed. */
        return '<div>' + tt +
            '<input type="text" class="small-field curr-format" placeholder="$0" value="' + formatCurrencyDisplay(acc[groundField] || '') +
            '" oninput="updateAccField(\'' + id + '\', \'' + groundField + '\', this.value)"></div>';
    }
    function _propInsuranceTotal(acc) {
        return _num(_canonHomeIns(acc)) + _propInsuranceExtras(acc);
    }
    function _variableRateClusterHTML(id, acc) {
        if (acc.rateType !== 'Variable') return '';
        var iv = String(acc.rateIndex || '').replace(/"/g, '&quot;');
        // §2 per-field hover renderer — shared by the HELOC (§2c) and the Mortgage (§2b) clusters (L48 reuse).
        var _hlF = function (label, ttTitle, ttBody, align) {
            var pos = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';
            return '<span class="input-label modal-tt-wrap" style="cursor:help;">' + label +
                '<div class="modal-tt" style="' + pos + '"><strong>' + ttTitle + '</strong>' + ttBody + '</div></span>';
        };
        if ((getBaseType(acc.baseId) || {}).title === 'HELOC') {
            // §2c HELOC variable cluster. #390: Rate Index is now a canonical DROPDOWN (kills the free-text
            // spelling fragility that silently broke the live-index trigger); each field carries its OWN
            // plain-coach hover (was one shared explainer); the number fields clamp to a sane 0–100 range
            // (enforceNumRange); and the §20 live-index sub-line renders directly UNDER the Rate Index row.
            // Prime is fed live; SOFR is a selectable option that lights up once its series is added
            // (sourced-or-blank until then). Mortgage keeps its own cluster below (untouched — Moat leave-as-is).
            var _idxU = String(acc.rateIndex || '').trim().toUpperCase();
            var _idxOpts = ['Prime', 'SOFR'];
            var _idxKnown = _idxOpts.some(function (o) { return o.toUpperCase() === _idxU; });
            var _idxSelect =
                '<select class="small-field" style="background: var(--bg-navy);" onchange="updateAccField(\'' + id + '\', \'rateIndex\', this.value)">' +
                '<option value="">Select…</option>' +
                _idxOpts.map(function (o) { return '<option value="' + o + '"' + (o.toUpperCase() === _idxU ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
                (acc.rateIndex && !_idxKnown ? '<option value="' + iv + '" selected>' + iv + ' (custom)</option>' : '') +
                '</select>';
            return `
            <div class="field-row">
                <div>${_hlF('Rate Index', 'The benchmark you track', 'The published rate your line follows — usually Prime, sometimes SOFR. Your actual rate is this index plus your margin, and it moves with the index at each reset. Today’s live figure shows just below.')}${_idxSelect}</div>
                <div>${_hlF('Margin %', 'The lender’s fixed add-on', 'The fixed amount your lender adds on top of the index — set at signing, never changes. Your rate = index + margin, so a lower margin is a better deal for the life of the line.', 'right')}<input type="number" min="0" max="100" step="0.01" class="small-field" placeholder="0" value="${acc.rateMargin||''}" oninput="enforceNumRange(this, 0, 100); updateAccField('${id}', 'rateMargin', this.value)"></div>
            </div>
            <div id="modal-heloc-liverate-${id}">${_helocLiveRateHTML(id, acc)}</div>
            <div class="field-row">
                <div>${_hlF('Periodic Cap %', 'The most it can jump at once', 'The largest your rate can move at any single reset, up or down. Even if the index spikes, one reset can’t move you more than this.')}<input type="number" min="0" max="100" step="0.01" class="small-field" placeholder="0" value="${acc.capPeriodic||''}" oninput="enforceNumRange(this, 0, 100); updateAccField('${id}', 'capPeriodic', this.value)"></div>
                <div>${_hlF('Lifetime Cap %', 'The ceiling over the whole loan', 'The most your rate can ever climb above where it started, across the entire line. It sets your worst case — the ceiling the rate can’t cross no matter what the index does.', 'right')}<input type="number" min="0" max="100" step="0.01" class="small-field" placeholder="0" value="${acc.capLifetime||''}" oninput="enforceNumRange(this, 0, 100); updateAccField('${id}', 'capLifetime', this.value)"></div>
            </div>
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_hlF('Next Reset Date', 'When the rate can change next', 'The next date your rate re-prices to the current index plus your margin. Until then today’s rate holds; after it, your payment may shift. Datum re-checks the math when this date arrives.')}<input type="date" class="small-field" value="${acc.rateResetDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'rateResetDate', this.value)"></div>
            </div>`;
        }
        // §18.8 — five per-field hovers (Mortgage Copy Bank R142-147), mirroring the HELOC §2c split (R84-88) via
        // the shared _hlF (L48). HELOC "line" → mortgage "loan"; Rate Index drops HELOC's "live figure below" line
        // (the mortgage variable field has no live sub-line — L47, don't promise a figure that isn't there).
        return `
            <div class="field-row">
                <div>${_hlF('Rate Index', 'The benchmark you track', 'The published rate your loan follows — often SOFR, sometimes Prime or a Treasury index. Your actual rate is this index plus your margin, and it moves with the index at each reset.')}<input type="text" class="small-field" placeholder="e.g. SOFR, Prime" value="${iv}" oninput="updateAccField('${id}', 'rateIndex', this.value)"></div>
                <div>${_hlF('Margin %', 'The lender’s fixed add-on', 'The fixed amount your lender adds on top of the index — set at signing, never changes. Your rate = index + margin, so a lower margin is a better deal for the life of the loan.', 'right')}<input type="number" class="small-field" placeholder="0" value="${acc.rateMargin||''}" oninput="updateAccField('${id}', 'rateMargin', this.value)"></div>
            </div>
            <div class="field-row">
                <div>${_hlF('Periodic Cap %', 'The most it can jump at once', 'The largest your rate can move at any single reset, up or down. Even if the index spikes, one reset can’t move you more than this.')}<input type="number" class="small-field" placeholder="0" value="${acc.capPeriodic||''}" oninput="updateAccField('${id}', 'capPeriodic', this.value)"></div>
                <div>${_hlF('Lifetime Cap %', 'The ceiling over the whole loan', 'The most your rate can ever climb above where it started, across the entire loan. It sets your worst case — the ceiling the rate can’t cross no matter what the index does.', 'right')}<input type="number" class="small-field" placeholder="0" value="${acc.capLifetime||''}" oninput="updateAccField('${id}', 'capLifetime', this.value)"></div>
            </div>
            <div class="field-row" style="grid-template-columns: 1fr;">
                <div>${_hlF('Next Reset Date', 'When the rate can change next', 'The next date your rate re-prices to the current index plus your margin. Until then today’s rate holds; after it, your payment may shift. Datum re-checks the math when this date arrives.')}<input type="date" class="small-field" value="${acc.rateResetDate||''}" oninput="enforceDateCap(event); updateAccField('${id}', 'rateResetDate', this.value)"></div>
            </div>`;
    }
    function _moatLumpBlockHTML(id, acc) {
        if ((getBaseType(acc.baseId) || {}).title !== 'Mortgage') return '';
        return '<div class="moat-lump-panel">' +
               '<div class="moat-lump-head">What would extra do?</div>' +
               '<div class="field-row" style="grid-template-columns: 1fr;"><div>' +
               _dLbl(getBaseType(acc.baseId) || {}, 'One-time extra payment', 'A what-if, not a payment',
                     'A single lump you could put toward the loan today. This is a what-if — we show what it would buy you and change nothing on your account.') +
               '<input type="text" class="small-field curr-format" placeholder="$0" value="' +
               formatCurrencyDisplay(_moatLumpWhatIf === '' ? '' : _moatLumpWhatIf) +
               '" oninput="_moatLumpEdit(\'' + id + '\', this.value)"></div></div>' +
               '<div id="modal-moat-lump-out-' + id + '">' + _moatLumpBodyHTML(acc) + '</div></div>';
    }
    function _securedLinkScope(debtBase) {
        var id = String(debtBase && debtBase.id || '');
        if (id.indexOf('mortgage') === 0 || id.indexOf('heloc') === 0)
            return function(aB) { return aB.id === 'property' || aB.id === 'property_primary' || aB.id === 'property_co'; };
        if (id.indexOf('auto_debt') === 0)
            return function(aB) { return aB.id === 'auto' || aB.id === 'auto_primary' || aB.id === 'auto_co'; };
        // Other debts (personal / revolving) keep the prior broad physical scope (collectibles excluded).
        return function(aB) { return aB.taxCode === 'physical' && !String(aB.id).includes('collectibles'); };
    }
