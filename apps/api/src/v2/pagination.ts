import { ok, type Result } from 'neverthrow'
import { invalid, type V2Error } from './errors'
import { type V2PaginatedResponse } from './types'

const MAX_LIMIT = 2000

// Position after the last row of a page: its sort value and rowid tie-breaker.
export type V2Keyset = {
	value: string | number
	rowid: number
}

export type V2PaginationParams = {
	limit: number
	offset: number
	cursor: string | null
	after: V2Keyset | null
}

type CursorPayload = {
	o: number
	k?: [string | number, number]
}

export function parseV2Pagination(
	params: URLSearchParams
): Result<V2PaginationParams, V2Error> {
	return parsePositiveInteger(params.get('limit'), 'limit', 25).andThen(
		(rawLimit) => {
			const limit = Math.min(rawLimit, MAX_LIMIT)
			const rawCursor = params.get('cursor')
			const rawOffset = params.get('offset')
			if (rawCursor !== null && rawOffset !== null) {
				return invalid<V2PaginationParams>(
					'Query parameters "offset" and "cursor" cannot be combined'
				)
			}

			if (rawCursor !== null) {
				const decoded = decodeCursor(rawCursor)
				if (!decoded) return invalid('Query parameter "cursor" is invalid')
				return ok({
					limit,
					offset: decoded.o,
					cursor: rawCursor,
					after: decoded.k ? { value: decoded.k[0], rowid: decoded.k[1] } : null
				})
			}

			return parseNonNegativeInteger(rawOffset, 'offset', 0).map((offset) => ({
				limit,
				offset,
				cursor: null,
				after: null
			}))
		}
	)
}

export function paginatedV2<T>(
	data: T[],
	total: number,
	limit: number,
	offset: number,
	last: V2Keyset | null = null
): V2PaginatedResponse<T> {
	const nextOffset = offset + limit
	const hasMore = nextOffset < total
	return {
		data,
		meta: {
			total,
			limit,
			offset,
			hasMore,
			cursor: hasMore ? encodeCursor(nextOffset, last) : null
		}
	}
}

function parsePositiveInteger(
	value: string | null,
	name: string,
	defaultValue: number
): Result<number, V2Error> {
	if (value === null || value === '') return ok(defaultValue)
	if (!/^\d+$/.test(value))
		return invalid(`Query parameter "${name}" must be an integer`)
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed) || parsed < 1) {
		return invalid(`Query parameter "${name}" must be greater than 0`)
	}
	return ok(parsed)
}

function parseNonNegativeInteger(
	value: string | null,
	name: string,
	defaultValue: number
): Result<number, V2Error> {
	if (value === null || value === '') return ok(defaultValue)
	if (!/^\d+$/.test(value))
		return invalid(`Query parameter "${name}" must be an integer`)
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed)) {
		return invalid(`Query parameter "${name}" is too large`)
	}
	return ok(parsed)
}

function encodeCursor(offset: number, last: V2Keyset | null): string {
	const payload: CursorPayload = last
		? { o: offset, k: [last.value, last.rowid] }
		: { o: offset }
	return toBase64Url(JSON.stringify(payload))
}

function decodeCursor(cursor: string): CursorPayload | null {
	if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return null
	const text = fromBase64Url(cursor)
	if (text === null) return null
	// Cursors issued before keyset paging encode a bare offset.
	if (/^\d+$/.test(text)) {
		const offset = Number(text)
		return Number.isSafeInteger(offset) ? { o: offset } : null
	}
	try {
		return toCursorPayload(JSON.parse(text))
	} catch {
		return null
	}
}

function toCursorPayload(value: unknown): CursorPayload | null {
	if (typeof value !== 'object' || value === null) return null
	const { o, k } = value as Record<string, unknown>
	if (typeof o !== 'number' || !Number.isSafeInteger(o) || o < 0) return null
	if (k === undefined) return { o }
	if (
		!Array.isArray(k) ||
		k.length !== 2 ||
		(typeof k[0] !== 'string' && typeof k[0] !== 'number') ||
		typeof k[1] !== 'number' ||
		!Number.isSafeInteger(k[1])
	) {
		return null
	}
	return { o, k: [k[0], k[1]] }
}

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text)
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

function fromBase64Url(cursor: string): string | null {
	const padded =
		cursor.replace(/-/g, '+').replace(/_/g, '/') +
		'=='.slice(0, (4 - (cursor.length % 4)) % 4)
	try {
		const binary = atob(padded)
		return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(
			Uint8Array.from(binary, (char) => char.charCodeAt(0))
		)
	} catch {
		return null
	}
}
