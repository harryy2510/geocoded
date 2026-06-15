import { useEffect, useState } from 'react'
import { formatFull } from '../../lib/format'
import { fetchV2List } from './api'
import { dash, flagEmoji, formatCoords, formatOffset, formatToken } from './helpers'
import { Badge, DetailDrawer, Fact, FactGrid, Section } from './ui'
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
import { resolveContinentName } from '../../lib/format'

// Small lookup of ISO2 -> country name, fetched once per detail mount where useful.
function useCountryNames(codes: string[]): Map<string, string> {
	const [names, setNames] = useState<Map<string, string>>(new Map())
	const key = [...new Set(codes.filter(Boolean))].sort().join(',')

	useEffect(() => {
		let cancelled = false
		const list = key ? key.split(',') : []
		if (list.length === 0) {
			setNames(new Map())
			return
		}
		Promise.all(
			list.map((code) =>
				fetchV2List<CountryRef>('/v2/countries', {
					filters: { country: code },
					fields: 'iso2,name',
					limit: 1,
				})
					.then((res) => [code, res.data[0]?.name ?? code] as const)
					.catch(() => [code, code] as const)
			)
		).then((pairs) => {
			if (!cancelled) setNames(new Map(pairs))
		})
		return () => {
			cancelled = true
		}
	}, [key])

	return names
}

