// D1 Phase 2 — pure document store logic (post-auth). Kept separate from the HTTP/auth shell so it
// can be behavior-gated directly against a real SQLite/D1 without minting Clerk JWTs.
// EVERY query is scoped to clerk_user_id and uses BOUND params (never string-concatenated SQL).
// payload_json is stored EXACTLY as sent (full fidelity — no 8192 cap, nothing shed, no name dropped).

export const DOC_TYPES = new Set(['studio', 'sketchbook', 'blueprint', 'preferences']);

export async function getDoc(db, sub, type, key) {
  const row = await db.prepare(
    'SELECT payload_json, revision, updated_at FROM documents WHERE clerk_user_id = ? AND document_type = ? AND doc_key = ?'
  ).bind(sub, type, key).first();
  if (!row) return null;
  return { payload: row.payload_json, revision: row.revision, updated_at: row.updated_at };
}

// List a user's documents of a type (ids + revisions only — NEVER returns payloads in a list).
export async function listDocs(db, sub, type) {
  const res = await db.prepare(
    'SELECT doc_key, revision, updated_at FROM documents WHERE clerk_user_id = ? AND document_type = ? ORDER BY updated_at DESC'
  ).bind(sub, type).all();
  return (res && res.results) || [];
}

// Compare-and-swap PUT. New (user,type,key) -> INSERT at revision 1. Existing -> UPDATE ... WHERE
// revision = expected; 0 rows changed => 409 (another tab won). If the client omits a revision we
// force-write off the current server revision (last-write-wins for that single caller).
export async function putDoc(db, sub, type, key, payloadStr, ifRevision) {
  const now = new Date().toISOString();
  const existing = await db.prepare(
    'SELECT revision FROM documents WHERE clerk_user_id = ? AND document_type = ? AND doc_key = ?'
  ).bind(sub, type, key).first();

  if (!existing) {
    if (ifRevision != null && ifRevision !== 0) {
      return { status: 409, body: { error: 'conflict', server_revision: null } };
    }
    await db.prepare(
      'INSERT INTO documents (clerk_user_id, document_type, doc_key, payload_json, revision, updated_at) VALUES (?, ?, ?, ?, 1, ?)'
    ).bind(sub, type, key, payloadStr, now).run();
    return { status: 201, body: { revision: 1, updated_at: now } };
  }

  const cur = existing.revision;
  const expected = (ifRevision != null && ifRevision !== 0) ? ifRevision : cur;
  const res = await db.prepare(
    'UPDATE documents SET payload_json = ?, revision = revision + 1, updated_at = ? WHERE clerk_user_id = ? AND document_type = ? AND doc_key = ? AND revision = ?'
  ).bind(payloadStr, now, sub, type, key, expected).run();
  const changed = (res && res.meta && typeof res.meta.changes === 'number') ? res.meta.changes
                : (res && typeof res.changes === 'number') ? res.changes : 0;
  if (!changed) return { status: 409, body: { error: 'conflict', server_revision: cur } };
  return { status: 200, body: { revision: expected + 1, updated_at: now } };
}

// Hard-delete one document (user-scoped). Used by the archive "Erase" so a removed blueprint does
// NOT resurrect cross-device off D1. Idempotent: deleting a missing row returns { deleted: 0 }.
export async function deleteDoc(db, sub, type, key) {
  const res = await db.prepare(
    'DELETE FROM documents WHERE clerk_user_id = ? AND document_type = ? AND doc_key = ?'
  ).bind(sub, type, key).run();
  const changed = (res && res.meta && typeof res.meta.changes === 'number') ? res.meta.changes
                : (res && typeof res.changes === 'number') ? res.changes : 0;
  return { status: 200, body: { deleted: changed } };
}

// Pure dispatch (post-auth). Allow-list -> 400; route GET/PUT/DELETE. `sub` is the VERIFIED user id.
// GET with list=true returns the user's document ids+revisions of that type (NEVER payloads) — the
// P5a "get all my blueprints" path that lets a fresh device rebuild the archive (list -> getDoc each).
export async function dispatch({ method, type, key, payloadStr, ifRevision, list, db, sub }) {
  if (!DOC_TYPES.has(type)) return { status: 400, body: { error: 'invalid document_type' } };
  key = key || 'active';
  if (method === 'GET') {
    if (list) {
      const docs = await listDocs(db, sub, type);
      return { status: 200, body: { documents: docs } };
    }
    const doc = await getDoc(db, sub, type, key);
    return doc ? { status: 200, body: doc } : { status: 404, body: { error: 'not found' } };
  }
  if (method === 'PUT') {
    if (typeof payloadStr !== 'string' || !payloadStr.length) return { status: 400, body: { error: 'empty payload' } };
    return await putDoc(db, sub, type, key, payloadStr, ifRevision);
  }
  if (method === 'DELETE') {
    return await deleteDoc(db, sub, type, key);
  }
  return { status: 405, body: { error: 'method not allowed' } };
}
