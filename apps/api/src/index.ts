import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getSiteConfig } from './site-config'
import v1App from './v1'
import v2App from './v2'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

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

export default app
