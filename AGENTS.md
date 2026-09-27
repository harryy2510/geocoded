# Repository Instructions

These instructions are the canonical guide for agents working in this repo. Claude Code, Codex, Gemini CLI, GitHub Copilot in VS Code, Cursor, Antigravity, Windsurf, OpenCode, Junie, and other tools should read this file first.

## Source Of Truth

- Keep project instructions in `AGENTS.md`.
- `CLAUDE.md` should only reference `AGENTS.md`.

## Project Overview

Geocoded is a Bun workspace monorepo. It contains a Cloudflare Worker API serving country, state, city, timezone, currency, airline, airport, port, border-crossing, migration, statistics, search, and IP geolocation data from Cloudflare D1, an Astro docs site, and reusable client packages. The Worker uses Hono and serves the Astro site from `apps/site/dist` through Cloudflare Workers static assets.

## Commands

- `bun install`: install dependencies for all Bun workspaces.
- `bun dev`: start the Astro site dev server.
- `bun dev:api`: start the Worker dev server with Wrangler.
- `bun run deploy`: deploy to Cloudflare. Only run when the user explicitly asks.
- `bun seed`: seed the local D1 database from `data/*.json`.
- `bun seed:upload`: seed the remote production D1 database. Only run when the user explicitly asks.
- `bun run types`: regenerate `worker-configuration.d.ts`. This file is generated, do not edit it by hand.
- `bun build:site`: build the Astro site.
- `bun preview:site`: preview the Astro build.
- `bun run check`: the blocking gate. Runs `lint:check`, `format:check`, `test`, and `audit` without loading env files.
- `bun run lint:check`: type-aware oxlint with type checking, warnings denied.
- `bun run format:check`: oxfmt check.
- `bun run test`: Bun tests under `tests/`, with `--no-env-file`.
- `bun run audit`: knip scan for unused files, exports, and dependencies across all workspaces (`knip.json`).
- `bun run fix`: run automatic lint and format fixes.
- `bun run hooks:install`: install the lefthook git hooks (`lefthook.yml`). The user runs this; agents do not.
- `bun run hooks:validate`: validate `lefthook.yml`.
- `bun x --bun tsc --noEmit`: type-check the Worker and seed script.
- `cd apps/api && bun --bun wrangler d1 migrations apply geo-db --local`: apply D1 migrations locally.

## Architecture

- Workspace apps live under `apps/*`.
- Reusable packages live under `packages/*`.
- Worker package: `apps/api`.
- Worker entrypoint: `apps/api/src/index.ts`.
- Wrangler config: `apps/api/wrangler.jsonc`.
- Route framework: Hono.
- Database binding: `GEO_DB`.
- Generated Worker types: `worker-configuration.d.ts`.
- v1 router: `apps/api/src/v1/index.ts`.
- v1 query layer: `apps/api/src/v1/db/queries.ts`.
- v1 shared API types: `apps/api/src/v1/types.ts`.
- v1 OpenAPI builder: `apps/api/src/v1/openapi.ts`.
- v2 router and query foundations: `apps/api/src/v2/`.
- Shared site/API config defaults: `apps/api/src/site-config.ts`.
- Seed script: `apps/api/scripts/seed.ts`.
- Data files: `data/*.json`.
- D1 migrations: `migrations/`.
- Astro site: `apps/site`.
- TypeScript API client: `packages/client`.

D1 tables include `countries`, `states`, `cities`, `timezones`, `currencies`, `country_statistics`, `airlines`, `airports`, `ports`, `border_crossings`, `country_migration`, and `search_index`. The search index is an FTS5 virtual table spanning searchable geographic entities.

The private `geocoded-data` repo updates `data/*.json` through the data pipeline. This repo seeds D1 from those checked-in JSON files. A GitHub Actions workflow seeds D1 after relevant data, script, or migration changes.

## API Behavior

- `GET /`: on the docs domain, returns the docs site. On the API domain, returns Cloudflare caller geolocation enriched with D1 country, state, and city details.
- `GET /openapi.json`: OpenAPI 3.1 spec.
- `GET /search?q=`: full-text search, always paginated, returns `{ data, meta }`.
- `GET /countries` and `GET /countries/:id`: country list and lookup by ISO2, ISO3, or name.
- `GET /countries/:country/states` and `GET /countries/:country/states/:state`: state list and lookup.
- `GET /countries/:country/states/:state/cities` and `GET /countries/:country/states/:state/cities/:city`: city list and lookup.
- `GET /timezones` and `GET /timezones/:id`: IANA timezone list and lookup. Timezone IDs may contain slashes.
- `GET /currencies` and `GET /currencies/:code`: ISO 4217 currency list and lookup.
- `GET /v2/continents`, `/v2/regions`, `/v2/countries`, `/v2/states`, `/v2/cities`: v2 political/geographic collections with strict `filter[...]`, `q`, `sort`, pagination, and nested `fields`.
- `GET /v2/countries/:id`: country by ISO2, ISO3, or name.
- `GET /v2/states/:id`: state by name, ISO 3166-2 (`US-CA`), country-scoped id (`US:CA` or `US:California`), or state code. Shared identifiers return `409` with `matches`.
- `GET /v2/cities/:id`: city by name, GeoNames id, `country:name`, or `country:state:name`. Shared names return `409` with `matches`.
- `GET /v2/countries/:country/states` and `GET /v2/countries/:country/states/:state`: v2 state list and lookup scoped to a country. Country and state path segments accept name or ISO codes.
- `GET /v2/countries/:country/cities`, `GET /v2/countries/:country/states/:state/cities`, and `GET /v2/countries/:country/states/:state/cities/:city`: v2 city list and lookup scoped to a country or state.
- `GET /v2/timezones`, `/v2/currencies`, `/v2/airlines`, `/v2/airports`, `/v2/ports`, `/v2/border-crossings`: v2 reference and transport collections.
- `GET /v2/statistics`: v2 country statistics resource. Select individual statistics through `fields`, not `indicator`.
- `GET /v2/migrant-stocks`: v2 country migrant stock resource (international migrant stock per country).

