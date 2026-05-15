import { describe, expect, test } from 'bun:test'

describe('seed script safety', () => {
	test('wraps destructive refresh SQL in a transaction', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()
		const begin = source.indexOf(
			"if (!isRemote) sql.push('BEGIN TRANSACTION;')"
		)
		const firstDelete = source.indexOf('DELETE FROM search_index;')
		const commit = source.indexOf("if (!isRemote) sql.push('COMMIT;')")

		expect(begin).toBeGreaterThanOrEqual(0)
		expect(firstDelete).toBeGreaterThan(begin)
		expect(commit).toBeGreaterThan(firstDelete)
	})

	test('does not send SQL transaction statements to remote D1 execute', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).not.toContain("\n\tsql.push('BEGIN TRANSACTION;')")
		expect(source).not.toContain("\n\tsql.push('COMMIT;')")
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

	test('runs wrangler through Bun instead of bunx', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain("'bun', '--bun', 'wrangler'")
		expect(source).toContain('cwd: API_DIR')
		expect(source).not.toContain('bunx')
	})

	test('executes the generated SQL file with explicit wrangler confirmation', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('`--file=${SQL_FILE}`')
		expect(source).toContain('target,')
		expect(source).toContain("'--yes'")
	})

	test('cleans up the generated seed SQL file after execution', async () => {
		const source = await Bun.file('apps/api/scripts/seed.ts').text()

		expect(source).toContain('.finally(() =>')
		expect(source).toContain('Bun.file(SQL_FILE)')
		expect(source).toContain('.delete()')
	})
})
