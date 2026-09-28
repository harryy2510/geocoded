import { SITE_API_URL } from './api-url'

const V2_API_URL = SITE_API_URL

type V2Meta = {
	total: number
	limit: number
	offset: number
	hasMore: boolean
	cursor: string | null
}

export type V2Response<T> = {
	data: T[]
	meta: V2Meta
}

// ---------------------------------------------------------------------------
// Row types — verified against the live v2 API shapes.
// ---------------------------------------------------------------------------

export type Metric = {
	code: string
	name: string
	year: number
	value: number | null
}

export type StatisticsRow = {
	id?: string
	countryCode: string
	countryName: string
	iso3: string
	populationTotal?: Metric
	populationFemale?: Metric
	populationMale?: Metric
	populationDensity?: Metric
	urbanPopulationPercent?: Metric
	ruralPopulationPercent?: Metric
	age0To14Percent?: Metric
	age15To64Percent?: Metric
	age65PlusPercent?: Metric
	gdpCurrentUsd?: Metric
	gdpPerCapitaCurrentUsd?: Metric
	lifeExpectancy?: Metric
	gdpGrowthPercent?: Metric
	gniPerCapitaAtlasUsd?: Metric
	internetUsersPercent?: Metric
	mobileSubscriptionsPer100?: Metric
	electricityAccessPercent?: Metric
	fertilityRate?: Metric
	healthExpenditurePercentGdp?: Metric
	forestAreaPercent?: Metric
	dependencyRatio?: Metric
	ageingIndex?: Metric
	sexRatio?: Metric
}

type CountryTimezone = {
	zoneName: string
	gmtOffset: number
	gmtOffsetName: string
	abbreviation: string
	tzName: string
}

export type CountryRow = {
	id: string
	iso2: string
	iso3: string
	name: string
	continent: string
	region: string
	currency: string
	population: number
	native?: string | null
	localName?: string | null
	capital?: string | null
	subregion?: string | null
	currencyName?: string | null
	currencySymbol?: string | null
	tld?: string | null
	phoneCode?: string | null
	numericCode?: string | null
	nationality?: string | null
	latitude?: string | null
	longitude?: string | null
	areaSqKm?: number | null
	gdp?: number | null
	literacy?: number | null
	postalCodeFormat?: string | null
	postalCodeRegex?: string | null
	drivingSide?: string | null
	measurementSystem?: string | null
	firstDayOfWeek?: string | null
	timeFormat?: string | null
	flagUrl?: string | null
	languages?: string[] | null
	neighbours?: string[] | null
	timezones?: CountryTimezone[]
	statistics?: StatisticsRow
}

type MigrationOrigin = {
	countryCode: string
	countryName: string
	iso3: string
	count: number
	maleCount: number | null
	femaleCount: number | null
	shareOfMigrantsPercent: number | null
	shareOfPopulationPercent: number | null
}

export type MigrationRow = {
	id?: string
	countryCode: string
	countryName: string
	iso3: string
	year: number
	totalInternationalMigrants: number | null
	maleInternationalMigrants: number | null
	femaleInternationalMigrants: number | null
	migrantShareOfPopulationPercent: number | null
	origins: MigrationOrigin[]
}

type ContinentRow = {
	id: string
	name: string
	countryCount: number
}

type RegionRow = {
	id: string
	name: string
	continent: string
	countryCount: number
}

type LanguageNameRow = {
	printName: string
	invertedName: string
}

type LanguageRow = {
	id?: string
	iso6393: string | null
	iso6392B: string | null
	iso6392T: string | null
	iso6391: string | null
	scope: string
	type: string
	referenceName: string
	names?: LanguageNameRow[]
	macrolanguageCode: string | null
	macrolanguageMemberCodes: string[]
}

export type TimezoneRow = {
	timezone: string
	countryCodes: string[]
	latitude?: number
	longitude?: number
	area: string
	location?: string
	standardOffset: number
	standardOffsetName: string
	name?: string
	observesDst?: boolean
}

export type CurrencyRow = {
	code: string
	name: string
	symbol: string
	decimals?: number
	countries: string[]
}

export type StateRow = {
	id: string
	countryCode: string
	countryName: string
	stateCode: string
	iso31662?: string
	name: string
	type?: string
	population: number | null
	latitude: string | null
	longitude: string | null
	timezone: string | null
	capital: string | null
}

