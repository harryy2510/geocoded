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
import {
	NativePickerField,
	loadReactNativePrimitives,
	type NativePickerStyles,
	type StyleProp,
	type TextStyle,
	type ViewStyle
} from 'react-native-picker-core'

export type NativePhoneNumberFieldProps = {
	value?: string
	defaultValue?: string
	onValueChange?: (value: PhoneNumberValue) => void
	country?: string
	defaultCountry?: string
	onCountryChange?: (countryCode: string | null) => void
	apiUrl?: string
	countries?: PhoneCountry[]
	labels?: {
		country?: string
		phone?: string
		countryPlaceholder?: string
		phonePlaceholder?: string
	}
	styles?: {
		root?: StyleProp<ViewStyle>
		label?: StyleProp<TextStyle>
		input?: StyleProp<TextStyle>
		countryPicker?: NativePickerStyles
	}
}

export type NativePhoneNumberFieldState = {
	value: string
	country: string | null
	parsed: PhoneNumberValue
	countryOptions: PhoneCountryOption[]
	setValue: (value: string) => void
	setCountry: (country: string | null) => void
}

/** Headless native phone-number state. Loads countries from `/v2/countries`. */
export function useNativePhoneNumberField(
	props: NativePhoneNumberFieldProps = {}
): NativePhoneNumberFieldState {
	const [internal, setInternal] = useState(props.defaultValue ?? '')
	const [country, setCountryState] = useState<string | null>(
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

	function setValue(next: string) {
		const formatted = formatPhoneAsYouType(next, country ?? undefined)
		if (props.value === undefined) setInternal(formatted)
		props.onValueChange?.(
			parsePhoneNumberValue(formatted, country ?? undefined)
		)
	}

	function setCountry(next: string | null) {
		setCountryState(next)
		props.onCountryChange?.(next)
		props.onValueChange?.(parsePhoneNumberValue(value, next ?? undefined))
	}

	return {
		value,
		country,
		parsed: parsePhoneNumberValue(value, country ?? undefined),
		countryOptions: normalizePhoneCountries(countries),
		setValue,
		setCountry
	}
}

/** Native phone input with a country picker and formatted text field. */
export function NativePhoneNumberField(
	props: NativePhoneNumberFieldProps = {}
) {
	const { Text, TextInput, View } = loadReactNativePrimitives()
	const field = useNativePhoneNumberField(props)
	const selectedCountry =
		field.countryOptions.find((country) => country.value === field.country) ??
		null

	return createElement(
		View,
		{ style: [{ gap: 12 }, props.styles?.root] },
		createElement(NativePickerField<PhoneCountryOption>, {
			labels: {
				label: props.labels?.country,
				placeholder: props.labels?.countryPlaceholder ?? 'Select country',
				searchPlaceholder: 'Search countries'
			},
			getOptionLabel: (country) => country.label,
			getOptionValue: (country) => country.value,
			onValueChange: (value) => field.setCountry(value),
			options: field.countryOptions,
			selectedOption: selectedCountry,
			styles: props.styles?.countryPicker,
			value: field.country
		}),
		props.labels?.phone
			? createElement(
					Text,
					{ style: [nativePhoneStyles.label, props.styles?.label] },
					props.labels.phone
				)
			: null,
		createElement(TextInput, {
			keyboardType: 'phone-pad',
			onChangeText: field.setValue,
			placeholder: props.labels?.phonePlaceholder ?? 'Phone number',
			style: [nativePhoneStyles.input, props.styles?.input],
			value: field.value
		})
	)
}

const nativePhoneStyles = {
	label: {
		fontSize: 14,
		fontWeight: '600'
	},
	input: {
		borderColor: 'rgba(127,127,127,0.4)',
		borderRadius: 12,
		borderWidth: 1,
		fontSize: 16,
		minHeight: 48,
		paddingHorizontal: 14
	}
}

export type { PhoneNumberValue }
