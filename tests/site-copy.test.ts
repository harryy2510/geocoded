import { describe, expect, test } from 'bun:test'

describe('site copy and docs affordances', () => {
	test('mentions timezone and currency coverage on the homepage', async () => {
		const source = await Bun.file('apps/site/src/pages/index.astro').text()

		expect(source).toContain('timezones, currencies')
		expect(source).toContain('timezone, currency, and statistics data')
		expect(source).toContain("label: 'Timezones'")
	})

	test('renders in-document docs download links and hides Scalar downloads', async () => {
		const source = await Bun.file('apps/site/src/pages/docs.astro').text()

		expect(source).toContain('<style is:global>')
		expect(source).toContain('data-docs-root')
		expect(source).toContain(
			'data-docs-versions={JSON.stringify(docsVersions)}'
		)
		expect(source).toContain('data-docs-version')
		expect(source).toContain('data-openapi-download')
		expect(source).toContain('data-postman-download')
		expect(source).toContain('window.mountGeocodedDocsReference')
		expect(source).toContain('window.Scalar.createApiReference(root')
		expect(source).toContain(
			'is:inline src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"'
		)
		expect(source).toContain('onload="window.mountGeocodedDocsReference?.()"')
		expect(source).toContain('.markdown a.geocoded-docs-link')
		expect(source).toContain(
			'.geocoded-docs-link > span:not(.geocoded-docs-badge)'
		)
		expect(source).toContain('text-decoration: none !important')
		expect(source).toContain('.geocoded-docs-link-primary {')
		expect(source).toContain("documentDownloadType: 'none'")
		expect(source).toContain('agent: { disabled: true }')
		expect(source).toContain('url: version.openApiUrl')
		expect(source).toContain('activeVersionId = versionSelect.value')
		expect(source).toContain('root.replaceChildren()')
		expect(source).toContain('body:has([data-docs-root]) nav')
		expect(source).toContain(
			'body:has([data-docs-root]) > .scalar-app [role="dialog"]'
		)
		expect(source).toContain('.docs-reference-frame')
		expect(source).toContain(
			'.tag-section-container > .section:has(.endpoints-card)'
		)
		expect(source).toContain('Download OpenAPI JSON')
		expect(source).toContain('Download Postman Collection')
		expect(source).toContain("id: 'v2'")
		expect(source).toContain('`${apiUrl}/v2/openapi.json`')
		expect(source).toContain('`${apiUrl}/v2/postman.json`')
		expect(source).toContain("id: 'v1'")
		expect(source).toContain('`${apiUrl}/openapi.json`')
		expect(source).toContain('`${apiUrl}/postman.json`')
		expect(source).not.toContain('id="api-reference"')
		expect(source).not.toContain('define:vars')
		expect(source).not.toContain('position: fixed')
		expect(source).not.toContain('sources: [')
	})
})
