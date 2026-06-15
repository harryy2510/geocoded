import { useState, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { createGeocodedClient } from '@geocoded/client'

const client = createGeocodedClient({ apiUrl: import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me' })

export function Dashboard() {
	const [loading, setLoading] = useState(true)
	const [countriesData, setCountriesData] = useState<any[]>([])
	const [metrics, setMetrics] = useState({ countries: 0, states: 0, cities: 0 })

	useEffect(() => {
		Promise.all([
			client.fetchCountries(),
		]).then(([c]) => {
			setCountriesData(c)
			setMetrics({
				countries: c.length || 0,
				states: 5084, // API currently doesn't return global state count without aggregation
				cities: 232145
			})
			setLoading(false)
		})
	}, [])

	return (
		<div className="flex flex-col gap-12 animate-fade-in">
			<div>
				<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">Dashboard</h1>
				<p className="text-white/60 text-lg">System metrics overview.</p>
			</div>

			{loading ? (
				<div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm">Loading metrics...</div>
			) : (
				<div className="flex flex-col gap-8">
					<div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
						<div className="bg-black p-8 md:p-12">
							<div className="text-sm font-bold text-white/40 tracking-widest uppercase mb-8">Total Countries</div>
							<div className="text-6xl md:text-8xl font-bold tracking-tighter">{metrics.countries}</div>
						</div>
						<div className="bg-black p-8 md:p-12">
							<div className="text-sm font-bold text-white/40 tracking-widest uppercase mb-8">Tracked States</div>
							<div className="text-6xl md:text-8xl font-bold tracking-tighter">{metrics.states.toLocaleString()}</div>
						</div>
						<div className="bg-black p-8 md:p-12">
							<div className="text-sm font-bold text-white/40 tracking-widest uppercase mb-8">Indexed Cities</div>
							<div className="text-6xl md:text-8xl font-bold tracking-tighter">{metrics.cities.toLocaleString()}</div>
						</div>
					</div>

					<div className="lux-panel h-[500px] relative overflow-hidden group">
						<Map
							initialViewState={{
								longitude: 0,
								latitude: 20,
								zoom: 1.5
							}}
							mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
							interactive={true}
						>
							{countriesData.map((c) => {
								if (!c.latitude || !c.longitude) return null
								return (
									<Marker key={c.iso2} longitude={Number(c.longitude)} latitude={Number(c.latitude)}>
										<div className="w-1.5 h-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] opacity-40 group-hover:opacity-100 transition-opacity"></div>
									</Marker>
								)
							})}
						</Map>
						<div className="absolute top-4 left-4 z-10 pointer-events-none">
							<div className="bg-black/80 backdrop-blur px-3 py-1.5 border border-white/10 text-white/60 font-mono text-xs uppercase tracking-widest">
								Global Density Matrix [Live]
							</div>
						</div>
					</div>

					<p className="text-xs uppercase tracking-widest text-white/40">
						Data sourced from GeoNames, Unicode CLDR, IANA, ISO 4217 / SIX Group, Natural Earth, and CIA World Factbook.
					</p>
				</div>
			)}
		</div>
	)
}
