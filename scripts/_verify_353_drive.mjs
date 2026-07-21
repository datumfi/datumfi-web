/* #353 drive — seed 9 sketches, drive REAL turnPage folds, capture binding-region frames.
 * Phases: forward p1->p2, reverse p2->p1 (KEY: both rings together), mid-book p2->p3 (spiral hidden). */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const OUT = process.argv[2] || '.';
const FILE = process.argv[3] || 'sketchbook.html';

const CLERK_STUB = () => {
  window.Clerk = {
    load: () => Promise.resolve(),
    user: { id: 'u_verify', unsafeMetadata: {}, update: () => Promise.resolve() },
    session: { getToken: async () => 'tok:u_verify' },
  };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// crop to the left binding region (rings hang ~x61, stage left ~x111)
const CLIP = { x: 20, y: 280, width: 460, height: 480 };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(CLERK_STUB);
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(BASE + FILE, { waitUntil: 'load' });
  await wait(1000);

  // ---- seed 9 contracts into the live list, slow the fold ----
  const seeded = await page.evaluate(() => {
    const mk = (n) => ({ sketch_id: 's' + n, resolved_state: 'EXPANSIVE', s1_resolved_state: 'EXPANSIVE',
      age: 40, retire_age: 65, plan_end_age: 95, portfolio_mass: 500000, contributions: 20000,
      datum_spend: 60000, status: 'Drafted', date_stamped: '2026-07-19', time_stamped: '10:00' });
    if (Array.isArray(window._skFull)) { window._skFull.length = 0; for (let i = 1; i <= 9; i++) window._skFull.push(mk(i)); }
    window._skPager = null;                       // may be a no-op if closured; pager getter reads _skFull live
    document.documentElement.style.setProperty('--fold-ms', '3000ms');
    if (typeof window.renderPage === 'function') window.renderPage();
    const foot = document.getElementById('sk-page-foot');
    const cnt = document.getElementById('sk-page-count');
    return { len: window._skFull.length, footShown: foot ? getComputedStyle(foot).display : 'n/a',
      pageCount: cnt ? cnt.textContent : 'n/a', fold: getComputedStyle(document.documentElement).getPropertyValue('--fold-ms') };
  });
  console.log('SEED:', JSON.stringify(seeded));

  const snap = async (tag) => {
    const meta = await page.evaluate(() => {
      const sp = document.querySelector('.spiral'); const stage = document.getElementById('sk-stage');
      const leaf = document.getElementById('sk-leaf');
      return { spOpacity: sp ? +getComputedStyle(sp).opacity.slice(0, 5) : null,
        leafOn: stage ? stage.classList.contains('leaf-on') : null,
        folded: stage ? stage.classList.contains('folded') : null,
        coverOn: stage ? stage.classList.contains('cover-on') : null,
        pastCover: document.querySelector('.sketchbook-wrapper')?.classList.contains('past-cover'),
        leafTransform: leaf ? getComputedStyle(leaf).transform.slice(0, 30) : null,
        page: document.getElementById('sk-page-count')?.textContent };
    });
    await page.screenshot({ path: `${OUT}/${tag}.png`, clip: CLIP });
    console.log(`  ${tag}:`, JSON.stringify(meta));
  };

  await snap('p1_rest');

  // ---- FORWARD p1 -> p2 (rings should get covered by leaf / fade, no premature flash) ----
  console.log('FORWARD p1->p2:');
  await page.evaluate(() => window.turnPage(1));
  await wait(700);  await snap('fwd_early');
  await wait(900);  await snap('fwd_mid');
  await wait(1600); await snap('fwd_settled');   // > 3000+60 total

  // ---- REVERSE p2 -> p1 (KEY: both outboard ::before AND inboard ::after arrive TOGETHER) ----
  console.log('REVERSE p2->p1 (KEY):');
  await page.evaluate(() => window.turnPage(0));
  await wait(700);  await snap('rev_early');
  await wait(800);  await snap('rev_mid');
  await wait(700);  await snap('rev_late');
  await wait(1400); await snap('rev_settled');

  // ---- go to p2, then MID-BOOK p2 -> p3 (spiral must stay hidden throughout) ----
  console.log('MID-BOOK setup -> p2, then p2->p3:');
  await page.evaluate(() => window.turnPage(1));
  await wait(3300); await snap('p2_rest');
  await page.evaluate(() => window.turnPage(2));
  await wait(1200); await snap('p2p3_mid');
  await wait(2400); await snap('p3_rest');

  if (errs.length) console.log('PAGEERRORS:', errs.slice(0, 8));
  await browser.close();
})();