All JSON responses use aggressive cache headers unless the route intentionally handles caller-specific data. List endpoints are always paginated and return `{ data, meta }`; when pagination params are omitted, `limit` defaults to 25 and `offset` defaults to 0. All endpoints support `?fields=` with comma-separated field names and dot notation for nested fields.

## Hard Rules

- Use Bun for this repo. Do not use npm, yarn, pnpm, or npx for project commands.
- Run package binaries through Bun, preferably with `bun --bun <bin>` or `bun x --bun <bin>`.
- Do not add tracked `.js`, `.mjs`, or `.cjs` source/config files. Use TypeScript.
- Prefer Bun runtime APIs over `node:*` imports in repo scripts and tests.
- Do not edit, create, overwrite, or delete `.env*` files.
- Do not edit generated files by hand, especially `worker-configuration.d.ts`.
- Do not edit existing migrations. Add a new timestamped migration for schema changes.
- Do not run remote migrations, production seed, deploy, or cache purge commands unless the user explicitly asks.
- Do not run `git push` unless the user explicitly asks in the current message.
- Do not add, remove, or change `package.json` scripts unless the user explicitly asks.
- Respect the current worktree. Never revert changes you did not make unless the user explicitly asks.

## Code Style

- TypeScript is strict. Prefer `type` over `interface`.
- Avoid `any` and avoid type assertions unless they are genuinely necessary.
- Use inline type imports, for example `import { type Foo } from './foo'`.
- Await, return, or explicitly void every promise.
- Prefer named exports except where framework files require defaults.
- Follow oxfmt formatting: tabs, single quotes, no semicolons, trailing commas only where configured.
- Keep route changes and query changes close to the existing Hono and D1 patterns.
- Prefer structured APIs and typed query helpers over ad hoc parsing.

## Tooling And Conventions

- Expected failures in API code (not found, ambiguous match, invalid input, upstream errors) use `neverthrow` `Result` / `ResultAsync` with typed `{ code, message }` errors. Throw only for programmer errors. Map a `Result` to an HTTP response at the route boundary.
- `oxlint` (`.oxlintrc.json`) is type-aware, denies warnings and unused disable directives, and bans `any` and `@ts-ignore` / `@ts-nocheck`. `oxfmt` owns formatting. Do not add ESLint, Prettier, Husky, or a separate type-check step to `check`.
- `knip` (`knip.json`) owns dead-code and dependency hygiene. Fix its findings instead of adding ignores.
- Git hooks come from `lefthook.yml` and are installed with `bun run hooks:install`. Pre-commit checks formatting and lint on staged files without modifying them. Pre-push runs `bun --no-env-file run check`.

## Database And Data

- Use generated database and Worker types as the source of truth.
- Use migrations for schema changes.
- Index new foreign key columns and high-cardinality lookup columns.
- Keep identifiers lowercase and consistent with existing snake_case D1 columns.
- Prefer cursor pagination for large lists when adding new large endpoints.
- Use `ON CONFLICT` upserts instead of select-then-insert flows.
- Keep seed behavior deterministic and batch D1 writes where practical.

## Site Work

- The site is an Astro app under `apps/site`.
- Use the site workspace scripts from the repo root with `bun run --filter @geocoded/site <script>`, or the root aliases `bun dev`, `bun build:site`, and `bun preview:site`.
- Keep UI changes consistent with existing Astro, React, Tailwind, and component patterns.
- Build the site with `bun build:site` before Worker deploy changes that depend on `apps/site/dist`.

## Package Work

- Reusable client packages belong under `packages/*`.
- Keep shared client logic out of `apps/site/src` when it can be reused by other clients.
- The default TypeScript client package is `@geocoded/client` in `packages/client`.
- App workspaces can depend on internal packages with `workspace:*`.

## Validation

Run the smallest meaningful verification for the change:

- Instruction or config changes: `git diff --check`.
- Worker code changes: `bun x --bun tsc --noEmit` and `bun run check`.
- Site changes: `bun build:site`.
- D1 behavior changes: apply local migrations, seed local D1 when practical, and smoke test affected endpoints through `bun dev:api`.

If a check is skipped, state why in the final response.
