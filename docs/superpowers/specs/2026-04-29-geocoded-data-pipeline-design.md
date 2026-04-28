# geocoded-data Pipeline Design

## Problem

geocoded currently depends on dr5hn/countries-states-cities-database, which is a community repo that sells API access commercially and has already broken our pipeline by removing `cities.json`. We need a data pipeline that pulls from official, institutional sources only -- no commercial conflicts, no surprise file removals.

## Architecture

Two repos, clear separation:

```
geocoded-data (private)              geocoded (public)
+---------------------------+        +---------------------------+
| Daily cron fetches from   |        |                           |
| official sources          |  push  | data/*.json changes       |
| -> diff via checksums     | -----> | trigger seed workflow     |
| -> commit only on change  |        | -> upload to KV           |
| -> push to geocoded main  |        | -> purge edge cache       |
+---------------------------+        +---------------------------+
         |
         v
  Raw JSON files also
  committed to geocoded-data
  repo for public download
```

## Data Sources

| Source                        | License         | What We Take                                                                                                                                                                          | Update Frequency |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| GeoNames countryInfo.txt      | CC BY 4.0       | Country base fields (iso, capital, area, currency, phone, tld, postal, languages, neighbours)                                                                                         | Daily            |
| GeoNames admin1CodesASCII.txt | CC BY 4.0       | State names + codes + geonameIds                                                                                                                                                      | Daily            |
| GeoNames cities500.zip        | CC BY 4.0       | Cities with pop > 500 (name, coords, population, timezone, admin codes)                                                                                                               | Daily            |
| GeoNames alternateNamesV2.zip | CC BY 4.0       | Translations for states (filtered by geonameId)                                                                                                                                       | Daily            |
| Unicode CLDR (cldr-json)      | Unicode License | Territory names (766 locales), currency symbols, territoryInfo (population, GDP), weekData, measurementData, timeData                                                                 | Semi-annual      |
| IANA tzdata zone1970.tab      | Public domain   | Timezone IDs per country                                                                                                                                                              | As needed        |
| ISO 4217 XML (SIX Group)      | Free to use     | Currency codes, names, decimal digits                                                                                                                                                 | As needed        |
| Wikidata SPARQL               | CC0             | nationality, drivingSide, wikidataId, geonameId, flagImage, motto, anthem, coatOfArms, independenceDate + state-level population, area, capital, coordinates, timezone, type, flagUrl | Real-time        |

## Output Files

### In geocoded-data repo (raw files for public download)

```
data/
  countries.json          # full country data, all fields
  states.json             # all states, flat array
  cities.json             # all cities, flat array (~232K records)
  timezones.json          # IANA timezone -> country mapping
  currencies.json         # ISO 4217 + CLDR symbols/names
checksums.json            # SHA-256 hash of each upstream source file
```

### Pushed to geocoded repo

Same `data/` files pushed to `geocoded` main branch. The seed workflow in `geocoded` transforms these into KV-ready bulk format and uploads.

## Data Schemas

### countries.json

```typescript
type Country = {
	// Identity
	name: string // GeoNames
	iso2: string // GeoNames
	iso3: string // GeoNames
	numericCode: string // GeoNames
	geonameId: number // GeoNames + Wikidata
	wikiDataId: string // Wikidata

	// Geography
	capital: string // GeoNames
	latitude: string // GeoNames
	longitude: string // GeoNames
	areaSqKm: number // GeoNames
	region: string // UN M49 via CLDR containment
	subregion: string // UN M49 via CLDR containment
	continent: string // GeoNames (two-letter code)
	neighbours: string[] // GeoNames (array of ISO2 codes)
	timezones: Timezone[] // IANA zone1970.tab + Intl.DateTimeFormat computed offsets/abbreviations

	// People
	population: number // CLDR territoryInfo
	nationality: string // Wikidata P1549
	languages: string[] // GeoNames (ISO 639 codes)
	native: string // CLDR native locale territory name

	// Economy
	gdp: number | null // CLDR territoryInfo
	currency: string // GeoNames (ISO 4217 code)
	currencyName: string // CLDR currency displayName
	currencySymbol: string // CLDR currency symbol

	// Communication
	phoneCode: string // GeoNames
	tld: string // GeoNames
	postalCodeFormat: string | null // GeoNames
	postalCodeRegex: string | null // GeoNames

	// Display
	emoji: string // Computed from ISO2
	emojiU: string // Computed from ISO2
	flagUrl: string // flagcdn.com SVG URL
	translations: Record<string, string> // CLDR (top ~20 languages for API, full set in raw file)

	// Culture
	drivingSide: string // Wikidata ("left" | "right")
	measurementSystem: string // CLDR ("metric" | "US" | "UK")
	firstDayOfWeek: string // CLDR ("mon" | "sun" | "sat" | "fri")
	timeFormat: string // CLDR preferred ("h" = 12h, "H" = 24h)
}
```

