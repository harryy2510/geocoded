import type { SiteConfig } from '../site-config'

const stringSchema = { type: 'string' as const }
const nullableStringSchema = { type: 'string' as const, nullable: true }
const numberSchema = { type: 'number' as const }
const nullableNumberSchema = { type: 'number' as const, nullable: true }
const booleanSchema = { type: 'boolean' as const }
const stringArraySchema = {
	type: 'array' as const,
	items: stringSchema
}

const v2ExpandParameter = {
	name: 'expand',
	in: 'query' as const,
	required: false,
	description:
		'Comma-separated expansion names. Expansions are explicit and flat, for example `expand=statistics`.',
	schema: stringSchema,
	allowReserved: true,
	example: 'statistics'
}

const v2CountryExpandParameter = {
	name: 'expand',
	in: 'query' as const,
	required: false,
	description:
		'Comma-separated expansion names. Available: `statistics`, `timezones`, `translations`. Expansions are explicit and flat, for example `expand=statistics,timezones`.',
	schema: stringSchema,
	allowReserved: true,
	example: 'statistics,timezones,translations'
}

const v2SearchParameter = {
	name: 'q',
	in: 'query' as const,
	required: false,
	schema: stringSchema
}

const v2SortParameter = {
	name: 'sort',
	in: 'query' as const,
	required: false,
	description: 'Sort by a supported field, or prefix with `-` for descending.',
	schema: stringSchema,
	example: 'name'
}

const v2PaginationParams = [
	{
		name: 'limit',
		in: 'query' as const,
		required: false,
		schema: {
			type: 'integer' as const,
			minimum: 1,
			maximum: 2000,
			default: 25
		}
	},
	{
		name: 'offset',
		in: 'query' as const,
		required: false,
		schema: { type: 'integer' as const, minimum: 0, default: 0 }
	},
	{
		name: 'cursor',
		in: 'query' as const,
		required: false,
		schema: stringSchema
	}
]

const v2ErrorResponse = {
	description: 'Error response',
	content: {
		'application/json': {
			schema: {
				type: 'object' as const,
				properties: {
					error: stringSchema
				},
				required: ['error']
			}
		}
	}
}

const v2AmbiguousResponse = {
	description:
		'Multiple records match this identifier. Use a scoped path or a unique id from `matches`.',
	content: {
		'application/json': {
			schema: {
				type: 'object' as const,
				properties: {
					error: stringSchema,
					hint: stringSchema,
					matches: {
						type: 'array' as const,
						items: { type: 'object' as const }
					}
				},
				required: ['error', 'matches']
			}
		}
	}
}

const v2PaginationMeta = {
	type: 'object' as const,
	properties: {
		total: { type: 'integer' as const },
		limit: { type: 'integer' as const },
		offset: { type: 'integer' as const },
		hasMore: booleanSchema,
		cursor: nullableStringSchema
	},
	required: ['total', 'limit', 'offset', 'hasMore', 'cursor']
}

const v2StatisticValueSchema = {
	type: 'object' as const,
	properties: {
		code: stringSchema,
		name: stringSchema,
		year: { type: 'integer' as const },
		value: { type: 'number' as const, nullable: true }
	},
	required: ['code', 'name', 'year', 'value']
}

const v2StatisticsSchema = objectSchema({
	id: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	iso3: stringSchema,
	populationTotal: v2StatisticValueSchema,
	populationFemale: v2StatisticValueSchema,
	populationMale: v2StatisticValueSchema,
	populationDensity: v2StatisticValueSchema,
	urbanPopulationPercent: v2StatisticValueSchema,
	ruralPopulationPercent: v2StatisticValueSchema,
	age0To14Percent: v2StatisticValueSchema,
	age15To64Percent: v2StatisticValueSchema,
	age65PlusPercent: v2StatisticValueSchema,
	gdpCurrentUsd: v2StatisticValueSchema,
	gdpPerCapitaCurrentUsd: v2StatisticValueSchema,
	lifeExpectancy: v2StatisticValueSchema
})

const v2CountryTimezoneSchema = objectSchema({
	zoneName: stringSchema,
	gmtOffset: numberSchema,
	gmtOffsetName: stringSchema,
	abbreviation: stringSchema,
	tzName: stringSchema
})

