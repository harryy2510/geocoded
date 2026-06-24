import { useEffect, useState, type ReactNode } from 'react'
import { formatCompact } from '../lib/format'
import {
	fetchCountriesWithStats,
	fetchV2All,
	type CountryRow,
	type StatisticsRow,
	type MigrationRow,
	type CurrencyRow,
	type TimezoneRow,
} from '../lib/v2'
import { PopulationDotMap, type CityPoint } from './charts/nivo/GeographyCharts'
import { GdpVsPopulationScatter } from './charts/nivo/EconomyCharts'
import { MigrationCorridorsBar } from './charts/nivo/MigrationCharts'
import { MostSharedTimezonesBar } from './charts/nivo/TimezoneCharts'
import {
	AgeContrastButterfly,
	SexRatioDiverging,
	ForeignBornShareBar,
	SharedCurrenciesBar,
	LongevityGapBar,
} from './charts/nivo/FactCharts'

// A single editorial "fact": a number-led headline, a sentence of context, and
// one chart that makes the point. No grids of redundant rankings.
function Fact({
	index,
	kicker,
	headline,
	context,
	wide,
	children,
}: {
	index: number
	kicker: string
	headline: ReactNode
	context: string
	wide?: boolean
	children: ReactNode
}) {
	return (
		<section className="grid gap-8 border-t border-white/10 pt-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
			<div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
				<div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
					<span className="font-mono">{String(index).padStart(2, '0')}</span>
					<span>{kicker}</span>
				</div>
				<h2 className="text-3xl font-bold leading-[1.05] tracking-tighter text-white md:text-4xl">
					{headline}
				</h2>
				<p className="max-w-md text-base leading-7 text-white/45">{context}</p>
			</div>
			<div className={wide ? 'lg:col-span-1' : ''}>{children}</div>
		</section>
	)
}

