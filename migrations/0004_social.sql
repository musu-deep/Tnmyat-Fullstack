ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN avatar_bytes BLOB;
ALTER TABLE users ADD COLUMN avatar_mime TEXT;
ALTER TABLE users ADD COLUMN avatar_version TEXT;
ALTER TABLE users ADD COLUMN last_seen INTEGER;
ALTER TABLE posts ADD COLUMN image_bytes BLOB;
ALTER TABLE posts ADD COLUMN image_mime TEXT;
CREATE TABLE follows (
  follower INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(follower,followed),
  CHECK(follower<>followed)
);
CREATE INDEX follows_target ON follows(followed,follower);
CREATE TABLE friendships (
  low_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  high_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted INTEGER NOT NULL DEFAULT 0 CHECK(accepted IN (0,1)),
  PRIMARY KEY(low_id,high_id),
  CHECK(low_id<high_id AND requester IN (low_id,high_id))
);
CREATE INDEX friends_high ON friendships(high_id,low_id);
CREATE TABLE reposts (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(post_id,user_id)
);
CREATE INDEX reposts_author ON reposts(user_id,created_at DESC);
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  seen INTEGER NOT NULL DEFAULT 0 CHECK(seen IN (0,1)),
  CHECK(sender_id<>recipient_id)
);
CREATE INDEX messages_sent ON messages(sender_id,recipient_id,id DESC);
CREATE INDEX messages_received ON messages(recipient_id,sender_id,id DESC);
