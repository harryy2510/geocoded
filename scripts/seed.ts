import { $ } from 'bun'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { City, Country, State } from '../src/types'

const DATA_DIR = join(import.meta.dirname, '..', 'data')
const BASE_URL =
	'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master'

type RawCountry = {
	id: number
	name: string
	iso3: string
	iso2: string
	numeric_code: string
	phonecode: string
	capital: string
	currency: string
	currency_name: string
	currency_symbol: string
	tld: string
	native: string
	population: number
	gdp: number | null
	region: string
	region_id: number
	subregion: string
	subregion_id: number
	nationality: string
	area_sq_km: number
	postal_code_format: string | null
	postal_code_regex: string | null
	timezones: { zoneName: string; gmtOffset: number; gmtOffsetName: string; abbreviation: string; tzName: string }[]
	translations: Record<string, string>
	latitude: string
	longitude: string
	emoji: string
	emojiU: string
	wikiDataId: string
}

type RawState = {
	id: number
	name: string
	country_id: number
	country_code: string
	country_name: string
	iso2: string
	iso3166_2: string
	fips_code: string
	type: string
	level: string | null
	parent_id: string | null
	native: string
	latitude: string
	longitude: string
	timezone: string
	translations: Record<string, string>
	wikiDataId: string
	population: number | null
}

type RawNestedCity = {
	id: number
	name: string
	latitude: string
	longitude: string
	timezone: string
}

type RawNestedState = {
	id: number
	name: string
	iso2: string
	cities: RawNestedCity[]
}

type RawCombinedCountry = {
	name: string
	iso2: string
	states: RawNestedState[]
}

type KVEntry = {
	key: string
	value: string
}

async function fetchJSON<T>(path: string): Promise<T> {
	console.log(`Fetching ${path}...`)
	const res = await fetch(`${BASE_URL}/${path}`)
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
	return (await res.json()) as T
}

function mapCountry(c: RawCountry): Country {
	return {
		areaSqKm: c.area_sq_km,
		capital: c.capital,
		currency: c.currency,
		currencyName: c.currency_name,
		currencySymbol: c.currency_symbol,
		emoji: c.emoji,
		emojiU: c.emojiU,
		gdp: c.gdp,
		iso2: c.iso2,
		iso3: c.iso3,
		latitude: c.latitude,
		longitude: c.longitude,
		name: c.name,
		nationality: c.nationality,
		native: c.native,
		numericCode: c.numeric_code,
		phoneCode: c.phonecode,
		population: c.population,
		postalCodeFormat: c.postal_code_format,
		postalCodeRegex: c.postal_code_regex,
		region: c.region,
		subregion: c.subregion,
		timezones: c.timezones,
		tld: c.tld,
		translations: c.translations,
		wikiDataId: c.wikiDataId,
	}
}

function mapState(s: RawState): State {
	return {
		countryCode: s.country_code,
		countryName: s.country_name,
		fipsCode: s.fips_code,
		iso2: s.iso2,
		iso31662: s.iso3166_2,
		latitude: s.latitude,
		level: s.level,
		longitude: s.longitude,
		name: s.name,
		native: s.native,
		parentId: s.parent_id,
		population: s.population,
		timezone: s.timezone,
		translations: s.translations,
		type: s.type,
		wikiDataId: s.wikiDataId,
	}
}

