/* DEV-ONLY gate — STEP 3 · MOVE 1a: the account modal builder as a studioSource PART.
 *
 * THREE LEGS, REPORTED AS THREE SENTENCES, BECAUSE THEY PROVE THREE DIFFERENT THINGS AND EXACTLY
 * ONE OF THEM WOULD PASS ON A BROKEN COMMIT:
 *
 *   REGISTRATION — window.openAccountModal exists after load, PARTS[] carries the file, the page
 *                  carries the <script src>. ⛔ THIS LEG ALONE PASSES ON EVERY BROKEN VERSION OF
 *                  THIS COMMIT, which is precisely why it is never reported alone.
 *   WIRING       — a REAL CLICK on ⚙️ DETAILS opens the modal, and a handler THE BUILDER ITSELF
 *                  WROTE fires and lands its write in state. Registration is not wiring (§11.4).
 *   DEPENDENCY   — the 76 names the builder reads out of studio.html still resolve from the part,
 *                  and the two it WRITES land. This is the leg that does not exist anywhere else.
 *
 * ── ⛔ WHY THE DEPENDENCY LEG HAD TO BE BUILT ──────────────────────────────────────────────────
 * scripts/_gate_parts_wired.mjs derives ONE direction: a page that CALLS a function only a part
 * defines must LOAD that part. Nothing guarded the reverse — the PART calling 76 names the PAGE
 * defines. Rename any one of them in studio.html and this modal breaks SILENTLY AT CLICK TIME: no
 * throw at load, no blank page, just a ⚙️ DETAILS button that stops working.
 * 🔑 A LAW APPLIED IN ONE DIRECTION IS HALF A LAW — the sentence _gate_parts_wired's own header
 *    uses about the SACRED map. Same fix, one layer along.
 *
 * ── ⚠️ WHAT EACH LEG DOES **NOT** PROVE, SAID OUT LOUD ─────────────────────────────────────────
 * D1 resolves NAMES, not BEHAVIOUR: it proves each of the 76 is reachable from the page, not that
 * it still returns the right thing. D2 is the behavioural half and its population is derived from
 * rDataList at runtime, so it cannot rot — but it only exercises paths a cold, empty account takes.
 * A dependency reached only by (say) a HELOC mid-draw with escrow is covered by NEITHER. Stated
 * because an unstated limit is how a green gate becomes a false assurance.
 *
 * Serve the repo root on :8001, then: node scripts/_gate_account_modal_part.mjs
 * Controls:
 *   --rename=<name>  RED-FIRST for the dependency leg: rename one of the 76 in the served shell.
 *   --nopart         RED-FIRST for registration: drop the <script src> from the page.
 */
import { chromium } from 'playwright';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PART_RELS, extractWindowFn, studioSource } = require('./_studio_source.cjs');

const LABEL = process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) || 'RUN';
const RENAME = (process.argv.find((a) => a.startsWith('--rename=')) || '').split('=')[1] || '';
const NOPART = process.argv.includes('--nopart');
const URL = 'http://127.0.0.1:8001/studio.html';
const PART_REL = 'scripts/studio-account-modal.js';

/* ⭐ THE 76, FROM A FREE-VARIABLE CENSUS (eslint-scope, selftested against a fixture of known frees
   and known non-frees), NOT FROM A GREP. A grep over identifiers cannot tell a local from a free
   one, and would have produced a list that is wrong in both directions.
   ⛔ IT IS A MANIFEST, SO IT CAN ROT — and S1/S2 below are what stop it: every name must still be
   REFERENCED in the builder text (so the list cannot contain fiction), and the count must be 76
   (so a name cannot be quietly dropped to make a red go away). */
