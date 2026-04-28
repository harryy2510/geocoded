<p align="center">
  <h1 align="center">Geocoded</h1>
  <p align="center">
    <strong>Free geolocation REST API on Cloudflare Workers.</strong>
  </p>
  <p align="center">
    Countries, states, cities, IP lookup -- all from KV storage.
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

```
+--------------------------------------------------------------------------+
|                                                                          |
|   Base URL:          https://api.geocoded.me                             |
|   Interactive docs:  https://geocoded.me  (OpenAPI 3.1 + Scalar)         |
|                                                                          |
+--------------------------------------------------------------------------+
```

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
curl https://api.geocoded.me/countries/US/states/CA/cities?fields=name,population
```

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Caller's geo info from IP, enriched with country/state/city data |
| `GET` | `/countries` | List all countries |
| `GET` | `/countries/:id` | Country by iso2, iso3, or name |
| `GET` | `/countries/:country/states` | States for a country |
| `GET` | `/countries/:country/states/:state` | State by iso2 or name |
| `GET` | `/countries/:country/states/:state/cities` | Cities for a state |
| `GET` | `/countries/:country/states/:state/cities/:city` | City by name |

All responses are JSON with aggressive cache headers (`Cache-Control: public, max-age=31536000, immutable`).

---

## Field Selection

Every endpoint supports `?fields=` to return only what you need. Comma-separated, dot notation for nested objects:

```
GET /countries?fields=name,iso2,emoji
GET /?fields=ip,country,countryInfo.name,cityInfo.population
```

When omitted, all fields are returned.

---

## Available Fields

```
  LOCATION         COUNTRY              STATE              CITY
  --------         -------              -----              ----
  ip               name                 name               name
  country          iso2, iso3           iso2               stateCode
  city             emoji                countryCode        countryCode
  region           capital              type               countryName
  regionCode       currency             latitude           stateName
  latitude         currencySymbol       longitude          latitude
  longitude        phoneCode            timezone           longitude
  postalCode       population           population         timezone
  timezone         areaSqKm, gdp        translations
  continent        region, subregion
  isEU             timezones, tld
  asn              translations
  asOrganization
  countryInfo *
  stateInfo *
  cityInfo *
```

\* Full nested objects from KV, same shape as their standalone endpoints.

---

## Self-Hosting

```bash
bun install
bun dev             # local dev server
bun seed            # generate KV bulk files only
bun seed:upload     # generate + upload to KV + purge edge cache
bun run deploy      # deploy to Cloudflare
```

The seed script fetches upstream data from [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database), converts to camelCase, and writes KV bulk JSON files. When run with `--upload`, it also purges the Cloudflare edge cache so new data is served immediately (requires `CLOUDFLARE_API_TOKEN`).

A GitHub Actions workflow (`.github/workflows/seed.yml`) auto-runs `bun seed:upload` on changes to `scripts/seed.ts`.

---

## Data & License

The geographic data is sourced from [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) and licensed under the [Open Database License (ODbL v1.0)](https://opendatacommons.org/licenses/odbl/).

You are free to use, share, and modify the data as long as you: **attribute** the source, **share-alike** any derivative databases under ODbL, and **keep open** (no technical restrictions that limit access).

API responses are "Produced Works" under ODbL and are not subject to the share-alike requirement.

The API source code is MIT licensed.
