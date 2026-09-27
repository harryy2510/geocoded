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
	const spec = await fetchJson(
		`${API_URL}/openapi.json?deploy_check=${cacheBust}`
	)
	if (!isRecord(spec) || !isRecord(spec.paths)) {
		throw new Error('OpenAPI spec is missing paths')
	}

	assertListPayload(
		await fetchJson(
			`${API_URL}/v2/countries?limit=1&deploy_check=${cacheBust}`
		),
		'Countries'
	)
	assertListPayload(
		await fetchJson(
			`${API_URL}/v2/timezones?limit=1&deploy_check=${cacheBust}`
		),
		'Timezones'
	)
	// Endpoints added with the geo/search release; they 404 on an older Worker.
	assertListPayload(
		await fetchJson(
			`${API_URL}/v2/search?q=tokyo&limit=1&deploy_check=${cacheBust}`
		),
		'Search'
	)
	await fetchOk(`${API_URL}/v2/meta?deploy_check=${cacheBust}`)

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
