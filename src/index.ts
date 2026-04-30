import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
	getCityByGeonameId,
	getCityByName,
	getCityByNameMatches,
	getCitiesPaginated,
	getCountriesPaginated,
	getCountryById,
	getCurrenciesPaginated,
	getCurrencyByCode,
	getStateByIso2OrName,
	getStatesPaginated,
	getTimezoneById,
	getTimezonesPaginated,
	search,
	searchCitiesPaginated,
	searchCountriesPaginated,
	searchStatesPaginated
} from './db/queries'
import { openApiSpec } from './openapi'
import type {
	Location,
	PaginatedResponse,
	SearchResult,
	SiteConfig
} from './types'
import postmanCollection from '../postman.json'

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

const QUIZ_RATE_LIMIT_PER_HOUR = 60

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
	json: (
		data: { error: string },
		status?: number,
		headers?: Record<string, string>
	) => Response
}): PaginationParams | Response {
	const rawLimit = c.req.query('limit')
	const rawOffset = c.req.query('offset')
	const rawCursor = c.req.query('cursor')
	const limitResult = parsePositiveInteger(rawLimit, 'limit', 25)
	if (typeof limitResult === 'string')
		return c.json({ error: limitResult }, 400)
	const limit = Math.min(limitResult, 2000)

	if (rawCursor !== undefined && rawOffset !== undefined) {
		return c.json(
			{ error: 'Query parameters "offset" and "cursor" cannot be combined' },
			400
		)
	}

	if (rawCursor !== undefined) {
		if (rawCursor.trim().length === 0) {
			return c.json({ error: 'Query parameter "cursor" is invalid' }, 400)
		}
		const decoded = decodeCursor(rawCursor)
		if (decoded === null) {
			return c.json({ error: 'Query parameter "cursor" is invalid' }, 400)
		}
		return { limit, offset: decoded, cursor: rawCursor }
	}
	const offsetResult = parseNonNegativeInteger(rawOffset, 'offset', 0)
	if (typeof offsetResult === 'string')
		return c.json({ error: offsetResult }, 400)
	const offset = offsetResult
	return { limit, offset, cursor: null }
}

function parsePositiveInteger(
	value: string | undefined,
	name: string,
	defaultValue: number
): number | string {
	if (value === undefined || value === '') return defaultValue
	if (!/^\d+$/.test(value))
		return `Query parameter "${name}" must be an integer`
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		return `Query parameter "${name}" must be greater than 0`
	}
	return parsed
}

function parseNonNegativeInteger(
	value: string | undefined,
	name: string,
	defaultValue: number
): number | string {
	if (value === undefined || value === '') return defaultValue
	if (!/^\d+$/.test(value))
		return `Query parameter "${name}" must be an integer`
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed)) {
		return `Query parameter "${name}" is too large`
	}
	return parsed
}

