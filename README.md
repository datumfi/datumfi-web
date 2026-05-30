# Datum FI — Web

**Build:** 2026.04.19 • v1.0.0  
**Stack:** Static HTML/CSS/JS — deployed on Cloudflare Pages

## Deploy

```bash
npx wrangler pages deploy . --project-name=datumfi-web --commit-dirty=true
```

## Structure

| File | Description |
|------|-------------|
| `index.html` | Landing page — multi-screen SPA |
| `sketch.html` | Free tool — 60-second Range sketch |
| `studio.html` | Full estate builder — authenticated |
| `range.html` | Range reveal — computed output |
| `studio-showcase.html` | Studio feature demos |
| `philosophy.html` | Manifesto |
| `vault.html` | Paywall / login |
| `privacy.html` | Privacy policy |
| `terms.html` | Terms of service |
| `privacy-choices.html` | CCPA Do Not Sell |
| `dsar.html` | GDPR Art. 15–20 DSAR form |
| `404.html` | Branded 404 error page |
| `500.html` | Branded 500 error page |
| `_redirects` | Cloudflare Pages routing |
| `manifest.json` | PWA manifest |
| `styles/typography.css` | Shared tokens + fonts |
| `styles/header.css` | Nav + shared UI |
| `styles/fonts.css` | Self-hosting migration path (see file) |
| `nav.js` | Shared nav, cookie consent, session token, Delete My Data modal |
| `feedback.js` | Web3Forms feedback panel |

## Core Web Vitals Targets

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID (First Input Delay) | < 100ms |
| TTFB (Time to First Byte) | < 600ms |

## Performance Scripts

Add to `package.json` when running with Node:

```json
{
  "scripts": {
    "lighthouse": "npx lighthouse http://localhost:8788 --output html --output-path ./lighthouse-report.html --chrome-flags='--headless'",
    "serve": "npx wrangler pages dev . --port 8788"
  }
}
```

Run locally:
```bash
npm run serve     # serves on localhost:8788
npm run lighthouse  # generates lighthouse-report.html
```

## Self-Hosting Fonts (5A)

See `styles/fonts.css` for instructions. Font files go in `/fonts/`:
- Fraunces Variable (Italic + Roman) — download from Google Fonts
- DM Mono (Light/Regular/Medium) — download from Google Fonts

Once files are in place, update `typography.css` to `@import '/styles/fonts.css'` and remove the CDN `@import`.

## Privacy

DATUM FI is browser-only. No personal data is stored server-side.  
- Session data: `sessionStorage` (tab-scoped)
- Session token: `localStorage.datumfi_session_id`
- Privacy consent: `localStorage.datum_privacy_ok`
- Computation inputs: transient, discarded after API response

See `privacy.html` and `dsar.html` for user rights.

## Operational Doctrine

### Production State Discipline

- Before any code change · confirm working tree is clean against 
  current production SHA · run `git status` first
- Never commit · push · or deploy without Captain authorization · 
  even after green smokes

### Session Context Warning

- Prior conversation context is NOT a substitute for source-read
- If this is a new session: read relevant source sections before 
  any implementation step, even if the task appears familiar
- Line numbers cited in prior turns may be stale if file was 
  edited since · re-confirm before treating them as authoritative

### Architecture Doctrine

1. **Source-Read-Before-Pattern-Match** — when source is available, 
   read it before pattern-matching from prior sessions or stale 
   workbook copies
2. **Engineer-Pushback-Has-Weight** — when engineer (Claude) and 
   architect (Copilot) disagree, engineer has live source · 
   architect may have stale · pushback is rewarded
3. **Symptoms-Before-Code-Patterns** — panel updates with wrong 
   numbers → suspect math · panel doesn't update → suspect wiring · 
   diagnose the symptom before pattern-matching to a fix
4. **Copy-Disclosure-Not-Feature-Fix** — adding disclaimer copy does 
   not substitute for incomplete feature math
5. **Multi-Pass Spec Audit For Math Layer** — math-layer dispatches 
   benefit from 2-advisor + architect convergence before 
   implementation · UI dispatches do not need this overhead
6. **Smoke Order Protects Shipped Work** — preserve-path smokes run 
   FIRST · then new-path smokes · catches regression to shipped 
   work in the first 2 smokes
7. **Captain Approves Commit** — never commit/push/deploy without 
   explicit Captain authorization · even after green smokes

### Implementation Hosts (Sacred · Do Not Refactor Without Captain Sign-Off)

**`sketch.html`:**
- `solveInverse` — boundary math solver · DO NOT modify routing
- `getMathPoint` · `getShapeStateObj` — Shape envelope geometry
- All drag handlers (`d2-slider-*`) — handle position math
- `populateZoneC` — Path Options render host · safe to extend with 
  scope-conditional branches
- Block E narrative card (33-cell matrix) — Datum-only flow owner · 
  complete and tested · DO NOT extend with multi-line scenarios 
  (those belong in Framing D) · if a Datum+boundary scenario appears 
  to need Block E changes, STOP and report — that signals a scope 
  error, not a Block E gap

### Named Constants — Hardcoded Spec Pattern (Mirror Exactly)

- `DATUM_GROWTH_RATE_SPEC = 0.045` — Datum spec growth
- `DATUM_SUPPORT_RATE = 0.040` — Datum support capacity
- `DRIVER_TIE_EPSILON = 0.005` — Tied-driver detection
- `THR = 0.5` — Shared epsilon for handle-moved detection (k/yr)
- DO NOT use `s.baselineRate` · `s.upsideRate` · `s.conservativeRate` 
  as substitutes for spec constants — these are intentionally 
  scenario-blind by doctrine

