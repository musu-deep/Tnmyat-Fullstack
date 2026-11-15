-- Member-curated links: personal reading collection, never public editorial news.
CREATE TABLE member_news_links (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 headline TEXT NOT NULL,
 source_url TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX member_news_links_owner ON member_news_links(user_id,id DESC);
