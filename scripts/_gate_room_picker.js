/* STEP A (+#224 revision) — NESTED PER-WING PICKER gate (Room Taxonomy #221/#223/#224). Drives the real
   renderInputs() path and asserts the data-driven per-wing tree + the 6 smoke-polish items against the SERVED
   bytes:
     · SOLO (#1): joint-titled rooms FOLD into the flat L1 tree — NO wing banner; nothing dropped, no dupes.
     · Co: three wing banners (Primary → Co-Arch → Joint).
     · #2/#5: every wing AND every L1 COLLAPSED on entry; a click expands exactly one.
     · #3: L1 + L2 labels are the same gold family as the wing header.
     · #4: first-account button is two-state on account count (verbatim, em-dash).
     · #6: picker fonts bumped vs the old 9/10/8px baseline.
   Plus the STEP A invariants: LIVE 401k nicknames un-swapped (Treasury=roth401k / Vault=pretax401k); the 3
   fold-outs under Joint ▸ INVESTMENTS ▸ More Taxable/Other still route to the Living Room engine; Joint drops
   non-jointable rooms; renames crypto→Cold Storage / trust→The Reliquary live; NET-NEW greyed "Coming soon".
   RED-FIRST: the pre-#223 flat builder has no wings/fold/collapse/gold/fonts/two-state button.
   Usage: serve repo root on :8001, then node scripts/_gate_room_picker.js [LABEL]. Writes a UTF-8 dump. */
