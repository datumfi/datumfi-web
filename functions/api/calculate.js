// /api/calculate — SAME-ORIGIN front door for the Monte Carlo compute. POST only.
// The browser no longer talks to api.datumfi.com at all; this Function does, and it is the only
// party holding the engine token. See _lib/engine-core.js for why the secret cannot live in the
// page, and for the standing caveat that this RELOCATES the exposure rather than closing it.
// ⚠️ Same-origin means the CSP's existing `connect-src 'self'` already permits this call — no
// policy edit rides along. api.datumfi.com stays in connect-src for now: removing it is a
// separate, later cleanup with its own gate, and a wider diff here buys nothing.
import { proxyToEngine } from './_lib/engine-core.js';

export async function onRequestPost(context) {
  return proxyToEngine(context.request, context.env, '/api/calculate');
}