const v2CountrySchema = objectSchema({
	id: stringSchema,
	iso2: stringSchema,
	iso3: stringSchema,
	name: stringSchema,
	native: stringSchema,
	capital: stringSchema,
	continent: stringSchema,
	region: stringSchema,
	subregion: stringSchema,
	currency: stringSchema,
	currencyName: stringSchema,
	currencySymbol: stringSchema,
	tld: stringSchema,
	phoneCode: stringSchema,
	numericCode: stringSchema,
	nationality: stringSchema,
	emoji: stringSchema,
	emojiU: stringSchema,
	latitude: stringSchema,
	longitude: stringSchema,
	areaSqKm: nullableNumberSchema,
	population: numberSchema,
	gdp: nullableNumberSchema,
	literacy: nullableNumberSchema,
	postalCodeFormat: nullableStringSchema,
	postalCodeRegex: nullableStringSchema,
	drivingSide: stringSchema,
	measurementSystem: stringSchema,
	firstDayOfWeek: stringSchema,
	timeFormat: stringSchema,
	flagUrl: stringSchema,
	languages: stringArraySchema,
	neighbours: stringArraySchema,
	timezones: {
		type: 'array' as const,
		items: v2CountryTimezoneSchema
	},
	translations: {
		type: 'object' as const,
		additionalProperties: stringSchema
	},
	statistics: {
		...v2StatisticsSchema,
		nullable: true
	}
})

const v2ContinentSchema = objectSchema({
	id: stringSchema,
	name: stringSchema,
	countryCount: numberSchema
})

const v2RegionSchema = objectSchema({
	id: stringSchema,
	name: stringSchema,
	continent: stringSchema,
	countryCount: numberSchema
})

const v2StateSchema = objectSchema({
	id: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	stateCode: stringSchema,
	iso31662: stringSchema,
	name: stringSchema,
	type: stringSchema,
	population: nullableNumberSchema,
	latitude: stringSchema,
	longitude: stringSchema,
	timezone: stringSchema,
	capital: nullableStringSchema
})

const v2CitySchema = objectSchema({
	id: stringSchema,
	geonameId: nullableNumberSchema,
	name: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	stateCode: stringSchema,
	stateName: stringSchema,
	latitude: stringSchema,
	longitude: stringSchema,
	population: numberSchema,
	timezone: stringSchema
})

const v2TimezoneSchema = objectSchema({
	id: stringSchema,
	timezone: stringSchema,
	countryCodes: stringArraySchema,
	coordinates: stringSchema,
	latitude: numberSchema,
	longitude: numberSchema,
	area: stringSchema,
	location: stringSchema,
	abbreviation: stringSchema,
	name: stringSchema,
	standardOffset: numberSchema,
	standardOffsetName: stringSchema,
	standardAbbreviation: stringSchema,
	standardName: stringSchema,
	daylightOffset: nullableNumberSchema,
	daylightOffsetName: nullableStringSchema,
	daylightAbbreviation: nullableStringSchema,
	daylightName: nullableStringSchema,
	observesDst: booleanSchema
})

const v2CurrencySchema = objectSchema({
	id: stringSchema,
	code: stringSchema,
	name: stringSchema,
	symbol: stringSchema,
	decimals: numberSchema,
	countries: stringArraySchema
})

const v2LanguageNameSchema = objectSchema({
	printName: stringSchema,
	invertedName: stringSchema
})

const v2LanguageSchema = objectSchema({
	id: stringSchema,
	iso6393: stringSchema,
	iso6392B: nullableStringSchema,
	iso6392T: nullableStringSchema,
	iso6391: nullableStringSchema,
	scope: stringSchema,
	type: stringSchema,
	referenceName: stringSchema,
	names: {
		type: 'array' as const,
		items: v2LanguageNameSchema
	},
	macrolanguageCode: nullableStringSchema,
	macrolanguageMemberCodes: stringArraySchema,
	comment: nullableStringSchema,
	lookupCodes: stringArraySchema
})

