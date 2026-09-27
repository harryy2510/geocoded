import { createGeocodedClient, type TimezoneEntry } from '@geocoded/client'
import {
	DEFAULT_PAGE_LIMIT,
	filterOptions,
	pageFromArray,
	type DataSource,
	type PageResult,
	type PageRequest,
	type PickerOption
} from 'picker-core'

export type TimeZoneValue = string

export type { TimezoneEntry }

export type TimeZoneOption = PickerOption<TimeZoneValue, TimezoneEntry> & {
	countryCodes: string[]
	coordinates: string
}

export type TimeZoneFormat = 'name' | 'name-country' | 'offset-name'

/** Turn a `/v2/timezones` row into a picker option. */
export function toTimeZoneOption(entry: TimezoneEntry): TimeZoneOption {
	return {
		value: entry.timezone,
		label: formatTimeZoneLabel(entry),
		countryCodes: entry.countryCodes,
		coordinates: entry.coordinates ?? '',
		keywords: [
			entry.timezone,
			entry.name,
			entry.location,
			entry.area,
			...entry.countryCodes
		].filter(Boolean),
		meta: entry
	}
}

/** Format a timezone label. Default is `name-country`, e.g. `Asia/Dubai (AE)`. */
export function formatTimeZoneLabel(
	entry: Pick<
		TimezoneEntry,
		'timezone' | 'countryCodes' | 'standardOffsetName' | 'name'
	>,
	format: TimeZoneFormat = 'name-country'
): string {
	const countrySuffix = entry.countryCodes.length
		? ` (${entry.countryCodes.join(', ')})`
		: ''
	if (format === 'name') return entry.timezone
	if (format === 'offset-name') {
		return `${entry.standardOffsetName ?? ''} ${entry.timezone}`.trim()
	}
	return `${entry.timezone}${countrySuffix}`
}

/** Accent-insensitive filter over timezone options. */
export function filterTimeZones(
	options: TimeZoneOption[],
	query: string
): TimeZoneOption[] {
	return filterOptions(options, query, {
		getOptionKeywords: (option) => option.keywords ?? []
	})
}

/** Group timezone options by ISO country code. */
export function groupTimeZonesByCountry(
	options: TimeZoneOption[]
): Record<string, TimeZoneOption[]> {
	const groups: Record<string, TimeZoneOption[]> = {}
	for (const option of options) {
		const codes = option.countryCodes.length ? option.countryCodes : ['ZZ']
		for (const code of codes) {
			groups[code] ??= []
			groups[code].push(option)
		}
	}
	return groups
}

/**
 * Paginated timezone data source for pickers.
 * Uses `/v2/timezones?q=` unless `entries` are passed in.
 */
export function createTimeZoneDataSource(
	options: {
		apiUrl?: string
		entries?: TimezoneEntry[]
	} = {}
): DataSource<TimeZoneOption> {
	const client = createGeocodedClient({
		apiUrl: options.apiUrl
	})
	return async (request: PageRequest) => {
		const limit = request.limit ?? DEFAULT_PAGE_LIMIT
		if (options.entries) {
			return pageFromArray(
				filterTimeZones(
					options.entries.map(toTimeZoneOption),
					request.query ?? ''
				),
				{ ...request, limit }
			)
		}
		const page = await client.fetchTimezonePage({
			fields: [
				'timezone',
				'name',
				'location',
				'area',
				'countryCodes',
				'coordinates',
				'standardOffsetName'
			],
			limit,
			offset: request.offset,
			q: request.query,
			signal: request.signal
		})
		return {
			data: page.data.map(toTimeZoneOption),
			meta: page.meta
		}
	}
}

/** Fetch the first page of timezone options from the default API. */
export async function getTimeZoneOptions(
	request: PageRequest = {}
): Promise<PageResult<TimeZoneOption>> {
	return await createTimeZoneDataSource()(request)
}
