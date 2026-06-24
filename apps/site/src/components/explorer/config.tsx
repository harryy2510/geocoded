import { type ReactNode } from 'react'
import { formatCompact } from '../../lib/format'
import { resolveContinentName } from '../../lib/format'
import { dash, flagEmoji, formatOffset, formatToken } from './helpers'
import {
	type AirlineRecord,
	type AirportRecord,
	type CityRecord,
	type ContinentRecord,
	type CountryRef,
	type CurrencyRecord,
	type LanguageRecord,
	type PortRecord,
	type RegionRecord,
	type StateRecord,
	type TimezoneRecord,
} from './records'

export type SortOption = { value: string; label: string }

// A filter control. `kind` drives how the Explorer renders the input.
export type FilterControl = {
	key: string
	label: string
	// 'country' renders the shared country select; 'text' a free text box;
	// 'number' a numeric box; 'select' a fixed option list.
	kind: 'country' | 'text' | 'number' | 'select'
	placeholder?: string
	options?: { value: string; label: string }[]
}

export type ResourceConfig<T> = {
	key: string
	label: string
	path: string
	icon: string
	// Stable React key for a row.
	rowKey: (record: T) => string
	// Card renderer for the grid.
	card: (record: T) => ReactNode
	sorts: SortOption[]
	filters: FilterControl[]
	searchHint: string
}

const card = {
	wrapTop: 'flex items-start justify-between gap-3',
	icon: 'text-3xl leading-none drop-shadow-md transition-transform group-hover:scale-110',
	tag: 'max-w-28 truncate border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50',
	microLabel: 'text-[10px] font-bold uppercase tracking-widest text-white/30',
	mono: 'font-mono text-xs text-white/35',
	name: 'truncate text-base font-bold uppercase tracking-tight text-white/85 group-hover:text-white',
	sub: 'mt-1 truncate text-sm text-white/45',
}

// Reusable card scaffold so each resource card stays compact and consistent.
function CardShell({
	icon,
	tag,
	code,
	name,
	sub,
	footer,
}: {
	icon: ReactNode
	tag?: ReactNode
	code?: ReactNode
	name: ReactNode
	sub?: ReactNode
	footer: ReactNode
}) {
	return (
		<>
			<div className={card.wrapTop}>
				<span className={card.icon}>{icon}</span>
				{tag != null ? <span className={card.tag}>{tag}</span> : null}
			</div>
			<div className="mt-8 min-w-0">
				{code != null ? <div className={`mb-2 ${card.mono}`}>{code}</div> : null}
				<h3 className={card.name}>{name}</h3>
				{sub != null ? <p className={card.sub}>{sub}</p> : null}
			</div>
			<div className="mt-auto flex items-end justify-between gap-4 border-t border-white/10 pt-4">
				{footer}
			</div>
		</>
	)
}

function FooterCell({
	label,
	value,
	align = 'left',
	mono = false,
}: {
	label: string
	value: ReactNode
	align?: 'left' | 'right'
	mono?: boolean
}) {
	return (
		<div className={align === 'right' ? 'text-right' : ''}>
			<div className={card.microLabel}>{label}</div>
			<div
				className={`mt-1 text-sm font-semibold ${mono ? 'font-mono text-white/55' : 'text-white/70'}`}
			>
				{value}
			</div>
		</div>
	)
}

const sortNameAsc: SortOption = { value: 'name', label: 'Name A-Z' }
const sortNameDesc: SortOption = { value: '-name', label: 'Name Z-A' }
const sortPopDesc: SortOption = { value: '-population', label: 'Population High' }
const sortPopAsc: SortOption = { value: 'population', label: 'Population Low' }

const scopeOptions = [
	{ value: 'individual', label: 'Individual language' },
	{ value: 'macrolanguage', label: 'Macrolanguage' },
	{ value: 'special', label: 'Special code' },
]
const typeOptions = [
	{ value: 'living', label: 'Living' },
	{ value: 'extinct', label: 'Extinct' },
	{ value: 'ancient', label: 'Ancient' },
	{ value: 'historical', label: 'Historical' },
	{ value: 'constructed', label: 'Constructed' },
]

