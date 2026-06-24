/* S2.2 keyed-room-node gate — RED pre-wire, GREEN post-wire. The identity checks reproduce
   the exact symptom via the app's own render path (Lesson 47): a wrapper tagged before a
   structural renderInputs() must SURVIVE add/remove of a sibling. Today's innerHTML wipe
   re-creates the node (tag lost) -> RED. Guardrails assert no render regression (GREEN both).
   Usage: node scripts/_probe_s2_keyed.js [LABEL] */
const { chromium } = require('playwright');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const rc = document.getElementById('rooms-container');
    // ---- identity contract ----
    window.state.accounts = [];
    window.addInstance('taxable');
    const idA = window.state.accounts[window.state.accounts.length - 1].id;
    const wrapA = document.getElementById('inp-wrapper-' + idA);
    const tagApplied = !!wrapA;
    if (wrapA) wrapA.dataset._ptag = 'KEEP';
    window.addInstance('rothira');                 // structural render
    const idB = window.state.accounts[window.state.accounts.length - 1].id;
    const aAfterAdd = document.getElementById('inp-wrapper-' + idA);
    const identityAfterAdd = !!(aAfterAdd && aAfterAdd.dataset._ptag === 'KEEP');
    window.removeInstance(idB);                     // structural render
    const aAfterRem = document.getElementById('inp-wrapper-' + idA);
    const identityAfterRemove = !!(aAfterRem && aAfterRem.dataset._ptag === 'KEEP');

    // ---- render-parity guardrails (green both) ----
    window.state.accounts = [];
    ['taxable', 'mortgage_joint', 'checking'].forEach(bid => window.addInstance(bid));
    const accCount = window.state.accounts.length;
    const cardCount = rc.querySelectorAll('.room-input-container').length;
    const contribRows = rc.querySelectorAll('.contribution-row').length;     // taxable + checking = 2 (debt none)
    const exIcons = rc.querySelectorAll('.shape-info-icon.tip-room').length; // checking = 1
    let allHaveVal = true;
    window.state.accounts.forEach(a => { if (!document.getElementById('room-val-inp-' + a.id)) allHaveVal = false; });
    return { tagApplied, identityAfterAdd, identityAfterRemove, accCount, cardCount, contribRows, exIcons, allHaveVal };
  });
  await b.close();

  const ok = (n, c) => { console.log(`${n.padEnd(42)} -> ${c ? 'GREEN' : 'RED'}`); return c; };
  console.log('===== S2.2 KEYED GATE [' + LABEL + '] =====');
  const a0 = ok('fixture: wrapper A tagged',          R.tagApplied === true);
  const a1 = ok('identity: A survives ADD of sibling', R.identityAfterAdd === true);
  const a2 = ok('identity: A survives REMOVE of sib',  R.identityAfterRemove === true);
  const g1 = ok('guardrail: card count === accounts',  R.cardCount === R.accCount && R.accCount === 3);
  const g2 = ok('guardrail: contrib rows = 2',         R.contribRows === 2);
  const g3 = ok('guardrail: exclusion icon = 1',       R.exIcons === 1);
  const g4 = ok('guardrail: every acc has value input', R.allHaveVal === true);
  console.log('detail:', JSON.stringify(R));
  const all = a0 && a1 && a2 && g1 && g2 && g3 && g4;
  console.log('OVERALL: ' + (all ? 'GREEN' : 'RED'));
  process.exit(all ? 0 : 1);
})().catch(e => { console.error('GATE ERROR:', e.message); process.exit(2); });
