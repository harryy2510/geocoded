import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveSunburst } from '@nivo/sunburst'
import { ResponsiveTreeMap } from '@nivo/treemap'
import { formatCompact, formatFull } from '../../../lib/format'
import { type CountryRow, type ContinentRow, type RegionRow } from '../../../lib/v2'
import { nivoTheme, continentColor, continentName, rampColor } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function truncate(name: string, max = 14): string {
	return name.length > max ? `${name.slice(0, max)}…` : name
}

type HBarDatum = {
	id: string
	fullName: string
	label: string
	value: number
	continent: string
	continentName: string
}

/** Top 10 countries by population, horizontal, colored by continent. */
export function TopPopulationBar({ countries }: { countries: CountryRow[] }) {
	const data: HBarDatum[] = [...countries]
		.filter((c) => c.population > 0)
		.sort((a, b) => b.population - a.population)
		.slice(0, 10)
		.reverse()
		.map((c) => ({
			id: c.iso3,
			fullName: c.name,
			label: truncate(c.name),
			value: c.population,
			continent: c.continent,
			continentName: continentName(c.continent),
		}))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={340}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="label"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 32, bottom: 28, left: 96 }}
				padding={0.32}
				colors={(bar) => continentColor(String(bar.data.continent))}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => formatCompact(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.fullName)}
						rows={[
							{
								color: continentColor(String(props.data.continent)),
								label: String(props.data.continentName),
								value: formatFull(props.value),
							},
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

type SunburstNode = {
	id: string
	color?: string
	value?: number
	children?: SunburstNode[]
}

/**
 * Continent → region → country population hierarchy. The hero scale viz.
 */
export function PopulationSunburst({
	countries,
	continents,
	regions,
}: {
	countries: CountryRow[]
	continents: ContinentRow[]
	regions: RegionRow[]
}) {
	const continentLabel = new Map(continents.map((c) => [c.id, continentName(c.id)]))
	void regions

	const byContinent = new Map<string, Map<string, CountryRow[]>>()
	for (const c of countries) {
		if (!c.population) continue
		const cont = c.continent
		const reg = c.region || continentName(cont)
		if (!byContinent.has(cont)) byContinent.set(cont, new Map())
		const regionMap = byContinent.get(cont)
		if (!regionMap) continue
		if (!regionMap.has(reg)) regionMap.set(reg, [])
		regionMap.get(reg)?.push(c)
	}

	const root: SunburstNode = {
		id: 'World',
		children: [...byContinent.entries()]
			.sort(
				(a, b) => continentLabel.get(a[0])?.localeCompare(continentLabel.get(b[0]) ?? '') ?? 0
			)
			.map(([cont, regionMap]) => ({
				id: continentLabel.get(cont) ?? continentName(cont),
				color: continentColor(cont),
				children: [...regionMap.entries()].map(([reg, list]) => ({
					id: `${continentName(cont)} · ${reg}`,
					color: continentColor(cont),
					children: list
						.sort((a, b) => b.population - a.population)
						.slice(0, 14)
						.map((c) => ({
							id: c.name,
							color: continentColor(cont),
							value: c.population,
						})),
				})),
			})),
	}

	if (!root.children?.length) return <ChartEmpty />

	return (
		<ChartFrame height={460} mobileHeight={360}>
			<ResponsiveSunburst<SunburstNode>
				data={root}
				id="id"
				value="value"
				theme={nivoTheme}
				cornerRadius={3}
				borderColor="rgba(10,10,11,0.9)"
				borderWidth={1.5}
				colors={(node) => node.data.color ?? rampColor(0)}
				childColor={{ from: 'color', modifiers: [['brighter', 0.18]] }}
				inheritColorFromParent
				enableArcLabels
				arcLabel="id"
				arcLabelsSkipAngle={11}
				arcLabelsTextColor="rgba(255,255,255,0.92)"
				{...motionProps}
				tooltip={(node) => (
					<ChartTooltip
						title={String(node.id)}
						rows={[{ color: node.color, label: 'Population', value: formatFull(node.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

type TreeNode = {
	id: string
	color?: string
	value?: number
	children?: TreeNode[]
}

/** Top 36 countries by population as a continent-colored treemap. */
export function PopulationTreemap({ countries }: { countries: CountryRow[] }) {
	const top = [...countries]
		.filter((c) => c.population > 0)
		.sort((a, b) => b.population - a.population)
		.slice(0, 36)

	if (top.length === 0) return <ChartEmpty />

	const root: TreeNode = {
		id: 'World',
		children: top.map((c) => ({
			id: c.name,
			value: c.population,
			color: continentColor(c.continent),
		})),
	}

	return (
		<ChartFrame height={420} mobileHeight={340}>
			<ResponsiveTreeMap<TreeNode>
				data={root}
				identity="id"
				value="value"
				theme={nivoTheme}
				tile="squarify"
				leavesOnly
				innerPadding={3}
				outerPadding={0}
				borderWidth={0}
				colors={(node) => node.data.color ?? rampColor(0)}
				nodeOpacity={0.92}
				label={(node) => truncate(String(node.id), 12)}
				labelSkipSize={26}
				labelTextColor="rgba(255,255,255,0.95)"
				enableParentLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.node.id)}
						rows={[
							{
								color: props.node.data.color,
								label: 'Population',
								value: formatFull(props.node.value),
							},
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
