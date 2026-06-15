import { describe, expect, test } from 'bun:test'
import app from '../apps/api/src/index'

type Row = Record<string, unknown>

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
		private readonly db: FakeV2D1Database,
		private readonly sql: string
	) {}

	bind(...parameters: unknown[]) {
		this.parameters = parameters
		return this
	}

	all(): Promise<{ results: Row[] }> {
		return Promise.resolve({
			results: this.db.select(this.sql, this.parameters)
		})
	}

	first<T = Row>(): Promise<T | null> {
		const [first] = this.db.select(this.sql, this.parameters)
		return Promise.resolve((first as T | undefined) ?? null)
	}
}

class FakeV2D1Database {
	readonly countries = [
		{
			iso2: 'AE',
			iso3: 'ARE',
			name: 'United Arab Emirates',
			continent: 'AS',
			region: 'Asia',
			currency: 'AED',
			population: 10642745,
			capital: 'Abu Dhabi',
			native: 'United Arab Emirates',
			currency_name: 'UAE Dirham',
			currency_symbol: 'د.إ',
			tld: '.ae',
			phone_code: '971',
			numeric_code: '784',
			nationality: 'Emirati',
			subregion: 'Western Asia',
			emoji: '🇦🇪',
			emoji_u: 'U+1F1E6 U+1F1EA',
			latitude: '24',
			longitude: '54',
			area_sq_km: 83600,
			gdp: 504000000000,
			postal_code_format: null,
			postal_code_regex: null,
			timezones: '[]',
			translations: '{}',
			neighbours: '[]',
			languages: '["ar"]',
			flag_url: '',
			driving_side: 'right',
			measurement_system: 'metric',
			first_day_of_week: 'monday',
			time_format: 'HH:mm',
			literacy: 98
		},
		{
			iso2: 'CA',
			iso3: 'CAN',
			name: 'Canada',
			continent: 'North America',
			region: 'Americas',
			currency: 'CAD',
			population: 40000000,
			capital: 'Ottawa',
			native: 'Canada',
			currency_name: 'Canadian Dollar',
			currency_symbol: '$',
			tld: '.ca',
			phone_code: '1',
			numeric_code: '124',
			nationality: 'Canadian',
			subregion: 'Northern America',
			emoji: '🇨🇦',
			emoji_u: 'U+1F1E8 U+1F1E6',
			latitude: '60',
			longitude: '-95',
			area_sq_km: 9984670,
			gdp: 2140000000000,
			postal_code_format: null,
			postal_code_regex: null,
			timezones: '[]',
			translations: '{}',
			neighbours: '[]',
			languages: '["en","fr"]',
			flag_url: '',
			driving_side: 'right',
			measurement_system: 'metric',
			first_day_of_week: 'monday',
			time_format: 'HH:mm',
			literacy: 99
		}
	]

	readonly statistics = [
		statisticsRow('AE', 'United Arab Emirates', 'ARE', {
			gdpPerCapitaCurrentUsd: 53700,
			populationTotal: 10642745,
			lifeExpectancy: 79
		}),
		statisticsRow('CA', 'Canada', 'CAN', {
			gdpPerCapitaCurrentUsd: 53372,
			populationTotal: 40000000,
			lifeExpectancy: 82
		})
	]

	readonly states = [
		{
			country_code: 'AE',
			country_name: 'United Arab Emirates',
			iso2: 'AZ',
			iso3166_2: 'AE-AZ',
			name: 'Abu Dhabi',
			type: 'emirate',
			population: 3000000,
			latitude: '24.46667',
			longitude: '54.36667',
			timezone: 'Asia/Dubai',
			capital: 'Abu Dhabi'
		}
	]

	readonly cities = [
		{
			country_code: 'AE',
			country_name: 'United Arab Emirates',
			state_code: 'AZ',
			state_name: 'Abu Dhabi',
			name: 'Abu Dhabi',
			latitude: '24.46667',
			longitude: '54.36667',
			timezone: 'Asia/Dubai',
			population: 1500000,
			geoname_id: 292968
		}
	]

