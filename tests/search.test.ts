import { describe, expect, test } from 'bun:test'
import app from '../src/index'

type Row = Record<string, unknown>

type FakeStatementResult = {
	results: Row[]
}

type PaginatedBody<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
		cursor: string | null
	}
}

class FakeStatement {
	private parameters: unknown[] = []

	constructor(
		private readonly db: FakeD1Database,
		private readonly sql: string
	) {}

	bind(...parameters: unknown[]) {
		this.parameters = parameters
		return this
	}

	all(): Promise<FakeStatementResult> {
		return Promise.resolve({
			results: this.db.select(this.sql, this.parameters)
		})
	}

	first<T = Row>(): Promise<T | null> {
		const [first] = this.db.select(this.sql, this.parameters)
		return Promise.resolve((first as T | undefined) ?? null)
	}

	run(): Promise<{ success: true }> {
		this.db.execute(this.sql, this.parameters)
		return Promise.resolve({ success: true })
	}
}

class FakeD1Database {
	readonly countries = [
		countryRow('US', 'USA', 'United States'),
		countryRow('CA', 'CAN', 'Canada')
	]

	readonly states = [
		stateRow('US', 'United States', 'CA', 'California'),
		stateRow('US', 'United States', 'NY', 'New York')
	]

	readonly cities = [
		cityRow(1, 'US', 'United States', 'CA', 'California', 'San Francisco'),
		cityRow(2, 'US', 'United States', 'CA', 'California', 'Los Angeles'),
		cityRow(3, 'ID', 'Indonesia', 'JI', 'East Java', 'Krajan'),
		cityRow(4, 'ID', 'Indonesia', 'JI', 'East Java', 'Krajan')
	]

	readonly searchRows = [
		searchRow('Springfield', 'city', 'US', 'CA', {
			country_name: 'United States',
			state_name: 'California'
		}),
		searchRow('California', 'state', 'US', 'CA', {
			country_name: 'United States'
		}),
		searchRow('Carlsbad', 'city', 'US', 'CA', {
			country_name: 'United States',
			state_name: 'California'
		}),
		searchRow('San Francisco', 'city', 'US', 'CA', {
			country_name: 'United States',
			state_name: 'California'
		})
	]

