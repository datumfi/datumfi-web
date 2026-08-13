# CLAUDE.md · Datum FI Project Conventions

Auto-loaded every Claude Code session. Honor these rules without exception.

## PowerShell 965-Byte Hard Limit (Doctrine #27)

The Claude Code tool wrapper enforces a 965-byte limit on PowerShell command
strings. Commands exceeding this trigger "Command contains malformed syntax
that cannot be parsed: Invalid JSON" errors.

Three failure modes documented 2026-06-03 session:
 1. Inline Write-Host with nested $(if...) subexpressions · quote ambiguity
 2. Bash heredoc cat <<'EOF' syntax · PowerShell does not parse bash heredoc
 3. Multi-line @" "@ PowerShell here-string exceeding 965 bytes

### NEVER round-trip a source file through PS 5.1 Get-Content/Set-Content

`(Get-Content f -Raw) -replace ... | Set-Content f -Encoding utf8` **CORRUPTS UTF-8**.
PS 5.1 reads as ANSI/cp1252 then re-encodes to UTF-8, double-encoding every
non-ASCII byte (em dash → `â€"`, `·` → `Â·`) and adding a BOM. Did this to
`scripts/_gate_rename_persist.js` on 2026-07-26 — 49 mojibake markers in one
command. Use the Edit tool for in-place edits, or node (`fs.readFileSync`/
`writeFileSync`) when scripting. Repair, if it happens:
`Buffer.from(fs.readFileSync(f,'utf8'),'latin1').toString('utf8')` + strip BOM.

### Commit Message Pattern (canonical · temp-file approach)

```powershell
$msg = @"
Commit subject line

Body paragraph one with detail.

Body paragraph two with more detail.
"@
$msg | Out-File -FilePath commit-msg.txt -Encoding ASCII
git commit -F commit-msg.txt
Remove-Item commit-msg.txt
```

Three separate short commands. Each well under 965 bytes. Zero parse risk.

### Verification Pattern (canonical · assign-then-echo · no nested quotes)

```powershell
$c = curl.exe -s -L 'https://datumfi.com/vault'
$m1 = $c -match 'pattern1'
$m2 = $c -match 'pattern2'
Write-Host "Marker 1: $m1"
Write-Host "Marker 2: $m2"
```

Never use Write-Host with nested $(if (...) {...} else {...}) subexpressions.
Always assign to variables first. Then echo plainly.

### MD5 Baseline Matrix (canonical · temp-file pattern)

```powershell
$baselines = @"
vault.html|EXPECTED_HASH
my-account.html|EXPECTED_HASH
"@
$baselines | Out-File -FilePath md5-baselines.txt -Encoding utf8
Get-Content md5-baselines.txt | ForEach-Object {
  $parts = $_ -split '\|'
  $actual = (Get-FileHash $parts[0] -Algorithm MD5).Hash
  Write-Host "$($parts[0]): $actual vs $($parts[1])"
}
Remove-Item md5-baselines.txt
```

## Lockfile / `npm ci` Discipline (Doctrine #34 — deploy-blocker law)

Cloudflare Pages installs with strict `npm ci`, which **ABORTS** if
`package.json` and `package-lock.json` are out of sync. Local `npm install` is
lenient and silently fixes the lockfile, so a stale committed lock is invisible
locally but fails the cloud build before it ever reaches `npm run build` — no
`dist/` is published and the deploy silently does nothing (datumfi.com keeps
serving old bytes). This blocked the Phase-A deploy (2026-06-26): playwright was
in `package.json` but the COMMITTED lockfile never included it (the synced lock
sat uncommitted in the worktree).

STANDING RULE — any time you add / remove / bump an npm dependency:
 1. `npm install` — regenerate `package-lock.json`.
 2. `rm -rf node_modules && npm ci` — mirror Cloudflare's strict install LOCALLY.
    A green `npm ci` (exit 0, no EUSAGE / "out of sync") is the GATE before push.
 3. Commit `package.json` AND `package-lock.json` together, never one without the
    other.

Quick pre-push check: `npm run check:deps` (`npm ci --dry-run`). NO git hook —
the breach was a rogue hook; deploy gating stays MANUAL and explicit.

## Phase Cadence (non-negotiable)

 · Phase 1 · Diagnostic only · HOLD for Captain authorization
 · Phase 2 · Diff preview · HOLD for Captain authorization
 · Phase 3 · Implementation + commit + push + verify · HOLD for smoke
 · Phase 4 · Captain smoke + report

Never ship code without Captain Phase 2 + Phase 3 explicit authorization.

## Captain Controls Dashboard

Never modify Clerk dashboard. Never modify Cloudflare dashboard. Never modify
Google Cloud Console. Captain executes all dashboard changes manually.

## Sacred Hosts (MD5 verify before/after every commit)

