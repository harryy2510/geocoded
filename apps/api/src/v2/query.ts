import { err, ok, Result } from 'neverthrow'
import { invalid, type V2Error } from './errors'

type V2FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array'

type V2SortDirection = 'asc' | 'desc'

type V2FilterOperator = 'eq' | 'gte' | 'lte' | 'contains'

type V2FieldConfig = {
	type: V2FieldType
	column?: string
	caseInsensitive?: boolean
	normalize?: 'uppercase' | 'lowercase'
	searchable?: boolean
	sortable?: boolean
}

type V2FilterConfig = {
	field: string
	operator: V2FilterOperator
}

type V2ExpandConfig =
	| {
			kind: 'object' | 'array'
			resource: V2ResourceConfig
	  }
	| {
			kind: 'passthrough'
	  }

export type V2ResourceConfig = {
	name: string
	fields: Record<string, V2FieldConfig>
	defaultFields: string[]
	filters?: Record<string, V2FilterConfig>
	search?: {
		fields: string[]
	}
	sort?: {
		default?: {
			field: string
			direction: V2SortDirection
		}
		fields?: string[]
	}
	expands?: Record<string, V2ExpandConfig>
	reservedParams?: string[]
	// Resource-specific params handled by the route (for example near, radius, lang).
	extraParams?: string[]
	strictUnknownParams?: boolean
}

export type V2Projection = {
	fields: string[]
	// A `null` expand is a passthrough: emit the value verbatim with no nested projection.
	expands: Record<string, V2Projection | null>
}

type V2AppliedFilter = {
	name: string
	field: string
	operator: V2FilterOperator
}

type V2SortPlan = {
	column: string
	direction: V2SortDirection
}

export type V2QueryPlan = {
	appliedFilters: V2AppliedFilter[]
	bindings: Array<string | number>
	expand: string[]
	orderBySql: string | null
	projection: V2Projection
	sort: V2SortPlan | null
	whereSql: string
}

const DEFAULT_RESERVED_PARAMS = new Set([
	'cursor',
	'expand',
	'fields',
	'limit',
	'offset',
	'q',
	'sort'
])

export function defineV2Resource<T extends V2ResourceConfig>(config: T): T {
	return config
}

export function parseV2Query(
	params: URLSearchParams,
	config: V2ResourceConfig
): Result<V2QueryPlan, V2Error> {
	const unknown = findUnknownParam(params, config)
	if (unknown) return invalid(`Unsupported query parameter "${unknown}"`)

	return parseExpand(params.get('expand'), config).andThen((expand) =>
		Result.combine([
			parseProjection(params.get('fields'), expand, config),
			parseFilters(params, config),
			parseSearch(params.get('q'), config),
			parseSort(params.get('sort'), config)
		]).map(([projection, filters, search, sort]) => {
			const clauses = [...filters.clauses]
			if (search.whereSql) clauses.push(search.whereSql)
			return {
				appliedFilters: filters.appliedFilters,
				bindings: [...filters.bindings, ...search.bindings],
				expand,
				orderBySql: sort
					? `${sort.column} ${sort.direction.toUpperCase()}`
					: null,
				projection,
				sort,
				whereSql: clauses.join(' AND ')
			}
		})
	)
}

export function projectV2Fields(
	value: unknown,
	projection: V2Projection
): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => projectV2Fields(item, projection))
	}
	if (!isRecord(value)) return value

	const projected: Record<string, unknown> = {}
	for (const field of projection.fields) {
		copyProjectedPath(value, projected, field.split('.'))
	}
	for (const [expandName, expandProjection] of Object.entries(
		projection.expands
	)) {
		if (!(expandName in value)) continue
		if (expandProjection === null) {
			// Passthrough expand: emit the value verbatim, no nested projection.
			projected[expandName] = value[expandName]
			continue
		}
		projected[expandName] = projectV2Fields(value[expandName], expandProjection)
	}
	return projected
}

function findUnknownParam(
	params: URLSearchParams,
	config: V2ResourceConfig
): string | null {
	if (!config.strictUnknownParams) return null

	const allowed = new Set([
		...(config.reservedParams ?? DEFAULT_RESERVED_PARAMS),
		...(config.extraParams ?? [])
	])
	const filterNames = new Set(Object.keys(config.filters ?? {}))

	for (const name of params.keys()) {
		const filterName = bracketedFilterName(name)
		if (filterName) {
			if (!filterNames.has(filterName)) return name
			continue
		}
		if (!allowed.has(name)) return name
	}
	return null
}

function parseExpand(
	rawExpand: string | null,
	config: V2ResourceConfig
): Result<string[], V2Error> {
	const allowedExpands = Object.keys(config.expands ?? {}).sort()
	if (!rawExpand || rawExpand.trim() === '') return ok([])

	const expand = unique(
		rawExpand
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean)
	)
	for (const name of expand) {
		if (!allowedExpands.includes(name)) {
			return invalid(
				`Query parameter "expand" must be one of: ${allowedExpands.join(', ')}`
			)
		}
	}
	return ok(expand)
}

