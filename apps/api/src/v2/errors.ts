import { err, type Result } from 'neverthrow'

export type V2ErrorCode =
	| 'invalid_request'
	| 'not_found'
	| 'ambiguous'
	| 'rate_limited'
	| 'internal_error'

export type V2Error = {
	code: V2ErrorCode
	message: string
	hint?: string
	matches?: unknown[]
}

const STATUS_BY_CODE: Record<V2ErrorCode, 400 | 404 | 409 | 429 | 500> = {
	invalid_request: 400,
	not_found: 404,
	ambiguous: 409,
	rate_limited: 429,
	internal_error: 500
}

export function v2Error(
	code: V2ErrorCode,
	message: string,
	extra: Pick<V2Error, 'hint' | 'matches'> = {}
): V2Error {
	return { code, message, ...extra }
}

export function invalid<T = never>(message: string): Result<T, V2Error> {
	return err(v2Error('invalid_request', message))
}

export function notFound<T = never>(message: string): Result<T, V2Error> {
	return err(v2Error('not_found', message))
}

export function v2ErrorStatus(error: V2Error): 400 | 404 | 409 | 429 | 500 {
	return STATUS_BY_CODE[error.code]
}

export function v2ErrorBody(error: V2Error): {
	error: { code: V2ErrorCode; message: string; hint?: string }
	matches?: unknown[]
} {
	const { matches, ...rest } = error
	return matches ? { error: rest, matches } : { error: rest }
}