function encodeCursor(offset: number): string {
	return btoa(String(offset))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

function decodeCursor(cursor: string): number | null {
	if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return null
	const padded =
		cursor.replace(/-/g, '+').replace(/_/g, '/') +
		'=='.slice(0, (4 - (cursor.length % 4)) % 4)
	try {
		const decodedText = atob(padded)
		if (!/^\d+$/.test(decodedText)) return null
		const decoded = Number(decodedText)
		return Number.isSafeInteger(decoded) ? decoded : null
	} catch {
		return null
	}
}

function parseSearchType(
	value: string | undefined
): SearchResult['type'] | null | undefined {
	switch (value) {
		case undefined:
			return undefined
		case 'country':
		case 'state':
		case 'city':
			return value
		default:
			return null
	}
}

function isTrustedQuizOrigin(
	env: Env,
	requestUrl: string,
	origin: string | undefined
): boolean {
	if (!origin) return true
	const parsedOrigin = parseOrigin(origin)
	if (!parsedOrigin) return false
	const originHost = new URL(parsedOrigin).hostname
	if (originHost === 'localhost' || originHost === '127.0.0.1') return true

	const trusted = new Set<string>()
	for (const value of [env.SITE_URL, env.API_URL, requestUrl]) {
		addTrustedOrigin(trusted, value)
	}
	return trusted.has(parsedOrigin)
}

function addTrustedOrigin(
	trusted: Set<string>,
	value: string | undefined
): void {
	if (!value) return
	const parsed = parseOrigin(value)
	if (!parsed) return
	trusted.add(parsed)

	const url = new URL(parsed)
	if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return
	if (url.hostname.startsWith('www.')) {
		url.hostname = url.hostname.slice(4)
		trusted.add(url.origin)
		return
	}
	url.hostname = `www.${url.hostname}`
	trusted.add(url.origin)
}

function parseOrigin(value: string): string | null {
	try {
		return new URL(value).origin
	} catch {
		return null
	}
}

async function sha256Hex(value: string): Promise<string> {
	const data = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', data)
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

async function getQuizClientHash(c: {
	req: {
		header: (name: string) => string | undefined
	}
}): Promise<string> {
	const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
	const userAgent = c.req.header('user-agent') ?? ''
	return sha256Hex(`${ip}\n${userAgent}`)
}

async function getRecentQuizAttemptCount(
	db: D1Database,
	clientHash: string
): Promise<number | null> {
	try {
		const row = await db
			.prepare(
				`SELECT COUNT(*) AS count
				FROM quiz_stats
				WHERE client_hash = ? AND created_at >= datetime('now', '-1 hour')`
			)
			.bind(clientHash)
			.first<{ count: number }>()
		return row?.count ?? 0
	} catch {
		return null
	}
}

async function insertQuizStat(
	db: D1Database,
	mode: string,
	score: number,
	total: number,
	clientHash: string
): Promise<void> {
	try {
		await db
			.prepare(
				'INSERT INTO quiz_stats (mode, score, total, client_hash) VALUES (?, ?, ?, ?)'
			)
			.bind(mode, score, total, clientHash)
			.run()
	} catch {
		await db
			.prepare('INSERT INTO quiz_stats (mode, score, total) VALUES (?, ?, ?)')
			.bind(mode, score, total)
			.run()
	}
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

app.get('/postman.json', (c) =>
	c.json(postmanCollection, 200, {
		'Cache-Control': 'public, max-age=3600',
		'Content-Disposition':
			'attachment; filename="geocoded-postman-collection.json"'
	})
)

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
	const [countryInfo, stateInfo, cityInfo] = await Promise.all([
		countryCode ? getCountryById(db, countryCode) : null,
		countryCode && regionCode
			? getStateByIso2OrName(db, countryCode, regionCode)
			: null,
		countryCode && regionCode && cityName
			? getCityByName(db, countryCode, regionCode, cityName)
			: null
	])

	const location: Location = {
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

// --- Search ---

app.get('/search', async (c) => {
	const q = c.req.query('q')
	if (!q || q.trim().length === 0) {
		return c.json({ error: 'Query parameter "q" is required' }, 400)
	}
	const type = parseSearchType(c.req.query('type'))
	if (type === null) {
		return c.json(
			{ error: 'Query parameter "type" must be one of: country, state, city' },
			400
		)
	}
	const page = parsePagination(c)
	if (page instanceof Response) return page
	const { rows, total } = await search(
		c.env.GEO_DB,
		q,
		page.limit,
		page.offset,
		type
	)
	return jsonResponse(c, paginated(rows, total, page.limit, page.offset))
})

// --- Countries ---

app.get('/countries', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	if (page instanceof Response) return page
	const fields = c.req.query('fields')
	const q = c.req.query('q')?.trim()
	if (q) {
		const { rows, total } = await searchCountriesPaginated(
			db,
			q,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
	const { rows, total } = await getCountriesPaginated(
		db,
		page.limit,
		page.offset
	)
	return jsonResponse(
		c,
		paginated(pickFields(rows, fields), total, page.limit, page.offset)
	)
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
	if (page instanceof Response) return page
	const fields = c.req.query('fields')
	const q = c.req.query('q')?.trim()
	if (q) {
		const { rows, total } = await searchStatesPaginated(
			db,
			countryCode,
			q,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
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
	if (page instanceof Response) return page
	const fields = c.req.query('fields')
	const q = c.req.query('q')?.trim()
	if (q) {
		const { rows, total } = await searchCitiesPaginated(
			db,
			countryCode,
			stateCode,
			q,
			page.limit,
			page.offset
		)
		return jsonResponse(
			c,
			paginated(pickFields(rows, fields), total, page.limit, page.offset)
		)
	}
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
})

app.get('/countries/:country/states/:state/cities/:city', async (c) => {
	const db = c.env.GEO_DB
	const countryCode = c.req.param('country').toUpperCase()
	const stateCode = c.req.param('state').toUpperCase()
	const cityName = c.req.param('city')
	const cities = await getCityByNameMatches(
		db,
		countryCode,
		stateCode,
		cityName
	)
	if (cities.length === 0) return c.json({ error: 'City not found' }, 404)
	if (cities.length > 1) {
		return c.json({ error: 'City name is ambiguous', matches: cities }, 409)
	}
	return jsonResponse(c, pickFields(cities[0]!, c.req.query('fields')))
})

app.get('/cities/:geonameId', async (c) => {
	const id = c.req.param('geonameId')
	if (!/^\d+$/.test(id)) {
		return c.json({ error: 'City ID must be a GeoNames integer ID' }, 400)
	}
	const city = await getCityByGeonameId(c.env.GEO_DB, Number(id))
	if (!city) return c.json({ error: 'City not found' }, 404)
	return jsonResponse(c, pickFields(city, c.req.query('fields')))
})

// --- Timezones ---

app.get('/timezones', async (c) => {
	const db = c.env.GEO_DB
	const page = parsePagination(c)
	if (page instanceof Response) return page
	const fields = c.req.query('fields')
	const { rows, total } = await getTimezonesPaginated(
		db,
		page.limit,
		page.offset
	)
	return jsonResponse(
		c,
		paginated(pickFields(rows, fields), total, page.limit, page.offset)
	)
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
	if (page instanceof Response) return page
	const fields = c.req.query('fields')
	const { rows, total } = await getCurrenciesPaginated(
		db,
		page.limit,
		page.offset
	)
	return jsonResponse(
		c,
		paginated(pickFields(rows, fields), total, page.limit, page.offset)
	)
})

app.get('/currencies/:code', async (c) => {
	const db = c.env.GEO_DB
	const currency = await getCurrencyByCode(db, c.req.param('code'))
	if (!currency) return c.json({ error: 'Currency not found' }, 404)
	return jsonResponse(c, pickFields(currency, c.req.query('fields')))
})

// --- Quiz Stats ---

app.post('/quiz/stats', async (c) => {
	if (!isTrustedQuizOrigin(c.env, c.req.url, c.req.header('origin'))) {
		return c.json({ error: 'Forbidden origin' }, 403)
	}

	const db = c.env.GEO_DB
	let body: {
		mode: string
		score: number
		total?: number
	}
	try {
		body = await c.req.json<typeof body>()
	} catch {
		return c.json({ error: 'Invalid JSON body' }, 400)
	}
	const { mode, score, total = 10 } = body

	const validModes = ['capital', 'flag', 'population', 'geography', 'neighbour']
	if (
		!validModes.includes(mode) ||
		!Number.isInteger(score) ||
		!Number.isInteger(total) ||
		score < 0 ||
		score > total ||
		total < 1 ||
		total > 50
	) {
		return c.json({ error: 'Invalid input' }, 400)
	}

	const clientHash = await getQuizClientHash(c)
	const recentAttempts = await getRecentQuizAttemptCount(db, clientHash)
	if (recentAttempts !== null && recentAttempts >= QUIZ_RATE_LIMIT_PER_HOUR) {
		return c.json({ error: 'Rate limit exceeded' }, 429)
	}

	await insertQuizStat(db, mode, score, total, clientHash)

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

	const percentile =
		stats && stats.total_attempts > 0
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
