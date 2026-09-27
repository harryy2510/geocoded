import {
	createGeocodedClient,
	type City,
	type Country,
	type State as Region
} from '@geocoded/client'
import { createElement, useMemo, useState } from 'react'
import { emptyPage, type PageRequest } from 'picker-core'
import {
	NativePickerField,
	NativePickerStack,
	useNativePickerField,
	type StyleProp,
	type NativePickerComponentProps,
	type NativePickerLabels,
	type NativePickerProps,
	type NativePickerState,
	type NativePickerStyles,
	type ViewStyle
} from 'react-native-picker-core'

export type { City, Country, Region }

export type NativeCountryPickerProps = Omit<
	NativePickerComponentProps<Country, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countries?: Country[]
}

export type NativeRegionPickerProps = Omit<
	NativePickerComponentProps<Region, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countryCode?: string | null
	regions?: Region[]
}

export type NativeCityPickerProps = Omit<
	NativePickerComponentProps<City, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countryCode?: string | null
	regionCode?: string | null
	cities?: City[]
}

export type NativeCountryRegionSelection = {
	country: Country | null
	region: Region | null
	city: City | null
}

export type NativeCountryRegionPickerLabels = {
	country?: NativePickerLabels
	region?: NativePickerLabels
	city?: NativePickerLabels
}

export type NativeCountryRegionPickerProps = {
	value?: Partial<NativeCountryRegionSelection>
	defaultValue?: Partial<NativeCountryRegionSelection>
	onValueChange?: (selection: NativeCountryRegionSelection) => void
	apiUrl?: string
	disabled?: boolean
	presentation?: NativeCountryPickerProps['presentation']
	fullScreenThreshold?: number
	labels?: NativeCountryRegionPickerLabels
	styles?: NativePickerStyles
	style?: StyleProp<ViewStyle>
}

export function useNativeCountryPicker(
	props: NativeCountryPickerProps = {}
): NativePickerState<Country> {
	return useNativePickerField(useNativeCountryPickerProps(props))
}

/** Native country picker against `/v2/countries`. */
export function NativeCountryPicker(props: NativeCountryPickerProps = {}) {
	return createElement(NativePickerField<Country>, {
		...useNativeCountryPickerProps(props),
		labels: {
			placeholder: 'Select country',
			searchPlaceholder: 'Search countries',
			...props.labels
		}
	})
}

export function useNativeRegionPicker(
	props: NativeRegionPickerProps = {}
): NativePickerState<Region> {
	return useNativePickerField(useNativeRegionPickerProps(props))
}

/** Native region picker against `/v2/states?filter[country]=`. */
export function NativeRegionPicker(props: NativeRegionPickerProps = {}) {
	return createElement(NativePickerField<Region>, {
		...useNativeRegionPickerProps(props),
		labels: {
			placeholder: 'Select region',
			searchPlaceholder: 'Search regions',
			...props.labels
		}
	})
}

export function useNativeCityPicker(
	props: NativeCityPickerProps = {}
): NativePickerState<City> {
	return useNativePickerField(useNativeCityPickerProps(props))
}

/** Native city picker against `/v2/cities`. */
export function NativeCityPicker(props: NativeCityPickerProps = {}) {
	return createElement(NativePickerField<City>, {
		...useNativeCityPickerProps(props),
		labels: {
			placeholder: 'Select city',
			searchPlaceholder: 'Search cities',
			...props.labels
		}
	})
}

