import { type ReactNode } from 'react'
import { SITE_API_URL } from '../../lib/api-url'
import {
	capitalize,
	continentName,
	formatArea,
	formatCompact,
	formatCompactLong,
	formatFull,
	formatNumber,
	formatOrdinal,
	formatPercent,
	formatUsd,
	languageName,
	weekdayName
} from '../../lib/format'
import { useLoad } from '../../lib/use-load'
import {
	type CityRow,
	type CountryRow,
	type CurrencyRow,
	type Metric,
	type MigrationRow,
	type StateRow,
	type StatisticsRow,
	type TimezoneNow,
	derivedStats,
	fetchCountriesWithStats,
	fetchV2,
	fetchV2Count,
	fetchV2List
} from '../../lib/v2'

type CountryProfileProps = {
	/** ISO 3166-1 alpha-2 code, upper case. */
	id: string
}

type ProfileData = {
	country: CountryRow
	all: CountryRow[]
	cities: CityRow[]
	cityTotal: number
	states: StateRow[]
	airports: number
	ports: number
	migration: MigrationRow | null
	currency: CurrencyRow | null
	now: TimezoneNow | null
}

async function loadProfile(id: string): Promise<ProfileData> {
	const byCountry = { 'filter[country]': id }
	const [country, all, cities, states, airports, ports, migration] =
		await Promise.all([
			fetchV2<CountryRow>(`/v2/countries/${id}`, { expand: 'timezones' }),
			fetchCountriesWithStats(),
			fetchV2List<CityRow>('/v2/cities', {
				...byCountry,
				sort: '-population',
				limit: 2000,
				fields: 'name,stateName,population,latitude,longitude'
			}),
			fetchV2List<StateRow>('/v2/states', {
				...byCountry,
				sort: '-population',
				limit: 2000,
				fields: 'name,type,population'
			}),
			fetchV2Count('/v2/airports', byCountry),
			fetchV2Count('/v2/ports', byCountry),
			fetchV2List<MigrationRow>('/v2/migrant-stocks', {
				...byCountry,
				limit: 1
			}).then(
				(page) => page.data[0] ?? null,
				() => null
			)
		])
	const zone = country.timezones?.[0]?.zoneName
	const [currency, now] = await Promise.all([
		country.currency
			? fetchV2<CurrencyRow>(`/v2/currencies/${country.currency}`).catch(
					() => null
				)
			: null,
		zone
			? fetchV2<TimezoneNow>(`/v2/timezones/${zone}/now`).catch(() => null)
			: null
	])
	return {
		country,
		all,
		cities: cities.data,
		cityTotal: cities.meta.total,
		states: states.data,
		airports,
		ports,
		migration,
		currency,
		now
	}
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function num(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null
	const n = Number(value)
	return Number.isFinite(n) ? n : null
}

function metric(stats: StatisticsRow | undefined, key: keyof StatisticsRow) {
	const value = stats?.[key]
	return typeof value === 'object' && value !== null ? value : undefined
}

function value(m: Metric | undefined): number | null {
	return m?.value ?? null
}

/** Rank of `code` when countries are sorted by `pick` descending (1-based). */
function rankBy(
	all: CountryRow[],
	code: string,
	pick: (c: CountryRow) => number | null
) {
	const ranked = all
		.map((c) => ({ c, v: pick(c) }))
		.filter((r): r is { c: CountryRow; v: number } => r.v !== null)
		.sort((a, b) => b.v - a.v)
	const index = ranked.findIndex((r) => r.c.iso2 === code)
	return {
		rank: index + 1,
		total: ranked.length,
		leader: ranked[0] ?? null,
		ranked
	}
}

function splitCompact(n: number | null): [string, string] {
	const text = formatCompact(n)
	const match = /^([\d.,]+)([A-Z]*)$/.exec(text)
	return match ? [match[1], match[2]] : [text, '']
}

function plural(word: string, n: number): string {
	if (n === 1) return word
	if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
	return word.endsWith('s') ? word : `${word}s`
}

function coords(lat: number, lng: number): string {
	const ns = lat >= 0 ? 'N' : 'S'
	const ew = lng >= 0 ? 'E' : 'W'
	return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`
}

const API_LINK = 'text-link mt-auto text-sm'

function ApiLink({ anchor }: { anchor: string }) {
	return (
		<a href={`/docs#${anchor}`} className={API_LINK}>
			Get this data from the API →
		</a>
	)
}

