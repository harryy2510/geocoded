import { type CountryRow } from '../../lib/v2'

export type QuizModeId = 'flag' | 'continent' | 'currency' | 'city'

export type QuizOption = {
	id: string
	label: string
	correct: boolean
}

export type QuizPrompt =
	// A flag emoji shown big and centered.
	| { kind: 'flag'; emoji: string }
	// A piece of text (country name, glyph, etc.) shown as the prompt body.
	| { kind: 'text'; text: string }

export type QuizQuestion = {
	// Short instruction line, e.g. "Which country has more people?".
	instruction: string
	prompt: QuizPrompt
	options: QuizOption[]
}

export type QuizModeDef = {
	id: QuizModeId
	title: string
	tagline: string
	// A single representative glyph for the mode-select card.
	glyph: string
}

export type QuizPhase = 'select' | 'loading' | 'playing' | 'results'

// Quiz works on the thin country rows plus their expanded statistics, sourced
// from `/v2/countries?expand=statistics`. This is our own quiz-facing shape.
export type QuizCountry = CountryRow

export type QuizGenerator = (
	countries: QuizCountry[],
	rounds: number
) => Promise<QuizQuestion[]>
