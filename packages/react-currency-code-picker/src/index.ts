import { createGeocodedClient, type Currency } from '@geocoded/client'
import { createElement, useMemo } from 'react'
import { pageFromArray, type PageRequest } from 'picker-core'
import { PickerField, type PickerFieldProps } from 'react-picker-core'
import {
	filterCurrencies,
	toCurrencyCodeOption,
	type CurrencyCode,
	type CurrencyCodeOption
} from 'currency-code-formatters'

export type CurrencyCodePickerProps = Omit<
	PickerFieldProps<CurrencyCodeOption, CurrencyCode>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	currencies?: Currency[]
}

/** Currency picker against `/v2/currencies`. Search uses the API `q` param. */
export function CurrencyCodePicker(props: CurrencyCodePickerProps) {
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
	return createElement(PickerField<CurrencyCodeOption, CurrencyCode>, {
		...props,
		dataSource: localOptions ? undefined : dataSource,
		options: props.options ?? localOptions,
		getOptionLabel: (option) => option.label,
		getOptionValue: (option) => option.value,
		labels: {
			placeholder: 'Select currency',
			searchPlaceholder: 'Search currencies',
			...props.labels
		}
	})
}

export type { CurrencyCode, CurrencyCodeOption }
