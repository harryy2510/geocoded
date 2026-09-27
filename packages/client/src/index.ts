import { FetchError, ofetch } from 'ofetch'

export { FetchError }

const DEFAULT_API_URL = 'https://api.geocoded.me'

function defaultApiUrl(): string {
	const importMetaEnv = (
		import.meta as unknown as { env?: Record<string, string> }
	).env
	return importMetaEnv?.PUBLIC_API_URL || DEFAULT_API_URL
}

/** Country row from `/v2/countries`. */
export type Country = {
	id: string
	name: string
	iso2: string
	iso3: string
	capital: string
	latitude: string
	longitude: string
	areaSqKm: number | null
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
	gdp: number | null
	currency: string
	currencyName: string
	currencySymbol: string
	phoneCode: string
	tld: string
	numericCode?: string
	postalCodeFormat: string | null
	postalCodeRegex: string | null
	emoji: string
	emojiU: string
	flagUrl: string
	translations: Record<string, string>
	drivingSide: string
	measurementSystem: string
	firstDayOfWeek: string
	timeFormat: string
	literacy: number | null
}

/** State / first-level subdivision from `/v2/states`. */
export type State = {
	id: string
	countryCode: string
	countryName: string
	stateCode: string
	/** Same as `stateCode`. Kept so older picker code keeps working. */
	iso2: string
	iso31662: string
	name: string
	type: string
	population: number | null
	latitude: string
	longitude: string
	timezone: string
	capital: string | null
}

/** City row from `/v2/cities`. */
export type City = {
	id: string
	geonameId: number | null
	name: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	latitude: string
	longitude: string
	population: number
	timezone: string
}

/** IANA timezone from `/v2/timezones`. */
export type TimezoneEntry = {
	id?: string
	abbreviation: string
	area: string
	countryCodes: string[]
	coordinates: string
	daylightAbbreviation: string | null
	daylightName: string | null
	daylightOffset: number | null
	daylightOffsetName: string | null
	latitude: number
	location: string
	longitude: number
	name: string
	observesDst: boolean
	standardAbbreviation: string
	standardName: string
	standardOffset: number
	standardOffsetName: string
	timezone: string
}

