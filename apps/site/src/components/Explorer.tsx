import { type ReactNode, useEffect, useState } from 'react'
import { fetchV2List } from './explorer/api'
import { CountryDetail } from './explorer/CountryDetail'
import { ResourceBrowser } from './explorer/ResourceBrowser'
import {
	airlinesConfig,
	airportsConfig,
	bordersConfig,
	citiesConfig,
	continentsConfig,
	countriesConfig,
	currenciesConfig,
	languagesConfig,
	portsConfig,
	regionsConfig,
	statesConfig,
	timezonesConfig,
} from './explorer/config'
import {
	AirlineDetail,
	AirportDetail,
	BorderDetail,
	CityDetail,
	ContinentDetail,
	CurrencyDetail,
	LanguageDetail,
	PortDetail,
	RegionDetail,
	StateDetail,
	TimezoneDetail,
} from './explorer/details'
import {
	type AirlineRecord,
	type AirportRecord,
	type CityRecord,
	type ContinentRecord,
	type CountryRecord,
	type CountryRef,
	type CurrencyRecord,
	type LanguageRecord,
	type PortRecord,
	type RegionRecord,
	type StateRecord,
	type TimezoneRecord,
} from './explorer/records'

export type TabKey =
	| 'countries'
	| 'cities'
	| 'states'
	| 'airports'
	| 'airlines'
	| 'ports'
	| 'border-crossings'
	| 'languages'
	| 'timezones'
	| 'currencies'
	| 'continents'
	| 'regions'

const TABS: { key: TabKey; label: string; icon: string }[] = [
	{ key: 'countries', label: 'Countries', icon: '🏳' },
	{ key: 'cities', label: 'Cities', icon: '🏙' },
	{ key: 'states', label: 'States', icon: '🗺' },
	{ key: 'airports', label: 'Airports', icon: '✈' },
	{ key: 'airlines', label: 'Airlines', icon: '🛫' },
	{ key: 'ports', label: 'Ports', icon: '⚓' },
	{ key: 'border-crossings', label: 'Borders', icon: '🛂' },
	{ key: 'languages', label: 'Languages', icon: '🗣' },
	{ key: 'timezones', label: 'Timezones', icon: '🕓' },
	{ key: 'currencies', label: 'Currencies', icon: '💱' },
	{ key: 'continents', label: 'Continents', icon: '🌍' },
	{ key: 'regions', label: 'Regions', icon: '🧭' },
]

// Tab keys, exported so the Astro dynamic route can statically generate one
// page per tab (`/explorer/<tab>`).
export const EXPLORER_TAB_KEYS = TABS.map((tab) => tab.key)

const TAB_KEY_SET = new Set<string>(EXPLORER_TAB_KEYS)

function isTabKey(value: string | undefined): value is TabKey {
	return value !== undefined && TAB_KEY_SET.has(value)
}

// Lightweight country list (iso2 + name + core fields) used to populate the
// shared country-filter dropdown across tabs. Sourced entirely from v2.
function useCountryRefs(): CountryRef[] {
	const [refs, setRefs] = useState<CountryRef[]>([])

	useEffect(() => {
		let cancelled = false
		fetchV2List<CountryRef>('/v2/countries', {
			sort: 'name',
			limit: 300,
			fields: 'id,iso2,iso3,name,continent,region,currency,population',
		})
			.then((res) => {
				if (cancelled) return
				setRefs(
					[...res.data].sort((a, b) => a.name.localeCompare(b.name))
				)
			})
			.catch(() => {
				if (!cancelled) setRefs([])
			})
		return () => {
			cancelled = true
		}
	}, [])

	return refs
}

export function Explorer({ initialTab }: { initialTab?: string }) {
	const [active, setActive] = useState<TabKey>(
		isTabKey(initialTab) ? initialTab : 'countries'
	)
	const countryRefs = useCountryRefs()

	// Reflect the active tab in the URL (/explorer/<tab>) without a reload, and
	// keep state in sync with browser back/forward navigation.
	const selectTab = (tab: TabKey) => {
		setActive(tab)
		if (typeof window !== 'undefined') {
			window.history.pushState({ tab }, '', `/explorer/${tab}`)
		}
	}

	useEffect(() => {
		const onPopState = () => {
			const segment = window.location.pathname.split('/').filter(Boolean)[1]
			setActive(isTabKey(segment) ? segment : 'countries')
		}
		window.addEventListener('popstate', onPopState)
		return () => window.removeEventListener('popstate', onPopState)
	}, [])

	return (
		<div className="flex animate-fade-in flex-col gap-10">
			<div>
				<h1 className="mb-4 text-5xl font-bold uppercase tracking-tighter md:text-7xl">
					Explorer
				</h1>
				<p className="text-lg text-white/60">
					Browse and inspect every collection. Search, sort, filter, and open the full record
					for any entity.
				</p>
			</div>

			<div className="-mx-1 flex flex-wrap gap-1">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						onClick={() => selectTab(tab.key)}
						className={`flex items-center gap-2 border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
							active === tab.key
								? 'border-white bg-white text-black'
								: 'border-white/15 text-white/55 hover:border-white/40 hover:text-white'
						}`}
					>
						<span className="text-sm leading-none">{tab.icon}</span>
						{tab.label}
					</button>
				))}
			</div>

			<TabView key={active} tab={active} countryRefs={countryRefs} />
		</div>
	)
}

