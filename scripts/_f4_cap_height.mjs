/* F4 — WHERE DOES proto2's FIELD RAMP ACTUALLY COMPLETE, AND IS IT vh-RELATIVE OR FIXED px?
 * The cap height cannot be read off the stops: `0% / 24% / 100%` are claims about .app's BOX
 * (§82.16), and .app is `min-height:100vh` with a `min-height:920px` stage inside it — so its
 * real height is max(viewport, content) and may behave DIFFERENTLY at different viewports.
 * ⛔ A CAP EXPRESSED AS A PERCENTAGE OF A 13-VIEWPORT PAGE IS A DIFFERENT ANIMAL FROM ONE IN PIXELS.
 * This measures the box, not the declaration. It ASSERTS NOTHING.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.woff2':'font/woff2'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/proto2.html';
  const f=path.join(ROOT,p.replace(/^\//,'')); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end();return;}
  s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}); s.end(fs.readFileSync(f));});
await new Promise(r=>srv.listen(8434,'127.0.0.1',r));
const b=await chromium.launch();
console.log('viewport      .app h   .right h   ramp 24% at   ramp 100% at   .app/vh');
for (const [w,h] of [[1440,900],[1366,768],[1920,1080]]) {
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
  const pg=await ctx.newPage();
  await pg.route('**/*',(r)=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());
  await pg.goto('http://127.0.0.1:8434/proto2.html',{waitUntil:'load'}); await pg.waitForTimeout(2500);
  const m=await pg.evaluate(()=>{
    const a=document.querySelector('.app'), r=document.querySelector('.right');
    return {app:a?a.getBoundingClientRect().height:-1, right:r?r.getBoundingClientRect().height:-1};
  });
  await ctx.close();
  console.log(String(w+'x'+h).padEnd(14)+String(Math.round(m.app)).padStart(6)+String(Math.round(m.right)).padStart(11)
    +String(Math.round(m.app*0.24)).padStart(14)+String(Math.round(m.app)).padStart(15)
    +('  '+(m.app/h).toFixed(3)).padStart(10));
}
await b.close(); srv.close();
