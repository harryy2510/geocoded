import { ok, type Result } from 'neverthrow'
import { invalid, type V2Error } from './errors'

const DEFAULT_RADIUS_KM = 50
const MAX_RADIUS_KM = 300

const EARTH_RADIUS_KM = 6371.0088
const KM_PER_DEGREE = (Math.PI * EARTH_RADIUS_KM) / 180

export type V2Point = {
	lat: number
	lng: number
}

export type V2NearQuery = V2Point & {
	radiusKm: number
}

// SQL expressions yielding a table's coordinates as REAL (cities and airports store text).
export type V2GeoColumns = {
	lat: string
	lng: string
}

export function parsePoint(
	rawLat: string | null,
	rawLng: string | null
): Result<V2Point, V2Error> {
	if (rawLat === null || rawLng === null || !rawLat.trim() || !rawLng.trim()) {
		return invalid('Query parameters "lat" and "lng" are required')
	}
	return toPoint(Number(rawLat), Number(rawLng))
}

export function parseNear(
	params: URLSearchParams
): Result<V2NearQuery | null, V2Error> {
	const rawNear = params.get('near')
	const rawRadius = params.get('radius')
	if (rawNear === null) {
		return rawRadius === null
			? ok(null)
			: invalid('Query parameter "radius" requires "near"')
	}
	if (params.get('sort') !== null) {
		return invalid(
			'Query parameter "sort" cannot be combined with "near"; results are ordered by distance'
		)
	}

	const [rawLat, rawLng, ...rest] = rawNear.split(',')
	if (rawLat === undefined || rawLng === undefined || rest.length > 0) {
		return invalid('Query parameter "near" must be "lat,lng"')
	}

	return toPoint(Number(rawLat), Number(rawLng)).andThen((point) => {
		if (rawRadius === null) return ok({ ...point, radiusKm: DEFAULT_RADIUS_KM })
		const radiusKm = Number(rawRadius)
		if (
			!Number.isFinite(radiusKm) ||
			radiusKm <= 0 ||
			radiusKm > MAX_RADIUS_KM
		) {
			return invalid<V2NearQuery>(
				`Query parameter "radius" must be between 0 and ${MAX_RADIUS_KM} (kilometres)`
			)
		}
		return ok({ ...point, radiusKm })
	})
}

export function haversineKm(a: V2Point, b: V2Point): number {
	const dLat = toRadians(b.lat - a.lat)
	const dLng = toRadians(b.lng - a.lng)
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(a.lat)) *
			Math.cos(toRadians(b.lat)) *
			Math.sin(dLng / 2) ** 2
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Bounding box plus an equirectangular distance expression, built from plain arithmetic so it
// runs on any SQLite build. Accurate enough to rank and cut results within a few hundred km;
// exact distances are computed with haversine afterwards.
// ponytail: boxes crossing the antimeridian are clipped at ±180, add a wrapped second box if Pacific
// island coverage matters.
export function nearSql(
	columns: V2GeoColumns,
	near: V2NearQuery
): { whereSql: string; distanceSql: string; bindings: number[] } {
	const radiusDeg = near.radiusKm / KM_PER_DEGREE
	const lngScale = Math.max(Math.cos(toRadians(near.lat)), 0.01)
	const lngSpan = Math.min(radiusDeg / lngScale, 180)
	const dy = `(${columns.lat} - ?)`
	const dx = `((${columns.lng} - ?) * ?)`
	const distanceSql = `(${dy} * ${dy} + ${dx} * ${dx})`
	return {
		whereSql: `${columns.lat} BETWEEN ? AND ? AND ${columns.lng} BETWEEN ? AND ? AND ${distanceSql} <= ?`,
		distanceSql,
		bindings: [
			near.lat - radiusDeg,
			near.lat + radiusDeg,
			near.lng - lngSpan,
			near.lng + lngSpan,
			...distanceBindings(near),
			radiusDeg * radiusDeg
		]
	}
}

// Bindings for one standalone use of `distanceSql` (for example in ORDER BY).
export function distanceBindings(near: V2Point): number[] {
	const lngScale = Math.max(Math.cos(toRadians(near.lat)), 0.01)
	return [near.lat, near.lat, near.lng, lngScale, near.lng, lngScale]
}

export function roundKm(value: number): number {
	return Math.round(value * 100) / 100
}

function toPoint(lat: number, lng: number): Result<V2Point, V2Error> {
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
		return invalid('Latitude must be a number between -90 and 90')
	}
	if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
		return invalid('Longitude must be a number between -180 and 180')
	}
	return ok({ lat, lng })
}

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180
}
