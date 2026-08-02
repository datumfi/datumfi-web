/* studio-blueprint.js — Datum FI Studio Blueprint contract v1.0
 *
 * Responsibilities:
 *   1. Define the serializable Blueprint object (single source of truth across
 *      the 5 Studio pages: Draft, Remodel, Tension, Uncertainty, Measurement).
 *   2. Three-tier persistence: localStorage draft + localStorage archive +
 *      Clerk unsafeMetadata slim mirror (Object.assign-merged with dossier/sketchbook).
 *   3. Prefill ladder: URL hydrate params -> session draft -> sketch contract ->
 *      Dossier defaults -> hard defaults.
 *   4. Client-side weighted-average Gross Funding ESTIMATE (engine remains
 *      authoritative on the MC path).
 *   5. toEnginePayload(): extends window._buildStudioRequest() without rewriting it.
 *
 * Invariants (do not violate):
 *   - Slim Clerk payload < 5KB; total unsafeMetadata < 8192B (shared cap with
 *     dossier + sketchbook). Always Object.assign-merge — never clobber siblings.
 *   - Numbers only; no SVG path strings or other regenerable artifacts.
 *   - Engine adapter only extends buildStudioRequest's output; never rewrites it.
 */
(function (global) {
  'use strict';

  var SCHEMA  = 'DatumFIBlueprintV1';
  var VERSION = '1.0.1';

  var SESSION_DRAFT_KEY = 'datumfi_blueprint_draft_v1';

  /* AUTOSAVE COMMIT 2 — the working draft now lives in localStorage so it survives TAB CLOSE.
   * sessionStorage died with the tab, which was the remaining half of the data-loss injury
   * (Commit 1 closed the same-tab, in-app-navigation half).
   *
   * THE KEY NAME IS DELIBERATELY UNCHANGED. DatumPurge.signOutWipe() and studio.html's
   * _scratchReset() already sweep this literal key from BOTH stores, so sign-out and
   * start-from-scratch keep working with NO second clearing path bolted on (L48).
   *
   * DURABILITY, HONESTLY: localStorage is not a guarantee. Safari/iOS evicts unused origin
   * storage after roughly 7 days, so on those browsers a draft can disappear before the
   * 14-day window below is ever reached. The window is a CEILING on how long we will silently
   * trust a draft — never a promise to the user that it will still be waiting. */
  var DRAFT_STALE_MS = 14 * 24 * 60 * 60 * 1000;   // Captain-ruled 14 days
  var ARCHIVE_KEY       = 'datumfi_blueprint_archive_v1';
  var PER_SLOT_PREFIX   = 'datum_blueprint_state_';
  var DOSSIER_KEY       = 'datumfi.accountDossier.v15';
  var SKETCHBOOK_KEY    = 'datumfi_sketchbook_v1';

  /* Tax multipliers for the V1 Gross Funding ESTIMATE. UI must label the
   * output ESTIMATE — the MC engine (api.datumfi.com) is authoritative on
   * the real tax-ordered draw. */
  var TAX_MULTIPLIERS = {
    roth:        1.00,
    taxable:     1.075,
    traditional: 1.18,
    pension:     1.10,
    ss:          1.06
  };

  /* Studio room baseId -> Gross Funding tax bucket. Mirrors the engine's
   * ACCOUNT_TYPE_MAP in studio.html so any baseId routes consistently. */
  var BASE_TO_BUCKET = {
    pretax401k: 'traditional', pretax401k_co: 'traditional',
    pretax457b: 'traditional', pretax457b_co: 'traditional',
    trad403:    'traditional', trad403_co:    'traditional',
    tradira:    'traditional', tradira_co:    'traditional',
    roth401k:   'roth',        roth401k_co:   'roth',
    roth457b:   'roth',        roth457b_co:   'roth',
    roth403:    'roth',        roth403_co:    'roth',
    rothira:    'roth',        rothira_co:    'roth',
    // hsa deliberately ABSENT — the medical set-aside keeps The Infirmary in estate/net-worth
    // but OUT of the Shape's investable spend-mass (same mechanism as trust/529, Copy Bank §0.6).
    taxable:    'taxable',     taxable_primary: 'taxable', taxable_co: 'taxable',  // A.5: mirror parent (corp/other stay parked-absent)
    savings:    'taxable',     savings_primary: 'taxable', savings_co: 'taxable',
    crypto:     'taxable',     crypto_primary:  'taxable', crypto_co:  'taxable'
  };

  /* SS annual benefit dollars per engine spec v1.8 §1 — used only for the
   * client-side Gross Funding ESTIMATE supply pool. Real SS is computed
   * server-side. */
  var SS_BY_STRATEGY = { early_62: 18084, full_67: 26100, optimal_70: 32592 };

  function newBlueprint() {
    return {
      schema:        SCHEMA,
      blueprint_id:  null,
      saved_at:      null,
      version:       VERSION,
      profile: {
        primary_name:                 '',
        co_architect_name:            '',
        primary_dob:                  '',
        co_architect_dob:             '',
        target_retirement_date:       '',
        co_architect_retirement_date: '',
        plan_end_age:                 93,
        plan_end_date:                '',
        co_architect_enabled:         false
      },
      accounts: [],
      contributions_total: 0,
      portfolio_total:     0,
      ss: {
        strategy_primary:       'full_67',
        strategy_secondary:     'optimal_70',
        pri_overrides_monthly:  { v62: 0, v67: 0, v70: 0 },
        sec_overrides_monthly:  { v62: 0, v67: 0, v70: 0 }
      },
      income: {
        pension_primary_annual:   0,
        pension_secondary_annual: 0
      },
      climate: { outlook: 'valuations_matter', custom_weights: null },
      // Sketch global assumptions carried so Studio recomputes boundaries identically.
      // Distinct from climate.outlook (the Studio climate lens) — these mirror the Sketch
      // market/inflation radios. Defaults match Sketch's defaults (average / real).
      market_paradigm: 'average',
      inflation_mode:  'real',
      tax:     { filing: 'Married Filing Jointly', location: 'FL',
                 working_year_effective_rate: 0.20 },
      upkeep:  { items: [], charity: [], upkeep_total: 0, charity_total: 0 },
      datum: {
        net_datum_v1:            100000,
        gross_funding_need:      0,
        gross_funding_breakdown: { roth: 0, taxable: 0, traditional: 0, pension: 0, ss: 0 },
        derived_from:            'quick'
      },
      // Phase 1 — Sketch S2 carry-through. designed = the WANT shape the user
      // tested in Sketch S2 (read-only data, no drag UI per North Star §13-T2);
      // current = the HAVE shape from Sketch S1. Dollars. Both kept as parallel
      // numeric endpoints so a future render primitive (§16.2-iii) can diff them.
      designed: {
        ceil: 0, datum: 0, floor: 0, state: '', color: '',
        levers: { ceilDelta: 0, floorDelta: 0, datumDelta: 0, portDelta: 0 },
        present: false
      },
      current: { ceil: 0, datum: 0, floor: 0, state: '' },
      lenses:   { shock: false, thermal: false, routing: false, datum: false },
      mc_meta:  { shock_param: false, scenario_label: 'Draft', last_result_hash: '' },
      readout:  null
    };
  }

  /* Slim Clerk payload — drops anything regenerable (chart artifacts, readout,
   * upkeep line items per §2 decision, holdings, names derivable from baseId,
   * UI-only flags). Target: < 5KB even with 20 accounts. */
  function slimSlotForClerk(bp) {
    if (!bp) return null;
    return {
      schema:        bp.schema,
      blueprint_id:  bp.blueprint_id,
      saved_at:      bp.saved_at,
      version:       bp.version,
      profile:       bp.profile,
      accounts: (bp.accounts || []).map(function (a) {
        var out = {
          id:      a.id,
          baseId:  a.baseId,
          value:   a.value || 0,
          inflow:  a.inflow || 0,
          freq:    a.freq || 12
        };
        if (a.intRate)       out.intRate       = a.intRate;
        if (a.cola)          out.cola          = a.cola;
        if (a.linkedAssetId) out.linkedAssetId = a.linkedAssetId;
        if (a.exclude)       out.exclude       = true;
        if (a.useRule55)     out.useRule55     = true;
        if (a.isFriction)    out.isFriction    = true;
        if (a.isPriority)    out.isPriority    = true;
        // Grounds carrying-cost fields (#244 OPEN-1) — a signed-in user must NOT lose these on restore.
        if (a.propTaxYr)     out.propTaxYr     = a.propTaxYr;
        if (a.homeInsYr)     out.homeInsYr     = a.homeInsYr;
        if (a.maintYr)       out.maintYr       = a.maintYr;
        if (a.hoaYr)         out.hoaYr          = a.hoaYr;
        if (a.utilYr)        out.utilYr         = a.utilYr;
        if (a.propAddress)   out.propAddress   = a.propAddress;   // Grounds valuation address (#249) — round-trips too
        if (a.useValueApi)   out.useValueApi   = true;
        // Grounds property-detail fields (#258/#259) — manual/context; a signed-in user must NOT lose these on restore.
        if (a.propName)      out.propName      = a.propName;
        if (a.propPurpose)   out.propPurpose   = a.propPurpose;
        if (a.propType)      out.propType      = a.propType;
        if (a.propStreet)    out.propStreet    = a.propStreet;
        if (a.propCity)      out.propCity      = a.propCity;
        if (a.propState)     out.propState     = a.propState;
        if (a.propZip)       out.propZip       = a.propZip;
        if (a.propBeds)      out.propBeds      = a.propBeds;
        if (a.propBaths)     out.propBaths     = a.propBaths;
        if (a.propSqft)      out.propSqft      = a.propSqft;
        if (a.propYear)      out.propYear      = a.propYear;
        if (a.trustType    && a.trustType    !== 'Irrevocable')   out.trustType    = a.trustType;
        if (a.disbursement && a.disbursement !== 'Discretionary') out.disbursement = a.disbursement;
        // STEP A (c) 2026-07-08 — persist holdings as COMPACT-ESSENTIALS (the 13 real-position fields
        // only). The 8 provenance/source fields + priceSource are intentionally dropped: they are
        // reference-attribution, re-derivable on reopen (blank-until-re-sourced, L47) — never fabricated.
        // E[r]/Vol ride at the ACCOUNT level (§7 ruling), not per-holding.
        if (a.holdings && a.holdings.length) {
          out.holdings = a.holdings.map(function (h) {
            return { ticker: h.ticker, name: h.name, price: h.price, shares: h.shares,
              costBasis: h.costBasis, acquisitionDate: h.acquisitionDate, beta: h.beta,
              dividendYield: h.dividendYield, expRatio: h.expRatio, geography: h.geography,
              sector: h.sector, assetClass: h.assetClass, instrumentType: h.instrumentType };
          });
        }
        if (a.erOverride  != null && a.erOverride  !== '') out.erOverride  = a.erOverride;
        if (a.volOverride != null && a.volOverride !== '') out.volOverride = a.volOverride;
        return out;
      }),
      contributions_total: bp.contributions_total || 0,
      portfolio_total:     bp.portfolio_total || 0,
      ss:      bp.ss,
      income:  bp.income,
      climate: bp.climate,
      tax:     bp.tax,
      upkeep:  { upkeep_total: bp.upkeep && bp.upkeep.upkeep_total || 0,
                 charity_total: bp.upkeep && bp.upkeep.charity_total || 0 },
      datum: {
        net_datum_v1:       bp.datum && bp.datum.net_datum_v1 || 0,
        gross_funding_need: bp.datum && bp.datum.gross_funding_need || 0,
        derived_from:       bp.datum && bp.datum.derived_from || 'quick'
      }
    };
  }

  /* Restore-side counterpart to slimSlotForClerk — the slim Clerk mirror DROPS `name`
   * ("derivable from baseId"), so a restored account arrives nameless and renders
   * "undefined (JOINT) …". This re-derives a MISSING/blank name from the room's
   * canonical title via the injected resolver (studio.html: getBaseType(baseId).title);
   * a present custom name (kept by the localStorage full archive) is left untouched.
   * Mutates in place (accounts arrive as a fresh .slice()) and returns the array. */
  function hydrateAccountNames(accounts, resolveTitle) {
    if (!Array.isArray(accounts)) return accounts;
    for (var i = 0; i < accounts.length; i++) {
      var a = accounts[i];
      if (a && (a.name === undefined || a.name === null || a.name === '')) {
        var t = (typeof resolveTitle === 'function') ? resolveTitle(a.baseId) : '';
        a.name = t || a.baseId || '';
      }
    }
    return accounts;
  }

  /* V1 Gross Funding ESTIMATE — weighted-average over the supply pools.
   * Pools = Roth balances, Taxable balances, Traditional balances,
   * Pension income stream, SS income stream. Each pool's share of the
   * total supply weights its tax multiplier; the resulting weighted
   * multiplier scales Net Datum -> Gross Funding need. */
  function computeGrossFunding(bp) {
    var net = Number(bp.datum && bp.datum.net_datum_v1) || 0;
    var empty = { gross: 0, breakdown: { roth: 0, taxable: 0, traditional: 0, pension: 0, ss: 0 } };
    if (net <= 0) return empty;

    var pools = { roth: 0, taxable: 0, traditional: 0, pension: 0, ss: 0 };
    (bp.accounts || []).forEach(function (a) {
      var bucket = BASE_TO_BUCKET[a.baseId];
      if (bucket && (a.value || 0) > 0 && !a.exclude) {
        pools[bucket] += Number(a.value) || 0;
      }
    });
    pools.pension += Number(bp.income && bp.income.pension_primary_annual) || 0;
    pools.pension += Number(bp.income && bp.income.pension_secondary_annual) || 0;

    var ss = SS_BY_STRATEGY[bp.ss && bp.ss.strategy_primary] || 0;
    if (bp.profile && bp.profile.co_architect_enabled) {
      ss += SS_BY_STRATEGY[bp.ss && bp.ss.strategy_secondary] || 0;
    }
    pools.ss = ss;

    var totalSupply = pools.roth + pools.taxable + pools.traditional + pools.pension + pools.ss;
    if (totalSupply <= 0) return { gross: net, breakdown: empty.breakdown };

    var weightedMult = 0;
    var breakdown = { roth: 0, taxable: 0, traditional: 0, pension: 0, ss: 0 };
    Object.keys(pools).forEach(function (k) {
      var w = pools[k] / totalSupply;
      breakdown[k]  = Math.round(w * 1000) / 1000;
      weightedMult += w * (TAX_MULTIPLIERS[k] || 1);
    });
    return { gross: Math.round(net * weightedMult), breakdown: breakdown };
  }

  /* Investable estate total — THE canonical investable set that drives the deterministic
   * Shape's capital axis (Captain ruling 2026-06-21 / §22 row 0458): Σ of account balances
   * in the roth / taxable / traditional buckets = liquid + pretax + roth. EXCLUDES physical
   * assets, debts, income streams (pension / SS), and trust / 529 (none are in BASE_TO_BUCKET),
   * plus checking (unmapped) and any room flagged a.exclude (the Phase-III per-account override
   * hook). studio.html's G5 Estate→Shape reconcile calls THIS as its single source — distinct
   * from the Estate Square Footage gross-net figure. */
  // S2.4 — hoisted to module scope so investableTotal() AND accountWeights() share ONE
  // definition of the canonical investable bucket set (single source of truth).
  var INVEST = { roth: true, taxable: true, traditional: true };
  function investableTotal(bp) {
    return (((bp && bp.accounts) || [])).reduce(function (sum, a) {
      var bucket = BASE_TO_BUCKET[a && a.baseId];
      if (bucket && INVEST[bucket] && !(a && a.exclude)) sum += Number(a.value) || 0;
      return sum;
    }, 0);
  }

  /* Per-account weight = % of investableTotal (Captain ruling #3, S2.4). SAME BASE_TO_BUCKET +
   * INVEST as investableTotal() — one source. Non-investable rooms (debt / physical / income /
   * trust / 529 / checking / excluded) -> 0. The estate renderer READS this (LOCK-3, never
   * recomputes); load-bearing wall thickness + edge glow scale off it. */
  function accountWeights(bp) {
    var total = investableTotal(bp), out = {};
    (((bp && bp.accounts) || [])).forEach(function (a) {
      if (!a) return;
      var bucket = BASE_TO_BUCKET[a.baseId];
      var invest = bucket && INVEST[bucket] && !a.exclude;
      out[a.id] = (invest && total > 0) ? ((Number(a.value) || 0) / total) * 100 : 0;
    });
    return out;
  }

  /* ---- Persistence ---- */

  function readArchive() {
    try { var raw = localStorage.getItem(ARCHIVE_KEY); return raw ? JSON.parse(raw) : null; }
    catch (_e) { return null; }
  }
  function writeArchive(arch) {
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arch)); } catch (_e) {}
  }
  function readSlot(slotId) {
    try {
      var raw = localStorage.getItem(PER_SLOT_PREFIX + slotId);
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    var arch = readArchive();
    return (arch && arch['slot' + slotId]) || null;
  }
  function writeSlot(slotId, bp) {
    try { localStorage.setItem(PER_SLOT_PREFIX + slotId, JSON.stringify(bp)); } catch (_e) {}
    var arch = readArchive() || {
      slot1: null, slot2: null, slot3: null, slot4: null,
      activeBlueprintSlot: 1, userHasPremiumToken: false
    };
    arch['slot' + slotId] = bp;
    arch.activeBlueprintSlot = slotId;
    writeArchive(arch);
  }
  /* THE OPEN-BY-ID COPY — the third store, and the one a save never used to refresh.
   *
   * writeSlot above writes `datum_blueprint_state_<1..4>`, the NUMBER key from _placeInNet. But load()'s
   * EXPLICIT-OPEN branch reads `datum_blueprint_state_<blueprint_id>` — the UUID key — because that is how
   * Open-from-the-Archive addresses a sheet. Only Blueprint.html ever wrote the UUID key, and only when the
   * ARCHIVE PAGE LOADS. So: open a blueprint from the archive, edit it, save it, reload — and because the
   * reload keeps ?id=&hydrate=blueprint in the URL, the explicit-open branch handed back the ARCHIVE-TIME
   * SNAPSHOT. Not a dropped field, not a blank: A WHOLE EARLIER COPY OF THE FILE. Measured on the live site
   * as 1,500,000 coming back after 150,000 was saved, while the record itself held 150,000 correctly.
   *
   * The sketch surface never had this fault because _doSave rewrites `datum_sketch_byid_<sketch_id>` on
   * EVERY save — it refreshes the very stash its own open path reads. This is that same discipline, applied
   * to the surface that was missing it.
   *
   * Keyed off bp.blueprint_id AFTER save()'s id resolution, so overwriting sheet B while working in sheet A
   * refreshes B's copy with what was actually written to B — never A's content under B's key.
   * Silent on quota, matching writeSlot/writeArchive beside it: an LS write that cannot land must not take
   * the save down with it, and D1 remains the record either way. */
  function writeIdStash(bp) {
    try {
      if (bp && bp.blueprint_id) localStorage.setItem(PER_SLOT_PREFIX + bp.blueprint_id, JSON.stringify(bp));
    } catch (_e) {}
  }
  function readSessionDraft() {
    try {
      var raw = localStorage.getItem(SESSION_DRAFT_KEY);
      // ONE-DEPLOY MIGRATION: a user who was mid-edit when this shipped still holds their draft in
      // the OLD store. Reading it here means the storage move itself cannot destroy the very work
      // this commit exists to protect. READ-side only — no second write path, no second clear path.
      if (raw == null) raw = sessionStorage.getItem(SESSION_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    catch (_e) { return null; }
  }

  /* Draft persistence failure state. A write that fails must NEVER pass silently: a swallowed
   * QuotaExceededError means the user keeps typing into a draft that stopped persisting — the
   * original data-loss injury wearing a new hat. */
  var _draftWriteOk = true;
  function _draftWriteState(okNow, err) {
    if (okNow === _draftWriteOk) return;                 // edge-triggered: report changes, not every write
    _draftWriteOk = okNow;
    if (!okNow) {
      try { console.error('[studio draft] LOCAL DRAFT WRITE FAILED — edits are no longer being kept on this device.', (err && (err.name || err.message)) || err); } catch (_e) {}
    } else {
      try { console.warn('[studio draft] local draft write recovered — edits are being kept again.'); } catch (_e) {}
    }
    try {
      if (typeof global.CustomEvent === 'function' && typeof global.dispatchEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent('datum:draft-write-state', {
          detail: { ok: okNow, error: (err && (err.name || String(err))) || null }
        }));
      }
    } catch (_e) {}
  }
  /* The single low-level draft write. Both the debounced editing path and the stale-draft
   * acceptance path go through here so quota handling can never diverge between them. */
  function _persistDraft(obj) {
    try { localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(obj)); _draftWriteState(true, null); return true; }
    catch (_e) { _draftWriteState(false, _e); return false; }
  }
  /* ── CROSS-TAB GUARD ────────────────────────────────────────────────────────────────────────
   * localStorage is shared across tabs; sessionStorage gave per-tab isolation for free. Moving the
   * draft to survive tab-close therefore introduced a clobber nobody asked for: two Studio tabs
   * write the SAME key and the last one wins, destroying the other's work.
   *
   * This does NOT build cross-tab sync. It only stops the CLOBBER: a tab refuses to overwrite a
   * draft that a DIFFERENT tab wrote AFTER this tab last agreed with the stored state.
   *
   * TAB_ID lives in sessionStorage on purpose — per-tab by definition, and it survives a reload, so
   * a tab keeps its identity across F5 and does not mistake itself for a sibling.
   *
   * _seenAt is the stamp of the draft state this tab is in agreement with: set when load() hydrates
   * a draft, and after each successful write. A sibling stamp NEWER than _seenAt means work arrived
   * that this tab has never seen — overwriting it would erase it. null means this tab has never
   * agreed with any stored draft, so ANY sibling draft counts as unseen. */
  var TAB_ID = (function () {
    try {
      var k = 'datumfi_studio_tab_v1', v = sessionStorage.getItem(k);
      if (!v) { v = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem(k, v); }
      return v;
    } catch (_e) { return 't-nostore'; }
  }());
  var _seenAt = null;
  var _siblingHold = null;    // the sibling draft we refused to overwrite, for the host to act on
  function _siblingIsUnseen(inc) {
    if (!inc || !inc._tabId || inc._tabId === TAB_ID) return false;
    var it = Date.parse(inc._draftAt);
    if (isNaN(it)) return false;                       // L47 — an unknown stamp is not evidence
    var st = Date.parse(_seenAt);
    return isNaN(st) ? true : it > st;
  }
  function siblingHold() { return _siblingHold; }

  /* opts.echo — a LOAD re-persisting what it just hydrated. That is not an edit: it must not take
   * ownership of the draft and must not advance the edit clock, or simply OPENING a second tab
   * would re-attribute the draft and make the ACTIVE tab refuse to save its own typing (worse than
   * the clobber this guard exists to stop). An echo therefore keeps the incumbent's _tabId and
   * _draftAt, and never triggers the guard — the content it writes is what it just read. */
  function writeSessionDraft(bp, opts) {
    // _draftAt is the ONLY discriminator boot has between a newer unsaved edit and the last SAVED doc:
    // bp.saved_at is written by save() ALONE, so an edited draft and the D1 doc carry the SAME saved_at
    // and any "prefer the newer" test would tie on every edit. Stamped on a COPY so the live bp is not
    // mutated, and underscore-prefixed so toD1Document strips it — this local edit clock never reaches
    // D1 and never becomes part of a saved payload. Local draft only; no new D1 write site.
    var echo = !!(opts && opts.echo);
    /* opts.load — a LOAD writing freshly hydrated content. It needs echo's SIBLING BYPASS (the
     * content is authoritative and must land) but must NOT inherit the incumbent's edit clock,
     * because the content it writes is NOT what the incumbent held. Splitting the two is the fix
     * for the Captain's 2026-08-01 report; see finishLoad for the full account. The comment above
     * already flagged that echo was carrying a job it was not built for — this is that job. */
    var isLoad = !!(opts && opts.load);
    var incumbent = readSessionDraft();
    if (!echo && !isLoad && _siblingIsUnseen(incumbent)) {
      // Another tab wrote work this tab has never seen. Overwriting it would destroy it, so we do
      // not. The sibling draft is held for the host to surface — this must NOT stay a silent stop.
      _siblingHold = incumbent;
      try { console.warn('[studio draft] another Studio tab has newer unsaved work — not overwriting it.'); } catch (_e) {}
      try {
        if (typeof global.CustomEvent === 'function' && typeof global.dispatchEvent === 'function') {
          global.dispatchEvent(new global.CustomEvent('datum:draft-sibling-hold', { detail: { at: incumbent._draftAt } }));
        }
      } catch (_e) {}
      return;
    }
    /* THE EDIT CLOCK ADVANCES ONLY ON AN ACTUAL EDIT.
     * _draftAt answers "when did the user last change something", and it is the discriminator any
     * unsaved-work check has to lean on. But two NON-EDIT writers were advancing it:
     *   save()      — stamped `now` a millisecond AFTER bp.saved_at, so a doc read DIRTY the instant it
     *                 was successfully saved. Measured: _draftAt 18:21:07.871 vs saved_at 18:21:07.870.
     *   finishLoad  — with no incumbent draft, stamped `now` while saved_at sat in the past, so simply
     *                 OPENING a saved file read DIRTY before the user touched anything. Measured on a
     *                 zero-interaction load: one advance, authored by finishLoad, and dirty came back true.
     * opts.at lets a non-edit writer say "stamp this at the document's own saved_at" instead of now.
     * Real input is untouched and still stamps now — bind()'s debounced commit and the host's saveDraft
     * are the only writers that SHOULD move this clock.
     * ECHO IS A DIFFERENT GUARD and is deliberately left in front: when an incumbent exists its stamp wins,
     * because a genuinely dirty draft from an earlier session must stay dirty. echo protects the
     * sibling-tab guard; it never protected against this, which is why opts.at exists rather than echo
     * being bent to a job it was not built for. */
    var keep  = echo && incumbent;
    var stamp = (opts && typeof opts.at === 'string' && opts.at) ? opts.at : null;
    var at    = keep && incumbent._draftAt ? incumbent._draftAt : (stamp || new Date().toISOString());
    var owner = keep && incumbent._tabId   ? incumbent._tabId   : TAB_ID;
    if (_persistDraft(Object.assign({}, bp, { _draftAt: at, _tabId: owner }))) {
      _seenAt = at;               // this tab is now in agreement with what is stored
      _siblingHold = null;
    }
  }

  /* THE ONE PLACE A DRAFT IS DISCARDED. Every caller routes here so the storage decision can
   * never fan back out across the app the way three literal removeItem calls once did (L48).
   * Clears BOTH stores: the live localStorage draft AND any legacy sessionStorage draft left by
   * a pre-Commit-2 tab — otherwise "discard" would quietly stop discarding. */
  function clearDraft() {
    try { localStorage.removeItem(SESSION_DRAFT_KEY); } catch (_e) {}
    try { sessionStorage.removeItem(SESSION_DRAFT_KEY); } catch (_e) {}
    _pendingStaleDraft = null;
    _seenAt = null;            // nothing stored, so nothing to be out of agreement with
    _siblingHold = null;
  }

  /* ── WORK STATE ───────────────────────────────────────────────────────────────────────────────────
   * READ-ONLY. Reports facts about the local draft; decides NOTHING and changes NOTHING. It exists so a
   * leave-prompt can ask honestly instead of guessing, and it is deliberately split into separate facts
   * rather than one "dirty" boolean, because THE TWO PEOPLE WE ARE PROTECTING ARE NOT THE SAME PERSON
   * and a single flag would force one of them to be answered wrongly:
   *   A SIGNED-IN ARCHITECT WITH A SAVED BLUEPRINT is at risk of losing EDITS MADE SINCE THAT SAVE.
   *     Their question is unsavedEdits. hasContent is useless for them — a saved blueprint always has
   *     content, so it would fire forever, on every visit, saved or not.
   *   A VISITOR WITH NO ACCOUNT cannot have saved anything, so they have no "last save" to be newer
   *     than. MEASURED: for a never-saved blueprint saved_at is null, so the newer-than test is not
   *     merely wrong for them, IT IS UNDEFINED — and they are the entire conversion audience.
   *     Their question is hasContent: is there something here worth keeping.
   *
   * WHY hasContent COMPARES AGAINST A PRISTINE BLUEPRINT INSTEAD OF ASKING WHETHER A DRAFT EXISTS.
   * MEASURED, and this is the trap: Studio writes a draft on a COLD LOAD with zero interaction — a
   * signed-out cold boot produced a draft stamped at load time with accounts 0 and saved_at null. So
   * "a draft exists" and "_draftAt is set" are both TRUE FOR EVERY VISITOR AT BOOT. Either one as a
   * dirty test marks the whole world dirty before anybody touches anything, which is exactly the bug
   * 44b6245 already cost us once. Comparing against newBlueprint() asks a question boot cannot forge:
   * is what is on screen different from blank.
   *
   * WE ENUMERATE WHAT TO IGNORE, NOT WHAT TO COMPARE — same law as the Sketch signal and the nav guard,
   * and for the same reason. A field added next year is compared BY DEFAULT: if it is user-authored we
   * are correct for free, and if it is bookkeeping the cost is one unnecessary prompt. A whitelist would
   * fail the other way and silently stop noticing somebody's work.
   * IGNORED, AS A RULE RATHER THAN A LIST: every _-prefixed key. That is not a convenience — it is this
   * module's OWN existing convention, the one toD1Document leans on when it strips _-prefixed keys so
   * local bookkeeping never reaches a saved payload (see writeSessionDraft). User content therefore
   * CANNOT be _-prefixed by construction, which makes the rule safe in the direction that matters, and
   * it absorbs the next bookkeeping key without anybody having to notice. MEASURED on a cold load, the
   * boot draft carried three of them — _draftAt, _tabId and _loadSource; the hand list caught two and
   * _loadSource alone was enough to report the whole world dirty.
   * IGNORED BY NAME, the bookkeeping that is not _-prefixed: saved_at and blueprint_id (written by save),
   * the schema/version stamps, and datum — which holds ONLY values recomputed from the fields above it,
   * so a real change always shows up in its own source field first.
   *
   * THIS IS NOT THE FENCED NEWEST-WINS COMPARATOR AND MUST NEVER BE MERGED WITH IT. _draftIsNewer below
   * asks "draft versus the D1 SERVER DOC" to decide which one to hydrate. unsavedEdits asks "draft versus
   * ITS OWN saved_at" to decide whether to ask a question. Different inputs, different consequence — one
   * chooses data, this one only chooses words. Nothing here reads, writes or influences that comparator. */
  var _WORK_IGNORE = { saved_at: 1, blueprint_id: 1, schema: 1, version: 1, datum: 1 };
  /* THE BASELINE IS AN UNTOUCHED BOOT, NOT A PRISTINE OBJECT. This compared the draft to
   * newBlueprint() and so counted THE USER'S OWN DOSSIER as work they had done: applyDossier copies
   * their name, DOB and retirement date into bp.profile on EVERY load, so anybody with an account
   * profile was "building something" the instant the Studio opened.
   * MEASURED 2026-08-01, the Captain's report: land on the Studio, touch nothing, and the leave
   * prompt fires — Branch C signed in, Branch B signed out. With no dossier it stayed correctly
   * silent, which is exactly why the first version of the gate missed it: its zero state was an
   * EMPTY one, and no real user has an empty one.
   * PROFILE IS NOT BLANKET-IGNORED, deliberately. Adding it to _WORK_IGNORE would have been one
   * word and would have thrown away real signal — the profile dates ARE editable in the Studio, so
   * somebody who types a retirement date and leaves must still be asked. Seeding it from the
   * dossier is what does not count; changing it does. Comparing against what an untouched boot
   * WOULD have produced draws that line exactly, and needs no list to be kept up to date. */
  /* THE BASELINE MUST REPLAY EVERYTHING THE LOAD SEEDED, IN THE LOAD'S OWN ORDER. Same law that
   * already put applyDossier in this baseline, applied to the other thing a load pours in for free:
   * a SKETCH CARRY. applySketchContract copies a saved sketch's values in on load, so anybody
   * arriving via the Sketchbook's "Open in Studio" was "building something" the instant the Studio
   * opened. Captain-reported 2026-08-01; his ruling: "an already saved file that has not had a
   * change yet should NOT get this message." The sketch is safe in the Sketchbook — nothing is at
   * risk until something changes.
   *
   * ⚠️ ORDER IS LOAD-BEARING, AND GETTING IT WRONG IS INVISIBLE WITHOUT A DOSSIER. applySketchContract
   * is order-dependent BY CONSTRUCTION (`if (s.age && !bp.profile.primary_dob)`), and both seeders
   * write plan_end_age, the tax rate, portfolio_total and contributions_total. The load runs
   * SKETCH then DOSSIER, so the dossier wins those; a baseline running dossier-then-sketch lets the
   * SKETCH win them and disagrees with the draft on four fields. My first attempt did exactly that
   * and passed its own gate, because the gate's fixture had NO DOSSIER — with no dossier the order
   * cannot matter. The Captain has one, so he still saw the prompt. Same empty-zero-state trap this
   * project has now been bitten by three times.
   *
   * SO THERE IS ONE SEQUENCE AND TWO CALLERS, not two copies. _seedSketchCarry is what load() runs
   * and what the baseline replays; they cannot drift because there is nothing to keep in step.
   * NOTE the other sketch entry, load()'s `opts.from === 'sketch'`, is deliberately NOT routed
   * through here: studio.html:13306 records that it has no live caller, and changing its source
   * string would alter finishLoad's Estate back-fill with nothing exercising it. */
  function _seedSketchCarry(bp, id) {
    applySketchContract(bp, readSketchSlot(id));
    applyDossier(bp, readDossier());
  }
  /* FAILS TOWARD ASKING: if the sketch can no longer be read (erased since), the baseline falls
     back to dossier-only, the carry looks like content, and the user is asked. */
  function _pristineFor(draft) {
    var src = draft && typeof draft._loadSource === 'string' ? draft._loadSource : '';
    var p = newBlueprint();
    if (src.indexOf('sketch-contract:') === 0) {
      try { _seedSketchCarry(p, src.slice('sketch-contract:'.length)); return p; }
      catch (_e) { p = newBlueprint(); }
    }
    try { applyDossier(p, readDossier()); } catch (_e) {}
    return p;
  }
  function _hasContent(draft) {
    var pristine = _pristineFor(draft);
    var seen = {}, k;
    for (k in pristine) if (Object.prototype.hasOwnProperty.call(pristine, k)) seen[k] = 1;
    for (k in draft)    if (Object.prototype.hasOwnProperty.call(draft, k))    seen[k] = 1;
    for (k in seen) {
      if (!Object.prototype.hasOwnProperty.call(seen, k)) continue;
      if (k.charAt(0) === '_' || _WORK_IGNORE[k]) continue;
      try { if (JSON.stringify(draft[k]) !== JSON.stringify(pristine[k])) return true; }
      catch (_e) { return true; }   // unstringifiable means something is in there — fail toward asking
    }
    return false;
  }
  function workState() {
    var d = null;
    try { d = readSessionDraft(); } catch (_e) { d = null; }
    if (!d) return { present: false, hasContent: false, everSaved: false, unsavedEdits: false };
    var everSaved = !!(typeof d.saved_at === 'string' && d.saved_at);
    var dt = Date.parse(d._draftAt), st = everSaved ? Date.parse(d.saved_at) : NaN;
    return {
      present:      true,
      hasContent:   _hasContent(d),
      everSaved:    everSaved,
      // Only ever true when BOTH stamps parse. A missing stamp is not evidence of an edit (L47).
      unsavedEdits: !!(everSaved && !isNaN(dt) && !isNaN(st) && dt > st)
    };
  }

  /* DATA-LOSS FIX — is the local session draft genuinely NEWER than the D1 studio doc?
   * D1 side uses the ROW's updated_at (when it was actually written), which getDoc already returns.
   * L47: never fabricate a stamp. A missing/unparseable stamp on either side is NOT treated as old —
   * it falls to the tiebreak: prefer whichever source actually HAS rooms, and if that does not separate
   * them, keep today's behaviour and let D1 win. Never silently drop accounts. */
  function _draftIsNewer(draft, d1Doc) {
    var dt = Date.parse(draft && draft._draftAt);
    var st = Date.parse(d1Doc && d1Doc.updated_at);
    if (!isNaN(dt) && !isNaN(st)) return dt > st;
    var draftHasRooms = !!(draft && draft.accounts && draft.accounts.length);
    var d1HasRooms = false;
    try { var p = JSON.parse(d1Doc && d1Doc.payload); d1HasRooms = !!(p && p.accounts && p.accounts.length); } catch (_e) {}
    if (draftHasRooms !== d1HasRooms) return draftHasRooms;
    return false;
  }

  /* Is this draft older than the window we will silently trust?
   *
   * L47 — a missing or unparseable _draftAt is NOT "old", it is UNKNOWN, and we never name an age
   * we do not know. Unknown returns false: no prompt, fall through to the existing tiebreak. The
   * consequence is load-bearing for the copy — whenever the prompt DOES render, {when} is always
   * resolvable, so it can never print "undefined ago".
   *
   * _draftAcceptedAt records when the USER answered the prompt with "Restore my draft". It is NOT a
   * re-stamp of _draftAt: forging the edit clock would lie about when the work was done. It only
   * says "the owner has already been asked about this draft and said keep it", so we stop asking. */
  function _draftIsStale(draft, nowMs) {
    var now = (typeof nowMs === 'number') ? nowMs : Date.now();
    var acc = Date.parse(draft && draft._draftAcceptedAt);
    if (!isNaN(acc) && (now - acc) <= DRAFT_STALE_MS) return false;
    var dt = Date.parse(draft && draft._draftAt);
    if (isNaN(dt)) return false;
    return (now - dt) > DRAFT_STALE_MS;
  }

  /* A draft that is NEWER than the saved row but OUTSIDE the window: never auto-hydrated, never
   * dropped. load() parks it here, hydrates the SAVED doc, and the host offers the choice. */
  var _pendingStaleDraft = null;
  function pendingStaleDraft() { return _pendingStaleDraft; }
  function acceptStaleDraft() {
    var d = _pendingStaleDraft;
    if (!d) return null;
    d._draftAcceptedAt = new Date().toISOString();
    d._tabId = TAB_ID;
    _persistDraft(d);
    _seenAt = d._draftAt;
    _pendingStaleDraft = null;
    return d;
  }

  /* Clerk mirror — P3 SOURCE OF TRUTH: compact+compress the WHOLE 4-slot archive
   * (slim per slot) into a single `blueprint_z` blob, then atomically drop the
   * legacy single-slot `blueprint` key to reclaim ~1KB of the shared 8192B cap.
   * Decision A sequencing: the write proceeds ONLY when safeMerge returns ok:true,
   * and that same write both stores blueprint_z AND removes the legacy key — so the
   * legacy key is never gone without blueprint_z present. Over cap (ok:false) ->
   * keep localStorage as truth, leave the legacy key untouched, never truncate. */
  function mirrorToClerk(bp, done) {
    if (typeof done !== 'function') done = function () {};
    try {
      if (!global.Clerk) { done(); return; }
      // P5a SCOPE NOTE (Layer-1 dual-write, #271): this saved-Blueprint ARCHIVE mirror (blueprint_z)
      // STAYS ON. Layer 1 ADDS the D1 blueprint rows ALONGSIDE it (d1WriteBlueprint) — additive, exactly
      // like P3 did for Studio — so nothing on Clerk is at risk. blueprint_z RETIRES in Layer 2, only once
      // the Blueprint archive UI reads from D1 (its replacement fully live). Do NOT short-circuit here yet.
      var Codec = global.DatumArchiveCodec;
      if (!Codec) { console.warn('[blueprint mirror] codec unavailable; skipped Clerk mirror'); done(); return; }
      global.Clerk.load().then(function () {
        if (!global.Clerk.user) { done(); return; }
        var arch = readArchive() || {};
        var slimArch = {
          slot1: slimSlotForClerk(arch.slot1), slot2: slimSlotForClerk(arch.slot2),
          slot3: slimSlotForClerk(arch.slot3), slot4: slimSlotForClerk(arch.slot4)
        };
        var bpZ = Codec.encodeBlueprintArchive(slimArch);
        var existing = global.Clerk.user.unsafeMetadata || {};
        var base = {};
        for (var k in existing) {
          if (Object.prototype.hasOwnProperty.call(existing, k) && k !== 'blueprint') base[k] = existing[k];
        }
        var res = Codec.safeMerge(base, { blueprint_z: bpZ });
        console.log('[blueprint mirror] blueprint_z bytes:', Codec.byteLen(bpZ), '| merged total:', res.bytes, '/ 8192 | ok:', res.ok);
        if (!res.ok && typeof Codec.encodeArchiveWithDegrade === 'function') {
          // STEP A (c) SAFETY VALVE 2026-07-08 — holdings pushed the mirror over cap. Rather than drop
          // the whole write, shed OLDER-archive-slot holdings (oldest saved_at first), keeping the
          // ACTIVE blueprint's holdings intact. LS archive stays the full truth (deep-copied inside).
          var activeId = (bp && bp.blueprint_id) || (arch.slot1 && arch.slot1.blueprint_id) || null;
          var budget = Codec.CAP - Codec.byteLen(JSON.stringify(base)) - 20;   // reserve for the "blueprint_z":"" key
          var deg = Codec.encodeArchiveWithDegrade(slimArch, activeId, budget);
          res = Codec.safeMerge(base, { blueprint_z: deg.blob });
          if (deg.shed && deg.shed.length) console.warn('[blueprint mirror] cap degrade — shed older-slot holdings:', deg.shed.join(','), '| kept ACTIVE', activeId);
        }
        if (!res.ok) {
          console.warn('[blueprint mirror] over 8192B cap (even after degrade); kept LS truth + legacy key, did NOT write:', res.bytes);
          done(); return;
        }
        global.Clerk.user.update({ unsafeMetadata: res.merged })
          .then(done)
          .catch(function (e) { console.warn('[blueprint mirror] update failed', e); done(); });
      }).catch(done);
    } catch (_e) { done(); }
  }

  /* P6 — public re-mirror: re-encode the WHOLE archive (read fresh from LS, so a
   * just-erased slot is already null) into blueprint_z via the same safeMerge
   * path. Lets the shared DatumPurge helper drop a slot from the Clerk mirror on
   * erase without inlining a second encoder. */
  function remirrorArchive(done) { mirrorToClerk(null, done); }

  /* P3 — D1 dual-write (ADDITIVE; alongside LS + Clerk, never instead of). FULL FIDELITY: strip only
   * runtime _-prefixed ephemerals (_avmLast, _agg, ...) — NO slim, NO graceful-degrade, so every
   * room/holding/name reaches D1. This is the path that makes "save persists everything" true. */
  function toD1Document(bp) {
    function clean(o) {
      if (Array.isArray(o)) return o.map(clean);
      if (o && typeof o === 'object') {
        var out = {};
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && k.charAt(0) !== '_') out[k] = clean(o[k]);
        return out;
      }
      return o;
    }
    return clean(bp);
  }
  // Coarse-debounced D1 write of the ACTIVE studio doc. No-op when the D1 client is absent or the
  // user is signed out (LS/Clerk stay the truth — the escape route). 409 => reload server doc + warn.
  function d1WriteStudio(bp) {
    try {
      // No-op when D1 absent, signed out, OR rolled back (CUTOVER=false = D1 fully off = today's path).
      if (!global.DatumD1 || global.DatumD1.CUTOVER === false || !global.DatumD1.signedIn()) return;
      // FIX #1 (slow-read anti-clobber) — refuse to blind-write an EMPTY active doc when we have NOT
      // confirmed the current server doc (no known revision = the D1 read never landed, e.g. a slow/failed
      // getDoc that fell back to boot(null) at the 1.2s LOAD_TIMEOUT). Writing empty here would clobber a
      // real, unread D1 doc. A genuine "delete all rooms" always has a known revision (the doc WAS read at
      // boot); a brand-new user's first real save is non-empty. LS + the Clerk net still hold everything.
      if ((!bp.accounts || !bp.accounts.length) && typeof global.DatumD1.knownRevision('studio', 'active') !== 'number') return;
      global.DatumD1.scheduleWrite('studio', 'active', function () { return toD1Document(bp); }, function (server) {
        try {
          if (server && server.payload) { Object.assign(bp, JSON.parse(server.payload)); writeSessionDraft(bp); }
          console.warn('[d1] studio doc changed in another tab — reloaded the server copy (no merge)');
        } catch (e) {}
      });
    } catch (e) {}
  }

  // P5a Layer-1 — write a SAVED BLUEPRINT as its OWN D1 document (doc_key = blueprint_id). This is the
  // per-blueprint home that GROWS UNLIMITED (one row each, no 4-slot cap) at FULL fidelity, with per-doc
  // 409. ADDITIVE: written ALONGSIDE the Clerk blueprint_z mirror (which stays on until Layer 2), so
  // nothing on Clerk is at risk. We snapshot the doc at save time (toD1Document deep-clones + strips
  // _-ephemerals) so a later live-studio edit can't leak into this saved sheet. No-op when D1 absent /
  // signed out / rolled back (CUTOVER=false) — the Clerk mirror + LS remain the truth in those states.
  function d1WriteBlueprint(bp) {
    try {
      // GUARDS UNCHANGED — same conditions, same immediate return. They now return null instead of
      // undefined so the caller can tell "no write was attempted" from "a write is under way" (L53).
      if (!global.DatumD1 || global.DatumD1.CUTOVER === false || !global.DatumD1.signedIn()) return null;
      if (!bp || !bp.blueprint_id) return null;
      var id = bp.blueprint_id;
      var snap = toD1Document(bp);   // snapshot NOW — independent deep copy, not the live-mutating bp
      // #2 (save-lag fix) — a saved blueprint is a DISCRETE, deliberate act: write it IMMEDIATELY (writeNow),
      // not on the ~1.5s autosave debounce, so navigating to the archive right after "Save" can't abandon it
      // in the debounce window. Falls back to scheduleWrite on hosts/gates without writeNow.
      var _write = global.DatumD1.writeNow || global.DatumD1.scheduleWrite;
      // RETURNED, not discarded — writeNow resolves with { ok } and that outcome is what any "Saved"
      // confirmation must be downstream of (L53). The write itself is unchanged.
      return _write.call(global.DatumD1, 'blueprint', id, function () { return snap; }, function () {
        console.warn('[d1] blueprint ' + id + ' changed in another tab — reloaded the server revision (no merge)');
      });
    } catch (e) { return null; }
  }

  /* LESSON 53 — A CONFIRMATION THAT CANNOT FAIL IS NOT A CONFIRMATION.
   * save() is synchronous and the D1 writes are fire-and-forget, so every caller that toasted "Saved" did
   * so without ever reading an outcome. Measured: with a dead session the user was told "Saved to <name>"
   * in ALL THREE failure shapes, and in the shape where Clerk has dropped the user the save pill ALSO read
   * "Saved" — an affirmative lie with nothing anywhere to contradict it.
   * opts.onResult is how a caller hears what actually happened. It reports exactly three outcomes:
   *   { ok: true }                       the archive row was written and the server acknowledged it
   *   { ok: false, reason: 'no-session' } NO write was attempted — there is no usable session
   *   { ok: false, reason: 'failed' }     a write was attempted and did not land (no token, 401, 5xx, network)
   *   { ok: false, reason: 'pending' }    ten seconds elapsed and the write has STILL not settled
   * The reason is read from the EXISTING signedIn() predicate rather than by re-stating the guard
   * conditions here, so the two can never drift apart (L48) — the same one-path-writes-A-while-another-
   * trusts-B shape that produced three separate defects this week, pre-empted here.
   * Callers without onResult are unaffected.
   *
   * THE IMPLEMENTATION MOVED TO datum-d1.js — DatumD1.reportOutcome — because sketch.html carried the
   * IDENTICAL defect and does not load this file, while BOTH surfaces load datum-d1.js and that is where
   * writeNow already lives. The defect existed twice for exactly one reason: the behaviour was written
   * twice. This is now a thin delegation so the two surfaces cannot drift apart (L48). Strings, timing and
   * the four outcomes are unchanged — see the contract on DatumD1.reportOutcome. */
  function _reportSaveOutcome(opts, write) {
    var cb = opts && opts.onResult;
    if (typeof cb !== 'function') return;
    if (global.DatumD1 && typeof global.DatumD1.reportOutcome === 'function') { global.DatumD1.reportOutcome(write, cb); return; }
    // D1 absent entirely (rolled back, or the module never loaded). No write was attempted and there is no
    // shared reporter to ask, so say the one thing that is true rather than saying nothing.
    try { cb({ ok: false, reason: 'no-session' }); } catch (_e) {}
  }

  // P5a — is `id` already the stable identity of a DIFFERENT saved slot? Guards fresh saves so the
  // single live-studio blueprint_id is never reused across slots (which would collide onto one D1
  // row). Reads the 4-slot LS archive today; generalizes to N when the archive UI moves off slots.
  function _idInAnySlot(id, exceptSlot) {
    if (!id) return false;
    var arch = readArchive(); if (!arch) return false;
    for (var n = 1; n <= 4; n++) {
      if (n === exceptSlot) continue;
      var s = arch['slot' + n];
      if (s && s.blueprint_id === id) return true;
    }
    return false;
  }

  /* ---- Prefill ladder ---- */

  function readDossier() {
    try { var raw = localStorage.getItem(DOSSIER_KEY); return raw ? JSON.parse(raw) : null; }
    catch (_e) { return null; }
  }
  function readSketchSlot(id) {
    if (!id) id = 1;
    try {
      var raw = localStorage.getItem('datum_sketch_state_' + id);
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    try {
      var blob = JSON.parse(localStorage.getItem(SKETCHBOOK_KEY) || 'null');
      if (blob) return blob['slot_' + id] || blob.slot_1 || null;
    } catch (_e) {}
    return null;
  }

  function mmYYYY(raw) {
    var s = String(raw || '');
    var iso     = s.match(/^(\d{4})-(\d{2})$/);
    if (iso)    return String(+iso[2]).padStart(2, '0') + ' / ' + iso[1];
    var pretty  = s.match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
    if (pretty) return String(+pretty[1]).padStart(2, '0') + ' / ' + pretty[2];
    return '';
  }
  function retDateFromAge(dobStr, retAge) {
    if (!dobStr || !retAge) return '';
    var m = String(dobStr).match(/(\d{1,2})\s*\/\s*(\d{4})/);
    if (!m) return '';
    var birthMo = +m[1], birthYr = +m[2];
    var now     = new Date();
    var curAge  = now.getFullYear() - birthYr;
    if (now.getMonth() + 1 < birthMo) curAge--;
    var retYr   = now.getFullYear() + (Number(retAge) - curAge);
    return String(birthMo).padStart(2, '0') + ' / ' + retYr;
  }

  function applyDossier(bp, d) {
    if (!d) return;
    var pri = d.primary || {};
    var ho  = d.household || {};
    var co  = ho.coArchitect || {};
    var def = d.defaults || {};
    var acc = d.accounts || {};

    if (pri.dateOfBirth)        bp.profile.primary_dob      = mmYYYY(pri.dateOfBirth);
    if (co.dateOfBirth)         bp.profile.co_architect_dob = mmYYYY(co.dateOfBirth);
    if (pri.fullName)           bp.profile.primary_name           = pri.fullName;
    if (co.fullName)            bp.profile.co_architect_name      = co.fullName;

    // Month-survival: prefer the EXACT typed date string the Dossier persists
    // (targetRetirementDate / planThroughDate). The integer age alone loses the typed month and
    // the DOB-month rebuild via retDateFromAge drifts a year at the month boundary (03/2035 -> 52
    // re-derived as 53 / 08/2035). Fall back to the age derivation only for legacy payloads.
    var rDate = pri.targetRetirementDate || def.targetRetirementDate;
    var rAge = pri.targetRetirementAge || def.targetRetirementAge;
    var rStr = rDate ? mmYYYY(rDate) : '';
    if (rStr)      bp.profile.target_retirement_date = rStr;
    else if (rAge) bp.profile.target_retirement_date = retDateFromAge(bp.profile.primary_dob, rAge);
    var coDate = co.targetRetirementDate, coRAge = co.targetRetirementAge;
    var coStr = coDate ? mmYYYY(coDate) : '';
    if (coStr)       bp.profile.co_architect_retirement_date = coStr;
    else if (coRAge) bp.profile.co_architect_retirement_date = retDateFromAge(bp.profile.co_architect_dob, coRAge);

    if (def.planThroughAge) {
      var p = parseInt(def.planThroughAge, 10);
      if (!isNaN(p)) bp.profile.plan_end_age = Math.min(120, Math.max(70, p));
    }
    // plan_end_date carries the typed Plan-Through month (the integer plan_end_age can't); Studio
    // seeds the Plan-Through field from this so a focus shows 03/2068, not a DOB-month rebuild.
    var pDate = def.planThroughDate ? mmYYYY(def.planThroughDate) : '';
    if (pDate) bp.profile.plan_end_date = pDate;
    if (def.defaultDatum > 0)         bp.datum.net_datum_v1     = Math.round(def.defaultDatum);
    if (acc.currentPortfolioBalance > 0) bp.portfolio_total      = Math.round(acc.currentPortfolioBalance);
    if (acc.annualContributions > 0)     bp.contributions_total  = Math.round(acc.annualContributions);

    if (ho.filing)   bp.tax.filing   = ho.filing;
    if (ho.location) bp.tax.location = ho.location;
    if (def.taxRate) {
      var n = parseFloat(String(def.taxRate).replace('%', ''));
      if (n > 0 && n < 100) bp.tax.working_year_effective_rate = n / 100;
    }
    if (co.dateOfBirth || co.fullName || co.targetRetirementAge || co.grossIncome) {
      bp.profile.co_architect_enabled = true;
    }
  }

  function applySketchContract(bp, s) {
    if (!s) return;
    var now = new Date().getFullYear();
    if (s.age && !bp.profile.primary_dob) {
      bp.profile.primary_dob = '01 / ' + (now - s.age);
    }
    if (s.age && s.retire_age && !bp.profile.target_retirement_date) {
      bp.profile.target_retirement_date = '01 / ' + (now + (s.retire_age - s.age));
    }
    if (s.datum_spend)    bp.datum.net_datum_v1    = Math.round(s.datum_spend);
    if (s.portfolio_mass) bp.portfolio_total       = Math.round(s.portfolio_mass);
    if (s.contributions)  bp.contributions_total   = Math.round(s.contributions);

    // Carry the global assumptions so Studio recomputes Have/Want under Sketch's settings
    // (guarded — older saves without these keep the defaults). tax_rate is 0-40 percent.
    if (s.market_outlook != null) bp.market_paradigm = s.market_outlook;
    if (s.inflation_mode != null) bp.inflation_mode  = s.inflation_mode;
    if (s.tax_rate != null)       bp.tax.working_year_effective_rate = (Number(s.tax_rate) || 0) / 100;
    if (s.plan_end_age)           bp.profile.plan_end_age = Math.round(Number(s.plan_end_age));

    // Phase 1 — carry the S2 tested (WANT) shape + S1 (HAVE) shape. Field names
    // match the live save blob (serializeSketchState); designed_* are dollars.
    if (bp.designed) {
      var dCeil  = Number(s.designed_ceil)  || 0;
      var dDatum = Number(s.designed_datum) || Number(s.datum_spend) || 0;
      var dFloor = Number(s.designed_floor) || 0;
      if (dCeil || dDatum || dFloor) {
        bp.designed.ceil    = Math.round(dCeil);
        bp.designed.datum   = Math.round(dDatum);
        bp.designed.floor   = Math.round(dFloor);
        bp.designed.state   = s.resolved_state || '';
        bp.designed.color   = s.state_color   || '';
        bp.designed.present = true;
      }
      var sd = s.s2_design;
      if (sd && bp.designed.levers) {
        bp.designed.levers.ceilDelta  = Number(sd.ceilDelta)  || 0;
        bp.designed.levers.floorDelta = Number(sd.floorDelta) || 0;
        bp.designed.levers.datumDelta = Number(sd.datumDelta) || 0;
        bp.designed.levers.portDelta  = Number(sd.portDelta)  || 0;
        bp.designed.present = true;
        // #4b Part B — carry the designed scenario SCALARS (not just the boundary
        // deltas) so the Studio Want face can rebuild the S2 tested shape on flip.
        // Units match the live save blob (serializeSketchState / updateDesignEngine):
        // port = millions, datum = $k/yr, contrib = raw $, age/retire = years.
        bp.designed.scenario = {
          age:            Number(sd.age)            || 0,
          retire:         Number(sd.retire)         || 0,
          planThroughAge: Number(sd.planThroughAge) || 93,
          port:           Number(sd.port)           || 0,
          datum:          Number(sd.datum)          || 0,
          contrib:        Number(sd.contrib)        || 0
        };
      }
    }
    if (bp.current) {
      bp.current.ceil  = Math.round(Number(s.s1_ceil)  || 0);
      bp.current.datum = Math.round(Number(s.s1_datum) || 0);
      bp.current.floor = Math.round(Number(s.s1_floor) || 0);
      bp.current.state = s.s1_resolved_state || '';
      // Exact carried ages — Studio seeds slider-age/activation from these directly,
      // bypassing the lossy age->date->age round-trip (the profile date fields convert
      // back a year short, dropping a year of compounding from the recomputed ceiling).
      bp.current.age    = Math.round(Number(s.age)        || 0);
      bp.current.retire = Math.round(Number(s.retire_age) || 0);
    }
  }

  /* ---- Public API ---- */

  function finishLoad(bp, source) {
    bp._loadSource = source;
    // G1 — the Estate rooms are the user's durable model and must survive a load that brings
    // none (e.g. a Sketch contract carry seeds sliders, not rooms). Preserve an existing
    // drafted Estate so finishLoad's writeSessionDraft below does not purge it. A blueprint
    // slot load (which HAS accounts) and a cleared draft are unaffected.
    // C (#288) DESIGN FLIP — a FRESH open ('fresh') or a SKETCH carry ('sketch-contract') must start with an
    // EMPTY Estate (section 02): a sketch carries INPUTS only, a fresh open carries nothing. The G1 back-fill
    // below (preserve a drafted Estate across a room-less load) was INTENTIONAL for a sketch carry; the ruling
    // flips it for these two sources. All other loads (plain reload / blueprint-slot) keep the preserve.
    var _seedOnly = source === 'fresh' || source.indexOf('sketch-contract') === 0;
    if (!_seedOnly && (!bp.accounts || !bp.accounts.length)) {
      try { var _prev = readSessionDraft(); if (_prev && _prev.accounts && _prev.accounts.length) bp.accounts = _prev.accounts; } catch (_e) {}
    }
    var gf = computeGrossFunding(bp);
    bp.datum.gross_funding_need      = gf.gross;
    bp.datum.gross_funding_breakdown = gf.breakdown;
    // A PARKED stale draft is the user's unanswered work — do NOT write over it here. This load
    // deliberately hydrated the SAVED doc so the Studio can ask; persisting that saved doc into the
    // draft slot would destroy the very thing the prompt is about, and "Restore my draft" would then
    // hand back the saved doc. The write resumes as soon as the question is answered (acceptStaleDraft
    // re-persists it, clearDraft discards it) — and until then a reload simply asks again.
    /* A LOAD IS NOT AN EDIT — stamp the clock at the doc's own saved_at, not at now.
     * ⚠️ ONLY A 'session-draft' LOAD IS A TRUE ECHO. Captain-reported 2026-08-01: open a SAVED
     * blueprint from the Archive, touch nothing, leave -> "You have changes that are not saved
     * yet." Cause: this passed echo:true for EVERY source, and echo keeps the INCUMBENT draft's
     * _draftAt. So a load that hydrated the SAVED blueprint still inherited the edit clock of
     * whatever draft happened to be lying around from an earlier visit, and _draftAt > saved_at
     * read as "edited" with zero edits. An echo is defined as re-persisting WHAT IT JUST READ —
     * true only when the draft is what we loaded from. Every other source (blueprint-slot, sketch
     * contract, d1, fresh) is a NEW document, so its clock is the document's own saved_at.
     * They still pass load:true, which keeps echo's sibling-tab bypass — that half was always
     * correct and is deliberately preserved.
     * ⚠️ DO NOT "SIMPLIFY" THIS BY LETTING `at` WIN INSIDE writeSessionDraft. That fixes the report
     * and deletes the feature: a plain reload passes at=saved_at, so a genuinely dirty draft would
     * be re-stamped clean on every page load. _gate_open_saved_silent --naive reproduces exactly
     * that, and OS 5 is the assertion that catches it. */
    var _isEcho = source === 'session-draft';
    if (!_pendingStaleDraft) writeSessionDraft(bp, { echo: _isEcho, load: true, at: bp.saved_at });
    return bp;
  }

  function load(opts) {
    opts = opts || {};
    var bp = newBlueprint();

    // FIX #2 (RC-B) — an EXPLICIT open (?id=blueprint / ?hydrate=sketch) is authoritative and MUST win
    // over the ambient D1 'active' studio doc. Check the URL FIRST; only a plain reload (no matching ?id)
    // falls through to the D1-first short-circuit below. A plain reload has no id -> skips this block and
    // behaves exactly as before (loads the D1 active doc). This closes bug #1: opening a saved blueprint
    // used to short-circuit on opts.d1Doc and render the empty active draft instead of the blueprint.
    try {
      var params = new URLSearchParams(global.location.search);
      // C (#288) DESIGN FLIP — an explicit FRESH open (?fresh=1 from an empty card / "Open Studio" with
      // nothing selected) starts from SEED: ignore BOTH the D1 active doc and the session draft, and (via
      // finishLoad's 'fresh' source) skip the room back-fill. This is intentionally NOT a resume.
      if (params.get('fresh') === '1') { applyDossier(bp, readDossier()); return finishLoad(bp, 'fresh'); }
      // FIX #2 — use the RAW string id. The stash/slot key is `datum_blueprint_state_<id>` where <id> is
      // the blueprint_id (a UUID, e.g. "4617c527-..."). parseInt() mangled that ("4617c527"->4617, or NaN
      // for a letter-leading UUID) so readSlot() missed the stash and the open fell through to the empty
      // active doc — which is why reordering alone was not enough to fix bug #1. Numeric legacy slots are
      // unaffected: readSlot('1') and readSlot(1) both resolve `datum_blueprint_state_1`.
      var id     = params.get('id');
      var mode   = params.get('hydrate');
      if (id && mode === 'blueprint') {
        var slot = readSlot(id);
        if (slot) { Object.assign(bp, slot); return finishLoad(bp, 'blueprint-slot:' + id); }
      }
      if (id && mode === 'sketch') {
        // ONE sequence, shared with the unsaved-work baseline — see _seedSketchCarry.
        _seedSketchCarry(bp, id);
        return finishLoad(bp, 'sketch-contract:' + id);
      }
    } catch (_e) {
      console.warn('[blueprint] We could not load your saved work (nothing was deleted) — opening an empty Studio instead.', _e);
    }

    // P3 — D1-FIRST: if the caller handed us a D1 studio doc, hydrate from it (full fidelity) and
    // adopt its revision for optimistic CAS. Any absence/error falls through to the existing
    // LS(session-draft)->Clerk path below, unchanged (silent + lossless fallback).
    // DATA-LOSS FIX — this early return used to be UNCONDITIONAL. With a D1 doc in hand,
    // readSessionDraft() below was unreachable, so a newer UNSAVED edit was silently replaced by the
    // last SAVED doc: edit -> leave -> return -> work gone. That early return WAS the loss.
    //
    // READ-SIDE ONLY. Nothing about WHEN writes happen changes: ordinary editing still ends at
    // writeSessionDraft (sessionStorage), and save() remains the ONLY D1 writer. Explicit save keeps its
    // full meaning — this merely decides which of two ALREADY-EXISTING sources to hydrate from.
    //
    // SCOPE (Commit 2): the draft now lives in localStorage, so this covers the CLOSED-TAB case too.
    // What a boot-time choice can decide is still only WHICH of two already-existing sources to
    // hydrate — nothing here changes when a write happens, and save() remains the ONLY D1 writer.
    //
    // FRESHNESS: inside the 14-day window a newer draft hydrates silently (Commit-1 behaviour,
    // unchanged). Outside it we do neither of the two tempting things — we do not auto-hydrate work
    // the user may have forgotten, and we do not drop it. The saved doc paints, the draft is parked,
    // and the host asks.
    _pendingStaleDraft = null;
    if (opts.d1Doc && opts.d1Doc.payload) {
      var _sd = opts.ignoreDraft ? null : readSessionDraft();
      var _sdNewer = !!(_sd && _draftIsNewer(_sd, opts.d1Doc));
      var _sdStale = _sdNewer && _draftIsStale(_sd);
      if (_sdStale) _pendingStaleDraft = _sd;
      // Hydrating FROM the draft puts this tab in agreement with it, so its own later writes are
      // not mistaken for a clobber of a sibling.
      if (_sdNewer && !_sdStale) _seenAt = _sd._draftAt;
      if (!(_sdNewer && !_sdStale)) {
        try {
          Object.assign(bp, JSON.parse(opts.d1Doc.payload));
          if (global.DatumD1 && typeof opts.d1Doc.revision === 'number') global.DatumD1.setRevision('studio', 'active', opts.d1Doc.revision);
          return finishLoad(bp, 'd1');
        } catch (_e) {
          console.warn('[d1] We could not load your saved work (nothing was deleted) — opening an empty Studio instead.', _e);
        }
      } else if (global.DatumD1 && typeof opts.d1Doc.revision === 'number') {
        // Hydrating from the draft, but STILL adopt the server revision we just read. Without this the
        // next save would PUT with no known revision and the API's expected=current fallback would make
        // it a silent last-write-wins — the same CAS hole the rename write had to close.
        try { global.DatumD1.setRevision('studio', 'active', opts.d1Doc.revision); } catch (_e) {
          console.warn('[d1] The revision stamp did not update — a later save may overwrite a newer copy.', _e);
        }
      }
    }

    var draft = readSessionDraft();
    if (draft && !opts.ignoreDraft) {
      _seenAt = draft._draftAt;      // agreement, as above
      Object.assign(bp, draft);
      // v1.0.1 migration: pre-1.0.1 drafts round-tripped the old hard defaults
      // (datum 120000 / tax 0.22) through captureDOM and re-poisoned the
      // sliders on every load. Reset only those exact signatures once.
      if (draft.version !== VERSION) {
        if (bp.datum && bp.datum.net_datum_v1 === 120000) bp.datum.net_datum_v1 = 100000;
        if (bp.tax && bp.tax.working_year_effective_rate === 0.22) bp.tax.working_year_effective_rate = 0.20;
        bp.version = VERSION;
      }
      return finishLoad(bp, 'session-draft');
    }

    if (opts.from === 'sketch') {
      applySketchContract(bp, readSketchSlot(opts.sketchSlot || 1));
    }
    applyDossier(bp, readDossier());
    return finishLoad(bp, 'fresh+dossier');
  }

  // P5a Layer-2 — the LS / blueprint_z 4-slot archive is now a ROLLING newest-4 CACHE (D1 is the
  // unlimited truth). _placeInNet resolves which slot (1..4) a saved bp should occupy WITHOUT the old
  // 4-cap: update-in-place when its id already holds a slot; else the first empty slot; else EVICT the
  // OLDEST saved_at slot (recency wins — what the user was last working on survives). The evicted
  // blueprint stays in D1 (its own row, unlimited) — only this degraded LS/Clerk fallback truncates.
  function _placeInNet(bp) {
    var arch = readArchive() || {};
    var oldestN = 1, oldestT = Infinity, emptyN = 0;
    for (var n = 1; n <= 4; n++) {
      var s = arch['slot' + n];
      if (s && s.blueprint_id && bp.blueprint_id && s.blueprint_id === bp.blueprint_id) return n;   // update in place
      if (!s && !emptyN) emptyN = n;
      if (s) { var t = s.saved_at ? Date.parse(s.saved_at) : -Infinity; if (t < oldestT) { oldestT = t; oldestN = n; } }
    }
    return emptyN || oldestN;
  }

  function save(bp, opts) {
    opts = opts || {};
    bp.saved_at = new Date().toISOString();
    // P5a Layer-2 — the two-branch save-picker contract (#276, Captain-ratified Option 1), PLUS the
    // legacy exact-slot path kept intact. Each saved sheet becomes its OWN D1 row (doc_key = blueprint_id):
    //   • opts.newBlueprint  -> ALWAYS mint a fresh id  ("＋ Save as a new blueprint" -> a brand-new D1 row)
    //   • opts.blueprint_id  -> reuse that id           ("Overwrite <sheet>" -> the SAME row, revision bumped)
    //   • opts.slot (legacy) -> reuse THAT slot's id    (archive-landing saveCarriedSnapshot + parity gates)
    if (opts.newBlueprint) {
      bp.blueprint_id = generateUUID();
    } else if (opts.blueprint_id) {
      bp.blueprint_id = opts.blueprint_id;
    } else if (opts.slot) {
      var existingSlot = readSlot(opts.slot);
      if (existingSlot && existingSlot.blueprint_id) bp.blueprint_id = existingSlot.blueprint_id;
      else if (!bp.blueprint_id || _idInAnySlot(bp.blueprint_id, opts.slot)) bp.blueprint_id = generateUUID();
    } else if (!bp.blueprint_id) {
      bp.blueprint_id = generateUUID();
    }
    var gf = computeGrossFunding(bp);
    bp.datum.gross_funding_need      = gf.gross;
    bp.datum.gross_funding_breakdown = gf.breakdown;
    // Legacy callers pin an exact slot; the picker branches roll the newest-4 LS-net window.
    var slotId = opts.slot || _placeInNet(bp);
    writeSlot(slotId, bp);
    writeIdStash(bp);                  // refresh the OPEN-BY-ID copy too — see writeIdStash. Here at the
                                       // single writer so EVERY save route inherits it: quick-save, the
                                       // pre-existing overwrite confirm, save-as-new, and the legacy
                                       // exact-slot callers all reach this line.
    // A SAVE IS NOT AN EDIT — it is the moment the doc becomes CLEAN. Stamp the clock at the saved_at this
    // save just wrote, so the two are EQUAL and only a later real edit can move it (see writeSessionDraft).
    writeSessionDraft(bp, { at: bp.saved_at });
    mirrorToClerk(bp, opts.done);      // Clerk blueprint_z mirror — newest-4 rolling; STILL ON (retires in the LAST L2 slice)
    d1WriteStudio(bp);                 // P3 — active studio doc (key='active'), full fidelity
    // P5a Layer-1 — this saved blueprint as its OWN unlimited D1 row (key=blueprint_id). Its outcome is the
    // one a "Saved" confirmation must wait on: it IS the archive record the user just named (L53).
    _reportSaveOutcome(opts, d1WriteBlueprint(bp));
    return bp;
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /* toEnginePayload — extends window._buildStudioRequest, never rewrites.
   * On Draft host: studio.html provides _buildStudioRequest, so we wrap it.
   * On stub hosts: returns null with a console hint. */
  function toEnginePayload(bp) {
    if (typeof global._buildStudioRequest !== 'function') {
      console.warn('[blueprint] _buildStudioRequest unavailable on this host; payload requires studio.html (Draft).');
      return null;
    }
    var base = global._buildStudioRequest();
    if (!base) return null;
    if (bp && bp.profile && bp.profile.co_architect_enabled && bp.profile.co_architect_dob) {
      var m = String(bp.profile.co_architect_dob).match(/(\d{1,2})\s*\/\s*(\d{4})/);
      if (m) {
        var coYr = +m[2], coMo = +m[1];
        var now  = new Date();
        var coAge = now.getFullYear() - coYr;
        if (now.getMonth() + 1 < coMo) coAge--;
        if (coAge >= 18 && coAge <= 100) base.co_architect_age = coAge;
      }
    }
    return base;
  }

  /* bind — wires Studio Draft DOM inputs to debounced auto-commit into
   * sessionStorage. Each lookup guarded — same code path on stub hosts
   * harmlessly finds no elements and does nothing. */
  function bind(opts) {
    opts = opts || {};
    var bp = opts.blueprint || load();
    var debounceMs = opts.debounceMs || 350;

    var commit = (function () {
      var t = null;
      return function () {
        if (t) clearTimeout(t);
        t = setTimeout(function () {
          captureDOM(bp);
          var gf = computeGrossFunding(bp);
          bp.datum.gross_funding_need      = gf.gross;
          bp.datum.gross_funding_breakdown = gf.breakdown;
          writeSessionDraft(bp);
          d1WriteStudio(bp);           // P3 — additive; coarse-debounced inside DatumD1 (~1.5s)
        }, debounceMs);
      };
    }());

    var inputIds  = ['primary-name', 'co-name', 'pri-dob', 'target-ret',
                     'plan-end-age', 'spend-input',
                     'bp-portfolio-total', 'bp-contributions-total',
                     'ss-pri-62', 'ss-pri-67', 'ss-pri-70',
                     'ss-sec-62', 'ss-sec-67', 'ss-sec-70'];
    var changeIds = ['co-arch-toggle'];

    inputIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', commit);
    });
    changeIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', commit);
    });

    document.querySelectorAll('.climate-option').forEach(function (el) {
      el.addEventListener('click', commit);
    });
    document.querySelectorAll('.ss-btn, .ss-sec-btn').forEach(function (el) {
      el.addEventListener('click', commit);
    });

    captureDOM(bp);
    return bp;
  }

  var OUTLOOK_LABEL_TO_ENUM = {
    'History Repeats':   'history_repeats',
    'Valuations Matter': 'valuations_matter',
    'Cautious':          'cautious',
    'Optimistic':        'optimistic',
    'Custom Matrix':     'custom'
  };
  var SS_LABEL_TO_ENUM = { '62': 'early_62', '67': 'full_67', '70': 'optimal_70' };

  function moneyToInt(v) {
    return parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0;
  }

  // U2 — canonical MONTHLY OVERHEAD producers (single source of the Layer-1 "O" term; S4 reads
  // these). NOTE: this is the budgeting overhead total, NOT the Shape floor — the Shape's
  // Floor/Ceiling/Datum are F93 withdrawal-rate-derived and do NOT react to bills (that wiring is U4).
  var UPKEEP_FREQ_DIV = { monthly: 1, quarterly: 3, annual: 12 };
  function upkeepMonthly(item) {
    if (!item) return 0;
    var amt = Number(item.amount != null ? item.amount : item.cost) || 0; // ?? legacy U1 cost
    return amt / (UPKEEP_FREQ_DIV[item.freq] || 1);
  }
  function upkeepMonthlyTotal(bp, opts) {
    opts = opts || {};                       // opts.asOf reserved for U4/S4 time-dependent schedule
    var items = (bp && bp.upkeep && bp.upkeep.items) || [];
    var t = 0; items.forEach(function (it) { t += upkeepMonthly(it); });
    return t;
  }

  function captureDOM(bp) {
    var d = document;
    var v = function (id) { var el = d.getElementById(id); return el ? el.value : ''; };

    var name    = v('primary-name'); if (name) bp.profile.primary_name = name;
    var coName  = v('co-name');      if (coName) bp.profile.co_architect_name = coName;
    var dob     = v('pri-dob');      if (dob)  bp.profile.primary_dob = dob;
    var ret     = v('target-ret');   if (ret)  bp.profile.target_retirement_date = ret;
    // 2A — plan_end_age stays an INTEGER age; read the sl-plan-through slider (the single
    // PTA-age source) since the plan-end-age field is now a DOB-anchored MM/YYYY date mirror.
    var planEl = d.getElementById('sl-plan-through');
    var plan = planEl ? parseInt(planEl.value, 10) : parseInt(v('plan-end-age'), 10);
    if (!isNaN(plan)) bp.profile.plan_end_age = plan;

    var spend = moneyToInt(v('spend-input'));
    if (spend) bp.datum.net_datum_v1 = spend;

    var coT = d.getElementById('co-arch-toggle');
    if (coT) bp.profile.co_architect_enabled = !!coT.checked;

    var portE = d.getElementById('bp-portfolio-total');
    if (portE) bp.portfolio_total = moneyToInt(portE.value);
    var contE = d.getElementById('bp-contributions-total');
    if (contE) bp.contributions_total = moneyToInt(contE.value);

    if (global.state && Array.isArray(global.state.accounts)) {
      // FIX #1 (RC-A) — while the D1 active-doc boot is still pending (global._d1BootPending), an EMPTY
      // live state must NOT clobber rooms already on bp (loaded from D1 / session draft). This is the
      // single write-side chokepoint (protects BOTH writeSessionDraft and the d1WriteStudio thunk).
      // Once boot completes and clears the flag, behavior is UNCHANGED — an intentional "delete all
      // rooms" (empty state, no boot pending) still empties bp. Absent flag (node gates) => today's path.
      var _incoming = global.state.accounts;
      if (!global._d1BootPending || _incoming.length || !(bp.accounts && bp.accounts.length)) {
        bp.accounts = _incoming.slice();
      }
    }

    var act = d.querySelector('.climate-option.active');
    if (act && act.dataset && act.dataset.outlook) {
      bp.climate.outlook = OUTLOOK_LABEL_TO_ENUM[act.dataset.outlook] || bp.climate.outlook;
      if (bp.climate.outlook === 'custom') {
        var weights = Array.prototype.map.call(d.querySelectorAll('.c-weight'),
          function (el) { return parseFloat(el.value) || 0; });
        if (weights.length === 4) {
          bp.climate.custom_weights = {
            bootstrap: weights[0] / 100, parametric: weights[1] / 100,
            regime:    weights[2] / 100, cape:        weights[3] / 100
          };
        }
      } else {
        bp.climate.custom_weights = null;
      }
    }

    var ssAct = d.querySelector('.ss-btn.active strong');
    if (ssAct) bp.ss.strategy_primary = SS_LABEL_TO_ENUM[ssAct.textContent.trim()] || bp.ss.strategy_primary;
    var ssSecAct = d.querySelector('.ss-sec-btn.active strong');
    if (ssSecAct) bp.ss.strategy_secondary = SS_LABEL_TO_ENUM[ssSecAct.textContent.trim()] || bp.ss.strategy_secondary;

    bp.ss.pri_overrides_monthly = {
      v62: moneyToInt(v('ss-pri-62')),
      v67: moneyToInt(v('ss-pri-67')),
      v70: moneyToInt(v('ss-pri-70'))
    };
    bp.ss.sec_overrides_monthly = {
      v62: moneyToInt(v('ss-sec-62')),
      v67: moneyToInt(v('ss-sec-67')),
      v70: moneyToInt(v('ss-sec-70'))
    };

    // 05/ Market Conditions toggle (the user-facing "climate" paradigm) + inflation mode.
    // seedFromBlueprint already restores these radios from bp, but capture was the gap:
    // without reading them here they stayed at the schema defaults on every Studio save.
    var mkt = d.querySelector('input[name="market"]:checked');
    if (mkt && mkt.value) bp.market_paradigm = mkt.value;
    var infl = d.querySelector('input[name="inflation"]:checked');
    if (infl && infl.value) bp.inflation_mode = infl.value;

    // Operating Upkeep (Lifestyle Engine · Layer-1 "O" term) — U2 captures the canonical
    // IN-MEMORY model (NOT a DOM-scrape: rich fields aren't all visible inputs). Single-source
    // so S4/Datum-Builder READ bp.upkeep, never recompute (§16.1). Totals MONTHLY-normalized via
    // upkeepMonthlyTotal (canonical period = monthly; U3 display toggle is pure presentation).
    function _serUpk(it) {
      return { name: it.name || '', amount: (it.amount != null ? it.amount : it.cost) || 0,
        freq: it.freq || 'monthly', category: it.category || 'essential', endDate: it.endDate || '',
        endsAtRet: !!it.endsAtRet, tag: it.tag || 'autopay', note: it.note || '' };
    }
    if (global._getUpkeepModel) {
      var _um = global._getUpkeepModel();
      bp.upkeep.items   = (_um.items   || []).map(_serUpk);
      bp.upkeep.charity = (_um.charity || []).map(_serUpk);
      bp.upkeep.upkeep_total  = upkeepMonthlyTotal(bp);
      bp.upkeep.charity_total = (bp.upkeep.charity || []).reduce(function (s, it) { return s + upkeepMonthly(it); }, 0);
    }

    // A (#288) — stamp Net Worth (assets − debts) at capture time via the studio host hook, where the
    // base-type taxCode classifier (getBaseType) lives — same host-hook pattern as _getUpkeepModel above.
    // The Blueprint card reads bp.datum.net_worth; investableTotal (LOCK-3) stays untouched. Absent hook
    // (node gates / stub hosts) -> left unset -> the card shows '—' until the plan is re-saved.
    if (typeof global._computeNetWorth === 'function' && bp.datum) {
      try { bp.datum.net_worth = global._computeNetWorth(bp.accounts); } catch (_e) {}
    }
  }

  global.DatumBlueprint = {
    SCHEMA:           SCHEMA,
    VERSION:          VERSION,
    'new':            newBlueprint,
    load:             load,
    bind:             bind,
    save:             save,
    toEnginePayload:  toEnginePayload,
    slimSlotForClerk: slimSlotForClerk,
    toD1Document: toD1Document,
    d1WriteStudio: d1WriteStudio,
    d1WriteBlueprint: d1WriteBlueprint,
    hydrateAccountNames: hydrateAccountNames,
    remirrorArchive:  remirrorArchive,
    computeGrossFunding: computeGrossFunding,
    investableTotal:  investableTotal,
    accountWeights:   accountWeights,
    upkeepMonthly:      upkeepMonthly,
    upkeepMonthlyTotal: upkeepMonthlyTotal,
    captureDOM:       captureDOM,
    mmYYYY:           mmYYYY,
    retDateFromAge:   retDateFromAge,
    workState:        workState,
    _internal: {
      readDossier:    readDossier,
      readSketchSlot: readSketchSlot,
      readSlot:       readSlot,
      writeSlot:      writeSlot,
      writeSessionDraft: writeSessionDraft,
      readSessionDraft:  readSessionDraft,
      clearDraft:        clearDraft,
      isDraftStale:      _draftIsStale,
      pendingStaleDraft: pendingStaleDraft,
      acceptStaleDraft:  acceptStaleDraft,
      draftWriteOk:      function () { return _draftWriteOk; },
      siblingHold:       siblingHold,
      tabId:             function () { return TAB_ID; },
      DRAFT_STALE_MS:    DRAFT_STALE_MS
    }
  };
}(typeof window !== 'undefined' ? window : this));
