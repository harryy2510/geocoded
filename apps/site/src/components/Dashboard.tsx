import { useEffect, useMemo, useState } from 'react'
import MapView, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createGeocodedClient, type Country } from '@geocoded/client'
import { formatArea, formatCompact, formatDensity, formatFull } from '../lib/format'

const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me'
const client = createGeocodedClient({ apiUrl })

type V2Paginated<T> = {
	data: T[]
	meta: {
		total: number
	}
}

type V2Metric = {
	year?: number
	value?: number | null
}

type V2Statistics = {
	countryCode: string
	countryName: string
	populationTotal?: V2Metric
	gdpCurrentUsd?: V2Metric
	gdpPerCapitaCurrentUsd?: V2Metric
	lifeExpectancy?: V2Metric
	urbanPopulationPercent?: V2Metric
}

type V2Migration = {
	countryCode: string
	countryName: string
	year?: number
	totalInternationalMigrants?: number
	migrantShareOfPopulationPercent?: number
}

type DashboardData = {
	countries: Country[]
	statistics: V2Statistics[]
	migration: V2Migration[]
	totals: Record<string, number>
}

type MetricLayer = 'population' | 'density' | 'gdp' | 'life' | 'migration'

const collectionRequests = [
	{ key: 'countries', label: 'Countries', path: '/v2/countries' },
	{ key: 'states', label: 'States', path: '/v2/states' },
	{ key: 'cities', label: 'Cities', path: '/v2/cities' },
	{ key: 'airports', label: 'Airports', path: '/v2/airports' },
	{ key: 'ports', label: 'Ports', path: '/v2/ports' },
	{ key: 'borderCrossings', label: 'Borders', path: '/v2/border-crossings' },
	{ key: 'airlines', label: 'Airlines', path: '/v2/airlines' },
	{ key: 'timezones', label: 'Timezones', path: '/v2/timezones' },
	{ key: 'currencies', label: 'Currencies', path: '/v2/currencies' },
	{ key: 'languages', label: 'Languages', path: '/v2/languages' },
]

const mapLayers: {
	key: MetricLayer
	label: string
	description: string
	color: string
}[] = [
	{
		key: 'population',
		label: 'Population',
		description: 'Country scale by resident population',
		color: '#3b82f6',
	},
	{
		key: 'density',
		label: 'Density',
		description: 'People per square kilometer',
		color: '#22c55e',
	},
	{
		key: 'gdp',
		label: 'GDP / Capita',
		description: 'Current USD per person',
		color: '#f59e0b',
	},
	{
		key: 'life',
		label: 'Life',
		description: 'Life expectancy in years',
		color: '#a855f7',
	},
	{
		key: 'migration',
		label: 'Migration',
		description: 'International migrant stock',
		color: '#06b6d4',
	},
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	notation: 'compact',
	maximumFractionDigits: 1,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
})

function joinApi(path: string): string {
	return `${apiUrl.replace(/\/$/, '')}${path}`
}

async function fetchV2List<T>(path: string): Promise<V2Paginated<T>> {
	const response = await fetch(joinApi(path))
	if (!response.ok) {
		throw new Error(`API error: ${response.status}`)
	}
	return response.json() as Promise<V2Paginated<T>>
}

async function fetchV2Total(path: string): Promise<number> {
	const separator = path.includes('?') ? '&' : '?'
	const response = await fetchV2List<{ id: string }>(
		`${path}${separator}limit=1&fields=id`
	)
	return response.meta.total
}

