const API_URL =
	typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env
		? ((import.meta as Record<string, unknown>).env as Record<string, string>)
				.PUBLIC_API_URL || 'https://api.geocoded.me'
		: 'https://api.geocoded.me'

export type Country = {
	name: string
	iso2: string
	iso3: string
	capital: string
	latitude: number
	longitude: number
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
	latitude: number
	longitude: number
	timezone: string
	capital: boolean
	population: number
	type: string
}

export type City = {
	name: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	latitude: number
	longitude: number
	population: number
	timezone: string
}

export type Timezone = {
	zoneName: string
	abbreviation: string
	gmtOffset: number
	gmtOffsetName: string
	tzName: string
	countryCode: string
	countryName: string
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
	return apiFetch<Country[]>('/countries')
}

export async function fetchStates(countryCode: string): Promise<State[]> {
	return apiFetch<State[]>(`/countries/${countryCode}/states`)
}

export async function fetchCities(
	countryCode: string,
	stateCode: string,
	limit = 50,
): Promise<City[] | PaginatedResponse<City>> {
	return apiFetch<City[] | PaginatedResponse<City>>(
		`/countries/${countryCode}/states/${stateCode}/cities?limit=${limit}`,
	)
}

export async function fetchTimezones(): Promise<Timezone[]> {
	return apiFetch<Timezone[]>('/timezones')
}

export async function fetchCurrencies(): Promise<Currency[]> {
	return apiFetch<Currency[]>('/currencies')
}

export async function search(
	query: string,
): Promise<PaginatedResponse<{ type: string; name: string; [key: string]: unknown }>> {
	return apiFetch(`/search?q=${encodeURIComponent(query)}`)
}
