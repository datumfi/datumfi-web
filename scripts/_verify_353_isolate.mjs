/* #353 isolate — deterministic static proof of the z-order fix.
 * Force the "stage lifted" turn state (leaf-on, spiral opacity 1, leaf/leaf-base hidden so only
 * base-page + spiral compete). Tight-crop the ring-lap region where the inboard ::after laps the page.
 *   OLD: stage z-30 > spiral z-24  -> base page occludes the inboard ring (clipped at page edge).
 *   NEW: spiral z-18 INSIDE stage, above base page -> inboard ring survives. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const OUT = process.argv[2] || '.';
const CLERK_STUB = () => { window.Clerk = { load: () => Promise.resolve(),
  user: { id: 'u_verify', unsafeMetadata: {}, update: () => Promise.resolve() },
  session: { getToken: async () => 'tok:u_verify' } }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CLIP = { x: 44, y: 300, width: 200, height: 210 };  // ~2 rings across the page's left edge

async function run(file, tag) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(CLERK_STUB);
  await ctx.route('**/*', (r) => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  await page.goto(BASE + file, { waitUntil: 'load' });
  await wait(1000);
  const meta = await page.evaluate(() => {
    // seed one page so real page-1 content sits under the spiral
    const mk = (n) => ({ sketch_id: 's' + n, resolved_state: 'EXPANSIVE', age: 40, retire_age: 65,
      plan_end_age: 95, portfolio_mass: 500000, contributions: 20000, datum_spend: 60000, status: 'Drafted' });
    if (Array.isArray(window._skFull)) { window._skFull.length = 0; window._skFull.push(mk(1)); }
    if (typeof window.renderPage === 'function') window.renderPage();
    const stage = document.getElementById('sk-stage');
    const wrap = document.querySelector('.sketchbook-wrapper');
    if (wrap) wrap.classList.remove('past-cover');       // spiral fully opaque
    stage.classList.add('leaf-on');                      // LIFT the stage (the turn's z-30 state)
    stage.classList.remove('folded');
    document.querySelectorAll('#sk-leaf, .leaf-base').forEach((n) => { n.style.visibility = 'hidden'; });
    const sp = document.querySelector('.spiral');
    return { spOpacity: getComputedStyle(sp).opacity, spZ: getComputedStyle(sp).zIndex,
      spParent: sp.parentElement.id || sp.parentElement.className,
      leafOn: stage.classList.contains('leaf-on') };
  });
  await wait(150);
  await page.screenshot({ path: `${OUT}/isolate_${tag}.png`, clip: CLIP });
  console.log(`[${tag}] ${file}:`, JSON.stringify(meta));
  await browser.close();
}
(async () => { await run('sketchbook.html', 'NEW'); await run('_verify_sk_old.html', 'OLD'); })();