const v2AirlineSchema = objectSchema({
	id: stringSchema,
	name: stringSchema,
	iataCode: stringSchema,
	accountingCode: stringSchema,
	icaoCode: stringSchema,
	countryName: stringSchema,
	countryCode: stringSchema,
	controlledDuplicate: booleanSchema
})

const v2AirportSchema = objectSchema({
	id: stringSchema,
	geonameId: nullableNumberSchema,
	name: stringSchema,
	asciiName: stringSchema,
	alternateNames: stringArraySchema,
	unLocode: nullableStringSchema,
	airportLocationCode: nullableStringSchema,
	iataCode: nullableStringSchema,
	iataCodeSource: nullableStringSchema,
	latitude: stringSchema,
	longitude: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	stateCode: stringSchema,
	stateName: stringSchema,
	admin2Code: stringSchema,
	elevation: nullableNumberSchema,
	timezone: stringSchema,
	modificationDate: stringSchema
})

const v2TransportLocationSchema = objectSchema({
	id: stringSchema,
	unLocode: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	locationCode: stringSchema,
	iataCode: nullableStringSchema,
	iataCodeSource: nullableStringSchema,
	name: stringSchema,
	nameWithoutDiacritics: stringSchema,
	alternateNames: stringArraySchema,
	subdivisionCode: nullableStringSchema,
	functionCode: stringSchema,
	functions: stringArraySchema,
	status: stringSchema,
	statusName: stringSchema,
	date: stringSchema,
	coordinates: nullableStringSchema,
	latitude: nullableNumberSchema,
	longitude: nullableNumberSchema,
	remarks: nullableStringSchema,
	changeIndicator: nullableStringSchema
})

const v2LocationSchema = objectSchema({
	asn: numberSchema,
	asOrganization: stringSchema,
	city: stringSchema,
	cityInfo: {
		...v2CitySchema,
		description: 'Full city details when Cloudflare provides a matching city.'
	},
	colo: stringSchema,
	continent: stringSchema,
	country: stringSchema,
	countryInfo: {
		...v2CountrySchema,
		description: 'Full country details when Cloudflare provides a country code.'
	},
	ip: stringSchema,
	isEU: booleanSchema,
	latitude: stringSchema,
	longitude: stringSchema,
	postalCode: stringSchema,
	region: stringSchema,
	regionCode: stringSchema,
	stateInfo: {
		...v2StateSchema,
		description: 'Full state details when Cloudflare provides a region code.'
	},
	timezone: stringSchema
})

const v2MigrationOriginSchema = objectSchema({
	countryCode: stringSchema,
	countryName: stringSchema,
	iso3: stringSchema,
	m49Code: stringSchema,
	count: numberSchema,
	maleCount: numberSchema,
	femaleCount: numberSchema,
	shareOfMigrantsPercent: numberSchema,
	shareOfPopulationPercent: numberSchema
})

const v2MigrationSchema = objectSchema({
	id: stringSchema,
	countryCode: stringSchema,
	countryName: stringSchema,
	iso3: stringSchema,
	m49Code: stringSchema,
	year: numberSchema,
	coverage: nullableStringSchema,
	sourceDataTypeCode: stringSchema,
	sourceDataTypeMethods: stringArraySchema,
	totalInternationalMigrants: numberSchema,
	maleInternationalMigrants: numberSchema,
	femaleInternationalMigrants: numberSchema,
	migrantShareOfPopulationPercent: numberSchema,
	origins: {
		type: 'array' as const,
		items: v2MigrationOriginSchema
	}
})

const filterCountry = filterParameter('country', 'AE')
const filterState = filterParameter('state', 'AZ')
const filterContinent = filterParameter('continent', 'AS')
const filterRegion = filterParameter('region', 'Western Asia')
const filterTimezone = filterParameter('timezone', 'Asia/Dubai')
const filterCurrency = filterParameter('currency', 'AED')
const filterIata = filterParameter('iata', 'DXB')
const filterLanguageCode = filterParameter('code', 'en')
const filterLanguageScope = filterParameter('scope', 'individual')
const filterLanguageType = filterParameter('type', 'living')
const filterMacrolanguage = filterParameter('macrolanguage', 'ara')
const filterMinPopulation = filterParameter('minPopulation', 1000000, 'number')
const filterMaxPopulation = filterParameter('maxPopulation', 50000000, 'number')

