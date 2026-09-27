import { type ReactNode, useEffect, useState } from 'react'
import { v2Url } from '../../lib/v2'
import { highlightJson } from '../json-view'
import { type Endpoint, ENDPOINTS, type Param } from './endpoints'

type Guide = {
	id: string
	nav: string
	title: string
	tryId: string
	body: ReactNode
}

function Code({ children }: { children: ReactNode }) {
	return (
		<code className="rounded bg-rule-soft px-1.5 py-0.5 font-mono text-[0.9em]">
			{children}
		</code>
	)
}

function P({ children }: { children: ReactNode }) {
	return (
		<p className="m-0 text-base leading-relaxed text-ink-soft">{children}</p>
	)
}

const GUIDES: Guide[] = [
	{
		id: 'introduction',
		nav: 'Introduction',
		title: 'Location data for every country, state and city',
		tryId: 'your-location',
		body: (
			<>
				<P>
					Geocoded is a free JSON API for countries, states, cities, airports,
					ports, border crossings, timezones, currencies, languages and
					population statistics. There is no sign-up and no API key: send a
					request and read the JSON.
				</P>
				<P>
					Every endpoint lives under <Code>/v2</Code>. Lists come back in the
					same <Code>{'{ data, meta }'}</Code> shape, and single records come
					back as one object. Try the panel on the right: it sends a real
					request.
				</P>
			</>
		)
	},
	{
		id: 'quick-start',
		nav: 'Quick start',
		title: 'Make your first request',
		tryId: 'country',
		body: (
			<>
				<P>Ask for a country by its ISO code or its name:</P>
				<pre className="m-0 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-[13px] text-code">
					{`curl "${v2Url('/v2/countries/JP')}"`}
				</pre>
				<P>
					From JavaScript, use <Code>fetch</Code>. From TypeScript, the{' '}
					<Code>@geocoded/client</Code> package gives you typed helpers for the
					same endpoints.
				</P>
				<pre className="m-0 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-[13px] text-code">
					{`const res = await fetch('${v2Url('/v2/countries/JP')}')\nconst japan = await res.json()`}
				</pre>
			</>
		)
	},
	{
		id: 'filtering',
		nav: 'Filtering and sorting',
		title: 'Filter and sort lists',
		tryId: 'countries',
		body: (
			<>
				<P>
					Narrow a list with <Code>filter[name]=value</Code>. Filters are exact
					and can be combined, for example{' '}
					<Code>filter[continent]=EU&amp;filter[currency]=EUR</Code>. Use{' '}
					<Code>q</Code> for a text match on names.
				</P>
				<P>
					Sort with <Code>sort=field</Code>. Put a minus in front for descending
					order: <Code>sort=-population</Code>. Each endpoint lists the filters
					it accepts, and unknown parameters return an{' '}
					<Code>invalid_request</Code> error rather than being ignored.
				</P>
			</>
		)
	},
	{
		id: 'fields',
		nav: 'Choosing fields',
		title: 'Return only the fields you use',
		tryId: 'country',
		body: (
			<>
				<P>
					Pass <Code>fields</Code> as a comma-separated list to trim every
					record to what you need, for example{' '}
					<Code>fields=name,capital,population</Code>.
				</P>
				<P>
					Use dots for nested data. With <Code>expand=statistics</Code>, ask for{' '}
					<Code>fields=name,statistics.lifeExpectancy</Code> to get one figure
					per country.
				</P>
			</>
		)
	},
	{
		id: 'pagination',
		nav: 'Pagination',
		title: 'Page through results',
		tryId: 'cities',
		body: (
			<>
				<P>
					Every list is paginated. Without parameters you get the first 25
					results. Set <Code>limit</Code> up to 2,000 per page.
				</P>
				<P>
					<Code>meta</Code> tells you the <Code>total</Code>, whether there is
					more (<Code>hasMore</Code>) and a <Code>cursor</Code> for the next
					page. Pass <Code>cursor</Code> back to continue, or use{' '}
					<Code>offset</Code> to jump to a position. Use one, not both.
				</P>
			</>
		)
	},
	{
		id: 'errors',
		nav: 'Errors',
		title: 'Errors',
		tryId: 'country',
		body: (
			<>
				<P>
					Every error uses the same shape, with a stable code you can check:
				</P>
				<pre className="m-0 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-[13px] text-code">
					{highlightJson(
						'{\n  "error": {\n    "code": "not_found",\n    "message": "Country not found",\n    "hint": "Use an ISO code such as JP or a full name."\n  }\n}'
					)}
				</pre>
				<ul className="m-0 flex flex-col gap-2 pl-5 text-base leading-relaxed text-ink-soft">
					<li>
						<Code>invalid_request</Code> (400): a parameter is missing, unknown
						or malformed.
					</li>
					<li>
						<Code>not_found</Code> (404): no record matches.
					</li>
					<li>
						<Code>ambiguous</Code> (409): more than one record matches a name.
						The response lists them in <Code>matches</Code>; use a code or a
						scoped path.
					</li>
					<li>
						<Code>rate_limited</Code> (429): slow down and retry.
					</li>
					<li>
						<Code>internal_error</Code> (500): something went wrong on our side.
					</li>
				</ul>
			</>
		)
	}
]

