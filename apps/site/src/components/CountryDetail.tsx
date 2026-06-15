import { useState, useEffect } from 'react'
import { type Country, type State, type City, fetchStates, fetchCities } from '@geocoded/client'
import { formatFull, formatArea, formatPercent, formatDensity } from '../lib/format'

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

export function CountryDetail({
	country,
	onClose,
	onNavigate,
}: {
	country: Country
	onClose: () => void
	onNavigate?: (iso2: string) => void
}) {
	const [states, setStates] = useState<State[]>([])
	const [loadingStates, setLoadingStates] = useState(false)
	const [expandedState, setExpandedState] = useState<string | null>(null)
	const [stateCities, setStateCities] = useState<Record<string, City[]>>({})
	const [loadingCities, setLoadingCities] = useState<string | null>(null)

	useEffect(() => {
		setLoadingStates(true)
		fetchStates(country.iso2)
			.then((data) => setStates(data))
			.catch(() => setStates([]))
			.finally(() => setLoadingStates(false))
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

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
			<div className="relative flex w-full max-w-full flex-col overflow-y-auto bg-black/90 shadow-2xl border-l border-white/10 sm:max-w-md md:max-w-lg backdrop-blur-3xl">
				<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-5 py-5 backdrop-blur-xl sm:px-6">
					<div className="flex min-w-0 items-center gap-4">
						<span className="shrink-0 text-4xl drop-shadow-md">{country.emoji}</span>
						<div className="min-w-0">
							<h2 className="truncate text-xl font-extrabold text-white">{country.name}</h2>
							<p className="truncate text-xs font-medium text-text-muted mt-0.5">{country.native}</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition-all hover:bg-white/10 hover:text-white"
					>
						<svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="p-4 sm:p-5">
					<div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
						{[
							['Capital', country.capital],
							['Region', `${country.continent} / ${country.region}`],
							['Subregion', country.subregion],
							['Population', formatFull(country.population)],
							['Area', formatArea(country.areaSqKm)],
							['Density', formatDensity(country.population, country.areaSqKm)],
							['GDP', country.gdp ? `$${formatFull(country.gdp)}M` : 'N/A'],
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
							<div key={label} className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
								<div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</div>
								<div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
							</div>
						))}
					</div>

					{country.languages?.length > 0 ? (
						<Section title="Languages">
							<div className="flex flex-wrap gap-1.5">
								{country.languages.map((lang) => (
									<Badge key={lang}>{lang}</Badge>
								))}
							</div>
						</Section>
					) : null}

					{country.neighbours?.length > 0 ? (
						<Section title="Neighbours">
							<div className="flex flex-wrap gap-1.5">
								{country.neighbours.map((n) => (
									<Badge key={n} onClick={onNavigate ? () => onNavigate(n) : undefined}>
										{n}
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
