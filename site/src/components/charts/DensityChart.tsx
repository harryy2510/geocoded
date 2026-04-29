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
import { formatCompact, getContinentColor } from '../../lib/format'

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

export function MostDenseBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0 && c.population > 0)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			density: Math.round(c.population / c.areaSqKm),
			emoji: c.emoji,
			continent: c.continent,
		}))
		.sort((a, b) => b.density - a.density)
		.slice(0, 20)

	return (
		<div className="h-[450px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis
						type="number"
						tickFormatter={(v: number) => formatCompact(v)}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${new Intl.NumberFormat('en-US').format(v)}/km²`, 'Density']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="density" radius={[0, 4, 4, 0]} maxBarSize={18}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function LeastDenseBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0 && c.population > 0)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			density: parseFloat((c.population / c.areaSqKm).toFixed(2)),
			emoji: c.emoji,
			continent: c.continent,
		}))
		.sort((a, b) => a.density - b.density)
		.slice(0, 20)

	return (
		<div className="h-[450px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis
						type="number"
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => `${v}/km²`}
					/>
					<YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${v}/km²`, 'Density']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="density" radius={[0, 4, 4, 0]} maxBarSize={18}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}
