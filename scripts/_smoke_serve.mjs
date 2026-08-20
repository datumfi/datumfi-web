/* LOCAL SMOKE SERVER — serves dist/ so the Captain can walk a build BEFORE it is pushed.
 * ⛔ WHY dist/ AND NOT THE REPO ROOT: dist/ is what actually deploys. Walking the repo root would
 *    smoke a tree that Cloudflare never sees — the same "valid artifact from the wrong source"
 *    class as reading the stale workbook mirror.
 * ⚠️ Port 8080: the suite owns 8001 and self-hosts on 8141/8142; the probe uses 8431-8434.
 * Usage: node scripts/_smoke_serve.mjs   ->   http://127.0.0.1:8080/studio.html
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(ROOT)) { console.log('dist/ missing — run `npm run build` first'); process.exit(2); }
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain'};
http.createServer((q,s)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html';
  const f=path.join(ROOT,p.replace(/^\//,''));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404,{'Content-Type':'text/plain'});s.end('404 '+p);return;}
  s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  s.end(fs.readFileSync(f));
}).listen(8080,'127.0.0.1',()=>console.log('SMOKE SERVER on http://127.0.0.1:8080  (serving dist/, Ctrl-C to stop)'));
