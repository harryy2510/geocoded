import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CONTINENTS,
	capitalize,
	continentName,
	countryHref,
	formatArea,
	formatClock,
	formatCompact,
	formatFull,
	formatOffset
} from '../../lib/format'
import { useLoad } from '../../lib/use-load'
import {
	type AirportRow,
	type CityRow,
	type CountryRow,
	type CurrencyRow,
	type DataInfo,
	type PortRow,
	type StateRow,
	type TimezoneRow,
	fetchCountriesWithStats,
	fetchV2,
	fetchV2List
} from '../../lib/v2'
import { projectToMap } from '../../lib/world-dots'
import { WorldDots } from '../world-dots'

const DATASETS = [
	{ key: 'countries', label: 'Countries', count: 252 },
	{ key: 'states', label: 'States and provinces', count: 5056 },
	{ key: 'cities', label: 'Cities', count: 235669 },
	{ key: 'airports', label: 'Airports', count: 23574 },
	{ key: 'ports', label: 'Ports', count: 17500 },
	{ key: 'border-crossings', label: 'Border crossings', count: 484 },
	{ key: 'timezones', label: 'Timezones', count: 312 },
	{ key: 'currencies', label: 'Currencies', count: 178 }
] as const

type DatasetKey = (typeof DATASETS)[number]['key']
type ListKey = Exclude<DatasetKey, 'countries'>
type View = 'map' | 'table'

type Item = {
	id: string
	code: string
	name: string
	sub: string
	value: string
	lat: number | null
	lng: number | null
	facts: [string, string][]
	countryCode: string | null
}

type Sort = { label: string; value: string }

type ListConfig = {
	noun: string
	sorts: Sort[]
	load: (q: string, sort: string) => Promise<{ items: Item[]; total: number }>
}

const PAGE = 100

function coord(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null
	const n = Number(value)
	return Number.isFinite(n) ? n : null
}

function text(value: string | number | null | undefined): string {
	return value === null || value === undefined || value === ''
		? '–'
		: String(value)
}

async function loadList<T>(
	path: string,
	q: string,
	sort: string,
	map: (row: T) => Item
) {
	const page = await fetchV2List<T>(path, { q, sort, limit: PAGE })
	return { items: page.data.map(map), total: page.meta.total }
}

function portItem(row: PortRow): Item {
	return {
		id: row.id,
		code: row.unLocode,
		name: row.name,
		sub: row.countryName,
		value: row.unLocode,
		lat: coord(row.latitude),
		lng: coord(row.longitude),
		facts: [
			['Country', row.countryName],
			['UN/LOCODE', row.unLocode],
			['Status', text(row.statusName)],
			['Uses', row.functions.length ? row.functions.join(', ') : '–']
		],
		countryCode: row.countryCode
	}
}