export function Statistics() {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)
	const [countries, setCountries] = useState<CountryRow[]>([])
	const [stats, setStats] = useState<StatisticsRow[]>([])
	const [migration, setMigration] = useState<MigrationRow[]>([])
	const [currencies, setCurrencies] = useState<CurrencyRow[]>([])
	const [timezones, setTimezones] = useState<TimezoneRow[]>([])
	const [cities, setCities] = useState<CityPoint[]>([])

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const [countryRows, statsRows, migrationRows, currencyRows, timezoneRows, cityRows] =
					await Promise.all([
						fetchCountriesWithStats(300),
						fetchV2All<StatisticsRow>('/v2/statistics', 300),
						fetchV2All<MigrationRow>('/v2/migrant-stocks', 300, {
							sort: '-totalInternationalMigrants',
						}),
						fetchV2All<CurrencyRow>('/v2/currencies', 300, {
							fields: 'code,name,symbol,countries',
						}),
						fetchV2All<TimezoneRow>('/v2/timezones', 500, {
							fields: 'timezone,standardOffset,countryCodes,area',
						}),
						fetchV2All<CityPoint>('/v2/cities', 2000, {
							sort: '-population',
							fields: 'name,countryName,countryCode,latitude,longitude,population',
						}),
					])

				if (cancelled) return
				setCountries(countryRows)
				setStats(statsRows)
				setMigration(migrationRows)
				setCurrencies(currencyRows)
				setTimezones(timezoneRows)
				setCities(cityRows)
			} catch {
				if (!cancelled) setError(true)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		void load()
		return () => {
			cancelled = true
		}
	}, [])

	if (loading) {
		return (
			<div className="animate-pulse p-12 font-mono text-sm uppercase tracking-widest text-white/40">
				Reading the world…
			</div>
		)
	}

	if (error && countries.length === 0) {
		return (
			<div className="m-4 border border-amber-500/20 bg-amber-500/[0.04] p-6 text-sm text-amber-200/70">
				Could not reach the data service. Check the API status and try again.
			</div>
		)
	}

	// iso2 → continent code, so the map can color each city by its continent.
	const continentByCountry = new Map(countries.map((c) => [c.iso2.toUpperCase(), c.continent]))

	// Headline numbers used inside the fact copy, derived once.
	const youngest = topBy(stats, (s) => pct(s, 'age0To14Percent'))
	const oldest65 = topBy(stats, (s) => pct(s, 'age65PlusPercent'))
	const maleSkew = topRatio(stats)
	const topCorridor = topMigrationCorridor(migration)
	const foreignTop = topBy2(migration, (m) => m.migrantShareOfPopulationPercent ?? 0)
	const richest = topBy(stats, (s) => pct(s, 'gdpPerCapitaCurrentUsd'))
	const lifeHigh = topBy(stats, (s) => pct(s, 'lifeExpectancy'))
	const lifeLow = botBy(stats, (s) => pct(s, 'lifeExpectancy'))
	const soloCurrencies = currencies.filter((c) => (c.countries ?? []).length <= 1).length
	const euro = currencies.find((c) => c.code === 'EUR')
	const topZones = topZoneCountry(timezones, countries)

	return (
		<div className="animate-fade-in flex flex-col gap-4">
			<header className="mb-4">
				<div className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-white/30">
					The World, Read Closely
				</div>
				<h1 className="max-w-4xl text-5xl font-bold uppercase leading-[0.95] tracking-tighter md:text-7xl">
					Things you didn't know about the planet
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-white/50">
					Not every chart. The handful that tell you something. Each one below is a single fact
					worth knowing, drawn straight from the data.
				</p>
			</header>

			<Fact
				index={1}
				kicker="Demographics"
				headline={
					<>
						One country is half children.
						<br />
						Another is a third elderly.
					</>
				}
				context={`Nearly ${fmt0(youngest?.value)}% of ${youngest?.name ?? '—'} is under 15. Meanwhile ${oldest65?.name ?? '—'} has ${fmt0(oldest65?.value)}% over 65. These are two different planets sharing one map.`}
			>
				<AgeContrastButterfly stats={stats} />
			</Fact>

			<Fact
				index={2}
				kicker="Migration"
				headline="Where the world is moving"
				context={`The ${topCorridor?.from ?? '—'} → ${topCorridor?.to ?? '—'} corridor alone moves ${formatCompact(topCorridor?.count ?? 0)} people — more than the entire population of most countries. Migration isn't random; it runs in deep, specific channels.`}
			>
				<MigrationCorridorsBar migration={migration} />
			</Fact>

			<Fact
				index={3}
				kicker="Migration"
				headline="Nations built of foreigners"
				context={`In ${foreignTop?.name ?? '—'}, ${fmt0(foreignTop?.value)}% of everyone living there was born somewhere else. A handful of states are majority migrant — the rest of the world isn't close.`}
			>
				<ForeignBornShareBar migration={migration} />
			</Fact>

			<Fact
				index={4}
				kicker="Demographics"
				headline="Men without women"
				context={`${maleSkew?.name ?? '—'} has roughly ${maleSkew ? maleSkew.value.toFixed(1) : '—'} men for every woman — the footprint of migrant labour. At the other end sit the female-skewed societies of the post-Soviet world.`}
			>
				<SexRatioDiverging stats={stats} />
			</Fact>

			<Fact
				index={5}
				kicker="Economy"
				headline="Punching far above their weight"
				context={`${richest?.name ?? '—'} produces about $${formatCompact(richest?.value ?? 0)} per person — among microstates you've barely heard of. Wealth per head and population size pull in opposite directions; the outliers are the story.`}
			>
				<GdpVsPopulationScatter countries={countries} />
			</Fact>

			<Fact
				index={6}
				kicker="Health"
				headline="A thirty-year gap in a single lifetime"
				context={`Born in ${lifeHigh?.name ?? '—'}, you can expect ${fmt0(lifeHigh?.value)} years. Born in ${lifeLow?.name ?? '—'}, about ${fmt0(lifeLow?.value)}. Same species, same century — three decades apart.`}
			>
				<LongevityGapBar stats={stats} />
			</Fact>

			<Fact
				index={7}
				kicker="Economy"
				headline="One currency, many flags"
				context={`The Euro alone unites ${euro ? (euro.countries ?? []).length : '—'} countries — yet ${soloCurrencies} of the ${currencies.length} currencies in the world are used by just one. Money is far more concentrated than the map of nations suggests.`}
			>
				<SharedCurrenciesBar currencies={currencies} />
			</Fact>

			<Fact
				index={8}
				kicker="Geography"
				headline="Big enough to need many clocks"
				context={`${topZones?.name ?? '—'} stretches across ${topZones?.count ?? '—'} time zones. A few giant countries are wide enough that noon in one corner is the dead of night in another.`}
			>
				<MostSharedTimezonesBar timezones={timezones} />
			</Fact>

			<section className="grid gap-8 border-t border-white/10 pt-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
				<div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
					<div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
						<span className="font-mono">09</span>
						<span>The whole picture</span>
					</div>
					<h2 className="text-3xl font-bold leading-[1.05] tracking-tighter text-white md:text-4xl">
						Eight billion people, one map
					</h2>
					<p className="max-w-md text-base leading-7 text-white/45">
						Every dot is a real city, placed by its true coordinates. The shape of the inhabited
						world emerges from nothing but the data — no map drawn, just where people live.
					</p>
				</div>
				<div>
					<div className="border border-white/10 bg-white/[0.02] p-3">
						<PopulationDotMap cities={cities} continentByCountry={continentByCountry} />
					</div>
				</div>
			</section>
		</div>
	)
}

