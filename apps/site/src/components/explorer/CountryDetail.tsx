import { type ReactNode, useEffect, useState } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { formatCompact, formatFull, resolveContinentName } from '../../lib/format'
import { nivoTheme } from '../charts/nivoTheme'
import { ChartTooltip } from '../charts/ChartTooltip'
import { ChartFrame, motionProps } from '../charts/nivo/frame'
import { fetchV2List } from './api'
import { dash, flagEmoji, formatOffset, formatToken } from './helpers'
import { Badge, DetailDrawer, Fact, FactGrid, Section } from './ui'
import {
	type AirlineRecord,
	type AirportRecord,
	type CityRecord,
	type CountryRecord,
	type CountryStatistics,
	type CurrencyRecord,
	type PortRecord,
	type StateRecord,
	type StatMetric,
	type TimezoneRecord,
} from './records'

// ---------------------------------------------------------------------------
// Related-data shapes (subset returned for this country via filter[country]).
// ---------------------------------------------------------------------------

type MigrationOrigin = {
	countryCode: string
	countryName: string
	iso3: string
	count: number | null
	shareOfMigrantsPercent: number | null
}

type MigrationRecord = {
	countryCode: string
	countryName: string
	iso3: string
	year: number | null
	totalInternationalMigrants: number | null
	maleInternationalMigrants: number | null
	femaleInternationalMigrants: number | null
	migrantShareOfPopulationPercent: number | null
	origins: MigrationOrigin[]
}

type Related = {
	states: StateRecord[]
	statesTotal: number
	cities: CityRecord[]
	citiesTotal: number
	airports: AirportRecord[]
	airportsTotal: number
	airlines: AirlineRecord[]
	airlinesTotal: number
	ports: PortRecord[]
	portsTotal: number
	borders: PortRecord[]
	bordersTotal: number
	timezones: TimezoneRecord[]
	currencies: CurrencyRecord[]
	migration: MigrationRecord | null
}

const emptyRelated: Related = {
	states: [],
	statesTotal: 0,
	cities: [],
	citiesTotal: 0,
	airports: [],
	airportsTotal: 0,
	airlines: [],
	airlinesTotal: 0,
	ports: [],
	portsTotal: 0,
	borders: [],
	bordersTotal: 0,
	timezones: [],
	currencies: [],
	migration: null,
}

// ---------------------------------------------------------------------------
// Metric formatting.
// ---------------------------------------------------------------------------

function metricValue(metric: StatMetric | undefined): number | null {
	return metric && metric.value != null ? metric.value : null
}

function fmtMetricFull(metric: StatMetric | undefined, suffix = ''): string {
	const value = metricValue(metric)
	return value == null ? 'N/A' : `${formatFull(Math.round(value))}${suffix}`
}

function fmtMetricCompact(metric: StatMetric | undefined, suffix = ''): string {
	const value = metricValue(metric)
	return value == null ? 'N/A' : `${formatCompact(value)}${suffix}`
}

function fmtUsd(metric: StatMetric | undefined): string {
	const value = metricValue(metric)
	return value == null ? 'N/A' : `$${formatCompact(value)}`
}

function fmtPercent(metric: StatMetric | undefined): string {
	const value = metricValue(metric)
	return value == null ? 'N/A' : `${value.toFixed(1)}%`
}

function fmtYears(metric: StatMetric | undefined): string {
	const value = metricValue(metric)
	return value == null ? 'N/A' : `${value.toFixed(1)} yrs`
}

// ---------------------------------------------------------------------------
// Small nivo touches.
// ---------------------------------------------------------------------------

type AgeDatum = {
	band: string
	'Ages 0–14': number
	'Ages 15–64': number
	'Ages 65+': number
}

const AGE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b']