The markers below are a CONTRACT, not decoration: `scripts/build-dist.mjs` parses between them to
check this list against its `SACRED{}` pin map, in both directions, on every build. Move or delete
them and the build stops with `SACRED MAP UNREADABLE` — which is the point. Never "fix" that by
loosening the parser.

<!-- SACRED-LIST-START -->
 · vault.html · sign-in page
 · my-account.html · Welcome panel
 · sketch.html · Framing D math
 · sketchbook.html · LS contract v1.0.0
 · studio.html · Studio drafting + canvas
 · Blueprint.html · Blueprint Archive
 · Dossier.html · Accounts dossier
 · nav.js · session-bound nav Pattern B (repo ROOT — every page loads `<script src="/nav.js">`)
 · scripts/account-topbar.js · 7-tab account topbar
 · privacy.html · canonical legal
 · terms.html · canonical legal
 · scripts/studio-blueprint.js · Blueprint LS/D1 contract (was PINNED in the build but never
   declared here — the mismatch ran in BOTH directions until 2026-07-27)
 · scripts/studio-upkeep.js · the Operating Upkeep catalogue — the FIRST `studioSource` part
   (2026-08-13). Declared because A FILE WHOSE ABSENCE FAILS SILENTLY AND CHANGES MONEY ON SCREEN
   IS THE DEFINITION OF SACRED: the build's leak-guard already caught it referenced-but-untracked
   once. More than one surface reads it (both the Grounds and the Driveway), and it moves carrying
   totals.
   ⭐⭐ NO LONGER A PREDICTION — MEASURED 2026-08-13. This entry used to say the `typeof` guard in
   `_propUpkeepCatalogue` ~~"would then have degraded EVERY property's upkeep window to its pre-§28
   shape without an error."~~ The tag was stripped from `studio.html` for real and the degradation
   was measured: a property's carrying total read **$3,000/yr → $5,100/yr**, the DI sentence
   confidently restated the wrong figure, and the upkeep dropdown rendered EMPTY.
   ⛔ THE PAGE DID NOT CRASH. IT LIED — no throw, no blank screen, just $2,100/yr wrong about the
   user's own money. A BROKEN PAGE TELLS THE USER TO COME BACK LATER; A LYING PAGE DOES NOT.
   ⛔ AND THE INSTRUMENTS SPLIT ALONG THE PREDICTED LINE: five sandbox gates over `calcCarryTotal`
   stayed GREEN (11 of the 14 gates over that math are sandbox-tier), and the GROSS ESTATE TOTAL
   NEVER MOVED — so the estate gates would have stayed green too. That is §25.4's signature,
   reproduced deliberately. Only `scripts/_gate_parts_wired.mjs` and `scripts/_render_diff.js`
   caught it.
   ⚠️ A property with NO upkeep lines showed the SAME number either way — a one-fixture test would
   have seen nothing. A FIXTURE WITH NOTHING IN IT PROVES NOTHING ABOUT A DEFECT THAT ONLY TOUCHES
   SOMETHING. 🔑 A predicted hazard argues; a measured one settles.
 · scripts/studio-debt-cost.js · the monthly carrying cost of a debt — the SECOND `studioSource`
   part, extracted from `studio.html:9487-9504` as the Step-2a proving move (2026-08-13).
   `calculateTotalPmt` · `calculateEscrowMonthly` · `hasEscrow`. SACRED on the same MEASURED rule as
   the catalogue above, and it clears it in three room families at once: the Moat (mortgage), the
   Cellar (HELOC) and the Yard all read the payment figures this file carries.
   ⭐ NAMED FOR ITS CALLERS, NOT ITS ORIGIN ROOM. It was extracted from the mortgage code and
   `studio-mortgage-cost.js` would have been a lie baked into a served path — `calculateTotalPmt` is
   reached by `_helocIntelBeats`, `_helocCeilingBand`, `_helocInterestOnlyDraw`, `_yardRealMonthly`
   and `_yardIntelligence`. THE ORIGIN ROOM IS AN ACCIDENT OF HISTORY; THE CALLER SET IS THE BOUNDARY.
<!-- SACRED-LIST-END -->

THIS LIST AND `SACRED{}` IN `scripts/build-dist.mjs` MUST MATCH EXACTLY — every host declared here
is pinned there, every host pinned there is declared here. They disagreed in both directions until
2026-07-27: seven hosts above were declared but pinned NOWHERE (so edits to them shipped with zero
byte-contract — that is how the `sketchbook.html` erase edit and the `nav.js` edit before it got
through), while `scripts/studio-blueprint.js` was pinned but undeclared. Adding a Sacred host means
BOTH edits, in one commit.

## Publish Proof By Host Type (measured 2026-07-26 — settles a recurring question)

Served-HTML MD5 is **NEVER** a publish proof, even for a SACRED host. Cloudflare's
edge rewrites HTML non-deterministically: four consecutive fetches of one
already-published `studio.html` returned four DIFFERENT hashes at the SAME byte
length (1389783). A hash that changes per request cannot prove anything.

