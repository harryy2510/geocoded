type OpenApiParameter = {
	description?: unknown
	example?: unknown
	in?: unknown
	name?: unknown
	required?: unknown
	schema?: unknown
}

type OpenApiParameterSchema = {
	default?: boolean | number | string
	enum?: Array<boolean | number | string>
	type?: string
}

type OpenApiOperation = {
	description?: string | undefined
	parameters?: OpenApiParameter[] | undefined
	summary?: string | undefined
	tags?: string[] | undefined
}

type OpenApiPathItem = Record<string, OpenApiOperation | undefined>

type OpenApiDocument = {
	info: {
		description?: string
		title: string
	}
	paths: Record<string, OpenApiPathItem>
	servers?: Array<{ url: string }>
}

type PostmanQueryParam = {
	disabled?: boolean
	key: string
	value: string
}

type PostmanItem = {
	name: string
	request: {
		description?: string
		method: string
		url: {
			host: string[]
			path: string[]
			query?: PostmanQueryParam[]
			raw: string
		}
	}
}

type PostmanFolder = {
	item: PostmanItem[]
	name: string
}

export type PostmanCollection = {
	info: {
		description?: string
		name: string
		schema: string
	}
	item: PostmanFolder[]
	variable: Array<{
		key: string
		type: 'string'
		value: string
	}>
}

export function createPostmanCollection(
	spec: OpenApiDocument,
	name: string
): PostmanCollection {
	const folders = new Map<string, PostmanItem[]>()

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		for (const [method, operation] of Object.entries(pathItem)) {
			if (!operation) continue
			const folder = operation.tags?.[0] ?? 'API'
			const items = folders.get(folder) ?? []
			items.push(createPostmanItem(path, method, operation))
			folders.set(folder, items)
		}
	}

	return {
		info: {
			name,
			description: spec.info.description,
			schema:
				'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
		},
		variable: [
			{
				key: 'baseUrl',
				value: spec.servers?.[0]?.url ?? 'https://api.geocoded.me',
				type: 'string'
			}
		],
		item: [...folders.entries()].map(([folderName, items]) => ({
			name: folderName,
			item: items
		}))
	}
}

function createPostmanItem(
	path: string,
	method: string,
	operation: OpenApiOperation
): PostmanItem {
	const parameters = operation.parameters ?? []
	const pathWithExamples = applyPathExamples(
		path,
		parameters.filter((parameter) => parameter.in === 'path')
	)
	const query = parameters
		.filter((parameter) => parameter.in === 'query')
		.filter((parameter) => typeof parameter.name === 'string')
		.map((parameter) => ({
			key: parameter.name as string,
			value: parameterValue(parameter),
			disabled: !parameter.required
		}))
	const queryString = query
		.filter((parameter) => !parameter.disabled)
		.map(
			(parameter) =>
				`${encodeURIComponent(parameter.key)}=${encodeURIComponent(parameter.value)}`
		)
		.join('&')

	return {
		name: operation.summary ?? `${method.toUpperCase()} ${path}`,
		request: {
			method: method.toUpperCase(),
			url: {
				raw: `{{baseUrl}}${pathWithExamples}${queryString ? `?${queryString}` : ''}`,
				host: ['{{baseUrl}}'],
				path: postmanPathSegments(pathWithExamples),
				...(query.length > 0 ? { query } : {})
			},
			description: operation.description
		}
	}
}

function applyPathExamples(
	path: string,
	parameters: OpenApiParameter[]
): string {
	return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const parameter = parameters.find((item) => item.name === name)
		return encodeURIComponent(parameter ? parameterValue(parameter) : name)
	})
}

function postmanPathSegments(path: string): string[] {
	const trimmed = path.replace(/^\//, '')
	return trimmed === '' ? [''] : trimmed.split('/')
}

function parameterValue(parameter: OpenApiParameter): string {
	if (isPrimitive(parameter.example)) return String(parameter.example)
	const schema = parameterSchema(parameter)
	if (schema?.default !== undefined) {
		return String(schema.default)
	}
	if (schema?.enum?.[0] !== undefined) {
		return String(schema.enum[0])
	}
	switch (schema?.type) {
		case 'integer':
		case 'number':
			return '1'
		case 'boolean':
			return 'true'
		default:
			return typeof parameter.name === 'string' ? parameter.name : 'value'
	}
}

function parameterSchema(
	parameter: OpenApiParameter
): OpenApiParameterSchema | null {
	if (!isRecord(parameter.schema)) return null
	return {
		default: isPrimitive(parameter.schema.default)
			? parameter.schema.default
			: undefined,
		enum: Array.isArray(parameter.schema.enum)
			? parameter.schema.enum.filter(isPrimitive)
			: undefined,
		type:
			typeof parameter.schema.type === 'string'
				? parameter.schema.type
				: undefined
	}
}

function isPrimitive(value: unknown): value is boolean | number | string {
	return (
		typeof value === 'boolean' ||
		typeof value === 'number' ||
		typeof value === 'string'
	)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
