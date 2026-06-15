import { useEffect, useMemo, useState } from 'react'
import { createGeocodedClient, type Country } from '@geocoded/client'
import { formatCompact } from '../lib/format'
import { CountryDetail } from './CountryDetail'

const client = createGeocodedClient({
	apiUrl: import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me',
})

const SORTS = [
	{ value: 'name-asc', label: 'Name A-Z' },
	{ value: 'name-desc', label: 'Name Z-A' },
	{ value: 'population-desc', label: 'Population High' },
	{ value: 'population-asc', label: 'Population Low' },
	{ value: 'areaSqKm-desc', label: 'Area Large' },
	{ value: 'areaSqKm-asc', label: 'Area Small' },
	{ value: 'gdp-desc', label: 'GDP High' },
	{ value: 'literacy-desc', label: 'Literacy High' },
]

function sortValue(country: Country, key: string): string | number {
	switch (key) {
		case 'name':
			return country.name
		case 'population':
			return country.population || 0
		case 'areaSqKm':
			return country.areaSqKm || 0
		case 'gdp':
			return country.gdp || 0
		case 'literacy':
			return country.literacy || 0
		default:
			return country.name
	}
}

export function Explorer() {
	const [countries, setCountries] = useState<Country[]>([])
	const [loading, setLoading] = useState(true)

	const [search, setSearch] = useState('')
	const [sortKey, setSortKey] = useState('name-asc')
	const [showSort, setShowSort] = useState(false)
	const [selected, setSelected] = useState<Country | null>(null)

	const [showFilters, setShowFilters] = useState(false)
	const [selectedRegions, setSelectedRegions] = useState<string[]>([])
	const [selectedContinent, setSelectedContinent] = useState('')
	const [drivingSide, setDrivingSide] = useState('')
	const [measurementSystem, setMeasurementSystem] = useState('')

	useEffect(() => {
		client.fetchCountries().then((res) => {
			setCountries(res)
			setLoading(false)
		})
	}, [])

	const regions = useMemo(
		() => Array.from(new Set(countries.map((c) => c.region).filter(Boolean))).sort(),
		[countries]
	)
	const continents = useMemo(
		() =>
			Array.from(new Set(countries.map((c) => c.continent).filter(Boolean))).sort(),
		[countries]
	)

	const toggleRegion = (region: string) => {
		setSelectedRegions((current) =>
			current.includes(region)
				? current.filter((item) => item !== region)
				: [...current, region]
		)
	}

	const filtered = useMemo(() => {
		let result = [...countries]

		if (search) {
			const q = search.toLowerCase()
			result = result.filter(
				(country) =>
					country.name.toLowerCase().includes(q) ||
					country.iso2.toLowerCase().includes(q) ||
					country.iso3.toLowerCase().includes(q) ||
					country.capital?.toLowerCase().includes(q) ||
					country.currency?.toLowerCase().includes(q) ||
					country.region?.toLowerCase().includes(q)
			)
		}

		if (selectedRegions.length) {
			result = result.filter((country) => selectedRegions.includes(country.region))
		}
		if (selectedContinent) {
			result = result.filter((country) => country.continent === selectedContinent)
		}
		if (drivingSide) {
			result = result.filter((country) => country.drivingSide === drivingSide)
		}
		if (measurementSystem) {
			result = result.filter(
				(country) => country.measurementSystem === measurementSystem
			)
		}

		result.sort((a, b) => {
			const [field, direction] = sortKey.split('-')
			const aVal = sortValue(a, field)
			const bVal = sortValue(b, field)
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return direction === 'asc'
					? aVal.localeCompare(bVal)
					: bVal.localeCompare(aVal)
			}
			return direction === 'asc'
				? Number(aVal) - Number(bVal)
				: Number(bVal) - Number(aVal)
		})

		return result
	}, [
		countries,
		search,
		selectedRegions,
		selectedContinent,
		drivingSide,
		measurementSystem,
		sortKey,
	])

	const activeSort = SORTS.find((sort) => sort.value === sortKey) || SORTS[0]
	const activeFilterCount =
		selectedRegions.length +
		(selectedContinent ? 1 : 0) +
		(drivingSide ? 1 : 0) +
		(measurementSystem ? 1 : 0)

	return (
		<div className="flex flex-col gap-10 animate-fade-in">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">
						Explorer
					</h1>
					<p className="text-white/60 text-lg">
						Browse countries, compare key fields, and open full country records.
					</p>
				</div>

				<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
					<label className="block min-w-0">
						<span className="mb-3 block text-xs font-bold uppercase tracking-widest text-white/40">
							Search
						</span>
						<input
							type="text"
							placeholder="Search countries, capitals, ISO codes..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="lux-input h-14 w-full min-w-0 px-0 text-xl font-bold tracking-tighter uppercase placeholder:text-white/30"
						/>
					</label>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:justify-end">
						<button
							onClick={() => setShowFilters(!showFilters)}
							className={`lux-panel h-14 px-5 text-left text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/5 ${
								showFilters ? 'border-white text-white' : 'text-white/70'
							}`}
						>
							Filters {activeFilterCount ? `(${activeFilterCount})` : '[+]'}
						</button>

						<div className="relative">
							<button
								onClick={() => setShowSort(!showSort)}
								className="lux-panel flex h-14 min-w-56 items-center justify-between gap-5 px-5 text-left text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/5"
							>
								<span className="truncate">{activeSort.label}</span>
								<span className="text-white/40">{showSort ? '▲' : '▼'}</span>
							</button>
							{showSort ? (
								<div className="absolute right-0 top-full z-30 mt-2 w-64 border border-white/20 bg-black shadow-2xl">
									{SORTS.map((sort) => (
										<button
											key={sort.value}
											onClick={() => {
												setSortKey(sort.value)
												setShowSort(false)
											}}
											className={`block w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest hover:bg-white/10 ${
												sortKey === sort.value
													? 'bg-white/10 text-white'
													: 'text-white/50'
											}`}
										>
											{sort.label}
										</button>
									))}
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>

			{showFilters ? (
				<div className="border border-white/10 bg-white/[0.02] p-6 animate-fade-in">
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
						<div>
							<div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">
								Region
							</div>
							<div className="flex flex-wrap gap-2">
								{regions.map((region) => (
									<button
										key={region}
										onClick={() => toggleRegion(region)}
										className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
											selectedRegions.includes(region)
												? 'border-white bg-white text-black'
												: 'border-white/20 text-white/60 hover:border-white hover:text-white'
										}`}
									>
										{region}
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">
								Continent
							</div>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setSelectedContinent('')}
									className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
										!selectedContinent
											? 'border-white bg-white text-black'
											: 'border-white/20 text-white/60 hover:border-white hover:text-white'
									}`}
								>
									Any
								</button>
								{continents.map((continent) => (
									<button
										key={continent}
										onClick={() => setSelectedContinent(continent)}
										className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
											selectedContinent === continent
												? 'border-white bg-white text-black'
												: 'border-white/20 text-white/60 hover:border-white hover:text-white'
										}`}
									>
										{continent}
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">
								Driving side
							</div>
							<div className="flex flex-wrap gap-2">
								{['', 'right', 'left'].map((side) => (
									<button
										key={side}
										onClick={() => setDrivingSide(side)}
										className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
											drivingSide === side
												? 'border-white bg-white text-black'
												: 'border-white/20 text-white/60 hover:border-white hover:text-white'
										}`}
									>
										{side || 'Any'}
									</button>
								))}
							</div>
						</div>

						<div>
							<div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">
								Measurement
							</div>
							<div className="flex flex-wrap gap-2">
								{['', 'metric', 'imperial'].map((system) => (
									<button
										key={system}
										onClick={() => setMeasurementSystem(system)}
										className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
											measurementSystem === system
												? 'border-white bg-white text-black'
												: 'border-white/20 text-white/60 hover:border-white hover:text-white'
										}`}
									>
										{system || 'Any'}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			) : null}

			<div className="text-sm font-mono uppercase tracking-widest text-white/35">
				{loading ? 'Loading countries...' : `${filtered.length} countries found`}
			</div>

			{loading ? null : (
				<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
					{filtered.map((country) => (
						<button
							key={country.iso2}
							onClick={() => setSelected(country)}
							className="group flex min-h-[190px] flex-col bg-black p-6 text-left transition-colors hover:bg-white/[0.06]"
						>
							<div className="flex items-start justify-between gap-3">
								<span className="text-3xl leading-none drop-shadow-md transition-transform group-hover:scale-110">
									{country.emoji}
								</span>
								<span className="max-w-28 truncate border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
									{country.region || country.continent}
								</span>
							</div>

							<div className="mt-8 min-w-0">
								<div className="mb-2 font-mono text-xs text-white/35">{country.iso2}</div>
								<h3 className="truncate text-base font-bold uppercase tracking-tight text-white/85 group-hover:text-white">
									{country.name}
								</h3>
								<p className="mt-1 truncate text-sm text-white/45">
									{country.capital || 'No capital'}
								</p>
							</div>

							<div className="mt-auto flex items-end justify-between gap-4 border-t border-white/10 pt-4">
								<div>
									<div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
										Pop.
									</div>
									<div className="mt-1 text-sm font-semibold text-white/70">
										{formatCompact(country.population)}
									</div>
								</div>
								<div className="text-right">
									<div className="text-[10px] font-bold uppercase tracking-widest text-white/30">
										Currency
									</div>
									<div className="mt-1 font-mono text-sm font-semibold text-white/55">
										{country.currency || 'N/A'}
									</div>
								</div>
							</div>
						</button>
					))}
				</div>
			)}

			{selected ? (
				<CountryDetail
					country={selected}
					countries={countries}
					onClose={() => setSelected(null)}
					onNavigate={(iso2) => {
						const nextCountry = countries.find((country) => country.iso2 === iso2)
						if (nextCountry) setSelected(nextCountry)
					}}
				/>
			) : null}
		</div>
	)
}
