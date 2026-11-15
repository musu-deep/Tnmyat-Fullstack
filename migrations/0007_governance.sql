-- Governance: reversible content visibility, account enforcement and auditable decisions.
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active','suspended','banned'));
ALTER TABLE users ADD COLUMN status_reason TEXT;
ALTER TABLE users ADD COLUMN status_until INTEGER;
ALTER TABLE posts ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden'));
ALTER TABLE comments ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden'));
ALTER TABLE community_groups ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden'));
ALTER TABLE group_notes ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden'));
CREATE TABLE moderation_actions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_id INTEGER NOT NULL REFERENCES users(id),
 target_type TEXT NOT NULL CHECK(target_type IN ('user','post','comment','group','group_note','report','appeal')),
 target_id INTEGER NOT NULL,
 action TEXT NOT NULL,
 reason TEXT NOT NULL,
 details TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX moderation_actions_time ON moderation_actions(id DESC);
CREATE INDEX moderation_actions_target ON moderation_actions(target_type,target_id,id DESC);
CREATE TABLE moderation_reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 reporter_id INTEGER NOT NULL REFERENCES users(id),
 target_type TEXT NOT NULL CHECK(target_type IN ('post','comment','group','group_note','user')),
 target_id INTEGER NOT NULL,
 reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
 assigned_to INTEGER REFERENCES users(id),
 resolution TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX moderation_reports_status ON moderation_reports(status,id DESC);
CREATE TABLE moderation_appeals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 appellant_id INTEGER NOT NULL REFERENCES users(id),
 action_id INTEGER NOT NULL REFERENCES moderation_actions(id),
 statement TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','upheld','overturned')),
 reviewer_id INTEGER REFERENCES users(id),
 decision_reason TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX moderation_appeals_status ON moderation_appeals(status,id DESC);

-- Preserve existing reports for the unified moderation queue.
INSERT INTO moderation_reports(reporter_id,target_type,target_id,reason,created_at)
SELECT user_id,'post',post_id,'بلاغ عن محتوى منشور',created_at FROM reports;