function Section({
	children,
	className = ''
}: {
	children: ReactNode
	className?: string
}) {
	return (
		<section
			className={`mx-auto flex w-full max-w-[1440px] flex-col gap-8 border-b border-rule px-4 py-7 md:px-8 lg:flex-row lg:gap-14 lg:px-12 lg:py-14 ${className}`}
		>
			{children}
		</section>
	)
}

function Intro({
	eyebrow,
	title,
	children
}: {
	eyebrow: string
	title: string
	children?: ReactNode
}) {
	return (
		<div className="flex shrink-0 flex-col gap-4 lg:w-[520px]">
			<div className="eyebrow">{eyebrow}</div>
			<h2 className="serif m-0 text-[32px] leading-[1.05] lg:text-5xl lg:leading-none">
				{title}
			</h2>
			{children}
		</div>
	)
}

function Lede({ children }: { children: ReactNode }) {
	return (
		<p className="m-0 text-base leading-[1.55] text-ink-soft">{children}</p>
	)
}

// ---------------------------------------------------------------------------
// Dot map of the country's cities
// ---------------------------------------------------------------------------

const GRID = 4
const BOX_W = 360
const BOX_H = 320

function CityDots({ name, cities }: { name: string; cities: CityRow[] }) {
	const points = cities
		.map((c) => ({ c, lat: num(c.latitude), lng: num(c.longitude) }))
		.filter(
			(p): p is { c: CityRow; lat: number; lng: number } =>
				p.lat !== null && p.lng !== null
		)
	if (points.length < 3) return null

	// ponytail: plain equirectangular fit with a dateline shift; far-flung
	// territories shrink the mainland. Clip to the largest cluster if that bites.
	const rawLngs = points.map((p) => p.lng)
	const wraps = Math.max(...rawLngs) - Math.min(...rawLngs) > 180
	const lngOf = (lng: number) => (wraps && lng < 0 ? lng + 360 : lng)
	const lats = points.map((p) => p.lat)
	const lngs = points.map((p) => lngOf(p.lng))
	const minLat = Math.min(...lats)
	const maxLat = Math.max(...lats)
	const minLng = Math.min(...lngs)
	const maxLng = Math.max(...lngs)
	const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
	const spanX = Math.max((maxLng - minLng) * kx, 0.01)
	const spanY = Math.max(maxLat - minLat, 0.01)
	const scale = Math.min(BOX_W / spanX, BOX_H / spanY)
	const offX = (BOX_W - spanX * scale) / 2
	const offY = (BOX_H - spanY * scale) / 2
	const place = (lat: number, lng: number): [number, number] => [
		offX + (lngOf(lng) - minLng) * kx * scale,
		offY + (maxLat - lat) * scale
	]

	const seen = new Set<string>()
	let d = ''
	for (const p of points) {
		const [x, y] = place(p.lat, p.lng)
		const gx = Math.round(x / GRID) * GRID
		const gy = Math.round(y / GRID) * GRID
		const key = `${gx},${gy}`
		if (seen.has(key)) continue
		seen.add(key)
		d += `M${gx} ${gy}h0`
	}

	const top = points.slice(0, 5).map((p, i) => {
		const [x, y] = place(p.lat, p.lng)
		return { name: p.c.name, x, y, r: i === 0 ? 7 : 5 }
	})

	return (
		<svg
			viewBox={`-4 -4 ${BOX_W + 8} ${BOX_H + 8}`}
			role="img"
			aria-label={`${name} drawn from city locations`}
			className="mt-3 w-full max-w-[432px]"
		>
			<path
				fill="none"
				stroke="#6B6F78"
				strokeWidth="3.2"
				strokeLinecap="round"
				d={d}
			/>
			<g fill="#C2410C" stroke="#F3F1EA" strokeWidth="1.5">
				{top.map((t) => (
					<circle key={t.name} cx={t.x} cy={t.y} r={t.r} />
				))}
			</g>
			<g
				fontFamily="IBM Plex Mono, monospace"
				fontSize="11"
				fill="#14161A"
				stroke="#F3F1EA"
				strokeWidth="3.5"
				strokeLinejoin="round"
				paintOrder="stroke"
			>
				{top.map((t) => (
					<text
						key={t.name}
						x={t.x > BOX_W - 70 ? t.x - 10 : t.x + 10}
						y={t.y + 4}
						textAnchor={t.x > BOX_W - 70 ? 'end' : 'start'}
					>
						{t.name}
					</text>
				))}
			</g>
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Header({ country }: { country: CountryRow }) {
	const lat = num(country.latitude)
	const lng = num(country.longitude)
	const local = country.localName ?? country.native
	const chips = [
		{ t: country.iso2, strong: true },
		{ t: country.iso3, strong: true },
		country.numericCode && { t: `numeric ${country.numericCode}` },
		lat !== null && lng !== null && { t: coords(lat, lng) }
	].filter((c) => typeof c === 'object' && c !== null)

	return (
		<header className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 border-b border-rule px-4 pt-6 pb-7 md:px-8 lg:px-12 lg:pt-10 lg:pb-9">
			<nav
				aria-label="Breadcrumb"
				className="flex flex-wrap gap-2.5 font-mono text-[13px] text-ink-soft"
			>
				<a className="hover:text-signal" href="/explore">
					Explore
				</a>
				<span aria-hidden="true">/</span>
				<a
					className="hover:text-signal"
					href={`/explore?continent=${country.continent}`}
				>
					{continentName(country.continent)}
				</a>
				{country.subregion && (
					<>
						<span aria-hidden="true">/</span>
						<span>{country.subregion}</span>
					</>
				)}
				<span aria-hidden="true">/</span>
				<span className="text-ink" aria-current="page">
					{country.name}
				</span>
			</nav>
			<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-8">
				{country.flagUrl && (
					<img
						src={country.flagUrl}
						alt={`Flag of ${country.name}`}
						width={120}
						height={80}
						className="h-12 w-[72px] shrink-0 rounded-[3px] border border-rule object-cover lg:h-20 lg:w-[120px] lg:rounded"
					/>
				)}
				<div className="flex min-w-0 grow flex-col gap-1.5">
					<div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
						<h1 className="serif m-0 text-[64px] leading-[0.9] tracking-[-0.02em] lg:text-[120px] lg:leading-[0.85]">
							{country.name}
						</h1>
						{local && local !== country.name && (
							<span
								className="serif text-[32px] text-ink-soft lg:text-[56px]"
								lang={country.languages?.[0]}
							>
								{local}
							</span>
						)}
					</div>
					<span className="text-[15px] text-ink-soft lg:hidden">
						{country.subregion ?? continentName(country.continent)}
						{country.capital ? ` · capital ${country.capital}` : ''}
					</span>
					<div className="mt-3 hidden flex-wrap gap-2 font-mono text-[13px] md:flex">
						{chips.map((c) => (
							<span
								key={c.t}
								className={`rounded-full border px-2.5 py-1 ${'strong' in c ? 'border-ink' : 'border-rule'}`}
							>
								{c.t}
							</span>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-2 lg:w-[380px]">
					<div className="flex gap-2">
						<a
							href={`/compare?countries=${country.iso2}`}
							className="btn btn-outline h-11 grow text-sm"
						>
							Compare with…
						</a>
						<a
							href={`${SITE_API_URL}/v2/countries/${country.iso2}`}
							className="btn btn-dark h-11 grow text-sm"
						>
							View in API
						</a>
					</div>
					<a href="/docs#countries" className="text-link mt-auto text-sm">
						Get this data from the API →
					</a>
				</div>
			</div>
		</header>
	)
}

function Vitals({ country }: { country: CountryRow }) {
	const s = country.statistics
	const pop = metric(s, 'populationTotal')
	const [popValue, popUnit] = splitCompact(value(pop) ?? country.population)
	const density = metric(s, 'populationDensity')
	const gdp = metric(s, 'gdpPerCapitaCurrentUsd')
	const life = metric(s, 'lifeExpectancy')
	const urban = metric(s, 'urbanPopulationPercent')
	const year = (m: Metric | undefined) => (m ? `, ${m.year}` : '')
	const vitals = [
		{
			label: 'Population',
			value: popValue,
			unit: popUnit,
			note: pop ? `World Bank${year(pop)}` : 'GeoNames'
		},
		{
			label: 'Area',
			value: formatArea(country.areaSqKm).replace(' km²', ''),
			unit: 'km²',
			note: 'GeoNames'
		},
		{
			label: 'Density',
			value: formatNumber(value(density), 1),
			unit: '/km²',
			note: density ? String(density.year) : ''
		},
		{
			label: 'GDP per capita',
			value: formatUsd(value(gdp)),
			unit: '',
			note: `current US$${year(gdp)}`
		},
		{
			label: 'Life expectancy',
			value: formatNumber(value(life), 1),
			unit: 'yrs',
			note: `at birth${year(life)}`
		},
		{
			label: 'Urban',
			value: formatNumber(value(urban), 1),
			unit: '%',
			note: `of population${year(urban)}`
		}
	]
	return (
		<section className="mx-auto grid w-full max-w-[1440px] grid-cols-2 border-b border-rule px-4 md:grid-cols-3 md:px-8 lg:grid-cols-6 lg:px-12">
			{vitals.map((v) => (
				<div
					key={v.label}
					className="flex flex-col gap-1 border-b border-rule-soft py-4 pr-4 lg:gap-2 lg:border-0 lg:py-7 lg:pr-5"
				>
					<span className="eyebrow">{v.label}</span>
					<span className="serif text-[28px] leading-none lg:text-5xl">
						{v.value}
						{v.unit && (
							<span className="text-base text-ink-soft lg:text-[22px]">
								{' '}
								{v.unit}
							</span>
						)}
					</span>
					<span className="text-[13px] text-ink-soft">{v.note}</span>
				</div>
			))}
		</section>
	)
}

function WherePeopleLive({ data }: { data: ProfileData }) {
	const { country, all, cities, states } = data
	const urban = value(metric(country.statistics, 'urbanPopulationPercent'))
	const title =
		urban === null
			? 'Where people live.'
			: urban >= 80
				? 'A nation of cities.'
				: urban >= 55
					? 'A mostly urban country.'
					: urban >= 45
						? 'Split between town and country.'
						: 'A largely rural country.'
	const topState = states.find((s) => s.population)
	const withPop = all.filter((c) => c.statistics?.populationTotal?.value)
	const smaller = topState?.population
		? withPop.filter(
				(c) =>
					(c.statistics?.populationTotal?.value ?? 0) <
					(topState.population ?? 0)
			).length
		: 0
	const top = cities.slice(0, 8)
	const max = top[0]?.population ?? 1

	return (
		<Section>
			<Intro eyebrow="Where people live" title={title}>
				<Lede>
					{urban !== null &&
						`${formatPercent(urban)} of people in ${country.name} live in urban areas. `}
					{topState?.population && smaller > 0
						? `${topState.name} alone is home to ${formatCompactLong(topState.population)} people, more than ${smaller} of the ${withPop.length} countries with population data.`
						: ''}
				</Lede>
				<CityDots name={country.name} cities={cities} />
				<ApiLink anchor="cities" />
			</Intro>
			<div className="flex grow flex-col gap-3.5 lg:pt-11">
				<div className="flex justify-between">
					<span className="eyebrow">Largest cities</span>
					<span className="eyebrow">Population</span>
				</div>
				{top.length === 0 && (
					<p className="m-0 text-sm text-ink-soft">
						No city population figures yet.
					</p>
				)}
				<ol className="m-0 list-none p-0">
					{top.map((c, i) => (
						<li
							key={`${c.name}-${i}`}
							className="flex items-center gap-4 border-b border-rule-soft py-2.5"
						>
							<span className="w-6 font-mono text-xs text-ink-soft">
								{String(i + 1).padStart(2, '0')}
							</span>
							<div className="flex w-32 shrink-0 flex-col md:w-[190px]">
								<span className="truncate text-[17px] font-medium">
									{c.name}
								</span>
								<span className="truncate text-[13px] text-ink-soft">
									{c.stateName}
								</span>
							</div>
							<div className="bar-track h-2.5 grow" aria-hidden="true">
								<div
									className="h-2.5 bg-chart-blue"
									style={{ width: `${((c.population ?? 0) / max) * 100}%` }}
								/>
							</div>
							<span className="w-[88px] text-right font-mono text-sm md:w-[100px]">
								{formatFull(c.population)}
							</span>
						</li>
					))}
				</ol>
			</div>
		</Section>
	)
}

function AgeSection({ data }: { data: ProfileData }) {
	const { country, all } = data
	const s = country.statistics
	const young = value(metric(s, 'age0To14Percent'))
	const working = value(metric(s, 'age15To64Percent'))
	const old = value(metric(s, 'age65PlusPercent'))
	if (young === null || working === null || old === null) return null
	const year = metric(s, 'age65PlusPercent')?.year
	const oldRank = rankBy(
		all,
		country.iso2,
		(c) => c.statistics?.age65PlusPercent?.value ?? null
	)
	const youngRank = rankBy(
		all,
		country.iso2,
		(c) => c.statistics?.age0To14Percent?.value ?? null
	)
	const title =
		oldRank.rank > 0 && oldRank.rank <= 10
			? 'One of the oldest populations on Earth.'
			: youngRank.rank > 0 && youngRank.rank <= 10
				? 'One of the youngest populations on Earth.'
				: old >= 20
					? 'An ageing population.'
					: young >= 30
						? 'A young population.'
						: 'How the population is spread by age.'
	const leader = oldRank.leader
	const rankText =
		oldRank.rank === 1
			? ` That is the highest share among ${oldRank.total} countries.`
			: oldRank.rank === 2 && leader
				? ` Only ${leader.c.name} (${formatPercent(leader.v)}) is higher among ${oldRank.total} countries.`
				: oldRank.rank > 0
					? ` That ranks ${formatOrdinal(oldRank.rank)} among ${oldRank.total} countries.`
					: ''
	const derived = derivedStats(s)
	const cards = [
		{
			label: 'Dependency ratio',
			short: 'Dependents per 100 working-age people',
			value: formatNumber(derived.dependencyRatio, 1),
			def: 'children and older people for every 100 people of working age'
		},
		{
			label: 'Older people per 100 children',
			short: 'Older people for every 100 children',
			value: formatNumber(derived.ageingIndex, 0),
			def: 'people aged 65 and over for every 100 children under 15'
		},
		{
			label: 'Gender balance',
			short: 'Men for every 100 women',
			value: formatNumber(derived.sexRatio, 1),
			def: 'men for every 100 women'
		}
	]
	const segments = [
		{ v: young, label: 'Under 15', cls: 'bg-sand' },
		{ v: working, label: 'Working age 15 to 64', cls: 'bg-mid' },
		{ v: old, label: '65 and over', cls: 'bg-chart-blue text-white' }
	]

	return (
		<Section>
			<Intro eyebrow="Population by age" title={title}>
				<Lede>
					{`${formatPercent(old)} of residents are 65 or older.${rankText} Children under 15 are ${formatPercent(young)}.`}
				</Lede>
				<ApiLink anchor="statistics" />
			</Intro>
			<div className="flex grow flex-col gap-7">
				<div className="flex flex-col gap-2.5">
					<div
						className="flex h-10 overflow-hidden rounded-md lg:h-16"
						role="img"
						aria-label={`Under 15: ${formatPercent(young)}, 15 to 64: ${formatPercent(working)}, 65 and over: ${formatPercent(old)}`}
					>
						{segments.map((seg) => (
							<div
								key={seg.label}
								className={`flex items-center justify-center p-2 text-xs font-semibold lg:items-end lg:justify-start lg:text-[13px] ${seg.cls}`}
								style={{ width: `${seg.v}%` }}
							>
								{seg.v >= 5 ? formatNumber(seg.v, 1) : ''}
							</div>
						))}
					</div>
					<div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-soft">
						{segments.map((seg) => (
							<span key={seg.label} className="flex items-center gap-2">
								<span className={`size-2.5 ${seg.cls}`} />
								{seg.label}
							</span>
						))}
						<span className="md:ml-auto">
							% of population{year ? `, ${year}` : ''}
						</span>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{cards.map((c) => (
						<div
							key={c.label}
							className="card flex flex-col gap-2 rounded-xl p-[22px]"
						>
							<span className="eyebrow">{c.label}</span>
							<span className="serif text-[56px] leading-none">{c.value}</span>
							<span className="text-sm leading-[1.45] text-ink-soft">
								{c.def}
							</span>
						</div>
					))}
				</div>
			</div>
		</Section>
	)
}

function MigrationSection({ data }: { data: ProfileData }) {
	const m = data.migration
	if (!m?.totalInternationalMigrants) return null
	const total = m.totalInternationalMigrants
	const origins = [...m.origins].sort((a, b) => b.count - a.count)
	const share = (o: (typeof origins)[number]) =>
		o.shareOfMigrantsPercent ?? (o.count / total) * 100
	const top = origins.slice(0, 5)
	const first = top[0]
	const topFiveShare = top.reduce((sum, o) => sum + share(o), 0)
	const max = first?.count ?? 1

	return (
		<Section>
			<Intro
				eyebrow="Migration"
				title={`${formatCompactLong(total)} residents were born abroad.`}
			>
				<Lede>
					{m.migrantShareOfPopulationPercent !== null &&
						`That is ${formatPercent(m.migrantShareOfPopulationPercent)} of the population. `}
					{first &&
						`The largest group, ${formatPercent(share(first))} of migrants, was born in ${first.countryName}. `}
					{top.length === 5 &&
						topFiveShare > 50 &&
						`Five countries account for ${formatPercent(topFiveShare, 0)} of all migrants.`}
				</Lede>
				<div className="mt-2 flex flex-col gap-4 sm:flex-row">
					{first && (
						<div className="flex grow flex-col gap-1.5 rounded-xl border border-rule p-[18px]">
							<span className="eyebrow">Largest group</span>
							<span className="serif text-[44px] leading-none">
								{formatPercent(share(first))}
							</span>
							<span className="text-[13px] text-ink-soft">
								of migrants were born in {first.countryName}
							</span>
						</div>
					)}
					<div className="flex grow flex-col gap-1.5 rounded-xl border border-rule p-[18px]">
						<span className="eyebrow">Countries of birth</span>
						<span className="serif text-[44px] leading-none">
							{origins.length}
						</span>
						<span className="text-[13px] text-ink-soft">
							represented. Source: UN DESA, {m.year}
						</span>
					</div>
				</div>
				<ApiLink anchor="migration" />
			</Intro>
			<ol className="m-0 flex grow list-none flex-col gap-1 p-0 lg:pt-11">
				{top.map((o) => (
					<li
						key={o.countryCode}
						className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-rule-soft py-3 md:flex-nowrap"
					>
						<span className="grow text-[15px] font-medium md:w-40 md:grow-0 md:text-[17px]">
							{o.countryName}
						</span>
						<span className="font-mono text-sm md:order-last md:w-[90px] md:text-right">
							{formatFull(o.count)}
						</span>
						<div className="bar-track order-last h-2 w-full md:order-none md:h-7 md:w-auto md:grow md:rounded-[3px]">
							<div
								className="h-full bg-signal"
								style={{ width: `${(o.count / max) * 100}%` }}
							/>
						</div>
						<span className="hidden w-[60px] text-right font-mono text-[13px] text-ink-soft md:order-last md:inline">
							{formatPercent(share(o))}
						</span>
					</li>
				))}
			</ol>
		</Section>
	)
}

function GettingAround({ data }: { data: ProfileData }) {
	const { country, states, cityTotal, airports, ports } = data
	const people =
		value(metric(country.statistics, 'populationTotal')) ?? country.population
	const perMillion = (n: number) =>
		people ? formatNumber((n / people) * 1e6, 2) : '–'
	const area = country.areaSqKm ?? 0
	const types = new Map<string, number>()
	for (const s of states) {
		const t = s.type?.trim().toLowerCase()
		if (t) types.set(t, (types.get(t) ?? 0) + 1)
	}
	const typeList = [...types].sort((a, b) => b[1] - a[1])
	const single = typeList.length === 1 ? typeList[0][0] : null
	const statesLabel = single
		? capitalize(plural(single, 2))
		: 'States and provinces'
	const statesNote = typeList.length
		? typeList
				.slice(0, 4)
				.map(([t, n]) => `${n} ${plural(t, n)}`)
				.join(', ')
		: 'First-level regions'
	const island = (country.neighbours?.length ?? 0) === 0
	const title =
		island && ports > 0
			? 'An island nation built around its ports.'
			: ports === 0
				? 'Landlocked, and connected by air and road.'
				: 'Connected by air, sea and land.'
	const code = country.iso2
	const infra = [
		{
			label: statesLabel,
			count: states.length,
			note: statesNote,
			path: `/v2/countries/${code}/states`,
			anchor: 'states'
		},
		{
			label: 'Cities',
			count: cityTotal,
			note: area
				? `${formatNumber((cityTotal / area) * 1000, 1)} per 1,000 km²`
				: '',
			path: `/v2/countries/${code}/cities`,
			anchor: 'cities'
		},
		{
			label: 'Airports',
			count: airports,
			note: `${perMillion(airports)} per million people`,
			path: `/v2/airports?filter[country]=${code}`,
			anchor: 'airports'
		},
		{
			label: 'Ports',
			count: ports,
			note: `${perMillion(ports)} per million people`,
			path: `/v2/ports?filter[country]=${code}`,
			anchor: 'ports'
		}
	]

	return (
		<section className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 border-b border-rule px-4 py-7 md:px-8 lg:px-12 lg:py-14">
			<div className="flex flex-col gap-3">
				<div className="eyebrow">Getting around</div>
				<h2 className="serif m-0 text-[32px] leading-[1.05] lg:text-5xl lg:leading-none">
					{title}
				</h2>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{infra.map((i) => (
					<a
						key={i.label}
						href={`/docs#${i.anchor}`}
						className="card group flex flex-col gap-2.5 rounded-xl p-6 text-ink"
					>
						<span className="eyebrow">{i.label}</span>
						<span className="serif text-5xl leading-none lg:text-[64px]">
							{formatFull(i.count)}
						</span>
						<span className="text-sm text-ink-soft">{i.note}</span>
						<span className="mt-1.5 font-mono text-xs break-all text-signal group-hover:underline">
							{i.path} →
						</span>
					</a>
				))}
			</div>
		</section>
	)
}

function Practical({ data }: { data: ProfileData }) {
	const { country, currency, now } = data
	const zones = country.timezones ?? []
	const zone = zones[0]
	const languages = country.languages ?? []
	const facts: [string, string][] = [
		['Capital', country.capital ?? '–'],
		[
			'Currency',
			[
				country.currency,
				country.currencySymbol,
				currency?.decimals !== undefined
					? `${currency.decimals} decimals`
					: null
			]
				.filter(Boolean)
				.join(' · ')
		],
		[
			'Timezone',
			zone
				? `${zone.zoneName} · ${zone.gmtOffsetName}${zones.length > 1 ? ` (+${zones.length - 1} more)` : ''}`
				: '–'
		],
		...(now
			? [
					[
						'Daylight saving',
						now.nextTransition
							? `observed, next change ${new Date(now.nextTransition.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
							: 'not observed'
					] satisfies [string, string]
				]
			: []),
		[
			'Calling code',
			country.phoneCode ? `+${country.phoneCode.replace(/^\+/, '')}` : '–'
		],
		['Internet TLD', country.tld ?? '–'],
		['Postal format', country.postalCodeFormat || 'none'],
		['Postal regex', country.postalCodeRegex || '–'],
		['Drives on the', country.drivingSide ?? '–'],
		['Measurement', country.measurementSystem ?? '–'],
		['Week starts', weekdayName(country.firstDayOfWeek)],
		[
			'Clock',
			country.timeFormat === 'H'
				? '24-hour (H)'
				: country.timeFormat === 'h'
					? '12-hour (h)'
					: (country.timeFormat ?? '–')
		],
		[
			languages.length > 1 ? 'Languages' : 'Language',
			languages.length
				? languages
						.slice(0, 3)
						.map((l) => `${languageName(l)} · ${l}`)
						.join(', ')
				: '–'
		],
		['Literacy', country.literacy ? `${country.literacy}%` : '–']
	]

	return (
		<Section className="border-b-0">
			<Intro
				eyebrow="Practical information"
				title="Everything you need for travel, forms and localisation."
			>
				<Lede>
					Currency, time, calling code, address formats and everyday conventions
					in one place.
				</Lede>
			</Intro>
			<dl className="m-0 grid grow grid-cols-1 gap-x-8 md:grid-cols-2">
				{facts.map(([k, v]) => (
					<div
						key={k}
						className="flex justify-between gap-4 border-b border-rule-soft py-3 lg:py-3.5"
					>
						<dt className="shrink-0 text-sm text-ink-soft">{k}</dt>
						<dd className="m-0 text-right font-mono text-sm break-all">{v}</dd>
					</div>
				))}
			</dl>
		</Section>
	)
}

export function CountryProfile({ id }: CountryProfileProps) {
	const state = useLoad(() => loadProfile(id), [id])

	if (state.status === 'loading') {
		return (
			<div
				className="mx-auto w-full max-w-[1440px] px-4 py-16 md:px-8 lg:px-12"
				aria-live="polite"
			>
				<p className="serif m-0 text-5xl text-ink-soft">
					Loading country profile…
				</p>
			</div>
		)
	}
	if (state.status === 'error') {
		return (
			<div
				role="alert"
				className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-16 md:px-8 lg:px-12"
			>
				<h1 className="serif m-0 text-5xl">We could not load this country.</h1>
				<p className="m-0 text-ink-soft">{state.message}</p>
				<a href="/explore" className="text-link">
					Back to Explore →
				</a>
			</div>
		)
	}

	const data = state.data
	// Prefer the joined row: it carries statistics for this country.
	const joined = data.all.find((c) => c.iso2 === data.country.iso2)
	const country: CountryRow = {
		...data.country,
		statistics: joined?.statistics
	}
	const full = { ...data, country }

	return (
		<>
			<Header country={country} />
			<Vitals country={country} />
			<WherePeopleLive data={full} />
			<AgeSection data={full} />
			<MigrationSection data={full} />
			<GettingAround data={full} />
			<Practical data={full} />
		</>
	)
}
