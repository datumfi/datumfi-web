/* DEV-ONLY (scripts/_ gitignored). Yahoo Tier-2 REFERENCE pull — STOCKS ONLY: beta (5Y-monthly vs S&P)
   + trailing stock dividend-yield, for the ~most-held set (S&P500 + curated stocks). Stamps src+asOf.
   Fail-to-blank: any error/null/missing -> field omitted (never stale, never fabricated). No key. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const __d=dirname(fileURLToPath(import.meta.url));const SRC=join(__d,'_ticker-src');if(!existsSync(SRC))mkdirSync(SRC,{recursive:true});
const require=createRequire(import.meta.url);
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const ASOF=new Date().toISOString().slice(0,10);
// most-held stock symbols
async function sp500(){const fp=join(SRC,'sp500.csv');let t;if(existsSync(fp))t=readFileSync(fp,'utf8');else{const r=await fetch('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv',{headers:{'User-Agent':UA}});t=await r.text();writeFileSync(fp,t);}return t.split(/\r?\n/).slice(1).map(l=>l.split(',')[0].trim().toUpperCase()).filter(Boolean);}
const curated=require('./ticker-bundle.js');
const curStocks=Object.keys(curated).filter(k=>curated[k].instrumentType==='Stock');
const symsAll=[...new Set([...(await sp500()),...curStocks])];
console.log('most-held stock symbols:',symsAll.length);
async function crumb(){const r1=await fetch('https://fc.yahoo.com',{headers:{'User-Agent':UA}});const ck=r1.headers.get('set-cookie');const r2=await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb',{headers:{'User-Agent':UA,'Cookie':ck||''}});return{crumb:await r2.text(),cookie:ck};}
const {crumb:cr,cookie}=await crumb();
const out={};let ok=0,blank=0;
for(let i=0;i<symsAll.length;i++){const sym=symsAll[i];
  try{const url=`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=defaultKeyStatistics,summaryDetail&crumb=${encodeURIComponent(cr)}`;
    const r=await fetch(url,{headers:{'User-Agent':UA,'Cookie':cookie}});
    if(!r.ok){blank++;continue;}
    const o=await r.json();const res=o.quoteSummary?.result?.[0];
    if(!res){blank++;continue;}
    const ks=res.defaultKeyStatistics||{},sd=res.summaryDetail||{};
    const beta=(ks.beta&&typeof ks.beta.raw==='number')?ks.beta.raw:null;
    const y=(sd.trailingAnnualDividendYield&&typeof sd.trailingAnnualDividendYield.raw==='number')?sd.trailingAnnualDividendYield.raw:((sd.dividendYield&&typeof sd.dividendYield.raw==='number')?sd.dividendYield.raw:null);
    const e={};if(beta!=null){e.beta=Math.round(beta*1000)/1000;e.betaSrc='Yahoo Finance';e.betaAsOf=ASOF;e.betaMethod='5Y monthly vs S&P 500';}
    if(y!=null){e.divYield=Math.round(y*10000)/10000;e.divYieldSrc='Yahoo Finance';e.divYieldAsOf=ASOF;}
    if(Object.keys(e).length){out[sym]=e;ok++;}else blank++;
  }catch(err){blank++;}
  if(i%100===0)console.log(`  ..${i}/${symsAll.length} (ok ${ok} blank ${blank})`);
  await new Promise(r=>setTimeout(r,280));
}
writeFileSync(join(SRC,'yahoo.json'),JSON.stringify(out,null,0));
console.log(`YAHOO DONE: ok ${ok} blank ${blank} | wrote ${Object.keys(out).length} symbols`);