export function formatLanguageScope(scope: string): string {
	const option = scopeOptions.find((item) => item.value === scope)
	return option?.label ?? formatToken(scope)
}

export function formatLanguageType(type: string): string {
	const option = typeOptions.find((item) => item.value === type)
	return option?.label ?? formatToken(type)
}

export const countriesConfig: ResourceConfig<CountryRef> = {
	key: 'countries',
	label: 'Countries',
	path: '/v2/countries',
	icon: '🏳',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc, sortPopDesc, sortPopAsc],
	filters: [
		{ key: 'continent', label: 'Continent', kind: 'text', placeholder: 'AF, AS, EU…' },
		{ key: 'region', label: 'Region', kind: 'text', placeholder: 'Western Europe' },
		{ key: 'currency', label: 'Currency', kind: 'text', placeholder: 'USD' },
		{ key: 'minPopulation', label: 'Min population', kind: 'number', placeholder: '1000000' },
	],
	searchHint: 'Search countries, ISO codes…',
	card: (r) => (
		<CardShell
			icon={flagEmoji(r.iso2)}
			tag={resolveContinentName(r.continent) || r.region}
			code={r.iso2}
			name={r.name}
			sub={r.region || resolveContinentName(r.continent)}
			footer={
				<>
					<FooterCell label="Pop." value={formatCompact(r.population)} />
					<FooterCell label="Currency" value={dash(r.currency)} align="right" mono />
				</>
			}
		/>
	),
}

export const citiesConfig: ResourceConfig<CityRecord> = {
	key: 'cities',
	label: 'Cities',
	path: '/v2/cities',
	icon: '🏙',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc, sortPopDesc, sortPopAsc],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'minPopulation', label: 'Min population', kind: 'number', placeholder: '100000' },
		{ key: 'timezone', label: 'Timezone', kind: 'text', placeholder: 'Europe/Paris' },
	],
	searchHint: 'Search cities, state codes…',
	card: (r) => (
		<CardShell
			icon="🏙"
			tag={r.countryCode}
			code={r.stateCode ? `${r.countryCode}-${r.stateCode}` : r.countryCode}
			name={r.name}
			sub={`${r.stateName || '—'} · ${r.countryName}`}
			footer={
				<>
					<FooterCell label="Pop." value={r.population ? formatCompact(r.population) : '—'} />
					<FooterCell label="TZ" value={dash(r.timezone)} align="right" mono />
				</>
			}
		/>
	),
}

export const statesConfig: ResourceConfig<StateRecord> = {
	key: 'states',
	label: 'States',
	path: '/v2/states',
	icon: '🗺',
	rowKey: (r) => r.id,
	sorts: [
		sortNameAsc,
		sortNameDesc,
		sortPopDesc,
		sortPopAsc,
		{ value: 'timezone', label: 'Timezone A-Z' },
	],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'minPopulation', label: 'Min population', kind: 'number', placeholder: '100000' },
		{ key: 'timezone', label: 'Timezone', kind: 'text', placeholder: 'Asia/Riyadh' },
	],
	searchHint: 'Search states, codes…',
	card: (r) => (
		<CardShell
			icon={flagEmoji(r.countryCode)}
			tag={r.type}
			code={dash(r.iso31662)}
			name={r.name}
			sub={`${r.capital || 'No capital'} · ${r.countryName}`}
			footer={
				<>
					<FooterCell label="Pop." value={r.population ? formatCompact(r.population) : '—'} />
					<FooterCell label="TZ" value={dash(r.timezone)} align="right" mono />
				</>
			}
		/>
	),
}

