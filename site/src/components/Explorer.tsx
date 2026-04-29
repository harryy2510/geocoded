import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { type Country, fetchCountries } from '../lib/api'
import { formatCompact } from '../lib/format'
import { CountryCard } from './CountryCard'
import { CountryDetail } from './CountryDetail'

type SortField = 'name' | 'population' | 'areaSqKm' | 'gdp' | 'literacy'

function Pill({
	label,
	active,
	onClick,
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
				active
					? 'bg-accent text-white shadow-sm shadow-accent/20'
					: 'bg-bg-card/80 text-text-muted hover:bg-bg-card-hover hover:text-text'
			}`}
		>
			{label}
		</button>
	)
}

function Skeleton({ className = '' }: { className?: string }) {
	return <div className={`animate-pulse-subtle rounded-lg bg-bg-card ${className}`} />
}

export function Explorer() {
	const [countries, setCountries] = useState<Country[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedIso, setSelectedIso] = useState<string | null>(null)

	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [selectedRegions, setSelectedRegions] = useState<string[]>([])
	const [selectedContinent, setSelectedContinent] = useState<string>('')
	const [drivingSide, setDrivingSide] = useState<string>('')
	const [measurementSystem, setMeasurementSystem] = useState<string>('')
	const [popRange, setPopRange] = useState<[number, number]>([0, 1_500_000_000])
	const [sortField, setSortField] = useState<SortField>('name')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
	const [showFilters, setShowFilters] = useState(false)

	const debounceRef = useRef<ReturnType<typeof setTimeout>>()

	useEffect(() => {
		fetchCountries()
			.then(setCountries)
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => {
		clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 250)
		return () => clearTimeout(debounceRef.current)
	}, [searchQuery])

	const regions = useMemo(() => {
		const s = new Set<string>()
		for (const c of countries) if (c.region) s.add(c.region)
		return [...s].sort()
	}, [countries])

	const continents = useMemo(() => {
		const s = new Set<string>()
		for (const c of countries) if (c.continent) s.add(c.continent)
		return [...s].sort()
	}, [countries])

	const toggleRegion = useCallback((r: string) => {
		setSelectedRegions((prev) =>
			prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
		)
	}, [])

	const filtered = useMemo(() => {
		let result = [...countries]

		if (debouncedQuery) {
			const q = debouncedQuery.toLowerCase()
			result = result.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.capital?.toLowerCase().includes(q) ||
					c.iso2.toLowerCase() === q ||
					c.iso3.toLowerCase() === q,
			)
		}

		if (selectedRegions.length) {
			result = result.filter((c) => selectedRegions.includes(c.region))
		}

		if (selectedContinent) {
			result = result.filter((c) => c.continent === selectedContinent)
		}

		if (drivingSide) {
			result = result.filter((c) => c.drivingSide === drivingSide)
		}

		if (measurementSystem) {
			result = result.filter((c) => c.measurementSystem === measurementSystem)
		}

		result = result.filter(
			(c) => c.population >= popRange[0] && c.population <= popRange[1],
		)

		result.sort((a, b) => {
			const aVal = a[sortField] ?? 0
			const bVal = b[sortField] ?? 0
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return sortDir === 'asc'
					? aVal.localeCompare(bVal)
					: bVal.localeCompare(aVal)
			}
			return sortDir === 'asc'
				? (aVal as number) - (bVal as number)
				: (bVal as number) - (aVal as number)
		})

		return result
	}, [
		countries,
		debouncedQuery,
		selectedRegions,
		selectedContinent,
		drivingSide,
		measurementSystem,
		popRange,
		sortField,
		sortDir,
	])

	const selectedCountry = useMemo(
		() => countries.find((c) => c.iso2 === selectedIso) || null,
		[countries, selectedIso],
	)

	const activeFilterCount = useMemo(() => {
		let count = 0
		if (selectedRegions.length) count++
		if (selectedContinent) count++
		if (drivingSide) count++
		if (measurementSystem) count++
		if (popRange[0] > 0 || popRange[1] < 1_500_000_000) count++
		return count
	}, [selectedRegions, selectedContinent, drivingSide, measurementSystem, popRange])

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-full max-w-md" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 12 }, (_, i) => (
						<Skeleton key={i} className="h-40" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-text">Explorer</h1>
				<p className="mt-1.5 text-sm text-text-muted">
					Browse and filter {countries.length} countries
				</p>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<svg
						className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-dim"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						type="text"
						placeholder="Search countries, capitals, ISO codes..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-xl border border-border/60 bg-bg-card/60 py-2.5 pl-11 pr-4 text-sm text-text backdrop-blur-sm placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
					/>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowFilters(!showFilters)}
						className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
							showFilters || activeFilterCount > 0
								? 'border-accent/50 bg-accent/10 text-accent shadow-sm shadow-accent/10'
								: 'border-border/60 bg-bg-card/60 text-text-muted hover:border-border-hover backdrop-blur-sm'
						}`}
					>
						<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
							/>
						</svg>
						Filters
						{activeFilterCount > 0 ? (
							<span className="flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
								{activeFilterCount}
							</span>
						) : null}
					</button>
					<select
						value={`${sortField}-${sortDir}`}
						onChange={(e) => {
							const [f, d] = e.target.value.split('-') as [SortField, 'asc' | 'desc']
							setSortField(f)
							setSortDir(d)
						}}
						className="rounded-xl border border-border/60 bg-bg-card/60 px-3 py-2.5 text-sm text-text-muted backdrop-blur-sm focus:border-accent focus:outline-none"
					>
						<option value="name-asc">Name A-Z</option>
						<option value="name-desc">Name Z-A</option>
						<option value="population-desc">Population (high)</option>
						<option value="population-asc">Population (low)</option>
						<option value="areaSqKm-desc">Area (large)</option>
						<option value="areaSqKm-asc">Area (small)</option>
						<option value="gdp-desc">GDP (high)</option>
						<option value="literacy-desc">Literacy (high)</option>
					</select>
				</div>
			</div>

			{showFilters ? (
				<div className="animate-fade-in rounded-xl border border-border/50 bg-bg-card/40 backdrop-blur-sm overflow-hidden">
					{/* Region */}
					<div className="border-b border-border/30 p-5">
						<label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-text-dim">
							Region
						</label>
						<div className="flex flex-wrap gap-1.5">
							{regions.map((r) => (
								<Pill
									key={r}
									label={r}
									active={selectedRegions.includes(r)}
									onClick={() => toggleRegion(r)}
								/>
							))}
						</div>
					</div>

					{/* Other filters */}
					<div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
						<div>
							<label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-dim">
								Continent
							</label>
							<select
								value={selectedContinent}
								onChange={(e) => setSelectedContinent(e.target.value)}
								className="w-full rounded-lg border border-border/50 bg-bg-surface/80 px-3 py-2 text-sm text-text-muted focus:border-accent focus:outline-none"
							>
								<option value="">All</option>
								{continents.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-dim">
								Driving Side
							</label>
							<div className="flex gap-1.5">
								<Pill label="Any" active={!drivingSide} onClick={() => setDrivingSide('')} />
								<Pill
									label="Right"
									active={drivingSide === 'right'}
									onClick={() => setDrivingSide(drivingSide === 'right' ? '' : 'right')}
								/>
								<Pill
									label="Left"
									active={drivingSide === 'left'}
									onClick={() => setDrivingSide(drivingSide === 'left' ? '' : 'left')}
								/>
							</div>
						</div>

						<div>
							<label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-dim">
								Measurement
							</label>
							<div className="flex gap-1.5">
								<Pill label="Any" active={!measurementSystem} onClick={() => setMeasurementSystem('')} />
								<Pill
									label="Metric"
									active={measurementSystem === 'metric'}
									onClick={() =>
										setMeasurementSystem(measurementSystem === 'metric' ? '' : 'metric')
									}
								/>
								<Pill
									label="Imperial"
									active={measurementSystem === 'imperial'}
									onClick={() =>
										setMeasurementSystem(measurementSystem === 'imperial' ? '' : 'imperial')
									}
								/>
							</div>
						</div>

						<div>
							<label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-dim">
								Min Population
							</label>
							<input
								type="range"
								min={0}
								max={1_500_000_000}
								step={1_000_000}
								value={popRange[0]}
								onChange={(e) =>
									setPopRange([parseInt(e.target.value, 10), popRange[1]])
								}
								className="w-full accent-accent"
							/>
							<div className="text-xs text-text-dim">
								{formatCompact(popRange[0])}+
							</div>
						</div>
					</div>

					{activeFilterCount > 0 ? (
						<div className="border-t border-border/30 px-5 py-3">
							<button
								onClick={() => {
									setSelectedRegions([])
									setSelectedContinent('')
									setDrivingSide('')
									setMeasurementSystem('')
									setPopRange([0, 1_500_000_000])
								}}
								className="text-xs font-medium text-accent hover:underline"
							>
								Clear all filters
							</button>
						</div>
					) : null}
				</div>
			) : null}

			<div className="text-sm text-text-dim">
				{filtered.length} {filtered.length === 1 ? 'country' : 'countries'} found
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{filtered.map((country) => (
					<CountryCard
						key={country.iso2}
						country={country}
						onClick={() => setSelectedIso(country.iso2)}
					/>
				))}
			</div>

			{filtered.length === 0 ? (
				<div className="py-20 text-center">
					<div className="text-5xl">🔍</div>
					<p className="mt-4 text-sm text-text-muted">No countries match your filters</p>
					<button
						onClick={() => {
							setSearchQuery('')
							setSelectedRegions([])
							setSelectedContinent('')
							setDrivingSide('')
							setMeasurementSystem('')
							setPopRange([0, 1_500_000_000])
						}}
						className="mt-3 text-sm font-medium text-accent hover:underline"
					>
						Reset filters
					</button>
				</div>
			) : null}

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
