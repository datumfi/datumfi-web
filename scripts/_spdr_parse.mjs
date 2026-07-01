/* DEV-ONLY. Minimal pure-node xlsx reader (ZIP central-dir + zlib.inflateRaw) — no npm dep.
   Parses cached _ticker-src/spdr.xlsx -> {TICKER:{expRatio, assetClass}} issuer Tier-1 (SSGA/SPDR).
   Expense from Net (fallback Gross); asset-class broad (Equity/Fixed Income/etc). No yield in this file. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {inflateRawSync} from 'node:zlib';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const __d=dirname(fileURLToPath(import.meta.url));const SRC=join(__d,'_ticker-src');
export function readXlsx(fp){
  const b=readFileSync(fp);
  // find EOCD
  let eo=-1;for(let i=b.length-22;i>=0;i--){if(b.readUInt32LE(i)===0x06054b50){eo=i;break;}}
  if(eo<0)throw new Error('no EOCD');
  const nEnt=b.readUInt16LE(eo+10),cdOff=b.readUInt32LE(eo+16);
  const files={};let p=cdOff;
  for(let i=0;i<nEnt;i++){
    if(b.readUInt32LE(p)!==0x02014b50)break;
    const method=b.readUInt16LE(p+10),csize=b.readUInt32LE(p+20),nlen=b.readUInt16LE(p+28),elen=b.readUInt16LE(p+30),clen=b.readUInt16LE(p+32),lho=b.readUInt32LE(p+42);
    const name=b.toString('utf8',p+46,p+46+nlen);
    // local header -> data
    const lnlen=b.readUInt16LE(lho+26),lelen=b.readUInt16LE(lho+28);
    const ds=lho+30+lnlen+lelen;const raw=b.subarray(ds,ds+csize);
    files[name]=method===8?inflateRawSync(raw):Buffer.from(raw);
    p+=46+nlen+elen+clen;
  }
  return files;
}
export function parseSpdr(){
  const fp=join(SRC,'spdr.xlsx');if(!existsSync(fp))return {};
  const f=readXlsx(fp);
  const ss=f['xl/sharedStrings.xml'].toString('utf8');
  const strings=[...ss.matchAll(/<si>(.*?)<\/si>/gs)].map(m=>[...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(x=>x[1]).join('').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  const sheet=f['xl/worksheets/sheet1.xml'].toString('utf8');
  const rows=[...sheet.matchAll(/<row[^>]*>(?:(?!<\/row>).)*<\/row>/gs)].map(m=>m[0]);
  function cells(rx){const o={};for(const c of rx.matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*t="([^"]*)")?[^>]*?>(?:<v>(.*?)<\/v>)?/gs)){if(c[3]==null)continue;o[c[1]]=c[2]==='s'?strings[+c[3]]:c[3];}return o;}
  const out={};
  for(const rx of rows){const c=cells(rx);const t=(c.B||'').replace(/[®™]/g,'').trim().toUpperCase();
    if(!t||t==='TICKER'||/[^A-Z0-9.\-]/.test(t))continue;
    const gross=c.G,net=c.H;const expStr=(net&&net!=='-')?net:gross;
    const exp=expStr&&/([\d.]+)%/.test(expStr)?Math.round(parseFloat(RegExp.$1)*100)/100:null;
    const ac=(c.I&&c.I!=='-')?c.I.trim():null;
    if(exp!=null||ac){out[t]={};if(exp!=null){out[t].expRatio=exp;out[t].expRatioSrc='SSGA/SPDR';}if(ac){out[t].assetClass=ac;out[t].assetClassSrc='SSGA/SPDR';}}
  }
  return out;
}
if(process.argv[1] && process.argv[1].endsWith('_spdr_parse.mjs')){
  const m=parseSpdr();const ks=Object.keys(m);
  console.log('SPDR funds parsed:',ks.length);
  console.log('sample:',ks.slice(0,6).map(k=>k+'='+JSON.stringify(m[k])).join(' '));
  const withExp=ks.filter(k=>m[k].expRatio!=null).length,withAc=ks.filter(k=>m[k].assetClass).length;
  console.log('with expRatio',withExp,'| with assetClass',withAc);
}
