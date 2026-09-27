const fullFormatter = new Intl.NumberFormat('en-US')

const compactFormatters = [1, 2].map(
	(digits) =>
		new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: digits
		})
)

/** 123.4M, 1.46B: two decimals for billions, one below that. */
export function formatCompact(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–'
	return compactFormatters[Math.abs(n) >= 1e9 ? 1 : 0].format(n)
}

/** 8.07 billion, 3.4 million. */
export function formatCompactLong(n: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		compactDisplay: 'long',
		maximumFractionDigits: Math.abs(n) >= 1e9 ? 2 : 1
	}).format(n)
}

export function formatFull(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–'
	return fullFormatter.format(n)
}

/** Fixed decimals with thousands separators: 341.5, 377,835. */
export function formatNumber(n: number | null | undefined, digits = 1): string {
	if (n === null || n === undefined || !Number.isFinite(n)) return '–'
	return n.toLocaleString('en-US', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	})
}

/** A value that is already a percentage: 30 -> "30.0%". */
export function formatPercent(
	n: number | null | undefined,
	digits = 1
): string {
	if (n === null || n === undefined || !Number.isFinite(n)) return '–'
	return `${formatNumber(n, digits)}%`
}

export function formatUsd(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–'
	return `$${formatNumber(n, 0)}`
}

/** 377835 -> "377,835 km²", 17098246 -> "17.1M km²". */
export function formatArea(sqKm: number | null | undefined): string {
	if (!sqKm) return '–'
	if (sqKm >= 10_000_000) return `${(sqKm / 1_000_000).toFixed(1)}M km²`
	return `${formatNumber(sqKm, sqKm < 10 ? 1 : 0)} km²`
}

/** 32400 -> "UTC+9", 19800 -> "UTC+5:30". */
export function formatOffset(seconds: number): string {
	const sign = seconds < 0 ? '−' : '+'
	const abs = Math.abs(seconds)
	const hours = Math.floor(abs / 3600)
	const minutes = Math.round((abs % 3600) / 60)
	return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

/** Local wall-clock time in an IANA zone, e.g. "14:05". */
export function formatClock(timeZone: string, date = new Date()): string {
	try {
		return new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit'
		}).format(date)
	} catch {
		return '–'
	}
}

export function formatOrdinal(n: number): string {
	const rules = new Intl.PluralRules('en-US', { type: 'ordinal' })
	const suffix: Partial<Record<Intl.LDMLPluralRule, string>> = {
		one: 'st',
		two: 'nd',
		few: 'rd'
	}
	return `${n}${suffix[rules.select(n)] ?? 'th'}`
}

export const CONTINENTS = [
	{ code: 'AF', name: 'Africa' },
	{ code: 'AS', name: 'Asia' },
	{ code: 'EU', name: 'Europe' },
	{ code: 'NA', name: 'North America' },
	{ code: 'SA', name: 'South America' },
	{ code: 'OC', name: 'Oceania' },
	{ code: 'AN', name: 'Antarctica' }
] as const

export function continentName(code: string): string {
	return CONTINENTS.find((c) => c.code === code)?.name ?? code
}

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function languageName(code: string): string {
	try {
		return languageNames.of(code) ?? code
	} catch {
		return code
	}
}

const WEEKDAYS: Record<string, string> = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday'
}

export function weekdayName(code: string | null | undefined): string {
	if (!code) return '–'
	return WEEKDAYS[code.toLowerCase()] ?? code
}

export function capitalize(value: string | null | undefined): string {
	if (!value) return '–'
	return value.charAt(0).toUpperCase() + value.slice(1)
}

export function countryHref(code: string): string {
	return `/countries/${code.toLowerCase()}`
}
