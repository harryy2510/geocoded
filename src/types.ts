export type SiteConfig = {
	siteName: string
	siteUrl: string
	apiUrl: string
	githubUrl: string
}

export type Timezone = {
	abbreviation: string
	gmtOffset: number
	gmtOffsetName: string
	tzName: string
	zoneName: string
}

export type Country = {
	areaSqKm: number
	capital: string
	continent: string
	currency: string
	currencyName: string
	currencySymbol: string
	drivingSide: string
	emoji: string
	emojiU: string
	firstDayOfWeek: string
	flagUrl: string
	gdp: number | null
	geonameId: number
	iso2: string
	iso3: string
	languages: string[]
	latitude: string
	longitude: string
	measurementSystem: string
	name: string
	nationality: string
	literacy: number | null
	native: string
	neighbours: string[]
	numericCode: string
	phoneCode: string
	population: number
	postalCodeFormat: string | null
	postalCodeRegex: string | null
	region: string
	subregion: string
	timeFormat: string
	timezones: Timezone[]
	tld: string
	translations: Record<string, string>
}

export type State = {
	capital: string | null
	countryCode: string
	countryName: string
	geonameId: number
	iso2: string
	iso31662: string
	latitude: string
	longitude: string
	name: string
	population: number | null
	timezone: string
	type: string
}

export type City = {
	countryCode: string
	countryName: string
	geonameId: number
	latitude: string
	longitude: string
	name: string
	population: number
	stateCode: string
	stateName: string
	timezone: string
}

export type Location = {
	asn: number | undefined
	asOrganization: string | undefined
	city: string | undefined
	cityInfo: City | undefined
	colo: string | undefined
	continent: string | undefined
	country: string | undefined
	countryInfo: Country | undefined
	ip: string
	isEU: boolean | undefined
	latitude: string | undefined
	longitude: string | undefined
	postalCode: string | undefined
	region: string | undefined
	regionCode: string | undefined
	stateInfo: State | undefined
	timezone: string | undefined
}

export type SearchResult = {
	type: 'country' | 'state' | 'city'
	name: string
	countryCode: string
	countryName: string
	stateCode: string | null
	stateName: string | null
}

export type PaginatedResponse<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
		cursor: string | null
	}
}

export type TimezoneEntry = {
	countryCodes: string[]
	comments: string
	coordinates: string
	timezone: string
}

export type CurrencyEntry = {
	code: string
	countries: string[]
	decimals: number
	name: string
	symbol: string
}
