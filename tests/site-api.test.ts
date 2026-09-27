import { afterEach, describe, expect, test } from 'bun:test'
import { fetchCountries } from '../packages/client/src/index'
import { derivedStats, toV2Error } from '../apps/site/src/lib/v2'

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe('site API client', () => {
	test('gates local API overrides to dev builds for site requests', async () => {
		const apiUrlFile = Bun.file('apps/site/src/lib/api-url.ts')
		const apiUrlFileExists = await apiUrlFile.exists()
		expect(apiUrlFileExists).toBe(true)
		if (!apiUrlFileExists) return

		const [apiUrlSource, indexSource, layoutSource, v2Source] =
			await Promise.all([
				apiUrlFile.text(),
				Bun.file('apps/site/src/pages/index.astro').text(),
				Bun.file('apps/site/src/layouts/Layout.astro').text(),
				Bun.file('apps/site/src/lib/v2.ts').text()
			])

		expect(apiUrlSource).toContain(
			"DEFAULT_API_URL = 'https://api.geocoded.me'"
		)
		expect(apiUrlSource).toContain('import.meta.env.DEV')
		expect(apiUrlSource).toContain('import.meta.env.PUBLIC_API_URL')
		expect(indexSource).toContain(
			"import { SITE_API_URL } from '../lib/api-url'"
		)
		expect(layoutSource).toContain(
			"import { SITE_API_URL } from '../lib/api-url'"
		)
		expect(v2Source).toContain("import { SITE_API_URL } from './api-url'")
		expect([indexSource, layoutSource, v2Source].join('\n')).not.toContain(
			'import.meta.env.PUBLIC_API_URL ||'
		)
	})

	test('reads the v2 error envelope', async () => {
		const response = new Response(
			JSON.stringify({
				error: {
					code: 'not_found',
					message: 'Country not found',
					hint: 'Use an ISO code'
				}
			}),
			{ status: 404 }
		)
		const error = await toV2Error(response)
		expect(error.status).toBe(404)
		expect(error.code).toBe('not_found')
		expect(error.message).toBe('Country not found')
		expect(error.hint).toBe('Use an ISO code')

		const plain = await toV2Error(
			new Response('oops', { status: 502, statusText: 'Bad Gateway' })
		)
		expect(plain.code).toBeNull()
		expect(plain.message).toBe('API error: 502 Bad Gateway')
	})

	test('derives age and gender ratios when the API omits them', () => {
		const metric = (value: number) => ({
			code: 'x',
			name: 'x',
			year: 2024,
			value
		})
		const derived = derivedStats({
			countryCode: 'JP',
			countryName: 'Japan',
			iso3: 'JPN',
			age0To14Percent: metric(11.2),
			age15To64Percent: metric(58.8),
			age65PlusPercent: metric(30),
			populationMale: metric(60),
			populationFemale: metric(63)
		})
		expect(derived.dependencyRatio).toBeCloseTo(70.07, 1)
		expect(derived.ageingIndex).toBeCloseTo(267.86, 1)
		expect(derived.sexRatio).toBeCloseTo(95.24, 1)

		const served = derivedStats({
			countryCode: 'JP',
			countryName: 'Japan',
			iso3: 'JPN',
			ageingIndex: metric(300)
		})
		expect(served.ageingIndex).toBe(300)
		expect(served.dependencyRatio).toBeNull()
	})

	test('unwraps paginated country responses and requests the full country list', async () => {
		let requestedUrl: string | null = null
		globalThis.fetch = ((input: Parameters<typeof fetch>[0]) => {
			requestedUrl = String(input)
			return Promise.resolve(
				new Response(
					JSON.stringify({
						data: [{ name: 'United States', iso2: 'US' }],
						meta: {
							total: 1,
							limit: 2000,
							offset: 0,
							hasMore: false,
							cursor: null
						}
					}),
					{ status: 200 }
				)
			)
		}) as typeof fetch

		const countries = await fetchCountries()

		expect(String(requestedUrl)).toBe(
			'https://api.geocoded.me/countries?limit=2000'
		)
		expect(
			countries.map((country) => ({ name: country.name, iso2: country.iso2 }))
		).toEqual([{ name: 'United States', iso2: 'US' }])
	})
})