	readonly timezones = [
		{
			timezone: 'Asia/Dubai',
			country_codes: '["AE"]',
			coordinates: '+2518+05518',
			latitude: 25.3,
			longitude: 55.3,
			area: 'Asia',
			location: 'Dubai',
			abbreviation: '+04',
			name: 'Gulf Standard Time',
			standard_offset: 240,
			standard_offset_name: 'UTC+04:00',
			standard_abbreviation: '+04',
			standard_name: 'Gulf Standard Time',
			daylight_offset: null,
			daylight_offset_name: null,
			daylight_abbreviation: null,
			daylight_name: null,
			observes_dst: 0
		}
	]

	readonly currencies = [
		{
			code: 'AED',
			name: 'UAE Dirham',
			symbol: 'د.إ',
			decimals: 2,
			countries: '["AE"]'
		}
	]

	readonly airlines = [
		{
			id: 'GB:ABX:832',
			name: 'ABX Air',
			iata_code: 'GB',
			accounting_code: '832',
			icao_code: 'ABX',
			country_name: 'United States',
			country_code: 'US',
			controlled_duplicate: 0
		}
	]

	readonly airports = [
		{
			id: 'geoname:6300094',
			geoname_id: 6300094,
			name: 'Abu Dhabi Bateen Airport',
			ascii_name: 'Abu Dhabi Bateen Airport',
			alternate_names: '["AZI","Al Bateen Executive Airport"]',
			un_locode: null,
			airport_location_code: null,
			iata_code: null,
			iata_code_source: null,
			latitude: '24.42833',
			longitude: '54.45808',
			country_code: 'AE',
			country_name: 'United Arab Emirates',
			state_code: '01',
			state_name: '',
			admin2_code: '101',
			elevation: 4,
			timezone: 'Asia/Dubai',
			modification_date: '2024-03-14'
		}
	]

	readonly ports = [
		{
			id: 'AEABU',
			un_locode: 'AEABU',
			country_code: 'AE',
			country_name: 'United Arab Emirates',
			location_code: 'ABU',
			iata_code: null,
			iata_code_source: null,
			name: 'Abu al Bukhoosh',
			name_without_diacritics: 'Abu al Bukhoosh',
			alternate_names: '[]',
			subdivision_code: null,
			function_code: '1-------',
			functions: '["port"]',
			status: 'RL',
			status_name: 'Recognised location',
			date: '0307',
			coordinates: '2529N 05308E',
			latitude: 25.483333,
			longitude: 53.133333,
			remarks: null,
			change_indicator: null
		}
	]

	readonly borderCrossings = [
		{
			id: 'ADFMO',
			un_locode: 'ADFMO',
			country_code: 'AD',
			country_name: 'Andorra',
			location_code: 'FMO',
			iata_code: null,
			iata_code_source: null,
			name: 'La Farga de Moles',
			name_without_diacritics: 'La Farga de Moles',
			alternate_names: '[]',
			subdivision_code: null,
			function_code: '--3----B',
			functions: '["road","borderCrossing"]',
			status: 'RQ',
			status_name: 'Request under consideration',
			date: '0307',
			coordinates: null,
			latitude: null,
			longitude: null,
			remarks: null,
			change_indicator: null
		}
	]

	readonly migrations = [
		{
			country_code: 'AE',
			country_name: 'United Arab Emirates',
			iso3: 'ARE',
			m49_code: '784',
			year: 2024,
			coverage: null,
			source_data_type_code: 'C',
			source_data_type_methods: '["foreign citizens"]',
			total_international_migrants: 9000000,
			male_international_migrants: 6000000,
			female_international_migrants: 3000000,
			migrant_share_of_population_percent: 88.1,
			origins: '[]'
		}
	]

