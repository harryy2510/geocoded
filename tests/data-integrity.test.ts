import { describe, expect, test } from 'bun:test'

type StateRow = {
	countryCode: string
	iso2: string
}

type CityRow = {
	countryCode: string
	stateCode: string
	stateName: string
}

describe('data integrity', () => {
	test('state-scoped cities reference an existing state parent', async () => {
		const [states, cities] = await Promise.all([
			readJson<StateRow[]>('states.json'),
			readJson<CityRow[]>('cities.json')
		])
		const stateKeys = new Set(
			states.map((state) => `${state.countryCode}:${state.iso2}`)
		)

		const brokenScopedCities = cities.filter(
			(city) =>
				city.stateCode !== '' &&
				!stateKeys.has(`${city.countryCode}:${city.stateCode}`)
		)
		const malformedUnscopedCities = cities.filter(
			(city) => city.stateCode === '' && city.stateName !== ''
		)

		expect(brokenScopedCities).toEqual([])
		expect(malformedUnscopedCities).toEqual([])
	})
})

async function readJson<T>(filename: string): Promise<T> {
	return JSON.parse(await Bun.file(`data/${filename}`).text()) as T
}
