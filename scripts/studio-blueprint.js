/* studio-blueprint.js — Datum FI Studio Blueprint contract v1.0
 *
 * Responsibilities:
 *   1. Define the serializable Blueprint object (single source of truth across
 *      the 5 Studio pages: Draft, Remodel, Tension, Uncertainty, Measurement).
 *   2. Three-tier persistence: sessionStorage draft + localStorage archive +
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
    tradira:    'traditional', tradira_co:    'traditional',
    roth401k:   'roth',        roth401k_co:   'roth',
    roth457b:   'roth',        roth457b_co:   'roth',
    rothira:    'roth',        rothira_co:    'roth',
    taxable:    'taxable',
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
        if (a.trustType    && a.trustType    !== 'Irrevocable')   out.trustType    = a.trustType;
        if (a.disbursement && a.disbursement !== 'Discretionary') out.disbursement = a.disbursement;
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
  function investableTotal(bp) {
    var INVEST = { roth: true, taxable: true, traditional: true };
    return (((bp && bp.accounts) || [])).reduce(function (sum, a) {
      var bucket = BASE_TO_BUCKET[a && a.baseId];
      if (bucket && INVEST[bucket] && !(a && a.exclude)) sum += Number(a.value) || 0;
      return sum;
    }, 0);
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
  function readSessionDraft() {
    try { var raw = sessionStorage.getItem(SESSION_DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
    catch (_e) { return null; }
  }
  function writeSessionDraft(bp) {
    try { sessionStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(bp)); } catch (_e) {}
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
        if (!res.ok) {
          console.warn('[blueprint mirror] over 8192B cap; kept LS truth + legacy key, did NOT write:', res.bytes);
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
    if (!bp.accounts || !bp.accounts.length) {
      try { var _prev = readSessionDraft(); if (_prev && _prev.accounts && _prev.accounts.length) bp.accounts = _prev.accounts; } catch (_e) {}
    }
    var gf = computeGrossFunding(bp);
    bp.datum.gross_funding_need      = gf.gross;
    bp.datum.gross_funding_breakdown = gf.breakdown;
    writeSessionDraft(bp);
    return bp;
  }

  function load(opts) {
    opts = opts || {};
    var bp = newBlueprint();

    try {
      var params = new URLSearchParams(global.location.search);
      var id     = parseInt(params.get('id'), 10);
      var mode   = params.get('hydrate');
      if (id && mode === 'blueprint') {
        var slot = readSlot(id);
        if (slot) { Object.assign(bp, slot); return finishLoad(bp, 'blueprint-slot:' + id); }
      }
      if (id && mode === 'sketch') {
        applySketchContract(bp, readSketchSlot(id));
        applyDossier(bp, readDossier());
        return finishLoad(bp, 'sketch-contract:' + id);
      }
    } catch (_e) {}

    var draft = readSessionDraft();
    if (draft && !opts.ignoreDraft) {
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

  function save(bp, opts) {
    opts = opts || {};
    var slotId = opts.slot || 1;
    bp.saved_at = new Date().toISOString();
    if (!bp.blueprint_id) bp.blueprint_id = generateUUID();
    var gf = computeGrossFunding(bp);
    bp.datum.gross_funding_need      = gf.gross;
    bp.datum.gross_funding_breakdown = gf.breakdown;
    writeSlot(slotId, bp);
    writeSessionDraft(bp);
    mirrorToClerk(bp, opts.done);
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
      bp.accounts = global.state.accounts.slice();
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
    remirrorArchive:  remirrorArchive,
    computeGrossFunding: computeGrossFunding,
    investableTotal:  investableTotal,
    upkeepMonthly:      upkeepMonthly,
    upkeepMonthlyTotal: upkeepMonthlyTotal,
    captureDOM:       captureDOM,
    mmYYYY:           mmYYYY,
    retDateFromAge:   retDateFromAge,
    _internal: {
      readDossier:    readDossier,
      readSketchSlot: readSketchSlot,
      readSlot:       readSlot,
      writeSlot:      writeSlot,
      writeSessionDraft: writeSessionDraft,
      readSessionDraft:  readSessionDraft
    }
  };
}(typeof window !== 'undefined' ? window : this));