	readonly quizStats: Row[] = []

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this, sql)
	}

	batch(statements: FakeStatement[]): Promise<FakeStatementResult[]> {
		return Promise.all(statements.map((statement) => statement.all()))
	}

	select(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('COUNT(*) AS count') && sql.includes('FROM quiz_stats')) {
			return this.selectQuizStats(sql, parameters)
		}
		if (sql.includes('COUNT(*) AS total')) {
			return [{ total: this.selectRows(sql, parameters).length }]
		}
		return this.selectRows(sql, parameters)
	}

	private selectRows(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('FROM search_index')) {
			return this.selectSearchRows(sql, parameters)
		}
		if (sql.includes('FROM countries')) {
			return this.selectCountries(sql, parameters)
		}
		if (sql.includes('FROM states')) {
			return this.selectStates(sql, parameters)
		}
		if (sql.includes('FROM cities')) {
			return this.selectCities(sql, parameters)
		}
		if (sql.includes('FROM quiz_stats')) {
			return this.selectQuizStats(sql, parameters)
		}
		return []
	}

	execute(sql: string, parameters: unknown[]): void {
		if (sql.includes('INSERT INTO quiz_stats')) {
			this.quizStats.push({
				mode: parameters[0],
				score: parameters[1],
				total: parameters[2],
				client_hash: parameters[3] ?? null,
				created_at: '2026-04-30 00:00:00'
			})
		}
	}

	private selectSearchRows(sql: string, parameters: unknown[]): Row[] {
		const query = ftsParameterToQuery(parameters[0])
		const typeParameter = parameters.find((parameter) =>
			['country', 'state', 'city'].includes(String(parameter))
		)
		const searchesAllIndexedColumns = sql.includes('search_index MATCH')
		return this.searchRows.filter((row) => {
			const values = searchesAllIndexedColumns
				? [row.name, row.type, row.country_code, row.state_code, row.extra]
				: [row.name]
			const matchesName = values.some((value) =>
				String(value).toLowerCase().includes(query)
			)
			const matchesType =
				!sql.includes('type = ?') || row.type === typeParameter
			return matchesName && matchesType
		})
	}

	private selectCountries(sql: string, parameters: unknown[]): Row[] {
		if (!sql.includes('WHERE')) return this.countries
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		return this.countries.filter((country) =>
			[String(country.name), String(country.iso2), String(country.iso3)].some(
				(value) => value.toLowerCase().includes(query)
			)
		)
	}

	private selectStates(sql: string, parameters: unknown[]): Row[] {
		const countryCode = String(parameters[0] ?? '').toUpperCase()
		const rows = this.states.filter(
			(state) => state.country_code === countryCode
		)
		if (!sql.includes('LIKE')) return rows
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		return rows.filter((state) =>
			[String(state.name), String(state.iso2), String(state.iso3166_2)].some(
				(value) => value.toLowerCase().includes(query)
			)
		)
	}

	private selectCities(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('geoname_id = ?')) {
			const geonameId = Number(parameters[0])
			return this.cities.filter((city) => city.geoname_id === geonameId)
		}
		const countryCode = String(parameters[0] ?? '').toUpperCase()
		const stateCode = String(parameters[1] ?? '').toUpperCase()
		let rows = this.cities.filter(
			(city) =>
				city.country_code === countryCode && city.state_code === stateCode
		)
		if (sql.includes('LOWER(name) = ?') || sql.includes('name = ?')) {
			const query = String(parameters[2] ?? '').toLowerCase()
			rows = rows.filter((city) => String(city.name).toLowerCase() === query)
		}
		if (!sql.includes('LIKE')) return rows
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		return rows.filter((city) =>
			String(city.name).toLowerCase().includes(query)
		)
	}

	private selectQuizStats(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('client_hash')) {
			const clientHash = parameters[0]
			return [
				{
					count: this.quizStats.filter(
						(stat) => stat.client_hash === clientHash
					).length
				}
			]
		}
		if (sql.includes('GROUP BY score')) {
			const mode = parameters[0]
			const counts = new Map<number, number>()
			for (const stat of this.quizStats.filter((row) => row.mode === mode)) {
				const score = Number(stat.score)
				counts.set(score, (counts.get(score) ?? 0) + 1)
			}
			return [...counts.entries()].map(([score, count]) => ({ score, count }))
		}
		if (sql.includes('ROUND(AVG(score)')) {
			const score = Number(parameters[0])
			const mode = parameters[1]
			const rows = this.quizStats.filter((row) => row.mode === mode)
			const avg =
				rows.reduce((sum, row) => sum + Number(row.score), 0) /
				Math.max(rows.length, 1)
			return [
				{
					total_attempts: rows.length,
					avg_score: Math.round(avg * 10) / 10,
					at_or_below: rows.filter((row) => Number(row.score) <= score).length
				}
			]
		}
		return [{ count: this.quizStats.length }]
	}
}

