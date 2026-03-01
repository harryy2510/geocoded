# Geo API

A Cloudflare Worker serving country, state, and city data from KV storage. Built with [Hono](https://hono.dev) and deployed via [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

Data sourced from [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database).

## API

All endpoints return JSON with aggressive cache headers (`Cache-Control: public, max-age=31536000, immutable`).

### Field Selection

Every endpoint supports an optional `?fields=` query parameter to return only specific fields. Pass a comma-separated list of field names:

```
GET /countries?fields=name,iso2,emoji
```

When omitted, all fields are returned.

### Countries

| Endpoint | Description |
| --- | --- |
| `GET /countries` | List all countries |
| `GET /countries/:id` | Get a country by iso2, iso3, or name |

**Country fields:** `areaSqKm`, `capital`, `currency`, `currencyName`, `currencySymbol`, `emoji`, `emojiU`, `gdp`, `iso2`, `iso3`, `latitude`, `longitude`, `name`, `nationality`, `native`, `numericCode`, `phoneCode`, `population`, `postalCodeFormat`, `postalCodeRegex`, `region`, `subregion`, `timezones`, `tld`, `translations`, `wikiDataId`

### States

| Endpoint | Description |
| --- | --- |
| `GET /countries/:country/states` | List states for a country |
| `GET /countries/:country/states/:state` | Get a state by iso2 or name |

**State fields:** `countryCode`, `countryName`, `fipsCode`, `iso2`, `iso31662`, `latitude`, `level`, `longitude`, `name`, `native`, `parentId`, `population`, `timezone`, `translations`, `type`, `wikiDataId`

### Cities

| Endpoint | Description |
| --- | --- |
| `GET /countries/:country/states/:state/cities` | List cities for a state |
| `GET /countries/:country/states/:state/cities/:city` | Get a city by name |

**City fields:** `countryCode`, `countryName`, `latitude`, `level`, `longitude`, `name`, `native`, `parentId`, `population`, `stateCode`, `stateName`, `timezone`, `translations`, `type`, `wikiDataId`

### Examples

```bash
# All countries, slim response
curl https://geo.example.com/countries?fields=name,iso2,emoji

# Single country, full response
curl https://geo.example.com/countries/US

# Single country, just the name
curl https://geo.example.com/countries/US?fields=name

# States for a country
curl https://geo.example.com/countries/US/states?fields=name,iso2

# Cities for a state
curl https://geo.example.com/countries/US/states/CA/cities?fields=name,population
```

## Development

```bash
bun install
bun dev        # start local dev server
```

## Data Pipeline

The seed script fetches upstream data, converts to camelCase, and writes KV bulk JSON files:

```bash
bun seed            # generate bulk files only
bun seed:upload     # generate + upload to Cloudflare KV
```

The namespace ID is read from `wrangler.jsonc` via `--binding GEO_KV` — no need to pass it manually.

A GitHub Actions workflow (`.github/workflows/seed.yml`) runs `bun seed:upload` automatically on pushes to `scripts/seed.ts`.

## Deployment

```bash
bun run deploy
```
