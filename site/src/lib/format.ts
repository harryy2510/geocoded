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
	if (sqKm < 1 && sqKm > 0) {
		return `${sqKm.toFixed(2)} km²`
	}
	return `${sqKm.toFixed(0)} km²`
}

export function formatDensity(pop: number, area: number): string {
	if (!area) return 'N/A'
	const density = pop / area
	return `${density.toFixed(1)}/km²`
}

export const axisTickStyle = { fill: '#a1a1aa', fontSize: 11 }

export const tooltipStyle = {
	backgroundColor: 'rgba(17, 17, 20, 0.95)',
	border: '1px solid rgba(255, 255, 255, 0.08)',
	borderRadius: '10px',
	fontSize: '12px',
	color: '#e5e5e5',
	backdropFilter: 'blur(12px)',
	boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
	padding: '8px 12px',
}

export const tooltipLabelStyle = { color: '#e5e5e5' }

export const tooltipItemStyle = { color: '#d4d4d8' }

const CONTINENT_CODE_TO_NAME: Record<string, string> = {
	AF: 'Africa',
	AN: 'Antarctica',
	AS: 'Asia',
	EU: 'Europe',
	NA: 'Americas',
	SA: 'Americas',
	OC: 'Oceania',
}

export function resolveContinentName(code: string): string {
	return CONTINENT_CODE_TO_NAME[code] || code
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
	const resolved = CONTINENT_CODE_TO_NAME[continent] || continent
	return CONTINENT_COLORS[resolved] || '#6b7280'
}
