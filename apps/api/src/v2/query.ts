export type V2FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export type V2SortDirection = 'asc' | 'desc'

export type V2FilterOperator = 'eq' | 'gte' | 'lte' | 'contains'

export type V2FieldConfig = {
	type: V2FieldType
	column?: string
	caseInsensitive?: boolean
	normalize?: 'uppercase' | 'lowercase'
	searchable?: boolean
	sortable?: boolean
}

export type V2FilterConfig = {
	field: string
	operator: V2FilterOperator
}

export type V2ExpandConfig =
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

export type V2QueryPlan = {
	ok: true
	appliedFilters: V2AppliedFilter[]
	bindings: Array<string | number>
	expand: string[]
	orderBySql: string | null
	projection: V2Projection
	whereSql: string
}

type V2QueryError = {
	ok: false
	error: string
}

export type V2QueryResult = V2QueryPlan | V2QueryError

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
): V2QueryResult {
	const unknown = findUnknownParam(params, config)
	if (unknown)
		return { ok: false, error: `Unsupported query parameter "${unknown}"` }

	const expandResult = parseExpand(params.get('expand'), config)
	if (!expandResult.ok) return expandResult

	const projectionResult = parseProjection(
		params.get('fields'),
		expandResult.expand,
		config
	)
	if (!projectionResult.ok) return projectionResult

	const filterResult = parseFilters(params, config)
	if (!filterResult.ok) return filterResult

	const searchResult = parseSearch(params.get('q'), config)
	if (!searchResult.ok) return searchResult

	const sortResult = parseSort(params.get('sort'), config)
	if (!sortResult.ok) return sortResult

	const clauses = [...filterResult.clauses]
	if (searchResult.whereSql) clauses.push(searchResult.whereSql)

	return {
		ok: true,
		appliedFilters: filterResult.appliedFilters,
		bindings: [...filterResult.bindings, ...searchResult.bindings],
		expand: expandResult.expand,
		orderBySql: sortResult.orderBySql,
		projection: projectionResult.projection,
		whereSql: clauses.join(' AND ')
	}
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

	const allowed = new Set(config.reservedParams ?? DEFAULT_RESERVED_PARAMS)
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
): { ok: true; expand: string[] } | V2QueryError {
	const allowedExpands = Object.keys(config.expands ?? {}).sort()
	if (!rawExpand || rawExpand.trim() === '') return { ok: true, expand: [] }

	const expand = unique(
		rawExpand
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean)
	)
	for (const name of expand) {
		if (!allowedExpands.includes(name)) {
			return {
				ok: false,
				error: `Query parameter "expand" must be one of: ${allowedExpands.join(', ')}`
			}
		}
	}
	return { ok: true, expand }
}

function parseProjection(
	rawFields: string | null,
	expanded: string[],
	config: V2ResourceConfig
): { ok: true; projection: V2Projection } | V2QueryError {
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
				return {
					ok: false,
					error: `Query parameter "fields" includes "${token}", but "${expandName}" is not expanded`
				}
			}
			if (config.expands?.[expandName]?.kind === 'passthrough') {
				return {
					ok: false,
					error: `Query parameter "fields" includes "${token}", but "${expandName}" does not support nested field selection`
				}
			}
			const paths = scoped.get(expandName) ?? []
			paths.push(fieldPath)
			scoped.set(expandName, paths)
		}
	}

	const baseResult = fieldsToProjection(baseTokens, config)
	if (!baseResult.ok) return baseResult

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
		if (!childResult.ok) return childResult
		expands[expandName] = childResult.projection
	}

	return {
		ok: true,
		projection: {
			fields: baseResult.projection.fields,
			expands
		}
	}
}

function fieldsToProjection(
	tokens: string[],
	config: V2ResourceConfig
): { ok: true; projection: V2Projection } | V2QueryError {
	const fields: string[] = []
	let hasWildcard = false

	for (const token of tokens) {
		if (token === '*') {
			hasWildcard = true
			continue
		}
		const validationError = validateFieldPath(token, config)
		if (validationError) {
			return {
				ok: false,
				error: `Query parameter "fields" includes unsupported field "${token}"`
			}
		}
		fields.push(token)
	}

	return {
		ok: true,
		projection: {
			fields: unique([...(hasWildcard ? config.defaultFields : []), ...fields]),
			expands: {}
		}
	}
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
):
	| {
			ok: true
			appliedFilters: V2AppliedFilter[]
			bindings: Array<string | number>
			clauses: string[]
	  }
	| V2QueryError {
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
			return {
				ok: false,
				error: `Filter "${filterName}" is not backed by a queryable field`
			}
		}

		const parsedValues: Array<string | number> = []
		for (const rawValue of rawValues) {
			const parsed = parseFilterValue(rawValue, filterName, field)
			if (!parsed.ok) return parsed
			parsedValues.push(parsed.value)
		}

		appliedFilters.push({
			name: filterName,
			field: filterConfig.field,
			operator: filterConfig.operator
		})
		bindings.push(...filterBindings(filterConfig.operator, parsedValues))
		clauses.push(
			filterClause(field.column, filterConfig.operator, parsedValues)
		)
	}

	return {
		ok: true,
		appliedFilters,
		bindings,
		clauses
	}
}

function parseFilterValue(
	rawValue: string,
	filterName: string,
	field: V2FieldConfig
): { ok: true; value: string | number } | V2QueryError {
	if (field.type === 'number') {
		const value = Number(rawValue)
		if (!Number.isFinite(value)) {
			return {
				ok: false,
				error: `Query parameter "${filterName}" must be a number`
			}
		}
		return { ok: true, value }
	}

	if (field.type === 'boolean') {
		const normalized = rawValue.toLowerCase()
		if (['true', '1'].includes(normalized)) return { ok: true, value: 1 }
		if (['false', '0'].includes(normalized)) return { ok: true, value: 0 }
		return {
			ok: false,
			error: `Query parameter "${filterName}" must be a boolean`
		}
	}

	let value = rawValue
	if (field.normalize === 'uppercase') value = value.toUpperCase()
	if (field.normalize === 'lowercase') value = value.toLowerCase()
	return { ok: true, value }
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
): { ok: true; whereSql: string; bindings: string[] } | V2QueryError {
	const query = rawQuery?.trim()
	if (!query) return { ok: true, whereSql: '', bindings: [] }

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
		return {
			ok: false,
			error: `Resource "${config.name}" does not support search`
		}
	}

	return {
		ok: true,
		whereSql: `(${clauses.join(' OR ')})`,
		bindings
	}
}

function parseSort(
	rawSort: string | null,
	config: V2ResourceConfig
): { ok: true; orderBySql: string | null } | V2QueryError {
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

	if (!fieldName) return { ok: true, orderBySql: null }

	const sortableFields = allowedSortFields(config)
	if (!sortableFields.includes(fieldName)) {
		return {
			ok: false,
			error: `Query parameter "sort" must be one of: ${sortableFields.join(', ')}`
		}
	}

	const field = config.fields[fieldName]
	if (!field?.column) {
		return {
			ok: false,
			error: `Sort field "${fieldName}" is not backed by a queryable field`
		}
	}

	return {
		ok: true,
		orderBySql: `${field.column} ${direction.toUpperCase()}`
	}
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
