/* #357-fix verify — sketch->studio Plan-Through Age carry. Drives the REAL studio ?hydrate=sketch
 * flow with a stashed sketch (plan_end_age=99). NEW must land sl-plan-through=99; OLD must NOT (proves
 * the seed is what carries it). Clerk stubbed; a blueprint is seeded so OLD reproduces a non-99 default. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = 'SK357';

const SEED = () => {
  window.Clerk = { load: () => Promise.resolve(),
    user: { id: 'u_v', unsafeMetadata: {}, update: () => Promise.resolve() },
    session: { getToken: async () => 'tok:u_v' } };
  // the sketch card being opened — plan_end_age 99 is the value that must reach the studio slider
  var sketch = { sketch_id: 'SK357', age: 40, retire_age: 65, plan_end_age: 99,
    portfolio_mass: 750000, contributions: 25000, s1_datum: 70000, datum_spend: 70000,
    resolved_state: 'EXPANSIVE' };
  try { localStorage.setItem('datum_sketch_byid_SK357', JSON.stringify(sketch)); } catch (e) {}
};

async function run(browser, file, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(SEED);
  await ctx.route('**/*', (r) => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto(`${BASE}${file}?hydrate=sketch&id=${ID}`, { waitUntil: 'load' });
  await wait(3000);   // 600ms handshake + date dispatch + settle
  const got = await page.evaluate(() => ({
    pta: (document.getElementById('sl-plan-through') || {}).value,
    ptaLabel: (document.getElementById('val-plan-through') || {}).textContent,
    age: (document.getElementById('slider-age') || {}).value,
    act: (document.getElementById('slider-activation') || {}).value,
    url: location.pathname + location.search,
  }));
  console.log(`[${tag}] ${file}  sl-plan-through=${got.pta} label="${got.ptaLabel}" age=${got.age} act=${got.act} url=${got.url}${errs.length ? '  ERR:' + errs[0] : ''}`);
  await ctx.close();
  return got;
}

(async () => {
  const browser = await chromium.launch();
  const nw = await run(browser, 'studio.html', 'NEW');
  const old = await run(browser, '_verify_studio_old.html', 'OLD');
  await browser.close();
  const pass = String(nw.pta) === '99' && String(old.pta) !== '99';
  console.log(`\nNEW pta=${nw.pta} (want 99), OLD pta=${old.pta} (want !=99)`);
  console.log(pass ? 'OVERALL: GREEN — the seed carries plan_end_age; without it the value defaults' : 'OVERALL: RED');
  process.exit(pass ? 0 : 1);
})();
