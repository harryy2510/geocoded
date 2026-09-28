import { search, type SearchResultType } from '../v1/db/queries'
import {
	distanceBindings,
	haversineKm,
	nearSql,
	roundKm,
	type V2GeoColumns,
	type V2NearQuery,
	type V2Point
} from './geo'
import { type V2Keyset } from './pagination'
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
	type V2DatasetMeta,
	type V2Meta,
	type V2Region,
	type V2SearchResult,
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
	after: V2Keyset | null
	near: V2NearQuery | null
}

export type V2ListResult<T> = {
	rows: T[]
	total: number
	last: V2Keyset | null
}

type WithDistance<T> = T & { distanceKm: number }

// Cities and airports store coordinates as text; the 0011 migration indexes these exact expressions.
const TEXT_GEO: V2GeoColumns = {
	lat: 'CAST(latitude AS REAL)',
	lng: 'CAST(longitude AS REAL)'
}
const REAL_GEO: V2GeoColumns = { lat: 'latitude', lng: 'longitude' }
const NEAREST_CITY_RADII_KM = [25, 100, 400]

export type V2LookupResult<T> =
	| { status: 'ok'; row: T }
	| { status: 'missing' }
	| { status: 'ambiguous'; matches: T[] }

const LOOKUP_MATCH_LIMIT = 25

const CONTINENTS_TABLE =
	"(SELECT continent AS id, continent AS name, COUNT(*) AS country_count FROM countries WHERE continent <> '' GROUP BY continent)"

const REGIONS_TABLE =
	"(SELECT continent || ':' || subregion AS id, subregion AS name, continent, COUNT(*) AS country_count FROM countries WHERE continent <> '' AND subregion <> '' GROUP BY continent, subregion)"

