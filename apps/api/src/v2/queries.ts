import { type V2QueryPlan } from './query'
import {
	type V2Airline,
	type V2Airport,
	type V2City,
	type V2Continent,
	type V2Country,
	type V2CountryStatistics,
	type V2CountryTimezone,
	type V2Currency,
	type V2Language,
	type V2LanguageName,
	type V2Migration,
	type V2MigrationOrigin,
	type V2Region,
	type V2State,
	type V2StatisticValue,
	type V2Timezone,
	type V2TransportLocation
} from './types'

type D1Row = Record<string, unknown>

export type V2ListQuery = {
	plan: V2QueryPlan
	limit: number
	offset: number
}

const CONTINENTS_TABLE =
	"(SELECT continent AS id, continent AS name, COUNT(*) AS country_count FROM countries WHERE continent <> '' GROUP BY continent)"

const REGIONS_TABLE =
	"(SELECT continent || ':' || region AS id, region AS name, continent, COUNT(*) AS country_count FROM countries WHERE continent <> '' AND region <> '' GROUP BY continent, region)"

export async function listV2Countries(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Country[]; total: number }> {
	const { rows, total } = await listRows(db, 'countries', query, rowToV2Country)
	return {
		rows: await expandV2Countries(db, rows, query.plan.expand),
		total
	}
}

export async function getV2CountryById(
	db: D1Database,
	id: string,
	expand: string[]
): Promise<V2Country | null> {
	const row = await db
		.prepare(
			'SELECT * FROM countries WHERE iso2 = ?1 OR iso3 = ?1 OR name = ?2 COLLATE NOCASE LIMIT 1'
		)
		.bind(id.toUpperCase(), id)
		.first()
	if (!row) return null
	const [country] = await expandV2Countries(db, [rowToV2Country(row)], expand)
	return country ?? null
}

export async function getV2StatisticsById(
	db: D1Database,
	id: string
): Promise<V2CountryStatistics | null> {
	return await getOneRow(
		db,
		'country_statistics',
		'country_code = ?1 COLLATE NOCASE OR iso3 = ?1 COLLATE NOCASE',
		[id],
		rowToV2CountryStatistics
	)
}

export async function listV2Statistics(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2CountryStatistics[]; total: number }> {
	return await listRows(
		db,
		'country_statistics',
		query,
		rowToV2CountryStatistics
	)
}

export async function listV2Continents(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Continent[]; total: number }> {
	return await listRows(db, CONTINENTS_TABLE, query, rowToV2Continent)
}

export async function getV2ContinentById(
	db: D1Database,
	id: string
): Promise<V2Continent | null> {
	return await getOneRow(
		db,
		CONTINENTS_TABLE,
		'id = ?1 COLLATE NOCASE',
		[id],
		rowToV2Continent
	)
}

export async function listV2Regions(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Region[]; total: number }> {
	return await listRows(db, REGIONS_TABLE, query, rowToV2Region)
}

export async function getV2RegionById(
	db: D1Database,
	id: string
): Promise<V2Region | null> {
	return await getOneRow(
		db,
		REGIONS_TABLE,
		'id = ?1 COLLATE NOCASE',
		[id],
		rowToV2Region
	)
}

export async function listV2States(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2State[]; total: number }> {
	return await listRows(db, 'states', query, rowToV2State)
}

export async function getV2StateById(
	db: D1Database,
	id: string
): Promise<V2State | null> {
	return await getOneRow(
		db,
		'states',
		"(country_code || ':' || iso2) = ?1 COLLATE NOCASE OR iso3166_2 = ?1 COLLATE NOCASE",
		[id],
		rowToV2State
	)
}

export async function listV2Cities(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2City[]; total: number }> {
	return await listRows(db, 'cities', query, rowToV2City)
}

export async function getV2CityById(
	db: D1Database,
	id: string
): Promise<V2City | null> {
	const geonameId = Number(id)
	if (!Number.isInteger(geonameId)) return null
	return await getOneRow(
		db,
		'cities',
		'geoname_id = ?1',
		[geonameId],
		rowToV2City
	)
}

export async function getV2CityByCountryStateName(
	db: D1Database,
	countryCode: string,
	stateCode: string,
	name: string
): Promise<V2City | null> {
	const row = await db
		.prepare(
			`SELECT * FROM cities
			WHERE country_code = ?1 AND state_code = ?2 AND name = ?3 COLLATE NOCASE
			ORDER BY population DESC, geoname_id
			LIMIT 1`
		)
		.bind(countryCode.toUpperCase(), stateCode.toUpperCase(), name)
		.first()
	return row ? rowToV2City(row as D1Row) : null
}