export const airportsConfig: ResourceConfig<AirportRecord> = {
	key: 'airports',
	label: 'Airports',
	path: '/v2/airports',
	icon: '✈',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'iata', label: 'IATA code', kind: 'text', placeholder: 'JFK' },
		{ key: 'timezone', label: 'Timezone', kind: 'text', placeholder: 'America/New_York' },
	],
	searchHint: 'Search airports, IATA…',
	card: (r) => (
		<CardShell
			icon="✈"
			tag={r.countryCode}
			code={r.iataCode || '—'}
			name={r.name}
			sub={`${r.stateName || r.countryName}`}
			footer={
				<>
					<FooterCell
						label="Elev."
						value={r.elevation != null ? `${r.elevation} m` : '—'}
					/>
					<FooterCell label="Country" value={dash(r.countryCode)} align="right" mono />
				</>
			}
		/>
	),
}

export const airlinesConfig: ResourceConfig<AirlineRecord> = {
	key: 'airlines',
	label: 'Airlines',
	path: '/v2/airlines',
	icon: '🛫',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'iata', label: 'IATA code', kind: 'text', placeholder: 'GB' },
	],
	searchHint: 'Search airlines, IATA, ICAO…',
	card: (r) => (
		<CardShell
			icon="🛫"
			tag={r.countryCode}
			code={r.iataCode || r.icaoCode || '—'}
			name={r.name}
			sub={r.countryName}
			footer={
				<>
					<FooterCell label="ICAO" value={dash(r.icaoCode)} mono />
					<FooterCell label="IATA" value={dash(r.iataCode)} align="right" mono />
				</>
			}
		/>
	),
}

function portLikeCard(icon: string) {
	return (r: PortRecord): ReactNode => (
		<CardShell
			icon={icon}
			tag={r.countryCode}
			code={r.unLocode}
			name={r.name}
			sub={`${r.statusName || r.status || '—'} · ${r.countryName}`}
			footer={
				<>
					<FooterCell
						label="Functions"
						value={r.functions.length ? r.functions.map(formatToken).join(', ') : '—'}
					/>
				</>
			}
		/>
	)
}

export const portsConfig: ResourceConfig<PortRecord> = {
	key: 'ports',
	label: 'Ports',
	path: '/v2/ports',
	icon: '⚓',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'iata', label: 'IATA code', kind: 'text', placeholder: 'AQB' },
	],
	searchHint: 'Search ports, UN/LOCODE…',
	card: portLikeCard('⚓'),
}

export const bordersConfig: ResourceConfig<PortRecord> = {
	key: 'border-crossings',
	label: 'Borders',
	path: '/v2/border-crossings',
	icon: '🛂',
	rowKey: (r) => r.id,
	sorts: [sortNameAsc, sortNameDesc],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'iata', label: 'IATA code', kind: 'text', placeholder: 'HRB' },
	],
	searchHint: 'Search border crossings, UN/LOCODE…',
	card: portLikeCard('🛂'),
}

export const languagesConfig: ResourceConfig<LanguageRecord> = {
	key: 'languages',
	label: 'Languages',
	path: '/v2/languages',
	icon: '🗣',
	rowKey: (r) => r.id,
	sorts: [
		{ value: 'referenceName', label: 'Name A-Z' },
		{ value: '-referenceName', label: 'Name Z-A' },
	],
	filters: [
		{ key: 'code', label: 'ISO code', kind: 'text', placeholder: 'eng, en…' },
		{ key: 'scope', label: 'Scope', kind: 'select', options: scopeOptions },
		{ key: 'type', label: 'Status', kind: 'select', options: typeOptions },
		{ key: 'macrolanguage', label: 'Macrolanguage', kind: 'text', placeholder: 'msa' },
	],
	searchHint: 'Search languages, ISO codes…',
	card: (r) => (
		<CardShell
			icon="🗣"
			tag={formatLanguageType(r.type)}
			code={r.iso6393}
			name={r.referenceName}
			sub={formatLanguageScope(r.scope)}
			footer={
				<>
					<FooterCell label="Status" value={formatLanguageType(r.type)} />
					<FooterCell label="Names" value={r.names?.length || '—'} align="right" />
				</>
			}
		/>
	),
}

