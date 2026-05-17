import { describe, expect, test } from 'bun:test'

describe('seed script safety', () => {
	test('does not wipe live tables before loading source data', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).not.toContain("DELETE FROM search_index;'")
		expect(source).not.toContain('DELETE FROM search_index;')
		expect(source).not.toContain('DELETE FROM cities;')
		expect(source).not.toContain('DELETE FROM states;')
		expect(source).not.toContain('DELETE FROM countries;')
		expect(source).not.toContain('DELETE FROM timezones;')
		expect(source).not.toContain('DELETE FROM currencies;')
	})

	test('uses D1 metadata hashes for incremental publishing', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('source_hash')
		expect(source).toContain('seed_files')
		expect(source).toContain('readSeedFileHashes')
		expect(source).toContain('readExistingHashes')
		expect(source).toContain('hashValues')
	})

	test('uses idempotent upserts instead of insert-only refreshes', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('ON CONFLICT')
		expect(source).toContain('DO UPDATE SET')
		expect(source).toContain('appendSearchRefresh')
		expect(source).toContain('deleteSearchSql(newEntry)')
	})

	test('exits non-zero when seeding fails', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('process.exitCode = 1')
	})

	test('uses Bun file APIs instead of Node fs imports', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('Bun.file(')
		expect(source).toContain('Bun.write(')
		expect(source).not.toContain("from 'node:")
		expect(source).not.toContain('node:')
	})

	test('runs wrangler through Bun without forcing the Bun runtime', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain("'bun', 'wrangler'")
		expect(source).not.toContain("'bun', '--bun', 'wrangler'")
		expect(source).toContain('cwd: API_DIR')
		expect(source).not.toContain('bunx')
	})

	test('executes the generated SQL file with explicit wrangler confirmation', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('`--file=${SQL_FILE}`')
		expect(source).toContain('target,')
		expect(source).toContain("'--yes'")
	})

	test('keeps transaction statements local-only', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('if (!isRemote) {')
		expect(source).toContain("sql.unshift('BEGIN TRANSACTION;')")
		expect(source).toContain("sql.push('COMMIT;')")
	})

	test('cleans up the generated seed SQL file after execution', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('.finally(() =>')
		expect(source).toContain('Bun.file(SQL_FILE)')
		expect(source).toContain('.delete()')
	})
})
