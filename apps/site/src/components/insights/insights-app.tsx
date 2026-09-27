import {
	countryHref,
	formatCompact,
	formatCompactLong,
	formatFull,
	formatNumber,
	formatPercent
} from '../../lib/format'
import { useLoad } from '../../lib/use-load'
import {
	type CountryRow,
	type MigrationRow,
	type TimezoneRow,
	derivedStats,
	fetchCountriesWithStats,
	fetchV2All,
	fetchV2Count
} from '../../lib/v2'

const CONTINENT_COLORS: { code: string; name: string; color: string }[] = [
	{ code: 'EU', name: 'Europe', color: '#1D4E89' },
	{ code: 'AS', name: 'Asia', color: '#D9622B' },
	{ code: 'AF', name: 'Africa', color: '#0F766E' },
	{ code: 'NA', name: 'North America', color: '#7C5CA6' },
	{ code: 'SA', name: 'South America', color: '#B7791F' },
	{ code: 'OC', name: 'Oceania', color: '#6B7280' }
]

const FRACTIONS = [
	'',
	'',
	'half',
	'third',
	'quarter',
	'fifth',
	'sixth',
	'seventh',
	'eighth',
	'ninth',
	'tenth',
	'eleventh',
	'twelfth',
	'thirteenth',
	'fourteenth',
	'fifteenth',
	'sixteenth',
	'seventeenth',
	'eighteenth',
	'nineteenth',
	'twentieth'
]

const NUMBER_WORDS = [
	'no',
	'one',
	'two',
	'three',
	'four',
	'five',
	'six',
	'seven',
	'eight',
	'nine',
	'ten'
]

const ARTICLE =
	/^(United|Netherlands|Philippines|Czech|Dominican|Central African|Bahamas|Gambia|Maldives|Marshall|Solomon|Comoros|Seychelles)/

function withArticle(name: string): string {
	return ARTICLE.test(name) ? `the ${name}` : name
}

async function loadMain() {
	const [countries, migration] = await Promise.all([
		fetchCountriesWithStats(),
		fetchV2All<MigrationRow>('/v2/migrant-stocks', 400, {
			fields:
				'countryCode,countryName,year,totalInternationalMigrants,migrantShareOfPopulationPercent'
		}).catch(() => [])
	])
	return { countries, migration }
}

async function loadFacts() {
	const [timezones, ports, languages] = await Promise.all([
		fetchV2All<TimezoneRow>('/v2/timezones', 2000, {
			fields: 'timezone,observesDst'
		}).catch(() => null),
		fetchV2All<{ countryCode: string }>('/v2/ports', 40000, {
			fields: 'countryCode'
		}).catch(() => null),
		fetchV2Count('/v2/languages').catch(() => null)
	])
	return { timezones, ports, languages }
}

// Scatter scales, matching the 900x460 artboard chart.
const X_PER_DECADE = 253.5
const xScale = (gdp: number) =>
	Math.min(760, Math.max(0, 177 + (Math.log10(gdp) - 3) * X_PER_DECADE))
const yScale = (life: number) =>
	Math.min(360, Math.max(0, 76 + (80 - life) * 9.47))
const rScale = (pop: number) =>
	Math.min(18, Math.max(2.5, Math.sqrt(pop) * 0.0011))

type Point = {
	country: CountryRow
	x: number
	y: number
	r: number
	color: string
	gdp: number
	life: number
}