const DEPS = [
  '_diBlankNudge', '_dLbl', 'formatCurrencyDisplay', 'state', '_diSignals', 'getBaseType',
  '_isTaxableRoom', '_diWhyPanel', '_propInsuranceTotal', '_diIntelligence', '_linkControlHTML',
  '_carryMirrorField', '_propUpkeepSectionHTML', '_upkeepMirrorField', '_fetchLivePrime',
  'activeModalId', '_moatLumpWhatIf', '_diSetTitle', '_diIraWhyPanel', '_di457WhyPanel',
  '_di401kWhyPanel', '_diConduitWhyPanel', '_diTaxableWhyPanel', '_di402gLimits', '_diIraLimits',
  '_conduitIsInformational', '_DI_529', '_moatDI', '_cellarDI', '_helocLimitFieldHTML',
  '_helocPhaseFieldHTML', '_helocDrawEndFieldHTML', '_helocUsePurposeFieldHTML', '_moatLiveRateHTML',
  '_variableRateClusterHTML', '_moatNegAmInlineHTML', '_helocDrawInlineHTML', '_moatLumpBlockHTML',
  '_moatEscrowFieldsHTML', '_escrowFooter', '_moatPmiBarHTML', '_moatTaxFieldsHTML', '_sumLbl',
  '_moatRealMonthlyHTML', '_debtPayoffDisplay', '_payoffIntelHTML', '_isGrounds',
  '_groundsMaintDefault', '_groundsSignalsHTML', '_GROUNDS_DI_EMPTY', '_groundsAvmFor',
  '_groundsAvmResultHTML', '_propRentalFieldsHTML', '_propTypeInsuranceDI', '_propInsEducationHTML',
  '_propCoverageHTML', '_propEndorsementsHTML', '_propNfipPanelHTML', '_propHazardCoverageHTML',
  '_propHazardHTML', 'calcCarryTotal', '_groundsLinkedDebt', '_vehCostBlockHTML', '_vehAllInHTML',
  '_diIsBankRoom', '_diNarrBlock', '_diBankStrip', '_yld', '_di457ColTips', '_diIraColTips',
  '_di401kColTips', '_diLotColTips', '_diTaxColTips', '_cbFmt', '_refreshHelocLiveColor',
  '_refreshMoatLiveColor'
];
const WRITES = ['activeModalId', '_moatLumpWhatIf'];

const checks = [];
const ck = (n, ok, obs) => checks.push([n, !!ok, obs === undefined ? '' : String(obs)]);

/* ── SOURCE-SIDE (no browser needed) ────────────────────────────────────────────────────────────
 * ⛔ NOTE THE ABSENCE OF readFileSync('studio.html'). The first cut of this gate read the shell off
 * disk and _gate_studio_source's P1 leg caught it: studioSource() is the ONLY door, because a gate
 * that disk-reads studio.html goes stale the day a function it asserts about moves into a part —
 * which is the day this very commit arrived. Everything below is derived from the composed source,
 * and the "is it really in the part?" question is answered by the PART MARKERS rather than by
 * reading two files and comparing them. */
const composed = studioSource();
const builder = extractWindowFn(composed, 'openAccountModal');
const PART_OPEN = '/* ═════ studioSource PART BEGIN · ' + PART_REL + ' ═════ */';
const PART_CLOSE = '/* ═════ studioSource PART END · ' + PART_REL + ' ═════ */';

