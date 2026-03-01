# Geo API

A Cloudflare Worker serving country, state, city, and location data from KV storage. Built with [Hono](https://hono.dev) and deployed via [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

Data sourced from [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database).

## API

**Base URL:** `https://geo.harryy.me`

All endpoints return JSON with aggressive cache headers (`Cache-Control: public, max-age=31536000, immutable`).

### Authentication

All API endpoints (except the docs page at `/`) require an API key via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

To request an API key, email [contact@harryy.me](mailto:contact@harryy.me).

### Field Selection

Every endpoint supports an optional `?fields=` query parameter to return only specific fields. Pass a comma-separated list of field names:

```
GET /countries?fields=name,iso2,emoji
```

When omitted, all fields are returned.

### Location

| Endpoint | Description |
| --- | --- |
| `GET /location` | Get the caller's geo info (IP, city, country, coordinates, timezone, etc.) |

**Location fields:** `asn`, `asOrganization`, `city`, `colo`, `continent`, `country`, `ip`, `isEU`, `latitude`, `longitude`, `postalCode`, `region`, `regionCode`, `timezone`

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
# Your location info
curl -H "Authorization: Bearer YOUR_API_KEY" https://geo.harryy.me/location

# All countries, slim response
curl -H "Authorization: Bearer YOUR_API_KEY" https://geo.harryy.me/countries?fields=name,iso2,emoji

# Single country, full response
curl -H "Authorization: Bearer YOUR_API_KEY" https://geo.harryy.me/countries/US

# States for a country
curl -H "Authorization: Bearer YOUR_API_KEY" https://geo.harryy.me/countries/US/states?fields=name,iso2

# Cities for a state
curl -H "Authorization: Bearer YOUR_API_KEY" https://geo.harryy.me/countries/US/states/CA/cities?fields=name,population
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
