-- Countries: add new fields from geocoded-data pipeline
ALTER TABLE countries ADD COLUMN continent TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN neighbours TEXT NOT NULL DEFAULT '[]';
ALTER TABLE countries ADD COLUMN languages TEXT NOT NULL DEFAULT '[]';
ALTER TABLE countries ADD COLUMN flag_url TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN driving_side TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN measurement_system TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN first_day_of_week TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN time_format TEXT NOT NULL DEFAULT '';
ALTER TABLE countries ADD COLUMN literacy REAL;

-- Countries: drop removed fields
ALTER TABLE countries DROP COLUMN wiki_data_id;

-- States: add new fields
ALTER TABLE states ADD COLUMN capital TEXT;

-- States: drop removed fields
ALTER TABLE states DROP COLUMN fips_code;
ALTER TABLE states DROP COLUMN level;
ALTER TABLE states DROP COLUMN parent_id;
ALTER TABLE states DROP COLUMN native;
ALTER TABLE states DROP COLUMN translations;
ALTER TABLE states DROP COLUMN wiki_data_id;

-- Cities: add new fields
ALTER TABLE cities ADD COLUMN population INTEGER NOT NULL DEFAULT 0;

-- Timezones table
CREATE TABLE IF NOT EXISTS timezones (
  timezone TEXT PRIMARY KEY,
  country_codes TEXT NOT NULL DEFAULT '[]',
  coordinates TEXT NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT ''
);

-- Currencies table
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  decimals INTEGER NOT NULL DEFAULT 2,
  countries TEXT NOT NULL DEFAULT '[]'
);
