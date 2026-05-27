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
