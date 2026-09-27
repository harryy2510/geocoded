import { useEffect, useState } from 'react'

export type LoadState<T> =
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ready'; data: T }

/** Run an async loader on mount and whenever `deps` change. */
export function useLoad<T>(
	load: () => Promise<T>,
	deps: readonly unknown[]
): LoadState<T> {
	const [state, setState] = useState<LoadState<T>>({ status: 'loading' })

	useEffect(() => {
		let active = true
		setState({ status: 'loading' })
		load().then(
			(data) => {
				if (active) setState({ status: 'ready', data })
			},
			(error: unknown) => {
				if (active) {
					setState({
						status: 'error',
						message: error instanceof Error ? error.message : String(error)
					})
				}
			}
		)
		return () => {
			active = false
		}
	}, deps)

	return state
}
