import { useEffect, useRef, useState } from 'react'

function useCountUp(target: string, delay: number) {
	const [display, setDisplay] = useState(target)
	const ref = useRef<HTMLDivElement>(null)
	const animated = useRef(false)

	useEffect(() => {
		if (animated.current) return
		const el = ref.current
		if (!el) return

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !animated.current) {
						animated.current = true
						observer.unobserve(el)

						const hasK = target.includes('K')
						const numericStr = target.replace(/[,K+]/g, '')
						const targetNum = parseInt(numericStr, 10)
						if (isNaN(targetNum)) return

						const suffix = target.includes('+') ? '+' : ''
						const duration = 1200

						setTimeout(() => {
							const start = performance.now()
							function update(now: number) {
								const elapsed = now - start
								const progress = Math.min(elapsed / duration, 1)
								const eased = 1 - Math.pow(1 - progress, 3)
								const current = Math.round(targetNum * eased)

								if (hasK) {
									setDisplay(`${current.toLocaleString('en-US')}K${suffix}`)
								} else {
									setDisplay(`${current.toLocaleString('en-US')}${suffix}`)
								}

								if (progress < 1) {
									requestAnimationFrame(update)
								}
							}
							requestAnimationFrame(update)
						}, delay)
					}
				})
			},
			{ threshold: 0.3 },
		)

		observer.observe(el)
		return () => observer.disconnect()
	}, [target, delay])

	return { display, ref }
}

export function StatsCard({
	icon,
	label,
	value,
	delay = 0,
}: {
	icon: string
	label: string
	value: string
	delay?: number
}) {
	const { display, ref } = useCountUp(value, delay)

	return (
		<div
			ref={ref}
			className="glass-card group relative animate-count-up overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-6"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
			<div className="absolute bottom-0 left-0 h-[2px] w-0 bg-accent transition-all duration-500 group-hover:w-full" />

			<div className="mb-4 flex items-center justify-between">
				<div className="text-2xl transition-transform duration-300 group-hover:scale-110 sm:text-3xl drop-shadow-md">{icon}</div>
			</div>

			<div className="relative z-10">
				<div className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{display}</div>
				<div className="mt-2 text-xs font-bold uppercase tracking-widest text-text-muted">{label}</div>
			</div>
		</div>
	)
}
