import { beforeAll, describe, expect, test } from 'bun:test'

const BASE_URL = 'http://localhost:8787'

type JsonRecord = Record<string, unknown>

type OpenApiParameter = {
	allowReserved?: unknown
	example?: unknown
	in?: unknown
	name?: unknown
	required?: unknown
	schema?: unknown
}

type OpenApiOperation = {
	parameters?: OpenApiParameter[]
	summary?: string
	tags?: string[]
}

type OpenApiSpec = {
	info: {
		title: string
		description?: string
		version?: string
	}
	paths: Record<string, Record<string, OpenApiOperation | undefined>>
}

type PostmanCollection = {
	info: {
		name: string
	}
	item: PostmanFolder[]
}

type PostmanFolder = {
	item: PostmanEntry[]
	name: string
}

type PostmanEntry = PostmanFolder | PostmanRequestItem

type PostmanRequestItem = {
	name: string
	request: {
		method: string
		url: {
			path?: string[]
			query?: Array<{ disabled?: boolean; key: string; value: string }>
			raw: string
		}
	}
}

type ApiCase = {
	name: string
	path: string
	status: number
	assert?: (body: unknown) => void
}

let v1OpenApi: OpenApiSpec
let v2OpenApi: OpenApiSpec
let v1Postman: PostmanCollection
let v2Postman: PostmanCollection

beforeAll(async () => {
	try {
		v1OpenApi = await getJson<OpenApiSpec>('/openapi.json')
		v2OpenApi = await getJson<OpenApiSpec>('/v2/openapi.json')
		v1Postman = await getJson<PostmanCollection>('/postman.json')
		v2Postman = await getJson<PostmanCollection>('/v2/postman.json')
	} catch (error) {
		throw new Error(
			`Local API E2E requires ${BASE_URL}. Start it with: bun dev:api\n${error instanceof Error ? error.message : String(error)}`
		)
	}
})

describe('local API E2E artifacts', () => {
	test('serves separate v1 and v2 OpenAPI documents', () => {
		expect(v1OpenApi.info.version).toBe('1.0.0')
		expect(v2OpenApi.info.version).toBe('2.0.0')
		expect(v2OpenApi.info.title).toBe(v1OpenApi.info.title)
		expect(v2OpenApi.info.description ?? '').not.toContain('v2')

		const v1Paths = Object.keys(v1OpenApi.paths)
		const v2Paths = Object.keys(v2OpenApi.paths)

		expect(v1Paths.length).toBeGreaterThan(0)
		expect(v2Paths.length).toBeGreaterThan(0)
		expect(v1Paths.every((path) => !path.startsWith('/v2'))).toBe(true)
		expect(v2Paths.every((path) => path.startsWith('/v2'))).toBe(true)
		expect(v2Paths).toContain('/v2')
		expect(
			Object.values(v2OpenApi.paths).every((item) => {
				const [tag] = item.get?.tags ?? []
				return !tag?.startsWith('v2 ')
			})
		).toBe(true)

		const regionParams = v2OpenApi.paths['/v2/regions']?.get?.parameters ?? []
		expect(regionParams).toContainEqual(
			expect.objectContaining({
				name: 'fields',
				example: 'id,name,continent,countryCount',
				allowReserved: true
			})
		)
		expect(
			regionParams.every(
				(parameter) => !String(parameter.example ?? '').includes('%')
			)
		).toBe(true)
	})

	test('serves separate v1 and v2 Postman collections', () => {
		const v1Items = flattenPostmanItems(v1Postman)
		const v2Items = flattenPostmanItems(v2Postman)

		expect(v1Postman.info.name).toBe('Geocoded API v1')
		expect(v2Postman.info.name).toBe('Geocoded API v2')
		expect(v1Items.length).toBeGreaterThan(0)
		expect(v2Items.length).toBeGreaterThan(0)

		expect(
			v1Items.every((item) => !item.request.url.raw.includes('/v2/'))
		).toBe(true)
		expect(v2Items.every((item) => isV2PostmanUrl(item))).toBe(true)
		expect(
			[...v1Items, ...v2Items].every((item) => rawUrlMatchesEnabledQuery(item))
		).toBe(true)
	})
})

