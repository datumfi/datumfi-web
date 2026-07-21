# Plan #3 — Clerk → D1 Backfill (the finale)

**Status:** DRAFT for Captain sign-off. **NO code, NO write until signed.**
**Baseline:** origin/main = `cc160ad` (local == remote, clean tree). Real-open bug count = 0. #5 parked behind this.
**Author:** fresh-start Claude, 2026-07-17. Grounded in the real wire (`datum-d1.js`, `documents-core.js`, `studio-blueprint.js`, `datum-archive-codec.js`), not memory.

---

## 0. The one-line thesis (and the honest doubt)

L51 (reachable-empty D1 is authoritative) means a D1 read no longer resurrects Clerk-only data. So any blueprint/sketch that lives ONLY in the Clerk mirror (`blueprint_z` / `sketchbook_z`) and was **never re-saved after D1 went live** is now **invisible**. #3 migrates those Clerk-only docs into D1.

**The honest doubt, stated up front:** Daniel is the only user and has been actively saving under CUTOVER=true for days. His real blueprints are almost certainly *already in D1*. The Clerk-only remainder may be **empty `n_rooms:0` ghosts** — dead pre-D1 husks that should stay dead. **If that's what the measure step finds, the value of #3 is the CODE PATH robustness, not data recovery, and we do NOT build a heavy migration to recover nothing.** We prove the data is worth migrating *before* writing a single migration line. That is the whole point of the phased cadence below.

---

## (a) MEASURE FIRST — read-only dry-run, ZERO writes

A backfill we can't measure is a backfill we can't trust. Before any write we enumerate, count, and inspect the Clerk-only doc_keys.

**Where it runs:** in Daniel's **authenticated browser console** on datumfi.com. This is non-negotiable and by design — the enumeration needs (1) a live Clerk JWT to call `/api/documents?list=1`, and (2) `Clerk.user.unsafeMetadata` to read `blueprint_z`/`sketchbook_z`. Neither exists in the dev/CLI environment, and we will not introduce a Clerk secret key to read it server-side. **Measuring in the real authenticated context is the correct, safe design — not a limitation.**

**The instrument** (read-only; `listDocs` + `getDoc` + decode only — no `putDoc`, no `deleteDoc`): see `plan-3-measure-instrument.js` in this repo. Run it on **`/studio`** — the one page that loads BOTH `datum-d1.js` and `datum-archive-codec.js` (verified: `studio.html:13313-13314`). It:
1. Decodes `Clerk.user.unsafeMetadata.blueprint_z` → up to 4 slim slots, collects each `blueprint_id`.
2. Decodes `...sketchbook_z` → up to 4 slots, collects each `sketch_id`.
3. `DatumD1.listDocs('blueprint')` and `listDocs('sketchbook')` → the set of doc_keys already in D1.
4. **Diffs** → the Clerk-ONLY keys (present in the mirror, absent from D1).
5. For each Clerk-only key, INSPECTS the decoded slot: `n_rooms` (accounts length), whether `holdings` survived, `saved_at`, byte size, title/label.
6. Prints a table + a verdict line: `CLERK-ONLY blueprints: N (M non-empty, K ghosts)`.

**Output = the dry-run report.** Daniel reviews it. Decision gate:
- **All Clerk-only keys are `n_rooms:0` ghosts** → close #3 as "no data to recover"; the L51 robustness is already shipped; we do NOT build the migration. (Optionally add a tiny gate proving net-as-read-fallback is robust, then done.)
- **Some Clerk-only keys are real (non-empty)** → proceed to build the migration for exactly those keys, at the fidelity the mirror preserved (see (b)).

I cannot fill in the numbers from the CLI — they are Daniel's, in his session. Deliverable is the instrument + the report template; Daniel runs one paste and we read the result together.

---

## (b) FIDELITY HONESTY — accepted-lossy, named up front

The Clerk mirror is the **SLIM** encoding, and over the 8192-byte cap `encodeArchiveWithDegrade` **sheds holdings** from non-active slots (oldest `saved_at` first). Therefore:

- A Clerk-only blueprint that was **small** → backfills at essentially full fidelity.
- A Clerk-only blueprint that was **large / over-cap** → its `holdings`/tickers were **already dropped at mirror time**. Backfilling it recovers a **DEGRADED** version: rooms and totals, but not the per-account holdings/tickers.

**We do not imply full recovery.** The report flags each Clerk-only key as `fidelity: full | degraded(holdings-shed)`. A degraded recovery is still strictly better than an invisible blueprint, but Daniel decides per-key whether a degraded husk is worth resurrecting or should stay retired. **No silent lossy restore.**

---

## (c) CONFLICT RULE — "D1 WINS IF PRESENT"

