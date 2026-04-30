const importMetaEnv = (import.meta as unknown as { env?: Record<string, string> })
	.env
const API_URL = importMetaEnv?.PUBLIC_API_URL || 'https://api.geocoded.me'

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

type PaginatedResponse<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
		cursor: string | null
	}
}

async function apiFetch<T>(path: string): Promise<T> {
	const res = await fetch(`${API_URL}${path}`)
	if (!res.ok) {
		throw new Error(`API error: ${res.status} ${res.statusText}`)
	}
	return res.json() as Promise<T>
}

export async function fetchCountries(): Promise<Country[]> {
	return fetchPaginatedList<Country>('/countries?limit=2000')
}

export async function fetchStates(countryCode: string): Promise<State[]> {
	return fetchPaginatedList<State>(
		`/countries/${encodeURIComponent(countryCode)}/states?limit=2000`,
	)
}

export async function fetchCities(
	countryCode: string,
	stateCode: string,
	limit = 50,
): Promise<PaginatedResponse<City>> {
	return apiFetch<PaginatedResponse<City>>(
		`/countries/${encodeURIComponent(countryCode)}/states/${encodeURIComponent(stateCode)}/cities?limit=${limit}`,
	)
}

export async function fetchTimezones(): Promise<TimezoneEntry[]> {
	return fetchPaginatedList<TimezoneEntry>('/timezones?limit=2000')
}

export async function fetchCurrencies(): Promise<Currency[]> {
	return fetchPaginatedList<Currency>('/currencies?limit=2000')
}

export async function search(
	query: string,
): Promise<PaginatedResponse<{ type: string; name: string; [key: string]: unknown }>> {
	return apiFetch(`/search?q=${encodeURIComponent(query)}`)
}

async function fetchPaginatedList<T>(path: string): Promise<T[]> {
	const response = await apiFetch<PaginatedResponse<T>>(path)
	return response.data
}
