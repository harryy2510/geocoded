import { ResponsiveBar } from '@nivo/bar'
import { formatFull } from '../../../lib/format'
import {
	type StatisticsRow,
	type MigrationRow,
	type CurrencyRow,
} from '../../../lib/v2'
import { nivoTheme } from '../nivoTheme'
import { ChartTooltip } from '../ChartTooltip'
import { ChartFrame, ChartEmpty, motionProps } from './frame'

function metric(row: StatisticsRow, key: keyof StatisticsRow): number | null {
	const m = row[key]
	if (m && typeof m === 'object' && 'value' in m) return m.value
	return null
}

function truncate(name: string, max = 16): string {
	return name.length > max ? `${name.slice(0, max)}…` : name
}

const COLOR_YOUNG = '#f59e0b'
const COLOR_OLD = '#3b82f6'
const COLOR_MALE = '#3b82f6'
const COLOR_FEMALE = '#ec4899'

// ---------------------------------------------------------------------------
// 1. The world ages unevenly — a butterfly of % under-15 (left) vs % 65+ (right)
//    for the youngest and oldest societies, so the contrast is the whole point.
// ---------------------------------------------------------------------------
export function AgeContrastButterfly({ stats }: { stats: StatisticsRow[] }) {
	const usable = stats.filter(
		(s) => metric(s, 'age0To14Percent') != null && metric(s, 'age65PlusPercent') != null
	)
	if (usable.length === 0) return <ChartEmpty />

	const youngest = [...usable]
		.sort((a, b) => (metric(b, 'age0To14Percent') ?? 0) - (metric(a, 'age0To14Percent') ?? 0))
		.slice(0, 6)
	const oldest = [...usable]
		.sort((a, b) => (metric(b, 'age65PlusPercent') ?? 0) - (metric(a, 'age65PlusPercent') ?? 0))
		.slice(0, 6)

	// Youngest societies on top, oldest at the bottom — one continuous spectrum.
	const rows = [...youngest, ...oldest].map((s) => ({
		name: s.countryName,
		young: metric(s, 'age0To14Percent') ?? 0,
		old: metric(s, 'age65PlusPercent') ?? 0,
	}))

	// Shared scale so both wings are comparable; max ~50% under-15.
	const maxVal = Math.max(...rows.map((r) => Math.max(r.young, r.old)), 50)

	return (
		<ChartFrame height={460}>
			<div className="flex h-full flex-col justify-center gap-2 px-1">
				<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
					<span style={{ color: COLOR_YOUNG }}>← Under 15</span>
					<span style={{ color: COLOR_OLD }}>Over 65 →</span>
				</div>
				{rows.map((r) => (
					<div key={r.name} className="flex items-center gap-3">
						{/* left wing: under-15, grows leftward */}
						<div className="flex flex-1 justify-end">
							<div className="relative h-5 w-full">
								<div
									className="absolute right-0 top-0 h-full rounded-l-sm"
									style={{
										width: `${(r.young / maxVal) * 100}%`,
										background: COLOR_YOUNG,
									}}
									title={`${r.name}: ${r.young.toFixed(0)}% under 15`}
								/>
								<span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-black/70">
									{r.young.toFixed(0)}%
								</span>
							</div>
						</div>
						{/* center country label */}
						<div className="w-36 shrink-0 truncate text-center text-xs font-medium text-white/80">
							{r.name}
						</div>
						{/* right wing: over-65, grows rightward */}
						<div className="flex flex-1 justify-start">
							<div className="relative h-5 w-full">
								<div
									className="absolute left-0 top-0 h-full rounded-r-sm"
									style={{
										width: `${(r.old / maxVal) * 100}%`,
										background: COLOR_OLD,
									}}
									title={`${r.name}: ${r.old.toFixed(0)}% over 65`}
								/>
								<span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/90">
									{r.old.toFixed(0)}%
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</ChartFrame>
	)
}

// ---------------------------------------------------------------------------
// 2. Men without women — sex ratio diverging around parity (1.00 M/F).
//    Right = male-skewed (Gulf labour states), left = female-skewed.
// ---------------------------------------------------------------------------
export function SexRatioDiverging({ stats }: { stats: StatisticsRow[] }) {
	const ratios = stats
		.map((s) => {
			const male = metric(s, 'populationMale')
			const female = metric(s, 'populationFemale')
			if (!male || !female) return null
			return { name: s.countryName, ratio: male / female }
		})
		.filter((r): r is { name: string; ratio: number } => r != null)

	if (ratios.length === 0) return <ChartEmpty />

	const male = [...ratios].sort((a, b) => b.ratio - a.ratio).slice(0, 6)
	const female = [...ratios].sort((a, b) => a.ratio - b.ratio).slice(0, 6)
	// Most male-skewed at top, most female-skewed at bottom.
	const rows = [...male, ...female.reverse()].map((r) => ({
		name: r.name,
		ratio: r.ratio,
		delta: r.ratio - 1, // distance from parity (1.00)
	}))

	// Symmetric scale around parity so both wings are comparable.
	const maxDelta = Math.max(...rows.map((r) => Math.abs(r.delta)), 0.1)
	const halfPct = (delta: number) => (Math.abs(delta) / maxDelta) * 50 // % of half-width

	return (
		<ChartFrame height={460}>
			<div className="flex h-full flex-col justify-center gap-2 px-1">
				<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
					<span style={{ color: COLOR_FEMALE }}>← More women</span>
					<span className="text-white/40">parity 1.00</span>
					<span style={{ color: COLOR_MALE }}>More men →</span>
				</div>
				{rows.map((r) => {
					const isMale = r.delta >= 0
					return (
						<div key={r.name} className="flex items-center gap-3">
							<div className="w-36 shrink-0 truncate text-xs font-medium text-white/80">
								{r.name}
							</div>
							{/* center-out diverging bar */}
							<div className="relative h-5 flex-1">
								<div className="absolute left-1/2 top-0 h-full w-px bg-white/15" />
								<div
									className="absolute top-0 h-full"
									style={{
										[isMale ? 'left' : 'right']: '50%',
										width: `${halfPct(r.delta)}%`,
										background: isMale ? COLOR_MALE : COLOR_FEMALE,
										borderRadius: isMale ? '0 3px 3px 0' : '3px 0 0 3px',
									}}
									title={`${r.name}: ${r.ratio.toFixed(2)} men per woman`}
								/>
							</div>
							<div className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums text-white/70">
								{r.ratio.toFixed(2)}
							</div>
						</div>
					)
				})}
			</div>
		</ChartFrame>
	)
}

// ---------------------------------------------------------------------------
// 3. Nations of foreigners — highest foreign-born share of population.
// ---------------------------------------------------------------------------
export function ForeignBornShareBar({ migration }: { migration: MigrationRow[] }) {
	const rows = migration
		.filter((m) => (m.migrantShareOfPopulationPercent ?? 0) > 0)
		.sort(
			(a, b) =>
				(b.migrantShareOfPopulationPercent ?? 0) - (a.migrantShareOfPopulationPercent ?? 0)
		)
		.slice(0, 12)
		.reverse()

	if (rows.length === 0) return <ChartEmpty />

	const data = rows.map((m) => ({
		country: truncate(m.countryName, 18),
		share: Number((m.migrantShareOfPopulationPercent ?? 0).toFixed(1)),
		total: m.totalInternationalMigrants ?? 0,
	}))

	return (
		<ChartFrame height={440}>
			<ResponsiveBar
				data={data}
				keys={['share']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 56, bottom: 36, left: 160 }}
				padding={0.3}
				colors={['#06b6d4']}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}%` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.indexValue)}
						rows={[
							{ color: '#06b6d4', label: 'Foreign-born', value: `${props.value}%` },
							{ label: 'Migrants', value: formatFull(Number(props.data.total)) },
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

// ---------------------------------------------------------------------------
// 4. One currency, many flags — the few currencies that unite many countries,
//    set against how many currencies are used by a single country.
// ---------------------------------------------------------------------------
export function SharedCurrenciesBar({ currencies }: { currencies: CurrencyRow[] }) {
	const counted = currencies.map((c) => ({
		code: c.code,
		name: c.name,
		countries: (c.countries ?? []).length,
	}))
	const shared = counted
		.filter((c) => c.countries > 1)
		.sort((a, b) => b.countries - a.countries)
		.slice(0, 10)
		.reverse()

	if (shared.length === 0) return <ChartEmpty />

	const data = shared.map((c) => ({
		code: c.code,
		name: c.name,
		countries: c.countries,
	}))

	return (
		<ChartFrame height={400}>
			<ResponsiveBar
				data={data}
				keys={['countries']}
				indexBy="code"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 48, bottom: 36, left: 72 }}
				padding={0.3}
				colors={['#a855f7']}
				borderRadius={4}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8 }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={`${props.data.code} · ${props.data.name}`}
						rows={[{ color: '#a855f7', label: 'Countries', value: String(props.value) }]}
					/>
				)}
			/>
		</ChartFrame>
	)
}

// ---------------------------------------------------------------------------
// 5. The longevity gap — highest and lowest life expectancies side by side,
//    so the ~30-year spread reads instantly.
// ---------------------------------------------------------------------------
export function LongevityGapBar({ stats }: { stats: StatisticsRow[] }) {
	const usable = stats
		.map((s) => ({ name: s.countryName, life: metric(s, 'lifeExpectancy') }))
		.filter((r): r is { name: string; life: number } => r.life != null)

	if (usable.length === 0) return <ChartEmpty />

	const top = [...usable].sort((a, b) => b.life - a.life).slice(0, 6)
	const bottom = [...usable].sort((a, b) => a.life - b.life).slice(0, 6)
	const ordered = [...bottom.reverse(), ...top]

	const data = ordered.map((r) => ({
		country: truncate(r.name, 16),
		life: Number(r.life.toFixed(1)),
		band: top.some((t) => t.name === r.name) ? 'high' : 'low',
	}))

	return (
		<ChartFrame height={460}>
			<ResponsiveBar
				data={data}
				keys={['life']}
				indexBy="country"
				layout="horizontal"
				theme={nivoTheme}
				margin={{ top: 8, right: 56, bottom: 36, left: 148 }}
				padding={0.32}
				colors={({ data: d }) => (d.band === 'high' ? '#22c55e' : '#ef4444')}
				borderRadius={3}
				enableGridX
				enableGridY={false}
				axisBottom={{ tickSize: 0, tickPadding: 8, format: (v: number) => `${v}y` }}
				axisLeft={{ tickSize: 0, tickPadding: 10 }}
				enableLabel={false}
				{...motionProps}
				tooltip={(props) => (
					<ChartTooltip
						title={String(props.indexValue)}
						rows={[
							{
								color: props.data.band === 'high' ? '#22c55e' : '#ef4444',
								label: 'Life expectancy',
								value: `${props.value} years`,
							},
						]}
					/>
				)}
			/>
		</ChartFrame>
	)
}