export function CityDetail({ city, onClose }: { city: CityRecord; onClose: () => void }) {
	return (
		<DetailDrawer
			icon={flagEmoji(city.countryCode)}
			title={city.name}
			subtitle={`${city.stateName || dash(city.stateCode)} · ${city.countryName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Country" value={`${flagEmoji(city.countryCode)} ${city.countryName}`} />
				<Fact label="State / Region" value={dash(city.stateName)} />
				<Fact label="State code" value={dash(city.stateCode)} />
				<Fact label="Population" value={city.population ? formatFull(city.population) : 'N/A'} />
				<Fact label="Timezone" value={dash(city.timezone)} />
				<Fact label="Coordinates" value={formatCoords(city.latitude, city.longitude)} />
				<Fact label="Geoname ID" value={dash(city.geonameId)} />
				<Fact label="Record ID" value={dash(city.id)} />
			</FactGrid>
		</DetailDrawer>
	)
}

export function StateDetail({ state, onClose }: { state: StateRecord; onClose: () => void }) {
	return (
		<DetailDrawer
			icon={flagEmoji(state.countryCode)}
			title={state.name}
			subtitle={`${state.type} · ${state.countryName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Country" value={`${flagEmoji(state.countryCode)} ${state.countryName}`} />
				<Fact label="Type" value={dash(state.type)} />
				<Fact label="State code" value={dash(state.stateCode)} />
				<Fact label="ISO 3166-2" value={dash(state.iso31662)} />
				<Fact label="Capital" value={dash(state.capital)} />
				<Fact label="Population" value={state.population ? formatFull(state.population) : 'N/A'} />
				<Fact label="Timezone" value={dash(state.timezone)} />
				<Fact label="Coordinates" value={formatCoords(state.latitude, state.longitude)} />
			</FactGrid>
		</DetailDrawer>
	)
}

export function AirportDetail({
	airport,
	onClose,
}: {
	airport: AirportRecord
	onClose: () => void
}) {
	return (
		<DetailDrawer
			icon="✈"
			title={airport.name}
			subtitle={`${airport.iataCode || 'No IATA'} · ${airport.countryName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="IATA" value={dash(airport.iataCode)} />
				<Fact label="UN/LOCODE" value={dash(airport.unLocode)} />
				<Fact label="Location code" value={dash(airport.airportLocationCode)} />
				<Fact label="Country" value={`${flagEmoji(airport.countryCode)} ${airport.countryName}`} />
				<Fact label="State / Region" value={dash(airport.stateName)} />
				<Fact label="Elevation" value={airport.elevation != null ? `${airport.elevation} m` : 'N/A'} />
				<Fact label="Timezone" value={dash(airport.timezone)} />
				<Fact label="Coordinates" value={formatCoords(airport.latitude, airport.longitude)} />
				<Fact label="Geoname ID" value={dash(airport.geonameId)} />
				<Fact label="Updated" value={dash(airport.modificationDate)} />
			</FactGrid>
			{airport.alternateNames.length > 0 ? (
				<Section title={`Alternate names (${airport.alternateNames.length})`}>
					<div className="flex flex-wrap gap-1.5">
						{airport.alternateNames.slice(0, 40).map((name) => (
							<Badge key={name}>{name}</Badge>
						))}
					</div>
				</Section>
			) : null}
		</DetailDrawer>
	)
}

export function AirlineDetail({
	airline,
	onClose,
}: {
	airline: AirlineRecord
	onClose: () => void
}) {
	return (
		<DetailDrawer
			icon="🛫"
			title={airline.name}
			subtitle={`${airline.iataCode || airline.icaoCode || 'No code'} · ${airline.countryName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="IATA" value={dash(airline.iataCode)} />
				<Fact label="ICAO" value={dash(airline.icaoCode)} />
				<Fact label="Accounting code" value={dash(airline.accountingCode)} />
				<Fact label="Country" value={`${flagEmoji(airline.countryCode)} ${airline.countryName}`} />
				<Fact label="Country code" value={dash(airline.countryCode)} />
				<Fact label="Duplicate" value={airline.controlledDuplicate ? 'Yes' : 'No'} />
			</FactGrid>
		</DetailDrawer>
	)
}

function PortLikeDetail({
	record,
	icon,
	onClose,
}: {
	record: PortRecord
	icon: string
	onClose: () => void
}) {
	return (
		<DetailDrawer
			icon={icon}
			title={record.name}
			subtitle={`${record.unLocode} · ${record.countryName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="UN/LOCODE" value={dash(record.unLocode)} />
				<Fact label="Location code" value={dash(record.locationCode)} />
				<Fact label="Country" value={`${flagEmoji(record.countryCode)} ${record.countryName}`} />
				<Fact label="Subdivision" value={dash(record.subdivisionCode)} />
				<Fact label="Status" value={dash(record.statusName || record.status)} />
				<Fact label="Coordinates" value={formatCoords(record.latitude, record.longitude)} />
				<Fact label="Function code" value={dash(record.functionCode)} />
				<Fact label="IATA" value={dash(record.iataCode)} />
			</FactGrid>
			{record.functions.length > 0 ? (
				<Section title="Functions">
					<div className="flex flex-wrap gap-1.5">
						{record.functions.map((fn) => (
							<Badge key={fn}>{formatToken(fn)}</Badge>
						))}
					</div>
				</Section>
			) : null}
			{record.alternateNames.length > 0 ? (
				<Section title={`Alternate names (${record.alternateNames.length})`}>
					<div className="flex flex-wrap gap-1.5">
						{record.alternateNames.slice(0, 40).map((name) => (
							<Badge key={name}>{name}</Badge>
						))}
					</div>
				</Section>
			) : null}
			{record.remarks ? (
				<Section title="Remarks">
					<p className="text-sm text-white/65">{record.remarks}</p>
				</Section>
			) : null}
		</DetailDrawer>
	)
}

export function PortDetail({ port, onClose }: { port: PortRecord; onClose: () => void }) {
	return <PortLikeDetail record={port} icon="⚓" onClose={onClose} />
}

export function BorderDetail({ border, onClose }: { border: PortRecord; onClose: () => void }) {
	return <PortLikeDetail record={border} icon="🛂" onClose={onClose} />
}

export function LanguageDetail({
	language,
	onClose,
}: {
	language: LanguageRecord
	onClose: () => void
}) {
	const memberNames = useLanguageNames(language.macrolanguageMemberCodes)
	return (
		<DetailDrawer
			icon="🗣"
			title={language.referenceName}
			subtitle={`${language.scope} · ${language.type}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="ISO 639-3" value={dash(language.iso6393)} />
				<Fact label="ISO 639-2B" value={dash(language.iso6392B)} />
				<Fact label="ISO 639-2T" value={dash(language.iso6392T)} />
				<Fact label="ISO 639-1" value={dash(language.iso6391)} />
				<Fact label="Scope" value={dash(language.scope)} />
				<Fact label="Type" value={dash(language.type)} />
				<Fact label="Macrolanguage" value={dash(language.macrolanguageCode)} />
				<Fact label="Members" value={language.macrolanguageMemberCodes.length || '—'} />
			</FactGrid>
			{language.names.length > 0 ? (
				<Section title={`Alternate names (${language.names.length})`}>
					<div className="flex flex-wrap gap-1.5">
						{language.names.slice(0, 60).map((name) => (
							<Badge key={`${name.printName}-${name.invertedName}`}>{name.printName}</Badge>
						))}
					</div>
				</Section>
			) : null}
			{language.macrolanguageMemberCodes.length > 0 ? (
				<Section title="Member languages">
					<div className="flex flex-wrap gap-1.5">
						{language.macrolanguageMemberCodes.map((code) => (
							<Badge key={code}>{memberNames.get(code) ? `${memberNames.get(code)} (${code})` : code}</Badge>
						))}
					</div>
				</Section>
			) : null}
			{language.comment ? (
				<Section title="Comment">
					<p className="text-sm text-white/65">{language.comment}</p>
				</Section>
			) : null}
		</DetailDrawer>
	)
}

function useLanguageNames(codes: string[]): Map<string, string> {
	const [names, setNames] = useState<Map<string, string>>(new Map())
	const key = [...new Set(codes.filter(Boolean))].sort().join(',')

	useEffect(() => {
		let cancelled = false
		const list = key ? key.split(',') : []
		if (list.length === 0) {
			setNames(new Map())
			return
		}
		fetchV2List<LanguageRecord>('/v2/languages', {
			fields: 'iso6393,referenceName',
			limit: 2000,
		})
			.then((res) => {
				if (cancelled) return
				const map = new Map(res.data.map((lang) => [lang.iso6393, lang.referenceName]))
				setNames(map)
			})
			.catch(() => {
				if (!cancelled) setNames(new Map())
			})
		return () => {
			cancelled = true
		}
	}, [key])

	return names
}

export function CurrencyDetail({
	currency,
	onClose,
}: {
	currency: CurrencyRecord
	onClose: () => void
}) {
	const names = useCountryNames(currency.countries)
	return (
		<DetailDrawer
			icon={currency.symbol}
			title={currency.name}
			subtitle={`${currency.code} · used by ${currency.countries.length} ${currency.countries.length === 1 ? 'country' : 'countries'}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Code" value={dash(currency.code)} />
				<Fact label="Symbol" value={dash(currency.symbol)} />
				<Fact label="Decimals" value={dash(currency.decimals)} />
				<Fact label="Countries" value={currency.countries.length} />
			</FactGrid>
			{currency.countries.length > 0 ? (
				<Section title={`Used in (${currency.countries.length})`}>
					<div className="flex flex-wrap gap-1.5">
						{currency.countries.map((code) => (
							<Badge key={code}>
								{flagEmoji(code)} {names.get(code) || code}
							</Badge>
						))}
					</div>
				</Section>
			) : null}
		</DetailDrawer>
	)
}

export function TimezoneDetail({
	timezone,
	onClose,
}: {
	timezone: TimezoneRecord
	onClose: () => void
}) {
	const names = useCountryNames(timezone.countryCodes)
	return (
		<DetailDrawer
			icon="🕓"
			title={timezone.timezone}
			subtitle={`${timezone.name} · ${timezone.standardOffsetName}`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Standard offset" value={formatOffset(timezone.standardOffset)} />
				<Fact label="Offset name" value={dash(timezone.standardOffsetName)} />
				<Fact label="Abbreviation" value={dash(timezone.standardAbbreviation || timezone.abbreviation)} />
				<Fact label="Area" value={dash(timezone.area)} />
				<Fact label="Location" value={dash(timezone.location)} />
				<Fact label="Observes DST" value={timezone.observesDst ? 'Yes' : 'No'} />
				<Fact
					label="DST offset"
					value={timezone.observesDst ? formatOffset(timezone.daylightOffset) : '—'}
				/>
				<Fact label="Coordinates" value={formatCoords(timezone.latitude, timezone.longitude)} />
			</FactGrid>
			{timezone.observesDst && timezone.daylightName ? (
				<Section title="Daylight saving">
					<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
						<Fact label="DST name" value={dash(timezone.daylightName)} />
						<Fact label="DST abbreviation" value={dash(timezone.daylightAbbreviation)} />
						<Fact label="DST offset name" value={dash(timezone.daylightOffsetName)} />
					</div>
				</Section>
			) : null}
			{timezone.countryCodes.length > 0 ? (
				<Section title={`Countries (${timezone.countryCodes.length})`}>
					<div className="flex flex-wrap gap-1.5">
						{timezone.countryCodes.map((code) => (
							<Badge key={code}>
								{flagEmoji(code)} {names.get(code) || code}
							</Badge>
						))}
					</div>
				</Section>
			) : null}
		</DetailDrawer>
	)
}

export function ContinentDetail({
	continent,
	onClose,
}: {
	continent: ContinentRecord
	onClose: () => void
}) {
	return (
		<DetailDrawer
			icon="🌍"
			title={resolveContinentName(continent.name || continent.id)}
			subtitle={`${continent.countryCount} countries`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Code" value={dash(continent.id)} />
				<Fact label="Name" value={resolveContinentName(continent.name || continent.id)} />
				<Fact label="Countries" value={dash(continent.countryCount)} />
			</FactGrid>
		</DetailDrawer>
	)
}

export function RegionDetail({ region, onClose }: { region: RegionRecord; onClose: () => void }) {
	return (
		<DetailDrawer
			icon="🗺"
			title={region.name}
			subtitle={`${resolveContinentName(region.continent)} · ${region.countryCount} countries`}
			onClose={onClose}
		>
			<FactGrid>
				<Fact label="Name" value={dash(region.name)} />
				<Fact label="Continent" value={resolveContinentName(region.continent)} />
				<Fact label="Countries" value={dash(region.countryCount)} />
				<Fact label="Record ID" value={dash(region.id)} />
			</FactGrid>
		</DetailDrawer>
	)
}