**THE MECHANISM — MEASURED 2026-08-03, replacing the 2026-07-26 guess.** ~~*"diverging
where the edge rewrote the `<head>` resource hints. (It is not the analytics beacon —
no `cloudflareinsights` script was present.)"*~~ That was inferred, never verified, and
it is **wrong on both counts** — the divergence is not in `<head>` and the cause is not a
beacon. Two per-request injections do it, and both are **fixed-width**, which is exactly
why the byte length never moves and the change reads as noise rather than injection:

 1. **Email Obfuscation** rewrites every address to `/cdn-cgi/l/email-protection#<hex>`
    plus `data-cfemail="<hex>"`. The hex is XOR'd with **a fresh random key per response**,
    so identical source yields different ciphertext on every fetch.
 2. **Bot-management JSD** injects `window.__CF$cv$params={r:'<ray id>',t:'<base64 time>'}`
    — a per-request ray ID and timestamp.

Together they also explain the length delta vs local (served 1389783 vs source 1388544).
Both are Cloudflare **dashboard** settings, which only the Captain may change — so this is a
**PERMANENT, NAMED EVIDENCE GAP**, not an oversight. Every publish proof states it in one
line: `studio.html — marker-grep only; served hash unchaseable (CF email-obfuscation + JSD,
per-request)`. 🔑 **A recorded guess that has since been measured must be REPLACED by the
measurement, with the guess struck rather than deleted, so nobody re-derives it.**

 · The `SACRED{}` pin governs **BUILD** bytes only — it enforces `dist == source`,
   which `npm run build` checks. It says nothing about served bytes.
 · **JS / CSS** assets → `served-md5 == pin` IS valid proof (the edge serves these
   byte-identical). This is why `nav.js` verifies cleanly.
 · **EVERY HTML host**, SACRED or not → **marker-grep + behavior ONLY**. Never chase
   a served-HTML MD5. Local before/after MD5 on an HTML host is a source-side
   sanity check, not a publish proof.

A stale/unexpected served result is still a signal to INVESTIGATE (is the commit on
origin? is `npm ci` clean? does it match HEAD~1's hash = not-yet-published, or a
third value = look closer?) — never an assumption of lag.

## Doctrine Quick-Reference (D1-D33 · partial · see Engineering Playbook)

 D1  · window.load NOT clerkScript.load for Clerk session detection
 D2  · Symmetric auth detection across coordinating pages
 D3  · SDK version verify · Clerk runtime is v4.73.14
 D4  · Live smoke target discipline · fresh morning post-ship
 D5  · Minimal diff with MD5 verification on sacred hosts
 D6  · Test reveal mechanisms in isolation
 D7  · Clerk v4 mountSignIn afterSignInUrl precedence
 D8  · Don't build on outgoing target
 D9  · git ls-files pre-flight before curl verification
 D10 · rAF re-trigger parse-time init for visibility:hidden pages
 D11 · Session-Bound Nav Pattern B
 D12 · Personalization Default With Manual-Override
 D13 · Workspace Name Single Source Of Truth
 D14 · Null-Guard All getElementById.addEventListener
 D15 · Lifecycle-Independent Event Handler Registration
 D16 · Auth-Aware First-Impression Overlay Pattern
 D17 · Handler-Path Diagnosis Honors User Click Sequence
 D18 · Bilateral Hydration-Skip Guard Audit
 D19 · localStorage TTL Over sessionStorage For Cross-Auth-Chain Flags
 D20 · Tier Posture Restraint (free-tier defaults pre-revenue)
 D21 · Conversion-Killer Warnings Block Ship
 D22 · Cloudflare Auto-Active Features Not Equal Missing Features
 D23 · Loop-Breaker Properly Scoped To Authenticated Users
 D24 · Clerk v4 SDK URL Routing Asymmetry
 D25 · Clerk Bot Protection Requires Turnstile CSP Allowlist
 D26 · Clerk v4 Embedded Auth Pattern Requires Companion Mount
 D27 · PowerShell 965-Byte Discipline (this file enforces)
 D30 · Hypothesis Bankruptcy Test (N>3 wrong = stop hypothesizing)
 D31 · SDK Type Interface Acceptance Not Equal Runtime Support
 D32 · Dev-to-Production Configuration Delta Audit Before Code Hunt
 D33 · Embedded Auth vs Hosted Auth Architectural Decision

Full doctrine context in workbook Engineering Playbook sheet.

## Workbook Discipline

Captain maintains workbook with 5 durable scaffold sheets. Coordinated updates
in single pass when ship-state changes:
 · Note to Future Self
 · Engineering Playbook
 · Finding Disposition Tracker
 · Next Claude Prompt
 · Roadmap

Numerical content uses Excel formulas only. Narrative content uses prose into
A-column cells with [MERGED 1xN] preservation. Never blur the two.