const LISTS: Record<ListKey, ListConfig> = {
	states: {
		noun: 'states and provinces',
		sorts: [
			{ label: 'Population', value: '-population' },
			{ label: 'Name', value: 'name' }
		],
		load: (q, sort) =>
			loadList<StateRow>('/v2/states', q, sort, (row) => ({
				id: row.id,
				code: row.stateCode,
				name: row.name,
				sub: row.countryName,
				value: row.population ? formatCompact(row.population) : '',
				lat: coord(row.latitude),
				lng: coord(row.longitude),
				facts: [
					['Country', row.countryName],
					['Type', capitalize(row.type)],
					['Capital', text(row.capital)],
					['Population', formatFull(row.population)]
				],
				countryCode: row.countryCode
			}))
	},
	cities: {
		noun: 'cities',
		sorts: [
			{ label: 'Population', value: '-population' },
			{ label: 'Name', value: 'name' }
		],
		load: (q, sort) =>
			loadList<CityRow>('/v2/cities', q, sort, (row) => ({
				id: row.id ?? `${row.countryCode}-${row.name}`,
				code: row.countryCode,
				name: row.name,
				sub: row.stateName
					? `${row.stateName}, ${row.countryName}`
					: row.countryName,
				value: row.population ? formatCompact(row.population) : '',
				lat: coord(row.latitude),
				lng: coord(row.longitude),
				facts: [
					['Country', row.countryName],
					['State', text(row.stateName)],
					['Population', formatFull(row.population)],
					['Timezone', text(row.timezone)]
				],
				countryCode: row.countryCode
			}))
	},
	airports: {
		noun: 'airports',
		sorts: [{ label: 'Name', value: 'name' }],
		load: (q, sort) =>
			loadList<AirportRow>('/v2/airports', q, sort, (row) => ({
				id: row.id,
				code: row.iataCode ?? '',
				name: row.name,
				sub: row.countryName,
				value: row.iataCode ?? '',
				lat: coord(row.latitude),
				lng: coord(row.longitude),
				facts: [
					['Country', row.countryName],
					['IATA code', text(row.iataCode)],
					['Elevation', row.elevation === null ? '–' : `${row.elevation} m`],
					['Timezone', text(row.timezone)]
				],
				countryCode: row.countryCode
			}))
	},
	ports: {
		noun: 'ports',
		sorts: [{ label: 'Name', value: 'name' }],
		load: (q, sort) => loadList<PortRow>('/v2/ports', q, sort, portItem)
	},
	'border-crossings': {
		noun: 'border crossings',
		sorts: [{ label: 'Name', value: 'name' }],
		load: (q, sort) =>
			loadList<PortRow>('/v2/border-crossings', q, sort, portItem)
	},
	timezones: {
		noun: 'timezones',
		sorts: [
			{ label: 'Name', value: 'timezone' },
			{ label: 'UTC offset', value: 'standardOffset' }
		],
		load: (q, sort) =>
			loadList<TimezoneRow>('/v2/timezones', q, sort, (row) => ({
				id: row.timezone,
				code: '',
				name: row.timezone.replaceAll('_', ' '),
				sub: row.name ?? row.area,
				value: row.standardOffsetName,
				lat: coord(row.latitude),
				lng: coord(row.longitude),
				facts: [
					['Local time', formatClock(row.timezone)],
					['Standard offset', row.standardOffsetName],
					['Daylight saving', row.observesDst ? 'Observed' : 'Not observed'],
					['Countries', row.countryCodes.join(', ') || '–']
				],
				countryCode: row.countryCodes.length === 1 ? row.countryCodes[0] : null
			}))
	},
	currencies: {
		noun: 'currencies',
		sorts: [
			{ label: 'Code', value: 'code' },
			{ label: 'Name', value: 'name' }
		],
		load: (q, sort) =>
			loadList<CurrencyRow>('/v2/currencies', q, sort, (row) => ({
				id: row.code,
				code: row.code,
				name: row.name,
				sub: `Used in ${row.countries.length} ${row.countries.length === 1 ? 'country' : 'countries'}`,
				value: row.symbol,
				lat: null,
				lng: null,
				facts: [
					['Code', row.code],
					['Symbol', row.symbol],
					['Decimals', text(row.decimals)],
					['Used in', row.countries.join(', ') || '–']
				],
				countryCode: row.countries.length === 1 ? row.countries[0] : null
			}))
	}
}

const COUNTRY_SORTS: Sort[] = [
	{ label: 'Population', value: 'population' },
	{ label: 'Name', value: 'name' },
	{ label: 'Area', value: 'area' }
]

function population(country: CountryRow): number {
	return country.statistics?.populationTotal?.value ?? country.population ?? 0
}

function isDataset(value: string | null): value is DatasetKey {
	return DATASETS.some((d) => d.key === value)
}

function Flag({ country, size }: { country: CountryRow; size: 'sm' | 'lg' }) {
	if (!country.flagUrl) return null
	return (
		<img
			src={country.flagUrl}
			alt={`Flag of ${country.name}`}
			width={size === 'sm' ? 72 : 120}
			height={size === 'sm' ? 48 : 80}
			className="shrink-0 rounded-[3px] border border-rule object-cover"
			loading="lazy"
		/>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-[13px] text-ink-soft">{label}</span>
			<span className="truncate text-lg font-semibold lg:text-xl">{value}</span>
		</div>
	)
}

