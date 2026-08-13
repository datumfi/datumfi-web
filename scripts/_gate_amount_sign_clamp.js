/* @gate-pool: browser */
/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   A TYPED AMOUNT IS A MAGNITUDE. A DERIVED AMOUNT KEEPS ITS SIGN.
   Architect-ruled 2026-08-13. Two claims, opposite directions, and the gate exists because a fix
   that satisfies the first is one careless line away from breaking the second.

   ── THE DEFECT THIS CLOSES (measured 2026-08-13, before the fix) ─────────────────────────────────
   Typing "-50000" into a mortgage's Current Balance beside a $500,000 house:
       acc.value stored     -50000
       #gross-estate-val   $550,000   ⛔ THE DEBT MADE THE ESTATE BIGGER
       bp.datum.net_worth   450000
   Two headline screens, $100,000 apart, from one keystroke. Same harm family as counting a leased
   vehicle as an owned asset: it INFLATES a retirement user's net worth.

   MECHANISM: two sanitisers that disagree, and the wrong one guarded the important field.
     · enforceAmt      (studio.html ~3255)  replace(/[^0-9.]/g,'')   STRIPS the sign.
     · _num            (studio.html ~11060) replace(/[^0-9.\-]/g,'') PRESERVES the sign.
   enforceAmt guarded origAmount, minPmt, propTaxAnnual, insAnnual and a dozen other ancillary money
   fields. THE PRIMARY BALANCE WENT THROUGH BARE _num. 🔑 A GUARD THAT COVERS THE ANCILLARY FIELDS
   AND NOT THE PRIMARY ONE LEARNED THE WRONG LESSON.

   ── THE FIX, AND WHY IT IS TWO EDITS AND NOT ONE ────────────────────────────────────────────────
   (1) DISPLAY — formatCurrency (~3092) no longer re-emits '-'. It is the LIVE-INPUT formatter with
       exactly ONE caller, the delegated `input` listener (~3206), which already covers keystroke and
       paste for every `.curr-format` field. One guard, on the existing discipline, no fork (L48).
   (2) STATE — the two `acc.value` store sites route through the guard that already existed,
       enforceAmt, before _num parses.
   ── ⚠️ THE TWO HALVES COVER DIFFERENT PATHS, AND THIS IS THE MEASURED TRUTH, NOT THE TIDY ONE ───
   My first draft of this header asserted "either alone is insufficient" and the --nostoreclamp
   control DID NOT BITE, which disproved it. What actually happens when a user types:
     · keystroke 1 is '-'. The inline oninput stores `_num('-')` = 0, then the delegated listener
       rewrites the field to '' — THE SIGN IS EATEN ON THE FIRST KEYSTROKE and never returns. So on
       the TYPING path the display guard alone is sufficient, and the store guard never fires.
   The store guard earns its place on the PROGRAMMATIC path instead — `updateValueWithoutRender(id,
   String(value))` at studio.html:11832 writes a value straight to state with no field, no
   keystroke and no listener. ⭐ THAT IS THE §24 VEHICLE-VALUATION APPLY PATH: an outside estimate
   written directly. Scene D drives it, and --nostoreclamp reds THERE and only there.
   🔑 A CONTROL THAT DOES NOT BITE IS TELLING YOU THE CLAIM IS WRONG, NOT THAT THE MUTATION IS WEAK.
   Rather than delete the store guard or hand-wave the control, the scene that needs it was added.

   ── ⛔⛔ LEG C IS THE POINT OF THIS FILE ─────────────────────────────────────────────────────────
   NET EQUITY, NET WORTH AND THE UNDERWATER GAP ARE LEGITIMATELY NEGATIVE. Garage §8.3 requires the
   sign be rendered honestly, and the underwater case is the entire reason THE LIEN exists as its own
   room. An over-eager fix — "clamp the sign everywhere" — would satisfy legs A and B perfectly and
   silently delete the product's ability to tell a user they owe more than the thing is worth.
   🔑 A CLAMP MUST BE BOUNDED BY WHAT IT MUST NOT TOUCH. `--overclamp` is that boundary, made to fail.
   Note the two paths are genuinely independent: typed amounts run through studio.html's
   formatCurrency, while NET EQUITY is emitted by `_eqStr` in datum-estate.js — a different function
   in a different file — which is precisely why an over-eager fix reaches it by a separate mistake.

   Usage: node scripts/_gate_amount_sign_clamp.js [LABEL] [--noclamp] [--nostoreclamp] [--overclamp]
     --noclamp       formatCurrency re-emits '-'  -> the DISPLAY half regresses (leg A2).
     --nostoreclamp  the store site drops enforceAmt -> the PROGRAMMATIC half regresses (scene D
                     only; the typing path is already covered by the display guard — see above).
     --overclamp     _eqStr stops emitting '-'      -> ⭐ THE OVER-EAGER FIX. Legs A and B stay
                     perfectly green and leg C reds alone. That asymmetry IS the demonstration.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv[2] && process.argv[2].charAt(0) !== '-' ? process.argv[2] : 'RUN';
