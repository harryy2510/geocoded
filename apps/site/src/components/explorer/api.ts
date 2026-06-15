// v2 lives ONLY on the local dev API. Fall back to localhost, not prod.
const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787'

export type V2Meta = {
	total: number
	limit: number
	offset: number
	hasMore: boolean
	cursor: string | null
}

export type V2Paginated<T> = {
	data: T[]
	meta: V2Meta
}

const emptyMeta: V2Meta = {
	total: 0,
	limit: 0,
	offset: 0,
	hasMore: false,
	cursor: null,
}

function joinApi(path: string): string {
	return `${apiUrl.replace(/\/$/, '')}${path}`
}

export type V2Query = {
	q?: string
	sort?: string
	limit?: number
	offset?: number
	cursor?: string | null
	fields?: string
	expand?: string
	filters?: Record<string, string>
}

// Build a v2 list URL. URLSearchParams encodes `filter[name]` correctly.
export function buildV2Url(path: string, query: V2Query = {}): string {
	const params = new URLSearchParams()
	if (query.q) params.set('q', query.q)
	if (query.sort) params.set('sort', query.sort)
	if (query.limit != null) params.set('limit', String(query.limit))
	if (query.fields) params.set('fields', query.fields)
	if (query.expand) params.set('expand', query.expand)
	// cursor and offset are mutually exclusive; cursor wins when present.
	if (query.cursor) {
		params.set('cursor', query.cursor)
	} else if (query.offset != null) {
		params.set('offset', String(query.offset))
	}
	if (query.filters) {
		for (const [key, value] of Object.entries(query.filters)) {
			if (value !== '') params.set(`filter[${key}]`, value)
		}
	}
	const search = params.toString()
	return joinApi(search ? `${path}?${search}` : path)
}

export async function fetchV2List<T>(
	path: string,
	query: V2Query = {}
): Promise<V2Paginated<T>> {
	const response = await fetch(buildV2Url(path, query))
	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`)
	}
	return response.json() as Promise<V2Paginated<T>>
}

export async function fetchV2Record<T>(path: string): Promise<T | null> {
	const response = await fetch(joinApi(path))
	if (!response.ok) return null
	return response.json() as Promise<T>
}
