import { getContinentColor, resolveContinentName } from '../../lib/format'

/**
 * Shared dark nivo theme matching the site: pure black canvas, soft white
 * text, hairline grid, glassy tooltip. Imported by every nivo chart and by the
 * Dashboard, Explorer, and Quiz surfaces.
 */
export const nivoTheme = {
	background: 'transparent',
	text: {
		fill: '#e5e5e5',
		fontFamily: 'Space Grotesk, sans-serif',
		fontSize: 12,
	},
	axis: {
		domain: {
			line: {
				stroke: 'rgba(255,255,255,0.08)',
			},
		},
		ticks: {
			line: {
				stroke: 'rgba(255,255,255,0.08)',
			},
			text: {
				fill: '#a1a1aa',
				fontSize: 11,
			},
		},
		legend: {
			text: {
				fill: '#d4d4d8',
				fontSize: 11,
			},
		},
	},
	grid: {
		line: {
			stroke: 'rgba(255,255,255,0.06)',
		},
	},
	tooltip: {
		container: {
			background: 'rgba(17,17,20,0.96)',
			color: '#e5e5e5',
			fontSize: 12,
			borderRadius: 10,
			border: '1px solid rgba(255,255,255,0.08)',
			boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
		},
	},
	labels: {
		text: {
			fill: '#e5e5e5',
			fontFamily: 'Space Grotesk, sans-serif',
		},
	},
	legends: {
		text: {
			fill: '#a1a1aa',
			fontSize: 11,
		},
	},
	annotations: {
		text: {
			fill: '#e5e5e5',
		},
	},
}

/**
 * Ordered categorical ramp for charts where continent coloring is not the
 * meaningful encoding. Bright, evenly-spaced hues that read on pure black.
 */
export const CHART_COLORS = [
	'#3b82f6',
	'#22c55e',
	'#f59e0b',
	'#a855f7',
	'#06b6d4',
	'#ef4444',
	'#ec4899',
	'#14b8a6',
]

/**
 * Resolve a continent code (AF/AS/EU/NA/SA/OC/AN) or display name to its
 * canonical color. Reuses the v1-free mappings in lib/format.ts.
 */
export function continentColor(codeOrName: string): string {
	return getContinentColor(codeOrName)
}

/**
 * Convenience: continent display name from a code (AF -> Africa), reusing the
 * v1-free resolver in lib/format.ts.
 */
export function continentName(code: string): string {
	return resolveContinentName(code)
}

/**
 * Pick a categorical color from CHART_COLORS by index, wrapping around.
 */
export function rampColor(index: number): string {
	return CHART_COLORS[((index % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length]
}

export type ChartTooltipRow = {
	color?: string
	label: string
	value: string
}

/**
 * Shared markup builder for custom nivo tooltips so every chart renders the
 * same glassy card. Returns the props nivo charts expect for a tooltip node;
 * the actual JSX wrapper lives in ChartTooltip.tsx.
 */
export const tooltipContainerStyle: React.CSSProperties = {
	background: 'rgba(17,17,20,0.96)',
	color: '#e5e5e5',
	fontSize: 12,
	borderRadius: 10,
	border: '1px solid rgba(255,255,255,0.08)',
	boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
	padding: '8px 12px',
	display: 'flex',
	flexDirection: 'column',
	gap: 4,
}
