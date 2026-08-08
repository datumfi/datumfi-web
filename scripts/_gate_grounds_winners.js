/* L52 WHOLE-ROOM WINNER GATE — The Grounds (Real Estate: property / property_primary / property_co).
   Property Copy Bank, Grounds column only (Driveway/Arcade later). Asserts every §1/§2/§3a/§3b/§4/§9/§15
   winner literal in the SERVED bytes via the real openAccountModal path, plus the §6/§6b valuation
   GUARDRAIL (hard-cap 50/mo, BYO-key only paid path, de-dupe cache) — key OFF/stubbed.
   RED-FIRST: `--redfirst` flips winners to pre-wire losers -> ABSENT -> gate BITES (RED). Normal -> GREEN.

   2026-08-02 RE-ANCHOR (§0.2 block only). This gate hunted for a native <select> containing
   "Select a liability to link". That string has not existed since the §18.3 Moat consolidation
   replaced the dropdown with a <details> disclosure of link rows — `_gate_moat_18_3.mjs` ASSERTS the
   old chrome is gone. Two assertions read RED for it, and a third — the [BITE] exclusion claim — read
   GREEN, because a list of ["__NO_SELECT__"] contains neither "Auto Loan" nor "Personal Loan". The
   control was missing and the gate called the safety property proven. That was the 9th false green.

   🔑 HOUSE LAW (2026-08-02) — AN EXCLUSION ASSERTION MUST BE PRECEDED BY A PRESENCE ASSERTION.
   You may not prove a thing is absent from a control without first proving the control EXISTS, and
   that it offers at least one row to be absent FROM. A vanished control must RED, never green.
   The presence checks are deliberately NOT wrapped in pick() — a precondition that inverts under
   --redfirst would let an inverted run pass by doing nothing, which is how a red-first goes
   inverted-dead. Preconditions hold in BOTH modes or the run is void.

   SELF-HOSTING (was: "serve repo root on :8001 first"). A gate that cannot run itself reads as a red
   it did not earn, and it is also the only way to serve the mutations below.
   Usage: node scripts/_gate_grounds_winners.js [LABEL] [--redfirst] [--noheloc] [--nocontrol]
     --noheloc    drops heloc from _assetReverseScope -> a HELOC stops being offered on a property.
     --nocontrol  removes the link disclosure entirely -> the PRESENCE assertion must RED. This is
                  the mutation that reproduces the exact false green above. */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const LABEL = process.argv[2] || 'RUN';
const RF = process.argv.includes('--redfirst');
const NOHELOC  = process.argv.includes('--noheloc');
const NOCTRL   = process.argv.includes('--nocontrol');
/* §17.1 — the negative control for a REGROUP has to be shaped like the regroup. --flatcarry deletes
   the three authored group headers and NOTHING else, restoring the pre-§17.1 flat list. The three
   §17.1 legs must go RED while the field-render and TOTAL legs stay GREEN — that split is the proof
   that the regroup is presentational and the arithmetic is untouched, which is the entire claim
   §17.1 makes ("pure regroup + section headers, no math change"). A control that reddened everything
   would prove only that I broke the page. */
const FLATCARRY = process.argv.includes('--flatcarry');
/* §17.2 — --noeducation makes the teach panel return '' unconditionally, i.e. the pre-§17.2 room.
   The presence legs must RED; the ABSENCE legs (collapse-on-hoType, townhome-absent-by-default)
   must STAY GREEN, because an empty panel satisfies them honestly. That asymmetry is deliberate and
   worth reading: it is the reminder that an absence assertion proves nothing on its own, which is
   why each one here is paired with a presence leg on a fixture where the thing SHOULD appear. */
const NOEDUC = process.argv.includes('--noeducation');
/* §17.3 — THREE controls, because §17.3 makes three separable claims and a single blunt mutation
   would prove only the first. A NEGATIVE CONTROL MUST FAIL IN THE SHAPE OF THE CLAIM.
     --nocoverage  the whole block is gone            -> the broad "it shipped" claim
     --wrongfield  the dropdown writes 'hoForm'       -> the §17.2 HANDSHAKE claim. This is the
                   exact silent failure §17.2 flagged forward: the teach box would simply never
                   collapse and nothing else would look wrong. It must be LOUD, and this proves it.
     --zeroplace   limits ship a "$0" placeholder     -> the row-205 blank-until-entered guard */
const NOCOV     = process.argv.includes('--nocoverage');
const WRONGFLD  = process.argv.includes('--wrongfield');
const ZEROPLACE = process.argv.includes('--zeroplace');
/* §17.4 — THREE controls again, one per separable claim. A NEGATIVE CONTROL MUST FAIL IN THE SHAPE
   OF THE CLAIM, and §17.4's three claims fail in three completely different shapes:
     --noendorse   the whole disclosure is gone      -> the broad "it shipped" claim. Reddens the
                   presence legs; the row-213 ABSENCE legs stay GREEN, honestly, because a room with
                   no endorsement block satisfies "nothing is carried" perfectly. That asymmetry is
                   the whole reason every absence leg below is PAIRED with a presence twin.
     --eagerfields the Limit field renders whether or not the switch is on -> the row-213 guard
                   ("hidden until toggled on"). Nothing else moves: all six labels, all six hovers
                   and the disclosure itself still render, so only the guard legs may bite.
     --deafswitch  the render reads `endorseQuakeX` while the switch still writes `endorseQuake`
                   -> the TOGGLE↔RENDER handshake. This is the §17.4 analogue of --wrongfield and
                   the failure it models is the quietest one in the section: every label renders,
                   every hover is correct, the switch animates, the value is stored — and the
                   coverage simply never appears. Nobody would notice for months. */
const NOENDORSE   = process.argv.includes('--noendorse');
const EAGERFIELDS = process.argv.includes('--eagerfields');
const DEAFSWITCH  = process.argv.includes('--deafswitch');
/* §13.72 — --deafselect removes `hoType`/`propType` from updateAccField's re-render whitelist, i.e.
   restores the exact state measured live on 2026-08-07: both dropdowns STORE their value perfectly
   and NEITHER repaints, so the teach panel never collapses and the townhome line never appears.
   It must redden the two CLICK legs and NOTHING ELSE — every state-injection leg in this file stays
   green under it, honestly, which is the whole point and the reason the bug survived 196 gates.
   THE BLAST RADIUS OF A CONTROL IS ITSELF A CLAIM: two red is the correct size here, and a control
   that reddened the §17.2 render legs too would be proving something this fix does not claim. */
const DEAFSELECT  = process.argv.includes('--deafselect');
/* §17.5 — three controls, one per guard, each sized to its own claim.
     --nohazard  the whole block is gone           -> the broad "it shipped" claim.
     --wordonly  the band word renders WITHOUT the ss number -> §17.5a GUARD 2, and the Architect
                 asked for exactly this shape. It is the failure nobody would ever notice, because
                 "moderate shaking" alone looks completely fine on screen — it just silently promotes
                 OUR plain-language read into something that reads like a USGS category. It must
                 redden the pairing legs and LEAVE the flood legs, the hovers and the guard-3 legs
                 green, or the control is proving something wider than the guard.
     --sdcfallback  keeps sdc in the store AND falls back to it when ss is missing -> §17.5a GUARD 3.
                 Two anchors, one control, because that IS the shape of the mistake: somebody decides
                 the A-F letter is useful, keeps it, and reaches for it when the number is absent.
                 The result is the inverted signal — confident in Austin, silent in Los Angeles. */
const NOHAZARD    = process.argv.includes('--nohazard');
const WORDONLY    = process.argv.includes('--wordonly');
const SDCFALLBACK = process.argv.includes('--sdcfallback');
/* §26.3 — two controls.
     --notypedi     the block never renders           -> the broad "it shipped" claim.
     --typefallback an unlisted/blank type falls back to the Single-family block -> the exact
                    mistake §26c forbids ("do not map it to the nearest block"). It must redden the
                    SILENCE legs and nothing else: a wrong-but-plausible paragraph about somebody
                    else's building is worse than none, and it is the failure nobody would report. */
/* §17.3a — the two controls the bank asked for by name.
     --ho3note   forces a note onto HO-3, where the bank authored SILENCE. That silence is the thing
                 a future reader is most likely to "fix" by completing the set, and a note there is
                 invisible as a defect because it looks like thoroughness.
     --hidefield lets hoType HIDE a coverage field (HO-4 loses Coverage A) -> guard 1. This is the
                 one a tidy-up refactor breaks, because hiding a field that "does not apply" always
                 feels like an improvement. AN INVISIBLE FIELD IS AN UNLABELLED RECOMMENDATION. */
const HO3NOTE   = process.argv.includes('--ho3note');
const HIDEFIELD = process.argv.includes('--hidefield');
const NOTYPEDI     = process.argv.includes('--notypedi');
const TYPEFALLBACK = process.argv.includes('--typefallback');
/* §27 — two controls, each shaped like its own risk rather than like the fix.
     --skipblank  restores the PRE-§27.1 behaviour exactly: with no recorded value the estimate is
                  applied silently and NO dialog is constructed. --redfirst cannot reproduce this —
                  it flips winner strings, and a dialog that never opens has no strings to flip, so
                  every blank-case leg would fail for the wrong reason and the PRESENCE leg would be
                  the only honest signal. This is the defect §27.1 exists to fix, so it gets a control
                  that occupies the state the bug occupied (§13.73).
     --forkvalue  makes the modal field write its OWN key instead of the shared acc.value. That is
                  the ONE failure §27.2 must never have: a second FIELD wearing the shape of a second
                  WINDOW, which is how a number starts double-counting. The mirror legs must RED. */
const SKIPBLANK = process.argv.includes('--skipblank');
const FORKVALUE = process.argv.includes('--forkvalue');
const MUT = NOHELOC || NOCTRL || FLATCARRY || NOEDUC || NOCOV || WRONGFLD || ZEROPLACE
         || NOENDORSE || EAGERFIELDS || DEAFSWITCH || DEAFSELECT
         || NOHAZARD || WORDONLY || SDCFALLBACK || NOTYPEDI || TYPEFALLBACK || HO3NOTE || HIDEFIELD
         || SKIPBLANK || FORKVALUE;
const ROOT = path.resolve(__dirname, '..');
const PORT = 8305;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';

/* --noheloc — half the rule under test. The fixture below now adds a REAL heloc_joint; before this
   re-anchor it never did, so "Mortgage/HELOC ONLY" only ever proved the Mortgage half. */
const A_HELOC = "            return function(dB) { return String(dB.id).indexOf('mortgage') === 0 || String(dB.id).indexOf('heloc') === 0; };";
const M_HELOC = "            return function(dB) { return String(dB.id).indexOf('mortgage') === 0; };";
/* --nocontrol — delete the disclosure that holds the link rows. Everything downstream still renders;
   only the control vanishes. Under the OLD assertions this run was 1 red + 1 FALSE GREEN. */
const A_CTRL = '        if (canManage) {';
const M_CTRL = '        if (false) {   /* link control removed by --nocontrol */';
/* §17.1 group headers, VERBATIM as authored 2026-07-25 (Property Copy Bank rows 180/181/182, read
   in-session 2026-08-06 per L51). These same three literals are the winners asserted below AND the
   anchors --flatcarry deletes, so the gate and its own negative control cannot drift apart: if the
   copy is reworded, the anchor stops matching and apply() aborts with "expected exactly 1 occurrence"
   rather than silently testing nothing. */
const A_NOCOV = "        var F = function (key, label, w, d, align, kind) { return _propCovFieldHTML(id, acc, key, label, w, d, align, kind || 'money'); };";
const M_NOCOV = "        return '';   /* §17.3 block removed by --nocoverage */";
const A_WRONGFLD = "onchange=\"updateAccField('${id}', 'hoType', this.value)\"";
const M_WRONGFLD = "onchange=\"updateAccField('${id}', 'hoForm', this.value)\"";
const A_ZEROPLACE = "placeholder=\"—\" value=\"' + val +";
const M_ZEROPLACE = "placeholder=\"$0\" value=\"' + val +";
/* RE-GROUNDED 2026-08-07. The old anchor was the `if (acc.hoType) return ''` collapse line, which
   the Captain's smoke DELETED — the panel no longer vanishes on a chosen type. A control whose
   anchor no longer exists aborts the run rather than mutating anything, which is the correct loud
   failure and is exactly what it did. Re-anchored on the function's own opening, which is the thing
   the control actually needs: make the panel render nothing at all. */
const A_EDUC = "    function _propInsEducationHTML(acc) {\n        if (!acc) return '';";
const M_EDUC = "    function _propInsEducationHTML(acc) {\n        if (true) return '';   /* §17.2 education panel removed by --noeducation */";
/* §17.4 anchors. Each is a line the feature genuinely depends on, so a reword breaks the anchor and
   apply() aborts loudly rather than silently mutating nothing — the gate and its controls cannot
   drift apart. */
const A_NOENDORSE = "        var anyOn = _PROP_ENDORSEMENTS.some(function (e) { return !!acc[e[0]]; });";
const M_NOENDORSE = "        return '';   /* §17.4 block removed by --noendorse */";
/* RE-GROUNDED after §26.4/§26.5 rewrote the endorsement block. Both anchors moved and BOTH controls
   ABORTED rather than mutating — correct, and the second one matters: `var on = !!acc[key];` now
   appears TWICE (the hazard-coverage control reuses the same shape), so a plain replace would have
   silently poisoned the WRONG block and the control would have "worked" while testing something
   else entirely. The exactly-one-occurrence check is what turned that into a stop. */
const A_EAGER = "            var fields = on";
const M_EAGER = "            var fields = true   /* --eagerfields: reveal regardless of the switch */";
const A_DEAF  = "            var key = e[0], label = e[1], whatsThis = e[2], doIHave = e[3];\n            var on = !!acc[key];";
const M_DEAF  = "            var key = e[0], label = e[1], whatsThis = e[2], doIHave = e[3];\n            var on = !!acc[key + 'X'];   /* --deafswitch: render reads a key nothing writes */";
const A_DEAFSEL = "            if(field === 'hoType' || field === 'propType') openAccountModal(id);   // §17.2 teach-panel collapse + townhome branch";
const M_DEAFSEL = "            /* --deafselect: the pre-fix state — both fields store, neither repaints */";
/* §27 anchors. Both are single literals from the §27 wiring, so a re-grounding shows up as an
   aborted mutation rather than a control that quietly stopped biting. */
const A_SKIPBLANK = "        var _own = _num(acc.value);";
const M_SKIPBLANK = "        var _own = _num(acc.value);\n        if (_own <= 0) { apply(); return; }   /* --skipblank: the pre-§27.1 silent apply */";
const A_FORKVAL = "oninput=\"onFrontValueEdit('${id}', this)\">";
const M_FORKVAL = "oninput=\"updateAccField('${id}', 'propValueForked', this.value)\">   <!-- --forkvalue: a second FIELD, not a second window -->";
const A_NOHAZ = "        var hz = snap && snap.hazard;";
const M_NOHAZ = "        var hz = null;   /* §17.5 block removed by --nohazard */";
const A_WORDONLY = "ss + 'g', band + ' shaking'";
const M_WORDONLY = "'', band + ' shaking'";   /* the figure vanishes, the band word survives — guard 2 */
/* --sdcfallback needs BOTH edits because the guard is enforced in two places: sdc cannot reach the
   screen if it was never stored. Modelling only one would leave the control unable to bite. */
/* RE-GROUNDED: the store line gained `source`/`updated` when the panel redesign needed provenance,
   so this anchor went stale and the control ABORTED rather than mutating. Third time tonight that an
   anchor moved under a control and stopped the run instead of silently testing nothing. */
const A_SDC_STORE = "if (_qk && _qk.status === 'ok' && typeof _qk.ss === 'number') _hz.quake = { status: 'ok', ss: _qk.ss, source: _qk.source, updated: _qk.updated };";
const M_SDC_STORE = "if (_qk && _qk.status === 'ok') _hz.quake = { status: 'ok', ss: _qk.ss, sdc: _qk.sdc, source: _qk.source, updated: _qk.updated };   /* --sdcfallback */";
const A_SDC_READ = "        var band = _quakeBand(ss);";
const M_SDC_READ = "        var band = _quakeBand(ss); if (!band && hz.quake && hz.quake.sdc) { band = 'category ' + hz.quake.sdc; ss = hz.quake.sdc; }   /* --sdcfallback */";
const A_HO3 = "        var n = acc && _HO_NOTES[String(acc.hoType || '')];   // HO-3, blank and unlisted all fall through";
const M_HO3 = "        var n = (acc && _HO_NOTES[String(acc.hoType || '')]) || (acc && acc.hoType === 'HO-3' ? 'The standard form.' : null);   /* --ho3note */";
const A_HIDEFLD = "        var F = function (key, label, w, d, align, kind) { return _propCovFieldHTML(id, acc, key, label, w, d, align, kind || 'money'); };";
const M_HIDEFLD = "        var F = function (key, label, w, d, align, kind) { if (acc.hoType === 'HO-4' && key === 'covA') return ''; return _propCovFieldHTML(id, acc, key, label, w, d, align, kind || 'money'); };   /* --hidefield */";
const A_TYPEDI = "        if (!txt) return '';";
const M_TYPEDI = "        if (true) return '';   /* §26.3 block removed by --notypedi */";
const A_TYPEFB = "            : _PROP_TYPE_DI[String(acc.propType || '')];      // undefined on blank or unlisted -> silent";
const M_TYPEFB = "            : (_PROP_TYPE_DI[String(acc.propType || '')] || _PROP_TYPE_DI['Single-family']);   /* --typefallback */";
const G17_A = 'Carrying Costs — what you owe to keep the home.';
/* G17_B is the RETIRED Group-B label. It is kept because a leg now asserts it is ABSENT — the proof
   that §26.2's promotion actually happened rather than being duplicated. G17_B_NOW is the section
   subhead that took its place, and it is what --flatcarry deletes. */
