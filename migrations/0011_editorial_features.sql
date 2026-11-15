-- Editorially featured member posts. Scores are advisory, never auto-published.
CREATE TABLE featured_member_posts (
 post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
 lane INTEGER NOT NULL DEFAULT 2 CHECK(lane IN (1,2)),
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','withdrawn')),
 endorsed_by INTEGER NOT NULL REFERENCES users(id),
 reason TEXT NOT NULL,
 endorsed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX featured_member_posts_status ON featured_member_posts(status,endorsed_at DESC);
