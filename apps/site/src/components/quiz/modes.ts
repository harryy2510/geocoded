import { type CityRow, type CurrencyRow, fetchV2All } from '../../lib/v2'
import { resolveContinentName } from '../../lib/format'
import {
	type QuizCountry,
	type QuizGenerator,
	type QuizModeDef,
	type QuizModeId,
	type QuizOption,
	type QuizQuestion,
} from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Convert a 2-letter ISO 3166-1 alpha-2 code into its flag emoji by mapping
// each ASCII letter to its regional-indicator symbol. e.g. 'US' -> 🇺🇸.
export function flagEmoji(iso2: string): string {
	const code = iso2.trim().toUpperCase()
	if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return ''
	const base = 0x1f1e6
	const first = base + (code.charCodeAt(0) - 65)
	const second = base + (code.charCodeAt(1) - 65)
	return String.fromCodePoint(first, second)
}

// Fisher-Yates shuffle. Math.random is fine in app/browser code.
export function shuffle<T>(input: readonly T[]): T[] {
	const out = [...input]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const swap = out[i]
		out[i] = out[j]
		out[j] = swap
	}
	return out
}

function sample<T>(input: readonly T[], count: number): T[] {
	return shuffle(input).slice(0, count)
}

// Pick `count` distinct items, always including `mustInclude`.
function sampleWith<T>(
	pool: readonly T[],
	mustInclude: T,
	count: number,
	keyOf: (item: T) => string
): T[] {
	const targetKey = keyOf(mustInclude)
	const distractors = shuffle(pool.filter((item) => keyOf(item) !== targetKey))
	const picked = distractors.slice(0, Math.max(0, count - 1))
	return shuffle([mustInclude, ...picked])
}

function optionsFrom<T>(
	items: readonly T[],
	correctKey: string,
	keyOf: (item: T) => string,
	labelOf: (item: T) => string
): QuizOption[] {
	return items.map((item) => ({
		id: keyOf(item),
		label: labelOf(item),
		correct: keyOf(item) === correctKey,
	}))
}

