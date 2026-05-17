const ROOT_DIR = `${import.meta.dir}/../../..`
const API_DIR = `${ROOT_DIR}/apps/api`
const DATA_DIR = `${ROOT_DIR}/data`
const SQL_FILE = `${ROOT_DIR}/.d1-seed.sql`

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
	geonameId: number
}

type RawTimezoneEntry = {
	timezone: string
	countryCodes: string[]
	coordinates: string
	latitude: number
	longitude: number
	area: string
	location: string
	abbreviation: string
	name: string
	standardOffset: number
	standardOffsetName: string
	standardAbbreviation: string
	standardName: string
	daylightOffset: number | null
	daylightOffsetName: string | null
	daylightAbbreviation: string | null
	daylightName: string | null
	observesDst: boolean
}

type RawCurrencyEntry = {
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

type DataFile<T> = {
	filename: string
	hash: string
	records: T
}

type D1ExecuteResult<T> = {
	results?: T[]
	success: boolean
	error?: string
}

type HashRow = {
	key: string | number
	source_hash: string | null
}

type SqlValue = string | number | null

type SearchEntry = {
	name: string
	type: 'country' | 'state' | 'city'
	countryCode: string
	stateCode: string
	extra: string
}

type SourceRow = {
	key: string
	hash: string
	sql: string
	search?: SearchEntry
}

type ProcessResult = {
	upserts: string[]
	deletes: string[]
	fileMarker: string | null
	inserted: number
	updated: number
	deleted: number
	skipped: boolean
}

type ProcessOptions = {
	label: string
	file: DataFile<unknown>
	force: boolean
	target: string
	seedFiles: Map<string, string>
	sourceCount: number
	buildRows: () => SourceRow[]
	hashQuery: string
	fetchSearchRows?: (
		target: string,
		keys: string[]
	) => Promise<Map<string, SearchEntry>>
	deleteSql: (key: string) => string
}

function esc(s: string | null | undefined): string {
	return (s ?? '').replace(/'/g, "''")
}

function sqlValue(v: SqlValue): string {
	if (v === null) return 'NULL'
	if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
	return `'${esc(v)}'`
}

function sha256(value: string): string {
	const hasher = new Bun.CryptoHasher('sha256')
	hasher.update(value)
	return hasher.digest('hex')
}

function hashValues(values: SqlValue[]): string {
	return sha256(JSON.stringify(values))
}

function shortHash(hash: string): string {
	return hash.slice(0, 12)
}

function json(value: unknown): string {
	return JSON.stringify(value)
}

function stateKey(countryCode: string, stateCode: string): string {
	return `${countryCode}:${stateCode}`
}

function chunk<T>(values: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < values.length; i += size) {
		chunks.push(values.slice(i, i + size))
	}
	return chunks
}

function assertUniqueRow(map: Map<string, SourceRow>, row: SourceRow): void {
	if (map.has(row.key)) {
		throw new Error(`Duplicate source key while seeding: ${row.key}`)
	}
	map.set(row.key, row)
}

function upsertSql(
	table: string,
	columns: string[],
	values: SqlValue[],
	conflictTarget: string,
	updateColumns: string[]
): string {
	const assignments = updateColumns
		.map((column) => `${column}=excluded.${column}`)
		.join(',')
	return `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.map(sqlValue).join(',')}) ON CONFLICT${conflictTarget} DO UPDATE SET ${assignments};`
}

function seedFileSql(file: DataFile<unknown>): string {
	return `INSERT INTO seed_files (filename,source_hash,applied_at) VALUES (${sqlValue(file.filename)},${sqlValue(file.hash)},CURRENT_TIMESTAMP) ON CONFLICT(filename) DO UPDATE SET source_hash=excluded.source_hash,applied_at=CURRENT_TIMESTAMP;`
}

function sameSearchEntry(a: SearchEntry, b: SearchEntry): boolean {
	return (
		a.name === b.name &&
		a.type === b.type &&
		a.countryCode === b.countryCode &&
		a.stateCode === b.stateCode &&
		a.extra === b.extra
	)
}

function insertSearchSql(entry: SearchEntry): string {
	return `INSERT INTO search_index (name,type,country_code,state_code,extra) VALUES (${sqlValue(entry.name)},${sqlValue(entry.type)},${sqlValue(entry.countryCode)},${sqlValue(entry.stateCode)},${sqlValue(entry.extra)});`
}

function deleteSearchSql(entry: SearchEntry): string {
	return `DELETE FROM search_index WHERE name = ${sqlValue(entry.name)} AND type = ${sqlValue(entry.type)} AND country_code = ${sqlValue(entry.countryCode)} AND state_code = ${sqlValue(entry.stateCode)} AND extra = ${sqlValue(entry.extra)};`
}

function appendSearchRefresh(
	sql: string[],
	oldEntry: SearchEntry | undefined,
	newEntry: SearchEntry
): void {
	if (oldEntry && sameSearchEntry(oldEntry, newEntry)) return
	if (oldEntry) sql.push(deleteSearchSql(oldEntry))
	sql.push(deleteSearchSql(newEntry))
	sql.push(insertSearchSql(newEntry))
}

function countrySearchFromRaw(country: RawCountry): SearchEntry {
	return {
		name: country.name,
		type: 'country',
		countryCode: country.iso2,
		stateCode: '',
		extra: json({ country_name: country.name })
	}
}

function stateSearchFromRaw(state: RawState, countryName: string): SearchEntry {
	return {
		name: state.name,
		type: 'state',
		countryCode: state.countryCode,
		stateCode: state.iso2,
		extra: json({ country_name: countryName })
	}
}

function citySearchFromRaw(city: RawCity): SearchEntry {
	return {
		name: city.name,
		type: 'city',
		countryCode: city.countryCode,
		stateCode: city.stateCode,
		extra: json({
			country_name: city.countryName,
			geoname_id: city.geonameId,
			state_name: city.stateName
		})
	}
}

function countryRow(country: RawCountry): SourceRow {
	const columns = [
		'iso2',
		'iso3',
		'name',
		'native',
		'capital',
		'currency',
		'currency_name',
		'currency_symbol',
		'tld',
		'phone_code',
		'numeric_code',
		'nationality',
		'region',
		'subregion',
		'emoji',
		'emoji_u',
		'latitude',
		'longitude',
		'area_sq_km',
		'population',
		'gdp',
		'postal_code_format',
		'postal_code_regex',
		'timezones',
		'translations',
		'continent',
		'neighbours',
		'languages',
		'flag_url',
		'driving_side',
		'measurement_system',
		'first_day_of_week',
		'time_format',
		'literacy',
		'source_hash'
	]
	const values = [
		country.iso2,
		country.iso3,
		country.name,
		country.native,
		country.capital,
		country.currency,
		country.currencyName,
		country.currencySymbol,
		country.tld,
		country.phoneCode,
		country.numericCode,
		country.nationality,
		country.region,
		country.subregion,
		country.emoji,
		country.emojiU,
		country.latitude,
		country.longitude,
		country.areaSqKm,
		country.population,
		country.gdp,
		country.postalCodeFormat,
		country.postalCodeRegex,
		json(country.timezones),
		json(country.translations),
		country.continent,
		json(country.neighbours),
		json(country.languages),
		country.flagUrl,
		country.drivingSide,
		country.measurementSystem,
		country.firstDayOfWeek,
		country.timeFormat,
		country.literacy
	] satisfies SqlValue[]
	const hash = hashValues(values)
	return {
		key: country.iso2,
		hash,
		sql: upsertSql('countries', columns, [...values, hash], '(iso2)', [
			'iso3',
			'name',
			'native',
			'capital',
			'currency',
			'currency_name',
			'currency_symbol',
			'tld',
			'phone_code',
			'numeric_code',
			'nationality',
			'region',
			'subregion',
			'emoji',
			'emoji_u',
			'latitude',
			'longitude',
			'area_sq_km',
			'population',
			'gdp',
			'postal_code_format',
			'postal_code_regex',
			'timezones',
			'translations',
			'continent',
			'neighbours',
			'languages',
			'flag_url',
			'driving_side',
			'measurement_system',
			'first_day_of_week',
			'time_format',
			'literacy',
			'source_hash'
		]),
		search: countrySearchFromRaw(country)
	}
}

function stateRow(state: RawState, countryName: string): SourceRow {
	const columns = [
		'country_code',
		'country_name',
		'iso2',
		'iso3166_2',
		'name',
		'type',
		'population',
		'latitude',
		'longitude',
		'timezone',
		'capital',
		'source_hash'
	]
	const values = [
		state.countryCode,
		state.countryName,
		state.iso2,
		state.iso31662,
		state.name,
		state.type,
		state.population,
		state.latitude,
		state.longitude,
		state.timezone,
		state.capital
	] satisfies SqlValue[]
	const hash = hashValues(values)
	return {
		key: stateKey(state.countryCode, state.iso2),
		hash,
		sql: upsertSql(
			'states',
			columns,
			[...values, hash],
			'(country_code,iso2)',
			[
				'country_name',
				'iso3166_2',
				'name',
				'type',
				'population',
				'latitude',
				'longitude',
				'timezone',
				'capital',
				'source_hash'
			]
		),
		search: stateSearchFromRaw(state, countryName)
	}
}

function cityRow(city: RawCity): SourceRow {
	const columns = [
		'country_code',
		'country_name',
		'state_code',
		'state_name',
		'name',
		'latitude',
		'longitude',
		'timezone',
		'population',
		'geoname_id',
		'source_hash'
	]
	const values = [
		city.countryCode,
		city.countryName,
		city.stateCode,
		city.stateName,
		city.name,
		city.latitude,
		city.longitude,
		city.timezone,
		city.population,
		city.geonameId
	] satisfies SqlValue[]
	const hash = hashValues(values)
	return {
		key: String(city.geonameId),
		hash,
		sql: upsertSql(
			'cities',
			columns,
			[...values, hash],
			'(geoname_id) WHERE geoname_id IS NOT NULL',
			[
				'country_code',
				'country_name',
				'state_code',
				'state_name',
				'name',
				'latitude',
				'longitude',
				'timezone',
				'population',
				'source_hash'
			]
		),
		search: citySearchFromRaw(city)
	}
}

function timezoneRow(timezone: RawTimezoneEntry): SourceRow {
	const columns = [
		'timezone',
		'country_codes',
		'coordinates',
		'latitude',
		'longitude',
		'area',
		'location',
		'abbreviation',
		'name',
		'standard_offset',
		'standard_offset_name',
		'standard_abbreviation',
		'standard_name',
		'daylight_offset',
		'daylight_offset_name',
		'daylight_abbreviation',
		'daylight_name',
		'observes_dst',
		'source_hash'
	]
	const values = [
		timezone.timezone,
		json(timezone.countryCodes),
		timezone.coordinates,
		timezone.latitude,
		timezone.longitude,
		timezone.area,
		timezone.location,
		timezone.abbreviation,
		timezone.name,
		timezone.standardOffset,
		timezone.standardOffsetName,
		timezone.standardAbbreviation,
		timezone.standardName,
		timezone.daylightOffset,
		timezone.daylightOffsetName,
		timezone.daylightAbbreviation,
		timezone.daylightName,
		timezone.observesDst ? 1 : 0
	] satisfies SqlValue[]
	const hash = hashValues(values)
	return {
		key: timezone.timezone,
		hash,
		sql: upsertSql('timezones', columns, [...values, hash], '(timezone)', [
			'country_codes',
			'coordinates',
			'latitude',
			'longitude',
			'area',
			'location',
			'abbreviation',
			'name',
			'standard_offset',
			'standard_offset_name',
			'standard_abbreviation',
			'standard_name',
			'daylight_offset',
			'daylight_offset_name',
			'daylight_abbreviation',
			'daylight_name',
			'observes_dst',
			'source_hash'
		])
	}
}

function currencyRow(currency: RawCurrencyEntry): SourceRow {
	const columns = [
		'code',
		'name',
		'symbol',
		'decimals',
		'countries',
		'source_hash'
	]
	const values = [
		currency.code,
		currency.name,
		currency.symbol,
		currency.decimals,
		json(currency.countries)
	] satisfies SqlValue[]
	const hash = hashValues(values)
	return {
		key: currency.code,
		hash,
		sql: upsertSql('currencies', columns, [...values, hash], '(code)', [
			'name',
			'symbol',
			'decimals',
			'countries',
			'source_hash'
		])
	}
}

async function readDataFile<T>(filename: string): Promise<DataFile<T>> {
	const raw = await Bun.file(`${DATA_DIR}/${filename}`).text()
	return {
		filename,
		hash: sha256(raw),
		records: JSON.parse(raw) as T
	}
}

async function wrangler(args: string[]): Promise<void> {
	const proc = Bun.spawn(['bun', 'wrangler', ...args], {
		cwd: API_DIR,
		stdout: 'inherit',
		stderr: 'inherit'
	})
	const code = await proc.exited
	if (code !== 0)
		throw new Error(`wrangler ${args.join(' ')} failed (exit ${code})`)
}

async function wranglerOutput(args: string[]): Promise<string> {
	const proc = Bun.spawn(['bun', 'wrangler', ...args], {
		cwd: API_DIR,
		stdout: 'pipe',
		stderr: 'inherit'
	})
	const stdout = proc.stdout ? await new Response(proc.stdout).text() : ''
	const code = await proc.exited
	if (code !== 0)
		throw new Error(`wrangler ${args.join(' ')} failed (exit ${code})`)
	return stdout.trim()
}

async function d1Query<T>(target: string, command: string): Promise<T[]> {
	const output = await wranglerOutput([
		'd1',
		'execute',
		'geo-db',
		target,
		'--command',
		command,
		'--json'
	])
	const parsed = JSON.parse(output) as D1ExecuteResult<T>[] | D1ExecuteResult<T>
	const result = Array.isArray(parsed) ? parsed[0] : parsed
	if (!result?.success) {
		throw new Error(result?.error ?? `D1 query failed: ${command}`)
	}
	return result.results ?? []
}

async function readSeedFileHashes(
	target: string
): Promise<Map<string, string>> {
	const rows = await d1Query<HashRow>(
		target,
		'SELECT filename AS key, source_hash FROM seed_files'
	)
	return new Map(rows.map((row) => [String(row.key), row.source_hash ?? '']))
}

async function readExistingHashes(
	target: string,
	command: string
): Promise<Map<string, string>> {
	const rows = await d1Query<HashRow>(target, command)
	return new Map(rows.map((row) => [String(row.key), row.source_hash ?? '']))
}

async function fetchCountrySearchRows(
	target: string,
	keys: string[]
): Promise<Map<string, SearchEntry>> {
	const rows: Array<{ iso2: string; name: string }> = []
	for (const keyChunk of chunk(keys, 500)) {
		rows.push(
			...(await d1Query<{ iso2: string; name: string }>(
				target,
				`SELECT iso2,name FROM countries WHERE iso2 IN (${keyChunk.map(sqlValue).join(',')})`
			))
		)
	}
	return new Map(
		rows.map((row) => [
			row.iso2,
			{
				name: row.name,
				type: 'country',
				countryCode: row.iso2,
				stateCode: '',
				extra: json({ country_name: row.name })
			}
		])
	)
}

async function fetchStateSearchRows(
	target: string,
	keys: string[]
): Promise<Map<string, SearchEntry>> {
	const rows: Array<{
		country_code: string
		country_name: string
		iso2: string
		name: string
	}> = []
	for (const keyChunk of chunk(keys, 500)) {
		rows.push(
			...(await d1Query<{
				country_code: string
				country_name: string
				iso2: string
				name: string
			}>(
				target,
				`SELECT states.country_code,COALESCE(countries.name, states.country_name) AS country_name,states.iso2,states.name FROM states LEFT JOIN countries ON countries.iso2 = states.country_code WHERE states.country_code || ':' || states.iso2 IN (${keyChunk.map(sqlValue).join(',')})`
			))
		)
	}
	return new Map(
		rows.map((row) => [
			stateKey(row.country_code, row.iso2),
			{
				name: row.name,
				type: 'state',
				countryCode: row.country_code,
				stateCode: row.iso2,
				extra: json({ country_name: row.country_name })
			}
		])
	)
}

async function fetchCitySearchRows(
	target: string,
	keys: string[]
): Promise<Map<string, SearchEntry>> {
	const rows: Array<{
		geoname_id: number
		country_code: string
		country_name: string
		state_code: string
		state_name: string
		name: string
	}> = []
	const keyChunks = chunk(keys, 500)
	for (const [index, keyChunk] of keyChunks.entries()) {
		if (
			keyChunks.length > 20 &&
			(index === 0 || (index + 1) % 50 === 0 || index + 1 === keyChunks.length)
		) {
			console.log(
				`    FTS city lookup chunk ${index + 1}/${keyChunks.length}...`
			)
		}
		const ids = keyChunk
			.map((key) => Number(key))
			.filter((key) => Number.isFinite(key))
		if (ids.length === 0) continue
		rows.push(
			...(await d1Query<{
				geoname_id: number
				country_code: string
				country_name: string
				state_code: string
				state_name: string
				name: string
			}>(
				target,
				`SELECT geoname_id,country_code,country_name,state_code,state_name,name FROM cities WHERE geoname_id IN (${ids.join(',')})`
			))
		)
	}
	return new Map(
		rows.map((row) => [
			String(row.geoname_id),
			{
				name: row.name,
				type: 'city',
				countryCode: row.country_code,
				stateCode: row.state_code,
				extra: json({
					country_name: row.country_name,
					geoname_id: row.geoname_id,
					state_name: row.state_name
				})
			}
		])
	)
}

async function processRows(options: ProcessOptions): Promise<ProcessResult> {
	const {
		label,
		file,
		force,
		target,
		seedFiles,
		sourceCount,
		buildRows,
		hashQuery,
		fetchSearchRows,
		deleteSql
	} = options

	const previousFileHash = seedFiles.get(file.filename)
	if (!force && previousFileHash === file.hash) {
		console.log(
			`Skipping ${label}; ${file.filename} is unchanged (${shortHash(file.hash)}).`
		)
		return {
			upserts: [],
			deletes: [],
			fileMarker: null,
			inserted: 0,
			updated: 0,
			deleted: 0,
			skipped: true
		}
	}

	if (force) {
		console.log(`Planning ${label}; --force was provided.`)
	} else if (previousFileHash) {
		console.log(
			`Planning ${label}; ${file.filename} changed (${shortHash(previousFileHash)} -> ${shortHash(file.hash)}).`
		)
	} else {
		console.log(
			`Planning ${label}; ${file.filename} has no prior seed marker (${shortHash(file.hash)}).`
		)
	}

	console.log(`  Building source hashes for ${sourceCount} row(s)...`)
	const rows = buildRows()

	const desired = new Map<string, SourceRow>()
	for (const row of rows) assertUniqueRow(desired, row)

	console.log(`  Reading D1 keys and stored hashes for ${label}...`)
	const existing = await readExistingHashes(target, hashQuery)
	console.log(
		`  Comparing ${desired.size} source row(s) with ${existing.size} D1 row(s)...`
	)

	const changedKeys: string[] = []
	const deletedKeys: string[] = []
	let inserted = 0
	let updated = 0

	for (const row of desired.values()) {
		const existingHash = existing.get(row.key)
		if (existingHash === row.hash) continue
		changedKeys.push(row.key)
		if (existingHash === undefined) inserted++
		else updated++
	}

	for (const key of existing.keys()) {
		if (!desired.has(key)) deletedKeys.push(key)
	}

	const affectedSearchKeys = changedKeys.length + deletedKeys.length
	if (fetchSearchRows && affectedSearchKeys > 0) {
		console.log(
			`  Reading existing FTS row data for ${affectedSearchKeys} affected key(s)...`
		)
	}
	const searchRows = fetchSearchRows
		? await fetchSearchRows(target, [...changedKeys, ...deletedKeys])
		: new Map<string, SearchEntry>()
	if (fetchSearchRows && affectedSearchKeys > 0) {
		console.log(
			`  Loaded ${searchRows.size} existing FTS row(s) for ${affectedSearchKeys} affected key(s).`
		)
	}

	const upserts: string[] = []
	const deletes: string[] = []

	for (const key of changedKeys) {
		const row = desired.get(key)
		if (!row) continue
		if (row.search) {
			appendSearchRefresh(upserts, searchRows.get(key), row.search)
		}
		upserts.push(row.sql)
	}

	for (const key of deletedKeys) {
		const oldSearch = searchRows.get(key)
		if (oldSearch) deletes.push(deleteSearchSql(oldSearch))
		deletes.push(deleteSql(key))
	}

	console.log(
		`  Planned ${inserted} insert(s), ${updated} update(s), ${deletedKeys.length} delete(s), ${upserts.length + deletes.length} SQL statement(s).`
	)

	return {
		upserts,
		deletes,
		fileMarker: seedFileSql(file),
		inserted,
		updated,
		deleted: deletedKeys.length,
		skipped: false
	}
}

async function purgeCache(
	isRemote: boolean,
	shouldPurge: boolean
): Promise<void> {
	if (!isRemote || !shouldPurge) return

	const cfToken = process.env.CLOUDFLARE_API_TOKEN
	const cacheZone = process.env.CACHE_ZONE
	if (!cfToken) {
		console.log(
			'\nWarning: CLOUDFLARE_API_TOKEN not set, skipping cache purge.'
		)
		return
	}
	if (!cacheZone) {
		console.log('\nWarning: CACHE_ZONE not set, skipping cache purge.')
		return
	}

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
		return
	}

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

async function main() {
	const isRemote = process.argv.includes('--remote')
	const force = process.argv.includes('--force')
	const target = isRemote ? '--remote' : '--local'

	console.log(`\nApplying migrations (${isRemote ? 'remote' : 'local'})...`)
	await wrangler(['d1', 'migrations', 'apply', 'geo-db', target])

	console.log('\nReading data files...')
	const [countriesFile, statesFile, citiesFile, timezonesFile, currenciesFile] =
		await Promise.all([
			readDataFile<RawCountry[]>('countries.json'),
			readDataFile<RawState[]>('states.json'),
			readDataFile<RawCity[]>('cities.json'),
			readDataFile<RawTimezoneEntry[]>('timezones.json'),
			readDataFile<RawCurrencyEntry[]>('currencies.json')
		])

	console.log(
		`Loaded source rows: ${countriesFile.records.length} countries, ${statesFile.records.length} states, ${citiesFile.records.length} cities, ${timezonesFile.records.length} timezones, ${currenciesFile.records.length} currencies.`
	)
	console.log('Reading D1 seed file markers...')
	const seedFiles = await readSeedFileHashes(target)
	console.log(`Loaded ${seedFiles.size} seed file marker(s).`)

	const sortedCountries = countriesFile.records.sort((a, b) =>
		a.name.localeCompare(b.name)
	)
	const sortedStates = statesFile.records.sort((a, b) =>
		a.name.localeCompare(b.name)
	)
	const sortedCities = citiesFile.records.sort((a, b) => {
		const country = a.countryCode.localeCompare(b.countryCode)
		if (country !== 0) return country
		const state = a.stateCode.localeCompare(b.stateCode)
		if (state !== 0) return state
		return a.name.localeCompare(b.name) || a.geonameId - b.geonameId
	})
	const sortedTimezones = timezonesFile.records.sort((a, b) =>
		a.timezone.localeCompare(b.timezone)
	)
	const sortedCurrencies = currenciesFile.records.sort((a, b) =>
		a.code.localeCompare(b.code)
	)
	const countryNameMap = new Map(
		sortedCountries.map((country) => [country.iso2, country.name])
	)

	const countries = await processRows({
		label: 'countries',
		file: countriesFile,
		force,
		target,
		seedFiles,
		sourceCount: sortedCountries.length,
		buildRows: () => sortedCountries.map(countryRow),
		hashQuery: 'SELECT iso2 AS key, source_hash FROM countries',
		fetchSearchRows: fetchCountrySearchRows,
		deleteSql: (key) => `DELETE FROM countries WHERE iso2 = ${sqlValue(key)};`
	})

	const states = await processRows({
		label: 'states',
		file: statesFile,
		force,
		target,
		seedFiles,
		sourceCount: sortedStates.length,
		buildRows: () =>
			sortedStates.map((state) =>
				stateRow(
					state,
					countryNameMap.get(state.countryCode) ?? state.countryName
				)
			),
		hashQuery:
			"SELECT country_code || ':' || iso2 AS key, source_hash FROM states",
		fetchSearchRows: fetchStateSearchRows,
		deleteSql: (key) => {
			const [countryCode, stateCode] = key.split(':')
			return `DELETE FROM states WHERE country_code = ${sqlValue(countryCode ?? '')} AND iso2 = ${sqlValue(stateCode ?? '')};`
		}
	})

	const cities = await processRows({
		label: 'cities',
		file: citiesFile,
		force,
		target,
		seedFiles,
		sourceCount: sortedCities.length,
		buildRows: () => sortedCities.map(cityRow),
		hashQuery:
			'SELECT CAST(geoname_id AS TEXT) AS key, source_hash FROM cities WHERE geoname_id IS NOT NULL',
		fetchSearchRows: fetchCitySearchRows,
		deleteSql: (key) => `DELETE FROM cities WHERE geoname_id = ${Number(key)};`
	})

	const timezones = await processRows({
		label: 'timezones',
		file: timezonesFile,
		force,
		target,
		seedFiles,
		sourceCount: sortedTimezones.length,
		buildRows: () => sortedTimezones.map(timezoneRow),
		hashQuery: 'SELECT timezone AS key, source_hash FROM timezones',
		deleteSql: (key) =>
			`DELETE FROM timezones WHERE timezone = ${sqlValue(key)};`
	})

	const currencies = await processRows({
		label: 'currencies',
		file: currenciesFile,
		force,
		target,
		seedFiles,
		sourceCount: sortedCurrencies.length,
		buildRows: () => sortedCurrencies.map(currencyRow),
		hashQuery: 'SELECT code AS key, source_hash FROM currencies',
		deleteSql: (key) => `DELETE FROM currencies WHERE code = ${sqlValue(key)};`
	})

	const processed = [countries, states, cities, timezones, currencies]
	const sql = [
		...countries.upserts,
		...states.upserts,
		...cities.upserts,
		...timezones.upserts,
		...currencies.upserts,
		...cities.deletes,
		...states.deletes,
		...countries.deletes,
		...timezones.deletes,
		...currencies.deletes,
		...processed.flatMap((result) => result.fileMarker ?? [])
	]

	const changedRows = processed.reduce(
		(total, result) =>
			total + result.inserted + result.updated + result.deleted,
		0
	)

	if (sql.length === 0) {
		console.log('\nD1 already matches the source JSON files.')
		await purgeCache(isRemote, false)
		return
	}

	if (!isRemote) {
		sql.unshift('BEGIN TRANSACTION;')
		sql.push('COMMIT;')
	}

	console.log(`\nWriting ${sql.length} SQL statements...`)
	await Bun.write(SQL_FILE, sql.join('\n'))

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
		`\nDone! Applied ${changedRows} source row change(s) from ${processed.filter((result) => !result.skipped).length} changed file(s).`
	)

	await purgeCache(isRemote, changedRows > 0)
}

main()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() =>
		Bun.file(SQL_FILE)
			.delete()
			.catch(() => {})
	)
