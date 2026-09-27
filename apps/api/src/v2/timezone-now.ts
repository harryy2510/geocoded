import { type V2TimezoneNow } from './types'

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
const TRANSITION_SEARCH_DAYS = 400

// Current local time, offset and next DST transition for an IANA zone, from the runtime's tz data.
export function timezoneNow(
	timezone: string,
	standardOffsetSeconds: number,
	now: Date = new Date()
): V2TimezoneNow {
	const utcOffsetSeconds = offsetSeconds(timezone, now)
	return {
		timezone,
		localTime: localIso(timezone, now, utcOffsetSeconds),
		utcOffset: formatOffset(utcOffsetSeconds),
		utcOffsetSeconds,
		isDst: utcOffsetSeconds !== standardOffsetSeconds,
		abbreviation: zoneName(timezone, now, 'short'),
		nextTransition: nextTransition(timezone, now, utcOffsetSeconds)
	}
}

function offsetSeconds(timezone: string, at: Date): number {
	const name = zoneName(timezone, at, 'longOffset')
	const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name)
	if (!match) return 0
	const [, sign, hours, minutes, seconds] = match
	const total =
		Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds ?? '0')
	return sign === '-' ? -total : total
}

function formatOffset(seconds: number): string {
	const sign = seconds < 0 ? '-' : '+'
	const absolute = Math.abs(seconds)
	const hours = String(Math.floor(absolute / 3600)).padStart(2, '0')
	const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, '0')
	return `UTC${sign}${hours}:${minutes}`
}

function nextTransition(
	timezone: string,
	now: Date,
	currentOffset: number
): V2TimezoneNow['nextTransition'] {
	// Transitions fall on whole minutes, so searching on a minute grid finds them exactly.
	const start = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS
	let lower = start
	for (let day = 1; day <= TRANSITION_SEARCH_DAYS; day += 1) {
		const upper = start + day * DAY_MS
		const upperOffset = offsetSeconds(timezone, new Date(upper))
		if (upperOffset === currentOffset) {
			lower = upper
			continue
		}
		// Narrow to the first minute with the new offset.
		let low = lower
		let high = upper
		while (high - low > MINUTE_MS) {
			const middle = low + Math.floor((high - low) / 2 / MINUTE_MS) * MINUTE_MS
			if (offsetSeconds(timezone, new Date(middle)) === currentOffset)
				low = middle
			else high = middle
		}
		return {
			at: new Date(high).toISOString(),
			utcOffset: formatOffset(upperOffset)
		}
	}
	return null
}

function zoneName(
	timezone: string,
	at: Date,
	style: 'short' | 'longOffset'
): string {
	const part = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		timeZoneName: style
	})
		.formatToParts(at)
		.find((item) => item.type === 'timeZoneName')
	return part?.value ?? ''
}

function localIso(timezone: string, at: Date, offset: number): string {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(at)
			.map((item) => [item.type, item.value])
	)
	const zone = formatOffset(offset).slice(3)
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${zone}`
}
