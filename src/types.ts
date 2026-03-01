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
	currency: string
	currencyName: string
	currencySymbol: string
	emoji: string
	emojiU: string
	gdp: number | null
	iso2: string
	iso3: string
	latitude: string
	longitude: string
	name: string
	nationality: string
	native: string
	numericCode: string
	phoneCode: string
	population: number
	postalCodeFormat: string | null
	postalCodeRegex: string | null
	region: string
	subregion: string
	timezones: Timezone[]
	tld: string
	translations: Record<string, string>
	wikiDataId: string
}

export type State = {
	countryCode: string
	countryName: string
	fipsCode: string
	iso2: string
	iso31662: string
	latitude: string
	level: string | null
	longitude: string
	name: string
	native: string
	parentId: string | null
	population: number | null
	timezone: string
	translations: Record<string, string>
	type: string
	wikiDataId: string
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

export type City = {
	countryCode: string
	countryName: string
	latitude: string
	level: string | null
	longitude: string
	name: string
	native: string
	parentId: string | null
	population: number
	stateCode: string
	stateName: string
	timezone: string
	translations: Record<string, string>
	type: string
	wikiDataId: string
}
