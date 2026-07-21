/* #353 recon — load sketchbook (new) + old under stubbed Clerk, report spiral geometry, probe drive symbols. */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8011/';
const OUT = process.argv[2] || '.';

const CLERK_STUB = () => {
  window.Clerk = {
    load: () => Promise.resolve(),
    user: { id: 'u_verify', unsafeMetadata: {}, update: () => Promise.resolve() },
    session: { getToken: async () => 'tok:u_verify' },
  };
};

async function inspect(browser, file, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(CLERK_STUB);
  // block anything not on our local origin (Clerk CDN, fonts, analytics)
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(BASE + file, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const sp = document.querySelector('.spiral');
    const stage = document.getElementById('sk-stage');
    const cs = sp ? getComputedStyle(sp) : null;
    const r = sp ? sp.getBoundingClientRect() : null;
    const sr = stage ? stage.getBoundingClientRect() : null;
    const ring0 = document.querySelector('.spiral .ring');
    const rr = ring0 ? ring0.getBoundingClientRect() : null;
    return {
      hasSpiral: !!sp, hasStage: !!stage,
      spiralParent: sp ? (sp.parentElement.id || sp.parentElement.className) : null,
      spiralInsideStage: !!(sp && stage && stage.contains(sp)),
      z: cs ? cs.zIndex : null, pos: cs ? cs.position : null,
      left: cs ? cs.left : null, opacity: cs ? cs.opacity : null,
      spiralRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      stageRect: sr ? { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) } : null,
      ring0Rect: rr ? { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width) } : null,
      // drive-symbol probe
      typeofTurnPage: typeof window.turnPage,
      typeofSkFull: typeof window._skFull,
      skFullLen: (typeof window._skFull !== 'undefined' && window._skFull) ? window._skFull.length : 'n/a',
      typeofRenderPage: typeof window.renderPage,
      pastCover: document.querySelector('.sketchbook-wrapper')?.classList.contains('past-cover'),
    };
  });
  console.log(`\n===== [${tag}] ${file} =====`);
  console.log(JSON.stringify(info, null, 2));
  if (errs.length) console.log('pageerrors:', errs.slice(0, 5));
  await page.screenshot({ path: `${OUT}/recon_${tag}.png` });
  await ctx.close();
  return info;
}

(async () => {
  const browser = await chromium.launch();
  await inspect(browser, 'sketchbook.html', 'NEW');
  await inspect(browser, '_verify_sk_old.html', 'OLD');
  await browser.close();
})();
