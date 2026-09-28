const API_URL = process.env.API_URL ?? 'https://api.geocoded.me'
const SITE_URL = process.env.SITE_URL ?? 'https://geocoded.me'
const ATTEMPTS = 12
const DELAY_MS = 5000

const cacheBust = encodeURIComponent(
	process.env.GITHUB_SHA ?? String(Date.now())
)

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function fetchOk(url: string): Promise<Response> {
	const response = await fetch(url, {
		headers: { 'Cache-Control': 'no-cache' }
	})
	if (!response.ok) {
		throw new Error(`${url} -> ${response.status}`)
	}
	return response
}

async function fetchJson(url: string): Promise<unknown> {
	return (await fetchOk(url)).json()
}

function assertListPayload(body: unknown, label: string): void {
	if (!isRecord(body) || !Array.isArray(body.data) || body.data.length !== 1) {
		throw new Error(`${label} did not return one row`)
	}
}

async function verify(): Promise<void> {
	// The OpenAPI routes ignore query params, so they can be cache-busted to prove this
	// commit's Worker is live. v2 data routes reject unknown params, so they get none.
	const spec = await fetchJson(
		`${API_URL}/v2/openapi.json?deploy_check=${cacheBust}`
	)
	if (!isRecord(spec) || !isRecord(spec.paths)) {
		throw new Error('OpenAPI spec is missing paths')
	}
	for (const path of ['/v2/search', '/v2/reverse', '/v2/meta']) {
		if (!(path in spec.paths)) {
			throw new Error(
				`Live OpenAPI spec has no ${path}; old Worker still serving`
			)
		}
	}

	assertListPayload(
		await fetchJson(`${API_URL}/v2/countries?limit=1`),
		'Countries'
	)
	assertListPayload(
		await fetchJson(`${API_URL}/v2/timezones?limit=1`),
		'Timezones'
	)
	assertListPayload(
		await fetchJson(`${API_URL}/v2/search?q=tokyo&limit=1`),
		'Search'
	)
	await fetchOk(`${API_URL}/v2/meta`)

	await fetchOk(`${SITE_URL}/?deploy_check=${cacheBust}`)
}

let lastError: unknown
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
	try {
		await verify()
		console.log(`Deploy verified on attempt ${attempt}`)
		process.exit(0)
	} catch (error) {
		lastError = error
		console.error(`Attempt ${attempt}/${ATTEMPTS} failed:`, error)
		await Bun.sleep(DELAY_MS)
	}
}

throw lastError

export {}
