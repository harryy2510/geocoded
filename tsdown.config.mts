import { defineConfig } from 'tsdown'

// Builds every publishable package under packages/* to ESM + declarations in its dist/.
// Dependencies and peer dependencies stay external (tsdown's default).
export default defineConfig({
	attw: {
		level: 'error',
		profile: 'esm-only'
	},
	clean: true,
	// ponytail: tsgo also writes .d.ts files next to sibling package sources it compiles;
	// they are gitignored (packages/*/src/*.d.ts). Switch to generator 'oxc' once every
	// export has explicit types (isolatedDeclarations) to stop the stray output entirely.
	dts: true,
	entry: ['src/index.ts'],
	failOnWarn: true,
	format: 'esm',
	hash: false,
	platform: 'neutral',
	publint: {
		level: 'error'
	},
	sourcemap: false,
	suppressWarnings: [
		'TypeScript 7.0 does not yet have a stable API and is experimental. Some options will be unavailable.'
	],
	target: 'es2022',
	treeshake: true,
	workspace: 'packages/*'
})
