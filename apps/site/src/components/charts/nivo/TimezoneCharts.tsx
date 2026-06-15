import { ResponsiveBar } from '@nivo/bar'
import { formatFull } from '../../../lib/format'
import { type TimezoneRow } from '../../../lib/v2'
import { nivoTheme, CHART_COLORS, continentColor } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function offsetHours(seconds: number): number {
	return Math.round((seconds / 3600) * 2) / 2
}

function offsetLabel(hours: number): string {
	if (hours === 0) return 'UTC'
	const sign = hours > 0 ? '+' : '−'
	const abs = Math.abs(hours)
	const whole = Math.floor(abs)
	const mins = Math.round((abs - whole) * 60)
	return `UTC${sign}${whole}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`
}

/** IANA zones grouped by UTC standard offset — the spread of world time. */
export function OffsetDistributionBar({ timezones }: { timezones: TimezoneRow[] }) {
	const counts = new Map<number, number>()
	for (const t of timezones) {
		const h = offsetHours(t.standardOffset ?? 0)
		counts.set(h, (counts.get(h) ?? 0) + 1)
	}

	const data = [...counts.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([h, value]) => ({ offset: offsetLabel(h), value }))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={360}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="offset"
				layout="vertical"
				theme={nivoTheme}
				margin={{ top: 16, right: 16, bottom: 64, left: 44 }}
				padding={0.28}
				colors={[CHART_COLORS[4]]}
				borderRadius={4}
				enableGridX={false}
				enableGridY
				axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -56 }}
				axisLeft={{ tickSize: 0, tickPadding: 8 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.offset)}
						rows={[{ color: CHART_COLORS[4], label: 'Zones', value: formatFull(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** Unique IANA zones per geographic area (Africa, America, Asia, …). */
export function TimezonesByAreaBar({ timezones }: { timezones: TimezoneRow[] }) {
	const counts = new Map<string, number>()
	for (const t of timezones) {
		const area = t.area || 'Other'
		counts.set(area, (counts.get(area) ?? 0) + 1)
	}

	const areaContinent: Record<string, string> = {
		Africa: 'AF',
		America: 'NA',
		Antarctica: 'AN',
		Arctic: 'EU',
		Asia: 'AS',
		Atlantic: 'EU',
		Australia: 'OC',
		Europe: 'EU',
		Indian: 'AS',
		Pacific: 'OC',
	}

	const data = [...counts.entries()]
		.sort((a, b) => a[1] - b[1])
		.map(([area, value]) => ({
			area,
			value,
			continent: areaContinent[area] ?? 'AS',
		}))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={360}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="area"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 96 }}
				padding={0.32}
				colors={(bar) => continentColor(String(bar.data.continent))}
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
						title={String(props.data.area)}
						rows={[
							{ color: continentColor(String(props.data.continent)), label: 'Zones', value: formatFull(props.value) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

/** IANA zones shared by the most countries (e.g. Africa/Abidjan). */
export function MostSharedTimezonesBar({ timezones }: { timezones: TimezoneRow[] }) {
	const data = [...timezones]
		.map((t) => ({ timezone: t.timezone, value: t.countryCodes?.length ?? 0 }))
		.filter((t) => t.value > 1)
		.sort((a, b) => b.value - a.value)
		.slice(0, 14)
		.reverse()
		.map((t) => ({
			zone: t.timezone.length > 22 ? `…${t.timezone.slice(-21)}` : t.timezone,
			full: t.timezone,
			value: t.value,
		}))

	if (data.length === 0) return <ChartEmpty />

	return (
		<ChartFrame height={420}>
			<ResponsiveBar
				data={data}
				keys={['value']}
				indexBy="zone"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 40, bottom: 28, left: 160 }}
				padding={0.32}
				colors={[CHART_COLORS[0]]}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8 }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.data.full)}
						rows={[{ color: CHART_COLORS[0], label: 'Countries', value: formatFull(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
