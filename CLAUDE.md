# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geo API: a Cloudflare Worker serving country, state, city, and location data from a D1 database. Built with Hono and deployed via Wrangler.

## Commands

- `bun dev`: start local dev server (wrangler dev)
- `bun run deploy`: deploy to Cloudflare
- `bun seed`: seed local D1 database from `data/*.json` files
- `bun seed:upload`: seed remote (production) D1 database
- `bun run types`: regenerate `worker-configuration.d.ts` (auto-generated, do not edit)
- `bun check`: run linting and formatting checks (oxlint + oxfmt)
- `bunx tsc --noEmit`: type-check
- `bunx wrangler d1 migrations apply geo-db --local`: apply migrations to local D1

## Architecture

**Runtime**: Cloudflare Worker with Hono router (`src/index.ts`)

**Storage**: Cloudflare D1 (`GEO_DB` binding) with these tables:

- `countries`: all countries (keyed by `iso2`)
- `states`: all states (indexed by `country_code`)
- `cities`: all cities (indexed by `country_code` + `state_code`)
- `timezones`: IANA timezone entries
- `currencies`: ISO 4217 currency entries
- `search_index`: FTS5 virtual table for full-text search across all entities

**Migrations**: SQL migration files in `migrations/`, applied via `wrangler d1 migrations apply`. Migrations are immutable (never edit an already-applied migration).

**Data pipeline**: The private `geocoded-data` repo runs a daily cron that fetches from official sources (GeoNames, CLDR, Wikidata, IANA, ISO 4217), diffs via checksums, and pushes updated `data/*.json` files to this repo's main branch. `scripts/seed.ts` reads from `data/*.json` files, maps fields to snake_case for D1 columns, and inserts into D1 via batched SQL. Pass `--remote` to seed the production database. A GitHub Actions workflow (`.github/workflows/seed.yml`) runs `bun seed:upload` on pushes to `data/*.json`, `scripts/seed.ts`, or `migrations/`.

**API routes** (all return JSON with aggressive cache headers):

- `GET /`: on docs domain shows interactive API docs; on API domain returns caller's geo info from Cloudflare `cf` properties, enriched with full country/state/city details from D1 (`countryInfo`, `stateInfo`, `cityInfo`)
- `GET /openapi.json`: OpenAPI 3.1 spec
- `GET /search?q=`: full-text search across countries, states, cities (always paginated, returns `{ data, meta }`)
- `GET /countries` / `GET /countries/:id`: lookup by iso2, iso3, or name
- `GET /countries/:country/states` / `.../:state`
- `GET /countries/:country/states/:state/cities` / `.../:city`

All list endpoints support `?limit=&offset=` for pagination (returns `{ data, meta }` wrapper with `total`, `limit`, `offset`, `hasMore`). When pagination params are omitted, the full array is returned directly.

All endpoints support an optional `?fields=` query parameter (comma-separated) to return only specific fields, e.g. `?fields=name,iso2`. Dot notation is supported for nested objects, e.g. `?fields=ip,countryInfo.name,countryInfo.iso2`. When omitted, all fields are returned.

## Code Conventions

- **Package manager**: bun (never npm/yarn)
- **Formatting/Linting**: oxfmt + oxlint (tabs, single quotes, no semicolons, trailing commas)
- **Types**: `type` keyword only, no `interface`. Inline type imports: `import { type Foo } from './bar'`
- **Auto-generated files**: never edit `worker-configuration.d.ts`
