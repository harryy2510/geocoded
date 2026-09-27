import { describe, expect, test } from 'bun:test'
import {
	currenciesByCountry,
	filterCurrencies,
	formatCurrencyOption,
	getCurrencyDecimals,
	toCurrencyCodeOption
} from 'currency-code-formatters'

const currencies = [
	{
		code: 'USD',
		name: 'US Dollar',
		symbol: '$',
		decimals: 2,
		countries: ['US']
	},
	{ code: 'JPY', name: 'Yen', symbol: '¥', decimals: 0, countries: ['JP'] },
	{
		code: 'EUR',
		name: 'Euro',
		symbol: '€',
		decimals: 2,
		countries: ['DE', 'FR']
	}
]

describe('currency-code-formatters', () => {
	test('formats currency options', () => {
		expect(formatCurrencyOption(currencies[0]!)).toBe('USD - US Dollar')
		expect(formatCurrencyOption(currencies[0]!, 'full')).toBe(
			'$ USD - US Dollar'
		)
	})

	test('returns decimals with fallback', () => {
		expect(getCurrencyDecimals('JPY', currencies)).toBe(0)
		expect(getCurrencyDecimals('AED', currencies)).toBe(2)
	})

	test('filters by code, name, symbol, and country', () => {
		const options = currencies.map(toCurrencyCodeOption)

		expect(
			filterCurrencies(options, 'yen').map((option) => option.code)
		).toEqual(['JPY'])
		expect(
			filterCurrencies(options, 'fr').map((option) => option.code)
		).toEqual(['EUR'])
	})

	test('finds currencies by country', () => {
		expect(
			currenciesByCountry(currencies, 'de').map((currency) => currency.code)
		).toEqual(['EUR'])
	})
})
