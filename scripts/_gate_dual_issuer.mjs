/* @gate-pool: node
 *
 * ══ THE DUAL-ISSUER ACCEPTOR — AND, MORE IMPORTANTLY, ITS BOUNDARY ══════════════════════════════
 *
 * ⛔⛔ THE INTERESTING LEG HERE IS NOT "THE NEW ISSUER IS ACCEPTED". IT IS "A THIRD ONE STILL IS
 * NOT." A widened door is only safe if you can show where it stops, and the cheapest way to write
 * this feature wrong is `jwtVerify(token, keys)` with the issuer assertion dropped — which accepts
 * ANY issuer whose keys happen to verify, and passes every test that only checks the happy path.
 * L3 exists to fail in exactly that shape.
 *
 * ── WHY IT USES REAL KEYS AND A REAL JWKS ───────────────────────────────────────────────────────
 * Two RSA key pairs are generated in-process and served as genuine JWKS documents from two local
 * servers. Every token below is REALLY SIGNED and REALLY VERIFIED by `jose` — no stubs, no mocks of
 * the thing under test. `verifyToken(token, candidates)` takes its candidate list as a REAL
 * PARAMETER, so the production path has no test-only branch in it.
 *
 * ── ⏳ THIS GATE IS ITSELF TEMPORARY, AND SAYS SO ───────────────────────────────────────────────
 * It guards a deliberately temporary concession. When the datumfi issuer is removed from
 * functions/api/_lib/auth.js, L2 and L6 lose their subject and THIS FILE SHOULD BE CUT DOWN WITH
 * IT — leaving L3/L4/L5, which guard the permanent boundary. A gate that outlives its feature
 * becomes a reason not to remove the feature.
 *
 * ── LEGS ────────────────────────────────────────────────────────────────────────────────────────
 *  L1 · a token from the FIRST (live) issuer verifies
 *  L2 · a token from the SECOND (move-target) issuer verifies      ⏳ temporary
 *  L3 · a LISTED-KEY token claiming an UNLISTED issuer is REJECTED  ⭐ the boundary
 *  L4 · a token claiming a listed issuer but signed with the WRONG KEY is REJECTED
 *  L5 · an EXPIRED token from a listed issuer is REJECTED
 *  L6 · order: verifying a FIRST-issuer token performs ZERO lookups against the second host ⏳
 *  L7 · verifyClerk still rejects a missing/!malformed Authorization header (unchanged behaviour)
 *
 * ── RED-FIRST ───────────────────────────────────────────────────────────────────────────────────
 *   --singleissuer   drop the second candidate                        -> L2
 *   --acceptany      verify WITHOUT asserting the issuer claim        -> L3
 *   --orderflip      try the second candidate first                   -> L6
 *   --declare-controls
 */
import http from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';
import { verifyToken, verifyClerk, UnauthorizedError, ISSUERS } from '../functions/api/_lib/auth.js';

const argv = process.argv.slice(2);
const SINGLE = argv.includes('--singleissuer');
const ACCEPTANY = argv.includes('--acceptany');
const ORDERFLIP = argv.includes('--orderflip');
const ANY = SINGLE || ACCEPTANY || ORDERFLIP;

const CONTROLS = {
  '--singleissuer': { what: 'drops the second candidate — the pre-move, single-pin shape', reds: ['L2'], expect: 'red' },
  '--acceptany': {
    what: 'verifies without asserting the issuer claim — the natural wrong way to write this',
    reds: ['L3'], expect: 'red',
    note: 'reproduces the defect this feature is most likely to ship with, not a bug-shaped substitute'
  },
  '--orderflip': { what: 'tries the move-target candidate first, so the live path hits the dead host', reds: ['L6'], expect: 'red' }
};
if (argv.includes('--declare-controls')) {
  console.log(JSON.stringify({ gate: '_gate_dual_issuer.mjs', controls: CONTROLS }));
  process.exit(0);
}

let pass = 0, fail = 0;
const results = {};
function ok(id, msg, cond, observed) {
  results[id] = !!cond;
  if (cond) { pass++; console.log(`PASS ${id} · ${msg}   [observed: ${observed}]`); }
  else { fail++; console.log(`FAIL ${id} · ${msg}   [observed: ${observed}]`); }
}

