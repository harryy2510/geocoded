# KV to D1 Migration + Search & Pagination

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace KV storage with D1 (SQLite) for all geo data, add full-text search endpoint, and add pagination to list endpoints -- while keeping all existing response shapes identical.

**Architecture:** Three D1 tables (`countries`, `states`, `cities`) with JSON columns for complex fields (`timezones`, `translations`). FTS5 virtual table `search_index` spans all three entity types for `/search?q=`. Existing route handlers swap `KV.get()` for `D1.prepare()` queries. Seed script writes to D1 instead of KV. Pagination uses `limit`/`offset` query params on list endpoints, returning a wrapper `{ data, meta }` only when pagination params are present (backwards-compatible).

**Tech Stack:** Cloudflare D1, Hono, SQLite FTS5, Bun

---

## File Structure

| File                         | Action  | Responsibility                                                            |
| ---------------------------- | ------- | ------------------------------------------------------------------------- |
| `src/db/schema.sql`          | Create  | D1 schema: tables, indexes, FTS5 virtual table                            |
| `src/db/queries.ts`          | Create  | All D1 query functions (one per route handler need)                       |
| `src/index.ts`               | Modify  | Replace KV calls with D1 query calls, add `/search` route, add pagination |
| `src/openapi.ts`             | Modify  | Add `/search` endpoint docs, add pagination params + response schema      |
| `src/types.ts`               | Modify  | Add `SearchResult` and `PaginatedResponse` types                          |
| `scripts/seed.ts`            | Rewrite | Fetch upstream data, insert into D1 via batch SQL                         |
| `wrangler.jsonc`             | Modify  | Add `d1_databases` binding, keep KV for now                               |
| `.github/workflows/seed.yml` | Modify  | Update seed command for D1                                                |

---

### Task 1: D1 Schema

**Files:**

- Create: `src/db/schema.sql`

- [ ] **Step 1: Write the schema file**

```sql
-- Countries
CREATE TABLE IF NOT EXISTS countries (
  iso2 TEXT PRIMARY KEY,
  iso3 TEXT NOT NULL,
  name TEXT NOT NULL,
  native TEXT NOT NULL,
  capital TEXT NOT NULL,
  currency TEXT NOT NULL,
  currency_name TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  tld TEXT NOT NULL,
  phone_code TEXT NOT NULL,
  numeric_code TEXT NOT NULL,
  nationality TEXT NOT NULL,
  region TEXT NOT NULL,
  subregion TEXT NOT NULL,
  emoji TEXT NOT NULL,
  emoji_u TEXT NOT NULL,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  area_sq_km REAL NOT NULL,
  population INTEGER NOT NULL,
  gdp REAL,
  postal_code_format TEXT,
  postal_code_regex TEXT,
  wiki_data_id TEXT NOT NULL,
  timezones TEXT NOT NULL DEFAULT '[]',
  translations TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_countries_iso3 ON countries(iso3);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name COLLATE NOCASE);

-- States
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  iso2 TEXT NOT NULL,
  iso3166_2 TEXT NOT NULL,
  fips_code TEXT NOT NULL,
  name TEXT NOT NULL,
  native TEXT NOT NULL,
  type TEXT NOT NULL,
  level TEXT,
  parent_id TEXT,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  timezone TEXT NOT NULL,
  population INTEGER,
  wiki_data_id TEXT NOT NULL,
  translations TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (country_code) REFERENCES countries(iso2)
);

CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_code);
CREATE INDEX IF NOT EXISTS idx_states_iso2 ON states(country_code, iso2);
CREATE INDEX IF NOT EXISTS idx_states_name ON states(country_code, name COLLATE NOCASE);

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  timezone TEXT NOT NULL,
  FOREIGN KEY (country_code) REFERENCES countries(iso2)
);

CREATE INDEX IF NOT EXISTS idx_cities_country_state ON cities(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(country_code, state_code, name COLLATE NOCASE);

-- Full-text search across all entities
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  name,
  type,
  country_code,
  state_code,
  extra,
  content='',
  tokenize='unicode61'
);
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.sql
git commit -m "feat: add D1 schema for countries, states, cities with FTS5 search index"
```

---

### Task 2: Wrangler D1 Binding

**Files:**

- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create the D1 database**

```bash
bunx wrangler d1 create geo-db
```

Copy the `database_id` from the output.

- [ ] **Step 2: Add D1 binding to wrangler.jsonc**

Add after the `kv_namespaces` block in `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "GEO_DB",
    "database_name": "geo-db",
    "database_id": "<paste-database-id-here>"
  }
]
```

- [ ] **Step 3: Regenerate worker types**

```bash
bun run types
```

This updates `worker-configuration.d.ts` to include the `GEO_DB: D1Database` binding on the `Env` type.

- [ ] **Step 4: Verify types compile**

```bash
bunx tsc --noEmit
```

Expected: no errors (existing code still uses KV which is still bound).

- [ ] **Step 5: Commit**

```bash
git add wrangler.jsonc worker-configuration.d.ts
git commit -m "feat: add D1 database binding for geo-db"
```