describe('local API E2E OpenAPI examples', () => {
	test('every documented v1 GET path has a working example request', async () => {
		for (const request of exampleRequests(v1OpenApi)) {
			const response = await fetchLocal(request)
			expect(response.status).toBe(200)
		}
	})

	test('every documented v2 GET path has a working example request', async () => {
		for (const request of exampleRequests(v2OpenApi)) {
			const response = await fetchLocal(request)
			expect(response.status).toBe(200)
		}
	})
})

describe('local API E2E v1 behavior matrix', () => {
	for (const apiCase of v1Cases) {
		test(apiCase.name, async () => {
			const response = await fetchLocal(apiCase.path)
			expect(response.status).toBe(apiCase.status)
			const body = await parseBody(response)
			apiCase.assert?.(body)
		})
	}
})

describe('local API E2E v2 behavior matrix', () => {
	for (const apiCase of v2Cases) {
		test(apiCase.name, async () => {
			const response = await fetchLocal(apiCase.path)
			expect(response.status).toBe(apiCase.status)
			const body = await parseBody(response)
			apiCase.assert?.(body)
		})
	}
})

const v1Cases: ApiCase[] = [
	{
		name: 'v1 lists countries with pagination metadata',
		path: '/countries?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 returns a country by ISO2',
		path: '/countries/AE?fields=name,iso2,currency',
		status: 200,
		assert: (body) => {
			const record = assertRecord(body)
			expect(record.iso2).toBe('AE')
			expect(record.currency).toBe('AED')
		}
	},
	{
		name: 'v1 searches globally',
		path: '/search?q=dubai&type=city&limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 lists states for a country',
		path: '/countries/AE/states?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 returns one state',
		path: '/countries/AE/states/AZ',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).iso2).toBe('AZ')
		}
	},
	{
		name: 'v1 lists country cities',
		path: '/countries/AE/cities?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 lists state cities',
		path: '/countries/AE/states/AZ/cities?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 returns one city by name',
		path: '/countries/AE/states/AZ/cities/Abu%20Dhabi',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).name).toBe('Abu Dhabi')
		}
	},
	{
		name: 'v1 returns one city by GeoNames ID',
		path: '/cities/292968',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).geonameId).toBe(292968)
		}
	},
	{
		name: 'v1 lists timezones',
		path: '/timezones?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 returns one timezone',
		path: '/timezones/Asia/Dubai',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).timezone).toBe('Asia/Dubai')
		}
	},
	{
		name: 'v1 lists currencies',
		path: '/currencies?limit=2',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v1 returns one currency',
		path: '/currencies/AED',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).code).toBe('AED')
		}
	},
	{
		name: 'v1 rejects missing search query',
		path: '/search',
		status: 400,
		assert: assertError
	},
	{
		name: 'v1 rejects invalid pagination',
		path: '/countries?limit=0',
		status: 400,
		assert: assertError
	},
	{
		name: 'v1 returns 404 for missing country',
		path: '/countries/ZZZ',
		status: 404,
		assert: assertError
	}
]

