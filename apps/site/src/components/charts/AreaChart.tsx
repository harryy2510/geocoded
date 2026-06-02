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
import { type Country } from '@geocoded/client'
import { formatCompact, getContinentColor, resolveContinentName, CONTINENT_COLORS, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'
import { useCompactChart } from './responsive'

export function ContinentCountBar({ countries }: { countries: Country[] }) {
	const { chartMargin, tick } = useCompactChart()
	const counts = new Map<string, number>()
	for (const c of countries) {
		const ct = resolveContinentName(c.continent) || 'Other'
		counts.set(ct, (counts.get(ct) || 0) + 1)
	}
	const data = [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)

	return (
		<div className="h-[240px] w-full sm:h-[280px]">
			<ResponsiveContainer>
				<BarChart data={data} margin={chartMargin}>
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={tick} interval={0} />
					<YAxis axisLine={false} tickLine={false} tick={tick} />
					<Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: number) => [`${v} countries`, '']} />
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
	const { chartMargin, tick } = useCompactChart()
	const continentRegions = new Map<string, Map<string, number>>()
	const allRegions = new Set<string>()
	for (const c of countries) {
		const ct = resolveContinentName(c.continent) || 'Other'
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
		<div className="h-[240px] w-full sm:h-[280px]">
			<ResponsiveContainer>
				<BarChart data={data} margin={chartMargin}>
					<XAxis dataKey="name" axisLine={false} tickLine={false} tick={tick} interval={0} />
					<YAxis axisLine={false} tickLine={false} tick={tick} />
					<Tooltip
						contentStyle={{ ...tooltipStyle, maxHeight: '200px', overflowY: 'auto' }}
						wrapperStyle={{ zIndex: 10 }}
					/>
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
	const { axisWidth, chartMargin, tick } = useCompactChart()
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0)
		.sort((a, b) => a.areaSqKm - b.areaSqKm)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
			area: c.areaSqKm,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[280px] w-full sm:h-[300px]">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={chartMargin}>
					<XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v} km²`} tick={tick} />
					<YAxis type="category" dataKey="name" width={axisWidth} axisLine={false} tickLine={false} tick={tick} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
	const { chartMargin, tick } = useCompactChart()
	const sorted = [...countries]
		.filter((c) => c.population > 0)
		.sort((a, b) => a.population - b.population)
		.map((c, i) => ({
			index: i,
			name: c.name,
			population: c.population,
		}))

	return (
		<div className="h-[260px] w-full sm:h-[300px]">
			<ResponsiveContainer>
				<RechartsAreaChart data={sorted} margin={chartMargin}>
					<XAxis dataKey="index" axisLine={false} tickLine={false} tick={false} />
					<YAxis
						scale="log"
						domain={['auto', 'auto']}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => formatCompact(v)}
						tick={tick}
					/>
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
	const { chartMargin, isCompact, tick } = useCompactChart()
	const data = countries
		.filter((c) => c.population > 0 && c.areaSqKm > 0)
		.map((c) => ({
			x: c.areaSqKm,
			y: c.population,
			z: Math.max(c.gdp || 1, 1),
			name: c.name,
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))

	return (
		<div className="h-[300px] w-full sm:h-[350px]">
			<ResponsiveContainer>
				<ScatterChart margin={{ ...chartMargin, bottom: 10 }}>
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
						tick={tick}
						label={isCompact ? undefined : { value: 'Area (km²)', position: 'bottom', offset: -5, style: { fill: '#71717a', fontSize: 11 } }}
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
						tick={tick}
					/>
					<ZAxis type="number" dataKey="z" range={isCompact ? [16, 140] : [20, 400]} />
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
