import { Hono, type Context } from 'hono'
import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow'
import { createPostmanCollection } from '../postman'
import { getSiteConfig } from '../site-config'
import { type SearchResultType } from '../v1/db/queries'
import { invalid, notFound, v2Error, type V2Error } from './errors'
import { parseNear, parsePoint, type V2NearQuery } from './geo'
import { NO_STORE_CACHE_CONTROL, sendV2 } from './http'
import { paginatedV2, parseV2Pagination } from './pagination'
import {
	parseV2Query,
	projectV2Fields,
	type V2Projection,
	type V2ResourceConfig
} from './query'
import {
	findNearestV2City,
	getV2AirlineById,
	getV2AirportById,
	getV2BorderCrossingById,
	getV2CityByCountryStateName,
	getV2ContinentById,
	getV2CountryById,
	getV2CurrencyById,
	getV2LanguageById,
	getV2Meta,
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
	lookupV2City,
	lookupV2State,
	searchV2,
	type V2ListQuery,
	type V2ListResult,
	type V2LookupResult
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
import { timezoneNow } from './timezone-now'
import { type V2Country, type V2Location, type V2ReverseResult } from './types'
import { v2OpenApiSpec } from './openapi'

type AppEnv = { Bindings: Env }
type AppContext = Context<AppEnv>

type ListFn<T> = (
	db: D1Database,
	query: V2ListQuery
) => Promise<V2ListResult<T>>

const v2App = new Hono<AppEnv>()

const INTERNAL_ERROR = v2Error(
	'internal_error',
	'Something went wrong on our side. Please try again later.'
)
const SEARCH_TYPES: readonly SearchResultType[] = ['country', 'state', 'city']
const SEARCH_PARAMS = new Set(['q', 'type', 'limit', 'offset', 'cursor'])
const REVERSE_PARAMS = new Set(['lat', 'lng', 'lang'])
const LANG_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i

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

v2App.get('/meta', (c) => sendV2(c, fromDb(getV2Meta(c.env.GEO_DB))))

v2App.get('/search', (c) => sendV2(c, searchResponse(c)))

v2App.get('/reverse', (c) => sendV2(c, reverseResponse(c)))

v2App.get('/countries', (c) =>
	sendV2(
		c,
		parseLang(searchParams(c)).asyncAndThen((lang) =>
			listResponse(
				c.env.GEO_DB,
				searchParams(c),
				v2CountryResource,
				listV2Countries,
				localizeCountry(lang)
			)
		)
	)
)
registerV2ListRoute('/continents', v2ContinentResource, listV2Continents)
registerV2ListRoute('/regions', v2RegionResource, listV2Regions)
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
v2App.get('/countries/:country/states/:state/cities/:city', (c) =>
	sendV2(c, scopedCityLookup(c, { state: true }))
)
v2App.get('/countries/:country/states/:state/cities', (c) =>
	sendV2(c, scopedCityList(c, { state: true }))
)
v2App.get('/countries/:country/states/:state', (c) =>
	sendV2(c, scopedStateLookup(c))
)
v2App.get('/countries/:country/states', (c) =>
	sendV2(
		c,
		resolveCountry(c).andThen((country) => {
			const params = searchParams(c)
			params.set('filter[country]', country.iso2)
			return listResponse(c.env.GEO_DB, params, v2StateResource, listV2States)
		})
	)
)
v2App.get('/countries/:country/cities/:city', (c) =>
	sendV2(c, scopedCityLookup(c, { state: false }))
)
v2App.get('/countries/:country/cities', (c) =>
	sendV2(c, scopedCityList(c, { state: false }))
)
v2App.get('/countries/:id', (c) =>
	sendV2(
		c,
		parseLang(searchParams(c)).asyncAndThen((lang) =>
			detailResponse(
				c,
				v2CountryResource,
				getV2CountryById,
				'Country not found',
				localizeCountry(lang)
			)
		)
	)
)
registerV2LookupRoute(
	'/states/:id',
	v2StateResource,
	lookupV2State,
	'State not found',
	'State is ambiguous',
	'Use a country-scoped path such as /v2/countries/US/states/CA, or a unique id such as US-CA.'
)
registerV2LookupRoute(
	'/cities/:id',
	v2CityResource,
	lookupV2City,
	'City not found',
	'City is ambiguous',
	'Use a scoped path such as /v2/countries/US/cities/Paris or /v2/countries/US/states/IL/cities/Springfield, or a GeoNames id.'
)
// Timezone ids contain slashes, so one route serves both /timezones/{id} and /timezones/{id}/now.
v2App.get('/timezones/:id{.+}', (c) => {
	const id = pathParam(c, 'id')
	if (id.endsWith('/now')) {
		return sendV2(
			c,
			timezoneNowResponse(c, id.slice(0, -'/now'.length)),
			NO_STORE_CACHE_CONTROL
		)
	}
	return sendV2(
		c,
		detailResponse(
			c,
			v2TimezoneResource,
			getV2TimezoneById,
			'Timezone not found'
		)
	)
})
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

v2App.all('*', (c) => sendV2(c, notFound('Endpoint not found')))

function registerV2ListRoute<T extends object>(
	path: string,
	resource: V2ResourceConfig,
	list: ListFn<T>
): void {
	v2App.get(path, (c) =>
		sendV2(c, listResponse(c.env.GEO_DB, searchParams(c), resource, list))
	)
}

function registerV2DetailRoute<T>(
	path: string,
	resource: V2ResourceConfig,
	getOne: (db: D1Database, id: string, expand: string[]) => Promise<T | null>,
	notFoundMessage: string
): void {
	v2App.get(path, (c) =>
		sendV2(c, detailResponse(c, resource, getOne, notFoundMessage))
	)
}

function registerV2LookupRoute<T>(
	path: string,
	resource: V2ResourceConfig,
	lookup: (db: D1Database, id: string) => Promise<V2LookupResult<T>>,
	notFoundMessage: string,
	ambiguousMessage: string,
	ambiguousHint: string
): void {
	v2App.get(path, (c) =>
		sendV2(
			c,
			parseV2Query(searchParams(c), resource).asyncAndThen((plan) =>
				fromDb(lookup(c.env.GEO_DB, pathParam(c, 'id'))).andThen((result) =>
					lookupResult(
						result,
						plan.projection,
						notFoundMessage,
						ambiguousMessage,
						ambiguousHint
					)
				)
			)
		)
	)
}

function listResponse<T extends object>(
	db: D1Database,
	params: URLSearchParams,
	resource: V2ResourceConfig,
	list: ListFn<T>,
	decorate?: (row: T) => T
): ResultAsync<unknown, V2Error> {
	return Result.combine([
		parseV2Pagination(params),
		parseV2Query(params, resource),
		resource.extraParams?.includes('near') ? parseNear(params) : ok(null)
	]).asyncAndThen(([page, plan, near]) =>
		fromDb(
			list(db, {
				plan,
				limit: page.limit,
				offset: page.offset,
				after: page.after,
				near
			})
		).map((result) =>
			paginatedV2(
				projectV2Fields(
					decorate ? result.rows.map(decorate) : result.rows,
					withResponseFields(plan.projection, near, decorate)
				) as unknown[],
				result.total,
				page.limit,
				page.offset,
				result.last
			)
		)
	)
}

function detailResponse<T>(
	c: AppContext,
	resource: V2ResourceConfig,
	getOne: (db: D1Database, id: string, expand: string[]) => Promise<T | null>,
	notFoundMessage: string,
	decorate?: (row: T) => T
): ResultAsync<unknown, V2Error> {
	return parseV2Query(searchParams(c), resource).asyncAndThen((plan) =>
		fromDb(getOne(c.env.GEO_DB, pathParam(c, 'id'), plan.expand)).andThen(
			(row) =>
				row === null
					? notFound(notFoundMessage)
					: ok(
							projectV2Fields(
								decorate ? decorate(row) : row,
								withResponseFields(plan.projection, null, decorate)
							)
						)
		)
	)
}

function scopedStateLookup(c: AppContext): ResultAsync<unknown, V2Error> {
	return parseV2Query(searchParams(c), v2StateResource).asyncAndThen((plan) =>
		resolveCountry(c).andThen((country) =>
			fromDb(
				lookupV2State(c.env.GEO_DB, pathParam(c, 'state'), country.iso2)
			).andThen((result) =>
				lookupResult(
					result,
					plan.projection,
					'State not found',
					'State is ambiguous',
					STATE_HINT
				)
			)
		)
	)
}

function scopedCityList(
	c: AppContext,
	scope: { state: boolean }
): ResultAsync<unknown, V2Error> {
	return resolveCountry(c).andThen((country) => {
		const params = searchParams(c)
		params.set('filter[country]', country.iso2)
		const withState = scope.state
			? resolveState(c, country.iso2).map((stateCode) => {
					params.set('filter[state]', stateCode)
					return params
				})
			: okAsync(params)
		return withState.andThen((scoped) =>
			listResponse(c.env.GEO_DB, scoped, v2CityResource, listV2Cities)
		)
	})
}

function scopedCityLookup(
	c: AppContext,
	scope: { state: boolean }
): ResultAsync<unknown, V2Error> {
	return parseV2Query(searchParams(c), v2CityResource).asyncAndThen((plan) =>
		resolveCountry(c).andThen((country) => {
			const stateCode = scope.state
				? resolveState(c, country.iso2).map((code): string | undefined => code)
				: okAsync<string | undefined, V2Error>(undefined)
			return stateCode.andThen((state) =>
				fromDb(
					lookupV2City(c.env.GEO_DB, pathParam(c, 'city'), {
						country: country.iso2,
						state
					})
				).andThen((result) =>
					lookupResult(
						result,
						plan.projection,
						'City not found',
						'City is ambiguous',
						'Use a scoped path such as /v2/countries/US/states/IL/cities/Springfield, or a GeoNames id.'
					)
				)
			)
		})
	)
}

const STATE_HINT =
	'Use a unique id such as US-CA, or the state ISO code if it is unique in this country.'

function resolveCountry(c: AppContext): ResultAsync<V2Country, V2Error> {
	return fromDb(
		getV2CountryById(c.env.GEO_DB, pathParam(c, 'country'), [])
	).andThen((country) =>
		country === null ? notFound('Country not found') : ok(country)
	)
}

function resolveState(
	c: AppContext,
	countryCode: string
): ResultAsync<string, V2Error> {
	return fromDb(
		lookupV2State(c.env.GEO_DB, pathParam(c, 'state'), countryCode)
	).andThen((result) =>
		result.status === 'ok'
			? ok(result.row.stateCode)
			: lookupFailure(
					result,
					null,
					'State not found',
					'State is ambiguous',
					STATE_HINT
				)
	)
}

function lookupResult<T>(
	result: V2LookupResult<T>,
	projection: V2Projection | null,
	notFoundMessage: string,
	ambiguousMessage: string,
	ambiguousHint: string
): Result<unknown, V2Error> {
	if (result.status === 'ok') {
		return ok(projection ? projectV2Fields(result.row, projection) : result.row)
	}
	return lookupFailure(
		result,
		projection,
		notFoundMessage,
		ambiguousMessage,
		ambiguousHint
	)
}

function lookupFailure<T>(
	result: Exclude<V2LookupResult<T>, { status: 'ok' }>,
	projection: V2Projection | null,
	notFoundMessage: string,
	ambiguousMessage: string,
	ambiguousHint: string
): Result<never, V2Error> {
	if (result.status === 'missing') return notFound(notFoundMessage)
	return err(
		v2Error('ambiguous', ambiguousMessage, {
			hint: ambiguousHint,
			matches: projection
				? result.matches.map((match) => projectV2Fields(match, projection))
				: result.matches
		})
	)
}

function searchResponse(c: AppContext): ResultAsync<unknown, V2Error> {
	const params = searchParams(c)
	const unknown = [...params.keys()].find((name) => !SEARCH_PARAMS.has(name))
	if (unknown) {
		return invalidAsync(`Unsupported query parameter "${unknown}"`)
	}
	const q = params.get('q')?.trim() ?? ''
	if (!q) return invalidAsync('Query parameter "q" is required')

	const rawTypes = (params.get('type') ?? '')
		.split(',')
		.map((type) => type.trim())
		.filter(Boolean)
	const types = SEARCH_TYPES.filter((type) => rawTypes.includes(type))
	if (types.length !== rawTypes.length) {
		return invalidAsync(
			`Query parameter "type" must be a comma-separated list of: ${SEARCH_TYPES.join(', ')}`
		)
	}

	return parseV2Pagination(params).asyncAndThen((page) =>
		fromDb(searchV2(c.env.GEO_DB, q, types, page.limit, page.offset)).map(
			({ rows, total }) => paginatedV2(rows, total, page.limit, page.offset)
		)
	)
}

function reverseResponse(c: AppContext): ResultAsync<unknown, V2Error> {
	const params = searchParams(c)
	const unknown = [...params.keys()].find((name) => !REVERSE_PARAMS.has(name))
	if (unknown) return invalidAsync(`Unsupported query parameter "${unknown}"`)

	const db = c.env.GEO_DB
	return Result.combine([
		parsePoint(params.get('lat'), params.get('lng')),
		parseLang(params)
	]).asyncAndThen(([point, lang]) =>
		fromDb(findNearestV2City(db, point))
			.andThen((city) =>
				city === null
					? notFound('No city found within 400 km of this point')
					: ok(city)
			)
			.andThen((city) =>
				fromDb(
					Promise.all([
						lookupV2State(db, city.stateCode, city.countryCode),
						getV2CountryById(db, city.countryCode, [])
					])
				).map(
					([state, country]): V2ReverseResult => ({
						query: point,
						city,
						state: state.status === 'ok' ? state.row : null,
						country: country
							? (localizeCountry(lang)?.(country) ?? country)
							: null,
						timezone: city.timezone
					})
				)
			)
	)
}

function timezoneNowResponse(
	c: AppContext,
	id: string
): ResultAsync<unknown, V2Error> {
	return fromDb(getV2TimezoneById(c.env.GEO_DB, id)).andThen((timezone) =>
		timezone === null
			? notFound('Timezone not found')
			: Result.fromThrowable(
					() => timezoneNow(timezone.timezone, timezone.standardOffset),
					(cause) => {
						console.error('timezone clock failed', cause)
						return INTERNAL_ERROR
					}
				)()
	)
}

function parseLang(params: URLSearchParams): Result<string | null, V2Error> {
	const lang = params.get('lang')?.trim()
	if (!lang) return ok(null)
	return LANG_PATTERN.test(lang)
		? ok(lang)
		: invalid(
				'Query parameter "lang" must be a language code such as "ja" or "pt-BR"'
			)
}

// Adds `localName` from the country's translations, falling back to the base language, then the name.
function localizeCountry(
	lang: string | null
): ((country: V2Country) => V2Country) | undefined {
	if (!lang) return undefined
	const base = lang.split('-')[0]?.toLowerCase() ?? lang
	return (country) => ({
		...country,
		localName:
			country.translations[lang] ?? country.translations[base] ?? country.name
	})
}

function withResponseFields(
	projection: V2Projection,
	near: V2NearQuery | null,
	decorate: unknown
): V2Projection {
	const extra = [
		...(near ? ['distanceKm'] : []),
		...(decorate ? ['localName'] : [])
	]
	if (extra.length === 0) return projection
	return {
		...projection,
		fields: [...new Set([...projection.fields, ...extra])]
	}
}

function fromDb<T>(promise: Promise<T>): ResultAsync<T, V2Error> {
	return ResultAsync.fromPromise(promise, (cause) => {
		console.error('v2 query failed', cause)
		return INTERNAL_ERROR
	})
}

function invalidAsync(message: string): ResultAsync<never, V2Error> {
	return errAsync(v2Error('invalid_request', message))
}

function searchParams(c: AppContext): URLSearchParams {
	return new URL(c.req.url).searchParams
}

function pathParam(c: AppContext, name: string): string {
	return decodePathParam(c.req.param(name) ?? '')
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

export default v2App
