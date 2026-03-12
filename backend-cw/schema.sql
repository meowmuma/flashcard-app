-- schema.sql — รันด้วย: wrangler d1 execute jamman-db --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decks (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  category           TEXT,
  is_public          INTEGER NOT NULL DEFAULT 0,
  share_code         TEXT UNIQUE,
  times_copied       INTEGER NOT NULL DEFAULT 0,
  original_deck_id   INTEGER,
  original_author_id INTEGER,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id    INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term       TEXT NOT NULL,
  definition TEXT NOT NULL,
  position   INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_progress (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id            INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  session_type       TEXT NOT NULL DEFAULT 'study',
  current_card_index INTEGER NOT NULL DEFAULT 0,
  total_cards        INTEGER NOT NULL DEFAULT 0,
  known_cards        INTEGER NOT NULL DEFAULT 0,
  unknown_cards      INTEGER NOT NULL DEFAULT 0,
  card_order         TEXT,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, deck_id, session_type)
);

CREATE TABLE IF NOT EXISTS study_history (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id             INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  session_type        TEXT NOT NULL DEFAULT 'study',
  total_cards         INTEGER NOT NULL DEFAULT 0,
  known_cards         INTEGER NOT NULL DEFAULT 0,
  unknown_cards       INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage REAL DEFAULT 0,
  time_spent_seconds  REAL,
  completed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_best_times (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id           INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  game_type         TEXT NOT NULL DEFAULT 'match',
  best_time_seconds REAL,
  last_time_seconds REAL,
  attempts_count    INTEGER NOT NULL DEFAULT 1,
  achieved_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_played_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, deck_id, game_type)
);
