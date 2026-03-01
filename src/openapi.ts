const fieldsParameter = {
	name: 'fields',
	in: 'query' as const,
	required: false,
	description:
		'Comma-separated list of fields to return. When omitted, all fields are returned.',
	schema: { type: 'string' as const },
	example: 'name,iso2',
}

const errorResponse = {
	description: 'Error response',
	content: {
		'application/json': {
			schema: {
				type: 'object' as const,
				properties: {
					error: { type: 'string' as const },
				},
				required: ['error'],
			},
		},
	},
}

const timezoneSchema = {
	type: 'object' as const,
	properties: {
		abbreviation: { type: 'string' as const },
		gmtOffset: { type: 'number' as const },
		gmtOffsetName: { type: 'string' as const },
		tzName: { type: 'string' as const },
		zoneName: { type: 'string' as const },
	},
}

const countrySchema = {
	type: 'object' as const,
	properties: {
		areaSqKm: { type: 'number' as const },
		capital: { type: 'string' as const },
		currency: { type: 'string' as const },
		currencyName: { type: 'string' as const },
		currencySymbol: { type: 'string' as const },
		emoji: { type: 'string' as const },
		emojiU: { type: 'string' as const },
		gdp: { type: 'number' as const, nullable: true },
		iso2: { type: 'string' as const },
		iso3: { type: 'string' as const },
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		name: { type: 'string' as const },
		nationality: { type: 'string' as const },
		native: { type: 'string' as const },
		numericCode: { type: 'string' as const },
		phoneCode: { type: 'string' as const },
		population: { type: 'number' as const },
		postalCodeFormat: { type: 'string' as const, nullable: true },
		postalCodeRegex: { type: 'string' as const, nullable: true },
		region: { type: 'string' as const },
		subregion: { type: 'string' as const },
		timezones: { type: 'array' as const, items: timezoneSchema },
		tld: { type: 'string' as const },
		translations: {
			type: 'object' as const,
			additionalProperties: { type: 'string' as const },
		},
		wikiDataId: { type: 'string' as const },
	},
}

const stateSchema = {
	type: 'object' as const,
	properties: {
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		fipsCode: { type: 'string' as const },
		iso2: { type: 'string' as const },
		iso31662: { type: 'string' as const },
		latitude: { type: 'string' as const },
		level: { type: 'string' as const, nullable: true },
		longitude: { type: 'string' as const },
		name: { type: 'string' as const },
		native: { type: 'string' as const },
		parentId: { type: 'string' as const, nullable: true },
		population: { type: 'number' as const, nullable: true },
		timezone: { type: 'string' as const },
		translations: {
			type: 'object' as const,
			additionalProperties: { type: 'string' as const },
		},
		type: { type: 'string' as const },
		wikiDataId: { type: 'string' as const },
	},
}

const citySchema = {
	type: 'object' as const,
	properties: {
		countryCode: { type: 'string' as const },
		countryName: { type: 'string' as const },
		latitude: { type: 'string' as const },
		level: { type: 'string' as const, nullable: true },
		longitude: { type: 'string' as const },
		name: { type: 'string' as const },
		native: { type: 'string' as const },
		parentId: { type: 'string' as const, nullable: true },
		population: { type: 'number' as const },
		stateCode: { type: 'string' as const },
		stateName: { type: 'string' as const },
		timezone: { type: 'string' as const },
		translations: {
			type: 'object' as const,
			additionalProperties: { type: 'string' as const },
		},
		type: { type: 'string' as const },
		wikiDataId: { type: 'string' as const },
	},
}

const locationSchema = {
	type: 'object' as const,
	properties: {
		asn: { type: 'number' as const },
		asOrganization: { type: 'string' as const },
		city: { type: 'string' as const },
		colo: { type: 'string' as const },
		continent: { type: 'string' as const },
		country: { type: 'string' as const },
		ip: { type: 'string' as const },
		isEU: { type: 'boolean' as const },
		latitude: { type: 'string' as const },
		longitude: { type: 'string' as const },
		postalCode: { type: 'string' as const },
		region: { type: 'string' as const },
		regionCode: { type: 'string' as const },
		timezone: { type: 'string' as const },
	},
}

