import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { type Country } from '@geocoded/client'
import { tooltipStyle, tooltipLabelStyle, tooltipItemStyle } from '../../lib/format'
import { useCompactChart } from './responsive'

function Donut({
	data,
	colors,
}: {
	data: { name: string; value: number }[]
	colors: string[]
}) {
	const { isCompact } = useCompactChart()

	return (
		<div className="h-[210px] w-full sm:h-[200px]">
			<ResponsiveContainer>
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						outerRadius={isCompact ? 66 : 80}
						innerRadius={isCompact ? 36 : 45}
						paddingAngle={3}
						strokeWidth={0}
					>
						{data.map((_, i) => (
							<Cell key={i} fill={colors[i % colors.length]} />
						))}
					</Pie>
					<Tooltip
						contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
						formatter={(v: number, name: string) => [`${v} countries`, name]}
					/>
				</PieChart>
			</ResponsiveContainer>
			<div className="flex flex-wrap justify-center gap-2 sm:gap-3">
				{data.map((d, i) => (
					<div key={d.name} className="flex items-center gap-1.5 text-xs text-text-muted">
						<div
							className="size-2 rounded-full"
							style={{ backgroundColor: colors[i % colors.length] }}
						/>
						{d.name} ({d.value})
					</div>
				))}
			</div>
		</div>
	)
}

function countBy(countries: Country[], field: keyof Country): { name: string; value: number }[] {
	const counts = new Map<string, number>()
	for (const c of countries) {
		const val = (c[field] as string) || 'Unknown'
		counts.set(val, (counts.get(val) || 0) + 1)
	}
	return [...counts.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value)
}

export function DrivingSideDonut({ countries }: { countries: Country[] }) {
	const data = countBy(countries, 'drivingSide')
	return <Donut data={data} colors={['#3b82f6', '#f59e0b', '#6b7280']} />
}

export function MeasurementDonut({ countries }: { countries: Country[] }) {
	const data = countBy(countries, 'measurementSystem')
	return <Donut data={data} colors={['#10b981', '#ef4444', '#a855f7', '#6b7280']} />
}

export function FirstDayDonut({ countries }: { countries: Country[] }) {
	const data = countBy(countries, 'firstDayOfWeek')
	return <Donut data={data} colors={['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#6b7280']} />
}

export function TimeFormatDonut({ countries }: { countries: Country[] }) {
	const data = countBy(countries, 'timeFormat')
	return <Donut data={data} colors={['#06b6d4', '#f97316', '#6b7280']} />
}
