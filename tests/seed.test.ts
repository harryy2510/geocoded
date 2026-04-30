import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'bun:test'

describe('seed script safety', () => {
	test('wraps destructive refresh SQL in a transaction', async () => {
		const source = await readFile('scripts/seed.ts', 'utf-8')
		const begin = source.indexOf("sql.push('BEGIN TRANSACTION;')")
		const firstDelete = source.indexOf('DELETE FROM search_index;')
		const commit = source.indexOf("sql.push('COMMIT;')")

		expect(begin).toBeGreaterThanOrEqual(0)
		expect(firstDelete).toBeGreaterThan(begin)
		expect(commit).toBeGreaterThan(firstDelete)
	})

	test('exits non-zero when seeding fails', async () => {
		const source = await readFile('scripts/seed.ts', 'utf-8')

		expect(source).toContain('process.exitCode = 1')
	})
})