export type CityRow = {
	id?: string
	geonameId?: number | null
	name: string
	countryCode: string
	countryName: string
	stateCode?: string | null
	stateName: string | null
	population: number | null
	latitude: string | null
	longitude: string | null
	timezone: string | null
	distanceKm?: number
}

export type AirportRow = {
	id: string
	geonameId?: string
	name: string
	iataCode: string | null
	latitude: string | null
	longitude: string | null
	countryCode: string
	countryName: string
	stateCode: string | null
	stateName: string | null
	elevation: number | null
	timezone: string | null
}

type AirlineRow = {
	id: string
	name: string
	iataCode: string | null
	icaoCode: string | null
	countryName: string | null
	countryCode: string | null
}

export type PortRow = {
	id: string
	unLocode: string
	name: string
	countryCode: string
	countryName: string
	functions: string[]
	status: string | null
	statusName: string | null
	latitude: number | null
	longitude: number | null
	subdivisionCode: string | null
}

type SearchResultType = 'country' | 'state' | 'city'

export type SearchResult = {
	type: SearchResultType
	id: string
	name: string
	countryCode: string
	countryName: string
	stateCode: string | null
	stateName: string | null
	geonameId: number | string | null
}

type ReverseResult = {
	query: { lat: number; lng: number }
	city: CityRow & { distanceKm: number }
	state: StateRow | null
	country: CountryRow | null
	timezone: string
}

export type TimezoneNow = {
	timezone: string
	localTime: string
	utcOffset: string
	utcOffsetSeconds: number
	isDst: boolean
	abbreviation: string
	nextTransition: { at: string; utcOffset: string } | null
}

type DatasetInfo = {
	id: string
	name: string
	records: number
	source: string
	license: string
}

export type DataInfo = {
	dataVersion: string
	updatedAt: string
	datasets: DatasetInfo[]
}

// ---------------------------------------------------------------------------
// Errors. Every v2 error uses the same envelope.
// ---------------------------------------------------------------------------

export type V2ErrorCode =
	| 'invalid_request'
	| 'not_found'
	| 'ambiguous'
	| 'rate_limited'
	| 'internal_error'

type V2ErrorBody = {
	error: { code: V2ErrorCode; message: string; hint?: string }
	matches?: unknown[]
}

export class V2ApiError extends Error {
	readonly status: number
	readonly code: V2ErrorCode | null
	readonly hint: string | null

	constructor(
		status: number,
		message: string,
		code: V2ErrorCode | null,
		hint: string | null
	) {
		super(message)
		this.name = 'V2ApiError'
		this.status = status
		this.code = code
		this.hint = hint
	}
}

function isErrorBody(body: unknown): body is V2ErrorBody {
	if (typeof body !== 'object' || body === null || !('error' in body)) {
		return false
	}
	const { error } = body
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	)
}

export async function toV2Error(response: Response): Promise<V2ApiError> {
	const body: unknown = await response.json().catch(() => null)
	if (isErrorBody(body)) {
		return new V2ApiError(
			response.status,
			body.error.message,
			body.error.code,
			body.error.hint ?? null
		)
	}
	return new V2ApiError(
		response.status,
		`API error: ${response.status} ${response.statusText}`,
		null,
		null
	)
}

// ---------------------------------------------------------------------------
// Derived statistics. The API is gaining these fields; until it serves them,
// compute them from the age and population fields it already returns.
// ---------------------------------------------------------------------------

export type DerivedStats = {
	/** Children and people 65+ per 100 people aged 15 to 64. */
	dependencyRatio: number | null
	/** People 65+ per 100 children under 15. */
	ageingIndex: number | null
	/** Men per 100 women. */
	sexRatio: number | null
}

export function derivedStats(stats?: StatisticsRow): DerivedStats {
	const young = stats?.age0To14Percent?.value ?? null
	const working = stats?.age15To64Percent?.value ?? null
	const old = stats?.age65PlusPercent?.value ?? null
	const male = stats?.populationMale?.value ?? null
	const female = stats?.populationFemale?.value ?? null
	return {
		dependencyRatio:
			stats?.dependencyRatio?.value ??
			(young !== null && old !== null && working
				? ((young + old) / working) * 100
				: null),
		ageingIndex:
			stats?.ageingIndex?.value ??
			(old !== null && young ? (old / young) * 100 : null),
		sexRatio:
			stats?.sexRatio?.value ??
			(male !== null && female ? (male / female) * 100 : null)
	}
}