async function main() {
	await mkdir(DATA_DIR, { recursive: true })

	const [rawCountries, rawStates, rawCombined] = await Promise.all([
		fetchJSON<RawCountry[]>('json/countries.json'),
		fetchJSON<RawState[]>('json/states.json'),
		fetchJSON<RawCombinedCountry[]>('json/countries+states+cities.json'),
	])

	// --- Countries ---
	const countries = rawCountries
		.map(mapCountry)
		.sort((a, b) => a.name.localeCompare(b.name))

	const countriesBulk: KVEntry[] = [
		{ key: 'countries', value: JSON.stringify(countries) },
	]

	// --- States grouped by country ---
	const statesByCountry = new Map<string, State[]>()

	for (const s of rawStates) {
		const key = s.country_code
		if (!statesByCountry.has(key)) statesByCountry.set(key, [])
		statesByCountry.get(key)!.push(mapState(s))
	}

	for (const states of statesByCountry.values()) {
		states.sort((a, b) => a.name.localeCompare(b.name))
	}

	const statesBulk: KVEntry[] = [...statesByCountry.entries()].map(
		([cc, states]) => ({
			key: `states:${cc}`,
			value: JSON.stringify(states),
		}),
	)

	// --- Cities from combined file (cities.json was removed upstream) ---
	const citiesByCountryState = new Map<string, City[]>()
	let totalCities = 0

	for (const country of rawCombined) {
		if (!country.states) continue
		for (const state of country.states) {
			if (!state.cities) continue
			const mapKey = `${country.iso2}:${state.iso2}`
			const cities: City[] = state.cities.map((c) => ({
				countryCode: country.iso2,
				countryName: country.name,
				latitude: c.latitude,
				longitude: c.longitude,
				name: c.name,
				stateCode: state.iso2,
				stateName: state.name,
				timezone: c.timezone,
			}))
			cities.sort((a, b) => a.name.localeCompare(b.name))
			citiesByCountryState.set(mapKey, cities)
			totalCities += cities.length
		}
	}

	const citiesBulk: KVEntry[] = [...citiesByCountryState.entries()].map(
		([key, cities]) => ({
			key: `cities:${key}`,
			value: JSON.stringify(cities),
		}),
	)

	// Write bulk files
	await Promise.all([
		writeFile(
			join(DATA_DIR, 'kv-bulk-countries.json'),
			JSON.stringify(countriesBulk, null, 2),
		),
		writeFile(
			join(DATA_DIR, 'kv-bulk-states.json'),
			JSON.stringify(statesBulk, null, 2),
		),
		writeFile(
			join(DATA_DIR, 'kv-bulk-cities.json'),
			JSON.stringify(citiesBulk, null, 2),
		),
	])

	console.log(
		`\nLoaded: ${rawCountries.length} countries, ${rawStates.length} states, ${totalCities} cities`,
	)
	console.log(`\nGenerated bulk files:`)
	console.log(`  countries: 1 key`)
	console.log(`  states: ${statesBulk.length} keys`)
	console.log(`  cities: ${citiesBulk.length} keys`)
	console.log(`\nFiles written to ${DATA_DIR}/`)

	if (process.argv.includes('--upload')) {
		console.log(`\nUploading to KV...`)
		const files = [
			'kv-bulk-countries.json',
			'kv-bulk-states.json',
			'kv-bulk-cities.json',
		]
		for (const file of files) {
			const path = join(DATA_DIR, file)
			console.log(`  Uploading ${file}...`)
			await $`bunx wrangler kv bulk put ${path} --binding GEO_KV --remote`
		}
		console.log(`\nUpload complete!`)

		const cfToken = process.env.CLOUDFLARE_API_TOKEN
		if (!cfToken) {
			console.log(
				`\nWarning: CLOUDFLARE_API_TOKEN not set -- skipping cache purge.`,
			)
		} else {
			console.log(`\nPurging Cloudflare cache...`)

			const zoneRes = await fetch(
				'https://api.cloudflare.com/client/v4/zones?name=geocoded.me',
				{
					headers: {
						Authorization: `Bearer ${cfToken}`,
						'Content-Type': 'application/json',
					},
				},
			)
			const zoneData = (await zoneRes.json()) as {
				success: boolean
				result: { id: string }[]
			}

			const zone = zoneData.result[0]
			if (!zoneData.success || !zone) {
				console.error('Failed to look up zone ID for geocoded.me')
			} else {
				const zoneId = zone.id
				console.log(`  Found zone ID: ${zoneId}`)

				const purgeRes = await fetch(
					`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${cfToken}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ purge_everything: true }),
					},
				)
				const purgeData = (await purgeRes.json()) as { success: boolean }

				if (purgeData.success) {
					console.log('  Cache purged successfully!')
				} else {
					console.error('  Failed to purge cache:', purgeData)
				}
			}
		}
	} else {
		console.log(`\nRun with --upload to push to KV, or run: bun seed:upload`)
	}
}

main().catch(console.error)