const v2Cases: ApiCase[] = [
	{
		name: 'v2 lists countries with expansion and nested fields',
		path: '/v2/countries?filter[country]=AE&expand=statistics&fields=*,statistics.gdpPerCapitaCurrentUsd',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 returns one country with fields',
		path: '/v2/countries/AE?fields=id,name,iso2,currency',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AE')
		}
	},
	{
		name: 'v2 returns caller location',
		path: '/v2?fields=ip,country,countryInfo.name',
		status: 200,
		assert: (body) => {
			expect(isRecord(body)).toBe(true)
		}
	},
	{
		name: 'v2 lists country statistics',
		path: '/v2/statistics?filter[country]=AE&fields=countryCode,countryName,gdpPerCapitaCurrentUsd',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists continents',
		path: '/v2/continents?fields=id,name,countryCount',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists regions filtered by continent',
		path: '/v2/regions?filter[continent]=AS&fields=id,name,continent,countryCount',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists states',
		path: '/v2/states?filter[country]=AE&fields=id,name,countryCode,stateCode',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists cities',
		path: '/v2/cities?filter[country]=AE&fields=id,name,countryCode,stateCode,geonameId',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists timezones filtered by country',
		path: '/v2/timezones?filter[country]=AE&fields=id,timezone,name,countryCodes',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists currencies filtered by country',
		path: '/v2/currencies?filter[country]=AE&fields=id,code,name,countries',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists airlines filtered by country and iata',
		path: '/v2/airlines?filter[country]=US&filter[iata]=GB&fields=id,name,iataCode,countryCode',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists airports filtered by country',
		path: '/v2/airports?filter[country]=AE&fields=id,name,countryCode,timezone',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists ports filtered by country',
		path: '/v2/ports?filter[country]=AE&fields=id,name,countryCode,functions',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists border crossings filtered by country',
		path: '/v2/border-crossings?filter[country]=AD&fields=id,name,countryCode,functions',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 lists migration filtered by country',
		path: '/v2/migration?filter[country]=AE&fields=id,countryCode,totalInternationalMigrants',
		status: 200,
		assert: assertPaginated
	},
	{
		name: 'v2 returns one continent',
		path: '/v2/continents/AS?fields=id,name,countryCount',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AS')
		}
	},
	{
		name: 'v2 returns one region',
		path: '/v2/regions/AS%3AWestern%20Asia?fields=id,name,continent,countryCount',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AS:Western Asia')
		}
	},
	{
		name: 'v2 returns one state',
		path: '/v2/states/AE%3AAZ?fields=id,name,countryCode,stateCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AE:AZ')
		}
	},
	{
		name: 'v2 returns one state by name',
		path: '/v2/states/Abu%20Dhabi?fields=id,name,countryCode,stateCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AE:AZ')
		}
	},
	{
		name: 'v2 returns one state through a country-scoped path',
		path: '/v2/countries/United%20Arab%20Emirates/states/AZ?fields=id,name,stateCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).stateCode).toBe('AZ')
		}
	},
	{
		name: 'v2 returns one city',
		path: '/v2/cities/292968?fields=id,name,countryCode,geonameId',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).geonameId).toBe(292968)
		}
	},
	{
		name: 'v2 returns one timezone',
		path: '/v2/timezones/Asia/Dubai?fields=id,timezone,name',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).timezone).toBe('Asia/Dubai')
		}
	},
	{
		name: 'v2 returns one currency',
		path: '/v2/currencies/AED?fields=id,code,name',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).code).toBe('AED')
		}
	},
	{
		name: 'v2 returns one airline',
		path: '/v2/airlines/GB%3AABX%3A832?fields=id,name,iataCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('GB:ABX:832')
		}
	},
	{
		name: 'v2 returns one airport',
		path: '/v2/airports/geoname%3A6300094?fields=id,name,geonameId,countryCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('geoname:6300094')
		}
	},
	{
		name: 'v2 returns one port',
		path: '/v2/ports/AEABU?fields=id,name,countryCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AEABU')
		}
	},
	{
		name: 'v2 returns one border crossing',
		path: '/v2/border-crossings/ADFMO?fields=id,name,countryCode',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('ADFMO')
		}
	},
	{
		name: 'v2 returns one statistics row',
		path: '/v2/statistics/AE?fields=id,countryCode,countryName',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AE')
		}
	},
	{
		name: 'v2 returns one migration row',
		path: '/v2/migration/AE?fields=id,countryCode,totalInternationalMigrants',
		status: 200,
		assert: (body) => {
			expect(assertRecord(body).id).toBe('AE')
		}
	},
	{
		name: 'v2 returns 404 for missing detail resources',
		path: '/v2/airports/missing',
		status: 404,
		assert: assertError
	},
	{
		name: 'v2 rejects unsupported bracket filters',
		path: '/v2/countries?filter[unLocode]=AEJEA',
		status: 400,
		assert: assertError
	},
	{
		name: 'v2 rejects old top-level filters',
		path: '/v2/countries?country=AE',
		status: 400,
		assert: assertError
	},
	{
		name: 'v2 rejects nested fields without expand',
		path: '/v2/countries?fields=*,statistics.gdpPerCapitaCurrentUsd',
		status: 400,
		assert: assertError
	},
	{
		name: 'v2 rejects invalid sort fields',
		path: '/v2/airports?sort=status',
		status: 400,
		assert: assertError
	}
]

