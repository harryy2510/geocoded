import type { SiteConfig } from './types'

const fieldsParameter = {
	name: 'fields',
	in: 'query' as const,
	required: false,
	description:
		'Comma-separated list of fields to return. Supports dot notation for nested fields (e.g. `countryInfo.name,countryInfo.iso2`). When omitted, all fields are returned.',
	schema: { type: 'string' as const },
	example: 'name,iso2'
}

const errorResponse = {
	description: 'Error response',
	content: {
		'application/json': {
			schema: {
				type: 'object' as const,
				properties: {
					error: { type: 'string' as const }
				},
				required: ['error']
			}
		}
	}
}

const timezoneSchema = {
	type: 'object' as const,
	properties: {
		abbreviation: { type: 'string' as const },
		gmtOffset: { type: 'number' as const },
		gmtOffsetName: { type: 'string' as const },
		tzName: { type: 'string' as const },
		zoneName: { type: 'string' as const }
	}
}

const countrySchema = {
	type: 'object' as const,
	properties: {
		areaSqKm: { type: 'number' as const },
		capital: { type: 'string' as const },
		continent: { type: 'string' as const },
		currency: { type: 'string' as const },
		currencyName: { type: 'string' as const },
		currencySymbol: { type: 'string' as const },
		drivingSide: { type: 'string' as const },
		emoji: { type: 'string' as const },
		emojiU: { type: 'string' as const },
		firstDayOfWeek: { type: 'string' as const },
		flagUrl: { type: 'string' as const },
		gdp: { type: 'number' as const, nullable: true },
		geonameId: { type: 'number' as const },
		iso2: { type: 'string' as const },
		iso3: { type: 'string' as const },
		languages: {
			type: 'array' as const,
			items: { type: 'string' as const }
		},
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		measurementSystem: { type: 'string' as const },
		name: { type: 'string' as const },
		nationality: { type: 'string' as const },
		native: { type: 'string' as const },
		neighbours: {
			type: 'array' as const,
			items: { type: 'string' as const }
		},
		numericCode: { type: 'string' as const },
		phoneCode: { type: 'string' as const },
		population: { type: 'number' as const },
		postalCodeFormat: { type: 'string' as const, nullable: true },
		postalCodeRegex: { type: 'string' as const, nullable: true },
		region: { type: 'string' as const },
		subregion: { type: 'string' as const },
		timeFormat: { type: 'string' as const },
		timezones: { type: 'array' as const, items: timezoneSchema },
		tld: { type: 'string' as const },
		translations: {
			type: 'object' as const,
			additionalProperties: { type: 'string' as const }
		},
		wikiDataId: { type: 'string' as const }
	}
}

const stateSchema = {
	type: 'object' as const,
	properties: {
		capital: { type: 'string' as const, nullable: true },
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		geonameId: { type: 'number' as const },
		iso2: { type: 'string' as const },
		iso31662: { type: 'string' as const },
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		name: { type: 'string' as const },
		population: { type: 'number' as const, nullable: true },
		timezone: { type: 'string' as const },
		type: { type: 'string' as const }
	}
}

const citySchema = {
	type: 'object' as const,
	properties: {
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		geonameId: { type: 'number' as const },
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		name: { type: 'string' as const },
		population: { type: 'number' as const },
		stateCode: { type: 'string' as const },
		stateName: { type: 'string' as const },
		timezone: { type: 'string' as const }
	}
}

const locationSchema = {
	type: 'object' as const,
	properties: {
		asn: { type: 'number' as const },
		asOrganization: { type: 'string' as const },
		city: { type: 'string' as const },
		cityInfo: {
			description: 'Full city details (matched by city name)',
			...citySchema
		},
		colo: { type: 'string' as const },
		continent: { type: 'string' as const },
		country: { type: 'string' as const },
		countryInfo: {
			description: 'Full country details (matched by country code)',
			...countrySchema
		},
		ip: { type: 'string' as const },
		isEU: { type: 'boolean' as const },
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		postalCode: { type: 'string' as const },
		region: { type: 'string' as const },
		regionCode: { type: 'string' as const },
		stateInfo: {
			description: 'Full state details (matched by region code)',
			...stateSchema
		},
		timezone: { type: 'string' as const }
	}
}

