import { useState, useEffect, useCallback, useMemo } from 'react'
import { type Country, fetchCountries } from '../lib/api'
import { formatCompact, formatArea } from '../lib/format'

type QuizMode = 'capital' | 'flag' | 'population' | 'geography' | 'neighbour'
type Phase = 'menu' | 'playing' | 'result'

type Question = {
	prompt: string
	subtext?: string
	options: string[]
	correctIndex: number
}

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr]
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[copy[i], copy[j]] = [copy[j], copy[i]]
	}
	return copy
}

function pickRandom<T>(arr: T[], count: number): T[] {
	return shuffle(arr).slice(0, count)
}

function generateQuestions(
	mode: QuizMode,
	countries: Country[],
	count: number,
): Question[] {
	const valid = countries.filter(
		(c) => c.name && c.capital && c.population > 0 && c.areaSqKm > 0,
	)
	const questions: Question[] = []

	for (let i = 0; i < count; i++) {
		const pool = shuffle(valid)

		if (mode === 'capital') {
			const target = pool[0]
			const wrongOptions = pool
				.slice(1)
				.filter((c) => c.capital && c.capital !== target.capital)
				.slice(0, 3)
				.map((c) => c.capital)
			const options = shuffle([target.capital, ...wrongOptions])
			questions.push({
				prompt: `What is the capital of ${target.emoji} ${target.name}?`,
				options,
				correctIndex: options.indexOf(target.capital),
			})
		}

		if (mode === 'flag') {
			const target = pool.find((c) => c.emoji)
			if (!target) continue
			const wrongOptions = pool
				.filter((c) => c.iso2 !== target.iso2 && c.emoji)
				.slice(0, 3)
				.map((c) => c.name)
			const options = shuffle([target.name, ...wrongOptions])
			questions.push({
				prompt: 'Which country does this flag belong to?',
				subtext: target.emoji,
				options,
				correctIndex: options.indexOf(target.name),
			})
		}

		if (mode === 'population') {
			const [a, b] = pool.slice(0, 2)
			if (a.population === b.population) continue
			const bigger = a.population > b.population ? a : b
			const options = [`${a.emoji} ${a.name}`, `${b.emoji} ${b.name}`]
			questions.push({
				prompt: 'Which country has a larger population?',
				subtext: `${a.emoji} ${a.name} (${formatCompact(a.population)}) vs ${b.emoji} ${b.name} (${formatCompact(b.population)})`,
				options,
				correctIndex: options.indexOf(`${bigger.emoji} ${bigger.name}`),
			})
		}

		if (mode === 'geography') {
			const [a, b] = pool.slice(0, 2)
			if (a.areaSqKm === b.areaSqKm) continue
			const bigger = a.areaSqKm > b.areaSqKm ? a : b
			const options = [`${a.emoji} ${a.name}`, `${b.emoji} ${b.name}`]
			questions.push({
				prompt: 'Which country is larger by area?',
				subtext: `${a.emoji} ${a.name} (${formatArea(a.areaSqKm)}) vs ${b.emoji} ${b.name} (${formatArea(b.areaSqKm)})`,
				options,
				correctIndex: options.indexOf(`${bigger.emoji} ${bigger.name}`),
			})
		}

		if (mode === 'neighbour') {
			const withNeighbours = pool.filter(
				(c) => c.neighbours?.length > 0,
			)
			if (withNeighbours.length === 0) continue
			const target = withNeighbours[0]
			const correctNeighbour = target.neighbours[Math.floor(Math.random() * target.neighbours.length)]
			const correctCountry = valid.find((c) => c.iso2 === correctNeighbour)
			if (!correctCountry) continue
			const wrongOptions = pool
				.filter(
					(c) =>
						c.iso2 !== target.iso2 &&
						!target.neighbours.includes(c.iso2),
				)
				.slice(0, 3)
				.map((c) => `${c.emoji} ${c.name}`)
			const correctLabel = `${correctCountry.emoji} ${correctCountry.name}`
			const options = shuffle([correctLabel, ...wrongOptions])
			questions.push({
				prompt: `${target.emoji} ${target.name} borders which of these countries?`,
				options,
				correctIndex: options.indexOf(correctLabel),
			})
		}
	}

	return questions.slice(0, count)
}

