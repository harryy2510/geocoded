/** Default picker page size for API and in-memory sources. */
export const DEFAULT_PAGE_LIMIT = 100

export type PageRequest = {
	limit?: number
	offset?: number
	cursor?: string | null
	query?: string
	signal?: AbortSignal
}

export type PageMeta = {
	total: number
	limit: number
	offset: number
	hasMore: boolean
	cursor: string | null
}

export type PageResult<T> = {
	data: T[]
	meta: PageMeta
}

export type PickerOption<TValue extends string = string, TMeta = unknown> = {
	value: TValue
	label: string
	disabled?: boolean
	keywords?: string[]
	meta?: TMeta
}

export type OptionFormatters<TOption, TValue extends string = string> = {
	getOptionLabel?: (option: TOption) => string
	getOptionValue?: (option: TOption) => TValue
	getOptionKeywords?: (option: TOption) => string[]
}

export type DataSource<TOption> = (
	request: PageRequest
) => Promise<PageResult<TOption>>

export type ControlledState<T> = {
	value?: T
	defaultValue: T
	onChange?: (value: T) => void
}

/** Fill in default limit, offset, cursor, and query on a page request. */
export function resolvePageRequest(request: PageRequest = {}): Required<
	Pick<PageRequest, 'limit' | 'offset' | 'cursor' | 'query'>
> & {
	signal?: AbortSignal
} {
	return {
		limit: clampPositiveInteger(request.limit, DEFAULT_PAGE_LIMIT),
		offset: Math.max(0, request.offset ?? 0),
		cursor: request.cursor ?? null,
		query: request.query?.trim() ?? '',
		signal: request.signal
	}
}

/** Next page request from list metadata, or `null` when the list is finished. */
export function nextPageRequest(meta: PageMeta): PageRequest | null {
	if (!meta.hasMore) return null
	if (meta.cursor) {
		return {
			limit: meta.limit,
			cursor: meta.cursor
		}
	}
	return {
		limit: meta.limit,
		offset: meta.offset + meta.limit
	}
}

/** Empty page with the requested limit/offset. */
export function emptyPage<T>(request: PageRequest = {}): PageResult<T> {
	const page = resolvePageRequest(request)
	return {
		data: [],
		meta: {
			total: 0,
			limit: page.limit,
			offset: page.offset,
			hasMore: false,
			cursor: null
		}
	}
}

/** Slice an in-memory array into a paginated picker page. */
export function pageFromArray<T>(
	rows: T[],
	request: PageRequest = {}
): PageResult<T> {
	const page = resolvePageRequest(request)
	const data = rows.slice(page.offset, page.offset + page.limit)
	const nextOffset = page.offset + page.limit
	return {
		data,
		meta: {
			total: rows.length,
			limit: page.limit,
			offset: page.offset,
			hasMore: nextOffset < rows.length,
			cursor: nextOffset < rows.length ? encodeCursor(nextOffset) : null
		}
	}
}

export function encodeCursor(offset: number): string {
	return btoa(String(offset))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
}

export function normalizeSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{Mn}/gu, '')
		.toLocaleLowerCase()
		.trim()
}

export function matchesSearchText(text: string, query: string): boolean {
	const normalizedQuery = normalizeSearchText(query)
	if (!normalizedQuery) return true
	return normalizeSearchText(text).includes(normalizedQuery)
}

/** Accent-insensitive option filter using label and keywords. */
export function filterOptions<TOption>(
	options: TOption[],
	query: string,
	formatters: OptionFormatters<TOption> = {}
): TOption[] {
	const normalizedQuery = normalizeSearchText(query)
	if (!normalizedQuery) return options
	return options.filter((option) => {
		const label = resolveOptionLabel(option, formatters.getOptionLabel)
		const keywords = formatters.getOptionKeywords?.(option) ?? []
		return [label, ...keywords].some((value) =>
			normalizeSearchText(value).includes(normalizedQuery)
		)
	})
}