const paginationParams = [
	{
		name: 'limit',
		in: 'query' as const,
		required: false,
		description:
			'Maximum number of results to return (1-250, default 25). When provided, response is wrapped in `{ data, meta }`.',
		schema: {
			type: 'integer' as const,
			minimum: 1,
			maximum: 250,
			default: 25
		}
	},
	{
		name: 'offset',
		in: 'query' as const,
		required: false,
		description:
			'Number of results to skip (default 0). Cannot be combined with `cursor`.',
		schema: { type: 'integer' as const, minimum: 0, default: 0 }
	},
	{
		name: 'cursor',
		in: 'query' as const,
		required: false,
		description:
			'Opaque cursor for cursor-based pagination. Use the `cursor` value from a previous response `meta` to fetch the next page. Cannot be combined with `offset`.',
		schema: { type: 'string' as const }
	}
]

const paginationMeta = {
	type: 'object' as const,
	properties: {
		total: {
			type: 'integer' as const,
			description: 'Total number of matching records'
		},
		limit: { type: 'integer' as const },
		offset: { type: 'integer' as const },
		hasMore: { type: 'boolean' as const },
		cursor: {
			type: 'string' as const,
			nullable: true,
			description:
				'Opaque cursor to pass as `?cursor=` to fetch the next page. Null when there are no more results.'
		}
	},
	required: ['total', 'limit', 'offset', 'hasMore', 'cursor']
}

function listResponseSchema(itemSchema: Record<string, unknown>) {
	return {
		oneOf: [
			{
				type: 'array' as const,
				items: itemSchema,
				description: 'Full array (when no pagination params are provided)'
			},
			{
				type: 'object' as const,
				properties: {
					data: {
						type: 'array' as const,
						items: itemSchema
					},
					meta: paginationMeta
				},
				required: ['data', 'meta'],
				description:
					'Paginated response (when `limit`, `offset`, or `cursor` is provided)'
			}
		]
	}
}

const timezoneEntrySchema = {
	type: 'object' as const,
	properties: {
		comments: { type: 'string' as const },
		coordinates: { type: 'string' as const },
		countryCodes: {
			type: 'array' as const,
			items: { type: 'string' as const }
		},
		timezone: { type: 'string' as const }
	}
}

const currencyEntrySchema = {
	type: 'object' as const,
	properties: {
		code: { type: 'string' as const },
		countries: {
			type: 'array' as const,
			items: { type: 'string' as const }
		},
		decimals: { type: 'number' as const },
		name: { type: 'string' as const },
		symbol: { type: 'string' as const }
	}
}

const searchResultSchema = {
	type: 'object' as const,
	properties: {
		type: {
			type: 'string' as const,
			enum: ['country', 'state', 'city']
		},
		name: { type: 'string' as const },
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		stateCode: { type: 'string' as const, nullable: true },
		stateName: { type: 'string' as const, nullable: true }
	}
}

