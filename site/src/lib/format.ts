const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
})

const fullFormatter = new Intl.NumberFormat('en-US')

const percentFormatter = new Intl.NumberFormat('en-US', {
	style: 'percent',
	maximumFractionDigits: 1,
})

export function formatCompact(n: number): string {
	if (n === 0 || n == null) return '0'
	return compactFormatter.format(n)
}

export function formatFull(n: number): string {
	if (n == null) return '0'
	return fullFormatter.format(n)
}

export function formatPercent(n: number): string {
	if (n == null) return '0%'
	return percentFormatter.format(n / 100)
}

export function formatArea(sqKm: number): string {
	if (sqKm >= 1_000_000) {
		return `${(sqKm / 1_000_000).toFixed(1)}M km²`
	}
	if (sqKm >= 1_000) {
		return `${(sqKm / 1_000).toFixed(0)}K km²`
	}
	return `${sqKm.toFixed(0)} km²`
}

export function formatDensity(pop: number, area: number): string {
	if (!area) return 'N/A'
	const density = pop / area
	return `${density.toFixed(1)}/km²`
}

export const CONTINENT_COLORS: Record<string, string> = {
	Africa: '#c87f32',
	Americas: '#2da06a',
	'North America': '#2da06a',
	'South America': '#2da06a',
	Asia: '#3b82f6',
	Europe: '#a855f7',
	Oceania: '#06b6d4',
	Antarctica: '#94a3b8',
}

export const REGION_COLORS: Record<string, string> = {
	Africa: '#c87f32',
	Americas: '#2da06a',
	Asia: '#3b82f6',
	Europe: '#a855f7',
	Oceania: '#06b6d4',
	Polar: '#94a3b8',
}

export function getContinentColor(continent: string): string {
	return CONTINENT_COLORS[continent] || '#6b7280'
}
