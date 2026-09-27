import { type ReactNode } from 'react'
import { MAP_HEIGHT, MAP_WIDTH, WORLD_DOTS_PATH } from '../lib/world-dots'

type WorldDotsProps = {
	dot?: string
	grid?: string
	size?: number
	label?: string
	className?: string
	children?: ReactNode
}

/** World map drawn from city locations. Overlay children use the 1000x460 space. */
export function WorldDots({
	dot = '#6B6F78',
	grid = '#E4E0D5',
	size = 2.8,
	label = 'World map drawn from city locations',
	className,
	children
}: WorldDotsProps) {
	return (
		<svg
			viewBox={`-4 -4 ${MAP_WIDTH + 8} ${MAP_HEIGHT + 8}`}
			role="img"
			aria-label={label}
			className={className}
			style={{ display: 'block', width: '100%', height: 'auto' }}
		>
			<path
				d="M0 115H1000M0 230H1000M0 345H1000M250 0V460M500 0V460M750 0V460"
				stroke={grid}
				strokeWidth="1"
				fill="none"
			/>
			<path
				fill="none"
				stroke={dot}
				strokeWidth={size}
				strokeLinecap="round"
				d={WORLD_DOTS_PATH}
			/>
			{children}
		</svg>
	)
}