function CountryPanel({ country }: { country: CountryRow }) {
	const detail = useLoad(
		() =>
			fetchV2<CountryRow>(`/v2/countries/${country.iso2}`, {
				expand: 'timezones'
			}),
		[country.iso2]
	)
	const zones = detail.status === 'ready' ? (detail.data.timezones ?? []) : []
	const zone = zones[0]
	const localTime = zone
		? `${formatClock(zone.zoneName)} · ${formatOffset(zone.gmtOffset)}${zones.length > 1 ? `, ${zones.length} zones` : ''}`
		: detail.status === 'loading'
			? '…'
			: '–'
	const currency = country.currencyName
		? `${country.currencyName}${country.currencySymbol ? ` (${country.currencySymbol})` : ''}`
		: country.currency

	return (
		<>
			<Flag country={country} size="sm" />
			<div className="flex flex-col gap-1 lg:w-[200px]">
				<span className="serif text-4xl leading-none">{country.name}</span>
				<span className="text-sm text-ink-soft">
					{country.subregion ?? continentName(country.continent)}
				</span>
			</div>
			<div className="grid grow grid-cols-2 gap-5 xl:grid-cols-4">
				<Stat label="Population" value={formatCompact(population(country))} />
				<Stat label="Capital" value={text(country.capital)} />
				<Stat label="Currency" value={currency} />
				<Stat label="Local time" value={localTime} />
			</div>
			<a
				href={countryHref(country.iso2)}
				className="btn btn-dark h-11 shrink-0 px-[18px] text-sm"
			>
				Open profile
			</a>
		</>
	)
}

function ItemPanel({ item }: { item: Item }) {
	return (
		<>
			<div className="flex flex-col gap-1 lg:w-[220px]">
				<span className="serif text-3xl leading-none lg:text-4xl">
					{item.name}
				</span>
				<span className="text-sm text-ink-soft">{item.sub}</span>
			</div>
			<div className="grid grow grid-cols-2 gap-5 xl:grid-cols-4">
				{item.facts.map(([label, value]) => (
					<Stat key={label} label={label} value={value} />
				))}
			</div>
			{item.countryCode && (
				<a
					href={countryHref(item.countryCode)}
					className="btn btn-dark h-11 shrink-0 px-[18px] text-sm"
				>
					Country profile
				</a>
			)}
		</>
	)
}