const ALL_IDS = new Set([
	...GUIDES.map((g) => g.id),
	...ENDPOINTS.map((e) => e.id)
])

function endpointById(id: string): Endpoint {
	return ENDPOINTS.find((e) => e.id === id) ?? ENDPOINTS[0]
}

function initialValues(endpoint: Endpoint): Record<string, string> {
	const values: Record<string, string> = {}
	for (const p of [...endpoint.pathParams, ...endpoint.query]) {
		if (p.example !== undefined) values[p.name] = p.example
	}
	return values
}

function requestUrl(
	endpoint: Endpoint,
	values: Record<string, string>
): string {
	let path = endpoint.path
	for (const p of endpoint.pathParams) {
		const value = (values[p.name] ?? '').trim()
		// Timezone ids keep their slashes; everything else is one segment.
		const encoded = value.split('/').map(encodeURIComponent).join('/')
		path = path.replace(`{${p.name}}`, encoded || `{${p.name}}`)
	}
	const params: Record<string, string> = {}
	for (const p of endpoint.query) {
		const value = values[p.name]?.trim()
		if (p.example !== undefined && value) params[p.name] = value
	}
	return v2Url(path, params)
}

function ParamList({ title, params }: { title: string; params: Param[] }) {
	if (!params.length) return null
	return (
		<div className="flex flex-col gap-2.5">
			<h3 className="m-0 text-lg font-semibold">{title}</h3>
			{params.map((p) => (
				<div
					key={p.name}
					className="flex flex-col gap-1 border-t border-rule-soft py-3"
				>
					<div className="flex flex-wrap items-baseline gap-2.5">
						<span className="font-mono text-sm font-medium">{p.name}</span>
						<span className="text-[13px] text-ink-soft">{p.type}</span>
						{p.required && (
							<span className="text-xs font-semibold text-signal">
								required
							</span>
						)}
					</div>
					<span className="text-sm text-ink-soft">{p.desc}</span>
				</div>
			))}
		</div>
	)
}

type Result =
	| { status: 'idle' }
	| { status: 'loading' }
	| {
			status: 'done'
			code: number
			statusText: string
			type: string
			body: string
	  }
	| { status: 'failed'; message: string }