---

### Task 3: D1 Query Layer

**Files:**

- Create: `src/db/queries.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Add new types to `src/types.ts`**

Append to the end of the file:

```ts
export type SearchResult = {
	type: 'country' | 'state' | 'city'
	name: string
	countryCode: string
	countryName: string
	stateCode: string | null
	stateName: string | null
}

export type PaginatedResponse<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}
```

- [ ] **Step 2: Write `src/db/queries.ts`**

```ts
import type { City, Country, SearchResult, State } from '../types'

type Row = Record<string, unknown>

function rowToCountry(row: Row): Country {
	return {
		areaSqKm: row.area_sq_km as number,
		capital: row.capital as string,
		currency: row.currency as string,
		currencyName: row.currency_name as string,
		currencySymbol: row.currency_symbol as string,
		emoji: row.emoji as string,
		emojiU: row.emoji_u as string,
		gdp: row.gdp as number | null,
		iso2: row.iso2 as string,
		iso3: row.iso3 as string,
		latitude: row.latitude as string,
		longitude: row.longitude as string,
		name: row.name as string,
		nationality: row.nationality as string,
		native: row.native as string,
		numericCode: row.numeric_code as string,
		phoneCode: row.phone_code as string,
		population: row.population as number,
		postalCodeFormat: row.postal_code_format as string | null,
		postalCodeRegex: row.postal_code_regex as string | null,
		region: row.region as string,
		subregion: row.subregion as string,
		timezones: JSON.parse(row.timezones as string),
		tld: row.tld as string,
		translations: JSON.parse(row.translations as string),
		wikiDataId: row.wiki_data_id as string
	}
}

function rowToState(row: Row): State {
	return {
		countryCode: row.country_code as string,
		countryName: row.country_name as string,
		fipsCode: row.fips_code as string,
		iso2: row.iso2 as string,
		iso31662: row.iso3166_2 as string,
		latitude: row.latitude as string,
		level: row.level as string | null,
		longitude: row.longitude as string,
		name: row.name as string,
		native: row.native as string,
		parentId: row.parent_id as string | null,
		population: row.population as number | null,
		timezone: row.timezone as string,
		translations: JSON.parse(row.translations as string),
		type: row.type as string,
		wikiDataId: row.wiki_data_id as string
	}
}

function rowToCity(row: Row): City {
	return {
		countryCode: row.country_code as string,
		countryName: row.country_name as string,
		latitude: row.latitude as string,
		longitude: row.longitude as string,
		name: row.name as string,
		stateCode: row.state_code as string,
		stateName: row.state_name as string,
		timezone: row.timezone as string
	}
}

export async function getAllCountries(db: D1Database): Promise<Country[]> {
	const { results } = await db
		.prepare('SELECT * FROM countries ORDER BY name')
		.all()
	return results.map(rowToCountry)
}

export async function getCountryById(
	db: D1Database,
	id: string
): Promise<Country | null> {
	const upper = id.toUpperCase()
	const lower = id.toLowerCase()
	const row = await db
		.prepare(
			'SELECT * FROM countries WHERE iso2 = ?1 OR iso3 = ?1 OR LOWER(name) = ?2 LIMIT 1'
		)
		.bind(upper, lower)
		.first()
	return row ? rowToCountry(row) : null
}

export async function getStatesByCountry(
	db: D1Database,
	countryCode: string
): Promise<State[]> {
	const { results } = await db
		.prepare('SELECT * FROM states WHERE country_code = ? ORDER BY name')
		.bind(countryCode.toUpperCase())
		.all()
	return results.map(rowToState)
}

export async function getStateByIso2OrName(
	db: D1Database,
	countryCode: string,
	stateId: string
): Promise<State | null> {
	const cc = countryCode.toUpperCase()
	const upper = stateId.toUpperCase()
	const lower = stateId.toLowerCase()
	const row = await db
		.prepare(
			'SELECT * FROM states WHERE country_code = ?1 AND (iso2 = ?2 OR LOWER(name) = ?3) LIMIT 1'
		)
		.bind(cc, upper, lower)
		.first()
	return row ? rowToState(row) : null
}

export async function getCitiesByCountryState(
	db: D1Database,
	countryCode: string,
	stateCode: string
): Promise<City[]> {
	const { results } = await db
		.prepare(
			'SELECT * FROM cities WHERE country_code = ? AND state_code = ? ORDER BY name'
		)
		.bind(countryCode.toUpperCase(), stateCode.toUpperCase())
		.all()
	return results.map(rowToCity)
}

export async function getCityByName(
	db: D1Database,
	countryCode: string,
	stateCode: string,
	cityName: string
): Promise<City | null> {
	const row = await db
		.prepare(
			'SELECT * FROM cities WHERE country_code = ?1 AND state_code = ?2 AND LOWER(name) = ?3 LIMIT 1'
		)
		.bind(
			countryCode.toUpperCase(),
			stateCode.toUpperCase(),
			cityName.toLowerCase()
		)
		.first()
	return row ? rowToCity(row) : null
}