export async function listV2Timezones(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Timezone[]; total: number }> {
	return await listRows(db, 'timezones', query, rowToV2Timezone)
}

export async function getV2TimezoneById(
	db: D1Database,
	id: string
): Promise<V2Timezone | null> {
	return await getOneRow(
		db,
		'timezones',
		'timezone = ?1',
		[id],
		rowToV2Timezone
	)
}

export async function listV2Currencies(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Currency[]; total: number }> {
	return await listRows(db, 'currencies', query, rowToV2Currency)
}

export async function getV2CurrencyById(
	db: D1Database,
	id: string
): Promise<V2Currency | null> {
	return await getOneRow(
		db,
		'currencies',
		'code = ?1 COLLATE NOCASE',
		[id],
		rowToV2Currency
	)
}

export async function listV2Languages(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Language[]; total: number }> {
	return await listRows(db, 'languages', query, rowToV2Language)
}

export async function getV2LanguageById(
	db: D1Database,
	id: string
): Promise<V2Language | null> {
	const code = languageCode(id)
	const row = await db
		.prepare(
			`SELECT * FROM languages
			WHERE id = ?1
				OR iso6393 = ?1
				OR iso6392_b = ?1
				OR iso6392_t = ?1
				OR iso6391 = ?1
			LIMIT 1`
		)
		.bind(code)
		.first()
	return row ? rowToV2Language(row as D1Row) : null
}

export async function listV2Airlines(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Airline[]; total: number }> {
	return await listRows(db, 'airlines', query, rowToV2Airline)
}

export async function getV2AirlineById(
	db: D1Database,
	id: string
): Promise<V2Airline | null> {
	return await getOneRow(
		db,
		'airlines',
		'id = ?1 COLLATE NOCASE',
		[id],
		rowToV2Airline
	)
}

export async function listV2Airports(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Airport[]; total: number }> {
	return await listRows(db, 'airports', query, rowToV2Airport)
}

export async function getV2AirportById(
	db: D1Database,
	id: string
): Promise<V2Airport | null> {
	const geonameId = Number(id)
	return await getOneRow(
		db,
		'airports',
		'id = ?1 COLLATE NOCASE OR geoname_id = ?2',
		[id, Number.isInteger(geonameId) ? geonameId : -1],
		rowToV2Airport
	)
}

export async function listV2Ports(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2TransportLocation[]; total: number }> {
	return await listRows(db, 'ports', query, rowToV2TransportLocation)
}

export async function getV2PortById(
	db: D1Database,
	id: string
): Promise<V2TransportLocation | null> {
	return await getOneRow(
		db,
		'ports',
		'id = ?1 COLLATE NOCASE OR un_locode = ?1 COLLATE NOCASE',
		[id],
		rowToV2TransportLocation
	)
}

export async function listV2BorderCrossings(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2TransportLocation[]; total: number }> {
	return await listRows(db, 'border_crossings', query, rowToV2TransportLocation)
}

export async function getV2BorderCrossingById(
	db: D1Database,
	id: string
): Promise<V2TransportLocation | null> {
	return await getOneRow(
		db,
		'border_crossings',
		'id = ?1 COLLATE NOCASE OR un_locode = ?1 COLLATE NOCASE',
		[id],
		rowToV2TransportLocation
	)
}

export async function listV2Migration(
	db: D1Database,
	query: V2ListQuery
): Promise<{ rows: V2Migration[]; total: number }> {
	return await listRows(db, 'country_migration', query, rowToV2Migration)
}

export async function getV2MigrationById(
	db: D1Database,
	id: string
): Promise<V2Migration | null> {
	return await getOneRow(
		db,
		'country_migration',
		'country_code = ?1 COLLATE NOCASE OR iso3 = ?1 COLLATE NOCASE',
		[id],
		rowToV2Migration
	)
}

async function listRows<T>(
	db: D1Database,
	table: string,
	query: V2ListQuery,
	mapRow: (row: D1Row) => T
): Promise<{ rows: T[]; total: number }> {
	const whereSql = query.plan.whereSql ? ` WHERE ${query.plan.whereSql}` : ''
	const orderBySql = query.plan.orderBySql
		? ` ORDER BY ${query.plan.orderBySql}`
		: ''
	const bindings = query.plan.bindings

	const batch = await db.batch([
		db
			.prepare(
				`SELECT * FROM ${table}${whereSql}${orderBySql} LIMIT ? OFFSET ?`
			)
			.bind(...bindings, query.limit, query.offset),
		db
			.prepare(`SELECT COUNT(*) AS total FROM ${table}${whereSql}`)
			.bind(...bindings)
	])

	const rows = ((batch[0]?.results ?? []) as D1Row[]).map(mapRow)
	const total = ((batch[1]?.results?.[0] ?? {}) as D1Row).total as
		| number
		| undefined
	return { rows, total: total ?? rows.length }
}

