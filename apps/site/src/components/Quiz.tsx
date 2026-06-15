import { useState, useEffect } from 'react'
import { createGeocodedClient } from '@geocoded/client'

const client = createGeocodedClient({ apiUrl: import.meta.env.PUBLIC_API_URL || 'https://api.geocoded.me' })

export function Quiz() {
	const [countries, setCountries] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [question, setQuestion] = useState<any | null>(null)
	const [options, setOptions] = useState<any[]>([])
	const [score, setScore] = useState(0)
	const [answered, setAnswered] = useState(false)

	useEffect(() => {
		client.fetchCountries().then((res) => {
			setCountries(res)
			generateQuestion(res)
			setLoading(false)
		})
	}, [])

	const generateQuestion = (data: any[]) => {
		const shuffled = [...data].sort(() => 0.5 - Math.random())
		const correct = shuffled[0]
		const opts = shuffled.slice(0, 4).sort(() => 0.5 - Math.random())
		setQuestion(correct)
		setOptions(opts)
		setAnswered(false)
	}

	const handleAnswer = (opt: any) => {
		if (answered) return
		setAnswered(true)
		if (opt.iso2 === question.iso2) {
			setScore(s => s + 1)
			setTimeout(() => generateQuestion(countries), 1000)
		} else {
			setScore(0)
			setTimeout(() => generateQuestion(countries), 2000)
		}
	}

	if (loading) return <div className="text-white/40 font-mono animate-pulse uppercase tracking-widest text-sm p-12 text-center w-full">Booting simulation...</div>

	return (
		<div className="flex flex-col gap-12 animate-fade-in max-w-3xl mx-auto w-full">
			<div className="text-center">
				<h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4">Simulation</h1>
				<p className="text-white/60 text-lg">Test geographical intelligence.</p>
				<div className="mt-8 font-mono tracking-widest uppercase">
					<span className="text-white/40">Current Score: </span>
					<span className="text-white text-xl font-bold">{score}</span>
				</div>
			</div>

			<div className="lux-panel p-8 md:p-16 flex flex-col items-center">
				<div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-12">Identify the region origin of this signature:</div>
				<div className="text-8xl md:text-[12rem] mb-16 leading-none">{question.emoji}</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
					{options.map(opt => (
						<button
							key={opt.iso2}
							onClick={() => handleAnswer(opt)}
							className={`p-6 border font-bold uppercase tracking-tight text-sm md:text-base transition-all
								${answered && opt.iso2 === question.iso2 ? 'bg-white text-black border-white' : ''}
								${answered && opt.iso2 !== question.iso2 ? 'opacity-20 border-white/10 text-white/40' : ''}
								${!answered ? 'border-white/20 hover:bg-white/10' : ''}
							`}
						>
							{opt.name}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
