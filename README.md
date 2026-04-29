<p align="center">
  <h1 align="center">Geocoded</h1>
  <p align="center">
    <strong>Free geolocation REST API on Cloudflare Workers.</strong>
  </p>
  <p align="center">
    Countries, states, cities, IP lookup, and full-text search. All from D1.
  </p>
  <p align="center">
    <code>252 countries</code> · <code>3,800+ states</code> · <code>230,000+ cities</code>
  </p>
</p>

<p align="center">
  <a href="https://geocoded.me"><img src="https://img.shields.io/badge/Live-geocoded.me-000000?style=flat-square&logo=safari&logoColor=white" alt="Live"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers"></a>
  <a href="https://hono.dev"><img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun"></a>
</p>

---

## Features

- IP geolocation: resolve the caller's country, state, city from Cloudflare's edge
- Country, state, city lookup with nested hierarchical routes
- Full-text search across all entities via FTS5
- Field selection (`?fields=`) on every endpoint (return only what you need)
- Pagination (`?limit=&offset=`) on all list endpoints
- Aggressive edge caching (1-year immutable `Cache-Control`)
- Zero cold starts with Cloudflare Smart Placement

---

## Quick Start

```bash
# Your location from IP
curl https://api.geocoded.me

# All countries (slim)
curl https://api.geocoded.me/countries?fields=name,iso2,emoji

# States in a country
curl https://api.geocoded.me/countries/IN/states?fields=name,iso2

# Cities in a state
curl https://api.geocoded.me/countries/US/states/CA/cities?fields=name,timezone

# Search
curl "https://api.geocoded.me/search?q=new+york"
```

---

## API Endpoints

| Method | Path                                             | Description                                                      |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| `GET`  | `/`                                              | Caller's geo info from IP, enriched with country/state/city data |
| `GET`  | `/search?q=`                                     | Full-text search across countries, states, cities                |
| `GET`  | `/countries`                                     | List all countries                                               |
| `GET`  | `/countries/:id`                                 | Country by iso2, iso3, or name                                   |
| `GET`  | `/countries/:country/states`                     | States for a country                                             |
| `GET`  | `/countries/:country/states/:state`              | State by iso2 or name                                            |
| `GET`  | `/countries/:country/states/:state/cities`       | Cities for a state                                               |
| `GET`  | `/countries/:country/states/:state/cities/:city` | City by name                                                     |
| `GET`  | `/timezones`                                     | List all IANA timezones                                          |
| `GET`  | `/timezones/:id`                                 | Timezone by IANA ID (e.g. America/New_York)                      |
| `GET`  | `/currencies`                                    | List all ISO 4217 currencies                                     |
| `GET`  | `/currencies/:code`                              | Currency by code (e.g. USD, EUR)                                 |

All responses are JSON with `Cache-Control: public, max-age=31536000, immutable`.

---

## Field Selection

Every endpoint supports `?fields=` to return only what you need. Comma-separated, dot notation for nested objects:

```
GET /countries?fields=name,iso2,emoji
GET /?fields=ip,country,countryInfo.name,cityInfo.name
```

When omitted, all fields are returned.

---

## Pagination

All list endpoints (`/countries`, `/states`, `/cities`, `/timezones`, `/currencies`, `/search`) support pagination. Two styles are available:

**Offset-based:**

```
GET /countries?limit=10&offset=20
```

**Cursor-based:**

```
GET /countries?limit=10&cursor=<opaque_cursor>
```

When any pagination param is provided, the response wraps in:

```json
{
  "data": [...],
  "meta": {
    "total": 252,
    "limit": 10,
    "offset": 20,
    "hasMore": true,
    "cursor": "MzA"
  }
}
```

Pass the `cursor` value from `meta` as `?cursor=` to fetch the next page.

- `limit` defaults to 25, max 250
- `offset` and `cursor` are mutually exclusive (use one or the other)
- When no pagination params are provided, the full array is returned directly (no wrapper)
- `/search` is always paginated

---

## Self-Hosting

### Prerequisites

- [Bun](https://bun.sh) (runtime and package manager)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (included as dev dependency)

### Setup

```bash
# Clone and install
git clone https://github.com/harryy2510/geocoded.git
cd geocoded
bun install

# Copy the example config and customize it
cp wrangler.example.jsonc wrangler.jsonc

# Create a D1 database
bunx wrangler d1 create geo-db
# Copy the database_id from the output into wrangler.jsonc

# Apply migrations locally
bunx wrangler d1 migrations apply geo-db --local

# Seed local database
bun seed

# Start dev server
bun dev
```

### Configuration

All site-specific values live in `wrangler.jsonc` under the `vars` section:

| Variable     | Description                          | Example                                  |
| ------------ | ------------------------------------ | ---------------------------------------- |
| `SITE_NAME`  | Name shown in landing page and docs  | `Geocoded`                               |
| `SITE_URL`   | Public URL for the landing page      | `https://geocoded.me`                    |
| `API_URL`    | Public URL for the API               | `https://api.geocoded.me`                |
| `GITHUB_URL` | GitHub repo URL (shown in UI)        | `https://github.com/harryy2510/geocoded` |
| `CACHE_ZONE` | Cloudflare zone name for cache purge | `geocoded.me`                            |

When running locally without custom vars, the app defaults to `http://localhost:8787` for all URLs.

### Cloudflare API Token

For seeding remote D1 and deploying, you need an API token. Go to **My Profile** > **API Tokens** > **Create Token** > **Create Custom Token** with these permissions:

| Permission                | Access |
| ------------------------- | ------ |
| Account / D1              | Edit   |
| Account / Workers Scripts | Edit   |

Set for local use:

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-token-here"
```

For cache purge during seeding, also set:

```bash
export CACHE_ZONE="your-domain.com"
```

For GitHub Actions, add `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `CACHE_ZONE` as repository secrets under **Settings** > **Secrets and variables** > **Actions**.

---

## Deployment

```bash
# Apply migrations to production D1
bunx wrangler d1 migrations apply geo-db --remote

# Seed production database
bun seed:upload

# Deploy the Worker
bun run deploy
```

For custom domains, uncomment the `routes` section in `wrangler.jsonc` and set `workers_dev` to `false`. Otherwise, the Worker is available at the default `workers.dev` subdomain.

---

## Data Sources

Geographic data compiled from multiple official, institutional sources:

| Source                                                                                               | License         | What                                                |
| ---------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------- |
| [GeoNames](https://www.geonames.org/)                                                                | CC BY 4.0       | Countries, states, cities, coordinates, timezones   |
| [Unicode CLDR](https://cldr.unicode.org/)                                                            | Unicode License | Translations, currency symbols, measurement systems |
| [Wikidata](https://www.wikidata.org/)                                                                | CC0             | Nationality, driving side, flags, state capitals    |
| [IANA](https://www.iana.org/time-zones)                                                              | Public Domain   | Timezone definitions                                |
| [ISO 4217](https://www.six-group.com/en/products-services/financial-information/data-standards.html) | Free to use     | Currency codes and names                            |

The combined dataset is available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (the most restrictive component license). Attribution is required when redistributing the data.

---

## License

MIT