/* A real JWKS endpoint, and a hit counter so L6 can assert on lookups rather than on source order. */
async function jwksServer(jwk) {
  let hits = 0;
  const srv = http.createServer((q, s) => {
    hits++;
    s.writeHead(200, { 'Content-Type': 'application/json' });
    s.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { srv, port: srv.address().port, hits: () => hits };
}

async function mint(priv, iss, { expired = false, sub = 'user_abc123' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(iss)
    .setIssuedAt(expired ? now - 7200 : now)
    .setExpirationTime(expired ? now - 3600 : now + 3600)
    .sign(priv);
}

(async () => {
  console.log('[RUN] DUAL-ISSUER ACCEPTOR — acceptance, and the boundary it must not exceed');
  if (ANY) console.log('   MODE: RED-FIRST — this run MUST be RED on a named leg');

  /* ── ANTI-VACUITY on the SOURCE contract: the module must really export two issuers, in the
   *    documented order, or the legs below are describing a file that no longer exists. */
  if (!Array.isArray(ISSUERS) || ISSUERS.length !== 2) {
    console.log(`ABORT: auth.js exports ${Array.isArray(ISSUERS) ? ISSUERS.length : 'no'} issuers, expected exactly 2.`);
    console.log('       If the datumfi issuer was REMOVED on purpose, this gate has outlived its');
    console.log('       subject and should be cut down with it. NOT a pass, NOT a red.');
    process.exit(2);
  }
  if (ISSUERS[0] !== 'https://clerk.datumfi.com') {
    console.log(`ABORT: the FIRST issuer is ${ISSUERS[0]} — expected the live one. Order is load-bearing.`);
    process.exit(2);
  }

  const A = await generateKeyPair('RS256');   // "live" instance
  const B = await generateKeyPair('RS256');   // "move target"
  const X = await generateKeyPair('RS256');   // a key we never listed (used by L4)

  const sa = await jwksServer(await exportJWK(A.publicKey));
  const sb = await jwksServer(await exportJWK(B.publicKey));
  const sx = await jwksServer(await exportJWK(X.publicKey));

  const issA = `http://127.0.0.1:${sa.port}`;
  const issB = `http://127.0.0.1:${sb.port}`;
  const issX = `http://127.0.0.1:${sx.port}`;

  const mk = (iss, port) => ({ iss, jwks: createRemoteJWKSet(new URL(`http://127.0.0.1:${port}/.well-known/jwks.json`)) });
  let candidates = [mk(issA, sa.port), mk(issB, sb.port)];
  if (SINGLE) candidates = [candidates[0]];
  if (ORDERFLIP) candidates = [candidates[1], candidates[0]];
  if (ACCEPTANY) {
    /* The natural wrong implementation: same keys, no issuer assertion. */
    candidates = candidates.map((c) => ({
      iss: c.iss,
      jwks: c.jwks,
      __noIssuerCheck: true
    }));
  }

  /* When --acceptany, route through a local verifier that omits the issuer option, so the control
     reproduces the DEFECT rather than a different function. */
  async function verify(token, cands) {
    if (!ACCEPTANY) return verifyToken(token, cands);
    let last = null;
    for (const c of cands) {
      try { return await jwtVerify(token, c.jwks); } catch (e) { last = e; }
    }
    throw last;
  }

  const tokA = await mint(A.privateKey, issA);
  const tokB = await mint(B.privateKey, issB);
  /* ⛔ L3's TOKEN IS SIGNED BY A **LISTED** KEY AND CLAIMS AN **UNLISTED** ISSUER, AND THAT SHAPE
     WAS FORCED ON ME BY A CONTROL THAT REFUSED TO BITE. The first version signed it with an unknown
     key (X) — so it was rejected on the SIGNATURE and the issuer assertion was never exercised.
     `--acceptany` (verification with the issuer option dropped) ran 7/7 GREEN over it: a leg that
     could not fail in the shape of its own claim.
     🔑 A CONTROL THAT DOES NOT BITE IS NOT A DISAPPOINTMENT — IT IS THE MEASUREMENT. Signed by A,
     claiming nobody: now the ONLY thing that can reject it is the issuer check. */
  const tokIssSpoof = await mint(A.privateKey, 'https://clerk.not-ours.example');
  const tokWrongKey = await mint(X.privateKey, issA);           // claims A, signed by X
  const tokExpired = await mint(A.privateKey, issA, { expired: true });

  const tryIt = async (t) => { try { const r = await verify(t, candidates); return { ok: true, sub: r.payload.sub }; } catch (e) { return { ok: false, err: (e && e.code) || (e && e.message) || 'err' }; } };

  const r1 = await tryIt(tokA);
  ok('L1', 'a token from the FIRST (live) issuer verifies', r1.ok === true, JSON.stringify(r1));

  const r2 = await tryIt(tokB);
  ok('L2', 'a token from the SECOND (move-target) issuer verifies  [temporary]', r2.ok === true, JSON.stringify(r2));

  const r3 = await tryIt(tokIssSpoof);
  ok('L3', 'a LISTED-key token claiming an UNLISTED issuer is REJECTED  (the boundary)',
    r3.ok === false, JSON.stringify(r3));

  const r4 = await tryIt(tokWrongKey);
  ok('L4', 'a token claiming a listed issuer but signed with the WRONG KEY is REJECTED',
    r4.ok === false, JSON.stringify(r4));

  const r5 = await tryIt(tokExpired);
  ok('L5', 'an EXPIRED token from a listed issuer is REJECTED', r5.ok === false, JSON.stringify(r5));

  /* L6 — ORDER, ASSERTED BEHAVIOURALLY. A fresh pair of servers so the counters start clean and a
     cached key set from the legs above cannot mask a lookup. */
  const sa2 = await jwksServer(await exportJWK(A.publicKey));
  const sb2 = await jwksServer(await exportJWK(B.publicKey));
  const issA2 = `http://127.0.0.1:${sa2.port}`;
  const issB2 = `http://127.0.0.1:${sb2.port}`;
  let ordered = [mk(issA2, sa2.port), mk(issB2, sb2.port)];
  if (ORDERFLIP) ordered = [ordered[1], ordered[0]];
  const tokA2 = await mint(A.privateKey, issA2);
  try { await verifyToken(tokA2, ordered); } catch (e) { /* recorded by the counters */ }
  ok('L6', 'verifying a FIRST-issuer token performs ZERO lookups against the second host  [temporary]',
    sb2.hits() === 0, `first-host lookups=${sa2.hits()} second-host lookups=${sb2.hits()}`);

  /* L7 — the pre-existing contract must be unchanged. */
  let missing = null, malformed = null;
  try { await verifyClerk(new Request('https://x/api/documents', { method: 'GET' }), candidates); }
  catch (e) { missing = e instanceof UnauthorizedError; }
  try { await verifyClerk(new Request('https://x/', { method: 'GET', headers: { Authorization: 'Bearer not.a.jwt' } }), candidates); }
  catch (e) { malformed = e instanceof UnauthorizedError; }
  ok('L7', 'verifyClerk still rejects a missing and a malformed Authorization header',
    missing === true && malformed === true, `missing=${missing} malformed=${malformed}`);

  [sa.srv, sb.srv, sx.srv, sa2.srv, sb2.srv].forEach((s) => s.close());

  const total = pass + fail;
  if (ANY) {
    const flag = SINGLE ? '--singleissuer' : ACCEPTANY ? '--acceptany' : '--orderflip';
    const expected = CONTROLS[flag].reds;
    const actual = Object.keys(results).filter((k) => !results[k]).sort();
    console.log(`   red-first: expected RED on ${expected.join(',')} — actual RED on ${actual.join(',') || '(none)'}`);
  }
  console.log(`SCORE ${pass}/${total} ${fail === 0 ? 'GREEN' : 'RED'}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.log('FAIL harness: ' + ((e && e.stack) || e));
  console.log('SCORE 0/7 RED');
  process.exit(1);
});
