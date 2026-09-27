import { createGeocodedClient } from '@geocoded/client'
import { createElement, useEffect, useState } from 'react'
import {
	formatPhoneAsYouType,
	normalizePhoneCountries,
	parsePhoneNumberValue,
	type PhoneCountry,
	type PhoneCountryOption,
	type PhoneNumberValue
} from 'phone-number-formatters'
import { PickerField } from 'react-picker-core'

export type PhoneNumberFieldProps = {
	value?: string
	defaultValue?: string
	onValueChange?: (value: PhoneNumberValue) => void
	country?: string
	defaultCountry?: string
	onCountryChange?: (countryCode: string | null) => void
	apiUrl?: string
	countries?: PhoneCountry[]
	name?: string
	required?: boolean
	disabled?: boolean
	placeholder?: string
}

/**
 * Phone input with a searchable country picker.
 * Countries come from `/v2/countries` unless `countries` is passed.
 */
export function PhoneNumberField(props: PhoneNumberFieldProps) {
	const [internal, setInternal] = useState(props.defaultValue ?? '')
	const [country, setCountry] = useState<string | null>(
		props.country ?? props.defaultCountry ?? null
	)
	const [countries, setCountries] = useState<PhoneCountry[]>(
		props.countries ?? []
	)
	const value = props.value ?? internal

	useEffect(() => {
		if (props.countries) return
		const controller = new AbortController()
		const client = createGeocodedClient({
			apiUrl: props.apiUrl
		})
		void client
			.fetchCountries({
				fields: ['name', 'iso2', 'iso3', 'emoji', 'phoneCode'],
				limit: 2000,
				signal: controller.signal
			})
			.then(setCountries)
			.catch(() => undefined)
		return () => controller.abort()
	}, [props.apiUrl, props.countries])

	function changeValue(next: string) {
		const formatted = formatPhoneAsYouType(next, country ?? undefined)
		if (props.value === undefined) setInternal(formatted)
		props.onValueChange?.(
			parsePhoneNumberValue(formatted, country ?? undefined)
		)
	}

	function changeCountry(next: string) {
		setCountry(next || null)
		props.onCountryChange?.(next || null)
		props.onValueChange?.(parsePhoneNumberValue(value, next || undefined))
	}

	const parsed = parsePhoneNumberValue(value, country ?? undefined)
	const countryOptions = normalizePhoneCountries(countries)

	return createElement(
		'div',
		{ 'data-phone-number-field': true },
		props.name
			? createElement('input', {
					type: 'hidden',
					name: props.name,
					value: parsed.e164 ?? value
				})
			: null,
		createElement(PickerField<PhoneCountryOption>, {
			disabled: props.disabled,
			getOptionLabel: (option) => option.label,
			getOptionValue: (option) => option.value,
			labels: {
				placeholder: 'Country',
				searchPlaceholder: 'Search countries'
			},
			onValueChange: (next) => changeCountry(next ?? ''),
			options: countryOptions,
			value: country
		}),
		createElement('input', {
			type: 'tel',
			inputMode: 'tel',
			autoComplete: 'tel',
			value,
			required: props.required,
			disabled: props.disabled,
			placeholder: props.placeholder ?? 'Phone number',
			'aria-invalid': value ? !parsed.isValid : undefined,
			onChange: (event: { currentTarget: { value: string } }) =>
				changeValue(event.currentTarget.value)
		})
	)
}

export type { PhoneNumberValue }
