-- A temporary recovery password does not replace the member's existing password.
-- Only a limited one-time password-change challenge follows a successful temporary login.
CREATE TABLE temporary_passwords (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 issued_by INTEGER NOT NULL REFERENCES users(id),
 expires_at INTEGER NOT NULL
);
CREATE INDEX temporary_passwords_expiry ON temporary_passwords(expires_at);
CREATE TABLE temporary_password_challenges (
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX temporary_password_challenges_user ON temporary_password_challenges(user_id);