export async function getCountriesPaginated(
	db: D1Database,
	limit: number,
	offset: number
): Promise<{ rows: Country[]; total: number }> {
	const [{ results }, countRow] = await db.batch([
		db
			.prepare('SELECT * FROM countries ORDER BY name LIMIT ? OFFSET ?')
			.bind(limit, offset),
		db.prepare('SELECT COUNT(*) as total FROM countries')
	])
	const total = (countRow.results[0] as Row).total as number
	return { rows: results.map(rowToCountry), total }
}

export async function getStatesPaginated(
	db: D1Database,
	countryCode: string,
	limit: number,
	offset: number
): Promise<{ rows: State[]; total: number }> {
	const cc = countryCode.toUpperCase()
	const [{ results }, countRow] = await db.batch([
		db
			.prepare(
				'SELECT * FROM states WHERE country_code = ? ORDER BY name LIMIT ? OFFSET ?'
			)
			.bind(cc, limit, offset),
		db
			.prepare('SELECT COUNT(*) as total FROM states WHERE country_code = ?')
			.bind(cc)
	])
	const total = (countRow.results[0] as Row).total as number
	return { rows: results.map(rowToState), total }
}

export async function getCitiesPaginated(
	db: D1Database,
	countryCode: string,
	stateCode: string,
	limit: number,
	offset: number
): Promise<{ rows: City[]; total: number }> {
	const cc = countryCode.toUpperCase()
	const sc = stateCode.toUpperCase()
	const [{ results }, countRow] = await db.batch([
		db
			.prepare(
				'SELECT * FROM cities WHERE country_code = ? AND state_code = ? ORDER BY name LIMIT ? OFFSET ?'
			)
			.bind(cc, sc, limit, offset),
		db
			.prepare(
				'SELECT COUNT(*) as total FROM cities WHERE country_code = ? AND state_code = ?'
			)
			.bind(cc, sc)
	])
	const total = (countRow.results[0] as Row).total as number
	return { rows: results.map(rowToCity), total }
}

