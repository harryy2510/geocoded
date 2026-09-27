import { type Context } from 'hono'
import { type Result, type ResultAsync } from 'neverthrow'
import { type V2Error, v2ErrorBody, v2ErrorStatus } from './errors'

// Data changes daily: browsers revalidate daily, the edge keeps it until the seed job purges.
export const DATA_CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000'
// Errors must not outlive a data release for long.
const ERROR_CACHE_CONTROL = 'public, max-age=300, s-maxage=300'
export const NO_STORE_CACHE_CONTROL = 'private, no-store'

export async function sendV2(
	c: Context,
	result: Result<unknown, V2Error> | ResultAsync<unknown, V2Error>,
	cacheControl: string = DATA_CACHE_CONTROL
): Promise<Response> {
	const resolved = await result
	return await resolved.match(
		(data) => sendJson(c, data, 200, cacheControl),
		(error) =>
			sendJson(
				c,
				v2ErrorBody(error),
				v2ErrorStatus(error),
				error.code === 'rate_limited' || error.code === 'internal_error'
					? NO_STORE_CACHE_CONTROL
					: ERROR_CACHE_CONTROL
			)
	)
}

async function sendJson(
	c: Context,
	data: unknown,
	status: number,
	cacheControl: string
): Promise<Response> {
	const body = JSON.stringify(data)
	const etag = await weakEtag(body)
	const headers: Record<string, string> = {
		'Cache-Control': cacheControl,
		ETag: etag
	}
	if (status === 200 && ifNoneMatch(c.req.header('If-None-Match'), etag)) {
		return new Response(null, { status: 304, headers })
	}
	return new Response(body, {
		status,
		headers: { 'Content-Type': 'application/json; charset=UTF-8', ...headers }
	})
}

async function weakEtag(body: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		'SHA-1',
		new TextEncoder().encode(body)
	)
	const hex = [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
	return `W/"${hex}"`
}

function ifNoneMatch(header: string | undefined, etag: string): boolean {
	if (!header) return false
	const opaque = etag.slice(2)
	return header
		.split(',')
		.map((tag) => tag.trim())
		.some((tag) => tag === '*' || tag === etag || tag === opaque)
}