const { chromium } = require('playwright');
const fs = require('fs');
const LABEL = process.argv[2] || 'RUN';
const URL = 'http://127.0.0.1:8001/studio.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForSelector('#studio-layout', { timeout: 8000 });
  await p.waitForTimeout(400);

  const R = await p.evaluate(() => {
    const dd = () => (document.getElementById('space-dropdown') || {}).innerHTML || '';
    const setName = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const setCo = (on) => { const el = document.getElementById('co-arch-toggle'); if (el) el.checked = on; };
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : null; };
    const out = {};

    // Co mode, named wings
    setName('primary-name', 'DANIEL'); setName('co-name', 'ANA'); setCo(true);
    try { renderInputs(); } catch (e) { out.err = String(e && e.message); }
    out.htmlCo = dd();

    // #3 colours + #6 font sizes (measure in Co render; open the dropdown so styles resolve)
    const ddEl = document.getElementById('space-dropdown'); if (ddEl) ddEl.classList.add('open');
    out.style = {
      wingColor: cs('.picker-expander.wing', 'color'),
      l1Color:   cs('.picker-expander.l1', 'color'),
      l2Color:   cs('.picker-subgroup .l2-lbl', 'color'),
      optColor:  cs('.space-option', 'color'),
      gllFont:   parseFloat(cs('.dropdown-group-lbl', 'fontSize')) || 0,
      optFont:   parseFloat(cs('.space-option', 'fontSize')) || 0,
      caretFont: parseFloat(cs('.picker-caret', 'fontSize')) || 0,
    };

    // #5 collapsed-on-entry + click-expands-one (Co wings)
    const wings = Array.from(document.querySelectorAll('.picker-expander.wing'));
    out.wingCount = wings.length;
    out.allWingsCollapsedInit = wings.length > 0 && wings.every(w => w.nextElementSibling && w.nextElementSibling.style.display === 'none');
    const l1sInit = Array.from(document.querySelectorAll('.picker-expander.l1'));
    out.allL1CollapsedInit = l1sInit.length > 0 && l1sInit.every(w => w.nextElementSibling && w.nextElementSibling.style.display === 'none');
    if (wings[0]) { try { wings[0].click(); } catch (e) {} }
    out.firstWingOpensOnClick = !!(wings[0] && wings[0].nextElementSibling.style.display === 'block');
    out.otherWingsStayClosed = wings.slice(1).every(w => w.nextElementSibling.style.display === 'none');

    // SOLO fold (#1): no wing banner, joint folded into the flat L1 tree
    setName('primary-name', 'DANIEL'); setCo(false);
    try { renderInputs(); } catch (e) {}
    out.htmlSolo = dd();

    // default placeholder names → non-possessive labels
    setName('primary-name', 'Primary Architect'); setName('co-name', 'Co-Architect'); setCo(true);
    try { renderInputs(); } catch (e) {}
    out.htmlDefault = dd();

    // #4 first-account button label (do last — mutates state.accounts)
    setCo(false); try { renderInputs(); } catch (e) {}
    out.btnFirst = ((document.getElementById('add-space-btn') || {}).textContent || '').trim();
    try { addInstance('checking_primary'); } catch (e) {}
    out.btnMore = ((document.getElementById('add-space-btn') || {}).textContent || '').trim();

    // routing preservation
    out.isTaxCorp = (typeof _isTaxableRoom === 'function') ? _isTaxableRoom('taxable_corp') : null;
    out.isTaxBase = (typeof _isTaxableRoom === 'function') ? _isTaxableRoom('taxable') : null;
    return out;
  });
  await b.close();

  const H = R.htmlCo || '', Hs = R.htmlSolo || '', Hd = R.htmlDefault || '', st = R.style || {};
  const has = (s, m) => typeof s === 'string' && s.indexOf(m) >= 0;
  const before = (s, a, c) => { const i = s.indexOf(a), j = s.indexOf(c); return i >= 0 && j >= 0 && i < j; };
  const slice = (s, a, c) => { const i = s.indexOf(a); if (i < 0) return ''; const j = c ? s.indexOf(c, i + a.length) : -1; return s.slice(i, j < 0 ? s.length : j); };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hdr = (label) => '>' + label + ' <span';
  const wingCollapsed = (h, label) => new RegExp('picker-expander wing"[^>]*>' + esc(label) + ' <span').test(h);
  const l1Present = (h, l1) => new RegExp('picker-expander l1"[^>]*>' + esc(l1) + ' <span').test(h);
  const priSlice = slice(H, "DANIEL'S SPACES", "ANA'S SPACES");
  const coSlice  = slice(H, "ANA'S SPACES", "JOINT SPACES");
  const jointSlice = slice(H, "JOINT SPACES", null);
  const incomeReg = slice(priSlice, hdr('INCOME'), hdr('INVESTMENTS'));
  const L1S = ['ASSETS', 'INCOME', 'INVESTMENTS', 'LIABILITIES', 'PROTECTION &amp; ESTATE', 'WORKPLACE PLANS'];

  // static source guards
  const src = fs.readFileSync('studio.html', 'utf8');
  const srcTaxonomy = /const ROOM_TAXONOMY\s*=\s*\[/.test(src);
  const srcNoOldFlat = !/>More taxable \/ other </.test(src) && !has(src, 'Generational Transfer') && !/dropdown-group-lbl">Additional Spaces/.test(src);

  const checks = [
    // ── Co wings ──
    ['Co: Primary/Co/Joint wings present + order', before(H, "DANIEL'S SPACES", "ANA'S SPACES") && before(H, "ANA'S SPACES", 'JOINT SPACES')],
    ['Co: dynamic possessive labels (DANIEL\'S / ANA\'S)', has(H, "DANIEL'S SPACES") && has(H, "ANA'S SPACES")],
    ['default profile → non-possessive PRIMARY/CO-ARCHITECT SPACES', has(Hd, 'PRIMARY ARCHITECT SPACES') && has(Hd, 'CO-ARCHITECT SPACES') && !has(Hd, "PRIMARY ARCHITECT'S SPACES")],
    // ── #5 collapsed on entry + click-expands-one ──
    ['#5 all 3 wings COLLAPSED on entry', wingCollapsed(H, "DANIEL'S SPACES") && wingCollapsed(H, "ANA'S SPACES") && wingCollapsed(H, 'JOINT SPACES') && !/picker-expander wing open/.test(H)],
    ['#5 runtime: every wing subgroup display:none on entry', R.wingCount === 3 && R.allWingsCollapsedInit === true],
    ['#2 every L1 COLLAPSED on entry (no l1 open)', !/picker-expander l1 open/.test(H) && R.allL1CollapsedInit === true],
    ['#2/#5 click expands exactly one wing', R.firstWingOpensOnClick === true && R.otherWingsStayClosed === true],
    // ── #1 SOLO fold ──
    ['#1 solo has NO wing banner at all', !has(Hs, 'picker-expander wing')],
    ['#1 solo has NO Joint/Additional/Co-Arch/possessive header', !has(Hs, 'JOINT SPACES') && !has(Hs, 'Additional') && !has(Hs, 'CO-ARCH') && !has(Hs, "DANIEL'S SPACES")],
    ['#1 solo shows all 6 L1 headers (collapsed)', L1S.every(l => l1Present(Hs, l)) && !/picker-expander l1 open/.test(Hs)],
    ['#1 solo FOLDS joint rooms (taxable via primary post-A.5; 529/trust via joint)', has(Hs, "addInstance('taxable_primary')") && has(Hs, "addInstance('529plan')") && has(Hs, "addInstance('trust')")],
    ['#1 solo keeps primary rooms (rothira/roth401k)', has(Hs, "addInstance('rothira')") && has(Hs, "addInstance('roth401k')")],
    ['#1 solo prefer-primary, NO duplicate (checking_primary, not joint checking)', has(Hs, "addInstance('checking_primary')") && !has(Hs, "addInstance('checking')")],
    ['#1 solo still greys NET-NEW (The Sidedoor)', has(Hs, 'The Sidedoor <span>Coming soon</span>')],
    // ── #3 gold family ──
    ['#3 L1 + L2 labels are the wing gold family', st.wingColor && st.l1Color === st.wingColor && st.l2Color === st.wingColor],
    ['#3 leaf option colour differs from label gold', st.optColor && st.optColor !== st.wingColor],
    // ── #6 bigger fonts vs 9/10/8 baseline ──
    ['#6 group-lbl font bumped (>=12px)', st.gllFont >= 12],
    ['#6 space-option font bumped (>=12px)', st.optFont >= 12],
    ['#6 caret font bumped (>=10px)', st.caretFont >= 10],
    // ── #4 first-account button two-state (verbatim) ──
    ['#4 count=0 → "Draft Your First Space" (verbatim)', R.btnFirst === '+ Draft Your First Space — Add Account'],
    ['#4 count>=1 → "Draft Additional Space" (verbatim)', R.btnMore === '+ Draft Additional Space — Add Account'],
    // ── STEP A invariants (Co render) ──
    ['401k Roth → The Treasury (swap did NOT leak)', has(priSlice, "addInstance('roth401k')\">Roth 401(k) <span>The Treasury</span>")],
    ['401k Pre-Tax → The Vault (swap did NOT leak)', has(priSlice, "addInstance('pretax401k')\">Pre-Tax 401(k) <span>The Vault</span>")],
    ['Roth + Trad IRA separate sibling leaves', has(priSlice, "addInstance('rothira')") && has(priSlice, "addInstance('tradira')")],
    ['fold-outs under Joint ▸ More Taxable / Other', has(jointSlice, 'l2-lbl">More Taxable / Other') && has(jointSlice, "addInstance('taxable_corp')") && has(jointSlice, "addInstance('taxable_other')") && has(jointSlice, "addInstance('other_assets')")],
    ['fold-outs route to Taxable engine (_isTaxableRoom)', R.isTaxCorp === true && R.isTaxBase === true],
    ['INCOME region has pension leaf and NO l2-lbl', has(incomeReg, "addInstance('pension')") && !has(incomeReg, 'l2-lbl')],
    ['NET-NEW greyed in Co-Primary only (not Co/Joint wings)', has(priSlice, 'coming-soon') && !has(coSlice, 'coming-soon') && !has(jointSlice, 'coming-soon')],
    ['Joint EXCLUDES personal_loan_joint + IRAs', !has(jointSlice, "addInstance('personal_loan_joint')") && !has(jointSlice, 'Individual Retirement Accounts')],
    ['Joint HAS jointable rooms (checking/taxable/529)', has(jointSlice, "addInstance('checking')") && has(jointSlice, "addInstance('taxable')") && has(jointSlice, "addInstance('529plan')")],
    ['rename: trust → The Reliquary under Joint ▸ Trusts', has(jointSlice, 'l2-lbl">Trusts') && has(jointSlice, "addInstance('trust')\">Irrevocable Trust <span>The Reliquary</span>")],
    ['rename: crypto → Cold Storage (Joint + solo)', has(jointSlice, "addInstance('crypto')\">Crypto <span>Cold Storage</span>") && has(Hs, "addInstance('crypto_primary')\">Crypto <span>Cold Storage</span>")],
    // ── #7 LIVE rooms float to top of each L2 (nest-preserving; re-smoke INVESTMENTS + WORKPLACE) ──
    ['#7 INVESTMENTS ▸ Brokerage&Crypto: Living Room (LIVE) above Cold Storage (ENRICH)', before(Hs, 'The Living Room', 'Cold Storage')],
    ['#7 INVESTMENTS ▸ IRA: Conservatory + Library (LIVE) above The Sidedoor (NET-NEW)', before(Hs, 'The Conservatory', 'The Sidedoor') && before(Hs, 'The Library', 'The Sidedoor')],
    ['#7 INVESTMENTS ▸ Education: Infirmary (LIVE) above The Slate (NET-NEW)', before(Hs, 'The Infirmary', 'The Slate')],
    ['#7 WORKPLACE ▸ 401(k): Treasury + Vault (LIVE) above The Charter (NET-NEW)', before(Hs, 'The Treasury', 'The Charter') && before(Hs, 'The Vault', 'The Charter')],
    ['#7 no L2 sub-nests split (Savings Bonds L2 intact after Education)', before(Hs, 'l2-lbl">Education &amp; Health', 'l2-lbl">Savings Bonds')],
    ['#7 ASSETS ▸ Operating Cash: Safe (clickable) above The Mattress (Coming soon)', before(Hs, 'The Safe', 'The Mattress')],
    ['#7 INCOME: The Foundation (clickable) above The Keel (Coming soon)', before(Hs, 'The Foundation', 'The Keel')],
    // ── hygiene ──
    ['ROOM_TAXONOMY constant present', srcTaxonomy],
    ['old flat blocks removed (More taxable/Generational/Additional)', srcNoOldFlat],
    ['renderInputs did not throw', !R.err],
  ];

  let pass = 0;
  const lines = checks.map(([n, ok]) => { if (ok) pass++; return (ok ? 'PASS ' : 'FAIL ') + n; });
  const strip = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1400) : String(s));
  const summary = `[${LABEL}] ${pass}/${checks.length} GREEN\n` + lines.join('\n') +
    '\n\nstyle=' + JSON.stringify(st) + '  btnFirst=' + JSON.stringify(R.btnFirst) + '  btnMore=' + JSON.stringify(R.btnMore) +
    '\n\n=== SOLO (folded, no wing banner) ===\n' + strip(Hs) +
    '\n\n=== CO · JOINT WING ===\n' + strip(jointSlice) + '\n';
  fs.writeFileSync('scripts/_gate_room_picker.out.txt', summary, 'utf8');
  process.exit(pass === checks.length ? 0 : 1);
})();
