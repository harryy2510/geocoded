import { type ReactNode } from 'react'

const TOKEN =
	/("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)\b/g

/** Pretty JSON with key, string and number colours for dark code panels. */
export function highlightJson(text: string): ReactNode[] {
	const nodes: ReactNode[] = []
	let last = 0
	for (const match of text.matchAll(TOKEN)) {
		const index = match.index
		if (index > last) nodes.push(text.slice(last, index))
		const [whole, str, colon, literal] = match
		if (str !== undefined) {
			nodes.push(
				<span key={index} className={colon ? 'tok-k' : 'tok-s'}>
					{str}
				</span>
			)
			if (colon) nodes.push(colon)
		} else if (literal !== undefined) {
			nodes.push(
				<span key={index} className="tok-n">
					{literal}
				</span>
			)
		}
		last = index + whole.length
	}
	if (last < text.length) nodes.push(text.slice(last))
	return nodes
}
