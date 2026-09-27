import { filterOptions, type PickerOption } from 'picker-core'

export type CurrencyCode = string

export type CurrencyRecord = {
	code: string
	name: string
	symbol: string
	decimals?: number
	countries: string[]
}

export type CurrencyCodeOption = PickerOption<CurrencyCode, CurrencyRecord> & {
	code: string
	name: string
	symbol: string
	decimals: number
	countries: string[]
}

export type CurrencyDisplay = 'code' | 'name' | 'symbol' | 'code-name' | 'full'

/** Turn a `/v2/currencies` row into a picker option. */
export function toCurrencyCodeOption(
	currency: CurrencyRecord
): CurrencyCodeOption {
	const decimals = currency.decimals ?? 2
	return {
		value: currency.code,
		label: formatCurrencyOption(currency),
		code: currency.code,
		name: currency.name,
		symbol: currency.symbol,
		decimals,
		countries: currency.countries,
		keywords: [
			currency.code,
			currency.name,
			currency.symbol,
			...currency.countries
		].filter(Boolean),
		meta: { ...currency, decimals }
	}
}

/** Normalize a currency code to uppercase ISO 4217. */
export function formatCurrencyCode(code: string): string {
	return code.trim().toUpperCase()
}

/** Display name for a currency, falling back to its code. */
export function formatCurrencyName(currency: CurrencyRecord): string {
	return currency.name || formatCurrencyCode(currency.code)
}

/** Format a currency for a picker label. Default is `USD - US Dollar`. */
export function formatCurrencyOption(
	currency: CurrencyRecord,
	display: CurrencyDisplay = 'code-name'
): string {
	const code = formatCurrencyCode(currency.code)
	const name = formatCurrencyName(currency)
	const symbol = currency.symbol
	if (display === 'code') return code
	if (display === 'name') return name
	if (display === 'symbol') return symbol || code
	if (display === 'full')
		return `${symbol ? `${symbol} ` : ''}${code} - ${name}`
	return `${code} - ${name}`
}

/** Decimal places for a currency row or code. Defaults to 2. */
export function getCurrencyDecimals(
	currencyOrCode: CurrencyRecord | string,
	currencies: CurrencyRecord[] = []
): number {
	if (typeof currencyOrCode !== 'string') return currencyOrCode.decimals ?? 2
	const code = formatCurrencyCode(currencyOrCode)
	return currencies.find((currency) => currency.code === code)?.decimals ?? 2
}

/** Accent-insensitive filter over currency options. */
export function filterCurrencies(
	currencies: CurrencyCodeOption[],
	query: string
): CurrencyCodeOption[] {
	return filterOptions(currencies, query, {
		getOptionKeywords: (currency) => currency.keywords ?? []
	})
}

/** Currencies used by one ISO2 country code. */
export function currenciesByCountry(
	currencies: CurrencyRecord[],
	countryCode: string
): CurrencyRecord[] {
	const code = countryCode.trim().toUpperCase()
	return currencies.filter((currency) => currency.countries.includes(code))
}
