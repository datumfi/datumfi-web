/* datum-archive-codec.js — Datum FI cross-device archive codec v1
 *
 * Purpose
 *   Compact + compress the 4-slot Blueprint archive and the 4-slot Sketchbook
 *   into version-prefixed base64 blobs small enough to mirror into Clerk
 *   unsafeMetadata as the cross-device source of truth (localStorage stays the
 *   readable local truth; the Clerk blob is the cache that rebuilds LS on a new
 *   device). compact-before-compress is what makes it fit:
 *
 *     raw 4-slot Blueprint archive (4x heavy rooms) ......... ~19,961 B  (busts cap)
 *     naive lz-string base64, no compaction ................ ~6,856 B   (fails 6KB guard)
 *     COMPACT (positional arrays, flags bitmask) + base64 .. ~4,057 B   (this codec)
 *
 *   base64 output is all-ASCII, so byte-count == char-count — the blob size is
 *   immune to the Clerk "chars vs UTF-8 bytes" cap-measurement ambiguity. We do
 *   NOT use compressToUTF16 for exactly this reason (denser, but multi-byte).
 *
 * SHARED-HEADROOM ASSUMPTION (read before changing field sets)
 *   unsafeMetadata has a hard 8192 B cap SHARED across { dossier, workspaceName,
 *   sketchbook(_z), blueprint(_z) }. Proven worst-case total = ~5,426 B, leaving
 *   ~2,766 B margin — but that margin is shared with dossier/workspaceName, which
 *   can grow independently. Therefore every write goes through the runtime guard
 *   wouldFit()/safeMerge() below: a write that would exceed CAP fails GRACEFULLY
 *   (caller keeps localStorage as truth + warns) and NEVER silently truncates.
 *
 * Versioning
 *   Every blob is "<VERSION><base64>" (1-char version prefix) AND carries v:N in
 *   the compact object, so the format is upgradeable from day one. decode() reads
 *   the prefix and dispatches; unknown versions return null (caller falls back to
 *   localStorage truth rather than crashing).
 *
 * Invariants
 *   - Lossless against the SLIM slot shapes (slimSlotForClerk / _slimSlot): every
 *     field those mirrors keep must round-trip. Regenerable constants (schema,
 *     version string) are restored on decode, not stored.
 *   - null slots stay null (empty archive sheets).
 *   - Numbers/strings only; no chart artifacts.
 */