function TryIt({ endpoint }: { endpoint: Endpoint }) {
	const [values, setValues] = useState(() => initialValues(endpoint))
	const [result, setResult] = useState<Result>({ status: 'idle' })
	const inputs = [...endpoint.pathParams, ...endpoint.query].filter(
		(p) => p.example !== undefined
	)
	const url = requestUrl(endpoint, values)

	async function send() {
		setResult({ status: 'loading' })
		try {
			const response = await fetch(url)
			const type = response.headers.get('content-type') ?? ''
			const raw = await response.text()
			let body = raw
			try {
				body = JSON.stringify(JSON.parse(raw), null, 2)
			} catch {
				// Not JSON: show it as text.
			}
			setResult({
				status: 'done',
				code: response.status,
				statusText: response.statusText,
				type: type.split(';')[0],
				body: body.length > 40_000 ? `${body.slice(0, 40_000)}\n…` : body
			})
		} catch (error) {
			setResult({
				status: 'failed',
				message: error instanceof Error ? error.message : String(error)
			})
		}
	}

	return (
		<div className="flex min-h-[420px] grow flex-col overflow-hidden rounded-[14px] bg-ink text-code">
			<div className="flex items-center justify-between border-b border-code-rule px-[18px] py-3.5">
				<h2 className="m-0 text-[15px] font-semibold">Try it</h2>
				<div className="flex gap-2 text-[13px] text-code-muted">
					<a
						className="hover:text-white"
						href={v2Url('/v2/openapi.json')}
						id="openapi"
					>
						OpenAPI
					</a>
					<span aria-hidden="true" className="text-[#8A8F99]">
						·
					</span>
					<a className="hover:text-white" href={v2Url('/v2/postman.json')}>
						Postman
					</a>
				</div>
			</div>
			<form
				className="contents"
				onSubmit={(event) => {
					event.preventDefault()
					void send()
				}}
			>
				{inputs.length > 0 && (
					<div className="grid grid-cols-1 gap-3 border-b border-code-rule px-[18px] py-4 sm:grid-cols-2">
						{inputs.map((p) => (
							<label
								key={p.name}
								className="flex flex-col gap-1.5 text-xs text-code-muted"
							>
								{p.name}
								<input
									value={values[p.name] ?? ''}
									onChange={(event) =>
										setValues((prev) => ({
											...prev,
											[p.name]: event.target.value
										}))
									}
									className="h-10 rounded-md border border-[#3A3D44] bg-[#1E2126] px-3 font-mono text-sm text-paper"
									spellCheck={false}
									autoCapitalize="off"
								/>
							</label>
						))}
					</div>
				)}
				<div className="flex flex-col gap-3 border-b border-code-rule px-[18px] py-3.5 sm:flex-row sm:items-center">
					<code className="min-w-0 grow font-mono text-[13px] break-all text-code-muted">
						curl "{url}"
					</code>
					<button
						type="submit"
						className="btn btn-primary h-10 shrink-0 px-[18px] text-sm"
						disabled={result.status === 'loading'}
					>
						{result.status === 'loading' ? 'Sending…' : 'Send'}
					</button>
				</div>
			</form>
			<div aria-live="polite" className="flex min-h-0 grow flex-col">
				{result.status === 'idle' && (
					<p className="m-0 px-[18px] py-4 text-sm text-code-muted">
						Press Send to make a live request.
					</p>
				)}
				{result.status === 'failed' && (
					<p className="m-0 px-[18px] py-4 text-sm text-[#F0A37A]">
						The request could not be sent: {result.message}
					</p>
				)}
				{result.status === 'done' && (
					<>
						<div className="flex gap-4 px-[18px] pt-2.5 text-[13px]">
							<span
								className={`font-semibold ${result.code < 400 ? 'tok-ok' : 'text-[#F0A37A]'}`}
							>
								{result.code}{' '}
								{result.statusText || (result.code < 400 ? 'OK' : '')}
							</span>
							<span className="text-[#8A8F99]">{result.type}</span>
						</div>
						<pre className="m-0 max-h-[640px] overflow-auto px-[18px] pt-3 pb-[18px] font-mono text-[13px] leading-[1.65]">
							{highlightJson(result.body)}
						</pre>
					</>
				)}
			</div>
		</div>
	)
}

