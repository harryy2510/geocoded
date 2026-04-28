import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE_URL =
	'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master'
const SQL_FILE = join(import.meta.dirname, '..', '.d1-seed.sql')

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
	timezones: {
		zoneName: string
		gmtOffset: number
		gmtOffsetName: string
		abbreviation: string
		tzName: string
	}[]
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

function esc(s: string | null | undefined): string {
	return (s ?? '').replace(/'/g, "''")
}

function nullable(v: string | number | null | undefined): string {
	if (v === null || v === undefined || v === '') return 'NULL'
	if (typeof v === 'number') return String(v)
	return `'${esc(String(v))}'`
}

async function fetchJSON<T>(path: string): Promise<T> {
	console.log(`Fetching ${path}...`)
	const res = await fetch(`${BASE_URL}/${path}`)
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
	return (await res.json()) as T
}

async function wrangler(args: string[]): Promise<void> {
	const proc = Bun.spawn(['bunx', 'wrangler', ...args], {
		stdout: 'inherit',
		stderr: 'inherit'
	})
	const code = await proc.exited
	if (code !== 0)
		throw new Error(`wrangler ${args.join(' ')} failed (exit ${code})`)
}

async function main() {
	const isRemote = process.argv.includes('--remote')
	const target = isRemote ? '--remote' : '--local'

	// Apply migrations
	console.log(`\nApplying migrations (${isRemote ? 'remote' : 'local'})...`)
	await wrangler(['d1', 'migrations', 'apply', 'geo-db', target])

	// Fetch upstream data
	const [rawCountries, rawStates, rawCombined] = await Promise.all([
		fetchJSON<RawCountry[]>('json/countries.json'),
		fetchJSON<RawState[]>('json/states.json'),
		fetchJSON<RawCombinedCountry[]>('json/countries+states+cities.json')
	])

	// Build one big SQL file
	const sql: string[] = []

	// Clear existing data
	sql.push('DELETE FROM search_index;')
	sql.push('DELETE FROM cities;')
	sql.push('DELETE FROM states;')
	sql.push('DELETE FROM countries;')

	// Countries
	const sortedCountries = rawCountries.sort((a, b) =>
		a.name.localeCompare(b.name)
	)
	console.log(`\nPreparing ${sortedCountries.length} countries...`)

	for (const c of sortedCountries) {
		const tz = esc(JSON.stringify(c.timezones))
		const tr = esc(JSON.stringify(c.translations))
		sql.push(
			`INSERT INTO countries (iso2,iso3,name,native,capital,currency,currency_name,currency_symbol,tld,phone_code,numeric_code,nationality,region,subregion,emoji,emoji_u,latitude,longitude,area_sq_km,population,gdp,postal_code_format,postal_code_regex,wiki_data_id,timezones,translations) VALUES ('${esc(c.iso2)}','${esc(c.iso3)}','${esc(c.name)}','${esc(c.native)}','${esc(c.capital)}','${esc(c.currency)}','${esc(c.currency_name)}','${esc(c.currency_symbol)}','${esc(c.tld)}','${esc(c.phonecode)}','${esc(c.numeric_code)}','${esc(c.nationality)}','${esc(c.region)}','${esc(c.subregion)}','${esc(c.emoji)}','${esc(c.emojiU)}','${esc(c.latitude)}','${esc(c.longitude)}',${nullable(c.area_sq_km)},${nullable(c.population)},${nullable(c.gdp)},${nullable(c.postal_code_format)},${nullable(c.postal_code_regex)},'${esc(c.wikiDataId)}','${tz}','${tr}');`
		)
	}

	// States
	const sortedStates = rawStates.sort((a, b) => a.name.localeCompare(b.name))
	console.log(`Preparing ${sortedStates.length} states...`)

	for (const s of sortedStates) {
		const tr = esc(JSON.stringify(s.translations))
		sql.push(
			`INSERT INTO states (country_code,country_name,iso2,iso3166_2,fips_code,name,native,type,level,parent_id,population,latitude,longitude,timezone,wiki_data_id,translations) VALUES ('${esc(s.country_code)}','${esc(s.country_name)}','${esc(s.iso2)}','${esc(s.iso3166_2)}','${esc(s.fips_code)}','${esc(s.name)}','${esc(s.native)}','${esc(s.type)}',${nullable(s.level)},${nullable(s.parent_id)},${nullable(s.population)},'${esc(s.latitude)}','${esc(s.longitude)}','${esc(s.timezone)}','${esc(s.wikiDataId)}','${tr}');`
		)
	}

	// Cities
	type CityRow = {
		countryCode: string
		countryName: string
		stateCode: string
		stateName: string
		name: string
		latitude: string
		longitude: string
		timezone: string
	}

	const allCities: CityRow[] = []
	for (const country of rawCombined) {
		if (!country.states) continue
		for (const state of country.states) {
			if (!state.cities) continue
			for (const city of state.cities) {
				allCities.push({
					countryCode: country.iso2,
					countryName: country.name,
					stateCode: state.iso2,
					stateName: state.name,
					name: city.name,
					latitude: city.latitude,
					longitude: city.longitude,
					timezone: city.timezone
				})
			}
		}
	}

	console.log(`Preparing ${allCities.length} cities...`)

	for (const c of allCities) {
		sql.push(
			`INSERT INTO cities (country_code,country_name,state_code,state_name,name,latitude,longitude,timezone) VALUES ('${esc(c.countryCode)}','${esc(c.countryName)}','${esc(c.stateCode)}','${esc(c.stateName)}','${esc(c.name)}','${esc(c.latitude)}','${esc(c.longitude)}','${esc(c.timezone)}');`
		)
	}

	// Search index
	console.log('Preparing search index...')

	const countryNameMap = new Map<string, string>()
	for (const c of rawCountries) {
		countryNameMap.set(c.iso2, c.name)
	}

	for (const c of sortedCountries) {
		const extra = esc(JSON.stringify({ country_name: c.name }))
		sql.push(
			`INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ('${esc(c.name)}','country','${esc(c.iso2)}','','${extra}');`
		)
	}

	for (const s of sortedStates) {
		const countryName = countryNameMap.get(s.country_code) ?? s.country_name
		const extra = esc(JSON.stringify({ country_name: countryName }))
		sql.push(
			`INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ('${esc(s.name)}','state','${esc(s.country_code)}','${esc(s.iso2)}','${extra}');`
		)
	}

	for (const c of allCities) {
		const extra = esc(
			JSON.stringify({ country_name: c.countryName, state_name: c.stateName })
		)
		sql.push(
			`INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ('${esc(c.name)}','city','${esc(c.countryCode)}','${esc(c.stateCode)}','${extra}');`
		)
	}

	// Write and execute
	console.log(`\nWriting ${sql.length} SQL statements...`)
	await writeFile(SQL_FILE, sql.join('\n'))

	console.log('Executing SQL...')
	await wrangler([
		'd1',
		'execute',
		'geo-db',
		`--file=${SQL_FILE}`,
		target,
		'--yes'
	])

	console.log(
		`\nDone! Loaded ${sortedCountries.length} countries, ${sortedStates.length} states, ${allCities.length} cities`
	)

	// Cache purge (remote only)
	if (isRemote) {
		const cfToken = process.env.CLOUDFLARE_API_TOKEN
		const cacheZone = process.env.CACHE_ZONE
		if (!cfToken) {
			console.log(
				'\nWarning: CLOUDFLARE_API_TOKEN not set, skipping cache purge.'
			)
		} else if (!cacheZone) {
			console.log('\nWarning: CACHE_ZONE not set, skipping cache purge.')
		} else {
			console.log(`\nPurging Cloudflare cache for ${cacheZone}...`)

			const zoneRes = await fetch(
				`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(cacheZone)}`,
				{
					headers: {
						Authorization: `Bearer ${cfToken}`,
						'Content-Type': 'application/json'
					}
				}
			)
			const zoneData = (await zoneRes.json()) as {
				success: boolean
				result: { id: string }[]
			}

			const zone = zoneData.result[0]
			if (!zoneData.success || !zone) {
				console.error(`Failed to look up zone ID for ${cacheZone}`)
			} else {
				const zoneId = zone.id
				console.log(`  Found zone ID: ${zoneId}`)

				const purgeRes = await fetch(
					`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${cfToken}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ purge_everything: true })
					}
				)
				const purgeData = (await purgeRes.json()) as { success: boolean }

				if (purgeData.success) {
					console.log('  Cache purged successfully!')
				} else {
					console.error('  Failed to purge cache:', purgeData)
				}
			}
		}
	}
}

main()
	.catch(console.error)
	.finally(() => unlink(SQL_FILE).catch(() => {}))
