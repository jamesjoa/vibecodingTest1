CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '뉴스',
  published_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
