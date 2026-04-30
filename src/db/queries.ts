import {
	type City,
	type Country,
	type CurrencyEntry,
	type SearchResult,
	type State,
	type TimezoneEntry
} from '../types'

type D1Row = Record<string, unknown>
type SearchResultType = SearchResult['type']

const toFtsPrefixQuery = (query: string): string => {
	const sanitized = query.trim().replace(/"/g, '""')
	return `"${sanitized}"*`
}

const toContainsLikeQuery = (query: string): string =>
	`%${query.trim().replace(/[\^%_]/g, '^$&')}%`

const rowToCountry = (row: D1Row): Country => ({
	areaSqKm: row.area_sq_km as number,
	capital: row.capital as string,
	continent: row.continent as string,
	currency: row.currency as string,
	currencyName: row.currency_name as string,
	currencySymbol: row.currency_symbol as string,
	drivingSide: row.driving_side as string,
	emoji: row.emoji as string,
	emojiU: row.emoji_u as string,
	firstDayOfWeek: row.first_day_of_week as string,
	flagUrl: row.flag_url as string,
	gdp: (row.gdp as number) ?? null,

	iso2: row.iso2 as string,
	iso3: row.iso3 as string,
	languages: JSON.parse((row.languages as string) || '[]'),
	latitude: row.latitude as string,
	longitude: row.longitude as string,
	measurementSystem: row.measurement_system as string,
	name: row.name as string,
	nationality: row.nationality as string,
	literacy: (row.literacy as number) ?? null,
	native: row.native as string,
	neighbours: JSON.parse((row.neighbours as string) || '[]'),
	numericCode: row.numeric_code as string,
	phoneCode: row.phone_code as string,
	population: row.population as number,
	postalCodeFormat: (row.postal_code_format as string) ?? null,
	postalCodeRegex: (row.postal_code_regex as string) ?? null,
	region: row.region as string,
	subregion: row.subregion as string,
	timeFormat: row.time_format as string,
	timezones: JSON.parse((row.timezones as string) || '[]'),
	tld: row.tld as string,
	translations: JSON.parse((row.translations as string) || '{}')
})

const rowToState = (row: D1Row): State => ({
	capital: (row.capital as string) ?? null,
	countryCode: row.country_code as string,
	countryName: row.country_name as string,

	iso2: row.iso2 as string,
	iso31662: row.iso3166_2 as string,
	latitude: row.latitude as string,
	longitude: row.longitude as string,
	name: row.name as string,
	population: (row.population as number) ?? null,
	timezone: row.timezone as string,
	type: row.type as string
})

const rowToCity = (row: D1Row): City => ({
	countryCode: row.country_code as string,
	countryName: row.country_name as string,

	latitude: row.latitude as string,
	longitude: row.longitude as string,
	name: row.name as string,
	population: row.population as number,
	stateCode: row.state_code as string,
	stateName: row.state_name as string,
	timezone: row.timezone as string
})

export const getCountryById = async (
	db: D1Database,
	id: string
): Promise<Country | null> => {
	const upper = id.toUpperCase()
	const lower = id.toLowerCase()
	const row = await db
		.prepare(
			'SELECT * FROM countries WHERE iso2 = ?1 OR iso3 = ?1 OR LOWER(name) = ?2 LIMIT 1'
		)
		.bind(upper, lower)
		.first()
	return row ? rowToCountry(row) : null
}

export const getStateByIso2OrName = async (
	db: D1Database,
	countryCode: string,
	stateId: string
): Promise<State | null> => {
	const upper = stateId.toUpperCase()
	const lower = stateId.toLowerCase()
	const row = await db
		.prepare(
			'SELECT * FROM states WHERE country_code = ?1 AND (iso2 = ?2 OR LOWER(name) = ?3) LIMIT 1'
		)
		.bind(countryCode.toUpperCase(), upper, lower)
		.first()
	return row ? rowToState(row) : null
}

export const getCitiesByCountryState = async (
	db: D1Database,
	countryCode: string,
	stateCode: string
): Promise<City[]> => {
	const { results } = await db
		.prepare(
			'SELECT * FROM cities WHERE country_code = ? AND state_code = ? ORDER BY name'
		)
		.bind(countryCode.toUpperCase(), stateCode.toUpperCase())
		.all()
	return results.map(rowToCity)
}

export const getCityByName = async (
	db: D1Database,
	countryCode: string,
	stateCode: string,
	cityName: string
): Promise<City | null> => {
	const row = await db
		.prepare(
			'SELECT * FROM cities WHERE country_code = ? AND state_code = ? AND LOWER(name) = ? LIMIT 1'
		)
		.bind(
			countryCode.toUpperCase(),
			stateCode.toUpperCase(),
			cityName.toLowerCase()
		)
		.first()
	return row ? rowToCity(row) : null
}

export const getCountriesPaginated = async (
	db: D1Database,
	limit: number,
	offset: number
): Promise<{ rows: Country[]; total: number }> => {
	const batch = await db.batch([
		db
			.prepare('SELECT * FROM countries ORDER BY name LIMIT ? OFFSET ?')
			.bind(limit, offset),
		db.prepare('SELECT COUNT(*) AS total FROM countries')
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToCountry)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const searchCountriesPaginated = async (
	db: D1Database,
	query: string,
	limit: number,
	offset: number
): Promise<{ rows: Country[]; total: number }> => {
	const like = toContainsLikeQuery(query)
	const where = `name COLLATE NOCASE LIKE ? ESCAPE '^'
		OR iso2 COLLATE NOCASE LIKE ? ESCAPE '^'
		OR iso3 COLLATE NOCASE LIKE ? ESCAPE '^'`
	const batch = await db.batch([
		db
			.prepare(
				`SELECT * FROM countries WHERE ${where} ORDER BY name LIMIT ? OFFSET ?`
			)
			.bind(like, like, like, limit, offset),
		db
			.prepare(`SELECT COUNT(*) AS total FROM countries WHERE ${where}`)
			.bind(like, like, like)
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToCountry)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const getStatesPaginated = async (
	db: D1Database,
	countryCode: string,
	limit: number,
	offset: number
): Promise<{ rows: State[]; total: number }> => {
	const code = countryCode.toUpperCase()
	const batch = await db.batch([
		db
			.prepare(
				'SELECT * FROM states WHERE country_code = ? ORDER BY name LIMIT ? OFFSET ?'
			)
			.bind(code, limit, offset),
		db
			.prepare('SELECT COUNT(*) AS total FROM states WHERE country_code = ?')
			.bind(code)
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToState)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const searchStatesPaginated = async (
	db: D1Database,
	countryCode: string,
	query: string,
	limit: number,
	offset: number
): Promise<{ rows: State[]; total: number }> => {
	const code = countryCode.toUpperCase()
	const like = toContainsLikeQuery(query)
	const where = `country_code = ?
		AND (
			name COLLATE NOCASE LIKE ? ESCAPE '^'
			OR iso2 COLLATE NOCASE LIKE ? ESCAPE '^'
			OR iso3166_2 COLLATE NOCASE LIKE ? ESCAPE '^'
		)`
	const batch = await db.batch([
		db
			.prepare(
				`SELECT * FROM states WHERE ${where} ORDER BY name LIMIT ? OFFSET ?`
			)
			.bind(code, like, like, like, limit, offset),
		db
			.prepare(`SELECT COUNT(*) AS total FROM states WHERE ${where}`)
			.bind(code, like, like, like)
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToState)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const getCitiesPaginated = async (
	db: D1Database,
	countryCode: string,
	stateCode: string,
	limit: number,
	offset: number
): Promise<{ rows: City[]; total: number }> => {
	const cc = countryCode.toUpperCase()
	const sc = stateCode.toUpperCase()
	const batch = await db.batch([
		db
			.prepare(
				'SELECT * FROM cities WHERE country_code = ? AND state_code = ? ORDER BY name LIMIT ? OFFSET ?'
			)
			.bind(cc, sc, limit, offset),
		db
			.prepare(
				'SELECT COUNT(*) AS total FROM cities WHERE country_code = ? AND state_code = ?'
			)
			.bind(cc, sc)
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToCity)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const searchCitiesPaginated = async (
	db: D1Database,
	countryCode: string,
	stateCode: string,
	query: string,
	limit: number,
	offset: number
): Promise<{ rows: City[]; total: number }> => {
	const cc = countryCode.toUpperCase()
	const sc = stateCode.toUpperCase()
	const like = toContainsLikeQuery(query)
	const where = `country_code = ?
		AND state_code = ?
		AND name COLLATE NOCASE LIKE ? ESCAPE '^'`
	const batch = await db.batch([
		db
			.prepare(
				`SELECT * FROM cities WHERE ${where} ORDER BY name LIMIT ? OFFSET ?`
			)
			.bind(cc, sc, like, limit, offset),
		db
			.prepare(`SELECT COUNT(*) AS total FROM cities WHERE ${where}`)
			.bind(cc, sc, like)
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToCity)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const search = async (
	db: D1Database,
	query: string,
	limit: number,
	offset: number,
	type?: SearchResultType
): Promise<{ rows: SearchResult[]; total: number }> => {
	const ftsQuery = toFtsPrefixQuery(query)
	const filters = ['search_index MATCH ?']
	const searchBindings: Array<string | number> = [ftsQuery]
	if (type) {
		filters.push('type = ?')
		searchBindings.push(type)
	}
	const where = filters.join(' AND ')

	const batch = await db.batch([
		db
			.prepare(
				`SELECT name, type, country_code, state_code, extra
				FROM search_index
				WHERE ${where}
				LIMIT ? OFFSET ?`
			)
			.bind(...searchBindings, limit, offset),
		db
			.prepare(`SELECT COUNT(*) AS total FROM search_index WHERE ${where}`)
			.bind(...searchBindings)
	])

	const rows = (batch[0]!.results as D1Row[]).map((row): SearchResult => {
		const extra = row.extra ? (JSON.parse(row.extra as string) as D1Row) : {}
		return {
			type: row.type as SearchResult['type'],
			name: row.name as string,
			countryCode: row.country_code as string,
			countryName:
				(extra.country_name as string) ?? (row.country_code as string),
			stateCode: (row.state_code as string) ?? null,
			stateName: (extra.state_name as string) ?? null
		}
	})

	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

// --- Timezones ---

const rowToTimezone = (row: D1Row): TimezoneEntry => ({
	comments: row.comments as string,
	coordinates: row.coordinates as string,
	countryCodes: JSON.parse((row.country_codes as string) || '[]'),
	timezone: row.timezone as string
})

export const getTimezonesPaginated = async (
	db: D1Database,
	limit: number,
	offset: number
): Promise<{ rows: TimezoneEntry[]; total: number }> => {
	const batch = await db.batch([
		db
			.prepare('SELECT * FROM timezones ORDER BY timezone LIMIT ? OFFSET ?')
			.bind(limit, offset),
		db.prepare('SELECT COUNT(*) AS total FROM timezones')
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToTimezone)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const getTimezoneById = async (
	db: D1Database,
	id: string
): Promise<TimezoneEntry | null> => {
	const row = await db
		.prepare('SELECT * FROM timezones WHERE timezone = ? LIMIT 1')
		.bind(id)
		.first()
	return row ? rowToTimezone(row) : null
}

export const getTimezonesByCountry = async (
	db: D1Database,
	countryCode: string
): Promise<TimezoneEntry[]> => {
	const { results } = await db
		.prepare(
			'SELECT * FROM timezones WHERE country_codes LIKE ? ORDER BY timezone'
		)
		.bind(`%"${countryCode.toUpperCase()}"%`)
		.all()
	return results.map(rowToTimezone)
}

// --- Currencies ---

const rowToCurrency = (row: D1Row): CurrencyEntry => ({
	code: row.code as string,
	countries: JSON.parse((row.countries as string) || '[]'),
	decimals: row.decimals as number,
	name: row.name as string,
	symbol: row.symbol as string
})

export const getCurrenciesPaginated = async (
	db: D1Database,
	limit: number,
	offset: number
): Promise<{ rows: CurrencyEntry[]; total: number }> => {
	const batch = await db.batch([
		db
			.prepare('SELECT * FROM currencies ORDER BY code LIMIT ? OFFSET ?')
			.bind(limit, offset),
		db.prepare('SELECT COUNT(*) AS total FROM currencies')
	])
	const rows = (batch[0]!.results as D1Row[]).map(rowToCurrency)
	const total = (batch[1]!.results[0] as D1Row).total as number
	return { rows, total }
}

export const getCurrencyByCode = async (
	db: D1Database,
	code: string
): Promise<CurrencyEntry | null> => {
	const row = await db
		.prepare('SELECT * FROM currencies WHERE code = ? LIMIT 1')
		.bind(code.toUpperCase())
		.first()
	return row ? rowToCurrency(row) : null
}

export const getCurrenciesByCountry = async (
	db: D1Database,
	countryCode: string
): Promise<CurrencyEntry[]> => {
	const { results } = await db
		.prepare('SELECT * FROM currencies WHERE countries LIKE ? ORDER BY code')
		.bind(`%"${countryCode.toUpperCase()}"%`)
		.all()
	return results.map(rowToCurrency)
}
