import { describe, expect, test } from 'bun:test'
import {
	defineV2Resource,
	parseV2Query,
	projectV2Fields
} from '../apps/api/src/v2/query'

const statisticsResource = defineV2Resource({
	name: 'statistics',
	fields: {
		id: { type: 'string', column: 'country_code' },
		countryCode: { type: 'string', column: 'country_code' },
		countryName: { type: 'string', column: 'country_name' },
		iso3: { type: 'string', column: 'iso3' },
		gdpPerCapitaCurrentUsd: { type: 'object' },
		populationTotal: { type: 'object' },
		lifeExpectancy: { type: 'object' }
	},
	defaultFields: [
		'id',
		'countryCode',
		'countryName',
		'iso3',
		'gdpPerCapitaCurrentUsd',
		'populationTotal',
		'lifeExpectancy'
	]
})

const airportResource = defineV2Resource({
	name: 'airports',
	fields: {
		id: { type: 'string', column: 'id' },
		name: { type: 'string', column: 'name', searchable: true },
		iataCode: { type: 'string', column: 'iata_code' },
		countryCode: { type: 'string', column: 'country_code' }
	},
	defaultFields: ['id', 'name', 'iataCode', 'countryCode']
})

const countryResource = defineV2Resource({
	name: 'countries',
	fields: {
		id: { type: 'string', column: 'iso2' },
		iso2: { type: 'string', column: 'iso2', normalize: 'uppercase' },
		iso3: { type: 'string', column: 'iso3', normalize: 'uppercase' },
		name: {
			type: 'string',
			column: 'name',
			caseInsensitive: true,
			searchable: true,
			sortable: true
		},
		continent: { type: 'string', column: 'continent' },
		region: { type: 'string', column: 'region' },
		currency: { type: 'string', column: 'currency', normalize: 'uppercase' },
		population: { type: 'number', column: 'population', sortable: true }
	},
	defaultFields: [
		'id',
		'iso2',
		'iso3',
		'name',
		'continent',
		'region',
		'currency',
		'population'
	],
	filters: {
		country: { field: 'iso2', operator: 'eq' },
		continent: { field: 'continent', operator: 'eq' },
		region: { field: 'region', operator: 'eq' },
		currency: { field: 'currency', operator: 'eq' },
		minPopulation: { field: 'population', operator: 'gte' },
		maxPopulation: { field: 'population', operator: 'lte' }
	},
	search: { fields: ['name', 'iso2', 'iso3'] },
	sort: {
		default: { field: 'name', direction: 'asc' }
	},
	expands: {
		statistics: { resource: statisticsResource, kind: 'object' },
		airports: { resource: airportResource, kind: 'array' }
	},
	strictUnknownParams: true
})

describe('v2 query utilities', () => {
	test('projects base fields and expanded object/array fields with scoped wildcards', () => {
		const parsed = parseV2Query(
			new URLSearchParams(
				'expand=statistics,airports&fields=*,statistics.gdpPerCapitaCurrentUsd,airports.name,airports.iataCode'
			),
			countryResource
		)

		expect(parsed.ok).toBe(true)
		if (!parsed.ok) return

		const projected = projectV2Fields(
			{
				id: 'AE',
				iso2: 'AE',
				iso3: 'ARE',
				name: 'United Arab Emirates',
				continent: 'Asia',
				region: 'Middle East',
				currency: 'AED',
				population: 10642745,
				sourceHash: 'internal',
				statistics: {
					id: 'AE',
					countryCode: 'AE',
					gdpPerCapitaCurrentUsd: {
						code: 'NY.GDP.PCAP.CD',
						name: 'GDP per capita',
						year: 2024,
						value: 53700
					},
					lifeExpectancy: { code: 'SP.DYN.LE00.IN', year: 2024, value: 79 }
				},
				airports: [
					{
						id: 'DXB',
						name: 'Dubai International Airport',
						iataCode: 'DXB',
						countryCode: 'AE',
						sourceHash: 'internal'
					}
				]
			},
			parsed.projection
		)

		expect(projected).toEqual({
			id: 'AE',
			iso2: 'AE',
			iso3: 'ARE',
			name: 'United Arab Emirates',
			continent: 'Asia',
			region: 'Middle East',
			currency: 'AED',
			population: 10642745,
			statistics: {
				gdpPerCapitaCurrentUsd: {
					code: 'NY.GDP.PCAP.CD',
					name: 'GDP per capita',
					year: 2024,
					value: 53700
				}
			},
			airports: [
				{
					name: 'Dubai International Airport',
					iataCode: 'DXB'
				}
			]
		})
	})

	test('keeps expand explicit and validates nested field paths', () => {
		expect(
			parseV2Query(
				new URLSearchParams('fields=*,statistics.gdpPerCapitaCurrentUsd'),
				countryResource
			)
		).toEqual({
			ok: false,
			error:
				'Query parameter "fields" includes "statistics.gdpPerCapitaCurrentUsd", but "statistics" is not expanded'
		})

		expect(
			parseV2Query(
				new URLSearchParams('expand=statistics.gdpPerCapitaCurrentUsd'),
				countryResource
			)
		).toEqual({
			ok: false,
			error: 'Query parameter "expand" must be one of: airports, statistics'
		})
	})

	test('builds whitelisted filters, search, and sort with bound values', () => {
		const parsed = parseV2Query(
			new URLSearchParams(
				'q=arab&filter[country]=ae&filter[currency]=aed&filter[minPopulation]=1000000&sort=-population'
			),
			countryResource
		)

		expect(parsed).toEqual({
			ok: true,
			appliedFilters: [
				{ name: 'country', field: 'iso2', operator: 'eq' },
				{ name: 'currency', field: 'currency', operator: 'eq' },
				{ name: 'minPopulation', field: 'population', operator: 'gte' }
			],
			bindings: ['AE', 'AED', 1000000, '%arab%', '%arab%', '%arab%'],
			expand: [],
			orderBySql: 'population DESC',
			projection: {
				fields: [
					'id',
					'iso2',
					'iso3',
					'name',
					'continent',
					'region',
					'currency',
					'population'
				],
				expands: {}
			},
			whereSql:
				"iso2 = ? AND currency = ? AND population >= ? AND (name COLLATE NOCASE LIKE ? ESCAPE '^' OR iso2 LIKE ? ESCAPE '^' OR iso3 LIKE ? ESCAPE '^')"
		})
	})

	test('rejects non-essential or unsupported filters for first-pass v2 APIs', () => {
		for (const query of [
			'filter[unLocode]=AEJEA',
			'filter[function]=port',
			'filter[status]=RL',
			'country=AE',
			'countryCode=AE'
		]) {
			expect(parseV2Query(new URLSearchParams(query), countryResource)).toEqual(
				{
					ok: false,
					error: `Unsupported query parameter "${query.split('=')[0]}"`
				}
			)
		}
	})
})
