export type Param = {
	name: string
	type: string
	desc: string
	required?: boolean
	/** Prefilled in the Try it panel. Params without one are documented only. */
	example?: string
}

export type Endpoint = {
	id: string
	nav: string
	group: string
	title: string
	path: string
	desc: string
	pathParams: Param[]
	query: Param[]
}

const fields: Param = {
	name: 'fields',
	type: 'string',
	desc: 'Comma-separated fields to return. Use dots for nested fields.'
}

function listParams(options: {
	filters: string
	sortExample?: string
	examples?: Partial<Record<'q' | 'sort' | 'fields' | 'limit', string>>
	extra?: Param[]
}): Param[] {
	const { filters, sortExample = 'name', examples = {}, extra = [] } = options
	return [
		{ name: 'q', type: 'string', desc: 'Match by name.', example: examples.q },
		...extra,
		{
			name: 'filter[…]',
			type: 'string',
			desc: `Exact filters: ${filters}.`
		},
		{
			name: 'sort',
			type: 'string',
			desc: `Field to sort by. Prefix with a minus for descending, for example ${sortExample}.`,
			example: examples.sort
		},
		{ ...fields, example: examples.fields },
		{
			name: 'limit',
			type: 'integer',
			desc: 'Results per page. Default 25, maximum 2,000.',
			example: examples.limit
		},
		{
			name: 'offset / cursor',
			type: 'integer / string',
			desc: 'Page through results with an offset, or pass meta.cursor from the previous page. Use one, not both.'
		}
	]
}

const countryParam: Param = {
	name: 'country',
	type: 'string',
	required: true,
	desc: 'Country name, ISO 3166-1 alpha-2 or alpha-3 code. Example: JP, JPN or Japan.',
	example: 'JP'
}