export const openApiSpec = {
	openapi: '3.1.0',
	info: {
		title: 'Geo API',
		version: '1.0.0',
		description:
			'Free country, state, city, and location data. Fast, cached, and filterable.',
		contact: {
			email: 'contact@harryy.me',
		},
	},
	servers: [{ url: 'https://geo.harryy.me' }],
	security: [{ bearerAuth: [] }],
	paths: {
		'/location': {
			get: {
				tags: ['Location'],
				summary: "Get caller's geo info",
				description:
					"Returns geographic information about the caller based on their IP address, using Cloudflare's edge network data.",
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
									colo: 'SFO',
									continent: 'NA',
									country: 'US',
									ip: '1.2.3.4',
									isEU: false,
									latitude: '37.7749',
									longitude: '-122.4194',
									postalCode: '94102',
									region: 'California',
									regionCode: 'CA',
									timezone: 'America/Los_Angeles',
								},
							},
						},
					},
				},
			},
		},
		'/countries': {
			get: {
				tags: ['Countries'],
				summary: 'List all countries',
				parameters: [fieldsParameter],
				responses: {
					'200': {
						description: 'Array of countries',
						content: {
							'application/json': {
								schema: {
									type: 'array' as const,
									items: countrySchema,
								},
							},
						},
					},
					'404': errorResponse,
				},
			},
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
						example: 'US',
					},
					fieldsParameter,
				],
				responses: {
					'200': {
						description: 'Country object',
						content: {
							'application/json': { schema: countrySchema },
						},
					},
					'404': errorResponse,
				},
			},
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
						example: 'US',
					},
					fieldsParameter,
				],
				responses: {
					'200': {
						description: 'Array of states',
						content: {
							'application/json': {
								schema: {
									type: 'array' as const,
									items: stateSchema,
								},
							},
						},
					},
					'404': errorResponse,
				},
			},
		},
		'/countries/{country}/states/{state}': {
			get: {
				tags: ['States'],
				summary: 'Get one state',
				description:
					'Lookup by ISO 2 code or state name (case-insensitive).',
				parameters: [
					{
						name: 'country',
						in: 'path' as const,
						required: true,
						description: 'Country ISO 2 code',
						schema: { type: 'string' as const },
						example: 'US',
					},
					{
						name: 'state',
						in: 'path' as const,
						required: true,
						description: 'State ISO 2 code or state name',
						schema: { type: 'string' as const },
						example: 'CA',
					},
					fieldsParameter,
				],
				responses: {
					'200': {
						description: 'State object',
						content: {
							'application/json': { schema: stateSchema },
						},
					},
					'404': errorResponse,
				},
			},
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
						example: 'US',
					},
					{
						name: 'state',
						in: 'path' as const,
						required: true,
						description: 'State ISO 2 code',
						schema: { type: 'string' as const },
						example: 'CA',
					},
					fieldsParameter,
				],
				responses: {
					'200': {
						description: 'Array of cities',
						content: {
							'application/json': {
								schema: {
									type: 'array' as const,
									items: citySchema,
								},
							},
						},
					},
					'404': errorResponse,
				},
			},
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
						example: 'US',
					},
					{
						name: 'state',
						in: 'path' as const,
						required: true,
						description: 'State ISO 2 code',
						schema: { type: 'string' as const },
						example: 'CA',
					},
					{
						name: 'city',
						in: 'path' as const,
						required: true,
						description: 'City name',
						schema: { type: 'string' as const },
						example: 'Los Angeles',
					},
					fieldsParameter,
				],
				responses: {
					'200': {
						description: 'City object',
						content: {
							'application/json': { schema: citySchema },
						},
					},
					'404': errorResponse,
				},
			},
		},
		'/register': {
			post: {
				tags: ['Registration'],
				summary: 'Register for an API key',
				description:
					'Submit your name and email to receive an API key. If the email already has a key, the existing key is resent.',
				security: [],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object' as const,
								properties: {
									name: { type: 'string' as const },
									email: {
										type: 'string' as const,
										format: 'email',
									},
								},
								required: ['name', 'email'],
							},
							example: {
								name: 'John Doe',
								email: 'john@example.com',
							},
						},
					},
				},
				responses: {
					'200': {
						description: 'API key sent to email',
						content: {
							'application/json': {
								schema: {
									type: 'object' as const,
									properties: {
										message: { type: 'string' as const },
										success: { type: 'boolean' as const },
									},
								},
								example: {
									success: true,
									message: 'API key sent to your email',
								},
							},
						},
					},
					'400': errorResponse,
					'500': errorResponse,
				},
			},
		},
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: 'http' as const,
				scheme: 'bearer',
				description: 'API key passed as a Bearer token',
			},
		},
	},
}
