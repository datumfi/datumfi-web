/* #354 — capture forward-fold at several leaf angles to rule out "rings through paper". */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const OUT = process.argv[2] || '.';
const CSS = `.spiral{ z-index:25 !important; opacity:1 !important; }
  .sketchbook-wrapper.past-cover .spiral{ opacity:1 !important; }
  .spiral::before{ transition:opacity var(--fold-ms) ease !important; }
  .sketchbook-wrapper.past-cover .spiral::before{ opacity:0 !important; }`;
const CLERK = () => { window.Clerk = { load: () => Promise.resolve(),
  user: { id: 'u', unsafeMetadata: {}, update: () => Promise.resolve() }, session: { getToken: async () => 't' } }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CLIP = { x: 0, y: 275, width: 380, height: 500 };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(CLERK);
  await ctx.route('**/*', (r) => { const u = r.request().url(); return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  await page.goto(BASE + 'sketchbook.html', { waitUntil: 'load' });
  await wait(900); await page.addStyleTag({ content: CSS });
  await page.evaluate(() => { const mk = (n) => ({ sketch_id: 's' + n, resolved_state: 'EXPANSIVE', age: 40, retire_age: 65, plan_end_age: 95, portfolio_mass: 5e5, contributions: 2e4, datum_spend: 6e4, status: 'D' });
    window._skFull.length = 0; for (let i = 1; i <= 9; i++) window._skFull.push(mk(i));
    document.documentElement.style.setProperty('--fold-ms', '4000ms'); window.renderPage(); });
  const snap = async (t) => { const ang = await page.evaluate(() => { const l = document.getElementById('sk-leaf'); return getComputedStyle(l).transform.slice(0, 24); });
    await page.screenshot({ path: `${OUT}/ang_${t}.png`, clip: CLIP }); console.log(t, ang); };
  await page.evaluate(() => window.turnPage(1));
  await wait(500);  await snap('a_10pct');
  await wait(700);  await snap('b_30pct');
  await wait(800);  await snap('c_50pct');
  await wait(900);  await snap('d_72pct');
  await wait(700);  await snap('e_90pct');
  await b.close();
})();
