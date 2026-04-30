import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { type Country } from '../../lib/api'
import { REGION_COLORS, tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'

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
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
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
