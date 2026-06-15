import { describe, expect, test } from 'bun:test'
import app from '../apps/api/src/index'

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
		cityRow(4, 'ID', 'Indonesia', 'JI', 'East Java', 'Krajan'),
		cityRow(5, 'AE', 'United Arab Emirates', '', '', 'Abu Musa')
	]

	readonly timezones = [
		timezoneRow('America/Los_Angeles', ['US'], '+3403-11815', {
			abbreviation: 'PT',
			name: 'Pacific Time',
			standard_offset: -28800,
			standard_offset_name: 'UTC-08:00',
			standard_abbreviation: 'PST',
			standard_name: 'Pacific Standard Time',
			daylight_offset: -25200,
			daylight_offset_name: 'UTC-07:00',
			daylight_abbreviation: 'PDT',
			daylight_name: 'Pacific Daylight Time',
			observes_dst: 1
		}),
		timezoneRow('America/New_York', ['US'], '+4042-07400', {
			abbreviation: 'ET',
			name: 'Eastern Time',
			standard_offset: -18000,
			standard_offset_name: 'UTC-05:00',
			standard_abbreviation: 'EST',
			standard_name: 'Eastern Standard Time',
			daylight_offset: -14400,
			daylight_offset_name: 'UTC-04:00',
			daylight_abbreviation: 'EDT',
			daylight_name: 'Eastern Daylight Time',
			observes_dst: 1
		}),
		timezoneRow('Asia/Tokyo', ['JP'], '+353916+1394441', {
			area: 'Asia',
			location: 'Tokyo',
			latitude: 35.654444,
			longitude: 139.744722,
			abbreviation: 'JST',
			name: 'Japan Standard Time',
			standard_offset: 32400,
			standard_offset_name: 'UTC+09:00',
			standard_abbreviation: 'JST',
			standard_name: 'Japan Standard Time'
		})
	]

	readonly currencies = [
		currencyRow('CAD', 'Canadian Dollar', '$', ['CA']),
		currencyRow('USD', 'US Dollar', '$', ['US'])
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
		if (sql.includes('ROUND(AVG(score)') && sql.includes('FROM quiz_stats')) {
			return this.selectQuizStats(sql, parameters)
		}
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
		if (sql.includes('FROM timezones')) {
			return this.selectTimezones(sql, parameters)
		}
		if (sql.includes('FROM currencies')) {
			return this.selectCurrencies(sql, parameters)
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
		const rows = this.searchRows.filter((row) => {
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
		return applyLimitOffset(rows, sql, parameters)
	}

	private selectCountries(sql: string, parameters: unknown[]): Row[] {
		if (!sql.includes('WHERE')) {
			return applyLimitOffset(sortByName(this.countries), sql, parameters)
		}
		if (sql.includes('iso2 = ?1') || sql.includes('iso3 = ?1')) {
			const upper = String(parameters[0] ?? '').toUpperCase()
			const name = String(parameters[1] ?? '').toLowerCase()
			const rows = this.countries.filter(
				(country) =>
					country.iso2 === upper ||
					country.iso3 === upper ||
					String(country.name).toLowerCase() === name
			)
			return applyLimitOffset(sortByName(rows), sql, parameters)
		}
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		const rows = this.countries.filter((country) =>
			[String(country.name), String(country.iso2), String(country.iso3)].some(
				(value) => value.toLowerCase().includes(query)
			)
		)
		return applyLimitOffset(sortByName(rows), sql, parameters)
	}

	private selectStates(sql: string, parameters: unknown[]): Row[] {
		const countryCode = String(parameters[0] ?? '').toUpperCase()
		let rows = this.states.filter((state) => state.country_code === countryCode)
		if (sql.includes('iso2 = ?2') || sql.includes('name = ?3')) {
			const stateCode = String(parameters[1] ?? '').toUpperCase()
			const stateName = String(parameters[2] ?? '').toLowerCase()
			rows = rows.filter(
				(state) =>
					state.iso2 === stateCode ||
					String(state.name).toLowerCase() === stateName
			)
			return applyLimitOffset(sortByName(rows), sql, parameters)
		}
		if (!sql.includes('LIKE')) {
			return applyLimitOffset(sortByName(rows), sql, parameters)
		}
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		rows = rows.filter((state) =>
			[String(state.name), String(state.iso2), String(state.iso3166_2)].some(
				(value) => value.toLowerCase().includes(query)
			)
		)
		return applyLimitOffset(sortByName(rows), sql, parameters)
	}

	private selectCities(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('geoname_id = ?')) {
			const geonameId = Number(parameters[0])
			return this.cities.filter((city) => city.geoname_id === geonameId)
		}
		const countryCode = String(parameters[0] ?? '').toUpperCase()
		const countryOnly = !sql.includes('state_code = ?')
		const stateCode = String(parameters[1] ?? '').toUpperCase()
		let rows = this.cities.filter((city) =>
			countryOnly
				? city.country_code === countryCode
				: city.country_code === countryCode && city.state_code === stateCode
		)
		if (sql.includes('LOWER(name) = ?') || sql.includes('name = ?')) {
			const query = String(parameters[countryOnly ? 1 : 2] ?? '').toLowerCase()
			rows = rows.filter((city) => String(city.name).toLowerCase() === query)
		}
		if (!sql.includes('LIKE')) {
			return applyLimitOffset(sortByName(rows), sql, parameters)
		}
		const query = likeParameterToQuery(parameters.find(isLikeParameter))
		rows = rows.filter((city) =>
			String(city.name).toLowerCase().includes(query)
		)
		return applyLimitOffset(sortByName(rows), sql, parameters)
	}

	private selectTimezones(sql: string, parameters: unknown[]): Row[] {
		let rows = this.timezones
		if (sql.includes('timezone = ?')) {
			const timezone = String(parameters[0] ?? '')
			rows = rows.filter((row) => row.timezone === timezone)
		}
		return applyLimitOffset(sortByKey(rows, 'timezone'), sql, parameters)
	}

	private selectCurrencies(sql: string, parameters: unknown[]): Row[] {
		let rows = this.currencies
		if (sql.includes('code = ?')) {
			const code = String(parameters[0] ?? '').toUpperCase()
			rows = rows.filter((row) => row.code === code)
		}
		return applyLimitOffset(sortByKey(rows, 'code'), sql, parameters)
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
		if (sql.includes('WHERE mode = ?')) {
			const mode = parameters[0]
			return [
				{
					count: this.quizStats.filter((row) => row.mode === mode).length
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
			'Canada',
			'United States'
		])
		expect(body.meta).toEqual({
			total: 2,
			limit: 25,
			offset: 0,
			hasMore: false,
			cursor: null
		})
	})

	test('returns a cursor when a list page has more rows', async () => {
		const response = await request('/countries?limit=1')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((country) => country.name)).toEqual(['Canada'])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 0,
			hasMore: true,
			cursor: 'MQ'
		})
	})

	test('uses cursor pagination as the next offset', async () => {
		const response = await request('/countries?limit=1&cursor=MQ')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((country) => country.name)).toEqual(['United States'])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 1,
			hasMore: false,
			cursor: null
		})
	})

	test('caps oversized list limits', async () => {
		const response = await request('/countries?limit=999999')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.meta.limit).toBe(2000)
		expect(body.meta.total).toBe(2)
	})

	test('rejects zero list limits', async () => {
		const response = await request('/countries?limit=0')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Query parameter "limit" must be greater than 0'
		})
	})

	test('rejects non-integer offsets', async () => {
		const response = await request('/countries?offset=1.5')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Query parameter "offset" must be an integer'
		})
	})

	test('applies top-level field projection on lists', async () => {
		const response = await request('/countries?fields=name,iso2&limit=1')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>
		expect(body.data).toEqual([{ name: 'Canada', iso2: 'CA' }])
	})

	test('filters global search by type', async () => {
		const response = await request('/search?q=ca&type=city')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ type: string }>
		expect(body.data.map((result) => result.type)).toEqual(['city'])
	})

	test('paginates global search results', async () => {
		const response = await request('/search?q=ca&limit=1')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((result) => result.name)).toEqual(['California'])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 0,
			hasMore: true,
			cursor: 'MQ'
		})
	})

	test('rejects blank global search queries', async () => {
		const response = await request('/search?q=%20%20')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Query parameter "q" is required' })
	})

	test('rejects invalid global search type filters', async () => {
		const response = await request('/search?q=ca&type=continent')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Query parameter "type" must be one of: country, state, city'
		})
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

	test('trims scoped country search queries', async () => {
		const response = await request('/countries?q=%20can%20')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((country) => country.name)).toEqual(['Canada'])
		expect(body.meta.total).toBe(1)
	})

	test('looks up countries by lower-case ISO3 code', async () => {
		const response = await request('/countries/usa?fields=name,iso3')

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'United States', iso3: 'USA' })
	})

	test('looks up countries by case-insensitive name', async () => {
		const response = await request(
			'/countries/united%20states?fields=name,iso2'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'United States', iso2: 'US' })
	})

	test('returns 404 when a country lookup misses', async () => {
		const response = await request('/countries/ZZZ')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Country not found' })
	})

	test('searches states within a country with q', async () => {
		const response = await request('/countries/US/states?q=cal')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((state) => state.name)).toEqual(['California'])
		expect(body.meta.total).toBe(1)
	})

	test('lists states with cursor pagination', async () => {
		const response = await request('/countries/us/states?limit=1')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((state) => state.name)).toEqual(['California'])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 0,
			hasMore: true,
			cursor: 'MQ'
		})
	})

	test('looks up states by lower-case ISO2 code', async () => {
		const response = await request('/countries/US/states/ca?fields=name,iso2')

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'California', iso2: 'CA' })
	})

	test('looks up states by case-insensitive name', async () => {
		const response = await request(
			'/countries/US/states/new%20york?fields=name,iso31662'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'New York', iso31662: 'US-NY' })
	})

	test('returns 404 when a state lookup misses', async () => {
		const response = await request('/countries/US/states/TX')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'State not found' })
	})

	test('searches cities within a state with q', async () => {
		const response = await request('/countries/US/states/CA/cities?q=san')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((city) => city.name)).toEqual(['San Francisco'])
		expect(body.meta.total).toBe(1)
	})

	test('lists cities with cursor pagination', async () => {
		const response = await request('/countries/US/states/CA/cities?limit=1')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<{ name: string }>
		expect(body.data.map((city) => city.name)).toEqual(['Los Angeles'])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 0,
			hasMore: true,
			cursor: 'MQ'
		})
	})

	test('looks up city names with field projection', async () => {
		const response = await request(
			'/countries/US/states/CA/cities/Los%20Angeles?fields=name,geonameId'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'Los Angeles', geonameId: 2 })
	})

	test('returns 404 when a city name lookup misses', async () => {
		const response = await request('/countries/US/states/CA/cities/Oakland')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'City not found' })
	})

	test('looks up cities by GeoNames ID', async () => {
		const response = await request('/cities/1?fields=name,stateCode')

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ name: 'San Francisco', stateCode: 'CA' })
	})

	test('rejects non-integer GeoNames IDs', async () => {
		const response = await request('/cities/not-an-id')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'City ID must be a GeoNames integer ID' })
	})

	test('returns 404 when a GeoNames lookup misses', async () => {
		const response = await request('/cities/999')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'City not found' })
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

	test('lists country cities that do not have a state parent', async () => {
		const response = await request(
			'/countries/AE/cities?q=abu&fields=name,stateCode,stateName,geonameId'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>
		expect(body.data).toEqual([
			{
				name: 'Abu Musa',
				stateCode: '',
				stateName: '',
				geonameId: 5
			}
		])
		expect(body.meta.total).toBe(1)
	})

	test('lists timezones with field projection', async () => {
		const response = await request('/timezones?limit=2&fields=timezone')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>
		expect(body.data).toEqual([
			{ timezone: 'America/Los_Angeles' },
			{ timezone: 'America/New_York' }
		])
		expect(body.meta).toEqual({
			total: 3,
			limit: 2,
			offset: 0,
			hasMore: true,
			cursor: 'Mg'
		})
	})

	test('looks up timezone IDs that contain slashes', async () => {
		const response = await request(
			'/timezones/America/Los_Angeles?fields=timezone,countryCodes,name,standardOffsetName,daylightOffsetName,observesDst'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({
			timezone: 'America/Los_Angeles',
			countryCodes: ['US'],
			name: 'Pacific Time',
			standardOffsetName: 'UTC-08:00',
			daylightOffsetName: 'UTC-07:00',
			observesDst: true
		})
	})

	test('returns enriched timezones without source comments', async () => {
		const response = await request('/timezones/Asia/Tokyo')

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toMatchObject({
			timezone: 'Asia/Tokyo',
			countryCodes: ['JP'],
			coordinates: '+353916+1394441',
			latitude: 35.654444,
			longitude: 139.744722,
			area: 'Asia',
			location: 'Tokyo',
			abbreviation: 'JST',
			name: 'Japan Standard Time',
			standardOffset: 32400,
			standardOffsetName: 'UTC+09:00',
			standardAbbreviation: 'JST',
			standardName: 'Japan Standard Time',
			daylightOffset: null,
			daylightOffsetName: null,
			daylightAbbreviation: null,
			daylightName: null,
			observesDst: false
		})
		expect(body).not.toHaveProperty('comments')
	})

	test('returns 404 when a timezone lookup misses', async () => {
		const response = await request('/timezones/Etc/Missing')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Timezone not found' })
	})

	test('lists currencies with pagination', async () => {
		const response = await request('/currencies?limit=1&fields=code,name')

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>
		expect(body.data).toEqual([{ code: 'CAD', name: 'Canadian Dollar' }])
		expect(body.meta).toEqual({
			total: 2,
			limit: 1,
			offset: 0,
			hasMore: true,
			cursor: 'MQ'
		})
	})

	test('looks up currencies by lower-case code', async () => {
		const response = await request('/currencies/usd?fields=code,countries')

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ code: 'USD', countries: ['US'] })
	})

	test('returns 404 when a currency lookup misses', async () => {
		const response = await request('/currencies/XXX')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Currency not found' })
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

	test('root location enrichment supports nested fields and private cache', async () => {
		const response = await request(
			'/?fields=countryInfo.name,cityInfo.name,ip',
			{
				cf: {
					country: 'US',
					regionCode: 'CA',
					city: 'San Francisco'
				},
				headers: { 'cf-connecting-ip': '203.0.113.8' }
			}
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({
			countryInfo: { name: 'United States' },
			cityInfo: { name: 'San Francisco' },
			ip: '203.0.113.8'
		})
	})

	test('docs host root delegates to static assets', async () => {
		const response = await request('/', {
			url: 'https://geocoded.me/',
			assetsFetch: (request) =>
				Response.json({ host: new URL(request.url).hostname })
		})

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ host: 'geocoded.me' })
	})

	test('API host catch-all returns JSON 404', async () => {
		const response = await request('/missing-route')

		expect(response.status).toBe(404)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Not found' })
	})

	test('docs host catch-all delegates to static assets', async () => {
		const response = await request('/missing-route', {
			url: 'https://geocoded.me/missing-route',
			assetsFetch: (request) =>
				Response.json({ path: new URL(request.url).pathname })
		})

		expect(response.status).toBe(200)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ path: '/missing-route' })
	})

	test('postman collection route uses an attachment filename', async () => {
		const response = await request('/postman.json')

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Disposition')).toBe(
			'attachment; filename="geocoded-v1-postman-collection.json"'
		)
		const text = await response.text()
		expect(text).toContain('/countries/AE/cities')
		expect(text).not.toContain('/v2/countries')
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

	test('rejects unknown quiz stat modes', async () => {
		const response = await request('/quiz/stats', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode: 'unknown', score: 5, total: 10 })
		})

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Invalid input' })
	})

	test('rejects quiz scores greater than the total', async () => {
		const response = await request('/quiz/stats', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode: 'capital', score: 11, total: 10 })
		})

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({ error: 'Invalid input' })
	})

	test('accepts quiz stat writes from trusted www site origins', async () => {
		const response = await request('/quiz/stats', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'https://www.geocoded.me'
			},
			body: JSON.stringify({ mode: 'capital', score: 8, total: 10 })
		})

		expect(response.status).toBe(200)
		const body = (await response.json()) as {
			avgScore: number
			percentile: number
			totalAttempts: number
		}
		expect(body).toEqual({
			totalAttempts: 1,
			avgScore: 8,
			percentile: 100
		})
	})

	test('returns quiz score distribution for one mode only', async () => {
		const db = new FakeD1Database()
		for (const stat of [
			{ mode: 'capital', score: 7, total: 10 },
			{ mode: 'capital', score: 9, total: 10 },
			{ mode: 'flag', score: 2, total: 10 }
		]) {
			const response = await request('/quiz/stats', {
				db,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(stat)
			})
			expect(response.status).toBe(200)
		}

		const response = await request('/quiz/stats/capital', { db })

		expect(response.status).toBe(200)
		const body = (await response.json()) as {
			distribution: Array<{ count: number; score: number }>
			totalAttempts: number
		}
		expect(body).toEqual({
			totalAttempts: 2,
			distribution: [
				{ score: 7, count: 1 },
				{ score: 9, count: 1 }
			]
		})
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
		expect(parameterNames(spec, '/countries/{country}/cities')).toContain('q')
		expect(parameterNames(spec, '/countries/{country}/states')).toContain('q')
		expect(
			parameterNames(spec, '/countries/{country}/states/{state}/cities')
		).toContain('q')
		expect(responseSchema(spec, '/countries')).not.toHaveProperty('oneOf')
		expect(spec.paths).not.toHaveProperty('/v2/countries')
	})
})

