-- Personalized member journey. Private objects are accessible only to their owner.
CREATE TABLE member_preferences(
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 professional_role TEXT NOT NULL DEFAULT '',
 organization TEXT NOT NULL DEFAULT '',
 country TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 goal TEXT NOT NULL DEFAULT '',
 sectors TEXT NOT NULL DEFAULT '[]',
 news_enabled INTEGER NOT NULL DEFAULT 1 CHECK(news_enabled IN (0,1)),
 onboarding_complete INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_complete IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE member_calendar(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 event_date TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 event_id INTEGER REFERENCES development_events(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX member_calendar_owner ON member_calendar(user_id,event_date);
CREATE UNIQUE INDEX member_calendar_unique_event ON member_calendar(user_id,event_id) WHERE event_id IS NOT NULL;
CREATE TABLE member_map_saves(
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 project_id INTEGER NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(user_id,project_id)
);
CREATE TABLE member_goals(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX member_goals_user ON member_goals(user_id,status);
CREATE TABLE member_impact(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 goal_id INTEGER REFERENCES member_goals(id) ON DELETE SET NULL,
 title TEXT NOT NULL,
 outcome TEXT NOT NULL,
 evidence_url TEXT NOT NULL DEFAULT '',
 beneficiaries INTEGER NOT NULL DEFAULT 0 CHECK(beneficiaries>=0),
 verification TEXT NOT NULL DEFAULT 'self_reported' CHECK(verification IN ('self_reported','reviewed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX member_impact_user ON member_impact(user_id,id DESC);
