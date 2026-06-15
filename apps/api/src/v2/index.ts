import { Hono } from 'hono'
import { createPostmanCollection } from '../postman'
import { getSiteConfig } from '../site-config'
import {
	parseV2Pagination,
	paginatedV2,
	type V2PaginationParams
} from './pagination'
import { parseV2Query, projectV2Fields, type V2ResourceConfig } from './query'
import {
	getV2AirlineById,
	getV2AirportById,
	getV2BorderCrossingById,
	getV2CityByCountryStateName,
	getV2CityById,
	getV2ContinentById,
	getV2CountryById,
	getV2CurrencyById,
	getV2LanguageById,
	getV2MigrationById,
	getV2PortById,
	getV2RegionById,
	getV2StateById,
	getV2StatisticsById,
	getV2TimezoneById,
	listV2Airlines,
	listV2Airports,
	listV2BorderCrossings,
	listV2Cities,
	listV2Continents,
	listV2Countries,
	listV2Currencies,
	listV2Languages,
	listV2Migration,
	listV2Ports,
	listV2Regions,
	listV2States,
	listV2Statistics,
	listV2Timezones,
	type V2ListQuery
} from './queries'
import {
	v2AirlineResource,
	v2AirportResource,
	v2BorderCrossingResource,
	v2CityResource,
	v2ContinentResource,
	v2CountryResource,
	v2CurrencyResource,
	v2LanguageResource,
	v2MigrationResource,
	v2PortResource,
	v2RegionResource,
	v2StateResource,
	v2StatisticsResource,
	v2TimezoneResource
} from './resources'
import { type V2Location } from './types'
import { v2OpenApiSpec } from './openapi'

const v2App = new Hono<{ Bindings: Env }>()

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable'
} as const

v2App.get('/openapi.json', (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	return c.json(v2OpenApiSpec(config))
})

v2App.get('/postman.json', (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	return c.json(
		createPostmanCollection(v2OpenApiSpec(config), 'Geocoded API v2'),
		200,
		{
			'Cache-Control': 'public, max-age=3600',
			'Content-Disposition':
				'attachment; filename="geocoded-v2-postman-collection.json"'
		}
	)
})

v2App.get('/', async (c) => {
	const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined
	const countryCode = cf?.country
	const regionCode = cf?.regionCode
	const cityName = cf?.city

	const db = c.env.GEO_DB
	const [countryInfo, stateInfo, cityInfo] = await Promise.all([
		countryCode ? getV2CountryById(db, countryCode, []) : null,
		countryCode && regionCode
			? getV2StateById(db, `${countryCode}:${regionCode}`)
			: null,
		countryCode && regionCode && cityName
			? getV2CityByCountryStateName(db, countryCode, regionCode, cityName)
			: null
	])

	const location: V2Location = {
		asn: cf?.asn as number | undefined,
		asOrganization: cf?.asOrganization,
		city: cf?.city,
		cityInfo: cityInfo ?? undefined,
		colo: cf?.colo,
		continent: cf?.continent,
		country: countryCode,
		countryInfo: countryInfo ?? undefined,
		ip: c.req.header('cf-connecting-ip') ?? '',
		isEU: cf?.isEU === '1' ? true : cf?.isEU === '0' ? false : undefined,
		latitude: cf?.latitude,
		longitude: cf?.longitude,
		postalCode: cf?.postalCode,
		region: cf?.region,
		regionCode,
		stateInfo: stateInfo ?? undefined,
		timezone: cf?.timezone
	}

	return c.json(pickFields(location, c.req.query('fields')), 200, {
		'Cache-Control': 'private, no-store'
	})
})

registerV2ListRoute('/continents', v2ContinentResource, listV2Continents)
registerV2ListRoute('/regions', v2RegionResource, listV2Regions)
registerV2ListRoute('/countries', v2CountryResource, listV2Countries)
registerV2ListRoute('/states', v2StateResource, listV2States)
registerV2ListRoute('/cities', v2CityResource, listV2Cities)
registerV2ListRoute('/timezones', v2TimezoneResource, listV2Timezones)
registerV2ListRoute('/currencies', v2CurrencyResource, listV2Currencies)
registerV2ListRoute('/languages', v2LanguageResource, listV2Languages)
registerV2ListRoute('/airlines', v2AirlineResource, listV2Airlines)
registerV2ListRoute('/airports', v2AirportResource, listV2Airports)
registerV2ListRoute('/ports', v2PortResource, listV2Ports)
registerV2ListRoute(
	'/border-crossings',
	v2BorderCrossingResource,
	listV2BorderCrossings
)
registerV2ListRoute('/statistics', v2StatisticsResource, listV2Statistics)
registerV2ListRoute('/migrant-stocks', v2MigrationResource, listV2Migration)

