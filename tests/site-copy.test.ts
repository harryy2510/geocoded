import { describe, expect, test } from 'bun:test'

describe('site copy and docs affordances', () => {
	test('mentions timezone and currency coverage on the homepage', async () => {
		const source = await Bun.file('apps/site/src/pages/index.astro').text()

		expect(source).toContain('timezones, currencies')
		expect(source).toContain("label: 'Timezones'")
		expect(source).toContain('No sign-up. No API key.')
	})

	test('ships a native API reference with a live Try it panel', async () => {
		const [page, reference, endpoints] = await Promise.all([
			Bun.file('apps/site/src/pages/docs.astro').text(),
			Bun.file('apps/site/src/components/docs/api-reference.tsx').text(),
			Bun.file('apps/site/src/components/docs/endpoints.ts').text()
		])

		expect(page).toContain('<ApiReference client:load />')
		expect(page).not.toContain('@scalar/api-reference')
		expect(reference).toContain('Try it')
		expect(reference).toContain("v2Url('/v2/openapi.json')")
		expect(reference).toContain("v2Url('/v2/postman.json')")
		expect(reference).toContain("id: 'quick-start'")
		for (const id of [
			'countries',
			'states',
			'cities',
			'airports',
			'ports',
			'statistics',
			'migration',
			'languages',
			'airlines'
		]) {
			expect(endpoints).toContain(`id: '${id}'`)
		}
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
