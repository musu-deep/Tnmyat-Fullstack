-- Tnmyat Market operating layer, additive only: retains existing member/store/listing data.
ALTER TABLE market_listings ADD COLUMN category TEXT NOT NULL DEFAULT 'عام';
ALTER TABLE market_listings ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE market_listings ADD COLUMN stock_qty INTEGER;
ALTER TABLE market_listings ADD COLUMN min_order_qty INTEGER NOT NULL DEFAULT 1;
ALTER TABLE market_listings ADD COLUMN sku TEXT NOT NULL DEFAULT '';
ALTER TABLE market_listings ADD COLUMN updated_at TEXT;

CREATE TABLE market_inquiries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 listing_id INTEGER NOT NULL REFERENCES market_listings(id),
 buyer_id INTEGER NOT NULL REFERENCES users(id),
 seller_id INTEGER NOT NULL REFERENCES users(id),
 quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 1000000),
 message TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','quoted','accepted','declined','closed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(buyer_id <> seller_id)
);
CREATE INDEX market_inquiries_buyer ON market_inquiries(buyer_id,status);
CREATE INDEX market_inquiries_seller ON market_inquiries(seller_id,status);
CREATE TABLE market_quotations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 inquiry_id INTEGER NOT NULL UNIQUE REFERENCES market_inquiries(id) ON DELETE CASCADE,
 seller_id INTEGER NOT NULL REFERENCES users(id),
 amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
 currency TEXT NOT NULL DEFAULT 'SAR',
 notes TEXT NOT NULL DEFAULT '',
 expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE market_rfq (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 buyer_id INTEGER NOT NULL REFERENCES users(id),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT 'عام',
 quantity INTEGER,
 deadline TEXT,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX market_rfq_state ON market_rfq(status,created_at);
CREATE TABLE market_rfq_bids (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 rfq_id INTEGER NOT NULL REFERENCES market_rfq(id) ON DELETE CASCADE,
 store_id INTEGER NOT NULL REFERENCES market_stores(id),
 vendor_id INTEGER NOT NULL REFERENCES users(id),
 amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
 notes TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','selected','rejected')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(rfq_id,store_id)
);
CREATE INDEX market_rfq_bids_rfq ON market_rfq_bids(rfq_id);