export function ExploreApp() {
	const [dataset, setDataset] = useState<DatasetKey>('countries')
	const [continent, setContinent] = useState('')
	const [countrySort, setCountrySort] = useState('population')
	const [listSort, setListSort] = useState('')
	const [query, setQuery] = useState('')
	const [debounced, setDebounced] = useState('')
	const [view, setView] = useState<View>('map')
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const panelRef = useRef<HTMLElement>(null)

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const initial = params.get('dataset')
		if (isDataset(initial)) setDataset(initial)
		const cont = params.get('continent')?.toUpperCase()
		if (cont && CONTINENTS.some((c) => c.code === cont)) setContinent(cont)
		if (params.get('view') === 'table') setView('table')
	}, [])

	useEffect(() => {
		const params = new URLSearchParams()
		if (dataset !== 'countries') params.set('dataset', dataset)
		if (dataset === 'countries' && continent) params.set('continent', continent)
		if (view === 'table') params.set('view', view)
		const search = params.toString()
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${search ? `?${search}` : ''}`
		)
	}, [dataset, continent, view])

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(query.trim()), 250)
		return () => clearTimeout(timer)
	}, [query])

	const info = useLoad(() => fetchV2<DataInfo>('/v2/meta'), [])
	const countries = useLoad(() => fetchCountriesWithStats(), [])
	const listConfig = dataset === 'countries' ? null : LISTS[dataset]
	const activeListSort = listSort || listConfig?.sorts[0].value || ''
	const list = useLoad(
		() =>
			listConfig
				? listConfig.load(debounced, activeListSort)
				: Promise.resolve({ items: [], total: 0 }),
		[dataset, debounced, activeListSort]
	)

	const allCountries = countries.status === 'ready' ? countries.data : []

	const continentCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const c of allCountries) {
			counts.set(c.continent, (counts.get(c.continent) ?? 0) + 1)
		}
		return counts
	}, [allCountries])

	const shownCountries = useMemo(() => {
		const rows = continent
			? allCountries.filter((c) => c.continent === continent)
			: [...allCountries]
		if (countrySort === 'name')
			rows.sort((a, b) => a.name.localeCompare(b.name))
		else if (countrySort === 'area')
			rows.sort((a, b) => (b.areaSqKm ?? 0) - (a.areaSqKm ?? 0))
		else rows.sort((a, b) => population(b) - population(a))
		return rows
	}, [allCountries, continent, countrySort])

	const items = list.status === 'ready' ? list.data.items : []
	const selectedCountry =
		dataset === 'countries'
			? (shownCountries.find((c) => c.iso2 === selectedId) ?? shownCountries[0])
			: undefined
	const selectedItem =
		dataset === 'countries'
			? undefined
			: (items.find((i) => i.id === selectedId) ?? items[0])

	function select(id: string) {
		setSelectedId(id)
		if (window.matchMedia('(max-width: 1023px)').matches) {
			panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}

	function datasetCount(key: DatasetKey, fallback: number): number {
		if (info.status !== 'ready') return fallback
		return info.data.datasets.find((d) => d.id === key)?.records ?? fallback
	}

	const status = dataset === 'countries' ? countries.status : list.status
	const errorMessage =
		dataset === 'countries'
			? countries.status === 'error' && countries.message
			: list.status === 'error' && list.message

	const heading =
		dataset === 'countries'
			? continent
				? continentName(continent)
				: 'All countries'
			: (DATASETS.find((d) => d.key === dataset)?.label ?? '')

	const resultCount =
		dataset === 'countries'
			? `${formatFull(shownCountries.length)} ${shownCountries.length === 1 ? 'country' : 'countries'}`
			: list.status === 'ready'
				? `${formatFull(list.data.total)} ${listConfig?.noun ?? ''}${list.data.total > PAGE ? `, showing ${PAGE}` : ''}`
				: ''

	// Map marks
	const maxPop = shownCountries.reduce((m, c) => Math.max(m, population(c)), 1)
	const countryMarks = shownCountries
		.map((c) => {
			const lat = coord(c.latitude)
			const lng = coord(c.longitude)
			if (lat === null || lng === null) return null
			const [x, y] = projectToMap(lat, lng)
			return {
				id: c.iso2,
				x,
				y,
				r: Math.max(2, 30 * Math.sqrt(population(c) / maxPop))
			}
		})
		.filter((m) => m !== null)
		.sort((a, b) => b.r - a.r)
	const itemMarks = items
		.map((i) => {
			if (i.lat === null || i.lng === null) return null
			const [x, y] = projectToMap(i.lat, i.lng)
			return { id: i.id, x, y, r: 4 }
		})
		.filter((m) => m !== null)
	const selectedMark =
		dataset === 'countries'
			? countryMarks.find((m) => m.id === selectedCountry?.iso2)
			: itemMarks.find((m) => m.id === selectedItem?.id)

	return (
		<div className="flex flex-col lg:h-[calc(100vh-72px)] lg:min-h-[640px] lg:flex-row">
			<aside className="flex shrink-0 flex-col gap-[22px] border-rule bg-card px-4 pt-7 pb-6 md:px-8 lg:w-[400px] lg:border-r lg:px-7 lg:pb-0">
				<div className="flex flex-col gap-1.5">
					<h1 className="serif m-0 text-[44px] leading-none">
						Explore the data
					</h1>
					<p className="m-0 text-[15px] text-ink-soft">
						Browse every dataset on the map or as a list.
					</p>
				</div>
				<label className="flex flex-col gap-2">
					<span className="text-[13px] font-semibold">Dataset</span>
					<select
						className="field"
						value={dataset}
						onChange={(event) => {
							const next = event.target.value
							if (isDataset(next)) {
								setDataset(next)
								setListSort('')
								setQuery('')
								setSelectedId(null)
							}
						}}
					>
						{DATASETS.map((d) => (
							<option key={d.key} value={d.key}>
								{d.label} ({formatFull(datasetCount(d.key, d.count))})
							</option>
						))}
					</select>
				</label>
				{dataset === 'countries' ? (
					<fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
						<legend className="mb-2.5 text-[13px] font-semibold">
							Continent
						</legend>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								className="chip"
								aria-pressed={continent === ''}
								onClick={() => {
									setContinent('')
									setSelectedId(null)
								}}
							>
								All{' '}
								<span className="opacity-70">{allCountries.length || ''}</span>
							</button>
							{CONTINENTS.map((c) => (
								<button
									key={c.code}
									type="button"
									className="chip"
									aria-pressed={continent === c.code}
									onClick={() => {
										setContinent(c.code)
										setSelectedId(null)
									}}
								>
									{c.name}{' '}
									<span className="opacity-70">
										{continentCounts.get(c.code) ?? ''}
									</span>
								</button>
							))}
						</div>
					</fieldset>
				) : (
					<label className="flex flex-col gap-2">
						<span className="text-[13px] font-semibold">Search by name</span>
						<input
							type="search"
							className="field"
							value={query}
							placeholder={`Search ${listConfig?.noun ?? ''}`}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</label>
				)}
				<div className="flex items-center justify-between border-t border-rule pt-3">
					<span className="text-sm text-ink-soft" aria-live="polite">
						{resultCount}
					</span>
					<label className="flex items-center gap-2 text-sm">
						Sort
						<select
							className="field h-9 px-2 text-sm"
							value={dataset === 'countries' ? countrySort : activeListSort}
							onChange={(event) =>
								dataset === 'countries'
									? setCountrySort(event.target.value)
									: setListSort(event.target.value)
							}
						>
							{(listConfig?.sorts ?? COUNTRY_SORTS).map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</label>
				</div>
				<ol className="m-0 -mx-3 flex max-h-[420px] list-none flex-col overflow-y-auto p-0 lg:max-h-none lg:min-h-0 lg:grow">
					{status === 'loading' && (
						<li className="py-3 text-sm text-ink-soft">Loading…</li>
					)}
					{dataset === 'countries'
						? shownCountries.map((c) => {
								const on = c.iso2 === selectedCountry?.iso2
								return (
									<li key={c.iso2}>
										<button
											type="button"
											aria-current={on ? 'true' : undefined}
											onClick={() => select(c.iso2)}
											className={`flex w-full items-center gap-3 rounded-lg px-3 py-[11px] text-left ${on ? 'bg-signal-soft' : 'border-b border-line hover:bg-rule-soft/60'}`}
										>
											<span className="w-[26px] font-mono text-xs text-ink-soft">
												{c.iso2}
											</span>
											<span
												className={`grow text-[15px] ${on ? 'font-semibold' : 'font-medium'}`}
											>
												{c.name}
											</span>
											<span
												className={`font-mono text-[13px] ${on ? '' : 'text-ink-soft'}`}
											>
												{countrySort === 'area'
													? formatArea(c.areaSqKm)
													: formatCompact(population(c))}
											</span>
										</button>
									</li>
								)
							})
						: items.map((i) => {
								const on = i.id === selectedItem?.id
								return (
									<li key={i.id}>
										<button
											type="button"
											aria-current={on ? 'true' : undefined}
											onClick={() => select(i.id)}
											className={`flex w-full items-center gap-3 rounded-lg px-3 py-[11px] text-left ${on ? 'bg-signal-soft' : 'border-b border-line hover:bg-rule-soft/60'}`}
										>
											{i.code && (
												<span className="w-[42px] shrink-0 truncate font-mono text-xs text-ink-soft">
													{i.code}
												</span>
											)}
											<span className="flex min-w-0 grow flex-col">
												<span
													className={`truncate text-[15px] ${on ? 'font-semibold' : 'font-medium'}`}
												>
													{i.name}
												</span>
												<span className="truncate text-xs text-ink-soft">
													{i.sub}
												</span>
											</span>
											<span
												className={`shrink-0 font-mono text-[13px] ${on ? '' : 'text-ink-soft'}`}
											>
												{i.value}
											</span>
										</button>
									</li>
								)
							})}
				</ol>
			</aside>

			<div className="flex min-w-0 grow flex-col gap-[18px] overflow-y-auto px-4 py-6 md:px-8 lg:px-5">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="m-0 text-[22px] font-semibold">{heading}</h2>
						<span className="text-sm text-ink-soft">
							{dataset === 'countries'
								? 'Circles sized by population. Select a country for details.'
								: 'Each dot is one result. Select an item for details.'}
						</span>
					</div>
					<div
						role="group"
						aria-label="View"
						className="flex shrink-0 rounded-[10px] bg-rule-soft p-1"
					>
						{(['map', 'table'] as const).map((v) => (
							<button
								key={v}
								type="button"
								aria-pressed={view === v}
								onClick={() => setView(v)}
								className={`h-9 rounded-[7px] px-4 text-sm ${view === v ? 'bg-white font-semibold' : 'font-medium text-ink-soft'}`}
							>
								{v === 'map' ? 'Map' : 'Table'}
							</button>
						))}
					</div>
				</div>

				{errorMessage && (
					<p
						role="alert"
						className="m-0 rounded-lg border border-signal bg-signal-soft px-4 py-3 text-sm"
					>
						We could not load this data right now. {errorMessage}
					</p>
				)}

				{view === 'map' ? (
					<div className="relative w-full max-w-[1000px]">
						<WorldDots dot="#A9A59B" label={`Map of ${heading.toLowerCase()}`}>
							{dataset === 'countries' ? (
								<g
									fill="#1D4E89"
									fillOpacity="0.85"
									stroke="#F3F1EA"
									strokeWidth="2"
								>
									{countryMarks.map((m) => (
										<circle
											key={m.id}
											cx={m.x}
											cy={m.y}
											r={m.r}
											className="cursor-pointer"
											onClick={() => select(m.id)}
										/>
									))}
								</g>
							) : (
								<g
									fill="#1D4E89"
									fillOpacity="0.85"
									stroke="#F3F1EA"
									strokeWidth="1"
								>
									{itemMarks.map((m) => (
										<circle
											key={m.id}
											cx={m.x}
											cy={m.y}
											r={4}
											className="cursor-pointer"
											onClick={() => select(m.id)}
										/>
									))}
								</g>
							)}
							{selectedMark && (
								<circle
									cx={selectedMark.x}
									cy={selectedMark.y}
									r={dataset === 'countries' ? Math.max(6, selectedMark.r) : 8}
									fill="#C2410C"
									stroke="#14161A"
									strokeWidth="2"
								/>
							)}
						</WorldDots>
						{selectedCountry && (
							<div className="absolute top-4 right-2.5 hidden w-[190px] flex-col gap-1 rounded-[10px] bg-ink px-3.5 py-3 text-paper md:flex">
								<span className="text-[15px] font-semibold">
									{selectedCountry.name}
								</span>
								<span className="text-[13px] text-code-muted">
									{formatCompact(population(selectedCountry))} people
									{selectedCountry.capital
										? ` · ${selectedCountry.capital}`
										: ''}
								</span>
							</div>
						)}
					</div>
				) : (
					<div className="overflow-x-auto rounded-[14px] border border-rule bg-card">
						<table className="w-full border-collapse text-left text-sm">
							<thead className="border-b border-rule text-[13px] text-ink-soft">
								{dataset === 'countries' ? (
									<tr>
										<th scope="col" className="px-4 py-3 font-semibold">
											Code
										</th>
										<th scope="col" className="px-4 py-3 font-semibold">
											Country
										</th>
										<th scope="col" className="px-4 py-3 font-semibold">
											Region
										</th>
										<th scope="col" className="px-4 py-3 font-semibold">
											Capital
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-right font-semibold"
										>
											Population
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-right font-semibold"
										>
											Area
										</th>
									</tr>
								) : (
									<tr>
										<th scope="col" className="px-4 py-3 font-semibold">
											Name
										</th>
										{(items[0]?.facts ?? []).map(([label]) => (
											<th
												key={label}
												scope="col"
												className="px-4 py-3 font-semibold"
											>
												{label}
											</th>
										))}
									</tr>
								)}
							</thead>
							<tbody>
								{dataset === 'countries'
									? shownCountries.map((c) => (
											<tr key={c.iso2} className="border-b border-line">
												<td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
													{c.iso2}
												</td>
												<td className="px-4 py-2.5 font-medium">
													<a
														className="hover:text-signal"
														href={countryHref(c.iso2)}
													>
														{c.name}
													</a>
												</td>
												<td className="px-4 py-2.5 text-ink-soft">
													{c.subregion ?? '–'}
												</td>
												<td className="px-4 py-2.5">{c.capital ?? '–'}</td>
												<td className="px-4 py-2.5 text-right font-mono">
													{formatFull(population(c))}
												</td>
												<td className="px-4 py-2.5 text-right font-mono">
													{formatArea(c.areaSqKm)}
												</td>
											</tr>
										))
									: items.map((i) => (
											<tr key={i.id} className="border-b border-line">
												<td className="px-4 py-2.5 font-medium">{i.name}</td>
												{i.facts.map(([label, value]) => (
													<td key={label} className="px-4 py-2.5">
														{value}
													</td>
												))}
											</tr>
										))}
							</tbody>
						</table>
					</div>
				)}

				<section
					ref={panelRef}
					aria-label={
						dataset === 'countries' ? 'Selected country' : 'Selected item'
					}
					className="card flex flex-col gap-5 rounded-[14px] px-6 py-[22px] lg:flex-row lg:items-center lg:gap-6"
				>
					{selectedCountry && <CountryPanel country={selectedCountry} />}
					{selectedItem && <ItemPanel item={selectedItem} />}
					{!selectedCountry && !selectedItem && (
						<span className="text-sm text-ink-soft">
							{status === 'loading'
								? 'Loading…'
								: 'Nothing to show for this selection.'}
						</span>
					)}
				</section>
			</div>
		</div>
	)
}
