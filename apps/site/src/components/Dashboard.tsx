import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
	fetchCountriesWithStats,
	fetchV2All,
	fetchV2List,
	type ContinentRow,
	type CountryRow,
	type CurrencyRow,
	type StatisticsRow,
	type TimezoneRow,
} from '../lib/v2'
import { formatCompact, formatFull } from '../lib/format'
import { continentColor, continentName } from './charts/nivoTheme'
import { TopPopulationBar, PopulationTreemap } from './charts/nivo/PopulationCharts'
import { GdpVsPopulationScatter, CurrencyUsageBar } from './charts/nivo/EconomyCharts'
import {
	PopulationDotMap,
	ContinentSharePie,
	type CityPoint,
} from './charts/nivo/GeographyCharts'
import { AgeStructureRadial } from './charts/nivo/DemographicsCharts'
import { OffsetDistributionBar } from './charts/nivo/TimezoneCharts'

// ---------------------------------------------------------------------------
// Hero stat tiles — counts per collection via meta.total (fetch each limit=1).
// ---------------------------------------------------------------------------

type CollectionTile = {
	key: string
	label: string
	path: string
}

const collectionTiles: CollectionTile[] = [
	{ key: 'countries', label: 'Countries', path: '/v2/countries' },
	{ key: 'states', label: 'States', path: '/v2/states' },
	{ key: 'cities', label: 'Cities', path: '/v2/cities' },
	{ key: 'airports', label: 'Airports', path: '/v2/airports' },
	{ key: 'airlines', label: 'Airlines', path: '/v2/airlines' },
	{ key: 'ports', label: 'Ports', path: '/v2/ports' },
	{ key: 'borderCrossings', label: 'Borders', path: '/v2/border-crossings' },
	{ key: 'languages', label: 'Languages', path: '/v2/languages' },
	{ key: 'currencies', label: 'Currencies', path: '/v2/currencies' },
	{ key: 'timezones', label: 'Timezones', path: '/v2/timezones' },
]

async function fetchTotal(path: string): Promise<number> {
	const response = await fetchV2List<{ id: string }>(path, { limit: 1, fields: 'id' })
	return response.meta.total
}

// ---------------------------------------------------------------------------
// Flag emoji from ISO2 via regional-indicator letters (v2 countries lack emoji).
// ---------------------------------------------------------------------------

function flagEmoji(iso2: string): string {
	if (!iso2 || iso2.length !== 2) return ''
	const base = 0x1f1e6
	const upper = iso2.toUpperCase()
	const a = upper.codePointAt(0)
	const b = upper.codePointAt(1)
	if (a == null || b == null) return ''
	return String.fromCodePoint(base + (a - 65), base + (b - 65))
}

// ---------------------------------------------------------------------------
// UI primitives.
// ---------------------------------------------------------------------------

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-black/80 p-4 sm:p-5">
			<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</div>
			<div className="mt-3 text-2xl font-bold tracking-tighter text-white sm:text-3xl">{value}</div>
		</div>
	)
}

function ChartPanel({
	title,
	caption,
	children,
}: {
	title: string
	caption: string
	children: ReactNode
}) {
	return (
		<div className="bg-black/80 p-6">
			<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">{title}</div>
			<div className="mt-1 text-sm font-medium text-white/45">{caption}</div>
			<div className="mt-6">{children}</div>
		</div>
	)
}

type QuickFact = {
	label: string
	value: string
	detail: string
}

