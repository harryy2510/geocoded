import { defineV2Resource } from './query'

export const v2StatisticsResource = defineV2Resource({
	name: 'statistics',
	fields: {
		id: { type: 'string', column: 'country_code', normalize: 'uppercase' },
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		countryName: {
			type: 'string',
			column: 'country_name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		iso3: { type: 'string', column: 'iso3', normalize: 'uppercase' },
		populationTotal: { type: 'object' },
		populationFemale: { type: 'object' },
		populationMale: { type: 'object' },
		populationDensity: { type: 'object' },
		urbanPopulationPercent: { type: 'object' },
		ruralPopulationPercent: { type: 'object' },
		age0To14Percent: { type: 'object' },
		age15To64Percent: { type: 'object' },
		age65PlusPercent: { type: 'object' },
		gdpCurrentUsd: { type: 'object' },
		gdpPerCapitaCurrentUsd: { type: 'object' },
		lifeExpectancy: { type: 'object' }
	},
	defaultFields: [
		'id',
		'countryCode',
		'countryName',
		'iso3',
		'populationTotal',
		'populationFemale',
		'populationMale',
		'populationDensity',
		'urbanPopulationPercent',
		'ruralPopulationPercent',
		'age0To14Percent',
		'age15To64Percent',
		'age65PlusPercent',
		'gdpCurrentUsd',
		'gdpPerCapitaCurrentUsd',
		'lifeExpectancy'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' }
	},
	search: { fields: ['countryName', 'countryCode', 'iso3'] },
	sort: {
		default: { field: 'countryName', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2CountryResource = defineV2Resource({
	name: 'countries',
	fields: {
		id: { type: 'string', column: 'iso2', normalize: 'uppercase' },
		iso2: { type: 'string', column: 'iso2', normalize: 'uppercase' },
		iso3: { type: 'string', column: 'iso3', normalize: 'uppercase' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		native: { type: 'string', column: 'native', caseInsensitive: true },
		capital: { type: 'string', column: 'capital', caseInsensitive: true },
		continent: { type: 'string', column: 'continent' },
		region: { type: 'string', column: 'region' },
		subregion: { type: 'string', column: 'subregion' },
		currency: { type: 'string', column: 'currency', normalize: 'uppercase' },
		currencyName: { type: 'string', column: 'currency_name' },
		currencySymbol: { type: 'string', column: 'currency_symbol' },
		tld: { type: 'string', column: 'tld' },
		phoneCode: { type: 'string', column: 'phone_code' },
		numericCode: { type: 'string', column: 'numeric_code' },
		nationality: { type: 'string', column: 'nationality' },
		emoji: { type: 'string', column: 'emoji' },
		emojiU: { type: 'string', column: 'emoji_u' },
		latitude: { type: 'string', column: 'latitude' },
		longitude: { type: 'string', column: 'longitude' },
		areaSqKm: { type: 'number', column: 'area_sq_km', sortable: true },
		population: { type: 'number', column: 'population', sortable: true },
		gdp: { type: 'number', column: 'gdp', sortable: true },
		literacy: { type: 'number', column: 'literacy', sortable: true },
		postalCodeFormat: { type: 'string', column: 'postal_code_format' },
		postalCodeRegex: { type: 'string', column: 'postal_code_regex' },
		drivingSide: { type: 'string', column: 'driving_side' },
		measurementSystem: { type: 'string', column: 'measurement_system' },
		firstDayOfWeek: { type: 'string', column: 'first_day_of_week' },
		timeFormat: { type: 'string', column: 'time_format' },
		flagUrl: { type: 'string', column: 'flag_url' },
		languages: { type: 'array', column: 'languages' },
		neighbours: { type: 'array', column: 'neighbours', normalize: 'uppercase' },
		timezones: { type: 'array', column: 'timezones' },
		translations: { type: 'object', column: 'translations' }
	},
	defaultFields: [
		'id',
		'iso2',
		'iso3',
		'name',
		'native',
		'capital',
		'continent',
		'region',
		'subregion',
		'currency',
		'currencyName',
		'currencySymbol',
		'tld',
		'phoneCode',
		'numericCode',
		'nationality',
		'emoji',
		'emojiU',
		'latitude',
		'longitude',
		'areaSqKm',
		'population',
		'gdp',
		'literacy',
		'postalCodeFormat',
		'postalCodeRegex',
		'drivingSide',
		'measurementSystem',
		'firstDayOfWeek',
		'timeFormat',
		'flagUrl',
		'languages',
		'neighbours'
	],
	filters: {
		country: { field: 'iso2', operator: 'eq' },
		continent: { field: 'continent', operator: 'eq' },
		region: { field: 'region', operator: 'eq' },
		currency: { field: 'currency', operator: 'eq' },
		minPopulation: { field: 'population', operator: 'gte' },
		maxPopulation: { field: 'population', operator: 'lte' }
	},
	search: { fields: ['name', 'iso2', 'iso3'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	expands: {
		statistics: { resource: v2StatisticsResource, kind: 'object' }
	},
	strictUnknownParams: true
})

export const v2ContinentResource = defineV2Resource({
	name: 'continents',
	fields: {
		id: { type: 'string', column: 'id' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		countryCount: { type: 'number', column: 'country_count', sortable: true }
	},
	defaultFields: ['id', 'name', 'countryCount'],
	search: { fields: ['name'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2RegionResource = defineV2Resource({
	name: 'regions',
	fields: {
		id: { type: 'string', column: 'id' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		continent: { type: 'string', column: 'continent' },
		countryCount: { type: 'number', column: 'country_count', sortable: true }
	},
	defaultFields: ['id', 'name', 'continent', 'countryCount'],
	filters: {
		continent: { field: 'continent', operator: 'eq' },
		region: { field: 'name', operator: 'eq' }
	},
	search: { fields: ['name', 'continent'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2StateResource = defineV2Resource({
	name: 'states',
	fields: {
		id: { type: 'string' },
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		countryName: { type: 'string', column: 'country_name' },
		stateCode: { type: 'string', column: 'iso2', normalize: 'uppercase' },
		iso31662: { type: 'string', column: 'iso3166_2' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		type: { type: 'string', column: 'type' },
		population: { type: 'number', column: 'population', sortable: true },
		latitude: { type: 'string', column: 'latitude' },
		longitude: { type: 'string', column: 'longitude' },
		timezone: { type: 'string', column: 'timezone', sortable: true },
		capital: { type: 'string', column: 'capital' }
	},
	defaultFields: [
		'id',
		'countryCode',
		'countryName',
		'stateCode',
		'iso31662',
		'name',
		'type',
		'population',
		'latitude',
		'longitude',
		'timezone',
		'capital'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' },
		state: { field: 'stateCode', operator: 'eq' },
		timezone: { field: 'timezone', operator: 'eq' },
		minPopulation: { field: 'population', operator: 'gte' },
		maxPopulation: { field: 'population', operator: 'lte' }
	},
	search: { fields: ['name', 'countryCode', 'stateCode'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2CityResource = defineV2Resource({
	name: 'cities',
	fields: {
		id: { type: 'string' },
		geonameId: { type: 'number', column: 'geoname_id' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		countryName: { type: 'string', column: 'country_name' },
		stateCode: { type: 'string', column: 'state_code', normalize: 'uppercase' },
		stateName: { type: 'string', column: 'state_name' },
		latitude: { type: 'string', column: 'latitude' },
		longitude: { type: 'string', column: 'longitude' },
		population: { type: 'number', column: 'population', sortable: true },
		timezone: { type: 'string', column: 'timezone' }
	},
	defaultFields: [
		'id',
		'geonameId',
		'name',
		'countryCode',
		'countryName',
		'stateCode',
		'stateName',
		'latitude',
		'longitude',
		'population',
		'timezone'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' },
		state: { field: 'stateCode', operator: 'eq' },
		timezone: { field: 'timezone', operator: 'eq' },
		minPopulation: { field: 'population', operator: 'gte' },
		maxPopulation: { field: 'population', operator: 'lte' }
	},
	search: { fields: ['name', 'countryCode', 'stateCode'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2TimezoneResource = defineV2Resource({
	name: 'timezones',
	fields: {
		id: { type: 'string', column: 'timezone' },
		timezone: { type: 'string', column: 'timezone', sortable: true },
		countryCodes: {
			type: 'array',
			column: 'country_codes',
			normalize: 'uppercase'
		},
		coordinates: { type: 'string', column: 'coordinates' },
		latitude: { type: 'number', column: 'latitude' },
		longitude: { type: 'number', column: 'longitude' },
		area: { type: 'string', column: 'area', searchable: true },
		location: { type: 'string', column: 'location', searchable: true },
		abbreviation: { type: 'string', column: 'abbreviation' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		standardOffset: {
			type: 'number',
			column: 'standard_offset',
			sortable: true
		},
		standardOffsetName: { type: 'string', column: 'standard_offset_name' },
		standardAbbreviation: { type: 'string', column: 'standard_abbreviation' },
		standardName: { type: 'string', column: 'standard_name' },
		daylightOffset: { type: 'number', column: 'daylight_offset' },
		daylightOffsetName: { type: 'string', column: 'daylight_offset_name' },
		daylightAbbreviation: { type: 'string', column: 'daylight_abbreviation' },
		daylightName: { type: 'string', column: 'daylight_name' },
		observesDst: { type: 'boolean', column: 'observes_dst' }
	},
	defaultFields: [
		'id',
		'timezone',
		'countryCodes',
		'coordinates',
		'latitude',
		'longitude',
		'area',
		'location',
		'abbreviation',
		'name',
		'standardOffset',
		'standardOffsetName',
		'standardAbbreviation',
		'standardName',
		'daylightOffset',
		'daylightOffsetName',
		'daylightAbbreviation',
		'daylightName',
		'observesDst'
	],
	filters: {
		country: { field: 'countryCodes', operator: 'contains' },
		timezone: { field: 'timezone', operator: 'eq' }
	},
	search: { fields: ['timezone', 'name', 'area', 'location'] },
	sort: {
		default: { field: 'timezone', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2CurrencyResource = defineV2Resource({
	name: 'currencies',
	fields: {
		id: { type: 'string', column: 'code', normalize: 'uppercase' },
		code: {
			type: 'string',
			column: 'code',
			normalize: 'uppercase',
			sortable: true
		},
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		symbol: { type: 'string', column: 'symbol' },
		decimals: { type: 'number', column: 'decimals' },
		countries: { type: 'array', column: 'countries', normalize: 'uppercase' }
	},
	defaultFields: ['id', 'code', 'name', 'symbol', 'decimals', 'countries'],
	filters: {
		country: { field: 'countries', operator: 'contains' },
		currency: { field: 'code', operator: 'eq' }
	},
	search: { fields: ['code', 'name'] },
	sort: {
		default: { field: 'code', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2LanguageResource = defineV2Resource({
	name: 'languages',
	fields: {
		id: { type: 'string', column: 'id', normalize: 'lowercase' },
		iso6393: { type: 'string', column: 'iso6393', normalize: 'lowercase' },
		iso6392B: {
			type: 'string',
			column: 'iso6392_b',
			normalize: 'lowercase'
		},
		iso6392T: {
			type: 'string',
			column: 'iso6392_t',
			normalize: 'lowercase'
		},
		iso6391: { type: 'string', column: 'iso6391', normalize: 'lowercase' },
		scope: { type: 'string', column: 'scope' },
		type: { type: 'string', column: 'type' },
		referenceName: {
			type: 'string',
			column: 'reference_name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		names: { type: 'array', column: 'names' },
		macrolanguageCode: {
			type: 'string',
			column: 'macrolanguage_code',
			normalize: 'lowercase'
		},
		macrolanguageMemberCodes: {
			type: 'array',
			column: 'macrolanguage_member_codes',
			normalize: 'lowercase'
		},
		comment: { type: 'string', column: 'comment' },
		lookupCodes: {
			type: 'array',
			column: 'lookup_codes',
			normalize: 'lowercase'
		}
	},
	defaultFields: [
		'id',
		'iso6393',
		'iso6392B',
		'iso6392T',
		'iso6391',
		'scope',
		'type',
		'referenceName',
		'names',
		'macrolanguageCode',
		'macrolanguageMemberCodes',
		'comment'
	],
	filters: {
		code: { field: 'lookupCodes', operator: 'contains' },
		scope: { field: 'scope', operator: 'eq' },
		type: { field: 'type', operator: 'eq' },
		macrolanguage: { field: 'macrolanguageCode', operator: 'eq' }
	},
	search: {
		fields: ['referenceName', 'iso6393', 'iso6392B', 'iso6392T', 'iso6391']
	},
	sort: {
		default: { field: 'referenceName', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2AirlineResource = defineV2Resource({
	name: 'airlines',
	fields: {
		id: { type: 'string', column: 'id' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		iataCode: { type: 'string', column: 'iata_code', normalize: 'uppercase' },
		accountingCode: { type: 'string', column: 'accounting_code' },
		icaoCode: { type: 'string', column: 'icao_code', normalize: 'uppercase' },
		countryName: { type: 'string', column: 'country_name' },
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		controlledDuplicate: {
			type: 'boolean',
			column: 'controlled_duplicate'
		}
	},
	defaultFields: [
		'id',
		'name',
		'iataCode',
		'accountingCode',
		'icaoCode',
		'countryName',
		'countryCode',
		'controlledDuplicate'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' },
		iata: { field: 'iataCode', operator: 'eq' }
	},
	search: { fields: ['name', 'iataCode', 'icaoCode'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2AirportResource = defineV2Resource({
	name: 'airports',
	fields: {
		id: { type: 'string', column: 'id' },
		geonameId: { type: 'number', column: 'geoname_id' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		asciiName: { type: 'string', column: 'ascii_name' },
		alternateNames: { type: 'array', column: 'alternate_names' },
		unLocode: { type: 'string', column: 'un_locode', normalize: 'uppercase' },
		airportLocationCode: {
			type: 'string',
			column: 'airport_location_code',
			normalize: 'uppercase'
		},
		iataCode: { type: 'string', column: 'iata_code', normalize: 'uppercase' },
		iataCodeSource: { type: 'string', column: 'iata_code_source' },
		latitude: { type: 'string', column: 'latitude' },
		longitude: { type: 'string', column: 'longitude' },
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		countryName: { type: 'string', column: 'country_name' },
		stateCode: { type: 'string', column: 'state_code', normalize: 'uppercase' },
		stateName: { type: 'string', column: 'state_name' },
		admin2Code: { type: 'string', column: 'admin2_code' },
		elevation: { type: 'number', column: 'elevation' },
		timezone: { type: 'string', column: 'timezone' },
		modificationDate: { type: 'string', column: 'modification_date' }
	},
	defaultFields: [
		'id',
		'geonameId',
		'name',
		'asciiName',
		'alternateNames',
		'unLocode',
		'airportLocationCode',
		'iataCode',
		'iataCodeSource',
		'latitude',
		'longitude',
		'countryCode',
		'countryName',
		'stateCode',
		'stateName',
		'admin2Code',
		'elevation',
		'timezone',
		'modificationDate'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' },
		state: { field: 'stateCode', operator: 'eq' },
		timezone: { field: 'timezone', operator: 'eq' },
		iata: { field: 'iataCode', operator: 'eq' }
	},
	search: { fields: ['name', 'asciiName', 'iataCode'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	strictUnknownParams: true
})

export const v2PortResource = transportLocationResource('ports')

export const v2BorderCrossingResource =
	transportLocationResource('border-crossings')

export const v2MigrationResource = defineV2Resource({
	name: 'migrant-stocks',
	fields: {
		id: { type: 'string', column: 'country_code', normalize: 'uppercase' },
		countryCode: {
			type: 'string',
			column: 'country_code',
			normalize: 'uppercase'
		},
		countryName: {
			type: 'string',
			column: 'country_name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		iso3: { type: 'string', column: 'iso3', normalize: 'uppercase' },
		m49Code: { type: 'string', column: 'm49_code' },
		year: { type: 'number', column: 'year', sortable: true },
		coverage: { type: 'string', column: 'coverage' },
		sourceDataTypeCode: { type: 'string', column: 'source_data_type_code' },
		sourceDataTypeMethods: {
			type: 'array',
			column: 'source_data_type_methods'
		},
		totalInternationalMigrants: {
			type: 'number',
			column: 'total_international_migrants',
			sortable: true
		},
		maleInternationalMigrants: {
			type: 'number',
			column: 'male_international_migrants'
		},
		femaleInternationalMigrants: {
			type: 'number',
			column: 'female_international_migrants'
		},
		migrantShareOfPopulationPercent: {
			type: 'number',
			column: 'migrant_share_of_population_percent',
			sortable: true
		},
		origins: { type: 'array', column: 'origins' }
	},
	defaultFields: [
		'id',
		'countryCode',
		'countryName',
		'iso3',
		'm49Code',
		'year',
		'coverage',
		'sourceDataTypeCode',
		'sourceDataTypeMethods',
		'totalInternationalMigrants',
		'maleInternationalMigrants',
		'femaleInternationalMigrants',
		'migrantShareOfPopulationPercent',
		'origins'
	],
	filters: {
		country: { field: 'countryCode', operator: 'eq' }
	},
	search: { fields: ['countryName', 'countryCode', 'iso3'] },
	sort: {
		default: { field: 'countryName', direction: 'asc' }
	},
	strictUnknownParams: true
})

function transportLocationResource(name: 'ports' | 'border-crossings') {
	return defineV2Resource({
		name,
		fields: {
			id: { type: 'string', column: 'id', normalize: 'uppercase' },
			unLocode: { type: 'string', column: 'un_locode', normalize: 'uppercase' },
			countryCode: {
				type: 'string',
				column: 'country_code',
				normalize: 'uppercase'
			},
			countryName: { type: 'string', column: 'country_name' },
			locationCode: {
				type: 'string',
				column: 'location_code',
				normalize: 'uppercase'
			},
			iataCode: { type: 'string', column: 'iata_code', normalize: 'uppercase' },
			iataCodeSource: { type: 'string', column: 'iata_code_source' },
			name: {
				type: 'string',
				column: 'name',
				caseInsensitive: true,
				searchable: true,
				sortable: true
			},
			nameWithoutDiacritics: {
				type: 'string',
				column: 'name_without_diacritics'
			},
			alternateNames: { type: 'array', column: 'alternate_names' },
			subdivisionCode: {
				type: 'string',
				column: 'subdivision_code',
				normalize: 'uppercase'
			},
			functionCode: { type: 'string', column: 'function_code' },
			functions: { type: 'array', column: 'functions' },
			status: { type: 'string', column: 'status' },
			statusName: { type: 'string', column: 'status_name' },
			date: { type: 'string', column: 'date' },
			coordinates: { type: 'string', column: 'coordinates' },
			latitude: { type: 'number', column: 'latitude' },
			longitude: { type: 'number', column: 'longitude' },
			remarks: { type: 'string', column: 'remarks' },
			changeIndicator: { type: 'string', column: 'change_indicator' }
		},
		defaultFields: [
			'id',
			'unLocode',
			'countryCode',
			'countryName',
			'locationCode',
			'iataCode',
			'iataCodeSource',
			'name',
			'nameWithoutDiacritics',
			'alternateNames',
			'subdivisionCode',
			'functionCode',
			'functions',
			'status',
			'statusName',
			'date',
			'coordinates',
			'latitude',
			'longitude',
			'remarks',
			'changeIndicator'
		],
		filters: {
			country: { field: 'countryCode', operator: 'eq' },
			state: { field: 'subdivisionCode', operator: 'eq' },
			iata: { field: 'iataCode', operator: 'eq' }
		},
		search: {
			fields: ['name', 'nameWithoutDiacritics', 'unLocode', 'iataCode']
		},
		sort: {
			default: { field: 'name', direction: 'asc' }
		},
		strictUnknownParams: true
	})
}