const MODES: { id: QuizMode; label: string; icon: string; description: string }[] = [
	{ id: 'capital', label: 'Capital Quiz', icon: '🏛️', description: 'Guess the capital city' },
	{ id: 'flag', label: 'Flag Quiz', icon: '🏴', description: 'Identify countries by flag' },
	{
		id: 'population',
		label: 'Population Quiz',
		icon: '👥',
		description: 'Which country has more people?',
	},
	{
		id: 'geography',
		label: 'Geography Quiz',
		icon: '🗺️',
		description: 'Which country is larger?',
	},
	{
		id: 'neighbour',
		label: 'Neighbour Quiz',
		icon: '🤝',
		description: 'Which country borders this one?',
	},
]

function getHighScore(mode: QuizMode): number {
	try {
		return parseInt(localStorage.getItem(`quiz-highscore-${mode}`) || '0', 10)
	} catch {
		return 0
	}
}

function setHighScore(mode: QuizMode, score: number) {
	try {
		const current = getHighScore(mode)
		if (score > current) {
			localStorage.setItem(`quiz-highscore-${mode}`, String(score))
		}
	} catch {
		/* noop */
	}
}

export function Quiz() {
	const [countries, setCountries] = useState<Country[]>([])
	const [loading, setLoading] = useState(true)
	const [phase, setPhase] = useState<Phase>('menu')
	const [mode, setMode] = useState<QuizMode>('capital')
	const [questions, setQuestions] = useState<Question[]>([])
	const [currentQ, setCurrentQ] = useState(0)
	const [score, setScore] = useState(0)
	const [selected, setSelected] = useState<number | null>(null)
	const [answered, setAnswered] = useState(false)

	useEffect(() => {
		fetchCountries()
			.then(setCountries)
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	const startQuiz = useCallback(
		(m: QuizMode) => {
			setMode(m)
			const qs = generateQuestions(m, countries, 10)
			setQuestions(qs)
			setCurrentQ(0)
			setScore(0)
			setSelected(null)
			setAnswered(false)
			setPhase('playing')
		},
		[countries],
	)

	const handleAnswer = useCallback(
		(idx: number) => {
			if (answered) return
			setSelected(idx)
			setAnswered(true)
			if (idx === questions[currentQ].correctIndex) {
				setScore((s) => s + 1)
			}

			setTimeout(() => {
				if (currentQ + 1 >= questions.length) {
					const finalScore =
						idx === questions[currentQ].correctIndex ? score + 1 : score
					setHighScore(mode, finalScore)
					setPhase('result')
				} else {
					setCurrentQ((q) => q + 1)
					setSelected(null)
					setAnswered(false)
				}
			}, 1200)
		},
		[answered, currentQ, questions, score, mode],
	)

	const highScores = useMemo(
		() =>
			MODES.reduce(
				(acc, m) => {
					acc[m.id] = getHighScore(m.id)
					return acc
				},
				{} as Record<QuizMode, number>,
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[phase],
	)

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
			</div>
		)
	}

	if (phase === 'menu') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-text">Geography Quiz</h1>
					<p className="mt-1 text-sm text-text-muted">
						Test your knowledge across 5 quiz modes, 10 questions each
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{MODES.map((m) => (
						<button
							key={m.id}
							onClick={() => startQuiz(m.id)}
							className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-bg-card p-6 text-left transition-all hover:border-accent hover:bg-bg-card-hover active:scale-[0.98]"
						>
							<span className="text-3xl">{m.icon}</span>
							<div>
								<h3 className="font-semibold text-text group-hover:text-accent">
									{m.label}
								</h3>
								<p className="mt-0.5 text-xs text-text-muted">{m.description}</p>
							</div>
							{highScores[m.id] > 0 ? (
								<div className="mt-auto text-xs text-text-dim">
									Best: {highScores[m.id]}/10
								</div>
							) : null}
						</button>
					))}
				</div>
			</div>
		)
	}

	if (phase === 'result') {
		const pct = (score / questions.length) * 100
		const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👏' : '💪'
		const message =
			pct >= 90
				? 'Outstanding!'
				: pct >= 70
					? 'Great job!'
					: pct >= 50
						? 'Not bad!'
						: 'Keep practicing!'

		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="animate-fade-in space-y-6 text-center">
					<div className="text-6xl">{emoji}</div>
					<div>
						<h2 className="text-2xl font-bold text-text">{message}</h2>
						<p className="mt-1 text-text-muted">
							You scored{' '}
							<span className="font-bold text-accent">
								{score}/{questions.length}
							</span>
						</p>
					</div>
					<div className="text-sm text-text-dim">
						High score: {getHighScore(mode)}/10
					</div>
					<div className="flex gap-3">
						<button
							onClick={() => startQuiz(mode)}
							className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
						>
							Play Again
						</button>
						<button
							onClick={() => setPhase('menu')}
							className="rounded-lg border border-border bg-bg-card px-6 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-card-hover"
						>
							Back to Menu
						</button>
					</div>
				</div>
			</div>
		)
	}

	const q = questions[currentQ]
	if (!q) {
		return (
			<div className="py-20 text-center text-text-muted">
				Not enough data for this quiz mode. Try another.
				<button
					onClick={() => setPhase('menu')}
					className="mt-4 block mx-auto text-accent hover:underline"
				>
					Back to Menu
				</button>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-2xl space-y-8 py-8">
			<div className="flex items-center justify-between">
				<button
					onClick={() => setPhase('menu')}
					className="text-sm text-text-dim hover:text-text"
				>
					&larr; Quit
				</button>
				<div className="flex items-center gap-3">
					<span className="text-sm text-text-muted">
						{currentQ + 1}/{questions.length}
					</span>
					<div className="flex gap-1">
						{questions.map((_, i) => (
							<div
								key={i}
								className={`size-2 rounded-full transition-colors ${
									i < currentQ
										? 'bg-accent'
										: i === currentQ
											? 'bg-accent/50'
											: 'bg-border'
								}`}
							/>
						))}
					</div>
					<span className="text-sm font-semibold text-accent">{score} pts</span>
				</div>
			</div>

			<div className="animate-fade-in space-y-6 text-center" key={currentQ}>
				{q.subtext && mode === 'flag' ? (
					<div className="text-8xl">{q.subtext}</div>
				) : null}

				<h2 className="text-xl font-bold text-text">{q.prompt}</h2>

				{q.subtext && mode !== 'flag' ? (
					<p className="text-sm text-text-muted">{q.subtext}</p>
				) : null}

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{q.options.map((opt, idx) => {
						let bg = 'border-border bg-bg-card hover:border-border-hover hover:bg-bg-card-hover'
						if (answered) {
							if (idx === q.correctIndex) {
								bg = 'border-green-500/50 bg-green-500/10 text-green-400'
							} else if (idx === selected && idx !== q.correctIndex) {
								bg = 'border-red-500/50 bg-red-500/10 text-red-400'
							} else {
								bg = 'border-border bg-bg-card opacity-50'
							}
						}

						return (
							<button
								key={idx}
								onClick={() => handleAnswer(idx)}
								disabled={answered}
								className={`rounded-xl border p-4 text-center text-sm font-medium transition-all ${bg} ${
									!answered ? 'active:scale-[0.97]' : ''
								}`}
							>
								{opt}
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}