/** Cascading native country → region → city pickers. */
export function NativeCountryRegionPicker(
	props: NativeCountryRegionPickerProps = {}
) {
	const [internal, setInternal] = useState<NativeCountryRegionSelection>({
		country: props.defaultValue?.country ?? null,
		region: props.defaultValue?.region ?? null,
		city: props.defaultValue?.city ?? null
	})
	const selection: NativeCountryRegionSelection = {
		country: props.value?.country ?? internal.country,
		region: props.value?.region ?? internal.region,
		city: props.value?.city ?? internal.city
	}

	function commit(next: NativeCountryRegionSelection) {
		if (props.value === undefined) setInternal(next)
		props.onValueChange?.(next)
	}

	return createElement(
		NativePickerStack,
		{ style: props.style },
		createElement<NativeCountryPickerProps>(NativeCountryPicker, {
			apiUrl: props.apiUrl,
			disabled: props.disabled,
			fullScreenThreshold: props.fullScreenThreshold,
			labels: props.labels?.country,
			onValueChange: (_value: string | null, option: Country | null) => {
				commit({ country: option, region: null, city: null })
			},
			presentation: props.presentation,
			selectedOption: selection.country,
			styles: props.styles,
			value: selection.country?.iso2 ?? null
		}),
		createElement<NativeRegionPickerProps>(NativeRegionPicker, {
			apiUrl: props.apiUrl,
			countryCode: selection.country?.iso2 ?? null,
			disabled: props.disabled || !selection.country,
			fullScreenThreshold: props.fullScreenThreshold,
			labels: props.labels?.region,
			onValueChange: (_value: string | null, option: Region | null) => {
				commit({ country: selection.country, region: option, city: null })
			},
			presentation: props.presentation,
			selectedOption: selection.region,
			styles: props.styles,
			value: selection.region?.stateCode ?? selection.region?.iso2 ?? null
		}),
		createElement<NativeCityPickerProps>(NativeCityPicker, {
			apiUrl: props.apiUrl,
			countryCode: selection.country?.iso2 ?? null,
			disabled: props.disabled || !selection.country || !selection.region,
			fullScreenThreshold: props.fullScreenThreshold,
			labels: props.labels?.city,
			onValueChange: (_value: string | null, option: City | null) => {
				commit({
					country: selection.country,
					region: selection.region,
					city: option
				})
			},
			presentation: props.presentation,
			regionCode: selection.region?.stateCode ?? selection.region?.iso2 ?? null,
			selectedOption: selection.city,
			styles: props.styles,
			value: selection.city
				? String(selection.city.geonameId ?? selection.city.name)
				: null
		})
	)
}

function useNativeCountryPickerProps(
	props: NativeCountryPickerProps
): NativePickerProps<Country> {
	const client = useMemo(
		() => createGeocodedClient({ apiUrl: props.apiUrl }),
		[props.apiUrl]
	)
	const dataSource = useMemo(
		() => (request: PageRequest) =>
			client.fetchCountryPage({
				limit: request.limit,
				offset: request.offset,
				q: request.query,
				signal: request.signal
			}),
		[client]
	)
	return {
		...props,
		dataSource: props.countries || props.options ? undefined : dataSource,
		options: props.options ?? props.countries,
		getOptionLabel: (country) => country.name,
		getOptionValue: (country) => country.iso2
	}
}

function useNativeRegionPickerProps(
	props: NativeRegionPickerProps
): NativePickerProps<Region> {
	const client = useMemo(
		() => createGeocodedClient({ apiUrl: props.apiUrl }),
		[props.apiUrl]
	)
	const dataSource = useMemo(
		() => (request: PageRequest) =>
			props.countryCode
				? client.fetchStatePage(props.countryCode, {
						limit: request.limit,
						offset: request.offset,
						q: request.query,
						signal: request.signal
					})
				: Promise.resolve(emptyPage<Region>(request)),
		[client, props.countryCode]
	)
	return {
		...props,
		dataSource: props.regions || props.options ? undefined : dataSource,
		options: props.options ?? props.regions,
		getOptionLabel: (region) => region.name,
		getOptionValue: (region) => region.stateCode || region.iso2
	}
}

function useNativeCityPickerProps(
	props: NativeCityPickerProps
): NativePickerProps<City> {
	const client = useMemo(
		() => createGeocodedClient({ apiUrl: props.apiUrl }),
		[props.apiUrl]
	)
	const dataSource = useMemo(
		() => (request: PageRequest) =>
			props.countryCode && props.regionCode
				? client.fetchCityPage(props.countryCode, props.regionCode, {
						limit: request.limit,
						offset: request.offset,
						q: request.query,
						signal: request.signal
					})
				: Promise.resolve(emptyPage<City>(request)),
		[client, props.countryCode, props.regionCode]
	)
	return {
		...props,
		dataSource: props.cities || props.options ? undefined : dataSource,
		options: props.options ?? props.cities,
		getOptionLabel: (city) => city.name,
		getOptionValue: (city) => String(city.geonameId ?? city.name)
	}
}
