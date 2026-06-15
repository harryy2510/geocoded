import { useState, useEffect } from 'react'
import { type Country, type State, type City, fetchStates, fetchCities } from '@geocoded/client'
import { formatFull, formatArea, formatPercent, formatDensity } from '../lib/format'

const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me'
const compactMetricFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	compactDisplay: 'long',
	maximumFractionDigits: 1,
})
const percentFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 1,
})

type V2Paginated<T> = {
	data: T[]
	meta?: {
		total?: number
	}
}

type V2List<T> = {
	items: T[]
	total: number
}

type V2Metric = {
	year?: number
	value?: number
}

type V2Statistics = {
	populationTotal?: V2Metric
	gdpCurrentUsd?: V2Metric
	gdpPerCapitaCurrentUsd?: V2Metric
	lifeExpectancy?: V2Metric
	urbanPopulationPercent?: V2Metric
}

type V2Migration = {
	year?: number
	totalInternationalMigrants?: number
	migrantShareOfPopulationPercent?: number
}

type V2TransportRecord = {
	id: string
	name: string
	iataCode?: string
	icaoCode?: string
	unLocode?: string
	stateCode?: string
	timezone?: string
	functions?: string[]
}

type V2LanguageName = {
	printName: string
	invertedName: string
}

type V2Language = {
	id: string
	iso6393: string
	iso6392B?: string | null
	iso6392T?: string | null
	iso6391?: string | null
	referenceName: string
	names?: V2LanguageName[]
}

type RelatedData = {
	statistics: V2Statistics | null
	migration: V2Migration | null
	languages: V2List<V2Language>
	airports: V2List<V2TransportRecord>
	ports: V2List<V2TransportRecord>
	borderCrossings: V2List<V2TransportRecord>
	airlines: V2List<V2TransportRecord>
}

const emptyRelatedData = (): RelatedData => ({
	statistics: null,
	migration: null,
	languages: { items: [], total: 0 },
	airports: { items: [], total: 0 },
	ports: { items: [], total: 0 },
	borderCrossings: { items: [], total: 0 },
	airlines: { items: [], total: 0 },
})

function joinApi(path: string): string {
	return `${apiUrl.replace(/\/$/, '')}${path}`
}

async function fetchV2Resource<T>(path: string): Promise<T | null> {
	const response = await fetch(joinApi(path))
	if (!response.ok) return null
	return response.json() as Promise<T>
}

async function fetchV2List<T>(path: string): Promise<V2List<T>> {
	const response = await fetchV2Resource<V2Paginated<T>>(path)
	return {
		items: response?.data || [],
		total: response?.meta?.total || response?.data?.length || 0,
	}
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mt-6">
			<h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">{title}</h4>
			{children}
		</div>
	)
}

function Badge({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
	const Tag = onClick ? 'button' : 'span'
	return (
		<Tag
			onClick={onClick}
			className={`inline-flex max-w-full items-center rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs font-semibold text-text-muted ${onClick ? 'cursor-pointer transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent' : ''}`}
		>
			{children}
		</Tag>
	)
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="min-w-0 bg-black/80 px-5 py-4">
			<div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</div>
			<div className="mt-2 break-words text-base font-semibold text-white">{value}</div>
		</div>
	)
}

function formatMetric(metric: V2Metric | undefined, suffix = ''): string {
	if (!metric || metric.value == null) return 'N/A'
	return `${compactMetricFormatter.format(metric.value)}${suffix}`
}

function formatCurrencyMetric(metric: V2Metric | undefined): string {
	if (!metric || metric.value == null) return 'N/A'
	return `$${compactMetricFormatter.format(metric.value)}`
}

function formatCurrencyValue(value: number | undefined): string {
	if (value == null) return 'N/A'
	return `$${compactMetricFormatter.format(value)}`
}

function formatPercentValue(value: number | undefined): string {
	if (value == null) return 'N/A'
	return `${percentFormatter.format(value)}%`
}

function formatToken(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/\bbordercrossing\b/g, 'border crossing')
}

function languageCode(value: string): string {
	return value.trim().split('-')[0]?.toLowerCase() ?? ''
}

function cleanLanguageName(value: string): string {
	return value.replace(/\s+\(macrolanguage\)$/i, '')
}

