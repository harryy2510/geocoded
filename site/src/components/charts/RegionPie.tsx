import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { type Country } from '../../lib/api'
import { REGION_COLORS } from '../../lib/format'

const tooltipStyle = {
	backgroundColor: '#131316',
	border: '1px solid #2a2a30',
	borderRadius: '8px',
	fontSize: '12px',
	color: '#e5e5e5',
}

export function RegionPie({ countries }: { countries: Country[] }) {
	const regionCounts = new Map<string, number>()
	for (const c of countries) {
		const region = c.region || 'Other'
		regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
	}

	const data = [...regionCounts.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value)

	const COLORS = data.map((d) => REGION_COLORS[d.name] || '#6b7280')

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
						outerRadius={110}
						innerRadius={55}
						paddingAngle={2}
						strokeWidth={0}
					>
						{data.map((_, i) => (
							<Cell key={i} fill={COLORS[i]} />
						))}
					</Pie>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(value: number) => [`${value} countries`, '']}
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