const NOCLAMP    = process.argv.includes('--noclamp');
const NOSTORE    = process.argv.includes('--nostoreclamp');
const OVERCLAMP  = process.argv.includes('--overclamp');
const MUT = NOCLAMP || NOSTORE || OVERCLAMP;

const PORT = 8374;
const URL = 'http://127.0.0.1:' + PORT + '/studio.html';
const { chromium } = require(ROOT + '/node_modules/playwright');

const A_FMT = "      return '$' + out;";
const M_FMT = "      return (String(val).indexOf('-') >= 0 ? '-' : '') + '$' + out;   /* sign re-emitted: --noclamp */";
const A_STORE = 'acc.value = Math.min(100000000000, Math.round(_num(window.enforceAmt(valStr)) * 100) / 100);   // #393 $100B ceiling';
const M_STORE = 'acc.value = Math.min(100000000000, Math.round(_num(valStr) * 100) / 100);   // guard removed: --nostoreclamp   // #393 $100B ceiling';
/* THE OVER-EAGER FIX, IN THE FILE IT WOULD ACTUALLY BE MADE IN. datum-estate.js:_eqStr is where a
   derived negative becomes the string a user reads. */
const A_EQ = "    return v < 0 ? '-' + s : s;";
const M_EQ = "    return s;   /* derived sign clamped too: --overclamp */";

/* ⛔ THE REPLACER IS A FUNCTION, AND THAT IS NOT STYLE — IT IS A BUG FIX. `src.replace(a, m)` treats
   `m` as a REPLACEMENT PATTERN, so `$'`, `$&`, "$`" and `$1` inside it expand instead of landing
   literally. Every mutation here injects currency code containing `'$'`, i.e. the sequence `$'`,
   which means "the portion of the string AFTER the match" — so --noclamp silently produced a
   mangled studio.html that failed to boot, and the mutation looked dead rather than wrong.
   🔑 A RIG FAULT THAT CORRUPTS THE FIXTURE LOOKS EXACTLY LIKE A CONTROL THAT DOES NOT BITE.
   Passing a function disables pattern expansion entirely. The sibling gates share this helper's
   shape and are safe only because their mutations happen to contain no '$'. */
function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(1); }
  const out = src.replace(a, () => m);
  if (out.indexOf(m) < 0) { console.error('mutation ' + label + ': replacement did not land verbatim — refusing to test a corrupted fixture.'); process.exit(1); }
  return out;
}

