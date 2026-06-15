import { type ReactNode } from 'react'
import { tooltipContainerStyle, type ChartTooltipRow } from './nivoTheme'

/**
 * Glassy dark tooltip shared by every nivo chart. Pass a title and one or more
 * rows; each row gets an optional color chip.
 */
export function ChartTooltip({
	title,
	rows,
}: {
	title: ReactNode
	rows: ChartTooltipRow[]
}) {
	return (
		<div style={tooltipContainerStyle}>
			<div className="text-[11px] font-semibold tracking-tight text-white/90">{title}</div>
			{rows.map((row, i) => (
				<div key={i} className="flex items-center gap-2 text-[12px] text-white/70">
					{row.color ? (
						<span
							className="inline-block h-2.5 w-2.5 rounded-[2px]"
							style={{ background: row.color }}
						/>
					) : null}
					<span className="text-white/45">{row.label}</span>
					<span className="ml-auto font-medium tabular-nums text-white/90">{row.value}</span>
				</div>
			))}
		</div>
	)
}