export const timezonesConfig: ResourceConfig<TimezoneRecord> = {
	key: 'timezones',
	label: 'Timezones',
	path: '/v2/timezones',
	icon: '🕓',
	rowKey: (r) => r.id,
	sorts: [
		{ value: 'timezone', label: 'Zone A-Z' },
		{ value: '-timezone', label: 'Zone Z-A' },
		{ value: 'name', label: 'Name A-Z' },
		{ value: 'standardOffset', label: 'Offset West→East' },
		{ value: '-standardOffset', label: 'Offset East→West' },
	],
	filters: [
		{ key: 'country', label: 'Country', kind: 'country' },
		{ key: 'timezone', label: 'Zone', kind: 'text', placeholder: 'Europe/Paris' },
	],
	searchHint: 'Search zones, areas, locations…',
	card: (r) => (
		<CardShell
			icon="🕓"
			tag={r.area}
			code={r.standardAbbreviation || r.abbreviation}
			name={r.timezone}
			sub={r.name}
			footer={
				<>
					<FooterCell label="Offset" value={r.standardOffsetName} mono />
					<FooterCell
						label="DST"
						value={r.observesDst ? formatOffset(r.daylightOffset) : 'No'}
						align="right"
						mono
					/>
				</>
			}
		/>
	),
}

export const currenciesConfig: ResourceConfig<CurrencyRecord> = {
	key: 'currencies',
	label: 'Currencies',
	path: '/v2/currencies',
	icon: '💱',
	rowKey: (r) => r.id,
	sorts: [
		{ value: 'code', label: 'Code A-Z' },
		{ value: '-code', label: 'Code Z-A' },
		{ value: 'name', label: 'Name A-Z' },
		{ value: '-name', label: 'Name Z-A' },
	],
	filters: [{ key: 'country', label: 'Country', kind: 'country' }],
	searchHint: 'Search currencies, codes…',
	card: (r) => (
		<CardShell
			icon={r.symbol}
			tag={`${r.countries.length} countries`}
			code={r.code}
			name={r.name}
			sub={`Symbol ${r.symbol} · ${r.decimals} decimals`}
			footer={
				<>
					<FooterCell label="Symbol" value={r.symbol} mono />
					<FooterCell label="Used by" value={r.countries.length} align="right" />
				</>
			}
		/>
	),
}

export const continentsConfig: ResourceConfig<ContinentRecord> = {
	key: 'continents',
	label: 'Continents',
	path: '/v2/continents',
	icon: '🌍',
	rowKey: (r) => r.id,
	sorts: [
		sortNameAsc,
		sortNameDesc,
		{ value: '-countryCount', label: 'Most countries' },
		{ value: 'countryCount', label: 'Fewest countries' },
	],
	filters: [],
	searchHint: 'Search continents…',
	card: (r) => (
		<CardShell
			icon="🌍"
			code={r.id}
			name={resolveContinentName(r.name || r.id)}
			sub={`${r.countryCount} countries`}
			footer={<FooterCell label="Countries" value={r.countryCount} />}
		/>
	),
}

export const regionsConfig: ResourceConfig<RegionRecord> = {
	key: 'regions',
	label: 'Region groups',
	path: '/v2/regions',
	icon: '🗺',
	rowKey: (r) => r.id,
	sorts: [
		sortNameAsc,
		sortNameDesc,
		{ value: '-countryCount', label: 'Most countries' },
		{ value: 'countryCount', label: 'Fewest countries' },
	],
	filters: [
		{ key: 'continent', label: 'Continent', kind: 'text', placeholder: 'AF, EU…' },
		{ key: 'region', label: 'Region group', kind: 'text', placeholder: 'Western Asia' },
	],
	searchHint: 'Search region groups, continents…',
	card: (r) => (
		<CardShell
			icon="🗺"
			tag="Region group"
			name={r.name}
			sub={`${r.countryCount} countries`}
			footer={
				<>
					<FooterCell label="Continent" value={resolveContinentName(r.continent)} />
					<FooterCell label="Countries" value={r.countryCount} align="right" />
				</>
			}
		/>
	),
}
