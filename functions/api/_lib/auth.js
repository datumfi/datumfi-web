// D1 Phase 2 — Clerk session-JWT verification for the persistence API.
// The user id (sub) is derived ONLY from a signature-checked, unexpired token — NEVER from the
// browser. RS256, verified against the Clerk instance JWKS (networkless after first fetch; jose
// caches the key set). No secret is needed to VERIFY (public keys) — so no secret ships anywhere.
//
// ══ ⏳ TEMPORARY — DUAL-ISSUER ACCEPTOR, ADDED 2026-08-25 FOR THE datumae.com MOVE ═══════════════
//
// ⛔⛔ THIS IS A DELIBERATELY WIDENED SECURITY BOUNDARY WITH A SCHEDULED REMOVAL. It is not a
// permanent design. Read the removal trigger below BEFORE deciding this file is finished.
//
// ── WHY IT EXISTS: IT SHRINKS AN ATOMIC SET ─────────────────────────────────────────────────────
// THE INVARIANT THAT GOVERNS THE WHOLE AUTH MOVE:
//     THE INSTANCE THAT ISSUES A SESSION MUST EQUAL THE ONE THE BROWSER LOADS
//     MUST EQUAL THE ONE THE SERVER VALIDATES.
// Break it in either place and you get a DIFFERENT disease:
//   · issuer ≠ loader   -> the user signs in and comes back APPARENTLY SIGNED OUT.
//   · loader ≠ validator -> signed in fine, and EVERY /api/* CALL 401s. D1 persistence is silently
//     dead while the product looks authenticated. ⛔ That is this estate's characteristic failure
//     wearing a new coat: THE PRODUCT LOOKS AUTHENTICATED AND SAVES NOTHING.
//
// With a single pinned ISSUER, satisfying that invariant required EIGHT files to change in ONE
// commit (vault.html's portal host · six pages' publishable key + clerk-js src, three of which also
// carry a <meta> CSP naming the old host · and this file). This acceptor removes THIS file from that
// set, so the sequence becomes: ship this ALONE and soak -> then flip the seven front-end files.
//   🔑 AN ATOMIC SET IS NOT A FACT ABOUT A SYSTEM. IT IS A FACT ABOUT HOW THE SYSTEM IS CURRENTLY
//      WRITTEN. A single pin is what made it atomic; widening that pin, temporarily and provably,
//      is what splits the risk.
//
// ── ⚠️ WHAT IT COSTS, STATED PLAINLY ────────────────────────────────────────────────────────────
// We now accept a session token from EITHER instance. Both are ours and both live on domains we
// control, so this is not a trust extension to a third party — but it IS a wider door than the one
// that was here yesterday, and it must not outlive its reason.
// ⚠️ While clerk.datumae.com does not resolve, this leg is VACUOUS: no instance exists there, so no
// token can be issued by it. The candidate is inert until the Captain creates the instance. It is
// also tried SECOND, so today's every-request path is unchanged and never touches the dead host.
//
// ── ⛔ REMOVAL TRIGGER — STRUCTURAL, NOT A MEMORY ───────────────────────────────────────────────
// The old issuer becomes unreachable BY CONSTRUCTION the moment no served page can ask for one: the
// publishable key IS the instance (pk_live_<base64(host + '$')>), so a page that does not name
// clerk.datumfi.com cannot obtain a datumfi token.
//   FALSIFIER, runnable, and the trigger for the removal commit:
//     for each of Blueprint · Dossier · my-account · sketch · sketchbook · studio
//       curl the SERVED page; assert it contains NO 'clerk.datumfi.com'
//     and: GET https://clerk.datumae.com/.well-known/openid-configuration
//          -> issuer MUST read https://clerk.datumae.com
//   When both hold, DELETE the datumfi entry from ISSUERS and ship that as its own named commit.
//   ⛔ A DASHBOARD REPORTS INTENT; AN ENDPOINT REPORTS REALITY. Do not remove on a memory that the
//      flip happened — remove on that grep and that endpoint.
// 🗓️ EXPIRY: this concession is expected to live DAYS, not months. If it is still here after the
//    front-end flip has been verified, it is no longer a bridge, it is a hole.
// ══════════════════════════════════════════════════════════════════════════════════════════════
import { createRemoteJWKSet, jwtVerify } from 'jose';

/* ⛔ ORDER IS LOAD-BEARING, NOT COSMETIC. The CURRENT, LIVE issuer is first so that every valid
   request today succeeds on the first attempt and never performs a lookup against a host that does
   not exist yet. The new issuer is a fall-through, not a preference. */
export const ISSUERS = [
  'https://clerk.datumfi.com',   // current production instance — verified live 2026-08-25 via
                                 // /.well-known/openid-configuration -> issuer: https://clerk.datumfi.com
  'https://clerk.datumae.com'    // ⏳ the move target. INERT until the instance exists. DELETE ME —
                                 // see the removal trigger above.
];

/* One candidate per issuer. `createRemoteJWKSet` is LAZY — constructing it performs no network I/O,
   so naming a host that does not resolve yet costs nothing until something tries to verify against
   it, which cannot happen while no instance is issuing tokens there. */
const CANDIDATES = ISSUERS.map((iss) => ({
  iss,
  jwks: createRemoteJWKSet(new URL(iss + '/.well-known/jwks.json'))
}));

export class UnauthorizedError extends Error {}

/* ⭐ `candidates` IS A REAL PARAMETER WITH A REAL DEFAULT, NOT A TEST HOOK. The gate needs to prove
   acceptance and — more importantly — REJECTION against issuers it controls, which means pointing
   at a local JWKS. Threading that as an argument keeps the production path honest: there is no
   branch here that only runs during a test.
   ⛔ EACH CANDIDATE IS TRIED WITH ITS OWN KEY SET AND ITS OWN `issuer` ASSERTION. A token is never
   checked against one instance's keys while claiming another's issuer. */
export async function verifyToken(token, candidates = CANDIDATES) {
  let bestErr = null;
  for (const c of candidates) {
    try {
      return await jwtVerify(token, c.jwks, { issuer: c.iss });
    } catch (e) {
      /* ⚠️ KEEP THE MOST SPECIFIC FAILURE, NOT THE LAST ONE. Trying N candidates means N-1 of them
         are expected to fail on SIGNATURE for a perfectly good token — that is noise. The candidate
         that actually matched will fail for a REAL reason (expired, bad claim), and that is the one
         worth surfacing.
         🔑 CAUGHT BY ITS OWN GATE: an EXPIRED token was reporting
         ERR_JWS_SIGNATURE_VERIFICATION_FAILED — the trailing candidate's complaint — which is a
         true rejection attributed to the wrong cause. The leg still bit; the DIAGNOSIS lied. */
      const sig = e && e.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
      if (!bestErr || (bestErr.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' && !sig)) bestErr = e;
    }
  }
  throw bestErr || new Error('no issuer candidates configured');
}

// Returns the verified clerk_user_id (sub) or throws UnauthorizedError. jose checks the signature,
// the issuer, and expiry (exp) by default.
export async function verifyClerk(request, candidates = CANDIDATES) {
  const header = request.headers.get('Authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new UnauthorizedError('missing bearer token');
  let payload;
  try {
    ({ payload } = await verifyToken(m[1], candidates));
  } catch (e) {
    throw new UnauthorizedError('invalid token');
  }
  if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
    throw new UnauthorizedError('no subject in token');
  }
  return payload.sub;
}
