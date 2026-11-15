-- Public member cover image and positioning. Existing profiles remain unchanged.
ALTER TABLE users ADD COLUMN cover_bytes BLOB;
ALTER TABLE users ADD COLUMN cover_mime TEXT;
ALTER TABLE users ADD COLUMN cover_version TEXT;
ALTER TABLE users ADD COLUMN cover_position INTEGER NOT NULL DEFAULT 50 CHECK(cover_position BETWEEN 0 AND 100);
