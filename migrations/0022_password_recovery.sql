-- One-use, short-lived password reset links issued by an authenticated platform administrator.
CREATE TABLE password_reset_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 issued_by INTEGER NOT NULL REFERENCES users(id),
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX password_reset_tokens_expiry ON password_reset_tokens(expires_at);
