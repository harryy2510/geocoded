import { useEffect, useMemo, useState } from 'react'
import {
	capitalize,
	countryHref,
	formatCompact,
	formatNumber,
	formatOffset,
	formatPercent,
	formatUsd,
	languageName
} from '../../lib/format'
import { useLoad } from '../../lib/use-load'
import {
	type CountryRow,
	type MigrationRow,
	derivedStats,
	fetchCountriesWithStats,
	fetchV2,
	fetchV2All,
	fetchV2Count
} from '../../lib/v2'

const COLORS = ['#1D4E89', '#D9622B', '#0F766E', '#7C5CA6']
const DEFAULT = ['JP', 'PT', 'KE']
const MAX = 4

type Extra = { detail: CountryRow | null; airports: number | null }

type MetricRow = {
	label: string
	hint: string
	values: (number | null)[]
	format: (n: number) => string
}

const GRID =
	'lg:grid lg:grid-cols-[260px_repeat(4,minmax(0,1fr))] lg:items-center lg:gap-4'

async function loadBase() {
	const [countries, migration] = await Promise.all([
		fetchCountriesWithStats(),
		fetchV2All<MigrationRow>('/v2/migrant-stocks', 400, {
			fields: 'countryCode,migrantShareOfPopulationPercent,year'
		}).catch(() => [])
	])
	return { countries, migration }
}

async function loadExtra(code: string): Promise<Extra> {
	const [detail, airports] = await Promise.all([
		fetchV2<CountryRow>(`/v2/countries/${code}`, { expand: 'timezones' }).catch(
			() => null
		),
		fetchV2Count('/v2/airports', { 'filter[country]': code }).catch(() => null)
	])
	return { detail, airports }
}

function yearOf(
	rows: CountryRow[],
	pick: (c: CountryRow) => number | undefined
) {
	const years = rows.map(pick).filter((y) => y !== undefined)
	return years.length ? Math.max(...years) : null
}

