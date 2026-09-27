import { createGeocodedClient, type Currency } from '@geocoded/client'
import { createElement, useMemo } from 'react'
import { pageFromArray, type PageRequest } from 'picker-core'
import {
	NativePickerField,
	useNativePickerField,
	type NativePickerComponentProps,
	type NativePickerProps,
	type NativePickerState
} from 'react-native-picker-core'
import {
	filterCurrencies,
	toCurrencyCodeOption,
	type CurrencyCode,
	type CurrencyCodeOption
} from 'currency-code-formatters'

export type NativeCurrencyCodePickerProps = Omit<
	NativePickerComponentProps<CurrencyCodeOption, CurrencyCode>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	currencies?: Currency[]
}

export function useNativeCurrencyCodePicker(
	props: NativeCurrencyCodePickerProps = {}
): NativePickerState<CurrencyCodeOption, CurrencyCode> {
	return useNativePickerField(useNativeCurrencyCodePickerProps(props))
}

/** Native currency picker against `/v2/currencies`. */
export function NativeCurrencyCodePicker(
	props: NativeCurrencyCodePickerProps = {}
) {
	return createElement(NativePickerField<CurrencyCodeOption, CurrencyCode>, {
		...useNativeCurrencyCodePickerProps(props),
		labels: {
			placeholder: 'Select currency',
			searchPlaceholder: 'Search currencies',
			...props.labels
		}
	})
}

function useNativeCurrencyCodePickerProps(
	props: NativeCurrencyCodePickerProps
): NativePickerProps<CurrencyCodeOption, CurrencyCode> {
	const localOptions = useMemo(
		() => props.currencies?.map(toCurrencyCodeOption),
		[props.currencies]
	)
	const client = useMemo(
		() =>
			createGeocodedClient({
				apiUrl: props.apiUrl
			}),
		[props.apiUrl]
	)
	const dataSource = useMemo(
		() => async (request: PageRequest) => {
			if (props.currencies) {
				return pageFromArray(
					filterCurrencies(
						props.currencies.map(toCurrencyCodeOption),
						request.query ?? ''
					),
					request
				)
			}
			const page = await client.fetchCurrencyPage({
				fields: ['code', 'name', 'symbol', 'decimals', 'countries'],
				limit: request.limit,
				offset: request.offset,
				q: request.query,
				signal: request.signal
			})
			return {
				data: page.data.map(toCurrencyCodeOption),
				meta: page.meta
			}
		},
		[client, props.currencies]
	)
	return {
		...props,
		dataSource: localOptions || props.options ? undefined : dataSource,
		options: props.options ?? localOptions,
		getOptionLabel: (option) => option.label,
		getOptionValue: (option) => option.value
	}
}

export type { CurrencyCode, CurrencyCodeOption }