export const v2OpenApiPaths = {
	'/v2': {
		get: {
			tags: ['Location'],
			summary: "Get caller's geo info",
			description:
				"Returns geographic information about the caller based on their IP address, using Cloudflare's edge network data. Also enriches the response with full country, state, and city details when available.",
			parameters: [
				fieldsParameter(
					'country,countryInfo.name,stateInfo.name,cityInfo.name,ip'
				)
			],
			responses: {
				'200': {
					description: 'Location info',
					content: {
						'application/json': { schema: v2LocationSchema }
					}
				}
			}
		}
	},
	'/v2/continents': listPath({
		tag: 'Continents',
		summary: 'List continents',
		schema: v2ContinentSchema,
		fieldsExample: 'id,name,countryCount'
	}),
	'/v2/continents/{id}': detailPath({
		tag: 'Continents',
		summary: 'Get one continent',
		schema: v2ContinentSchema,
		example: 'AS',
		fieldsExample: 'id,name,countryCount'
	}),
	'/v2/regions': listPath({
		tag: 'Regions',
		summary: 'List regions',
		schema: v2RegionSchema,
		parameters: [filterContinent, filterRegion],
		fieldsExample: 'id,name,continent,countryCount'
	}),
	'/v2/regions/{id}': detailPath({
		tag: 'Regions',
		summary: 'Get one region',
		schema: v2RegionSchema,
		example: 'AS:Western Asia',
		fieldsExample: 'id,name,continent,countryCount'
	}),
	'/v2/countries': listPath({
		tag: 'Countries',
		summary: 'List countries',
		description:
			'Country list with strict `filter[...]` filters, explicit expansions, and nested field projection.',
		schema: v2CountrySchema,
		parameters: [
			v2CountryExpandParameter,
			filterCountry,
			filterContinent,
			filterRegion,
			filterCurrency,
			filterMinPopulation,
			filterMaxPopulation
		],
		fieldsExample: 'id,name,iso2,statistics.gdpPerCapitaCurrentUsd'
	}),
	'/v2/countries/{id}': detailPath({
		tag: 'Countries',
		summary: 'Get one country',
		description:
			'Lookup by ISO 3166-1 alpha-2, alpha-3, or name. `US`, `USA`, and `United States` all work.',
		schema: v2CountrySchema,
		example: 'AE',
		idDescription: 'ISO 3166-1 alpha-2, alpha-3, or country name',
		parameters: [v2CountryExpandParameter],
		fieldsExample: 'id,name,iso2,statistics.gdpPerCapitaCurrentUsd'
	}),
	'/v2/states': listPath({
		tag: 'States',
		summary: 'List states',
		schema: v2StateSchema,
		parameters: [
			filterCountry,
			filterState,
			filterTimezone,
			filterMinPopulation,
			filterMaxPopulation
		],
		fieldsExample: 'id,name,countryCode,stateCode'
	}),
	'/v2/states/{id}': detailPath({
		tag: 'States',
		summary: 'Get one state',
		description:
			'Lookup by name (`California`), ISO 3166-2 (`US-CA`), country-scoped id (`US:CA` or `US:California`), or state code (`CA`). Shared codes and names return `409` with `matches`. Prefer `/v2/countries/{country}/states/{state}` when the identifier is not unique.',
		schema: v2StateSchema,
		example: 'California',
		idDescription:
			'Name, ISO 3166-2, country:code, country:name, or state code',
		fieldsExample: 'id,name,countryCode,stateCode',
		conflict: true
	}),
	'/v2/cities': listPath({
		tag: 'Cities',
		summary: 'List cities',
		schema: v2CitySchema,
		parameters: [
			filterCountry,
			filterState,
			filterTimezone,
			filterMinPopulation,
			filterMaxPopulation
		],
		fieldsExample: 'id,name,countryCode,geonameId'
	}),
	'/v2/cities/{id}': detailPath({
		tag: 'Cities',
		summary: 'Get one city',
		description:
			'Lookup by name (`Los Angeles`), GeoNames id (`5368361`), or a scoped id (`US:Los Angeles` or `US:CA:Los Angeles`). Shared names return `409` with `matches`. Prefer `/v2/countries/{country}/cities/{city}` or `/v2/countries/{country}/states/{state}/cities/{city}` when the name is not unique.',
		schema: v2CitySchema,
		example: 'Los Angeles',
		idDescription: 'Name, GeoNames id, country:name, or country:state:name',
		fieldsExample: 'id,name,countryCode,geonameId',
		conflict: true
	}),
	'/v2/countries/{country}/states': listPath({
		tag: 'States',
		summary: 'List states in a country',
		description:
			'Same as `/v2/states?filter[country]=...`. Country accepts ISO 3166-1 alpha-2, alpha-3, or name. Paginated; default `limit` is 25.',
		schema: v2StateSchema,
		fieldsExample: 'id,name,countryCode,stateCode',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			filterState,
			filterTimezone,
			filterMinPopulation,
			filterMaxPopulation
		],
		notFound: true
	}),
	'/v2/countries/{country}/states/{state}': nestedDetailPath({
		tag: 'States',
		summary: 'Get one state in a country',
		description:
			'Country accepts ISO 3166-1 alpha-2, alpha-3, or name. State accepts name, ISO 3166-2, or state code.',
		schema: v2StateSchema,
		fieldsExample: 'id,name,countryCode,stateCode',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			pathParameter('state', 'California', 'Name, ISO 3166-2, or state code')
		],
		conflict: true
	}),
	'/v2/countries/{country}/cities': listPath({
		tag: 'Cities',
		summary: 'List cities in a country',
		description:
			'Same as `/v2/cities?filter[country]=...`. Country accepts ISO 3166-1 alpha-2, alpha-3, or name. Paginated; default `limit` is 25.',
		schema: v2CitySchema,
		fieldsExample: 'id,name,countryCode,geonameId',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			filterState,
			filterTimezone,
			filterMinPopulation,
			filterMaxPopulation
		],
		notFound: true
	}),
	'/v2/countries/{country}/cities/{city}': nestedDetailPath({
		tag: 'Cities',
		summary: 'Get one city in a country',
		description:
			'Country accepts ISO 3166-1 alpha-2, alpha-3, or name. City accepts name or GeoNames id. Shared names in that country return `409` with `matches`.',
		schema: v2CitySchema,
		fieldsExample: 'id,name,countryCode,geonameId',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			pathParameter('city', 'Los Angeles', 'City name or GeoNames id')
		],
		conflict: true
	}),
	'/v2/countries/{country}/states/{state}/cities': listPath({
		tag: 'Cities',
		summary: 'List cities in a state',
		description:
			'Same as `/v2/cities?filter[country]=...&filter[state]=...`. Country and state accept name or ISO codes. Paginated; default `limit` is 25.',
		schema: v2CitySchema,
		fieldsExample: 'id,name,countryCode,geonameId',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			pathParameter('state', 'CA', 'Name, ISO 3166-2, or state code'),
			filterTimezone,
			filterMinPopulation,
			filterMaxPopulation
		],
		notFound: true
	}),
	'/v2/countries/{country}/states/{state}/cities/{city}': nestedDetailPath({
		tag: 'Cities',
		summary: 'Get one city in a state',
		description:
			'Country and state accept name or ISO codes. City accepts name or GeoNames id. Shared names in that state return `409` with `matches`.',
		schema: v2CitySchema,
		fieldsExample: 'id,name,countryCode,geonameId',
		parameters: [
			pathParameter(
				'country',
				'US',
				'ISO 3166-1 alpha-2, alpha-3, or country name'
			),
			pathParameter('state', 'CA', 'Name, ISO 3166-2, or state code'),
			pathParameter('city', 'Los Angeles', 'City name or GeoNames id')
		],
		conflict: true
	}),
	'/v2/timezones': listPath({
		tag: 'Timezones',
		summary: 'List timezones',
		schema: v2TimezoneSchema,
		parameters: [filterCountry, filterTimezone],
		fieldsExample: 'id,timezone,name,countryCodes'
	}),
	'/v2/timezones/{id}': detailPath({
		tag: 'Timezones',
		summary: 'Get one timezone',
		schema: v2TimezoneSchema,
		example: 'Asia/Dubai',
		fieldsExample: 'id,timezone,name'
	}),
	'/v2/currencies': listPath({
		tag: 'Currencies',
		summary: 'List currencies',
		schema: v2CurrencySchema,
		parameters: [filterCountry, filterCurrency],
		fieldsExample: 'id,code,name,countries'
	}),
	'/v2/currencies/{id}': detailPath({
		tag: 'Currencies',
		summary: 'Get one currency',
		schema: v2CurrencySchema,
		example: 'AED',
		fieldsExample: 'id,code,name'
	}),
	'/v2/languages': listPath({
		tag: 'Languages',
		summary: 'List languages',
		schema: v2LanguageSchema,
		parameters: [
			filterLanguageCode,
			filterLanguageScope,
			filterLanguageType,
			filterMacrolanguage
		],
		fieldsExample: 'id,iso6391,iso6393,referenceName'
	}),
	'/v2/languages/{id}': detailPath({
		tag: 'Languages',
		summary: 'Get one language',
		schema: v2LanguageSchema,
		example: 'eng',
		fieldsExample: 'id,iso6391,iso6393,referenceName'
	}),
	'/v2/airlines': listPath({
		tag: 'Airlines',
		summary: 'List airlines',
		schema: v2AirlineSchema,
		parameters: [filterCountry, filterIata],
		fieldsExample: 'id,name,iataCode,countryCode'
	}),
	'/v2/airlines/{id}': detailPath({
		tag: 'Airlines',
		summary: 'Get one airline',
		schema: v2AirlineSchema,
		example: 'GB:ABX:832',
		fieldsExample: 'id,name,iataCode'
	}),
	'/v2/airports': listPath({
		tag: 'Airports',
		summary: 'List airports',
		schema: v2AirportSchema,
		parameters: [filterCountry, filterState, filterTimezone, filterIata],
		fieldsExample: 'id,name,iataCode,countryCode'
	}),
	'/v2/airports/{id}': detailPath({
		tag: 'Airports',
		summary: 'Get one airport',
		schema: v2AirportSchema,
		example: '6300094',
		fieldsExample: 'id,name,geonameId,countryCode'
	}),
	'/v2/ports': listPath({
		tag: 'Ports',
		summary: 'List ports',
		schema: v2TransportLocationSchema,
		parameters: [filterCountry, filterState, filterIata],
		fieldsExample: 'id,name,countryCode,functions'
	}),
	'/v2/ports/{id}': detailPath({
		tag: 'Ports',
		summary: 'Get one port',
		schema: v2TransportLocationSchema,
		example: 'AEABU',
		fieldsExample: 'id,name,countryCode'
	}),
	'/v2/border-crossings': listPath({
		tag: 'Border Crossings',
		summary: 'List border crossings',
		schema: v2TransportLocationSchema,
		parameters: [filterCountry, filterState, filterIata],
		fieldsExample: 'id,name,countryCode,functions'
	}),
	'/v2/border-crossings/{id}': detailPath({
		tag: 'Border Crossings',
		summary: 'Get one border crossing',
		schema: v2TransportLocationSchema,
		example: 'ADFMO',
		fieldsExample: 'id,name,countryCode'
	}),
	'/v2/statistics': listPath({
		tag: 'Statistics',
		summary: 'List country statistics',
		description:
			'One statistics row per country. Use `fields` to choose specific statistics instead of an indicator parameter.',
		schema: v2StatisticsSchema,
		parameters: [filterCountry],
		fieldsExample: 'countryCode,countryName,gdpPerCapitaCurrentUsd'
	}),
	'/v2/statistics/{id}': detailPath({
		tag: 'Statistics',
		summary: 'Get one country statistics row',
		schema: v2StatisticsSchema,
		example: 'AE',
		fieldsExample: 'countryCode,countryName,gdpPerCapitaCurrentUsd'
	}),
	'/v2/migrant-stocks': listPath({
		tag: 'Migrant Stocks',
		summary: 'List country migrant stocks',
		schema: v2MigrationSchema,
		parameters: [filterCountry],
		fieldsExample: 'countryCode,totalInternationalMigrants'
	}),
	'/v2/migrant-stocks/{id}': detailPath({
		tag: 'Migrant Stocks',
		summary: 'Get one country migrant stock row',
		schema: v2MigrationSchema,
		example: 'AE',
		fieldsExample: 'countryCode,totalInternationalMigrants'
	})
}

