-- Evidence-based member impact and a curated hybrid marketplace.
CREATE TABLE market_member_impact_ratings (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
 evidence TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT 'قيد التقييم',
 reviewed_by INTEGER REFERENCES users(id),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE market_stores (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 3 AND 100),
 description TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT 'producer' CHECK(kind IN ('producer','manufacturer','distributor','service_provider')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX market_stores_owner ON market_stores(owner_id);
CREATE INDEX market_stores_status ON market_stores(status);
CREATE TABLE market_listings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 store_id INTEGER NOT NULL REFERENCES market_stores(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 160),
 description TEXT NOT NULL DEFAULT '',
 type TEXT NOT NULL CHECK(type IN ('product','service')),
 price_minor INTEGER CHECK(price_minor IS NULL OR price_minor >= 0),
 currency TEXT NOT NULL DEFAULT 'SAR',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 category TEXT NOT NULL DEFAULT 'عام',
 image_url TEXT NOT NULL DEFAULT '',
 stock_qty INTEGER,
 min_order_qty INTEGER NOT NULL DEFAULT 1,
 sku TEXT NOT NULL DEFAULT '',
 updated_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX market_listings_store ON market_listings(store_id);
CREATE INDEX market_listings_status ON market_listings(status);