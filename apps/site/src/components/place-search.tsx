import {
	type KeyboardEvent as ReactKeyboardEvent,
	useEffect,
	useId,
	useRef,
	useState
} from 'react'
import { countryHref } from '../lib/format'
import { fetchV2List, type SearchResult } from '../lib/v2'

type PlaceSearchProps = {
	/** `nav`: compact field with a dropdown. `hero`: large field with results listed below. */
	variant: 'nav' | 'hero'
	placeholder?: string
	initialQuery?: string
}

const TYPE_LABEL: Record<SearchResult['type'], string> = {
	country: 'Country',
	state: 'State',
	city: 'City'
}

function context(result: SearchResult): string {
	if (result.type === 'country') return result.countryCode
	return result.type === 'city' && result.stateName
		? `${result.stateName}, ${result.countryName}`
		: result.countryName
}

function SearchIcon({ size }: { size: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			stroke="#4B4F58"
			strokeWidth="1.5"
			aria-hidden="true"
			className="shrink-0"
		>
			<circle cx="7" cy="7" r="5" />
			<path d="M11 11l3.5 3.5" />
		</svg>
	)
}

export function PlaceSearch({
	variant,
	placeholder = 'Search places',
	initialQuery = ''
}: PlaceSearchProps) {
	const [query, setQuery] = useState(initialQuery)
	const [results, setResults] = useState<SearchResult[]>([])
	const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(
		initialQuery.trim().length >= 2 ? 'loading' : 'idle'
	)
	const [open, setOpen] = useState(false)
	const [active, setActive] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const listId = useId()
	const hero = variant === 'hero'

	useEffect(() => {
		const q = query.trim()
		if (q.length < 2) {
			setResults([])
			setStatus('idle')
			return
		}
		let current = true
		setStatus('loading')
		const timer = setTimeout(() => {
			fetchV2List<SearchResult>('/v2/search', {
				q,
				type: 'country,state,city',
				limit: hero ? 5 : 8
			}).then(
				(page) => {
					if (!current) return
					setResults(page.data)
					setActive(-1)
					setStatus('idle')
				},
				() => {
					if (current) setStatus('error')
				}
			)
		}, 200)
		return () => {
			current = false
			clearTimeout(timer)
		}
	}, [query, hero])

	useEffect(() => {
		if (hero) return
		function onKey(event: KeyboardEvent) {
			const target = event.target
			const typing =
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
			if (event.key === '/' && !typing) {
				event.preventDefault()
				inputRef.current?.focus()
			}
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [hero])

	const showList = (hero || open) && query.trim().length >= 2
	const optionId = (i: number) => `${listId}-${i}`

	function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setOpen(true)
			setActive((i) => Math.min(i + 1, results.length - 1))
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			setActive((i) => Math.max(i - 1, 0))
		} else if (event.key === 'Enter') {
			const pick = results[active] ?? results[0]
			if (pick) window.location.href = countryHref(pick.countryCode)
		} else if (event.key === 'Escape') {
			setOpen(false)
		}
	}

	const list = showList && (
		<ul
			id={listId}
			role="listbox"
			aria-label="Matching places"
			className={
				hero
					? 'flex flex-col gap-2.5'
					: 'absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-auto rounded-lg border border-rule bg-card p-1.5 shadow-lg'
			}
		>
			{status === 'error' && (
				<li
					className={
						hero ? 'text-code-muted' : 'px-3 py-2 text-sm text-ink-soft'
					}
				>
					Search is unavailable right now. Try again in a moment.
				</li>
			)}
			{status !== 'error' && results.length === 0 && status === 'idle' && (
				<li
					className={
						hero ? 'text-code-muted' : 'px-3 py-2 text-sm text-ink-soft'
					}
				>
					No places match “{query.trim()}”.
				</li>
			)}
			{results.map((result, i) => (
				<li
					key={`${result.type}-${result.id}`}
					id={optionId(i)}
					role="option"
					aria-selected={i === active}
				>
					<a
						href={countryHref(result.countryCode)}
						className={
							hero
								? `flex items-center gap-3.5 rounded-[10px] border px-4 py-3.5 hover:border-code-muted ${i === active ? 'border-code-muted' : 'border-[#33363D]'}`
								: `flex items-center gap-3 rounded-md px-3 py-2 hover:bg-rule-soft ${i === active ? 'bg-rule-soft' : ''}`
						}
						onMouseDown={(event) => event.preventDefault()}
					>
						<span
							className={
								hero
									? 'w-14 shrink-0 text-xs font-semibold tracking-[.06em] text-[#F0A37A] uppercase'
									: 'w-14 shrink-0 text-[11px] font-semibold tracking-[.06em] text-ink-soft uppercase'
							}
						>
							{TYPE_LABEL[result.type]}
						</span>
						<span
							className={
								hero ? 'grow text-base font-medium' : 'grow text-sm font-medium'
							}
						>
							{result.name}
						</span>
						<span
							className={
								hero
									? 'hidden text-sm text-code-muted sm:inline'
									: 'text-xs text-ink-soft'
							}
						>
							{context(result)}
						</span>
					</a>
				</li>
			))}
		</ul>
	)

	return (
		<div className={hero ? 'flex flex-col gap-2.5' : 'relative w-full'}>
			<label
				className={
					hero
						? 'flex h-14 items-center gap-3 rounded-[10px] bg-paper px-[18px] text-[17px] text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal'
						: 'flex h-11 items-center gap-2.5 rounded-lg border border-rule bg-card px-3.5 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal'
				}
			>
				<SearchIcon size={hero ? 18 : 16} />
				<span className="sr-only">Search places</span>
				<input
					ref={inputRef}
					type="search"
					value={query}
					placeholder={placeholder}
					role="combobox"
					aria-expanded={Boolean(showList)}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={active >= 0 ? optionId(active) : undefined}
					autoComplete="off"
					className="min-w-0 grow border-0 bg-transparent text-ink outline-none placeholder:text-ink-soft focus-visible:outline-none"
					onChange={(event) => {
						setQuery(event.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setOpen(false)}
					onKeyDown={onKeyDown}
				/>
				{!hero && (
					<kbd className="hidden rounded border border-rule px-1.5 py-0.5 font-mono text-xs text-ink-soft xl:inline">
						/
					</kbd>
				)}
			</label>
			{list}
		</div>
	)
}
