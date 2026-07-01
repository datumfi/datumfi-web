/* DEV-ONLY (scripts/_ gitignored). Fetch + cache per-CIK SEC submissions for every named STOCK
   with a CIK, so Stage-2 sector/geography reads from local cache. Resumable (skips cached),
   throttled ~9/s (SEC allows 10). Writes _ticker-src/sec-sub/<CIK>.json. Fail-to-skip, never crash. */
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const __d=dirname(fileURLToPath(import.meta.url));const SRC=join(__d,'_ticker-src');
const OUT=join(SRC,'sec-sub');if(!existsSync(OUT))mkdirSync(OUT,{recursive:true});
const UA='DatumFI-research/1.0 (admin@datumfi.com)';
const sec=JSON.parse(readFileSync(join(SRC,'company_tickers.json'),'utf8'));
const t2c={};for(const k in sec){const r=sec[k];if(r&&r.ticker)t2c[String(r.ticker).toUpperCase()]=r.cik_str;}
function parse(txt,sc,ec){const o=[];const L=txt.split(/\r?\n/);for(let i=1;i<L.length;i++){const ln=L[i];if(!ln||ln.startsWith('File Creation Time'))continue;const c=ln.split('|');const s=(c[sc]||'').trim();if(!s)continue;o.push({sym:s.toUpperCase(),etf:(c[ec]||'').trim()==='Y'});}return o;}
const listed=parse(readFileSync(join(SRC,'nasdaqlisted.txt'),'utf8'),0,6).concat(parse(readFileSync(join(SRC,'otherlisted.txt'),'utf8'),0,4));
const seen=new Set();const ciks=new Set();
for(const r of listed){if(seen.has(r.sym))continue;seen.add(r.sym);if(!r.etf&&t2c[r.sym])ciks.add(String(t2c[r.sym]).padStart(10,'0'));}
const list=[...ciks];const already=new Set(readdirSync(OUT).map(f=>f.replace('.json','')));
const todo=list.filter(c=>!already.has(c));
console.log(`SEC cache: ${list.length} stock CIKs | cached ${already.size} | todo ${todo.length}`);
let ok=0,fail=0;
for(let i=0;i<todo.length;i++){
  const cik=todo[i];
  try{const r=await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`,{headers:{'User-Agent':UA,'Accept':'application/json'}});
    if(r.ok){const o=await r.json();writeFileSync(join(OUT,cik+'.json'),JSON.stringify({sic:o.sic||'',sicDescription:o.sicDescription||'',stateOfIncorporation:o.stateOfIncorporation||'',tickers:o.tickers||[]}));ok++;}else fail++;
  }catch(e){fail++;}
  if(i%250===0)console.log(`  ..${i}/${todo.length} (ok ${ok} fail ${fail})`);
  await new Promise(r=>setTimeout(r,110));
}
console.log(`SEC cache DONE: ok ${ok} fail ${fail} | total cached ${readdirSync(OUT).length}`);
