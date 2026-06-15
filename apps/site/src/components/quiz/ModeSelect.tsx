import { type QuizModeDef, type QuizModeId } from './types'

type ModeSelectProps = {
	modes: QuizModeDef[]
	bestStreak: number
	onSelect: (mode: QuizModeId) => void
}

export function ModeSelect({ modes, bestStreak, onSelect }: ModeSelectProps) {
	return (
		<div className="flex flex-col gap-12 animate-fade-in max-w-3xl mx-auto w-full">
			<div className="text-center">
				<div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-4">
					Geocoded // Play
				</div>
				<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">
					Quiz
				</h1>
				<p className="text-white/60 text-lg">
					{modes.length} modes. Ten questions. Choose your battlefield.
				</p>
				{bestStreak > 0 && (
					<div className="mt-6 font-mono tracking-widest uppercase text-xs">
						<span className="text-white/40">Best streak: </span>
						<span className="text-white font-bold">{bestStreak}</span>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10">
				{modes.map((mode) => (
					<button
						key={mode.id}
						type="button"
						onClick={() => onSelect(mode.id)}
						className="group bg-black hover:bg-white/[0.04] transition-colors text-left p-8 flex flex-col gap-4 min-h-[180px]"
					>
						<div className="flex items-start justify-between">
							<span className="text-5xl leading-none">{mode.glyph}</span>
						</div>
						<div className="mt-auto">
							<h2 className="text-xl font-bold tracking-tight uppercase group-hover:text-white">
								{mode.title}
							</h2>
							<p className="text-white/50 text-sm mt-1">{mode.tagline}</p>
						</div>
						<div className="font-mono text-[10px] uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">
							Play →
						</div>
					</button>
				))}
			</div>
		</div>
	)
}
