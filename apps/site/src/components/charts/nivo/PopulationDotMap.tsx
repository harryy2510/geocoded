import { useMemo } from 'react'
import MapView, { Marker, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { formatCompact, formatFull } from '../../../lib/format'
import { continentColor, continentName } from '../nivoTheme'
import { ChartFrame, ChartEmpty } from './frame'

// A REAL world map: carto dark-matter basemap (actual continents, coastlines and
// borders) with our cities plotted on top. Each dot is a city —
//   • SIZE  = population (bigger city → bigger dot)
//   • COLOR = continent (so the dot ties into the rest of the page)
// The land is drawn by the basemap; the data comes from /v2/cities.
export type CityPoint = {
	name: string
	countryName: string
	countryCode: string
	latitude: string
	longitude: string
	population: number
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Continents present in the data, for the legend.
const LEGEND_CONTINENTS = ['AS', 'AF', 'EU', 'NA', 'SA', 'OC']

export function PopulationDotMap({
	cities,
	continentByCountry,
}: {
	cities: CityPoint[]
	// Optional iso2 → continent code lookup; without it, dots fall back to one color.
	continentByCountry?: Map<string, string>
}) {
	const points = useMemo(() => {
		return cities
			.map((c) => ({
				name: c.name,
				country: c.countryName,
				continent: continentByCountry?.get(c.countryCode.toUpperCase()) ?? '',
				lng: Number(c.longitude),
				lat: Number(c.latitude),
				pop: c.population || 0,
			}))
			.filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat) && p.pop > 0)
			// Largest last so they paint on top.
			.sort((a, b) => a.pop - b.pop)
	}, [cities, continentByCountry])

	const maxPop = useMemo(() => points.reduce((m, p) => Math.max(m, p.pop), 0), [points])

	if (points.length === 0) return <ChartEmpty label="Loading map…" />

	const size = (pop: number) => 4 + Math.sqrt(pop / maxPop) * 26

	return (
		<ChartFrame height={520} mobileHeight={340}>
			<div className="relative h-full w-full overflow-hidden rounded-sm">
				<MapView
					initialViewState={{ longitude: 10, latitude: 25, zoom: 1.1 }}
					mapStyle={MAP_STYLE}
					attributionControl={false}
					reuseMaps
					dragRotate={false}
					maxZoom={6}
					minZoom={0.6}
				>
					<NavigationControl position="top-right" showCompass={false} />
					{points.map((p, i) => {
						const s = size(p.pop)
						const c = continentColor(p.continent)
						return (
							<Marker key={`${p.name}-${i}`} longitude={p.lng} latitude={p.lat} anchor="center">
								<div
									title={`${p.name}, ${p.country} — ${formatFull(p.pop)} people`}
									style={{
										width: s,
										height: s,
										borderRadius: '9999px',
										background: c,
										opacity: 0.72,
										boxShadow: `0 0 ${s / 2}px ${c}55`,
									}}
								/>
							</Marker>
						)
					})}
				</MapView>

				{/* Legend — explains color (continent) and size (population). */}
				<div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-3 border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
					<div>
						<div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
							Color · continent
						</div>
						<div className="flex flex-wrap gap-x-3 gap-y-1">
							{LEGEND_CONTINENTS.map((code) => (
								<span key={code} className="flex items-center gap-1.5 text-[10px] text-white/65">
									<span
										className="inline-block h-2.5 w-2.5 rounded-full"
										style={{ background: continentColor(code) }}
									/>
									{continentName(code)}
								</span>
							))}
						</div>
					</div>
					<div>
						<div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
							Size · population
						</div>
						<div className="flex items-end gap-3">
							{[100_000, 1_000_000, 10_000_000].map((pop) => (
								<span key={pop} className="flex items-center gap-1.5 text-[10px] text-white/65">
									<span
										className="inline-block rounded-full bg-white/55"
										style={{ width: size(pop), height: size(pop) }}
									/>
									{formatCompact(pop)}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</ChartFrame>
	)
}
