import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Resend } from 'resend'

import { openApiSpec } from './openapi'
import { registerHtml } from './register'
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

// --- API Key Middleware ---

app.use('*', async (c, next) => {
	if (
		c.req.path === '/' ||
		c.req.path === '/register' ||
		c.req.path === '/openapi.json'
	)
		return next()

	const referer = c.req.header('referer')
	if (referer?.startsWith('https://geo.harryy.me')) return next()

	const auth = c.req.header('authorization')
	const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
	if (!token) return c.json({ error: 'Invalid or missing API key' }, 401)

	const valid = await c.env.GEO_KV.get(`apikey:${token}`)
	if (valid === null)
		return c.json({ error: 'Invalid or missing API key' }, 401)

	return next()
})

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

// --- Docs (Scalar) ---

app.get('/openapi.json', (c) => {
	return c.json(openApiSpec)
})

app.get(
	'/',
	Scalar({
		url: '/openapi.json',
		theme: 'saturn',
	}),
)

// --- Registration ---

app.get('/register', (c) => {
	return c.html(registerHtml)
})

app.post('/register', async (c) => {
	const body = await c.req.json<{ email?: string; name?: string }>()
	const name = body.name?.trim()
	const email = body.email?.trim().toLowerCase()

	if (!name || !email) {
		return c.json({ error: 'Name and email are required' }, 400)
	}

	const kv = c.env.GEO_KV
	let apiKey = await kv.get(`email:${email}`)

	if (!apiKey) {
		apiKey = crypto.randomUUID()
		await Promise.all([
			kv.put(
				`apikey:${apiKey}`,
				JSON.stringify({ createdAt: new Date().toISOString(), email, name }),
			),
			kv.put(`email:${email}`, apiKey),
		])
	}

	try {
		const resend = new Resend(c.env.RESEND_API_KEY)
		await resend.emails.send({
			from: 'Geo API <geo@harryy.me>',
			subject: 'Your Geo API Key',
			to: email,
			text: [
				`Hi ${name},`,
				'',
				'Here is your Geo API key:',
				'',
				apiKey,
				'',
				'Include it in your requests as:',
				`Authorization: Bearer ${apiKey}`,
				'',
				'Docs: https://geo.harryy.me',
				'',
				'— Geo API',
			].join('\n'),
		})
	} catch {
		return c.json({ error: 'Failed to send email. Please try again.' }, 500)
	}

	return c.json({ message: 'API key sent to your email', success: true })
})

// --- Location ---

app.get('/location', (c) => {
	const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined
	const location: Location = {
		asn: cf?.asn as number | undefined,
		asOrganization: cf?.asOrganization,
		city: cf?.city,
		colo: cf?.colo,
		continent: cf?.continent,
		country: cf?.country,
		ip: c.req.header('cf-connecting-ip') ?? '',
		isEU: cf?.isEU === '1' ? true : cf?.isEU === '0' ? false : undefined,
		latitude: cf?.latitude,
		longitude: cf?.longitude,
		postalCode: cf?.postalCode,
		region: cf?.region,
		regionCode: cf?.regionCode,
		timezone: cf?.timezone,
	}
	return json(c, pickFields(location, c.req.query('fields')))
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