function Scatter({ points }: { points: Point[] }) {
	const labelled = ['JP', 'PT', 'KE']
	return (
		<svg
			viewBox="-70 -20 900 460"
			role="img"
			aria-label={`Scatter chart of GDP per person against life expectancy for ${points.length} countries`}
			className="block h-auto w-full"
		>
			<g stroke="#E4E0D5" strokeWidth="1">
				<path d="M0 76H760M0 171H760M0 265H760M0 360H760" />
				<path d="M177 0V360M431 0V360M684 0V360" />
			</g>
			<g fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#4B4F58">
				<text x="-12" y="80" textAnchor="end">
					80
				</text>
				<text x="-12" y="175" textAnchor="end">
					70
				</text>
				<text x="-12" y="269" textAnchor="end">
					60
				</text>
				<text x="-12" y="364" textAnchor="end">
					50
				</text>
				<text x="177" y="386" textAnchor="middle">
					$1,000
				</text>
				<text x="431" y="386" textAnchor="middle">
					$10,000
				</text>
				<text x="684" y="386" textAnchor="middle">
					$100,000
				</text>
				<text
					x="380"
					y="420"
					textAnchor="middle"
					fill="#14161A"
					fontWeight="600"
				>
					GDP per person (US$, log scale)
				</text>
				<text
					x="-52"
					y="180"
					textAnchor="middle"
					fill="#14161A"
					fontWeight="600"
					transform="rotate(-90 -52 180)"
				>
					Life expectancy (years)
				</text>
			</g>
			<g fillOpacity="0.72" stroke="#FFFFFF" strokeWidth="0.8">
				{points.map((p) => (
					<circle key={p.country.iso2} cx={p.x} cy={p.y} r={p.r} fill={p.color}>
						<title>
							{`${p.country.name}: $${formatNumber(p.gdp, 0)} per person, ${formatNumber(p.life, 1)} years`}
						</title>
					</circle>
				))}
			</g>
			<g
				fontFamily="IBM Plex Sans, sans-serif"
				fontSize="13"
				fontWeight="600"
				fill="#14161A"
			>
				{points
					.filter((p) => labelled.includes(p.country.iso2))
					.map((p) => {
						const left = p.x > 380
						return (
							<g key={p.country.iso2}>
								<circle
									cx={p.x}
									cy={p.y}
									r={p.r}
									fill="none"
									stroke="#14161A"
									strokeWidth="1.5"
								/>
								<text
									x={left ? p.x - p.r - 4 : p.x + p.r + 4}
									y={p.y - p.r - 4}
									textAnchor={left ? 'end' : 'start'}
									stroke="#F3F1EA"
									strokeWidth="4"
									strokeLinejoin="round"
									paintOrder="stroke"
								>
									{p.country.name}
								</text>
							</g>
						)
					})}
			</g>
		</svg>
	)
}

function RankList({
	eyebrow,
	title,
	body,
	color,
	source,
	rows
}: {
	eyebrow: string
	title: string
	body: string
	color: string
	source: string
	rows: { code: string; name: string; value: number }[]
}) {
	return (
		<div className="flex flex-col gap-4">
			<span className="eyebrow">{eyebrow}</span>
			<h2 className="serif m-0 text-4xl leading-none lg:text-[44px]">
				{title}
			</h2>
			<p className="m-0 mb-2 text-base leading-[1.55] text-ink-soft">{body}</p>
			<ol className="m-0 list-none p-0">
				{rows.map((r, i) => (
					<li
						key={r.code}
						className="flex items-center gap-4 border-b border-rule-soft py-3"
					>
						<span className="w-5 font-mono text-[13px] text-ink-soft">
							{i + 1}
						</span>
						<a
							href={countryHref(r.code)}
							className="w-36 shrink-0 truncate text-base font-medium hover:text-signal sm:w-[250px]"
						>
							{r.name}
						</a>
						<div className="bar-track h-3 grow" aria-hidden="true">
							<div
								className="h-3"
								style={{ width: `${(r.value / 50) * 100}%`, background: color }}
							/>
						</div>
						<span className="w-14 text-right text-base font-semibold">
							{formatPercent(r.value)}
						</span>
					</li>
				))}
			</ol>
			<span className="text-[13px] text-ink-soft">{source}</span>
		</div>
	)
}

