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
	emoji,
	children,
}: {
	title: string
	description?: string
	emoji?: string
	children: React.ReactNode
}) {
	return (
		<section className="space-y-6">
			<div>
				<div className="flex items-center gap-2.5 mb-1">
					{emoji ? <span className="text-xl">{emoji}</span> : null}
					<h2 className="gradient-underline text-2xl font-bold text-text">{title}</h2>
				</div>
				{description ? <p className="mt-2 text-sm text-text-muted">{description}</p> : null}
			</div>
			{children}
		</section>
	)
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
	return (
		<div className="gradient-border-hover rounded-xl bg-bg-card/60 backdrop-blur-sm overflow-hidden">
			<div className="border-b border-border/30 bg-gradient-to-r from-accent/[0.04] to-transparent px-6 py-4">
				<h3 className="text-sm font-semibold text-text">{title}</h3>
				{subtitle ? <p className="mt-0.5 text-xs text-text-dim">{subtitle}</p> : null}
			</div>
			<div className="p-5">{children}</div>
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
			<div className="flex items-center justify-center py-20">
				<div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
			</div>
		)
	}

	return (
		<div className="space-y-16">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-text">Statistics</h1>
				<p className="mt-1.5 text-sm text-text-muted">
					Deep dive into global data across {countries.length} countries
				</p>
			</div>

			<Section title="Population" description="How the world's 8 billion people are distributed across nations" emoji="👥">
				<ChartCard title="Population Distribution (Log Scale)" subtitle="Each point is a country, sorted smallest to largest. The curve shows concentration in a few nations.">
					<PopulationDistributionArea countries={countries} />
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 20 Most Populated" subtitle="Countries ranked by total population">
						<TopPopulationBar countries={countries} />
					</ChartCard>
					<ChartCard title="Population vs Area" subtitle="Bubble size represents GDP, revealing density and wealth patterns">
						<PopVsAreaScatter countries={countries} />
					</ChartCard>
				</div>
				<ChartCard title="Population Treemap (Top 30)" subtitle="Each rectangle is proportional to population size">
					<PopulationTreemap countries={countries} />
				</ChartCard>
			</Section>

			<Section title="Geography" description="Landmass distribution, continents, and regional groupings" emoji="🗺️">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Countries by Continent" subtitle="Number of recognized countries per continent">
						<ContinentCountBar countries={countries} />
					</ChartCard>
					<ChartCard title="Regions within Continents" subtitle="Sub-regional breakdown showing geographic diversity">
						<RegionStackedBar countries={countries} />
					</ChartCard>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 10 Largest Countries" subtitle="By total land area in square kilometers">
						<TopAreaBar countries={countries} />
					</ChartCard>
					<ChartCard title="Top 10 Smallest Countries" subtitle="Microstates and territories by land area">
						<SmallestCountriesBar countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Economy" description="GDP, currencies, and economic indicators across the globe" emoji="💰">
				<ChartCard title="Top 20 by GDP" subtitle="Gross Domestic Product in millions USD">
					<TopGdpBar countries={countries} />
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="GDP vs Population" subtitle="Comparing economic output relative to population size">
						<GdpVsPopulationScatter countries={countries} />
					</ChartCard>
					<ChartCard title="Currency Usage" subtitle="Most adopted currencies by number of countries using them">
						<CurrencyUsagePie countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Culture" description="Driving conventions, measurement systems, calendars, and time formats" emoji="🎭">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					<ChartCard title="Driving Side" subtitle="Left vs right-hand traffic">
						<DrivingSideDonut countries={countries} />
					</ChartCard>
					<ChartCard title="Measurement System" subtitle="Metric vs imperial adoption">
						<MeasurementDonut countries={countries} />
					</ChartCard>
					<ChartCard title="First Day of Week" subtitle="Monday, Sunday, or Saturday start">
						<FirstDayDonut countries={countries} />
					</ChartCard>
					<ChartCard title="Time Format" subtitle="12-hour vs 24-hour clock">
						<TimeFormatDonut countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Languages" description="Linguistic diversity and official language distribution" emoji="🗣️">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Most Common Languages" subtitle="Languages ranked by number of countries where they are official">
						<MostCommonLanguages countries={countries} />
					</ChartCard>
					<ChartCard title="Most Official Languages" subtitle="Countries with the greatest number of recognized languages">
						<MostLanguagesPerCountry countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Literacy" description="Education and literacy rates across world regions" emoji="📚">
				<ChartCard title="Literacy Rate Distribution" subtitle="Histogram showing how literacy rates cluster globally">
					<LiteracyHistogram countries={countries} />
				</ChartCard>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 10 Highest Literacy" subtitle="Countries achieving near-universal literacy">
						<TopLiteracyBar countries={countries} />
					</ChartCard>
					<ChartCard title="Bottom 10 Lowest Literacy" subtitle="Nations facing the greatest educational challenges">
						<BottomLiteracyBar countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Timezones" description="Time zone coverage and distribution by region" emoji="🕐">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Countries with Most Timezones" subtitle="Nations spanning the widest range of time zones">
						<TimezonesPerCountry countries={countries} />
					</ChartCard>
					<ChartCard title="Unique Timezones by Continent" subtitle="How many distinct time zones exist per continent">
						<TimezonesByContinent countries={countries} />
					</ChartCard>
				</div>
			</Section>

			<Section title="Population Density" description="People per square kilometer, revealing concentration patterns" emoji="🏘️">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<ChartCard title="Top 20 Most Densely Populated" subtitle="City-states and small nations dominate the list">
						<MostDenseBar countries={countries} />
					</ChartCard>
					<ChartCard title="Top 20 Least Densely Populated" subtitle="Vast territories with sparse populations">
						<LeastDenseBar countries={countries} />
					</ChartCard>
				</div>
			</Section>
		</div>
	)
}
