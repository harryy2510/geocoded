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
import { CONTINENT_COLORS } from '../../lib/format'

const tooltipStyle = {
	backgroundColor: '#131316',
	border: '1px solid #2a2a30',
	borderRadius: '8px',
	fontSize: '12px',
	color: '#e5e5e5',
}

const palette = [
	'#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
	'#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899',
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
					<XAxis type="number" axisLine={false} tickLine={false} />
					<YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
					<Tooltip
						contentStyle={tooltipStyle}
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
		const ct = c.continent || 'Other'
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
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
					<YAxis axisLine={false} tickLine={false} />
					<Tooltip
						contentStyle={tooltipStyle}
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
