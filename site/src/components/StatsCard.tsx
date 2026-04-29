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
			className="gradient-border-hover group animate-count-up rounded-xl bg-bg-card/60 p-5 backdrop-blur-sm transition-all"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="mb-3 text-3xl transition-transform group-hover:scale-110">{icon}</div>
			<div className="text-3xl font-extrabold tracking-tight text-text">{display}</div>
			<div className="mt-1 text-sm font-medium text-text-muted">{label}</div>
		</div>
	)
}
