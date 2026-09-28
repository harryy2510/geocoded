/** Default picker page size for API and in-memory sources. */
export declare const DEFAULT_PAGE_LIMIT = 100
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
export declare function resolvePageRequest(request?: PageRequest): Required<
	Pick<PageRequest, 'limit' | 'offset' | 'cursor' | 'query'>
> & {
	signal?: AbortSignal
}
/** Next page request from list metadata, or `null` when the list is finished. */
export declare function nextPageRequest(meta: PageMeta): PageRequest | null
/** Empty page with the requested limit/offset. */
export declare function emptyPage<T>(request?: PageRequest): PageResult<T>
/** Slice an in-memory array into a paginated picker page. */
export declare function pageFromArray<T>(
	rows: T[],
	request?: PageRequest
): PageResult<T>
export declare function encodeCursor(offset: number): string
export declare function normalizeSearchText(value: string): string
export declare function matchesSearchText(text: string, query: string): boolean
/** Accent-insensitive option filter using label and keywords. */
export declare function filterOptions<TOption>(
	options: TOption[],
	query: string,
	formatters?: OptionFormatters<TOption>
): TOption[]
export declare function toPickerOption<TOption, TValue extends string = string>(
	option: TOption,
	formatters?: OptionFormatters<TOption, TValue>
): PickerOption<TValue, TOption>
export declare class LruCache<T> {
	private readonly maxSize
	private readonly values
	constructor(maxSize: number)
	get(key: string): T | undefined
	set(key: string, value: T): void
	has(key: string): boolean
	clear(): void
}
export declare class QueryCache {
	private readonly cache
	private readonly pending
	constructor(cache?: LruCache<unknown>)
	fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T>
	clear(): void
}
export declare function createDebouncedFunction<TArgs extends unknown[]>(
	callback: (...args: TArgs) => void,
	delayMs: number
): {
	call: (...args: TArgs) => void
	cancel: () => void
}
export declare function createAbortableRunner(): {
	run: <T>(runner: (signal: AbortSignal) => Promise<T>) => Promise<T>
	abort: () => void | undefined
}
export declare function resolveControlledValue<T>({
	value,
	defaultValue
}: ControlledState<T>): T
export declare function resolveOptionLabel<TOption>(
	option: TOption,
	getOptionLabel?: (option: TOption) => string
): string
export declare function resolveOptionValue<
	TOption,
	TValue extends string = string
>(option: TOption, getOptionValue?: (option: TOption) => TValue): TValue
