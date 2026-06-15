// Exact field shapes for every v2 collection (verified live against
// http://localhost:8787). Strings/numbers match the API responses.

// Minimal country row from /v2/countries. The list endpoint and the shared
// country-filter dropdown only need these fields; the country tab fetches the
// rich record (with expanded statistics) lazily when a detail panel opens.
export type CountryRef = {
	id: string
	iso2: string
	iso3: string
	name: string
	continent: string
	region: string
	currency: string
	population: number
}

// A single statistics metric: { code, name, year, value }.
export type StatMetric = {
	code: string
	name: string
	year: number
	value: number | null
}

// Statistics object returned inline via `expand=statistics&fields=*,statistics.*`.
export type CountryStatistics = {
	countryCode?: string
	countryName?: string
	iso3?: string
	populationTotal?: StatMetric
	populationFemale?: StatMetric
	populationMale?: StatMetric
	populationDensity?: StatMetric
	urbanPopulationPercent?: StatMetric
	ruralPopulationPercent?: StatMetric
	age0To14Percent?: StatMetric
	age15To64Percent?: StatMetric
	age65PlusPercent?: StatMetric
	gdpCurrentUsd?: StatMetric
	gdpPerCapitaCurrentUsd?: StatMetric
	lifeExpectancy?: StatMetric
}

// Full country record from /v2/countries with statistics expanded inline.
export type CountryRecord = CountryRef & {
	statistics?: CountryStatistics | null
}

export type CityRecord = {
	id: string
	geonameId: number | null
	name: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	latitude: string
	longitude: string
	population: number
	timezone: string
}

export type StateRecord = {
	id: string
	countryCode: string
	countryName: string
	stateCode: string
	iso31662: string
	name: string
	type: string
	population: number | null
	latitude: string
	longitude: string
	timezone: string
	capital: string | null
}

export type AirportRecord = {
	id: string
	geonameId: number | null
	name: string
	asciiName: string
	alternateNames: string[]
	unLocode: string | null
	airportLocationCode: string | null
	iataCode: string | null
	iataCodeSource: string | null
	latitude: string
	longitude: string
	countryCode: string
	countryName: string
	stateCode: string | null
	stateName: string | null
	admin2Code: string | null
	elevation: number | null
	timezone: string | null
	modificationDate: string | null
}

export type AirlineRecord = {
	id: string
	name: string
	iataCode: string | null
	accountingCode: string | null
	icaoCode: string | null
	countryName: string
	countryCode: string
	controlledDuplicate: boolean
}

export type PortRecord = {
	id: string
	unLocode: string
	countryCode: string
	countryName: string
	locationCode: string
	iataCode: string | null
	name: string
	nameWithoutDiacritics: string
	alternateNames: string[]
	subdivisionCode: string | null
	functionCode: string | null
	functions: string[]
	status: string | null
	statusName: string | null
	date: string | null
	coordinates: string | null
	latitude: number | null
	longitude: number | null
	remarks: string | null
	changeIndicator: string | null
}

export type LanguageName = {
	printName: string
	invertedName: string
}

export type LanguageRecord = {
	id: string
	iso6393: string
	iso6392B: string | null
	iso6392T: string | null
	iso6391: string | null
	scope: string
	type: string
	referenceName: string
	names: LanguageName[]
	macrolanguageCode: string | null
	macrolanguageMemberCodes: string[]
	comment: string | null
}

export type TimezoneRecord = {
	id: string
	timezone: string
	countryCodes: string[]
	coordinates: string
	latitude: number
	longitude: number
	area: string
	location: string
	abbreviation: string
	name: string
	standardOffset: number
	standardOffsetName: string
	standardAbbreviation: string
	standardName: string
	daylightOffset: number | null
	daylightOffsetName: string | null
	daylightAbbreviation: string | null
	daylightName: string | null
	observesDst: boolean
}

export type CurrencyRecord = {
	id: string
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

export type ContinentRecord = {
	id: string
	name: string
	countryCount: number
}

export type RegionRecord = {
	id: string
	name: string
	continent: string
	countryCount: number
}
