import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
	PieChart,
	Pie,
	Legend,
	ScatterChart,
	Scatter,
	CartesianGrid,
	ZAxis,
} from 'recharts'
import { type Country } from '../../lib/api'
import { formatCompact, getContinentColor, resolveContinentName, axisTickStyle } from '../../lib/format'

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

export function TopGdpBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.gdp > 0)
		.sort((a, b) => b.gdp - a.gdp)
		.slice(0, 20)
		.map((c) => ({
			name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
			fullName: c.name,
			gdp: c.gdp,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[400px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
					<XAxis
						type="number"
						tickFormatter={(v: number) => `$${formatCompact(v)}M`}
						axisLine={false}
						tickLine={false}
						tick={axisTickStyle}
					/>
					<YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={axisTickStyle} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`$${new Intl.NumberFormat('en-US').format(v)}M`, 'GDP']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload ? `${payload[0].payload.emoji} ${payload[0].payload.fullName}` : _
						}
					/>
					<Bar dataKey="gdp" radius={[0, 4, 4, 0]} maxBarSize={20}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function GdpVsPopulationScatter({ countries }: { countries: Country[] }) {
	const data = countries
		.filter((c) => c.gdp > 0 && c.population > 0)
		.map((c) => ({
			x: c.population,
			y: c.gdp,
			name: c.name,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[350px] w-full">
			<ResponsiveContainer>
				<ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
					<XAxis
						type="number"
						dataKey="x"
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => formatCompact(v)}
						tick={axisTickStyle}
						label={{ value: 'Population', position: 'bottom', offset: -5, style: { fill: '#71717a', fontSize: 11 } }}
					/>
					<YAxis
						type="number"
						dataKey="y"
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => `$${formatCompact(v)}M`}
						tick={axisTickStyle}
					/>
					<ZAxis range={[30, 30]} />
					<Tooltip
						content={({ payload }) => {
							if (!payload?.length) return null
							const d = payload[0].payload as (typeof data)[0]
							return (
								<div className="rounded-lg border border-border bg-bg-surface px-3 py-2 shadow-xl">
									<div className="text-sm font-semibold text-text">
										{d.emoji} {d.name}
									</div>
									<div className="text-xs text-text-muted">
										Pop: {formatCompact(d.x)} | GDP: ${formatCompact(d.y)}M
									</div>
								</div>
							)
						}}
					/>
					<Scatter data={data} fill="#3b82f6" opacity={0.6} />
				</ScatterChart>
			</ResponsiveContainer>
		</div>
	)
}

export function CurrencyUsagePie({ countries }: { countries: Country[] }) {
	const currencyCounts = new Map<string, number>()
	for (const c of countries) {
		const cur = c.currency || 'Unknown'
		currencyCounts.set(cur, (currencyCounts.get(cur) || 0) + 1)
	}

	const sorted = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])
	const top9 = sorted.slice(0, 9)
	const otherCount = sorted.slice(9).reduce((sum, [, count]) => sum + count, 0)
	const data = [
		...top9.map(([name, value]) => ({ name, value })),
		...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : []),
	]

	const colors = [
		'#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
		'#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#6b7280',
	]

	return (
		<div className="h-[320px] w-full">
			<ResponsiveContainer>
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						outerRadius={100}
						innerRadius={50}
						paddingAngle={2}
						strokeWidth={0}
					>
						{data.map((_, i) => (
							<Cell key={i} fill={colors[i % colors.length]} />
						))}
					</Pie>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(value: number, name: string) => [`${value} countries`, name]}
					/>
					<Legend
						verticalAlign="bottom"
						iconType="circle"
						iconSize={8}
						formatter={(value: string) => (
							<span style={{ color: '#a1a1aa', fontSize: '11px' }}>{value}</span>
						)}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	)
}