function languageListPath(codes: string[]): string | null {
	const normalized = [
		...new Set(codes.map(languageCode).filter(Boolean)),
	]
	if (normalized.length === 0) return null

	const params = new URLSearchParams()
	params.set('fields', 'id,iso6393,iso6392B,iso6392T,iso6391,referenceName,names')
	params.set('limit', '2000')
	for (const code of normalized) params.append('filter[code]', code)
	return `/v2/languages?${params.toString()}`
}

function buildLanguageNameMap(languages: V2Language[]): Map<string, string> {
	const names = new Map<string, string>()
	for (const language of languages) {
		for (const code of [
			language.id,
			language.iso6393,
			language.iso6392B,
			language.iso6392T,
			language.iso6391,
		]) {
			if (code) names.set(code.toLowerCase(), cleanLanguageName(language.referenceName))
		}
	}
	return names
}

function resolveLanguageName(code: string, names: Map<string, string>): string | null {
	return names.get(code.toLowerCase()) || names.get(languageCode(code)) || null
}

function RelatedList({
	title,
	collection,
}: {
	title: string
	collection: V2List<V2TransportRecord>
}) {
	const { items, total } = collection
	if (items.length === 0) return null
	return (
		<Section title={`${title} (${total})`}>
			<div className="grid gap-px bg-white/10 md:grid-cols-2">
				{items.map((item) => (
					<div key={item.id} className="min-w-0 bg-black/80 px-4 py-3">
						<div className="truncate text-sm font-bold text-white">{item.name}</div>
						<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">
							{item.iataCode ? <span>{item.iataCode}</span> : null}
							{item.icaoCode ? <span>{item.icaoCode}</span> : null}
							{item.unLocode ? <span>{item.unLocode}</span> : null}
							{item.stateCode ? <span>{item.stateCode}</span> : null}
							{item.timezone ? <span>{item.timezone}</span> : null}
							{item.functions?.length ? <span>{item.functions.map(formatToken).join(', ')}</span> : null}
						</div>
					</div>
				))}
			</div>
			{total > items.length ? (
				<p className="mt-3 text-xs font-medium text-text-dim">
					Showing {items.length} of {total.toLocaleString('en-US')}
				</p>
			) : null}
		</Section>
	)
}

