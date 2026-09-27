import { describe, expect, test } from 'bun:test'
import { v2OpenApiSpec } from '../apps/api/src/v2/openapi'
import { endpointsFromOpenApi } from '../apps/site/src/components/docs/openapi-endpoints'

describe('site copy and docs affordances', () => {
	test('mentions timezone and currency coverage on the homepage', async () => {
		const source = await Bun.file('apps/site/src/pages/index.astro').text()

		expect(source).toContain('timezones, currencies')
		expect(source).toContain("label: 'Timezones'")
		expect(source).toContain('No sign-up. No API key.')
	})

	test('builds the API reference from the OpenAPI spec, covering every endpoint', async () => {
		const page = await Bun.file('apps/site/src/pages/docs.astro').text()
		expect(page).toContain('endpointsFromOpenApi(')
		expect(page).toContain('v2OpenApiSpec(')

		const spec = v2OpenApiSpec({
			siteName: 'Geocoded',
			siteUrl: 'https://geocoded.me',
			apiUrl: 'https://api.geocoded.me',
			githubUrl: 'https://github.com/harryy2510/geocoded'
		})
		const endpoints = endpointsFromOpenApi(spec)
		expect(endpoints.map((endpoint) => endpoint.path).sort()).toEqual(
			Object.keys(spec.paths).sort()
		)
		const undocumented = endpoints.flatMap((endpoint) =>
			endpoint.params
				.filter((param) => !param.desc)
				.map((param) => `${endpoint.path} ${param.name}`)
		)
		expect(undocumented).toEqual([])
		const cities = endpoints.find((endpoint) => endpoint.path === '/v2/cities')
		expect(cities?.params.map((param) => param.name)).toEqual(
			expect.arrayContaining(['filter[country]', 'near', 'radius', 'cursor'])
		)

		const reference = await Bun.file(
			'apps/site/src/components/docs/api-reference.tsx'
		).text()
		expect(reference).toContain("v2Url('/v2/openapi.json')")
		expect(reference).toContain("v2Url('/v2/postman.json')")
	})

	test('retired pages redirect to their replacements', async () => {
		const config = await Bun.file('apps/site/astro.config.ts').text()

		expect(config).toContain("'/explorer': '/explore'")
		expect(config).toContain("'/dashboard': '/insights'")
		expect(config).toContain("'/statistics': '/insights'")
		expect(await Bun.file('apps/site/src/pages/quiz.astro').exists()).toBe(
			false
		)
	})
})
