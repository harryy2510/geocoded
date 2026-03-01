import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { City, Country, State } from './types'

type Bindings = {
	GEO_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

const CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
} as const

function json<T>(c: { json: (data: T, status?: number, headers?: Record<string, string>) => Response }, data: T, status = 200) {
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
		const result: Partial<T> = {}
		for (const key of keys) {
			if (key in obj) {
				result[key as keyof T] = obj[key as keyof T]
			}
		}
		return result
	}
	return Array.isArray(data) ? data.map(pick) : pick(data)
}

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
			co.iso2 === upper ||
			co.iso3 === upper ||
			co.name.toLowerCase() === lower,
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