export function v2OpenApiSpec(config: SiteConfig) {
	return {
		openapi: '3.1.0',
		info: {
			title: config.siteName,
			version: '2.0.0',
			description:
				'Root collections with strict `filter[...]` filters, explicit expansions, nested field projection, pagination, search, and sorting.',
			contact: {
				email: 'contact@harryy.me'
			},
			license: {
				name: 'CC BY 4.0',
				url: 'https://creativecommons.org/licenses/by/4.0/'
			},
			'x-logo': {
				url: '/logo.png',
				altText: config.siteName
			}
		},
		servers: [{ url: config.apiUrl }],
		paths: v2OpenApiPaths
	}
}

function objectSchema(properties: Record<string, unknown>) {
	return {
		type: 'object' as const,
		properties
	}
}

function v2ListResponseSchema(itemSchema: Record<string, unknown>) {
	return {
		type: 'object' as const,
		properties: {
			data: {
				type: 'array' as const,
				items: itemSchema
			},
			meta: v2PaginationMeta
		},
		required: ['data', 'meta']
	}
}

function filterParameter(
	name: string,
	example: string | number,
	type: 'string' | 'number' = 'string'
) {
	return {
		name: `filter[${name}]`,
		in: 'query' as const,
		required: false,
		schema: { type },
		allowReserved: true,
		example
	}
}