ck('S1 the DEPS manifest contains no fiction — every name is referenced in the builder text',
   DEPS.every((n) => new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b').test(builder)),
   DEPS.filter((n) => !new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b').test(builder)).join(', ') || 'all ' + DEPS.length + ' present');
ck('S2 the manifest is still 76 names (a name cannot be dropped to silence a red)',
   DEPS.length === 76, DEPS.length + ' names');
ck('S3 the two outward WRITES are in the manifest', WRITES.every((w) => DEPS.includes(w)), WRITES.join(', '));

// ── LEG 1 · REGISTRATION (source half) ──────────────────────────────────────────────────────────
ck('R1 the part is registered in PARTS[]', PART_RELS().includes(PART_REL), PART_RELS().length + ' parts');
ck('R2 studio.html carries the <script src> for it (registration is NOT wiring)',
   composed.includes('<script src="/' + PART_REL + '"></script>'), 'tag present');
/* ⭐ "IN THE PART, NOT THE SHELL" WITHOUT READING TWO FILES: the composed source is shell-then-parts,
   so the single definition must fall BETWEEN this part's markers. extractWindowFn already throws on
   a second definition, so one-and-inside is the whole claim. */
const defAt = composed.indexOf('window.openAccountModal = function(id)');
const openAt = composed.indexOf(PART_OPEN), closeAt = composed.indexOf(PART_CLOSE);
ck('R3 and the builder lives INSIDE the part markers, not in the shell (the move actually happened)',
   openAt >= 0 && closeAt > openAt && defAt > openAt && defAt < closeAt,
   `partOpen=${openAt} def=${defAt} partClose=${closeAt}`);

// ── BROWSER ─────────────────────────────────────────────────────────────────────────────────────
const b = await chromium.launch();
const p = await b.newPage();

if (NOPART || RENAME) {
  /* Mutations are served, not written to disk. Each COUNTS ITS ANCHOR and aborts unless it lands
     exactly once — a mutation that silently missed is a green that means nothing. */
  await p.route('**/studio.html', async (route) => {
    /* Mutate the RESPONSE THE BROWSER WOULD ACTUALLY GET, not a disk read of the same path — it is
       more faithful, and it keeps this gate clear of P1 (studioSource() is the only door). */
    const resp = await route.fetch();
    let body = await resp.text();
    if (NOPART) {
      const tag = '  <script src="/' + PART_REL + '"></script>\n';
      if (body.split(tag).length - 1 !== 1) throw new Error('--nopart anchor not unique');
      body = body.replace(tag, '');
    }
    if (RENAME) {
      const re = new RegExp('\\b' + RENAME + '\\b', 'g');
      const n = (body.match(re) || []).length;
      if (n === 0) throw new Error('--rename anchor absent: ' + RENAME);
      body = body.replace(re, RENAME + '__RENAMED');
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body });
  });
  console.log('   [control] ' + (NOPART ? '--nopart' : '--rename=' + RENAME) + ' applied to the served studio.html');
}

await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('#studio-layout', { timeout: 8000 });
await p.waitForTimeout(400);

// ── LEG 1 · REGISTRATION (runtime half) ─────────────────────────────────────────────────────────
const reg = await p.evaluate(() => typeof window.openAccountModal);
ck('R4 ⭐ window.openAccountModal is a function after load', reg === 'function', 'typeof = ' + reg);

// ── LEG 3 · DEPENDENCY ──────────────────────────────────────────────────────────────────────────
/* Resolved with `new Function('return typeof X')`, NOT `window[X]` — deliberately. Three of the 76
   (state, activeModalId, getBaseType) are top-level let/const, which are GLOBAL LEXICAL bindings
   and are NOT properties of window. A window[] probe would report them missing and the leg would
   red on three correct names. */
const unresolved = await p.evaluate((names) => names.filter((n) => {
  try { return new Function('return typeof ' + n)() === 'undefined'; } catch (e) { return true; }
}), DEPS);
ck('D1 ⭐ all 76 names the part reads still RESOLVE from the page',
   unresolved.length === 0,
   unresolved.length ? 'UNRESOLVED: ' + unresolved.join(', ') : 'all 76 resolve');

/* D2 — the behavioural half. Population from rDataList at RUNTIME, never a hand-list, so a new room
   type is covered the day it is born. Every base type must open without throwing AND paint. */
const opened = await p.evaluate(() => {
  const out = { threw: [], empty: [], count: 0, writes: null };
  const types = (typeof rDataList !== 'undefined' ? rDataList : []).map((r) => r.id);
  for (const t of types) {
    try {
      addInstance(t);
      const a = window.state.accounts.filter((x) => x.baseId === t).pop();
      if (!a) continue;
      out.count++;
      window.openAccountModal(a.id);
      const html = (document.getElementById('modal-dynamic-content') || {}).innerHTML || '';
      if (!html.trim()) out.empty.push(t);
      if (out.writes === null) {
        out.writes = {
          activeModalId: (typeof activeModalId !== 'undefined') && activeModalId === a.id,
          lumpCleared: (typeof _moatLumpWhatIf !== 'undefined') && _moatLumpWhatIf === ''
        };
      }
    } catch (e) { out.threw.push(t + ': ' + String(e && e.message).slice(0, 50)); }
  }
  return out;
});
ck('D2 ⭐ every account type opens without throwing and paints (population from rDataList at runtime)',
   opened.threw.length === 0 && opened.empty.length === 0 && opened.count > 0,
   opened.threw.length ? 'THREW: ' + opened.threw.slice(0, 3).join(' | ')
     : opened.empty.length ? 'PAINTED EMPTY: ' + opened.empty.join(', ')
     : opened.count + ' room types opened and painted');
ck('D3 the two outward WRITES land (activeModalId set on open, _moatLumpWhatIf cleared)',
   !!opened.writes && opened.writes.activeModalId && opened.writes.lumpCleared,
   opened.writes ? `activeModalId=${opened.writes.activeModalId} lumpCleared=${opened.writes.lumpCleared}` : 'no open succeeded');

// ── LEG 2 · WIRING ──────────────────────────────────────────────────────────────────────────────
/* ⛔ A REAL CLICK, NOT A CALL. Calling openAccountModal() proves the function runs; it does NOT
   prove the page can REACH it. The ⚙️ DETAILS button carries an inline onclick that resolves
   against window at click time, and that resolution is the thing the move could have broken. */
const wiring = await p.evaluate(async () => {
  const res = { clicked: false, rendered: false, fired: false, before: null, after: null, err: '' };
  try {
    window.state.accounts = [];
    addInstance('savings');
    const a = window.state.accounts[window.state.accounts.length - 1];
    renderInputs();
    await new Promise((r) => setTimeout(r, 250));
    const btn = Array.from(document.querySelectorAll('.details-btn'))
      .find((el) => (el.getAttribute('onclick') || '').includes(a.id));
    if (!btn) { res.err = 'no ⚙️ DETAILS button carrying the account id'; return res; }
    btn.click();                                  // <- the real handler path
    res.clicked = true;
    await new Promise((r) => setTimeout(r, 250));
    const host = document.getElementById('modal-dynamic-content');
    res.rendered = !!host && host.innerHTML.trim().length > 0;
    /* Now a handler THE BUILDER WROTE: find an input inside the modal whose oninput/onchange calls
       updateAccField, drive it the way a user would, and require the write to land in state. */
    const field = Array.from(host.querySelectorAll('input,select'))
      .find((el) => /updateAccField\(/.test((el.getAttribute('oninput') || '') + (el.getAttribute('onchange') || '')));
    if (!field) { res.err = 'no builder-written updateAccField handler found in the modal'; return res; }
    const attr = (field.getAttribute('oninput') || field.getAttribute('onchange'));
    const m = attr.match(/updateAccField\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
    if (!m) { res.err = 'could not read the field name out of: ' + attr.slice(0, 50); return res; }
    const fieldName = m[2];
    res.before = a[fieldName];
    field.value = '4321';
    field.dispatchEvent(new Event(field.getAttribute('oninput') ? 'input' : 'change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const fresh = window.state.accounts.find((x) => x.id === a.id);
    res.after = fresh ? fresh[fieldName] : undefined;
    res.fired = String(res.after) !== String(res.before);
    res.field = fieldName;
  } catch (e) { res.err = String(e && e.message).slice(0, 70); }
  return res;
});
ck('W1 ⭐ a REAL CLICK on ⚙️ DETAILS opens the modal (the inline onclick still resolves)',
   wiring.clicked && wiring.rendered, wiring.err || 'clicked and painted');
ck('W2 ⭐⭐ a handler THE BUILDER WROTE fires and its write LANDS in state',
   wiring.fired, wiring.err || `${wiring.field}: ${JSON.stringify(wiring.before)} -> ${JSON.stringify(wiring.after)}`);

await b.close();

// ── REPORT ──────────────────────────────────────────────────────────────────────────────────────
const pass = checks.filter((c) => c[1]).length;
const total = checks.length;
console.log('===== ACCOUNT MODAL PART GATE [' + LABEL + '] ===== ' + pass + '/' + total + (pass === total ? '  GREEN' : '  RED'));
for (const [n, ok, obs] of checks) console.log('  ' + (ok ? 'PASS ' : 'FAIL ') + n + (obs ? '   [observed: ' + obs + ']' : ''));
const legs = (ids) => ids.every((i) => checks.find((c) => c[0].startsWith(i))?.[1]);
console.log('  ── REGISTRATION: ' + (legs(['R1', 'R2', 'R3', 'R4']) ? 'PROVEN' : 'FAILED') +
            ' · WIRING: ' + (legs(['W1', 'W2']) ? 'PROVEN' : 'FAILED') +
            ' · DEPENDENCY: ' + (legs(['S1', 'S2', 'S3', 'D1', 'D2', 'D3']) ? 'PROVEN' : 'FAILED'));
if (NOPART || RENAME) {
  console.log((pass === total) ? '⛔ CONTROL DID NOT BITE — the mutation left the gate green.'
                               : '✅ RED-FIRST OK — the mutation makes the gate bite.');
  process.exit(pass === total ? 1 : 0);
}
/* ⭐ A VERDICT THE RUNNER CAN ACTUALLY READ. _suite_baseline reconciles each gate's EXIT CODE against
   a PRINTED verdict, and recognises six line shapes — none of which is the banner above. A gate whose
   verdict is unreadable is excluded from that reconciliation, which is the check that catches a gate
   printing RED while exiting 0. 60 of 233 gates were unreadable and THIS GATE MADE IT 60: adding one
   to a known blind spot while closing a different one is not a trade worth making.
   ⛔ SUPPRESSED UNDER THE CONTROLS ON PURPOSE — a control run is RED by design and exits 0, so a
   printed SCORE RED there would be reconciled as INCOHERENT (printed red, exited green) and the
   runner would be right to say so. The controls' verdict is the RED-FIRST line above. */
console.log('SCORE ' + pass + '/' + total + (pass === total ? ' GREEN' : ' RED'));
process.exit(pass === total ? 0 : 1);
