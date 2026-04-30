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
import { axisTickStyle, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'

const palette = [
	'#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
	'#ec4899', '#f97316', '#14b8a6', '#a855f7', '#6366f1',
]

export function MostCommonLanguages({ countries }: { countries: Country[] }) {
	const langCounts = new Map<string, number>()
	for (const c of countries) {
		if (c.languages) {
			for (const lang of c.languages) {
				langCounts.set(lang, (langCounts.get(lang) || 0) + 1)
			}
		}
	}

	const data = [...langCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 15)
		.map(([name, count]) => ({ name, count }))

	return (
		<div className="h-[380px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
					<XAxis type="number" axisLine={false} tickLine={false} tick={axisTickStyle} />
					<YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
						formatter={(v: number) => [`${v} countries`, '']}
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

export function MostLanguagesPerCountry({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.languages?.length > 0)
		.sort((a, b) => b.languages.length - a.languages.length)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 16 ? c.name.slice(0, 16) + '...' : c.name,
			fullName: c.name,
			count: c.languages.length,
			emoji: c.emoji,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis type="number" axisLine={false} tickLine={false} tick={axisTickStyle} />
					<YAxis type="category" dataKey="name" width={130} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
						formatter={(v: number) => [`${v} languages`, '']}
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
