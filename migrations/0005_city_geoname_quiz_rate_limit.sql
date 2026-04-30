ALTER TABLE cities ADD COLUMN geoname_id INTEGER;

CREATE UNIQUE INDEX idx_cities_geoname_id ON cities(geoname_id)
  WHERE geoname_id IS NOT NULL;

ALTER TABLE quiz_stats ADD COLUMN client_hash TEXT;

CREATE INDEX idx_quiz_stats_client_created_at
  ON quiz_stats(client_hash, created_at);
