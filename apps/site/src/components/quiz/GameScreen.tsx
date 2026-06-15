import { useEffect, useState } from 'react'
import {
	type QuizModeDef,
	type QuizOption,
	type QuizQuestion,
} from './types'

const POINTS_PER_CORRECT = 10
// Bonus points that scale with the current streak, rewarding consistency.
const STREAK_BONUS = 5

type GameScreenProps = {
	mode: QuizModeDef
	questions: QuizQuestion[]
	onFinish: (result: { score: number; bestStreak: number; total: number }) => void
	onExit: () => void
}

function optionClass(answered: boolean, picked: string | null, option: QuizOption): string {
	const base =
		'w-full p-5 md:p-6 border text-left font-bold uppercase tracking-tight text-sm md:text-base transition-all duration-200'
	if (!answered) {
		return `${base} border-white/20 hover:bg-white/10 hover:border-white/40 cursor-pointer`
	}
	if (option.correct) {
		return `${base} bg-white text-black border-white`
	}
	if (picked === option.id) {
		// The wrong option the player picked: clearly marked as a miss.
		return `${base} border-red-500/60 text-red-300/80 bg-red-500/10`
	}
	return `${base} border-white/10 text-white/30 opacity-50`
}

export function GameScreen({ mode, questions, onFinish, onExit }: GameScreenProps) {
	const [index, setIndex] = useState(0)
	const [score, setScore] = useState(0)
	const [streak, setStreak] = useState(0)
	const [bestStreak, setBestStreak] = useState(0)
	const [answered, setAnswered] = useState(false)
	const [picked, setPicked] = useState<string | null>(null)

	const total = questions.length
	const question = questions[index]

	useEffect(() => {
		// Reset per-question UI state whenever we advance.
		setAnswered(false)
		setPicked(null)
	}, [index])

	function handleAnswer(option: QuizOption) {
		if (answered) return
		setAnswered(true)
		setPicked(option.id)

		if (option.correct) {
			// Award points + a streak bonus. Score NEVER resets on a miss.
			const nextStreak = streak + 1
			setStreak(nextStreak)
			setBestStreak((prev) => Math.max(prev, nextStreak))
			setScore((prev) => prev + POINTS_PER_CORRECT + nextStreak * STREAK_BONUS)
		} else {
			// A miss simply breaks the streak — no points lost, no reset to zero.
			setStreak(0)
		}
	}

	function advance() {
		if (index + 1 >= total) {
			onFinish({ score, bestStreak, total })
			return
		}
		setIndex((prev) => prev + 1)
	}

	if (!question) {
		return (
			<div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm p-12 text-center w-full">
				No questions available.
			</div>
		)
	}

	const progress = Math.round(((index + (answered ? 1 : 0)) / total) * 100)

	return (
		<div className="flex flex-col gap-8 animate-fade-in max-w-3xl mx-auto w-full">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onExit}
					className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
				>
					← Modes
				</button>
				<div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
					{mode.title}
				</div>
				<div className="flex gap-6 font-mono text-[10px] uppercase tracking-widest">
					<span>
						<span className="text-white/40">Streak </span>
						<span className="text-white font-bold">{streak}</span>
					</span>
					<span>
						<span className="text-white/40">Score </span>
						<span className="text-white font-bold">{score}</span>
					</span>
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
						Question {index + 1} / {total}
					</span>
					<span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
						{progress}%
					</span>
				</div>
				<div className="h-1 w-full bg-white/10">
					<div
						className="h-full bg-white transition-all duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			<div className="lux-panel p-8 md:p-12 flex flex-col items-center">
				<div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-8 text-center">
					{question.instruction}
				</div>
				{question.prompt.kind === 'flag' ? (
					<div className="text-7xl md:text-9xl mb-10 leading-none">
						{question.prompt.emoji}
					</div>
				) : (
					<div className="text-5xl md:text-7xl font-bold tracking-tighter mb-10 leading-none text-center">
						{question.prompt.text}
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
					{question.options.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => handleAnswer(option)}
							disabled={answered}
							className={optionClass(answered, picked, option)}
						>
							{option.label}
						</button>
					))}
				</div>

				{answered && (
					<button
						type="button"
						onClick={advance}
						className="mt-8 w-full md:w-auto px-10 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-white/80 transition-colors"
					>
						{index + 1 >= total ? 'See results →' : 'Next →'}
					</button>
				)}
			</div>
		</div>
	)
}
