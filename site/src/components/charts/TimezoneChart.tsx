import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts'
import { type Country } from '../../lib/api'
import { resolveContinentName, CONTINENT_COLORS, axisTickStyle, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'

const palette = [
	'#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
	'#ec4899', '#f97316', '#14b8a6', '#a855f7', '#6366f1',
]

export function TimezonesPerCountry({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.timezones?.length > 0)
		.sort((a, b) => b.timezones.length - a.timezones.length)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
			fullName: c.name,
			count: c.timezones.length,
			emoji: c.emoji,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
					<XAxis type="number" axisLine={false} tickLine={false} tick={axisTickStyle} />
					<YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
						formatter={(v: number) => [`${v} timezones`, '']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
						{data.map((_, i) => (
							<Cell key={i} fill={palette[i % palette.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function TimezonesByContinent({ countries }: { countries: Country[] }) {
	const continentTzs = new Map<string, Set<string>>()
	for (const c of countries) {
		const ct = resolveContinentName(c.continent) || 'Other'
		if (!continentTzs.has(ct)) continentTzs.set(ct, new Set())
		const set = continentTzs.get(ct)!
		if (c.timezones) {
			for (const tz of c.timezones) {
				set.add(tz.zoneName)
			}
		}
	}

	const data = [...continentTzs.entries()]
		.map(([name, set]) => ({ name, count: set.size }))
		.sort((a, b) => b.count - a.count)

	return (
		<div className="h-[280px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} margin={{ left: 0, right: 10, bottom: 0 }}>
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTickStyle} />
					<YAxis axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
						formatter={(v: number) => [`${v} unique timezones`, '']}
					/>
					<Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
						{data.map((entry, i) => (
							<Cell key={i} fill={CONTINENT_COLORS[entry.name] || '#6b7280'} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
