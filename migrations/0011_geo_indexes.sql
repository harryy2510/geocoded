-- Coordinate indexes for nearby search (`near=lat,lng`) and reverse geocoding (/v2/reverse).
-- Cities and airports store coordinates as TEXT, so these index the exact REAL cast expressions
-- the queries use; ports and border crossings already store REAL.
CREATE INDEX IF NOT EXISTS idx_cities_geo
  ON cities(CAST(latitude AS REAL), CAST(longitude AS REAL));

CREATE INDEX IF NOT EXISTS idx_airports_geo
  ON airports(CAST(latitude AS REAL), CAST(longitude AS REAL));

CREATE INDEX IF NOT EXISTS idx_ports_geo ON ports(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_border_crossings_geo
  ON border_crossings(latitude, longitude);