export function toPickerOption<TOption, TValue extends string = string>(
	option: TOption,
	formatters: OptionFormatters<TOption, TValue> = {}
): PickerOption<TValue, TOption> {
	return {
		value: resolveOptionValue(option, formatters.getOptionValue),
		label: resolveOptionLabel(option, formatters.getOptionLabel),
		keywords: formatters.getOptionKeywords?.(option),
		meta: option
	}
}

export class LruCache<T> {
	private readonly values = new Map<string, T>()

	constructor(private readonly maxSize: number) {}

	get(key: string): T | undefined {
		const value = this.values.get(key)
		if (value === undefined) return undefined
		this.values.delete(key)
		this.values.set(key, value)
		return value
	}

	set(key: string, value: T): void {
		if (this.values.has(key)) this.values.delete(key)
		while (this.values.size >= this.maxSize) {
			const firstKey = this.values.keys().next().value as string | undefined
			if (firstKey === undefined) break
			this.values.delete(firstKey)
		}
		this.values.set(key, value)
	}

	has(key: string): boolean {
		return this.values.has(key)
	}

	clear(): void {
		this.values.clear()
	}
}

export class QueryCache {
	private readonly pending = new Map<string, Promise<unknown>>()

	constructor(private readonly cache = new LruCache<unknown>(50)) {}

	fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
		const cached = this.cache.get(key) as T | undefined
		if (cached !== undefined) return Promise.resolve(cached)

		const pending = this.pending.get(key) as Promise<T> | undefined
		if (pending) return pending

		const request = fetcher()
			.then((value) => {
				this.cache.set(key, value)
				this.pending.delete(key)
				return value
			})
			.catch((error: unknown) => {
				this.pending.delete(key)
				throw error
			})
		this.pending.set(key, request)
		return request
	}

	clear(): void {
		this.pending.clear()
		this.cache.clear()
	}
}

export function createDebouncedFunction<TArgs extends unknown[]>(
	callback: (...args: TArgs) => void,
	delayMs: number
): { call: (...args: TArgs) => void; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | null = null
	return {
		call: (...args) => {
			if (timer) clearTimeout(timer)
			timer = setTimeout(() => callback(...args), delayMs)
		},
		cancel: () => {
			if (timer) clearTimeout(timer)
			timer = null
		}
	}
}

export function createAbortableRunner() {
	let controller: AbortController | null = null
	return {
		run: async <T>(runner: (signal: AbortSignal) => Promise<T>): Promise<T> => {
			controller?.abort()
			controller = new AbortController()
			return await runner(controller.signal)
		},
		abort: () => controller?.abort()
	}
}

export function resolveControlledValue<T>({
	value,
	defaultValue
}: ControlledState<T>): T {
	return value === undefined ? defaultValue : value
}

export function resolveOptionLabel<TOption>(
	option: TOption,
	getOptionLabel?: (option: TOption) => string
): string {
	if (getOptionLabel) return getOptionLabel(option)
	if (typeof option === 'string') return option
	if (option && typeof option === 'object' && 'label' in option) {
		return String(option.label)
	}
	if (option && typeof option === 'object' && 'name' in option) {
		return String(option.name)
	}
	return String(option)
}

export function resolveOptionValue<TOption, TValue extends string = string>(
	option: TOption,
	getOptionValue?: (option: TOption) => TValue
): TValue {
	if (getOptionValue) return getOptionValue(option)
	if (typeof option === 'string') return option as unknown as TValue
	if (option && typeof option === 'object' && 'value' in option) {
		return String(option.value) as TValue
	}
	if (option && typeof option === 'object' && 'code' in option) {
		return String(option.code) as TValue
	}
	if (option && typeof option === 'object' && 'iso2' in option) {
		return String(option.iso2) as TValue
	}
	return resolveOptionLabel(option) as TValue
}

function clampPositiveInteger(
	value: number | undefined,
	fallback: number
): number {
	if (value === undefined || !Number.isInteger(value) || value < 1) {
		return fallback
	}
	return value
}
