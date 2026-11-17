-- Separately grant management of staff assignments without granting full administrator role.
-- Only a full administrator can grant/revoke this role. Delegates cannot delegate delegation.
CREATE TABLE staff_assignment_managers (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 granted_by INTEGER NOT NULL REFERENCES users(id),
 granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
