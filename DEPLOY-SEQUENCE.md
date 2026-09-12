# The two-half deploy — web first, then the container

**Written 2026-09-12.** Web and engine are no longer two deploys that happen to be near each
other. They are **one deploy with two halves and an ordering**, because they are now coupled in
both directions:

| Direction | What crosses | Consequence of the wrong order |
|---|---|---|
| web → engine | `pension_cola` | The engine **requires** it for any household with a pension and has no default. Deploy the container first and **every pension household meets a 422.** |
| engine → web | `eff_rate_p25_by_year` / `eff_rate_p75_by_year` | The Measurement tax face draws its interquartile band from them. Absent, the band is not drawn. |

## The order

1. **WEB FIRST.** `git push origin main` — this publishes. Cloudflare Pages builds from `main`.
2. **Verify it is serving** before touching the engine. Marker-grep against the code, never a
   served-HTML MD5 (see CLAUDE.md — the edge rewrites HTML per request, so a served hash is
   unchaseable and proves nothing).
3. **THEN the engine.** `git push origin reconcile:reconcile` — note the explicit refspec; that
   repo's remote tracks `master`, which is a standing open finding.
4. **THEN the container.** The image build is manual and separate from the push. Poll
   `wrangler containers info` — the deploy tick lies; the container is the only thing that states
   what is actually deployed.

## The two tolerances — neither half may assume the other landed

These are not nice-to-haves. They are what makes the ordering survivable, and they are already
built:

- **WEB TOLERATES AN OLD CONTAINER.** A response without the p25/p75 edges draws the median line
  alone, omits the band path entirely, and the authored sentence changes to say the band is
  *recorded, not yet modelled*. It never derives an envelope from the median — that would draw a
  spread nobody computed, on the one face whose whole subject is spread.
  Held by `_gate_capacity_curve_reaches_panel` **L9c**.
- **ENGINE TOLERATES AN OLD CLIENT.** `pension_cola` is only demanded when the household actually
  owns a pension (`has_pension`), so a request from a pension-less client is unaffected either way.
  A pension household from a pre-deploy client gets a clean 422 with an authored refusal, not a
  wrong number.

## What must be true before any of it

- Full suite green. Nothing pushes on a red suite, ever.
- `npm run check:deps` clean — Cloudflare installs with strict `npm ci`, which aborts on a stale
  lockfile **before** `npm run build` ever runs, publishing nothing and silently serving the old
  bytes.
- SACRED map OK in both directions.
- **The Captain has said go.** The push-variation permission covers sequencing, never whether it
  may ship.

## ⚠️ One standing red is expected and is not a blocker

`test_ladder_invariant` is **16/1** in the engine repo. `prop_0b` — *"a second person in the
household must change the answer"* — is red **on purpose**: a co-architect's age and retirement age
reach nothing in the Monte Carlo, and only their Social Security does. It is a defect of record
awaiting its own commit. Do not retarget the gate to make it green; that would destroy the only
instrument that can see it.

🔑 **The person running this deploy may not be the person who built it, and will not have had the
conversation.** That is the entire reason this file exists.
