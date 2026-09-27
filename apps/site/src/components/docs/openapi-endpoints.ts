// Turns the API's OpenAPI document into the data the reference page renders, so the docs list
// every endpoint and option the API actually has.

export type Param = {
	name: string
	in: 'path' | 'query'
	type: string
	desc: string
	required: boolean
	/** Prefilled in the Try it panel. */
	example?: string
	constraints: string[]
}

type ResponseField = {
	name: string
	type: string
	desc?: string
}

export type Endpoint = {
	id: string
	group: string
	title: string
	method: 'GET'
	path: string
	desc: string
	params: Param[]
	responses: Array<{ code: string; desc: string }>
	fields: ResponseField[]
	paginated: boolean
}

type Json = Record<string, unknown>

// Order of groups in the sidebar; tags not listed follow alphabetically.
const GROUP_ORDER = [
	'Location',
	'Search',
	'Countries',
	'States',
	'Cities',
	'Continents',
	'Regions',
	'Airports',
	'Ports',
	'Border Crossings',
	'Airlines',
	'Timezones',
	'Currencies',
	'Languages',
	'Statistics',
	'Migrant Stocks',
	'Meta'
]

export function endpointsFromOpenApi(spec: unknown): Endpoint[] {
	const paths = record(record(spec).paths)
	const endpoints: Endpoint[] = []
	for (const [path, item] of Object.entries(paths)) {
		const get = record(record(item).get)
		if (Object.keys(get).length === 0) continue
		const group = stringOf(array(get.tags)[0]) || 'Other'
		const title = stringOf(get.summary) || path
		const responses = record(get.responses)
		const okSchema = record(
			record(record(record(responses['200']).content)['application/json'])
				.schema
		)
		const dataItems = record(record(record(okSchema.properties).data).items)
		const paginated = Object.keys(dataItems).length > 0
		endpoints.push({
			id: slug(`${group}-${title}`),
			group,
			title,
			method: 'GET',
			path,
			desc: stringOf(get.description),
			params: array(get.parameters).map(toParam),
			responses: Object.entries(responses).map(([code, response]) => ({
				code,
				desc: stringOf(record(response).description)
			})),
			fields: fieldsOf(paginated ? dataItems : okSchema),
			paginated
		})
	}
	return endpoints.sort(
		(a, b) =>
			groupRank(a.group) - groupRank(b.group) ||
			a.group.localeCompare(b.group) ||
			a.path.length - b.path.length ||
			a.path.localeCompare(b.path)
	)
}

function toParam(raw: unknown): Param {
	const param = record(raw)
	const schema = record(param.schema)
	const constraints: string[] = []
	if (Array.isArray(schema.enum)) {
		constraints.push(`one of ${schema.enum.map(String).join(', ')}`)
	}
	if (typeof schema.minimum === 'number') {
		constraints.push(`min ${schema.minimum}`)
	}
	if (typeof schema.maximum === 'number') {
		constraints.push(`max ${schema.maximum}`)
	}
	if (schema.default !== undefined) {
		constraints.push(`default ${String(schema.default)}`)
	}
	const example = param.example ?? schema.example
	return {
		name: stringOf(param.name),
		in: param.in === 'path' ? 'path' : 'query',
		type: stringOf(schema.type) || 'string',
		desc: stringOf(param.description),
		required: param.required === true,
		example: example === undefined ? undefined : String(example),
		constraints
	}
}

function fieldsOf(schema: Json): ResponseField[] {
	return Object.entries(record(schema.properties)).map(([name, raw]) => {
		const field = record(raw)
		const type = stringOf(field.type) || 'object'
		const itemType = stringOf(record(field.items).type)
		return {
			name,
			type: `${type === 'array' && itemType ? `${itemType}[]` : type}${field.nullable === true ? ' | null' : ''}`,
			desc: stringOf(field.description) || undefined
		}
	})
}

function groupRank(group: string): number {
	const index = GROUP_ORDER.indexOf(group)
	return index === -1 ? GROUP_ORDER.length : index
}

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

function record(value: unknown): Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Json)
		: {}
}

function array(value: unknown): unknown[] {
	return Array.isArray(value) ? value : []
}

function stringOf(value: unknown): string {
	return typeof value === 'string' ? value : ''
}