(function (global) {
  'use strict';

  var VERSION = 1;
  var CAP     = 8192;

  var LZ = (typeof module !== 'undefined' && module.exports)
    ? require('./lz-string.min.js')
    : global.LZString;

  /* ---- byte-accurate sizing (conservative: UTF-8 bytes, not UTF-16 chars) ---- */
  function byteLen(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
    if (typeof Buffer !== 'undefined')      return Buffer.byteLength(str, 'utf8');
    // last-resort manual UTF-8 count
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
    }
    return n;
  }

  /* ---- Blueprint slot <-> compact ---- */
  // account positional order (v1 — append-only; never reorder):
  //   [id, baseId, value, inflow, freq, intRate, cola, linkedAssetId, flags, trustType,
  //    disbursement, holdings[11], erOverride[12], volOverride[13]]
  // flags bitmask: exclude=1, useRule55=2, isFriction=4, isPriority=8
  // [11] holdings = array of compact-ESSENTIALS positional arrays (STEP A (c), 2026-07-08 — the
  //      13 real-position fields; the 8 provenance/source fields + priceSource are NOT stored
  //      (blank-until-re-sourced, L47). [12]/[13] = account-level E[r]/Vol overrides (§7 ruling).
  // holding positional order (append-only): [ticker, name, price, shares, costBasis,
  //   acquisitionDate, beta, dividendYield, expRatio, geography, sector, assetClass, instrumentType]
  function cHolding(h) {
    return [h.ticker || 0, h.name || 0, h.price || 0, h.shares || 0, h.costBasis || 0,
            h.acquisitionDate || 0, h.beta || 0, h.dividendYield || 0, h.expRatio || 0,
            h.geography || 0, h.sector || 0, h.assetClass || 0, h.instrumentType || 0];
  }
  function dHolding(r) {
    return { ticker: r[0] || '', name: r[1] || '', price: r[2] || '', shares: r[3] || '',
             costBasis: r[4] || '', acquisitionDate: r[5] || '', beta: r[6] || '',
             dividendYield: r[7] || '', expRatio: r[8] || '', geography: r[9] || '',
             sector: r[10] || '', assetClass: r[11] || '', instrumentType: r[12] || '' };
  }
  function cAcct(a) {
    var f = (a.exclude ? 1 : 0) | (a.useRule55 ? 2 : 0) | (a.isFriction ? 4 : 0) | (a.isPriority ? 8 : 0);
    return [a.id, a.baseId, a.value || 0, a.inflow || 0, a.freq || 12,
            a.intRate || 0, a.cola || 0, a.linkedAssetId || 0, f,
            a.trustType || 0, a.disbursement || 0,
            (a.holdings && a.holdings.length) ? a.holdings.map(cHolding) : 0,
            a.erOverride || 0, a.volOverride || 0];
  }
  function dAcct(r) {
    var o = { id: r[0], baseId: r[1], value: r[2], inflow: r[3], freq: r[4] };
    if (r[5]) o.intRate = r[5];
    if (r[6]) o.cola = r[6];
    if (r[7]) o.linkedAssetId = r[7];
    if (r[8] & 1) o.exclude = true;
    if (r[8] & 2) o.useRule55 = true;
    if (r[8] & 4) o.isFriction = true;
    if (r[8] & 8) o.isPriority = true;
    if (r[9]) o.trustType = r[9];
    if (r[10]) o.disbursement = r[10];
    if (r[11]) o.holdings = r[11].map(dHolding);
    if (r[12]) o.erOverride = r[12];
    if (r[13]) o.volOverride = r[13];
    return o;
  }
  /* ⛔ ABSENT IS NOT ZERO, AND IT IS NOT A DEFAULT (§82.1668). A blob written before schema 1.1.0
   * has SHORTER positional arrays, so an appended slot reads `undefined`. That blob genuinely does
   * not contain the user's salary — and the honest restoration of a value we never stored is
   * NOTHING. Decoding it to `0` or `''` would manufacture an answer nobody gave and make it
   * indistinguishable from one they did, which is the §82.1625 mechanism exactly.
   *   _uN — appended NUMBER slot: missing => undefined (absent), else the number.
   *   _uS — appended STRING slot: missing => undefined (absent). A present slot holding the
   *         encoder's `0` is the compression token for "empty", so it restores to '' — that is
   *         what the store actually held, not a guess.
   * ⚠️ Slots 0-N of every array predate this and keep their original raw reads: changing them would
   *    alter how EXISTING blobs decode, which is a different and much larger blast radius. */
  function _uN(v) { return v === undefined ? undefined : v; }
  function _uS(v) { return v === undefined ? undefined : (v === 0 ? '' : v); }

  function cBlueprint(s) {
    if (!s) return 0;
    var p = s.profile || {}, ss = s.ss || {}, inc = s.income || {},
        cl = s.climate || {}, tx = s.tax || {}, up = s.upkeep || {}, dt = s.datum || {};
    var pri = ss.pri_overrides_monthly || {}, sec = ss.sec_overrides_monthly || {};
    var cw = cl.custom_weights;
    return {
      /* ⛔⛔ THE BLUEPRINT'S SCHEMA VERSION, CARRIED — NOT STAMPED (2026-09-05). dBlueprint() used to
         hard-code `version: '1.0.1'`, which was true when it was written and has been false since
         1.1.0 shipped. That is NOT this codec's own format version: THAT ALREADY EXISTS as `VERSION`
         at :42 — the blob's leading character and `v:` in the envelope, validated on decode at :224.
         Two different things wearing one word.
         ⛔ AND IT WAS NOT A LABELLING DEFECT. studio-blueprint.js:1381 gates a MIGRATION on
            `draft.version !== VERSION` that rewrites net_datum_v1 120000 -> 100000 and
            working_year_effective_rate 0.22 -> 0.20. A blueprint that permanently claims 1.0.1 reads
            as stale, so a user who genuinely chose a 22% rate could have it silently rewritten to
            20% — THE PRODUCT OVERWRITING AN ANSWER THE USER GAVE WITH ONE THEY DID NOT.
         🔑 A STALE VERSION STAMP IS MORE DANGEROUS THAN AN ABSENT ONE: absence reads as unanswered,
            a frozen stamp ACTIVELY ASSERTS A FALSEHOOD THAT MIGRATION LOGIC OBEYS.
         ⚠️ HARD-CODING '1.1.0' WOULD HAVE BEEN THE SAME BUG AT A FRESHER VALUE. The value was never
            the problem; the hard-code was. A pre-`sv` blob decodes to ABSENT, not to a plausible
            version — we do not know what it held, and old blobs keep today's migrate-once behaviour
            rather than gaining a fabricated stamp. */
      b: s.blueprint_id || 0, t: s.saved_at || 0, sv: s.version || 0,
      /* APPENDED for schema 1.1.0 (slots 8-11) — append-only, per the convention documented at
         cSketch below. Slots 0-7 must never be reordered: an old blob is read positionally. */
      P: [p.primary_name || '', p.co_architect_name || '', p.primary_dob || '',
          p.co_architect_dob || '', p.target_retirement_date || '',
          p.co_architect_retirement_date || '', p.plan_end_age || 0, p.co_architect_enabled ? 1 : 0,
          p.plan_end_date || '', p.primary_salary || 0, p.co_architect_salary || 0,
          p.co_architect_plan_end_date || ''],
      A: (s.accounts || []).map(cAcct),
      ct: s.contributions_total || 0, pt: s.portfolio_total || 0,
      S: [ss.strategy_primary || 0, ss.strategy_secondary || 0,
          pri.v62 || 0, pri.v67 || 0, pri.v70 || 0, sec.v62 || 0, sec.v67 || 0, sec.v70 || 0],
      I: [inc.pension_primary_annual || 0, inc.pension_secondary_annual || 0],
      C: [cl.outlook || 0, cw ? [cw.bootstrap, cw.parametric, cw.regime, cw.cape] : 0],
      /* APPENDED for schema 1.1.0 (slots 3-7) — the tax METHOD plus the four co-architect mirrors. */
      T: [tx.filing || 0, tx.location || 0, tx.working_year_effective_rate || 0,
          tx.method || 0, tx.co_method || 0, tx.co_filing || 0, tx.co_location || 0,
          tx.co_working_year_effective_rate || 0],
      U: [up.upkeep_total || 0, up.charity_total || 0],
      D: [dt.net_datum_v1 || 0, dt.gross_funding_need || 0, dt.derived_from || 'quick']
    };
  }
  function dBlueprint(c) {
    if (!c) return null;
    return {
      schema: 'DatumFIBlueprintV1', blueprint_id: c.b || null, saved_at: c.t || null, version: _uS(c.sv),
      profile: {
        primary_name: c.P[0], co_architect_name: c.P[1], primary_dob: c.P[2],
        co_architect_dob: c.P[3], target_retirement_date: c.P[4],
        co_architect_retirement_date: c.P[5], plan_end_age: c.P[6], co_architect_enabled: !!c.P[7],
        plan_end_date: _uS(c.P[8]), primary_salary: _uN(c.P[9]),
        co_architect_salary: _uN(c.P[10]), co_architect_plan_end_date: _uS(c.P[11])
      },
      accounts: (c.A || []).map(dAcct),
      contributions_total: c.ct, portfolio_total: c.pt,
      ss: {
        strategy_primary: c.S[0], strategy_secondary: c.S[1],
        pri_overrides_monthly: { v62: c.S[2], v67: c.S[3], v70: c.S[4] },
        sec_overrides_monthly: { v62: c.S[5], v67: c.S[6], v70: c.S[7] }
      },
      income: { pension_primary_annual: c.I[0], pension_secondary_annual: c.I[1] },
      climate: { outlook: c.C[0], custom_weights: c.C[1]
        ? { bootstrap: c.C[1][0], parametric: c.C[1][1], regime: c.C[1][2], cape: c.C[1][3] } : null },
      tax: { filing: c.T[0], location: c.T[1], working_year_effective_rate: c.T[2],
             method: _uS(c.T[3]), co_method: _uS(c.T[4]), co_filing: _uS(c.T[5]),
             co_location: _uS(c.T[6]), co_working_year_effective_rate: _uN(c.T[7]) },
      upkeep: { upkeep_total: c.U[0], charity_total: c.U[1] },
      datum: { net_datum_v1: c.D[0], gross_funding_need: c.D[1], derived_from: c.D[2] }
    };
  }

  /* ---- Sketch slot <-> compact ---- */
  // positional order (v1 — append-only): [age, retire_age, portfolio_mass, contributions,
  //   datum_spend, designed_ceil, designed_floor, resolved_state, date_stamped, time_stamped,
  //   s1_datum, s1_ceil, s1_floor, s1_resolved_state, s2_design[10]|0,
  //   market_outlook, tax_rate, inflation_mode, plan_end_age, status(19)]
  function cSketch(s) {
    if (!s) return 0;
    var d = s.s2_design;
    return [s.age || 0, s.retire_age || 0, s.portfolio_mass || 0, s.contributions || 0, s.datum_spend || 0,
            s.designed_ceil || 0, s.designed_floor || 0, s.resolved_state || '', s.date_stamped || '', s.time_stamped || '',
            s.s1_datum || 0, s.s1_ceil || 0, s.s1_floor || 0, s.s1_resolved_state || '',
            d ? [d.ceilDelta || 0, d.floorDelta || 0, d.datumDelta || 0, d.portDelta || 0, d.age || 0,
                 d.retire || 0, d.planThroughAge || 0, d.port || 0, d.datum || 0, d.contrib || 0] : 0,
            s.market_outlook || 0, s.tax_rate || 0, s.inflation_mode || 0, s.plan_end_age || 0, s.status || 0];
  }
  function dSketch(r) {
    if (!r) return null;
    var d = r[14];
    // Rebuild keys in the SAME order as _slimSlot (sketch.html) so a decoded slot is
    // byte-identical to the original on re-stringify — s2_design sits between
    // s1_resolved_state and market_outlook, not appended at the end.
    var o = {
      age: r[0], retire_age: r[1], portfolio_mass: r[2], contributions: r[3], datum_spend: r[4],
      designed_ceil: r[5], designed_floor: r[6], resolved_state: r[7]
    };
    // status sits between resolved_state and date_stamped (mirrors _slimOne). Only emit it
    // when present so legacy slots (no status) stay byte-identical on re-stringify.
    if (r[19]) o.status = r[19];
    o.date_stamped = r[8]; o.time_stamped = r[9];
    o.s1_datum = r[10]; o.s1_ceil = r[11]; o.s1_floor = r[12]; o.s1_resolved_state = r[13];
    if (d) o.s2_design = {
      ceilDelta: d[0], floorDelta: d[1], datumDelta: d[2], portDelta: d[3], age: d[4],
      retire: d[5], planThroughAge: d[6], port: d[7], datum: d[8], contrib: d[9]
    };
    o.market_outlook = r[15]; o.tax_rate = r[16]; o.inflation_mode = r[17]; o.plan_end_age = r[18];
    return o;
  }

  /* ---- encode / decode (version-prefixed base64) ---- */
  function encode(compactObj) {
    return String(VERSION) + LZ.compressToBase64(JSON.stringify(compactObj));
  }
  function decode(blob) {
    if (typeof blob !== 'string' || !blob.length) return null;
    var ver = parseInt(blob.charAt(0), 10);
    if (ver !== VERSION) return null;           // unknown version -> caller falls back to LS truth
    try { return JSON.parse(LZ.decompressFromBase64(blob.slice(1))); }
    catch (_e) { return null; }
  }

  function encodeBlueprintArchive(arch) {
    arch = arch || {};
    return encode({ v: VERSION, s1: cBlueprint(arch.slot1), s2: cBlueprint(arch.slot2),
                    s3: cBlueprint(arch.slot3), s4: cBlueprint(arch.slot4) });
  }
  function decodeBlueprintArchive(blob) {
    var c = decode(blob); if (!c) return null;
    return { slot1: dBlueprint(c.s1), slot2: dBlueprint(c.s2), slot3: dBlueprint(c.s3), slot4: dBlueprint(c.s4) };
  }

  /* Graceful-degrade encoder (STEP A (c) safety valve — Captain ruling 2026-07-08). The Clerk
   * 8192B cap CANNOT hold a heavy multi-blueprint lifetime portfolio (172 holdings is real) — a
   * proper backend is the actual fix; this valve just guarantees a heavy save never corrupts and
   * always keeps the ACTIVE blueprint's holdings. Order: encode the whole slim archive; if it fits
   * blueprintZBudget, done; else shed holdings from NON-active slots, OLDEST saved_at first, until it
   * fits. NEVER mutates the caller's archive (works on a deep copy — localStorage stays truth).
   * Returns { blob, shed:[blueprint_id...], fit:bool }; fit:false = still over budget even after
   * shedding all older-slot holdings (caller keeps LS truth, does not write — never truncates active). */
  function encodeArchiveWithDegrade(slimArch, activeId, blueprintZBudget) {
    var work = JSON.parse(JSON.stringify(slimArch || {}));
    var keys = ['slot1', 'slot2', 'slot3', 'slot4'], shed = [];
    var blob = encodeBlueprintArchive(work);
    if (byteLen(blob) <= blueprintZBudget) return { blob: blob, shed: shed, fit: true };
    var older = keys.filter(function (k) { return work[k] && work[k].blueprint_id !== activeId; })
                    .sort(function (a, b) { return String(work[a].saved_at) < String(work[b].saved_at) ? -1 : 1; });
    for (var i = 0; i < older.length && byteLen(blob) > blueprintZBudget; i++) {
      (work[older[i]].accounts || []).forEach(function (a) { if (a.holdings) delete a.holdings; });
      shed.push(work[older[i]].blueprint_id);
      blob = encodeBlueprintArchive(work);
    }
    return { blob: blob, shed: shed, fit: byteLen(blob) <= blueprintZBudget };
  }
  function encodeSketchbook(book) {
    book = book || {};
    return encode({ v: VERSION, t: book.sketchbook_title || '',
      s: [cSketch(book.slot_1), cSketch(book.slot_2), cSketch(book.slot_3), cSketch(book.slot_4)] });
  }
  function decodeSketchbook(blob) {
    var c = decode(blob); if (!c) return null;
    var s = c.s || [];
    return { sketchbook_title: c.t || '',
      slot_1: dSketch(s[0]), slot_2: dSketch(s[1]), slot_3: dSketch(s[2]), slot_4: dSketch(s[3]) };
  }

  /* ---- shared-headroom runtime guard ----
   * wouldFit: does merging {key:value} into existingMeta stay <= CAP (UTF-8 bytes)?
   * safeMerge: returns { ok, bytes, merged }. On !ok the caller must keep LS as the
   * truth and warn — NEVER write a truncated blob. */
  function wouldFit(existingMeta, key, value) {
    var merged = {};
    var src = existingMeta || {};
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) merged[k] = src[k];
    merged[key] = value;
    var bytes = byteLen(JSON.stringify(merged));
    return { ok: bytes <= CAP, bytes: bytes, merged: merged };
  }
  function safeMerge(existingMeta, patch) {
    var merged = {};
    var src = existingMeta || {};
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) merged[k] = src[k];
    for (var p in patch) if (Object.prototype.hasOwnProperty.call(patch, p)) merged[p] = patch[p];
    var bytes = byteLen(JSON.stringify(merged));
    return { ok: bytes <= CAP, bytes: bytes, merged: merged };
  }

  var API = {
    VERSION: VERSION, CAP: CAP, byteLen: byteLen,
    encodeBlueprintArchive: encodeBlueprintArchive, decodeBlueprintArchive: decodeBlueprintArchive,
    encodeArchiveWithDegrade: encodeArchiveWithDegrade,
    encodeSketchbook: encodeSketchbook, decodeSketchbook: decodeSketchbook,
    wouldFit: wouldFit, safeMerge: safeMerge,
    _internal: { cBlueprint: cBlueprint, dBlueprint: dBlueprint, cSketch: cSketch, dSketch: dSketch, encode: encode, decode: decode }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else global.DatumArchiveCodec = API;
}(typeof window !== 'undefined' ? window : this));