### Unit Discipline

- Source deltas (`dc` · `df` · `dd`) are in **k/yr**
- Convert to `dc_M` · `df_M` · `dd_M` (**$M/yr**) before coefficient math
- Re-convert (×1e6) for display contributions ($/yr)
- Never apply coefficient math to raw k/yr values

### Copy Voice Discipline

- Copy may NAME what is happening in plainspoken English
- Copy may NOT substitute for incomplete math by adding disclaimer 
  language or hedging phrases
- Voice benchmark: existing COMBINATION box in populateZoneC — match 
  that register for all new Path Options copy
- Direction-neutral phrasing required for any copy that may render 
  on both positive and negative deltas (use "you moved your Floor 
  to {value}" not "your Floor rose to {value}")

### Workbook Governance

Captain's workbook (`Datum FI Copy System V12.xlsx`) is the 
operational source of truth for Sketch copy, math specs, doctrine 
archives, and dispatch queue.

When editing workbook sheets directly via Office.js or PowerShell:
- Read column A sentinel BEFORE writing to verify expected row
- Edit ONLY the column noted · never bulk-overwrite
- Read-back column after write to confirm persistence
- Office.js handles Unicode em-dashes cleanly · PowerShell COM 
  often does not — prefer Office.js for em-dash sheet names

### Math-Layer Dispatch Discipline

For dispatches that modify math (coefficients, solvers, render 
calculations):

1. **Phase 1 read-only audit** — engineer reads spec + source, 
   reports gaps, no code changes
2. **Captain decisions locked** — all open questions resolved before 
   implementation begins
3. **Phase 2 implementation** — surgical edits to host function only · 
   do NOT refactor adjacent code
4. **Smoke ordering mandatory** — preserve-path smokes FIRST · then 
   new-path · then state-management
5. **Report before commit** — line numbers · diff summary · smoke 
   results · Captain authorizes commit explicitly

### Pushback License

If after reading spec + source the engineer finds:
- A math error or unit inconsistency
- A logic gap or scope ambiguity
- A voice/copy issue that conflicts with established product voice
- A conflict with engine read of existing code

→ **STOP. Report the issue with specific row/line number and 
proposed fix BEFORE writing code.** Architect (Copilot) has been 
wrong on math · engineer pushback has caught real bugs every cycle.

### Known Failure Modes (from production history)

- Panel renders but numbers wrong → coefficient unit error (k/yr 
  not converted to $M before math)
- Datum handle snaps back after Accept → dd not resolved in Accept 
  handler state mutation
- Block C behavior changed when Datum not moved → hasDatum 
  conditional missing or misplaced
- Copy renders in wrong scenario → block routing condition wrong 
  (check hasCeil/hasFloor/hasDatum flags)
- Screen 1 visualization drifts after Screen 2 interaction → shared 
  Y-axis globals being written by both screens (Screen 2 needs its 
  own `d2Y*` scale)
- Reset Design only partially resets → conditional `exactVal` copy 
  in slider init skips when baseline source is empty · must be 
  unconditional from ghost baseline

### Stop and Report Before Editing If

- `git status` is not clean
- Expected source functions/blocks are missing or materially 
  different from the dispatch
- Units are unclear or inconsistent
- Implementation requires changing an Untouchable host
- A Captain decision is missing
- The requested change would alter `hasDatum=false` behavior
- Smoke expectations conflict with source behavior
- A fix requires broad refactor, formatting, or moving code

### Minimal Diff Discipline

- Make the smallest surgical edit that satisfies the dispatch
- Do not reformat unrelated code
- Do not rename existing functions/variables unless explicitly requested
- Do not move functions between files
- Do not clean up adjacent code opportunistically
- Preserve existing comments unless directly stale because of the change

### Line Number Discipline

Line numbers are for reporting and review only. Do not rely on stale 
line numbers as implementation anchors. Locate code by function name, 
block structure, nearby comments, and source behavior.

### Pre-Edit Plan Required For Math/State Changes

Before editing, report:
1. Files to be changed
2. Functions/blocks to be touched
3. Functions/blocks explicitly not touched
4. New constants/helpers to add
5. Smoke tests to run after edit
6. Any expected behavior change

### State-Management Invariants

- If an Accept action commits a visual drag result, it must also 
  clear the corresponding transient delta state
- After Accept + re-render, the accepted value must be the new baseline
- No residual ghost tension should remain after an accepted lever
- If a lever value was computed using Datum clearance, Accept must 
  commit both the lever and the moved Datum target
- Never let visual state, source state, and ghost state disagree 
  after commit

### Privacy / Telemetry Discipline

- Never log raw user financial inputs to analytics or console in 
  production code
- Never add telemetry that captures balances, spending targets, 
  account names, or Social Security values without Captain approval
- Never commit secrets, API keys, tokens, or environment files
- If adding diagnostics, use non-sensitive event names and coarse 
  state labels only

### Required Report Format After Implementation

1. Summary of change
2. Files changed
3. Functions/blocks changed
4. Functions/blocks explicitly preserved
5. New constants/helpers added
6. Smoke test results, in required order
7. Known caveats or unresolved issues
8. Git status
9. Awaiting Captain authorization before commit/push/deploy

Do not edit the workbook during code implementation unless the 
dispatch explicitly says the task is a workbook-edit task.