import { type QuizModeDef } from './types'

type ResultsScreenProps = {
	mode: QuizModeDef
	score: number
	bestStreak: number
	total: number
	onPlayAgain: () => void
	onBackToModes: () => void
}

function verdict(bestStreak: number, total: number): string {
	if (bestStreak >= total) return 'Flawless run.'
	if (bestStreak >= Math.ceil(total * 0.7)) return 'Sharp work.'
	if (bestStreak >= Math.ceil(total * 0.4)) return 'Solid effort.'
	return 'Room to grow.'
}

export function ResultsScreen({
	mode,
	score,
	bestStreak,
	total,
	onPlayAgain,
	onBackToModes,
}: ResultsScreenProps) {
	return (
		<div className="flex flex-col gap-12 animate-fade-in max-w-2xl mx-auto w-full text-center">
			<div>
				<div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-4">
					{mode.title} // Complete
				</div>
				<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-3">
					Results
				</h1>
				<p className="text-white/60 text-lg">{verdict(bestStreak, total)}</p>
			</div>

			<div className="grid grid-cols-2 gap-px bg-white/10">
				<div className="bg-black p-8 flex flex-col gap-2">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
						Final Score
					</span>
					<span className="text-4xl md:text-5xl font-bold tracking-tighter">
						{score}
					</span>
				</div>
				<div className="bg-black p-8 flex flex-col gap-2">
					<span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
						Best Streak
					</span>
					<span className="text-4xl md:text-5xl font-bold tracking-tighter">
						{bestStreak}
						<span className="text-white/30 text-2xl"> / {total}</span>
					</span>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 justify-center">
				<button
					type="button"
					onClick={onPlayAgain}
					className="px-10 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-white/80 transition-colors"
				>
					Play again →
				</button>
				<button
					type="button"
					onClick={onBackToModes}
					className="px-10 py-4 border border-white/20 font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-colors"
				>
					Back to modes
				</button>
			</div>
		</div>
	)
}
