export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rsa_public_key TEXT NOT NULL,
    rsa_private_key TEXT NOT NULL,
    encrypted_aes_key TEXT NOT NULL,
    encrypted_rc4_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,
    hash_value TEXT NOT NULL,
    hash_algorithm TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id),
    chunk_index INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    size INTEGER NOT NULL
  );
`;