async function getOneRow<T>(
	db: D1Database,
	table: string,
	whereSql: string,
	bindings: Array<string | number>,
	mapRow: (row: D1Row) => T
): Promise<T | null> {
	const row = await db
		.prepare(`SELECT * FROM ${table} WHERE ${whereSql} LIMIT 1`)
		.bind(...bindings)
		.first()
	return row ? mapRow(row as D1Row) : null
}

async function expandV2Countries(
	db: D1Database,
	countries: V2Country[],
	expand: string[]
): Promise<V2Country[]> {
	if (!expand.includes('statistics') || countries.length === 0) return countries

	const statistics = await getV2StatisticsForCountries(
		db,
		countries.map((country) => country.iso2)
	)
	return countries.map((country) => ({
		...country,
		statistics: statistics.get(country.iso2) ?? null
	}))
}

async function getV2StatisticsForCountries(
	db: D1Database,
	countryCodes: string[]
): Promise<Map<string, V2CountryStatistics>> {
	const uniqueCodes = [
		...new Set(countryCodes.map((code) => code.toUpperCase()))
	]
	if (uniqueCodes.length === 0) return new Map()

	const { results } = await db
		.prepare(
			`SELECT * FROM country_statistics WHERE country_code IN (${uniqueCodes.map(() => '?').join(', ')})`
		)
		.bind(...uniqueCodes)
		.all()
	return new Map(
		(results as D1Row[]).map((row) => {
			const statistics = rowToV2CountryStatistics(row)
			return [statistics.countryCode, statistics]
		})
	)
}

function rowToV2Country(row: D1Row): V2Country {
	const iso2 = stringValue(row.iso2)
	return {
		id: iso2,
		iso2,
		iso3: stringValue(row.iso3),
		name: stringValue(row.name),
		native: stringValue(row.native),
		capital: stringValue(row.capital),
		continent: stringValue(row.continent),
		region: stringValue(row.region),
		subregion: stringValue(row.subregion),
		currency: stringValue(row.currency),
		currencyName: stringValue(row.currency_name),
		currencySymbol: stringValue(row.currency_symbol),
		tld: stringValue(row.tld),
		phoneCode: stringValue(row.phone_code),
		numericCode: stringValue(row.numeric_code),
		nationality: stringValue(row.nationality),
		emoji: stringValue(row.emoji),
		emojiU: stringValue(row.emoji_u),
		latitude: stringValue(row.latitude),
		longitude: stringValue(row.longitude),
		areaSqKm: numberOrNull(row.area_sq_km),
		population: numberValue(row.population),
		gdp: numberOrNull(row.gdp),
		literacy: numberOrNull(row.literacy),
		postalCodeFormat: nullableString(row.postal_code_format),
		postalCodeRegex: nullableString(row.postal_code_regex),
		drivingSide: stringValue(row.driving_side),
		measurementSystem: stringValue(row.measurement_system),
		firstDayOfWeek: stringValue(row.first_day_of_week),
		timeFormat: stringValue(row.time_format),
		flagUrl: stringValue(row.flag_url),
		languages: parseJsonArray<string>(row.languages),
		neighbours: parseJsonArray<string>(row.neighbours),
		timezones: parseJsonArray<V2CountryTimezone>(row.timezones),
		translations: parseJsonObject(row.translations)
	}
}

function rowToV2CountryStatistics(row: D1Row): V2CountryStatistics {
	const countryCode = stringValue(row.country_code)
	return {
		id: countryCode,
		countryCode,
		countryName: stringValue(row.country_name),
		iso3: stringValue(row.iso3),
		populationTotal: parseStatisticValue(row.population_total),
		populationFemale: parseStatisticValue(row.population_female),
		populationMale: parseStatisticValue(row.population_male),
		populationDensity: parseStatisticValue(row.population_density),
		urbanPopulationPercent: parseStatisticValue(row.urban_population_percent),
		ruralPopulationPercent: parseStatisticValue(row.rural_population_percent),
		age0To14Percent: parseStatisticValue(row.age_0_to_14_percent),
		age15To64Percent: parseStatisticValue(row.age_15_to_64_percent),
		age65PlusPercent: parseStatisticValue(row.age_65_plus_percent),
		gdpCurrentUsd: parseStatisticValue(row.gdp_current_usd),
		gdpPerCapitaCurrentUsd: parseStatisticValue(row.gdp_per_capita_current_usd),
		lifeExpectancy: parseStatisticValue(row.life_expectancy)
	}
}

