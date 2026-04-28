<p align="center">
  <h1 align="center">Geocoded</h1>
  <p align="center">
    <strong>Free geolocation REST API on Cloudflare Workers.</strong>
  </p>
  <p align="center">
    Countries, states, cities, IP lookup, full-text search -- all from D1.
  </p>
  <p align="center">
    <code>250 countries</code> · <code>5,000+ states</code> · <code>150,000+ cities</code>
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

- IP geolocation -- resolve the caller's country, state, city from Cloudflare's edge
- Country, state, city lookup with nested hierarchical routes
- Full-text search across all entities via FTS5
- Field selection (`?fields=`) on every endpoint -- return only what you need
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

All list endpoints (`/countries`, `/states`, `/cities`, `/search`) support pagination:

```
GET /countries?limit=10&offset=20
```

When `limit` or `offset` is provided, the response wraps in:

```json
{
  "data": [...],
  "meta": { "total": 250, "limit": 10, "offset": 20, "hasMore": true }
}
```

- `limit` defaults to 25, max 250
- `offset` defaults to 0
- When neither is provided, the full array is returned directly (no wrapper)
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
git clone https://github.com/harimandir/geocoded.git
cd geocoded
bun install

# Create a D1 database
bunx wrangler d1 create geo-db

# Update database_id in wrangler.jsonc with the ID from the output above

# Apply migrations locally
bunx wrangler d1 migrations apply geo-db --local

# Seed local database
bun seed

# Start dev server
bun dev
```

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

For GitHub Actions, add both as repository secrets under **Settings** > **Secrets and variables** > **Actions**.

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

Update the `routes` in `wrangler.jsonc` to match your own domain, or remove them and set `workers_dev: true` to use the default `workers.dev` subdomain.

---

## Data Source

Geographic data sourced from [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database), licensed under the [Open Database License (ODbL v1.0)](https://opendatacommons.org/licenses/odbl/).

You are free to use, share, and modify the data as long as you: **attribute** the source, **share-alike** any derivative databases under ODbL, and **keep open** (no technical restrictions that limit access).

API responses are "Produced Works" under ODbL and are not subject to the share-alike requirement.

---

## License

MIT