// Filter countries down to those that carry a usable named answer.
function namedCountries(countries: QuizCountry[]): QuizCountry[] {
	return countries.filter((c) => Boolean(c.name) && Boolean(c.iso2))
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

const flagGenerator: QuizGenerator = async (countries, rounds) => {
	const pool = namedCountries(countries)
		.map((c) => ({ ...c, emoji: flagEmoji(c.iso2) }))
		.filter((c) => Boolean(c.emoji))
	if (pool.length < 4) return []
	return sample(pool, rounds).map((country): QuizQuestion => {
		const choices = sampleWith(pool, country, 4, (c) => c.iso2)
		return {
			instruction: 'Which country owns this flag?',
			prompt: { kind: 'flag', emoji: country.emoji },
			options: optionsFrom(
				choices,
				country.iso2,
				(c) => c.iso2,
				(c) => c.name
			),
		}
	})
}

const continentGenerator: QuizGenerator = async (countries, rounds) => {
	const pool = namedCountries(countries).filter((c) => Boolean(c.continent))
	if (pool.length < 1) return []
	// The distinct continents present, used as the answer set.
	const continentNames = [...new Set(pool.map((c) => resolveContinentName(c.continent)))]
	if (continentNames.length < 2) return []
	return sample(pool, rounds).map((country): QuizQuestion => {
		const correctName = resolveContinentName(country.continent)
		const others = shuffle(continentNames.filter((name) => name !== correctName))
		const labels = shuffle([correctName, ...others.slice(0, 3)])
		return {
			instruction: `Which continent is ${country.name} in?`,
			prompt: { kind: 'flag', emoji: flagEmoji(country.iso2) || '🌍' },
			options: labels.map((name) => ({
				id: name,
				label: name,
				correct: name === correctName,
			})),
		}
	})
}

const currencyGenerator: QuizGenerator = async (countries, rounds) => {
	const currencies = await fetchV2All<CurrencyRow>('/v2/currencies', 500, {
		fields: 'code,name,countries',
	})
	const nameByCode = new Map(currencies.map((cur) => [cur.code, cur.name]))
	// Only countries whose currency code we can resolve to a display name.
	const pool = namedCountries(countries).filter(
		(c) => Boolean(c.currency) && nameByCode.has(c.currency)
	)
	if (pool.length < 1 || currencies.length < 4) return []
	return sample(pool, rounds).map((country): QuizQuestion => {
		const correctCode = country.currency
		const distractors = shuffle(currencies.filter((cur) => cur.code !== correctCode)).slice(
			0,
			3
		)
		const correct: CurrencyRow = {
			code: correctCode,
			name: nameByCode.get(correctCode) ?? correctCode,
			symbol: '',
			countries: [],
		}
		const choices = shuffle([correct, ...distractors])
		return {
			instruction: `Which currency does ${country.name} use?`,
			prompt: { kind: 'flag', emoji: flagEmoji(country.iso2) || '💱' },
			options: choices.map((cur) => ({
				id: cur.code,
				label: `${cur.name} (${cur.code})`,
				correct: cur.code === correctCode,
			})),
		}
	})
}

const cityGenerator: QuizGenerator = async (countries, rounds) => {
	// Pull a sizeable sample of populous cities so we can spread across countries.
	const cities = await fetchV2All<CityRow>('/v2/cities', 2000, {
		sort: '-population',
		fields: 'name,countryCode,countryName',
	})
	const knownCodes = new Set(namedCountries(countries).map((c) => c.iso2))
	const nameOf = new Map(countries.map((c) => [c.iso2, c.name]))

	const byCountry = new Map<string, CityRow[]>()
	for (const city of cities) {
		if (!city.name || !city.countryCode || !knownCodes.has(city.countryCode)) continue
		const bucket = byCountry.get(city.countryCode)
		if (bucket) bucket.push(city)
		else byCountry.set(city.countryCode, [city])
	}
	const playableCodes = [...byCountry.keys()]
	if (playableCodes.length < 1) return []

	const questions: QuizQuestion[] = []
	for (const code of shuffle(playableCodes)) {
		if (questions.length >= rounds) break
		const correctCity = shuffle(byCountry.get(code) ?? [])[0]
		if (!correctCity) continue
		// Distractor cities from OTHER countries.
		const otherCities = cities.filter((c) => c.countryCode !== code && Boolean(c.name))
		const distractors = shuffle(otherCities).slice(0, 3)
		if (distractors.length < 3) continue
		const choices = shuffle([correctCity, ...distractors])
		questions.push({
			instruction: `Which city is in ${nameOf.get(code) ?? code}?`,
			prompt: { kind: 'flag', emoji: flagEmoji(code) || '🏙️' },
			options: choices.map((city, i) => ({
				id: `${city.countryCode}-${city.name}-${i}`,
				label: city.name,
				correct: city.countryCode === code && city.name === correctCity.name,
			})),
		})
	}
	return questions
}

const GENERATORS: Record<QuizModeId, QuizGenerator> = {
	flag: flagGenerator,
	continent: continentGenerator,
	currency: currencyGenerator,
	city: cityGenerator,
}

export const QUIZ_MODES: QuizModeDef[] = [
	{
		id: 'flag',
		title: 'Flag Quiz',
		tagline: 'Match the flag to its country.',
		glyph: '🏳️',
	},
	{
		id: 'continent',
		title: 'Continent Quiz',
		tagline: 'Place each country on its continent.',
		glyph: '🌍',
	},
	{
		id: 'currency',
		title: 'Currency Quiz',
		tagline: 'Match the country to its currency.',
		glyph: '💱',
	},
	{
		id: 'city',
		title: 'City Quiz',
		tagline: 'Spot the city that belongs to the country.',
		glyph: '🏙️',
	},
]

export async function generateQuestions(
	mode: QuizModeId,
	countries: QuizCountry[],
	rounds: number
): Promise<QuizQuestion[]> {
	const questions = await GENERATORS[mode](countries, rounds)
	// Drop any malformed questions (too few options) so the round stays clean.
	return questions.filter((q) => q.options.length >= 2)
}