	prepare(sql: string): FakeStatement {
		return new FakeStatement(this, sql)
	}

	batch(statements: FakeStatement[]): Promise<Array<{ results: Row[] }>> {
		return Promise.all(statements.map((statement) => statement.all()))
	}

	select(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('COUNT(*) AS total')) {
			return [{ total: this.selectRows(sql, parameters).length }]
		}
		return applyLimitOffset(this.selectRows(sql, parameters), parameters)
	}

	private selectRows(sql: string, parameters: unknown[]): Row[] {
		if (sql.includes('FROM (SELECT continent AS id')) {
			return this.filterContinents(sql, parameters)
		}
		if (sql.includes('FROM (SELECT continent ||')) {
			return this.filterRegions(sql, parameters)
		}
		if (sql.includes('FROM country_migration')) {
			return this.filterByCountry(this.migrations, sql, parameters)
		}
		if (sql.includes('FROM country_statistics')) {
			return this.filterStatistics(sql, parameters)
		}
		if (sql.includes('FROM border_crossings')) {
			return this.filterByCountry(this.borderCrossings, sql, parameters)
		}
		if (sql.includes('FROM airports')) {
			return this.filterByCountry(this.airports, sql, parameters)
		}
		if (sql.includes('FROM ports')) {
			return this.filterByCountry(this.ports, sql, parameters)
		}
		if (sql.includes('FROM airlines')) {
			return this.filterByCountry(this.airlines, sql, parameters)
		}
		if (sql.includes('FROM currencies')) {
			return this.filterCurrencies(sql, parameters)
		}
		if (sql.includes('FROM timezones')) {
			return this.filterTimezones(sql, parameters)
		}
		if (sql.includes('FROM cities')) {
			return this.filterByCountry(this.cities, sql, parameters)
		}
		if (sql.includes('FROM states')) {
			return this.filterByCountry(this.states, sql, parameters)
		}
		if (sql.includes('FROM countries')) {
			return this.filterCountries(sql, parameters)
		}
		return []
	}

	private filterContinents(sql: string, parameters: unknown[]): Row[] {
		const continents = new Map<string, number>()
		for (const country of this.countries) {
			continents.set(
				country.continent,
				(continents.get(country.continent) ?? 0) + 1
			)
		}
		return [...continents.entries()]
			.map(([continent, count]) => ({
				id: continent,
				name: continent,
				country_count: count
			}))
			.filter((continent) => {
				if (!sql.includes('id = ?')) return true
				return (
					String(continent.id).toLowerCase() ===
					String(parameters[0]).toLowerCase()
				)
			})
			.sort((a, b) => String(a.name).localeCompare(String(b.name)))
	}

	private filterRegions(sql: string, parameters: unknown[]): Row[] {
		let countries = [...this.countries]
		if (sql.includes('continent = ?')) {
			const continent = String(parameters[0])
			countries = countries.filter((country) => country.continent === continent)
		}
		const regions = new Map<string, Row>()
		for (const country of countries) {
			const id = `${country.continent}:${country.region}`
			const current = regions.get(id)
			regions.set(id, {
				id,
				name: country.region,
				continent: country.continent,
				country_count: Number(current?.country_count ?? 0) + 1
			})
		}
		return [...regions.values()]
			.filter((region) => {
				if (!sql.includes('id = ?')) return true
				return (
					String(region.id).toLowerCase() ===
					String(parameters[0]).toLowerCase()
				)
			})
			.sort((a, b) => String(a.name).localeCompare(String(b.name)))
	}

	private filterByCountry(
		rows: Row[],
		sql: string,
		parameters: unknown[]
	): Row[] {
		let filtered = [...rows]
		if (sql.includes('WHERE id = ?') && sql.includes('OR geoname_id = ?')) {
			const id = String(parameters[0]).toLowerCase()
			const geonameId = parameters.find(
				(value): value is number => typeof value === 'number'
			)
			filtered = filtered.filter(
				(row) =>
					String(row.id).toLowerCase() === id ||
					(typeof geonameId === 'number' && row.geoname_id === geonameId)
			)
		} else {
			if (sql.includes('WHERE id = ?') || sql.includes(' OR id = ?')) {
				const id = String(parameters[0]).toLowerCase()
				filtered = filtered.filter((row) => String(row.id).toLowerCase() === id)
			}
			if (sql.includes('geoname_id = ?')) {
				const geonameId = Number(parameters[0])
				filtered = filtered.filter((row) => row.geoname_id === geonameId)
			}
		}
		if (sql.includes("country_code || ':' || iso2")) {
			const id = String(parameters[0]).toLowerCase()
			filtered = filtered.filter(
				(row) =>
					`${String(row.country_code)}:${String(row.iso2)}`.toLowerCase() ===
						id || String(row.iso3166_2).toLowerCase() === id
			)
		}
		if (sql.includes('country_code = ?')) {
			const countryCode = String(parameters[0]).toUpperCase()
			filtered = filtered.filter((row) => row.country_code === countryCode)
		}
		if (sql.includes('state_code = ?')) {
			const stateCode = String(parameters.find((value) => value === 'AZ') ?? '')
			filtered = filtered.filter((row) => row.state_code === stateCode)
		}
		if (sql.includes('name = ?')) {
			const name = String(
				parameters.find((value) => value === 'Abu Dhabi') ?? ''
			).toLowerCase()
			filtered = filtered.filter(
				(row) => String(row.name).toLowerCase() === name
			)
		}
		if (sql.includes('iata_code = ?')) {
			const iataCode = String(parameters.find((value) => value === 'GB') ?? '')
			filtered = filtered.filter((row) => row.iata_code === iataCode)
		}
		return filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)))
	}

	private filterTimezones(sql: string, parameters: unknown[]): Row[] {
		let filtered = this.filterJsonCountry(
			this.timezones,
			'country_codes',
			parameters
		)
		if (sql.includes('timezone = ?')) {
			const timezone = String(parameters[0])
			filtered = filtered.filter((row) => row.timezone === timezone)
		}
		return filtered
	}

	private filterCurrencies(sql: string, parameters: unknown[]): Row[] {
		let filtered = this.filterJsonCountry(
			this.currencies,
			'countries',
			parameters
		)
		if (sql.includes('code = ?')) {
			const code = String(parameters[0]).toUpperCase()
			filtered = filtered.filter((row) => row.code === code)
		}
		return filtered
	}

	private filterJsonCountry(
		rows: Row[],
		column: string,
		parameters: unknown[]
	): Row[] {
		const countryNeedle = parameters.find(
			(value) => typeof value === 'string' && value.includes('"AE"')
		)
		if (!countryNeedle) return [...rows]
		return rows.filter((row) => String(row[column]).includes('"AE"'))
	}

	private filterCountries(sql: string, parameters: unknown[]): Row[] {
		let rows = [...this.countries]
		if (sql.includes('iso2 = ?')) {
			const countryCode = String(parameters[0]).toUpperCase()
			rows = rows.filter((country) => country.iso2 === countryCode)
		}
		if (sql.includes('currency = ?')) {
			const currency = parameters.find(
				(value) => value === 'AED' || value === 'CAD'
			)
			if (currency)
				rows = rows.filter((country) => country.currency === currency)
		}
		return rows.sort((a, b) => a.name.localeCompare(b.name))
	}

	private filterStatistics(sql: string, parameters: unknown[]): Row[] {
		let rows = [...this.statistics]
		if (sql.includes('country_code = ?')) {
			const countryCode = String(parameters[0]).toUpperCase()
			rows = rows.filter(
				(statistics) => statistics.country_code === countryCode
			)
		}
		return rows.sort((a, b) =>
			String(a.country_name).localeCompare(String(b.country_name))
		)
	}
}