const G17_B = 'Property Insurance — what protects the home and you.';
const G17_B_NOW = 'What protects the home and you — separate from what it costs to keep.';
const G17_C = 'Operating Costs — what it takes to run the home day to day.';

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (MUT && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) { console.error(`anchor ${label}: expected exactly 1 occurrence, found ${n} — re-ground it.`); process.exit(1); }
      src = src.replace(a, m);
    };
    if (NOHELOC) apply(A_HELOC, M_HELOC, 'A_HELOC');
    if (NOCTRL)  apply(A_CTRL,  M_CTRL,  'A_CTRL');
    if (FLATCARRY) {
      apply(G17_A, '', 'G17_A');
      /* RE-GROUNDED (§26.2). G17_B was the Group-B LABEL inside the carrying block; that group was
         promoted out to its own section and the label no longer exists, so this aborted rather than
         mutating — correct. The control's claim is unchanged (strip the section labelling, leave the
         arithmetic alone), so it now deletes the SECTION SUBHEAD that replaced it. */
      apply(G17_B_NOW, '', 'G17_B_NOW');
      apply(G17_C, '', 'G17_C');
    }
    if (NOEDUC) apply(A_EDUC, M_EDUC, 'A_EDUC');
    if (NOCOV)     apply(A_NOCOV,     M_NOCOV,     'A_NOCOV');
    if (WRONGFLD)  apply(A_WRONGFLD,  M_WRONGFLD,  'A_WRONGFLD');
    if (ZEROPLACE) apply(A_ZEROPLACE, M_ZEROPLACE, 'A_ZEROPLACE');
    if (NOENDORSE)   apply(A_NOENDORSE, M_NOENDORSE, 'A_NOENDORSE');
    if (EAGERFIELDS) apply(A_EAGER,     M_EAGER,     'A_EAGER');
    if (DEAFSWITCH)  apply(A_DEAF,      M_DEAF,      'A_DEAF');
    if (DEAFSELECT)  apply(A_DEAFSEL,   M_DEAFSEL,   'A_DEAFSEL');
    if (NOHAZARD)    apply(A_NOHAZ,     M_NOHAZ,     'A_NOHAZ');
    if (WORDONLY)    apply(A_WORDONLY,  M_WORDONLY,  'A_WORDONLY');
    if (SDCFALLBACK) { apply(A_SDC_STORE, M_SDC_STORE, 'A_SDC_STORE'); apply(A_SDC_READ, M_SDC_READ, 'A_SDC_READ'); }
    if (NOTYPEDI)     apply(A_TYPEDI,   M_TYPEDI,   'A_TYPEDI');
    if (TYPEFALLBACK) apply(A_TYPEFB,   M_TYPEFB,   'A_TYPEFB');
    if (HO3NOTE)   apply(A_HO3,      M_HO3,      'A_HO3');
    if (HIDEFIELD) apply(A_HIDEFLD,  M_HIDEFLD,  'A_HIDEFLD');
    if (SKIPBLANK) apply(A_SKIPBLANK, M_SKIPBLANK, 'A_SKIPBLANK');
    if (FORKVALUE) apply(A_FORKVAL,   M_FORKVAL,   'A_FORKVAL');
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(async () => {
    const cap = () => {
      var ttl = document.getElementById('modal-acc-title');
      return (ttl ? ttl.innerHTML : '') + document.getElementById('modal-dynamic-content').innerHTML;
    };
    const grab = (baseId, ov) => {
      try { addInstance(baseId); } catch (e) { return '__THREW__:' + e.message; }
      const a = window.state.accounts.filter(x => x.baseId === baseId).pop();
      if (!a) return '__NO_ACCOUNT__';
      if (ov) Object.keys(ov).forEach(k => { a[k] = ov[k]; });
      try { window.openAccountModal(a.id); } catch (e) { return '__OPEN_THREW__:' + e.message; }
      return cap();
    };
    const out = {};
    // gBlank — a property with no value, no carrying costs, no linked debt.
    out.gBlank = grab('property');
    // gFill — property valued 500k, full carrying costs, with a linked mortgage (balance 300k).
    addInstance('property');
    const gAcc = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(gAcc, { value: 500000, propTaxYr: '6000', homeInsYr: '2000', maintYr: '4000', hoaYr: '1200', utilYr: '3600' });
    addInstance('mortgage_joint');
    const mAcc = window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop();
    mAcc.value = 300000; mAcc.linkedAssetId = gAcc.id;
    window.openAccountModal(mAcc.id);          // §6b.10 tie-in — the Moat's Net Equity reads the Grounds value
    out.mLinked = cap();
    window.openAccountModal(gAcc.id);
    out.gFill = cap();
    out.gId = gAcc.id;   // §17.3↔§17.2 handshake leg asserts the REAL control's field name, not a fixture's
    // gAuto — a Driveway (auto) room to prove Grounds-only gating (Driveway wired in a later wave).
    out.gAuto = grab('auto');
    /* §17.2 — two one-field fixtures, each isolating ONE conditional so a failure names its own cause.
       gHoType: a policy type IS chosen -> the teach box must SURVIVE (row 183 = collapsed, not
                deleted; re-premised on the Captain's smoke 2026-08-07). The field is the
                §17.3 dropdown, not yet wired, so it is set directly here; that is the whole point —
                this leg proves the collapse works BEFORE the control that will drive it exists.
       gTown:   propType = Townhouse -> the townhome branch appears (row 192). Uses the propType
                field that ALREADY ships, so the branch needed no new input invented for it. */
    out.gHoType = grab('property', { hoType: 'HO-3' });
    out.gTown   = grab('property', { propType: 'Townhouse' });
    /* §17.4 — THREE fixtures, because one fixture can only ever show one side of a conditional and
       row 213's guard is a claim about BOTH sides. Each returns a SHAPE read off the real DOM, not a
       regex over the modal soup, so "the disclosure was never rendered" is a distinguishable state
       instead of an empty string that every absence leg would sail straight through.
         gEndNone  nothing carried      -> the resting state row 213 describes
         gEndOne   Earthquake carried   -> the presence twin for every absence leg
         gEndClick THE SWITCH IS ACTUALLY THROWN. Measured 2026-08-07: setting a field and opening
                   the modal fresh proves only that the RENDER is right given state — it cannot see a
                   conditional whose gesture never reaches the render, which is a live defect this
                   very room already carries on hoType/propType. So this leg follows the click. */
    const endShape = (accId) => {
      window.openAccountModal(accId);
      const root = document.getElementById('modal-dynamic-content');
      const det = root ? Array.from(root.querySelectorAll('details')).filter(function (d) {
        const s = d.querySelector('summary');
        return s && /Specialized \/ endorsement coverages/.test(s.textContent);
      })[0] : null;
      /* THE NOT-FOUND SHAPE MUST BE TOTAL — every key the assertions read, present and empty. A
         partial shape here does not make the gate red, it makes it CRASH, and §13.68 RULE A is that
         a crash is not a red: it exits before the leg list is printed, so nobody learns WHICH claim
         failed. Caught by --noendorse on its first run, which is what the control is for. */
      if (!det) return { control: false, why: root ? 'NO_ENDORSEMENT_DISCLOSURE' : 'NO_MODAL_CONTENT', html: '', open: false, limits: 0, placeholders: [], values: [], labels: [] };
      return {
        control: true, why: '',
        html: det.innerHTML,
        open: det.hasAttribute('open'),
        limits: Array.from(det.querySelectorAll('input[type=text]')).length,
        placeholders: Array.from(det.querySelectorAll('input[type=text]')).map(function (i) { return i.getAttribute('placeholder'); }),
        values: Array.from(det.querySelectorAll('input[type=text]')).map(function (i) { return i.value; }),
        labels: Array.from(det.querySelectorAll('.toggle-label')).map(function (x) { return x.textContent; })
      };
    };
    /* ⭐ §13.72 — THE TWO SELECT GESTURES, DRIVEN FOR REAL. The two fixtures above (gHoType, gTown)
       assign the field and open the modal FRESH; they prove the room DRAWS correctly and they were
       green through the entire live defect. These two make the actual gesture on the actual <select>
       and then DELIBERATELY DO NOT REOPEN THE MODAL, because reopening is the one thing that hides
       it. Each returns BOTH sides — what was on screen before the gesture and after — so neither leg
       can pass on a room that simply rendered nothing. */
    const selectGesture = (accId, matchOptionText, value) => {
      window.openAccountModal(accId);
      const root = document.getElementById('modal-dynamic-content');
      if (!root) return { control: false, why: 'NO_MODAL_CONTENT', before: '', after: '', stored: null };
      const sel = Array.from(root.querySelectorAll('select')).filter(function (s) {
        return s.innerHTML.indexOf(matchOptionText) >= 0;
      })[0];
      if (!sel) return { control: false, why: 'NO_SELECT_MATCHING_' + matchOptionText, before: root.innerHTML, after: '', stored: null };
      const before = root.innerHTML;
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const root2 = document.getElementById('modal-dynamic-content');
      return { control: true, why: '', before: before, after: root2 ? root2.innerHTML : '' };
    };
    addInstance('property');
    const gSelHo = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gSelHo.value = 400000;
    out.gClickHoType = selectGesture(gSelHo.id, 'Select policy type…', 'HO-3');
    out.gClickHoTypeStored = gSelHo.hoType;
    addInstance('property');
    const gSelTown = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gSelTown.value = 400000;
    out.gClickPropType = selectGesture(gSelTown.id, 'Select type…', 'Townhouse');
    out.gClickPropTypeStored = gSelTown.propType;
    /* §26.3 — every trigger on the live dropdowns, plus BOTH silences and the precedence rule.
       One fixture per branch because a single fixture can only ever show one of them. */
    out.gTypeDI = (function () {
      const mk = function (ov) {
        addInstance('property');
        const a = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(a, { value: 400000 }, ov || {});
        window.openAccountModal(a.id);
        return cap();
      };
      return {
        blank:    mk({}),
        sf:       mk({ propType: 'Single-family' }),
        condo:    mk({ propType: 'Condo' }),
        town:     mk({ propType: 'Townhouse' }),
        multi:    mk({ propType: 'Multi-family' }),
        manu:     mk({ propType: 'Manufactured' }),
        other:    mk({ propType: 'Other' }),
        land:     mk({ propPurpose: 'Land' }),
        landVsSf: mk({ propPurpose: 'Land', propType: 'Single-family' }),
        purpOnly: mk({ propPurpose: 'Primary residence' })
      };
    })();
    /* §17.3a — every hoType the bank authored, plus blank and an unlisted one. The FIELD LIST is
       captured per fixture because guard 1 is the claim: no field is ever hidden by a policy type. */
    out.gHoNotes = (function () {
      /* ⛔ THE FIELD CHECK READS THE INPUT BINDING, NOT THE LABEL — and the first version did read
         the label, which made it VACUOUS. `--hidefield` deleted Coverage A on HO-4 and guard 1 stayed
         GREEN, because the HO-4 NOTE contains the words "Coverage A — Dwelling usually reads zero".
         The assertion was satisfied by the prose describing the field it was meant to find.
         🔑 WHAT WOULD HAVE TO BE TRUE FOR THIS TO PASS WITHOUT THE THING IT CLAIMS BEING TRUE? Here:
         a sentence mentioning the field by name. Its own control caught it. A binding cannot be
         faked by copy — only an actual rendered input carries it. */
      const FIELDS = ["'covA', this.value)", "'covB', this.value)", "'covC', this.value)",
                      "'covD', this.value)", "'covE', this.value)", "'covF', this.value)",
                      "'dedOther', this.value)", "'dedHurricane', this.value)", "'dedWindHail', this.value)"];
      /* A LITERAL SUBSTRING, NOT A REGEX. The first version of this line was a regex written through
         a shell heredoc; the backslashes were eaten and `var(--teal-mid)` silently became a capture
         group, so it could never match and two legs failed in NORMAL mode. The product was right and
         the assertion was wrong. WHEN THE NEEDLE IS A LITERAL, USE indexOf — a regex here buys
         nothing and adds an escaping surface that fails silently. */
      const NOTE_MARK = 'border-left:2px solid var(--teal-mid); border-radius:2px; font-size:11.5px';
      const o = {};
      for (const ho of ['', 'HO-1', 'HO-2', 'HO-3', 'HO-4', 'HO-5', 'HO-6', 'HO-7', 'HO-8', 'HO-99']) {
        addInstance('property');
        const a = window.state.accounts.filter(x => x.baseId === 'property').pop();
        a.value = 400000; if (ho) a.hoType = ho;
        window.openAccountModal(a.id);
        const h = cap();
        o[ho || 'BLANK'] = { note: h.indexOf(NOTE_MARK) >= 0, allFields: FIELDS.every(function (f) { return h.indexOf(f) >= 0; }),
                             html: h, zeroWritten: /value="0"/.test(h) };
      }
      return o;
    })();
    addInstance('property');
    const eNone = window.state.accounts.filter(x => x.baseId === 'property').pop();
    eNone.value = 400000;
    out.gEndNone = endShape(eNone.id);
    /* RE-PREMISED (§26.4/§26.5/§26.7). The carried fixture was Earthquake — which is no longer IN
       this list, having been superseded by the three-field coverage control. Replacement Cost is the
       endorsement §26.4 added and now leads the list, so it is the carried case. TWO fields now, not
       one: Coverage limit + Annual premium. */
    addInstance('property');
    const eOne = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(eOne, { value: 400000, endorseReplCost: true, endorseReplCostLimit: '$50,000', endorseReplCostPremium: '$120' });
    out.gEndOne = endShape(eOne.id);
    /* §26.7 DE-DUPLICATION FIXTURE — both hazard coverages carried, so the earthquake control's
       three fields and the flood control's three can be counted and named. */
    addInstance('property');
    const eHaz = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(eHaz, { value: 400000, coverFlood: true, endorseQuake: true, endorseQuakeLimit: '$300,000', quakeDeductible: '10% of Coverage A', quakePremium: '$900', floodCovBuilding: '$250,000', floodCovContents: '$100,000', floodPremium: '$1,400' });
    window.openAccountModal(eHaz.id);
    out.gHazCover = (function () { var r = document.getElementById('modal-dynamic-content'); return r ? r.innerHTML : ''; })();
    addInstance('property');
    const eHazOff = window.state.accounts.filter(x => x.baseId === 'property').pop();
    eHazOff.value = 400000;
    window.openAccountModal(eHazOff.id);
    out.gHazOff = (function () { var r = document.getElementById('modal-dynamic-content'); return r ? r.innerHTML : ''; })();
    out.gEndClick = (function () {
      addInstance('property');
      const ec = window.state.accounts.filter(x => x.baseId === 'property').pop();
      ec.value = 400000;
      const before = endShape(ec.id);
      const rows = Array.from(document.querySelectorAll('#modal-dynamic-content .toggle-row'));
      const row = rows.filter(function (x) { const l = x.querySelector('.toggle-label'); return l && l.textContent === 'Replacement Cost on Personal Property'; })[0];
      if (!row) return { before: before, after: null, why: 'NO_REPLCOST_SWITCH', stored: null };
      const cb = row.querySelector('input[type=checkbox]');
      if (!cb) return { before: before, after: null, why: 'NO_CHECKBOX', stored: null };
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));   // the real gesture, not a state poke
      /* Deliberately does NOT re-open the modal — re-opening is exactly what would hide the bug. */
      const root = document.getElementById('modal-dynamic-content');
      const det = root ? Array.from(root.querySelectorAll('details')).filter(function (d) {
        const s = d.querySelector('summary');
        return s && /Specialized \/ endorsement coverages/.test(s.textContent);
      })[0] : null;
      return {
        before: before,
        after: det ? { open: det.hasAttribute('open'), limits: Array.from(det.querySelectorAll('input[type=text]')).length, labels: Array.from(det.querySelectorAll('.toggle-label')).map(function (x) { return x.textContent; }) } : null,
        why: det ? '' : 'DISCLOSURE_GONE_AFTER_TOGGLE',
        stored: !!ec.endorseReplCost
      };
    })();
    // §9b — g9bAll fires ALL four rules: value 200k, linked debt 180k (LTV 90%), carry 10k (cost-to-value 5%),
    // manual utilities. gNone fires none (value only — no carry/debt/util) → §9b prints nothing.
    addInstance('property');
    const g9 = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(g9, { value: 200000, propTaxYr: '6000', utilYr: '4000' });
    addInstance('mortgage_joint');
    const m9 = window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop();
    m9.value = 180000; m9.linkedAssetId = g9.id;
    window.openAccountModal(g9.id); out.g9bAll = cap();
    addInstance('property');
    const gn = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gn.value = 300000;
    window.openAccountModal(gn.id); out.gNone = cap();
    // SERVED-BYTES reproduction of the Captain's #242 smoke: a restored-blueprint home whose value is a
    // FORMATTED STRING ("$400,000") — the exact state that silenced §9 + §9b live (parseFloat -> NaN -> 0).
    // Carry $10,010, manual utilities $5,555, no debt -> 9b.3 (eq $400k ≈ 40yr) + 9b.4 must render.
    addInstance('property');
    const gs = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gs.value = '$400,000'; gs.propTaxYr = '4455'; gs.utilYr = '5555';
    window.openAccountModal(gs.id); out.gStr = cap();
    // §9c VALUE-MISSING NUDGE — carrying costs entered but NO value (val<=0 && carry>0): nudge fires, §9/§9b silent.
    addInstance('property');
    const gnud = window.state.accounts.filter(x => x.baseId === 'property').pop();
    gnud.propTaxYr = '6000'; gnud.utilYr = '3000';   // value left unset (0)
    window.openAccountModal(gnud.id); out.gNudge = cap();
    // #245 §0.2 — FIXTURE STATE: a $400k property whose room is open, with FOUR unlinked debts sitting
    // in the plan — a mortgage, a HELOC, an auto loan and a personal loan. The property's link control
    // must offer the first two and refuse the last two.
    addInstance('property');
    const grev = window.state.accounts.filter(x => x.baseId === 'property').pop();
    grev.value = 400000;
    addInstance('mortgage_joint');      window.state.accounts.filter(x => x.baseId === 'mortgage_joint').pop().value = 200000;
    // heloc_joint is NEW to this fixture (2026-08-02). "Mortgage/HELOC ONLY" had never once been run
    // with a HELOC present, so the HELOC half of the rule was asserted and never exercised.
    addInstance('heloc_joint');         window.state.accounts.filter(x => x.baseId === 'heloc_joint').pop().value = 30000;
    addInstance('auto_debt_joint');     window.state.accounts.filter(x => x.baseId === 'auto_debt_joint').pop().value = 15000;
    addInstance('personal_loan_joint'); window.state.accounts.filter(x => x.baseId === 'personal_loan_joint').pop().value = 5000;
    window.openAccountModal(grev.id);
    // Reads the LIVE control (§18.3 <details> disclosure), not the retired native <select>. Returns a
    // SHAPE, never a bare list, so "the control was missing" is a distinguishable state instead of an
    // empty array that every exclusion assertion would sail straight through.
    out.gRev = (function () {
      var root = document.getElementById('modal-dynamic-content');
      if (!root) return { control: false, why: 'NO_MODAL_CONTENT', opts: [] };
      var det = Array.from(root.querySelectorAll('details')).find(function (d) {
        var s = d.querySelector('summary');
        return s && /Link or draft a liability/.test(s.textContent);
      });
      if (!det) return { control: false, why: 'NO_LIABILITY_DISCLOSURE', opts: [] };
      var rows = Array.from(det.querySelectorAll('div[onclick^="linkDebtToAsset"]'));
      return {
        control: true,
        why: '',
        emptyState: /Nothing available to link/.test(det.innerHTML),
        draftRow: /Draft New Liability/.test(det.innerHTML),
        opts: rows.map(function (r) { return r.textContent.replace(/link\s*$/, '').trim(); })
      };
    })();
    // OPEN-1 (#244) — the slim Clerk mirror must PRESERVE the 5 carrying-cost fields across a round-trip.
    out.slimCarry = (function () {
      try {
        addInstance('property');
        var gc = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gc, { value: 500000, propTaxYr: '6000', homeInsYr: '2000', maintYr: '4000', hoaYr: '1200', utilYr: '3600' });
        var slim = window.DatumBlueprint.slimSlotForClerk({ accounts: window.state.accounts });
        var hyd = window.DatumBlueprint.hydrateAccountNames(slim.accounts.slice(), function (bid) { var b = getBaseType(bid); return b ? b.title : ''; });
        var a = hyd.filter(x => x.id === gc.id).pop();
        return { propTaxYr: a.propTaxYr, homeInsYr: a.homeInsYr, maintYr: a.maintYr, hoaYr: a.hoaYr, utilYr: a.utilYr };
      } catch (e) { return { err: e.message }; }
    })();
    // #258/#259 PART 1 — the 11 property-detail fields must ALSO survive the slim Clerk mirror round-trip.
    out.slimDetails = (function () {
      try {
        addInstance('property');
        var gd = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gd, { propName: 'Lake cabin', propPurpose: 'Rental property', propType: 'Condo', propStreet: '123 Main St', propCity: 'Austin', propState: 'TX', propZip: '78701', propBeds: '3 Beds', propBaths: '2 Baths', propSqft: '1850', propYear: '1998' });
        var slim = window.DatumBlueprint.slimSlotForClerk({ accounts: window.state.accounts });
        var hyd = window.DatumBlueprint.hydrateAccountNames(slim.accounts.slice(), function (bid) { var b = getBaseType(bid); return b ? b.title : ''; });
        var a = hyd.filter(x => x.id === gd.id).pop();
        return { propName: a.propName, propPurpose: a.propPurpose, propType: a.propType, propStreet: a.propStreet, propCity: a.propCity, propState: a.propState, propZip: a.propZip, propBeds: a.propBeds, propBaths: a.propBaths, propSqft: a.propSqft, propYear: a.propYear };
      } catch (e) { return { err: e.message }; }
    })();
    // #249/#258/#259 — valuation UI: §5 toggle ON reveals the (structured) address + Get-estimate; a MOCKED
    // verify+Worker response renders range/tag/Use-button + comps; not-found blocks the paid call (R149).
    addInstance('property');
    const gap = window.state.accounts.filter(x => x.baseId === 'property').pop();
    Object.assign(gap, { value: 400000, useValueApi: true, propStreet: '1600 Pennsylvania Ave NW', propCity: 'Washington', propState: 'DC', propZip: '20500' });
    window.openAccountModal(gap.id);
    out.gApiUI = cap();
    window._AssetIntel.verifyAddress = async function () { return { status: 'verified', canonical: '1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500' }; };
    window._AssetIntel.fetchEstimate = async function () { return { status: 'ok', value: 291000, low: 215000, high: 367000, source: 'RentCast', updated: '2026-07-13T02:50:23Z', comps: [ { address: '1700 Penn Ave, Washington, DC', price: 305000, beds: 3, baths: 2, sqft: 1800, distance: 0.3, saleDate: '2026-05-01' } ] }; };
    await window.groundsVerifyAndEstimate(gap.id);
    var _res = document.getElementById('modal-avm-result-' + gap.id);
    out.gApiResult = _res ? _res.innerHTML : '';
    out.gApiCanonical = gap.propAddress;   // verify wrote the canonical string into the hidden RentCast field
    window.groundsUseEstimate(gap.id, 291000);   // value already 400000 -> overwrite-warn confirm
    out.gApiConfirm = {
      msg: (document.getElementById('bc-msg') || {}).textContent || '',
      title: (document.getElementById('bc-title') || {}).textContent || '',
      ok: (document.getElementById('bc-ok') || {}).textContent || '',
      cancel: (document.getElementById('bc-cancel') || {}).textContent || ''
    };
    // #260 — ACCEPT the estimate (click "Use $291,000"): the value fills AND the modal re-renders; the
    // Estimated Market Range + Comparable sales must PERSIST (not be torn down) so the comps stay a
    // sanity-check tool (R147 promise). Re-open proves it survives the re-render.
    var _bok = document.getElementById('bc-ok'); if (_bok) _bok.click();
    out.gApiPersist = (function () {
      var a = window.state.accounts.find(function (x) { return x.id === gap.id; });
      var rEl = document.getElementById('modal-avm-result-' + gap.id);
      var htmlNow = rEl ? rEl.innerHTML : '';
      // also prove it survives a full close+reopen (not just the accept re-render)
      window.openAccountModal(gap.id);
      var rEl2 = document.getElementById('modal-avm-result-' + gap.id);
      return { html: htmlNow, reopenHtml: rEl2 ? rEl2.innerHTML : '', value: a ? a.value : null };
    })();
    // empty-comps -> R148 honest empty-state (fresh verified account)
    out.gApiNoComps = await (async function () {
      try {
        addInstance('property');
        var gec = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gec, { value: 0, useValueApi: true, propStreet: '5 Quiet Ln', propCity: 'Rural', propState: 'MT', propZip: '59001' });
        window.openAccountModal(gec.id);
        window._AssetIntel.verifyAddress = async function () { return { status: 'verified', canonical: '5 QUIET LN, RURAL, MT, 59001' }; };
        window._AssetIntel.fetchEstimate = async function () { return { status: 'ok', value: 250000, low: 230000, high: 270000, updated: '2026-07-13T02:50:23Z', comps: [] }; };
        await window.groundsVerifyAndEstimate(gec.id);
        var _r = document.getElementById('modal-avm-result-' + gec.id);
        return _r ? _r.innerHTML : '';
      } catch (e) { return String(e.message); }
    })();
    // not-found -> R149 shown + NO estimate fetch (paid call blocked)
    out.gApiNotVerified = await (async function () {
      try {
        addInstance('property');
        var gnv = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gnv, { value: 0, useValueApi: true, propStreet: '999 Nowhere Rd', propCity: 'Nowhere', propState: 'ZZ', propZip: '00000' });
        window.openAccountModal(gnv.id);
        var nfFetch = 0;
        window._AssetIntel.verifyAddress = async function () { return { status: 'not-found' }; };
        window._AssetIntel.fetchEstimate = async function () { nfFetch++; return { status: 'ok', value: 1 }; };
        await window.groundsVerifyAndEstimate(gnv.id);
        var vEl = document.getElementById('modal-avm-verify-' + gnv.id);
        return { msg: vEl ? vEl.innerHTML : '', fetchCalled: nfFetch };
      } catch (e) { return { err: e.message }; }
    })();
    // Census unreachable ('error') -> FAIL-OPEN: the estimate STILL runs with the entered address (a real
    // user is not blocked by a Census outage); no R149. Only a CONFIRMED not-found blocks.
    out.gApiVerifyErr = await (async function () {
      try {
        addInstance('property');
        var gve = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gve, { value: 0, useValueApi: true, propStreet: '742 Evergreen Terrace', propCity: 'Springfield', propState: 'IL', propZip: '62704' });
        window.openAccountModal(gve.id);
        var efFetch = 0;
        window._AssetIntel.verifyAddress = async function () { return { status: 'error' }; };
        window._AssetIntel.fetchEstimate = async function () { efFetch++; return { status: 'ok', value: 275000, low: 250000, high: 300000, updated: '2026-07-13T02:50:23Z', comps: [] }; };
        await window.groundsVerifyAndEstimate(gve.id);
        var vEl = document.getElementById('modal-avm-verify-' + gve.id);
        var rEl = document.getElementById('modal-avm-result-' + gve.id);
        return { verifyMsg: vEl ? vEl.innerHTML : '', result: rEl ? rEl.innerHTML : '', fetchCalled: efFetch, addr: gve.propAddress };
      } catch (e) { return { err: e.message }; }
    })();
    // #262 §1.2 behavior — accepting LOW fills the low figure, HIGH fills the high figure (overwrite-confirm
    // guards both; the middle is covered by the persist probe above).
    out.gApiAcceptLow = (function () {
      try {
        addInstance('property');
        var gl = window.state.accounts.filter(x => x.baseId === 'property').pop();
        gl.value = 400000;
        window.groundsUseEstimate(gl.id, 215000);   // "Use the low end"
        var okB = document.getElementById('bc-ok'); if (okB) okB.click();   // accept past the overwrite-confirm
        return window.state.accounts.find(function (x) { return x.id === gl.id; }).value;
      } catch (e) { return String(e.message); }
    })();
    out.gApiAcceptHigh = (function () {
      try {
        addInstance('property');
        var gh = window.state.accounts.filter(x => x.baseId === 'property').pop();
        gh.value = 400000;
        window.groundsUseEstimate(gh.id, 367000);   // "Use the high end"
        var okB = document.getElementById('bc-ok'); if (okB) okB.click();
        return window.state.accounts.find(function (x) { return x.id === gh.id; }).value;
      } catch (e) { return String(e.message); }
    })();
    // #263 item 3 — estimate block renders UNDER Property details, INDEPENDENT of "Show carrying costs" (OFF).
    out.gApiIndependent = (function () {
      try {
        addInstance('property');
        var gi = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(gi, { value: 300000, useValueApi: true, showCarryCosts: false, propStreet: '1 A St', propCity: 'Austin', propState: 'TX', propZip: '78701' });
        window.openAccountModal(gi.id);
        return cap();
      } catch (e) { return String(e.message); }
    })();
    /* ══ §17.5 · FLOOD + SHAKING — DRIVEN THROUGH THE REAL GESTURE, PROVIDERS STUBBED ══════════════
       Stubs the three Worker seams and then calls groundsVerifyAndEstimate, i.e. the same function
       the "Get estimate" button calls. NOT a state poke: §17.5 only ever populates as a consequence
       of that gesture, so a fixture that assigned the snapshot directly would prove the renderer and
       skip the wiring under test (§13.72). Deliberately does NOT re-open the modal afterwards.
       Five fixtures because row 218 and §17.5a's guards are claims about DIFFERENT branches, and one
       fixture can only ever exercise one of them. */
    out.g175 = await (async function () {
      const cap = () => document.getElementById('modal-dynamic-content').innerHTML;
      const mk = () => {
        addInstance('property');
        const a = window.state.accounts.filter(x => x.baseId === 'property').pop();
        Object.assign(a, { value: 400000, useValueApi: true, propStreet: '1 Beach Rd', propCity: 'Clearwater', propState: 'FL', propZip: '33767' });
        return a;
      };
      /* `censusCoords` defaults to null so every EXISTING leg below still proves the RentCast path.
         The Captain's smoke case is the opposite pairing and gets its own fixture. */
      const stub = (coords, flood, quake, censusCoords) => {
        window._AssetIntel.verifyAddress = async () => ({ status: 'verified', canonical: '1 BEACH RD, CLEARWATER, FL, 33767', coords: censusCoords || null });
        window._AssetIntel.fetchEstimate = async () => ({ status: 'ok', value: 500000, low: 480000, high: 520000, updated: '2026-08-07T00:00:00Z', comps: [], coords: coords });
        window._AssetIntel.fetchFlood = async () => flood;
        window._AssetIntel.fetchQuake = async () => quake;
      };
      const o = {};
      try {
        // BOTH — the presence twin every absence leg below is measured against.
        const a = mk();
        stub({ lat: 27.9775, lon: -82.8290 }, { status: 'ok', zone: 'VE', subtype: 'COASTAL FLOODPLAIN', source: 'FEMA NFHL', updated: '2026-08-07T22:00:00.000Z' }, { status: 'ok', ss: 1.888, sdc: 'D', source: 'USGS ASCE 7-16', updated: '2026-08-07T22:00:00.000Z' });
        window.openAccountModal(a.id);
        o.before = cap();
        await window.groundsVerifyAndEstimate(a.id);
        o.both = cap();
        o.storedHazard = JSON.stringify((a.assetAvmSnapshot || {}).hazard || null);
        // BAND BOUNDARIES — the exact edges §17.5a authored, each rendered through the real path.
        o.bands = {};
        for (const pair of [[0.10, 'very low'], [0.25, 'low'], [0.49, 'low'], [0.50, 'moderate'], [0.99, 'moderate'], [1.00, 'high'], [1.49, 'high'], [1.50, 'very high']]) {
          const b = mk();
          stub({ lat: 34, lon: -118 }, { status: 'error' }, { status: 'ok', ss: pair[0] });
          window.openAccountModal(b.id);
          await window.groundsVerifyAndEstimate(b.id);
          /* Figure and descriptor are separate elements since the §17.5 panel redesign, so BOTH are
             asserted — which is still the guard-2 pairing: the number and the word, together. */
          var _h = cap();
          o.bands[pair[0]] = _h.indexOf('>' + pair[0] + 'g<') >= 0 && _h.indexOf('>' + pair[1] + ' shaking<') >= 0;
        }
        // QUAKE FAILS — guard 2. No number means NO word, and the flood half must survive.
        const c = mk();
        stub({ lat: 27.9775, lon: -82.8290 }, { status: 'ok', zone: 'AE', subtype: 'FLOODWAY' }, { status: 'error' });
        window.openAccountModal(c.id);
        await window.groundsVerifyAndEstimate(c.id);
        o.noQuake = cap();
        /* ss MISSING BUT sdc PRESENT — the ONLY fixture in which guard 3's render half can be
           exercised at all. Without it, "sdc never reaches the screen" is asserted only against
           fixtures where sdc could never have appeared anyway, which is an it-is-not-there test
           that proves nothing. This is the state a fallback would fire on. */
        const s0 = mk();
        stub({ lat: 34, lon: -118 }, { status: 'ok', zone: 'X', subtype: 'AREA OF MINIMAL FLOOD HAZARD' }, { status: 'ok', ss: null, sdc: 'B' });
        window.openAccountModal(s0.id);
        await window.groundsVerifyAndEstimate(s0.id);
        o.ssNullSdc = cap();
        o.ssNullSdcStored = JSON.stringify((s0.assetAvmSnapshot || {}).hazard || null);
        /* §17.5b FLOOD KEY — one fixture per tier boundary that matters, plus the X we cannot place.
           The X split is the only judgement in the key (FEMA returns 'X' for both the 0.2%-chance
           zone and the minimal one; the distinction lives in ZONE_SUBTY), so both sides of it and
           the unplaceable case are all exercised. */
        o.tiers = {};
        for (const t of [['VE', 'COASTAL FLOODPLAIN'], ['AE', 'FLOODWAY'], ['X', '0.2 PCT ANNUAL CHANCE FLOOD HAZARD'],
                         ['X', 'AREA OF MINIMAL FLOOD HAZARD'], ['D', 'UNDETERMINED RISK AREA'], ['X', 'SOMETHING ELSE']]) {
          const ft = mk();
          stub({ lat: 27.9775, lon: -82.8290 }, { status: 'ok', zone: t[0], subtype: t[1] }, { status: 'ok', ss: 0.056 });
          window.openAccountModal(ft.id);
          await window.groundsVerifyAndEstimate(ft.id);
          const h = cap();
          o.tiers[t[0] + '|' + t[1]] = ((h.match(/rgba\(93,202,165,0\.18\)[^]{0,160}?>([^<]+)</) || [])[1] || '(none)');
        }
        /* NO PROVENANCE STAMP — the citation must render WITHOUT its date clause rather than with
           today's. A provenance stamp records when the DATA WAS READ, never when the page was drawn. */
        const nst = mk();
        stub({ lat: 27.9775, lon: -82.8290 }, { status: 'ok', zone: 'AE', subtype: 'FLOODWAY', source: 'FEMA NFHL' }, { status: 'error' });
        window.openAccountModal(nst.id);
        await window.groundsVerifyAndEstimate(nst.id);
        o.noStamp = cap();
        // FEMA ANSWERED 'none' — nothing mapped here. Flood line goes, shaking stays.
        const d = mk();
        stub({ lat: 30, lon: -40 }, { status: 'none' }, { status: 'ok', ss: 0.053 });
        window.openAccountModal(d.id);
        await window.groundsVerifyAndEstimate(d.id);
        o.floodNone = cap();
        /* ⭐ THE CAPTAIN'S SMOKE CASE, 2026-08-07 — THE ONE THAT SHIPPED BROKEN.
           The AVM answer is KV-CACHED FOR 60 DAYS and every cached entry predates the coordinate
           capture, so a recently-valued address returns `status:'cached'` with NO coords and §17.5
           stayed silent no matter how many times he refreshed. Census runs on every estimate, is
           never cached, and already carries the coordinates — so this fixture is the real live
           shape: NOTHING from the valuation, EVERYTHING from Census. It must still render. */
        const cch = mk();
        stub(null, { status: 'ok', zone: 'AE', subtype: 'FLOODWAY' }, { status: 'ok', ss: 0.31 }, { lat: 27.9775, lon: -82.8290 });
        window.openAccountModal(cch.id);
        await window.groundsVerifyAndEstimate(cch.id);
        o.censusOnly = cap();
        // NO COORDINATES — a snapshot from before the Worker captured them. Silent, and NO call fires.
        let calls = 0;
        const e = mk();
        window._AssetIntel.verifyAddress = async () => ({ status: 'verified', canonical: 'X ADDR' });
        window._AssetIntel.fetchEstimate = async () => ({ status: 'ok', value: 500000, low: 480000, high: 520000, comps: [] });
        window._AssetIntel.fetchFlood = async () => { calls++; return { status: 'ok', zone: 'VE' }; };
        window._AssetIntel.fetchQuake = async () => { calls++; return { status: 'ok', ss: 1 }; };
        window.openAccountModal(e.id);
        await window.groundsVerifyAndEstimate(e.id);
        o.noCoords = cap();
        o.callsWithoutCoords = calls;
      } catch (err) { o.err = String(err && err.message); }
      return o;
    })();
    // Datum Builder feed hook — the named emitter the future Datum Builder consumes (stub today).
    out.dbFeed = (typeof window.datumBuilderCarryingFeed === 'function') ? window.datumBuilderCarryingFeed() : null;
    // valuation guardrail probe (§6/§6b) — pure JS decision layer, no network. Populated in G3.
    out.ai = (function () {
      if (typeof window._AssetIntel === 'undefined') return { present: false };
      var AI = window._AssetIntel, k = 'gate-addr-1';
      try { localStorage.removeItem('aiByoKey'); localStorage.removeItem(AI._monthKey()); AI._cacheClear && AI._cacheClear(); } catch (e) {}
      var offAcc = { useValueApi: false }, onAcc = { useValueApi: true };
      var disabled = AI.request(offAcc, k).status;                 // toggle OFF (default) -> no call
      // drive 50 permitted calls on Datum's key, then the 51st must be capped
      var last = null;
      for (var i = 0; i < 50; i++) last = AI.request(onAcc, k + i).status;
      var call51 = AI.request(onAcc, k + 'x').status;              // MUST be 'capped'
      var countAtCap = AI._count();
      // BYO-key = the only paid path beyond the cap
      try { localStorage.setItem('aiByoKey', 'user-key-123'); } catch (e) {}
      var byo = AI.request(onAcc, k + 'y').status;                 // permitted despite cap
      // de-dupe: a cached asset returns without a new call
      try { localStorage.removeItem('aiByoKey'); } catch (e) {}
      AI._cacheSet && AI._cacheSet('cached-addr', { value: 500000 });
      var dedupe = AI.request(onAcc, 'cached-addr').status;        // 'cached'
      // no API key may ship in the browser — scan the whole served document for a key-like literal
      var docHtml = document.documentElement.innerHTML;
      var browserKey = /rentcast[_-]?key|rc_[A-Za-z0-9]{12,}|apiKey\s*[:=]\s*['"][A-Za-z0-9]{16,}/i.test(docHtml);
      return { present: true, disabled: disabled, permitted: last, call51: call51, countAtCap: countAtCap, byo: byo, dedupe: dedupe, browserKey: browserKey };
    })();
    /* ══ §27 (bank A342) — THE CAPTAIN'S TWO SMOKE-DRIVEN REQUESTS ════════════════════════════════
       §27.1 DRIVES THE REAL groundsUseEstimate IN BOTH VALUE STATES. It has to: the defect being
       fixed is that in the blank case the dialog NEVER OPENED — the estimate simply landed. A test
       that set state and re-rendered would prove the renderer and sail straight past a dialog that
       is never constructed (§13.72). Both captures return a TOTAL shape so a missing overlay reads
       as a named failure instead of crashing the run before the leg list prints (§13.68 RULE A).
       §27.2 asserts the second WINDOW onto acc.value — including blank-not-$0, and the two-way
       mirror the hover promises out loud. */
    out.p27 = (function () {
      const dlg = function () {
        const ov = document.getElementById('brand-confirm-overlay');
        if (!ov) return { shown: false, why: 'NO_OVERLAY', msg: '', note: '', noteShown: false, ok: '', cancel: '', focused: '' };
        const n = ov.querySelector('#bc-note'), m = ov.querySelector('#bc-msg');
        const b = ov.querySelector('#bc-ok'), c = ov.querySelector('#bc-cancel');
        return {
          shown: ov.style.display !== 'none', why: '',
          msg: m ? m.textContent : '', note: n ? n.textContent : '',
          noteShown: !!n && n.style.display !== 'none',
          ok: b ? b.textContent : '', cancel: c ? c.textContent : '',
          focused: document.activeElement ? document.activeElement.id : ''
        };
      };
      const close = function () { const c = document.getElementById('bc-cancel'); if (c) c.click(); };

      /* ⭐ useValueApi IS DELIBERATELY LEFT OFF IN BOTH FIXTURES, AND THAT IS THE POINT.
         The field was first wired inside the valuation block, which renders only when the estimate
         toggle is ON — so for anyone who never turned it on the value was still card-only, i.e. the
         complaint §27.2 exists to answer, unanswered. Leaving the toggle OFF here means these legs
         fail if it is ever moved back behind that switch. The fixture encodes the RULING, not the
         first attempt at it. */
      // ── fixture A · a property that HAS a recorded value ──
      addInstance('property');
      const wv = window.state.accounts.filter(function (x) { return x.baseId === 'property'; }).pop();
      window.updateValueWithoutRender(wv.id, '300000');
      window.openAccountModal(wv.id);
      const miA = document.getElementById('modal-propval-' + wv.id);
      const fieldWith = { present: !!miA, value: miA ? miA.value : '__ABSENT__', cls: miA ? miA.className : '' };
      window.groundsUseEstimate(wv.id, 341000);
      const dWith = dlg();
      close();

      /* ── fixture B · a property with NO value. THE PRESENCE TWIN for every §27.1 blank-case leg:
            without it, "the dialog says Leave it blank" could pass on a dialog that never opens. ── */
      addInstance('property');
      const nv = window.state.accounts.filter(function (x) { return x.baseId === 'property'; }).pop();
      window.openAccountModal(nv.id);
      const miB = document.getElementById('modal-propval-' + nv.id);
      const fieldNone = { present: !!miB, value: miB ? miB.value : '__ABSENT__' };
      window.groundsUseEstimate(nv.id, 341000);
      const dNone = dlg();
      close();

      /* ── the MIRROR, driven through both real handlers rather than asserted from the markup. A
            hover that promises "change it in either place and both update" is a claim about
            behaviour, and only a gesture can check it. ── */
      window.openAccountModal(wv.id);
      const mi = document.getElementById('modal-propval-' + wv.id);
      let mirror = { control: false, why: 'NO_MODAL_INPUT' };
      if (mi) {
        mi.value = '$450,000';
        mi.dispatchEvent(new Event('input', { bubbles: true }));
        const card = document.getElementById('room-val-inp-' + wv.id);
        const cardAfter = card ? card.value : '__NO_CARD__';
        const storedAfterModal = (window.state.accounts.find(function (a) { return a.id === wv.id; }) || {}).value;
        window.updateValueWithoutRender(wv.id, '525000');            // the card's own write path
        const mi2 = document.getElementById('modal-propval-' + wv.id);
        mirror = { control: true, why: '', storedAfterModal: storedAfterModal, cardAfter: cardAfter,
                   modalAfter: mi2 ? mi2.value : '__ABSENT__' };
      }
      const root = document.getElementById('modal-dynamic-content');
      return { fieldWith: fieldWith, fieldNone: fieldNone, dWith: dWith, dNone: dNone,
               mirror: mirror, html: root ? root.innerHTML : '' };
    })();
    return out;
  });
  await b.close();
  server.close();

  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  let pass = 0, fail = 0; const lines = [];
  function ok(cond, label) { if (cond) pass++; else fail++; lines.push((cond ? 'PASS ' : 'FAIL ') + label); }
  const pick = (win, lose) => RF ? lose : win;

  // ===== G1 · §3a/§3b TITLE HOVER + §29 DOCTRINE (Grounds-only) =====
  lines.push('===== G1 · §3a/§3b TITLE + DOCTRINE =====');
  ok(has(R.gBlank, 'The Grounds — your real estate') && has(R.gBlank, 'Your real property and the equity inside it'), '§3a header hover (Grounds title)');
  ok(has(R.gBlank, 'your real property — homes, land, rental units') && has(R.gBlank, "You can't rebalance a house"), '§3b full intro hover (illiquid / excluded-from-Shape)');
  ok(has(R.gBlank, 'equity grows while carrying cost quietly runs in the background'), '§29 the-one-doctrine (Grounds)');
  ok(pick(!has(R.gAuto, 'The Grounds — your real estate'), has(R.gAuto, 'The Grounds — your real estate')), 'Title hover ABSENT on Driveway (Grounds-only) [BITE]');

  // ===== G1 · §4 CARRYING-COST FIELDS + §5 TOGGLES =====
  lines.push('===== G1 · §4 CARRYING COSTS + §5 TOGGLES =====');
  ok(has(R.gFill, 'Show carrying costs') && has(R.gFill, 'Include in Datum Builder'), '§5 toggles (Show carrying costs · Include in Datum Builder)');
  // §20.4 SYNC: the Grounds insurance label now matches the Moat's ('Annual Homeowner Insurance') — same
  // mirrored figure, same label on both surfaces (Property Copy Bank A26 / §18.2 D1 unification).
  ok(has(R.gFill, 'Property Tax (yr)') && has(R.gFill, 'Annual Homeowner Insurance') && has(R.gFill, 'Est. Maintenance / Repairs (yr)') && has(R.gFill, 'HOA / Condo Fees (yr)') && has(R.gFill, 'Utilities — electric / gas / water (yr)'), '§4.1-4.5 all carrying-cost fields render');
  ok(has(R.gFill, 'Total Annual Carrying Cost') && has(R.gFill, '$16,800'), '§4.16 TOTAL = $16,800 (6000+2000+4000+1200+3600)');
  ok(has(R.gFill, "about 1% of the home's value is a common rule of thumb"), '§4.3 maintenance est. (~1%) hover (updated copy)');
  /* ══ §17.1 · THE THREE GROUP HEADERS, IN THE SERVED BYTES ══════════════════════════════════════
     Authored 2026-07-25, wired 2026-08-06 — the first §17 subsection to ship. Asserted as WHOLE
     authored sentences, which is why the markup keeps each one as a single unbroken text node: a
     header split across two styled spans renders identically and is ungreppable, so this leg would
     be asserting a string the page never contains in one piece.
     ORDER IS PART OF THE CONTRACT, not decoration — B must precede C because Group B is the anchor
     §17.2-§17.5 land inside; asserting mere presence would pass on a page that buried Insurance
     under the utility bill. indexOf comparison is the cheapest honest way to pin sequence.
     ⛔ THESE DO NOT REPLACE THE MATH LEGS ABOVE. §4.1-4.5 (all five fields render) and §4.16 (TOTAL
     = $16,800) are the regression guard for "no math change", and they were already here — the
     regroup had to leave them both untouched, and it did. */
  ok(has(R.gFill, G17_A), '§17.1 GROUP A header — "Carrying Costs — what you owe to keep the home."');
  /* RE-PREMISED (§26.2). Group B no longer exists as a label inside the carrying block — the
     Captain asked for a SECTION and the bank had authored a group; his design won. The old string is
     asserted GONE and the new section header + subhead asserted PRESENT, in one leg, so "the group
     label is missing" can never pass on a room that simply lost the insurance layer. */
  ok(!has(R.gFill, G17_B)
     && has(R.gFill, 'Show insurance details')
     && has(R.gFill, '>Property Insurance</div>')
     && has(R.gFill, 'What protects the home and you — separate from what it costs to keep.'),
     '§26.2 Property Insurance is its OWN toggled section — the old Group-B label is gone, header + subhead render');
  ok(has(R.gFill, G17_C), '§17.1 GROUP C header — "Operating Costs — what it takes to run the home day to day."');
  /* ORDER, RE-PREMISED: the insurance SECTION now sits ABOVE the Annual Carrying Cost block, and
     Groups A and C keep their places INSIDE it. Both facts in one leg — the split is only correct if
     the promoted section went up AND the two remaining groups stayed put. */
  ok(has(R.gFill, G17_A) && has(R.gFill, G17_C)
     && R.gFill.indexOf('Show insurance details') < R.gFill.indexOf('🧾 Annual Carrying Cost')
     && R.gFill.indexOf(G17_A) < R.gFill.indexOf(G17_C),
     '§26.2 ORDER — the insurance section precedes Annual Carrying Cost, and Groups A → C are undisturbed inside it');
  /* ⛔ THE ONE THAT MATTERS. The insurance FIELD moved surfaces; it did NOT leave the sum. The total
     is still the same five fields, and the reconciling line is present so the figure can be added up
     from what is on screen — a total that exceeds its visible parts is the same family of harm as a
     silently inflated one. */
  ok(has(R.gFill, '$16,800') && has(R.gFill, 'recorded above under Property Insurance') && has(R.gFill, '$2,000'),
     '§26.2 GUARD — the total is UNCHANGED at $16,800 and the moved insurance figure is shown here, so the sum reconciles on screen');

  /* ══ §17.2 · THE HO-1…HO-8 EDUCATION BLOCK, IN THE SERVED BYTES ════════════════════════════════
     All eight authored lines asserted whole. Cheap to write, and the reason to write all eight
     rather than spot-check two: this is EDUCATION COPY about insurance a user may act on, so a
     silently-dropped line is a silently-missing explanation, not a cosmetic gap. */
  ok(has(R.gFill, "HO-1 (Basic) — bare-bones, named-perils only. Rare today; most lenders won't accept it."), '§17.2 HO-1 line verbatim');
  ok(has(R.gFill, 'HO-2 (Broad) — named-perils on both home and belongings. A step up from HO-1, still limited.'), '§17.2 HO-2 line verbatim');
  ok(has(R.gFill, 'HO-3 (Special) — the standard homeowner policy. Open-perils on the house, named-perils on belongings. If you own a house, this is usually you.'), '§17.2 HO-3 line verbatim');
  ok(has(R.gFill, "HO-4 (Renters) — covers YOUR belongings and liability inside a place you rent. The building is the landlord's policy, not yours."), '§17.2 HO-4 line verbatim');
  ok(has(R.gFill, 'HO-5 (Comprehensive) — open-perils on both the home AND your belongings. The broadest common policy; costs more, claims are easier.'), '§17.2 HO-5 line verbatim');
  ok(has(R.gFill, "HO-6 (Condo) — covers your unit's interior, belongings, and liability. The association's master policy covers the building shell."), '§17.2 HO-6 line verbatim');
  ok(has(R.gFill, 'HO-7 — an HO-3-style policy written for a mobile or manufactured home.'), '§17.2 HO-7 line verbatim');
  ok(has(R.gFill, 'HO-8 (Older Home) — for homes whose rebuild cost exceeds market value; pays repair cost rather than full replacement. Common for historic houses.'), '§17.2 HO-8 line verbatim');
  ok(has(R.gFill, 'ira-why-sec hot') && R.gFill.indexOf('ira-why-sec hot') < R.gFill.indexOf('HO-4 (Renters)'),
     '§17.2 HO-3 carries the common-default highlight (row 186) and it is the ONLY one — a tag on every line tags nothing');
  ok(has(R.gFill, 'General education, not a coverage recommendation.'),
     '§17.2 GUARD (row 193) — labelled education on its face, never advice');
  /* THE COLLAPSE, BOTH DIRECTIONS. Presence alone would pass on a panel that can never close, and
     "it disappears" alone would pass on a panel that never appeared (§ exclusion needs presence). */
  ok(has(R.gFill, 'Homeowner policy types — HO-1 through HO-8'), '§17.2 teach box PRESENT while no policy type is chosen');
  /* ⭐ RE-PREMISED ON THE CAPTAIN'S SMOKE, 2026-08-07. This leg used to assert the teach box was
     GONE once a policy type was chosen. That was the shipped behaviour and it was wrong: picking
     HO-3 deleted the eight explanations the user was reading, with no way back short of clearing
     the field. Row 183 says the panel "COLLAPSES" — and `_diWhyPanel` already renders CLOSED, so
     rendering it always IS the collapsed state. We read a word about presentation as a word about
     existence, and the gate then FROZE that misreading in place.
     🔑 A GATE CAN LOCK IN A DEFECT AS FIRMLY AS IT LOCKS IN A FEATURE. This one was green for a
     day over behaviour a human called wrong within ten minutes of seeing it. The leg is INVERTED,
     not deleted, so the new contract is asserted just as hard as the old one was.
     Both halves in one leg: the panel SURVIVES a chosen type AND the room around it still renders,
     or "it is still there" would pass on a room that ignored the selection entirely. */
  ok(has(R.gHoType, 'Homeowner policy types — HO-1 through HO-8') && has(R.gHoType, 'HO-3 (Special)')
     && has(R.gHoType, 'Annual Homeowner Insurance'),
     '§17.2 the teach panel SURVIVES a chosen policy type (row 183 = collapsed, NOT deleted) — all eight explanations stay readable, and Group B renders around it');
  ok(has(R.gFill, 'ira-why-body" style="display:none;'),
     '§17.2 the panel renders CLOSED — it is a disclosure the user opens, which is what "collapses" actually means');
  /* TOWNHOME BRANCH — conditional on the EXISTING propType field, so it must be ABSENT by default. */
  ok(!has(R.gFill, 'It depends who owns the walls'), '§17.2 townhome branch ABSENT on a non-townhouse (conditional teach)');
  ok(has(R.gTown, 'Townhome? It depends who owns the walls — if you own the structure, look at HO-3 or HO-5; if you rent, HO-4; if a condo association owns the shell, HO-6.'),
     '§17.2 townhome branch PRESENT and verbatim when propType = Townhouse (row 192)');

  /* ══ §17.3 · COVERAGE A–F + DEDUCTIBLES + THE HO-TYPE DROPDOWN ═════════════════════════════════
     Both authored hovers asserted on every limit — 'What's this?' AND 'Do I have enough?' — because
     row 194 requires both and the second is the one that would be quietly dropped: it is the longer
     string, it is the one that reads like advice, and losing it leaves a bare number with no sense
     of scale. Nine fields, eighteen strings, all verbatim. */
  ok(has(R.gFill, 'Homeowner policy type') && has(R.gFill, 'Select policy type…')
     && has(R.gFill, '>HO-1<') && has(R.gFill, '>HO-8<'),
     '§17.3 HO-type dropdown renders HO-1…HO-8, blank until chosen (row 195)');
  ok(has(R.gFill, "The cost to rebuild your home's structure.") && has(R.gFill, 'Should roughly equal REBUILD cost — not market price and not your mortgage.'), '§17.3 Coverage A — both hovers verbatim');
  ok(has(R.gFill, 'Detached structures — fence, shed, detached garage.') && has(R.gFill, 'Often defaults to ~10% of Coverage A; raise it if you have a big detached structure.'), '§17.3 Coverage B — both hovers verbatim');
  ok(has(R.gFill, 'Your belongings — furniture, clothes, electronics.') && has(R.gFill, 'Often ~50–70% of Coverage A. Do a rough room-by-room tally to sanity-check.'), '§17.3 Coverage C — both hovers verbatim');
  ok(has(R.gFill, "Pays living costs if you can't stay home during a covered repair.") && has(R.gFill, 'Often ~20% of Coverage A; think months of rent + meals.'), '§17.3 Coverage D — both hovers verbatim');
  ok(has(R.gFill, "Covers you if someone is hurt or their property is damaged and you're liable.") && has(R.gFill, 'Common floors are $300k–$500k; a pool, dog, or trampoline argues for more (or an umbrella policy).'), '§17.3 Coverage E — both hovers verbatim');
  ok(has(R.gFill, 'Small no-fault medical bills for a guest hurt on your property.') && has(R.gFill, 'Usually $1k–$5k; goodwill coverage, not the big liability line.'), '§17.3 Coverage F — both hovers verbatim');
  ok(has(R.gFill, 'What you pay out of pocket before a normal claim (fire, theft) pays.') && has(R.gFill, 'Higher deductible = lower premium; pick what you could cover on short notice.'), '§17.3 Deductible Other Perils — both hovers verbatim');
  /* THE TWO STORM DEDUCTIBLES ARE ASSERTED SEPARATELY AND BY NAME. Collapsing them into one control
     was the specific mistake to avoid — they are distinct policy lines, often percentage-based, and
     a single "storm deductible" field would silently merge two different numbers a coastal owner
     actually carries. Order pinned: Hurricane before Wind/Hail, as authored (rows 203 then 204). */
  ok(has(R.gFill, 'Deductible — Hurricane') && has(R.gFill, 'A separate, often PERCENTAGE deductible that applies to named-storm damage.') && has(R.gFill, 'A % deductible on a big Coverage A can be a large dollar figure — do the math for a real storm.'), '§17.3 Deductible Hurricane — present + both hovers verbatim');
  ok(has(R.gFill, 'Deductible — Wind/Hail') && has(R.gFill, 'A separate deductible for wind or hail damage, common in storm-prone regions.') && has(R.gFill, 'Like the hurricane line — a % here can be a big number; know it before a claim.'), '§17.3 Deductible Wind/Hail — present + both hovers verbatim');
  ok(R.gFill.indexOf('Deductible — Hurricane') < R.gFill.indexOf('Deductible — Wind/Hail')
     && R.gFill.indexOf('Deductible — Other Perils (standard)') < R.gFill.indexOf('Deductible — Hurricane'),
     '§17.3 the three deductibles are THREE separate controls in authored order (standard → hurricane → wind/hail)');
  /* ⛔ ROW 205, THE GUARD THAT MATTERS MOST. A blank limit and a limit of zero are opposite facts,
     and on an insurance figure that is the difference between "not recorded" and "not covered". */
  ok(!/placeholder="\$0"[^>]*oninput="updateAccField\('[^']+', 'cov[A-F]'/.test(R.gFill)
     && !/value="\$0"[^>]*oninput="updateAccField\('[^']+', 'cov[A-F]'/.test(R.gFill),
     '§17.3 GUARD (row 205) — no Coverage limit ships a $0 placeholder or a pre-filled value');
  ok((R.gFill.match(/placeholder="—"/g) || []).length >= 9,
     '§17.3 GUARD — all nine §17.3 inputs render an em-dash placeholder, never a "typical" amount');
  /* THE FORWARD DEPENDENCY, NOW CLOSED. §17.2 wired its collapse against a field that did not exist
     yet and this is the handshake: the dropdown §17.3 ships must be the SAME `hoType`, or the teach
     box never steps aside and nobody finds out. Asserted on the real control, not on the fixture. */
  ok(has(R.gFill, "updateAccField('" + R.gId + "', 'hoType', this.value)"),
     '§17.3 ↔ §17.2 HANDSHAKE — the dropdown writes `hoType`, the exact field §17.2 collapses on');
  /* ══ §17.4 · SPECIALIZED / ENDORSEMENT COVERAGES — CONDITIONAL REVEAL ══════════════════════════
     Authored 2026-07-25 (rows 206-213), wired 2026-08-07. Row 213 is a claim about BOTH sides of a
     conditional, so EVERY absence leg below is paired with a presence twin on a fixture where the
     thing SHOULD appear — an it-is-not-there test on its own passes just as happily on a room that
     rendered nothing at all, which is precisely how --noeducation went 129/12 with three §17.2 legs
     honestly green.
     PRECONDITION FIRST, AND NOT WRAPPED IN pick(). You may not prove a thing is absent from a
     control without first proving the control EXISTS — a vanished disclosure must RED, never green.
     A precondition that inverts under --redfirst lets an inverted run pass by doing nothing. */
  /* ══ ⭐ §13.72 · THE GESTURE MUST REACH THE SCREEN, NOT ONLY THE STORE ═══════════════════════════
     Measured live 2026-08-07: both of these dropdowns stored their value perfectly and NEITHER
     repainted, so the §17.2 teach panel never collapsed and the townhome line never appeared. The
     Captain's own smoke steps #4 and #5. Every gate in this file was green over it, honestly,
     because every one of them assigns the field and opens the modal FRESH.
     🔑 A TEST THAT SETS STATE AND THEN RE-RENDERS PROVES THE RENDERER, NEVER THE HANDLER. "The value
     saves" and "the user sees it work" are two claims on two layers, and a suite can be green on the
     first while the second is dead. These legs drive the real <select> and refuse to reopen.
     Each carries BOTH halves — what was on screen before the gesture AND after — because "the panel
     is gone" passes just as happily on a room that rendered nothing at all. */
  lines.push('===== ⭐ §13.72 · SELECT GESTURES REACH THE SCREEN (no reopen) =====');
  ok(R.gClickHoType.control === true, '§13.72 PRECONDITION — the HO-type <select> exists to be driven (why: ' + (R.gClickHoType.why || 'ok') + ')');
  ok(R.gClickPropType.control === true, '§13.72 PRECONDITION — the Property-type <select> exists to be driven (why: ' + (R.gClickPropType.why || 'ok') + ')');
  ok(R.gClickHoTypeStored === 'HO-3' && R.gClickPropTypeStored === 'Townhouse',
     '§13.72 both gestures STORE their value (the half that was never broken)');
  /* ⭐ RE-PREMISED 2026-08-07. This asserted the teach panel VANISHED on the gesture. The Captain
     ruled that deletion wrong, so the visible consequence of choosing a policy type is now the
     REPAINT ITSELF: the room re-renders and the <select> comes back carrying the chosen value.
     ⚠️ STATED PLAINLY BECAUSE IT WEAKENS A CLAIM I MADE EARLIER TODAY: with the panel no longer
     keyed to `hoType`, NOTHING VISIBLE NOW DEPENDS ON IT. Its place in updateAccField's re-render
     whitelist is kept deliberately, aimed FORWARD at bank row 195's unauthored "which fields show"
     map — the same aim-at-a-commit-that-does-not-exist-yet pattern §17.2 used. `propType` below is
     the half that is load-bearing TODAY, and it is the one that was actually broken.
     Both halves in the leg: unselected before, selected after, so it cannot pass on a dead room. */
  ok(!has(R.gClickHoType.before, '<option selected="">HO-3</option>'   /* the browser normalises `<option selected>` on parse — assert the SERVED shape, not the authored one */)
     && has(R.gClickHoType.after, '<option selected="">HO-3</option>'   /* the browser normalises `<option selected>` on parse — assert the SERVED shape, not the authored one */)
     && has(R.gClickHoType.after, 'Coverage A — Dwelling'),
     '§13.72 picking a policy type REPAINTS the room on the gesture — the select comes back carrying the choice, coverage fields intact');
  ok(has(R.gClickHoType.after, 'Homeowner policy types — HO-1 through HO-8'),
     '§13.72 …and the teach panel SURVIVES that repaint (the Captain\'s smoke: collapsed, never deleted)');
  /* propType: absent before, present and VERBATIM after. The presence half is what makes the
     absence half mean anything. */
  ok(!has(R.gClickPropType.before, 'It depends who owns the walls')
     && has(R.gClickPropType.after, 'Townhome? It depends who owns the walls — if you own the structure, look at HO-3 or HO-5; if you rent, HO-4; if a condo association owns the shell, HO-6.'),
     '§13.72 choosing Townhouse REVEALS the townhome line ON THE GESTURE, verbatim (row 192)');
  lines.push('===== §17.4 · ENDORSEMENT COVERAGES (conditional reveal) =====');
  ok(R.gEndNone.control === true, '§17.4 PRECONDITION — the endorsement disclosure EXISTS on a property (why: ' + (R.gEndNone.why || 'ok') + ')');
  ok(R.gEndOne.control === true,  '§17.4 PRECONDITION — it exists on the carried fixture too (why: ' + (R.gEndOne.why || 'ok') + ')');
  /* RE-PREMISED (§26.4 + §26.7). Replacement Cost joins and LEADS; Earthquake LEAVES, superseded by
     the three-field coverage control. Still six. The absence of Earthquake here is the de-duplication
     claim and it is asserted in the same leg as the presence of the other six, so it cannot pass on
     an empty list. */
  const END6 = ['Replacement Cost on Personal Property', 'ID Theft', 'Increased Business Property', 'Scheduled Personal Property', 'Special Computer Coverage', 'Special Personal Property'];
  ok(JSON.stringify(R.gEndNone.labels) === JSON.stringify(END6),
     '§26.4/§26.7 six endorsements in authored order — Replacement Cost leads, Earthquake is GONE (de-duped) — got ' + JSON.stringify(R.gEndNone.labels));
  /* Six hovers, verbatim. Asserted on gEndNone — i.e. on the fixture where NOTHING is carried —
     because the education must be readable BEFORE you decide, not only after you have said yes. */
  ok(has(R.gEndNone.html, 'Pays what it costs to BUY YOUR THINGS AGAIN TODAY, rather than what they were worth second-hand. Without it, a ten-year-old sofa is paid out as a ten-year-old sofa. It is one of the most commonly added upgrades and often one of the cheapest.')
     && has(R.gEndNone.html, 'This one is usually a yes-or-no on the policy rather than a dollar amount. If your policy says actual cash value on contents, this is the upgrade that changes that.'),
     '§26.4 Replacement Cost — BOTH authored hovers verbatim (the seventh the Captain listed and the bank had omitted)');
  /* ⛔ THE DE-DUPLICATION CLAIM, ASSERTED AS AN ABSENCE PAIRED WITH A PRESENCE. Row 207's endorsement
     string must be gone from the endorsement block, AND the fuller coverage control must exist to
     have replaced it — otherwise "it is not there" passes on a room that simply dropped earthquake. */
  ok(!has(R.gEndNone.html, 'Standard policies EXCLUDE earthquake; this endorsement (or a separate policy) adds it.')
     && has(R.gHazOff, 'Earthquake coverage'),
     '§26.7 DE-DUPE — row 207\'s endorsement string is GONE and the fuller Earthquake coverage control stands in its place (never both)');
  ok(has(R.gEndNone.html, 'Helps with the cost and legwork of restoring your identity after theft.'), '§17.4 ID Theft hover verbatim (row 208)');
  ok(has(R.gEndNone.html, 'Raises the low default limit on business equipment kept at home.'), '§17.4 Increased Business Property hover verbatim (row 209)');
  ok(has(R.gEndNone.html, 'Itemized high-value pieces — rings, art, instruments — insured for their appraised value above normal limits.'), '§17.4 Scheduled Personal Property hover verbatim (row 210)');
  ok(has(R.gEndNone.html, 'Broader protection for computers/electronics beyond the base personal-property limit.'), '§17.4 Special Computer Coverage hover verbatim (row 211)');
  ok(has(R.gEndNone.html, 'Upgrades belongings from named-perils to open-perils (HO-5-style breadth) via endorsement.'), '§17.4 Special Personal Property hover verbatim (row 212)');
  /* ⛔ ROW 213, THE GUARD. Both halves in one leg each, so neither can pass on a blank room. */
  ok(R.gEndNone.open === false && R.gEndOne.open === true,
     '§17.4 GUARD (row 213) — silent and CLOSED when nothing is carried, OPEN the moment something is (both halves: ' + R.gEndNone.open + ' / ' + R.gEndOne.open + ')');
  /* RE-PREMISED (§26.5): TWO fields per carried endorsement now — Coverage limit AND Annual premium.
     The Captain asked for "coverage amounts, premiums, etc." and got one box; that is closed. */
  ok(R.gEndNone.limits === 0 && R.gEndOne.limits === 2,
     '§26.5 GUARD (row 213) — ZERO fields when nothing is carried, EXACTLY TWO when one is: limit + premium (' + R.gEndNone.limits + ' / ' + R.gEndOne.limits + ')');
  ok(has(R.gEndOne.html, 'Coverage limit') && has(R.gEndOne.html, 'Annual premium'),
     '§26.5 both authored field labels render on a carried endorsement');
  ok(JSON.stringify(R.gEndOne.labels) === JSON.stringify(END6),
     '§17.4 carrying ONE endorsement hides none of the other five — the reveal is scoped, not a re-render into a stub');
  /* Row 205's blank-until-entered guard reads on §17.4 too: on an insurance figure, a blank limit and
     a limit of zero are opposite facts. Absence of "$0" is paired with presence of the em dash. */
  ok(R.gEndOne.placeholders.every(function (p) { return p === '—'; }) && R.gEndOne.placeholders.length === 2,
     '§26.5 GUARD — BOTH revealed fields ship an em-dash placeholder, never "$0" (' + JSON.stringify(R.gEndOne.placeholders) + ')');
  ok(R.gEndOne.values[0] === '$50,000' && R.gEndOne.values[1] === '$120',
     '§26.5 a recorded limit AND premium both round-trip into their own fields (' + JSON.stringify(R.gEndOne.values) + ')');
  /* 🔑 THE CLICK LEG. Measured this session: the §17.2 teach panel and the townhome branch are both
     correct on this gate's state-injection path and both DEAD on the user's path, because
     updateAccField re-renders the modal for a whitelist of fields and neither hoType nor propType is
     on it. WHEN A GATE LOOKS IS AS LOAD-BEARING AS WHAT IT ASSERTS. §17.4 rides updateAccToggle,
     which does re-render — and this leg is what proves that, rather than assuming it. */
  ok(R.gEndClick.why === '' && R.gEndClick.after !== null,
     '§17.4 PRECONDITION — the Earthquake switch exists and survives being thrown (why: ' + (R.gEndClick.why || 'ok') + ')');
  ok(R.gEndClick.stored === true, '§17.4 throwing the switch STORES the endorsement');
  ok(R.gEndClick.before.limits === 0 && R.gEndClick.after && R.gEndClick.after.limits === 2 && R.gEndClick.after.open === true,   /* §26.5: two fields per endorsement now */
     '§17.4 THE GESTURE REACHES THE RENDER — the field appears on the click itself, with NO modal re-open');
  ok(pick(!has(R.gAuto, 'Specialized / endorsement coverages'), has(R.gAuto, 'Specialized / endorsement coverages')),
     '§17.4 endorsement block ABSENT on Driveway (Grounds-only) [BITE]');

  /* ══ §17.5 · FLOOD ZONE + EARTHQUAKE SHAKING ═══════════════════════════════════════════════════
     Bank rows 214-218 + §17.5a (A324). Every leg reads a fixture driven through the REAL gesture.
     ⛔ THE GUARD-2 LEGS ARE THE POINT OF THIS BLOCK. "The band word never appears without the
     number" is the one a refactor is most likely to break, because a word on its own still looks
     perfectly fine on screen — it is the failure that would never be noticed. It gets its own
     control (--wordonly) sized to exactly that claim.
     ⛔ AND GUARD 3: sdc is refused BY MEASUREMENT, not preference — Austin returns "A", Los Angeles
     returns null, so the letter is absent precisely where the hazard is highest. That is an INVERTED
     SIGNAL, worse than blank. The Worker still returns it; nothing here may store or show it. */
  /* ══ §26.6 NFIP PANEL + §26.7 FLOOD/EARTHQUAKE AS CARRIED COVERAGES ════════════════════════════
     The lookup describes THE GROUND; these describe THE POLICY. Two layers, both shipped. */
  /* ══ §26.3 · THE PER-PROPERTY-TYPE DI BLOCKS ═══════════════════════════════════════════════════
     Bank §26a + §26c. The largest of the seven items the Captain asked for and the bank omitted —
     only the townhome line had ever been authored. Seven blocks, two trigger fields. */
  /* ══ §17.3a · THE POLICY TYPE ANNOTATES, IT DOES NOT SUPPRESS ══════════════════════════════════
     The row-195 map, authored at last, and the answer is that nothing is ever hidden. */
  lines.push('===== §17.3a · PER-FORM NOTES (annotation, not suppression) =====');
  const HN = R.gHoNotes;
  /* ⛔ GUARD 1 IS THE WHOLE SECTION AND IT IS ASSERTED ACROSS EVERY TYPE AT ONCE. Nine fields, ten
     hoType values including blank and an unlisted one — every field renders every time. A per-type
     leg could pass while one type quietly dropped a field; this cannot. */
  ok(Object.keys(HN).every(function (k) { return HN[k].allFields; }),
     '§17.3a GUARD 1 — all nine coverage fields render on EVERY policy type, blank and unlisted included (nothing is ever hidden)');
  ok(HN['HO-1'].note && has(HN['HO-1'].html, 'These cover a NAMED LIST of causes rather than everything not excluded')
     && HN['HO-2'].note, '§17.3a HO-1 / HO-2 note verbatim, on both');
  ok(has(HN['HO-4'].html, 'Renters cover: the building is your landlord’s to insure, so Coverage A — Dwelling usually reads zero or is absent on your policy.'), '§17.3a HO-4 note verbatim');
  ok(has(HN['HO-5'].html, 'so Coverage C often behaves better than the same number on an HO-3.'), '§17.3a HO-5 note verbatim');
  ok(has(HN['HO-6'].html, 'What the master policy stops covering is exactly where yours starts.'), '§17.3a HO-6 note verbatim');
  ok(has(HN['HO-7'].html, 'to what it would cost to REPLACE the home or to what it is currently WORTH'), '§17.3a HO-7 note verbatim');
  ok(has(HN['HO-8'].html, 'It generally pays ACTUAL CASH VALUE rather than replacement cost'), '§17.3a HO-8 note verbatim');
  /* ⛔ HO-3'S SILENCE IS AUTHORED, NOT AN OMISSION — paired with a type that DOES speak, so "silent"
     cannot pass on a build where the note never renders at all. */
  ok(HN['HO-3'].note === false && HN['HO-5'].note === true,
     '§17.3a HO-3 is SILENT BY DESIGN while other forms speak — the commonest case needs no caveat');
  ok(HN['BLANK'].note === false && HN['HO-99'].note === false,
     '§17.3a blank and UNLISTED policy types are silent — an unauthored form is never mapped to a nearest match');
  /* ⛔ GUARD 2: the HO-4 note SAYS Coverage A usually reads zero. It must never WRITE zero. */
  ok(HN['HO-4'].zeroWritten === false && has(HN['HO-4'].html, 'usually reads zero'),
     '§17.3a GUARD 2 — the HO-4 note says zero and NEVER writes it (row 205: a blank limit is a correct limit)');
  /* Guard 5: the note is a companion to the hovers, not a replacement. Both render together. */
  ok(has(HN['HO-4'].html, 'Should roughly equal REBUILD cost — not market price and not your mortgage.'),
     '§17.3a GUARD 5 — the §17.3 field hovers survive alongside the form note (the hover explains the FIELD, the note the FORM)');
  lines.push('===== §26.3 · PER-PROPERTY-TYPE DI BLOCKS =====');
  const T = R.gTypeDI;
  ok(has(T.sf, 'a single-family home — the case nearly every homeowners policy is written around'), '§26a Single-family block verbatim');
  /* ⛔ THE CONDO TAIL IS ASSERTED ON PURPOSE. The extractor that built these truncated this one
     block mid-word at "your unit", because U+2019 is both the closing quote and the apostrophe in
     "unit’s" — six looked perfect and one would have shipped as a sentence fragment. Asserting the
     LAST clause, not just the first, is what makes a truncation impossible to ship quietly. */
  ok(has(T.condo, 'Your property is a condo') && has(T.condo, 'worth reading once, and worth asking your agent to read with you.'),
     '§26a Condo block verbatim INCLUDING its final clause (guards the truncation class)');
  ok(has(T.town, 'there is no such thing as townhouse insurance — what you need depends on who owns the walls'), '§26a Townhouse block verbatim');
  ok(has(T.multi, 'a multi-family building') && has(T.multi, 'a policy written for the wrong occupancy can be the one that does not pay.'), '§26a Multi-family block verbatim, first clause to last');
  ok(has(T.manu, 'a manufactured or mobile home, and it has its own policy form: HO-7'), '§26a Manufactured/Mobile block verbatim');
  ok(has(T.other, 'Your property is recorded as Other') && has(T.other, 'flood and earthquake are excluded almost everywhere, whatever the building is.'),
     '§26c Other block verbatim — a REAL authored block, never a dumping ground');
  ok(has(T.land, 'land is the one case where a homeowners policy does not apply at all'), '§26a Land block verbatim');
  /* ⛔ THE TRIGGER CORRECTION, GATED. The bank first filed Land under Property type, where it could
     never have fired — Land lives on propPurpose. This leg is the reason that mistake cannot return. */
  ok(!has(T.blank, 'Your property is') && has(T.sf, 'Your property is'),
     '§26a GUARD — both fields blank renders NOTHING, while a set type renders (L47, paired)');
  ok(!has(T.purpOnly, 'Your property is'),
     '§26a GUARD — a purpose that is not Land does not summon a block on its own');
  ok(has(T.landVsSf, 'land is the one case') && !has(T.landVsSf, 'a single-family home'),
     '§26c PURPOSE OUTRANKS TYPE — a vacant lot with Single-family left in the dropdown is still a vacant lot');
  ok([T.sf, T.condo, T.town, T.multi, T.manu, T.other, T.land, T.landVsSf]
       .every(function (h) { return (h.match(/Your property is/g) || []).length === 1; }),
     '§26a GUARD — exactly ONE block renders at a time, never two');
  ok(!/hoType', 'HO-/.test(T.sf) && !/hoType', 'HO-/.test(T.condo),
     '§26a GUARD 2 — a firing block WRITES NOTHING: it never auto-selects an HO type');
  lines.push('===== §26.6 NFIP + §26.7 CARRIED COVERAGES =====');
  ok(has(R.gHazOff, 'Flood cover — how it works and where it comes from'),
     '§26.6 NFIP education panel present');
  ok(has(R.gHazOff, 'up to $250,000 on the building and $100,000 on contents for a residence'),
     '§26.6 NFIP program limits verbatim — CONFIRMED CURRENT 2026-08-07 against FEMA/floodsmart, so they ship rather than being stripped');
  ok(has(R.gHazOff, 'THIRTY-DAY WAITING PERIOD') && has(R.gHazOff, 'roughly a quarter of flood claims come from OUTSIDE high-risk zones'),
     '§26.6 the three surprises verbatim');
  ok(has(R.gHazOff, 'Flood is excluded from essentially every standard home policy') && has(R.gHazOff, 'Switch this on to record what you carry.'),
     '§26.7 flood coverage toggle hover verbatim');
  ok(has(R.gHazOff, 'its deductible is usually a PERCENTAGE of the dwelling limit rather than a flat dollar figure'),
     '§26.7 earthquake coverage toggle hover verbatim — the deductible sentence the retired endorsement never carried');
  /* Absence paired with presence, both halves in one leg: nothing revealed when neither is carried,
     all six fields when both are. */
  ok(!has(R.gHazOff, 'Flood coverage — building') && !has(R.gHazOff, 'Earthquake coverage limit')
     && has(R.gHazCover, 'Flood coverage — building') && has(R.gHazCover, 'Flood coverage — contents')
     && has(R.gHazCover, 'Annual flood premium') && has(R.gHazCover, 'Earthquake coverage limit')
     && has(R.gHazCover, 'Earthquake deductible') && has(R.gHazCover, 'Annual earthquake premium'),
     '§26.7 conditional reveal — nothing when neither is carried, all SIX fields when both are');
  ok(has(R.gHazCover, 'value="10% of Coverage A"'),
     '§26.7 the earthquake deductible accepts TEXT — a percentage of the dwelling limit survives, which a money field would silently discard');
  /* ⛔ §26.5 PREMIUM DOUBLE-COUNT GUARD. The endorsement/flood/quake premiums are NOT whole-policy
     premiums and must never be summed into the carrying total. gFill carries the five carry fields
     and no premiums, so its total is the control; this asserts the total is still exactly those five.
     A leg here is worth more than a comment: silently inflating a retirement number is the quietest
     way this section could do harm. */
  ok(has(R.gFill, '$16,800') && has(R.gFill, 'Total Annual Carrying Cost'),
     '§26.5 GUARD — the carrying total is still the SAME five fields ($16,800); endorsement premiums are displayed, never summed');
  lines.push('===== §17.5 · FLOOD (FEMA) + SHAKING (USGS) =====');
  ok(!R.g175.err, '§17.5 PRECONDITION — the fixture ran without throwing (err: ' + (R.g175.err || 'none') + ')');
  /* §13.72 — absent before the gesture, present after it, WITHOUT a modal re-open. */
  ok(!has(R.g175.before, 'EARTHQUAKE SHAKING') && !has(R.g175.before, 'FLOOD ZONE')
     && has(R.g175.both, 'EARTHQUAKE SHAKING') && has(R.g175.both, 'FLOOD ZONE'),
     '§17.5 THE GESTURE REACHES THE RENDER — silent before "Get estimate", both lines after, no re-open');
  ok(has(R.g175.both, 'Your FEMA flood zone (e.g., AE/VE = high-risk, X = lower). Standard home policies EXCLUDE flood; NFIP or private flood is separate.'),
     '§17.5 flood hover verbatim (row 215)');
  ok(has(R.g175.both, 'How hard the ground is expected to shake here in a rare, severe earthquake — a mapped USGS figure for your location, not a prediction of when. The plain-language rating is ours, not an official category. Standard home policies exclude earthquake damage; cover for it is a separate endorsement.'),
     '§17.5a "What\'s this?" verbatim — including "the plain-language rating is ours, not an official category"');
  ok(has(R.g175.both, 'There is no right answer to compare this to — it describes your ground, not your policy. If it reads moderate or higher, the earthquake endorsement above is the field worth a conversation with your agent.'),
     '§17.5a "Do I have enough?" verbatim — "worth a conversation with your agent", never "buy it" (guard 1)');
  ok(has(R.g175.both, '>1.888g<') && has(R.g175.both, '>very high shaking<'),
     '§17.5a RENDER SHAPE — {ss}g — {band} shaking, the number and the word together');
  /* ⛔ GUARD 3, BOTH ENFORCEMENT POINTS. The storage fence is the stronger of the two: sdc cannot
     reach the screen if it was never kept. Each absence is paired with the presence of ss. */
  ok(has(R.g175.storedHazard, '"ss":1.888') && !has(R.g175.storedHazard, 'sdc'),
     '§17.5a GUARD 3 — the stored hazard keeps ss and DROPS sdc entirely (' + R.g175.storedHazard + ')');
  ok(has(R.g175.both, '1.888g') && !has(R.g175.both, 'sdc') && !has(R.g175.both, 'Seismic Design'),
     '§17.5a GUARD 3 — sdc never reaches the screen, while ss does');
  /* ⛔ THE ONE FIXTURE WHERE A FALLBACK COULD ACTUALLY FIRE: ss missing, sdc present. Without this,
     every other guard-3 leg is asserting the absence of something that had no way to appear. The
     flood half is asserted PRESENT in the same breath so this cannot pass on an empty block. */
  ok(!has(R.g175.ssNullSdc, 'EARTHQUAKE SHAKING') && !has(R.g175.ssNullSdc, 'category B')
     && !has(R.g175.ssNullSdcStored, 'sdc')
     && has(R.g175.ssNullSdc, 'FLOOD ZONE'),
     '§17.5a GUARD 3 — ss MISSING + sdc PRESENT renders NO shaking field and never falls back to the letter, while the flood line still renders');
  const B175 = R.g175.bands || {};
  ok(Object.keys(B175).length === 8 && Object.keys(B175).every(function (k) { return B175[k]; }),
     '§17.5a all EIGHT authored band edges render exactly (0.10/0.25/0.49/0.50/0.99/1.00/1.49/1.50) — ' + JSON.stringify(B175));
  /* ⛔ GUARD 2 — the whole field goes when the number does. Paired with the flood half SURVIVING, or
     "no band word" would pass just as happily on a room that rendered nothing at all. */
  ok(!has(R.g175.noQuake, 'shaking') && !has(R.g175.noQuake, 'EARTHQUAKE SHAKING')
     && has(R.g175.noQuake, 'FLOOD ZONE') && has(R.g175.noQuake, '>AE'),
     '§17.5a GUARD 2 — no ss means NO band word and NO field, while the flood half survives intact');
  /* Row 218 on live data: FEMA answering "nothing mapped here" renders nothing, and is not allowed
     to take the shaking read down with it. */
  ok(!has(R.g175.floodNone, 'FLOOD ZONE')
     && has(R.g175.floodNone, '>0.053g<') && has(R.g175.floodNone, '>very low shaking<'),
     '§17.5 row 218 — an unmapped point renders NO flood line, and the shaking read survives');
  /* ⭐ THE REGRESSION LEG FOR THE DEFECT THE CAPTAIN FOUND BY CLICKING. §17.5 shipped keyed to the
     valuation's coordinates — and that response is KV-cached for 60 days, so on every address he
     had already valued it came back with none and the section stayed silent through any number of
     refreshes. Census carries the coordinates, runs on every estimate, and is never cached.
     This fixture is the real live shape: the valuation supplies NOTHING, Census supplies everything.
     🔑 A FEATURE THAT ONLY WORKS ON ADDRESSES NOBODY HAS LOOKED UP BEFORE IS A FEATURE THAT WORKS
     FOR NOBODY — the users most likely to have a saved property are the ones it failed for. */
  ok(has(R.g175.censusOnly, 'FLOOD ZONE') && has(R.g175.censusOnly, '>AE')
     && has(R.g175.censusOnly, '>0.31g<') && has(R.g175.censusOnly, '>low shaking<'),
     '§17.5 CENSUS-ONLY COORDINATES — a KV-cached valuation carrying none still renders both readings (the Captain\'s smoke defect)');
  /* Absence PAIRED inside the leg: the same run must show the block DOES appear when coordinates
     exist, or "silent without coordinates" passes perfectly on a §17.5 that was never built. */
  ok(!has(R.g175.noCoords, 'FLOOD ZONE') && !has(R.g175.noCoords, 'EARTHQUAKE SHAKING')
     && R.g175.callsWithoutCoords === 0
     && has(R.g175.both, 'FLOOD ZONE'),
     '§17.5 no coordinates -> the block is SILENT and NOT ONE lookup fires — while a fixture WITH coordinates renders (pre-Worker snapshots, not a backfill)');
  /* ══ §17.5b · THE FLOOD KEY — IT GROUPS, IT DOES NOT RANK ══════════════════════════════════════
     FEMA's zones differ by flood TYPE, not severity, so a ranked list would invent a hierarchy FEMA
     does not publish. What is published is whether a zone is a Special Flood Hazard Area. */
  const TIER = R.g175.tiers || {};
  ok(TIER['VE|COASTAL FLOODPLAIN'] === 'High risk — coastal', '§17.5b VE → High risk — coastal (' + TIER['VE|COASTAL FLOODPLAIN'] + ')');
  ok(TIER['AE|FLOODWAY'] === 'High risk', '§17.5b AE → High risk (' + TIER['AE|FLOODWAY'] + ')');
  /* ⛔ THE X SPLIT, BOTH SIDES. FEMA returns 'X' for two different tiers and only ZONE_SUBTY tells
     them apart — so this is the one place the key could quietly mis-file a home. */
  ok(TIER['X|0.2 PCT ANNUAL CHANCE FLOOD HAZARD'] === 'Moderate to low' && TIER['X|AREA OF MINIMAL FLOOD HAZARD'] === 'Minimal',
     '§17.5b the X SPLIT reads FEMA\'s own subtype — shaded X is Moderate-to-low, unshaded is Minimal (' + TIER['X|0.2 PCT ANNUAL CHANCE FLOOD HAZARD'] + ' / ' + TIER['X|AREA OF MINIMAL FLOOD HAZARD'] + ')');
  /* ⛔ NOT-MAPPED IS ITS OWN TIER AND MUST NEVER READ AS LOW. Zone D means FEMA has not studied the
     area; rendering that as reassurance is the flood version of the sdc inverted signal. */
  ok(TIER['D|UNDETERMINED RISK AREA'] === 'Not mapped', '§17.5b GUARD — D is NOT MAPPED, never "Minimal" (' + TIER['D|UNDETERMINED RISK AREA'] + ')');
  /* An X we cannot place claims NO tier — paired with the letter still rendering, so "no tier" can
     never pass on a room that dropped the flood cell entirely. */
  ok(TIER['X|SOMETHING ELSE'] === '(none)' && has(R.g175.both, 'FLOOD ZONE'),
     '§17.5b an unplaceable X claims NO tier, while the flood cell itself still renders');
  ok(has(R.g175.both, 'High-risk with wave action. Flood insurance is required with a federally-backed mortgage.'),
     '§17.5b tier note verbatim on the carried fixture');
  /* ══ §17.5c · THE FLOOD MAP ══════════════════════════════════════════════════════════════════
     Served from OUR Worker, never FEMA — the page must not learn a third-party host. */
  /* Asserted in two parts because innerHTML escapes `&` to `&amp;` inside an attribute — assert the
     SERVED shape, not the authored one (the same lesson as `<option selected="">`). */
  ok(has(R.g175.both, '/floodmap?lat=27.9775') && has(R.g175.both, 'lon=-82.829')
     && has(R.g175.both, 'rentcast-avm.dmerced1.workers.dev/floodmap')
     && !has(R.g175.both, 'hazards.fema.gov'),
     '§17.5c the map is requested from OUR Worker with the reading\'s own coordinates — hazards.fema.gov never appears in the page');
  /* ⛔ IT MUST FAIL SILENTLY. The studio half ships BEFORE the Worker route is deployed, so every one
     of these 404s until then; a broken-image icon in a retirement plan reads as a broken product. */
  ok(has(R.g175.both, "onerror=\"this.parentNode.style.display='none';\""),
     '§17.5c GUARD — a failed map REMOVES itself (the route is not deployed yet; degrading to shipped behaviour is safe)');
  /* Absence paired with presence: no coordinates means no map request at all, because a map without
     them could only ever be about somewhere else. */
  ok(!has(R.g175.noCoords, '/floodmap') && has(R.g175.both, '/floodmap'),
     '§17.5c no coordinates -> NO map request, while a fixture with them makes one');
  /* ⛔ THE REGRESSION LEG FOR A DEFECT SHIPPED TWICE. The map read `snap.coords`, which only ever
     came from the RentCast response — KV-cached 60 days and empty on any recently-valued address.
     The READINGS were moved to Census-first and THE MAP WAS NOT, so on the Captain's own screen the
     flood zone and shaking rendered and the map did not.
     🔑 FIXING ONE CONSUMER OF A VALUE IS NOT FIXING THE VALUE. censusOnly is exactly that shape: a
     cached valuation carrying nothing, Census carrying everything. The map must render from it. */
  ok(has(R.g175.censusOnly, '/floodmap?lat=27.9775'),
     '§17.5c THE MAP RENDERS FROM CENSUS COORDINATES — the cached-valuation case, where it was invisible');
  /* ⭐ THE CROSSHAIR IS EXACT BY CONSTRUCTION: the Worker builds the bbox as the point ± a fixed
     delta, so 50%/50% IS the address, not an estimate of it. Asserted with the marker's pointer
     transparency, because a marker that swallows clicks is worse than none. */
  ok(has(R.g175.both, 'left:50%; top:50%; width:26px') && has(R.g175.both, 'pointer-events:none'),
     '§17.5c the address is MARKED at the exact centre of the map, and the marker takes no clicks');
  /* ⛔ THE LINE THAT ANSWERS "MY ZONE SAYS X BUT THE MAP SHOWS AE". Unshaded Zone X is white and
     UNLABELLED by FEMA's own convention, so a reading that looks like it contradicts its own map
     will be read as a bug unless we say so. The units and datum were read off FEMA's own records
     for the panel in the Captain's screenshot, never inferred. */
  ok(has(R.g175.both, 'the white space is Zone X, which FEMA leaves unlabelled')
     && has(R.g175.both, 'in feet above the NAVD88 vertical datum'),
     '§17.5c the map note explains the unlabelled white AND what an EL figure is (feet, NAVD88 — sourced from FEMA)');
  /* §17.5b legend ORDER: best on the left, matching the shaking scale beside it. Two scales in one
     panel running opposite ways is a misreading waiting to happen. */
  ok(R.g175.both.indexOf('>Minimal<') < R.g175.both.indexOf('>High risk — coastal<')
     && R.g175.both.indexOf('>High risk — coastal<') < R.g175.both.indexOf('>Not mapped<'),
     '§17.5b legend reads BEST → WORST left to right, the same direction as the shaking scale');
  /* ⛔ "Not mapped" is OUTSIDE the sequence, not at either end of it: on the left it would read as
     the safest thing on the row, on the right as worse than a coastal V zone. */
  ok(/margin-left:10px;[^]{0,400}Not mapped/.test(R.g175.both),
     '§17.5b GUARD — "Not mapped" is set APART from the scale, never given a severity position');
  ok(has(R.g175.both, 'Read from FEMA’s National Flood Hazard Layer and the USGS seismic design maps for this address in August 2026.')
     && has(R.g175.both, 'These describe the ground your home sits on — not your policy, and not a recommendation.'),
     '§17.5b the authored citation, with the month the data was READ');
  /* ⛔ NO STAMP = NO DATE CLAIMED, gated. Absence paired with presence in one leg: the same run must
     show the dated form appearing elsewhere, or "no date" would pass on a citation that never renders. */
  ok(has(R.g175.noStamp, 'seismic design maps for this address. These describe the ground')
     && !/for this address in [A-Z][a-z]+ d{4}/.test(R.g175.noStamp)
     && has(R.g175.both, 'for this address in August 2026.'),
     '§17.5b GUARD — with no stamp the date clause is DROPPED, never filled with today (a stamp records when the DATA was read)');
  ok(pick(!has(R.gAuto, 'EARTHQUAKE SHAKING'), has(R.gAuto, 'EARTHQUAKE SHAKING')),
     '§17.5 hazard block ABSENT on Driveway (Grounds-only) [BITE]');
  ok(pick(!has(R.gAuto, 'Annual Carrying Cost'), has(R.gAuto, 'Annual Carrying Cost')), 'Carrying-cost block ABSENT on Driveway (Grounds-only, this wave) [BITE]');
  ok(Array.isArray(R.dbFeed) && R.dbFeed.some(function (x) { return x.annualCarry === 16800; }), 'Datum Builder feed hook emits annualCarry 16800');

  // ===== G2 · §1 SIGNALS + §2 HOVERS + §9 DI + §15 EDUCATION + NET-EQUITY TIE-IN =====
  lines.push('===== G2 · §1 SIGNALS + §9 DI + §15 + TIE-IN =====');
  ok(has(R.gFill, 'You have $200,000 of equity here — $500,000 in value against $300,000 of linked debt'), '§9 DI opens value→net-equity');
  ok(has(R.gFill, 'Holding it runs about $16,800/yr beyond the mortgage'), '§9 DI carrying-cost reality clause');
  ok(has(R.gFill, 'Est. Value') && has(R.gFill, 'Net Equity') && has(R.gFill, 'Loan-to-Value') && has(R.gFill, 'Annual Carrying Cost') && has(R.gFill, 'Cost-to-Value'), '§1.1-1.6 signal rows render');
  ok(has(R.gFill, '>60%<') && has(R.gFill, '3.4%'), '§1.4 LTV=60% + §1.6 Cost-to-Value=3.4%');
  ok(has(R.gFill, 'a starting point, not an appraisal. Your own number always wins'), '§2 Est. Value hover (richest, R20)');
  ok(has(R.gFill, 'separate from any loan payment'), '§2 Annual Carrying Cost hover (R24)');
  ok(has(R.gFill, 'Home equity is your value minus what you owe') && has(R.gFill, 'keeps a paid-off home affordable'), '§15 education body (R87 verbatim)');
  ok(pick(has(R.gBlank, 'Enter a value for this property'), !has(R.gBlank, 'Enter a value for this property')), 'DI empty-state prompt when no value (sourced-or-blank) [BITE]');
  ok(has(R.mLinked, 'Net Equity') && has(R.mLinked, '$200,000'), '§6b.10 tie-in — the Moat Net Equity reads Grounds value ($500k − $300k = $200k)');

  // ===== BLOCK A · §2 5 CARRYING-COST HOVERS (verbatim, sourced-or-blank) =====
  lines.push('===== BLOCK A · §2 CARRYING-COST HOVERS =====');
  ok(has(R.gFill, 'set by your local assessor. Enter your bill amount'), '§2 Property Tax hover (R25)');
  ok(has(R.gFill, 'insure the home itself against damage — separate from the mortgage'), '§2 Homeowners Insurance hover (R26)');
  ok(has(R.gFill, "about 1% of the home's value is a common rule of thumb. It's only a starting point; your own number always wins"), '§2 Maintenance hover — est./overwrite-warn (R27)');
  ok(has(R.gFill, 'dues for a homeowners or condo association, where you have one'), '§2 HOA / Condo hover (R28)');
  ok(has(R.gFill, 'keep the lights on and water running — electric, gas, water. Link an account'), '§2 Utilities hover — LINKABLE (R29)');
  ok(pick(!has(R.gAuto, 'set by your local assessor'), has(R.gAuto, 'set by your local assessor')), '§2 carrying-cost hovers ABSENT on Driveway (Grounds-only) [BITE]');

  // ===== BLOCK B · §9b PRESCRIPTIVE CROSS-SIGNAL DI (composed, sourced-or-blank, silence=nuance) =====
  lines.push('===== BLOCK B · §9b PRESCRIPTIVE DI =====');
  ok(has(R.g9bAll, "It costs about 5% of this home's value each year just to hold it — roughly $10,000/yr before any mortgage payment") && has(R.g9bAll, 'on the higher side for a home'), '§9b.1 Cost-to-Value flag (ctv 5% ≥ 4%)');
  ok(has(R.g9bAll, "you still owe a large share of the home's value (90% loan-to-value)") && has(R.g9bAll, "not a problem to fix"), '§9b.2 LTV×carrying cross (LTV 90% + ctv HIGH, normalizing)');
  ok(has(R.g9bAll, "Your net equity of $20,000 is about 2 years of this home's carrying cost"), '§9b.3 equity-vs-carrying horizon (display-derived)');
  ok(has(R.g9bAll, 'Your utilities here are entered by hand. If you link the account'), '§9b.4 utilities-link nudge (manual + has value)');
  ok((R.g9bAll.indexOf('It costs about 5%') < R.g9bAll.indexOf('large share of the home')) && (R.g9bAll.indexOf('large share of the home') < R.g9bAll.indexOf('Your net equity of $20,000')), '§9b composition order 9b.1→9b.2→9b.3');
  ok(has(R.gFill, "Your net equity of $200,000 is about 12 years"), '§9b.3 fires on gFill (eq $200k / carry $16.8k)');
  ok(pick(!has(R.gFill, 'on the higher side for a home'), has(R.gFill, 'on the higher side for a home')), '§9b.1/9b.2 SILENT below threshold (gFill ctv 3.4% / LTV 60%) [BITE]');
  ok(pick(!has(R.gNone, 'on the higher side for a home') && !has(R.gNone, 'net equity of') && !has(R.gNone, 'entered by hand'), has(R.gNone, 'net equity of')), '§9b prints NOTHING when no rule fires (no all-clear line) [BITE]');

  // ===== #244 ADDENDUM · SIGNAL-STRIP HOVERS (5 titles) + est.-title fix =====
  lines.push('===== #244 · SIGNAL-STRIP HOVERS =====');
  ok(pick(has(R.gFill, '<strong>Est. Value</strong>') && !has(R.gFill, '<strong>est.</strong>'), has(R.gFill, '<strong>est.</strong>')), 'Est. Value title fixed (est.->Est. Value, truncated gone) [BITE]');
  ok(has(R.gFill, '<strong>Linked Debt</strong>') && has(R.gFill, 'usually your mortgage'), 'Linked Debt hover (title + body)');
  ok(has(R.gFill, '<strong>Net Equity</strong>') && has(R.gFill, 'if you sold today'), 'Net Equity hover (title + body)');
  ok(has(R.gFill, '<strong>Loan-to-Value</strong>') && has(R.gFill, 'share of its value'), 'Loan-to-Value hover (title + body)');
  ok(has(R.gFill, '<strong>Cost-to-Value</strong>') && has(R.gFill, 'just to hold this home'), 'Cost-to-Value hover (title + body)');
  ok(has(R.gFill, '<strong>Carrying cost</strong>'), 'Annual Carrying Cost hover (already-green, still present)');
  // sourced-or-blank preserved — Linked Debt / LTV rows only render when debt>0 (gNone has value, no debt)
  ok(!has(R.gNone, '<strong>Linked Debt</strong>') && !has(R.gNone, '<strong>Loan-to-Value</strong>'), 'Linked Debt / LTV rows still ABSENT when no debt (hover did not force the row)');

  // ===== #249 STEP-6 · VALUATION UI (toggle-gated; range/tag/Use-button/overwrite-warn) =====
  lines.push('===== #249 STEP-6 · VALUATION UI =====');
  ok(has(R.gApiUI, 'Property Address') && has(R.gApiUI, 'Add the property address to pull an automated value estimate') && has(R.gApiUI, 'Get estimate'), 'toggle ON -> Property Address (R132 hint) + Get-estimate button');
  ok(pick(has(R.gApiResult, 'Market Range') && has(R.gApiResult, '$215,000') && has(R.gApiResult, '$291,000') && has(R.gApiResult, '$367,000'), !has(R.gApiResult, 'Market Range')), '#262 W1 low/mid/high BAND (Market Range + 3 figures) in served bytes [BITE]');
  ok(has(R.gApiResult, 'est. · via RentCast · Jul 2026') && !has(R.gApiResult, 'Estimated Market Range'), '#262 §1.4 provenance (est. · via RentCast · {date}); "Estimated" removed (est. once)');
  ok(has(R.gApiResult, 'Use the low end') && has(R.gApiResult, 'Use the middle') && has(R.gApiResult, 'Use the high end'), '#262 §1.2 three per-range accept buttons (R155/R156/R157 verbatim)');
  ok(pick(has(R.gApiResult, 'the middle is its best single guess') && has(R.gApiResult, 'in quieter areas those sales can come from the wider city'), !has(R.gApiResult, 'the middle is its best single guess')), '#262 §1.1 R154 headline hover (must-carry winner, verbatim) [BITE]');
  ok(has(R.gApiResult, 'conservative, balanced, or optimistic') && has(R.gApiResult, 'plan cautiously or generously'), '#262 §1.2 R158 pick-your-comfort hover (verbatim)');
  // #263 W3 — band without on-top labels; estimate block independent of carrying costs; explainer moved up
  ok(pick(!has(R.gApiResult, '0.08em; color:rgba(255,255,255,0.4);">Low') && has(R.gApiResult, 'Use the low end'), has(R.gApiResult, '0.08em; color:rgba(255,255,255,0.4);">Low')), '#263 item 2 — on-top Low/Middle/High labels REMOVED (buttons carry it) [BITE]');
  ok(pick(R.gApiIndependent && has(R.gApiIndependent, 'Get estimate') && has(R.gApiIndependent, 'Property Address') && !has(R.gApiIndependent, '🧾 Annual Carrying Cost'), !(R.gApiIndependent && has(R.gApiIndependent, 'Get estimate'))), '#263 item 3 — estimate block renders with "Show carrying costs" OFF (independent parent) [BITE]');
  ok(R.gFill.indexOf('Home equity is your value minus what you owe') >= 0 && R.gFill.indexOf('Home equity is your value minus what you owe') < R.gFill.indexOf('🧾 Annual Carrying Cost'), '#263 item 4 — equity explainer ABOVE the carrying-cost fields');
  ok(has(R.gApiConfirm.msg, 'a starting point, not an appraisal. Your own number always wins'), 'overwrite-warn BODY = R20 copy verbatim (never auto-overwrite)');
  ok(R.gApiConfirm.title === 'Use the estimate?', '#250 FIX2 · confirm TITLE = R134 "Use the estimate?"');
  /* ⭐ INVERTED 2026-08-08, NOT DELETED (§13.74). This asserted the literal "Keep my value", which was
     correct until §27.1 ruled that the button must NAME the user's own number so he does not have to
     remember it. From that ruling onward this leg was guarding a defect: the generic wording is now
     the thing we must never ship. The claim it makes is the SAME claim — R133's cancel button is the
     non-destructive choice and says so — but the winner has moved, so the leg follows the winner
     instead of being retired. A gate written to guard a rule must be inverted the day the rule is
     deliberately changed, or yesterday's correct guard becomes today's blocker.
     The §27.1 legs below carry the positive form; this one holds the LOSER out. */
  ok(pick(R.gApiConfirm.cancel !== 'Keep my value', R.gApiConfirm.cancel === 'Keep my value'),
     '#250 FIX2 · default button is NO LONGER the generic "Keep my value" (§27.1 inverted this) [BITE]');
  ok(/^Keep my \$[\d,]+$/.test(R.gApiConfirm.cancel || ''), '#250 FIX2 · ...it names a real recorded figure ("Keep my $<value>")');
  ok(R.gApiConfirm.ok === 'Use $291,000', '#250 FIX2 · primary button = R133 "Use $<mid>" (live mid $291,000)');
  ok(pick(!has(R.gFill, 'Property Address') && !has(R.gFill, 'Get estimate'), has(R.gFill, 'Get estimate')), 'valuation UI ABSENT when API toggle OFF (opt-in) [BITE]');
  ok(pick(has(R.gFill, "Estimate this home's value") && !has(R.gFill, 'Use value estimate (API)') && !has(R.gFill, 'OFF until key present'), has(R.gFill, 'Use value estimate (API)')), '#257.1 · toggle label = "Estimate this home\'s value" (old "(API)" + stale suffix GONE) [BITE]');
  ok(pick(has(R.gFill, "Turn this on and Datum looks up an estimated market range for this address, tagged 'est.'") && has(R.gFill, "we'll never overwrite it without asking") && !has(R.gFill, 'never in your browser') && !has(R.gFill, 'When enabled with a key'), has(R.gFill, 'never in your browser')), '#257.1 · toggle hover = R135 plain-coach (engineer "never in your browser"/"When enabled with a key" GONE) [BITE]');

  // ===== #258/#259 PART 2/3 · VERIFY-THEN-ESTIMATE + COMPS (Census proxy · $0 comps passthrough) =====
  lines.push('===== #258/#259 PART 2/3 · VERIFY + COMPS =====');
  ok(R.gApiCanonical === '1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500', 'verify writes the CANONICAL address into the hidden RentCast field');
  ok(pick(has(R.gApiResult, '<strong>Comparable sales</strong>') && has(R.gApiResult, 'Recent nearby sales the estimate leans on'), !has(R.gApiResult, 'Comparable sales')), 'R147 comps section renders on a successful estimate [BITE]');
  ok(has(R.gApiResult, '1700 Penn Ave, Washington, DC') && has(R.gApiResult, '$305,000'), 'a comp row renders (address · sale price)');
  ok(has(R.gApiResult, '3 bd') && has(R.gApiResult, '2 ba') && has(R.gApiResult, '1,800 sqft') && has(R.gApiResult, '0.3 mi'), 'comp row meta (beds/baths/sqft/distance)');
  ok(pick(has(R.gApiNoComps, 'No solid nearby sales to show yet') && !has(R.gApiNoComps, 'Comparable sales'), has(R.gApiNoComps, 'Comparable sales')), 'R148 empty-state when comps array empty (never fabricate) [BITE]');
  ok(pick(has((R.gApiNotVerified && R.gApiNotVerified.msg) || '', 'we couldn’t confirm that address'), !has((R.gApiNotVerified && R.gApiNotVerified.msg) || '', 'we couldn’t confirm that address')), 'R149 not-verified message on Census not-found [BITE]');
  ok(pick(R.gApiNotVerified && R.gApiNotVerified.fetchCalled === 0, !(R.gApiNotVerified && R.gApiNotVerified.fetchCalled === 0)), 'not-found BLOCKS the paid RentCast call (nothing paid fires) [BITE]');
  ok(pick(R.gApiVerifyErr && R.gApiVerifyErr.fetchCalled === 1 && has(R.gApiVerifyErr.result, 'Market Range'), !(R.gApiVerifyErr && R.gApiVerifyErr.fetchCalled === 1)), 'Census unreachable -> FAIL-OPEN: estimate STILL runs (real user not blocked) [BITE]');
  ok(pick(R.gApiPersist && has(R.gApiPersist.html, 'Market Range') && has(R.gApiPersist.html, 'Comparable sales') && has(R.gApiPersist.html, '1700 Penn Ave'), !(R.gApiPersist && has(R.gApiPersist.html, 'Market Range'))), '#260 estimate + comps PERSIST after "Use the estimate" (not torn down) [BITE]');
  ok(R.gApiPersist && has(R.gApiPersist.reopenHtml, 'Market Range') && has(R.gApiPersist.reopenHtml, 'Comparable sales'), '#260 estimate + comps survive a full modal close+reopen');
  ok(R.gApiPersist && (R.gApiPersist.value === '291000' || R.gApiPersist.value === 291000), '#260 accepted MIDDLE still fills the value field (no regression)');
  ok(R.gApiAcceptLow === '215000' || R.gApiAcceptLow === 215000, '#262 §1.2 accept LOW fills the low figure ($215,000)');
  ok(R.gApiAcceptHigh === '367000' || R.gApiAcceptHigh === 367000, '#262 §1.2 accept HIGH fills the high figure ($367,000)');
  ok(R.gApiVerifyErr && !has(R.gApiVerifyErr.verifyMsg || '', 'we couldn’t confirm that address'), 'fail-open does NOT show R149 (only a CONFIRMED not-found blocks)');
  ok(R.gApiVerifyErr && R.gApiVerifyErr.addr === '742 Evergreen Terrace, Springfield, IL, 62704', 'fail-open feeds the ENTERED (joined) address to RentCast');

  // ===== #258/#259 PART 1 · PROPERTY-DETAIL FIELDS (12 fields + 2 dropdowns, manual/blank, verbatim hovers) =====
  lines.push('===== #258/#259 PART 1 · PROPERTY-DETAIL FIELDS =====');
  ok(has(R.gBlank, '🏠 Property details'), 'Property details section renders (all property rooms)');
  ok(has(R.gBlank, 'A nickname just for you'), 'R136 Property name hover (verbatim)');
  ok(pick(has(R.gBlank, 'What is the purpose of this place') && !has(R.gBlank, 'purposed'), has(R.gBlank, 'purposed')), 'R137 Property purpose hover — corrected "purpose", NOT "purposed" [BITE]');
  ok(has(R.gBlank, 'the upkeep and fees behind the walls'), 'R138 Property type hover (verbatim)');
  ok(has(R.gBlank, 'a real, findable US address before we ever look up a value'), 'R139 Street address hover (verbatim)');
  ok(has(R.gBlank, 'before any value lookup runs'), 'R140 City hover (verbatim)');
  ok(has(R.gBlank, 'US only for now'), 'R141 State hover (verbatim)');
  ok(has(R.gBlank, 'sharpens the address check and the value estimate'), 'R142 ZIP hover (verbatim)');
  ok(has(R.gBlank, 'helps size up the home'), 'R143 Bedrooms hover (verbatim)');
  ok(has(R.gBlank, 'when you weigh keeping vs. downsizing later'), 'R144 Bathrooms hover (verbatim)');
  ok(has(R.gBlank, 'The finished square footage'), 'R145 Living area hover (verbatim)');
  ok(has(R.gBlank, 'Older homes can carry bigger upkeep and insurance'), 'R146 Year built hover (verbatim)');
  ok(has(R.gBlank, 'Primary residence') && has(R.gBlank, 'Rental property') && has(R.gBlank, '>Land<'), 'R150 purpose dropdown option-labels (verbatim)');
  ok(has(R.gBlank, 'Single-family') && has(R.gBlank, 'Townhouse') && has(R.gBlank, 'Manufactured'), 'R151 type dropdown option-labels (verbatim)');
  ok(has(R.gBlank, '>6+ Beds<') && has(R.gBlank, '>4+ Baths<'), 'R143/R144 beds & baths dropdown options');
  ok(has(R.gBlank, 'Select purpose…') && has(R.gBlank, 'Select type…'), 'dropdown placeholders (R150/R151)');
  // slim-mirror round-trip — the 11 detail fields survive save->slim->hydrate for a signed-in user
  ok(pick(R.slimDetails && R.slimDetails.propName === 'Lake cabin' && R.slimDetails.propPurpose === 'Rental property' && R.slimDetails.propType === 'Condo' && R.slimDetails.propStreet === '123 Main St' && R.slimDetails.propCity === 'Austin' && R.slimDetails.propState === 'TX' && R.slimDetails.propZip === '78701' && R.slimDetails.propBeds === '3 Beds' && R.slimDetails.propBaths === '2 Baths' && R.slimDetails.propSqft === '1850' && R.slimDetails.propYear === '1998',
          !(R.slimDetails && R.slimDetails.propName === 'Lake cabin')), 'all 11 detail fields SURVIVE slim-mirror round-trip (signed-in) [BITE]');
  // #261 live-smoke fixes — dark dropdowns, always-enabled Get-estimate button, live address preview sync
  ok(/var\(--bg-navy\)[^>]*'propPurpose'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propType'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propBeds'/.test(R.gBlank) && /var\(--bg-navy\)[^>]*'propBaths'/.test(R.gBlank), '#261 all 4 property dropdowns render dark (bg-navy, not white)');
  ok(pick(/id="avm-getbtn-[^>]*groundsVerifyAndEstimate/.test(R.gApiUI) && !/id="avm-getbtn-[^>]*disabled/.test(R.gApiUI), /id="avm-getbtn-[^>]*disabled/.test(R.gApiUI)), '#261 Get-estimate button ALWAYS-enabled (handler validates on click; no frozen disabled) [BITE]');
  ok(has(R.gApiUI, 'modal-avm-addrpreview-') && has(R.gBlank, '_groundsSyncAvmAddr'), '#261 live address-preview sync wired (structured fields -> preview)');

  // ===== #245 §0.2 · ASSET-SIDE REVERSE-SCOPE (property accepts ONLY Mortgage/HELOC) =====
  lines.push('===== #245 §0.2 · REVERSE-SCOPE =====');
  const rev = R.gRev || { control: false, why: 'NO_RESULT', opts: [] };
  const revOpts = rev.opts || [];
  const optHas = (frag) => revOpts.some((t) => t.indexOf(frag) >= 0);
  /* PRESENCE BEFORE EXCLUSION (house law 2026-08-02). These two are NOT pick()-wrapped: a
     precondition that inverts under --redfirst passes by doing nothing, and an inverted run that
     passes by doing nothing is void. They must hold in BOTH modes. */
  ok(rev.control === true, 'PRESENCE: the liability link control RENDERS on a property (why=' + (rev.why || 'ok') + ')');
  ok(rev.control === true && revOpts.length >= 1 && !rev.emptyState,
     'PRESENCE: the control offers at least one linkable debt — the exclusion below is not vacuous (' + revOpts.length + ' rows)');
  ok(optHas('Mortgage') || optHas('The Moat'), 'DO-NOT-BREAK: Mortgage IS offered on a property target list');
  ok(pick(optHas('HELOC') || optHas('The Cellar'), !(optHas('HELOC') || optHas('The Cellar'))), 'HELOC IS offered on a property target list (the half never exercised until 2026-08-02) [BITE]');
  ok(pick(!optHas('Auto Loan') && !optHas('Personal Loan'), optHas('Auto Loan') || optHas('Personal Loan')), 'non-mortgage debts (Auto Loan / Personal Loan) EXCLUDED from property target list [BITE]');
  ok(revOpts.length >= 1 && revOpts.every((t) => /Mortgage|HELOC|The Moat|The Cellar/.test(t)), 'property target list = Mortgage/HELOC ONLY (' + revOpts.length + ' opts); ' + JSON.stringify(revOpts));

  // ===== #244 OPEN-1 · SLIM MIRROR PRESERVES CARRYING COSTS (real-user data-loss) =====
  lines.push('===== #244 OPEN-1 · SLIM MIRROR CARRY ROUND-TRIP =====');
  ok(pick(R.slimCarry && R.slimCarry.propTaxYr === '6000' && R.slimCarry.homeInsYr === '2000' && R.slimCarry.maintYr === '4000' && R.slimCarry.hoaYr === '1200' && R.slimCarry.utilYr === '3600',
          !(R.slimCarry && R.slimCarry.propTaxYr === '6000')), 'All 5 carrying-cost fields SURVIVE slim-mirror -> hydrate round-trip [BITE]');

  // ===== #244 OPEN-2 · REVERSE-LINK / NET EQUITY (mortgage drives Net Equity + LTV) =====
  lines.push('===== #244 OPEN-2 · NET EQUITY / LTV =====');
  ok(has(R.gFill, 'Net Equity') && has(R.gFill, '$200,000'), 'Linked mortgage -> Net Equity $200,000 ($500k − $300k)');
  ok(has(R.gFill, 'Loan-to-Value') && has(R.gFill, '>60%<'), 'Linked mortgage -> Loan-to-Value 60%');
  ok(has(R.gNone, 'Net Equity') && has(R.gNone, '$300,000'), 'Unlinked home -> Net Equity = full value ($300k)');
  ok(pick(!has(R.gNone, 'Loan-to-Value'), has(R.gNone, 'Loan-to-Value')), 'Unlinked -> LTV row CLEARS (sourced-or-blank, L47) [BITE]');
  ok(has(R.mLinked, 'Net Equity (Asset — Debt)'), 'Debt-side property* link-scope live (Moat reads Grounds value)');

  // ===== §9c · VALUE-MISSING NUDGE (carry entered, no value) — 3-condition DoD =====
  lines.push('===== §9c · VALUE-MISSING NUDGE =====');
  // (1) value=0 + carry entered -> §9c nudge present AND §9b strings absent
  ok(pick(has(R.gNudge, "You've got the carrying costs in — that's the hard part"), !has(R.gNudge, "You've got the carrying costs in")), '§9c nudge PRESENT when carry>0 & value=0 [BITE]');
  ok(has(R.gNudge, 'add it in from the Estate screen') && has(R.gNudge, 'your own number always wins'), '§9c nudge full copy (Estate-screen + own-number-wins)');
  ok(!has(R.gNudge, 'Your net equity of') && !has(R.gNudge, 'It costs about') && !has(R.gNudge, 'entered by hand'), '§9/§9b correctly SILENT when value=0 (guard holds)');
  // (2) value entered -> §9b present AND §9c nudge GONE
  ok(has(R.gFill, 'Your net equity of $200,000'), '§9b PRESENT when value entered (gFill)');
  ok(pick(!has(R.gFill, "You've got the carrying costs in"), has(R.gFill, "You've got the carrying costs in")), '§9c nudge GONE when value entered [BITE]');
  // (3) blank room (no value, no carry) -> _GROUNDS_DI_EMPTY still shows
  ok(has(R.gBlank, 'Enter a value for this property'), '_GROUNDS_DI_EMPTY still shows for a truly-blank room');
  ok(!has(R.gBlank, "You've got the carrying costs in"), '§9c does NOT fire on a blank room (needs carry>0)');

  // ===== FIX #242 · SERVED-BYTES on a string-valued (restored-blueprint) home =====
  lines.push('===== FIX #242 · SERVED-BYTES (string value) =====');
  ok(pick(has(R.gStr, "Your net equity of $400,000 is about 40 years of this home's carrying cost"), !has(R.gStr, 'Your net equity of $400,000')), 'SERVED: §9b.3 renders on a string-valued home (was silenced live) [BITE]');
  ok(has(R.gStr, 'Your utilities here are entered by hand. If you link the account'), 'SERVED: §9b.4 utilities-link nudge on a string-valued home');
  ok(has(R.gStr, "This property is worth $400,000, with no debt linked against it — that's $400,000 of equity"), 'SERVED: §9 also revived (val no longer parses to 0)');

  // ===== G3 · §6/§6b VALUATION GUARDRAIL (hard-cap · BYO-key · de-dupe · key OFF, no browser key) =====
  lines.push('===== G3 · §6/§6b VALUATION GUARDRAIL =====');
  ok(R.ai && R.ai.present, 'Asset-Intelligence layer present (provider-agnostic seam)');
  ok(R.ai && R.ai.disabled === 'disabled', '§5 toggle OFF (default) → request issues NO call');
  ok(R.ai && R.ai.permitted === 'stubbed', 'calls 1–50 permitted on Datum key (stubbed — no network)');
  ok(pick(R.ai && R.ai.call51 === 'capped', R.ai && R.ai.call51 !== 'capped'), 'call #51 CAPPED on Datum key (hard-cap 50/mo) [BITE]');
  ok(R.ai && R.ai.countAtCap === 50, 'counter stays at 50 (no bump on the capped call)');
  ok(R.ai && R.ai.byo === 'stubbed', 'BYO-key is the ONLY path past the cap (paid usage = user key)');
  ok(R.ai && R.ai.dedupe === 'cached', 'de-dupe: a cached asset returns without a new call');
  ok(pick(R.ai && R.ai.browserKey === false, !(R.ai && R.ai.browserKey === false)), 'NO API key literal in browser bytes (key = Worker secret) [BITE]');
  ok(has(R.gFill, "Estimate this home's value"), '§5 value-estimate toggle rendered (R135 label)');

  /* ══ §27 · THE CAPTAIN'S SMOKE-DRIVEN REQUESTS (bank A342) ═══════════════════════════════════
     PRESENCE BEFORE EXCLUSION, in both value states — every "the button says X" leg below is void
     unless the dialog actually OPENED, and the blank case is the one where it used to not. These
     two are deliberately NOT wrapped in pick(): a precondition that inverts under --redfirst would
     let an inverted run pass by doing nothing. */
  ok(R.p27 && R.p27.dWith && R.p27.dWith.shown === true, '§27.1 [PRESENCE] the estimate dialog opens when a value EXISTS');
  ok(R.p27 && R.p27.dNone && R.p27.dNone.shown === true, '§27.1 [PRESENCE] the estimate dialog opens when NO value exists (it used to be skipped entirely)');

  // §27.1a — the choice names his own number, so he does not have to remember it.
  ok(pick(R.p27 && R.p27.dWith.cancel === 'Keep my $300,000', !(R.p27 && R.p27.dWith.cancel === 'Keep my $300,000')),
     '§27.1 the keep button NAMES the recorded value ("Keep my $300,000") [BITE]');
  ok(R.p27 && R.p27.dWith.ok === 'Use $341,000', '§27.1 the other button still names the estimate (unchanged)');

  /* §27.1b — L47 AT THE BUTTON LEVEL. The two absence legs are the point of the request: with no
     value there is nothing to keep, and "$0" would be an invented number. Paired with the presence
     leg above so neither can pass on a dialog that never opened. */
  ok(pick(R.p27 && R.p27.dNone.cancel === 'Leave it blank', !(R.p27 && R.p27.dNone.cancel === 'Leave it blank')),
     '§27.1 with NO value the button reads "Leave it blank" [BITE]');
  ok(R.p27 && R.p27.dNone.cancel.indexOf('Keep my') < 0, '§27.1 and it never offers to KEEP a value that does not exist');
  ok(R.p27 && R.p27.dNone.cancel.indexOf('$0') < 0, '§27.1 and it never invents "$0" (an empty field is a state, not a zero)');

  // §27.1c — the supporting line, and its silence when a value exists.
  ok(pick(R.p27 && R.p27.dNone.note === 'You have not recorded a value for this property yet.' && R.p27.dNone.noteShown === true,
          !(R.p27 && R.p27.dNone.noteShown === true)),
     '§27.1 the blank case carries its supporting line, VISIBLE [BITE]');
  ok(R.p27 && R.p27.dWith.noteShown === false, '§27.1 and the line is SILENT when a value exists (the button already says it)');

  /* §27.1d — THE GUARD. The R20 prompt describes the RULE, not this instance, so it is byte-identical
     in both states. A request to change the buttons is not a licence to reword the sentence above them. */
  const R20 = 'An automated estimate from recent nearby sales — a starting point, not an appraisal. Your own number always wins.';
  ok(R.p27 && R.p27.dWith.msg === R20 && R.p27.dNone.msg === R20, '§27.1 the R20 prompt is UNCHANGED and identical in both states');
  ok(R.p27 && R.p27.dNone.focused === 'bc-cancel', '§27.1 focus rests on the non-destructive button in the blank case too');

  // ── §27.2 · the modal window onto acc.value ──
  /* ⭐ THE LEG THAT ENCODES THE CAPTAIN'S SECOND LOOK. Both fixtures leave useValueApi OFF, so this
     is not merely "the field exists" — it is "the field exists WITHOUT the estimate toggle", which
     is the difference between answering §27.2 and appearing to. If anyone ever moves it back inside
     the valuation block, this is the leg that says so. */
  ok(R.p27 && R.p27.fieldWith.present === true, '§27.2 [PRESENCE] the modal carries a Property value field with the estimate toggle OFF');
  ok(R.p27 && R.p27.fieldNone.present === true, '§27.2 [PRESENCE] ...on a property with no value recorded, too');
  ok(pick(/propval-field/.test((R.p27 && R.p27.fieldWith.cls) || ''), !/propval-field/.test((R.p27 && R.p27.fieldWith.cls) || '')),
     '§27.2 it carries its own emphasis styling, not the generic field face [BITE]');
  ok(pick(R.p27 && R.p27.fieldWith.value === '$300,000', !(R.p27 && R.p27.fieldWith.value === '$300,000')),
     '§27.2 it shows the recorded value, currency-marked [BITE]');
  ok(R.p27 && /curr-format/.test(R.p27.fieldWith.cls), '§27.2 it reuses curr-format (§21.3 letter refusal), not a fork');
  ok(has(R.p27 && R.p27.html, 'Property value'), '§27.2 the authored label renders');
  ok(pick(has(R.p27 && R.p27.html, 'change it in either place and both update'),
          !has(R.p27 && R.p27.html, 'change it in either place and both update')),
     '§27.2 the hover carries the two-way sentence the bank authored [BITE]');

  /* §27.2b — BLANK, NEVER $0. Same distinction §27.1 turns on: a field with nothing in it is not a
     field with zero in it, and a currency mark over an unrecorded value is a fabricated figure. */
  ok(pick(R.p27 && R.p27.fieldNone.value === '', !(R.p27 && R.p27.fieldNone.value === '')),
     '§27.2 with no value the field is BLANK, not "$0" [BITE]');

  /* §27.2c — THE MIRROR, BOTH DIRECTIONS. The hover makes a promise about behaviour; these legs are
     the only thing that can hold it to it. One direction passing is not the claim. */
  ok(R.p27 && R.p27.mirror.control === true, '§27.2 [PRESENCE] the mirror fixture found the modal input to drive');
  ok(pick(R.p27 && R.p27.mirror.storedAfterModal === 450000, !(R.p27 && R.p27.mirror.storedAfterModal === 450000)),
     '§27.2 typing in the MODAL writes the one shared value [BITE]');
  ok(pick(R.p27 && R.p27.mirror.cardAfter === '$450,000', !(R.p27 && R.p27.mirror.cardAfter === '$450,000')),
     '§27.2 ...and the CARD window updates to match [BITE]');
  ok(pick(R.p27 && R.p27.mirror.modalAfter === '$525,000', !(R.p27 && R.p27.mirror.modalAfter === '$525,000')),
     '§27.2 ...and a write from the card side updates the MODAL window [BITE]');

  lines.push('-------------------------------------');
  const overall = fail === 0 ? 'GREEN' : 'RED';
  /* A POISONED RUN MUST NAME ITS MUTATION — a run that prints CLEAN over a mutated file is the
     shape that lets a dead control read as a live one. */
  /* ⚠️ THIS NAMED ONLY TWO OF THE SIXTEEN MUTATIONS. Every other control ran and printed "CLEAN",
     which is precisely the shape this comment warns about — a poisoned run that reads unpoisoned.
     Built from the flags themselves now, so a new control cannot be added without being named. */
  const MUTS = [[NOHELOC,'noheloc'],[NOCTRL,'nocontrol'],[FLATCARRY,'flatcarry'],[NOEDUC,'noeduc'],
    [NOCOV,'nocov'],[WRONGFLD,'wrongfld'],[ZEROPLACE,'zeroplace'],[NOENDORSE,'noendorse'],
    [EAGERFIELDS,'eagerfields'],[DEAFSWITCH,'deafswitch'],[DEAFSELECT,'deafselect'],[NOHAZARD,'nohazard'],
    [WORDONLY,'wordonly'],[SDCFALLBACK,'sdcfallback'],[NOTYPEDI,'notypedi'],[TYPEFALLBACK,'typefallback'],
    [HO3NOTE,'ho3note'],[HIDEFIELD,'hidefield'],[SKIPBLANK,'skipblank'],[FORKVALUE,'forkvalue']]
    .filter(function (m) { return m[0]; }).map(function (m) { return m[1]; });
  const TAG = MUTS.length ? 'MUTATED[' + MUTS.join('+') + ']' : (RF ? 'RED-FIRST' : 'CLEAN');
  lines.push('MODE: ' + (RF ? 'RED-FIRST (winners flipped to losers — MUST be RED)' : 'NORMAL') + '   |   FILE: ' + TAG + '   |   STAGE: G10 (+ #250 fixes) — WHOLE ROOM');
  lines.push('OVERALL: ' + overall + '   (' + pass + ' pass / ' + fail + ' fail)');
  const caps = [R.gBlank, R.gFill, R.gAuto, R.mLinked, R.g9bAll, R.gNone, R.gStr, R.gNudge, R.gApiUI, R.gApiResult];
  const guard = caps.every(s => !has(s, 'undefined') && !has(s, 'NaN') && !has(s, '__'));
  lines.push('render-guard (no undefined/NaN/__): ' + guard);
  if (!guard) fail++;

  const summary = '[' + LABEL + '] GROUNDS WINNER GATE — ' + overall + ' (' + pass + '/' + (pass + fail) + ')\n' + lines.join('\n') + '\n';
  fs.mkdirSync(__dirname + '/.gate-out', { recursive: true });
  fs.writeFileSync(__dirname + '/.gate-out/_gate_grounds_winners.out.txt', summary, 'utf8');
  console.log(summary);
  if (RF && fail === 0) { console.error('\u274c RED-FIRST INERT (inverted-dead) \u2014 winners were flipped and the gate still passed ' + pass + '/0. This control proves nothing; re-ground its pick() winners.'); process.exit(1); }
  if (MUT) {
    console.log(fail > 0
      ? 'RED-FIRST OK \u2014 the mutation BIT (' + fail + ' red).'
      : 'RED-FIRST FAILED \u2014 the poison landed and nothing noticed.');
    if (NOCTRL) {
      /* The whole point of --nocontrol: the PRESENCE assertions must be among the reds. If the
         control is gone and presence still reads green, the house law is not actually wired. */
      const presenceRed = lines.some((l) => l.indexOf('FAIL PRESENCE:') === 0);
      console.log(presenceRed
        ? 'PRESENCE LAW OK \u2014 a vanished control RED itself.'
        : '\u274c PRESENCE LAW DEAD \u2014 the control was removed and PRESENCE still passed.');
      if (!presenceRed) process.exit(1);
    }
  }
  process.exit(fail === 0 ? 0 : 1);
})();
