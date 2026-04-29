CREATE TABLE IF NOT EXISTS quiz_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_quiz_stats_mode ON quiz_stats(mode);