async function request(
	path: string,
	options: {
		assetsFetch?: (request: Request) => Promise<Response> | Response
		body?: BodyInit
		cf?: Partial<IncomingRequestCfProperties>
		db?: FakeD1Database
		headers?: HeadersInit
		method?: string
		url?: string
	} = {}
): Promise<Response> {
	const env = {
		API_URL: 'https://api.geocoded.me',
		SITE_URL: 'https://geocoded.me',
		GEO_DB: options.db ?? new FakeD1Database(),
		ASSETS: {
			fetch: (request: Request) =>
				options.assetsFetch?.(request) ??
				new Response('not found', { status: 404 })
		}
	}

	const rawRequest = new Request(
		options.url ?? `https://api.geocoded.me${path}`,
		{
			body: options.body,
			headers: options.headers,
			method: options.method
		}
	)
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

function applyLimitOffset(
	rows: Row[],
	sql: string,
	parameters: unknown[]
): Row[] {
	if (!sql.includes('LIMIT ? OFFSET ?')) return rows
	const limit = Number(parameters[parameters.length - 2] ?? rows.length)
	const offset = Number(parameters[parameters.length - 1] ?? 0)
	return rows.slice(offset, offset + limit)
}

function sortByName(rows: Row[]): Row[] {
	return sortByKey(rows, 'name')
}

function sortByKey(rows: Row[], key: string): Row[] {
	return [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])))
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

function timezoneRow(
	timezone: string,
	countryCodes: string[],
	coordinates: string,
	overrides: Partial<Row> = {}
): Row {
	return {
		abbreviation: 'UTC',
		area: timezone.split('/')[0] ?? '',
		coordinates,
		country_codes: JSON.stringify(countryCodes),
		daylight_abbreviation: null,
		daylight_name: null,
		daylight_offset: null,
		daylight_offset_name: null,
		latitude: 0,
		location: timezone.split('/').at(-1)?.replaceAll('_', ' ') ?? timezone,
		longitude: 0,
		name: 'Universal Time',
		observes_dst: 0,
		standard_abbreviation: 'UTC',
		standard_name: 'Universal Time',
		standard_offset: 0,
		standard_offset_name: 'UTC+00:00',
		timezone,
		...overrides
	}
}

function currencyRow(
	code: string,
	name: string,
	symbol: string,
	countries: string[]
): Row {
	return {
		code,
		countries: JSON.stringify(countries),
		decimals: 2,
		name,
		symbol
	}
}
