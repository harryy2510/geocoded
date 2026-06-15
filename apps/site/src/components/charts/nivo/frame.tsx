import { useEffect, useState, type ReactNode } from 'react'

/**
 * Fixed-height responsive frame for nivo charts. nivo's Responsive* wrappers
 * need a sized parent; this gives a consistent, generous height across charts
 * with a sensible mobile shrink.
 */
export function ChartFrame({
	height = 320,
	mobileHeight,
	children,
}: {
	height?: number
	mobileHeight?: number
	children: ReactNode
}) {
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const media = window.matchMedia('(max-width: 640px)')
		const update = () => setIsMobile(media.matches)
		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [])

	const h = isMobile ? (mobileHeight ?? Math.max(240, height - 40)) : height

	return (
		<div className="w-full" style={{ height: h }}>
			{children}
		</div>
	)
}

/**
 * Empty/loading placeholder so panels never collapse while data is missing.
 */
export function ChartEmpty({ label = 'No data' }: { label?: string }) {
	return (
		<div className="flex h-full min-h-[200px] w-full items-center justify-center text-xs uppercase tracking-widest text-white/25">
			{label}
		</div>
	)
}

export const motionProps = {
	animate: true,
	motionConfig: 'gentle' as const,
}
