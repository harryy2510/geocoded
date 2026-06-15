# Geocoded API v2 Design

This document captures the v2 API structure and foundation rules. It is a
contract for the implemented v2 foundations and for future endpoint work.

## Root Collections

V2 uses root-level collection APIs. Relationships are exposed through
`filter[...]` parameters and explicit expansions, not nested-only routes.

```text
/v2/continents
/v2/regions
/v2/countries
/v2/states
/v2/cities

/v2/timezones
/v2/currencies
/v2/airlines

/v2/airports
/v2/ports
/v2/border-crossings

/v2/statistics
/v2/migrant-stocks
```

UN/LOCODE remains an internal/source identifier. It should appear as a field
where useful, but there should not be a public source-shaped `/v2/unlocodes`
collection.

## Shared Query Parameters

Every v2 collection uses the same core query contract:

```text
q
limit
cursor
sort
fields
expand
```

Only important, collection-specific filters should be enabled. First-pass
filters are:

```text
filter[country]
filter[state]
filter[continent]
filter[region]
filter[timezone]
filter[currency]
filter[iata]
filter[minPopulation]
filter[maxPopulation]
```

Filters must be whitelisted per collection. Raw top-level filter parameters
such as `countryCode=AE`, `continent=Asia`, or `status=RL` are not part of the
v2 contract. Source-shaped filters such as `filter[unLocode]`,
`filter[function]`, and `filter[status]` should not be public unless a concrete
product use case requires them.

## Expand

`expand` controls which related resources are included. It is explicit and uses
simple resource names.

```text
/v2/countries/AE?expand=statistics
```

An expanded value can be an object or an array. The projection layer applies the
same field rules to both shapes.

`fields=statistics.gdpPerCapitaCurrentUsd` does not imply
`expand=statistics`. Expansions must be requested through `expand`.

Additional expansions such as `country`, `state`, `timezone`, `currency`,
`migration`, `airports`, and `ports` should follow the same flat `expand`
contract when they are implemented.

## Fields

`fields` controls the output shape for the base resource and expanded resources.
Dot notation selects fields inside expansions or nested objects.

```text
fields=*
fields=name,iso2
fields=*,statistics.gdpPerCapitaCurrentUsd
fields=*,statistics.*,airports.name,airports.iataCode
```

Rules:

- `*` means all default public fields for the current scope.
- `statistics.*` means all default public fields for the expanded statistics
  resource.
- Nested object fields use dot notation.
- There is no recursive wildcard such as `**`.
- Internal fields such as source hashes, row IDs, and migration metadata are not
  public unless explicitly whitelisted.

Example:

```text
/v2/countries/AE?expand=statistics&fields=*,statistics.gdpPerCapitaCurrentUsd
```

This returns all default country fields and only
`gdpPerCapitaCurrentUsd` inside `statistics`.

## Statistics Shape

`/v2/statistics` is one row per country. The API should flatten the source
`indicators` object so field selection is clean.

```ts
type StatisticValue = {
	code: string
	name: string
	year: number
	value: number | null
}

type CountryStatistics = {
	id: string
	countryCode: string
	countryName: string
	iso3: string

	populationTotal: StatisticValue
	populationFemale: StatisticValue
	populationMale: StatisticValue
	populationDensity: StatisticValue

	urbanPopulationPercent: StatisticValue
	ruralPopulationPercent: StatisticValue

	age0To14Percent: StatisticValue
	age15To64Percent: StatisticValue
	age65PlusPercent: StatisticValue

	gdpCurrentUsd: StatisticValue
	gdpPerCapitaCurrentUsd: StatisticValue

	lifeExpectancy: StatisticValue
}
```

Do not add an `indicator=` query parameter initially. Specific statistics are
selected with `fields`.

```text
/v2/statistics?filter[country]=AE&fields=countryCode,countryName,gdpPerCapitaCurrentUsd
/v2/countries/AE?expand=statistics&fields=*,statistics.gdpPerCapitaCurrentUsd
```

## Query Module

The v2 query module provides reusable behavior for future endpoints:

- resource configs
- public field whitelists
- filter whitelists
- search field whitelists
- sort whitelists
- explicit expand parsing
- nested field projection with scoped wildcards
- safe SQL where/sort generation with bound values

Endpoint implementation should use this module instead of hand-parsing filters
or constructing SQL directly.
