import { useState, useEffect, useMemo } from 'react'
import { type Country, fetchCountries } from '../lib/api'
import { formatCompact, formatArea } from '../lib/format'
import { StatsCard } from './StatsCard'
import { WorldMap } from './WorldMap'
import { TopPopulationBar, TopAreaBar, PopulationTreemap } from './charts/PopulationChart'
import { RegionPie } from './charts/RegionPie'
import { CountryDetail } from './CountryDetail'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-border bg-bg-card p-5">
			<h3 className="mb-4 text-sm font-semibold text-text">{title}</h3>
			{children}
		</div>
	)
}

function Skeleton({ className = '' }: { className?: string }) {
	return <div className={`animate-pulse-subtle rounded-lg bg-bg-card ${className}`} />
}

function QuickFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-border-hover">
			<div className="text-xs text-text-dim">{label}</div>
			<div className="mt-1 text-sm font-semibold text-text">{value}</div>
		</div>
	)
}

export function Dashboard() {
	const [countries, setCountries] = useState<Country[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedIso, setSelectedIso] = useState<string | null>(null)

	useEffect(() => {
		fetchCountries()
			.then(setCountries)
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	const selectedCountry = useMemo(
		() => countries.find((c) => c.iso2 === selectedIso) || null,
		[countries, selectedIso],
	)

	const quickFacts = useMemo(() => {
		if (!countries.length) return []
		const sorted = [...countries]
		const biggestArea = sorted.sort((a, b) => b.areaSqKm - a.areaSqKm)[0]
		const mostTimezones = sorted.sort(
			(a, b) => (b.timezones?.length || 0) - (a.timezones?.length || 0),
		)[0]
		const mostLanguages = sorted.sort(
			(a, b) => (b.languages?.length || 0) - (a.languages?.length || 0),
		)[0]
		const highLiteracy = sorted.filter((c) => c.literacy === 100).length
		const leftDrive = sorted.filter((c) => c.drivingSide === 'left').length
		const mostPopulated = sorted.sort((a, b) => b.population - a.population)[0]
		const smallestCountry = [...countries]
			.filter((c) => c.areaSqKm > 0)
			.sort((a, b) => a.areaSqKm - b.areaSqKm)[0]

		return [
			{
				label: 'Most populated',
				value: `${mostPopulated?.emoji} ${mostPopulated?.name} (${formatCompact(mostPopulated?.population || 0)})`,
			},
			{
				label: 'Largest by area',
				value: `${biggestArea?.emoji} ${biggestArea?.name} (${formatArea(biggestArea?.areaSqKm || 0)})`,
			},
			{
				label: 'Smallest by area',
				value: `${smallestCountry?.emoji} ${smallestCountry?.name} (${formatArea(smallestCountry?.areaSqKm || 0)})`,
			},
			{
				label: 'Most timezones',
				value: `${mostTimezones?.emoji} ${mostTimezones?.name} (${mostTimezones?.timezones?.length})`,
			},
			{
				label: 'Most languages',
				value: `${mostLanguages?.emoji} ${mostLanguages?.name} (${mostLanguages?.languages?.length})`,
			},
			{ label: 'Highest literacy', value: `${highLiteracy} countries at 100%` },
			{ label: 'Drives on left', value: `${leftDrive} countries` },
			{
				label: 'Most common currency',
				value: (() => {
					const m = new Map<string, number>()
					for (const c of countries) {
						if (c.currency) m.set(c.currency, (m.get(c.currency) || 0) + 1)
					}
					const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]
					return top ? `${top[0]} (${top[1]} countries)` : 'N/A'
				})(),
			},
		]
	}, [countries])

	if (loading) {
		return (
			<div className="space-y-8">
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
				<Skeleton className="h-[420px]" />
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<Skeleton className="h-[350px]" />
					<Skeleton className="h-[350px]" />
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-text">
					Global Data Dashboard
				</h1>
				<p className="mt-1 text-sm text-text-muted">
					Explore geography, demographics, and culture across 252 countries
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<StatsCard icon="🌍" label="Countries" value={`${countries.length}`} delay={0} />
				<StatsCard icon="🏛️" label="States" value="5,084+" delay={50} />
				<StatsCard icon="🏙️" label="Cities" value="232K+" delay={100} />
				<StatsCard icon="🕐" label="Timezones" value="312" delay={150} />
				<StatsCard icon="💱" label="Currencies" value="178" delay={200} />
			</div>

			<div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
				<h2 className="mb-3 text-lg font-semibold text-text">World Map</h2>
				<p className="mb-3 text-xs text-text-dim">
					Countries colored by continent. Hover to see details, click to explore.
				</p>
				<WorldMap countries={countries} onCountryClick={setSelectedIso} />
				<div className="mt-2 flex flex-wrap gap-3">
					{Object.entries({
						Africa: '#c87f32',
						Americas: '#2da06a',
						Asia: '#3b82f6',
						Europe: '#a855f7',
						Oceania: '#06b6d4',
					}).map(([name, color]) => (
						<div key={name} className="flex items-center gap-1.5 text-xs text-text-dim">
							<div className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
							{name}
						</div>
					))}
				</div>
			</div>

			<div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
				<ChartCard title="Population Treemap (Top 30 countries)">
					<PopulationTreemap countries={countries} />
				</ChartCard>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
					<ChartCard title="Top 10 Most Populated Countries">
						<TopPopulationBar countries={countries} />
					</ChartCard>
				</div>
				<div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
					<ChartCard title="Top 10 Largest Countries by Area">
						<TopAreaBar countries={countries} />
					</ChartCard>
				</div>
			</div>

			<div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
				<ChartCard title="Countries by Region">
					<RegionPie countries={countries} />
				</ChartCard>
			</div>

			<div>
				<h2 className="mb-3 text-lg font-semibold text-text">Quick Facts</h2>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{quickFacts.map((fact) => (
						<QuickFact key={fact.label} label={fact.label} value={fact.value} />
					))}
				</div>
			</div>

			{selectedCountry ? (
				<CountryDetail
					country={selectedCountry}
					onClose={() => setSelectedIso(null)}
					onNavigate={(iso) => setSelectedIso(iso)}
				/>
			) : null}
		</div>
	)
}
