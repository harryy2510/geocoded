import { describe, expect, test } from 'bun:test'
import {
	DEFAULT_PAGE_LIMIT,
	QueryCache,
	filterOptions,
	nextPageRequest,
	pageFromArray,
	resolvePageRequest,
	toPickerOption
} from 'picker-core'

describe('picker-core', () => {
	test('defaults pagination to 100', () => {
		expect(resolvePageRequest().limit).toBe(DEFAULT_PAGE_LIMIT)
	})

	test('pages arrays with cursors', () => {
		const page = pageFromArray([1, 2, 3], { limit: 2 })

		expect(page.data).toEqual([1, 2])
		expect(page.meta.hasMore).toBe(true)
		expect(page.meta.cursor).toBe('Mg')
		expect(nextPageRequest(page.meta)).toEqual({
			limit: 2,
			cursor: 'Mg'
		})
	})

	test('filters options accent-insensitively', () => {
		const rows = [{ name: 'Sao Paulo' }, { name: 'Zurich' }]

		expect(
			filterOptions(rows, 'São', { getOptionLabel: (row) => row.name })
		).toEqual([{ name: 'Sao Paulo' }])
	})

	test('normalizes options from common object shapes', () => {
		expect(toPickerOption({ code: 'USD', name: 'US Dollar' })).toEqual({
			value: 'USD',
			label: 'US Dollar',
			keywords: undefined,
			meta: { code: 'USD', name: 'US Dollar' }
		})
	})

	test('dedupes in-flight cache fetches', async () => {
		const cache = new QueryCache()
		let calls = 0
		const fetcher = async () => {
			calls += 1
			return ['US']
		}

		const [first, second] = await Promise.all([
			cache.fetch('countries', fetcher),
			cache.fetch('countries', fetcher)
		])

		expect(first).toEqual(['US'])
		expect(second).toEqual(['US'])
		expect(calls).toBe(1)
	})
})
