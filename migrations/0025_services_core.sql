-- Foundation for six independently integrable services. Additive: no existing tables altered.
-- This migration is for staging first; provider secrets must never be stored in D1.
CREATE TABLE tn_service_config (
 service TEXT PRIMARY KEY CHECK(service IN ('ai','live','calls','reels','payments')),
 provider TEXT,
 mode TEXT NOT NULL DEFAULT 'disconnected' CHECK(mode IN ('disconnected','testing','ready')),
 public_settings TEXT NOT NULL DEFAULT '{}',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO tn_service_config(service) VALUES ('ai'),('live'),('calls'),('reels'),('payments');

CREATE TABLE tn_ai_threads (
 id TEXT PRIMARY KEY,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL DEFAULT 'محادثة جديدة',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_ai_threads_owner ON tn_ai_threads(owner_id,created_at);
CREATE TABLE tn_ai_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 thread_id TEXT NOT NULL REFERENCES tn_ai_threads(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('user','assistant')),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 20000),
 source_refs TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_ai_messages_thread ON tn_ai_messages(thread_id,id);

CREATE TABLE tn_live_sessions (
 id TEXT PRIMARY KEY,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 5 AND 160),
 description TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','ready','live','ended','cancelled')),
 provider_ref TEXT,
 playback_url TEXT,
 started_at TEXT,
 ended_at TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_live_state ON tn_live_sessions(state,created_at);

CREATE TABLE tn_call_sessions (
 id TEXT PRIMARY KEY,
 caller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 callee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('audio','video')),
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','declined','ended')),
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(caller_id <> callee_id)
);
CREATE INDEX tn_call_callee ON tn_call_sessions(callee_id,status,expires_at);
CREATE TABLE tn_call_signals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 session_id TEXT NOT NULL REFERENCES tn_call_sessions(id) ON DELETE CASCADE,
 sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 signal_kind TEXT NOT NULL CHECK(signal_kind IN ('offer','answer','candidate','bye')),
 payload TEXT NOT NULL CHECK(length(payload) BETWEEN 1 AND 16000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_call_signals_session ON tn_call_signals(session_id,id);

CREATE TABLE tn_reels (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 160),
 caption TEXT NOT NULL DEFAULT '',
 media_key TEXT NOT NULL DEFAULT '',
 poster_key TEXT NOT NULL DEFAULT '',
 duration_ms INTEGER,
 visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','followers','private')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','processing','published','archived')),
 provider_asset_id TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_reels_feed ON tn_reels(status,visibility,id);

CREATE TABLE tn_profile_privacy (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 bio_scope TEXT NOT NULL DEFAULT 'public' CHECK(bio_scope IN ('public','members','friends','only_me')),
 birthday_scope TEXT NOT NULL DEFAULT 'only_me' CHECK(birthday_scope IN ('public','members','friends','only_me')),
 events_scope TEXT NOT NULL DEFAULT 'only_me' CHECK(events_scope IN ('public','members','friends','only_me')),
 professional_scope TEXT NOT NULL DEFAULT 'members' CHECK(professional_scope IN ('public','members','friends','only_me')),
 date_of_birth TEXT,
 private_events TEXT NOT NULL DEFAULT '[]',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE tn_checkout_orders (
 id TEXT PRIMARY KEY,
 buyer_id INTEGER NOT NULL REFERENCES users(id),
 seller_id INTEGER NOT NULL REFERENCES users(id),
 subtotal_minor INTEGER NOT NULL CHECK(subtotal_minor >= 0),
 commission_minor INTEGER NOT NULL DEFAULT 0 CHECK(commission_minor >= 0),
 currency TEXT NOT NULL DEFAULT 'SAR',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_payment','paid','cancelled','refunded')),
 provider_payment_ref TEXT UNIQUE,
 description TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(buyer_id <> seller_id),CHECK(commission_minor <= subtotal_minor)
);
CREATE INDEX tn_checkout_owner ON tn_checkout_orders(buyer_id,status);
CREATE TABLE tn_payment_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT NOT NULL REFERENCES tn_checkout_orders(id),
 provider_event_id TEXT NOT NULL UNIQUE,
 event_type TEXT NOT NULL,
 payload_sha256 TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE tn_settlement_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT NOT NULL REFERENCES tn_checkout_orders(id),
 beneficiary_id INTEGER NOT NULL REFERENCES users(id),
 direction TEXT NOT NULL CHECK(direction IN ('credit','debit')),
 amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
 kind TEXT NOT NULL CHECK(kind IN ('sale','commission','refund','payout')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','reversed')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX tn_settlement_order ON tn_settlement_entries(order_id);
