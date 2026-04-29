import { readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DATA_DIR = join(import.meta.dirname, '..', 'data')
const SQL_FILE = join(import.meta.dirname, '..', '.d1-seed.sql')

type RawTimezone = {
	abbreviation: string
	gmtOffset: number
	gmtOffsetName: string
	tzName: string
	zoneName: string
}

type RawCountry = {
	name: string
	iso2: string
	iso3: string
	numericCode: string

	capital: string
	latitude: string
	longitude: string
	areaSqKm: number
	region: string
	subregion: string
	continent: string
	neighbours: string[]
	timezones: RawTimezone[]
	population: number
	nationality: string
	languages: string[]
	native: string
	gdp: number | null
	currency: string
	currencyName: string
	currencySymbol: string
	phoneCode: string
	tld: string
	postalCodeFormat: string | null
	postalCodeRegex: string | null
	emoji: string
	emojiU: string
	flagUrl: string
	translations: Record<string, string>
	drivingSide: string
	measurementSystem: string
	firstDayOfWeek: string
	timeFormat: string
	literacy: number | null
}

type RawState = {
	name: string
	iso2: string
	iso31662: string
	countryCode: string
	countryName: string

	latitude: string
	longitude: string
	timezone: string
	capital: string | null
	population: number | null
	type: string
}

type RawCity = {
	name: string
	countryCode: string
	countryName: string
	stateCode: string
	stateName: string
	latitude: string
	longitude: string
	population: number
	timezone: string
}

type RawTimezoneEntry = {
	timezone: string
	countryCodes: string[]
	coordinates: string
	comments: string
}

type RawCurrencyEntry = {
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

function esc(s: string | null | undefined): string {
	return (s ?? '').replace(/'/g, "''")
}

function nullable(v: string | number | null | undefined): string {
	if (v === null || v === undefined || v === '') return 'NULL'
	if (typeof v === 'number') return String(v)
	return `'${esc(String(v))}'`
}

async function readJSON<T>(filename: string): Promise<T> {
	const raw = await readFile(join(DATA_DIR, filename), 'utf-8')
	return JSON.parse(raw) as T
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

	// Read data files
	console.log('\nReading data files...')
	const [rawCountries, rawStates, rawCities, rawTimezones, rawCurrencies] =
		await Promise.all([
			readJSON<RawCountry[]>('countries.json'),
			readJSON<RawState[]>('states.json'),
			readJSON<RawCity[]>('cities.json'),
			readJSON<RawTimezoneEntry[]>('timezones.json'),
			readJSON<RawCurrencyEntry[]>('currencies.json')
		])

	// Build SQL
	const sql: string[] = []

	// Clear existing data
	sql.push('DELETE FROM search_index;')
	sql.push('DELETE FROM cities;')
	sql.push('DELETE FROM states;')
	sql.push('DELETE FROM countries;')
	sql.push('DELETE FROM timezones;')
	sql.push('DELETE FROM currencies;')

	// Countries
	const sortedCountries = rawCountries.sort((a, b) =>
		a.name.localeCompare(b.name)
	)
	console.log(`\nPreparing ${sortedCountries.length} countries...`)

	for (const c of sortedCountries) {
		const tz = esc(JSON.stringify(c.timezones))
		const tr = esc(JSON.stringify(c.translations))
		const nb = esc(JSON.stringify(c.neighbours))
		const lang = esc(JSON.stringify(c.languages))
		sql.push(
			`INSERT INTO countries (iso2,iso3,name,native,capital,currency,currency_name,currency_symbol,tld,phone_code,numeric_code,nationality,region,subregion,emoji,emoji_u,latitude,longitude,area_sq_km,population,gdp,postal_code_format,postal_code_regex,timezones,translations,continent,neighbours,languages,flag_url,driving_side,measurement_system,first_day_of_week,time_format,literacy) VALUES ('${esc(c.iso2)}','${esc(c.iso3)}','${esc(c.name)}','${esc(c.native)}','${esc(c.capital)}','${esc(c.currency)}','${esc(c.currencyName)}','${esc(c.currencySymbol)}','${esc(c.tld)}','${esc(c.phoneCode)}','${esc(c.numericCode)}','${esc(c.nationality)}','${esc(c.region)}','${esc(c.subregion)}','${esc(c.emoji)}','${esc(c.emojiU)}','${esc(c.latitude)}','${esc(c.longitude)}',${nullable(c.areaSqKm)},${nullable(c.population)},${nullable(c.gdp)},${nullable(c.postalCodeFormat)},${nullable(c.postalCodeRegex)},'${tz}','${tr}','${esc(c.continent)}','${nb}','${lang}','${esc(c.flagUrl)}','${esc(c.drivingSide)}','${esc(c.measurementSystem)}','${esc(c.firstDayOfWeek)}','${esc(c.timeFormat)}',${nullable(c.literacy)});`
		)
	}

	// States
	const sortedStates = rawStates.sort((a, b) => a.name.localeCompare(b.name))
	console.log(`Preparing ${sortedStates.length} states...`)

	for (const s of sortedStates) {
		sql.push(
			`INSERT INTO states (country_code,country_name,iso2,iso3166_2,name,type,population,latitude,longitude,timezone,capital) VALUES ('${esc(s.countryCode)}','${esc(s.countryName)}','${esc(s.iso2)}','${esc(s.iso31662)}','${esc(s.name)}','${esc(s.type)}',${nullable(s.population)},'${esc(s.latitude)}','${esc(s.longitude)}','${esc(s.timezone)}',${nullable(s.capital)});`
		)
	}

	// Cities
	console.log(`Preparing ${rawCities.length} cities...`)

	for (const c of rawCities) {
		sql.push(
			`INSERT INTO cities (country_code,country_name,state_code,state_name,name,latitude,longitude,timezone,population) VALUES ('${esc(c.countryCode)}','${esc(c.countryName)}','${esc(c.stateCode)}','${esc(c.stateName)}','${esc(c.name)}','${esc(c.latitude)}','${esc(c.longitude)}','${esc(c.timezone)}',${nullable(c.population)});`
		)
	}

	// Timezones
	console.log(`Preparing ${rawTimezones.length} timezones...`)

	for (const t of rawTimezones) {
		const codes = esc(JSON.stringify(t.countryCodes))
		sql.push(
			`INSERT INTO timezones (timezone,country_codes,coordinates,comments) VALUES ('${esc(t.timezone)}','${codes}','${esc(t.coordinates)}','${esc(t.comments)}');`
		)
	}

	// Currencies
	console.log(`Preparing ${rawCurrencies.length} currencies...`)

	for (const cu of rawCurrencies) {
		const countries = esc(JSON.stringify(cu.countries))
		sql.push(
			`INSERT INTO currencies (code,name,symbol,decimals,countries) VALUES ('${esc(cu.code)}','${esc(cu.name)}','${esc(cu.symbol)}',${cu.decimals},'${countries}');`
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
		const countryName = countryNameMap.get(s.countryCode) ?? s.countryName
		const extra = esc(JSON.stringify({ country_name: countryName }))
		sql.push(
			`INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES ('${esc(s.name)}','state','${esc(s.countryCode)}','${esc(s.iso2)}','${extra}');`
		)
	}

	for (const c of rawCities) {
		const extra = esc(
			JSON.stringify({
				country_name: c.countryName,
				state_name: c.stateName
			})
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
		`\nDone! Loaded ${sortedCountries.length} countries, ${sortedStates.length} states, ${rawCities.length} cities, ${rawTimezones.length} timezones, ${rawCurrencies.length} currencies`
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
