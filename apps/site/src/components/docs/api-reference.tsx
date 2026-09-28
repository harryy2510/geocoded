import { type ReactNode, useEffect, useState } from 'react'
import { v2Url } from '../../lib/v2'
import { highlightJson } from '../json-view'
import {
	type Endpoint,
	type Param,
	resolveDocsAnchor
} from './openapi-endpoints'

type Guide = {
	id: string
	nav: string
	title: string
	/** OpenAPI path whose Try it panel sits next to this guide. */
	tryPath: string
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
		tryPath: '/v2',
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
		tryPath: '/v2/countries/{id}',
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
		tryPath: '/v2/countries',
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
		tryPath: '/v2/countries/{id}',
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
		tryPath: '/v2/cities',
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
		tryPath: '/v2/countries/{id}',
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

const OPENAPI_URL = v2Url('/v2/openapi.json')
const POSTMAN_URL = v2Url('/v2/postman.json')

function requestUrl(
	endpoint: Endpoint,
	values: Record<string, string>
): string {
	let path = endpoint.path
	const params: Record<string, string> = {}
	for (const p of endpoint.params) {
		const value = (values[p.name] ?? '').trim()
		if (p.in === 'path') {
			// Timezone ids keep their slashes; everything else is one segment.
			const encoded = value.split('/').map(encodeURIComponent).join('/')
			path = path.replace(`{${p.name}}`, encoded || `{${p.name}}`)
		} else if (value) {
			params[p.name] = value
		}
	}
	return v2Url(path, params)
}

function initialValues(endpoint: Endpoint): Record<string, string> {
	const values: Record<string, string> = {}
	for (const p of endpoint.params) {
		// Path and required params start filled so Send works straight away.
		if ((p.in === 'path' || p.required) && p.example !== undefined) {
			values[p.name] = p.example
		}
	}
	return values
}

function MethodBadge() {
	return (
		<span className="shrink-0 rounded bg-chart-blue px-2 py-0.5 font-mono text-xs font-medium text-white">
			GET
		</span>
	)
}

function ParamList({ title, params }: { title: string; params: Param[] }) {
	if (!params.length) return null
	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="m-0 text-lg font-semibold">{title}</h2>
			{params.map((p) => (
				<div
					key={p.name}
					className="flex flex-col gap-1 border-t border-rule-soft py-3"
				>
					<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
						<span className="font-mono text-sm font-medium">{p.name}</span>
						<span className="text-[13px] text-ink-soft">{p.type}</span>
						{p.required && (
							<span className="text-xs font-semibold text-signal">
								required
							</span>
						)}
						{p.constraints.map((c) => (
							<span
								key={c}
								className="rounded bg-rule-soft px-1.5 py-0.5 text-xs text-ink-soft"
							>
								{c}
							</span>
						))}
					</div>
					{p.desc && (
						<span className="text-sm leading-relaxed text-ink-soft">
							{p.desc}
						</span>
					)}
					{p.example !== undefined && (
						<span className="text-[13px] text-ink-soft">
							Example: <Code>{p.example}</Code>
						</span>
					)}
				</div>
			))}
		</section>
	)
}

function Responses({ endpoint }: { endpoint: Endpoint }) {
	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="m-0 text-lg font-semibold">Responses</h2>
			{endpoint.responses.map((r) => (
				<div
					key={r.code}
					className="flex gap-3 border-t border-rule-soft py-2.5 text-sm"
				>
					<span
						className={`w-10 shrink-0 font-mono font-semibold ${r.code.startsWith('2') ? 'text-chart-teal' : 'text-signal'}`}
					>
						{r.code}
					</span>
					<span className="text-ink-soft">{r.desc}</span>
				</div>
			))}
		</section>
	)
}

