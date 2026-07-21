/* MISS-6 sub #2 verify — dossier prefs READ-cutover. Drives REAL Dossier.html resolver in 3 branches.
 * Distinct grossIncome per source: D1=222222, Clerk=111111. Blocks real datum-d1.js so the stub survives. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SCEN = [
  { tag: 'A_d1_present', d1: 'hit',   expectDigits: '222,222' },  // D1 dossier (newer) wins
  { tag: 'B_d1_null',    d1: 'null',  expectDigits: '111,111' },  // D1 no row -> Clerk fallback
  { tag: 'C_d1_absent',  d1: 'absent',expectDigits: '111,111' },  // DatumD1 not live -> Clerk fallback
];

function init(mode) {
  return `(${((m) => {
    var clerkDossier = { savedAt: '2020-01-01T00:00:00.000Z', primary: { grossIncome: 111111 } };
    window.Clerk = { load: () => Promise.resolve(),
      user: { id: 'u_v', unsafeMetadata: { dossier: clerkDossier }, update: () => Promise.resolve() },
      session: { getToken: async () => 'tok:u_v' } };
    if (m === 'absent') { window.DatumD1 = undefined; return; }
    var d1Dossier = { savedAt: new Date().toISOString(), primary: { grossIncome: 222222 } };
    window.DatumD1 = { CUTOVER: true, signedIn: () => true, writePreferences: () => {},
      getDoc: (type, key) => (m === 'hit' && type === 'preferences' && key === 'dossier')
        ? Promise.resolve({ payload: JSON.stringify(d1Dossier) })
        : Promise.resolve(null) };
  }).toString()})(${JSON.stringify(mode)})`;
}

(async () => {
  const browser = await chromium.launch();
  let allPass = true;
  for (const s of SCEN) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 850 } });
    await ctx.addInitScript(init(s.d1));
    await ctx.route('**/*', (r) => { const u = r.request().url();
      if (u.includes('/scripts/datum-d1.js')) return r.abort();
      return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort(); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
    await page.goto(BASE + 'Dossier.html', { waitUntil: 'load' });
    await wait(1200);
    const got = await page.evaluate(() => {
      var el = document.getElementById('salary');
      var ls = null; try { ls = JSON.parse(localStorage.getItem('datum_dossier') || 'null'); } catch (e) {}
      return { salary: el ? (el.value || el.textContent || '') : '(no #salary)',
        lsIncome: ls && ls.primary ? ls.primary.grossIncome : null, url: location.pathname };
    });
    const pass = String(got.salary).includes(s.expectDigits);
    allPass = allPass && pass;
    console.log(`${pass ? 'PASS' : 'FAIL'} [${s.tag}] expect $${s.expectDigits} | #salary="${got.salary}" lsIncome=${got.lsIncome} url=${got.url}${errs.length ? ' ERR:' + errs[0] : ''}`);
    await ctx.close();
  }
  console.log(allPass ? '\nOVERALL: GREEN — dossier D1-first, Clerk fallback, rollback-safe' : '\nOVERALL: RED');
  await browser.close();
  process.exit(allPass ? 0 : 1);
})();
