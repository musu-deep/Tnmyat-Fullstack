-- Opt-in professional discovery and purpose-led collaboration records.
ALTER TABLE member_preferences ADD COLUMN network_discovery INTEGER NOT NULL DEFAULT 0 CHECK(network_discovery IN (0,1));
CREATE TABLE network_relations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 initiator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL,
 reason TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','working','completed','closed','rejected')),
 next_step TEXT NOT NULL DEFAULT '',
 due_date TEXT,
 outcome TEXT NOT NULL DEFAULT '',
 evidence_url TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(initiator_id<>recipient_id)
);
CREATE INDEX network_relations_initiator ON network_relations(initiator_id,status,id DESC);
CREATE INDEX network_relations_recipient ON network_relations(recipient_id,status,id DESC);
CREATE TABLE network_relation_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 relation_id INTEGER NOT NULL REFERENCES network_relations(id) ON DELETE CASCADE,
 actor_id INTEGER NOT NULL REFERENCES users(id),
 action TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX network_relation_events_relation ON network_relation_events(relation_id,id DESC);
