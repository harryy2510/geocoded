/**
 * React country, region, and city pickers backed by `/v2/countries`,
 * `/v2/states`, and `/v2/cities`.
 */
import {
	createGeocodedClient,
	type City,
	type Country,
	type State as Region
} from '@geocoded/client'
import { createElement, useEffect, useMemo, useState } from 'react'
import { emptyPage, type PageRequest } from 'picker-core'
import { PickerField, type PickerFieldProps } from 'react-picker-core'

export type { City, Country, Region }

export type CountryRegionSelection = {
	country: Country | null
	region: Region | null
	city: City | null
}

export type CountryPickerProps = Omit<
	PickerFieldProps<Country, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countries?: Country[]
}

/** Country autocomplete against `/v2/countries`. Values are ISO2 codes. */
export function CountryPicker(props: CountryPickerProps) {
	const client = useMemo(
		() =>
			createGeocodedClient({
				apiUrl: props.apiUrl
			}),
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
	return createElement(PickerField<Country>, {
		...props,
		dataSource: props.countries || props.options ? undefined : dataSource,
		options: props.options ?? props.countries,
		getOptionLabel: (country) =>
			`${country.emoji ? `${country.emoji} ` : ''}${country.name}`,
		getOptionValue: (country) => country.iso2,
		labels: {
			placeholder: 'Select country',
			searchPlaceholder: 'Search countries',
			...props.labels
		}
	})
}

export type RegionPickerProps = Omit<
	PickerFieldProps<Region, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countryCode?: string | null
	regions?: Region[]
}

/** Region/state autocomplete against `/v2/states?filter[country]=`. Values are state codes. */
export function RegionPicker(props: RegionPickerProps) {
	const client = useMemo(
		() =>
			createGeocodedClient({
				apiUrl: props.apiUrl
			}),
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
	return createElement(PickerField<Region>, {
		...props,
		disabled: props.disabled || !props.countryCode,
		dataSource: props.regions || props.options ? undefined : dataSource,
		options: props.options ?? props.regions,
		getOptionLabel: (region) => region.name,
		getOptionValue: (region) => region.stateCode || region.iso2,
		labels: {
			placeholder: 'Select region',
			searchPlaceholder: 'Search regions',
			...props.labels
		}
	})
}

export type CityPickerProps = Omit<
	PickerFieldProps<City, string>,
	'dataSource' | 'getOptionLabel' | 'getOptionValue'
> & {
	apiUrl?: string
	countryCode?: string | null
	regionCode?: string | null
	cities?: City[]
}

/** City autocomplete against `/v2/cities?filter[country]=&filter[state]=`. Values are GeoNames ids. */
export function CityPicker(props: CityPickerProps) {
	const client = useMemo(
		() =>
			createGeocodedClient({
				apiUrl: props.apiUrl
			}),
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
	return createElement(PickerField<City>, {
		...props,
		disabled: props.disabled || !props.countryCode || !props.regionCode,
		dataSource: props.cities || props.options ? undefined : dataSource,
		options: props.options ?? props.cities,
		getOptionLabel: (city) => city.name,
		getOptionValue: (city) => String(city.geonameId ?? city.name),
		labels: {
			placeholder: 'Select city',
			searchPlaceholder: 'Search cities',
			...props.labels
		}
	})
}

export type CountryRegionPickerProps = {
	apiUrl?: string
	value?: Partial<CountryRegionSelection>
	defaultValue?: Partial<CountryRegionSelection>
	defaultToCurrentLocation?: boolean
	onValueChange?: (selection: CountryRegionSelection) => void
	countries?: Country[]
	regions?: Region[]
	cities?: City[]
}

/** Cascading country → region → city pickers. */
export function CountryRegionPicker(props: CountryRegionPickerProps) {
	const [country, setCountry] = useState<Country | null>(
		props.defaultValue?.country ?? null
	)
	const [region, setRegion] = useState<Region | null>(
		props.defaultValue?.region ?? null
	)
	const [city, setCity] = useState<City | null>(
		props.defaultValue?.city ?? null
	)
	const controlled = props.value !== undefined
	const selectedCountry = controlled ? (props.value?.country ?? null) : country
	const selectedRegion = controlled ? (props.value?.region ?? null) : region
	const selectedCity = controlled ? (props.value?.city ?? null) : city
	const client = useMemo(
		() => createGeocodedClient({ apiUrl: props.apiUrl }),
		[props.apiUrl]
	)

	function emit(next: CountryRegionSelection) {
		props.onValueChange?.(next)
	}

	function updateInternal(next: CountryRegionSelection) {
		if (controlled) return
		setCountry(next.country)
		setRegion(next.region)
		setCity(next.city)
	}

	useEffect(() => {
		if (!props.defaultToCurrentLocation || controlled) return
		if (selectedCountry || selectedRegion || selectedCity) return
		const controller = new AbortController()
		void client
			.fetchCurrentLocation({
				fields: ['countryInfo', 'stateInfo', 'cityInfo'],
				signal: controller.signal
			})
			.then((location) => {
				if (controller.signal.aborted) return
				const next = {
					country: location.countryInfo ?? null,
					region: location.stateInfo ?? null,
					city: location.cityInfo ?? null
				}
				if (!next.country && !next.region && !next.city) return
				updateInternal(next)
				emit(next)
			})
			.catch(() => undefined)
		return () => controller.abort()
	}, [
		client,
		controlled,
		props.defaultToCurrentLocation,
		selectedCity,
		selectedCountry,
		selectedRegion
	])

	return createElement(
		'div',
		null,
		createElement(CountryPicker, {
			apiUrl: props.apiUrl,
			countries: props.countries,
			selectedOption: selectedCountry,
			value: selectedCountry?.iso2 ?? null,
			onValueChange: (_value, option) => {
				const next = { country: option, region: null, city: null }
				updateInternal(next)
				emit(next)
			}
		}),
		createElement(RegionPicker, {
			apiUrl: props.apiUrl,
			countryCode: selectedCountry?.iso2,
			regions: props.regions?.filter(
				(region) => region.countryCode === selectedCountry?.iso2
			),
			selectedOption: selectedRegion,
			value: selectedRegion?.stateCode ?? selectedRegion?.iso2 ?? null,
			onValueChange: (_value, option) => {
				const next = { country: selectedCountry, region: option, city: null }
				updateInternal(next)
				emit(next)
			}
		}),
		createElement(CityPicker, {
			apiUrl: props.apiUrl,
			countryCode: selectedCountry?.iso2,
			regionCode: selectedRegion?.stateCode ?? selectedRegion?.iso2,
			cities: props.cities?.filter(
				(city) =>
					city.countryCode === selectedCountry?.iso2 &&
					city.stateCode === (selectedRegion?.stateCode ?? selectedRegion?.iso2)
			),
			selectedOption: selectedCity,
			value: selectedCity
				? String(selectedCity.geonameId ?? selectedCity.name)
				: null,
			onValueChange: (_value, option) => {
				const next = {
					country: selectedCountry,
					region: selectedRegion,
					city: option
				}
				updateInternal(next)
				emit(next)
			}
		})
	)
}
