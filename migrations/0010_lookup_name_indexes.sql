-- Speeds up unscoped name lookups for /v2/states/:id and /v2/cities/:id.
CREATE INDEX IF NOT EXISTS idx_states_name_lookup ON states(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_states_iso3166_2 ON states(iso3166_2 COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_cities_name_lookup ON cities(name COLLATE NOCASE);