describe('v2 routes', () => {
	test('returns countries with explicit statistics expansion and nested fields', async () => {
		const response = await request(
			'/v2/countries?filter[country]=ae&expand=statistics&fields=*,statistics.gdpPerCapitaCurrentUsd'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>

		expect(body.data).toEqual([
			{
				id: 'AE',
				iso2: 'AE',
				iso3: 'ARE',
				name: 'United Arab Emirates',
				continent: 'AS',
				region: 'Asia',
				currency: 'AED',
				population: 10642745,
				statistics: {
					gdpPerCapitaCurrentUsd: {
						code: 'NY.GDP.PCAP.CD',
						name: 'GDP per capita (current US$)',
						year: 2024,
						value: 53700
					}
				}
			}
		])
		expect(body.meta.total).toBe(1)
	})

	test('returns flattened statistics and uses fields for specific metrics', async () => {
		const response = await request(
			'/v2/statistics?filter[country]=AE&fields=countryCode,countryName,gdpPerCapitaCurrentUsd'
		)

		expect(response.status).toBe(200)
		const body = (await response.json()) as PaginatedBody<
			Record<string, unknown>
		>

		expect(body.data).toEqual([
			{
				countryCode: 'AE',
				countryName: 'United Arab Emirates',
				gdpPerCapitaCurrentUsd: {
					code: 'NY.GDP.PCAP.CD',
					name: 'GDP per capita (current US$)',
					year: 2024,
					value: 53700
				}
			}
		])
	})

	test('returns derived continents and regions', async () => {
		const continentsResponse = await request(
			'/v2/continents?fields=id,name,countryCount'
		)
		const regionsResponse = await request(
			'/v2/regions?filter[continent]=AS&fields=id,name,continent,countryCount'
		)

		expect(continentsResponse.status).toBe(200)
		expect(regionsResponse.status).toBe(200)

		const continents = (await continentsResponse.json()) as PaginatedBody<
			Record<string, unknown>
		>
		const regions = (await regionsResponse.json()) as PaginatedBody<
			Record<string, unknown>
		>

		expect(continents.data).toContainEqual({
			id: 'AS',
			name: 'AS',
			countryCount: 1
		})
		expect(regions.data).toEqual([
			{
				id: 'AS:Asia',
				name: 'Asia',
				continent: 'AS',
				countryCount: 1
			}
		])
	})

	test('returns existing-table v2 collections with bracketed filters', async () => {
		const cases = [
			{
				path: '/v2/states?filter[country]=AE&fields=id,name,countryCode,stateCode',
				expected: {
					id: 'AE:AZ',
					name: 'Abu Dhabi',
					countryCode: 'AE',
					stateCode: 'AZ'
				}
			},
			{
				path: '/v2/cities?filter[country]=AE&fields=id,name,countryCode,stateCode,geonameId',
				expected: {
					id: '292968',
					name: 'Abu Dhabi',
					countryCode: 'AE',
					stateCode: 'AZ',
					geonameId: 292968
				}
			},
			{
				path: '/v2/timezones?filter[country]=AE&fields=id,timezone,name,countryCodes',
				expected: {
					id: 'Asia/Dubai',
					timezone: 'Asia/Dubai',
					name: 'Gulf Standard Time',
					countryCodes: ['AE']
				}
			},
			{
				path: '/v2/currencies?filter[country]=AE&fields=id,code,name,countries',
				expected: {
					id: 'AED',
					code: 'AED',
					name: 'UAE Dirham',
					countries: ['AE']
				}
			}
		]

		for (const testCase of cases) {
			const response = await request(testCase.path)
			expect(response.status).toBe(200)
			const body = (await response.json()) as PaginatedBody<
				Record<string, unknown>
			>
			expect(body.data).toEqual([testCase.expected])
		}
	})

	test('returns new v2 transport and migrant-stock collections', async () => {
		const cases = [
			{
				path: '/v2/airlines?filter[country]=US&filter[iata]=GB&fields=id,name,iataCode,countryCode',
				expected: {
					id: 'GB:ABX:832',
					name: 'ABX Air',
					iataCode: 'GB',
					countryCode: 'US'
				}
			},
			{
				path: '/v2/airports?filter[country]=AE&fields=id,name,countryCode,timezone',
				expected: {
					id: 'geoname:6300094',
					name: 'Abu Dhabi Bateen Airport',
					countryCode: 'AE',
					timezone: 'Asia/Dubai'
				}
			},
			{
				path: '/v2/ports?filter[country]=AE&fields=id,name,countryCode,functions',
				expected: {
					id: 'AEABU',
					name: 'Abu al Bukhoosh',
					countryCode: 'AE',
					functions: ['port']
				}
			},
			{
				path: '/v2/border-crossings?filter[country]=AD&fields=id,name,countryCode,functions',
				expected: {
					id: 'ADFMO',
					name: 'La Farga de Moles',
					countryCode: 'AD',
					functions: ['road', 'borderCrossing']
				}
			},
			{
				path: '/v2/migrant-stocks?filter[country]=AE&fields=id,countryCode,totalInternationalMigrants',
				expected: {
					id: 'AE',
					countryCode: 'AE',
					totalInternationalMigrants: 9000000
				}
			}
		]

		for (const testCase of cases) {
			const response = await request(testCase.path)
			expect(response.status).toBe(200)
			const body = (await response.json()) as PaginatedBody<
				Record<string, unknown>
			>
			expect(body.data).toEqual([testCase.expected])
		}
	})

	test('returns one resource for every v2 root collection with a stable id', async () => {
		const cases = [
			{
				path: '/v2/continents/AS?fields=id,name,countryCount',
				expected: {
					id: 'AS',
					name: 'AS',
					countryCount: 1
				}
			},
			{
				path: '/v2/regions/AS%3AAsia?fields=id,name,continent,countryCount',
				expected: {
					id: 'AS:Asia',
					name: 'Asia',
					continent: 'AS',
					countryCount: 1
				}
			},
			{
				path: '/v2/states/AE%3AAZ?fields=id,name,countryCode,stateCode',
				expected: {
					id: 'AE:AZ',
					name: 'Abu Dhabi',
					countryCode: 'AE',
					stateCode: 'AZ'
				}
			},
			{
				path: '/v2/cities/292968?fields=id,name,countryCode,geonameId',
				expected: {
					id: '292968',
					name: 'Abu Dhabi',
					countryCode: 'AE',
					geonameId: 292968
				}
			},
			{
				path: '/v2/timezones/Asia/Dubai?fields=id,timezone,name',
				expected: {
					id: 'Asia/Dubai',
					timezone: 'Asia/Dubai',
					name: 'Gulf Standard Time'
				}
			},
			{
				path: '/v2/currencies/AED?fields=id,code,name',
				expected: {
					id: 'AED',
					code: 'AED',
					name: 'UAE Dirham'
				}
			},
			{
				path: '/v2/airlines/GB%3AABX%3A832?fields=id,name,iataCode',
				expected: {
					id: 'GB:ABX:832',
					name: 'ABX Air',
					iataCode: 'GB'
				}
			},
			{
				path: '/v2/airports/geoname%3A6300094?fields=id,name,geonameId,countryCode',
				expected: {
					id: 'geoname:6300094',
					name: 'Abu Dhabi Bateen Airport',
					geonameId: 6300094,
					countryCode: 'AE'
				}
			},
			{
				path: '/v2/ports/AEABU?fields=id,name,countryCode',
				expected: {
					id: 'AEABU',
					name: 'Abu al Bukhoosh',
					countryCode: 'AE'
				}
			},
			{
				path: '/v2/border-crossings/ADFMO?fields=id,name,countryCode',
				expected: {
					id: 'ADFMO',
					name: 'La Farga de Moles',
					countryCode: 'AD'
				}
			},
			{
				path: '/v2/statistics/AE?fields=id,countryCode,countryName',
				expected: {
					id: 'AE',
					countryCode: 'AE',
					countryName: 'United Arab Emirates'
				}
			},
			{
				path: '/v2/migrant-stocks/AE?fields=id,countryCode,totalInternationalMigrants',
				expected: {
					id: 'AE',
					countryCode: 'AE',
					totalInternationalMigrants: 9000000
				}
			}
		]

		for (const testCase of cases) {
			const response = await request(testCase.path)
			if (response.status !== 200) {
				throw new Error(`${testCase.path} returned ${response.status}`)
			}
			expect(response.status).toBe(200)
			const body = (await response.json()) as Record<string, unknown>
			expect(body).toEqual(testCase.expected as Record<string, unknown>)
		}
	})

	test('returns 404 for missing v2 detail resources', async () => {
		const response = await request('/v2/airports/missing')

		expect(response.status).toBe(404)
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({ error: 'Airport not found' })
	})

	test('returns caller location from the v2 root route', async () => {
		const response = await request(
			'/v2?fields=country,countryInfo.name,stateInfo.name,cityInfo.name,ip',
			{
				cf: {
					country: 'AE',
					regionCode: 'AZ',
					city: 'Abu Dhabi'
				},
				headers: { 'cf-connecting-ip': '203.0.113.10' }
			}
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('Cache-Control')).toBe('private, no-store')
		const body = (await response.json()) as Record<string, unknown>
		expect(body).toEqual({
			country: 'AE',
			countryInfo: { name: 'United Arab Emirates' },
			stateInfo: { name: 'Abu Dhabi' },
			cityInfo: { name: 'Abu Dhabi' },
			ip: '203.0.113.10'
		})
	})

	test('rejects unsupported v2 filters', async () => {
		const response = await request('/v2/countries?filter[unLocode]=AEJEA')

		expect(response.status).toBe(400)
		const body = (await response.json()) as { error: string }
		expect(body).toEqual({
			error: 'Unsupported query parameter "filter[unLocode]"'
		})
	})

	test('documents v2 countries and statistics in OpenAPI', async () => {
		const response = await request('/v2/openapi.json')

		expect(response.status).toBe(200)
		const spec = (await response.json()) as {
			info: {
				title: string
				description: string
			}
			paths: Record<
				string,
				{
					get?: {
						parameters?: Array<{
							allowReserved?: boolean
							example?: unknown
							name: string
						}>
						tags?: string[]
					}
				}
			>
		}

		expect(spec.info.title).toBe('Geocoded')
		expect(spec.info.description).not.toContain('v2')
		expect(spec.paths).toHaveProperty('/v2')
		expect(spec.paths).toHaveProperty('/v2/countries')
		expect(spec.paths).toHaveProperty('/v2/countries/{id}')
		for (const path of [
			'/v2/continents',
			'/v2/continents/{id}',
			'/v2/regions',
			'/v2/regions/{id}',
			'/v2/states',
			'/v2/states/{id}',
			'/v2/cities',
			'/v2/cities/{id}',
			'/v2/timezones',
			'/v2/timezones/{id}',
			'/v2/currencies',
			'/v2/currencies/{id}',
			'/v2/airlines',
			'/v2/airlines/{id}',
			'/v2/airports',
			'/v2/airports/{id}',
			'/v2/ports',
			'/v2/ports/{id}',
			'/v2/border-crossings',
			'/v2/border-crossings/{id}',
			'/v2/migrant-stocks',
			'/v2/migrant-stocks/{id}'
		]) {
			expect(spec.paths).toHaveProperty(path)
		}
		expect(spec.paths).toHaveProperty('/v2/statistics')
		expect(spec.paths).toHaveProperty('/v2/statistics/{id}')
		expect(spec.paths).not.toHaveProperty('/countries')

		for (const path of Object.values(spec.paths)) {
			const [tag] = path.get?.tags ?? []
			expect(tag?.startsWith('v2 ')).toBe(false)
		}

		const countryParams =
			spec.paths['/v2/countries']?.get?.parameters?.map(
				(parameter) => parameter.name
			) ?? []
		expect(countryParams).toContain('filter[country]')
		expect(countryParams).not.toContain('countryCode')

		const regionParams = spec.paths['/v2/regions']?.get?.parameters ?? []
		expect(regionParams).toContainEqual(
			expect.objectContaining({
				name: 'fields',
				example: 'id,name,continent,countryCount',
				allowReserved: true
			})
		)
		expect(regionParams).toContainEqual(
			expect.objectContaining({
				name: 'filter[continent]',
				example: 'AS',
				allowReserved: true
			})
		)
		expect(regionParams).toContainEqual(
			expect.objectContaining({
				name: 'filter[region]',
				example: 'Asia',
				allowReserved: true
			})
		)
		for (const parameter of regionParams) {
			expect(String(parameter.example ?? '')).not.toContain('%')
			if (parameter.name === 'fields') {
				expect(String(parameter.example)).not.toContain('statistics')
			}
		}
	})

	test('serves a v2-only Postman collection', async () => {
		const response = await request('/v2/postman.json')

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Disposition')).toBe(
			'attachment; filename="geocoded-v2-postman-collection.json"'
		)
		const text = await response.text()
		expect(text).toContain('/v2/countries')
		expect(text).not.toContain('{{baseUrl}}/countries')
		expect(text).not.toContain('%2C')
		expect(text).not.toContain('Middle%20East')
	})
})

