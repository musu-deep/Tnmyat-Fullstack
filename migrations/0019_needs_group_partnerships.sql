-- Moderated community needs and voluntary cross-group cooperation.
CREATE TABLE development_needs(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id),
 project_id INTEGER REFERENCES development_projects(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 country TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 required_skills TEXT NOT NULL DEFAULT '',
 urgency TEXT NOT NULL DEFAULT 'normal' CHECK(urgency IN ('normal','high')),
 deadline TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','closed','rejected')),
 reviewed_by INTEGER REFERENCES users(id),
 reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX development_needs_listing ON development_needs(status,category,id DESC);
ALTER TABLE development_opportunities ADD COLUMN need_id INTEGER REFERENCES development_needs(id) ON DELETE SET NULL;
CREATE TABLE community_partnerships(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 from_group_id INTEGER NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
 to_group_id INTEGER NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
 initiator_id INTEGER NOT NULL REFERENCES users(id),
 purpose TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','closed')),
 decided_by INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 decided_at TEXT,
 CHECK(from_group_id<>to_group_id),
 UNIQUE(from_group_id,to_group_id)
);
CREATE INDEX community_partnerships_to_group ON community_partnerships(to_group_id,status);
