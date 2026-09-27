import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getSiteConfig } from './site-config'
import v1App from './v1'
import v2App from './v2'
import { v2Error, v2ErrorBody } from './v2/errors'
import { NO_STORE_CACHE_CONTROL } from './v2/http'

// RATE_LIMITER comes from `ratelimits` in wrangler.jsonc; optional so local runs and tests work without it.
type AppEnv = { Bindings: Env & { RATE_LIMITER?: RateLimit } }

const RATE_LIMIT_WINDOW_SECONDS = 60

// strict: false so `/v2/` and `/v2/countries/JP/` match the same routes as their slash-less forms.
const app = new Hono<AppEnv>({ strict: false })

app.use('*', cors())

// The website's own hosts only serve the static site; API routes such as /countries/:id would
// otherwise shadow site pages like /countries/jp. The API host and localhost fall through.
app.use('*', async (c, next) => {
	const siteHost = new URL(getSiteConfig(c.env, c.req.url).siteUrl).hostname
	const host = new URL(c.req.url).hostname.replace(/^www\./, '')
	if (host === siteHost.replace(/^www\./, ''))
		return c.env.ASSETS.fetch(c.req.raw)
	return await next()
})

app.use('*', async (c, next) => {
	const ip = c.req.header('cf-connecting-ip')
	const limiter = c.env.RATE_LIMITER
	if (!ip || !limiter) return await next()

	const { success } = await limiter.limit({ key: ip })
	if (success) return await next()

	return c.json(
		v2ErrorBody(
			v2Error('rate_limited', 'Too many requests. Please slow down.', {
				hint: `The limit is 1,000 requests per minute per IP. Retry after ${RATE_LIMIT_WINDOW_SECONDS} seconds.`
			})
		),
		429,
		{
			'Cache-Control': NO_STORE_CACHE_CONTROL,
			'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS)
		}
	)
})

app.route('/v2', v2App)
app.route('/', v1App)

app.all('*', async (c) => {
	const config = getSiteConfig(c.env, c.req.url)
	const apiHost = config.apiUrl ? new URL(config.apiUrl).hostname : null
	const host = new URL(c.req.url).hostname
	if (apiHost && host === apiHost) {
		return c.json({ error: 'Not found' }, 404)
	}
	return c.env.ASSETS.fetch(c.req.raw)
})

app.onError((error, c) => {
	console.error('Unhandled request error', error)
	return c.json(
		v2ErrorBody(
			v2Error(
				'internal_error',
				'Something went wrong on our side. Please try again later.'
			)
		),
		500,
		{ 'Cache-Control': NO_STORE_CACHE_CONTROL }
	)
})

export default app
