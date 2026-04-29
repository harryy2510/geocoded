import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
	ScatterChart,
	Scatter,
	ZAxis,
	CartesianGrid,
	AreaChart as RechartsAreaChart,
	Area,
} from 'recharts'
import { type Country } from '../../lib/api'
import { formatCompact, getContinentColor, CONTINENT_COLORS } from '../../lib/format'

const tooltipStyle = {
	backgroundColor: '#131316',
	border: '1px solid #2a2a30',
	borderRadius: '8px',
	fontSize: '12px',
	color: '#e5e5e5',
}

export function ContinentCountBar({ countries }: { countries: Country[] }) {
	const counts = new Map<string, number>()
	for (const c of countries) {
		const ct = c.continent || 'Other'
		counts.set(ct, (counts.get(ct) || 0) + 1)
	}
	const data = [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)

	return (
		<div className="h-[280px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} margin={{ left: 0, right: 10, bottom: 0 }}>
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
					<YAxis axisLine={false} tickLine={false} />
					<Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} countries`, '']} />
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

export function RegionStackedBar({ countries }: { countries: Country[] }) {
	const continentRegions = new Map<string, Map<string, number>>()
	const allRegions = new Set<string>()
	for (const c of countries) {
		const ct = c.continent || 'Other'
		const r = c.subregion || c.region || 'Other'
		allRegions.add(r)
		if (!continentRegions.has(ct)) continentRegions.set(ct, new Map())
		const m = continentRegions.get(ct)!
		m.set(r, (m.get(r) || 0) + 1)
	}

	const data = [...continentRegions.entries()].map(([continent, regions]) => {
		const entry: Record<string, string | number> = { name: continent }
		for (const [r, count] of regions) {
			entry[r] = count
		}
		return entry
	})

	const regions = [...allRegions]
	const colorPalette = [
		'#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
		'#06b6d4', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899',
		'#84cc16', '#6366f1', '#f43f5e', '#22d3ee', '#d946ef',
		'#facc15', '#2dd4bf', '#fb923c', '#818cf8', '#4ade80',
	]

	return (
		<div className="h-[280px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} margin={{ left: 0, right: 10, bottom: 0 }}>
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
					<YAxis axisLine={false} tickLine={false} />
					<Tooltip contentStyle={tooltipStyle} />
					{regions.map((r, i) => (
						<Bar
							key={r}
							dataKey={r}
							stackId="a"
							fill={colorPalette[i % colorPalette.length]}
							radius={i === regions.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function SmallestCountriesBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0)
		.sort((a, b) => a.areaSqKm - b.areaSqKm)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
			area: c.areaSqKm,
			emoji: c.emoji,
			continent: c.continent,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
					<XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v} km²`} />
					<YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number) => [`${new Intl.NumberFormat('en-US').format(v)} km²`, 'Area']}
					/>
					<Bar dataKey="area" radius={[0, 4, 4, 0]} maxBarSize={24}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function PopulationDistributionArea({ countries }: { countries: Country[] }) {
	const sorted = [...countries]
		.filter((c) => c.population > 0)
		.sort((a, b) => a.population - b.population)
		.map((c, i) => ({
			index: i,
			name: c.name,
			population: c.population,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<RechartsAreaChart data={sorted} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
					<XAxis dataKey="index" axisLine={false} tickLine={false} tick={false} />
					<YAxis
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => formatCompact(v)}
					/>
					<Tooltip
						contentStyle={tooltipStyle}
						labelFormatter={(_: string, payload: Array<{ payload?: { name?: string } }>) =>
							payload[0]?.payload?.name || ''
						}
						formatter={(v: number) => [formatCompact(v), 'Population']}
					/>
					<Area
						type="monotone"
						dataKey="population"
						stroke="#3b82f6"
						fill="url(#popGrad)"
						strokeWidth={2}
					/>
					<defs>
						<linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
							<stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
						</linearGradient>
					</defs>
				</RechartsAreaChart>
			</ResponsiveContainer>
		</div>
	)
}

export function PopVsAreaScatter({ countries }: { countries: Country[] }) {
	const data = countries
		.filter((c) => c.population > 0 && c.areaSqKm > 0)
		.map((c) => ({
			x: c.areaSqKm,
			y: c.population,
			z: Math.max(c.gdp || 1, 1),
			name: c.name,
			emoji: c.emoji,
			continent: c.continent,
		}))

	return (
		<div className="h-[350px] w-full">
			<ResponsiveContainer>
				<ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
					<XAxis
						type="number"
						dataKey="x"
						name="Area"
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => formatCompact(v)}
						label={{ value: 'Area (km²)', position: 'bottom', offset: -5, style: { fill: '#71717a', fontSize: 11 } }}
					/>
					<YAxis
						type="number"
						dataKey="y"
						name="Population"
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => formatCompact(v)}
					/>
					<ZAxis type="number" dataKey="z" range={[20, 400]} />
					<Tooltip
						contentStyle={tooltipStyle}
						content={({ payload }) => {
							if (!payload?.length) return null
							const d = payload[0].payload as (typeof data)[0]
							return (
								<div className="rounded-lg border border-border bg-bg-surface px-3 py-2 shadow-xl">
									<div className="text-sm font-semibold text-text">
										{d.emoji} {d.name}
									</div>
									<div className="text-xs text-text-muted">
										Pop: {formatCompact(d.y)} | Area: {formatCompact(d.x)} km²
									</div>
									<div className="text-xs text-text-dim">GDP: ${formatCompact(d.z)}M</div>
								</div>
							)
						}}
					/>
					<Scatter data={data} fill="#3b82f6" opacity={0.7} />
				</ScatterChart>
			</ResponsiveContainer>
		</div>
	)
}
