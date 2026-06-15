import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
import { formatCompact, formatFull } from '../../../lib/format'
import { type CountryRow, type ContinentRow, type RegionRow } from '../../../lib/v2'
import { nivoTheme, continentColor, continentName } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function truncate(name: string, max = 14): string {
	return name.length > max ? `${name.slice(0, max)}…` : name
}

/** Countries per continent, horizontal, continent-colored. */
export function ContinentCountBar({ continents }: { continents: ContinentRow[] }) {
	// Merge by display name so North + South America become one "Americas" bar.
	const merged = new Map<string, { value: number; color: string }>()
	for (const c of continents) {
		const name = continentName(c.id)
		const prev = merged.get(name)
		if (prev) prev.value += c.countryCount
		else merged.set(name, { value: c.countryCount, color: continentColor(c.id) })
	}

	const data = [...merged.entries()]
		.map(([name, v]) => ({ id: name, label: name, value: v.value, color: v.color }))
		.sort((a, b) => a.value - b.value)

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={300}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="label"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 92 }}
				padding={0.34}
				colors={(bar) => continentColor(String(bar.data.id))}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8 }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel
				label={(d) => formatFull(Number(d.value))}
				labelTextColor="rgba(255,255,255,0.92)"
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.label)}
						rows={[
							{ color: continentColor(String(props.data.id)), label: 'Countries', value: formatFull(props.value) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Share of countries by continent as a donut. */
export function ContinentSharePie({ continents }: { continents: ContinentRow[] }) {
	// Merge by display name first — North and South America both map to
	// "Americas", so they must become a single slice (no duplicate keys).
	const merged = new Map<string, { value: number; color: string }>()
	for (const c of continents) {
		const name = continentName(c.id)
		const prev = merged.get(name)
		if (prev) prev.value += c.countryCount
		else merged.set(name, { value: c.countryCount, color: continentColor(c.id) })
	}

	const data = [...merged.entries()]
		.map(([name, v]) => ({ id: name, label: name, value: v.value, color: v.color }))
		.sort((a, b) => b.value - a.value)

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={340}>
			<ResponsivePie
				data={data}
				theme={nivoTheme}
				margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
				innerRadius={0.62}
				padAngle={1.2}
				cornerRadius={4}
				colors={(d) => d.data.color}
				borderWidth={1}
				borderColor="rgba(10,10,11,0.8)"
				enableArcLinkLabels={false}
				arcLabel={(d) => String(d.value)}
				arcLabelsTextColor="rgba(255,255,255,0.92)"
				arcLabelsSkipAngle={12}
				{...motionProps}
				tooltip={({ datum }) => (
					<ChartTooltip
						title={String(datum.id)}
						rows={[{ color: datum.data.color, label: 'Countries', value: formatFull(datum.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Regions ranked by country count, colored by parent continent. */
export function RegionCountBar({ regions }: { regions: RegionRow[] }) {
	const merged = new Map<string, { name: string; continent: string; count: number }>()
	for (const r of regions) {
		const key = r.name
		const prev = merged.get(key)
		if (prev) prev.count += r.countryCount
		else merged.set(key, { name: r.name, continent: r.continent, count: r.countryCount })
	}

	const data = [...merged.values()]
		.sort((a, b) => a.count - b.count)
		.slice(-12)
		.map((r) => ({
			id: r.name,
			label: truncate(r.name, 16),
			value: r.count,
			continent: r.continent,
		}))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={360}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="label"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 120 }}
				padding={0.32}
				colors={(bar) => continentColor(String(bar.data.continent))}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8 }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.id)}
						rows={[
							{
								color: continentColor(String(props.data.continent)),
								label: continentName(String(props.data.continent)),
								value: `${formatFull(props.value)} countries`,
							},
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

// The world population map lives in its own file (maplibre basemap + markers).
export { PopulationDotMap, type CityPoint } from './PopulationDotMap'

/** Most populous country in each continent, ranked. */
export function ContinentLeadersBar({ countries }: { countries: CountryRow[] }) {
	const leaders = new Map<string, CountryRow>()
	for (const c of countries) {
		if (!c.population) continue
		const prev = leaders.get(c.continent)
		if (!prev || c.population > prev.population) leaders.set(c.continent, c)
	}

	const data = [...leaders.entries()]
		.sort((a, b) => a[1].population - b[1].population)
		.map(([cont, c]) => ({
			id: cont,
			label: `${continentName(cont)} · ${truncate(c.name, 10)}`,
			value: c.population,
			continent: cont,
		}))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={300}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="label"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 160 }}
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
						title={String(props.data.label)}
						rows={[
							{ color: continentColor(String(props.data.continent)), label: 'Population', value: formatFull(props.value) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
