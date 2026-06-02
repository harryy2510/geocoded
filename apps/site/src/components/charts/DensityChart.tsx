import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts'
import { type Country } from '@geocoded/client'
import { formatCompact, getContinentColor, resolveContinentName, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'
import { useCompactChart } from './responsive'

export function MostDenseBar({ countries }: { countries: Country[] }) {
	const { axisWidth, chartMargin, tick } = useCompactChart()
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0 && c.population > 0)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			density: Math.round(c.population / c.areaSqKm),
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))
		.sort((a, b) => b.density - a.density)
		.slice(0, 20)

	return (
		<div className="h-[420px] w-full sm:h-[450px]">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={chartMargin}>
					<XAxis
						type="number"
						tickFormatter={(v: number) => formatCompact(v)}
						axisLine={false}
						tickLine={false}
						tick={tick}
					/>
					<YAxis type="category" dataKey="name" width={axisWidth} axisLine={false} tickLine={false} tick={tick} />
					<Tooltip
						cursor={false}
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
	const { axisWidth, chartMargin, tick } = useCompactChart()
	const data = [...countries]
		.filter((c) => c.areaSqKm > 0 && c.population > 0)
		.map((c) => ({
			name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
			fullName: c.name,
			density: parseFloat((c.population / c.areaSqKm).toFixed(2)),
			emoji: c.emoji,
			continent: resolveContinentName(c.continent),
		}))
		.sort((a, b) => a.density - b.density)
		.slice(0, 20)

	return (
		<div className="h-[420px] w-full sm:h-[450px]">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={chartMargin}>
					<XAxis
						type="number"
						axisLine={false}
						tickLine={false}
						tickFormatter={(v: number) => `${v}/km²`}
						tick={tick}
					/>
					<YAxis type="category" dataKey="name" width={axisWidth} axisLine={false} tickLine={false} tick={tick} />
					<Tooltip
						cursor={false}
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