export async function search(
	db: D1Database,
	query: string,
	limit: number,
	offset: number
): Promise<{ rows: SearchResult[]; total: number }> {
	const ftsQuery = query.trim().replace(/"/g, '""') + '*'
	const [{ results }, countRow] = await db.batch([
		db
			.prepare(
				'SELECT name, type, country_code, state_code, extra FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT ? OFFSET ?'
			)
			.bind(ftsQuery, limit, offset),
		db
			.prepare(
				'SELECT COUNT(*) as total FROM search_index WHERE search_index MATCH ?'
			)
			.bind(ftsQuery)
	])
	const rows: SearchResult[] = results.map((row) => {
		const r = row as Row
		return {
			type: r.type as 'country' | 'state' | 'city',
			name: r.name as string,
			countryCode: r.country_code as string,
			countryName: (r.extra as string) || '',
			stateCode: (r.state_code as string) || null,
			stateName: null
		}
	})
	return { rows, total }
}
```

- [ ] **Step 3: Verify types compile**

```bash
bunx tsc --noEmit
```

Expected: passes (D1Database comes from `worker-configuration.d.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/db/queries.ts
git commit -m "feat: add D1 query layer with pagination and FTS5 search"
```

---

### Task 4: Migrate Route Handlers to D1

**Files:**

- Modify: `src/index.ts`

- [ ] **Step 1: Replace the entire `src/index.ts`**

Replace the full file with:

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
	getAllCountries,
	getCitiesByCountryState,
	getCitiesPaginated,
	getCityByName,
	getCountriesPaginated,
	getCountryById,
	getStateByIso2OrName,
	getStatesByCountry,
	getStatesPaginated,
	search
} from './db/queries'
import { docsHtml, scalarHtml } from './docs'
import logo from './logo.png'
import { openApiSpec } from './openapi'
import type { PaginatedResponse } from './types'

const app = new Hono<{ Bindings: Env }>()

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable'
} as const

function jsonResponse<T>(
	c: {
		json: (
			data: T,
			status?: number,
			headers?: Record<string, string>
		) => Response
	},
	data: T,
	status = 200
) {
	return c.json(data, status, CACHE_HEADERS)
}

app.use('*', cors())

function pickFields<T extends Record<string, unknown>>(
	data: T[],
	fields: string | undefined
): Partial<T>[]
function pickFields<T extends Record<string, unknown>>(
	data: T,
	fields: string | undefined
): Partial<T>
function pickFields<T extends Record<string, unknown>>(
	data: T | T[],
	fields: string | undefined
): Partial<T> | Partial<T>[] {
	if (!fields) return data
	const keys = fields.split(',').map((f) => f.trim())
	const pick = (obj: T): Partial<T> => {
		const result = {} as Record<string, unknown>
		for (const key of keys) {
			const dotIdx = key.indexOf('.')
			if (dotIdx === -1) {
				if (key in obj) {
					result[key] = obj[key]
				}
			} else {
				const top = key.slice(0, dotIdx)
				const rest = key.slice(dotIdx + 1)
				if (top in obj) {
					const val = obj[top]
					if (val && typeof val === 'object' && !Array.isArray(val)) {
						const existing = (result[top] ?? {}) as Record<string, unknown>
						const nested = pickFields(val as Record<string, unknown>, rest)
						result[top] = { ...existing, ...nested }
					} else {
						result[top] = val
					}
				}
			}
		}
		return result as Partial<T>
	}
	return Array.isArray(data) ? data.map(pick) : pick(data)
}

function parsePagination(c: {
	req: { query: (k: string) => string | undefined }
}): {
	limit: number
	offset: number
} | null {
	const rawLimit = c.req.query('limit')
	const rawOffset = c.req.query('offset')
	if (!rawLimit && !rawOffset) return null
	const limit = Math.min(Math.max(parseInt(rawLimit || '25', 10) || 25, 1), 250)
	const offset = Math.max(parseInt(rawOffset || '0', 10) || 0, 0)
	return { limit, offset }
}

function paginated<T>(
	data: T[],
	total: number,
	limit: number,
	offset: number
): PaginatedResponse<T> {
	return {
		data,
		meta: {
			total,
			limit,
			offset,
			hasMore: offset + limit < total
		}
	}
}

// --- Static Assets ---

app.get('/logo.png', (c) => {
	return c.body(logo, 200, {
		...CACHE_HEADERS,
		'Content-Type': 'image/png'
	})
})

// --- Docs (Scalar) ---

app.get('/openapi.json', (c) => {
	return c.json(openApiSpec)
})

app.get('/docs', (c) => {
	return c.html(scalarHtml)
})

app.get('/', async (c) => {
	const host = new URL(c.req.url).hostname
	if (host !== 'api.geocoded.me') return c.html(docsHtml)

	const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined
	const countryCode = cf?.country
	const regionCode = cf?.regionCode
	const cityName = cf?.city
	const db = c.env.GEO_DB

	const [countryInfo, stateInfo, cities] = await Promise.all([
		countryCode ? getCountryById(db, countryCode) : null,
		countryCode && regionCode
			? getStateByIso2OrName(db, countryCode, regionCode)
			: null,
		countryCode && regionCode
			? getCitiesByCountryState(db, countryCode, regionCode)
			: null
	])

	const cityInfo = cityName
		? cities?.find((ci) => ci.name.toLowerCase() === cityName.toLowerCase())
		: undefined

	const location = {
		asn: cf?.asn as number | undefined,
		asOrganization: cf?.asOrganization,
		city: cf?.city,
		cityInfo,
		colo: cf?.colo,
		continent: cf?.continent,
		country: countryCode,
		countryInfo,
		ip: c.req.header('cf-connecting-ip') ?? '',
		isEU: cf?.isEU === '1' ? true : cf?.isEU === '0' ? false : undefined,
		latitude: cf?.latitude,
		longitude: cf?.longitude,
		postalCode: cf?.postalCode,
		region: cf?.region,
		regionCode,
		stateInfo,
		timezone: cf?.timezone
	}
	return c.json(pickFields(location, c.req.query('fields')), 200, {
		'Cache-Control': 'private, no-store'
	})
})

// --- Search ---

app.get('/search', async (c) => {
	const q = c.req.query('q')
	if (!q || q.trim().length === 0) {
		return c.json({ error: 'Query parameter "q" is required' }, 400)
	}
	const limit = Math.min(
		Math.max(parseInt(c.req.query('limit') || '25', 10) || 25, 1),
		250
	)
	const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0)
	const { rows, total } = await search(c.env.GEO_DB, q, limit, offset)
	return jsonResponse(c, paginated(rows, total, limit, offset))
})

// --- Countries ---

app.get('/countries', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	const fields = c.req.query('fields')

	if (page) {
		const { rows, total } = await getCountriesPaginated(
			db,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}

	const countries = await getAllCountries(db)
	if (countries.length === 0)
		return c.json({ error: 'Countries not found' }, 404)
	return jsonResponse(c, pickFields(countries, fields))
})

app.get('/countries/:id', async (c) => {
	const country = await getCountryById(c.env.GEO_DB, c.req.param('id'))
	if (!country) return c.json({ error: 'Country not found' }, 404)
	return jsonResponse(c, pickFields(country, c.req.query('fields')))
})

// --- States ---

app.get('/countries/:country/states', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country')
	const page = parsePagination(c)
	const fields = c.req.query('fields')

	if (page) {
		const { rows, total } = await getStatesPaginated(
			db,
			countryCode,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}

	const states = await getStatesByCountry(db, countryCode)
	if (states.length === 0) return c.json({ error: 'States not found' }, 404)
	return jsonResponse(c, pickFields(states, fields))
})

app.get('/countries/:country/states/:state', async (c) => {
	const state = await getStateByIso2OrName(
		c.env.GEO_DB,
		c.req.param('country'),
		c.req.param('state')
	)
	if (!state) return c.json({ error: 'State not found' }, 404)
	return jsonResponse(c, pickFields(state, c.req.query('fields')))
})

// --- Cities ---

app.get('/countries/:country/states/:state/cities', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country')
	const stateCode = c.req.param('state')
	const page = parsePagination(c)
	const fields = c.req.query('fields')

	if (page) {
		const { rows, total } = await getCitiesPaginated(
			db,
			countryCode,
			stateCode,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}

	const cities = await getCitiesByCountryState(db, countryCode, stateCode)
	if (cities.length === 0) return c.json({ error: 'Cities not found' }, 404)
	return jsonResponse(c, pickFields(cities, fields))
})

app.get('/countries/:country/states/:state/cities/:city', async (c) => {
	const city = await getCityByName(
		c.env.GEO_DB,
		c.req.param('country'),
		c.req.param('state'),
		c.req.param('city')
	)
	if (!city) return c.json({ error: 'City not found' }, 404)
	return jsonResponse(c, pickFields(city, c.req.query('fields')))
})

export default app
```

Key changes from the original:

- Import D1 query functions instead of using KV directly
- Rename `json` helper to `jsonResponse` to avoid shadowing `c.json`
- Root `/` endpoint: uses `getCountryById` directly instead of fetching all countries then filtering; uses `getStateByIso2OrName` instead of fetching all states; still fetches all cities for the state to find by name (matching original behavior)
- All list endpoints: when `limit`/`offset` query params are present, return `{ data, meta }` wrapper; when absent, return plain array (backwards-compatible)
- New `/search` endpoint with required `q` param, optional `limit`/`offset`

- [ ] **Step 2: Verify types compile**

```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: migrate all route handlers from KV to D1 with pagination support"
```

---

### Task 5: Rewrite Seed Script for D1

**Files:**

- Rewrite: `scripts/seed.ts`

- [ ] **Step 1: Replace the entire seed script**

```ts
import { $ } from 'bun'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Country, State } from '../src/types'

const BASE_URL =
	'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master'
const SCHEMA_PATH = join(import.meta.dirname, '..', 'src', 'db', 'schema.sql')

type RawCountry = {
	id: number
	name: string
	iso3: string
	iso2: string
	numeric_code: string
	phonecode: string
	capital: string
	currency: string
	currency_name: string
	currency_symbol: string
	tld: string
	native: string
	population: number
	gdp: number | null
	region: string
	region_id: number
	subregion: string
	subregion_id: number
	nationality: string
	area_sq_km: number
	postal_code_format: string | null
	postal_code_regex: string | null
	timezones: {
		zoneName: string
		gmtOffset: number
		gmtOffsetName: string
		abbreviation: string
		tzName: string
	}[]
	translations: Record<string, string>
	latitude: string
	longitude: string
	emoji: string
	emojiU: string
	wikiDataId: string
}

type RawState = {
	id: number
	name: string
	country_id: number
	country_code: string
	country_name: string
	iso2: string
	iso3166_2: string
	fips_code: string
	type: string
	level: string | null
	parent_id: string | null
	native: string
	latitude: string
	longitude: string
	timezone: string
	translations: Record<string, string>
	wikiDataId: string
	population: number | null
}

type RawNestedCity = {
	id: number
	name: string
	latitude: string
	longitude: string
	timezone: string
}

type RawNestedState = {
	id: number
	name: string
	iso2: string
	cities: RawNestedCity[]
}

type RawCombinedCountry = {
	name: string
	iso2: string
	states: RawNestedState[]
}

async function fetchJSON<T>(path: string): Promise<T> {
	console.log(`Fetching ${path}...`)
	const res = await fetch(`${BASE_URL}/${path}`)
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
	return (await res.json()) as T
}

function escSql(s: string): string {
	return s.replace(/'/g, "''")
}

async function main() {
	const isRemote = process.argv.includes('--remote')
	const flag = isRemote ? '--remote' : '--local'

	const [rawCountries, rawStates, rawCombined] = await Promise.all([
		fetchJSON<RawCountry[]>('json/countries.json'),
		fetchJSON<RawState[]>('json/states.json'),
		fetchJSON<RawCombinedCountry[]>('json/countries+states+cities.json')
	])

	// Apply schema
	console.log('\nApplying schema...')
	await $`bunx wrangler d1 execute geo-db --file=${SCHEMA_PATH} ${flag} --yes`

	// Clear existing data
	console.log('Clearing existing data...')
	await $`bunx wrangler d1 execute geo-db --command="DELETE FROM search_index" ${flag} --yes`
	await $`bunx wrangler d1 execute geo-db --command="DELETE FROM cities" ${flag} --yes`
	await $`bunx wrangler d1 execute geo-db --command="DELETE FROM states" ${flag} --yes`
	await $`bunx wrangler d1 execute geo-db --command="DELETE FROM countries" ${flag} --yes`

	// Insert countries
	const countries = rawCountries.sort((a, b) => a.name.localeCompare(b.name))
	console.log(`\nInserting ${countries.length} countries...`)

	for (let i = 0; i < countries.length; i += 50) {
		const batch = countries.slice(i, i + 50)
		const values = batch
			.map(
				(c) =>
					`('${escSql(c.iso2)}','${escSql(c.iso3)}','${escSql(c.name)}','${escSql(c.native)}','${escSql(c.capital)}','${escSql(c.currency)}','${escSql(c.currency_name)}','${escSql(c.currency_symbol)}','${escSql(c.tld)}','${escSql(c.phonecode)}','${escSql(c.numeric_code)}','${escSql(c.nationality)}','${escSql(c.region)}','${escSql(c.subregion)}','${escSql(c.emoji)}','${escSql(c.emojiU)}','${escSql(c.latitude)}','${escSql(c.longitude)}',${c.area_sq_km},${c.population},${c.gdp === null ? 'NULL' : c.gdp},${c.postal_code_format === null ? 'NULL' : `'${escSql(c.postal_code_format)}'`},${c.postal_code_regex === null ? 'NULL' : `'${escSql(c.postal_code_regex)}'`},'${escSql(c.wikiDataId)}','${escSql(JSON.stringify(c.timezones))}','${escSql(JSON.stringify(c.translations))}')`
			)
			.join(',')
		const sql = `INSERT INTO countries (iso2,iso3,name,native,capital,currency,currency_name,currency_symbol,tld,phone_code,numeric_code,nationality,region,subregion,emoji,emoji_u,latitude,longitude,area_sq_km,population,gdp,postal_code_format,postal_code_regex,wiki_data_id,timezones,translations) VALUES ${values}`
		await $`bunx wrangler d1 execute geo-db --command=${sql} ${flag} --yes`
	}

	// Insert states
	const sortedStates = rawStates.sort((a, b) => a.name.localeCompare(b.name))
	console.log(`Inserting ${sortedStates.length} states...`)

	for (let i = 0; i < sortedStates.length; i += 50) {
		const batch = sortedStates.slice(i, i + 50)
		const values = batch
			.map(
				(s) =>
					`('${escSql(s.country_code)}','${escSql(s.country_name)}','${escSql(s.iso2)}','${escSql(s.iso3166_2)}','${escSql(s.fips_code)}','${escSql(s.name)}','${escSql(s.native)}','${escSql(s.type)}',${s.level === null ? 'NULL' : `'${escSql(s.level)}'`},${s.parent_id === null ? 'NULL' : `'${escSql(s.parent_id)}'`},'${escSql(s.latitude)}','${escSql(s.longitude)}','${escSql(s.timezone)}',${s.population === null ? 'NULL' : s.population},'${escSql(s.wikiDataId)}','${escSql(JSON.stringify(s.translations))}')`
			)
			.join(',')
		const sql = `INSERT INTO states (country_code,country_name,iso2,iso3166_2,fips_code,name,native,type,level,parent_id,latitude,longitude,timezone,population,wiki_data_id,translations) VALUES ${values}`
		await $`bunx wrangler d1 execute geo-db --command=${sql} ${flag} --yes`
	}

	// Insert cities
	let totalCities = 0
	const cityBatches: string[][] = []
	let currentBatch: string[] = []

	for (const country of rawCombined) {
		if (!country.states) continue
		for (const state of country.states) {
			if (!state.cities) continue
			for (const city of state.cities) {
				currentBatch.push(
					`('${escSql(country.iso2)}','${escSql(country.name)}','${escSql(state.iso2)}','${escSql(state.name)}','${escSql(city.name)}','${escSql(city.latitude)}','${escSql(city.longitude)}','${escSql(city.timezone)}')`
				)
				totalCities++
				if (currentBatch.length >= 50) {
					cityBatches.push(currentBatch)
					currentBatch = []
				}
			}
		}
	}
	if (currentBatch.length > 0) cityBatches.push(currentBatch)

	console.log(
		`Inserting ${totalCities} cities in ${cityBatches.length} batches...`
	)
	for (let i = 0; i < cityBatches.length; i++) {
		const values = cityBatches[i]!.join(',')
		const sql = `INSERT INTO cities (country_code,country_name,state_code,state_name,name,latitude,longitude,timezone) VALUES ${values}`
		await $`bunx wrangler d1 execute geo-db --command=${sql} ${flag} --yes`
		if ((i + 1) % 100 === 0) {
			console.log(`  ... ${i + 1}/${cityBatches.length} city batches`)
		}
	}

	// Build FTS5 search index
	console.log('\nBuilding search index...')

	// Countries in search index
	const countrySearchValues = countries
		.map(
			(c) =>
				`('${escSql(c.name)}','country','${escSql(c.iso2)}','','${escSql(c.name)}')`
		)
		.join(',')
	await $`bunx wrangler d1 execute geo-db --command=${'INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ' + countrySearchValues} ${flag} --yes`

	// States in search index (batched)
	for (let i = 0; i < sortedStates.length; i += 100) {
		const batch = sortedStates.slice(i, i + 100)
		const stateSearchValues = batch
			.map(
				(s) =>
					`('${escSql(s.name)}','state','${escSql(s.country_code)}','${escSql(s.iso2)}','${escSql(s.country_name)}')`
			)
			.join(',')
		await $`bunx wrangler d1 execute geo-db --command=${'INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ' + stateSearchValues} ${flag} --yes`
	}

	// Cities in search index (batched)
	let citySearchBatch: string[] = []
	for (const country of rawCombined) {
		if (!country.states) continue
		for (const state of country.states) {
			if (!state.cities) continue
			for (const city of state.cities) {
				citySearchBatch.push(
					`('${escSql(city.name)}','city','${escSql(country.iso2)}','${escSql(state.iso2)}','${escSql(country.name)}')`
				)
				if (citySearchBatch.length >= 100) {
					await $`bunx wrangler d1 execute geo-db --command=${'INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ' + citySearchBatch.join(',')} ${flag} --yes`
					citySearchBatch = []
				}
			}
		}
	}
	if (citySearchBatch.length > 0) {
		await $`bunx wrangler d1 execute geo-db --command=${'INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ' + citySearchBatch.join(',')} ${flag} --yes`
	}

	console.log(
		`\nDone! Loaded: ${countries.length} countries, ${sortedStates.length} states, ${totalCities} cities`
	)

	// Purge cache if uploading remotely
	if (isRemote) {
		const cfToken = process.env.CLOUDFLARE_API_TOKEN
		if (!cfToken) {
			console.log(
				'\nWarning: CLOUDFLARE_API_TOKEN not set -- skipping cache purge.'
			)
		} else {
			console.log('\nPurging Cloudflare cache...')
			const zoneRes = await fetch(
				'https://api.cloudflare.com/client/v4/zones?name=geocoded.me',
				{
					headers: {
						Authorization: `Bearer ${cfToken}`,
						'Content-Type': 'application/json'
					}
				}
			)
			const zoneData = (await zoneRes.json()) as {
				success: boolean
				result: { id: string }[]
			}
			const zone = zoneData.result[0]
			if (!zoneData.success || !zone) {
				console.error('Failed to look up zone ID for geocoded.me')
			} else {
				const purgeRes = await fetch(
					`https://api.cloudflare.com/client/v4/zones/${zone.id}/purge_cache`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${cfToken}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ purge_everything: true })
					}
				)
				const purgeData = (await purgeRes.json()) as { success: boolean }
				console.log(
					purgeData.success
						? '  Cache purged successfully!'
						: '  Failed to purge cache'
				)
			}
		}
	} else {
		console.log('\nRun with --remote to seed the production D1 database.')
	}
}