export function ApiReference() {
	const [active, setActive] = useState('introduction')

	useEffect(() => {
		function sync() {
			const id = window.location.hash.slice(1)
			if (ALL_IDS.has(id)) setActive(id)
		}
		sync()
		window.addEventListener('hashchange', sync)
		return () => window.removeEventListener('hashchange', sync)
	}, [])

	const guide = GUIDES.find((g) => g.id === active)
	const endpoint = guide ? endpointById(guide.tryId) : endpointById(active)

	const groups = [
		{
			title: 'Get started',
			items: GUIDES.map((g) => ({ id: g.id, label: g.nav }))
		},
		{
			title: 'Endpoints',
			items: ENDPOINTS.map((e) => ({ id: e.id, label: e.nav }))
		}
	]

	function go(id: string) {
		window.location.hash = id
	}

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
			<nav
				aria-label="API sections"
				className="hidden w-[260px] shrink-0 flex-col gap-6 border-r border-rule px-6 py-7 text-sm lg:flex"
			>
				{groups.map((g) => (
					<div key={g.title} className="flex flex-col gap-0.5">
						<span className="mb-2 text-xs font-semibold tracking-[.06em] text-ink-soft uppercase">
							{g.title}
						</span>
						{g.items.map((item) => (
							<a
								key={item.id}
								href={`#${item.id}`}
								aria-current={item.id === active ? 'page' : undefined}
								className={`-mx-2.5 rounded-md px-2.5 py-[7px] ${item.id === active ? 'bg-ink font-medium text-paper' : 'hover:text-signal'}`}
							>
								{item.label}
							</a>
						))}
					</div>
				))}
			</nav>

			<div className="border-b border-rule px-4 py-4 md:px-8 lg:hidden">
				<label className="flex flex-col gap-2 text-[13px] font-semibold">
					Section
					<select
						className="field"
						value={active}
						onChange={(event) => go(event.target.value)}
					>
						{groups.map((g) => (
							<optgroup key={g.title} label={g.title}>
								{g.items.map((item) => (
									<option key={item.id} value={item.id}>
										{item.label}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</label>
			</div>

			<article className="flex min-w-0 shrink-0 flex-col gap-[26px] px-4 py-8 md:px-8 lg:w-[620px] lg:px-11 lg:py-9">
				{guide ? (
					<>
						<div className="flex flex-col gap-3">
							<span className="text-[13px] text-ink-soft">Get started</span>
							<h1 className="serif m-0 text-[40px] leading-none lg:text-[52px]">
								{guide.title}
							</h1>
						</div>
						<div className="flex flex-col gap-4">{guide.body}</div>
					</>
				) : (
					<>
						<div className="flex flex-col gap-3">
							<span className="text-[13px] text-ink-soft">
								{endpoint.group}
							</span>
							<h1 className="serif m-0 text-[40px] leading-none lg:text-[52px]">
								{endpoint.title}
							</h1>
							<div className="flex items-center gap-2.5 rounded-lg border border-rule bg-card px-3.5 py-2.5 font-mono text-sm break-all">
								<span className="shrink-0 rounded bg-chart-blue px-2 py-0.5 text-xs font-medium text-white">
									GET
								</span>
								{endpoint.path}
							</div>
							<p className="m-0 text-base leading-relaxed text-ink-soft">
								{endpoint.desc}
							</p>
						</div>
						<ParamList title="Path parameters" params={endpoint.pathParams} />
						<ParamList title="Query parameters" params={endpoint.query} />
					</>
				)}
			</article>

			<aside
				aria-label="Try it"
				className="flex min-w-0 grow flex-col px-4 pb-10 md:px-8 lg:py-7 lg:pr-8 lg:pl-0"
			>
				<TryIt key={endpoint.id} endpoint={endpoint} />
			</aside>
		</div>
	)
}
