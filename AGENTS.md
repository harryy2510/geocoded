# Repository Instructions

These instructions are the canonical guide for agents working in this repo. Claude Code, Codex, Gemini CLI, GitHub Copilot in VS Code, Cursor, Antigravity, Windsurf, OpenCode, Junie, and other tools should read this file first.

## Source Of Truth

- Keep project instructions in `AGENTS.md`.
- `CLAUDE.md` should only reference `AGENTS.md`.
- Use the global `agents` CLI to keep tool configs aligned.
- Enabled `agents` integrations are `codex`, `claude`, `gemini`, `copilot_vscode`, `cursor`, `antigravity`, `windsurf`, `opencode`, and `junie`.
- Commit `.agents/agents.json`, `.agents/README.md`, `.agents/skills/`, and `AGENTS.md`.
- Do not commit `.agents/local.json`, `.agents/generated/`, or materialized tool configs such as `.codex/`.
- After changing `.agents/` or `AGENTS.md`, run `agents sync`, then `agents sync --check`.

## Project Overview

Geocoded is a Cloudflare Worker API serving country, state, city, timezone, currency, search, and IP geolocation data from Cloudflare D1. The Worker uses Hono and serves an Astro site from `site/dist` through Cloudflare Workers static assets.

## Commands

- `bun install`: install dependencies.
- `bun dev`: start the Worker dev server with Wrangler.
- `bun run deploy`: deploy to Cloudflare. Only run when the user explicitly asks.
- `bun seed`: seed the local D1 database from `data/*.json`.
- `bun seed:upload`: seed the remote production D1 database. Only run when the user explicitly asks.
- `bun run types`: regenerate `worker-configuration.d.ts`. This file is generated, do not edit it by hand.
- `bun check`: run oxlint and oxfmt checks.
- `bun run fix`: run automatic lint and format fixes.
- `bunx tsc --noEmit`: type-check the Worker and seed script.
- `bunx wrangler d1 migrations apply geo-db --local`: apply D1 migrations locally.
- `cd site && bun run dev`: start the Astro site dev server.
- `cd site && bun run build`: build the Astro site.
- `cd site && bun run preview`: preview the Astro build.

## Architecture

- Worker entrypoint: `src/index.ts`.
- Route framework: Hono.
- Database binding: `GEO_DB`.
- Generated Worker types: `worker-configuration.d.ts`.
- Query layer: `src/db/queries.ts`.
- Shared API types: `src/types.ts`.
- OpenAPI spec: `src/openapi.ts`.
- Seed script: `scripts/seed.ts`.
- Data files: `data/*.json`.
- D1 migrations: `migrations/`.
- Astro site: `site/`.

D1 tables include `countries`, `states`, `cities`, `timezones`, `currencies`, and `search_index`. The search index is an FTS5 virtual table spanning searchable geographic entities.

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

All JSON responses use aggressive cache headers unless the route intentionally handles caller-specific data. List endpoints are always paginated and return `{ data, meta }`; when pagination params are omitted, `limit` defaults to 25 and `offset` defaults to 0. All endpoints support `?fields=` with comma-separated field names and dot notation for nested fields.

## Hard Rules

- Use Bun for this repo. Do not use npm, yarn, pnpm, or npx for project commands.
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

## Database And Data

- Use generated database and Worker types as the source of truth.
- Use migrations for schema changes.
- Index new foreign key columns and high-cardinality lookup columns.
- Keep identifiers lowercase and consistent with existing snake_case D1 columns.
- Prefer cursor pagination for large lists when adding new large endpoints.
- Use `ON CONFLICT` upserts instead of select-then-insert flows.
- Keep seed behavior deterministic and batch D1 writes where practical.

## Site Work

- The site is an Astro app under `site/`.
- Use the site package scripts from inside `site/`.
- Keep UI changes consistent with existing Astro, React, Tailwind, and component patterns.
- Build the site with `cd site && bun run build` before Worker deploy changes that depend on `site/dist`.

## Validation

Run the smallest meaningful verification for the change:

- Instruction or config changes: `agents sync --check` and `git diff --check`.
- Worker code changes: `bunx tsc --noEmit` and `bun check`.
- Site changes: `cd site && bun run build`.
- D1 behavior changes: apply local migrations, seed local D1 when practical, and smoke test affected endpoints through `bun dev`.

If a check is skipped, state why in the final response.