async function request(
	path: string,
	options: {
		cf?: Partial<IncomingRequestCfProperties>
		headers?: HeadersInit
	} = {}
): Promise<Response> {
	const rawRequest = new Request(`https://api.geocoded.me${path}`, {
		headers: options.headers
	})
	if (options.cf) {
		Object.defineProperty(rawRequest, 'cf', { value: options.cf })
	}
	return await app.fetch(rawRequest, {
		API_URL: 'https://api.geocoded.me',
		SITE_URL: 'https://geocoded.me',
		GEO_DB: new FakeV2D1Database(),
		ASSETS: {
			fetch: () => new Response('not found', { status: 404 })
		}
	})
}

function statisticsRow(
	countryCode: string,
	countryName: string,
	iso3: string,
	values: {
		gdpPerCapitaCurrentUsd: number
		populationTotal: number
		lifeExpectancy: number
	}
): Row {
	return {
		country_code: countryCode,
		country_name: countryName,
		iso3,
		population_total: JSON.stringify({
			code: 'SP.POP.TOTL',
			name: 'Population, total',
			year: 2024,
			value: values.populationTotal
		}),
		population_female: '{}',
		population_male: '{}',
		population_density: '{}',
		urban_population_percent: '{}',
		rural_population_percent: '{}',
		age_0_to_14_percent: '{}',
		age_15_to_64_percent: '{}',
		age_65_plus_percent: '{}',
		gdp_current_usd: '{}',
		gdp_per_capita_current_usd: JSON.stringify({
			code: 'NY.GDP.PCAP.CD',
			name: 'GDP per capita (current US$)',
			year: 2024,
			value: values.gdpPerCapitaCurrentUsd
		}),
		life_expectancy: JSON.stringify({
			code: 'SP.DYN.LE00.IN',
			name: 'Life expectancy at birth, total (years)',
			year: 2024,
			value: values.lifeExpectancy
		})
	}
}

function applyLimitOffset(rows: Row[], parameters: unknown[]): Row[] {
	const [limit, offset] = parameters
		.filter((value): value is number => typeof value === 'number')
		.slice(-2)
	return rows.slice(
		Number(offset ?? 0),
		Number(offset ?? 25) + Number(limit ?? 25)
	)
}