async function getJson<T>(path: string): Promise<T> {
	const response = await fetchLocal(path)
	if (response.status !== 200) {
		throw new Error(
			`${path} returned ${response.status}: ${await response.text()}`
		)
	}
	return (await response.json()) as T
}

async function fetchLocal(path: string): Promise<Response> {
	return await fetch(`${BASE_URL}${path}`)
}

async function parseBody(response: Response): Promise<unknown> {
	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes('application/json')) return await response.text()
	return await response.json()
}

function exampleRequests(spec: OpenApiSpec): string[] {
	const requests: string[] = []
	for (const [path, item] of Object.entries(spec.paths)) {
		const operation = item.get
		if (!operation) continue
		const parameters = operation.parameters ?? []
		const concretePath = concreteOpenApiPath(
			path,
			parameters.filter((parameter) => parameter.in === 'path')
		)
		const requiredQuery = parameters
			.filter(
				(parameter) => parameter.in === 'query' && parameter.required === true
			)
			.map(
				(parameter) =>
					`${encodeURIComponent(String(parameter.name))}=${encodeURIComponent(parameterValue(parameter))}`
			)
			.join('&')
		requests.push(
			requiredQuery ? `${concretePath}?${requiredQuery}` : concretePath
		)
	}
	return requests
}

function concreteOpenApiPath(
	path: string,
	parameters: OpenApiParameter[]
): string {
	return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const parameter = parameters.find((item) => item.name === name)
		return encodeURIComponent(parameter ? parameterValue(parameter) : name)
	})
}

function parameterValue(parameter: OpenApiParameter): string {
	if (isPrimitive(parameter.example)) return String(parameter.example)
	const schema = isRecord(parameter.schema) ? parameter.schema : {}
	if (isPrimitive(schema.default)) return String(schema.default)
	if (Array.isArray(schema.enum) && isPrimitive(schema.enum[0])) {
		return String(schema.enum[0])
	}
	switch (schema.type) {
		case 'integer':
		case 'number':
			return '1'
		case 'boolean':
			return 'true'
		default:
			return typeof parameter.name === 'string' ? parameter.name : 'value'
	}
}

function flattenPostmanItems(
	collection: PostmanCollection
): PostmanRequestItem[] {
	const items: PostmanRequestItem[] = []
	for (const item of collection.item) collectPostmanRequests(item, items)
	return items
}

function collectPostmanRequests(
	entry: PostmanEntry,
	items: PostmanRequestItem[]
): void {
	if ('request' in entry) {
		items.push(entry)
		return
	}
	for (const child of entry.item) collectPostmanRequests(child, items)
}

function rawUrlMatchesEnabledQuery(item: PostmanRequestItem): boolean {
	const raw = item.request.url.raw
	const enabledQuery =
		item.request.url.query?.filter((query) => !query.disabled) ?? []
	if (enabledQuery.length === 0) return !raw.includes('?')
	const queryString = raw.split('?')[1] ?? ''
	return enabledQuery.every((query) =>
		queryString.includes(
			`${encodeURIComponent(query.key)}=${encodeURIComponent(query.value)}`
		)
	)
}

function isV2PostmanUrl(item: PostmanRequestItem): boolean {
	return item.request.url.raw.includes('/v2')
}

function assertPaginated(body: unknown): void {
	const record = assertRecord(body)
	expect(Array.isArray(record.data)).toBe(true)
	const meta = assertRecord(record.meta)
	expect(typeof meta.total).toBe('number')
	expect(typeof meta.limit).toBe('number')
	expect(typeof meta.offset).toBe('number')
	expect(typeof meta.hasMore).toBe('boolean')
}

function assertError(body: unknown): void {
	const record = assertRecord(body)
	expect(typeof record.error).toBe('string')
}

function assertRecord(value: unknown): JsonRecord {
	expect(isRecord(value)).toBe(true)
	return value as JsonRecord
}

function isPrimitive(value: unknown): value is boolean | number | string {
	return (
		typeof value === 'boolean' ||
		typeof value === 'number' ||
		typeof value === 'string'
	)
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
