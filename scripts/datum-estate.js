/* DatumFI · Estate renderer — S2.3 extraction of _updateSVGsCoreImpl Block C
   (the SVG drawing pass). PURE DRAW into ctx.svgContainer — no hub writes, nothing global
   out (LOCK-3). Closure severed via an explicit ctx; a missing field surfaces in the parity
   gate. Block C moved BYTE-FOR-BYTE except 3 mechanical host rewrites:
     document.getElementById('ch-machine')  -> ctx.machineEl
     document.getElementById('spend-input') -> ctx.spendInputEl
     state.accounts.forEach(...)            -> ctx.accounts.forEach(...)
   Loaded as a SEPARATE deferred module (WATCH-A) — never inlined into studio.html. */
(function () {
  'use strict';

  // S2.5 (Dispatch A Task 3) — fill is BINARY: a typed value fills the room completely; $0 stays an
  // empty room. The concave FILL_K/floor/cap scaling is retired (a room either holds capital or it
  // doesn't). The descriptor still carries fillPct; the --weight wall driver and the §16.2-iii
  // descriptor surface are unchanged.
  function fillPct(v) { return v > 0 ? 100 : 0; }

  /* ── §19.1 / §12.1 ROOM NAMES · THE CAPABILITY CHECK POINTS THE OTHER WAY ────────────────────────
     §13.55 — A MAP THAT TWO FILES READ LIVES IN THE FILE THAT CANNOT GO STALE. The maps live in
     studio.html, which is HTML and uncached; THIS file is JS and caches FOUR HOURS at the edge. So the
     staleness is on OUR side of the seam, and the check runs here rather than in the host: the host
     has nothing to branch on, because its own surfaces (the account list, the modals) are correct
     whether or not this renderer is current. Adding a `supportsRoomNames` flag to the export would be
     a flag nobody reads — decoration, which the note at the foot of this file explicitly forbids. Same
     SHAPE as supportsSatellites (named export, guarded read, documented fallback), opposite DIRECTION.

     The fallback is the whole safety argument: an old cached copy of this file simply never calls
     these, and every tile draws base.meta exactly as it drew yesterday. Degrading to the behaviour
     already shipped is safe; drawing a half-applied rename never is. */
  function _roomNameOf(acc, base) {
    var M = window.DatumRoomNames;
    return (M && typeof M.roomName === 'function') ? M.roomName(acc, base) : String((base && base.meta) || '');
  }
  function _combinedNameOf(acc) {
    var M = window.DatumRoomNames;
    return (M && typeof M.combinedName === 'function') ? M.combinedName(acc) : 'The Yard';
  }

  /* ══ §24 · A DOOR THAT DOES NOT OPEN IS A WALL WITH WRITING ON IT ═══════════════════════════════
   * THE DEFECT THIS CLOSES, AND IT WAS TWO DEFECTS. The satellite "+N more properties" stack has been
   * UNCLICKABLE SINCE THE DAY IT SHIPPED — not a broken handler, NO handler — and §22.7's column tile
   * was born the same way this evening, because the spec said "a door" and never said "it opens".
   * The Captain found both in ten seconds by clicking them. ⛔ NO GATE CLICKS ANYTHING, which is why
   * a dead affordance is invisible to the entire suite: the instrument only ever reads the drawing.
   * 🔑 COPY THAT DESCRIBES HIDDEN CONTENT IS A PROMISE OF AN AFFORDANCE. "+2 MORE ROOMS IN THIS
   *    COLUMN" is a sentence that invites a click; shipping it without one is an advertisement for a
   *    door that isn't there.
   *
   * WHY A NEW SURFACE RATHER THAN THE EXISTING PICKER (L48 measured, not assumed). studio.html's
   * `room-picker` is the ADD-ACCOUNT flow: choosing an entry runs `state.accounts.push({...})`. It is
   * a TYPE chooser that CREATES; §24 needs an INSTANCE chooser that REVEALS. Those are opposite
   * operations sharing a word, and bending one into the other risks the worst possible mis-wire —
   * adding an account when the user asked to look at one. Reported and refused rather than forced.
   *
   * ⛔ NO NEW acc.* FIELD anywhere in this arc, so we stay inside the proven-safe rollback envelope
   * (a rollback across a schema change is not proven safe, and we have no schema-version story).
   *
   * ══ §25.3 · THE DOOR OPENED ONTO THE WRONG SIDE — AND THE FIX IS A SUBTRACTION ═════════════════
   * ~~"DISPLACEMENT IS SWAP, NOT GROW ... Captain ruled the LAST DRAWN SLOT is the one displaced."~~
   * ⛔ STRUCK 2026-08-11, MEASURED BY A REAL CLICK. §24 shipped `_revealOrder` / `_revealFold` /
   * `_applyReveal`: picking a room SWAPPED it into the drawn set and folded whatever it displaced.
   * That was a faithful build of the spec and the spec was wrong, TWO ways:
   *   A · THE VERB. A user who opens a door and picks a room expects to BE IN THAT ROOM. He was
   *       instead returned to the canvas and asked to go find it.
   *   B · WORSE — THE ESTATE BECAME NON-DETERMINISTIC. Because a pick swapped, the folded set was a
   *       different pair on every open. A house whose rooms move when you look at them is not a
   *       blueprint, it is a shuffle, and no user can build a mental model of it.
   * 🔑 THE FIX DELETES THE QUESTIONS THE CODE WAS RAISING. No displaced room, so §24's "which slot
   *    gets displaced" question does not need answering; the band arithmetic is never re-run, so
   *    §22.6's no-overflow guarantee holds BY CONSTRUCTION rather than by care.
   * ✅ AND IT IS REVERTIBLE WITHOUT CEREMONY: `_applyReveal` returned its input untouched whenever
   *    `_revealOrder` was empty, which it ALWAYS is on load — so removing it is a provable no-op on
   *    a cold paint. It only ever changed the picture AFTER a pick.
   *
   * ⭐ "THE SAME MODAL AS THE TILE" IS A PROMISE ABOUT A BRANCH, NOT ABOUT A FUNCTION NAME. A
   * satellite carrying liens opens THE YARD (the combined room); everything else opens its account
   * modal. A picker that always called openAccountModal would have opened the WRONG DOOR for exactly
   * the properties most likely to be folded — the mortgaged ones — and it would have looked like it
   * worked. So the branch lives HERE, in one function, and the tile and the picker both ask it.
   * ⛔ NEVER re-derive this branch at a call site: two sites that must always agree are a
   * hand-maintained list of two, which is the same rot as any other duplicated pair. */
  function _roomModalFor(acc, merged) { return merged ? 'openYardModal' : 'openAccountModal'; }

  /* Is a room modal currently stacked ABOVE the picker? The picker sits at z-index 4000; the account
     modal is 10005 and The Yard is 10020, so a room visually REPLACES the picker without destroying
     it — you go up, step into a room, step back out onto the landing. ⛔ THIS PREDICATE IS THE
     ESCAPE FIX AND IT IS NOT OPTIONAL: the picker's keydown is registered in the CAPTURE phase and
     the account modal has NO Escape handler of its own, so without this, Escape inside an open room
     would close the second floor out from under it. Escape closes the topmost thing only. */
  function _roomModalOpen() {
    var ids = ['account-modal-overlay', 'yard-modal-overlay'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      try { if (window.getComputedStyle(el).display !== 'none') return true; } catch (e) {}
    }
    return false;
  }

  function _foldMoney(v) {
    var n = Math.abs(parseFloat(v) || 0);
    if (!n) return '';                                     // L47 sourced-or-blank — a blank is never $0
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
    return '$' + Math.round(n);
  }

  /* ── THE LIEN HELPERS · MOVED HERE FROM RENDER SCOPE FOR §25.4 ────────────────────────────────
   * ⚠️ THIS MOVE IS WHY A CAUGHT BUG EXISTS TO REPORT. _roomTileSVG below is module-scope so the
   * picker can call it, but these six lived INSIDE the render function — so the extracted emitter
   * threw a ReferenceError the instant it hit a room carrying a lien. ⛔ AND ALL FOUR ESTATE GATES
   * WERE GREEN WITH THAT BREAK IN PLACE: not one fixture builds a COLUMN room with a merged lien.
   * It was caught by an old-vs-new render diff, not by the suite. 🔑 A REFACTOR'S BLAST RADIUS IS
   * THE SET OF SCOPES IT CROSSES, AND SCOPE IS INVISIBLE IN A DIFF THAT ONLY SHOWS CHANGED LINES.
   * All six are PURE (arguments + getBaseType), so this is a move, not a rewrite. */
  function _lienSum(debts) { var s = 0; for (var i = 0; i < debts.length; i++) { var v = parseFloat(debts[i].value) || 0; if (v > 0) s += v; } return s; }
  function _netEquityOf(assetVal, debts) { return (parseFloat(assetVal) || 0) - _lienSum(debts); }
  function _lienMetaSuffix(debts) { var o = ''; for (var i = 0; i < debts.length; i++) { o += ' / ' + getBaseType(debts[i].baseId).meta.toUpperCase(); } return o; }
  // §18.6 mirror notice — TYPE-first (decision 1: math-facing copy names the type, never the brand), sourced.
  // The estate LABEL keeps its brand flavor; this hover, which explains the net-equity math, says "mortgage"/"HELOC".
  function _lienMirrorNotice(debts, assetNoun) {
    /* ── §3c.1 · THE AUTO LOAN GETS ITS OWN LEAD — AND IT WAS FOUND BY RENDERING THE FALLBACK ──────
     * The mortgage and the HELOC have always had named leads. The auto loan never did, and nobody
     * noticed for one reason: EVERY FIXTURE IN THE REPO WAS A MORTGAGE OR A HELOC, so the generic
     * branch below had NEVER ONCE BEEN PAINTED. `_gate_estate_lien_net_equity` rendered it for the
     * first time on 2026-08-12 and the missing sentence became visible within hours.
     * 🔑 AN UNRENDERED FALLBACK IS AN UNTESTED PROMISE — AND SOMETIMES IT IS A MISSING SENTENCE.
     *
     * ⛔ THE GENERIC LEAD STAYS, AND IT MUST STAY REACHABLE. It is the honest degrade for any future
     * liability with no named lead — and it is reachable TODAY, not theoretically: `_securedLinkScope`
     * gives personal loans and revolving debt the broad physical scope, so either linked to a Vehicle
     * lands here. That path is now pinned by its own scene (A5) rather than left to be re-discovered.
     * ⛔ DO NOT DELETE THIS BRANCH JUST BECAUSE THE AUTO CASE FINALLY HAS A NAME. */
    var hasM = false, hasH = false, hasA = false;
    for (var i = 0; i < debts.length; i++) {
      var id = String((getBaseType(debts[i].baseId) || {}).id || '');
      if (id.indexOf('mortgage') === 0) hasM = true;
      else if (id.indexOf('heloc') === 0) hasH = true;
      else if (id.indexOf('auto_debt') === 0) hasA = true;
    }
    /* AUTHORED VERBATIM (L47), `Auto Loan Copy Bank` §3c.1. Ranked below the two secured-property
       leads for the same reason `_lienRankE` ranks them first: on a mixed asset the senior lien is
       the one the sentence should name. */
    /* ⚠️ 'auto loan' -> 'vehicle loan' ON THE CAPTAIN'S DIRECT RULING, 2026-08-13, AND FLAGGED FOR
       BANK SYNC RATHER THAN DONE QUIETLY. The room this sentence names was renamed Auto Loan ->
       Vehicle Loan in the same smoke; his words: "having the room say vehicle while the sentence
       says auto loan no longer makes sense." He is sole GO on naming, so this is HIS NAME being
       applied inside an authored sentence — the same swap already ratified for property -> vehicle
       at the link label — NOT the Wirer rewriting voice.
       ⛔ THE BANK IS NOW BEHIND THE PRODUCT ON THIS LINE. `Auto Loan Copy Bank` §3c.1 still reads
       "Your auto loan is linked here". The Architect owns reconciling it; until then the bank and
       the live string DISAGREE, and that is recorded here so nobody "restores" the bank version. */
    var lead = hasM ? 'Your mortgage is linked here'
             : (hasH ? 'Your HELOC is linked here'
             : (hasA ? 'Your vehicle loan is linked here' : 'A linked liability sits here'));
    var out = '🔗 ' + lead + ' — its balance is subtracted from this ' + (assetNoun || 'asset') + '’s value to show your true equity.';
    if (hasM && hasH) out += ' Your HELOC is linked here too.';
    return out;
  }
  function _linkChipSVG(x, y, notice) { return '<g class="link-chip" style="cursor:help;"><title>' + String(notice).replace(/</g, '&lt;') + '</title><rect x="' + x + '" y="' + y + '" width="26" height="20" rx="4" fill="rgba(93,202,165,0.12)" stroke="var(--teal-mid)" stroke-width="1"/><text x="' + (x + 13) + '" y="' + (y + 14) + '" text-anchor="middle" style="font-size:12px; fill:var(--teal-mid);">🔗</text></g>'; }
  /* §22.5's label clamp, hoisted for §25.7 (the multi-column second floor needs it too).
     ⚠️ AND THE HONEST LIMIT, FLAGGED NOT HIDDEN: past ~28 characters the 8px floor binds and the
     label will still overrun. Nothing here wraps text. This clamp does not silently rescue a name
     that cannot fit — it stops the sizes that CAN fit from being blown up past fitting. */
  function _fitPxShared(str, px, boxW) {
    var per = 0.75;                                  // measured, mono + letter-spacing
    /* PAD IS NOT DECORATION. Sizing to exactly boxW left the label 1.3 units over its edge, because
       getComputedTextLength (what the 0.75 factor reproduces) is slightly NARROWER than the painted
       bbox — the trailing letter-space and glyph overhang are real ink the metric does not count. */
    var maxPx = (boxW - 6) / (Math.max(1, String(str).length) * per);
    return Math.max(8, Math.min(px, maxPx));
  }
  /* ── §26 · THE TYPE SCALES WITH THE TILE — HEIGHT **AND** WIDTH, TOGETHER OR NEITHER ──────────
   * ⛔⛔ THE ARCHITECT'S CONDITION, ON THE FACE OF THE HELPER WHERE IT CANNOT BE MISSED:
   *     A SCALING LAW THAT CONSULTS ONE DIMENSION IS NOT A SCALING LAW.
   * §22's satellite donor was promoted ONLY as a pair (_sRatio height + _fitPx width) precisely
   * because the version that consulted height alone shipped a defect. Anyone tempted to use one of
   * these without the other is re-creating that bug with a different constant.
   *
   * ⭐ WHY THIS EXISTS AT ALL — IT IS A LIVE-DEFECT FIX, NOT POLISH. §22.7 recorded the text stack
   * as 62.5 units by ADDING 14 + 32 and calling the sum a measurement. MEASURED with getBBox() on
   * real ink it is 77.6, so `_COL_CAP = 11` (750/11 = 68.2 per slot) has been spilling its dollar
   * figure ~4.7 units past the bottom edge of every room box SINCE IT SHIPPED, on the live canvas,
   * unreported. The second floor shipped tonight does the same at 5+ rooms (73.0 available, 1.5
   * over). 🔑 A GUESSED CONSTANT DOES NOT FAIL LOUDLY — IT FAILS BY 4.7 UNITS AND WAITS.
   *
   * ⛔ RULED BY THE ARCHITECT: SCALE THE TYPE, KEEP EVERY ROOM, THE CAP DOES NOT MOVE. Lowering the
   * cap to cure an overflow would take two rooms off the first floor and hide them behind a door —
   * curing a typographic problem by creating a data-access one, which is the exact trade §24/§25
   * just spent four prompts undoing. A THIN ROOM YOU CAN SEE BEATS A MISSING ROOM YOU CANNOT.
   *
   * THE CONSTANTS, BOTH MEASURED, NEITHER ADDED:
   *   77.6 — ink half-extent below tile centre is 38.8 (value baseline cy+30, 32px italic serif);
   *          a CENTRED tile therefore needs 2 x 38.8. Confirmed on five independent (count,
   *          overflow) pairs across two wings, agreeing to 0.05.
   *      6 — the same pad _fitPxShared already applies on width, for the same reason: the painted
   *          bbox is wider/taller than the metric, so fitting to the metric alone puts the ink just
   *          past the line. ⛔ IT IS ALSO WHAT KEEPS THIS OFF A ZERO-MARGIN FIT — scaling to exactly
   *          77.6 would land the ink precisely on the edge, and a constraint satisfied with zero
   *          margin is one the next unrelated rounding change breaks.
   * At scale 1 the output is byte-identical to today, so a tile with room to spare does not move. */
  var _TEXT_STACK = 77.6, _TEXT_PAD = 6;
  function _tileTypeScale(h) { return Math.min(1, Math.max(0.1, (h - _TEXT_PAD) / _TEXT_STACK)); }

  function _eqStr(v) {   // NET EQUITY display string (asset - debt); mirrors the room value format
    var n = Math.abs(v);
    var s = n >= 1000000 ? '$' + (n / 1000000).toFixed(2) + 'M' : (n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + Math.round(n));
    return v < 0 ? '-' + s : s;
  }

  /* ── §25.4 · ONE ROOM-TILE EMITTER, SO THE SECOND FLOOR IS DRAWN BY THE FIRST FLOOR'S OWN CODE ──
   * Captain: "it would be nice if it somewhat appeared to be a 2nd floor of this house ... how those
   * two rooms would appear if they were the only rooms I had built on the first floor." A list of
   * names is a DIRECTORY; a drawn floor is the PRODUCT. §13.92 says the canvas is the product, and
   * the moment a room went upstairs it stopped being drawn and became a table row — we were asking
   * the user to trust that upstairs rooms are real while rendering them as text.
   *
   * ⛔ EXTRACTED, NOT FORKED (L48). This was inline inside the column loop and nowhere else, so a
   * second copy in the picker would have been the "four implementations that agree look like a
   * convention" trap. It is now ONE function with TWO callers.
   *
   * ⭐⭐ THE NAMED RISK, AND IT IS DISARMED BY STRUCTURE RATHER THAN BY A FLAG. A picker tile that
   * leaked into `roomRects` would put a WALL on the first floor for a room that is not there; one
   * that leaked into `descriptors` would put a CORRIDOR. Both are the "a line pointing at nothing"
   * class and both are WORSE THAN NO DRAWN FLOOR AT ALL. ⛔ So those pushes were deliberately left
   * OUTSIDE this function, in the column loop that owns them. A picker tile cannot reach them — not
   * because a flag says skip, but because the code that does it is not in here. A flag can be wrong;
   * a function that does not contain the statement cannot execute it.
   *
   * ⚠️ MEASURED AND IT CHANGED THE DESIGN — `style="stroke:none"`. A first-floor column room draws
   * NO OUTLINE OF ITS OWN. The green lines the user sees are the estate ENVELOPE, drawn once after
   * the loop by the wall/door pass. So copying the tile verbatim into a modal yields a fill and some
   * text floating in the dark — and the Captain's ask was literally "outlined in green". `ownStroke`
   * restores the `.room-rect` CSS default (teal, 1px) for callers that have no envelope to lean on.
   * 🔑 THE TILE WAS NEVER SELF-CONTAINED; IT ONLY LOOKED THAT WAY BECAUSE SOMETHING ELSE DREW ITS
   *    WALLS. That is invisible until you take it out of the room it grew up in.
   *
   * Returns the FACTS as well as the html so the column loop stops computing them a second time —
   * valStr and isDebt were derived here and again in the loop, which is the drift this arc keeps
   * paying for. */
  function _roomTileSVG(acc, base, d, o) {
    o = o || {};
    var isDebt = base.taxCode === 'debt';
    var isTrust = base.taxCode === 'trust';
    var isVolatile = base.isInvestment || base.taxCode === 'liquid';
    var shockMult = (o.isShocked && isVolatile && !isDebt) ? 0.70 : 1;
    var absSum = Math.abs((acc.value || 0) * shockMult);
    var valStr = '';                                        // L47 sourced-or-blank — never "$0"
    if (absSum >= 1000000) valStr = '$' + (absSum / 1000000).toFixed(2) + 'M';
    else if (absSum >= 1000) valStr = '$' + (absSum / 1000).toFixed(0) + 'k';
    else if (absSum > 0) valStr = '$' + Math.round(absSum);
    if (isDebt && absSum > 0) valStr = '-' + valStr;

    var tip = (base.taxCode === 'physical' || base.taxCode === 'debt' || base.hasInterest)
        ? '<title>' + String(base.desc || '').replace(/</g, '&lt;') + '</title>' : '';
    var shockColor = (o.isShocked && isVolatile && !isDebt) ? 'var(--danger)' : (isDebt ? 'var(--danger)' : 'var(--white)');
    var taxClass = o.isThermal ? ('tax-' + base.taxCode) : '';
    var animClass = (o.anim !== false && acc.isNew) ? 'animate-draw' : '';
    var frictionClass = acc.isFriction ? 'liquidity-friction' : '';
    var priorityClass = acc.isPriority ? 'structural-priority' : '';

    var mergeDebts = (!isDebt) ? ((o.mergeByAsset || {})[acc.id] || []) : [];   // §18.6 — ALL liens
    var mergeEq = mergeDebts.length ? _netEquityOf(acc.value, mergeDebts) : null;
    var mergeNeg = (mergeEq !== null && mergeEq < 0);
    var title = _roomNameOf(acc, base).toUpperCase() + (mergeDebts.length ? _lienMetaSuffix(mergeDebts) : '');
    /* §26 — THE PAIR, APPLIED. `S` is the HEIGHT half (how much of the stack this tile can hold);
       _fitPxShared is the WIDTH half (how much of the name this tile can hold). Both, always.
       ⛔ THE OFFSETS SCALE TOO, AND THAT IS THE PART THAT ACTUALLY FIXES THE OVERFLOW. Shrinking the
       glyphs while leaving the value pinned at cy+30 would move the ink barely at all — the 38.8-unit
       half-extent is 30 units of OFFSET plus 8.8 of descender, so both terms have to ride S or the
       stack does not tighten. */
    var S = _tileTypeScale(d.h);
    var titleY = d.cy - (mergeDebts.length ? 20 : 10) * S;
    var titlePx = _fitPxShared(title, 14 * S, d.w);
    var chip = mergeDebts.length ? _linkChipSVG(d.x + 6, d.y + 6, _lienMirrorNotice(mergeDebts, 'asset')) : '';
    var valBlock = mergeDebts.length
      ? '<text x="' + d.cx + '" y="' + (d.cy - 2 * S) + '" class="bp-title" style="fill:' + (mergeNeg ? 'var(--danger)' : 'var(--teal-mid)') + '; opacity:0.75; font-size:' + (Math.round(11 * S * 10) / 10) + 'px; letter-spacing:0.12em;">NET EQUITY</text>' +
        '<text x="' + d.cx + '" y="' + (d.cy + 24 * S) + '" class="bp-val" style="fill:' + (mergeNeg ? 'var(--danger)' : 'var(--gold)') + '; font-size:' + (Math.round(18 * S * 10) / 10) + 'px;">' + _eqStr(mergeEq) + '</text>'
      : '<text x="' + d.cx + '" y="' + (d.cy + 30 * S) + '" class="bp-val" style="fill:' + shockColor + '; font-size:' + (Math.round(32 * S * 10) / 10) + 'px; transition: 0.6s ease;">' + valStr + '</text>';

    var fp = fillPct(acc.value || 0);
    var fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
    var debtFill = isDebt || mergeNeg;
    var fill = fp > 0
      ? '<rect x="' + d.x + '" y="' + fillY + '" width="' + d.w + '" height="' + fillH + '" class="room-fill' +
        (debtFill ? ' fill-debt' : '') + '" fill="url(#' + (debtFill ? 'fillGradDebt' : 'fillGradAsset') + ')" />'
      : '';

    return {
      isDebt: isDebt, isTrust: isTrust, valStr: valStr, fillPct: fp,
      weight: (o.weights || {})[acc.id] || 0,
      html: tip +
        '<rect x="' + d.x + '" y="' + d.y + '" width="' + d.w + '" height="' + d.h + '" class="room-rect active ' +
            animClass + ' ' + frictionClass + ' ' + priorityClass + ' ' + taxClass + '"' +
            (o.ownStroke ? '' : ' style="stroke:none"') + ' />' +
        fill + chip +
        /* §26 — the WIDTH half is now UNCONDITIONAL. §25.7 applied it only where a caller opted in
           (`o.fitW`), on the reasoning that a column is >= 200 units wide so 14px always fits. ⛔ THAT
           REASONING WAS WRONG BY THE SAME KIND OF ARITHMETIC AS 62.5: a 20-character room name at
           14px measures 20 x 0.75 x 14 = 210 units into a 194-unit usable column, so the FIRST FLOOR
           could overrun horizontally too. The clamp reads d.w, which every caller already supplies —
           there is nothing to opt into and nothing to forget. */
        '<text x="' + d.cx + '" y="' + titleY + '" class="bp-title" style="font-size:' + titlePx + 'px;' +
            (isTrust ? 'fill:var(--shield);' : '') + '">' + title + '</text>' +
        valBlock
    };
  }

  /* THE PICKER. Built here rather than in studio.html so this ships with ZERO sacred-host bytes.
     ⚠️ ACCESSIBILITY IS NOT A FOLLOW-UP ON THIS ONE. It is the canvas's first real interactive
     control, and it GATES ACCESS TO DATA — a control only a mouse can reach would make those rooms
     permanently unreachable for some users, which is strictly worse than the dead tile it replaces. */
  /* ── §25.6 · A STAIRCASE ON THE TILE THAT TAKES YOU UPSTAIRS ──────────────────────────────────
   * Captain: "if in that rectangle there WAS a set of stairs ... this visually leans into our
   * blueprint of estate grounds and makes sense located here considering we are going upstairs."
   *
   * ⭐ DRAWN IN PLAN, NOT IN ELEVATION, AND THAT IS THE WHOLE POINT. A side-view zigzag is how an
   * ICON draws stairs; an architectural drawing shows a stair as a RUN OF TREADS seen from above
   * with an arrow marking the direction of travel. This canvas is a blueprint, so it uses the
   * blueprint's own symbol — the same reason we stopped saying "column" and started saying "floor".
   * ⛔ Stroke only, no fill: the collapse tile quotes no balance and must not look occupied.
   * ⚠️ It is a DECORATION and it is marked pointer-events:none, so it cannot steal the click from
   * the door underneath it — an unfilled shape only intercepts on its stroke, and those strokes sit
   * right where a thumb lands. That is the §24 hit-testing trap pointed the other way. */
  function _stairsGlyphSVG(x, y, w, h, treads) {
    var n = treads || 5, step = h / n, o = '';
    o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" ' +
         'stroke="var(--teal-mid)" stroke-width="1" opacity="0.85"/>';
    for (var i = 1; i < n; i++) {                       // the treads
      var ty = y + i * step;
      o += '<line x1="' + x + '" y1="' + ty + '" x2="' + (x + w) + '" y2="' + ty +
           '" stroke="var(--teal-mid)" stroke-width="0.75" opacity="0.7"/>';
    }
    var cx = x + w / 2, aTop = y + step * 0.45, aBot = y + h - step * 0.45, head = Math.min(4, w * 0.22);
    o += '<line x1="' + cx + '" y1="' + aBot + '" x2="' + cx + '" y2="' + aTop +
         '" stroke="var(--gold)" stroke-width="1" opacity="0.95"/>';
    o += '<path d="M ' + (cx - head) + ' ' + (aTop + head) + ' L ' + cx + ' ' + aTop + ' L ' +
         (cx + head) + ' ' + (aTop + head) + '" fill="none" stroke="var(--gold)" stroke-width="1" ' +
         'stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>';
    return '<g class="stair-glyph" pointer-events="none">' + o + '</g>';
  }

  /* ── §25.4 · THE SECOND FLOOR IS DRAWN AS A FLOOR ─────────────────────────────────────────────
   * ⭐ THE TWO NUMBERS, DERIVED — NEITHER IS INHERITED AND NEITHER IS TASTE.
   *   W = 404 — the picker box is max-width 440 with 18px padding each side, so 404 is its inner
   *       width. Using it as the viewBox width puts the drawing at 1 unit = 1 px, which is the ONLY
   *       way `.bp-title`'s 14px renders at the SAME SIZE it does on the first floor. Scale the
   *       viewBox and you scale the type; the Captain asked for the rooms to look like his rooms.
   *   H = max(315, 75n) — 315 is the first floor's OWN 750-unit column band scaled by the width we
   *       actually have (404/960 = 0.4208 → 315.6). A single-column first floor is 960 wide, so 315
   *       is literally "how these rooms would look if they were the only rooms downstairs", fitted
   *       to this box. 75 is the first floor's own minH, reused not invented.
   *
   * ⛔ IT SCROLLS, IT NEVER CAPS. Above ~4 rooms H grows instead of the tiles shrinking. Capping
   * here would hide rooms INSIDE THE PLACE WE BUILT TO SHOW HIDDEN ROOMS — the original sin of this
   * entire arc, reproduced inside its own fix. 🔑 THE CHEAPEST ANSWER TO "WHAT HAPPENS ABOVE THE
   * CAP" IS THAT THERE IS NO CAP. The box already carries max-height:70vh + overflow:auto.
   *
   * ⚠️ NOTE THE WEIGHTING FADES OUT, EXACTLY AS IT DOES DOWNSTAIRS. _bandLayout pays every tile its
   * 75-unit floor FIRST and distributes only the remainder by value, so at 5+ rooms there is no
   * remainder and every room is 75 tall. That is not a bug and it is not new — a first-floor column
   * does the identical thing at 10 rooms (750/10). Same algorithm, same behaviour, one implementation.
   *
   * ⛔ pointer-events:all IS LOAD-BEARING HERE FOR THE SAME REASON IT WAS IN §24, AND THE TRAP IS
   * LIVE: fillPct() returns 0 for a zero-value room, so such a room draws NO fill — and an unfilled
   * SVG rect is hit-testable ONLY ON ITS STROKE. Without this, a room with no balance would be a
   * rectangle with a hole in the middle. AN AFFORDANCE IS NOT PROVEN BY ITS ATTRIBUTES. */
  /* ── §25.7 · THE SECOND FLOOR IS ONE FLOOR, NOT ONE PER WING ──────────────────────────────────
   * Captain: "if the primary has the upper floor and the co (and/or joint) has the upper floor,
   * these rooms are not connected ... would be nice if the upper floor truly CONTAINED ALL upper
   * floor rooms." He is right and the old behaviour was a renderer fact leaking again: each column
   * built its own picker over its own overflow, so a house with two crowded wings had TWO second
   * floors that could not see each other. A house has ONE upstairs.
   *
   * ⭐ THE GROUPS ARE RESOLVED LAZILY, AT OPEN TIME, AND THAT IS WHAT MAKES THIS POSSIBLE AT ALL.
   * A collapse tile is built DURING its column's pass, so the later columns' overflow does not
   * exist yet. The door closes over a mutable per-render object and reads it on click — by then the
   * render has long finished. ⛔ Resolving eagerly would have shown the primary wing an upstairs
   * with the joint and co-owned wings missing, which is the bug wearing a fix.
   *
   * ⛔ POSITION CARRIES THE MEANING, EXACTLY AS DOWNSTAIRS: primary left, joint middle, co-owned
   * right — the same order activeCols builds. NO COLUMN CAPTIONS: the first floor has none (checked,
   * not assumed), so adding them here would be inventing copy nobody authored to explain a layout
   * the user already reads by position.
   *
   * ⚠️ COLUMNS ARE EQUAL WIDTH UP HERE, AND THAT IS DELIBERATE RATHER THAN LAZY. Downstairs a
   * column's WIDTH encodes how much total value that ownership bucket holds. Upstairs a column holds
   * only that bucket's OVERFLOW, so a width proportion would encode "which wing happened to spill
   * more", which means nothing. Value is still carried where it is honest — in room HEIGHT, by the
   * same _bandLayout as downstairs. 🔑 DO NOT COPY AN ENCODING INTO A CONTEXT WHERE THE THING IT
   * ENCODES NO LONGER EXISTS. */
  function _foldFloorSVG(groups, tileFor, onOpen) {
    var W = 404, INSET = 1, CGAP = 8;             // 1-unit inset so the 1px stroke is not half-clipped
    var nC = Math.max(1, groups.length);
    var colW = (W - (nC - 1) * CGAP) / nC;
    var tallest = 0;
    groups.forEach(function (gr) { tallest = Math.max(tallest, gr.rooms.length); });
    var H = Math.max(315, 75 * tallest);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'datum-fold-floor');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('style', 'width:100%;height:auto;display:block;overflow:visible;');
    groups.forEach(function (gr, ci) {
      var colX = ci * (colW + CGAP);
      /* Each wing's stack fills the WHOLE band, exactly as a first-floor column does — so one room
         upstairs draws tall beside a wing with five, and the two floors read the same way. */
      var rows = _bandLayout(0, H, 0, 75, gr.rooms.map(function (a) { return Math.max(Math.abs(a.value || 0), 1000); }));
      gr.rooms.forEach(function (acc, i) { drawOne(acc, i, rows, colX, colW); });
    });
    function drawOne(acc, i, rows, colX, colW) {
      var r = rows[i] || { y: i * 75, h: 75 };
      var d = { x: colX + INSET, y: r.y + INSET, w: colW - INSET * 2, h: Math.max(1, r.h - INSET * 2) };
      d.cx = d.x + d.w / 2; d.cy = d.y + d.h / 2;
      var t = tileFor(acc, d);
      if (!t) return;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'room-grp visible datum-fold-room' + (t.isDebt ? ' debt-room' : '') + (t.isTrust ? ' trust-room' : ''));
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      /* ⚠️ NO AUTHORED PER-ROOM ACCESSIBLE NAME EXISTS, and I am not writing one. This is the room's
         OWN name and its OWN figure — the same data the tile shows — not a sentence. The control
         type is announced by the AT (§25.5). FLAGGED for the Architect. */
      g.setAttribute('aria-label', String(_roomNameOf(acc, getBaseType(acc.baseId) || {}) || '').toUpperCase() +
          (t.valStr ? ', ' + t.valStr : ''));
      g.setAttribute('pointer-events', 'all');
      g.style.cursor = 'pointer';
      g.style.setProperty('--weight', t.weight);
      g.innerHTML = t.html;
      var go = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } onOpen(acc); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') go(e); });
      svg.appendChild(g);
    }
    return svg;
  }

  /* Normalises whatever a surface handed its door into `[{ rooms: [...] }, ...]`.
     ⛔ A FUNCTION IS RESOLVED HERE, ON CLICK — that laziness is §25.7's whole mechanism (the later
     wings' overflow does not exist when the first wing's tile is built). */
  function _foldGroups(spec) {
    var v = (typeof spec === 'function') ? spec() : spec;
    if (!v) return [];
    if (Array.isArray(v) && v.length && Array.isArray(v[0].rooms)) {
      return v.filter(function (gr) { return gr.rooms && gr.rooms.length; });
    }
    return (Array.isArray(v) && v.length) ? [{ rooms: v }] : [];
  }
  function _foldTotal(groups) {
    var n = 0; groups.forEach(function (gr) { n += gr.rooms.length; }); return n;
  }

  function _openFoldPicker(spec, headline, subhead, mergedOf, tileFor) {
    var groups = _foldGroups(spec);
    var folded = [];
    groups.forEach(function (gr) { folded = folded.concat(gr.rooms); });
    if (!folded.length) return;                            // no derivable set -> no dialog, ever
    var prev = document.activeElement;
    var back = document.createElement('div');
    back.className = 'datum-fold-picker';
    back.setAttribute('style', 'position:fixed;inset:0;z-index:4000;background:rgba(2,6,14,0.72);' +
        'display:flex;align-items:center;justify-content:center;padding:24px;');
    var titleId = 'foldpick-' + Math.random().toString(36).slice(2, 8);
    var box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', titleId);
    /* ⭐ CAPTAIN 2026-08-11 — GOLD, NOT THE RELIQUARY PURPLE. --shield is the TRUST token: it means
       "this is legally held apart", and borrowing it for a navigation surface was the renderer
       reaching for a colour it had rather than the colour this means. The second floor is part of
       the house, so it wears the house's accent. --gold (#C9A84C) is a standard token; --shield is
       reserved for what it names. */
    box.setAttribute('style', 'background:#060b14;border:1px solid var(--gold, #C9A84C);border-radius:6px;' +
        'min-width:320px;max-width:440px;width:100%;max-height:70vh;overflow:auto;' +
        'box-shadow:0 24px 60px rgba(0,0,0,0.9);padding:18px 18px 12px;');
    var h = document.createElement('div');
    h.id = titleId;
    h.setAttribute('style', 'font-family:var(--font-mono);font-size:12px;letter-spacing:0.16em;color:var(--gold,#C9A84C);font-weight:bold;');
    h.textContent = headline;
    var s = document.createElement('div');
    /* ⭐ CAPTAIN 2026-08-11 — the subhead was --muted, which resolves to rgba(255,255,255,0.3) in the
       studio scope: 30% white on a near-black modal. It is the sentence that tells the user what this
       place IS and how to use it, so it may not be the dimmest thing on screen. */
    s.setAttribute('style', 'font-family:var(--font-serif);font-size:12px;color:rgba(255,255,255,0.85);margin:6px 0 14px;');
    /* §25.1 — THE SUBHEAD ARRIVES FULLY BUILT (it used to be `folded.length + suffix`, which forced
       every surface into one plural shape and left no room for an authored singular).
       §25.7 — OR AS A FUNCTION OF n, because the second floor's count is no longer knowable when the
       tile is built: it is every wing's overflow, resolved on click. The caller still authors the
       sentence; the picker supplies the only honest number. */
    s.textContent = (typeof subhead === 'function') ? subhead(folded.length) : subhead;
    box.appendChild(h); box.appendChild(s);

    /* §25.3's verb is unchanged and lives in ONE place, so the drawn floor and the row list cannot
       disagree about what a pick does. */
    var openRoom = function (acc) {
      var fn = window[_roomModalFor(acc, mergedOf ? !!mergedOf(acc) : false)];
      if (typeof fn === 'function') fn(acc.id);
    };

    /* §25.4 — a DRAWN floor where the surface can supply one; the row list otherwise. ⚠️ THE
       SATELLITE SURFACE STILL LISTS, and that is scope, not an oversight: its tile is a DIFFERENT
       emitter (3-line merged stack, its own scale ratio) which has not been extracted. Reported, not
       hidden. The rows already carry name + balance, so nothing regresses there. */
    if (tileFor) {
      box.appendChild(_foldFloorSVG(groups, tileFor, openRoom));
      mountPicker();
      return;
    }

    folded.forEach(function (acc) {
      var base = getBaseType(acc.baseId) || {};
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'datum-fold-row';
      /* Same gold retirement of the reliquary purple as the box chrome above. */
      row.setAttribute('style', 'display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;' +
          'background:transparent;border:1px solid rgba(201,168,76,0.30);border-radius:4px;cursor:pointer;' +
          'padding:10px 12px;margin-bottom:8px;text-align:left;color:inherit;font:inherit;');
      var nm = document.createElement('span');
      nm.setAttribute('style', 'font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em;color:var(--teal-mid,#1d9e75);');
      nm.textContent = String(_roomNameOf(acc, base) || base.meta || '').toUpperCase();
      var vl = document.createElement('span');
      vl.setAttribute('style', 'font-family:var(--font-serif);font-size:13px;color:#fff;');
      /* ⭐ THE BALANCE IS THE POINT. The collapse tile is forbidden from quoting one because you
         cannot open into it; the moment you CAN, the money must be visible — this is where "all
         counted in your totals" stops being an assertion and becomes something the user can check. */
      vl.textContent = _foldMoney(acc.value);
      row.appendChild(nm); row.appendChild(vl);
      /* ⭐ §25.3 — THE PICKER IS A DOOR TO THE ROOM, NOT A CONTROL OVER THE DRAWING. Clicking a row
         opens THAT ROOM'S OWN MODAL — the identical one the user gets by clicking its tile on the
         first floor, resolved through the SAME branch the tile uses (_roomModalFor). ⛔ THE CANVAS
         DOES NOT CHANGE: not during, not after. No updateSVGs, no re-layout, no reshuffle. */
      row.addEventListener('click', function () {
        var fn = window[_roomModalFor(acc, mergedOf ? !!mergedOf(acc) : false)];
        if (typeof fn === 'function') fn(acc.id);
        /* ⛔ AND THE PICKER IS NOT DESTROYED. The room stacks above it (10005/10020 over 4000) with
           an opaque backdrop, so it is visually REPLACED and the user never sees two dialogs — but
           the landing is still standing when they close the room. Focus deliberately stays on this
           row, so they step back out beside the room they just visited. */
      });
      box.appendChild(row);
    });

    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (back.parentNode) back.parentNode.removeChild(back);
      if (prev && typeof prev.focus === 'function') { try { prev.focus(); } catch (e) {} }
    }
    function onKey(e) {
      /* ⛔ STAND DOWN WHILE A ROOM IS OPEN ABOVE US. This handler is CAPTURE-phase on document, so
         without this line Escape inside an open room would close the second floor beneath it and
         leave the room hanging — a new bug shipped to fix an old one. Same for the Tab trap: focus
         belongs to the topmost dialog. ⚠️ Escape from the PICKER ITSELF (nothing above it) still
         closes it and still returns focus to the collapse tile — that behaviour is UNCHANGED. */
      if (_roomModalOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    /* ⚠️ THE TRAP USED TO SELECT `button` AND THAT WAS A BUG WAITING FOR §25.4. A drawn floor's rooms
       are SVG <g role="button" tabindex="0"> — not <button> elements — so the old selector would have
       found ZERO focusables and silently disabled the Tab trap AND the initial focus, on the exact
       surface §24 built to guarantee keyboard reach. 🔑 A SELECTOR THAT NAMES A TAG IS A BET THAT THE
       MARKUP WILL NEVER CHANGE SHAPE. Select on the CONTRACT (focusable) instead. */
    function focusables() { return box.querySelectorAll('button, [tabindex="0"]'); }
    function mountPicker() {
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
      document.addEventListener('keydown', onKey, true);
      back.appendChild(box);
      document.body.appendChild(back);
      var f0 = focusables()[0];
      if (f0 && typeof f0.focus === 'function') f0.focus();
    }
    mountPicker();
  }

  /* One place that makes a collapse tile a real control, so surface #3 cannot be born dead. */
  function _makeFoldDoor(g, folded, headline, subhead, aria, mergedOf, tileFor) {
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', aria);
    g.style.cursor = 'pointer';
    /* ⛔ pointer-events:all IS LOAD-BEARING, AND ONLY A REAL CLICK FOUND IT. An SVG rect with no
       fill is HIT-TESTABLE ONLY ON ITS STROKE — so a collapse tile, which deliberately carries no
       fill because it quotes no balance, was a 1px dashed outline of a click target with a hole in
       the middle. Adding the handler alone would have produced a door that opens only if you hit
       the frame. A gate that reads the DOM would have seen role, tabindex and a listener and called
       it done. 🔑 AN AFFORDANCE IS NOT PROVEN BY ITS ATTRIBUTES, ONLY BY BEING HIT. */
    g.setAttribute('pointer-events', 'all');
    var open = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } _openFoldPicker(folded, headline, subhead, mergedOf, tileFor); };
    g.addEventListener('click', open);
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') open(e); });
  }

  /* ── §22 · _bandLayout — ONE SUBDIVISION ALGORITHM FOR EVERY VERTICAL BAND ───────────────────
   * Stacks n tiles down a band, weighted by value, so that the stack fills the band EXACTLY: the
   * first tile alone spans it, two split it, three subdivide again. Both wings call this and there
   * is no second implementation (L48).
   *
   * ⛔ WHY THIS EXISTS RATHER THAN A COPY OF THE TRUST WING. §22 was scoped as "reuse the Trust
   * wing's algorithm, do not invent one." Measured 2026-08-09, THE TRUST WING'S ALGORITHM IS
   * BROKEN and copying it would have propagated the break:
   *     let availH = (gH - 100);  h = 75 + availH * share      <- the old trust wing
   * It distributes the WHOLE pool as remainder while ALSO granting every tile a 75-unit floor, so
   * the stack sums to 75n + pool instead of pool. It fits at n=1 by luck and escapes thereafter.
   * MEASURED, band y[180,1010]:  2 trusts overran the band by 82 units · 3 trusts ended at y=1179,
   * which is 79 units OUTSIDE THE 1400x1100 viewBox. That is not cosmetic: the satellite block
   * below documents that content outside the viewBox survives only on slack fitToScreen happens to
   * leave (406 user units on one screen, 0 on another, same machine, window width alone), so a
   * third trust was drawn or not drawn depending on how wide the user's window was.
   *
   * ✅ THE CORRECT FORM WAS ALREADY IN THIS FILE, in the ownership-column code:
   *     availH = (gH - 100) - (accounts.length * minH)         <- reserve the floors FIRST
   * One missing term. This helper is that form, generalized, so both wings share it.
   *
   * THE POOL IS THE TRUE BAND, NOT (gH - 100). Both wings run y[gY+20, gY+gH] = 830 units, but the
   * old constant said 750 — 80 short. Using the real band is what makes the two wings MATCH rather
   * than merely resemble each other: one trust and one satellite now both compute to exactly 830.
   * The Captain asked for "the size of the Trust" in his own words, and a match is the ask.
   *
   * ⚠️ NEVER RETURNS A STACK THAT LEAVES THE BAND. If the floors alone cannot fit (too many tiles),
   * the floor is COMPRESSED to pool/n rather than allowed to overrun. Thin tiles are a readability
   * problem; tiles outside the viewBox are an is-it-drawn-at-all problem, and only one of those can
   * silently delete money from the picture. Callers that care about readability cap the COUNT
   * before calling (the satellite wing collapses to a counted tile — see sCap below).
   *
   * gap is applied BETWEEN tiles only: n tiles consume (n-1) gaps, never a trailing one. */
  function _bandLayout(top, bottom, gap, minH, weights) {
    var n = weights.length;
    if (n < 1) return [];
    var pool = (bottom - top) - (n - 1) * gap;   // space the TILES may occupy, gaps already removed
    if (pool <= 0) return [];
    var floor = minH;
    if (pool < n * floor) floor = pool / n;      // compress rather than overrun — see note above
    var avail = Math.max(0, pool - n * floor);   // remainder to distribute AFTER every floor is paid
    var tot = 0;
    for (var i = 0; i < n; i++) tot += (weights[i] > 0 ? weights[i] : 0);
    var out = [], y = top;
    for (var j = 0; j < n; j++) {
      var share = tot > 0 ? (weights[j] > 0 ? weights[j] : 0) / tot : 1 / n;
      var h = floor + avail * share;
      out.push({ y: y, h: h });
      y += h + gap;
    }
    return out;
  }

  // ── Architecture pass · Step 1 — REAL doorways on shared walls ───────────────────────────────
  // The faux arch-marks are gone. A doorway = the existing navy wall-cutout (a true opening) PLUS a
  // proper floor-plan door symbol (a swing arc + leaf). Position varies deterministically per room
  // (estates don't put every door dead-center), swing side varies, and large accounts get a double
  // door. Drawn as a faint teal drafting mark, inline (no studio.html change).
  var DOOR_STYLE = 'stroke="var(--teal-mid)" stroke-width="1" fill="none" opacity="0.42"';
  function _hashFrac(s, salt) {
    var str = String(s) + (salt || ''), h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
  }
  function _doorWidth(span, big) { return big ? Math.min(120, span * 0.72) : Math.min(48, span * 0.5); }
  // Door on a HORIZONTAL wall at y=wy spanning [xL,xR]: opening + straight leaf + quarter-circle
  // swing arc (convex, INTO the room). dir = +1 swings down, -1 up. Position + side vary by seed.
  function _doorH(wy, xL, xR, seed, big) {
    var span = xR - xL; if (span < 44) return '';
    var dW = _doorWidth(span, big);
    var usable = Math.max(0, span - 28 - dW);
    var cx = xL + 14 + dW / 2 + _hashFrac(seed) * usable;
    var ax = cx - dW / 2, bx = cx + dW / 2;
    var dir = _hashFrac(seed, 'swing') > 0.5 ? 1 : -1;
    var out = '<path d="M ' + ax + ' ' + wy + ' L ' + bx + ' ' + wy + '" class="wall-cutout"/>';   // opening
    if (big) {
      var hw = dW / 2;   // two leaves hinged at the ends, swinging to the centre
      out += '<path d="M ' + ax + ' ' + wy + ' L ' + ax + ' ' + (wy + dir * hw) + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + cx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
      out += '<path d="M ' + bx + ' ' + wy + ' L ' + bx + ' ' + (wy + dir * hw) + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + cx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
    } else {
      out += '<path d="M ' + ax + ' ' + wy + ' L ' + ax + ' ' + (wy + dir * dW) + ' A ' + dW + ' ' + dW + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + bx + ' ' + wy + '" ' + DOOR_STYLE + '/>';
    }
    return out;
  }
  // Door on a VERTICAL wall at x=wx spanning [yT,yB]. dir = +1 swings right (into the next column).
  function _doorV(wx, yT, yB, seed, big) {
    var span = yB - yT; if (span < 44) return '';
    var dW = _doorWidth(span, big);
    var usable = Math.max(0, span - 28 - dW);
    var cy = yT + 14 + dW / 2 + _hashFrac(seed) * usable;
    var ay = cy - dW / 2, by = cy + dW / 2;
    var dir = _hashFrac(seed, 'swing') > 0.5 ? 1 : -1;
    var out = '<path d="M ' + wx + ' ' + ay + ' L ' + wx + ' ' + by + '" class="wall-cutout"/>';   // opening
    if (big) {
      var hw = dW / 2;
      out += '<path d="M ' + wx + ' ' + ay + ' L ' + (wx + dir * hw) + ' ' + ay + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + wx + ' ' + cy + '" ' + DOOR_STYLE + '/>';
      out += '<path d="M ' + wx + ' ' + by + ' L ' + (wx + dir * hw) + ' ' + by + ' A ' + hw + ' ' + hw + ' 0 0 ' + (dir > 0 ? 0 : 1) + ' ' + wx + ' ' + cy + '" ' + DOOR_STYLE + '/>';
    } else {
      out += '<path d="M ' + wx + ' ' + ay + ' L ' + (wx + dir * dW) + ' ' + ay + ' A ' + dW + ' ' + dW + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + wx + ' ' + by + '" ' + DOOR_STYLE + '/>';
    }
    return out;
  }

  // ── Phase A · Estate-dissolve — "rooms stop being alone" ─────────────────────────────────────
  // The per-room box stroke + per-room doors are gone (see the cols loop). Walls are drawn ONCE as an
  // estate SHELL: (a) one heavy ENVELOPE around the column union (flat shared top, stepped bottom);
  // (b) interior shared edges become OPEN THRESHOLDS (single light stubs + a varied gap, never doubled);
  // (c) PRIVATE rooms (Vault + debt) stay SEALED (full enclosure + one door). All inline-styled — zero
  // studio.html edit (E5). Tuned by eye via SHELL_TUNE. Hallways = Phase B (not here).
  var SHELL_TUNE = { openness: 1, envWeight: 8, partWeight: 0.5 };   // Captain-locked 2026-06-25 (eyes-on)

  function _envelopePath(colInfo, jut) {
    if (!colInfo.length) return '';
    var top = colInfo[0].top, n = colInfo.length, last = colInfo[n - 1];
    var d = 'M ' + colInfo[0].x + ' ' + top;
    if (jut && jut.x1 > jut.x0) {                                            // A.1 Foyer jut: top wall steps OUT
      var jt = top - jut.depth;
      d += ' L ' + jut.x0 + ' ' + top + ' L ' + jut.x0 + ' ' + jt +
           ' L ' + jut.x1 + ' ' + jt + ' L ' + jut.x1 + ' ' + top;
    }
    d += ' L ' + (last.x + last.w) + ' ' + top;                              // flat top across all columns
    d += ' L ' + (last.x + last.w) + ' ' + last.bottom;                      // right edge down
    for (var i = n - 1; i >= 0; i--) {
      d += ' L ' + colInfo[i].x + ' ' + colInfo[i].bottom;                   // across col i bottom (R->L)
      if (i > 0) d += ' L ' + colInfo[i].x + ' ' + colInfo[i - 1].bottom;    // step to the left col's bottom
    }
    return d + ' Z';                                                         // up the left edge
  }
  function _sharedEdges(roomRects, colInfo) {
    var edges = [];
    for (var k = 0; k < roomRects.length; k++) {                             // horizontal: stacked rooms
      var r = roomRects[k]; if (r.last) continue;
      var below = roomRects[k + 1]; if (!below || below.col !== r.col) continue;
      if (r.priv || below.priv) continue;                                    // private enclosure walls it
      edges.push({ id: r.id + '_h', x0: r.x, y0: r.y + r.h, x1: r.x + r.w, y1: r.y + r.h });
    }
    for (var c = 0; c < colInfo.length - 1; c++) {                           // vertical: between columns
      var A = colInfo[c], B = colInfo[c + 1];
      var x = A.x + A.w, yT = A.top, yB = Math.min(A.bottom, B.bottom);
      if (yB - yT < 30) continue;
      edges.push({ id: 'col' + c + '_v', x0: x, y0: yT, x1: x, y1: yB });
    }
    return edges;
  }
  function _openThreshold(edge, o) {
    var dx = edge.x1 - edge.x0, dy = edge.y1 - edge.y0, L = Math.hypot(dx, dy);
    if (L < 1) return '';
    var ux = dx / L, uy = dy / L;
    var keep = L * Math.max(0, Math.min(1, 1 - o));                          // wall kept; gap = L - keep
    if (keep < 1) return '';                                                 // fully open -> no stub at all
    var style = 'stroke="var(--teal-mid)" stroke-width="' + SHELL_TUNE.partWeight + '" opacity="0.4" stroke-linecap="round"';
    function seg(a, b) {
      return '<line class="estate-partition" data-edge="' + edge.id + '" x1="' + (edge.x0 + ux * a) + '" y1="' + (edge.y0 + uy * a) +
             '" x2="' + (edge.x0 + ux * b) + '" y2="' + (edge.y0 + uy * b) + '" ' + style + '/>';
    }
    if (_hashFrac(edge.id) < 0.5) { var s = keep / 2; return seg(0, s) + seg(L - s, L); }   // centered gap
    var off = (L - keep) * (0.2 + 0.5 * _hashFrac(edge.id, 'off'));                          // short jog
    return seg(off, off + keep);
  }
  function _privEnclosure(r) {
    var col = r.isDebt ? 'var(--danger)' : 'var(--teal-mid)';
    return '<rect class="estate-wall-private" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h +
           '" style="fill:none;stroke:' + col + ';stroke-width:1.6px;opacity:0.85"/>';
  }
  // A.2 — a sealed room gets ONE door, on a wall facing OPEN space or the EXTERIOR; NEVER on a wall
  // shared with another sealed room (those stay solid party walls). Position along the chosen wall is
  // DETERMINISTIC (reuses _doorH/_doorV's id-hash) so doors vary room-to-room without jitter. This is
  // the estate-level door RULE (which wall), not per-room character.
  function _roomsByCol(roomRects) {
    var m = {};
    roomRects.forEach(function (r) { (m[r.ci] = m[r.ci] || []).push(r); });
    Object.keys(m).forEach(function (k) { m[k].sort(function (a, b) { return a.ri - b.ri; }); });
    return m;
  }
  function _sealedDoor(r, byCol, lastCi) {
    function vert(ci, y0, y1) {                                              // class the column across a vertical wall
      var list = byCol[ci] || [], open = false, sealed = false, saw = false;
      list.forEach(function (o) { if (o.y < y1 && o.y + o.h > y0) { saw = true; if (o.priv) sealed = true; else open = true; } });
      return !saw ? 'exterior' : (open ? 'open' : 'sealed');
    }
    var col = byCol[r.ci] || [], up = col[r.ri - 1], dn = col[r.ri + 1];
    var walls = [
      { kind: r.ri === 0     ? 'exterior' : (up && up.priv ? 'sealed' : up ? 'open' : 'exterior'), axis:'h', f:r.y,       a:r.x, b:r.x + r.w },  // top
      { kind: r.last         ? 'exterior' : (dn && dn.priv ? 'sealed' : dn ? 'open' : 'exterior'), axis:'h', f:r.y + r.h, a:r.x, b:r.x + r.w },  // bottom
      { kind: r.ci === 0     ? 'exterior' : vert(r.ci - 1, r.y, r.y + r.h),  axis:'v', f:r.x,       a:r.y, b:r.y + r.h },                         // left
      { kind: r.ci === lastCi ? 'exterior' : vert(r.ci + 1, r.y, r.y + r.h), axis:'v', f:r.x + r.w, a:r.y, b:r.y + r.h }                          // right
    ];
    var rank = { open: 0, exterior: 1 };
    var cand = walls.filter(function (w) { return w.kind in rank; })
                    .sort(function (x, y) { return rank[x.kind] - rank[y.kind]; });   // prefer OPEN, then exterior
    var w = cand[0];
    if (!w) w = walls[1];   // LANDLOCKED-SEALED FALLBACK: no open/exterior wall exists -> ONE door on the
                            // bottom wall, necessarily on a sealed wall. This is the LONE sanctioned exception
                            // to the never-cut-a-sealed-wall rule (never doorless). NOT cluster door-sharing
                            // (that is the parked cluster refinement).
    var big = r.val >= 250000;
    return (w.axis === 'h') ? _doorH(w.f, w.a, w.b, r.id, big) : _doorV(w.f, w.a, w.b, r.id, big);
  }

  // A.4 — a contiguous vertical RUN of sealed rooms in a column = a "debt wing". Returns the runs.
  function _sealedWings(roomRects, byCol) {
    var wings = [];
    Object.keys(byCol).forEach(function (ci) {
      var run = null;
      byCol[ci].forEach(function (r) {                            // byCol[ci] sorted by ri
        if (r.priv) { if (!run) { run = []; wings.push(run); } run.push(r); }
        else run = null;                                          // an open room breaks the run
      });
    });
    return wings;                                                 // each = array of consecutive sealed rooms
  }
  // A.4 — ONE shared door for a wing (run>=2), on its open-facing/exterior wall nearest the wing center.
  // A run of length 1 = an isolated sealed room -> A.2 rule UNCHANGED (so the supersession can never be
  // mistaken for an A.2 regression). This SUPERSEDES the A.2 single-room landlocked fallback for runs>=2.
  function _wingDoor(wing, byCol, lastCi) {
    if (wing.length === 1) return _sealedDoor(wing[0], byCol, lastCi);   // isolated sealed room -> A.2
    var ci = wing[0].ci, topR = wing[0], botR = wing[wing.length - 1];
    function vert(c, y0, y1) {
      var list = byCol[c] || [], open = false, sealed = false, saw = false;
      list.forEach(function (o) { if (o.y < y1 && o.y + o.h > y0) { saw = true; if (o.priv) sealed = true; else open = true; } });
      return !saw ? 'exterior' : (open ? 'open' : 'sealed');
    }
    var cands = [];
    wing.forEach(function (r) {                                   // each room's side walls
      var lk = r.ci === 0      ? 'exterior' : vert(r.ci - 1, r.y, r.y + r.h);
      var rk = r.ci === lastCi ? 'exterior' : vert(r.ci + 1, r.y, r.y + r.h);
      if (lk !== 'sealed') cands.push({ kind: lk, axis: 'v', f: r.x,       a: r.y, b: r.y + r.h, c: r.y + r.h / 2, seed: r.id });
      if (rk !== 'sealed') cands.push({ kind: rk, axis: 'v', f: r.x + r.w, a: r.y, b: r.y + r.h, c: r.y + r.h / 2, seed: r.id });
    });
    var tUp = byCol[ci][topR.ri - 1], bDn = byCol[ci][botR.ri + 1];   // a maximal run is always bounded
    var tk = topR.ri === 0 ? 'exterior' : (tUp && tUp.priv ? 'sealed' : tUp ? 'open' : 'exterior');   // above/below by an
    var bk = botR.last      ? 'exterior' : (bDn && bDn.priv ? 'sealed' : bDn ? 'open' : 'exterior');   // open room or the edge
    if (tk !== 'sealed') cands.push({ kind: tk, axis: 'h', f: topR.y,        a: topR.x, b: topR.x + topR.w, c: topR.x + topR.w / 2, seed: topR.id });
    if (bk !== 'sealed') cands.push({ kind: bk, axis: 'h', f: botR.y + botR.h, a: botR.x, b: botR.x + botR.w, c: botR.x + botR.w / 2, seed: botR.id });

    var midY = (topR.y + botR.y + botR.h) / 2, rank = { open: 0, exterior: 1 };
    cands.sort(function (x, y) {                                  // prefer OPEN, then exterior; tiebreak = nearest wing center (deterministic)
      if (rank[x.kind] !== rank[y.kind]) return rank[x.kind] - rank[y.kind];
      return Math.abs(x.c - midY) - Math.abs(y.c - midY);
    });
    var w = cands[0];
    if (!w) {   // LANDLOCKED-WING FALLBACK (A.4) — DEFENSIVE/UNREACHABLE: a maximal run is always bounded
                // above/below by an open room or the envelope edge, so `cands` is never empty. Kept as a
                // safety net (e.g. a future 2D-wing change). Supersedes the A.2 single-room landlocked
                // fallback for runs>=2; never doorless. NOT cluster-sharing-across-columns (that is parked).
      w = { axis: 'h', f: botR.y + botR.h, a: botR.x, b: botR.x + botR.w, seed: botR.id };
    }
    var big = wing.some(function (r) { return r.val >= 250000; });
    return (w.axis === 'h') ? _doorH(w.f, w.a, w.b, 'wing-' + w.seed, big) : _doorV(w.f, w.a, w.b, 'wing-' + w.seed, big);
  }

  // ── Phase A.1 · Exterior articulation (additive; ESTATE-LEVEL silhouette, NEVER per-room character) ──
  // Windows + ONE entry door + load-bearing OUTER wall (heaviest room, hub weight READ-only) + ONE stair
  // + Foyer jut + optional CAD chrome. All inline overlays on the estate shell — zero studio.html edit.
  var A1_TUNE = { windows: true, windowGap: 110, windowW: 60, door: true, doorW: 120,
                  weightGain: 0.1, stairs: true, foyerJut: true, jutDepth: 48, chrome: true };   // Captain-locked 2026-06-26 (eyes-on)

  function _roomExteriorEdges(r, lastCi) {                                   // which of a room's edges are on the envelope
    var e = [];
    if (r.ri === 0)      e.push({ side:'top',    x0:r.x,     y0:r.y,     x1:r.x+r.w, y1:r.y,     ux:1, uy:0, r:r });
    if (r.last)          e.push({ side:'bottom', x0:r.x,     y0:r.y+r.h, x1:r.x+r.w, y1:r.y+r.h, ux:1, uy:0, r:r });
    if (r.ci === 0)      e.push({ side:'left',   x0:r.x,     y0:r.y,     x1:r.x,     y1:r.y+r.h, ux:0, uy:1, r:r });
    if (r.ci === lastCi) e.push({ side:'right',  x0:r.x+r.w, y0:r.y,     x1:r.x+r.w, y1:r.y+r.h, ux:0, uy:1, r:r });
    return e;
  }
  function _windowGlyph(cx, cy, ux, uy, w) {                                 // a plan window: cut + 2 glazing lines + jambs
    var nx = -uy, ny = ux, hx = ux*w/2, hy = uy*w/2, o = 2.4;
    var ax = cx-hx, ay = cy-hy, bx = cx+hx, by = cy+hy;
    var ln = function (x1,y1,x2,y2) { return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>'; };
    var cut = '<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" style="stroke:var(--bg-navy);stroke-width:'+(SHELL_TUNE.envWeight+2)+'px"/>';
    var glaze = ln(ax+nx*o, ay+ny*o, bx+nx*o, by+ny*o) + ln(ax-nx*o, ay-ny*o, bx-nx*o, by-ny*o);
    var jamb  = ln(ax+nx*o, ay+ny*o, ax-nx*o, ay-ny*o) + ln(bx+nx*o, by+ny*o, bx-nx*o, by-ny*o);
    return '<g class="estate-window" style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.6">'+cut+glaze+jamb+'</g>';
  }
  function _windows(edges, tune) {
    var out = '';
    edges.forEach(function (e) {
      if (e.r.priv) return;                                                  // no windows on sealed rooms
      if (/foyer/i.test(e.r.meta || '') && e.side === 'top') return;         // entry door lives there
      var L = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
      var count = Math.floor((L - 40) / tune.windowGap);
      if (count < 1) return;
      var span = count * tune.windowGap, start = (L - span) / 2 + tune.windowGap / 2;
      for (var i = 0; i < count; i++) {
        var c = start + i * tune.windowGap;
        out += _windowGlyph(e.x0 + e.ux * c, e.y0 + e.uy * c, e.ux, e.uy, tune.windowW);
      }
    });
    return out;
  }
  // A.3 — the estate's entry room = the ONE top-row room spanning the estate center-x (the front-door
  // position). Whatever account sits there is the entrance; the jut + cutout + door all attach to it.
  function _entryRoom(roomRects, colInfo, lastCi) {
    if (!colInfo.length) return null;
    var cxEnv = (colInfo[0].x + colInfo[lastCi].x + colInfo[lastCi].w) / 2;
    var tops = roomRects.filter(function (r) { return r.ri === 0; });          // top room of each column
    var hit = tops.filter(function (r) { return cxEnv >= r.x && cxEnv <= r.x + r.w; });
    return hit[0] || tops[0] || null;                                          // deterministic; fallback top-left
  }
  function _exteriorDoor(entry, colInfo, lastCi, tune, jut) {                  // ONE entrance, on the top-center room
    if (!tune.door || !colInfo.length) return '';
    var top = colInfo[0].top, cx, wy = top;
    if (entry) { cx = entry.x + entry.w / 2; if (jut) wy = top - tune.jutDepth; }   // on the (jutted) entry wall
    else { cx = (colInfo[0].x + colInfo[lastCi].x + colInfo[lastCi].w) / 2; }       // no rooms -> center fallback
    var w = tune.doorW, ax = cx - w/2, bx = cx + w/2, hw = w/2, up = -1;            // double door, swings OUTWARD
    var st = 'style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.6"';
    return '<g class="estate-entry-door">' +
      '<line x1="'+ax+'" y1="'+wy+'" x2="'+bx+'" y2="'+wy+'" class="wall-cutout"/>' +
      '<path d="M '+ax+' '+wy+' L '+ax+' '+(wy+up*hw)+' A '+hw+' '+hw+' 0 0 1 '+cx+' '+wy+'" '+st+'/>' +
      '<path d="M '+bx+' '+wy+' L '+bx+' '+(wy+up*hw)+' A '+hw+' '+hw+' 0 0 0 '+cx+' '+wy+'" '+st+'/></g>';
  }
  function _loadWall(roomRects, lastCi, tune) {                             // heaviest room thickens ITS outer wall
    var heavy = null;
    roomRects.forEach(function (r) { if (!heavy || r.weight > heavy.weight) heavy = r; });
    if (!heavy || heavy.weight <= 0) return '';
    var sw = SHELL_TUNE.envWeight + heavy.weight * tune.weightGain;
    var glow = Math.min(0.5, 0.15 + heavy.weight * 0.004), blur = 4 + heavy.weight * 0.08, out = '';
    _roomExteriorEdges(heavy, lastCi).forEach(function (e) {
      out += '<line class="estate-loadwall" x1="'+e.x0+'" y1="'+e.y0+'" x2="'+e.x1+'" y2="'+e.y1+
             '" style="stroke:var(--teal-mid);stroke-width:'+sw+'px;opacity:0.95;filter:drop-shadow(0 0 '+blur+'px rgba(29,158,117,'+glow+'))"/>';
    });
    return out;
  }
  function _stairs(roomRects, tune) {                                        // ONE stair for the home (by the Vault)
    if (!tune.stairs) return '';
    var room = null;
    for (var k = 0; k < roomRects.length; k++) { if (/vault/i.test(roomRects[k].meta || '')) { room = roomRects[k]; break; } }
    if (!room) roomRects.forEach(function (r) { if (!room || r.w*r.h > room.w*room.h) room = r; });
    if (!room) return '';
    var n = 5, gw = Math.min(40, room.w*0.3), gh = Math.min(44, room.h*0.3);
    var x = room.x + room.w - gw - 12, y = room.y + 12, out = '';
    out += '<rect x="'+x+'" y="'+y+'" width="'+gw+'" height="'+gh+'" style="fill:none;stroke:var(--teal-mid);stroke-width:1;opacity:0.5"/>';
    for (var i = 1; i < n; i++) { var ty = y + i*(gh/n); out += '<line x1="'+x+'" y1="'+ty+'" x2="'+(x+gw)+'" y2="'+ty+'" style="stroke:var(--teal-mid);stroke-width:1;opacity:0.5"/>'; }
    return '<g class="estate-stairs">'+out+'</g>';
  }
  function _chrome(colInfo, lastCi, tune) {                                  // CAD chrome — OFF by default, cuttable
    if (!tune.chrome || !colInfo.length) return '';
    var nx = colInfo[lastCi].x + colInfo[lastCi].w + 42, ny = colInfo[0].top + 12;
    return '<g class="estate-chrome" style="stroke:var(--teal-mid);stroke-width:1;fill:none;opacity:0.45">' +
      '<line x1="'+nx+'" y1="'+(ny+30)+'" x2="'+nx+'" y2="'+ny+'"/>' +
      '<path d="M '+(nx-5)+' '+(ny+8)+' L '+nx+' '+ny+' L '+(nx+5)+' '+(ny+8)+'"/>' +
      '<text x="'+nx+'" y="'+(ny-5)+'" style="fill:var(--teal-mid);stroke:none;font:10px monospace;text-anchor:middle">N</text></g>';
  }

  function renderEstate(ctx) {
    var svgContainer = ctx.svgContainer;
    var getBaseType = ctx.getBaseType;
    var isShocked = ctx.isShocked, isThermal = ctx.isThermal, isDatum = ctx.isDatum,
        isMeasured = ctx.isMeasured, isRouting = ctx.isRouting;
    var cols = ctx.cols, propertyAccount = ctx.propertyAccount,
        trustAccounts = ctx.trustAccounts, grandTotal = ctx.grandTotal;
    var grossEstateVal = ctx.grossEstateVal;
    var accountWeights = ctx.accountWeights || {};   // S2.4 — read from hub (LOCK-3, never recompute)
    var newRoomToTrace = null;
    var descriptors = [];                            // S2.4 — the ONE canonical hook surface (§16.2-iii)
    var roomRects = [], colInfo = [];                // Phase A — fed to the estate shell (walls drawn once)

    // IDEA-1 — LINKED DEBT -> ASSET merge (renderer-only, LOCK-3 read-only). A debt that links to a
    // PRESENT, non-excluded PHYSICAL asset merges VISUALLY onto that asset: its own box is suppressed,
    // the asset reads RED-MARKED with a dual label + NET EQUITY (asset - debt) on the face. We only
    // READ linkedAssetId here; suppression + net-equity are DISPLAY-ONLY — grandTotal/Shape/all totals
    // were computed by the host (link-agnostic) BEFORE this renderer ran, so nothing here moves a total.
    var _accts = ctx.accounts || [];
    // §18.6 — ALL linked liens merge onto their asset (was first-link-wins). Every linked debt is suppressed AND
    // its balance subtracts from the asset for a TRUE net equity (Property Copy Bank §0.4 R9 / §1.2 R13). L47: a
    // lien with no sourced balance contributes 0 to the sum (never guessed) though it's still named (it IS linked).
    var _mergeDebtsByAsset = {};   // assetId -> [all linked debts, first-lien (mortgage) first]
    var _suppressedDebt = {};      // debt id -> true (don't draw its own box; it lives on the asset now)
    _accts.forEach(function (a) {
      if (a.exclude || !a.linkedAssetId) return;
      var ab = getBaseType(a.baseId);
      if (!ab || ab.taxCode !== 'debt') return;
      var asset = null;
      for (var i = 0; i < _accts.length; i++) { if (_accts[i].id === a.linkedAssetId && !_accts[i].exclude) { asset = _accts[i]; break; } }
      if (!asset) return;                                   // linked-to-absent/excluded -> plain box (fallback)
      var sb = getBaseType(asset.baseId);
      if (!sb || sb.taxCode !== 'physical') return;         // only physical merge targets (matches link <select>)
      (_mergeDebtsByAsset[asset.id] = _mergeDebtsByAsset[asset.id] || []).push(a);
      _suppressedDebt[a.id] = true;
    });
    function _lienRankE(a) { var id = String((getBaseType(a.baseId) || {}).id || ''); return id.indexOf('mortgage') === 0 ? 0 : (id.indexOf('heloc') === 0 ? 1 : 2); }
    Object.keys(_mergeDebtsByAsset).forEach(function (k) { _mergeDebtsByAsset[k].sort(function (x, y) { return _lienRankE(x) - _lienRankE(y); }); });
    /* ⬆️ THE SIX LIEN HELPERS MOVED TO MODULE SCOPE (see above _roomTileSVG). They are PURE —
       arguments plus getBaseType, no render state — and the shared room-tile emitter needs them.
       ⛔ _visibleCol STAYS HERE: it closes over _suppressedDebt, which is per-render. */
    function _visibleCol(list) { return list.filter(function (a) { return !_suppressedDebt[a.id]; }); }

    svgContainer.innerHTML = '';
      // DRAWING PHYSICS: PROPORTIONAL SQUARIFY RENDERING
      let gX = 200, gY = 160, gW = 1000, gH = 850; 
      let pVal = propertyAccount ? propertyAccount.value || 0 : 0;
      let pValStr = pVal >= 1000000 ? '$'+(pVal/1000000).toFixed(2)+'M' : (pVal >= 1000 ? '$'+(pVal/1000).toFixed(0)+'k' : (pVal > 0 ? '$'+pVal : ''));

      // IDEA-1 — if a mortgage links to THIS property, the Grounds become "THE MOAT": equity-colored,
      // dual label, NET EQUITY on the face, clickable -> property modal (which already lists the debt).
      // The Grounds finally carry COLOR regardless of link: a teal gradient fill like every other block,
      // flipping to red only when a linked mortgage is UNDERWATER. The dashed boundary (drawn after the
      // rooms, so it can step around the north entry jut) matches that same color. All display-only.
      let _moatDebts = propertyAccount ? (_mergeDebtsByAsset[propertyAccount.id] || []) : [];
      let _moatEq = _moatDebts.length ? _netEquityOf(propertyAccount.value, _moatDebts) : null;
      let _grUnderwater = (_moatEq !== null && _moatEq < 0);
      let _grGrad = _grUnderwater ? 'fillGradDebt' : 'fillGradAsset';      // teal default, red underwater
      let _grLine = _grUnderwater ? 'var(--danger)' : 'var(--teal-mid)';   // dashed boundary + label accent
      let _grValColor = _grUnderwater ? 'var(--danger)' : 'var(--gold)';   // R3: gold positive, red underwater
      // The grounds FILL + dashed boundary are drawn AFTER the rooms (deferred below) so the fill can
      // frame the estate (footprint punched out — no bleed-through) and follow the entry jut outside.
      // This early group carries only the label/title + an invisible .grounds-rect anchor.
      let gSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      if (_moatDebts.length) {
          // §1.5 THE YARD — 3-line stack applied to the EXISTING merged tile (Correction B: reuse this tile, no new art).
          // §12.12 — line 2's FIRST token follows the Property §19.1 room map; the lien tokens after it
          // are unchanged on every purpose. Line 1 (below) follows the Yard §12.1 combined map. Two maps,
          // one source of truth each, neither re-derived here.
          let _grLabel = _roomNameOf(propertyAccount, getBaseType(propertyAccount.baseId)).toUpperCase() + _lienMetaSuffix(_moatDebts);
          let _eqFig = (parseFloat(propertyAccount.value) || 0) > 0 ? _eqStr(_moatEq) : '';                      // sourced-or-blank: no home value → label with no figure (L47, R86)
          gSVG.innerHTML = `
          <title>${_combinedNameOf(propertyAccount)} — this property and its linked debts, combined. Click for the true cost of ownership.</title>
          ${_linkChipSVG(gX + gW/2 - 13, gY + gH - 82, _lienMirrorNotice(_moatDebts, 'property'))}
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 48}" class="grounds-title" style="fill: ${_grLine}; font-size:20px; letter-spacing:0.16em;">${_combinedNameOf(propertyAccount).toUpperCase()}</text>
          <text x="${gX + gW/2}" y="${gY + gH - 26}" class="grounds-title" style="fill: ${_grLine}; opacity:0.85;">${_grLabel}</text>
          <text x="${gX + gW/2}" y="${gY + gH - 6}" class="grounds-title" style="fill: ${_grValColor}; font-size:14px;">Net Equity: ${_eqFig}</text>
      `;
      } else if (propertyAccount) {
          /* THE GROUNDS — a primary residence has taken the ground, but carries no lien yet. */
          gSVG.innerHTML = `
          <title>Physical asset footprint.</title>
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 30}" class="grounds-title">THE GROUNDS</text>
          <text x="${gX + gW/2}" y="${gY + gH - 10}" class="grounds-title" style="fill: var(--gold); font-size:16px;">${pValStr}</text>
      `;
      } else {
          /* ── THE PLOT — EMPTY GROUND, NO PROPERTY YET ────────────────────────────────────────────
           * ONE OBJECT, THREE STATES: THE PLOT (empty) -> THE GROUNDS (a home stands on it) -> THE
           * YARD (that home carries a lien). Architect-ratified 2026-08-02, the Captain's word.
           * This used to read "THE GROUNDS" on a brand-new Studio with a value line that was blank,
           * so an empty estate announced grounds nobody owned and it read as a room — the Captain
           * reported it as a phantom room, and he was right that it was confusing rather than wrong.
           * A LABEL THAT CHANGES WHEN THE THING CHANGES CANNOT BE MISTAKEN FOR A STATIC ROOM, which
           * is precisely why the state model dissolves the objection to a land-word.
           * NO VALUE LINE — there is nothing to value. NO <title> — the old tooltip ("Physical asset
           * footprint") is a claim about a property that does not exist, and inventing replacement
           * copy is not mine to do; if empty ground should say something on hover, the Architect
           * authors it. NON-CLICKABLE CHROME, as ruled: pointer-events stay off. */
          gSVG.innerHTML = `
          <rect x="${gX}" y="${gY}" width="${gW}" height="${gH}" class="grounds-rect" style="stroke:none; fill:none; pointer-events:none;" />
          <text x="${gX + gW/2}" y="${gY + gH - 30}" class="grounds-title">THE PLOT</text>
      `;
      }
      svgContainer.appendChild(gSVG);

      // SURGICAL: Datum Line Rendering — RETIRED. isDatum is repurposed to the SEQUENCE RISK lens,
      // which is energizer-owned (datum-energize.js sequence(): lift + (1)(2)(3) badges + RISK LADDER).
      // The flat spend-line is suppressed; the button still reads "Datum Elevation" until the step-3
      // host relabel. Kept disabled (not deleted) so step-3 can rule on the line's fate.
      if (false && isDatum) {
          let spendStr = ctx.spendInputEl.value;
          let spendVal = parseInt(spendStr.replace(/[^0-9]/g, ''), 10) || 0;
          let datumY = (gY + gH) - Math.min((spendVal / 250), gH); 
          let dSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          dSVG.innerHTML = `
              <line x1="${gX - 50}" y1="${datumY}" x2="${gX + gW + 50}" y2="${datumY}" stroke="var(--danger)" stroke-width="2" stroke-dasharray="10 5" opacity="0.8" />
              <text x="${gX - 60}" y="${datumY + 4}" font-family="var(--font-mono)" font-size="12" fill="var(--danger)" text-anchor="end" font-weight="bold">DATUM: $${spendVal.toLocaleString()}</text>
          `;
          svgContainer.appendChild(dSVG);
      }

      // SURGICAL: GENERATIONAL TRUST WING RENDER (Purple Shield Styling)
      if (trustAccounts.length > 0) {
          /* ── §22.2 · THE WING COMES BACK ONTO THE CANVAS, AND THE TILES BECOME EQUALS ──────────
           * MEASURED 2026-08-10 on the shipped build, in the real renderer: the wing ring sat at
           * x[1260,1540] and its tiles at x[1280,1520] against a viewBox that ends at 1400 — 140 and
           * 120 units OUTSIDE. Half of every trust tile was off the canvas.
           *
           * ⛔ IT WAS NOT "MAXED OUT", IT WAS CLIPPED, AND ONLY A WIDE WINDOW HID IT. `.canvas-wrapper`
           * is `overflow-x:hidden` and NO horizontal scroll exists anywhere on the page
           * (scrollWidth == clientWidth at every size), so the lost pixels are unrecoverable — not
           * off-screen-but-scrollable. Measured across viewports, one trust + two properties:
           *     2560x1440  261px to spare      1920x1080  CUT 43px      1680x1050  CUT 103px
           *     1536x864   CUT 74px            1440x900   CUT 82px      1366x768   CUT 76px
           *     1280x800   CUT 69px            1024x1366  CUT 47px
           * Seven of eight, including the most common desktop size there is. A user at 125% zoom on a
           * 1920 screen is the 1536 row — same monitor, loses the right edge of their trusts by
           * zooming in. The Captain's own smoke screen is ~2560 wide: the one case with slack.
           *
           * THE FREE SPACE IS SYMMETRIC — left x[0,200), right x[1200,1400], 200 units each — so the
           * trust tile now MIRRORS the satellite exactly: 15 units to the grounds, 170 wide, 15 to the
           * canvas edge. The ring takes 10 of those 15 on each side.
           *
           * ⛔ THE OLD NOTE — ~~*"width parity is impossible (the grounds start at gX=200), and the
           * asymmetry was explicitly accepted"*~~ — WAS WRONG, and it is STRUCK RATHER THAN DELETED so
           * nobody re-derives it. Parity is impossible AT 240: nothing matches 240 on a 200-unit band.
           * 170 was always available, and it is the SAME change that puts the wing back on the canvas.
           * 🔑 A CONSTRAINT THAT IS ONLY TRUE OF THE NUMBER YOU HAPPENED TO PICK IS NOT A CONSTRAINT. */
          let tX = gX + gW + 5;     // 1205 — ring x[1205,1395], 5 units of air to the canvas edge
          let tW = 190;
          /* ── §22.3 · THE CAPTION MOVES INSIDE THE ROOM — BY GROWING THE ROOM, NOT SHRINKING THE BAND.
           * The Captain smoked §22.2, passed it, and rejected one thing: "I do not like the copy
           * 'generation trust wing' being outside of the room... just like we do when we have a Yard
           * Mortgage going on — that copy manages to fit inside the boxes."
           *
           * ⛔ THE NAMED DONOR IS DEFECTIVE AND WAS NOT COPIED. MEASURED 2026-08-10, the Yard caption
           * does NOT reserve space for itself: it is drawn at a FIXED y (966..1005) and the grounds
           * room grid simply runs over it. Measured, one property plus N accounts:
           *     n<=11 rooms end 930 (clear) · n=12 ends 1080 (over the caption)
           *     n=14 ends 1230 · n=18 ends 1530 · n=24 ends 1980   <- 130/430/880 units OUTSIDE the viewBox
           * So "it manages to fit inside the box" is true only below 12 accounts. Copying that
           * mechanism would have given this wing the same latent bug. REPORTED SEPARATELY; the grounds
           * overflow is a real user-facing defect and it is NOT fixed here (out of scope: fixing the
           * Yard side was explicitly excluded).
           *
           * ✅ §22.4 — THE CAPTION IS GONE, AND THAT IS THE CAPTAIN'S RULING, NOT A LAYOUT DEFEAT.
           * The chase went: caption outside the box -> caption inside the dashed box (§22.3) -> "the
           * actual room is still the size it was; can it be inside the SOLID box?" The honest answer
           * was that the satellite tile renders a two-line label INSIDE itself and the trust tile
           * never had that ability — one side had a feature the other lacked. Given the choice
           * between repeating a wing-level label inside every trust room, printing it in only one of
           * them, or dropping it, the Captain ruled: DROP IT. "lets drop the wing for parity, not
           * needed."
           * 🔑 THE DECIDING ARGUMENT WAS SYMMETRY, AND IT CAME FROM THE CANVAS ITSELF: THE LEFT WING
           *    HAS NO CAPTION. There is no "REAL ESTATE WING" label over the satellites. Once every
           *    room names itself, a wing-level label is the odd one out — the caption was never
           *    carrying information the rooms did not already carry.
           * ⚠️ THIS REMOVES AUTHORED COPY ("GENERATIONAL TRUST WING"). Under the Copy Bank rules the
           * Architect authors and the Captain holds the sole GO; the GO was given explicitly. Flagged
           * here so the removal is visible in the code and not only in a commit message.
           * The dashed shield boundary STAYS — he asked to drop the caption, not the wing.
           *
           * WHAT SURVIVES FROM §22.3, AND WHY IT IS NOT REVERTED-BY-ACCIDENT: the container returns to
           * y[160,1010] because _tCapH existed ONLY to enclose the caption. The tile band was never
           * touched by §22.3, so §22.2's parity is unaffected either way — satellite 830 == trust 830.
           *
           * ~~"⚠️ MEASURED ALONG THE WAY, TRUE, AND UNFIXED: trust tiles do NOT scale their type at
           * all ... at 12 trusts a 58-unit tile still carries a 32px value, so the value overflows
           * its own tile. Reported, not fixed — it wants the same treatment on its own beat."~~
           * ✅ THIS IS THAT BEAT — §26. The pair (_tileTypeScale for height, _fitPxShared for width)
           * is promoted to this wing below. The overflow was real and the old note understated it:
           * measured, the wing spills from TEN trusts, not twelve, because the ink needs 77.6 units
           * and not the 62.5 §22.7 recorded. ⛔ HEIGHT AND WIDTH TOGETHER OR NEITHER — and "together"
           * means UNDER THE SAME CONDITIONS, not merely in the same commit. */
          let tSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          tSVG.innerHTML = `
              <rect x="${tX}" y="${gY}" width="${tW}" height="${gH}" class="grounds-rect" stroke-dasharray="6 6" stroke="var(--shield)" stroke-width="2" fill="rgba(138, 100, 255, 0.05)" onmouseenter="showTrustTooltip(event)" onmouseleave="hideTrustTooltip()"/>
          `;
          svgContainer.appendChild(tSVG);
          
          let tTotals = 0; 
          trustAccounts.forEach(a => { 
              let v = Math.max(Math.abs(a.value||0),1000); 
              a._renderVal=v; 
              tTotals+=v;
          });
          
          /* ── §26 · THE TRUST CAP IS 9, AND 9 IS DERIVED — IT IS WHERE THIS BAND'S FLOOR RUNS OUT ──
           * THE ARITHMETIC, IN FULL, SO IT CANNOT ROT INTO A PREFERENCE:
           *   the band is y[gY+20, gY+gH] = 830 units, gap 12, floor 75 (the _bandLayout call below).
           *   pool(n) = 830 - 12(n-1) = 842 - 12n           <- space the TILES may occupy
           *   the 75-unit floor is affordable while  842 - 12n >= 75n  =>  842 >= 87n  =>  n <= 9.68
           *   => 9. Browser measurement agrees exactly: last contained count 9, first overflow 10.
           * 🔑 THE CAP IS NOT A POLICY — IT IS THE PLACE WHERE `_bandLayout` STOPS BEING ABLE TO PAY
           *    ITS OWN FLOOR. The floor WAS the readability threshold all along; nobody had connected
           *    the two, which is why 11 and 7 were both floated and both wrong for this wing.
           *
           * ⛔⛔ DO NOT READ THIS AS A LAW BOTH WINGS OBEY — IT IS NOT, AND THE DIFFERENCE IS
           * DELIBERATE. The first floor's `_COL_CAP = 11` sits at 750/11 = 68.2 units per slot, which
           * is ALREADY BELOW its own 75 floor: that column deliberately runs one room PAST the point
           * this wing stops at. The Architect ruled it there on 2026-08-11 and the reason is a house
           * law — A THIN ROOM YOU CAN SEE BEATS A MISSING ROOM YOU CANNOT. Anyone who "harmonises"
           * these two numbers by lowering 11 to match 9 is undoing a ruling, not fixing an
           * inconsistency. 🔑 A NUMBER WITHOUT ITS DERIVATION ROTS; A NUMBER WHOSE NEIGHBOUR HAS A
           * DIFFERENT DERIVATION ROTS FASTER — so both derivations are written down, here, together.
           *
           * ⚠️ AND THIS CAP IS NOT AN OVERFLOW FIX. It was measured as one, but `77c9f0b`/`980689e`
           * closed the overflow the other way (the type now scales with the tile) and the wing is
           * contained at EVERY count 1..14 today. What is left is dignity, not containment: below the
           * 75-unit floor a trust room is a sliver with shrunken type. The Captain ruled 9 on that
           * basis, knowing 10 was defensible, on 2026-08-12. ⛔ Do not "restore" a lost room here
           * believing you are fixing a spill — there is no spill.
           *
           * ⚠️⚠️ THE SELECTOR THIS CAP INHERITS, RECORDED BECAUSE IT IS NOT MINE. Membership of this
           * wing is decided UPSTREAM, in studio.html's first pass:
           *     } else if (base.taxCode === 'trust' && acc.trustType !== 'Revocable')
           * That is THE RELIQUARY ONLY (`id:'trust'`). THE PARLOR — the revocable trust, authored in
           * full in the Copy Bank and completely UNWIRED (`reg:null`, absent from `_LIVE_LEAVES`) — is
           * specified as `id:'revtrust'`, `taxCode:'passthru'`, and would fail that test on the
           * taxCode alone. It therefore CANNOT reach this wing, this cap, or the word "trusts" on the
           * door below. ⛔ IF THE PARLOR IS EVER GIVEN `taxCode:'trust'`, THIS CAP AND THIS COPY
           * INHERIT IT SILENTLY — and the two rooms route OPPOSITELY (The Reliquary renders outside
           * the estate; The Parlor renders inside it at full value), so one door would be making one
           * promise across two different totals. Re-derive both before widening that selector. */
          var _TRUST_CAP = 9;
          var _tShown = trustAccounts, _tHidden = 0, _tFolded = [];
          if (trustAccounts.length > _TRUST_CAP) {
              _tShown  = trustAccounts.slice(0, _TRUST_CAP - 1);   // the last slot belongs to the door
              _tHidden = trustAccounts.length - _tShown.length;
              _tFolded = trustAccounts.slice(_tShown.length);
          }
          /* The door takes a REAL band slot weighted by everything it stands for, so the stack still
             fills the band exactly — the same rule both other collapse surfaces follow. */
          var _tWeights = _tShown.map(function (a) { return a._renderVal; });
          if (_tHidden > 0) {
              var _tHidTot = 0;
              _tFolded.forEach(function (a) { _tHidTot += a._renderVal; });
              _tWeights.push(_tHidTot);
          }

          /* §22 — the wing now subdivides through the SHARED _bandLayout instead of its own math.
             The old form (availH = gH - 100; h = 75 + availH*share) paid every tile a 75-unit floor
             AND handed out the entire pool as remainder, so the stack summed to 75n + pool: correct
             at one trust, 82 units past the band at two, and 79 units outside the viewBox at three.
             Same band as the satellite wing by construction — y[gY+20, gY+gH] — which is what makes
             one trust and one property come out at the identical height instead of merely similar. */
          var tRows = _bandLayout(gY + 20, gY + gH, 12, 75, _tWeights);

          _tShown.forEach((acc, tI) => {
              let base = getBaseType(acc.baseId);
              let h = tRows[tI].h;
              let cY = tRows[tI].y;
              /* §22.2 — inset 10 (was 20), so the tile lands at x[1215,1385] w=170: an EXACT mirror of
                 the satellite's x[15,185]. The centre moves 1400 -> 1300, which fixes a second thing
                 found while measuring this: the title was centred ON the canvas edge, so 69 units of
                 "THE RELIQUARY" sat outside the viewBox in EVERY state, at every trust count, always. */
              let d = { x: tX + 10, y: cY, w: tW - 20, h: h, cx: tX+10+(tW-20)/2, cy: cY+h/2 };
              if(acc.isNew) newRoomToTrace = d;
              
              let valStr = acc.value >= 1000000 ? '$'+(acc.value/1000000).toFixed(2)+'M' : (acc.value >= 1000 ? '$'+(acc.value/1000).toFixed(0)+'k' : (acc.value > 0 ? '$'+acc.value : ''));
              
              let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
              g.setAttribute('class', `room-grp visible trust-room`); 
              g.style.cursor = 'pointer'; 
              g.setAttribute('onclick', `openAccountModal('${acc.id}')`);
              
              let taxClass = isThermal ? `tax-${base.taxCode}` : '';
              let animClass = acc.isNew ? 'animate-draw' : '';

              /* §26 — THE PAIR, PROMOTED TO THIS WING. Height and width, under the SAME conditions.
                 ⛔ NOT the emitter itself: this tile is still its own template, so the shared thing
                 here is the SCALING LAW, which is the thing the pair rule governs. Unifying this
                 emitter with _roomTileSVG is a real follow-up (the shapes already match) but it
                 would also change valStr's formatting on the edges — raw vs shocked value, and
                 '$'+v vs Math.round — so it is FLAGGED, not smuggled into a type-scaling commit. */
              let _tS = _tileTypeScale(h);
              let _tTitle = _roomNameOf(acc, base).toUpperCase();
              let _tTitlePx = _fitPxShared(_tTitle, 14 * _tS, d.w);
              let _tValPx = Math.round(32 * _tS * 10) / 10;

              // S2.4 — trusts HOLD capital (fill) but are non-investable (weight 0, not load-bearing).
              let weight = accountWeights[acc.id] || 0;
              let fp = fillPct(acc.value || 0);
              let fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
              g.style.setProperty('--weight', weight);
              let fillHTML = fp > 0 ? `
                  <rect x="${d.x}" y="${fillY}" width="${d.w}" height="${fillH}" class="room-fill" fill="url(#fillGradAsset)" />` : '';

              g.innerHTML = `
                  <title>${base.desc}</title>
                  <rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" class="room-rect active ${taxClass} ${animClass}" />
                  ${fillHTML}
                  <text x="${d.cx}" y="${d.cy - 10 * _tS}" class="bp-title" style="fill:var(--shield); font-size:${_tTitlePx}px">${_tTitle}</text>
                  <text x="${d.cx}" y="${d.cy + 30 * _tS}" class="bp-val" style="fill:var(--white); font-size:${_tValPx}px">${valStr}</text>
              `;
              svgContainer.appendChild(g);
              descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: false, isInvestment: !!base.isInvestment, isPriority: !!acc.isPriority });
              // no cursor advance — _bandLayout already owns every y. Advancing here as well is how
              // two positioning authorities drift apart.
          });

          /* ── §26 · THE DOOR. ⛔ NEVER THE CAP ALONE ────────────────────────────────────────────
           * A CAP WITHOUT A DOOR IS HOW THE COLLAPSE TILE WAS BORN DEAD — twice, in this file, and
           * neither was noticed for months. This is collapse surface #3 and it ships WITH its verb.
           *
           * ⛔ NO STAIRCASE GLYPH, AND THAT IS THE NAMING RULING MADE VISUAL. A PLACE-WORD IS EARNED
           * BY DISAPPEARANCE: the column rooms VANISH, so they get stairs and "the 2nd floor". The
           * trusts are a wing the user is already looking at, so this door leads ACROSS, not UP.
           * Drawing stairs here would say the one thing the Captain ruled against.
           *
           * PURPLE BY INLINE FILL, NOT BY THE `trust-room` CLASS — measured, and the class was the
           * obvious wrong move. `.blueprint-svg.thermal-mode .room-grp.trust-room .room-rect` paints
           * a FILL, so under the tax lens this door would have read as a room holding money. It holds
           * none: it quotes no balance because you cannot open INTO it. The wing's own tiles already
           * set `fill:var(--shield)` inline (see the title above), so this matches how the wing
           * actually works rather than how its CSS happens to be keyed.
           * ⛔ pointer-events:all VIA _makeFoldDoor IS LOAD-BEARING — an SVG rect with no fill is
           * hit-testable ONLY ON ITS STROKE, which is precisely how surfaces #1 and #2 shipped as
           * 1px outlines of a click target with a hole in the middle. */
          if (_tHidden > 0 && tRows.length === _tWeights.length) {
              var _tcRow = tRows[tRows.length - 1];
              var _tcD = { x: tX + 10, y: _tcRow.y, w: tW - 20, h: _tcRow.h };
              /* ⛔ AUTHORED COPY, VERBATIM (L47). ⚠️ SINGULAR IS AUTHORED AND UNREACHABLE BY
                 CONSTRUCTION: _tShown is _TRUST_CAP - 1 = 8 and this door exists only above
                 _TRUST_CAP = 9, so _tHidden is 2 AT MINIMUM and can never be 1. Wired regardless —
                 A CAP IS A NUMBER, NOT A PROMISE, and the day the cap moves the string must already
                 be right. ⛔ NEVER RECORD EITHER SINGULAR AS SMOKED; no fixture can reach them. */
              var _tcL = '+' + _tHidden + (_tHidden === 1 ? ' more trust' : ' more trusts');
              /* WIDTH ONLY, AND THE PAIR RULE IS NOT VIOLATED — IT IS INAPPLICABLE, WHICH IS A
                 DIFFERENT THING AND WORTH SAYING. _tileTypeScale is the HEIGHT half of the §26 pair
                 and it exists to stop a two-line name+value stack (77.6 units of ink) overrunning a
                 short tile. This door carries ONE line and no value, and its slot is >= 75 units by
                 the cap's own derivation, so there is no stack to compress. Fixed 14px, width-fitted
                 — byte-for-byte the treatment the first floor's own collapse tile gets. */
              var _tcPx = _fitPxShared(_tcL, 14, _tcD.w);
              /* ⛔ THE §22.1 FLOOR OUTRANKS THE FIT. Unreachable TODAY (at tW-20 = 170 units even
                 "+999999 more trusts" fits above 11px) — but §23b converts the width constants to
                 expressions, which is exactly when a provably-safe assumption stops being one. */
              if (_tcPx <= 8 && String(_tcL).length * 0.75 * 8 > (_tcD.w - 6)) {
                  console.warn('[estate §26] trust collapse tile cannot fit "' + _tcL + '" at the 8px floor in a ' +
                      Math.round(_tcD.w) + '-unit tile — drawing it anyway; STOP AND FLAG per §22.1.');
              }
              /* ⛔ AUTHORED VERBATIM. "total square footage" IS THE ESTATE TOTAL — grandTotal, which
                 studio.html accumulates over every non-excluded account and which no trust setting
                 can reduce. It is NOT the DatumShape spend total, from which trusts are excluded by a
                 static investable-bucket rule (SHAPE_EXCLUSION_NOTE is display-only micro-copy — "No
                 logic / no total" — not a user toggle). TWO DIFFERENT TOTALS, TWO DIFFERENT PROMISES;
                 this sentence makes the one that is true. Guarded permanently by
                 _gate_estate_all_counted_is_drawn's trust ESTATE-total leg.
                 ── §25.5 · THE ACCESSIBLE NAME IS ITS OWN STRING. "Click" is a word about a mouse,
                 not about meaning; a control's accessible name says what it DOES, never how to
                 operate it. ⭐ The counted-in-your-total clause stays in BOTH — it is the entire
                 reason this tile may exist without a balance on its face. */
              var _tcLead = _tHidden + (_tHidden === 1 ? ' more trust' : ' more trusts') +
                  '. They are all counted in your total square footage.';
              var _tcTip  = _tcLead + ' Click to open them.';
              var _tcAria = _tcLead + ' Opens the trusts.';
              var _tcg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              /* ⭐ `data-collapsed-count` IS THE CONTRACT, NOT A DEBUG ATTRIBUTE. _gate_estate_fold_doors
                 DERIVES its population from this attribute precisely so surface #3 cannot be born
                 dead — carrying it is what enrolls this door in every door check that already exists. */
              _tcg.setAttribute('class', 'room-grp visible trust-collapse');
              _tcg.setAttribute('data-collapsed-count', String(_tHidden));
              _tcg.innerHTML =
                  '<title>' + _tcTip + '</title>' +
                  '<rect x="' + _tcD.x + '" y="' + _tcD.y + '" width="' + _tcD.w + '" height="' + _tcD.h +
                      '" class="room-rect active" style="stroke-dasharray:4 4; stroke:var(--shield);" />' +
                  '<text x="' + (_tcD.x + _tcD.w / 2) + '" y="' + (_tcD.y + _tcD.h / 2 + 5) +
                      '" class="bp-title" style="fill:var(--shield); font-size:' + _tcPx + 'px;">' + _tcL + '</text>';
              /* §25.4 — THE TRUSTS ARE DRAWN, NOT LISTED. Same shared emitter the second floor uses,
                 so a trust behind this door cannot drift from how it looks in the wing.
                 ⚠️ TWO COSMETIC EDGE CASES, MEASURED AND PARKED BY THE ARCHITECT (2026-08-12), NOT
                 OVERLOOKED: this emitter formats from Math.abs(value) while the wing's own template
                 reads acc.value raw, so a trust below $1,000 (rounding) or negative (blank vs figure)
                 would render its FIGURE slightly differently here. ⛔ THE SHOCK LENS IS **NOT** ONE OF
                 THEM — checked, not assumed: `isVolatile` is `base.isInvestment || taxCode==='liquid'`
                 and the trust base is neither, so shockMult is 1 on both paths at every count.
                 ⛔ THE TRUST EMITTER STAYS ITS OWN TEMPLATE. Unifying it would move valStr on those
                 same edges — flagged for its own beat, never smuggled into a cap commit.
                 ⛔ mergedOf IS null DELIBERATELY: a trust carries no lien, and the wing tile is
                 unconditionally openAccountModal, so the picker matches the tile by matching its
                 absence of a branch. */
              var _tcFloorTile = function (acc, d) {
                  var b = getBaseType(acc.baseId);
                  if (!b) return null;
                  return _roomTileSVG(acc, b, d, {
                      isShocked: isShocked, isThermal: isThermal, ownStroke: true, anim: false,
                      mergeByAsset: _mergeDebtsByAsset, weights: accountWeights
                  });
              };
              /* ⛔ THE FOLDED SET IS PASSED EAGERLY, AND THAT IS CORRECT HERE RATHER THAN AN
                 OVERSIGHT. §25.7's second floor resolves LAZILY because a column's tile is built
                 before the later columns have folded anything. This wing is ONE band, fully resolved
                 above, and it does NOT report to `_upstairs` — the trusts are their own place, not
                 part of the house's upstairs, which is the same ruling that denied them the stairs. */
              _makeFoldDoor(_tcg, _tFolded, 'THE TRUSTS',
                  function (n) { return n + (n === 1 ? ' trust' : ' trusts') + ' here. Pick one to enter it.'; },
                  _tcAria, null, _tcFloorTile);
              svgContainer.appendChild(_tcg);
          }
      }

      /* ── SATELLITE PROPERTY BLOCKS — STEP 3b ────────────────────────────────────────────────────
       * Every property that is NOT the ground owner is drawn OUTSIDE the estate, on its own ground.
       * Before step 2 a second property was drawn NOWHERE while its money still counted in the total;
       * step 2 bought VISIBILITY by parking it in an ownership column INSIDE the estate, which was
       * always stated as temporary. This is the step that ends it.
       *
       * WHY THE LEFT BAND, MEASURED 2026-08-03 — and it is the whole reason this commit needs no
       * canvas resize. Inside the viewBox the free space is: LEFT x[0,200) 200x850, empty in every
       * state; RIGHT x[1200,1400) 200 wide but the Trust Wing already claims 1260-1540 whenever a
       * trust exists; BELOW y[1010,1100) just 90 units against a 75-unit minimum room height. So the
       * left band is the ONLY uncontended space, and it is uncontended at EVERY viewport.
       *
       * 🔑 INSIDE THE viewBox IS THE WHOLE POINT. Content outside it still PAINTS (.blueprint-svg is
       * overflow:visible) but survives only on slack that fitToScreen happens to leave — measured at
       * 406 user units on one screen and 0 on another, on the same machine, by window width alone.
       * A satellite placed out there would be drawn or not drawn depending on the user's window,
       * which re-creates the exact defect this arc exists to close. Inside the viewBox is GUARANTEED
       * on screen, because fitToScreen fits the whole box by construction. Never place a room that
       * carries money outside it.
       *
       * ⚠️ THE SINGLE-BAND STACK IS A GEOMETRY CONSTRAINT, NOT THE DESIGN — DEFERRED, NOT ABANDONED.
       * The wing split below is the correct end state and becomes cheap once the canvas is
       * re-proportioned. Do not read this code as the intent.
       *
       * ⚠️ I NARROWED THE ARCHITECT'S RULING 5 AND AM FLAGGING IT RATHER THAN BURYING IT. He ruled
       * wing decides WHERE: Primary-owned left, Co-owned right, Joint-owned centered below. Measured,
       * two of those three bands do not exist yet — right collides with the Trust Wing, below is 90
       * units. So ALL satellites stack in the left band in creation order for now. Restoring the full
       * three-band split is a small change once the canvas is re-proportioned (the sequenced step
       * after the drafting-panel divider), which is when the space actually appears.
       *
       * A LIEN LINKED TO A SATELLITE IS ALREADY SUPPRESSED from the columns by _suppressedDebt above,
       * independent of placement. So the tile MUST carry net equity — otherwise moving the property
       * out here would silently delete its mortgage from the picture. Same failure class, one level
       * down. */
      var satellites = (ctx.satelliteProperties || []).filter(function (a) { return !!getBaseType(a.baseId); });
      if (satellites.length > 0) {
          var sX = 15, sW = 170;                 // left band x[15,185]: 15 to the canvas edge, 15 to the grounds
          var sTop = gY + 20, sBot = gY + gH;    // aligned with the room stack inside the estate
          var sH = 95, sGap = 15, sPitch = sH + sGap;
          var sCap = Math.max(1, Math.floor((sBot - sTop + sGap) / sPitch));
          var sShown = satellites, sHidden = 0, sFolded = [];
          if (satellites.length > sCap) {        // RULING 5 — a band that would overflow COLLAPSES to one
              /* §25.3 — WHICH PROPERTIES DRAW AND WHICH GO UPSTAIRS IS DECIDED ONCE, BY BUILD ORDER,
                 and opening the picker never changes it. (§24 re-ordered here; struck above.) */
              sShown = satellites.slice(0, sCap - 1);   // counted tile. A tile too small to read is worse
              sHidden = satellites.length - sShown.length;   // than an honest count.
              sFolded = satellites.slice(sShown.length);
          }

          /* ── §22 · THE TILE STOPS BEING A POSTAGE STAMP ───────────────────────────────────────
           * Every satellite used to render at a HARD-CODED 95x170 no matter how many existed, so a
           * second property was born at six-up size while it was the only one — 8.2% of the Trust
           * tile's area, measured. The band now subdivides through the SAME _bandLayout the Trust
           * wing calls, over the SAME y[gY+20, gY+gH]: one property spans the band, two split it,
           * three subdivide again, and the six-up grid is where you ARRIVE, not where you start.
           * One property and one trust both compute to 830 — a match, not a resemblance.
           * sCap is unchanged and still governs: it is the READABILITY cap (7 tiles), and it is
           * what keeps _bandLayout out of its compress-the-floor branch.
           * The collapsed tile takes a real slot, weighted by the properties it stands for, so the
           * stack still fills the band exactly when one exists. */
          var _sW = sShown.map(function (a) { return Math.max(Math.abs(a.value || 0), 1000); });
          if (sHidden > 0) {
              var _hidTot = 0;
              satellites.slice(sShown.length).forEach(function (a) { _hidTot += Math.max(Math.abs(a.value || 0), 1000); });
              _sW.push(_hidTot);
          }
          var sRows = _bandLayout(sTop, sBot, sGap, sH, _sW);

          /* ── §22.1 · THE TYPE SCALES WITH THE TILE, ON ONE RATIO ──────────────────────────────
           * A full-size tile carrying postage-stamp type satisfies the letter of §22 and looks
           * worse than the defect it fixes. The authored rule: scale by the HEIGHT ratio (newH/95
           * — not area, not width, since width is fixed at 170), ceiling at the Trust tile's own
           * title size, which is MEASURED at 14px (.bp-title's class default; the Trust sets only
           * `fill` inline). A satellite shouting louder than the Trust would invert the hierarchy.
           *
           * 🔑 ONE EFFECTIVE RATIO FOR THE WHOLE STACK, NOT A CLAMP ON THE TYPE ALONE. The offsets
           * are a text STACK: the authored note warns that if type grows and the stack does not,
           * the lines collide — and the reverse breaks just as hard. The ceiling binds at h=121
           * (11px reaches 14px at ratio 1.27), which is only 15% of the way to a full-size tile, so
           * on essentially EVERY tile §22 produces the type is clamped. Scaling the offsets by the
           * raw ratio while the type is clamped would push two 14px lines 122 units apart inside an
           * 830-tall tile. So the clamp is applied ONCE, to the ratio, and everything downstream —
           * both title sizes, the value, and every y offset — rides that single number and stays in
           * proportion. The value line tops out at 28px, still under the Trust's own 32px .bp-val.
           * ⚠️ ARCHITECT: this is the open item flagged before build. See the note in the commit. */
          var _sRatio = function (h) { return Math.min(h / sH, 14 / 11); };

          /* ── §22.5 · A LABEL MAY NOT LEAVE ITS TILE — AND §22.1 IS WHAT BROKE THIS ───────────────
           * CAPTAIN-SIGHTED 2026-08-10: "THE VACATION HOME / THE MOAT" bleeding past a satellite tile.
           *
           * THE CAUSE IS DIRECTLY ABOVE. Line 2 was authored at 8px FOR THIS EXACT REASON — the
           * comment below says so in its own words: "'THE VACATION HOME / THE MOAT' is ~28 chars and
           * overruns a 170-unit tile at 11px." §22.1 then made every line ride _sRatio, which is
           * clamped at 14/11 = 1.2727, so 8px renders at 10.18px on any tile taller than 121 units —
           * i.e. on essentially every tile §22 produces. IT RE-INTRODUCED THE OVERFLOW THE 8px WAS
           * CHOSEN TO PREVENT. §22.1 was measured against the tile's HEIGHT and never against its
           * WIDTH, and the width is the fixed dimension.
           * 🔑 A SCALE FACTOR DERIVED FROM ONE AXIS WILL EVENTUALLY VIOLATE THE OTHER.
           *
           * MEASURED IN THE RENDERER, mono at exactly 0.75em per character including letter-spacing
           * (22 chars -> 168.3u and 21 chars -> 160.7u, both 7.65u at 10.2px — identical per-char, so
           * the font really is monospace and this arithmetic is exact, not an estimate):
           *     "THE GROUNDS / THE MOAT"        22ch  168.3 / 170   fits by 1.7
           *     "THE RENTAL / THE MOAT"         21ch  160.7 / 170   fits by 9.3
           *     "THE VACATION HOME / THE MOAT"  28ch  ~214  / 170   OVERFLOWS BY ~44
           * Every merged label was already within 1-9 units of the edge; the long one merely went
           * first. This is a POPULATION problem that happened to surface on one string.
           *
           * THE FIX: cap the size so the text fits the tile it lives in. Because the font is
           * monospace the required size is closed-form — no two-pass measure, no getComputedTextLength
           * at render time. The authored 8px FLOOR still wins if the two ever disagree (§22.1's rule
           * is stop-shrinking, not shrink-forever).
           * ⚠️ AND THE HONEST LIMIT, FLAGGED NOT HIDDEN: past ~28 characters the 8px floor binds and
           * the label will still overrun. Nothing here wraps text. If an authored name ever exceeds
           * that, it needs the Captain's stacking idea and the Architect's copy — this clamp does not
           * silently rescue it, it just stops the sizes that CAN fit from being blown up past fitting. */
          /* ⬆️ MOVED TO MODULE SCOPE for §25.7 — the multi-column second floor needs the same clamp
             and there may be only ONE of it (L48). Pure function; this is a move, not a rewrite. */
          var _fitPx = _fitPxShared;

          sShown.forEach(function (acc, sI) {
              var base = getBaseType(acc.baseId);
              var sYr = sRows[sI].y, sHr = sRows[sI].h;
              var r = _sRatio(sHr);
              var px = function (n) { return Math.round(n * r * 10) / 10; };
              var d = { x: sX, y: sYr, w: sW, h: sHr, cx: sX + sW / 2, cy: sYr + sHr / 2 };
              if (acc.isNew) newRoomToTrace = d;

              var sDebts = _mergeDebtsByAsset[acc.id] || [];
              var sEq = sDebts.length ? _netEquityOf(acc.value, sDebts) : null;
              var sNeg = (sEq !== null && sEq < 0);
              // L47 sourced-or-blank: no value -> a named tile with no figure, never a guessed one.
              var sVal = (parseFloat(acc.value) || 0) > 0 ? (sEq !== null ? _eqStr(sEq) : _eqStr(acc.value)) : '';
              // §19.11a — 'property', not 'home'. This tooltip and the link chip 48 lines below are on
              // THE SAME TILE and said different nouns; a room that cannot agree with itself about what
              // it is looking at is worse than either noun being wrong. Type-first (§19.5) and true on
              // all six purposes — "this home's value" is simply false on The Acreage and The Holding.
              var sTip = sDebts.length ? _lienMirrorNotice(sDebts, 'property') : (base.desc || '');

              /* ── §19.13 / RULING (A) · A LIEN IS A LIEN, WHEREVER THE PROPERTY DRAWS ──────────────
                 THE RULE WE THOUGHT WE IMPLEMENTED: a property merges with its debts.
                 THE RULE WE ACTUALLY IMPLEMENTED: the property that OWNS THE GROUND merges with its
                 debts. Identical for a primary residence, which always owns the ground — and divergent
                 the instant a rental exists, because _pickGroundOwner takes Primary, else the first
                 BLANK, else null. A rental is neither, so it was never failing to merge: it was
                 STRUCTURALLY INELIGIBLE TO ASK. The blueprint was real, just welded to one axle.

                 NO SECOND MERGE IMPLEMENTATION EXISTS HERE, and that was the Architect's condition.
                 This block ALREADY resolved its liens six lines up — _mergeDebtsByAsset, _netEquityOf
                 and _lienMirrorNotice are the same shared helpers the grounds tile calls, and the
                 satellite has always drawn net equity off them. What was missing was never the merge:
                 it was the LABEL and the DOOR. So this changes what the tile SAYS and where it CLICKS,
                 and nothing about how a merge is decided or computed (L48 / §13.55).

                 A room is not missing on a rental today — it is DOORLESS. The combined room already
                 opens from inside Real Estate and already calls itself THE HOLDING once you are in it;
                 the canvas simply offered no way in. This is that door. */
              var sMerged = sDebts.length > 0;
              var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
              g.setAttribute('class', 'room-grp visible satellite-room' + (sMerged ? ' satellite-merged' : ''));
              /* §1.2 — the merged tile opens the combined room. §25.3 — THE BRANCH IS RESOLVED IN ONE
                 PLACE so the second-floor picker asks the same question and cannot answer it
                 differently. If this branch ever changes, the picker inherits it for free. */
              g.setAttribute('onclick', _roomModalFor(acc, sMerged) + "('" + acc.id + "')");
              g.style.cursor = 'pointer';

              var weight = accountWeights[acc.id] || 0;   // S2.4 — READ from the hub, never recomputed (LOCK-3)
              var fp = fillPct(acc.value || 0);
              var fillH = d.h * fp / 100, fillY = d.y + d.h - fillH;
              g.style.setProperty('--weight', weight);
              var fillHTML = fp > 0 ? '<rect x="' + d.x + '" y="' + fillY + '" width="' + d.w + '" height="' + fillH +
                  '" class="room-fill" fill="url(#' + (sNeg ? 'fillGradDebt' : 'fillGradAsset') + ')" />' : '';
              // 11px title, not the estate's 14px: these are secondary blocks, and at 14px the §19 name
              // "THE VACATION HOME" (17 chars x ~10.5 units) overruns a 170-unit tile. Sized now so the
              // authored §19 map lands without a re-layout.
              /* THE SAME THREE-LINE STACK AS THE GROUNDS TILE (Yard §1.5), at satellite scale.
                 Line 2 is 8px, not the 11px of line 1: "THE VACATION HOME / THE MOAT" is ~28 chars and
                 overruns a 170-unit tile at 11px. Sizing here is fitting authored copy into the tile we
                 already ship — §22 (the tile-size redesign) is deliberately NOT in this commit, so that
                 a shifted tile can never be blamed on a rename. */
              var sLabel = _roomNameOf(acc, base).toUpperCase() + (sMerged ? _lienMetaSuffix(sDebts) : '');
              g.innerHTML =
                  '<title>' + String(sTip).replace(/</g, '&lt;') + '</title>' +
                  '<rect x="' + d.x + '" y="' + d.y + '" width="' + d.w + '" height="' + d.h + '" class="room-rect active ' +
                      (isThermal ? 'tax-' + base.taxCode : '') + (acc.isNew ? ' animate-draw' : '') + '" />' +
                  fillHTML +
                  (sMerged ? _linkChipSVG(d.x + 6, d.y + 6, _lienMirrorNotice(sDebts, 'property')) : '') +
                  (sMerged
                    /* §22.5 — every one of these three is width-clamped to its own tile. All three can
                       overrun: line 2 was the one the Captain caught, but line 1 at a scaled 14px needs
                       only a 17-character name to do the same thing. Clamp where the text is SIZED, so
                       there is no second place to forget. */
                    ? '<text x="' + d.cx + '" y="' + (d.cy - px(22)) + '" class="bp-title" style="font-size:' + _fitPx(_combinedNameOf(acc), px(11), d.w) + 'px; letter-spacing:0.12em;">' + _combinedNameOf(acc).toUpperCase() + '</text>' +
                      '<text x="' + d.cx + '" y="' + (d.cy - px(8)) + '" class="bp-title" style="font-size:' + _fitPx(sLabel, px(8), d.w) + 'px; opacity:0.85;">' + sLabel + '</text>'
                    : '<text x="' + d.cx + '" y="' + (d.cy - px(6)) + '" class="bp-title" style="font-size:' + _fitPx(sLabel, px(11), d.w) + 'px;">' + sLabel + '</text>') +
                  '<text x="' + d.cx + '" y="' + (d.cy + px(sMerged ? 20 : 24)) + '" class="bp-val" style="font-size:' + px(sMerged ? 17 : 22) + 'px; fill:' + (sNeg ? 'var(--danger)' : 'var(--white)') + ';">' + sVal + '</text>';
              svgContainer.appendChild(g);
              descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0,
                                 fillPct: fp, weight: weight, isNew: !!acc.isNew, taxCode: base.taxCode,
                                 isDebt: false, isInvestment: !!base.isInvestment, isPriority: !!acc.isPriority });
              // no cursor advance — sRows owns every y (see the trust wing's twin note).
          });
          if (sHidden > 0) {
              // COLLAPSED IS STILL DRAWN. The count is what keeps the picture reconciled to the total.
              // It occupies the LAST slot of the same band layout, so the stack still ends on sBot.
              var _cr = sRows[sRows.length - 1];
              var cd = { x: sX, y: _cr.y, w: sW, h: _cr.h };
              var cR = _sRatio(_cr.h);
              var cg = document.createElementNS("http://www.w3.org/2000/svg", "g");
              cg.setAttribute('class', 'room-grp visible satellite-room satellite-collapse');
              cg.setAttribute('data-collapsed-count', String(sHidden));
              cg.innerHTML =
                  '<rect x="' + cd.x + '" y="' + cd.y + '" width="' + cd.w + '" height="' + cd.h +
                      '" class="room-rect active" style="stroke-dasharray:4 4;" />' +
                  '<text x="' + (cd.x + cd.w / 2) + '" y="' + (cd.y + cd.h / 2 + Math.round(4 * cR * 10) / 10) + '" class="bp-title" style="font-size:' +
                      (Math.round(11 * cR * 10) / 10) + 'px;">+' + sHidden + ' more properties</text>';
              /* §24 — THIS TILE HAS BEEN DEAD SINCE THE DAY IT SHIPPED. Not a regression introduced
                 tonight: it never had a handler at all, and no gate could see that because no gate
                 clicks anything. It opens now. */
              /* ⭐ mergedOf IS THE WHOLE POINT OF THE THIRD ARGUMENT. A folded property carrying a
                 lien must open THE YARD from the picker, exactly as its tile would — and these are
                 the mortgaged properties, the highest-stakes rooms in the set. Same predicate the
                 tile reads six lines up (_mergeDebtsByAsset), never a second derivation. */
              /* ⭐ §25.2 — "PROPERTIES IN THIS WING" IS RETIRED. A wing is part of one building and
                 these are not: the satellites are the user's OTHER PROPERTIES, separate buildings,
                 so they do NOT inherit the main house's "2nd floor". Captain's naming call,
                 2026-08-11. ⛔ Authored copy, installed verbatim (L47).
                 ⚠️ NO SINGULAR IS AUTHORED HERE AND NONE IS REACHABLE: sShown is sCap-1 = 6 and the
                 stack only exists when satellites EXCEED sCap = 7, so sHidden is 2 at minimum. */
              /* §25.5 — device-neutral accessible name, and it now carries the counted-in-your-totals
                 promise that the satellite name was missing entirely (it used to be just the tile's
                 own label, "+N more properties"). */
              _makeFoldDoor(cg, sFolded, 'THE OTHER PROPERTIES',
                  sHidden + ' more properties. Pick one to enter it.',
                  sHidden + ' more properties. They are all counted in your total square footage. ' +
                      'Opens the other properties.',
                  function (a) { return (_mergeDebtsByAsset[a.id] || []).length > 0; });
              svgContainer.appendChild(cg);
          }
      }

      // IDEA-1 — render each column WITHOUT its suppressed (linked-debt) boxes, so no phantom column
      // gap opens and a column that held only a linked debt drops out entirely.
      let _viz = { primary: _visibleCol(cols.primary), joint: _visibleCol(cols.joint), coarch: _visibleCol(cols.coarch) };
      let activeCols = [];
      if(_viz.primary.length > 0) activeCols.push('primary');
      if(_viz.joint.length > 0) activeCols.push('joint');
      if(_viz.coarch.length > 0) activeCols.push('coarch');
      
      let numCols = activeCols.length;
      let drawnRooms = [];
      /* §25.7 — ONE UPSTAIRS FOR THE WHOLE HOUSE. Every wing's overflow lands here during its own
         pass; the collapse tiles close over this object and read it ON CLICK, by which time the
         render has finished and all three wings have reported. ⛔ Keyed by wing and emitted in
         activeCols order so the second floor reads primary-left / joint-middle / co-right, exactly
         as the first floor does. It is per-render, so it cannot leak between paints. */
      let _upstairs = { primary: [], joint: [], coarch: [] };
      let _upstairsGroups = function () {
          return activeCols.map(function (c) { return { col: c, rooms: _upstairs[c] || [] }; })
                           .filter(function (gr) { return gr.rooms.length; });
      };

      if(numCols > 0) {
          
          let minW = 200; 
          let minH = 75;  
          
          let gap = 0;
          let colGap = 0;

          let totalGlobalRender = 0;
          let colTotals = { primary: 0, joint: 0, coarch: 0 };

          activeCols.forEach(c => {
             _viz[c].forEach(acc => {
                 let base = getBaseType(acc.baseId);
                 let isVolatile = base.isInvestment || base.taxCode === 'liquid';
                 let shockMult = (isShocked && isVolatile && base.taxCode !== 'debt') ? 0.70 : 1;

                 let val = Math.max(Math.abs((acc.value || 0) * shockMult), 1000);
                 acc._renderVal = val;
                 colTotals[c] += val;
                 totalGlobalRender += val;
             });
          });

          let availW = (gW - 40) - (numCols * minW);
          availW = Math.max(0, availW);

          let currentX = gX + 20;
          let bounds = { minX: 9999, minY: 9999, maxX: 0, maxY: 0 }; 

          activeCols.forEach((colName, index) => {
              let accounts = _viz[colName];   // IDEA-1 — suppressed linked debts already removed

              let colW = minW;
              if (totalGlobalRender > 0) {
                  colW += availW * (colTotals[colName] / totalGlobalRender);
              }

              /* ── §22.6 · THE LAST PRE-_bandLayout MATH IN THE FILE ──────────────────────────────
               * ⛔ THE DEFECT THIS REPLACES, MEASURED 2026-08-10 IN THE REAL RENDERER. The old form:
               *       availH = Math.max(0, (gH - 100) - (n * minH));  h = minH + availH * share
               * reserves the floors first — which is why _bandLayout's own header calls this code the
               * place the correct form came from — but it has no answer for the case where the floors
               * ALONE do not fit. Once n * minH exceeds the band, availH clamps to 0 and every further
               * account adds a FULL minH below the band, forever. Stack height is
               * 75n + max(0, 750 - 75n), which predicts, and matched, six for six:
               *       n<=10 -> 930 (flat)   n=11 -> 1005   n=12 -> 1080
               *       n=14  -> 1230         n=18 -> 1530   n=24 -> 1980
               * The container ends at 1010 and the viewBox at 1100, and .canvas-wrapper is
               * overflow-hidden with no scroll anywhere, so from THIRTEEN ACCOUNTS IN ONE OWNERSHIP
               * COLUMN a user's rooms are drawn, counted in their net worth, and impossible to see.
               * Thirteen is not an edge case: two 401(k)s, an IRA, a brokerage, some cash and a house.
               * ⚠️ PER COLUMN, not per estate — accounts.length is this column's count, so the same
               * thirteen split across Primary/Joint/Co-Arch never trips it. That is why it hid.
               *
               * _bandLayout answers exactly this, and has since §22: `if (pool < n*floor) floor =
               * pool/n` — COMPRESS RATHER THAN OVERRUN. Both wings were converted then; the estate's
               * own columns were the last caller still on the old math. The band is unchanged —
               * y[gY+20, gY+gH-80] = y[180,930], the same 750 units `gH - 100` always meant — so
               * nothing moves at the counts that already fit. Only the counts that used to walk off
               * the canvas change, and they now fill the band exactly instead.
               * 🔑 THIN TILES ARE A READABILITY PROBLEM; TILES OFF THE CANVAS ARE AN
               *    IS-IT-DRAWN-AT-ALL PROBLEM, AND ONLY ONE OF THOSE CAN SILENTLY DELETE MONEY.
               * ⚠️ READABILITY IS NOT SOLVED BY THIS, IT IS MADE HONEST: at 24 accounts the tiles are
               * ~31 units tall. The satellite wing caps its COUNT (sCap) and shows a collapsed
               * counted tile instead; the columns have no such cap. That is the right follow-up and
               * it needs authored copy for the collapsed tile, so it is flagged, not built here. */
              /* ── §22.7 · THE COLLAPSED TILE — A DOOR, NOT A TRUNCATION ──────────────────────────
               * §22.6 stopped rooms leaving the canvas by compressing them. That made the failure
               * VISIBLE instead of invisible, which is progress, but at 24 accounts a tile is ~31
               * units and the estate stops looking deliberate. This is the floor that keeps the
               * crowded case honest until §23 makes it beautiful.
               *
               * ⛔ THE CAP IS DERIVED AND THE DERIVATION LIVES HERE SO IT CANNOT ROT INTO A MAGIC
               * NUMBER. Column rooms do NOT scale their type — measured 14px title / 32px value at
               * EVERY count, because §22.1's ratio is satellite-only.
               * ~~"so their text stack is a CONSTANT 62.5 units. The largest count whose tile can
               * still contain its own label is therefore floor(750 / 62.5) = 12 ... an EXACT fit
               * with zero margin. Captain ruled 11: one room of headroom, deliberately spent."~~
               *
               * ⛔⛔ STRUCK 2026-08-11 — 62.5 WAS ASSERTED, NEVER MEASURED, AND IT IS WRONG BY 15
               * UNITS. Measured with getBBox() on the REAL painted ink, at counts 1..13, on BOTH the
               * column and the trust wing: the value baseline sits at cy+30 carrying a 32px italic
               * serif, so the ink reaches 38.8 units BELOW the tile centre. A centred tile therefore
               * needs 2 x 38.8 = 77.6 UNITS, not 62.5. The same 38.8 fell out of FIVE independent
               * (count, overflow) pairs across both wings, to within 0.05 — it is a property of the
               * text stack, not of either wing.
               * ⚠️ SO CAP 11 IS ALREADY OVERFLOWING, TODAY, ON THIS SURFACE: 750/11 = 68.2 units per
               * slot and the value's ink overruns its own tile by 4.7 units. Containment needs
               * 750/slots >= 77.6 -> slots <= 9. The "one room of headroom" was never headroom; it
               * was two rooms of overflow measured against a number that was 15 units too small.
               * ⛔ NOT CHANGED HERE. Dropping to 9 slots removes two DRAWN rooms from the canvas,
               * and the better lever is promoting §22.1's _sRatio + _fitPx pair to this wing so the
               * type scales instead of the count shrinking. Both are product calls: REPORTED, and
               * awaiting the Architect + the Captain. 🔑 A NUMBER WITHOUT ITS DERIVATION ROTS — this
               * one had a derivation, and the derivation itself was the guess.
               * ⚠️ DO NOT "SIMPLIFY" THIS TO THE SATELLITE'S sCap OF 7. That number is
               * floor((830+15)/110) and answers a DIFFERENT constraint — satellites scale their type
               * and carry a 15-unit gap. Two caps that matched would look like a convention and be a
               * coincidence.
               *
               * ⛔ DRAWN IS NOT COUNTED. Folded rooms stay in every total: colTotals and
               * totalGlobalRender are computed above over ALL accounts, and the estate's money total
               * never derives from what is drawn. What folding DOES change is routing — drawnRooms
               * feeds the outflow corridors — so folded rooms are excluded from it BY NECESSITY, not
               * by choice: leaving them in would draw corridors to the coordinates of tiles that do
               * not exist. Flagged as a real consequence, not hidden: a folded room shows no
               * corridor until it is unfolded. */
              var _COL_CAP = 11;
              var _colShown = accounts, _colHidden = 0, _colFolded = [];
              if (accounts.length > _COL_CAP) {
                  /* §25.3 — WHICH ROOMS DRAW AND WHICH GO UPSTAIRS IS DECIDED ONCE, BY BUILD ORDER.
                     Opening the second floor and looking at it changes NOTHING here. (§24's
                     _applyReveal removed — a state that changes because the user looked at it is not
                     a view, it is a side effect.) */
                  _colShown = accounts.slice(0, _COL_CAP - 1);       // last slot belongs to the tile
                  _colHidden = accounts.length - _colShown.length;
                  _colFolded = accounts.slice(_colShown.length);
              }
              _upstairs[colName] = _colFolded;   // §25.7 — this wing reports to the shared upstairs
              /* The collapsed tile takes a REAL slot weighted by everything it stands for, so the
                 stack still fills the band exactly — same rule the satellite wing follows. */
              var _colWeights = _colShown.map(function (a) { return a._renderVal; });
              if (_colHidden > 0) {
                  var _colHidTot = 0;
                  accounts.slice(_colShown.length).forEach(function (a) { _colHidTot += a._renderVal; });
                  _colWeights.push(_colHidTot);
              }
              var _colRows = _bandLayout(gY + 20, gY + gH - 80, gap, minH, _colWeights);
              let currentY = gY + 20;

              _colShown.forEach((acc, i) => {
                  let base = getBaseType(acc.baseId);

                  /* currentY is NOT recomputed from the row on purpose: the loop already advances
                     `currentY += h + gap` from `gY + 20`, which is byte-for-byte the recurrence
                     _bandLayout runs internally. Taking only the HEIGHT keeps this a one-concept
                     change and leaves the cursor, bounds and colInfo untouched. */
                  let h = _colRows[i] ? _colRows[i].h : minH;

                  let d = { x: currentX, y: currentY, w: colW, h: h };
                  d.cx = d.x + d.w / 2;
                  d.cy = d.y + d.h / 2;

                  /* §25.4 — THE FIRST FLOOR IS NOW THE FIRST CALLER of the shared emitter, which is
                     what makes the second floor a REUSE rather than a lookalike. `ownStroke` stays
                     off here because the envelope pass draws this room's walls after the loop. */
                  const _t = _roomTileSVG(acc, base, d, {
                      isShocked: isShocked, isThermal: isThermal,
                      mergeByAsset: _mergeDebtsByAsset, weights: accountWeights
                  });
                  const isDebt = _t.isDebt;

                  drawnRooms.push({ id: acc.id, taxCode: base.taxCode, isDebt: isDebt, isPriority: acc.isPriority, cx: d.cx, cy: d.cy, col: colName, value: Math.abs(acc.value || 0) });

                  if(acc.isNew) newRoomToTrace = d; 

                  bounds.minX = Math.min(bounds.minX, currentX);
                  bounds.minY = Math.min(bounds.minY, currentY);
                  bounds.maxX = Math.max(bounds.maxX, currentX + colW);
                  bounds.maxY = Math.max(bounds.maxY, currentY + h);

                  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                  /* A REVOCABLE trust is drawn INSIDE the estate (it is still legally yours) but must
                     still READ as a trust, so it keeps the purple the Trust Wing uses. Same class and
                     same colour token as the outside wing — one visual language for one legal thing,
                     placed by what the trust IS rather than by where the renderer happened to put it. */
                  const _isTrustRoom = _t.isTrust;
                  g.setAttribute('class', `room-grp visible ${isDebt ? 'debt-room' : ''}${_isTrustRoom ? ' trust-room' : ''}`);
                  g.setAttribute('onclick', `openAccountModal('${acc.id}')`);
                  g.style.cursor = 'pointer';
                  
                  // Phase A — collect this room's rect for the estate shell; walls/doors drawn ONCE
                  // post-loop (envelope + open thresholds + sealed private rooms), not per room.
                  var _priv = isDebt || /vault/i.test(base.meta);            // Vault + debt = sealed
                  roomRects.push({ x: d.x, y: d.y, w: d.w, h: d.h, id: acc.id, isDebt: isDebt, priv: _priv,
                                   val: Math.abs(acc.value || 0), col: colName, ci: index, ri: i,
                                   last: (i === accounts.length - 1),
                                   weight: accountWeights[acc.id] || 0, meta: base.meta });   // A.1: load-bearing + role

                  // S2.4 — load-bearing weight (read from hub, never recomputed) + concave fill.
                  g.style.setProperty('--weight', _t.weight);
                  g.innerHTML = _t.html;
                  svgContainer.appendChild(g);
                  descriptors.push({ id: acc.id, el: g, rect: g.querySelector('.room-rect'), d: d, value: acc.value || 0, fillPct: _t.fillPct, weight: _t.weight, isNew: !!acc.isNew, taxCode: base.taxCode, isDebt: isDebt, isInvestment: !!base.isInvestment, isPriority: !!acc.isPriority });

                  currentY += h + gap;
              });

              /* §22.7 — THE COLLAPSED TILE. Copy is AUTHORED and installed verbatim (L47); the only
                 decision here is WHICH RUNG, and that is FIT-DRIVEN AND MEASURED, never chosen.
                 Mono is 0.75em per character (measured, §22.5), so the widest rung that fits is
                 closed-form. ⛔ Never a dollar figure: a tile you cannot open into may not quote a
                 balance. ⛔ Sourced-or-blank — no derivable count, no tile, never "+0" or "+?". */
              if (_colHidden > 0 && _colRows.length === _colWeights.length) {
                  var _cRow = _colRows[_colRows.length - 1];
                  var _cFits = function (s, px) { return String(s).length * 0.75 * px <= (colW - 14); };
                  /* ── §25.1 · THE SECOND FLOOR ─────────────────────────────────────────────────
                   * ⛔ "COLUMN" AND "FOLDED" ARE RETIRED FROM USER-FACING COPY, FOREVER. A column is
                   * a fact about our layout algorithm; a 2nd floor is a fact about the user's house.
                   * Folded is what paper does — nobody's house has folded rooms. We leaked the
                   * renderer's vocabulary into the product for three prompts, and the mechanism came
                   * out wrong in the same direction as the words (see §25.3). 🔑 THE COPY IS AN
                   * EARLY WARNING FOR THE ARCHITECTURE.
                   *
                   * ⭐ THE LINE BREAK IS AUTHORED, NOT CHOSEN, and it is authored because it was
                   * MEASURED. "+{n} more rooms on the 2nd floor" is 31 chars = 325.5u at 14px, into
                   * a narrowest column of 186u usable. That is not a near miss, it is a 75% overrun,
                   * and the one-line alternative only fits by dropping to the 8px §22.1 floor with
                   * ZERO margin. ⛔ A CONSTRAINT SATISFIED WITH ZERO MARGIN WILL BE VIOLATED BY THE
                   * NEXT UNRELATED ROUNDING CHANGE — the 8px option is refused on purpose.
                   *
                   * ⚠️ THE LADDER BELOW IS A SAFETY NET, NOT A BEHAVIOUR, AND I MEASURED THAT TOO.
                   * colW = minW + availW*share and minW is 200, so colW >= 200 ALWAYS; line 1 at its
                   * widest realistic form ("+999 more rooms" = 157.5u) and line 2 ("on the 2nd
                   * floor" = 108u) both clear 186u. Rung 1 is unreachable-to-fail today. It stays
                   * because the caps and the widths are not laws, and it now DEGRADES BY TRUNCATING
                   * THE AUTHORED COPY rather than substituting words nobody wrote — the old rung 2
                   * ("ROOMS") belonged to a metaphor that no longer exists.
                   * ⚠️ SINGULAR IS AUTHORED AND CURRENTLY UNREACHABLE: _colShown is _COL_CAP-1 = 10
                   * and the tile only exists above _COL_CAP = 11, so _colHidden is 2 at minimum.
                   * Wired anyway — the cap is a number, not a promise. */
                  var _l1 = '+' + _colHidden + (_colHidden === 1 ? ' more room' : ' more rooms');
                  var _l2 = 'on the 2nd floor';
                  if (!(_cFits(_l1, 14) && _cFits(_l2, 9))) { _l2 = ''; }
                  if (!_cFits(_l1, 14)) { _l1 = '+' + _colHidden; }
                  /* ⛔ THE §22.1 FLOOR OUTRANKS THE LADDER. If even the minimum rung cannot fit at
                     8px we do NOT shrink type to win a placement argument — we say so, loudly, and
                     the tile still draws with the count, because a countable room the user can see
                     beats a tidy tile that hides one. */
                  if (!_cFits(_l1, 8)) {
                      console.warn('[estate §22.7] collapsed tile cannot fit "' + _l1 + '" at the 8px floor in a ' +
                          Math.round(colW) + '-unit column — drawing it anyway; STOP AND FLAG per §22.1.');
                  }
                  /* §22.7.1 — THE CORRIDOR VARIANT, AND THE CONDITION IS DERIVED RATHER THAN
                     ASSUMED. A room upstairs shows no corridor until you go up, because drawnRooms
                     feeds the outflow route and an upstairs room is not in it. That is a real
                     consequence and the copy says so — but ONLY when it is true. Corridors are built
                     at the routing block below from taxCode liquid/pretax/roth plus PRIORITY debts,
                     and EVERY room in those buckets gets a node (not just the largest), so "does at
                     least one upstairs room own a corridor" is exactly this test.
                     ⛔ SOURCED-OR-BLANK: if the derivation is false we say the plain sentence. We
                     never hedge with "may be". */
                  var _upCorridor = isRouting && _colFolded.some(function (a) {
                      var b = getBaseType(a.baseId) || {};
                      return b.taxCode === 'liquid' || b.taxCode === 'pretax' || b.taxCode === 'roth' ||
                             (b.taxCode === 'debt' && a.isPriority);
                  });
                  /* ⛔ AUTHORED COPY, VERBATIM (L47). Note "total square footage" — the tile may not
                     quote a balance because you cannot open into it, so the hover is where the
                     promise lives, and the picker's per-room figures are where it becomes checkable.
                     ── §25.5 · THE ACCESSIBLE NAME IS ITS OWN STRING ────────────────────────────
                     ⛔ "CLICK" IS A WORD ABOUT A MOUSE, NOT ABOUT MEANING. §25.1 authored one hover
                     ending "Click to go upstairs." and, used as the accessible name, it told a
                     screen-reader user to do the one thing they are not doing. A CONTROL'S
                     ACCESSIBLE NAME SAYS WHAT IT DOES, NEVER HOW TO OPERATE IT — the screen reader
                     already announces the control type and the key; repeating "activate" is the
                     software talking about itself again, which is the habit §25 exists to kill.
                     ⭐ THE PROMISE STAYS IN BOTH: "all counted in your total square footage" is the
                     entire reason this tile is allowed to exist without a balance on its face, so it
                     may not be the clause that gets dropped for brevity. */
                  var _cLead = _colHidden + (_colHidden === 1 ? ' more room' : ' more rooms') +
                      ' on the 2nd floor. They are all counted in your total square footage.';
                  var _cCorr = ' Connections to rooms upstairs are hidden until you go up.';
                  var _cTip  = _cLead + (_upCorridor ? _cCorr : ' Click to go upstairs.');
                  var _cAria = _cLead + (_upCorridor ? _cCorr : '') + ' Opens the second floor.';
                  var _cg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                  _cg.setAttribute('class', 'room-grp visible column-collapse');
                  _cg.setAttribute('data-collapsed-count', String(_colHidden));
                  _cg.innerHTML =
                      '<title>' + _cTip + '</title>' +
                      '<rect x="' + currentX + '" y="' + _cRow.y + '" width="' + colW + '" height="' + _cRow.h +
                          '" class="room-rect active" style="stroke-dasharray:4 4;" />' +
                      '<text x="' + (currentX + colW / 2) + '" y="' + (_cRow.y + _cRow.h / 2 + (_l2 ? -2 : 5)) +
                          '" class="bp-title" style="font-size:14px;">' + _l1 + '</text>' +
                      (_l2 ? '<text x="' + (currentX + colW / 2) + '" y="' + (_cRow.y + _cRow.h / 2 + 14) +
                          '" class="bp-title" style="font-size:9px; opacity:0.85;">' + _l2 + '</text>' : '') +
                      /* §25.6 — the staircase, bottom-right, 8 units off both edges. ⛔ SUPPRESSED ON A
                         SHORT TILE RATHER THAN SHRUNK: this tile takes the LAST band slot, so its
                         height is whatever the stack left over and can be genuinely small. A glyph
                         scaled down to fit would collide with the count, and the COUNT is the thing
                         that keeps the picture reconciled to the total (§22.7). Decoration yields to
                         the number, never the other way round. */
                      (_cRow.h >= 56 ? _stairsGlyphSVG(currentX + colW - 8 - 17, _cRow.y + _cRow.h - 8 - 26, 17, 26) : '');
                  /* ⛔ NO mergedOf ON THE COLUMN SURFACE, AND THAT IS DELIBERATE, NOT AN OMISSION.
                     The column tile at the room loop above is UNCONDITIONALLY openAccountModal — a
                     car with an auto-loan merges its lien for DISPLAY but still opens its own room;
                     only a PROPERTY opens The Yard, and properties never sit in a column (they are
                     the grounds or they are satellites). The picker matches the tile by matching its
                     absence of a branch. */
                  /* §25.4 — THE SECOND FLOOR IS DRAWN BY THE FIRST FLOOR'S OWN EMITTER. This closure
                     is the whole bridge: it captures the SAME render inputs the column loop uses
                     (shock, thermal, liens, hub weights) and calls the SAME _roomTileSVG, so an
                     upstairs room cannot drift from how it would look downstairs.
                     ⛔ `ownStroke` ON — there is no envelope pass in a modal to draw its walls.
                     ⛔ `anim: false` — the draw-in animation is a birth event on the canvas; replaying
                        it every time a door opens would animate a room the user built last week. */
                  var _floorTile = function (acc, d) {
                      var b = getBaseType(acc.baseId);
                      if (!b) return null;
                      return _roomTileSVG(acc, b, d, {
                          isShocked: isShocked, isThermal: isThermal, ownStroke: true, anim: false,
                          mergeByAsset: _mergeDebtsByAsset, weights: accountWeights
                      });
                  };
                  /* §25.7 — the door opens the WHOLE upstairs, not just this wing's share. The groups
                     and the count are both LAZY: this tile is built mid-render, before the other wings
                     have folded anything.
                     ⚠️ THE TILE'S OWN FACE STILL COUNTS ONLY ITS OWN WING, AND THAT IS CORRECT — it
                     marks where THIS column stopped drawing, so "+3" is true of this column. The
                     subhead then says how many are up there in total. A house works this way: the
                     stairs in one wing still lead to the whole second floor.
                     ❓ FLAGGED FOR THE ARCHITECT: tile "+3" opening onto "7 rooms up here" is honest
                     but may want a copy ruling. I did not change either authored string to paper it. */
                  _makeFoldDoor(_cg, _upstairsGroups, 'THE SECOND FLOOR',
                      function (n) { return n + (n === 1 ? ' room' : ' rooms') + ' up here. Pick one to enter it.'; },
                      _cAria, null, _floorTile);
                  svgContainer.appendChild(_cg);
                  bounds.minX = Math.min(bounds.minX, currentX);
                  bounds.maxX = Math.max(bounds.maxX, currentX + colW);
                  bounds.minY = Math.min(bounds.minY, _cRow.y);
                  bounds.maxY = Math.max(bounds.maxY, _cRow.y + _cRow.h);
                  currentY = _cRow.y + _cRow.h + gap;
              }

              colInfo.push({ x: currentX, w: colW, top: gY + 20, bottom: currentY });   // Phase A — for the envelope
              currentX += colW + colGap;
          });

          // Phase A — draw the estate SHELL once (over the room fills): one envelope + dissolved
          // interior walls (open thresholds) + sealed private rooms (Vault + debt). Replaces the
          // per-room box strokes (now stroke:none) and the per-room doors.
          var _lastCi = colInfo.length - 1;
          // A.1 — Foyer jut: if a Foyer lands on the perimeter top, its outer wall steps OUT.
          // A.3 — the entry (jut + cutout + door) attaches to the ONE top-center room, whatever account
          // it is (foyerJut/jutDepth keys reused = entry jut; Foyer-float stays parked).
          var _entry = _entryRoom(roomRects, colInfo, _lastCi);
          var _jut = (A1_TUNE.foyerJut && _entry && A1_TUNE.jutDepth > 0)
            ? { x0: _entry.x + 10, x1: _entry.x + _entry.w - 10, depth: A1_TUNE.jutDepth } : null;
          // A.3 — fill the jut with the entry room's gradient (only when funded) so the notch reads as
          // part of the room, not a hollow gap. Drawn UNDER the envelope stroke. Binary-fill untouched:
          // this extends the fill REGION to match the silhouette; no scaling, no new fill model.
          var _jutFill = '';
          if (_jut && _entry && _entry.val > 0) {
            var _eg = _entry.isDebt ? 'fillGradDebt' : 'fillGradAsset';
            _jutFill = '<rect class="estate-jut-fill" x="' + _jut.x0 + '" y="' + (colInfo[0].top - _jut.depth) +
              '" width="' + (_jut.x1 - _jut.x0) + '" height="' + _jut.depth + '" fill="url(#' + _eg + ')"/>';
          }
          var _shell = _jutFill + '<path class="estate-envelope" d="' + _envelopePath(colInfo, _jut) +
                       '" style="fill:none;stroke:var(--teal-mid);stroke-width:' + SHELL_TUNE.envWeight + 'px;opacity:0.92"/>';
          _sharedEdges(roomRects, colInfo).forEach(function (e) { _shell += _openThreshold(e, SHELL_TUNE.openness); });
          var _byCol = _roomsByCol(roomRects);
          roomRects.forEach(function (r) { if (r.priv) _shell += _privEnclosure(r); });             // sealed boxes (all rooms)
          _sealedWings(roomRects, _byCol).forEach(function (wg) { _shell += _wingDoor(wg, _byCol, _lastCi); });   // A.4 — ONE door per wing
          // A.1 — exterior articulation (additive, estate-level): load-bearing outer wall, windows,
          // ONE entry door, ONE stair, optional chrome. Drawn over the envelope.
          var _extEdges = [];
          roomRects.forEach(function (r) { _extEdges = _extEdges.concat(_roomExteriorEdges(r, _lastCi)); });
          _shell += _loadWall(roomRects, _lastCi, A1_TUNE);
          if (A1_TUNE.windows) _shell += _windows(_extEdges, A1_TUNE);
          _shell += _exteriorDoor(_entry, colInfo, _lastCi, A1_TUNE, _jut);
          _shell += _stairs(roomRects, A1_TUNE);
          _shell += _chrome(colInfo, _lastCi, A1_TUNE);
          var _shellG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          _shellG.setAttribute('class', 'estate-shell');
          _shellG.innerHTML = _shell;
          svgContainer.appendChild(_shellG);

          if (isMeasured && bounds.maxX > 0) {
              let outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              outline.setAttribute("x", bounds.minX - 10);
              outline.setAttribute("y", bounds.minY - 10);
              outline.setAttribute("width", (bounds.maxX - bounds.minX) + 20);
              outline.setAttribute("height", (bounds.maxY - bounds.minY) + 20);
              outline.setAttribute("class", "estate-measure-outline");
              svgContainer.appendChild(outline);
          }
      }

      // IDEA-1 R2/R3 — GROUNDS fill + dashed boundary, drawn AFTER the rooms so they frame the estate
      // from OUTSIDE: the outline steps OUT around the north entry jut (never cuts the front door), and
      // once rooms exist the FILL becomes a FRAME (estate footprint punched out, even-odd) so the
      // red/teal never bleeds THROUGH the translucent room boxes. Full plot only when property stands
      // alone. Color = grounds equity/link state (teal default, red when a linked mortgage is underwater).
      (function () {
        var bx = gX, by = gY, bx2 = gX + gW, by2 = gY + gH, outer;
        if (_jut && colInfo.length) {
          var M = 14;                                                       // clearance around the jut
          var jx0 = Math.max(bx, _jut.x0 - M), jx1 = Math.min(bx2, _jut.x1 + M);
          var jTop = Math.min(by, (colInfo[0].top - _jut.depth) - M);       // notch top, above the jut
          outer = 'M ' + bx + ' ' + by + ' H ' + jx0 + ' V ' + jTop + ' H ' + jx1 + ' V ' + by +
                  ' H ' + bx2 + ' V ' + by2 + ' H ' + bx + ' Z';
        } else {
          outer = 'M ' + bx + ' ' + by + ' H ' + bx2 + ' V ' + by2 + ' H ' + bx + ' Z';
        }
        // FILL — full plot when property stands alone; a frame (estate footprint punched out) once rooms
        // exist, so nothing tints the rooms.
        var fillD = outer;
        if (colInfo.length) {
          var eMinX = colInfo[0].x, eMaxX = colInfo[colInfo.length - 1].x + colInfo[colInfo.length - 1].w;
          var eTop = colInfo[0].top, eBot = colInfo[0].bottom;
          colInfo.forEach(function (c) { eBot = Math.max(eBot, c.bottom); });
          // The hole follows the estate SILHOUETTE — including the entry jut — so nothing fills behind
          // the cutout (no red/teal bleeding UNDER the translucent jut). Jut span/top match estate-jut-fill.
          if (_jut) {
            var hjTop = colInfo[0].top - _jut.depth;
            fillD += ' M ' + eMinX + ' ' + eTop + ' H ' + _jut.x0 + ' V ' + hjTop + ' H ' + _jut.x1 + ' V ' + eTop +
                     ' H ' + eMaxX + ' V ' + eBot + ' H ' + eMinX + ' Z';
          } else {
            fillD += ' M ' + eMinX + ' ' + eTop + ' V ' + eBot + ' H ' + eMaxX + ' V ' + eTop + ' Z';
          }
        }
        var gf = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gf.setAttribute('class', 'grounds-fill');
        gf.setAttribute('d', fillD);
        gf.setAttribute('fill-rule', 'evenodd');
        gf.setAttribute('style', 'fill:url(#' + _grGrad + '); stroke:none; ' + (_moatDebts.length ? 'cursor:pointer; pointer-events:auto;' : 'pointer-events:none;'));
        if (_moatDebts.length) gf.setAttribute('onclick', "openYardModal('" + propertyAccount.id + "')");   // §1.2 — the merged tile now opens The Yard, not the Real Estate modal
        svgContainer.insertBefore(gf, svgContainer.firstChild);            // behind the rooms (frame backdrop)

        var gb = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gb.setAttribute('class', 'grounds-boundary');
        gb.setAttribute('d', outer);
        gb.setAttribute('style', 'fill:none; stroke:' + _grLine + '; stroke-dasharray:12 12; stroke-width:1.5; pointer-events:none;');
        svgContainer.appendChild(gb);
      })();

      // SURGICAL: Outflow Routing Lines
      if (isRouting && drawnRooms.length > 0) {
          // Track A — STABLE in-bucket order (value DESC; id tiebreak) = interim determinism, superseded
          // by B1's real financial rule. Keep the tax-efficiency bucket order (liquid->pretax->roth); sort
          // WITHIN each bucket by balance so the SAME inputs always produce the SAME path (placement-agnostic).
          let _byVal = (a, b) => (b.value || 0) - (a.value || 0) || (a.id < b.id ? -1 : 1);
          let liq = drawnRooms.filter(r => r.taxCode === 'liquid').sort(_byVal);
          let pre = drawnRooms.filter(r => r.taxCode === 'pretax').sort(_byVal);
          let roth = drawnRooms.filter(r => r.taxCode === 'roth').sort(_byVal);
          let debts = drawnRooms.filter(r => r.isDebt && r.isPriority).sort(_byVal);

          let sequence = [...liq, ...pre, ...roth];

          // Stamp the deterministic order onto the room groups; the energizer reads it for the badges.
          let _elById = {}; descriptors.forEach(d => { if (d && d.id) _elById[d.id] = d.el; });
          sequence.forEach((r, i) => { let el = _elById[r.id]; if (el) el.setAttribute('data-route-order', i + 1); });
          debts.forEach((r, j) => { let el = _elById[r.id]; if (el) el.setAttribute('data-route-debt', j + 1); });

          if(sequence.length > 1) {
              let p = `M ${sequence[0].cx} ${sequence[0].cy}`;
              for(let k=1; k<sequence.length; k++) {
                  p += ` L ${sequence[k].cx} ${sequence[k].cy}`;
              }
              let routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
              routePath.setAttribute("d", p);
              routePath.setAttribute("class", "outflow-route");
              svgContainer.appendChild(routePath);
          }

          if (debts.length > 0 && liq.length > 0) {
              // FIX 2 — stamp the debt SOURCE (liq[0] = largest liquid, where the money actually leaves)
              // so the energizer can amber-badge the SOURCE in addition to the destination. SINGLE source
              // for now (honest — current math can't fund a multi-source cascade; that's B3).
              let _srcEl = _elById[liq[0].id]; if (_srcEl) _srcEl.setAttribute('data-route-debt-src', '1');
              debts.forEach(d => {
                  let p = `M ${liq[0].cx} ${liq[0].cy} L ${d.cx} ${d.cy}`;
                  let demoPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                  demoPath.setAttribute("d", p);
                  demoPath.setAttribute("class", "demolition-route");
                  svgContainer.appendChild(demoPath);
              });
          }
      }

      const formattedTotal = grandTotal === 0 ? '$0' : (grandTotal < 0 ? '-$' + Math.abs(Math.round(grandTotal)).toLocaleString('en-US') : '$' + Math.round(grandTotal).toLocaleString('en-US'));
      grossEstateVal.innerText = formattedTotal;
      if (isShocked) grossEstateVal.style.color = "var(--danger)";
      else grossEstateVal.style.color = "var(--white)";

      if (newRoomToTrace) {
          let machine = ctx.machineEl;
          let d = newRoomToTrace;
          if(machine) {
              machine.animate([
                { transform: `translate(0px, 0px)`, offset: 0 },
                { transform: `translate(${d.x - 700}px, ${d.y - 550}px)`, offset: 0.15 },
                { transform: `translate(${d.x + d.w - 700}px, ${d.y - 550}px)`, offset: 0.35 },
                { transform: `translate(${d.x + d.w - 700}px, ${d.y + d.h - 550}px)`, offset: 0.55 },
                { transform: `translate(${d.x - 700}px, ${d.y + d.h - 550}px)`, offset: 0.75 },
                { transform: `translate(${d.x - 700}px, ${d.y - 550}px)`, offset: 0.90 },
                { transform: `translate(0px, 0px)`, offset: 1 }
              ], {
                duration: 1800,
                easing: 'linear'
              });
          }
      }

      // S2.5b — corridor PATHS (structure only; R2 split — the energizer reveals them). A faint thread
      // between vertically-adjacent rooms in the same column, drawn UNDER the rooms and started HIDDEN
      // (stroke-dashoffset = full length, no flash). Attached on the descriptor array as a non-breaking
      // sidecar (.corridors) — EXTEND §16.2-iii, never fork — so DatumEnergize.run reads it.
      var corridors = [];
      var cg = document.createElementNS("http://www.w3.org/2000/svg", "g");
      cg.setAttribute('class', 'estate-corridors');
      svgContainer.insertBefore(cg, svgContainer.firstChild);   // UNDER the rooms; in DOM before getTotalLength
      for (var ci = 1; ci < drawnRooms.length; ci++) {
        var rA = drawnRooms[ci - 1], rB = drawnRooms[ci];
        if (rA.col !== rB.col) continue;                        // same-column (vertical) neighbors only
        var cid = rA.id + '__' + rB.id;
        var cpath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        cpath.setAttribute('d', 'M ' + rA.cx + ' ' + rA.cy + ' L ' + rB.cx + ' ' + rB.cy);
        cpath.setAttribute('class', 'estate-corridor');
        cpath.setAttribute('data-corridor', cid);
        cpath.setAttribute('fill', 'none');
        cpath.setAttribute('stroke', 'rgba(93,202,165,0.35)');  // faint teal — tune by eye
        cpath.setAttribute('stroke-width', '2');
        cg.appendChild(cpath);
        var clen = cpath.getTotalLength ? cpath.getTotalLength() : 0;
        cpath.style.strokeDasharray = clen;
        cpath.style.strokeDashoffset = clen;                    // start hidden; energizer reveals
        corridors.push({ id: cid, el: cpath, fromId: rA.id, toId: rB.id, len: clen });
      }
      descriptors.corridors = corridors;

      ctx.accounts.forEach(a => a.isNew = false);
      return descriptors;   // S2.4 — §16.2-iii single hook surface; consumers tween off this
  }
  /* supportsSatellites — A CAPABILITY FLAG THE HOST BRANCHES ON, NOT DECORATION. Measured on this
     project: JS assets are cached FOUR HOURS at the edge, HTML is not. So a deploy updates
     studio.html instantly while this file can serve STALE from cache for hours. In that window a new
     host would hand satellites to an old renderer that ignores them, and every non-primary property
     would be counted in the estate total and drawn NOWHERE — the exact defect this commit closes,
     re-introduced on every returning user until the cache turns over. The host reads this flag and
     falls back to the previous in-estate placement when it is absent, so the worst case is the
     behaviour we already ship, never a missing room. Do not remove it when the soak period ends
     without also removing the host's fallback branch. */
  window.DatumEstate = { renderEstate: renderEstate, supportsSatellites: true, SHELL_TUNE: SHELL_TUNE, A1_TUNE: A1_TUNE };
  window.DatumEstateTune = SHELL_TUNE;     // Phase A geometry — openness/envWeight/partWeight (LOCKED)
  window.DatumEstateA1Tune = A1_TUNE;      // Phase A.1 eyes-on dial; edit then updateSVGs()
})();
