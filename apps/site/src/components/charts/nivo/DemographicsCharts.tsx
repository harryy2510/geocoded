import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import { formatCompact, formatFull } from '../../../lib/format'
import { type StatisticsRow } from '../../../lib/v2'
import { nivoTheme, CHART_COLORS, rampColor } from '../nivoTheme'
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

const fmtPct = (v: number) => `${v.toFixed(1)}%`

/**
 * Age structure of the largest populations as a stacked radial bar — the
 * required radial-bar "wow" chart. Each ring is a country; segments are the
 * three age bands.
 */
export function AgeStructureRadial({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter(
			(s) =>
				metric(s, 'age0To14Percent') != null &&
				metric(s, 'age65PlusPercent') != null &&
				metric(s, 'populationTotal') != null
		)
		.sort((a, b) => (metric(b, 'populationTotal') ?? 0) - (metric(a, 'populationTotal') ?? 0))
		.slice(0, 9)

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((s) => ({
		id: truncate(s.countryName, 12),
		data: [
			{ x: 'Ages 0–14', y: metric(s, 'age0To14Percent') ?? 0 },
			{ x: 'Ages 15–64', y: metric(s, 'age15To64Percent') ?? 0 },
			{ x: 'Ages 65+', y: metric(s, 'age65PlusPercent') ?? 0 },
		],
	}))

	return (
		<ChartFrame height={420} mobileHeight={360}>
			<ResponsiveRadialBar
				data={data}
				theme={nivoTheme}
				valueFormat={(v) => `${v.toFixed(1)}%`}
				padding={0.42}
				cornerRadius={3}
				margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
				colors={['#3b82f6', '#22c55e', '#f59e0b']}
				borderWidth={0}
				enableTracks
				tracksColor="rgba(255,255,255,0.04)"
				radialAxisStart={{ tickSize: 0, tickPadding: 6 }}
				circularAxisOuter={{ tickSize: 0, tickPadding: 12 }}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={`${props.bar.groupId} · ${props.bar.category}`}
						rows={[{ color: props.bar.color, label: 'Share', value: fmtPct(props.bar.value) }]}
					/>
				)}
				legends={[
					{
						anchor: 'bottom',
						direction: 'row',
						translateY: 24,
						itemWidth: 92,
						itemHeight: 18,
						itemTextColor: '#a1a1aa',
						symbolSize: 12,
						symbolShape: 'circle',
					},
				]}
			/>
		</ChartFrame>
	)
}

type AgeStackDatum = {
	country: string
	'Ages 0–14': number
	'Ages 15–64': number
	'Ages 65+': number
}

/** Stacked horizontal age-band composition for the oldest populations. */
export function AgeStructureBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'age65PlusPercent') != null)
		.sort((a, b) => (metric(b, 'age65PlusPercent') ?? 0) - (metric(a, 'age65PlusPercent') ?? 0))
		.slice(0, 12)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data: AgeStackDatum[] = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		'Ages 0–14': metric(s, 'age0To14Percent') ?? 0,
		'Ages 15–64': metric(s, 'age15To64Percent') ?? 0,
		'Ages 65+': metric(s, 'age65PlusPercent') ?? 0,
	}))

	return (
		<ChartFrame height={400}>
			<ResponsiveBar
				data={data}
				keys={['Ages 0–14', 'Ages 15–64', 'Ages 65+']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 16, bottom: 40, left: 96 }}
				padding={0.32}
				colors={['#3b82f6', '#22c55e', '#f59e0b']}
				borderRadius={2}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}%` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				valueFormat={(v) => `${v.toFixed(1)}%`}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: props.color, label: String(props.id), value: fmtPct(props.value) }]}
					/>
				)}
				legends={[
					{
						dataFrom: 'keys',
						anchor: 'bottom',
						direction: 'row',
						translateY: 38,
						itemWidth: 92,
						itemHeight: 16,
						itemTextColor: '#a1a1aa',
						symbolSize: 11,
						symbolShape: 'circle',
					},
				]}
			/>
		</ChartFrame>
	)
}

/** Simple ranked horizontal bar of a single percentage metric. */
function PercentRankBar({
	stats,
	metricKey,
	color,
	descending = true,
	max = 12,
}: {
	stats: StatisticsRow[]
	metricKey: keyof StatisticsRow
	color: string
	descending?: boolean
	max?: number
}) {
	const rows = stats
		.filter((s) => metric(s, metricKey) != null)
		.sort((a, b) => {
			const av = metric(a, metricKey) ?? 0
			const bv = metric(b, metricKey) ?? 0
			return descending ? bv - av : av - bv
		})
		.slice(0, max)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		value: metric(s, metricKey) ?? 0,
	}))

	return (
		<ChartFrame height={340}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 96 }}
				padding={0.34}
				colors={[color]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}%` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color, label: 'Share', value: fmtPct(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

export function OldestPopulationsBar({ stats }: { stats: StatisticsRow[] }) {
	return <PercentRankBar stats={stats} metricKey="age65PlusPercent" color={CHART_COLORS[2]} />
}

export function YoungestPopulationsBar({ stats }: { stats: StatisticsRow[] }) {
	return <PercentRankBar stats={stats} metricKey="age0To14Percent" color={CHART_COLORS[0]} />
}

type SexDatum = {
	country: string
	Female: number
	Male: number
}

/** Male / female split for the largest populations, diverging-ish stacked bar. */
export function SexSplitBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'populationFemale') != null && metric(s, 'populationMale') != null)
		.sort((a, b) => (metric(b, 'populationTotal') ?? 0) - (metric(a, 'populationTotal') ?? 0))
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data: SexDatum[] = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		Female: metric(s, 'populationFemale') ?? 0,
		Male: metric(s, 'populationMale') ?? 0,
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['Female', 'Male']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 16, bottom: 40, left: 96 }}
				padding={0.32}
				colors={['#ec4899', '#06b6d4']}
				borderRadius={2}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => formatCompact(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: props.color, label: String(props.id), value: formatFull(props.value) }]}
					/>
				)}
				legends={[
					{
						dataFrom: 'keys',
						anchor: 'bottom',
						direction: 'row',
						translateY: 38,
						itemWidth: 80,
						itemHeight: 16,
						itemTextColor: '#a1a1aa',
						symbolSize: 11,
						symbolShape: 'circle',
					},
				]}
			/>
		</ChartFrame>
	)
}

