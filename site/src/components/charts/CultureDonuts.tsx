import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { type Country } from '../../lib/api'

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

function Donut({
	data,
	colors,
}: {
	data: { name: string; value: number }[]
	colors: string[]
}) {
	return (
		<div className="h-[200px] w-full">
			<ResponsiveContainer>
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						outerRadius={80}
						innerRadius={45}
						paddingAngle={3}
						strokeWidth={0}
					>
						{data.map((_, i) => (
							<Cell key={i} fill={colors[i % colors.length]} />
						))}
					</Pie>
					<Tooltip
						contentStyle={tooltipStyle}
						formatter={(v: number, name: string) => [`${v} countries`, name]}
					/>
				</PieChart>
			</ResponsiveContainer>
			<div className="flex flex-wrap justify-center gap-3">
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
