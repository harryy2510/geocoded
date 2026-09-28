import {
	NativePickerField,
	useNativePickerField,
	type NativePickerComponentProps,
	type NativePickerProps,
	type NativePickerState
} from 'react-native-picker-core'
import { createElement, useMemo } from 'react'
import {
	createTimeZoneDataSource,
	toTimeZoneOption,
	type TimezoneEntry,
	type TimeZoneOption,
	type TimeZoneValue
} from 'use-timezones'

export type NativeTimeZonePickerProps = Omit<
	NativePickerComponentProps<TimeZoneOption, TimeZoneValue>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	entries?: TimezoneEntry[]
}

export function useNativeTimeZonePicker(
	props: NativeTimeZonePickerProps = {}
): NativePickerState<TimeZoneOption, TimeZoneValue> {
	return useNativePickerField(useNativeTimeZonePickerProps(props))
}

/** Native IANA timezone picker against `/v2/timezones`. */
export function NativeTimeZonePicker(props: NativeTimeZonePickerProps = {}) {
	return createElement(NativePickerField<TimeZoneOption, TimeZoneValue>, {
		...useNativeTimeZonePickerProps(props),
		labels: {
			placeholder: 'Select time zone',
			searchPlaceholder: 'Search time zones',
			...props.labels
		}
	})
}

function useNativeTimeZonePickerProps(
	props: NativeTimeZonePickerProps
): NativePickerProps<TimeZoneOption, TimeZoneValue> {
	const localOptions = useMemo(
		() => props.entries?.map(toTimeZoneOption),
		[props.entries]
	)
	const dataSource = useMemo(
		() =>
			createTimeZoneDataSource({
				apiUrl: props.apiUrl
			}),
		[props.apiUrl]
	)
	return {
		...props,
		dataSource: localOptions || props.options ? undefined : dataSource,
		options: props.options ?? localOptions,
		getOptionLabel: (option) => option.label,
		getOptionValue: (option) => option.value
	}
}

export type { TimeZoneOption, TimeZoneValue }