export function openApiSpec(config: SiteConfig) {
	return {
		openapi: '3.1.0',
		info: {
			title: config.siteName,
			version: '1.0.0',
			description:
				'Free country, state, city, and location data. Fast, cached, and filterable.\n\nData sourced from [GeoNames](https://www.geonames.org/) (CC BY 4.0), [Unicode CLDR](https://cldr.unicode.org/) (Unicode License), [Wikidata](https://www.wikidata.org/) (CC0), and [IANA](https://www.iana.org/time-zones) (Public Domain).',
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
		paths: {
			'/': {
				get: {
					tags: ['Location'],
					summary: "Get caller's geo info",
					description:
						"Returns geographic information about the caller based on their IP address, using Cloudflare's edge network data. Also enriches the response with full country, state, and city details when available (`countryInfo`, `stateInfo`, `cityInfo`).",
					parameters: [fieldsParameter],
					responses: {
						'200': {
							description: 'Location info',
							content: {
								'application/json': {
									schema: locationSchema,
									example: {
										asn: 13335,
										asOrganization: 'Cloudflare, Inc.',
										city: 'San Francisco',
										cityInfo: {
											countryCode: 'US',
											countryName: 'United States',
											latitude: '37.77493000',
											longitude: '-122.41942000',
											name: 'San Francisco',
											population: 883305,
											stateCode: 'CA',
											stateName: 'California',
											timezone: 'America/Los_Angeles'
										},
										colo: 'SFO',
										continent: 'NA',
										country: 'US',
										countryInfo: {
											capital: 'Washington',
											currency: 'USD',
											emoji: '\ud83c\uddfa\ud83c\uddf8',
											iso2: 'US',
											iso3: 'USA',
											name: 'United States',
											phoneCode: '1'
										},
										ip: '1.2.3.4',
										isEU: false,
										latitude: '37.7749',
										longitude: '-122.4194',
										postalCode: '94102',
										region: 'California',
										regionCode: 'CA',
										stateInfo: {
											countryCode: 'US',
											countryName: 'United States',
											iso2: 'CA',
											name: 'California',
											timezone: 'America/Los_Angeles'
										},
										timezone: 'America/Los_Angeles'
									}
								}
							}
						}
					}
				}
			},
			'/search': {
				get: {
					tags: ['Search'],
					summary: 'Search countries, states, and cities',
					description:
						'Full-text search across all entity types. Returns matching results ranked by relevance. Always paginated.',
					parameters: [
						{
							name: 'q',
							in: 'query' as const,
							required: true,
							description: 'Search query (prefix matching supported)',
							schema: { type: 'string' as const },
							example: 'lond'
						},
						...paginationParams
					],
					responses: {
						'200': {
							description: 'Paginated search results',
							content: {
								'application/json': {
									schema: {
										type: 'object' as const,
										properties: {
											data: {
												type: 'array' as const,
												items: searchResultSchema
											},
											meta: paginationMeta
										}
									}
								}
							}
						},
						'400': errorResponse
					}
				}
			},
			'/countries': {
				get: {
					tags: ['Countries'],
					summary: 'List all countries',
					parameters: [fieldsParameter, ...paginationParams],
					responses: {
						'200': {
							description:
								'Array of countries, or paginated wrapper when `limit`/`offset`/`cursor` is provided',
							content: {
								'application/json': {
									schema: listResponseSchema(countrySchema)
								}
							}
						},
						'404': errorResponse
					}
				}
			},
			'/countries/{id}': {
				get: {
					tags: ['Countries'],
					summary: 'Get one country',
					description:
						'Lookup by ISO 2 code, ISO 3 code, or country name (case-insensitive).',
					parameters: [
						{
							name: 'id',
							in: 'path' as const,
							required: true,
							description: 'ISO 2 code, ISO 3 code, or country name',
							schema: { type: 'string' as const },
							example: 'US'
						},
						fieldsParameter
					],
					responses: {
						'200': {
							description: 'Country object',
							content: {
								'application/json': { schema: countrySchema }
							}
						},
						'404': errorResponse
					}
				}
			},
			'/countries/{country}/states': {
				get: {
					tags: ['States'],
					summary: 'List states for a country',
					parameters: [
						{
							name: 'country',
							in: 'path' as const,
							required: true,
							description: 'Country ISO 2 code',
							schema: { type: 'string' as const },
							example: 'US'
						},
						fieldsParameter,
						...paginationParams
					],
					responses: {
						'200': {
							description:
								'Array of states, or paginated wrapper when limit/offset/cursor is provided',
							content: {
								'application/json': {
									schema: listResponseSchema(stateSchema)
								}
							}
						},
						'404': errorResponse
					}
				}
			},
			'/countries/{country}/states/{state}': {
				get: {
					tags: ['States'],
					summary: 'Get one state',
					description: 'Lookup by ISO 2 code or state name (case-insensitive).',
					parameters: [
						{
							name: 'country',
							in: 'path' as const,
							required: true,
							description: 'Country ISO 2 code',
							schema: { type: 'string' as const },
							example: 'US'
						},
						{
							name: 'state',
							in: 'path' as const,
							required: true,
							description: 'State ISO 2 code or state name',
							schema: { type: 'string' as const },
							example: 'CA'
						},
						fieldsParameter
					],
					responses: {
						'200': {
							description: 'State object',
							content: {
								'application/json': { schema: stateSchema }
							}
						},
						'404': errorResponse
					}
				}
			},
			'/countries/{country}/states/{state}/cities': {
				get: {
					tags: ['Cities'],
					summary: 'List cities for a state',
					parameters: [
						{
							name: 'country',
							in: 'path' as const,
							required: true,
							description: 'Country ISO 2 code',
							schema: { type: 'string' as const },
							example: 'US'
						},
						{
							name: 'state',
							in: 'path' as const,
							required: true,
							description: 'State ISO 2 code',
							schema: { type: 'string' as const },
							example: 'CA'
						},
						fieldsParameter,
						...paginationParams
					],
					responses: {
						'200': {
							description:
								'Array of cities, or paginated wrapper when limit/offset/cursor is provided',
							content: {
								'application/json': {
									schema: listResponseSchema(citySchema)
								}
							}
						},
						'404': errorResponse
					}
				}
			},
			'/countries/{country}/states/{state}/cities/{city}': {
				get: {
					tags: ['Cities'],
					summary: 'Get one city',
					description: 'Lookup by city name (case-insensitive).',
					parameters: [
						{
							name: 'country',
							in: 'path' as const,
							required: true,
							description: 'Country ISO 2 code',
							schema: { type: 'string' as const },
							example: 'US'
						},
						{
							name: 'state',
							in: 'path' as const,
							required: true,
							description: 'State ISO 2 code',
							schema: { type: 'string' as const },
							example: 'CA'
						},
						{
							name: 'city',
							in: 'path' as const,
							required: true,
							description: 'City name',
							schema: { type: 'string' as const },
							example: 'Los Angeles'
						},
						fieldsParameter
					],
					responses: {
						'200': {
							description: 'City object',
							content: {
								'application/json': { schema: citySchema }
							}
						},
						'404': errorResponse
					}
				}
			},
			'/timezones': {
				get: {
					tags: ['Timezones'],
					summary: 'List all timezones',
					parameters: [fieldsParameter, ...paginationParams],
					responses: {
						'200': {
							description:
								'Array of timezones, or paginated wrapper when limit/offset/cursor is provided',
							content: {
								'application/json': {
									schema: listResponseSchema(timezoneEntrySchema)
								}
							}
						}
					}
				}
			},
			'/timezones/{id}': {
				get: {
					tags: ['Timezones'],
					summary: 'Get one timezone',
					description: 'Lookup by IANA timezone ID (e.g. America/New_York).',
					parameters: [
						{
							name: 'id',
							in: 'path' as const,
							required: true,
							description: 'IANA timezone ID',
							schema: { type: 'string' as const },
							example: 'America/New_York'
						},
						fieldsParameter
					],
					responses: {
						'200': {
							description: 'Timezone object',
							content: {
								'application/json': {
									schema: timezoneEntrySchema
								}
							}
						},
						'404': errorResponse
					}
				}
			},
			'/currencies': {
				get: {
					tags: ['Currencies'],
					summary: 'List all currencies',
					parameters: [fieldsParameter, ...paginationParams],
					responses: {
						'200': {
							description:
								'Array of currencies, or paginated wrapper when limit/offset/cursor is provided',
							content: {
								'application/json': {
									schema: listResponseSchema(currencyEntrySchema)
								}
							}
						}
					}
				}
			},
			'/currencies/{code}': {
				get: {
					tags: ['Currencies'],
					summary: 'Get one currency',
					description: 'Lookup by ISO 4217 currency code (e.g. USD, EUR).',
					parameters: [
						{
							name: 'code',
							in: 'path' as const,
							required: true,
							description: 'ISO 4217 currency code',
							schema: { type: 'string' as const },
							example: 'USD'
						},
						fieldsParameter
					],
					responses: {
						'200': {
							description: 'Currency object',
							content: {
								'application/json': {
									schema: currencyEntrySchema
								}
							}
						},
						'404': errorResponse
					}
				}
			}
		}
	}
}
