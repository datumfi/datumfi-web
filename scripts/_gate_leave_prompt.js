'use strict';
/* THE LEAVE PROMPT · RED-FIRST — three branches, two independent axes, and copy asserted CHARACTER BY
 * CHARACTER against an independent transcription.
 *
 * THE TWO AXES ARE INDEPENDENT AND COLLAPSING THEM IS THE FAILURE MODE. The BASELINE (is there a last-saved
 * snapshot) decides what is at risk; AUTH STATE decides what we say. Key the copy off the baseline instead
 * of auth and a signed-in architect who has never saved is handed Branch B and invited to create an account
 * he already owns. That is not a hypothetical - it is what --flatten does, and DECIDE 9 must catch it.
 *
 * WHY THE COPY IS RE-TRANSCRIBED HERE RATHER THAN IMPORTED. Importing COPY and comparing it to itself would
 * pass no matter what it said. These strings were typed out a second time from the Architect's message, so
 * the assertion is between two independent transcriptions and any silent re-wording of the component trips
 * it. A character claim requires characters (L2).
 *
 * THE TRUTH TABLE IS EXHAUSTIVE - all 16 combinations of the four inputs, each asserted individually. A
 * routing rule with a hole is worse than no routing rule, because the hole is always the case nobody
 * imagined, and here the cases are cheap enough to enumerate completely.
 *
 * RENDER assertions read back what the DOM actually shows, not what the object holds - a correct COPY block
 * that never reaches the screen is the failure this project has shipped before.
 *
 * RACE DECLARATIONS (L52): none. decide() is pure; every render is driven and read synchronously.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');

// --flatten  keys the copy off the BASELINE instead of auth -> a signed-in, never-saved architect is
//            handed Branch B and asked to create an account he already has.
const FLATTEN  = process.argv.includes('--flatten');
// --nosilent removes the empty-state guard -> somebody who built nothing is prompted anyway.
const NOSILENT = process.argv.includes('--nosilent');

const A_FLATTEN = "    if (!s.signedIn) return 'B';                        // AUTH decides the words\n    if (!s.everSaved) return 'C';                       // BASELINE decides what is at risk";
const M_FLATTEN = "    if (!s.everSaved) return 'B';";
const A_SILENT  = "    if (!s.hasBuilt) return null;                       // nothing to keep -> say nothing";
const M_SILENT  = "    if (false) return null;";
let jsDiffers = false;

let pass = 0, fail = 0; const lines = [];
const ok = (c, m) => { if (c) pass++; else fail++; lines.push((c ? 'PASS ' : 'FAIL ') + m); };

const PAGE = '<!doctype html><html><head><meta charset="utf-8"><title>rig</title></head>' +
             '<body><script src="/scripts/datum-leave-prompt.js"></script></body></html>';

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/rig.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(fp);
  if (p === '/scripts/datum-leave-prompt.js' && (FLATTEN || NOSILENT)) {
    let src = body.toString('utf8'); const orig = src;
    const apply = (a, m, label) => {
      const n = src.split(a).length - 1;
      if (n !== 1) throw new Error(`anchor ${label}: expected exactly 1 occurrence, found ${n}`);
      src = src.replace(a, m);
    };
    if (FLATTEN)  apply(A_FLATTEN,  M_FLATTEN,  'flatten');
    if (NOSILENT) apply(A_SILENT,   M_SILENT,   'silent');
    jsDiffers = jsDiffers || (src !== orig);
    body = Buffer.from(src, 'utf8');
  }
  res.writeHead(200, { 'Content-Type': 'text/javascript' });
  res.end(body);
});
const PORT = 8254; const base = 'http://127.0.0.1:' + PORT;

/* INDEPENDENT TRANSCRIPTION — typed from the Architect's message, NOT copied from the component. */
const EXPECT = {
  A: { title: 'You have changes that are not saved yet.',
       named: 'You have made edits to Blueprint 7 since your last save. Leave now and those edits will not be here when you come back.',
       plain: 'You have made edits since your last save. Leave now and those edits will not be here when you come back.',
       btns:  ['Save and continue', 'Leave without saving', 'Stay on this page'] },
  B: { title: 'You have sketched real work here',
       p1:    'This drafting board is temporary. Without an account, everything you have built disappears the moment you leave.',
       p2:    'Create one free and it will be waiting for you next time.',
       btns:  ['Save my work', 'Sign in', 'Leave without saving', 'Keep sketching'] },
  C: { title: "You haven't saved this yet",
       p1:    "You've built something here, but it only lives in this tab. Leave now and it's gone — closing the page, a refresh, anything.",
       p2:    "Saving takes a second and it's already part of your account.",
       btns:  ['Save and continue', 'Leave without saving', 'Stay on this page'] }
};

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + '/rig.html', { waitUntil: 'load' });

  ok(await page.evaluate(() => !!(window.DatumLeavePrompt && typeof window.DatumLeavePrompt.decide === 'function')),
    'DECIDE 0: the component loaded (without this nothing below means anything)');

  // ── EXHAUSTIVE TRUTH TABLE — all 16 combinations ───────────────────────────────────────────────────
  const table = [];
  for (const hasBuilt of [false, true])
    for (const signedIn of [false, true])
      for (const everSaved of [false, true])
        for (const editedSinceSave of [false, true]) {
          let want = null;
          if (hasBuilt) {
            if (!signedIn) want = 'B';
            else if (!everSaved) want = 'C';
            else want = editedSinceSave ? 'A' : null;
          }
          table.push({ hasBuilt, signedIn, everSaved, editedSinceSave, want });
        }
  const got = await page.evaluate((t) => t.map((r) => window.DatumLeavePrompt.decide(r)), table);
  let tableBad = 0;
  table.forEach((r, i) => { if (got[i] !== r.want) tableBad++; });
  ok(tableBad === 0, `DECIDE 1: all 16 input combinations route correctly (${16 - tableBad}/16 correct)`);
  table.forEach((r, i) => {
    if (got[i] !== r.want) lines.push(`        MISROUTE built=${r.hasBuilt} in=${r.signedIn} saved=${r.everSaved} edited=${r.editedSinceSave} -> ${got[i]} want ${r.want}`);
  });

  const one = (s) => page.evaluate((x) => window.DatumLeavePrompt.decide(x), s);
  ok(await one({ hasBuilt: true, signedIn: false, everSaved: false, editedSinceSave: false }) === 'B',
    'DECIDE 2: signed out + built -> B, the conversion moment');
  ok(await one({ hasBuilt: true, signedIn: true, everSaved: false, editedSinceSave: false }) === 'C',
    'DECIDE 3: signed in + built + NO last save -> C, the most exposed person on the site');
  ok(await one({ hasBuilt: true, signedIn: true, everSaved: true, editedSinceSave: true }) === 'A',
    'DECIDE 4: signed in + built + edited since save -> A, protection');
  ok(await one({ hasBuilt: true, signedIn: true, everSaved: true, editedSinceSave: false }) === null,
    'DECIDE 5: signed in + saved + NOT edited since -> SILENT, the work is already safe');
  ok(await one({ hasBuilt: false, signedIn: false, everSaved: false, editedSinceSave: false }) === null,
    'DECIDE 6: built nothing, signed out -> SILENT');
  ok(await one({ hasBuilt: false, signedIn: true, everSaved: true, editedSinceSave: true }) === null,
    'DECIDE 7: built nothing, signed in, every other flag true -> SILENT. hasBuilt is the gate on all of it');
  ok(await one({}) === null && await one(null) === null,
    'DECIDE 8: an empty or missing state says nothing rather than guessing');
  ok(await one({ hasBuilt: true, signedIn: true, everSaved: false, editedSinceSave: true }) === 'C',
    'DECIDE 9 LOAD-BEARING: a signed-in architect with NO last save is NEVER handed Branch B — auth picks the words, the baseline picks the risk');

  // ── RENDER — read back what the DOM actually shows ──────────────────────────────────────────────────
  async function render(branch, handlers) {
    return page.evaluate((a) => {
      window.DatumLeavePrompt.close();
      window.__acts = [];
      const h = { fileName: a.fileName };
      ['onSave', 'onCreateAccount', 'onSignIn', 'onLeave', 'onStay'].forEach((k) => { h[k] = () => window.__acts.push(k); });
      window.DatumLeavePrompt.show(a.branch, h);
      const w = document.querySelector('[data-leave-prompt]');
      if (!w) return null;
      const bs = Array.from(w.querySelectorAll('button'));
      const stayBtn = bs.find((b) => b.getAttribute('data-leave-role') === 'stay');
      return {
        text: Array.from(w.querySelectorAll('div')).map((d) => d.childElementCount === 0 ? d.textContent : '').filter(Boolean),
        btns: bs.map((b) => b.textContent),
        roles: bs.map((b) => b.getAttribute('data-leave-role')),
        stayLabel: stayBtn ? stayBtn.textContent : null
      };
    }, Object.assign({ branch }, handlers || {}));
  }

  const rA = await render('A', { fileName: 'Blueprint 7' });
  ok(!!rA && rA.text.indexOf(EXPECT.A.title) >= 0 && rA.text.indexOf(EXPECT.A.named) >= 0,
    'RENDER A: title and the NAMED body render verbatim, with the file name substituted');
  ok(!!rA && JSON.stringify(rA.btns) === JSON.stringify(EXPECT.A.btns),
    `RENDER A2: all three buttons verbatim and in order (got ${JSON.stringify(rA && rA.btns)})`);

  const rAplain = await render('A', {});
  ok(!!rAplain && rAplain.text.indexOf(EXPECT.A.plain) >= 0,
    'RENDER A3: with no name resolved the clause is DROPPED, not fabricated (the Architect\'s explicit rule)');
  ok(!!rAplain && rAplain.text.join(' ').indexOf('{fileName}') < 0,
    'RENDER A4: and the raw {fileName} placeholder never reaches a human');

  const rB = await render('B');
  ok(!!rB && rB.text.indexOf(EXPECT.B.title) >= 0 && rB.text.indexOf(EXPECT.B.p1) >= 0 && rB.text.indexOf(EXPECT.B.p2) >= 0,
    'RENDER B: headline and BOTH body paragraphs render verbatim');
  ok(!!rB && JSON.stringify(rB.btns) === JSON.stringify(EXPECT.B.btns),
    `RENDER B2: all FOUR buttons verbatim and in order (got ${JSON.stringify(rB && rB.btns)})`);
  ok(!!rB && rB.text.join(' ').toLowerCase().indexOf('unsaved') < 0 && rB.text.join(' ').toLowerCase().indexOf('not saved') < 0,
    'RENDER B3 TONE FENCE: Branch B never reads as a variant of you-have-unsaved-changes');
  ok(!!rB && rB.btns.indexOf('Keep sketching') >= 0 && rB.btns.indexOf('Stay on this page') < 0,
    'RENDER B4: B stays with "Keep sketching", not "Stay on this page" — B\'s user is still MAKING it, C\'s is protecting it');

  const rC = await render('C');
  ok(!!rC && rC.text.indexOf(EXPECT.C.title) >= 0 && rC.text.indexOf(EXPECT.C.p1) >= 0 && rC.text.indexOf(EXPECT.C.p2) >= 0,
    'RENDER C: headline and BOTH body paragraphs render verbatim, em dash and apostrophes intact');
  ok(!!rC && JSON.stringify(rC.btns) === JSON.stringify(EXPECT.C.btns),
    `RENDER C2: three buttons, no account ask (got ${JSON.stringify(rC && rC.btns)})`);
  ok(!!rC && rC.text.join(' ').toLowerCase().indexOf('account') >= 0 && rC.btns.join(' ').toLowerCase().indexOf('create') < 0,
    'RENDER C3: Branch C never asks somebody who HAS an account to create one');

  /* A VISIBLE WAY TO STAY. Escape and the backdrop always worked; the defect was that nothing on screen
   * SAID so, and somebody who simply wants to keep working should not have to guess.
   * "Leave without saving" IS NOT A STAY and must never be counted as one — an earlier version of this
   * assertion accepted it and would have passed a branch with no way to stay at all.
   * ALL THREE BRANCHES ARE NOW RULED AND ALL THREE ARE ASSERTED. The census is read from the button's
   * ROLE rather than its label, because B stays with "Keep sketching" and C with "Stay on this page" —
   * asserting the label would force those two to harmonise, and the difference between them is the point. */
  const stayAll = [];
  for (const b of ['A', 'B', 'C']) {
    const r = await render(b, b === 'A' ? { fileName: 'Blueprint 7' } : {});
    stayAll.push({ b, stay: !!(r && r.roles.indexOf('stay') >= 0), label: (r && r.stayLabel) || null });
  }
  lines.push(`      [stay-button census] ${JSON.stringify(stayAll)}`);
  ok(stayAll.every((x) => x.stay),
    `RENDER 4 RULE: EVERY branch renders a visible way to stay, and "Leave without saving" is not counted as one (${JSON.stringify(stayAll)})`);

  /* BUTTONS ARE LABELS, NOT SENTENCES. Asserted as a rule over every button on every branch. */
  const punct = [];
  for (const b of ['A', 'B', 'C']) {
    const r = await render(b, b === 'A' ? { fileName: 'Blueprint 7' } : {});
    (r ? r.btns : []).forEach((t) => { if (/\.$/.test(t)) punct.push(b + ':' + t); });
  }
  ok(punct.length === 0,
    `RENDER 5 RULE: no button label on any branch ends in a period (offenders ${JSON.stringify(punct)})`);

  // ── DISMISS NEVER NAVIGATES ────────────────────────────────────────────────────────────────────────
  const startUrl = page.url();
  await render('C');
  await page.keyboard.press('Escape');
  const afterEsc = await page.evaluate(() => ({ open: window.DatumLeavePrompt.isOpen(), acts: window.__acts.slice() }));
  ok(afterEsc.open === false && page.url() === startUrl,
    'DISMISS 1: Escape closes the dialog and navigates NOWHERE — the user is exactly where they were');
  ok(JSON.stringify(afterEsc.acts) === JSON.stringify(['onStay']),
    `DISMISS 2: Escape runs the stay path and nothing else (ran ${JSON.stringify(afterEsc.acts)})`);

  await render('C');
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('[data-leave-prompt] button')).find((x) => /save and continue/i.test(x.textContent));
    if (!b) return null;
    b.click();
    return { open: window.DatumLeavePrompt.isOpen(), acts: window.__acts.slice() };
  });
  ok(!!clicked && JSON.stringify(clicked.acts) === JSON.stringify(['onSave']) && clicked.open === false,
    `DISMISS 3 POSITIVE CONTROL: the primary button DOES fire its handler and close (ran ${JSON.stringify(clicked && clicked.acts)}) — without this the zeros above prove nothing`);

  await browser.close();
  await new Promise((r) => server.close(r));

  const MUTATED = FLATTEN || NOSILENT;
  if (MUTATED) {
    console.log(`\nPOISON LANDED? ${jsDiffers ? 'YES' : 'NO'}   (datum-leave-prompt.js bytes changed: ${jsDiffers})`);
    if (!jsDiffers) { console.log('MUTATION DID NOT APPLY — this run proves nothing. Fix the anchor.'); process.exit(2); }
  }
  console.log('\n' + lines.join('\n'));
  const _tag = FLATTEN ? 'MUTATED[flatten]' : NOSILENT ? 'MUTATED[nosilent]' : 'CLEAN';
  console.log(`\n${_tag}  GREEN ${pass} / RED ${fail}`);
  if (MUTATED) {
    console.log(fail > 0 ? 'RED-FIRST OK — the mutation BIT.' : 'RED-FIRST FAILED — the poison landed and nothing noticed.');
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('GATE CRASH', e); process.exit(2); });
