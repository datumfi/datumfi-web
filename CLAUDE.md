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

 · vault.html · sign-in page
 · my-account.html · Welcome panel
 · sketch.html · Framing D math
 · sketchbook.html · LS contract v1.0.0
 · studio.html · Studio drafting + canvas
 · Blueprint.html · Blueprint Archive
 · Dossier.html · Accounts dossier
 · scripts/nav.js · session-bound nav Pattern B
 · scripts/account-topbar.js · 7-tab account topbar
 · privacy.html · canonical legal
 · terms.html · canonical legal

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
