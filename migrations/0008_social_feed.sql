-- Backwards-compatible enhancements: existing entries remain ordinary posts.
ALTER TABLE posts ADD COLUMN post_kind TEXT NOT NULL DEFAULT 'post' CHECK(post_kind IN ('post','article','initiative','question','announcement'));
ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1));
CREATE TABLE post_bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id,post_id)
);
CREATE INDEX post_bookmarks_recent ON post_bookmarks(user_id,created_at DESC);
CREATE INDEX posts_pinned ON posts(pinned,created_at DESC);
