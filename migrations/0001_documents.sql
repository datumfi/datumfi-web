-- D1 Phase 2 · one row PER DOCUMENT, keyed to the VERIFIED Clerk user id.
-- Studio = 1 row (type=studio, key=active); each Blueprint = its own row (key=blueprint_id);
-- sketchbook its own; preferences its own. payload_json = full-fidelity JSON (NO 8192 cap ->
-- nothing is shed, no name is dropped). Unlimited saves: blueprints/sketches are N rows.
-- document_type allow-list (studio | sketchbook | blueprint | preferences) is enforced in the API.
CREATE TABLE IF NOT EXISTS documents (
  clerk_user_id TEXT    NOT NULL,
  document_type TEXT    NOT NULL,
  doc_key       TEXT    NOT NULL DEFAULT 'active',
  payload_json  TEXT    NOT NULL,
  revision      INTEGER NOT NULL DEFAULT 1,
  updated_at    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (clerk_user_id, document_type, doc_key)
);

-- Fast "list every document for this user" (never a full scan; always user-scoped).
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents (clerk_user_id);
