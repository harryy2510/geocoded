import { describe, expect, test } from 'bun:test'
import {
	createTimeZoneDataSource,
	filterTimeZones,
	groupTimeZonesByCountry,
	toTimeZoneOption
} from 'use-timezones'
import type { TimezoneEntry } from '@geocoded/client'

const zones = [
	zone('America/New_York', ['US'], 'Eastern Time'),
	zone('Asia/Dubai', ['AE'], 'Gulf Standard Time'),
	zone('Europe/Zurich', ['CH'], 'Central European Time')
]

describe('use-timezones', () => {
	test('normalizes timezone options', () => {
		expect(toTimeZoneOption(zones[0]!).value).toBe('America/New_York')
		expect(toTimeZoneOption(zones[0]!).label).toBe('America/New_York (US)')
	})

	test('filters by country code and label', () => {
		const options = zones.map(toTimeZoneOption)

		expect(filterTimeZones(options, 'dubai').map((zone) => zone.value)).toEqual(
			['Asia/Dubai']
		)
		expect(filterTimeZones(options, 'ch').map((zone) => zone.value)).toEqual([
			'Europe/Zurich'
		])
	})

	test('groups by country', () => {
		const grouped = groupTimeZonesByCountry(zones.map(toTimeZoneOption))

		expect(grouped.US?.[0]?.value).toBe('America/New_York')
	})

	test('data source pages with limit 100 by default', async () => {
		const page = await createTimeZoneDataSource({ entries: zones })({})

		expect(page.meta.limit).toBe(100)
		expect(page.data).toHaveLength(3)
	})
})

function zone(
	timezone: string,
	countryCodes: string[],
	name: string
): TimezoneEntry {
	return {
		abbreviation: '',
		area: '',
		coordinates: '',
		countryCodes,
		daylightAbbreviation: null,
		daylightName: null,
		daylightOffset: null,
		daylightOffsetName: null,
		latitude: 0,
		location: '',
		longitude: 0,
		name,
		observesDst: false,
		standardAbbreviation: '',
		standardName: name,
		standardOffset: 0,
		standardOffsetName: 'UTC+00:00',
		timezone
	}
}
