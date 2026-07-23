/* DEV-ONLY red-first gate — §18.8: de-group the Mortgage §2 variable-rate cluster. The single grouped "How a
   variable rate moves" hover on Rate Index is replaced by FIVE per-field hovers (Rate Index / Margin / Periodic
   Cap / Lifetime Cap / Next Reset), mirroring the HELOC §2c split via the shared _hlF (L48). Asserts, off the
   real _variableRateClusterHTML rendered for a VARIABLE MORTGAGE: all five fields carry a modal-tt-wrap hover
   with its sourced body, and the old grouped explainer is gone. --redfirst neuters the shared _hlF (bare label,
   no hover) AND restores the grouped-explainer marker -> the per-field checks + the "grouped gone" check bite. */
import { readFileSync } from 'node:fs';
const RED = process.argv.includes('--redfirst');
let s = readFileSync('studio.html', 'utf8');

if (RED) {
  s = s.replace(
    "        var _hlF = function (label, ttTitle, ttBody, align) {\n            var pos = align === 'right' ? 'right:0; left:auto;' : 'left:0; right:auto;';\n            return '<span class=\"input-label modal-tt-wrap\" style=\"cursor:help;\">' + label +\n                '<div class=\"modal-tt\" style=\"' + pos + '\"><strong>' + ttTitle + '</strong>' + ttBody + '</div></span>';\n        };",
    "        var _hlF = function (label) { return '<div class=\"input-label\">' + label + '</div>'; };");
  s += '\n<!-- <strong>How a variable rate moves</strong> -->';
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const getBaseType = () => ({ id: 'mortgage_primary', title: 'Mortgage' });
let vc = '';
try {
  const fn = new Function('getBaseType', extract('_variableRateClusterHTML') + '\nreturn _variableRateClusterHTML;')(getBaseType);
  vc = fn('m1', { baseId: 'mortgage_primary', rateType: 'Variable' });
} catch (ex) { vc = 'ERR:' + ex.message; }

need('cluster renders' + (vc.startsWith('ERR:') ? ' (' + vc + ')' : ''), !vc.startsWith('ERR:') && vc.length > 0);

// Each field: a modal-tt-wrap hover carrying its sourced body (mortgage voice — "loan", not "line").
need('Rate Index hover (SOFR-first, no "live figure below")',
  vc.includes('The published rate your loan follows — often SOFR, sometimes Prime or a Treasury index.') && !vc.includes('shows just below'));
need('Margin % hover ("life of the loan")',
  vc.includes('The lender’s fixed add-on') && vc.includes('a better deal for the life of the loan.'));
need('Periodic Cap % hover (verbatim from HELOC)',
  vc.includes('The most it can jump at once') && vc.includes('one reset can’t move you more than this.'));
need('Lifetime Cap % hover ("across the entire loan")',
  vc.includes('The ceiling over the whole loan') && vc.includes('across the entire loan.'));
need('Next Reset Date hover (verbatim from HELOC)',
  vc.includes('When the rate can change next') && vc.includes('Datum re-checks the math when this date arrives.'));
// All five fields are now hover-bearing (5 modal-tt-wrap spans in the mortgage cluster).
need('all five fields carry a modal-tt-wrap hover', (vc.match(/input-label modal-tt-wrap/g) || []).length === 5);
// The old grouped explainer is gone from the mortgage cluster.
need('grouped "How a variable rate moves" hover removed', !vc.includes('How a variable rate moves'));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);

if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on the pre-§18.8 grouped form.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS when the cluster reverts to the grouped hover.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
