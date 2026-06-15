import { ResponsiveBar } from '@nivo/bar'
import { formatCompact, formatFull } from '../../../lib/format'
import { type MigrationRow } from '../../../lib/v2'
import { nivoTheme, CHART_COLORS } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function truncate(name: string, max = 14): string {
	return name.length > max ? `${name.slice(0, max)}…` : name
}

const fmtPct = (v: number) => `${v.toFixed(1)}%`

/** Largest international migrant stocks (destination countries). */
export function TopMigrantStockBar({ migration }: { migration: MigrationRow[] }) {
	const rows = migration
		.filter((m) => m.totalInternationalMigrants != null)
		.sort((a, b) => (b.totalInternationalMigrants ?? 0) - (a.totalInternationalMigrants ?? 0))
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((m) => ({
		country: truncate(m.countryName, 13),
		value: m.totalInternationalMigrants ?? 0,
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 100 }}
				padding={0.32}
				colors={[CHART_COLORS[0]]}
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
						rows={[{ color: CHART_COLORS[0], label: 'Migrants', value: formatFull(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Highest migrant share of population. */
export function MigrantShareBar({ migration }: { migration: MigrationRow[] }) {
	const rows = migration
		.filter((m) => m.migrantShareOfPopulationPercent != null)
		.sort(
			(a, b) =>
				(b.migrantShareOfPopulationPercent ?? 0) - (a.migrantShareOfPopulationPercent ?? 0)
		)
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((m) => ({
		country: truncate(m.countryName, 13),
		value: Number((m.migrantShareOfPopulationPercent ?? 0).toFixed(1)),
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 100 }}
				padding={0.32}
				colors={[CHART_COLORS[3]]}
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
						rows={[{ color: CHART_COLORS[3], label: 'Of population', value: fmtPct(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

type SexDatum = {
	country: string
	Female: number
	Male: number
}

/** Male / female split of migrant stock for the largest destinations. */
export function MigrantSexSplitBar({ migration }: { migration: MigrationRow[] }) {
	const rows = migration
		.filter((m) => m.maleInternationalMigrants != null && m.femaleInternationalMigrants != null)
		.sort((a, b) => (b.totalInternationalMigrants ?? 0) - (a.totalInternationalMigrants ?? 0))
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data: SexDatum[] = rows.map((m) => ({
		country: truncate(m.countryName, 13),
		Female: m.femaleInternationalMigrants ?? 0,
		Male: m.maleInternationalMigrants ?? 0,
	}))

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['Female', 'Male']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 16, bottom: 40, left: 100 }}
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

/** Largest single origin→destination corridors, pulled from origins[]. */
export function MigrationCorridorsBar({ migration }: { migration: MigrationRow[] }) {
	type Corridor = { label: string; count: number }
	const corridors: Corridor[] = []
	for (const m of migration) {
		for (const o of m.origins ?? []) {
			if (o.count > 0) {
				corridors.push({
					label: `${o.countryName} → ${m.countryName}`,
					count: o.count,
				})
			}
		}
	}

	const rows = corridors
		.sort((a, b) => b.count - a.count)
		.slice(0, 14)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((c) => ({
		corridor: c.label.length > 28 ? `${c.label.slice(0, 28)}…` : c.label,
		full: c.label,
		value: c.count,
	}))

	return (
		<ChartFrame height={440}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="corridor"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 28, left: 184 }}
				padding={0.3}
				colors={[CHART_COLORS[5]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => formatCompact(v) }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.full)}
						rows={[{ color: CHART_COLORS[5], label: 'Migrants', value: formatFull(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