/** ISO 4217 currency from `/v2/currencies`. */
export type Currency = {
	id?: string
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

/** Language row from `/v2/languages`. */
export type Language = {
	id: string
	iso6393: string
	iso6392B: string | null
	iso6392T: string | null
	iso6391: string | null
	scope: string
	type: string
	referenceName: string
	names: {
		printName: string
		invertedName: string
	}[]
	macrolanguageCode: string | null
	macrolanguageMemberCodes: string[]
	comment: string | null
	lookupCodes: string[]
}

/** Derived continent from `/v2/continents`. */
export type Continent = {
	id: string
	name: string
	countryCount: number
}

/** Derived region from `/v2/regions`. */
export type Region = {
	id: string
	name: string
	continent: string
	countryCount: number
}

export type StatisticValue = {
	code: string
	name: string
	year: number
	value: number | null
}

/** Country statistics from `/v2/statistics`. */
export type CountryStatistics = {
	id: string
	countryCode: string
	countryName: string
	iso3: string
	populationTotal: StatisticValue
	populationFemale: StatisticValue
	populationMale: StatisticValue
	populationDensity: StatisticValue
	urbanPopulationPercent: StatisticValue
	ruralPopulationPercent: StatisticValue
	age0To14Percent: StatisticValue
	age15To64Percent: StatisticValue
	age65PlusPercent: StatisticValue
	gdpCurrentUsd: StatisticValue
	gdpPerCapitaCurrentUsd: StatisticValue
	lifeExpectancy: StatisticValue
}

/** Airline from `/v2/airlines`. */
export type Airline = {
	id: string
	name: string
	iataCode: string
	accountingCode: string
	icaoCode: string
	countryName: string
	countryCode: string
	controlledDuplicate: boolean
}

/** Airport from `/v2/airports`. */
export type Airport = {
	id: string
	geonameId: number | null
	name: string
	asciiName: string
	alternateNames: string[]
	unLocode: string | null
	airportLocationCode: string | null
	iataCode: string | null
	iataCodeSource: string | null
	latitude: string
	longitude: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	admin2Code: string
	elevation: number | null
	timezone: string
	modificationDate: string
}

/** Port or border crossing from `/v2/ports` or `/v2/border-crossings`. */
export type TransportLocation = {
	id: string
	unLocode: string
	countryCode: string
	countryName: string
	locationCode: string
	iataCode: string | null
	iataCodeSource: string | null
	name: string
	nameWithoutDiacritics: string
	alternateNames: string[]
	subdivisionCode: string | null
	functionCode: string
	functions: string[]
	status: string
	statusName: string
	date: string
	coordinates: string | null
	latitude: number | null
	longitude: number | null
	remarks: string | null
	changeIndicator: string | null
}

export type MigrationOrigin = {
	countryCode: string
	countryName: string
	iso3: string
	m49Code: string
	count: number
	maleCount: number
	femaleCount: number
	shareOfMigrantsPercent: number
	shareOfPopulationPercent: number
}

/** International migrant stock from `/v2/migrant-stocks`. */
export type MigrantStock = {
	id: string
	countryCode: string
	countryName: string
	iso3: string
	m49Code: string
	year: number
	coverage: string | null
	sourceDataTypeCode: string
	sourceDataTypeMethods: string[]
	totalInternationalMigrants: number
	maleInternationalMigrants: number
	femaleInternationalMigrants: number
	migrantShareOfPopulationPercent: number
	origins: MigrationOrigin[]
}

/** Caller geolocation from `GET /v2`. */
export type Location = {
	asn?: number
	asOrganization?: string
	city?: string
	cityInfo?: City
	colo?: string
	continent?: string
	country?: string
	countryInfo?: Country
	ip: string
	isEU?: boolean
	latitude?: string
	longitude?: string
	postalCode?: string
	region?: string
	regionCode?: string
	stateInfo?: State
	timezone?: string
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
	/** API origin, without a trailing slash. Defaults to `https://api.geocoded.me`. */
	apiUrl?: string
}

export type ListRequest = {
	fields?: string[]
	expand?: string[]
	limit?: number
	offset?: number
	cursor?: string
	q?: string
	signal?: AbortSignal
	filter?: {
		country?: string
		state?: string
		continent?: string
		region?: string
		currency?: string
		timezone?: string
		iata?: string
	}
}

export type SearchRequest = ListRequest & {
	type?: 'country' | 'state' | 'city'
}

export type DetailRequest = {
	fields?: string[]
	expand?: string[]
	signal?: AbortSignal
}

/**
 * Thrown when a get-one lookup matches more than one row.
 * Use a scoped path or a unique id from `matches`.
 */
export class GeocodedAmbiguousError<T = unknown> extends Error {
	readonly status = 409 as const
	readonly matches: T[]
	readonly hint?: string

	constructor(message: string, matches: T[], hint?: string) {
		super(message)
		this.name = 'GeocodedAmbiguousError'
		this.matches = matches
		this.hint = hint
	}
}

export type GeocodedClient = {
	fetchCurrentLocation: (request?: DetailRequest) => Promise<Location>
	fetchCountries: (request?: ListRequest) => Promise<Country[]>
	fetchCountryPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<Country>>
	getCountry: (id: string, request?: DetailRequest) => Promise<Country>
	fetchStates: (country?: string, request?: ListRequest) => Promise<State[]>
	fetchStatePage: (
		country?: string,
		request?: ListRequest
	) => Promise<PaginatedResponse<State>>
	getState: (id: string, request?: DetailRequest) => Promise<State>
	getStateInCountry: (
		country: string,
		state: string,
		request?: DetailRequest
	) => Promise<State>
	fetchCountryCities: (
		country: string,
		request?: ListRequest | number
	) => Promise<PaginatedResponse<City>>
	fetchCities: (
		country: string,
		state: string,
		request?: ListRequest | number
	) => Promise<PaginatedResponse<City>>
	fetchCityPage: (
		country: string,
		state: string,
		request?: ListRequest
	) => Promise<PaginatedResponse<City>>
	getCity: (id: string, request?: DetailRequest) => Promise<City>
	getCityInCountry: (
		country: string,
		city: string,
		request?: DetailRequest
	) => Promise<City>
	getCityInState: (
		country: string,
		state: string,
		city: string,
		request?: DetailRequest
	) => Promise<City>
	fetchTimezones: (request?: ListRequest) => Promise<TimezoneEntry[]>
	fetchTimezonePage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<TimezoneEntry>>
	getTimezone: (id: string, request?: DetailRequest) => Promise<TimezoneEntry>
	fetchCurrencies: (request?: ListRequest) => Promise<Currency[]>
	fetchCurrencyPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<Currency>>
	getCurrency: (id: string, request?: DetailRequest) => Promise<Currency>
	fetchLanguages: (request?: ListRequest) => Promise<Language[]>
	getLanguage: (id: string, request?: DetailRequest) => Promise<Language>
	fetchContinents: (request?: ListRequest) => Promise<Continent[]>
	fetchContinentPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<Continent>>
	getContinent: (id: string, request?: DetailRequest) => Promise<Continent>
	fetchRegions: (request?: ListRequest) => Promise<Region[]>
	fetchRegionPage: (request?: ListRequest) => Promise<PaginatedResponse<Region>>
	getRegion: (id: string, request?: DetailRequest) => Promise<Region>
	fetchAirlines: (request?: ListRequest) => Promise<Airline[]>
	fetchAirlinePage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<Airline>>
	getAirline: (id: string, request?: DetailRequest) => Promise<Airline>
	fetchAirports: (request?: ListRequest) => Promise<Airport[]>
	fetchAirportPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<Airport>>
	getAirport: (id: string, request?: DetailRequest) => Promise<Airport>
	fetchPorts: (request?: ListRequest) => Promise<TransportLocation[]>
	fetchPortPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<TransportLocation>>
	getPort: (id: string, request?: DetailRequest) => Promise<TransportLocation>
	fetchBorderCrossings: (request?: ListRequest) => Promise<TransportLocation[]>
	fetchBorderCrossingPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<TransportLocation>>
	getBorderCrossing: (
		id: string,
		request?: DetailRequest
	) => Promise<TransportLocation>
	fetchStatistics: (request?: ListRequest) => Promise<CountryStatistics[]>
	fetchStatisticsPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<CountryStatistics>>
	getStatistics: (
		id: string,
		request?: DetailRequest
	) => Promise<CountryStatistics>
	fetchMigrantStocks: (request?: ListRequest) => Promise<MigrantStock[]>
	fetchMigrantStockPage: (
		request?: ListRequest
	) => Promise<PaginatedResponse<MigrantStock>>
	getMigrantStock: (
		id: string,
		request?: DetailRequest
	) => Promise<MigrantStock>
	search: (
		query: string,
		request?: SearchRequest
	) => Promise<
		PaginatedResponse<{ type: string; name: string; [key: string]: unknown }>
	>
}

/**
 * Create a typed Geocoded client.
 *
 * Collection methods hit `/v2/...`. Get-one methods accept name or ISO code
 * and throw {@link GeocodedAmbiguousError} when that identifier is shared.
 *
 * @example
 * const client = createGeocodedClient()
 * const country = await client.getCountry('United States')
 * const state = await client.getStateInCountry('US', 'California')
 * const city = await client.getCity('Los Angeles')
 */
export function createGeocodedClient(
	options: GeocodedClientOptions = {}
): GeocodedClient {
	const api = ofetch.create({
		baseURL: (options.apiUrl ?? defaultApiUrl()).replace(/\/$/, ''),
		retry: 1,
		retryStatusCodes: [408, 429, 500, 502, 503, 504]
	})

	async function apiFetch<T>(
		path: string,
		request:
			| (ListRequest & DetailRequest & { type?: string })
			| undefined = undefined
	): Promise<T> {
		try {
			return await api<T>(path, {
				signal: request?.signal,
				query: toQuery(request)
			})
		} catch (error) {
			if (error instanceof FetchError && error.status === 409) {
				const body = ambiguousBody<T>(error.data)
				throw new GeocodedAmbiguousError(body.error, body.matches, body.hint)
			}
			throw error
		}
	}

	async function fetchPaginatedList<T>(
		path: string,
		request?: ListRequest
	): Promise<T[]> {
		const response = await apiFetch<PaginatedResponse<T>>(path, {
			limit: 2000,
			...request
		})
		return response.data
	}

	async function fetchStatePage(
		country?: string,
		request: ListRequest = {}
	): Promise<PaginatedResponse<State>> {
		const page = await apiFetch<PaginatedResponse<State>>('/v2/states', {
			...request,
			filter: {
				...request.filter,
				country: country ?? request.filter?.country
			}
		})
		return { ...page, data: page.data.map(normalizeState) }
	}

	async function fetchCityPage(
		country: string,
		state: string,
		request: ListRequest = {}
	): Promise<PaginatedResponse<City>> {
		return await apiFetch<PaginatedResponse<City>>('/v2/cities', {
			...request,
			filter: {
				...request.filter,
				country,
				state
			}
		})
	}

	return {
		/** Caller IP geolocation, enriched with country/state/city rows when known. */
		fetchCurrentLocation: (request) => apiFetch<Location>('/v2', request),
		/** All matching countries. Defaults to `limit=2000`. */
		fetchCountries: (request) =>
			fetchPaginatedList<Country>('/v2/countries', request),
		/** One page of countries. Supports `q`, `filter`, `fields`, and `expand`. */
		fetchCountryPage: (request) =>
			apiFetch<PaginatedResponse<Country>>('/v2/countries', request),
		/**
		 * One country by ISO2, ISO3, or name.
		 * @example await client.getCountry('US')
		 * @example await client.getCountry('United States')
		 */
		getCountry: (id, request) =>
			apiFetch<Country>(`/v2/countries/${encodeId(id)}`, request),
		/** States for a country, or all states if `country` is omitted. Defaults to `limit=2000`. */
		fetchStates: async (country, request) =>
			(await fetchStatePage(country, { limit: 2000, ...request })).data,
		/** One page of states. Pass a country name or ISO code to scope the list. */
		fetchStatePage,
		/**
		 * One state by name, ISO 3166-2 (`US-CA`), `US:CA`, or a shared state code.
		 * Shared codes throw {@link GeocodedAmbiguousError}.
		 */
		getState: async (id, request) =>
			normalizeState(
				await apiFetch<State>(`/v2/states/${encodeId(id)}`, request)
			),
		/** One state scoped to a country. Country and state accept name or ISO. */
		getStateInCountry: async (country, state, request) =>
			normalizeState(
				await apiFetch<State>(
					`/v2/countries/${encodeId(country)}/states/${encodeId(state)}`,
					request
				)
			),
		/** Cities in a country, including rows with no state parent. */
		fetchCountryCities: (country, request = 50) =>
			apiFetch<PaginatedResponse<City>>(
				'/v2/cities',
				listOrLimit(request, { country })
			),
		/** Cities in one country + state. `request` may be a limit number. */
		fetchCities: (country, state, request = 50) =>
			apiFetch<PaginatedResponse<City>>(
				'/v2/cities',
				listOrLimit(request, { country, state })
			),
		/** One page of cities in a country + state. Supports `q`. */
		fetchCityPage,
		/**
		 * One city by name, GeoNames id, `US:Los Angeles`, or `US:CA:Los Angeles`.
		 * Shared names throw {@link GeocodedAmbiguousError}.
		 */
		getCity: (id, request) =>
			apiFetch<City>(`/v2/cities/${encodeId(id)}`, request),
		/** One city scoped to a country. */
		getCityInCountry: (country, city, request) =>
			apiFetch<City>(
				`/v2/countries/${encodeId(country)}/cities/${encodeId(city)}`,
				request
			),
		/** One city scoped to a country + state. */
		getCityInState: (country, state, city, request) =>
			apiFetch<City>(
				`/v2/countries/${encodeId(country)}/states/${encodeId(state)}/cities/${encodeId(city)}`,
				request
			),
		fetchTimezones: (request) =>
			fetchPaginatedList<TimezoneEntry>('/v2/timezones', request),
		fetchTimezonePage: (request) =>
			apiFetch<PaginatedResponse<TimezoneEntry>>('/v2/timezones', request),
		/** One timezone by IANA id, for example `Asia/Dubai`. */
		getTimezone: (id, request) =>
			apiFetch<TimezoneEntry>(`/v2/timezones/${encodeId(id)}`, request),
		fetchCurrencies: (request) =>
			fetchPaginatedList<Currency>('/v2/currencies', request),
		fetchCurrencyPage: (request) =>
			apiFetch<PaginatedResponse<Currency>>('/v2/currencies', request),
		/** One currency by ISO 4217 code. */
		getCurrency: (id, request) =>
			apiFetch<Currency>(`/v2/currencies/${encodeId(id)}`, request),
		fetchLanguages: (request) =>
			fetchPaginatedList<Language>('/v2/languages', request),
		/** One language by ISO 639 code. */
		getLanguage: (id, request) =>
			apiFetch<Language>(`/v2/languages/${encodeId(id)}`, request),
		fetchContinents: (request) =>
			fetchPaginatedList<Continent>('/v2/continents', request),
		fetchContinentPage: (request) =>
			apiFetch<PaginatedResponse<Continent>>('/v2/continents', request),
		getContinent: (id, request) =>
			apiFetch<Continent>(`/v2/continents/${encodeId(id)}`, request),
		fetchRegions: (request) =>
			fetchPaginatedList<Region>('/v2/regions', request),
		fetchRegionPage: (request) =>
			apiFetch<PaginatedResponse<Region>>('/v2/regions', request),
		getRegion: (id, request) =>
			apiFetch<Region>(`/v2/regions/${encodeId(id)}`, request),
		fetchAirlines: (request) =>
			fetchPaginatedList<Airline>('/v2/airlines', request),
		fetchAirlinePage: (request) =>
			apiFetch<PaginatedResponse<Airline>>('/v2/airlines', request),
		getAirline: (id, request) =>
			apiFetch<Airline>(`/v2/airlines/${encodeId(id)}`, request),
		fetchAirports: (request) =>
			fetchPaginatedList<Airport>('/v2/airports', request),
		fetchAirportPage: (request) =>
			apiFetch<PaginatedResponse<Airport>>('/v2/airports', request),
		getAirport: (id, request) =>
			apiFetch<Airport>(`/v2/airports/${encodeId(id)}`, request),
		fetchPorts: (request) =>
			fetchPaginatedList<TransportLocation>('/v2/ports', request),
		fetchPortPage: (request) =>
			apiFetch<PaginatedResponse<TransportLocation>>('/v2/ports', request),
		getPort: (id, request) =>
			apiFetch<TransportLocation>(`/v2/ports/${encodeId(id)}`, request),
		fetchBorderCrossings: (request) =>
			fetchPaginatedList<TransportLocation>('/v2/border-crossings', request),
		fetchBorderCrossingPage: (request) =>
			apiFetch<PaginatedResponse<TransportLocation>>(
				'/v2/border-crossings',
				request
			),
		getBorderCrossing: (id, request) =>
			apiFetch<TransportLocation>(
				`/v2/border-crossings/${encodeId(id)}`,
				request
			),
		fetchStatistics: (request) =>
			fetchPaginatedList<CountryStatistics>('/v2/statistics', request),
		fetchStatisticsPage: (request) =>
			apiFetch<PaginatedResponse<CountryStatistics>>('/v2/statistics', request),
		getStatistics: (id, request) =>
			apiFetch<CountryStatistics>(`/v2/statistics/${encodeId(id)}`, request),
		fetchMigrantStocks: (request) =>
			fetchPaginatedList<MigrantStock>('/v2/migrant-stocks', request),
		fetchMigrantStockPage: (request) =>
			apiFetch<PaginatedResponse<MigrantStock>>('/v2/migrant-stocks', request),
		getMigrantStock: (id, request) =>
			apiFetch<MigrantStock>(`/v2/migrant-stocks/${encodeId(id)}`, request),
		/** Full-text search across countries, states, and cities. v1 route. */
		search: (query, request) => apiFetch('/search', { ...request, q: query })
	}
}

function listOrLimit(
	request: ListRequest | number,
	filter: { country?: string; state?: string }
): ListRequest {
	if (typeof request === 'number') {
		return { limit: request, filter }
	}
	return {
		...request,
		filter: {
			...request.filter,
			...filter
		}
	}
}

function normalizeState(row: State): State {
	const stateCode = row.stateCode || row.iso2
	return {
		...row,
		id: row.id || `${row.countryCode}:${stateCode}`,
		stateCode,
		iso2: stateCode
	}
}

function encodeId(value: string): string {
	return encodeURIComponent(value).replaceAll('%2F', '/')
}

function toQuery(
	request: (ListRequest & DetailRequest & { type?: string }) | undefined
): Record<string, string | number> | undefined {
	if (!request) return undefined
	const query: Record<string, string | number> = {}
	if (request.limit !== undefined) query.limit = request.limit
	if (request.offset !== undefined) query.offset = request.offset
	if (request.cursor) query.cursor = request.cursor
	if (request.q) query.q = request.q
	if (request.type) query.type = request.type
	if (request.fields?.length) query.fields = request.fields.join(',')
	if (request.expand?.length) query.expand = request.expand.join(',')
	if (request.filter) {
		for (const [key, value] of Object.entries(request.filter)) {
			if (value) query[`filter[${key}]`] = value
		}
	}
	return Object.keys(query).length > 0 ? query : undefined
}

function ambiguousBody<T>(value: unknown): {
	error: string
	matches: T[]
	hint?: string
} {
	if (!value || typeof value !== 'object') {
		return { error: 'Resource is ambiguous', matches: [] }
	}
	const record = value as {
		error?: unknown
		matches?: unknown
		hint?: unknown
	}
	// Current API: { error: { code, message, hint }, matches }.
	// Earlier API: { error: string, hint, matches }.
	const nested =
		record.error && typeof record.error === 'object'
			? (record.error as { message?: unknown; hint?: unknown })
			: undefined
	const message = nested ? nested.message : record.error
	const hint = nested ? nested.hint : record.hint
	return {
		error: typeof message === 'string' ? message : 'Resource is ambiguous',
		matches: Array.isArray(record.matches) ? (record.matches as T[]) : [],
		hint: typeof hint === 'string' ? hint : undefined
	}
}

const defaultClient = createGeocodedClient()

/** @see {@link GeocodedClient.fetchCurrentLocation} */
export const fetchCurrentLocation = defaultClient.fetchCurrentLocation

/** @see {@link GeocodedClient.fetchCountries} */
export const fetchCountries = defaultClient.fetchCountries

/** @see {@link GeocodedClient.getCountry} */
export const getCountry = defaultClient.getCountry

/** @see {@link GeocodedClient.fetchStates} */
export const fetchStates = defaultClient.fetchStates

/** @see {@link GeocodedClient.getState} */
export const getState = defaultClient.getState

/** @see {@link GeocodedClient.fetchCountryCities} */
export const fetchCountryCities = defaultClient.fetchCountryCities

/** @see {@link GeocodedClient.fetchCities} */
export const fetchCities = defaultClient.fetchCities

/** @see {@link GeocodedClient.getCity} */
export const getCity = defaultClient.getCity

/** @see {@link GeocodedClient.fetchTimezones} */
export const fetchTimezones = defaultClient.fetchTimezones

/** @see {@link GeocodedClient.getTimezone} */
export const getTimezone = defaultClient.getTimezone

/** @see {@link GeocodedClient.fetchCurrencies} */
export const fetchCurrencies = defaultClient.fetchCurrencies

/** @see {@link GeocodedClient.getCurrency} */
export const getCurrency = defaultClient.getCurrency

/** @see {@link GeocodedClient.fetchLanguages} */
export const fetchLanguages = defaultClient.fetchLanguages

/** @see {@link GeocodedClient.getContinent} */
export const getContinent = defaultClient.getContinent

/** @see {@link GeocodedClient.getRegion} */
export const getRegion = defaultClient.getRegion

/** @see {@link GeocodedClient.getAirline} */
export const getAirline = defaultClient.getAirline

/** @see {@link GeocodedClient.getAirport} */
export const getAirport = defaultClient.getAirport

/** @see {@link GeocodedClient.getPort} */
export const getPort = defaultClient.getPort

/** @see {@link GeocodedClient.getStatistics} */
export const getStatistics = defaultClient.getStatistics

/** @see {@link GeocodedClient.getMigrantStock} */
export const getMigrantStock = defaultClient.getMigrantStock

/** @see {@link GeocodedClient.search} */
export const search = defaultClient.search
