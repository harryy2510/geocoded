// Small presentational helpers shared across explorer cards and detail panels.

// Regional-indicator flag emoji from an ISO2 country code.
export function flagEmoji(iso2: string | null | undefined): string {
	if (!iso2 || iso2.length !== 2) return '🌐'
	const base = 0x1f1e6
	const upper = iso2.toUpperCase()
	const first = upper.codePointAt(0)
	const second = upper.codePointAt(1)
	if (first == null || second == null) return '🌐'
	return String.fromCodePoint(base + first - 65, base + second - 65)
}

// "borderCrossing" / "multimodal" -> "border crossing" / "multimodal"
export function formatToken(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/_/g, ' ')
		.toLowerCase()
}

// standardOffset is in seconds (e.g. 0, 3600, -18000). Render as "+05:30".
export function formatOffset(seconds: number | null | undefined): string {
	if (seconds == null) return 'N/A'
	const sign = seconds < 0 ? '-' : '+'
	const abs = Math.abs(seconds)
	const hours = Math.floor(abs / 3600)
	const minutes = Math.floor((abs % 3600) / 60)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${sign}${pad(hours)}:${pad(minutes)}`
}

export function formatCoords(
	lat: string | number | null | undefined,
	lon: string | number | null | undefined
): string {
	const latNum = lat == null ? null : Number(lat)
	const lonNum = lon == null ? null : Number(lon)
	if (latNum == null || lonNum == null || !Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
		return 'N/A'
	}
	return `${latNum.toFixed(4)}, ${lonNum.toFixed(4)}`
}

export function dash(value: string | number | null | undefined): string {
	if (value == null || value === '') return '—'
	return String(value)
}
