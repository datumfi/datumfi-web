/* MISS-6 verify — prefs READ-cutover (workspaceName). Drives the REAL my-account.html resolver in 3
 * branches. Blocks the real /scripts/datum-d1.js so the injected DatumD1 stub survives, stubs Clerk. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// scenario: how the stubbed DatumD1.getDoc behaves. Clerk mirror name is always 'ClerkFallbackName'.
const SCENARIOS = [
  { tag: 'A_d1_present', d1: 'live-hit',  expect: 'D1WorkspaceName' },   // D1 row exists -> D1 wins
  { tag: 'B_d1_null',    d1: 'live-null', expect: 'ClerkFallbackName' }, // D1 reachable, no row -> Clerk
  { tag: 'C_d1_absent',  d1: 'absent',    expect: 'ClerkFallbackName' }, // DatumD1 not live -> Clerk
];

function initScript(mode) {
  return `(${((m) => {
    window.Clerk = {
      load: () => Promise.resolve(),
      user: { id: 'u_v', unsafeMetadata: { workspaceName: 'ClerkFallbackName' }, update: () => Promise.resolve() },
      session: { getToken: async () => 'tok:u_v' },
    };
    if (m === 'absent') { window.DatumD1 = undefined; return; }
    window.DatumD1 = {
      CUTOVER: true,
      signedIn: () => true,
      writePreferences: () => {},
      getDoc: (type, key) => {
        if (m === 'live-hit' && type === 'preferences' && key === 'workspaceName')
          return Promise.resolve({ payload: JSON.stringify({ workspaceName: 'D1WorkspaceName' }) });
        return Promise.resolve(null);   // live-null: reachable, no row
      },
    };
  }).toString()})(${JSON.stringify(mode)})`;
}

(async () => {
  const browser = await chromium.launch();
  let allPass = true;
  for (const s of SCENARIOS) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    await ctx.addInitScript(initScript(s.d1));
    // block the REAL datum-d1.js (so our stub isn't overwritten) + all externals
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('/scripts/datum-d1.js')) return route.abort();
      if (u.startsWith(BASE) || u.startsWith('data:')) return route.continue();
      return route.abort();
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
    await page.goto(BASE + 'my-account.html', { waitUntil: 'load' });
    await wait(700);   // let the load handler + async resolver settle
    const got = await page.evaluate(() => ({
      name: (document.getElementById('workspaceName') || {}).textContent || '',
      profile: (document.getElementById('acct-profile-name') || {}).textContent || '',
      ls: localStorage.getItem('datum_workspace_name') || '',
      url: location.pathname,
    }));
    const pass = got.name === s.expect && got.ls === s.expect;
    allPass = allPass && pass;
    console.log(`${pass ? 'PASS' : 'FAIL'} [${s.tag}] expect="${s.expect}" got name="${got.name}" ls="${got.ls}" url=${got.url}${errs.length ? ' ERR:' + errs[0] : ''}`);
    await ctx.close();
  }
  console.log(allPass ? '\nOVERALL: GREEN (D1-first with Clerk fallback, all 3 branches)' : '\nOVERALL: RED');
  await browser.close();
  process.exit(allPass ? 0 : 1);
})();
