ALTER TABLE posts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE posts ADD COLUMN edit_token TEXT;
CREATE UNIQUE INDEX posts_edit_token ON posts(edit_token) WHERE edit_token IS NOT NULL;
CREATE TABLE post_files (
  id TEXT PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX post_files_position ON post_files(post_id,position);
CREATE TABLE file_parts (
  file_id TEXT NOT NULL REFERENCES post_files(id) ON DELETE CASCADE,
  part INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY(file_id,part)
);