export function CompareApp() {
	const [codes, setCodes] = useState<string[]>(DEFAULT)

	useEffect(() => {
		const param = new URLSearchParams(window.location.search).get('countries')
		if (param) {
			const parsed = [
				...new Set(
					param
						.toUpperCase()
						.split(',')
						.map((c) => c.trim())
				)
			]
				.filter((c) => /^[A-Z]{2}$/.test(c))
				.slice(0, MAX)
			if (parsed.length) setCodes(parsed)
		}
	}, [])

	useEffect(() => {
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}?countries=${codes.join(',')}`
		)
	}, [codes])

	const base = useLoad(loadBase, [])
	const extras = useLoad(
		async () =>
			Object.fromEntries(
				await Promise.all(
					codes.map(async (c) => [c, await loadExtra(c)] as const)
				)
			),
		[codes.join(',')]
	)

	const all = base.status === 'ready' ? base.data.countries : []
	const byCode = useMemo(() => new Map(all.map((c) => [c.iso2, c])), [all])
	const migration = useMemo(
		() =>
			new Map(
				(base.status === 'ready' ? base.data.migration : []).map((m) => [
					m.countryCode,
					m
				])
			),
		[base]
	)
	const selected = codes
		.map((c) => byCode.get(c))
		.filter((c) => c !== undefined)
	const extraFor = (code: string): Extra | undefined =>
		extras.status === 'ready' ? extras.data[code] : undefined
	const people = (c: CountryRow) =>
		c.statistics?.populationTotal?.value ?? c.population

	const metrics: MetricRow[] = [
		{
			label: 'Population',
			hint: `people${yearSuffix(yearOf(selected, (c) => c.statistics?.populationTotal?.year))}`,
			values: selected.map(people),
			format: formatCompact
		},
		{
			label: 'Population density',
			hint: 'people per km²',
			values: selected.map(
				(c) => c.statistics?.populationDensity?.value ?? null
			),
			format: (n) => formatNumber(n, 1)
		},
		{
			label: 'GDP per person',
			hint: `current US$${yearSuffix(yearOf(selected, (c) => c.statistics?.gdpPerCapitaCurrentUsd?.year))}`,
			values: selected.map(
				(c) => c.statistics?.gdpPerCapitaCurrentUsd?.value ?? null
			),
			format: formatUsd
		},
		{
			label: 'Life expectancy',
			hint: `years at birth${yearSuffix(yearOf(selected, (c) => c.statistics?.lifeExpectancy?.year))}`,
			values: selected.map((c) => c.statistics?.lifeExpectancy?.value ?? null),
			format: (n) => formatNumber(n, 1)
		},
		{
			label: 'Living in cities',
			hint: 'share of population',
			values: selected.map(
				(c) => c.statistics?.urbanPopulationPercent?.value ?? null
			),
			format: (n) => formatPercent(n)
		},
		{
			label: 'Born abroad',
			hint: `share of residents${yearSuffix(
				selected
					.map((c) => migration.get(c.iso2)?.year)
					.filter((y) => y !== undefined)
					.reduce<number | null>((m, y) => Math.max(m ?? y, y), null)
			)}`,
			values: selected.map(
				(c) => migration.get(c.iso2)?.migrantShareOfPopulationPercent ?? null
			),
			format: (n) => formatPercent(n)
		},
		{
			label: 'Older people per 100 children',
			hint: 'aged 65+ for every 100 under 15',
			values: selected.map((c) => derivedStats(c.statistics).ageingIndex),
			format: (n) => formatNumber(n, 0)
		},
		{
			label: 'Airports',
			hint: 'per million people',
			values: selected.map((c) => {
				const n = extraFor(c.iso2)?.airports
				const p = people(c)
				return n === undefined || n === null || !p ? null : (n / p) * 1e6
			}),
			format: (n) => formatNumber(n, 1)
		}
	]

	const options = [...all]
		.filter((c) => !codes.includes(c.iso2))
		.sort((a, b) => a.name.localeCompare(b.name))

	const ageYear = yearOf(selected, (c) => c.statistics?.age65PlusPercent?.year)

	return (
		<>
			<header className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 pt-8 pb-8 md:px-8 lg:px-12 lg:pt-12">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="flex flex-col gap-2.5">
						<h1 className="serif m-0 text-5xl leading-none lg:text-7xl">
							Compare countries
						</h1>
						<p className="m-0 text-base text-ink-soft lg:text-lg">
							Put up to four countries side by side, from population to
							practical details.
						</p>
					</div>
					<a href="/docs#countries" className="text-link text-sm">
						Get this data from the API →
					</a>
				</div>
				{base.status === 'error' && (
					<p
						role="alert"
						className="m-0 rounded-lg border border-signal bg-signal-soft px-4 py-3 text-sm"
					>
						We could not load country data right now. {base.message}
					</p>
				)}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[260px_repeat(4,minmax(0,1fr))]">
					<div className="hidden lg:block" />
					{selected.map((c, i) => (
						<div
							key={c.iso2}
							className="card flex flex-col gap-2.5 rounded-xl border-t-4 p-[18px]"
							style={{ borderTopColor: COLORS[i] }}
						>
							<div className="flex items-center justify-between gap-2">
								<a
									href={countryHref(c.iso2)}
									className="serif truncate text-4xl leading-none hover:text-signal"
								>
									{c.name}
								</a>
								<button
									type="button"
									aria-label={`Remove ${c.name}`}
									className="flex size-8 shrink-0 items-center justify-center rounded text-lg text-ink-soft hover:text-ink"
									onClick={() =>
										setCodes((prev) => prev.filter((x) => x !== c.iso2))
									}
								>
									×
								</button>
							</div>
							<span className="text-sm text-ink-soft">
								{c.subregion ?? c.region}
								{c.capital ? ` · capital ${c.capital}` : ''}
							</span>
						</div>
					))}
					{codes.length < MAX && (
						<label className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#A9A59B] px-4 py-3 text-[15px] font-semibold text-ink-soft focus-within:border-ink">
							+ Add a country
							<select
								className="field h-10 w-full max-w-[240px] text-sm"
								value=""
								disabled={base.status !== 'ready'}
								onChange={(event) => {
									const code = event.target.value
									if (code) setCodes((prev) => [...prev, code].slice(0, MAX))
								}}
							>
								<option value="">
									{base.status === 'loading'
										? 'Loading countries…'
										: 'Choose a country'}
								</option>
								{options.map((c) => (
									<option key={c.iso2} value={c.iso2}>
										{c.name}
									</option>
								))}
							</select>
						</label>
					)}
				</div>
			</header>

			{selected.length > 0 && (
				<>
					<section className="mx-auto flex w-full max-w-[1440px] flex-col px-4 pt-2 pb-10 md:px-8 lg:px-12">
						<h2 className="m-0 mb-2 text-[22px] font-semibold">At a glance</h2>
						{metrics.map((m) => {
							const max = Math.max(...m.values.map((v) => v ?? 0), 0)
							return (
								<div
									key={m.label}
									className={`flex flex-col gap-3 border-b border-rule py-[18px] ${GRID}`}
								>
									<div className="flex flex-col gap-0.5">
										<span className="text-base font-semibold">{m.label}</span>
										<span className="text-[13px] text-ink-soft">{m.hint}</span>
									</div>
									{m.values.map((v, i) => (
										<div key={selected[i].iso2} className="flex flex-col gap-2">
											<span className="flex items-baseline justify-between gap-2">
												<span className="text-sm text-ink-soft lg:hidden">
													{selected[i].name}
												</span>
												<span className="text-lg font-semibold lg:text-xl">
													{v === null ? '–' : m.format(v)}
												</span>
											</span>
											<div className="bar-track h-2" aria-hidden="true">
												<div
													className="h-2"
													style={{
														width: `${v && max ? (v / max) * 100 : 0}%`,
														background: COLORS[i]
													}}
												/>
											</div>
										</div>
									))}
								</div>
							)
						})}
					</section>

					<section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 pt-4 pb-10 md:px-8 lg:px-12">
						<h2 className="m-0 text-[22px] font-semibold">Population by age</h2>
						{selected.map((c) => {
							const s = c.statistics
							const parts = [
								{ v: s?.age0To14Percent?.value, cls: 'bg-sand' },
								{ v: s?.age15To64Percent?.value, cls: 'bg-mid' },
								{
									v: s?.age65PlusPercent?.value,
									cls: 'bg-chart-blue text-white'
								}
							]
							return (
								<div
									key={c.iso2}
									className="flex flex-col gap-2 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center lg:gap-4"
								>
									<span className="text-base font-medium">{c.name}</span>
									{parts.every((p) => p.v !== undefined && p.v !== null) ? (
										<div
											className="flex h-10 overflow-hidden rounded-md text-[13px] font-semibold"
											role="img"
											aria-label={`${c.name}: under 15 ${formatPercent(parts[0].v)}, 15 to 64 ${formatPercent(parts[1].v)}, 65 and over ${formatPercent(parts[2].v)}`}
										>
											{parts.map((p, i) => (
												<div
													key={i}
													className={`flex items-center pl-2.5 ${p.cls}`}
													style={{ width: `${p.v}%` }}
												>
													{(p.v ?? 0) >= 6 ? `${Math.round(p.v ?? 0)}%` : ''}
												</div>
											))}
										</div>
									) : (
										<span className="text-sm text-ink-soft">
											No age figures available.
										</span>
									)}
								</div>
							)
						})}
						<div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-soft lg:pl-[276px]">
							<span className="flex items-center gap-2">
								<span className="size-2.5 bg-sand" />
								Under 15
							</span>
							<span className="flex items-center gap-2">
								<span className="size-2.5 bg-mid" />
								15 to 64
							</span>
							<span className="flex items-center gap-2">
								<span className="size-2.5 bg-chart-blue" />
								65 and over
							</span>
							<span>
								Share of population{yearSuffix(ageYear)}. Source: World Bank
							</span>
						</div>
					</section>

					<section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-4 pt-4 pb-14 sm:grid-cols-2 md:px-8 lg:grid-cols-[260px_repeat(4,minmax(0,1fr))] lg:gap-4 lg:px-12">
						<div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
							<h2 className="m-0 text-[22px] font-semibold">
								Everyday details
							</h2>
							<span className="text-sm text-ink-soft">
								For travel, forms and localisation.
							</span>
						</div>
						{selected.map((c) => {
							const detail = extraFor(c.iso2)?.detail
							const zones = detail?.timezones ?? []
							const rows: [string, string][] = [
								[
									'Currency',
									c.currencyName
										? `${c.currencyName}${c.currencySymbol ? ` (${c.currencySymbol})` : ''}`
										: c.currency
								],
								[
									'Time zone',
									zones.length
										? `${formatOffset(zones[0].gmtOffset)}${zones.length > 1 ? `, ${zones.length} zones` : ''}`
										: extras.status === 'loading'
											? '…'
											: '–'
								],
								[
									'Calling code',
									c.phoneCode ? `+${c.phoneCode.replace(/^\+/, '')}` : '–'
								],
								['Drives on the', capitalize(c.drivingSide)],
								['Postal code', c.postalCodeFormat || 'none'],
								[
									'Main language',
									c.languages?.length
										? c.languages.slice(0, 2).map(languageName).join(', ')
										: '–'
								],
								['Literacy', c.literacy ? `${c.literacy}%` : '–']
							]
							return (
								<div key={c.iso2} className="flex flex-col gap-2">
									<span className="text-base font-semibold lg:hidden">
										{c.name}
									</span>
									<dl className="m-0 flex flex-col">
										{rows.map(([k, v]) => (
											<div
												key={k}
												className="flex justify-between gap-2 border-b border-rule-soft py-2.5 text-sm"
											>
												<dt className="text-ink-soft">{k}</dt>
												<dd className="m-0 text-right font-medium">{v}</dd>
											</div>
										))}
									</dl>
								</div>
							)
						})}
					</section>
				</>
			)}
		</>
	)
}

function yearSuffix(year: number | null): string {
	return year ? `, ${year}` : ''
}