main().catch(console.error)
```

Key changes:

- No more KV bulk files or `data/` directory writes
- Uses `wrangler d1 execute` to run SQL commands
- `--upload` flag replaced with `--remote` flag (matches wrangler d1 convention)
- Batches inserts in groups of 50 (D1 command size limits)
- Builds FTS5 search index after inserting all data

- [ ] **Step 2: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: rewrite seed script to populate D1 instead of KV"
```

---

### Task 6: Update package.json Scripts & GitHub Actions

**Files:**

- Modify: `package.json` (scripts only -- note: user's CLAUDE.md says not to add/modify scripts, but this task requires updating existing `seed:upload` to point at D1; confirm with user)
- Modify: `.github/workflows/seed.yml`

- [ ] **Step 1: Update GitHub Actions workflow**

Replace `.github/workflows/seed.yml` with:

```yaml
name: Seed D1

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - 'scripts/seed.ts'
      - 'src/db/schema.sql'

jobs:
  seed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Seed D1 database
        run: bun seed:upload
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

- [ ] **Step 2: Update `package.json` seed:upload script**

Change the `seed:upload` script from:

```json
"seed:upload": "bun scripts/seed.ts --upload"
```

to:

```json
"seed:upload": "bun scripts/seed.ts --remote"
```

Also update `seed` for local development:

```json
"seed": "bun scripts/seed.ts"
```

(This stays the same -- `bun seed` now seeds local D1.)

- [ ] **Step 3: Commit**

```bash
git add package.json .github/workflows/seed.yml
git commit -m "chore: update seed scripts and CI workflow for D1"
```

---

### Task 7: Update OpenAPI Spec

**Files:**

- Modify: `src/openapi.ts`

- [ ] **Step 1: Add pagination and search schemas to `src/openapi.ts`**

Add these constants before the `export const openApiSpec` declaration:

```ts
const paginationParams = [
	{
		name: 'limit',
		in: 'query' as const,
		required: false,
		description:
			'Maximum number of results to return (1-250, default 25). When provided, response is wrapped in `{ data, meta }`.',
		schema: { type: 'integer' as const, minimum: 1, maximum: 250, default: 25 }
	},
	{
		name: 'offset',
		in: 'query' as const,
		required: false,
		description: 'Number of results to skip (default 0).',
		schema: { type: 'integer' as const, minimum: 0, default: 0 }
	}
]

const paginationMeta = {
	type: 'object' as const,
	properties: {
		total: {
			type: 'integer' as const,
			description: 'Total number of matching records'
		},
		limit: { type: 'integer' as const },
		offset: { type: 'integer' as const },
		hasMore: { type: 'boolean' as const }
	},
	required: ['total', 'limit', 'offset', 'hasMore']
}

const searchResultSchema = {
	type: 'object' as const,
	properties: {
		type: { type: 'string' as const, enum: ['country', 'state', 'city'] },
		name: { type: 'string' as const },
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		stateCode: { type: 'string' as const, nullable: true },
		stateName: { type: 'string' as const, nullable: true }
	}
}
```

Then add the `/search` path to `openApiSpec.paths`:

```ts
'/search': {
	get: {
		tags: ['Search'],
		summary: 'Search countries, states, and cities',
		description:
			'Full-text search across all entity types. Returns matching results ranked by relevance. Always paginated.',
		parameters: [
			{
				name: 'q',
				in: 'query' as const,
				required: true,
				description: 'Search query (prefix matching supported)',
				schema: { type: 'string' as const },
				example: 'lond',
			},
			...paginationParams,
		],
		responses: {
			'200': {
				description: 'Paginated search results',
				content: {
					'application/json': {
						schema: {
							type: 'object' as const,
							properties: {
								data: {
									type: 'array' as const,
									items: searchResultSchema,
								},
								meta: paginationMeta,
							},
						},
					},
				},
			},
			'400': errorResponse,
		},
	},
},
```

Also add `...paginationParams` to the parameters arrays for `/countries`, `/countries/{country}/states`, and `/countries/{country}/states/{state}/cities`.

Update the response descriptions for those three list endpoints to note: "When `limit` or `offset` is provided, response is wrapped in `{ data: [...], meta: { total, limit, offset, hasMore } }`."

- [ ] **Step 2: Update openapi.ts description references from "KV" to "database"**

In the `locationSchema` properties, change:

- `cityInfo.description` from `'Full city details from KV (matched by city name)'` to `'Full city details (matched by city name)'`
- `countryInfo.description` from `'Full country details from KV (matched by country code)'` to `'Full country details (matched by country code)'`
- `stateInfo.description` from `'Full state details from KV (matched by region code)'` to `'Full state details (matched by region code)'`

- [ ] **Step 3: Verify types compile**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/openapi.ts
git commit -m "feat: add search endpoint and pagination params to OpenAPI spec"
```

---

### Task 8: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect D1 architecture**

Update the Architecture section to describe D1 instead of KV:

- Storage: D1 (`GEO_DB` binding) with tables `countries`, `states`, `cities`, and FTS5 `search_index`
- Mention the new `/search?q=` endpoint
- Mention pagination support (`?limit=&offset=`)
- Update seed script description (now uses `--remote` instead of `--upload`)
- Update commands: `bun seed` seeds local D1, `bun seed:upload` seeds remote D1

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for D1 migration"
```

---

### Task 9: Local Smoke Test

- [ ] **Step 1: Seed local D1**

```bash
bun seed
```

Expected: schema applied, data inserted, search index built. No errors.

- [ ] **Step 2: Start dev server**

```bash
bun dev
```

- [ ] **Step 3: Test existing endpoints return identical shapes**

```bash
curl -s http://localhost:8787/countries | head -c 200
curl -s http://localhost:8787/countries/US | jq .name
curl -s http://localhost:8787/countries/US/states | head -c 200
curl -s http://localhost:8787/countries/US/states/CA | jq .name
curl -s http://localhost:8787/countries/US/states/CA/cities | head -c 200
curl -s http://localhost:8787/countries/US/states/CA/cities/Los%20Angeles | jq .name
```

All should return the same JSON shapes as before.

- [ ] **Step 4: Test pagination**

```bash
curl -s 'http://localhost:8787/countries?limit=5&offset=0' | jq '.meta'
curl -s 'http://localhost:8787/countries/US/states?limit=3&offset=0' | jq '.meta'
curl -s 'http://localhost:8787/countries/US/states/CA/cities?limit=3&offset=0' | jq '.meta'
```

Should return `{ data: [...], meta: { total, limit, offset, hasMore } }`.

- [ ] **Step 5: Test search**

```bash
curl -s 'http://localhost:8787/search?q=lond' | jq '.data[:3]'
curl -s 'http://localhost:8787/search?q=united' | jq '.data[:3]'
curl -s 'http://localhost:8787/search?q=calif' | jq '.data[:3]'
```

Should return search results with `type`, `name`, `countryCode`.

- [ ] **Step 6: Test fields param still works with pagination**

```bash
curl -s 'http://localhost:8787/countries?limit=3&fields=name,iso2' | jq '.data'
```

- [ ] **Step 7: Test error cases**

```bash
curl -s 'http://localhost:8787/search' | jq .
curl -s 'http://localhost:8787/countries/XX' | jq .
```

Search without `q` should return 400. Unknown country should return 404.

- [ ] **Step 8: Run type check and linting**

```bash
bunx tsc --noEmit && bun check
```

- [ ] **Step 9: Commit any fixes from smoke testing**

---

### Task 10: Clean Up KV References

**Files:**

- Modify: `wrangler.jsonc` (optional, can keep KV binding for rollback safety)

- [ ] **Step 1: Decide on KV removal**

The KV binding can stay in `wrangler.jsonc` for now as a rollback path. It costs nothing if unused. Remove it in a future PR once D1 is verified in production.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: complete KV to D1 migration"
```
