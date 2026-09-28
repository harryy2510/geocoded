import { describe, expect, test } from 'bun:test'
import { v2OpenApiSpec } from '../apps/api/src/v2/openapi'
import {
	endpointsFromOpenApi,
	resolveDocsAnchor
} from '../apps/site/src/components/docs/openapi-endpoints'

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

		// Every /docs#anchor linked from the site lands on a real section.
		const guides = [
			'introduction',
			'quick-start',
			'filtering',
			'fields',
			'pagination',
			'errors'
		]
		const anchors = new Set<string>()
		for (const path of new Bun.Glob(
			'apps/site/src/**/*.{astro,tsx,ts}'
		).scanSync()) {
			const source = await Bun.file(path).text()
			for (const match of source.matchAll(/\/docs#([a-z0-9-]+)/g))
				anchors.add(match[1] ?? '')
			for (const match of source.matchAll(
				/anchor(?::|=) ?['"]([a-z0-9-]+)['"]/g
			))
				anchors.add(match[1] ?? '')
		}
		const broken = [...anchors].filter(
			(anchor) =>
				!guides.includes(anchor) &&
				resolveDocsAnchor(endpoints, anchor) === null
		)
		expect(anchors.size).toBeGreaterThan(5)
		expect(broken).toEqual([])

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
