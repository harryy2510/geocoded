import { afterEach, describe, expect, test } from 'bun:test'
import {
	type Country,
	type Currency,
	createGeocodedClient,
	FetchError,
	GeocodedAmbiguousError
} from '../packages/client/src/index'

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

function clientFor(
	server: { fetch: typeof fetch },
	apiUrl = 'https://api.test'
) {
	globalThis.fetch = server.fetch
	return createGeocodedClient({ apiUrl })
}

describe('geocoded client', () => {
	test('client types match nullable country metrics and currency decimals', () => {
		const country = {
			id: 'EX',
			name: 'Example',
			iso2: 'EX',
			iso3: 'EXA',
			capital: '',
			latitude: '0',
			longitude: '0',
			areaSqKm: 0,
			region: '',
			subregion: '',
			continent: '',
			neighbours: [],
			timezones: [],
			population: 0,
			nationality: '',
			languages: [],
			native: 'Example',
			gdp: null,
			currency: 'XXX',
			currencyName: '',
			currencySymbol: '',
			phoneCode: '',
			tld: '',
			postalCodeFormat: null,
			postalCodeRegex: null,
			emoji: '',
			emojiU: '',
			flagUrl: '',
			translations: {},
			drivingSide: '',
			measurementSystem: '',
			firstDayOfWeek: '',
			timeFormat: '',
			literacy: null
		} satisfies Country
		const currency = {
			code: 'XXX',
			name: 'No Currency',
			symbol: '',
			decimals: 0,
			countries: ['EX']
		} satisfies Currency

		expect(country.gdp).toBeNull()
		expect(country.literacy).toBeNull()
		expect(currency.decimals).toBe(0)
	})

	test('fetches current location from the root endpoint with field projection', async () => {
		const server = jsonFetch({
			country: 'US',
			regionCode: 'CA',
			city: 'San Francisco',
			ip: '203.0.113.8'
		})
		const client = clientFor(server)

		const location = await client.fetchCurrentLocation({
			fields: ['country', 'regionCode', 'city', 'ip']
		})

		expect(location.city).toBe('San Francisco')
		expect(server.urls).toEqual([
			'https://api.test/v2?fields=country,regionCode,city,ip'
		])
	})

	test('trims trailing slashes from custom API URLs', async () => {
		const server = jsonFetch({
			data: [{ name: 'Canada' }],
			meta: pageMeta(1)
		})
		const client = clientFor(server, 'https://example.test/')

		const countries = await client.fetchCountries()

		expect(countries.map((country) => country.name)).toEqual(['Canada'])
		expect(server.urls).toEqual([
			'https://example.test/v2/countries?limit=2000'
		])
	})

	test('fetches states with encoded country identifiers', async () => {
		const server = jsonFetch({
			data: [{ name: 'New York' }],
			meta: pageMeta(1)
		})
		const client = clientFor(server)

		const states = await client.fetchStates('United States')

		expect(states.map((state) => state.name)).toEqual(['New York'])
		expect(server.urls).toEqual([
			'https://api.test/v2/states?limit=2000&filter%5Bcountry%5D=United+States'
		])
	})

	test('fetches cities with encoded path segments and default limit', async () => {
		const page = {
			data: [{ name: 'Los Angeles' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = clientFor(server)

		const cities = await client.fetchCities('US/CA', 'New York')

		expect(cities.data.map((city) => city.name)).toEqual(['Los Angeles'])
		expect(cities.meta).toEqual(page.meta)
		expect(server.urls).toEqual([
			'https://api.test/v2/cities?limit=50&filter%5Bcountry%5D=US%2FCA&filter%5Bstate%5D=New+York'
		])
	})

	test('fetches country-level cities for rows without state parents', async () => {
		const page = {
			data: [{ name: 'Abu Musa', stateCode: '' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = clientFor(server)

		const cities = await client.fetchCountryCities('AE', 25)

		expect(cities.data.map((city) => city.name)).toEqual(['Abu Musa'])
		expect(cities.meta).toEqual(page.meta)
		expect(server.urls).toEqual([
			'https://api.test/v2/cities?limit=25&filter%5Bcountry%5D=AE'
		])
	})

	test('uses custom city limits', async () => {
		const server = jsonFetch({ data: [], meta: pageMeta(0) })
		const client = clientFor(server)

		await client.fetchCities('US', 'CA', 250)

		expect(server.urls).toEqual([
			'https://api.test/v2/cities?limit=250&filter%5Bcountry%5D=US&filter%5Bstate%5D=CA'
		])
	})

	test('fetches timezones and currencies through paginated list helpers', async () => {
		const server = sequenceFetch([
			{
				data: [{ timezone: 'America/Los_Angeles' }],
				meta: pageMeta(1)
			},
			{
				data: [{ code: 'USD' }],
				meta: pageMeta(1)
			}
		])
		const client = clientFor(server)

		const timezones = await client.fetchTimezones()
		const currencies = await client.fetchCurrencies()

		expect(timezones.map((timezone) => timezone.timezone)).toEqual([
			'America/Los_Angeles'
		])
		expect(currencies.map((currency) => currency.code)).toEqual(['USD'])
		expect(server.urls).toEqual([
			'https://api.test/v2/timezones?limit=2000',
			'https://api.test/v2/currencies?limit=2000'
		])
	})

	test('search encodes arbitrary query text', async () => {
		const page = {
			data: [{ type: 'city', name: 'San Francisco' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = clientFor(server)

		const results = await client.search('San Francisco & state')

		expect(results).toEqual(page)
		expect(server.urls).toEqual([
			'https://api.test/search?q=San+Francisco+%26+state'
		])
	})

	test('page helpers preserve autocomplete pagination params', async () => {
		const server = sequenceFetch([
			{ data: [], meta: pageMeta(0) },
			{ data: [], meta: pageMeta(0) },
			{ data: [], meta: pageMeta(0) },
			{ data: [], meta: pageMeta(0) }
		])
		const client = clientFor(server)

		await client.fetchCountryPage({
			limit: 100,
			offset: 100,
			q: 'uni',
			fields: ['name', 'iso2']
		})
		await client.fetchStatePage('US', { limit: 100, q: 'cal' })
		await client.fetchCityPage('US', 'CA', { limit: 100, q: 'san' })
		await client.search('san', { limit: 100, type: 'city' })

		expect(server.urls).toEqual([
			'https://api.test/v2/countries?limit=100&offset=100&q=uni&fields=name,iso2',
			'https://api.test/v2/states?limit=100&q=cal&filter%5Bcountry%5D=US',
			'https://api.test/v2/cities?limit=100&q=san&filter%5Bcountry%5D=US&filter%5Bstate%5D=CA',
			'https://api.test/search?limit=100&q=san&type=city'
		])
	})

	test('looks up one country, state, and city on v2 paths', async () => {
		const server = sequenceFetch([
			{ id: 'US', name: 'United States', iso2: 'US' },
			{ id: 'US:CA', name: 'California', stateCode: 'CA', countryCode: 'US' },
			{ id: '5368361', name: 'Los Angeles', geonameId: 5368361 }
		])
		const client = clientFor(server)

		const country = await client.getCountry('United States', {
			fields: ['id', 'name']
		})
		const state = await client.getStateInCountry('US', 'California')
		const city = await client.getCity('Los Angeles')

		expect(country.name).toBe('United States')
		expect(state.iso2).toBe('CA')
		expect(state.stateCode).toBe('CA')
		expect(city.geonameId).toBe(5368361)
		expect(server.urls).toEqual([
			'https://api.test/v2/countries/United%20States?fields=id,name',
			'https://api.test/v2/countries/US/states/California',
			'https://api.test/v2/cities/Los%20Angeles'
		])
	})

	test('throws FetchError for failed API responses', async () => {
		const server = jsonFetch(
			{ error: 'bad' },
			{ status: 503, statusText: 'Unavailable' }
		)
		const client = clientFor(server)

		try {
			await client.fetchCountries()
			throw new Error('expected fetch to fail')
		} catch (error) {
			expect(error).toBeInstanceOf(FetchError)
			expect((error as FetchError).status).toBe(503)
		}
	})

	test('throws GeocodedAmbiguousError when a get-one lookup collides', async () => {
		const server = jsonFetch(
			{
				error: 'City is ambiguous',
				hint: 'Use a scoped path',
				matches: [
					{ id: '1', name: 'Springfield', stateCode: 'IL' },
					{ id: '2', name: 'Springfield', stateCode: 'MO' }
				]
			},
			{ status: 409, statusText: 'Conflict' }
		)
		const client = clientFor(server)

		try {
			await client.getCity('Springfield')
			throw new Error('expected lookup to collide')
		} catch (error) {
			expect(error).toBeInstanceOf(GeocodedAmbiguousError)
			const conflict = error as GeocodedAmbiguousError<{ stateCode: string }>
			expect(conflict.status).toBe(409)
			expect(conflict.hint).toBe('Use a scoped path')
			expect(conflict.matches.map((city) => city.stateCode)).toEqual([
				'IL',
				'MO'
			])
		}
	})

	test('reads the structured error envelope on collisions', async () => {
		const server = jsonFetch(
			{
				error: {
					code: 'ambiguous',
					message: 'City is ambiguous',
					hint: 'Use a scoped path'
				},
				matches: [{ id: '1', name: 'Springfield', stateCode: 'IL' }]
			},
			{ status: 409, statusText: 'Conflict' }
		)
		const client = clientFor(server)

		try {
			await client.getCity('Springfield')
			throw new Error('expected lookup to collide')
		} catch (error) {
			expect(error).toBeInstanceOf(GeocodedAmbiguousError)
			const conflict = error as GeocodedAmbiguousError<{ stateCode: string }>
			expect(conflict.message).toBe('City is ambiguous')
			expect(conflict.hint).toBe('Use a scoped path')
			expect(conflict.matches).toHaveLength(1)
		}
	})

	test('lists and looks up remaining v2 collections', async () => {
		const server = sequenceFetch([
			{ data: [{ id: 'AS', name: 'AS' }], meta: pageMeta(1) },
			{ id: 'AS', name: 'AS', countryCount: 1 },
			{ data: [{ id: 'AEABU', name: 'Abu al Bukhoosh' }], meta: pageMeta(1) }
		])
		const client = clientFor(server)

		const continents = await client.fetchContinents({ fields: ['id', 'name'] })
		const continent = await client.getContinent('AS')
		const ports = await client.fetchPorts({ filter: { country: 'AE' } })

		expect(continents[0]?.id).toBe('AS')
		expect(continent.countryCount).toBe(1)
		expect(ports[0]?.name).toBe('Abu al Bukhoosh')
		expect(server.urls).toEqual([
			'https://api.test/v2/continents?limit=2000&fields=id,name',
			'https://api.test/v2/continents/AS',
			'https://api.test/v2/ports?limit=2000&filter%5Bcountry%5D=AE'
		])
	})
})

function jsonFetch(
	body: unknown,
	init: { status?: number; statusText?: string } = {}
): { fetch: typeof fetch; urls: string[] } {
	const urls: string[] = []
	const fetcher: typeof fetch = Object.assign(
		async (...args: Parameters<typeof fetch>) => {
			const [input] = args
			urls.push(inputToUrl(input))
			return Response.json(body, init)
		},
		{ preconnect: (..._args: Parameters<typeof fetch.preconnect>) => undefined }
	)
	return { fetch: fetcher, urls }
}

function sequenceFetch(bodies: unknown[]): {
	fetch: typeof fetch
	urls: string[]
} {
	const urls: string[] = []
	let index = 0
	const fetcher: typeof fetch = Object.assign(
		async (...args: Parameters<typeof fetch>) => {
			const [input] = args
			urls.push(inputToUrl(input))
			const body = bodies[index] ?? bodies[bodies.length - 1]
			index += 1
			return Response.json(body)
		},
		{ preconnect: (..._args: Parameters<typeof fetch.preconnect>) => undefined }
	)
	return { fetch: fetcher, urls }
}

function inputToUrl(input: Parameters<typeof fetch>[0]): string {
	if (typeof input === 'string') return input
	if (input instanceof URL) return input.toString()
	return input.url
}

function pageMeta(total: number) {
	return {
		total,
		limit: 2000,
		offset: 0,
		hasMore: false,
		cursor: null
	}
}
