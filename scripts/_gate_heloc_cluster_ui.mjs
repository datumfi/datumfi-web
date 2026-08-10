/* DEV-ONLY red-first UI gate (#390) — HELOC variable-rate cluster polish. Renders the real HELOC branch of
   _variableRateClusterHTML and asserts:
     - Rate Index is a canonical DROPDOWN (Select… / Prime / SOFR), not a free-text input;
     - each field carries its OWN distinct hover (the single shared "How your variable rate moves" is gone);
     - the number fields clamp to a realistic range (min/max + enforceNumRange);
     - the §20 live-Prime sub-line renders BETWEEN the Rate Index row and the Periodic Cap row (moved up);
     - enforceNumRange helper exists; the old post-cluster sub-line placement is removed.
   --redfirst reverts the distinct hovers + strips the clamps -> assertions fail (proves bite). */
import { readFileSync } from 'node:fs';
import { studioSource } from './_studio_source.cjs';
const RED = process.argv.includes('--redfirst');
let s = studioSource();

if (RED) {
  for (const t of ['The benchmark you track','The lender’s fixed add-on','The most it can jump at once','The ceiling over the whole loan','When the rate can change next'])
    s = s.split(t).join('How your variable rate moves');
  s = s.split('min="0" max="100" step="0.01" ').join('');
}

const checks = [];
const need = (label, cond) => checks.push([label, !!cond]);

const extract = (name) => { const m = s.match(new RegExp('    function ' + name + '\\([\\s\\S]*?\\n    }\\n')); return m ? m[0] : ''; };
const NAMES = ['_livePrime','_liveRates','_liveIndex','_fmtAsOf','_helocLiveRateHTML','_variableRateClusterHTML'];
let api = null, err = '';
try {
  const body = "var _livePrimeCache = { prime: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME', rates: { Prime: { value: 6.75, asOf: '2026-07-16', source: 'FRED:DPRIME' } } };\n" +
    NAMES.map(extract).join('\n') + '\nreturn { cluster:_variableRateClusterHTML };';
  api = new Function('state', 'getBaseType', body)({ accounts: [] }, () => ({ id: 'heloc_primary', title: 'HELOC' }));
} catch (e) { err = e.message; }
need('cluster renderer extracts + evaluates' + (err ? ' (' + err + ')' : ''), !!api);

if (api) {
  const acc = { baseId: 'heloc_primary', rateType: 'Variable', rateIndex: 'Prime', rateMargin: 2,
    capPeriodic: 10, capLifetime: 15, rateResetDate: '2028-01-01' };
  const h = api.cluster('ID1', acc);

  need('Rate Index is a <select> with Prime + SOFR options',
    /<select[^>]*rateIndex/.test(h) && h.includes('>Prime</option>') && h.includes('>SOFR</option>') && h.includes('Select…'));
  need('current index (Prime) is the selected option', /<option value="Prime" selected>/.test(h));
  need('NO free-text Rate Index input in the HELOC branch', !/type="text"[^>]*rateIndex/.test(h));

  const titles = ['The benchmark you track','The lender’s fixed add-on','The most it can jump at once','The ceiling over the whole loan','When the rate can change next'];
  need('all 5 fields carry DISTINCT hovers', titles.every((t) => h.includes(t)));
  need('the single shared "How your variable rate moves" hover is GONE', !h.includes('How your variable rate moves'));

  need('number fields clamp to a realistic range (min/max + enforceNumRange)',
    (h.match(/min="0" max="100" step="0\.01"/g) || []).length === 3 && (h.match(/enforceNumRange\(this, 0, 100\)/g) || []).length === 3);

  const iSub = h.indexOf('modal-heloc-liverate'), iIdx = h.indexOf('Rate Index'), iPer = h.indexOf('Periodic Cap');
  need('§20 sub-line sits BETWEEN the Rate Index row and Periodic Cap row', iIdx > -1 && iSub > iIdx && iPer > iSub);
  need('sub-line shows the live Prime figure', /Today: Prime ~6\.75% \(as of Jul 16, 2026, source FRED\)/.test(h));

  // A SOFR-indexed line: dropdown selects SOFR; live color stays dark (SOFR not fed yet) — sourced-or-blank.
  const hSofr = api.cluster('ID1', { ...acc, rateIndex: 'SOFR' });
  need('SOFR line: SOFR selected + live sub-line BLANK (not yet fed)', /<option value="SOFR" selected>/.test(hSofr) && !/Today: Prime ~/.test(hSofr));
}

need('enforceNumRange helper is defined', s.includes('window.enforceNumRange = function'));
need('old post-cluster sub-line placement removed (lives only in the cluster now)',
  !/\$\{base\.title === 'HELOC' \? `<div id="modal-heloc-liverate/.test(s));

let pass = 0;
for (const [label, ok] of checks) { console.log((ok ? '✅' : '⛔') + ' ' + label); if (ok) pass++; }
const allGreen = pass === checks.length;
console.log(`\n${pass}/${checks.length} checks green${RED ? '  [--redfirst: expect NOT all-green]' : ''}`);
if (RED) {
  if (allGreen) { console.error('\n❌ RED-FIRST FAILED — gate stayed green on reverted code.'); process.exit(1); }
  console.log('\n✅ RED-FIRST OK — gate correctly FAILS on the pre-#390 cluster.');
  process.exit(0);
}
if (!allGreen) { console.error('\n❌ GATE FAILED'); process.exit(1); }
console.log('\n✅ GATE GREEN');