const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let rp = decodeURIComponent(req.url.split('?')[0]); if (rp === '/') rp = '/studio.html';
  const fp = path.join(ROOT, rp);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if ((NOCLAMP || NOSTORE) && /studio\.html$/.test(rp)) {
    let src = body.toString('utf8');
    if (NOCLAMP) src = mutate(src, A_FMT, M_FMT, 'A_FMT');
    if (NOSTORE) src = mutate(src, A_STORE, M_STORE, 'A_STORE');
    body = Buffer.from(src, 'utf8');
  }
  if (OVERCLAMP && /datum-estate\.js$/.test(rp)) {
    body = Buffer.from(mutate(body.toString('utf8'), A_EQ, M_EQ, 'A_EQ'), 'utf8');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  res.end(body);
});

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } }

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 15000 });
  await p.waitForTimeout(400);

  /* The first-impression overlay, the shape panel and the privacy banner cover the canvas. They are
     HIDDEN, never clicked through — scene A types into a real field via a real click, and a click
     that had to be faked would stop proving the listener order this gate is about (L48: same helper
     shape as _gate_estate_fold_doors / _gate_lens_bar_clearance). */
  const clearCovers = () => p.evaluate(() => {
    ['studioOverlayWrap', 'shape-panel', 'privacy-banner'].forEach((id) => {
      const o = document.getElementById(id);
      if (o) { o.style.display = 'none'; o.style.pointerEvents = 'none'; }
    });
  });
  await clearCovers();

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT
    ? [NOCLAMP ? 'noclamp' : '', NOSTORE ? 'nostoreclamp' : '', OVERCLAMP ? 'overclamp' : ''].filter(Boolean).join(' ')
    : 'NORMAL'));

  /* ══ SCENE A · THE USER TYPES A MINUS SIGN ═══════════════════════════════════════════════════════
     ⛔ DRIVEN THROUGH THE REAL INPUT, NOT THROUGH THE STORE FUNCTION. `el.type('-50000')` dispatches
     genuine `input` events, so the delegated listener and the field's own inline oninput race in the
     real order. Calling updateValueWithoutRender directly would skip the display half entirely and
     leave --noclamp unable to bite — the mutation would look dead when the gate was simply not
     using the path it guards. 🔑 A GATE THAT BYPASSES THE MECHANISM CANNOT TEST THE MECHANISM. */
  const A = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property');       const house = window.state.accounts[0];
    addInstance('mortgage_joint'); const loan  = window.state.accounts[1];
    house.value = 500000;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 500));
    return { houseId: house.id, loanId: loan.id };
  });
  const loanInput = '#room-val-inp-' + A.loanId;
  await p.waitForSelector(loanInput, { timeout: 8000 });
  await clearCovers();   // renderInputs() repaints the panel, which can restore a cover
  await p.click(loanInput);
  await p.type(loanInput, '-50000', { delay: 12 });
  await p.waitForTimeout(1200);

  const A1 = await p.evaluate((ids) => {
    const loan = window.state.accounts.filter((a) => a.id === ids.loanId)[0];
    const el = document.getElementById('room-val-inp-' + ids.loanId);
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    return {
      stored: loan.value,
      field: el ? el.value : null,
      total: Number(String(txt).replace(/[$,\s]/g, '')),
      totalTxt: txt,
      netWorth: window._computeNetWorth(window.state.accounts),
    };
  }, A);
  console.log('  A ' + JSON.stringify(A1));

  ok(A1.field !== null, 'A0 [PRESENCE] the balance field rendered and was typed into');
  /* ⭐⭐ THE STATE HALF. A magnitude, never a signed number. */
  ok(A1.stored === 50000,
     'A1 [STATE] typing "-50000" stores a POSITIVE MAGNITUDE — acc.value=' + A1.stored + ', want 50000');
  /* THE DISPLAY HALF — the user must SEE the sign refused, not discover it later. */
  ok(typeof A1.field === 'string' && A1.field.indexOf('-') < 0,
     'A1 [DISPLAY] and the field itself shows no minus — "' + A1.field + '"');

  /* ── A-PASTE · THE SIGN ARRIVES ALL AT ONCE ─────────────────────────────────────────────────────
     ⭐ AND THIS IS THE LEG --noclamp ACTUALLY NEEDS, WHICH TYPING COULD NOT PROVIDE. Typed
     character-by-character, the '-' arrives BEFORE any digit, formatCurrency returns '' for a
     digitless string, and the sign is gone before the display guard's final line is ever reached —
     so the display mutation stayed green against a scene that could not exercise it. A PASTE
     delivers "-50000" in ONE input event, digits and sign together, which is the only shape that
     reaches the guarded return. 🔑 THE FIXTURE MUST OCCUPY THE STATE THE GUARD DEFENDS.
     Setting .value and dispatching `input` is precisely what a paste does to both handlers. */
  const AP = await p.evaluate((ids) => {
    const el = document.getElementById('room-val-inp-' + ids.loanId);
    el.focus();
    el.value = '-50000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const loan = window.state.accounts.filter((a) => a.id === ids.loanId)[0];
    return { field: el.value, stored: loan.value };
  }, A);
  console.log('  A-paste ' + JSON.stringify(AP));
  ok(AP.field.indexOf('-') < 0,
     'A2 [DISPLAY · PASTE] pasting "-50000" shows no minus — got "' + AP.field + '"');
  ok(AP.stored === 50000,
     'A2 [STATE · PASTE] and it still stores a magnitude — acc.value=' + AP.stored + ', want 50000');

  /* ══ SCENE B · THE TWO HEADLINE TOTALS AGREE, AND IN THE RIGHT DIRECTION ═════════════════════════ */
  ok(A1.total === A1.netWorth,
     'B1 [MONEY · TWO TOTALS] the estate square footage and the Blueprint net worth AGREE — ' +
     '#gross-estate-val=' + A1.total + ' vs _computeNetWorth=' + A1.netWorth);
  /* ⛔ AGREEMENT ALONE IS NOT CORRECTNESS — they would also agree at $550,000 if BOTH were wrong.
     This names the number: $500,000 house MINUS a $50,000 debt. The debt must SUBTRACT. */
  ok(A1.total === 450000,
     'B2 [MONEY · DIRECTION] and the debt SUBTRACTS — got ' + A1.total + ', want 450000 ($500k house - $50k loan). ' +
     'Before the fix this read 550000: the debt ENLARGED the estate.');

  /* ══ SCENE C · A DERIVED NEGATIVE SURVIVES — THE OVER-EAGER-FIX GUARD ════════════════════════════
     A $20,000 car carrying a $35,000 lien. NET EQUITY is -$15k and MUST render with its sign: this
     is the underwater case, the reason THE LIEN is its own room, and a product that cannot say
     "you owe more than it is worth" has lost the sentence that matters most here. */
  const C = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('auto');            const car  = window.state.accounts[0];
    addInstance('auto_debt_joint'); const lien = window.state.accounts[1];
    car.value = 20000; lien.value = 35000; lien.linkedAssetId = car.id;
    renderInputs(); updateSVGs();
    await new Promise((r) => setTimeout(r, 1100));
    const svg = document.getElementById('bp-svg');
    const g = Array.prototype.slice.call(svg.querySelectorAll('g.room-grp'))
      .filter((el) => (el.getAttribute('onclick') || '').indexOf("'" + car.id + "'") >= 0)[0];
    const val = g ? g.querySelector('.bp-val') : null;
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    return {
      drawn: !!g,
      labels: g ? Array.prototype.slice.call(g.querySelectorAll('text')).map((t) => (t.textContent || '').trim()) : [],
      equity: val ? (val.textContent || '').trim() : null,
      total: Number(String(txt).replace(/[$,\s]/g, '')),
      totalTxt: txt,
      netWorth: window._computeNetWorth(window.state.accounts),
    };
  });
  console.log('  C ' + JSON.stringify(C));

  // PRESENCE FIRST — leg C1 is about a rendered string, so a scene that drew no tile must red here.
  ok(C.drawn, 'C0 [PRESENCE] the underwater vehicle is DRAWN as a real tile');
  ok(C.labels.indexOf('NET EQUITY') >= 0, 'C0 [PRESENCE] and it carries the NET EQUITY label — ' + JSON.stringify(C.labels));
  /* ⭐⭐ THE LEG THAT STOPS AN OVER-EAGER FIX. */
  ok(C.equity === '-$15k',
     'C1 [DERIVED · SIGN KEPT] net equity renders NEGATIVE — got "' + C.equity + '", want "-$15k" ' +
     '($20k car, $35k lien). ⛔ Clamping the typed sign must NEVER reach a derived figure.');
  /* AND THE TOTAL ITSELF IS ALLOWED TO GO NEGATIVE — debts exceeding assets is a real estate, not an
     error state, and the same over-eager instinct would clamp it. */
  ok(C.total === -15000 && /^-/.test(C.totalTxt.trim()),
     'C2 [DERIVED · SIGN KEPT] and the estate total itself renders negative when debts exceed assets — "' +
     C.totalTxt + '" (' + C.total + ')');
  ok(C.total === C.netWorth,
     'C3 [MONEY · TWO TOTALS] the two totals still agree while negative — ' + C.total + ' vs ' + C.netWorth);

  /* ══ SCENE D · THE PROGRAMMATIC PATH — NO FIELD, NO KEYSTROKE, NO LISTENER ══════════════════════
     ⛔ THE HALF THE DISPLAY GUARD CANNOT REACH. studio.html:11832 already writes a value this way
     (`updateValueWithoutRender(id, String(value))`), and that is the shape the §24 vehicle-valuation
     apply will take: an outside estimate written straight into state. Nothing here passes through
     `.curr-format`, so formatCurrency never sees it and only the store-side guard stands between a
     signed string and the user's net worth.
     ⭐ THIS SCENE EXISTS BECAUSE --nostoreclamp STAYED GREEN WITHOUT IT. The control was right and
     the header was wrong; the fixture grew to where the risk is rather than the claim being softened. */
  const D = await p.evaluate(async () => {
    window.state.accounts.length = 0;
    addInstance('property');       const house = window.state.accounts[0];
    addInstance('mortgage_joint'); const loan  = window.state.accounts[1];
    window.updateValueWithoutRender(house.id, '500000');
    window.updateValueWithoutRender(loan.id, '-50000');    // the provider/estimate shape
    await new Promise((r) => setTimeout(r, 1100));
    const txt = (document.getElementById('gross-estate-val') || {}).textContent || '';
    return {
      storedLoan: loan.value,
      storedHouse: house.value,
      total: Number(String(txt).replace(/[$,\s]/g, '')),
      totalTxt: txt,
      netWorth: window._computeNetWorth(window.state.accounts),
    };
  });
  console.log('  D ' + JSON.stringify(D));
  ok(D.storedHouse === 500000, 'D0 [PRESENCE] the programmatic write landed at all — house=' + D.storedHouse);
  ok(D.storedLoan === 50000,
     'D1 [STATE · PROGRAMMATIC] a signed string written straight to state stores a MAGNITUDE — ' +
     'acc.value=' + D.storedLoan + ', want 50000 (no field, no keystroke, no listener)');
  ok(D.total === 450000 && D.total === D.netWorth,
     'D2 [MONEY] and both totals agree in the right direction — #gross-estate-val=' + D.total +
     ', _computeNetWorth=' + D.netWorth + ', want 450000');

  console.log('-------------------------------------');
  console.log('OVERALL: ' + (fail === 0 ? 'GREEN' : 'RED') + '   (' + pass + ' pass / ' + fail + ' fail)');
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
