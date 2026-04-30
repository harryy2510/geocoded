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
		cityRow('US', 'United States', 'CA', 'California', 'San Francisco'),
		cityRow('US', 'United States', 'CA', 'California', 'Los Angeles')
	]

	readonly searchRows = [
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

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this, sql)
	}

	batch(statements: FakeStatement[]): Promise<FakeStatementResult[]> {
		return Promise.all(statements.map((statement) => statement.all()))
	}

	select(sql: string, parameters: unknown[]): Row[] {
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
		return []
	}

	private selectSearchRows(sql: string, parameters: unknown[]): Row[] {
		const query = ftsParameterToQuery(parameters[0])
		const typeParameter = parameters.find((parameter) =>
			['country', 'state', 'city'].includes(String(parameter))
		)
		return this.searchRows.filter((row) => {
			const matchesName = String(row.name).toLowerCase().includes(query)
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
		const countryCode = String(parameters[0] ?? '').toUpperCase()
		const stateCode = String(parameters[1] ?? '').toUpperCase()
		const rows = this.cities.filter(
			(city) =>
				city.country_code === countryCode && city.state_code === stateCode
		)
		if (!sql.includes('LIKE')) return rows
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		return rows.filter((city) =>
			String(city.name).toLowerCase().includes(query)
		)
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

async function request(path: string): Promise<Response> {
	const env = {
		GEO_DB: new FakeD1Database(),
		ASSETS: {
			fetch: () => new Response('not found', { status: 404 })
		}
	}

	return await app.fetch(new Request(`https://api.geocoded.me${path}`), env)
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
	countryCode: string,
	countryName: string,
	stateCode: string,
	stateName: string,
	name: string
): Row {
	return {
		country_code: countryCode,
		country_name: countryName,
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
