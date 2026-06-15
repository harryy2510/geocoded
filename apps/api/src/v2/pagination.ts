import { type V2PaginatedResponse } from './types'

export type V2PaginationParams = {
	limit: number
	offset: number
	cursor: string | null
}

export function parseV2Pagination(
	params: URLSearchParams
): V2PaginationParams | string {
	const limitResult = parsePositiveInteger(params.get('limit'), 'limit', 25)
	if (typeof limitResult === 'string') return limitResult
	const limit = Math.min(limitResult, 2000)

	const rawCursor = params.get('cursor')
	const rawOffset = params.get('offset')
	if (rawCursor !== null && rawOffset !== null) {
		return 'Query parameters "offset" and "cursor" cannot be combined'
	}

	if (rawCursor !== null) {
		if (rawCursor.trim().length === 0) {
			return 'Query parameter "cursor" is invalid'
		}
		const decoded = decodeCursor(rawCursor)
		if (decoded === null) return 'Query parameter "cursor" is invalid'
		return { limit, offset: decoded, cursor: rawCursor }
	}

	const offsetResult = parseNonNegativeInteger(rawOffset, 'offset', 0)
	if (typeof offsetResult === 'string') return offsetResult
	return { limit, offset: offsetResult, cursor: null }
}

export function paginatedV2<T>(
	data: T[],
	total: number,
	limit: number,
	offset: number
): V2PaginatedResponse<T> {
	const nextOffset = offset + limit
	return {
		data,
		meta: {
			total,
			limit,
			offset,
			hasMore: nextOffset < total,
			cursor: nextOffset < total ? encodeCursor(nextOffset) : null
		}
	}
}

function parsePositiveInteger(
	value: string | null,
	name: string,
	defaultValue: number
): number | string {
	if (value === null || value === '') return defaultValue
	if (!/^\d+$/.test(value))
		return `Query parameter "${name}" must be an integer`
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		return `Query parameter "${name}" must be greater than 0`
	}
	return parsed
}

function parseNonNegativeInteger(
	value: string | null,
	name: string,
	defaultValue: number
): number | string {
	if (value === null || value === '') return defaultValue
	if (!/^\d+$/.test(value))
		return `Query parameter "${name}" must be an integer`
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed)) {
		return `Query parameter "${name}" is too large`
	}
	return parsed
}

function encodeCursor(offset: number): string {
	return btoa(String(offset))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

function decodeCursor(cursor: string): number | null {
	if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return null
	const padded =
		cursor.replace(/-/g, '+').replace(/_/g, '/') +
		'=='.slice(0, (4 - (cursor.length % 4)) % 4)
	try {
		const decodedText = atob(padded)
		if (!/^\d+$/.test(decodedText)) return null
		const decoded = Number(decodedText)
		return Number.isSafeInteger(decoded) ? decoded : null
	} catch {
		return null
	}
}
