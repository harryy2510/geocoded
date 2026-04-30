DROP TABLE IF EXISTS search_index;

CREATE VIRTUAL TABLE search_index USING fts5(
  name,
  type UNINDEXED,
  country_code UNINDEXED,
  state_code UNINDEXED,
  extra UNINDEXED,
  tokenize='unicode61'
);
