import { Database, type SQLQueryBindings } from 'bun:sqlite'
import { beforeAll, describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import app from '../apps/api/src/index'

// Runs v2 routes against real SQLite with every migration applied, so the SQL itself
// (keyset paging, distance ordering, json_each, FTS) is exercised, not just the routing.

type Row = Record<string, unknown>

class SqliteStatement {
	private parameters: SQLQueryBindings[] = []

	constructor(
		private readonly db: Database,
		private readonly sql: string
	) {}

	bind(...parameters: SQLQueryBindings[]) {
		this.parameters = parameters
		return this
	}

	run(): { results: Row[] } {
		return {
			results: this.db
				.query<Row, SQLQueryBindings[]>(this.sql)
				.all(...this.parameters)
		}
	}

	all(): Promise<{ results: Row[] }> {
		return Promise.resolve(this.run())
	}

	first(): Promise<Row | null> {
		return Promise.resolve(
			this.db
				.query<Row, SQLQueryBindings[]>(this.sql)
				.get(...this.parameters) ?? null
		)
	}
}

class SqliteD1 {
	constructor(private readonly db: Database) {}

	prepare(sql: string) {
		return new SqliteStatement(this.db, sql)
	}

	batch(statements: SqliteStatement[]) {
		return Promise.resolve(statements.map((statement) => statement.run()))
	}
}

const sqlite = new Database(':memory:')

function insert(table: string, row: Row): void {
	const columns = sqlite
		.query<
			{
				name: string
				type: string
				notnull: number
				dflt_value: unknown
				pk: number
			},
			[]
		>(`PRAGMA table_info(${table})`)
		.all()
	const filled: Row = {}
	for (const column of columns) {
		if (column.notnull && column.dflt_value === null && !column.pk) {
			filled[column.name] = /INT|REAL/i.test(column.type) ? 0 : ''
		}
	}
	Object.assign(filled, row)
	const keys = Object.keys(filled)
	sqlite
		.query(
			`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
		)
		.run(...keys.map((key) => filled[key] as SQLQueryBindings))
}

function stat(value: number, year = 2025): string {
	return JSON.stringify({ code: 'X', name: 'X', year, value })
}

beforeAll(() => {
	for (const file of readdirSync('migrations')
		.filter((name) => name.endsWith('.sql'))
		.sort()) {
		sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'))
	}

	insert('countries', {
		iso2: 'JP',
		iso3: 'JPN',
		name: 'Japan',
		continent: 'AS',
		region: 'Asia',
		subregion: 'Eastern Asia',
		population: 123366734,
		translations: JSON.stringify({ ja: '日本', pt: 'Japão' })
	})
	// Enough countries to exceed D1's 100 bound-parameter cap on expand=statistics.
	for (let index = 0; index < 120; index += 1) {
		const code =
			`Q${String.fromCharCode(65 + Math.floor(index / 26))}${String.fromCharCode(65 + (index % 26))}`.slice(
				0,
				3
			)
		insert('countries', {
			iso2: code,
			iso3: `${code}X`,
			name: `Country ${index}`
		})
		insert('country_statistics', {
			country_code: code,
			country_name: `Country ${index}`,
			iso3: `${code}X`
		})
	}
	insert('country_statistics', {
		country_code: 'JP',
		country_name: 'Japan',
		iso3: 'JPN',
		population_male: stat(60150000),
		population_female: stat(63220000),
		age_0_to_14_percent: stat(11.24),
		age_15_to_64_percent: stat(58.77),
		age_65_plus_percent: stat(29.99, 2024)
	})

	insert('states', {
		country_code: 'JP',
		country_name: 'Japan',
		iso2: '13',
		iso3166_2: 'JP-13',
		name: 'Tokyo',
		latitude: '35.68',
		longitude: '139.69'
	})

	const cities: Array<[string, number, number, number]> = [
		['Tokyo', 35.6895, 139.69171, 9733276],
		['Setagaya', 35.64, 139.65, 940071],
		['Kawasaki', 35.52, 139.7, 1538262],
		['Chiba', 35.6, 140.12, 919729],
		['Osaka', 34.69, 135.5, 2753862],
		['Nerima', 35.74, 139.65, 940071]
	]
	cities.forEach(([name, lat, lng, population], index) => {
		insert('cities', {
			country_code: 'JP',
			country_name: 'Japan',
			state_code: name === 'Osaka' ? '27' : '13',
			state_name: name === 'Osaka' ? 'Osaka' : 'Tokyo',
			name,
			latitude: String(lat),
			longitude: String(lng),
			timezone: 'Asia/Tokyo',
			population,
			geoname_id: 1000 + index
		})
	})

	insert('timezones', {
		timezone: 'Asia/Tokyo',
		country_codes: '["JP"]',
		name: 'Japan Standard Time',
		standard_offset: 32400
	})

	for (const [name, type, stateCode, extra] of [
		['Tokyo', 'state', '13', { country_name: 'Japan' }],
		[
			'Tokyo',
			'city',
			'13',
			{ country_name: 'Japan', state_name: 'Tokyo', geoname_id: 1000 }
		],
		['Japan', 'country', '', { country_name: 'Japan' }]
	] as const) {
		sqlite
			.query(
				'INSERT INTO search_index (name, type, country_code, state_code, extra) VALUES (?, ?, ?, ?, ?)'
			)
			.run(name, type, 'JP', stateCode, JSON.stringify(extra))
	}

	insert('seed_files', {
		filename: 'cities.json',
		source_hash: 'abc',
		applied_at: '2026-09-27 03:00:00'
	})
})

async function request(
	path: string,
	options: { headers?: HeadersInit; rateLimited?: boolean } = {}
): Promise<Response> {
	return await app.fetch(
		new Request(`https://api.geocoded.me${path}`, { headers: options.headers }),
		{
			API_URL: 'https://api.geocoded.me',
			SITE_URL: 'https://geocoded.me',
			GEO_DB: new SqliteD1(sqlite),
			ASSETS: { fetch: () => new Response('not found', { status: 404 }) },
			...(options.rateLimited === undefined
				? {}
				: {
						RATE_LIMITER: {
							limit: () => Promise.resolve({ success: !options.rateLimited })
						}
					})
		}
	)
}

async function json<T>(response: Response): Promise<T> {
	return (await response.json()) as T
}

type Page<T> = {
	data: T[]
	meta: { total: number; hasMore: boolean; cursor: string | null }
}

describe('v2 against SQLite', () => {
	test('orders nearby cities by distance and reports distanceKm', async () => {
		const response = await request(
			'/v2/cities?near=35.6895,139.69171&radius=30&fields=name'
		)
		expect(response.status).toBe(200)
		const body =
			await json<Page<{ name: string; distanceKm: number }>>(response)
		expect(body.data.map((city) => city.name)).toEqual([
			'Tokyo',
			'Setagaya',
			'Nerima',
			'Kawasaki'
		])
		expect(body.data[0]?.distanceKm).toBe(0)
		expect(body.data[3]?.distanceKm).toBeGreaterThan(18)
		expect(body.meta.total).toBe(4)
	})

	test('validates near and radius', async () => {
		const withSort = await request('/v2/cities?near=35,139&sort=name')
		expect(withSort.status).toBe(400)
		expect((await json<{ error: { code: string } }>(withSort)).error.code).toBe(
			'invalid_request'
		)
		expect((await request('/v2/cities?near=35,139&radius=500')).status).toBe(
			400
		)
		expect((await request('/v2/cities?radius=5')).status).toBe(400)
		expect((await request('/v2/countries?near=35,139')).status).toBe(400)
	})

	test('reverse geocodes a point to city, state and country', async () => {
		const response = await request('/v2/reverse?lat=35.69&lng=139.70&lang=ja')
		expect(response.status).toBe(200)
		const body = await json<{
			city: { name: string; distanceKm: number }
			state: { iso31662: string } | null
			country: { name: string; localName: string } | null
			timezone: string
		}>(response)
		expect(body.city.name).toBe('Tokyo')
		expect(body.state?.iso31662).toBe('JP-13')
		expect(body.country?.localName).toBe('日本')
		expect(body.timezone).toBe('Asia/Tokyo')

		const ocean = await request('/v2/reverse?lat=-40&lng=-120')
		expect(ocean.status).toBe(404)
		expect((await request('/v2/reverse?lat=95&lng=0')).status).toBe(400)
	})

	test('pages with keyset cursors without skipping or repeating tied rows', async () => {
		const seen: string[] = []
		let path = '/v2/cities?sort=-population&limit=2&fields=name'
		for (let page = 0; page < 5; page += 1) {
			const body = await json<Page<{ name: string }>>(await request(path))
			seen.push(...body.data.map((city) => city.name))
			if (!body.meta.cursor) break
			path = `/v2/cities?sort=-population&limit=2&fields=name&cursor=${body.meta.cursor}`
		}
		// Setagaya and Nerima tie on population; the rowid tie-breaker follows the sort direction.
		expect(seen).toEqual([
			'Tokyo',
			'Osaka',
			'Kawasaki',
			'Nerima',
			'Setagaya',
			'Chiba'
		])
	})

	test('still accepts cursors issued as bare offsets', async () => {
		const legacy = btoa('2').replace(/=/g, '')
		const body = await json<Page<{ name: string }>>(
			await request(
				`/v2/cities?sort=-population&limit=2&fields=name&cursor=${legacy}`
			)
		)
		expect(body.data.map((city) => city.name)).toEqual(['Kawasaki', 'Nerima'])
	})

	test('expands statistics for more than 100 countries', async () => {
		const response = await request(
			'/v2/countries?expand=statistics&limit=200&fields=iso2,statistics.countryCode'
		)
		expect(response.status).toBe(200)
		const body =
			await json<Page<{ statistics: { countryCode: string } | null }>>(response)
		expect(body.data.length).toBe(121)
		expect(body.data.every((country) => country.statistics !== null)).toBe(true)
	})

	test('adds derived statistics', async () => {
		const body = await json<
			Record<string, { value: number | null; year: number }>
		>(
			await request(
				'/v2/statistics/JP?fields=dependencyRatio,ageingIndex,sexRatio'
			)
		)
		expect(body.dependencyRatio?.value).toBe(70.2)
		expect(body.ageingIndex).toEqual(
			expect.objectContaining({ value: 266.8, year: 2024 })
		)
		expect(body.sexRatio?.value).toBe(95.1)
	})

	test('searches across several place types', async () => {
		const body = await json<Page<{ type: string; id: string }>>(
			await request('/v2/search?q=tok&type=city,state')
		)
		expect(body.data.map((row) => `${row.type}:${row.id}`).sort()).toEqual([
			'city:1000',
			'state:JP:13'
		])
		expect((await request('/v2/search?q=tok&type=planet')).status).toBe(400)
		expect((await request('/v2/search')).status).toBe(400)
	})

	test('localizes country names with lang', async () => {
		const exact = await json<{ localName: string }>(
			await request('/v2/countries/JP?lang=ja&fields=name')
		)
		expect(exact.localName).toBe('日本')
		const fallback = await json<{ localName: string }>(
			await request('/v2/countries/JP?lang=pt-BR&fields=name')
		)
		expect(fallback.localName).toBe('Japão')
		expect((await request('/v2/countries/JP?lang=%3Cx%3E')).status).toBe(400)
	})

	test('returns the current time in a timezone without caching', async () => {
		const response = await request('/v2/timezones/Asia/Tokyo/now')
		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		const body = await json<{ utcOffset: string; isDst: boolean }>(response)
		expect(body).toEqual(
			expect.objectContaining({ utcOffset: 'UTC+09:00', isDst: false })
		)
	})

	test('describes datasets in meta', async () => {
		const body = await json<{
			dataVersion: string
			updatedAt: string
			datasets: Array<{ id: string; records: number }>
		}>(await request('/v2/meta'))
		expect(body.dataVersion).toMatch(/^[0-9a-f]{16}$/)
		expect(body.updatedAt).toBe('2026-09-27T03:00:00Z')
		expect(
			body.datasets.find((dataset) => dataset.id === 'cities')?.records
		).toBe(6)
	})

	test('sends revalidation-friendly cache headers and honours If-None-Match', async () => {
		const first = await request('/v2/countries/JP')
		expect(first.headers.get('Cache-Control')).toBe(
			'public, max-age=86400, s-maxage=31536000'
		)
		const etag = first.headers.get('ETag')
		expect(etag).toMatch(/^W\/"[0-9a-f]{40}"$/)
		const second = await request('/v2/countries/JP', {
			headers: { 'If-None-Match': etag ?? '' }
		})
		expect(second.status).toBe(304)

		const missing = await request('/v2/countries/ZZ')
		expect(missing.status).toBe(404)
		expect(missing.headers.get('Cache-Control')).toBe(
			'public, max-age=300, s-maxage=300'
		)
		expect(await json<unknown>(missing)).toEqual({
			error: { code: 'not_found', message: 'Country not found' }
		})
	})

	test('serves the caller location with or without a trailing slash', async () => {
		for (const path of ['/v2', '/v2/', '/v2/?fields=ip,country']) {
			const response = await request(path)
			expect(response.status).toBe(200)
			expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		}
		expect((await request('/v2/countries/JP/')).status).toBe(200)
	})

	test('serves site pages, not API JSON, on the website host', async () => {
		const response = await app.fetch(
			new Request('https://geocoded.me/countries/jp'),
			{
				API_URL: 'https://api.geocoded.me',
				SITE_URL: 'https://geocoded.me',
				GEO_DB: new SqliteD1(sqlite),
				ASSETS: { fetch: () => new Response('<html>site</html>') }
			}
		)
		expect(await response.text()).toBe('<html>site</html>')
	})

	test('answers unknown v2 endpoints with a JSON 404', async () => {
		const response = await request('/v2/planets')
		expect(response.status).toBe(404)
		expect((await json<{ error: { code: string } }>(response)).error.code).toBe(
			'not_found'
		)
	})

	test('rate limits per IP with Retry-After', async () => {
		const limited = await request('/v2/countries/JP', {
			headers: { 'cf-connecting-ip': '203.0.113.9' },
			rateLimited: true
		})
		expect(limited.status).toBe(429)
		expect(limited.headers.get('Retry-After')).toBe('60')
		expect((await json<{ error: { code: string } }>(limited)).error.code).toBe(
			'rate_limited'
		)

		const allowed = await request('/v2/countries/JP', {
			headers: { 'cf-connecting-ip': '203.0.113.9' },
			rateLimited: false
		})
		expect(allowed.status).toBe(200)
	})

	test('marks v1 JSON responses as deprecated', async () => {
		const response = await request('/countries/JP')
		expect(response.headers.get('Deprecation')).toBe('@1790553600')
		expect(response.headers.get('Sunset')).toBe('Wed, 31 Mar 2027 23:59:59 GMT')
		expect(response.headers.get('Link')).toContain('rel="successor-version"')
	})
})
