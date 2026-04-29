import { useState, useEffect } from 'react'
import { type Country, fetchCountries } from '../lib/api'
import { TopPopulationBar, PopulationTreemap } from './charts/PopulationChart'
import {
	PopulationDistributionArea,
	PopVsAreaScatter,
	ContinentCountBar,
	RegionStackedBar,
	SmallestCountriesBar,
} from './charts/AreaChart'
import { TopGdpBar, GdpVsPopulationScatter, CurrencyUsagePie } from './charts/GdpChart'
import {
	DrivingSideDonut,
	MeasurementDonut,
	FirstDayDonut,
	TimeFormatDonut,
} from './charts/CultureDonuts'
import { MostDenseBar, LeastDenseBar } from './charts/DensityChart'
import { LiteracyHistogram, TopLiteracyBar, BottomLiteracyBar } from './charts/LiteracyChart'
import { MostCommonLanguages, MostLanguagesPerCountry } from './charts/LanguageChart'
import { TimezonesPerCountry, TimezonesByContinent } from './charts/TimezoneChart'
import { TopAreaBar } from './charts/PopulationChart'

function Section({
	title,
	description,
	children,
}: {
	title: string
	description?: string
	children: React.ReactNode
}) {
	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-xl font-bold text-text">{title}</h2>
				{description ? <p className="mt-0.5 text-sm text-text-muted">{description}</p> : null}
			</div>
			{children}
		</section>
	)
}

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

export function Statistics() {
	const [countries, setCountries] = useState<Country[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetchCountries()
			.then(setCountries)
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	if (loading) {
		return (
			<div className="space-y-8">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="space-y-4">
						<Skeleton className="h-8 w-48" />
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<Skeleton className="h-[300px]" />
							<Skeleton className="h-[300px]" />
						</div>
					</div>
				))}
			</div>
		)
	}

	return (
		<div className="space-y-12">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-text">Statistics</h1>
				<p className="mt-1 text-sm text-text-muted">
					Deep dive into global data across {countries.length} countries
				</p>
			</div>

			<Section title="Population" description="How the world's 8 billion people are distributed">
				<ChartCard title="Population Distribution (Log Scale)">
					<PopulationDistributionArea countries={countries} />
					<p className="mt-2 text-xs text-text-dim">
						Each point is a country, sorted from smallest to largest population. The exponential curve shows how population is concentrated in a few nations.
					</p>
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 20 Most Populated">
						<TopPopulationBar countries={countries} />
					</ChartCard>
					<ChartCard title="Population vs Area (Bubble = GDP)">
						<PopVsAreaScatter countries={countries} />
					</ChartCard>
				</div>
				<ChartCard title="Population Treemap (Top 30)">
					<PopulationTreemap countries={countries} />
				</ChartCard>
			</Section>

			<Section title="Geography" description="Landmass, continents, and regions">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Countries by Continent">
						<ContinentCountBar countries={countries} />
					</ChartCard>
					<ChartCard title="Regions within Continents">
						<RegionStackedBar countries={countries} />
					</ChartCard>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 10 Largest Countries">
						<TopAreaBar countries={countries} />
					</ChartCard>
					<ChartCard title="Top 10 Smallest Countries">
						<SmallestCountriesBar countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Economy" description="GDP, currencies, and economic power">
				<ChartCard title="Top 20 by GDP">
					<TopGdpBar countries={countries} />
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="GDP vs Population">
						<GdpVsPopulationScatter countries={countries} />
					</ChartCard>
					<ChartCard title="Currency Usage (Countries per Currency)">
						<CurrencyUsagePie countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Culture" description="Driving side, measurement, calendars, and time">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					<ChartCard title="Driving Side">
						<DrivingSideDonut countries={countries} />
					</ChartCard>
					<ChartCard title="Measurement System">
						<MeasurementDonut countries={countries} />
					</ChartCard>
					<ChartCard title="First Day of Week">
						<FirstDayDonut countries={countries} />
					</ChartCard>
					<ChartCard title="Time Format">
						<TimeFormatDonut countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Languages" description="Linguistic diversity across nations">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Most Common Languages (by country count)">
						<MostCommonLanguages countries={countries} />
					</ChartCard>
					<ChartCard title="Countries with Most Official Languages">
						<MostLanguagesPerCountry countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Literacy" description="Education and literacy rates worldwide">
				<ChartCard title="Literacy Rate Distribution">
					<LiteracyHistogram countries={countries} />
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 10 Highest Literacy">
						<TopLiteracyBar countries={countries} />
					</ChartCard>
					<ChartCard title="Bottom 10 Lowest Literacy">
						<BottomLiteracyBar countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Timezones" description="Time across the globe">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Countries with Most Timezones">
						<TimezonesPerCountry countries={countries} />
					</ChartCard>
					<ChartCard title="Unique Timezones by Continent">
						<TimezonesByContinent countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Population Density" description="People per square kilometer">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 20 Most Densely Populated">
						<MostDenseBar countries={countries} />
					</ChartCard>
					<ChartCard title="Top 20 Least Densely Populated">
						<LeastDenseBar countries={countries} />
					</ChartCard>
				</div>
			</Section>
		</div>
	)
}