describe('search routes', () => {
	test('returns paginated list response without explicit pagination params', async () => {
		const response = await request('/countries')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((country) => country.name)).toEqual([
			'United States',
			'Canada'
		])
		expect(body.meta).toEqual({
			total: 2,
			limit: 25,
			offset: 0,
			hasMore: false,
			cursor: null
		})
	})

	test('filters global search by type', async () => {
		const response = await request('/search?q=ca&type=city')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ type: string }>
		expect(body.data.map((result) => result.type)).toEqual(['city'])
	})

	test('global search only matches entity names, not indexed metadata columns', async () => {
		const response = await request('/search?q=city')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data).toEqual([])
	})

	test('rejects mutually exclusive offset and cursor pagination params', async () => {
		const response = await request('/countries?offset=1&cursor=Mg')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Query parameters "offset" and "cursor" cannot be combined'
		})
	})

	test('rejects invalid cursor pagination params', async () => {
		const response = await request('/countries?cursor=not-a-valid-cursor')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Query parameter "cursor" is invalid'
		})
	})

	test('searches countries with q', async () => {
		const response = await request('/countries?q=uni')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((country) => country.name)).toEqual(['United States'])
		expect(body.meta.total).toBe(1)
	})

	test('searches states within a country with q', async () => {
		const response = await request('/countries/US/states?q=cal')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((state) => state.name)).toEqual(['California'])
		expect(body.meta.total).toBe(1)
	})

	test('searches cities within a state with q', async () => {
		const response = await request('/countries/US/states/CA/cities?q=san')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((city) => city.name)).toEqual(['San Francisco'])
		expect(body.meta.total).toBe(1)
	})

	test('returns conflict instead of an arbitrary city when city name is ambiguous', async () => {
		const response = await request('/countries/ID/states/JI/cities/Krajan')

		expect(response.status).toBe(409)
		const body = (await response.json()) as {
			error: string
			matches: Array<{ geonameId: number; name: string }>
		}
		expect(body.error).toBe('City name is ambiguous')
		expect(body.matches.map((city) => city.geonameId)).toEqual([3, 4])
	})

	test('root location enrichment looks up the city directly', async () => {
		const db = new FakeD1Database()
		const response = await request('/', {
			db,
			cf: {
				country: 'US',
				regionCode: 'CA',
				city: 'San Francisco'
			}
		})

		expect(response.status).toBe(200)
		const body = (await response.json()) as { cityInfo?: { name: string } }
		expect(body.cityInfo?.name).toBe('San Francisco')
	})

	test('rejects quiz stat writes from untrusted browser origins', async () => {
		const response = await request('/quiz/stats', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'https://bad.test'
			},
			body: JSON.stringify({ mode: 'capital', score: 5, total: 10 })
		})

		expect(response.status).toBe(403)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Forbidden origin' })
	})

	test('rate limits quiz stat writes by client', async () => {
		const db = new FakeD1Database()
		for (let i = 0; i < 60; i++) {
			const response = await request('/quiz/stats', {
				db,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'capital', score: 5, total: 10 })
			})
			expect(response.status).toBe(200)
		}

		const response = await request('/quiz/stats', {
			db,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode: 'capital', score: 5, total: 10 })
		})

		expect(response.status).toBe(429)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Rate limit exceeded' })
	})

	test('invalid quiz stat JSON returns a client error', async () => {
		const response = await request('/quiz/stats', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{'
		})

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Invalid JSON body' })
	})

	test('documents scoped search parameters in OpenAPI', async () => {
		const response = await request('/openapi.json')

		expect(response.status).toBe(200)
		const spec = (await response.json()) as {
			paths: Record<
				string,
				{
					get:
						| {
								parameters: Array<{ name: string }>
								responses: Record<
									string,
									{
										content: Record<string, { schema: Record<string, unknown> }>
									}
								>
						  }
						| undefined
				}
			>
		}
		expect(parameterNames(spec, '/search')).toContain('type')
		expect(parameterNames(spec, '/countries')).toContain('q')
		expect(parameterNames(spec, '/countries/{country}/states')).toContain('q')
		expect(
			parameterNames(spec, '/countries/{country}/states/{state}/cities')
		).toContain('q')
		expect(responseSchema(spec, '/countries')).not.toHaveProperty('oneOf')
	})
})