- Backfill **ONLY Clerk-only keys** (in the mirror, absent from D1). Never touch a key D1 already has.
- **Never overwrite a D1 doc with an older Clerk version.** If `blueprint_id X` exists in D1, it is authoritative — skip it, full stop, even if the Clerk copy looks different.
- **Upsert by the EXISTING `blueprint_id` / `sketch_id`.** These are the D1 `doc_key`s (`documents-core.js`: blueprint→doc_key=blueprint_id, sketchbook→doc_key=sketch_id). We **never mint a new key** — minting would create a duplicate card. The write is a first-insert at revision 1 (`putDoc` with no `ifRevision` → INSERT rev 1) for a key that by definition doesn't yet exist in D1.

---

## (d) IDEMPOTENT + RE-RUNNABLE

- **Skip-if-present** is the core loop: re-list D1 immediately before each write; if the key now exists, skip. A partial run (browser closed mid-way, a network blip) resumes safely on re-run with zero duplicates and zero double-writes.
- The migration is a pure function of (Clerk mirror) minus (current D1 set). Running it twice on a fully-migrated state is a no-op that writes nothing.

---

## (e) CONCURRENCY — no clobber of an in-flight app-save

Two independent guards, belt-and-suspenders:
1. **Idle-only:** run the backfill from a dedicated console paste while NOT actively editing in Studio/Sketch — no autosave debounce in flight.
2. **CAS every write:** each backfill write is a first-insert (`putDoc` with `ifRevision` unset → server INSERTs at rev 1 only if the row is absent; if the row appeared since we listed, the server has it and we skip on the re-list). We never force-write over a revision we didn't read. An in-flight app-save that lands first simply makes the key "present" → we skip it (D1 wins). No lost update possible.

---

## (f) VERIFY — prove no-drop / no-dup, ACCOUNTING FOR REPLICA LAG

