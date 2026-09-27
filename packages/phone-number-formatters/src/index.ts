import {
	AsYouType,
	getCountryCallingCode,
	parsePhoneNumberFromString,
	type CountryCode
} from 'libphonenumber-js/min'
import { filterOptions, type PickerOption } from 'picker-core'

export type PhoneCountry = {
	iso2: string
	iso3?: string
	name: string
	emoji?: string
	phoneCode?: string
}

export type PhoneCountryOption = PickerOption<string, PhoneCountry> & {
	iso2: string
	callingCode: string
	emoji: string
}

export type PhoneNumberValue = {
	e164: string | null
	national: string
	international: string
	countryCode: string | null
	callingCode: string | null
	isValid: boolean
}

/** Parse a phone string into E.164, national, and validity fields. */
export function parsePhoneNumberValue(
	input: string,
	defaultCountry?: string
): PhoneNumberValue {
	const country = normalizeCountryCode(defaultCountry)
	const parsed = parsePhoneNumberFromString(input, country)
	if (!parsed) {
		return emptyPhoneValue(input, country ?? null)
	}
	return {
		e164: parsed.number,
		national: parsed.formatNational(),
		international: parsed.formatInternational(),
		countryCode: parsed.country ?? country ?? null,
		callingCode: parsed.countryCallingCode
			? `+${parsed.countryCallingCode}`
			: null,
		isValid: parsed.isValid()
	}
}

/** Format a phone string as E.164, national, or international. */
export function formatPhoneNumberValue(
	input: string,
	defaultCountry?: string,
	format: 'e164' | 'national' | 'international' = 'international'
): string {
	const parsed = parsePhoneNumberValue(input, defaultCountry)
	if (format === 'e164') return parsed.e164 ?? input
	if (format === 'national') return parsed.national
	return parsed.international
}

/** Whether the input is a valid phone number for the default country. */
export function isValidPhoneNumberValue(
	input: string,
	defaultCountry?: string
): boolean {
	return parsePhoneNumberValue(input, defaultCountry).isValid
}

/** Infer an ISO2 country from an E.164 or international number. */
export function inferCountryFromPhoneNumber(input: string): string | null {
	return parsePhoneNumberFromString(input)?.country ?? null
}

/** As-you-type national formatting for a country. */
export function formatPhoneAsYouType(input: string, country?: string): string {
	const formatter = new AsYouType(normalizeCountryCode(country))
	return formatter.input(input)
}

/** Turn country rows into calling-code picker options. */
export function normalizePhoneCountries(
	countries: PhoneCountry[]
): PhoneCountryOption[] {
	return countries
		.map((country) => {
			const iso2 = country.iso2.toUpperCase()
			const callingCode =
				normalizeCallingCode(country.phoneCode) ?? safeCallingCode(iso2)
			return {
				value: iso2,
				label: `${country.emoji ? `${country.emoji} ` : ''}${country.name} ${callingCode}`,
				iso2,
				callingCode,
				emoji: country.emoji ?? '',
				keywords: [
					country.name,
					country.iso2,
					country.iso3 ?? '',
					callingCode,
					country.phoneCode ?? ''
				].filter(Boolean),
				meta: country
			}
		})
		.filter((country) => country.callingCode.length > 1)
}

/** Accent-insensitive filter over calling-code options. */
export function filterPhoneCountries(
	countries: PhoneCountryOption[],
	query: string
): PhoneCountryOption[] {
	return filterOptions(countries, query, {
		getOptionKeywords: (country) => country.keywords ?? []
	})
}

function emptyPhoneValue(
	input: string,
	country: string | null
): PhoneNumberValue {
	return {
		e164: null,
		national: input,
		international: input,
		countryCode: country,
		callingCode: country ? safeCallingCode(country) : null,
		isValid: false
	}
}

function normalizeCountryCode(country?: string): CountryCode | undefined {
	if (!country) return undefined
	return country.toUpperCase() as CountryCode
}

function normalizeCallingCode(value?: string): string | null {
	if (!value) return null
	const stripped = value.replace(/[^\d]/g, '')
	return stripped ? `+${stripped}` : null
}

function safeCallingCode(country: string): string {
	try {
		return `+${getCountryCallingCode(country as CountryCode)}`
	} catch {
		return ''
	}
}