function fieldsParameter(example: string) {
	return {
		name: 'fields',
		in: 'query' as const,
		required: false,
		description:
			'Comma-separated fields to return. Use `*` for the default field set and dot notation for expanded fields.',
		schema: stringSchema,
		allowReserved: true,
		example
	}
}

function listPath(options: {
	tag: string
	summary: string
	description?: string
	schema: Record<string, unknown>
	fieldsExample: string
	parameters?: Array<Record<string, unknown>>
	notFound?: boolean
}) {
	return {
		get: {
			tags: [options.tag],
			summary: options.summary,
			description: options.description,
			parameters: [
				v2SearchParameter,
				v2SortParameter,
				fieldsParameter(options.fieldsExample),
				...(options.parameters ?? []),
				...v2PaginationParams
			],
			responses: {
				'200': {
					description: `Paginated ${options.summary.toLowerCase()} response`,
					content: {
						'application/json': {
							schema: v2ListResponseSchema(options.schema)
						}
					}
				},
				'400': v2ErrorResponse,
				...(options.notFound ? { '404': v2ErrorResponse } : {})
			}
		}
	}
}

function pathParameter(name: string, example: string, description?: string) {
	return {
		name,
		in: 'path' as const,
		required: true,
		description,
		schema: stringSchema,
		example
	}
}

