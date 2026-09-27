import { describe, expect, test } from 'bun:test'
import {
	filterPhoneCountries,
	formatPhoneNumberValue,
	inferCountryFromPhoneNumber,
	isValidPhoneNumberValue,
	normalizePhoneCountries,
	parsePhoneNumberValue
} from 'phone-number-formatters'

const countries = [
	{
		iso2: 'US',
		iso3: 'USA',
		name: 'United States',
		emoji: '🇺🇸',
		phoneCode: '+1'
	},
	{
		iso2: 'AE',
		iso3: 'ARE',
		name: 'United Arab Emirates',
		emoji: '🇦🇪',
		phoneCode: '+971'
	}
]

describe('phone-number-formatters', () => {
	test('parses valid phone numbers to structured values', () => {
		const value = parsePhoneNumberValue('+14155552671')

		expect(value.e164).toBe('+14155552671')
		expect(value.countryCode).toBe('US')
		expect(value.isValid).toBe(true)
	})

	test('formats national input with a default country', () => {
		expect(isValidPhoneNumberValue('(415) 555-2671', 'US')).toBe(true)
		expect(formatPhoneNumberValue('(415) 555-2671', 'US', 'e164')).toBe(
			'+14155552671'
		)
	})

	test('infers country from E.164 input', () => {
		expect(inferCountryFromPhoneNumber('+971501234567')).toBe('AE')
	})

	test('normalizes and filters calling-code country options', () => {
		const options = normalizePhoneCountries(countries)

		expect(options.map((option) => option.callingCode)).toEqual(['+1', '+971'])
		expect(
			filterPhoneCountries(options, '971').map((option) => option.iso2)
		).toEqual(['AE'])
	})
})