function QuickFactCard({ fact }: { fact: QuickFact }) {
	return (
		<div className="bg-black/80 p-5">
			<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">{fact.label}</div>
			<div className="mt-3 truncate text-lg font-bold tracking-tight text-white">{fact.value}</div>
			<div className="mt-1 truncate text-xs font-medium text-white/40">{fact.detail}</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Dashboard — v2-only curated front door. Comparison only, no per-country picker.
// ---------------------------------------------------------------------------

export function Dashboard() {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [totals, setTotals] = useState<Record<string, number>>({})
	const [countries, setCountries] = useState<CountryRow[]>([])
	const [continents, setContinents] = useState<ContinentRow[]>([])
	const [currencies, setCurrencies] = useState<CurrencyRow[]>([])
	const [timezones, setTimezones] = useState<TimezoneRow[]>([])
	const [cities, setCities] = useState<CityPoint[]>([])

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const [totalEntries, countryRows, continentRows, currencyRows, timezoneRows, cityRows] =
					await Promise.all([
						Promise.all(
							collectionTiles.map(
								async (tile) => [tile.key, await fetchTotal(tile.path).catch(() => 0)] as const
							)
						),
						fetchCountriesWithStats(300),
						fetchV2All<ContinentRow>('/v2/continents', 50),
						fetchV2All<CurrencyRow>('/v2/currencies', 300),
						fetchV2All<TimezoneRow>('/v2/timezones', 500),
						fetchV2All<CityPoint>('/v2/cities', 2000, {
							sort: '-population',
							fields: 'name,countryName,countryCode,latitude,longitude,population',
						}),
					])

				if (cancelled) return

				setTotals(Object.fromEntries(totalEntries))
				setCountries(countryRows)
				setContinents(continentRows)
				setCurrencies(currencyRows)
				setTimezones(timezoneRows)
				setCities(cityRows)
				setError(null)
			} catch {
				if (!cancelled) setError('Dashboard data could not be loaded.')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [])

	// Statistics rows extracted from expanded country data for stat-based charts.
	const statistics = useMemo<StatisticsRow[]>(() => {
		return countries
			.map((country) => country.statistics)
			.filter((stats): stats is StatisticsRow => stats != null)
	}, [countries])

	// iso2 → continent code, so the map can color each city by its continent.
	const continentByCountry = useMemo(
		() => new Map(countries.map((c) => [c.iso2.toUpperCase(), c.continent])),
		[countries]
	)

	const quickFacts = useMemo<QuickFact[]>(() => {
		if (countries.length === 0) return []

		const ranked = [...countries].filter((country) => country.population > 0)
		const mostPopulous = [...ranked].sort((a, b) => b.population - a.population)[0]

		// Most populous continent by aggregate country population.
		const continentPopulation = new Map<string, number>()
		for (const country of countries) {
			continentPopulation.set(
				country.continent,
				(continentPopulation.get(country.continent) ?? 0) + (country.population || 0)
			)
		}
		const topContinent = [...continentPopulation.entries()].sort((a, b) => b[1] - a[1])[0]

		// Most timezones for a single country (timezone countryCodes membership).
		const timezoneCounts = new Map<string, number>()
		for (const zone of timezones) {
			for (const code of zone.countryCodes ?? []) {
				timezoneCounts.set(code, (timezoneCounts.get(code) ?? 0) + 1)
			}
		}
		const nameByIso2 = new Map(countries.map((country) => [country.iso2, country]))
		const topTimezoneCountry = [...timezoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]
		const topTimezoneRow = topTimezoneCountry ? nameByIso2.get(topTimezoneCountry[0]) : undefined

		// Most widely used currency by number of countries.
		const topCurrency = [...currencies]
			.map((currency) => ({ currency, count: currency.countries?.length ?? 0 }))
			.sort((a, b) => b.count - a.count)[0]

		// Single timezone shared by the most countries.
		const topSharedZone = [...timezones]
			.map((zone) => ({ zone, count: zone.countryCodes?.length ?? 0 }))
			.sort((a, b) => b.count - a.count)[0]

		// Highest GDP per capita from inline statistics.
		const richest = [...countries]
			.map((country) => ({
				country,
				value: country.statistics?.gdpPerCapitaCurrentUsd?.value ?? 0,
			}))
			.filter((row) => row.value > 0)
			.sort((a, b) => b.value - a.value)[0]

		const facts: QuickFact[] = []

		if (mostPopulous) {
			facts.push({
				label: 'Most populous',
				value: `${flagEmoji(mostPopulous.iso2)} ${mostPopulous.name}`.trim(),
				detail: formatFull(mostPopulous.population),
			})
		}
		if (topContinent) {
			facts.push({
				label: 'Largest by population',
				value: continentName(topContinent[0]),
				detail: `${formatCompact(topContinent[1])} people`,
			})
		}
		if (topTimezoneRow && topTimezoneCountry) {
			facts.push({
				label: 'Most timezones',
				value: `${flagEmoji(topTimezoneRow.iso2)} ${topTimezoneRow.name}`.trim(),
				detail: `${topTimezoneCountry[1]} zones`,
			})
		}
		if (topCurrency && topCurrency.count > 0) {
			facts.push({
				label: 'Top currency',
				value: `${topCurrency.currency.symbol || ''} ${topCurrency.currency.code}`.trim(),
				detail: `${topCurrency.count} countries`,
			})
		}
		if (topSharedZone && topSharedZone.count > 0) {
			facts.push({
				label: 'Most shared zone',
				value: topSharedZone.zone.timezone,
				detail: `${topSharedZone.count} countries`,
			})
		}
		if (richest) {
			facts.push({
				label: 'Richest per capita',
				value: `${flagEmoji(richest.country.iso2)} ${richest.country.name}`.trim(),
				detail: `$${formatCompact(richest.value)}`,
			})
		}

		return facts
	}, [countries, currencies, timezones])

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
				<div className="text-sm font-bold uppercase tracking-widest text-white/50">{error}</div>
			</div>
		)
	}

	return (
		<div className="animate-fade-in space-y-12">
			<section>
				<div className="mb-4 text-xs font-bold uppercase tracking-widest text-white/35">
					Global data surface
				</div>
				<h1 className="text-5xl font-bold uppercase tracking-tighter text-white md:text-7xl">
					Dashboard
				</h1>
				<p className="mt-5 max-w-2xl text-lg leading-8 text-white/50">
					One curated look at the whole dataset — countries, demographics, economy, transport,
					languages, currencies, and timezones, compared at a glance.
				</p>
			</section>

			<section className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
				{collectionTiles.map((tile) => (
					<StatTile key={tile.key} label={tile.label} value={formatCompact(totals[tile.key] || 0)} />
				))}
			</section>

			<section className="overflow-hidden border border-white/10 bg-white/[0.02]">
				<div className="border-b border-white/10 px-6 py-5">
					<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
						Where people live
					</div>
					<div className="mt-1 text-sm font-medium text-white/45">
						Every dot a city — sized by population, colored by continent
					</div>
				</div>
				<div className="px-2 py-4 sm:px-6">
					<PopulationDotMap cities={cities} continentByCountry={continentByCountry} />
				</div>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-2">
				<ChartPanel title="Top population" caption="The ten most populous countries">
					<TopPopulationBar countries={countries} />
				</ChartPanel>
				<ChartPanel title="GDP vs population" caption="Economic scale against population, log–log">
					<GdpVsPopulationScatter countries={countries} />
				</ChartPanel>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-2">
				<ChartPanel title="Population treemap" caption="Relative weight of the largest countries">
					<PopulationTreemap countries={countries} />
				</ChartPanel>
				<ChartPanel title="Countries by continent" caption="Share of the world's countries">
					<ContinentSharePie continents={continents} />
				</ChartPanel>
			</section>

			<section className="grid gap-px border border-white/10 bg-white/10 xl:grid-cols-2">
				<ChartPanel
					title="Age structure"
					caption="0–14 / 15–64 / 65+ across the largest populations"
				>
					<AgeStructureRadial stats={statistics} />
				</ChartPanel>
				<ChartPanel title="Currency reach" caption="Currencies used across the most countries">
					<CurrencyUsageBar currencies={currencies} />
				</ChartPanel>
			</section>

			<section className="border border-white/10 bg-white/[0.02]">
				<div className="border-b border-white/10 px-6 py-5">
					<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
						World time
					</div>
					<div className="mt-1 text-sm font-medium text-white/45">
						IANA zones grouped by UTC standard offset
					</div>
				</div>
				<div className="p-6">
					<OffsetDistributionBar timezones={timezones} />
				</div>
			</section>

			<section>
				<div className="mb-4 text-xs font-bold uppercase tracking-widest text-white/35">
					Quick facts
				</div>
				<div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-3 lg:grid-cols-6">
					{quickFacts.map((fact) => (
						<QuickFactCard key={fact.label} fact={fact} />
					))}
				</div>
			</section>
		</div>
	)
}