// ---------------------------------------------------------------------------
// URL building + fetch helpers.
// ---------------------------------------------------------------------------

function buildUrl(path: string): string {
	const base = V2_API_URL.replace(/\/$/, '')
	return path.startsWith('http')
		? path
		: `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export type V2Params = Record<
	string,
	string | number | boolean | null | undefined
>

/**
 * Build a v2 path with query params encoded via URLSearchParams so keys like
 * `filter[country]` and `fields` survive encoding. Pass already-encoded paths
 * untouched if no params are supplied.
 */
function buildV2Path(path: string, params?: V2Params): string {
	if (!params) return path
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined || value === '') continue
		search.set(key, String(value))
	}
	const query = search.toString()
	const [base = path, existing] = path.split('?')
	const merged = [existing, query].filter(Boolean).join('&')
	return merged ? `${base}?${merged}` : base
}

/**
 * Fetch a single page from a v2 list endpoint. Returns the full envelope
 * `{ data, meta }` so callers can read `meta.total` for counts/pagination.
 */
export async function fetchV2List<T>(
	path: string,
	params?: V2Params
): Promise<V2Response<T>> {
	return fetchV2<V2Response<T>>(path, params)
}

/** Full URL for a v2 path, for display (curl snippets) and links. */
export function v2Url(path: string, params?: V2Params): string {
	return buildUrl(buildV2Path(path, params))
}

/**
 * Fetch any v2 endpoint. Non-2xx responses throw a `V2ApiError` carrying the
 * `{ error: { code, message, hint } }` envelope.
 */
export async function fetchV2<T>(path: string, params?: V2Params): Promise<T> {
	const response = await fetch(v2Url(path, params))
	if (!response.ok) throw await toV2Error(response)
	return (await response.json()) as T
}

/** Total row count of a list endpoint, fetched with a one-row page. */
export async function fetchV2Count(
	path: string,
	params?: V2Params
): Promise<number> {
	const page = await fetchV2List<unknown>(path, { ...params, limit: 1 })
	return page.meta.total
}

/**
 * Page through a v2 list endpoint via cursor until `max` rows are gathered or
 * the data is exhausted. Defaults to a 2000-row ceiling.
 */
export async function fetchV2All<T>(
	path: string,
	max = 2000,
	params?: V2Params
): Promise<T[]> {
	const rows: T[] = []
	let cursor: string | null = null

	while (rows.length < max) {
		const remaining = max - rows.length
		const pageParams: V2Params = {
			...params,
			limit: Math.min(remaining, 2000)
		}
		if (cursor) pageParams.cursor = cursor
		const page: V2Response<T> = await fetchV2List<T>(path, pageParams)
		rows.push(...page.data)
		if (!page.meta.hasMore || !page.meta.cursor || page.data.length === 0) break
		cursor = page.meta.cursor
	}

	return rows.slice(0, max)
}

/**
 * Fetch all countries joined with their statistics.
 *
 * NOTE: `/v2/countries?expand=statistics` fails server-side above ~100 rows, so
 * we cannot expand in bulk. Instead we fetch the countries and statistics lists
 * independently (each returns all ~252 rows in one page) and join them by
 * country code client-side, producing the same `CountryRow[]` shape callers
 * expect — each row's `statistics` populated when a match exists.
 */
export async function fetchCountriesWithStats(
	max = 300
): Promise<CountryRow[]> {
	const [countries, statistics] = await Promise.all([
		fetchV2All<CountryRow>('/v2/countries', max),
		fetchV2All<StatisticsRow>('/v2/statistics', max)
	])

	const statsByCode = new Map<string, StatisticsRow>()
	for (const stats of statistics) {
		statsByCode.set(stats.countryCode.toUpperCase(), stats)
	}

	return countries.map((country) => {
		const stats = statsByCode.get(country.iso2.toUpperCase())
		return stats ? { ...country, statistics: stats } : country
	})
}