After the run:
- Re-list D1 `blueprint` + `sketchbook`; assert every intended Clerk-only key is now present exactly once (no dup), and every pre-existing D1 key is untouched (same revision).
- **D1 READ-REPLICA LAG is real and UNPROVEN-quiet (open gap #1).** A just-written row can be absent from a lagging replica on an immediate read. **Do NOT declare a write failed or a doc missing off a single fast read.** The verify step **re-reads with settle time** (poll up to N seconds / retry) before concluding anything is missing. A row that appears on retry was never lost — it was lag. We bank NO "missing" verdict that hasn't survived a settled re-read.

---

## (g) REVERSIBLE — write a manifest, undo by manifest

- The migration records a **MANIFEST**: for every write it performs, `{type, doc_key, revision_written:1, ts}`, printed to console AND (optionally) stored to a `preferences`/`backfill_manifest` D1 row or copied to a local file by Daniel.
- **Undo = delete-by-manifest**: for each manifest entry, `deleteDoc(type, doc_key)` — but ONLY entries the backfill itself created (revision-written === 1 AND we confirm current revision is still 1, i.e. the user hasn't since edited it into a real doc). If Daniel edited a backfilled blueprint after the run, it's now his real data and the undo skips it. The whole run is cleanly reversible without collateral.

---

## (h) CADENCE — dry-run → review → live, Daniel first

1. **Dry-run** (read-only instrument) → report. **STOP.**
2. Daniel reviews the report. Decision gate (ghosts → close #3; real data → proceed). **STOP for GO.**
3. If GO: build the migration red-first (a gate that reproduces "Clerk-only key invisible after L51", then goes green once backfilled), own commit, never bundled. **STOP for GO on the diff.**
4. **Live run** — Daniel executes the migration in his authenticated session (per-user, him first — he is the only user). Manifest captured.
5. **Verify** with settle/re-read. Report no-drop/no-dup. **STOP.**
6. Only after a clean soak do the Clerk mirrors (`blueprint_z`/`sketchbook_z`) become eligible to retire (Slice 3, FROZEN per #271 — separate ticket, Daniel's alone).

---

## Four carried gaps kept in view
1. **D1 read-after-write / replica lag NOT proven** → drives (f); the verify step is built around it.
2. **#4 signed-out incognito guardrail** — already covered (gate + live pass). No action in #3.
3. **keepalive 64KB cap (#2)** — a very large blueprint could exceed the keepalive PUT limit; a backfill PUT of a big (full-fidelity) doc is a foreground fetch, not an unload-race, so keepalive's cap is less relevant here — but flag if any Clerk-only doc is unusually large. Foreground writes can await completion.
4. **CUTOVER=false rollback under-exercised** — all work done under CUTOVER=true. The backfill is a no-op when CUTOVER=false or signed out (it uses the same DatumD1 client, which the instrument checks). Note but don't gate here.

---

## Laws honored (non-negotiable)
- **RED-FIRST** + **GATE-SPIES-REAL-WIRE** (no seeded happy-path stub — Bug D's false-green lesson).
- **ONE commit, never bundled.**
- **THE FENCE:** prod pushes are Daniel's alone, on explicit GO on the specific diff.
- **VERIFY BY THE CHECK** (`curl -sL` served bytes; `?cb=` doesn't bust CF HTML cache; token that only exists in the new fix, not md5).
- **Two new reflexes:** don't assume D1 read-after-write is instant; **measure before you migrate.**
- **SACRED md5** (studio.html, sketch.html, studio-blueprint.js) — bump pin same commit if touched. #3's instrument touches none of them.

---

---

## MEASURE VERDICT (2026-07-17, Daniel's live authenticated /studio run)

`clerkOnly: []` for BOTH types. **The backfill has zero work.**

| Type | in D1 | in Clerk mirror | overlap (D1 wins) | Clerk-only |
|---|---|---|---|---|
| blueprint | 3 | 3 | 3 | **0** |
| sketchbook | 0 | 0 | 0 | **0** |

All 3 blueprint UUIDs already in D1, all `revision:1`, D1 `updated_at` within ~1s of Clerk `saved_at` = healthy dual-write. **Decision: close the #3 MIGRATION as a no-op / code-robustness closeout.** The value (L51 reachable-empty-authoritative + delete durability) already shipped. No migration code.
Caveat: `holdings_present:false` reflects the Clerk SLIM decode, not D1 (list exposes no payload); moot at clerkOnly=0. Optional read-only `getDoc` pass over the 3 keys available if payload certainty wanted.

---

## SIBLING (the substantive finale work): KILL THE 64KB SAVE-SIZE CEILING

**Two-caps confirmation (against the real wire):**
- **Cap 1 — Clerk 8192B** (`datum-archive-codec.js:43 CAP=8192`): the old metadata cap. D1 KILLS it — `documents-core.js` stores `payload_json` full-fidelity, no cap. Unlimited-storage promise HOLDS. ✅
- **Cap 2 — keepalive 64KB** (spec 65536B, cumulative across in-flight keepalive requests): a BROWSER fetch-transport limit, NOT a D1 storage limit. **CORRECTION to the initial framing:** `datum-d1.js:74` hardcodes `keepalive:true` on EVERY PUT (`:91` every DELETE), so this cap gates ALL D1 writes (autosave `scheduleWrite` + explicit `writeNow`), not just the fast-nav path. Over-cap body → `fetch` rejects TypeError → caught `:79` → `{ok:false}` → **silent D1 write failure on any save**, even staying on the page. The net (LS/Clerk) can't hold >8192B either → a big-enough blueprint persists NOWHERE. Sharpest instance = fast-nav save; general bug = large blueprints silently fail to persist.

**Invariant:** no blueprint is ever undroppable because of its SIZE.

**Fix (off the real code; `sendBeacon` ruled out — also ~64KB, no clean Bearer header):**
1. **Size-aware transport, `putDoc` (`datum-d1.js`, NOT sacred):** `keepalive:true` only when `byteLen(JSON.stringify(body)) <= ~60000`; else `keepalive:false` (uncapped normal fetch). Fixes the stay-on-page big-save silent fail.
2. **Await-before-unload, deliberate save (`studio-blueprint.js`, SACRED):** `writeNow` already returns its promise (`datum-d1.js:130`); `d1WriteBlueprint:443` / `save:753` discard it. Thread it up; on Save→navigate, when payload is large, HOLD nav (brief "Saving…") until it resolves so the non-keepalive fetch completes before unload. Small payloads keep instant keepalive.

**Red-first gate (spies REAL wire, models the REAL browser rejection):** inject `DatumD1._fetch` to REJECT with TypeError when `keepalive===true && byteLen(body)>65536`. Seed a genuine >64KB blueprint, drive the real `save()`→`writeNow`→`putDoc`→fast-nav unload. RED: no PUT lands. GREEN: putDoc drops keepalive → PUT lands; await holds nav. Live-verify with replica-lag settle (`getDoc` retry before asserting present).

**Its own red-first commit, never bundled with the backfill.** SACRED: `studio-blueprint.js` pin `62286adc` bump same commit (L49, LF); `studio.html` pin `589e8cb2` only if the Save-button "Saving…" hold is wired there.

---

## Deliverables today (this session)
- **(A)** Orientation confirmed: head `cc160ad`, real-open = 0, #5 parked. ✅
- **(B)** This written plan. ✅
- **(C)** The MEASURE-FIRST instrument (`plan-3-measure-instrument.js`) + how Daniel runs it. The *filled* report requires his authenticated browser — one paste, then we read it together. ✅ (instrument) / ⏳ (numbers await his run)
- **NO code / NO write** until Daniel signs this plan.
