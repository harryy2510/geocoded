CREATE TABLE IF NOT EXISTS airlines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iata_code TEXT NOT NULL DEFAULT '',
  accounting_code TEXT NOT NULL DEFAULT '',
  icao_code TEXT NOT NULL DEFAULT '',
  country_name TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  controlled_duplicate INTEGER NOT NULL DEFAULT 0,
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_airlines_country ON airlines(country_code);
CREATE INDEX IF NOT EXISTS idx_airlines_iata ON airlines(iata_code);
CREATE INDEX IF NOT EXISTS idx_airlines_icao ON airlines(icao_code);
CREATE INDEX IF NOT EXISTS idx_airlines_name ON airlines(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS airports (
  id TEXT PRIMARY KEY,
  geoname_id INTEGER,
  name TEXT NOT NULL,
  ascii_name TEXT NOT NULL DEFAULT '',
  alternate_names TEXT NOT NULL DEFAULT '[]',
  un_locode TEXT,
  airport_location_code TEXT,
  iata_code TEXT,
  iata_code_source TEXT,
  latitude TEXT NOT NULL DEFAULT '',
  longitude TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL DEFAULT '',
  state_code TEXT NOT NULL DEFAULT '',
  state_name TEXT NOT NULL DEFAULT '',
  admin2_code TEXT NOT NULL DEFAULT '',
  elevation INTEGER,
  timezone TEXT NOT NULL DEFAULT '',
  modification_date TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_airports_geoname ON airports(geoname_id);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country_code);
CREATE INDEX IF NOT EXISTS idx_airports_country_state ON airports(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_timezone ON airports(timezone);
CREATE INDEX IF NOT EXISTS idx_airports_name ON airports(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS ports (
  id TEXT PRIMARY KEY,
  un_locode TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL DEFAULT '',
  location_code TEXT NOT NULL DEFAULT '',
  iata_code TEXT,
  iata_code_source TEXT,
  name TEXT NOT NULL,
  name_without_diacritics TEXT NOT NULL DEFAULT '',
  alternate_names TEXT NOT NULL DEFAULT '[]',
  subdivision_code TEXT,
  function_code TEXT NOT NULL DEFAULT '',
  functions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT '',
  status_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  coordinates TEXT,
  latitude REAL,
  longitude REAL,
  remarks TEXT,
  change_indicator TEXT,
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ports_country ON ports(country_code);
CREATE INDEX IF NOT EXISTS idx_ports_country_subdivision ON ports(country_code, subdivision_code);
CREATE INDEX IF NOT EXISTS idx_ports_iata ON ports(iata_code);
CREATE INDEX IF NOT EXISTS idx_ports_name ON ports(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS border_crossings (
  id TEXT PRIMARY KEY,
  un_locode TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL DEFAULT '',
  location_code TEXT NOT NULL DEFAULT '',
  iata_code TEXT,
  iata_code_source TEXT,
  name TEXT NOT NULL,
  name_without_diacritics TEXT NOT NULL DEFAULT '',
  alternate_names TEXT NOT NULL DEFAULT '[]',
  subdivision_code TEXT,
  function_code TEXT NOT NULL DEFAULT '',
  functions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT '',
  status_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  coordinates TEXT,
  latitude REAL,
  longitude REAL,
  remarks TEXT,
  change_indicator TEXT,
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_border_crossings_country ON border_crossings(country_code);
CREATE INDEX IF NOT EXISTS idx_border_crossings_country_subdivision ON border_crossings(country_code, subdivision_code);
CREATE INDEX IF NOT EXISTS idx_border_crossings_iata ON border_crossings(iata_code);
CREATE INDEX IF NOT EXISTS idx_border_crossings_name ON border_crossings(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS country_migration (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  iso3 TEXT NOT NULL,
  m49_code TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL,
  coverage TEXT,
  source_data_type_code TEXT NOT NULL DEFAULT '',
  source_data_type_methods TEXT NOT NULL DEFAULT '[]',
  total_international_migrants INTEGER NOT NULL DEFAULT 0,
  male_international_migrants INTEGER NOT NULL DEFAULT 0,
  female_international_migrants INTEGER NOT NULL DEFAULT 0,
  migrant_share_of_population_percent REAL NOT NULL DEFAULT 0,
  origins TEXT NOT NULL DEFAULT '[]',
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_country_migration_iso3 ON country_migration(iso3);
CREATE INDEX IF NOT EXISTS idx_country_migration_country_name ON country_migration(country_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_country_migration_total ON country_migration(total_international_migrants);
