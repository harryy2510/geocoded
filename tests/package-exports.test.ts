import { describe, expect, test } from 'bun:test'
import { createGeocodedClient } from '@geocoded/client'
import { toCurrencyCodeOption } from 'currency-code-formatters'
import { parsePhoneNumberValue } from 'phone-number-formatters'
import { DEFAULT_PAGE_LIMIT } from 'picker-core'
import {
	CityPicker,
	CountryPicker,
	CountryRegionPicker,
	RegionPicker
} from 'react-country-region-picker'
import {
	CountryStateCityPicker,
	StatePicker
} from 'react-country-state-city-picker'
import { CurrencyCodePicker } from 'react-currency-code-picker'
import {
	NativeCountryPicker,
	NativeCountryRegionPicker,
	useNativeCountryPicker
} from 'react-native-country-region-picker'
import {
	NativeCurrencyCodePicker,
	useNativeCurrencyCodePicker
} from 'react-native-currency-code-picker'
import {
	NativePhoneNumberField,
	useNativePhoneNumberField
} from 'react-native-phone-number-field'
import {
	NativePickerField,
	useNativePickerField
} from 'react-native-picker-core'
import {
	NativeTimeZonePicker,
	useNativeTimeZonePicker
} from 'react-native-time-zone-picker'
import { PhoneNumberField } from 'react-phone-number-field'
import { PickerField } from 'react-picker-core'
import { TimeZonePicker } from 'react-time-zone-picker'
import { createTimeZoneDataSource } from 'use-timezones'

describe('package exports', () => {
	test('resolves shared and formatter public entrypoints', () => {
		expect(DEFAULT_PAGE_LIMIT).toBe(100)
		expect(typeof createGeocodedClient).toBe('function')
		expect(typeof toCurrencyCodeOption).toBe('function')
		expect(parsePhoneNumberValue('+14155552671').isValid).toBe(true)
		expect(typeof createTimeZoneDataSource).toBe('function')
	})

	test('resolves React package public entrypoints', () => {
		expect(typeof PickerField).toBe('function')
		expect(typeof CountryPicker).toBe('function')
		expect(typeof RegionPicker).toBe('function')
		expect(typeof CityPicker).toBe('function')
		expect(typeof CountryRegionPicker).toBe('function')
		expect(CountryStateCityPicker).toBe(CountryRegionPicker)
		expect(StatePicker).toBe(RegionPicker)
		expect(typeof CurrencyCodePicker).toBe('function')
		expect(typeof PhoneNumberField).toBe('function')
		expect(typeof TimeZonePicker).toBe('function')
	})

	test('resolves React Native components and hooks', () => {
		expect(typeof NativePickerField).toBe('function')
		expect(typeof NativeCountryPicker).toBe('function')
		expect(typeof NativeCountryRegionPicker).toBe('function')
		expect(typeof NativeCurrencyCodePicker).toBe('function')
		expect(typeof NativePhoneNumberField).toBe('function')
		expect(typeof NativeTimeZonePicker).toBe('function')
		expect(typeof useNativePickerField).toBe('function')
		expect(typeof useNativeCountryPicker).toBe('function')
		expect(typeof useNativeCurrencyCodePicker).toBe('function')
		expect(typeof useNativePhoneNumberField).toBe('function')
		expect(typeof useNativeTimeZonePicker).toBe('function')
	})
})
