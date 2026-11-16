-- Voluntary fine-grained interests used for transparent matching.
ALTER TABLE member_preferences ADD COLUMN focus_topics TEXT NOT NULL DEFAULT '[]';
