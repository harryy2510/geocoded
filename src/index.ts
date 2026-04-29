import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
	getAllCountries,
	getAllCurrencies,
	getAllTimezones,
	getCitiesByCountryState,
	getCitiesPaginated,
	getCityByName,
	getCountriesPaginated,
	getCountryById,
	getCurrenciesPaginated,
	getCurrencyByCode,
	getStateByIso2OrName,
	getStatesByCountry,
	getStatesPaginated,
	getTimezoneById,
	getTimezonesPaginated,
	search
} from './db/queries'
import { openApiSpec } from './openapi'
import type { Location, PaginatedResponse, SiteConfig } from './types'

function getSiteConfig(env: Env, requestUrl?: string): SiteConfig {
	const origin = requestUrl ? new URL(requestUrl).origin : ''
	return {
		siteName: env.SITE_NAME || 'Geocoded',
		siteUrl: env.SITE_URL || origin || 'http://localhost:8787',
		apiUrl: env.API_URL || origin || 'http://localhost:8787',
		githubUrl: env.GITHUB_URL || ''
	}
}

const app = new Hono<{ Bindings: Env }>()

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable'
} as const

function jsonResponse<T>(
	c: {
		json: (
			data: T,
			status?: number,
			headers?: Record<string, string>
		) => Response
	},
	data: T,
	status = 200
) {
	return c.json(data, status, CACHE_HEADERS)
}

app.use('*', cors())

function pickFields<T extends Record<string, unknown>>(
	data: T[],
	fields: string | undefined
): Partial<T>[]
function pickFields<T extends Record<string, unknown>>(
	data: T,
	fields: string | undefined
): Partial<T>
function pickFields<T extends Record<string, unknown>>(
	data: T | T[],
	fields: string | undefined
): Partial<T> | Partial<T>[] {
	if (!fields) return data
	const keys = fields.split(',').map((f) => f.trim())
	const pick = (obj: T): Partial<T> => {
		const result = {} as Record<string, unknown>
		for (const key of keys) {
			const dotIdx = key.indexOf('.')
			if (dotIdx === -1) {
				if (key in obj) {
					result[key] = obj[key]
				}
			} else {
				const top = key.slice(0, dotIdx)
				const rest = key.slice(dotIdx + 1)
				if (top in obj) {
					const val = obj[top]
					if (val && typeof val === 'object' && !Array.isArray(val)) {
						const existing = (result[top] ?? {}) as Record<string, unknown>
						const nested = pickFields(val as Record<string, unknown>, rest)
						result[top] = { ...existing, ...nested }
					} else {
						result[top] = val
					}
				}
			}
		}
		return result as Partial<T>
	}
	return Array.isArray(data) ? data.map(pick) : pick(data)
}

type PaginationParams = {
	limit: number
	offset: number
	cursor: string | null
}

function parsePagination(c: {
	req: { query: (k: string) => string | undefined }
}): PaginationParams | null {
	const rawLimit = c.req.query('limit')
	const rawOffset = c.req.query('offset')
	const rawCursor = c.req.query('cursor')
	if (!rawLimit && !rawOffset && !rawCursor) return null
	const limit = Math.min(Math.max(parseInt(rawLimit || '25', 10) || 25, 1), 250)
	if (rawCursor) {
		const decoded = decodeCursor(rawCursor)
		return { limit, offset: decoded, cursor: rawCursor }
	}
	const offset = Math.max(parseInt(rawOffset || '0', 10) || 0, 0)
	return { limit, offset, cursor: null }
}

