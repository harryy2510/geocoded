CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);
CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region);
CREATE INDEX IF NOT EXISTS idx_countries_currency ON countries(currency);
CREATE INDEX IF NOT EXISTS idx_countries_population ON countries(population);

CREATE TABLE IF NOT EXISTS country_statistics (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  iso3 TEXT NOT NULL,
  population_total TEXT NOT NULL DEFAULT '{}',
  population_total_value REAL,
  population_female TEXT NOT NULL DEFAULT '{}',
  population_female_value REAL,
  population_male TEXT NOT NULL DEFAULT '{}',
  population_male_value REAL,
  population_density TEXT NOT NULL DEFAULT '{}',
  population_density_value REAL,
  urban_population_percent TEXT NOT NULL DEFAULT '{}',
  urban_population_percent_value REAL,
  rural_population_percent TEXT NOT NULL DEFAULT '{}',
  rural_population_percent_value REAL,
  age_0_to_14_percent TEXT NOT NULL DEFAULT '{}',
  age_0_to_14_percent_value REAL,
  age_15_to_64_percent TEXT NOT NULL DEFAULT '{}',
  age_15_to_64_percent_value REAL,
  age_65_plus_percent TEXT NOT NULL DEFAULT '{}',
  age_65_plus_percent_value REAL,
  gdp_current_usd TEXT NOT NULL DEFAULT '{}',
  gdp_current_usd_value REAL,
  gdp_per_capita_current_usd TEXT NOT NULL DEFAULT '{}',
  gdp_per_capita_current_usd_value REAL,
  life_expectancy TEXT NOT NULL DEFAULT '{}',
  life_expectancy_value REAL,
  source_hash TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (country_code) REFERENCES countries(iso2) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_country_statistics_iso3 ON country_statistics(iso3);
CREATE INDEX IF NOT EXISTS idx_country_statistics_country_name ON country_statistics(country_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_country_statistics_population_total_value ON country_statistics(population_total_value);
CREATE INDEX IF NOT EXISTS idx_country_statistics_gdp_per_capita_value ON country_statistics(gdp_per_capita_current_usd_value);
CREATE INDEX IF NOT EXISTS idx_country_statistics_life_expectancy_value ON country_statistics(life_expectancy_value);
