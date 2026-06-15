import { useState, useEffect } from 'react'
import { createGeocodedClient } from '@geocoded/client'

const client = createGeocodedClient({ apiUrl: import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me' })

const SORTS = [
	{ value: 'name-asc', label: 'NAME A-Z' },
	{ value: 'name-desc', label: 'NAME Z-A' },
	{ value: 'population-desc', label: 'POPULATION (HIGH)' },
	{ value: 'population-asc', label: 'POPULATION (LOW)' },
	{ value: 'areaSqKm-desc', label: 'AREA (LARGE)' },
	{ value: 'areaSqKm-asc', label: 'AREA (SMALL)' },
	{ value: 'gdp-desc', label: 'GDP (HIGH)' },
	{ value: 'literacy-desc', label: 'LITERACY (HIGH)' },
]

export function Explorer() {
	const [countries, setCountries] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	
	const [search, setSearch] = useState('')
	const [sortKey, setSortKey] = useState('name-asc')
	const [showSort, setShowSort] = useState(false)
	const [selected, setSelected] = useState<any | null>(null)

	const [showFilters, setShowFilters] = useState(false)
	const [selectedRegions, setSelectedRegions] = useState<string[]>([])
	const [selectedContinent, setSelectedContinent] = useState<string>('')
	const [drivingSide, setDrivingSide] = useState<string>('')
	const [measurementSystem, setMeasurementSystem] = useState<string>('')

	useEffect(() => {
		client.fetchCountries().then((res) => {
			setCountries(res)
			setLoading(false)
		})
	}, [])

	const regions = Array.from(new Set(countries.map(c => c.region).filter(Boolean))).sort()
	const continents = Array.from(new Set(countries.map(c => c.continent).filter(Boolean))).sort()

	const toggleRegion = (r: string) => {
		if (selectedRegions.includes(r)) setSelectedRegions(selectedRegions.filter(x => x !== r))
		else setSelectedRegions([...selectedRegions, r])
	}

	let filtered = [...countries]

	if (search) {
		const q = search.toLowerCase()
		filtered = filtered.filter(c =>
			c.name.toLowerCase().includes(q) ||
			c.iso2.toLowerCase().includes(q) ||
			c.capital?.toLowerCase().includes(q)
		)
	}

	if (selectedRegions.length) filtered = filtered.filter((c) => selectedRegions.includes(c.region))
	if (selectedContinent) filtered = filtered.filter((c) => c.continent === selectedContinent)
	if (drivingSide) filtered = filtered.filter((c) => c.drivingSide === drivingSide)
	if (measurementSystem) filtered = filtered.filter((c) => c.measurementSystem === measurementSystem)

	filtered.sort((a, b) => {
		const [sortField, sortDir] = sortKey.split('-')
		const aVal = a[sortField] ?? 0
		const bVal = b[sortField] ?? 0
		if (typeof aVal === 'string' && typeof bVal === 'string') {
			return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
		}
		return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
	})

	const activeSort = SORTS.find(s => s.value === sortKey)

	return (
		<div className="flex flex-col gap-12 animate-fade-in">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
				<div>
					<h1 class="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">Explorer</h1>
					<p class="text-white/60 text-lg">Query global intelligence.</p>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full md:w-auto relative z-20">
					<button 
						onClick={() => setShowFilters(!showFilters)}
						className={`lux-input text-lg font-bold tracking-tighter uppercase pb-2 border-b transition-colors text-left ${showFilters ? 'border-white text-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
					>
						FILTERS {showFilters ? '[-]' : '[+]'}
					</button>
					<input
						type="text"
						placeholder="SEARCH ISO2 OR NAME"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="lux-input text-lg md:text-2xl font-bold tracking-tighter uppercase w-full md:w-80 pb-2"
					/>
					<div className="relative">
						<button 
							onClick={() => setShowSort(!showSort)}
							className="lux-input text-lg font-bold tracking-tighter uppercase pb-2 border-b border-white/20 hover:border-white transition-colors flex items-center justify-between gap-4 w-full sm:w-56 text-left"
						>
							<span className="truncate">{activeSort?.label}</span>
							<span className="text-white/40">{showSort ? '▲' : '▼'}</span>
						</button>
						{showSort && (
							<div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/20 flex flex-col shadow-2xl">
								{SORTS.map(s => (
									<button
										key={s.value}
										onClick={() => { setSortKey(s.value); setShowSort(false) }}
										className={`text-left px-4 py-3 text-sm font-bold tracking-widest uppercase hover:bg-white/10 ${sortKey === s.value ? 'text-white bg-white/5' : 'text-white/50'}`}
									>
										{s.label}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{showFilters && (
				<div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-6 animate-fade-in relative z-10">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						<div>
							<div className="text-xs uppercase tracking-widest text-white/40 mb-3 font-bold">Region</div>
							<div className="flex flex-wrap gap-2">
								{regions.map(r => (
									<button 
										key={r as string} 
										onClick={() => toggleRegion(r as string)}
										className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${selectedRegions.includes(r as string) ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
									>
										{r as string}
									</button>
								))}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase tracking-widest text-white/40 mb-3 font-bold">Continent</div>
							<div className="flex flex-wrap gap-2">
								<button 
									onClick={() => setSelectedContinent('')}
									className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${!selectedContinent ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
								>ANY</button>
								{continents.map(c => (
									<button 
										key={c as string} 
										onClick={() => setSelectedContinent(c as string)}
										className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${selectedContinent === c ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
									>
										{c as string}
									</button>
								))}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase tracking-widest text-white/40 mb-3 font-bold">Driving Side</div>
							<div className="flex flex-wrap gap-2">
								{['', 'right', 'left'].map(side => (
									<button 
										key={side} 
										onClick={() => setDrivingSide(side)}
										className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${drivingSide === side ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
									>
										{side || 'ANY'}
									</button>
								))}
							</div>
						</div>
						<div>
							<div className="text-xs uppercase tracking-widest text-white/40 mb-3 font-bold">Measurement</div>
							<div className="flex flex-wrap gap-2">
								{['', 'metric', 'imperial'].map(sys => (
									<button 
										key={sys} 
										onClick={() => setMeasurementSystem(sys)}
										className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${measurementSystem === sys ? 'bg-white text-black border-white' : 'border-white/20 hover:border-white text-white/60 hover:text-white'}`}
									>
										{sys || 'ANY'}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{loading ? (
				<div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm relative z-0">Initializing link...</div>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-white/10 border border-white/10 relative z-0">
					{filtered.map(c => (
						<button
							key={c.iso2}
							onClick={() => setSelected(c)}
							className="bg-black p-6 flex flex-col items-start text-left hover:bg-white/5 transition-colors group"
						>
							<span className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">{c.emoji}</span>
							<span className="font-mono text-xs text-white/40 mb-2">{c.iso2}</span>
							<span className="font-bold uppercase tracking-tight text-sm truncate w-full group-hover:text-white text-white/80">{c.name}</span>
						</button>
					))}
				</div>
			)}

			{selected && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
					<div className="lux-panel relative z-10 w-full max-w-2xl p-10 flex flex-col gap-8 max-h-[90vh] overflow-y-auto">
						<div className="flex justify-between items-start">
							<div>
								<div className="text-6xl mb-4">{selected.emoji}</div>
								<h2 className="text-4xl font-bold uppercase tracking-tighter mb-2">{selected.name}</h2>
								<div className="font-mono text-white/40 text-sm">{selected.native}</div>
							</div>
							<button onClick={() => setSelected(null)} className="text-white/40 hover:text-white uppercase tracking-widest text-xs font-bold">Close [X]</button>
						</div>

						<div className="grid grid-cols-2 gap-px bg-white/10">
							<div className="bg-black p-4">
								<div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Capital</div>
								<div className="font-bold">{selected.capital || 'N/A'}</div>
							</div>
							<div className="bg-black p-4">
								<div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Region</div>
								<div className="font-bold">{selected.region}</div>
							</div>
							<div className="bg-black p-4">
								<div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Population</div>
								<div className="font-bold">{selected.population?.toLocaleString() || 'N/A'}</div>
							</div>
							<div className="bg-black p-4">
								<div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Currency</div>
								<div className="font-bold">{selected.currency}</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
