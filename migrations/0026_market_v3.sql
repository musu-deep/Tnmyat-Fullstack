-- Marketplace V3: additive, preserve every original store/listing/order.
-- Test on staging D1 and export production DB before applying.
ALTER TABLE market_stores ADD COLUMN slug TEXT;
ALTER TABLE market_stores ADD COLUMN logo_url TEXT;
ALTER TABLE market_stores ADD COLUMN banner_url TEXT;
ALTER TABLE market_stores ADD COLUMN contact_text TEXT NOT NULL DEFAULT '';
ALTER TABLE market_stores ADD COLUMN theme_color TEXT NOT NULL DEFAULT '#183e60';
CREATE UNIQUE INDEX market_stores_slug_unique ON market_stores(slug) WHERE slug IS NOT NULL;

ALTER TABLE market_listings ADD COLUMN category TEXT NOT NULL DEFAULT 'عام';
ALTER TABLE market_listings ADD COLUMN image_url TEXT;
ALTER TABLE market_listings ADD COLUMN gallery_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE market_listings ADD COLUMN sku TEXT;
ALTER TABLE market_listings ADD COLUMN stock_qty INTEGER CHECK(stock_qty IS NULL OR stock_qty>=0);
ALTER TABLE market_listings ADD COLUMN min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK(min_order_qty>0);
ALTER TABLE market_listings ADD COLUMN specifications TEXT NOT NULL DEFAULT '';
ALTER TABLE market_listings ADD COLUMN marketing_text TEXT NOT NULL DEFAULT '';

CREATE TABLE market_favorites (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 listing_id INTEGER NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(user_id,listing_id)
);
CREATE TABLE market_reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 listing_id INTEGER NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
 comment TEXT NOT NULL DEFAULT '' CHECK(length(comment)<=1200),
 status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','hidden')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(listing_id,user_id)
);
CREATE INDEX market_reviews_listing ON market_reviews(listing_id,status);

-- Separate second credential for store dashboard. Hash and salt only; never save raw passwords.
CREATE TABLE market_store_access (
 store_id INTEGER PRIMARY KEY REFERENCES market_stores(id) ON DELETE CASCADE,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 iterations INTEGER NOT NULL CHECK(iterations>=150000),
 changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE market_store_sessions (
 token_hash TEXT PRIMARY KEY,
 store_id INTEGER NOT NULL REFERENCES market_stores(id) ON DELETE CASCADE,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX market_store_sessions_expiry ON market_store_sessions(expires_at);

-- Customer can send an intent; money, settlement and invoices require external provider.
CREATE TABLE market_purchase_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 listing_id INTEGER NOT NULL REFERENCES market_listings(id),
 buyer_id INTEGER NOT NULL REFERENCES users(id),
 store_id INTEGER NOT NULL REFERENCES market_stores(id),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 unit_price_minor INTEGER CHECK(unit_price_minor IS NULL OR unit_price_minor>=0),
 status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','quoted','cancelled','fulfilled_externally')),
 notes TEXT NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX market_purchase_requests_store ON market_purchase_requests(store_id,status);

-- Persistent member shopping cart. Checkout sends requests, not payments.
CREATE TABLE market_cart_items (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 listing_id INTEGER NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
 quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 10000),
 added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(user_id,listing_id)
);
CREATE INDEX market_cart_items_user ON market_cart_items(user_id);