function numeric(value: string | number | null | undefined): number {
	if (value == null) return 0
	const parsed = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function metricValue(
	country: Country,
	layer: MetricLayer,
	statistics: Map<string, V2Statistics>,
	migration: Map<string, V2Migration>
): number {
	const stats = statistics.get(country.iso2)
	const movement = migration.get(country.iso2)
	switch (layer) {
		case 'density':
			return country.areaSqKm ? country.population / country.areaSqKm : 0
		case 'gdp':
			return stats?.gdpPerCapitaCurrentUsd?.value ?? 0
		case 'life':
			return stats?.lifeExpectancy?.value ?? 0
		case 'migration':
			return movement?.totalInternationalMigrants ?? 0
		case 'population':
		default:
			return country.population || 0
	}
}

function formatLayerValue(value: number, layer: MetricLayer): string {
	if (!value) return 'N/A'
	switch (layer) {
		case 'density':
			return `${formatCompact(value)}/km²`
		case 'gdp':
			return currencyFormatter.format(value)
		case 'life':
			return `${value.toFixed(1)} yrs`
		case 'migration':
			return formatCompact(value)
		case 'population':
		default:
			return formatCompact(value)
	}
}

function formatPercentValue(value: number | null | undefined): string {
	if (value == null) return 'N/A'
	return `${percentFormatter.format(value)}%`
}

function markerSize(value: number, max: number, layer: MetricLayer): number {
	if (!value || !max) return 7
	if (layer === 'life') {
		return 7 + Math.min(value / 90, 1) * 16
	}
	const normalized = Math.log(value + 1) / Math.log(max + 1)
	return 7 + normalized * 22
}

function sortByMetric<T>(
	items: T[],
	value: (item: T) => number,
	limit = 8
): T[] {
	return [...items].sort((a, b) => value(b) - value(a)).slice(0, limit)
}

function StatTile({
	label,
	value,
	detail,
}: {
	label: string
	value: string
	detail?: string
}) {
	return (
		<div className="border border-white/10 bg-white/[0.025] px-5 py-4">
			<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
				{label}
			</div>
			<div className="mt-4 text-3xl font-bold tracking-tighter text-white">
				{value}
			</div>
			{detail ? (
				<div className="mt-1 truncate text-xs font-medium text-white/40">{detail}</div>
			) : null}
		</div>
	)
}

function RankList({
	title,
	items,
	value,
}: {
	title: string
	items: Country[]
	value: (country: Country) => string
}) {
	return (
		<div className="border border-white/10 bg-white/[0.02]">
			<div className="border-b border-white/10 px-5 py-4">
				<h3 className="text-sm font-bold uppercase tracking-tight text-white">{title}</h3>
			</div>
			<div className="divide-y divide-white/10">
				{items.map((country, index) => (
					<div
						key={country.iso2}
						className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3"
					>
						<div className="font-mono text-xs font-bold text-white/30">
							{String(index + 1).padStart(2, '0')}
						</div>
						<div className="min-w-0">
							<div className="truncate text-sm font-semibold text-white">{country.name}</div>
							<div className="truncate text-xs text-white/35">{country.region}</div>
						</div>
						<div className="text-right text-sm font-bold text-white/70">
							{value(country)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export function Dashboard() {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<DashboardData>({
		countries: [],
		statistics: [],
		migration: [],
		totals: {},
	})
	const [activeLayer, setActiveLayer] = useState<MetricLayer>('population')
	const [selectedIso2, setSelectedIso2] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		async function loadDashboard() {
			try {
				const [
					countries,
					statistics,
					migration,
					totalEntries,
				] = await Promise.all([
					client.fetchCountries(),
					fetchV2List<V2Statistics>(
						'/v2/statistics?fields=countryCode,countryName,populationTotal,gdpCurrentUsd,gdpPerCapitaCurrentUsd,lifeExpectancy,urbanPopulationPercent&limit=500'
					),
					fetchV2List<V2Migration>(
						'/v2/migration?fields=countryCode,countryName,year,totalInternationalMigrants,migrantShareOfPopulationPercent&limit=500'
					),
					Promise.all(
						collectionRequests.map(async (item) => [
							item.key,
							await fetchV2Total(item.path),
						] as const)
					),
				])

				if (cancelled) return

				const totals = Object.fromEntries(totalEntries)
				setData({
					countries,
					statistics: statistics.data,
					migration: migration.data,
					totals,
				})
				setSelectedIso2(
					sortByMetric(countries, (country) => country.population, 1)[0]?.iso2 ?? null
				)
				setError(null)
			} catch {
				if (!cancelled) setError('Dashboard data could not be loaded.')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		void loadDashboard()

		return () => {
			cancelled = true
		}
	}, [])

	const statisticsByCountry = useMemo(() => {
		const records = new Map<string, V2Statistics>()
		for (const item of data.statistics) records.set(item.countryCode, item)
		return records
	}, [data.statistics])

	const migrationByCountry = useMemo(() => {
		const records = new Map<string, V2Migration>()
		for (const item of data.migration) records.set(item.countryCode, item)
		return records
	}, [data.migration])

	const selectedCountry = useMemo(
		() => data.countries.find((country) => country.iso2 === selectedIso2) || null,
		[data.countries, selectedIso2]
	)

	const selectedStatistics = selectedCountry
		? statisticsByCountry.get(selectedCountry.iso2)
		: null
	const selectedMigration = selectedCountry
		? migrationByCountry.get(selectedCountry.iso2)
		: null

	const maxLayerValue = useMemo(
		() =>
			Math.max(
				...data.countries.map((country) =>
					metricValue(country, activeLayer, statisticsByCountry, migrationByCountry)
				),
				0
			),
		[data.countries, activeLayer, statisticsByCountry, migrationByCountry]
	)

	const topPopulation = useMemo(
		() => sortByMetric(data.countries, (country) => country.population),
		[data.countries]
	)

	const topDensity = useMemo(
		() =>
			sortByMetric(
				data.countries.filter((country) => country.areaSqKm > 0 && country.population > 500_000),
				(country) => country.population / country.areaSqKm
			),
		[data.countries]
	)

	const topEconomy = useMemo(
		() =>
			sortByMetric(
				data.countries.filter((country) => statisticsByCountry.get(country.iso2)?.gdpPerCapitaCurrentUsd?.value),
				(country) => statisticsByCountry.get(country.iso2)?.gdpPerCapitaCurrentUsd?.value ?? 0
			),
		[data.countries, statisticsByCountry]
	)

	const topMigration = useMemo(
		() =>
			sortByMetric(
				data.countries.filter((country) => migrationByCountry.get(country.iso2)?.totalInternationalMigrants),
				(country) => migrationByCountry.get(country.iso2)?.totalInternationalMigrants ?? 0
			),
		[data.countries, migrationByCountry]
	)

	const regionRows = useMemo(() => {
		const rows = new Map<string, { name: string; countries: number; population: number }>()
		for (const country of data.countries) {
			const key = country.continent || 'Other'
			const row = rows.get(key) || { name: key, countries: 0, population: 0 }
			row.countries += 1
			row.population += country.population || 0
			rows.set(key, row)
		}
		return [...rows.values()].sort((a, b) => b.population - a.population)
	}, [data.countries])

	if (loading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="text-sm font-bold uppercase tracking-widest text-white/40">
					Loading dashboard
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="border border-white/10 bg-white/[0.02] p-8">
				<div className="text-sm font-bold uppercase tracking-widest text-white/50">
					{error}
				</div>
			</div>
		)
	}

	return (
		<div className="animate-fade-in space-y-10">
			<section className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] xl:items-end">
				<div>
					<div className="mb-5 text-xs font-bold uppercase tracking-widest text-white/35">
						Global data surface
					</div>
					<h1 className="max-w-4xl text-5xl font-bold uppercase tracking-tighter text-white md:text-7xl">
						Dashboard
					</h1>
					<p className="mt-5 max-w-2xl text-lg leading-8 text-white/50">
						Countries, demographics, migration, languages, transport, currencies, and timezones in one operational view.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-5">
					{collectionRequests.slice(0, 10).map((item) => (
						<div key={item.key} className="bg-black/80 p-4">
							<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
								{item.label}
							</div>
							<div className="mt-3 text-2xl font-bold tracking-tighter text-white">
								{formatCompact(data.totals[item.key] || 0)}
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-[minmax(0,1fr)_380px]">
				<div className="relative min-h-[720px] overflow-hidden bg-black">
					<MapView
						initialViewState={{
							longitude: 10,
							latitude: 20,
							zoom: 1.4,
						}}
						mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
						attributionControl={false}
						reuseMaps
					>
						<NavigationControl position="top-left" visualizePitch />
						<ScaleControl position="bottom-left" />
						{data.countries.map((country) => {
							const longitude = numeric(country.longitude)
							const latitude = numeric(country.latitude)
							if (!longitude && !latitude) return null

							const value = metricValue(
								country,
								activeLayer,
								statisticsByCountry,
								migrationByCountry
							)
							const size = markerSize(value, maxLayerValue, activeLayer)
							const isSelected = selectedIso2 === country.iso2
							const layer = mapLayers.find((item) => item.key === activeLayer) || mapLayers[0]

							return (
								<Marker
									key={country.iso2}
									longitude={longitude}
									latitude={latitude}
									anchor="center"
								>
									<button
										type="button"
										aria-label={`${country.name}: ${formatLayerValue(value, activeLayer)}`}
										onClick={() => setSelectedIso2(country.iso2)}
										className="block rounded-full border transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white"
										style={{
											width: size,
											height: size,
											backgroundColor: layer.color,
											borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.55)',
											boxShadow: isSelected
												? `0 0 0 5px ${layer.color}33, 0 0 34px ${layer.color}`
												: `0 0 18px ${layer.color}66`,
											opacity: isSelected ? 1 : 0.72,
										}}
									/>
								</Marker>
							)
						})}
					</MapView>

					<div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-5">
						<div className="pointer-events-auto flex flex-wrap gap-2">
							{mapLayers.map((layer) => (
								<button
									key={layer.key}
									type="button"
									onClick={() => setActiveLayer(layer.key)}
									aria-pressed={activeLayer === layer.key}
									className={`border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
										activeLayer === layer.key
											? 'border-white bg-white text-black'
											: 'border-white/15 bg-black/50 text-white/55 hover:border-white/40 hover:text-white'
									}`}
								>
									{layer.label}
								</button>
							))}
						</div>
					</div>

					<div className="pointer-events-none absolute bottom-5 right-5 z-10 max-w-sm border border-white/10 bg-black/75 p-4 backdrop-blur-xl">
						<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
							{mapLayers.find((layer) => layer.key === activeLayer)?.label}
						</div>
						<div className="mt-2 text-sm font-medium leading-6 text-white/70">
							{mapLayers.find((layer) => layer.key === activeLayer)?.description}
						</div>
					</div>
				</div>

				<aside className="bg-black/90 p-6">
					{selectedCountry ? (
						<div className="space-y-6">
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<div className="mb-3 text-5xl">{selectedCountry.emoji}</div>
									<h2 className="truncate text-4xl font-bold tracking-tighter text-white">
										{selectedCountry.name}
									</h2>
									<p className="mt-2 text-sm font-medium text-white/45">
										{selectedCountry.capital} · {selectedCountry.region}
									</p>
								</div>
								<div className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs font-bold text-white/50">
									{selectedCountry.iso2}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-px bg-white/10">
								<StatTile
									label="Population"
									value={formatCompact(selectedCountry.population)}
									detail={formatFull(selectedCountry.population)}
								/>
								<StatTile
									label="Density"
									value={formatDensity(selectedCountry.population, selectedCountry.areaSqKm)}
									detail={formatArea(selectedCountry.areaSqKm)}
								/>
								<StatTile
									label="GDP / Capita"
									value={formatLayerValue(selectedStatistics?.gdpPerCapitaCurrentUsd?.value ?? 0, 'gdp')}
									detail="current USD"
								/>
								<StatTile
									label="Life"
									value={formatLayerValue(selectedStatistics?.lifeExpectancy?.value ?? 0, 'life')}
									detail={`urban ${formatPercentValue(selectedStatistics?.urbanPopulationPercent?.value)}`}
								/>
								<StatTile
									label="Migration"
									value={formatCompact(selectedMigration?.totalInternationalMigrants ?? 0)}
									detail={formatPercentValue(selectedMigration?.migrantShareOfPopulationPercent)}
								/>
								<StatTile
									label="Currency"
									value={selectedCountry.currency}
									detail={selectedCountry.currencyName}
								/>
							</div>

							<div className="space-y-3 border-t border-white/10 pt-6">
								<div className="flex justify-between gap-4 text-sm">
									<span className="text-white/35">Languages</span>
									<span className="text-right font-semibold text-white">
										{selectedCountry.languages.length}
									</span>
								</div>
								<div className="flex justify-between gap-4 text-sm">
									<span className="text-white/35">Timezones</span>
									<span className="text-right font-semibold text-white">
										{selectedCountry.timezones.length}
									</span>
								</div>
								<div className="flex justify-between gap-4 text-sm">
									<span className="text-white/35">Neighbours</span>
									<span className="text-right font-semibold text-white">
										{selectedCountry.neighbours.length || 'none'}
									</span>
								</div>
								<div className="flex justify-between gap-4 text-sm">
									<span className="text-white/35">Driving</span>
									<span className="text-right font-semibold capitalize text-white">
										{selectedCountry.drivingSide}
									</span>
								</div>
							</div>
						</div>
					) : (
						<div className="text-sm font-bold uppercase tracking-widest text-white/40">
							Select a country
						</div>
					)}
				</aside>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-4">
				<RankList
					title="Population"
					items={topPopulation}
					value={(country) => formatCompact(country.population)}
				/>
				<RankList
					title="Density"
					items={topDensity}
					value={(country) => formatDensity(country.population, country.areaSqKm)}
				/>
				<RankList
					title="GDP / Capita"
					items={topEconomy}
					value={(country) =>
						formatLayerValue(
							statisticsByCountry.get(country.iso2)?.gdpPerCapitaCurrentUsd?.value ?? 0,
							'gdp'
						)}
				/>
				<RankList
					title="Migration"
					items={topMigration}
					value={(country) =>
						formatCompact(
							migrationByCountry.get(country.iso2)?.totalInternationalMigrants ?? 0
						)}
				/>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-[1fr_1.4fr]">
				<div className="bg-black/80 p-6">
					<div className="text-xs font-bold uppercase tracking-widest text-white/35">
						Regional weight
					</div>
					<div className="mt-6 space-y-4">
						{regionRows.map((row) => {
							const totalPopulation = regionRows.reduce(
								(sum, item) => sum + item.population,
								0
							)
							const width = totalPopulation
								? `${Math.max((row.population / totalPopulation) * 100, 2)}%`
								: '2%'
							return (
								<div key={row.name}>
									<div className="mb-2 flex items-center justify-between gap-4 text-sm">
										<span className="font-semibold text-white">{row.name}</span>
										<span className="text-white/40">
											{row.countries} countries · {formatCompact(row.population)}
										</span>
									</div>
									<div className="h-2 bg-white/10">
										<div className="h-full bg-white" style={{ width }} />
									</div>
								</div>
							)
						})}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-5">
					{collectionRequests.map((item) => (
						<div key={item.key} className="bg-black/80 p-5">
							<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
								{item.label}
							</div>
							<div className="mt-4 text-3xl font-bold tracking-tighter text-white">
								{formatCompact(data.totals[item.key] || 0)}
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	)
}
