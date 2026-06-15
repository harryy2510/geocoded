export type V2StatisticValue = {
	code: string
	name: string
	year: number
	value: number | null
}

export type V2CountryStatistics = {
	id: string
	countryCode: string
	countryName: string
	iso3: string
	populationTotal: V2StatisticValue
	populationFemale: V2StatisticValue
	populationMale: V2StatisticValue
	populationDensity: V2StatisticValue
	urbanPopulationPercent: V2StatisticValue
	ruralPopulationPercent: V2StatisticValue
	age0To14Percent: V2StatisticValue
	age15To64Percent: V2StatisticValue
	age65PlusPercent: V2StatisticValue
	gdpCurrentUsd: V2StatisticValue
	gdpPerCapitaCurrentUsd: V2StatisticValue
	lifeExpectancy: V2StatisticValue
}

export type V2Country = {
	id: string
	iso2: string
	iso3: string
	name: string
	continent: string
	region: string
	currency: string
	population: number
	statistics?: V2CountryStatistics | null
}

export type V2Continent = {
	id: string
	name: string
	countryCount: number
}

export type V2Region = {
	id: string
	name: string
	continent: string
	countryCount: number
}

export type V2State = {
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

export type V2City = {
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

export type V2Timezone = {
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

export type V2Currency = {
	id: string
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

export type V2LanguageName = {
	printName: string
	invertedName: string
}

export type V2Language = {
	id: string
	iso6393: string
	iso6392B: string | null
	iso6392T: string | null
	iso6391: string | null
	scope: string
	type: string
	referenceName: string
	names: V2LanguageName[]
	macrolanguageCode: string | null
	macrolanguageMemberCodes: string[]
	comment: string | null
	lookupCodes: string[]
}

export type V2Airline = {
	id: string
	name: string
	iataCode: string
	accountingCode: string
	icaoCode: string
	countryName: string
	countryCode: string
	controlledDuplicate: boolean
}

export type V2Airport = {
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
	stateCode: string
	stateName: string
	admin2Code: string
	elevation: number | null
	timezone: string
	modificationDate: string
}

export type V2TransportLocation = {
	id: string
	unLocode: string
	countryCode: string
	countryName: string
	locationCode: string
	iataCode: string | null
	iataCodeSource: string | null
	name: string
	nameWithoutDiacritics: string
	alternateNames: string[]
	subdivisionCode: string | null
	functionCode: string
	functions: string[]
	status: string
	statusName: string
	date: string
	coordinates: string | null
	latitude: number | null
	longitude: number | null
	remarks: string | null
	changeIndicator: string | null
}

export type V2MigrationOrigin = {
	countryCode: string
	countryName: string
	iso3: string
	m49Code: string
	count: number
	maleCount: number
	femaleCount: number
	shareOfMigrantsPercent: number
	shareOfPopulationPercent: number
}

export type V2Migration = {
	id: string
	countryCode: string
	countryName: string
	iso3: string
	m49Code: string
	year: number
	coverage: string | null
	sourceDataTypeCode: string
	sourceDataTypeMethods: string[]
	totalInternationalMigrants: number
	maleInternationalMigrants: number
	femaleInternationalMigrants: number
	migrantShareOfPopulationPercent: number
	origins: V2MigrationOrigin[]
}

export type V2Location = {
	asn: number | undefined
	asOrganization: string | undefined
	city: string | undefined
	cityInfo: V2City | undefined
	colo: string | undefined
	continent: string | undefined
	country: string | undefined
	countryInfo: V2Country | undefined
	ip: string
	isEU: boolean | undefined
	latitude: string | undefined
	longitude: string | undefined
	postalCode: string | undefined
	region: string | undefined
	regionCode: string | undefined
	stateInfo: V2State | undefined
	timezone: string | undefined
}

export type V2PaginatedResponse<T> = {
	data: T[]
	meta: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
		cursor: string | null
	}
}
