-- Countries
CREATE TABLE IF NOT EXISTS countries (
  iso2 TEXT PRIMARY KEY,
  iso3 TEXT NOT NULL,
  name TEXT NOT NULL,
  native TEXT NOT NULL,
  capital TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT '',
  currency_name TEXT NOT NULL DEFAULT '',
  currency_symbol TEXT NOT NULL DEFAULT '',
  tld TEXT NOT NULL DEFAULT '',
  phone_code TEXT NOT NULL DEFAULT '',
  numeric_code TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL,
  subregion TEXT NOT NULL,
  emoji TEXT NOT NULL,
  emoji_u TEXT NOT NULL,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  area_sq_km REAL,
  population INTEGER,
  gdp REAL,
  postal_code_format TEXT,
  postal_code_regex TEXT,
  wiki_data_id TEXT NOT NULL,
  timezones TEXT NOT NULL DEFAULT '[]',
  translations TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_countries_iso3 ON countries(iso3);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name COLLATE NOCASE);

-- States
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  iso2 TEXT NOT NULL,
  iso3166_2 TEXT NOT NULL,
  fips_code TEXT NOT NULL,
  name TEXT NOT NULL,
  native TEXT NOT NULL,
  type TEXT NOT NULL,
  level TEXT,
  parent_id TEXT,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  timezone TEXT NOT NULL,
  population INTEGER,
  wiki_data_id TEXT NOT NULL,
  translations TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (country_code) REFERENCES countries(iso2)
);

CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_code);
CREATE INDEX IF NOT EXISTS idx_states_iso2 ON states(country_code, iso2);
CREATE INDEX IF NOT EXISTS idx_states_name ON states(country_code, name COLLATE NOCASE);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  timezone TEXT NOT NULL,
  FOREIGN KEY (country_code) REFERENCES countries(iso2)
);

CREATE INDEX IF NOT EXISTS idx_cities_country_state ON cities(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(country_code, state_code, name COLLATE NOCASE);

-- Full-text search across all entities
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  name,
  type,
  country_code,
  state_code,
  extra,
  tokenize='unicode61'
);
