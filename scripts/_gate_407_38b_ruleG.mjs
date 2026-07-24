/* DEV-ONLY red-first gate — #407 Yard §3.5 Rule G "the line" de-jargon (Captain #415).
   Rule G fires when BOTH liens are drawn. Executes the real _yardIntelligence and asserts on the RENDERED Rule G
   beat (#380): it teaches "your home-equity line (a HELOC)" on first mention and carries no bare "the line".
   --redfirst reintroduces the old jargon in the Rule G string -> the no-bare-"the line" assertion fails. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
function ex(s, n){ const st=s.indexOf('function '+n+'('); if(st<0) throw new Error('missing '+n); let d=0,b=false; for(let j=s.indexOf('{',st);j<s.length;j++){ if(s[j]==='{'){d++;b=true;} else if(s[j]==='}'){d--; if(b&&d===0) return s.slice(st,j+1);} } }
const names=['_num','_groundsLinkedDebt','_yardLiens','_yardMortgage','_yardHeloc','_yardRealMonthly','_yardNetEquity','_yardHouseholdIncome','_yardYearsToRetire','calculateTotalPmt','payoffMonths','_retireInfo','_targetPayment','_payoffYearOf','_yardIntelligence'];
let body=names.map(n=>ex(src,n)).join('\n');
if(RED) body=body.replace('your mortgage and your home-equity line (a HELOC) move', 'the mortgage and the line move').replace('(usually the home-equity line)', '(usually the line)');
const getBaseType=(baseId)=>{const s=String(baseId); if(s.indexOf('heloc')===0)return{id:'heloc_x',taxCode:'debt',title:'HELOC'}; if(s.indexOf('mortgage')===0)return{id:'mortgage_x',taxCode:'debt',title:'Mortgage'}; return{id:'property_x',taxCode:'realEstate',title:'Real Estate'};};
const doc={getElementById:()=>({value:'',checked:false})};
const fn=new Function('getBaseType','document','window','state','_retireOverride','calcCarryTotal', body+'\nreturn _yardIntelligence;')(getBaseType,doc,{parseAgeFromDob:()=>null},{accounts:[
  {id:'p',baseId:'property_a',value:500000},
  {id:'m',baseId:'mortgage_a',linkedAssetId:'p',value:200000,intRate:6,minPmt:1500,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2050-01-01'},
  {id:'h',baseId:'heloc_a',linkedAssetId:'p',value:50000,intRate:8,helocPhase:'Repayment',minPmt:600,addPmt:0,nextPmtDate:'2026-08-01',maturityDate:'2050-01-01'}]},null,()=>6000);
const out=fn('p');
const ruleG=[...out.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(x=>x[1]).find(t=>t.includes('Two liens ride on this house')) || '';
const checks=[]; const need=(l,c)=>checks.push([l,!!c]);
need('Rule G beat renders (both liens drawn)', ruleG.includes('Two liens ride on this house'));
need('Rule G teaches "your mortgage and your home-equity line (a HELOC)"', ruleG.includes('your mortgage and your home-equity line (a HELOC) move'));
need('Rule G "(usually the home-equity line)"', ruleG.includes('(usually the home-equity line)'));
need('Rule G: NO bare "the line" jargon', !ruleG.includes('the line'));
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
if(RED){ if(allGreen){console.error('❌ RED-FIRST FAILED'); process.exit(1);} console.log('✅ RED-FIRST OK'); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
