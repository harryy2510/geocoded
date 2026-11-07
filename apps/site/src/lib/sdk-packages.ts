// Reads every workspace package manifest at build time, so the site lists each published SDK
// without a hand-kept copy that drifts from packages/*.

type Manifest = {
	name: string
	version: string
	description?: string
	homepage?: string
	private?: boolean
}

type SdkPackage = {
	name: string
	version: string
	description: string
	npmUrl: string
	sourceUrl?: string
}

type SdkGroup = {
	id: string
	title: string
	desc: string
	packages: SdkPackage[]
}

// First matching group wins, so React Native is tested before React.
const GROUPS = [
	{
		id: 'client',
		title: 'API client',
		desc: 'Typed requests for every endpoint from browsers, Node, Bun and Workers.',
		test: (name: string) => name.startsWith('@geocoded/')
	},
	{
		id: 'react',
		title: 'React',
		desc: 'Ready-made pickers and fields with search, paging and controlled or uncontrolled use.',
		test: (name: string) => name.startsWith('react-') && !name.startsWith('react-native-')
	},
	{
		id: 'react-native',
		title: 'React Native',
		desc: 'Headless hooks with the same behavior, so any UI kit can render the controls.',
		test: (name: string) => name.startsWith('react-native-')
	},
	{
		id: 'helpers',
		title: 'Framework-agnostic helpers',
		desc: 'Formatting, parsing and option helpers that work in any JavaScript runtime.',
		test: () => true
	}
]

const manifests = Object.values(
	import.meta.glob<Manifest>('../../../../packages/*/package.json', {
		eager: true,
		import: 'default'
	})
)

export function sdkGroups(): SdkGroup[] {
	const published = manifests
		.filter((m) => !m.private)
		.sort((a, b) => a.name.localeCompare(b.name))
	const groups: SdkGroup[] = GROUPS.map((g) => ({
		id: g.id,
		title: g.title,
		desc: g.desc,
		packages: []
	}))
	for (const m of published) {
		const index = GROUPS.findIndex((g) => g.test(m.name))
		groups[index]?.packages.push({
			name: m.name,
			version: m.version,
			description: m.description ?? '',
			npmUrl: `https://www.npmjs.com/package/${m.name}`,
			sourceUrl: m.homepage
		})
	}
	return groups.filter((g) => g.packages.length > 0)
}
