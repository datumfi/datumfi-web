/* DEV-ONLY red-first gate — §18.5: the 🔗 link status line reads as an INFORMATIONAL status (subtle pill,
   readable 12px body, muted mono label, semantic-colored clickable chips), not the old 10px mono danger warning.
   Asserts (functional, off the real _linkedJumpLine): the rendered status has the pill chrome + 12px body +
   muted label, and still carries the clickable chip + ✕. --redfirst reverts to the old bare 10px/danger form
   -> the pill/size assertions bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(
    "        return '<div style=\"margin-bottom:16px; padding:8px 11px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; font-size:12px; line-height:1.5;\">'\n             + '<span style=\"color:rgba(255,255,255,0.55); font-family:var(--font-mono); font-size:10px; letter-spacing:0.05em;\">' + label + '</span> '\n             + '<span style=\"color:' + (color || 'var(--danger)') + ';\">' + chips + '</span></div>';",
    "        return '<div style=\"margin-bottom: 20px; font-family: var(--font-mono); font-size: 10px; color: ' + (color || 'var(--danger)') + ';\">' + label + ' ' + chips + '</div>';");
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_returnNavLabel', '_linkedJumpLine'];
const getBaseType = (baseId) => {
  const id = String(baseId);
  if (id.indexOf('property') === 0) return { id, title: 'Real Estate' };
  if (id.indexOf('mortgage') === 0) return { id, title: 'Mortgage' };
  if (id.indexOf('heloc') === 0) return { id, title: 'HELOC' };
  return { id, title: 'Other' };
};
function build() {
  const body = NAMES.map(extract).join('\n') + '\nreturn { jump:_linkedJumpLine };';
  return new Function('state', 'getBaseType', body)({ accounts: [] }, getBaseType);
}
let err = '', jump = null;
try { jump = build().jump; } catch (ex) { err = ex.message; }
need('engine builds' + (err ? ' (' + err + ')' : ''), !!jump);

if (jump) {
  const out = jump('🔗 Linked Debts:', [{ id: 'm1', baseId: 'mortgage_primary' }], 'var(--danger)', { selfId: 'prop1', selfIsDebt: false });
  need('(PILL) informational pill chrome (subtle background + border + radius)',
    out.includes('background:rgba(255,255,255,0.03)') && out.includes('border-radius:4px'));
  need('(SIZE) readable 12px body, not the old 10px warning', out.includes('font-size:12px') && !/font-size: 10px; color:/.test(out));
  need('(LABEL) label rendered in a muted mono span', out.includes('color:rgba(255,255,255,0.55)') && out.includes('🔗 Linked Debts:'));
  need('(INTACT) chip still clickable + ✕ still present', out.includes("openAccountModal('m1')") && out.includes('Mortgage') && out.includes('>✕</span>'));
  need('(SEMANTIC) chips keep their semantic color', out.includes('color:var(--danger);'));
}

// served bytes: the new style is what ships
need('(BYTES) status pill lives in _linkedJumpLine', /_linkedJumpLine[\s\S]*?background:rgba\(255,255,255,0\.03\)[\s\S]*?font-size:12px/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the old 10px/danger form.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-§18.5 bare notice.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
