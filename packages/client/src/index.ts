const DEFAULT_API_URL = 'https://api.geocoded.me'

function defaultApiUrl(): string {
	const importMetaEnv = (
		import.meta as unknown as { env?: Record<string, string> }
	).env
	return importMetaEnv?.PUBLIC_API_URL || DEFAULT_API_URL
}

export type Country = {
	name: string
	iso2: string
	iso3: string
	capital: string
	latitude: string
	longitude: string
	areaSqKm: number
	region: string
	subregion: string
	continent: string
	neighbours: string[]
	timezones: {
		abbreviation: string
		gmtOffset: number
		gmtOffsetName: string
		tzName: string
		zoneName: string
	}[]
	population: number
	nationality: string
	languages: string[]
	native: string
	gdp: number
	currency: string
	currencyName: string
	currencySymbol: string
	phoneCode: string
	tld: string
	emoji: string
	emojiU: string
	flagUrl: string
	translations: Record<string, string>
	drivingSide: string
	measurementSystem: string
	firstDayOfWeek: string
	timeFormat: string
	literacy: number
}

export type State = {
	name: string
	iso2: string
	iso31662: string
	countryCode: string
	countryName: string
	latitude: string
	longitude: string
	timezone: string
	capital: string | null
	population: number | null
	type: string
}

export type City = {
	name: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	geonameId: number | null
	latitude: string
	longitude: string
	population: number
	timezone: string
}

export type TimezoneEntry = {
	timezone: string
	countryCodes: string[]
	coordinates: string
	comments: string
}

export type Currency = {
	code: string
	name: string
	symbol: string
	countries: string[]
}

export type PaginatedResponse<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
		cursor: string | null
	}
}

export type GeocodedClientOptions = {
	apiUrl?: string
	fetch?: typeof fetch
}

export type GeocodedClient = {
	fetchCountries: () => Promise<Country[]>
	fetchStates: (countryCode: string) => Promise<State[]>
	fetchCities: (
		countryCode: string,
		stateCode: string,
		limit?: number
	) => Promise<PaginatedResponse<City>>
	fetchTimezones: () => Promise<TimezoneEntry[]>
	fetchCurrencies: () => Promise<Currency[]>
	search: (
		query: string
	) => Promise<
		PaginatedResponse<{ type: string; name: string; [key: string]: unknown }>
	>
}

function joinUrl(apiUrl: string, path: string): string {
	return `${apiUrl.replace(/\/$/, '')}${path}`
}

export function createGeocodedClient(
	options: GeocodedClientOptions = {}
): GeocodedClient {
	const apiUrl = options.apiUrl ?? defaultApiUrl()

	async function apiFetch<T>(path: string): Promise<T> {
		const fetcher = options.fetch ?? fetch
		const res = await fetcher(joinUrl(apiUrl, path))
		if (!res.ok) {
			throw new Error(`API error: ${res.status} ${res.statusText}`)
		}
		return res.json() as Promise<T>
	}

	async function fetchPaginatedList<T>(path: string): Promise<T[]> {
		const response = await apiFetch<PaginatedResponse<T>>(path)
		return response.data
	}

	return {
		fetchCountries: () => fetchPaginatedList<Country>('/countries?limit=2000'),
		fetchStates: (countryCode) =>
			fetchPaginatedList<State>(
				`/countries/${encodeURIComponent(countryCode)}/states?limit=2000`
			),
		fetchCities: (countryCode, stateCode, limit = 50) =>
			apiFetch<PaginatedResponse<City>>(
				`/countries/${encodeURIComponent(countryCode)}/states/${encodeURIComponent(stateCode)}/cities?limit=${limit}`
			),
		fetchTimezones: () =>
			fetchPaginatedList<TimezoneEntry>('/timezones?limit=2000'),
		fetchCurrencies: () =>
			fetchPaginatedList<Currency>('/currencies?limit=2000'),
		search: (query) => apiFetch(`/search?q=${encodeURIComponent(query)}`)
	}
}

const defaultClient = createGeocodedClient()

export const fetchCountries = defaultClient.fetchCountries

export const fetchStates = defaultClient.fetchStates

export const fetchCities = defaultClient.fetchCities

export const fetchTimezones = defaultClient.fetchTimezones

export const fetchCurrencies = defaultClient.fetchCurrencies

export const search = defaultClient.search