async function request(
	path: string,
	options: {
		body?: BodyInit
		cf?: Partial<IncomingRequestCfProperties>
		db?: FakeD1Database
		headers?: HeadersInit
		method?: string
	} = {}
): Promise<Response> {
	const env = {
		API_URL: 'https://api.geocoded.me',
		SITE_URL: 'https://geocoded.me',
		GEO_DB: options.db ?? new FakeD1Database(),
		ASSETS: {
			fetch: () => new Response('not found', { status: 404 })
		}
	}

	const rawRequest = new Request(`https://api.geocoded.me${path}`, {
		body: options.body,
		headers: options.headers,
		method: options.method
	})
	if (options.cf) {
		Object.defineProperty(rawRequest, 'cf', { value: options.cf })
	}
	return await app.fetch(rawRequest, env)
}

function parameterNames(
	spec: {
		paths: Record<
			string,
			{ get: { parameters: Array<{ name: string }> } | undefined }
		>
	},
	path: string
): string[] {
	return (
		spec.paths[path]?.get?.parameters.map((parameter) => parameter.name) ?? []
	)
}

function responseSchema(
	spec: {
		paths: Record<
			string,
			{
				get:
					| {
							responses: Record<
								string,
								{
									content: Record<string, { schema: Record<string, unknown> }>
								}
							>
					  }
					| undefined
			}
		>
	},
	path: string
): Record<string, unknown> {
	const schema =
		spec.paths[path]?.get?.responses['200']?.content['application/json']?.schema
	if (!schema) throw new Error(`Missing response schema for ${path}`)
	return schema
}

function ftsParameterToQuery(parameter: unknown): string {
	return String(parameter ?? '')
		.replaceAll('"', '')
		.replaceAll('*', '')
		.toLowerCase()
}

function likeParameterToQuery(parameter: unknown): string {
	return String(parameter ?? '')
		.replaceAll('%', '')
		.toLowerCase()
}

function isLikeParameter(parameter: unknown): boolean {
	return typeof parameter === 'string' && parameter.includes('%')
}

function countryRow(iso2: string, iso3: string, name: string): Row {
	return {
		area_sq_km: 0,
		capital: '',
		continent: 'NA',
		currency: 'USD',
		currency_name: 'US Dollar',
		currency_symbol: '$',
		driving_side: 'right',
		emoji: '',
		emoji_u: '',
		first_day_of_week: 'monday',
		flag_url: '',
		gdp: null,
		iso2,
		iso3,
		languages: '[]',
		latitude: '0',
		longitude: '0',
		measurement_system: 'metric',
		name,
		nationality: '',
		literacy: null,
		native: name,
		neighbours: '[]',
		numeric_code: '',
		phone_code: '',
		population: 0,
		postal_code_format: null,
		postal_code_regex: null,
		region: 'Americas',
		subregion: 'Northern America',
		time_format: '24-hour',
		timezones: '[]',
		tld: '',
		translations: '{}'
	}
}

function stateRow(
	countryCode: string,
	countryName: string,
	iso2: string,
	name: string
): Row {
	return {
		capital: null,
		country_code: countryCode,
		country_name: countryName,
		iso2,
		iso3166_2: `${countryCode}-${iso2}`,
		latitude: '0',
		longitude: '0',
		name,
		population: null,
		timezone: 'America/Los_Angeles',
		type: 'state'
	}
}

function cityRow(
	geonameId: number,
	countryCode: string,
	countryName: string,
	stateCode: string,
	stateName: string,
	name: string
): Row {
	return {
		country_code: countryCode,
		country_name: countryName,
		geoname_id: geonameId,
		latitude: '0',
		longitude: '0',
		name,
		population: 0,
		state_code: stateCode,
		state_name: stateName,
		timezone: 'America/Los_Angeles'
	}
}

function searchRow(
	name: string,
	type: string,
	countryCode: string,
	stateCode: string,
	extra: Row
): Row {
	return {
		name,
		type,
		country_code: countryCode,
		state_code: stateCode,
		extra: JSON.stringify(extra)
	}
}
