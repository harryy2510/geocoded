import { describe, expect, test } from 'bun:test'
import {
	type Country,
	type Currency,
	createGeocodedClient
} from '../packages/client/src/index'

describe('geocoded client', () => {
	test('client types match nullable country metrics and currency decimals', () => {
		const country = {
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

	test('trims trailing slashes from custom API URLs', async () => {
		const server = jsonFetch({
			data: [{ name: 'Canada' }],
			meta: pageMeta(1)
		})
		const client = createGeocodedClient({
			apiUrl: 'https://example.test/',
			fetch: server.fetch
		})

		const countries = await client.fetchCountries()

		expect(countries.map((country) => country.name)).toEqual(['Canada'])
		expect(server.urls).toEqual(['https://example.test/countries?limit=2000'])
	})

	test('fetches states with encoded country identifiers', async () => {
		const server = jsonFetch({
			data: [{ name: 'New York' }],
			meta: pageMeta(1)
		})
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		const states = await client.fetchStates('United States')

		expect(states.map((state) => state.name)).toEqual(['New York'])
		expect(server.urls).toEqual([
			'https://api.test/countries/United%20States/states?limit=2000'
		])
	})

	test('fetches cities with encoded path segments and default limit', async () => {
		const page = {
			data: [{ name: 'Los Angeles' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		const cities = await client.fetchCities('US/CA', 'New York')

		expect(cities.data.map((city) => city.name)).toEqual(['Los Angeles'])
		expect(cities.meta).toEqual(page.meta)
		expect(server.urls).toEqual([
			'https://api.test/countries/US%2FCA/states/New%20York/cities?limit=50'
		])
	})

	test('fetches country-level cities for rows without state parents', async () => {
		const page = {
			data: [{ name: 'Abu Musa', stateCode: '' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		const cities = await client.fetchCountryCities('AE', 25)

		expect(cities.data.map((city) => city.name)).toEqual(['Abu Musa'])
		expect(cities.meta).toEqual(page.meta)
		expect(server.urls).toEqual([
			'https://api.test/countries/AE/cities?limit=25'
		])
	})

	test('uses custom city limits', async () => {
		const server = jsonFetch({ data: [], meta: pageMeta(0) })
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		await client.fetchCities('US', 'CA', 250)

		expect(server.urls).toEqual([
			'https://api.test/countries/US/states/CA/cities?limit=250'
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
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		const timezones = await client.fetchTimezones()
		const currencies = await client.fetchCurrencies()

		expect(timezones.map((timezone) => timezone.timezone)).toEqual([
			'America/Los_Angeles'
		])
		expect(currencies.map((currency) => currency.code)).toEqual(['USD'])
		expect(server.urls).toEqual([
			'https://api.test/timezones?limit=2000',
			'https://api.test/currencies?limit=2000'
		])
	})

	test('search encodes arbitrary query text', async () => {
		const page = {
			data: [{ type: 'city', name: 'San Francisco' }],
			meta: pageMeta(1)
		}
		const server = jsonFetch(page)
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		const results = await client.search('San Francisco & state')

		expect(results).toEqual(page)
		expect(server.urls).toEqual([
			'https://api.test/search?q=San%20Francisco%20%26%20state'
		])
	})

	test('throws status details for failed API responses', async () => {
		const server = jsonFetch(
			{ error: 'bad' },
			{ status: 503, statusText: 'Unavailable' }
		)
		const client = createGeocodedClient({
			apiUrl: 'https://api.test',
			fetch: server.fetch
		})

		await expect(client.fetchCountries()).rejects.toThrow(
			'API error: 503 Unavailable'
		)
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