function AgeStructureMini({ stats }: { stats: CountryStatistics }) {
	const young = metricValue(stats.age0To14Percent)
	const working = metricValue(stats.age15To64Percent)
	const old = metricValue(stats.age65PlusPercent)
	if (young == null && working == null && old == null) return null

	const data: AgeDatum[] = [
		{
			band: 'Age',
			'Ages 0–14': young ?? 0,
			'Ages 15–64': working ?? 0,
			'Ages 65+': old ?? 0,
		},
	]

	return (
		<Section title="Age structure">
			<div className="border border-white/10 bg-white/[0.02] p-4">
				<ChartFrame height={120} mobileHeight={120}>
					<ResponsiveBar
						data={data}
						keys={['Ages 0–14', 'Ages 15–64', 'Ages 65+']}
						indexBy="band"
						layout="horizontal"
						theme={nivoTheme}
						margin={{ top: 8, right: 8, bottom: 28, left: 8 }}
						padding={0.4}
						colors={AGE_COLORS}
						borderRadius={3}
						enableGridX={false}
						enableGridY={false}
						axisLeft={null}
						axisBottom={{ tickSize: 0, tickPadding: 6, format: (v: number) => `${v}%` }}
						labelSkipWidth={28}
						labelTextColor="rgba(255,255,255,0.95)"
						valueFormat={(v) => `${v.toFixed(0)}%`}
						{...motionProps}
						tooltip={(props) => (
							<ChartTooltip
								title={String(props.id)}
								rows={[{ color: props.color, label: 'Share', value: `${props.value.toFixed(1)}%` }]}
							/>
						)}
						legends={[
							{
								anchor: 'bottom',
								direction: 'row',
								translateY: 26,
								itemWidth: 92,
								itemHeight: 16,
								itemTextColor: '#a1a1aa',
								symbolSize: 10,
								symbolShape: 'circle',
							},
						]}
					/>
				</ChartFrame>
			</div>
		</Section>
	)
}

type SexDatum = {
	split: string
	Female: number
	Male: number
}

const SEX_COLORS = ['#ec4899', '#3b82f6']

