/* @gate-pool: browser
 *
 * ── WHAT STATE DOES THIS FIXTURE PUT THE USER IN? (one line, mandatory) ───────────────────────────
 * AN OWNER WHO HAS A CAR WORTH $40,000 WITH AN $15,000 AUTO LOAN STILL ON IT — a Vehicle room that
 * HOLDS VALUE and CARRIES A LINKED LIEN, drawn in an ownership column as a merged NET EQUITY tile.
 *
 * ⛔⛔ WHY THIS GATE EXISTS — THE CENSUS FINDING OF 2026-08-12, AND IT IS THE WORST KIND WE HAVE.
 * This path CRASHED mid-session on 2026-08-11, was fixed, and WENT GREEN ACROSS FOUR GATES WHILE
 * BROKEN. The fixture-reach census then measured why, and the answer was not "weak coverage":
 *
 *   ⭐ EVERY `linkedAssetId` IN EVERY GATE IN THIS REPO POINTED AT A PROPERTY. Mortgages and HELOCs
 *     link to The Grounds and that path is covered several times over. A lien on a NON-PROPERTY
 *     asset — the only other kind the renderer accepts — was constructed by ZERO gates. Max-N = 0.
 *
 *   ⭐⭐ AND THE SHARPER HALF. Two gates DO build a Vehicle: `_gate_moat_winners` builds one as a
 *     DECOY so the mortgage link dropdown has a wrong family to mis-offer, and `_gate_grounds_winners`
 *     builds one to prove Grounds-only gating — i.e. to prove the Driveway does NOT get the
 *     treatment. THE VEHICLE EXISTED IN THIS SUITE ONLY AS A THING BEING RULED OUT.
 *     🔑 A FIXTURE THAT ONLY EVER BUILDS A THING AS A DECOY HAS NOT TESTED THAT THING — IT HAS ONLY
 *        TESTED ITS EXCLUSION.
 *
 * ⛔ THE CAPTAIN'S EYE HAS CARRIED THIS PATH TWICE (2026-08-11 and 2026-08-12, both clean). AN EYE
 * IS NOT A FIXTURE: it does not run on the next commit, and it will not be looking on the day this
 * breaks again. That is the entire reason this file exists.
 *
 * ⭐ THE PAIRING IS CANONICAL, NOT SYNTHETIC — checked, not assumed. `_securedLinkScope` scopes
 * `auto_debt*` to EXACTLY `auto` / `auto_primary` / `auto_co`, so a user reaching this state is
 * following the product's own dropdown, not evading it. ⛔ Never build a fixture the product forbids;
 * a gate that guards an unreachable state guards nothing.
 *
 * ⭐ AND IT REACHES A BRANCH NO FIXTURE HAS EVER RENDERED. `_lienMirrorNotice` leads with "Your
 * mortgage is linked here" / "Your HELOC is linked here" and falls back to "A linked liability sits
 * here" for everything else. Every existing fixture is a mortgage or a HELOC, so the FALLBACK LEAD
 * has never once been painted. An auto loan is the first thing to reach it.
 *
 * Usage: node scripts/_gate_estate_lien_net_equity.js [LABEL] [--nomerge] [--wrongeq]
 *   --nomerge  the renderer stops merging liens onto physical assets -> the loan draws its own box
 *              and the Vehicle shows a plain value. Proves the merge is what the tile depends on.
 *   --wrongeq  net equity ADDS instead of subtracting. Everything else is byte-identical: same tile,
 *              same NET EQUITY label, same colour token, WRONG NUMBER.
 *              ⭐⭐ THIS IS THE DISCRIMINATION CONTROL (census axis 2). --nomerge alone would let a
 *              gate pass that merely checks a label EXISTS. A door that opens onto the wrong place is
 *              worse than one that does not open — and so is a figure that is present but wrong.
 * Self-hosts on 127.0.0.1:8371.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LABEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'RUN';
const NOMERGE = process.argv.includes('--nomerge');
const WRONGEQ = process.argv.includes('--wrongeq');
const MUT = NOMERGE || WRONGEQ;
const PORT = 8371;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const { chromium } = require(ROOT + '/node_modules/playwright');

/* ⛔ ANCHORED ON THE DEFINITION, NEVER ON A CALL SITE. Both are single-occurrence, asserted below by
   mutate() rather than trusted — an anchor that matches twice would mutate the wrong thing silently. */