export async function listV2Countries(
	db: D1Database,
	query: V2ListQuery
): Promise<V2ListResult<V2Country>> {
	const result = await listRows(db, 'countries', query, rowToV2Country)
	return {
		...result,
		rows: await expandV2Countries(db, result.rows, query.plan.expand)
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
): Promise<V2ListResult<V2CountryStatistics>> {
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
): Promise<V2ListResult<V2Continent>> {
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
): Promise<V2ListResult<V2Region>> {
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
): Promise<V2ListResult<V2State>> {
	return await listRows(db, 'states', query, rowToV2State)
}

export async function getV2StateById(
	db: D1Database,
	id: string
): Promise<V2State | null> {
	const result = await lookupV2State(db, id)
	return result.status === 'ok' ? result.row : null
}

export async function listV2Cities(
	db: D1Database,
	query: V2ListQuery
): Promise<V2ListResult<V2City>> {
	return await listRows(db, 'cities', query, rowToV2City, TEXT_GEO)
}

export async function getV2CityByCountryStateName(
	db: D1Database,
	countryCode: string,
	stateCode: string,
	name: string
): Promise<V2City | null> {
	const result = await lookupV2City(db, name, {
		country: countryCode,
		state: stateCode
	})
	if (result.status === 'ok') return result.row
	if (result.status === 'ambiguous') return result.matches[0] ?? null
	return null
}

function finalizeLookup<T>(rows: T[]): V2LookupResult<T> {
	if (rows.length === 0) return { status: 'missing' }
	if (rows.length === 1) return { status: 'ok', row: rows[0]! }
	return { status: 'ambiguous', matches: rows }
}

async function resolveV2CountryCode(
	db: D1Database,
	id: string
): Promise<string | null> {
	const country = await getV2CountryById(db, id, [])
	return country?.iso2 ?? null
}

export async function lookupV2State(
	db: D1Database,
	id: string,
	countryScope?: string
): Promise<V2LookupResult<V2State>> {
	const trimmed = id.trim()
	if (!trimmed) return { status: 'missing' }

	let countryCode = countryScope?.trim() || undefined
	let token = trimmed

	if (!countryCode) {
		const colon = trimmed.indexOf(':')
		if (colon > 0) {
			const right = trimmed.slice(colon + 1).trim()
			if (right) {
				const resolved = await resolveV2CountryCode(db, trimmed.slice(0, colon))
				if (!resolved) return { status: 'missing' }
				countryCode = resolved
				token = right
			}
		}
	} else {
		const resolved = await resolveV2CountryCode(db, countryCode)
		if (!resolved) return { status: 'missing' }
		countryCode = resolved
	}

	if (countryCode) {
		return finalizeLookup(
			await listMatchingRows(
				db,
				'states',
				'country_code = ? AND (iso2 = ? COLLATE NOCASE OR iso3166_2 = ? COLLATE NOCASE OR name = ? COLLATE NOCASE)',
				[countryCode, token, token, token],
				rowToV2State,
				'ORDER BY population DESC, iso2'
			)
		)
	}

	return finalizeLookup(
		await listMatchingRows(
			db,
			'states',
			"iso2 = ? COLLATE NOCASE OR iso3166_2 = ? COLLATE NOCASE OR name = ? COLLATE NOCASE OR (country_code || ':' || iso2) = ? COLLATE NOCASE",
			[token, token, token, token],
			rowToV2State,
			'ORDER BY population DESC, country_code, iso2'
		)
	)
}

export async function lookupV2City(
	db: D1Database,
	id: string,
	scope: { country?: string; state?: string } = {}
): Promise<V2LookupResult<V2City>> {
	const trimmed = id.trim()
	if (!trimmed) return { status: 'missing' }

	let countryToken = scope.country?.trim() || undefined
	let stateToken = scope.state?.trim() || undefined
	let token = trimmed

	if (!countryToken) {
		const parts = trimmed.split(':').map((part) => part.trim())
		if (parts.length >= 2 && parts[0] && parts.slice(1).every(Boolean)) {
			countryToken = parts[0]
			if (parts.length >= 3) {
				stateToken = parts[1]
				token = parts.slice(2).join(':')
			} else {
				token = parts.slice(1).join(':')
			}
		}
	}

	let countryCode: string | undefined
	if (countryToken) {
		const resolved = await resolveV2CountryCode(db, countryToken)
		if (!resolved) return { status: 'missing' }
		countryCode = resolved
	}

	let stateCode: string | undefined
	if (countryCode && stateToken) {
		const state = await lookupV2State(db, stateToken, countryCode)
		if (state.status === 'missing') return state
		if (state.status === 'ambiguous') return { status: 'missing' }
		stateCode = state.row.stateCode
	}

	const geonameId = Number(token)
	const isGeonameId = Number.isInteger(geonameId) && String(geonameId) === token

	const clauses: string[] = []
	const bindings: Array<string | number> = []
	if (isGeonameId) {
		clauses.push('geoname_id = ?')
		bindings.push(geonameId)
	} else {
		clauses.push('name = ? COLLATE NOCASE')
		bindings.push(token)
	}
	if (countryCode) {
		clauses.push('country_code = ?')
		bindings.push(countryCode)
	}
	if (stateCode) {
		clauses.push('state_code = ?')
		bindings.push(stateCode)
	}

	return finalizeLookup(
		await listMatchingRows(
			db,
			'cities',
			clauses.join(' AND '),
			bindings,
			rowToV2City,
			isGeonameId
				? 'ORDER BY geoname_id'
				: 'ORDER BY population DESC, geoname_id'
		)
	)
}

export async function listV2Timezones(
	db: D1Database,
	query: V2ListQuery
): Promise<V2ListResult<V2Timezone>> {
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
): Promise<V2ListResult<V2Currency>> {
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
): Promise<V2ListResult<V2Language>> {
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
): Promise<V2ListResult<V2Airline>> {
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
): Promise<V2ListResult<V2Airport>> {
	return await listRows(db, 'airports', query, rowToV2Airport, TEXT_GEO)
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
): Promise<V2ListResult<V2TransportLocation>> {
	return await listRows(db, 'ports', query, rowToV2TransportLocation, REAL_GEO)
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
): Promise<V2ListResult<V2TransportLocation>> {
	return await listRows(
		db,
		'border_crossings',
		query,
		rowToV2TransportLocation,
		REAL_GEO
	)
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
): Promise<V2ListResult<V2Migration>> {
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

export async function searchV2(
	db: D1Database,
	query: string,
	types: readonly SearchResultType[],
	limit: number,
	offset: number
): Promise<{ rows: V2SearchResult[]; total: number }> {
	const { rows, total } = await search(db, query, limit, offset, types)
	return {
		rows: rows.map((row) => ({
			type: row.type,
			id: searchResultId(row),
			name: row.name,
			countryCode: row.countryCode,
			countryName: row.countryName,
			stateCode: row.stateCode,
			stateName: row.stateName,
			geonameId: row.geonameId
		})),
		total
	}
}

function searchResultId(row: {
	type: SearchResultType
	name: string
	countryCode: string
	stateCode: string | null
	geonameId: number | null
}): string {
	if (row.type === 'country') return row.countryCode
	if (row.type === 'state') return `${row.countryCode}:${row.stateCode ?? ''}`
	return row.geonameId === null
		? `${row.countryCode}:${row.name}`
		: String(row.geonameId)
}

export async function findNearestV2City(
	db: D1Database,
	point: V2Point
): Promise<WithDistance<V2City> | null> {
	for (const radiusKm of NEAREST_CITY_RADII_KM) {
		const near = { ...point, radiusKm }
		const nearQuery = nearSql(TEXT_GEO, near)
		const row = await db
			.prepare(
				`SELECT * FROM cities WHERE ${nearQuery.whereSql} ORDER BY ${nearQuery.distanceSql} LIMIT 1`
			)
			.bind(...nearQuery.bindings, ...distanceBindings(near))
			.first()
		if (row) return withDistance(row as D1Row, point, rowToV2City)
	}
	return null
}

const DATASETS: Array<Omit<V2DatasetMeta, 'records'> & { table: string }> = [
	{
		id: 'countries',
		table: 'countries',
		name: 'Countries',
		source: 'GeoNames, Unicode CLDR, Wikidata',
		license: 'CC BY 4.0'
	},
	{
		id: 'states',
		table: 'states',
		name: 'States and provinces',
		source: 'GeoNames',
		license: 'CC BY 4.0'
	},
	{
		id: 'cities',
		table: 'cities',
		name: 'Cities',
		source: 'GeoNames',
		license: 'CC BY 4.0'
	},
	{
		id: 'airports',
		table: 'airports',
		name: 'Airports',
		source: 'GeoNames, UN/LOCODE',
		license: 'CC BY 4.0'
	},
	{
		id: 'ports',
		table: 'ports',
		name: 'Ports',
		source: 'UN/LOCODE',
		license: 'CC BY 4.0'
	},
	{
		id: 'border-crossings',
		table: 'border_crossings',
		name: 'Border crossings',
		source: 'UN/LOCODE',
		license: 'CC BY 4.0'
	},
	{
		id: 'airlines',
		table: 'airlines',
		name: 'Airlines',
		source: 'IATA',
		license: 'CC BY 4.0'
	},
	{
		id: 'timezones',
		table: 'timezones',
		name: 'Timezones',
		source: 'IANA tz database',
		license: 'CC BY 4.0'
	},
	{
		id: 'currencies',
		table: 'currencies',
		name: 'Currencies',
		source: 'ISO 4217',
		license: 'CC BY 4.0'
	},
	{
		id: 'languages',
		table: 'languages',
		name: 'Languages',
		source: 'ISO 639-3',
		license: 'CC BY 4.0'
	},
	{
		id: 'statistics',
		table: 'country_statistics',
		name: 'Country statistics',
		source: 'World Bank World Development Indicators',
		license: 'CC BY 4.0'
	},
	{
		id: 'migrant-stocks',
		table: 'country_migration',
		name: 'International migrant stock',
		source: 'UN DESA',
		license: 'CC BY 4.0'
	}
]

export async function getV2Meta(db: D1Database): Promise<V2Meta> {
	const batch = await db.batch([
		db.prepare(
			'SELECT source_hash, applied_at FROM seed_files ORDER BY filename'
		),
		...DATASETS.map((dataset) =>
			db.prepare(`SELECT COUNT(*) AS total FROM ${dataset.table}`)
		)
	])
	const seeds = resultRows(batch[0])
	const hashes = seeds.map((row) => stringValue(row.source_hash)).join(',')
	const appliedAt = seeds
		.map((row) => stringValue(row.applied_at))
		.filter(Boolean)
		.sort()
		.at(-1)
	return {
		dataVersion: seeds.length > 0 ? await shortHash(hashes) : 'unknown',
		updatedAt: appliedAt ? `${appliedAt.replace(' ', 'T')}Z` : null,
		datasets: DATASETS.map(({ table: _table, ...dataset }, index) => ({
			...dataset,
			records: resultTotal(batch[index + 1], 0)
		}))
	}
}

async function shortHash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		'SHA-1',
		new TextEncoder().encode(text)
	)
	return [...new Uint8Array(digest)]
		.slice(0, 8)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

async function listRows<T extends object>(
	db: D1Database,
	table: string,
	query: V2ListQuery,
	mapRow: (row: D1Row) => T,
	geo?: V2GeoColumns
): Promise<V2ListResult<T>> {
	const { plan, near } = query
	const clauses = plan.whereSql ? [plan.whereSql] : []
	const bindings: Array<string | number> = [...plan.bindings]

	if (near && geo) {
		const nearQuery = nearSql(geo, near)
		clauses.push(nearQuery.whereSql)
		bindings.push(...nearQuery.bindings)
		const whereSql = ` WHERE ${clauses.join(' AND ')}`
		const batch = await db.batch([
			db
				.prepare(
					`SELECT * FROM ${table}${whereSql} ORDER BY ${nearQuery.distanceSql} LIMIT ? OFFSET ?`
				)
				.bind(
					...bindings,
					...distanceBindings(near),
					query.limit,
					query.offset
				),
			db
				.prepare(`SELECT COUNT(*) AS total FROM ${table}${whereSql}`)
				.bind(...bindings)
		])
		const rows = resultRows(batch[0]).map((row) =>
			withDistance(row, near, mapRow)
		)
		return { rows, total: resultTotal(batch[1], rows.length), last: null }
	}

	// Keyset paging needs a real table (for rowid) and a sort column.
	const keyset = plan.sort && !table.startsWith('(') ? plan.sort : null
	const direction = keyset?.direction === 'desc' ? 'DESC' : 'ASC'
	const whereSql = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : ''
	const pageClauses = [...clauses]
	const pageBindings = [...bindings]
	if (keyset && query.after) {
		// DESC puts NULL sort values last; keep them reachable after the last non-null key.
		const nullTail = direction === 'DESC' ? ` OR ${keyset.column} IS NULL` : ''
		pageClauses.push(
			`((${keyset.column}, rowid) ${direction === 'ASC' ? '>' : '<'} (?, ?)${nullTail})`
		)
		pageBindings.push(query.after.value, query.after.rowid)
	}
	const pageWhereSql =
		pageClauses.length > 0 ? ` WHERE ${pageClauses.join(' AND ')}` : ''
	const orderBySql = keyset
		? ` ORDER BY ${keyset.column} ${direction}, rowid ${direction}`
		: plan.orderBySql
			? ` ORDER BY ${plan.orderBySql}`
			: ''
	const selectSql = keyset
		? `SELECT *, rowid AS __rowid FROM ${table}`
		: `SELECT * FROM ${table}`

	const batch = await db.batch([
		db
			.prepare(`${selectSql}${pageWhereSql}${orderBySql} LIMIT ? OFFSET ?`)
			.bind(
				...pageBindings,
				query.limit,
				keyset && query.after ? 0 : query.offset
			),
		db
			.prepare(`SELECT COUNT(*) AS total FROM ${table}${whereSql}`)
			.bind(...bindings)
	])

	const rawRows = resultRows(batch[0])
	const lastRow = rawRows.at(-1)
	return {
		rows: rawRows.map(mapRow),
		total: resultTotal(batch[1], rawRows.length),
		last: keyset && lastRow ? keysetOf(lastRow, keyset.column) : null
	}
}

function keysetOf(row: D1Row, column: string): V2Keyset | null {
	const value = row[column]
	const rowid = row.__rowid
	if (typeof rowid !== 'number') return null
	if (typeof value !== 'string' && typeof value !== 'number') return null
	return { value, rowid }
}

function resultRows(result: D1Result | undefined): D1Row[] {
	return (result?.results ?? []) as D1Row[]
}

function resultTotal(result: D1Result | undefined, fallback: number): number {
	const total = (result?.results?.[0] as D1Row | undefined)?.total
	return typeof total === 'number' ? total : fallback
}

function withDistance<T extends object>(
	row: D1Row,
	origin: V2Point,
	mapRow: (row: D1Row) => T
): WithDistance<T> {
	return {
		...mapRow(row),
		distanceKm: roundKm(
			haversineKm(origin, {
				lat: Number(row.latitude),
				lng: Number(row.longitude)
			})
		)
	}
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

async function listMatchingRows<T>(
	db: D1Database,
	table: string,
	whereSql: string,
	bindings: Array<string | number>,
	mapRow: (row: D1Row) => T,
	orderBySql: string
): Promise<T[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM ${table} WHERE ${whereSql} ${orderBySql} LIMIT ${LOOKUP_MATCH_LIMIT}`
		)
		.bind(...bindings)
		.all()
	return ((results ?? []) as D1Row[]).map(mapRow)
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

	// One JSON binding: D1 rejects statements with more than 100 bound parameters.
	const { results } = await db
		.prepare(
			'SELECT * FROM country_statistics WHERE country_code IN (SELECT value FROM json_each(?))'
		)
		.bind(JSON.stringify(uniqueCodes))
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
	const populationFemale = parseStatisticValue(row.population_female)
	const populationMale = parseStatisticValue(row.population_male)
	const age0To14Percent = parseStatisticValue(row.age_0_to_14_percent)
	const age15To64Percent = parseStatisticValue(row.age_15_to_64_percent)
	const age65PlusPercent = parseStatisticValue(row.age_65_plus_percent)
	return {
		id: countryCode,
		countryCode,
		countryName: stringValue(row.country_name),
		iso3: stringValue(row.iso3),
		populationTotal: parseStatisticValue(row.population_total),
		populationFemale,
		populationMale,
		populationDensity: parseStatisticValue(row.population_density),
		urbanPopulationPercent: parseStatisticValue(row.urban_population_percent),
		ruralPopulationPercent: parseStatisticValue(row.rural_population_percent),
		age0To14Percent,
		age15To64Percent,
		age65PlusPercent,
		gdpCurrentUsd: parseStatisticValue(row.gdp_current_usd),
		gdpPerCapitaCurrentUsd: parseStatisticValue(row.gdp_per_capita_current_usd),
		lifeExpectancy: parseStatisticValue(row.life_expectancy),
		gdpGrowthPercent: parseStatisticValue(row.gdp_growth_percent),
		gniPerCapitaAtlasUsd: parseStatisticValue(row.gni_per_capita_atlas_usd),
		internetUsersPercent: parseStatisticValue(row.internet_users_percent),
		mobileSubscriptionsPer100: parseStatisticValue(
			row.mobile_subscriptions_per_100
		),
		electricityAccessPercent: parseStatisticValue(
			row.electricity_access_percent
		),
		fertilityRate: parseStatisticValue(row.fertility_rate),
		healthExpenditurePercentGdp: parseStatisticValue(
			row.health_expenditure_percent_gdp
		),
		forestAreaPercent: parseStatisticValue(row.forest_area_percent),
		dependencyRatio: derivedStatistic(
			'GEOCODED.DEPENDENCY_RATIO',
			'Dependents (under 15 and 65+) per 100 people aged 15 to 64',
			[age0To14Percent, age65PlusPercent, age15To64Percent],
			([young = 0, old = 0, working = 0]) => ((young + old) / working) * 100
		),
		ageingIndex: derivedStatistic(
			'GEOCODED.AGEING_INDEX',
			'People aged 65+ per 100 children under 15',
			[age65PlusPercent, age0To14Percent],
			([old = 0, young = 0]) => (old / young) * 100
		),
		sexRatio: derivedStatistic(
			'GEOCODED.SEX_RATIO',
			'Males per 100 females',
			[populationMale, populationFemale],
			([male = 0, female = 0]) => (male / female) * 100
		)
	}
}

// Computed from other indicators; null when an input is missing or a denominator is zero.
function derivedStatistic(
	code: string,
	name: string,
	inputs: V2StatisticValue[],
	compute: (values: number[]) => number
): V2StatisticValue {
	const values = inputs.map((input) => input.value)
	const years = inputs.map((input) => input.year).filter((year) => year > 0)
	const year = years.length > 0 ? Math.min(...years) : 0
	if (values.some((value) => value === null || value === 0)) {
		return { code, name, year, value: null }
	}
	const value = compute(values.filter((item) => item !== null))
	return {
		code,
		name,
		year,
		value: Number.isFinite(value) ? Math.round(value * 10) / 10 : null
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
