// D1 Phase 2 — Clerk session-JWT verification for the persistence API.
// The user id (sub) is derived ONLY from a signature-checked, unexpired token — NEVER from the
// browser. RS256, verified against the Clerk instance JWKS (networkless after first fetch; jose
// caches the key set). No secret is needed to VERIFY (public keys) — so no secret ships anywhere.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = 'https://clerk.datumfi.com';
const JWKS = createRemoteJWKSet(new URL(ISSUER + '/.well-known/jwks.json'));

export class UnauthorizedError extends Error {}

// Returns the verified clerk_user_id (sub) or throws UnauthorizedError. jose checks the signature,
// the issuer, and expiry (exp) by default.
export async function verifyClerk(request) {
  const header = request.headers.get('Authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new UnauthorizedError('missing bearer token');
  let payload;
  try {
    ({ payload } = await jwtVerify(m[1], JWKS, { issuer: ISSUER }));
  } catch (e) {
    throw new UnauthorizedError('invalid token');
  }
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
    throw new UnauthorizedError('no subject in token');
  }
  return payload.sub;
}
