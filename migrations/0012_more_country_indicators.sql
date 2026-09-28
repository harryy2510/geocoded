-- World Bank indicators added to geocoded-data's country-indicators.json.
-- Each indicator keeps the JSON object ({ code, name, year, value }) plus a REAL copy of the value.
ALTER TABLE country_statistics ADD COLUMN gdp_growth_percent TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN gdp_growth_percent_value REAL;
ALTER TABLE country_statistics ADD COLUMN gni_per_capita_atlas_usd TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN gni_per_capita_atlas_usd_value REAL;
ALTER TABLE country_statistics ADD COLUMN internet_users_percent TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN internet_users_percent_value REAL;
ALTER TABLE country_statistics ADD COLUMN mobile_subscriptions_per_100 TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN mobile_subscriptions_per_100_value REAL;
ALTER TABLE country_statistics ADD COLUMN electricity_access_percent TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN electricity_access_percent_value REAL;
ALTER TABLE country_statistics ADD COLUMN fertility_rate TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN fertility_rate_value REAL;
ALTER TABLE country_statistics ADD COLUMN health_expenditure_percent_gdp TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN health_expenditure_percent_gdp_value REAL;
ALTER TABLE country_statistics ADD COLUMN forest_area_percent TEXT NOT NULL DEFAULT '{}';
ALTER TABLE country_statistics ADD COLUMN forest_area_percent_value REAL;