Fields in raw file only (not served by API):

- `motto: string | null` -- Wikidata
- `anthem: string | null` -- Wikidata
- `coatOfArmsUrl: string | null` -- Wikidata
- `independenceDate: string | null` -- Wikidata
- `literacy: number | null` -- CLDR

### states.json

```typescript
type State = {
	// Identity
	name: string // GeoNames admin1
	iso2: string // GeoNames admin1 (state code only, e.g. "CA")
	iso31662: string // Computed "{countryCode}-{stateCode}"
	countryCode: string // Parsed from GeoNames admin1
	countryName: string // Derived from countries data
	geonameId: number // GeoNames admin1
	wikiDataId: string // Wikidata

	// Geography
	latitude: string // Wikidata P625
	longitude: string // Wikidata P625
	timezone: string // Wikidata P421 (primary IANA tz ID)
	capital: string | null // Wikidata P36

	// Demographics
	population: number | null // Wikidata P1082
	type: string // Wikidata P31 label ("state", "province", "prefecture", etc.)

	// Display
	native: string | null // GeoNames alternateNames (native language)
	translations: Record<string, string> // GeoNames alternateNames (filtered by geonameId)
}
```

### cities.json

```typescript
type City = {
	name: string // GeoNames
	countryCode: string // GeoNames
	countryName: string // Derived
	stateCode: string // GeoNames admin1_code
	stateName: string // Derived from states data
	latitude: string // GeoNames
	longitude: string // GeoNames
	population: number // GeoNames
	timezone: string // GeoNames (IANA tz ID)
	geonameId: number // GeoNames
}
```

### timezones.json

```typescript
type TimezoneEntry = {
	timezone: string // IANA ID (e.g. "America/New_York")
	countryCodes: string[] // ISO2 codes this timezone applies to
	coordinates: string // IANA format (e.g. "+404251-0740023")
	comments: string // IANA comment (e.g. "Eastern (most areas)")
}
```

### currencies.json

```typescript
type CurrencyEntry = {
	code: string // ISO 4217 (e.g. "USD")
	name: string // CLDR displayName
	symbol: string // CLDR symbol (e.g. "$")
	decimals: number // ISO 4217 minor units
	countries: string[] // ISO2 codes using this currency
}
```

### checksums.json

```json
{
	"geonames/countryInfo.txt": "sha256:abc123...",
	"geonames/admin1CodesASCII.txt": "sha256:def456...",
	"geonames/cities500.zip": "sha256:789abc...",
	"geonames/alternateNamesV2.zip": "sha256:...",
	"cldr/version": "45",
	"iana/zone1970.tab": "sha256:...",
	"iso4217/list-one.xml": "sha256:...",
	"wikidata/countries.json": "sha256:...",
	"wikidata/states.json": "sha256:...",
	"lastUpdated": "2026-04-29T00:00:00Z"
}
```

## Pipeline Script

Single TypeScript script: `scripts/update.ts` (runs with Bun).

### Execution flow

```
1. Read checksums.json (previous run)
2. Fetch all upstream sources (HEAD requests first for ETag/Last-Modified where possible)
3. Compute SHA-256 of each fetched source
4. Compare against checksums.json
5. If nothing changed -> exit 0 (no commit)
6. If something changed:
   a. Parse changed sources
   b. Merge/join data from all sources
   c. Write output JSON files
   d. Update checksums.json
   e. Commit + push to geocoded-data
   f. Push data/ files to geocoded main branch
```

### Source fetching details

**GeoNames** (TSV files): download, parse tab-separated, map to typed objects.

**GeoNames alternateNamesV2.zip** (192MB): This is the heaviest source. Strategy:

