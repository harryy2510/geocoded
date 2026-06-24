import { afterEach, describe, expect, test } from 'bun:test'
import { fetchCountries } from '../packages/client/src/index'

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

		const [
			apiUrlSource,
			indexSource,
			docsSource,
			v2Source,
			explorerApiSource,
			statisticsSource
		] = await Promise.all([
			apiUrlFile.text(),
			Bun.file('apps/site/src/pages/index.astro').text(),
			Bun.file('apps/site/src/pages/docs.astro').text(),
			Bun.file('apps/site/src/lib/v2.ts').text(),
			Bun.file('apps/site/src/components/explorer/api.ts').text(),
			Bun.file('apps/site/src/components/Statistics.tsx').text()
		])

		expect(apiUrlSource).toContain(
			"DEFAULT_API_URL = 'https://api.geocoded.me'"
		)
		expect(apiUrlSource).toContain('import.meta.env.DEV')
		expect(apiUrlSource).toContain('import.meta.env.PUBLIC_API_URL')
		expect(indexSource).toContain(
			"import { SITE_API_URL } from '../lib/api-url'"
		)
		expect(docsSource).toContain(
			"import { SITE_API_URL } from '../lib/api-url'"
		)
		expect(v2Source).toContain("import { SITE_API_URL } from './api-url'")
		expect(explorerApiSource).toContain(
			"import { SITE_API_URL } from '../../lib/api-url'"
		)
		expect(
			[indexSource, docsSource, v2Source, explorerApiSource].join('\n')
		).not.toContain('import.meta.env.PUBLIC_API_URL ||')
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
