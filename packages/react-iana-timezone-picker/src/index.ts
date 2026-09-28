import { createElement, useMemo } from 'react'
import { PickerField, type PickerFieldProps } from 'react-picker-core'
import {
	createTimeZoneDataSource,
	toTimeZoneOption,
	type TimezoneEntry,
	type TimeZoneOption,
	type TimeZoneValue
} from 'use-timezones'

export type TimeZonePickerProps = Omit<
	PickerFieldProps<TimeZoneOption, TimeZoneValue>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	entries?: TimezoneEntry[]
}

/** IANA timezone picker against `/v2/timezones`. */
export function TimeZonePicker(props: TimeZonePickerProps) {
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
	return createElement(PickerField<TimeZoneOption, TimeZoneValue>, {
		...props,
		dataSource: localOptions ? undefined : dataSource,
		options: props.options ?? localOptions,
		getOptionLabel: (option) => option.label,
		getOptionValue: (option) => option.value,
		labels: {
			placeholder: 'Select time zone',
			searchPlaceholder: 'Search time zones',
			...props.labels
		}
	})
}

export type { TimeZoneOption, TimeZoneValue }