registerV2DetailRoute(
	'/continents/:id',
	v2ContinentResource,
	getV2ContinentById,
	'Continent not found'
)
registerV2DetailRoute(
	'/regions/:id',
	v2RegionResource,
	getV2RegionById,
	'Region not found'
)
registerV2DetailRoute(
	'/countries/:id',
	v2CountryResource,
	getV2CountryById,
	'Country not found'
)
registerV2DetailRoute(
	'/states/:id',
	v2StateResource,
	getV2StateById,
	'State not found'
)
registerV2DetailRoute(
	'/cities/:id',
	v2CityResource,
	getV2CityById,
	'City not found'
)
registerV2DetailRoute(
	'/timezones/:id{.+}',
	v2TimezoneResource,
	getV2TimezoneById,
	'Timezone not found'
)
registerV2DetailRoute(
	'/currencies/:id',
	v2CurrencyResource,
	getV2CurrencyById,
	'Currency not found'
)
registerV2DetailRoute(
	'/languages/:id',
	v2LanguageResource,
	getV2LanguageById,
	'Language not found'
)
registerV2DetailRoute(
	'/airlines/:id',
	v2AirlineResource,
	getV2AirlineById,
	'Airline not found'
)
registerV2DetailRoute(
	'/airports/:id',
	v2AirportResource,
	getV2AirportById,
	'Airport not found'
)
registerV2DetailRoute(
	'/ports/:id',
	v2PortResource,
	getV2PortById,
	'Port not found'
)
registerV2DetailRoute(
	'/border-crossings/:id',
	v2BorderCrossingResource,
	getV2BorderCrossingById,
	'Border crossing not found'
)
registerV2DetailRoute(
	'/statistics/:id',
	v2StatisticsResource,
	getV2StatisticsById,
	'Statistics not found'
)
registerV2DetailRoute(
	'/migrant-stocks/:id',
	v2MigrationResource,
	getV2MigrationById,
	'Migrant stocks not found'
)

function parsePage(params: URLSearchParams): V2PaginationParams | string {
	return parseV2Pagination(params)
}

function registerV2ListRoute<T>(
	path: string,
	resource: V2ResourceConfig,
	list: (
		db: D1Database,
		query: V2ListQuery
	) => Promise<{ rows: T[]; total: number }>
): void {
	v2App.get(path, async (c) => {
		const params = new URL(c.req.url).searchParams
		const page = parsePage(params)
		if (typeof page === 'string') return c.json({ error: page }, 400)

		const query = parseV2Query(params, resource)
		if (!query.ok) return c.json({ error: query.error }, 400)

		const { rows, total } = await list(c.env.GEO_DB, {
			plan: query,
			limit: page.limit,
			offset: page.offset
		})
		return jsonV2(
			c,
			paginatedV2(
				projectV2Fields(rows, query.projection) as unknown[],
				total,
				page.limit,
				page.offset
			)
		)
	})
}

function registerV2DetailRoute<T>(
	path: string,
	resource: V2ResourceConfig,
	getOne: (db: D1Database, id: string, expand: string[]) => Promise<T | null>,
	notFoundError: string
): void {
	v2App.get(path, async (c) => {
		const params = new URL(c.req.url).searchParams
		const query = parseV2Query(params, resource)
		if (!query.ok) return c.json({ error: query.error }, 400)

		const row = await getOne(
			c.env.GEO_DB,
			decodePathParam(c.req.param('id') ?? ''),
			query.expand
		)
		if (!row) return c.json({ error: notFoundError }, 404)

		return jsonV2(c, projectV2Fields(row, query.projection))
	})
}

function decodePathParam(value: string): string {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function pickFields<T extends Record<string, unknown>>(
	data: T,
	fields: string | undefined
): Partial<T> {
	if (!fields) return data
	const result: Record<string, unknown> = {}
	for (const key of fields.split(',').map((field) => field.trim())) {
		copyField(data, result, key.split('.'))
	}
	return result as Partial<T>
}

function copyField(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
	path: string[]
): void {
	const [head, ...rest] = path
	if (!head || !(head in source)) return
	if (rest.length === 0) {
		target[head] = source[head]
		return
	}

	const value = source[head]
	if (!value || typeof value !== 'object' || Array.isArray(value)) return
	const nested = (target[head] ?? {}) as Record<string, unknown>
	copyField(value as Record<string, unknown>, nested, rest)
	target[head] = nested
}

function jsonV2(
	c: {
		json: (
			data: unknown,
			status?: number,
			headers?: Record<string, string>
		) => Response
	},
	data: unknown,
	status = 200
) {
	return c.json(data, status, CACHE_HEADERS)
}

export default v2App