export const ENDPOINTS: Endpoint[] = [
	{
		id: 'your-location',
		nav: 'Your location',
		group: 'Location',
		title: 'Look up the caller',
		path: '/v2/',
		desc: 'Returns where the request came from: IP address, country, region, city, coordinates and timezone, with full country, state and city details attached.',
		pathParams: [],
		query: [{ ...fields, example: 'ip,city,country,timezone' }]
	},
	{
		id: 'search',
		nav: 'Search',
		group: 'Search',
		title: 'Search places',
		path: '/v2/search',
		desc: 'Find countries, states and cities by name in one request. Built for location autocomplete.',
		pathParams: [],
		query: [
			{
				name: 'q',
				type: 'string',
				required: true,
				desc: 'The text to match.',
				example: 'tokyo'
			},
			{
				name: 'type',
				type: 'string',
				desc: 'Comma-separated place types: country, state, city.',
				example: 'country,state,city'
			},
			{
				name: 'limit',
				type: 'integer',
				desc: 'Maximum results. Default 25.',
				example: '10'
			}
		]
	},
	{
		id: 'reverse',
		nav: 'Reverse lookup',
		group: 'Search',
		title: 'Find the place at a point',
		path: '/v2/reverse',
		desc: 'Returns the nearest city to a latitude and longitude, with its state, country and timezone. Returns not_found when no city is within 400 km.',
		pathParams: [],
		query: [
			{
				name: 'lat',
				type: 'number',
				required: true,
				desc: 'Latitude in decimal degrees.',
				example: '35.68'
			},
			{
				name: 'lng',
				type: 'number',
				required: true,
				desc: 'Longitude in decimal degrees.',
				example: '139.75'
			},
			{
				name: 'lang',
				type: 'string',
				desc: 'Language code for the local country name, for example ja.'
			}
		]
	},
	{
		id: 'countries',
		nav: 'Countries',
		group: 'Countries',
		title: 'List countries',
		path: '/v2/countries',
		desc: 'Every country and territory with ISO codes, capital, currency, calling code, languages and everyday conventions. Add expand=statistics or expand=timezones for more.',
		pathParams: [],
		query: listParams({
			filters:
				'country, continent, region, currency, minPopulation, maxPopulation',
			sortExample: '-population',
			examples: {
				sort: '-population',
				fields: 'name,capital,population',
				limit: '5'
			},
			extra: [
				{
					name: 'expand',
					type: 'string',
					desc: 'Attach related data: statistics, timezones, translations.'
				}
			]
		})
	},
	{
		id: 'country',
		nav: 'Country',
		group: 'Countries',
		title: 'Get a country',
		path: '/v2/countries/{country}',
		desc: 'One country by name or ISO code. Pass lang to include its name in another language.',
		pathParams: [countryParam],
		query: [
			{
				name: 'lang',
				type: 'string',
				desc: 'Language code for localName, for example ja.',
				example: 'ja'
			},
			{
				name: 'expand',
				type: 'string',
				desc: 'Attach related data: statistics, timezones, translations.',
				example: 'timezones'
			},
			fields
		]
	},
	{
		id: 'states',
		nav: 'States',
		group: 'Countries',
		title: 'List states in a country',
		path: '/v2/countries/{country}/states',
		desc: 'Every first-level region of a country, such as states, provinces and prefectures, with ISO 3166-2 codes, capital and population.',
		pathParams: [countryParam],
		query: listParams({
			filters: 'state, timezone, minPopulation, maxPopulation',
			sortExample: '-population',
			examples: {
				sort: '-population',
				fields: 'name,iso31662,population',
				limit: '5'
			}
		})
	},
	{
		id: 'cities',
		nav: 'Cities in a state',
		group: 'Cities',
		title: 'List cities in a state',
		path: '/v2/countries/{country}/states/{state}/cities',
		desc: 'Returns every city in a state or province, with coordinates, population and timezone. Country and state accept a name or an ISO code.',
		pathParams: [
			countryParam,
			{
				name: 'state',
				type: 'string',
				required: true,
				desc: 'State name or code within that country. Example: Tokyo or 13.',
				example: 'Tokyo'
			}
		],
		query: listParams({
			filters: 'timezone, minPopulation, maxPopulation',
			sortExample: '-population',
			examples: {
				sort: '-population',
				fields: 'name,population,timezone',
				limit: '3'
			}
		})
	},
	{
		id: 'nearby',
		nav: 'Nearby cities',
		group: 'Cities',
		title: 'Find cities near a point',
		path: '/v2/cities',
		desc: 'Cities within a radius of a point, closest first. Each result includes distanceKm.',
		pathParams: [],
		query: [
			{
				name: 'near',
				type: 'string',
				required: true,
				desc: 'Latitude and longitude separated by a comma.',
				example: '35.68,139.75'
			},
			{
				name: 'radius',
				type: 'number',
				desc: 'Search radius in kilometres. Maximum 300.',
				example: '50'
			},
			{ ...fields, example: 'name,population,distanceKm' },
			{
				name: 'limit',
				type: 'integer',
				desc: 'Results per page. Default 25, maximum 2,000.',
				example: '5'
			}
		]
	},
	{
		id: 'airports',
		nav: 'Airports',
		group: 'Travel',
		title: 'List airports',
		path: '/v2/airports',
		desc: 'Airports with IATA codes, elevation, coordinates, country and timezone.',
		pathParams: [],
		query: listParams({
			filters: 'country, state, timezone, iata',
			examples: {
				q: 'heathrow',
				fields: 'name,iataCode,countryCode',
				limit: '5'
			}
		})
	},
	{
		id: 'ports',
		nav: 'Ports',
		group: 'Travel',
		title: 'List ports',
		path: '/v2/ports',
		desc: 'Seaports and river ports with UN/LOCODE codes, status and coordinates.',
		pathParams: [],
		query: listParams({
			filters: 'country, state, iata',
			examples: {
				q: 'rotterdam',
				fields: 'name,unLocode,countryCode',
				limit: '5'
			}
		})
	},
	{
		id: 'border-crossings',
		nav: 'Border crossings',
		group: 'Travel',
		title: 'List border crossings',
		path: '/v2/border-crossings',
		desc: 'Official land crossing points with UN/LOCODE codes and coordinates.',
		pathParams: [],
		query: listParams({
			filters: 'country, state',
			examples: { fields: 'name,unLocode,countryCode', limit: '5' }
		})
	},
	{
		id: 'airlines',
		nav: 'Airlines',
		group: 'Travel',
		title: 'List airlines',
		path: '/v2/airlines',
		desc: 'IATA member airlines with their IATA and ICAO designators.',
		pathParams: [],
		query: listParams({
			filters: 'country, iata',
			examples: { q: 'japan', limit: '5' }
		})
	},
	{
		id: 'timezones',
		nav: 'Timezones',
		group: 'Time and money',
		title: 'List timezones',
		path: '/v2/timezones',
		desc: 'IANA timezones with standard and daylight saving offsets and the countries that use them.',
		pathParams: [],
		query: listParams({
			filters: 'country, timezone',
			sortExample: 'standardOffset',
			examples: { q: 'tokyo', limit: '5' }
		})
	},
	{
		id: 'local-time',
		nav: 'Local time',
		group: 'Time and money',
		title: 'Current time in a timezone',
		path: '/v2/timezones/{timezone}/now',
		desc: 'The current local time, UTC offset, whether daylight saving is in effect and when the clocks next change.',
		pathParams: [
			{
				name: 'timezone',
				type: 'string',
				required: true,
				desc: 'IANA timezone id. Slashes are allowed. Example: Asia/Tokyo.',
				example: 'Asia/Tokyo'
			}
		],
		query: []
	},
	{
		id: 'currencies',
		nav: 'Currencies',
		group: 'Time and money',
		title: 'List currencies',
		path: '/v2/currencies',
		desc: 'ISO 4217 currencies with symbol, decimal places and the countries that use each one.',
		pathParams: [],
		query: listParams({
			filters: 'country, currency',
			sortExample: 'code',
			examples: { q: 'euro', limit: '5' }
		})
	},
	{
		id: 'languages',
		nav: 'Languages',
		group: 'People',
		title: 'List languages',
		path: '/v2/languages',
		desc: 'Every living, historic and extinct language with ISO 639-1, 639-2 and 639-3 codes.',
		pathParams: [],
		query: listParams({
			filters: 'code, scope, type, macrolanguage',
			sortExample: 'referenceName',
			examples: { q: 'japanese', limit: '5' }
		})
	},
	{
		id: 'statistics',
		nav: 'Statistics',
		group: 'People',
		title: 'Country statistics',
		path: '/v2/statistics',
		desc: 'Population, age structure, urbanisation, GDP and life expectancy for every country, each with its year. Ask for individual figures with fields.',
		pathParams: [],
		query: listParams({
			filters: 'country',
			sortExample: 'countryName',
			examples: {
				fields: 'countryName,populationTotal,lifeExpectancy',
				limit: '5'
			}
		})
	},
	{
		id: 'migration',
		nav: 'Migration',
		group: 'People',
		title: 'Migrant stocks',
		path: '/v2/migrant-stocks',
		desc: 'How many residents of each country were born abroad, and where they were born.',
		pathParams: [],
		query: listParams({
			filters: 'country',
			sortExample: '-migrantShareOfPopulationPercent',
			examples: {
				sort: '-migrantShareOfPopulationPercent',
				fields:
					'countryName,totalInternationalMigrants,migrantShareOfPopulationPercent',
				limit: '5'
			}
		})
	},
	{
		id: 'meta',
		nav: 'Dataset info',
		group: 'About the data',
		title: 'Dataset info',
		path: '/v2/meta',
		desc: 'The current data version, when it was last updated, and each dataset with its record count, source and licence.',
		pathParams: [],
		query: []
	}
]
