import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { fetchV2List, type V2Meta } from './api'
import { type FilterControl, type ResourceConfig } from './config'
import { type CountryRef } from './records'

const PAGE_SIZE = 30

type FilterState = Record<string, string>

function buildFilters(controls: FilterControl[], state: FilterState): Record<string, string> {
	const out: Record<string, string> = {}
	for (const control of controls) {
		const value = state[control.key]
		if (value) out[control.key] = value
	}
	return out
}

export function ResourceBrowser<T>({
	config,
	countries,
	onSelect,
}: {
	config: ResourceConfig<T>
	countries: CountryRef[]
	onSelect: (record: T) => void
}) {
	const [records, setRecords] = useState<T[]>([])
	const [meta, setMeta] = useState<V2Meta | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [searchInput, setSearchInput] = useState('')
	const [search, setSearch] = useState('')
	const [sort, setSort] = useState(config.sorts[0]?.value ?? '')
	const [showSort, setShowSort] = useState(false)
	const [showFilters, setShowFilters] = useState(false)
	const [filters, setFilters] = useState<FilterState>({})

	const cursorRef = useRef<string | null>(null)

	// Debounce the search box -> q.
	useEffect(() => {
		const id = setTimeout(() => setSearch(searchInput.trim()), 300)
		return () => clearTimeout(id)
	}, [searchInput])

	const activeFilters = useMemo(() => buildFilters(config.filters, filters), [config.filters, filters])
	const filterCount = Object.keys(activeFilters).length

	// Reset + first page whenever query inputs change.
	useEffect(() => {
		let cancelled = false
		setLoading(true)
		setError(null)
		cursorRef.current = null
		fetchV2List<T>(config.path, {
			q: search || undefined,
			sort: sort || undefined,
			limit: PAGE_SIZE,
			offset: 0,
			filters: activeFilters,
		})
			.then((res) => {
				if (cancelled) return
				setRecords(res.data)
				setMeta(res.meta)
				cursorRef.current = res.meta.cursor
			})
			.catch((err: unknown) => {
				if (cancelled) return
				setRecords([])
				setMeta(null)
				setError(err instanceof Error ? err.message : 'Failed to load')
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [config.path, search, sort, activeFilters])

	const loadMore = () => {
		if (loadingMore || !meta?.hasMore) return
		setLoadingMore(true)
		const nextOffset = records.length
		fetchV2List<T>(config.path, {
			q: search || undefined,
			sort: sort || undefined,
			limit: PAGE_SIZE,
			cursor: cursorRef.current,
			offset: cursorRef.current ? undefined : nextOffset,
			filters: activeFilters,
		})
			.then((res) => {
				setRecords((prev) => [...prev, ...res.data])
				setMeta(res.meta)
				cursorRef.current = res.meta.cursor
			})
			.catch(() => {
				/* keep what we have */
			})
			.finally(() => setLoadingMore(false))
	}

	const setFilter = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }))
	}
	const clearFilters = () => setFilters({})

	const activeSort = config.sorts.find((s) => s.value === sort) ?? config.sorts[0]
	const total = meta?.total ?? 0

	return (
		<div className="flex flex-col gap-8">
			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
				<label className="block min-w-0">
					<span className="mb-3 block text-xs font-bold uppercase tracking-widest text-white/40">
						Search
					</span>
					<input
						type="text"
						placeholder={config.searchHint}
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="lux-input h-14 w-full min-w-0 px-0 text-xl font-bold tracking-tighter uppercase placeholder:text-white/30"
					/>
				</label>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:justify-end">
					{config.filters.length > 0 ? (
						<button
							onClick={() => setShowFilters((v) => !v)}
							className={`lux-panel h-14 px-5 text-left text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/5 ${
								showFilters ? 'border-white text-white' : 'text-white/70'
							}`}
						>
							Filters {filterCount ? `(${filterCount})` : '[+]'}
						</button>
					) : null}

					<div className="relative">
						<button
							onClick={() => setShowSort((v) => !v)}
							className="lux-panel flex h-14 min-w-56 items-center justify-between gap-5 px-5 text-left text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/5"
						>
							<span className="truncate">{activeSort?.label ?? 'Sort'}</span>
							<span className="text-white/40">{showSort ? '▲' : '▼'}</span>
						</button>
						{showSort ? (
							<div className="absolute right-0 top-full z-30 mt-2 w-64 border border-white/20 bg-black shadow-2xl">
								{config.sorts.map((option) => (
									<button
										key={option.value}
										onClick={() => {
											setSort(option.value)
											setShowSort(false)
										}}
										className={`block w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest hover:bg-white/10 ${
											sort === option.value ? 'bg-white/10 text-white' : 'text-white/50'
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						) : null}
					</div>
				</div>
			</div>

			{showFilters && config.filters.length > 0 ? (
				<FilterPanel
					controls={config.filters}
					state={filters}
					countries={countries}
					onChange={setFilter}
					onClear={clearFilters}
				/>
			) : null}

			<div className="font-mono text-sm uppercase tracking-widest text-white/35">
				{loading
					? 'Loading…'
					: error
						? `Error: ${error}`
						: `${total.toLocaleString('en-US')} ${config.label.toLowerCase()} · showing ${records.length.toLocaleString('en-US')}`}
			</div>

			{loading ? (
				<LoadingGrid />
			) : records.length === 0 ? (
				<div className="border border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm font-bold uppercase tracking-widest text-white/40">
					No records match
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
						{records.map((record) => (
							<button
								key={config.rowKey(record)}
								onClick={() => onSelect(record)}
								className="group flex min-h-[190px] flex-col bg-black p-6 text-left transition-colors hover:bg-white/[0.06]"
							>
								{config.card(record)}
							</button>
						))}
					</div>

					{meta?.hasMore ? (
						<div className="flex justify-center">
							<button
								onClick={loadMore}
								disabled={loadingMore}
								className="lux-panel px-10 py-4 text-sm font-bold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
							>
								{loadingMore ? 'Loading…' : 'Load more'}
							</button>
						</div>
					) : null}
				</>
			)}
		</div>
	)
}

function LoadingGrid() {
	return (
		<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
			{Array.from({ length: 12 }).map((_, i) => (
				<div key={i} className="min-h-[190px] animate-pulse bg-white/[0.03]" />
			))}
		</div>
	)
}

function FilterPanel({
	controls,
	state,
	countries,
	onChange,
	onClear,
}: {
	controls: FilterControl[]
	state: Record<string, string>
	countries: CountryRef[]
	onChange: (key: string, value: string) => void
	onClear: () => void
}): ReactNode {
	return (
		<div className="animate-fade-in border border-white/10 bg-white/[0.02] p-6">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
				{controls.map((control) => (
					<div key={control.key}>
						<div className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">
							{control.label}
						</div>
						{control.kind === 'country' ? (
							<select
								value={state[control.key] ?? ''}
								onChange={(e) => onChange(control.key, e.target.value)}
								className="h-11 w-full border border-white/20 bg-black px-3 text-sm text-white/80 focus:border-white focus:outline-none"
							>
								<option value="">Any country</option>
								{countries.map((country) => (
									<option key={country.iso2} value={country.iso2}>
										{country.name}
									</option>
								))}
							</select>
						) : control.kind === 'select' ? (
							<select
								value={state[control.key] ?? ''}
								onChange={(e) => onChange(control.key, e.target.value)}
								className="h-11 w-full border border-white/20 bg-black px-3 text-sm text-white/80 focus:border-white focus:outline-none"
							>
								<option value="">Any</option>
								{control.options?.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						) : (
							<input
								type={control.kind === 'number' ? 'number' : 'text'}
								value={state[control.key] ?? ''}
								placeholder={control.placeholder}
								onChange={(e) => onChange(control.key, e.target.value)}
								className="h-11 w-full border border-white/20 bg-black px-3 text-sm text-white/80 placeholder:text-white/25 focus:border-white focus:outline-none"
							/>
						)}
					</div>
				))}
			</div>
			<div className="mt-5">
				<button
					onClick={onClear}
					className="border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:border-white hover:text-white"
				>
					Clear filters
				</button>
			</div>
		</div>
	)
}