function encodeCursor(offset: number): string {
	return btoa(String(offset))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

function decodeCursor(cursor: string): number {
	const padded =
		cursor.replace(/-/g, '+').replace(/_/g, '/') +
		'=='.slice(0, (4 - (cursor.length % 4)) % 4)
	const decoded = parseInt(atob(padded), 10)
	return Number.isNaN(decoded) ? 0 : Math.max(decoded, 0)
}

function paginated<T>(
	data: T[],
	total: number,
	limit: number,
	offset: number
): PaginatedResponse<T> {
	const nextOffset = offset + limit
	return {
		data,
		meta: {
			total,
			limit,
			offset,
			hasMore: nextOffset < total,
			cursor: nextOffset < total ? encodeCursor(nextOffset) : null
		}
	}
}

// --- OpenAPI Spec ---

app.get('/openapi.json', (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	return c.json(openApiSpec(config))
})

app.get('/', async (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	const apiHost = config.apiUrl ? new URL(config.apiUrl).hostname : null
	const host = new URL(c.req.url).hostname
	if (apiHost && host !== apiHost) {
		return c.env.ASSETS.fetch(c.req.raw)
	}

	const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined
	const countryCode = cf?.country
	const regionCode = cf?.regionCode
	const cityName = cf?.city

	const db = c.env.GEO_DB
	const [countryInfo, stateInfo, cities] = await Promise.all([
		countryCode ? getCountryById(db, countryCode) : null,
		countryCode && regionCode
			? getStateByIso2OrName(db, countryCode, regionCode)
			: null,
		countryCode && regionCode
			? getCitiesByCountryState(db, countryCode, regionCode)
			: null
	])

	const cityInfo = cityName
		? cities?.find((ci) => ci.name.toLowerCase() === cityName.toLowerCase())
		: undefined

	const location: Location = {
		asn: cf?.asn as number | undefined,
		asOrganization: cf?.asOrganization,
		city: cf?.city,
		cityInfo,
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

// --- Search ---

app.get('/search', async (c) => {
	const q = c.req.query('q')
	if (!q || q.trim().length === 0) {
		return c.json({ error: 'Query parameter "q" is required' }, 400)
	}
	const limit = Math.min(
		Math.max(parseInt(c.req.query('limit') || '25', 10) || 25, 1),
		250
	)
	const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0)
	const { rows, total } = await search(c.env.GEO_DB, q, limit, offset)
	return jsonResponse(c, paginated(rows, total, limit, offset))
})

// --- Countries ---

app.get('/countries', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	const fields = c.req.query('fields')
	if (page) {
		const { rows, total } = await getCountriesPaginated(
			db,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const countries = await getAllCountries(db)
	if (countries.length === 0)
		return c.json({ error: 'Countries not found' }, 404)
	return jsonResponse(c, pickFields(countries, fields))
})

app.get('/countries/:id', async (c) => {
	const db = c.env.GEO_DB
	const country = await getCountryById(db, c.req.param('id'))
	if (!country) return c.json({ error: 'Country not found' }, 404)
	return jsonResponse(c, pickFields(country, c.req.query('fields')))
})

// --- States ---

app.get('/countries/:country/states', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country').toUpperCase()
	const page = parsePagination(c)
	const fields = c.req.query('fields')
	if (page) {
		const { rows, total } = await getStatesPaginated(
			db,
			countryCode,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const states = await getStatesByCountry(db, countryCode)
	if (states.length === 0) return c.json({ error: 'States not found' }, 404)
	return jsonResponse(c, pickFields(states, fields))
})

app.get('/countries/:country/states/:state', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country').toUpperCase()
	const stateId = c.req.param('state')
	const state = await getStateByIso2OrName(db, countryCode, stateId)
	if (!state) return c.json({ error: 'State not found' }, 404)
	return jsonResponse(c, pickFields(state, c.req.query('fields')))
})

// --- Cities ---

app.get('/countries/:country/states/:state/cities', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country').toUpperCase()
	const stateCode = c.req.param('state').toUpperCase()
	const page = parsePagination(c)
	const fields = c.req.query('fields')
	if (page) {
		const { rows, total } = await getCitiesPaginated(
			db,
			countryCode,
			stateCode,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const cities = await getCitiesByCountryState(db, countryCode, stateCode)
	if (cities.length === 0) return c.json({ error: 'Cities not found' }, 404)
	return jsonResponse(c, pickFields(cities, fields))
})

app.get('/countries/:country/states/:state/cities/:city', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country').toUpperCase()
	const stateCode = c.req.param('state').toUpperCase()
	const cityName = c.req.param('city')
	const city = await getCityByName(db, countryCode, stateCode, cityName)
	if (!city) return c.json({ error: 'City not found' }, 404)
	return jsonResponse(c, pickFields(city, c.req.query('fields')))
})

// --- Timezones ---

app.get('/timezones', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	const fields = c.req.query('fields')
	if (page) {
		const { rows, total } = await getTimezonesPaginated(
			db,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const timezones = await getAllTimezones(db)
	return jsonResponse(c, pickFields(timezones, fields))
})

app.get('/timezones/:id{.+}', async (c) => {
	const db = c.env.GEO_DB
	const id = c.req.param('id')
	const tz = await getTimezoneById(db, id)
	if (!tz) return c.json({ error: 'Timezone not found' }, 404)
	return jsonResponse(c, pickFields(tz, c.req.query('fields')))
})

// --- Currencies ---

app.get('/currencies', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	const fields = c.req.query('fields')
	if (page) {
		const { rows, total } = await getCurrenciesPaginated(
			db,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const currencies = await getAllCurrencies(db)
	return jsonResponse(c, pickFields(currencies, fields))
})

app.get('/currencies/:code', async (c) => {
	const db = c.env.GEO_DB
	const currency = await getCurrencyByCode(db, c.req.param('code'))
	if (!currency) return c.json({ error: 'Currency not found' }, 404)
	return jsonResponse(c, pickFields(currency, c.req.query('fields')))
})

// --- Quiz Stats ---

app.post('/quiz/stats', async (c) => {
	const db = c.env.GEO_DB
	const body = await c.req.json<{ mode: string; score: number; total?: number }>()
	const { mode, score, total = 10 } = body

	const validModes = ['capital', 'flag', 'population', 'geography', 'neighbour']
	if (!validModes.includes(mode) || typeof score !== 'number' || score < 0 || score > total) {
		return c.json({ error: 'Invalid input' }, 400)
	}

	await db
		.prepare('INSERT INTO quiz_stats (mode, score, total) VALUES (?, ?, ?)')
		.bind(mode, score, total)
		.run()

	const stats = await db
		.prepare(
			`SELECT
				COUNT(*) AS total_attempts,
				ROUND(AVG(score), 1) AS avg_score,
				COUNT(CASE WHEN score <= ? THEN 1 END) AS at_or_below
			FROM quiz_stats WHERE mode = ?`
		)
		.bind(score, mode)
		.first<{ total_attempts: number; avg_score: number; at_or_below: number }>()

	const percentile = stats && stats.total_attempts > 0
		? Math.round((stats.at_or_below / stats.total_attempts) * 100)
		: 50

	return c.json({
		totalAttempts: stats?.total_attempts ?? 0,
		avgScore: stats?.avg_score ?? 0,
		percentile
	})
})

app.get('/quiz/stats/:mode', async (c) => {
	const db = c.env.GEO_DB
	const mode = c.req.param('mode')

	const distribution = await db
		.prepare(
			'SELECT score, COUNT(*) AS count FROM quiz_stats WHERE mode = ? GROUP BY score ORDER BY score'
		)
		.bind(mode)
		.all<{ score: number; count: number }>()

	const total = await db
		.prepare('SELECT COUNT(*) AS count FROM quiz_stats WHERE mode = ?')
		.bind(mode)
		.first<{ count: number }>()

	return c.json({
		totalAttempts: total?.count ?? 0,
		distribution: distribution.results ?? []
	})
})

// --- Catch-all: static assets for site, 404 for API ---

app.all('*', async (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	const apiHost = config.apiUrl ? new URL(config.apiUrl).hostname : null
	const host = new URL(c.req.url).hostname
	if (apiHost && host === apiHost) {
		return c.json({ error: 'Not found' }, 404)
	}
	return c.env.ASSETS.fetch(c.req.raw)
})

export default app
