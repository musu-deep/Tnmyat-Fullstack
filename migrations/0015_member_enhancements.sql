-- Optional professional detail and safe review workflows.
ALTER TABLE member_preferences ADD COLUMN skills TEXT NOT NULL DEFAULT '[]';
ALTER TABLE member_preferences ADD COLUMN participation TEXT NOT NULL DEFAULT '[]';
ALTER TABLE member_preferences ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'members' CHECK(profile_visibility IN ('private','members'));
ALTER TABLE member_preferences ADD COLUMN notification_window INTEGER NOT NULL DEFAULT 14 CHECK(notification_window IN (3,7,14,30));
ALTER TABLE member_impact ADD COLUMN reviewer_id INTEGER REFERENCES users(id);
ALTER TABLE member_impact ADD COLUMN reviewed_at TEXT;
ALTER TABLE member_impact ADD COLUMN reviewer_note TEXT NOT NULL DEFAULT '';
CREATE TABLE member_impact_reviews(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 impact_id INTEGER NOT NULL REFERENCES member_impact(id) ON DELETE CASCADE,
 reviewer_id INTEGER NOT NULL REFERENCES users(id),
 decision TEXT NOT NULL CHECK(decision IN ('reviewed','self_reported')),
 note TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX member_impact_reviews_recent ON member_impact_reviews(id DESC);
