import { useState, useEffect } from 'react'
import { createGeocodedClient } from '@geocoded/client'

const client = createGeocodedClient({ apiUrl: import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me' })

export function Statistics() {
	const [loading, setLoading] = useState(true)
	const [topCountries, setTopCountries] = useState<any[]>([])

	useEffect(() => {
		client.fetchCountries().then((res) => {
			const sorted = [...res].sort((a, b) => (b.population || 0) - (a.population || 0))
			setTopCountries(sorted.slice(0, 10))
			setLoading(false)
		})
	}, [])

	if (loading) {
		return <div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm p-12">Compiling statistics...</div>
	}

	const maxPop = topCountries[0]?.population || 1

	return (
		<div className="flex flex-col gap-16 animate-fade-in">
			<div>
				<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">Global Stats</h1>
				<p className="text-white/60 text-lg">Macro-level data aggregation.</p>
			</div>

			<div>
				<h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 border-b border-white/20 pb-4">Most Populated Regions</h2>
				<div className="flex flex-col gap-4">
					{topCountries.map((c, i) => (
						<div key={c.iso2} className="lux-panel p-6 relative overflow-hidden group">
							<div
								className="absolute top-0 bottom-0 left-0 bg-white/5 transition-all duration-1000 -z-10"
								style={{ width: `${(c.population / maxPop) * 100}%` }}
							></div>
							<div className="flex justify-between items-center z-10">
								<div className="flex items-center gap-6">
									<div className="text-4xl grayscale group-hover:grayscale-0 transition-all">{c.emoji}</div>
									<div>
										<div className="font-mono text-white/40 text-xs mb-1">0{i + 1} // {c.iso2}</div>
										<div className="font-bold tracking-tight uppercase">{c.name}</div>
									</div>
								</div>
								<div className="text-right">
									<div className="font-mono text-white/40 text-[10px] uppercase tracking-widest mb-1">Population</div>
									<div className="font-bold text-xl">{c.population?.toLocaleString()}</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
