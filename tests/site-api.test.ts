import { afterEach, describe, expect, test } from 'bun:test'
import { fetchCountries } from '../packages/client/src/index'

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

describe('site API client', () => {
	test('uses production API fallbacks for hydrated site requests', async () => {
		const [v2Source, explorerApiSource, statisticsSource] = await Promise.all([
			Bun.file('apps/site/src/lib/v2.ts').text(),
			Bun.file('apps/site/src/components/explorer/api.ts').text(),
			Bun.file('apps/site/src/components/Statistics.tsx').text()
		])

		expect(v2Source).toContain(
			"import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me'"
		)
		expect(explorerApiSource).toContain(
			"import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me'"
		)
		expect(statisticsSource).not.toContain('Make sure the local API is running')
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
