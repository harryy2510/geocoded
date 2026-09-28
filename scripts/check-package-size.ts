type Budget = {
	name: string
	entry: string
	maxGzipBytes: number
	external?: string[]
}

const workspacePackages = [
	'@geocoded/client',
	'currency-code-formatters',
	'phone-number-formatters',
	'picker-core',
	'react-country-region-picker',
	'react-country-state-city-picker',
	'react-currency-code-picker',
	'react-native-country-region-picker',
	'react-native-currency-code-picker',
	'react-native-phone-number-field',
	'react-native-picker-core',
	'react-native-iana-timezone-picker',
	'react-phone-number-field',
	'react-picker-core',
	'react-iana-timezone-picker',
	'use-timezones'
]

const platformExternal = [
	'react',
	'react-dom',
	'react-native',
	'@floating-ui/react-dom',
	'downshift',
	'libphonenumber-js',
	'libphonenumber-js/min',
	'ofetch'
]

const budgets: Budget[] = [
	{
		name: '@geocoded/client',
		entry: 'packages/client/src/index.ts',
		maxGzipBytes: 2500
	},
	{
		name: 'picker-core',
		entry: 'packages/picker-core/src/index.ts',
		maxGzipBytes: 3500
	},
	{
		name: 'react-picker-core',
		entry: 'packages/react-picker-core/src/index.ts',
		maxGzipBytes: 4500
	},
	{
		name: 'react-native-picker-core',
		entry: 'packages/react-native-picker-core/src/index.ts',
		maxGzipBytes: 3500
	},
	{
		name: 'use-timezones',
		entry: 'packages/use-timezones/src/index.ts',
		maxGzipBytes: 2000
	},
	{
		name: 'currency-code-formatters',
		entry: 'packages/currency-code-formatters/src/index.ts',
		maxGzipBytes: 1800
	},
	{
		name: 'phone-number-formatters',
		entry: 'packages/phone-number-formatters/src/index.ts',
		maxGzipBytes: 2500
	},
	{
		name: 'react-iana-timezone-picker',
		entry: 'packages/react-iana-timezone-picker/src/index.ts',
		maxGzipBytes: 1400
	},
	{
		name: 'react-native-iana-timezone-picker',
		entry: 'packages/react-native-iana-timezone-picker/src/index.ts',
		maxGzipBytes: 1400
	},
	{
		name: 'react-currency-code-picker',
		entry: 'packages/react-currency-code-picker/src/index.ts',
		maxGzipBytes: 2000
	},
	{
		name: 'react-native-currency-code-picker',
		entry: 'packages/react-native-currency-code-picker/src/index.ts',
		maxGzipBytes: 2000
	},
	{
		name: 'react-phone-number-field',
		entry: 'packages/react-phone-number-field/src/index.ts',
		maxGzipBytes: 2500
	},
	{
		name: 'react-native-phone-number-field',
		entry: 'packages/react-native-phone-number-field/src/index.ts',
		maxGzipBytes: 2500
	},
	{
		name: 'react-country-region-picker',
		entry: 'packages/react-country-region-picker/src/index.ts',
		maxGzipBytes: 3000
	},
	{
		name: 'react-native-country-region-picker',
		entry: 'packages/react-native-country-region-picker/src/index.ts',
		maxGzipBytes: 3000
	},
	{
		name: 'react-country-state-city-picker',
		entry: 'packages/react-country-state-city-picker/src/index.ts',
		maxGzipBytes: 600
	}
]

let failed = false

for (const budget of budgets) {
	const compressed = await bundledGzipSize(budget)
	const status = compressed <= budget.maxGzipBytes ? 'ok' : 'too large'
	console.log(
		`${budget.name}: ${compressed} B gzip / ${budget.maxGzipBytes} B (${status})`
	)
	if (compressed > budget.maxGzipBytes) failed = true
}

if (failed) process.exitCode = 1

async function bundledGzipSize(budget: Budget): Promise<number> {
	const external = [
		...platformExternal,
		...workspacePackages.filter((name) => name !== budget.name),
		...(budget.external ?? [])
	]
	const build = await Bun.build({
		entrypoints: [budget.entry],
		external,
		format: 'esm',
		minify: true,
		target: 'browser'
	})
	if (!build.success) {
		for (const log of build.logs) console.error(log)
		throw new Error(`Failed to bundle ${budget.name}`)
	}
	const output = build.outputs[0]
	if (!output) throw new Error(`No bundle output for ${budget.name}`)
	return await gzipSize(await output.text())
}

async function gzipSize(input: string): Promise<number> {
	const stream = new Blob([input])
		.stream()
		.pipeThrough(new CompressionStream('gzip'))
	const buffer = await new Response(stream).arrayBuffer()
	return buffer.byteLength
}

export {}
