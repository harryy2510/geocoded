import { useEffect, useState } from 'react'
import { axisTickStyle } from '../../lib/format'

export function useCompactChart() {
	const [isCompact, setIsCompact] = useState(false)

	useEffect(() => {
		const media = window.matchMedia('(max-width: 640px)')
		const update = () => setIsCompact(media.matches)

		update()
		media.addEventListener('change', update)
		return () => media.removeEventListener('change', update)
	}, [])

	return {
		isCompact,
		tick: isCompact ? { ...axisTickStyle, fontSize: 10 } : axisTickStyle,
		narrowAxisWidth: isCompact ? 66 : 90,
		axisWidth: isCompact ? 74 : 110,
		wideAxisWidth: isCompact ? 82 : 130,
		chartMargin: isCompact
			? { left: 0, right: 8, top: 8, bottom: 0 }
			: { left: 10, right: 20, top: 10, bottom: 0 },
	}
}