type UrbanDatum = {
	country: string
	Urban: number
	Rural: number
}

/** Urban vs rural share of population, stacked to 100%. */
export function UrbanRuralBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'urbanPopulationPercent') != null)
		.sort(
			(a, b) =>
				(metric(b, 'urbanPopulationPercent') ?? 0) - (metric(a, 'urbanPopulationPercent') ?? 0)
		)
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data: UrbanDatum[] = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		Urban: metric(s, 'urbanPopulationPercent') ?? 0,
		Rural: metric(s, 'ruralPopulationPercent') ?? 100 - (metric(s, 'urbanPopulationPercent') ?? 0),
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['Urban', 'Rural']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 16, bottom: 40, left: 96 }}
				padding={0.32}
				colors={['#a855f7', '#22c55e']}
				borderRadius={2}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}%` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				valueFormat={(v) => `${v.toFixed(1)}%`}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: props.color, label: String(props.id), value: fmtPct(props.value) }]}
					/>
				)}
				legends={[
					{
						dataFrom: 'keys',
						anchor: 'bottom',
						direction: 'row',
						translateY: 38,
						itemWidth: 80,
						itemHeight: 16,
						itemTextColor: '#a1a1aa',
						symbolSize: 11,
						symbolShape: 'circle',
					},
				]}
			/>
		</ChartFrame>
	)
}

/** Reported population density (people/km²) — most dense countries. */
export function DensityBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'populationDensity') != null)
		.sort((a, b) => (metric(b, 'populationDensity') ?? 0) - (metric(a, 'populationDensity') ?? 0))
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		value: Math.round(metric(s, 'populationDensity') ?? 0),
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 96 }}
				padding={0.34}
				colors={[CHART_COLORS[4]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => formatCompact(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[
							{ color: CHART_COLORS[4], label: 'Density', value: `${formatFull(props.value)} /km²` },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

type ScatterDatum = {
	x: number
	y: number
	country: string
}

/** Urbanization vs aging: urban % (x) vs 65+ % (y), bubble per country. */
export function UrbanVsAgingScatter({ stats }: { stats: StatisticsRow[] }) {
	const points: ScatterDatum[] = stats
		.filter(
			(s) =>
				metric(s, 'urbanPopulationPercent') != null && metric(s, 'age65PlusPercent') != null
		)
		.map((s) => ({
			x: metric(s, 'urbanPopulationPercent') ?? 0,
			y: metric(s, 'age65PlusPercent') ?? 0,
			country: s.countryName,
		}))

	if (points.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={400}>
			<ResponsiveScatterPlot<ScatterDatum>
				data={[{ id: 'countries', data: points }]}
				theme={nivoTheme}
				margin={{ top: 16, right: 24, bottom: 56, left: 56 }}
				xScale={{ type: 'linear', min: 0, max: 100 }}
				yScale={{ type: 'linear', min: 0, max: 'auto' }}
				colors={[rampColor(3)]}
				nodeSize={8}
				useMesh
				axisBottom={{
					tickSize: 0,
					tickPadding: 8,
					legend: 'Urban population %',
					legendPosition: 'middle',
					legendOffset: 42,
					format: (v: number) => `${v}%`,
				}}
				axisLeft={{
					tickSize: 0,
					tickPadding: 8,
					legend: 'Population 65+ %',
					legendPosition: 'middle',
					legendOffset: -44,
					format: (v: number) => `${v}%`,
				}}
				{...motionProps}
				tooltip={({ node }) => (
					<ChartTooltip
						title={node.data.country}
						rows={[
							{ label: 'Urban', value: fmtPct(node.data.x) },
							{ label: 'Aged 65+', value: fmtPct(node.data.y) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Highest life expectancy at birth. */
export function LifeExpectancyBar({ stats }: { stats: StatisticsRow[] }) {
	const rows = stats
		.filter((s) => metric(s, 'lifeExpectancy') != null)
		.sort((a, b) => (metric(b, 'lifeExpectancy') ?? 0) - (metric(a, 'lifeExpectancy') ?? 0))
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((s) => ({
		country: truncate(s.countryName, 13),
		value: Number((metric(s, 'lifeExpectancy') ?? 0).toFixed(1)),
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 96 }}
				padding={0.34}
				colors={[CHART_COLORS[1]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}y` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.country)}
						rows={[{ color: CHART_COLORS[1], label: 'Life expectancy', value: `${props.value} years` }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
