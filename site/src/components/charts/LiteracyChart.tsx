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
import { getContinentColor, resolveContinentName, axisTickStyle } from '../../lib/format'

const tooltipStyle = {
	backgroundColor: 'rgba(17, 17, 20, 0.95)',
	border: '1px solid rgba(255, 255, 255, 0.08)',
	borderRadius: '10px',
	fontSize: '12px',
	color: '#e5e5e5',
	backdropFilter: 'blur(12px)',
	boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
	padding: '8px 12px',
}

export function LiteracyHistogram({ countries }: { countries: Country[] }) {
	const buckets = [
		{ label: '0-50%', min: 0, max: 50, count: 0 },
		{ label: '50-70%', min: 50, max: 70, count: 0 },
		{ label: '70-80%', min: 70, max: 80, count: 0 },
		{ label: '80-90%', min: 80, max: 90, count: 0 },
		{ label: '90-95%', min: 90, max: 95, count: 0 },
		{ label: '95-100%', min: 95, max: 101, count: 0 },
	]

	for (const c of countries) {
		if (c.literacy != null && c.literacy > 0) {
			const bucket = buckets.find((b) => c.literacy >= b.min && c.literacy < b.max)
			if (bucket) bucket.count++
		}
	}

	const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981']

	return (
		<div className="h-[280px] w-full">
			<ResponsiveContainer>
				<BarChart data={buckets} margin={{ left: 0, right: 10, bottom: 0 }}>
					<XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTickStyle} />
					<YAxis axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${v} countries`, '']}
					/>
					<Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
						{buckets.map((_, i) => (
							<Cell key={i} fill={colors[i]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function TopLiteracyBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.literacy != null && c.literacy > 0)
		.sort((a, b) => b.literacy - a.literacy)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			literacy: c.literacy,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis
						type="number"
						domain={[80, 100]}
						tickFormatter={(v: number) => `${v}%`}
						axisLine={false}
						tickLine={false}
						tick={axisTickStyle}
					/>
					<YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${v}%`, 'Literacy']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="literacy" radius={[0, 4, 4, 0]} maxBarSize={20}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function BottomLiteracyBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.literacy != null && c.literacy > 0)
		.sort((a, b) => a.literacy - b.literacy)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			literacy: c.literacy,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis
						type="number"
						domain={[0, 100]}
						tickFormatter={(v: number) => `${v}%`}
						axisLine={false}
						tickLine={false}
						tick={axisTickStyle}
					/>
					<YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${v}%`, 'Literacy']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="literacy" radius={[0, 4, 4, 0]} maxBarSize={20}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