function parseProjection(
	rawFields: string | null,
	expanded: string[],
	config: V2ResourceConfig
): Result<V2Projection, V2Error> {
	const expandedSet = new Set(expanded)
	const scoped = new Map<string, string[]>()
	const baseTokens: string[] = []

	if (!rawFields || rawFields.trim() === '') {
		baseTokens.push('*')
	} else {
		for (const token of splitCsv(rawFields)) {
			if (token === '*') {
				baseTokens.push(token)
				continue
			}

			const dotIndex = token.indexOf('.')
			if (dotIndex === -1) {
				baseTokens.push(token)
				continue
			}

			const expandName = token.slice(0, dotIndex)
			const fieldPath = token.slice(dotIndex + 1)
			if (!expandedSet.has(expandName)) {
				return invalid(
					`Query parameter "fields" includes "${token}", but "${expandName}" is not expanded`
				)
			}
			if (config.expands?.[expandName]?.kind === 'passthrough') {
				return invalid(
					`Query parameter "fields" includes "${token}", but "${expandName}" does not support nested field selection`
				)
			}
			const paths = scoped.get(expandName) ?? []
			paths.push(fieldPath)
			scoped.set(expandName, paths)
		}
	}

	const baseResult = fieldsToProjection(baseTokens, config)
	if (baseResult.isErr()) return err(baseResult.error)

	const expands: Record<string, V2Projection | null> = {}
	for (const expandName of expanded) {
		const expandConfig = config.expands?.[expandName]
		if (!expandConfig) continue

		if (expandConfig.kind === 'passthrough') {
			expands[expandName] = null
			continue
		}

		const childTokens = scoped.get(expandName) ?? ['*']
		const childResult = fieldsToProjection(childTokens, expandConfig.resource)
		if (childResult.isErr()) return err(childResult.error)
		expands[expandName] = childResult.value
	}

	return ok({ fields: baseResult.value.fields, expands })
}

function fieldsToProjection(
	tokens: string[],
	config: V2ResourceConfig
): Result<V2Projection, V2Error> {
	const fields: string[] = []
	let hasWildcard = false

	for (const token of tokens) {
		if (token === '*') {
			hasWildcard = true
			continue
		}
		const validationError = validateFieldPath(token, config)
		if (validationError) {
			return invalid(
				`Query parameter "fields" includes unsupported field "${token}"`
			)
		}
		fields.push(token)
	}

	return ok({
		fields: unique([...(hasWildcard ? config.defaultFields : []), ...fields]),
		expands: {}
	})
}

function validateFieldPath(
	path: string,
	config: V2ResourceConfig
): string | null {
	if (path.trim() === '') return path
	const [field, ...rest] = path.split('.')
	if (!field || !(field in config.fields)) return field ?? path
	if (rest.length === 0) return null

	const fieldConfig = config.fields[field]
	if (!fieldConfig || !['object', 'array'].includes(fieldConfig.type)) {
		return path
	}
	return null
}

function parseFilters(
	params: URLSearchParams,
	config: V2ResourceConfig
): Result<
	{
		appliedFilters: V2AppliedFilter[]
		bindings: Array<string | number>
		clauses: string[]
	},
	V2Error
> {
	const appliedFilters: V2AppliedFilter[] = []
	const bindings: Array<string | number> = []
	const clauses: string[] = []

	for (const [filterName, filterConfig] of Object.entries(
		config.filters ?? {}
	)) {
		const rawValues = params
			.getAll(filterParamName(filterName))
			.map((value) => value.trim())
			.filter(Boolean)
		if (rawValues.length === 0) continue

		const field = config.fields[filterConfig.field]
		if (!field?.column) {
			return invalid(
				`Filter "${filterName}" is not backed by a queryable field`
			)
		}

		const parsedValues = Result.combine(
			rawValues.map((rawValue) => parseFilterValue(rawValue, filterName, field))
		)
		if (parsedValues.isErr()) return err(parsedValues.error)

		appliedFilters.push({
			name: filterName,
			field: filterConfig.field,
			operator: filterConfig.operator
		})
		bindings.push(...filterBindings(filterConfig.operator, parsedValues.value))
		clauses.push(
			filterClause(field.column, filterConfig.operator, parsedValues.value)
		)
	}

	return ok({ appliedFilters, bindings, clauses })
}