- Download + unzip in /tmp
- Parse TSV, filter ONLY rows where geonameId matches our states (3,862 IDs)
- Extract translations keyed by ISO 639-1 language code
- Discard the rest (we don't need city translations -- city names are usually the same across languages)

**CLDR** (JSON from GitHub): fetch specific files from `unicode-org/cldr-json` repo. Pin to a specific CLDR version tag (e.g. `45.0.0`) so we control when to update.

**Wikidata** (SPARQL): two queries:

1. All countries: nationality, drivingSide, wikidataId, geonameId, flagImage, motto, anthem, coatOfArms, independenceDate
2. All first-level subdivisions with ISO 3166-2 code: population, area, capital, coordinates, timezone, type, wikidataId

Wikidata queries are idempotent but results change over time. We hash the query results to detect changes.

**IANA tzdata**: fetch `zone1970.tab`, parse.

**ISO 4217**: fetch XML from SIX Group, parse.

### Incremental diffing

For each source, we store its SHA-256 in `checksums.json`. On each run:

- Sources with unchanged hash: skip processing
- Sources with changed hash: re-process
- The final output JSON is always regenerated from all sources (since data joins span sources), but we only commit if the output actually differs from what's in git

### Error handling

- If any source fetch fails: log warning, use cached data from previous run, do NOT commit
- If Wikidata SPARQL times out: retry once, then use cached
- If alternateNames download fails: proceed without translations update
- Never commit partial/broken data

## GitHub Actions Workflow

### geocoded-data: daily cron

```yaml
name: Update Data

on:
  schedule:
    - cron: '0 4 * * *' # 4 AM UTC daily
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run scripts/update.ts
      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi
      - name: Commit and push
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "geocoded-data[bot]"
          git config user.email "bot@geocoded.me"
          git add -A
          git commit -m "data: update $(date -u +%Y-%m-%d)"
          git push
      - name: Push to geocoded
        if: steps.changes.outputs.changed == 'true'
        env:
          GEOCODED_DEPLOY_KEY: ${{ secrets.GEOCODED_DEPLOY_KEY }}
        run: |
          # Clone geocoded, copy data files, commit, push
          mkdir -p /tmp/geocoded
          git clone git@github.com:harryy2510/geocoded.git /tmp/geocoded
          cp data/*.json /tmp/geocoded/data/
          cd /tmp/geocoded
          git config user.name "geocoded-data[bot]"
          git config user.email "bot@geocoded.me"
          git add data/
          if ! git diff --cached --quiet; then
            git commit -m "data: update from geocoded-data $(date -u +%Y-%m-%d)"
            git push
          fi
```

### geocoded: seed on data change

Update the existing `seed.yml` path filter:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'data/*.json'
      - 'scripts/seed.ts'
```

The seed script in `geocoded` will be simplified: it no longer fetches from upstream. It reads `data/countries.json`, `data/states.json`, `data/cities.json` and transforms them into KV bulk format for upload.

## Migration Plan

### geocoded-data (new repo)

1. Initialize repo with `package.json`, `tsconfig.json`, `scripts/update.ts`
2. Implement source fetchers (GeoNames, CLDR, Wikidata, IANA, ISO 4217)
3. Implement data merging/joining logic
4. Implement checksum diffing
5. Run first full data generation
6. Set up GitHub Actions workflow
7. Configure deploy key for pushing to geocoded

### geocoded (existing repo)

1. Update `src/types.ts` with new/changed fields
2. Update `src/openapi.ts` schema to match
3. Rewrite `scripts/seed.ts` to read from `data/*.json` instead of fetching upstream
4. Update `.github/workflows/seed.yml` path filter
5. Update `data/` gitignore (un-ignore the JSON files so they're committed)
6. Update README, CLAUDE.md, landing page field lists
7. Add new API fields, ensure backward compatibility (no fields removed from API response)

### Backward compatibility

- Country: all existing fields preserved. `timezones` keeps the same `Timezone[]` object shape (zoneName, gmtOffset, gmtOffsetName, abbreviation, tzName) -- computed at build time from IANA data. No breaking change.
- State: `fipsCode`, `level`, `parentId` dropped. Everything else preserved or improved.
- City: all fields preserved, `population` restored, `geonameId` added.

## Dependencies

geocoded-data will have minimal deps:

- `bun` (runtime)
- No npm dependencies -- use built-in `fetch`, `crypto`, `fs`, `zlib`, `child_process` (for unzip)

## Secrets Required

### geocoded-data repo

- `GEOCODED_DEPLOY_KEY`: SSH deploy key with write access to `harryy2510/geocoded` repo

### geocoded repo (existing)

- `CLOUDFLARE_API_TOKEN`: already configured

## Decisions

1. **Timezone shape**: Keep the existing `Timezone[]` object shape (`zoneName`, `gmtOffset`, `gmtOffsetName`, `abbreviation`, `tzName`). Compute offsets and abbreviations at build time using `Intl.DateTimeFormat`. These are point-in-time snapshots (EST vs EDT depends on build date), same as the current dr5hn data. No breaking change.

2. **Translation scope**: Raw file gets all 766 CLDR locales. API serves top 30 languages by global speaker count (en, zh, hi, es, ar, bn, pt, ru, ja, pa, de, jv, ko, fr, te, mr, tr, ta, vi, ur, it, th, gu, pl, uk, ml, kn, my, nl, fil). Seed script in geocoded filters translations to this subset when building KV data.

3. **City count**: Raw file ships all cities500 (~232K). Geocoded API serves all of them -- KV can handle it (currently serves 154K from dr5hn). Users filter by country+state anyway so per-key size stays reasonable.

4. **State translations**: Use Wikidata SPARQL to get state names in top languages (lighter than 192MB alternateNames). Wikidata has good coverage for admin-1 divisions. If coverage gaps appear, add alternateNames as a fallback source later.