const A_MERGE = "if (!sb || sb.taxCode !== 'physical') return;";
const M_MERGE = "if (true) return;   /* lien merge disabled by --nomerge */";
const A_EQ = 'function _netEquityOf(assetVal, debts) { return (parseFloat(assetVal) || 0) - _lienSum(debts); }';
const M_EQ = 'function _netEquityOf(assetVal, debts) { return (parseFloat(assetVal) || 0) + _lienSum(debts); }   /* sign flipped by --wrongeq */';

function mutate(src, a, m, label) {
  const n = src.split(a).length - 1;
  if (n !== 1) { console.error('anchor ' + label + ': expected exactly 1 occurrence, found ' + n + ' — re-ground it.'); process.exit(2); }
  return src.replace(a, m);
}

const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') u = '/studio.html';
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
  let body = fs.readFileSync(f);
  if (MUT && /datum-estate\.js$/.test(u)) {
    let src = body.toString('utf8');
    if (NOMERGE) src = mutate(src, A_MERGE, M_MERGE, 'A_MERGE');
    if (WRONGEQ) src = mutate(src, A_EQ, M_EQ, 'A_EQ');
    body = Buffer.from(src, 'utf8');
  }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(body);
});

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS ' + msg); } else { fail++; console.log('FAIL ' + msg); } };

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  await p.goto('http://127.0.0.1:' + PORT + '/studio.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 10000 });
  await p.waitForTimeout(400);

  /* `pairs` = [[vehicleValue, loanValue|null], ...]. A null loan builds a Vehicle with NO lien, which
     is the ABSENCE half of the contract — an exclusion assertion needs a presence assertion, and a
     "NET EQUITY appears" leg needs a scene where it must NOT. */
  const build = (pairs) => p.evaluate((prs) => {
    window.state.accounts.length = 0;
    const made = [];
    prs.forEach(([av, dv, dBase]) => {
      addInstance('auto');
      const asset = window.state.accounts[window.state.accounts.length - 1];
      asset.value = av;
      let debt = null;
      if (dv !== null) {
        addInstance(dBase || 'auto_debt_joint');
        debt = window.state.accounts[window.state.accounts.length - 1];
        debt.value = dv;
        debt.linkedAssetId = asset.id;      // the scoped, product-intended pairing
      }
      made.push({ assetId: asset.id, debtId: debt ? debt.id : null, av: av, dv: dv });
    });
    updateSVGs();
    return made;
  }, pairs);

  /* Reads the ONE tile that stands for this asset. ⛔ Computed fill, never the inline attribute — a
     markup diff is not a render diff, and the negative-equity colour is a visual claim. */
  const readTile = (assetId) => p.evaluate((id) => {
    const svg = document.getElementById('bp-svg');
    const all = Array.from(svg.querySelectorAll('g.room-grp'));
    const g = all.find((el) => (el.getAttribute('onclick') || '').indexOf("'" + id + "'") >= 0);
    if (!g) return null;
    const texts = Array.from(g.querySelectorAll('text')).map((t) => (t.textContent || '').trim());
    const val = g.querySelector('.bp-val');
    return {
      texts: texts,
      valStr: val ? (val.textContent || '').trim() : '',
      valFill: val ? getComputedStyle(val).fill : '',
      hasNetEquity: texts.indexOf('NET EQUITY') >= 0,
      titles: Array.from(g.querySelectorAll('title')).map((t) => (t.textContent || '').trim()),
      onclick: g.getAttribute('onclick') || '',
    };
  }, assetId);

  const drawnIds = () => p.evaluate(() => {
    const svg = document.getElementById('bp-svg');
    const out = [];
    Array.prototype.forEach.call(svg.querySelectorAll('[onclick]'), (el) => {
      const m = /open(?:AccountModal|YardModal)\('([^']+)'\)/.exec(el.getAttribute('onclick') || '');
      if (m) out.push(m[1]);
    });
    return out;
  });

  const footage = () => p.evaluate(() => {
    const t = (document.getElementById('gross-estate-val') || {}).textContent || '';
    const n = Number(String(t).replace(/[$,\s]/g, ''));
    return { txt: t, num: isFinite(n) ? n : null };
  });

  console.log('=== ' + LABEL + ' === MODE: ' + (MUT ? ((NOMERGE ? 'NOMERGE ' : '') + (WRONGEQ ? 'WRONGEQ' : '')).trim() : 'NORMAL'));

  /* ── A1 · THE CRASH PATH ITSELF — a $40k car carrying a $15k loan ─────────────────────────────── */
  let made = await build([[40000, 15000]]);
  await p.waitForTimeout(700);
  let t = await readTile(made[0].assetId);
  let ids = await drawnIds();
  let f = await footage();
  console.log('  A1 ' + JSON.stringify({ tile: t && t.texts, val: t && t.valStr, footage: f.txt }));

  // PRESENCE FIRST — every leg below is about a tile, so a render that produced none must RED here.
  ok(!!t, 'A1 [PRESENCE] the Vehicle is DRAWN as a real room (not a decoy, not ruled out)');
  if (t) {
    ok(ids.indexOf(made[0].debtId) < 0,
       'A1 [CONTROL] the linked Auto Loan is SUPPRESSED from the columns — it lives on the asset now');
    ok(t.hasNetEquity, 'A1 [CONTROL] the merged tile carries the NET EQUITY label');
    /* ⭐⭐ THE NUMBER. $40,000 asset - $15,000 lien = $25,000. ⛔ Asserted as the exact rendered
       string: a wrong SIGN yields "$55k" and a missing merge yields "$40k", so this one leg tells
       those two failures apart from each other and from success. */
    ok(t.valStr === '$25k',
       'A1 [MONEY] NET EQUITY reads asset MINUS lien — got "' + t.valStr + '", want "$25k" ($40k car, $15k loan)');
    /* The picture must reconcile to the headline number in an estate this simple. */
    ok(f.num === 25000,
       'A1 [MONEY] and the square footage agrees — #gross-estate-val=' + f.num + ', want 25000');
    /* ⛔ A VEHICLE IS NOT A PROPERTY. Only a property opens The Yard; a car opens its own room. This
       is the branch §25.4 documents as deliberately absent on the column surface. */
    ok(/openAccountModal\(/.test(t.onclick) && !/openYardModal\(/.test(t.onclick),
       'A1 [DOOR] the car opens its OWN room, never The Yard — ' + t.onclick.slice(0, 40));
    /* ── §3c.1 · THE AUTHORED LEAD, AND THIS LEG'S OWN HISTORY IS THE LESSON ─────────────────────
       ⭐ THIS LEG FIRST SHIPPED ASSERTING THE **GENERIC** LEAD ("A linked liability sits here"),
       because that is what the renderer said — mortgage and HELOC had named leads and the auto loan
       did not. Rendering that fallback for the first time in this repo's history EXPOSED IT AS A
       MISSING SENTENCE, the Architect authored one within hours, and this expectation moved.
       ⛔ THE RED WAS PREDICTED BEFORE IT FIRED, and it was a COPY CHANGE, never a defect. */
    const tip = t.titles.join(' | ');
    ok(/Your auto loan is linked here/.test(tip),
       'A1 [COPY] the AUTHORED auto-loan lead is rendered (§3c.1) — "' + tip.slice(0, 70) + '"');
    ok(!/mortgage is linked here|HELOC is linked here|A linked liability sits here/i.test(tip),
       'A1 [COPY] and it names NEITHER a mortgage, a HELOC, nor the generic fallback — a wrong lead is a lie about the debt');
  }

  /* ── A2 · UNDERWATER — a $10k car carrying an $18k loan. Common, and the sign must survive. ───── */
  made = await build([[10000, 18000]]);
  await p.waitForTimeout(700);
  t = await readTile(made[0].assetId);
  console.log('  A2 ' + JSON.stringify({ val: t && t.valStr, fill: t && t.valFill }));
  ok(!!t, 'A2 [PRESENCE] the underwater Vehicle is still DRAWN — negative equity may not delete a room');
  if (t) {
    /* ⛔ THE SIGN IS THE WHOLE POINT. 10000 - 18000 = -8000. A flipped sign gives "$28k", which is
       not merely wrong but reassuring — the failure mode that tells a user they are fine when they
       are underwater. */
    ok(t.valStr === '-$8k',
       'A2 [MONEY] negative equity keeps its sign — got "' + t.valStr + '", want "-$8k" ($10k car, $18k loan)');
    /* A visual claim, so computed style. --danger resolves to a real rgb here; the token name never
       reaches the browser. */
    ok(/rgb\(/.test(t.valFill) && t.valFill !== 'rgb(255, 255, 255)',
       'A2 [VISUAL] and it is painted in the danger colour, not plain white — computed fill ' + t.valFill);
  }

  /* ── A3 · TWO CARS, TWO LOANS — two INDEPENDENT merges, never one pooled figure ───────────────── */
  made = await build([[40000, 15000], [20000, 5000]]);
  await p.waitForTimeout(700);
  const t1 = await readTile(made[0].assetId), t2 = await readTile(made[1].assetId);
  ids = await drawnIds();
  console.log('  A3 ' + JSON.stringify({ car1: t1 && t1.valStr, car2: t2 && t2.valStr }));
  ok(!!t1 && !!t2, 'A3 [PRESENCE] both Vehicles are drawn as their own rooms');
  if (t1 && t2) {
    /* ⭐ THIS ALSO PRE-GUARDS THE §27 DEBT RULING (2026-08-12): "two Auto Loans on two different
       Vehicles are TWO merges, not one master." Each lien belongs to ITS car; a pooled figure here
       would double-count against a merge that already exists. */
    ok(t1.valStr === '$25k' && t2.valStr === '$15k',
       'A3 [MONEY] each lien merges onto ITS OWN car — got "' + t1.valStr + '" / "' + t2.valStr + '", want "$25k" / "$15k"');
    ok(ids.indexOf(made[0].debtId) < 0 && ids.indexOf(made[1].debtId) < 0,
       'A3 [CONTROL] both loans are suppressed — neither draws a second box');
  }

  /* ── A4 · THE ABSENCE HALF — a Vehicle with NO loan must NOT wear a NET EQUITY label ──────────── */
  made = await build([[40000, null]]);
  await p.waitForTimeout(700);
  t = await readTile(made[0].assetId);
  console.log('  A4 ' + JSON.stringify({ val: t && t.valStr, netEq: t && t.hasNetEquity }));
  ok(!!t, 'A4 [PRESENCE] an unlinked Vehicle is drawn');
  if (t) {
    /* ⛔ WITHOUT THIS LEG, "NET EQUITY appears" would pass on a renderer that stamps it on EVERY
       tile. An assertion that cannot fail on the wrong answer is not an assertion. */
    ok(!t.hasNetEquity,
       'A4 [DISCRIMINATION] no lien -> NO net-equity label — the label is EARNED, not decoration');
    ok(t.valStr === '$40k',
       'A4 [MONEY] and it shows its plain value — got "' + t.valStr + '", want "$40k"');
  }

  /* ── A5 · THE GENERIC FALLBACK MUST STAY REACHABLE — ARCHITECT-RULED 2026-08-12 ────────────────
   * ⛔ "The generic fallback STAYS. It is the honest degrade for any future liability with no named
   * lead, and it must remain REACHABLE AND TESTED." Once the auto loan got its own sentence, the
   * ONLY thing still reaching the generic branch is a debt family with no named lead — and
   * `_securedLinkScope` gives personal loans and revolving debt the broad physical scope, so a
   * Personal Loan (The Ledger) secured by a Vehicle lands there and is a state a user can build.
   * ⭐⭐ THIS SCENE EXISTS BECAUSE OF WHAT JUST HAPPENED TO A1. The generic lead sat unrendered for
   * the life of this repo and nobody knew it was a stub. Giving the auto case a name would have
   * returned that branch to exactly the same invisibility — a fallback with no fixture is a promise
   * nobody is keeping. 🔑 AN UNRENDERED FALLBACK IS AN UNTESTED PROMISE; DO NOT RE-CREATE ONE WHILE
   * FIXING ONE. */
  made = await build([[30000, 9000, 'personal_loan_joint']]);
  await p.waitForTimeout(700);
  t = await readTile(made[0].assetId);
  const tip5 = t ? t.titles.join(' | ') : '';
  console.log('  A5 ' + JSON.stringify({ val: t && t.valStr, tip: tip5.slice(0, 70) }));
  ok(!!t, 'A5 [PRESENCE] a Vehicle secured by a Personal Loan is drawn');
  if (t) {
    ok(t.valStr === '$21k',
       'A5 [MONEY] the merge is family-agnostic — got "' + t.valStr + '", want "$21k" ($30k car, $9k personal loan)');
    ok(/A linked liability sits here/.test(tip5),
       'A5 [COPY] the GENERIC fallback is still REACHABLE and still rendered — "' + tip5.slice(0, 60) + '"');
    ok(!/auto loan is linked here/i.test(tip5),
       'A5 [COPY] and it does NOT borrow the auto-loan lead — the named lead belongs to the named family');
  }

  ok(pageErrors.length === 0, 'R1 no page errors across every scenario' +
     (pageErrors.length ? ' — *** ' + pageErrors[0].slice(0, 120) + ' ***' : ''));

  console.log('-------------------------------------');
  const verdict = fail === 0 ? 'GREEN' : 'RED';
  console.log('[_gate_estate_lien_net_equity] ' + verdict + '  ' + pass + '/' + (pass + fail) +
              (MUT ? '   (mutation run: RED IS THE EXPECTED RESULT)' : ''));
  await b.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