// --- small derivation helpers (no charts, just headline numbers) ----------

function pct(s: StatisticsRow, key: keyof StatisticsRow): number | null {
	const m = s[key]
	if (m && typeof m === 'object' && 'value' in m) return m.value
	return null
}

function fmt0(v: number | null | undefined): string {
	return v == null ? '—' : Math.round(v).toString()
}

function topBy(
	stats: StatisticsRow[],
	value: (s: StatisticsRow) => number | null
): { name: string; value: number } | null {
	let best: { name: string; value: number } | null = null
	for (const s of stats) {
		const v = value(s)
		if (v == null) continue
		if (!best || v > best.value) best = { name: s.countryName, value: v }
	}
	return best
}

function botBy(
	stats: StatisticsRow[],
	value: (s: StatisticsRow) => number | null
): { name: string; value: number } | null {
	let worst: { name: string; value: number } | null = null
	for (const s of stats) {
		const v = value(s)
		if (v == null) continue
		if (!worst || v < worst.value) worst = { name: s.countryName, value: v }
	}
	return worst
}

function topBy2(
	rows: MigrationRow[],
	value: (m: MigrationRow) => number
): { name: string; value: number } | null {
	let best: { name: string; value: number } | null = null
	for (const m of rows) {
		const v = value(m)
		if (!v) continue
		if (!best || v > best.value) best = { name: m.countryName, value: v }
	}
	return best
}

function topRatio(stats: StatisticsRow[]): { name: string; value: number } | null {
	let best: { name: string; value: number } | null = null
	for (const s of stats) {
		const male = pct(s, 'populationMale')
		const female = pct(s, 'populationFemale')
		if (!male || !female) continue
		const ratio = male / female
		if (!best || ratio > best.value) best = { name: s.countryName, value: ratio }
	}
	return best
}

function topMigrationCorridor(
	migration: MigrationRow[]
): { from: string; to: string; count: number } | null {
	let best: { from: string; to: string; count: number } | null = null
	for (const m of migration) {
		for (const o of m.origins ?? []) {
			if (!best || o.count > best.count) {
				best = { from: o.countryName, to: m.countryName, count: o.count }
			}
		}
	}
	return best
}

function topZoneCountry(
	timezones: TimezoneRow[],
	countries: CountryRow[]
): { name: string; count: number } | null {
	const counts = new Map<string, number>()
	for (const z of timezones) {
		for (const code of z.countryCodes ?? []) {
			counts.set(code, (counts.get(code) ?? 0) + 1)
		}
	}
	const nameByIso = new Map(countries.map((c) => [c.iso2.toUpperCase(), c.name]))
	let best: { name: string; count: number } | null = null
	for (const [code, count] of counts) {
		if (!best || count > best.count) {
			best = { name: nameByIso.get(code.toUpperCase()) ?? code, count }
		}
	}
	return best
}
