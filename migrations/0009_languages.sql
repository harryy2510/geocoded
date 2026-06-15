CREATE TABLE IF NOT EXISTS languages (
  id TEXT PRIMARY KEY,
  iso6393 TEXT NOT NULL,
  iso6392_b TEXT,
  iso6392_t TEXT,
  iso6391 TEXT,
  scope TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  reference_name TEXT NOT NULL,
  names TEXT NOT NULL DEFAULT '[]',
  macrolanguage_code TEXT,
  macrolanguage_member_codes TEXT NOT NULL DEFAULT '[]',
  comment TEXT,
  lookup_codes TEXT NOT NULL DEFAULT '[]',
  source_hash TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_languages_iso6393 ON languages(iso6393);
CREATE INDEX IF NOT EXISTS idx_languages_iso6392_b ON languages(iso6392_b);
CREATE INDEX IF NOT EXISTS idx_languages_iso6392_t ON languages(iso6392_t);
CREATE INDEX IF NOT EXISTS idx_languages_iso6391 ON languages(iso6391);
CREATE INDEX IF NOT EXISTS idx_languages_reference_name ON languages(reference_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_languages_scope ON languages(scope);
CREATE INDEX IF NOT EXISTS idx_languages_type ON languages(type);