function Donut({ value }: { value: number }) {
	return (
		<svg
			width="64"
			height="64"
			viewBox="0 0 36 36"
			aria-hidden="true"
			className="shrink-0"
		>
			<circle
				cx="18"
				cy="18"
				r="15.9"
				fill="none"
				stroke="#E4E0D5"
				strokeWidth="5"
			/>
			<circle
				cx="18"
				cy="18"
				r="15.9"
				fill="none"
				stroke="#D9622B"
				strokeWidth="5"
				strokeDasharray={`${value.toFixed(1)} 100`}
				transform="rotate(-90 18 18)"
			/>
		</svg>
	)
}

const wrap = 'mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-12'

export function InsightsApp() {
	const main = useLoad(loadMain, [])
	const facts = useLoad(loadFacts, [])

	const countries = main.status === 'ready' ? main.data.countries : []
	const migration = main.status === 'ready' ? main.data.migration : []
	const byCode = new Map(countries.map((c) => [c.iso2, c]))
	const pending = main.status === 'loading' ? '…' : '–'

	const worldPop = countries.reduce(
		(sum, c) => sum + (c.statistics?.populationTotal?.value ?? 0),
		0
	)

	const points: Point[] = countries.flatMap((c) => {
		const gdp = c.statistics?.gdpPerCapitaCurrentUsd?.value
		const life = c.statistics?.lifeExpectancy?.value
		const pop = c.statistics?.populationTotal?.value ?? c.population
		const color = CONTINENT_COLORS.find((k) => k.code === c.continent)?.color
		if (!gdp || !life || !color) return []
		return [
			{
				country: c,
				x: xScale(gdp),
				y: yScale(life),
				r: rScale(pop),
				color,
				gdp,
				life
			}
		]
	})
	points.sort((a, b) => b.r - a.r)
	const jp = points.find((p) => p.country.iso2 === 'JP')
	const ke = points.find((p) => p.country.iso2 === 'KE')
	const ratio = jp && ke ? Math.round(jp.gdp / ke.gdp) : 0
	const gap = jp && ke ? Math.round(jp.life - ke.life) : 0
	const gdpYear = countries.find((c) => c.statistics?.gdpPerCapitaCurrentUsd)
		?.statistics?.gdpPerCapitaCurrentUsd?.year
	const lifeYear = countries.find((c) => c.statistics?.lifeExpectancy)
		?.statistics?.lifeExpectancy?.year

	const ageRows = (pick: (c: CountryRow) => number | null | undefined) =>
		countries
			.flatMap((c) => {
				const v = pick(c)
				return v === null || v === undefined
					? []
					: [{ code: c.iso2, name: c.name, value: v }]
			})
			.sort((a, b) => b.value - a.value)
			.slice(0, 6)
	const oldest = ageRows((c) => c.statistics?.age65PlusPercent?.value)
	const youngest = ageRows((c) => c.statistics?.age0To14Percent?.value)
	const ageYear = countries.find((c) => c.statistics?.age65PlusPercent)
		?.statistics?.age65PlusPercent?.year
	const japanAgeing = derivedStats(byCode.get('JP')?.statistics).ageingIndex

	const bigMigration = migration.filter(
		(m) =>
			(m.totalInternationalMigrants ?? 0) >= 100_000 &&
			m.migrantShareOfPopulationPercent !== null
	)
	const topMigrants = [...bigMigration]
		.sort(
			(a, b) =>
				(b.migrantShareOfPopulationPercent ?? 0) -
				(a.migrantShareOfPopulationPercent ?? 0)
		)
		.slice(0, 6)
	const majority = bigMigration.filter(
		(m) => (m.migrantShareOfPopulationPercent ?? 0) > 50
	).length
	const migrationYear = migration[0]?.year

	const f = facts.status === 'ready' ? facts.data : null
	const dst = f?.timezones
		? f.timezones.filter((t) => t.observesDst).length
		: null
	const tzTotal = f?.timezones?.length ?? null
	const portCounts = new Map<string, number>()
	for (const p of f?.ports ?? [])
		portCounts.set(p.countryCode, (portCounts.get(p.countryCode) ?? 0) + 1)
	const portRank = [...portCounts].sort((a, b) => b[1] - a[1])
	const portName = (code: string) => withArticle(byCode.get(code)?.name ?? code)
	const factsPending = facts.status === 'loading' ? '…' : '–'

	const factCards = [
		{
			big: dst === null ? factsPending : formatFull(dst),
			title: `of ${tzTotal === null ? factsPending : formatFull(tzTotal)} time zones change their clocks`,
			body:
				dst !== null && tzTotal
					? `${formatPercent((dst / tzTotal) * 100, 0)} of the world’s time zones still observe daylight saving time.`
					: 'Share of the world’s time zones that still observe daylight saving time.'
		},
		portRank.length >= 3
			? {
					big: formatFull(portRank[0][1]),
					title: `ports in ${portName(portRank[0][0])}`,
					body: `The most of any country, followed by ${portName(portRank[1][0])} (${formatFull(portRank[1][1])}) and ${portName(portRank[2][0])} (${formatFull(portRank[2][1])}).`
				}
			: {
					big: factsPending,
					title: 'ports in the country with the most',
					body: 'Seaports and river ports with UN/LOCODE codes.'
				},
		{
			big: f?.languages ? formatFull(f.languages) : factsPending,
			title: 'languages with an ISO code',
			body: 'Living, historic and extinct languages, each with its ISO 639-3 code.'
		}
	]

	return (
		<>
			<header
				className={`${wrap} flex flex-col gap-8 border-b border-rule pt-10 pb-10 lg:flex-row lg:items-end lg:justify-between lg:pt-16 lg:pb-12`}
			>
				<div className="flex max-w-[820px] flex-col gap-4">
					<span className="eyebrow">World insights</span>
					<h1 className="serif m-0 text-[56px] leading-[0.95] tracking-[-0.02em] lg:text-[88px]">
						The world in numbers.
					</h1>
					<p className="m-0 text-lg leading-normal text-ink-soft lg:text-xl">
						How the world's {worldPop ? formatCompactLong(worldPop) : pending}{' '}
						people live, age and move, from the latest World Bank and United
						Nations figures.
					</p>
				</div>
				<div className="flex gap-10">
					<div className="flex flex-col gap-1">
						<span className="serif text-[52px] leading-none">
							{worldPop ? formatCompact(worldPop) : pending}
						</span>
						<span className="text-sm text-ink-soft">people</span>
					</div>
					<div className="flex flex-col gap-1">
						<span className="serif text-[52px] leading-none">
							{countries.length || pending}
						</span>
						<span className="text-sm text-ink-soft">
							countries and territories
						</span>
					</div>
				</div>
			</header>

			{main.status === 'error' && (
				<p role="alert" className={`${wrap} m-0 py-6 text-sm`}>
					We could not load these figures right now. {main.message}
				</p>
			)}

			<section
				className={`${wrap} flex flex-col gap-10 border-b border-rule py-10 lg:flex-row lg:gap-14 lg:py-16`}
			>
				<div className="flex shrink-0 flex-col gap-[18px] lg:w-[380px]">
					<span className="eyebrow">Wealth and health</span>
					<h2 className="serif m-0 text-4xl leading-none lg:text-[52px]">
						Richer countries live longer, up to a point.
					</h2>
					<p className="m-0 text-base leading-relaxed text-ink-soft">
						Each circle is a country, sized by population. Life expectancy
						climbs steeply as income rises from $1,000 to $10,000 per person,
						then levels off in the low 80s.
					</p>
					{jp && ke && ratio > 1 && (
						<p className="m-0 text-base leading-relaxed text-ink-soft">
							Kenya's GDP per person is{' '}
							{FRACTIONS[ratio] ? `one ${FRACTIONS[ratio]}` : `1/${ratio}`} of
							Japan's; its people live {gap} fewer years on average.
						</p>
					)}
					<ul className="m-0 mt-3 grid list-none grid-cols-2 gap-2.5 p-0 text-sm">
						{CONTINENT_COLORS.map((l) => (
							<li key={l.code} className="flex items-center gap-2">
								<span
									className="size-3 rounded-full"
									style={{ background: l.color }}
								/>
								{l.name}
							</li>
						))}
					</ul>
					<span className="mt-auto text-[13px] text-ink-soft">
						Source: World Bank, GDP per capita{gdpYear ? ` (${gdpYear})` : ''}{' '}
						and life expectancy at birth{lifeYear ? ` (${lifeYear})` : ''}.
					</span>
				</div>
				<figure className="m-0 min-w-0 grow">
					<Scatter points={points} />
				</figure>
			</section>

			<section
				className={`${wrap} grid grid-cols-1 gap-14 border-b border-rule py-10 lg:grid-cols-2 lg:py-16`}
			>
				<RankList
					eyebrow="Ageing"
					title="The oldest populations"
					body={`Share of people aged 65 and over.${japanAgeing ? ` In Japan, there are ${formatNumber(japanAgeing / 100, 1)} older people for every child.` : ''}`}
					color="#1D4E89"
					source={`Source: World Bank${ageYear ? `, ${ageYear}` : ''}`}
					rows={oldest}
				/>
				<RankList
					eyebrow="Youth"
					title="The youngest populations"
					body="Share of people under 15. In parts of sub-Saharan Africa, nearly one in two people is a child."
					color="#D9622B"
					source={`Source: World Bank${ageYear ? `, ${ageYear}` : ''}`}
					rows={youngest}
				/>
			</section>

			<section
				className={`${wrap} flex flex-col gap-10 border-b border-rule py-10 lg:flex-row lg:gap-14 lg:py-16`}
			>
				<div className="flex shrink-0 flex-col gap-4 lg:w-[380px]">
					<span className="eyebrow">Migration</span>
					<h2 className="serif m-0 text-4xl leading-none lg:text-[52px]">
						Where most residents were born elsewhere.
					</h2>
					<p className="m-0 text-base leading-relaxed text-ink-soft">
						{bigMigration.length
							? `In ${majority <= 10 ? NUMBER_WORDS[majority] : majority} ${majority === 1 ? 'place' : 'places'}, more than half of the population was born in another country.`
							: pending}
					</p>
					<span className="mt-auto text-[13px] text-ink-soft">
						Source: UN DESA International Migrant Stock
						{migrationYear ? `, ${migrationYear}` : ''}. Places with at least
						100,000 migrants.
					</span>
				</div>
				<div className="grid grow grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{topMigrants.map((m) => {
						const v = m.migrantShareOfPopulationPercent ?? 0
						return (
							<a
								key={m.countryCode}
								href={countryHref(m.countryCode)}
								className="card flex flex-col gap-3.5 rounded-[14px] p-6 text-ink hover:border-ink"
							>
								<span className="text-[17px] font-semibold">
									{m.countryName}
								</span>
								<div className="flex items-end gap-4">
									<Donut value={v} />
									<span className="serif text-[56px] leading-[0.9]">
										{formatNumber(v, 0)}%
									</span>
								</div>
								<span className="text-sm text-ink-soft">
									of residents born abroad
								</span>
							</a>
						)
					})}
				</div>
			</section>

			<section
				className={`${wrap} grid grid-cols-1 gap-6 py-10 md:grid-cols-3 lg:py-16`}
			>
				{factCards.map((card) => (
					<article
						key={card.title}
						className="flex flex-col gap-3 border-t-[3px] border-ink py-6 md:p-[30px] md:px-0 lg:px-[30px]"
					>
						<span className="serif text-6xl leading-[0.9] lg:text-[72px]">
							{card.big}
						</span>
						<h3 className="m-0 text-[19px] font-semibold">{card.title}</h3>
						<p className="m-0 text-[15px] leading-[1.55] text-ink-soft">
							{card.body}
						</p>
					</article>
				))}
			</section>
		</>
	)
}