function ResponseFields({ endpoint }: { endpoint: Endpoint }) {
	if (!endpoint.fields.length) return null
	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="m-0 text-lg font-semibold">Response fields</h2>
			{endpoint.paginated && (
				<P>
					Each item in <Code>data</Code> has these fields. <Code>meta</Code>{' '}
					holds <Code>total</Code>, <Code>limit</Code>, <Code>offset</Code>,{' '}
					<Code>hasMore</Code> and <Code>cursor</Code>.
				</P>
			)}
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="text-left text-xs tracking-[.04em] text-ink-soft uppercase">
							<th className="py-2 pr-4 font-semibold">Field</th>
							<th className="py-2 pr-4 font-semibold">Type</th>
						</tr>
					</thead>
					<tbody>
						{endpoint.fields.map((f) => (
							<tr key={f.name} className="border-t border-rule-soft align-top">
								<td className="py-2 pr-4 font-mono">{f.name}</td>
								<td className="py-2 pr-4 text-ink-soft">
									{f.type}
									{f.desc && <div className="text-[13px]">{f.desc}</div>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}

function EndpointIndex({ endpoints }: { endpoints: Endpoint[] }) {
	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="m-0 text-lg font-semibold">
				All {endpoints.length} endpoints
			</h2>
			<div className="flex flex-col">
				{endpoints.map((e) => (
					<a
						key={e.id}
						href={`#${e.id}`}
						className="flex flex-col gap-1 border-t border-rule-soft py-2.5 hover:text-signal sm:flex-row sm:items-baseline sm:gap-3"
					>
						<span className="flex min-w-0 items-center gap-2 font-mono text-[13px] break-all sm:w-[330px] sm:shrink-0">
							<MethodBadge />
							{e.path}
						</span>
						<span className="text-sm text-ink-soft">{e.title}</span>
					</a>
				))}
			</div>
		</section>
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
				type: type.split(';')[0] ?? '',
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
				<span className="text-[13px] text-code-muted">
					Empty fields are left out
				</span>
			</div>
			<form
				className="contents"
				onSubmit={(event) => {
					event.preventDefault()
					void send()
				}}
			>
				{endpoint.params.length > 0 && (
					<div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto border-b border-code-rule px-[18px] py-4 sm:grid-cols-2">
						{endpoint.params.map((p) => (
							<label
								key={p.name}
								className="flex flex-col gap-1.5 text-xs text-code-muted"
							>
								<span>
									{p.name}
									{p.required && <span className="text-[#F0A37A]"> *</span>}
								</span>
								<input
									value={values[p.name] ?? ''}
									placeholder={p.example}
									onChange={(event) =>
										setValues((prev) => ({
											...prev,
											[p.name]: event.target.value
										}))
									}
									className="h-10 rounded-md border border-[#3A3D44] bg-[#1E2126] px-3 font-mono text-sm text-paper placeholder:text-[#6B6F78]"
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

function SpecLinks() {
	return (
		<div className="flex flex-wrap gap-2.5">
			<a href={OPENAPI_URL} className="btn btn-primary h-11 px-4 text-sm">
				OpenAPI 3.1 spec
			</a>
			<a
				href={POSTMAN_URL}
				download="geocoded-v2-postman-collection.json"
				className="btn btn-outline h-11 px-4 text-sm"
			>
				Postman collection
			</a>
		</div>
	)
}

export function ApiReference({ endpoints }: { endpoints: Endpoint[] }) {
	const [active, setActive] = useState('introduction')

	useEffect(() => {
		const guideIds = new Set(GUIDES.map((g) => g.id))
		function sync() {
			const hash = window.location.hash.slice(1)
			const id = guideIds.has(hash) ? hash : resolveDocsAnchor(endpoints, hash)
			if (id) {
				setActive(id)
				window.scrollTo({ top: 0 })
			}
		}
		sync()
		window.addEventListener('hashchange', sync)
		return () => window.removeEventListener('hashchange', sync)
	}, [endpoints])

	const guide = GUIDES.find((g) => g.id === active)
	const fallback = endpoints[0]
	const endpoint =
		(guide
			? endpoints.find((e) => e.path === guide.tryPath)
			: endpoints.find((e) => e.id === active)) ?? fallback

	const groups = [
		{
			title: 'Get started',
			items: GUIDES.map((g) => ({ id: g.id, label: g.nav }))
		},
		...[...new Set(endpoints.map((e) => e.group))].map((group) => ({
			title: group,
			items: endpoints
				.filter((e) => e.group === group)
				.map((e) => ({ id: e.id, label: e.title }))
		}))
	]

	if (!endpoint) return null

	return (
		<div className="flex flex-col">
			<header className="border-b border-rule">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-6 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
					<div className="flex flex-col gap-1.5">
						<h1 className="serif m-0 text-[36px] leading-none lg:text-[44px]">
							API reference
						</h1>
						<p className="m-0 text-sm text-ink-soft">
							{endpoints.length} endpoints · base URL{' '}
							<Code>{v2Url('/v2')}</Code> · no key needed
						</p>
					</div>
					<SpecLinks />
				</div>
			</header>

			<div className="mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
				<nav
					aria-label="API sections"
					className="hidden w-[260px] shrink-0 flex-col gap-5 border-r border-rule px-6 py-7 text-sm lg:flex"
				>
					{groups.map((g) => (
						<div key={g.title} className="flex flex-col gap-0.5">
							<span className="mb-1.5 text-xs font-semibold tracking-[.06em] text-ink-soft uppercase">
								{g.title}
							</span>
							{g.items.map((item) => (
								<a
									key={item.id}
									href={`#${item.id}`}
									aria-current={item.id === active ? 'page' : undefined}
									className={`-mx-2.5 rounded-md px-2.5 py-[6px] ${item.id === active ? 'bg-ink font-medium text-paper' : 'hover:text-signal'}`}
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
							onChange={(event) => {
								window.location.hash = event.target.value
							}}
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
								<h2 className="serif m-0 text-[40px] leading-none lg:text-[52px]">
									{guide.title}
								</h2>
							</div>
							<div className="flex flex-col gap-4">{guide.body}</div>
							{guide.id === 'introduction' && (
								<EndpointIndex endpoints={endpoints} />
							)}
						</>
					) : (
						<>
							<div className="flex flex-col gap-3">
								<span className="text-[13px] text-ink-soft">
									{endpoint.group}
								</span>
								<h2 className="serif m-0 text-[40px] leading-none lg:text-[52px]">
									{endpoint.title}
								</h2>
								<div className="flex items-center gap-2.5 rounded-lg border border-rule bg-card px-3.5 py-2.5 font-mono text-sm break-all">
									<MethodBadge />
									{endpoint.path}
								</div>
								{endpoint.desc && <P>{endpoint.desc}</P>}
							</div>
							<ParamList
								title="Path parameters"
								params={endpoint.params.filter((p) => p.in === 'path')}
							/>
							<ParamList
								title="Query parameters"
								params={endpoint.params.filter((p) => p.in === 'query')}
							/>
							<Responses endpoint={endpoint} />
							<ResponseFields endpoint={endpoint} />
						</>
					)}
				</article>

				<aside
					aria-label="Try it"
					className="flex min-w-0 grow flex-col px-4 pb-10 md:px-8 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-72px)] lg:self-start lg:py-7 lg:pr-8 lg:pl-0"
				>
					<TryIt key={endpoint.id} endpoint={endpoint} />
				</aside>
			</div>
		</div>
	)
}
