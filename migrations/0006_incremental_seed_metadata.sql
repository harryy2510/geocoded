ALTER TABLE countries ADD COLUMN source_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE states ADD COLUMN source_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE cities ADD COLUMN source_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE timezones ADD COLUMN source_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE currencies ADD COLUMN source_hash TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_states_country_iso2_unique
  ON states(country_code, iso2);

CREATE TABLE IF NOT EXISTS seed_files (
  filename TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