function nestedDetailPath(options: {
	tag: string
	summary: string
	description?: string
	schema: Record<string, unknown>
	fieldsExample: string
	parameters: Array<Record<string, unknown>>
	conflict?: boolean
}) {
	return {
		get: {
			tags: [options.tag],
			summary: options.summary,
			description: options.description,
			parameters: [
				...options.parameters,
				fieldsParameter(options.fieldsExample)
			],
			responses: {
				'200': {
					description: `${options.summary} response`,
					content: {
						'application/json': { schema: options.schema }
					}
				},
				'400': v2ErrorResponse,
				'404': v2ErrorResponse,
				...(options.conflict ? { '409': v2AmbiguousResponse } : {})
			}
		}
	}
}

function detailPath(options: {
	tag: string
	summary: string
	description?: string
	schema: Record<string, unknown>
	example: string
	idDescription?: string
	fieldsExample: string
	parameters?: Array<Record<string, unknown>>
	conflict?: boolean
}) {
	return nestedDetailPath({
		tag: options.tag,
		summary: options.summary,
		description: options.description,
		schema: options.schema,
		fieldsExample: options.fieldsExample,
		parameters: [
			pathParameter('id', options.example, options.idDescription),
			...(options.parameters ?? [])
		],
		conflict: options.conflict
	})
}