export function CountryDetail({
	country,
	onClose,
	onNavigate,
	countries,
}: {
	country: Country
	onClose: () => void
	onNavigate?: (iso2: string) => void
	countries?: Country[]
}) {
	const [states, setStates] = useState<State[]>([])
	const [loadingStates, setLoadingStates] = useState(false)
	const [expandedState, setExpandedState] = useState<string | null>(null)
	const [stateCities, setStateCities] = useState<Record<string, City[]>>({})
	const [loadingCities, setLoadingCities] = useState<string | null>(null)
	const [related, setRelated] = useState<RelatedData>(emptyRelatedData)
	const [loadingRelated, setLoadingRelated] = useState(false)
	const countryNames = new Map((countries || []).map((item) => [item.iso2, item.name]))

	useEffect(() => {
		setLoadingStates(true)
		fetchStates(country.iso2)
			.then((data) => setStates(data))
			.catch(() => setStates([]))
			.finally(() => setLoadingStates(false))
	}, [country.iso2])

	useEffect(() => {
		let cancelled = false
		const countryCode = encodeURIComponent(country.iso2)
		const languagesPath = languageListPath(country.languages)

		setLoadingRelated(true)
		setRelated(emptyRelatedData())

		Promise.all([
			fetchV2Resource<V2Statistics>(
				`/v2/statistics/${countryCode}?fields=populationTotal,gdpCurrentUsd,gdpPerCapitaCurrentUsd,lifeExpectancy,urbanPopulationPercent`
			),
			fetchV2Resource<V2Migration>(
				`/v2/migration/${countryCode}?fields=year,totalInternationalMigrants,migrantShareOfPopulationPercent`
			),
			languagesPath
				? fetchV2List<V2Language>(languagesPath)
				: Promise.resolve({ items: [], total: 0 }),
			fetchV2List<V2TransportRecord>(
				`/v2/airports?filter[country]=${countryCode}&fields=id,name,iataCode,stateCode,timezone&limit=8`
			),
			fetchV2List<V2TransportRecord>(
				`/v2/ports?filter[country]=${countryCode}&fields=id,name,unLocode,functions&limit=8`
			),
			fetchV2List<V2TransportRecord>(
				`/v2/border-crossings?filter[country]=${countryCode}&fields=id,name,unLocode,functions&limit=8`
			),
			fetchV2List<V2TransportRecord>(
				`/v2/airlines?filter[country]=${countryCode}&fields=id,name,iataCode,icaoCode&limit=8`
			),
		])
			.then(([statistics, migration, languages, airports, ports, borderCrossings, airlines]) => {
				if (cancelled) return
				setRelated({
					statistics,
					migration,
					languages,
					airports,
					ports,
					borderCrossings,
					airlines,
				})
			})
			.catch(() => {
				if (!cancelled) setRelated(emptyRelatedData())
			})
			.finally(() => {
				if (!cancelled) setLoadingRelated(false)
			})

		return () => {
			cancelled = true
		}
	}, [country.iso2])

	const handleExpandState = async (stateCode: string) => {
		if (expandedState === stateCode) {
			setExpandedState(null)
			return
		}
		setExpandedState(stateCode)
		if (!stateCities[stateCode]) {
			setLoadingCities(stateCode)
			try {
				const result = await fetchCities(country.iso2, stateCode, 20)
				setStateCities((prev) => ({ ...prev, [stateCode]: result.data }))
			} catch {
				setStateCities((prev) => ({ ...prev, [stateCode]: [] }))
			} finally {
				setLoadingCities(null)
			}
		}
	}

	const languageNameMap = buildLanguageNameMap(related.languages.items)
	const languageNames = country.languages
		.map((lang) => ({ code: lang, name: resolveLanguageName(lang, languageNameMap) }))
		.filter((lang): lang is { code: string; name: string } => Boolean(lang.name))

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
			<div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
			<div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-y-auto border border-white/15 bg-black/90 shadow-2xl backdrop-blur-3xl">
				<div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-black/70 px-6 py-6 backdrop-blur-xl sm:px-8">
					<div className="flex min-w-0 items-center gap-4">
						<span className="shrink-0 text-5xl drop-shadow-md">{country.emoji}</span>
						<div className="min-w-0">
							<h2 className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{country.name}</h2>
							<p className="mt-1 truncate text-sm font-medium text-text-muted">{country.native}</p>
						</div>
					</div>
					<button
						onClick={onClose}
						aria-label="Close country details"
						className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition-all hover:bg-white/10 hover:text-white"
					>
						<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="p-6 sm:p-8">
					<div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
						{[
							['Capital', country.capital],
							['Region', `${country.continent} / ${country.region}`],
							['Subregion', country.subregion],
							['Population', formatFull(country.population)],
							['Area', formatArea(country.areaSqKm)],
							['Density', formatDensity(country.population, country.areaSqKm)],
							['GDP', formatCurrencyValue(country.gdp)],
							['Literacy', country.literacy ? formatPercent(country.literacy) : 'N/A'],
							['Currency', `${country.currencySymbol} ${country.currencyName} (${country.currency})`],
							['Phone', `+${country.phoneCode}`],
							['TLD', country.tld],
							['ISO', `${country.iso2} / ${country.iso3}`],
							['Driving', country.drivingSide],
							['Measurement', country.measurementSystem],
							['Week starts', country.firstDayOfWeek],
							['Time', country.timeFormat],
						].map(([label, value]) => (
							<Fact key={label} label={label} value={value} />
						))}
					</div>

					{loadingRelated ? (
						<Section title="V2 related data">
							<div className="h-12 animate-pulse-subtle bg-white/5" />
						</Section>
					) : null}

					{related.statistics ? (
						<Section title="Statistics">
							<div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-5">
								<Fact label="Population" value={formatMetric(related.statistics.populationTotal)} />
								<Fact label="GDP" value={formatCurrencyMetric(related.statistics.gdpCurrentUsd)} />
								<Fact label="GDP / Capita" value={formatCurrencyMetric(related.statistics.gdpPerCapitaCurrentUsd)} />
								<Fact label="Life expectancy" value={formatMetric(related.statistics.lifeExpectancy, ' yrs')} />
								<Fact label="Urban population" value={formatPercentValue(related.statistics.urbanPopulationPercent?.value)} />
							</div>
						</Section>
					) : null}

					{related.migration ? (
						<Section title="Migration">
							<div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
								<Fact
									label="International migrants"
									value={related.migration.totalInternationalMigrants != null ? compactMetricFormatter.format(related.migration.totalInternationalMigrants) : 'N/A'}
								/>
								<Fact
									label="Share of population"
									value={formatPercentValue(related.migration.migrantShareOfPopulationPercent)}
								/>
								<Fact label="Year" value={related.migration.year || 'N/A'} />
							</div>
						</Section>
					) : null}

					<RelatedList title="Airports" collection={related.airports} />
					<RelatedList title="Ports" collection={related.ports} />
					<RelatedList title="Border crossings" collection={related.borderCrossings} />
					<RelatedList title="Airlines" collection={related.airlines} />

					{languageNames.length > 0 ? (
						<Section title="Languages">
							<div className="flex flex-wrap gap-1.5">
								{languageNames.map((lang) => (
									<Badge key={lang.code}>{lang.name}</Badge>
								))}
							</div>
						</Section>
					) : null}

					{country.neighbours?.length > 0 ? (
						<Section title="Neighbours">
							<div className="flex flex-wrap gap-1.5">
								{country.neighbours.map((n) => (
									<Badge key={n} onClick={onNavigate ? () => onNavigate(n) : undefined}>
										{countryNames.get(n) || n}
									</Badge>
								))}
							</div>
						</Section>
					) : null}

					{country.timezones?.length > 0 ? (
						<Section title={`Timezones (${country.timezones.length})`}>
							<div className="space-y-1">
								{country.timezones.map((tz) => (
									<div
										key={tz.zoneName}
										className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
									>
										<span className="truncate font-medium text-text-muted">{tz.zoneName}</span>
										<span className="shrink-0 font-mono font-bold text-accent">{tz.gmtOffsetName}</span>
									</div>
								))}
							</div>
						</Section>
					) : null}

					{country.translations && Object.keys(country.translations).length > 0 ? (
						<Section title="Translations">
							<div className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
								{Object.entries(country.translations)
									.slice(0, 20)
									.map(([lang, name]) => (
										<div key={lang} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs">
											<span className="font-mono font-bold uppercase text-accent/70">{lang}</span>
											<span className="truncate font-medium text-text-muted">{name}</span>
										</div>
									))}
							</div>
						</Section>
					) : null}

					<Section title={`States ${states.length > 0 ? `(${states.length})` : ''}`}>
						{loadingStates ? (
							<div className="space-y-1.5">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-10 animate-pulse-subtle rounded-xl bg-white/5" />
								))}
							</div>
						) : states.length === 0 ? (
							<p className="text-xs text-text-dim">No states found</p>
						) : (
							<div className="space-y-1">
								{states.slice(0, 50).map((st) => (
									<div key={st.iso2}>
										<button
											onClick={() => handleExpandState(st.iso2)}
											className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left text-xs transition-colors hover:bg-white/5"
										>
											<span className="truncate font-bold text-white">{st.name}</span>
											<span className="shrink-0 font-medium text-text-dim">
												{st.population ? formatFull(st.population) : st.type}
											</span>
										</button>
										{expandedState === st.iso2 ? (
											<div className="ml-2 mt-1 space-y-0.5 border-l border-border pl-3 sm:ml-3">
												{loadingCities === st.iso2 ? (
													<div className="h-5 w-32 animate-pulse-subtle rounded bg-white/5" />
												) : (stateCities[st.iso2] || []).length === 0 ? (
													<p className="text-[10px] text-text-dim">No cities</p>
												) : (
													(stateCities[st.iso2] || []).map((city) => (
														<div
															key={`${city.name}-${city.stateCode}`}
															className="flex items-center justify-between gap-3 py-0.5 text-[11px]"
														>
															<span className="truncate text-text-muted">{city.name}</span>
															{city.population > 0 ? (
																<span className="shrink-0 text-text-dim">
																	{formatFull(city.population)}
																</span>
															) : null}
														</div>
													))
												)}
											</div>
										) : null}
									</div>
								))}
								{states.length > 50 ? (
									<p className="pt-2 text-center text-xs text-text-dim">
										...and {states.length - 50} more
									</p>
								) : null}
							</div>
						)}
					</Section>
				</div>
			</div>
		</div>
	)
}
