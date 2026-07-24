/* DEV-ONLY red-first gate — #407 Yard §3.5 Rule D "the line" de-jargon (Captain #417 — missed by G/H pass).
   Rule D fires when a HELOC is drawn or available. Executes the real _yardIntelligence and asserts on the RENDERED
   Rule D beat (#380): teaches "a home-equity line (a HELOC)" on first mention, no bare "A line"/"the same line"/
   "undrawn line". --redfirst reverts the de-jargon -> the old bare-"line" phrases return -> assertions fail. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
const src = readFileSync('studio.html', 'utf8');
function ex(s,n){const st=s.indexOf('function '+n+'(');if(st<0)throw new Error('missing '+n);let d=0,b=false;for(let j=s.indexOf('{',st);j<s.length;j++){if(s[j]==='{'){d++;b=true;}else if(s[j]==='}'){d--;if(b&&d===0)return s.slice(st,j+1);}}}
const names=['_num','_groundsLinkedDebt','_yardLiens','_yardMortgage','_yardHeloc','_yardRealMonthly','_yardNetEquity','_yardHouseholdIncome','_yardYearsToRetire','calculateTotalPmt','payoffMonths','_retireInfo','_targetPayment','_payoffYearOf','_yardIntelligence'];
let body=names.map(n=>ex(src,n)).join('\n');
if(RED) body=body.replace('A home-equity line (a HELOC) against','A line against').replace('The same home-equity line','The same line').replace('an undrawn home-equity line','an undrawn line');
const getBaseType=(baseId)=>{const s=String(baseId);if(s.indexOf('heloc')===0)return{id:'heloc_x',taxCode:'debt',title:'HELOC'};if(s.indexOf('mortgage')===0)return{id:'mortgage_x',taxCode:'debt',title:'Mortgage'};return{id:'property_x',taxCode:'realEstate',title:'Real Estate'};};
const fn=new Function('getBaseType','document','window','state','_retireOverride','calcCarryTotal',body+'\nreturn _yardIntelligence;')(getBaseType,{getElementById:()=>({value:'',checked:false})},{parseAgeFromDob:()=>null},{accounts:[{id:'p',baseId:'property_a',value:500000},{id:'h',baseId:'heloc_a',linkedAssetId:'p',value:20000,intRate:7,helocCreditLimit:50000,helocPhase:'Draw',minPmt:120}]},null,()=>6000);
const out=fn('p');
const ruleD=[...out.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(x=>x[1]).find(t=>t.includes('two very different edges'))||'';
const checks=[]; const need=(l,c)=>checks.push([l,!!c]);
need('Rule D beat renders', ruleD.includes('two very different edges'));
need('teaches "A home-equity line (a HELOC) against"', ruleD.includes('A home-equity line (a HELOC) against'));
need('"The same home-equity line"', ruleD.includes('The same home-equity line'));
need('"an undrawn home-equity line"', ruleD.includes('an undrawn home-equity line'));
need('NO bare "A line against"', !ruleD.includes('A line against'));
need('NO bare "The same line"', !ruleD.includes('The same line'));
need('NO bare "undrawn line"', !ruleD.includes('undrawn line') || ruleD.includes('undrawn home-equity line') && !/undrawn line\b/.test(ruleD));
let pass=0; for(const[l,ok]of checks){console.log((ok?'✅':'⛔')+' '+l); if(ok)pass++;}
const allGreen=pass===checks.length; console.log('\n'+pass+'/'+checks.length+' green'+(RED?'  [--redfirst]':''));
if(RED){ if(allGreen){console.error('❌ RED-FIRST FAILED'); process.exit(1);} console.log('✅ RED-FIRST OK'); process.exit(0);}
if(!allGreen){console.error('❌ GATE FAILED'); process.exit(1);} console.log('✅ GATE GREEN');
