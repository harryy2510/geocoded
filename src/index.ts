import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { docsHtml, scalarHtml } from './docs'
import logo from './logo.png'
import { openApiSpec } from './openapi'
import type { City, Country, Location, State } from './types'

const app = new Hono<{ Bindings: Env }>()

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
} as const

function json<T>(
	c: {
		json: (
			data: T,
			status?: number,
			headers?: Record<string, string>,
		) => Response
	},
	data: T,
	status = 200,
) {
	return c.json(data, status, CACHE_HEADERS)
}

app.use('*', cors())

function pickFields<T extends Record<string, unknown>>(
	data: T[],
	fields: string | undefined,
): Partial<T>[]
function pickFields<T extends Record<string, unknown>>(
	data: T,
	fields: string | undefined,
): Partial<T>
function pickFields<T extends Record<string, unknown>>(
	data: T | T[],
	fields: string | undefined,
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

// --- Static Assets ---

app.get('/logo.png', (c) => {
	return c.body(logo, 200, {
		...CACHE_HEADERS,
		'Content-Type': 'image/png',
	})
})

// --- Docs (Scalar) ---

app.get('/openapi.json', (c) => {
	return c.json(openApiSpec)
})

app.get('/docs', (c) => {
	return c.html(scalarHtml)
})

app.get('/', async (c) => {
	const host = new URL(c.req.url).hostname
	if (host !== 'api.geocoded.me') return c.html(docsHtml)

	const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined
	const countryCode = cf?.country
	const regionCode = cf?.regionCode
	const cityName = cf?.city

	const kv = c.env.GEO_KV
	const [countries, states, cities] = await Promise.all([
		countryCode ? kv.get<Country[]>('countries', 'json') : null,
		countryCode && regionCode
			? kv.get<State[]>(`states:${countryCode}`, 'json')
			: null,
		countryCode && regionCode
			? kv.get<City[]>(`cities:${countryCode}:${regionCode}`, 'json')
			: null,
	])

	const countryInfo = countries?.find((co) => co.iso2 === countryCode)
	const stateInfo = states?.find((s) => s.iso2 === regionCode)
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
		countryInfo,
		ip: c.req.header('cf-connecting-ip') ?? '',
		isEU: cf?.isEU === '1' ? true : cf?.isEU === '0' ? false : undefined,
		latitude: cf?.latitude,
		longitude: cf?.longitude,
		postalCode: cf?.postalCode,
		region: cf?.region,
		regionCode,
		stateInfo,
		timezone: cf?.timezone,
	}
	return c.json(pickFields(location, c.req.query('fields')), 200, {
		'Cache-Control': 'private, no-store',
	})
})

// --- Countries ---

app.get('/countries', async (c) => {
	const countries = await c.env.GEO_KV.get<Country[]>('countries', 'json')
	if (!countries) return c.json({ error: 'Countries not found' }, 404)
	return json(c, pickFields(countries, c.req.query('fields')))
})

app.get('/countries/:id', async (c) => {
	const id = c.req.param('id')
	const countries = await c.env.GEO_KV.get<Country[]>('countries', 'json')
	if (!countries) return c.json({ error: 'Countries not found' }, 404)

	const upper = id.toUpperCase()
	const lower = id.toLowerCase()
	const country = countries.find(
		(co) =>
			co.iso2 === upper || co.iso3 === upper || co.name.toLowerCase() === lower,
	)

	if (!country) return c.json({ error: 'Country not found' }, 404)
	return json(c, pickFields(country, c.req.query('fields')))
})

// --- States ---

app.get('/countries/:country/states', async (c) => {
	const countryCode = c.req.param('country').toUpperCase()
	const states = await c.env.GEO_KV.get<State[]>(
		`states:${countryCode}`,
		'json',
	)
	if (!states) return c.json({ error: 'States not found' }, 404)
	return json(c, pickFields(states, c.req.query('fields')))
})

app.get('/countries/:country/states/:state', async (c) => {
	const countryCode = c.req.param('country').toUpperCase()
	const stateId = c.req.param('state')
	const states = await c.env.GEO_KV.get<State[]>(
		`states:${countryCode}`,
		'json',
	)
	if (!states) return c.json({ error: 'States not found' }, 404)

	const upper = stateId.toUpperCase()
	const lower = stateId.toLowerCase()
	const state = states.find(
		(s) => s.iso2 === upper || s.name.toLowerCase() === lower,
	)

	if (!state) return c.json({ error: 'State not found' }, 404)
	return json(c, pickFields(state, c.req.query('fields')))
})

// --- Cities ---

app.get('/countries/:country/states/:state/cities', async (c) => {
	const countryCode = c.req.param('country').toUpperCase()
	const stateCode = c.req.param('state').toUpperCase()
	const cities = await c.env.GEO_KV.get<City[]>(
		`cities:${countryCode}:${stateCode}`,
		'json',
	)
	if (!cities) return c.json({ error: 'Cities not found' }, 404)
	return json(c, pickFields(cities, c.req.query('fields')))
})

app.get('/countries/:country/states/:state/cities/:city', async (c) => {
	const countryCode = c.req.param('country').toUpperCase()
	const stateCode = c.req.param('state').toUpperCase()
	const cityName = c.req.param('city')
	const cities = await c.env.GEO_KV.get<City[]>(
		`cities:${countryCode}:${stateCode}`,
		'json',
	)
	if (!cities) return c.json({ error: 'Cities not found' }, 404)

	const lower = cityName.toLowerCase()
	const city = cities.find((ci) => ci.name.toLowerCase() === lower)

	if (!city) return c.json({ error: 'City not found' }, 404)
	return json(c, pickFields(city, c.req.query('fields')))
})

export default app
