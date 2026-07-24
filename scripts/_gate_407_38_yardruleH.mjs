/* DEV-ONLY red-first gate — #407 Yard §3.8 Rule H (combined underpayment-into-retirement).
   Executes the real _yardIntelligence against property+lien fixtures and asserts on the RENDERED beat (#380):
     both liens late      -> Rule H "both … N/M years into retirement" + "combined push is about …"
     one lien late        -> collapses to that lien's clause; tail still "across both …" (2 liens present)
     both on-track        -> Rule H SILENT (no "combined push")
     income sourced       -> H-note 25x tie-in present
   --redfirst disables the Rule H fire -> the both-late assertion fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
function ex(s, n){ const st=s.indexOf('function '+n+'('); if(st<0) throw new Error('missing '+n); let d=0,b=false; for(let j=s.indexOf('{',st);j<s.length;j++){ if(s[j]==='{'){d++;b=true;} else if(s[j]==='}'){d--; if(b&&d===0) return s.slice(st,j+1);} } }
const names=['_num','_groundsLinkedDebt','_yardLiens','_yardMortgage','_yardHeloc','_yardRealMonthly','_yardNetEquity','_yardHouseholdIncome','_yardYearsToRetire','calculateTotalPmt','payoffMonths','_retireInfo','_targetPayment','_payoffYearOf','_yardIntelligence'];
let body=names.map(n=>ex(src,n)).join('\n');
if(RED) body=body.replace('if ((_mLate || _hLate) && _liensH >= 1) {','if (false && (_mLate || _hLate) && _liensH >= 1) {');
const getBaseType=(baseId)=>{const s=String(baseId); if(s.indexOf('heloc')===0)return{id:'heloc_x',taxCode:'debt',title:'HELOC'}; if(s.indexOf('mortgage')===0)return{id:'mortgage_x',taxCode:'debt',title:'Mortgage'}; return{id:'property_x',taxCode:'realEstate',title:'Real Estate'};};
const doc={getElementById:(id)=> id==='pri-salary'?{value:'200000'}:(id==='co-arch-toggle'?{checked:false}:{value:''})};
const win={parseAgeFromDob:()=>null};
const P={id:'p',baseId:'property_a',value:500000};
const mk=(accts)=> new Function('getBaseType','document','window','state','_retireOverride','calcCarryTotal', body+'\nreturn _yardIntelligence;')(getBaseType,doc,win,{accounts:accts},{retireYear:2035,retireDate:new Date(2035,2,1),currentAge:55},()=>6000);
const late=(o)=>({baseId:'mortgage_a',linkedAssetId:'p',helocPhase:'Repayment',nextPmtDate:'2026-08-01',maturityDate:'2060-01-01',addPmt:0,...o});
const mortLate={...late({id:'m',value:200000,intRate:6,minPmt:1200})};
const mortFast={...late({id:'m',value:200000,intRate:6,minPmt:4000})};
const helocLate={...late({id:'h',baseId:'heloc_a',value:50000,intRate:8,minPmt:400})};
const helocFast={...late({id:'h',baseId:'heloc_a',value:50000,intRate:8,minPmt:1500})};
const checks=[]; const need=(l,c)=>checks.push([l,!!c]);
// isolate the Rule H beat (the no-jargon check must not trip on pre-existing Rule G's "(usually the line)")
const rH = s => ([...s.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(x=>x[1]).find(t=>t.includes('Seen as one house')) || '');
const bothLate = rH(mk([P,mortLate,helocLate])('p'));
need('both late: Rule H combined clause present', bothLate.includes('both your mortgage and your home-equity line (a HELOC) are still being paid') && bothLate.includes('the combined push is about'));
need('both late: tail "across both your mortgage and your home-equity line"', bothLate.includes('across both your mortgage and your home-equity line'));
need('both late: NO bare "the line" jargon', !bothLate.includes('the line'));
need('both late: H-note 25x tie-in (income sourced)', bothLate.includes('under a 4% draw') && bothLate.includes('safely cover it for life'));
const oneLate = rH(mk([P,mortFast,helocLate])('p'));
need('one late: collapses to "your home-equity line (a HELOC) still runs about"', oneLate.includes('your home-equity line (a HELOC) still runs about') && !oneLate.includes('are still being paid'));
need('one late: still names the combined push', oneLate.includes('the combined push is about'));
need('one late: NO bare "the line" jargon', !oneLate.includes('the line'));
const bothOK = mk([P,mortFast,helocFast])('p');
need('both on-track: Rule H SILENT (no combined push)', !bothOK.includes('the combined push is about'));
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
if(RED){ if(allGreen){console.error('❌ RED-FIRST FAILED'); process.exit(1);} console.log('✅ RED-FIRST OK'); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
