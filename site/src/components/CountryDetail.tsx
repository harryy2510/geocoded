import { useState, useEffect } from 'react'
import { type Country, type State, type City, fetchStates, fetchCities } from '../lib/api'
import { formatFull, formatArea, formatPercent, formatDensity } from '../lib/format'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mt-5">
			<h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-dim">{title}</h4>
			{children}
		</div>
	)
}

function Badge({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
	const Tag = onClick ? 'button' : 'span'
	return (
		<Tag
			onClick={onClick}
			className={`inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted ${onClick ? 'cursor-pointer transition-colors hover:border-accent hover:text-accent' : ''}`}
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
				const cities = Array.isArray(result) ? result : result.data
				setStateCities((prev) => ({ ...prev, [stateCode]: cities }))
			} catch {
				setStateCities((prev) => ({ ...prev, [stateCode]: [] }))
			} finally {
				setLoadingCities(null)
			}
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
			<div className="relative flex w-full max-w-lg flex-col overflow-y-auto bg-bg-surface shadow-2xl sm:max-w-md">
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg-surface/90 px-5 py-4 backdrop-blur-md">
					<div className="flex items-center gap-3">
						<span className="text-3xl">{country.emoji}</span>
						<div>
							<h2 className="text-lg font-bold text-text">{country.name}</h2>
							<p className="text-xs text-text-muted">{country.native}</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-card hover:text-text"
					>
						<svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div className="p-5">
					<div className="grid grid-cols-2 gap-3">
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
							<div key={label} className="rounded-lg bg-bg-card px-3 py-2">
								<div className="text-[10px] font-medium uppercase tracking-wider text-text-dim">{label}</div>
								<div className="mt-0.5 text-sm text-text">{value}</div>
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
										className="flex items-center justify-between rounded-lg bg-bg-card px-3 py-1.5 text-xs"
									>
										<span className="text-text-muted">{tz.zoneName}</span>
										<span className="font-mono text-text-dim">{tz.gmtOffsetName}</span>
									</div>
								))}
							</div>
						</Section>
					) : null}

					{country.translations && Object.keys(country.translations).length > 0 ? (
						<Section title="Translations">
							<div className="grid grid-cols-2 gap-1">
								{Object.entries(country.translations)
									.slice(0, 20)
									.map(([lang, name]) => (
										<div key={lang} className="flex items-center gap-2 rounded px-2 py-1 text-xs">
											<span className="font-mono uppercase text-text-dim">{lang}</span>
											<span className="truncate text-text-muted">{name}</span>
										</div>
									))}
							</div>
						</Section>
					) : null}

					<Section title={`States ${states.length > 0 ? `(${states.length})` : ''}`}>
						{loadingStates ? (
							<div className="space-y-1.5">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-8 animate-pulse-subtle rounded-lg bg-bg-card" />
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
											className="flex w-full items-center justify-between rounded-lg bg-bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-bg-card-hover"
										>
											<span className="text-text">{st.name}</span>
											<span className="text-text-dim">
												{st.population ? formatFull(st.population) : st.type}
											</span>
										</button>
										{expandedState === st.iso2 ? (
											<div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
												{loadingCities === st.iso2 ? (
													<div className="h-5 w-32 animate-pulse-subtle rounded bg-bg-card" />
												) : (stateCities[st.iso2] || []).length === 0 ? (
													<p className="text-[10px] text-text-dim">No cities</p>
												) : (
													(stateCities[st.iso2] || []).map((city) => (
														<div
															key={`${city.name}-${city.stateCode}`}
															className="flex items-center justify-between py-0.5 text-[11px]"
														>
															<span className="text-text-muted">{city.name}</span>
															{city.population > 0 ? (
																<span className="text-text-dim">
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