function SexSplitMini({ stats }: { stats: CountryStatistics }) {
	const female = metricValue(stats.populationFemale)
	const male = metricValue(stats.populationMale)
	if (female == null && male == null) return null

	const total = (female ?? 0) + (male ?? 0)
	const femalePct = total > 0 ? ((female ?? 0) / total) * 100 : 0
	const malePct = total > 0 ? ((male ?? 0) / total) * 100 : 0

	const data: SexDatum[] = [
		{
			split: 'Sex',
			Female: female ?? 0,
			Male: male ?? 0,
		},
	]

	return (
		<Section title={`Sex split · ${femalePct.toFixed(1)}% F / ${malePct.toFixed(1)}% M`}>
			<div className="border border-white/10 bg-white/[0.02] p-4">
				<ChartFrame height={110} mobileHeight={110}>
					<ResponsiveBar
						data={data}
						keys={['Female', 'Male']}
						indexBy="split"
						layout="horizontal"
						theme={nivoTheme}
						margin={{ top: 8, right: 8, bottom: 28, left: 8 }}
						padding={0.5}
						colors={SEX_COLORS}
						borderRadius={3}
						enableGridX={false}
						enableGridY={false}
						axisLeft={null}
						axisBottom={{ tickSize: 0, tickPadding: 6, format: (v: number) => formatCompact(v) }}
						enableLabel={false}
						{...motionProps}
						tooltip={(props) => (
							<ChartTooltip
								title={String(props.id)}
								rows={[{ color: props.color, label: 'People', value: formatFull(props.value) }]}
							/>
						)}
						legends={[
							{
								anchor: 'bottom',
								direction: 'row',
								translateY: 26,
								itemWidth: 80,
								itemHeight: 16,
								itemTextColor: '#a1a1aa',
								symbolSize: 10,
								symbolShape: 'circle',
							},
						]}
					/>
				</ChartFrame>
			</div>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Related-list helpers.
// ---------------------------------------------------------------------------

function RelatedRows({
	title,
	total,
	rows,
}: {
	title: string
	total: number
	rows: { key: string; name: string; meta: ReactNode }[]
}) {
	if (rows.length === 0) return null
	return (
		<Section title={`${title} (${formatFull(total)})`}>
			<div className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-2">
				{rows.map((row) => (
					<div key={row.key} className="min-w-0 bg-black px-4 py-3">
						<div className="truncate text-sm font-bold text-white">{row.name}</div>
						<div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
							{row.meta}
						</div>
					</div>
				))}
			</div>
			{total > rows.length ? (
				<p className="mt-3 text-xs font-medium text-white/40">
					Showing {rows.length} of {formatFull(total)}
				</p>
			) : null}
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Country detail panel.
// ---------------------------------------------------------------------------

export function CountryDetail({
	country,
	onClose,
}: {
	country: CountryRecord
	onClose: () => void
}) {
	const [related, setRelated] = useState<Related>(emptyRelated)
	const [loading, setLoading] = useState(true)
	const iso2 = country.iso2

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		setRelated(emptyRelated)
		const filters = { country: iso2 }

		Promise.all([
			fetchV2List<StateRecord>('/v2/states', {
				filters,
				sort: '-population',
				limit: 8,
				fields: 'id,name,stateCode,capital,population,timezone',
			}).catch(() => null),
			fetchV2List<CityRecord>('/v2/cities', {
				filters,
				sort: '-population',
				limit: 8,
				fields: 'id,name,stateName,population,timezone',
			}).catch(() => null),
			fetchV2List<AirportRecord>('/v2/airports', {
				filters,
				limit: 6,
				fields: 'id,name,iataCode,stateName,timezone',
			}).catch(() => null),
			fetchV2List<AirlineRecord>('/v2/airlines', {
				filters,
				limit: 6,
				fields: 'id,name,iataCode,icaoCode',
			}).catch(() => null),
			fetchV2List<PortRecord>('/v2/ports', {
				filters,
				limit: 6,
				fields: 'id,name,unLocode,functions',
			}).catch(() => null),
			fetchV2List<PortRecord>('/v2/border-crossings', {
				filters,
				limit: 6,
				fields: 'id,name,unLocode,functions',
			}).catch(() => null),
			fetchV2List<TimezoneRecord>('/v2/timezones', {
				filters,
				limit: 12,
				fields: 'timezone,standardOffset,standardOffsetName',
			}).catch(() => null),
			fetchV2List<CurrencyRecord>('/v2/currencies', {
				filters,
				limit: 4,
				fields: 'code,name,symbol,decimals,countries',
			}).catch(() => null),
			fetchV2List<MigrationRecord>('/v2/migrant-stocks', {
				filters,
				limit: 1,
			}).catch(() => null),
		])
			.then(
				([
					states,
					cities,
					airports,
					airlines,
					ports,
					borders,
					timezones,
					currencies,
					migration,
				]) => {
					if (cancelled) return
					setRelated({
						states: states?.data ?? [],
						statesTotal: states?.meta.total ?? 0,
						cities: cities?.data ?? [],
						citiesTotal: cities?.meta.total ?? 0,
						airports: airports?.data ?? [],
						airportsTotal: airports?.meta.total ?? 0,
						airlines: airlines?.data ?? [],
						airlinesTotal: airlines?.meta.total ?? 0,
						ports: ports?.data ?? [],
						portsTotal: ports?.meta.total ?? 0,
						borders: borders?.data ?? [],
						bordersTotal: borders?.meta.total ?? 0,
						timezones: timezones?.data ?? [],
						currencies: currencies?.data ?? [],
						migration: migration?.data[0] ?? null,
					})
				}
			)
			.catch(() => {
				if (!cancelled) setRelated(emptyRelated)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [iso2])

	const stats = country.statistics ?? undefined
	const continent = resolveContinentName(country.continent)
	const migration = related.migration
	const topOrigins = (migration?.origins ?? [])
		.filter((o) => o.count != null)
		.sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
		.slice(0, 8)

	return (
		<DetailDrawer
			icon={flagEmoji(country.iso2)}
			title={country.name}
			subtitle={`${continent}${country.region ? ` · ${country.region}` : ''}`}
			onClose={onClose}
		>
			{/* Identity + headline numbers */}
			<FactGrid>
				<Fact label="ISO codes" value={`${country.iso2} / ${country.iso3}`} />
				<Fact label="Continent" value={continent} />
				<Fact label="Region" value={dash(country.region)} />
				<Fact label="Currency" value={dash(country.currency)} />
				<Fact
					label="Population"
					value={country.population ? formatFull(country.population) : 'N/A'}
				/>
				<Fact label="Density" value={fmtMetricFull(stats?.populationDensity, ' /km²')} />
				<Fact label="Urban" value={fmtPercent(stats?.urbanPopulationPercent)} />
				<Fact label="Rural" value={fmtPercent(stats?.ruralPopulationPercent)} />
			</FactGrid>

			{/* Economy + demographics tiles */}
			{stats ? (
				<Section title="Statistics">
					<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
						<Fact label="GDP" value={fmtUsd(stats.gdpCurrentUsd)} />
						<Fact label="GDP per capita" value={fmtUsd(stats.gdpPerCapitaCurrentUsd)} />
						<Fact label="Life expectancy" value={fmtYears(stats.lifeExpectancy)} />
						<Fact label="Reported population" value={fmtMetricCompact(stats.populationTotal)} />
						<Fact label="Female" value={fmtMetricCompact(stats.populationFemale)} />
						<Fact label="Male" value={fmtMetricCompact(stats.populationMale)} />
						<Fact label="Ages 0–14" value={fmtPercent(stats.age0To14Percent)} />
						<Fact label="Ages 65+" value={fmtPercent(stats.age65PlusPercent)} />
					</div>
				</Section>
			) : null}

			{stats ? <AgeStructureMini stats={stats} /> : null}
			{stats ? <SexSplitMini stats={stats} /> : null}

			{/* Currency detail */}
			{related.currencies.length > 0 ? (
				<Section title="Currencies">
					<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
						{related.currencies.map((c) => (
							<Fact
								key={c.code}
								label={c.code}
								value={`${c.symbol} ${c.name}${c.decimals != null ? ` · ${c.decimals} dp` : ''}`}
							/>
						))}
					</div>
				</Section>
			) : null}

			{/* Loading shimmer for related data */}
			{loading ? (
				<Section title="Related data">
					<div className="h-12 animate-pulse bg-white/5" />
				</Section>
			) : null}

			{/* Top states */}
			<RelatedRows
				title="Top states"
				total={related.statesTotal}
				rows={related.states.map((s) => ({
					key: s.id,
					name: s.name,
					meta: (
						<>
							{s.capital ? <span>Cap. {s.capital}</span> : null}
							{s.population ? <span>{formatCompact(s.population)} pop.</span> : null}
							{s.timezone ? <span>{s.timezone}</span> : null}
						</>
					),
				}))}
			/>

			{/* Top cities */}
			<RelatedRows
				title="Top cities"
				total={related.citiesTotal}
				rows={related.cities.map((c, i) => ({
					key: `${c.name}-${i}`,
					name: c.name,
					meta: (
						<>
							{c.stateName ? <span>{c.stateName}</span> : null}
							{c.population ? <span>{formatCompact(c.population)} pop.</span> : null}
							{c.timezone ? <span>{c.timezone}</span> : null}
						</>
					),
				}))}
			/>

			{/* Airports */}
			<RelatedRows
				title="Airports"
				total={related.airportsTotal}
				rows={related.airports.map((a) => ({
					key: a.id,
					name: a.name,
					meta: (
						<>
							{a.iataCode ? <span>{a.iataCode}</span> : null}
							{a.stateName ? <span>{a.stateName}</span> : null}
							{a.timezone ? <span>{a.timezone}</span> : null}
						</>
					),
				}))}
			/>

			{/* Airlines */}
			<RelatedRows
				title="Airlines"
				total={related.airlinesTotal}
				rows={related.airlines.map((a) => ({
					key: a.id,
					name: a.name,
					meta: (
						<>
							{a.iataCode ? <span>IATA {a.iataCode}</span> : null}
							{a.icaoCode ? <span>ICAO {a.icaoCode}</span> : null}
						</>
					),
				}))}
			/>

			{/* Ports */}
			<RelatedRows
				title="Ports"
				total={related.portsTotal}
				rows={related.ports.map((p) => ({
					key: p.id,
					name: p.name,
					meta: (
						<>
							{p.unLocode ? <span>{p.unLocode}</span> : null}
							{p.functions.length ? <span>{p.functions.map(formatToken).join(', ')}</span> : null}
						</>
					),
				}))}
			/>

			{/* Border crossings */}
			<RelatedRows
				title="Border crossings"
				total={related.bordersTotal}
				rows={related.borders.map((b) => ({
					key: b.id,
					name: b.name,
					meta: (
						<>
							{b.unLocode ? <span>{b.unLocode}</span> : null}
							{b.functions.length ? <span>{b.functions.map(formatToken).join(', ')}</span> : null}
						</>
					),
				}))}
			/>

			{/* Migration */}
			{migration ? (
				<Section title="Migration">
					<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
						<Fact
							label="International migrants"
							value={
								migration.totalInternationalMigrants != null
									? formatCompact(migration.totalInternationalMigrants)
									: 'N/A'
							}
						/>
						<Fact
							label="Share of population"
							value={
								migration.migrantShareOfPopulationPercent != null
									? `${migration.migrantShareOfPopulationPercent.toFixed(1)}%`
									: 'N/A'
							}
						/>
						<Fact label="Year" value={dash(migration.year)} />
					</div>
					{topOrigins.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-1.5">
							{topOrigins.map((o) => (
								<Badge key={o.iso3 || o.countryCode}>
									{flagEmoji(o.countryCode)} {o.countryName} · {formatCompact(o.count ?? 0)}
								</Badge>
							))}
						</div>
					) : null}
				</Section>
			) : null}

			{/* Timezones */}
			{related.timezones.length > 0 ? (
				<Section title={`Timezones (${related.timezones.length})`}>
					<div className="space-y-1">
						{related.timezones.map((tz) => (
							<div
								key={tz.timezone}
								className="flex items-center justify-between gap-3 border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
							>
								<span className="truncate font-medium text-white/65">{tz.timezone}</span>
								<span className="shrink-0 font-mono font-bold text-white/80">
									{tz.standardOffsetName || formatOffset(tz.standardOffset)}
								</span>
							</div>
						))}
					</div>
				</Section>
			) : null}
		</DetailDrawer>
	)
}
