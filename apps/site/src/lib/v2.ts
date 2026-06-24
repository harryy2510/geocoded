import { SITE_API_URL } from './api-url'

export const V2_API_URL = SITE_API_URL

export type V2Meta = {
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
	statistics?: StatisticsRow
}

export type MigrationOrigin = {
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

export type ContinentRow = {
	id: string
	name: string
	countryCount: number
}

export type RegionRow = {
	id: string
	name: string
	continent: string
	countryCount: number
}

export type LanguageNameRow = {
	printName: string
	invertedName: string
}

export type LanguageRow = {
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
	name: string
	countryCode: string
	countryName: string
	stateName: string | null
	population: number | null
	latitude: string | null
	longitude: string | null
	timezone: string | null
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

export type AirlineRow = {
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

// ---------------------------------------------------------------------------
// URL building + fetch helpers.
// ---------------------------------------------------------------------------

function buildUrl(path: string): string {
	const base = V2_API_URL.replace(/\/$/, '')
	return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export type V2Params = Record<string, string | number | boolean | null | undefined>

/**
 * Build a v2 path with query params encoded via URLSearchParams so keys like
 * `filter[country]` and `fields` survive encoding. Pass already-encoded paths
 * untouched if no params are supplied.
 */
export function buildV2Path(path: string, params?: V2Params): string {
	if (!params) return path
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined || value === '') continue
		search.set(key, String(value))
	}
	const query = search.toString()
	const [base, existing] = path.split('?')
	const merged = [existing, query].filter(Boolean).join('&')
	return merged ? `${base}?${merged}` : base
}

/**
 * Fetch a single page from a v2 list endpoint. Returns the full envelope
 * `{ data, meta }` so callers can read `meta.total` for counts/pagination.
 */
export async function fetchV2List<T>(path: string, params?: V2Params): Promise<V2Response<T>> {
	const url = buildUrl(buildV2Path(path, params))
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`)
	}
	return (await response.json()) as V2Response<T>
}

/**
 * Page through a v2 list endpoint via cursor until `max` rows are gathered or
 * the data is exhausted. Defaults to a 2000-row ceiling.
 */
export async function fetchV2All<T>(path: string, max = 2000, params?: V2Params): Promise<T[]> {
	const rows: T[] = []
	let cursor: string | null = null

	while (rows.length < max) {
		const remaining = max - rows.length
		const pageParams: V2Params = {
			...params,
			limit: Math.min(remaining, 2000),
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
export async function fetchCountriesWithStats(max = 300): Promise<CountryRow[]> {
	const [countries, statistics] = await Promise.all([
		fetchV2All<CountryRow>('/v2/countries', max),
		fetchV2All<StatisticsRow>('/v2/statistics', max),
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
