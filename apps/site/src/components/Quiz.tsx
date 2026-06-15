import { useEffect, useRef, useState } from 'react'
import { type CountryRow, fetchCountriesWithStats } from '../lib/v2'
import { ModeSelect } from './quiz/ModeSelect'
import { GameScreen } from './quiz/GameScreen'
import { ResultsScreen } from './quiz/ResultsScreen'
import { QUIZ_MODES, generateQuestions } from './quiz/modes'
import {
	type QuizModeDef,
	type QuizModeId,
	type QuizPhase,
	type QuizQuestion,
} from './quiz/types'

const ROUNDS = 10

type RoundResult = {
	score: number
	bestStreak: number
	total: number
}

// Countries with their expanded statistics — the single source the quiz draws
// every mode from.
async function loadCountries(): Promise<CountryRow[]> {
	return fetchCountriesWithStats(300)
}

function findMode(id: QuizModeId): QuizModeDef {
	const mode = QUIZ_MODES.find((m) => m.id === id)
	if (!mode) throw new Error(`Unknown quiz mode: ${id}`)
	return mode
}

export function Quiz() {
	const [phase, setPhase] = useState<QuizPhase>('select')
	const [activeMode, setActiveMode] = useState<QuizModeId | null>(null)
	const [questions, setQuestions] = useState<QuizQuestion[]>([])
	const [result, setResult] = useState<RoundResult | null>(null)
	const [bestStreak, setBestStreak] = useState(0)
	const [error, setError] = useState<string | null>(null)

	// Countries are fetched once and reused across every round.
	const countriesRef = useRef<CountryRow[] | null>(null)

	useEffect(() => {
		let cancelled = false
		loadCountries()
			.then((data) => {
				if (!cancelled) countriesRef.current = data
			})
			.catch(() => {
				if (!cancelled) setError('Could not load country data. Is the data service running?')
			})
		return () => {
			cancelled = true
		}
	}, [])

	async function startMode(id: QuizModeId) {
		setActiveMode(id)
		setError(null)
		setPhase('loading')
		try {
			const countries = countriesRef.current ?? (await loadCountries())
			countriesRef.current = countries
			const generated = await generateQuestions(id, countries, ROUNDS)
			if (generated.length === 0) {
				throw new Error('No questions could be generated for this mode.')
			}
			setQuestions(generated)
			setPhase('playing')
		} catch {
			setError('Could not start this mode. Please try again.')
			setPhase('select')
		}
	}

	function handleFinish(round: RoundResult) {
		setResult(round)
		setBestStreak((prev) => Math.max(prev, round.bestStreak))
		setPhase('results')
	}

	function backToModes() {
		setActiveMode(null)
		setQuestions([])
		setResult(null)
		setPhase('select')
	}

	function playAgain() {
		if (activeMode) void startMode(activeMode)
	}

	if (phase === 'loading') {
		return (
			<div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm p-12 text-center w-full">
				Building your round...
			</div>
		)
	}

	if (phase === 'playing' && activeMode) {
		return (
			<GameScreen
				mode={findMode(activeMode)}
				questions={questions}
				onFinish={handleFinish}
				onExit={backToModes}
			/>
		)
	}

	if (phase === 'results' && activeMode && result) {
		return (
			<ResultsScreen
				mode={findMode(activeMode)}
				score={result.score}
				bestStreak={result.bestStreak}
				total={result.total}
				onPlayAgain={playAgain}
				onBackToModes={backToModes}
			/>
		)
	}

	return (
		<div className="flex flex-col gap-6 w-full">
			{error && (
				<div className="max-w-5xl mx-auto w-full border border-red-500/30 bg-red-500/10 text-red-200/90 text-sm font-mono p-4 text-center">
					{error}
				</div>
			)}
			<ModeSelect
				modes={QUIZ_MODES}
				bestStreak={bestStreak}
				onSelect={(id) => void startMode(id)}
			/>
		</div>
	)
}