function rowToV2Continent(row: D1Row): V2Continent {
	return {
		id: stringValue(row.id),
		name: stringValue(row.name),
		countryCount: numberValue(row.country_count)
	}
}

function rowToV2Region(row: D1Row): V2Region {
	return {
		id: stringValue(row.id),
		name: stringValue(row.name),
		continent: stringValue(row.continent),
		countryCount: numberValue(row.country_count)
	}
}

function rowToV2State(row: D1Row): V2State {
	const countryCode = stringValue(row.country_code)
	const stateCode = stringValue(row.iso2)
	return {
		id: `${countryCode}:${stateCode}`,
		countryCode,
		countryName: stringValue(row.country_name),
		stateCode,
		iso31662: stringValue(row.iso3166_2),
		name: stringValue(row.name),
		type: stringValue(row.type),
		population: numberOrNull(row.population),
		latitude: stringValue(row.latitude),
		longitude: stringValue(row.longitude),
		timezone: stringValue(row.timezone),
		capital: nullableString(row.capital)
	}
}

function rowToV2City(row: D1Row): V2City {
	const geonameId = numberOrNull(row.geoname_id)
	return {
		id: geonameId === null ? stringValue(row.id) : String(geonameId),
		geonameId,
		name: stringValue(row.name),
		countryCode: stringValue(row.country_code),
		countryName: stringValue(row.country_name),
		stateCode: stringValue(row.state_code),
		stateName: stringValue(row.state_name),
		latitude: stringValue(row.latitude),
		longitude: stringValue(row.longitude),
		population: numberValue(row.population),
		timezone: stringValue(row.timezone)
	}
}

function rowToV2Timezone(row: D1Row): V2Timezone {
	const timezone = stringValue(row.timezone)
	return {
		id: timezone,
		timezone,
		countryCodes: parseJsonArray<string>(row.country_codes),
		coordinates: stringValue(row.coordinates),
		latitude: numberValue(row.latitude),
		longitude: numberValue(row.longitude),
		area: stringValue(row.area),
		location: stringValue(row.location),
		abbreviation: stringValue(row.abbreviation),
		name: stringValue(row.name),
		standardOffset: numberValue(row.standard_offset),
		standardOffsetName: stringValue(row.standard_offset_name),
		standardAbbreviation: stringValue(row.standard_abbreviation),
		standardName: stringValue(row.standard_name),
		daylightOffset: numberOrNull(row.daylight_offset),
		daylightOffsetName: nullableString(row.daylight_offset_name),
		daylightAbbreviation: nullableString(row.daylight_abbreviation),
		daylightName: nullableString(row.daylight_name),
		observesDst: booleanValue(row.observes_dst)
	}
}

function rowToV2Currency(row: D1Row): V2Currency {
	const code = stringValue(row.code)
	return {
		id: code,
		code,
		name: stringValue(row.name),
		symbol: stringValue(row.symbol),
		decimals: numberValue(row.decimals),
		countries: parseJsonArray<string>(row.countries)
	}
}

function rowToV2Language(row: D1Row): V2Language {
	const iso6393 = stringValue(row.iso6393)
	return {
		id: stringValue(row.id) || iso6393,
		iso6393,
		iso6392B: nullableString(row.iso6392_b),
		iso6392T: nullableString(row.iso6392_t),
		iso6391: nullableString(row.iso6391),
		scope: stringValue(row.scope),
		type: stringValue(row.type),
		referenceName: stringValue(row.reference_name),
		names: parseJsonArray<V2LanguageName>(row.names),
		macrolanguageCode: nullableString(row.macrolanguage_code),
		macrolanguageMemberCodes: parseJsonArray<string>(
			row.macrolanguage_member_codes
		),
		comment: nullableString(row.comment),
		lookupCodes: parseJsonArray<string>(row.lookup_codes)
	}
}

function rowToV2Airline(row: D1Row): V2Airline {
	return {
		id: stringValue(row.id),
		name: stringValue(row.name),
		iataCode: stringValue(row.iata_code),
		accountingCode: stringValue(row.accounting_code),
		icaoCode: stringValue(row.icao_code),
		countryName: stringValue(row.country_name),
		countryCode: stringValue(row.country_code),
		controlledDuplicate: booleanValue(row.controlled_duplicate)
	}
}

