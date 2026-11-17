-- Granular delegated review capabilities. No permission is implied by membership.
CREATE TABLE staff_permissions (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL CHECK(permission IN ('needs_review','opportunities_review','organizations_review','outcomes_review')),
 granted_by INTEGER NOT NULL REFERENCES users(id),
 granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(user_id,permission)
);
CREATE INDEX staff_permissions_by_permission ON staff_permissions(permission,user_id);
