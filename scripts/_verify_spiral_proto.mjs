/* spiral redesign PROTOTYPE (#354) — inject candidate CSS over the served page, drive every state.
 * MODEL: brass rings ALWAYS visible & ABOVE the leaf (pages thread under a static coil);
 * ONLY the blue plastic tube (.spiral::before) is gated to page-1 (cover). */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const OUT = process.argv[2] || '.';

const CANDIDATE_CSS = `
  /* rings sit ABOVE the leaf(20): a static coil the pages thread under -> always on both gutter edges */
  .spiral{ z-index:25 !important; opacity:1 !important; }
  .sketchbook-wrapper.past-cover .spiral{ opacity:1 !important; }   /* rings NEVER fade */
  /* decouple the blue plastic tube: fade it, and hide it OFF the cover (page 1) */
  .spiral::before{ transition:opacity var(--fold-ms) ease !important; }
  .sketchbook-wrapper.past-cover .spiral::before{ opacity:0 !important; }
`;

const CLERK_STUB = () => { window.Clerk = { load: () => Promise.resolve(),
  user: { id: 'u_v', unsafeMetadata: {}, update: () => Promise.resolve() },
  session: { getToken: async () => 'tok:u_v' } }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CLIP = { x: 0, y: 275, width: 380, height: 500 };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(CLERK_STUB);
  await ctx.route('**/*', (r) => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  await page.goto(BASE + 'sketchbook.html', { waitUntil: 'load' });
  await wait(900);
  if (process.argv[3] !== 'baked') await page.addStyleTag({ content: CANDIDATE_CSS });
  else console.log('(baked mode — NO CSS injection, testing the real file bytes)');
  const seed = await page.evaluate(() => {
    const mk = (n) => ({ sketch_id: 's' + n, resolved_state: 'EXPANSIVE', age: 40, retire_age: 65,
      plan_end_age: 95, portfolio_mass: 500000, contributions: 20000, datum_spend: 60000, status: 'Drafted' });
    if (Array.isArray(window._skFull)) { window._skFull.length = 0; for (let i = 1; i <= 9; i++) window._skFull.push(mk(i)); }
    document.documentElement.style.setProperty('--fold-ms', '2600ms');
    if (typeof window.renderPage === 'function') window.renderPage();
    return { len: window._skFull.length, pc: document.getElementById('sk-page-count')?.textContent };
  });
  console.log('SEED', JSON.stringify(seed));

  const snap = async (tag) => {
    const m = await page.evaluate(() => {
      const sp = document.querySelector('.spiral'); const before = sp ? getComputedStyle(sp, '::before') : null;
      const stage = document.getElementById('sk-stage');
      return { spOpacity: sp ? getComputedStyle(sp).opacity : null, blueOpacity: before ? before.opacity : null,
        leafOn: stage?.classList.contains('leaf-on'), folded: stage?.classList.contains('folded'),
        pastCover: document.querySelector('.sketchbook-wrapper')?.classList.contains('past-cover'),
        page: document.getElementById('sk-page-count')?.textContent };
    });
    await page.screenshot({ path: `${OUT}/proto_${tag}.png`, clip: CLIP });
    console.log(`  ${tag}`, JSON.stringify(m));
  };

  await snap('01_p1_rest');
  await page.evaluate(() => window.turnPage(1)); await wait(1300); await snap('02_fwd12_mid'); await wait(1600); await snap('03_p2_rest');
  await page.evaluate(() => window.turnPage(2)); await wait(1300); await snap('04_fwd23_mid'); await wait(1600); await snap('05_p3_rest');
  await page.evaluate(() => window.turnPage(1)); await wait(1300); await snap('06_rev32_mid'); await wait(1600); await snap('07_p2_rest2');
  await page.evaluate(() => window.turnPage(0)); await wait(1000); await snap('08_rev21_early'); await wait(1000); await snap('09_rev21_mid'); await wait(1500); await snap('10_p1_rest2');
  await browser.close();
})();