function rowToV2Airport(row: D1Row): V2Airport {
	return {
		id: stringValue(row.id),
		geonameId: numberOrNull(row.geoname_id),
		name: stringValue(row.name),
		asciiName: stringValue(row.ascii_name),
		alternateNames: parseJsonArray<string>(row.alternate_names),
		unLocode: nullableString(row.un_locode),
		airportLocationCode: nullableString(row.airport_location_code),
		iataCode: nullableString(row.iata_code),
		iataCodeSource: nullableString(row.iata_code_source),
		latitude: stringValue(row.latitude),
		longitude: stringValue(row.longitude),
		countryCode: stringValue(row.country_code),
		countryName: stringValue(row.country_name),
		stateCode: stringValue(row.state_code),
		stateName: stringValue(row.state_name),
		admin2Code: stringValue(row.admin2_code),
		elevation: numberOrNull(row.elevation),
		timezone: stringValue(row.timezone),
		modificationDate: stringValue(row.modification_date)
	}
}

function rowToV2TransportLocation(row: D1Row): V2TransportLocation {
	return {
		id: stringValue(row.id),
		unLocode: stringValue(row.un_locode),
		countryCode: stringValue(row.country_code),
		countryName: stringValue(row.country_name),
		locationCode: stringValue(row.location_code),
		iataCode: nullableString(row.iata_code),
		iataCodeSource: nullableString(row.iata_code_source),
		name: stringValue(row.name),
		nameWithoutDiacritics: stringValue(row.name_without_diacritics),
		alternateNames: parseJsonArray<string>(row.alternate_names),
		subdivisionCode: nullableString(row.subdivision_code),
		functionCode: stringValue(row.function_code),
		functions: parseJsonArray<string>(row.functions),
		status: stringValue(row.status),
		statusName: stringValue(row.status_name),
		date: stringValue(row.date),
		coordinates: nullableString(row.coordinates),
		latitude: numberOrNull(row.latitude),
		longitude: numberOrNull(row.longitude),
		remarks: nullableString(row.remarks),
		changeIndicator: nullableString(row.change_indicator)
	}
}

function rowToV2Migration(row: D1Row): V2Migration {
	const countryCode = stringValue(row.country_code)
	return {
		id: countryCode,
		countryCode,
		countryName: stringValue(row.country_name),
		iso3: stringValue(row.iso3),
		m49Code: stringValue(row.m49_code),
		year: numberValue(row.year),
		coverage: nullableString(row.coverage),
		sourceDataTypeCode: stringValue(row.source_data_type_code),
		sourceDataTypeMethods: parseJsonArray<string>(row.source_data_type_methods),
		totalInternationalMigrants: numberValue(row.total_international_migrants),
		maleInternationalMigrants: numberValue(row.male_international_migrants),
		femaleInternationalMigrants: numberValue(row.female_international_migrants),
		migrantShareOfPopulationPercent: numberValue(
			row.migrant_share_of_population_percent
		),
		origins: parseJsonArray<V2MigrationOrigin>(row.origins)
	}
}

function parseStatisticValue(value: unknown): V2StatisticValue {
	if (typeof value !== 'string' || value.trim() === '') {
		return emptyStatisticValue()
	}
	try {
		const parsed = JSON.parse(value) as Partial<V2StatisticValue>
		return {
			code: typeof parsed.code === 'string' ? parsed.code : '',
			name: typeof parsed.name === 'string' ? parsed.name : '',
			year: typeof parsed.year === 'number' ? parsed.year : 0,
			value: typeof parsed.value === 'number' ? parsed.value : null
		}
	} catch {
		return emptyStatisticValue()
	}
}

function emptyStatisticValue(): V2StatisticValue {
	return {
		code: '',
		name: '',
		year: 0,
		value: null
	}
}

function parseJsonArray<T>(value: unknown): T[] {
	if (typeof value !== 'string' || value.trim() === '') return []
	try {
		const parsed = JSON.parse(value) as unknown
		return Array.isArray(parsed) ? (parsed as T[]) : []
	} catch {
		return []
	}
}

function parseJsonObject(value: unknown): Record<string, string> {
	if (typeof value !== 'string' || value.trim() === '') return {}
	try {
		const parsed = JSON.parse(value) as unknown
		if (
			parsed === null ||
			typeof parsed !== 'object' ||
			Array.isArray(parsed)
		) {
			return {}
		}
		return parsed as Record<string, string>
	} catch {
		return {}
	}
}

function stringValue(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

function nullableString(value: unknown): string | null {
	if (typeof value !== 'string' || value === '') return null
	return value
}

function numberValue(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown): boolean {
	return value === true || value === 1
}

function languageCode(value: string): string {
	return value.trim().split('-')[0]?.toLowerCase() ?? ''
}
