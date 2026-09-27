import { useState } from 'react'
import { highlightJson } from './json-view'

type CodeSampleProps = {
	apiUrl: string
}

const PATH =
	'/v2/countries/JP/states/Tokyo/cities?sort=-population&fields=name,population&limit=3'

const TABS = ['curl', 'JavaScript', 'Python'] as const
type Tab = (typeof TABS)[number]

const RESPONSE = `{
  "data": [
    { "name": "Tokyo",    "population": 9733276 },
    { "name": "Setagaya", "population": 940071 },
    { "name": "Ōta",      "population": 748081 }
  ],
  "meta": { "total": 221, "limit": 3, "hasMore": true }
}`

export function CodeSample({ apiUrl }: CodeSampleProps) {
	const url = `${apiUrl}${PATH}`
	const [base, query] = url.split('?')
	const samples: Record<Tab, string> = {
		curl: `curl "${base}\n  ?${query}"`,
		JavaScript: `const res = await fetch(\n  '${url}'\n)\nconst { data } = await res.json()`,
		Python: `import requests\n\ndata = requests.get(\n    "${url}"\n).json()["data"]`
	}
	const [tab, setTab] = useState<Tab>('curl')

	return (
		<div className="min-w-0 grow overflow-hidden rounded-[14px] border border-ink bg-card">
			<div
				role="tablist"
				aria-label="Code language"
				className="flex gap-1 border-b border-rule px-3 py-2.5"
			>
				{TABS.map((name) => (
					<button
						key={name}
						type="button"
						role="tab"
						aria-selected={tab === name}
						className={`h-9 rounded-md px-3.5 font-mono text-[13px] font-medium ${tab === name ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
						onClick={() => setTab(name)}
					>
						{name}
					</button>
				))}
			</div>
			<pre
				role="tabpanel"
				className="overflow-x-auto border-b border-rule px-6 py-5 font-mono text-[13px] leading-[1.8] md:text-[15px]"
			>
				{samples[tab]}
			</pre>
			<pre className="overflow-x-auto bg-ink px-6 py-[22px] font-mono text-[13px] leading-[1.7] text-code md:text-sm">
				{highlightJson(RESPONSE)}
			</pre>
		</div>
	)
}
