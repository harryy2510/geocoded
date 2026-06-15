import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import { formatCompact, formatFull } from '../../../lib/format'
import { type StatisticsRow, type CountryRow, type CurrencyRow } from '../../../lib/v2'
import { nivoTheme, CHART_COLORS, continentColor, continentName, rampColor } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function truncate(name: string, max = 14): string {
	return name.length > max ? `${name.slice(0, max)}…` : name
}

function metric(row: StatisticsRow, key: keyof StatisticsRow): number | null {
	const m = row[key]
	if (m && typeof m === 'object' && 'value' in m) return m.value
	return null
}

const usd = (v: number) => `$${formatCompact(v)}`

type GdpDatum = {
	country: string
	value: number
	continent: string
	continentName: string
}

/** Top economies by nominal GDP, colored by continent. */
export function TopGdpBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'gdpCurrentUsd') != null)
		.sort((a, b) => (metric(b, 'gdpCurrentUsd') ?? 0) - (metric(a, 'gdpCurrentUsd') ?? 0))
		.slice(0, 16)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data: GdpDatum[] = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		value: metric(s, 'gdpCurrentUsd') ?? 0,
		continent: '',
		continentName: '',
	}))

	return (
		<ChartFrame height={460}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 100 }}
				padding={0.3}
				colors={[CHART_COLORS[1]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => usd(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: CHART_COLORS[1], label: 'GDP', value: usd(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Highest GDP per capita. */
export function GdpPerCapitaBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'gdpPerCapitaCurrentUsd') != null)
		.sort(
			(a, b) =>
				(metric(b, 'gdpPerCapitaCurrentUsd') ?? 0) - (metric(a, 'gdpPerCapitaCurrentUsd') ?? 0)
		)
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		value: Math.round(metric(s, 'gdpPerCapitaCurrentUsd') ?? 0),
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 56, bottom: 28, left: 100 }}
				padding={0.32}
				colors={[CHART_COLORS[2]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => usd(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: CHART_COLORS[2], label: 'GDP / capita', value: `$${formatFull(props.value)}` }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

type GdpScatterDatum = {
	x: number
	y: number
	country: string
	continent: string
}

/**
 * GDP (y) vs population (x) on log/log axes, bubbles colored by continent.
 * Uses expanded country rows (statistics + population).
 */
export function GdpVsPopulationScatter({ countries }: { countries: CountryRow[] }) {
	const points: GdpScatterDatum[] = countries
		.filter((c) => c.population > 0 && (c.statistics ? metric(c.statistics, 'gdpCurrentUsd') : null))
		.map((c) => ({
			x: c.population,
			y: c.statistics ? metric(c.statistics, 'gdpCurrentUsd') ?? 0 : 0,
			country: c.name,
			continent: c.continent,
		}))
		.filter((p) => p.y > 0)

	if (points.length === 0) return <ChartEmpty />

	const series = new Map<string, GdpScatterDatum[]>()
	for (const p of points) {
		const key = continentName(p.continent)
		if (!series.has(key)) series.set(key, [])
		series.get(key)?.push(p)
	}
	const data = [...series.entries()].map(([id, pts]) => ({ id, data: pts }))

	// Clean decade ticks (powers of 10). The scale domain is pinned to the same
	// decade bounds so gridlines and plotted points stay aligned — otherwise
	// points between the data-min and the first gridline render outside the grid.
	const decades = (values: number[]): { ticks: number[]; min: number; max: number } => {
		const lo = Math.floor(Math.log10(Math.min(...values)))
		const hi = Math.ceil(Math.log10(Math.max(...values)))
		const ticks: number[] = []
		for (let e = lo; e <= hi; e++) ticks.push(10 ** e)
		return { ticks, min: 10 ** lo, max: 10 ** hi }
	}
	const y = decades(points.map((p) => p.y))
	const x = decades(points.map((p) => p.x))

	return (
		<ChartFrame height={420}>
			<ResponsiveScatterPlot<GdpScatterDatum>
				data={data}
				theme={nivoTheme}
				margin={{ top: 16, right: 24, bottom: 56, left: 68 }}
				xScale={{ type: 'log', base: 10, min: x.min, max: x.max }}
				yScale={{ type: 'log', base: 10, min: y.min, max: y.max }}
				colors={(serie) => continentColor(String(serie.serieId))}
				nodeSize={9}
				useMesh
				axisBottom={{
					tickSize: 0,
					tickPadding: 8,
					tickValues: x.ticks,
					legend: 'Population',
					legendPosition: 'middle',
					legendOffset: 42,
					format: (v: number) => formatCompact(v),
				}}
				axisLeft={{
					tickSize: 0,
					tickPadding: 8,
					tickValues: y.ticks,
					legend: 'GDP (USD)',
					legendPosition: 'middle',
					legendOffset: -56,
					format: (v: number) => usd(v),
				}}
				{...motionProps}
				tooltip={({ node }) => (
					<ChartTooltip
						title={node.data.country}
						rows={[
							{
								color: continentColor(node.data.continent),
								label: 'GDP',
								value: usd(node.data.y),
							},
							{ label: 'Population', value: formatFull(node.data.x) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Most widely used currencies (countries per currency). */
export function CurrencyUsageBar({ currencies }: { currencies: CurrencyRow[] }) {
	const rows = currencies
		.map((c) => ({ code: c.code, name: c.name, count: c.countries?.length ?? 0 }))
		.filter((c) => c.count > 0)
		.sort((a, b) => b.count - a.count)
		.slice(0, 12)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((c, i) => ({
		code: c.code,
		name: c.name,
		value: c.count,
		color: rampColor(i),
	}))

	return (
		<ChartFrame height={360}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="code"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 64 }}
				padding={0.32}
				colors={(bar) => rampColor(bar.index)}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8 }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={`${props.data.code} · ${props.data.name}`}
						rows={[{ color: props.color, label: 'Countries', value: formatFull(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