function parseFilterValue(
	rawValue: string,
	filterName: string,
	field: V2FieldConfig
): Result<string | number, V2Error> {
	if (field.type === 'number') {
		const value = Number(rawValue)
		if (!Number.isFinite(value)) {
			return invalid(`Query parameter "${filterName}" must be a number`)
		}
		return ok(value)
	}

	if (field.type === 'boolean') {
		const normalized = rawValue.toLowerCase()
		if (['true', '1'].includes(normalized)) return ok(1)
		if (['false', '0'].includes(normalized)) return ok(0)
		return invalid(`Query parameter "${filterName}" must be a boolean`)
	}

	let value = rawValue
	if (field.normalize === 'uppercase') value = value.toUpperCase()
	if (field.normalize === 'lowercase') value = value.toLowerCase()
	return ok(value)
}

function filterClause(
	column: string,
	operator: V2FilterOperator,
	values: Array<string | number>
): string {
	if (operator === 'contains') {
		const clauses = values.map(() => `${column} LIKE ?`).join(' OR ')
		return values.length > 1 ? `(${clauses})` : clauses
	}
	if (operator === 'eq' && values.length > 1) {
		return `${column} IN (${values.map(() => '?').join(', ')})`
	}
	const sqlOperator =
		operator === 'gte' ? '>=' : operator === 'lte' ? '<=' : '='
	return `${column} ${sqlOperator} ?`
}

function filterBindings(
	operator: V2FilterOperator,
	values: Array<string | number>
): Array<string | number> {
	if (operator !== 'contains') return values
	return values.map((value) => `%"${String(value).replace(/"/g, '""')}"%`)
}

function parseSearch(
	rawQuery: string | null,
	config: V2ResourceConfig
): Result<{ whereSql: string; bindings: string[] }, V2Error> {
	const query = rawQuery?.trim()
	if (!query) return ok({ whereSql: '', bindings: [] })

	const searchFields = config.search?.fields ?? []
	const clauses: string[] = []
	const bindings: string[] = []
	const like = toContainsLikeQuery(query)

	for (const fieldName of searchFields) {
		const field = config.fields[fieldName]
		if (!field?.column) continue
		clauses.push(
			`${field.column}${field.caseInsensitive ? ' COLLATE NOCASE' : ''} LIKE ? ESCAPE '^'`
		)
		bindings.push(like)
	}

	if (clauses.length === 0) {
		return invalid(`Resource "${config.name}" does not support search`)
	}

	return ok({ whereSql: `(${clauses.join(' OR ')})`, bindings })
}

function parseSort(
	rawSort: string | null,
	config: V2ResourceConfig
): Result<V2SortPlan | null, V2Error> {
	const defaultSort = config.sort?.default
	const sort = rawSort?.trim()
	const fieldName = sort
		? sort.startsWith('-')
			? sort.slice(1)
			: sort
		: defaultSort?.field
	const direction: V2SortDirection = sort
		? sort.startsWith('-')
			? 'desc'
			: 'asc'
		: (defaultSort?.direction ?? 'asc')

	if (!fieldName) return ok(null)

	const sortableFields = allowedSortFields(config)
	if (!sortableFields.includes(fieldName)) {
		return invalid(
			`Query parameter "sort" must be one of: ${sortableFields.join(', ')}`
		)
	}

	const field = config.fields[fieldName]
	if (!field?.column) {
		return invalid(
			`Sort field "${fieldName}" is not backed by a queryable field`
		)
	}

	return ok({ column: field.column, direction })
}

function allowedSortFields(config: V2ResourceConfig): string[] {
	return (
		config.sort?.fields ??
		Object.entries(config.fields)
			.filter(([, field]) => field.sortable)
			.map(([name]) => name)
	).sort()
}

function copyProjectedPath(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
	parts: string[]
): void {
	const [head, ...rest] = parts
	if (!head || !(head in source)) return
	const value = source[head]

	if (rest.length === 0) {
		target[head] = value
		return
	}

	if (Array.isArray(value)) {
		const current = Array.isArray(target[head]) ? target[head] : []
		target[head] = value.map((item, index) => {
			const targetItem = isRecord(current[index])
				? (current[index] as Record<string, unknown>)
				: {}
			if (isRecord(item)) copyProjectedPath(item, targetItem, rest)
			return targetItem
		})
		return
	}

	if (!isRecord(value)) return
	const targetChild = isRecord(target[head])
		? (target[head] as Record<string, unknown>)
		: {}
	copyProjectedPath(value, targetChild, rest)
	if (Object.keys(targetChild).length > 0) target[head] = targetChild
}

function splitCsv(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
}

function filterParamName(name: string): string {
	return `filter[${name}]`
}

function bracketedFilterName(name: string): string | null {
	const match = /^filter\[([^\]]+)\]$/.exec(name)
	return match?.[1] ?? null
}

function unique(values: string[]): string[] {
	return [...new Set(values)]
}

function toContainsLikeQuery(query: string): string {
	return `%${query.trim().replace(/[\^%_]/g, '^$&')}%`
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