function TabView({
	tab,
	countryRefs,
}: {
	tab: TabKey
	countryRefs: CountryRef[]
}): ReactNode {
	switch (tab) {
		case 'countries':
			return <CountriesTab countryRefs={countryRefs} />
		case 'cities':
			return (
				<Browser
					config={citiesConfig}
					countryRefs={countryRefs}
					detail={(record: CityRecord, close) => <CityDetail city={record} onClose={close} />}
				/>
			)
		case 'states':
			return (
				<Browser
					config={statesConfig}
					countryRefs={countryRefs}
					detail={(record: StateRecord, close) => <StateDetail state={record} onClose={close} />}
				/>
			)
		case 'airports':
			return (
				<Browser
					config={airportsConfig}
					countryRefs={countryRefs}
					detail={(record: AirportRecord, close) => (
						<AirportDetail airport={record} onClose={close} />
					)}
				/>
			)
		case 'airlines':
			return (
				<Browser
					config={airlinesConfig}
					countryRefs={countryRefs}
					detail={(record: AirlineRecord, close) => (
						<AirlineDetail airline={record} onClose={close} />
					)}
				/>
			)
		case 'ports':
			return (
				<Browser
					config={portsConfig}
					countryRefs={countryRefs}
					detail={(record: PortRecord, close) => <PortDetail port={record} onClose={close} />}
				/>
			)
		case 'border-crossings':
			return (
				<Browser
					config={bordersConfig}
					countryRefs={countryRefs}
					detail={(record: PortRecord, close) => <BorderDetail border={record} onClose={close} />}
				/>
			)
		case 'languages':
			return (
				<Browser
					config={languagesConfig}
					countryRefs={countryRefs}
					detail={(record: LanguageRecord, close) => (
						<LanguageDetail language={record} onClose={close} />
					)}
				/>
			)
		case 'timezones':
			return (
				<Browser
					config={timezonesConfig}
					countryRefs={countryRefs}
					detail={(record: TimezoneRecord, close) => (
						<TimezoneDetail timezone={record} onClose={close} />
					)}
				/>
			)
		case 'currencies':
			return (
				<Browser
					config={currenciesConfig}
					countryRefs={countryRefs}
					detail={(record: CurrencyRecord, close) => (
						<CurrencyDetail currency={record} onClose={close} />
					)}
				/>
			)
		case 'continents':
			return (
				<Browser
					config={continentsConfig}
					countryRefs={countryRefs}
					detail={(record: ContinentRecord, close) => (
						<ContinentDetail continent={record} onClose={close} />
					)}
				/>
			)
		case 'regions':
			return (
				<Browser
					config={regionsConfig}
					countryRefs={countryRefs}
					detail={(record: RegionRecord, close) => (
						<RegionDetail region={record} onClose={close} />
					)}
				/>
			)
	}
}

// Generic browser-with-detail wrapper. Holds the selected record for one tab
// and renders the tab's typed detail panel as an overlay drawer.
function Browser<T>({
	config,
	countryRefs,
	detail,
}: {
	config: Parameters<typeof ResourceBrowser<T>>[0]['config']
	countryRefs: CountryRef[]
	detail: (record: T, close: () => void) => ReactNode
}): ReactNode {
	const [selected, setSelected] = useState<T | null>(null)
	return (
		<>
			<ResourceBrowser
				key={config.key}
				config={config}
				countries={countryRefs}
				onSelect={setSelected}
			/>
			{selected ? detail(selected, () => setSelected(null)) : null}
		</>
	)
}

// Countries tab: list driven by /v2/countries. Opening a card fetches the rich
// record (with expanded statistics) and renders the v2-native CountryDetail.
function CountriesTab({ countryRefs }: { countryRefs: CountryRef[] }): ReactNode {
	const [selected, setSelected] = useState<CountryRecord | null>(null)

	const open = (record: CountryRef) => {
		// Show the thin record immediately, then enrich with statistics.
		setSelected({ ...record })
		fetchV2List<CountryRecord>('/v2/countries', {
			filters: { country: record.iso2 },
			limit: 1,
			expand: 'statistics',
			fields: '*,statistics.*',
		})
			.then((res) => {
				const full = res.data[0]
				if (full && full.iso2 === record.iso2) {
					setSelected({ ...record, ...full })
				}
			})
			.catch(() => {
				/* keep the thin record on failure */
			})
	}

	return (
		<>
			<ResourceBrowser
				config={countriesConfig}
				countries={countryRefs}
				onSelect={open}
			/>
			{selected ? (
				<CountryDetail country={selected} onClose={() => setSelected(null)} />
			) : null}
		</>
	)
}
