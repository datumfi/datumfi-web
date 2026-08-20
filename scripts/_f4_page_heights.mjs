/* F4 — HOW TALL IS EVERY LIVE PAGE? The one number the site-wide field decision turns on.
 *
 * ⛔ F4 HAS BLOCKED THE SITE-WIDE SKIN FOR THE WHOLE ARC AND HAD NEVER HAD FIGURES ATTACHED: a
 * 180deg graded field is lit for its first screen and flat for the rest, and proto2 never solved
 * it because `.right` is min-height:920px — A ONE-SCREEN DESIGN. Our marketing pages are not.
 *
 * MEASURED 2026-08-20 at 1440x900 (reproduces the earlier figures independently):
 *   methodology 13.84 · method 13.72 · index 9.07 · philosophy 6.28 · range/why-a-range 4.48
 *   privacy 3.79 · terms 3.59 · pricing 2.25 · dsar 1.62 · privacy-choices 1.22 · sketch 1.10
 *   studio 1.00
 * 🔑 IT IS NOT "THE SITE IS LONG" — IT IS FOUR PAGES LONG AND NINE SHORT. 5 of 13 sit at or under
 *    2.25 viewports, where the donor's one-screen field works essentially as-is. That is a far
 *    smaller design question than the one that was blocking us.
 *
 * ⛔ NOT NAMED _gate_* OR _p<digit>*: the suite's population is /^(_gate_|_p\d)/ and this is a
 *    TOOL you point at a question, never a gate that runs itself. It ASSERTS NOTHING — it reports.
 * ⚠️ SETTLE: 2500ms. Pages with entrance animations need it; index.html moves 9.3% of its pixels
 *    between two captures taken too early. A height read mid-animation is a height of the clock.
 *
 * Usage: node scripts/_f4_page_heights.mjs index.html methodology.html ...
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html';
  const f=path.join(ROOT,p.replace(/^\//,'')); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end();return;}
  s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}); s.end(fs.readFileSync(f));});
await new Promise(r=>srv.listen(8433,'127.0.0.1',r));
const pages=process.argv.slice(2);
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const pg=await ctx.newPage();
await pg.route('**/*',(r)=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
const rows=[];
for(const f of pages){
  try{ await pg.goto(`http://127.0.0.1:8433/${encodeURIComponent(f)}`,{waitUntil:'load',timeout:20000}); await pg.waitForTimeout(2500);
    const h=await pg.evaluate(()=>document.documentElement.scrollHeight);
    rows.push([f,h,(h/900)]);
  }catch(e){ rows.push([f,-1,-1]); }
}
await b.close(); srv.close();
rows.sort((a,c)=>c[2]-a[2]);
console.log('page'.padEnd(42)+'scrollH'.padStart(9)+'  viewports @900');
for(const [f,h,v] of rows) console.log(f.padEnd(42)+String(h).padStart(9)+'  '+(v<0?'ERROR':v.toFixed(2)));
