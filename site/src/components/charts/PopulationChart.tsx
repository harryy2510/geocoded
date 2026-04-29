import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
	Treemap,
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

export function TopPopulationBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.sort((a, b) => b.population - a.population)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
			fullName: c.name,
			population: c.population,
			emoji: c.emoji,
			continent: c.continent,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
					<XAxis
						type="number"
						tickFormatter={(v: number) => formatCompact(v)}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						type="category"
						dataKey="name"
						width={100}
						axisLine={false}
						tickLine={false}
						tick={{ fontSize: 11 }}
					/>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(value: number) => [formatCompact(value), 'Population']}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload
								? `${payload[0].payload.emoji} ${payload[0].payload.fullName}`
								: _
						}
					/>
					<Bar dataKey="population" radius={[0, 4, 4, 0]} maxBarSize={24}>
						{data.map((entry, i) => (
							<Cell key={i} fill={getContinentColor(entry.continent)} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

export function TopAreaBar({ countries }: { countries: Country[] }) {
	const data = [...countries]
		.sort((a, b) => b.areaSqKm - a.areaSqKm)
		.slice(0, 10)
		.map((c) => ({
			name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
			fullName: c.name,
			area: c.areaSqKm,
			emoji: c.emoji,
			continent: c.continent,
		}))

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer>
				<BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
					<XAxis
						type="number"
						tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						type="category"
						dataKey="name"
						width={100}
						axisLine={false}
						tickLine={false}
						tick={{ fontSize: 11 }}
					/>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(value: number) => [
							`${new Intl.NumberFormat('en-US').format(value)} km²`,
							'Area',
						]}
						labelFormatter={(_: string, payload: Array<{ payload?: { fullName?: string; emoji?: string } }>) =>
							payload[0]?.payload
								? `${payload[0].payload.emoji} ${payload[0].payload.fullName}`
								: _
						}
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

type TreemapItem = {
	name: string
	size: number
	color: string
	emoji: string
}

type TreemapContentProps = {
	x: number
	y: number
	width: number
	height: number
	name: string
	color: string
	emoji: string
}

function TreemapContent({ x, y, width, height, name, color, emoji }: TreemapContentProps) {
	if (width < 30 || height < 20) return null
	return (
		<g>
			<rect x={x} y={y} width={width} height={height} fill={color} rx={4} opacity={0.85} stroke="#0a0a0b" strokeWidth={2} />
			{width > 50 && height > 35 ? (
				<>
					<text x={x + 6} y={y + 16} fontSize={12} fill="#fff" fontWeight={600}>
						{emoji}
					</text>
					<text
						x={x + 6}
						y={y + 30}
						fontSize={width > 80 ? 10 : 8}
						fill="#fff"
						opacity={0.9}
					>
						{name.length > (width > 100 ? 15 : 8) ? name.slice(0, width > 100 ? 15 : 8) + '...' : name}
					</text>
				</>
			) : null}
		</g>
	)
}

export function PopulationTreemap({ countries }: { countries: Country[] }) {
	const data: TreemapItem[] = [...countries]
		.sort((a, b) => b.population - a.population)
		.slice(0, 30)
		.map((c) => ({
			name: c.name,
			size: c.population,
			color: getContinentColor(c.continent),
			emoji: c.emoji,
		}))

	return (
		<div className="h-[350px] w-full">
			<ResponsiveContainer>
				<Treemap
					data={data}
					dataKey="size"
					stroke="none"
					content={<TreemapContent x={0} y={0} width={0} height={0} name="" color="" emoji="" />}
				>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(value: number) => [formatCompact(value), 'Population']}
					/>
				</Treemap>
			</ResponsiveContainer>
		</div>
	)
}
